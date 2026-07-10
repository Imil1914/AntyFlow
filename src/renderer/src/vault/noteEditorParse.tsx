// Порт markdown-парсера из дизайна «Редактор заметки.dc.html».
// Возвращает блоки для режима чтения — точно по вёрстке макета.
import type React from 'react'

export type Span = {
  t: string
  w: number
  fs: 'normal' | 'italic'
  c: string
  bb: string
  cur: 'text' | 'pointer'
  click: (() => void) | null
}
export type Cell = { t: string; font: string; color: string; bg: string }
export type Block = {
  font: string
  color: string
  margin: string
  pad: string
  bg: string
  bl: string
  radius: string
  isText: boolean
  isTable?: boolean
  isImg?: boolean
  spans: Span[]
  cells?: Cell[]
  cols?: string
  alt?: string
  anchor: string
  h1?: boolean
  h2?: boolean
}

export type ParseHelpers = {
  // Открыть заметку / доску по вики-имени, либо показать тост «нет такой»
  onLink: (title: string) => void
  onExternal: () => void
  // Свёрнутые секции (по anchor)
  collapsed: Record<string, boolean>
  toggleSection: (anchor: string) => void
  // Переключить чекбокс на строке с индексом li
  toggleCheckbox: (li: number) => void
  accent: string
}

// Разбивает строку на span-ы: **жирный**, *курсив*, [[вики]], [внешняя](url)
function spanify(txt: string, muted: boolean, h: ParseHelpers): Span[] {
  const A = 'var(--accent)'
  const out: Span[] = []
  let rest = txt
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]*\))/
  const plain = (t: string): Span => ({
    t,
    w: 400,
    fs: 'normal',
    c: muted ? 'var(--muted)' : 'inherit',
    bb: 'none',
    cur: 'text',
    click: null
  })
  while (rest) {
    const m = rest.match(re)
    if (!m || m.index == null) {
      out.push(plain(rest))
      break
    }
    if (m.index > 0) out.push(plain(rest.slice(0, m.index)))
    const tok = m[0]
    if (tok.startsWith('**')) {
      out.push({ t: tok.slice(2, -2), w: 600, fs: 'normal', c: 'var(--text)', bb: 'none', cur: 'text', click: null })
    } else if (tok.startsWith('[[')) {
      const tt = tok.slice(2, -2)
      out.push({ t: tt, w: 400, fs: 'normal', c: A, bb: '1px dotted ' + A, cur: 'pointer', click: () => h.onLink(tt) })
    } else if (tok.startsWith('[')) {
      const t = tok.slice(1, tok.indexOf(']'))
      out.push({ t, w: 400, fs: 'normal', c: A, bb: '1px solid rgba(34,211,238,.4)', cur: 'pointer', click: () => h.onExternal() })
    } else {
      out.push({ t: tok.slice(1, -1), w: 400, fs: 'italic', c: 'inherit', bb: 'none', cur: 'text', click: null })
    }
    rest = rest.slice(m.index + tok.length)
  }
  return out
}

export function parseBlocks(md: string, h: ParseHelpers): Block[] {
  const blocks: Block[] = []
  const base = (): Block => ({
    font: "400 14px/1.7 'IBM Plex Sans',sans-serif",
    color: 'var(--text)',
    margin: '0 0 14px',
    pad: '0',
    bg: 'transparent',
    bl: 'none',
    radius: '0',
    isText: true,
    spans: [],
    anchor: ''
  })
  const lines = md.split('\n')
  let quote: { t: string; h?: boolean }[] = []
  let tbl: string[][] | null = null
  const flushQuote = (): void => {
    if (!quote.length) return
    quote.forEach((q, i) => {
      blocks.push({
        font: q.h ? "600 15px/1.4 'IBM Plex Sans',sans-serif" : "400 13.5px/1.6 'IBM Plex Sans',sans-serif",
        color: q.h ? 'var(--text)' : 'var(--muted)',
        margin: (i === 0 ? '4px' : '0') + ' 0 ' + (i === quote.length - 1 ? '18px' : '4px'),
        pad: (i === 0 ? '14px' : '0') + ' 18px ' + (i === quote.length - 1 ? '14px' : '0') + ' 18px',
        bg: 'var(--panel)',
        bl: '3px solid var(--accent)',
        radius: (i === 0 ? '0 10px' : '0 0') + ' ' + (i === quote.length - 1 ? '10px 0' : '0 0'),
        isText: true,
        spans: spanify(q.t, false, h),
        anchor: ''
      })
    })
    quote = []
  }
  const flushTbl = (): void => {
    if (!tbl || !tbl.length) {
      tbl = null
      return
    }
    const nCols = tbl[0].length
    const cells: Cell[] = []
    tbl.forEach((row, ri) =>
      row.forEach((t) =>
        cells.push({
          t,
          font: ri === 0 ? "500 11.5px 'JetBrains Mono',monospace" : "400 12.5px 'IBM Plex Sans',sans-serif",
          color: ri === 0 ? 'var(--muted)' : 'var(--text)',
          bg: ri === 0 ? 'var(--panel2)' : 'var(--panel)'
        })
      )
    )
    blocks.push({ ...base(), isText: false, isTable: true, cells, cols: 'repeat(' + nCols + ',1fr)', margin: '4px 0 18px' })
    tbl = null
  }
  for (let li = 0; li < lines.length; li++) {
    const l = lines[li].trim()
    if (!l) {
      flushQuote()
      flushTbl()
      continue
    }
    if (l.startsWith('|')) {
      flushQuote()
      if (/^\|[\s\-|:]+\|$/.test(l)) continue
      ;(tbl = tbl || []).push(
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
      )
      continue
    }
    flushTbl()
    if (l.startsWith('> ')) {
      const q = l.slice(2)
      quote.push(q.startsWith('## ') ? { t: q.slice(3), h: true } : { t: q })
      continue
    }
    flushQuote()
    const img = l.match(/^!\[([^\]]*)\]/)
    const cb = l.match(/^- \[( |x)\] (.*)$/)
    if (img) {
      blocks.push({ ...base(), isText: false, isImg: true, alt: img[1] || 'изображение', margin: '4px 0 18px' })
    } else if (cb) {
      const checked = cb[1] === 'x'
      const idx = li
      const b = base()
      b.margin = '0 0 6px'
      b.spans = ([
        {
          t: checked ? '☑  ' : '☐  ',
          w: 400,
          fs: 'normal',
          c: checked ? 'var(--c-note)' : 'var(--muted)',
          bb: 'none',
          cur: 'pointer',
          click: () => h.toggleCheckbox(idx)
        }
      ] as Span[]).concat(spanify(cb[2], checked, h))
      blocks.push(b)
    } else if (l.startsWith('- ')) {
      const b = base()
      b.margin = '0 0 6px'
      b.spans = ([{ t: '•  ', w: 400, fs: 'normal', c: 'var(--accent)', bb: 'none', cur: 'text', click: null }] as Span[]).concat(
        spanify(l.slice(2), false, h)
      )
      blocks.push(b)
    } else if (l.startsWith('# ')) {
      blocks.push({
        ...base(),
        font: "600 24px/1.3 'IBM Plex Sans',sans-serif",
        color: 'var(--c-note)',
        margin: '10px 0 14px',
        anchor: 'sec-' + li,
        h1: true,
        spans: spanify(l.slice(2), false, h)
      })
    } else if (l.startsWith('## ')) {
      const anchor = 'sec-' + li
      const collapsed = !!h.collapsed[anchor]
      blocks.push({
        ...base(),
        font: "600 18px/1.35 'IBM Plex Sans',sans-serif",
        color: 'var(--c-note)',
        margin: '26px 0 10px',
        anchor,
        h2: true,
        spans: ([
          {
            t: collapsed ? '▸ ' : '▾ ',
            w: 400,
            fs: 'normal',
            c: 'var(--muted)',
            bb: 'none',
            cur: 'pointer',
            click: () => h.toggleSection(anchor)
          }
        ] as Span[]).concat(spanify(l.slice(3), false, h))
      })
    } else {
      const b = base()
      b.spans = spanify(l, false, h)
      blocks.push(b)
    }
  }
  flushQuote()
  flushTbl()
  return blocks
}

// Схлопывание блоков под свёрнутыми ## секциями (как в макете)
export function collapseBlocks(raw: Block[], collapsed: Record<string, boolean>): Block[] {
  const out: Block[] = []
  let hiding = false
  raw.forEach((b) => {
    if (b.h1) {
      hiding = false
      out.push(b)
    } else if (b.h2) {
      hiding = !!collapsed[b.anchor]
      out.push(b)
    } else if (!hiding) out.push(b)
  })
  return out
}

export type CSSVars = React.CSSProperties & Record<`--${string}`, string>
