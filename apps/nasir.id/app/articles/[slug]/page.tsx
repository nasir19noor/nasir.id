import sql from '@/lib/db';
import MarkdownIt from 'markdown-it';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import Comments from '@/components/Comments';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const md = new MarkdownIt();

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for article pages
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nasir.id';

  try {
    const results = await sql`
      SELECT id, title, summary, content, image_url, images, published_at 
      FROM articles 
      WHERE slug = ${slug} AND is_portfolio = FALSE
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      return {
        title: 'Article Not Found | Nasir.id',
        description: 'The requested article could not be found.',
      };
    }

    const article = results[0];
    
    // Get article image (first from images array, then image_url, then fallback)
    let articleImage = `${baseUrl}/default-og-image.jpg`;
    if (article.images && article.images.length > 0) {
      articleImage = article.images[0];
    } else if (article.image_url) {
      articleImage = article.image_url;
    }

    // Create description from summary or first 160 chars of content
    let description = article.summary || '';
    if (!description && article.content) {
      // Strip HTML tags and get first 160 characters
      const plainText = article.content.replace(/<[^>]*>/g, '');
      description = plainText.substring(0, 160).trim() + '...';
    }

    const title = `${article.title} | Nasir.id`;
    const publishedDate = new Date(article.published_at).toISOString();

    return {
      title,
      description,
      keywords: ['Cloud Engineering', 'DevOps', 'AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'Technical Article'],
      authors: [{ name: 'Nasir Noor' }],
      creator: 'Nasir Noor',
      
      // Open Graph tags
      openGraph: {
        title,
        description,
        url: `${baseUrl}/articles/${slug}`,
        siteName: 'Nasir.id',
        type: 'article',
        locale: 'en_US',
        publishedTime: publishedDate,
        authors: ['Nasir Noor'],
        section: 'Technology',
        tags: ['Cloud Engineering', 'DevOps', 'Technology'],
        images: [
          {
            url: articleImage,
            width: 1200,
            height: 630,
            alt: article.title,
            type: 'image/jpeg',
          },
        ],
      },
      
      // Twitter Card tags
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        creator: '@nasir_noor', // Replace with actual Twitter handle
        images: [articleImage],
      },
      
      // Additional structured data
      other: {
        'article:published_time': publishedDate,
        'article:author': 'Nasir Noor',
        'article:section': 'Technology',
        'og:image:width': '1200',
        'og:image:height': '630',
      },
    };
  } catch (error) {
    console.error('Error generating article metadata:', error);
    return {
      title: 'Article | Nasir.id',
      description: 'Read the latest technical articles about cloud engineering and DevOps.',
    };
  }
}

export default async function ArticleDetail({ params }: PageProps) {
  const { slug } = await params;

  const results = await sql`
    SELECT id, title, content, published_at 
    FROM articles 
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (!results || results.length === 0) {
    notFound();
  }

  const article = results[0];
  const htmlContent = md.render(article.content);

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      <AnalyticsTracker pageType="article" articleId={article.id} articleSlug={slug} />
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold text-white hover:text-[#60A5FA] transition-colors"
          >
            Nasir Noor
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/articles"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Articles
            </Link>
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto py-20 px-6">
        <header className="mb-10">
          <h1 className="text-4xl font-extrabold mb-4 text-white leading-tight">
            {article.title}
          </h1>
          <div className="text-gray-500 font-mono text-sm">
            Published on{' '}
            {new Date(article.published_at).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </header>

        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Comments Section */}
        <Comments articleId={article.id} articleTitle={article.title} />

        <div className="mt-16 pt-8 border-t border-white/10">
          <Link
            href="/articles"
            className="inline-flex items-center gap-2 text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
          >
            <ArrowLeft size={16} />
            Back to all articles
          </Link>
        </div>
      </main>
    </div>
  );
}