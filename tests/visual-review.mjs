// Run with Vite on :5173 and an available Playwright browser (or CHROME_PATH).
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const output=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-visual-'));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5173');await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 const load=async(name,text)=>{await page.locator('#file-input').setInputFiles({name,mimeType:'text/plain',buffer:Buffer.from(text)});await page.getByRole('textbox',{name:'文档正文'}).waitFor();};
 await load('访谈资料.md','# 访谈资料\n\n客户关心利润、复购和门店执行。');
 await load('项目提案.md','# 项目提案\n\n'+Array.from({length:12},(_,i)=>`## 第 ${i+1} 章：需要验证的判断\n\n${'以用户访谈与业务数据为依据。'.repeat(12)}\n\n### 证据\n\n下一步进行小范围验证。`).join('\n\n'));
 async function headerFits(){assert.ok(await page.locator('.topbar').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'header overflows');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflows');}
 await headerFits();await page.screenshot({path:path.join(output,'write-wide.png')});
 await page.locator('[data-action="reference"]').click();await page.locator('.reference-pane article h1').waitFor();await headerFits();await page.screenshot({path:path.join(output,'reference-wide.png')});
 await page.getByRole('button',{name:'关闭参考文档'}).click();await page.locator('[data-action="logic"]').click();await page.locator('.logic-workspace').waitFor();await page.screenshot({path:path.join(output,'organize-wide.png')});
 await page.locator('[data-action="presentation"]').click();await page.locator('.display-exit').waitFor();await page.screenshot({path:path.join(output,'display-wide.png')});
 await page.locator('[data-arrange]').click();await page.locator('.show-plan-pane:not([inert])').waitFor();
 assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('[data-mode="display"]').getAttribute('aria-pressed'),'true');
 await headerFits();await page.screenshot({path:path.join(output,'chapters-wide.png')});
 await page.locator('.show-plan-pane [data-start]').click();await page.locator('.chapter-show').waitFor();
 assert.equal(await page.locator('[data-mode="display"]').getAttribute('aria-pressed'),'true');await page.screenshot({path:path.join(output,'chapter-display-wide.png')});
 await page.locator('[data-action="write"]').click();await page.locator('.chapter-show').waitFor({state:'detached'});
 for(const width of [1024,760,390]){await page.setViewportSize({width,height:844});await headerFits();await page.screenshot({path:path.join(output,`write-${width}.png`)});}
 console.log('Screenshots and layout checks:',output);
}finally{await browser.close();}
