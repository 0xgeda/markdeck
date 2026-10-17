import type { Metadata } from 'next';
import Link from 'next/link';
import { WebsiteShell } from '@/components/website/site-shell';
import { Arrow } from '@/components/website/brand';
import '../website.css';

export const metadata: Metadata = {
  title: '使用指南',
  description: '从第一份文档开始，了解 Markdeck 的本地保存、Markdown 写作、逻辑梳理、章节展示和图片分享。',
  alternates: { canonical: '/guide' },
};

const chapters = [['start','开始写作'],['files','文件与图片'],['organize','梳理思路'],['present','展示文档'],['share','保存与分享']];

export default function GuidePage() {
  return <WebsiteShell><main id="main-content" className="website-subpage website-container website-guide">
    <Link className="website-breadcrumb" href="/">← <span>回到首页</span></Link>
    <span className="section-label">A SMALL GUIDE</span><h1>从第一句话开始。</h1><p className="subpage-intro">几个简单的步骤，找到适合自己的写作节奏。</p>
    <div className="guide-layout"><nav className="guide-nav" aria-label="指南目录">{chapters.map(([id,label],i) => <a key={id} href={`#${id}`}><small>0{i+1}</small>{label}</a>)}</nav><div>
      <article id="start"><h2>01 / 开始写作</h2><p>在 Mac 上打开 Markdeck，点击文档导航中的「新建文档」；已有内容则选择「打开文档」。也可以使用 <strong>⌘N</strong> 新建、<strong>⌘O</strong> 打开。</p><p>直接在排版后的正文里编辑。空段落输入 <code>/</code>，插入标题、列表、引用、代码块、表格或图片；选中文字后，可以使用格式工具调整样式。</p><h3>需要查阅时</h3><p>顶部「目录」控制章节导航，点击标题跳转到正文。打开「参考」，选择另一份已载入的文档，就能一边查阅、一边写作。参考文档为只读，不会误改资料。</p></article>
      <article id="files"><h2>02 / 文件与图片</h2><p>Markdeck 支持 UTF-8 编码的 <code>.md</code>、<code>.markdown</code> 和 <code>.txt</code> 文件，单文件不超过 10 MB。文档保存在本地，不需要账号。</p><h3>图片为什么有时显示不出来？</h3><p>Markdown 通常只记录图片路径，并不包含图片本身。收到同事的 .md 文件时，需要同时收到它引用的图片文件夹。</p><ul><li>把图片放在文档所在目录或其子目录中，保持原有相对路径。</li><li>来自另一台电脑的绝对路径、目录外的图片，或缺失文件，都不能直接读取。可以在缺图提示中重新选择图片。</li><li>网络图片需要网络连接；本地图片单张读取上限为 10 MB。</li></ul><p>已保存到文件的文档，新插入的图片会放入同目录下的 <code>文档名.assets/</code> 文件夹。点击图片、拖动四角可以等比例缩放；相邻图片可以组成两列或三列图组。</p></article>
      <article id="organize"><h2>03 / 梳理思路</h2><p>点击顶部「梳理」，把文档的章节铺到画布上。在卡片层级中选择适合你的标题级别，不必为了画布改变原文的标题习惯。</p><ol><li>拖动卡片调整位置，在卡片内展开下级标题。</li><li>从卡片边缘的连接点拖向另一张卡片，建立关系。</li><li>添加一张小便笺，放在需要补充判断的地方；也可以用分组框归拢相关内容。</li></ol><div className="guide-callout"><p>卡片位置、连线和便笺独立保存，不会重排 Markdown 正文。它们属于桌面应用的工作区数据，单独分享 .md 文件不会包含这张画布。</p></div></article>
      <article id="present"><h2>04 / 展示文档</h2><p>点击顶部「展示」，进入只读展示。可以跳转章节、全屏，或临时高亮选中的文字。退出展示后，临时标注会清除。</p><h3>只讲这次需要的内容</h3><p>打开「章节安排」，勾选要讲的章节，再用上下箭头调整讲述顺序。选择「按所选顺序展示」，即可逐章展开正文；左右方向键翻章，Esc 返回。</p><p>展示安排独立于原文保存，可以为不同场合保留不同方案。它不会改动原文的顺序，也不会自动把正文重新制作成 PPT。</p></article>
      <article id="share"><h2>05 / 保存与分享</h2><p>新文档先自动保存为应用草稿。选择「保存到文件」后，正文修改会自动写回选定文件；顶部出现「已保存到文件」，表示写入成功。<strong>⌘S</strong> 可以主动保存，<strong>⇧⌘S</strong> 可以另存为。</p><p>需要回看修改时，在设置中打开「修改记录」。如果文件被其他应用改动，Markdeck 会提示冲突，可以刷新采用磁盘版本，也可以另存为保留自己的修改。</p><h3>根据接收者，选择分享方式</h3><ul><li><strong>Markdown：</strong>适合继续编辑，也可以用其他 Markdown 工具打开。</li><li><strong>打包文档与图片：</strong>导出 ZIP，一起带走本地图片和相对路径。网络图片仍需要联网。</li><li><strong>HTML：</strong>适合用浏览器阅读，导出时嵌入样式和可读取的图片。</li><li><strong>PDF：</strong>适合交付和打印，以 A4 浅色页面导出。复杂表格或长文档建议先检查分页。</li></ul></article>
      <div className="guide-end"><Link className="website-button light" href="/download">获取 Markdeck <Arrow diagonal /></Link></div>
    </div></div>
  </main></WebsiteShell>;
}
