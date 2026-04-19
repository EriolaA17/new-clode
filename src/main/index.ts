import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { gzipSync } from 'zlib'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1e1e1e',
    title: 'Figma Local',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.on('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
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

// ─── File dialogs ─────────────────────────────────────────────────────────────

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Figma Local Files', extensions: ['flocal', 'json'] }],
    properties: ['openFile'],
  })
  if (result.canceled || !result.filePaths[0]) return null
  const content = readFileSync(result.filePaths[0], 'utf-8')
  return { path: result.filePaths[0], content }
})

ipcMain.handle('dialog:saveFile', async (_, { content, defaultName }: { content: string; defaultName: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${defaultName}.flocal`,
    filters: [{ name: 'Figma Local Files', extensions: ['flocal'] }],
  })
  if (result.canceled || !result.filePath) return null
  writeFileSync(result.filePath, content, 'utf-8')
  return result.filePath
})

ipcMain.handle('dialog:exportPNG', async (_, { defaultName }: { defaultName: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${defaultName}.png`,
    filters: [{ name: 'PNG Image', extensions: ['png'] }],
  })
  return result.canceled ? null : result.filePath ?? null
})

ipcMain.handle('dialog:exportWebP', async (_, { defaultName }: { defaultName: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${defaultName}.webp`,
    filters: [{ name: 'WebP Image', extensions: ['webp'] }],
  })
  return result.canceled ? null : result.filePath ?? null
})

ipcMain.handle('dialog:exportSVG', async (_, { defaultName }: { defaultName: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${defaultName}.svg`,
    filters: [{ name: 'SVG Vector', extensions: ['svg'] }],
  })
  return result.canceled ? null : result.filePath ?? null
})

ipcMain.handle('dialog:exportTGS', async (_, { defaultName }: { defaultName: string }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: `${defaultName}.tgs`,
    filters: [{ name: 'Telegram Sticker (TGS)', extensions: ['tgs'] }],
  })
  return result.canceled ? null : result.filePath ?? null
})

// ─── File savers ──────────────────────────────────────────────────────────────

ipcMain.handle('file:savePNG', async (_, { filePath, data }: { filePath: string; data: string }) => {
  const base64 = data.replace(/^data:image\/png;base64,/, '')
  writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return true
})

ipcMain.handle('file:saveWebP', async (_, { filePath, data }: { filePath: string; data: string }) => {
  const base64 = data.replace(/^data:image\/webp;base64,/, '').replace(/^data:image\/png;base64,/, '')
  writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return true
})

ipcMain.handle('file:saveSVG', async (_, { filePath, svg }: { filePath: string; svg: string }) => {
  writeFileSync(filePath, svg, 'utf-8')
  return true
})

/** Receives a Lottie JSON string, gzip-compresses it, writes as .tgs */
ipcMain.handle('file:saveTGS', async (_, { filePath, lottie }: { filePath: string; lottie: string }) => {
  const compressed = gzipSync(Buffer.from(lottie, 'utf-8'), { level: 9 })
  writeFileSync(filePath, compressed)
  return true
})
