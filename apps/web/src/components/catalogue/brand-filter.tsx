'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface BrandFilterProps {
  selectedBrand: string;
  onSelect: (brand: string) => void;
}

export function BrandFilter({ selectedBrand, onSelect }: BrandFilterProps) {
  const t = useTranslations('catalogue');
  const [brands, setBrands] = useState<{ name: string; count: number }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.getBrands();
        if (res.data) {
          // Normalize: API may return { name, count } or { brand, count }
          const normalized = res.data.map((b: any) => ({
            name: b.name || b.brand || '',
            count: b.count || 0,
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

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalCount = brands.reduce((sum, b) => sum + b.count, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{t('brands')}</h3>
        {selectedBrand && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onSelect('')}>
            <X className="h-3 w-3 mr-1" /> {t('clear')}
          </Button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t('filterBrands')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-7 text-xs bg-card"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-0.5 pr-1">
        {loading ? (
          <div className="text-xs text-muted-foreground py-2">{t('loadingBrands')}</div>
        ) : (
          <>
            {/* All Brands option */}
            <button
              onClick={() => onSelect('')}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                !selectedBrand
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <span className="truncate font-medium">{t('allBrands')}</span>
              <span className="text-[10px] ml-2 flex-shrink-0">({totalCount})</span>
            </button>

            {/* Individual brands */}
            {filteredBrands.map((b) => (
              <button
                key={b.name}
                onClick={() => onSelect(selectedBrand === b.name ? '' : b.name)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                  selectedBrand === b.name
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <span className="truncate">{b.name}</span>
                <span className="text-[10px] ml-2 flex-shrink-0">({b.count})</span>
              </button>
            ))}

            {filteredBrands.length === 0 && (
              <div className="text-xs text-muted-foreground py-2 text-center">
                {t('noBrandsMatch')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
