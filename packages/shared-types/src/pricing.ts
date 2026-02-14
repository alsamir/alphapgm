export interface MetalPrice {
  id: number;
  name: string;
  price: number;
  date?: Date;
  currencyId?: number;
  currency?: string;
}

export interface MetalPrices {
  platinum: MetalPrice;
  palladium: MetalPrice;
  rhodium: MetalPrice;
  updatedAt: Date;
}

export interface PricePercentage {
  id: number;
  pt: number;
  pd: number;
  rh: number;
}

export interface PriceCalculation {
  ptContent: number;
  pdContent: number;
  rhContent: number;
  ptPrice: number;
  pdPrice: number;
  rhPrice: number;
  ptValue: number;
  pdValue: number;
  rhValue: number;
  recoveryPt: number;
  recoveryPd: number;
  recoveryRh: number;
  grossValue: number;
  discount: number;
  finalPrice: number;
  currency: string;
}
