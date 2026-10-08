import fs from 'node:fs';
import assert from 'node:assert/strict';
import { PAGE_META, SITE_PROFILE } from '../src/config/site-profile.js';
import { ABOUT_PROFILE } from '../src/config/about-profile.js';
const report = { checks: [] };
for (const [room, meta] of Object.entries(PAGE_META)) {
    const file = room === 'null' ? 'dist/index.html' : `dist/${room}/index.html`;
    const html = fs.readFileSync(file, 'utf8');
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal((html.match(/id="seo-content"/g) || []).length, 1);
    assert.ok(html.includes(`<title>${meta.title}</title>`));
    assert.ok(html.includes(`href="${SITE_PROFILE.url}${meta.path}"`));
    assert.doesNotMatch(html, /itomdev|Tomasz|Szmajda|ITomPoland|kv5wjjmj|sanity\.io|google-site-verification/);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
    assert.equal(schema['@graph'].find(item => item['@type'] === 'Person').name, '时安');
    assert.equal(schema['@graph'].find(item => item['@type'] === 'WebPage').url, SITE_PROFILE.url + meta.path);
    for (const [, url] of html.matchAll(/(?:href|src)="(\/(?:assets|images|textures)[^"]+)"/g)) assert.ok(fs.existsSync('dist' + url), 'missing built asset ' + url);
    report.checks.push(meta.path + ': unique Chinese metadata, real source, schema and referenced assets');
}
for (const file of ['llms.txt', 'robots.txt', 'sitemap.xml', 'start/index.html']) {
    const text = fs.readFileSync('dist/' + file, 'utf8');
    assert.doesNotMatch(text, /itomdev|Tomasz|Szmajda|ITomPoland|kv5wjjmj|sanity\.io/);
    report.checks.push(file + ': no author account, CMS or old domain');
}
const llms = fs.readFileSync('dist/llms.txt', 'utf8');
for (const identity of [...ABOUT_PROFILE.qualifications.map(item => item.name), ...ABOUT_PROFILE.honors.map(item => item.name), ...ABOUT_PROFILE.communityRoles]) assert.ok(llms.includes(identity));
assert.equal((fs.readFileSync('dist/sitemap.xml', 'utf8').match(/<loc>/g) || []).length, 5);
assert.ok(fs.existsSync('dist/images/share/shian-digital-space.png'));
assert.ok(fs.existsSync('dist/images/brand/shian-touch-icon.png'));
assert.ok(!fs.existsSync('dist/og-image.webp'));
report.checks.push('seven identities, five sitemap routes and actual brand images packaged');
fs.writeFileSync('docs/planning/materials/stage-12/build-inspection.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
