import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/guide', '/download'];
  const locales: Array<'en' | 'zh'> = ['en', 'zh'];
  return locales.flatMap((locale) =>
    paths.map((path) => ({
      url: site.url + (locale === 'en' ? '' : `/${locale}`) + path,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.7,
    })),
  );
}
