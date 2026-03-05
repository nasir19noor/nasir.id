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
    slug: string;
    published_at: string;
}

export default function PortfolioSection() {
    const [projects, setProjects] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPortfolio() {
            try {
                const res = await fetch('/api/public/portfolio');
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
    }, []);

    // Extract plain text from HTML for summary
    const getTextSummary = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        const text = div.textContent || div.innerText || '';
        return text.length > 150 ? text.substring(0, 150) + '...' : text;
    };

    return (
        <section id="portfolio" className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
                    Portfolio 🎨
                </h2>
                <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
                    Cloud infrastructure, DevOps automation, and AI/ML integration
                    projects that deliver measurable business impact.
                </p>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading portfolio...</p>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border-2 border-blue-100">
                        <p className="text-gray-500">No portfolio items yet. Check back soon! 🚀</p>
                    </div>
                ) : (
                    <>
                        {/* Portfolio grid */}
                        <div className="grid md:grid-cols-2 gap-8 mb-12">
                            {projects.map((project) => (
                                <article
                                    key={project.id}
                                    className="group bg-white rounded-2xl overflow-hidden border-2 border-purple-100 hover:border-purple-300 transition-all hover:shadow-xl hover:shadow-purple-100 hover:scale-105"
                                >
                                    {/* Image */}
                                    {project.image_url && (
                                        <div className="aspect-[16/9] relative overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
                                            <Image
                                                src={getThumbnailUrl(project.image_url)}
                                                alt={project.project_title}
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
                                                {new Date(project.published_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">
                                            {project.project_title}
                                        </h3>
                                        {project.description && (
                                            <p className="text-gray-600 mb-4">{getTextSummary(project.description)}</p>
                                        )}

                                        <a
                                            href={`/${project.slug}`}
                                            className="inline-flex items-center gap-2 text-purple-500 hover:text-purple-600 transition-colors group/link font-medium"
                                        >
                                            View Project
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
                                href="/#portfolio"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl font-medium"
                            >
                                View More Projects
                                <ArrowRight size={18} />
                            </a>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
