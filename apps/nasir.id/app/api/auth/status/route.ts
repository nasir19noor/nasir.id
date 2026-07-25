import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';

// GET /api/auth/status - Lets public pages (e.g. the comment form) check
// whether the current visitor is the logged-in admin, without exposing the
// httpOnly admin_token cookie itself.
export async function GET() {
    const authenticated = await isAuthenticated();
    return NextResponse.json({ authenticated });
}
