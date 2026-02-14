'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function AdminUsers() {
  const { token } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await api.listUsers({ page, limit: 20, search: search || undefined }, token);
        setUsers(res.data?.data || []);
        setHasMore(res.data?.hasMore || false);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token, page, search]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 bg-background"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-3 px-2 font-medium text-muted-foreground">ID</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Email</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Username</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Roles</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Plan</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Credits</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No users found</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-2">{user.id}</td>
                    <td className="py-3 px-2">{user.email}</td>
                    <td className="py-3 px-2">{user.username}</td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        {user.roles?.map((r: string) => (
                          <Badge key={r} variant="outline" className="text-[10px]">{r.replace('ROLE_', '')}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2">{user.plan}</td>
                    <td className="py-3 px-2">{user.credits}</td>
                    <td className="py-3 px-2">
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">
                        {user.status || 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">Page {page}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
