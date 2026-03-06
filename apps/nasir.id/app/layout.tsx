import type { Metadata } from 'next';
import './globals.css';
import { convertToAssetsUrl } from '@/lib/image-utils';

// Function to fetch settings for metadata
async function getSettings() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nasir.id';
    const response = await fetch(`${baseUrl}/api/settings`, {
      cache: 'no-store', // Always fetch fresh data for metadata
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch settings for metadata:', error);
  }
  
  // Fallback settings
  return {
    hero_title: 'Nasir Noor',
    hero_subtitle: 'Cloud Wizard 🧙‍♂️ | DevOps Ninja 🥷 | AI Explorer 🚀',
    hero_description: 'Turning coffee into infrastructure ☕ → ☁️ and making servers dance to my automation tunes 💃',
    about_image: 'https://images.unsplash.com/photo-1752859951149-7d3fc700a7ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxOYXNpcnwxNzcyNjAxMzE2fDA&ixlib=rb-4.1.0&q=80&w=1080',
    about_bio: 'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and exploring AI/ML integration.'
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nasir.id';
  
  // Use hero description if available, otherwise use about bio
  const description = settings.hero_description || settings.about_bio || 'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and exploring AI/ML integration.';
  
  // Clean up description for meta tags (remove emojis and extra formatting)
  const cleanDescription = description.replace(/[^\w\s.,!?-]/g, '').trim();
  
  const title = `${settings.hero_title} | ${settings.hero_subtitle}` || 'Nasir Noor | Cloud & DevOps Engineer';
  
  return {
    title,
    description: cleanDescription,
    keywords: ['Cloud Engineer', 'DevOps', 'AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'AI/ML', 'Infrastructure'],
    authors: [{ name: settings.hero_title || 'Nasir Noor' }],
    creator: settings.hero_title || 'Nasir Noor',
    
    // Open Graph tags for social media
    openGraph: {
      title,
      description: cleanDescription,
      url: baseUrl,
      siteName: 'Nasir.id',
      type: 'website',
      locale: 'en_US',
      images: [
        {
          url: convertToAssetsUrl(settings.about_image) || `${baseUrl}/default-og-image.jpg`,
          width: 1200,
          height: 630,
          alt: `${settings.hero_title || 'Nasir Noor'} - Profile Picture`,
          type: 'image/jpeg',
        },
      ],
    },
    
    // Twitter Card tags
    twitter: {
      card: 'summary_large_image',
      title,
      description: cleanDescription,
      creator: '@nasir_noor', // Replace with actual Twitter handle if available
      images: [convertToAssetsUrl(settings.about_image) || `${baseUrl}/default-og-image.jpg`],
    },
    
    // Additional meta tags
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    
    // Verification tags (add your verification codes if needed)
    verification: {
      // google: 'your-google-verification-code',
      // yandex: 'your-yandex-verification-code',
    },
    
    // Additional structured data
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'theme-color': '#ec4899', // Pink theme color
    },
  };
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                {/* Favicon and app icons */}
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <link rel="manifest" href="/site.webmanifest" />
                
                {/* Preconnect to external domains for performance */}
                <link rel="preconnect" href="https://s3.ap-southeast-1.amazonaws.com" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body>{children}</body>
        </html>
    );
}
