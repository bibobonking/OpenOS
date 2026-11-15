// Editor: plain text over the VFS.

import { useState } from 'react'
import { kernel } from '../kernel/kernel.ts'
import { useFsVersion } from '../os/hooks.ts'

export function Editor({ path }: { path: string }) {
  useFsVersion()
  const [draft, setDraft] = useState(() => {
    try {
      return kernel.read(path)
    } catch {
      return ''
    }
  })
  const [status, setStatus] = useState(path)

  const save = () => {
    try {
      kernel.write(path, draft)
      setStatus(`saved ${new Date().toLocaleTimeString()}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={toolbar}>
        <button onClick={save} style={btn}>
          Save
        </button>
        <code style={{ flex: 1, color: 'var(--os-muted)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {path}
        </code>
        <span style={{ fontSize: 12, color: 'var(--os-muted)' }}>{status}</span>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault()
            save()
          }
        }}
        spellCheck={false}
        aria-label={`Contents of ${path}`}
        style={{
          border: 0,
          outline: 0,
          resize: 'none',
          padding: 12,
          width: '100%',
          boxSizing: 'border-box',
          background: 'var(--os-bg)',
          color: 'var(--os-text)',
          font: '12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace',
          tabSize: 2,
        }}
      />
    </div>
  )
}

const toolbar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 10px',
  borderBottom: '1px solid rgba(255,255,255,.06)',
  background: 'var(--os-surface)',
}

const btn: React.CSSProperties = {
  font: 'inherit',
  fontSize: 12,
  border: 0,
  borderRadius: 6,
  padding: '4px 10px',
  background: 'var(--os-accent)',
  color: '#0b0d12',
  cursor: 'pointer',
  fontWeight: 600,
}