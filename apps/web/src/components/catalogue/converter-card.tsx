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
            <CardContent className="p-4 flex items-center gap-4">
              {/* Thumbnail */}
              <div className="h-16 w-16 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
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
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {converter.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {brandLogoSrc && (
                    <img
                      src={brandLogoSrc}
                      alt={converter.brand}
                      className="h-4 w-4 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {converter.brand}
                  </Badge>
                </div>
              </div>

              {/* Weight */}
              {converter.weight && converter.weight !== '0' && (
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {converter.weight} kg
                </span>
              )}

              {/* View arrow */}
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
          <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
            <img
              src={thumbnailSrc}
              alt={converter.name}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={handleImgError}
            />
            {/* Brand badge */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5">
              {brandLogoSrc && (
                <div className="h-6 w-6 rounded bg-background/80 backdrop-blur-sm p-0.5 border border-border/50">
                  <img
                    src={brandLogoSrc}
                    alt={converter.brand}
                    className="h-full w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                  />
                </div>
              )}
              <Badge variant="secondary">
                {converter.brand}
              </Badge>
            </div>
          </div>

          {/* Card body */}
          <CardContent className="p-4">
            <h3 className="font-medium mb-1 truncate group-hover:text-primary transition-colors">
              {converter.name}
            </h3>
            {converter.weight && converter.weight !== '0' && (
              <p className="text-sm text-muted-foreground mb-2">
                {t('weight')}: {converter.weight} kg
              </p>
            )}
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <span>{t('details')}</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
