import { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import PortfolioSection from '@/components/PortfolioSection';
import BlogSection from '@/components/BlogSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MetaDebug from '@/components/MetaDebug';

// Function to fetch Indonesian settings for metadata
async function getIndonesianSettings() {
  try {
    const baseUrl = 'https://nasir.id';
    const response = await fetch(`${baseUrl}/api/settings/id`, {
      cache: 'no-store',
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch Indonesian settings for metadata:', error);
  }
  
  // Fallback settings
  return {
    hero_title: 'Nasir Noor',
    hero_subtitle: 'Arsitek Cloud | Insinyur DevOps | Pemimpin Inovasi',
    hero_description: 'Mengubah ide menjadi solusi cloud yang scalable dengan keahlian dalam infrastruktur modern, otomasi, dan teknologi emerging.',
    about_bio: 'Cloud & DevOps engineer yang passionate dalam membangun infrastruktur yang resilient dan scalable.'
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getIndonesianSettings();
  const baseUrl = 'https://nasir.id';
  
  // Use about_bio for description instead of hero_description for more professional social previews
  const description = settings.about_bio || settings.hero_description || 'Cloud & DevOps engineer yang passionate dalam membangun infrastruktur yang resilient dan scalable.';
  const title = `${settings.hero_title} | ${settings.hero_subtitle}` || 'Nasir Noor | Arsitek Cloud & Insinyur DevOps';
  
  // Use profile image for Indonesian homepage
  const ogImage = 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg';
  
  console.log('🖼️ [HOMEPAGE ID METADATA] Using profile image:', ogImage);
  console.log('🖼️ [HOMEPAGE ID METADATA] Using about description:', description);
  
  return {
    title,
    description,
    keywords: ['Cloud Engineer', 'DevOps', 'AWS', 'Azure', 'GCP', 'Kubernetes', 'Docker', 'Terraform', 'AI/ML', 'Infrastruktur'],
    authors: [{ name: settings.hero_title || 'Nasir Noor' }],
    creator: settings.hero_title || 'Nasir Noor',
    
    openGraph: {
      title,
      description,
      url: `${baseUrl}/id`,
      siteName: 'Nasir.id',
      type: 'website',
      locale: 'id_ID',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${settings.hero_title || 'Nasir Noor'} - Arsitek Cloud & Insinyur DevOps Profile Photo`,
          type: 'image/jpeg',
        },
      ],
    },
    
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@nasir19noor',
      images: [ogImage],
    },
    
    other: {
      'og:image:width': '1200',
      'og:image:height': '630',
      'og:image:type': 'image/jpeg',
      'twitter:image:width': '1200',
      'twitter:image:height': '630',
      'twitter:site': '@nasir19noor',
      'theme-color': '#3b82f6',
    },
  };
}

export default function IndonesianHome() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
            <AnalyticsTracker pageType="home" />
            <MetaDebug />
            <Navbar />
            <HeroSection language="id" />
            <AboutSection language="id" />
            <PortfolioSection language="id" />
            <BlogSection language="id" />
            <ContactSection language="id" />
            <Footer language="id" />
        </div>
    );
}