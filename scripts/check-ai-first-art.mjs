import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import sharp from 'sharp';
const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/ai-first';
fs.mkdirSync(out, { recursive: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5175';
const report = { checks: [], errors: [], consoleErrors: [], httpErrors: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => report.errors.push(e.message));
page.on('console', e => { if (e.type() === 'error') report.consoleErrors.push(e.text()); });
page.on('response', response => {
    if (response.url().startsWith(base) && response.status() >= 400) report.httpErrors.push({ url: response.url(), status: response.status() });
});
await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe', event => {
        if (!event.detail.isWebGLRenderer) return;
        const renderer = event.detail, render = renderer.render;
        renderer.render = function (scene, camera) {
            if (scene?.isScene && camera?.isPerspectiveCamera) { window.__scene = scene; window.__camera = camera; }
            return render.call(this, scene, camera);
        };
    });
});
const state = () => page.evaluate(() => {
    const scene = window.__scene, camera = window.__camera, V = camera.position.constructor;
    let frame;
    scene.traverse(o => {
        if (o.name === 'shian-corridor-frame-frame-2' && (o.userData.inspected || Math.abs(o.position.z + 15) < .1)) frame = o;
    });
    const poster = frame.getObjectByName('shian-corridor-picture-frame-2');
    const projected = poster.getWorldPosition(new V()).project(camera);
    const corners = [[-1.25, .7], [1.25, .7], [-1.25, -.7], [1.25, -.7]].map(([x, y]) => {
        const p = frame.localToWorld(new V(x, y, 0)).project(camera);
        return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
    });
    const materials = [];
    frame.traverse(o => { if (o.material?.map?.image?.currentSrc?.includes('ramkanazdjecieduza')) materials.push({ visible: o.visible, progress: o.material.uProgress, source: o.material.map.image.currentSrc }); });
    return { z: camera.position.z, screen: [(projected.x + 1) * innerWidth / 2, (1 - projected.y) * innerHeight / 2], corners,
        inspected: frame.userData.inspected, source: poster.material.map.image.currentSrc, textureId: poster.material.map.uuid,
        color: poster.material.color.getHexString(), position: poster.getWorldPosition(new V()).toArray(), materials };
});
const yellowPixels = async info => {
    const left = Math.max(0, Math.floor(Math.min(...info.corners.map(p => p[0]))));
    const top = Math.max(0, Math.floor(Math.min(...info.corners.map(p => p[1]))));
    const right = Math.min(1440, Math.ceil(Math.max(...info.corners.map(p => p[0]))));
    const bottom = Math.min(1000, Math.ceil(Math.max(...info.corners.map(p => p[1]))));
    const { data, info: raw } = await sharp(await page.screenshot()).extract({ left, top, width: right - left, height: bottom - top }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let count = 0;
    for (let i = 0; i < data.length; i += raw.channels) if (data[i] > data[i + 1] + 8 && data[i + 1] > data[i + 2] + 8) count++;
    return count;
};
try {
    assert.equal((await sharp('public/textures/shian/corridor/art/ai-first.png').metadata()).hasAlpha, true);
    await page.goto(base + '/');
    await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
    await page.getByRole('button', { name: '进入时安的数字空间', exact: true }).press('Enter');
    await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2200);
    await page.locator('canvas').click({ position: { x: 720, y: 500 } });
    await page.mouse.wheel(0, 800); await page.waitForTimeout(2300);
    await page.mouse.move(720, 500); await page.waitForTimeout(800);
    const idle = await state();
    report.idle = idle;
    assert.ok(idle.source.endsWith('/ai-first.png'));
    assert.ok(idle.screen[0] > 0 && idle.screen[0] < 1440);
    assert.ok(idle.position[2] < idle.z, 'target frame is ahead of the camera');
    assert.equal(idle.materials.find(m => m.progress !== undefined).progress, 0);
    const idleYellow = await yellowPixels(idle);
    await page.screenshot({ path: out + '/default.png' });
    await page.mouse.move(...idle.screen); await page.waitForTimeout(1100);
    const hover = await state();
    report.hover = hover;
    assert.ok(hover.materials.find(m => m.progress !== undefined).progress > .99);
    assert.ok(hover.materials.some(m => m.source.includes('_painted') && m.visible));
    assert.equal(hover.textureId, idle.textureId);
    assert.equal(hover.source, idle.source);
    assert.equal(hover.color, idle.color);
    assert.deepEqual(hover.position, idle.position);
    const hoverYellow = await yellowPixels(hover);
    report.pigment = { idleYellow, hoverYellow };
    assert.ok(hoverYellow > idleYellow + 500, 'wood frame restores yellow pigment');
    await page.screenshot({ path: out + '/hover-yellow-frame.png' });
    await page.mouse.click(...hover.screen); await page.waitForTimeout(1300);
    assert.equal((await state()).inspected, true);
    await page.screenshot({ path: out + '/inspected.png' });
    const inspected = await state();
    await page.mouse.click(...inspected.screen); await page.mouse.move(720, 500); await page.waitForTimeout(1500);
    const left = await state();
    assert.equal(left.inspected, false);
    assert.ok(left.materials.find(m => m.progress !== undefined).progress < .01);
    report.checks.push('generated AI First PNG is transparent and replaces the old English artwork');
    report.checks.push('hover restores yellow frame; picture texture, color and wall position remain identical');
    report.checks.push('pointer leave restores gray frame; existing inspect and return still work');
    report.pigment = { idleYellow, hoverYellow };
    assert.deepEqual(report.errors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.httpErrors, []);
    console.log(JSON.stringify(report));
} catch (error) {
    report.failure = error.stack;
    await page.screenshot({ path: out + '/failure.png' });
    throw error;
} finally {
    fs.writeFileSync(out + '/inspection.json', JSON.stringify(report, null, 2));
    await browser.close();
}
