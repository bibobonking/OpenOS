// Files: browse and edit the VFS. Double-click a file to open it —
// .html becomes a program window, anything else opens in the editor.

import { useState } from 'react'
import { kernel } from '../kernel/kernel.ts'
import { basename, dirname, resolve } from '../kernel/vfs.ts'
import { useFsVersion } from '../os/hooks.ts'

interface Props {
  initialPath: string
}

const QUICK = ['/home', '/apps', '/system']

export function Files({ initialPath }: Props) {
  useFsVersion()
  const [path, setPath] = useState(initialPath)
  const [selected, setSelected] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Derived on every render: useFsVersion() already re-renders on fs changes.
  let entries: { name: string; type: 'file' | 'dir' }[] = []
  let listError: string | null = null
  try {
    entries = kernel.ls(path).map((n) => ({ name: n.name, type: n.type }))
  } catch (e) {
    listError = e instanceof Error ? e.message : String(e)
  }
  const error = listError ?? actionError

  const guard = (fn: () => void) => {
    try {
      setActionError(null)
      fn()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    }
  }

  const open = (name: string) =>
    guard(() => {
      const full = resolve(path, name)
      if (kernel.node(full).type === 'dir') {
        setPath(full)
        setSelected(null)
        return
      }
      if (/\.html?$/i.test(full)) {
        kernel.spawn(full, { title: name })
      } else {
        kernel.spawn('editor', { title: name, args: [full] })
      }
    })

  const createFile = () => {
    const name = prompt('New file name (use .html for a program):', 'untitled.html')
    if (!name) return
    guard(() => {
      const full = resolve(path, name)
      if (!/\.\w+$/.test(name)) kernel.write(full + '.txt', '')
      else kernel.write(full, '')
      setSelected(basename(full))
    })
  }

  const createDir = () => {
    const name = prompt('New folder name:')
    if (!name) return
    guard(() => kernel.mkdir(resolve(path, name)))
  }

  const remove = () => {
    if (!selected) return
    const full = resolve(path, selected)
    if (!confirm(`Delete ${full}?`)) return
    guard(() => {
      kernel.rm(full)
      setSelected(null)
    })
  }

  const rename = () => {
    if (!selected) return
    const name = prompt('New name:', selected)
    if (!name || name === selected) return
    guard(() => {
      kernel.mv(resolve(path, selected), resolve(path, name))
      setSelected(name)
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', height: '100%', fontSize: 13 }}>
      <nav style={sidebar} aria-label="Places">
        {QUICK.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPath(p)
              setSelected(null)
            }}
            style={{
              ...navItem,
              background: path === p ? 'var(--os-surface-2)' : 'transparent',
              fontWeight: path === p ? 600 : 400,
            }}
          >
            {basename(p) || '/'}
          </button>
        ))}
      </nav>

      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minWidth: 0 }}>
        <header style={toolbar}>
          <button
            onClick={() => {
              setPath(dirname(path))
              setSelected(null)
            }}
            aria-label="Up one level"
            style={btn}
            disabled={path === '/'}
          >
            ↑
          </button>
          <code style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</code>
          <button onClick={createFile} style={btn}>
            + File
          </button>
          <button onClick={createDir} style={btn}>
            + Folder
          </button>
          <button onClick={rename} style={btn} disabled={!selected}>
            Rename
          </button>
          <button onClick={remove} style={{ ...btn, color: 'var(--os-danger)' }} disabled={!selected}>
            Delete
          </button>
        </header>

        <ul style={{ listStyle: 'none', margin: 0, padding: 8, overflow: 'auto' }} aria-label={`Contents of ${path}`}>
          {entries.length === 0 && <li style={{ color: 'var(--os-muted)', padding: 8 }}>Empty</li>}
          {entries.map((entry) => (
            <li key={entry.name}>
              <button
                onClick={() => setSelected(entry.name)}
                onDoubleClick={() => open(entry.name)}
                onKeyDown={(e) => e.key === 'Enter' && open(entry.name)}
                aria-current={selected === entry.name}
                style={{
                  ...row,
                  background: selected === entry.name ? 'var(--os-accent)' : 'transparent',
                  color: selected === entry.name ? '#0b0d12' : 'var(--os-text)',
                }}
              >
                <span aria-hidden style={{ width: 16, opacity: 0.75 }}>{entry.type === 'dir' ? '▸' : '·'}</span>
                {entry.name}
              </button>
            </li>
          ))}
        </ul>

        <footer style={{ padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,.06)', color: 'var(--os-danger)', minHeight: 26, fontSize: 12 }}>
          {error}
        </footer>
      </div>
    </div>
  )
}

const sidebar: React.CSSProperties = {
  borderRight: '1px solid rgba(255,255,255,.06)',
  background: 'var(--os-surface-2)',
  padding: 8,
  display: 'grid',
  alignContent: 'start',
  gap: 2,
}

const navItem: React.CSSProperties = {
  textAlign: 'left',
  border: 0,
  borderRadius: 6,
  padding: '6px 8px',
  color: 'var(--os-text)',
  cursor: 'pointer',
  font: 'inherit',
}

const toolbar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 8px',
  borderBottom: '1px solid rgba(255,255,255,.06)',
  background: 'var(--os-surface)',
}

const btn: React.CSSProperties = {
  font: 'inherit',
  fontSize: 12,
  border: '1px solid rgba(255,255,255,.1)',
  background: 'transparent',
  color: 'var(--os-text)',
  borderRadius: 6,
  padding: '3px 8px',
  cursor: 'pointer',
}

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  width: '100%',
  textAlign: 'left',
  font: 'inherit',
  border: 0,
  borderRadius: 6,
  padding: '5px 8px',
  cursor: 'pointer',
}