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
  const baseUrl = 'https://nasir.id';

  try {
    const results = await sql`
      SELECT id, title, summary, content, image_url, images, published_at, is_portfolio, language
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
    const language = item.language || 'en';
    
    // Get item image (prioritize images array, then image_url, then default)
    let itemImage = 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg'; // Default fallback
    
    console.log(`🖼️ [ARTICLE META] Processing images for: ${item.title}`);
    console.log(`🖼️ [ARTICLE META] images array:`, item.images);
    console.log(`🖼️ [ARTICLE META] image_url:`, item.image_url);
    
    // Try images array first (preferred)
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
        itemImage = convertToAssetsUrl(firstImage.trim());
        console.log(`🖼️ [ARTICLE META] ✅ Using images[0]: ${itemImage}`);
      }
    }
    // Fallback to image_url if no images array
    else if (item.image_url && typeof item.image_url === 'string' && item.image_url.trim()) {
      itemImage = convertToAssetsUrl(item.image_url.trim());
      console.log(`🖼️ [ARTICLE META] ✅ Using image_url: ${itemImage}`);
    }
    // Use default if no images found
    else {
      console.log(`🖼️ [ARTICLE META] ⚠️ No article images found, using default`);
    }
    
    console.log(`🖼️ [ARTICLE META] Final image: ${itemImage}`);
    
    // Create description from summary or first 160 chars of content
    let description = item.summary || '';
    if (!description && item.content) {
      // Strip HTML tags and get first 160 characters
      const plainText = item.content.replace(/<[^>]*>/g, '');
      description = plainText.substring(0, 160).trim() + '...';
    }

    const title = `${item.title} | Nasir.id`;
    const publishedDate = new Date(item.published_at).toISOString();

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
        locale: language === 'id' ? 'id_ID' : 'en_US',
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
            alt: `${item.title} - Nasir Noor`,
            type: 'image/jpeg',
          },
        ],
      },
      
      // Twitter Card tags
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        creator: '@nasir_noor',
        images: [itemImage],
      },
      
      // Additional structured data
      other: {
        'article:published_time': publishedDate,
        'article:author': 'Nasir Noor',
        'article:section': item.is_portfolio ? 'Portfolio' : 'Technology',
        'og:image:width': '1200',
        'og:image:height': '630',
        'og:image:type': 'image/jpeg',
        'twitter:image:width': '1200',
        'twitter:image:height': '630',
        'twitter:site': '@nasir_noor',
        'fb:app_id': '', // Add your Facebook App ID if you have one
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

  try {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <AnalyticsTracker 
          pageType={isPortfolio ? "portfolio" : "article"} 
          articleId={item.id} 
          articleSlug={slug} 
        />
        
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link
              href="/"
              className="text-xl font-bold gradient-text-primary hover:scale-105 transition-transform"
            >
              Nasir Noor
            </Link>
            <nav className="hidden sm:flex items-center gap-6">
              <Link
                href="/#articles"
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Articles
              </Link>
              <Link
                href="/#portfolio"
                className="text-slate-600 hover:text-emerald-600 transition-colors font-medium"
              >
                Portfolio
              </Link>
              <Link
                href="/#contact"
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium"
              >
                Contact
              </Link>
            </nav>
            {/* Mobile menu button */}
            <div className="sm:hidden">
              <Link
                href="/"
                className="text-slate-600 hover:text-blue-600 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-blue-50"
              >
                Home
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-6 sm:py-12 px-4 sm:px-6 min-h-screen">
          {/* Content Header */}
          <header className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Tag 
                className={isPortfolio ? "text-emerald-500" : "text-blue-500"} 
                size={20} 
              />
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isPortfolio 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {isPortfolio ? "Portfolio Project" : "Article"}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight mb-4 sm:mb-6 font-serif">
              {item.title}
            </h1>
            
            <div className="flex items-center gap-2 text-slate-500">
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
            <div className="mb-8 sm:mb-12">
              <div className="aspect-[16/9] relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-emerald-50 shadow-lg">
                <img
                  src={featuredImage}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          )}

          {/* Content */}
          <article className="card p-4 sm:p-8 md:p-12 mb-8 sm:mb-12">
            <div 
              className="prose prose-sm sm:prose-lg max-w-none prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-blue-600 prose-strong:text-slate-900 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:overflow-x-auto prose-table:overflow-x-auto [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:list-item break-words overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          </article>

          {/* Comments Section */}
          <div className="card p-4 sm:p-8 md:p-12">
            <Comments articleId={item.id} articleTitle={item.title} />
          </div>

          {/* Navigation */}
          <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-200">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error(`💥 [SLUG] Error loading article ${slug}:`, error);
    notFound();
  }
}