// React-обёртка над CodeMirror 6 с live-preview Markdown, автодополнением [[ссылок]]
// и переходом по ним. Редактор — источник истины после загрузки; наверх отдаём onChange.
import { useEffect, useRef } from 'react'
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { autocompletion, closeBrackets, closeBracketsKeymap, type CompletionSource } from '@codemirror/autocomplete'
import { searchKeymap } from '@codemirror/search'
import { livePreview, vaultTheme, mdSyntaxHighlight } from './livePreview'

export type NoteRef = { name: string; path: string }

export function MarkdownEditor({
  docId,
  value,
  onChange,
  onOpenLink,
  notes
}: {
  docId: string // относительный путь заметки (ключ смены документа)
  value: string // содержимое (используется как начальное для данного docId)
  onChange: (doc: string) => void
  onOpenLink: (target: string) => void
  notes: NoteRef[]
}): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const loadedId = useRef<string | null>(null)
  // Актуальные значения без пере-конфигурации редактора — читаем через ref.
  const notesRef = useRef<NoteRef[]>(notes)
  const openRef = useRef(onOpenLink)
  const changeRef = useRef(onChange)
  notesRef.current = notes
  openRef.current = onOpenLink
  changeRef.current = onChange

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return

    const wikiComplete: CompletionSource = (ctx) => {
      const before = ctx.matchBefore(/\[\[[^\]\n]*/)
      if (!before) return null
      const typed = before.text.slice(2).toLowerCase()
      const options = notesRef.current
        .filter((n) => n.name.toLowerCase().includes(typed))
        .slice(0, 50)
        .map((n) => ({ label: n.name, type: 'text', apply: n.name + ']]' }))
      return { from: before.from + 2, options, validFor: /[^\]\n]*/ }
    }

    const linkExists = (target: string): boolean =>
      notesRef.current.some((n) => n.name.toLowerCase() === target.toLowerCase())

    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        drawSelection(),
        highlightActiveLine(),
        EditorState.allowMultipleSelections.of(true),
        EditorView.lineWrapping,
        closeBrackets(),
        markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
        mdSyntaxHighlight,
        livePreview({ onOpenLink: (t) => openRef.current(t), linkExists }),
        autocompletion({ override: [wikiComplete], activateOnTyping: true }),
        vaultTheme,
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) changeRef.current(u.state.doc.toString())
        })
      ]
    })
    const view = new EditorView({ state, parent: hostRef.current })
    viewRef.current = view
    loadedId.current = docId
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Смена заметки → заменяем документ целиком (не на каждый keystroke).
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    if (loadedId.current === docId) return
    loadedId.current = docId
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    view.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, value])

  return <div ref={hostRef} className="vault-cm" style={{ height: '100%', overflow: 'hidden' }} />
}
