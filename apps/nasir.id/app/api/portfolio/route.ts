import { NextResponse } from 'next/server';
import sql from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const projects = await sql`
      SELECT id, project_title, description, image_url, images, tech_stack, live_link 
      FROM portfolio 
      ORDER BY id DESC
    `;
        return NextResponse.json(projects);
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authed = await isAuthenticated();
    if (!authed) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { project_title, description, image_url, images, tech_stack, live_link } = await request.json();

        if (!project_title) {
            return NextResponse.json(
                { error: 'Project title is required' },
                { status: 400 }
            );
        }

        const techArray = Array.isArray(tech_stack) ? tech_stack : (tech_stack || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const imagesArray = Array.isArray(images) ? images : [];

        const [project] = await sql`
      INSERT INTO portfolio (project_title, description, image_url, images, tech_stack, live_link)
      VALUES (${project_title}, ${description || ''}, ${image_url || ''}, ${imagesArray}, ${techArray}, ${live_link || ''})
      RETURNING id, project_title, description, image_url, images, tech_stack, live_link
    `;

        return NextResponse.json(project, { status: 201 });
    } catch (error) {
        console.error('Error creating portfolio item:', error);
        return NextResponse.json({ error: 'Failed to create portfolio item' }, { status: 500 });
    }
}
