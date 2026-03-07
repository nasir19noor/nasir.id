'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Cloud, Target, Lightbulb } from 'lucide-react';

interface Settings {
    hero_title?: string;
    hero_subtitle?: string;
    hero_description?: string;
}

export default function HeroSection() {
    const [settings, setSettings] = useState<Settings>({});

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/settings');
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        }
        fetchSettings();
    }, []);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <section
            id="hero"
            className="min-h-screen flex items-center justify-center relative overflow-hidden pt-20"
        >
            {/* Professional floating elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 animate-gentle-float">
                    <Cloud size={60} className="text-blue-200 opacity-30" />
                </div>
                <div className="absolute top-40 right-20 animate-gentle-float" style={{ animationDelay: '1s' }}>
                    <Target size={40} className="text-emerald-200 opacity-30" />
                </div>
                <div className="absolute bottom-40 left-1/4 animate-gentle-float" style={{ animationDelay: '2s' }}>
                    <Lightbulb size={50} className="text-amber-200 opacity-30" />
                </div>
                <div className="absolute top-1/3 right-1/4 animate-gentle-float" style={{ animationDelay: '1.5s' }}>
                    <Cloud size={35} className="text-slate-200 opacity-30" />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center animate-slide-up">
                <div className="inline-block mb-6 px-6 py-3 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-full border border-blue-100">
                    <p className="text-sm font-medium gradient-text-primary">
                        🚀 Building the future, one solution at a time
                    </p>
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight font-serif">
                    <span className="gradient-text-primary">
                        {settings.hero_title || 'Nasir Noor'}
                    </span>
                </h1>
                
                <p className="text-2xl md:text-3xl text-slate-700 mb-4 font-semibold">
                    {settings.hero_subtitle || 'Cloud Architect | DevOps Engineer | Innovation Leader'}
                </p>
                
                <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
                    {settings.hero_description || 'Transforming ideas into scalable cloud solutions with expertise in modern infrastructure, automation, and emerging technologies.'}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => scrollTo('portfolio')}
                        className="btn-primary flex items-center justify-center gap-2 group"
                    >
                        Explore My Work
                        <ArrowRight
                            size={20}
                            className="group-hover:translate-x-1 transition-transform"
                        />
                    </button>
                    <button
                        onClick={() => scrollTo('blog')}
                        className="btn-outline"
                    >
                        Read Insights
                    </button>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-subtle-pulse">
                <div className="w-6 h-10 border-2 border-blue-300 rounded-full flex items-start justify-center p-2">
                    <div className="w-1 h-2 bg-blue-400 rounded-full" />
                </div>
            </div>
        </section>
    );
}
