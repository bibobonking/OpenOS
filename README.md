# OpenOS

A web desktop you build by source. The kernel, the filesystem and the desktop
environment are separate files, so any of them can be rewritten without
touching the others.

```bash
bun install
bun run dev        # vite dev server, open the printed URL
bun run desktop    # build + run in Electron
bun run pack       # build + package for the current platform
bun run typecheck  # tsc --noEmit
bun run test       # node --test (kernel + app frame)
```

## How it fits together

```
src/kernel/     the OS kernel
  types.ts        FileNode / DirNode / Process
  vfs.ts          pure filesystem: read/write/mkdir/rm/mv, typed errors
  kernel.ts       process table, events, persistence, /system/de.json
  seed.ts         the first-boot disk image
  vfs.test.ts

src/os/         the desktop host
  Desktop.tsx     mount point: applies the theme, picks the shell
  Window.tsx      window chrome (drag, resize, z-order)
  appFrame.ts     sandboxed .html program loader + `openos` bridge
  AppFrame.tsx    host side of the bridge
  hooks.ts        React bindings for the kernel

src/de/         the desktop environment — replaceable
  types.ts        the Shell contract
  registry.ts     shell name -> shell component
  Dock.tsx        shared dock
  Classic.tsx     dock + desktop icons + taskbar
  Minimal.tsx     floating dock only

src/apps/       native apps (React): Files, Editor, Settings
electron/       window shell
```

## The filesystem is the OS

Everything is a node in a JSON tree: `{ type: 'file' | 'dir', name, ... }`.

- `/home` — your files.
- `/apps/*.html` — programs. `/apps/hello.html` with `hello.css` and
  `hello.js` next to it is a working app; the loader inlines those two into
  the document.
- `/system/de.json` — the desktop environment. Edit it in the Editor (or the
  Settings app) and the desktop changes immediately.

The tree is persisted to `localStorage` under `openos.v1`. Delete it (or call
`kernel.reset()`) for a factory reset.

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

## Changing the desktop

Two levels, both by source:

1. **Config.** `/system/de.json` holds `shell`, `dock`, `wallpaper`,
   `theme` (CSS custom properties) and `window` (radius/blur/border). The
   Settings app writes the same file; hand-editing is equally supported, and
   the two never diverge.
2. **Code.** A shell is a function of `(de, processes, apps, windowLayer)`
   returning layout — see `src/de/types.ts`. Add a shell in `src/de/` and
   export it from `src/de/registry.ts`; its name becomes valid in
   `de.json`'s `shell` field.

## Building

`.github/workflows/build.yml` runs typecheck, tests and build on Linux,
Windows and macOS, then packages with electron-builder (AppImage/deb, nsis,
dmg/zip) and uploads the installers as artifacts. Trigger it on a `v*` tag or
by hand. Only the packaged run is produced by CI — the repo contains no
committed `dist/`.
