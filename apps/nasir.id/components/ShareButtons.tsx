'use client';

import { useState } from 'react';
import { Share2, Twitter, Facebook, Linkedin, MessageCircle, Check } from 'lucide-react';

interface ShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  language?: string;
}

export default function ShareButtons({ url, title, description = '', language = 'en' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareData = {
    url: encodeURIComponent(url),
    title: encodeURIComponent(title),
    description: encodeURIComponent(description || title),
  };

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${shareData.title}&url=${shareData.url}&via=nasir19noor`,
    threads: `https://threads.net/intent/post?text=${shareData.title}%20${shareData.url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareData.url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareData.url}`,
    whatsapp: `https://wa.me/?text=${shareData.title}%20${shareData.url}`,
  };

  const handleShare = (platform: string) => {
    const shareUrl = shareUrls[platform as keyof typeof shareUrls];
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const labels = {
    en: {
      share: 'Share this article',
      copyLink: 'Copy link',
      linkCopied: 'Link copied!',
    },
    id: {
      share: 'Bagikan artikel ini',
      copyLink: 'Salin tautan',
      linkCopied: 'Tautan disalin!',
    },
  };

  const currentLabels = labels[language as keyof typeof labels] || labels.en;

  return (
    <div className="border-t border-slate-200 pt-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Share2 size={20} />
        {currentLabels.share}
      </h3>
      
      <div className="flex flex-wrap gap-3">
        {/* Twitter */}
        <button
          onClick={() => handleShare('twitter')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium text-sm"
          aria-label="Share on Twitter"
        >
          <Twitter size={16} />
          Twitter
        </button>

        {/* Threads */}
        <button
          onClick={() => handleShare('threads')}
          className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors font-medium text-sm"
          aria-label="Share on Threads"
        >
          <MessageCircle size={16} />
          Threads
        </button>

        {/* Facebook */}
        <button
          onClick={() => handleShare('facebook')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
          aria-label="Share on Facebook"
        >
          <Facebook size={16} />
          Facebook
        </button>

        {/* LinkedIn */}
        <button
          onClick={() => handleShare('linkedin')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors font-medium text-sm"
          aria-label="Share on LinkedIn"
        >
          <Linkedin size={16} />
          LinkedIn
        </button>

        {/* WhatsApp */}
        <button
          onClick={() => handleShare('whatsapp')}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium text-sm"
          aria-label="Share on WhatsApp"
        >
          <MessageCircle size={16} />
          WhatsApp
        </button>

        {/* Copy Link */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
          }`}
          aria-label="Copy link"
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          {copied ? currentLabels.linkCopied : currentLabels.copyLink}
        </button>
      </div>
    </div>
  );
}