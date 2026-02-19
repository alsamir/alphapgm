'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, ChevronDown, Filter } from 'lucide-react';

const CDN_BASE = 'https://apg.fra1.cdn.digitaloceanspaces.com';

interface BrandFilterProps {
  selectedBrand: string;
  onSelect: (brand: string) => void;
}

export function BrandFilter({ selectedBrand, onSelect }: BrandFilterProps) {
  const t = useTranslations('catalogue');
  const [brands, setBrands] = useState<{ name: string; count: number; brandImage?: string | null }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.getBrands();
        if (res.data) {
          const normalized = res.data.map((b: any) => ({
            name: b.name || b.brand || '',
            count: b.count || 0,
            brandImage: b.brandImage || null,
          }));
          setBrands(normalized);
        }
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (brandName: string) => {
    onSelect(brandName);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="h-9 bg-card border-border gap-2 w-full sm:w-auto justify-between"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          {selectedBrand ? (
            <span className="truncate text-sm">{selectedBrand}</span>
          ) : (
            <span className="text-sm text-muted-foreground">{t('allBrands')}</span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedBrand && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect('');
              }}
              className="h-4 w-4 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </Button>

      {/* Selected brand badge (shown when closed and brand is selected) */}
      {selectedBrand && !open && (
        <Badge
          variant="secondary"
          className="absolute -top-2 -right-2 text-[9px] px-1.5 py-0 h-4 sm:hidden"
        >
          1
        </Badge>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[280px] mt-1 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t('filterBrands')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-sm bg-background"
                autoFocus
              />
            </div>
          </div>

          {/* Brand list */}
          <div className="max-h-[50vh] overflow-y-auto p-1">
            {loading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">{t('loadingBrands')}</div>
            ) : (
              <>
                {/* All Brands option */}
                <button
                  onClick={() => handleSelect('')}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                    !selectedBrand
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  <span>{t('allBrands')}</span>
                </button>

                {/* Individual brands */}
                {filteredBrands.map((b) => (
                  <button
                    key={b.name}
                    onClick={() => handleSelect(b.name)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5 ${
                      selectedBrand === b.name
                        ? 'bg-primary/15 text-primary font-medium'
                        : 'text-foreground hover:bg-secondary'
                    }`}
                  >
                    {b.brandImage && (
                      <img
                        src={`${CDN_BASE}/logo/${b.brandImage}`}
                        alt=""
                        className="h-5 w-5 object-contain flex-shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <span className="truncate flex-1">{b.name}</span>
                  </button>
                ))}

                {filteredBrands.length === 0 && (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    {t('noBrandsMatch')}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
