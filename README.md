# OpenOS

A web desktop with no customisation layer. No settings app, no theme file, no
plugin API, no DE registry. The desktop *is* a source file; the kernel is a
source file. Change them and rebuild — the way you'd change a Linux desktop by
patching it.

```bash
bun install
bun run dev        # vite dev server, open the printed URL
bun run desktop    # build + run in Electron
bun run pack       # build + package for the current platform
bun run typecheck  # tsc --noEmit
bun run test       # node --test (kernel + app frame)
```

## Docs

- [HOW-TO.md](HOW-TO.md) — hướng dẫn tùy biến bằng source, và những chỗ hụt thật
  của template (đọc trước khi tin tưởng nó).

## Map

```
src/kernel/        the OS kernel
  types.ts           FileNode / DirNode / Process
  vfs.ts             pure filesystem: read/write/mkdir/rm/mv, typed errors
  kernel.ts          process table, events, localStorage persistence
  seed.ts            the first-boot disk image
  vfs.test.ts

src/os/             the desktop — this is the whole DE
  Desktop.tsx        layout: dock + window layer + taskbar
  theme.ts           colours, radius, wallpaper (a constant, nothing reads it)
  Window.tsx         window chrome: drag, resize, z-order, minimize, close
  appFrame.ts        sandboxed .html program loader + `openos` bridge
  AppFrame.tsx       host side of the bridge
  hooks.ts           React bindings for the kernel

src/apps/           native apps written in React
  Files.tsx          browse / edit / delete the VFS
  Editor.tsx         plain text over the VFS
  registry.ts        the list the dock happens to map over
```

## The filesystem is the OS

Everything is a node in a JSON tree: `{ type: 'file' | 'dir', name, ... }`,
persisted to `localStorage` under `openos.v1`. `kernel.reset()` wipes it.

- `/home` — your files.
- `/apps/*.html` — programs. `/apps/hello.html` with `hello.css` and
  `hello.js` next to it is a working app; the loader inlines those two.

## A program is an .html file

Open a `.html` in Files and it runs in a sandboxed iframe
(`allow-scripts`, no `allow-same-origin`, so it has an opaque origin and
cannot reach the desktop). Its `/…/*.css` and `/…/*.js` are inlined from the
VFS first. It gets one global, `openos`:

```js
const text = await openos.read('/home/notes.txt')
await openos.write('/home/notes.txt', 'hello')
const entries = await openos.ls('/home')   // [{ name, type, path }]
await openos.open('/apps/hello.html')      // launch another program
```

## Customising

There is no supported path, deliberately. The supported path is the source:

- Want a different dock? Edit the `Dock` function in `src/os/Desktop.tsx`, or
  delete it and write your own.
- Want a top bar, tiling, workspaces, a HUD, no windows at all? React the
  `processes` array however you like — the kernel only tracks pids and
  geometry, it does not care how they are drawn.
- Want different colours? `src/os/theme.ts`.
- Want a new native app? Write a component and add a `case` in `AppContent`.
- Want a different kernel? `vfs.ts` is 170 lines of pure functions.

The desktop imports the kernel; the kernel never imports the desktop. That is
the only rule. Everything else is an ordinary React file you are free to
rewrite, and nothing will "restore" it.

## Building

`.github/workflows/build.yml` runs typecheck, tests and build on Linux,
Windows and macOS, then packages with electron-builder (AppImage/deb, nsis,
dmg/zip) and uploads them as artifacts. Trigger on a `v*` tag or by hand. No
`dist/` is committed; only CI produces installers.