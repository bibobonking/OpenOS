// Classic: desktop icons on the left, dock on whatever edge de.json says,
// a taskbar listing open windows. The default "looks like an OS" shell.

import type { ShellProps } from './types.ts'
import { Dock } from './Dock.tsx'
import { kernel } from '../kernel/kernel.ts'

export function Classic({ de, processes, apps, windowLayer }: ShellProps) {
  const placement = de.dock
  const side = placement === 'left' || placement === 'right' ? placement : null
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: side === 'left' ? 'row' : side === 'right' ? 'row-reverse' : 'column',
        }}
      >
        {side && <Dock apps={apps} processes={processes} placement={side} />}
        {placement === 'top' && <Dock apps={apps} processes={processes} placement="top" />}

        <main style={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <DesktopIcons programs={apps.filter((a) => a.id.startsWith('/apps/'))} />
          {windowLayer}
        </main>

        {placement === 'bottom' && <Dock apps={apps} processes={processes} placement="bottom" />}
      </div>

      <Taskbar processes={processes} />
    </div>
  )
}

function DesktopIcons({ programs }: { programs: { id: string; title: string; icon: string; spawn: () => void }[] }) {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 16, display: 'grid', alignContent: 'start', gap: 6, pointerEvents: 'none' }}>
      {programs.map((app) => (
        <button
          key={app.id}
          onClick={app.spawn}
          onKeyDown={(e) => e.key === 'Enter' && app.spawn()}
          style={{
            pointerEvents: 'auto',
            width: 84,
            display: 'grid',
            justifyItems: 'center',
            gap: 4,
            padding: '8px 4px',
            border: 0,
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--os-text)',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: 11,
          }}
        >
          <span aria-hidden style={{ fontSize: 26, opacity: 0.9 }}>
            {app.icon}
          </span>
          <span style={{ maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {app.title}
          </span>
        </button>
      ))}
    </div>
  )
}

function Taskbar({ processes }: { processes: ShellProps['processes'] }) {
  return (
    <footer
      aria-label="Open windows"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        minHeight: 32,
        background: 'var(--os-surface)',
        borderTop: '1px solid rgba(255,255,255,.07)',
        zIndex: 10_001,
        overflowX: 'auto',
      }}
    >
      {processes.length === 0 && <span style={{ fontSize: 11, color: 'var(--os-muted)' }}>no windows</span>}
      {processes.map((p) => (
        <button
          key={p.pid}
          onClick={() => (p.state === 'focused' ? kernel.update(p.pid, { state: 'minimized' }) : kernel.focus(p.pid))}
          style={{
            font: 'inherit',
            fontSize: 11,
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '4px 9px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,.08)',
            background: p.state === 'focused' ? 'var(--os-surface-2)' : 'transparent',
            color: p.state === 'minimized' ? 'var(--os-muted)' : 'var(--os-text)',
            cursor: 'pointer',
          }}
        >
          {p.title}
        </button>
      ))}
    </footer>
  )
}