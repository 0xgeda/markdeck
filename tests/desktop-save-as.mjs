import {_electron as electron} from 'playwright';
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),root=await fs.mkdtemp(path.join(os.tmpdir(),'markdeck-save-as-'));
const file=path.join(root,'source.md'),out=path.join(root,'out','copy.md');await fs.mkdir(path.dirname(out));
const example='```md\n![example](missing.png)\n```';const body=example+'\n\n![real](photo.png "caption")\n';
await fs.writeFile(file,body);await fs.writeFile(path.join(root,'photo.png'),Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5xkAAAAASUVORK5CYII=','base64'));
let app;
try{
 app=await electron.launch({executablePath:process.env.YUNJIAN_EXECUTABLE||require('electron'),args:['.'],env:{...process.env,YUNJIAN_DATA_DIR:path.join(root,'data')}});
 const page=await app.firstWindow();await page.getByRole('textbox',{name:'文档正文'}).waitFor();
 await app.evaluate(({dialog},{file,out})=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});dialog.showSaveDialog=async()=>({canceled:false,filePath:out});},{file,out});
 const opened=await page.evaluate(()=>window.desktop.open());assert.equal(opened.ok,true);
 const saved=await page.evaluate(id=>window.desktop.saveAs(id),opened.state.active);assert.equal(saved.ok,true,saved.error);
 const text=await fs.readFile(out,'utf8');assert.ok(text.startsWith(example));assert.match(text,/!\[real\]\(copy.assets\/.+ "caption"\)/);assert.equal(await fs.readFile(file,'utf8'),body);
 console.log('PASS: native save-as, packaged scanner, code example preservation, real image relocation. Evidence:',root);
}finally{if(app)await app.close();}
