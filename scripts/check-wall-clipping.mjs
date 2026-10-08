import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(path.join(process.env.SHIAN_BROWSER_RUNTIME,'package.json'));
const browser=await require('playwright').chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5175/dev/inspection-wall-clipping.html');
await page.waitForTimeout(3000);
for(let i=0;i<4;i++){await page.getByRole('button',{name:'Toggle clipping'}).click();await page.waitForTimeout(500);}
const result={state:await page.getByTestId('state').innerText(),alert:await page.getByRole('alert').allTextContents(),errors};
fs.writeFileSync(`docs/planning/materials/inspection-2026-10-06/clipping-${process.env.SHIAN_BASELINE?'before':'after'}.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));await browser.close();
if(!process.env.SHIAN_BASELINE&&(result.alert.length||errors.length))process.exitCode=1;
