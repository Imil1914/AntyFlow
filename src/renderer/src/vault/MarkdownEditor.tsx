// React-обёртка над CodeMirror 6 с live-preview Markdown, автодополнением [[ссылок]]
// и переходом по ним. Редактор — источник истины после загрузки; наверх отдаём onChange.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { EditorView, keymap, drawSelection, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { autocompletion, closeBrackets, closeBracketsKeymap, type CompletionSource } from '@codemirror/autocomplete'
import { searchKeymap } from '@codemirror/search'
import { livePreview, vaultTheme, mdSyntaxHighlight } from './livePreview'

export type NoteRef = { name: string; path: string }

// Императивный API для панели форматирования (B, I, [[ ]], списки, таблицы…)
export type MarkdownEditorHandle = {
  insert: (before: string, after: string, placeholder: string) => void
  replaceAll: (text: string) => void
  focus: () => void
}

export const MarkdownEditor = forwardRef<
  MarkdownEditorHandle,
  {
    docId: string // относительный путь заметки (ключ смены документа)
    value: string // содержимое (используется как начальное для данного docId)
    onChange: (doc: string) => void
    onOpenLink: (target: string) => void
    onOpenBoard: (name: string) => void // клик по [[[доске]]]
    boards: string[] // имена досок холста (для exists-проверки)
    notes: NoteRef[]
  }
>(function MarkdownEditor({ docId, value, onChange, onOpenLink, onOpenBoard, boards, notes }, ref): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const loadedId = useRef<string | null>(null)
  // Актуальные значения без пере-конфигурации редактора — читаем через ref.
  const notesRef = useRef<NoteRef[]>(notes)
  const openRef = useRef(onOpenLink)
  const changeRef = useRef(onChange)
  const boardsRef = useRef<string[]>(boards)
  const openBoardRef = useRef(onOpenBoard)
  notesRef.current = notes
  openRef.current = onOpenLink
  changeRef.current = onChange
  boardsRef.current = boards
  openBoardRef.current = onOpenBoard

  // Вставка вокруг выделения (панель форматирования) — работает прямо в CodeMirror.
  useImperativeHandle(ref, () => ({
    insert(before: string, after: string, placeholder: string) {
      const view = viewRef.current
      if (!view) return
      const { from, to } = view.state.selection.main
      const sel = view.state.sliceDoc(from, to) || placeholder
      const insert = before + sel + after
      const caret = from + before.length + sel.length + after.length
      view.dispatch({ changes: { from, to, insert }, selection: { anchor: caret } })
      view.focus()
    },
    replaceAll(text: string) {
      const view = viewRef.current
      if (!view) return
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
    },
    focus() {
      viewRef.current?.focus()
    }
  }))

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
        livePreview({
          onOpenLink: (t) => openRef.current(t),
          linkExists,
          onOpenBoard: (n) => openBoardRef.current(n),
          boardExists: (n) => boardsRef.current.some((b) => b.toLowerCase() === n.toLowerCase())
        }),
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
})
