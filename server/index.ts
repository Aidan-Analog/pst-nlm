import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProducts } from './loader.js';
import { startWhatsAppBot } from './whatsapp-bot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

app.use(cors());
app.use(express.json());

// Load products once at startup
const dataDir = process.env.DATA_DIR ?? path.join(__dirname, '../../data');
const products = loadProducts(path.join(dataDir, 'products.xlsx'));
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

// ── Setlist endpoints ──────────────────────────────────────────────────────

const SETLIST_PARSE_PROMPT = `You are parsing a WhatsApp message from a Musical Director into a structured setlist.
Return ONLY valid JSON with no markdown, no explanation:
{
  "gigName": string | null,
  "gigDate": string | null,
  "sets": [
    {
      "label": string,
      "songs": [
        { "position": number, "title": string, "notes": string | null }
      ]
    }
  ]
}

Rules:
- Preserve the numbered order exactly as written
- Group songs into sets based on any "SET 1 / SET 2 / BREAK" labels; if none, use a single set with label "SET"
- Capture any inline note on a song in the notes field, otherwise notes is null
- gigDate should be ISO format (YYYY-MM-DD) if a date is mentioned, otherwise null
- gigName should be a venue or event name if mentioned, otherwise null
- Do not infer or add keys, tempos, or any information not present in the message
- Ignore greetings, sign-offs, and emoji`;

// Shared parse-and-publish logic used by both the HTTP endpoint and the WhatsApp bot
async function parseAndPublish(text: string): Promise<void> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SETLIST_PARSE_PROMPT,
    messages: [{ role: 'user', content: text }],
  });
  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in Claude response');
  const parsed = JSON.parse(jsonMatch[0]);

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('setlists')
    .insert({
      gig_name: parsed.gigName ?? null,
      gig_date: parsed.gigDate ?? null,
      raw_text: text,
      sets: parsed.sets ?? [],
    });
  if (error) throw new Error(error.message);
}

app.post('/api/setlist-parse', async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SETLIST_PARSE_PROMPT,
      messages: [{ role: 'user', content: text }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text : '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Claude response');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('[setlist-parse] Error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

app.get('/api/setlist', async (_req, res) => {
  const supabase = getSupabase();
  if (!supabase) return res.json(null);
  const { data, error } = await supabase
    .from('setlists')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: error.message });
  }
  res.json(data ?? null);
});

app.post('/api/setlist', async (req, res) => {
  const passphrase = process.env.SETLIST_PASSPHRASE;
  if (passphrase && req.headers['x-setlist-passphrase'] !== passphrase) {
    return res.status(403).json({ error: 'Invalid passphrase' });
  }
  const supabase = getSupabase();
  if (!supabase) return res.status(503).json({ error: 'Supabase not configured' });
  const { gigName, gigDate, rawText, sets } = req.body as {
    gigName?: string; gigDate?: string; rawText?: string; sets?: unknown;
  };
  if (!rawText || !sets) return res.status(400).json({ error: 'Missing rawText or sets' });
  const { data, error } = await supabase
    .from('setlists')
    .insert({ gig_name: gigName ?? null, gig_date: gigDate ?? null, raw_text: rawText, sets })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Serve built frontend (production)
const distPath = process.env.DIST_DIR ?? path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  startWhatsAppBot(parseAndPublish).catch(err =>
    console.error('[whatsapp] Failed to start bot:', err)
  );
});
