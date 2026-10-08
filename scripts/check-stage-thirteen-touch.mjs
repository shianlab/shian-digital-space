import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel:'msedge', headless:true });
const out = process.env.SHIAN_INSPECTION_DIR || 'docs/planning/materials/stage-13';
fs.mkdirSync(out,{recursive:true});
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5176';
const report = { checks:[], errors:[], localErrors:[], requests:[] };
const context = await browser.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:2,
    userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36' });
const page = await context.newPage();
page.on('pageerror', e=>report.errors.push(e.message));
page.on('console', m=>{if(m.type()==='error')report.errors.push(m.text());});
page.on('response', r=>{if(r.url().startsWith(base)&&r.status()>=400)report.localErrors.push({url:r.url(),status:r.status()});});
page.on('request', r=>report.requests.push(r.url()));
await page.addInitScript(()=>{
    Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});
    Object.defineProperty(navigator,'deviceMemory',{get:()=>4});
    window.__THREE_DEVTOOLS__=new EventTarget();
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
        if(!e.detail.isWebGLRenderer)return;
        const renderer=e.detail,render=renderer.render;
        renderer.render=function(scene,camera){window.__camera=camera;window.__renderer=renderer;return render.call(this,scene,camera);};
    });
    window.__audio=[]; const NativeAudio=window.Audio;
    window.Audio=function(...args){const audio=new NativeAudio(...args);window.__audio.push(audio);return audio;};
});
const cameraZ = () => page.evaluate(()=>window.__camera.position.z);
async function drag(start,end) {
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start[0],y:start[1]}]});
    for(let i=1;i<=10;i++) {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start[0]+(end[0]-start[0])*i/10,y:start[1]+(end[1]-start[1])*i/10}]});
        await page.waitForTimeout(35);
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await cdp.detach();
}
async function enter() {
    await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
    const button=page.getByRole('button',{name:'进入时安的数字空间',exact:true});await button.focus();await button.press('Enter');
    await page.getByRole('button',{name:'打开地图',exact:true}).waitFor();await page.waitForTimeout(2200);
}
async function controlsFit() {
    for(const name of ['打开地图','声音设置','探索成就']) {
        const box=await page.getByRole('button',{name,exact:true}).boundingBox();
        assert.ok(box&&box.width>=44&&box.height>=44,name+' touch target');
        const size=page.viewportSize();assert.ok(box.x>=0&&box.x+box.width<=size.width&&box.y>=0&&box.y+box.height<=size.height,name+' fits');
    }
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
}
try {
    await page.goto(base+'/',{waitUntil:'domcontentloaded'});
    await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
    assert.ok(!report.requests.some(url=>/ShianWenKai-CJK|cfl_turningpages|szummiasta|szumwiatru|\/(GalleryRoom|StudioRoom|AboutRoom|ContactRoom)-/.test(url)));
    const graphics=await page.evaluate(()=>({dpr:window.__renderer.getPixelRatio(),antialias:window.__renderer.getContext().getContextAttributes().antialias}));
    assert.ok(graphics.dpr<=1);assert.equal(graphics.antialias,false);report.graphics=graphics;
    report.checks.push('constrained Android settings apply before WebGL; initial screen avoids complete CJK font, room scripts, BGM and room ambience');
    await enter();await controlsFit();report.checks.push('390px touch controls are at least 44px and fit viewport');
    const initial=await cameraZ();
    const map=page.getByRole('button',{name:'打开地图',exact:true});await map.focus();await map.press('Space');
    await page.locator('.map-panel.open').waitFor();await page.waitForTimeout(900);
    const closeMap=await page.getByRole('dialog',{name:'地图',exact:true}).getByRole('button',{name:'关闭地图',exact:true}).boundingBox();assert.ok(closeMap.width>=44&&closeMap.height>=44);
    assert.ok(Math.abs(await cameraZ()-initial)<.02);
    await page.keyboard.press('Escape');await page.locator('.map-panel.open').waitFor({state:'hidden'});
    report.checks.push('Space activates focused map without walking; Escape closes it without changing route');
    await drag([195,640],[195,380]);await page.waitForTimeout(1400);
    assert.ok(await cameraZ()<initial-.5);report.checks.push('single-finger drag on canvas walks through the corridor');
    await page.getByRole('button',{name:'声音设置',exact:true}).tap();await page.locator('.audio-panel.open').waitFor();await page.waitForTimeout(500);
    const closeAudio=await page.getByRole('button',{name:'关闭声音设置',exact:true}).boundingBox();assert.ok(closeAudio.width>=44&&closeAudio.height>=44);
    const beforeSlider=await cameraZ(), music=page.getByRole('slider',{name:'背景音乐音量',exact:true}), sfx=page.getByRole('slider',{name:'音效音量',exact:true});
    const box=await music.boundingBox();await drag([box.x+box.width*.25,box.y+box.height/2],[box.x+box.width*.65,box.y+box.height/2]);await page.waitForTimeout(850);
    assert.ok(Math.abs(await cameraZ()-beforeSlider)<.03);
    const selected=Number(await music.inputValue());assert.ok(selected>.4&&selected<.9);
    assert.equal(await page.evaluate(()=>Number(localStorage.getItem('music_volume'))),selected);
    await sfx.focus();await sfx.press('Home');assert.equal(await sfx.inputValue(),'0');
    assert.equal(await page.evaluate(()=>localStorage.getItem('audio_volume')),'0');
    const musicState=await page.evaluate(()=>window.__audio.filter(a=>a.src.includes('cfl_turningpages')).map(a=>({volume:a.volume,paused:a.paused})));
    assert.equal(musicState.length,1);assert.equal(musicState[0].volume,selected);assert.equal(musicState[0].paused,false);
    report.checks.push('native slider touch does not move corridor; music and SFX controls update real audio and persist');
    await page.keyboard.press('Escape');await page.screenshot({path:out+'/touch-corridor.png'});
    await page.reload({waitUntil:'domcontentloaded'});await enter();
    await page.getByRole('button',{name:'声音设置',exact:true}).tap();await page.waitForTimeout(500);
    assert.equal(Number(await music.inputValue()),selected);assert.equal(await sfx.inputValue(),'0');
    assert.equal(await page.evaluate(()=>window.__audio.find(a=>a.src.includes('cfl_turningpages')).volume),selected);
    await page.keyboard.press('Escape');report.checks.push('reload restores both audio volumes, including newly created background music');
    await page.setViewportSize({width:844,height:390});await page.waitForTimeout(600);await controlsFit();
    await page.getByRole('button',{name:'打开地图',exact:true}).tap();await page.waitForTimeout(500);
    const mapBox=await page.locator('.map-panel').boundingBox();assert.ok(mapBox.y>=0&&mapBox.y+mapBox.height<=390);
    await page.screenshot({path:out+'/touch-landscape-map.png'});await page.keyboard.press('Escape');
    report.checks.push('landscape resize keeps controls and map within viewport');
    await page.setViewportSize({width:320,height:568});await page.waitForTimeout(600);await controlsFit();
    await page.getByRole('button',{name:'打开地图',exact:true}).tap();
    await page.getByRole('button',{name:'前往联系我',exact:true}).tap();await page.waitForURL('**/contact');
    await page.locator('.nav-btn.back-btn').waitFor({state:'visible',timeout:30000});await page.waitForTimeout(1800);
    const contact=page.getByRole('button',{name:'查看微信联系方式',exact:true});await contact.focus();await contact.press('Enter');
    await page.locator('.global-overlay-wrapper[aria-hidden="false"]').waitFor({state:'visible'});await page.waitForTimeout(1800);
    const paper=await page.locator('.content-card').boundingBox();assert.ok(paper.x>=0&&paper.x+paper.width<=320&&paper.y>=0&&paper.y+paper.height<=568);
    await page.screenshot({path:out+'/touch-small-contact.png'});
    await page.keyboard.press('Escape');await page.waitForTimeout(1100);assert.ok(page.url().endsWith('/contact'));
    report.checks.push('320×568 screen keeps contact paper readable; closing stays in room');
    await page.locator('.nav-btn.back-btn').tap();await page.waitForURL(base+'/');await page.waitForTimeout(2200);
    report.checks.push('touch return from room restores corridor and route');
    // Corrupt browser storage must not crash audio construction.
    await page.evaluate(()=>{localStorage.setItem('audio_volume','broken');localStorage.setItem('music_volume','Infinity');});
    await page.reload({waitUntil:'domcontentloaded'});await enter();await page.getByRole('button',{name:'声音设置',exact:true}).tap();
    assert.equal(await music.inputValue(),'0.3');assert.equal(await sfx.inputValue(),'0.5');
    report.checks.push('invalid saved audio values recover to safe defaults');
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.localErrors,[]);
    report.checks.push('no runtime exceptions, console errors or local HTTP errors');
    fs.writeFileSync(out+'/touch-inspection.json',JSON.stringify(report,null,2));console.log('Passed '+report.checks.length+' touch/audio checks');
} catch(error) {
    report.failure=error.stack;fs.writeFileSync(out+'/touch-failure-'+Date.now()+'.json',JSON.stringify(report,null,2));
    await page.screenshot({path:out+'/touch-failure.png'});throw error;
} finally {await browser.close();}
