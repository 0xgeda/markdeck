import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Brand, Arrow } from './brand';
import { WebsiteNavigation } from './navigation';
import { site } from '@/lib/site';
import type { ReactNode } from 'react';

export async function WebsiteShell({ children }: { children: ReactNode }) {
  const t = await getTranslations('shell');
  const tNav = await getTranslations('nav');
  return (
    <div className="website">
      <a className="website-skip" href="#main-content">
        {t('skip')}
      </a>
      <WebsiteNavigation />
      {children}
      <footer className="website-footer">
        <div className="website-container">
          <div className="website-footer-top">
            <Link href="/" aria-label={tNav('home')}>
              <Brand />
            </Link>
            <p>{t('footerTag')}</p>
            <a href={site.repository} target="_blank" rel="noreferrer">
              GitHub <Arrow diagonal />
            </a>
          </div>
          <div className="website-footer-bottom">
            <span>© 2026 Markdeck</span>
            <nav aria-label={t('footerNav')}>
              <Link href="/guide">{t('footerGuide')}</Link>
              <Link href="/#faq">{t('footerFaq')}</Link>
              <Link href="/download">{t('footerDownload')}</Link>
            </nav>
            <span>markdeck.pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
