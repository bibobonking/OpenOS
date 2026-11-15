// Minimal: no desktop icons, no taskbar. A floating dock at the bottom and
// nothing else — enough to show that the shell is a choice, not a fixture.

import type { ShellProps } from './types.ts'
import { Dock } from './Dock.tsx'

export function Minimal({ de, processes, apps, windowLayer }: ShellProps) {
  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <main style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>{windowLayer}</main>

      {de.dock !== 'none' && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ pointerEvents: 'auto', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 32px -12px rgba(0,0,0,.7)' }}>
            <Dock apps={apps} processes={processes} placement="bottom" />
          </div>
        </div>
      )}
    </div>
  )
}