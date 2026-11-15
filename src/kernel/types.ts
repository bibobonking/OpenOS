// OpenOS node types. Everything on disk is one of these two shapes,
// so the whole filesystem is plain JSON: serializable, diffable, patchable.

export interface FileNode {
  type: 'file'
  name: string
  content: string
  /** Free-form mime hint. `text/html` marks a runnable app. */
  mime: string
  mtime: number
}

export interface DirNode {
  type: 'dir'
  name: string
  children: Record<string, Node>
  mtime: number
}

export type Node = FileNode | DirNode

export interface Process {
  pid: number
  /** App id: a path in the VFS (`/apps/notes.html`) or a native id (`files`). */
  app: string
  /** Arguments passed at launch, e.g. the file a native editor should open. */
  args: string[]
  title: string
  /** Window geometry, owned by the DE but kept here so it survives DE reloads. */
  x: number
  y: number
  w: number
  h: number
  z: number
  state: 'running' | 'minimized' | 'focused'
  startedAt: number
}

export interface KernelEventMap {
  'fs:change': { path: string }
  'proc:spawn': Process
  'proc:exit': { pid: number }
  'proc:update': Process
  'de:change': { source: 'file' | 'user' }
}
