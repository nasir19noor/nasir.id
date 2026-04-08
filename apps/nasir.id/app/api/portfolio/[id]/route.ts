import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const [project] = await sql`
      SELECT id, project_title, description, image_url, images, tech_stack, live_link 
      FROM portfolio 
      WHERE id = ${parseInt(id)}
    `;

        if (!project) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error('Error fetching portfolio item:', error);
        return NextResponse.json({ error: 'Failed to fetch portfolio item' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: RouteParams) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { project_title, description, image_url, images, tech_stack, live_link } = await request.json();

        const techArray = Array.isArray(tech_stack) ? tech_stack : (tech_stack || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const imagesArray = Array.isArray(images) ? images : [];

        const [project] = await sql`
      UPDATE portfolio 
      SET project_title = ${project_title}, description = ${description || ''}, 
          image_url = ${image_url || ''}, images = ${imagesArray}, tech_stack = ${techArray}, live_link = ${live_link || ''}
      WHERE id = ${parseInt(id)}
      RETURNING id, project_title, description, image_url, images, tech_stack, live_link
    `;

        if (!project) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error('Error updating portfolio item:', error);
        return NextResponse.json({ error: 'Failed to update portfolio item' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const [project] = await sql`
      DELETE FROM portfolio WHERE id = ${parseInt(id)} RETURNING id
    `;

        if (!project) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting portfolio item:', error);
        return NextResponse.json({ error: 'Failed to delete portfolio item' }, { status: 500 });
    }
}
