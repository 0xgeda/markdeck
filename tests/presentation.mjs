import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/presentation/deck.js'],bundle:true,platform:'node',format:'esm',write:false});
const {createPresentation,documentSections,presentationThemes}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
test('sections include nested headings but ignore fenced code and stop at the next peer',()=>{
  const md='# 文档\n## 甲\n甲正文\n### 子节\n子正文\n```md\n## 代码里的标题\n```\n## 乙\n乙正文';
  const sections=documentSections(md);assert.deepEqual(sections.map(s=>s.title),['文档','甲','子节','乙']);
  assert.match(sections[1].text,/子正文/);assert.doesNotMatch(sections[1].text,/乙正文/);
  const deck=createPresentation(sections[1].text,'文档');assert.ok(deck.slides.some(s=>s.title==='甲'));assert.ok(deck.slides.some(s=>s.title==='子节'));assert.ok(!deck.slides.some(s=>s.title==='代码里的标题'));
});
test('themes render covers, lists, tables and quotations as independent slides',()=>{
  const md='# 研究报告\n\n## 数据\n| 产品 | 销售额 |\n| --- | --- |\n| 面包 | 120 |\n\n## 建议\n- 第一项\n- 第二项\n- 第三项\n\n## 引用\n> 保留原文';
  for(const theme of Object.keys(presentationThemes)){const deck=createPresentation(md,'研究报告',theme);assert.equal(deck.slides[0].type,'cover');assert.ok(deck.slides.some(s=>s.type==='table'));assert.ok(deck.slides.some(s=>s.type==='bullet'));assert.ok(deck.slides.some(s=>s.type==='quote'));assert.match(deck.html,new RegExp(`data-theme="${theme}"`));assert.match(deck.html,/120/);assert.match(deck.html,/保留原文/);assert.doesNotMatch(deck.html,/<script>/);}
});
test('long sections paginate and exports include standalone navigation',()=>{
  const md='## 很长的章节\n'+Array.from({length:30},(_,i)=>`正文内容 ${i}`).join('\n');const result=createPresentation(md,'报告');
  assert.ok(result.slides.length>=4);assert.ok(result.slides.some(s=>s.part));assert.match(result.exported,/data-previous/);assert.match(result.exported,/PageDown/);assert.match(result.exported,/<script>/);assert.match(result.exported,/正文内容 29/);assert.equal((result.html.match(/class="slide is-current/g)||[]).length,1);
});
test('untrusted HTML stays text, source is separate and invalid inputs are rejected',()=>{
  const md='## <script>alert(1)</script>\n<img src=x onerror="alert(2)">';const deck=createPresentation(md,'文档');assert.doesNotMatch(deck.html,/<script>|<img src=x/);assert.match(deck.html,/&lt;script&gt;/);assert.throws(()=>createPresentation('','文档'),/没有正文/);assert.throws(()=>createPresentation('正文','文档','bad'),/有效/);
});

test('multiple images and images alongside text are retained as image slides',()=>{
  const md='## 内容\n正文\n![甲](https://example.com/a.png)\n![乙](https://example.com/b.png)';
  const deck=createPresentation(md,'报告');assert.equal(deck.slides.filter(s=>s.type==='image-full').length,2);assert.match(deck.html,/src="https:\/\/example.com\/a.png"/);assert.match(deck.html,/src="https:\/\/example.com\/b.png"/);assert.match(deck.html,/正文/);
});

test('a long document without section headings gets a cover and paginated content without dropping lines',()=>{
 const lines=Array.from({length:30},(_,i)=>`独立内容 ${i}`);const deck=createPresentation(lines.join('\n'),'纯正文');assert.equal(deck.slides[0].type,'cover');assert.ok(deck.slides.length>2);assert.deepEqual(deck.slides.flatMap(slide=>slide.body),lines);
});
