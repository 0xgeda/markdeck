import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { WebsiteShell } from '@/components/website/site-shell';
import { Arrow } from '@/components/website/brand';
import { macDownloadUrl, site } from '@/lib/site';
import '../../website.css';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.download' });
  const canonical = locale === 'en' ? '/download' : `/${locale}/download`;
  return { title: t('title'), description: t('description'), alternates: { canonical } };
}

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('download');

  return (
    <WebsiteShell>
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
              <img src="/markdeck.svg" width="83" height="83" alt={t('iconAlt')} />
              <div>
                <strong>{t('appName')}</strong>
                <small>{t('appSub')}</small>
              </div>
            </div>
          </div>
          <section className="download-panel" aria-labelledby="platform-title">
            <div className="download-platform">
              <h2 id="platform-title">{t('platformTitle')}</h2>
              <span>{t('platformSub')}</span>
            </div>
            <p>{macDownloadUrl ? t('descAvailable') : t('descUnavailable')}</p>
            <a className="website-button dark" href={macDownloadUrl ?? site.releases} target="_blank" rel="noreferrer">
              {macDownloadUrl ? t('ctaDownload') : t('ctaReleases')} <Arrow diagonal />
            </a>
            <small>{t('footnote')}</small>
            <div className="download-source">
              {t('source')}{' '}
              <a href={site.repository} target="_blank" rel="noreferrer">
                {t('sourceLink')} ↗
              </a>
            </div>
          </section>
        </div>
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
