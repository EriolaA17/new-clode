import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Ellipse, Text, Line, Transformer } from 'react-konva'
import { useDesignStore } from '../store'
import type { Shape, RectShape, FrameShape, EllipseShape, TextShape, LineShape } from '../types'

// ─── Individual shape renderer ────────────────────────────────────────────────

interface ShapeNodeProps {
  shape: Shape
  onSelect: (id: string, multi: boolean) => void
  onDragEnd: (id: string, x: number, y: number) => void
  onTransformEnd: (id: string) => void
  stageRef: React.RefObject<Konva.Stage>
}

function ShapeNode({ shape, onSelect, onDragEnd, onTransformEnd, stageRef }: ShapeNodeProps) {
  const { updateShape } = useDesignStore()
  const nodeRef = useRef<Konva.Node>(null)

  const handleDblClick = useCallback(() => {
    if (shape.type !== 'text') return
    const ts = shape as TextShape
    const stage = stageRef.current
    const node = nodeRef.current as Konva.Text | null
    if (!stage || !node) return

    node.hide()
    const absPos = node.absolutePosition()
    const box = stage.container().getBoundingClientRect()
    const z = useDesignStore.getState().zoom

    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    Object.assign(ta.style, {
      position: 'fixed',
      top: `${box.top + absPos.y}px`,
      left: `${box.left + absPos.x}px`,
      width: `${ts.width * z + 4}px`,
      minHeight: `${ts.fontSize * z * 1.5}px`,
      fontSize: `${ts.fontSize * z}px`,
      fontFamily: ts.fontFamily || 'Inter, sans-serif',
      fontStyle: ts.fontStyle || 'normal',
      color: ts.fill || '#000000',
      lineHeight: String(ts.lineHeight || 1.2),
      border: '1px solid #0079FF',
      padding: '2px',
      margin: '0',
      overflow: 'hidden',
      background: 'rgba(40,40,40,0.95)',
      outline: 'none',
      resize: 'none',
      zIndex: '9999',
      borderRadius: '2px',
    })
    ta.value = ts.text
    ta.focus()
    ta.select()

    const finish = () => {
      updateShape(shape.id, { text: ta.value })
      node.show()
      if (document.body.contains(ta)) document.body.removeChild(ta)
    }
    ta.addEventListener('blur', finish, { once: true })
    ta.addEventListener('keydown', (e) => { if (e.key === 'Escape') ta.blur() })
  }, [shape, updateShape, stageRef])

  const common = {
    id: shape.id,
    rotation: shape.rotation,
    opacity: shape.opacity,
    visible: shape.visible,
    draggable: !shape.locked,
    onClick: (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      onSelect(shape.id, e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey)
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onDragEnd(shape.id, e.target.x(), e.target.y())
    },
    onTransformEnd: () => onTransformEnd(shape.id),
  }

  switch (shape.type) {
    case 'rect':
    case 'frame': {
      const s = shape as RectShape | FrameShape
      return (
        <Rect
          ref={nodeRef as React.RefObject<Konva.Rect>}
          {...common}
          x={s.x} y={s.y} width={s.width} height={s.height}
          fill={s.fill || 'transparent'}
          stroke={s.stroke || undefined} strokeWidth={s.strokeWidth || 0}
          cornerRadius={s.cornerRadius || 0}
        />
      )
    }
    case 'ellipse': {
      const s = shape as EllipseShape
      return (
        <Ellipse
          ref={nodeRef as React.RefObject<Konva.Ellipse>}
          {...common}
          x={s.x + s.width / 2} y={s.y + s.height / 2}
          radiusX={Math.max(1, s.width / 2)} radiusY={Math.max(1, s.height / 2)}
          fill={s.fill || 'transparent'}
          stroke={s.stroke || undefined} strokeWidth={s.strokeWidth || 0}
          onDragEnd={(e) => onDragEnd(shape.id, e.target.x() - s.width / 2, e.target.y() - s.height / 2)}
        />
      )
    }
    case 'text': {
      const s = shape as TextShape
      return (
        <Text
          ref={nodeRef as React.RefObject<Konva.Text>}
          {...common}
          x={s.x} y={s.y} width={s.width}
          text={s.text || ''}
          fontSize={s.fontSize || 16}
          fontFamily={s.fontFamily || 'Inter, sans-serif'}
          fontStyle={s.fontStyle || 'normal'}
          fill={s.fill || '#000000'}
          align={s.textAlign || 'left'}
          lineHeight={s.lineHeight || 1.2}
          onDblClick={handleDblClick}
        />
      )
    }
    case 'line': {
      const s = shape as LineShape
      return (
        <Line
          ref={nodeRef as React.RefObject<Konva.Line>}
          {...common}
          x={s.x} y={s.y} points={s.points}
          stroke={s.fill || '#000000'} strokeWidth={s.strokeWidth || 2}
          lineCap="round" lineJoin="round" hitStrokeWidth={12}
        />
      )
    }
    default:
      return null
  }
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

interface DrawState {
  active: boolean
  startX: number
  startY: number
  preview: Shape | null
}

const EMPTY_DRAW: DrawState = { active: false, startX: 0, startY: 0, preview: null }

export default function Canvas() {
  const {
    shapes, selectedIds, activeTool, zoom, stageX, stageY,
    addShape, updateShape, selectShape, clearSelection,
    setZoom, setStagePosition, pushHistory,
  } = useDesignStore()

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [draw, setDraw] = useState<DrawState>(EMPTY_DRAW)
  const [panning, setPanning] = useState(false)
  const panOriginRef = useRef({ x: 0, y: 0 })
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 })

  // Measure container synchronously before paint to avoid a 0-size flash
  useLayoutEffect(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) setStageSize({ w: r.width, h: r.height })
    }
  }, [])

  // Keep stage size in sync with container
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const e = entries[0]
      if (e) setStageSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // PNG export
  useEffect(() => {
    const h = async (e: CustomEvent<{ filePath: string }>) => {
      const s = stageRef.current; if (!s) return
      await window.electronAPI?.savePNG(e.detail.filePath, s.toDataURL({ pixelRatio: 2, mimeType: 'image/png' }))
    }
    window.addEventListener('figma:export-png', h as unknown as EventListener)
    return () => window.removeEventListener('figma:export-png', h as unknown as EventListener)
  }, [])

  // WebP export
  useEffect(() => {
    const h = async (e: CustomEvent<{ filePath: string }>) => {
      const s = stageRef.current; if (!s) return
      await window.electronAPI?.saveWebP(e.detail.filePath, s.toDataURL({ pixelRatio: 2, mimeType: 'image/webp' }))
    }
    window.addEventListener('figma:export-webp', h as unknown as EventListener)
    return () => window.removeEventListener('figma:export-webp', h as unknown as EventListener)
  }, [])

  // Spacebar pan toggle
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault(); setSpaceHeld(true)
      }
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])

  // Sync transformer to selection
  useEffect(() => {
    const tr = transformerRef.current; const stage = stageRef.current
    if (!tr || !stage) return
    const nodes = selectedIds.map(id => stage.findOne(`#${id}`)).filter(Boolean) as Konva.Node[]
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, shapes])

  // Canvas coordinate from Konva pointer position
  const getCanvasPos = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const p = stage.getPointerPosition()
    if (!p) return { x: 0, y: 0 }
    return { x: (p.x - stageX) / zoom, y: (p.y - stageY) / zoom }
  }, [stageX, stageY, zoom])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current; if (!stage) return
    const p = stage.getPointerPosition(); if (!p) return
    const factor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08
    const nz = Math.max(0.05, Math.min(10, zoom * factor))
    const mp = { x: (p.x - stageX) / zoom, y: (p.y - stageY) / zoom }
    setZoom(nz)
    setStagePosition(p.x - mp.x * nz, p.y - mp.y * nz)
  }, [zoom, stageX, stageY, setZoom, setStagePosition])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // e.target === e.currentTarget means the click landed on the Stage background
    const onBackground = e.target === e.currentTarget
    const panMode = activeTool === 'hand' || spaceHeld

    if (panMode) {
      setPanning(true)
      panOriginRef.current = { x: e.evt.clientX - stageX, y: e.evt.clientY - stageY }
      return
    }

    if (!onBackground) return   // clicked a shape — let the shape's onClick handle it

    if (activeTool === 'select') { clearSelection(); return }

    const pos = getCanvasPos()

    if (activeTool === 'text') {
      addShape({
        type: 'text', name: 'Text',
        x: pos.x, y: pos.y, width: 200, height: 40,
        rotation: 0, opacity: 1, visible: true, locked: false,
        fill: '#000000', stroke: '', strokeWidth: 0,
        text: 'Double-click to edit',
        fontSize: 16, fontFamily: 'Inter, sans-serif', fontStyle: 'normal',
        textAlign: 'left', lineHeight: 1.2,
      } as Omit<Shape, 'id'>)
      return
    }

    const base = { x: pos.x, y: pos.y, width: 0, height: 0, rotation: 0, opacity: 1, visible: true, locked: false, stroke: '', strokeWidth: 0 }
    let preview: Shape | null = null
    const pid = '__preview__'

    switch (activeTool) {
      case 'rect':    preview = { ...base, id: pid, type: 'rect',    name: 'Rectangle', fill: '#E0E0E0', cornerRadius: 0 } as RectShape;  break
      case 'frame':   preview = { ...base, id: pid, type: 'frame',   name: 'Frame',     fill: '#FFFFFF', cornerRadius: 0 } as FrameShape; break
      case 'ellipse': preview = { ...base, id: pid, type: 'ellipse', name: 'Ellipse',   fill: '#E0E0E0' } as EllipseShape; break
      case 'line':    preview = { ...base, id: pid, type: 'line',    name: 'Line',      fill: '#1a1a1a', strokeWidth: 2, points: [0, 0, 0, 0] } as LineShape; break
    }

    if (preview) setDraw({ active: true, startX: pos.x, startY: pos.y, preview })
  }, [activeTool, spaceHeld, stageX, stageY, clearSelection, addShape, getCanvasPos])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (panning) {
      setStagePosition(e.evt.clientX - panOriginRef.current.x, e.evt.clientY - panOriginRef.current.y)
      return
    }
    if (!draw.active || !draw.preview) return

    const pos = getCanvasPos()
    const { startX, startY } = draw
    const x = Math.min(pos.x, startX)
    const y = Math.min(pos.y, startY)
    const w = Math.abs(pos.x - startX)
    const h = Math.abs(pos.y - startY)

    const updated: Shape = draw.preview.type === 'line'
      ? { ...draw.preview, points: [0, 0, pos.x - startX, pos.y - startY] } as LineShape
      : { ...draw.preview, x, y, width: w, height: h }

    setDraw(prev => ({ ...prev, preview: updated }))
  }, [panning, draw, getCanvasPos, setStagePosition])

  const handleMouseUp = useCallback(() => {
    if (panning) { setPanning(false); return }
    if (!draw.active || !draw.preview) return
    const s = draw.preview
    const ok = s.type === 'line' || (s.width >= 5 && s.height >= 5)
    if (ok) {
      const { id: _id, ...data } = s
      addShape(data as Omit<Shape, 'id'>)
    }
    setDraw(EMPTY_DRAW)
  }, [panning, draw, addShape])

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    updateShape(id, { x, y }); pushHistory()
  }, [updateShape, pushHistory])

  const handleTransformEnd = useCallback((id: string) => {
    const stage = stageRef.current; if (!stage) return
    const node = stage.findOne(`#${id}`); if (!node) return
    const shape = useDesignStore.getState().shapes.find(s => s.id === id); if (!shape) return

    const sx = node.scaleX(); const sy = node.scaleY()
    node.scaleX(1); node.scaleY(1)
    const updates: Partial<Shape> = { rotation: node.rotation(), x: node.x(), y: node.y() }

    if (shape.type === 'ellipse') {
      const ell = node as Konva.Ellipse
      const rX = ell.radiusX() * sx; const rY = ell.radiusY() * sy
      ell.radiusX(rX); ell.radiusY(rY)
      updates.width = rX * 2; updates.height = rY * 2
      updates.x = node.x() - rX; updates.y = node.y() - rY
    } else if (shape.type === 'text') {
      ;(updates as Partial<TextShape>).fontSize = Math.round((shape as TextShape).fontSize * sx)
    } else if (shape.type === 'line') {
      ;(updates as Partial<LineShape>).points = (shape as LineShape).points.map((p, i) => p * (i % 2 === 0 ? sx : sy))
    } else {
      updates.width = Math.max(1, shape.width * sx)
      updates.height = Math.max(1, shape.height * sy)
    }

    updateShape(id, updates); pushHistory()
  }, [updateShape, pushHistory])

  const cursor = spaceHeld || activeTool === 'hand'
    ? (panning ? 'grabbing' : 'grab')
    : activeTool === 'select' ? 'default' : 'crosshair'

  const { preview } = draw

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#383838]" style={{ cursor }}>
      {/* Zoom badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#252526] text-[#999] text-xs px-2 py-1 rounded pointer-events-none select-none">
        {Math.round(zoom * 100)}%
      </div>

      {stageSize.w > 0 && stageSize.h > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.w}
          height={stageSize.h}
          scaleX={zoom} scaleY={zoom}
          x={stageX} y={stageY}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <Layer ref={layerRef}>
            {shapes.map(shape => (
              <ShapeNode
                key={shape.id}
                shape={shape}
                onSelect={selectShape}
                onDragEnd={handleDragEnd}
                onTransformEnd={handleTransformEnd}
                stageRef={stageRef}
              />
            ))}

            {/* Live drawing preview */}
            {preview && (() => {
              const dash = [4 / zoom, 4 / zoom]
              const sw = 1.5 / zoom
              switch (preview.type) {
                case 'rect': case 'frame':
                  return <Rect x={preview.x} y={preview.y} width={preview.width} height={preview.height}
                    fill={(preview as RectShape).fill} stroke="#0079FF" strokeWidth={sw} dash={dash} listening={false} />
                case 'ellipse':
                  return <Ellipse x={preview.x + preview.width / 2} y={preview.y + preview.height / 2}
                    radiusX={preview.width / 2} radiusY={preview.height / 2}
                    fill={(preview as EllipseShape).fill} stroke="#0079FF" strokeWidth={sw} dash={dash} listening={false} />
                case 'line':
                  return <Line x={preview.x} y={preview.y} points={(preview as LineShape).points}
                    stroke="#0079FF" strokeWidth={2 / zoom} listening={false} />
                default: return null
              }
            })()}

            <Transformer
              ref={transformerRef}
              rotateEnabled
              enabledAnchors={['top-left','top-center','top-right','middle-right','bottom-right','bottom-center','bottom-left','middle-left']}
              boundBoxFunc={(old, nw) => (nw.width < 5 || nw.height < 5 ? old : nw)}
              anchorSize={8}
              anchorCornerRadius={2}
              borderStroke="#0079FF"
              anchorStroke="#0079FF"
              anchorFill="#ffffff"
            />
          </Layer>
        </Stage>
      )}
    </div>
  )
}
