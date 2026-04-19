import { create } from 'zustand'
import type { Shape, Tool } from './types'

let _idCounter = 0
function genId(): string {
  return `shape_${Date.now()}_${++_idCounter}`
}

interface DesignStore {
  shapes: Shape[]
  selectedIds: string[]
  activeTool: Tool
  zoom: number
  stageX: number
  stageY: number
  documentName: string
  history: Shape[][]
  historyIndex: number

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
  loadDocument: (shapes: Shape[], name: string) => void
  duplicateSelected: () => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void
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
    set(state => ({
      shapes: state.shapes.map(s => (s.id === id ? ({ ...s, ...updates } as Shape) : s))
    }))
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
      if (id === null) return { selectedIds: [] }
      if (multi) {
        return {
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter(sid => sid !== id)
            : [...state.selectedIds, id]
        }
      }
      return { selectedIds: [id] }
    })
  },

  selectAll: () => set(state => ({ selectedIds: state.shapes.map(s => s.id) })),

  clearSelection: () => set({ selectedIds: [] }),

  setTool: (tool) => set({ activeTool: tool }),

  setZoom: (zoom) => set({ zoom: Math.max(0.05, Math.min(10, zoom)) }),

  setStagePosition: (x, y) => set({ stageX: x, stageY: y }),

  setDocumentName: (name) => set({ documentName: name }),

  undo: () => {
    set(state => {
      if (state.historyIndex <= 0) return state
      const idx = state.historyIndex - 1
      return { shapes: state.history[idx], historyIndex: idx, selectedIds: [] }
    })
  },

  redo: () => {
    set(state => {
      if (state.historyIndex >= state.history.length - 1) return state
      const idx = state.historyIndex + 1
      return { shapes: state.history[idx], historyIndex: idx, selectedIds: [] }
    })
  },

  pushHistory: () => {
    set(state => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push([...state.shapes])
      if (newHistory.length > 100) newHistory.shift()
      return { history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  loadDocument: (shapes, name) => {
    set({ shapes, documentName: name, selectedIds: [], history: [shapes], historyIndex: 0 })
  },

  duplicateSelected: () => {
    set(state => {
      const selected = state.shapes.filter(s => state.selectedIds.includes(s.id))
      const copies = selected.map(s => ({ ...s, id: genId(), name: `${s.name} copy`, x: s.x + 20, y: s.y + 20 }))
      const allShapes = [...state.shapes, ...copies]
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(allShapes)
      return { shapes: allShapes, selectedIds: copies.map(s => s.id), history: newHistory, historyIndex: newHistory.length - 1 }
    })
  },

  bringForward: (id) => {
    set(state => {
      const idx = state.shapes.findIndex(s => s.id === id)
      if (idx < 0 || idx >= state.shapes.length - 1) return state
      const arr = [...state.shapes]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return { shapes: arr }
    })
  },

  sendBackward: (id) => {
    set(state => {
      const idx = state.shapes.findIndex(s => s.id === id)
      if (idx <= 0) return state
      const arr = [...state.shapes]
      ;[arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]]
      return { shapes: arr }
    })
  },

  bringToFront: (id) => {
    set(state => {
      const idx = state.shapes.findIndex(s => s.id === id)
      if (idx < 0) return state
      const arr = [...state.shapes]
      const [shape] = arr.splice(idx, 1)
      arr.push(shape)
      return { shapes: arr }
    })
  },

  sendToBack: (id) => {
    set(state => {
      const idx = state.shapes.findIndex(s => s.id === id)
      if (idx <= 0) return state
      const arr = [...state.shapes]
      const [shape] = arr.splice(idx, 1)
      arr.unshift(shape)
      return { shapes: arr }
    })
  },
}))
