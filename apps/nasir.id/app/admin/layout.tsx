'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
    FileText,
    FolderOpen,
    LogOut,
    LayoutDashboard,
    Globe,
    Sparkles,
    Settings,
    BarChart3,
    MessageCircle,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Articles & Portfolio', href: '/admin/articles', icon: FileText },
    { label: 'Comments', href: '/admin/comments', icon: MessageCircle },
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();

    // Don't show sidebar on login page
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/admin/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-blue-50 to-purple-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-pink-100 flex flex-col fixed h-full shadow-lg">
                {/* Brand */}
                <div className="px-6 py-5 border-b border-pink-100">
                    <div className="flex items-center gap-2">
                        <Sparkles size={20} className="text-pink-500" />
                        <h1 className="text-lg font-bold bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text text-transparent">
                            Nasir Noor
                        </h1>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">✨ Admin Magic Panel</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== '/admin' && pathname.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                    isActive
                                        ? 'bg-gradient-to-r from-pink-100 to-blue-100 text-pink-700 shadow-sm'
                                        : 'text-gray-600 hover:bg-pink-50 hover:text-pink-600'
                                }`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </a>
                        );
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="px-3 py-4 border-t border-pink-100 space-y-1">
                    <a
                        href="/"
                        target="_blank"
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all"
                    >
                        <Globe size={18} />
                        View Site 🌍
                    </a>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogOut size={18} />
                        Logout 👋
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-64 p-8">{children}</main>
        </div>
    );
}
