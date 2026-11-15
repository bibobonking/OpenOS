// A shell is the layout: wallpaper, where the dock lives, what a taskbar looks
// like. It never owns state — it receives the process table and the window
// layer and arranges them. Swap shells in /system/de.json, or add one to
// src/de/registry.ts and it appears in Settings.

import type { DeConfig } from '../kernel/kernel.ts'
import type { Process } from '../kernel/types.ts'
import type { AppEntry } from '../apps/registry.ts'

export interface ShellProps {
  de: DeConfig
  processes: Process[]
  apps: AppEntry[]
  /** The stack of open windows, already positioned by the kernel. */
  windowLayer: React.ReactNode
}

export type Shell = (props: ShellProps) => React.ReactNode