import type { ProductInfo, Region } from './types.js';

// Site-specific CSS selectors for major retailers
const SITE_SELECTORS: Record<string, { name: string[]; price: string[] }> = {
  'amazon.co.uk': {
    name: ['#productTitle', 'h1.a-size-large'],
    price: ['.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice',
            '#corePriceDisplay_desktop_feature_div .a-offscreen'],
  },
  'amazon.com': {
    name: ['#productTitle', 'h1.a-size-large'],
    price: ['.a-price .a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice',
            '#corePriceDisplay_desktop_feature_div .a-offscreen'],
  },
  'amazon.de': {
    name: ['#productTitle'],
    price: ['.a-price .a-offscreen', '#priceblock_ourprice'],
  },
  'amazon.fr': {
    name: ['#productTitle'],
    price: ['.a-price .a-offscreen', '#priceblock_ourprice'],
  },
  'currys.co.uk': {
    name: ['h1.product-title', 'h1[class*="title"]'],
    price: ['[data-testid="product-price"]', '.price-lock', '.price__now'],
  },
  'argos.co.uk': {
    name: ['h1[data-test="product-title"]', 'h1.product-title'],
    price: ['[data-test="product-price"]', '.price__cost'],
  },
  'johnlewis.com': {
    name: ['h1[data-test="product-title"]', 'h1.product-title'],
    price: ['[data-test="price-current"]', '.price--large'],
  },
  'bestbuy.com': {
    name: ['.sku-title h1', 'h1.heading-5'],
    price: ['.priceView-customer-price span[aria-hidden="true"]', '.pricing-price__regular-price'],
  },
  'walmart.com': {
    name: ['[itemprop="name"]', 'h1.prod-ProductTitle'],
    price: ['[itemprop="price"]', '[data-automation="buybox-price"]'],
  },
  'target.com': {
    name: ['h1[data-test="product-title"]'],
    price: ['[data-test="product-price"]'],
  },
  'mediamarkt.de': {
    name: ['h1[data-test="mms-pdp-heading"]', 'h1.sc-pdp-title'],
    price: ['[data-test="mms-pdp-price"]', '.price__price'],
  },
  'fnac.com': {
    name: ['h1.f-productPage-title', 'h1.Article-title'],
    price: ['.userPrice', '.f-priceBox-price'],
  },
};

// Region detection by hostname
const UK_DOMAINS = ['amazon.co.uk', 'currys.co.uk', 'argos.co.uk', 'johnlewis.com', 'asos.com'];
const EUROPE_DOMAINS = ['amazon.de', 'amazon.fr', 'amazon.es', 'amazon.it', 'mediamarkt.de',
                        'fnac.com', 'coolblue.nl', 'bol.com'];

const CURRENCY_MAP: Record<Region, { code: string; symbol: string }> = {
  us: { code: 'USD', symbol: '$' },
  uk: { code: 'GBP', symbol: '£' },
  europe: { code: 'EUR', symbol: '€' },
};

export function detectRegion(): Region {
  const hostname = window.location.hostname.replace(/^www\./, '');
  if (UK_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return 'uk';
  if (EUROPE_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))) return 'europe';

  // Fallback to browser language
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('en-gb') || lang.startsWith('en-ie')) return 'uk';
  if (['de', 'fr', 'es', 'it', 'nl'].some(l => lang.startsWith(l))) return 'europe';

  return 'us';
}

function normalizePrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.,]/g, '').replace(/,(\d{2})$/, '.$1').replace(/,/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function findPrice(text: string): number | null {
  const match = text.match(/[£$€]\s?[\d,]+\.?\d{0,2}/);
  if (!match) return null;
  return normalizePrice(match[0]);
}

function parseJsonLd(): Partial<ProductInfo> | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type']?.includes?.('Product')) {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          return {
            name: item.name ?? undefined,
            price: offer?.price != null ? parseFloat(String(offer.price)) : null,
            currency: offer?.priceCurrency ?? undefined,
            brand: typeof item.brand === 'string' ? item.brand : item.brand?.name ?? undefined,
            ean: item.gtin13 ?? item.gtin ?? undefined,
            source: 'json-ld',
          };
        }
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return null;
}

function parseOpenGraph(): Partial<ProductInfo> | null {
  const get = (prop: string) =>
    document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`)?.content;
  const name = get('og:title');
  const priceStr = get('og:price:amount');
  const currency = get('og:price:currency');
  if (!name) return null;
  return {
    name,
    price: priceStr ? parseFloat(priceStr) : null,
    currency: currency ?? undefined,
    source: 'og',
  };
}

function applySiteSelectors(): Partial<ProductInfo> | null {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const selectors = Object.entries(SITE_SELECTORS).find(([domain]) =>
    hostname === domain || hostname.endsWith('.' + domain)
  )?.[1];
  if (!selectors) return null;

  let name: string | undefined;
  for (const sel of selectors.name) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      name = el.textContent.trim();
      break;
    }
  }

  let price: number | null = null;
  for (const sel of selectors.price) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) {
      price = normalizePrice(el.textContent.trim());
      if (price !== null) break;
    }
  }

  if (!name && price === null) return null;
  return { name, price, source: 'dom' };
}

function heuristicExtract(): Partial<ProductInfo> {
  const titleRaw = document.title;
  // Strip common site name suffixes
  const name = titleRaw
    .replace(/\s*[|\-–—]\s*(Amazon|Best Buy|Currys|Argos|John Lewis|Walmart|Target|MediaMarkt|Fnac).*$/i, '')
    .trim();

  const h1 = document.querySelector('h1');
  const priceText = h1
    ? h1.parentElement?.textContent ?? document.body.textContent ?? ''
    : document.body.textContent ?? '';

  return { name: name || undefined, price: findPrice(priceText), source: 'heuristic' };
}

export function extractProductInfo(): ProductInfo | null {
  const region = detectRegion();
  const { code: currency, symbol: currencySymbol } = CURRENCY_MAP[region];

  // Try each extraction layer, merging results
  const jsonLd = parseJsonLd();
  const og = parseOpenGraph();
  const dom = applySiteSelectors();
  const heuristic = heuristicExtract();

  const name =
    jsonLd?.name?.trim() ||
    dom?.name?.trim() ||
    og?.name?.trim() ||
    heuristic?.name?.trim();

  const price =
    jsonLd?.price ??
    dom?.price ??
    og?.price ??
    heuristic?.price ??
    null;

  const source = jsonLd?.name
    ? 'json-ld'
    : dom?.name
    ? 'dom'
    : og?.name
    ? 'og'
    : 'heuristic';

  if (!name) return null;

  return {
    name,
    price,
    currency: jsonLd?.currency ?? og?.currency ?? currency,
    currencySymbol,
    url: window.location.href,
    brand: jsonLd?.brand,
    ean: jsonLd?.ean,
    region,
    source,
  };
}

// For SPAs: watch for price to appear (Amazon loads async)
export function watchForProduct(
  callback: (info: ProductInfo) => void,
  timeoutMs = 5000
): () => void {
  const initial = extractProductInfo();
  if (initial?.price !== null) {
    callback(initial!);
    return () => {};
  }

  let settled = false;
  const observer = new MutationObserver(() => {
    const info = extractProductInfo();
    if (info?.price !== null && !settled) {
      settled = true;
      observer.disconnect();
      callback(info!);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const timeout = setTimeout(() => {
    if (!settled) {
      observer.disconnect();
      const fallback = extractProductInfo();
      if (fallback) callback(fallback);
    }
  }, timeoutMs);

  return () => {
    clearTimeout(timeout);
    observer.disconnect();
  };
}
