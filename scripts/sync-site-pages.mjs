import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_PROFILE } from '../src/config/site-profile.js';
import { ABOUT_PROFILE } from '../src/config/about-profile.js';
import { CONTACT_CHANNELS } from '../src/config/contact-channels.js';
import { buildHead, buildRobotsTxt, buildSitemap, buildSiteFooter, escapeHtml, renderPage } from '../seo-plugin.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = (name, data) => { const target = path.join(root, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, data); };
write('index.html', renderPage(fs.readFileSync(path.join(root, 'index.html'), 'utf8')));
write('public/robots.txt', buildRobotsTxt());
write('public/sitemap.xml', buildSitemap());
// Include the upstream MIT copyright notice in the distributed static files.
write('public/template-LICENSE.txt', fs.readFileSync(path.join(root, 'LICENSE'), 'utf8'));

// Package the already approved IP inside a native SVG viewport; no new character is drawn.
const avatar = fs.readFileSync(path.join(root, 'public/textures/shian/corridor/05.webp')).toString('base64');
write('.cache/brand/icon-source.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><title>时安</title><rect width="180" height="180" rx="32" fill="#fafafa"/><svg x="8" y="8" width="164" height="164" viewBox="260 40 740 670"><image href="data:image/webp;base64,${avatar}" width="1254" height="1254"/></svg></svg>`);

const arrow = '<svg class="press-arrow" viewBox="0 0 82 82" aria-hidden="true"><path class="arrow-back" d="M8 59 46 20 18 20 18 6 71 7 70 59 56 60 56 32 19 70Z"/><path class="arrow-face" d="M8 59 46 20 18 20 18 6 71 7 70 59 56 60 56 32 19 70Z"/></svg>';
const profileLinks = CONTACT_CHANNELS.map(item => {
    const url = item.url || '/contact';
    const external = url.startsWith('https://') ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${escapeHtml(url)}"${external}>${escapeHtml(item.label)}</a>`;
}).join('\n');
write('public/start/index.html', `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#fafafa">
${buildHead().replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex, follow">')}
<link rel="icon" type="image/png" href="/images/brand/shian-touch-icon.png"><link rel="apple-touch-icon" href="/images/brand/shian-touch-icon.png">
<link rel="stylesheet" href="/start/style.css"><script src="/start/script.js" defer></script></head>
<body><a class="skip-link" href="#links">跳转到入口</a><div class="sheet"><main>
<div class="doodle-annotation top-annotation"><div class="signature"><h1>${ABOUT_PROFILE.brand}</h1><p class="role">${SITE_PROFILE.identities.map(escapeHtml).join(' · ')}</p></div><svg class="doodle-squiggle" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true"><path d="M5,10 Q30,2 60,12 T120,8 T195,12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
<nav class="primary" id="links" aria-label="数字空间入口" tabindex="-1">
<a class="work-link portfolio-link" href="/" aria-label="进入时安的数字空间"><span class="work-label" aria-hidden="true"><span class="word">进入</span> <span class="last-word"><span class="word">数字空间</span>${arrow}</span></span></a>
<a class="work-link sketchbook-link" href="/studio" aria-label="阅读文章与知识资源"><span class="work-label" aria-hidden="true"><span class="word">文章与</span> <span class="last-word"><span class="word">知识资源</span>${arrow}</span></span></a></nav>
<div class="doodle-annotation side-annotation"><p class="bio">${escapeHtml(ABOUT_PROFILE.motto)}</p></div>
<nav class="profiles" aria-label="联系与社交平台">${profileLinks}</nav></main>
${buildSiteFooter({scene:false,brand:true})}</div><p class="notice" role="status" aria-live="polite"></p></body></html>`);
console.log('Synced Chinese entry pages, brand icon, robots and sitemap from reviewed local content.');

