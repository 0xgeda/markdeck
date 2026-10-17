'use client';
import Link from 'next/link';
import { useRef } from 'react';
import { Brand, Arrow } from './brand';

export function WebsiteNavigation() {
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => { if (menu.current) menu.current.open = false; };
  return <header className="website-header"><div className="website-container website-nav">
    <Link href="/" aria-label="Markdeck 首页"><Brand /></Link>
    <nav className="website-desktop-nav" aria-label="主导航"><Link href="/#experience">产品体验</Link><Link href="/#details">用心的细节</Link><Link href="/guide">使用指南</Link></nav>
    <Link className="website-nav-cta" href="/download">获取 Markdeck <Arrow diagonal /></Link>
    <details className="website-mobile-menu" ref={menu} onKeyDown={event => { if(event.key === 'Escape'){ close(); menu.current?.querySelector('summary')?.focus(); } }}>
      <summary aria-label="打开导航菜单"><span/><span/></summary>
      <nav aria-label="移动导航"><Link href="/#experience" onClick={close}>产品体验</Link><Link href="/#details" onClick={close}>用心的细节</Link><Link href="/guide" onClick={close}>使用指南</Link><Link href="/download" onClick={close}>获取 Markdeck</Link></nav>
    </details>
  </div></header>;
}
