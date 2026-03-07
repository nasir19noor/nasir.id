# Nasir.id - Personal Portfolio Website

A modern, responsive portfolio website built with Next.js, featuring a comprehensive admin dashboard for content management and visitor analytics.

## 🌐 Live Website
**[nasir.id](https://nasir.id)**

## ✨ Features

### Frontend
- **Professional Design**: Clean, modern theme with blue/emerald color palette
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Dynamic Content**: Real-time data fetching from database
- **Image Optimization**: Automatic image resizing and thumbnail generation
- **Contact Form**: Functional email contact form with WhatsApp integration
- **SEO Optimized**: Meta tags, Open Graph, and Twitter Card support

### Admin Dashboard
- **Secure Authentication**: Protected admin area with session management
- **Content Management**: Create, edit, and delete articles and portfolio projects
- **Settings Management**: Customize hero section, about section, and tech stack
- **Gallery Management**: Upload, organize, and manage images with S3 integration
- **Analytics Dashboard**: Comprehensive visitor tracking with interactive world map
- **Unified Management**: Single interface for both articles and portfolio items
- **HTML Editor**: Rich text editor with formatting toolbar and preview modes

### Analytics & Tracking
- **Visitor Analytics**: IP tracking, geolocation, device type, and OS detection
- **Interactive Map**: World map showing visitor locations with visit counts
- **Page Views**: Track article and portfolio project views
- **Popular Content**: Identify most viewed articles and projects
- **Daily Statistics**: Visitor counts, unique IPs, and engagement metrics
- **Referrer Tracking**: Monitor traffic sources

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library
- **Leaflet.js** - Interactive maps for analytics

### Backend
- **PostgreSQL** - Primary database with optimized indexes
- **Node.js** - Server runtime
- **Nodemailer** - Email functionality with Gmail SMTP

### Infrastructure
- **Docker** - Containerization for easy deployment
- **AWS S3** - Image storage with CDN integration
- **Sharp** - Image processing and optimization
- **Assets Domain** - Custom domain for image delivery (`assets.nasir.id`)

### Development
- **ESLint** - Code linting and quality assurance
- **PostCSS** - CSS processing with Autoprefixer

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL database
- AWS S3 bucket configured
- Node.js 18+ (for local development)

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database Configuration
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=nasir
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/nasir

# Admin Authentication
ADMIN_PASSWORD=your_admin_password

# AWS S3 Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=www.nasir.id

# Email Configuration (Gmail SMTP)
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Application Settings
NEXT_PUBLIC_SITE_URL=https://nasir.id
```

### Installation & Deployment

1. **Clone the repository**
```bash
git clone <repository-url>
cd nasir.id
```

2. **Set up the database**
```bash
# Create PostgreSQL database named 'nasir'
createdb nasir

# Run initialization script (includes all tables, indexes, and sample data)
psql -d nasir -f init.sql
```

3. **Deploy with Docker**
```bash
# Make run script executable
chmod +x run.sh

# Build and start the application
./run.sh
```

The application will be available at `http://localhost:7000`

### Local Development
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard pages
│   │   ├── analytics/     # Analytics dashboard with world map
│   │   ├── articles/      # Article management with HTML editor
│   │   ├── comments/      # Comment moderation
│   │   ├── gallery/       # Image gallery management
│   │   ├── login/         # Admin authentication
│   │   └── settings/      # Site settings management
│   ├── api/               # API routes
│   │   ├── analytics/     # Analytics tracking and data
│   │   ├── articles/      # Article CRUD operations
│   │   ├── auth/          # Authentication endpoints
│   │   ├── comments/      # Comment system
│   │   ├── contact/       # Contact form handler
│   │   ├── gallery/       # Image management
│   │   ├── public/        # Public content APIs
│   │   ├── settings/      # Settings management
│   │   └── upload/        # File upload with S3 integration
│   ├── articles/          # Public article pages (legacy)
│   ├── portfolio/         # Public portfolio pages (legacy)
│   └── [slug]/            # Dynamic pages for articles and portfolio
├── components/            # Reusable React components
│   ├── AnalyticsTracker.tsx  # Client-side analytics tracking
│   ├── BlogSection.tsx       # Article listing component
│   ├── Comments.tsx          # Comment system component
│   ├── ContactSection.tsx    # Contact form with social links
│   ├── Footer.tsx            # Site footer
│   ├── HeroSection.tsx       # Landing page hero
│   ├── Navbar.tsx            # Navigation component
│   ├── PortfolioSection.tsx  # Portfolio listing component
│   └── VisitorMap.tsx        # Interactive world map for analytics
├── lib/                   # Utility libraries
│   ├── analytics.ts       # Server-side analytics processing
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database connection and queries
│   ├── image-utils.ts    # Image URL processing utilities
│   └── s3.ts             # AWS S3 integration with multi-size upload
├── public/               # Static assets
├── Dockerfile            # Docker configuration for production
├── init.sql             # Complete database initialization script
├── middleware.ts        # Next.js middleware for routing
├── run.sh               # Deployment script
└── package.json         # Dependencies and scripts
```

## 🔧 Admin Dashboard

Access the admin dashboard at `/admin` with your configured credentials.

### Features:
- **Articles & Portfolio**: Unified management with HTML editor and preview modes
- **Settings**: Customize hero section, about section, and tech stack with drag-and-drop
- **Analytics**: Interactive world map, visitor statistics, and popular content tracking
- **Gallery**: Image upload, management, and S3 integration with automatic resizing
- **Comments**: Moderation system with approval workflow

### Content Management:
- Rich HTML content editor with formatting toolbar
- Multiple image uploads per article/project with automatic optimization
- SEO-friendly slug generation and meta tag management
- Portfolio/article categorization with unified interface
- Drag-and-drop tech stack management with emoji support

## 📊 Analytics System

The built-in analytics system provides comprehensive visitor insights:

### Tracking Features:
- **Visitor Information**: IP geolocation, device type, OS, browser detection
- **Interactive World Map**: Visual representation of visitor locations with visit counts
- **Page Views**: Detailed tracking of article and portfolio project visits
- **Traffic Sources**: Referrer tracking and traffic analysis
- **Popular Content**: Most viewed articles and projects with engagement metrics
- **Daily Statistics**: Unique visitors, total page views, and device breakdowns

### Privacy & Compliance:
- IP-based tracking without personal data collection
- Anonymized visitor statistics
- No cookies or persistent tracking
- GDPR-friendly implementation

## 🖼️ Image Management System

### Upload Process:
1. **Client Upload**: Images uploaded through admin interface or gallery
2. **Server Processing**: Automatic resizing and optimization using Sharp
3. **S3 Storage**: Files stored in AWS S3 with date-based organization
4. **CDN Delivery**: Images served via `https://assets.nasir.id/` domain
5. **Multiple Sizes**: Automatic generation of thumbnail, medium, large, and original sizes

### Image Optimization:
- **Automatic Resizing**: Large images (>1MB) resized before upload
- **Multiple Formats**: Support for JPEG, PNG, WebP
- **Size Variants**: Thumbnail (400px), Medium (1024px), Large (1920px), Original
- **Date Organization**: Files organized by upload date (YYYY/MM/DD structure)
- **CDN Integration**: Custom domain for better performance and branding

### CDN Setup (Required):
Configure your web server to serve `https://assets.nasir.id/` from your S3 bucket:

```nginx
server {
    listen 443 ssl;
    server_name assets.nasir.id;
    
    location / {
        proxy_pass https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/;
        proxy_set_header Host s3.ap-southeast-1.amazonaws.com;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🎨 Theme & Customization

### Professional Theme:
- **Color Palette**: Blue (#3b82f6), Emerald (#10b981), Slate grays
- **Typography**: Playfair Display (headers), Inter (body text)
- **Design Elements**: Clean cards, subtle shadows, professional gradients
- **Animations**: Gentle floating effects, smooth transitions

### Customization Options:
- **Admin Settings**: Update colors, fonts, and layout through dashboard
- **Component Styling**: Modify individual component styles in their files
- **Global Styles**: Update `app/globals.css` for site-wide changes
- **Tailwind Config**: Customize design system in `tailwind.config.ts`

## 🔒 Security Features

- **Session-based Authentication**: Secure admin access with session management
- **Input Validation**: Comprehensive validation and sanitization
- **SQL Injection Protection**: Parameterized queries and prepared statements
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Environment Protection**: Sensitive data stored in environment variables
- **File Upload Security**: Type validation and size limits for uploads

## 📱 Performance Optimizations

- **Image Optimization**: Automatic resizing, format optimization, and lazy loading
- **Database Indexing**: Optimized queries with proper indexes for analytics
- **Caching Strategy**: Browser caching for static assets and API responses
- **Code Splitting**: Next.js automatic code splitting and optimization
- **CDN Integration**: Asset delivery through custom domain with caching
- **Mobile Optimization**: Responsive design with touch-friendly interfaces

## 🚀 Deployment

### Docker Deployment (Recommended):
```bash
# Build and run with Docker
./run.sh
```

### Manual Deployment:
```bash
# Install dependencies
npm install

# Build application
npm run build

# Start production server
npm start
```

### Environment Setup:
1. Configure PostgreSQL database
2. Set up AWS S3 bucket with public read access
3. Configure CDN/proxy for `assets.nasir.id` domain
4. Set up Gmail SMTP for contact form
5. Configure environment variables

## 🔧 Database Schema

The `init.sql` file includes:
- **Complete table structure** with proper relationships and constraints
- **Optimized indexes** for performance
- **Analytics views** for reporting
- **Sample data** for testing
- **Migration utilities** for URL conversion
- **Default settings** for immediate use

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with proper testing
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📄 License

This project is private and proprietary to Nasir Noor.

## 📞 Contact

- **Website**: [nasir.id](https://nasir.id)
- **Email**: nasir19noor@gmail.com
- **WhatsApp**: +62 852-8835-8561
- **GitHub**: [@nasir19noor](https://github.com/nasir19noor)
- **LinkedIn**: [/in/nasir19noor](https://linkedin.com/in/nasir19noor)

---

Built with ❤️ by Nasir Noor - Cloud Architect | DevOps Engineer | Innovation Leader 🚀