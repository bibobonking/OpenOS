// Run: npm test   (node --test, no framework)
// Guards the one thing that must never break: an app is a .html file whose
// local .css/.js are inlined and whose `openos` bridge is present.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { kernel } from '../kernel/kernel.ts'
import { buildSrcdoc, runBridge } from './appFrame.ts'

test('program html pulls its css and js out of the VFS', () => {
  const html = buildSrcdoc('/apps/hello.html')
  assert.match(html, /<style>body \{/)
  assert.match(html, /addEventListener\('click'/)
  assert.doesNotMatch(html, /src="\/apps\/hello\.js"/)
  assert.ok(html.indexOf('window.openos') < html.indexOf("addEventListener('click'"))
})

test('a missing program throws instead of rendering an empty frame', () => {
  assert.throws(() => buildSrcdoc('/apps/nope.html'))
})

test('the bridge reads and writes through the kernel', () => {
  kernel.write('/home/bridge.txt', 'one')
  assert.equal(runBridge('read', ['/home/bridge.txt']), 'one')
  runBridge('write', ['/home/bridge.txt', 'two'])
  assert.equal(kernel.read('/home/bridge.txt'), 'two')
  const entries = runBridge('ls', ['/home']) as { name: string }[]
  assert.ok(entries.some((e) => e.name === 'bridge.txt'))
})