'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import Image from 'next/image';
import { getThumbnailUrl } from '@/lib/image-utils';

interface Article {
    id: number;
    title: string;
    slug: string;
    summary: string;
    image_url: string;
    published_at: string;
}

export default function BlogSection() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchArticles() {
            try {
                const res = await fetch('/api/public/articles');
                if (res.ok) {
                    const data = await res.json();
                    setArticles(data);
                }
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchArticles();
    }, []);

    return (
        <section id="blog" className="py-24 px-6 bg-white/50 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                    Latest Articles 📚
                </h2>
                <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
                    Insights on cloud infrastructure, DevOps automation, and practical
                    AI/ML applications in modern software engineering.
                </p>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading articles...</p>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border-2 border-pink-100">
                        <p className="text-gray-500">No articles yet. Check back soon! ✨</p>
                    </div>
                ) : (
                    <>
                        {/* Articles grid */}
                        <div className="grid md:grid-cols-2 gap-8 mb-12">
                            {articles.map((article) => (
                                <article
                                    key={article.id}
                                    className="group bg-white rounded-2xl overflow-hidden border-2 border-pink-100 hover:border-pink-300 transition-all hover:shadow-xl hover:shadow-pink-100 hover:scale-105"
                                >
                                    {/* Image */}
                                    {article.image_url && (
                                        <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-pink-100 to-blue-100">
                                            <Image
                                                src={getThumbnailUrl(article.image_url)}
                                                alt={article.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {new Date(article.published_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-pink-600 transition-colors">
                                            {article.title}
                                        </h3>
                                        {article.summary && (
                                            <p className="text-gray-600 mb-4">{article.summary}</p>
                                        )}

                                        <a
                                            href={`/articles/${article.slug}`}
                                            className="inline-flex items-center gap-2 text-pink-500 hover:text-pink-600 transition-colors group/link font-medium"
                                        >
                                            Read More
                                            <ArrowRight
                                                size={16}
                                                className="group-hover/link:translate-x-1 transition-transform"
                                            />
                                        </a>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* View all link */}
                        <div className="text-center">
                            <a
                                href="/articles"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl font-medium"
                            >
                                View All Articles
                                <ArrowRight size={18} />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
