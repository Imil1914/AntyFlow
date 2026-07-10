// Live-preview для Markdown в стиле Obsidian на CodeMirror 6.
// Идея: текст остаётся исходником, но декорации «прячут» разметку на строках без
// курсора и рендерят заголовки/жирный/курсив/код как форматированные; [[вики-ссылки]]
// и формулы KaTeX показываются виджетами. Как только курсор попадает на строку —
// её разметка снова видна (можно править), точь-в-точь как в Obsidian.
import {
  EditorView,
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate
} from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { StateField, type EditorState, type Range } from '@codemirror/state'
import katex from 'katex'

// Насколько крупные заголовки и как выглядят токены разметки.
export const mdHighlight = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.9em', fontWeight: '700', lineHeight: '1.3' },
  { tag: t.heading2, fontSize: '1.55em', fontWeight: '700', lineHeight: '1.3' },
  { tag: t.heading3, fontSize: '1.3em', fontWeight: '700' },
  { tag: t.heading4, fontSize: '1.15em', fontWeight: '700' },
  { tag: t.heading5, fontSize: '1.05em', fontWeight: '700' },
  { tag: t.heading6, fontSize: '1em', fontWeight: '700', color: 'var(--muted)' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.monospace, fontFamily: 'var(--vault-mono)', color: '#e3b341' },
  { tag: t.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--muted)' },
  { tag: t.quote, color: 'var(--muted)', fontStyle: 'italic' },
  // Текст списков — обычным цветом (как в Obsidian); подсвечиваем только сам буллет.
  { tag: t.contentSeparator, color: 'var(--border)' }
])

// Узлы-«маркеры» разметки, которые прячем на неактивных строках.
const MARKS = new Set([
  'HeaderMark',
  'EmphasisMark',
  'StrikethroughMark',
  'CodeMark',
  'QuoteMark',
  'LinkMark'
])

class WikiWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly label: string,
    readonly onOpen: (t: string) => void,
    readonly exists: boolean
  ) {
    super()
  }
  eq(o: WikiWidget): boolean {
    return o.target === this.target && o.label === this.label && o.exists === this.exists
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-wikilink' + (this.exists ? '' : ' cm-wikilink-new')
    el.textContent = this.label
    el.title = this.exists ? this.target : this.target + ' (создать)'
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.onOpen(this.target)
    })
    return el
  }
  ignoreEvent(): boolean {
    return false
  }
}

// Ссылка на ДОСКУ холста: синтаксис [[[Название доски]]]. При клике открывает доску.
class BoardLinkWidget extends WidgetType {
  constructor(
    readonly name: string,
    readonly onOpen: (name: string) => void,
    readonly exists: boolean
  ) {
    super()
  }
  eq(o: BoardLinkWidget): boolean {
    return o.name === this.name && o.exists === this.exists
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-boardlink' + (this.exists ? '' : ' cm-boardlink-new')
    el.textContent = '🗺 ' + this.name
    el.title = this.exists ? 'Открыть доску «' + this.name + '»' : 'Создать доску «' + this.name + '»'
    el.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      this.onOpen(this.name)
    })
    return el
  }
  ignoreEvent(): boolean {
    return false
  }
}

class BulletWidget extends WidgetType {
  eq(): boolean {
    return true
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = 'cm-bullet'
    el.textContent = '•'
    return el
  }
}

class MathWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly block: boolean
  ) {
    super()
  }
  eq(o: MathWidget): boolean {
    return o.code === this.code && o.block === this.block
  }
  toDOM(): HTMLElement {
    const el = document.createElement('span')
    el.className = this.block ? 'cm-math cm-math-block' : 'cm-math'
    try {
      katex.render(this.code, el, { throwOnError: false, displayMode: this.block })
    } catch {
      el.textContent = this.code
    }
    return el
  }
  ignoreEvent(): boolean {
    return true
  }
}

// Панель «Свойства» — рендерит YAML-frontmatter как в Obsidian (ключ → значение,
// теги как чипы), пряча сырой ---…--- блок.
class FrontmatterWidget extends WidgetType {
  constructor(readonly raw: string) {
    super()
  }
  eq(o: FrontmatterWidget): boolean {
    return o.raw === this.raw
  }
  toDOM(): HTMLElement {
    const wrap = document.createElement('div')
    wrap.className = 'cm-frontmatter'
    const title = document.createElement('div')
    title.className = 'cm-fm-title'
    title.textContent = 'Свойства'
    wrap.appendChild(title)

    // Разбор простого YAML: «ключ: значение» и списки «  - элемент».
    const rows: { k: string; vals: string[] }[] = []
    let cur: { k: string; vals: string[] } | null = null
    for (const line of this.raw.split('\n')) {
      const li = line.match(/^\s*-\s+(.*)$/)
      if (li && cur) {
        cur.vals.push(li[1].trim())
        continue
      }
      const kv = line.match(/^([^:\n]+):\s*(.*)$/)
      if (kv) {
        cur = { k: kv[1].trim(), vals: [] }
        rows.push(cur)
        const v = kv[2].trim()
        if (v) cur.vals.push(v)
      }
    }

    const tagKeys = new Set(['tags', 'теги', 'tag'])
    for (const { k, vals } of rows) {
      const row = document.createElement('div')
      row.className = 'cm-fm-row'
      const key = document.createElement('span')
      key.className = 'cm-fm-key'
      key.textContent = k
      const val = document.createElement('span')
      val.className = 'cm-fm-val'
      if (!vals.length) {
        val.textContent = '—'
        val.classList.add('cm-fm-empty')
      } else if (tagKeys.has(k.toLowerCase()) || vals.length > 1) {
        for (const tg of vals) {
          const chip = document.createElement('span')
          chip.className = 'cm-fm-tag'
          chip.textContent = tg
          val.appendChild(chip)
        }
      } else {
        val.textContent = vals[0]
      }
      row.appendChild(key)
      row.appendChild(val)
      wrap.appendChild(row)
    }
    return wrap
  }
  ignoreEvent(): boolean {
    return true
  }
}

// Рендер GFM-таблицы как настоящей <table> (вместо сырых «| | |»).
class TableWidget extends WidgetType {
  constructor(readonly src: string) {
    super()
  }
  eq(o: TableWidget): boolean {
    return o.src === this.src
  }
  private cells(line: string): string[] {
    return line
      .replace(/^\s*\|/, '')
      .replace(/\|\s*$/, '')
      .split('|')
      .map((c) => c.trim())
  }
  toDOM(): HTMLElement {
    const lines = this.src.split('\n').filter((l) => l.trim())
    const table = document.createElement('table')
    table.className = 'cm-md-table'
    if (lines.length) {
      const thead = document.createElement('thead')
      const htr = document.createElement('tr')
      for (const h of this.cells(lines[0])) {
        const th = document.createElement('th')
        th.textContent = h
        htr.appendChild(th)
      }
      thead.appendChild(htr)
      table.appendChild(thead)
    }
    const tbody = document.createElement('tbody')
    for (let i = 2; i < lines.length; i++) {
      const tr = document.createElement('tr')
      for (const c of this.cells(lines[i])) {
        const td = document.createElement('td')
        td.textContent = c
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    return table
  }
  ignoreEvent(): boolean {
    return true
  }
}

export type LivePrefs = {
  onOpenLink: (target: string) => void
  linkExists: (target: string) => boolean
  onOpenBoard: (name: string) => void
  boardExists: (name: string) => boolean
}

// Строки, пересекающиеся с выделением/курсором — на них разметку НЕ прячем.
function activeLines(view: EditorView): Set<number> {
  const s = new Set<number>()
  for (const r of view.state.selection.ranges) {
    const a = view.state.doc.lineAt(r.from).number
    const b = view.state.doc.lineAt(r.to).number
    for (let i = a; i <= b; i++) s.add(i)
  }
  return s
}

// Блочные виджеты (frontmatter + таблицы). Их replace пересекает переносы строк,
// поэтому отдаём их через StateField (block-декорации из ViewPlugin запрещены).
// Если курсор/выделение попадает в блок — показываем сырой markdown для правки.
function computeBlocks(state: EditorState): { deco: DecorationSet; hidden: [number, number][] } {
  const doc = state.doc
  const decos: Range<Decoration>[] = []
  const hidden: [number, number][] = []
  const selActive = (from: number, to: number): boolean => {
    for (const r of state.selection.ranges) if (r.from <= to && r.to >= from) return true
    return false
  }

  // Frontmatter (--- … ---) в самом начале → панель «Свойства»
  const head = doc.sliceString(0, Math.min(doc.length, 6000))
  const fm = head.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (fm && !selActive(0, fm[0].length)) {
    decos.push(Decoration.replace({ widget: new FrontmatterWidget(fm[1]), block: true }).range(0, fm[0].length))
    hidden.push([0, fm[0].length])
  }

  // GFM-таблицы (шапка + строка-разделитель |---| + строки) → <table>
  if (doc.lines < 4000) {
    let ln = 1
    while (ln < doc.lines) {
      const h = doc.line(ln)
      const sep = doc.line(ln + 1)
      const looksTable =
        h.text.includes('|') && /^[\s:|-]+$/.test(sep.text) && sep.text.includes('-') && sep.text.includes('|')
      if (looksTable) {
        let last = ln + 1
        while (last + 1 <= doc.lines && doc.line(last + 1).text.includes('|') && doc.line(last + 1).text.trim() !== '')
          last++
        const from = h.from
        const to = doc.line(last).to
        if (!selActive(from, to)) {
          decos.push(Decoration.replace({ widget: new TableWidget(doc.sliceString(from, to)), block: true }).range(from, to))
          hidden.push([from, to])
        }
        ln = last + 1
        continue
      }
      ln++
    }
  }
  return { deco: Decoration.set(decos, true), hidden }
}

const blockField = StateField.define<{ deco: DecorationSet; hidden: [number, number][] }>({
  create: (s) => computeBlocks(s),
  update: (v, tr) => (tr.docChanged || tr.selection ? computeBlocks(tr.state) : v),
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco)
})

export function livePreview(prefs: LivePrefs) {
  const build = (view: EditorView): DecorationSet => {
    const active = activeLines(view)
    const decos: Range<Decoration>[] = []
    const doc = view.state.doc
    const lineActive = (from: number, to: number): boolean => {
      const a = doc.lineAt(from).number
      const b = doc.lineAt(to).number
      for (let i = a; i <= b; i++) if (active.has(i)) return true
      return false
    }
    // Блоки, отрисованные виджетами (frontmatter/таблицы) живут в отдельном
    // StateField (их replace пересекает переносы строк — из ViewPlugin нельзя).
    // Здесь только пропускаем их диапазоны, чтобы маркеры не пересекались.
    const hidden = view.state.field(blockField).hidden
    const inHidden = (a: number, b: number): boolean => hidden.some(([x, y]) => a < y && b > x)

    for (const { from, to } of view.visibleRanges) {
      // 1) Прячем маркеры разметки через синтаксическое дерево
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (node.to <= node.from || lineActive(node.from, node.to) || inHidden(node.from, node.to)) return
          if (MARKS.has(node.name)) {
            decos.push(Decoration.replace({}).range(node.from, node.to))
          } else if (node.name === 'ListMark') {
            // Маркеры «-», «*», «+» заменяем на буллет •; порядковые «1.» оставляем.
            const s = view.state.doc.sliceString(node.from, node.to)
            if (/^[-*+]$/.test(s)) {
              decos.push(Decoration.replace({ widget: new BulletWidget() }).range(node.from, node.to))
            }
          }
        }
      })

      // 2) [[вики-ссылки]] и формулы — по тексту видимого диапазона
      const text = view.state.doc.sliceString(from, to)
      let m: RegExpExecArray | null

      // 2.0) [[[Ссылки на доски]]] — обрабатываем ПЕРЕД [[..]], чтобы двойной regex
      // не перехватил внутренность тройных скобок. Занятые диапазоны — в taken.
      const taken: [number, number][] = []
      const board = /\[\[\[([^\]\n]+?)\]\]\]/g
      while ((m = board.exec(text))) {
        const start = from + m.index
        const end = start + m[0].length
        if (lineActive(start, end) || inHidden(start, end)) continue
        const name = m[1].trim()
        taken.push([start, end])
        decos.push(
          Decoration.replace({
            widget: new BoardLinkWidget(name, prefs.onOpenBoard, prefs.boardExists(name))
          }).range(start, end)
        )
      }
      const inTaken = (a: number, b: number): boolean => taken.some(([x, y]) => a < y && b > x)

      const wiki = /\[\[([^\]\n]+?)\]\]/g
      while ((m = wiki.exec(text))) {
        const start = from + m.index
        const end = start + m[0].length
        if (lineActive(start, end) || inHidden(start, end) || inTaken(start, end)) continue
        const raw = m[1]
        const target = raw.split('|')[0].split('#')[0].trim()
        const label = (raw.includes('|') ? raw.split('|')[1] : raw.replace(/#.*/, '')).trim() || target
        decos.push(
          Decoration.replace({
            widget: new WikiWidget(target, label, prefs.onOpenLink, prefs.linkExists(target))
          }).range(start, end)
        )
      }

      // Блочные $$...$$ (в т.ч. многострочные) и строчные $...$
      const block = /\$\$([^$]+?)\$\$/g
      while ((m = block.exec(text))) {
        const start = from + m.index
        const end = start + m[0].length
        if (lineActive(start, end) || inHidden(start, end)) continue
        // ВАЖНО: не block:true — блочные декорации нельзя отдавать из ViewPlugin.
        // Виджет всё равно рисуется как блок через CSS (.cm-math-block display:block).
        decos.push(Decoration.replace({ widget: new MathWidget(m[1].trim(), true) }).range(start, end))
      }
      const inline = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g
      while ((m = inline.exec(text))) {
        const start = from + m.index
        const end = start + m[0].length
        if (lineActive(start, end) || inHidden(start, end)) continue
        decos.push(Decoration.replace({ widget: new MathWidget(m[1].trim(), false) }).range(start, end))
      }
    }

    return Decoration.set(decos, true)
  }

  const plugin = ViewPlugin.fromClass(
    class {
      decorations: DecorationSet
      constructor(view: EditorView) {
        this.decorations = build(view)
      }
      update(u: ViewUpdate): void {
        if (u.docChanged || u.viewportChanged || u.selectionSet) {
          this.decorations = build(u.view)
        }
      }
    },
    { decorations: (v) => v.decorations }
  )
  // Порядок важен: сначала блочные виджеты (frontmatter/таблицы), затем инлайн.
  return [blockField, plugin]
}

// Тема оформления редактора (Obsidian-подобная, тёмная, под токены ОС).
export const vaultTheme = EditorView.theme(
  {
    '&': { color: 'var(--text)', backgroundColor: 'transparent', height: '100%' },
    '.cm-scroller': {
      fontFamily: 'var(--vault-serif)',
      fontSize: '16px',
      lineHeight: '1.7',
      overflow: 'auto'
    },
    '.cm-content': { padding: '18px 8px 40vh', caretColor: 'var(--accent)', maxWidth: '820px', margin: '0 auto' },
    '.cm-gutters': { display: 'none' },
    '&.cm-focused': { outline: 'none' },
    '.cm-line': { padding: '0 2px' },
    '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
      backgroundColor: 'rgba(34,211,238,0.20)'
    },
    '.cm-activeLine': { backgroundColor: 'transparent' },
    '.cm-wikilink': {
      color: 'var(--accent)',
      cursor: 'pointer',
      borderRadius: '4px',
      padding: '0 2px',
      textDecoration: 'none'
    },
    '.cm-wikilink:hover': { textDecoration: 'underline' },
    '.cm-wikilink-new': { color: 'var(--muted)', fontStyle: 'italic' },
    // Ссылка на доску холста [[[..]]] — отдельный вид (фиолетовая плашка-пилюля)
    '.cm-boardlink': {
      color: '#c4b5fd',
      background: 'rgba(139,124,246,0.14)',
      border: '1px solid rgba(139,124,246,0.35)',
      cursor: 'pointer',
      borderRadius: '6px',
      padding: '0 6px',
      fontSize: '0.92em',
      whiteSpace: 'nowrap',
      textDecoration: 'none'
    },
    '.cm-boardlink:hover': { background: 'rgba(139,124,246,0.24)' },
    '.cm-boardlink-new': { opacity: '0.7', fontStyle: 'italic' },
    '.cm-math-block': { display: 'block', textAlign: 'center', margin: '8px 0' },
    '.cm-bullet': { color: 'var(--accent)' },
    // Панель «Свойства» (frontmatter) — как в Obsidian
    '.cm-frontmatter': {
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '12px 16px',
      margin: '2px 0 18px',
      background: 'rgba(255,255,255,0.02)',
      fontFamily: 'var(--vault-serif)'
    },
    '.cm-fm-title': {
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '.07em',
      color: 'var(--muted)',
      fontWeight: '600',
      marginBottom: '10px'
    },
    '.cm-fm-row': { display: 'flex', gap: '14px', padding: '4px 0', alignItems: 'baseline', lineHeight: '1.5' },
    '.cm-fm-key': { minWidth: '150px', flexShrink: '0', color: 'var(--muted)', fontSize: '13.5px' },
    '.cm-fm-val': { color: 'var(--text)', fontSize: '14.5px' },
    '.cm-fm-empty': { color: 'var(--muted)', opacity: '0.6' },
    '.cm-fm-tag': {
      display: 'inline-block',
      background: 'rgba(34,211,238,0.12)',
      color: 'var(--accent)',
      border: '1px solid rgba(34,211,238,0.28)',
      borderRadius: '999px',
      padding: '1px 10px',
      fontSize: '12.5px',
      marginRight: '6px',
      marginBottom: '3px'
    },
    // Таблицы Markdown
    '.cm-md-table': { borderCollapse: 'collapse', margin: '10px 0', fontSize: '14.5px', width: 'auto' },
    '.cm-md-table th, .cm-md-table td': {
      border: '1px solid var(--border)',
      padding: '6px 12px',
      textAlign: 'left'
    },
    '.cm-md-table th': { background: 'rgba(255,255,255,0.05)', fontWeight: '600', color: 'var(--text)' },
    '.cm-md-table td': { color: 'var(--text)' }
  },
  { dark: true }
)

export const mdSyntaxHighlight = syntaxHighlighting(mdHighlight)
