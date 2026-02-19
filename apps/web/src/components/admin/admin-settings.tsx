'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Settings,
  Save,
  Globe,
  Mail,
  Phone,
  MapPin,
  Type,
  FileText,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';

const MULTI_LINE_KEYS = ['about_text', 'hero_subtitle', 'footer_description'];

interface SettingsGroup {
  titleKey: string;
  icon: LucideIcon;
  fields: { key: string; labelKey: string; icon: LucideIcon }[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    titleKey: 'settingsGeneral',
    icon: Globe,
    fields: [
      { key: 'site_name', labelKey: 'siteName', icon: Type },
      { key: 'site_description', labelKey: 'siteDescription', icon: FileText },
    ],
  },
  {
    titleKey: 'settingsContact',
    icon: Mail,
    fields: [
      { key: 'contact_email', labelKey: 'contactEmail', icon: Mail },
      { key: 'contact_phone', labelKey: 'contactPhone', icon: Phone },
      { key: 'contact_address', labelKey: 'contactAddress', icon: MapPin },
    ],
  },
  {
    titleKey: 'settingsContent',
    icon: FileText,
    fields: [
      { key: 'hero_title', labelKey: 'heroTitle', icon: Type },
      { key: 'hero_subtitle', labelKey: 'heroSubtitle', icon: FileText },
      { key: 'about_text', labelKey: 'aboutText', icon: FileText },
      { key: 'footer_description', labelKey: 'footerDescription', icon: FileText },
    ],
  },
  {
    titleKey: 'settingsSocial',
    icon: Globe,
    fields: [
      { key: 'social_facebook', labelKey: 'Facebook', icon: Globe },
      { key: 'social_twitter', labelKey: 'Twitter / X', icon: Globe },
      { key: 'social_linkedin', labelKey: 'LinkedIn', icon: Globe },
      { key: 'social_whatsapp', labelKey: 'WhatsApp', icon: Phone },
    ],
  },
  {
    titleKey: 'settingsAnalytics',
    icon: BarChart3,
    fields: [
      { key: 'google_analytics_id', labelKey: 'gaId', icon: BarChart3 },
      { key: 'google_tag_manager_id', labelKey: 'gtmId', icon: BarChart3 },
    ],
  },
];

const ALL_KEYS = SETTINGS_GROUPS.flatMap((g) => g.fields.map((f) => f.key));

export function AdminSettings() {
  const t = useTranslations('admin');
  const { token } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSiteSettings();
        if (res.data) {
          setSettings(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch site settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSuccessMsg('');
    try {
      // Only send keys that belong to our defined groups
      const payload: Record<string, string> = {};
      for (const key of ALL_KEYS) {
        if (settings[key] !== undefined) {
          payload[key] = settings[key];
        }
      }
      await api.updateSiteSettings(payload, token);
      setSuccessMsg(t('settingsSaved'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">{t('settings')}</h2>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {successMsg && (
        <div className="bg-primary/10 border border-primary/30 text-primary rounded-lg px-4 py-3 text-sm">
          {successMsg}
        </div>
      )}

      {SETTINGS_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        return (
          <Card key={group.titleKey} className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GroupIcon className="h-4 w-4 text-primary" />
                {t(group.titleKey)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.fields.map((field, fieldIdx) => {
                const isMultiLine = MULTI_LINE_KEYS.includes(field.key);
                // For social fields, use the raw label; for others, use the translation key
                const labelText = group.titleKey === 'settingsSocial'
                  ? field.labelKey
                  : t(field.labelKey);

                return (
                  <div key={field.key}>
                    <Label htmlFor={field.key} className="text-sm text-muted-foreground mb-1.5 block">
                      {labelText}
                    </Label>
                    {isMultiLine ? (
                      <Textarea
                        id={field.key}
                        value={settings[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        rows={3}
                      />
                    ) : (
                      <Input
                        id={field.key}
                        value={settings[field.key] || ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      />
                    )}
                    {fieldIdx < group.fields.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
