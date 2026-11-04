import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, usePantry, useRooms, useSpots, type PantryItem, type Room, type RoomKind } from '../data/hooks'
import { tracked } from '../data/actions'
import { PichiSays } from '../components/PichiSays'
import { KeepTrackFields, trackPatch } from '../components/KeepTrack'
import { groupThings, type Group } from '../components/Shelves'
import { containersFor, guessContainer } from '../components/Containers'
import { Chip } from './Todos'
import { spotOf } from './Pantry'

/*
 * Meeting Pichi (Nora and her mom, 31 Oct). Filling in every cabinet takes an evening nobody has, so Pichi only asks
 * about what you use every day: pick them (from your shelves, his ideas, or your own), say how often you buy each and
 * how many, and he keeps track from then on. It opens by itself once for each person in each household, and any time
 * from the pantry or Pichi's page. Things that are already on a shelf get switched on there, never added twice, so
 * whoever comes second (Danko) only adds what's his.
 */

type Pick = { key: string; name: string; group?: Group; kind: RoomKind; every: number; count: number }

const seenKey = (me: string, hid: string) => `pichigoose.meet.${me}.${hid}`

/** Opens the talk by itself the first time someone opens this household. */
export function useMeetPichiOnce() {
  const me = useMe()
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const pantry = usePantry(hid)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!hid || !pantry.loaded || household?.kind === 'event') return
    let seen = true
    try {
      seen = Boolean(localStorage.getItem(seenKey(me, hid)))
    } catch {
      // Storage blocked: don't keep asking.
    }
    if (seen) return
    const timer = window.setTimeout(() => setOpen(true), 900)
    return () => window.clearTimeout(timer)
  }, [hid, me, pantry.loaded, household?.kind])
  const close = () => {
    setOpen(false)
    try {
      if (hid) localStorage.setItem(seenKey(me, hid), '1')
    } catch {
      // Fine: it just may ask again.
    }
  }
  // Tap Pichi on Home, then "Teach Pichi": the same talk, on purpose.
  const show = () => setOpen(true)
  return { open, close, show }
}

/** `room`: the room it was opened from in the pantry. Then Pichi only asks about that room (Nora, 1 Nov: from the
 *  bathroom he suggested eggs and milk). */
export function MeetPichi({ open, onClose, room }: { open: boolean; onClose: () => void; room?: Room | null }) {
  const { t } = useTranslation()
  const me = useMe()
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const pantry = usePantry(hid)
  const rooms = useRooms(hid)
  const spots = useSpots(hid)
  // Small steps, one thing at a time, with a counter (Nora, 31 Oct): hello, the kitchen, the bathroom, then one step
  // for each thing you picked. -1 is the end.
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<Pick[]>([])
  const [own, setOwn] = useState('')

  // Fresh each time it opens.
  useEffect(() => {
    if (!open) return
    setStep(0)
    setPicked([])
    setOwn('')
  }, [open])

  const groups = useMemo(() => groupThings(pantry.rows), [pantry.rows])
  const kindOf = (p: PantryItem): RoomKind => {
    const spot = spots.rows.find((x) => x.id === spotOf(p, rooms.rows, spots.rows))
    return rooms.rows.find((r) => r.id === spot?.room_id)?.kind ?? (p.place === 'bathroom' ? 'bathroom' : 'kitchen')
  }
  const watching = groups.filter((g) => g.rows.some(tracked))
  const has = (name: string) => groups.some((g) => g.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())
  const ideas = (kind: 'kitchen' | 'bathroom') => (t(`meet.ideas.${kind}`, { returnObjects: true }) as string[]).filter((n) => !has(n))
  // The bathroom step has the bathroom's shelves; the kitchen step has the kitchen's and any other room's.
  // From a room: only what's on that room's shelves. Otherwise the bathroom step has the bathroom's shelves, and the
  // kitchen step the kitchen's and any other room's.
  const inRoom = (p: PantryItem) => spots.rows.find((x) => x.id === spotOf(p, rooms.rows, spots.rows))?.room_id === room?.id
  const shelvesFor = (kind: 'kitchen' | 'bathroom') =>
    groups.filter((g) => !g.rows.some(tracked) && (room ? inRoom(g.rows[0]) : (kindOf(g.rows[0]) === 'bathroom') === (kind === 'bathroom')))
  // The room steps: just this room's kind when opened from a kitchen or bathroom, else both.
  const kinds: ('kitchen' | 'bathroom')[] = room?.kind === 'bathroom' ? ['bathroom'] : room?.kind === 'kitchen' ? ['kitchen'] : ['kitchen', 'bathroom']
  const firstThing = 1 + kinds.length

  const isPicked = (key: string) => picked.some((x) => x.key === key)
  const toggle = (x: Pick) => setPicked((all) => (all.some((y) => y.key === x.key) ? all.filter((y) => y.key !== x.key) : [...all, x]))
  const fromGroup = (g: Group): Pick => ({ key: g.key, name: g.name, group: g, kind: kindOf(g.rows[0]), every: 14, count: Math.min(6, g.rows.length) })
  const fromName = (name: string, kind: RoomKind): Pick => ({ key: `new:${name.trim().toLocaleLowerCase()}`, name: name.trim(), kind, every: 14, count: 1 })

  function addOwn(kind: 'kitchen' | 'bathroom') {
    const name = own.trim()
    if (!name) return
    const g = groups.find((x) => x.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    const x = g ? fromGroup(g) : fromName(name, kind)
    if (!isPicked(x.key)) setPicked((all) => [...all, x])
    setOwn('')
  }

  /** The first storage spot in the first room of that kind (else the first spot there is). */
  function spotFor(kind: RoomKind) {
    // Opened from a room of this kind: things go on that room's shelves.
    if (room && room.kind === kind) {
      const own = spots.rows.filter((x) => x.room_id === room.id).sort((a, b) => a.position - b.position)[0]
      if (own) return own
    }
    const first = rooms.rows.find((r) => r.kind === kind) ?? rooms.rows[0]
    return spots.rows.filter((x) => x.room_id === first?.id).sort((a, b) => a.position - b.position)[0] ?? spots.rows[0] ?? null
  }

  function finish() {
    if (!hid) return
    const now = new Date().toISOString()
    for (const x of picked) {
      const patch = trackPatch(x.every, x.count)
      if (x.group) {
        for (const r of x.group.rows) db.update('pantry_items', r.id, { ...patch, updated_by: me, updated_at: now })
        continue
      }
      const spot = spotFor(x.kind)
      if (!spot) continue
      const kind = rooms.rows.find((r) => r.id === spot.room_id)?.kind ?? x.kind
      const inSpot = pantry.rows.filter((p) => spotOf(p, rooms.rows, spots.rows) === spot.id)
      const position = inSpot.length ? Math.max(...inSpot.map((p) => p.position)) + 1 : 0
      // Bought the usual amount, all full. Pichi starts from there and learns.
      for (let i = 0; i < x.count; i++) {
        db.insert('pantry_items', {
          household_id: hid,
          spot_id: spot.id,
          place: kind === 'bathroom' ? 'bathroom' : 'pantry',
          name: x.name,
          container: guessContainer(x.name, containersFor(kind)) ?? (kind === 'bathroom' ? 'pump' : 'jar'),
          level: 100,
          low_at: 20,
          list_id: null,
          position,
          ...patch,
          created_by: me,
          created_at: now,
          updated_by: me,
          updated_at: now,
        })
      }
    }
    setStep(-1)
  }

  const chips = (list: Pick[]) => (
    <div className="chips">
      {list.map((x) => (
        <Chip key={x.key} on={isPicked(x.key)} onClick={() => toggle(x)}>
          {x.name}
        </Chip>
      ))}
    </div>
  )

  // Hello, kitchen, bathroom, then one for each thing.
  const total = firstThing + picked.length
  const at = Math.min(step, total - 1)
  /** How far along: a thin line filling up, and "3 of 7". */
  const progress = (
    <div className="meet-progress" aria-label={t('meet.stepOf', { n: at + 1, total })}>
      <span className="meet-bar" aria-hidden>
        <span style={{ width: `${((at + 1) / total) * 100}%` }} />
      </span>
      <span className="cap" style={{ fontSize: 12, fontWeight: 800 }}>{t('meet.stepOf', { n: at + 1, total })}</span>
    </div>
  )
  const buttons = (next: () => void, label: string, disabled = false) => (
    <div className="row" style={{ gap: 12, marginTop: 18 }}>
      <button type="button" className="stk sec" style={{ flex: 1 }} onClick={at === 0 ? onClose : () => setStep(at - 1)}>
        {at === 0 ? t('meet.notNow') : t('common.back')}
      </button>
      <button type="button" className="stk prim" style={{ flex: 1.4 }} disabled={disabled} onClick={next}>
        {label}
      </button>
    </div>
  )

  if (step === -1) {
    return (
      <PichiSays open={open} onClose={onClose} pose="honk" title={t('meet.doneTitle')}>
        <p className="body" style={{ margin: '0 0 14px' }}>{t('meet.doneText')}</p>
        <button type="button" className="stk prim" style={{ width: '100%' }} onClick={onClose}>
          {t('common.done')}
        </button>
      </PichiSays>
    )
  }

  // 1. Hello.
  if (at === 0) {
    return (
      <PichiSays open={open} onClose={onClose} title={t('pichi.title')}>
        {progress}
        <p className="body" style={{ margin: 0 }}>{t('meet.intro')}</p>
        {watching.length > 0 && <p className="cap" style={{ margin: '12px 0 0' }}>{t('meet.watching', { list: watching.map((g) => g.name).join(', ') })}</p>}
        {buttons(() => setStep(1), t('meet.go'))}
      </PichiSays>
    )
  }

  // 2 and 3. The kitchen, then the bathroom: what's on your shelves, Pichi's ideas, and your own.
  if (at >= 1 && at < firstThing) {
    const kind = kinds[at - 1]
    const shelves = shelvesFor(kind)
    const mine = picked.filter((x) => x.key.startsWith('new:') && x.kind === kind && !ideas(kind).some((n) => n.toLocaleLowerCase() === x.name.toLocaleLowerCase()))
    return (
      <PichiSays open={open} onClose={onClose} title={t(kind === 'bathroom' && kinds.length === 1 ? 'meet.bathroomOnlyTitle' : `meet.${kind}Title`)}>
        {progress}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {shelves.length > 0 && (
            <div>
              <span className="label">{t('meet.fromShelves')}</span>
              {chips(shelves.map(fromGroup))}
            </div>
          )}
          <div>
            <span className="label">{t('meet.ideasLabel')}</span>
            {chips(ideas(kind).map((n) => fromName(n, kind)))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              addOwn(kind)
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <span className="label" style={{ margin: 0 }}>{t('meet.ownLabel')}</span>
            <div className="row" style={{ gap: 8 }}>
              <input className="input" style={{ flex: 1, minWidth: 0 }} placeholder={t(`meet.ownPlaceholder.${kind}`)} aria-label={t('meet.ownLabel')} value={own} onChange={(e) => setOwn(e.target.value)} enterKeyHint="done" />
              <button type="submit" className="stk sec sm" disabled={!own.trim()}>
                {t('meet.ownAdd')}
              </button>
            </div>
            {mine.length > 0 && chips(mine)}
          </form>
        </div>
        {buttons(() => {
          setOwn('')
          if (at === firstThing - 1 && !picked.length) onClose()
          else setStep(at + 1)
        }, at === firstThing - 1 && !picked.length ? t('meet.nothing') : t('meet.next'))}
      </PichiSays>
    )
  }

  // 4 and on. One thing at a time: how often you buy it, and how many.
  const x = picked[at - firstThing]
  const last = at === total - 1
  return (
    <PichiSays open={open} onClose={onClose} title={x.name}>
      {progress}
      {/* Nora's line, on the first one. */}
      {at === firstThing && <p className="body" style={{ margin: '0 0 14px' }}>{t('meet.oftenText')}</p>}
      <KeepTrackFields every={x.every} count={x.count} onChange={(every, count) => setPicked((all) => all.map((y) => (y.key === x.key ? { ...y, every, count } : y)))} />
      {buttons(last ? finish : () => setStep(at + 1), last ? t('meet.start') : t('meet.next'))}
    </PichiSays>
  )
}
