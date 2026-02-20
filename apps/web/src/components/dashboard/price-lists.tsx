'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Minus,
  Trash2,
  FileText,
  Download,
  ChevronRight,
  ChevronLeft,
  Package,
  X,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CurrencySelector, useCurrency } from '@/components/ui/currency-selector';

interface PriceListSummary {
  id: number;
  name: string;
  status: string;
  isExpired?: boolean;
  expiresAt?: string;
  itemCount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface PriceListItem {
  id: number;
  converterId: number;
  converterName: string;
  converterBrand: string;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  createdAt: string;
}

interface PriceListDetail {
  id: number;
  name: string;
  status: string;
  isExpired?: boolean;
  expiresAt?: string;
  items: PriceListItem[];
  total: number;
  createdAt: string;
  updatedAt: string;
}

function getTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}

export function PriceLists() {
  const { token } = useAuth();
  const t = useTranslations('dashboard');
  const { format: formatPrice } = useCurrency();

  const [lists, setLists] = useState<PriceListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState<PriceListDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState('');

  const fetchLists = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.getPriceLists(token);
      setLists(res.data || []);
    } catch (err) {
      console.error('Failed to fetch price lists:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newListName.trim()) return;
    setCreating(true);
    try {
      await api.createPriceList(newListName.trim(), token);
      setNewListName('');
      setShowCreateForm(false);
      setMessage(t('priceListCreated'));
      fetchLists();
    } catch (err: any) {
      setMessage(err.message || 'Failed to create price list');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (id: number) => {
    if (!token) return;
    try {
      await api.deletePriceList(id, token);
      setMessage(t('priceListDeleted'));
      if (selectedList?.id === id) setSelectedList(null);
      fetchLists();
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete');
    }
  };

  const handleSelectList = async (id: number) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const res = await api.getPriceList(id, token);
      setSelectedList(res.data);
    } catch (err) {
      console.error('Failed to fetch price list:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: number, quantity: number) => {
    if (!token || !selectedList || quantity < 1) return;
    try {
      await api.updatePriceListItemQuantity(selectedList.id, itemId, quantity, token);
      handleSelectList(selectedList.id);
      fetchLists();
    } catch (err: any) {
      setMessage(err.message || 'Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!token || !selectedList) return;
    try {
      await api.removePriceListItem(selectedList.id, itemId, token);
      setMessage(t('itemRemoved'));
      handleSelectList(selectedList.id);
      fetchLists();
    } catch (err: any) {
      setMessage(err.message || 'Failed to remove item');
    }
  };

  const handleExport = async () => {
    if (!token || !selectedList) return;
    try {
      const blob = await api.exportPriceList(selectedList.id, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pricelist-${selectedList.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Clear message after 3s
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {message && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm flex items-center justify-between">
          {message}
          <button onClick={() => setMessage('')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* List view */}
      {!selectedList && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{t('priceLists')}</h2>
              <CurrencySelector />
            </div>
            {lists.length === 0 && (
              <Button
                size="sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {t('createPriceList')}
              </Button>
            )}
          </div>

          {showCreateForm && (
            <Card className="bg-card border-border">
              <CardContent className="pt-4">
                <form onSubmit={handleCreateList} className="flex gap-3">
                  <Input
                    placeholder={t('priceListNamePlaceholder')}
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    className="bg-background"
                    required
                  />
                  <Button type="submit" disabled={creating}>
                    {creating ? '...' : t('createPriceList')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {lists.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">{t('noPriceLists')}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('createFirstPriceList')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {lists.map((list) => (
                <Card
                  key={list.id}
                  className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => handleSelectList(list.id)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{list.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{list.itemCount} {t('items')}</span>
                          <span>-</span>
                          <span>{t('total')}: {formatPrice(list.total)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {list.isExpired ? (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t('expired')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          {list.expiresAt && (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {list.expiresAt ? getTimeRemaining(list.expiresAt) : list.status}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Detail view */}
      {selectedList && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedList(null)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-lg font-semibold">{selectedList.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {selectedList.items.length} {t('items')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CurrencySelector />
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                {t('exportPdf')}
              </Button>
            </div>
          </div>

          {selectedList.isExpired && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
              <span>{t('priceListExpired')}</span>
            </div>
          )}
          {!selectedList.isExpired && selectedList.expiresAt && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span>{t('priceListExpires')} {getTimeRemaining(selectedList.expiresAt)}</span>
            </div>
          )}

          {detailLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : selectedList.items.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No items in this list yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add converters from the catalogue detail page
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-3 px-2 font-medium text-muted-foreground">Converter</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground">Brand</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground text-center">{t('quantity')}</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground text-right">{t('unitPrice')}</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground text-right">{t('itemTotal')}</th>
                      <th className="py-3 px-2 font-medium text-muted-foreground w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedList.items.map((item) => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-3 px-2">
                          <span className="font-medium">{item.converterName}</span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {item.converterBrand}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">
                          {item.unitPrice != null ? formatPrice(item.unitPrice) : '--'}
                        </td>
                        <td className="py-3 px-2 text-right font-mono font-medium">
                          {item.totalPrice != null ? formatPrice(item.totalPrice) : '--'}
                        </td>
                        <td className="py-3 px-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Separator />

              <div className="flex justify-end">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground mr-3">{t('priceListTotal')}:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPrice(selectedList.total)}
                  </span>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
