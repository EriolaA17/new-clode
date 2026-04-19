import { useEffect, useCallback, useState } from 'react'
import { useDesignStore } from './store'
import type { DesignDocument } from './types'
import MenuBar from './components/MenuBar'
import Toolbar from './components/Toolbar'
import LayersPanel from './components/LayersPanel'
import PropertiesPanel from './components/PropertiesPanel'
import Canvas from './components/Canvas'
import Timeline from './components/Timeline'
import TemplatesModal from './components/TemplatesModal'
import SpriteSlicerModal from './components/SpriteSlicerModal'
import ImageEditorModal from './components/ImageEditorModal'
import type { ImageShape } from './types'

export default function App() {
  const {
    activeTool, setTool, undo, redo, deleteSelectedShapes, duplicateSelected,
    selectedIds, copySelected, pasteClipboard, zoomToSelection, shapes, loadDocument, animFrames, updateShape, pushHistory,
  } = useDesignStore()

  const [showTemplates, setShowTemplates] = useState(false)
  const [showSlicer, setShowSlicer] = useState(false)
  const [editingImageId, setEditingImageId] = useState<string | null>(null)

  // Auto-save to localStorage
  useEffect(() => {
    if (shapes.length === 0) return
    const timer = setTimeout(() => {
      const { documentName, animFrames: af } = useDesignStore.getState()
      const doc: DesignDocument = { version: '1.0', name: documentName, shapes, animFrames: af }
      try { localStorage.setItem('figma-local-autosave', JSON.stringify(doc)) } catch {}
    }, 1500)
    return () => clearTimeout(timer)
  }, [shapes])

  // Restore auto-save on first load
  useEffect(() => {
    const saved = localStorage.getItem('figma-local-autosave')
    if (!saved) return
    try {
      const doc: DesignDocument = JSON.parse(saved)
      if (doc.shapes?.length > 0 && confirm('Restore auto-saved work?')) {
        loadDocument(doc.shapes, doc.name || 'Untitled', doc.animFrames)
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const h = (e: CustomEvent<{ id: string }>) => setEditingImageId(e.detail.id)
    window.addEventListener('figma:edit-image', h as unknown as EventListener)
    return () => window.removeEventListener('figma:edit-image', h as unknown as EventListener)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
      if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
      if (ctrl && e.key === 'a') { e.preventDefault(); useDesignStore.getState().selectAll(); return }
      if (ctrl && e.key === 'c') { e.preventDefault(); copySelected(); return }
      if (ctrl && e.key === 'v') { e.preventDefault(); pasteClipboard(); return }
      if (ctrl && e.shiftKey && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); zoomToSelection(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) { e.preventDefault(); deleteSelectedShapes(); return }

      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break
          case 'h': setTool('hand'); break
          case 'f': setTool('frame'); break
          case 'r': setTool('rect'); break
          case 'o': setTool('ellipse'); break
          case 't': setTool('text'); break
          case 'l': setTool('line'); break
          case 'p': setTool('pen'); break
          case 'i': setTool('image'); break
        }
      }
    },
    [activeTool, selectedIds, undo, redo, deleteSelectedShapes, duplicateSelected, copySelected, pasteClipboard, zoomToSelection, setTool]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white overflow-hidden" style={{ userSelect: 'none' }}>
      <MenuBar onOpenTemplates={() => setShowTemplates(true)} onOpenSlicer={() => setShowSlicer(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <LayersPanel />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Canvas />
          <Timeline />
        </div>
        <PropertiesPanel />
      </div>
      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} />}
      {showSlicer && <SpriteSlicerModal onClose={() => setShowSlicer(false)} />}
      {editingImageId && (() => {
        const imgShape = shapes.find(s => s.id === editingImageId) as ImageShape | undefined
        if (!imgShape) return null
        return (
          <ImageEditorModal
            shape={imgShape}
            onApply={(newSrc) => {
              const tmp = new window.Image()
              tmp.onload = () => {
                updateShape(editingImageId, { src: newSrc, naturalWidth: tmp.naturalWidth, naturalHeight: tmp.naturalHeight } as Partial<ImageShape>)
                pushHistory()
              }
              tmp.src = newSrc
              setEditingImageId(null)
            }}
            onClose={() => setEditingImageId(null)}
          />
        )
      })()}
    </div>
  )
}
