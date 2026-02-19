import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';
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

  // Fetch site settings for GA/GTM
  let gaId = '';
  let gtmId = '';
  try {
    const settingsRes = await fetch('http://localhost:3001/api/v1/settings', { next: { revalidate: 300 } });
    if (settingsRes.ok) {
      const settingsData = await settingsRes.json();
      const settings = settingsData.data || {};
      gaId = settings.google_analytics_id || '';
      gtmId = settings.google_tag_manager_id || '';
    }
  } catch {
    // Settings fetch is best-effort
  }

  return (
    <html lang={locale} dir={dir} className="dark" suppressHydrationWarning>
      <head>
          {gaId && (
            <>
              <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
              <Script id="ga4-init" strategy="afterInteractive">
                {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
              </Script>
            </>
          )}
          {gtmId && (
            <Script id="gtm-init" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
            </Script>
          )}
        </head>
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
