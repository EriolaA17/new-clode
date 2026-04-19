import { useDesignStore } from '../store'
import type { Shape, RectShape, FrameShape, TextShape, BlendMode, AlignType } from '../types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#3e3e3e] p-3">
      <div className="panel-label mb-2">{title}</div>
      {children}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-2 mb-1.5 last:mb-0">{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-[#777] w-8 shrink-0">{children}</span>
}

interface NumInputProps {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; unit?: string; width?: string
}

function NumInput({ label, value, onChange, min, max, step = 1, unit, width = 'flex-1' }: NumInputProps) {
  return (
    <div className={`${width} flex items-center gap-1`}>
      <Label>{label}</Label>
      <div className="flex-1 relative">
        <input type="number" className="panel-input pr-4"
          value={Math.round(value * 100) / 100} min={min} max={max} step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        {unit && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#555]">{unit}</span>}
      </div>
    </div>
  )
}

function ColorRow({ label, color, onChange }: { label: string; color: string; onChange: (c: string) => void }) {
  return (
    <Row>
      <Label>{label}</Label>
      <div className="flex-1 flex items-center gap-1.5">
        <div className="w-6 h-6 rounded border border-[#3d3d3d] overflow-hidden shrink-0">
          <input type="color" className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer"
            value={color || '#000000'} onChange={(e) => onChange(e.target.value)} />
        </div>
        <input type="text" className="panel-input flex-1 uppercase font-mono"
          value={color?.replace('#', '') || '000000'}
          onChange={(e) => { const h = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6); if (h.length === 6) onChange(`#${h}`) }}
          maxLength={6} />
      </div>
    </Row>
  )
}

// ─── Align buttons ────────────────────────────────────────────────────────────

const ALIGN_ACTIONS: { type: AlignType; title: string; path: string }[] = [
  { type: 'left',     title: 'Align Left',       path: 'M2 3h2v18H2V3zm4 4h14v4H6V7zm0 6h10v4H6v-4z' },
  { type: 'center-h', title: 'Align Center H',   path: 'M11 3h2v5h6v4h-6v5h-2v-5H5V8h6V3zm0 16h2v2h-2v-2z' },
  { type: 'right',    title: 'Align Right',       path: 'M20 3h2v18h-2V3zM2 7h14v4H2V7zm4 6h10v4H6v-4z' },
  { type: 'top',      title: 'Align Top',         path: 'M3 2v2h18V2H3zm4 4v14h4V6H7zm6 0v10h4V6h-4z' },
  { type: 'center-v', title: 'Align Middle V',    path: 'M3 11v2h5v6h4v-6h5v-2H8V5H4v6H3z' },
  { type: 'bottom',   title: 'Align Bottom',      path: 'M3 20v2h18v-2H3zm4-2v-14H3v14h4zm10 0V8h-4v10h4z' },
]

const BLEND_MODES: BlendMode[] = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion']

export default function PropertiesPanel() {
  const {
    shapes, selectedIds, updateShape, pushHistory,
    bringForward, sendBackward, bringToFront, sendToBack,
    alignSelected, distributeSelected,
  } = useDesignStore()

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id))
  const shape: Shape | undefined = selectedShapes[0]
  const multi = selectedShapes.length > 1

  const update = (updates: Partial<Shape>) => { selectedShapes.forEach(s => updateShape(s.id, updates)) }
  const updateAndSave = (updates: Partial<Shape>) => { update(updates); pushHistory() }

  if (!shape) {
    return (
      <div className="w-60 bg-[#252526] border-l border-[#3e3e3e] flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-[#3e3e3e]"><span className="panel-label">Properties</span></div>
        <div className="flex-1 flex items-center justify-center text-xs text-[#555] text-center px-4">Select a layer to see its properties</div>
      </div>
    )
  }

  return (
    <div className="w-60 bg-[#252526] border-l border-[#3e3e3e] flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#3e3e3e] flex items-center justify-between">
        <span className="panel-label">Properties</span>
        {multi && <span className="text-xs text-[#666]">{selectedShapes.length} selected</span>}
      </div>

      {/* Name */}
      {!multi && (
        <div className="border-b border-[#3e3e3e] p-3">
          <input type="text" className="panel-input" value={shape.name}
            onChange={(e) => update({ name: e.target.value })} onBlur={() => pushHistory()} />
        </div>
      )}

      {/* Align & Distribute (multi-select) */}
      {multi && (
        <Section title="Align">
          <div className="grid grid-cols-6 gap-0.5 mb-2">
            {ALIGN_ACTIONS.map(a => (
              <button key={a.type} title={a.title}
                className="p-1.5 rounded hover:bg-[#3d3d3d] text-[#888] hover:text-white"
                onClick={() => alignSelected(a.type)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d={a.path} /></svg>
              </button>
            ))}
          </div>
          {selectedShapes.length >= 3 && (
            <Row>
              <button className="flex-1 text-xs text-[#999] border border-[#3d3d3d] rounded px-2 py-1 hover:text-white hover:border-[#555]"
                onClick={() => distributeSelected('horizontal')}>Distribute H</button>
              <button className="flex-1 text-xs text-[#999] border border-[#3d3d3d] rounded px-2 py-1 hover:text-white hover:border-[#555]"
                onClick={() => distributeSelected('vertical')}>Distribute V</button>
            </Row>
          )}
        </Section>
      )}

      {/* Layout */}
      <Section title="Layout">
        <Row>
          <NumInput label="X" value={Math.round(shape.x)} onChange={(v) => updateAndSave({ x: v })} width="flex-1" />
          <NumInput label="Y" value={Math.round(shape.y)} onChange={(v) => updateAndSave({ y: v })} width="flex-1" />
        </Row>
        {shape.type !== 'line' && (
          <Row>
            <NumInput label="W" value={Math.round(shape.width)} onChange={(v) => updateAndSave({ width: Math.max(1, v) })} min={1} width="flex-1" />
            <NumInput label="H" value={Math.round(shape.height)} onChange={(v) => updateAndSave({ height: Math.max(1, v) })} min={1} width="flex-1" />
          </Row>
        )}
        <Row>
          <NumInput label="R°" value={shape.rotation} onChange={(v) => updateAndSave({ rotation: v })} width="flex-1" />
          <NumInput label="O%" value={Math.round(shape.opacity * 100)} onChange={(v) => updateAndSave({ opacity: Math.max(0, Math.min(1, v / 100)) })} min={0} max={100} width="flex-1" />
        </Row>
      </Section>

      {/* Fill */}
      <Section title="Fill">
        <ColorRow label="Fill" color={shape.fill || '#E0E0E0'} onChange={(c) => updateAndSave({ fill: c })} />
      </Section>

      {/* Stroke */}
      <Section title="Stroke">
        <ColorRow label="Color" color={shape.stroke || '#000000'} onChange={(c) => updateAndSave({ stroke: c })} />
        <Row><NumInput label="W" value={shape.strokeWidth || 0} onChange={(v) => updateAndSave({ strokeWidth: Math.max(0, v) })} min={0} /></Row>
      </Section>

      {/* Corner radius */}
      {(shape.type === 'rect' || shape.type === 'frame') && (
        <Section title="Corner Radius">
          <Row><NumInput label="R" value={(shape as RectShape | FrameShape).cornerRadius || 0}
            onChange={(v) => updateAndSave({ cornerRadius: Math.max(0, v) } as Partial<Shape>)} min={0} /></Row>
        </Section>
      )}

      {/* Text */}
      {shape.type === 'text' && !multi && (
        <Section title="Text">
          <Row>
            <Label>Font</Label>
            <select className="panel-input flex-1" value={(shape as TextShape).fontFamily || 'Inter, sans-serif'}
              onChange={(e) => updateAndSave({ fontFamily: e.target.value } as Partial<Shape>)}>
              {['Inter, sans-serif','Arial, sans-serif','Georgia, serif',"'Courier New', monospace","'Times New Roman', serif",'Helvetica, sans-serif','Verdana, sans-serif'].map(f => (
                <option key={f} value={f}>{f.split(',')[0].replace(/'/g,'')}</option>
              ))}
            </select>
          </Row>
          <Row>
            <NumInput label="Size" value={(shape as TextShape).fontSize || 16} onChange={(v) => updateAndSave({ fontSize: Math.max(1, v) } as Partial<Shape>)} min={1} />
            <NumInput label="LH" value={(shape as TextShape).lineHeight || 1.2} onChange={(v) => updateAndSave({ lineHeight: Math.max(0.5, v) } as Partial<Shape>)} min={0.5} step={0.1} />
          </Row>
          <Row>
            <Label>Style</Label>
            <select className="panel-input flex-1" value={(shape as TextShape).fontStyle || 'normal'}
              onChange={(e) => updateAndSave({ fontStyle: e.target.value } as Partial<Shape>)}>
              {['normal','bold','italic','bold italic'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
          <Row>
            <Label>Align</Label>
            <div className="flex gap-1">
              {(['left','center','right'] as const).map(a => (
                <button key={a}
                  className={`flex-1 py-1 text-xs rounded border ${(shape as TextShape).textAlign === a ? 'border-[#0079FF] text-[#0079FF] bg-[#0079FF11]' : 'border-[#3d3d3d] text-[#777] hover:text-white'}`}
                  onClick={() => updateAndSave({ textAlign: a } as Partial<Shape>)}>{a[0].toUpperCase()}</button>
              ))}
            </div>
          </Row>
        </Section>
      )}

      {/* Shadow */}
      <Section title="Shadow">
        <Row>
          <label className="flex items-center gap-2 text-xs text-[#999] cursor-pointer">
            <input type="checkbox" checked={shape.shadow?.enabled ?? false}
              onChange={e => updateAndSave({ shadow: { enabled: e.target.checked, color: shape.shadow?.color ?? '#000000', blur: shape.shadow?.blur ?? 8, offsetX: shape.shadow?.offsetX ?? 4, offsetY: shape.shadow?.offsetY ?? 4, opacity: shape.shadow?.opacity ?? 0.5 } })} />
            Enable shadow
          </label>
        </Row>
        {shape.shadow?.enabled && (<>
          <ColorRow label="Color" color={shape.shadow.color} onChange={c => updateAndSave({ shadow: { ...shape.shadow!, color: c } })} />
          <Row>
            <NumInput label="Blur" value={shape.shadow.blur} onChange={v => updateAndSave({ shadow: { ...shape.shadow!, blur: Math.max(0, v) } })} min={0} />
            <NumInput label="Opac" value={Math.round(shape.shadow.opacity * 100)} onChange={v => updateAndSave({ shadow: { ...shape.shadow!, opacity: Math.max(0, Math.min(1, v / 100)) } })} min={0} max={100} />
          </Row>
          <Row>
            <NumInput label="X" value={shape.shadow.offsetX} onChange={v => updateAndSave({ shadow: { ...shape.shadow!, offsetX: v } })} />
            <NumInput label="Y" value={shape.shadow.offsetY} onChange={v => updateAndSave({ shadow: { ...shape.shadow!, offsetY: v } })} />
          </Row>
        </>)}
      </Section>

      {/* Blend mode */}
      <Section title="Blend Mode">
        <Row>
          <select className="panel-input flex-1 capitalize"
            value={shape.blendMode || 'normal'}
            onChange={e => updateAndSave({ blendMode: e.target.value as BlendMode })}>
            {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Row>
      </Section>

      {/* Image editing */}
      {!multi && shape.type === 'image' && (
        <Section title="Image">
          <button
            className="w-full text-xs text-[#999] border border-[#3d3d3d] rounded px-2 py-1.5 hover:text-white hover:border-[#555]"
            onClick={() => window.dispatchEvent(new CustomEvent('figma:edit-image', { detail: { id: shape.id } }))}>
            Edit Image…
          </button>
        </Section>
      )}

      {/* Arrangement */}
      {!multi && (
        <Section title="Arrangement">
          <div className="grid grid-cols-2 gap-1">
            {[
              { label: 'Bring to Front', action: () => bringToFront(shape.id) },
              { label: 'Send to Back', action: () => sendToBack(shape.id) },
              { label: 'Bring Forward', action: () => bringForward(shape.id) },
              { label: 'Send Backward', action: () => sendBackward(shape.id) },
            ].map(({ label, action }) => (
              <button key={label} className="text-xs text-[#999] border border-[#3d3d3d] rounded px-2 py-1 hover:text-white hover:border-[#555]"
                onClick={action}>{label}</button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
