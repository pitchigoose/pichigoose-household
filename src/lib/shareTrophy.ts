// Sharing a trophy (Nora, 2 Nov): the share picture is Nora's "Join my household" layout with the trophy in the stamp
// (public/og/trophy/<chore>.jpg, the gold medal peeking out behind it), and your line written on it in Caveat, the
// app's handwriting: "I won Laundry Wizard! for doing the laundry 12 times in October 2026".
import type { Chore } from './chores'

const W = 1200
const H = 630
const LEFT = 142
const WIDTH = 430

function load(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Writes `text` in the largest size (from `max` down to `min`) that fits `width`. */
function fit(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, max: number, min: number) {
  let size = max
  for (; size > min; size -= 2) {
    ctx.font = `700 ${size}px Caveat`
    if (ctx.measureText(text).width <= width) break
  }
  ctx.fillText(text, x, y)
  return size
}

/** Wraps `text` onto as many lines as it needs, `lineHeight` apart. */
function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, size: number, lineHeight: number) {
  ctx.font = `700 ${size}px Caveat`
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(line, x, y)
      y += lineHeight
      line = word
    } else line = next
  }
  if (line) ctx.fillText(line, x, y)
}

/** The share picture for a trophy, as a file ready to share. */
export async function trophyPicture(chore: Chore, headline: string, line: string) {
  const [img] = await Promise.all([load(`/og/trophy/${chore}.jpg`), document.fonts.load('700 56px Caveat')])
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(img, 0, 0, W, H)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#1E1A30'
  fit(ctx, headline, LEFT, 488, WIDTH, 60, 34)
  ctx.fillStyle = '#4A4156'
  wrap(ctx, line, LEFT, 534, WIDTH, 34, 38)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) throw new Error('no picture')
  return new File([blob], 'pichigoose-trophy.jpg', { type: 'image/jpeg' })
}

/** Opens the phone's share sheet with the picture; on a computer (no sharing files), the picture downloads instead.
 *  Returns 'saved' when it downloaded. Call it straight from the tap: the picture must already be made. */
export async function sharePicture(file: File, text: string): Promise<'shared' | 'saved' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text })
      return 'shared'
    } catch {
      return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'saved'
}
