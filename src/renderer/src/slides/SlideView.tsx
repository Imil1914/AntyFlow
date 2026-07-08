// Структурированный слайд: макет + содержимое. Мы контролируем дизайн,
// ИИ только наполняет поля — поэтому слайды всегда выглядят хорошо.
// Дополнительно: свободные блоки (blocks) — двигаемый текст/фото как в PowerPoint,
// плюс кастомные цвета акцента и фон.
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { renderMermaidCode } from './mermaid'

// Диаграмма Mermaid: рендерится императивно, поэтому нет конфликта с React
// и любое изменение кода сразу перерисовывает схему.
export function Mermaid({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) renderMermaidCode(ref.current, code)
  }, [code])
  return <div ref={ref} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
}

// Свободный блок поверх слайда (перетаскивается в редакторе):
// текст, фото, схема (Mermaid), метрика и карточка — инфографика.
export type FreeBlock = {
  id: string
  type: 'text' | 'image' | 'diagram' | 'stat' | 'card' | 'shape'
  x: number
  y: number
  w: number
  h?: number
  // Общие оформительские свойства (для всех типов)
  bg?: string // заливка/фон
  radius?: number // скругление углов
  borderColor?: string
  borderWidth?: number
  opacity?: number // 0..1
  rotate?: number // градусы
  // shape — форма фигуры (для схем/инфографики)
  shapeKind?: 'rect' | 'ellipse' | 'triangle' | 'diamond' | 'line' | 'arrow' | 'star' | 'hexagon' | 'parallelogram'
  // Панель слоёв
  name?: string // пользовательское имя слоя
  hidden?: boolean // скрыт (не рендерится)
  locked?: boolean // заблокирован (нельзя выделить/двигать кликом)
  groupId?: string // объекты с одним groupId выделяются/двигаются вместе
  // text
  text?: string
  fontSize?: number
  color?: string
  weight?: number
  align?: 'left' | 'center' | 'right'
  italic?: boolean
  // image
  src?: string
  // diagram (Mermaid)
  code?: string
  // stat (метрика)
  value?: string
  statLabel?: string
  // card (карточка)
  icon?: string
  heading?: string
  cardText?: string
}

// Рамка/скругление из общих свойств блока
function borderOf(b: FreeBlock): string | undefined {
  if (b.borderWidth && b.borderWidth > 0) return `${b.borderWidth}px solid ${b.borderColor || '#ffffff'}`
  if (b.borderColor) return `2px solid ${b.borderColor}`
  return undefined
}

// Векторная фигура (для схем): прямоугольник, эллипс, ромб, стрелка и т.д.,
// с необязательной текстовой подписью по центру.
const STAR_PTS = '50,2 61,38 98,38 68,60 79,96 50,73 21,96 32,60 2,38 39,38'
export function ShapeGraphic({ b }: { b: FreeBlock }) {
  const kind = b.shapeKind || 'rect'
  const fill = b.bg || 'rgba(255,255,255,0.12)'
  const stroke = b.borderColor && b.borderColor !== 'transparent' ? b.borderColor : 'none'
  const sw = b.borderWidth || 0
  const h = b.h ? '100%' : 120
  const lineColor = b.bg || b.borderColor || '#8ea6c8'

  const label = b.text ? (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        color: b.color || '#0b0e14',
        fontSize: b.fontSize || 24,
        fontWeight: b.weight || 600,
        fontStyle: b.italic ? 'italic' : 'normal',
        textAlign: 'center',
        lineHeight: 1.2,
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none'
      }}
    >
      {b.text}
    </div>
  ) : null

  if (kind === 'rect') {
    return (
      <div style={{ position: 'relative', width: '100%', height: h }}>
        <div style={{ width: '100%', height: '100%', background: fill, border: borderOf(b), borderRadius: b.radius ?? 16 }} />
        {label}
      </div>
    )
  }

  let shape: ReactNode = null
  const sp = { fill, stroke, strokeWidth: sw, vectorEffect: 'non-scaling-stroke' as const, strokeLinejoin: 'round' as const }
  if (kind === 'ellipse') shape = <ellipse cx="50" cy="50" rx="49" ry="49" {...sp} />
  else if (kind === 'triangle') shape = <polygon points="50,3 97,97 3,97" {...sp} />
  else if (kind === 'diamond') shape = <polygon points="50,2 98,50 50,98 2,50" {...sp} />
  else if (kind === 'star') shape = <polygon points={STAR_PTS} {...sp} />
  else if (kind === 'hexagon') shape = <polygon points="25,4 75,4 98,50 75,96 25,96 2,50" {...sp} />
  else if (kind === 'parallelogram') shape = <polygon points="22,6 98,6 78,94 2,94" {...sp} />
  else if (kind === 'line')
    shape = <line x1="3" y1="50" x2="97" y2="50" stroke={lineColor} strokeWidth={sw || 6} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
  else if (kind === 'arrow')
    shape = (
      <g stroke={lineColor} fill={lineColor} strokeWidth={sw || 6} strokeLinecap="round">
        <line x1="3" y1="50" x2="84" y2="50" vectorEffect="non-scaling-stroke" />
        <polygon points="82,38 99,50 82,62" stroke="none" />
      </g>
    )

  return (
    <div style={{ position: 'relative', width: '100%', height: h }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
        {shape}
      </svg>
      {label}
    </div>
  )
}

// Визуальное содержимое блока в координатах слайда 1280×720
export function BlockContent({ b }: { b: FreeBlock }) {
  const fillH = b.h ? '100%' : undefined

  if (b.type === 'shape') {
    return <ShapeGraphic b={b} />
  }
  if (b.type === 'image') {
    return (
      <img
        src={b.src}
        alt=""
        style={{ width: '100%', height: b.h || 'auto', objectFit: 'cover', borderRadius: b.radius ?? 14, border: borderOf(b), display: 'block' }}
      />
    )
  }
  if (b.type === 'diagram') {
    return (
      <div
        className="sd-mermaid"
        style={{ width: '100%', height: fillH, background: b.bg, border: borderOf(b), borderRadius: b.radius }}
      >
        <Mermaid code={b.code || 'flowchart LR\n  A --> B'} />
      </div>
    )
  }
  if (b.type === 'stat') {
    const solid = b.color
    return (
      <div
        className="sd-card"
        style={{ alignItems: 'flex-start', gap: 8, height: fillH, background: b.bg, border: borderOf(b), borderRadius: b.radius }}
      >
        <div
          className="sd-stat"
          style={solid ? { background: 'none', color: solid, WebkitTextFillColor: solid, WebkitBackgroundClip: 'border-box' } : undefined}
        >
          {b.value || '80%'}
        </div>
        <div className="sd-statlabel">{b.statLabel || 'метрика'}</div>
      </div>
    )
  }
  if (b.type === 'card') {
    return (
      <div
        className="sd-card"
        style={{ height: fillH, background: b.bg, border: borderOf(b), borderRadius: b.radius }}
      >
        {b.icon && <div className="sd-ico">{b.icon}</div>}
        <h3 style={b.color ? { color: b.color } : undefined}>{b.heading || 'Заголовок'}</h3>
        {b.cardText && <p>{b.cardText}</p>}
      </div>
    )
  }
  return (
    <div
      style={{
        fontSize: b.fontSize || 30,
        color: b.color || '#eef1f6',
        fontWeight: b.weight || 600,
        textAlign: b.align || 'left',
        fontStyle: b.italic ? 'italic' : 'normal',
        lineHeight: 1.3,
        whiteSpace: 'pre-wrap',
        height: fillH,
        boxSizing: 'border-box',
        background: b.bg,
        border: borderOf(b),
        borderRadius: b.radius,
        padding: b.bg || b.borderColor ? '10px 14px' : 0,
        overflow: 'hidden'
      }}
    >
      {b.text}
    </div>
  )
}

export type Slide = {
  layout: 'title' | 'bullets' | 'cards' | 'stats' | 'diagram' | 'image' | 'quote' | 'timeline' | 'compare' | 'progress' | 'blank'
  kicker?: string
  title?: string
  subtitle?: string
  bullets?: string[]
  cards?: { icon?: string; heading: string; text?: string }[]
  stats?: { value: string; label: string }[]
  diagram?: string
  quote?: string
  author?: string
  imagePrompt?: string
  // Новые макеты
  steps?: { title: string; text?: string }[] // timeline
  columns?: { heading: string; items: string[] }[] // compare
  bars?: { label: string; value: number }[] // progress (0..100)
  // Кастомизация
  accent?: string
  accent2?: string
  bg?: string
  blocks?: FreeBlock[]
}

export function parseSlide(json: string): Slide {
  try {
    const s = JSON.parse(json)
    if (s && typeof s === 'object' && s.layout) return s as Slide
  } catch {
    /* ignore */
  }
  return { layout: 'bullets', title: 'Слайд', bullets: [] }
}

function Bullets({ items }: { items?: string[] }) {
  return (
    <ul className="sd-list">
      {(items || []).map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  )
}

// Рендер свободных блоков поверх слайда (координаты в системе 1280×720)
export function FreeBlocks({ blocks }: { blocks?: FreeBlock[] }) {
  if (!blocks || !blocks.length) return null
  return (
    <>
      {blocks.filter((b) => !b.hidden).map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: b.x,
            top: b.y,
            width: b.w,
            height: b.h || undefined,
            opacity: b.opacity ?? 1,
            transform: b.rotate ? `rotate(${b.rotate}deg)` : undefined,
            zIndex: 3
          }}
        >
          <BlockContent b={b} />
        </div>
      ))}
    </>
  )
}

// Внутреннее содержимое слайда по макету (без внешней обёртки .sd-slide)
function slideInner(s: Slide, image?: string): { center: boolean; node: ReactNode } {
  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: 20,
    display: 'block'
  }

  // Пустой макет: слайд состоит только из свободных элементов (режим «как в Figma»)
  if (s.layout === 'blank') {
    return { center: false, node: null }
  }

  if (s.layout === 'title') {
    return {
      center: true,
      node: (
        <>
          {image && (
            <img
              src={image}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.28 }}
            />
          )}
          <div style={{ position: 'relative' }}>
            {s.kicker && <div className="sd-kicker" style={{ marginBottom: 18 }}>{s.kicker}</div>}
            <div className="sd-title">{s.title}</div>
            {s.subtitle && <div className="sd-sub" style={{ marginTop: 22, maxWidth: 900 }}>{s.subtitle}</div>}
          </div>
        </>
      )
    }
  }

  if (s.layout === 'quote') {
    return {
      center: true,
      node: (
        <>
          <div className="sd-quote">{s.quote}</div>
          {s.author && <div className="sd-sub" style={{ marginTop: 26 }}>— {s.author}</div>}
        </>
      )
    }
  }

  if (s.layout === 'stats') {
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className="sd-grid3" style={{ alignItems: 'start' }}>
            {(s.stats || []).slice(0, 3).map((st, i) => (
              <div key={i} className="sd-card" style={{ alignItems: 'flex-start', gap: 8 }}>
                <div className="sd-stat">{st.value}</div>
                <div className="sd-statlabel">{st.label}</div>
              </div>
            ))}
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  if (s.layout === 'cards') {
    const cards = s.cards || []
    const cls = cards.length > 4 ? 'sd-grid3' : cards.length > 2 ? 'sd-grid2' : 'sd-row'
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className={cls} style={{ alignItems: 'stretch' }}>
            {cards.slice(0, 6).map((c, i) => (
              <div key={i} className="sd-card">
                {c.icon && <div className="sd-ico">{c.icon}</div>}
                <h3>{c.heading}</h3>
                {c.text && <p>{c.text}</p>}
              </div>
            ))}
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  if (s.layout === 'timeline') {
    const steps = s.steps || []
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className="sd-timeline">
            {steps.slice(0, 5).map((st, i) => (
              <div key={i} className="sd-step">
                <div className="sd-step-dot">{i + 1}</div>
                <div className="sd-step-t">{st.title}</div>
                {st.text && <div className="sd-step-x">{st.text}</div>}
              </div>
            ))}
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  if (s.layout === 'compare') {
    const columns = s.columns || []
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className={columns.length > 2 ? 'sd-grid3' : 'sd-grid2'} style={{ alignItems: 'stretch' }}>
            {columns.slice(0, 3).map((col, i) => (
              <div key={i} className="sd-card">
                <h3 style={{ marginBottom: 6 }}>{col.heading}</h3>
                <ul className="sd-list">
                  {(col.items || []).map((it, j) => (
                    <li key={j} style={{ fontSize: 23 }}>{it}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  if (s.layout === 'progress') {
    const bars = s.bars || []
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className="sd-bars">
            {bars.slice(0, 6).map((b, i) => {
              const v = Math.max(0, Math.min(100, b.value))
              return (
                <div key={i} className="sd-bar">
                  <div className="sd-barhead">
                    <span>{b.label}</span>
                    <span className="sd-accent">{v}%</span>
                  </div>
                  <div className="sd-bartrack">
                    <div className="sd-barfill" style={{ width: `${v}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  if (s.layout === 'diagram') {
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className="sd-mermaid" style={{ minHeight: 380 }}>
            <Mermaid code={s.diagram || 'flowchart LR\n  A --> B'} />
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  if (s.layout === 'image') {
    return {
      center: false,
      node: (
        <>
          {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
          <div className="sd-h2">{s.title}</div>
          <div className="sd-spacer" />
          <div className="sd-row" style={{ flex: 'none', gap: 34, alignItems: 'stretch' }}>
            <div className="sd-col" style={{ justifyContent: 'center' }}>
              <Bullets items={s.bullets} />
            </div>
            <div className="sd-col" style={{ maxWidth: 560 }}>
              {image ? (
                <img src={image} alt="" style={imgStyle} />
              ) : (
                <div className="sd-card" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', color: '#8aa0c0' }}>
                  🎨 картинка
                </div>
              )}
            </div>
          </div>
          <div className="sd-spacer" />
        </>
      )
    }
  }

  // bullets (по умолчанию) — с картинкой справа, если есть
  return {
    center: false,
    node: (
      <>
        {s.kicker && <div className="sd-kicker">{s.kicker}</div>}
        <div className="sd-h2">{s.title}</div>
        {s.subtitle && <div className="sd-sub">{s.subtitle}</div>}
        <div className="sd-spacer" />
        {image ? (
          <div className="sd-row" style={{ flex: 'none', gap: 34 }}>
            <div className="sd-col" style={{ justifyContent: 'center' }}>
              <Bullets items={s.bullets} />
            </div>
            <div className="sd-col" style={{ maxWidth: 520 }}>
              <img src={image} alt="" style={imgStyle} />
            </div>
          </div>
        ) : (
          <Bullets items={s.bullets} />
        )}
        <div className="sd-spacer" />
      </>
    )
  }
}

// Один слайд 1280×720. image — dataURL сгенерированной/загруженной картинки.
export default function SlideView({ slide, image }: { slide: Slide; image?: string }) {
  const { center, node } = slideInner(slide, image)
  const vars: CSSProperties = {}
  if (slide.accent) (vars as Record<string, string>)['--accent'] = slide.accent
  if (slide.accent2) (vars as Record<string, string>)['--accent2'] = slide.accent2
  const bgStyle: CSSProperties = slide.bg ? { background: slide.bg } : {}
  return (
    <div className={'sd-slide' + (center ? ' sd-center' : '')} style={{ ...vars, ...bgStyle }}>
      {node}
      <FreeBlocks blocks={slide.blocks} />
    </div>
  )
}
