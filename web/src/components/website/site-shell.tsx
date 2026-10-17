import Link from 'next/link';
import { Brand, Arrow } from './brand';
import { WebsiteNavigation } from './navigation';
import { site } from '@/lib/site';
import type { ReactNode } from 'react';

export function WebsiteShell({ children }: { children: ReactNode }) {
  return <div className="website"><a className="website-skip" href="#main-content">跳到主要内容</a><WebsiteNavigation />{children}<footer className="website-footer"><div className="website-container"><div className="website-footer-top"><Link href="/" aria-label="Markdeck 首页"><Brand /></Link><p>给思考，留一点空间。</p><a href={site.repository} target="_blank" rel="noreferrer">GitHub <Arrow diagonal /></a></div><div className="website-footer-bottom"><span>© 2026 Markdeck</span><nav aria-label="页脚导航"><Link href="/guide">使用指南</Link><Link href="/#faq">常见问题</Link><Link href="/download">获取应用</Link></nav><span>markdeck.pro</span></div></div></footer></div>;
}
