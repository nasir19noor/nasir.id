# Nasir.id - Personal Portfolio Website

A modern, responsive portfolio website built with Next.js, featuring a comprehensive admin dashboard for content management and visitor analytics.

## 🌐 Live Website
**[nasir.id](https://nasir.id)**

## ✨ Features

### Frontend
- **Modern Design**: Light, elegant theme with gradient backgrounds and playful animations
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Dynamic Content**: Real-time data fetching from database
- **Image Optimization**: Automatic image resizing and thumbnail generation
- **Contact Form**: Functional email contact form with WhatsApp integration

### Admin Dashboard
- **Secure Authentication**: Protected admin area with session management
- **Content Management**: Create, edit, and delete articles and portfolio projects
- **Settings Management**: Customize hero section, about section, and tech stack
- **Image Upload**: S3 integration with automatic resizing and optimization
- **Analytics Dashboard**: Comprehensive visitor tracking and statistics
- **Unified Management**: Single interface for both articles and portfolio items

### Analytics & Tracking
- **Visitor Analytics**: IP tracking, geolocation, device type, and OS detection
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

### Backend
- **PostgreSQL** - Primary database
- **Node.js** - Server runtime
- **Nodemailer** - Email functionality

### Infrastructure
- **Docker** - Containerization
- **AWS S3** - Image storage and CDN
- **Sharp** - Image processing and optimization

### Development
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- PostgreSQL database
- AWS S3 bucket configured
- Node.js 18+ (for local development)

### Environment Variables
Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/nasir

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=www.nasir.id

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application
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

# Run initialization script
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
│   ├── api/               # API routes
│   ├── articles/          # Public article pages
│   └── portfolio/         # Public portfolio pages
├── components/            # Reusable React components
├── lib/                   # Utility libraries
│   ├── analytics.ts       # Analytics tracking
│   ├── auth.ts           # Authentication
│   ├── db.ts             # Database connection
│   ├── image-utils.ts    # Image processing
│   └── s3.ts             # AWS S3 integration
├── public/               # Static assets
├── Dockerfile            # Docker configuration
├── init.sql             # Database initialization
├── run.sh               # Deployment script
└── package.json         # Dependencies
```

## 🔧 Admin Dashboard

Access the admin dashboard at `/admin` with your configured credentials.

### Features:
- **Articles & Portfolio**: Manage all content in one place
- **Settings**: Customize landing page content and appearance
- **Analytics**: View detailed visitor statistics and popular content
- **Image Management**: Upload and manage images with automatic optimization

### Content Management:
- Rich HTML content editor
- Multiple image uploads per article/project
- SEO-friendly slug generation
- Portfolio/article categorization
- Drag-and-drop tech stack management

## 📊 Analytics

The built-in analytics system tracks:
- **Visitor Information**: IP, location, device type, OS, browser
- **Page Views**: Article and portfolio project visits
- **Traffic Sources**: Referrer tracking
- **Popular Content**: Most viewed articles and projects
- **Daily Statistics**: Unique visitors and total page views

## 🎨 Customization

### Theme & Styling
- Modify `app/globals.css` for global styles
- Update component styles in individual component files
- Customize colors and animations in Tailwind configuration

### Content
- Use the admin dashboard to update all content
- Modify default settings in `init.sql`
- Add custom pages in the `app/` directory

## 🔒 Security

- Session-based authentication for admin access
- Input validation and sanitization
- SQL injection protection with parameterized queries
- CORS configuration for API endpoints
- Environment variable protection

## 📱 Performance

- **Image Optimization**: Automatic resizing and format optimization
- **Caching**: Browser caching for static assets
- **Database Indexing**: Optimized queries for analytics
- **Lazy Loading**: Images and components load on demand
- **Minification**: CSS and JavaScript optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and proprietary to Nasir Noor.

## 📞 Contact

- **Website**: [nasir.id](https://nasir.id)
- **Email**: nasir19noor@gmail.com
- **WhatsApp**: +62 852-8835-8561

---

Built with ❤️ by Nasir Noor - Cloud Wizard 🧙‍♂️ | DevOps Ninja 🥷 | AI Explorer 🚀