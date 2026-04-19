import { useRef, useState, useCallback, useEffect } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Ellipse, Text, Line, Transformer } from 'react-konva'
import { useDesignStore } from '../store'
import type { Shape, RectShape, FrameShape, EllipseShape, TextShape, LineShape } from '../types'

// ─── Shape renderer ────────────────────────────────────────────────────────────

interface ShapeNodeProps {
  shape: Shape
  isSelected: boolean
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
    const stageBox = stage.container().getBoundingClientRect()
    const zoom = useDesignStore.getState().zoom

    const ta = document.createElement('textarea')
    document.body.appendChild(ta)
    Object.assign(ta.style, {
      position: 'absolute',
      top: `${stageBox.top + absPos.y}px`,
      left: `${stageBox.left + absPos.x}px`,
      width: `${ts.width * zoom + 4}px`,
      minHeight: `${ts.fontSize * zoom * 1.5}px`,
      fontSize: `${ts.fontSize * zoom}px`,
      fontFamily: ts.fontFamily || 'Inter, sans-serif',
      fontStyle: ts.fontStyle || 'normal',
      color: ts.fill || '#000000',
      lineHeight: String(ts.lineHeight || 1.2),
      border: '1px solid #0079FF',
      padding: '2px',
      margin: '0',
      overflow: 'hidden',
      background: 'rgba(255,255,255,0.05)',
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
      document.body.removeChild(ta)
    }

    ta.addEventListener('blur', finish)
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') finish()
    })
  }, [shape, updateShape, stageRef])

  const commonProps = {
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
          {...commonProps}
          x={s.x}
          y={s.y}
          width={s.width}
          height={s.height}
          fill={s.fill || 'transparent'}
          stroke={s.stroke || undefined}
          strokeWidth={s.strokeWidth || 0}
          cornerRadius={s.cornerRadius || 0}
        />
      )
    }

    case 'ellipse': {
      const s = shape as EllipseShape
      const cx = s.x + s.width / 2
      const cy = s.y + s.height / 2
      return (
        <Ellipse
          ref={nodeRef as React.RefObject<Konva.Ellipse>}
          {...commonProps}
          x={cx}
          y={cy}
          radiusX={Math.max(1, s.width / 2)}
          radiusY={Math.max(1, s.height / 2)}
          fill={s.fill || 'transparent'}
          stroke={s.stroke || undefined}
          strokeWidth={s.strokeWidth || 0}
          onDragEnd={(e) => {
            const nx = e.target.x() - s.width / 2
            const ny = e.target.y() - s.height / 2
            onDragEnd(shape.id, nx, ny)
          }}
        />
      )
    }

    case 'text': {
      const s = shape as TextShape
      return (
        <Text
          ref={nodeRef as React.RefObject<Konva.Text>}
          {...commonProps}
          x={s.x}
          y={s.y}
          width={s.width}
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
          {...commonProps}
          x={s.x}
          y={s.y}
          points={s.points}
          stroke={s.fill || '#000000'}
          strokeWidth={s.strokeWidth || 2}
          lineCap="round"
          lineJoin="round"
          hitStrokeWidth={10}
        />
      )
    }

    default:
      return null
  }
}

// ─── Canvas ────────────────────────────────────────────────────────────────────

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
    setZoom, setStagePosition, pushHistory
  } = useDesignStore()

  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  const layerRef = useRef<Konva.Layer>(null)
  const [draw, setDraw] = useState<DrawState>(EMPTY_DRAW)
  const [panning, setPanning] = useState(false)
  const [panOrigin, setPanOrigin] = useState({ x: 0, y: 0 })
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [stageSize, setStageSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const containerRef = useRef<HTMLDivElement>(null)

  // Track container size
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setStageSize({ w: e.contentRect.width, h: e.contentRect.height })
      }
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Export PNG via stage
  useEffect(() => {
    const handler = async (e: CustomEvent<{ filePath: string }>) => {
      const stage = stageRef.current
      if (!stage) return
      const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
      await window.electronAPI?.savePNG(e.detail.filePath, dataURL)
    }
    window.addEventListener('figma:export-png', handler as unknown as EventListener)
    return () => window.removeEventListener('figma:export-png', handler as unknown as EventListener)
  }, [])

  // Spacebar for pan mode
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        setSpaceHeld(true)
      }
    }
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // Sync transformer nodes to selection
  useEffect(() => {
    const tr = transformerRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const nodes = selectedIds.map(id => stage.findOne(`#${id}`)).filter(Boolean) as Konva.Node[]
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selectedIds, shapes])

  const pointerToCanvas = useCallback((clientX: number, clientY: number) => {
    const stage = stageRef.current
    if (!stage) return { x: 0, y: 0 }
    const box = stage.container().getBoundingClientRect()
    return {
      x: (clientX - box.left - stageX) / zoom,
      y: (clientY - box.top - stageY) / zoom,
    }
  }, [stageX, stageY, zoom])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const factor = e.evt.deltaY < 0 ? 1.08 : 1 / 1.08
    const newZoom = Math.max(0.05, Math.min(10, zoom * factor))
    const mouseOn = { x: (pointer.x - stageX) / zoom, y: (pointer.y - stageY) / zoom }
    setZoom(newZoom)
    setStagePosition(pointer.x - mouseOn.x * newZoom, pointer.y - mouseOn.y * newZoom)
  }, [zoom, stageX, stageY, setZoom, setStagePosition])

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedStage = e.target === stageRef.current
    const panMode = activeTool === 'hand' || spaceHeld

    if (panMode) {
      setPanning(true)
      setPanOrigin({ x: e.evt.clientX - stageX, y: e.evt.clientY - stageY })
      return
    }

    if (!clickedStage) return

    if (activeTool === 'select') {
      clearSelection()
      return
    }

    const pos = pointerToCanvas(e.evt.clientX, e.evt.clientY)

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

    const base: Partial<Shape> = {
      x: pos.x, y: pos.y, width: 0, height: 0,
      rotation: 0, opacity: 1, visible: true, locked: false,
      stroke: '', strokeWidth: 0,
    }

    let preview: Shape | null = null
    const pid = '__preview__'

    switch (activeTool) {
      case 'rect':
        preview = { ...base, id: pid, type: 'rect', name: 'Rectangle', fill: '#E0E0E0', cornerRadius: 0 } as RectShape
        break
      case 'frame':
        preview = { ...base, id: pid, type: 'frame', name: 'Frame', fill: '#FFFFFF', cornerRadius: 0 } as FrameShape
        break
      case 'ellipse':
        preview = { ...base, id: pid, type: 'ellipse', name: 'Ellipse', fill: '#E0E0E0' } as EllipseShape
        break
      case 'line':
        preview = { ...base, id: pid, type: 'line', name: 'Line', fill: '#1a1a1a', strokeWidth: 2, points: [0, 0, 0, 0] } as LineShape
        break
    }

    if (preview) setDraw({ active: true, startX: pos.x, startY: pos.y, preview })
  }, [activeTool, spaceHeld, stageX, stageY, clearSelection, addShape, pointerToCanvas])

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (panning) {
      setStagePosition(e.evt.clientX - panOrigin.x, e.evt.clientY - panOrigin.y)
      return
    }
    if (!draw.active || !draw.preview) return

    const pos = pointerToCanvas(e.evt.clientX, e.evt.clientY)
    const { startX, startY } = draw
    const x = Math.min(pos.x, startX)
    const y = Math.min(pos.y, startY)
    const w = Math.abs(pos.x - startX)
    const h = Math.abs(pos.y - startY)

    let updated: Shape
    if (draw.preview.type === 'line') {
      updated = { ...draw.preview, points: [0, 0, pos.x - startX, pos.y - startY] } as LineShape
    } else {
      updated = { ...draw.preview, x, y, width: w, height: h }
    }
    setDraw(prev => ({ ...prev, preview: updated }))
  }, [panning, panOrigin, draw, pointerToCanvas, setStagePosition])

  const handleMouseUp = useCallback(() => {
    if (panning) { setPanning(false); return }
    if (!draw.active || !draw.preview) return

    const s = draw.preview
    const tooSmall = s.type !== 'line' && (s.width < 5 || s.height < 5)

    if (!tooSmall) {
      const { id: _id, ...data } = s
      addShape(data as Omit<Shape, 'id'>)
    }
    setDraw(EMPTY_DRAW)
  }, [panning, draw, addShape])

  const handleDragEnd = useCallback((id: string, x: number, y: number) => {
    updateShape(id, { x, y })
    pushHistory()
  }, [updateShape, pushHistory])

  const handleTransformEnd = useCallback((id: string) => {
    const stage = stageRef.current
    if (!stage) return
    const node = stage.findOne(`#${id}`)
    if (!node) return

    const shape = useDesignStore.getState().shapes.find(s => s.id === id)
    if (!shape) return

    const scaleX = node.scaleX()
    const scaleY = node.scaleY()
    node.scaleX(1)
    node.scaleY(1)

    const updates: Partial<Shape> = { rotation: node.rotation(), x: node.x(), y: node.y() }

    if (shape.type === 'ellipse') {
      const ell = node as Konva.Ellipse
      const rX = ell.radiusX() * scaleX
      const rY = ell.radiusY() * scaleY
      ell.radiusX(rX)
      ell.radiusY(rY)
      updates.width = rX * 2
      updates.height = rY * 2
      updates.x = node.x() - rX
      updates.y = node.y() - rY
    } else if (shape.type === 'text') {
      ;(updates as Partial<TextShape>).fontSize = Math.round((shape as TextShape).fontSize * scaleX)
    } else if (shape.type === 'line') {
      const ls = shape as LineShape
      ;(updates as Partial<LineShape>).points = ls.points.map((p, i) => p * (i % 2 === 0 ? scaleX : scaleY))
    } else {
      updates.width = Math.max(1, shape.width * scaleX)
      updates.height = Math.max(1, shape.height * scaleY)
    }

    updateShape(id, updates)
    pushHistory()
  }, [updateShape, pushHistory])

  const cursor = spaceHeld || activeTool === 'hand'
    ? (panning ? 'grabbing' : 'grab')
    : activeTool === 'select' ? 'default'
    : 'crosshair'

  const { preview } = draw

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#383838]" style={{ cursor }}>
      {/* Zoom badge */}
      <div className="absolute bottom-4 left-4 z-10 bg-[#252526] text-[#999] text-xs px-2 py-1 rounded pointer-events-none">
        {Math.round(zoom * 100)}%
      </div>

      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        scaleX={zoom}
        scaleY={zoom}
        x={stageX}
        y={stageY}
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
              isSelected={selectedIds.includes(shape.id)}
              onSelect={selectShape}
              onDragEnd={handleDragEnd}
              onTransformEnd={handleTransformEnd}
              stageRef={stageRef}
            />
          ))}

          {/* Drawing preview */}
          {preview && (() => {
            const dashed = [4 / zoom, 4 / zoom]
            const sw = 1 / zoom
            switch (preview.type) {
              case 'rect':
              case 'frame':
                return <Rect x={preview.x} y={preview.y} width={preview.width} height={preview.height}
                  fill={(preview as RectShape).fill} stroke="#0079FF" strokeWidth={sw} dash={dashed} listening={false} />
              case 'ellipse':
                return <Ellipse x={preview.x + preview.width / 2} y={preview.y + preview.height / 2}
                  radiusX={preview.width / 2} radiusY={preview.height / 2}
                  fill={(preview as EllipseShape).fill} stroke="#0079FF" strokeWidth={sw} dash={dashed} listening={false} />
              case 'line':
                return <Line x={preview.x} y={preview.y} points={(preview as LineShape).points}
                  stroke="#0079FF" strokeWidth={2 / zoom} listening={false} />
              default:
                return null
            }
          })()}

          <Transformer
            ref={transformerRef}
            rotateEnabled
            enabledAnchors={['top-left','top-center','top-right','middle-right','bottom-right','bottom-center','bottom-left','middle-left']}
            boundBoxFunc={(old, nw) => (nw.width < 5 || nw.height < 5 ? old : nw)}
            anchorSize={7}
            anchorCornerRadius={2}
            borderStroke="#0079FF"
            anchorStroke="#0079FF"
            anchorFill="#ffffff"
          />
        </Layer>
      </Stage>
    </div>
  )
}
