import { useState, useRef, useEffect } from 'react'
import { useDesignStore } from '../store'
import type { ImageShape } from '../types'

interface Slice { dataURL: string; row: number; col: number }

export default function SpriteSlicerModal({ onClose }: { onClose: () => void }) {
  const { addShapes } = useDesignStore()

  const [src, setSrc] = useState<string | null>(null)
  const [cols, setCols] = useState(4)
  const [rows, setRows] = useState(6)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [slices, setSlices] = useState<Slice[]>([])
  const previewRef = useRef<HTMLCanvasElement>(null)

  const loadFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => setSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Load image element when src changes
  useEffect(() => {
    if (!src) return
    const img = new window.Image()
    img.onload = () => setImgEl(img)
    img.src = src
  }, [src])

  // Draw preview with grid overlay
  useEffect(() => {
    const canvas = previewRef.current
    if (!canvas || !imgEl) return
    const maxW = 520; const maxH = 320
    const scale = Math.min(maxW / imgEl.width, maxH / imgEl.height, 1)
    canvas.width = Math.round(imgEl.width * scale)
    canvas.height = Math.round(imgEl.height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = 'rgba(0, 121, 255, 0.8)'
    ctx.lineWidth = 1
    const cw = canvas.width / cols; const ch = canvas.height / rows
    for (let c = 1; c < cols; c++) { ctx.beginPath(); ctx.moveTo(c * cw, 0); ctx.lineTo(c * cw, canvas.height); ctx.stroke() }
    for (let r = 1; r < rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * ch); ctx.lineTo(canvas.width, r * ch); ctx.stroke() }

    // Generate slices
    const sw = Math.floor(imgEl.width / cols); const sh = Math.floor(imgEl.height / rows)
    const newSlices: Slice[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sc = document.createElement('canvas')
        sc.width = sw; sc.height = sh
        const sctx = sc.getContext('2d')!
        sctx.drawImage(imgEl, c * sw, r * sh, sw, sh, 0, 0, sw, sh)
        newSlices.push({ dataURL: sc.toDataURL('image/png'), row: r, col: c })
      }
    }
    setSlices(newSlices)
  }, [imgEl, cols, rows])

  const handleImportAsLayers = () => {
    if (!imgEl || slices.length === 0) return
    const sw = Math.floor(imgEl.width / cols); const sh = Math.floor(imgEl.height / rows)
    const maxDim = 200
    const scale = Math.min(1, maxDim / Math.max(sw, sh))
    const shapes: Omit<ImageShape, 'id'>[] = slices.map((sl, i) => ({
      type: 'image' as const,
      name: `Slice ${sl.row + 1}-${sl.col + 1}`,
      x: sl.col * (sw * scale + 10),
      y: sl.row * (sh * scale + 10),
      width: sw * scale,
      height: sh * scale,
      rotation: 0, opacity: 1, visible: true, locked: false,
      fill: '', stroke: '', strokeWidth: 0,
      src: sl.dataURL,
      naturalWidth: sw, naturalHeight: sh,
    }))
    addShapes(shapes as Omit<ImageShape, 'id'>[])
    onClose()
  }

  const handleExportAll = async () => {
    if (!window.electronAPI || slices.length === 0) return
    const dir = await window.electronAPI.chooseDirectory()
    if (!dir) return
    await window.electronAPI.saveSlices(dir, slices.map((sl, i) => ({ name: `slice_${i + 1}.png`, data: sl.dataURL })))
    alert(`${slices.length} slices saved to ${dir}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#252526] border border-[#3e3e3e] rounded-lg shadow-2xl flex flex-col" style={{ width: 600, maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#3e3e3e]">
          <h2 className="text-white font-semibold">Sprite Sheet Slicer</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white w-7 h-7 flex items-center justify-center rounded hover:bg-[#3d3d3d]">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
          {/* Drop zone */}
          {!src ? (
            <div
              className="border-2 border-dashed border-[#3e3e3e] rounded-lg flex flex-col items-center justify-center py-12 text-[#555] hover:border-[#0079FF] hover:text-[#0079FF] cursor-pointer transition-colors"
              onClick={() => { const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*'; inp.onchange=()=>{ if(inp.files?.[0]) loadFile(inp.files[0]) }; inp.click() }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) loadFile(f) }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" className="mb-2 opacity-50">
                <path d="M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H3V5h18v14zm-9-7l-3 4H6l3-4 2 2.5L14 9l4 6H9l3-4z" />
              </svg>
              <span className="text-sm">Drop sprite sheet here or click to browse</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <canvas ref={previewRef} className="border border-[#3e3e3e] rounded max-w-full" />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-[#ccc]">
              Columns
              <input type="number" value={cols} min={1} max={64}
                onChange={e => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 panel-input text-center" />
            </label>
            <label className="flex items-center gap-2 text-sm text-[#ccc]">
              Rows
              <input type="number" value={rows} min={1} max={64}
                onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 panel-input text-center" />
            </label>
            {imgEl && (
              <span className="text-xs text-[#666]">
                {Math.floor(imgEl.width / cols)}×{Math.floor(imgEl.height / rows)}px per slice · {cols * rows} total
              </span>
            )}
            {src && (
              <button className="ml-auto text-xs text-[#666] hover:text-[#ccc] underline"
                onClick={() => { setSrc(null); setImgEl(null); setSlices([]) }}>Change image</button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-[#3e3e3e]">
          <button
            disabled={slices.length === 0}
            onClick={handleImportAsLayers}
            className="flex-1 bg-[#0079FF] hover:bg-[#0060cc] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm py-1.5 rounded font-medium"
          >
            Import as Layers ({slices.length})
          </button>
          <button
            disabled={slices.length === 0 || !window.electronAPI}
            onClick={handleExportAll}
            className="flex-1 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-40 disabled:cursor-not-allowed text-[#ccc] text-sm py-1.5 rounded border border-[#3e3e3e]"
          >
            Export All Slices…
          </button>
        </div>
      </div>
    </div>
  )
}
