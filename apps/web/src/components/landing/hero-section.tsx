'use client';

import { useState, useEffect, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Loader2 } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════
   Scene loading indicator
   ═══════════════════════════════════════════════════════════════════════ */
function SceneLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="relative w-44 h-44">
        {/* Outer ring pulse */}
        <div className="absolute inset-0 rounded-full border-2 border-primary/15 animate-ping" />
        {/* Spinning ring */}
        <div
          className="absolute inset-3 rounded-full border border-primary/25 animate-spin"
          style={{ animationDuration: '3s' }}
        />
        {/* Inner spinning ring */}
        <div
          className="absolute inset-8 rounded-full border border-[#ffd866]/15 animate-spin"
          style={{ animationDuration: '5s', animationDirection: 'reverse' }}
        />
        {/* Center loader */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-primary/40 animate-spin" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Metal cycling animation config
   ═══════════════════════════════════════════════════════════════════════ */
const metalKeys = ['platinum', 'palladium', 'rhodium'] as const;

const metalStyles: Record<typeof metalKeys[number], { color: string; glow: string }> = {
  platinum: {
    color: 'text-[#d4d4e8]',
    glow: '0 0 40px rgba(212,212,232,0.45), 0 0 80px rgba(212,212,232,0.15)',
  },
  palladium: {
    color: 'text-[#ffd866]',
    glow: '0 0 40px rgba(255,216,102,0.45), 0 0 80px rgba(255,216,102,0.15)',
  },
  rhodium: {
    color: 'text-[#5b9cf5]',
    glow: '0 0 40px rgba(91,156,245,0.45), 0 0 80px rgba(91,156,245,0.15)',
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   Cycling Metal Name - smooth animated text swap
   ═══════════════════════════════════════════════════════════════════════ */
function CyclingMetal() {
  const t = useTranslations('hero');
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setIdx((i) => (i + 1) % metalKeys.length), 2400);
    return () => clearInterval(iv);
  }, []);

  const currentKey = metalKeys[idx];
  const style = metalStyles[currentKey];
  const metalLabel = t(currentKey);

  return (
    <span className="inline-block min-w-[220px] md:min-w-[300px] text-left">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentKey}
          className={`inline-block font-extrabold ${style.color}`}
          style={{ textShadow: style.glow }}
          initial={{ y: 40, opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
          animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ y: -40, opacity: 0, filter: 'blur(10px)', scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {metalLabel}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Stats pill data (values only; labels are translated in the component)
   ═══════════════════════════════════════════════════════════════════════ */
const statValues = ['19,800+', '99', 'AI', '24/7'] as const;
const statLabelKeys = ['converters', 'brands', 'powered', 'liveData'] as const;

/* ═══════════════════════════════════════════════════════════════════════
   Staggered animation variants
   ═══════════════════════════════════════════════════════════════════════ */
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const slideInLeft = {
  hidden: { opacity: 0, x: -40, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   HeroSection - main exported component
   ═══════════════════════════════════════════════════════════════════════ */
export function HeroSection() {
  const t = useTranslations('hero');
  const [SceneComponent, setSceneComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      import('@/components/3d/converter-scene')
        .then((mod) => {
          if (!cancelled) setSceneComponent(() => mod.default);
        })
        .catch(() => {
          // 3D scene failed to load — keep showing the loader/fallback
        });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* ── Background layers ── */}
      <div className="absolute inset-0">
        {/* Base gradient: charcoal to deep navy */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-15%,#0c1a2e,#0a0a0f_70%)]" />

        {/* Emerald glow - upper left */}
        <div className="absolute top-[-5%] left-[5%] w-[700px] h-[700px] bg-[#00e88f]/[0.025] rounded-full blur-[200px]" />

        {/* Palladium warmth - center right */}
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-[#ffd866]/[0.015] rounded-full blur-[180px]" />

        {/* Rhodium cool - lower area */}
        <div className="absolute bottom-[5%] left-[30%] w-[600px] h-[600px] bg-[#5b9cf5]/[0.015] rounded-full blur-[200px]" />

        {/* Subtle grid overlay for fintech feel */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,232,143,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,232,143,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── 3D Scene ── right 60% on desktop, full on mobile */}
      <div className="absolute inset-0 lg:left-[40%]">
        <motion.div
          className="w-full h-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2.5, delay: 0.3, ease: 'easeOut' }}
        >
          {SceneComponent ? (
            <SceneComponent />
          ) : (
            <SceneLoader />
          )}
        </motion.div>
      </div>

      {/* ── Gradient overlays for text readability ── */}
      {/* Left-to-right fade on desktop */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/95 via-35% to-transparent lg:via-[#0a0a0f]/70 lg:via-45%" />
      {/* Bottom fade for depth */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
      {/* Top subtle vignette */}
      <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#0a0a0f]/40 to-transparent" />
      {/* Mobile full overlay */}
      <div className="absolute inset-0 bg-[#0a0a0f]/40 lg:hidden" />

      {/* ── Content ── */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 min-h-screen flex items-center">
        <motion.div
          className="max-w-2xl py-20 md:py-28"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Brand logo */}
          <motion.div variants={itemVariants} className="mb-8">
            <Image
              src="/logo.png"
              alt="APG"
              width={92}
              height={50}
              className="h-11 w-auto opacity-90 drop-shadow-[0_0_20px_rgba(255,216,102,0.15)]"
              priority
            />
          </motion.div>

          {/* Live badge */}
          <motion.div variants={slideInLeft}>
            <div className="inline-flex items-center gap-2.5 rounded-full bg-[#00e88f]/[0.07] border border-[#00e88f]/20 px-5 py-2 mb-8 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute h-full w-full rounded-full bg-[#00e88f] opacity-75" />
                <span className="relative rounded-full h-2 w-2 bg-[#00e88f] shadow-[0_0_8px_rgba(0,232,143,0.6)]" />
              </span>
              <span className="text-sm text-[#00e88f]/90 font-medium tracking-wide">
                {t('badge')}
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-[2.75rem] sm:text-5xl md:text-6xl lg:text-[4.75rem] font-bold tracking-tight leading-[1.06] mb-7"
            variants={slideInLeft}
          >
            <span className="text-foreground/90">{t('titleThe')}</span>{' '}
            <CyclingMetal />
            <br />
            <span className="text-foreground/90">{t('titleMarket')}</span>
            <br />
            <span
              className="bg-gradient-to-r from-[#00e88f] via-[#00e88f] to-[#00c878] bg-clip-text text-transparent"
              style={{
                textShadow: '0 0 60px rgba(0,232,143,0.25)',
                filter: 'drop-shadow(0 0 30px rgba(0,232,143,0.2))',
              }}
            >
              {t('titleFingertips')}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-base md:text-lg text-muted-foreground/80 max-w-lg mb-10 leading-relaxed"
            variants={slideInLeft}
          >
            {t('subtitle')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div className="flex flex-wrap gap-3 mb-12" variants={itemVariants}>
            <Button
              size="xl"
              className="text-base md:text-lg group shadow-[0_0_30px_rgba(0,232,143,0.2)] hover:shadow-[0_0_40px_rgba(0,232,143,0.35)] transition-shadow duration-300"
              asChild
            >
              <Link href="/catalogue">
                {t('exploreCatalogue')}
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1.5 transition-transform duration-200" />
              </Link>
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="text-base md:text-lg border-border/40 hover:border-[#00e88f]/30 hover:bg-[#00e88f]/[0.04] backdrop-blur-md transition-all duration-300"
              asChild
            >
              <Link href="/register">
                {t('getStartedFree')}
              </Link>
            </Button>
          </motion.div>

          {/* Stats pills */}
          <motion.div className="flex flex-wrap gap-2.5" variants={containerVariants}>
            {statValues.map((value, i) => (
              <motion.div
                key={statLabelKeys[i]}
                variants={itemVariants}
                className="flex items-center gap-2 rounded-full bg-white/[0.03] border border-white/[0.06] backdrop-blur-md px-4 py-2 hover:bg-white/[0.06] hover:border-[#00e88f]/15 transition-all duration-300 cursor-default"
              >
                <span className="text-sm font-bold text-[#00e88f]">{value}</span>
                <span className="text-xs text-muted-foreground/70">{t(statLabelKeys[i])}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Decorative bottom border line ── */}
      <div className="absolute bottom-0 inset-x-0 h-px">
        <div className="h-full bg-gradient-to-r from-transparent via-[#00e88f]/20 to-transparent" />
      </div>
    </section>
  );
}
