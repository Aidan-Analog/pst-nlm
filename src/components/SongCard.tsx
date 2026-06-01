import type { Song } from '../types/setlist';

interface Props {
  song: Song;
}

export default function SongCard({ song }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      padding: '14px 0',
      borderBottom: '1px solid #f0f0f0',
    }}>
      <span style={{
        minWidth: 32,
        height: 32,
        borderRadius: '50%',
        background: '#1a1a2e',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
        marginTop: 1,
      }}>
        {song.position}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#1a1a2e', lineHeight: 1.3 }}>
          {song.title}
        </div>
        {song.notes && (
          <div style={{ fontSize: 13, color: '#666', marginTop: 3, fontStyle: 'italic' }}>
            {song.notes}
          </div>
        )}
      </div>
    </div>
  );
}
