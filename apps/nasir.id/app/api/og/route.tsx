import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Nasir Noor';
    const subtitle = searchParams.get('subtitle') || 'Cloud Architect | DevOps Engineer';
    const type = searchParams.get('type') || 'website';
    const category = searchParams.get('category') || '';
    const date = searchParams.get('date') || '';
    const language = searchParams.get('language') || 'en';

    // Determine if this is an article/portfolio post
    const isPost = type === 'article' || type === 'portfolio';
    
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#ffffff',
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontSize: 32,
            fontWeight: 600,
            position: 'relative',
          }}
        >
          {/* Background pattern */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'radial-gradient(circle at 25px 25px, #3b82f6 2px, transparent 0), radial-gradient(circle at 75px 75px, #10b981 2px, transparent 0)',
              backgroundSize: '100px 100px',
              opacity: 0.05,
            }}
          />
          
          {/* Header with branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '40px 60px',
              borderBottom: '2px solid #e2e8f0',
              zIndex: 1,
            }}
          >
            {/* Logo and name */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 20,
                  fontSize: 24,
                  color: 'white',
                  fontWeight: 800,
                }}
              >
                NN
              </div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1e293b' }}>
                  Nasir Noor
                </div>
                <div style={{ fontSize: 16, color: '#64748b', fontWeight: 500 }}>
                  {language === 'id' ? 'Arsitek Cloud | Insinyur DevOps' : 'Cloud Architect | DevOps Engineer'}
                </div>
              </div>
            </div>
            
            {/* Category badge */}
            {isPost && (
              <div
                style={{
                  background: type === 'portfolio' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  padding: '8px 20px',
                  borderRadius: 20,
                  fontSize: 16,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {type === 'portfolio' 
                  ? (language === 'id' ? 'PORTFOLIO' : 'PORTFOLIO')
                  : (language === 'id' ? 'ARTIKEL' : 'ARTICLE')
                }
              </div>
            )}
          </div>
          
          {/* Main content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              padding: '60px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            {/* Title */}
            <div
              style={{
                fontSize: isPost ? 48 : 64,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                marginBottom: isPost ? 30 : 20,
                lineHeight: 1.1,
                maxWidth: '900px',
              }}
            >
              {title}
            </div>
            
            {/* Subtitle for non-posts */}
            {!isPost && (
              <div
                style={{
                  fontSize: 32,
                  color: '#64748b',
                  fontWeight: 500,
                  marginBottom: 20,
                  lineHeight: 1.2,
                }}
              >
                {subtitle}
              </div>
            )}
            
            {/* Date for posts */}
            {isPost && date && (
              <div
                style={{
                  fontSize: 20,
                  color: '#64748b',
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                {new Date(date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '30px 60px',
              borderTop: '2px solid #e2e8f0',
              zIndex: 1,
            }}
          >
            {/* Website URL */}
            <div
              style={{
                fontSize: 20,
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              nasir.id
            </div>
            
            {/* Tech stack icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ fontSize: 24 }}>☁️</div>
              <div style={{ fontSize: 24 }}>⚓</div>
              <div style={{ fontSize: 24 }}>🐳</div>
              <div style={{ fontSize: 24 }}>🚀</div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}