import type { Metadata } from 'next';
import './globals.css';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: 'Markdeck — 写下来，理清楚，讲明白', template: '%s · Markdeck' },
  description: site.description,
  openGraph: { type: 'website', locale: 'zh_CN', siteName: site.name, title: 'Markdeck — 给思考，留一点空间', description: site.description, url: site.url, images: [{url:'/opengraph-image',width:1200,height:630,alt:'Markdeck — Write. Connect. Present.'}] },
  twitter: { card: 'summary_large_image', title: 'Markdeck — 给思考，留一点空间', description: site.description, images:['/opengraph-image'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body className="bg-zinc-950 text-white min-h-screen antialiased">{children}</body></html>;
}
