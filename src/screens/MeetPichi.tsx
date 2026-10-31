import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMe } from '../auth'
import { db } from '../data/store'
import { useHousehold, usePantry, useRooms, useSpots, type PantryItem, type RoomKind } from '../data/hooks'
import { tracked } from '../data/actions'
import { PichiSays } from '../components/PichiSays'
import { KeepTrackFields, trackPatch } from '../components/KeepTrack'
import { groupThings, type Group } from '../components/Shelves'
import { containersFor, guessContainer } from '../components/Containers'
import { Hand } from '../components/Scrapbook'
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
  return { open, close }
}

export function MeetPichi({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const me = useMe()
  const { household } = useHousehold()
  const hid = household?.id ?? null
  const pantry = usePantry(hid)
  const rooms = useRooms(hid)
  const spots = useSpots(hid)
  const [step, setStep] = useState<'pick' | 'often' | 'done'>('pick')
  const [picked, setPicked] = useState<Pick[]>([])
  const [own, setOwn] = useState('')
  const [ownKind, setOwnKind] = useState<RoomKind>('kitchen')

  // Fresh each time it opens.
  useEffect(() => {
    if (!open) return
    setStep('pick')
    setPicked([])
    setOwn('')
  }, [open])

  const groups = useMemo(() => groupThings(pantry.rows), [pantry.rows])
  const kindOf = (p: PantryItem): RoomKind => {
    const spot = spots.rows.find((x) => x.id === spotOf(p, rooms.rows, spots.rows))
    return rooms.rows.find((r) => r.id === spot?.room_id)?.kind ?? (p.place === 'bathroom' ? 'bathroom' : 'kitchen')
  }
  const watching = groups.filter((g) => g.rows.some(tracked))
  const onShelves = groups.filter((g) => !g.rows.some(tracked))
  const has = (name: string) => groups.some((g) => g.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())
  const ideas = (kind: 'kitchen' | 'bathroom') => (t(`meet.ideas.${kind}`, { returnObjects: true }) as string[]).filter((n) => !has(n))

  const isPicked = (key: string) => picked.some((x) => x.key === key)
  const toggle = (x: Pick) => setPicked((all) => (all.some((y) => y.key === x.key) ? all.filter((y) => y.key !== x.key) : [...all, x]))
  const fromGroup = (g: Group): Pick => ({ key: g.key, name: g.name, group: g, kind: kindOf(g.rows[0]), every: 14, count: Math.min(6, g.rows.length) })
  const fromName = (name: string, kind: RoomKind): Pick => ({ key: `new:${name.trim().toLocaleLowerCase()}`, name: name.trim(), kind, every: 14, count: 1 })

  function addOwn() {
    const name = own.trim()
    if (!name) return
    const g = groups.find((x) => x.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    const x = g ? fromGroup(g) : fromName(name, ownKind)
    if (!isPicked(x.key)) setPicked((all) => [...all, x])
    setOwn('')
  }

  /** The first storage spot in the first room of that kind (else the first spot there is). */
  function spotFor(kind: RoomKind) {
    const room = rooms.rows.find((r) => r.kind === kind) ?? rooms.rows[0]
    return spots.rows.filter((x) => x.room_id === room?.id).sort((a, b) => a.position - b.position)[0] ?? spots.rows[0] ?? null
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
    setStep('done')
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

  if (step === 'done') {
    return (
      <PichiSays open={open} onClose={onClose} pose="honk" title={t('meet.doneTitle')}>
        <p className="body" style={{ margin: '0 0 14px' }}>{t('meet.doneText')}</p>
        <button type="button" className="stk prim" style={{ width: '100%' }} onClick={onClose}>
          {t('common.done')}
        </button>
      </PichiSays>
    )
  }

  if (step === 'often') {
    return (
      <PichiSays open={open} onClose={onClose} title={t('meet.oftenTitle')}>
        <p className="body" style={{ margin: '0 0 16px' }}>{t('meet.oftenText')}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {picked.map((x) => (
            <div key={x.key}>
              <Hand size={26} lineHeight={28} style={{ display: 'block', marginBottom: 6 }}>
                {x.name}
              </Hand>
              <KeepTrackFields every={x.every} count={x.count} onChange={(every, count) => setPicked((all) => all.map((y) => (y.key === x.key ? { ...y, every, count } : y)))} />
            </div>
          ))}
        </div>
        <div className="row" style={{ gap: 12, marginTop: 20 }}>
          <button type="button" className="stk sec" style={{ flex: 1 }} onClick={() => setStep('pick')}>
            {t('common.back')}
          </button>
          <button type="button" className="stk prim" style={{ flex: 1.4 }} onClick={finish}>
            {t('meet.start')}
          </button>
        </div>
      </PichiSays>
    )
  }

  return (
    <PichiSays open={open} onClose={onClose} title={t('pichi.title')}>
      <p className="body" style={{ margin: '0 0 14px' }}>{t('meet.intro')}</p>
      {watching.length > 0 && (
        <p className="cap" style={{ margin: '0 0 14px' }}>{t('meet.watching', { list: watching.map((g) => g.name).join(', ') })}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {onShelves.length > 0 && (
          <div>
            <span className="label">{t('meet.fromShelves')}</span>
            {chips(onShelves.map(fromGroup))}
          </div>
        )}
        <div>
          <span className="label">{t('meet.ideasLabel')}</span>
          {chips([...ideas('kitchen').map((n) => fromName(n, 'kitchen')), ...ideas('bathroom').map((n) => fromName(n, 'bathroom'))])}
        </div>
        {/* Your own, like micellar water: it goes in the kitchen or the bathroom. */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addOwn()
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <span className="label" style={{ margin: 0 }}>{t('meet.ownLabel')}</span>
          <div className="row" style={{ gap: 8 }}>
            <input className="input" style={{ flex: 1, minWidth: 0 }} placeholder={t('meet.ownPlaceholder')} aria-label={t('meet.ownLabel')} value={own} onChange={(e) => setOwn(e.target.value)} enterKeyHint="done" />
            <button type="submit" className="stk sec sm" disabled={!own.trim()}>
              {t('meet.ownAdd')}
            </button>
          </div>
          {own.trim() && !has(own) && (
            <div className="chips">
              {(['kitchen', 'bathroom'] as const).map((k) => (
                <Chip key={k} on={ownKind === k} onClick={() => setOwnKind(k)}>
                  {t(`pantry.rooms.kinds.${k}`)}
                </Chip>
              ))}
            </div>
          )}
          {/* What you typed yourself, so you can see it's in. */}
          {picked.some((x) => x.key.startsWith('new:') && !ideas(x.kind === 'bathroom' ? 'bathroom' : 'kitchen').some((n) => n.toLocaleLowerCase() === x.name.toLocaleLowerCase())) &&
            chips(picked.filter((x) => x.key.startsWith('new:') && !ideas(x.kind === 'bathroom' ? 'bathroom' : 'kitchen').some((n) => n.toLocaleLowerCase() === x.name.toLocaleLowerCase())))}
        </form>
      </div>
      <div className="row" style={{ gap: 12, marginTop: 20 }}>
        <button type="button" className="stk sec" style={{ flex: 1 }} onClick={onClose}>
          {t('meet.notNow')}
        </button>
        <button type="button" className="stk prim" style={{ flex: 1.4 }} disabled={!picked.length} onClick={() => setStep('often')}>
          {t('meet.next')}
        </button>
      </div>
    </PichiSays>
  )
}
