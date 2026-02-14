'use client';

import { motion } from 'framer-motion';

const brands = [
  'BMW', 'Mercedes', 'Audi', 'Toyota', 'Ford', 'Honda', 'Volkswagen', 'Volvo',
  'Hyundai', 'Kia', 'Nissan', 'Mazda', 'Subaru', 'Lexus', 'Porsche', 'Jaguar',
  'Land Rover', 'Peugeot', 'Renault', 'Citroen', 'Fiat', 'Opel', 'Skoda', 'Suzuki',
];

export function BrandCarousel() {
  return (
    <section className="py-16 bg-card/30 border-y border-border/20 overflow-hidden">
      <div className="container mx-auto px-4 mb-8">
        <h2 className="text-2xl font-bold text-center">
          <span className="text-muted-foreground">Covering</span>{' '}
          <span className="text-primary">99 Brands</span>
        </h2>
      </div>

      {/* Scrolling row 1 */}
      <div className="relative">
        <motion.div
          className="flex gap-4 whitespace-nowrap"
          animate={{ x: [0, -1920] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        >
          {[...brands, ...brands].map((brand, i) => (
            <div
              key={`${brand}-${i}`}
              className="flex-shrink-0 px-6 py-3 rounded-lg border border-border/30 bg-card/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {brand}
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
          {[...brands.slice().reverse(), ...brands.slice().reverse()].map((brand, i) => (
            <div
              key={`${brand}-rev-${i}`}
              className="flex-shrink-0 px-6 py-3 rounded-lg border border-border/30 bg-card/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {brand}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
