'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, FileText } from 'lucide-react';

interface Article {
    id: number;
    title: string;
    slug: string;
    summary: string;
    content?: string;
    image_url?: string;
    images?: string[];
    published_at: string;
    is_portfolio: boolean;
}

interface FormData {
    title: string;
    slug: string;
    summary: string;
    content: string;
    image_url: string;
    images: string[];
    is_portfolio: boolean;
}

const emptyForm: FormData = { title: '', slug: '', summary: '', content: '', image_url: '', images: [], is_portfolio: false };

export default function AdminArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<number | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const fetchArticles = useCallback(async () => {
        try {
            const res = await fetch('/api/articles', {
                cache: 'no-store',
                credentials: 'include'
            });
            if (res.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            if (!res.ok) {
                throw new Error('Failed to fetch');
            }
            const data = await res.json();
            setArticles(data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load articles');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchArticles();
    }, [fetchArticles]);

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    };

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEdit = async (id: number) => {
        try {
            const res = await fetch(`/api/articles/${id}`, {
                cache: 'no-store',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('Failed to fetch article');
            }
            const data = await res.json();
            setEditing(id);
            setForm({
                title: data.title,
                slug: data.slug,
                summary: data.summary || '',
                content: data.content || '',
                image_url: data.image_url || '',
                images: data.images || [],
                is_portfolio: data.is_portfolio || false,
            });
            setError('');
            setShowModal(true);
        } catch (err) {
            console.error('Edit error:', err);
            setError('Failed to load article');
        }
    };

    const handleSave = async () => {
        if (!form.title || !form.slug || !form.content) {
            setError('Title, slug, and content are required');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const url = editing ? `/api/articles/${editing}` : '/api/articles';
            const method = editing ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: 'Failed to save' }));
                throw new Error(data.error || 'Failed to save');
            }

            setShowModal(false);
            setForm(emptyForm);
            fetchArticles();
        } catch (err) {
            console.error('Save error:', err);
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            });

            if (!res.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await res.json();
            setForm({ ...form, image_url: data.url });
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setError('');

        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                });

                if (!res.ok) {
                    throw new Error('Failed to upload image');
                }

                const data = await res.json();
                uploadedUrls.push(data.url);
            }

            setForm({ ...form, images: [...form.images, ...uploadedUrls] });
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload images');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (index: number) => {
        const newImages = form.images.filter((_, i) => i !== index);
        setForm({ ...form, images: newImages });
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this article?')) return;

        try {
            const res = await fetch(`/api/articles/${id}`, { 
                method: 'DELETE',
                credentials: 'include'
            });
            if (!res.ok) {
                throw new Error('Failed to delete');
            }
            fetchArticles();
        } catch (err) {
            console.error('Delete error:', err);
            setError('Failed to delete article');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Articles & Portfolio</h1>
                    <p className="text-gray-500 mt-1">
                        Manage your blog articles and portfolio projects
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    <Plus size={18} />
                    New Article/Project
                </button>
            </div>

            {error && !showModal && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Articles List */}
            {loading ? (
                <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : articles.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No articles yet
                    </h3>
                    <p className="text-gray-500 mb-6">
                        Create your first article to get started.
                    </p>
                    <button
                        onClick={openCreate}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Create Article
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                                    Title
                                </th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                                    Type
                                </th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                                    Slug
                                </th>
                                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                                    Published
                                </th>
                                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {articles.map((article) => (
                                <tr
                                    key={article.id}
                                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-gray-900">
                                            {article.title}
                                        </span>
                                        {article.summary && (
                                            <p className="text-sm text-gray-400 mt-0.5 truncate max-w-xs">
                                                {article.summary}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            article.is_portfolio 
                                                ? 'bg-purple-100 text-purple-800' 
                                                : 'bg-blue-100 text-blue-800'
                                        }`}>
                                            {article.is_portfolio ? '📁 Portfolio' : '📝 Article'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <code className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                            {article.slug}
                                        </code>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(article.published_at).toLocaleDateString(
                                            'en-US',
                                            { month: 'short', day: 'numeric', year: 'numeric' }
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(article.id)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Edit"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(article.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-12 px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {editing ? 'Edit Article' : 'New Article'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {error && (
                                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => {
                                        const title = e.target.value;
                                        setForm({
                                            ...form,
                                            title,
                                            slug: editing ? form.slug : generateSlug(title),
                                        });
                                    }}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Article title"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Slug
                                </label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="article-url-slug"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Summary
                                </label>
                                <textarea
                                    value={form.summary}
                                    onChange={(e) =>
                                        setForm({ ...form, summary: e.target.value })
                                    }
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder="Brief summary of the article"
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <input
                                    type="checkbox"
                                    id="is_portfolio"
                                    checked={form.is_portfolio}
                                    onChange={(e) =>
                                        setForm({ ...form, is_portfolio: e.target.checked })
                                    }
                                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                />
                                <label htmlFor="is_portfolio" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    📁 This is a portfolio project (will show in Portfolio section)
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Featured Image
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    disabled={uploading}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                {uploading && (
                                    <p className="text-sm text-blue-600 mt-1">Uploading...</p>
                                )}
                                {form.image_url && (
                                    <div className="mt-2">
                                        <img
                                            src={form.image_url}
                                            alt="Preview"
                                            className="h-32 rounded-lg object-cover"
                                        />
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Additional Images (Multiple)
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleMultipleImagesUpload}
                                    disabled={uploading}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                {uploading && (
                                    <p className="text-sm text-blue-600 mt-1">Uploading images...</p>
                                )}
                                {form.images.length > 0 && (
                                    <div className="mt-2 grid grid-cols-4 gap-2">
                                        {form.images.map((url, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={url}
                                                    alt={`Image ${index + 1}`}
                                                    className="h-20 w-full rounded-lg object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Content (HTML)
                                </label>
                                <textarea
                                    value={form.content}
                                    onChange={(e) =>
                                        setForm({ ...form, content: e.target.value })
                                    }
                                    rows={14}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-none"
                                    placeholder="<h1>Your HTML content here...</h1><p>Write your article content using HTML tags.</p>"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                <Save size={16} />
                                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
