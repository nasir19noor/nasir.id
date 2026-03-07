'use client';

import { useEffect, useState } from 'react';

interface TwitterCardDebugProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
}

export default function TwitterCardDebug({ url, title, description, image }: TwitterCardDebugProps) {
  const [metaTags, setMetaTags] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // Extract Twitter Card meta tags from the page
    const twitterMeta: { [key: string]: string } = {};
    
    // Get all meta tags
    const metaElements = document.querySelectorAll('meta');
    metaElements.forEach((meta) => {
      const name = meta.getAttribute('name') || meta.getAttribute('property');
      const content = meta.getAttribute('content');
      
      if (name && content && (name.startsWith('twitter:') || name.startsWith('og:'))) {
        twitterMeta[name] = content;
      }
    });
    
    setMetaTags(twitterMeta);
  }, []);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md max-h-96 overflow-auto z-50">
      <h4 className="font-bold mb-2">Twitter Card Debug</h4>
      <div className="space-y-1">
        <div><strong>URL:</strong> {url}</div>
        <div><strong>Title:</strong> {title}</div>
        {description && <div><strong>Description:</strong> {description.substring(0, 100)}...</div>}
        {image && <div><strong>Image:</strong> {image}</div>}
        
        <div className="mt-3 pt-2 border-t border-gray-600">
          <strong>Meta Tags:</strong>
          {Object.entries(metaTags).map(([key, value]) => (
            <div key={key} className="ml-2">
              <span className="text-blue-300">{key}:</span> {value.substring(0, 50)}{value.length > 50 ? '...' : ''}
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-600">
          <a 
            href={`https://cards-dev.twitter.com/validator?url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Test on Twitter Card Validator
          </a>
        </div>
      </div>
    </div>
  );
}