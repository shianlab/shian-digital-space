import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-10/preflight';
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
    await page.route('https://fonts.googleapis.com/**', () => {});
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

try { const started=Date.now();const page=await openPage({width:390,height:844},true);await enter(page);report.checks.push('Google Fonts response stalled: entrance and corridor remain usable');report.elapsedMs=Date.now()-started;await screenshot(page,'font-cdn-stalled');assert.equal(report.pageErrors.length,0);console.log('Font loading fallback passed'); }catch(e){report.failure=e.stack;console.error(e);process.exitCode=1;}finally{fs.writeFileSync(out+'/font-loading-check.json',JSON.stringify(report,null,2));await browser.close();}