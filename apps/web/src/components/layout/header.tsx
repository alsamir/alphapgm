'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { User, LogOut, Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useTranslations } from 'next-intl';

function AuthButtons() {
  const { user, isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const t = useTranslations('header');

  if (isLoading) {
    return <div className="h-9 w-24 bg-border/30 rounded-md animate-pulse" />;
  }

  if (isAuthenticated) {
    return (
      <>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <User className="h-4 w-4 mr-1" />
            {user?.firstName || user?.username}
          </Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              <Shield className="h-4 w-4 mr-1" />
              {t('admin')}
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut className="h-4 w-4" />
        </Button>
      </>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">{t('signIn')}</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register">{t('getStarted')}</Link>
      </Button>
    </>
  );
}

function MobileAuthButtons({ onClose }: { onClose: () => void }) {
  const { isAuthenticated, isAdmin, isLoading, logout } = useAuth();
  const t = useTranslations('header');

  if (isLoading) {
    return <div className="h-9 w-full bg-border/30 rounded-md animate-pulse" />;
  }

  if (isAuthenticated) {
    return (
      <>
        <Link href="/dashboard" className="text-sm py-2" onClick={onClose}>{t('dashboard')}</Link>
        {isAdmin && <Link href="/admin" className="text-sm py-2" onClick={onClose}>{t('admin')}</Link>}
        <Button variant="ghost" size="sm" onClick={() => { logout(); onClose(); }}>{t('signOut')}</Button>
      </>
    );
  }

  return (
    <div className="flex gap-2 pt-2">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login" onClick={onClose}>{t('signIn')}</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/register" onClick={onClose}>{t('getStarted')}</Link>
      </Button>
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations('header');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="Catalyser"
            width={46}
            height={25}
            className="h-6 w-auto"
            priority
          />
          <span className="text-xl font-bold text-foreground tracking-tight">
            Cataly<span className="text-primary">ser</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/catalogue" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('catalogue')}
          </Link>
          <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t('about')}
          </Link>
        </nav>

        {/* Language Switcher (Desktop) */}
        <div className="hidden md:flex items-center">
          <LanguageSwitcher />
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <AuthButtons />
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border bg-background"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link href="/catalogue" className="text-sm py-2" onClick={() => setMobileMenuOpen(false)}>{t('catalogue')}</Link>
              <Link href="/about" className="text-sm py-2" onClick={() => setMobileMenuOpen(false)}>{t('about')}</Link>
              <div className="py-2">
                <LanguageSwitcher />
              </div>
              <MobileAuthButtons onClose={() => setMobileMenuOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
