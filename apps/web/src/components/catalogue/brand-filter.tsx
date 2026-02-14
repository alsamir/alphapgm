'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface BrandFilterProps {
  selectedBrand: string;
  onSelect: (brand: string) => void;
}

export function BrandFilter({ selectedBrand, onSelect }: BrandFilterProps) {
  const [brands, setBrands] = useState<{ brand: string; count: number }[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await api.getBrands();
        if (res.data) setBrands(res.data);
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  const filteredBrands = brands.filter((b) =>
    b.brand.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Brands</h3>
        {selectedBrand && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onSelect('')}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Filter brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 pl-7 text-xs bg-card"
        />
      </div>

      <div className="max-h-[400px] overflow-y-auto space-y-0.5 pr-1">
        {loading ? (
          <div className="text-xs text-muted-foreground py-2">Loading brands...</div>
        ) : (
          filteredBrands.map((b) => (
            <button
              key={b.brand}
              onClick={() => onSelect(selectedBrand === b.brand ? '' : b.brand)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between ${
                selectedBrand === b.brand
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              <span className="truncate">{b.brand}</span>
              <span className="text-[10px] ml-2 flex-shrink-0">{b.count}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
