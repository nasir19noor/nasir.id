import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

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
          c.approved, 
          c.created_at,
          a.title as article_title,
          a.slug as article_slug
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
      SELECT id, name, website, comment, created_at
      FROM comments 
      WHERE article_id = ${articleId} AND approved = true
      ORDER BY created_at DESC
    `;

    console.log(`✅ [COMMENTS] Found ${comments.length} approved comments`);
    return NextResponse.json(comments);
  } catch (error) {
    console.error('💥 [COMMENTS] Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/comments - Submit a new comment (public)
export async function POST(request: Request) {
  try {
    console.log('📝 [COMMENTS] Receiving new comment submission');
    
    const { articleId, name, email, website, comment } = await request.json();

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
      SELECT id FROM articles WHERE id = ${articleId} LIMIT 1
    `;

    if (articleCheck.length === 0) {
      console.log('❌ [COMMENTS] Article not found');
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    console.log(`📝 [COMMENTS] Inserting comment for article ${articleId} by ${name}`);

    // Insert comment (pending approval)
    const result = await sql`
      INSERT INTO comments (article_id, name, email, website, comment, approved)
      VALUES (${articleId}, ${name}, ${email}, ${website || null}, ${comment}, false)
      RETURNING id, created_at
    `;

    console.log(`✅ [COMMENTS] Comment submitted successfully, ID: ${result[0].id}`);

    return NextResponse.json({ 
      message: 'Comment submitted successfully! It will be visible after approval.',
      id: result[0].id
    }, { status: 201 });

  } catch (error) {
    console.error('💥 [COMMENTS] Error submitting comment:', error);
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 });
  }
}