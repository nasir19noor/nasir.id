'use client';

import { useState, useEffect } from 'react';
import { Calendar, ArrowRight, Search, Filter, Briefcase } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
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

export default function PortfolioPageID() {
    const [projects, setProjects] = useState<PortfolioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredProjects, setFilteredProjects] = useState<PortfolioItem[]>([]);

    useEffect(() => {
        async function fetchPortfolio() {
            try {
                const res = await fetch('/api/public/portfolio/id');
                if (res.ok) {
                    const data = await res.json();
                    setProjects(data);
                    setFilteredProjects(data);
                }
            } catch (error) {
                console.error('Error fetching portfolio:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchPortfolio();
    }, []);

    useEffect(() => {
        const filtered = projects.filter(project =>
            project.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredProjects(filtered);
    }, [searchTerm, projects]);

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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50">
            {/* Header */}
            <div className="bg-white/70 backdrop-blur-sm border-b border-emerald-100">
                <div className="max-w-6xl mx-auto px-6 py-12">
                    <div className="text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-secondary font-serif">
                            Portfolio & Proyek
                        </h1>
                        <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
                            Infrastruktur cloud, otomasi DevOps, dan solusi inovatif
                            yang mendorong transformasi bisnis dan keunggulan teknis.
                        </p>
                        
                        {/* Language Toggle */}
                        <div className="flex justify-center gap-2 mb-8">
                            <Link
                                href="/portfolio"
                                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                            >
                                🇺🇸 English
                            </Link>
                            <Link
                                href="/id/portfolio"
                                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium"
                            >
                                🇮🇩 Bahasa Indonesia
                            </Link>
                        </div>

                        {/* Search */}
                        <div className="max-w-md mx-auto relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Cari proyek..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-slate-500">Memuat proyek...</p>
                    </div>
                ) : filteredProjects.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="card max-w-md mx-auto">
                            <div className="p-8">
                                {searchTerm ? (
                                    <>
                                        <Filter className="mx-auto mb-4 text-gray-400" size={48} />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Proyek tidak ditemukan</h3>
                                        <p className="text-gray-500">
                                            Tidak ada proyek yang cocok dengan pencarian "{searchTerm}". Coba kata kunci lain.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum ada proyek</h3>
                                        <p className="text-gray-500">Segera hadir proyek baru!</p>
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
                                    <>Menampilkan {filteredProjects.length} hasil untuk "{searchTerm}"</>
                                ) : (
                                    <>{filteredProjects.length} proyek tersedia</>
                                )}
                            </p>
                        </div>

                        {/* Projects grid */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <Link
                                    key={project.id}
                                    href={`/id/${project.slug}`}
                                    className="group card card-hover"
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
                                        ) : (
                                            <div className="aspect-[16/10] bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center">
                                                <span className="text-4xl">💼</span>
                                            </div>
                                        );
                                    })()}

                                    {/* Content */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(project.published_at).toLocaleDateString('id-ID', {
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
                                            Lihat Proyek
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