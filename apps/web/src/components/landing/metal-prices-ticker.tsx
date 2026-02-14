'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const metalPrices = [
  { name: 'Platinum', symbol: 'Pt', price: 982.50, change: 1.2, color: 'text-platinum' },
  { name: 'Palladium', symbol: 'Pd', price: 1045.30, change: -0.8, color: 'text-palladium' },
  { name: 'Rhodium', symbol: 'Rh', price: 4750.00, change: 2.5, color: 'text-rhodium' },
];

export function MetalPricesTicker() {
  return (
    <section className="border-y border-border/40 bg-card/50 backdrop-blur-sm py-4 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {metalPrices.map((metal, i) => (
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
                ${metal.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-xs font-medium ${metal.change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metal.change > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                {metal.change > 0 ? '+' : ''}{metal.change}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
