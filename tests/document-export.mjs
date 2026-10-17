import assert from 'node:assert/strict';import {build} from 'esbuild';import {JSDOM} from 'jsdom';
const bundle=await build({entryPoints:['src/document-export.js'],bundle:true,write:false,format:'iife',globalName:'DocumentExport',platform:'browser',loader:{'.css':'text'}});
const dom=new JSDOM('<body></body>',{runScripts:'dangerously',url:'https://test.local'});const w=dom.window;w.eval(bundle.outputFiles[0].text);
let captured;w.desktop={exportDocument:async(title,html,format)=>{captured={title,html,format};return {ok:true};}};
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
const editor={getHTML:()=>`<h2>正文标题</h2><p><strong>重点</strong></p><img src="${png}"><table><thead><tr><th>产品</th></tr></thead><tbody><tr><td>面包</td></tr></tbody></table><script>alert(1)</script>`};
assert.equal(await w.DocumentExport.exportDocument(editor,{title:'导出测试'},'sage','html'),true);
const output=new JSDOM(captured.html);assert.equal(output.window.document.querySelectorAll('script').length,0);assert.equal(output.window.document.querySelector('img').src,png);assert.equal(output.window.document.querySelector('td').textContent,'面包');assert.equal(output.window.document.documentElement.dataset.theme,'sage');assert.equal(output.window.document.querySelectorAll('link[href],script[src]').length,0);
await w.DocumentExport.exportDocument(editor,{title:'导出测试'},'light','pdf');assert.equal(captured.format,'pdf');output.window.close();dom.window.close();console.log('Standalone HTML sanitization, embedded image, table, theme and PDF dispatch passed.');
