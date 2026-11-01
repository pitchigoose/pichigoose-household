import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SendIcon } from './Icons'
import { StickerButton } from './Stickers'
import { useHousehold } from '../data/hooks'
import { useMe } from '../auth'
import { Avatar } from './Avatar'
import { insertMention, typingMention } from '../lib/mentions'

// One typing bar for every place you type a short text (Nora, 29 Oct): the chat, comments and Shopping's add field.
// A strip of our paper with the field, stickers (where they fit) and the round send button, floating right above
// the keyboard while you type. Sending closes the keyboard, except in the chat (keepKeyboard). One component, so a fix
// here fixes all of them.

const touchScreen = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** When something was last sent: the same tap mustn't also press whatever sits under the bar once it's gone. */
let sentAt = 0
export const justSent = () => Date.now() - sentAt < 600

type Props = {
  value: string
  onChange: (text: string) => void
  /** Called with the text when you send. The bar then lets go of the keyboard. */
  onSend: (text: string) => void
  placeholder: string
  /** A sticker picked from the sticker button, sent right away. Leave out where stickers don't belong. */
  onSticker?: (name: string) => void
  /** Grows to five lines (the chat). Otherwise one line. */
  multiline?: boolean
  /** Something shown above the field, like the message you're replying to. */
  above?: ReactNode
  fieldRef?: { current: HTMLTextAreaElement | HTMLInputElement | null }
  className?: string
  onBlur?: () => void
  /** Hidden from tabbing and screen readers while it's closed (Shopping's add field). */
  closed?: boolean
  /** Typing @ offers the household's people to tag (comments and the chat). */
  mentionable?: boolean
  /** Keep the keyboard up after sending, to write the next message right away (the chat, Nora, 1 Nov). */
  keepKeyboard?: boolean
}

export function TypingBar({ value, onChange, onSend, placeholder, onSticker, multiline, above, fieldRef, className = '', onBlur, closed, mentionable, keepKeyboard }: Props) {
  const { t } = useTranslation()
  const own = useRef<HTMLTextAreaElement & HTMLInputElement>(null)
  // While you're typing (and for a moment after the field lets go, so a tap on Send still lands on it).
  const [typing, setTyping] = useState(false)
  const settle = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(settle.current), [])
  const setRef = (el: (HTMLTextAreaElement & HTMLInputElement) | null) => {
    own.current = el
    if (fieldRef) fieldRef.current = el
  }

  // The chat's field grows with the text, up to five lines.
  useLayoutEffect(() => {
    const el = own.current
    if (!el || !multiline) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [value, multiline])

  // The text as it is in the field right now. On iPhone the last word (and dictation) can still be held by the
  // keyboard, so the app's copy can lag behind or even be empty when you tap Send; the field itself already has it.
  // That made the first tap only close the keyboard and the second one send (Nora, 30 Oct).
  const current = () => own.current?.value ?? value

  function send(e?: FormEvent) {
    e?.preventDefault()
    const text = current().trim()
    if (!text) return
    sentAt = Date.now()
    onSend(text)
    // Sending closes the keyboard, except in the chat, where you often write the next one right away.
    if (!keepKeyboard) own.current?.blur()
  }

  // Inside a scrolling pop-up (comments), iPhone can draw the floating bar in one place but decide the tap hit
  // something else, so tapping Send only closed the keyboard (Nora, 1 Nov). While you're typing, also check where
  // the finger really landed: on the Send button, it sends, whatever the phone thinks was tapped.
  const sendRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!typing) return
    const onTouch = (e: TouchEvent) => {
      const btn = sendRef.current
      const touch = e.touches[0]
      if (!btn || !touch || e.touches.length > 1 || justSent()) return
      const r = btn.getBoundingClientRect()
      const slack = 6
      const inside = touch.clientX >= r.left - slack && touch.clientX <= r.right + slack && touch.clientY >= r.top - slack && touch.clientY <= r.bottom + slack
      if (!inside || btn.contains(e.target as Node)) return
      e.preventDefault()
      send()
    }
    document.addEventListener('touchstart', onTouch, { capture: true, passive: false })
    return () => document.removeEventListener('touchstart', onTouch, { capture: true })
    // send reads the field itself, so it's always current.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  // In a pop-up (comments), the bar stays at the pop-up's end: while you type, keep the pop-up scrolled to that end,
  // following the keyboard as it slides in, so the bar sits right above it with the comments over it (Nora, 1 Nov).
  useEffect(() => {
    if (!typing) return
    const sheet = own.current?.closest('.sheet') as HTMLElement | null
    if (!sheet) return
    let raf = 0
    let until = 0
    const step = () => {
      sheet.scrollTop = sheet.scrollHeight
      if (Date.now() < until) raf = requestAnimationFrame(step)
    }
    const follow = () => {
      until = Date.now() + 700
      cancelAnimationFrame(raf)
      step()
    }
    follow()
    window.visualViewport?.addEventListener('resize', follow)
    // A comment you just sent grows the list: stay at the end.
    const grew = new ResizeObserver(follow)
    if (sheet.firstElementChild) for (const child of Array.from(sheet.children)) grew.observe(child)
    return () => {
      cancelAnimationFrame(raf)
      grew.disconnect()
      window.visualViewport?.removeEventListener('resize', follow)
    }
  }, [typing])

  // Tapping outside the bar (the messages, the empty paper) closes the keyboard, like WhatsApp (Nora, 1 Nov).
  // Only a tap: scrolling the messages doesn't count. Tapping another field just moves there.
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!typing) return
    let start: { x: number; y: number; target: EventTarget | null } | null = null
    const down = (e: PointerEvent) => {
      start = { x: e.clientX, y: e.clientY, target: e.target }
    }
    const up = (e: PointerEvent) => {
      const s = start
      start = null
      if (!s || Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) return
      const el = s.target as Element | null
      if (!el || formRef.current?.contains(el)) return
      if (el.closest('input, textarea, select, [contenteditable="true"], .sticker-tray, .mention-picker')) return
      own.current?.blur()
    }
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointerup', up, true)
    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointerup', up, true)
    }
  }, [typing])

  function key(e: KeyboardEvent<HTMLTextAreaElement>) {
    // On a computer, Enter sends and Shift+Enter starts a new line. On a phone, Return is a new line, like WhatsApp.
    if (!touchScreen && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const field = {
    ref: setRef,
    className: 'input',
    placeholder,
    'aria-label': placeholder,
    value,
    tabIndex: closed ? -1 : undefined,
    'aria-hidden': closed || undefined,
    onFocus: () => {
      window.clearTimeout(settle.current)
      setTyping(true)
    },
    onBlur: () => {
      settle.current = window.setTimeout(() => setTyping(false), 250)
      onBlur?.()
    },
  }
  // Typing @ shows the household's people; tap one to tag them (Nora, 30 Oct). Only where people talk (comments and
  // the chat), so not in Shopping's add field.
  const { people } = useHousehold()
  const me = useMe()
  const query = mentionable ? typingMention(value) : null
  const matches = query === null ? [] : people.filter((p) => p.id !== me && p.display_name.toLocaleLowerCase().startsWith(query.toLocaleLowerCase()))
  const picker = matches.length > 0 && (
    <div className="mention-picker" role="listbox" aria-label={t('mentions.pick')}>
      {matches.map((p) => (
        <button
          key={p.id}
          type="button"
          role="option"
          aria-selected={false}
          className="mention-pick"
          // Picks on touch, before the field could lose the keyboard.
          onPointerDown={(e) => {
            e.preventDefault()
            onChange(insertMention(value, p.display_name))
          }}
        >
          <Avatar avatar={p.avatar} label={p.display_name} size={26} />
          {p.display_name}
        </button>
      ))}
    </div>
  )
  return (
    <form ref={formRef} className={`typing-bar${above || picker ? ' quoting' : ''}${typing ? ' typing' : ''} ${className}`} onSubmit={send}>
      {picker}
      {above}
      {multiline ? (
        <textarea {...field} rows={1} onChange={(e) => onChange(e.target.value)} onKeyDown={key} />
      ) : (
        <input {...field} enterKeyHint="send" onChange={(e) => onChange(e.target.value)} />
      )}
      {onSticker && (
        <StickerButton
          onSend={(name) => {
            onSticker(name)
            own.current?.blur()
          }}
        />
      )}
      {/* Sends the moment your finger touches it, before the keyboard or the bar can move (otherwise the field let
          go first, the bar settled, and the tap missed). Enter and the keyboard's Send key go through the form. */}
      <button
        ref={sendRef}
        type="button"
        // Never switched off (a switched-off button ignores the tap, and only closes the keyboard); it just looks pale.
        className={`send-btn${value.trim() ? '' : ' empty'}`}
        aria-label={t('messages.send')}
        aria-disabled={!value.trim()}
        tabIndex={closed ? -1 : undefined}
        onPointerDown={(e) => {
          e.preventDefault()
          send()
        }}
        onClick={(e) => {
          // A click without a pointer (a keyboard's Enter or Space on the button).
          if (e.detail === 0) send()
        }}
      >
        <SendIcon />
      </button>
    </form>
  )
}
