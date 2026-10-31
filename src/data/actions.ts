import { cachedRows, db } from './store'
import type { Item, List, PantryItem, Todo } from './hooks'
import { nextDue } from '../lib/time'
import { groupKey } from '../components/Shelves'

/** Pichi keeps track of it himself (Nora, 31 Oct): he lowers it a little every day on the server. */
export const tracked = (p: Pick<PantryItem, 'lasts_days'>) => p.lasts_days != null && p.lasts_days > 0

/** What goes on the list: "Sour cream × 4" when you buy several at once. The same on the server. */
export const listName = (p: Pick<PantryItem, 'name' | 'buy_count'>) => `${p.name.trim()}${(p.buy_count ?? 1) > 1 ? ` × ${p.buy_count}` : ''}`

export function toggleItem(item: Item, me: string) {
  const now = new Date().toISOString()
  db.update('list_items', item.id, item.checked_at ? { checked_at: null, checked_by: null } : { checked_at: now, checked_by: me })
  if (item.checked_at || !item.pantry_item_id) return
  // Bought something from the pantry? It's full again.
  db.update('pantry_items', item.pantry_item_id, { level: 100, updated_by: me, updated_at: now })
  // One Pichi keeps track of: you bought as many as you always do (four sour creams), so they all go back on the
  // shelf, and he starts counting again from now.
  const all = cachedRows<PantryItem>('pantry_items')
  const thing = all.find((p) => p.id === item.pantry_item_id)
  if (!thing || !tracked(thing)) return
  const fresh = { pichi_drained: 0, drained_at: now }
  for (const r of all.filter((x) => groupKey(x) === groupKey(thing))) db.update('pantry_items', r.id, fresh)
  const { id: _id, ...like } = thing
  void _id
  for (let i = 1; i < (thing.buy_count ?? 1); i++) {
    db.insert('pantry_items', { ...like, ...fresh, level: 100, created_by: me, created_at: now, updated_by: me, updated_at: now })
  }
}

/**
 * Pichi learns alongside you (Nora, 31 Oct). Each time a person says how full a thing he keeps track of really is,
 * he compares what he took since the last time someone looked with what was really used. Took more than was used
 * (there's still half a jar of coffee): it lasts longer than he thought. Took less: it goes faster. He moves halfway
 * toward what he saw, at most half again or twice as fast at a time, so one odd week doesn't throw him off. He only
 * learns once he has taken at least 10%, and adding more (buying it) teaches him nothing. Either way he starts
 * counting again from what the person said.
 */
function learned(group: PantryItem[], before: number, after: number): Partial<PantryItem> | null {
  if (!group.some(tracked)) return null
  const lasts = Math.max(...group.map((r) => r.lasts_days ?? 0))
  const took = Math.max(...group.map((r) => r.pichi_drained ?? 0))
  const used = took + before - after
  let next = lasts
  if (took >= 10 && used >= 0) {
    const f = Math.min(2, Math.max(0.5, took / Math.max(used, 1)))
    next = Math.min(3650, Math.max(0.1, Math.round(((lasts * (1 + f)) / 2) * 10) / 10))
  }
  return { lasts_days: next, pichi_drained: 0 }
}

/** Only one left, and it's almost out (or gone). */
const runningLow = (rows: PantryItem[]) => rows.length === 1 && rows[0].level <= rows[0].low_at

/**
 * Sets how full one thing in the pantry is. `group` is it plus the others of the same name (the
 * other bottles of wine). An empty one is tossed when there are others left; the last one stays
 * on the shelf at 0. When the group gets down to its last one and that's almost out, Pichi puts it
 * on the shopping list by herself (unless it's already there). Returns what she added and what was
 * tossed, so the screen can say so and offer Undo.
 */
export function setPantryLevel(p: PantryItem, level: number, me: string, lists: List[], items: Item[], group: PantryItem[] = [p]) {
  const now = new Date().toISOString()
  const others = group.filter((r) => r.id !== p.id)
  const sum = (rows: PantryItem[]) => rows.reduce((n, r) => n + r.level, 0)
  const learn = learned(group, sum(group), sum(others) + level) ?? {}
  let tossed: PantryItem | null = null
  let after: PantryItem[]
  if (level === 0 && others.length) {
    db.remove('pantry_items', p.id)
    tossed = p
    after = others
  } else {
    db.update('pantry_items', p.id, { level, ...learn, updated_by: me, updated_at: now })
    after = [...others, { ...p, level }]
  }
  if (Object.keys(learn).length) for (const r of others) db.update('pantry_items', r.id, learn)
  const justRanOut = after.length === 1 && after[0].level === 0 && !(group.length === 1 && group[0].level === 0)
  const crossed = runningLow(after) && (!runningLow(group) || justRanOut)
  if (!crossed || items.some((x) => x.pantry_item_id && group.some((r) => r.id === x.pantry_item_id) && !x.checked_at)) return { added: null, tossed }
  const last = after[0]
  const sorted = [...lists].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const list = sorted.find((l) => l.id === last.list_id) ?? sorted[0]
  if (!list) return { added: null, tossed }
  const row = db.insert('list_items', {
    list_id: list.id,
    name: listName(last),
    added_by: me,
    created_at: now,
    checked_at: null,
    checked_by: null,
    position: 0,
    pantry_item_id: last.id,
    added_by_pichi: true,
  })
  return { added: { row, list }, tossed }
}

/** Ticking a repeating to-do marks it done and creates the next one with the new due date. */
export function toggleTodo(todo: Todo, me: string) {
  if (todo.done_at) {
    db.update('todos', todo.id, { done_at: null, done_by: null })
    return
  }
  db.update('todos', todo.id, { done_at: new Date().toISOString(), done_by: me })
  if (todo.repeat) {
    db.insert('todos', {
      household_id: todo.household_id,
      title: todo.title,
      assignee_id: todo.assignee_id,
      repeat: todo.repeat,
      due_date: nextDue(todo.due_date, todo.repeat),
      created_by: me,
      created_at: new Date().toISOString(),
      done_at: null,
      done_by: null,
    })
  }
}

// Bought items and done to-dos stay on the list for the rest of the day they were ticked, then move to the archive
// ("Done earlier") at midnight (Nora, 30 Oct). They used to stay a full 24 hours, so last night's were still there.
const sameDay = (iso: string, now: number) => new Date(iso).toDateString() === new Date(now).toDateString()

export function recentlyBought(item: Item, now = Date.now()) {
  return Boolean(item.checked_at) && sameDay(item.checked_at as string, now)
}

export function recentlyDone(todo: Todo, now = Date.now()) {
  return Boolean(todo.done_at) && sameDay(todo.done_at as string, now)
}

/** Added today: shown first with a small "new" label, so what you just added is always in sight (Nora, 30 Oct). */
export function isNewTodo(todo: Todo, now = Date.now()) {
  return !todo.done_at && new Date(todo.created_at).toDateString() === new Date(now).toDateString()
}

/**
 * The one order for open to-dos, on Home and on the To-dos page alike: what was added today first (newest on top),
 * then what's due soonest, then the oldest. One rule in one place, so both screens always agree.
 */
export function byTodoOrder(a: Todo, b: Todo) {
  // Pinned ones first (Nora, 30 Oct).
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1
  const na = isNewTodo(a)
  const nb = isNewTodo(b)
  if (na !== nb) return na ? -1 : 1
  if (na && nb) return b.created_at.localeCompare(a.created_at)
  return (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || a.created_at.localeCompare(b.created_at)
}

export function byPositionThenAge(a: Item, b: Item) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at)
}
