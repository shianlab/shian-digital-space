import fs from 'node:fs';
import sharp from 'sharp';

const out = 'docs/planning/materials/studio-social-2026-10-07/sources';
const notes = [];
fs.mkdirSync('public/images/studio', { recursive: true });
for (const id of ['crybaby', 'dimoo', 'font-introduction', 'font-workflow']) {
    const state = JSON.parse(fs.readFileSync(`${out}/${id}-state.json`, 'utf8'));
    const note = state.noteData.data.noteData;
    const entry = { id, title: note.title, description: note.desc, author: note.user.nickName, date: new Date(note.time).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }), type: note.type, images: note.imageList.map(i => i.url.replace(/^http:/, 'https:')) };
    notes.push(entry);
    console.log(JSON.stringify(entry));
    for (const [index, url] of entry.images.entries()) {
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`${id} image ${index}: ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(`${out}/${id}-${index + 1}.jpg`, bytes);
        if (index === 0) await sharp(bytes).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 84 }).toFile(`public/images/studio/${id}.webp`);
    }
}
fs.writeFileSync(`${out}/notes.json`, JSON.stringify(notes, null, 2));
for (const [id, videoId] of [['font-teaching', '7688346313179858158'], ['font-applications', '7688560225674713075']]) {
    const url = `https://www.douyin.com/video/${videoId}`;
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36' }, signal: AbortSignal.timeout(30000) });
    const html = await response.text();
    fs.writeFileSync(`${out}/${id}-desktop.html`, html);
    console.log(JSON.stringify({ id, url: response.url, status: response.status, bytes: html.length, title: html.match(/<title[^>]*>(.*?)<\/title>/s)?.[1] }));
}
