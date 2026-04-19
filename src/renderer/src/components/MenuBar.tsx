import { useState, useRef, useEffect } from 'react'
import { useDesignStore } from '../store'
import type { DesignDocument, ImageShape } from '../types'
import { shapesToSVG, shapesToLottie } from '../utils/export'

interface MenuEntry {
  label?: string
  shortcut?: string
  action?: () => void
  separator?: boolean
  disabled?: boolean
}

interface MenuDef {
  title: string
  items: MenuEntry[]
}

function DropdownMenu({ items, onClose }: { items: MenuEntry[]; onClose: () => void }) {
  return (
    <div className="absolute top-full left-0 mt-1 bg-[#2d2d2d] border border-[#3e3e3e] rounded shadow-xl z-50 min-w-[200px] py-1">
      {items.map((item, i) => {
        if (item.separator) return <div key={i} className="h-px bg-[#3e3e3e] my-1" />
        return (
          <button
            key={i}
            disabled={item.disabled}
            className="w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-8 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#3d3d3d] text-[#ddd] hover:text-white"
            onClick={() => { item.action?.(); onClose() }}
          >
            <span>{item.label ?? ''}</span>
            {item.shortcut && <span className="text-xs text-[#666]">{item.shortcut}</span>}
          </button>
        )
      })}
    </div>
  )
}

interface MenuBarProps {
  onOpenTemplates: () => void
}

export default function MenuBar({ onOpenTemplates }: MenuBarProps) {
  const {
    shapes, documentName, zoom, animFrames,
    setDocumentName, undo, redo, historyIndex, history,
    selectAll, clearSelection, duplicateSelected, deleteSelectedShapes,
    selectedIds, setZoom, setStagePosition, loadDocument,
  } = useDesignStore()

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fitToScreen = () => {
    setZoom(1)
    setStagePosition(0, 0)
  }

  const handleNew = () => {
    if (shapes.length > 0 && !confirm('Create a new document? Unsaved changes will be lost.')) return
    loadDocument([], 'Untitled')
  }

  const handleOpen = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.openFile()
    if (!result) return
    try {
      const doc: DesignDocument = JSON.parse(result.content)
      loadDocument(doc.shapes || [], doc.name || 'Untitled')
    } catch {
      alert('Invalid file format.')
    }
  }

  const handleSave = async () => {
    if (!window.electronAPI) return
    const doc: DesignDocument = { version: '1.0', name: documentName, shapes }
    await window.electronAPI.saveFile(JSON.stringify(doc, null, 2), documentName)
  }

  const handleExportPNG = async () => {
    if (!window.electronAPI) return
    const filePath = await window.electronAPI.exportPNG(documentName)
    if (!filePath) return
    window.dispatchEvent(new CustomEvent('figma:export-png', { detail: { filePath } }))
  }

  const handleExportWebP = async () => {
    if (!window.electronAPI) return
    const filePath = await window.electronAPI.exportWebP(documentName)
    if (!filePath) return
    window.dispatchEvent(new CustomEvent('figma:export-webp', { detail: { filePath } }))
  }

  const handleExportSVG = async () => {
    if (!window.electronAPI) return
    const filePath = await window.electronAPI.exportSVG(documentName)
    if (!filePath) return
    const svg = shapesToSVG(shapes)
    await window.electronAPI.saveSVG(filePath, svg)
  }

  const handleExportTGS = async () => {
    if (!window.electronAPI) return
    const filePath = await window.electronAPI.exportTGS(documentName)
    if (!filePath) return
    const lottie = shapesToLottie(shapes, documentName)
    await window.electronAPI.saveTGS(filePath, JSON.stringify(lottie))
  }

  const handleExportGIF = async () => {
    if (!window.electronAPI) return
    if (animFrames.length === 0) { alert('Add animation frames first to export a GIF.'); return }
    const filePath = await window.electronAPI.exportGIF(documentName)
    if (!filePath) return
    // Dispatch event so Canvas can render each frame
    window.dispatchEvent(new CustomEvent('figma:export-gif', { detail: { filePath, animFrames, shapes } }))
  }

  const handleImportImage = async () => {
    if (!window.electronAPI) return
    const src = await window.electronAPI.importImage()
    if (!src) return
    const img = new window.Image()
    img.onload = () => {
      const maxDim = 400
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
      const w = img.naturalWidth * scale
      const h = img.naturalHeight * scale
      useDesignStore.getState().addShape({
        type: 'image', name: 'Image',
        x: 100, y: 100, width: w, height: h,
        rotation: 0, opacity: 1, visible: true, locked: false,
        fill: '', stroke: '', strokeWidth: 0,
        src, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
      } as Omit<ImageShape, 'id'>)
    }
    img.src = src
  }

  const MENUS: MenuDef[] = [
    {
      title: 'File',
      items: [
        { label: 'New', shortcut: 'Ctrl+N', action: handleNew },
        { label: 'New from Template…', action: onOpenTemplates },
        { label: 'Open…', shortcut: 'Ctrl+O', action: handleOpen },
        { separator: true },
        { label: 'Import Image…', action: handleImportImage },
        { separator: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: handleSave },
        { separator: true },
        { label: 'Export as PNG…',  action: handleExportPNG },
        { label: 'Export as WebP…', action: handleExportWebP },
        { label: 'Export as SVG…',  action: handleExportSVG },
        { label: 'Export as GIF…',  action: handleExportGIF },
        { label: 'Export as TGS…',  action: handleExportTGS },
      ]
    },
    {
      title: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: undo, disabled: historyIndex <= 0 },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: redo, disabled: historyIndex >= history.length - 1 },
        { separator: true },
        { label: 'Select All', shortcut: 'Ctrl+A', action: selectAll },
        { label: 'Deselect', shortcut: 'Esc', action: clearSelection },
        { separator: true },
        { label: 'Duplicate', shortcut: 'Ctrl+D', action: duplicateSelected, disabled: selectedIds.length === 0 },
        { label: 'Delete', shortcut: 'Del', action: deleteSelectedShapes, disabled: selectedIds.length === 0 },
      ]
    },
    {
      title: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl+=', action: () => setZoom(zoom * 1.25) },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', action: () => setZoom(zoom / 1.25) },
        { label: 'Zoom to 100%', shortcut: 'Ctrl+0', action: () => { setZoom(1); setStagePosition(0, 0) } },
        { label: 'Zoom to Fit', shortcut: 'Shift+1', action: fitToScreen },
      ]
    }
  ]

  return (
    <div className="h-10 bg-[#252526] border-b border-[#3e3e3e] flex items-center px-2 gap-1 shrink-0" ref={menuRef}>
      {/* App logo */}
      <div className="w-7 h-7 rounded bg-[#0079FF] flex items-center justify-center mr-1 shrink-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="white">
          <rect x="1" y="1" width="5" height="5" rx="1" />
          <rect x="8" y="1" width="5" height="5" rx="1" />
          <rect x="1" y="8" width="5" height="5" rx="1" />
          <circle cx="10.5" cy="10.5" r="2.5" />
        </svg>
      </div>

      {/* Menus */}
      {MENUS.map(menu => (
        <div key={menu.title} className="relative">
          <button
            className={`px-2 py-1 text-sm rounded transition-colors ${
              openMenu === menu.title ? 'bg-[#3d3d3d] text-white' : 'text-[#ccc] hover:text-white hover:bg-[#2d2d2d]'
            }`}
            onClick={() => setOpenMenu(openMenu === menu.title ? null : menu.title)}
          >
            {menu.title}
          </button>
          {openMenu === menu.title && (
            <DropdownMenu items={menu.items} onClose={() => setOpenMenu(null)} />
          )}
        </div>
      ))}

      {/* Document title */}
      <div className="flex-1 flex justify-center">
        {editingTitle ? (
          <input
            ref={titleRef}
            type="text"
            className="bg-transparent border-b border-[#0079FF] text-sm text-white outline-none text-center px-2"
            defaultValue={documentName}
            autoFocus
            onBlur={(e) => { setDocumentName(e.target.value || 'Untitled'); setEditingTitle(false) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                setDocumentName((e.target as HTMLInputElement).value || 'Untitled')
                setEditingTitle(false)
              }
            }}
          />
        ) : (
          <button
            className="text-sm text-[#ccc] hover:text-white px-2 py-0.5 rounded hover:bg-[#2d2d2d]"
            onDoubleClick={() => setEditingTitle(true)}
            title="Double-click to rename"
          >
            {documentName}
          </button>
        )}
      </div>

      {/* Zoom display */}
      <div className="text-xs text-[#666] pr-2">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}
