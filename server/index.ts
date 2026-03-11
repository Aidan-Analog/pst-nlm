import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProducts } from './loader.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

// Load products once at startup
const products = loadProducts(path.join(__dirname, '../data/products.xlsx'));
console.log(`[server] Loaded ${products.length} products`);

// Build schema summary for the system prompt
const sampleProduct = products[0];
const schemaFields = sampleProduct ? Object.keys(sampleProduct)
  .filter(k => !['priceSku'].includes(k))
  .map(k => {
    const v = sampleProduct[k as keyof typeof sampleProduct];
    return `  - ${k}: ${typeof v} (e.g. ${JSON.stringify(v)})`;
  }).join('\n') : '';

const SYSTEM_PROMPT = `You are a product selection assistant for Analog Devices (ADI).
You help engineers filter a PST (Product Selection Table) based on natural language queries.

The product data has these fields:
${schemaFields}

Key field notes:
- lifecycle values: "RECOMMENDED FOR NEW DESIGNS" or "PRODUCTION"
- price1ku is the price in USD at 1000 quantity (a number, e.g. 4.55)
- availability is the stock count (integer or null if "Check Distributor Inventory")
- inStock is true if availability > 0
- rohsCompliant is a boolean
- surfaceMount is a boolean
- vinMin/vinMax are input voltage range in volts
- voutMin/voutMax are output voltage range in volts
- ioutMax is max output current in amps
- tempMin/tempMax are operating temperature range in °C

Return ONLY a single valid JSON object (no markdown, no explanation) in this exact format:
{
  "filters": [
    { "column": "price1ku", "operator": "lt", "value": 2 },
    { "column": "inStock", "operator": "eq", "value": true }
  ],
  "sort": { "column": "price1ku", "direction": "asc" },
  "message": "Showing in-stock parts under $2, sorted by lowest price."
}

Rules:
- "filters" is an array of conditions (can be empty [])
- "sort" is optional (set to null if no sorting requested)
- "message" is a concise, friendly explanation of what was applied (1-2 sentences)
- Use only these operators: eq, neq, lt, lte, gt, gte, contains, startsWith
- For boolean fields use: { "operator": "eq", "value": true/false }
- If the query is unclear or cannot be mapped to filters, return empty filters with a helpful message`;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/companion', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not set. Add it to your .env file.',
      filters: [],
      sort: null,
      message: 'API key not configured. Please add ANTHROPIC_API_KEY to .env',
    });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: query },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in Claude response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    res.json({
      filters: parsed.filters || [],
      sort: parsed.sort || null,
      message: parsed.message || 'Filters applied.',
    });
  } catch (err) {
    console.error('[companion] Error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg, filters: [], sort: null, message: `Error: ${msg}` });
  }
});

// Serve products for the frontend to consume
app.get('/api/products', (_req, res) => {
  res.json(products);
});

app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
});
