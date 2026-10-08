import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { ABOUT_PROFILE, ABOUT_INTRO_DETAIL } from '../src/config/about-profile.js';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-10';
const report = { checks: [], pageErrors: [], consoleErrors: [], failedRequests: [], localErrors: [], screenshots: [] };
const inspect = page => page.evaluate(() => window.__inspect());
const shot = async (page, name) => { await page.screenshot({ path: `${out}/${name}.png` }); report.screenshots.push(name); };
const overlay = page => page.locator('.global-overlay-wrapper[aria-hidden="false"]');
const near = (a,b) => assert.ok(Math.abs(a-b)<.015, `${a} ~= ${b}`);
const progress = async page => (await inspect(page)).objects.find(o=>o.name==='shian-about-room').data.scrollProgress;
const nearest = (state,name) => state.objects.filter(o=>o.name===name&&o.visible&&o.position[2]<state.camera[2]).sort((a,b)=>b.position[2]-a.position[2])[0];

async function open(viewport, mobile) {
    const page = await browser.newPage({ viewport, isMobile:mobile, hasTouch:mobile });
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
                objects.push({name:o.name,text:o.text,position:world.toArray(),screen:project(world),visible,data:o.userData,
                    bounds:b?[[b[0],b[3]],[b[2],b[1]]].map(p=>project(o.localToWorld(new V(...p,0)))):null,
                    texture:o.material?.map?.image?.currentSrc});
            });
            return{camera:camera.position.toArray(),rotation:camera.rotation.toArray(),objects};
        };
    });
    await page.goto('http://127.0.0.1:5175/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
    const enter=page.getByRole('button',{name:'进入时安的数字空间',exact:true});await enter.focus();await enter.press('Enter');
    await page.getByRole('button',{name:'打开地图',exact:true}).waitFor({timeout:30000});await page.waitForTimeout(1800);
    await page.getByRole('button',{name:'打开地图',exact:true}).click();await page.getByRole('button',{name:'前往关于我',exact:true}).click();
    await page.waitForURL('**/about');await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});await page.waitForTimeout(3800);
    return page;
}
async function flyTo(page,target) {
    const v=page.viewportSize();await page.mouse.move(v.width/2,v.height*.65);
    for(let i=0;i<8;i++) {
        const p=await progress(page);if(Math.abs(p-target)<.7)return;
        await page.mouse.wheel(0,Math.max(-700,Math.min(700,(target-p)*25)));
        await page.waitForTimeout(2700);
    }
    assert.ok(Math.abs(await progress(page)-target)<1.2,'flight target reached');
}
async function touchDrag(page,start,end) {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start[0],y:start[1]}]});
    for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start[0]+(end[0]-start[0])*i/10,y:start[1]+(end[1]-start[1])*i/10}]});await page.waitForTimeout(25);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}
let active;
try {
    const layouts=process.env.SHIAN_LAYOUT==='desktop'?[['desktop',{width:1440,height:1000},false]]:[['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true],['narrow',{width:320,height:844},true]];
    for(const[label,viewport,mobile]of layouts){
        const page=active=await open(viewport,mobile);
        await shot(page,label+'-intro');
        const initial=await inspect(page);fs.writeFileSync(`${out}/${label}-intro.json`,JSON.stringify(initial,null,2));
        const identities=nearest(initial,'shian-about-identities');assert.equal(identities.text,ABOUT_PROFILE.identities.join(' · '));
        assert.ok(identities.bounds.every(p=>p[0]>0&&p[0]<viewport.width),'identities fit');
        for(const role of ABOUT_PROFILE.communityRoles)assert.ok((await page.locator('[aria-label="关于我内容"]').innerText()).includes(role));
        report.checks.push(label+': approved avatar, exact three identities and complete accessible community roles');
        const button=nearest(initial,'shian-about-read-intro');
        if(mobile)await page.touchscreen.tap(...button.screen);else await page.mouse.click(...button.screen);
        await overlay(page).waitFor({state:'visible',timeout:5000});await page.waitForTimeout(900);
        assert.equal(await page.locator('#content-card-title').innerText(),'关于时安');
        // The original paper animates its text; verify the completed text, not an intermediate frame.
        await page.waitForFunction(expected => document.querySelector('.content-card__description')?.textContent === expected, ABOUT_INTRO_DETAIL.description, {timeout:15000});
        const description=await page.locator('.content-card__description').innerText();
        for(const p of ABOUT_PROFILE.paragraphs)assert.ok(description.includes(p));
        for(const name of [...ABOUT_PROFILE.qualifications.map(item=>item.name), ...ABOUT_PROFILE.honors.map(item=>item.name), ...ABOUT_PROFILE.communityRoles])assert.equal(description.split(name).length-1,1,'identity appears once in introduction: '+name);
        const freeze=await inspect(page),frozenProgress=await progress(page);
        await page.locator('.content-card__body').hover();await page.mouse.wheel(0,900);await page.waitForTimeout(350);
        if(mobile)await touchDrag(page,[viewport.width/2,540],[viewport.width/2,340]);
        near(await progress(page),frozenProgress);(await inspect(page)).rotation.slice(0,3).forEach((v,i)=>near(v,freeze.rotation[i]));
        await shot(page,label+'-introduction-detail');
        await page.keyboard.press('Escape');await page.waitForTimeout(1300);assert.equal(await overlay(page).count(),0);assert.ok(page.url().endsWith('/about'));
        report.checks.push(label+': canvas opens full introduction; wheel/touch in paper freezes flight; Escape stays in About');
        for(const[section,target]of[['qualifications',40],['practices',80],['interests',120]]){
            await flyTo(page,target);await shot(page,label+'-'+section);fs.writeFileSync(`${out}/${label}-${section}.json`,JSON.stringify(await inspect(page),null,2));
        }
        let state=await inspect(page);
        const labels=state.objects.filter(o=>o.name.startsWith('shian-about-interest-label-')&&o.visible&&o.position[2]<state.camera[2]);
        assert.deepEqual([...new Set(labels.map(o=>o.text))].sort(),ABOUT_PROFILE.interests.slice().sort());
        const balloon=nearest(state,'shian-about-interest-label-0');if(mobile)await page.touchscreen.tap(...balloon.screen);else await page.mouse.click(...balloon.screen);
        await page.waitForTimeout(250);assert.equal(nearest(await inspect(page),'shian-about-interest-0').data.popped,true);
        await shot(page,label+'-balloon-pop');await page.waitForTimeout(3750);assert.equal(nearest(await inspect(page),'shian-about-interest-0').data.popped,false);
        report.checks.push(label+': two qualification papers, community islands, seven balloons; tap pops and restores');
        if(mobile){const before=await progress(page);await touchDrag(page,[viewport.width/2,600],[viewport.width/2,480]);await page.waitForTimeout(1200);assert.ok(await progress(page)>before+1);assert.equal(await overlay(page).count(),0);report.checks.push(label+': real touch flies without opening introduction');}
        if(!mobile){await flyTo(page,170);await shot(page,'desktop-cycle-repeat');await flyTo(page,-10);assert.ok((await inspect(page)).objects.some(o=>o.name==='shian-about-cycle--1'));report.checks.push('forward and backward flight recycles original infinite sky');}
        const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));assert.ok(!requests.some(r=>/sanity\.io|uowyspa|freelancewyspa|awatarnachmurce|reactduzybalon/.test(r)),'old author content is not loaded');
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        await page.locator('.nav-btn.back-btn').click();await page.waitForURL('http://127.0.0.1:5175/');await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});await page.waitForTimeout(1600);
        const corridor=await inspect(page);await page.mouse.wheel(0,500);await page.waitForTimeout(500);near((await inspect(page)).rotation[2],corridor.rotation[2]);
        report.checks.push(label+': no old CMS/author resources, no horizontal overflow, clean exit camera');
        await page.close();console.log(label+' passed');
    }
    assert.equal(report.pageErrors.length,0);assert.equal(report.localErrors.length,0);console.log('Passed '+report.checks.length+' About checks');
}catch(e){report.failure=e.stack;console.error(e);if(active&&!active.isClosed())await shot(active,'failure');process.exitCode=1;}
finally{fs.writeFileSync(out+'/browser-inspection.json',JSON.stringify(report,null,2));await browser.close();}
