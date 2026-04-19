export type Tool = 'select' | 'hand' | 'frame' | 'rect' | 'ellipse' | 'text' | 'line' | 'pen' | 'image'

export interface BaseShape {
  id: string
  type: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
  visible: boolean
  locked: boolean
  fill: string
  stroke: string
  strokeWidth: number
}

export interface RectShape extends BaseShape { type: 'rect'; cornerRadius: number }
export interface FrameShape extends BaseShape { type: 'frame'; cornerRadius: number }
export interface EllipseShape extends BaseShape { type: 'ellipse' }

export interface TextShape extends BaseShape {
  type: 'text'
  text: string
  fontSize: number
  fontFamily: string
  fontStyle: 'normal' | 'bold' | 'italic' | 'bold italic'
  textAlign: 'left' | 'center' | 'right'
  lineHeight: number
}

export interface LineShape extends BaseShape {
  type: 'line'
  points: number[]
}

export interface PenShape extends BaseShape {
  type: 'pen'
  points: number[]
  tension: number
}

export interface ImageShape extends BaseShape {
  type: 'image'
  src: string       // base64 data URL
  naturalWidth: number
  naturalHeight: number
}

export type Shape = RectShape | FrameShape | EllipseShape | TextShape | LineShape | PenShape | ImageShape

// ─── Animation ────────────────────────────────────────────────────────────────

export type ShapeOverride = Partial<Pick<BaseShape, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'fill' | 'stroke' | 'strokeWidth'>>

export interface AnimFrame {
  id: string
  label: string
  duration: number   // ms
  overrides: Record<string, ShapeOverride>
}

// ─── Document ─────────────────────────────────────────────────────────────────

export interface DesignDocument {
  version: string
  name: string
  shapes: Shape[]
  animFrames?: AnimFrame[]
}

// ─── Template ─────────────────────────────────────────────────────────────────

export interface Template {
  name: string
  category: string
  width: number
  height: number
  bg: string
}
