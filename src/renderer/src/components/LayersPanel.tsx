import { useState, useRef } from 'react'
import { useDesignStore } from '../store'
import type { Shape } from '../types'

function TypeIcon({ type }: { type: string }) {
  const c = '#666'; const sz = 12
  switch (type) {
    case 'rect':    return <svg width={sz} height={sz} viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1" stroke={c} strokeWidth="1.5" fill="none" /></svg>
    case 'frame':   return <svg width={sz} height={sz} viewBox="0 0 16 16"><path d="M1 5h2V1H1v4zm0 10h2v-4H1v4zM13 5h2V1h-2v4zm0 10h2v-4h-2v4zM0 7h2v6H0V7zm14 0h2v6h-2V7zM5 0h6v2H5V0zm0 14h6v2H5v-2z" fill={c} /></svg>
    case 'ellipse': return <svg width={sz} height={sz} viewBox="0 0 16 16"><ellipse cx="8" cy="8" rx="6" ry="6" stroke={c} strokeWidth="1.5" fill="none" /></svg>
    case 'text':    return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={c}><path d="M3 3v2h4v8h2V5h4V3H3z" /></svg>
    case 'line':    return <svg width={sz} height={sz} viewBox="0 0 16 16"><line x1="2" y1="14" x2="14" y2="2" stroke={c} strokeWidth="1.5" strokeLinecap="round" /></svg>
    case 'pen':     return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={c}><path d="M2 11.5V14h2.5l7.4-7.4-2.5-2.5L2 11.5zm11.8-6.8a.67.67 0 000-.95L12.3 2.2a.67.67 0 00-.95 0l-1.1 1.1 2.5 2.5 1.05-1.1z" /></svg>
    case 'image':   return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={c}><path d="M14 1H2a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1zm-1 12H3V3h10v10zm-6-3l2-2.5L11 11H5l2-2.5z" /></svg>
    default:        return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={c}><rect x="2" y="2" width="12" height="12" /></svg>
  }
}

interface LayerRowProps {
  shape: Shape
  isSelected: boolean
  onSelect: (id: string, multi: boolean) => void
  onToggleVisible: (id: string) => void
  onToggleLock: (id: string) => void
  onRename: (id: string, name: string) => void
}

function LayerRow({ shape, isSelected, onSelect, onToggleVisible, onToggleLock, onRename }: LayerRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(shape.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraft(shape.name)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    setEditing(false)
    if (draft.trim()) onRename(shape.id, draft.trim())
  }

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 cursor-pointer group ${
        isSelected ? 'bg-[#0079FF22] text-white' : 'text-[#bbb] hover:bg-[#2d2d2d] hover:text-white'
      }`}
      onClick={(e) => !editing && onSelect(shape.id, e.shiftKey || e.ctrlKey || e.metaKey)}
    >
      <TypeIcon type={shape.type} />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
          className="flex-1 text-xs bg-[#1e1e1e] border border-[#0079FF] rounded px-1 outline-none text-white"
          onClick={e => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span className="flex-1 text-xs truncate" onDoubleClick={startEdit} title="Double-click to rename">
          {shape.name}
        </span>
      )}

      {/* Lock */}
      <button
        className={`opacity-0 group-hover:opacity-100 ${shape.locked ? '!opacity-100 text-yellow-500' : 'text-[#666]'} hover:text-white transition-opacity shrink-0`}
        onClick={e => { e.stopPropagation(); onToggleLock(shape.id) }}
        title={shape.locked ? 'Unlock' : 'Lock'}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
          {shape.locked
            ? <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            : <path d="M12 1C9.24 1 7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.76-2.24-5-5-5zm0 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" opacity=".4" />
          }
        </svg>
      </button>

      {/* Visibility */}
      <button
        className={`opacity-0 group-hover:opacity-100 ${!shape.visible ? '!opacity-100 text-[#555]' : 'text-[#999]'} hover:text-white transition-opacity shrink-0`}
        onClick={e => { e.stopPropagation(); onToggleVisible(shape.id) }}
        title={shape.visible ? 'Hide' : 'Show'}
      >
        {shape.visible
          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" /></svg>
          : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27z" /></svg>
        }
      </button>
    </div>
  )
}

export default function LayersPanel() {
  const { shapes, selectedIds, selectShape, updateShape, renameShape } = useDesignStore()
  const [search, setSearch] = useState('')

  const handleToggleVisible = (id: string) => {
    const s = shapes.find(x => x.id === id)
    if (s) updateShape(id, { visible: !s.visible })
  }
  const handleToggleLock = (id: string) => {
    const s = shapes.find(x => x.id === id)
    if (s) updateShape(id, { locked: !s.locked })
  }

  const filtered = [...shapes].reverse().filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="w-52 bg-[#252526] border-r border-[#3e3e3e] flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-[#3e3e3e]">
        <span className="panel-label">Layers</span>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 border-b border-[#3e3e3e]">
        <input
          type="text"
          placeholder="Search layers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full text-xs bg-[#1e1e1e] border border-[#3e3e3e] rounded px-2 py-1 text-[#ccc] outline-none focus:border-[#0079FF] placeholder-[#555]"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-xs text-[#555] text-center">
            {search ? 'No layers match.' : 'No layers yet.\nDraw something!'}
          </div>
        ) : (
          filtered.map(shape => (
            <LayerRow
              key={shape.id}
              shape={shape}
              isSelected={selectedIds.includes(shape.id)}
              onSelect={selectShape}
              onToggleVisible={handleToggleVisible}
              onToggleLock={handleToggleLock}
              onRename={renameShape}
            />
          ))
        )}
      </div>
    </div>
  )
}
