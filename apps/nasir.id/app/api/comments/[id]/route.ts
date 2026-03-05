import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/comments/[id] - Approve/reject comment (admin only)
export async function PUT(request: Request, { params }: RouteParams) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { approved } = await request.json();

    console.log(`🔧 [COMMENTS] Admin ${approved ? 'approving' : 'rejecting'} comment ${id}`);

    const result = await sql`
      UPDATE comments 
      SET approved = ${approved}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, approved
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    console.log(`✅ [COMMENTS] Comment ${id} ${approved ? 'approved' : 'rejected'}`);
    return NextResponse.json({ 
      message: `Comment ${approved ? 'approved' : 'rejected'} successfully`,
      comment: result[0]
    });

  } catch (error) {
    console.error('💥 [COMMENTS] Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

// DELETE /api/comments/[id] - Delete comment (admin only)
export async function DELETE(request: Request, { params }: RouteParams) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    console.log(`🗑️ [COMMENTS] Admin deleting comment ${id}`);

    const result = await sql`
      DELETE FROM comments WHERE id = ${id}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    console.log(`✅ [COMMENTS] Comment ${id} deleted successfully`);
    return NextResponse.json({ message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('💥 [COMMENTS] Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}