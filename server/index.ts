import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadProducts } from './loader.js';
import { runLTspiceAgent } from './ltspice-agent.js';
import type { AgentRequest } from './ltspice-agent.js';

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

// ---------------------------------------------------------------------------
// LTspice Workbench endpoints
// ---------------------------------------------------------------------------

const LTSPICE_SERVER_URL = process.env.LTSPICE_SERVER_URL ?? 'http://localhost:8765';

/** Health check — proxies to the MacBook LTspice server */
app.get('/api/ltspice/status', async (_req, res) => {
  try {
    const r = await fetch(`${LTSPICE_SERVER_URL}/status`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(503).json({ ok: false, error: `LTspice server unreachable: ${msg}` });
  }
});

/** Direct simulation proxy — POST { netlist } → waveform JSON */
app.post('/api/ltspice/simulate', async (req, res) => {
  const { netlist } = req.body as { netlist?: string };
  if (!netlist) return res.status(400).json({ error: 'Missing netlist' });

  try {
    const r = await fetch(`${LTSPICE_SERVER_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ netlist }),
      signal: AbortSignal.timeout(90_000),
    });
    const data = await r.json();
    res.status(r.ok ? 200 : 500).json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(503).json({ error: `LTspice server unreachable: ${msg}` });
  }
});

/**
 * LTspice Agent — runs the full agentic loop
 * POST { description, components?, targets? }
 * Returns { iterations, finalNetlist, finalWaveforms, summary, passed }
 */
app.post('/api/ltspice-agent', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  const { description, components, targets } = req.body as AgentRequest;
  if (!description) return res.status(400).json({ error: 'Missing description' });

  try {
    const result = await runLTspiceAgent(anthropic, { description, components, targets });
    res.json(result);
  } catch (err) {
    console.error('[ltspice-agent] Error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// Serve built frontend (production)
const distPath = process.env.DIST_DIR ?? path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
