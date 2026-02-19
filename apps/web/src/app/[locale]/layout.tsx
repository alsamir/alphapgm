import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Providers } from '@/lib/providers';
import { ChatWidget } from '@/components/ai/chat-widget';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Catalyser — Catalytic Converter Pricing Platform',
  description: 'Professional catalytic converter pricing with real-time Platinum, Palladium, and Rhodium market data. AI-powered pricing assistant.',
  keywords: ['catalytic converter', 'pricing', 'platinum', 'palladium', 'rhodium', 'scrap', 'recycling'],
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased min-h-screen bg-background text-foreground`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <ChatWidget />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
