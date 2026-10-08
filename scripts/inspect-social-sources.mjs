import fs from 'node:fs';
const links = [
    ['crybaby', 'https://xhslink.cn/o/9gigzXJm7ux'],
    ['dimoo', 'https://xhslink.cn/o/LK9Un3aNg6'],
    ['font-introduction', 'https://xhslink.cn/o/6EOZqpKnZpC'],
    ['font-workflow', 'https://xhslink.cn/o/Amu0vdsG7U8'],
    ['font-teaching', 'https://v.douyin.com/zq8q3VzpZ7w/'],
    ['font-applications', 'https://v.douyin.com/8MCKv_Gm8eA/'],
];
const out = 'docs/planning/materials/studio-social-2026-10-07/sources';
fs.mkdirSync(out, { recursive: true });
const results = await Promise.all(links.map(async ([id, source]) => {
    try {
        const response = await fetch(source, { headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }, signal: AbortSignal.timeout(30000) });
        const html = await response.text();
        fs.writeFileSync(out + '/' + id + '.html', html);
        const embedded = html.match(/window\.(?:__INITIAL_STATE__|_ROUTER_DATA)\s*=\s*(.*?)<\/script>/s)?.[1];
        if (embedded) {
            // Parse public serialized data only; never execute downloaded scripts.
            // Preserve strings verbatim while converting JS undefined values to JSON null.
            const json = embedded.trim().replace(/;$/, '').replace(/"(?:\\.|[^"\\])*"|\bundefined\b/g, token => token === 'undefined' ? 'null' : token);
            fs.writeFileSync(out + '/' + id + '-state.json', JSON.stringify(JSON.parse(json), null, 2));
        }
        return { id, source, url: response.url, status: response.status, bytes: Buffer.byteLength(html), title: html.match(/<title[^>]*>(.*?)<\/title>/s)?.[1] };
    } catch (e) { return { id, source, error: e.message }; }
}));
fs.writeFileSync(out + '/links.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
