// The shells. Each one is just a function of (config, processes, apps) that
// returns layout. Add a file here and export it in SHELLS: /system/de.json
// `shell` then accepts its name.

import type { Shell } from './types.ts'
import { Classic } from './Classic.tsx'
import { Minimal } from './Minimal.tsx'

export const SHELLS: Record<string, Shell> = {
  classic: Classic,
  minimal: Minimal,
}

export const DEFAULT_SHELL = 'classic'