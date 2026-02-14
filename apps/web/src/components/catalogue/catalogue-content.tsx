'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ConverterCard } from './converter-card';
import { BrandFilter } from './brand-filter';
import { Search, Grid3X3, List, ChevronLeft, ChevronRight } from 'lucide-react';

export function CatalogueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [converters, setConverters] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConverters = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 24 };
      if (search) params.search = search;
      if (brand) params.brand = brand;

      const res = await api.searchConverters(params, token || undefined);
      if (res.data) {
        setConverters(res.data.data);
        setHasMore(res.data.hasMore);
      }
    } catch (err) {
      console.error('Failed to fetch converters:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, brand, token]);

  useEffect(() => {
    fetchConverters();
  }, [fetchConverters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (brand) params.set('brand', brand);
    router.push(`/catalogue?${params.toString()}`);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="sticky top-20 space-y-6">
          <BrandFilter selectedBrand={brand} onSelect={(b) => { setBrand(b); setPage(1); }} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by code, name, or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {loading ? 'Loading...' : `Showing ${converters.length} results`}
            {brand && <span> in <span className="text-foreground font-medium">{brand}</span></span>}
          </p>
          <div className="flex gap-1">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : converters.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No converters found</p>
            <p className="text-muted-foreground text-sm mt-2">Try a different search term or filter</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
            {converters.map((converter) => (
              <ConverterCard key={converter.id} converter={converter} viewMode={viewMode} />
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
