import { useState, useRef, useEffect } from 'react';
import type { CompanionMessage } from '../types/product';

interface Props {
  messages: CompanionMessage[];
  loading: boolean;
  onSend: (query: string) => void;
  onClearFilters: () => void;
}

export default function PSTCompanion({ messages, loading, onSend, onClearFilters }: Props) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = () => {
    const q = input.trim();
    if (!q || loading) return;
    onSend(q);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat history */}
      {messages.length > 0 && (
        <div style={{
          flex: 1, overflowY: 'auto', padding: '8px 0', marginBottom: 8,
          maxHeight: 300,
        }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: msg.role === 'user' ? 'var(--adi-blue-light)' : 'var(--adi-gray-50)',
                border: `1px solid ${msg.role === 'user' ? '#c3d9f7' : 'var(--adi-gray-200)'}`,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {msg.role === 'user' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adi-blue)', whiteSpace: 'nowrap', paddingTop: 1 }}>You</span>
                  <span style={{ color: 'var(--adi-gray-700)' }}>{msg.content}</span>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: msg.filters && msg.filters.length > 0 ? 6 : 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adi-teal)', whiteSpace: 'nowrap', paddingTop: 1 }}>PST</span>
                    <span style={{ color: 'var(--adi-gray-700)' }}>{msg.content}</span>
                  </div>
                  {msg.filters && msg.filters.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {msg.filters.map((f, fi) => (
                        <span key={fi} style={{
                          fontSize: 11, padding: '2px 8px', borderRadius: 4,
                          background: 'var(--adi-teal-light)', color: 'var(--adi-teal)', fontWeight: 500,
                        }}>
                          {f.column} {f.operator} {String(f.value)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--adi-gray-50)', border: '1px solid var(--adi-gray-200)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--adi-teal)' }}>PST</span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[0, 1, 2].map(d => (
                    <div key={d} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--adi-blue)',
                      animation: `pulse 1.2s ${d * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Clear filters button */}
      {messages.length > 0 && (
        <button
          onClick={onClearFilters}
          style={{
            background: 'none', border: '1px solid var(--adi-gray-300)',
            borderRadius: 6, padding: '4px 10px', fontSize: 12,
            cursor: 'pointer', color: 'var(--adi-gray-500)',
            marginBottom: 8, alignSelf: 'flex-start',
          }}
        >
          ✕ Clear AI filters
        </button>
      )}

      {/* Input area */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          className="companion-input"
          placeholder="Ask PST Companion"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={loading}
        />
        {/* Bottom row inside textarea */}
        <div style={{
          position: 'absolute', bottom: 8, left: 10, right: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Auto badge */}
          <button style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'none', border: '1px solid var(--adi-gray-300)',
            borderRadius: 999, padding: '2px 10px',
            fontSize: 12, cursor: 'pointer', color: 'var(--adi-gray-600)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Auto
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: input.trim() && !loading ? 'var(--adi-blue)' : 'var(--adi-gray-300)',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Privacy disclaimer */}
      <p style={{ fontSize: 11, color: 'var(--adi-gray-400)', margin: '8px 0 0', lineHeight: 1.5 }}>
        This program uses AI, which can make mistakes. Please be sure to check for accuracy.
        For details, see our{' '}
        <a href="#" style={{ color: 'var(--adi-blue)' }}>privacy policy</a>.
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
