// Темы и глобальные стили «Персональной ОС».
// Значения 1:1 из макета (ос/Персональная ОС.dc.html → themes).
import type { CSSProperties } from 'react'

export type ThemeName = 'Графит' | 'Обсидиан' | 'Тёплый уголь'

export type ThemeVars = {
  bg: string
  grid: string
  panel: string
  panel2: string
  border: string
  edge: string
  text: string
  muted: string
}

export const THEMES: Record<ThemeName, ThemeVars> = {
  Графит: {
    bg: '#0E0F12',
    grid: '#212530',
    panel: '#15171C',
    panel2: '#1B1E24',
    border: '#272B34',
    edge: '#39404E',
    text: '#E7EAF0',
    muted: '#8B93A3'
  },
  Обсидиан: {
    bg: '#0C0D18',
    grid: '#1F2238',
    panel: '#131527',
    panel2: '#181B31',
    border: '#272B4A',
    edge: '#3B4066',
    text: '#E6E8F5',
    muted: '#8D93B8'
  },
  'Тёплый уголь': {
    bg: '#121110',
    grid: '#262219',
    panel: '#181512',
    panel2: '#1E1A16',
    border: '#2E2822',
    edge: '#453D33',
    text: '#EDE9E3',
    muted: '#A29A8E'
  }
}

export const THEME_ORDER: ThemeName[] = ['Графит', 'Обсидиан', 'Тёплый уголь']
// Цвет-образец для переключателя тем в статус-баре (фон кнопки)
export const THEME_SWATCH: Record<ThemeName, string> = {
  Графит: '#15171C',
  Обсидиан: '#131527',
  'Тёплый уголь': '#181512'
}

// Фиксированные (не зависят от темы) переменные: акцент и цвета типов нод
export const FIXED_VARS: Record<string, string> = {
  '--accent': '#22D3EE',
  '--accent-dim': 'rgba(34,211,238,.13)',
  '--c-note': '#4ADE80',
  '--c-chat': '#22D3EE',
  '--c-img': '#A78BFA',
  '--c-code': '#FBBF24',
  '--c-media': '#F472B6'
}

// Собрать объект инлайн-переменных для корневого контейнера под выбранную тему
export function themeVars(name: ThemeName): CSSProperties {
  const t = THEMES[name] ?? THEMES['Графит']
  return {
    '--bg': t.bg,
    '--grid': t.grid,
    '--panel': t.panel,
    '--panel2': t.panel2,
    '--border': t.border,
    '--edge': t.edge,
    '--text': t.text,
    '--muted': t.muted,
    ...FIXED_VARS
  } as CSSProperties
}

// Глобальный CSS: шрифты, скроллбары, keyframes и сброс штатного UI tldraw,
// чтобы поверх холста жила только обвязка макета.
export const OS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
  * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; height: 100%; }
  body, #root { font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', system-ui, sans-serif; }

  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }

  @keyframes ppulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* Холст tldraw занимает всю область; фон рисуем сами (радиальная сетка) */
  .os-canvas .tl-container { background: transparent !important; }
  .os-canvas .tl-background { background: transparent !important; }

  /* Кнопки/чипы обвязки */
  .os-btn { cursor: pointer; transition: background .15s ease, filter .15s ease, transform .05s ease; }
  .os-btn:active { transform: scale(0.97); }
  .os-tab:hover { background: rgba(255,255,255,0.05) !important; }
  .os-chip { cursor: grab; }
  .os-chip:active { cursor: grabbing; }
  .os-topbtn:hover { filter: brightness(1.15); }
  .os-cmd-item:hover { background: var(--panel2) !important; }
  .os-scroll::-webkit-scrollbar { width: 8px; }
  .os-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 4px; }

  /* Панель стилей tldraw (справа сверху) — опускаем ниже наших верхних кнопок */
  .os-canvas .tlui-layout__top__right { margin-top: 44px; }
`
