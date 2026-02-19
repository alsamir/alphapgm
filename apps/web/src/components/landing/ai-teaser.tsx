'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bot, MessageSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const sampleMessages = [
  { role: 'user', text: "What's the price of BMW converter 1740060?" },
  { role: 'ai', text: "The BMW converter 1740060 contains 2.85 g/kg Platinum, 1.42 g/kg Palladium, and 0.35 g/kg Rhodium. At current market prices, the estimated value is $142.50 USD." },
  { role: 'user', text: 'Show me the most valuable Toyota converters' },
];

export function AiTeaser() {
  const t = useTranslations('aiTeaser');

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 mb-6">
              <Bot className="h-4 w-4 text-accent" />
              <span className="text-sm text-accent">{t('badge')}</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('title')}
              <span className="text-accent">{t('titleHighlight')}</span>
            </h2>
            <p className="text-muted-foreground mb-8">
              {t('description')}
            </p>
            <Button variant="accent" size="lg" className="group" asChild>
              <Link href="/register">
                {t('cta')}
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          <Card className="bg-card border-border/50 p-4 overflow-hidden">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{t('chatTitle')}</span>
            </div>
            <div className="space-y-3">
              {sampleMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.3 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary/20 text-foreground'
                        : 'bg-secondary text-foreground'
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              <div className="flex items-center gap-2 text-muted-foreground text-xs pt-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                {t('typing')}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
