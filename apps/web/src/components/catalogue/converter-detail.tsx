'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Lock, Coins, ImageOff, CheckCircle, ArrowRight, Plus, Check } from 'lucide-react';
import { CurrencySelector, useCurrency } from '@/components/ui/currency-selector';

interface Props {
  converterId: number;
}

function isMetalPresent(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.replace(',', '.');
  const num = parseFloat(normalized);
  return !isNaN(num) && num > 0;
}

interface RelatedConverter {
  id: number;
  name: string;
  brand: string;
  weight?: string;
}

export function ConverterDetail({ converterId }: Props) {
  const { token, isAuthenticated } = useAuth();
  const t = useTranslations('converter');
  const { format: formatPrice } = useCurrency();
  const [converter, setConverter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedConverters, setRelatedConverters] = useState<RelatedConverter[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Price list state
  const [priceLists, setPriceLists] = useState<{ id: number; name: string }[]>([]);
  const [showPriceListMenu, setShowPriceListMenu] = useState(false);
  const [addedToList, setAddedToList] = useState<number | null>(null);
  const [addingToList, setAddingToList] = useState(false);

  useEffect(() => {
    const fetchConverter = async () => {
      setLoading(true);
      setError(null);
      try {
        if (isAuthenticated && token) {
          const res = await api.getConverter(converterId, token);
          setConverter(res.data);
        } else {
          // Fetch basic info without auth (no pricing data)
          const res = await api.searchConverters({ query: String(converterId) });
          const found = res.data?.data?.find((c: any) => c.id === converterId);
          setConverter(found || null);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load converter');
      } finally {
        setLoading(false);
      }
    };
    fetchConverter();
  }, [converterId, token, isAuthenticated]);

  // Fetch user's price lists
  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const fetchLists = async () => {
      try {
        const res = await api.getPriceLists(token);
        setPriceLists((res.data || []).map((l: any) => ({ id: l.id, name: l.name })));
      } catch {
        // silent
      }
    };
    fetchLists();
  }, [token, isAuthenticated]);

  const handleAddToPriceList = async (priceListId: number) => {
    if (!token || addingToList) return;
    setAddingToList(true);
    try {
      await api.addPriceListItem(priceListId, converterId, 1, token);
      setAddedToList(priceListId);
      setShowPriceListMenu(false);
      setTimeout(() => setAddedToList(null), 3000);
    } catch (err) {
      console.error('Failed to add to price list:', err);
    } finally {
      setAddingToList(false);
    }
  };

  // Fetch related converters when we have a brand
  useEffect(() => {
    if (!converter?.brand) return;

    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        const res = await api.searchConverters({
          brand: converter.brand,
          limit: 5,
        });
        if (res.data?.data) {
          // Filter out the current converter and take up to 4
          const related = res.data.data
            .filter((c: any) => c.id !== converterId)
            .slice(0, 4);
          setRelatedConverters(related);
        }
      } catch (err) {
        console.error('Failed to fetch related converters:', err);
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();
  }, [converter?.brand, converterId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !converter) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">{error || t('notFound')}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/catalogue">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToCatalogue')}
          </Link>
        </Button>
      </div>
    );
  }

  const hasPt = isMetalPresent(converter.pt);
  const hasPd = isMetalPresent(converter.pd);
  const hasRh = isMetalPresent(converter.rh);
  const hasAnyMetal = hasPt || hasPd || hasRh;

  return (
    <div>
      <Link
        href="/catalogue"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t('backToCatalogue')}
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="aspect-[4/3] rounded-xl bg-card border border-border overflow-hidden relative">
          {isAuthenticated ? (
            <>
              <img
                src={`/api/v1/images/${converter.id}`}
                alt={converter.name}
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = (e.target as HTMLImageElement).nextElementSibling;
                  if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                }}
              />
              <div className="hidden h-full w-full flex items-center justify-center text-muted-foreground absolute inset-0">
                <div className="text-center">
                  <ImageOff className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm">{t('noImage')}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ImageOff className="h-12 w-12 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">{t('signInToView')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {converter.brand}
            </Badge>
            <h1 className="text-3xl font-bold">{converter.name}</h1>
            {converter.nameModified && converter.nameModified !== converter.name && (
              <p className="text-muted-foreground mt-1">{converter.nameModified}</p>
            )}
          </div>

          {converter.weight && converter.weight !== '0' && (
            <div>
              <span className="text-sm text-muted-foreground">{t('weight')}</span>
              <p className="text-lg font-medium">{converter.weight} kg</p>
            </div>
          )}

          {converter.keywords && (
            <div>
              <span className="text-sm text-muted-foreground">{t('keywords')}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {converter.keywords.split(',').map((kw: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {kw.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Pricing / Metal Content Section */}
          {isAuthenticated && converter.pt !== undefined ? (
            <div className="space-y-4">
              {/* Credit usage indicator */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{t('creditUsed')}</span>
              </div>

              {/* Metal Presence Indicators */}
              {hasAnyMetal && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{t('contains')}</span>
                  {hasPt && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: '#E5E4E2' }}
                        title="Platinum"
                      />
                      <span className="text-xs text-muted-foreground">Pt</span>
                    </div>
                  )}
                  {hasPd && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: '#CFB53B' }}
                        title="Palladium"
                      />
                      <span className="text-xs text-muted-foreground">Pd</span>
                    </div>
                  )}
                  {hasRh && (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: '#4A90D9' }}
                        title="Rhodium"
                      />
                      <span className="text-xs text-muted-foreground">Rh</span>
                    </div>
                  )}
                </div>
              )}

              {/* Full Metal Breakdown */}
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Coins className="h-5 w-5 text-primary" />
                      {t('metalContent')}
                    </CardTitle>
                    <CurrencySelector />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <div className="text-xs text-muted-foreground mb-1">{t('platinum')}</div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: hasPt ? '#E5E4E2' : '#555' }}
                        />
                      </div>
                      <div className="text-lg font-bold">{converter.pt || '0'}</div>
                      <div className="text-xs text-muted-foreground">{t('gPerKg')}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <div className="text-xs text-muted-foreground mb-1">{t('palladium')}</div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: hasPd ? '#CFB53B' : '#555' }}
                        />
                      </div>
                      <div className="text-lg font-bold">{converter.pd || '0'}</div>
                      <div className="text-xs text-muted-foreground">{t('gPerKg')}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-secondary/50">
                      <div className="text-xs text-muted-foreground mb-1">{t('rhodium')}</div>
                      <div className="flex items-center justify-center gap-1.5 mb-1">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: hasRh ? '#4A90D9' : '#555' }}
                        />
                      </div>
                      <div className="text-lg font-bold">{converter.rh || '0'}</div>
                      <div className="text-xs text-muted-foreground">{t('gPerKg')}</div>
                    </div>
                  </div>

                  {converter.calculatedPrice != null && (
                    <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <div className="text-sm text-muted-foreground">{t('estimatedValue')}</div>
                      <div className="text-3xl font-bold text-primary mt-1">
                        {formatPrice(Number(converter.calculatedPrice))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Add to Price List */}
              {priceLists.length > 0 && (
                <div className="relative">
                  {addedToList ? (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <Check className="h-4 w-4" />
                      <span>{t('addedToPriceList')}</span>
                    </div>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPriceListMenu(!showPriceListMenu)}
                        disabled={addingToList}
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t('addToPriceList')}
                      </Button>
                      {showPriceListMenu && (
                        <div className="absolute top-full left-0 mt-1 z-10 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[200px]">
                          {priceLists.map((list) => (
                            <button
                              key={list.id}
                              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-secondary transition-colors"
                              onClick={() => handleAddToPriceList(list.id)}
                            >
                              {list.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated: blurred/locked pricing section */
            <Card className="border-border relative overflow-hidden">
              <CardContent className="p-6">
                {/* Blurred background to hint at hidden data */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="grid grid-cols-3 gap-4 p-6 pt-12 opacity-[0.06]">
                    <div className="text-center p-3 rounded-lg bg-foreground">
                      <div className="h-3 w-12 mx-auto mb-2 bg-foreground rounded" />
                      <div className="h-6 w-8 mx-auto bg-foreground rounded" />
                    </div>
                    <div className="text-center p-3 rounded-lg bg-foreground">
                      <div className="h-3 w-12 mx-auto mb-2 bg-foreground rounded" />
                      <div className="h-6 w-8 mx-auto bg-foreground rounded" />
                    </div>
                    <div className="text-center p-3 rounded-lg bg-foreground">
                      <div className="h-3 w-12 mx-auto mb-2 bg-foreground rounded" />
                      <div className="h-6 w-8 mx-auto bg-foreground rounded" />
                    </div>
                  </div>
                </div>

                <div className="relative z-10 text-center py-4">
                  <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold text-lg mb-1">{t('pricingLocked')}</h3>
                  <p className="text-sm text-muted-foreground mb-2 max-w-sm mx-auto">
                    {t('pricingLockedDesc')}
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    {t('creditCost')}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/login">{t('signIn')}</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/register">{t('createAccount')}</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Related Converters Section */}
      <Separator className="my-10" />

      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t('relatedConverters')}
          {converter.brand && (
            <span className="text-muted-foreground font-normal text-base ml-2">
              {t('from')} {converter.brand}
            </span>
          )}
        </h2>

        {relatedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : relatedConverters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('noRelated')}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedConverters.map((related) => (
              <Link key={related.id} href={`/converter/${related.id}`}>
                <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer h-full">
                  <CardContent className="p-4">
                    <h3 className="font-medium text-sm truncate hover:text-primary transition-colors">
                      {related.name}
                    </h3>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {related.brand}
                    </Badge>
                    {related.weight && related.weight !== '0' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {related.weight} kg
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground text-xs mt-3">
                      <span>{t('viewDetails')}</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
