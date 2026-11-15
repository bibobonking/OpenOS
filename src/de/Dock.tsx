// Shared dock. Horizontal or vertical depending on placement; the shell
// decides where it goes. Running apps are shown by process count.

import type { AppEntry } from '../apps/registry.ts'
import type { Process } from '../kernel/types.ts'
import { kernel } from '../kernel/kernel.ts'

interface Props {
  apps: AppEntry[]
  processes: Process[]
  placement: 'left' | 'right' | 'top' | 'bottom'
}

export function Dock({ apps, processes, placement }: Props) {
  const vertical = placement === 'left' || placement === 'right'
  const running = new Map<string, Process[]>()
  for (const proc of processes) {
    running.set(proc.app, [...(running.get(proc.app) ?? []), proc])
  }

  return (
    <nav
      aria-label="Dock"
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: 4,
        padding: 6,
        background: 'var(--os-surface)',
        borderRight: placement === 'left' ? '1px solid rgba(255,255,255,.07)' : undefined,
        borderLeft: placement === 'right' ? '1px solid rgba(255,255,255,.07)' : undefined,
        borderBottom: placement === 'top' ? '1px solid rgba(255,255,255,.07)' : undefined,
        borderTop: placement === 'bottom' ? '1px solid rgba(255,255,255,.07)' : undefined,
        zIndex: 10_000,
      }}
    >
      {apps.map((app) => {
        const procs = running.get(app.id) ?? []
        const active = procs.length > 0
        return (
          <button
            key={app.id}
            onClick={() => {
              const live = procs[0]
              if (live) kernel.focus(live.pid)
              else app.spawn()
            }}
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
              color: active ? 'var(--os-text)' : 'var(--os-muted)',
              background: active ? 'var(--os-surface-2)' : 'transparent',
            }}
          >
            <span aria-hidden>{app.icon}</span>
            {active && (
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  ...(vertical ? { left: 2, top: '50%' } : { bottom: 2, left: '50%' }),
                  transform: vertical ? 'translateY(-50%)' : 'translateX(-50%)',
                  width: vertical ? 2 : 4,
                  height: vertical ? 4 : 2,
                  borderRadius: 2,
                  background: 'var(--os-accent)',
                }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}