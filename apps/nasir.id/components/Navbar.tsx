'use client';

import { useState } from 'react';
import { Menu, X, Sparkles } from 'lucide-react';
import LanguageToggle from './LanguageToggle';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    const scrollTo = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            setIsOpen(false);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-lg">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => scrollTo('hero')}
                        className="text-xl font-bold gradient-text-primary hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        <Sparkles size={20} className="text-blue-600" />
                        Nasir Noor
                    </button>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8">
                        {['About', 'Portfolio', 'Blog', 'Contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item.toLowerCase())}
                                className="text-slate-700 hover:text-blue-600 transition-colors font-medium relative group"
                            >
                                {item}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 gradient-primary group-hover:w-full transition-all duration-300 rounded-full"></span>
                            </button>
                        ))}
                        <LanguageToggle />
                    </div>

                    {/* Mobile Toggle */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden text-slate-700 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        {isOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden mt-4 pb-4 space-y-4 border-t border-slate-200 pt-4 animate-slide-up">
                        {['About', 'Portfolio', 'Blog', 'Contact'].map((item) => (
                            <button
                                key={item}
                                onClick={() => scrollTo(item.toLowerCase())}
                                className="block w-full text-left text-slate-700 hover:text-blue-600 transition-colors font-medium py-2 px-4 hover:bg-blue-50 rounded-lg"
                            >
                                {item}
                            </button>
                        ))}
                        <div className="px-4 py-2">
                            <LanguageToggle />
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
