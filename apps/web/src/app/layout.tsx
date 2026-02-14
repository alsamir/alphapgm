import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';
import { ChatWidget } from '@/components/ai/chat-widget';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Catalyser — Catalytic Converter Pricing Platform',
  description: 'Professional catalytic converter pricing with real-time Platinum, Palladium, and Rhodium market data. AI-powered pricing assistant.',
  keywords: ['catalytic converter', 'pricing', 'platinum', 'palladium', 'rhodium', 'scrap', 'recycling'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}>
        <Providers>
          {children}
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
