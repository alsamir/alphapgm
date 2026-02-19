'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { User, LogOut, Shield, Menu, X, FileText, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useTranslations } from 'next-intl';

function PriceListBadge() {
  const { token, isAuthenticated } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    api.getPriceLists(token).then((res) => {
      const total = (res.data || []).reduce((sum: number, l: any) => sum + (l.itemCount || 0), 0);
      setCount(total);
    }).catch(() => {});
  }, [token, isAuthenticated]);

  if (!isAuthenticated || count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center px-1">
      {count}
    </span>
  );
}

export function Header() {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('header');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image src="/logo.png" alt="Catalyser" width={46} height={25} className="h-5 w-auto" priority />
          <span className="text-lg font-bold text-foreground tracking-tight hidden sm:inline">
            Cataly<span className="text-primary">ser</span>
          </span>
        </Link>

        {/* Desktop Nav — all grouped together on the right */}
        <div className="hidden md:flex items-center gap-1">
          {/* Main nav links */}
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href="/catalogue">{t('catalogue')}</Link>
          </Button>

          {/* Authenticated items */}
          {!isLoading && isAuthenticated && (
            <>
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  {t('dashboard')}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground relative" asChild>
                <Link href="/dashboard?tab=pricelists">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  {t('priceLists')}
                  <PriceListBadge />
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                  <Link href="/admin">
                    <Shield className="h-3.5 w-3.5 mr-1.5" />
                    {t('admin')}
                  </Link>
                </Button>
              )}
            </>
          )}

          {/* Separator */}
          <div className="h-5 w-px bg-border mx-1" />

          {/* Language */}
          <LanguageSwitcher />

          {/* Auth */}
          {isLoading ? (
            <div className="h-8 w-20 bg-border/30 rounded-md animate-pulse" />
          ) : isAuthenticated ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
                <Link href="/dashboard?tab=profile">
                  <User className="h-3.5 w-3.5 mr-1.5" />
                  <span className="max-w-[80px] truncate">{user?.firstName || user?.username}</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={logout}>
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t('signIn')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t('getStarted')}</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile: language + hamburger */}
        <div className="flex md:hidden items-center gap-1">
          <LanguageSwitcher />
          <button className="p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <nav className="container mx-auto px-4 py-3 flex flex-col">
              <Link
                href="/catalogue"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {t('catalogue')}
              </Link>

              {!isLoading && isAuthenticated && (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                    {t('dashboard')}
                  </Link>
                  <Link
                    href="/dashboard?tab=pricelists"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {t('priceLists')}
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors"
                      onClick={() => setMobileOpen(false)}
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      {t('admin')}
                    </Link>
                  )}

                  <div className="border-t border-border my-2" />

                  <Link
                    href="/dashboard?tab=profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-secondary transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    {user?.firstName || user?.username || user?.email}
                  </Link>
                  <button
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                    onClick={() => { logout(); setMobileOpen(false); }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('signOut')}
                  </button>
                </>
              )}

              {!isLoading && !isAuthenticated && (
                <div className="flex gap-2 px-3 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href="/login" onClick={() => setMobileOpen(false)}>{t('signIn')}</Link>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>{t('getStarted')}</Link>
                  </Button>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
