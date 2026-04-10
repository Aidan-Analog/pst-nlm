/**
 * LTspiceNode
 *
 * A self-contained circuit simulation panel designed to work as:
 *   1. A standalone panel inside src/pages/Workbench.tsx
 *   2. A React Flow node inside the CXR Figma Make FlowCanvas
 *      (wrap with <div data-node-type="ltspice"> or pass as NodeProps)
 *
 * Integration with CXR Figma Make CircuitExplorerNode:
 *   Import useLTspiceAgent and this component into CircuitExplorerNode.tsx,
 *   then render <LTspiceNode /> inside the node's card body.
 *
 * The component uses no external UI library — it mirrors the inline-style
 * conventions of this project. When dropped into the Figma Make project,
 * swap inline styles for shadcn/ui Card + Button + Textarea equivalents.
 */

import { useState } from 'react';
import { useLTspiceAgent } from '../../hooks/useLTspiceAgent';
import WaveformViewer from './WaveformViewer';

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  idle: { label: 'Ready', color: '#6b7280' },
  thinking: { label: 'Claude thinking…', color: '#2563eb' },
  simulating: { label: 'LTspice running…', color: '#d97706' },
  analyzing: { label: 'Analyzing…', color: '#7c3aed' },
  done: { label: 'Done', color: '#16a34a' },
  error: { label: 'Error', color: '#dc2626' },
};

// ── Component ────────────────────────────────────────────────────────────────

export interface LTspiceNodeProps {
  /** Pre-fill the description field */
  initialDescription?: string;
  /** Pre-fill ADI components */
  initialComponents?: string;
  /** Pre-fill JSON targets */
  initialTargets?: string;
  /** Called when a simulation completes (for React Flow parent to store result) */
  onResult?: (netlist: string, passed: boolean) => void;
  /** Compact mode — hide netlist tab, shrink waveform area (for small canvas nodes) */
  compact?: boolean;
}

export default function LTspiceNode({
  initialDescription = '',
  initialComponents = '',
  initialTargets = '',
  onResult,
  compact = false,
}: LTspiceNodeProps) {
  const {
    run, cancel, status, iterations, currentNetlist,
    currentIteration, finalWaveforms, summary, passed, errorMessage,
  } = useLTspiceAgent();

  const [description, setDescription] = useState(initialDescription);
  const [components, setComponents] = useState(initialComponents);
  const [targetsJson, setTargetsJson] = useState(initialTargets);
  const [activeTab, setActiveTab] = useState<'waveform' | 'netlist'>('waveform');
  const [selectedIteration, setSelectedIteration] = useState<number | null>(null);

  const isRunning = status === 'thinking' || status === 'simulating' || status === 'analyzing';
  const cfg = STATUS_CONFIG[status];

  const handleRun = async () => {
    let targets: Record<string, unknown> = {};
    if (targetsJson.trim()) {
      try { targets = JSON.parse(targetsJson); }
      catch { return; /* invalid JSON — ignore */ }
    }
    const componentList = components.split(',').map(s => s.trim()).filter(Boolean);

    await run({ description, components: componentList, targets });
    if (onResult && status === 'done') onResult(currentNetlist, passed);
  };

  // Which iteration's data to display
  const displayEntry =
    selectedIteration !== null
      ? iterations.find(e => e.iteration === selectedIteration) ?? null
      : iterations[iterations.length - 1] ?? null;

  const displayWaveforms = displayEntry?.waveforms ?? finalWaveforms;
  const displayNetlist = displayEntry?.netlist ?? currentNetlist;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13,
      color: 'var(--adi-gray-900, #111)',
    }}>
      {/* ── Input form ──────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        {/* Status indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
        }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>LTspice Agent</span>
          <span style={{
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
            color: cfg.color,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: cfg.color,
              animation: isRunning ? 'ltspice-pulse 1s ease-in-out infinite' : 'none',
              display: 'inline-block',
            }} />
            {cfg.label}
            {isRunning && currentIteration > 0 && ` (iter ${currentIteration})`}
          </span>
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the circuit… e.g. Buck converter, Vin=12V, Vout=3.3V, 500mA"
          rows={compact ? 2 : 3}
          disabled={isRunning}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '6px 8px', borderRadius: 5, resize: 'vertical',
            border: '1px solid #d1d5db', fontSize: 12,
            fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 8,
            background: isRunning ? '#f9fafb' : '#fff',
          }}
        />

        {!compact && (
          <>
            {/* ADI components */}
            <input
              type="text"
              value={components}
              onChange={e => setComponents(e.target.value)}
              placeholder="ADI parts (comma-separated): LT8610, LTC3780…"
              disabled={isRunning}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '6px 8px', borderRadius: 5,
                border: '1px solid #d1d5db', fontSize: 12,
                fontFamily: 'inherit', marginBottom: 8,
                background: isRunning ? '#f9fafb' : '#fff',
              }}
            />

            {/* Targets */}
            <textarea
              value={targetsJson}
              onChange={e => setTargetsJson(e.target.value)}
              placeholder={'Design targets (JSON):\n{"Vout": 3.3, "ripple_mV": 10}'}
              rows={2}
              disabled={isRunning}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '6px 8px', borderRadius: 5, resize: 'vertical',
                border: '1px solid #d1d5db', fontSize: 11,
                fontFamily: 'monospace', lineHeight: 1.5, marginBottom: 8,
                background: isRunning ? '#f9fafb' : '#fff',
              }}
            />
          </>
        )}

        {/* Run / Cancel */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={isRunning ? cancel : handleRun}
            disabled={!isRunning && !description.trim()}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 5, border: 'none',
              fontWeight: 600, fontSize: 12, cursor: 'pointer',
              background: isRunning ? '#fef2f2' : (!description.trim() ? '#e5e7eb' : '#0066cc'),
              color: isRunning ? '#dc2626' : (!description.trim() ? '#9ca3af' : '#fff'),
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {isRunning ? (
              <>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  border: '2px solid rgba(220,38,38,0.3)',
                  borderTopColor: '#dc2626',
                  animation: 'ltspice-spin 0.8s linear infinite',
                  display: 'inline-block',
                }} />
                Cancel
              </>
            ) : (
              <>▶ Run Simulation</>
            )}
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {errorMessage && (
        <div style={{
          padding: '8px 16px', background: '#fef2f2',
          borderBottom: '1px solid #fca5a5', fontSize: 12, color: '#991b1b',
        }}>
          {errorMessage}
        </div>
      )}

      {/* ── Summary banner ──────────────────────────────────────────────── */}
      {summary && (
        <div style={{
          padding: '8px 16px',
          background: passed ? '#f0fdf4' : '#fffbeb',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 12,
          color: passed ? '#166534' : '#92400e',
        }}>
          <span style={{ fontWeight: 600 }}>{passed ? '✓ Targets met — ' : '⚠ Best result — '}</span>
          {summary}
        </div>
      )}

      {/* ── Iteration log + results ─────────────────────────────────────── */}
      {iterations.length > 0 && (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Iteration selector */}
          <div style={{
            width: 80, flexShrink: 0, borderRight: '1px solid #e5e7eb',
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {iterations.map(entry => (
              <button
                key={entry.iteration}
                onClick={() => setSelectedIteration(
                  selectedIteration === entry.iteration ? null : entry.iteration
                )}
                style={{
                  padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: 11,
                  textAlign: 'center', borderBottom: '1px solid #f3f4f6',
                  background:
                    (selectedIteration ?? iterations[iterations.length - 1]?.iteration) === entry.iteration
                      ? '#0066cc'
                      : 'transparent',
                  color:
                    (selectedIteration ?? iterations[iterations.length - 1]?.iteration) === entry.iteration
                      ? '#fff'
                      : '#374151',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}
              >
                <span style={{ fontWeight: 700 }}>#{entry.iteration}</span>
                {entry.passed && <span style={{ fontSize: 9, color: '#16a34a' }}>PASS</span>}
                {!entry.waveforms && entry.analysis && <span style={{ fontSize: 9, color: '#dc2626' }}>ERR</span>}
              </button>
            ))}
          </div>

          {/* Tabs + content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Tab bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
              {(['waveform', 'netlist'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '6px 12px', fontSize: 11, fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: activeTab === tab ? '#0066cc' : '#6b7280',
                    borderBottom: activeTab === tab ? '2px solid #0066cc' : '2px solid transparent',
                    textTransform: 'capitalize',
                    marginBottom: -1,
                  }}
                >
                  {tab === 'waveform' ? 'Waveforms' : 'Netlist'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
              {activeTab === 'waveform' && (
                displayWaveforms
                  ? <div style={{ height: compact ? 160 : 240 }}>
                      <WaveformViewer data={displayWaveforms} />
                    </div>
                  : <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', paddingTop: 32 }}>
                      {isRunning ? 'Waiting for simulation…' : 'No waveforms yet.'}
                    </div>
              )}

              {activeTab === 'netlist' && (
                <pre style={{
                  margin: 0, padding: 10, borderRadius: 6,
                  background: '#f8fafc', border: '1px solid #e5e7eb',
                  fontSize: 11, lineHeight: 1.6, overflowX: 'auto',
                  fontFamily: 'monospace', color: '#1e293b',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {displayNetlist || '— no netlist —'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {iterations.length === 0 && !isRunning && !errorMessage && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af', gap: 8, padding: 24, textAlign: 'center',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span style={{ fontSize: 12 }}>Describe a circuit and click Run</span>
        </div>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes ltspice-spin { to { transform: rotate(360deg); } }
        @keyframes ltspice-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
