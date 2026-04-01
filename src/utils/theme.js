export const THEME_OPTIONS = [
  { id: 'ocean-blue', name: 'Ocean Blue', header: '#2563eb', sidebar: '#ffffff', primaryDark: '#1d4ed8' },
  { id: 'forest-green', name: 'Forest Green', header: '#059669', sidebar: '#ffffff', primaryDark: '#047857' },
  { id: 'royal-purple', name: 'Royal Purple', header: '#7c3aed', sidebar: '#ffffff', primaryDark: '#6d28d9' },
  { id: 'sunset-orange', name: 'Sunset Orange', header: '#ea580c', sidebar: '#ffffff', primaryDark: '#c2410c' },
  { id: 'midnight-dark', name: 'Midnight Dark', header: '#1f2937', sidebar: '#111827', primaryDark: '#111827' },
  { id: 'rose-pink', name: 'Rose Pink', header: '#e11d48', sidebar: '#ffffff', primaryDark: '#be123c' },
  { id: 'teal-fresh', name: 'Teal Fresh', header: '#0891b2', sidebar: '#ffffff', primaryDark: '#0e7490' },
  { id: 'slate-gray', name: 'Slate Gray', header: '#475569', sidebar: '#ffffff', primaryDark: '#334155' },
]

const THEMES = THEME_OPTIONS.reduce((acc, theme) => {
  acc[theme.id] = { primary: theme.header, primaryDark: theme.primaryDark }
  return acc
}, {})

export function applyTheme() {
  const theme = localStorage.getItem('zeevid_theme') || 'ocean-blue'
  const mode = localStorage.getItem('zeevid_display_mode') || 'light'
  const root = document.documentElement
  const body = document.body

  const selected = THEMES[theme] || THEMES['ocean-blue']
  root.style.setProperty('--color-primary', selected.primary)
  root.style.setProperty('--color-primary-dark', selected.primaryDark)

  if (mode === 'dark') {
    root.classList.add('dark-mode')
    body?.classList.add('dark-mode')
  } else {
    root.classList.remove('dark-mode')
    body?.classList.remove('dark-mode')
  }
}
