'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowRight, ImageOff } from 'lucide-react';

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

export function ConverterCard({ converter, viewMode }: ConverterCardProps) {
  const t = useTranslations('catalogue');

  // Use public thumbnail endpoint - available for all users
  const thumbnailSrc = `/api/v1/images/thumb/${converter.id}`;

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
              <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                {thumbnailSrc ? (
                  <img
                    src={thumbnailSrc}
                    alt={converter.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`flex items-center justify-center h-full w-full ${thumbnailSrc ? 'hidden' : ''}`}>
                  <ImageOff className="h-5 w-5 text-muted-foreground/50" />
                </div>
              </div>

              {/* Name & Brand */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {converter.name}
                </h3>
                <Badge variant="secondary" className="mt-1 text-[10px] px-1.5 py-0">
                  {converter.brand}
                </Badge>
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
            {thumbnailSrc ? (
              <img
                src={thumbnailSrc}
                alt={converter.name}
                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-full w-full flex items-center justify-center text-muted-foreground/40 absolute inset-0 ${thumbnailSrc ? 'hidden' : ''}`}>
              <ImageOff className="h-10 w-10" />
            </div>
            <Badge className="absolute top-2 left-2" variant="secondary">
              {converter.brand}
            </Badge>
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
