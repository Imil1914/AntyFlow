// Темы и глобальные стили «Персональной ОС».
// Значения 1:1 из макета (ос/Персональная ОС.dc.html → themes).
import type { CSSProperties } from 'react'

export type ThemeName = 'Графит' | 'Обсидиан' | 'Тёплый уголь' | 'Светлая'

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
  },
  // Светлая тема — как на ранних макетах (белые карточки на светло-сером холсте)
  Светлая: {
    bg: '#EEF0F3',
    grid: '#DCE0E6',
    panel: '#FFFFFF',
    panel2: '#F4F6F9',
    border: '#D5DAE1',
    edge: '#B4BBC6',
    text: '#1A1D23',
    muted: '#6B7280'
  }
}

export const THEME_ORDER: ThemeName[] = ['Графит', 'Обсидиан', 'Тёплый уголь', 'Светлая']
// Цвет-образец для переключателя тем в статус-баре (фон кнопки)
export const THEME_SWATCH: Record<ThemeName, string> = {
  Графит: '#15171C',
  Обсидиан: '#131527',
  'Тёплый уголь': '#181512',
  Светлая: '#FFFFFF'
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
  ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--text) 22%, transparent); border-radius: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }

  @keyframes ppulse { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* ---- Красивые ноды: появление, дыхание бейджа, бегущий блик, поток связей ---- */
  @keyframes flownode-in { from { opacity:0; transform: translateY(8px) scale(.985) } to { opacity:1; transform:none } }
  .flow-node-card { animation: flownode-in .30s cubic-bezier(.2,.85,.25,1) both; }

  /* Плашка-бейдж типа ноды: мягкое «дыхание» свечения в цвете типа (--nk) */
  @keyframes badge-breathe {
    0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--nk) 0%, transparent), 0 0 7px -1px color-mix(in srgb, var(--nk) 45%, transparent); }
    50%     { box-shadow: 0 0 0 1px color-mix(in srgb, var(--nk) 22%, transparent), 0 0 14px 1px color-mix(in srgb, var(--nk) 60%, transparent); }
  }
  .flow-badge { animation: badge-breathe 3.4s ease-in-out infinite; }
  .flow-badge .flow-badge-dot { animation: ppulse 2.4s ease-in-out infinite; }

  /* Верхняя акцентная полоса ноды: бегущий блик */
  @keyframes accent-shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
  .flow-accent-bar { background-size: 200% 100%; animation: accent-shimmer 5.5s linear infinite; }

  /* Связи-стрелки: «текущий» пунктир + мягкое свечение */
  @keyframes dashflow { to { stroke-dashoffset: -32; } }
  .os-canvas .tl-arrow-hint, .os-canvas svg .tl-arrow > path,
  .os-canvas .tl-svg-container path[stroke-dasharray] {
    animation: dashflow 1.1s linear infinite;
  }

  /* Плавные переходы hover для карточек-плашек списка */
  .flow-chip-card { transition: transform .12s ease, box-shadow .12s ease, filter .12s ease; }
  .flow-chip-card:hover { transform: translateY(-2px); filter: brightness(1.06); }

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
  .os-scroll::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--text) 22%, transparent); border-radius: 4px; }

  /* Элементы раздвижного сайдбара */
  .os-rail { cursor: pointer; transition: background .12s ease; }
  .os-rail:hover { background: rgba(255,255,255,0.06); }
  .os-rail-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Панель стилей tldraw (справа сверху) — небольшой отступ сверху */
  .os-canvas .tlui-layout__top__right { margin-top: 8px; }

  /* Убираем водяной знак «Made with tldraw» */
  .tl-watermark_SEE-LICENSE, [class*="tl-watermark"] { display: none !important; }
`
