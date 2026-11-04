import logo from '../../assets/logo-pichigoose.png'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useMe } from '../auth'
import {
  useProjects,
  completeLayout,
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
  type Section,
} from '../data/hooks'
import { byTodoOrder, isNewTodo, recentlyDone, toggleItem, toggleTodo } from '../data/actions'
import { Screen } from '../components/Shell'
import { Avatar, NobodyAvatar } from '../components/Avatar'
import { Check, Hand, NewTag, PaperClip, PichiAvatar, POSES, Struck, Tick, PichiStamp, Tape, tilt, type Pose, type TapeKind } from '../components/Scrapbook'
import { BasketIcon, InkChevron, MessagesIcon, PencilIcon, PinIcon, TodoIcon } from '../components/Icons'
import { MyHouseholds } from './MyHouseholds'
import { PendingInvites } from './Invite'
import { AddSheet } from './AddSheet'
import { MentionBanner } from '../components/MentionBanner'
import { PersonLink } from './Person'
import { NotePanel, colorOf } from './Notes'
import { AskName, madeFromEmail } from './AskName'
import { MeetPichi, useMeetPichiOnce } from './MeetPichi'
import { ago, daysFromToday, dueLabel, fromDateString } from '../lib/time'
import { useDesktop } from '../lib/desktop'
import { DragBoard } from '../components/DragBoard'
import { CommentCount, useCommentCounts } from '../components/Comments'
import { db } from '../data/store'
import { ShelfRows, groupLow, groupThings, useShelfWidth, type Group } from '../components/Shelves'
import { spotOf } from './Pantry'
import { useSwipeBetween } from '../components/Slide'
import { ProgressLine } from './Projects'

// Desktop: the small notes inside the notes section, each a little tilted and held with a paper clip on the left edge
// (the bottom right corner is for the comment bubble).
const MINI_TILT = [-2, 2, 1, -1.5]

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

function NoteHead({ title, right, to }: { title: string; right: string; to: string }) {
  const desktop = useDesktop()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <Hand size={desktop ? 34 : 30} lineHeight={desktop ? 36 : 32}>
        {title}
      </Hand>
      <Link to={to} className="cap" style={{ color: 'var(--hero-dark)', fontWeight: 800 }}>
        {right}
      </Link>
    </div>
  )
}

function Empty({ children }: { children: string }) {
  return <div className="cap" style={{ fontSize: 14, padding: '2px 0 4px' }}>{children}</div>
}

/** A room's sticky note on Home: its name and one shelf of what's running out first. */
function RoomNote({ room, groups, look, onOpen }: { room: Room; groups: Group[]; look: Look; onOpen: (path: string) => (e: React.MouseEvent) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const box = useShelfWidth()
  const to = `/pantry?room=${room.id}`
  const low = groups.filter((g) => groupLow(g.rows)).length
  return (
    <div className={`note ${look.note} note-link`} onClick={onOpen(to)} style={{ transform: `rotate(${look.rotate}deg)` }}>
      <Tape kind={look.tape} style={look.tapeStyle} />
      <NoteHead title={room.name.toLocaleLowerCase()} to={to} right={low ? `${t('home.pantryLow', { count: low })} · ${t('common.seeAll')}` : t('common.seeAll')} />
      {groups.length ? (
        <div ref={box.ref} style={{ padding: '10px 6px 0' }}>
          <ShelfRows groups={groups} width={box.width} height={56} maxRows={1} compact onOpen={() => navigate(to)} />
        </div>
      ) : (
        <Empty>{t('home.noPantry')}</Empty>
      )}
    </div>
  )
}

export function HomeScreen() {
  const { t, i18n } = useTranslation()
  const me = useMe()
  const profile = useMyProfile()
  const { household, membership, people, name, myName } = useHousehold()
  const hid = household?.id ?? null
  const lists = useLists(hid)
  const projects = useProjects(hid)
  // "to buy" shows what's left on every list in the household, not just the first one.
  const items = useItemsIn(lists.rows.map((l) => l.id))
  const listName = (id: string) => lists.rows.find((l) => l.id === id)?.name ?? ''
  const manyLists = lists.rows.length > 1
  const todos = useTodos(hid)
  const notes = useNotes(hid)
  const pantry = usePantry(hid)
  const desktop = useDesktop()
  // Only on Home: swipe from right to left to open Messages, like Instagram's direct messages.
  const toMessages = useNavigate()
  useSwipeBetween(null, desktop ? null : () => toMessages('/messages'))
  const [switching, setSwitching] = useState(false)
  // Desktop: a note opened from the board, in the side panel.
  const [openNote, setOpenNote] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  // Still called by the name made from the email? Ask once, the same way joining does now.
  const email = useAuth().session?.user.email ?? ''
  const [askedName, setAskedName] = useState(false)
  const needsName = Boolean(profile && email && madeFromEmail(profile.display_name, email))
  // Meeting Pichi (Nora, 31 Oct): once for each person in each household, after the name is sorted.
  const meet = useMeetPichiOnce()

  const person = (id: string | null) => people.find((p) => p.id === id)
  const commentsOn = useCommentCounts()
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
  // Open steps of projects that are still under way.
  const projectSteps = todos.rows.filter((x) => !x.done_at && x.project_id && projects.rows.some((p) => p.id === x.project_id && !p.done_at)).length
  // Done today stays on the note, crossed out at the bottom, until the day passes.
  const doneTodos = useMemo(
    () => todos.rows.filter((x) => recentlyDone(x) && !x.project_id).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')),
    [todos.rows],
  )
  const todayCount = openTodos.filter((x) => x.due_date && daysFromToday(fromDateString(x.due_date)) <= 0).length
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
  // On the desktop board the notes widget is wide (two columns) once there's more than one note: three notes across.
  const noteCols = pinnedNotes.length > 1 ? 3 : 2

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

  const fullLayout = useMemo(() => {
    return completeLayout(membership?.home_layout, rooms.rows)
  }, [membership, rooms.rows])
  const layout = useMemo(() => fullLayout.filter((s) => s.visible && s.section !== 'money'), [fullLayout])
  // Desktop: notes moved on the board keep their new order. Hidden sections, money and Pichi's news
  // keep their places; only the board's own slots are reshuffled.
  function saveBoard(keys: Section[]) {
    if (!household) return
    const slots = fullLayout.map((e, i) => (keys.includes(e.section) ? i : -1)).filter((i) => i >= 0)
    const next = [...fullLayout]
    keys.forEach((k, j) => {
      next[slots[j]] = fullLayout.find((e) => e.section === k)!
    })
    db.update('household_members', { household_id: household.id, user_id: me }, { home_layout: next })
  }

  // Clicking the note itself (not a checkbox, an item or a link on it) opens its page.
  const navigate = useNavigate()
  const open = (path: string) => (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, label, textarea')) return
    navigate(path)
  }

  function section(s: Section) {
    const look = LOOK[s] ?? LOOK.pantry
    if (s === 'news') {
      return (
        <div key="news" style={{ display: 'flex', gap: desktop ? 16 : 12, alignItems: 'flex-start', marginTop: desktop ? 0 : -4 }}>
          {/* Tap Pichi to meet her. */}
          <Link to="/pichi" aria-label={t('pichi.title')} style={{ display: 'block' }}>
            <PichiStamp />
          </Link>
          <div
            style={{
              position: 'relative',
              flex: desktop ? 'none' : 1,
              minWidth: desktop ? 300 : undefined,
              // Pichi's speech bubble in the theme color (Nora, 29 Oct), so each theme shows up on Home too.
              background: 'var(--hero)',
              borderRadius: '14px 16px 14px 4px',
              padding: desktop ? '14px 18px' : '12px 14px',
              boxShadow: '2px 3px 0 rgba(30,26,48,.10)',
              marginTop: desktop ? 10 : 6,
            }}
          >
            {/* The greeting leads; the news sits a step smaller under it. */}
            <Hand size={desktop ? 31 : 27} lineHeight={desktop ? 34 : 30} color="#FFFFFF">
              {t('home.hi', { name: myName })}
            </Hand>
            <div style={{ fontSize: desktop ? 16 : 14, lineHeight: desktop ? '22px' : '20px', fontWeight: 600, marginTop: 2, color: 'rgba(255, 255, 255, .82)' }}>{news}</div>
          </div>
        </div>
      )
    }
    if (s === 'projects') {
      // The projects under way, each with how far along it is.
      const active = projects.rows.filter((p) => !p.done_at).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      return (
        <div key="projects" className={`note ${look.note} note-link`} onClick={open('/projects')} style={{ transform: `rotate(${look.rotate}deg)` }}>
          <Tape kind={look.tape} style={look.tapeStyle} />
          <NoteHead title={t('home.projects')} to="/projects" right={t('common.seeAll')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {active.slice(0, 3).map((p) => {
              const steps = todos.rows.filter((x) => x.project_id === p.id)
              const list = lists.rows.find((l) => l.project_id === p.id)
              const buys = list ? items.rows.filter((x) => x.list_id === list.id) : []
              const done = steps.filter((x) => x.done_at).length + buys.filter((x) => x.checked_at).length
              const count = steps.length + buys.length
              return (
                <Link key={p.id} to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} style={{ display: 'block' }}>
                  <div className="ln" style={{ justifyContent: 'space-between' }}>
                    <span>{p.name}</span>
                    <span className="cap">{t('projects.progress', { done, count })}</span>
                  </div>
                  <ProgressLine done={done} count={count} />
                </Link>
              )
            })}
            {!active.length && <Empty>{t('home.noProjects')}</Empty>}
          </div>
        </div>
      )
    }
    if (s === 'todos') {
      return (
        <div key="todos" className={`note ${look.note} note-link`} onClick={open('/todos')} style={{ transform: `rotate(${look.rotate}deg)` }}>
          <Tape kind={look.tape} style={look.tapeStyle} />
          <NoteHead
            title={t('home.todos')}
            to="/todos"
            right={todayCount ? `${t('home.todosToday', { count: todayCount })} · ${t('common.seeAll')}` : t('common.seeAll')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openTodos.slice(0, 3).map((x) => {
              const who = person(x.assignee_id)
              return (
                <Tick key={x.id} checked={false} onCommit={() => toggleTodo(x, me)}>
                  {(on, toggle) => (
                    <div className={`ln${on ? ' row-done' : ''}`}>
                      <Check checked={on} onToggle={toggle} label={x.title} rotate={tilt(x.id)} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <Struck on={on}>{x.title}</Struck>
                        {/* Pinned on To-dos: a small pin, and it leads the list (Nora, 30 Oct). */}
                        {x.pinned && (
                          <span className="pin-mark" aria-label={t('todos.pinned')}>
                            <PinIcon size={16} />
                          </span>
                        )}
                        {isNewTodo(x) && <NewTag />}
                        <CommentCount n={commentsOn(x.id)} />
                        {x.due_date && <div className="cap">{dueLabel(x.due_date, i18n.language)}</div>}
                      </span>
                      <span className={`av-fade${on ? ' done' : ''}`}>{who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink> : <NobodyAvatar />}</span>
                    </div>
                  )}
                </Tick>
              )
            })}
            {doneTodos.slice(0, 2).map((x) => {
              const who = person(x.done_by ?? x.assignee_id)
              return (
                <Tick key={`done-${x.id}`} checked onCommit={() => toggleTodo(x, me)}>
                  {(on, toggle) => (
                    <div className={`ln${on ? ' row-done' : ''}`}>
                      <Check checked={on} onToggle={toggle} label={x.title} rotate={tilt(x.id)} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <Struck on={on}>{x.title}</Struck>
                        <CommentCount n={commentsOn(x.id)} />
                        {x.due_date && <div className="cap">{dueLabel(x.due_date, i18n.language)}</div>}
                      </span>
                      <span className={`av-fade${on ? ' done' : ''}`}>{who ? <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink> : <NobodyAvatar />}</span>
                    </div>
                  )}
                </Tick>
              )
            })}
            {!openTodos.length && !doneTodos.length && !projectSteps && <Empty>{t('home.noTodos')}</Empty>}
            {projectSteps > 0 && (
              <Link to="/projects" className="cap" style={{ fontWeight: 800, color: 'var(--hero-dark)' }} onClick={(e) => e.stopPropagation()}>
                {t('home.fromProjects', { count: projectSteps })}
              </Link>
            )}
          </div>
        </div>
      )
    }
    if (s === 'shopping') {
      return (
        <div key="shopping" className={`note ${look.note} note-link`} onClick={open('/shopping')} style={{ transform: `rotate(${look.rotate}deg)` }}>
          <Tape kind={look.tape} style={look.tapeStyle} />
          <NoteHead
            title={t('home.toBuy')}
            to="/shopping"
            right={toBuy.length ? `${t('common.items', { count: toBuy.length })} · ${t('common.seeAll')}` : t('common.seeAll')}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {toBuy.slice(0, 3).map((x) => {
              const who = person(x.added_by)
              return (
                <Tick key={x.id} checked={false} onCommit={() => toggleItem(x, me)}>
                  {(on, toggle) => (
                    <div className={`ln${on ? ' row-done' : ''}`}>
                      <Check checked={on} onToggle={toggle} label={x.name} rotate={tilt(x.id)} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <Struck on={on}>{x.name}</Struck>
                        <CommentCount n={commentsOn(x.id)} />
                        {/* Which list it's on, when there's more than one. */}
                        {manyLists && <div className="cap">{listName(x.list_id)}</div>}
                      </span>
                      {x.added_by_pichi ? (
                        <span className={`av-fade${on ? ' done' : ''}`}>
                          {/* Like people's avatars open their profile, Pichi's opens her page. */}
            <Link to="/pichi" aria-label={t('pichi.title')} style={{ display: 'flex', borderRadius: '50%' }} onClick={(e) => e.stopPropagation()}>
              <PichiAvatar />
            </Link>
                        </span>
                      ) : who && (
                        <span className={`av-fade${on ? ' done' : ''}`}>
                          <PersonLink id={who.id}><Avatar avatar={who.avatar} label={who.display_name} /></PersonLink>
                        </span>
                      )}
                    </div>
                  )}
                </Tick>
              )
            })}
            {!toBuy.length && <Empty>{t('home.noItems')}</Empty>}
          </div>
        </div>
      )
    }
    if (s.startsWith('room:')) {
      // A room's note: one shelf of what's running out first in that room.
      const room = rooms.rows.find((r) => `room:${r.id}` === s)
      if (!room) return null
      const inRoom = new Set(spots.rows.filter((x) => x.room_id === room.id).map((x) => x.id))
      const here = shelf.filter((g) => inRoom.has(spotOf(g.rows[0], rooms.rows, spots.rows) ?? ''))
      return <RoomNote key={s} room={room} groups={here} look={roomLook(room, rooms.rows)} onOpen={open} />
    }
    if (s === 'pantry' || s === 'bathroom') return null
    return (
      <div key="notes" className={`note ${look.note} note-link`} onClick={open('/notes')} style={{ transform: `rotate(${look.rotate}deg)` }}>
        <Tape kind={look.tape} style={look.tapeStyle} />
        <NoteHead title={t('home.notes')} to="/notes" right={t('common.seeAll')} />
        {desktop ? (
          // Desktop: the notes as small sticky notes, two across (three when the notes widget is wide). The ones on the
          // left edge are clipped on their left, those on the right edge on their right, and the middle ones are taped
          // at the top right (Nora, 29 Oct).
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${noteCols}, minmax(0, 1fr))`, gap: 22, paddingTop: 6 }}>
            {pinnedNotes.slice(0, noteCols * 2).map((n, i) => {
              const col = i % noteCols
              const by = person(n.updated_by)
              return (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => setOpenNote(n.id)}
                  className={`note ${colorOf(n.id)}`}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '16px 18px 30px', minHeight: 104, transform: `rotate(${MINI_TILT[i % MINI_TILT.length]}deg)`, boxShadow: '1px 2px 0 rgba(30,26,48,.14)', minWidth: 0 }}
                >
                  {col === 0 ? <PaperClip side="left" /> : col === noteCols - 1 ? <PaperClip side="right" /> : <Tape kind={i % 2 ? 'ty' : 'tb'} style={{ top: -9, right: 12, width: 54, height: 18, transform: 'rotate(5deg)' }} />}
                  <div style={{ fontSize: 17, lineHeight: '22px', fontWeight: 800, color: 'var(--ink)', overflowWrap: 'break-word', hyphens: 'auto' }}>{n.title || t('notes.untitled')}</div>
                  <div className="cap" style={{ marginTop: 4 }}>
                    {n.pinned ? t('notes.pinned') : `${by?.display_name ?? ''} · ${ago(n.updated_at, i18n.language)}`}
                  </div>
                  {/* The comment bubble sits in the bottom right corner. */}
                  <span style={{ position: 'absolute', right: 12, bottom: 8 }}>
                    <CommentCount n={commentsOn(n.id)} />
                  </span>
                </button>
              )
            })}
            {!pinnedNotes.length && <Empty>{t('home.noNotes')}</Empty>}
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pinnedNotes.slice(0, 3).map((n) => (
            <Link key={n.id} to={`/notes/${n.id}`} className="ln" style={{ display: 'block' }}>
              {n.title || t('notes.untitled')}
              <div className="cap" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {n.body.split('\n')[0]}
              </div>
            </Link>
          ))}
          {!pinnedNotes.length && <Empty>{t('home.noNotes')}</Empty>}
        </div>
        )}
      </div>
    )
  }

  if (desktop) {
    // Desktop (D3): Pichi and the greeting on top with "Arrange your home" on the right,
    // then the sections as sticky notes on a board, three across, in this person's own order.
    const board = layout.filter((s) => s.section !== 'news')
    return (
      <Screen wide doodle="run">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26, paddingTop: 'var(--top)', paddingRight: 22, paddingLeft: 40 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
            {layout.some((s) => s.section === 'news') && section('news')}
          </div>
          <PendingInvites style={{ maxWidth: 620 }} />
          <div style={{ marginTop: 10 }}>
            <DragBoard items={board.map((s) => ({ key: s.section, node: section(s.section), wide: s.section === 'notes' && pinnedNotes.length > 1 }))} onReorder={saveBoard} dropLabel={t('arrange.dropHere')} />
          </div>
        </div>
        <AskName save open={needsName && !askedName} onClose={() => setAskedName(true)} onJoin={() => {}} />
        <MeetPichi open={meet.open && !(needsName && !askedName)} onClose={meet.close} />
        {openNote && <NotePanel id={openNote} onClose={() => setOpenNote(null)} />}
        <MentionBanner />
      </Screen>
    )
  }

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
  const activeProjects = projects.rows.filter((p) => !p.done_at).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const quick = [
    { key: 'buy', label: t('v2.qBuy'), icon: <BasketIcon size={30} />, to: '/shopping?add=1' },
    { key: 'todo', label: t('v2.qTodo'), icon: <TodoIcon size={30} />, to: '/todos?add=1' },
    { key: 'note', label: t('v2.qNote'), icon: <PencilIcon size={28} />, to: '/notes/new' },
    { key: 'chat', label: t('v2.qChat'), icon: <MessagesIcon size={30} />, to: '/messages' },
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
    <Screen tabbar className="home-v2">
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
        <div className="v2-scene" aria-hidden>
          <i className="v2-cloud c1" />
          <i className="v2-cloud c2" />
          <i className="v2-cloud c3" />
          <i className="v2-hill" />
          <Link to="/pichi" className="v2-pichi" aria-label={t('pichi.title')} tabIndex={-1}>
            <img src={POSES[message.pose]} alt="" draggable={false} />
          </Link>
          <span className="v2-bubble">
            <b />
            <b />
            <b />
          </span>
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

      <PendingInvites style={{ margin: '0 20px' }} />

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
      <div style={{ height: 24 }} />

      <MyHouseholds open={switching} onClose={() => setSwitching(false)} />
      <AddSheet open={adding} onClose={() => setAdding(false)} />
      <MentionBanner />
      <AskName save open={needsName && !askedName} onClose={() => setAskedName(true)} onJoin={() => {}} />
      <MeetPichi open={meet.open && !(needsName && !askedName)} onClose={meet.close} />
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
