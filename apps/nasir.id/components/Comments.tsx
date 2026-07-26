'use client';

import { useState, useEffect } from 'react';
import { MessageCircle, Send, User, Globe, Calendar, Reply, ShieldCheck } from 'lucide-react';

interface Comment {
  id: number;
  parent_id: number | null;
  name: string;
  website?: string;
  comment: string;
  created_at: string;
  replies: Comment[];
}

interface CommentsProps {
  articleId: number;
  articleTitle: string;
}

interface FormValues {
  name: string;
  email: string;
  website: string;
  comment: string;
}

const EMPTY_FORM: FormValues = { name: '', email: '', website: '', comment: '' };

// Groups the flat, approved-only list the API returns into a reply tree.
// Top-level threads newest first; replies within a thread oldest first, so a
// conversation reads top-to-bottom the way it happened.
function buildCommentTree(flat: Omit<Comment, 'replies'>[]): Comment[] {
  const byId = new Map<number, Comment>();
  flat.forEach((c) => byId.set(c.id, { ...c, replies: [] }));

  const roots: Comment[] = [];
  byId.forEach((c) => {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id)!.replies.push(c);
    } else {
      roots.push(c);
    }
  });

  const byCreatedAsc = (a: Comment, b: Comment) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  byId.forEach((c) => c.replies.sort(byCreatedAsc));
  roots.sort((a, b) => byCreatedAsc(b, a));

  return roots;
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function CommentForm({
  isAdmin,
  submitting,
  submitLabel,
  placeholder,
  onSubmit,
  onCancel,
}: {
  isAdmin: boolean;
  submitting: boolean;
  submitLabel: string;
  placeholder: string;
  onSubmit: (values: FormValues) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      {isAdmin ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          <ShieldCheck size={16} />
          Replying as admin (nasir19noor@gmail.com)
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
              <p className="text-xs text-slate-500 mt-1">
                Email will not be published. Used only to notify you of replies.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website (optional)</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://yourwebsite.com"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {isAdmin ? 'Reply *' : 'Comment *'}
        </label>
        <textarea
          required
          rows={4}
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder={placeholder}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        {!isAdmin ? (
          <p className="text-xs text-slate-500">Comments are moderated and will appear after approval.</p>
        ) : <span />}

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Send size={16} />
            {submitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

function CommentNode({
  comment,
  depth,
  isAdmin,
  replyingTo,
  submitting,
  onStartReply,
  onCancelReply,
  onSubmitReply,
}: {
  comment: Comment;
  depth: number;
  isAdmin: boolean;
  replyingTo: number | null;
  submitting: boolean;
  onStartReply: (id: number) => void;
  onCancelReply: () => void;
  onSubmitReply: (parentId: number, values: FormValues) => void;
}) {
  return (
    <div id={`comment-${comment.id}`} className={depth > 0 ? 'mt-4 ml-6 sm:ml-10' : ''}>
      <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        {/* Comment Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-none">
              <User className="text-white" size={20} />
            </div>

            <div>
              {comment.website ? (
                <a
                  href={comment.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                >
                  {comment.name}
                  <Globe size={14} />
                </a>
              ) : (
                <span className="font-semibold text-slate-900">{comment.name}</span>
              )}

              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar size={12} />
                {formatDate(comment.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Comment Content */}
        <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{comment.comment}</div>

        {/* Reply toggle */}
        <button
          onClick={() => (replyingTo === comment.id ? onCancelReply() : onStartReply(comment.id))}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          <Reply size={14} />
          {replyingTo === comment.id ? 'Cancel' : 'Reply'}
        </button>

        {replyingTo === comment.id && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <CommentForm
              isAdmin={isAdmin}
              submitting={submitting}
              submitLabel="Post Reply"
              placeholder={`Replying to ${comment.name}...`}
              onCancel={onCancelReply}
              onSubmit={(values) => onSubmitReply(comment.id, values)}
            />
          </div>
        )}
      </div>

      {comment.replies.map((reply) => (
        <CommentNode
          key={reply.id}
          comment={reply}
          depth={depth + 1}
          isAdmin={isAdmin}
          replyingTo={replyingTo}
          submitting={submitting}
          onStartReply={onStartReply}
          onCancelReply={onCancelReply}
          onSubmitReply={onSubmitReply}
        />
      ))}
    </div>
  );
}

export default function Comments({ articleId, articleTitle }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchComments();
    checkAdminStatus();
  }, [articleId]);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(!!data.authenticated);
      }
    } catch (err) {
      // Not logged in / status check failed -- treat as a regular visitor.
      setIsAdmin(false);
    }
  };

  const fetchComments = async () => {
    try {
      console.log(`📝 [COMMENTS] Fetching comments for article ${articleId}`);
      const res = await fetch(`/api/comments?articleId=${articleId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(buildCommentTree(data));
        console.log(`✅ [COMMENTS] Loaded ${data.length} comments`);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = (nodes: Comment[]): number =>
    nodes.reduce((sum, c) => sum + 1 + totalCount(c.replies), 0);

  const submitComment = async (values: FormValues, parentId: number | null) => {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          articleId,
          parentId,
          ...(isAdmin
            ? { name: 'admin', email: 'nasir19noor@gmail.com', comment: values.comment }
            : values),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setShowForm(false);
        setReplyingTo(null);
        // Admin replies are auto-approved and visible immediately; regular
        // comments still wait for moderation, so only refetch for the former.
        if (data.approved) {
          fetchComments();
        }
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

  const commentCount = totalCount(comments);

  return (
    <div className="mt-16 pt-8 border-t border-slate-200">
      {/* Comments Header */}
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <MessageCircle className="text-blue-600" size={28} />
          Comments ({commentCount})
        </h3>

        {!showForm && (
          <button
            onClick={() => {
              setReplyingTo(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <MessageCircle size={16} />
            Add Comment
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Top-level Comment Form */}
      {showForm && (
        <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-slate-900">Leave a Comment</h4>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-700 transition-colors"
            >
              ✕
            </button>
          </div>

          <CommentForm
            isAdmin={isAdmin}
            submitting={submitting}
            submitLabel="Submit Comment"
            placeholder="Share your thoughts about this article..."
            onSubmit={(values) => submitComment(values, null)}
          />
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle className="mx-auto mb-4 text-slate-300" size={48} />
          <p className="text-slate-600 text-lg">No comments yet</p>
          <p className="text-slate-400 text-sm mt-2">
            Be the first to share your thoughts about this {articleTitle.includes('Project') ? 'project' : 'article'}!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              depth={0}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              submitting={submitting}
              onStartReply={(id) => {
                setShowForm(false);
                setReplyingTo(id);
              }}
              onCancelReply={() => setReplyingTo(null)}
              onSubmitReply={(parentId, values) => submitComment(values, parentId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
