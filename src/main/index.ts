import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

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
  if (result.canceled || !result.filePath) return null
  return result.filePath
})

ipcMain.handle('file:savePNG', async (_, { filePath, data }: { filePath: string; data: string }) => {
  const base64 = data.replace(/^data:image\/png;base64,/, '')
  writeFileSync(filePath, Buffer.from(base64, 'base64'))
  return true
})
