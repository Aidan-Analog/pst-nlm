import { useState } from 'react';
import type { ParsedSetlist } from '../types/setlist';
import SongCard from '../components/SongCard';

type Phase = 'input' | 'preview' | 'published';

export default function SetlistAdmin() {
  const [phase, setPhase] = useState<Phase>('input');
  const [rawText, setRawText] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [parsed, setParsed] = useState<ParsedSetlist | null>(null);
  const [gigName, setGigName] = useState('');
  const [gigDate, setGigDate] = useState('');
  const [parsing, setParsing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!rawText.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const r = await fetch('/api/setlist-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      const data: ParsedSetlist = await r.json();
      setParsed(data);
      setGigName(data.gigName ?? '');
      setGigDate(data.gigDate ?? '');
      setPhase('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parse failed');
    } finally {
      setParsing(false);
    }
  }

  async function handlePublish() {
    if (!parsed) return;
    setPublishing(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (passphrase) headers['x-setlist-passphrase'] = passphrase;

      const r = await fetch('/api/setlist', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          gigName: gigName || null,
          gigDate: gigDate || null,
          rawText,
          sets: parsed.sets,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      setPhase('published');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  const totalSongs = parsed?.sets.reduce((n, s) => n + s.songs.length, 0) ?? 0;

  return (
    <div style={page}>
      <div style={header}>
        <div style={headerTitle}>Publish Setlist</div>
        <div style={headerSub}>Paste Gerry&rsquo;s WhatsApp message</div>
      </div>

      <div style={{ padding: '20px' }}>

        {/* ── INPUT PHASE ── */}
        {phase === 'input' && (
          <>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`SET 1\n1. Come Together\n2. Superstition\n\nSET 2\n3. Brown Eyed Girl`}
              rows={12}
              style={textarea}
            />
            <input
              type="password"
              placeholder="Passphrase (if required)"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              style={{ ...inputField, marginTop: 10 }}
            />
            {error && <div style={errorBox}>{error}</div>}
            <button
              onClick={handleParse}
              disabled={parsing || !rawText.trim()}
              style={primaryBtn(parsing || !rawText.trim())}
            >
              {parsing ? 'Parsing…' : 'Parse Setlist →'}
            </button>
          </>
        )}

        {/* ── PREVIEW PHASE ── */}
        {phase === 'preview' && parsed && (
          <>
            <div style={previewHeader}>
              <span style={{ fontWeight: 600, color: '#1a1a2e' }}>
                {totalSongs} songs parsed
              </span>
              <button onClick={() => setPhase('input')} style={ghostBtn}>
                ← Edit
              </button>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={fieldLabel}>Gig name</label>
                <input
                  value={gigName}
                  onChange={e => setGigName(e.target.value)}
                  placeholder="e.g. The Grand Social"
                  style={inputField}
                />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={fieldLabel}>Gig date</label>
                <input
                  type="date"
                  value={gigDate}
                  onChange={e => setGigDate(e.target.value)}
                  style={inputField}
                />
              </div>
            </div>

            {parsed.sets.map((set, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                {parsed.sets.length > 1 && (
                  <div style={setLabel}>{set.label}</div>
                )}
                {set.songs.map(song => (
                  <SongCard key={song.position} song={song} />
                ))}
              </div>
            ))}

            {error && <div style={errorBox}>{error}</div>}
            <button
              onClick={handlePublish}
              disabled={publishing}
              style={primaryBtn(publishing)}
            >
              {publishing ? 'Publishing…' : 'Publish to Band ✓'}
            </button>
          </>
        )}

        {/* ── PUBLISHED PHASE ── */}
        {phase === 'published' && (
          <div style={{ textAlign: 'center', paddingTop: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>
              Setlist published!
            </div>
            <div style={{ color: '#666', marginBottom: 28, fontSize: 15 }}>
              Band members can now view it at:
            </div>
            <a
              href="/setlist"
              style={{
                display: 'inline-block',
                background: '#1a1a2e',
                color: '#fff',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 15,
              }}
            >
              View Setlist →
            </a>
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => { setPhase('input'); setRawText(''); setParsed(null); }}
                style={{ ...ghostBtn, display: 'inline-block' }}
              >
                Publish another setlist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#fafafa',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  maxWidth: 480,
  margin: '0 auto',
};

const header: React.CSSProperties = {
  background: '#1a1a2e',
  color: '#fff',
  padding: '28px 20px 22px',
};

const headerTitle: React.CSSProperties = { fontSize: 24, fontWeight: 700 };
const headerSub: React.CSSProperties = { fontSize: 14, marginTop: 4, opacity: 0.7 };

const textarea: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 15,
  fontFamily: 'monospace',
  resize: 'vertical',
  boxSizing: 'border-box',
  background: '#fff',
};

const inputField: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #ddd',
  fontSize: 14,
  boxSizing: 'border-box',
  background: '#fff',
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#888',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  marginTop: 16,
  padding: '14px',
  background: disabled ? '#ccc' : '#1a1a2e',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const ghostBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#555',
  cursor: 'pointer',
  fontSize: 14,
  padding: '4px 0',
  textDecoration: 'underline',
};

const errorBox: React.CSSProperties = {
  marginTop: 10,
  padding: '10px 14px',
  background: '#fdecea',
  color: '#c0392b',
  borderRadius: 6,
  fontSize: 14,
};

const previewHeader: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  paddingBottom: 12,
  borderBottom: '1px solid #eee',
};

const setLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '#888',
  paddingBottom: 8,
  marginBottom: 4,
  borderBottom: '2px solid #1a1a2e',
};
