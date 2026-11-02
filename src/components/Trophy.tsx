import type { CSSProperties } from 'react'
import type { Chore } from '../lib/chores'
import dishes from '../../assets/badges/dishes.webp'
import laundry from '../../assets/badges/laundry.webp'
import hanging from '../../assets/badges/hanging-laundry.webp'
import ironing from '../../assets/badges/ironing.webp'
import groceries from '../../assets/badges/groceries.webp'
import trash from '../../assets/badges/trash.webp'
import cleaning from '../../assets/badges/cleaning.webp'
import cooking from '../../assets/badges/cooking.webp'
import plants from '../../assets/badges/plants.webp'

// Nora's badge drawings (29 Oct): one emblem for each chore.
export const EMBLEM: Record<Chore, string> = {
  dishes,
  laundry,
  'hanging-laundry': hanging,
  ironing,
  groceries,
  trash,
  cleaning,
  cooking,
  plants,
}

/** A trophy: just the chore's drawing, big and readable (Nora, 2 Nov: the medal frame around it made it hard to
 *  read). Three months in a row shows in its name ("Sink Royalty"). */
export function Trophy({ chore, size = 96, style }: { chore: Chore; size?: number; big?: boolean; style?: CSSProperties }) {
  return <img src={EMBLEM[chore]} alt="" aria-hidden width={size} height={size} style={{ display: 'inline-block', width: size, height: size, objectFit: 'contain', flex: 'none', ...style }} />
}
