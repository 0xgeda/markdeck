import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {listPackage,extractFile} from '@electron/asar';
const archive='release/Markdeck-darwin-arm64/Markdeck.app/Contents/Resources/app.asar';
const info=JSON.parse(execFileSync('plutil',['-convert','json','-o','-','release/Markdeck-darwin-arm64/Markdeck.app/Contents/Info.plist'],{encoding:'utf8'}));
assert.equal(info.CFBundleIdentifier,'com.yunjian.markdown');
for(const extension of ['md','markdown','txt'])assert.ok(info.CFBundleDocumentTypes.some(type=>type.CFBundleTypeRole==='Editor'&&type.CFBundleTypeExtensions.includes(extension)),`Missing Finder association: ${extension}`);
assert.ok(info.UTImportedTypeDeclarations.some(type=>type.UTTypeIdentifier==='net.daringfireball.markdown'&&type.UTTypeTagSpecification['public.filename-extension'].includes('md')));
const files=listPackage(archive);
for(const name of ['README.md','AGENTS.md','UX_REVIEW.md','PERFORMANCE_REVIEW.md'])assert.ok(!files.includes('/'+name),`Project-only document packaged: ${name}`);
for(const name of ['vite','esbuild','rollup','pptxgenjs','@toast-ui/editor','.vite'])assert.ok(!files.some(file=>file.startsWith('/node_modules/'+name+'/')),`Build-only dependency packaged: ${name}`);
for(const name of ['jszip','markdown-it'])assert.ok(files.includes('/node_modules/'+name+'/package.json'));
const metadata=JSON.parse(extractFile(archive,'package.json'));
assert.deepEqual(Object.keys(metadata.dependencies).sort(),['jszip','markdown-it']);
for(const name of ['src/image-scan.js','desktop/workspace.cjs','desktop/image-fix.cjs','desktop/limits.cjs','desktop/main.cjs','desktop/preload.cjs','desktop/feishu.cjs','desktop/feishu-content.cjs']){
  assert.deepEqual(extractFile(archive,name),fs.readFileSync(name),`Packaged source is stale: ${name}`);
}
for(const name of ['index.html',...fs.readdirSync('dist/assets').map(name=>'assets/'+name)]){
  assert.deepEqual(extractFile(archive,'dist/'+name),fs.readFileSync('dist/'+name),`Packaged build is stale: ${name}`);
}
console.log('Packaged scanner, workspace, repair code and renderer match current source/build.');
console.log(`Packaged application archive: ${(fs.statSync(archive).size/1048576).toFixed(2)} MiB; build-only dependencies excluded.`);
