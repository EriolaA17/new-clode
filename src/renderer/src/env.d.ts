/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    openFile: () => Promise<{ path: string; content: string } | null>
    saveFile: (content: string, defaultName: string) => Promise<string | null>
    exportPNG: (defaultName: string) => Promise<string | null>
    savePNG: (filePath: string, data: string) => Promise<boolean>
  }
}
