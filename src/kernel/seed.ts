// The first-boot disk image. Everything here is editable at runtime — this is
// just what a fresh install contains. Delete it (or `rm -rf` the tree) and the
// OS still boots, because the kernel falls back to src/kernel/defaults.ts.

import { dir, mkdirp, writeFile } from './vfs.ts'
import type { DirNode } from './types.ts'

const hello = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Hello</title>
    <link rel="stylesheet" href="/apps/hello.css" />
  </head>
  <body>
    <h1>Hello from OpenOS</h1>
    <p>This file is a program. It lives in the VFS and runs in a sandboxed frame.</p>
    <button id="go">Count: <span id="n">0</span></button>
    <script src="/apps/hello.js"></script>
  </body>
</html>`

const helloCss = `body {
  margin: 0;
  padding: 32px;
  font: 15px/1.6 ui-sans-serif, system-ui, sans-serif;
  color: #e6e9f0;
  background: #0f1218;
}
h1 { font-size: 22px; margin: 0 0 8px; }
p { color: #8b93a7; margin: 0 0 20px; }
button {
  font: inherit;
  color: #0b0d12;
  background: #6aa9ff;
  border: 0;
  border-radius: 8px;
  padding: 8px 14px;
  cursor: pointer;
}`

const helloJs = `let n = 0
document.getElementById('go').addEventListener('click', () => {
  document.getElementById('n').textContent = String(++n)
})`

const notes = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Notes</title>
    <style>
      body { margin: 0; height: 100vh; display: grid; grid-template-rows: auto 1fr; font: 14px/1.6 ui-sans-serif, system-ui, sans-serif; background: #0f1218; color: #e6e9f0; }
      header { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-bottom: 1px solid #232936; }
      button { font: inherit; background: #6aa9ff; color: #0b0d12; border: 0; border-radius: 6px; padding: 5px 10px; cursor: pointer; }
      span { color: #8b93a7; }
      textarea { border: 0; outline: 0; resize: none; padding: 16px; background: transparent; color: inherit; font: inherit; }
    </style>
  </head>
  <body>
    <header>
      <button id="save">Save</button>
      <span id="status">/home/notes.txt</span>
    </header>
    <textarea id="text" spellcheck="false"></textarea>
    <script>
      const text = document.getElementById('text')
      const status = document.getElementById('status')
      openos.read('/home/notes.txt').then((t) => { text.value = t || '' }).catch(() => {})
      document.getElementById('save').addEventListener('click', async () => {
        await openos.write('/home/notes.txt', text.value)
        status.textContent = 'saved ' + new Date().toLocaleTimeString()
      })
    </script>
  </body>
</html>`

const readme = `# OpenOS

A web desktop you build by source. Nothing here is a product; it is a frame.

- \`/system/de.json\` — the desktop environment: shell, theme, wallpaper, dock.
- \`/apps/*.html\` — programs. Open one and it runs in its own sandboxed frame.
  A program may load \`/apps/x.css\` and \`/apps/x.js\` from the VFS.
- \`/home\` — your files.

Edit the JSON, reload the shell, and the desktop changes. Rewrite a shell in
\`src/de\` and the desktop becomes something else.
`

export function seedTree(): DirNode {
  const root = dir('/')
  mkdirp(root, '/apps')
  mkdirp(root, '/home')
  mkdirp(root, '/system/themes')

  writeFile(root, '/apps/hello.html', hello)
  writeFile(root, '/apps/hello.css', helloCss)
  writeFile(root, '/apps/hello.js', helloJs)
  writeFile(root, '/apps/notes.html', notes)
  writeFile(root, '/home/readme.md', readme)
  writeFile(root, '/home/notes.txt', '')

  return root
}