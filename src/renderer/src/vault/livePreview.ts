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
import type { Range } from '@codemirror/state'
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
  { tag: t.list, color: 'var(--accent)' },
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

export type LivePrefs = {
  onOpenLink: (target: string) => void
  linkExists: (target: string) => boolean
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

    for (const { from, to } of view.visibleRanges) {
      // 1) Прячем маркеры разметки через синтаксическое дерево
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (node.to <= node.from || lineActive(node.from, node.to)) return
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

      const wiki = /\[\[([^\]\n]+?)\]\]/g
      let m: RegExpExecArray | null
      while ((m = wiki.exec(text))) {
        const start = from + m.index
        const end = start + m[0].length
        if (lineActive(start, end)) continue
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
        if (lineActive(start, end)) continue
        // ВАЖНО: не block:true — блочные декорации нельзя отдавать из ViewPlugin.
        // Виджет всё равно рисуется как блок через CSS (.cm-math-block display:block).
        decos.push(Decoration.replace({ widget: new MathWidget(m[1].trim(), true) }).range(start, end))
      }
      const inline = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g
      while ((m = inline.exec(text))) {
        const start = from + m.index
        const end = start + m[0].length
        if (lineActive(start, end)) continue
        decos.push(Decoration.replace({ widget: new MathWidget(m[1].trim(), false) }).range(start, end))
      }
    }

    return Decoration.set(decos, true)
  }

  return ViewPlugin.fromClass(
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
    '.cm-math-block': { display: 'block', textAlign: 'center', margin: '8px 0' },
    '.cm-bullet': { color: 'var(--accent)' }
  },
  { dark: true }
)

export const mdSyntaxHighlight = syntaxHighlighting(mdHighlight)
