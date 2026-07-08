// Редактор слайда в стиле Figma: сверху панель инструментов, по центру холст
// с перетаскиваемыми/масштабируемыми объектами, справа — инспектор свойств
// выбранного объекта (заливка, текст, обводка, размеры и т.д.).
import { useEffect, useRef, useState } from 'react'
import type { Editor } from 'tldraw'
import { parseSlide, type Slide, type FreeBlock } from './SlideView'
import ScaledSlide from './SlideHtml'

const LAYOUTS: Array<Slide['layout']> = [
  'blank',
  'title',
  'bullets',
  'cards',
  'stats',
  'timeline',
  'compare',
  'progress',
  'diagram',
  'image',
  'quote'
]
const LAYOUT_RU: Record<string, string> = {
  blank: 'Свободный (Figma)',
  title: 'Титульный',
  bullets: 'Список',
  cards: 'Карточки',
  stats: 'Метрики',
  timeline: 'Таймлайн',
  compare: 'Сравнение',
  progress: 'Прогресс',
  diagram: 'Схема (Mermaid)',
  image: 'Текст + фото',
  quote: 'Цитата'
}

const SANS = "'IBM Plex Sans', -apple-system, 'Segoe UI', system-ui, sans-serif"
const MONO = "'JetBrains Mono', monospace"

const inp: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 13,
  padding: '7px 10px',
  outline: 'none',
  fontFamily: SANS
}
const btn: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '7px 12px',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--text)',
  background: 'var(--panel2)',
  cursor: 'pointer'
}
const primaryBtn: React.CSSProperties = {
  ...btn,
  background: 'var(--accent)',
  border: 'none',
  color: 'var(--bg)',
  padding: '9px 18px',
  fontSize: 13.5
}
const label: React.CSSProperties = { fontSize: 11, color: 'var(--muted)', letterSpacing: '.02em' }

const PREVIEW_W = 720
const SCALE = PREVIEW_W / 1280
const PREVIEW_H = 720 * SCALE
// Видимая область холста (вьюпорт) — внутри неё слайд можно зумить и двигать
const VW = 780
const VH = 470
const clampZoom = (z: number) => Math.min(6, Math.max(0.2, z))

// Быстрые пресеты фона слайда
const BG_PRESETS: { name: string; bg: string }[] = [
  { name: 'Синь', bg: 'radial-gradient(1200px 720px at 82% -12%, #243a5e 0%, #10131b 58%)' },
  { name: 'Изумруд', bg: 'radial-gradient(1200px 720px at 82% -12%, #113a30 0%, #0c1512 58%)' },
  { name: 'Закат', bg: 'radial-gradient(1200px 720px at 82% -12%, #3a1f2b 0%, #17110f 58%)' },
  { name: 'Аметист', bg: 'radial-gradient(1200px 720px at 82% -12%, #2a1f4a 0%, #100f1c 58%)' },
  { name: 'Графит', bg: 'radial-gradient(1200px 720px at 82% -12%, #1e2a36 0%, #0e1116 58%)' },
  { name: 'Тёмный', bg: '#0e1116' },
  { name: 'Белый', bg: '#f4f6fb' }
]

function readImage(editor: Editor, id: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = editor.getShape(id as never)
    return JSON.parse(s?.props?.extra || '{}').image || ''
  } catch {
    return ''
  }
}
function setNode(editor: Editor, id: string, props: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor.updateShape({ id: id as never, type: 'flow-node', props } as any)
}
const newId = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

// Высота захвата/рамки блока (когда высота ещё не задана явно)
function hitH(b: FreeBlock): number {
  if (b.h) return b.h
  if (b.type === 'image') return 200
  if (b.type === 'shape') return 120
  if (b.type === 'diagram') return 230
  if (b.type === 'stat' || b.type === 'card') return 150
  return Math.max(46, (b.fontSize || 30) * 1.4)
}

const BLOCK_RU: Record<string, string> = {
  text: 'Текст',
  image: 'Фото',
  diagram: 'Схема',
  stat: 'Метрика',
  card: 'Карточка',
  shape: 'Фигура'
}

// Порог прилипания в координатах слайда (≈6px экранных при текущем масштабе)
const SNAP = 6 / SCALE
const EMPTY_GUIDES = { x: [] as number[], y: [] as number[] }

// Рассчитать прилипание перетаскиваемого блока к краям/центрам других
// блоков и самого слайда. Возвращает скорректированные x/y и линии-направляющие.
function computeSnap(blocks: FreeBlock[], exclude: Set<string>, rawX: number, rawY: number, w: number, h: number, thr: number) {
  const xT = [0, 640, 1280]
  const yT = [0, 360, 720]
  for (const b of blocks) {
    if (exclude.has(b.id)) continue
    const bh = b.h || hitH(b)
    xT.push(b.x, b.x + b.w / 2, b.x + b.w)
    yT.push(b.y, b.y + bh / 2, b.y + bh)
  }
  const pick = (raw: number, size: number, targets: number[]) => {
    const pts = [raw, raw + size / 2, raw + size]
    let best: number | null = null
    for (const p of pts)
      for (const t of targets) {
        const d = t - p
        if (Math.abs(d) <= thr && (best === null || Math.abs(d) < Math.abs(best))) best = d
      }
    return best
  }
  const collect = (raw: number, size: number, targets: number[]) => {
    const pts = [raw, raw + size / 2, raw + size]
    const out: number[] = []
    for (const p of pts) for (const t of targets) if (Math.abs(t - p) < 0.5) out.push(t)
    return [...new Set(out)]
  }
  const dx = pick(rawX, w, xT)
  const dy = pick(rawY, h, yT)
  const nx = dx !== null ? rawX + dx : rawX
  const ny = dy !== null ? rawY + dy : rawY
  return { x: Math.round(nx), y: Math.round(ny), gx: dx !== null ? collect(nx, w, xT) : [], gy: dy !== null ? collect(ny, h, yT) : [] }
}

// Формы фигур для схем/инфографики
type ShapeKind = NonNullable<FreeBlock['shapeKind']>
const SHAPE_KINDS: { k: ShapeKind; icon: string; name: string }[] = [
  { k: 'rect', icon: '▭', name: 'Прямоугольник' },
  { k: 'ellipse', icon: '◯', name: 'Эллипс / круг' },
  { k: 'diamond', icon: '◇', name: 'Ромб (решение)' },
  { k: 'triangle', icon: '△', name: 'Треугольник' },
  { k: 'hexagon', icon: '⬡', name: 'Шестиугольник' },
  { k: 'parallelogram', icon: '▰', name: 'Параллелограмм (данные)' },
  { k: 'star', icon: '★', name: 'Звезда' },
  { k: 'line', icon: '─', name: 'Линия' },
  { k: 'arrow', icon: '→', name: 'Стрелка (связь)' }
]

// Буфер обмена объектов — на уровне модуля, чтобы вставлять между слайдами
let CLIPBOARD: FreeBlock[] = []

const LAYER_ICON: Record<string, string> = { text: '🔤', image: '🖼', diagram: '◇', stat: '📊', card: '🗂', shape: '⬛' }
function layerName(b: FreeBlock): string {
  if (b.name) return b.name
  if (b.type === 'text') return (b.text || 'Текст').replace(/\n/g, ' ').slice(0, 28) || 'Текст'
  if (b.type === 'shape') return b.text?.slice(0, 24) || SHAPE_KINDS.find((s) => s.k === (b.shapeKind || 'rect'))?.name.split(' ')[0] || 'Фигура'
  if (b.type === 'card') return b.heading || 'Карточка'
  if (b.type === 'stat') return b.value || 'Метрика'
  return BLOCK_RU[b.type]
}

// Перевод промпта на английский (FLUX понимает англ.) — чтобы можно было
// писать промпт по-русски.
async function toEnglishPrompt(p: string): Promise<string> {
  if (!/[а-яё]/i.test(p)) return p
  try {
    const res = await window.flow.aiChat({
      model: '',
      messages: [
        { role: 'system', content: 'Translate the following image-generation prompt to concise, vivid English. Return ONLY the English prompt text — no quotes, no explanation.' },
        { role: 'user', content: p }
      ]
    })
    if (res.ok && res.content.trim()) return res.content.trim().replace(/^["'«»\s]+|["'«»\s]+$/g, '')
  } catch {
    /* ignore — используем как есть */
  }
  return p
}

// Разложить «умный» макет на свободные элементы (в координатах 1280×720)
function explodeToBlocks(s: Slide, image?: string): FreeBlock[] {
  const out: FreeBlock[] = []
  const nid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const accent = s.accent || '#4c8dff'
  const push = (b: Omit<FreeBlock, 'id'>) => out.push({ ...b, id: nid() } as FreeBlock)
  const isTitle = s.layout === 'title'

  if (s.layout === 'quote') {
    push({ type: 'text', x: 100, y: 210, w: 1080, text: '«' + (s.quote || '') + '»', fontSize: 52, weight: 700, color: '#eef1f6', align: 'left' })
    if (s.author) push({ type: 'text', x: 100, y: 440, w: 1080, text: '— ' + s.author, fontSize: 28, weight: 500, color: '#9fb2cc', align: 'left' })
    return out
  }

  let y = 72
  if (s.kicker) {
    push({ type: 'text', x: 80, y, w: 1120, text: s.kicker, fontSize: 22, weight: 700, color: accent, align: 'left' })
    y += 44
  }
  if (s.title) {
    push({ type: 'text', x: 80, y, w: 1120, text: s.title, fontSize: isTitle ? 68 : 46, weight: 800, color: '#f5f8ff', align: 'left' })
    y += isTitle ? 100 : 76
  }
  if (s.subtitle) {
    push({ type: 'text', x: 80, y, w: 1120, text: s.subtitle, fontSize: isTitle ? 30 : 26, weight: 500, color: '#9fb2cc', align: 'left' })
    y += 70
  }
  y += 8

  if (s.bullets?.length) {
    for (const it of s.bullets) {
      push({ type: 'text', x: 100, y, w: 1040, text: '•  ' + it, fontSize: 30, weight: 500, color: '#e6ecf5', align: 'left' })
      y += 58
    }
  }
  if (s.cards?.length) {
    const n = Math.min(s.cards.length, 4)
    const gap = 28
    const w = Math.round((1120 - (n - 1) * gap) / n)
    s.cards.slice(0, 4).forEach((c, i) => push({ type: 'card', x: 80 + (i % n) * (w + gap), y, w, h: 230, icon: c.icon, heading: c.heading, cardText: c.text }))
    y += 250
  }
  if (s.stats?.length) {
    const n = Math.min(s.stats.length, 3)
    const gap = 36
    const w = Math.round((1120 - (n - 1) * gap) / n)
    s.stats.slice(0, 3).forEach((st, i) => push({ type: 'stat', x: 80 + i * (w + gap), y, w, value: st.value, statLabel: st.label }))
    y += 190
  }
  if (s.steps?.length) {
    s.steps.slice(0, 5).forEach((st, i) => {
      push({ type: 'card', x: 80, y, w: 1120, h: 108, icon: String(i + 1), heading: st.title, cardText: st.text })
      y += 124
    })
  }
  if (s.columns?.length) {
    const n = Math.min(s.columns.length, 3)
    const gap = 28
    const w = Math.round((1120 - (n - 1) * gap) / n)
    s.columns.slice(0, 3).forEach((col, i) => push({ type: 'card', x: 80 + i * (w + gap), y, w, h: 320, heading: col.heading, cardText: (col.items || []).map((t) => '• ' + t).join('\n') }))
    y += 340
  }
  if (s.bars?.length) {
    for (const b of s.bars) {
      push({ type: 'text', x: 100, y, w: 1040, text: `${b.label} — ${Math.round(b.value)}%`, fontSize: 28, weight: 600, color: '#e6ecf5', align: 'left' })
      y += 54
    }
  }
  if (s.diagram) {
    push({ type: 'diagram', x: 100, y, w: 1000, h: 360, code: s.diagram })
    y += 380
  }
  if (image && s.layout === 'image') {
    push({ type: 'image', x: 700, y: 210, w: 500, h: 320, src: image })
  }
  return out
}

function rgbToHex(c: string): string {
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) return c || '#eef1f6'
  const parts = m[1].split(',').map((v) => parseFloat(v.trim()))
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return '#' + h(parts[0]) + h(parts[1]) + h(parts[2])
}

// ТОЧНЫЙ разбор: измеряет реально отрендеренный слайд (позиции/размеры/шрифты/
// цвета из DOM) и воспроизводит его редактируемыми объектами — без наездов и
// искажений. slideEl — элемент .sd-slide внутри превью.
function measureExplode(slideEl: HTMLElement, s: Slide): FreeBlock[] {
  const sr = slideEl.getBoundingClientRect()
  const rs = sr.width / 1280 || 1
  const nid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const out: FreeBlock[] = []
  const done = new Set<Element>()
  const accent = s.accent || '#4c8dff'
  const box = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round((r.left - sr.left) / rs), y: Math.round((r.top - sr.top) / rs), w: Math.round(r.width / rs), h: Math.round(r.height / rs) }
  }
  const cs = (el: Element) => getComputedStyle(el as HTMLElement)
  const cleanText = (el: Element) => (el.textContent || '').replace(/\s+/g, ' ').trim()
  const ancestorDone = (el: Element) => {
    let a = el.parentElement
    while (a && a !== slideEl) {
      if (done.has(a)) return true
      a = a.parentElement
    }
    return false
  }
  const pushText = (el: Element, extra: Partial<FreeBlock> = {}) => {
    const st = cs(el)
    const b = box(el)
    const t = cleanText(el)
    if (!t || b.w < 4) return
    // Градиентный текст (крупная метрика) даёт прозрачный цвет — заменяем акцентом
    let color = rgbToHex(st.color)
    if (/rgba?\([^)]*,\s*0(\.0+)?\s*\)/.test(st.color)) color = accent
    out.push({
      id: nid(),
      type: 'text',
      x: b.x,
      y: b.y,
      w: b.w + 3,
      h: Math.max(b.h, Math.round((parseFloat(st.fontSize) || 24) * 1.4)),
      text: t,
      fontSize: Math.round(parseFloat(st.fontSize) || 24),
      color,
      weight: parseInt(st.fontWeight) || 600,
      align: st.textAlign === 'center' ? 'center' : st.textAlign === 'right' ? 'right' : 'left',
      ...extra
    } as FreeBlock)
    done.add(el)
  }
  const rectShape = (el: Element, extra: Partial<FreeBlock> = {}) => {
    const st = cs(el)
    const b = box(el)
    const bw = parseFloat(st.borderTopWidth) || 0
    const bg = st.backgroundImage && st.backgroundImage !== 'none' ? st.backgroundImage : st.backgroundColor
    out.push({ id: nid(), type: 'shape', shapeKind: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, bg, radius: Math.round(parseFloat(st.borderRadius) || 0), borderColor: bw ? rgbToHex(st.borderTopColor) : undefined, borderWidth: bw ? Math.round(bw) : undefined, ...extra } as FreeBlock)
  }

  // Изображения (пропускаем полупрозрачные фоновые оверлеи)
  slideEl.querySelectorAll('img').forEach((img) => {
    if (parseFloat(cs(img).opacity) < 0.6) return
    const b = box(img)
    const src = (img as HTMLImageElement).src
    if (src && b.w > 4) {
      out.push({ id: nid(), type: 'image', x: b.x, y: b.y, w: b.w, h: b.h, src })
      done.add(img)
    }
  })
  // Схема Mermaid → редактируемый diagram-блок
  const merm = slideEl.querySelector('.sd-mermaid')
  if (merm && s.diagram) {
    const b = box(merm)
    out.push({ id: nid(), type: 'diagram', x: b.x, y: b.y, w: b.w, h: b.h, code: s.diagram })
    done.add(merm)
    merm.querySelectorAll('*').forEach((c) => done.add(c))
  }
  // Карточки — только фон-фигура; вся начинка (заголовок, текст, метрика) станет
  // отдельными текст-боксами ниже (как в PowerPoint: каждый текст правится отдельно)
  slideEl.querySelectorAll('.sd-card').forEach((card) => {
    if (done.has(card)) return
    rectShape(card)
  })
  // Иконки-плашки (если не поглощены карточкой)
  slideEl.querySelectorAll('.sd-ico').forEach((el) => {
    if (done.has(el) || ancestorDone(el)) return
    const st = cs(el)
    const b = box(el)
    out.push({ id: nid(), type: 'shape', shapeKind: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, bg: st.backgroundColor, radius: Math.round(parseFloat(st.borderRadius) || 0), text: cleanText(el), color: '#ffffff', fontSize: Math.round(parseFloat(st.fontSize) || 28) })
    done.add(el)
  })
  // Кружки таймлайна
  slideEl.querySelectorAll('.sd-step-dot').forEach((el) => {
    if (done.has(el) || ancestorDone(el)) return
    const st = cs(el)
    const b = box(el)
    out.push({ id: nid(), type: 'shape', shapeKind: 'ellipse', x: b.x, y: b.y, w: b.w, h: b.h, bg: st.backgroundImage && st.backgroundImage !== 'none' ? st.backgroundImage : st.backgroundColor, text: cleanText(el), color: '#ffffff', fontSize: Math.round(parseFloat(st.fontSize) || 24) })
    done.add(el)
  })
  // Прогресс-бары
  slideEl.querySelectorAll('.sd-bartrack, .sd-barfill').forEach((el) => {
    if (done.has(el) || ancestorDone(el)) return
    rectShape(el)
    done.add(el)
  })
  // Маркеры списка (::before не измеряется — рисуем сами) + текст пункта
  slideEl.querySelectorAll('.sd-list li').forEach((li) => {
    if (done.has(li) || ancestorDone(li)) return
    const st = cs(li)
    const b = box(li)
    const padL = Math.round(parseFloat(st.paddingLeft) || 40)
    const lh = parseFloat(st.lineHeight) || parseFloat(st.fontSize) * 1.35 || 34
    out.push({ id: nid(), type: 'shape', shapeKind: 'rect', x: b.x + 2, y: b.y + Math.round(lh / 2 - 8), w: 16, h: 16, radius: 5, bg: accent })
    out.push({ id: nid(), type: 'text', x: b.x + padL, y: b.y, w: b.w - padL + 3, text: cleanText(li), fontSize: Math.round(parseFloat(st.fontSize) || 27), color: rgbToHex(st.color), weight: 500, align: 'left' })
    done.add(li)
    li.querySelectorAll('*').forEach((c) => done.add(c))
  })
  // Прочий текст (заголовки, подзаголовки, метрики, подписи, цитаты и т.д.)
  slideEl.querySelectorAll('.sd-kicker,.sd-title,.sd-h2,.sd-sub,.sd-quote,.sd-footer,.sd-badge,.sd-step-t,.sd-step-x,.sd-stat,.sd-statlabel,.sd-barhead span,h3,p').forEach((el) => {
    if (done.has(el) || ancestorDone(el)) return
    pushText(el)
  })

  return out.filter((b) => b.w > 0)
}

// --- Конструктор схемы (последовательность фигур со стрелками) ---
type SchemaStep = { id: string; shape: ShapeKind; text: string; color: string }
function buildSchema(steps: SchemaStep[], dir: 'h' | 'v', connect: boolean, accent: string): FreeBlock[] {
  const nid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  const n = steps.length
  if (!n) return []
  const GAP = 74
  const out: FreeBlock[] = []
  let NW: number
  let NH: number
  if (dir === 'h') {
    NW = Math.min(240, Math.max(110, Math.floor((1180 - (n - 1) * GAP) / n)))
    NH = 120
  } else {
    NH = Math.min(130, Math.max(64, Math.floor((620 - (n - 1) * GAP) / n)))
    NW = 320
  }
  const totalW = dir === 'h' ? n * NW + (n - 1) * GAP : NW
  const totalH = dir === 'v' ? n * NH + (n - 1) * GAP : NH
  const x0 = Math.round((1280 - totalW) / 2)
  const y0 = Math.round((720 - totalH) / 2)
  steps.forEach((s, i) => {
    const x = dir === 'h' ? x0 + i * (NW + GAP) : x0
    const y = dir === 'v' ? y0 + i * (NH + GAP) : y0
    out.push({ id: nid(), type: 'shape', shapeKind: s.shape, x, y, w: NW, h: NH, bg: s.color || accent, color: '#0b0e14', fontSize: 22, weight: 700, radius: 16, text: s.text })
    if (connect && i < n - 1) {
      if (dir === 'h') out.push({ id: nid(), type: 'shape', shapeKind: 'arrow', x: x + NW + 4, y: y + NH / 2 - 18, w: GAP - 8, h: 36, bg: accent })
      else out.push({ id: nid(), type: 'shape', shapeKind: 'arrow', x: x0 + NW / 2 - (GAP - 8) / 2, y: y + NH + GAP / 2 - 18, w: GAP - 8, h: 36, bg: accent, rotate: 90 })
    }
  })
  return out
}

function SchemaBuilder({ accent, onClose, onInsert }: { accent: string; onClose: () => void; onInsert: (b: FreeBlock[]) => void }) {
  const nid = () => 's' + Math.random().toString(36).slice(2, 7)
  const [dir, setDir] = useState<'h' | 'v'>('h')
  const [connect, setConnect] = useState(true)
  const [steps, setSteps] = useState<SchemaStep[]>([
    { id: nid(), shape: 'rect', text: 'Начало', color: accent },
    { id: nid(), shape: 'diamond', text: 'Условие?', color: '#f59e0b' },
    { id: nid(), shape: 'rect', text: 'Итог', color: accent }
  ])
  const shapeOpts = SHAPE_KINDS.filter((s) => s.k !== 'line' && s.k !== 'arrow')
  const setStep = (id: string, p: Partial<SchemaStep>) => setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)))
  const moveStep = (id: string, d: 'up' | 'down') =>
    setSteps((prev) => {
      const i = prev.findIndex((s) => s.id === id)
      const j = d === 'up' ? i - 1 : i + 1
      if (j < 0 || j >= prev.length) return prev
      const a = [...prev]
      ;[a[i], a[j]] = [a[j], a[i]]
      return a
    })
  const addStep = () => setSteps((prev) => [...prev, { id: nid(), shape: 'rect', text: 'Шаг', color: accent }])
  const removeStep = (id: string) => setSteps((prev) => prev.filter((s) => s.id !== id))
  return (
    <div onMouseDown={(e) => { e.stopPropagation(); onClose() }} style={{ position: 'fixed', inset: 0, zIndex: 720, background: 'rgba(5,6,9,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: 580, maxHeight: '88vh', overflow: 'auto', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 24px 70px rgba(0,0,0,0.6)' }} className="flow-scroll">
        <div style={{ font: `700 16px ${SANS}` }}>◇ Конструктор схемы</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Собери последовательность фигур (ромб / овал / квадрат…): порядок в списке = порядок в схеме. У каждой — свой текст и цвет. Потом всё можно двигать и править на слайде.</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={label}>Направление</span>
          <button style={{ ...btn, background: dir === 'h' ? 'var(--accent-dim)' : 'var(--panel2)' }} onClick={() => setDir('h')}>→ Горизонт.</button>
          <button style={{ ...btn, background: dir === 'v' ? 'var(--accent-dim)' : 'var(--panel2)' }} onClick={() => setDir('v')}>↓ Вертик.</button>
          <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, marginLeft: 'auto', cursor: 'pointer' }}>
            <input type="checkbox" checked={connect} onChange={() => setConnect(!connect)} /> связать стрелками
          </label>
        </div>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, padding: 8 }}>
            <span style={{ width: 18, color: 'var(--muted)', fontSize: 12, flex: 'none' }}>{i + 1}</span>
            <select value={s.shape} onChange={(e) => setStep(s.id, { shape: e.currentTarget.value as ShapeKind })} style={{ ...inp, width: 140, cursor: 'pointer', flex: 'none' }}>
              {shapeOpts.map((o) => (
                <option key={o.k} value={o.k}>
                  {o.icon} {o.name.split(' ')[0]}
                </option>
              ))}
            </select>
            <input style={{ ...inp, flex: 1, minWidth: 0 }} value={s.text} placeholder="текст" onChange={(e) => setStep(s.id, { text: e.currentTarget.value })} />
            <input type="color" value={s.color?.startsWith('#') ? s.color : '#4c8dff'} onChange={(e) => setStep(s.id, { color: e.currentTarget.value })} style={{ width: 28, height: 26, border: 'none', background: 'none', cursor: 'pointer', padding: 0, flex: 'none' }} />
            <button style={{ ...btn, padding: '4px 6px', flex: 'none' }} title="Выше" onClick={() => moveStep(s.id, 'up')}>▲</button>
            <button style={{ ...btn, padding: '4px 6px', flex: 'none' }} title="Ниже" onClick={() => moveStep(s.id, 'down')}>▼</button>
            <button style={{ ...btn, padding: '4px 6px', flex: 'none' }} title="Удалить" onClick={() => removeStep(s.id)}>✕</button>
          </div>
        ))}
        <button style={btn} onClick={addStep}>+ Добавить фигуру</button>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button style={btn} onClick={onClose}>Отмена</button>
          <button style={primaryBtn} onClick={() => onInsert(buildSchema(steps, dir, connect, accent))}>Вставить схему</button>
        </div>
      </div>
    </div>
  )
}

// --- Мелкие переиспользуемые контролы инспектора ---
function ColorRow({ label: lbl, value, onChange, onClear }: { label: string; value?: string; onChange: (v: string) => void; onClear?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ ...label, width: 58, flex: 'none' }}>{lbl}</span>
      <input type="color" value={value && value.startsWith('#') ? value : '#000000'} onChange={(e) => onChange(e.currentTarget.value)} style={{ width: 30, height: 26, border: 'none', background: 'none', cursor: 'pointer', padding: 0, flex: 'none' }} />
      <input style={{ ...inp, flex: 1, padding: '5px 8px', fontFamily: MONO, fontSize: 11.5 }} value={value || ''} placeholder="—" onChange={(e) => onChange(e.currentTarget.value)} />
      {onClear && (
        <button style={{ ...btn, padding: '4px 8px', flex: 'none' }} title="Убрать" onClick={onClear}>
          ✕
        </button>
      )}
    </div>
  )
}
function Num({ label: lbl, value, onChange, min, max }: { label: string; value?: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
      <span style={label}>{lbl}</span>
      <input type="number" value={Math.round(value ?? 0)} min={min} max={max} onChange={(e) => onChange(Number(e.currentTarget.value))} style={{ ...inp, padding: '5px 8px' }} />
    </label>
  )
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ font: `600 11px ${SANS}`, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</div>
      {children}
    </div>
  )
}

type ResizeMode = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
const HANDLES: { mode: ResizeMode; css: React.CSSProperties }[] = [
  { mode: 'nw', css: { left: -10, top: -10, cursor: 'nwse-resize' } },
  { mode: 'n', css: { left: '50%', top: -10, marginLeft: -10, cursor: 'ns-resize' } },
  { mode: 'ne', css: { right: -10, top: -10, cursor: 'nesw-resize' } },
  { mode: 'e', css: { right: -10, top: '50%', marginTop: -10, cursor: 'ew-resize' } },
  { mode: 'se', css: { right: -10, bottom: -10, cursor: 'nwse-resize' } },
  { mode: 's', css: { left: '50%', bottom: -10, marginLeft: -10, cursor: 'ns-resize' } },
  { mode: 'sw', css: { left: -10, bottom: -10, cursor: 'nesw-resize' } },
  { mode: 'w', css: { left: -10, top: '50%', marginTop: -10, cursor: 'ew-resize' } }
]

export default function SlideEditor({
  editor,
  slideId,
  onClose
}: {
  editor: Editor
  slideId: string
  onClose: () => void
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = editor.getShape(slideId as never)
  const [slide, setSlide] = useState<Slide>(() => parseSlide(node?.props?.body || '{}'))
  const [raw, setRaw] = useState(() => JSON.stringify(parseSlide(node?.props?.body || '{}'), null, 2))
  const [image, setImage] = useState(() => readImage(editor, slideId))
  const [sel, setSel] = useState<string[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [status, setStatus] = useState('')
  const [shapeMenu, setShapeMenu] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>(EMPTY_GUIDES)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: (VW - PREVIEW_W) / 2, y: (VH - PREVIEW_H) / 2 })
  const fileRef = useRef<HTMLInputElement>(null)
  const blockFileRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ mode: ResizeMode; sx: number; sy: number; ox: number; oy: number; ow: number; oh: number; group: { id: string; ox: number; oy: number }[]; moved: boolean } | null>(null)
  const marqueeRef = useRef<{ x0: number; y0: number; shift: boolean } | null>(null)
  const panRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null)
  const spaceRef = useRef(false)
  const zoomRef = useRef(1)
  zoomRef.current = zoom

  // ── История изменений (Undo/Redo) ──
  const slideRef = useRef(slide)
  slideRef.current = slide
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])
  const lastSnap = useRef(0)
  const snapshot = (coalesce = false) => {
    if (coalesce && drag.current) return // во время перетаскивания не плодим шаги
    const now = Date.now()
    if (coalesce && now - lastSnap.current < 500) return
    lastSnap.current = now
    undoStack.current.push(JSON.stringify(slideRef.current))
    if (undoStack.current.length > 100) undoStack.current.shift()
    redoStack.current = []
  }
  const restore = (json: string) => {
    const s = JSON.parse(json) as Slide
    setSlide(s)
    setRaw(JSON.stringify(s, null, 2))
    setSel([])
    setEditing(null)
  }
  const undo = () => {
    const prev = undoStack.current.pop()
    if (prev == null) {
      setStatus('Ctrl+Z: нечего отменять')
      return
    }
    redoStack.current.push(JSON.stringify(slideRef.current))
    restore(prev)
    setStatus('Отменено')
  }
  const redo = () => {
    const next = redoStack.current.pop()
    if (next == null) return
    undoStack.current.push(JSON.stringify(slideRef.current))
    restore(next)
    setStatus('Возвращено')
  }

  const patch = (p: Partial<Slide>) => {
    snapshot(true)
    setSlide((prev) => {
      const next = { ...prev, ...p }
      setRaw(JSON.stringify(next, null, 2))
      return next
    })
  }

  const blocks = slide.blocks || []
  const selBlock = sel.length === 1 ? blocks.find((b) => b.id === sel[0]) || null : null
  const patchBlock = (id: string, p: Partial<FreeBlock>) =>
    patch({ blocks: (slide.blocks || []).map((b) => (b.id === id ? { ...b, ...p } : b)) })

  const screenToSlide = (cx: number, cy: number) => {
    const r = canvasRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    const s = r.width / 1280 // фактический масштаб с учётом зума
    return { x: (cx - r.left) / s, y: (cy - r.top) / s }
  }
  // Зум/панорама
  const fitView = () => {
    setZoom(1)
    setPan({ x: (VW - PREVIEW_W) / 2, y: (VH - PREVIEW_H) / 2 })
  }
  const zoomToCenter = (nz: number) => {
    const cx = VW / 2
    const cy = VH / 2
    const z = zoomRef.current
    setPan((p) => ({ x: cx - ((cx - p.x) / z) * nz, y: cy - ((cy - p.y) / z) * nz }))
    setZoom(nz)
  }
  // Общий bounding box набора блоков
  const bboxOf = (items: FreeBlock[]) => {
    const minX = Math.min(...items.map((b) => b.x))
    const minY = Math.min(...items.map((b) => b.y))
    const maxX = Math.max(...items.map((b) => b.x + b.w))
    const maxY = Math.max(...items.map((b) => b.y + (b.h || hitH(b))))
    return { minX, minY, maxX, maxY }
  }
  const applyMany = (upd: Map<string, Partial<FreeBlock>>) => patch({ blocks: (slide.blocks || []).map((b) => (upd.has(b.id) ? { ...b, ...upd.get(b.id) } : b)) })

  const alignSel = (mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    const items = blocks.filter((b) => sel.includes(b.id))
    if (items.length < 2) return
    snapshot(false)
    const box = bboxOf(items)
    const upd = new Map<string, Partial<FreeBlock>>()
    for (const b of items) {
      const w = b.w
      const h = b.h || hitH(b)
      if (mode === 'left') upd.set(b.id, { x: Math.round(box.minX) })
      else if (mode === 'right') upd.set(b.id, { x: Math.round(box.maxX - w) })
      else if (mode === 'hcenter') upd.set(b.id, { x: Math.round((box.minX + box.maxX) / 2 - w / 2) })
      else if (mode === 'top') upd.set(b.id, { y: Math.round(box.minY) })
      else if (mode === 'bottom') upd.set(b.id, { y: Math.round(box.maxY - h) })
      else if (mode === 'vcenter') upd.set(b.id, { y: Math.round((box.minY + box.maxY) / 2 - h / 2) })
    }
    applyMany(upd)
  }
  const distributeSel = (axis: 'h' | 'v') => {
    const items = blocks.filter((b) => sel.includes(b.id))
    if (items.length < 3) return
    snapshot(false)
    const sorted = [...items].sort((a, b) => (axis === 'h' ? a.x - b.x : a.y - b.y))
    const first = axis === 'h' ? sorted[0].x : sorted[0].y
    const last = axis === 'h' ? sorted[sorted.length - 1].x : sorted[sorted.length - 1].y
    const gap = (last - first) / (sorted.length - 1)
    const upd = new Map<string, Partial<FreeBlock>>()
    sorted.forEach((b, i) => upd.set(b.id, axis === 'h' ? { x: Math.round(first + gap * i) } : { y: Math.round(first + gap * i) }))
    applyMany(upd)
  }

  // Слои
  const moveLayer = (id: string, dir: 'up' | 'down') => {
    snapshot(false)
    const arr = [...(slide.blocks || [])]
    const i = arr.findIndex((b) => b.id === id)
    if (i < 0) return
    const j = dir === 'up' ? i + 1 : i - 1 // «выше» = позже в массиве = выше по z
    if (j < 0 || j >= arr.length) return
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
    patch({ blocks: arr })
  }
  const toggleFlag = (id: string, key: 'hidden' | 'locked') => {
    snapshot(false)
    patch({ blocks: (slide.blocks || []).map((b) => (b.id === id ? { ...b, [key]: !b[key] } : b)) })
    if (key === 'hidden') setSel((prev) => prev.filter((x) => x !== id))
  }
  const renameLayer = (id: string, name: string) => patch({ blocks: (slide.blocks || []).map((b) => (b.id === id ? { ...b, name: name.trim() || undefined } : b)) })

  // Расширить набор id до полных групп (объекты с общим groupId)
  const withGroups = (ids: string[]): string[] => {
    const all = slideRef.current.blocks || []
    const gids = new Set(all.filter((b) => ids.includes(b.id) && b.groupId).map((b) => b.groupId))
    if (!gids.size) return ids
    const out = new Set(ids)
    for (const b of all) if (b.groupId && gids.has(b.groupId)) out.add(b.id)
    return [...out]
  }
  const selectLayer = (id: string, shift: boolean) => {
    const grp = withGroups([id])
    setSel((prev) => {
      if (!shift) return grp
      const has = grp.every((g) => prev.includes(g))
      return has ? prev.filter((x) => !grp.includes(x)) : [...new Set([...prev, ...grp])]
    })
  }

  // Группировка
  const groupSel = () => {
    if (sel.length < 2) return
    snapshot(false)
    const gid = 'g' + newId()
    const s = new Set(sel)
    patch({ blocks: (slide.blocks || []).map((b) => (s.has(b.id) ? { ...b, groupId: gid } : b)) })
    setStatus('Сгруппировано')
  }
  const ungroupSel = () => {
    if (!sel.length) return
    snapshot(false)
    const s = new Set(sel)
    patch({ blocks: (slide.blocks || []).map((b) => (s.has(b.id) ? { ...b, groupId: undefined } : b)) })
    setStatus('Разгруппировано')
  }

  // Копирование / вставка (в т.ч. между слайдами через модульный буфер)
  const copySel = () => {
    if (!sel.length) {
      setStatus('Ctrl+C: ничего не выделено')
      return
    }
    const s = new Set(sel)
    CLIPBOARD = (slide.blocks || []).filter((b) => s.has(b.id)).map((b) => ({ ...b }))
    setStatus(`Скопировано: ${CLIPBOARD.length}`)
  }
  const paste = () => {
    if (!CLIPBOARD.length) {
      setStatus('Ctrl+V: буфер пуст')
      return
    }
    snapshot(false)
    const gidMap = new Map<string, string>()
    const copies = CLIPBOARD.map((b) => {
      let groupId = b.groupId
      if (groupId) {
        if (!gidMap.has(groupId)) gidMap.set(groupId, 'g' + newId())
        groupId = gidMap.get(groupId)
      }
      return { ...b, id: newId(), x: b.x + 24, y: b.y + 24, groupId } as FreeBlock
    })
    patch({ blocks: [...(slide.blocks || []), ...copies] })
    setSel(copies.map((c) => c.id))
    setStatus(`Вставлено: ${copies.length}`)
  }
  const cutSel = () => {
    copySel()
    removeSelected()
  }

  const addBlock = (b: Omit<FreeBlock, 'id'>) => {
    snapshot(false)
    const nb = { ...b, id: newId() } as FreeBlock
    patch({ blocks: [...(slide.blocks || []), nb] })
    setSel([nb.id])
    setStatus(`Добавлен: ${BLOCK_RU[nb.type]}`)
  }
  const removeSelected = () => {
    if (!sel.length) return
    snapshot(false)
    const s = new Set(sel)
    patch({ blocks: (slide.blocks || []).filter((b) => !s.has(b.id)) })
    setSel([])
  }
  const duplicateSelected = () => {
    if (!sel.length) return
    snapshot(false)
    const s = new Set(sel)
    const copies: FreeBlock[] = (slide.blocks || []).filter((b) => s.has(b.id)).map((b) => ({ ...b, id: newId(), x: b.x + 24, y: b.y + 24 }))
    patch({ blocks: [...(slide.blocks || []), ...copies] })
    setSel(copies.map((c) => c.id))
  }
  const reorderSel = (dir: 'front' | 'back') => {
    if (!sel.length) return
    snapshot(false)
    const s = new Set(sel)
    const rest = (slide.blocks || []).filter((b) => !s.has(b.id))
    const picked = (slide.blocks || []).filter((b) => s.has(b.id))
    patch({ blocks: dir === 'front' ? [...rest, ...picked] : [...picked, ...rest] })
  }
  const addText = () => addBlock({ type: 'text', x: 160, y: 160, w: 560, text: 'Новый текст', fontSize: 44, weight: 700, color: '#eef1f6', align: 'left' })
  const addShapeKind = (k: ShapeKind) => {
    const linear = k === 'line' || k === 'arrow'
    addBlock({ type: 'shape', shapeKind: k, x: 220, y: 200, w: linear ? 340 : 260, h: linear ? 60 : 160, bg: slide.accent || '#4c8dff', color: '#0b0e14', fontSize: 24, weight: 700, radius: 16, text: linear ? undefined : 'Текст' })
    setShapeMenu(false)
  }
  const addDiagram = () => addBlock({ type: 'diagram', x: 120, y: 200, w: 700, h: 320, code: 'flowchart LR\n  A[Идея] --> B[MVP] --> C[Запуск]' })
  const insertSchema = (built: FreeBlock[]) => {
    setSchemaOpen(false)
    if (!built.length) return
    snapshot(false)
    patch({ blocks: [...(slide.blocks || []), ...built] })
    setSel(built.map((b) => b.id))
    setStatus(`Схема вставлена: ${built.length} элементов`)
  }
  const addStat = () => addBlock({ type: 'stat', x: 170, y: 240, w: 340, h: 190, value: '80%', statLabel: 'ключевая метрика' })
  const addCard = () => addBlock({ type: 'card', x: 170, y: 220, w: 420, h: 220, icon: '📦', heading: 'Преимущество', cardText: 'краткое описание' })
  const addImage = (src: string) => addBlock({ type: 'image', x: 180, y: 180, w: 520, h: 340, src })

  const explode = () => {
    if (slide.layout === 'blank') {
      setStatus('Слайд уже в свободном режиме')
      return
    }
    snapshot(false)
    // Точный разбор по реальному рендеру; если не удалось — эвристический запасной
    const slideEl = canvasRef.current?.querySelector('.sd-slide') as HTMLElement | null
    let gen: FreeBlock[] = []
    try {
      if (slideEl) gen = measureExplode(slideEl, slide)
    } catch {
      gen = []
    }
    if (!gen.length) gen = explodeToBlocks(slide, image)
    if (!gen.length) {
      setStatus('Нет содержимого для разбора')
      return
    }
    patch({ layout: 'blank', blocks: [...(slide.blocks || []), ...gen] })
    setSel([])
    setStatus(`Разобрано на ${gen.length} элементов`)
  }

  // Перетаскивание и масштабирование блоков
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Панорама холста
      if (panRef.current) {
        setPan({ x: panRef.current.px + (e.clientX - panRef.current.sx), y: panRef.current.py + (e.clientY - panRef.current.sy) })
        return
      }
      // Рамка выделения (marquee)
      if (marqueeRef.current) {
        const p = screenToSlide(e.clientX, e.clientY)
        setMarquee({ x0: marqueeRef.current.x0, y0: marqueeRef.current.y0, x1: p.x, y1: p.y })
        return
      }
      const d = drag.current
      if (!d) return
      d.moved = true
      const ds = SCALE * (zoomRef.current || 1)
      const dx = (e.clientX - d.sx) / ds
      const dy = (e.clientY - d.sy) / ds
      if (d.mode === 'move') {
        let rx = d.ox + dx
        let ry = d.oy + dy
        if (e.ctrlKey || e.metaKey) {
          setGuides(EMPTY_GUIDES)
        } else {
          const exclude = new Set(d.group.map((g) => g.id))
          const s = computeSnap(slide.blocks || [], exclude, rx, ry, d.ow, d.oh, SNAP)
          rx = s.x
          ry = s.y
          setGuides({ x: s.gx, y: s.gy })
        }
        // дельта считается по «ведущему» блоку, применяется ко всей группе
        const ddx = Math.round(rx - d.ox)
        const ddy = Math.round(ry - d.oy)
        const gmap = new Map(d.group.map((g) => [g.id, g]))
        patch({ blocks: (slide.blocks || []).map((b) => (gmap.has(b.id) ? { ...b, x: Math.round(gmap.get(b.id)!.ox + ddx), y: Math.round(gmap.get(b.id)!.oy + ddy) } : b)) })
        return
      }
      let nx = d.ox
      let ny = d.oy
      let nw = d.ow
      let nh = d.oh
      if (d.mode.includes('e')) nw = d.ow + dx
      if (d.mode.includes('s')) nh = d.oh + dy
      if (d.mode.includes('w')) {
        nw = d.ow - dx
        nx = d.ox + dx
      }
      if (d.mode.includes('n')) {
        nh = d.oh - dy
        ny = d.oy + dy
      }
      if (nw < 40) {
        if (d.mode.includes('w')) nx = d.ox + (d.ow - 40)
        nw = 40
      }
      if (nh < 30) {
        if (d.mode.includes('n')) ny = d.oy + (d.oh - 30)
        nh = 30
      }
      if (d.group[0]) patchBlock(d.group[0].id, { x: Math.round(nx), y: Math.round(ny), w: Math.round(nw), h: Math.round(nh) })
    }
    const onUp = () => {
      // Завершение рамки выделения
      if (marqueeRef.current) {
        const withShift = marqueeRef.current.shift
        const m = marquee
        marqueeRef.current = null
        setMarquee(null)
        if (m) {
          const x1 = Math.min(m.x0, m.x1)
          const x2 = Math.max(m.x0, m.x1)
          const y1 = Math.min(m.y0, m.y1)
          const y2 = Math.max(m.y0, m.y1)
          if (x2 - x1 > 4 || y2 - y1 > 4) {
            const hit = (slide.blocks || [])
              .filter((b) => {
                if (b.hidden || b.locked) return false
                const bh = b.h || hitH(b)
                return b.x < x2 && b.x + b.w > x1 && b.y < y2 && b.y + bh > y1
              })
              .map((b) => b.id)
            setSel((prev) => (withShift ? [...new Set([...prev, ...hit])] : hit))
          }
        }
      }
      drag.current = null
      panRef.current = null
      setGuides(EMPTY_GUIDES)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slide.blocks, marquee])

  // Пробел зажат → режим панорамы (курсор-рука)
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        spaceRef.current = true
        if (viewportRef.current) viewportRef.current.style.cursor = 'grab'
      }
    }
    const ku = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceRef.current = false
        if (viewportRef.current) viewportRef.current.style.cursor = ''
      }
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  // Зум колесом (Ctrl/⌘ + колесо — к курсору), простое колесо — панорама
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect()
        const cx = e.clientX - r.left
        const cy = e.clientY - r.top
        const z = zoomRef.current
        const nz = clampZoom(z * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
        setPan((p) => ({ x: cx - ((cx - p.x) / z) * nz, y: cy - ((cy - p.y) / z) * nz }))
        setZoom(nz)
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const startDrag = (e: React.MouseEvent, b: FreeBlock) => {
    e.stopPropagation()
    // Shift+клик — добавить/убрать группу объекта из выделения (без перетаскивания)
    if (e.shiftKey) {
      const grp = withGroups([b.id])
      setSel((prev) => {
        const has = grp.every((g) => prev.includes(g))
        return has ? prev.filter((x) => !grp.includes(x)) : [...new Set([...prev, ...grp])]
      })
      return
    }
    // Набор для перемещения: если тянем один из уже выделенных — двигаем всё; иначе группу объекта
    const alreadyMulti = sel.includes(b.id) && sel.length > 1
    const baseIds = alreadyMulti ? sel : withGroups([b.id])
    if (!alreadyMulti) setSel(baseIds)
    snapshot(false)
    const group = baseIds.map((id) => {
      const bl = blocks.find((x) => x.id === id)!
      return { id, ox: bl.x, oy: bl.y }
    })
    drag.current = { mode: 'move', sx: e.clientX, sy: e.clientY, ox: b.x, oy: b.y, ow: b.w, oh: hitH(b), group, moved: false }
  }
  const startResize = (e: React.MouseEvent, b: FreeBlock, mode: ResizeMode) => {
    e.stopPropagation()
    setSel([b.id])
    snapshot(false)
    drag.current = { mode, sx: e.clientX, sy: e.clientY, ox: b.x, oy: b.y, ow: b.w, oh: b.h || hitH(b), group: [{ id: b.id, ox: b.x, oy: b.y }], moved: false }
  }

  const applyRaw = () => {
    try {
      const s = JSON.parse(raw)
      snapshot(false)
      setSlide(s)
      setStatus('JSON применён')
    } catch {
      setStatus('Ошибка JSON')
    }
  }

  const applyImageToNode = (dataUrl: string) => {
    setImage(dataUrl)
    let ex = {}
    try {
      ex = JSON.parse(node?.props?.extra || '{}')
    } catch {
      /* ignore */
    }
    setNode(editor, slideId, { extra: JSON.stringify({ ...ex, image: dataUrl }) })
  }

  // asObject=true → вставить сгенерированное фото как отдельный двигаемый объект
  const genImage = async (asObject = false) => {
    if (imgBusy) return
    setImgBusy(true)
    setStatus('🎨 Рисую фото…')
    try {
      const models = await window.flow.comfyModels()
      const flux = models.ok ? models.unets.find((u) => /flux/i.test(u)) : undefined
      if (!flux) {
        setStatus('FLUX не найден — запусти ComfyUI')
        return
      }
      const rawPrompt = slide.imagePrompt || slide.title || 'abstract background'
      if (/[а-яё]/i.test(rawPrompt)) setStatus('🌐 Перевожу промпт…')
      const prompt = await toEnglishPrompt(rawPrompt)
      setStatus('🎨 Рисую фото…')
      const r = await window.flow.comfyGenerate({ checkpoint: flux, prompt, negative: '', width: 1216, height: 832, steps: 20, modelType: 'flux' })
      if (r.ok) {
        if (asObject) {
          addImage(r.image)
          setStatus('Фото добавлено на слайд как объект ✅')
        } else {
          applyImageToNode(r.image)
          setStatus('Готово ✅')
        }
      } else setStatus(r.error)
    } catch (e) {
      setStatus(String(e))
    } finally {
      setImgBusy(false)
    }
  }

  const aiRefine = async () => {
    if (!aiPrompt.trim() || aiBusy) return
    setAiBusy(true)
    setStatus('🤖 Дорабатываю слайд…')
    try {
      const sys =
        'Ты дорабатываешь ОДИН слайд презентации. На вход — текущий JSON слайда и правка. ' +
        'Верни СТРОГО обновлённый JSON слайда (та же схема: layout, title, subtitle, kicker, bullets, cards, ' +
        'stats, steps, columns, bars, diagram, quote, author, imagePrompt, accent, accent2, bg, blocks). ' +
        'blocks — свободные элементы [{id,type:text|image|diagram|stat|card|shape,x,y,w,h,...}]. Без markdown — только JSON.'
      const res = await window.flow.aiChat({ model: '', messages: [{ role: 'system', content: sys }, { role: 'user', content: `Текущий слайд:\n${JSON.stringify(slide)}\n\nПравка: ${aiPrompt}` }] })
      if (!res.ok) {
        setStatus(res.error)
        return
      }
      const m = res.content.match(/\{[\s\S]*\}/)
      if (!m) {
        setStatus('ИИ вернул не JSON')
        return
      }
      const s = JSON.parse(m[0])
      if (s && s.layout) {
        snapshot(false)
        setSlide(s)
        setRaw(JSON.stringify(s, null, 2))
        setStatus('Слайд обновлён ✅')
        setAiPrompt('')
      } else setStatus('Некорректный слайд')
    } catch (e) {
      setStatus(String(e))
    } finally {
      setAiBusy(false)
    }
  }

  const save = () => {
    setNode(editor, slideId, { body: JSON.stringify(slide) })
    onClose()
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // «Печатание» — только если фокус в поле ВНУТРИ нашей модалки.
      // (tldraw держит свой скрытый input в фокусе — его не считаем.)
      const ae = document.activeElement
      const typing = !!ae && ['INPUT', 'TEXTAREA'].includes(ae.tagName) && !!rootRef.current?.contains(ae)
      const mod = e.ctrlKey || e.metaKey
      // Физический код клавиши — НЕ зависит от раскладки (рус/англ). Именно из-за
      // сравнения по e.key (кириллица «с» ≠ латинская «c») сочетания не работали.
      const code = e.code
      const stop = () => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
      }
      if (e.key === 'Escape') {
        stop()
        if (editing) setEditing(null)
        else if (sel.length) setSel([])
        else onClose()
        return
      }
      // В полях ввода — обычное поведение (в т.ч. родной Ctrl+C/V/Z для текста)
      if (typing) return
      if (mod && code === 'KeyZ') {
        stop()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && code === 'KeyY') {
        stop()
        redo()
        return
      }
      if (mod && code === 'KeyA') {
        stop()
        setSel((slideRef.current.blocks || []).filter((b) => !b.hidden && !b.locked).map((b) => b.id))
        return
      }
      if (mod && code === 'Equal') {
        stop()
        zoomToCenter(clampZoom(zoomRef.current * 1.2))
        return
      }
      if (mod && code === 'Minus') {
        stop()
        zoomToCenter(clampZoom(zoomRef.current / 1.2))
        return
      }
      if (e.shiftKey && code === 'Digit1') {
        stop()
        fitView()
        return
      }
      if (e.shiftKey && code === 'Digit0') {
        stop()
        zoomToCenter(1 / SCALE)
        return
      }
      if (mod && code === 'KeyG') {
        stop()
        if (e.shiftKey) ungroupSel()
        else groupSel()
        return
      }
      if (mod && code === 'KeyC') {
        stop()
        copySel()
        return
      }
      if (mod && code === 'KeyV') {
        stop()
        paste()
        return
      }
      if (mod && code === 'KeyX') {
        stop()
        cutSel()
        return
      }
      if (mod && code === 'KeyD') {
        stop()
        if (sel.length) duplicateSelected()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) {
        stop()
        removeSelected()
        return
      }
    }
    window.addEventListener('keydown', h, true) // capture — раньше обработчиков tldraw
    return () => window.removeEventListener('keydown', h, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, sel, editing, slide.blocks])

  // Пока открыт редактор — снимаем фокус с tldraw, чтобы он не перехватывал клавиши
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ed = editor as any
      ed.blur?.()
      ed.updateInstanceState?.({ isFocused: false })
    } catch {
      /* ignore */
    }
    // Переводим фокус в модалку (уводим его с холста tldraw)
    rootRef.current?.focus()
    return () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(editor as any).focus?.()
      } catch {
        /* ignore */
      }
    }
  }, [editor])

  // Кнопка панели инструментов «добавить»
  const tool = (icon: string, text: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px solid var(--border)', borderRadius: 9, padding: '7px 10px', background: 'var(--panel2)', color: 'var(--text)', cursor: 'pointer', fontSize: 10, minWidth: 52 }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      {text}
    </button>
  )

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onMouseDown={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(5,6,9,0.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, outline: 'none' }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', maxWidth: '97vw', maxHeight: '96vh', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 24px 70px rgba(0,0,0,0.6)', color: 'var(--text)', overflow: 'hidden' }}
      >
        {/* ── Панель инструментов ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--panel2)', flexWrap: 'wrap' }}>
          <div style={{ font: `700 14px ${SANS}`, marginRight: 4 }}>✏️ Слайд</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {tool('🔤', 'Текст', addText)}
            <div style={{ position: 'relative' }}>
              {tool('⬛', 'Фигура', () => setShapeMenu((v) => !v))}
              {shapeMenu && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 30, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 10, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, width: 230, boxShadow: '0 14px 34px rgba(0,0,0,0.55)' }}
                >
                  {SHAPE_KINDS.map((s) => (
                    <button key={s.k} title={s.name} onClick={() => addShapeKind(s.k)} style={{ ...btn, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '9px 4px', fontSize: 9.5 }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {tool('🖼', 'Фото', () => blockFileRef.current?.click())}
            {tool('◇', 'Схема', () => setSchemaOpen(true))}
            {tool('📊', 'Метрика', addStat)}
            {tool('🗂', 'Карточка', addCard)}
          </div>
          <div style={{ width: 1, height: 34, background: 'var(--border)', margin: '0 4px' }} />
          {/* Фон слайда прямо в тулбаре */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={label}>Фон</span>
            <input type="color" title="Цвет фона слайда" value={(slide.bg || '#0e1116').startsWith('#') ? slide.bg : '#0e1116'} onChange={(e) => patch({ bg: e.currentTarget.value })} style={{ width: 28, height: 26, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            {BG_PRESETS.map((p) => (
              <button key={p.name} title={p.name} onClick={() => patch({ bg: p.bg })} style={{ width: 22, height: 22, borderRadius: 6, cursor: 'pointer', background: p.bg, border: slide.bg === p.bg ? '2px solid var(--text)' : '1px solid var(--border)' }} />
            ))}
          </div>
          {slide.layout !== 'blank' && (
            <button onClick={explode} title="Разложить макет на отдельные редактируемые элементы" style={{ ...btn, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', marginLeft: 6 }}>
              🧩 Разобрать
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button style={{ ...btn, padding: '7px 10px' }} title="Отменить (Ctrl+Z)" onClick={undo}>↶</button>
          <button style={{ ...btn, padding: '7px 10px' }} title="Повторить (Ctrl+Shift+Z)" onClick={redo}>↷</button>
          <button style={primaryBtn} onClick={save}>Сохранить</button>
          <button style={{ ...btn, padding: '7px 11px' }} onClick={onClose}>✕</button>
          <input
            ref={blockFileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const r = new FileReader()
              r.onload = () => addImage(String(r.result))
              r.readAsDataURL(f)
              e.currentTarget.value = ''
            }}
          />
        </div>

        {/* ── Тело: слои + холст + инспектор ── */}
        <div style={{ display: 'flex', gap: 0, minHeight: 0 }}>
          {/* Панель слоёв */}
          <LayersPanel blocks={blocks} sel={sel} renaming={renaming} setRenaming={setRenaming} onSelect={selectLayer} onMove={moveLayer} onToggle={toggleFlag} onRename={renameLayer} />
          {/* Холст */}
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bg)' }}>
            <div
              ref={viewportRef}
              onMouseDown={(e) => {
                if (spaceRef.current || e.button === 1) {
                  e.preventDefault()
                  panRef.current = { sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y }
                }
              }}
              style={{ width: VW, height: VH, position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', flex: 'none', background: 'var(--bg)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)' }}
            >
              <div
                ref={canvasRef}
                onMouseDown={(e) => {
                  if (spaceRef.current || e.button === 1) return
                  setEditing(null)
                  setShapeMenu(false)
                  if (!e.shiftKey) setSel([])
                  const p = screenToSlide(e.clientX, e.clientY)
                  marqueeRef.current = { x0: p.x, y0: p.y, shift: e.shiftKey }
                  setMarquee({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
                }}
                onDoubleClick={() => {
                  // Двойной клик по «умному» (неразобранному) слайду делает его редактируемым
                  if (slide.layout !== 'blank') explode()
                }}
                style={{ position: 'absolute', left: 0, top: 0, width: PREVIEW_W, height: PREVIEW_H, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', userSelect: 'none' }}
              >
                <ScaledSlide slide={slide} image={image} width={PREVIEW_W} />
              {/* Слой хендлов (масштабируется целиком) */}
              <div style={{ position: 'absolute', inset: 0, width: 1280, height: 720, transform: `scale(${SCALE})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
                {blocks.map((b) => {
                  if (b.hidden) return null
                  const locked = !!b.locked
                  const active = sel.includes(b.id)
                  const only = active && sel.length === 1 && !locked
                  // Поле, которое редактируется двойным кликом прямо на слайде
                  const editField: keyof FreeBlock | null =
                    b.type === 'text' || b.type === 'shape' ? 'text' : b.type === 'card' ? (b.cardText ? 'cardText' : 'heading') : b.type === 'stat' ? 'value' : null
                  const canText = editField !== null
                  const isEditing = editing === b.id && canText
                  const centerText = b.type === 'shape' || b.type === 'stat'
                  return (
                    <div
                      key={b.id}
                      onMouseDown={(e) => {
                        if (locked || isEditing) return
                        startDrag(e, b)
                      }}
                      onDoubleClick={(e) => {
                        if (locked) return
                        e.stopPropagation()
                        if (canText) setEditing(b.id)
                      }}
                      style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: hitH(b), pointerEvents: locked ? 'none' : 'all', cursor: isEditing ? 'text' : 'move', borderRadius: 4, outline: active ? '2px solid var(--accent)' : '1.5px dashed rgba(255,255,255,0.28)', outlineOffset: 1 }}
                      title={canText ? 'Двойной клик — редактировать текст' : BLOCK_RU[b.type]}
                    >
                      {isEditing && editField && (
                        <textarea
                          autoFocus
                          value={(b[editField] as string) || ''}
                          onMouseDown={(e) => e.stopPropagation()}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => patchBlock(b.id, { [editField]: e.currentTarget.value })}
                          onBlur={() => setEditing(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setEditing(null)
                            e.stopPropagation()
                          }}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', resize: 'none', border: '1px solid var(--accent)', outline: 'none', boxSizing: 'border-box', background: 'rgba(10,12,18,0.55)', color: b.type === 'text' ? b.color || '#eef1f6' : '#ffffff', fontSize: b.fontSize || 30, fontWeight: b.weight || 600, fontStyle: b.italic ? 'italic' : 'normal', textAlign: centerText ? 'center' : b.align || 'left', lineHeight: 1.3, fontFamily: SANS, padding: 0, overflow: 'hidden' }}
                        />
                      )}
                      {only && !isEditing &&
                        HANDLES.map((hd) => (
                          <div
                            key={hd.mode}
                            onMouseDown={(e) => startResize(e, b, hd.mode)}
                            style={{ position: 'absolute', width: 18, height: 18, background: 'var(--accent)', border: '3px solid #fff', borderRadius: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.5)', pointerEvents: 'all', ...hd.css }}
                          />
                        ))}
                    </div>
                  )
                })}
                {/* Рамка выделения (marquee) */}
                {marquee && (
                  <div
                    style={{
                      position: 'absolute',
                      left: Math.min(marquee.x0, marquee.x1),
                      top: Math.min(marquee.y0, marquee.y1),
                      width: Math.abs(marquee.x1 - marquee.x0),
                      height: Math.abs(marquee.y1 - marquee.y0),
                      background: 'rgba(34,211,238,0.12)',
                      border: '1.5px solid var(--accent)',
                      pointerEvents: 'none'
                    }}
                  />
                )}
                {/* Умные направляющие (прилипание) */}
                {guides.x.map((gx, i) => (
                  <div key={'gx' + i} style={{ position: 'absolute', left: gx, top: 0, width: 2, height: 720, marginLeft: -1, background: '#f5427e', pointerEvents: 'none' }} />
                ))}
                {guides.y.map((gy, i) => (
                  <div key={'gy' + i} style={{ position: 'absolute', top: gy, left: 0, height: 2, width: 1280, marginTop: -1, background: '#f5427e', pointerEvents: 'none' }} />
                ))}
              </div>
              </div>
              {/* Подсказка на неразобранном слайде */}
              {slide.layout !== 'blank' && (
                <div
                  onMouseDown={(e) => { e.stopPropagation(); explode() }}
                  style={{ position: 'absolute', left: '50%', top: 10, transform: 'translateX(-50%)', background: 'var(--accent)', color: 'var(--bg)', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 999, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}
                  title="Сделать все элементы редактируемыми"
                >
                  ✏️ Двойной клик по слайду — сделать редактируемым
                </div>
              )}
              {/* Контролы масштаба */}
              <div style={{ position: 'absolute', right: 10, bottom: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, padding: '3px 5px', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
                <button style={{ ...btn, padding: '2px 8px' }} title="Отдалить (Ctrl −)" onClick={() => zoomToCenter(clampZoom(zoom / 1.2))}>−</button>
                <button style={{ ...btn, padding: '2px 6px', minWidth: 48 }} title="Сбросить (100%)" onClick={() => zoomToCenter(1 / SCALE)}>{Math.round(SCALE * zoom * 100)}%</button>
                <button style={{ ...btn, padding: '2px 8px' }} title="Приблизить (Ctrl +)" onClick={() => zoomToCenter(clampZoom(zoom * 1.2))}>+</button>
                <button style={{ ...btn, padding: '2px 8px' }} title="Вписать (Shift 1)" onClick={fitView}>⤢</button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 12 }}>
              <span>🖱 тащи — двигать</span>
              <span>◻ уголки — размер</span>
              <span>2× клик — текст</span>
              <span>Del — удалить</span>
              <span>Ctrl+D — дубль</span>
              <span>Ctrl+Z — отмена</span>
              <span>Ctrl+колесо — зум</span>
              <span>Пробел+тащи — панорама</span>
              {status && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>{status}</span>}
            </div>
          </div>

          {/* Инспектор */}
          <div className="flow-scroll" style={{ width: 320, flex: 'none', overflow: 'auto', padding: '4px 16px 16px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
            {sel.length >= 2 ? (
              <AlignPanel count={sel.length} align={alignSel} distribute={distributeSel} onGroupAction={reorderSel} onDelete={removeSelected} onDuplicate={duplicateSelected} onGroup={groupSel} onUngroup={ungroupSel} />
            ) : selBlock ? (
              <BlockInspector
                b={selBlock}
                patch={(p) => patchBlock(selBlock.id, p)}
                onDelete={removeSelected}
                onDuplicate={duplicateSelected}
                onReorder={reorderSel}
                onReplaceImage={() => fileRef.current?.click()}
              />
            ) : (
              <SlideInspector
                slide={slide}
                patch={patch}
                layouts={LAYOUTS}
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiBusy={aiBusy}
                aiRefine={aiRefine}
                image={image}
                imgBusy={imgBusy}
                genImage={genImage}
                onAddImageObject={() => image && addImage(image)}
                onPickImage={() => fileRef.current?.click()}
                onClearImage={() => applyImageToNode('')}
                raw={raw}
                setRaw={setRaw}
                applyRaw={applyRaw}
              />
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const r = new FileReader()
                r.onload = () => {
                  if (selBlock && selBlock.type === 'image') patchBlock(selBlock.id, { src: String(r.result) })
                  else applyImageToNode(String(r.result))
                }
                r.readAsDataURL(f)
                e.currentTarget.value = ''
              }}
            />
          </div>
        </div>
      </div>
      {schemaOpen && <SchemaBuilder accent={slide.accent || '#4c8dff'} onClose={() => setSchemaOpen(false)} onInsert={insertSchema} />}
    </div>
  )
}

// ── Инспектор выбранного объекта ──
function BlockInspector({
  b,
  patch,
  onDelete,
  onDuplicate,
  onReorder,
  onReplaceImage
}: {
  b: FreeBlock
  patch: (p: Partial<FreeBlock>) => void
  onDelete: () => void
  onDuplicate: () => void
  onReorder: (d: 'front' | 'back') => void
  onReplaceImage: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0 4px' }}>
        <div style={{ font: `700 14px ${SANS}`, flex: 1 }}>{BLOCK_RU[b.type]}</div>
        <button style={{ ...btn, padding: '4px 8px' }} title="На передний план" onClick={() => onReorder('front')}>⤒</button>
        <button style={{ ...btn, padding: '4px 8px', marginLeft: 4 }} title="На задний план" onClick={() => onReorder('back')}>⤓</button>
        <button style={{ ...btn, padding: '4px 8px', marginLeft: 4 }} title="Дублировать" onClick={onDuplicate}>⧉</button>
        <button style={{ ...btn, padding: '4px 8px', marginLeft: 4 }} title="Удалить" onClick={onDelete}>🗑</button>
      </div>

      {/* Контент по типу */}
      {b.type === 'text' && (
        <Section title="Текст">
          <textarea style={{ ...inp, minHeight: 60, resize: 'vertical' }} value={b.text || ''} onChange={(e) => patch({ text: e.currentTarget.value })} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={label}>Кегль</span>
            <input type="range" min={12} max={160} value={b.fontSize || 30} onChange={(e) => patch({ fontSize: Number(e.currentTarget.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ font: `400 11px ${MONO}`, color: 'var(--muted)', width: 26 }}>{b.fontSize || 30}</span>
          </div>
          <ColorRow label="Цвет" value={b.color || '#eef1f6'} onChange={(v) => patch({ color: v })} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...btn, flex: 'none', fontWeight: 800, background: (b.weight || 600) >= 700 ? 'var(--accent-dim)' : 'var(--panel2)' }} onClick={() => patch({ weight: (b.weight || 600) >= 700 ? 400 : 800 })}>B</button>
            <button style={{ ...btn, flex: 'none', fontStyle: 'italic', background: b.italic ? 'var(--accent-dim)' : 'var(--panel2)' }} onClick={() => patch({ italic: !b.italic })}>I</button>
            {(['left', 'center', 'right'] as const).map((a) => (
              <button key={a} style={{ ...btn, flex: 1, background: (b.align || 'left') === a ? 'var(--accent-dim)' : 'var(--panel2)' }} onClick={() => patch({ align: a })}>
                {a === 'left' ? '⯇' : a === 'center' ? '≡' : '⯈'}
              </button>
            ))}
          </div>
        </Section>
      )}
      {b.type === 'diagram' && (
        <Section title="Код схемы (Mermaid)">
          <textarea style={{ ...inp, minHeight: 90, resize: 'vertical', fontFamily: MONO, fontSize: 12 }} value={b.code || ''} onChange={(e) => patch({ code: e.currentTarget.value })} placeholder={'flowchart LR\n  A --> B'} />
        </Section>
      )}
      {b.type === 'stat' && (
        <Section title="Метрика">
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...inp, width: 120 }} value={b.value || ''} placeholder="80%" onChange={(e) => patch({ value: e.currentTarget.value })} />
            <input style={{ ...inp, flex: 1 }} value={b.statLabel || ''} placeholder="подпись" onChange={(e) => patch({ statLabel: e.currentTarget.value })} />
          </div>
          <ColorRow label="Цифра" value={b.color} onChange={(v) => patch({ color: v })} onClear={() => patch({ color: undefined })} />
        </Section>
      )}
      {b.type === 'card' && (
        <Section title="Карточка">
          <span style={label}>Значок</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <input style={{ ...inp, width: 56, textAlign: 'center' }} value={b.icon || ''} placeholder="—" onChange={(e) => patch({ icon: e.currentTarget.value })} />
            <button style={{ ...btn, flex: 'none' }} title="Убрать значок" onClick={() => patch({ icon: undefined })}>✕ значок</button>
          </div>
          <span style={label}>Заголовок</span>
          <input style={inp} value={b.heading || ''} placeholder="Заголовок" onChange={(e) => patch({ heading: e.currentTarget.value })} />
          <span style={label}>Текст (тело) — Enter для новой строки</span>
          <textarea style={{ ...inp, minHeight: 96, resize: 'vertical' }} value={b.cardText || ''} placeholder="Текст карточки…" onChange={(e) => patch({ cardText: e.currentTarget.value })} />
          <ColorRow label="Заголовок" value={b.color} onChange={(v) => patch({ color: v })} onClear={() => patch({ color: undefined })} />
        </Section>
      )}
      {b.type === 'image' && (
        <Section title="Изображение">
          <button style={{ ...btn, width: '100%' }} onClick={onReplaceImage}>📁 Заменить изображение</button>
        </Section>
      )}
      {b.type === 'shape' && (
        <Section title="Фигура">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SHAPE_KINDS.map((s) => (
              <button key={s.k} title={s.name} onClick={() => patch({ shapeKind: s.k })} style={{ ...btn, width: 40, padding: '6px 0', fontSize: 17, background: (b.shapeKind || 'rect') === s.k ? 'var(--accent-dim)' : 'var(--panel2)' }}>
                {s.icon}
              </button>
            ))}
          </div>
          <textarea style={{ ...inp, minHeight: 44, resize: 'vertical' }} placeholder="Подпись внутри фигуры" value={b.text || ''} onChange={(e) => patch({ text: e.currentTarget.value })} />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ ...label, width: 40 }}>Кегль</span>
            <input type="range" min={10} max={90} value={b.fontSize || 24} onChange={(e) => patch({ fontSize: Number(e.currentTarget.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
            <span style={{ font: `400 11px ${MONO}`, color: 'var(--muted)', width: 24 }}>{b.fontSize || 24}</span>
          </div>
          <ColorRow label="Текст" value={b.color || '#0b0e14'} onChange={(v) => patch({ color: v })} />
        </Section>
      )}

      {/* Заливка (для всех, кроме чисто картинки) */}
      {b.type !== 'image' && (
        <Section title="Заливка">
          <ColorRow label="Фон" value={b.bg} onChange={(v) => patch({ bg: v })} onClear={() => patch({ bg: undefined })} />
        </Section>
      )}

      {/* Обводка и форма */}
      <Section title="Обводка и форма">
        <ColorRow label="Обводка" value={b.borderColor} onChange={(v) => patch({ borderColor: v })} onClear={() => patch({ borderColor: undefined, borderWidth: undefined })} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Num label="Толщина" value={b.borderWidth} min={0} max={40} onChange={(v) => patch({ borderWidth: v })} />
          <Num label="Скругление" value={b.radius} min={0} max={400} onChange={(v) => patch({ radius: v })} />
        </div>
      </Section>

      {/* Позиция, размер, прозрачность, поворот */}
      <Section title="Положение и размер">
        <div style={{ display: 'flex', gap: 8 }}>
          <Num label="X" value={b.x} onChange={(v) => patch({ x: v })} />
          <Num label="Y" value={b.y} onChange={(v) => patch({ y: v })} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Num label="Ширина" value={b.w} min={20} onChange={(v) => patch({ w: Math.max(20, v) })} />
          <Num label="Высота" value={b.h ?? hitH(b)} min={20} onChange={(v) => patch({ h: Math.max(20, v) })} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ ...label, width: 58 }}>Прозрач.</span>
          <input type="range" min={0} max={100} value={Math.round((b.opacity ?? 1) * 100)} onChange={(e) => patch({ opacity: Number(e.currentTarget.value) / 100 })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={{ font: `400 11px ${MONO}`, color: 'var(--muted)', width: 30 }}>{Math.round((b.opacity ?? 1) * 100)}%</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ ...label, width: 58 }}>Поворот</span>
          <input type="range" min={-180} max={180} value={b.rotate || 0} onChange={(e) => patch({ rotate: Number(e.currentTarget.value) })} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          <span style={{ font: `400 11px ${MONO}`, color: 'var(--muted)', width: 30 }}>{b.rotate || 0}°</span>
        </div>
      </Section>
    </div>
  )
}

// ── Панель слоёв ──
function LayersPanel({
  blocks,
  sel,
  renaming,
  setRenaming,
  onSelect,
  onMove,
  onToggle,
  onRename
}: {
  blocks: FreeBlock[]
  sel: string[]
  renaming: string | null
  setRenaming: (id: string | null) => void
  onSelect: (id: string, shift: boolean) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onToggle: (id: string, key: 'hidden' | 'locked') => void
  onRename: (id: string, name: string) => void
}) {
  const ordered = [...blocks].reverse() // верхний слой — сверху списка
  const mini: React.CSSProperties = { border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, padding: '0 2px', lineHeight: 1 }
  return (
    <div className="flow-scroll" style={{ width: 216, flex: 'none', overflow: 'auto', borderRight: '1px solid var(--border)', background: 'var(--panel2)' }}>
      <div style={{ font: `700 13px ${SANS}`, padding: '12px 12px 8px', position: 'sticky', top: 0, background: 'var(--panel2)' }}>Слои</div>
      {ordered.length === 0 && <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '0 12px 12px' }}>Пусто. Добавь объекты сверху.</div>}
      {ordered.map((b) => {
        const active = sel.includes(b.id)
        return (
          <div
            key={b.id}
            onMouseDown={(e) => onSelect(b.id, e.shiftKey)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 8px 5px 10px', cursor: 'pointer', background: active ? 'var(--accent-dim)' : 'transparent', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent' }}
          >
            <span style={{ fontSize: 12, width: 16, flex: 'none', textAlign: 'center', opacity: b.hidden ? 0.4 : 0.9 }}>{LAYER_ICON[b.type] || '▪'}</span>
            {renaming === b.id ? (
              <input
                autoFocus
                defaultValue={layerName(b)}
                onMouseDown={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  onRename(b.id, e.currentTarget.value)
                  setRenaming(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRename(b.id, e.currentTarget.value)
                    setRenaming(null)
                  }
                  e.stopPropagation()
                }}
                style={{ ...inp, padding: '2px 6px', fontSize: 12, flex: 1, minWidth: 0 }}
              />
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  setRenaming(b.id)
                }}
                title="Двойной клик — переименовать"
                style={{ flex: 1, minWidth: 0, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: b.hidden ? 0.45 : 1 }}
              >
                {layerName(b)}
              </span>
            )}
            <button style={mini} title="Выше" onMouseDown={(e) => { e.stopPropagation(); onMove(b.id, 'up') }}>▲</button>
            <button style={mini} title="Ниже" onMouseDown={(e) => { e.stopPropagation(); onMove(b.id, 'down') }}>▼</button>
            <button style={mini} title={b.hidden ? 'Показать' : 'Скрыть'} onMouseDown={(e) => { e.stopPropagation(); onToggle(b.id, 'hidden') }}>{b.hidden ? '◌' : '👁'}</button>
            <button style={mini} title={b.locked ? 'Разблокировать' : 'Заблокировать'} onMouseDown={(e) => { e.stopPropagation(); onToggle(b.id, 'locked') }}>{b.locked ? '🔒' : '🔓'}</button>
          </div>
        )
      })}
    </div>
  )
}

// ── Панель мультивыделения: выравнивание и распределение ──
function AlignPanel({
  count,
  align,
  distribute,
  onGroupAction,
  onDelete,
  onDuplicate,
  onGroup,
  onUngroup
}: {
  count: number
  align: (m: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void
  distribute: (a: 'h' | 'v') => void
  onGroupAction: (d: 'front' | 'back') => void
  onDelete: () => void
  onDuplicate: () => void
  onGroup: () => void
  onUngroup: () => void
}) {
  const ab = (icon: string, title: string, on: () => void, disabled = false) => (
    <button style={{ ...btn, flex: 1, padding: '8px 0', opacity: disabled ? 0.4 : 1 }} title={title} onClick={on} disabled={disabled}>
      {icon}
    </button>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ font: `700 14px ${SANS}`, padding: '12px 0 4px' }}>Выбрано объектов: {count}</div>
      <Section title="Выравнивание">
        <div style={{ display: 'flex', gap: 6 }}>
          {ab('⭰', 'По левому краю', () => align('left'))}
          {ab('↔', 'По центру (гор.)', () => align('hcenter'))}
          {ab('⭲', 'По правому краю', () => align('right'))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {ab('⭱', 'По верхнему краю', () => align('top'))}
          {ab('↕', 'По центру (верт.)', () => align('vcenter'))}
          {ab('⭳', 'По нижнему краю', () => align('bottom'))}
        </div>
      </Section>
      <Section title="Распределить равномерно">
        <div style={{ display: 'flex', gap: 6 }}>
          {ab('↔ =', 'По горизонтали', () => distribute('h'), count < 3)}
          {ab('↕ =', 'По вертикали', () => distribute('v'), count < 3)}
        </div>
        {count < 3 && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Для распределения нужно ≥3 объектов</div>}
      </Section>
      <Section title="Группировка">
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ ...btn, flex: 1 }} title="Сгруппировать (Ctrl+G)" onClick={onGroup}>🔗 Группа</button>
          <button style={{ ...btn, flex: 1 }} title="Разгруппировать (Ctrl+Shift+G)" onClick={onUngroup}>⛓ Разбить</button>
        </div>
      </Section>
      <Section title="Действия">
        <div style={{ display: 'flex', gap: 6 }}>
          {ab('⤒', 'На передний план', () => onGroupAction('front'))}
          {ab('⤓', 'На задний план', () => onGroupAction('back'))}
          {ab('⧉', 'Дублировать', onDuplicate)}
          {ab('🗑', 'Удалить', onDelete)}
        </div>
      </Section>
    </div>
  )
}

// ── Инспектор слайда (когда ничего не выбрано) ──
function SlideInspector({
  slide,
  patch,
  layouts,
  aiPrompt,
  setAiPrompt,
  aiBusy,
  aiRefine,
  image,
  imgBusy,
  genImage,
  onAddImageObject,
  onPickImage,
  onClearImage,
  raw,
  setRaw,
  applyRaw
}: {
  slide: Slide
  patch: (p: Partial<Slide>) => void
  layouts: Array<Slide['layout']>
  aiPrompt: string
  setAiPrompt: (v: string) => void
  aiBusy: boolean
  aiRefine: () => void
  image: string
  imgBusy: boolean
  genImage: (asObject?: boolean) => void
  onAddImageObject: () => void
  onPickImage: () => void
  onClearImage: () => void
  raw: string
  setRaw: (v: string) => void
  applyRaw: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ font: `700 14px ${SANS}`, padding: '12px 0 4px' }}>Слайд</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>Кликни объект на слайде, чтобы настроить его. Здесь — свойства всего слайда.</div>

      <Section title="Оформление">
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={label}>Макет</span>
          <select style={{ ...inp, cursor: 'pointer' }} value={slide.layout} onChange={(e) => patch({ layout: e.currentTarget.value as Slide['layout'] })}>
            {layouts.map((l) => (
              <option key={l} value={l}>
                {LAYOUT_RU[l] || l}
              </option>
            ))}
          </select>
        </label>
        <ColorRow label="Акцент" value={slide.accent || '#4c8dff'} onChange={(v) => patch({ accent: v })} />
        <ColorRow label="Акцент 2" value={slide.accent2 || '#a06bff'} onChange={(v) => patch({ accent2: v })} />
        <ColorRow label="Фон" value={(slide.bg || '').startsWith('#') ? slide.bg : ''} onChange={(v) => patch({ bg: v })} onClear={() => patch({ bg: undefined })} />
        <input style={inp} placeholder="Фон CSS (напр. linear-gradient…)" value={slide.bg || ''} onChange={(e) => patch({ bg: e.currentTarget.value })} />
      </Section>

      {slide.layout !== 'blank' && (
        <Section title="Заголовок">
          <input style={inp} value={slide.title || ''} placeholder="Заголовок слайда" onChange={(e) => patch({ title: e.currentTarget.value })} />
          {(slide.layout === 'bullets' || slide.layout === 'image') && (
            <textarea style={{ ...inp, minHeight: 76, resize: 'vertical' }} placeholder="Пункты (по строке)" value={(slide.bullets || []).join('\n')} onChange={(e) => patch({ bullets: e.currentTarget.value.split('\n').filter((l) => l.trim()) })} />
          )}
          {slide.layout === 'diagram' && (
            <textarea style={{ ...inp, minHeight: 88, resize: 'vertical', fontFamily: MONO, fontSize: 12 }} value={slide.diagram || ''} onChange={(e) => patch({ diagram: e.currentTarget.value })} placeholder={'flowchart LR\n  A --> B'} />
          )}
          {slide.layout === 'quote' && (
            <>
              <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} placeholder="Цитата" value={slide.quote || ''} onChange={(e) => patch({ quote: e.currentTarget.value })} />
              <input style={inp} placeholder="Автор" value={slide.author || ''} onChange={(e) => patch({ author: e.currentTarget.value })} />
            </>
          )}
        </Section>
      )}

      <Section title="🖼 Фото слайда">
        {image && <img src={image} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 110, objectFit: 'cover' }} />}
        <input style={inp} placeholder="Промпт фото (можно по-русски)" value={slide.imagePrompt || ''} onChange={(e) => patch({ imagePrompt: e.currentTarget.value })} />
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ ...btn, flex: 1 }} title="Сгенерировать как фон слайда" onClick={() => genImage(false)} disabled={imgBusy}>{imgBusy ? '⏳' : '🎨 Как фон'}</button>
          <button style={{ ...btn, flex: 1 }} title="Сгенерировать и вставить как двигаемый объект" onClick={() => genImage(true)} disabled={imgBusy}>🖼 Как объект</button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ ...btn, flex: 1 }} onClick={onPickImage}>📁 Загрузить</button>
          {image && <button style={{ ...btn, flex: 1 }} title="Вставить текущее фото на слайд как объект" onClick={onAddImageObject}>➕ На слайд</button>}
          {image && <button style={btn} onClick={onClearImage}>✖</button>}
        </div>
      </Section>

      <Section title="🤖 Доработать слайд (ИИ)">
        <textarea style={{ ...inp, minHeight: 44, resize: 'vertical' }} placeholder="Напр.: «сделай сравнением двух вариантов и добавь метрику 80%»" value={aiPrompt} onChange={(e) => setAiPrompt(e.currentTarget.value)} />
        <button style={{ ...btn, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' }} onClick={aiRefine} disabled={aiBusy}>
          {aiBusy ? '🤖 Думаю…' : '🤖 Доработать'}
        </button>
      </Section>

      <details>
        <summary style={{ ...label, cursor: 'pointer', padding: '10px 0' }}>{'{}'} JSON слайда</summary>
        <textarea className="flow-scroll" style={{ ...inp, minHeight: 120, fontFamily: MONO, fontSize: 11.5 }} value={raw} onChange={(e) => setRaw(e.currentTarget.value)} />
        <button style={{ ...btn, marginTop: 6 }} onClick={applyRaw}>Применить JSON</button>
      </details>
    </div>
  )
}
