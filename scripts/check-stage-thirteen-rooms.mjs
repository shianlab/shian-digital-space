import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Re-run the original real-scene assertions against the new production build.
// Keep the previous stage's evidence intact.
const cases = [['eight','08','gallery'], ['nine','09','studio'], ['ten','10','about'], ['eleven','11','contact']];
for (const [word, stage, room] of cases.filter(([, , room]) => !process.env.SHIAN_ROOM || room === process.env.SHIAN_ROOM)) {
    const out = `docs/planning/materials/stage-13/${room}`;
    fs.mkdirSync(out, { recursive:true });
    let source = fs.readFileSync(`scripts/check-stage-${word}-browser.mjs`, 'utf8')
        .replaceAll(`docs/planning/materials/stage-${stage}`, out)
        .replaceAll('http://127.0.0.1:5175', process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5176');
    source = source.replace(/from '(\.\.\/src\/[^']+)'/g, (_, module) => `from '${pathToFileURL(path.resolve('scripts', module)).href}'`);
    source = source.replace(/import\('(\.\.\/src\/[^']+)'\)/g, (_, module) => `import('${pathToFileURL(path.resolve('scripts', module)).href}')`);
    console.log('Checking real room: ' + room);
    await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    if (process.exitCode) throw new Error(room + ' failed; see its preserved report');
}
