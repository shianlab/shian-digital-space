import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PAGE_META, SITE_PROFILE } from '../src/config/site-profile.js';
import { ABOUT_PROFILE } from '../src/config/about-profile.js';
import { CONTACT_CHANNELS } from '../src/config/contact-channels.js';
import { STUDIO_CONTENT } from '../src/config/studio-content.js';
const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-13';
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5175';
const report = { base, checks: [], pageErrors: [], consoleErrors: [], localErrors: [], forbiddenRequests: [] };
fs.mkdirSync(out, { recursive: true });
let active;
const newPage = async options => {
    const page = await browser.newPage(options);
    page.on('pageerror', e => report.pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) report.localErrors.push({ url: r.url(), status: r.status() }); });
    page.on('request', r => { if (!r.url().startsWith(base) && /sanity\.io|posthog|itomdev|kv5wjjmj/.test(r.url())) report.forbiddenRequests.push(r.url()); });
    return page;
};
async function enter(page, pathname = '/') {
    await page.goto(base + pathname, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
    assert.equal(new URL(page.url()).pathname, pathname);
    const button = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
    await button.focus(); await button.press('Enter');
    await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 30000 });
    if (pathname !== '/') await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible', timeout: 30000 });
    await page.waitForTimeout(2200);
}
async function metaCheck(page, key) {
    const meta = PAGE_META[key];
    // History changes before the existing door/camera exit animation finishes.
    await page.waitForFunction(title => document.title === title, meta.title, { timeout: 20000 });
    assert.equal(await page.title(), meta.title);
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) assert.equal(await page.locator(selector).getAttribute('content'), meta.description);
    assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), meta.title);
    assert.equal(await page.locator('meta[name="twitter:title"]').getAttribute('content'), meta.title);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), SITE_PROFILE.url + meta.path);
    assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), SITE_PROFILE.url + meta.path);
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
    assert.equal(schema['@graph'].find(item => item['@type'] === 'WebPage').url, SITE_PROFILE.url + meta.path);
    report.checks.push(meta.path + ': title, description, OG, Twitter, canonical and schema agree');
    console.log('PASS metadata ' + meta.path);
}
try {
    if (process.env.SHIAN_SITE_TEST_SCOPE !== 'static') {
    const page = active = await newPage({ viewport: { width: 1440, height: 1000 } });
    await enter(page); await metaCheck(page, 'null');
    assert.equal(await page.locator('#seo-content').getAttribute('aria-hidden'), 'true');
    for (const room of ['gallery', 'studio', 'about', 'contact']) {
        await page.getByRole('button', { name: '打开地图', exact: true }).click();
        const names = { gallery: '作品展厅', studio: '工作室', about: '关于我', contact: '联系我' };
        await page.getByRole('button', { name: '前往' + names[room], exact: true }).click();
        await page.waitForURL('**/' + room); await page.locator('.nav-btn.back-btn').waitFor({ state: 'visible' }); await page.waitForTimeout(2500);
        await metaCheck(page, room);
        if (room === 'about') {
            const content = await page.getByLabel('关于我内容', { exact: true }).innerText();
            for (const identity of [...ABOUT_PROFILE.qualifications.map(item => item.name), ...ABOUT_PROFILE.honors.map(item => item.name), ...ABOUT_PROFILE.communityRoles]) assert.ok(content.includes(identity), identity);
            const introButton = page.getByRole('button', { name: '阅读个人介绍', exact: true });
            await introButton.focus(); await introButton.press('Enter');
            await page.locator('.global-overlay-wrapper[aria-hidden="false"]').waitFor({ state: 'visible' }); await page.waitForTimeout(3500);
            assert.equal(await page.locator('#content-card-title').innerText(), '关于时安');
            await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
            assert.equal(new URL(page.url()).pathname, '/about'); report.checks.push('full personal identities and about paper remain usable');
        }
        if (room === 'studio') {
            for (const item of STUDIO_CONTENT) assert.ok((await page.getByLabel('工作室内容', { exact: true }).innerText()).includes(item.title));
            report.checks.push(`all ${STUDIO_CONTENT.length} studio titles match the static content`);
        }
        if (room === 'contact') {
            for (const item of CONTACT_CHANNELS) {
                const contactButton = page.getByRole('button', { name: `查看${item.label}联系方式`, exact: true });
                await contactButton.focus(); await contactButton.press('Enter');
                await page.locator('.global-overlay-wrapper[aria-hidden="false"]').waitFor({ state: 'visible' }); await page.waitForTimeout(1600);
                assert.equal(await page.getByLabel(item.label + '账号', { exact: true }).innerText(), item.account);
                await page.keyboard.press('Escape'); await page.waitForTimeout(1150);
            }
            assert.equal(await page.locator('form').count(), 0); report.checks.push('six real contact details open; no placeholder submission form');
        }
        await page.goBack(); await page.waitForURL(base + '/'); await page.waitForTimeout(2200); await metaCheck(page, 'null');
        await page.goForward(); await page.waitForURL('**/' + room); await page.waitForTimeout(2500); await metaCheck(page, room);
        await page.locator('.nav-btn.back-btn').click(); await page.waitForURL(base + '/'); await page.waitForTimeout(2200);
        report.checks.push(room + ': browser back, forward and return to corridor preserve scene and route');
    }
    await page.close();
    // Direct links must keep their path during loading and enter the actual requested room.
    for (const room of ['gallery', 'studio', 'about', 'contact']) {
        const direct = active = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
        await enter(direct, '/' + room); await metaCheck(direct, room);
        assert.ok((await direct.locator('.sr-overlay').innerText()).includes('你在' + ({ gallery: '作品展厅', studio: '工作室', about: '关于我', contact: '联系我' })[room]));
        if (room === 'about') { await direct.reload({ waitUntil: 'domcontentloaded' }); await direct.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 }); assert.equal(new URL(direct.url()).pathname, '/about'); await metaCheck(direct, room); }
        await direct.screenshot({ path: `${out}/direct-${room}.png` });
        report.checks.push(room + ': direct phone URL reaches the actual room'); await direct.close();
    }
    }
    for (const width of [1440, 390, 320]) {
        const start = active = await newPage({ viewport: { width, height: 844 }, javaScriptEnabled: false });
        await start.goto(base + '/start', { waitUntil: 'load' }); await start.evaluate(() => document.fonts.ready);
        assert.equal(await start.locator('html').getAttribute('lang'), 'zh-CN');
        assert.equal(await start.getByRole('heading', { level: 1 }).innerText(), 'SHIAN');
        assert.equal(await start.getByLabel('联系与社交平台').locator('a').count(), 6);
        assert.ok(await start.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.doesNotMatch(await start.locator('body').innerText(), /ITom|Creative Developer|AVAILABLE/);
        await start.screenshot({ path: `${out}/start-${width}.png`, fullPage: true }); report.checks.push('start ' + width + ': Chinese content and six accounts without JS or horizontal overflow'); await start.close();
    }
    const fallback = active = await newPage({ javaScriptEnabled: false });
    await fallback.goto(base + '/', { waitUntil: 'domcontentloaded' });
    assert.ok(await fallback.getByRole('heading', { name: '关于时安', exact: true }).isVisible());
    assert.equal(await fallback.getByRole('link', { name: '打开邮件应用', exact: true }).getAttribute('href'), 'mailto:shianlab.ai@gmail.com');
    report.checks.push('no-JS fallback exposes the actual introduction, works and mail link'); await fallback.close();
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []); assert.deepEqual(report.localErrors, []); assert.deepEqual(report.forbiddenRequests, []);
    report.checks.push('no JS exceptions, console errors, local HTTP errors, old CMS or unconfigured analytics requests');
    fs.writeFileSync(`${out}/${process.env.SHIAN_SITE_TEST_SCOPE === 'static' ? 'static-final-inspection' : 'browser-inspection'}.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} catch (error) {
    report.error = error.stack;
    if (active && !active.isClosed()) await active.screenshot({ path: `${out}/browser-failure.png`, fullPage: true });
    fs.writeFileSync(`${out}/browser-failure-${Date.now()}.json`, JSON.stringify(report, null, 2)); throw error;
} finally { await browser.close(); }

