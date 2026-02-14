'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export function AdminConverters() {
  const { token } = useAuth();
  const [converters, setConverters] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConverters = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 25 };
      if (search) params.search = search;
      const res = await api.searchConverters(params, token);
      setConverters(res.data?.data || []);
      setHasMore(res.data?.hasMore || false);
    } catch (err) {
      console.error('Failed to fetch converters:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => {
    fetchConverters();
  }, [fetchConverters]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Converter Management</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search converters..."
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
                <th className="py-3 px-2 font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Brand</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Weight</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Image</th>
                <th className="py-3 px-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : converters.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No converters found</td></tr>
              ) : (
                converters.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-3 px-2">{c.id}</td>
                    <td className="py-3 px-2 max-w-[200px] truncate">{c.name}</td>
                    <td className="py-3 px-2"><Badge variant="secondary" className="text-[10px]">{c.brand}</Badge></td>
                    <td className="py-3 px-2">{c.weight || '—'}</td>
                    <td className="py-3 px-2">{c.imageUrl ? 'Yes' : 'No'}</td>
                    <td className="py-3 px-2">
                      <Link href={`/converter/${c.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
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
