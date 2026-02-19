'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Save, User, Settings, Lock, Percent, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  profile: any;
}

const CURRENCIES = [
  { id: 1, code: 'USD', label: 'US Dollar ($)' },
  { id: 2, code: 'EUR', label: 'Euro (\u20AC)' },
  { id: 3, code: 'GBP', label: 'British Pound (\u00A3)' },
  { id: 4, code: 'TRY', label: 'Turkish Lira (\u20BA)' },
  { id: 5, code: 'AED', label: 'UAE Dirham (AED)' },
  { id: 6, code: 'SAR', label: 'Saudi Riyal (SAR)' },
  { id: 7, code: 'MAD', label: 'Moroccan Dirham (MAD)' },
];

export function ProfileSettings({ profile }: Props) {
  const { token } = useAuth();
  const t = useTranslations('dashboard');

  // Profile fields
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  // Settings fields
  const [currencyId, setCurrencyId] = useState<number>(profile?.settings?.currencyId || 1);
  const [discount, setDiscount] = useState<number>(profile?.settings?.discount ?? 0);
  const [restDiscount, setRestDiscount] = useState<boolean>(profile?.settings?.restDiscount ?? false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Sync state when profile prop changes
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
      setCurrencyId(profile.settings?.currencyId || 1);
      setDiscount(profile.settings?.discount ?? 0);
      setRestDiscount(profile.settings?.restDiscount ?? false);
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setProfileMessage('');
    try {
      await api.updateProfile({ firstName, lastName, phone }, token);
      setProfileMessage(t('profileUpdated'));
    } catch (err: any) {
      setProfileMessage(err.message || t('profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      await api.updateSettings({ currencyId }, token);
      setSettingsMessage(t('settingsUpdated'));
    } catch (err: any) {
      setSettingsMessage(err.message || t('settingsUpdateFailed'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPasswordMessage('');

    if (newPassword.length < 8) {
      setPasswordMessage(t('passwordMinLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage(t('passwordsNoMatch'));
      return;
    }

    setSavingPassword(true);
    try {
      await api.updateProfile({ password: newPassword }, token);
      setPasswordMessage(t('passwordChanged'));
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage(err.message || t('passwordChangeFailed'));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Information */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {t('profileInformation')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('email')}</label>
                <Input value={profile?.email || ''} disabled className="bg-secondary opacity-60" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('username')}</label>
                <Input value={profile?.username || ''} disabled className="bg-secondary opacity-60" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('firstName')}</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t('firstNamePlaceholder')}
                  className="bg-background"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('lastName')}</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t('lastNamePlaceholder')}
                  className="bg-background"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('phone')}</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phonePlaceholder')}
                className="bg-background"
              />
            </div>

            {/* Roles Display */}
            {profile?.roles && profile.roles.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t('roles')}</label>
                <div className="flex gap-1.5">
                  {profile.roles.map((role: string) => (
                    <Badge key={role} variant="outline" className="text-xs">
                      {role.replace('ROLE_', '')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profileMessage && (
              <p className={`text-sm ${profileMessage.includes('success') ? 'text-green-400' : 'text-destructive'}`}>
                {profileMessage}
              </p>
            )}
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('saving') : t('saveProfile')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences & Settings */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t('preferences')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Currency Selector */}
            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                {t('currency')}
              </label>
              <select
                value={currencyId}
                onChange={(e) => setCurrencyId(Number(e.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Discount Display (read-only, set by admin) */}
            {discount > 0 && (
              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('discount')}
                </label>
                <div className="flex items-center gap-3">
                  <Badge variant="accent" className="text-xs">
                    {t('percentOff', { percent: discount })}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{t('setByAdmin')}</span>
                </div>
              </div>
            )}

            {settingsMessage && (
              <p className={`text-sm ${settingsMessage.includes('success') ? 'text-green-400' : 'text-destructive'}`}>
                {settingsMessage}
              </p>
            )}
            <Button type="submit" disabled={savingSettings}>
              <Save className="h-4 w-4 mr-2" />
              {savingSettings ? t('saving') : t('savePreferences')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            {t('changePassword')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('newPassword')}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('newPasswordPlaceholder')}
                className="bg-background"
                minLength={8}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('confirmNewPassword')}</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('confirmPasswordPlaceholder')}
                className="bg-background"
                minLength={8}
              />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive mt-1">{t('passwordsNoMatch')}</p>
              )}
            </div>
            {passwordMessage && (
              <p className={`text-sm ${passwordMessage.includes('success') ? 'text-green-400' : 'text-destructive'}`}>
                {passwordMessage}
              </p>
            )}
            <Button
              type="submit"
              variant="outline"
              disabled={savingPassword || !newPassword || newPassword !== confirmPassword}
            >
              <Lock className="h-4 w-4 mr-2" />
              {savingPassword ? t('changing') : t('changePassword')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
