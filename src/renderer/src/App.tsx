import { useEffect, useCallback, useState } from 'react'
import { useDesignStore } from './store'
import MenuBar from './components/MenuBar'
import Toolbar from './components/Toolbar'
import LayersPanel from './components/LayersPanel'
import PropertiesPanel from './components/PropertiesPanel'
import Canvas from './components/Canvas'
import Timeline from './components/Timeline'
import TemplatesModal from './components/TemplatesModal'

export default function App() {
  const { activeTool, setTool, undo, redo, deleteSelectedShapes, duplicateSelected, selectedIds } =
    useDesignStore()

  const [showTemplates, setShowTemplates] = useState(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return }
      if (ctrl && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
      if (ctrl && e.key === 'a') { e.preventDefault(); useDesignStore.getState().selectAll(); return }
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
    [activeTool, selectedIds, undo, redo, deleteSelectedShapes, duplicateSelected, setTool]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white overflow-hidden" style={{ userSelect: 'none' }}>
      <MenuBar onOpenTemplates={() => setShowTemplates(true)} />
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
    </div>
  )
}
