import { useDesignStore } from '../store'
import type { Tool } from '../types'

interface ToolItem {
  id: Tool
  label: string
  shortcut: string
  icon: React.ReactNode
}

function ToolIcon({ path, viewBox = '0 0 24 24' }: { path: string; viewBox?: string }) {
  return (
    <svg width="16" height="16" viewBox={viewBox} fill="currentColor">
      <path d={path} />
    </svg>
  )
}

const TOOLS: ToolItem[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    icon: <ToolIcon path="M4 0l16 10-7 2-4 8L4 0z" />
  },
  {
    id: 'hand',
    label: 'Hand',
    shortcut: 'H',
    icon: <ToolIcon path="M9 2a1 1 0 011-1h.01a1 1 0 011 1v5a1 1 0 012 0V5a1 1 0 012 0v2a1 1 0 012 0v4a6 6 0 01-6 6H9a6 6 0 01-6-6V9a1 1 0 012 0v2a1 1 0 002 0V2z" />
  },
]

const SHAPE_TOOLS: ToolItem[] = [
  {
    id: 'frame',
    label: 'Frame',
    shortcut: 'F',
    icon: <ToolIcon path="M2 4h4V2H2v2zm0 14h4v-2H2v2zM18 4h4V2h-4v2zm0 14h4v-2h-4v2zM0 6h2v12H0V6zm22 0h2v12h-2V6zM6 0h12v2H6V0zm0 22h12v-2H6v2z" />
  },
  {
    id: 'rect',
    label: 'Rectangle',
    shortcut: 'R',
    icon: <ToolIcon path="M3 3h18v18H3V3zm2 2v14h14V5H5z" />
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    shortcut: 'O',
    icon: <ToolIcon path="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16z" />
  },
  {
    id: 'line',
    label: 'Line',
    shortcut: 'L',
    icon: <ToolIcon path="M20.707 3.293a1 1 0 010 1.414l-16 16a1 1 0 01-1.414-1.414l16-16a1 1 0 011.414 0z" />
  },
  {
    id: 'text',
    label: 'Text',
    shortcut: 'T',
    icon: <ToolIcon path="M5 4v3h5.5v12h3V7H19V4H5z" />
  },
]

export default function Toolbar() {
  const { activeTool, setTool } = useDesignStore()

  const ToolButton = ({ tool }: { tool: ToolItem }) => (
    <div className="relative group">
      <button
        className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
        onClick={() => setTool(tool.id)}
        title={`${tool.label} (${tool.shortcut})`}
      >
        {tool.icon}
      </button>
      {/* Tooltip */}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-[#1a1a1a] text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-[#3d3d3d]">
        {tool.label}
        <span className="ml-2 text-[#666]">{tool.shortcut}</span>
      </div>
    </div>
  )

  return (
    <div className="w-12 bg-[#252526] border-r border-[#3e3e3e] flex flex-col items-center py-2 gap-1 shrink-0">
      {TOOLS.map(t => <ToolButton key={t.id} tool={t} />)}

      <div className="w-7 h-px bg-[#3e3e3e] my-1" />

      {SHAPE_TOOLS.map(t => <ToolButton key={t.id} tool={t} />)}
    </div>
  )
}
