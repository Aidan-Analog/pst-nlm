import { useState, useEffect } from 'react';
import type { Setlist } from '../types/setlist';
import SongCard from '../components/SongCard';

export default function SetlistView() {
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/setlist')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Setlist | null) => {
        setSetlist(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const totalSongs = setlist?.sets.reduce((n, s) => n + s.songs.length, 0) ?? 0;

  if (loading) {
    return (
      <div style={page}>
        <div style={header}>
          <div style={headerTitle}>Setlist</div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={page}>
        <div style={header}>
          <div style={headerTitle}>Setlist</div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#c0392b' }}>
          Could not load setlist: {error}
        </div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div style={page}>
        <div style={header}>
          <div style={headerTitle}>Setlist</div>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#999' }}>
          No setlist published yet.
        </div>
      </div>
    );
  }

  const publishedDate = new Date(setlist.created_at).toLocaleDateString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div style={page}>
      <div style={header}>
        <div style={headerTitle}>{setlist.gig_name ?? 'Setlist'}</div>
        {setlist.gig_date && (
          <div style={headerSub}>
            {new Date(setlist.gig_date + 'T00:00:00').toLocaleDateString('en-IE', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </div>
        )}
        <div style={headerMeta}>{totalSongs} songs · updated {publishedDate}</div>
      </div>

      {setlist.gig_folder_url && (
        <div style={{ padding: '14px 20px', background: '#f0f4ff', borderBottom: '1px solid #dde4f5' }}>
          <a
            href={setlist.gig_folder_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#1a1a2e',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Open sheet music in Drive →
          </a>
        </div>
      )}

      <div style={{ padding: '0 20px 40px' }}>
        {setlist.sets.map((set, i) => (
          <div key={i} style={{ marginTop: 28 }}>
            {setlist.sets.length > 1 && (
              <div style={setLabel}>{set.label}</div>
            )}
            {set.songs.map(song => (
              <SongCard key={song.position} song={song} />
            ))}
          </div>
        ))}
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

const headerTitle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: -0.5,
};

const headerSub: React.CSSProperties = {
  fontSize: 15,
  marginTop: 4,
  opacity: 0.85,
};

const headerMeta: React.CSSProperties = {
  fontSize: 12,
  marginTop: 8,
  opacity: 0.55,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const setLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '#888',
  marginBottom: 4,
  paddingBottom: 8,
  borderBottom: '2px solid #1a1a2e',
};
