/**
 * LTspice Workbench — CXR (Customer Experience Reimagination) prototype
 *
 * This is the state-owning shell for the Workbench.
 * The visual layout will be replaced/enhanced by the Figma Make export
 * from the CXR-Interaction-Model project once it is available.
 *
 * Architecture:
 *   <Workbench> manages all state and calls the /api/ltspice-agent endpoint.
 *   The Figma Make components will receive data via props and fire callbacks.
 */

import { useState, useCallback } from 'react';
import Header from '../components/Header';
import WaveformViewer, { type WaveformData } from '../components/Workbench/WaveformViewer';

// ---------------------------------------------------------------------------
// Types (mirrors server/ltspice-agent.ts)
// ---------------------------------------------------------------------------

interface IterationEntry {
  iteration: number;
  netlist: string;
  waveforms: WaveformData | null;
  analysis: string;
  passed: boolean;
}

interface AgentResult {
  iterations: IterationEntry[];
  finalNetlist: string;
  finalWaveforms: WaveformData | null;
  summary: string;
  passed: boolean;
}

// ---------------------------------------------------------------------------
// Sub-components (CXR Figma Make slots)
// ---------------------------------------------------------------------------

/** Left panel: circuit input form */
function CircuitInputPanel({
  description,
  targets,
  components,
  serverStatus,
  onDescriptionChange,
  onTargetsChange,
  onComponentsChange,
  onRun,
  loading,
}: {
  description: string;
  targets: string;
  components: string;
  serverStatus: 'unknown' | 'online' | 'offline';
  onDescriptionChange: (v: string) => void;
  onTargetsChange: (v: string) => void;
  onComponentsChange: (v: string) => void;
  onRun: () => void;
  loading: boolean;
}) {
  const statusColor =
    serverStatus === 'online' ? '#00875a' : serverStatus === 'offline' ? '#c0392b' : '#888';
  const statusLabel =
    serverStatus === 'online' ? 'LTspice online' : serverStatus === 'offline' ? 'LTspice offline' : 'Checking...';

  return (
    <div style={{
      width: 320, flexShrink: 0, borderRight: '1px solid var(--adi-gray-200)',
      display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '16px 20px 12px', borderBottom: '1px solid var(--adi-gray-200)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--adi-gray-900)' }}>
          Circuit Design
        </span>
        <span style={{
          fontSize: 11, color: statusColor,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: statusColor, display: 'inline-block',
          }} />
          {statusLabel}
        </span>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Description */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--adi-gray-700)', display: 'block', marginBottom: 6 }}>
            Circuit Description
          </label>
          <textarea
            value={description}
            onChange={e => onDescriptionChange(e.target.value)}
            placeholder="e.g. Buck converter, Vin=12V, Vout=3.3V, Iload=500mA, switching frequency 400kHz"
            rows={4}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, resize: 'vertical',
              border: '1px solid var(--adi-gray-300)', fontSize: 13, fontFamily: 'inherit',
              color: 'var(--adi-gray-900)', lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Design targets */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--adi-gray-700)', display: 'block', marginBottom: 6 }}>
            Design Targets <span style={{ fontWeight: 400, color: 'var(--adi-gray-500)' }}>(JSON)</span>
          </label>
          <textarea
            value={targets}
            onChange={e => onTargetsChange(e.target.value)}
            placeholder={'{\n  "Vout": 3.3,\n  "ripple_mV": 10\n}'}
            rows={4}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6, resize: 'vertical',
              border: '1px solid var(--adi-gray-300)', fontSize: 12,
              fontFamily: 'monospace', color: 'var(--adi-gray-900)',
              lineHeight: 1.5, boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ADI components */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--adi-gray-700)', display: 'block', marginBottom: 6 }}>
            ADI Components <span style={{ fontWeight: 400, color: 'var(--adi-gray-500)' }}>(comma-separated part #s)</span>
          </label>
          <input
            type="text"
            value={components}
            onChange={e => onComponentsChange(e.target.value)}
            placeholder="e.g. LT8610, LTC3780"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 6,
              border: '1px solid var(--adi-gray-300)', fontSize: 13,
              color: 'var(--adi-gray-900)', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Run button */}
        <button
          onClick={onRun}
          disabled={loading || !description.trim()}
          style={{
            padding: '10px 0', borderRadius: 6, border: 'none',
            background: loading || !description.trim() ? 'var(--adi-gray-300)' : 'var(--adi-blue)',
            color: '#fff', fontWeight: 600, fontSize: 14,
            cursor: loading || !description.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: 14, height: 14, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff', display: 'inline-block',
                animation: 'spin 0.8s linear infinite',
              }} />
              Simulating...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Run Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** Iteration entry row in the log */
function IterationRow({
  entry,
  active,
  onClick,
}: {
  entry: IterationEntry;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', padding: '10px 16px',
        background: active ? 'var(--adi-blue)' : 'transparent',
        color: active ? '#fff' : 'var(--adi-gray-700)',
        border: 'none', borderBottom: '1px solid var(--adi-gray-200)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: entry.passed ? '#00875a' : active ? 'rgba(255,255,255,0.2)' : 'var(--adi-gray-200)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
        color: entry.passed ? '#fff' : active ? '#fff' : 'var(--adi-gray-500)',
      }}>
        {entry.iteration}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500 }}>Iteration {entry.iteration}</span>
      {entry.passed && (
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          color: active ? '#fff' : '#00875a',
        }}>
          PASS
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Workbench page
// ---------------------------------------------------------------------------

export default function Workbench() {
  const [description, setDescription] = useState('');
  const [targetsJson, setTargetsJson] = useState('');
  const [components, setComponents] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIteration, setSelectedIteration] = useState<number>(0);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [activeTab, setActiveTab] = useState<'waveform' | 'netlist'>('waveform');

  // Check LTspice server status on mount
  useState(() => {
    fetch('/api/ltspice/status')
      .then(r => r.json())
      .then((d: { ok: boolean }) => setServerStatus(d.ok ? 'online' : 'offline'))
      .catch(() => setServerStatus('offline'));
  });

  const handleRun = useCallback(async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    let targets: Record<string, unknown> = {};
    if (targetsJson.trim()) {
      try {
        targets = JSON.parse(targetsJson);
      } catch {
        setError('Design targets is not valid JSON. Please fix and retry.');
        setLoading(false);
        return;
      }
    }

    const componentList = components
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      const resp = await fetch('/api/ltspice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          components: componentList,
          targets,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json() as { error?: string };
        throw new Error(err.error ?? `Server error ${resp.status}`);
      }

      const data = await resp.json() as AgentResult;
      setResult(data);
      setSelectedIteration(data.iterations.length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [description, targetsJson, components]);

  const currentIteration = result?.iterations[selectedIteration] ?? null;
  const displayWaveforms = currentIteration?.waveforms ?? result?.finalWaveforms ?? null;
  const displayNetlist = currentIteration?.netlist ?? result?.finalNetlist ?? '';

  return (
    <>
      {/* Spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
        <Header />

        {/* Workbench sub-header */}
        <div style={{
          background: '#fff', borderBottom: '1px solid var(--adi-gray-200)',
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <a
            href="/"
            style={{ fontSize: 13, color: 'var(--adi-blue)', textDecoration: 'none' }}
          >
            ← PST
          </a>
          <span style={{ color: 'var(--adi-gray-300)' }}>|</span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--adi-gray-900)' }}>
            LTspice Workbench
          </h1>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4,
            background: 'var(--adi-gray-100)', color: 'var(--adi-gray-600)',
            fontWeight: 500,
          }}>
            CXR Prototype
          </span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left: input panel */}
          <CircuitInputPanel
            description={description}
            targets={targetsJson}
            components={components}
            serverStatus={serverStatus}
            onDescriptionChange={setDescription}
            onTargetsChange={setTargetsJson}
            onComponentsChange={setComponents}
            onRun={handleRun}
            loading={loading}
          />

          {/* Right: results area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Error banner */}
            {error && (
              <div style={{
                padding: '10px 20px', background: '#fef2f2', borderBottom: '1px solid #fca5a5',
                color: '#991b1b', fontSize: 13,
              }}>
                {error}
              </div>
            )}

            {/* Summary banner */}
            {result && (
              <div style={{
                padding: '10px 20px', background: result.passed ? '#f0fdf4' : '#fffbeb',
                borderBottom: '1px solid var(--adi-gray-200)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  fontWeight: 600, fontSize: 12,
                  color: result.passed ? '#166534' : '#92400e',
                }}>
                  {result.passed ? 'TARGETS MET' : 'BEST RESULT'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--adi-gray-700)' }}>
                  {result.summary}
                </span>
              </div>
            )}

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
              {/* Iteration log (left of results) */}
              {result && result.iterations.length > 0 && (
                <div style={{
                  width: 180, flexShrink: 0, borderRight: '1px solid var(--adi-gray-200)',
                  overflowY: 'auto',
                }}>
                  <div style={{
                    padding: '10px 16px', fontSize: 11, fontWeight: 600,
                    color: 'var(--adi-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--adi-gray-200)',
                  }}>
                    Iterations
                  </div>
                  {result.iterations.map((entry, i) => (
                    <IterationRow
                      key={entry.iteration}
                      entry={entry}
                      active={selectedIteration === i}
                      onClick={() => setSelectedIteration(i)}
                    />
                  ))}
                </div>
              )}

              {/* Waveform / Netlist tabs */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Tabs */}
                <div style={{
                  display: 'flex', borderBottom: '1px solid var(--adi-gray-200)',
                  padding: '0 20px',
                }}>
                  {(['waveform', 'netlist'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        padding: '10px 16px', fontSize: 13, fontWeight: 500,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: activeTab === tab ? 'var(--adi-blue)' : 'var(--adi-gray-500)',
                        borderBottom: activeTab === tab ? '2px solid var(--adi-blue)' : '2px solid transparent',
                        marginBottom: -1,
                        textTransform: 'capitalize',
                      }}
                    >
                      {tab === 'waveform' ? 'Waveforms' : 'Netlist'}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
                  {!result && !loading && (
                    <EmptyState />
                  )}

                  {loading && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', height: '100%', gap: 16, color: 'var(--adi-gray-500)',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        border: '3px solid var(--adi-gray-200)',
                        borderTopColor: 'var(--adi-blue)',
                        animation: 'spin 0.8s linear infinite',
                      }} />
                      <span style={{ fontSize: 14 }}>Agent is simulating your circuit...</span>
                    </div>
                  )}

                  {result && activeTab === 'waveform' && (
                    displayWaveforms ? (
                      <div style={{ height: 360 }}>
                        <WaveformViewer data={displayWaveforms} />
                      </div>
                    ) : (
                      <div style={{ color: 'var(--adi-gray-500)', fontSize: 13 }}>
                        No waveform data for this iteration.
                      </div>
                    )
                  )}

                  {result && activeTab === 'netlist' && (
                    <pre style={{
                      margin: 0, padding: 16, borderRadius: 8,
                      background: 'var(--adi-gray-50)', border: '1px solid var(--adi-gray-200)',
                      fontSize: 12, lineHeight: 1.6, overflowX: 'auto',
                      fontFamily: 'monospace', color: 'var(--adi-gray-800)',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    }}>
                      {displayNetlist || '— no netlist —'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12,
      color: 'var(--adi-gray-400)', textAlign: 'center',
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--adi-gray-600)' }}>
        No simulation yet
      </div>
      <div style={{ fontSize: 13, maxWidth: 280 }}>
        Describe your circuit on the left and click Run Simulation.
        The LTspice agent will generate a SPICE netlist, run it, and show waveforms here.
      </div>
    </div>
  );
}
