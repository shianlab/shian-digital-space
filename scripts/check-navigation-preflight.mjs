import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-10/preflight';
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], pageErrors: [], consoleErrors: [], screenshots: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', e => report.pageErrors.push(e.message));
page.on('console', e => { if (e.type() === 'error') report.consoleErrors.push(e.text()); });
await page.addInitScript(() => {
    window.__THREE_DEVTOOLS__ = new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe', event => {
        if (!event.detail.isWebGLRenderer) return;
        const renderer = event.detail, render = renderer.render;
        renderer.render = function (scene, camera) {
            window.__auditCamera = camera;
            return render.call(this, scene, camera);
        };
    });
});
const state = () => page.evaluate(() => ({
    url: location.href,
    title: document.title,
    history: history.state,
    historyLength: history.length,
    camera: window.__auditCamera?.position.toArray(),
    backButton: !!document.querySelector('.nav-btn.back-btn'),
    mapOpen: !!document.querySelector('.map-panel.open'),
    audioOpen: !!document.querySelector('.audio-panel.open'),
    achievementsOpen: !!document.querySelector('.achievements-panel.open'),
    roomDescription: document.querySelector('.sr-overlay nav')?.textContent,
}));
const snap = async name => {
    await page.screenshot({ path: `${out}/${name}.png` });
    report.screenshots.push(name);
};
const toStudio = async () => {
    await page.getByRole('button', { name: '打开地图', exact: true }).click();
    await page.getByRole('button', { name: '前往工作室', exact: true }).click();
    await page.waitForURL('**/studio', { timeout: 40000 });
    await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible' });
    await page.waitForTimeout(4000);
};
try {
    await page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 90000 });
    const entrance = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
    await entrance.focus(); await entrance.press('Enter');
    await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 30000 });
    await page.waitForTimeout(2500);
    const corridor = await state();
    await toStudio();
    const beforeBack = await state();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    const afterBack = await state();
    await snap('fixed-browser-back-to-root');
    report.checks.push({
        name: 'Browser Back from studio to corridor', corridor, before: beforeBack, after: afterBack,
        pass: !afterBack.backButton && new URL(afterBack.url).pathname === '/' && afterBack.historyLength === beforeBack.historyLength && afterBack.roomDescription.includes('你在走廊中'),
        expected: 'URL /, corridor camera, no room back button',
    });
    await page.goForward({ waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/studio', { timeout: 40000 });
    await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible' });
    await page.waitForTimeout(5000);
    const afterForward = await state();
    await snap('fixed-browser-forward-to-studio');
    report.checks.push({
        name: 'Browser Forward restores studio without adding history entries', after: afterForward,
        pass: afterForward.backButton && new URL(afterForward.url).pathname === '/studio' && afterForward.historyLength === beforeBack.historyLength && afterForward.roomDescription.includes('你在工作室'),
        expected: 'URL /studio, studio content and camera, unchanged history length',
    });

    for (const [label, button, flag] of [['map', '打开地图', 'mapOpen'], ['audio', '声音设置', 'audioOpen'], ['achievements', '探索成就', 'achievementsOpen']]) {
        const before = await state();
        await page.getByRole('button', { name: button, exact: true }).click();
        await page.waitForTimeout(800);
        if (label === 'map') {
            await page.evaluate(() => document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', isComposing: true, bubbles: true })));
            await page.waitForTimeout(500);
            const composing = await state();
            report.checks.push({
                name: 'Composing Escape leaves the map and room open', after: composing,
                pass: composing.mapOpen && composing.backButton && new URL(composing.url).pathname === '/studio',
                note: 'Synthetic composing key event supplements real keyboard checks; does not call application handlers.',
            });
        }
        await page.keyboard.press('Escape');
        await page.waitForTimeout(5000);
        const after = await state();
        await snap(`fixed-${label}-after-escape`);
        report.checks.push({
            name: `Escape closes ${label} without exiting studio`, before, after,
            pass: after.backButton && !after[flag] && new URL(after.url).pathname === '/studio' && after.camera.every((v, i) => Math.abs(v - before.camera[i]) < .02),
            expected: 'Panel closed, /studio and studio camera retained',
        });
    }
    await page.keyboard.press('Escape');
    await page.locator('.nav-btn.back-btn').waitFor({ state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(1000);
    const afterRoomEscape = await state();
    await snap('fixed-no-panel-escape');
    report.checks.push({
        name: 'Escape without an open panel exits to corridor', after: afterRoomEscape,
        pass: !afterRoomEscape.backButton && new URL(afterRoomEscape.url).pathname === '/' && afterRoomEscape.roomDescription.includes('你在走廊中'),
        expected: 'Room closes, corridor and / restored',
    });
} catch (error) {
    report.error = error.stack;
} finally {
    fs.writeFileSync(`${out}/navigation-recheck.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checks: report.checks.map(c => ({ name: c.name, pass: c.pass })), error: report.error, pageErrors: report.pageErrors }, null, 2));
    await browser.close();
    process.exitCode = report.error || report.pageErrors.length || report.checks.some(check => !check.pass) ? 1 : 0;
}
