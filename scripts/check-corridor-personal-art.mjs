import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-features=OverscrollHistoryNavigation', '--overscroll-history-navigation=0'] });
const out = 'docs/planning/materials/corridor-personal-art' + (process.env.SHIAN_SITE_TEST_URL ? '/production' : '');
fs.mkdirSync(out, { recursive: true });
const base = process.env.SHIAN_SITE_TEST_URL || 'http://127.0.0.1:5175';
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
                // Postprocessing also renders offscreen meshes with temporary cameras.
                if (scene?.isScene && camera?.isPerspectiveCamera) {
                    window.__scene = scene; window.__camera = camera;
                }
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
                    inspected: o.userData.inspected, selected: o.userData.selected, reveal: o.material?.userData?.wallArtReveal?.value, dimensions: o.geometry?.parameters ? [o.geometry.parameters.width,o.geometry.parameters.height] : null, rotation: o.rotation.toArray(), corners: o.geometry?.parameters?.width ? [[-o.geometry.parameters.width/2,o.geometry.parameters.height/2,0],[o.geometry.parameters.width/2,-o.geometry.parameters.height/2,0]].map(a=>project(o.localToWorld(new V(...a)))) : null, frame: o.userData.frame, texture: o.material?.map?.image?.currentSrc });
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


const named=(state,name,z)=>state.objects.find(o=>o.name===name&&Math.abs(o.position[2]-z)<.1);
const rect=corners=>({left:Math.min(...corners.map(p=>p[0])),right:Math.max(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),bottom:Math.max(...corners.map(p=>p[1]))});
async function glance(page,dx) {
 const session=await page.context().newCDPSession(page),x=dx<0?330:60,y=600;
 await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=12;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y}]});await page.waitForTimeout(20);}
 await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();await page.waitForTimeout(700);
}
async function countRed(page,mesh) {
 const b=rect(mesh.corners),size=page.viewportSize();
 const left=Math.max(0,Math.floor(b.left)),top=Math.max(0,Math.floor(b.top));
 const width=Math.min(size.width-left,Math.ceil(b.right)-left),height=Math.min(size.height-top,Math.ceil(b.bottom)-top);
 const {data,info}=await sharp(await page.screenshot()).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let red=0;for(let i=0;i<data.length;i+=info.channels)if(data[i]>data[i+1]+18&&data[i]>data[i+2]+18)red++;
 return red;
}
try {
 for(const [label,viewport,mobile] of [['desktop',{width:1440,height:1000},false],['mobile',{width:390,height:844},true]]) {
  if(process.env.SHIAN_TEST_LAYOUT&&label!==process.env.SHIAN_TEST_LAYOUT)continue;
  const page=await openPage(viewport,mobile);await enter(page);
  await page.locator('canvas').click({position:{x:viewport.width/2,y:viewport.height/2}});
  await page.mouse.move(viewport.width/2,viewport.height/2);
  let state=await inspect(page);
  const art=named(state,'shian-corridor-picture-frame-1',0),ink=named(state,'shian-corridor-lifelong-learning',2.9),vent=named(state,'shian-corridor-vent-0',0);
  assert.ok(art&&ink&&vent,'first corridor artwork, lettering and vent mounted');
  assert.ok(art.texture.endsWith('/spider-lilies.webp'));assert.ok(ink.texture.endsWith('/lifelong-learning-repaired.png'));
  assert.ok(ink.position[2]>vent.position[2]&&ink.position[0]<0,'ink before vent on left wall');
  assert.ok(ink.position[1]-ink.dimensions[1]/2> -1.75&&ink.position[1]+ink.dimensions[1]/2<1.75);
  assert.ok(state.objects.some(o=>o.name==='shian-corridor-picture-frame-2'&&o.texture?.endsWith('/ai-first.png')));
  report.checks.push(label+': correct artwork and transparent lettering; original vent and AI First artwork mounted');

  const before=await inspect(page);
  assert.equal(named(before,'shian-corridor-picture-frame-1',0).reveal,0);
  assert.equal(named(before,'shian-corridor-lifelong-learning',2.9).reveal,0);
  assert.ok(art.position[0]>3.48&&Math.abs(ink.position[0])>3.495,'both items close to real wall surface');
  assert.ok(ink.dimensions[1]<2,'calligraphy reduced in size');
  await page.mouse.wheel(0,mobile?-120:146);await page.waitForTimeout(1500);
  if(mobile)await glance(page,-240);
  await page.mouse.move(viewport.width/2,viewport.height/2);await page.waitForTimeout(700);
  state=await inspect(page);
  await screenshot(page,label+'-default-gray');
  let picture=named(state,'shian-corridor-picture-frame-1',0);
  assert.ok(picture.screen[0]>0&&picture.screen[0]<viewport.width,'painting reachable with normal navigation');
  const originalPaintingPosition=picture.position;
  const baselineRed=await countRed(page,picture);
  if(mobile)await page.touchscreen.tap(...picture.screen);else await page.mouse.move(...picture.screen);
  await page.waitForTimeout(800);
  picture=named(await inspect(page),'shian-corridor-picture-frame-1',0);
  assert.ok(picture.reveal>.99,'painting reveals on hover/tap');
  assert.ok(picture.position.every((value,i)=>Math.abs(value-originalPaintingPosition[i])<1e-6),'painting stays against wall');
  const revealedRed=await countRed(page,picture);
  assert.ok(revealedRed>baselineRed+400,'red pigment restored '+JSON.stringify({baselineRed,revealedRed}));
  await screenshot(page,label+'-painting-color');
  if(mobile)await page.touchscreen.tap(...picture.screen);else{await page.mouse.click(...picture.screen);await page.mouse.move(viewport.width/2,viewport.height/2);}
  await page.waitForTimeout(800);
  assert.ok(named(await inspect(page),'shian-corridor-picture-frame-1',0).reveal<.01);
  assert.ok(!(await inspect(page)).objects.some(o=>o.name==='shian-corridor-frame-frame-1'&&o.inspected),'click does not float the painting');
  report.checks.push(label+': pale gray painting restores red then fades; no floating on hover or click');
  if(mobile)await glance(page,240);
  await page.waitForTimeout(700);
  if(!(await inspect(page))) {
    await screenshot(page,label+'-missing-scene');
    report.sceneDiagnostic=await page.evaluate(()=>({url:location.href,scene:window.__scene?.type,camera:window.__camera?.type,body:document.body.innerText,resources:performance.getEntriesByType('navigation').map(n=>({type:n.type,url:n.name}))}));
    throw Error('Scene unavailable: '+JSON.stringify(report.sceneDiagnostic));
  }
  let lettering=named(await inspect(page),'shian-corridor-lifelong-learning',2.9);
  assert.ok(lettering.screen[0]>0&&lettering.screen[0]<viewport.width,'lettering reachable with normal navigation');
  const originalInkPosition=lettering.position;
  if(mobile)await page.touchscreen.tap(...lettering.screen);else await page.mouse.move(...lettering.screen);
  await page.waitForTimeout(800);
  lettering=named(await inspect(page),'shian-corridor-lifelong-learning',2.9);
  assert.ok(lettering.reveal>.99);
  assert.ok(lettering.position.every((value,i)=>Math.abs(value-originalInkPosition[i])<1e-6),'lettering stays against wall');
  await screenshot(page,label+'-calligraphy-ink');
  if(mobile)await page.touchscreen.tap(...lettering.screen);else await page.mouse.move(viewport.width/2,viewport.height/2);
  await page.waitForTimeout(800);
  assert.ok(named(await inspect(page),'shian-corridor-lifelong-learning',2.9).reveal<.01);
  report.checks.push(label+': smaller original glyphs deepen on hover/tap then fade; no floating');
  fs.writeFileSync(out+'/'+label+'-scene.json',JSON.stringify(await inspect(page),null,2));
  const requests=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name));
  assert.ok(!requests.some(r=>r.includes('/rysuneknaobraz1.webp')));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  report.checks.push(label+': old chibi asset absent; walk and viewport work');
  await page.close();console.log('PASS '+label);
 }
 assert.equal(report.pageErrors.length,0);assert.equal(report.consoleErrors.length,0);
}catch(e){report.failure=e.stack;throw e;}
finally{fs.writeFileSync(out+'/browser-inspection.json',JSON.stringify(report,null,2));await browser.close();}
