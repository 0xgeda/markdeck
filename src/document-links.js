// Primary click opens a document link. Alt-click leaves the editor's link
// controls available without navigating away from the document.
export function bindDocumentLinks(root,{openExternal,onError}){
  const linkAt=event=>event.target.closest?.('.toastui-editor-contents a[href],.reference-pane article a[href]');
  const down=event=>{if(event.button===0&&!event.altKey&&linkAt(event)){event.preventDefault();event.stopPropagation();}};
  const click=async event=>{
    const link=linkAt(event);if(!link||event.button!==0)return;
    event.preventDefault();if(event.altKey)return;
    event.stopPropagation();
    try{
      let href=link.getAttribute('href');
      // Toast UI escapes linkUrl before assigning the WYSIWYG DOM attribute.
      // Decode that extra layer only there; normal rendered anchors are decoded already.
      if(link.closest('.toastui-editor-ww-container')){
        const decoder=link.ownerDocument.createElement('textarea');decoder.innerHTML=href;href=decoder.value;
      }
      const url=new URL(href);
      if(!['http:','https:'].includes(url.protocol))throw new Error('仅支持在浏览器中打开 HTTP 或 HTTPS 链接');
      const result=await openExternal(url.href);if(result?.ok===false)throw new Error(result.error);
    }catch(error){onError(error.message);}
  };
  root.addEventListener('mousedown',down,true);root.addEventListener('click',click,true);
  return ()=>{root.removeEventListener('mousedown',down,true);root.removeEventListener('click',click,true);};
}
