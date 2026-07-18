// Полноэкранные оверлеи «Персональной ОС»: ⌘K, RAG, Граф знаний,
// Студия агентов, Генеративная студия, Мобильный (туннельный) вид, Тост.
// Разметка и поведение — 1:1 из макета ос/Персональная ОС.dc.html.
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { NodeSearchHit, MemorySearchHit } from '../flow-api'

const MONO = "'JetBrains Mono', monospace"
const SANS = "'IBM Plex Sans', sans-serif"

const stop = (e: React.MouseEvent) => e.stopPropagation()

const backdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 60,
  background: 'rgba(8,9,13,.94)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  display: 'flex',
  flexDirection: 'column'
}

const modalBackdrop: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 70,
  background: 'rgba(5,6,9,.6)',
  backdropFilter: 'blur(3px)',
  WebkitBackdropFilter: 'blur(3px)',
  display: 'grid',
  placeItems: 'center'
}

const overlayHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '14px 18px',
  borderBottom: '1px solid var(--border)'
}

const closeBtn: CSSProperties = {
  width: 30,
  height: 30,
  border: '1px solid var(--border)',
  borderRadius: 7,
  background: 'var(--panel)',
  color: 'var(--muted)',
  fontSize: 13
}

// ─────────────────────────────────────────────────────────────
// Тост
// ─────────────────────────────────────────────────────────────
export function Toast({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 44,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        background: 'var(--panel)',
        border: '1px solid var(--accent)',
        borderRadius: 9,
        padding: '9px 16px',
        font: `500 12px ${SANS}`,
        color: 'var(--text)',
        boxShadow: '0 12px 32px rgba(0,0,0,.5)'
      }}
    >
      {text}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// ⌘K — палитра команд
// ─────────────────────────────────────────────────────────────
export type Command = { label: string; hint: string; run: () => void }

export function CmdK({
  open,
  onClose,
  commands
}: {
  open: boolean
  onClose: () => void
  commands: Command[]
}) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (open) {
      setQ('')
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])
  if (!open) return null
  const query = q.trim().toLowerCase()
  const items = commands.filter((c) => !query || c.label.toLowerCase().includes(query))
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(5,6,9,.6)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '14vh'
      }}
    >
      <div
        onMouseDown={stop}
        style={{
          width: 520,
          maxWidth: '92vw',
          height: 'fit-content',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
          overflow: 'hidden'
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          placeholder="Создать, найти, перейти…"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
            font: `400 14px ${SANS}`,
            padding: '14px 16px',
            outline: 'none'
          }}
        />
        <div className="os-scroll" style={{ maxHeight: 300, overflowY: 'auto', padding: 6 }}>
          {items.map((c, i) => (
            <div
              key={i}
              className="os-cmd-item"
              onClick={() => {
                c.run()
                onClose()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 11px',
                borderRadius: 7,
                cursor: 'pointer',
                font: `400 12.5px ${SANS}`
              }}
            >
              <span style={{ color: 'var(--text)' }}>{c.label}</span>
              <div style={{ flex: 1 }} />
              <span style={{ font: `400 10px ${MONO}`, color: 'var(--muted)' }}>{c.hint}</span>
            </div>
          ))}
          {!items.length && (
            <div style={{ padding: '9px 11px', font: `400 12.5px ${SANS}`, color: 'var(--muted)' }}>
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Глобальный поиск (Ctrl+K) — T4.1: ноды/память/транскрипты всех досок + команды
// ─────────────────────────────────────────────────────────────
export type SearchNav =
  | { type: 'node'; boardId: string; shapeId: string }
  | { type: 'memory'; boardId: string }
  | { type: 'transcript'; shapeId: string }
  | { type: 'command'; run: () => void }

type SearchTab = 'all' | 'nodes' | 'memory' | 'transcripts' | 'commands'
const SEARCH_RECENT_LS = 'flow-search-recent'

// Подсветка сниппета: FTS оборачивает совпадения в [ … ] — превращаем в <mark>.
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[') && p.endsWith(']') ? (
          <mark key={i} style={{ background: 'rgba(56,189,248,.28)', color: 'var(--text)', borderRadius: 3, padding: '0 2px' }}>
            {p.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

const KIND_LABELS: Record<string, string> = {
  note: 'Заметка',
  ai: 'ИИ-чат',
  doc: 'Документ',
  answer: 'Ответ',
  code: 'Код',
  codeblock: 'Код',
  search: 'Поиск',
  image: 'Картинка',
  deck: 'Слайды',
  diagram: 'Схема',
  pdf: 'PDF',
  kanban: 'Канбан',
  list: 'Список',
  sheet: 'Таблица',
  webgpt: 'ChatGPT',
  webgemini: 'Gemini',
  webglm: 'GLM',
  orchestrator: 'Оркестратор'
}

export function GlobalSearch({
  open,
  onClose,
  commands,
  onNavigate,
  searchTranscripts
}: {
  open: boolean
  onClose: () => void
  commands: Command[]
  onNavigate: (t: SearchNav) => void
  searchTranscripts: (q: string) => { shapeId: string; snippet: string }[]
}) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<SearchTab>('all')
  const [nodes, setNodes] = useState<NodeSearchHit[]>([])
  const [mem, setMem] = useState<MemorySearchHit[]>([])
  const [trans, setTrans] = useState<{ shapeId: string; snippet: string }[]>([])
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SEARCH_RECENT_LS) || '[]')
    } catch {
      return []
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setNodes([])
      setMem([])
      setTrans([])
      setTab('all')
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
  }, [open])

  // Дебаунс-поиск по всем источникам.
  useEffect(() => {
    if (!open) return
    const query = q.trim()
    if (!query) {
      setNodes([])
      setMem([])
      setTrans([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const [nr, mr] = await Promise.all([
          window.flow.nodes.search({ query, limit: 40 }),
          window.flow.memory.search({ query, limit: 25 })
        ])
        if (cancelled) return
        setNodes(nr.ok ? nr.data : [])
        setMem(mr.ok ? mr.data : [])
      } catch {
        if (!cancelled) {
          setNodes([])
          setMem([])
        }
      }
      try {
        if (!cancelled) setTrans(searchTranscripts(query))
      } catch {
        /* ignore */
      }
    }, 180)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, open, searchTranscripts])

  if (!open) return null

  const commitRecent = (query: string): void => {
    const v = query.trim()
    if (!v) return
    const next = [v, ...recent.filter((r) => r !== v)].slice(0, 8)
    setRecent(next)
    try {
      localStorage.setItem(SEARCH_RECENT_LS, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  const go = (t: SearchNav): void => {
    commitRecent(q)
    onNavigate(t)
    onClose()
  }

  const query = q.trim().toLowerCase()
  const cmdHits = query ? commands.filter((c) => c.label.toLowerCase().includes(query)) : commands
  const showNodes = tab === 'all' || tab === 'nodes'
  const showMem = tab === 'all' || tab === 'memory'
  const showTrans = tab === 'all' || tab === 'transcripts'
  const showCmd = tab === 'all' || tab === 'commands'
  const total = nodes.length + mem.length + trans.length + (query ? cmdHits.length : 0)

  const TABS: { id: SearchTab; label: string; n?: number }[] = [
    { id: 'all', label: 'Всё' },
    { id: 'nodes', label: 'Ноды', n: nodes.length },
    { id: 'memory', label: 'Память', n: mem.length },
    { id: 'transcripts', label: 'Транскрипты', n: trans.length },
    { id: 'commands', label: 'Команды' }
  ]

  const sectionTitle: CSSProperties = {
    font: `600 10px ${MONO}`,
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: '.06em',
    padding: '10px 12px 4px'
  }
  const rowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '8px 11px',
    borderRadius: 7,
    cursor: 'pointer'
  }
  const rowMeta: CSSProperties = { font: `400 10.5px ${MONO}`, color: 'var(--muted)' }
  const rowSnippet: CSSProperties = { font: `400 11.5px ${SANS}`, color: 'var(--muted)', lineHeight: 1.4 }

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(5,6,9,.6)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
    >
      <div
        onMouseDown={stop}
        style={{
          width: 620,
          maxWidth: '94vw',
          maxHeight: '72vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
          overflow: 'hidden'
        }}
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          placeholder="Поиск по нодам, памяти, транскриптам всех досок…"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            color: 'var(--text)',
            font: `400 14px ${SANS}`,
            padding: '14px 16px',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                font: `600 11px ${SANS}`,
                color: tab === t.id ? 'var(--text)' : 'var(--muted)',
                background: tab === t.id ? 'var(--panel2)' : 'transparent',
                border: `1px solid ${tab === t.id ? 'var(--border)' : 'transparent'}`,
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer'
              }}
            >
              {t.label}
              {typeof t.n === 'number' && t.n > 0 ? ` · ${t.n}` : ''}
            </button>
          ))}
        </div>
        <div className="os-scroll" style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          {!query && recent.length > 0 && (
            <>
              <div style={sectionTitle}>Недавние запросы</div>
              {recent.map((r, i) => (
                <div key={i} className="os-cmd-item" onClick={() => setQ(r)} style={{ ...rowStyle, cursor: 'pointer' }}>
                  <span style={{ font: `400 12.5px ${SANS}`, color: 'var(--text)' }}>🕑 {r}</span>
                </div>
              ))}
            </>
          )}

          {query && showNodes && nodes.length > 0 && (
            <>
              <div style={sectionTitle}>Ноды</div>
              {nodes.map((h) => (
                <div
                  key={h.shapeId}
                  className="os-cmd-item"
                  onClick={() => go({ type: 'node', boardId: h.boardId, shapeId: h.shapeId })}
                  style={rowStyle}
                >
                  <span style={{ font: `500 12.5px ${SANS}`, color: 'var(--text)' }}>
                    {h.title || '(без названия)'}
                  </span>
                  <span style={rowMeta}>
                    {(KIND_LABELS[h.kind] || h.kind || 'нода')} · {h.boardName || 'доска'}
                  </span>
                  {h.snippet && (
                    <span style={rowSnippet}>
                      <Snippet text={h.snippet} />
                    </span>
                  )}
                </div>
              ))}
            </>
          )}

          {query && showMem && mem.length > 0 && (
            <>
              <div style={sectionTitle}>Память доски</div>
              {mem.map((h, i) => (
                <div
                  key={`${h.boardId}-${h.periodKey}-${i}`}
                  className="os-cmd-item"
                  onClick={() => go({ type: 'memory', boardId: h.boardId })}
                  style={rowStyle}
                >
                  <span style={{ font: `500 12.5px ${SANS}`, color: 'var(--text)' }}>🧠 {h.periodKey}</span>
                  <span style={rowSnippet}>
                    <Snippet text={h.snippet} />
                  </span>
                </div>
              ))}
            </>
          )}

          {query && showTrans && trans.length > 0 && (
            <>
              <div style={sectionTitle}>Транскрипты чатов</div>
              {trans.map((h, i) => (
                <div
                  key={`${h.shapeId}-${i}`}
                  className="os-cmd-item"
                  onClick={() => go({ type: 'transcript', shapeId: h.shapeId })}
                  style={rowStyle}
                >
                  <span style={{ font: `500 12.5px ${SANS}`, color: 'var(--text)' }}>💬 Диалог</span>
                  <span style={rowSnippet}>{h.snippet}</span>
                </div>
              ))}
            </>
          )}

          {showCmd && cmdHits.length > 0 && (
            <>
              <div style={sectionTitle}>Команды</div>
              {cmdHits.map((c, i) => (
                <div key={i} className="os-cmd-item" onClick={() => go({ type: 'command', run: c.run })} style={rowStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ font: `400 12.5px ${SANS}`, color: 'var(--text)' }}>{c.label}</span>
                    <span style={{ flex: 1 }} />
                    <span style={{ font: `400 10px ${MONO}`, color: 'var(--muted)' }}>{c.hint}</span>
                  </span>
                </div>
              ))}
            </>
          )}

          {query && total === 0 && (
            <div style={{ padding: '14px 12px', font: `400 12.5px ${SANS}`, color: 'var(--muted)' }}>
              Ничего не найдено. Ноды индексируются при открытии/правке доски.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// RAG-модалка
// ─────────────────────────────────────────────────────────────
const RAG_SRC = [
  { id: 's1', title: 'Гипотеза интерфейса', meta: 'заметка · 1.2 КБ', color: 'var(--c-note)' },
  { id: 's2', title: 'спецификация.pdf', meta: 'PDF · 48 стр', color: 'var(--c-img)' },
  { id: 's3', title: 'интервью.mp3', meta: 'аудио · 14 мин · транскрипт', color: 'var(--c-media)' },
  { id: 's4', title: 'habr.com/статья', meta: 'веб-ссылка', color: 'var(--c-code)' }
]

export function RagModal({
  open,
  onClose,
  onToast
}: {
  open: boolean
  onClose: () => void
  onToast: (m: string) => void
}) {
  const [name, setName] = useState('Проект Альфа')
  const [sel, setSel] = useState<Record<string, boolean>>({ s1: true, s2: true, s3: false, s4: true })
  const [pct, setPct] = useState(-1)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
    },
    []
  )
  if (!open) return null

  const start = () => {
    if (pct >= 0 && pct < 100) return
    setPct(0)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      setPct((p) => {
        const n = p + 3
        if (n >= 100) {
          if (timer.current) clearInterval(timer.current)
          setTimeout(() => {
            setPct(-1)
            onClose()
            onToast(`RAG-проект «${name}» создан — контекст изолирован`)
          }, 350)
          return 100
        }
        return n
      })
    }, 60)
  }

  return (
    <div onMouseDown={onClose} style={modalBackdrop}>
      <div
        onMouseDown={stop}
        style={{
          width: 460,
          maxWidth: '92vw',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,.6)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}
      >
        <div>
          <div style={{ font: `600 16px ${SANS}`, color: 'var(--text)' }}>Новый RAG-проект</div>
          <div style={{ font: `400 12px ${SANS}`, color: 'var(--muted)', marginTop: 3 }}>
            Источники, выделенные на холсте — изолированный контекст
          </div>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          style={{
            background: 'var(--panel2)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            font: `400 13px ${SANS}`,
            padding: '9px 12px',
            outline: 'none'
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {RAG_SRC.map((s) => {
            const on = !!sel[s.id]
            return (
              <div
                key={s.id}
                onClick={() => setSel((p) => ({ ...p, [s.id]: !p[s.id] }))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 11px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--panel2)',
                  cursor: 'pointer'
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    flex: 'none',
                    borderRadius: 4,
                    border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                    background: on ? 'var(--accent)' : 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--bg)',
                    fontSize: 10,
                    fontWeight: 700
                  }}
                >
                  {on ? '✓' : ''}
                </div>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ font: `500 12px ${SANS}`, color: 'var(--text)' }}>{s.title}</div>
                  <div style={{ font: `400 10px ${MONO}`, color: 'var(--muted)' }}>{s.meta}</div>
                </div>
              </div>
            )
          })}
        </div>
        {pct >= 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ height: 6, background: 'var(--panel2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)' }} />
            </div>
            <div style={{ font: `400 10.5px ${MONO}`, color: 'var(--muted)' }}>
              Векторизация · nomic-embed · {pct}%
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            className="os-btn"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 14px',
              font: `500 12px ${SANS}`,
              color: 'var(--muted)'
            }}
          >
            Отмена
          </button>
          <button
            className="os-btn"
            onClick={start}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 14px',
              font: `500 12px ${SANS}`,
              color: 'var(--bg)'
            }}
          >
            Создать изолированный контекст
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Граф знаний
// ─────────────────────────────────────────────────────────────
type GNode = { id: string; label: string; x: number; y: number; d: number; tag: string }
const G_DATA: GNode[] = [
  { id: 'a', label: 'Проект Альфа', x: 50, y: 42, d: 5, tag: 'проект' },
  { id: 'b', label: 'Исследование', x: 30, y: 28, d: 3, tag: 'исследование' },
  { id: 'c', label: 'Идеи', x: 68, y: 26, d: 3, tag: 'идеи' },
  { id: 'd', label: 'Заметка 12', x: 20, y: 52, d: 2, tag: 'исследование' },
  { id: 'e', label: 'Источники', x: 40, y: 70, d: 2, tag: 'проект' },
  { id: 'f', label: 'Черновик', x: 62, y: 64, d: 2, tag: 'идеи' },
  { id: 'g', label: 'Литобзор', x: 12, y: 34, d: 1, tag: 'исследование' },
  { id: 'h', label: 'Датасет', x: 80, y: 44, d: 2, tag: 'проект' },
  { id: 'i', label: 'Гипотезы', x: 84, y: 70, d: 1, tag: 'идеи' },
  { id: 'j', label: 'Архив', x: 12, y: 74, d: 1, tag: 'проект' }
]
const G_LINKS: [string, string][] = [
  ['a', 'b'], ['a', 'c'], ['a', 'e'], ['a', 'h'], ['a', 'f'],
  ['b', 'd'], ['b', 'g'], ['c', 'f'], ['c', 'i'], ['e', 'j'], ['h', 'i'], ['d', 'e']
]
const G_TAGS = [
  { id: 'all', label: 'Все' },
  { id: 'проект', label: '#проект' },
  { id: 'исследование', label: '#исследование' },
  { id: 'идеи', label: '#идеи' }
]

export function GraphOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [hover, setHover] = useState<string | null>(null)
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [filter, setFilter] = useState('all')
  if (!open) return null

  const pos: Record<string, GNode> = {}
  G_DATA.forEach((g) => (pos[g.id] = g))
  const neighbors = (id: string) => {
    const set: Record<string, boolean> = { [id]: true }
    G_LINKS.forEach(([u, v]) => {
      if (u === id) set[v] = true
      if (v === id) set[u] = true
    })
    return set
  }
  const nb = hover ? neighbors(hover) : null
  const passF = (g: GNode) => filter === 'all' || g.tag === filter
  const hovered = hover ? pos[hover] : null

  return (
    <div style={backdrop}>
      <div style={overlayHeader}>
        <div style={{ font: `600 15px ${SANS}`, color: 'var(--text)' }}>Граф знаний</div>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        {G_TAGS.map((t) => {
          const on = filter === t.id
          return (
            <button
              key={t.id}
              className="os-btn"
              onClick={() => setFilter(t.id)}
              style={{
                font: `500 11px ${SANS}`,
                color: on ? 'var(--accent)' : 'var(--muted)',
                background: on ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 20,
                padding: '4px 12px'
              }}
            >
              {t.label}
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <div
          style={{
            display: 'flex',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 7,
            overflow: 'hidden'
          }}
        >
          {(['2d', '3d'] as const).map((m) => {
            const on = mode === m
            return (
              <button
                key={m}
                className="os-btn"
                onClick={() => setMode(m)}
                style={{
                  border: 'none',
                  padding: '5px 12px',
                  font: `500 11px ${MONO}`,
                  background: on ? 'var(--accent-dim)' : 'transparent',
                  color: on ? 'var(--accent)' : 'var(--muted)'
                }}
              >
                {m.toUpperCase()}
              </button>
            )
          })}
        </div>
        <button className="os-btn" onClick={onClose} style={closeBtn}>
          ✕
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: '7% 9%',
            transform: mode === '3d' ? 'perspective(1100px) rotateX(32deg)' : 'none',
            transition: 'transform .6s cubic-bezier(.2,.8,.2,1)'
          }}
        >
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
            {G_LINKS.map(([u, v], i) => {
              const lit = hover ? u === hover || v === hover : passF(pos[u]) && passF(pos[v])
              return (
                <line
                  key={i}
                  x1={`${pos[u].x}%`}
                  y1={`${pos[u].y}%`}
                  x2={`${pos[v].x}%`}
                  y2={`${pos[v].y}%`}
                  stroke={lit && hover ? 'var(--accent)' : 'var(--edge)'}
                  strokeWidth={lit && hover ? 1.6 : 1}
                  opacity={lit ? 0.9 : 0.12}
                />
              )
            })}
          </svg>
          {G_DATA.map((g) => {
            const pass = passF(g)
            const lit = hover ? !!nb![g.id] : pass
            const litBorder = (hover && nb![g.id]) || (!hover && pass)
            return (
              <div
                key={g.id}
                onMouseEnter={() => setHover(g.id)}
                onMouseLeave={() => setHover(null)}
                style={{
                  position: 'absolute',
                  left: `${g.x}%`,
                  top: `${g.y}%`,
                  transform: 'translate(-50%,-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  opacity: lit ? 1 : 0.14,
                  cursor: 'pointer',
                  transition: 'opacity .18s'
                }}
              >
                <div
                  style={{
                    width: 12 + g.d * 6,
                    height: 12 + g.d * 6,
                    borderRadius: '50%',
                    background: g.id === hover ? 'var(--accent)' : 'var(--panel2)',
                    border: `2px solid ${litBorder ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: g.id === hover ? '0 0 18px rgba(34,211,238,.5)' : 'none'
                  }}
                />
                <div style={{ font: `500 10.5px ${MONO}`, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {g.label}
                </div>
              </div>
            )
          })}
        </div>
        {hovered && (
          <div
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              width: 230,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              pointerEvents: 'none'
            }}
          >
            <div style={{ font: `600 13px ${SANS}`, color: 'var(--text)' }}>{hovered.label}</div>
            <div style={{ font: `400 10.5px ${MONO}`, color: 'var(--accent)' }}>
              #{hovered.tag} · связей: {hovered.d}
            </div>
            <div style={{ font: `400 11px ${SANS}`, lineHeight: 1.5, color: 'var(--muted)' }}>
              Мини-превью заметки: первые строки содержимого для быстрой ориентации в графе…
            </div>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 14,
            font: `400 10.5px ${MONO}`,
            color: 'var(--muted)'
          }}
        >
          узлы: заметки · рёбра: wiki-связи · размер = число связей · Esc — закрыть
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Студия агентов
// ─────────────────────────────────────────────────────────────
const AG_TOOLS = [
  { id: 'notes', title: 'Доступ к заметкам', meta: 'чтение' },
  { id: 'rag', title: 'Поиск в RAG-контексте', meta: 'Проект Альфа' },
  { id: 'tg', title: 'Отправка в Telegram', meta: 'бот' },
  { id: 'img', title: 'Генерация изображений', meta: 'ComfyUI' }
]

export function AgentsStudio({
  open,
  onClose,
  onToast
}: {
  open: boolean
  onClose: () => void
  onToast: (m: string) => void
}) {
  const [name, setName] = useState('Утренняя сводка')
  const [trig, setTrig] = useState<'cron' | 'event' | 'manual'>('cron')
  const [cron, setCron] = useState('0 9 * * *')
  const [sel, setSel] = useState<Record<string, boolean>>({ notes: true, rag: true, tg: true, img: false })
  if (!open) return null

  const trigBtn = (id: 'cron' | 'event' | 'manual', label: string) => {
    const on = trig === id
    return (
      <button
        className="os-btn"
        onClick={() => setTrig(id)}
        style={{
          flex: 1,
          font: `500 11px ${SANS}`,
          color: on ? 'var(--accent)' : 'var(--muted)',
          background: on ? 'var(--accent-dim)' : 'transparent',
          border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 7,
          padding: '7px 0'
        }}
      >
        {label}
      </button>
    )
  }
  const card: CSSProperties = {
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
  const label: CSSProperties = { font: `500 10px ${MONO}`, color: 'var(--muted)', letterSpacing: '.05em' }
  const field: CSSProperties = {
    background: 'var(--panel2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    font: `400 13px ${SANS}`,
    padding: '9px 12px',
    outline: 'none'
  }

  return (
    <div style={backdrop}>
      <div style={overlayHeader}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-code)' }} />
        <div style={{ font: `600 15px ${SANS}`, color: 'var(--text)' }}>Студия агентов</div>
        <span
          style={{
            font: `500 10px ${MONO}`,
            color: 'var(--muted)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            padding: '2px 8px',
            borderRadius: 4
          }}
        >
          конструктор
        </span>
        <div style={{ flex: 1 }} />
        <button className="os-btn" onClick={onClose} style={closeBtn}>
          ✕
        </button>
      </div>
      <div
        className="os-scroll"
        style={{ flex: 1, display: 'flex', gap: 20, padding: 20, overflow: 'auto', justifyContent: 'center' }}
      >
        {/* Форма */}
        <div style={{ width: 400, flex: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={card}>
            <div style={label}>ИМЯ АГЕНТА</div>
            <input value={name} onChange={(e) => setName(e.currentTarget.value)} style={field} />
          </div>
          <div style={card}>
            <div style={label}>СИСТЕМНЫЙ ПРОМПТ</div>
            <textarea
              rows={4}
              defaultValue="Каждое утро собирай новые заметки с тегом #проект, суммируй изменения и присылай краткую сводку."
              style={{ ...field, font: `400 12.5px ${SANS}`, lineHeight: 1.55, resize: 'vertical' }}
            />
          </div>
          <div style={{ ...card, gap: 10 }}>
            <div style={label}>ТРИГГЕР ЗАПУСКА</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {trigBtn('cron', 'По расписанию')}
              {trigBtn('event', 'По событию')}
              {trigBtn('manual', 'Вручную')}
            </div>
            {trig === 'cron' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  value={cron}
                  onChange={(e) => setCron(e.currentTarget.value)}
                  style={{
                    width: 110,
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    borderRadius: 7,
                    color: 'var(--accent)',
                    font: `400 12px ${MONO}`,
                    padding: '7px 10px',
                    outline: 'none'
                  }}
                />
                <span style={{ font: `400 11px ${SANS}`, color: 'var(--muted)' }}>ежедневно в 09:00</span>
              </div>
            )}
            {trig === 'event' && (
              <div style={{ font: `400 11.5px ${SANS}`, color: 'var(--muted)' }}>
                Запуск при появлении новой заметки с тегом{' '}
                <span style={{ color: 'var(--c-note)', fontFamily: MONO }}>#проект</span>
              </div>
            )}
          </div>
          <div style={card}>
            <div style={label}>ДОСТУПНЫЕ ИНСТРУМЕНТЫ</div>
            {AG_TOOLS.map((t) => {
              const on = !!sel[t.id]
              return (
                <div
                  key={t.id}
                  onClick={() => setSel((p) => ({ ...p, [t.id]: !p[t.id] }))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--panel2)',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      flex: 'none',
                      borderRadius: 4,
                      border: `1.5px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      background: on ? 'var(--accent)' : 'transparent',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--bg)',
                      fontSize: 10,
                      fontWeight: 700
                    }}
                  >
                    {on ? '✓' : ''}
                  </div>
                  <div style={{ flex: 1, font: `500 12px ${SANS}`, color: 'var(--text)' }}>{t.title}</div>
                  <span style={{ font: `400 10px ${MONO}`, color: 'var(--muted)' }}>{t.meta}</span>
                </div>
              )
            })}
          </div>
          <button
            className="os-btn"
            onClick={() => {
              onClose()
              onToast(`Агент «${name}» сохранён и ждёт триггера`)
            }}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: 9,
              padding: 11,
              font: `500 13px ${SANS}`,
              color: 'var(--bg)'
            }}
          >
            Сохранить агента
          </button>
        </div>
        {/* Превью */}
        <div style={{ width: 340, flex: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ ...label, padding: '4px 2px' }}>ПРЕВЬЮ УВЕДОМЛЕНИЙ</div>
          {[
            {
              time: '09:00 · Telegram',
              op: 1,
              body: 'Сводка за сутки: 3 новые заметки с тегом #проект, 1 обновление в RAG-контексте. Ключевая тема — структура графа.',
              pill: true
            },
            {
              time: 'вчера',
              op: 0.65,
              body: 'Отчёт: за неделю добавлено 11 заметок, граф вырос на 4 узла. Черновик «Гипотезы» не обновлялся 6 дней.',
              pill: false
            }
          ].map((n, i) => (
            <div
              key={i}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                opacity: n.op
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--accent)',
                    font: `600 9px ${MONO}`
                  }}
                >
                  АГ
                </div>
                <div style={{ font: `500 12px ${SANS}`, color: 'var(--text)' }}>{name}</div>
                <div style={{ flex: 1 }} />
                <span style={{ font: `400 10px ${MONO}`, color: 'var(--muted)' }}>{n.time}</span>
              </div>
              <div style={{ font: `400 12px ${SANS}`, lineHeight: 1.55, color: 'var(--muted)' }}>{n.body}</div>
              {n.pill && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <span
                    style={{
                      font: `500 10px ${MONO}`,
                      color: 'var(--accent)',
                      background: 'var(--accent-dim)',
                      padding: '3px 8px',
                      borderRadius: 4
                    }}
                  >
                    открыть на холсте
                  </span>
                </div>
              )}
            </div>
          ))}
          <div style={{ font: `400 10.5px ${MONO}`, lineHeight: 1.5, color: 'var(--muted)', padding: 2 }}>
            агент работает локально · результаты возвращаются нодами на холст
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Генеративная студия
// ─────────────────────────────────────────────────────────────
const GS_CHAIN = [
  { name: 'Checkpoint', sub: 'sdxl_1.0' },
  { name: 'CLIP Encode', sub: 'промпт' },
  { name: 'KSampler', sub: '30 · euler' },
  { name: 'VAE Decode', sub: 'latent→px' },
  { name: 'Результат', sub: 'на холст' }
]

export function GenStudio({
  open,
  onClose,
  onToCanvas
}: {
  open: boolean
  onClose: () => void
  onToCanvas: () => void
}) {
  const [state, setState] = useState<'idle' | 'working' | 'done'>('idle')
  const [pct, setPct] = useState(-1)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current)
    },
    []
  )
  if (!open) return null

  const start = () => {
    if (state === 'working') return
    setState('working')
    setPct(0)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => {
      setPct((p) => {
        const n = p + 3
        if (n >= 100) {
          if (timer.current) clearInterval(timer.current)
          setState('done')
          return 100
        }
        return n
      })
    }, 80)
  }
  const busy = state === 'working'
  const stepIdx = busy ? Math.min(4, Math.floor(Math.max(0, pct) / 22)) : state === 'done' ? 5 : -1
  const chip = (label: string, on = false): CSSProperties => ({
    font: `500 10.5px ${MONO}`,
    color: on ? 'var(--accent)' : 'var(--muted)',
    background: on ? 'var(--accent-dim)' : 'var(--panel)',
    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
    padding: '4px 10px',
    borderRadius: 5
  })
  const block: CSSProperties = {
    width: 760,
    maxWidth: '100%',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 18
  }
  const blockLabel: CSSProperties = { font: `500 10px ${MONO}`, color: 'var(--muted)', letterSpacing: '.05em' }

  return (
    <div style={backdrop}>
      <div style={overlayHeader}>
        <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--c-img)' }} />
        <div style={{ font: `600 15px ${SANS}`, color: 'var(--text)' }}>Генеративная студия</div>
        <span
          style={{
            font: `500 10px ${MONO}`,
            color: 'var(--muted)',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            padding: '2px 8px',
            borderRadius: 4
          }}
        >
          ComfyUI · локально
        </span>
        <div style={{ flex: 1 }} />
        <button className="os-btn" onClick={onClose} style={closeBtn}>
          ✕
        </button>
      </div>
      <div
        className="os-scroll"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          padding: 22,
          overflow: 'auto',
          alignItems: 'center'
        }}
      >
        <div style={{ width: 760, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Промпт: что сгенерировать…"
              defaultValue="Изометрическая схема рабочего пространства, неоновые акценты"
              style={{
                flex: 1,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                color: 'var(--text)',
                font: `400 13px ${SANS}`,
                padding: '10px 14px',
                outline: 'none'
              }}
            />
            <button
              className="os-btn"
              onClick={start}
              style={{
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 9,
                padding: '10px 18px',
                font: `500 13px ${SANS}`,
                color: 'var(--bg)'
              }}
            >
              Сгенерировать
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={chip('SDXL 1.0', true)}>SDXL 1.0</span>
            <span style={chip('1024 × 1024')}>1024 × 1024</span>
            <span style={chip('30 шагов')}>30 шагов</span>
            <span style={chip('CFG 7.0')}>CFG 7.0</span>
            <span style={chip('seed: 42')}>seed: 42</span>
          </div>
        </div>
        {/* Воркфлоу */}
        <div style={block}>
          <div style={{ ...blockLabel, marginBottom: 14 }}>JSON-ВОРКФЛОУ · 5 НОД</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {GS_CHAIN.map((w, i) => {
              const on = i <= stepIdx || state === 'done'
              const lineOn = i < stepIdx || state === 'done'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: 'var(--panel2)',
                      border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 8,
                      padding: '9px 6px',
                      textAlign: 'center'
                    }}
                  >
                    <div
                      style={{
                        font: `500 10px ${MONO}`,
                        color: on ? 'var(--accent)' : 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {w.name}
                    </div>
                    <div
                      style={{
                        font: `400 9px ${MONO}`,
                        color: 'var(--muted)',
                        marginTop: 3,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {w.sub}
                    </div>
                  </div>
                  {i !== 4 && (
                    <div
                      style={{
                        width: 22,
                        flex: 'none',
                        height: 1.5,
                        background: lineOn ? 'var(--accent)' : 'var(--edge)'
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        {/* Результат */}
        <div style={{ ...block, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={blockLabel}>РЕЗУЛЬТАТ</div>
          {busy && (
            <>
              <div style={{ height: 6, background: 'var(--panel2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max(0, pct)}%`, background: 'var(--accent)' }} />
              </div>
              <div style={{ font: `400 10.5px ${MONO}`, color: 'var(--muted)' }}>
                KSampler · шаг {Math.min(30, Math.round(Math.max(0, pct) * 0.3))}/30 · VRAM 21.7 ГБ
              </div>
            </>
          )}
          {state === 'done' && (
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 180,
                  height: 180,
                  flex: 'none',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background:
                    'repeating-linear-gradient(45deg,var(--bg) 0 10px,var(--panel2) 10px 20px)',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                <span style={{ font: `400 9px ${MONO}`, color: 'var(--muted)' }}>результат 1024²</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ font: `400 12px ${SANS}`, lineHeight: 1.5, color: 'var(--muted)' }}>
                  Генерация завершена за 14.2 с. Изображение можно вернуть на холст новой нодой — связь с
                  этой студией сохранится.
                </div>
                <button
                  className="os-btn"
                  onClick={onToCanvas}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'var(--accent)',
                    border: 'none',
                    borderRadius: 7,
                    padding: '8px 14px',
                    font: `500 12px ${SANS}`,
                    color: 'var(--bg)'
                  }}
                >
                  → На холст новой нодой
                </button>
              </div>
            </div>
          )}
          {state === 'idle' && (
            <div style={{ font: `400 12px ${SANS}`, color: 'var(--muted)' }}>
              Нажмите «Сгенерировать» — воркфлоу выполнится локально, статус виден в статус-баре.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Мобильный / туннельный вид
// ─────────────────────────────────────────────────────────────
function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 320,
        height: 660,
        borderRadius: 44,
        overflow: 'hidden',
        position: 'relative',
        background: '#0E0F12',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 10px #16181d, 0 0 0 11px #000',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Динамический островок */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 104,
          height: 30,
          borderRadius: 20,
          background: '#000',
          zIndex: 5
        }}
      />
      {/* Статус-бар */}
      <div
        style={{
          height: 44,
          flex: 'none',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '0 22px 6px',
          font: `600 13px ${SANS}`,
          color: '#E7EAF0'
        }}
      >
        <span>9:41</span>
        <span style={{ font: `500 11px ${MONO}`, color: '#8B93A3' }}>ОС · Туннель</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      {/* Home indicator */}
      <div style={{ height: 22, flex: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ width: 120, height: 5, borderRadius: 100, background: 'rgba(255,255,255,0.6)' }} />
      </div>
    </div>
  )
}

export function MobileView({
  open,
  onClose,
  onToast,
  onToCanvas
}: {
  open: boolean
  onClose: () => void
  onToast: (m: string) => void
  onToCanvas: () => void
}) {
  if (!open) return null
  const incoming = [
    {
      dot: '#4ADE80',
      title: 'Пересланная статья',
      time: '12:40',
      body: 'Ссылка на материал по локальным векторным базам — добавить в RAG?'
    },
    {
      dot: '#F472B6',
      title: 'Голосовое · 0:37',
      time: '09:12',
      body: 'Транскрибировано: «Проверить идею с таймлайном на выходных…»'
    }
  ]
  const recent = [
    { c: '#4ADE80', t: 'Гипотеза интерфейса' },
    { c: '#22D3EE', t: 'ИИ-ассистент' },
    { c: '#FBBF24', t: 'анализ.py' }
  ]
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 65,
        background: 'rgba(5,6,9,.72)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 34
      }}
    >
      <div onMouseDown={stop} style={{ width: 250, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ font: `600 16px ${SANS}`, color: 'var(--text)' }}>Доступ с телефона</div>
        <div style={{ font: `400 12px ${SANS}`, lineHeight: 1.6, color: 'var(--muted)' }}>
          Холст остаётся на рабочей машине — телефон подключается к ней напрямую, без облака.
        </div>
        {[
          { c: '#4ADE80', t: 'Tailscale · подключено' },
          { c: 'var(--accent)', t: 'Telegram-бот · входящие → холст' }
        ].map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 9,
              padding: '9px 12px'
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.c }} />
            <span style={{ font: `500 11px ${MONO}`, color: 'var(--text)' }}>{r.t}</span>
          </div>
        ))}
        <div style={{ font: `400 10.5px ${MONO}`, color: 'var(--muted)' }}>Esc — закрыть</div>
      </div>
      <div onMouseDown={stop} style={{ flex: 'none', transform: 'scale(0.92)' }}>
        <DeviceFrame>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: 14,
              background: '#0E0F12',
              minHeight: '100%'
            }}
          >
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Быстрая заметка на холст…"
                style={{
                  flex: 1,
                  background: '#1B1E24',
                  border: '1px solid #272B34',
                  borderRadius: 10,
                  color: '#E7EAF0',
                  font: `400 13px ${SANS}`,
                  padding: '10px 12px',
                  outline: 'none'
                }}
              />
              <button
                className="os-btn"
                onClick={() => onToast('Заметка отправлена на холст через туннель')}
                style={{ width: 40, border: 'none', borderRadius: 10, background: '#22D3EE', color: '#0E0F12', fontSize: 15 }}
              >
                ↑
              </button>
            </div>
            <div style={{ font: `500 10px ${MONO}`, color: '#8B93A3', letterSpacing: '.05em', marginTop: 4 }}>
              ВХОДЯЩИЕ · TELEGRAM
            </div>
            {incoming.map((m, i) => (
              <div
                key={i}
                style={{
                  background: '#15171C',
                  border: '1px solid #272B34',
                  borderRadius: 11,
                  padding: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 7
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 2, background: m.dot }} />
                  <span style={{ font: `500 11.5px ${SANS}`, color: '#E7EAF0' }}>{m.title}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ font: `400 9.5px ${MONO}`, color: '#8B93A3' }}>{m.time}</span>
                </div>
                <div style={{ font: `400 11.5px ${SANS}`, lineHeight: 1.5, color: '#8B93A3' }}>{m.body}</div>
                <button
                  className="os-btn"
                  onClick={() => {
                    onClose()
                    onToCanvas()
                    onToast('Входящее из Telegram добавлено нодой на холст')
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    font: `500 10.5px ${SANS}`,
                    color: '#22D3EE',
                    background: 'rgba(34,211,238,.13)',
                    border: '1px solid #22D3EE',
                    borderRadius: 6,
                    padding: '4px 10px'
                  }}
                >
                  → Нодой на холст
                </button>
              </div>
            ))}
            <div style={{ font: `500 10px ${MONO}`, color: '#8B93A3', letterSpacing: '.05em', marginTop: 4 }}>
              НЕДАВНЕЕ НА ХОЛСТЕ
            </div>
            <div style={{ background: '#15171C', border: '1px solid #272B34', borderRadius: 11, overflow: 'hidden' }}>
              {recent.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '10px 12px',
                    borderBottom: i < recent.length - 1 ? '1px solid #272B34' : 'none'
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: r.c }} />
                  <span style={{ font: `400 12px ${SANS}`, color: '#E7EAF0' }}>{r.t}</span>
                </div>
              ))}
            </div>
          </div>
        </DeviceFrame>
      </div>
    </div>
  )
}
