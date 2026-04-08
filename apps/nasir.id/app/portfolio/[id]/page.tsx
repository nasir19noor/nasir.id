import sql from '@/lib/db';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PortfolioRedirect({ params }: PageProps) {
  const { id } = await params;
  
  // Look up the slug for this portfolio item
  try {
    const results = await sql`
      SELECT slug FROM articles WHERE id = ${id} AND is_portfolio = true LIMIT 1
    `;
    
    if (results && results.length > 0) {
      // Redirect to the new clean URL structure
      redirect(`/${results[0].slug}`);
    } else {
      // If not found, redirect to home
      redirect('/');
    }
  } catch (error) {
    // If error, redirect to home
    redirect('/');
  }
}
