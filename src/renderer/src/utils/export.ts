import type { Shape, RectShape, FrameShape, EllipseShape, TextShape, LineShape } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexToRgbaFloat(hex: string): [number, number, number, number] {
  const c = hex.replace('#', '')
  if (c.length < 6) return [0, 0, 0, 1]
  return [
    parseInt(c.slice(0, 2), 16) / 255,
    parseInt(c.slice(2, 4), 16) / 255,
    parseInt(c.slice(4, 6), 16) / 255,
    1,
  ]
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ─── SVG Export ───────────────────────────────────────────────────────────────

function shapeToSVGElement(shape: Shape): string {
  if (!shape.visible) return ''

  const fill = shape.fill || 'none'
  const stroke = shape.stroke || 'none'
  const sw = shape.strokeWidth || 0
  const op = shape.opacity !== 1 ? ` opacity="${shape.opacity}"` : ''

  switch (shape.type) {
    case 'rect':
    case 'frame': {
      const s = shape as RectShape | FrameShape
      const cr = s.cornerRadius || 0
      const cx = s.x + s.width / 2
      const cy = s.y + s.height / 2
      const rot = s.rotation ? ` transform="rotate(${s.rotation} ${cx} ${cy})"` : ''
      return `  <rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${cr}" ry="${cr}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rot}${op}/>`
    }

    case 'ellipse': {
      const s = shape as EllipseShape
      const rx = s.width / 2
      const ry = s.height / 2
      const cx = s.x + rx
      const cy = s.y + ry
      const rot = s.rotation ? ` transform="rotate(${s.rotation} ${cx} ${cy})"` : ''
      return `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${rot}${op}/>`
    }

    case 'text': {
      const s = shape as TextShape
      const cx = s.x + s.width / 2
      const cy = s.y + s.height / 2
      const rot = s.rotation ? ` transform="rotate(${s.rotation} ${cx} ${cy})"` : ''
      const anchor = s.textAlign === 'center' ? 'middle' : s.textAlign === 'right' ? 'end' : 'start'
      const tx = s.textAlign === 'center' ? cx : s.textAlign === 'right' ? s.x + s.width : s.x
      const style = `font-size:${s.fontSize}px;font-family:${s.fontFamily || 'sans-serif'};font-style:${s.fontStyle?.includes('italic') ? 'italic' : 'normal'};font-weight:${s.fontStyle?.includes('bold') ? 'bold' : 'normal'}`
      return `  <text x="${tx}" y="${s.y + s.fontSize}" style="${style}" fill="${fill}" text-anchor="${anchor}"${rot}${op}>${escapeXml(s.text || '')}</text>`
    }

    case 'line': {
      const s = shape as LineShape
      const pts: string[] = []
      for (let i = 0; i + 1 < s.points.length; i += 2) {
        pts.push(`${s.x + s.points[i]},${s.y + s.points[i + 1]}`)
      }
      const strokeColor = s.fill || stroke || '#000000'
      return `  <polyline points="${pts.join(' ')}" stroke="${strokeColor}" stroke-width="${sw || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round"${op}/>`
    }

    default:
      return ''
  }
}

export function shapesToSVG(shapes: Shape[]): string {
  const visible = shapes.filter(s => s.visible)

  let vb = { x: 0, y: 0, w: 512, h: 512 }
  if (visible.length > 0) {
    const xs = visible.map(s => s.x)
    const ys = visible.map(s => s.y)
    const xes = visible.map(s => s.x + (s.type === 'line' ? 0 : s.width))
    const yes = visible.map(s => s.y + (s.type === 'line' ? 0 : s.height))
    const minX = Math.min(...xs) - 10
    const minY = Math.min(...ys) - 10
    const maxX = Math.max(...xes) + 10
    const maxY = Math.max(...yes) + 10
    vb = { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }

  const elements = visible.map(shapeToSVGElement).filter(Boolean)
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">`,
    ...elements,
    `</svg>`,
  ].join('\n')
}

// ─── Lottie / TGS Export ─────────────────────────────────────────────────────

const TGS_SIZE = 512
const TGS_FPS = 60
const TGS_FRAMES = 120 // 2 s

/** Bounce-in scale keyframes on every layer so the sticker feels alive */
function bounceScale() {
  return {
    a: 1,
    k: [
      {
        t: 0, s: [0, 0, 100], e: [115, 115, 100],
        i: { x: [0.5, 0.5, 0.5], y: [1.6, 1.6, 1] },
        o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] },
      },
      {
        t: 22, s: [115, 115, 100], e: [100, 100, 100],
        i: { x: [0.5, 0.5, 0.5], y: [1, 1, 1] },
        o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] },
      },
      { t: 40 },
    ],
  }
}

function tr() {
  return {
    ty: 'tr',
    o: { a: 0, k: 100 },
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
  }
}

function fillItem(color: [number, number, number, number], opacity: number) {
  return { ty: 'fl', nm: 'fill', o: { a: 0, k: Math.round(opacity * 100) }, c: { a: 0, k: color } }
}

function strokeItem(color: [number, number, number, number], width: number, opacity: number) {
  return { ty: 'st', nm: 'stroke', o: { a: 0, k: Math.round(opacity * 100) }, c: { a: 0, k: color }, w: { a: 0, k: width }, lc: 2, lj: 2 }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shapeToLayer(shape: Shape, idx: number, sc: number, ox: number, oy: number): any | null {
  if (!shape.visible) return null

  const op = Math.round(shape.opacity * 100)
  const rot = shape.rotation || 0
  const fillColor = shape.fill ? hexToRgbaFloat(shape.fill) : ([0.88, 0.88, 0.88, 1] as [number, number, number, number])
  const strokeColor = shape.stroke ? hexToRgbaFloat(shape.stroke) : null
  const hasStroke = strokeColor !== null && (shape.strokeWidth || 0) > 0
  const base = { ddd: 0, ind: idx, sr: 1, nm: shape.name, ao: 0, ip: 0, op: TGS_FRAMES, st: 0, bm: 0 }

  const ks = (cx: number, cy: number) => ({
    o: { a: 0, k: op },
    r: { a: 0, k: rot },
    p: { a: 0, k: [cx, cy, 0] },
    a: { a: 0, k: [0, 0, 0] },
    s: bounceScale(),
  })

  switch (shape.type) {
    case 'rect':
    case 'frame': {
      const s = shape as RectShape | FrameShape
      const w = s.width * sc
      const h = s.height * sc
      const cx = (s.x + s.width / 2) * sc + ox
      const cy = (s.y + s.height / 2) * sc + oy
      const items = [
        { ty: 'rc', d: 1, nm: 'path', s: { a: 0, k: [w, h] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: (s.cornerRadius || 0) * sc } },
        fillItem(fillColor, shape.opacity),
        ...(hasStroke ? [strokeItem(strokeColor!, (s.strokeWidth || 1) * sc, shape.opacity)] : []),
        tr(),
      ]
      return { ...base, ty: 4, ks: ks(cx, cy), shapes: [{ ty: 'gr', nm: 'g', it: items }] }
    }

    case 'ellipse': {
      const s = shape as EllipseShape
      const w = s.width * sc
      const h = s.height * sc
      const cx = (s.x + s.width / 2) * sc + ox
      const cy = (s.y + s.height / 2) * sc + oy
      const items = [
        { ty: 'el', d: 1, nm: 'path', s: { a: 0, k: [w, h] }, p: { a: 0, k: [0, 0] } },
        fillItem(fillColor, shape.opacity),
        ...(hasStroke ? [strokeItem(strokeColor!, (s.strokeWidth || 1) * sc, shape.opacity)] : []),
        tr(),
      ]
      return { ...base, ty: 4, ks: ks(cx, cy), shapes: [{ ty: 'gr', nm: 'g', it: items }] }
    }

    case 'line': {
      const s = shape as LineShape
      const verts: [number, number][] = []
      for (let i = 0; i + 1 < s.points.length; i += 2) {
        verts.push([s.points[i] * sc, s.points[i + 1] * sc])
      }
      const zero = verts.map(() => [0, 0] as [number, number])
      const px = s.x * sc + ox
      const py = s.y * sc + oy
      const lineStroke = s.fill ? hexToRgbaFloat(s.fill) : ([0, 0, 0, 1] as [number, number, number, number])
      const items = [
        { ty: 'sh', nm: 'path', ks: { a: 0, k: { i: zero, o: zero, v: verts, c: false } } },
        strokeItem(lineStroke, (s.strokeWidth || 2) * sc, shape.opacity),
        tr(),
      ]
      return { ...base, ty: 4, ks: ks(px, py), shapes: [{ ty: 'gr', nm: 'g', it: items }] }
    }

    case 'text': {
      const s = shape as TextShape
      const px = s.x * sc + ox
      const py = (s.y + s.fontSize) * sc + oy
      const fc = s.fill ? hexToRgbaFloat(s.fill).slice(0, 3) : [0, 0, 0]
      const fontName = (s.fontFamily || 'sans-serif').split(',')[0].replace(/['"]/g, '').trim()
      const fStyle = s.fontStyle || 'normal'
      const weight = fStyle.includes('bold') ? 'Bold' : ''
      const style = fStyle.includes('italic') ? 'Italic' : ''
      const variant = [weight, style].filter(Boolean).join(' ') || 'Regular'
      return {
        ...base,
        ty: 5,
        ks: {
          o: { a: 0, k: op },
          r: { a: 0, k: rot },
          p: { a: 0, k: [px, py, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: bounceScale(),
        },
        t: {
          d: {
            k: [{
              t: 0,
              s: {
                s: (s.fontSize || 16) * sc,
                f: `${fontName}-${variant}`,
                t: s.text || '',
                j: s.textAlign === 'center' ? 2 : s.textAlign === 'right' ? 1 : 0,
                tr: 0,
                lh: (s.lineHeight || 1.2) * (s.fontSize || 16) * sc,
                ls: 0,
                fc,
                sc: [0, 0, 0],
                sw: 0,
                of: false,
              },
            }],
          },
          p: {},
          m: { g: 1, a: { a: 0, k: [0, 0] } },
          a: [],
        },
      }
    }

    default:
      return null
  }
}

export function shapesToLottie(shapes: Shape[], name: string): object {
  const visible = shapes.filter(s => s.visible)

  const empty = { v: '5.9.0', fr: TGS_FPS, ip: 0, op: TGS_FRAMES, w: TGS_SIZE, h: TGS_SIZE, nm: name, ddd: 0, assets: [], layers: [] }
  if (visible.length === 0) return empty

  // Bounding box
  const nonLine = visible.filter(s => s.type !== 'line')
  const xs = nonLine.map(s => s.x)
  const ys = nonLine.map(s => s.y)
  const xes = nonLine.map(s => s.x + s.width)
  const yes = nonLine.map(s => s.y + s.height)
  if (!xs.length) return empty

  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const contentW = Math.max(...xes) - minX
  const contentH = Math.max(...yes) - minY

  const pad = 30
  const sc = Math.min((TGS_SIZE - pad * 2) / contentW, (TGS_SIZE - pad * 2) / contentH)
  const ox = (TGS_SIZE - contentW * sc) / 2 - minX * sc
  const oy = (TGS_SIZE - contentH * sc) / 2 - minY * sc

  const layers = visible
    .map((s, i) => shapeToLayer(s, i + 1, sc, ox, oy))
    .filter(Boolean)
    .reverse()

  return { ...empty, layers }
}
