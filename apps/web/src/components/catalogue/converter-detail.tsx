'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { ArrowLeft, Lock, CreditCard, Coins } from 'lucide-react';

interface Props {
  converterId: number;
}

export function ConverterDetail({ converterId }: Props) {
  const { token, isAuthenticated } = useAuth();
  const [converter, setConverter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConverter = async () => {
      setLoading(true);
      try {
        if (isAuthenticated && token) {
          const res = await api.getConverter(converterId, token);
          setConverter(res.data);
        } else {
          // Fetch basic info without auth (no pricing data)
          const res = await api.searchConverters({ search: String(converterId) });
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
          </div>
        </div>
      </div>
    );
  }

  if (error || !converter) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg">{error || 'Converter not found'}</p>
        <Link href="/catalogue">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catalogue
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/catalogue" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Catalogue
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Section */}
        <div className="aspect-[4/3] rounded-xl bg-card border border-border overflow-hidden">
          {converter.imageUrl ? (
            <img src={`/api/v1/images/${converter.id}`} alt={converter.name} className="h-full w-full object-contain" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
              No image available
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="space-y-6">
          <div>
            <Badge variant="secondary" className="mb-2">{converter.brand}</Badge>
            <h1 className="text-3xl font-bold">{converter.name}</h1>
            {converter.nameModified && converter.nameModified !== converter.name && (
              <p className="text-muted-foreground mt-1">{converter.nameModified}</p>
            )}
          </div>

          {converter.weight && (
            <div>
              <span className="text-sm text-muted-foreground">Weight</span>
              <p className="text-lg font-medium">{converter.weight} kg</p>
            </div>
          )}

          {converter.keywords && (
            <div>
              <span className="text-sm text-muted-foreground">Keywords</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {converter.keywords.split(',').map((kw: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{kw.trim()}</Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Pricing Section */}
          {isAuthenticated && converter.pt !== undefined ? (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Metal Content & Pricing
                </CardTitle>
                <p className="text-xs text-muted-foreground">1 credit used for this lookup</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <div className="text-xs text-muted-foreground mb-1">Platinum (Pt)</div>
                    <div className="text-lg font-bold text-platinum">{converter.pt || '0'}</div>
                    <div className="text-xs text-muted-foreground">g/kg</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <div className="text-xs text-muted-foreground mb-1">Palladium (Pd)</div>
                    <div className="text-lg font-bold text-palladium">{converter.pd || '0'}</div>
                    <div className="text-xs text-muted-foreground">g/kg</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-secondary/50">
                    <div className="text-xs text-muted-foreground mb-1">Rhodium (Rh)</div>
                    <div className="text-lg font-bold text-rhodium">{converter.rh || '0'}</div>
                    <div className="text-xs text-muted-foreground">g/kg</div>
                  </div>
                </div>
                {converter.calculatedPrice && (
                  <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                    <div className="text-sm text-muted-foreground">Estimated Value</div>
                    <div className="text-3xl font-bold text-primary mt-1">
                      ${converter.calculatedPrice.toFixed(2)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border">
              <CardContent className="p-6 text-center">
                <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Pricing Data Locked</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sign in to view metal content and pricing information
                </p>
                <div className="flex gap-2 justify-center">
                  <Link href="/login">
                    <Button variant="outline" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm">Create Account</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
