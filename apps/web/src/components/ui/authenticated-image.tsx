'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onError?: () => void;
}

/**
 * Fetches images via JS with Authorization header (Bearer token),
 * then displays them as blob URLs. This solves the problem of
 * <img> tags being unable to send Authorization headers.
 */
export function AuthenticatedImage({ src, alt, className, fallback, onError }: AuthenticatedImageProps) {
  const { token } = useAuth();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !src) {
      setHasError(true);
      return;
    }

    let cancelled = false;

    const fetchImage = async () => {
      try {
        const res = await fetch(src, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          blobUrlRef.current = url;
          setBlobUrl(url);
          setHasError(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          onError?.();
        }
      }
    };

    fetchImage();

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src, token]);

  if (hasError || !blobUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
