import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { WebsiteShell } from '@/components/website/site-shell';
import { Arrow } from '@/components/website/brand';
import { macRelease, site } from '@/lib/site';
import { pageMetadata, safeJsonLd } from '@/lib/metadata';
import '../../website.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.download' });
  return pageMetadata({ locale, path: '/download', title: t('title'), description: t('description') });
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('download');
  const base = locale === 'en' ? site.url : `${site.url}/${locale}`;
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('breadcrumb'), item: base },
      { '@type': 'ListItem', position: 2, name: t('platformTitle'), item: `${base}/download` },
    ],
  };

  return (
    <WebsiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <main id="main-content" className="website-subpage website-container">
        <Link className="website-breadcrumb" href="/">
          ← <span>{t('breadcrumb')}</span>
        </Link>
        <div className="download-layout">
          <div>
            <span className="section-label">{t('label')}</span>
            <h1>
              {t('titleLine1')}
              <br />
              {t('titleLine2')}
            </h1>
            <p className="subpage-intro">
              {t('intro1')}
              <br />
              {t('intro2')}
            </p>
            <div className="download-visual">
              <Image src="/markdeck.svg" width={83} height={83} alt={t('iconAlt')} priority />
              <div>
                <strong>{t('appName')}</strong>
                <small>{t('appSub')}</small>
              </div>
            </div>
          </div>
          <section className="download-panel" aria-labelledby="platform-title">
            <div className="download-version">{macRelease.version} <span>{t('preview')}</span></div>
            <div className="download-platform">
              <h2 id="platform-title">{t('platformTitle')}</h2>
              <span>{t('platformSub')}</span>
            </div>
            <p>{t('requirements', { minimumOS: macRelease.minimumOS, size: macRelease.sizeMB })}</p>
            <a className="website-button dark download-primary" href={macRelease.downloadUrl}>
              {t('ctaDownload')} <Arrow diagonal />
            </a>
            <small>{t('footnote')}</small>
            <p className="download-preview-note">{t('previewNote')}</p>
            <div className="download-release-links">
              <a href={macRelease.url} target="_blank" rel="noreferrer">{t('releaseNotes')} ↗</a>
              <a href={macRelease.checksumUrl}>{t('checksum')}</a>
            </div>
            <div className="download-source">
              {t('source')}{' '}
              <a href={site.repository} target="_blank" rel="noreferrer">
                {t('sourceLink')} ↗
              </a>
            </div>
          </section>
        </div>
        <section className="download-install" aria-labelledby="install-title">
          <span className="section-label">{t('install.label')}</span>
          <h2 id="install-title">{t('install.title')}</h2>
          <ol>
            {(['unzip', 'move', 'open'] as const).map((step, i) => (
              <li key={step}>
                <span className="download-step" aria-hidden="true">0{i + 1}</span>
                <h3>{t(`install.${step}.h`)}</h3>
                <p>{t(`install.${step}.p`)}</p>
              </li>
            ))}
          </ol>
          <p className="download-install-help">
            {t('install.help')}{' '}
            <a href={`https://support.apple.com/${locale === 'zh' ? 'zh-cn' : 'en-us'}/102445`} target="_blank" rel="noreferrer">
              {t('install.helpLink')} ↗
            </a>
          </p>
        </section>
        <div className="download-next">
          <section>
            <h2>{t('firstTime.h')}</h2>
            <p>{t('firstTime.p')}</p>
            <Link href="/guide" className="website-text-link">
              {t('firstTime.link')} <Arrow />
            </Link>
          </section>
          <section>
            <h2>{t('existing.h')}</h2>
            <p>{t('existing.p')}</p>
            <Link href="/guide#files" className="website-text-link">
              {t('existing.link')} <Arrow />
            </Link>
          </section>
        </div>
      </main>
    </WebsiteShell>
  );
}
