import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-10/preflight/stage-09';
const report = { checks: [], pageErrors: [], consoleErrors: [], failedRequests: [], screenshots: [] };
const screenshot = async (page, name) => {
    await page.screenshot({ path: `${out}/${name}.png` });
    report.screenshots.push(name);
};
const inspect = page => page.evaluate(() => window.__inspect());
const object = (state, name, z) => state.objects.find(o => o.name === name && (z === undefined || Math.abs(o.position[2] - z) < .1));
const near = (a, b, tolerance = .04) => assert.ok(Math.abs(a - b) < tolerance, `${a} must be close to ${b}`);

async function openPage(viewport, mobile = false, reducedMotion = 'no-preference') {
    const page = await browser.newPage({ viewport, hasTouch: mobile, isMobile: mobile, reducedMotion });
    page.on('pageerror', e => report.pageErrors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
    page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText, closing: page.isClosed() }));
    // Observe the real Three.js render without adding a debug API to the application.
    await page.addInitScript(() => {
        window.__THREE_DEVTOOLS__ = new EventTarget();
        window.__THREE_DEVTOOLS__.addEventListener('observe', event => {
            if (!event.detail.isWebGLRenderer) return;
            const renderer = event.detail, render = renderer.render;
            renderer.render = function (scene, camera) {
                window.__scene = scene; window.__camera = camera;
                return render.call(this, scene, camera);
            };
        });
        window.__inspect = () => {
            const scene = window.__scene, camera = window.__camera;
            if (!scene || !camera) return null;
            const V = camera.position.constructor;
            const project = p => { const q = p.clone().project(camera); return [(q.x + 1) * innerWidth / 2, (1 - q.y) * innerHeight / 2]; };
            const objects = [];
            scene.traverse(o => {
                if (!o.name.startsWith('shian-') && o.name !== 'entrance-window') return;
                const world = o.getWorldPosition(new V());
                const b = o.textRenderInfo?.blockBounds;
                const bounds = b ? [project(o.localToWorld(new V(b[0], b[3], 0))), project(o.localToWorld(new V(b[2], b[1], 0)))] : null;
                objects.push({ name: o.name, text: o.text, position: world.toArray(), screen: project(world), bounds,
                    contentId: o.userData.contentId, index: o.userData.index, selected: o.userData.selected, towerRotation: o.parent.rotation.y, facing: new V(0,0,1).transformDirection(o.matrixWorld).dot(camera.position.clone().sub(world).normalize()), rotation: o.rotation.toArray(), corners: o.name.startsWith('shian-project-paper-') ? [[-.75,1,0],[.75,-1,0]].map(a=>project(o.localToWorld(new V(...a)))) : null, frame: o.userData.frame, texture: o.material?.map?.image?.currentSrc });
            });
            return { camera: camera.position.toArray(), objects };
        };
    });
    await page.goto('http://127.0.0.1:5175/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('.preloader').waitFor({ state: 'hidden', timeout: 60000 });
    await page.waitForTimeout(600);
    return page;
}

async function enter(page, keyboard = true) {
    if (keyboard) {
        const button = page.getByRole('button', { name: '进入时安的数字空间', exact: true });
        await button.focus(); await button.press('Enter');
    } else {
        // Project a point on the original left door and click the visible canvas.
        const p = await page.evaluate(() => {
            const c = window.__camera, V = c.position.constructor;
            const p = new V(-.45, -.3, 22.15).project(c);
            return [(p.x + 1) * innerWidth / 2, (1 - p.y) * innerHeight / 2];
        });
        await page.mouse.click(...p);
    }
    await page.getByRole('button', { name: '打开地图', exact: true }).waitFor({ timeout: 25000 });
    const size = page.viewportSize();
    await page.mouse.move(size.width / 2, size.height / 2);
    await page.waitForTimeout(1800);
}


async function studio(page) {
    await enter(page);
    await page.getByRole('button',{name:'打开地图',exact:true}).click();
    await page.getByRole('button',{name:'前往工作室',exact:true}).click();
    await page.waitForURL('**/studio');
    await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});
    await page.waitForTimeout(3500);
}

const {STUDIO_CONTENT}=await import('../src/config/studio-content.js');
const overlay=page=>page.locator('.global-overlay-wrapper[aria-hidden="false"]');
async function close(page,method='button') {
    if(method==='escape') await page.keyboard.press('Escape');
    else if(method==='backdrop') await page.mouse.click(10,page.viewportSize().height/2);
    else await page.locator('.studio-close-btn').click();
    await page.waitForTimeout(1300);
    assert.equal(await overlay(page).count(),0);
}
async function openContent(page,id,mobile) {
    const viewport=page.viewportSize();
    for(let attempt=0;attempt<32;attempt++) {
        const before=await inspect(page);
        const candidates=before.objects.filter(o=>o.contentId===id&&o.screen[0]>35&&o.screen[0]<viewport.width-35&&o.screen[1]>130&&o.screen[1]<viewport.height-115).sort((a,b)=>b.facing-a.facing);
        if(candidates.length) {
            const p=candidates[0].screen;
            if(mobile) await page.touchscreen.tap(...p);else await page.mouse.click(...p);
            await page.waitForTimeout(1700);
            if(await overlay(page).count()) {
                const current=await inspect(page), selected=current.objects.filter(o=>o.selected===true);
                assert.equal(selected.length,1,'only the clicked device is selected');
                if(selected[0].contentId===id) return {before,selected:selected[0]};
                await close(page);
            }
        }
        await page.mouse.move(viewport.width/2,viewport.height/2);
        await page.mouse.wheel(0,130);
        await page.waitForTimeout(500);
    }
    throw new Error('Cannot reach '+id);
}
async function touchDrag(page,start,end) {
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start[0],y:start[1]}]});
    for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start[0]+(end[0]-start[0])*i/12,y:start[1]+(end[1]-start[1])*i/12}]});await page.waitForTimeout(22);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
}
let activePage;
try {
    const layouts=[['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true],['narrow',{width:320,height:844},true]];
    for(const [label,viewport,mobile] of layouts) {
        const page=activePage=await openPage(viewport,mobile);await studio(page);
        assert.equal((await inspect(page)).objects.filter(o=>o.contentId).length,48);
        assert.equal(await page.locator('[aria-label="工作室内容"] h4').count(),4);
        assert.equal(await page.locator('[aria-label="工作室内容"] a').count(),4);
        await screenshot(page,label+'-tower');
        report.checks.push(label+': original tower, 48 devices, 4 real entries and accessible links');
        for(const item of STUDIO_CONTENT) {
            const {before,selected}=await openContent(page,item.id,mobile);
            await page.waitForTimeout(1900);
            assert.equal(await page.locator('#content-card-title').innerText(),item.title);
            assert.equal(await page.locator('.content-card__description').innerText(),item.description);
            const link=page.locator('.studio-action-button');
            assert.equal(await link.getAttribute('href'),item.url);
            assert.equal(await link.getAttribute('target'),'_blank');
            assert.equal(await link.getAttribute('rel'),'noopener noreferrer');
            if(item.date) assert.equal(await overlay(page).locator('time').innerText(),item.date);
            if(item.cover) assert.equal(await overlay(page).locator('img').evaluate(el=>el.complete&&el.naturalWidth>0),true);
            const card=await page.locator('.content-card').boundingBox();
            assert.ok(card.x>=0&&card.x+card.width<=viewport.width&&card.y>=0&&card.y+card.height<=viewport.height,'paper fits viewport '+JSON.stringify(card));
            const focus=await page.evaluate(()=>document.activeElement.className);
            assert.ok(focus.includes('studio-close-btn'),'focus enters close button');
            await page.keyboard.press('Shift+Tab');
            assert.equal(await link.evaluate(el=>el===document.activeElement),true,'focus trapped backwards');
            await page.keyboard.press('Tab');
            assert.equal(await page.locator('.studio-close-btn').evaluate(el=>el===document.activeElement),true);
            await screenshot(page,label+'-detail-'+item.id);
            const frozen=(await inspect(page)).objects.find(o=>o.selected===true);
            await page.locator('.content-card__body').hover();await page.mouse.wheel(0,900);await page.waitForTimeout(250);
            near((await inspect(page)).objects.find(o=>o.selected===true).towerRotation,frozen.towerRotation,.0001);
            await link.scrollIntoViewIfNeeded();
            const action=await link.boundingBox();assert.ok(action.y+action.height<viewport.height,'action remains reachable');
            fs.writeFileSync(out+'/'+label+'-'+item.id+'.json',JSON.stringify({selected,card,action,state:await inspect(page)},null,2));
            await close(page,label==='desktop'?(item.id==='openclaw'?'escape':item.id==='shian-skill-hub'?'backdrop':'button'):'button');
            assert.ok(page.url().endsWith('/studio'),'closing details stays in room');
            const restored=await inspect(page);before.camera.forEach((v,i)=>near(restored.camera[i],v));
            assert.equal(restored.objects.filter(o=>o.selected===true).length,0);
            report.checks.push(label+': '+item.id+' title, summary, cover/date, link, focus, paper scroll, close and camera restoration');
        }
        if(mobile) {
            assert.equal(await page.locator('canvas').first().evaluate(el=>getComputedStyle(el).touchAction),'none');
            const start=(await inspect(page)).objects.find(o=>o.contentId&&o.screen[0]>30&&o.screen[0]<viewport.width-30&&o.screen[1]>200&&o.screen[1]<650);
            await touchDrag(page,start.screen,[start.screen[0]>viewport.width/2?35:viewport.width-35,start.screen[1]+100]);
            await page.waitForTimeout(900);
            assert.ok(page.url().endsWith('/studio'));assert.equal(await overlay(page).count(),0);
            report.checks.push(label+': real touch drag stays in Studio without opening details');
        }
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
        assert.ok(!requests.some(r=>/studioItem|monitorfront_postnafb|phonefront_followme|tvfront_filmik/.test(r)));
        await page.locator('.nav-btn.back-btn').click();await page.waitForURL('http://127.0.0.1:5175/');await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});
        if(label==='desktop') for(const [route,title] of [['gallery','作品展厅'],['about','关于我']]) {
            await page.getByRole('button',{name:'打开地图',exact:true}).click();await page.getByRole('button',{name:'前往'+title,exact:true}).click();
            await page.waitForURL('**/'+route);await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});await page.waitForTimeout(1600);
            await screenshot(page,'regression-'+route);
            await page.locator('.nav-btn.back-btn').click();await page.waitForURL('http://127.0.0.1:5175/');await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});
            report.checks.push(title+': loads and returns after shared data and overlay changes');
        }
        await page.close();console.log(label+' passed');
    }
    assert.equal(report.pageErrors.length,0,'no runtime exceptions');
    console.log('Passed '+report.checks.length+' browser checks');
} catch(e) {report.failure=e.stack;console.error(e);if(activePage&&!activePage.isClosed())await screenshot(activePage,'failure');process.exitCode=1;}
finally {fs.writeFileSync(out+'/browser-inspection.json',JSON.stringify(report,null,2));await browser.close();}
