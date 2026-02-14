'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface Props {
  profile: any;
}

export function ProfileSettings({ profile }: Props) {
  const { token } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage('');
    try {
      await api.updateProfile({ name, phone }, token);
      setMessage('Profile updated successfully');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border max-w-lg">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email</label>
            <Input value={profile?.email || ''} disabled className="bg-secondary opacity-60" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Username</label>
            <Input value={profile?.username || ''} disabled className="bg-secondary opacity-60" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Full Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Phone</label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="bg-background" />
          </div>
          {message && (
            <p className={`text-sm ${message.includes('success') ? 'text-primary' : 'text-destructive'}`}>{message}</p>
          )}
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
