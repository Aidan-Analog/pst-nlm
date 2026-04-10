/**
 * useLTspiceAgent
 *
 * React hook that calls POST /api/ltspice-agent and consumes the
 * Server-Sent Events stream, updating state in real-time.
 *
 * Compatible with:
 *   - src/pages/Workbench.tsx (pst-nlm form-based shell)
 *   - CXR Figma Make CircuitExplorerNode (drop-in hook)
 *
 * Usage:
 *   const { run, status, iterations, finalWaveforms, summary } = useLTspiceAgent();
 *   await run({ description: '...', targets: { Vout: 3.3 } });
 */

import { useState, useCallback, useRef } from 'react';

// ── Types (mirrors server/ltspice-agent.ts) ─────────────────────────────────

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

export type AgentStatus =
  | 'idle'
  | 'thinking'      // Claude is generating / reasoning
  | 'simulating'    // LTspice is running
  | 'analyzing'     // Claude is analyzing waveforms
  | 'done'
  | 'error';

export interface AgentRunOptions {
  description: string;
  components?: string[];
  targets?: Record<string, unknown>;
}

export interface UseLTspiceAgentReturn {
  /** Start a simulation run */
  run: (opts: AgentRunOptions) => Promise<void>;
  /** Cancel an in-progress run */
  cancel: () => void;
  status: AgentStatus;
  /** Live iteration log — updated as events arrive */
  iterations: IterationEntry[];
  /** Current netlist being worked on */
  currentNetlist: string;
  /** Current iteration number (1-based) */
  currentIteration: number;
  /** Set once the agent calls finish() */
  finalWaveforms: WaveformData | null;
  summary: string;
  passed: boolean;
  errorMessage: string | null;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useLTspiceAgent(): UseLTspiceAgentReturn {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [iterations, setIterations] = useState<IterationEntry[]>([]);
  const [currentNetlist, setCurrentNetlist] = useState('');
  const [currentIteration, setCurrentIteration] = useState(0);
  const [finalWaveforms, setFinalWaveforms] = useState<WaveformData | null>(null);
  const [summary, setSummary] = useState('');
  const [passed, setPassed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, []);

  const run = useCallback(async (opts: AgentRunOptions) => {
    // Reset state
    setStatus('thinking');
    setIterations([]);
    setCurrentNetlist('');
    setCurrentIteration(0);
    setFinalWaveforms(null);
    setSummary('');
    setPassed(false);
    setErrorMessage(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/ltspice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` })) as { error: string };
        throw new Error(err.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by \n\n
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const dataLine = part.split('\n').find(l => l.startsWith('data: '));
          if (!dataLine) continue;

          try {
            const event = JSON.parse(dataLine.slice(6)) as { type: string; [key: string]: unknown };
            handleEvent(event);
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, []);

  function handleEvent(event: { type: string; [key: string]: unknown }) {
    switch (event.type) {
      case 'thinking':
        setStatus('thinking');
        setCurrentIteration((event.iteration as number) ?? 0);
        break;

      case 'netlist':
        setCurrentNetlist(event.netlist as string);
        setCurrentIteration(event.iteration as number);
        // Add a pending iteration entry
        setIterations(prev => upsert(prev, {
          iteration: event.iteration as number,
          netlist: event.netlist as string,
          waveforms: null,
          analysis: '',
          passed: false,
        }));
        break;

      case 'simulating':
        setStatus('simulating');
        setCurrentIteration(event.iteration as number);
        break;

      case 'sim_result':
        setIterations(prev => upsert(prev, {
          iteration: event.iteration as number,
          netlist: currentNetlist,
          waveforms: event.waveforms as WaveformData,
          analysis: '',
          passed: false,
        }));
        break;

      case 'sim_error':
        setIterations(prev => upsert(prev, {
          iteration: event.iteration as number,
          netlist: currentNetlist,
          waveforms: null,
          analysis: `Simulation error: ${event.message as string}`,
          passed: false,
        }));
        break;

      case 'analyzing':
        setStatus('analyzing');
        break;

      case 'done': {
        const doneIterations = event.iterations as IterationEntry[];
        setIterations(doneIterations);
        setFinalWaveforms((event.finalWaveforms as WaveformData) ?? null);
        setSummary(event.summary as string);
        setPassed(event.passed as boolean);
        setStatus('done');
        break;
      }

      case 'error':
        setErrorMessage(event.message as string);
        setStatus('error');
        break;
    }
  }

  return {
    run, cancel, status, iterations, currentNetlist, currentIteration,
    finalWaveforms, summary, passed, errorMessage,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function upsert(list: IterationEntry[], entry: IterationEntry): IterationEntry[] {
  const idx = list.findIndex(e => e.iteration === entry.iteration);
  if (idx === -1) return [...list, entry];
  const updated = [...list];
  updated[idx] = { ...updated[idx], ...entry };
  return updated;
}
