import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME,'package.json'));
const browser=await require('playwright').chromium.launch({channel:'msedge',headless:true});
const base=process.env.SHIAN_SITE_TEST_URL||'http://127.0.0.1:5176';
const out='docs/planning/materials/stage-13';
const report={checks:[],normalErrors:[],expectedFailedRequests:[]};let active;
async function enter(page) {
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
    const entry=page.getByRole('button',{name:'进入时安的数字空间',exact:true});await entry.focus();await entry.press('Enter');
    await page.getByRole('button',{name:'打开地图',exact:true}).waitFor();await page.waitForTimeout(1800);
}
try {
    const slow=active=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    slow.on('pageerror',error=>report.normalErrors.push(error.message));
    const cdp=await slow.context().newCDPSession(slow);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:10_000_000/8,uploadThroughput:1_000_000/8});
    const started=Date.now();await enter(slow);report.throttledEntryMs=Date.now()-started;
    report.checks.push('cold touch viewport remains usable with 4× CPU slowdown, 100ms latency and 10Mbps download');
    let requested;
    const chunkRequested=new Promise(resolve=>requested=resolve);
    await slow.route('**/GalleryRoom-*.js',async route=>{requested();await new Promise(resolve=>setTimeout(resolve,12000));await route.continue();});
    await slow.getByRole('button',{name:'打开地图',exact:true}).click();await slow.getByRole('button',{name:'前往作品展厅',exact:true}).click();
    await chunkRequested;await slow.waitForTimeout(9000);
    assert.equal(await slow.locator('.nav-btn.back-btn').count(),0);
    assert.equal(await slow.getByRole('status').filter({hasText:'正在加载房间…'}).isVisible(),true);
    await slow.screenshot({path:out+'/slow-room-loading.png'});
    await slow.waitForURL('**/gallery',{timeout:45000});await slow.locator('.nav-btn.back-btn').waitFor({state:'visible'});await slow.waitForTimeout(2300);
    assert.equal(await slow.getByRole('status').filter({hasText:'正在加载房间…'}).count(),0);
    assert.ok((await slow.getByLabel('作品展厅内容',{exact:true}).innerText()).includes('openGEO'));
    report.checks.push('a room script delayed 12 seconds keeps the Chinese loading paper beyond the old eight-second timeout; enters after resources resolve');
    await slow.locator('.nav-btn.back-btn').click();await slow.waitForURL(base+'/');await slow.close();
    // Test the actual production chunk error, without rewriting application logic.
    const failure=active=await browser.newPage({viewport:{width:390,height:844}});
    await failure.addInitScript(()=>{
        window.__testAudio=[];const NativeAudio=window.Audio;
        window.Audio=function(...args){const audio=new NativeAudio(...args);window.__testAudio.push(audio);return audio;};
    });
    failure.on('requestfailed',r=>report.expectedFailedRequests.push(r.url()));
    await failure.route('**/GalleryRoom-*.js',route=>route.abort('failed'));
    await enter(failure);await failure.getByRole('button',{name:'打开地图',exact:true}).click();await failure.getByRole('button',{name:'前往作品展厅',exact:true}).click();
    await failure.getByRole('heading',{name:'三维场景暂时无法加载',exact:true}).waitFor({timeout:30000});
    assert.equal(await failure.getByRole('link',{name:'打开简洁入口',exact:true}).getAttribute('href'),'/start');
    assert.ok(await failure.getByRole('button',{name:'重新加载',exact:true}).isVisible());
    assert.equal(await failure.evaluate(()=>window.__testAudio.find(audio=>audio.src.includes('cfl_turningpages')).paused),true);
    await failure.screenshot({path:out+'/failed-room-recovery.png'});
    await failure.getByRole('link',{name:'打开简洁入口',exact:true}).click();await failure.waitForURL('**/start');
    assert.ok(await failure.getByRole('heading',{name:'SHIAN',exact:true}).isVisible());
    report.checks.push('failed room download shows Chinese recovery controls; its simple entry is usable');
    assert.deepEqual(report.normalErrors,[]);
    fs.writeFileSync(out+'/loading-inspection.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){report.failure=error.stack;fs.writeFileSync(out+'/loading-failure-'+Date.now()+'.json',JSON.stringify(report,null,2));if(active&&!active.isClosed())await active.screenshot({path:out+'/loading-failure.png'});throw error;}
finally{await browser.close();}
