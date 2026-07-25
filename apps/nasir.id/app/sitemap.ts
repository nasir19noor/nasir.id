import type { MetadataRoute } from 'next';
import sql from '@/lib/db';

const baseUrl = 'https://nasir.id';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/id`, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/articles`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/id/articles`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/portfolio`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/id/portfolio`, changeFrequency: 'weekly', priority: 0.7 },
  ];

  try {
    const rows = await sql`
      SELECT slug, language, is_portfolio, published_at
      FROM articles
      ORDER BY published_at DESC
    `;

    const contentRoutes: MetadataRoute.Sitemap = rows.map((row) => {
      const path = row.language === 'id' ? `/id/${row.slug}` : `/${row.slug}`;
      return {
        url: `${baseUrl}${path}`,
        lastModified: new Date(row.published_at),
        changeFrequency: row.is_portfolio ? 'monthly' : 'yearly',
        priority: row.is_portfolio ? 0.6 : 0.7,
      };
    });

    return [...staticRoutes, ...contentRoutes];
  } catch (error) {
    console.error('Failed to build sitemap content routes:', error);
    // A partial sitemap (static routes only) beats a 500 on /sitemap.xml.
    return staticRoutes;
  }
}
