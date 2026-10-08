import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-07';
const report = { checks: [], pageErrors: [], consoleErrors: [], failedRequests: [], screenshots: [] };
const screenshot = async (page, name) => {
    await page.screenshot({ path: `${out}/${name}.png` });
    report.screenshots.push(name);
};
const inspect = page => page.evaluate(() => window.__inspect());
const object = (state, name, z) => state.objects.find(o => o.name === name && (z === undefined || Math.abs(o.position[2] - z) < .1));
const near = (a, b, tolerance = .04) => assert.ok(Math.abs(a - b) < tolerance, `${a} must be close to ${b}`);

async function openPage(viewport, mobile = false, reducedMotion = 'no-preference') {
    const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile, reducedMotion });
    page.on('pageerror', e => report.pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText, closing: page.isClosed() }));
    // Observe the real Three.js render without adding a debug API to the application.
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
        window.__inspect = () => {
            const scene = window.__scene, camera = window.__camera;
            if (!scene || !camera) return null;
            const V = camera.position.constructor;
            const project = p => { const q = p.clone().project(camera); return [(q.x + 1) * innerWidth / 2, (1 - q.y) * innerHeight / 2]; };
            const objects = [];
            scene.traverse(o => {
                if (!o.name.startsWith('shian-') && o.name !== 'entrance-window') return;
                const world = o.getWorldPosition(new V());
                const b = o.textRenderInfo?.blockBounds;
                const bounds = b ? [project(o.localToWorld(new V(b[0], b[3], 0))), project(o.localToWorld(new V(b[2], b[1], 0)))] : null;
                objects.push({ name: o.name, text: o.text, position: world.toArray(), screen: project(world), bounds,
                    frame: o.userData.frame, texture: o.material?.map?.image?.currentSrc });
            });
            return { camera: camera.position.toArray(), objects };
        };
    });
    await page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(600);
    return page;
}

async function enter(page, keyboard = true) {
    if (keyboard) {
        const button = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
        await button.focus(); await button.press('Enter');
    } else {
        // Project a point on the original left door and click the visible canvas.
        const p = await page.evaluate(() => {
            const c = window.__camera, V = c.position.constructor;
            const p = new V(-.45, -.3, 22.15).project(c);
            return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
        });
        await page.mouse.click(...p);
    }
    await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 25000 });
    const size = page.viewportSize();
    await page.mouse.move(size.width / 2, size.height / 2);
    await page.waitForTimeout(1800);
}

async function checkWelcome(page, label) {
    const state = await inspect(page);
    near(state.camera[2], 11.65);
    const labels = state.objects.filter(o => o.name.startsWith('shian-label-') && Math.abs(o.position[2] - 7.7) < .1);
    assert.deepEqual(labels.map(o => o.text), ['大模型工程师', '软件开发工程师', '内容创作者']);
    assert.equal(state.objects.filter(o => o.name.startsWith('shian-letter-') && Math.abs(o.position[2] - 7.5) < .1).map(o => o.text).join(''), 'SHIAN');
    const width = page.viewportSize().width;
    for (const label of labels) assert.ok(label.bounds && label.bounds[0][0] >= 0 && label.bounds[1][0] <= width);
    const foot = object(state, 'shian-foot-anchor', 7.7);
    near(foot.position[1], -1.74);
    assert.ok(foot.screen[1] < page.viewportSize().height - 10);
    await page.waitForFunction(() => {
        const hint = document.querySelector('.achievement-popup--corridor');
        return hint && Number(getComputedStyle(hint).opacity) > .95;
    });
    const hint = await page.locator('.achievement-popup--corridor').boundingBox();
    assert.ok(hint && hint.y + hint.height < labels[0].bounds[0][1], 'Hint must stay above the welcome content');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
    assert.equal(requests.filter(r => r.includes('/avatar_anim/')).length, 0);
    for (let i = 1; i <= 9; i++) assert.ok(requests.some(r => r.includes(`/textures/shian/corridor/${String(i).padStart(2, '0')}.webp`)));
    report[label] = { ...state, hint };
    await screenshot(page, `${label}-corridor-final`);
    report.checks.push(`${label}: exact identity, text within viewport, grounded feet, unobstructed hint, new textures only`);
}

try {
    const page = await openPage({ width: 1440, height: 1000 });
    let state = await inspect(page);
    assert.equal(object(state, 'shian-sign-first').text, 'ShiAn’s');
    assert.equal(object(state, 'shian-sign-second').text, 'Digital Space');
    await screenshot(page, 'desktop-entrance-final');
    const windowPoint = object(state, 'entrance-window').screen;
    await page.mouse.move(...windowPoint); await page.waitForTimeout(700);
    near(object(await inspect(page), 'shian-window-avatar').position[0], 2.5);
    await screenshot(page, 'desktop-window-final');
    await page.mouse.move(20, 20); await page.waitForTimeout(700);
    near(object(await inspect(page), 'shian-window-avatar').position[0], 3.5);
    await enter(page, false);
    await checkWelcome(page, 'desktop');
    report.checks.push('Desktop window hover/leave and original door pointer entry');
    const frames = new Set();
    for (let i = 0; i < 60 && frames.size < 9; i++) { frames.add(object(await inspect(page), 'shian-avatar', 7.7).frame); await page.waitForTimeout(145); }
    assert.equal(frames.size, 9);
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.__inspect().objects.some(o => o.name === 'shian-foot-anchor' && Math.abs(o.position[2] - 7.7) < .1 && o.position[0] < -.6));
    await screenshot(page, 'desktop-approach-final');
    await page.keyboard.press('ArrowUp');
    await page.waitForFunction(() => window.__inspect().objects.some(o => o.name === 'shian-foot-anchor' && Math.abs(o.position[2] - 7.7) < .1 && Math.abs(o.position[0]) < .03));
    report.checks.push('Nine production frames, keyboard approach, dodge and return');
    // Move 80 world units with the app's configured scroll speed (.025).
    await page.mouse.wheel(0, 3200);
    await page.waitForFunction(() => Math.abs(window.__inspect().camera[2] + 68.35) < .05, { timeout: 30000 });
    state = await inspect(page);
    assert.ok(object(state, 'shian-avatar', -72.3));
    assert.equal(object(state, 'shian-label-1', -72.3).text, '软件开发工程师');
    await screenshot(page, 'next-segment-final');
    report.checks.push('Next infinite corridor segment uses ShiAn and Chinese labels');
    for (const [room, title] of [['gallery', '作品展厅'], ['studio', '工作室'], ['about', '关于我'], ['contact', '联系我']]) {
        await page.getByRole('button', { name: '打开地图', exact: true }).click();
        await page.getByRole('button', { name: `前往${title}`, exact: true }).click();
        await page.waitForURL(`**/${room}`, { timeout: 30000 });
        await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible' });
        await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 30000 });
        await page.waitForTimeout(700);
        await screenshot(page, `room-${room}`);
        await page.locator('.nav-btn.back-btn').click();
        await page.waitForURL('http://127.0.0.1:5175/', { timeout: 20000 });
        await page.locator('.nav-btn.back-btn').waitFor({ state: 'hidden' });
        await page.waitForTimeout(500);
        report.checks.push(`${title}: map teleport, paper transition, room and return to corridor`);
        console.log(`Passed: ${title} navigation`);
    }
    await page.close();

    for (const [label, width, height, reduced] of [['mobile', 390, 844, false], ['narrow-reduced', 320, 740, true]]) {
        const mobile = await openPage({ width, height }, true, reduced ? 'reduce' : 'no-preference');
        const win = object(await inspect(mobile), 'entrance-window');
        assert.ok(win.screen[0] > 0 && win.screen[0] < width);
        await screenshot(mobile, `${label}-entrance-final`);
        await mobile.touchscreen.tap(...win.screen); await mobile.waitForTimeout(700);
        near(object(await inspect(mobile), 'shian-window-avatar').position[0], 2.5);
        await screenshot(mobile, `${label}-window-final`);
        await mobile.touchscreen.tap(...win.screen); await mobile.waitForTimeout(700);
        near(object(await inspect(mobile), 'shian-window-avatar').position[0], 3.5);
        await enter(mobile);
        await checkWelcome(mobile, label);
        if (reduced) {
            for (let i = 0; i < 8; i++) { assert.equal(object(await inspect(mobile), 'shian-avatar', 7.7).frame, 5); await mobile.waitForTimeout(180); }
            report.checks.push('Reduced motion: production character stays on frame 5');
        }
        await mobile.getByRole('button', { name: '打开地图', exact: true }).click();
        for (const title of ['作品展厅', '工作室', '关于我', '联系我']) assert.ok(await mobile.getByRole('button', { name: `前往${title}`, exact: true }).isVisible());
        await screenshot(mobile, `${label}-map-final`);
        report.checks.push(`${label}: window touch open/close, keyboard entry and four map destinations`);
        await mobile.close();
        console.log(`Passed: ${label}`);
    }
    assert.equal(report.pageErrors.length, 0);
    const localFailures = report.failedRequests.filter(r => r.url.startsWith('http://127.0.0.1:5175/') && !r.url.endsWith('/') && !(r.error === 'net::ERR_ABORTED' && r.url.endsWith('.ogg')));
    // Media elements cancel range requests when paused, replaced or the page closes.
    // Verify any such audio cancellation against the actual static endpoint.
    const audioCheckContext = await browser.newContext();
    report.cancelledAudioResponses = [];
    for (const url of new Set(report.failedRequests.filter(r => r.error === 'net::ERR_ABORTED' && r.url.endsWith('.ogg')).map(r => r.url))) {
        const response = await audioCheckContext.request.head(url);
        assert.equal(response.status(), 200);
        report.cancelledAudioResponses.push({url, status:response.status()});
    }
    await audioCheckContext.close();
    assert.deepEqual(localFailures, []);
    report.result = 'PASS';
} catch (error) {
    report.result = 'FAIL'; report.failure = error.stack;
    console.error(error); process.exitCode = 1;
} finally {
    fs.writeFileSync(`${out}/browser-inspection.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ result: report.result, checks: report.checks, pageErrors: report.pageErrors, consoleErrorCount: report.consoleErrors.length }));
    await browser.close();
}
