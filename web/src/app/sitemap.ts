import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
import { routing } from '@/i18n/routing';

const paths = ['', '/guide', '/download'] as const;

function urlFor(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  return `${site.url}${prefix}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routing.locales.flatMap((locale) =>
    paths.map((path) => ({
      url: urlFor(locale, path),
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l === 'zh' ? 'zh-CN' : l, urlFor(l, path)]),
        ),
      },
    })),
  );
}
