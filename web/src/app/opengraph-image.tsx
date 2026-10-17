import { ImageResponse } from 'next/og';
export const alt = 'Markdeck — Write. Connect. Present.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',background:'#122a20',color:'#f1f0e5',padding:'65px 75px'}}><div style={{display:'flex',alignItems:'center',fontSize:36}}>Markdeck <span style={{fontSize:18,marginLeft:'auto',color:'#bfd09f'}}>markdeck.pro</span></div><div style={{display:'flex',flexDirection:'column',fontSize:90,letterSpacing:-4,lineHeight:1.1}}><span>Make room</span><span style={{color:'#d3e5b4'}}>for your thinking.</span></div><div style={{display:'flex',fontSize:22,borderTop:'1px solid #48604c',paddingTop:24,justifyContent:'space-between'}}><span>WRITE / CONNECT / PRESENT</span><span>A local Markdown workspace.</span></div></div>,size);
}
