// Virtual filesystem. Pure functions over an immutable-ish tree so it can be
// snapshot, serialized to JSON and unit-tested without a browser.

import type { DirNode, FileNode, Node } from './types.ts'

export type { DirNode, FileNode, Node }

export const dir = (name: string, children: Record<string, Node> = {}): DirNode => ({
  type: 'dir',
  name,
  children,
  mtime: Date.now(),
})

export const file = (name: string, content: string, mime = 'text/plain'): FileNode => ({
  type: 'file',
  name,
  content,
  mime,
  mtime: Date.now(),
})

export const mimeOf = (name: string): string => {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'html':
    case 'htm':
      return 'text/html'
    case 'js':
    case 'mjs':
      return 'text/javascript'
    case 'css':
      return 'text/css'
    case 'json':
      return 'application/json'
    case 'md':
      return 'text/markdown'
    default:
      return 'text/plain'
  }
}

/** POSIX-ish normalization. Keeps paths absolute and collapses `.`/`..`. */
export const normalize = (path: string): string => {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return '/' + parts.join('/')
}

/** Resolves `path` against `cwd`, the way a shell would. */
export const resolve = (cwd: string, path: string): string =>
  normalize(path.startsWith('/') ? path : `${cwd}/${path}`)

export const basename = (path: string): string => normalize(path).split('/').pop() ?? ''

export const dirname = (path: string): string => {
  const parts = normalize(path).split('/')
  parts.pop()
  return parts.join('/') || '/'
}

export type FsErrorCode = 'ENOENT' | 'ENOTDIR' | 'EISDIR' | 'EEXIST'

export class FsError extends Error {
  code: FsErrorCode
  constructor(code: FsErrorCode, path: string) {
    super(`${code}: ${path}`)
    this.code = code
  }
}

export function lookup(root: DirNode, path: string): Node {
  const parts = normalize(path).split('/').filter(Boolean)
  let node: Node = root
  for (const part of parts) {
    if (node.type !== 'dir') throw new FsError('ENOTDIR', path)
    const next: Node | undefined = node.children[part]
    if (!next) throw new FsError('ENOENT', path)
    node = next
  }
  return node
}

export function parentOf(root: DirNode, path: string): DirNode {
  const parent = lookup(root, dirname(path))
  if (parent.type !== 'dir') throw new FsError('ENOTDIR', dirname(path))
  return parent
}

export function exists(root: DirNode, path: string): boolean {
  try {
    lookup(root, path)
    return true
  } catch {
    return false
  }
}

export function readFile(root: DirNode, path: string): string {
  const node = lookup(root, path)
  if (node.type !== 'file') throw new FsError('EISDIR', path)
  return node.content
}

/** Mutates in place: cheap, and every mutation goes through the kernel,
 *  which emits `fs:change` and persists. */
export function writeFile(root: DirNode, path: string, content: string, mime?: string): void {
  const name = basename(path)
  if (!name) throw new FsError('EISDIR', path)
  const parent = parentOf(root, path)
  const prev = parent.children[name]
  if (prev && prev.type === 'dir') throw new FsError('EISDIR', path)
  parent.children[name] = file(name, content, mime ?? prev?.mime ?? mimeOf(name))
  parent.mtime = Date.now()
}

export function mkdir(root: DirNode, path: string): void {
  const parent = parentOf(root, path)
  const name = basename(path)
  if (parent.children[name]) throw new FsError('EEXIST', path)
  parent.children[name] = dir(name)
  parent.mtime = Date.now()
}

/** Creates every missing directory on the way to `path`. */
export function mkdirp(root: DirNode, path: string): void {
  let cur = ''
  for (const part of normalize(path).split('/').filter(Boolean)) {
    cur += '/' + part
    if (!exists(root, cur)) mkdir(root, cur)
  }
}

export function list(root: DirNode, path: string): Node[] {
  const node = lookup(root, path)
  if (node.type !== 'dir') throw new FsError('ENOTDIR', path)
  return Object.values(node.children).sort((a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1,
  )
}

export function rm(root: DirNode, path: string, recursive = false): void {
  const normalized = normalize(path)
  if (normalized === '/') throw new FsError('EISDIR', path)
  const node = lookup(root, normalized)
  if (node.type === 'dir' && !recursive && Object.keys(node.children).length > 0) {
    throw new FsError('EEXIST', `${path} (directory not empty)`)
  }
  const parent = parentOf(root, normalized)
  delete parent.children[basename(normalized)]
  parent.mtime = Date.now()
}

export function rename(root: DirNode, from: string, to: string): void {
  const src = normalize(from)
  const dst = normalize(to)
  if (src === dst) return
  const node = lookup(root, src)
  const srcParent = parentOf(root, src)
  const dstParent = parentOf(root, dst)
  const name = basename(dst)
  if (dstParent.children[name]) throw new FsError('EEXIST', dst)
  delete srcParent.children[basename(src)]
  node.name = name
  node.mtime = Date.now()
  dstParent.children[name] = node
  srcParent.mtime = dstParent.mtime = Date.now()
}

/** Deep clone — used by the kernel for snapshots and by callers that diff a tree. */
export function clone(node: DirNode): DirNode {
  return {
    type: 'dir',
    name: node.name,
    mtime: node.mtime,
    children: Object.fromEntries(
      Object.entries(node.children).map(([key, child]) => [
        key,
        child.type === 'dir' ? clone(child) : { ...child },
      ]),
    ),
  }
}

/** Walks the tree depth-first, calling `visit` with an absolute path. */
export function walk(root: DirNode, visit: (path: string, node: Node) => void, base = '/'): void {
  for (const node of Object.values(root.children)) {
    const path = base === '/' ? `/${node.name}` : `${base}/${node.name}`
    visit(path, node)
    if (node.type === 'dir') walk(node, visit, path)
  }
}
