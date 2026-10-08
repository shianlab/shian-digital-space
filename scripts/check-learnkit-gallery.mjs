import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/learnkit';
fs.mkdirSync(out, { recursive: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5176';
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
                if (!o.name.startsWith('shian-') && o.name !== 'entrance-window' && !o.textRenderInfo) return;
                const world = o.getWorldPosition(new V());
                const b = o.textRenderInfo?.blockBounds;
                const bounds = b ? [project(o.localToWorld(new V(b[0], b[3], 0))), project(o.localToWorld(new V(b[2], b[1], 0)))] : null;
                objects.push({ name: o.name, text: o.text, position: world.toArray(), screen: project(world), bounds,
                    selected: o.userData.selected, rotation: o.rotation.toArray(), corners: o.name.startsWith('shian-project-paper-') ? [[-.75,1,0],[.75,-1,0]].map(a=>project(o.localToWorld(new V(...a)))) : null, frame: o.userData.frame, texture: o.material?.map?.image?.currentSrc });
            });
            return { camera: camera.position.toArray(), objects };
        };
    });
    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
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

const ids=['shian-digital-space','opengeo','shian-font-workbench','learnkit'];
const urls={opengeo:'https://github.com/shianlab/OpenGEO',learnkit:'https://github.com/shianlab/learnkit'};
const center = (state,id) => state.objects.find(o=>o.name==='shian-project-paper-'+id);
const rect = corners => ({left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),bottom:Math.max(...corners.map(p=>p[1]))});
async function tap(page, point, mobile) { if(mobile) await page.touchscreen.tap(...point); else await page.mouse.click(...point); }
async function swipe(page, dx) {
    const session=await page.context().newCDPSession(page);
    const x=dx>0?60:300, y=560;
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=12;i++) { await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y}]}); await page.waitForTimeout(22); }
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await session.detach();
}
try {
    for (const [label, viewport, mobile] of [['desktop', {width:1440,height:1000}, false], ['mobile', {width:390,height:844}, true], ['narrow', {width:320,height:844}, true]]) {
        const page=await openPage(viewport,mobile);
        await page.evaluate(()=>{window.__links=[];window.open=(...args)=>{window.__links.push(args);return null;};});
        await enter(page);
        await page.getByRole('button',{name:'打开地图',exact:true}).click();
        await page.getByRole('button',{name:'前往作品展厅',exact:true}).click();
        await page.waitForURL('**/gallery');
        await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});
        await page.waitForTimeout(3500);
        const initial=await inspect(page);
        assert.equal(initial.objects.filter(o=>o.selected!==undefined).length,4);
        await screenshot(page,label+'-cards');
        // Move to the first actual project using the visitor's scroll gesture.
        if(mobile){await swipe(page,240);await swipe(page,240);}else await page.mouse.wheel(0,-600);
        await page.waitForTimeout(1600);
        report.checks.push(label+': four unique paper cards and scroll/drag');
        for(let i=0;i<ids.length;i++) {
            const id=ids[i];
            if(i>0){if(mobile){await swipe(page,-240);await swipe(page,-90);}else await page.mouse.wheel(0,500);await page.waitForTimeout(1500);}
            const before=await inspect(page), card=center(before,id);
            assert.ok(card.screen[0]>0&&card.screen[0]<viewport.width,'card reachable '+label+id);
            if(id==='learnkit') await screenshot(page,label+'-learnkit-cover');
            await tap(page,card.screen,mobile);
            await page.waitForTimeout(2800);
            const state=await inspect(page);
            assert.ok(state.objects.find(o=>o.name==='shian-project-'+id).selected,'flip selects '+id);
            const paper=rect(center(state,id).corners);
            const desc=rect(state.objects.find(o=>o.name==='shian-project-description-'+id).bounds);
            assert.ok(paper.left>=4&&paper.right<=viewport.width-4,'paper fits '+JSON.stringify(paper));
            assert.ok(paper.top>70&&paper.bottom<viewport.height-10,'paper fits vertically');
            assert.ok(desc.left>paper.left&&desc.right<paper.right,'Chinese wrapping inside paper '+JSON.stringify(desc));
            assert.ok(desc.top>paper.top&&desc.bottom<paper.top+(paper.bottom-paper.top)*.51,'description fits upper frame '+JSON.stringify(desc));
            if(id==='learnkit') {
                const ts=state.objects.find(o=>o.text==='TypeScript');
                const bounds=rect(ts.bounds);
                assert.ok((bounds.bottom-bounds.top)<(paper.bottom-paper.top)*.035,'TypeScript fits on one line');
            }
            await screenshot(page,label+'-details-'+id);
            fs.writeFileSync(out+'/'+label+'-details-'+id+'.json',JSON.stringify({paper,desc,state},null,2));
            const action=state.objects.find(o=>o.name==='shian-project-action-'+id);
            await tap(page,action.screen,mobile);
            if(urls[id]) {
                const links=await page.evaluate(()=>window.__links);
                assert.deepEqual(links.at(-1),[urls[id],'_blank','noopener,noreferrer']);
                assert.equal(links.length,id==='opengeo'?1:2);
                await tap(page,center(state,id).screen,mobile);
            }
            await page.waitForTimeout(1100);
            assert.equal((await inspect(page)).objects.find(o=>o.name==='shian-project-'+id).selected,false);
            report.checks.push(label+': '+id+' readable flip, bounded text, correct action and close');
        }
        assert.equal(await page.locator('[aria-label="作品展厅内容"] h4').count(),4);
        assert.equal(await page.locator('[aria-label="作品展厅内容"] a').count(),2);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
        const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
        assert.ok(!requests.some(r=>/monetuneprzod|timberkittyprzod|youngmultiprzod|bioprzod|galleryProject/.test(r)));
        await page.locator('.nav-btn.back-btn').click(); await page.waitForURL(base + '/');
        await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});
        if(label==='desktop') for(const [route,title] of [['studio','工作室'],['about','关于我']]) {
            await page.getByRole('button',{name:'打开地图',exact:true}).click();
            await page.getByRole('button',{name:'前往'+title,exact:true}).click();
            await page.waitForURL('**/'+route); await page.locator('.nav-btn.back-btn').waitFor({state:'visible'});await page.waitForTimeout(1500);
            await screenshot(page,'regression-'+route);
            await page.locator('.nav-btn.back-btn').click();await page.waitForURL(base + '/');await page.locator('.nav-btn.back-btn').waitFor({state:'hidden'});
            report.checks.push(title+': unchanged cache consumers still load and return');
        }
        report.checks.push(label+': accessible content matches, old project textures absent, return works');
        await page.close();console.log('PASS '+label);
    }
    assert.equal(report.pageErrors.length,0);
    assert.equal(report.consoleErrors.length,0);
    const errors=report.failedRequests.filter(r=>!r.closing && !r.error?.includes('ERR_ABORTED'));
    assert.equal(errors.length,0,JSON.stringify(errors));
} catch(e) {report.failure=e.stack;throw e;}
finally {fs.writeFileSync(out+'/browser-inspection.json',JSON.stringify(report,null,2));await browser.close();}
