const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),JSZip=require('jszip');
const {Workspace}=require('../desktop/workspace.cjs');const {bundleDocument}=require('../desktop/document-bundle.cjs');const {Project}=require('../desktop/project.cjs');
(async()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'markdeck-bundle-'));try{
  const dir=path.join(root,'docs');fs.mkdirSync(dir);fs.mkdirSync(path.join(dir,'images'));fs.writeFileSync(path.join(dir,'images','图 片.jpeg'),'pixels');
  const body='![图][photo]\n\n[photo]: <images/图 片.jpeg>\n\n<img src="images/图%20片.jpeg">\n\n![远程](https://example.com/p.png)\n\n`![示例](not-real.png)`';
  const file=path.join(dir,'报告.md');fs.writeFileSync(file,body);const workspace=new Workspace(path.join(root,'data'));const id=workspace.open(file).active;
  const bundle=await bundleDocument(workspace,id),zip=await JSZip.loadAsync(bundle.bytes);assert.equal(await zip.file('报告.md').async('string'),body);assert.equal(await zip.file('images/图 片.jpeg').async('string'),'pixels');assert.equal(bundle.external,1);assert.equal(fs.readFileSync(file,'utf8'),body);
  fs.unlinkSync(path.join(dir,'images','图 片.jpeg'));await assert.rejects(bundleDocument(workspace,id),/以下图片无法打包/);
  fs.writeFileSync(path.join(dir,'第二份.md'),'# 调研\n\n竞争对手的优势');fs.mkdirSync(path.join(dir,'.hidden'));fs.writeFileSync(path.join(dir,'.hidden','secret.md'),'竞争对手');fs.symlinkSync(root,path.join(dir,'escape'));
  const project=new Project();let result=await project.choose(dir);assert.equal(result.results.length,2);result=await project.search('竞争对手');assert.equal(result.results.length,1);assert.equal(result.results[0].line,3);assert.equal(result.results[0].path,'第二份.md');
  assert.equal((await project.search('报告')).results.length,1);await assert.rejects(project.resolve('../data/workspace.json'));assert.equal(await project.resolve('报告.md'),fs.realpathSync(file));
  fs.unlinkSync(file);fs.symlinkSync(path.join(root,'data','workspace.json'),file);await assert.rejects(project.resolve('报告.md'),/移出/);
  console.log('ZIP preserves reference/HTML images and Markdown, missing assets block export; folder content/name search, line numbers and path protections passed.');
}finally{fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(error);process.exitCode=1;});
