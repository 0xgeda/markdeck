import type { Metadata } from 'next';
import Link from 'next/link';
import { WebsiteShell } from '@/components/website/site-shell';
import { Arrow } from '@/components/website/brand';
import { macDownloadUrl, site } from '@/lib/site';
import '../website.css';

export const metadata: Metadata = {
  title: '获取 Markdeck',
  description: '把专注带回桌面。了解 Markdeck 的 Mac 版本、安装包发布状态与开始使用的方法。',
  alternates: { canonical: '/download' },
};

export default function DownloadPage() {
  return <WebsiteShell><main id="main-content" className="website-subpage website-container">
    <Link className="website-breadcrumb" href="/">← <span>回到首页</span></Link>
    <div className="download-layout">
      <div><span className="section-label">YOUR NEXT CHAPTER</span><h1>把这份专注，<br/>带回桌面。</h1><p className="subpage-intro">从一份本地文档开始。<br/>写作、梳理与展示，都在 Markdeck。</p><div className="download-visual"><img src="/markdeck.svg" width="83" height="83" alt="Markdeck 应用图标"/><div><strong>Markdeck for Mac</strong><small>为文字，也为文字背后的思考。</small></div></div></div>
      <section className="download-panel" aria-labelledby="platform-title"><div className="download-platform"><h2 id="platform-title">macOS</h2><span>Apple Silicon · M 系列芯片</span></div>
        <p>{macDownloadUrl ? '下载适用于 Apple Silicon Mac 的安装包，解压后将 Markdeck.app 放入「应用程序」文件夹。' : '官网直达下载尚未开放。可以前往 GitHub Releases 查看安装包发布情况；有可用版本时，会列在对应发布记录下。'}</p>
        <a className="website-button dark" href={macDownloadUrl ?? site.releases} target="_blank" rel="noreferrer">{macDownloadUrl ? '下载 Mac 版' : '查看 GitHub 发布页'} <Arrow diagonal /></a>
        <small>当前未提供 Windows、Linux 与 Intel Mac 发布包。</small>
        <div className="download-source">想了解项目？ <a href={site.repository} target="_blank" rel="noreferrer">查看源代码 ↗</a></div>
      </section>
    </div>
    <div className="download-next"><section><h2>第一次使用</h2><p>打开应用后，新建一份文档，或直接打开已有的 Markdown 文件。新文档先作为草稿保存，选择「保存到文件」后，修改会自动写回本地文件。</p><Link href="/guide" className="website-text-link">从这里开始 <Arrow /></Link></section><section><h2>已经有很多文字了？</h2><p>带上你的 .md 文件即可。如果文档包含本地图片，也请保留图片文件夹和相对路径；或者从 Markdeck 打包文档与图片，再一起分享。</p><Link href="/guide#files" className="website-text-link">了解文件与图片 <Arrow /></Link></section></div>
  </main></WebsiteShell>;
}
