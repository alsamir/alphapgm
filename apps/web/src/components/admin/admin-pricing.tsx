'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Percent,
  Calculator,
  Save,
  Pencil,
  X,
  Check,
  RefreshCw,
  FlaskConical,
  Info,
} from 'lucide-react';

interface MetalPrice {
  id: number;
  symbol: string;
  name: string;
  price: number;
  updatedAt?: string;
}

interface RecoveryPercentages {
  pt: number;
  pd: number;
  rh: number;
}

interface SimConverter {
  name: string;
  ptContentGrams: number;
  pdContentGrams: number;
  rhContentGrams: number;
}

const METAL_COLORS: Record<string, string> = {
  Pt: '#d4d4e8',
  Pd: '#ffd866',
  Rh: '#5b9cf5',
};

const METAL_LABELS: Record<string, string> = {
  Pt: 'Platinum',
  Pd: 'Palladium',
  Rh: 'Rhodium',
};

// Sample converters for simulation
const SAMPLE_CONVERTERS: SimConverter[] = [
  { name: 'Standard Flow (Small)', ptContentGrams: 0.8, pdContentGrams: 0.3, rhContentGrams: 0.05 },
  { name: 'Standard Flow (Medium)', ptContentGrams: 1.5, pdContentGrams: 0.6, rhContentGrams: 0.1 },
  { name: 'Standard Flow (Large)', ptContentGrams: 2.5, pdContentGrams: 1.2, rhContentGrams: 0.2 },
  { name: 'Diesel Oxidation (DOC)', ptContentGrams: 3.0, pdContentGrams: 0.5, rhContentGrams: 0.0 },
  { name: 'High-Performance (Sport)', ptContentGrams: 4.0, pdContentGrams: 2.0, rhContentGrams: 0.4 },
];

export function AdminPricing() {
  const { token } = useAuth();
  const [metals, setMetals] = useState<MetalPrice[]>([]);
  const [recovery, setRecovery] = useState<RecoveryPercentages>({ pt: 85, pd: 80, rh: 75 });
  const [editRecovery, setEditRecovery] = useState<RecoveryPercentages>({ pt: 85, pd: 80, rh: 75 });
  const [editingMetalId, setEditingMetalId] = useState<number | null>(null);
  const [editMetalPrice, setEditMetalPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingMetal, setSavingMetal] = useState(false);
  const [recoveryDirty, setRecoveryDirty] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Simulation state
  const [simPrices, setSimPrices] = useState<Record<string, number>>({ Pt: 0, Pd: 0, Rh: 0 });
  const [simConverterIdx, setSimConverterIdx] = useState(0);
  const [discount, setDiscount] = useState(10);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [metalsRes, recoveryRes] = await Promise.all([
        api.getMetalPrices(),
        api.getRecoveryPercentages(token),
      ]);
      const metalsList = (metalsRes.data as any) || [];
      setMetals(Array.isArray(metalsList) ? metalsList : []);

      const rec = recoveryRes.data || { pt: 85, pd: 80, rh: 75 };
      setRecovery(rec);
      setEditRecovery(rec);

      // Initialize simulation prices from actual prices
      const priceMap: Record<string, number> = { Pt: 0, Pd: 0, Rh: 0 };
      (Array.isArray(metalsList) ? metalsList : []).forEach((m: MetalPrice) => {
        if (m.symbol in priceMap) {
          priceMap[m.symbol] = m.price;
        }
      });
      setSimPrices(priceMap);
    } catch (err) {
      console.error('Failed to fetch pricing data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveRecovery = async () => {
    if (!token) return;
    setSaving(true);
    try {
      await api.updateRecoveryPercentages(editRecovery, token);
      setRecovery(editRecovery);
      setRecoveryDirty(false);
      showSuccess('Recovery percentages saved successfully');
    } catch (err) {
      console.error('Failed to save recovery percentages:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleStartEditMetal = (metal: MetalPrice) => {
    setEditingMetalId(metal.id);
    setEditMetalPrice(metal.price.toString());
  };

  const handleCancelEditMetal = () => {
    setEditingMetalId(null);
    setEditMetalPrice('');
  };

  const handleSaveMetalPrice = async (metalId: number) => {
    if (!token) return;
    const price = parseFloat(editMetalPrice);
    if (isNaN(price) || price <= 0) return;
    setSavingMetal(true);
    try {
      await api.updateMetalPrice(metalId, price, token);
      setMetals((prev) =>
        prev.map((m) => (m.id === metalId ? { ...m, price } : m))
      );
      setEditingMetalId(null);
      setEditMetalPrice('');
      showSuccess('Metal price updated successfully');
    } catch (err) {
      console.error('Failed to update metal price:', err);
    } finally {
      setSavingMetal(false);
    }
  };

  const handleRecoveryChange = (key: keyof RecoveryPercentages, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    const clamped = Math.min(100, Math.max(0, num));
    const updated = { ...editRecovery, [key]: clamped };
    setEditRecovery(updated);
    setRecoveryDirty(
      updated.pt !== recovery.pt ||
      updated.pd !== recovery.pd ||
      updated.rh !== recovery.rh
    );
  };

  // Simulation calculation
  const selectedConverter = SAMPLE_CONVERTERS[simConverterIdx];

  const simulatedValue = useMemo(() => {
    if (!selectedConverter) return 0;
    const ptValue = selectedConverter.ptContentGrams * simPrices.Pt * (editRecovery.pt / 100);
    const pdValue = selectedConverter.pdContentGrams * simPrices.Pd * (editRecovery.pd / 100);
    const rhValue = selectedConverter.rhContentGrams * simPrices.Rh * (editRecovery.rh / 100);
    const gross = ptValue + pdValue + rhValue;
    return gross * (1 - discount / 100);
  }, [selectedConverter, simPrices, editRecovery, discount]);

  const simulatedBreakdown = useMemo(() => {
    if (!selectedConverter) return { pt: 0, pd: 0, rh: 0, gross: 0 };
    const pt = selectedConverter.ptContentGrams * simPrices.Pt * (editRecovery.pt / 100);
    const pd = selectedConverter.pdContentGrams * simPrices.Pd * (editRecovery.pd / 100);
    const rh = selectedConverter.rhContentGrams * simPrices.Rh * (editRecovery.rh / 100);
    return { pt, pd, rh, gross: pt + pd + rh };
  }, [selectedConverter, simPrices, editRecovery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading pricing data...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success notification */}
      {successMsg && (
        <div className="bg-[#00e88f]/10 border border-[#00e88f]/30 text-[#00e88f] rounded-lg px-4 py-3 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Price Formula Display */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#00e88f]" />
            <CardTitle className="text-sm">Pricing Formula</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-background/50 rounded-lg p-4 font-mono text-sm border border-border/50">
            <span className="text-[#00e88f]">value</span>
            <span className="text-muted-foreground"> = (</span>
            <span className="text-[#d4d4e8]">metal_content</span>
            <span className="text-muted-foreground"> x </span>
            <span className="text-[#ffd866]">spot_price</span>
            <span className="text-muted-foreground"> x </span>
            <span className="text-[#5b9cf5]">recovery_%</span>
            <span className="text-muted-foreground">) - </span>
            <span className="text-red-400">discount</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Each metal (Pt, Pd, Rh) is calculated individually and summed. The discount is applied as a percentage of the gross value.
          </p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Current Metal Prices Panel */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#00e88f]" />
              <div>
                <CardTitle className="text-base">Current Metal Prices</CardTitle>
                <CardDescription>Spot prices per troy ounce (USD)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No metal prices available</p>
              ) : (
                metals.map((metal) => (
                  <div
                    key={metal.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: `${METAL_COLORS[metal.symbol] || '#888'}20`,
                          color: METAL_COLORS[metal.symbol] || '#888',
                        }}
                      >
                        {metal.symbol}
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {METAL_LABELS[metal.symbol] || metal.name || metal.symbol}
                        </div>
                        {metal.updatedAt && (
                          <div className="text-[10px] text-muted-foreground">
                            Updated {new Date(metal.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingMetalId === metal.id ? (
                        <>
                          <div className="relative w-28">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              value={editMetalPrice}
                              onChange={(e) => setEditMetalPrice(e.target.value)}
                              className="h-8 pl-5 text-sm bg-background"
                              step="0.01"
                              min="0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveMetalPrice(metal.id);
                                if (e.key === 'Escape') handleCancelEditMetal();
                              }}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#00e88f] hover:text-[#00e88f]"
                            onClick={() => handleSaveMetalPrice(metal.id)}
                            disabled={savingMetal}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={handleCancelEditMetal}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            className="text-lg font-bold tabular-nums"
                            style={{ color: METAL_COLORS[metal.symbol] || '#fff' }}
                          >
                            ${metal.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStartEditMetal(metal)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recovery Percentages Panel */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-[#00e88f]" />
                <div>
                  <CardTitle className="text-base">Recovery Percentages</CardTitle>
                  <CardDescription>Refinery recovery rates per metal</CardDescription>
                </div>
              </div>
              {recoveryDirty && (
                <Badge variant="outline" className="text-[#ffd866] border-[#ffd866]/30 text-[10px]">
                  Unsaved
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {(
                [
                  { key: 'pt' as const, label: 'Platinum (Pt)', color: '#d4d4e8' },
                  { key: 'pd' as const, label: 'Palladium (Pd)', color: '#ffd866' },
                  { key: 'rh' as const, label: 'Rhodium (Rh)', color: '#5b9cf5' },
                ] as const
              ).map(({ key, label, color }) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium" style={{ color }}>
                      {label}
                    </span>
                    <span className="text-muted-foreground tabular-nums">
                      {editRecovery[key].toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editRecovery[key]}
                      onChange={(e) => handleRecoveryChange(key, e.target.value)}
                      className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${color} 0%, ${color} ${editRecovery[key]}%, rgba(255,255,255,0.1) ${editRecovery[key]}%, rgba(255,255,255,0.1) 100%)`,
                      }}
                    />
                    <div className="w-16">
                      <Input
                        type="number"
                        value={editRecovery[key]}
                        onChange={(e) => handleRecoveryChange(key, e.target.value)}
                        className="h-7 text-xs text-center bg-background"
                        min="0"
                        max="100"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSaveRecovery}
                disabled={!recoveryDirty || saving}
                className="gap-1.5"
                size="sm"
              >
                {saving ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save Percentages
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Simulation Tool */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-[#00e88f]" />
            <div>
              <CardTitle className="text-base">Price Simulation</CardTitle>
              <CardDescription>
                &quot;What if&quot; calculator -- adjust metal prices and see how it affects converter values
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Converter Selector */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Select Converter</label>
              <div className="space-y-1.5">
                {SAMPLE_CONVERTERS.map((conv, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSimConverterIdx(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      simConverterIdx === idx
                        ? 'bg-[#00e88f]/10 border border-[#00e88f]/30 text-[#00e88f]'
                        : 'bg-background/50 border border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    <div className="font-medium">{conv.name}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">
                      Pt: {conv.ptContentGrams}g | Pd: {conv.pdContentGrams}g | Rh: {conv.rhContentGrams}g
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Price Inputs */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Custom Metal Prices ($/oz)</label>
              {(
                [
                  { key: 'Pt', label: 'Platinum', color: '#d4d4e8' },
                  { key: 'Pd', label: 'Palladium', color: '#ffd866' },
                  { key: 'Rh', label: 'Rhodium', color: '#5b9cf5' },
                ] as const
              ).map(({ key, label, color }) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs" style={{ color }}>
                    {label}
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      type="number"
                      value={simPrices[key] || ''}
                      onChange={(e) =>
                        setSimPrices((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                      }
                      className="pl-6 h-9 bg-background text-sm"
                      step="10"
                      min="0"
                    />
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs text-red-400">Discount %</label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="h-9 bg-background text-sm"
                  step="1"
                  min="0"
                  max="100"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => {
                  const priceMap: Record<string, number> = { Pt: 0, Pd: 0, Rh: 0 };
                  metals.forEach((m) => {
                    if (m.symbol in priceMap) priceMap[m.symbol] = m.price;
                  });
                  setSimPrices(priceMap);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset to Current Prices
              </Button>
            </div>

            {/* Simulation Results */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">Calculated Value</label>
              <div className="bg-background/50 rounded-lg p-4 border border-border/50 space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#00e88f] tabular-nums">
                    ${simulatedValue.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Net value after {discount}% discount
                  </div>
                </div>
                <div className="border-t border-border/50 pt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#d4d4e8' }}>Pt contribution</span>
                    <span className="tabular-nums">${simulatedBreakdown.pt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#ffd866' }}>Pd contribution</span>
                    <span className="tabular-nums">${simulatedBreakdown.pd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: '#5b9cf5' }}>Rh contribution</span>
                    <span className="tabular-nums">${simulatedBreakdown.rh.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-2 flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Gross total</span>
                    <span className="tabular-nums">${simulatedBreakdown.gross.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-red-400">Discount ({discount}%)</span>
                    <span className="tabular-nums text-red-400">
                      -${(simulatedBreakdown.gross * (discount / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {/* Formula breakdown */}
              <div className="bg-background/30 rounded-lg p-3 border border-border/30">
                <div className="text-[10px] text-muted-foreground font-mono space-y-1">
                  <div>
                    <span style={{ color: '#d4d4e8' }}>Pt</span>: {selectedConverter.ptContentGrams}g x ${simPrices.Pt.toLocaleString()} x {editRecovery.pt}%
                  </div>
                  <div>
                    <span style={{ color: '#ffd866' }}>Pd</span>: {selectedConverter.pdContentGrams}g x ${simPrices.Pd.toLocaleString()} x {editRecovery.pd}%
                  </div>
                  <div>
                    <span style={{ color: '#5b9cf5' }}>Rh</span>: {selectedConverter.rhContentGrams}g x ${simPrices.Rh.toLocaleString()} x {editRecovery.rh}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
