// Run: npm test   (node --test, no framework)
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  FsError,
  basename,
  clone,
  dir,
  dirname,
  exists,
  file,
  list,
  lookup,
  mkdir,
  mkdirp,
  normalize,
  readFile,
  rename,
  resolve,
  rm,
  writeFile,
} from './vfs.ts'

const tree = () =>
  dir('/', {
    home: dir('home', { 'note.txt': file('note.txt', 'hi') }),
    apps: dir('apps'),
  })

test('normalize collapses . .. and duplicate slashes', () => {
  assert.equal(normalize('/a/./b/../c//d'), '/a/c/d')
  assert.equal(normalize('/../..'), '/')
})

test('resolve makes relative paths absolute', () => {
  assert.equal(resolve('/home/user', '../apps/x.html'), '/home/apps/x.html')
  assert.equal(resolve('/home', '/etc/theme.json'), '/etc/theme.json')
})

test('dirname/basename', () => {
  assert.equal(dirname('/home/a/b.txt'), '/home/a')
  assert.equal(dirname('/x'), '/')
  assert.equal(basename('/home/a/b.txt'), 'b.txt')
})

test('read, write, mkdir, list', () => {
  const root = tree()
  assert.equal(readFile(root, '/home/note.txt'), 'hi')
  writeFile(root, '/home/new.md', '# hi')
  assert.equal(lookup(root, '/home/new.md').name, 'new.md')
  assert.equal(lookup(root, '/home/new.md').type === 'file' && lookup(root, '/home/new.md').mtime > 0, true)
  mkdir(root, '/home/sub')
  assert.deepEqual(
    list(root, '/home').map((n) => n.name),
    ['sub', 'new.md', 'note.txt'],
  )
})

test('mkdirp creates the whole chain', () => {
  const root = tree()
  mkdirp(root, '/system/themes/dark')
  assert.ok(exists(root, '/system/themes/dark'))
})

test('errors are typed, not generic throws', () => {
  const root = tree()
  assert.throws(() => readFile(root, '/nope'), (e) => e instanceof FsError && e.code === 'ENOENT')
  assert.throws(() => readFile(root, '/home'), (e) => e instanceof FsError && e.code === 'EISDIR')
  assert.throws(() => mkdir(root, '/home/sub/../note.txt'), (e) => e instanceof FsError && e.code === 'EEXIST')
})

test('rm refuses non-empty dirs unless recursive', () => {
  const root = tree()
  assert.throws(() => rm(root, '/home'), (e) => e instanceof FsError)
  rm(root, '/home', true)
  assert.equal(exists(root, '/home'), false)
})

test('rename moves without leaving a dangling child', () => {
  const root = tree()
  rename(root, '/home/note.txt', '/apps/note.txt')
  assert.equal(exists(root, '/home/note.txt'), false)
  assert.equal(readFile(root, '/apps/note.txt'), 'hi')
  const home = lookup(root, '/home')
  assert.equal(home.type, 'dir')
  assert.deepEqual(home.type === 'dir' ? Object.keys(home.children) : [], [])
})

test('clone is a deep copy', () => {
  const root = tree()
  const copy = clone(root)
  writeFile(copy, '/home/note.txt', 'changed')
  assert.equal(readFile(root, '/home/note.txt'), 'hi')
})