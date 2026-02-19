'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { TrendingUp, Activity } from 'lucide-react';

interface MetalPrice {
  name: string;
  symbol: string;
  price: number;
  color: string;
}

export function MetalPricesTicker() {
  const t = useTranslations('ticker');
  const [metals, setMetals] = useState<MetalPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch('/api/v1/pricing/metals');
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setMetals([
            { name: 'Platinum', symbol: 'Pt', price: d.platinum?.price || 0, color: 'text-platinum' },
            { name: 'Palladium', symbol: 'Pd', price: d.palladium?.price || 0, color: 'text-palladium' },
            { name: 'Rhodium', symbol: 'Rh', price: d.rhodium?.price || 0, color: 'text-rhodium' },
          ]);
        }
      } catch {
        // Fallback to defaults if API is unavailable
        setMetals([
          { name: 'Platinum', symbol: 'Pt', price: 950, color: 'text-platinum' },
          { name: 'Palladium', symbol: 'Pd', price: 1050, color: 'text-palladium' },
          { name: 'Rhodium', symbol: 'Rh', price: 4500, color: 'text-rhodium' },
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="border-y border-border/40 bg-card/50 backdrop-blur-sm py-4 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            <span>{t('live')}</span>
          </div>
          {loading ? (
            <div className="flex gap-8">
              {['Pt', 'Pd', 'Rh'].map((s) => (
                <div key={s} className="flex items-center gap-3 animate-pulse">
                  <span className="text-sm font-bold text-muted-foreground">{s}</span>
                  <div className="h-5 w-20 bg-border/50 rounded" />
                </div>
              ))}
            </div>
          ) : (
            metals.map((metal, i) => (
              <motion.div
                key={metal.symbol}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${metal.color}`}>{metal.symbol}</span>
                  <span className="text-sm text-muted-foreground">{metal.name}</span>
                </div>
                <span className="text-lg font-bold text-foreground">
                  ${metal.price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                </span>
                <span className="flex items-center text-xs font-medium text-primary">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  Live
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
