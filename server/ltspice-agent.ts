/**
 * LTspice Simulation Agent
 *
 * Uses Claude claude-sonnet-4-6 with tool_use to:
 *   1. Generate a SPICE netlist for a described circuit
 *   2. Run it on the remote LTspice server (MacBook on LAN)
 *   3. Analyze waveform results against design targets
 *   4. Iterate until targets are met or MAX_ITERATIONS is reached
 *
 * Part of the ADI CXR (Customer Experience Reimagination) Workbench.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Request, Response } from 'express';

const MAX_ITERATIONS = 5;

const LTSPICE_SERVER_URL = process.env.LTSPICE_SERVER_URL ?? 'http://localhost:8765';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentRequest {
  description: string;           // Natural language circuit description
  components?: string[];         // ADI part numbers to use (from PST)
  targets?: Record<string, unknown>; // Design targets e.g. { Vout: 3.3, ripple_mV: 10 }
}

export interface IterationEntry {
  iteration: number;
  netlist: string;
  waveforms: WaveformData | null;
  analysis: string;
  passed: boolean;
}

export interface AgentResult {
  iterations: IterationEntry[];
  finalNetlist: string;
  finalWaveforms: WaveformData | null;
  summary: string;
  passed: boolean;
}

interface WaveformData {
  variables: string[];
  time: number[];
  signals: Record<string, number[]>;
}

// ---------------------------------------------------------------------------
// Tool definitions for Claude
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'run_simulation',
    description:
      'Run a SPICE netlist on the remote LTspice server. ' +
      'Returns waveform data with time array and signal arrays for each variable. ' +
      'Call this after writing or modifying a netlist.',
    input_schema: {
      type: 'object' as const,
      properties: {
        netlist: {
          type: 'string',
          description:
            'Complete SPICE netlist text (.net format). ' +
            'Must include a title line, component definitions, analysis command (.TRAN), and .end',
        },
      },
      required: ['netlist'],
    },
  },
  {
    name: 'finish',
    description:
      'Signal that simulation is complete. ' +
      'Call this when design targets are met OR after exhausting iterations.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'Brief summary of the simulation results and what was achieved',
        },
        final_netlist: {
          type: 'string',
          description: 'The final (best) SPICE netlist',
        },
        passed: {
          type: 'boolean',
          description: 'Whether all design targets were met',
        },
      },
      required: ['summary', 'final_netlist', 'passed'],
    },
  },
];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an LTspice circuit simulation agent for Analog Devices (ADI), part of the CXR (Customer Experience Reimagination) Workbench.

Your job:
1. Design a SPICE netlist for the requested circuit using standard SPICE syntax
2. Call run_simulation() with the netlist
3. Analyze the returned waveform data against the stated design targets
4. If targets are not met, refine the netlist and simulate again (max ${MAX_ITERATIONS} iterations)
5. Call finish() when done

SPICE netlist rules:
- Line 1: title/comment (e.g., "* Buck Converter 12V to 3.3V")
- Components: R1 n1 n2 1k | C1 n1 0 100u | L1 n1 n2 10u | V1 Vin 0 DC 12
- MOSFET: M1 drain gate source body NMOS W=10u L=100n
- Diode: D1 anode cathode DIODE
- Analysis: .TRAN 1n 5m  (step_size end_time)
- Models: .model DIODE D(IS=1e-14) or use standard .lib models
- Must end with: .end

For power supply circuits, use simplified models without external .lib files.
When analyzing waveforms: look at steady-state region (after ~20% of simulation time).
Measure Vout average, ripple (peak-to-peak), and efficiency from the signals.

ADI components to use if specified: include them as models or use equivalent ideal components if simulation models are unavailable.`;

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<{ result: unknown; iteration: Partial<IterationEntry> | null }> {
  if (name === 'run_simulation') {
    const netlist = input.netlist as string;
    let waveforms: WaveformData | null = null;

    try {
      const resp = await fetch(`${LTSPICE_SERVER_URL}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ netlist }),
        signal: AbortSignal.timeout(90_000),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: resp.statusText })) as { error: string };
        return {
          result: { error: err.error ?? resp.statusText },
          iteration: { netlist, waveforms: null },
        };
      }

      waveforms = await resp.json() as WaveformData;
      return {
        result: summariseWaveforms(waveforms),
        iteration: { netlist, waveforms },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        result: { error: `LTspice server unreachable: ${msg}` },
        iteration: { netlist, waveforms: null },
      };
    }
  }

  if (name === 'finish') {
    return { result: { ok: true }, iteration: null };
  }

  return { result: { error: `Unknown tool: ${name}` }, iteration: null };
}

/**
 * Return a compact waveform summary for Claude to analyze.
 * Sending the full arrays would exceed token limits.
 */
function summariseWaveforms(data: WaveformData): Record<string, unknown> {
  const summary: Record<string, unknown> = {
    variables: data.variables,
    time_range: [data.time[0], data.time[data.time.length - 1]],
    num_points: data.time.length,
    signals: {} as Record<string, unknown>,
  };

  // Analyse the last 80% of time points (steady state)
  const ssStart = Math.floor(data.time.length * 0.2);

  for (const [name, values] of Object.entries(data.signals)) {
    if (name === data.variables[0]) continue; // skip time variable
    const ss = values.slice(ssStart);
    const min = Math.min(...ss);
    const max = Math.max(...ss);
    const avg = ss.reduce((a, b) => a + b, 0) / ss.length;
    (summary.signals as Record<string, unknown>)[name] = {
      min: round(min, 6),
      max: round(max, 6),
      avg: round(avg, 6),
      ripple_pp: round(max - min, 6),
    };
  }

  return summary;
}

function round(v: number, places: number): number {
  const f = 10 ** places;
  return Math.round(v * f) / f;
}

// ---------------------------------------------------------------------------
// Main agent loop
// ---------------------------------------------------------------------------

export async function runLTspiceAgent(
  anthropic: Anthropic,
  agentReq: AgentRequest,
): Promise<AgentResult> {
  const { description, components = [], targets = {} } = agentReq;

  const userMessage = [
    `Circuit request: ${description}`,
    components.length > 0 ? `ADI components to use: ${components.join(', ')}` : '',
    Object.keys(targets).length > 0
      ? `Design targets: ${JSON.stringify(targets)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: userMessage },
  ];

  const iterations: IterationEntry[] = [];
  let finalNetlist = '';
  let finalWaveforms: WaveformData | null = null;
  let summary = '';
  let passed = false;
  let iterCount = 0;

  while (iterCount < MAX_ITERATIONS) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    });

    // Add assistant response to conversation
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn') break;

    if (response.stop_reason !== 'tool_use') break;

    // Execute all tool calls in this turn
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;

      const { result, iteration } = await executeTool(
        block.name,
        block.input as Record<string, unknown>,
      );

      // Capture finish() args
      if (block.name === 'finish') {
        const inp = block.input as { summary: string; final_netlist: string; passed: boolean };
        summary = inp.summary;
        finalNetlist = inp.final_netlist;
        passed = inp.passed;
      }

      // Record iteration entry for run_simulation calls
      if (iteration) {
        iterCount++;
        iterations.push({
          iteration: iterCount,
          netlist: iteration.netlist ?? '',
          waveforms: iteration.waveforms ?? null,
          analysis: '', // Claude's analysis appears in subsequent text blocks
          passed: false, // updated when finish() is called
        });
        if (iteration.waveforms) {
          finalNetlist = iteration.netlist ?? finalNetlist;
          finalWaveforms = iteration.waveforms;
        }
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });

    // Stop if finish() was called
    if (passed !== undefined && finalNetlist && summary) {
      // Check if finish was called in this turn
      const calledFinish = response.content.some(
        b => b.type === 'tool_use' && b.name === 'finish',
      );
      if (calledFinish) break;
    }
  }

  // Update last iteration's passed status
  if (iterations.length > 0) {
    iterations[iterations.length - 1].passed = passed;
    iterations[iterations.length - 1].analysis = summary;
  }

  return {
    iterations,
    finalNetlist,
    finalWaveforms,
    summary: summary || `Completed ${iterations.length} simulation iteration(s).`,
    passed,
  };
}
