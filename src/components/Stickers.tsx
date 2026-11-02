import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMyProfile } from '../data/hooks'

// Stickers: Nora's painted sticker sheets, cut into one file per sticker by scripts/cut-stickers.py.
// Your pack follows your avatar: onigiri people get onigiri stickers, ramen people ramen ones, and
// everyone else gets Pichi's goose stickers until their own sheet exists.
// A sticker is saved by its name, like "onigiri/love", in the sticker field of a comment or message.

const FILES = import.meta.glob('../../assets/stickers/*/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

export const STICKERS = ['love', 'kiss', 'wink', 'hi', 'yay', 'aww', 'ok', 'cry', 'wow', 'angry', 'sleepy', 'party'] as const
const PACKS = ['pichi', 'onigiri', 'ramen']

/** The sticker pack for an avatar character. */
export function packFor(character?: string | null) {
  return character && PACKS.includes(character) ? character : 'pichi'
}

export function stickerUrl(name: string): string | undefined {
  return FILES[`../../assets/stickers/${name}.webp`]
}

/** A sent sticker. */
export function StickerImage({ name, size }: { name: string; size: number }) {
  const { t } = useTranslation()
  const url = stickerUrl(name)
  const label = t(`stickers.names.${name.split('/')[1]}`, { defaultValue: '' })
  if (!url) return null
  return <img className="sticker-img" src={url} alt={label ? t('stickers.alt', { name: label }) : t('stickers.title')} width={size} height={size} draggable={false} />
}

/** The small sticker button next to Send, and the tray of your stickers above it. Tap one to send it. */
export function StickerButton({ onSend }: { onSend: (name: string) => void }) {
  const { t } = useTranslation()
  const me = useMyProfile()
  const pack = packFor(me?.avatar?.character)
  const [open, setOpenState] = useState(false)
  // The tray stays on screen while it shrinks back into the button, then goes (Nora, 2 Nov: the same motion as the
  // menu's pill: it springs out of the button, and glides back into it).
  const [mounted, setMounted] = useState(false)
  const closing = useRef<number | undefined>(undefined)
  const setOpen = (next: boolean | ((o: boolean) => boolean)) => {
    const value = typeof next === 'function' ? next(open) : next
    window.clearTimeout(closing.current)
    if (value) setMounted(true)
    else closing.current = window.setTimeout(() => setMounted(false), 600)
    setOpenState(value)
  }
  useEffect(() => () => window.clearTimeout(closing.current), [])
  const box = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const tray = useRef<HTMLSpanElement>(null)
  // It grows from the sticker button itself, wherever the button sits under it. Measured before the animation starts
  // (a tray that's already shrunk would give the wrong spot), then the animation is switched on.
  const [measured, setMeasured] = useState(false)
  useLayoutEffect(() => {
    const t = tray.current
    const b = btn.current
    if (!mounted) {
      setMeasured(false)
      return
    }
    if (measured || !t || !b) return
    const tr = t.getBoundingClientRect()
    const br = b.getBoundingClientRect()
    t.style.transformOrigin = `${Math.round(br.left + br.width / 2 - tr.left)}px ${Math.round(br.top + br.height / 2 - tr.top)}px`
    setMeasured(true)
  }, [mounted, measured])

  // A tap anywhere else, or Escape, closes the tray.
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <span ref={box} className="sticker-box">
      <button
        ref={btn}
        type="button"
        className={`sticker-btn${open ? ' on' : ''}`}
        aria-label={t('stickers.title')}
        title={t('stickers.title')}
        aria-expanded={open}
        // Opens the moment your finger touches it, and keeps the keyboard where it is.
        onPointerDown={(e) => {
          e.preventDefault()
          setOpen((o) => !o)
        }}
        onClick={(e) => {
          if (e.detail === 0) setOpen((o) => !o)
        }}
      >
        {/* WhatsApp's sticker icon (Nora, 31 Oct): a rounded square with its bottom-right corner peeled up, no face.
            36 px, with the line still 2 px on screen (2.22 in the 40-wide box). */}
        <svg viewBox="0 0 40 40" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.22" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M22 34H13a7 7 0 0 1-7-7V13a7 7 0 0 1 7-7h14a7 7 0 0 1 7 7v9L22 34Z" />
          <path d="M34 22h-5.5a6.5 6.5 0 0 0-6.5 6.5V34" />
        </svg>
      </button>
      {mounted && (
        <span ref={tray} className={`sticker-tray ${!measured ? 'measuring' : open ? 'in' : 'out'}`} role="dialog" aria-label={t('stickers.title')} aria-hidden={!open || undefined}>
          {STICKERS.map((s, i) => (
            <button
              key={s}
              type="button"
              tabIndex={open ? undefined : -1}
              style={{ ['--i' as string]: i }}
              className="sticker-pick"
              aria-label={t(`stickers.names.${s}`)}
              title={t(`stickers.names.${s}`)}
              onPointerDown={(e) => e.preventDefault()}
              onPointerUp={() => {
                onSend(`${pack}/${s}`)
                setOpen(false)
              }}
              onClick={(e) => {
                if (e.detail !== 0) return
                onSend(`${pack}/${s}`)
                setOpen(false)
              }}
            >
              <img src={stickerUrl(`${pack}/${s}`)} alt="" width={64} height={64} draggable={false} />
            </button>
          ))}
        </span>
      )}
    </span>
  )
}
