import sql from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import Comments from '@/components/Comments';
import { convertToAssetsUrl } from '@/lib/image-utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for article/portfolio pages
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nasir.id';

  try {
    const results = await sql`
      SELECT id, title, summary, content, image_url, images, published_at, is_portfolio
      FROM articles 
      WHERE slug = ${slug}
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      return {
        title: 'Page Not Found | Nasir.id',
        description: 'The requested page could not be found.',
      };
    }

    const item = results[0];
    
    // Get item image (first from images array, then image_url, then fallback)
    let itemImage = `${baseUrl}/default-og-image.jpg`;
    if (item.images && item.images.length > 0) {
      itemImage = convertToAssetsUrl(item.images[0]);
    } else if (item.image_url) {
      itemImage = convertToAssetsUrl(item.image_url);
    }

    // Create description from summary or first 160 chars of content
    let description = item.summary || '';
    if (!description && item.content) {
      // Strip HTML tags and get first 160 characters
      const plainText = item.content.replace(/<[^>]*>/g, '');
      description = plainText.substring(0, 160).trim() + '...';
    }

    const title = `${item.title} | Nasir.id`;
    const publishedDate = new Date(item.published_at).toISOString();
    const itemType = item.is_portfolio ? 'portfolio project' : 'article';

    return {
      title,
      description,
      keywords: item.is_portfolio 
        ? ['Portfolio', 'Project', 'Cloud Engineering', 'DevOps', 'AWS', 'Azure', 'GCP']
        : ['Article', 'Blog', 'Cloud Engineering', 'DevOps', 'AWS', 'Azure', 'GCP', 'Tutorial'],
      authors: [{ name: 'Nasir Noor' }],
      creator: 'Nasir Noor',
      
      // Open Graph tags
      openGraph: {
        title,
        description,
        url: `${baseUrl}/${slug}`,
        siteName: 'Nasir.id',
        type: item.is_portfolio ? 'website' : 'article',
        locale: 'en_US',
        publishedTime: publishedDate,
        authors: ['Nasir Noor'],
        section: item.is_portfolio ? 'Portfolio' : 'Technology',
        tags: item.is_portfolio 
          ? ['Portfolio', 'Project', 'Cloud Engineering', 'DevOps']
          : ['Article', 'Technology', 'Cloud Engineering', 'DevOps'],
        images: [
          {
            url: itemImage,
            width: 1200,
            height: 630,
            alt: item.title,
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
        images: [itemImage],
      },
      
      // Additional structured data
      other: {
        'article:published_time': publishedDate,
        'article:author': 'Nasir Noor',
        'article:section': item.is_portfolio ? 'Portfolio' : 'Technology',
        'og:image:width': '1200',
        'og:image:height': '630',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Nasir.id',
      description: 'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure.',
    };
  }
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;

  console.log(`🔍 [SLUG] Looking up content for slug: ${slug}`);

  const results = await sql`
    SELECT id, title, content, published_at, is_portfolio, summary, image_url, images
    FROM articles 
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (!results || results.length === 0) {
    console.log(`❌ [SLUG] No content found for slug: ${slug}`);
    notFound();
  }

  const item = results[0];
  const isPortfolio = item.is_portfolio;
  
  console.log(`✅ [SLUG] Found ${isPortfolio ? 'portfolio project' : 'article'}: ${item.title}`);

  // Get the featured image (first from images array, then image_url)
  let featuredImage = null;
  if (item.images && item.images.length > 0) {
    featuredImage = convertToAssetsUrl(item.images[0]);
  } else if (item.image_url) {
    featuredImage = convertToAssetsUrl(item.image_url);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50">
      <AnalyticsTracker 
        pageType={isPortfolio ? "portfolio" : "article"} 
        articleId={item.id} 
        articleSlug={slug} 
      />
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent hover:from-pink-600 hover:to-blue-600 transition-all"
          >
            Nasir Noor
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/#articles"
              className="text-gray-600 hover:text-pink-600 transition-colors font-medium"
            >
              Articles
            </Link>
            <Link
              href="/#portfolio"
              className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
            >
              Portfolio
            </Link>
            <Link
              href="/#contact"
              className="text-gray-600 hover:text-purple-600 transition-colors font-medium"
            >
              Contact
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        {/* Content Header */}
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Tag 
              className={isPortfolio ? "text-blue-500" : "text-pink-500"} 
              size={20} 
            />
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              isPortfolio 
                ? "bg-blue-100 text-blue-700" 
                : "bg-pink-100 text-pink-700"
            }`}>
              {isPortfolio ? "Portfolio Project" : "Article"}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
            {item.title}
          </h1>
          
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar size={16} />
            <span className="text-sm">
              Published on {new Date(item.published_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </header>

        {/* Featured Image */}
        {featuredImage && (
          <div className="mb-12">
            <div className="aspect-[16/9] relative overflow-hidden rounded-2xl border-2 border-pink-100 bg-gradient-to-br from-pink-100 to-blue-100">
              <img
                src={featuredImage}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <article className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-pink-100 p-8 md:p-12 mb-12 overflow-x-auto">
          <div 
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:overflow-x-auto prose-table:overflow-x-auto"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        </article>

        {/* Comments Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-pink-100 p-8 md:p-12">
          <Comments articleId={item.id} articleTitle={item.title} />
        </div>

        {/* Navigation */}
        <div className="mt-12 pt-8 border-t border-pink-200">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 transition-colors font-medium"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}