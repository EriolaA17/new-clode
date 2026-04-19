/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    openFile: () => Promise<{ path: string; content: string } | null>
    saveFile: (content: string, defaultName: string) => Promise<string | null>

    exportPNG: (defaultName: string) => Promise<string | null>
    savePNG: (filePath: string, data: string) => Promise<boolean>

    exportWebP: (defaultName: string) => Promise<string | null>
    saveWebP: (filePath: string, data: string) => Promise<boolean>

    exportSVG: (defaultName: string) => Promise<string | null>
    saveSVG: (filePath: string, svg: string) => Promise<boolean>

    exportTGS: (defaultName: string) => Promise<string | null>
    saveTGS: (filePath: string, lottie: string) => Promise<boolean>

    importImage: () => Promise<string | null>

    exportGIF: (defaultName: string) => Promise<string | null>
    saveGIF: (filePath: string, data: string) => Promise<boolean>
  }
}
