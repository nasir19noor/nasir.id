import { redirect } from 'next/navigation';

export default function ArticlesPage() {
  // Redirect to home page articles section
  redirect('/#articles');
}