// Settings: a thin UI over /system/de.json. Every control writes the file, so
// the UI and hand-editing the source are the same mechanism.

import { useState } from 'react'
import { kernel, defaultDe, type DeConfig } from '../kernel/kernel.ts'
import { useDe } from '../os/hooks.ts'
import { SHELLS } from '../de/registry.ts'

export function Settings() {
  const de = useDe()
  const [raw, setRaw] = useState(() => JSON.stringify(de, null, 2))
  const [status, setStatus] = useState('')

  const patch = (p: Partial<DeConfig>) => {
    kernel.setDe(p)
    setRaw(JSON.stringify(kernel.de, null, 2))
  }

  const patchTheme = (key: string, value: string) => patch({ theme: { [key]: value } })

  const applyRaw = () => {
    try {
      const parsed = JSON.parse(raw) as Partial<DeConfig>
      patch(parsed)
      setStatus('applied')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'invalid JSON')
    }
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 16, display: 'grid', gap: 18, fontSize: 13 }}>
      <section style={group}>
        <h3 style={h3}>Shell</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.keys(SHELLS).map((name) => (
            <button
              key={name}
              onClick={() => patch({ shell: name })}
              style={{ ...btn, background: de.shell === name ? 'var(--os-accent)' : 'transparent', color: de.shell === name ? '#0b0d12' : 'var(--os-text)' }}
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <section style={group}>
        <h3 style={h3}>Dock</h3>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['left', 'bottom', 'right', 'top', 'none'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => patch({ dock: pos })}
              style={{ ...btn, background: de.dock === pos ? 'var(--os-accent)' : 'transparent', color: de.dock === pos ? '#0b0d12' : 'var(--os-text)' }}
            >
              {pos}
            </button>
          ))}
        </div>
      </section>

      <section style={group}>
        <h3 style={h3}>Theme</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {Object.entries(de.theme).map(([key, value]) => (
            <label key={key} style={{ display: 'grid', gap: 4 }}>
              <span style={{ color: 'var(--os-muted)', fontSize: 11 }}>{key}</span>
              <input
                value={value}
                onChange={(e) => patchTheme(key, e.target.value)}
                style={input}
              />
            </label>
          ))}
        </div>
      </section>

      <section style={group}>
        <h3 style={h3}>Window</h3>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--os-muted)' }}>radius</span>
          <input
            type="number"
            min={0}
            max={40}
            value={de.window.radius}
            onChange={(e) => patch({ window: { ...de.window, radius: Number(e.target.value) } })}
            style={{ ...input, width: 80 }}
          />
          <label>
            <input
              type="checkbox"
              checked={de.window.blur}
              onChange={(e) => patch({ window: { ...de.window, blur: e.target.checked } })}
            />{' '}
            blur
          </label>
          <label>
            <input
              type="checkbox"
              checked={de.window.border}
              onChange={(e) => patch({ window: { ...de.window, border: e.target.checked } })}
            />{' '}
            border
          </label>
        </label>
      </section>

      <section style={group}>
        <h3 style={h3}>Wallpaper</h3>
        <textarea
          value={de.wallpaper}
          onChange={(e) => patch({ wallpaper: e.target.value })}
          rows={3}
          style={{ ...input, fontFamily: 'ui-monospace, monospace', resize: 'vertical' }}
          aria-label="Wallpaper CSS background"
        />
      </section>

      <section style={group}>
        <h3 style={h3}>/system/de.json</h3>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={14}
          spellCheck={false}
          style={{ ...input, fontFamily: 'ui-monospace, monospace', fontSize: 11, resize: 'vertical' }}
          aria-label="de.json contents"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <button onClick={applyRaw} style={{ ...btn, background: 'var(--os-accent)', color: '#0b0d12' }}>
            Apply
          </button>
          <button onClick={() => setRaw(JSON.stringify(defaultDe, null, 2))} style={btn}>
            Restore defaults
          </button>
          <span style={{ color: 'var(--os-muted)' }}>{status}</span>
        </div>
      </section>
    </div>
  )
}

const group: React.CSSProperties = { display: 'grid', gap: 8 }
const h3: React.CSSProperties = { margin: 0, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--os-muted)' }
const input: React.CSSProperties = {
  font: 'inherit',
  fontSize: 12,
  padding: '5px 8px',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,.12)',
  background: 'var(--os-bg)',
  color: 'var(--os-text)',
  width: '100%',
  boxSizing: 'border-box',
}
const btn: React.CSSProperties = {
  ...input,
  width: 'auto',
  cursor: 'pointer',
  border: '1px solid rgba(255,255,255,.12)',
}