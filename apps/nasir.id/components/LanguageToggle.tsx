'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
    const pathname = usePathname();
    const router = useRouter();
    
    // Determine current language from pathname
    const isIndonesian = pathname.startsWith('/id');
    const currentLang = isIndonesian ? 'id' : 'en';
    
    const switchLanguage = (lang: string) => {
        if (lang === currentLang) return;
        
        if (lang === 'id') {
            // Switch to Indonesian
            if (pathname === '/') {
                router.push('/id');
            } else {
                router.push(`/id${pathname}`);
            }
        } else {
            // Switch to English
            if (pathname === '/id') {
                router.push('/');
            } else if (pathname.startsWith('/id/')) {
                router.push(pathname.replace('/id', ''));
            } else {
                router.push(pathname);
            }
        }
    };

    return (
        <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-200">
            <Globe size={16} className="text-slate-600" />
            <button
                onClick={() => switchLanguage('en')}
                className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
                    currentLang === 'en'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-blue-600'
                }`}
            >
                EN
            </button>
            <span className="text-slate-400">|</span>
            <button
                onClick={() => switchLanguage('id')}
                className={`px-2 py-1 text-sm font-medium rounded transition-colors ${
                    currentLang === 'id'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:text-blue-600'
                }`}
            >
                ID
            </button>
        </div>
    );
}