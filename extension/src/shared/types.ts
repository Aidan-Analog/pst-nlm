export type Region = 'us' | 'uk' | 'europe';

export interface ProductInfo {
  name: string;
  price: number | null;
  currency: string;
  currencySymbol: string;
  url: string;
  imageUrl?: string;
  brand?: string;
  ean?: string;
  region: Region;
  source: 'json-ld' | 'og' | 'dom' | 'heuristic';
}

export interface PriceResult {
  retailer: string;
  retailerDomain: string;
  price: number | null;
  currency: string;
  currencySymbol: string;
  url: string;
  inStock: boolean | null;
  confidence: 'high' | 'medium' | 'low';
}

export interface CompareResponse {
  results: PriceResult[];
  normalizedQuery: string;
  region: Region;
  error?: string;
}

export type ExtensionMessage =
  | { type: 'PRODUCT_DETECTED'; payload: ProductInfo }
  | { type: 'GET_PRODUCT' }
  | { type: 'PRODUCT_RESPONSE'; payload: ProductInfo | null };
