import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({ channel: 'msedge', headless: true });
const out = 'docs/planning/materials/stage-07';
try {
    for (const [label, viewport, mobile] of [['desktop',{width:1440,height:1000},false], ['mobile',{width:390,height:844},true]]) {
        const page = await browser.newPage({viewport,hasTouch:mobile,isMobile:mobile});
        await page.addInitScript(() => {
            window.__THREE_DEVTOOLS__ = new EventTarget();
            window.__THREE_DEVTOOLS__.addEventListener('observe', event => {
                if (!event.detail.isWebGLRenderer) return;
                const renderer=event.detail, render=renderer.render;
                renderer.render=function(scene,camera){window.__scene=scene;window.__camera=camera;return render.call(this,scene,camera);};
            });
            window.__inspect = () => {
                const scene=window.__scene,camera=window.__camera;
                if(!scene || !camera) return null;
                const V=camera.position.constructor;
                const all=[]; scene.traverse(o=>{if(o.name.startsWith('shian-') || o.name==='entrance-window'){
                    const world=o.getWorldPosition(new V());
                    if(o.name.startsWith('shian-letter-') || o.name.startsWith('shian-label-') || o.name==='shian-avatar') {if(world.z < 6 || world.z > 9) return;}
                    const p=world.clone().project(camera);
                    all.push({name:o.name,text:o.text,position:[world.x,world.y,world.z],screen:[(p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2],frame:o.userData.frame,texture:o.material?.map?.image?.currentSrc});
                }});
                return {camera:[camera.position.x,camera.position.y,camera.position.z],objects:all};
            };
        });
        const errors=[],consoleErrors=[];
        page.on('pageerror',e=>errors.push(e.message));
        page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,250));});
        await page.goto('http://127.0.0.1:5175/');
        await page.locator('.preloader').waitFor({state:'hidden',timeout:60000});
        await page.waitForTimeout(800);
        const entrance = await page.evaluate(()=>window.__inspect());
        await page.screenshot({path:`${out}/${label}-entrance.png`});
        const win=entrance.objects.find(o=>o.name==='entrance-window');
        if(mobile) await page.touchscreen.tap(...win.screen); else await page.mouse.move(...win.screen);
        await page.waitForTimeout(750);
        await page.screenshot({path:`${out}/${label}-window.png`});
        const windowOpen=await page.evaluate(()=>window.__inspect());
        const enter=page.getByRole('button',{name:'进入时安的数字空间',exact:true});
        await enter.focus(); await enter.press('Enter');
        await page.getByRole('button',{name:'打开地图',exact:true}).waitFor({timeout:25000});
        await page.mouse.move(viewport.width/2,viewport.height/2);
        await page.waitForTimeout(1400);
        await page.screenshot({path:`${out}/${label}-corridor.png`});
        const corridor=await page.evaluate(()=>window.__inspect());
        const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/avatar_anim/') || r.name.includes('/textures/shian/')).map(r=>r.name));
        fs.writeFileSync(`${out}/${label}-first-inspection.json`,JSON.stringify({entrance,windowOpen,corridor,errors,consoleErrors,resources},null,2));
        console.log(JSON.stringify({label,camera:corridor.camera,objects:corridor.objects.filter(o=>o.text).map(o=>({text:o.text,screen:o.screen})),errors,consoleErrorCount:consoleErrors.length}));
        await page.close();
    }
} finally {await browser.close();}
