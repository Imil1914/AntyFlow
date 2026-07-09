// Режим-хранилище в стиле Obsidian: полноэкранный оверлей поверх холста.
// Слева — дерево папок/заметок, по центру — live-preview редактор, справа — бэклинки
// и оглавление. Заметки — реальные .md на диске (совместимо с настоящим Obsidian).
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VaultEntry } from '../flow-api'
import { FileTree } from './FileTree'
import { MarkdownEditor, type NoteRef } from './MarkdownEditor'
import { GraphPanel, type GraphNode, type GraphEdge } from './GraphPanel'
import MarkdownView from '../components/MarkdownView'

// Плоский список заметок (для автодополнения/резолва ссылок)
function flatten(entries: VaultEntry[], acc: NoteRef[] = []): NoteRef[] {
  for (const e of entries) {
    if (e.type === 'file') acc.push({ name: e.name.replace(/\.md$/i, ''), path: e.path })
    else if (e.children) flatten(e.children, acc)
  }
  return acc
}
function baseOf(path: string): string {
  return (path.split('/').pop() || path).replace(/\.md$/i, '')
}
function dirOf(path: string): string {
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}
const linkTargets = (text: string): string[] => {
  const out: string[] = []
  const re = /\[\[([^\]\n]+?)\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m[1].split('|')[0].split('#')[0].trim().toLowerCase())
  return out
}

type Ctx = { x: number; y: number; entry: VaultEntry | null } | null

export function VaultView({
  open,
  onClose,
  onToast
}: {
  open: boolean
  onClose: () => void
  onToast: (m: string) => void
}): JSX.Element | null {
  const [root, setRoot] = useState<string>('')
  const [tree, setTree] = useState<VaultEntry[]>([])
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [ctx, setCtx] = useState<Ctx>(null)
  const [filter, setFilter] = useState('')
  const [reading, setReading] = useState(false)
  const [showGraph, setShowGraph] = useState(false)
  const [index, setIndex] = useState<Map<string, string[]>>(new Map())

  const valueRef = useRef('')
  const currentRef = useRef<string | null>(null)
  const saveTimer = useRef<number | null>(null)
  valueRef.current = value
  currentRef.current = currentPath

  const notes = useMemo(() => flatten(tree), [tree])

  const refreshTree = useCallback(async () => {
    const r = await window.flow.vaultTree()
    setRoot(r.root)
    setTree(r.tree)
  }, [])

  // Загрузка при открытии + подписка на внешние изменения на диске
  useEffect(() => {
    if (!open) return
    window.flow.vaultRoot().then((r) => {
      setRoot(r.root)
      if (r.root) refreshTree()
    })
    const off = window.flow.onVaultChanged(() => refreshTree())
    return off
  }, [open, refreshTree])

  // Индекс бэклинков: читаем все заметки и парсим [[ссылки]]
  const rebuildIndex = useCallback(async (list: NoteRef[]) => {
    const map = new Map<string, string[]>()
    await Promise.all(
      list.map(async (n) => {
        const r = await window.flow.vaultRead({ path: n.path })
        if (!r.ok) return
        for (const target of new Set(linkTargets(r.content))) {
          const arr = map.get(target) || []
          arr.push(n.path)
          map.set(target, arr)
        }
      })
    )
    setIndex(map)
  }, [])

  useEffect(() => {
    if (!open || !root) return
    const t = window.setTimeout(() => rebuildIndex(notes), 300)
    return () => window.clearTimeout(t)
  }, [open, root, notes, rebuildIndex])

  // Развернуть все папки-предки пути
  const expandAncestors = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      const parts = path.split('/')
      let acc = ''
      for (let i = 0; i < parts.length - 1; i++) {
        acc = acc ? acc + '/' + parts[i] : parts[i]
        next.add(acc)
      }
      return next
    })
  }, [])

  const flushSave = useCallback(() => {
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const p = currentRef.current
    if (p) window.flow.vaultWrite({ path: p, content: valueRef.current })
  }, [])

  const openFile = useCallback(
    async (path: string) => {
      if (currentRef.current === path) return
      flushSave() // сохранить предыдущую перед переключением
      const r = await window.flow.vaultRead({ path })
      if (!r.ok) {
        onToast('Не удалось открыть заметку')
        return
      }
      setCurrentPath(path)
      setValue(r.content)
      expandAncestors(path)
    },
    [flushSave, expandAncestors, onToast]
  )

  const onEditorChange = useCallback((doc: string) => {
    if (doc === valueRef.current) return // программная загрузка — не считаем правкой
    setValue(doc)
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      const p = currentRef.current
      if (p) window.flow.vaultWrite({ path: p, content: doc })
    }, 600)
  }, [])

  // Переход по [[вики-ссылке]]: найти заметку по имени, иначе создать
  const openLink = useCallback(
    async (target: string) => {
      const found = notes.find((n) => n.name.toLowerCase() === target.toLowerCase())
      if (found) {
        openFile(found.path)
        return
      }
      const dir = currentRef.current ? dirOf(currentRef.current) : ''
      const res = await window.flow.vaultCreate({ dir, name: target, content: `# ${target}\n\n` })
      if (res.ok) {
        await refreshTree()
        openFile(res.path)
        onToast('Создана заметка «' + target + '»')
      }
    },
    [notes, openFile, refreshTree, onToast]
  )

  // Создание заметки/папки
  const newNote = useCallback(
    async (dir = '') => {
      const res = await window.flow.vaultCreate({ dir, name: 'Без названия', content: '' })
      if (res.ok) {
        await refreshTree()
        expandAncestors(res.path)
        openFile(res.path)
        setRenaming(res.path)
      }
    },
    [refreshTree, expandAncestors, openFile]
  )
  const newFolder = useCallback(
    async (dir = '') => {
      const res = await window.flow.vaultMkdir({ dir, name: 'Новая папка' })
      if (res.ok) {
        await refreshTree()
        expandAncestors(res.path + '/x')
        setRenaming(res.path)
      }
    },
    [refreshTree, expandAncestors]
  )

  const pickVault = useCallback(async () => {
    const r = await window.flow.vaultPick()
    if (r.ok && r.root) {
      setRoot(r.root)
      setCurrentPath(null)
      setValue('')
      await refreshTree()
      onToast('Хранилище: ' + r.root)
    }
  }, [refreshTree, onToast])

  const doRename = useCallback(
    async (entry: VaultEntry, name: string) => {
      setRenaming(null)
      if (!name.trim() || name === entry.name.replace(/\.md$/i, '')) return
      const res = await window.flow.vaultRename({ path: entry.path, name })
      if (res.ok) {
        if (currentRef.current === entry.path) {
          setCurrentPath(res.path)
        }
        await refreshTree()
      } else {
        onToast(res.error || 'Не удалось переименовать')
      }
    },
    [refreshTree, onToast]
  )

  const doDelete = useCallback(
    async (entry: VaultEntry) => {
      const res = await window.flow.vaultDelete({ path: entry.path })
      if (res.ok) {
        if (currentRef.current === entry.path || currentRef.current?.startsWith(entry.path + '/')) {
          setCurrentPath(null)
          setValue('')
        }
        await refreshTree()
      } else onToast(res.error || 'Не удалось удалить')
    },
    [refreshTree, onToast]
  )

  const doMove = useCallback(
    async (src: string, destDir: string) => {
      const res = await window.flow.vaultMove({ path: src, destDir })
      if (res.ok) {
        if (currentRef.current === src) setCurrentPath(res.path)
        await refreshTree()
      } else onToast(res.error || 'Не удалось переместить')
    },
    [refreshTree, onToast]
  )

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  // Закрытие контекст-меню по клику вне
  useEffect(() => {
    if (!ctx) return
    const h = (): void => setCtx(null)
    window.addEventListener('click', h)
    return () => window.removeEventListener('click', h)
  }, [ctx])

  // Ctrl+S — сохранить сейчас, Esc — закрыть
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault()
        flushSave()
        onToast('Сохранено')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, flushSave, onToast])

  // Фильтр дерева по имени
  const filteredTree = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return tree
    const walk = (entries: VaultEntry[]): VaultEntry[] => {
      const out: VaultEntry[] = []
      for (const e of entries) {
        if (e.type === 'dir') {
          const kids = walk(e.children || [])
          if (kids.length || e.name.toLowerCase().includes(q)) out.push({ ...e, children: kids })
        } else if (e.name.toLowerCase().includes(q)) out.push(e)
      }
      return out
    }
    return walk(tree)
  }, [tree, filter])

  // Автораскрытие всех папок при активном фильтре
  const effExpanded = useMemo(() => {
    if (!filter.trim()) return expanded
    const s = new Set<string>()
    const walk = (entries: VaultEntry[]): void => {
      for (const e of entries) if (e.type === 'dir') {
        s.add(e.path)
        walk(e.children || [])
      }
    }
    walk(filteredTree)
    return s
  }, [filter, expanded, filteredTree])

  const backlinks = useMemo(() => {
    if (!currentPath) return [] as string[]
    return index.get(baseOf(currentPath).toLowerCase()) || []
  }, [index, currentPath])

  const outline = useMemo(() => {
    const lines = value.split('\n')
    const heads: { level: number; text: string }[] = []
    for (const ln of lines) {
      const m = /^(#{1,6})\s+(.*)$/.exec(ln)
      if (m) heads.push({ level: m[1].length, text: m[2].trim() })
    }
    return heads
  }, [value])

  // Данные графа связей: узлы — заметки, рёбра — [[ссылки]] (из индекса, без чтений)
  const graph = useMemo(() => {
    const nameToPath = new Map(notes.map((n) => [n.name.toLowerCase(), n.path]))
    const seen = new Set<string>()
    const edges: GraphEdge[] = []
    const deg = new Map<string, number>()
    for (const [target, sources] of index) {
      const tp = nameToPath.get(target)
      if (!tp) continue
      for (const s of sources) {
        if (s === tp) continue
        const key = s < tp ? s + ' ' + tp : tp + ' ' + s
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ s, t: tp })
        deg.set(s, (deg.get(s) || 0) + 1)
        deg.set(tp, (deg.get(tp) || 0) + 1)
      }
    }
    const gnodes: GraphNode[] = notes.map((n) => ({ id: n.path, label: n.name, deg: deg.get(n.path) || 0 }))
    return { nodes: gnodes, edges }
  }, [notes, index])

  if (!open) return null

  return (
    <div style={overlay}>
      <style>{VAULT_CSS}</style>

      {/* Верхняя полоса */}
      <div style={topbar}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--accent)' }}>📓</span> Заметки
        </span>
        <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {root || 'хранилище не выбрано'}
        </span>
        {root && (
          <button
            className={'vault-btn' + (showGraph ? ' vault-btn-accent' : '')}
            onClick={() => setShowGraph((v) => !v)}
            title="Граф связей между заметками"
          >
            🕸 Граф
          </button>
        )}
        <button className="vault-btn" onClick={pickVault} title="Выбрать/сменить папку-хранилище">
          📁 Папка
        </button>
        <button className="vault-btn" onClick={onClose} title="Закрыть (вернуться на холст)">
          ✕
        </button>
      </div>

      {showGraph && root && (
        <GraphPanel
          nodes={graph.nodes}
          edges={graph.edges}
          currentPath={currentPath}
          onOpen={(id) => {
            setShowGraph(false)
            openFile(id)
          }}
          onClose={() => setShowGraph(false)}
        />
      )}

      {!root ? (
        <div style={emptyWrap}>
          <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>Хранилище заметок</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>
            Выбери папку на диске — заметки будут обычными <b>.md</b>-файлами. Ту же папку можно открыть
            в настоящем Obsidian. Поддержка Markdown, LaTeX и <b>[[ссылок]]</b> между заметками.
          </div>
          <button className="vault-btn vault-btn-accent" style={{ marginTop: 16 }} onClick={pickVault}>
            📁 Выбрать папку-хранилище
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {/* Левая панель — дерево */}
          <div style={leftPane}>
            <div style={{ display: 'flex', gap: 6, padding: '8px 8px 6px' }}>
              <input
                className="vault-search"
                placeholder="Поиск…"
                value={filter}
                onChange={(e) => setFilter(e.currentTarget.value)}
              />
              <button className="vault-icon" title="Новая заметка" onClick={() => newNote('')}>
                ＋
              </button>
              <button className="vault-icon" title="Новая папка" onClick={() => newFolder('')}>
                🗀
              </button>
            </div>
            <div
              className="vault-scroll"
              style={{ flex: 1, overflowY: 'auto', padding: '2px 6px 12px' }}
              onContextMenu={(e) => {
                e.preventDefault()
                setCtx({ x: e.clientX, y: e.clientY, entry: null })
              }}
            >
              {filteredTree.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>
                  {filter ? 'Ничего не найдено' : 'Пусто. Создай первую заметку кнопкой ＋'}
                </div>
              ) : (
                <FileTree
                  entries={filteredTree}
                  currentPath={currentPath}
                  expanded={effExpanded}
                  onToggle={toggleExpand}
                  onOpen={(e) => openFile(e.path)}
                  onContext={(e, entry) => setCtx({ x: e.clientX, y: e.clientY, entry })}
                  renaming={renaming}
                  onRenameCommit={doRename}
                  onRenameCancel={() => setRenaming(null)}
                  onMove={doMove}
                />
              )}
            </div>
          </div>

          {/* Центр — редактор */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {currentPath ? (
              <>
                <div style={editorBar}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentPath}
                  </span>
                  <button
                    className={'vault-btn' + (reading ? ' vault-btn-accent' : '')}
                    onClick={() => setReading((v) => !v)}
                    title={reading ? 'Режим правки' : 'Режим чтения'}
                  >
                    {reading ? '✎ Правка' : '👁 Чтение'}
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {reading ? (
                    <div className="vault-scroll" style={{ height: '100%', overflowY: 'auto', padding: '18px 0' }}>
                      <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px' }}>
                        <MarkdownView content={value} />
                      </div>
                    </div>
                  ) : (
                    <MarkdownEditor
                      docId={currentPath}
                      value={value}
                      onChange={onEditorChange}
                      onOpenLink={openLink}
                      notes={notes}
                    />
                  )}
                </div>
              </>
            ) : (
              <div style={emptyWrap}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Выбери заметку слева или создай новую</div>
              </div>
            )}
          </div>

          {/* Правая панель — оглавление и бэклинки */}
          <div style={rightPane}>
            <div style={paneTitle}>Оглавление</div>
            <div className="vault-scroll" style={{ maxHeight: '38%', overflowY: 'auto', padding: '0 10px 10px' }}>
              {outline.length === 0 ? (
                <div style={dim}>— нет заголовков —</div>
              ) : (
                outline.map((h, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--muted)', padding: '2px 0', paddingLeft: (h.level - 1) * 12 }}>
                    {h.text}
                  </div>
                ))
              )}
            </div>
            <div style={{ ...paneTitle, marginTop: 8 }}>Обратные ссылки</div>
            <div className="vault-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 12px' }}>
              {backlinks.length === 0 ? (
                <div style={dim}>— на эту заметку никто не ссылается —</div>
              ) : (
                backlinks.map((p) => (
                  <div key={p} className="vault-backlink" onClick={() => openFile(p)} title={p}>
                    📄 {baseOf(p)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Контекст-меню */}
      {ctx && (
        <div style={{ ...menu, left: ctx.x, top: ctx.y }} onClick={(e) => e.stopPropagation()}>
          {ctx.entry?.type === 'dir' && (
            <>
              <MenuItem label="Новая заметка" onClick={() => { setCtx(null); newNote(ctx.entry!.path) }} />
              <MenuItem label="Новая папка" onClick={() => { setCtx(null); newFolder(ctx.entry!.path) }} />
              <div style={sepLine} />
            </>
          )}
          {!ctx.entry && (
            <>
              <MenuItem label="Новая заметка" onClick={() => { setCtx(null); newNote('') }} />
              <MenuItem label="Новая папка" onClick={() => { setCtx(null); newFolder('') }} />
            </>
          )}
          {ctx.entry && (
            <>
              <MenuItem label="Переименовать" onClick={() => { const en = ctx.entry!; setCtx(null); setRenaming(en.path) }} />
              <MenuItem label="Показать в проводнике" onClick={() => { window.flow.vaultReveal({ path: ctx.entry!.path }); setCtx(null) }} />
              <div style={sepLine} />
              <MenuItem label="Удалить" danger onClick={() => { const en = ctx.entry!; setCtx(null); doDelete(en) }} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }): JSX.Element {
  return (
    <div
      className="vault-menuitem"
      onClick={onClick}
      style={{ padding: '7px 12px', fontSize: 13, cursor: 'pointer', color: danger ? '#ff7b72' : 'var(--text)', borderRadius: 6 }}
    >
      {label}
    </div>
  )
}

// ---- стили ----
const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483000, // поверх UI холста tldraw (у него высокий z-index)
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column'
}
const topbar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 12px',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0
}
const leftPane: React.CSSProperties = {
  width: 260,
  flexShrink: 0,
  borderRight: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: 'var(--panel)'
}
const rightPane: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderLeft: '1px solid var(--border)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  background: 'var(--panel)'
}
const editorBar: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 14px',
  borderBottom: '1px solid var(--border)',
  flexShrink: 0
}
const emptyWrap: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4
}
const paneTitle: React.CSSProperties = {
  padding: '10px 10px 6px',
  fontSize: 10,
  letterSpacing: '.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
  fontWeight: 600
}
const dim: React.CSSProperties = { fontSize: 12, color: 'var(--muted)', padding: '2px 0', opacity: 0.7 }
const menu: React.CSSProperties = {
  position: 'fixed',
  zIndex: 2147483001,
  minWidth: 200,
  background: 'var(--panel)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
  padding: 6
}
const sepLine: React.CSSProperties = { height: 1, background: 'var(--border)', margin: '4px 0' }

const VAULT_CSS = `
.vault-cm { --vault-serif: 'IBM Plex Sans', system-ui, sans-serif; --vault-mono: 'JetBrains Mono', monospace; }
.vault-row:hover { background: rgba(255,255,255,0.05) !important; }
.vault-btn { border:1px solid var(--border); background:var(--panel); color:var(--text); border-radius:7px; font-size:12px; padding:5px 10px; cursor:pointer; white-space:nowrap; }
.vault-btn:hover { border-color: var(--accent); }
.vault-btn-accent { border-color: var(--accent); color: var(--accent); background: rgba(34,211,238,0.10); }
.vault-icon { width:28px; border:1px solid var(--border); background:var(--panel); color:var(--text); border-radius:7px; font-size:13px; cursor:pointer; }
.vault-icon:hover { border-color: var(--accent); }
.vault-search { flex:1; min-width:0; background:var(--field,#12141a); border:1px solid var(--border); border-radius:7px; color:var(--text); font-size:12px; padding:5px 9px; outline:none; }
.vault-search:focus { border-color: var(--accent); }
.vault-menuitem:hover { background: rgba(255,255,255,0.06); }
.vault-backlink { font-size:13px; color:var(--muted); padding:4px 6px; border-radius:6px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.vault-backlink:hover { background: rgba(34,211,238,0.10); color: var(--text); }
.vault-scroll::-webkit-scrollbar { width:10px; height:10px; }
.vault-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius:6px; }
.vault-cm .cm-tooltip.cm-tooltip-autocomplete { background: var(--panel); border:1px solid var(--border); border-radius:8px; }
.vault-cm .cm-tooltip-autocomplete ul li[aria-selected] { background: rgba(34,211,238,0.18); color: var(--text); }
`
