'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Mail,
  CreditCard,
  Shield,
  Loader2,
  KeyRound,
  Copy,
  History,
  FileText,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UserGroup {
  id: number;
  name: string;
  color?: string | null;
}

interface UserRecord {
  id: number;
  email: string;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  status: string;
  plan: string;
  credits: { available: number } | number;
  discount?: number;
  createdAt?: string;
  updatedAt?: string;
  phone?: string;
  lastLoginAt?: string;
  lastAccess?: string;
  groups?: UserGroup[];
}

const ROLE_OPTIONS = [
  { id: 1, label: 'User', value: 'ROLE_USER' },
  { id: 2, label: 'Moderator', value: 'ROLE_MODERATOR' },
  { id: 3, label: 'Admin', value: 'ROLE_ADMIN' },
] as const;

const STATUS_OPTIONS = [
  { id: 1, label: 'Active' },
  { id: 2, label: 'Inactive' },
  { id: 3, label: 'Banned' },
] as const;

const ITEMS_PER_PAGE = 20;

const GROUP_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleIdFromRoles(roles: string[]): number {
  if (roles.includes('ROLE_ADMIN')) return 3;
  if (roles.includes('ROLE_MODERATOR')) return 2;
  return 1;
}

function statusIdFromLabel(status: string): number {
  if (status === 'Banned') return 3;
  if (status === 'Inactive') return 2;
  return 1;
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'accent' | 'outline' {
  if (role === 'ROLE_ADMIN') return 'destructive';
  if (role === 'ROLE_MODERATOR') return 'accent';
  return 'secondary';
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'Active') return 'default';
  if (status === 'Banned') return 'destructive';
  return 'secondary';
}

function formatCredits(credits: { available: number } | number | undefined | null): string {
  if (credits === null || credits === undefined) return '0';
  if (typeof credits === 'number') return String(credits);
  return String(credits.available ?? 0);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Modal backdrop
// ---------------------------------------------------------------------------

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create User Modal
// ---------------------------------------------------------------------------

function CreateUserModal({ onClose, onCreated, token }: { onClose: () => void; onCreated: () => void; token: string }) {
  const [form, setForm] = useState({
    email: '', username: '', password: generatePassword(),
    firstName: '', lastName: '', phone: '',
    roleId: 1, statusId: 1,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.username || !form.password) {
      setError('Email, username, and password are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.createAdminUser(form, token);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Create User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" className="h-9 bg-background" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Username *</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" className="h-9 bg-background" required />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Password *</label>
            <div className="flex gap-2">
              <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-9 bg-background font-mono" required />
              <Button type="button" variant="outline" size="sm" className="h-9 text-xs whitespace-nowrap" onClick={() => setForm({ ...form, password: generatePassword() })}>
                Generate
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">First Name</label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="h-9 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Last Name</label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-9 bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 bg-background" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Role</label>
              <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
                {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Status</label>
              <select value={form.statusId} onChange={(e) => setForm({ ...form, statusId: Number(e.target.value) })} className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm">
                {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating...</> : <><Plus className="h-3.5 w-3.5 mr-1.5" />Create User</>}
            </Button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

// ---------------------------------------------------------------------------
// Edit User Modal
// ---------------------------------------------------------------------------

function EditUserModal({ user, onClose, onUpdated, token }: { user: UserRecord; onClose: () => void; onUpdated: () => void; token: string }) {
  const [form, setForm] = useState({
    email: user.email || '',
    username: user.username || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateAdminUser(user.id, form, token);
      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit User #{user.id}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Username</label>
              <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-9 bg-background" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">First Name</label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="h-9 bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Last Name</label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="h-9 bg-background" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 bg-background" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

// ---------------------------------------------------------------------------
// Delete Confirmation Modal
// ---------------------------------------------------------------------------

function DeleteUserModal({ user, onClose, onDeleted, token }: { user: UserRecord; onClose: () => void; onDeleted: () => void; token: string }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.deleteAdminUser(user.id, token);
      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-destructive">Delete User</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-sm">{error}</div>}
        <p className="text-sm text-muted-foreground mb-1">
          Are you sure you want to delete this user? This action cannot be undone.
        </p>
        <div className="p-3 rounded-lg bg-secondary/50 text-sm mb-4">
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{user.email}</span></div>
          <div><span className="text-muted-foreground">Username:</span> <span className="font-medium">{user.username}</span></div>
          <div><span className="text-muted-foreground">ID:</span> <span className="font-mono">{user.id}</span></div>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          All associated data (credits, price lists, AI chats, subscriptions) will be permanently deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Deleting...</> : <><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete User</>}
          </Button>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InlineRoleDropdown({
  user,
  onUpdate,
}: {
  user: UserRecord;
  onUpdate: (userId: number, roleId: number) => Promise<void>;
}) {
  const currentRoleId = roleIdFromRoles(user.roles);
  const [updating, setUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRoleId = Number(e.target.value);
    if (newRoleId === currentRoleId) return;
    setUpdating(true);
    try {
      await onUpdate(user.id, newRoleId);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentRoleId}
        onChange={handleChange}
        disabled={updating}
        className="appearance-none bg-secondary/60 border border-border rounded-md px-2 py-1 pr-7 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {ROLE_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {updating && (
        <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function InlineStatusDropdown({
  user,
  onUpdate,
}: {
  user: UserRecord;
  onUpdate: (userId: number, statusId: number) => Promise<void>;
}) {
  const currentStatusId = statusIdFromLabel(user.status || 'Active');
  const [updating, setUpdating] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatusId = Number(e.target.value);
    if (newStatusId === currentStatusId) return;
    setUpdating(true);
    try {
      await onUpdate(user.id, newStatusId);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentStatusId}
        onChange={handleChange}
        disabled={updating}
        className="appearance-none bg-secondary/60 border border-border rounded-md px-2 py-1 pr-7 text-xs font-medium text-foreground cursor-pointer hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {updating && (
        <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}

function UserDetailPanel({ user, token, onToast, onRefresh }: { user: UserRecord; token: string | null; onToast: (msg: string, type: 'success' | 'error') => void; onRefresh?: () => void }) {
  const [resetLoading, setResetLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [creditHistory, setCreditHistory] = useState<any[] | null>(null);
  const [priceListsLoading, setPriceListsLoading] = useState(false);
  const [userPriceLists, setUserPriceLists] = useState<any[] | null>(null);
  const [discount, setDiscount] = useState<number>((user as any).discount ?? 0);
  const [discountSaving, setDiscountSaving] = useState(false);

  const handleResetPassword = async () => {
    if (!token) return;
    setResetLoading(true);
    try {
      const res = await api.resetUserPassword(user.id, undefined, token);
      setTempPassword(res.data?.temporaryPassword || '');
      onToast('Password reset successfully', 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      onToast('Password copied to clipboard', 'success');
    }
  };

  const handleLoadHistory = async () => {
    if (!token || creditHistory) return;
    setHistoryLoading(true);
    try {
      const res = await api.getUserHistory(user.id, token);
      setCreditHistory(res.data?.credits || []);
    } catch (err: any) {
      onToast('Failed to load history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (!token) return;
    setDiscountSaving(true);
    try {
      await api.updateUserDiscount(user.id, discount, token);
      onToast(`Discount updated to ${discount}%`, 'success');
    } catch (err: any) {
      onToast(err.message || 'Failed to update discount', 'error');
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleLoadPriceLists = async () => {
    if (!token || userPriceLists) return;
    setPriceListsLoading(true);
    try {
      const res = await api.getAdminUserPriceLists(user.id, token);
      setUserPriceLists(res.data || []);
    } catch (err: any) {
      onToast('Failed to load price lists', 'error');
    } finally {
      setPriceListsLoading(false);
    }
  };

  return (
    <tr>
      <td colSpan={10} className="p-0">
        <div className="bg-secondary/20 border-t border-b border-border/50 px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Profile Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Profile Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="font-mono text-foreground">{user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="text-foreground">{user.name || '--'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username</span>
                  <span className="text-foreground">@{user.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="text-foreground truncate ml-2">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    <span className="text-foreground">{user.phone}</span>
                  </div>
                )}
              </div>
              {/* Group Badges */}
              {user.groups && user.groups.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-muted-foreground block mb-1.5">Groups</span>
                  <div className="flex flex-wrap gap-1">
                    {user.groups.map((g) => (
                      <span key={g.id} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${GROUP_COLORS[g.color || 'gray'] || GROUP_COLORS.gray}`}>
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Subscription & Credits */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Subscription &amp; Credits
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {user.plan || 'free'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits Available</span>
                  <span className="font-semibold text-foreground">{formatCredits(user.credits)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Discount %</span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="h-7 w-20 text-xs bg-background"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDiscount}
                      disabled={discountSaving}
                      className="h-7 text-[10px] px-2"
                    >
                      {discountSaving ? '...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Access & Activity */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Access &amp; Activity
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Roles</span>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {user.roles?.map((r) => (
                      <Badge key={r} variant={roleBadgeVariant(r)} className="text-[10px]">
                        {r.replace('ROLE_', '')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={statusBadgeVariant(user.status)} className="text-[10px]">
                    {user.status || 'Active'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-foreground text-xs">{formatDate(user.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Access</span>
                  <span className="text-foreground text-xs">{formatDate(user.lastAccess || user.lastLoginAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleResetPassword} disabled={resetLoading} className="h-8 text-xs">
                <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
              {tempPassword && (
                <div className="flex items-center gap-1.5 bg-secondary rounded-md px-2.5 py-1">
                  <code className="text-xs font-mono text-foreground">{tempPassword}</code>
                  <button onClick={handleCopyPassword} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleLoadHistory} disabled={historyLoading} className="h-8 text-xs">
              <History className="h-3.5 w-3.5 mr-1.5" />
              {historyLoading ? 'Loading...' : creditHistory ? 'History Loaded' : 'View Credit History'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleLoadPriceLists} disabled={priceListsLoading} className="h-8 text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              {priceListsLoading ? 'Loading...' : userPriceLists ? 'Price Lists Loaded' : 'View Price Lists'}
            </Button>
          </div>

          {/* Credit History Table */}
          {creditHistory && creditHistory.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Credit History (Last 50)
              </h4>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="py-1.5 text-left">Type</th>
                      <th className="py-1.5 text-right">Amount</th>
                      <th className="py-1.5 text-right">Balance</th>
                      <th className="py-1.5 text-left pl-3">Detail</th>
                      <th className="py-1.5 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditHistory.map((entry: any) => (
                      <tr key={entry.id} className="border-b border-border/30">
                        <td className="py-1.5">
                          <Badge variant={entry.amount > 0 ? 'default' : 'secondary'} className="text-[9px]">
                            {entry.type}
                          </Badge>
                        </td>
                        <td className={`py-1.5 text-right font-mono ${entry.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {entry.amount > 0 ? '+' : ''}{entry.amount}
                        </td>
                        <td className="py-1.5 text-right font-mono">{entry.balanceAfter}</td>
                        <td className="py-1.5 pl-3 text-muted-foreground truncate max-w-[200px]">{entry.sourceDetail || '--'}</td>
                        <td className="py-1.5 text-right text-muted-foreground">{formatDate(entry.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {creditHistory && creditHistory.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">No credit history for this user.</p>
          )}
          {userPriceLists && userPriceLists.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Price Lists
              </h4>
              {userPriceLists.map((list: any) => (
                <div key={list.id} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{list.name}</span>
                    <Badge variant="outline" className="text-[10px]">{list.itemCount} items</Badge>
                  </div>
                  {list.items?.length > 0 && (
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody>
                          {list.items.map((item: any) => (
                            <tr key={item.id} className="border-b border-border/30">
                              <td className="py-1">{item.converterName}</td>
                              <td className="py-1 text-muted-foreground">{item.converterBrand}</td>
                              <td className="py-1 text-right font-mono">x{item.quantity}</td>
                              <td className="py-1 text-right font-mono">${(item.totalPrice || 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {userPriceLists && userPriceLists.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground">No price lists for this user.</p>
          )}
        </div>
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: 10 }).map((_, j) => (
            <td key={j} className="py-3 px-2">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PaginationControls({
  page,
  hasMore,
  loading,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  loading: boolean;
  onPageChange: (p: number) => void;
}) {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = page + 2;
  for (let p = start; p <= end; p++) {
    if (p < page || p === page || (p > page && hasMore)) {
      pages.push(p);
    }
  }
  if (!pages.includes(1)) {
    pages.unshift(1);
  }

  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => onPageChange(page - 1)} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, idx) => {
          const showEllipsisBefore = idx > 0 && p - pages[idx - 1] > 1;
          return (
            <span key={p} className="flex items-center">
              {showEllipsisBefore && <span className="px-1 text-xs text-muted-foreground">...</span>}
              <Button variant={p === page ? 'default' : 'outline'} size="sm" disabled={loading} onClick={() => onPageChange(p)} className="h-8 w-8 p-0 text-xs">
                {p}
              </Button>
            </span>
          );
        })}
        <Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={() => onPageChange(page + 1)} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRecord | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.listUsers(
        { page, limit: ITEMS_PER_PAGE, search: debouncedSearch || undefined },
        token,
      );
      setUsers(res.data?.data || []);
      setHasMore(res.data?.hasMore || false);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showToast('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleRoleUpdate = useCallback(
    async (userId: number, roleId: number) => {
      if (!token) return;
      try {
        await api.updateUserRole(userId, roleId, token);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            const roleMap: Record<number, string> = { 1: 'ROLE_USER', 2: 'ROLE_MODERATOR', 3: 'ROLE_ADMIN' };
            return { ...u, roles: [roleMap[roleId] || 'ROLE_USER'] };
          }),
        );
        const label = ROLE_OPTIONS.find((r) => r.id === roleId)?.label || 'Unknown';
        showToast(`Role updated to ${label}`, 'success');
      } catch (err) {
        showToast('Failed to update role', 'error');
        fetchUsers();
      }
    },
    [token, showToast, fetchUsers],
  );

  const handleStatusUpdate = useCallback(
    async (userId: number, statusId: number) => {
      if (!token) return;
      try {
        await api.updateUserStatus(userId, statusId, token);
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== userId) return u;
            const statusMap: Record<number, string> = { 1: 'Active', 2: 'Inactive', 3: 'Banned' };
            return { ...u, status: statusMap[statusId] || 'Active' };
          }),
        );
        const label = STATUS_OPTIONS.find((s) => s.id === statusId)?.label || 'Unknown';
        showToast(`Status updated to ${label}`, 'success');
      } catch (err) {
        showToast('Failed to update status', 'error');
        fetchUsers();
      }
    },
    [token, showToast, fetchUsers],
  );

  const toggleExpand = (userId: number) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  const handleUserCreated = () => {
    showToast('User created successfully', 'success');
    fetchUsers();
  };

  const handleUserUpdated = () => {
    showToast('User updated successfully', 'success');
    fetchUsers();
  };

  const handleUserDeleted = () => {
    showToast('User deleted successfully', 'success');
    setExpandedUserId(null);
    fetchUsers();
  };

  return (
    <Card className="bg-card border-border">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600/90 text-white'
              : 'bg-destructive/90 text-destructive-foreground'
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && token && (
        <CreateUserModal token={token} onClose={() => setShowCreateModal(false)} onCreated={handleUserCreated} />
      )}
      {editingUser && token && (
        <EditUserModal user={editingUser} token={token} onClose={() => setEditingUser(null)} onUpdated={handleUserUpdated} />
      )}
      {deletingUser && token && (
        <DeleteUserModal user={deletingUser} token={token} onClose={() => setDeletingUser(null)} onDeleted={handleUserDeleted} />
      )}

      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage user roles, statuses, and view account details.
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create User
            </Button>
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, username, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-2 font-medium text-muted-foreground w-12">ID</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Email</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Username</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Role</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Plan</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Credits</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Groups</th>
                <th className="py-3 px-2 font-medium text-muted-foreground w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Mail className="h-8 w-8 text-muted-foreground/50" />
                      <span className="text-muted-foreground">No users found</span>
                      {debouncedSearch && (
                        <Button variant="ghost" size="sm" onClick={() => setSearch('')} className="text-xs mt-1">
                          Clear search
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isExpanded = expandedUserId === user.id;
                  return (
                    <React.Fragment key={user.id}>
                      <tr className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${isExpanded ? 'bg-secondary/20' : ''}`}>
                        <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{user.id}</td>
                        <td className="py-3 px-2">
                          <span className="truncate block max-w-[200px]" title={user.email}>{user.email}</span>
                        </td>
                        <td className="py-3 px-2 font-medium">{user.username}</td>
                        <td className="py-3 px-2 text-muted-foreground">{user.name || '--'}</td>
                        <td className="py-3 px-2">
                          <InlineRoleDropdown user={user} onUpdate={handleRoleUpdate} />
                        </td>
                        <td className="py-3 px-2">
                          <InlineStatusDropdown user={user} onUpdate={handleStatusUpdate} />
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{user.plan || 'free'}</Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs">{formatCredits(user.credits)}</td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-0.5">
                            {user.groups?.slice(0, 2).map((g) => (
                              <span key={g.id} className={`inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-medium border ${GROUP_COLORS[g.color || 'gray'] || GROUP_COLORS.gray}`}>
                                {g.name}
                              </span>
                            ))}
                            {(user.groups?.length || 0) > 2 && (
                              <span className="text-[9px] text-muted-foreground">+{(user.groups?.length || 0) - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)} className="h-7 w-7 p-0" title="Edit user">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeletingUser(user)} className="h-7 w-7 p-0 text-destructive hover:text-destructive" title="Delete user">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => toggleExpand(user.id)} className="h-7 w-7 p-0" title={isExpanded ? 'Collapse' : 'Expand'}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && <UserDetailPanel user={user} token={token} onToast={showToast} onRefresh={fetchUsers} />}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls page={page} hasMore={hasMore} loading={loading} onPageChange={setPage} />
      </CardContent>
    </Card>
  );
}
