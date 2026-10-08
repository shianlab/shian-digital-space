import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5176';
const tag = process.env.SHIAN_MEASURE_TAG || 'baseline';
const out = 'docs/planning/materials/stage-13'; fs.mkdirSync(out, { recursive: true });
const report = { base, tag, measurements: [] };
try {
    for (const [label, viewport, mobile] of [['desktop', { width:1440,height:900 }, false], ['phone', { width:390,height:844 }, true]]) {
        const context = await browser.newContext({ viewport, isMobile:mobile, hasTouch:mobile });
        const page = await context.newPage(); const errors=[];
        page.on('pageerror', e=>errors.push(e.message));
        await page.addInitScript(()=>{
            Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});
            Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
            window.__frames=[]; window.__THREE_DEVTOOLS__=new EventTarget();
            window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
                if (!e.detail.isWebGLRenderer) return;
                const renderer=e.detail, render=renderer.render;
                renderer.render=function(scene,camera){window.__renderer=renderer;window.__scene=scene;window.__camera=camera;return render.call(this,scene,camera);};
            });
        });
        const began=Date.now(); await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
        await page.locator('.preloader').waitFor({state:'hidden',timeout:90000}); const entranceMs=Date.now()-began;
        const entryResources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({url:new URL(r.name).pathname,bytes:r.decodedBodySize,transfer:r.transferSize,duration:r.duration})));
        const button=page.getByRole('button',{name:'进入时安的数字空间',exact:true}); await button.focus();await button.press('Enter');
        await page.getByRole('button',{name:'打开地图',exact:true}).waitFor(); await page.waitForTimeout(2500);
        const graphics=await page.evaluate(()=>({dpr:window.__renderer?.getPixelRatio(),drawCalls:window.__renderer?.info.render.calls,triangles:window.__renderer?.info.render.triangles,memory:window.__renderer?.info.memory}));
        const frames=await page.evaluate(()=>new Promise(resolve=>{let previous=performance.now();const intervals=[];const begin=previous;function tick(now){intervals.push(now-previous);previous=now;if(now-begin<2500)requestAnimationFrame(tick);else resolve(intervals);}requestAnimationFrame(tick);}));
        const sorted=frames.slice().sort((a,b)=>a-b); assert.deepEqual(errors,[]);
        report.measurements.push({label,entranceMs,resources:entryResources,totalBytes:entryResources.reduce((sum,r)=>sum+r.bytes,0),requestCount:entryResources.length,graphics,frameIntervalMedian:sorted[Math.floor(sorted.length*.5)],frameIntervalP95:sorted[Math.floor(sorted.length*.95)],errors});
        await page.screenshot({path:`${out}/${tag}-${label}.png`}); await context.close();
    }
    fs.writeFileSync(`${out}/${tag}-performance.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report.measurements.map(({label,entranceMs,totalBytes,requestCount,graphics,frameIntervalMedian,frameIntervalP95})=>({label,entranceMs,totalBytes,requestCount,graphics,frameIntervalMedian,frameIntervalP95}))));
} finally { await browser.close(); }
