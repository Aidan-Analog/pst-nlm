import { useMemo } from 'react';
import type { Product, FilterCondition, SortConfig } from '../types/product';

export function applyFilter(product: Product, filter: FilterCondition): boolean {
  const raw = product[filter.column];
  const val = raw as string | number | boolean | null;

  switch (filter.operator) {
    case 'eq':
      return val === filter.value;
    case 'neq':
      return val !== filter.value;
    case 'lt':
      return val != null && Number(val) < Number(filter.value);
    case 'lte':
      return val != null && Number(val) <= Number(filter.value);
    case 'gt':
      return val != null && Number(val) > Number(filter.value);
    case 'gte':
      return val != null && Number(val) >= Number(filter.value);
    case 'contains':
      return val != null && String(val).toLowerCase().includes(String(filter.value).toLowerCase());
    case 'startsWith':
      return val != null && String(val).toLowerCase().startsWith(String(filter.value).toLowerCase());
    default:
      return true;
  }
}

function applyQuickFilter(product: Product, filterId: string): boolean {
  switch (filterId) {
    case 'inStock':
      return product.inStock;
    case 'rohs':
      return product.rohsCompliant;
    case 'surfaceMount':
      return product.surfaceMount;
    case 'under2':
      return product.price1ku != null && product.price1ku < 2;
    case 'vout3v3':
      return (
        product.voutMin != null && product.voutMin <= 3.3 &&
        product.voutMax != null && product.voutMax >= 3.3
      );
    case '100nf':
      // Placeholder — would need a dedicated column
      return true;
    case 'temp40_125':
      return product.tempMin != null && product.tempMin <= -40 &&
             product.tempMax != null && product.tempMax >= 125;
    case 'usbPd':
      // Placeholder — would need a dedicated column
      return true;
    default:
      return true;
  }
}

export function useFilteredProducts(
  products: Product[],
  quickFilters: string[],
  companionFilters: FilterCondition[],
  sort: SortConfig | null,
): Product[] {
  return useMemo(() => {
    let result = [...products];

    // Quick filters
    for (const qf of quickFilters) {
      result = result.filter(p => applyQuickFilter(p, qf));
    }

    // Companion filters
    for (const cf of companionFilters) {
      result = result.filter(p => applyFilter(p, cf));
    }

    // Sort
    if (sort) {
      result.sort((a, b) => {
        const av = a[sort.column];
        const bv = b[sort.column];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        let cmp = 0;
        if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
        return sort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [products, quickFilters, companionFilters, sort]);
}
