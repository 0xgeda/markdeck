import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { WebsiteShell } from '@/components/website/site-shell';
import { Arrow } from '@/components/website/brand';
import { site } from '@/lib/site';
import { pageMetadata, safeJsonLd } from '@/lib/metadata';
import '../../website.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.guide' });
  return pageMetadata({ locale, path: '/guide', title: t('title'), description: t('description') });
}

const chapterIds = ['start', 'files', 'organize', 'present', 'share'] as const;

function RichHtml({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('guide');
  const base = locale === 'en' ? site.url : `${site.url}/${locale}`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('breadcrumb'), item: base },
      { '@type': 'ListItem', position: 2, name: t('title'), item: `${base}/guide` },
    ],
  };
  const faqArticle = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: t('title'),
    description: t('intro'),
    inLanguage: locale === 'zh' ? 'zh-CN' : 'en',
    url: `${base}/guide`,
    keywords: locale === 'zh'
      ? ['Markdown 编辑器', 'Mac Markdown', '本地 Markdown', 'Markdown 大纲', 'Markdown 演示', 'Markdeck']
      : ['Markdown editor', 'Mac Markdown app', 'local Markdown', 'Markdown outline', 'Markdown presentation', 'Markdeck'],
  };

  return (
    <WebsiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqArticle) }} />
      <main id="main-content" className="website-subpage website-container website-guide">
        <Link className="website-breadcrumb" href="/">
          ← <span>{t('breadcrumb')}</span>
        </Link>
        <span className="section-label">{t('label')}</span>
        <h1>{t('title')}</h1>
        <p className="subpage-intro">{t('intro')}</p>
        <div className="guide-layout">
          <nav className="guide-nav" aria-label={t('nav')}>
            {chapterIds.map((id, i) => (
              <a key={id} href={`#${id}`}>
                <small>0{i + 1}</small>
                {t(`chapters.${id}`)}
              </a>
            ))}
          </nav>
          <div>
            <article id="start">
              <h2>{t('start.title')}</h2>
              <p><RichHtml html={t('start.p1')} /></p>
              <p><RichHtml html={t('start.p2')} /></p>
              <h3>{t('start.h3')}</h3>
              <p>{t('start.p3')}</p>
            </article>
            <article id="files">
              <h2>{t('files.title')}</h2>
              <p><RichHtml html={t('files.p1')} /></p>
              <h3>{t('files.h3')}</h3>
              <p>{t('files.p2')}</p>
              <ul>
                <li>{t('files.li1')}</li>
                <li>{t('files.li2')}</li>
                <li>{t('files.li3')}</li>
              </ul>
              <p><RichHtml html={t('files.p3')} /></p>
            </article>
            <article id="organize">
              <h2>{t('organize.title')}</h2>
              <p>{t('organize.p1')}</p>
              <ol>
                <li>{t('organize.li1')}</li>
                <li>{t('organize.li2')}</li>
                <li>{t('organize.li3')}</li>
              </ol>
              <div className="guide-callout">
                <p>{t('organize.callout')}</p>
              </div>
            </article>
            <article id="present">
              <h2>{t('present.title')}</h2>
              <p>{t('present.p1')}</p>
              <h3>{t('present.h3')}</h3>
              <p>{t('present.p2')}</p>
              <p>{t('present.p3')}</p>
            </article>
            <article id="share">
              <h2>{t('share.title')}</h2>
              <p><RichHtml html={t('share.p1')} /></p>
              <p>{t('share.p2')}</p>
              <h3>{t('share.h3')}</h3>
              <ul>
                <li><RichHtml html={t('share.li1')} /></li>
                <li><RichHtml html={t('share.li2')} /></li>
                <li><RichHtml html={t('share.li3')} /></li>
                <li><RichHtml html={t('share.li4')} /></li>
              </ul>
            </article>
            <div className="guide-end">
              <Link className="website-button light" href="/download">
                {t('end')} <Arrow diagonal />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </WebsiteShell>
  );
}
