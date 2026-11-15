// React bindings for the kernel. Small on purpose: subscribe, read, re-render.

import { useEffect, useReducer } from 'react'
import { kernel } from '../kernel/kernel.ts'
import type { Process } from '../kernel/types.ts'

const bump = (n: number) => n + 1

export function useProcesses(): Process[] {
  const [, force] = useReducer(bump, 0)
  useEffect(() => {
    const offs = [
      kernel.on('proc:spawn', force),
      kernel.on('proc:update', force),
      kernel.on('proc:exit', force),
    ]
    return () => offs.forEach((off) => off())
  }, [])
  return kernel.processes
}

/** Re-renders whenever any file changes. Cheap: the tree is small. */
export function useFsVersion(): number {
  const [version, force] = useReducer(bump, 0)
  useEffect(() => kernel.on('fs:change', force), [])
  return version
}