import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { SITE_FILING } from '../src/config/site-filing.js';
import { SOUND_PATHS } from '../src/config/sound-paths.js';

const out = process.env.SHIAN_INSPECTION_DIR || 'docs/planning/materials/pre-cloudbase-2026-10-07';
fs.mkdirSync(out, { recursive: true });
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const files = walk('dist');
const report = { checks: [], referencedAssets: [], bytes: files.reduce((sum, file) => sum + fs.statSync(file).size, 0), files: files.length };
for (const file of files) {
    const relative = path.relative('dist', file).replaceAll('\\', '/');
    assert.ok(!/(^|\/)(?:\.env(?:\..*)?|node_modules|src|docs|dev|functions)(?:\/|$)/.test(relative), 'private or source directory in release: ' + relative);
    assert.ok(!/\.(?:map|pem|key)$/.test(relative), 'unintended source map or key in release: ' + relative);
}
report.checks.push('static release excludes source, development pages, docs, env files, keys and source maps');
assert.equal(fs.readFileSync('dist/template-LICENSE.txt', 'utf8'), fs.readFileSync('LICENSE', 'utf8'));
for (const file of ['fonts/OFL-LXGW-WenKai.txt', 'fonts/OFL-CabinSketch.txt', 'fonts/OFL-FrederickaTheGreat.txt', 'fonts/OFL-RubikScribble.txt', 'fonts/LICENSE-Satisfy.txt', 'start/fonts/OFL.txt']) assert.ok(fs.existsSync('dist/' + file));
report.checks.push('template MIT notice and existing font licenses distributed');
for (const route of ['', 'gallery/', 'studio/', 'about/', 'contact/', 'start/']) {
    const html = fs.readFileSync(`dist/${route}index.html`, 'utf8');
    assert.equal((html.match(/<footer\b/g) || []).length, 1);
    assert.ok(html.includes(SITE_FILING.number));
    assert.ok(html.includes('href="' + SITE_FILING.url + '" target="_blank" rel="noopener noreferrer"'));
    for (const [, url] of html.matchAll(/(?:href|src)="(\/[^"#?]+)(?:[?#][^"]*)?"/g)) {
        if (!path.extname(url)) continue;
        assert.ok(fs.existsSync('dist' + url), 'missing HTML resource: ' + url);
        report.referencedAssets.push(url);
    }
}
report.checks.push('all six entries package one exact filing number and all local HTML resources');
const sources = walk('src').filter(file => /\.(?:jsx?|scss)$/.test(file));
for (const [name, url] of Object.entries(SOUND_PATHS)) {
    if (url === null) continue;
    assert.ok(fs.existsSync('dist' + url), 'missing registered sound: ' + name);
    report.referencedAssets.push(url);
}
for (const file of sources) {
    for (const [, sound] of fs.readFileSync(file, 'utf8').matchAll(/\bplay\(\s*['"]([^'"]+)['"]/g)) {
        assert.ok(Object.hasOwn(SOUND_PATHS, sound), 'unregistered sound in ' + file + ': ' + sound);
    }
    for (const [, url] of fs.readFileSync(file, 'utf8').matchAll(/['"(](\/(?:textures|images|sounds|fonts|styles|cursors)\/[^'"()\s`$]+\.(?:webp|png|jpe?g|svg|woff2?|ttf|ogg|mp3|css|glb))/g)) {
        // Legacy, unreachable components are checked too; report filenames without contents.
        assert.ok(fs.existsSync('dist' + url), 'missing source resource in ' + file + ': ' + url);
        report.referencedAssets.push(url);
    }
}
report.referencedAssets = [...new Set(report.referencedAssets)].sort();
report.checks.push(`${report.referencedAssets.length} literal local resource paths present in release`);
report.checks.push('all named audio calls are configured; every registered sound ships in release');

// Identify diagnostics in actual entry/lazy-import modules separately from retained legacy files.
const reachable = new Set();
function visit(file) {
    file = path.resolve(file);
    if (reachable.has(file)) return;
    reachable.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const [, , spec] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)(['"])(\.[^'"]+)\1/g)) {
        const candidate = path.resolve(path.dirname(file), spec);
        const target = [candidate, candidate + '.js', candidate + '.jsx', path.join(candidate, 'index.js')].find(p => fs.existsSync(p) && fs.statSync(p).isFile());
        if (target && /\.jsx?$/.test(target)) visit(target);
    }
}
visit('src/main.jsx');
const lintFile = 'docs/planning/materials/pre-cloudbase-eslint-after-2026-10-07.json';
if (fs.existsSync(lintFile)) {
    const lint = JSON.parse(fs.readFileSync(lintFile, 'utf8'));
    const summarize = items => ({ errors: items.reduce((n, r) => n + r.errorCount, 0), warnings: items.reduce((n, r) => n + r.warningCount, 0), files: items.filter(r => r.messages.length).map(r => path.relative(process.cwd(), r.filePath).replaceAll('\\', '/')) });
    report.lint = { reachableModules: reachable.size, published: summarize(lint.filter(r => reachable.has(path.resolve(r.filePath)))), retainedLegacy: summarize(lint.filter(r => !reachable.has(path.resolve(r.filePath)))) };
    fs.writeFileSync(out + '/release-assets.json', JSON.stringify(report, null, 2));
    assert.equal(report.lint.published.errors, 0, 'active modules have lint errors');
    report.checks.push('entry and lazy-import module graph has no ESLint errors');
}
fs.writeFileSync(out + '/release-assets.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, referencedAssets: report.referencedAssets.length }));
