import type { Metadata } from 'next';
import { site } from './site';
import { routing } from '@/i18n/routing';

export function localePath(locale: string, path = ''): string {
  const clean = path.startsWith('/') ? path : path ? `/${path}` : '';
  return locale === routing.defaultLocale ? clean || '/' : `/${locale}${clean}`;
}

export function buildAlternates(path = ''): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = { 'x-default': localePath(routing.defaultLocale, path) };
  for (const locale of routing.locales) {
    const key = locale === 'zh' ? 'zh-CN' : locale;
    languages[key] = localePath(locale, path);
  }
  return { canonical: localePath(routing.defaultLocale, path), languages };
}

export function pageMetadata(opts: {
  locale: string;
  path?: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogImageAlt?: string;
}): Metadata {
  const { locale, path = '', title, description, ogTitle, ogImageAlt } = opts;
  const ogLocale = locale === 'zh' ? 'zh_CN' : 'en_US';
  const url = site.url + localePath(locale, path);
  return {
    metadataBase: new URL(site.url),
    title,
    description,
    alternates: {
      canonical: localePath(locale, path),
      languages: buildAlternates(path).languages,
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      siteName: site.name,
      title: ogTitle ?? title,
      description,
      url,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: ogImageAlt ?? title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle ?? title,
      description,
      images: ['/opengraph-image'],
    },
  };
}
