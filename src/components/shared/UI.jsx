// ── Layout ───────────────────────────────────────────────
export const Card = ({ children, style }) => (
  <div style={{
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '16px 20px', marginBottom: 14, ...style
  }}>{children}</div>
)

export const CardTitle = ({ children }) => (
  <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14, color: 'var(--text)' }}>{children}</div>
)

export const PageTitle = ({ children }) => (
  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>{children}</div>
)

// ── Metrics ──────────────────────────────────────────────
export const MetricsGrid = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
    {children}
  </div>
)

export const Metric = ({ label, value, color }) => {
  const colors = { green: '#0F6E56', red: '#993C1D', blue: '#185FA5', amber: '#854F0B', orange: '#E65100', teal: '#00695C' }
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: colors[color] || 'var(--text)' }}>{value}</div>
    </div>
  )
}

// ── Form ─────────────────────────────────────────────────
export const FormRow = ({ children, style }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10, ...style }}>{children}</div>
)

export const FG = ({ label, note, children, style }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 90, ...style }}>
    {label && <label style={{ fontSize: 12, color: 'var(--text2)' }}>{label}</label>}
    {children}
    {note && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{note}</span>}
  </div>
)

const inputStyle = {
  height: 36, padding: '0 10px', borderRadius: 8,
  border: '1px solid var(--border2)', background: 'var(--bg)',
  color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', width: '100%',
}

export const Input = ({ label, note, fg, ...props }) =>
  label || note ? (
    <FG label={label} note={note} style={fg}>
      <input style={{ ...inputStyle, ...(props.readOnly ? { background: 'var(--bg2)', cursor: 'default' } : {}), ...(props.style || {}) }} {...props} />
    </FG>
  ) : (
    <input style={{ ...inputStyle, ...(props.readOnly ? { background: 'var(--bg2)', cursor: 'default' } : {}), ...(props.style || {}) }} {...props} />
  )

export const Select = ({ label, note, fg, children, ...props }) =>
  label || note ? (
    <FG label={label} note={note} style={fg}>
      <select style={{ ...inputStyle, ...(props.style || {}) }} {...props}>{children}</select>
    </FG>
  ) : (
    <select style={{ ...inputStyle, ...(props.style || {}) }} {...props}>{children}</select>
  )

// ── Buttons ───────────────────────────────────────────────
export const Btn = ({ children, primary, sm, lg, danger, onClick, style, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      height: lg ? 42 : sm ? 30 : 36,
      padding: lg ? '0 28px' : sm ? '0 12px' : '0 16px',
      fontSize: lg ? 15 : sm ? 13 : 14,
      borderRadius: 8,
      border: danger ? '1px solid #993C1D' : '1px solid var(--border2)',
      background: primary ? 'var(--text)' : danger ? '#FAECE7' : 'transparent',
      color: primary ? 'var(--bg)' : danger ? '#993C1D' : 'var(--text)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      whiteSpace: 'nowrap', fontFamily: 'inherit', ...style,
    }}
  >{children}</button>
)

export const DelBtn = ({ onClick, title = 'Remover' }) => (
  <button onClick={onClick} title={title}
    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', opacity: 0.6 }}>
    🗑
  </button>
)

export const EditBtn = ({ onClick }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', opacity: 0.6 }}>✏️</button>
)

// ── Badge ─────────────────────────────────────────────────
const badgeColors = {
  green:  { bg: '#E1F5EE', fg: '#0F6E56' },
  red:    { bg: '#FAECE7', fg: '#993C1D' },
  amber:  { bg: '#FAEEDA', fg: '#854F0B' },
  blue:   { bg: '#E6F1FB', fg: '#185FA5' },
  purple: { bg: '#F0EAFB', fg: '#5B35B5' },
  gray:   { bg: 'var(--bg2)', fg: 'var(--text2)' },
  teal:   { bg: '#E0F2F1', fg: '#00695C' },
  tab1:   { bg: '#FFF3E0', fg: '#E65100' },
  tab2:   { bg: '#E8F5E9', fg: '#2E7D32' },
}

export const Badge = ({ label, color = 'gray' }) => {
  const c = badgeColors[color] || badgeColors.gray
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg,
    }}>{label}</span>
  )
}

// ── Info box ──────────────────────────────────────────────
const infoBoxColors = {
  blue:   { bg: '#E6F1FB', fg: '#185FA5' },
  amber:  { bg: '#FAEEDA', fg: '#854F0B' },
  green:  { bg: '#E1F5EE', fg: '#0F6E56' },
  orange: { bg: '#FFF3E0', fg: '#E65100' },
  purple: { bg: '#F0EAFB', fg: '#5B35B5' },
}

export const InfoBox = ({ color = 'blue', children, style }) => {
  const c = infoBoxColors[color] || infoBoxColors.blue
  return (
    <div style={{
      background: c.bg, color: c.fg, borderRadius: 8,
      padding: '10px 14px', fontSize: 13, marginBottom: 12,
      display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.5, ...style
    }}>{children}</div>
  )
}

// ── Table ─────────────────────────────────────────────────
export const TH = ({ children, right }) => (
  <th style={{
    textAlign: right ? 'right' : 'left', fontSize: 12, fontWeight: 500,
    color: 'var(--text2)', padding: '6px 8px', borderBottom: '1px solid var(--border)',
  }}>{children}</th>
)

export const TD = ({ children, right, bold, color, secondary }) => (
  <td style={{
    padding: '10px 8px', borderBottom: '1px solid var(--border)',
    textAlign: right ? 'right' : 'left', fontWeight: bold ? 600 : 'normal',
    color: color || (secondary ? 'var(--text2)' : 'var(--text)'),
    verticalAlign: 'middle', fontSize: 13,
  }}>{children}</td>
)

export const EmptyState = ({ children }) => (
  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '2.5rem 0' }}>{children}</div>
)

// ── Loading ───────────────────────────────────────────────
export const Loading = () => (
  <div style={{ textAlign: 'center', color: 'var(--text3)', padding: '3rem 0', fontSize: 14 }}>
    Carregando...
  </div>
)
