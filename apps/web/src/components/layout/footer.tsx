'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="border-t border-border bg-background/50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/logo.png"
                alt="Catalyser"
                width={46}
                height={25}
                className="h-6 w-auto"
              />
              <span className="text-xl font-bold">Cataly<span className="text-primary">ser</span></span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('platform')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/catalogue" className="hover:text-foreground transition-colors">{t('catalogue')}</Link></li>
              <li><Link href="/about" className="hover:text-foreground transition-colors">{t('about')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('legal')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors">{t('terms')}</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">{t('privacy')}</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition-colors">{t('contact')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">{t('connect')}</h4>
            <p className="text-sm text-muted-foreground">support@catalyser.com</p>
          </div>
        </div>
        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Catalyser. {t('rights')}
        </div>
      </div>
    </footer>
  );
}
