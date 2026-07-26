import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';
import { sendCommentReplyNotification } from '@/lib/mail';

// The admin never fills out a name/email to comment -- replies posted while
// logged in are always attributed to these, regardless of what the client sends.
const ADMIN_NAME = 'admin';
const ADMIN_EMAIL = 'nasir19noor@gmail.com';
const ADMIN_AVATAR = '🛡️';

// Commenters pick one of these instead of uploading an image -- keeps the
// feature moderation-free and avoids needing image storage for avatars.
// Kept in sync with AVATAR_OPTIONS in components/Comments.tsx.
const AVATAR_OPTIONS = ['😀', '😎', '🤓', '🥳', '🦊', '🐱', '🐼', '🚀'];
const DEFAULT_AVATAR = AVATAR_OPTIONS[0];

// GET /api/comments - Get comments for an article (public, only approved comments)
// GET /api/comments?admin=true - Get all comments for admin (requires authentication)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get('articleId');
  const isAdmin = searchParams.get('admin') === 'true';

  // Admin endpoint - requires authentication
  if (isAdmin) {
    const authed = await isAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      console.log('🔧 [COMMENTS] Admin fetching all comments');
      
      const comments = await sql`
        SELECT 
          c.id, 
          c.article_id, 
          c.name, 
          c.email, 
          c.website,
          c.comment,
          c.avatar,
          c.approved,
          c.created_at,
          a.title as article_title,
          a.slug as article_slug,
          a.language as article_language
        FROM comments c
        JOIN articles a ON c.article_id = a.id
        ORDER BY c.created_at DESC
      `;

      console.log(`✅ [COMMENTS] Admin found ${comments.length} total comments`);
      return NextResponse.json(comments);
    } catch (error) {
      console.error('💥 [COMMENTS] Error fetching admin comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
  }

  // Public endpoint - only approved comments for specific article
  if (!articleId) {
    return NextResponse.json({ error: 'Article ID is required' }, { status: 400 });
  }

  try {
    console.log(`📝 [COMMENTS] Fetching comments for article ${articleId}`);
    
    const comments = await sql`
      SELECT id, parent_id, name, website, comment, avatar, created_at
      FROM comments
      WHERE article_id = ${articleId} AND approved = true
      ORDER BY created_at ASC
    `;

    console.log(`✅ [COMMENTS] Found ${comments.length} approved comments`);
    return NextResponse.json(comments);
  } catch (error) {
    console.error('💥 [COMMENTS] Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/comments - Submit a new comment, or a reply when parentId is set (public)
export async function POST(request: Request) {
  try {
    console.log('📝 [COMMENTS] Receiving new comment submission');

    const body = await request.json();
    const { articleId, comment, parentId } = body;
    let { name, email, website, avatar } = body;

    // Logged-in admin replies skip the name/email/avatar form entirely -- the
    // identity comes from the session, never from client-supplied fields.
    const isAdmin = await isAuthenticated();
    if (isAdmin) {
      name = ADMIN_NAME;
      email = ADMIN_EMAIL;
      avatar = ADMIN_AVATAR;
    } else if (!AVATAR_OPTIONS.includes(avatar)) {
      // Ignore anything outside the picker's allow-list rather than reject
      // the whole comment over it.
      avatar = DEFAULT_AVATAR;
    }

    // Validation
    if (!articleId || !name || !email || !comment) {
      console.log('❌ [COMMENTS] Missing required fields');
      return NextResponse.json({
        error: 'Article ID, name, email, and comment are required'
      }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ [COMMENTS] Invalid email format');
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate article exists
    const articleCheck = await sql`
      SELECT id, title, slug, language FROM articles WHERE id = ${articleId} LIMIT 1
    `;

    if (articleCheck.length === 0) {
      console.log('❌ [COMMENTS] Article not found');
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    const article = articleCheck[0];

    // Validate the parent comment (if this is a reply) and grab who to notify.
    let parent: { id: number; name: string; email: string } | null = null;
    if (parentId) {
      const parentRows = await sql`
        SELECT id, name, email FROM comments
        WHERE id = ${parentId} AND article_id = ${articleId}
        LIMIT 1
      `;
      if (parentRows.length === 0) {
        console.log('❌ [COMMENTS] Parent comment not found');
        return NextResponse.json({ error: 'The comment you are replying to was not found' }, { status: 404 });
      }
      parent = parentRows[0] as { id: number; name: string; email: string };
    }

    console.log(`📝 [COMMENTS] Inserting ${parent ? 'reply' : 'comment'} for article ${articleId} by ${name}`);

    // Admin comments/replies are auto-approved -- they're already the site
    // owner's own words, there's nothing to moderate.
    const result = await sql`
      INSERT INTO comments (article_id, parent_id, name, email, website, comment, avatar, approved)
      VALUES (${articleId}, ${parentId || null}, ${name}, ${email}, ${website || null}, ${comment}, ${avatar}, ${isAdmin})
      RETURNING id, created_at
    `;

    console.log(`✅ [COMMENTS] Comment submitted successfully, ID: ${result[0].id}`);

    // Best-effort notification to the person being replied to. Skipped when
    // replying to your own comment (e.g. admin following up on their own reply).
    if (parent && parent.email && parent.email.toLowerCase() !== email.toLowerCase()) {
      const path = article.language === 'id' ? `/id/${article.slug}` : `/${article.slug}`;
      await sendCommentReplyNotification({
        to: parent.email,
        toName: parent.name,
        replierName: name,
        replyText: comment,
        articleTitle: article.title,
        articleUrl: `https://nasir.id${path}#comment-${result[0].id}`,
      });
    }

    return NextResponse.json({
      message: isAdmin
        ? 'Reply posted.'
        : 'Comment submitted successfully! It will be visible after approval.',
      id: result[0].id,
      approved: isAdmin,
    }, { status: 201 });

  } catch (error) {
    console.error('💥 [COMMENTS] Error submitting comment:', error);
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 });
  }
}