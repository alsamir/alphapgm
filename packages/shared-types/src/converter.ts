export interface Converter {
  id: number;
  name: string;
  nameModified: string;
  urlPath: string;
  brand: string;
  weight: string;
  pt: string;
  pd: string;
  rh: string;
  keywords: string;
  imageUrl: string;
  prices: string;
  brandImage?: string;
  createdDate?: Date;
}

export interface ConverterWithPrice extends Converter {
  calculatedPrice: number;
  ptValue: number;
  pdValue: number;
  rhValue: number;
  currency: string;
}

export interface ConverterSearchParams {
  query?: string;
  brand?: string;
  page?: number;
  limit?: number;
  sortBy?: 'name' | 'brand' | 'price';
  sortOrder?: 'asc' | 'desc';
}

export interface ConverterSearchResult {
  data: Converter[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface Brand {
  name: string;
  count: number;
  image?: string;
}
