import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { DM_Serif_Display } from 'next/font/google';
import { routing } from '@/i18n/routing';
import { site } from '@/lib/site';
import { pageMetadata } from '@/lib/metadata';
import '../globals.css';

export const viewport: Viewport = {
  themeColor: '#122a20',
  width: 'device-width',
  initialScale: 1,
};

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
  const meta = pageMetadata({
    locale,
    path: '',
    title: t('title'),
    description: tSite('description'),
    ogTitle: t('ogTitle'),
    ogImageAlt: t('ogAlt'),
  });
  return {
    metadataBase: new URL(site.url),
    ...meta,
    title: { default: t('title'), template: '%s · Markdeck' },
    robots: { index: true, follow: true },
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
