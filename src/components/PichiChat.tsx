import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PichiAvatar, Sheet } from './Scrapbook'

export type PichiChip = { label: string; to?: string; onClick?: () => void }

/** Tap Pichi on Home and he talks to you (Nora, 4 Nov): a little chat where he says what's going on at home, one
 *  bubble after another as if he's typing, and a few replies to tap that take you where you need to be. */
export function PichiChat({ open, onClose, lines, chips }: { open: boolean; onClose: () => void; lines: string[]; chips: PichiChip[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Sheet open={open} onClose={onClose} small>
      <div className="pichi-chat">
        <div className="pichi-chat-head">
          <PichiAvatar size={44} />
          <div>
            <div className="pichi-chat-name">Pichi</div>
            <div className="pichi-chat-sub">{t('pichiChat.sub')}</div>
          </div>
        </div>
        <div className="pichi-chat-lines">
          {lines.map((line, i) => (
            <div key={i} className="pichi-line" style={{ ['--i' as string]: i }}>
              {line}
            </div>
          ))}
        </div>
        <div className="pichi-chips" style={{ ['--i' as string]: lines.length }}>
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              className="pichi-chip"
              onClick={() => {
                onClose()
                if (c.onClick) c.onClick()
                else if (c.to) navigate(c.to)
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  )
}
