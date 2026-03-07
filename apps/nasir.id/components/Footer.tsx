import { Heart, Coffee, Code } from 'lucide-react';

interface FooterProps {
    language?: string;
}

export default function Footer({ language = 'en' }: FooterProps) {
    const year = new Date().getFullYear();

    return (
        <footer className="py-12 px-6 border-t border-slate-200 bg-white/70 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-slate-600 text-sm flex items-center gap-2">
                        © {year} Nasir Noor. Crafted with{' '}
                        <Heart size={14} className="text-emerald-500 fill-current animate-subtle-pulse" /> 
                        {' '}and powered by{' '}
                        <Coffee size={14} className="text-amber-600" />
                    </p>
                    <p className="text-slate-500 text-sm font-medium flex items-center gap-2">
                        <Code size={14} className="text-blue-600" />
                        Built with modern technologies
                    </p>
                </div>
            </div>
        </footer>
    );
}
