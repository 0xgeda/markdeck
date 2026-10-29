import {packager} from '@electron/packager';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
const extendInfo={
  CFBundleDocumentTypes:[
    {CFBundleTypeName:'Markdown document',CFBundleTypeRole:'Editor',LSHandlerRank:'Alternate',CFBundleTypeExtensions:['md','markdown'],LSItemContentTypes:['net.daringfireball.markdown']},
    {CFBundleTypeName:'Plain text document',CFBundleTypeRole:'Editor',LSHandlerRank:'Alternate',CFBundleTypeExtensions:['txt'],LSItemContentTypes:['public.plain-text']}
  ],
  UTImportedTypeDeclarations:[{UTTypeIdentifier:'net.daringfireball.markdown',UTTypeDescription:'Markdown document',UTTypeConformsTo:['public.plain-text'],UTTypeTagSpecification:{'public.filename-extension':['md','markdown'],'public.mime-type':['text/markdown','text/x-markdown']}}]
};
const output=await packager({dir:'.',name:'Markdeck',platform:'darwin',arch:'arm64',out:'release',overwrite:true,asar:true,appBundleId:'com.yunjian.markdown',appCategoryType:'public.app-category.productivity',icon:'desktop/icon.icns',extendInfo,ignore:[/^\/node_modules\/\.(vite|cache)(\/|$)/,/^\/(tests|release|design|web|\.git|\.agents|\.codex)(\/|$)/, /^\/src\/(?!image-scan\.js$)/,/^\/(README|AGENTS|UX_REVIEW|PERFORMANCE_REVIEW)\.md$/, /\.bundle$/, /^\/vite\.config\.js$/, /^\/desktop\/package\.mjs$/],electronZipDir:process.env.ELECTRON_ZIP_DIR,download:{cacheRoot:`${process.env.HOME}/.cache/electron`}});
for(const directory of output){const app=path.join(directory,'Markdeck.app');execFileSync('codesign',['--force','--deep','--sign','-',app],{stdio:'inherit'});execFileSync('codesign',['--verify','--deep','--strict',app],{stdio:'inherit'});}
console.log(output.join('\n'));
