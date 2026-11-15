// Host side of the app frame: builds the document, runs it in a sandboxed
// iframe, and serves the `openos` bridge calls that arrive by postMessage.

import { useEffect, useMemo, useRef } from 'react'
import { buildSrcdoc, runBridge, type BridgeOp } from './appFrame.ts'
import { useFsVersion } from './hooks.ts'

export function AppFrame({ path }: { path: string }) {
  const version = useFsVersion()
  const template = useMemo(() => {
    try {
      return { ok: true as const, html: buildSrcdoc(path) }
    } catch {
      return { ok: false as const, html: '' }
    }
  }, [path, version])

  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as
        | { __openos?: boolean; reply?: boolean; id?: number; op?: BridgeOp; args?: unknown[] }
        | null
      if (!data || data.__openos !== true || data.reply === true) return
      // The frame has an opaque origin, so `e.origin` is "null" and cannot be
      // checked. Verify the window instead, and never echo unknown shapes.
      if (e.source !== frame.current?.contentWindow) return

      const reply = (payload: Record<string, unknown>) =>
        frame.current?.contentWindow?.postMessage({ __openos: true, reply: true, ...payload }, '*')

      try {
        reply({ id: data.id, ok: true, value: runBridge(data.op!, data.args ?? []) })
      } catch (err) {
        reply({ id: data.id, ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!template.ok) {
    return (
      <div style={centered}>
        <span>Program not found</span>
        <code style={{ fontSize: 12, color: 'var(--os-muted)' }}>{path}</code>
      </div>
    )
  }

  return (
    <iframe
      ref={frame}
      title={path}
      srcDoc={template.html}
      // No allow-same-origin: the app gets an opaque origin and cannot reach
      // the desktop. allow-modals lets alert/confirm work inside the app.
      sandbox="allow-scripts allow-modals allow-forms allow-popups"
      style={{ border: 0, width: '100%', height: '100%', display: 'block', background: '#0f1218' }}
    />
  )
}

const centered: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 6,
  height: '100%',
  color: 'var(--os-text)',
  fontSize: 13,
}