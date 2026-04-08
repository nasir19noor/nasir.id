-- Migration: Add Indonesian Language Support
-- This script adds Indonesian language support to existing database
-- Run this on your existing database to add Indonesian translations

-- ============================================================================
-- ADD LANGUAGE COLUMNS (if not exists)
-- ============================================================================

-- Add language column to articles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'articles' AND column_name = 'language') THEN
        ALTER TABLE articles ADD COLUMN language VARCHAR(5) DEFAULT 'en';
        RAISE NOTICE '✅ Added language column to articles table';
    ELSE
        RAISE NOTICE '⚠️ Language column already exists in articles table';
    END IF;
END $$;

-- Add language column to settings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settings' AND column_name = 'language') THEN
        ALTER TABLE settings ADD COLUMN language VARCHAR(5) DEFAULT 'en';
        RAISE NOTICE '✅ Added language column to settings table';
    ELSE
        RAISE NOTICE '⚠️ Language column already exists in settings table';
    END IF;
END $$;

-- ============================================================================
-- UPDATE UNIQUE CONSTRAINTS
-- ============================================================================

-- Drop old unique constraint on articles.slug and add new one with language
DO $$ 
BEGIN
    -- Check if old constraint exists and drop it
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'articles' AND constraint_name = 'articles_slug_key') THEN
        ALTER TABLE articles DROP CONSTRAINT articles_slug_key;
        RAISE NOTICE '✅ Dropped old unique constraint on articles.slug';
    END IF;
    
    -- Add new unique constraint on (slug, language)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'articles' AND constraint_name = 'articles_slug_language_key') THEN
        ALTER TABLE articles ADD CONSTRAINT articles_slug_language_key UNIQUE (slug, language);
        RAISE NOTICE '✅ Added unique constraint on articles (slug, language)';
    END IF;
END $$;

-- Drop old unique constraint on settings.key and add new one with language
DO $$ 
BEGIN
    -- Check if old constraint exists and drop it
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'settings' AND constraint_name = 'settings_key_key') THEN
        ALTER TABLE settings DROP CONSTRAINT settings_key_key;
        RAISE NOTICE '✅ Dropped old unique constraint on settings.key';
    END IF;
    
    -- Add new unique constraint on (key, language)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE table_name = 'settings' AND constraint_name = 'settings_key_language_key') THEN
        ALTER TABLE settings ADD CONSTRAINT settings_key_language_key UNIQUE (key, language);
        RAISE NOTICE '✅ Added unique constraint on settings (key, language)';
    END IF;
END $$;

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add indexes for language-based queries
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_articles_slug_language ON articles(slug, language);
CREATE INDEX IF NOT EXISTS idx_settings_key_language ON settings(key, language);

-- ============================================================================
-- INSERT INDONESIAN SETTINGS
-- ============================================================================

-- Insert Indonesian settings (only if they don't exist)
INSERT INTO settings (key, value, language) VALUES
('hero_title', 'Nasir Noor', 'id'),
('hero_subtitle', 'Arsitek Cloud | Insinyur DevOps | Pemimpin Inovasi', 'id'),
('hero_description', 'Mengubah ide menjadi solusi cloud yang scalable dengan keahlian dalam infrastruktur modern, otomasi, dan teknologi emerging.', 'id'),
('about_image', 'https://assets.nasir.id/uploads/2026/03/07/1772859194033-pixar-2-thumb.jpg', 'id'),
('about_bio', 'Saya adalah seorang Cloud & DevOps engineer yang passionate dalam membangun infrastruktur yang resilient dan scalable serta merampingkan deployment pipeline. Dengan keahlian di AWS, Azure, dan GCP, saya mengotomatisasi segala hal dan menerapkan Infrastructure as Code. Baru-baru ini mendalami AI/ML untuk mengintegrasikan otomasi cerdas ke dalam workflow DevOps.', 'id'),
('tech_stack', '["AWS ☁️","Azure 🌐","GCP 🚀","Kubernetes ⚓","Docker 🐳","Terraform 🏗️","Ansible 🤖","Jenkins 🔧","GitLab CI/CD 🦊","Python 🐍","Bash 💻","Prometheus 📊","Grafana 📈","ELK Stack 🔍","ArgoCD 🔄","Helm ⛵","Linux 🐧","Machine Learning 🧠","TensorFlow 🤖","PyTorch 🔥"]', 'id')
ON CONFLICT (key, language) DO NOTHING;

-- ============================================================================
-- INSERT SAMPLE INDONESIAN ARTICLES
-- ============================================================================

-- Insert Indonesian version of sample article (if it doesn't exist)
INSERT INTO articles (title, slug, summary, content, is_portfolio, language, published_at) VALUES
(
  'Memulai dengan Kubernetes di GCP',
  'memulai-dengan-kubernetes-di-gcp',
  'Panduan lengkap untuk deploy cluster Kubernetes pertama Anda di Google Cloud Platform.',
  '<h1>Memulai dengan Kubernetes di GCP</h1>

<p>Kubernetes telah menjadi standar de facto untuk orkestrasi container. Dalam artikel ini, kita akan membahas cara setup cluster GKE yang production-ready.</p>

<h2>Prasyarat</h2>
<ul>
<li>Akun Google Cloud</li>
<li><code>gcloud</code> CLI terinstall</li>
<li><code>kubectl</code> terinstall</li>
</ul>

<h2>Membuat Cluster</h2>
<pre><code>gcloud container clusters create my-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium</code></pre>

<h2>Deploy Aplikasi Pertama</h2>
<p>Setelah cluster siap, deploy aplikasi nginx sederhana:</p>

<pre><code>apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80</code></pre>

<h2>Kesimpulan</h2>
<p>Dengan GKE, memulai dengan Kubernetes menjadi mudah. Managed control plane memungkinkan Anda fokus pada aplikasi daripada manajemen cluster.</p>',
  FALSE,
  'id',
  '2026-02-20T10:00:00Z'
)
ON CONFLICT (slug, language) DO NOTHING;

-- Insert Indonesian versions of portfolio items (if they don't exist)
INSERT INTO articles (title, slug, summary, content, is_portfolio, language, published_at) VALUES
(
  'Platform Migrasi Cloud',
  'platform-migrasi-cloud',
  'Migrasi infrastruktur legacy on-premise ke lingkungan multi-cloud dengan zero downtime.',
  '<h2>Gambaran Proyek</h2>
<p>Berhasil migrasi infrastruktur legacy on-premise ke lingkungan multi-cloud dengan zero downtime, meningkatkan skalabilitas dan mengurangi biaya operasional sebesar 40%.</p>

<h3>Pencapaian Utama</h3>
<ul>
<li>Strategi migrasi zero downtime</li>
<li>Pengurangan biaya 40%</li>
<li>Peningkatan skalabilitas dan reliabilitas</li>
<li>Implementasi arsitektur multi-cloud</li>
</ul>

<h3>Teknologi yang Digunakan</h3>
<p>AWS, Terraform, Docker, Kubernetes, Ansible</p>',
  TRUE,
  'id',
  '2026-02-15T10:00:00Z'
),
(
  'Otomasi Pipeline CI/CD',
  'otomasi-pipeline-cicd',
  'Membangun pipeline CI/CD end-to-end dengan automated testing, security scanning, dan deployment.',
  '<h2>Gambaran Proyek</h2>
<p>Merancang dan mengimplementasikan pipeline CI/CD komprehensif yang mengotomatisasi seluruh proses software delivery, dari commit kode hingga deployment production.</p>

<h3>Fitur Utama</h3>
<ul>
<li>Automated testing dan quality gates</li>
<li>Integrasi security scanning</li>
<li>Strategi blue-green deployment</li>
<li>Kemampuan rollback</li>
<li>Dukungan multi-environment</li>
</ul>

<h3>Teknologi yang Digunakan</h3>
<p>Jenkins, GitLab CI, ArgoCD, Helm, Docker, Kubernetes</p>',
  TRUE,
  'id',
  '2026-02-10T10:00:00Z'
)
ON CONFLICT (slug, language) DO NOTHING;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Indonesian language support migration completed!';
    RAISE NOTICE '📊 Added language columns to articles and settings tables';
    RAISE NOTICE '🔍 Updated unique constraints to support multiple languages';
    RAISE NOTICE '📈 Added performance indexes for language queries';
    RAISE NOTICE '🇮🇩 Inserted Indonesian settings and sample articles';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Your database now supports Indonesian translations!';
    RAISE NOTICE '💡 Next steps:';
    RAISE NOTICE '   1. Update API endpoints to support language parameter';
    RAISE NOTICE '   2. Update components to support language prop';
    RAISE NOTICE '   3. Create Indonesian route structure (/id paths)';
    RAISE NOTICE '   4. Update admin interface for language management';
END $$;