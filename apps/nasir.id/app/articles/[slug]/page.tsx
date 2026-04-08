import sql from '@/lib/db';
import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticleRedirect({ params }: PageProps) {
  const { slug } = await params;
  
  // Redirect to the new clean URL structure
  redirect(`/${slug}`);
}