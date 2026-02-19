'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';

interface Brand {
  name: string;
  count: number;
  brandImage?: string | null;
}

const CDN_BASE = 'https://apg.fra1.cdn.digitaloceanspaces.com';

export function BrandCarousel() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsWithImages, setBrandsWithImages] = useState<Brand[]>([]);

  useEffect(() => {
    api.getBrands().then((res) => {
      const data = (res.data || []) as Brand[];
      // Filter to brands that have a logo image and a non-empty name
      const withImages = data.filter((b) => b.brandImage && b.name.trim());
      // Sort by count descending, take top 30
      const sorted = [...withImages]
        .sort((a, b) => b.count - a.count)
        .slice(0, 30);
      setBrandsWithImages(sorted);
      setBrands(data.filter((b) => b.name.trim()));
    }).catch(() => {});
  }, []);

  // If brands haven't loaded yet, show nothing
  if (brands.length === 0) return null;

  const row1 = brandsWithImages.length > 10
    ? brandsWithImages.slice(0, Math.ceil(brandsWithImages.length / 2))
    : brandsWithImages;
  const row2 = brandsWithImages.length > 10
    ? brandsWithImages.slice(Math.ceil(brandsWithImages.length / 2))
    : brandsWithImages;

  return (
    <section className="py-16 bg-card/30 border-y border-border/20 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-2xl font-bold text-center">
          <span className="text-muted-foreground">Covering</span>{' '}
          <span className="text-primary">{brands.length} Brands</span>
        </h2>
      </div>

      {/* Scrolling row 1 - brand logos */}
      {brandsWithImages.length > 0 ? (
        <>
          <div className="relative">
            <motion.div
              className="flex gap-4 whitespace-nowrap"
              animate={{ x: [0, -1920] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            >
              {[...row1, ...row1, ...row1].map((brand, i) => (
                <div
                  key={`${brand.name}-${i}`}
                  className="flex-shrink-0 px-5 py-3 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 transition-colors flex items-center gap-3"
                >
                  <img
                    src={`${CDN_BASE}/logo/${brand.brandImage}`}
                    alt={brand.name}
                    className="h-8 w-8 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {brand.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Scrolling row 2 (reverse) */}
          <div className="relative mt-4">
            <motion.div
              className="flex gap-4 whitespace-nowrap"
              animate={{ x: [-1920, 0] }}
              transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
            >
              {[...row2, ...row2, ...row2].map((brand, i) => (
                <div
                  key={`${brand.name}-rev-${i}`}
                  className="flex-shrink-0 px-5 py-3 rounded-lg border border-border/30 bg-card/50 hover:border-primary/30 transition-colors flex items-center gap-3"
                >
                  <img
                    src={`${CDN_BASE}/logo/${brand.brandImage}`}
                    alt={brand.name}
                    className="h-8 w-8 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {brand.name}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>
        </>
      ) : null}
    </section>
  );
}
