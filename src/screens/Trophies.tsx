import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHousehold, useItemsIn, useLists, useTodos, type Item, type Todo } from '../data/hooks'
import { Screen } from '../components/Shell'
import { Hand, Sheet, showToast } from '../components/Scrapbook'
import { useMe } from '../auth'
import { sharePicture, trophyPicture } from '../lib/shareTrophy'
import { Avatar } from '../components/Avatar'
import { BackIcon, ShareIcon } from '../components/Icons'
import { Trophy } from '../components/Trophy'
import { useBackInApp } from '../lib/back'
import { THEMES } from '../lib/theme'
import { entries, groceryItems, monthOf, monthsWithActivity, streakOf, trophies, type Chore, type Month, type Win } from '../lib/chores'

const NOTES = ['n-butter', 'n-mint', 'n-blush', 'n-mist', 'n-sage', 'n-peach', 'n-lilac', 'n-sand']

/** Everything trophies need: the household's to-dos and every list's items. */
export function useTrophyData() {
  const { household, people } = useHousehold()
  const hid = household?.id ?? null
  const todos = useTodos(hid)
  const lists = useLists(hid)
  const items = useItemsIn(lists.rows.map((l) => l.id))
  return { people, todos: todos.rows as Todo[], items: groceryItems(lists.rows, items.rows as Item[]) }
}

export function monthName(month: Month, lang: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString(lang === 'sr' ? 'sr-Latn' : 'en-US', { month: 'long', year: 'numeric' })
}

function shift(month: Month, by: number): Month {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** The monthly recap: one trophy per chore, to whoever did the most this month. Older months one tap back. */
export function TrophiesScreen() {
  const { t, i18n } = useTranslation()
  const back = useBackInApp()
  const { people, todos, items } = useTrophyData()
  const thisMonth = monthOf(new Date().toISOString())
  const [month, setMonth] = useState<Month>(thisMonth)
  const oldest = useMemo(() => monthsWithActivity(todos, items).at(-1) ?? thisMonth, [todos, items, thisMonth])
  const wins = useMemo(() => trophies(todos, items, month), [todos, items, month])
  const person = (id: string) => people.find((p) => p.id === id)
  const [open, setOpen] = useState<Chore | null>(null)

  function card(w: Win, i: number) {
    const who = person(w.winner)
    const big = streakOf(todos, items, w.chore, w.winner, w.month) >= 3
    const others = Object.entries(w.counts)
      .filter(([id]) => id !== w.winner)
      .sort((a, b) => b[1] - a[1])
    return (
      <button type="button" key={w.chore} onClick={() => setOpen(w.chore)} className={`note ${NOTES[i % NOTES.length]}`} style={{ display: 'flex', gap: 14, alignItems: 'center', textAlign: 'left', width: '100%', transform: `rotate(${[-0.8, 0.7, -0.5, 0.9][i % 4]}deg)` }}>
        <Trophy chore={w.chore} big={big} size={92} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Hand size={26} lineHeight={28}>
            {big ? t(`trophies.big.${w.chore}`) : t(`trophies.names.${w.chore}`)}
          </Hand>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            {who && <Avatar avatar={who.avatar} label={who.display_name} size={28} />}
            <span style={{ fontWeight: 800, fontSize: 15 }}>
              {who?.display_name ?? t('common.someone')} · {t(w.chore === 'groceries' ? 'trophies.runs' : 'trophies.times', { count: w.count })}
            </span>
          </div>
          {others.length > 0 && (
            <div className="cap" style={{ marginTop: 4 }}>
              {others.map(([id, n]) => `${person(id)?.display_name ?? t('common.someone')} ${n}`).join(' · ')}
            </div>
          )}
          {big && <div className="cap" style={{ marginTop: 4, fontWeight: 700 }}>{t('trophies.inARow', { count: streakOf(todos, items, w.chore, w.winner, w.month) })}</div>}
        </div>
      </button>
    )
  }

  return (
    <Screen>
      <div style={{ padding: 'calc(var(--top) + 8px) 22px 32px 40px', maxWidth: 720 }}>
        <div className="row" style={{ gap: 6, marginLeft: -10 }}>
          <button type="button" aria-label={t('common.back')} onClick={back} style={{ display: 'flex', color: '#1E1A30' }}>
            <BackIcon />
          </button>
          <Hand as="h1" style={{ margin: 0 }}>
            {t('trophies.title')}
          </Hand>
        </div>

        {/* Which month: the recap of this month, and the ones before it. */}
        <div className="row" style={{ justifyContent: 'space-between', margin: '16px 0 20px' }}>
          <button type="button" className="stk sec sm" disabled={month <= oldest} aria-label={t('trophies.earlier')} style={{ width: 38, padding: 0, transform: 'rotate(-3deg)' }} onClick={() => setMonth(shift(month, -1))}>
            ‹
          </button>
          <Hand size={30} lineHeight={32}>
            {monthName(month, i18n.language)}
          </Hand>
          <button type="button" className="stk sec sm" disabled={month >= thisMonth} aria-label={t('trophies.later')} style={{ width: 38, padding: 0, transform: 'rotate(3deg)' }} onClick={() => setMonth(shift(month, 1))}>
            ›
          </button>
        </div>

        {wins.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>{wins.map(card)}</div>
        ) : (
          <p className="body" style={{ textAlign: 'center', color: '#63586B' }}>{t('trophies.empty')}</p>
        )}
        <p className="cap" style={{ marginTop: 26, textAlign: 'center' }}>
          {t('trophies.how')}
        </p>
      </div>
      <TrophySheet chore={open} months={open ? [month] : []} onClose={() => setOpen(null)} />
    </Screen>
  )
}

/** A person's trophy case on their profile: every trophy they've won, newest first, the same chore stacked. */
export function TrophyCase({ personId }: { personId: string }) {
  const { t, i18n } = useTranslation()
  const { todos, items } = useTrophyData()
  const won = useMemo(() => {
    const out: { chore: Chore; months: Month[]; best: number }[] = []
    for (const month of monthsWithActivity(todos, items)) {
      for (const w of trophies(todos, items, month)) {
        if (w.winner !== personId) continue
        const row = out.find((r) => r.chore === w.chore)
        if (row) row.months.push(month)
        else out.push({ chore: w.chore, months: [month], best: 0 })
      }
    }
    for (const r of out) r.best = Math.max(...r.months.map((m) => streakOf(todos, items, r.chore, personId, m)))
    return out
  }, [todos, items, personId])
  const [open, setOpen] = useState<Chore | null>(null)

  return (
    <section style={{ alignSelf: 'stretch', marginTop: 34 }}>
      <Hand as="h2" size={34} lineHeight={36} style={{ margin: 0 }}>
        {t('trophies.case')}
      </Hand>
      {won.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '18px 12px', marginTop: 12 }}>
          {won.map((r) => (
            <button type="button" key={r.chore} onClick={() => setOpen(r.chore)} style={{ textAlign: 'center', display: 'block' }} title={r.months.map((m) => monthName(m, i18n.language)).join(', ')}>
              <Trophy chore={r.chore} big={r.best >= 3} size={84} />
              <div style={{ fontSize: 13, fontWeight: 800, lineHeight: '16px', marginTop: 2 }}>{r.best >= 3 ? t(`trophies.big.${r.chore}`) : t(`trophies.names.${r.chore}`)}</div>
              <div className="cap" style={{ fontSize: 12 }}>
                {r.months.length > 1 ? t('trophies.wonTimes', { count: r.months.length }) : monthName(r.months[0], i18n.language)}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="cap" style={{ fontSize: 14, padding: '6px 0' }}>{t('trophies.caseEmpty')}</div>
      )}
      <TrophySheet chore={open} months={won.find((r) => r.chore === open)?.months ?? []} onClose={() => setOpen(null)} />
    </section>
  )
}

/**
 * A trophy up close (Nora, 2 Nov): the drawing big, who won it, and everything that counted, day by day, like
 * "1 October · Nora · Oprati sudove". For a trophy won in several months, each month gets its own part, newest first.
 */
function TrophySheet({ chore, months, onClose }: { chore: Chore | null; months: Month[]; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { people, todos, items } = useTrophyData()
  const person = (id: string) => people.find((p) => p.id === id)
  const lang = i18n.language === 'sr' ? 'sr-Latn' : 'en-US'
  const day = (iso: string) => new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long' })
  const parts = chore
    ? [...months].sort().reverse().map((m) => ({ month: m, win: trophies(todos, items, m).find((w) => w.chore === chore), list: entries(todos, items, chore, m) }))
    : []
  const latest = parts[0]?.win
  const big = chore && latest ? streakOf(todos, items, chore, latest.winner, latest.month) >= 3 : false
  // Your own trophy can be shared, with its picture (Nora, 2 Nov). The picture is made as soon as the pop-up opens,
  // so tapping Share opens the share sheet right away (phones only allow it straight from the tap).
  const me = useMe()
  const mine = Boolean(chore && latest && latest.winner === me)
  const trophyName = chore ? (big ? t(`trophies.big.${chore}`) : t(`trophies.names.${chore}`)) : ''
  const headline = t('trophies.shareHeadline', { trophy: trophyName })
  const line = chore && latest ? t(`trophies.shareLine.${chore}`, { count: latest.count, month: monthName(latest.month, i18n.language) }) : ''
  const [picture, setPicture] = useState<File | null>(null)
  // "Show details" opens the day-by-day list under the tug of war (Nora, 2 Nov). Closed again each time it opens.
  const [detailsOpen, setDetailsOpen] = useState<Month[]>([])
  useEffect(() => setDetailsOpen([]), [chore])
  useEffect(() => {
    setPicture(null)
    if (!mine || !chore) return
    let live = true
    trophyPicture(chore, headline, line).then((f) => live && setPicture(f)).catch(() => {})
    return () => {
      live = false
    }
  }, [mine, chore, headline, line])
  async function share() {
    if (!picture) return
    const done = await sharePicture(picture, `${headline} ${line} · pichigoose.com`)
    if (done === 'saved') showToast(t('trophies.shareSaved'))
  }
  return (
    <Sheet open={Boolean(chore)} onClose={onClose} title={chore ? (big ? t(`trophies.big.${chore}`) : t(`trophies.names.${chore}`)) : ''}>
      {chore && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Trophy chore={chore} size={170} />
          </div>
          {mine && (
            <button type="button" className="stk prim" style={{ alignSelf: 'center', transform: 'rotate(-1.5deg)' }} disabled={!picture} onClick={share}>
              <ShareIcon />
              {t('trophies.share')}
            </button>
          )}
          {parts.map(({ month, win, list }) => {
            return (
              <section key={month}>
                <Hand size={26} lineHeight={28}>
                  {monthName(month, i18n.language)}
                </Hand>
                {win && <TugOfWar counts={win.counts} chore={chore} />}
                <button type="button" className="cap" aria-expanded={detailsOpen.includes(month)} style={{ fontWeight: 800, color: 'var(--hero-dark)', padding: '6px 0', marginTop: 4 }} onClick={() => setDetailsOpen((d) => (d.includes(month) ? d.filter((x) => x !== month) : [...d, month]))}>
                  {detailsOpen.includes(month) ? t('trophies.hideDetails') : t('trophies.showDetails')}
                </button>
                {detailsOpen.includes(month) && (
                <>
                <span className="label" style={{ marginTop: 6 }}>{t('trophies.counted')}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {list.map((e, i) => {
                    const p = person(e.who)
                    return (
                      <div key={i} className="ln" style={{ alignItems: 'flex-start', gap: 10, padding: '8px 0' }}>
                        <span className="cap" style={{ flex: '0 0 84px', fontWeight: 800, fontSize: 13, paddingTop: 3 }}>{day(e.at)}</span>
                        <Avatar avatar={p?.avatar} label={p?.display_name} size={24} />
                        <span style={{ flex: 1, minWidth: 0, fontSize: 15, lineHeight: '20px' }}>
                          <b style={{ fontWeight: 800 }}>{p?.display_name ?? t('common.someone')}</b>{' '}
                          {e.items ? t('trophies.bought', { items: e.items.join(', ') }) : e.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
                </>
                )}
              </section>
            )
          })}
        </div>
      )}
    </Sheet>
  )
}

/** Mixes a color toward white, `share` from 0 (as is) to 1 (white). */
function lighter(hex: string, share: number) {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * share)
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}

/**
 * Tug of war (Nora, 2 Nov): one bar split by who did how much, each person in the color they picked for the app. You
 * on the left, then everyone else, most first. Two people with the same color: the second gets 30% white over it (a
 * third, 60%). It starts even and pulls to the real split when it opens. Underneath, a legend: picture, color, name.
 */
function TugOfWar({ counts, chore }: { counts: Record<string, number>; chore: Chore }) {
  const { t } = useTranslation()
  const me = useMe()
  const { people } = useHousehold()
  const total = Object.values(counts).reduce((n, x) => n + x, 0) || 1
  const order = Object.entries(counts).sort((a, b) => (a[0] === me ? -1 : b[0] === me ? 1 : b[1] - a[1]))
  const used: Record<string, number> = {}
  const sides = order.map(([id, n]) => {
    const p = people.find((x) => x.id === id)
    const hex = THEMES.find((x) => x.id === p?.theme)?.hex ?? THEMES[0].hex
    const seen = used[hex] ?? 0
    used[hex] = seen + 1
    return { id, n, p, color: seen ? lighter(hex, Math.min(0.9, 0.3 * seen)) : hex, share: n / total }
  })
  const [pulled, setPulled] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setPulled(true)))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <div style={{ margin: '8px 0 4px' }}>
      <div className="tug" role="img" aria-label={sides.map((x) => `${x.p?.display_name ?? ''} ${Math.round(x.share * 100)}%`).join(', ')}>
        {sides.map((x) => (
          <span key={x.id} style={{ width: `${(pulled ? x.share : 1 / sides.length) * 100}%`, background: x.color }} />
        ))}
      </div>
      <div className="tug-legend">
        {sides.map((x) => (
          <span key={x.id} className="tug-who">
            <Avatar avatar={x.p?.avatar} label={x.p?.display_name} size={26} />
            <i style={{ background: x.color }} aria-hidden />
            <b>{x.p?.display_name ?? t('common.someone')}</b>
            <span className="cap">
              {Math.round(x.share * 100)}% · {t(chore === 'groceries' ? 'trophies.runs' : 'trophies.times', { count: x.n })}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
