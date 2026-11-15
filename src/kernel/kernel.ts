// The kernel: process table, filesystem, DE config, persistence.
// It owns all mutable state and is the only place that talks to storage.
// Everything else (DE, apps) reads through here and reacts to events.

import * as fs from './vfs.ts'
import type { DirNode, KernelEventMap, Process } from './types.ts'
import { seedTree } from './seed.ts'

const STORAGE_KEY = 'openos.v1'
const DE_PATH = '/system/de.json'

type Listener<E extends keyof KernelEventMap> = (payload: KernelEventMap[E]) => void

export interface DeConfig {
  /** Which source DE to mount. See src/de/registry.ts */
  shell: string
  /** Any CSS custom properties; the DE decides how to use them. */
  theme: Record<string, string>
  /** Wallpaper: css `background` value, or `url(...)`. */
  wallpaper: string
  /** Dock/taskbar placement, DE-specific but this is the convention. */
  dock: 'left' | 'bottom' | 'right' | 'top' | 'none'
  /** Window chrome: rounded corners + backdrop blur, DE-specific. */
  window: { radius: number; blur: boolean; border: boolean }
}

export const defaultDe: DeConfig = {
  shell: 'classic',
  theme: {
    '--os-bg': '#0b0d12',
    '--os-surface': '#141821',
    '--os-surface-2': '#1c212c',
    '--os-text': '#e6e9f0',
    '--os-muted': '#8b93a7',
    '--os-accent': '#6aa9ff',
    '--os-danger': '#ff6b6b',
    '--os-radius': '12px',
    '--os-font': 'ui-sans-serif, system-ui, sans-serif',
  },
  wallpaper:
    'radial-gradient(1200px 800px at 20% 10%, #1b2740 0%, transparent 60%), radial-gradient(900px 700px at 85% 90%, #2a1b3d 0%, transparent 55%), #0b0d12',
  dock: 'left',
  window: { radius: 12, blur: true, border: true },
}

export interface SpawnOptions {
  title?: string
  args?: string[]
  x?: number
  y?: number
  w?: number
  h?: number
}

class Kernel {
  root: DirNode = seedTree()
  processes: Process[] = []
  de: DeConfig = defaultDe
  private nextPid = 1
  private nextZ = 1
  private listeners = new Map<string, Set<(payload: never) => void>>()
  private saveTimer: ReturnType<typeof setTimeout> | undefined

  /** Restores the disk image and DE config, or writes the seed on first boot. */
  boot(): void {
    const saved = this.load()
    if (saved) this.root = saved
    else this.persist()
    this.reloadDe()
    for (const p of this.processes) {
      if (p.state === 'focused') p.state = 'running'
    }
  }

  // --- events -------------------------------------------------------------

  on<E extends keyof KernelEventMap>(event: E, cb: Listener<E>): () => void {
    const set = (this.listeners.get(event) ?? new Set()) as Set<Listener<E>>
    set.add(cb)
    this.listeners.set(event, set as Set<(payload: never) => void>)
    return () => set.delete(cb)
  }

  private emit<E extends keyof KernelEventMap>(event: E, payload: KernelEventMap[E]): void {
    for (const cb of (this.listeners.get(event) ?? []) as Set<Listener<E>>) cb(payload)
  }

  // --- filesystem syscalls ------------------------------------------------

  read(path: string): string {
    return fs.readFile(this.root, path)
  }

  node(path: string): fs.Node {
    return fs.lookup(this.root, path)
  }

  ls(path: string): fs.Node[] {
    return fs.list(this.root, path)
  }

  write(path: string, content: string): void {
    fs.writeFile(this.root, path, content)
    this.changed(path)
  }

  mkdir(path: string): void {
    fs.mkdirp(this.root, path)
    this.changed(path)
  }

  rm(path: string, recursive = true): void {
    fs.rm(this.root, path, recursive)
    this.changed(fs.dirname(path))
  }

  mv(from: string, to: string): void {
    fs.rename(this.root, from, to)
    this.changed(fs.dirname(to))
  }

  private changed(path: string): void {
    this.persist()
    this.emit('fs:change', { path })
    if (path === DE_PATH) this.reloadDe()
  }

  // --- DE config ----------------------------------------------------------

  reloadDe(): void {
    let config = defaultDe
    let raw: string | undefined
    try {
      raw = this.read(DE_PATH)
      config = { ...defaultDe, ...(JSON.parse(raw) as Partial<DeConfig>) }
      config.theme = { ...defaultDe.theme, ...config.theme }
      config.window = { ...defaultDe.window, ...config.window }
    } catch {
      // No config yet, or the user broke the JSON. Fall back to the built-in
      // DE; if the file is simply missing, write it so it can be edited.
      if (!fs.exists(this.root, DE_PATH)) {
        fs.writeFile(this.root, DE_PATH, JSON.stringify(defaultDe, null, 2))
        this.persist()
      }
    }
    this.de = config
    this.emit('de:change', { source: 'file' })
  }

  /** Persists a DE change made through a UI (settings app) back to de.json. */
  setDe(patch: Partial<DeConfig>): void {
    const next: DeConfig = { ...this.de, ...patch, theme: { ...this.de.theme, ...patch.theme } }
    this.write(DE_PATH, JSON.stringify(next, null, 2))
  }

  // --- process table ------------------------------------------------------

  spawn(app: string, options: SpawnOptions = {}): Process {
    const count = this.processes.length
    const proc: Process = {
      pid: this.nextPid++,
      app,
      args: options.args ?? [],
      title: options.title ?? fs.basename(app) ?? app,
      x: options.x ?? 80 + (count % 8) * 28,
      y: options.y ?? 60 + (count % 8) * 28,
      w: options.w ?? 760,
      h: options.h ?? 480,
      z: this.nextZ++,
      state: 'focused',
      startedAt: Date.now(),
    }
    this.processes = this.processes.map((p) => ({ ...p, state: p.state === 'focused' ? 'running' : p.state }))
    this.processes.push(proc)
    this.emit('proc:spawn', proc)
    return proc
  }

  update(pid: number, patch: Partial<Process>): void {
    const i = this.processes.findIndex((p) => p.pid === pid)
    if (i === -1) return
    this.processes[i] = { ...this.processes[i], ...patch }
    this.emit('proc:update', this.processes[i])
  }

  focus(pid: number): void {
    this.processes = this.processes.map((p) =>
      p.pid === pid
        ? { ...p, state: 'focused', z: this.nextZ++ }
        : p.state === 'focused'
          ? { ...p, state: 'running' }
          : p,
    )
    const proc = this.processes.find((p) => p.pid === pid)
    if (proc) this.emit('proc:update', proc)
  }

  exit(pid: number): void {
    const proc = this.processes.find((p) => p.pid === pid)
    if (!proc) return
    this.processes = this.processes.filter((p) => p.pid !== pid)
    this.emit('proc:exit', { pid })
  }

  // --- persistence --------------------------------------------------------

  private persist(): void {
    clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root))
      } catch {
        // Quota exceeded: the desktop keeps working in memory this session.
      }
    }, 200)
  }

  private load(): DirNode | undefined {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as DirNode) : undefined
    } catch {
      return undefined
    }
  }

  /** Factory reset: drops the disk image and reboots into the seed tree. */
  reset(): void {
    localStorage.removeItem(STORAGE_KEY)
    this.root = seedTree()
    this.processes = []
    this.persist()
    this.reloadDe()
    this.emit('fs:change', { path: '/' })
  }
}

export const kernel = new Kernel()
export type { Kernel }