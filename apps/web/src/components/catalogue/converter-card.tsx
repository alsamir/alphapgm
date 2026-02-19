'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const CDN_BASE = 'https://apg.fra1.cdn.digitaloceanspaces.com';
const PLACEHOLDER = '/converter-placeholder.svg';

interface ConverterCardProps {
  converter: {
    id: number;
    name: string;
    brand: string;
    weight?: string;
    imageUrl?: string | null;
    brandImage?: string | null;
  };
  viewMode: 'grid' | 'list';
}

function getConverterImageUrl(name: string) {
  const cleanName = name.trim().split(' / ')[0].trim();
  return `${CDN_BASE}/images/${encodeURIComponent(cleanName)}.png`;
}

function getBrandLogoUrl(brandImage: string) {
  return `${CDN_BASE}/logo/${brandImage}`;
}

export function ConverterCard({ converter, viewMode }: ConverterCardProps) {
  const t = useTranslations('catalogue');

  const thumbnailSrc = getConverterImageUrl(converter.name);
  const brandLogoSrc = converter.brandImage ? getBrandLogoUrl(converter.brandImage) : null;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = PLACEHOLDER;
  };

  if (viewMode === 'list') {
    return (
      <Link href={`/converter/${converter.id}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="group"
        >
          <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              {/* Thumbnail */}
              <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                <img
                  src={thumbnailSrc}
                  alt={converter.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={handleImgError}
                />
              </div>

              {/* Name & Brand */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm sm:text-base truncate group-hover:text-primary transition-colors">
                  {converter.name}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {brandLogoSrc && (
                    <img
                      src={brandLogoSrc}
                      alt={converter.brand}
                      className="h-3.5 w-3.5 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span className="text-xs text-muted-foreground">{converter.brand}</span>
                </div>
              </div>

              {/* Weight */}
              {converter.weight && converter.weight !== '0' && (
                <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">
                  {converter.weight} kg
                </span>
              )}

              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </CardContent>
          </Card>
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={`/converter/${converter.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group h-full"
      >
        <Card className="h-full bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
          {/* Image area */}
          <div className="aspect-square sm:aspect-[4/3] bg-secondary relative overflow-hidden">
            <img
              src={thumbnailSrc}
              alt={converter.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={handleImgError}
            />
            {/* Brand badge - smaller on mobile */}
            {brandLogoSrc && (
              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 h-5 w-5 sm:h-6 sm:w-6 rounded bg-background/80 backdrop-blur-sm p-0.5 border border-border/50">
                <img
                  src={brandLogoSrc}
                  alt={converter.brand}
                  className="h-full w-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
              </div>
            )}
          </div>

          {/* Card body - compact on mobile */}
          <CardContent className="p-2.5 sm:p-4">
            <h3 className="font-medium text-xs sm:text-sm mb-0.5 sm:mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
              {converter.name}
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-muted-foreground">{converter.brand}</span>
              {converter.weight && converter.weight !== '0' && (
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {converter.weight} kg
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
