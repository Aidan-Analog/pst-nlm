interface BreadcrumbProps {
  items: { label: string; href?: string }[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav style={{ fontSize: '13px', color: 'var(--adi-gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {i > 0 && <span style={{ color: 'var(--adi-gray-400)' }}>/</span>}
          {item.href && i < items.length - 1 ? (
            <a
              href={item.href}
              style={{ color: 'var(--adi-blue)', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              {item.label}
            </a>
          ) : (
            <span style={{ color: i === items.length - 1 ? 'var(--adi-gray-700)' : 'var(--adi-gray-500)' }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
