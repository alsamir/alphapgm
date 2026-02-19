'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('language');
  const { isAuthenticated, token } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function switchLocale(newLocale: string) {
    // If user is authenticated, save language preference (fire-and-forget)
    if (isAuthenticated && token) {
      api.updateSettings({ language: newLocale }, token).catch(() => {});
    }

    // Replace the current locale prefix in the pathname with the new locale
    const segments = pathname.split('/');
    // segments[0] is empty string (before first /), segments[1] is the locale
    if (routing.locales.includes(segments[1] as any)) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    const newPath = segments.join('/') || '/';
    router.push(newPath);
    setOpen(false);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label={t('label')}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{t(locale as any)}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 shadow-lg">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm transition-colors ${
                loc === locale
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-popover-foreground hover:bg-secondary'
              }`}
            >
              <span>{t(loc as any)}</span>
              {loc === locale && (
                <span className="ml-auto text-xs text-primary">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
