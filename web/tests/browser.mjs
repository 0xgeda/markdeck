// Run the web production server on localhost:3188 first. Playwright is supplied
// by the monorepo's root development dependencies.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-web-'));
const base=process.env.MARKDECK_WEB_URL||'http://localhost:3188';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const errors=[];
try{
 const context=await browser.newContext({locale:'en-US',reducedMotion:'reduce'});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack||e.message));
 for(const width of [1440,768,375]){
  await page.setViewportSize({width,height:900});
  for(const locale of ['en','zh'])for(const suffix of ['','/guide','/download']){
   const route=(locale==='en'?'':'/zh')+suffix||'/';
   await context.clearCookies();
   const response=await page.goto(base+route);assert.equal(response.status(),200,route);
   await page.locator('h1').waitFor();await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('html').getAttribute('lang'),locale==='en'?'en':'zh-CN');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${route} ${width}`);
   assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href,new URL('https://www.markdeck.pro'+route).href);
   const og=await page.locator('meta[property="og:image"]').first().getAttribute('content');assert.ok(og.startsWith('https://www.markdeck.pro/'),og);
   assert.ok(response.headers()['content-security-policy'].includes("object-src 'none'"));assert.ok(response.headers()['strict-transport-security']);
   if(suffix==='/download'){
    const href=await page.locator('.download-primary').getAttribute('href');
    assert.equal(href,'https://github.com/0xgeda/markdeck/releases/download/v1.0.0-preview.1/Markdeck-1.0.0-preview.1-macos-arm64.zip');
    assert.match(await page.locator('.download-version').textContent(),/1\.0\.0 Preview 1/);
    assert.match(await page.locator('.download-panel').textContent(),/macOS 13\.0/);
    assert.equal(await page.locator('.download-install li').count(),3);
    assert.ok(await page.locator('.download-preview-note').isVisible());
   }
   if(suffix==='/guide')assert.ok(await page.locator('#feishu').count());
   await page.screenshot({animations:'disabled',fullPage:suffix==='/download',path:path.join(output,`${locale}-${suffix.slice(1)||'home'}-${width}.png`)});
  }
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'/zh/guide');
 await page.locator('.website-lang-switch a').first().click();await page.waitForURL(base+'/guide');
 assert.equal(await page.locator('html').getAttribute('lang'),'en','language switch must override zh cookie');
 assert.ok((await context.cookies()).some(c=>c.name==='NEXT_LOCALE'&&c.value==='en'));
 await page.setViewportSize({width:390,height:900});await page.locator('.website-mobile-menu summary').click();
 await page.locator('.website-mobile-lang a').last().click();await page.waitForURL(base+'/zh/guide');
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 assert.equal(await page.locator('.website-mobile-menu').getAttribute('open'),null);
 await page.goto(base+'/zh');
 await page.locator('#demo-panel-write textarea').fill('浏览器验收：正文进入展示');
 await page.locator('#demo-tab-present').click();assert.equal(await page.locator('.demo-slide-copy').textContent(),'浏览器验收：正文进入展示');
 await page.locator('#demo-tab-organize').click();await page.locator('.demo-organization textarea').fill('浏览器验收便笺');
 await page.locator('#demo-tab-write').click();assert.equal(await page.locator('#demo-panel-write textarea').inputValue(),'浏览器验收：正文进入展示');
 await page.locator('#demo-tab-organize').click();assert.equal(await page.locator('.demo-organization textarea').inputValue(),'浏览器验收便笺');
 for(let i=0;i<4;i++){
  const theme=page.locator('.demo-themes button').nth(i);await theme.click();assert.equal(await theme.getAttribute('aria-pressed'),'true');
 }
 const faq=page.locator('.faq-items details').first();await faq.locator('summary').click();assert.notEqual(await faq.getAttribute('open'),null);
 await page.locator('#demo-tab-write').click();await page.locator('#demo-tab-write').press('ArrowRight');assert.equal(await page.locator('#demo-tab-organize').getAttribute('aria-selected'),'true');
 const card=page.locator('.demo-flow-node').first();await card.scrollIntoViewIfNeeded();
 const position=await card.getAttribute('style'),box=await card.boundingBox();
 await page.mouse.move(box.x+40,box.y+20);await page.mouse.down();await page.mouse.move(box.x+85,box.y+45,{steps:5});await page.mouse.up();
 assert.notEqual(await card.getAttribute('style'),position,'demo card drag');
 await page.locator('#demo-tab-present').click();await page.locator('.demo-slide-controls button').last().click();
 assert.equal(await page.locator('.demo-slide-controls output').textContent(),'02 / 03');
 for(const endpoint of ['/robots.txt','/sitemap.xml','/opengraph-image'])assert.equal((await context.request.get(base+endpoint)).status(),200,endpoint);
 assert.deepEqual(errors,[]);console.log('PASS: six EN/zh pages at desktop/tablet/mobile widths, direct download and installation details, Feishu guide, canonical/OG metadata, language switching, editable demo, security headers, sitemap, robots and OG image');
}finally{await browser.close();console.log('Evidence:',output);}
