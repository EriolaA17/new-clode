export type Tool = 'select' | 'hand' | 'frame' | 'rect' | 'ellipse' | 'text' | 'line'

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

export interface RectShape extends BaseShape {
  type: 'rect'
  cornerRadius: number
}

export interface FrameShape extends BaseShape {
  type: 'frame'
  cornerRadius: number
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse'
}

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

export type Shape = RectShape | FrameShape | EllipseShape | TextShape | LineShape

export interface DesignDocument {
  version: string
  name: string
  shapes: Shape[]
}
