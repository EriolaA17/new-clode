import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('dialog:openFile'),

  saveFile: (content: string, defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveFile', { content, defaultName }),

  // PNG
  exportPNG: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:exportPNG', { defaultName }),
  savePNG: (filePath: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('file:savePNG', { filePath, data }),

  // WebP
  exportWebP: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:exportWebP', { defaultName }),
  saveWebP: (filePath: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('file:saveWebP', { filePath, data }),

  // SVG
  exportSVG: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:exportSVG', { defaultName }),
  saveSVG: (filePath: string, svg: string): Promise<boolean> =>
    ipcRenderer.invoke('file:saveSVG', { filePath, svg }),

  // TGS (animated Telegram sticker — gzip Lottie JSON)
  exportTGS: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:exportTGS', { defaultName }),
  saveTGS: (filePath: string, lottie: string): Promise<boolean> =>
    ipcRenderer.invoke('file:saveTGS', { filePath, lottie }),

  // Image import
  importImage: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:importImage'),

  // GIF export
  exportGIF: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:exportGIF', { defaultName }),
  saveGIF: (filePath: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('file:saveGIF', { filePath, data }),

  // Sprite slicer
  chooseDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke('dialog:chooseDirectory'),
  saveSlices: (dir: string, slices: { name: string; data: string }[]): Promise<boolean> =>
    ipcRenderer.invoke('file:saveSlices', { dir, slices }),
})
