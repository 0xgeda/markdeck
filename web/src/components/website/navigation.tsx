'use client';
import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import NextLink from 'next/link';
import { Brand, Arrow } from './brand';

export function WebsiteNavigation() {
  const t = useTranslations('nav');
  const tLang = useTranslations('language');
  const locale = useLocale();
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (menu.current) menu.current.open = false;
  };

  // Build locale-swap hrefs. Keep same pathname, swap locale prefix via NextLink since
  // next-intl's Link would double-prefix if we construct absolute URLs.
  const enHref = pathname === '/' ? '/' : pathname;
  const zhHref = `/zh${pathname === '/' ? '' : pathname}`;

  return (
    <header className="website-header">
      <div className="website-container website-nav">
        <Link href="/" aria-label={t('home')}>
          <Brand />
        </Link>
        <nav className="website-desktop-nav" aria-label={t('menu')}>
          <Link href="/#experience">{t('experience')}</Link>
          <Link href="/#details">{t('details')}</Link>
          <Link href="/guide">{t('guide')}</Link>
        </nav>
        <div className="website-nav-right">
          <div className="website-lang-switch" role="group" aria-label={t('languageLabel')}>
            <NextLink href={enHref} aria-current={locale === 'en' ? 'true' : undefined} className={locale === 'en' ? 'active' : ''}>{tLang('en')}</NextLink>
            <span aria-hidden="true">/</span>
            <NextLink href={zhHref} aria-current={locale === 'zh' ? 'true' : undefined} className={locale === 'zh' ? 'active' : ''}>{tLang('zh')}</NextLink>
          </div>
          <Link className="website-nav-cta" href="/download">
            {t('cta')} <Arrow diagonal />
          </Link>
        </div>
        <details
          className="website-mobile-menu"
          ref={menu}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              close();
              menu.current?.querySelector('summary')?.focus();
            }
          }}
        >
          <summary aria-label={t('openMenu')}>
            <span />
            <span />
          </summary>
          <nav aria-label={t('mobileMenu')}>
            <Link href="/#experience" onClick={close}>{t('experience')}</Link>
            <Link href="/#details" onClick={close}>{t('details')}</Link>
            <Link href="/guide" onClick={close}>{t('guide')}</Link>
            <Link href="/download" onClick={close}>{t('cta')}</Link>
            <div className="website-mobile-lang">
              <NextLink href={enHref} onClick={close} className={locale === 'en' ? 'active' : ''}>{tLang('en')}</NextLink>
              <span aria-hidden="true">/</span>
              <NextLink href={zhHref} onClick={close} className={locale === 'zh' ? 'active' : ''}>{tLang('zh')}</NextLink>
            </div>
          </nav>
        </details>
      </div>
    </header>
  );
}
