import React, { useEffect, useState } from 'react';
import { getTelegramImageUrl } from '../lib/telegram';
import { Skeleton } from './ui/skeleton';

interface ProductImageProps {
  fileId?: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ fileId, alt, className }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setLoading(false);
      return;
    }

    const fetchUrl = async () => {
      try {
        const imageUrl = await getTelegramImageUrl(fileId);
        setUrl(imageUrl);
      } catch (err) {
        console.error('Failed to fetch Telegram image URL:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [fileId]);

  if (loading) {
    return <Skeleton className={`w-full h-full rounded-md ${className}`} />;
  }

  if (error || !url) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-md ${className}`}>
        <span className="text-xs text-muted-foreground">No Image</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`object-cover rounded-md ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
