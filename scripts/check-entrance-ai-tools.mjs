import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/entrance-ai-tools' + (process.env.SHIAN_SITE_TEST_URL ? '/production' : '');
fs.mkdirSync(out, { recursive: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5175';
const baseline = process.env.SHIAN_ENTRANCE_BASELINE === '1';
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
                    visible: o.visible, progress: o.material?.uProgress, selected: o.userData.selected, rotation: o.rotation.toArray(), corners: o.name.startsWith('shian-project-paper-') ? [[-.75,1,0],[.75,-1,0]].map(a=>project(o.localToWorld(new V(...a)))) : null, frame: o.userData.frame, texture: o.material?.map?.image?.currentSrc });
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


try {
    const layouts=baseline?[['desktop',{width:1440,height:1000},false]]:[['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true],['narrow',{width:320,height:844},true]];
    for(const [label,viewport,mobile] of layouts) {
        const page=await openPage(viewport,mobile);
        await page.mouse.move(1,1);
        await page.waitForTimeout(800);
        await screenshot(page,(baseline?'before-':'')+label+'-sketch');
        if(!baseline) {
            const state=await inspect(page);
            const doors=state.objects.filter(o=>/^shian-entrance-door-(left|right)-sketch$/.test(o.name));
            assert.equal(doors.length,2);
            for(const door of doors) {
                assert.ok(door.texture?.includes('/textures/shian/entrance/door_'));
                assert.equal(door.progress,0);
                assert.ok(door.screen[0]>0&&door.screen[0]<viewport.width);
            }
            const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
            assert.ok(!requests.some(url=>/\/textures\/doors\/door_(left|right)_(sketch|painted)\.webp/.test(url)));
            fs.writeFileSync(out+'/'+label+'-scene.json',JSON.stringify(state,null,2));
            report.checks.push(label+': two new sketch door textures displayed; old entrance logos absent');
        }
        if(!mobile) {
            const point=await page.evaluate(()=>{const c=window.__camera,V=c.position.constructor,p=new V(-.45,-.3,22.15).project(c);return[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2];});
            await page.mouse.move(...point);
            await page.waitForTimeout(1200);
            await screenshot(page,(baseline?'before-':'')+label+'-painted');
            if(!baseline) await page.screenshot({path:out+'/desktop-door-detail.png',clip:{x:565,y:406,width:309,height:389}});
            if(!baseline) {
                const state=await inspect(page);
                assert.ok(state.objects.find(o=>o.name==='shian-entrance-door-left-sketch').progress>.99);
                assert.ok(state.objects.find(o=>o.name==='shian-entrance-door-right-sketch').progress>.99);
                assert.equal(state.objects.filter(o=>/^shian-entrance-door-(left|right)-painted$/.test(o.name)).length,2);
                await page.mouse.move(1,1);await page.waitForTimeout(700);
                assert.ok((await inspect(page)).objects.find(o=>o.name==='shian-entrance-door-left-sketch').progress<.01);
                report.checks.push('desktop: hover paints both doors; pointer leave restores sketch');
            }
        }
        if(!baseline) {
            if(mobile) {
                const point=(await inspect(page)).objects.find(o=>o.name==='shian-entrance-door-left-sketch').screen;
                await page.touchscreen.tap(...point);
                await page.getByRole('button',{name:'打开地图',exact:true}).waitFor({timeout:25000});
            }else await enter(page);
            await page.waitForTimeout(1500);
            await screenshot(page,label+'-entered');
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
            report.checks.push(label+': open doors and enter corridor; viewport fits');
        }
        await page.close();console.log('PASS '+label+(baseline?' baseline':''));
    }
    assert.equal(report.pageErrors.length,0);assert.equal(report.consoleErrors.length,0);
} catch(e) {report.failure=e.stack;throw e;}
finally {fs.writeFileSync(out+'/'+(baseline?'before-inspection':'browser-inspection')+'.json',JSON.stringify(report,null,2));await browser.close();}
