'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { ArrowRight, Lock } from 'lucide-react';

interface ConverterCardProps {
  converter: {
    id: number;
    name: string;
    brand: string;
    weight?: string;
    imageUrl?: string;
    priceRange?: string;
  };
  viewMode: 'grid' | 'list';
}

export function ConverterCard({ converter, viewMode }: ConverterCardProps) {
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
              <div className="h-16 w-16 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                {converter.imageUrl ? (
                  <img src={converter.imageUrl} alt={converter.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">No image</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">{converter.name}</h3>
                <p className="text-sm text-muted-foreground">{converter.brand}</p>
              </div>
              {converter.weight && (
                <span className="text-sm text-muted-foreground">{converter.weight} kg</span>
              )}
              <div className="flex items-center gap-1 text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span className="text-xs">Login to view price</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
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
          <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
            {converter.imageUrl ? (
              <img src={converter.imageUrl} alt={converter.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                No image available
              </div>
            )}
            <Badge className="absolute top-2 left-2" variant="secondary">{converter.brand}</Badge>
          </div>
          <CardContent className="p-4">
            <h3 className="font-medium mb-1 truncate group-hover:text-primary transition-colors">{converter.name}</h3>
            {converter.weight && (
              <p className="text-sm text-muted-foreground mb-2">Weight: {converter.weight} kg</p>
            )}
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Lock className="h-3 w-3" />
              <span>Login to view pricing</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  );
}
