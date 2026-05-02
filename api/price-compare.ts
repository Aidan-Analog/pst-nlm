import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

type Region = 'us' | 'uk' | 'europe';

interface Retailer {
  name: string;
  domain: string;
}

interface PriceResult {
  retailer: string;
  retailerDomain: string;
  price: number | null;
  currency: string;
  currencySymbol: string;
  url: string;
  inStock: boolean | null;
  confidence: 'high' | 'medium' | 'low';
}

const RETAILERS: Record<Region, Retailer[]> = {
  us: [
    { name: 'Amazon US', domain: 'amazon.com' },
    { name: 'Best Buy', domain: 'bestbuy.com' },
    { name: 'Walmart', domain: 'walmart.com' },
    { name: 'Target', domain: 'target.com' },
  ],
  uk: [
    { name: 'Amazon UK', domain: 'amazon.co.uk' },
    { name: 'Currys', domain: 'currys.co.uk' },
    { name: 'Argos', domain: 'argos.co.uk' },
    { name: 'John Lewis', domain: 'johnlewis.com' },
  ],
  europe: [
    { name: 'Amazon DE', domain: 'amazon.de' },
    { name: 'Amazon FR', domain: 'amazon.fr' },
    { name: 'MediaMarkt', domain: 'mediamarkt.de' },
    { name: 'Fnac', domain: 'fnac.com' },
  ],
};

const CURRENCY: Record<Region, { code: string; symbol: string }> = {
  us: { code: 'USD', symbol: '$' },
  uk: { code: 'GBP', symbol: '£' },
  europe: { code: 'EUR', symbol: '€' },
};

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function normalizeProductName(rawName: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    messages: [{
      role: 'user',
      content: `Given this raw product name from a retail website, return ONLY a clean universal search query string that would find this exact product on any retailer. Keep brand name + model name + key specs. Remove retailer-specific suffixes, promotional text, and stock codes. Return only the query string with no explanation.\n\nProduct: ${rawName}`,
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : rawName;
  return text || rawName;
}

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  domain: string;
  retailerName: string;
}

async function searchRetailer(
  query: string,
  retailer: Retailer
): Promise<SearchResult | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cx) return null;

  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(apiKey)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query + ' site:' + retailer.domain)}&num=3`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { items?: Array<{ title: string; snippet: string; link: string }> };
    const item = data.items?.[0];
    if (!item) return null;
    return {
      title: item.title,
      snippet: item.snippet,
      url: item.link,
      domain: retailer.domain,
      retailerName: retailer.name,
    };
  } catch {
    return null;
  }
}

async function extractPricesFromSnippets(
  snippets: SearchResult[],
  region: Region
): Promise<PriceResult[]> {
  if (snippets.length === 0) return [];

  const { code: currency, symbol: currencySymbol } = CURRENCY[region];
  const snippetText = snippets
    .map((s, i) => `[${i}] Retailer: ${s.retailerName} (${s.domain})\nURL: ${s.url}\nTitle: ${s.title}\nSnippet: ${s.snippet}`)
    .join('\n\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: `Extract the price for each product listing below. Return ONLY a JSON array with no explanation or markdown, in this exact format:\n[{"index":0,"price":99.99,"inStock":true},{"index":1,"price":null,"inStock":null}]\n\nRules:\n- price must be a number (no currency symbols), or null if not found\n- inStock: true if clearly in stock, false if out of stock, null if unknown\n- Use ${currency} currency (${currencySymbol})\n\nListings:\n${snippetText}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const extracted = JSON.parse(jsonMatch[0]) as Array<{ index: number; price: number | null; inStock: boolean | null }>;

  return extracted.map(e => {
    const s = snippets[e.index];
    if (!s) return null;
    return {
      retailer: s.retailerName,
      retailerDomain: s.domain,
      price: e.price,
      currency,
      currencySymbol,
      url: s.url,
      inStock: e.inStock,
      confidence: e.price != null ? 'medium' : 'low',
    } satisfies PriceResult;
  }).filter((r): r is PriceResult => r !== null);
}

export async function priceCompareHandler(
  rawName: string,
  region: Region
): Promise<{ results: PriceResult[]; normalizedQuery: string; region: Region; error?: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { results: [], normalizedQuery: rawName, region, error: 'ANTHROPIC_API_KEY not configured' };
  }
  if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CSE_ID) {
    return { results: [], normalizedQuery: rawName, region, error: 'Google CSE not configured (GOOGLE_API_KEY / GOOGLE_CSE_ID missing)' };
  }

  const retailers = RETAILERS[region] ?? RETAILERS.uk;
  const normalizedQuery = await normalizeProductName(rawName);

  const searchResults = await Promise.all(retailers.map(r => searchRetailer(normalizedQuery, r)));
  const found = searchResults.filter((r): r is SearchResult => r !== null);

  const priceResults = await extractPricesFromSnippets(found, region);

  // Sort: results with prices first (ascending), then no-price results
  priceResults.sort((a, b) => {
    if (a.price == null && b.price == null) return 0;
    if (a.price == null) return 1;
    if (b.price == null) return -1;
    return a.price - b.price;
  });

  return { results: priceResults, normalizedQuery, region };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, price: _price, region = 'uk' } = req.body as {
    name?: string;
    price?: number;
    region?: Region;
  };

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing product name' });
  }

  const validRegions: Region[] = ['us', 'uk', 'europe'];
  const safeRegion: Region = validRegions.includes(region) ? region : 'uk';

  try {
    const result = await priceCompareHandler(name, safeRegion);
    res.json(result);
  } catch (err) {
    console.error('[price-compare] Error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg, results: [], normalizedQuery: name, region: safeRegion });
  }
}
