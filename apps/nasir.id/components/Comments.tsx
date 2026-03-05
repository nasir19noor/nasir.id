'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Send, User, Globe, Calendar } from 'lucide-react';

interface Comment {
  id: number;
  name: string;
  website?: string;
  comment: string;
  created_at: string;
}

interface CommentsProps {
  articleId: number;
  articleTitle: string;
}

export default function Comments({ articleId, articleTitle }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    website: '',
    comment: ''
  });

  useEffect(() => {
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    try {
      console.log(`📝 [COMMENTS] Fetching comments for article ${articleId}`);
      const res = await fetch(`/api/comments?articleId=${articleId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
        console.log(`✅ [COMMENTS] Loaded ${data.length} comments`);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      console.log('📝 [COMMENTS] Submitting new comment');
      
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          ...form
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setForm({ name: '', email: '', website: '', comment: '' });
        setShowForm(false);
        console.log('✅ [COMMENTS] Comment submitted successfully');
      } else {
        setError(data.error || 'Failed to submit comment');
        console.error('❌ [COMMENTS] Submission failed:', data.error);
      }
    } catch (err) {
      setError('Failed to submit comment');
      console.error('💥 [COMMENTS] Submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-16 pt-8 border-t border-white/10">
      {/* Comments Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <MessageCircle className="text-blue-400" size={28} />
          Comments ({comments.length})
        </h3>
        
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <MessageCircle size={16} />
            Add Comment
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 rounded-lg text-green-300">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {/* Comment Form */}
      {showForm && (
        <div className="mb-8 p-6 bg-gray-900/50 border border-gray-700 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white">Leave a Comment</h4>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
                <p className="text-xs text-gray-500 mt-1">Email will not be published</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Website (optional)
              </label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Comment *
              </label>
              <textarea
                required
                rows={4}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Share your thoughts about this article..."
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Comments are moderated and will appear after approval.
              </p>
              
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                <Send size={16} />
                {submitting ? 'Submitting...' : 'Submit Comment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="mx-auto mb-4 text-gray-600" size={48} />
          <p className="text-gray-400 text-lg">No comments yet</p>
          <p className="text-gray-500 text-sm mt-2">
            Be the first to share your thoughts about this {articleTitle.includes('Project') ? 'project' : 'article'}!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <div key={comment.id} className="p-6 bg-gray-900/30 border border-gray-700 rounded-xl">
              {/* Comment Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="text-white" size={20} />
                  </div>
                  
                  <div>
                    {comment.website ? (
                      <a
                        href={comment.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        {comment.name}
                        <Globe size={14} />
                      </a>
                    ) : (
                      <span className="font-semibold text-white">{comment.name}</span>
                    )}
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar size={12} />
                      {formatDate(comment.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comment Content */}
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {comment.comment}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}