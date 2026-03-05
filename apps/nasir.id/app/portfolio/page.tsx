import sql from '@/lib/db';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
  const projects = await sql`
    SELECT id, project_title, description, image_url, tech_stack, live_link 
    FROM portfolio 
    ORDER BY id DESC
  `;

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-xl font-semibold text-white hover:text-[#60A5FA] transition-colors"
          >
            Nasir Noor
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="/articles"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Articles
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-16 px-6">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Portfolio
          </h1>
          <p className="text-gray-400 text-lg">
            Infrastructure, Cloud Architecture, and DevOps projects.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#3B82F6]/50 transition-all hover:shadow-lg hover:shadow-[#3B82F6]/5"
            >
              <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#60A5FA] transition-colors">
                {project.project_title}
              </h3>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                {project.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {project.tech_stack.map((tech: string) => (
                  <span
                    key={tech}
                    className="px-3 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400 font-mono"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <a
                href={project.live_link}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
              >
                View Case Study
                <ExternalLink size={14} />
              </a>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}