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
import { ArrowLeft, Lock, Coins, CheckCircle, ArrowRight, Plus, Check, Camera, Upload } from 'lucide-react';
import { CurrencySelector, useCurrency } from '@/components/ui/currency-selector';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

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
  const [converter, setConverter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedConverters, setRelatedConverters] = useState<RelatedConverter[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Price list state
  const [priceLists, setPriceLists] = useState<{ id: number; name: string }[]>([]);
  const [addedToList, setAddedToList] = useState(false);
  const [addingToList, setAddingToList] = useState(false);

  // Image suggestion state
  const [imageError, setImageError] = useState(false);
  const [suggestingImage, setSuggestingImage] = useState(false);
  const [imageSuggested, setImageSuggested] = useState(false);

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

  const handleSuggestImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !token) return;
      setSuggestingImage(true);
      try {
        await api.suggestImage(converterId, file, token);
        setImageSuggested(true);
      } catch (err) {
        console.error('Failed to suggest image:', err);
      } finally {
        setSuggestingImage(false);
      }
    };
    input.click();
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

  // API returns hasPt/hasPd/hasRh booleans — never raw content values
  const hasPt = isMetalPresent(converter.hasPt);
  const hasPd = isMetalPresent(converter.hasPd);
  const hasRh = isMetalPresent(converter.hasRh);
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
          <img
            src={`https://apg.fra1.cdn.digitaloceanspaces.com/images/${encodeURIComponent(converter.name.trim().split(' / ')[0].trim())}.png`}
            alt={converter.name}
            className="h-full w-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = '/converter-placeholder.svg'; }}
          />
          {/* Brand logo overlay */}
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
          {isAuthenticated && converter.hasPt !== undefined ? (
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

              {/* Estimated Value Card */}
              {converter.calculatedPrice != null && (
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
                        {formatPrice(Number(converter.calculatedPrice))}
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
                <Card className="bg-card/50 border-border/50 hover:border-primary/30 transition-all cursor-pointer h-full group overflow-hidden">
                  {/* Thumbnail image */}
                  <div className="aspect-[4/3] bg-secondary/30 overflow-hidden relative">
                    <img
                      src={`https://apg.fra1.cdn.digitaloceanspaces.com/images/${encodeURIComponent(related.name.trim().split(' / ')[0].trim())}.png`}
                      alt={related.name}
                      className="h-full w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/converter-placeholder.svg'; }}
                    />
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {related.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {related.brand}
                      </Badge>
                      {related.weight && related.weight !== '0' && (
                        <span className="text-xs text-muted-foreground">
                          {related.weight} kg
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-primary text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
