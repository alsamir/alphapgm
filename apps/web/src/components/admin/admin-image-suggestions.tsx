'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface Suggestion {
  id: number;
  converterId: number;
  converterName: string;
  converterBrand: string;
  userEmail: string;
  userName: string;
  imageUrl: string;
  status: string;
  createdAt: string;
}

export function AdminImageSuggestions() {
  const { token } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchSuggestions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getImageSuggestions({ status: statusFilter, page, limit: 20 }, token);
      setSuggestions(res.data?.data || []);
      setHasMore(res.data?.hasMore || false);
    } catch (err) {
      console.error('Failed to fetch image suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [token, page, statusFilter]);

  const handleAction = async (id: number, action: 'approve' | 'reject') => {
    if (!token) return;
    setActionLoading(id);
    try {
      if (action === 'approve') {
        await api.approveImageSuggestion(id, token);
      } else {
        await api.rejectImageSuggestion(id, token);
      }
      // Remove from list
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(`Failed to ${action} suggestion:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Image Suggestions
        </h2>
        <div className="flex gap-1">
          {['pending', 'approved', 'rejected'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-8 text-center">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No {statusFilter} image suggestions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Thumbnail preview */}
                  <div className="h-20 w-20 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    <img
                      src={`/api/v1/images/thumb/${suggestion.converterId}`}
                      alt={suggestion.converterName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">{suggestion.converterName}</h3>
                      <Badge variant="secondary" className="text-[10px]">
                        {suggestion.converterBrand}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suggested by {suggestion.userEmail}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(suggestion.createdAt).toLocaleDateString()}
                    </p>
                    <Badge
                      variant={
                        suggestion.status === 'approved' ? 'default' :
                        suggestion.status === 'rejected' ? 'destructive' :
                        'outline'
                      }
                      className="mt-1 text-[10px]"
                    >
                      {suggestion.status}
                    </Badge>
                  </div>

                  {/* Actions */}
                  {suggestion.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-500 hover:text-green-400 hover:border-green-500/50"
                        onClick={() => handleAction(suggestion.id, 'approve')}
                        disabled={actionLoading === suggestion.id}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-400 hover:border-red-500/50"
                        onClick={() => handleAction(suggestion.id, 'reject')}
                        disabled={actionLoading === suggestion.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
