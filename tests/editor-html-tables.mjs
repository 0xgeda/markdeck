import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const cases=[
  ['<a id="start"></a>编号', '正文<a name="end"></a>'],
  ['<a id="only"></a>', '<a id="one"></a><a id="two"></a>'],
  ['<a href="https://example.com">链接</a>', '<b>粗体</b>'],
  ['前<b>粗体</b>', '<i>斜体</i>后'],
  ['<a id="before-break"></a>前<br>后<a id="after-break"></a>', '<b>前</b><br><em>后</em>'],
  ['<span>普通文字</span>', '<span>前</span><br><span>后</span>'],
  ['<ul><li>条目一</li><li>条目二</li></ul>', '前<ul><li>条目</li></ul>后'],
  ['<img src="https://example.com/a.png" alt="图">', '<code>代码</code>'],
];
const markdown='# HTML 表格回归\n\n<a id="section"></a>\n\n[跳转](#start)\n\n'+
  '| 列一 | 列二 |\n| --- | --- |\n'+cases.map(row=>'| '+row.join(' | ')+' |').join('\n')+
  '\n\n结束正文\n\n```html\n<a id="example"></a>\n```';
const expectedAnchors=['section','start','end','only','one','two','before-break','after-break'];

for(const format of ['UMD','ESM']){
  const bundle=await build({stdin:{contents:format==='ESM'?"import Editor from '@toast-ui/editor';window.TestEditor=Editor;":`window.TestEditor=require(${JSON.stringify(require.resolve('@toast-ui/editor'))});`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser'});
  const dom=new JSDOM('<main></main>',{url:'https://test.invalid',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};
  w.Range.prototype.getBoundingClientRect=()=>({left:0,top:0,right:0,bottom:0});w.Range.prototype.getClientRects=()=>[];
  let editor;
  try{
    w.eval(bundle.outputFiles[0].text);
    editor=new w.TestEditor({el:w.document.querySelector('main'),initialValue:markdown,initialEditType:'wysiwyg',usageStatistics:false,autofocus:false});
    const check=()=>{
      const model=editor.wwEditor.view.state.doc;model.check();
      const root=editor.wwEditor.view.dom;
      assert.equal(root.querySelectorAll('table').length,1);
      assert.equal(root.querySelectorAll('tbody tr').length,cases.length);
      assert.deepEqual([...root.querySelectorAll('a[id],a[name]')].map(a=>a.id||a.name),expectedAnchors);
      assert.match(root.textContent,/结束正文/);
      assert.equal(root.querySelector('a[href="https://example.com"]').textContent,'链接');
      assert.equal(root.querySelector('td b,td strong').textContent,'粗体');
      const images=[];model.descendants(node=>{if(node.type.name==='image')images.push(node.attrs.imageUrl);});
      assert.deepEqual(images,['https://example.com/a.png']);
      const output=editor.getMarkdown();
      for(const id of expectedAnchors)assert.ok(output.includes(`<a ${id==='end'?'name':'id'}="${id}"></a>`),`lost anchor ${id}`);
      assert.match(output,/\[跳转\]\(#start\)/);
      assert.match(output,/```html\n<a id="example"><\/a>\n```/);
      return output;
    };
    check();
    const view=editor.wwEditor.view;
    view.dispatch(view.state.tr.insertText('已编辑',2));
    assert.match(check(),/已编辑/);
    // Repeated Markdown conversion exercises load, external refresh and restart.
    for(let i=0;i<3;i++)editor.setMarkdown(check(),false);
    check();
    // HTML clipboard parsing must preserve empty anchors too.
    editor.setHTML('<p>前<a id="pasted"></a>后</p>',false);
    editor.wwEditor.view.state.doc.check();
    assert.match(editor.getMarkdown(),/前<a id="pasted"><\/a>后/);
    console.log(`PASS ${format}: inline HTML tables, named anchors, edits, repeated conversion and HTML paste`);
  }finally{editor?.destroy();w.close();}
}
