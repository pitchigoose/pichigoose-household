import logo from '../../assets/logo-pichigoose.png'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth'
import {
  useProjects,
  useHousehold,
  useItemsIn,
  useLists,
  useComments,
  useMyProfile,
  useNotes,
  usePantry,
  useRooms,
  useSpots,
  type Room,
  type Spot,
  useTodos,
} from '../data/hooks'
import { byTodoOrder } from '../data/actions'
import { Screen } from '../components/Shell'
import { Avatar } from '../components/Avatar'
import { POSES, type Pose, type TapeKind } from '../components/Scrapbook'
import { BasketIcon, InkChevron, MessagesIcon, PencilIcon, TodoIcon } from '../components/Icons'
import { MyHouseholds } from './MyHouseholds'
import { PendingInvites } from './Invite'
import { AddSheet } from './AddSheet'
import { MentionBanner } from '../components/MentionBanner'
import { AskName, madeFromEmail } from './AskName'
import { MeetPichi, useMeetPichiOnce } from './MeetPichi'
import { PichiChat } from '../components/PichiChat'
import { daysFromToday, fromDateString } from '../lib/time'
import { useDesktop } from '../lib/desktop'
import { ShelfRows, groupLow, groupThings, useShelfWidth, type Group } from '../components/Shelves'
import { spotOf } from './Pantry'
import { useSwipeBetween } from '../components/Slide'


// Each section is a sticky note in its own pastel, held by its own tape.
type Look = { note: string; tape: TapeKind; tapeStyle: React.CSSProperties; rotate: number }
const LOOK: Record<string, Look> = {
  news: { note: 'n-lilac', tape: 'ttri', tapeStyle: {}, rotate: 0 },
  todos: { note: 'n-blush', tape: 'tdots', tapeStyle: { top: -10, left: 28, transform: 'rotate(-4deg)' }, rotate: -1 },
  projects: { note: 'n-peach', tape: 'tp', tapeStyle: { top: -10, right: 40, transform: 'rotate(4deg)' }, rotate: 0.6 },
  shopping: { note: 'n-butter', tape: 'tm', tapeStyle: { top: -10, right: 34, transform: 'rotate(5deg)' }, rotate: 1 },
  pantry: { note: 'n-sand', tape: 'ty', tapeStyle: { top: -10, left: 36, transform: 'rotate(-3deg)' }, rotate: -0.8 },
  bathroom: { note: 'n-mint', tape: 'tb', tapeStyle: { top: -10, right: 40, transform: 'rotate(4deg)' }, rotate: 0.7 },
  money: { note: 'n-mist', tape: 'tblocks', tapeStyle: { top: -10, left: '40%', transform: 'rotate(-2deg)' }, rotate: -0.6 },
  notes: { note: 'n-sage', tape: 'tcheck', tapeStyle: { top: -10, left: '30%', transform: 'rotate(3deg)' }, rotate: 0.6 },
}

// Rooms beyond the kitchen and bathroom get their own pastels in turn.
const ROOM_LOOKS: Look[] = [
  { note: 'n-peach', tape: 'tp', tapeStyle: { top: -10, left: 30, transform: 'rotate(-3deg)' }, rotate: 0.8 },
  { note: 'n-lilac', tape: 'tcheck', tapeStyle: { top: -10, right: 36, transform: 'rotate(4deg)' }, rotate: -0.7 },
  { note: 'n-mist', tape: 'tdots', tapeStyle: { top: -10, left: '35%', transform: 'rotate(-2deg)' }, rotate: 0.6 },
  { note: 'n-sage', tape: 'tblocks', tapeStyle: { top: -10, left: 40, transform: 'rotate(3deg)' }, rotate: -0.5 },
]
export function roomLook(room: Room | undefined, rooms: Room[]): Look {
  if (room?.kind === 'kitchen' && rooms.find((r) => r.kind === 'kitchen') === room) return LOOK.pantry
  if (room?.kind === 'bathroom' && rooms.find((r) => r.kind === 'bathroom') === room) return LOOK.bathroom
  const others = rooms.filter((r) => r !== rooms.find((x) => x.kind === 'kitchen') && r !== rooms.find((x) => x.kind === 'bathroom'))
  return ROOM_LOOKS[Math.max(0, others.indexOf(room as Room)) % ROOM_LOOKS.length]
}

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const profile = useMyProfile()
  const { household, people, name, myName } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  const projects = useProjects(hid)
  // "to buy" shows what's left on every list in the household, not just the first one.
  const items = useItemsIn(lists.rows.map((l) => l.id))
  const todos = useTodos(hid)
  const notes = useNotes(hid)
  const pantry = usePantry(hid)
  const desktop = useDesktop()
  // Only on Home: swipe from right to left to open Messages, like Instagram's direct messages.
  const toMessages = useNavigate()
  useSwipeBetween(null, desktop ? null : () => toMessages('/messages'))
  const [switching, setSwitching] = useState(false)
  const [adding, setAdding] = useState(false)
  const [chatting, setChatting] = useState(false)
  const [hops, setHops] = useState(0)
  const talk = () => {
    setHops((n) => n + 1)
    window.setTimeout(() => setChatting(true), 260)
  }
  // Still called by the name made from the email? Ask once, the same way joining does now.
  const email = useAuth().session?.user.email ?? ''
  const [askedName, setAskedName] = useState(false)
  const needsName = Boolean(profile && email && madeFromEmail(profile.display_name, email))
  // Meeting Pichi (Nora, 31 Oct): once for each person in each household, after the name is sorted.
  const meet = useMeetPichiOnce()

  const person = (id: string | null) => people.find((p) => p.id === id)
  const comments = useComments(hid)

  const openTodos = useMemo(
    () =>
      todos.rows
        // A project's steps stay with their project, off this note (Nora, 31 Oct): "Boxes under the table" means
        // nothing without "Organize my room" above it. The note says how many there are instead.
        .filter((x) => !x.done_at && !x.project_id)
        .sort(byTodoOrder),
    [todos.rows],
  )
  // In the lists' own order (Groceries first, then the rest as arranged), newest first within a list.
  const listPos = (id: string) => lists.rows.find((l) => l.id === id)?.position ?? 99
  // A finished project's list is off the shopping list.
  const finishedList = (id: string) => {
    const pid = lists.rows.find((l) => l.id === id)?.project_id
    return Boolean(pid && projects.rows.find((p) => p.id === pid)?.done_at)
  }
  const toBuy = useMemo(
    () => items.rows.filter((x) => !x.checked_at && !finishedList(x.list_id)).sort((a, b) => listPos(a.list_id) - listPos(b.list_id) || b.created_at.localeCompare(a.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.rows, lists.rows, projects.rows],
  )
  // The pantry note shows what's running out first, from the pantry and the bathroom cabinet.
  // Grouped like on the shelves (three bottles of wine are one), what's running out first.
  const shelf = useMemo(() => {
    const room = (g: ReturnType<typeof groupThings>[number]) => (groupLow(g.rows) ? -1 : g.rows.length > 1 ? 2 : (g.rows[0].level - g.rows[0].low_at) / 100)
    return groupThings(pantry.rows).sort((a, b) => room(a) - room(b) || a.name.localeCompare(b.name))
  }, [pantry.rows])
  // Every room has its own note.
  const rooms = useRooms(hid)
  const spots = useSpots(hid)
  const pinnedNotes = useMemo(
    () => [...notes.rows].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at)),
    [notes.rows],
  )

  // Pichi's news. Real notifications arrive in phase 4. Until then she tells you what's new on the list.
  const news = useMemo(() => {
    const fresh = (iso: string) => Date.now() - new Date(iso).getTime() < 2 * 86400000
    const recent = toBuy.find((x) => x.added_by && x.added_by !== me && !x.added_by_pichi && fresh(x.created_at))
    // Someone commented on something: "Danko commented on šipka za kuhinju."
    const comment = [...comments.rows].reverse().find((c) => c.author_id && c.author_id !== me && fresh(c.created_at))
    if (comment && (!recent || comment.created_at > recent.created_at)) {
      const thing =
        items.rows.find((x) => x.id === comment.item_id)?.name ??
        todos.rows.find((x) => x.id === comment.todo_id)?.title ??
        notes.rows.find((x) => x.id === comment.note_id)?.title
      if (thing) return t('home.newsCommented', { name: person(comment.author_id)?.display_name ?? t('common.someone'), item: thing })
    }
    // Pichi put something on the list herself: she tells you about it.
    const pichi = toBuy.find((x) => x.added_by_pichi && fresh(x.created_at))
    if (pichi && (!recent || pichi.created_at > recent.created_at)) return t('home.newsPichi', { item: pichi.name })
    if (recent) return t('home.newsAdded', { name: person(recent.added_by)?.display_name ?? t('common.someone'), item: recent.name })
    const mineToday = todos.rows.filter((x) => !x.done_at && x.assignee_id === me && x.due_date && daysFromToday(fromDateString(x.due_date)) <= 0).length
    if (mineToday) return t('home.newsTodos', { count: mineToday })
    return t('home.newsCalm')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toBuy, openTodos, me, people, i18n.language, comments.rows])

  // The redesign (Nora, 4 Nov): bold and simple, like the apps she loves. Pichi stands big in a deep scene in the
  // theme's color and says the one thing that matters most right now; under him, quick actions, then today's cards
  // that swipe sideways. Everything else is one tap away.
  const lowGroup = shelf.find((g) => groupLow(g.rows))
  const mineToday = todos.rows.filter((x) => !x.done_at && x.assignee_id === me && x.due_date && daysFromToday(fromDateString(x.due_date)) <= 0).length
  const message: { headline: string; link: string; to?: string; pose: Pose } = mineToday
    ? { headline: t('v2.todosToday', { count: mineToday }), link: t('v2.seeTodos'), to: '/todos', pose: 'walk' }
    : lowGroup
      ? { headline: t('v2.runningLow', { item: lowGroup.name }), link: t('v2.seeList'), to: '/shopping', pose: 'honk' }
      : toBuy.length
        ? { headline: t('v2.toBuy', { count: toBuy.length }), link: t('v2.seeList'), to: '/shopping', pose: 'stand-right' }
        : { headline: t('v2.calm'), link: t('v2.addSomething'), pose: 'stand-right' }
  // What Pichi says when you tap him: hello, the one thing that matters most, what's new, and what's running low.
  const lows = shelf.filter((g) => groupLow(g.rows)).map((g) => g.name)
  const pichiLines = [
    t('pichiChat.hi', { name: myName }),
    message.headline,
    news !== message.headline ? news : '',
    lows.length ? t('pichiChat.low', { items: lows.slice(0, 3).join(', ') }) : '',
  ].filter(Boolean)
  const pichiChips = [
    { label: t('tabs.todos'), to: '/todos' },
    { label: t('tabs.shopping'), to: '/shopping' },
    { label: t('meet.teach'), onClick: meet.show },
    { label: t('pichi.whoTitle'), to: '/pichi' },
  ]
  const activeProjects = projects.rows.filter((p) => !p.done_at).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const quick = [
    { key: 'buy', label: t('v2.qBuy'), icon: <BasketIcon size={28} />, to: '/shopping?add=1' },
    { key: 'todo', label: t('v2.qTodo'), icon: <TodoIcon size={28} />, to: '/todos' },
    { key: 'note', label: t('v2.qNote'), icon: <PencilIcon size={26} />, to: '/notes/new' },
    { key: 'chat', label: t('v2.qChat'), icon: <MessagesIcon size={28} />, to: '/messages' },
  ]
  const cards = [
    {
      key: 'buy',
      to: '/shopping',
      tone: 'butter',
      title: t('v2.cardBuy'),
      big: String(toBuy.length),
      lines: toBuy.slice(0, 3).map((x) => x.name),
      empty: t('home.noItems'),
    },
    {
      key: 'todos',
      to: '/todos',
      tone: 'blush',
      title: t('v2.cardTodos'),
      big: String(openTodos.length),
      lines: openTodos.slice(0, 3).map((x) => x.title),
      empty: t('home.noTodos'),
    },
    {
      key: 'projects',
      to: '/projects',
      tone: 'mint',
      title: t('v2.cardProjects'),
      big: String(activeProjects.length),
      lines: activeProjects.slice(0, 3).map((p) => p.name),
      empty: t('home.noProjects'),
    },
    {
      key: 'pantry',
      to: '/pantry',
      tone: 'lilac',
      title: t('v2.cardPantry'),
      big: String(shelf.filter((g) => groupLow(g.rows)).length),
      lines: shelf.filter((g) => groupLow(g.rows)).slice(0, 3).map((g) => g.name),
      empty: t('v2.pantryFine'),
    },
    {
      key: 'notes',
      to: '/notes',
      tone: 'peach',
      title: t('v2.cardNotes'),
      big: String(notes.rows.length),
      lines: pinnedNotes.slice(0, 3).map((n) => n.title || t('notes.untitled')),
      empty: t('home.noNotes'),
    },
  ]

  return (
    <Screen tabbar wide className="home-v2">
      <DeepTopBar />
      {/* The scene: deep color, soft clouds drifting, Pichi breathing, his bubble, and his one message. */}
      <section className="v2-hero">
        <div className="v2-top" style={{ paddingTop: 'calc(var(--top) + 12px)' }}>
          <button type="button" className="v2-house" onClick={() => setSwitching(true)} aria-label={t('home.switch')}>
            <span className="v2-house-name">{name(household)}</span>
            <InkChevron />
          </button>
          <img className="v2-logo" src={logo} alt="Pichigoose" draggable={false} />
          <Link to={`/people/${me}`} aria-label={t('home.profile')} className="v2-me">
            <Avatar avatar={profile?.avatar} size={44} className="" />
          </Link>
        </div>
        <div className="v2-scene">
          <i className="v2-cloud c1" aria-hidden />
          <i className="v2-cloud c2" aria-hidden />
          <i className="v2-cloud c3" aria-hidden />
          <i className="v2-hill" aria-hidden />
          {/* Tap him (or his bubble): he hops, and tells you what's going on. */}
          <button type="button" className="v2-pichi" aria-label={t('pichiChat.open')} onClick={talk}>
            <img key={hops} className={hops ? 'hop' : undefined} src={POSES[message.pose]} alt="" draggable={false} />
          </button>
          <button type="button" className="v2-bubble" aria-hidden tabIndex={-1} onClick={talk}>
            <b />
            <b />
            <b />
          </button>
        </div>
        <div className="v2-message">
          <div className="v2-hi">{t('home.hi', { name: myName })}</div>
          <h1 className="v2-headline">{message.headline}</h1>
          {message.to ? (
            <Link to={message.to} className="v2-link">
              {message.link} <span aria-hidden>›</span>
            </Link>
          ) : (
            <button type="button" className="v2-link" onClick={() => setAdding(true)}>
              {message.link} <span aria-hidden>›</span>
            </button>
          )}
          <div className="v2-news">{news}</div>
        </div>
      </section>

      {/* Quick actions: big round buttons, one tap to add. */}
      <nav className="v2-quick" aria-label={t('home.addWhat')}>
        {quick.map((q, i) => (
          <Link key={q.key} to={q.to} className={`v2-q${i === 0 ? ' main' : ''}`}>
            <span className="v2-q-circle">{q.icon}</span>
            <span className="v2-q-label">{q.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pending">
        <PendingInvites style={{ margin: '0 20px' }} />
      </div>

      {/* Today's cards, swiping sideways. */}
      <h2 className="v2-h">{t('v2.today')}</h2>
      <div className="v2-cards" data-noswipe>
        {cards.map((c) => (
          <Link key={c.key} to={c.to} className={`v2-card ${c.tone}`}>
            <span className="v2-card-title">{c.title}</span>
            <span className="v2-card-big">{c.big}</span>
            <span className="v2-card-lines">
              {c.lines.length ? c.lines.map((l, i) => <span key={i}>{l}</span>) : <span className="v2-card-empty">{c.empty}</span>}
            </span>
          </Link>
        ))}
      </div>

      {/* Big panels under the cards, like Flo's sleep card (Nora, 4 Nov). First the shelves, always in sight, as on the
          scrapbook Home. The calendar and money can come in as panels like this one later. */}
      <ShelfPanel rooms={rooms.rows} spots={spots.rows} shelf={shelf} />
      <div className="v2-end" />

      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
      <AddSheet open={adding} onClose={() => setAdding(false)} />
      <MentionBanner />
      <AskName save open={needsName && !askedName} onClose={() => setAskedName(true)} onJoin={() => {}} />
      <MeetPichi open={meet.open && !(needsName && !askedName)} onClose={meet.close} />
      <PichiChat open={chatting} onClose={() => setChatting(false)} lines={pichiLines} chips={pichiChips} />
    </Screen>
  )
}


/** The shelves on Home: one room at a time, picked with the pills on top, and what's in it, running out first. */
function ShelfPanel({ rooms, spots, shelf }: { rooms: Room[]; spots: Spot[]; shelf: Group[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const box = useShelfWidth()
  const roomOf = (g: Group) => spots.find((x) => x.id === spotOf(g.rows[0], rooms, spots))?.room_id
  const withThings = rooms.filter((r) => shelf.some((g) => roomOf(g) === r.id))
  const [picked, setPicked] = useState<string | null>(null)
  const room = withThings.find((r) => r.id === picked) ?? withThings[0]
  if (!room) return null
  const groups = shelf
    .filter((g) => roomOf(g) === room.id)
    .sort((a, b) => Number(groupLow(b.rows)) - Number(groupLow(a.rows)))
  const to = `/pantry?room=${room.id}`
  return (
    <section className="v2-panel">
      <h2 className="v2-h" style={{ margin: '0 0 12px' }}>{t('v2.shelves')}</h2>
      {withThings.length > 1 && (
        <div className="v2-chips" role="tablist">
          {withThings.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={r.id === room.id} className="v2-chip" onClick={() => setPicked(r.id)}>
              {r.name}
            </button>
          ))}
        </div>
      )}
      <div ref={box.ref} className="v2-shelf">
        <ShelfRows groups={groups} width={box.width} height={64} maxRows={2} compact onOpen={() => navigate(to)} />
      </div>
      <Link to={to} className="v2-panel-btn">{t('v2.openShelves')}</Link>
    </section>
  )
}

/** On Home, the browser's own top bar (Safari's) takes the deep color of the scene, so it runs edge to edge. */
function DeepTopBar() {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const before = meta.getAttribute('content')
    const deep = getComputedStyle(document.documentElement).getPropertyValue('--deep').trim()
    if (deep) meta.setAttribute('content', deep)
    return () => {
      if (before) meta.setAttribute('content', before)
    }
  }, [])
  return null
}
