import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { STUDIO_DOOR } from '../src/config/studio-door.js';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5175';
const out = 'docs/planning/materials/studio-door-2026-10-07';
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [], httpErrors: [] };
let active;
const observe = page => page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe', e => {
        if (!e.detail.isWebGLRenderer) return;
        const renderer = e.detail, render = renderer.render;
        renderer.render = function (scene, camera) {
            if (scene?.isScene && camera?.isPerspectiveCamera) { window.__scene = scene; window.__camera = camera; }
            return render.call(this, scene, camera);
        };
    });
});
const state = page => page.evaluate(paths => {
    const camera = window.__camera, V = camera.position.constructor;
    const objects = [];
    window.__scene.traverse(o => {
        const url = o.material?.map?.image?.currentSrc;
        if (!url?.endsWith(paths.sketch) && !url?.endsWith(paths.painted)) return;
        const p = o.getWorldPosition(new V());
        if (Math.abs(p.z + 22) > 3) return;
        const q = p.clone().project(camera);
        const { width, height } = o.geometry.parameters;
        objects.push({ url, position: p.toArray(), scale: o.scale.toArray(), progress: o.material.uProgress, visible: o.visible,
            screen: [(q.x + 1) * innerWidth / 2, (1 - q.y) * innerHeight / 2],
            corners: [[-width / 2, height / 2], [width / 2, height / 2], [-width / 2, -height / 2], [width / 2, -height / 2]].map(([x, y]) => {
                const c = o.localToWorld(new V(x, y, 0)).project(camera);
                return [(c.x + 1) * innerWidth / 2, (1 - c.y) * innerHeight / 2];
            }) });
    });
    return { objects, requests: performance.getEntriesByType('resource').map(r => r.name) };
}, STUDIO_DOOR);

try {
    const sketch = await sharp('public' + STUDIO_DOOR.sketch).metadata();
    const painted = await sharp('public' + STUDIO_DOOR.painted).metadata();
    assert.equal(sketch.width / sketch.height, .5);
    assert.deepEqual([sketch.width, sketch.height], [painted.width, painted.height]);
    report.checks.push('both optimized door textures have matching 1:2 aspect and dimensions');
    for (const [label, viewport, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
        const page = active = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
        page.on('pageerror', e => report.errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
        page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) report.httpErrors.push({ url: r.url(), status: r.status() }); });
        await observe(page); await page.goto(base + '/');
        await page.locator('.preloader').waitFor({ state: 'attached', timeout: 60000 });
        await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
        await page.getByRole('button', { name: '进入时安的数字空间', exact: true }).press('Enter');
        await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 30000 });
        await page.waitForTimeout(2200);
        await page.locator('canvas').click({ position: { x: viewport.width / 2, y: viewport.height / 2 } });
        await page.mouse.wheel(0, 1160); await page.mouse.move(viewport.width / 2, viewport.height / 2); await page.waitForTimeout(2400);
        const idle = await state(page);
        report[label] = { idle };
        assert.ok(idle.objects.some(o => o.url.endsWith(STUDIO_DOOR.sketch)), 'new working-room door mounted');
        assert.ok(!idle.requests.some(url => url.includes('/drzwisocial')), 'old Instagram/YouTube door is no longer loaded');
        const door = idle.objects.find(o => o.url.endsWith(STUDIO_DOOR.sketch));
        assert.equal(door.scale[0], 1, 'logos keep their original orientation');
        await page.screenshot({ path: `${out}/${label}-default.png` });
        if (!mobile) {
            assert.ok(door.screen[0] > 0 && door.screen[0] < viewport.width, 'door reachable by normal scrolling');
            await page.mouse.move(...door.screen); await page.waitForTimeout(1200);
            const hover = await state(page); report.desktop.hover = hover;
            assert.ok(hover.objects.find(o => o.url.endsWith(STUDIO_DOOR.sketch)).progress > .99);
            assert.ok(hover.objects.some(o => o.url.endsWith(STUDIO_DOOR.painted) && o.visible));
            await page.screenshot({ path: `${out}/desktop-hover.png` });
            const point = hover.objects.find(o => o.url.endsWith(STUDIO_DOOR.sketch)).screen;
            await page.mouse.click(...point);
            report.checks.push('desktop: hover reveals matching painted door; actual door click remains available');
        } else {
            await page.getByRole('button', { name: '打开地图', exact: true }).click();
            await page.getByRole('button', { name: '前往工作室', exact: true }).click();
        }
        await page.waitForURL('**/studio', { timeout: 30000 });
        await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible', timeout: 30000 });
        await page.waitForTimeout(2200);
        assert.ok((await page.getByLabel('工作室内容', { exact: true }).innerText()).includes('OpenClaw'));
        await page.locator('.nav-btn.back-btn').click(); await page.waitForURL(base + '/');
        await page.locator('.nav-btn.back-btn').waitFor({ state: 'hidden' });
        report.checks.push(`${label}: new door textures load without old logo textures; studio enters and returns`);
        await page.close();
    }
    assert.deepEqual(report.errors, []); assert.deepEqual(report.httpErrors, []);
    console.log(JSON.stringify({ checks: report.checks, errors: report.errors, httpErrors: report.httpErrors }));
} catch (e) {
    report.failure = e.stack;
    if (active && !active.isClosed()) await active.screenshot({ path: out + '/failure.png' });
    throw e;
} finally {
    fs.writeFileSync(out + '/inspection.json', JSON.stringify(report, null, 2)); await browser.close();
}
