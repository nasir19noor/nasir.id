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
    images: string[];
    published_at: string;
}

interface BlogSectionProps {
    language?: string;
}

export default function BlogSection({ language = 'en' }: BlogSectionProps) {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchArticles() {
            try {
                const res = await fetch(`/api/public/articles/${language}`);
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
    }, [language]);

    // Helper function to get the best image URL for an article
    const getArticleImageUrl = (article: Article): string | null => {
        console.log(`🖼️ [BLOG] Processing article: ${article.title}`);
        console.log(`🖼️ [BLOG] Raw images:`, article.images);
        console.log(`🖼️ [BLOG] Raw image_url:`, article.image_url);
        
        // Priority: images array first, then image_url, then null
        if (article.images && Array.isArray(article.images) && article.images.length > 0) {
            const firstImage = article.images[0];
            if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
                const thumbnailUrl = getThumbnailUrl(firstImage.trim());
                console.log(`🖼️ [BLOG] ✅ Using images[0]: ${firstImage.trim()} -> ${thumbnailUrl}`);
                return thumbnailUrl;
            }
        }
        
        if (article.image_url && typeof article.image_url === 'string' && article.image_url.trim()) {
            const thumbnailUrl = getThumbnailUrl(article.image_url.trim());
            console.log(`🖼️ [BLOG] ✅ Using image_url: ${article.image_url.trim()} -> ${thumbnailUrl}`);
            return thumbnailUrl;
        }
        
        console.log(`🖼️ [BLOG] ❌ No image found for article`);
        return null;
    };

    return (
        <section id="blog" className="py-24 px-6 bg-slate-50/50 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center gradient-text-primary font-serif">
                    {language === 'id' ? 'Wawasan Terbaru' : 'Latest Insights'}
                </h2>
                <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto text-lg">
                    {language === 'id' 
                        ? 'Pemikiran tentang arsitektur cloud, praktik terbaik DevOps, dan teknologi emerging yang membentuk masa depan rekayasa perangkat lunak.'
                        : 'Thoughts on cloud architecture, DevOps best practices, and emerging technologies shaping the future of software engineering.'
                    }
                </p>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">{language === 'id' ? 'Memuat artikel...' : 'Loading articles...'}</p>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="text-center py-12 card">
                        <p className="text-slate-500">{language === 'id' ? 'Belum ada artikel. Segera hadir!' : 'No articles yet. Check back soon!'}</p>
                    </div>
                ) : (
                    <>
                        {/* Articles grid */}
                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            {articles.map((article) => (
                                <article
                                    key={article.id}
                                    className="group card card-hover cursor-pointer"
                                    onClick={() => window.open(`/${article.slug}`, '_blank')}
                                >
                                    {/* Image */}
                                    {(() => {
                                        const imageUrl = getArticleImageUrl(article);
                                        return imageUrl ? (
                                            <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-blue-50 to-emerald-50">
                                                <Image
                                                    src={imageUrl}
                                                    alt={article.title}
                                                    fill
                                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                            </div>
                                        ) : null;
                                    })()}

                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(article.published_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                            {article.title}
                                        </h3>
                                        {article.summary && (
                                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">{article.summary}</p>
                                        )}

                                        <div className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors group/link font-medium text-sm">
                                            {language === 'id' ? 'Baca Artikel' : 'Read Article'}
                                            <ArrowRight
                                                size={14}
                                                className="group-hover/link:translate-x-1 transition-transform"
                                            />
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {/* View all link */}
                        <div className="text-center">
                            <a
                                href={language === 'id' ? '/id/articles' : '/articles'}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                {language === 'id' ? 'Lihat Semua Artikel' : 'View All Articles'}
                                <ArrowRight size={18} />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
