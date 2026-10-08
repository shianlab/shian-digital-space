import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME,'package.json'));
const browser=await require('playwright').chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const report={checks:[],pageErrors:[],consoleErrors:[],httpErrors:[],memory:[]};
page.on('pageerror',e=>report.pageErrors.push(e.message));
page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:5176')&&r.status()>=400)report.httpErrors.push(r.url());});
await page.addInitScript(()=>{
 window.__THREE_DEVTOOLS__=new EventTarget();
 window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
  if(!e.detail.isWebGLRenderer)return;
  const renderer=e.detail,render=renderer.render;
  renderer.render=function(scene,camera){if(scene?.isScene&&camera?.isPerspectiveCamera){window.__camera=camera;window.__scene=scene;window.__renderer=renderer;}return render.call(this,scene,camera);};
 });
});
const state=()=>page.evaluate(()=>({z:window.__camera.position.z,memory:{...window.__renderer.info.memory}}));
const out='docs/planning/materials/inspection-2026-10-06';
try{
 await page.goto('http://127.0.0.1:5176');await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
 const entry=page.getByRole('button',{name:'进入时安的数字空间',exact:true});await entry.focus();await entry.press('Enter');
 await page.getByRole('button',{name:'打开地图',exact:true}).waitFor();await page.waitForTimeout(2200);await page.locator('canvas').click({position:{x:700,y:500}});
 const original=await state();report.memory.push(original);
 for(let i=0;i<3;i++){
  await page.mouse.wheel(0,5000);await page.waitForTimeout(3500);
  const far=await state();assert.ok(far.z< -75,'passes first segment end');report.memory.push(far);
  await page.mouse.wheel(0,-5000);await page.waitForTimeout(3500);
  const back=await state();assert.ok(Math.abs(back.z-original.z)<4,'returns to welcome segment');report.memory.push(back);
 }
 const returned=report.memory.filter((_,i)=>i>0&&i%2===0).map(item=>item.memory.geometries);
 assert.ok(Math.max(...returned)-Math.min(...returned)<=4,'geometry count stays stable after returning to the same location: '+returned.join(','));
 report.checks.push('three forward/back cycles cross automatic doors and regenerate corridor segments without runtime or HTTP errors');
 report.checks.push('geometry count remains stable across repeated return trips');
 await page.screenshot({path:out+'/corridor-long-walk.png'});
 await page.getByRole('button',{name:'探索成就',exact:true}).click();await page.waitForTimeout(500);
 await page.keyboard.press('Escape');report.checks.push('achievement panel still opens and closes after long travel');
 await page.getByRole('button',{name:'打开地图',exact:true}).click();await page.getByRole('button',{name:'前往关于我',exact:true}).click();
 await page.waitForURL('**/about');await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});await page.waitForTimeout(2200);
 await page.locator('.nav-btn.back-btn').click();await page.waitForURL('http://127.0.0.1:5176/');await page.waitForTimeout(2200);
 report.checks.push('map travel and room exit remain usable after long corridor travel');
 assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.httpErrors,[]);
 console.log('PASS long corridor');
}catch(e){report.failure=e.stack;throw e;}
finally{fs.writeFileSync(out+'/long-corridor.json',JSON.stringify(report,null,2));await browser.close();}
