import type { Metadata } from 'next';
import './globals.css';
import { convertToAssetsUrl } from '@/lib/image-utils';

// Function to fetch English settings for metadata
async function getEnglishSettings() {
  try {
    const baseUrl = 'https://nasir.id';
    // Explicitly fetch English settings
    const response = await fetch(`${baseUrl}/api/settings/en`, {
      cache: 'no-store', // Always fetch fresh data for metadata
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch English settings for metadata:', error);
  }
  
  // Fallback English settings
  return {
    hero_title: 'Nasir Noor',
    hero_subtitle: 'Cloud Wizard 🧙‍♂️ | DevOps Ninja 🥷 | AI Explorer 🚀',
    hero_description: 'Turning coffee into infrastructure ☕ → ☁️ and making servers dance to my automation tunes 💃',
    about_image: 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg',
    about_bio: 'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and exploring AI/ML integration.'
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getEnglishSettings();
  const baseUrl = 'https://nasir.id';
  
  // Use about_bio for description instead of hero_description for more professional social previews
  const description = settings.about_bio || settings.hero_description || 'Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and exploring AI/ML integration.';
  
  // Clean up description for meta tags (remove emojis and extra formatting)
  const cleanDescription = description.replace(/[^\w\s.,!?-]/g, '').trim();
  
  const title = `${settings.hero_title} | ${settings.hero_subtitle}` || 'Nasir Noor | Cloud & DevOps Engineer';
  
  // Use profile image (about_image) for social sharing
  let ogImage = 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg'; // Default profile image
  
  if (settings.about_image) {
    const convertedImage = convertToAssetsUrl(settings.about_image);
    // Verify it's a valid image URL
    if (convertedImage && (convertedImage.includes('.jpg') || convertedImage.includes('.jpeg') || convertedImage.includes('.png'))) {
      ogImage = convertedImage;
    }
  }
  
  console.log('🖼️ [HOMEPAGE EN METADATA] Using profile image:', ogImage);
  console.log('🖼️ [HOMEPAGE EN METADATA] Using about description:', cleanDescription);
  
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
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${settings.hero_title || 'Nasir Noor'} - Cloud & DevOps Engineer Profile Photo`,
          type: 'image/jpeg',
        },
      ],
    },
    
    // Twitter Card tags
    twitter: {
      card: 'summary_large_image',
      title,
      description: cleanDescription,
      creator: '@nasir19noor',
      images: [ogImage],
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
      'og:image:type': 'image/jpeg',
      'twitter:image:width': '1200',
      'twitter:image:height': '630',
      'twitter:site': '@nasir19noor',
      'fb:app_id': '', // Add your Facebook App ID if you have one
      'theme-color': '#3b82f6', // Professional blue theme color
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
                <link rel="preconnect" href="https://assets.nasir.id" />
                <link rel="preconnect" href="https://images.unsplash.com" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                
                {/* Additional meta tags for better social media support */}
                <meta name="format-detection" content="telephone=no" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                
                {/* Fallback Open Graph tags */}
                <meta property="og:site_name" content="Nasir.id" />
                <meta property="og:type" content="website" />
                <meta property="og:locale" content="en_US" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:site" content="@nasir19noor" />
                <meta name="twitter:creator" content="@nasir19noor" />
            </head>
            <body>{children}</body>
        </html>
    );
}
