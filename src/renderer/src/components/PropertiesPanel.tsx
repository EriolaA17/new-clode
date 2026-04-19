import { useDesignStore } from '../store'
import type { Shape, RectShape, FrameShape, TextShape } from '../types'

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
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
  width?: string
}

function NumInput({ label, value, onChange, min, max, step = 1, unit, width = 'flex-1' }: NumInputProps) {
  return (
    <div className={`${width} flex items-center gap-1`}>
      <Label>{label}</Label>
      <div className="flex-1 relative">
        <input
          type="number"
          className="panel-input pr-4"
          value={Math.round(value * 100) / 100}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-[#555]">{unit}</span>
        )}
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
          <input
            type="color"
            className="w-8 h-8 -translate-x-1 -translate-y-1 cursor-pointer"
            value={color || '#000000'}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
        <input
          type="text"
          className="panel-input flex-1 uppercase font-mono"
          value={color?.replace('#', '') || '000000'}
          onChange={(e) => {
            const hex = e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6)
            if (hex.length === 6) onChange(`#${hex}`)
          }}
          maxLength={6}
        />
      </div>
    </Row>
  )
}

export default function PropertiesPanel() {
  const { shapes, selectedIds, updateShape, pushHistory, bringForward, sendBackward, bringToFront, sendToBack } =
    useDesignStore()

  const selectedShapes = shapes.filter(s => selectedIds.includes(s.id))
  const shape: Shape | undefined = selectedShapes[0]

  const update = (updates: Partial<Shape>) => {
    selectedShapes.forEach(s => updateShape(s.id, updates))
  }

  const updateAndSave = (updates: Partial<Shape>) => {
    update(updates)
    pushHistory()
  }

  if (!shape) {
    return (
      <div className="w-60 bg-[#252526] border-l border-[#3e3e3e] flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-[#3e3e3e]">
          <span className="panel-label">Properties</span>
        </div>
        <div className="flex-1 flex items-center justify-center text-xs text-[#555] text-center px-4">
          Select a layer to see its properties
        </div>
      </div>
    )
  }

  return (
    <div className="w-60 bg-[#252526] border-l border-[#3e3e3e] flex flex-col shrink-0 overflow-y-auto">
      <div className="px-3 py-2 border-b border-[#3e3e3e] flex items-center justify-between">
        <span className="panel-label">Properties</span>
        {selectedShapes.length > 1 && (
          <span className="text-xs text-[#666]">{selectedShapes.length} selected</span>
        )}
      </div>

      {/* Name */}
      <div className="border-b border-[#3e3e3e] p-3">
        <input
          type="text"
          className="panel-input"
          value={shape.name}
          onChange={(e) => update({ name: e.target.value })}
          onBlur={() => pushHistory()}
        />
      </div>

      {/* Position & Size */}
      <Section title="Layout">
        <Row>
          <NumInput label="X" value={Math.round(shape.x)} onChange={(v) => updateAndSave({ x: v })} step={1} width="flex-1" />
          <NumInput label="Y" value={Math.round(shape.y)} onChange={(v) => updateAndSave({ y: v })} step={1} width="flex-1" />
        </Row>
        {shape.type !== 'line' && (
          <Row>
            <NumInput label="W" value={Math.round(shape.width)} onChange={(v) => updateAndSave({ width: Math.max(1, v) })} min={1} step={1} width="flex-1" />
            <NumInput label="H" value={Math.round(shape.height)} onChange={(v) => updateAndSave({ height: Math.max(1, v) })} min={1} step={1} width="flex-1" />
          </Row>
        )}
        <Row>
          <NumInput label="R°" value={shape.rotation} onChange={(v) => updateAndSave({ rotation: v })} step={1} width="flex-1" />
          <NumInput label="O%" value={Math.round(shape.opacity * 100)} onChange={(v) => updateAndSave({ opacity: Math.max(0, Math.min(1, v / 100)) })} min={0} max={100} step={1} width="flex-1" />
        </Row>
      </Section>

      {/* Fill */}
      <Section title="Fill">
        <ColorRow label="Fill" color={shape.fill || '#E0E0E0'} onChange={(c) => updateAndSave({ fill: c })} />
      </Section>

      {/* Stroke */}
      <Section title="Stroke">
        <ColorRow label="Color" color={shape.stroke || '#000000'} onChange={(c) => updateAndSave({ stroke: c })} />
        <Row>
          <NumInput label="W" value={shape.strokeWidth || 0} onChange={(v) => updateAndSave({ strokeWidth: Math.max(0, v) })} min={0} step={1} />
        </Row>
      </Section>

      {/* Corner radius for rect/frame */}
      {(shape.type === 'rect' || shape.type === 'frame') && (
        <Section title="Corner Radius">
          <Row>
            <NumInput
              label="R"
              value={(shape as RectShape | FrameShape).cornerRadius || 0}
              onChange={(v) => updateAndSave({ cornerRadius: Math.max(0, v) } as Partial<Shape>)}
              min={0}
              step={1}
            />
          </Row>
        </Section>
      )}

      {/* Text properties */}
      {shape.type === 'text' && (
        <Section title="Text">
          <Row>
            <Label>Font</Label>
            <select
              className="panel-input flex-1"
              value={(shape as TextShape).fontFamily || 'Inter, sans-serif'}
              onChange={(e) => updateAndSave({ fontFamily: e.target.value } as Partial<Shape>)}
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier New</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="Verdana, sans-serif">Verdana</option>
            </select>
          </Row>
          <Row>
            <NumInput
              label="Size"
              value={(shape as TextShape).fontSize || 16}
              onChange={(v) => updateAndSave({ fontSize: Math.max(1, v) } as Partial<Shape>)}
              min={1}
              step={1}
            />
            <NumInput
              label="LH"
              value={(shape as TextShape).lineHeight || 1.2}
              onChange={(v) => updateAndSave({ lineHeight: Math.max(0.5, v) } as Partial<Shape>)}
              min={0.5}
              step={0.1}
            />
          </Row>
          <Row>
            <Label>Style</Label>
            <select
              className="panel-input flex-1"
              value={(shape as TextShape).fontStyle || 'normal'}
              onChange={(e) => updateAndSave({ fontStyle: e.target.value } as Partial<Shape>)}
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="bold italic">Bold Italic</option>
            </select>
          </Row>
          <Row>
            <Label>Align</Label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map(a => (
                <button
                  key={a}
                  className={`flex-1 py-1 text-xs rounded border ${
                    (shape as TextShape).textAlign === a
                      ? 'border-[#0079FF] text-[#0079FF] bg-[#0079FF11]'
                      : 'border-[#3d3d3d] text-[#777] hover:text-white'
                  }`}
                  onClick={() => updateAndSave({ textAlign: a } as Partial<Shape>)}
                >
                  {a[0].toUpperCase()}
                </button>
              ))}
            </div>
          </Row>
        </Section>
      )}

      {/* Layer order */}
      {selectedIds.length === 1 && (
        <Section title="Arrangement">
          <div className="grid grid-cols-2 gap-1">
            {[
              { label: 'Bring to Front', action: () => bringToFront(shape.id) },
              { label: 'Send to Back', action: () => sendToBack(shape.id) },
              { label: 'Bring Forward', action: () => bringForward(shape.id) },
              { label: 'Send Backward', action: () => sendBackward(shape.id) },
            ].map(({ label, action }) => (
              <button
                key={label}
                className="text-xs text-[#999] border border-[#3d3d3d] rounded px-2 py-1 hover:text-white hover:border-[#555] transition-colors"
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
