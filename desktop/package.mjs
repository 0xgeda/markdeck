import {packager} from '@electron/packager';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const output=await packager({dir:'.',name:'Markdeck',platform:'darwin',arch:'arm64',out:'release',overwrite:true,asar:true,appBundleId:'com.yunjian.markdown',appCategoryType:'public.app-category.productivity',icon:'desktop/icon.icns',ignore:[/^\/node_modules\/\.(vite|cache)(\/|$)/,/^\/(tests|release|design|web|\.git|\.agents|\.codex)(\/|$)/, /^\/src\/(?!image-scan\.js$)/,/^\/(README|AGENTS|UX_REVIEW|PERFORMANCE_REVIEW)\.md$/, /\.bundle$/, /^\/vite\.config\.js$/, /^\/desktop\/package\.mjs$/],electronZipDir:process.env.ELECTRON_ZIP_DIR,download:{cacheRoot:'/private/tmp/lark-electron-cache'}});
for(const directory of output){const app=path.join(directory,'Markdeck.app');execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});}
console.log(output.join('\n'));
