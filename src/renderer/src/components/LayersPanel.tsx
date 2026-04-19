import { useDesignStore } from '../store'
import type { Shape } from '../types'

function TypeIcon({ type }: { type: string }) {
  const color = '#666'
  const sz = 12
  switch (type) {
    case 'rect':
      return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={color}><rect x="2" y="2" width="12" height="12" rx="1" stroke={color} strokeWidth="1.5" fill="none" /></svg>
    case 'frame':
      return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={color}><path d="M1 5h2V1H1v4zm0 10h2v-4H1v4zM13 5h2V1h-2v4zm0 10h2v-4h-2v4zM0 7h2v6H0V7zm14 0h2v6h-2V7zM5 0h6v2H5V0zm0 14h6v2H5v-2z" /></svg>
    case 'ellipse':
      return <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="6" ry="6" stroke={color} strokeWidth="1.5" /></svg>
    case 'text':
      return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={color}><path d="M3 3v2h4v8h2V5h4V3H3z" /></svg>
    case 'line':
      return <svg width={sz} height={sz} viewBox="0 0 16 16"><line x1="2" y1="14" x2="14" y2="2" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>
    default:
      return <svg width={sz} height={sz} viewBox="0 0 16 16" fill={color}><rect x="2" y="2" width="12" height="12" /></svg>
  }
}

interface LayerRowProps {
  shape: Shape
  depth?: number
  isSelected: boolean
  onSelect: (id: string, multi: boolean) => void
  onToggleVisible: (id: string) => void
}

function LayerRow({ shape, depth = 0, isSelected, onSelect, onToggleVisible }: LayerRowProps) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 cursor-pointer group ${
        isSelected ? 'bg-[#0079FF22] text-white' : 'text-[#bbb] hover:bg-[#2d2d2d] hover:text-white'
      }`}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
      onClick={(e) => onSelect(shape.id, e.shiftKey || e.ctrlKey || e.metaKey)}
    >
      <TypeIcon type={shape.type} />
      <span className="flex-1 text-xs truncate">{shape.name}</span>

      {/* Visibility toggle */}
      <button
        className={`opacity-0 group-hover:opacity-100 ${!shape.visible ? '!opacity-100 text-[#666]' : ''} text-[#999] hover:text-white transition-opacity`}
        onClick={(e) => { e.stopPropagation(); onToggleVisible(shape.id) }}
        title={shape.visible ? 'Hide layer' : 'Show layer'}
      >
        {shape.visible ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function LayersPanel() {
  const { shapes, selectedIds, selectShape, updateShape } = useDesignStore()

  const handleToggleVisible = (id: string) => {
    const shape = shapes.find(s => s.id === id)
    if (shape) updateShape(id, { visible: !shape.visible })
  }

  // Show shapes in reverse (top = front)
  const reversed = [...shapes].reverse()

  return (
    <div className="w-52 bg-[#252526] border-r border-[#3e3e3e] flex flex-col shrink-0">
      <div className="px-3 py-2 border-b border-[#3e3e3e]">
        <span className="panel-label">Layers</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {reversed.length === 0 ? (
          <div className="px-3 py-4 text-xs text-[#555] text-center">
            No layers yet.<br />Draw something!
          </div>
        ) : (
          reversed.map(shape => (
            <LayerRow
              key={shape.id}
              shape={shape}
              isSelected={selectedIds.includes(shape.id)}
              onSelect={selectShape}
              onToggleVisible={handleToggleVisible}
            />
          ))
        )}
      </div>
    </div>
  )
}
