import React, { useEffect, useState } from 'react';
import { getTelegramImageUrl } from '@/lib/telegram';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductImageProps {
  fileId?: string;
  fallbackUrl?: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({ fileId, fallbackUrl, alt, className }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!fileId) {
      if (fallbackUrl) {
        setUrl(fallbackUrl);
        setLoading(false);
      } else {
        setLoading(false);
        setError(true);
      }
      return;
    }

    let isMounted = true;
    const fetchUrl = async () => {
      setLoading(true);
      setError(false);
      try {
        // Small delay to ensure network is ready and avoid rapid re-fetches
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return;
        
        console.log(`[ProductImage] Fetching image for fileId: ${fileId}`);
        const imageUrl = await getTelegramImageUrl(fileId);
        
        if (!isMounted) return;
        
        console.log(`[ProductImage] Received image URL for ${fileId}:`, imageUrl);
        setUrl(imageUrl);
      } catch (err) {
        if (!isMounted) return;
        console.error(`[ProductImage] Failed to fetch Telegram image URL for ${fileId}:`, err);
        if (fallbackUrl) {
          console.log(`[ProductImage] Using fallback URL for ${fileId}:`, fallbackUrl);
          setUrl(fallbackUrl);
        } else {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUrl();
    return () => { isMounted = false; };
  }, [fileId, fallbackUrl]);

  if (loading) {
    return <Skeleton className={`w-full h-full rounded-md ${className}`} />;
  }

  if (error || !url) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted rounded-md ${className} gap-1 p-2`}>
        <span className="text-[10px] text-muted-foreground">No Image</span>
        {fileId && (
          <button 
            onClick={() => window.location.reload()} 
            className="text-[8px] text-primary hover:underline font-bold"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`object-cover rounded-md ${className}`}
      referrerPolicy="no-referrer"
      onError={() => {
        if (url !== fallbackUrl && fallbackUrl) {
          setUrl(fallbackUrl);
        } else {
          setError(true);
        }
      }}
    />
  );
};
