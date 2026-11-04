import {
  ArrowBendUpLeft, Basket, CaretDown, CaretLeft, ChatCircleDots, CheckSquare, DotsThree, Export, GearSix, House, MagnifyingGlass,
  NotePencil, PencilSimple, Plus, PushPin, Toolbox, Trash, UserPlus, Wallet, X, type Icon,
} from '@phosphor-icons/react'

// Line icons from the hi-fi screens: 26 px, 2 px stroke, round caps.

type P = { size?: number; width?: number; className?: string }

function Svg({ size = 26, width = 2, children, className }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 26 26"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

/** A broom mid-sweep, for the pantry's deep clean: a long handle, a head that curves as it pushes, a puff of dust. */
export const BroomIcon = (p: P) => (
  <Svg size={24} width={1.8} {...p}>
    <path d="M24.5 1.5 13.6 12.4" />
    <path d="M11.2 11.2l5.6 5.6" />
    <path d="M11.6 11.8C8.4 12.8 5 14.6 1.8 17.2C3.4 20.6 5.6 23 9.2 24.6C11.8 22.4 14 19.6 15.8 16.4" />
    <path d="M12.6 14.6C10 16.6 7.6 19.2 5.6 22.2" />
    <path d="M.8 21.2l1.6.3M1.8 24.4l1.2-1" />
  </Svg>
)
// 2 px on screen like the field's border and the sticker button: 2.36 in the 26-wide box, drawn at 22 px. A slim arrow
// with a small head, like Claude's (Nora, 31 Oct), so it doesn't feel so big in the circle.
export const SendIcon = (p: P) => (
  <Svg size={22} width={2.36} {...p}>
    <path d="M13 19.8V6.6M8.6 11 13 6.6l4.4 4.4" />
  </Svg>
)
export const SmallCheck = (p: P) => (
  <Svg size={20} width={2.4} {...p}>
    <path d="M6 13.5l4.5 4.5L20 8" />
  </Svg>
)

export function GripIcon() {
  return (
    <svg viewBox="0 0 14 22" width="14" height="22" fill="#857A8C" aria-hidden>
      <circle cx="4" cy="4" r="1.8" />
      <circle cx="10" cy="4" r="1.8" />
      <circle cx="4" cy="11" r="1.8" />
      <circle cx="10" cy="11" r="1.8" />
      <circle cx="4" cy="18" r="1.8" />
      <circle cx="10" cy="18" r="1.8" />
    </svg>
  )
}

/** The household switcher arrow, drawn in the same dry ink as the headline next to it:
 *  rough edges from the #dry-ink filter, patchy ink from the same mask. */
/** `right`: on desktop the household name opens a panel at the side, so its chevron points that way (Nora, 29 Oct). */
/** The little arrow after a household's name: clean, in the text's own color (it was a marker stroke in the scrapbook look). */
export function InkChevron({ dir = 'down' }: { dir?: 'down' | 'right' }) {
  return (
    <span className="chev" style={{ display: 'flex', transform: dir === 'right' ? 'rotate(-90deg)' : undefined }}>
      <CaretDown size={18} weight="bold" aria-hidden />
    </span>
  )
}

/** A loose loop of marker around the active tab's icon. It overshoots where it started, like a quick hand circle. */
export function InkCircle({ className = 'tab-circle' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 46 38" aria-hidden>
      <path
        d="M30.5 4.2C21 1.6 7.6 4.6 4.3 14.2 1.4 23 9.6 33.4 22.6 33.9 35.2 34.4 43 26.4 41.6 17.2 40.4 9.6 32.6 4.6 23.2 4.4 19.6 4.3 16.4 5.2 14.2 6.4"
        pathLength={1}
        fill="none"
        style={{ stroke: 'var(--hero-dark)' }}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}



/** Delete: a small trash can, in a pop-up's title row. */


// The redesign's icons (Nora, 4 Nov): one rounded family, like WhatsApp's. Outlined, and filled when chosen (the menu).
// A thicker line (width 2.3 and up) asks for the bold weight, for small marks that must read clearly.
function ph(I: Icon, defSize: number, defWeight: 'regular' | 'bold' = 'regular') {
  const C = ({ size = defSize, width, className }: P) => <I size={size} weight={width && width >= 2.3 ? 'bold' : defWeight} className={className} aria-hidden />
  return C
}
function filled(I: Icon) {
  const C = ({ size = 26 }: { size?: number }) => <I size={size} weight="fill" aria-hidden />
  return C
}
export const BackIcon = ph(CaretLeft, 26, 'bold')
export const ShareIcon = ph(Export, 20)
export const PencilIcon = ph(PencilSimple, 20)
export const GearIcon = ph(GearSix, 22)
export const ChevronDown = ph(CaretDown, 20)
export const PlusIcon = ph(Plus, 26, 'bold')
export const DotsIcon = ph(DotsThree, 22, 'bold')
export const PersonAddIcon = ph(UserPlus, 22)
export const CloseIcon = ph(X, 22)
export const SearchIcon = ph(MagnifyingGlass, 20)
export const HomeIcon = ph(House, 26)
export const BasketIcon = ph(Basket, 26)
export const TodoIcon = ph(CheckSquare, 26)
export const NoteIcon = ph(NotePencil, 26)
export const ProjectIcon = ph(Toolbox, 26)
export const MessagesIcon = ph(ChatCircleDots, 26)
export const MoneyIcon = ph(Wallet, 26)
export const ReplyIcon = ph(ArrowBendUpLeft, 20)
export const PinIcon = ph(PushPin, 22)
export const TrashIcon = ph(Trash, 22)
export const HomeFilled = filled(House)
export const BasketFilled = filled(Basket)
export const TodoFilled = filled(CheckSquare)
export const NoteFilled = filled(NotePencil)
export const ProjectFilled = filled(Toolbox)
export const MessagesFilled = filled(ChatCircleDots)
