/**
 * LTspice Simulation Agent — SSE-streaming version
 *
 * Uses Claude claude-sonnet-4-6 with tool_use to:
 *   1. Generate a SPICE netlist for a described circuit
 *   2. Run it on the remote LTspice server (MacBook on LAN)
 *   3. Analyze waveform results against design targets
 *   4. Iterate until targets are met or MAX_ITERATIONS is reached
 *
 * Progress is streamed via Server-Sent Events (SSE) so the UI can
 * show live iteration updates. The endpoint that calls this module
 * is responsible for setting SSE headers before calling streamLTspiceAgent.
 *
 * Part of the ADI CXR (Customer Experience Reimagination) Workbench.
 */

import Anthropic from '@anthropic-ai/sdk';

const MAX_ITERATIONS = 5;

const LTSPICE_SERVER_URL = process.env.LTSPICE_SERVER_URL ?? 'http://localhost:8765';

// ---------------------------------------------------------------------------
// Public types (also used by frontend via shared import or copy)
// ---------------------------------------------------------------------------

export interface AgentRequest {
  description: string;
  components?: string[];
  targets?: Record<string, unknown>;
}

export interface WaveformData {
  variables: string[];
  time: number[];
  signals: Record<string, number[]>;
}

export interface IterationEntry {
  iteration: number;
  netlist: string;
  waveforms: WaveformData | null;
  analysis: string;
  passed: boolean;
}

// ---------------------------------------------------------------------------
// SSE event types — streamed to the browser during the agent loop
// ---------------------------------------------------------------------------

export type AgentEvent =
  | { type: 'thinking'; iteration: number }
  | { type: 'netlist'; iteration: number; netlist: string }
  | { type: 'simulating'; iteration: number }
  | { type: 'sim_result'; iteration: number; waveforms: WaveformData }
  | { type: 'sim_error'; iteration: number; message: string }
  | { type: 'analyzing'; iteration: number }
  | { type: 'done'; iterations: IterationEntry[]; finalNetlist: string; finalWaveforms: WaveformData | null; summary: string; passed: boolean }
  | { type: 'error'; message: string };

// ---------------------------------------------------------------------------
// Tool definitions for Claude
// ---------------------------------------------------------------------------

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'run_simulation',
    description:
      'Run a SPICE netlist on the remote LTspice server. ' +
      'Returns a statistical summary of waveform data (min/max/avg per signal, steady-state). ' +
      'Write the complete netlist in the netlist parameter.',
    input_schema: {
      type: 'object' as const,
      properties: {
        netlist: {
          type: 'string',
          description:
            'Complete SPICE netlist (.net format). Must include title line, ' +
            'components, .TRAN analysis, and .end',
        },
      },
      required: ['netlist'],
    },
  },
  {
    name: 'finish',
    description: 'Signal that the simulation loop is complete.',
    input_schema: {
      type: 'object' as const,
      properties: {
        summary: {
          type: 'string',
          description: 'Summary of results and what was achieved',
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
2. Call run_simulation() with the complete netlist text
3. Analyse the returned waveform summary against the stated design targets
4. If targets are not met, write an improved netlist and call run_simulation() again
5. Repeat up to ${MAX_ITERATIONS} times, then call finish()

SPICE netlist rules:
- Line 1: title/comment (e.g., "* Buck Converter 12V→3.3V 500mA")
- Components: R1 n1 n2 1k | C1 n1 0 100u | L1 n1 n2 10u | V1 Vin 0 DC 12
- Analysis: .TRAN 1n 5m  (step end_time)
- End every netlist with: .end
- Use only standard SPICE2/3 syntax — no .lib directives
- Use simplified diode/MOSFET models inline: .model SW SW(Ron=0.1 Roff=1Meg)

For power supply circuits, use a voltage-controlled switch (SW) for the MOSFET:
  S1 sw Vin gate 0 SW  → with  .model SW SW(Ron=0.05 Roff=1Meg Vt=0.5 Vh=0.1)
  V_gate gate 0 PULSE(0 5 0 1n 1n {D*T} {T})  (D=duty, T=period)

When analysing waveforms: focus on the steady-state region (last 20% of sim time).
The run_simulation tool returns: avg, min, max, ripple_pp for each node in steady-state.

ADI components: if specified, use ideal equivalent values; name them with the part number in comments.`;

// ---------------------------------------------------------------------------
// Waveform summary (compact representation sent back to Claude)
// ---------------------------------------------------------------------------

function summariseWaveforms(data: WaveformData): Record<string, unknown> {
  const ssStart = Math.floor(data.time.length * 0.2);

  const signals: Record<string, unknown> = {};
  for (const [name, values] of Object.entries(data.signals)) {
    if (name === data.variables[0]) continue;
    const ss = values.slice(ssStart);
    if (ss.length === 0) continue;
    const min = Math.min(...ss);
    const max = Math.max(...ss);
    const avg = ss.reduce((a, b) => a + b, 0) / ss.length;
    signals[name] = {
      avg: round(avg, 6),
      min: round(min, 6),
      max: round(max, 6),
      ripple_pp: round(max - min, 6),
    };
  }

  return {
    variables: data.variables,
    time_range_s: [data.time[0], data.time[data.time.length - 1]],
    num_points: data.time.length,
    steady_state_signals: signals,
  };
}

function round(v: number, places: number): number {
  const f = 10 ** places;
  return Math.round(v * f) / f;
}

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeRunSimulation(netlist: string): Promise<{
  toolResult: unknown;
  waveforms: WaveformData | null;
  error: string | null;
}> {
  try {
    const resp = await fetch(`${LTSPICE_SERVER_URL}/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ netlist }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText })) as { error: string };
      return { toolResult: { error: err.error }, waveforms: null, error: err.error };
    }

    const waveforms = await resp.json() as WaveformData;
    return { toolResult: summariseWaveforms(waveforms), waveforms, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const error = `LTspice server unreachable: ${msg}`;
    return { toolResult: { error }, waveforms: null, error };
  }
}

// ---------------------------------------------------------------------------
// Streaming agent loop
// ---------------------------------------------------------------------------

/**
 * Run the LTspice agent loop, streaming SSE events via the sendEvent callback.
 * The caller must have already set SSE response headers.
 */
export async function streamLTspiceAgent(
  anthropic: Anthropic,
  agentReq: AgentRequest,
  sendEvent: (event: AgentEvent) => void,
): Promise<void> {
  const { description, components = [], targets = {} } = agentReq;

  const userMessage = [
    `Circuit request: ${description}`,
    components.length > 0 ? `ADI components: ${components.join(', ')}` : '',
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
  let finished = false;

  try {
    while (!finished && iterCount < MAX_ITERATIONS) {
      sendEvent({ type: 'thinking', iteration: iterCount + 1 });

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      messages.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'end_turn') {
        finished = true;
        break;
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;

        let toolResultContent: unknown;

        // ── run_simulation ──────────────────────────────────────────────────
        if (block.name === 'run_simulation') {
          const { netlist } = block.input as { netlist: string };
          iterCount++;

          sendEvent({ type: 'netlist', iteration: iterCount, netlist });
          sendEvent({ type: 'simulating', iteration: iterCount });

          const { toolResult, waveforms, error } = await executeRunSimulation(netlist);

          if (error || !waveforms) {
            sendEvent({ type: 'sim_error', iteration: iterCount, message: error ?? 'No data' });
          } else {
            sendEvent({ type: 'sim_result', iteration: iterCount, waveforms });
            finalWaveforms = waveforms;
            finalNetlist = netlist;
          }

          iterations.push({
            iteration: iterCount,
            netlist,
            waveforms: waveforms ?? null,
            analysis: '',
            passed: false,
          });

          sendEvent({ type: 'analyzing', iteration: iterCount });
          toolResultContent = toolResult;
        }

        // ── finish ──────────────────────────────────────────────────────────
        else if (block.name === 'finish') {
          const inp = block.input as { summary: string; final_netlist: string; passed: boolean };
          summary = inp.summary;
          finalNetlist = inp.final_netlist || finalNetlist;
          passed = inp.passed;
          finished = true;

          // Update last iteration with analysis
          if (iterations.length > 0) {
            iterations[iterations.length - 1].analysis = summary;
            iterations[iterations.length - 1].passed = passed;
          }

          toolResultContent = { ok: true };
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(toolResultContent),
        });
      }

      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      }
    }

    sendEvent({
      type: 'done',
      iterations,
      finalNetlist,
      finalWaveforms,
      summary: summary || `Completed ${iterations.length} simulation iteration(s).`,
      passed,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent({ type: 'error', message: msg });
  }
}
