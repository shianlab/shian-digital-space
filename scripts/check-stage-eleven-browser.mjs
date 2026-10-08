import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { CONTACT_CHANNELS } from '../src/config/contact-channels.js';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-11';
const report = { checks: [], pageErrors: [], consoleErrors: [], failedRequests: [], localErrors: [], screenshots: [] };
const inspect = page => page.evaluate(() => window.__inspect());
const shot = async (page, name) => { await page.screenshot({ path: `${out}/${name}.png` }); report.screenshots.push(name); };
const overlay = page => page.locator('.global-overlay-wrapper[aria-hidden="false"]');
const near = (a,b) => assert.ok(Math.abs(a-b)<.015, `${a} ~= ${b}`);

async function open(viewport, mobile) {
    const page = await browser.newPage({ viewport, isMobile:mobile, hasTouch:mobile });
    await page.context().grantPermissions(['clipboard-read','clipboard-write'],{origin:'http://127.0.0.1:5175'});
    page.on('pageerror',e=>report.pageErrors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
    page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
    page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:5175/')&&r.status()>=400)report.localErrors.push({url:r.url(),status:r.status()});});
    await page.addInitScript(()=>{
        window.__THREE_DEVTOOLS__ = new EventTarget();
        window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
            if(!e.detail.isWebGLRenderer)return;
            const renderer=e.detail,render=renderer.render;
            renderer.render=function(scene,camera){window.__scene=scene;window.__camera=camera;return render.call(this,scene,camera);};
        });
        window.__inspect=()=>{
            const scene=window.__scene,camera=window.__camera;if(!scene||!camera)return null;
            const V=camera.position.constructor, project=p=>{const q=p.clone().project(camera);return[(q.x+1)*innerWidth/2,(1-q.y)*innerHeight/2];};
            const objects=[];
            scene.traverse(o=>{
                if(!o.name.startsWith('shian-'))return;
                const world=o.getWorldPosition(new V()),b=o.textRenderInfo?.blockBounds;
                let visible=true;for(let p=o;p;p=p.parent)if(!p.visible)visible=false;
                const skin=o.name.startsWith('shian-contact-barrel-')?o.children.find(child=>child.geometry?.parameters?.width):null;
                const corners=skin?[[-skin.geometry.parameters.width/2,skin.geometry.parameters.height/2],[skin.geometry.parameters.width/2,-skin.geometry.parameters.height/2]].map(p=>project(skin.localToWorld(new V(...p,0)))):null;
                objects.push({name:o.name,text:o.text,position:world.toArray(),screen:project(world),visible,data:o.userData,
                    bounds:b?[[b[0],b[3]],[b[2],b[1]]].map(p=>project(o.localToWorld(new V(...p,0)))):null,
                    texture:o.material?.map?.image?.currentSrc,corners});
            });
            return{camera:camera.position.toArray(),rotation:camera.rotation.toArray(),objects};
        };
    });
    await page.goto('http://127.0.0.1:5175/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
    const enter=page.getByRole('button',{name:'进入时安的数字空间',exact:true});await enter.focus();await enter.press('Enter');
    await page.getByRole('button',{name:'打开地图',exact:true}).waitFor({timeout:30000});await page.waitForTimeout(1800);
    await page.getByRole('button',{name:'打开地图',exact:true}).click();await page.getByRole('button',{name:'前往联系我',exact:true}).click();
    await page.waitForURL('**/contact');await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});await page.waitForTimeout(3800);
    return page;
}
async function touchDrag(page,start,end) {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start[0],y:start[1]}]});
    for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start[0]+(end[0]-start[0])*i/10,y:start[1]+(end[1]-start[1])*i/10}]});await page.waitForTimeout(25);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}
let active;
try {
    const layouts=[['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true],['narrow',{width:320,height:844},true]].filter(layout=>process.env.SHIAN_CONTACT_LAYOUT!=='phones'||layout[2]);
    for(const[label,viewport,mobile]of layouts){
        const page=active=await open(viewport,mobile);
        const activatedExternal=[];
        page.context().on('request',request=>{if(request.isNavigationRequest()&&request.url().startsWith('https://'))activatedExternal.push(request.url());});
        await page.context().route(/^https:\/\/.*/,route=>{
            if(route.request().isNavigationRequest())return route.fulfill({status:200,contentType:'text/html',body:'<title>Verified external link activation</title>'});
            return route.continue();
        });
        await page.evaluate(()=>{
            window.__activatedMail=[];
            document.addEventListener('click',e=>{const a=e.target.closest('a[href^="mailto:"]');if(a){e.preventDefault();window.__activatedMail.push(a.href);}},true);
        });
        const initial=await inspect(page);
        fs.writeFileSync(`${out}/${label}-sea.json`,JSON.stringify(initial,null,2));await shot(page,label+'-sea');
        assert.equal(initial.objects.filter(o=>o.name.startsWith('shian-contact-barrel-')&&o.visible).length,CONTACT_CHANNELS.length);
        if(mobile)assert.ok(initial.objects.filter(o=>o.name.startsWith('shian-contact-barrel-')&&o.visible).every(o=>o.corners.every(p=>p[0]>=0&&p[0]<=viewport.width&&p[1]>80&&p[1]<viewport.height)),'complete barrel planes fit phone viewport');
        assert.ok(initial.objects.some(o=>o.name==='shian-contact-dock')&&initial.objects.some(o=>o.name==='shian-contact-lighthouse')&&initial.objects.some(o=>o.name==='shian-contact-ship'));
        assert.equal(await page.locator('[aria-label="联系我内容"] button').count(),CONTACT_CHANNELS.length);
        report.checks.push(label+': original sea, dock, lighthouse, ship and six real account barrels');
        for(const item of CONTACT_CHANNELS){
            const before=await inspect(page);
            const labelObject=before.objects.find(o=>o.name===`shian-contact-label-${item.id}`&&o.visible&&o.screen[0]>5&&o.screen[0]<viewport.width-5&&o.screen[1]>80&&o.screen[1]<viewport.height-60);
            assert.ok(labelObject,'visible clickable barrel '+item.id);
            assert.ok(labelObject.bounds.every(p=>p[0]>0&&p[0]<viewport.width),'barrel label fits screen '+item.id);
            if(mobile)await page.touchscreen.tap(...labelObject.screen);else await page.mouse.click(...labelObject.screen);
            await overlay(page).waitFor({state:'visible',timeout:5000});await page.waitForTimeout(1600);
            assert.equal(await page.locator('#content-card-title').innerText(),item.title);
            assert.equal(await page.getByLabel(`${item.label}账号`,{exact:true}).innerText(),item.account);
            const box=await page.locator('.content-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=viewport.width&&box.y>=0&&box.y+box.height<=viewport.height);
            assert.ok((await page.evaluate(()=>document.activeElement.className)).includes('studio-close-btn'));
            if(item.copyValue){
                await page.getByRole('button',{name:item.copyLabel,exact:true}).click();await page.getByRole('status').filter({hasText:'已复制。'}).waitFor();
                assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),item.copyValue);
            }
            if(item.url){
                const link=overlay(page).getByRole('link',{name:new RegExp(item.actionLabel)});
                assert.equal(await link.getAttribute('href'),item.url);
                if(item.id==='email'){
                    assert.equal(await link.getAttribute('target'),null);await link.click();assert.deepEqual(await page.evaluate(()=>window.__activatedMail),['mailto:shianlab.ai@gmail.com']);
                }else{
                    assert.equal(await link.getAttribute('target'),'_blank');assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
                    const popupWait=page.waitForEvent('popup');await link.click();const popup=await popupWait;
                    await popup.waitForTimeout(300);assert.ok(activatedExternal.includes(item.url),'click requests the verified original URL');await popup.close();
                }
            }
            if(item.id==='wechat'&&!mobile){
                await page.evaluate(()=>{window.__writeClipboard=navigator.clipboard.writeText.bind(navigator.clipboard);navigator.clipboard.writeText=async()=>{throw new DOMException('Test denied','NotAllowedError');};});
                await page.getByRole('button',{name:item.copyLabel,exact:true}).click();await page.getByRole('status').filter({hasText:'复制未成功'}).waitFor();
                assert.equal(await page.evaluate(()=>window.getSelection().toString()),item.copyValue);
                assert.equal(await page.getByRole('status').filter({hasText:'已复制。'}).count(),0);
                await page.evaluate(()=>{navigator.clipboard.writeText=window.__writeClipboard;});report.checks.push('clipboard denial selects the real account and gives manual-copy guidance');
            }
            await shot(page,label+'-'+item.id+'-detail');
            await page.keyboard.press('Escape');await page.waitForTimeout(1300);assert.equal(await overlay(page).count(),0);assert.ok(page.url().endsWith('/contact'));
            const after=await inspect(page);before.camera.forEach((v,i)=>near(v,after.camera[i]));before.rotation.slice(0,3).forEach((v,i)=>near(v,after.rotation[i]));
            report.checks.push(label+': '+item.id+' barrel opens the correct readable paper; real copy/mail/external activation; closes in room');
        }
        if(mobile){
            const target=(await inspect(page)).objects.find(o=>o.name==='shian-contact-label-wechat'&&o.visible);
            await touchDrag(page,target.screen,[target.screen[0],target.screen[1]-80]);await page.waitForTimeout(350);assert.equal(await overlay(page).count(),0);
            report.checks.push(label+': swiping a barrel does not accidentally open its paper');
        }
        const accessible=page.getByRole('button',{name:'查看微信联系方式',exact:true});await accessible.focus();await accessible.press('Enter');await overlay(page).waitFor({state:'visible'});
        await page.locator('.studio-close-btn').click();await page.waitForTimeout(1300);report.checks.push(label+': keyboard opens and closes the same contact details');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        assert.equal(await page.locator('[aria-label="联系我内容"] img').count(),0,'no QR codes');
        const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));assert.ok(!resources.some(r=>/ITomPoland|tomszma12|paper_form\.webp|send_button\.webp/.test(r)));
        await page.locator('.nav-btn.back-btn').click();await page.waitForURL('http://127.0.0.1:5175/');await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});await page.waitForTimeout(1500);
        report.checks.push(label+': no horizontal overflow or QR; original author and inactive form are absent; exits cleanly');
        if(!mobile){
            for(const[route,name]of[['about','关于我'],['gallery','作品展厅'],['studio','工作室']]){
                await page.getByRole('button',{name:'打开地图',exact:true}).click();await page.getByRole('button',{name:'前往'+name,exact:true}).click();await page.waitForURL('**/'+route);await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});await page.waitForTimeout(1600);
                await shot(page,'regression-'+route);await page.locator('.nav-btn.back-btn').click();await page.waitForURL('http://127.0.0.1:5175/');await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});
                report.checks.push(name+': loads and returns after contact integration');
            }
        }
        await page.close();console.log(label+' passed');
    }
    assert.equal(report.pageErrors.length,0);assert.equal(report.localErrors.length,0);console.log('Passed '+report.checks.length+' Contact checks');
}catch(e){report.failure=e.stack;console.error(e);if(active&&!active.isClosed())await shot(active,'failure');process.exitCode=1;}
finally{fs.writeFileSync(out+(process.env.SHIAN_CONTACT_LAYOUT==='phones'?'/mobile-final-inspection.json':'/browser-inspection.json'),JSON.stringify(report,null,2));await browser.close();}
