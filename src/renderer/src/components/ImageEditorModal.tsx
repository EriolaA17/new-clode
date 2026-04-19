import { useState, useRef, useEffect, useCallback } from 'react'
import type { ImageShape } from '../types'

interface Props {
  shape: ImageShape
  onApply: (newSrc: string) => void
  onClose: () => void
}

type EditorTool = 'brush' | 'eraser' | 'crop'

interface CropRect { x: number; y: number; w: number; h: number }

const MAX_W = 700
const MAX_H = 480

export default function ImageEditorModal({ shape, onApply, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<EditorTool>('brush')
  const [brushSize, setBrushSize] = useState(16)
  const [brushColor, setBrushColor] = useState('#000000')
  const [brushOpacity, setBrushOpacity] = useState(100)
  const [isDrawing, setIsDrawing] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

  // Crop state (display pixels)
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 })
  const [dragHandle, setDragHandle] = useState<string | null>(null)
  const dragOrigin = useRef({ mx: 0, my: 0, cx: 0, cy: 0, cw: 0, ch: 0 })

  // Compute display size
  const scaleRef = useRef(1)
  const dispW = imgEl ? Math.round(imgEl.naturalWidth * scaleRef.current) : MAX_W
  const dispH = imgEl ? Math.round(imgEl.naturalHeight * scaleRef.current) : MAX_H

  // Load image onto canvas
  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      scaleRef.current = Math.min(MAX_W / img.naturalWidth, MAX_H / img.naturalHeight, 1)
      setImgEl(img)
      const dw = Math.round(img.naturalWidth * scaleRef.current)
      const dh = Math.round(img.naturalHeight * scaleRef.current)
      setCrop({ x: 0, y: 0, w: dw, h: dh })
    }
    img.src = shape.src
  }, [shape.src])

  // Draw image onto canvas when loaded
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imgEl) return
    canvas.width = dispW
    canvas.height = dispH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(imgEl, 0, 0, dispW, dispH)
  }, [imgEl, dispW, dispH])

  // ── Brush / Eraser ──────────────────────────────────────────────────────────

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const scaleX = dispW / rect.width
    const scaleY = dispH / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const paintAt = useCallback((ctx: CanvasRenderingContext2D, from: {x:number;y:number}, to: {x:number;y:number}) => {
    ctx.globalAlpha = brushOpacity / 100
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
    // Also fill at endpoint
    ctx.beginPath()
    ctx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = brushColor
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }, [tool, brushColor, brushSize, brushOpacity])

  const handleCanvasDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'crop') return
    const pos = getCanvasPos(e)
    setIsDrawing(true)
    lastPos.current = pos
    const ctx = canvasRef.current!.getContext('2d')!
    paintAt(ctx, pos, pos)
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || tool === 'crop') return
    const pos = getCanvasPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    paintAt(ctx, lastPos.current, pos)
    lastPos.current = pos
  }

  const handleCanvasUp = () => setIsDrawing(false)

  // ── Crop drag handles ───────────────────────────────────────────────────────

  const startCropDrag = (e: React.MouseEvent, handle: string) => {
    e.preventDefault(); e.stopPropagation()
    setDragHandle(handle)
    dragOrigin.current = { mx: e.clientX, my: e.clientY, cx: crop.x, cy: crop.y, cw: crop.w, ch: crop.h }
  }

  useEffect(() => {
    if (!dragHandle) return
    const MIN = 20
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - dragOrigin.current.mx
      const dy = e.clientY - dragOrigin.current.my
      const { cx, cy, cw, ch } = dragOrigin.current
      let nx = cx, ny = cy, nw = cw, nh = ch

      if (dragHandle === 'move') {
        nx = Math.max(0, Math.min(dispW - cw, cx + dx))
        ny = Math.max(0, Math.min(dispH - ch, cy + dy))
      } else {
        if (dragHandle.includes('r')) nw = Math.max(MIN, Math.min(dispW - cx, cw + dx))
        if (dragHandle.includes('l')) { nx = Math.max(0, Math.min(cx + cw - MIN, cx + dx)); nw = cw + cx - nx }
        if (dragHandle.includes('b')) nh = Math.max(MIN, Math.min(dispH - cy, ch + dy))
        if (dragHandle.includes('t')) { ny = Math.max(0, Math.min(cy + ch - MIN, cy + dy)); nh = ch + cy - ny }
      }
      setCrop({ x: nx, y: ny, w: nw, h: nh })
    }
    const onUp = () => setDragHandle(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [dragHandle, dispW, dispH])

  // ── Apply ───────────────────────────────────────────────────────────────────

  const handleApply = () => {
    const canvas = canvasRef.current; if (!canvas) return

    if (tool === 'crop') {
      // Crop using a temporary canvas
      const out = document.createElement('canvas')
      const rw = Math.round(crop.w); const rh = Math.round(crop.h)
      out.width = rw; out.height = rh
      const ctx = out.getContext('2d')!
      ctx.drawImage(canvas, Math.round(crop.x), Math.round(crop.y), rw, rh, 0, 0, rw, rh)
      onApply(out.toDataURL('image/png'))
    } else {
      onApply(canvas.toDataURL('image/png'))
    }
    onClose()
  }

  const handleReset = () => {
    const canvas = canvasRef.current; if (!canvas || !imgEl) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(imgEl, 0, 0, dispW, dispH)
    setCrop({ x: 0, y: 0, w: dispW, h: dispH })
  }

  const TOOLS: { id: EditorTool; label: string; icon: string }[] = [
    { id: 'brush', label: 'Brush', icon: 'M7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3zm13.71-9.37l-1.34-1.34a1 1 0 00-1.41 0L9 12.25 11.75 15l8.96-8.96a1 1 0 000-1.41z' },
    { id: 'eraser', label: 'Eraser', icon: 'M15.14 3c-.51 0-1.02.2-1.41.59L2.59 14.73c-.78.77-.78 2.05 0 2.83L5.03 20H20v-2h-6.21l7.07-7.07c.78-.78.78-2.05 0-2.83l-3.31-3.31c-.39-.39-.9-.59-1.41-.59zm0 2.41L18.46 8.7 16 11.17 12.83 8 15.14 5.41z' },
    { id: 'crop', label: 'Crop', icon: 'M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z' },
  ]

  const handles = ['tl','tc','tr','ml','mr','bl','bc','br']
  const handlePos = (h: string) => ({
    left: h.includes('l') ? crop.x - 5 : h.includes('r') ? crop.x + crop.w - 5 : crop.x + crop.w / 2 - 5,
    top:  h.includes('t') ? crop.y - 5 : h.includes('b') ? crop.y + crop.h - 5 : crop.y + crop.h / 2 - 5,
  })
  const handleCursor = (h: string) =>
    h === 'tl' || h === 'br' ? 'nwse-resize' :
    h === 'tr' || h === 'bl' ? 'nesw-resize' :
    h === 'tc' || h === 'bc' ? 'ns-resize' : 'ew-resize'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-[#252526] border border-[#3e3e3e] rounded-lg shadow-2xl flex flex-col" style={{ maxWidth: 820 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#3e3e3e]">
          <h2 className="text-white font-semibold">Image Editor</h2>
          <button onClick={onClose} className="text-[#888] hover:text-white w-7 h-7 flex items-center justify-center rounded hover:bg-[#3d3d3d]">✕</button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#3e3e3e] bg-[#1e1e1e]">
          {/* Tool buttons */}
          <div className="flex gap-1">
            {TOOLS.map(t => (
              <button key={t.id} title={t.label}
                onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium ${tool === t.id ? 'bg-[#0079FF] text-white' : 'text-[#aaa] hover:text-white hover:bg-[#3d3d3d]'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={t.icon} /></svg>
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-[#3e3e3e]" />

          {/* Brush settings */}
          {tool !== 'crop' && (<>
            <label className="flex items-center gap-1.5 text-xs text-[#999]">
              Size
              <input type="range" min={1} max={80} value={brushSize} onChange={e => setBrushSize(+e.target.value)}
                className="w-20 accent-[#0079FF]" />
              <span className="w-5 text-[#ccc]">{brushSize}</span>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#999]">
              Color
              <div className="w-6 h-6 rounded border border-[#555] overflow-hidden">
                <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)}
                  className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer" />
              </div>
            </label>
            <label className="flex items-center gap-1.5 text-xs text-[#999]">
              Opacity
              <input type="range" min={1} max={100} value={brushOpacity} onChange={e => setBrushOpacity(+e.target.value)}
                className="w-16 accent-[#0079FF]" />
              <span className="w-6 text-[#ccc]">{brushOpacity}%</span>
            </label>
          </>)}

          {/* Crop info */}
          {tool === 'crop' && (
            <span className="text-xs text-[#888]">
              {Math.round(crop.w)} × {Math.round(crop.h)} px — drag handles to adjust
            </span>
          )}

          <div className="flex-1" />

          <button onClick={handleReset} className="text-xs text-[#888] hover:text-[#ccc] px-2 py-1 rounded hover:bg-[#3d3d3d]">Reset</button>
        </div>

        {/* Canvas area */}
        <div className="p-4 overflow-auto bg-[#161616] flex items-center justify-center" style={{ minHeight: 200 }}>
          <div className="relative inline-block" style={{ cursor: tool === 'crop' ? 'default' : (tool === 'eraser' ? 'cell' : 'crosshair') }}>
            <canvas
              ref={canvasRef}
              style={{ display: 'block', maxWidth: MAX_W, maxHeight: MAX_H, imageRendering: 'pixelated' }}
              onMouseDown={handleCanvasDown}
              onMouseMove={handleCanvasMove}
              onMouseUp={handleCanvasUp}
              onMouseLeave={handleCanvasUp}
            />

            {/* Crop overlay */}
            {tool === 'crop' && imgEl && (<>
              {/* Dark mask outside crop */}
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <svg width={dispW} height={dispH} style={{ position: 'absolute', top: 0, left: 0 }}>
                  <defs>
                    <mask id="crop-mask">
                      <rect width={dispW} height={dispH} fill="white" />
                      <rect x={crop.x} y={crop.y} width={crop.w} height={crop.h} fill="black" />
                    </mask>
                  </defs>
                  <rect width={dispW} height={dispH} fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
                  <rect x={crop.x} y={crop.y} width={crop.w} height={crop.h} fill="none" stroke="#0079FF" strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
              </div>

              {/* Move handle (inside rect) */}
              <div style={{ position: 'absolute', left: crop.x, top: crop.y, width: crop.w, height: crop.h, cursor: 'move' }}
                onMouseDown={e => startCropDrag(e, 'move')} />

              {/* 8 resize handles */}
              {handles.map(h => (
                <div key={h} style={{
                  position: 'absolute', width: 10, height: 10,
                  left: handlePos(h).left, top: handlePos(h).top,
                  background: '#fff', border: '1.5px solid #0079FF',
                  borderRadius: 2, cursor: handleCursor(h), zIndex: 10,
                }} onMouseDown={e => startCropDrag(e, h)} />
              ))}
            </>)}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-3 border-t border-[#3e3e3e]">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-[#999] hover:text-white rounded border border-[#3e3e3e] hover:border-[#555]">Cancel</button>
          <div className="flex-1" />
          <button onClick={handleApply} className="px-5 py-1.5 text-sm font-medium bg-[#0079FF] hover:bg-[#0060cc] text-white rounded">
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
