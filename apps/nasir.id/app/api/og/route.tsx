import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Nasir Noor';
    const subtitle = searchParams.get('subtitle') || 'Cloud Architect | DevOps Engineer';
    const type = searchParams.get('type') || 'website';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8fafc',
            backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            fontSize: 32,
            fontWeight: 600,
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
              opacity: 0.1,
            }}
          />
          
          {/* Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center',
              zIndex: 1,
            }}
          >
            {/* Logo/Icon */}
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 40,
                fontSize: 48,
                color: 'white',
              }}
            >
              NN
            </div>
            
            {/* Title */}
            <div
              style={{
                fontSize: 64,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                marginBottom: 20,
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            
            {/* Subtitle */}
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
            
            {/* Type badge */}
            {type !== 'website' && (
              <div
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: 25,
                  fontSize: 24,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {type}
              </div>
            )}
            
            {/* Website URL */}
            <div
              style={{
                position: 'absolute',
                bottom: 40,
                right: 40,
                fontSize: 24,
                color: '#94a3b8',
                fontWeight: 500,
              }}
            >
              nasir.id
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