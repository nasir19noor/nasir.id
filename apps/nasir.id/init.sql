-- Articles table (merged with portfolio)
CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  images TEXT[] DEFAULT '{}',
  is_portfolio BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table for landing page configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table for visitor tracking
CREATE TABLE IF NOT EXISTS analytics (
    id SERIAL PRIMARY KEY,
    visitor_ip VARCHAR(45),
    user_agent TEXT,
    os VARCHAR(100),
    device_type VARCHAR(50),
    browser VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    page_url TEXT,
    page_type VARCHAR(50), -- 'home', 'article', 'portfolio', 'about', etc.
    article_id INTEGER,
    article_slug VARCHAR(255),
    referrer TEXT,
    visited_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_visited_at ON analytics(visited_at);
CREATE INDEX IF NOT EXISTS idx_analytics_page_type ON analytics(page_type);
CREATE INDEX IF NOT EXISTS idx_analytics_article_id ON analytics(article_id);
CREATE INDEX IF NOT EXISTS idx_analytics_visitor_ip ON analytics(visitor_ip);

-- Create view for analytics summary
CREATE OR REPLACE VIEW analytics_summary AS
SELECT 
    DATE(visited_at) as date,
    COUNT(*) as total_visits,
    COUNT(DISTINCT visitor_ip) as unique_visitors,
    COUNT(CASE WHEN page_type = 'article' THEN 1 END) as article_views,
    COUNT(CASE WHEN page_type = 'portfolio' THEN 1 END) as portfolio_views,
    COUNT(CASE WHEN device_type = 'mobile' THEN 1 END) as mobile_visits,
    COUNT(CASE WHEN device_type = 'desktop' THEN 1 END) as desktop_visits
FROM analytics
GROUP BY DATE(visited_at)
ORDER BY date DESC;

-- Create view for popular articles
CREATE OR REPLACE VIEW popular_articles AS
SELECT 
    article_id,
    article_slug,
    COUNT(*) as view_count,
    COUNT(DISTINCT visitor_ip) as unique_views,
    MAX(visited_at) as last_viewed
FROM analytics
WHERE article_id IS NOT NULL
GROUP BY article_id, article_slug
ORDER BY view_count DESC;

-- Insert default settings
INSERT INTO settings (key, value) VALUES
('hero_title', 'Nasir Noor'),
('hero_subtitle', 'Cloud Wizard 🧙‍♂️ | DevOps Ninja 🥷 | AI Explorer 🚀'),
('hero_description', 'Turning coffee into infrastructure ☕ → ☁️ and making servers dance to my automation tunes 💃'),
('about_image', 'https://images.unsplash.com/photo-1752859951149-7d3fc700a7ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxOYXNpcnwxNzcyNjAxMzE2fDA&ixlib=rb-4.1.0&q=80&w=1080'),
('about_bio', 'I''m a Cloud & DevOps engineer passionate about building resilient, scalable infrastructure and streamlining deployment pipelines. With expertise across AWS, Azure, and GCP, I automate everything and embrace Infrastructure as Code. Recently diving deep into AI/ML to integrate intelligent automation into DevOps workflows. ✨'),
('tech_stack', '["AWS ☁️","Azure 🌐","GCP 🚀","Kubernetes ⚓","Docker 🐳","Terraform 🏗️","Ansible 🤖","Jenkins 🔧","GitLab CI/CD 🦊","Python 🐍","Bash 💻","Prometheus 📊","Grafana 📈","ELK Stack 🔍","ArgoCD 🔄","Helm ⛵","Linux 🐧","Machine Learning 🧠","TensorFlow 🤖","PyTorch 🔥"]')
ON CONFLICT (key) DO NOTHING;

-- Insert sample article
INSERT INTO articles (title, slug, summary, content, is_portfolio, published_at) VALUES
(
  'Getting Started with Kubernetes on GCP',
  'getting-started-kubernetes-gcp',
  'A comprehensive guide to deploying your first Kubernetes cluster on Google Cloud Platform.',
  '<h1>Getting Started with Kubernetes on GCP</h1>

<p>Kubernetes has become the de facto standard for container orchestration. In this article, we will walk through setting up a production-ready GKE cluster.</p>

<h2>Prerequisites</h2>
<ul>
<li>Google Cloud account</li>
<li><code>gcloud</code> CLI installed</li>
<li><code>kubectl</code> installed</li>
</ul>

<h2>Creating the Cluster</h2>
<pre><code>gcloud container clusters create my-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium</code></pre>

<h2>Deploying Your First Application</h2>
<p>Once the cluster is up, deploy a simple nginx application:</p>

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

<h2>Conclusion</h2>
<p>With GKE, getting started with Kubernetes is straightforward. The managed control plane lets you focus on your applications rather than cluster management.</p>',
  FALSE,
  '2026-02-20T10:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample portfolio items
INSERT INTO articles (title, slug, summary, content, is_portfolio, published_at) VALUES
(
  'Cloud Migration Platform',
  'cloud-migration-platform',
  'Migrated legacy on-premise infrastructure to multi-cloud environment with zero downtime.',
  '<h2>Project Overview</h2>
<p>Successfully migrated a legacy on-premise infrastructure to a multi-cloud environment with zero downtime, improving scalability and reducing operational costs by 40%.</p>

<h3>Key Achievements</h3>
<ul>
<li>Zero downtime migration strategy</li>
<li>40% cost reduction</li>
<li>Improved scalability and reliability</li>
<li>Multi-cloud architecture implementation</li>
</ul>

<h3>Technologies Used</h3>
<p>AWS, Terraform, Docker, Kubernetes, Ansible</p>',
  TRUE,
  '2026-02-15T10:00:00Z'
),
(
  'CI/CD Pipeline Automation',
  'cicd-pipeline-automation',
  'Built end-to-end CI/CD pipeline with automated testing, security scanning, and deployment.',
  '<h2>Project Overview</h2>
<p>Designed and implemented a comprehensive CI/CD pipeline that automated the entire software delivery process, from code commit to production deployment.</p>

<h3>Key Features</h3>
<ul>
<li>Automated testing and quality gates</li>
<li>Security scanning integration</li>
<li>Blue-green deployment strategy</li>
<li>Rollback capabilities</li>
<li>Multi-environment support</li>
</ul>

<h3>Technologies Used</h3>
<p>Jenkins, GitLab CI, ArgoCD, Helm, Docker, Kubernetes</p>',
  TRUE,
  '2026-02-10T10:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;
