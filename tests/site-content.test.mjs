import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildStructuredData, buildSemanticContent, buildHead, buildLlmsTxt, buildSitemap, renderPage } from '../seo-plugin.js';
import { ABOUT_PROFILE } from '../src/config/about-profile.js';
import { GALLERY_PROJECTS } from '../src/config/gallery-projects.js';
import { STUDIO_CONTENT } from '../src/config/studio-content.js';
import { CONTACT_CHANNELS } from '../src/config/contact-channels.js';
import { PAGE_META } from '../src/config/site-profile.js';

test('Published content contains the seven confirmed identities and no author CMS fallback', () => {
    const text = buildSemanticContent(), llms = buildLlmsTxt(), schema = buildStructuredData();
    const identities = [...ABOUT_PROFILE.qualifications.map(item => item.name), ...ABOUT_PROFILE.honors.map(item => item.name), ...ABOUT_PROFILE.communityRoles];
    for (const identity of identities) {
        assert.equal(llms.split(identity).length - 1, 1, identity);
        assert.ok(schema['@graph'][0].description.includes(identity));
    }
    for (const item of [...GALLERY_PROJECTS, ...STUDIO_CONTENT]) assert.ok(llms.includes(item.title));
    assert.doesNotMatch(text + llms + JSON.stringify(schema), /itomdev|Tomasz|Szmajda|ITomPoland|kv5wjjmj|sanity\.io/);
    assert.equal(schema['@graph'][0].hasCredential.length, 2);
    assert.equal(schema['@graph'][0].award.length, 1);
    assert.ok(schema['@graph'].filter(item => item.datePublished).every(item => STUDIO_CONTENT.some(content => content.date === item.datePublished)));
});

test('Every room has a unique Chinese title, canonical and valid structured data', () => {
    const template = fs.readFileSync('index.html', 'utf8');
    for (const [key, meta] of Object.entries(PAGE_META)) {
        const html = renderPage(template, key === 'null' ? null : key);
        assert.ok(html.includes(`href="https://www.shian.life${meta.path}"`));
        assert.equal((html.match(/<title>/g) || []).length, 1);
        assert.equal((html.match(/id="seo-content"/g) || []).length, 1);
        assert.equal((html.match(/application\/ld\+json/g) || []).length, 1);
        const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
        assert.equal(schema['@graph'].find(item => item['@type'] === 'WebPage').name, meta.title);
    }
    assert.equal((buildSitemap().match(/<loc>/g) || []).length, 5);
    assert.doesNotMatch(buildSitemap(), /lastmod|localhost|127\.0\.0\.1|itom/);
});

test('Rendering escapes future reviewed content instead of inserting executable HTML', () => {
    const original = GALLERY_PROJECTS[0].title;
    try {
        GALLERY_PROJECTS[0].title = '</script><img src=x onerror=alert(1)> & "test"';
        assert.ok(buildSemanticContent().includes('&lt;img'));
        assert.doesNotMatch(buildSemanticContent(), /<img src=x/);
        assert.equal((buildHead().match(/<\/script>/g) || []).length, 1);
        assert.ok(buildHead().includes('\\u003c/script>'));
    } finally { GALLERY_PROJECTS[0].title = original; }
});

test('Canonical article links and all contact accounts match the integrated fallback', () => {
    assert.equal(CONTACT_CHANNELS.find(item => item.id === 'official-account').url, STUDIO_CONTENT.find(item => item.id === 'jev').url);
    for (const item of CONTACT_CHANNELS) assert.ok(buildLlmsTxt().includes(item.account));
    assert.equal(GALLERY_PROJECTS.find(item => item.id === 'shian-font-workbench').url, null);
    assert.doesNotMatch(buildSemanticContent('gallery'), /Shian-Font-Workbench/);
});
