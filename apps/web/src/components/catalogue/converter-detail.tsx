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
import { ArrowLeft, Lock, Coins, CheckCircle, Plus, Check, Loader2, Unlock, Clock } from 'lucide-react';
import { CurrencySelector, useCurrency } from '@/components/ui/currency-selector';

interface Props {
  converterId: number;
}

function isMetalPresent(value: boolean | string | null | undefined): boolean {
  if (typeof value === 'boolean') return value;
  if (!value) return false;
  const normalized = String(value).replace(',', '.');
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

  // Preview data (free, always loaded first)
  const [preview, setPreview] = useState<any>(null);
  // Full pricing data (loaded only after user confirms)
  const [pricingData, setPricingData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedConverters, setRelatedConverters] = useState<RelatedConverter[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Price list state
  const [priceLists, setPriceLists] = useState<{ id: number; name: string }[]>([]);
  const [addedToList, setAddedToList] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  // Always load preview first (free, no credit cost)
  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      setPricingData(null);
      try {
        const res = await api.getConverterPreview(converterId);
        setPreview(res.data || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load converter');
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [converterId]);

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

  // Whether this is a free re-view from 7-day history
  const [fromHistory, setFromHistory] = useState(false);

  // Unlock pricing (spends 1 credit, or free if viewed within 7 days)
  const handleUnlockPricing = async () => {
    if (!token || unlocking) return;
    setUnlocking(true);
    try {
      const res = await api.getConverter(converterId, token);
      setPricingData(res.data);
      if (res.fromHistory) {
        setFromHistory(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to unlock pricing');
    } finally {
      setUnlocking(false);
    }
  };

  const handleAddToPriceList = async () => {
    if (!token || addingToList) return;
    setAddingToList(true);
    try {
      let listId: number;
      if (priceLists.length > 0) {
        listId = priceLists[0].id;
      } else {
        const res = await api.createPriceList('My Price List', token);
        listId = res.data.id;
        setPriceLists([{ id: listId, name: res.data.name }]);
      }
      await api.addPriceListItem(listId, converterId, 1, token);
      setAddedToList(true);
    } catch (err) {
      console.error('Failed to add to price list:', err);
    } finally {
      setAddingToList(false);
    }
  };

  // Fetch related converters when we have a brand
  useEffect(() => {
    if (!preview?.brand) return;

    const fetchRelated = async () => {
      setRelatedLoading(true);
      try {
        const res = await api.searchConverters({
          brand: preview.brand,
          limit: 5,
        });
        if (res.data?.data) {
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
  }, [preview?.brand, converterId]);

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

  if (error || !preview) {
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

  // Use the converter data source: pricing data if unlocked, preview otherwise
  const converter = preview;

  // Metal presence from preview (free) or pricing data
  const hasPt = isMetalPresent(pricingData?.hasPt ?? preview.hasPt);
  const hasPd = isMetalPresent(pricingData?.hasPd ?? preview.hasPd);
  const hasRh = isMetalPresent(pricingData?.hasRh ?? preview.hasRh);
  const hasAnyMetal = hasPt || hasPd || hasRh;

  const pricingUnlocked = pricingData != null;

  return (
    <div>
      <Link
        href="/catalogue"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        {t('backToCatalogue')}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {/* Image Section */}
        <div className="aspect-square sm:aspect-[4/3] rounded-xl bg-card border border-border overflow-hidden relative">
          <img
            src={`https://apg.fra1.cdn.digitaloceanspaces.com/images/${encodeURIComponent(converter.name.trim().split(' / ')[0].trim())}.png`}
            alt={converter.name}
            className="h-full w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = '/converter-placeholder.svg'; }}
          />
          {converter.brandImage && (
            <div className="absolute bottom-3 right-3 h-10 w-10 rounded-lg bg-background/80 backdrop-blur-sm p-1 border border-border/50">
              <img
                src={`https://apg.fra1.cdn.digitaloceanspaces.com/logo/${converter.brandImage}`}
                alt={converter.brand}
                className="h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-4 sm:space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">
              {converter.brand}
            </Badge>
            <h1 className="text-xl sm:text-3xl font-bold break-words">{converter.name}</h1>
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

          {/* Metal Presence Indicators (free, from preview) */}
          {hasAnyMetal && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t('contains')}</span>
              {hasPt && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#E5E4E2' }} title="Platinum" />
                  <span className="text-xs text-muted-foreground">Pt</span>
                </div>
              )}
              {hasPd && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#CFB53B' }} title="Palladium" />
                  <span className="text-xs text-muted-foreground">Pd</span>
                </div>
              )}
              {hasRh && (
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: '#4A90D9' }} title="Rhodium" />
                  <span className="text-xs text-muted-foreground">Rh</span>
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Pricing Section */}
          {isAuthenticated && pricingUnlocked ? (
            /* Pricing unlocked - show full data */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {fromHistory ? (
                  <>
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span>{t('freeReview')}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{t('creditUsed')}</span>
                  </>
                )}
              </div>

              {pricingData.calculatedPrice != null && (
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Coins className="h-5 w-5 text-primary" />
                        {t('estimatedValue')}
                      </CardTitle>
                      <CurrencySelector />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                      <div className="text-3xl font-bold text-primary">
                        {formatPrice(Number(pricingData.calculatedPrice))}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {t('basedOnCurrentPrices')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Add to Price List */}
              <div>
                {addedToList ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <Check className="h-4 w-4" />
                      <span>{t('addedToPriceList')}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAddedToList(false); handleAddToPriceList(); }}
                      disabled={addingToList}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t('addMore')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddToPriceList}
                    disabled={addingToList}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {addingToList ? '...' : t('addToPriceList')}
                  </Button>
                )}
              </div>
            </div>
          ) : isAuthenticated ? (
            /* Authenticated but pricing not yet unlocked - show unlock button */
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6 text-center">
                <Coins className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-semibold text-lg mb-1">{t('unlockPricing')}</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  {t('unlockPricingDesc')}
                </p>
                <Button
                  onClick={handleUnlockPricing}
                  disabled={unlocking}
                  className="px-6"
                >
                  {unlocking ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('unlocking')}</>
                  ) : (
                    <><Unlock className="h-4 w-4 mr-2" />{t('unlockForOneCredit')}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* Unauthenticated: locked pricing section */
            <Card className="border-border relative overflow-hidden">
              <CardContent className="p-6">
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
      <Separator className="my-6 sm:my-10" />

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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : relatedConverters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('noRelated')}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {relatedConverters.map((related) => (
              <Link key={related.id} href={`/converter/${related.id}`}>
                <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer h-full group overflow-hidden">
                  <div className="aspect-square sm:aspect-[4/3] bg-secondary/30 overflow-hidden relative">
                    <img
                      src={`https://apg.fra1.cdn.digitaloceanspaces.com/images/${encodeURIComponent(related.name.trim().split(' / ')[0].trim())}.png`}
                      alt={related.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/converter-placeholder.svg'; }}
                    />
                  </div>
                  <CardContent className="p-2 sm:p-3">
                    <h3 className="font-medium text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                      {related.name}
                    </h3>
                    <div className="flex items-center justify-between mt-1 sm:mt-2">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">{related.brand}</span>
                      {related.weight && related.weight !== '0' && (
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                          {related.weight} kg
                        </span>
                      )}
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
