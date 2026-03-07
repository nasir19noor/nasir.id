'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Calendar } from 'lucide-react';
import Image from 'next/image';
import { getThumbnailUrl } from '@/lib/image-utils';

interface PortfolioItem {
    id: number;
    project_title: string;
    description: string;
    image_url: string;
    images: string[];
    slug: string;
    published_at: string;
}

interface PortfolioSectionProps {
    language?: string;
}

export default function PortfolioSection({ language = 'en' }: PortfolioSectionProps) {
    const [projects, setProjects] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPortfolio() {
            try {
                const res = await fetch(`/api/public/portfolio/${language}`);
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                }
            } catch (error) {
                console.error('Error fetching portfolio:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchPortfolio();
    }, [language]);

    // Extract plain text from HTML for summary
    const getTextSummary = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || '';
        return text.length > 150 ? text.substring(0, 150) + '...' : text;
    };

    // Helper function to get the best image URL for a portfolio item
    const getPortfolioImageUrl = (project: PortfolioItem): string | null => {
        // Priority: images array first, then image_url, then null
        if (project.images && Array.isArray(project.images) && project.images.length > 0) {
            const firstImage = project.images[0];
            if (firstImage && typeof firstImage === 'string' && firstImage.trim()) {
                return getThumbnailUrl(firstImage.trim());
            }
        }
        
        if (project.image_url && typeof project.image_url === 'string' && project.image_url.trim()) {
            return getThumbnailUrl(project.image_url.trim());
        }
        
        return null;
    };

    return (
        <section id="portfolio" className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center gradient-text-secondary font-serif">
                    {language === 'id' ? 'Proyek Unggulan' : 'Featured Projects'}
                </h2>
                <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto text-lg">
                    {language === 'id'
                        ? 'Infrastruktur cloud, otomasi DevOps, dan solusi inovatif yang mendorong transformasi bisnis dan keunggulan teknis.'
                        : 'Cloud infrastructure, DevOps automation, and innovative solutions that drive business transformation and technical excellence.'
                    }
                </p>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">{language === 'id' ? 'Memuat portfolio...' : 'Loading portfolio...'}</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-12 card">
                        <p className="text-slate-500">{language === 'id' ? 'Belum ada item portfolio. Segera hadir!' : 'No portfolio items yet. Check back soon!'}</p>
                    </div>
                ) : (
                    <>
                        {/* Portfolio grid */}
                        <div className="grid md:grid-cols-3 gap-6 mb-12">
                            {projects.map((project) => (
                                <article
                                    key={project.id}
                                    className="group card card-hover cursor-pointer"
                                    onClick={() => window.open(`/${project.slug}`, '_blank')}
                                >
                                    {/* Image */}
                                    {(() => {
                                        const imageUrl = getPortfolioImageUrl(project);
                                        return imageUrl ? (
                                            <div className="aspect-[16/10] relative overflow-hidden bg-gradient-to-br from-emerald-50 to-blue-50">
                                                <Image
                                                    src={imageUrl}
                                                    alt={project.project_title}
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
                                                {new Date(project.published_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold text-slate-900 mb-3 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                            {project.project_title}
                                        </h3>
                                        {project.description && (
                                            <p className="text-slate-600 mb-4 text-sm line-clamp-3">{getTextSummary(project.description)}</p>
                                        )}

                                        <div className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors group/link font-medium text-sm">
                                            {language === 'id' ? 'Lihat Proyek' : 'View Project'}
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
                                href={language === 'id' ? '/id/portfolio' : '/portfolio'}
                                className="btn-secondary inline-flex items-center gap-2"
                            >
                                {language === 'id' ? 'Lihat Semua Proyek' : 'View All Projects'}
                                <ArrowRight size={18} />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
