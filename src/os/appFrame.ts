// Turns an .html file in the VFS into a self-contained document: its local
// .css and .js are inlined, and a tiny `openos` bridge is injected so the app
// can talk to the kernel over postMessage. The frame runs in an opaque origin
// (sandbox, no allow-same-origin), so it cannot touch the desktop DOM.

import { kernel } from '../kernel/kernel.ts'
import { dirname, resolve } from '../kernel/vfs.ts'

const BRIDGE = `<script>(function(){
  var id = 0, pending = new Map();
  addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.__openos !== true || d.reply !== true) return;
    var p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    if (d.ok) p.res(d.value); else p.rej(new Error(d.error));
  });
  function call(op, args) {
    return new Promise(function (res, rej) {
      var i = ++id;
      pending.set(i, { res: res, rej: rej });
      parent.postMessage({ __openos: true, id: i, op: op, args: args }, '*');
    });
  }
  window.openos = {
    read: function (p) { return call('read', [p]); },
    write: function (p, c) { return call('write', [p, c]); },
    ls: function (p) { return call('ls', [p]); },
    open: function (p) { return call('open', [p]); }
  };
})()</script>`

// Only absolute VFS paths are inlined; anything else (https, data:) is left
// alone so an app can still use a web library.
const scriptTag = /<script\s+src=["'](\/[^"']+\.js)["']\s*>\s*<\/script>/gi
const linkTag = /<link\s+[^>]*href=["'](\/[^"']+\.css)["'][^>]*>/gi

const inline = (path: string): string => {
  try {
    return kernel.read(path)
  } catch {
    return ''
  }
}

export function buildSrcdoc(appPath: string): string {
  const base = dirname(appPath)
  let html = kernel.read(appPath)

  html = html.replace(scriptTag, (_m, src: string) =>
    `<script>${inline(resolve(base, src)).replace(/<\/script/gi, '<\\/script')}</script>`,
  )
  html = html.replace(linkTag, (_m, href: string) => `<style>${inline(resolve(base, href))}</style>`)

  // Put the bridge first so app scripts can use `openos` at parse time.
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head[^>]*>/i, (m) => m + BRIDGE)
    : BRIDGE + html
}

export type BridgeOp = 'read' | 'write' | 'ls' | 'open'

export function runBridge(op: BridgeOp, args: unknown[]): unknown {
  switch (op) {
    case 'read':
      return kernel.read(String(args[0]))
    case 'write':
      kernel.write(String(args[0]), String(args[1]))
      return true
    case 'ls':
      return kernel.ls(String(args[0] ?? '/')).map((n) => ({
        name: n.name,
        type: n.type,
        path: resolve(String(args[0] ?? '/'), n.name),
      }))
    case 'open':
      kernel.spawn(String(args[0]))
      return true
  }
}