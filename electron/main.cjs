// Electron main process: a frameless window that loads the built Vite output.
// Nothing else — no native menus, no IPC. The OS lives in the renderer.

const { app, BrowserWindow, shell } = require('electron')
const path = require('node:path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 560,
    backgroundColor: '#0b0d12',
    title: 'OpenOS',
    // Keep the OS's own chrome (window title bar) out of the way on Linux/Win.
    autoHideMenuBar: true,
    webPreferences: {
      // The renderer is a sandboxed web app: no node, no preload bridge.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // External links open in the real browser, never inside the OS window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})