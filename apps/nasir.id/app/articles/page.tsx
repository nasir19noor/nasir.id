import sql from '@/lib/db';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ArticlesPage() {
  const articles = await sql`
    SELECT id, title, slug, summary, published_at 
    FROM articles 
    ORDER BY published_at DESC
  `;

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold text-white hover:text-[#60A5FA] transition-colors"
          >
            Nasir Noor
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/portfolio"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Portfolio
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-16 px-6">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-white">
          Technical Writing
        </h1>
        <p className="text-gray-400 mb-12 text-lg">
          Insights on cloud infrastructure, DevOps automation, and AI/ML.
        </p>

        <div className="flex flex-col gap-8">
          {articles.map((post) => (
            <Link
              key={post.id}
              href={`/articles/${post.slug}`}
              className="group p-6 bg-white/5 border border-white/10 rounded-xl hover:border-[#3B82F6]/50 transition-all hover:shadow-lg hover:shadow-[#3B82F6]/5"
            >
              <div className="flex flex-col gap-3">
                <span className="text-sm text-gray-500 font-mono flex items-center gap-2">
                  <Calendar size={14} />
                  {new Date(post.published_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <h2 className="text-2xl font-semibold text-white group-hover:text-[#60A5FA] transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-400 leading-relaxed max-w-2xl">
                  {post.summary}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}