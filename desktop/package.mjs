import {packager} from '@electron/packager';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const output=await packager({dir:'.',name:'Markdeck',platform:'darwin',arch:'arm64',out:'release',overwrite:true,asar:true,appBundleId:'com.yunjian.markdown',appCategoryType:'public.app-category.productivity',icon:'desktop/icon.icns',ignore:[/^\/(src|tests|release|\.git|\.agents|\.codex)(\/|$)/,/^\/README\.md$/, /^\/vite\.config\.js$/, /^\/desktop\/package\.mjs$/],electronZipDir:process.env.ELECTRON_ZIP_DIR,download:{cacheRoot:'/private/tmp/lark-electron-cache'}});
for(const directory of output){const app=path.join(directory,'Markdeck.app');execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});}
// Keep previous Finder/Dock shortcuts working after renaming.
for(const oldName of ['Larkdown','云笺']){
  const legacy=path.resolve('release/'+oldName+'-darwin-arm64/'+oldName+'.app');
  if(fs.existsSync(legacy)){fs.rmSync(path.join(legacy,'Contents'),{recursive:true,force:true});execFileSync('ditto',[path.join(output[0],'Markdeck.app/Contents'),path.join(legacy,'Contents')]);execFileSync('codesign',['--verify','--deep','--strict',legacy],{stdio:'inherit'});}
}
console.log(output.join('\n'));
