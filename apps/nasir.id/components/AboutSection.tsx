'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { convertToAssetsUrl, addCacheBuster } from '@/lib/image-utils';

interface Settings {
    about_image?: string;
    about_bio?: string;
    tech_stack?: string;
}

export default function AboutSection() {
    const [settings, setSettings] = useState<Settings>({});
    const [imageKey, setImageKey] = useState(Date.now());
    const [techStack, setTechStack] = useState<string[]>([]);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch('/api/settings', {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                    // Update image key to force re-render when image changes
                    setImageKey(Date.now());
                    
                    // Parse tech_stack JSON
                    if (data.tech_stack) {
                        try {
                            const parsed = JSON.parse(data.tech_stack);
                            setTechStack(Array.isArray(parsed) ? parsed : []);
                        } catch {
                            // Fallback to default if parsing fails
                            setTechStack([
                                'AWS ☁️', 'Azure 🌐', 'GCP 🚀', 'Kubernetes ⚓', 'Docker 🐳',
                                'Terraform 🏗️', 'Ansible 🤖', 'Jenkins 🔧', 'GitLab CI/CD 🦊',
                                'Python 🐍', 'Bash 💻', 'Prometheus 📊', 'Grafana 📈',
                                'ELK Stack 🔍', 'ArgoCD 🔄', 'Helm ⛵', 'Linux 🐧',
                                'Machine Learning 🧠', 'TensorFlow 🤖', 'PyTorch 🔥',
                            ]);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
            }
        }
        fetchSettings();
    }, []);

    return (
        <section id="about" className="py-16 px-6 bg-gradient-to-br from-blue-50 to-emerald-50">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold mb-16 text-center gradient-text-primary font-serif">
                    About Me
                </h2>

                <div className="grid md:grid-cols-2 gap-12 items-center">
                    {/* Photo */}
                    <div className="relative">
                        <div className="aspect-square rounded-2xl overflow-hidden border-4 border-blue-200 relative group shadow-xl hover:shadow-2xl transition-shadow">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-emerald-200/20 z-10" />
                            {settings.about_image ? (
                                <img
                                    key={imageKey}
                                    src={addCacheBuster(convertToAssetsUrl(settings.about_image))}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Image
                                    src="https://images.unsplash.com/photo-1752859951149-7d3fc700a7ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB0ZWNoJTIwZGV2ZWxvcGVyJTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcyNjAxMzE2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                                    alt="Profile"
                                    width={600}
                                    height={600}
                                    className="w-full h-full object-cover"
                                    priority
                                />
                            )}
                        </div>
                    </div>

                    {/* Bio + Tech Stack */}
                    <div>
                        <p className="text-slate-700 text-lg leading-relaxed mb-8">
                            {settings.about_bio || 'I\'m a Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and streamlining deployment pipelines. With expertise across AWS, Azure, and GCP, I automate everything and embrace Infrastructure as Code. Recently diving deep into AI/ML to integrate intelligent automation into DevOps workflows.'}
                        </p>

                        <h3 className="text-xl font-semibold text-slate-900 mb-4">
                            Tech Stack &amp; Tools
                        </h3>

                        <div className="flex flex-wrap gap-2">
                            {techStack.map((tech) => (
                                <span
                                    key={tech}
                                    className="px-4 py-2 bg-white border-2 border-blue-200 rounded-full text-sm text-slate-700 hover:bg-gradient-to-r hover:from-blue-100 hover:to-emerald-100 hover:border-blue-300 transition-all hover:scale-105 font-medium"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
