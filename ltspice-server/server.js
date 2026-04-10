/**
 * LTspice LAN Server
 *
 * Runs on the MacBook that has LTspice installed.
 * Exposes an HTTP API so the PST Workbench agent can run simulations remotely.
 *
 * Start: node server.js
 * Port: 8765 (set PORT env var to override)
 * LTspice binary: /Applications/LTspice.app/Contents/MacOS/LTspice
 *   (set LTSPICE_BIN env var to override, e.g. for LTspice 24)
 */

const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseRaw } = require('./raw-parser');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8765;

// LTspice XVII (Rosetta) or LTspice 24 (native ARM)
const LTSPICE_BIN = process.env.LTSPICE_BIN ||
  '/Applications/LTspice.app/Contents/MacOS/LTspice';

// Health check
app.get('/status', (_req, res) => {
  const exists = fs.existsSync(LTSPICE_BIN);
  res.json({ ok: true, ltspice: LTSPICE_BIN, ltspiceFound: exists });
});

/**
 * POST /simulate
 * Body: { netlist: string }
 * Response: { variables, time, signals } or { error: string }
 *
 * Accepts a SPICE netlist (.net format), writes it to a temp file,
 * runs LTspice in batch mode, parses the .raw output, returns JSON.
 */
app.post('/simulate', (req, res) => {
  const { netlist } = req.body;
  if (!netlist || typeof netlist !== 'string') {
    return res.status(400).json({ error: 'Missing netlist in request body' });
  }

  let tmpDir;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ltspice-'));
  } catch (err) {
    return res.status(500).json({ error: `Failed to create temp dir: ${err.message}` });
  }

  const netFile = path.join(tmpDir, 'sim.net');
  const rawFile = path.join(tmpDir, 'sim.raw');

  fs.writeFileSync(netFile, netlist, 'utf8');

  // LTspice CLI: -Run starts simulation, -b is batch mode (no GUI)
  execFile(
    LTSPICE_BIN,
    ['-Run', '-b', netFile],
    { timeout: 60_000 },
    (err) => {
      // LTspice may exit with code 1 even on success — check for .raw file
      if (err && !fs.existsSync(rawFile)) {
        cleanup(tmpDir);
        const msg = err.code === 'ENOENT'
          ? `LTspice binary not found at: ${LTSPICE_BIN}`
          : err.message;
        return res.status(500).json({ error: msg });
      }

      if (!fs.existsSync(rawFile)) {
        cleanup(tmpDir);
        return res.status(500).json({ error: 'Simulation produced no .raw output file' });
      }

      try {
        const raw = fs.readFileSync(rawFile);
        const data = parseRaw(raw);
        cleanup(tmpDir);
        res.json(data);
      } catch (parseErr) {
        cleanup(tmpDir);
        res.status(500).json({ error: `Failed to parse .raw file: ${parseErr.message}` });
      }
    }
  );
});

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ltspice-server] Running on http://0.0.0.0:${PORT}`);
  console.log(`[ltspice-server] LTspice binary: ${LTSPICE_BIN}`);
  console.log(`[ltspice-server] LTspice found: ${fs.existsSync(LTSPICE_BIN)}`);
  console.log(`[ltspice-server] Ready to accept simulation requests`);
});
