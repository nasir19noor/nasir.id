'use client';

import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Search, Filter } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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

export default function ArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);

    useEffect(() => {
        async function fetchArticles() {
            try {
                const res = await fetch('/api/public/articles/en');
                if (res.ok) {
                    const data = await res.json();
                    setArticles(data);
                    setFilteredArticles(data);
                }
            } catch (error) {
                console.error('Error fetching articles:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchArticles();
    }, []);

    useEffect(() => {
        const filtered = articles.filter(article =>
            article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            article.summary?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredArticles(filtered);
    }, [searchTerm, articles]);

    // Helper function to get the best image URL for an article
    const getArticleImageUrl = (article: Article): string | null => {
        // Priority: images array first, then image_url, then null
        if (article.images && Array.isArray(article.images) && article.images.length > 0) {
            const firstImage = article.images[0];
            if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
                return getThumbnailUrl(firstImage.trim());
            }
        }
        
        if (article.image_url && typeof article.image_url === 'string' && article.image_url.trim()) {
            return getThumbnailUrl(article.image_url.trim());
        }
        
        return null;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">
            {/* Header */}
            <div className="bg-white/70 backdrop-blur-sm border-b border-blue-100">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-primary font-serif">
                            Articles & Insights
                        </h1>
                        <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
                            Thoughts on cloud architecture, DevOps best practices, and emerging
                            technologies shaping the future of software engineering.
                        </p>
                        
                        {/* Language Toggle */}
                        <div className="flex justify-center gap-2 mb-8">
                            <Link
                                href="/articles"
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
                            >
                                🇺🇸 English
                            </Link>
                            <Link
                                href="/id/articles"
                                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                🇮🇩 Bahasa Indonesia
                            </Link>
                        </div>

                        {/* Search */}
                        <div className="max-w-md mx-auto relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Loading articles...</p>
                    </div>
                ) : filteredArticles.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="card max-w-md mx-auto">
                            <div className="p-8">
                                {searchTerm ? (
                                    <>
                                        <Filter className="mx-auto mb-4 text-gray-400" size={48} />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
                                        <p className="text-gray-500">
                                            No articles match your search for "{searchTerm}". Try different keywords.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles yet</h3>
                                        <p className="text-gray-500">Check back soon for new content!</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Results count */}
                        <div className="mb-8">
                            <p className="text-slate-600">
                                {searchTerm ? (
                                    <>Showing {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''} for "{searchTerm}"</>
                                ) : (
                                    <>{filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} available</>
                                )}
                            </p>
                        </div>

                        {/* Articles grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredArticles.map((article) => (
                                <Link
                                    key={article.id}
                                    href={`/${article.slug}`}
                                    className="group card card-hover"
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
                                        ) : (
                                            <div className="aspect-[16/10] bg-gradient-to-br from-blue-100 to-emerald-100 flex items-center justify-center">
                                                <span className="text-4xl">📝</span>
                                            </div>
                                        );
                                    })()}

                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(article.published_at).toLocaleDateString('en-US', {
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
                                            Read Article
                                            <ArrowRight
                                                size={14}
                                                className="group-hover/link:translate-x-1 transition-transform"
                                            />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}