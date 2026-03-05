import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import sql from '@/lib/db';
import { FileText, Eye, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
    const authed = await isAuthenticated();
    if (!authed) redirect('/admin/login');

    // Fetch article statistics
    const articleStats = await sql`
        SELECT 
            COUNT(*) as total_articles,
            COUNT(CASE WHEN is_portfolio = false THEN 1 END) as blog_articles,
            COUNT(CASE WHEN is_portfolio = true THEN 1 END) as portfolio_projects
        FROM articles
    `;

    const stats = articleStats[0] || { total_articles: 0, blog_articles: 0, portfolio_projects: 0 };

    // Fetch recent articles
    const recentArticles = await sql`
        SELECT id, title, slug, is_portfolio, published_at
        FROM articles
        ORDER BY published_at DESC
        LIMIT 5
    `;

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                    Dashboard ✨
                </h1>
                <p className="text-gray-600 mt-1">
                    Welcome back! Time to create some magic 🪄
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-pink-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl text-pink-600">
                            <FileText size={24} />
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium mb-1">Total Content</h3>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_articles}</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl text-blue-600">
                            <FileText size={24} />
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium mb-1">Blog Articles</h3>
                    <p className="text-3xl font-bold text-gray-900">{stats.blog_articles}</p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-purple-100 p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl text-purple-600">
                            <FileText size={24} />
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium mb-1">Portfolio Projects</h3>
                    <p className="text-3xl font-bold text-gray-900">{stats.portfolio_projects}</p>
                </div>
            </div>

            {/* Recent Articles */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-pink-100 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Recent Content 📚</h2>
                    <Link
                        href="/admin/articles"
                        className="text-sm text-pink-600 hover:text-pink-700 font-medium"
                    >
                        View All →
                    </Link>
                </div>

                {recentArticles.length === 0 ? (
                    <div className="text-center py-12">
                        <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-4">No content yet</p>
                        <Link
                            href="/admin/articles"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl font-medium text-sm"
                        >
                            Create Your First Article
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentArticles.map((article) => (
                            <Link
                                key={article.id}
                                href="/admin/articles"
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-medium text-gray-900 group-hover:text-pink-600 transition-colors">
                                            {article.title}
                                        </h3>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                            article.is_portfolio 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {article.is_portfolio ? '📁 Portfolio' : '📝 Article'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        {new Date(article.published_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                                <div className="text-gray-400 group-hover:text-pink-600 transition-colors">
                                    →
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
