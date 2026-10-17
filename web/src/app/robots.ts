import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';
export default function robots(): MetadataRoute.Robots {
  return {rules:{userAgent:'*',allow:['/','/guide','/download'],disallow:['/api/','/auth','/dashboard','/preview/','/upload']},sitemap:`${site.url}/sitemap.xml`};
}
