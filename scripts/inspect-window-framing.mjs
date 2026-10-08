import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-07/window-lower-body';
fs.mkdirSync(out, { recursive: true });
const report = { pages: [], errors: [] };
try {
    for (const [name, viewport, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
        const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
        page.on('pageerror', error => report.errors.push(error.message));
        await page.addInitScript(() => {
            window.__THREE_DEVTOOLS__ = new EventTarget();
            window.__THREE_DEVTOOLS__.addEventListener('observe', event => {
                if (!event.detail.isWebGLRenderer) return;
                const renderer = event.detail, render = renderer.render;
                renderer.render = function (scene, camera) {
                    window.__scene = scene; window.__camera = camera;
                    return render.call(this, scene, camera);
                };
            });
            window.__windowView = () => {
                const camera = window.__camera, scene = window.__scene;
                const V = camera.position.constructor;
                const project = p => { p.project(camera); return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2]; };
                const frame = scene.getObjectByName('entrance-window');
                const avatar = scene.getObjectByName('shian-window-avatar');
                const figure = scene.getObjectByName('shian-window-figure');
                return {
                    point: project(frame.getWorldPosition(new V())),
                    frame: [project(frame.localToWorld(new V(-.75, .75, 0))), project(frame.localToWorld(new V(.75, -.75, 0)))],
                    avatarX: avatar.position.x, texture: figure.material.map.image.currentSrc,
                };
            };
        });
        await page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
        await page.waitForTimeout(500);
        const initial = await page.evaluate(() => window.__windowView());
        assert.ok(Math.abs(initial.avatarX - 3.5) < .01);
        if (mobile) await page.touchscreen.tap(...initial.point); else await page.mouse.move(...initial.point);
        await page.waitForTimeout(900);
        const shown = await page.evaluate(() => window.__windowView());
        assert.ok(Math.abs(shown.avatarX - 2.5) < .01);
        assert.ok(shown.texture.endsWith('/textures/shian/corridor/05.webp'));
        await page.screenshot({ path: `${out}/${name}-entrance.png` });
        const [[x, y], [right, bottom]] = shown.frame;
        await page.screenshot({ path: `${out}/${name}-window.png`, clip: { x: x - 12, y: y - 12, width: right - x + 24, height: bottom - y + 24 } });
        if (mobile) await page.touchscreen.tap(...initial.point); else await page.mouse.move(15, 15);
        await page.waitForTimeout(600);
        const hidden = await page.evaluate(() => window.__windowView());
        assert.ok(Math.abs(hidden.avatarX - 3.5) < .01);
        await page.screenshot({ path: `${out}/${name}-hidden.png` });
        const enter = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
        await enter.focus(); await enter.press('Enter');
        await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 25000 });
        report.pages.push({ name, initial, shown, hidden, enteredCorridor: true });
        await page.close();
        console.log(`PASS: ${name} window open/close and corridor entry`);
    }
    assert.equal(report.errors.length, 0);
} finally {
    fs.writeFileSync(`${out}/inspection.json`, JSON.stringify(report, null, 2));
    await browser.close();
}
