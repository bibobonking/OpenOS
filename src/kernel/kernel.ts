// The kernel: process table, filesystem, persistence, event bus.
// It owns all mutable state and is the only place that talks to storage.
// It has no opinion about looks: no theme, no config file, no plugin hooks.
// Everything visual lives in the desktop below it or in an app.

import * as fs from './vfs.ts'
import type { DirNode, KernelEventMap, Process } from './types.ts'
import { seedTree } from './seed.ts'

const STORAGE_KEY = 'openos.v1'

type Listener<E extends keyof KernelEventMap> = (payload: KernelEventMap[E]) => void

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
  private nextPid = 1
  private nextZ = 1
  private listeners = new Map<string, Set<(payload: never) => void>>()
  private saveTimer: ReturnType<typeof setTimeout> | undefined

  /** Restores the disk image from storage, or writes the seed on first boot. */
  boot(): void {
    const saved = this.load()
    if (saved) this.root = saved
    else this.persist()
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
    this.emit('fs:change', { path: '/' })
  }
}

export const kernel = new Kernel()
export type { Kernel }