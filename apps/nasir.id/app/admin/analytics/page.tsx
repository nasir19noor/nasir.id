'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Users, Eye, Monitor, Smartphone, TrendingUp } from 'lucide-react';

interface VisitorStats {
    total_visits: number;
    unique_visitors: number;
    mobile_visitors: number;
    desktop_visitors: number;
    article_views: number;
    portfolio_views: number;
}

interface PopularArticle {
    article_id: number;
    article_slug: string;
    view_count: number;
    unique_views: number;
    last_viewed: string;
}

interface DailySummary {
    date: string;
    total_visits: number;
    unique_visitors: number;
    article_views: number;
    portfolio_views: number;
    mobile_visits: number;
    desktop_visits: number;
}

interface VisitorDetail {
    id: number;
    visitor_ip: string;
    os: string;
    device_type: string;
    browser: string;
    country: string;
    city: string;
    page_type: string;
    article_slug: string;
    referrer: string;
    visited_at: string;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<VisitorStats | null>(null);
    const [popularArticles, setPopularArticles] = useState<PopularArticle[]>([]);
    const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
    const [visitorDetails, setVisitorDetails] = useState<VisitorDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);

    useEffect(() => {
        fetchAnalytics();
        setCurrentPage(1); // Reset to first page when days change
    }, [days]);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch(`/api/analytics/stats?days=${days}`, {
                credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data.visitorStats);
                setPopularArticles(data.popularArticles);
                setDailySummary(data.summary);
                setVisitorDetails(data.visitorDetails || []);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(visitorDetails.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentVisitors = visitorDetails.slice(startIndex, endIndex);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">Loading analytics...</p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    Analytics Dashboard 📊
                </h1>
                <p className="text-gray-600 mt-1">
                    Track visitor behavior and content performance
                </p>
            </div>

            {/* Time Range Selector */}
            <div className="mb-6 flex gap-2">
                {[7, 30, 90].map((d) => (
                    <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            days === d
                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                        }`}
                    >
                        Last {d} days
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl border-2 border-blue-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <Eye size={24} className="text-blue-600" />
                            </div>
                            <TrendingUp size={20} className="text-green-500" />
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">Total Visits</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.total_visits || 0}</p>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-purple-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Users size={24} className="text-purple-600" />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">Unique Visitors</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.unique_visitors || 0}</p>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-pink-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-pink-100 rounded-xl">
                                <BarChart3 size={24} className="text-pink-600" />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">Article Views</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.article_views || 0}</p>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-green-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-100 rounded-xl">
                                <Smartphone size={24} className="text-green-600" />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">Mobile Visitors</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.mobile_visitors || 0}</p>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-indigo-100 rounded-xl">
                                <Monitor size={24} className="text-indigo-600" />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">Desktop Visitors</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.desktop_visitors || 0}</p>
                    </div>

                    <div className="bg-white rounded-2xl border-2 border-orange-100 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-orange-100 rounded-xl">
                                <BarChart3 size={24} className="text-orange-600" />
                            </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">Portfolio Views</h3>
                        <p className="text-3xl font-bold text-gray-900">{stats.portfolio_views || 0}</p>
                    </div>
                </div>
            )}

            {/* Popular Articles */}
            <div className="bg-white rounded-2xl border-2 border-blue-100 p-6 mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    📈 Popular Content
                </h2>
                {popularArticles.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No article views yet</p>
                ) : (
                    <div className="space-y-3">
                        {popularArticles.map((article) => (
                            <div
                                key={article.article_id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-gray-900">{article.article_slug}</p>
                                    <p className="text-sm text-gray-500">
                                        {article.unique_views} unique views
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-blue-600">{article.view_count}</p>
                                    <p className="text-xs text-gray-500">total views</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Daily Summary */}
            <div className="bg-white rounded-2xl border-2 border-purple-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    📅 Daily Summary
                </h2>
                {dailySummary.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No data available</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Date</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Visits</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Unique</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Articles</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Portfolio</th>
                                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Mobile</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailySummary.map((day) => (
                                    <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-sm text-gray-900">
                                            {new Date(day.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                            })}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-900 text-right font-medium">
                                            {day.total_visits}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                                            {day.unique_visitors}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                                            {day.article_views}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                                            {day.portfolio_views}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 text-right">
                                            {day.mobile_visits}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detailed Visitor Records */}
            <div className="bg-white rounded-2xl border-2 border-blue-100 p-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                        🔍 Detailed Visitor Records
                    </h2>
                    <p className="text-sm text-gray-500">
                        Showing {startIndex + 1}-{Math.min(endIndex, visitorDetails.length)} of {visitorDetails.length} records
                    </p>
                </div>
                {visitorDetails.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No visitor data available</p>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">Time</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">IP</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">Location</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">Device</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">OS</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">Browser</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">Page</th>
                                        <th className="text-left py-3 px-3 font-medium text-gray-600">Referrer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentVisitors.map((visitor) => (
                                    <tr key={visitor.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-3 text-gray-900 whitespace-nowrap">
                                            {new Date(visitor.visited_at).toLocaleString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="py-3 px-3 text-gray-600 font-mono text-xs">
                                            {visitor.visitor_ip}
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">
                                            {visitor.city && visitor.country 
                                                ? `${visitor.city}, ${visitor.country}`
                                                : visitor.country || '-'}
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                visitor.device_type === 'mobile' 
                                                    ? 'bg-green-100 text-green-800' 
                                                    : visitor.device_type === 'tablet'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}>
                                                {visitor.device_type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">
                                            {visitor.os}
                                        </td>
                                        <td className="py-3 px-3 text-gray-600">
                                            {visitor.browser}
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="max-w-xs">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                    visitor.page_type === 'article' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : visitor.page_type === 'portfolio'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-pink-100 text-pink-800'
                                                }`}>
                                                    {visitor.page_type}
                                                </span>
                                                {visitor.article_slug && (
                                                    <div className="text-xs text-gray-500 mt-1 truncate">
                                                        {visitor.article_slug}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-gray-500 text-xs max-w-xs truncate">
                                            {visitor.referrer ? (
                                                <a 
                                                    href={visitor.referrer} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="hover:text-blue-600 underline"
                                                    title={visitor.referrer}
                                                >
                                                    {(() => {
                                                        try {
                                                            return new URL(visitor.referrer).hostname;
                                                        } catch {
                                                            return visitor.referrer;
                                                        }
                                                    })()}
                                                </a>
                                            ) : (
                                                'Direct'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                
                                {/* Page numbers */}
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => goToPage(pageNum)}
                                                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                                    currentPage === pageNum
                                                        ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                                        : 'border border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    )}
                </>
                )}
            </div>
        </div>
    );
}
