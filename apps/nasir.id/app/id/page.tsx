import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import PortfolioSection from '@/components/PortfolioSection';
import BlogSection from '@/components/BlogSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import MetaDebug from '@/components/MetaDebug';

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