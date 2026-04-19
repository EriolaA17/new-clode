import { useEffect, useCallback } from 'react'
import { useDesignStore } from './store'
import MenuBar from './components/MenuBar'
import Toolbar from './components/Toolbar'
import LayersPanel from './components/LayersPanel'
import PropertiesPanel from './components/PropertiesPanel'
import Canvas from './components/Canvas'

export default function App() {
  const { activeTool, setTool, undo, redo, deleteSelectedShapes, duplicateSelected, selectedIds } =
    useDesignStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault()
        duplicateSelected()
        return
      }
      if (ctrl && e.key === 'a') {
        e.preventDefault()
        useDesignStore.getState().selectAll()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault()
        deleteSelectedShapes()
        return
      }

      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case 'v': setTool('select'); break
          case 'h': setTool('hand'); break
          case 'f': setTool('frame'); break
          case 'r': setTool('rect'); break
          case 'o': setTool('ellipse'); break
          case 't': setTool('text'); break
          case 'l': setTool('line'); break
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
      <MenuBar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <LayersPanel />
        <Canvas />
        <PropertiesPanel />
      </div>
    </div>
  )
}
