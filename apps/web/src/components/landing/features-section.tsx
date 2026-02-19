'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Zap, Database, Bot, BarChart3, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const featureIcons: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: Database, titleKey: 'database', descKey: 'databaseDesc' },
  { icon: Zap, titleKey: 'realtime', descKey: 'realtimeDesc' },
  { icon: Bot, titleKey: 'ai', descKey: 'aiDesc' },
  { icon: Shield, titleKey: 'security', descKey: 'securityDesc' },
  { icon: BarChart3, titleKey: 'analytics', descKey: 'analyticsDesc' },
  { icon: Globe, titleKey: 'currency', descKey: 'currencyDesc' },
];

export function FeaturesSection() {
  const t = useTranslations('features');

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('title')}
            <span className="text-primary"> {t('titleHighlight')}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureIcons.map((feature, i) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{t(feature.titleKey)}</h3>
                  <p className="text-sm text-muted-foreground">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
