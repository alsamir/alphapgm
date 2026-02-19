'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConverterCard } from './converter-card';
import { BrandFilter } from './brand-filter';
import { Search, Grid3X3, List, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

type SortOption = 'name-asc' | 'name-desc' | 'brand-asc' | 'brand-desc';

const SORT_OPTION_KEYS: { value: SortOption; key: string }[] = [
  { value: 'name-asc', key: 'sortNameAsc' },
  { value: 'name-desc', key: 'sortNameDesc' },
  { value: 'brand-asc', key: 'sortBrandAsc' },
  { value: 'brand-desc', key: 'sortBrandDesc' },
];

function parseSortOption(sort: string | null): { sortBy: string; sortOrder: 'asc' | 'desc' } {
  switch (sort) {
    case 'name-desc':
      return { sortBy: 'name', sortOrder: 'desc' };
    case 'brand-asc':
      return { sortBy: 'brand', sortOrder: 'asc' };
    case 'brand-desc':
      return { sortBy: 'brand', sortOrder: 'desc' };
    case 'name-asc':
    default:
      return { sortBy: 'name', sortOrder: 'asc' };
  }
}

const ITEMS_PER_PAGE = 24;

export function CatalogueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const t = useTranslations('catalogue');

  // Read initial state from URL params
  const [search, setSearch] = useState(searchParams.get('query') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'name-asc',
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [converters, setConverters] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync state to URL
  const updateUrl = useCallback(
    (overrides: { query?: string; brand?: string; page?: number; sort?: string }) => {
      const params = new URLSearchParams();
      const q = overrides.query !== undefined ? overrides.query : search;
      const b = overrides.brand !== undefined ? overrides.brand : brand;
      const p = overrides.page !== undefined ? overrides.page : page;
      const s = overrides.sort !== undefined ? overrides.sort : sort;

      if (q) params.set('query', q);
      if (b) params.set('brand', b);
      if (p > 1) params.set('page', String(p));
      if (s && s !== 'name-asc') params.set('sort', s);

      router.push(`/catalogue?${params.toString()}`, { scroll: false });
    },
    [search, brand, page, sort, router],
  );

  const fetchConverters = useCallback(async () => {
    setLoading(true);
    try {
      const { sortBy, sortOrder } = parseSortOption(sort);
      const params: Record<string, any> = {
        page,
        limit: ITEMS_PER_PAGE,
        sortBy,
        sortOrder,
      };
      if (search) params.query = search;
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
  }, [page, search, brand, sort, token]);

  useEffect(() => {
    fetchConverters();
  }, [fetchConverters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    updateUrl({ query: search, page: 1 });
  };

  const handleBrandSelect = (b: string) => {
    setBrand(b);
    setPage(1);
    updateUrl({ brand: b, page: 1 });
  };

  const handleSortChange = (value: string) => {
    const s = value as SortOption;
    setSort(s);
    setPage(1);
    updateUrl({ sort: s, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    updateUrl({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Build page numbers for pagination
  const pageNumbers = useMemo(() => {
    // We don't know total pages from the API (anti-scraping), but we know current page and hasMore
    // Show current page and surrounding pages
    const pages: (number | 'ellipsis')[] = [];
    const maxPage = hasMore ? page + 1 : page;

    if (page <= 4) {
      for (let i = 1; i <= Math.min(maxPage, 5); i++) {
        pages.push(i);
      }
      if (hasMore && maxPage > 5) {
        pages.push('ellipsis');
      }
    } else {
      pages.push(1);
      pages.push('ellipsis');
      for (let i = page - 1; i <= Math.min(page + 1, maxPage); i++) {
        if (i > 1) pages.push(i);
      }
      if (hasMore) {
        pages.push('ellipsis');
      }
    }

    return pages;
  }, [page, hasMore]);

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="lg:w-64 flex-shrink-0">
        <div className="sticky top-20 space-y-6">
          <BrandFilter selectedBrand={brand} onSelect={handleBrandSelect} />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card"
            />
          </div>
          <Button type="submit">{t('search')}</Button>
        </form>

        {/* Toolbar: sort, result count, view toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {loading ? t('loading') : `${t('showing')} ${converters.length} ${t('results')}`}
              {brand && (
                <span>
                  {' '}{t('in')} <span className="text-foreground font-medium">{brand}</span>
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sort dropdown */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={sort} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-card">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTION_KEYS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.key)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View mode */}
            <div className="flex gap-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
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
            <p className="text-muted-foreground text-lg">{t('noResults')}</p>
            <p className="text-muted-foreground text-sm mt-2">
              {t('tryDifferent')}
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
                : 'space-y-3'
            }
          >
            {converters.map((converter) => (
              <ConverterCard key={converter.id} converter={converter} viewMode={viewMode} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && converters.length > 0 && (
          <div className="flex items-center justify-center gap-1 mt-8">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {t('prev')}
            </Button>

            {pageNumbers.map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground text-sm">
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </Button>
              ),
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => handlePageChange(page + 1)}
              className="h-8"
            >
              {t('next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
