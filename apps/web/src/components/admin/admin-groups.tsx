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
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Loader2,
  UserPlus,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Group {
  id: number;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  createdAt: string;
}

interface GroupMember {
  userId: number;
  email: string;
  username: string;
  name: string;
  addedAt: string;
}

interface UserRecord {
  id: number;
  email: string;
  username: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GROUP_COLORS: Record<string, string> = {
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  gray: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const COLOR_OPTIONS = ['blue', 'green', 'red', 'yellow', 'purple', 'gray'];

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
    });
  } catch {
    return dateStr;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function GroupListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-lg border border-border/50"
        >
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MemberListSkeleton() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
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

// ---------------------------------------------------------------------------
// Group Form (Create / Edit)
// ---------------------------------------------------------------------------

function GroupForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
}: {
  initialData?: { name: string; description: string; color: string };
  onSubmit: (data: { name: string; description: string; color: string }) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [color, setColor] = useState(initialData?.color || 'blue');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), description: description.trim(), color });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-secondary/20 border border-border/50 rounded-lg p-4 space-y-4"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Name <span className="text-red-400">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name"
            className="h-9 bg-background"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className="h-9 bg-background"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={loading || !name.trim()} className="h-8 text-xs">
          {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          {initialData ? 'Update Group' : 'Create Group'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-8 text-xs">
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Add Members Panel
// ---------------------------------------------------------------------------

function AddMembersPanel({
  groupId,
  existingMemberIds,
  token,
  onAdded,
  onClose,
  onToast,
}: {
  groupId: number;
  existingMemberIds: number[];
  token: string;
  onAdded: () => void;
  onClose: () => void;
  onToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<UserRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);

  const searchUsers = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await api.listUsers({ search: query, limit: 10 }, token);
        const users: UserRecord[] = res.data?.data || [];
        // Filter out users already in the group
        setResults(users.filter((u) => !existingMemberIds.includes(u.id)));
      } catch {
        onToast('Failed to search users', 'error');
      } finally {
        setSearching(false);
      }
    },
    [token, existingMemberIds, onToast],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, searchUsers]);

  const handleAdd = async (userId: number) => {
    setAdding(userId);
    try {
      await api.addGroupMembers(groupId, [userId], token);
      onToast('Member added successfully', 'success');
      setResults((prev) => prev.filter((u) => u.id !== userId));
      onAdded();
    } catch (err: any) {
      onToast(err.message || 'Failed to add member', 'error');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="bg-secondary/20 border border-border/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Add Members
        </h4>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by email, username, name..."
          className="pl-9 h-9 bg-background"
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground text-xs">
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Username</th>
                <th className="py-2 text-right w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {results.map((user) => (
                <tr key={user.id} className="border-b border-border/30">
                  <td className="py-2 text-foreground">{user.name || '--'}</td>
                  <td className="py-2 text-muted-foreground">{user.email}</td>
                  <td className="py-2 text-muted-foreground">@{user.username}</td>
                  <td className="py-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAdd(user.id)}
                      disabled={adding === user.id}
                      className="h-7 text-[10px] px-2"
                    >
                      {adding === user.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {search.trim() && !searching && results.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No matching users found
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AdminGroups() {
  const { token } = useAuth();

  // Group list state
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation state
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Selected group & members state
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ------- Toast helper -------
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ------- Fetch groups -------
  const fetchGroups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getGroups(token);
      setGroups(res.data || []);
    } catch {
      showToast('Failed to fetch groups', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // ------- Fetch members -------
  const fetchMembers = useCallback(
    async (groupId: number) => {
      if (!token) return;
      setMembersLoading(true);
      try {
        const res = await api.getGroupMembers(groupId, token);
        setMembers(res.data || []);
      } catch {
        showToast('Failed to fetch members', 'error');
      } finally {
        setMembersLoading(false);
      }
    },
    [token, showToast],
  );

  // ------- Select group -------
  const handleSelectGroup = (groupId: number) => {
    if (selectedGroupId === groupId) {
      setSelectedGroupId(null);
      setMembers([]);
      setShowAddMembers(false);
      return;
    }
    setSelectedGroupId(groupId);
    setShowAddMembers(false);
    fetchMembers(groupId);
  };

  // ------- Create group -------
  const handleCreate = async (data: { name: string; description: string; color: string }) => {
    if (!token) return;
    setFormLoading(true);
    try {
      await api.createGroup(data, token);
      showToast('Group created successfully', 'success');
      setShowCreateForm(false);
      fetchGroups();
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ------- Update group -------
  const handleUpdate = async (data: { name: string; description: string; color: string }) => {
    if (!token || !editingGroup) return;
    setFormLoading(true);
    try {
      await api.updateGroup(editingGroup.id, data, token);
      showToast('Group updated successfully', 'success');
      setEditingGroup(null);
      fetchGroups();
    } catch (err: any) {
      showToast(err.message || 'Failed to update group', 'error');
    } finally {
      setFormLoading(false);
    }
  };

  // ------- Delete group -------
  const handleDelete = async (groupId: number) => {
    if (!token) return;
    setDeleteLoading(true);
    try {
      await api.deleteGroup(groupId, token);
      showToast('Group deleted successfully', 'success');
      setDeletingGroupId(null);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
        setMembers([]);
      }
      fetchGroups();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete group', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ------- Remove member -------
  const handleRemoveMember = async (userId: number) => {
    if (!token || !selectedGroupId) return;
    setRemovingMemberId(userId);
    try {
      await api.removeGroupMembers(selectedGroupId, [userId], token);
      showToast('Member removed successfully', 'success');
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
      // Update local member count
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId ? { ...g, memberCount: Math.max(0, g.memberCount - 1) } : g,
        ),
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member', 'error');
    } finally {
      setRemovingMemberId(null);
    }
  };

  // ------- On member added (refresh) -------
  const handleMemberAdded = () => {
    if (selectedGroupId) {
      fetchMembers(selectedGroupId);
      // Update local member count
      setGroups((prev) =>
        prev.map((g) =>
          g.id === selectedGroupId ? { ...g, memberCount: g.memberCount + 1 } : g,
        ),
      );
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

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
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Create and manage user groups, assign members.
            </p>
          </div>
          {!showCreateForm && !editingGroup && (
            <Button
              size="sm"
              onClick={() => setShowCreateForm(true)}
              className="h-9 text-xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Group
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Create form */}
        {showCreateForm && (
          <GroupForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
            loading={formLoading}
          />
        )}

        {/* Edit form */}
        {editingGroup && (
          <GroupForm
            initialData={{
              name: editingGroup.name,
              description: editingGroup.description || '',
              color: editingGroup.color || 'blue',
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditingGroup(null)}
            loading={formLoading}
          />
        )}

        {/* Groups list */}
        {loading ? (
          <GroupListSkeleton />
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <Users className="h-8 w-8 text-muted-foreground/50" />
            <span className="text-muted-foreground">No groups found</span>
            {!showCreateForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCreateForm(true)}
                className="text-xs mt-1"
              >
                Create your first group
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => {
              const isSelected = selectedGroupId === group.id;
              const colorClasses = GROUP_COLORS[group.color] || GROUP_COLORS.gray;

              return (
                <React.Fragment key={group.id}>
                  <div
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-primary/50 bg-secondary/30'
                        : 'border-border/50 hover:bg-secondary/20'
                    }`}
                    onClick={() => handleSelectGroup(group.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className={`flex items-center justify-center h-9 w-9 rounded-full border ${colorClasses}`}
                      >
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground truncate">
                            {group.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] border ${colorClasses}`}
                          >
                            {group.color}
                          </Badge>
                        </div>
                        {group.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        {formatDate(group.createdAt)}
                      </span>

                      {/* Delete confirmation */}
                      {deletingGroupId === group.id ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] text-red-400 mr-1">Delete?</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(group.id)}
                            disabled={deleteLoading}
                            className="h-7 w-7 p-0 text-red-400 border-red-500/30 hover:bg-red-500/20"
                          >
                            {deleteLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingGroupId(null)}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingGroup(group);
                              setShowCreateForm(false);
                            }}
                            className="h-7 w-7 p-0"
                            title="Edit group"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingGroupId(group.id)}
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                            title="Delete group"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Members panel */}
                  {isSelected && (
                    <div className="ml-4 border-l-2 border-primary/30 pl-4 space-y-3">
                      {/* Members header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Members of {selectedGroup?.name}
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddMembers(!showAddMembers)}
                          className="h-8 text-xs"
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                          {showAddMembers ? 'Close' : 'Add Members'}
                        </Button>
                      </div>

                      {/* Add members panel */}
                      {showAddMembers && (
                        <AddMembersPanel
                          groupId={group.id}
                          existingMemberIds={members.map((m) => m.userId)}
                          token={token!}
                          onAdded={handleMemberAdded}
                          onClose={() => setShowAddMembers(false)}
                          onToast={showToast}
                        />
                      )}

                      {/* Members table */}
                      {membersLoading ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="py-2 px-2 font-medium text-muted-foreground">Name</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground">Email</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground">Username</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground">Added</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground w-20 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              <MemberListSkeleton />
                            </tbody>
                          </table>
                        </div>
                      ) : members.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8">
                          <Users className="h-6 w-6 text-muted-foreground/50" />
                          <span className="text-xs text-muted-foreground">
                            No members in this group
                          </span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left">
                                <th className="py-2 px-2 font-medium text-muted-foreground">Name</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground">Email</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground">Username</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground">Added</th>
                                <th className="py-2 px-2 font-medium text-muted-foreground w-20 text-right">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {members.map((member) => (
                                <tr
                                  key={member.userId}
                                  className="border-b border-border/50 hover:bg-secondary/20 transition-colors"
                                >
                                  <td className="py-2.5 px-2 text-foreground">
                                    {member.name || '--'}
                                  </td>
                                  <td className="py-2.5 px-2 text-muted-foreground">
                                    <span className="truncate block max-w-[200px]" title={member.email}>
                                      {member.email}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-muted-foreground font-medium">
                                    @{member.username}
                                  </td>
                                  <td className="py-2.5 px-2 text-xs text-muted-foreground">
                                    {formatDate(member.addedAt)}
                                  </td>
                                  <td className="py-2.5 px-2 text-right">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRemoveMember(member.userId)}
                                      disabled={removingMemberId === member.userId}
                                      className="h-7 text-[10px] px-2 text-red-400 border-red-500/30 hover:bg-red-500/20"
                                    >
                                      {removingMemberId === member.userId ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Remove'
                                      )}
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
