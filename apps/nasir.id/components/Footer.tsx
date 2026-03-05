import { Heart, Coffee } from 'lucide-react';

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="py-12 px-6 border-t border-pink-100 bg-white/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-600 text-sm flex items-center gap-2">
                        © {year} Nasir Noor. Crafted with{' '}
                        <Heart size={14} className="text-pink-500 fill-current animate-pulse" /> 
                        {' '}and lots of{' '}
                        <Coffee size={14} className="text-amber-600" />
                    </p>
                    <p className="text-gray-500 text-sm font-medium">
                        🚀 Powered by clouds & dreams ☁️✨
                    </p>
                </div>
            </div>
        </footer>
    );
}
