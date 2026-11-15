// Mount point. Applies the theme from /system/de.json, picks the shell, and
// renders the window layer. Everything the desktop needs is in the kernel.

import { useMemo } from 'react'
import type { Process } from '../kernel/types.ts'
import { useApps } from '../apps/registry.ts'
import { useDe, useProcesses } from './hooks.ts'
import { AppFrame } from './AppFrame.tsx'
import { Window } from './Window.tsx'
import { Files } from '../apps/Files.tsx'
import { Editor } from '../apps/Editor.tsx'
import { Settings } from '../apps/Settings.tsx'
import { SHELLS, DEFAULT_SHELL } from '../de/registry.ts'

export function Desktop() {
  const de = useDe()
  const processes = useProcesses()
  const apps = useApps()

  const Shell = SHELLS[de.shell] ?? SHELLS[DEFAULT_SHELL]

  const windowLayer = useMemo(
    () => (
      <>
        {processes.map((p) => (
            <Window
              key={p.pid}
              proc={p}
              radius={de.window.radius}
              blur={de.window.blur}
              border={de.window.border}
            >
              <AppContent proc={p} />
            </Window>
          ))}
      </>
    ),
    [processes, de.window.radius, de.window.blur, de.window.border],
  )

  return (
    <div
      style={{
        height: '100%',
        background: de.wallpaper,
        backgroundSize: 'cover',
        ...(de.theme as React.CSSProperties),
        color: 'var(--os-text)',
        fontFamily: 'var(--os-font)',
      }}
    >
      <Shell de={de} processes={processes} apps={apps} windowLayer={windowLayer} />
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
    case 'settings':
      return <Settings />
    default:
      return <AppFrame path={proc.app} />
  }
}