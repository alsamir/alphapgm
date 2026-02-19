'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Turnstile } from '@/components/auth/turnstile';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const t = useTranslations('auth');
  const [formData, setFormData] = useState({ email: '', username: '', password: '', confirmPassword: '', firstName: '', lastName: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsNoMatch'));
      return;
    }
    if (formData.password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }
    setLoading(true);
    try {
      await register({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: formData.phone || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || t('registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="bg-card border-border">
            <CardHeader className="text-center">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">{t('registerTitle')}</CardTitle>
              <CardDescription>{t('registerSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('email')} *</label>
                    <Input type="email" placeholder={t('emailPlaceholder')} value={formData.email} onChange={(e) => updateField('email', e.target.value)} required className="bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('username')} *</label>
                    <Input placeholder={t('usernamePlaceholder')} value={formData.username} onChange={(e) => updateField('username', e.target.value)} required className="bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('firstName')}</label>
                    <Input placeholder={t('firstNamePlaceholder')} value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} className="bg-background" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{t('lastName')}</label>
                    <Input placeholder={t('lastNamePlaceholder')} value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} className="bg-background" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('phone')}</label>
                  <Input type="tel" placeholder={t('phonePlaceholder')} value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} className="bg-background" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('password')} *</label>
                  <div className="relative">
                    <Input type={showPassword ? 'text' : 'password'} placeholder={t('passwordPlaceholder')} value={formData.password} onChange={(e) => updateField('password', e.target.value)} required className="bg-background pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">{t('confirmPassword')} *</label>
                  <Input type="password" placeholder={t('passwordPlaceholder')} value={formData.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} required className="bg-background" />
                </div>
                <Turnstile onSuccess={setTurnstileToken} onExpire={() => setTurnstileToken('')} />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('registering') : t('registerButton')}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {t('hasAccount')}{' '}
                  <Link href="/login" className="text-primary hover:underline">{t('signIn')}</Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
