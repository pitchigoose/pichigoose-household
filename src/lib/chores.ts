// Trophies (Danko and Nora, 29 Oct; see PRODUCT.md "Trophies, recaps and rewards"). Pichi guesses what kind of chore
// a to-do is from its title, in English and Serbian, so nobody has to pick a type. Each month, whoever did the most
// of a chore (at least 3) gets its trophy. Grocery runs count the days someone bought food from the main shopping list.
// Nothing new is stored: everything is counted from what the to-dos and lists already remember.

import type { Item, List, Todo } from '../data/hooks'

export const CHORES = ['dishes', 'laundry', 'hanging-laundry', 'ironing', 'groceries', 'trash', 'cleaning', 'cooking', 'plants'] as const
export type Chore = (typeof CHORES)[number]

// Words Pichi listens for. Checked in this order, so "hang the laundry" is hanging laundry, not laundry.
// Serbian words are cut to their stem so every ending matches ("sudove", "sudova", "sudovi").
const WORDS: [Chore, string[]][] = [
  // "Raširiti veš" (hang it out), "skupiti veš sa štrika" (take it off the line) (Nora, 2 Nov).
  ['hanging-laundry', [' hang', 'pegs', 'clothesline', 'okači', 'okaci', 'kači', 'kaci', 'prostr', 'štipal', 'stipal', 'raširi', 'rasiri', 'štrik', 'strik', 'skupi veš', 'skupiti veš', 'skupi ves', 'skupiti ves']],
  ['ironing', ['iron', 'pegla', 'pegl']],
  ['dishes', ['dish', 'plates', 'sudov', 'sudo', 'sudopera', 'sudomaš', 'sudomas']],
  ['laundry', ['laundry', 'washing machine', 'wash clothes', 'veš', ' ves ', 'mašin', 'masin']],
  ['trash', ['trash', 'garbage', 'rubbish', ' bin', 'đubr', 'djubr', 'smeć', 'smec', 'kant']],
  ['cooking', ['cook', 'dinner', 'lunch', 'breakfast', 'bake', 'kuva', 'ručak', 'rucak', 'večer', 'vecer', 'doruč', 'doruc', ' peč', ' pec', 'ispeč', 'ispec']],
  ['plants', ['plant', 'water the', 'flower', 'biljk', 'cveć', 'cvec', 'zali']],
  ['cleaning', ['clean', 'vacuum', 'mop', 'dust', 'sweep', 'tidy', 'bathroom', ' čist', ' cist', 'očist', 'ocist', 'počist', 'pocist', 'usisa', 'brisa', 'bris', 'pras', 'kupatil']],
  ['groceries', ['grocer', 'shopping', 'supermarket', 'market', 'prodavnic', 'kupovin', 'namirnic', 'pijac']],
]

export function guessChore(title: string): Chore | null {
  const t = ` ${title.toLocaleLowerCase()} `
  for (const [chore, words] of WORDS) if (words.some((w) => t.includes(w))) return chore
  return null
}

export type Month = string // "2026-10"
export const monthOf = (iso: string) => iso.slice(0, 7)

/** How many of each chore each person did in a month: { dishes: { [personId]: 12 }, ... }. */
export function tally(todos: Todo[], items: Item[], month: Month) {
  const out: Partial<Record<Chore, Record<string, number>>> = {}
  const add = (chore: Chore, who: string) => {
    const row = (out[chore] ??= {})
    row[who] = (row[who] ?? 0) + 1
  }
  for (const x of todos) {
    if (!x.done_at || !x.done_by || monthOf(x.done_at) !== month) continue
    const chore = guessChore(x.title)
    // It counts for the person it was given to, even when someone else ticked it (Nora, 2 Nov).
    if (chore) add(chore, x.assignee_id ?? x.done_by)
  }
  // Grocery runs: one per person per day they bought something.
  const runs = new Set<string>()
  for (const x of items) {
    if (!x.checked_at || !x.checked_by || monthOf(x.checked_at) !== month) continue
    runs.add(`${x.checked_by}|${x.checked_at.slice(0, 10)}`)
  }
  for (const r of runs) add('groceries', r.split('|')[0])
  return out
}

export type Win = { chore: Chore; month: Month; winner: string; count: number; counts: Record<string, number> }

/** A trophy takes at least this many of a chore in the month: one vacuum doesn't make a Dust Slayer (Nora, 2 Nov). */
export const AT_LEAST = 3

/**
 * Grocery runs only count the household's main shopping list (the first one, usually Groceries), never a project's
 * list or a list like "Kuća" (Nora, 2 Nov: pillows and an extension cord made her the Fridge Filler).
 */
export function groceryItems(lists: List[], items: Item[]) {
  const main = [...lists].filter((l) => !l.project_id).sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))[0]
  return main ? items.filter((x) => x.list_id === main.id && isFood(x.name)) : []
}

// Groceries are food (Nora, 2 Nov: serums and a razor on the Groceries list made her the Fridge Filler). Pichi knows
// what isn't food: cosmetics, hygiene, cleaning, the pharmacy and odds and ends. Everything else on the main list
// counts. Matched without accents, so "šampon" and "sampon" are the same.
const NOT_FOOD = [
  // skin, hair and body
  'serum', 'cream', 'krema', 'lotion', 'losion', 'mleko za telo', 'mleko za lice', 'micel', 'toner', 'maska za', 'mask', 'spf', 'sunscreen', 'krema za sunc',
  'shampoo', 'sampon', 'conditioner', 'regenerator', 'balzam za kosu', 'boja za kosu', 'hair', 'soap', 'sapun', 'shower', 'gel za tus', 'kupk', 'body',
  'deodorant', 'dezodorans', 'perfume', 'parfem', 'makeup', 'sminka', 'maskara', 'mascara', 'ruz', 'lipstick', 'puder', 'lak za nokte', 'nail', 'skidac',
  'razor', 'brij', 'zilet', 'toothpaste', 'pasta za zube', 'toothbrush', 'cetkic', 'konac za zube', 'floss', 'vodica za usta', 'mouthwash',
  // paper and hygiene
  'toilet paper', 'toalet papir', 'wc papir', 'tissue', 'maramic', 'wipes', 'ulozak', 'ulosc', 'tampon', 'pelen', 'diaper', 'vata', 'stapic',
  // cleaning and laundry
  'detergent', 'deterdzent', 'softener', 'omeksivac', 'cleaner', 'sredstvo za', 'sundjer', 'sunder', 'sponge', 'kese za smece', 'trash bag', 'bin bag',
  'izbeljivac', 'bleach', 'tablete za sudomas', 'dishwasher tab', 'so za sudomas', 'osvezivac', 'air freshener', 'krpa', 'krpe',
  // pharmacy
  'vitamin', 'lek ', 'lekov', 'tablet', 'pills', 'aspirin', 'brufen', 'paracetamol', 'kapi za', 'flaster', 'plaster', 'zavoj', 'kondom', 'condom', 'test za',
  // odds and ends
  'baterij', 'batter', 'sijalic', 'bulb', 'produzn', 'kabl', 'cable', 'punjac', 'charger', 'svec', 'candle', 'folija za', 'hrana za mac', 'hrana za pse', 'cat food', 'dog food', 'pesak za mac',
]

const plain = (text: string) =>
  ` ${text.toLocaleLowerCase().replace(/đ/g, 'dj').normalize('NFD').replace(/[\u0300-\u036f]/g, '')} `

/** Is this shopping item food? (Not cosmetics, cleaning, the pharmacy or odds and ends.) */
export function isFood(name: string) {
  const t = plain(name ?? '')
  return !NOT_FOOD.some((w) => t.includes(w))
}

/** The month's trophies: one per chore, to whoever did the most, once they've done it at least AT_LEAST times. */
export function trophies(todos: Todo[], items: Item[], month: Month): Win[] {
  const t = tally(todos, items, month)
  const wins: Win[] = []
  for (const chore of CHORES) {
    const counts = t[chore]
    if (!counts) continue
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1])
    if (!ranked.length || ranked[0][1] < AT_LEAST) continue
    wins.push({ chore, month, winner: ranked[0][0], count: ranked[0][1], counts })
  }
  return wins
}

/** Every month that has anything done in it, newest first. */
export function monthsWithActivity(todos: Todo[], items: Item[]): Month[] {
  const set = new Set<Month>()
  for (const x of todos) if (x.done_at) set.add(monthOf(x.done_at))
  for (const x of items) if (x.checked_at) set.add(monthOf(x.checked_at))
  return [...set].sort().reverse()
}

/** Months in a row (ending with `month`) that `person` won `chore`. Three or more is a big trophy. */
export function streakOf(todos: Todo[], items: Item[], chore: Chore, person: string, month: Month) {
  let n = 0
  let [y, m] = month.split('-').map(Number)
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    const win = trophies(todos, items, key).find((w) => w.chore === chore)
    if (win?.winner !== person) break
    n += 1
    m -= 1
    if (m === 0) {
      m = 12
      y -= 1
    }
  }
  return n
}
