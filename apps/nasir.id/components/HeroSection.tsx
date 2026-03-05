'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Cloud, Sparkles, Zap } from 'lucide-react';

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
            {/* Playful floating elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 animate-float">
                    <Cloud size={60} className="text-blue-200 opacity-40" />
                </div>
                <div className="absolute top-40 right-20 animate-float" style={{ animationDelay: '1s' }}>
                    <Sparkles size={40} className="text-pink-300 opacity-40" />
                </div>
                <div className="absolute bottom-40 left-1/4 animate-float" style={{ animationDelay: '2s' }}>
                    <Zap size={50} className="text-purple-300 opacity-40" />
                </div>
                <div className="absolute top-1/3 right-1/4 animate-float" style={{ animationDelay: '1.5s' }}>
                    <Sparkles size={35} className="text-yellow-300 opacity-40" />
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 max-w-5xl mx-auto px-6 py-32 text-center">
                <div className="inline-block mb-6 px-4 py-2 bg-gradient-to-r from-pink-100 to-blue-100 rounded-full">
                    <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-blue-600 bg-clip-text text-transparent">
                        ✨ Welcome to my digital playground!
                    </p>
                </div>
                
                <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
                    <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
                        {settings.hero_title || 'Nasir Noor'}
                    </span>
                </h1>
                
                <p className="text-2xl md:text-3xl text-gray-700 mb-4 font-semibold">
                    {settings.hero_subtitle || 'Cloud Wizard 🧙‍♂️ | DevOps Ninja 🥷 | AI Explorer 🚀'}
                </p>
                
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-12">
                    {settings.hero_description || 'Turning coffee into infrastructure ☕ → ☁️ and making servers dance to my automation tunes 💃'}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => scrollTo('portfolio')}
                        className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2 group rounded-full shadow-lg hover:shadow-xl hover:scale-105 font-medium"
                    >
                        View My Magic ✨
                        <ArrowRight
                            size={20}
                            className="group-hover:translate-x-1 transition-transform"
                        />
                    </button>
                    <button
                        onClick={() => scrollTo('blog')}
                        className="px-8 py-4 bg-white text-gray-700 border-2 border-pink-200 hover:border-pink-300 hover:bg-pink-50 transition-all rounded-full shadow-md hover:shadow-lg font-medium"
                    >
                        Read My Stories 📖
                    </button>
                </div>
            </div>

            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 border-2 border-pink-300 rounded-full flex items-start justify-center p-2">
                    <div className="w-1 h-2 bg-pink-400 rounded-full" />
                </div>
            </div>
        </section>
    );
}
