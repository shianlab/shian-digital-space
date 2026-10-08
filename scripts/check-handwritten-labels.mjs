import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sharp from 'sharp';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5175';
const out = 'docs/planning/materials/handwriting-reference/implemented';
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [] };
try {
    for (const file of ['llm-engineer', 'software-engineer', 'content-creator', 'gallery', 'studio', 'about', 'contact']) {
        const image = sharp(`public/textures/shian/handwriting/${file}.png`);
        const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
        assert.equal(info.channels, 4);
        assert.equal(data[3], 0, 'paper corner is fully transparent');
        assert.ok(data.some((v, i) => i % 4 === 3 && v > 200), 'ink is present');
    }
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync('public/textures/shian/corridor/art/lifelong-learning-repaired.png')).digest('hex'),
        'b0aacc26bc3df783af4555da44a9692df9edd335ed15dd3a05f581ed18001f97');
    report.checks.push('seven approved B cutouts have real transparency; original calligraphy pixels unchanged');
    for (const [name, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844], ['narrow', 320, 740]]) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 768, isMobile: width < 768 });
        page.on('pageerror', e => report.errors.push(e.message));
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
        });
        await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
        await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
        await page.getByRole('button', { name: '进入时安的数字空间', exact: true }).press('Enter');
        await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 30000 });
        await page.waitForTimeout(2200);
        const labels = await page.evaluate(() => {
            const camera = window.__camera, V = camera.position.constructor;
            const result = [];
            window.__scene.traverse(o => {
                if (!o.name.startsWith('shian-label-')) return;
                const world = o.getWorldPosition(new V());
                if (Math.abs(world.z - 7.7) > .1) return;
                const [w, h] = o.userData.handwritingBounds;
                const corners = [[-w / 2, h / 2], [w / 2, -h / 2]].map(([x, y]) => {
                    const p = o.localToWorld(new V(x, y, 0)).project(camera);
                    return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
                });
                result.push({ name: o.name, text: o.userData.handwritingText, source: o.material.map.image.currentSrc, corners });
            });
            return result;
        });
        assert.deepEqual(labels.map(label => label.text), ['大模型工程师', '软件开发工程师', '内容创作者']);
        for (const label of labels) {
            assert.ok(label.source.includes('/textures/shian/handwriting/'));
            assert.ok(label.corners[0][0] >= 0 && label.corners[1][0] <= width, 'approved bitmap fits the viewport');
            assert.ok(label.corners[1][1] - label.corners[0][1] >= 8, 'visible ink remains large enough');
        }
        await page.screenshot({ path: `${out}/${name}-corridor.png` });
        if (name === 'desktop') {
            for (const [id, title] of [['gallery', '作品展厅'], ['studio', '工作室'], ['about', '关于我'], ['contact', '联系我']]) {
                await page.getByRole('button', { name: '打开地图', exact: true }).click();
                await page.getByRole('button', { name: `前往${title}`, exact: true }).click();
                await page.waitForURL('**/' + id);
                await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible', timeout: 30000 });
                await page.waitForTimeout(1800);
                await page.locator('.nav-btn.back-btn').click();
                await page.waitForURL(base + '/');
                await page.locator('.nav-btn.back-btn').waitFor({ state: 'hidden' });
            }
            report.checks.push('all four rooms still open and return through the map');
        }
        const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name));
        assert.ok(!requests.some(url => url.includes('ShianScribble')));
        assert.ok(requests.some(url => url.includes('/handwriting/llm-engineer.png')));
        report.checks.push(`${name}: original B images render; all three labels fit; substitute font absent`);
        await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 1200, height: 780 } });
    await page.goto(base + '/start/');
    await page.setContent(`<style>body{margin:0;padding:50px 70px;background:#fafafa;color:#333;font-family:serif}h1{font-size:19px;font-weight:400;margin:0 0 32px}section{display:flex;flex-wrap:wrap;gap:45px 60px;align-items:center}img{filter:brightness(0);object-fit:contain}hr{border:0;border-top:1px dashed #ccc;margin:38px 0}</style><h1>从 B 原图直接提取 · 实际使用的字样</h1><img src="${base}/textures/shian/handwriting/digital-space.png" style="height:100px"><hr><section>${['gallery', 'studio', 'about', 'contact'].map(n => `<img src="${base}/textures/shian/handwriting/${n}.png" style="height:64px">`).join('')}</section><hr><section style="display:grid;gap:24px">${['llm-engineer', 'software-engineer', 'content-creator'].map(n => `<img src="${base}/textures/shian/handwriting/${n}.png" style="height:47px;justify-self:start">`).join('')}</section>`);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
    await page.screenshot({ path: `${out}/exact-b-cutouts.png` });
    await page.close();
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify(report));
} finally {
    fs.writeFileSync(`${out}/inspection.json`, JSON.stringify(report, null, 2));
    await browser.close();
}
