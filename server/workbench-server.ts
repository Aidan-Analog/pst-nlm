/**
 * Standalone LTspice Workbench Server
 *
 * A lean API server with no PST/product-catalog overhead.
 * Exposes only the LTspice simulation endpoints and serves the
 * built Workbench UI as static files.
 *
 * LTspice MacBook: http://192.168.0.70:8765  (set via LTSPICE_SERVER_URL)
 * Default port: 3002  (set via PORT to avoid colliding with PST on 3001)
 *
 * Dev: npm run workbench:dev
 * Prod: npm run workbench:start
 *
 * The CXR Figma Make project should proxy /api → http://localhost:3002
 * (add to its vite.config.ts):
 *   server: { proxy: { '/api': 'http://localhost:3002' } }
 */

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import { streamLTspiceAgent } from './ltspice-agent.js';
import type { AgentRequest, AgentEvent } from './ltspice-agent.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
const LTSPICE_SERVER_URL = process.env.LTSPICE_SERVER_URL ?? 'http://192.168.0.70:8765';

// Allow requests from Figma Make dev server and local origins
app.use(cors({
  origin: [
    'http://localhost:5173',  // pst-nlm Vite dev
    'http://localhost:5174',  // Figma Make CXR Vite dev
    'http://localhost:3000',
    /^http:\/\/192\.168\./,   // any LAN device
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Health / status ──────────────────────────────────────────────────────────

app.get('/api/ltspice/status', async (_req, res) => {
  try {
    const r = await fetch(`${LTSPICE_SERVER_URL}/status`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await r.json();
    res.json({ ...data as object, serverUrl: LTSPICE_SERVER_URL });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(503).json({
      ok: false,
      error: `LTspice server unreachable: ${msg}`,
      serverUrl: LTSPICE_SERVER_URL,
    });
  }
});

// ── Direct simulation proxy ──────────────────────────────────────────────────

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

// ── LTspice Agent (SSE streaming) ────────────────────────────────────────────

app.post('/api/ltspice-agent', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }

  const { description, components, targets } = req.body as AgentRequest;
  if (!description) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'Missing description' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (event: AgentEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await streamLTspiceAgent(anthropic, { description, components, targets }, sendEvent);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent({ type: 'error', message: msg });
  } finally {
    res.end();
  }
});

// ── Static Workbench UI (production) ─────────────────────────────────────────

const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('/{*path}', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`[workbench-server] Running on http://localhost:${PORT}`);
  console.log(`[workbench-server] LTspice server: ${LTSPICE_SERVER_URL}`);
  console.log(`[workbench-server] API key: ${process.env.ANTHROPIC_API_KEY ? '✓ set' : '✗ missing'}`);
});
