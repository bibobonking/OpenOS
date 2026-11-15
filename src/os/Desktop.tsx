// The desktop environment. This file *is* the DE: the dock, the taskbar, the
// wallpaper, the window chrome and the window layer. It is not registered
// anywhere and there is no config file behind it — you change the desktop by
// editing this file, the way you would change a Linux desktop by editing its
// source. Anything you can write in React, you can put here.

import { useMemo } from 'react'
import type { Process } from '../kernel/types.ts'
import { kernel } from '../kernel/kernel.ts'
import { useApps, type AppEntry } from '../apps/registry.ts'
import { useProcesses } from './hooks.ts'
import { AppFrame } from './AppFrame.tsx'
import { Window } from './Window.tsx'
import { Files } from '../apps/Files.tsx'
import { Editor } from '../apps/Editor.tsx'
import { theme } from './theme.ts'

export function Desktop() {
  const processes = useProcesses()
  const apps = useApps()

  const windowLayer = useMemo(
    () =>
      processes.map((proc) => (
        <Window key={proc.pid} proc={proc} radius={theme.radius}>
          <AppContent proc={proc} />
        </Window>
      )),
    [processes],
  )

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: theme.wallpaper,
        color: theme.text,
        fontFamily: theme.font,
      }}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <Dock apps={apps} processes={processes} />
        <main style={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden' }}>{windowLayer}</main>
      </div>
      <Taskbar processes={processes} />
    </div>
  )
}

/** Native apps and VFS programs share the window; only the body differs. */
function AppContent({ proc }: { proc: Process }) {
  const arg = proc.args[0]
  switch (proc.app) {
    case 'files':
      return <Files initialPath={arg || '/home'} />
    case 'editor':
      return <Editor path={arg || '/home/readme.md'} />
    default:
      return <AppFrame path={proc.app} />
  }
}

function Dock({ apps, processes }: { apps: AppEntry[]; processes: Process[] }) {
  const running = new Map<string, Process>()
  for (const proc of processes) running.set(proc.app, proc)

  return (
    <nav
      aria-label="Dock"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: 6,
        background: theme.surface,
        borderRight: '1px solid rgba(255,255,255,.07)',
        zIndex: 10_000,
      }}
    >
      {apps.map((app) => {
        const live = running.get(app.id)
        return (
          <button
            key={app.id}
            onClick={() => (live ? kernel.focus(live.pid) : app.spawn())}
            title={app.title}
            aria-label={app.title}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
              border: 0,
              borderRadius: 9,
              cursor: 'pointer',
              color: live ? theme.text : theme.muted,
              background: live ? theme.surface2 : 'transparent',
            }}
          >
            <span aria-hidden>{app.icon}</span>
            {live && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: 2,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 2,
                  height: 4,
                  borderRadius: 2,
                  background: theme.accent,
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}

function Taskbar({ processes }: { processes: Process[] }) {
  return (
    <footer
      aria-label="Open windows"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '4px 8px',
        minHeight: 32,
        background: theme.surface,
        borderTop: '1px solid rgba(255,255,255,.07)',
        zIndex: 10_001,
        overflowX: 'auto',
      }}
    >
      {processes.length === 0 && <span style={{ fontSize: 11, color: theme.muted }}>no windows</span>}
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
            background: p.state === 'focused' ? theme.surface2 : 'transparent',
            color: p.state === 'minimized' ? theme.muted : theme.text,
            cursor: 'pointer',
          }}
        >
          {p.title}
        </button>
      ))}
    </footer>
  )
}