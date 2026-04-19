import { create } from 'zustand'
import type { Shape, Tool, AnimFrame, ShapeOverride } from './types'

let _id = 0
const genId = () => `s_${Date.now()}_${++_id}`
const genFrameId = () => `f_${Date.now()}_${++_id}`

interface DesignStore {
  // Canvas
  shapes: Shape[]
  selectedIds: string[]
  activeTool: Tool
  zoom: number
  stageX: number
  stageY: number
  documentName: string
  history: Shape[][]
  historyIndex: number

  // Animation
  animFrames: AnimFrame[]
  currentFrameIdx: number   // -1 = base
  isPlaying: boolean

  // ── Computed ──────────────────────────────────────────────────────────────
  getEffectiveShapes: () => Shape[]

  // ── Shape actions ─────────────────────────────────────────────────────────
  addShape: (shape: Omit<Shape, 'id'>) => string
  updateShape: (id: string, updates: Partial<Shape>) => void
  deleteSelectedShapes: () => void
  selectShape: (id: string | null, multi?: boolean) => void
  selectAll: () => void
  clearSelection: () => void
  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setStagePosition: (x: number, y: number) => void
  setDocumentName: (name: string) => void
  undo: () => void
  redo: () => void
  pushHistory: () => void
  loadDocument: (shapes: Shape[], name: string, animFrames?: AnimFrame[]) => void
  duplicateSelected: () => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void

  // ── Animation actions ──────────────────────────────────────────────────────
  addAnimFrame: () => void
  duplicateAnimFrame: (idx: number) => void
  removeAnimFrame: (idx: number) => void
  setCurrentFrameIdx: (idx: number) => void
  updateFrameOverride: (frameIdx: number, shapeId: string, updates: ShapeOverride) => void
  setFrameDuration: (frameIdx: number, ms: number) => void
  setIsPlaying: (v: boolean) => void
}

export const useDesignStore = create<DesignStore>((set, get) => ({
  shapes: [],
  selectedIds: [],
  activeTool: 'select',
  zoom: 1,
  stageX: 0,
  stageY: 0,
  documentName: 'Untitled',
  history: [[]],
  historyIndex: 0,
  animFrames: [],
  currentFrameIdx: -1,
  isPlaying: false,

  // Returns shapes with current animation-frame overrides applied
  getEffectiveShapes: () => {
    const { shapes, animFrames, currentFrameIdx } = get()
    if (currentFrameIdx < 0 || !animFrames[currentFrameIdx]) return shapes
    const overrides = animFrames[currentFrameIdx].overrides
    return shapes.map(s => overrides[s.id] ? ({ ...s, ...overrides[s.id] } as Shape) : s)
  },

  addShape: (shapeData) => {
    const id = genId()
    const shape = { ...shapeData, id } as Shape
    set(state => {
      const newShapes = [...state.shapes, shape]
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newShapes)
      return { shapes: newShapes, history: newHistory, historyIndex: newHistory.length - 1, selectedIds: [id] }
    })
    return id
  },

  updateShape: (id, updates) => {
    const { currentFrameIdx, animFrames } = get()
    if (currentFrameIdx >= 0 && animFrames[currentFrameIdx]) {
      // When a frame is active, store position/property changes as overrides
      const allowed: (keyof ShapeOverride)[] = ['x','y','width','height','rotation','opacity','fill','stroke','strokeWidth']
      const frameUpdates: ShapeOverride = {}
      for (const k of allowed) {
        if (k in updates) (frameUpdates as Record<string, unknown>)[k] = (updates as Record<string, unknown>)[k]
      }
      if (Object.keys(frameUpdates).length > 0) {
        get().updateFrameOverride(currentFrameIdx, id, frameUpdates)
        return
      }
    }
    set(state => ({ shapes: state.shapes.map(s => s.id === id ? ({ ...s, ...updates } as Shape) : s) }))
  },

  deleteSelectedShapes: () => {
    set(state => {
      const newShapes = state.shapes.filter(s => !state.selectedIds.includes(s.id))
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(newShapes)
      return { shapes: newShapes, selectedIds: [], history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  selectShape: (id, multi = false) => {
    set(state => {
      if (!id) return { selectedIds: [] }
      if (multi) return { selectedIds: state.selectedIds.includes(id) ? state.selectedIds.filter(x => x !== id) : [...state.selectedIds, id] }
      return { selectedIds: [id] }
    })
  },

  selectAll: () => set(state => ({ selectedIds: state.shapes.map(s => s.id) })),
  clearSelection: () => set({ selectedIds: [] }),
  setTool: (tool) => set({ activeTool: tool }),
  setZoom: (zoom) => set({ zoom: Math.max(0.05, Math.min(10, zoom)) }),
  setStagePosition: (x, y) => set({ stageX: x, stageY: y }),
  setDocumentName: (name) => set({ documentName: name }),

  undo: () => set(state => {
    if (state.historyIndex <= 0) return state
    const idx = state.historyIndex - 1
    return { shapes: state.history[idx], historyIndex: idx, selectedIds: [] }
  }),

  redo: () => set(state => {
    if (state.historyIndex >= state.history.length - 1) return state
    const idx = state.historyIndex + 1
    return { shapes: state.history[idx], historyIndex: idx, selectedIds: [] }
  }),

  pushHistory: () => set(state => {
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push([...state.shapes])
    if (newHistory.length > 100) newHistory.shift()
    return { history: newHistory, historyIndex: newHistory.length - 1 }
  }),

  loadDocument: (shapes, name, animFrames = []) => {
    set({ shapes, documentName: name, selectedIds: [], history: [shapes], historyIndex: 0, animFrames, currentFrameIdx: -1 })
  },

  duplicateSelected: () => set(state => {
    const selected = state.shapes.filter(s => state.selectedIds.includes(s.id))
    const copies = selected.map(s => ({ ...s, id: genId(), name: `${s.name} copy`, x: s.x + 20, y: s.y + 20 }))
    const allShapes = [...state.shapes, ...copies]
    const newHistory = state.history.slice(0, state.historyIndex + 1)
    newHistory.push(allShapes)
    return { shapes: allShapes, selectedIds: copies.map(s => s.id), history: newHistory, historyIndex: newHistory.length - 1 }
  }),

  bringForward: (id) => set(state => {
    const idx = state.shapes.findIndex(s => s.id === id)
    if (idx < 0 || idx >= state.shapes.length - 1) return state
    const arr = [...state.shapes];[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; return { shapes: arr }
  }),

  sendBackward: (id) => set(state => {
    const idx = state.shapes.findIndex(s => s.id === id)
    if (idx <= 0) return state
    const arr = [...state.shapes];[arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]; return { shapes: arr }
  }),

  bringToFront: (id) => set(state => {
    const idx = state.shapes.findIndex(s => s.id === id); if (idx < 0) return state
    const arr = [...state.shapes]; const [s] = arr.splice(idx, 1); arr.push(s); return { shapes: arr }
  }),

  sendToBack: (id) => set(state => {
    const idx = state.shapes.findIndex(s => s.id === id); if (idx <= 0) return state
    const arr = [...state.shapes]; const [s] = arr.splice(idx, 1); arr.unshift(s); return { shapes: arr }
  }),

  // ── Animation ───────────────────────────────────────────────────────────────

  addAnimFrame: () => set(state => ({
    animFrames: [...state.animFrames, { id: genFrameId(), label: `Frame ${state.animFrames.length + 1}`, duration: 100, overrides: {} }],
    currentFrameIdx: state.animFrames.length,
  })),

  duplicateAnimFrame: (idx) => set(state => {
    const src = state.animFrames[idx]
    if (!src) return state
    const copy: AnimFrame = { ...src, id: genFrameId(), label: `${src.label} copy`, overrides: { ...src.overrides } }
    const arr = [...state.animFrames]
    arr.splice(idx + 1, 0, copy)
    return { animFrames: arr, currentFrameIdx: idx + 1 }
  }),

  removeAnimFrame: (idx) => set(state => {
    const arr = state.animFrames.filter((_, i) => i !== idx)
    const newIdx = arr.length === 0 ? -1 : Math.min(idx, arr.length - 1)
    return { animFrames: arr, currentFrameIdx: newIdx }
  }),

  setCurrentFrameIdx: (idx) => set({ currentFrameIdx: idx, selectedIds: [] }),

  updateFrameOverride: (frameIdx, shapeId, updates) => set(state => {
    const frames = state.animFrames.map((f, i) => {
      if (i !== frameIdx) return f
      return { ...f, overrides: { ...f.overrides, [shapeId]: { ...(f.overrides[shapeId] || {}), ...updates } } }
    })
    return { animFrames: frames }
  }),

  setFrameDuration: (frameIdx, ms) => set(state => ({
    animFrames: state.animFrames.map((f, i) => i === frameIdx ? { ...f, duration: Math.max(10, ms) } : f)
  })),

  setIsPlaying: (v) => set({ isPlaying: v }),
}))
