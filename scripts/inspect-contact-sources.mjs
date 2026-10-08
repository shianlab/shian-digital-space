import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME, 'package.json'));
const browser = await require('playwright').chromium.launch({channel:'msedge',headless:true});
const out='docs/planning/materials/stage-11/sources';fs.mkdirSync(out,{recursive:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const images=[];
const outbound=[];
const navigations=[];
page.context().on('request',r=>{if(r.isNavigationRequest() && /(?:xiaohongshu\.com|x\.com|twitter\.com)/.test(r.url()))navigations.push(r.url());});
page.on('response',async r=>{
    if(!/image\//.test(r.headers()['content-type']||''))return;
    if(!/YVEZblIGioicwyxqdkbcVfQXn0g|C0gobn8etoKq4cx0mokcsBzTnCY/.test(r.url()))return;
    const name=r.url().includes('YVEZ')?'official-account-original.jpg':'official-account-illustration.png';
    try{fs.writeFileSync(`${out}/${name}`,await r.body());images.push({name,url:r.url(),status:r.status()});}catch(e){images.push({name,error:e.message});}
});
try{
    await page.goto('https://larkcommunity.feishu.cn/wiki/PZfvwUkWNizauUkMXXucGPKcnCe',{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(14000);
    fs.writeFileSync(`${out}/personal-introduction-current.html`,await page.content());
    fs.writeFileSync(`${out}/rendered-text.txt`,await page.locator('body').innerText());
    await page.screenshot({path:`${out}/public-page.png`});
    const heading=page.getByText('二，社交媒体传播层',{exact:true});
    if(await heading.count()){
        await heading.first().click();await page.waitForTimeout(8000);await page.screenshot({path:`${out}/social-accounts.png`});fs.writeFileSync(`${out}/social-rendered-text.txt`,await page.locator('body').innerText());
        // The embedded sheet paints its links on a canvas. These coordinates are
        // taken from social-accounts.png at the fixed 1440x1000 viewport.
        for(const [label,y] of [['小红书',393],['X',437]]){
            const popupWait=page.waitForEvent('popup',{timeout:8000}).then(p=>p).catch(()=>null);
            await page.mouse.click(1237,y);const popup=await popupWait;
            if(popup){const urls=[];popup.on('request',r=>{if(r.isNavigationRequest())urls.push(r.url());});await popup.waitForTimeout(2500);outbound.push({label,url:popup.url(),navigationUrls:urls});await popup.close();}
            else outbound.push({label,result:'No popup from canvas click'});
        }
    }
    const official=page.getByText('二，公众号，不定期更新一些实践或者想法',{exact:true});
    if(await official.count()){await official.first().click();await page.waitForTimeout(8000);await page.screenshot({path:`${out}/official-account.png`});}
    fs.writeFileSync(`${out}/rendered-text.txt`,await page.locator('body').innerText());
    const links=await page.locator('a').evaluateAll(links=>links.map(a=>({text:a.textContent,href:a.href})).filter(a=>/xiaohongshu|xhslink|mp.weixin|sheets/.test(a.href)));
    const frames=page.frames().map(f=>({url:f.url()}));
    fs.writeFileSync(`${out}/read-result.json`,JSON.stringify({url:page.url(),links,frames,images,outbound,navigations},null,2));
    console.log(JSON.stringify({url:page.url(),links,frames,images:images.map(i=>({name:i.name,status:i.status,error:i.error})),navigations}));
}catch(e){fs.writeFileSync(`${out}/read-failure.txt`,e.stack);console.error(e);process.exitCode=1;}
finally{await browser.close();}
