import { OG_COLORS } from '@/lib/constants'

// Shared chrome for the Open Graph images. Satori renders a small flexbox subset with no class
// names and no CSS variables, so these are plain inline styles rather than the app's Tailwind
// tokens -- see OG_COLORS. Every element carries an explicit `display`, which Satori requires.
export function OgFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        backgroundColor: OG_COLORS.paper,
        borderBottom: `16px solid ${OG_COLORS.purple}`
      }}
    >
      {children}
    </div>
  )
}

export function OgWordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5 }}>
        {[14, 26, 38].map((height) => (
          <div
            key={height}
            style={{ width: 9, height, borderRadius: 2, backgroundColor: OG_COLORS.ink }}
          />
        ))}
      </div>
      <div style={{ display: 'flex', fontSize: 34, fontWeight: 600, color: OG_COLORS.ink }}>
        Hunch
      </div>
    </div>
  )
}

export function OgStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '20px 28px',
        border: `2px solid ${OG_COLORS.rule}`,
        borderRadius: 12
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 20,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: OG_COLORS.mutedForeground
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', fontSize: 46, fontWeight: 700, color: accent }}>{value}</div>
    </div>
  )
}
