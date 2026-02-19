'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslations } from 'next-intl';

/* ═══════════════════════════════════════════════════════════════════════
   Animated catalytic converter cross-section — CSS/SVG based
   Shows how exhaust flows through honeycomb structure with PGM coating
   ═══════════════════════════════════════════════════════════════════════ */

const facts = [
  {
    label: 'Platinum (Pt)',
    color: '#d4d4e8',
    desc: 'Oxidizes CO and hydrocarbons',
    amount: '1-3 g/kg',
  },
  {
    label: 'Palladium (Pd)',
    color: '#ffd866',
    desc: 'Converts unburned fuel compounds',
    amount: '0.5-5 g/kg',
  },
  {
    label: 'Rhodium (Rh)',
    color: '#5b9cf5',
    desc: 'Reduces nitrogen oxides (NOx)',
    amount: '0.1-1 g/kg',
  },
];

export function ConverterAnatomy() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const t = useTranslations('hero');

  return (
    <section ref={ref} className="py-20 bg-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/[0.02] rounded-full blur-[150px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-4 py-1.5 mb-5">
            <span className="text-sm text-primary font-medium">How It Works</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Inside a{' '}
            <span className="text-primary">Catalytic Converter</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Precious metals coat a honeycomb ceramic structure, converting harmful exhaust gases into cleaner emissions
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-8 items-center">
          {/* Left info cards */}
          <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
            {facts.map((fact, i) => (
              <motion.div
                key={fact.label}
                initial={{ opacity: 0, x: -30 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                className="p-3.5 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: fact.color, boxShadow: `0 0 8px ${fact.color}60` }}
                  />
                  <span className="text-xs font-semibold" style={{ color: fact.color }}>
                    {fact.label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{fact.desc}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{fact.amount}</p>
              </motion.div>
            ))}
          </div>

          {/* Center: Animated converter cross-section */}
          <motion.div
            className="lg:col-span-3 order-1 lg:order-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            <div className="relative aspect-[16/9] max-w-[700px] mx-auto">
              {/* The SVG cross-section */}
              <svg
                viewBox="0 0 700 400"
                className="w-full h-full"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="shellGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3a3d45" />
                    <stop offset="50%" stopColor="#4a4d55" />
                    <stop offset="100%" stopColor="#3a3d45" />
                  </linearGradient>
                  <linearGradient id="pipeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2a2d35" />
                    <stop offset="100%" stopColor="#35383f" />
                  </linearGradient>
                  <linearGradient id="innerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1a1d25" />
                    <stop offset="100%" stopColor="#22252d" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="exhaustIn" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="exhaustOut" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00e88f" stopOpacity="0" />
                    <stop offset="100%" stopColor="#00e88f" stopOpacity="0.5" />
                  </linearGradient>
                </defs>

                {/* Background */}
                <rect width="700" height="400" fill="transparent" />

                {/* Exhaust flow arrows - incoming (red/hot) */}
                <g opacity="0.4">
                  <rect x="30" y="185" width="80" height="30" rx="3" fill="url(#exhaustIn)">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                  </rect>
                </g>

                {/* Left inlet pipe */}
                <rect x="70" y="168" width="90" height="64" rx="6" fill="url(#pipeGrad)" stroke="#4a4d55" strokeWidth="1" />
                <ellipse cx="70" cy="200" rx="10" ry="32" fill="#1e2028" stroke="#4a4d55" strokeWidth="1" />

                {/* Left cone */}
                <polygon points="160,168 220,120 220,280 160,232" fill="url(#pipeGrad)" stroke="#4a4d55" strokeWidth="1" />

                {/* Main body outer shell */}
                <rect x="220" y="110" width="260" height="180" rx="14" fill="url(#shellGrad)" stroke="#555860" strokeWidth="1.2" />

                {/* Inner substrate area */}
                <rect x="232" y="122" width="236" height="156" rx="8" fill="url(#innerGrad)" />

                {/* Honeycomb grid */}
                <g stroke="#3a3d42" strokeWidth="0.4" opacity="0.5">
                  {/* Vertical channels */}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <line
                      key={`v${i}`}
                      x1={248 + i * 20}
                      y1="128"
                      x2={248 + i * 20}
                      y2="272"
                    />
                  ))}
                  {/* Horizontal channels */}
                  {Array.from({ length: 7 }).map((_, i) => (
                    <line
                      key={`h${i}`}
                      x1="238"
                      y1={142 + i * 20}
                      x2="462"
                      y2={142 + i * 20}
                    />
                  ))}
                </g>

                {/* PGM coating highlights on honeycomb cells */}
                <g opacity="0.6">
                  {/* Platinum spots */}
                  {[[258, 150], [298, 170], [338, 150], [378, 190], [418, 170], [298, 230], [378, 250], [338, 210]].map(([cx, cy], i) => (
                    <circle key={`pt${i}`} cx={cx} cy={cy} r="3" fill="#d4d4e8" opacity="0.7">
                      <animate attributeName="opacity" values="0.4;0.9;0.4" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                  {/* Palladium spots */}
                  {[[268, 190], [308, 150], [348, 230], [388, 170], [428, 210], [268, 250], [348, 170], [308, 210]].map(([cx, cy], i) => (
                    <circle key={`pd${i}`} cx={cx} cy={cy} r="2.5" fill="#ffd866" opacity="0.7">
                      <animate attributeName="opacity" values="0.3;0.8;0.3" dur={`${2.5 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                  {/* Rhodium spots */}
                  {[[278, 170], [318, 190], [358, 170], [398, 230], [438, 190], [278, 230], [358, 250]].map(([cx, cy], i) => (
                    <circle key={`rh${i}`} cx={cx} cy={cy} r="2" fill="#5b9cf5" opacity="0.7">
                      <animate attributeName="opacity" values="0.3;0.85;0.3" dur={`${3 + i * 0.3}s`} repeatCount="indefinite" />
                    </circle>
                  ))}
                </g>

                {/* Animated flow particles through honeycomb */}
                {Array.from({ length: 8 }).map((_, i) => {
                  const yBase = 140 + (i % 4) * 35;
                  const delay = i * 0.5;
                  return (
                    <g key={`flow${i}`}>
                      <circle r="2.5" fill="#ef4444" opacity="0">
                        <animate attributeName="cx" values={`${240};${350};${460}`} dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
                        <animate attributeName="cy" values={`${yBase};${yBase + (i % 2 ? 5 : -5)};${yBase}`} dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.7;0.3;0" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
                        <animate attributeName="fill" values="#ef4444;#fbbf24;#00e88f" dur="3s" begin={`${delay}s`} repeatCount="indefinite" />
                      </circle>
                    </g>
                  );
                })}

                {/* Right cone */}
                <polygon points="480,120 540,168 540,232 480,280" fill="url(#pipeGrad)" stroke="#4a4d55" strokeWidth="1" />

                {/* Right outlet pipe */}
                <rect x="540" y="168" width="90" height="64" rx="6" fill="url(#pipeGrad)" stroke="#4a4d55" strokeWidth="1" />
                <ellipse cx="630" cy="200" rx="10" ry="32" fill="#1e2028" stroke="#4a4d55" strokeWidth="1" />

                {/* Exhaust flow arrows - outgoing (green/clean) */}
                <g opacity="0.4">
                  <rect x="590" y="185" width="80" height="30" rx="3" fill="url(#exhaustOut)">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                  </rect>
                </g>

                {/* Labels */}
                <g className="text-[11px]" fontFamily="Arial, sans-serif">
                  <text x="50" y="165" fill="#ef4444" fontSize="10" textAnchor="middle" opacity="0.7">Exhaust</text>
                  <text x="50" y="177" fill="#ef4444" fontSize="10" textAnchor="middle" opacity="0.7">In</text>
                  <text x="660" y="165" fill="#00e88f" fontSize="10" textAnchor="middle" opacity="0.7">Clean</text>
                  <text x="660" y="177" fill="#00e88f" fontSize="10" textAnchor="middle" opacity="0.7">Out</text>
                  <text x="350" y="102" fill="#9ca3af" fontSize="11" textAnchor="middle" fontWeight="600">Ceramic Substrate</text>
                  <text x="350" y="302" fill="#6b7280" fontSize="10" textAnchor="middle">PGM-Coated Honeycomb Channels</text>
                </g>

                {/* Annotation lines */}
                <line x1="350" y1="108" x2="350" y2="118" stroke="#4a4d55" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="350" y1="282" x2="350" y2="294" stroke="#4a4d55" strokeWidth="0.5" strokeDasharray="2,2" />
              </svg>
            </div>
          </motion.div>

          {/* Right info cards */}
          <div className="lg:col-span-1 space-y-4 order-3">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="p-3.5 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.5)' }} />
                <span className="text-xs font-semibold text-red-400">Exhaust In</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">CO, HC, NOx from engine combustion</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.04] backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#00e88f]" style={{ boxShadow: '0 0 8px rgba(0,232,143,0.5)' }} />
                <span className="text-xs font-semibold text-primary">Clean Out</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">CO&#8322;, H&#8322;O, N&#8322; — up to 98% cleaner</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="p-3.5 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" style={{ boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
                <span className="text-xs font-semibold text-amber-400">400-800°C</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Operating temperature for optimal catalysis</p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
