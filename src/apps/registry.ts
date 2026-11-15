// Native apps plus everything in /apps that ends in .html. The dock is built
// from this list, so dropping a program into /apps adds a dock icon. Reorder
// it, delete entries, add your own React app and render it in Desktop.tsx —
// this list is just data the desktop happens to use.

import { kernel } from '../kernel/kernel.ts'
import { useFsVersion } from '../os/hooks.ts'

export interface AppEntry {
  id: string
  title: string
  icon: string
  spawn: () => void
}

const NATIVE: Omit<AppEntry, 'spawn'>[] = [
  { id: 'files', title: 'Files', icon: '▤' },
  { id: 'editor', title: 'Editor', icon: '✎' },
]

export function useApps(): AppEntry[] {
  useFsVersion()
  const programs: AppEntry[] = []
  try {
    for (const node of kernel.ls('/apps')) {
      if (node.type !== 'file' || !/\.html?$/i.test(node.name)) continue
      const path = `/apps/${node.name}`
      programs.push({
        id: path,
        title: node.name.replace(/\.html?$/i, ''),
        icon: '◧',
        spawn: () => kernel.spawn(path, { title: node.name }),
      })
    }
  } catch {
    // No /apps directory: the desktop still boots with native apps only.
  }

  return [
    ...NATIVE.map((app) => ({
      ...app,
      spawn: () =>
        kernel.spawn(app.id, {
          title: app.title,
          args: app.id === 'editor' ? ['/home/readme.md'] : [],
        }),
    })),
    ...programs,
  ]
}