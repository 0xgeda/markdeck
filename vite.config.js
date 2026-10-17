import {defineConfig} from 'vite';
export default defineConfig({
  base:'./',
  build:{
    target:'es2022',
    chunkSizeWarningLimit:800,
    rollupOptions:{
      output:{
        manualChunks(id){
          if(!id.includes('node_modules'))return;
          if(id.includes('@toast-ui'))return 'editor';
          if(id.includes('prosemirror'))return 'editor';
          if(id.includes('dompurify'))return 'editor';
          if(id.includes('markdown-it'))return 'markdown';
          if(id.includes('jszip'))return 'bundle';
        }
      }
    }
  }
});
