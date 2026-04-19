import type { Template } from '../types'
import { useDesignStore } from '../store'
import type { FrameShape } from '../types'

const TEMPLATES: Template[] = [
  { name: 'Telegram Sticker', category: 'Messaging', width: 512, height: 512, bg: '#FFFFFF' },
  { name: 'Telegram Sticker (Dark)', category: 'Messaging', width: 512, height: 512, bg: '#1C1C1E' },
  { name: 'WhatsApp Sticker', category: 'Messaging', width: 512, height: 512, bg: '#FFFFFF' },
  { name: 'Instagram Post', category: 'Social', width: 1080, height: 1080, bg: '#FFFFFF' },
  { name: 'Instagram Story', category: 'Social', width: 1080, height: 1920, bg: '#FFFFFF' },
  { name: 'Twitter/X Post', category: 'Social', width: 1200, height: 628, bg: '#FFFFFF' },
  { name: 'Facebook Cover', category: 'Social', width: 851, height: 315, bg: '#FFFFFF' },
  { name: 'YouTube Thumbnail', category: 'Video', width: 1280, height: 720, bg: '#1a1a1a' },
  { name: 'HD Frame (1920×1080)', category: 'Video', width: 1920, height: 1080, bg: '#000000' },
  { name: 'Square (800×800)', category: 'General', width: 800, height: 800, bg: '#FFFFFF' },
  { name: 'A4 Portrait', category: 'Print', width: 794, height: 1123, bg: '#FFFFFF' },
  { name: 'Business Card', category: 'Print', width: 1050, height: 600, bg: '#FFFFFF' },
]

const CATEGORIES = Array.from(new Set(TEMPLATES.map(t => t.category)))

interface Props {
  onClose: () => void
}

export default function TemplatesModal({ onClose }: Props) {
  const { loadDocument, addShape } = useDesignStore()

  const handleSelect = (tpl: Template) => {
    loadDocument([], tpl.name)
    // Add a background frame
    addShape({
      type: 'frame', name: 'Background',
      x: 0, y: 0, width: tpl.width, height: tpl.height,
      rotation: 0, opacity: 1, visible: true, locked: true,
      fill: tpl.bg, stroke: '', strokeWidth: 0, cornerRadius: 0,
    } as Omit<FrameShape, 'id'>)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#252526] border border-[#3e3e3e] rounded-lg shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#3e3e3e]">
          <h2 className="text-white font-semibold text-base">New from Template</h2>
          <button
            onClick={onClose}
            className="text-[#888] hover:text-white w-7 h-7 flex items-center justify-center rounded hover:bg-[#3d3d3d]"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {CATEGORIES.map(cat => (
            <div key={cat} className="mb-5">
              <h3 className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">{cat}</h3>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.filter(t => t.category === cat).map(tpl => {
                  const aspect = tpl.width / tpl.height
                  const previewW = 80
                  const previewH = Math.round(previewW / aspect)
                  const clampedH = Math.min(previewH, 60)
                  const clampedW = Math.round(clampedH * aspect)
                  return (
                    <button
                      key={tpl.name}
                      onClick={() => handleSelect(tpl)}
                      className="flex items-center gap-3 p-3 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-[#3e3e3e] hover:border-[#0079FF] text-left group transition-colors"
                    >
                      {/* Mini canvas preview */}
                      <div
                        className="shrink-0 border border-[#555] rounded-sm"
                        style={{ width: clampedW, height: clampedH, background: tpl.bg }}
                      />
                      <div>
                        <div className="text-sm text-[#ddd] group-hover:text-white leading-tight">{tpl.name}</div>
                        <div className="text-[11px] text-[#666] mt-0.5">{tpl.width} × {tpl.height}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
