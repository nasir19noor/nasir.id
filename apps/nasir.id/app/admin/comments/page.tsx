'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Check, X, Trash2, ExternalLink, Calendar, User } from 'lucide-react';

interface Comment {
  id: number;
  article_id: number;
  name: string;
  email: string;
  website?: string;
  comment: string;
  approved: boolean;
  created_at: string;
  article_title: string;
  article_slug: string;
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const res = await fetch('/api/comments?admin=true', {
        credentials: 'include'
      });
      
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      } else {
        setError('Failed to load comments');
      }
    } catch (err) {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const updateComment = async (id: number, approved: boolean) => {
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved })
      });

      if (res.ok) {
        setComments(comments.map(comment => 
          comment.id === id ? { ...comment, approved } : comment
        ));
        setSuccess(`Comment ${approved ? 'approved' : 'rejected'} successfully`);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update comment');
      }
    } catch (err) {
      setError('Failed to update comment');
    }
  };

  const deleteComment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        setComments(comments.filter(comment => comment.id !== id));
        setSuccess('Comment deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete comment');
      }
    } catch (err) {
      setError('Failed to delete comment');
    }
  };

  const filteredComments = comments.filter(comment => {
    if (filter === 'pending') return !comment.approved;
    if (filter === 'approved') return comment.approved;
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const pendingCount = comments.filter(c => !c.approved).length;
  const approvedCount = comments.filter(c => c.approved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
          Comments Management 💬
        </h1>
        <p className="text-gray-600 mt-1">
          Moderate and manage comments from your articles and portfolio
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-100 p-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-blue-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Total Comments</p>
              <p className="text-2xl font-bold text-gray-900">{comments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-yellow-100 p-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-yellow-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-green-100 p-6">
          <div className="flex items-center gap-3">
            <Check className="text-green-600" size={24} />
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-100 rounded-xl text-green-600 text-sm">
          {success}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({comments.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Approved ({approvedCount})
          </button>
        </div>
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-gray-100">
          <MessageCircle className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 text-lg">No comments found</p>
          <p className="text-gray-400 text-sm mt-2">
            {filter === 'pending' ? 'No comments pending approval' : 
             filter === 'approved' ? 'No approved comments yet' : 
             'No comments have been submitted yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl border-2 p-6 ${
                comment.approved ? 'border-green-100' : 'border-yellow-100'
              }`}
            >
              {/* Comment Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <User className="text-white" size={20} />
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {comment.website ? (
                        <a
                          href={comment.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                        >
                          {comment.name}
                          <ExternalLink size={14} />
                        </a>
                      ) : (
                        <span className="font-semibold text-gray-900">{comment.name}</span>
                      )}
                      
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        comment.approved 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {comment.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>{comment.email}</div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(comment.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!comment.approved && (
                    <button
                      onClick={() => updateComment(comment.id, true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      title="Approve Comment"
                    >
                      <Check size={14} />
                      Approve
                    </button>
                  )}
                  
                  {comment.approved && (
                    <button
                      onClick={() => updateComment(comment.id, false)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      title="Unapprove Comment"
                    >
                      <X size={14} />
                      Unapprove
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteComment(comment.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    title="Delete Comment"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Article Reference */}
              <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Comment on:{' '}
                  <a
                    href={`/articles/${comment.article_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {comment.article_title}
                  </a>
                </p>
              </div>

              {/* Comment Content */}
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                {comment.comment}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}