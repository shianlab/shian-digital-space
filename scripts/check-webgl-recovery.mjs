import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { SITE_FILING } from '../src/config/site-filing.js';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const out = process.env.SHIAN_INSPECTION_DIR || 'docs/planning/materials/pre-cloudbase-2026-10-07';
fs.mkdirSync(out, { recursive: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5176';
const report = { checks: [], expectedWebglErrors: [] };
page.on('console', message => { if (message.type() === 'error') report.expectedWebglErrors.push(message.text()); });
await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (/^webgl/.test(type)) return null;
        return getContext.call(this, type, ...args);
    };
});
try {
    await page.goto(base);
    await page.getByRole('heading', { name: '三维场景暂时无法加载', exact: true }).waitFor({ timeout: 30000 });
    assert.equal(await page.locator('.site-footer a').innerText(), SITE_FILING.number);
    assert.equal(await page.locator('.site-footer a').getAttribute('href'), SITE_FILING.url);
    report.checks.push('missing WebGL shows Chinese recovery controls and retains the exact clickable filing footer');
    await page.screenshot({ path: out + '/no-webgl.png' });
    await page.getByRole('link', { name: '打开简洁入口', exact: true }).click();
    await page.waitForURL('**/start');
    assert.ok(await page.getByRole('heading', { name: 'SHIAN', exact: true }).isVisible());
    assert.ok(await page.getByRole('link', { name: '邮箱', exact: true }).isVisible());
    report.checks.push('without WebGL the simple entry and contact links remain usable');
    console.log('Passed WebGL recovery checks');
} catch (error) {
    report.failure = error.stack;
    await page.screenshot({ path: out + '/webgl-failure.png' });
    throw error;
} finally {
    fs.writeFileSync(out + '/webgl-recovery.json', JSON.stringify(report, null, 2));
    await browser.close();
}
