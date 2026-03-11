export default function Header() {
  return (
    <header>
      {/* Utility Bar */}
      <div
        className="adi-utility-bar flex items-center justify-end px-8"
        style={{ background: 'var(--adi-navy)', height: '32px', color: '#fff', fontSize: '12px' }}
      >
        <div className="flex items-center gap-4" style={{ marginRight: 'auto', marginLeft: 'auto', maxWidth: '1248px', width: '100%', justifyContent: 'flex-end' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a0b4c8' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            English
          </span>
          <span style={{ color: '#a0b4c8' }}>USD</span>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
          <div className="flex items-center gap-1" style={{ color: '#a0b4c8' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span style={{ color: '#fff', fontWeight: 500 }}>myAnalog</span>
          </div>
          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
          <span style={{ color: '#a0b4c8' }}>
            <a href="#" style={{ color: '#fff', fontWeight: 500 }}>Log In</a>
            {' | '}
            <a href="#" style={{ color: '#fff' }}>Sign up</a>
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav
        style={{
          background: '#fff',
          borderBottom: '1px solid var(--adi-gray-200)',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '1248px',
            width: '100%',
            margin: '0 auto',
            padding: '0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* ADI Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="120" height="36" viewBox="0 0 120 36" fill="none">
              <rect width="36" height="36" rx="2" fill="var(--adi-navy)"/>
              <text x="4" y="26" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="22" fill="white">ADI</text>
              <text x="42" y="16" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="10" fill="var(--adi-navy)">ANALOG</text>
              <text x="42" y="28" fontFamily="Inter,sans-serif" fontWeight="700" fontSize="10" fill="var(--adi-navy)">DEVICES</text>
            </svg>
          </div>

          {/* Nav Items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {['Products', 'Software', 'Design Resources', 'Solutions', 'About Us'].map(item => (
              <a
                key={item}
                href="#"
                style={{
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--adi-gray-700)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 4,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--adi-blue)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--adi-gray-700)')}
              >
                {item}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </a>
            ))}
            {['Software', 'Software'].map((item, i) => (
              <a
                key={i}
                href="#"
                style={{ padding: '8px 12px', fontSize: '14px', fontWeight: 500, color: 'var(--adi-gray-700)', borderRadius: 4 }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* Search + Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--adi-gray-700)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--adi-gray-700)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
