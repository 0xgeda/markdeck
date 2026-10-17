import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DM_Serif_Display } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { site } from '@/lib/site';
import '../globals.css';

const brandSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-brand',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata.home' });
  const tSite = await getTranslations({ locale, namespace: 'site' });
  const ogLocale = locale === 'zh' ? 'zh_CN' : 'en_US';
  return {
    metadataBase: new URL(site.url),
    title: { default: t('title'), template: '%s · Markdeck' },
    description: tSite('description'),
    alternates: {
      canonical: locale === 'en' ? '/' : `/${locale}`,
      languages: { en: '/', zh: '/zh' },
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      siteName: site.name,
      title: t('ogTitle'),
      description: tSite('description'),
      url: locale === 'en' ? site.url : `${site.url}/${locale}`,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: t('ogAlt') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: tSite('description'),
      images: ['/opengraph-image'],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const htmlLang = locale === 'zh' ? 'zh-CN' : 'en';
  return (
    <html lang={htmlLang} className={brandSerif.variable}>
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
