'use client';

import { useState } from 'react';
import { Send, Mail, Github, Linkedin, MessageCircle } from 'lucide-react';

export default function ContactSection() {
    const [form, setForm] = useState({ name: '', email: '', message: '' });
    const [sending, setSending] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setStatus(null);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', message: 'Message sent successfully! 🎉 I\'ll get back to you soon.' });
                setForm({ name: '', email: '', message: '' });
            } else {
                setStatus({ type: 'error', message: data.error || 'Failed to send message. Please try again.' });
            }
        } catch (error) {
            console.error('Error:', error);
            setStatus({ type: 'error', message: 'Failed to send message. Please try again.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <section id="contact" className="py-24 px-6 bg-gradient-to-br from-blue-50 to-emerald-50">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-8 text-center gradient-text-primary font-serif">
                    Let's Connect
                </h2>
                <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto text-lg">
                    Ready to discuss your next project or explore collaboration opportunities? 
                    I'd love to hear from you.
                </p>

                <div className="grid md:grid-cols-2 gap-12">
                    {/* Form */}
                    <div className="card">
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {status && (
                                <div className={`px-4 py-3 rounded-lg text-sm ${
                                    status.type === 'success' 
                                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                                        : 'bg-red-50 border border-red-200 text-red-700'
                                }`}>
                                    {status.message}
                                </div>
                            )}

                            <div>
                                <label htmlFor="name" className="block text-slate-700 mb-2 font-medium">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-slate-700 mb-2 font-medium">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-slate-700 mb-2 font-medium">
                                    Message
                                </label>
                                <textarea
                                    id="message"
                                    value={form.message}
                                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                                    rows={5}
                                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors resize-none"
                                    placeholder="Your message..."
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending}
                                className="btn-primary w-full flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? 'Sending...' : 'Send Message'}
                                {!sending && (
                                    <Send
                                        size={18}
                                        className="group-hover:translate-x-1 transition-transform"
                                    />
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Social links */}
                    <div className="flex flex-col justify-center">
                        <div className="mb-8">
                            <h3 className="text-xl font-semibold text-slate-900 mb-4">
                                Let's Connect
                            </h3>
                            <p className="text-slate-600 mb-6">
                                Interested in discussing cloud architecture, DevOps best
                                practices, or emerging technologies? I'm always open to
                                meaningful conversations and collaboration opportunities.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <a
                                href="mailto:nasir19noor@gmail.com"
                                className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
                            >
                                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <div className="text-slate-900 font-medium">Email</div>
                                    <div className="text-slate-600 text-sm">
                                        nasir19noor@gmail.com
                                    </div>
                                </div>
                            </a>

                            <a
                                href="https://github.com/nasir19noor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
                            >
                                <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg text-slate-600 group-hover:scale-110 transition-transform">
                                    <Github size={20} />
                                </div>
                                <div>
                                    <div className="text-slate-900 font-medium">GitHub</div>
                                    <div className="text-slate-600 text-sm">@nasir19noor</div>
                                </div>
                            </a>

                            <a
                                href="https://linkedin.com/in/nasir19noor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
                            >
                                <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg text-blue-600 group-hover:scale-110 transition-transform">
                                    <Linkedin size={20} />
                                </div>
                                <div>
                                    <div className="text-slate-900 font-medium">LinkedIn</div>
                                    <div className="text-slate-600 text-sm">/in/nasir19noor</div>
                                </div>
                            </a>

                            <a
                                href="https://wa.me/6285288358561"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 p-4 card hover:shadow-lg transition-all group"
                            >
                                <div className="p-2 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                                    <MessageCircle size={20} />
                                </div>
                                <div>
                                    <div className="text-slate-900 font-medium">WhatsApp</div>
                                    <div className="text-slate-600 text-sm">+62 852-8835-8561</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
