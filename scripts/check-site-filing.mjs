import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SITE_FILING } from '../src/config/site-filing.js';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5176';
const out = process.env.SHIAN_FILING_INSPECTION_DIR || 'docs/planning/materials/site-filing-2026-10-07';
fs.mkdirSync(out, { recursive: true });
const report = { checks: [], errors: [], httpErrors: [], screenshots: [] };
let active;
async function screenshot(page, name) {
    await page.screenshot({ path: `${out}/${name}.png` });
    report.screenshots.push(name);
}
async function checkFooter(page, label, fixed = true) {
    const footer = page.locator('.site-footer');
    assert.equal(await footer.count(), 1, 'one footer, including after page generation');
    const link = footer.locator('a');
    assert.equal(await link.innerText(), SITE_FILING.number);
    assert.equal(await link.getAttribute('href'), SITE_FILING.url);
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
    if (!fixed) await footer.scrollIntoViewIfNeeded();
    const box = await link.boundingBox(), viewport = page.viewportSize();
    assert.ok(box.x >= 0 && box.x + box.width <= viewport.width);
    assert.ok(box.height >= 44, 'usable touch target');
    assert.ok(Math.abs(box.x + box.width / 2 - viewport.width / 2) < 2, 'footer centered');
    assert.ok(box.y + box.height <= viewport.height + 1, 'footer visible in viewport');
    if (fixed) {
        assert.ok(box.y + box.height >= viewport.height - 12, 'at viewport bottom');
        const hit = await link.evaluate(el => {
            const b = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2));
        });
        assert.ok(hit, 'number can be clicked, not covered by scene UI');
    }
    const hints = page.locator('.entrance-hint:visible, .corridor-hint:visible, .achievement-popup:visible');
    for (const hint of await hints.all()) {
        const h = await hint.boundingBox();
        assert.ok(h.y + h.height <= box.y, 'hint and filing do not overlap');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.checks.push(`${label}: exact number, official href, centered, readable and clickable`);
}
function observe(page) {
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
    page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) report.httpErrors.push({ url: r.url(), status: r.status() }); });
}
try {
    for (const [label, viewport, mobile] of [['desktop', { width: 1440, height: 1000 }, false], ['mobile', { width: 320, height: 844 }, true], ['landscape', { width: 844, height: 390 }, true]]) {
        const page = active = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile });
        observe(page);
        await page.goto(base + '/');
        await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
        await page.waitForTimeout(700);
        await checkFooter(page, label + ' entrance');
        await screenshot(page, label + '-entrance');
        const entrance = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
        await entrance.focus();
        await entrance.press('Enter');
        await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 25000 });
        await page.waitForTimeout(1800);
        await checkFooter(page, label + ' corridor');
        for (const [route, title] of [['studio', '工作室'], ['gallery', '作品展厅'], ['about', '关于我'], ['contact', '联系我']]) {
            await page.getByRole('button', { name: '打开地图', exact: true }).click();
            await page.getByRole('button', { name: '前往' + title, exact: true }).click();
            await page.waitForURL('**/' + route);
            await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible' });
            await page.waitForTimeout(1600);
            await checkFooter(page, label + ' ' + route);
            if (route === 'studio') await screenshot(page, label + '-studio');
            await page.locator('.nav-btn.back-btn').click();
            await page.waitForURL(base + '/');
            await page.locator('.nav-btn.back-btn').waitFor({ state: 'hidden' });
        }
        if (label === 'desktop') {
            // Verify the new-window action without relying on a government site's network availability.
            await page.context().route(SITE_FILING.url, route => route.fulfill({ contentType: 'text/html', body: '<title>Link destination check</title>' }));
            const popupEvent = page.waitForEvent('popup');
            await page.locator('.site-footer a').click();
            const popup = await popupEvent;
            await popup.waitForURL(SITE_FILING.url);
            assert.equal(await popup.evaluate(() => window.opener === null), true);
            await popup.close();
            report.checks.push('filing link opens the configured official URL in a separate tab without an opener (request intercepted)');
        }
        await page.goto(base + '/start/');
        await checkFooter(page, label + ' simple entry', false);
        await screenshot(page, label + '-start');
        await page.close();
        console.log(label + ' passed');
    }
    const noJs = await browser.newPage({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    active = noJs;
    for (const route of ['/', '/studio/', '/start/']) {
        await noJs.goto(base + route);
        await checkFooter(noJs, 'no JavaScript ' + route, route !== '/start/');
    }
    await noJs.close();
    assert.equal(report.errors.length, 0);
    assert.equal(report.httpErrors.length, 0);
    console.log(`Passed ${report.checks.length} filing checks`);
} catch (error) {
    report.failure = error.stack;
    console.error(error);
    if (active && !active.isClosed()) await screenshot(active, 'failure');
    process.exitCode = 1;
} finally {
    fs.writeFileSync(out + '/browser-inspection.json', JSON.stringify(report, null, 2));
    await browser.close();
}
