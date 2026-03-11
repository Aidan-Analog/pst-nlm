export interface Product {
  partNumber: string;
  description: string;
  lifecycle: string;
  price1ku: number | null;
  priceSku: string;
  availability: number | null;
  package: string;
  vinMin: number | null;
  vinMax: number | null;
  voutMin: number | null;
  voutMax: number | null;
  ioutMax: number | null;
  tempMin: number | null;
  tempMax: number | null;
  inStock: boolean;
  rohsCompliant: boolean;
  surfaceMount: boolean;
  [key: string]: unknown;
}

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'contains' | 'startsWith';
  value: string | number | boolean;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface CompanionMessage {
  role: 'user' | 'assistant';
  content: string;
  filters?: FilterCondition[];
  sort?: SortConfig;
}

export interface FilterState {
  quickFilters: string[];
  companionFilters: FilterCondition[];
  companionSort: SortConfig | null;
  columnSort: SortConfig | null;
  visibleColumns: string[];
}

export const ALL_COLUMNS: { key: string; label: string }[] = [
  { key: 'partNumber', label: 'Part' },
  { key: 'description', label: 'Description' },
  { key: 'lifecycle', label: 'Product Lifecycle' },
  { key: 'price1ku', label: '1ku List Price' },
  { key: 'availability', label: 'Availability' },
  { key: 'package', label: 'Package' },
  { key: 'vinMin', label: 'Vin Min' },
  { key: 'vinMax', label: 'Vin Max' },
  { key: 'voutMin', label: 'Vout Min' },
  { key: 'voutMax', label: 'Vout Max' },
  { key: 'ioutMax', label: 'Iout Max' },
  { key: 'tempMin', label: 'Temp Min' },
  { key: 'tempMax', label: 'Temp Max' },
  { key: 'rohsCompliant', label: 'RoHS' },
  { key: 'surfaceMount', label: 'Mount Type' },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  'partNumber', 'description', 'lifecycle', 'price1ku',
  'availability', 'package', 'vinMin', 'vinMax', 'voutMin', 'voutMax',
];

export const QUICK_FILTERS: { id: string; label: string }[] = [
  { id: 'inStock', label: 'In stock only' },
  { id: 'rohs', label: 'RoHS compliant' },
  { id: 'surfaceMount', label: 'Surface mount only' },
  { id: 'under2', label: 'Under $2 at 1000 qty' },
  { id: 'vout3v3', label: 'Output voltage 3.3V' },
  { id: '100nf', label: '100nF decoupling' },
  { id: 'temp40_125', label: 'Operating temp -40°C to +125°C' },
  { id: 'usbPd', label: 'USB-PD compatible' },
];
