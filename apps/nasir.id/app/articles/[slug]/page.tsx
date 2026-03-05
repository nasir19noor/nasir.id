import sql from '@/lib/db';
import MarkdownIt from 'markdown-it';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AnalyticsTracker from '@/components/AnalyticsTracker';

export const dynamic = 'force-dynamic';

const md = new MarkdownIt();

interface PageProps {
  params: Promise<{ slug: string }>;
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