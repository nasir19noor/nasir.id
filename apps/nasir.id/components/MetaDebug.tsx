'use client';

import { useEffect, useState } from 'react';

export default function MetaDebug() {
  const [metaTags, setMetaTags] = useState<string[]>([]);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    const tags: string[] = [];
    
    // Get all meta tags
    const metaElements = document.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"], meta[property^="article:"]');
    
    metaElements.forEach((meta) => {
      const property = meta.getAttribute('property') || meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (property && content) {
        tags.push(`${property}: ${content}`);
      }
    });
    
    setMetaTags(tags);
    
    // Log to console for debugging
    console.log('🔍 [META DEBUG] Found meta tags:', tags);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || metaTags.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 9999,
    }}>
      <strong>Meta Tags Debug:</strong>
      <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
        {metaTags.map((tag, index) => (
          <li key={index} style={{ marginBottom: '2px' }}>
            {tag}
          </li>
        ))}
      </ul>
    </div>
  );
}