// The app's hero color, picked in Settings and saved on the profile (profiles.theme).
// The CSS for each theme is in scrapbook.css under html[data-theme].

// desk: the color around the paper (and behind the phone's status bar), a pale tint of the theme (Nora, 29 Oct).
// Keep in step with --desk in scrapbook.css.
export const THEMES = [
  { id: 'pichigoose', hex: '#D34471', desk: '#EFD3D8' },
  { id: 'blue', hex: '#3B6FA0', desk: '#D2DEEA' },
  { id: 'green', hex: '#5E8A45', desk: '#D6E1C8' },
  { id: 'orange', hex: '#D0643B', desk: '#F2DACB' },
  { id: 'purple', hex: '#8A4FA3', desk: '#E6D7EC' },
  { id: 'yellow', hex: '#B27B12', desk: '#F5EAC6' },
  { id: 'brown', hex: '#8B5E3C', desk: '#EADCCB' },
  { id: 'black', hex: '#3A3540', desk: '#E3E0E2' },
] as const

const KEY = 'pichigoose.theme'

export function applyTheme(theme: string | null | undefined) {
  const id = THEMES.some((x) => x.id === theme) ? (theme as string) : 'pichigoose'
  document.documentElement.dataset.theme = id
  // The phone's own bars (Safari, the status bar) take the desk color too.
  const desk = THEMES.find((x) => x.id === id)?.desk
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && desk && document.documentElement.dataset.mode !== 'dark') meta.setAttribute('content', desk)
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // ignore
  }
}

/** On start, before anything draws: the last theme used on this device, so there's no flash of pink. */
export function applySavedTheme() {
  try {
    applyTheme(localStorage.getItem(KEY))
  } catch {
    applyTheme(null)
  }
}

// Light or dark (Nora, 4 Nov). Auto follows the phone's own setting. Saved on this device only, like the theme above.
export type Mode = 'auto' | 'light' | 'dark'
const MODE_KEY = 'pichigoose.mode'
const darkQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null

export function savedMode(): Mode {
  try {
    const m = localStorage.getItem(MODE_KEY)
    return m === 'light' || m === 'dark' ? m : 'auto'
  } catch {
    return 'auto'
  }
}

function resolveMode() {
  const m = savedMode()
  const dark = m === 'dark' || (m === 'auto' && Boolean(darkQuery?.matches))
  document.documentElement.dataset.mode = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  // The phone's own bars take the page color.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && dark) meta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#24101A')
  else if (meta) {
    const desk = THEMES.find((x) => x.id === document.documentElement.dataset.theme)?.desk
    if (desk) meta.setAttribute('content', desk)
  }
}

export function setMode(mode: Mode) {
  try {
    if (mode === 'auto') localStorage.removeItem(MODE_KEY)
    else localStorage.setItem(MODE_KEY, mode)
  } catch {
    // ignore
  }
  resolveMode()
}

/** On start: the saved choice, and from then on the phone's setting while on Auto. */
export function applySavedMode() {
  resolveMode()
  darkQuery?.addEventListener('change', resolveMode)
}
