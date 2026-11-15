// Window chrome: drag by the title bar, resize from the corner, z-order from
// the kernel's process table. No window library, no theming hook — the caller
// passes what it wants, and `theme` in Desktop.tsx is where taste lives.

import { useRef } from 'react'
import type { Process } from '../kernel/types.ts'
import { kernel } from '../kernel/kernel.ts'
import { theme } from './theme.ts'

interface Props {
  proc: Process
  radius: number
  children: React.ReactNode
}

const MIN_W = 280
const MIN_H = 180

export function Window({ proc, radius, children }: Props) {
  const drag = useRef<{ dx: number; dy: number } | null>(null)

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    kernel.focus(proc.pid)
    drag.current = { dx: e.clientX - proc.x, dy: e.clientY - proc.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    kernel.update(proc.pid, {
      x: Math.max(0, Math.min(window.innerWidth - 80, e.clientX - drag.current.dx)),
      y: Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.current.dy)),
    })
  }

  const endDrag = () => {
    drag.current = null
  }

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    const start = { x: e.clientX, y: e.clientY, w: proc.w, h: proc.h }
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      kernel.update(proc.pid, {
        w: Math.max(MIN_W, start.w + ev.clientX - start.x),
        h: Math.max(MIN_H, start.h + ev.clientY - start.y),
      })
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const focused = proc.state === 'focused'

  return (
    <section
      aria-label={proc.title}
      onPointerDown={() => kernel.focus(proc.pid)}
      style={{
        position: 'absolute',
        left: proc.x,
        top: proc.y,
        width: proc.w,
        height: proc.h,
        zIndex: proc.z,
        borderRadius: radius,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: theme.surface,
        color: theme.text,
        border: '1px solid rgba(255,255,255,.08)',
        boxShadow: focused
          ? '0 24px 60px -12px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06)'
          : '0 12px 30px -14px rgba(0,0,0,.6)',
        backdropFilter: 'blur(16px)',
        opacity: proc.state === 'minimized' ? 0 : 1,
        pointerEvents: proc.state === 'minimized' ? 'none' : 'auto',
      }}
    >
      <div
        onPointerDown={startDrag}
        onPointerMove={onDrag}
        onPointerUp={endDrag}
        onDoubleClick={() => kernel.update(proc.pid, { state: 'minimized' })}
        style={{
          height: 34,
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px 0 12px',
          background: theme.surface2,
          borderBottom: '1px solid rgba(255,255,255,.06)',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: focused ? theme.text : theme.muted,
          }}
        >
          {proc.title}
        </span>
        <button
          onClick={() => kernel.update(proc.pid, { state: 'minimized' })}
          aria-label={`Minimize ${proc.title}`}
          style={btn}
        >
          –
        </button>
        <button
          onClick={() => kernel.exit(proc.pid)}
          aria-label={`Close ${proc.title}`}
          style={{ ...btn, color: theme.danger }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, position: 'relative', background: theme.bg }}>{children}</div>

      <div
        onPointerDown={startResize}
        aria-hidden
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 14,
          height: 14,
          cursor: 'nwse-resize',
          touchAction: 'none',
        }}
      />
    </section>
  )
}

const btn: React.CSSProperties = {
  width: 22,
  height: 22,
  display: 'grid',
  placeItems: 'center',
  border: 0,
  borderRadius: 6,
  background: 'transparent',
  color: theme.muted,
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1,
}