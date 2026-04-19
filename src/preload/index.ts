import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  openFile: (): Promise<{ path: string; content: string } | null> =>
    ipcRenderer.invoke('dialog:openFile'),

  saveFile: (content: string, defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveFile', { content, defaultName }),

  exportPNG: (defaultName: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:exportPNG', { defaultName }),

  savePNG: (filePath: string, data: string): Promise<boolean> =>
    ipcRenderer.invoke('file:savePNG', { filePath, data }),
})

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ path: string; content: string } | null>
      saveFile: (content: string, defaultName: string) => Promise<string | null>
      exportPNG: (defaultName: string) => Promise<string | null>
      savePNG: (filePath: string, data: string) => Promise<boolean>
    }
  }
}
