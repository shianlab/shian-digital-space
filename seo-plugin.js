import { SITE_NAME, SITE_PROFILE, PAGE_META } from './src/config/site-profile.js';
import { ABOUT_PROFILE, ABOUT_INTRO_DETAIL } from './src/config/about-profile.js';
import { GALLERY_PROJECTS } from './src/config/gallery-projects.js';
import { STUDIO_CONTENT } from './src/config/studio-content.js';
import { CONTACT_CHANNELS } from './src/config/contact-channels.js';
import { roomFromPath, ROOMS } from './src/config/rooms.js';
import { SITE_FILING } from './src/config/site-filing.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const absoluteUrl = path => new URL(path, SITE_PROFILE.url).href;
const paragraph = text => `<p>${escapeHtml(text)}</p>`;
const list = items => `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
const link = (url, label) => `<a href="${escapeHtml(url)}">${escapeHtml(label)}</a>`;

// Outside the React root: visible even if JavaScript or the 3D scene fails.
export function buildSiteFooter({ scene = true, brand = false } = {}) {
    return `<footer class="site-footer site-footer--${scene ? 'scene' : 'plain'}" aria-label="网站备案信息">${brand ? `<p class="availability">${escapeHtml(SITE_NAME)}</p>` : ''}<a href="${escapeHtml(SITE_FILING.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(SITE_FILING.number)}，工信部备案查询，新窗口打开">${escapeHtml(SITE_FILING.number)}</a></footer>`;
}

export function buildStructuredData(room = null) {
    const personId = absoluteUrl('/#person'), websiteId = absoluteUrl('/#website');
    const meta = PAGE_META[room ?? 'null'];
    const graph = [
        { '@type': 'Person', '@id': personId, name: ABOUT_PROFILE.name, alternateName: ['ShiAn', ABOUT_PROFILE.brand],
            url: absoluteUrl('/'), jobTitle: ABOUT_PROFILE.identities.join('、'), description: ABOUT_INTRO_DETAIL.description,
            knowsAbout: ABOUT_PROFILE.interests,
            hasCredential: ABOUT_PROFILE.qualifications.map(item => ({ '@type': 'EducationalOccupationalCredential', name: item.name })),
            award: ABOUT_PROFILE.honors.map(item => item.name),
            sameAs: CONTACT_CHANNELS.filter(item => ['xiaohongshu', 'github', 'x'].includes(item.id)).map(item => item.url) },
        { '@type': 'WebSite', '@id': websiteId, url: absoluteUrl('/'), name: SITE_NAME,
            description: SITE_PROFILE.description, inLanguage: 'zh-CN', publisher: { '@id': personId } },
        { '@type': 'WebPage', '@id': absoluteUrl(meta.path + '#page'), url: absoluteUrl(meta.path), name: meta.title,
            description: meta.description, inLanguage: 'zh-CN', isPartOf: { '@id': websiteId }, about: { '@id': personId } },
    ];
    if (!room || room === 'gallery') graph.push(...GALLERY_PROJECTS.map(item => ({
        '@type': 'CreativeWork', '@id': absoluteUrl('/gallery#' + item.id), name: item.title,
        description: item.description, inLanguage: 'zh-CN', creator: { '@id': personId }, ...(item.url ? { url: item.url } : {}),
    })));
    if (!room || room === 'studio') graph.push(...STUDIO_CONTENT.map(item => ({
        '@type': item.platform === 'wechat' ? 'Article' : 'CreativeWork', '@id': absoluteUrl('/studio#' + item.id),
        name: item.title, description: item.description, url: item.url, inLanguage: 'zh-CN',
        ...(item.date ? { datePublished: item.date } : {}),
        ...(item.author ? { author: { '@type': 'Person', name: item.author } } : {}),
        ...(item.cover ? { image: absoluteUrl(item.cover) } : {}),
    })));
    return { '@context': 'https://schema.org', '@graph': graph };
}

export function buildSemanticContent(room = null) {
    const meta = PAGE_META[room ?? 'null'];
    const sections = {
        about: `<section id="about"><h2>关于时安</h2>${paragraph(ABOUT_PROFILE.identities.join('、'))}${ABOUT_PROFILE.paragraphs.map(paragraph).join('')}<h3>专业资质</h3>${list(ABOUT_PROFILE.qualifications.map(item => item.name))}<h3>竞赛荣誉</h3>${list(ABOUT_PROFILE.honors.map(item => item.name))}<h3>社区与共建</h3>${list(ABOUT_PROFILE.communityRoles)}</section>`,
        gallery: `<section id="gallery"><h2>作品展厅</h2>${GALLERY_PROJECTS.map(item => `<article><h3>${escapeHtml(item.title)}</h3>${paragraph(item.status)}${paragraph(item.description)}${item.url ? link(item.url, item.linkLabel) : ''}</article>`).join('')}</section>`,
        studio: `<section id="studio"><h2>工作室</h2>${STUDIO_CONTENT.map(item => `<article><h3>${escapeHtml(item.title)}</h3>${item.date ? `<time datetime="${item.date}">${item.date}</time>` : ''}${paragraph(item.description)}${link(item.url, item.actionLabel)}</article>`).join('')}</section>`,
        contact: `<section id="contact"><h2>联系我</h2>${CONTACT_CHANNELS.map(item => `<article><h3>${escapeHtml(item.label)}</h3>${paragraph(item.account)}${paragraph(item.description)}${item.url ? link(item.url, item.actionLabel) : ''}</article>`).join('')}</section>`,
    };
    return `<div id="seo-content" class="sr-only-seo"><header><h1>${escapeHtml(meta.title)}</h1>${paragraph(meta.description)}</header><nav aria-label="空间导航">${link('/', '入口与走廊')} ${Object.values(ROOMS).map(item => link(item.path, item.name)).join(' ')}</nav>${room ? sections[room] : Object.values(sections).join('')}</div>`;
}

export function buildHead(room = null) {
    const meta = PAGE_META[room ?? 'null'];
    const title = escapeHtml(meta.title), description = escapeHtml(meta.description);
    const schema = JSON.stringify(buildStructuredData(room)).replace(/</g, '\\u003c');
    return `<!-- shian:head:start -->
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="author" content="${escapeHtml(SITE_PROFILE.name)}">
<meta name="robots" content="index, follow">
<link rel="stylesheet" href="/styles/site-footer.css">
<link rel="canonical" href="${absoluteUrl(meta.path)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${absoluteUrl(meta.path)}">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:locale" content="zh_CN">
<meta property="og:image" content="${absoluteUrl(SITE_PROFILE.image)}">
<meta property="og:image:alt" content="${escapeHtml(SITE_PROFILE.imageAlt)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ShiAnOPC">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${absoluteUrl(SITE_PROFILE.image)}">
<meta name="twitter:image:alt" content="${escapeHtml(SITE_PROFILE.imageAlt)}">
<script type="application/ld+json">${schema}</script>
<!-- shian:head:end -->`;
}

export function renderPage(html, room = null) {
    const page = html.replace(/<!-- shian:head:start -->[\s\S]*?<!-- shian:head:end -->/, () => buildHead(room))
        .replace(/<!-- shian:content:start -->[\s\S]*?<!-- shian:content:end -->/, () => `<!-- shian:content:start -->${buildSemanticContent(room)}<!-- shian:content:end -->`);
    const footer = `<!-- shian:footer:start -->${buildSiteFooter()}<!-- shian:footer:end -->`;
    return page.includes('<!-- shian:footer:start -->')
        ? page.replace(/<!-- shian:footer:start -->[\s\S]*?<!-- shian:footer:end -->/, () => footer)
        : page.replace('</body>', () => footer + '\n</body>');
}

export function buildLlmsTxt() {
    return `# ${SITE_NAME}\n\n> ${SITE_PROFILE.description}\n\n正式域名（部署准备中）：${absoluteUrl('/')}\n\n## 关于时安\n\n${ABOUT_INTRO_DETAIL.description}\n\n## 作品展厅\n\n${GALLERY_PROJECTS.map(item => `### ${item.title}\n\n${item.status}\n${item.description}\n${item.url || '暂无公开访问入口。'}`).join('\n\n')}\n\n## 工作室\n\n${STUDIO_CONTENT.map(item => `### ${item.title}\n\n${item.description}\n${item.url}`).join('\n\n')}\n\n## 联系方式\n\n${CONTACT_CHANNELS.map(item => `- ${item.label}：${item.account}${item.url ? ` — ${item.url}` : ''}`).join('\n')}\n`;
}
export const buildRobotsTxt = () => `User-agent: *\nAllow: /\nDisallow: /dev/\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
export const buildSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.values(PAGE_META).map(meta => `<url><loc>${absoluteUrl(meta.path)}</loc></url>`).join('')}</urlset>\n`;

export function generateSeoHtml() {
    const textFiles = { '/llms.txt': [buildLlmsTxt, 'text/plain'], '/robots.txt': [buildRobotsTxt, 'text/plain'], '/sitemap.xml': [buildSitemap, 'application/xml'] };
    return {
        name: 'shian-local-seo', enforce: 'post',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const entry = textFiles[req.url.split('?')[0]];
                if (!entry) return next();
                res.setHeader('Content-Type', `${entry[1]}; charset=utf-8`);
                res.end(entry[0]());
            });
        },
        transformIndexHtml: { order: 'post', handler(html, context) {
            if (context.path.startsWith('/dev/')) return html;
            return renderPage(html, roomFromPath(context.path));
        } },
        generateBundle: { order: 'post', handler(_options, bundle) {
            const index = bundle['index.html'];
            if (!index) throw new Error('Missing built index.html: route metadata could not be generated.');
            for (const room of Object.keys(ROOMS)) this.emitFile({ type: 'asset', fileName: `${room}/index.html`, source: renderPage(String(index.source), room) });
            for (const [fileName, [build]] of Object.entries(textFiles)) this.emitFile({ type: 'asset', fileName: fileName.slice(1), source: build() });
        } },
    };
}
