import fs from 'node:fs';

// Reuse established checks, saving a new inspection instead of overwriting stage evidence.
const cases={
 navigation:'check-stage-thirteen-browser',touch:'check-stage-thirteen-touch',
 loading:'check-stage-thirteen-loading',gallery:'check-learnkit-gallery',
 build:'check-learnkit-build',art:'check-corridor-personal-art',
 handwriting:'check-handwritten-labels',aiart:'check-ai-first-art',long:'check-long-corridor',
 studio:'check-stage-nine-browser',door:'check-studio-door',filing:'check-site-filing',entrance:'check-entrance-ai-tools',contact:'check-stage-eleven-browser',
};
const name=process.argv[2]||'navigation';
if(!cases[name])throw Error('Unknown inspection case: '+name);
const root=process.env.SHIAN_INSPECTION_DIR||'docs/planning/materials/inspection-2026-10-06';
const out=['gallery','art','handwriting','aiart','long','studio','door','filing','entrance','contact'].includes(name)?root+'/'+name:root;
fs.mkdirSync(out,{recursive:true});
process.env.SHIAN_SITE_TEST_URL||='http://127.0.0.1:5176';
process.env.SHIAN_STUDIO_BASE_URL||=process.env.SHIAN_SITE_TEST_URL;
if(name==='studio')process.env.SHIAN_STUDIO_INSPECTION_DIR=out;
if(name==='filing')process.env.SHIAN_FILING_INSPECTION_DIR=out;
process.env.SHIAN_INSPECTION_DIR=out;
let source=fs.readFileSync('scripts/'+cases[name]+'.mjs','utf8')
 .replaceAll('docs/planning/materials/stage-13',out)
 .replaceAll('docs/planning/materials/learnkit',out)
 .replaceAll('docs/planning/materials/corridor-personal-art',out)
 .replaceAll('docs/planning/materials/handwriting-reference/implemented',out)
 .replaceAll('docs/planning/materials/ai-first',out)
 .replaceAll('docs/planning/materials/studio-door-2026-10-07',out)
 .replaceAll('docs/planning/materials/entrance-ai-tools',out)
 .replaceAll('docs/planning/materials/stage-11',out)
 .replaceAll('docs/planning/materials/inspection-2026-10-06',out);
source=source.replace(/from '([^']+)'/g,(_,module)=>`from '${module.startsWith('node:')?module:import.meta.resolve(module)}'`);
source=source.replace(/import\(\s*'(\.[^']+)'\s*\)/g,(_,module)=>`import('${import.meta.resolve(module)}')`);
if(name==='contact')source=source.replaceAll('http://127.0.0.1:5175',process.env.SHIAN_SITE_TEST_URL);
source=source.replace(/headless:\s*true\s*}/g,"headless:true,args:['--disable-features=OverscrollHistoryNavigation','--overscroll-history-navigation=0']}");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
