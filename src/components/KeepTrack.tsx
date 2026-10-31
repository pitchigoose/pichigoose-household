import { useTranslation } from 'react-i18next'
import { Chip } from '../screens/Todos'
import type { PantryItem } from '../data/hooks'

/*
 * Pichi keeps track (Nora and her mom, 31 Oct): "every 2 weeks I buy 4 sour creams". Two rows of chips, how often and
 * how many, the same on a pantry thing and in the Pichi talk. Pichi stores it as how long one of them lasts.
 */

export const EVERY = [3, 7, 14, 30, 60, 90] as const
export const COUNTS = [1, 2, 3, 4, 5, 6] as const

/** How often you buy it, in days, from what Pichi has learned so far. */
export const everyOf = (p: Pick<PantryItem, 'lasts_days' | 'buy_count'>) => (p.lasts_days ?? 0) * (p.buy_count ?? 1)

/** The columns for "every `every` days I buy `count`". Starts counting again from now. */
export const trackPatch = (every: number, count: number) => ({
  lasts_days: Math.round((every / count) * 10) / 10,
  buy_count: count,
  drained_at: new Date().toISOString(),
  pichi_drained: 0,
})

export function KeepTrackFields({ every, count, onChange }: { every: number; count: number; onChange: (every: number, count: number) => void }) {
  const { t } = useTranslation()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <span className="label">{t('track.howOften')}</span>
        <div className="chips">
          {EVERY.map((d) => (
            <Chip key={d} on={Math.round(every) === d} onClick={() => onChange(d, count)}>
              {t(`track.every.${d}`)}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <span className="label">{t('track.howMany')}</span>
        <div className="chips">
          {COUNTS.map((n) => (
            <Chip key={n} on={count === n} onClick={() => onChange(every, n)}>
              {String(n)}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
