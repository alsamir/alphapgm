'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Send,
  Mail,
  Users,
  Search,
  X,
  Loader2,
  ChevronLeft,
  MessageSquare,
  Eye,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MessageRecord {
  id: number;
  subject: string;
  channel: string;
  targetType: string;
  targetId?: number | null;
  recipientCount: number;
  status: string;
  sentBy: number;
  sentAt: string;
  body?: string;
}

interface GroupRecord {
  id: number;
  name: string;
  memberCount: number;
}

interface UserRecord {
  id: number;
  email: string;
  username: string;
  name: string;
}

type ViewMode = 'list' | 'compose' | 'detail';

const ITEMS_PER_PAGE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function targetLabel(targetType: string, targetId?: number | null, groups?: GroupRecord[]): string {
  if (targetType === 'all') return 'All Users';
  if (targetType === 'group') {
    const group = groups?.find((g) => g.id === targetId);
    return group ? `Group: ${group.name}` : `Group: #${targetId}`;
  }
  return 'Specific Users';
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case 'sent':
      return 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30';
    case 'failed':
      return 'bg-red-600/20 text-red-400 border-red-600/30';
    case 'partial':
      return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30';
    case 'sending':
      return 'bg-blue-600/20 text-blue-400 border-blue-600/30';
    default:
      return 'bg-secondary text-muted-foreground';
  }
}

function targetBadgeVariant(targetType: string): 'default' | 'secondary' | 'outline' {
  if (targetType === 'all') return 'default';
  if (targetType === 'group') return 'secondary';
  return 'outline';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {Array.from({ length: 5 }).map((_, j) => (
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
  return (
    <div className="flex items-center justify-between mt-4">
      <span className="text-xs text-muted-foreground">Page {page}</span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled
          className="h-8 w-8 p-0 text-xs"
        >
          {page}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasMore || loading}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 p-0 rotate-180"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Compose Form
// ---------------------------------------------------------------------------

function ComposeForm({
  token,
  onBack,
  onToast,
}: {
  token: string | null;
  onBack: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'group' | 'users'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // Specific users selection
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserRecord[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserRecord[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch groups when "group" target type is selected
  useEffect(() => {
    if (targetType === 'group' && groups.length === 0 && token) {
      setGroupsLoading(true);
      api
        .getGroups(token)
        .then((res) => {
          setGroups(res.data || []);
        })
        .catch(() => {
          onToast('Failed to load groups', 'error');
        })
        .finally(() => setGroupsLoading(false));
    }
  }, [targetType, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced user search
  useEffect(() => {
    if (targetType !== 'users' || !userSearch.trim() || !token) {
      setUserResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const res = await api.listUsers({ search: userSearch.trim(), limit: 10 }, token);
        const results: UserRecord[] = res.data?.data || [];
        // Filter out already-selected users
        const filtered = results.filter(
          (u) => !selectedUsers.some((s) => s.id === u.id),
        );
        setUserResults(filtered);
        setShowDropdown(filtered.length > 0);
      } catch {
        setUserResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [userSearch, targetType, token, selectedUsers]);

  const addUser = (user: UserRecord) => {
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearch('');
    setUserResults([]);
    setShowDropdown(false);
  };

  const removeUser = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const recipientDescription = (): string => {
    if (targetType === 'all') return 'all users';
    if (targetType === 'group') {
      const group = groups.find((g) => g.id === selectedGroupId);
      return group ? `${group.memberCount} users in "${group.name}"` : 'the selected group';
    }
    return `${selectedUsers.length} selected user${selectedUsers.length !== 1 ? 's' : ''}`;
  };

  const canSend = (): boolean => {
    if (!subject.trim() || !body.trim()) return false;
    if (targetType === 'group' && !selectedGroupId) return false;
    if (targetType === 'users' && selectedUsers.length === 0) return false;
    return true;
  };

  const handleSend = async () => {
    if (!token || !canSend()) return;
    setSending(true);
    try {
      const payload: any = {
        subject: subject.trim(),
        body: body.trim(),
        channel: 'email',
        targetType,
      };
      if (targetType === 'group' && selectedGroupId) {
        payload.targetId = selectedGroupId;
      }
      if (targetType === 'users') {
        payload.userIds = selectedUsers.map((u) => u.id);
      }
      await api.sendAdminMessage(payload, token);
      onToast('Message sent successfully', 'success');
      onBack();
    } catch (err: any) {
      onToast(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Compose Message</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Send a message to your users via email.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Subject */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Subject *</label>
          <Input
            placeholder="Enter message subject..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="bg-background"
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Body *</label>
          <textarea
            placeholder="Enter message body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[100px]"
          />
        </div>

        {/* Target Type */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Target Audience</label>
          <div className="flex flex-wrap gap-3">
            {(['all', 'group', 'users'] as const).map((t) => (
              <label
                key={t}
                className={`flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  targetType === t
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  value={t}
                  checked={targetType === t}
                  onChange={() => setTargetType(t)}
                  className="sr-only"
                />
                {t === 'all' && <Users className="h-4 w-4" />}
                {t === 'group' && <Users className="h-4 w-4" />}
                {t === 'users' && <Mail className="h-4 w-4" />}
                {t === 'all' ? 'All Users' : t === 'group' ? 'Group' : 'Specific Users'}
              </label>
            ))}
          </div>
        </div>

        {/* Group Selector */}
        {targetType === 'group' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Select Group</label>
            {groupsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">-- Select a group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.memberCount} members)
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Specific Users Selector */}
        {targetType === 'users' && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Select Users</label>

            {/* Selected user chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {u.email}
                    <button
                      onClick={() => removeUser(u.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email, username, name..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onFocus={() => {
                  if (userResults.length > 0) setShowDropdown(true);
                }}
                onBlur={() => {
                  // Delay to allow click on dropdown item
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                className="pl-9 bg-background"
              />
              {userSearchLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}

              {/* Dropdown results */}
              {showDropdown && userResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-48 overflow-y-auto">
                  {userResults.map((u) => (
                    <button
                      key={u.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addUser(u)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-foreground">{u.email}</span>
                        {u.name && (
                          <span className="text-muted-foreground ml-2">({u.name})</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">@{u.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Channel</label>
          <div>
            <Badge variant="secondary" className="text-xs">
              <Mail className="h-3 w-3 mr-1.5" />
              Email
            </Badge>
          </div>
        </div>

        {/* Send Button / Confirmation */}
        <div className="flex items-center gap-3 pt-2">
          {!confirmOpen ? (
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend() || sending}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Send Message
            </Button>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-yellow-600/30 bg-yellow-600/10 w-full">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Are you sure you want to send this message to {recipientDescription()}?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending}
                  className="gap-2"
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Confirm Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Message Detail View
// ---------------------------------------------------------------------------

function MessageDetail({
  messageId,
  token,
  groups,
  onBack,
  onToast,
}: {
  messageId: number;
  token: string | null;
  groups: GroupRecord[];
  onBack: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [message, setMessage] = useState<MessageRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api
      .getAdminMessage(messageId, token)
      .then((res) => {
        setMessage(res.data || null);
      })
      .catch(() => {
        onToast('Failed to load message details', 'error');
      })
      .finally(() => setLoading(false));
  }, [messageId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Skeleton className="h-6 w-48" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!message) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Message not found</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate">{message.subject}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Sent {formatDate(message.sentAt)}
            </p>
          </div>
          <Badge className={`text-[10px] ${statusBadgeClasses(message.status)}`}>
            {message.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-secondary/20 border border-border/50">
          <div>
            <span className="text-xs text-muted-foreground block">Target</span>
            <Badge variant={targetBadgeVariant(message.targetType)} className="text-[10px] mt-1">
              {targetLabel(message.targetType, message.targetId, groups)}
            </Badge>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Recipients</span>
            <span className="text-sm font-medium text-foreground">{message.recipientCount}</span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Channel</span>
            <Badge variant="secondary" className="text-[10px] mt-1">
              <Mail className="h-3 w-3 mr-1" />
              {message.channel}
            </Badge>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Sent By</span>
            <span className="text-sm font-mono text-foreground">#{message.sentBy}</span>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Message Body
          </h4>
          <div className="p-4 rounded-lg border border-border/50 bg-background text-sm text-foreground whitespace-pre-wrap">
            {message.body || '(No body content)'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminMessages() {
  const { token } = useAuth();
  const [view, setView] = useState<ViewMode>('list');
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ------- Toast helper -------
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ------- Fetch messages -------
  const fetchMessages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getAdminMessages({ page, limit: ITEMS_PER_PAGE }, token);
      const data = res.data;
      setMessages(data?.data || []);
      setHasMore(data?.hasMore || false);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      showToast('Failed to fetch messages', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, page, showToast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // ------- Fetch groups for label mapping -------
  useEffect(() => {
    if (!token) return;
    api
      .getGroups(token)
      .then((res) => {
        setGroups(res.data || []);
      })
      .catch(() => {
        // Silent fail - groups are only used for labels
      });
  }, [token]);

  // ------- View message detail -------
  const handleViewMessage = (id: number) => {
    setSelectedMessageId(id);
    setView('detail');
  };

  // ------- Back to list -------
  const handleBackToList = () => {
    setView('list');
    setSelectedMessageId(null);
    fetchMessages();
  };

  // ------- Compose view -------
  if (view === 'compose') {
    return (
      <>
        {/* Toast notification */}
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
        <ComposeForm token={token} onBack={handleBackToList} onToast={showToast} />
      </>
    );
  }

  // ------- Detail view -------
  if (view === 'detail' && selectedMessageId) {
    return (
      <>
        {/* Toast notification */}
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
        <MessageDetail
          messageId={selectedMessageId}
          token={token}
          groups={groups}
          onBack={handleBackToList}
          onToast={showToast}
        />
      </>
    );
  }

  // ------- List view (default) -------
  return (
    <Card className="bg-card border-border">
      {/* Toast notification */}
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

      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Messages</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Send and manage mass messages to your users.
            </p>
          </div>
          <Button onClick={() => setView('compose')} className="gap-2">
            <Send className="h-4 w-4" />
            Compose Message
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-2 font-medium text-muted-foreground">Subject</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Target</th>
                <th className="py-3 px-2 font-medium text-muted-foreground text-center">Recipients</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                      <span className="text-muted-foreground">No messages sent yet</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('compose')}
                        className="text-xs mt-1 gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send your first message
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                messages.map((msg) => (
                  <tr
                    key={msg.id}
                    onClick={() => handleViewMessage(msg.id)}
                    className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground truncate max-w-[250px]" title={msg.subject}>
                          {msg.subject}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <Badge variant={targetBadgeVariant(msg.targetType)} className="text-[10px]">
                        {targetLabel(msg.targetType, msg.targetId, groups)}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="font-mono text-xs text-foreground">{msg.recipientCount}</span>
                    </td>
                    <td className="py-3 px-2">
                      <Badge className={`text-[10px] ${statusBadgeClasses(msg.status)}`}>
                        {msg.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(msg.sentAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && messages.length > 0 && (
          <PaginationControls
            page={page}
            hasMore={hasMore}
            loading={loading}
            onPageChange={setPage}
          />
        )}
      </CardContent>
    </Card>
  );
}
