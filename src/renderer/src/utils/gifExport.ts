import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { AnimFrame, Shape } from '../types'

/**
 * Renders each animation frame onto an offscreen canvas using the Konva stage
 * then encodes all frames into a GIF, returning a base64 data URL.
 */
export async function framesToGIF(
  frames: AnimFrame[],
  baseShapes: Shape[],
  stageDataURL: (overrides: Record<string, unknown>) => Promise<string>,
  width: number,
  height: number,
): Promise<string> {
  const gif = GIFEncoder()

  for (const frame of frames) {
    const dataURL = await stageDataURL(frame.overrides)
    const imageData = await dataURLToImageData(dataURL, width, height)
    const { data } = imageData

    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)

    gif.writeFrame(index, width, height, { palette, delay: frame.duration })
  }

  gif.finish()
  const bytes = gif.bytesView()
  const base64 = uint8ToBase64(bytes)
  return `data:image/gif;base64,${base64}`
}

async function dataURLToImageData(dataURL: string, width: number, height: number): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      resolve(ctx.getImageData(0, 0, width, height))
    }
    img.onerror = reject
    img.src = dataURL
  })
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
