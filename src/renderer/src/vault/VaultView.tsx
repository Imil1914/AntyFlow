// Редактор заметки — полноэкранный оверлей поверх холста.
// Пиксель-в-пиксель по макету «Редактор заметки.dc.html» (Claude Design),
// но подключён к РЕАЛЬНОМУ хранилищу .md на диске (window.flow.vault*) и
// реальному ИИ приложения (window.flow.aiChat / listModels). Совместимо с Obsidian.
//
// Разделы: рельса · левая панель (файлы/теги/корзина) · вкладки · шапка ·
// свойства (frontmatter) · редактор(правка/чтение/сплит) · ИИ-панель ·
// правая панель (календарь/локальный граф/структура/недавнее/бэклинки/похожие/
// статистика/мини-карта) · граф знаний · командная палитра · шаблоны · тост.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { VaultEntry } from '../flow-api'
import { parseBlocks, collapseBlocks, type Block, type CSSVars } from './noteEditorParse'
import { MarkdownEditor, type MarkdownEditorHandle } from './MarkdownEditor'

type NoteRef = { name: string; path: string }

// ---------- утилиты ----------
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
function relDir(path: string, root: string): string[] {
  const d = dirOf(path)
  const rel = root && d.startsWith(root) ? d.slice(root.length).replace(/^[\\/]+/, '') : d
  return rel ? rel.split(/[\\/]+/) : []
}
function hexToRgba(hex: string, a: number): string {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex)
  if (!m) return `rgba(34,211,238,${a})`
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`
}
// Frontmatter YAML в начале файла (--- ... ---)
function parseFrontmatter(md: string): { props: Record<string, string | null>; body: string } {
  const props: Record<string, string | null> = { created: null, tags: null, source: null, author: null }
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md)
  if (m) {
    m[1].split(/\r?\n/).forEach((line) => {
      const kv = /^([\w-]+)\s*:\s*(.*)$/.exec(line.trim())
      if (kv) {
        let v = kv[2].trim().replace(/^["']|["']$/g, '')
        if (v.startsWith('[') && v.endsWith(']')) v = v.slice(1, -1).replace(/["']/g, '')
        props[kv[1].toLowerCase()] = v || null
      }
    })
    return { props, body: md.slice(m[0].length) }
  }
  return { props, body: md }
}
function noteTags(md: string): string[] {
  const { props, body } = parseFrontmatter(md)
  const set = new Set<string>()
  if (props.tags)
    props.tags
      .split(/[\s,]+/)
      .filter(Boolean)
      .forEach((t) => set.add(t.startsWith('#') ? t : '#' + t))
  const re = /(?:^|\s)(#[\wа-яё-]{2,})/gi
  let mm: RegExpExecArray | null
  while ((mm = re.exec(body))) set.add(mm[1])
  return [...set]
}
function upsertFrontmatterTags(md: string, tags: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(md)
  if (m) {
    const inner = m[1]
    if (/^tags\s*:/m.test(inner)) return md.replace(/^(tags\s*:).*$/m, `$1 ${tags}`)
    return `---\n${inner}\ntags: ${tags}\n---\n` + md.slice(m[0].length)
  }
  return `---\ntags: ${tags}\n---\n` + md
}
function countWords(md: string): number {
  return md.replace(/[#>*[\]()|]/g, ' ').split(/\s+/).filter(Boolean).length
}
function relTime(t: number): string {
  const d = Date.now() - t
  if (d < 60e3) return 'только что'
  if (d < 3600e3) return Math.round(d / 60e3) + ' мин'
  if (d < 86400e3) return Math.round(d / 3600e3) + ' ч'
  return Math.round(d / 86400e3) + ' дн'
}
const linkTargets = (text: string): string[] => {
  const out: string[] = []
  const re = /\[\[([^\]\n]+?)\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) out.push(m[1].split('|')[0].split('#')[0].trim())
  return out
}

// шаблоны заметок (как в макете)
const TPLS = [
  { icon: '○', name: 'Пустая', desc: 'Чистый лист без разделов', md: (t: string) => '# ' + t },
  { icon: '☀', name: 'Дневник', desc: 'Задачи и заметки дня', md: (t: string) => '# ' + t + '\n## Задачи\n- [ ] Первая задача\n## Заметки дня' },
  { icon: '◱', name: 'Встреча', desc: 'Участники, повестка, решения', md: (t: string) => '# ' + t + '\n## Участники\n## Повестка\n## Решения\n- [ ] Действие' },
  { icon: '✎', name: 'Конспект', desc: 'Источник, тезисы, цитаты', md: (t: string) => '# ' + t + '\n## Источник\n## Тезисы\n> Ключевая цитата' }
]

type AiMsg = { role: 'u' | 'a'; text: string; thinking?: boolean; btn?: string | null; onBtn?: (() => void) | null }
type Mode = 'read' | 'edit' | 'split'
type LeftTab = 'files' | 'tags'
type GNode = { key: string; label: string; real: boolean; tags: string[]; deg: number }
type GraphCache = { key: string; nodes: GNode[]; edges: [number, number][]; pos: { x: number; y: number }[] }

export function VaultView({
  open,
  onClose,
  onToast,
  boards,
  onOpenBoard,
  onSendToCanvas,
  accent = '#22D3EE',
  showMinimap = true
}: {
  open: boolean
  onClose: () => void
  onToast: (m: string) => void
  boards: string[]
  onOpenBoard: (name: string) => void
  onSendToCanvas?: (title: string, md: string) => void
  accent?: string
  showMinimap?: boolean
}): JSX.Element | null {
  const [root, setRoot] = useState('')
  const [tree, setTree] = useState<VaultEntry[]>([])
  const [contents, setContents] = useState<Record<string, string>>({})
  const [active, setActive] = useState<string | null>(null)

  // сессионное состояние
  const [tabs, setTabs] = useState<string[]>([])
  const [pinned, setPinned] = useState<Record<string, boolean>>({})
  const [favs, setFavs] = useState<Record<string, boolean>>({})
  const [hist, setHist] = useState<string[]>([])
  const [histPos, setHistPos] = useState(0)
  const [trash, setTrash] = useState<Record<string, { name: string; content: string; dir: string }>>({})
  const [touched, setTouched] = useState<Record<string, number>>({})

  const [filesOpen, setFilesOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [focus, setFocus] = useState(false)
  const prevPanels = useRef<{ f: boolean; r: boolean; a: boolean } | null>(null)
  const [leftTab, setLeftTab] = useState<LeftTab>('files')
  const [tagSels, setTagSels] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [sortAZ, setSortAZ] = useState(true)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<Mode>('read')
  const [propsOpen, setPropsOpen] = useState(true)
  const [extraProps, setExtraProps] = useState(0)

  const now = new Date()
  const [calY, setCalY] = useState(now.getFullYear())
  const [calM, setCalM] = useState(now.getMonth())
  const [graphOn, setGraphOn] = useState(false)
  const [graphTag, setGraphTag] = useState('')
  const [gZoom, setGZoom] = useState(1)
  const [, setGraphTick] = useState(0)
  const [palOpen, setPalOpen] = useState(false)
  const [palQ, setPalQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [tplOpen, setTplOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [tmpTitle, setTmpTitle] = useState('')

  const [aiOpen, setAiOpen] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiInput, setAiInput] = useState('')
  const [aiModel, setAiModel] = useState('')
  const [aiModelLabel, setAiModelLabel] = useState('')
  const [aiMsgs, setAiMsgs] = useState<AiMsg[]>([
    { role: 'a', text: 'Я вижу текущую заметку и всю базу. Выберите действие сверху или спросите своими словами.' }
  ])
  const [toastMsg, setToastMsg] = useState('')
  const [toastAct, setToastAct] = useState<{ label: string; fn: () => void } | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const palRef = useRef<HTMLInputElement>(null)
  const cmRef = useRef<MarkdownEditorHandle>(null)
  const renameRef = useRef<HTMLInputElement>(null)
  const aiBoxRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const toastT = useRef<number | null>(null)
  const saveT = useRef<number | null>(null)
  const uiT = useRef<number | null>(null)
  const liveRef = useRef('') // самый свежий текст активной заметки (без ре-рендера на каждый ввод)
  const contentsRef = useRef(contents)
  contentsRef.current = contents
  const activeRef = useRef(active)
  activeRef.current = active

  const accentDim = hexToRgba(accent, 0.13)

  // ---------- данные ----------
  const notes = useMemo(() => flatten(tree), [tree])
  const byBase = useMemo(() => {
    const m = new Map<string, string>()
    notes.forEach((n) => m.set(n.name.toLowerCase(), n.path))
    return m
  }, [notes])
  const value = active ? contents[active] ?? '' : ''

  const touch = useCallback((p: string) => setTouched((t) => ({ ...t, [p]: Date.now() })), [])

  const toast = useCallback((msg: string, act?: { label: string; fn: () => void }) => {
    if (toastT.current) window.clearTimeout(toastT.current)
    setToastMsg(msg)
    setToastAct(act || null)
    toastT.current = window.setTimeout(() => {
      setToastMsg('')
      setToastAct(null)
    }, act ? 5000 : 2200)
  }, [])

  const loadAll = useCallback(async (list: NoteRef[]) => {
    const pairs = await Promise.all(
      list.map(async (n) => {
        const r = await window.flow.vaultRead({ path: n.path })
        return [n.path, r.ok ? r.content : ''] as const
      })
    )
    setContents((prev) => {
      const next = { ...prev }
      pairs.forEach(([p, c]) => {
        if (!(p in next)) next[p] = c
      })
      return next
    })
  }, [])

  const refreshTree = useCallback(async () => {
    const r = await window.flow.vaultTree()
    setRoot(r.root)
    setTree(r.tree)
    loadAll(flatten(r.tree))
  }, [loadAll])

  // загрузка при открытии + модели ИИ + подписка на изменения диска
  useEffect(() => {
    if (!open) return
    window.flow.vaultRoot().then((r) => {
      setRoot(r.root)
      if (r.root) refreshTree()
    })
    window.flow.getSettings().then((s) => setAiModel((m) => m || s.defaultModel || ''))
    window.flow.listModels().then((list) => {
      if (list.length) {
        setAiModel((m) => m || list[0].value)
        setAiModelLabel(list[0].label)
      }
    })
    const off = window.flow.onVaultChanged(() => refreshTree())
    return off
  }, [open, refreshTree])

  // Сохранить активную заметку немедленно + зафиксировать её текст в state (для графа/бэклинков)
  const flushSave = useCallback(() => {
    if (saveT.current) {
      window.clearTimeout(saveT.current)
      saveT.current = null
    }
    if (uiT.current) {
      window.clearTimeout(uiT.current)
      uiT.current = null
    }
    const p = activeRef.current
    if (p) {
      const doc = liveRef.current
      window.flow.vaultWrite({ path: p, content: doc })
      setContents((prev) => (prev[p] === doc ? prev : { ...prev, [p]: doc }))
    }
  }, [])

  const ensureLoaded = useCallback(async (path: string): Promise<string> => {
    const cur = contentsRef.current[path]
    if (cur != null) return cur
    const r = await window.flow.vaultRead({ path })
    const c = r.ok ? r.content : ''
    setContents((prev) => ({ ...prev, [path]: c }))
    return c
  }, [])

  const openNote = useCallback(
    async (path: string, pushHist = true) => {
      if (activeRef.current && activeRef.current !== path) flushSave()
      const loaded = await ensureLoaded(path)
      liveRef.current = loaded
      const parts = path.split('/')
      setExpanded((prev) => {
        const next = { ...prev }
        let acc = ''
        for (let i = 0; i < parts.length - 1; i++) {
          acc = acc ? acc + '/' + parts[i] : parts[i]
          next[acc] = true
        }
        return next
      })
      setTabs((t) => (t.includes(path) ? t : t.concat(path)))
      if (pushHist && activeRef.current !== path) {
        setHist((h) => {
          const nh = h.slice(0, histPos + 1).concat(path)
          setHistPos(nh.length - 1)
          return nh
        })
      }
      setActive(path)
      setTouched((t) => ({ ...t, [path]: Date.now() }))
      setMode('read')
      setMenuOpen(false)
      setRenaming(false)
    },
    [ensureLoaded, flushSave, histPos]
  )

  const navBack = useCallback(() => {
    if (histPos > 0) {
      const p = histPos - 1
      setHistPos(p)
      const path = hist[p]
      setTabs((t) => (t.includes(path) ? t : t.concat(path)))
      setActive(path)
    }
  }, [histPos, hist])
  const navFwd = useCallback(() => {
    if (histPos < hist.length - 1) {
      const p = histPos + 1
      setHistPos(p)
      const path = hist[p]
      setTabs((t) => (t.includes(path) ? t : t.concat(path)))
      setActive(path)
    }
  }, [histPos, hist])

  // Немедленное изменение (чекбоксы в чтении, ИИ-вставка вне редактора): сразу в state
  const setActiveContent = useCallback(
    (v: string) => {
      const p = activeRef.current
      if (!p) return
      liveRef.current = v
      setContents((prev) => ({ ...prev, [p]: v }))
      touch(p)
      if (saveT.current) window.clearTimeout(saveT.current)
      saveT.current = window.setTimeout(() => window.flow.vaultWrite({ path: p, content: v }), 600)
    },
    [touch]
  )

  // Ввод в CodeMirror (live-preview): НЕ дёргаем тяжёлый ре-рендер на каждый символ.
  // Текст держим в ref, сохранение и обновление производных UI — на паузе (debounce).
  const onEditorChange = useCallback(
    (doc: string) => {
      const p = activeRef.current
      if (!p) return
      liveRef.current = doc // мгновенно, без setState → нет ре-рендера на символ
      if (saveT.current) window.clearTimeout(saveT.current)
      saveT.current = window.setTimeout(() => window.flow.vaultWrite({ path: p, content: doc }), 700)
      if (uiT.current) window.clearTimeout(uiT.current)
      uiT.current = window.setTimeout(() => {
        setTouched((t) => ({ ...t, [p]: Date.now() }))
        setContents((prev) => ({ ...prev, [p]: doc }))
      }, 350)
    },
    []
  )

  // Программная замена всего документа (ИИ-вставка/теги): пишем в CodeMirror, если он открыт.
  const applyDoc = useCallback(
    (text: string) => {
      if (cmRef.current) cmRef.current.replaceAll(text)
      else setActiveContent(text)
    },
    [setActiveContent]
  )

  const toggleFocus = useCallback(() => {
    setFocus((f) => {
      if (f) {
        const pp = prevPanels.current
        setFilesOpen(pp ? pp.f : true)
        setRightOpen(pp ? pp.r : true)
        setAiOpen(pp ? pp.a : false)
        prevPanels.current = null
        return false
      }
      prevPanels.current = { f: filesOpen, r: rightOpen, a: aiOpen }
      setFilesOpen(false)
      setRightOpen(false)
      setAiOpen(false)
      return true
    })
  }, [filesOpen, rightOpen, aiOpen])

  // директории для «входящих» и «дневника» (по именам папок реального хранилища)
  const findDir = useCallback(
    (re: RegExp): string => {
      let hit = ''
      const walk = (items: VaultEntry[]): void => {
        for (const it of items) {
          if (it.type === 'dir') {
            if (!hit && re.test(it.name)) hit = it.path
            if (it.children) walk(it.children)
          }
        }
      }
      walk(tree)
      return hit
    },
    [tree]
  )

  const openWiki = useCallback(
    async (title: string) => {
      if (boards.some((b) => b.toLowerCase() === title.toLowerCase())) {
        onClose()
        onOpenBoard(boards.find((b) => b.toLowerCase() === title.toLowerCase())!)
        return
      }
      const p = byBase.get(title.toLowerCase())
      if (p) {
        openNote(p)
        return
      }
      const dir = activeRef.current ? dirOf(activeRef.current) : findDir(/inbox|входящ/i)
      const res = await window.flow.vaultCreate({ dir, name: title, content: `# ${title}\n` })
      if (res.ok) {
        await refreshTree()
        openNote(res.path)
        toast('Создана заметка «' + title + '»')
      }
    },
    [boards, byBase, onClose, onOpenBoard, findDir, openNote, refreshTree, toast]
  )

  const createNote = useCallback(
    async (tpl: (typeof TPLS)[number]) => {
      const dir = findDir(/inbox|входящ/i)
      const res = await window.flow.vaultCreate({ dir, name: 'Без названия', content: tpl.md('Без названия') })
      if (res.ok) {
        await refreshTree()
        openNote(res.path)
        setMode('edit')
        setTplOpen(false)
        toast('Заметка создана из шаблона «' + tpl.name + '»')
      }
    },
    [findDir, refreshTree, openNote, toast]
  )

  const duplicateNote = useCallback(async () => {
    if (!active) return
    const src = contents[active]
    const dir = dirOf(active)
    const res = await window.flow.vaultCreate({ dir, name: baseOf(active) + ' (копия)', content: src })
    if (res.ok) {
      await refreshTree()
      openNote(res.path)
      setMenuOpen(false)
      toast('Копия создана')
    }
  }, [active, contents, refreshTree, openNote, toast])

  const restoreNote = useCallback(
    async (path: string) => {
      const t = trash[path]
      if (!t) return
      const res = await window.flow.vaultCreate({ dir: t.dir, name: t.name, content: t.content })
      if (res.ok) {
        setTrash((tr) => {
          const n = { ...tr }
          delete n[path]
          return n
        })
        await refreshTree()
        openNote(res.path)
        toast('Заметка восстановлена')
      }
    },
    [trash, refreshTree, openNote, toast]
  )

  const deleteNote = useCallback(async () => {
    if (!active) return
    if (notes.length <= 1) {
      toast('Нельзя удалить последнюю заметку')
      return
    }
    const path = active
    const saved = { name: baseOf(path), content: contents[path] ?? '', dir: dirOf(path) }
    const res = await window.flow.vaultDelete({ path })
    if (!res.ok) {
      toast(res.error || 'Не удалось удалить')
      return
    }
    const key = 'trash:' + path + ':' + Date.now()
    setTrash((tr) => ({ ...tr, [key]: saved }))
    setTabs((t) => {
      const nt = t.filter((x) => x !== path)
      const nextActive = nt[nt.length - 1] || null
      setActive(nextActive)
      setHist(nextActive ? [nextActive] : [])
      setHistPos(0)
      return nt
    })
    setMenuOpen(false)
    await refreshTree()
    toast('Заметка перемещена в корзину', { label: 'Отменить', fn: () => restoreNote(key) })
  }, [active, notes.length, contents, refreshTree, restoreNote, toast])

  const moveNote = useCallback(
    async (path: string, destDir: string) => {
      const res = await window.flow.vaultMove({ path, destDir })
      if (res.ok) {
        if (active === path) setActive(res.path)
        setTabs((t) => t.map((x) => (x === path ? res.path : x)))
        await refreshTree()
        toast('Перемещено')
      } else toast(res.error || 'Не удалось переместить')
    },
    [active, refreshTree, toast]
  )

  const commitRename = useCallback(async () => {
    if (!active) {
      setRenaming(false)
      return
    }
    const nt = tmpTitle.trim()
    const oldBase = baseOf(active)
    setRenaming(false)
    if (!nt || nt === oldBase) return
    const res = await window.flow.vaultRename({ path: active, name: nt })
    if (!res.ok) {
      toast(res.error || 'Не удалось переименовать')
      return
    }
    // переписать [[oldBase]] → [[nt]] во всех заметках на диске
    await Promise.all(
      notes.map(async (n) => {
        if (n.path === active) return
        const c = contentsRef.current[n.path] ?? ''
        if (c.includes('[[' + oldBase + ']]')) {
          const nc = c.split('[[' + oldBase + ']]').join('[[' + nt + ']]')
          await window.flow.vaultWrite({ path: n.path, content: nc })
        }
      })
    )
    setActive(res.path)
    setTabs((t) => t.map((x) => (x === active ? res.path : x)))
    await refreshTree()
    toast('Переименовано, вики-ссылки обновлены')
  }, [active, tmpTitle, notes, refreshTree, toast])

  // формат-вставка — прямо в CodeMirror (live-preview редактор)
  const fmtInsert = useCallback((before: string, after: string, placeholder: string) => {
    cmRef.current?.insert(before, after, placeholder)
  }, [])

  const toggleCheckbox = useCallback(
    (li: number) => {
      const p = activeRef.current
      if (!p) return
      const ls = (contentsRef.current[p] ?? '').split('\n')
      const checked = /- \[x\]/.test(ls[li])
      ls[li] = checked ? ls[li].replace('- [x]', '- [ ]') : ls[li].replace('- [ ]', '- [x]')
      setActiveContent(ls.join('\n'))
    },
    [setActiveContent]
  )

  // similar / backlinks / graph
  const similar = useCallback(
    (path: string) => {
      const wset = (m: string): Set<string> =>
        new Set(
          m
            .toLowerCase()
            .replace(/[^а-яёa-z\s]/gi, ' ')
            .split(/\s+/)
            .filter((w) => w.length > 4)
        )
      const a = wset(contents[path] ?? '')
      const res: { path: string; title: string; pct: number }[] = []
      notes.forEach((n) => {
        if (n.path === path) return
        const b = wset(contents[n.path] ?? '')
        let inter = 0
        b.forEach((w) => {
          if (a.has(w)) inter++
        })
        const pct = Math.round((100 * inter) / Math.max(6, Math.min(a.size, b.size)))
        if (pct > 0) res.push({ path: n.path, title: n.name, pct: Math.min(pct, 96) })
      })
      return res.sort((x, y) => y.pct - x.pct)
    },
    [contents, notes]
  )

  // Ключ графа зависит только от структуры связей ([[ссылки]] и теги), а не от любого текста —
  // поэтому обычный набор символов НЕ пересчитывает тяжёлую force-раскладку.
  const graphKey = useMemo(
    () =>
      notes
        .map((n) => n.path + '>' + linkTargets(contents[n.path] || '').join(',') + '#' + noteTags(contents[n.path] || '').join(','))
        .join('|'),
    [notes, contents]
  )
  const buildGraph = useMemo<GraphCache>(() => {
    const ids = notes.map((n) => n.path)
    const key = graphKey
    const nodes: GNode[] = []
    const edges: [number, number][] = []
    const idx: Record<string, number> = {}
    const titleTo: Record<string, string> = {}
    notes.forEach((n) => (titleTo[n.name] = n.path))
    const addNode = (k: string, label: string, real: boolean, tags: string[]): number => {
      if (idx[k] != null) return idx[k]
      idx[k] = nodes.length
      nodes.push({ key: k, label, real, tags: tags || [], deg: 0 })
      return idx[k]
    }
    notes.forEach((n) => addNode(n.path, n.name, true, noteTags(contents[n.path] || '')))
    notes.forEach((n) => {
      linkTargets(contents[n.path] || '').forEach((t) => {
        const tgt = titleTo[t]
        const a = idx[n.path]
        const b = tgt != null ? idx[tgt] : addNode('ph:' + t, t, false, [])
        if (a !== b && !edges.some((e) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a))) {
          edges.push([a, b])
          nodes[a].deg++
          nodes[b].deg++
        }
      })
    })
    const W = 900
    const H = 560
    const pos = nodes.map((_, i) => {
      const a = i * 2.39996
      const r = 90 + 30 * Math.sqrt(i + 1)
      return { x: W / 2 + r * Math.cos(a), y: H / 2 + r * 0.6 * Math.sin(a) }
    })
    for (let it = 0; it < 260; it++) {
      for (let i = 0; i < pos.length; i++)
        for (let j = i + 1; j < pos.length; j++) {
          let dx = pos[j].x - pos[i].x
          let dy = pos[j].y - pos[i].y
          const d2 = dx * dx + dy * dy || 1
          const d = Math.sqrt(d2)
          const f = Math.min(9000 / d2, 12)
          dx /= d
          dy /= d
          pos[i].x -= dx * f
          pos[i].y -= dy * f
          pos[j].x += dx * f
          pos[j].y += dy * f
        }
      edges.forEach(([a, b]) => {
        let dx = pos[b].x - pos[a].x
        let dy = pos[b].y - pos[a].y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const f = (d - 160) * 0.02
        dx /= d
        dy /= d
        pos[a].x += dx * f
        pos[a].y += dy * f
        pos[b].x -= dx * f
        pos[b].y -= dy * f
      })
      pos.forEach((p) => {
        p.x += (W / 2 - p.x) * 0.004
        p.y += (H / 2 - p.y) * 0.004
      })
    }
    pos.forEach((p) => {
      p.x = Math.max(80, Math.min(W - 80, p.x))
      p.y = Math.max(40, Math.min(H - 50, p.y))
    })
    return { key, nodes, edges, pos }
    // Пересчёт только при смене структуры связей (graphKey), не на каждый символ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphKey])

  const gDown = useCallback(
    (e: React.MouseEvent, i: number, clickFn: () => void) => {
      e.preventDefault()
      e.stopPropagation()
      const st = { x: e.clientX, y: e.clientY }
      let moved = 0
      const mm = (ev: MouseEvent): void => {
        const dx = ev.clientX - st.x
        const dy = ev.clientY - st.y
        moved += Math.abs(dx) + Math.abs(dy)
        const z = gZoom || 1
        buildGraph.pos[i].x += dx / z
        buildGraph.pos[i].y += dy / z
        st.x = ev.clientX
        st.y = ev.clientY
        setGraphTick((t) => t + 1)
      }
      const mu = (): void => {
        window.removeEventListener('mousemove', mm)
        window.removeEventListener('mouseup', mu)
        if (moved < 5) clickFn()
      }
      window.addEventListener('mousemove', mm)
      window.addEventListener('mouseup', mu)
    },
    [buildGraph, gZoom]
  )

  // ---------- ИИ ----------
  const aiScroll = useCallback(() => {
    setTimeout(() => {
      const el = aiBoxRef.current
      if (el) el.scrollTop = el.scrollHeight
    }, 60)
  }, [])

  const callAI = useCallback(
    async (messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> => {
      if (!aiModel) return 'Не выбрана модель — задайте её в настройках приложения.'
      const r = await window.flow.aiChat({ model: aiModel, messages })
      return r.ok ? r.content : 'Ошибка ИИ: ' + r.error
    },
    [aiModel]
  )

  const aiRun = useCallback(
    async (kind: 'sum' | 'links' | 'cont' | 'tags') => {
      if (aiBusy || !active) return
      const note = liveRef.current || contents[active] || ''
      const title = baseOf(active)
      const labels: Record<string, string> = {
        sum: 'Суммируй заметку',
        links: 'Предложи связи',
        cont: 'Продолжи текст',
        tags: 'Подбери теги'
      }
      setAiMsgs((m) => m.concat([{ role: 'u', text: labels[kind] }, { role: 'a', thinking: true, text: 'думаю…' }]))
      setAiBusy(true)
      aiScroll()

      let prompt = ''
      if (kind === 'sum') prompt = `Кратко суммируй заметку «${title}» в 3–4 тезисах-буллетах на русском. Только суть.\n\n${note}`
      else if (kind === 'links') {
        const titles = notes.filter((n) => n.path !== active).map((n) => n.name)
        prompt = `Вот заметка «${title}»:\n\n${note}\n\nСписок других заметок базы: ${titles.join(', ')}.\nПредложи 2–4 заметки из списка, с которыми стоит связать эту, и коротко почему. Формат: «— Название — причина».`
      } else if (kind === 'cont') prompt = `Продолжи заметку «${title}» одним связным абзацем на русском, в том же стиле. Верни ТОЛЬКО новый абзац.\n\n${note}`
      else prompt = `Подбери 3–5 тегов-хэштегов (через пробел, каждый с #, строчными, без пробелов внутри) по содержимому заметки «${title}». Верни ТОЛЬКО строку тегов.\n\n${note}`

      const text = await callAI([{ role: 'user', content: prompt }])
      let btn: string | null = null
      let onBtn: (() => void) | null = null
      if (kind === 'cont') {
        btn = 'Вставить в заметку'
        onBtn = () => {
          applyDoc((liveRef.current || contentsRef.current[active] || '') + '\n' + text.trim())
          toast('Абзац добавлен в конец заметки')
        }
      } else if (kind === 'tags') {
        const tags = (text.match(/#[\wа-яё-]+/gi) || []).join(' ')
        btn = 'Применить теги'
        onBtn = () => {
          if (tags) {
            applyDoc(upsertFrontmatterTags(liveRef.current || contentsRef.current[active] || '', tags))
            toast('Теги применены к заметке')
          }
        }
      }
      setAiMsgs((m) => {
        const c = [...m]
        c[c.length - 1] = { role: 'a', text: text.trim(), btn, onBtn }
        return c
      })
      setAiBusy(false)
      aiScroll()
    },
    [aiBusy, active, contents, notes, callAI, applyDoc, toast, aiScroll]
  )

  const aiSendMsg = useCallback(async () => {
    const t = aiInput.trim()
    if (!t || aiBusy || !active) return
    setAiInput('')
    setAiMsgs((m) => m.concat([{ role: 'u', text: t }, { role: 'a', thinking: true, text: 'думаю…' }]))
    setAiBusy(true)
    aiScroll()
    const sys = `Ты — ассистент по заметкам. Текущая заметка «${baseOf(active)}»:\n\n${contents[active] ?? ''}\n\nОтвечай кратко и по-русски.`
    const text = await callAI([
      { role: 'system', content: sys },
      { role: 'user', content: t }
    ])
    setAiMsgs((m) => {
      const c = [...m]
      c[c.length - 1] = { role: 'a', text: text.trim() }
      return c
    })
    setAiBusy(false)
    aiScroll()
  }, [aiInput, aiBusy, active, contents, callAI, aiScroll])

  // ---------- клавиши (e.code — русская раскладка) ----------
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.shiftKey && e.code === 'KeyF') {
        e.preventDefault()
        toggleFocus()
      } else if (mod && e.code === 'KeyK') {
        e.preventDefault()
        setPalOpen((v) => !v)
        setPalQ('')
        setTimeout(() => palRef.current && palRef.current.focus(), 60)
      } else if (mod && e.code === 'KeyE') {
        e.preventDefault()
        setMode((m) => (m === 'read' ? 'edit' : 'read'))
      } else if (mod && e.code === 'KeyF') {
        e.preventDefault()
        setFilesOpen(true)
        setLeftTab('files')
        setTimeout(() => searchRef.current && searchRef.current.focus(), 50)
      } else if ((mod || e.altKey) && e.code === 'KeyN') {
        e.preventDefault()
        setTplOpen(true)
      } else if (e.altKey && e.code === 'ArrowLeft') {
        e.preventDefault()
        navBack()
      } else if (e.altKey && e.code === 'ArrowRight') {
        e.preventDefault()
        navFwd()
      } else if (e.code === 'Escape') {
        if (palOpen || graphOn || menuOpen || tplOpen) {
          setPalOpen(false)
          setGraphOn(false)
          setMenuOpen(false)
          setTplOpen(false)
        } else onClose()
      } else if (mod && e.code === 'KeyS') {
        e.preventDefault()
        flushSave()
        toast('Сохранено')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, toggleFocus, navBack, navFwd, palOpen, graphOn, menuOpen, tplOpen, onClose, flushSave, toast])

  useEffect(() => () => {
    if (toastT.current) window.clearTimeout(toastT.current)
    if (saveT.current) window.clearTimeout(saveT.current)
    if (uiT.current) window.clearTimeout(uiT.current)
  }, [])

  if (!open) return null

  const note = active ? { title: baseOf(active), path: active, md: value } : null
  const rootVars: CSSVars = {
    '--bg': '#0E0F12',
    '--grid': '#212530',
    '--panel': '#15171C',
    '--panel2': '#1B1E24',
    '--border': '#272B34',
    '--edge': '#39404E',
    '--text': '#E7EAF0',
    '--muted': '#8B93A3',
    '--accent': accent,
    '--accent-dim': accentDim,
    '--c-note': '#4ADE80',
    '--c-code': '#FBBF24',
    '--c-time': '#60A5FA',
    position: 'fixed',
    inset: 0,
    zIndex: 2147483000,
    display: 'flex',
    fontFamily: "'IBM Plex Sans',sans-serif",
    background: 'var(--bg)',
    color: 'var(--text)',
    overflow: 'hidden',
    userSelect: 'none'
  }

  // ---------- вычисляемые данные для рендера ----------
  // левая панель — плоские строки
  type Row = {
    key: string
    kind: 'note' | 'folder' | 'header' | 'trash'
    label: string
    chev: string
    chevC: string
    color: string
    font: string
    bg: string
    pad: number
    star: string
    title: string
    sub?: string
    onClick?: () => void
    drag?: boolean
    onDragStart?: (e: React.DragEvent) => void
    onDragOver?: (e: React.DragEvent) => void
    onDrop?: (e: React.DragEvent) => void
  }
  const rows: Row[] = []
  const header = (label: string): Row => ({
    key: 'h:' + label + rows.length,
    kind: 'header',
    label,
    chev: '',
    chevC: 'var(--muted)',
    color: 'var(--muted)',
    font: "500 9.5px 'JetBrains Mono',monospace",
    bg: 'transparent',
    pad: 8,
    star: '',
    title: ''
  })
  const noteRow = (path: string, pad: number): Row => ({
    key: 'n:' + path,
    kind: 'note',
    label: baseOf(path),
    chev: '·',
    chevC: 'var(--muted)',
    color: path === active ? 'var(--text)' : 'var(--muted)',
    font: "400 12px 'IBM Plex Sans',sans-serif",
    bg: path === active ? 'var(--panel2)' : 'transparent',
    pad,
    star: favs[path] ? '★' : '',
    title: 'Открыть заметку · можно перетащить в папку',
    drag: true,
    onDragStart: (e) => e.dataTransfer.setData('text/plain', path),
    onClick: () => openNote(path)
  })
  const folderRow = (entry: VaultEntry, depth: number, isOpen: boolean): Row => ({
    key: 'f:' + entry.path,
    kind: 'folder',
    label: entry.name,
    chev: isOpen ? '▾' : '▸',
    chevC: 'var(--muted)',
    color: 'var(--muted)',
    font: "500 12px 'IBM Plex Sans',sans-serif",
    bg: 'transparent',
    pad: 8 + depth * 14,
    star: '',
    title: (isOpen ? 'Свернуть' : 'Развернуть') + ' · сюда можно перетащить заметку',
    onDragOver: (e) => e.preventDefault(),
    onDrop: (e) => {
      e.preventDefault()
      const nid = e.dataTransfer.getData('text/plain')
      if (nid) moveNote(nid, entry.path)
    },
    onClick: () => setExpanded((x) => ({ ...x, [entry.path]: !x[entry.path] }))
  })

  if (leftTab === 'tags') {
    const tagMap: Record<string, string[]> = {}
    notes.forEach((n) =>
      noteTags(contents[n.path] || '').forEach((t) => (tagMap[t] = tagMap[t] || []).push(n.path))
    )
    const keys = Object.keys(tagMap).sort()
    if (!keys.length) rows.push(header('Тегов пока нет'))
    keys.forEach((t) => {
      const sel = tagSels.includes(t)
      rows.push({
        ...header(''),
        key: 'tag:' + t,
        label: t + '  ·  ' + tagMap[t].length,
        chev: sel ? '◉' : '○',
        chevC: sel ? 'var(--accent)' : 'var(--muted)',
        font: "500 11.5px 'JetBrains Mono',monospace",
        color: sel ? 'var(--accent)' : 'var(--c-note)',
        title: 'Выбрать тег (можно несколько — фильтр «И»)',
        onClick: () => setTagSels((s) => (sel ? s.filter((x) => x !== t) : s.concat(t)))
      })
    })
    if (tagSels.length) {
      rows.push(header('СОВПАДЕНИЯ (' + tagSels.join(' И ') + ')'))
      const hits = notes.filter((n) => {
        const tg = noteTags(contents[n.path] || '')
        return tagSels.every((t) => tg.includes(t))
      })
      if (!hits.length) rows.push(header('— нет заметок со всеми тегами'))
      hits.forEach((n) => rows.push(noteRow(n.path, 22)))
    }
  } else if (search.trim()) {
    const q = search.toLowerCase()
    notes.forEach((n) => {
      const inTitle = n.name.toLowerCase().includes(q)
      const line = (contents[n.path] || '').split('\n').find((l) => l.toLowerCase().includes(q))
      if (inTitle || line) {
        const r = noteRow(n.path, 8)
        r.color = 'var(--text)'
        if (line && !inTitle) r.sub = line.replace(/[#>*|]/g, '').trim().slice(0, 90)
        rows.push(r)
      }
    })
    if (!rows.length) rows.push(header('Ничего не найдено'))
  } else {
    if (Object.keys(favs).some((p) => favs[p] && contents[p] != null)) {
      rows.push(header('★ ИЗБРАННОЕ'))
      Object.keys(favs).forEach((p) => {
        if (favs[p] && notes.some((n) => n.path === p)) rows.push(noteRow(p, 8))
      })
    }
    const walk = (items: VaultEntry[], depth: number): void => {
      const dirs = items.filter((i) => i.type === 'dir')
      const files = items.filter((i) => i.type === 'file')
      const list = sortAZ
        ? [...dirs].sort((a, b) => a.name.localeCompare(b.name, 'ru'))
        : dirs
      for (const it of list) {
        const isOpen = !!expanded[it.path]
        rows.push(folderRow(it, depth, isOpen))
        if (isOpen && it.children) walk(it.children, depth + 1)
      }
      const fl = sortAZ ? [...files].sort((a, b) => a.name.localeCompare(b.name, 'ru')) : files
      fl.forEach((f) => rows.push(noteRow(f.path, 22 + depth * 14)))
    }
    walk(tree, 0)
    const trashIds = Object.keys(trash)
    if (trashIds.length) {
      const isOpen = !!expanded['@trash']
      rows.push({
        ...header('Корзина · ' + trashIds.length),
        key: '@trash',
        kind: 'folder',
        chev: isOpen ? '▾' : '▸',
        font: "500 12px 'IBM Plex Sans',sans-serif",
        title: 'Удалённые заметки — клик восстановит',
        onClick: () => setExpanded((x) => ({ ...x, '@trash': !x['@trash'] }))
      })
      if (isOpen)
        trashIds.forEach((k) =>
          rows.push({
            ...header(''),
            key: 'tr:' + k,
            kind: 'trash',
            label: trash[k].name,
            chev: '↩',
            chevC: 'var(--c-code)',
            pad: 22,
            font: "400 12px 'IBM Plex Sans',sans-serif",
            color: 'var(--muted)',
            title: 'Кликните, чтобы восстановить',
            onClick: () => restoreNote(k)
          })
        )
    }
    if (!rows.length) rows.push(header('Пусто — создайте заметку кнопкой ✎'))
  }

  // вкладки (закреплённые впереди)
  const orderedTabs = [...tabs].sort((a, b) => (pinned[b] ? 1 : 0) - (pinned[a] ? 1 : 0))

  // свойства
  const fm = note ? parseFrontmatter(note.md) : { props: {}, body: '' }
  const propIcons: Record<string, string> = { created: '≡', tags: '#', source: '↗', author: '@' }
  const propRows = Object.keys(fm.props).map((k) => {
    const v = fm.props[k]
    const isLink = k === 'source' && !!v
    return {
      name: k,
      icon: propIcons[k] || '≡',
      value: v || 'Нет значения',
      vcolor: v ? (isLink ? 'var(--accent)' : 'var(--text)') : 'var(--muted)',
      vfont: isLink ? "'JetBrains Mono',monospace" : "'IBM Plex Sans',sans-serif",
      vline: isLink ? '1px solid rgba(34,211,238,.35)' : 'none',
      vcursor: isLink ? 'pointer' : 'text'
    }
  })
  for (let i = 0; i < extraProps; i++)
    propRows.push({ name: 'свойство ' + (i + 1), icon: '≡', value: 'Нет значения', vcolor: 'var(--muted)', vfont: "'IBM Plex Sans',sans-serif", vline: 'none', vcursor: 'text' })

  // контент
  const parseH = {
    onLink: openWiki,
    onExternal: () => toast('Внешняя ссылка откроется в браузере'),
    collapsed,
    toggleSection: (a: string) => setCollapsed((c) => ({ ...c, [a]: !c[a] })),
    toggleCheckbox,
    accent
  }
  const blocks: Block[] = note ? collapseBlocks(parseBlocks(note.md, parseH), collapsed) : []
  const words = note ? countWords(note.md) : 0
  const readMin = Math.max(1, Math.round(words / 180))
  const readVisible = mode === 'read' || mode === 'split'
  const editVisible = mode === 'edit' || mode === 'split'

  // структура
  const outline: { t: string; pad: number; color: string; onClick: () => void }[] = []
  if (note)
    note.md.split('\n').forEach((raw, li) => {
      const l = raw.trim()
      const mk = (t: string, pad: number, color: string): void => {
        const anchor = 'sec-' + li
        outline.push({
          t,
          pad,
          color,
          onClick: () => {
            const el = document.getElementById(anchor)
            const sc = scrollRef.current
            if (el && sc) {
              const r = el.getBoundingClientRect()
              const rc = sc.getBoundingClientRect()
              sc.scrollTop += r.top - rc.top - 70
            } else if (!readVisible) toast('Прокрутка работает в режиме чтения и сплите')
          }
        })
      }
      if (l.startsWith('## ')) mk(l.slice(3), 22, 'var(--muted)')
      else if (l.startsWith('# ')) mk(l.slice(2), 8, 'var(--text)')
    })

  // календарь
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const first = new Date(calY, calM, 1)
  const startOffset = (first.getDay() + 6) % 7
  const startDate = new Date(calY, calM, 1 - startOffset)
  const todayIso = new Date()
  const calDays: {
    n: number
    tip: string
    bg: string
    border: string
    color: string
    font: string
    dot: string
    onClick: () => void
  }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const inMonth = d.getMonth() === calM
    const isToday =
      d.getFullYear() === todayIso.getFullYear() && d.getMonth() === todayIso.getMonth() && d.getDate() === todayIso.getDate()
    const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    const exPath = byBase.get(iso.toLowerCase())
    calDays.push({
      n: d.getDate(),
      tip: exPath ? 'Открыть дневник ' + iso : 'Создать дневник ' + iso,
      bg: isToday ? 'var(--accent-dim)' : 'transparent',
      border: isToday ? 'var(--accent)' : 'transparent',
      color: isToday ? 'var(--accent)' : inMonth ? 'var(--text)' : 'var(--edge)',
      font: (isToday ? 600 : 400) + " 10.5px 'JetBrains Mono',monospace",
      dot: exPath ? 'var(--c-note)' : 'transparent',
      onClick: async () => {
        const p = byBase.get(iso.toLowerCase())
        if (p) {
          openNote(p)
          return
        }
        const dir = findDir(/дневник|diary|journal/i)
        const res = await window.flow.vaultCreate({ dir, name: iso, content: '# ' + iso + '\n## Задачи\n- [ ] Первая задача\n## Заметки дня' })
        if (res.ok) {
          await refreshTree()
          openNote(res.path)
        }
      }
    })
  }

  // бэклинки
  const backlinks: { path: string; title: string; snippet: string }[] = []
  if (note)
    notes.forEach((n) => {
      if (n.path === active) return
      const hit = (contents[n.path] || '').split('\n').find((l) => l.includes('[[' + note.title + ']]'))
      if (hit) backlinks.push({ path: n.path, title: n.name, snippet: hit.replace(/[#>*]/g, '').trim() })
    })

  const simRows = active ? similar(active).slice(0, 3) : []
  const recentRows = Object.keys(touched)
    .filter((p) => notes.some((n) => n.path === p))
    .sort((a, b) => touched[b] - touched[a])
    .slice(0, 3)
    .map((p) => ({ path: p, title: baseOf(p), when: relTime(touched[p]) }))

  // статистика
  const statNotes = notes.length
  const statWords = notes.reduce((acc, n) => acc + (contents[n.path] || '').split(/\s+/).filter(Boolean).length, 0)
  const shades = ['var(--panel2)', 'rgba(34,211,238,.22)', 'rgba(34,211,238,.5)', 'rgba(34,211,238,.85)']
  const actCells: string[] = []
  for (let i = 0; i < 84; i++) {
    const v = (i * 37 + 11) % 17
    const lvl = i > 76 ? 3 : v < 8 ? 0 : v < 12 ? 1 : v < 15 ? 2 : 3
    actCells.push(shades[lvl])
  }

  // граф знаний
  const g = buildGraph
  const gStats = g.nodes.filter((n) => n.real).length + ' заметок · ' + g.edges.length + ' связей'
  const allTags = [...new Set(g.nodes.flatMap((n) => n.tags))]
  const nodeVis = (n: GNode): boolean => !graphTag || n.tags.includes(graphTag)

  // локальный граф
  const lgNodes: { x: number; y: number; label: string; size: number; fill: string; border: string; c: string; cur: string; tip: string; onClick: (() => void) | null }[] = []
  const lgEdges: { x1: number; y1: number; x2: number; y2: number }[] = []
  let lgEmpty = true
  const ci = active ? g.nodes.findIndex((n) => n.key === active) : -1
  if (ci >= 0) {
    const nbrs: number[] = []
    g.edges.forEach(([a, b]) => {
      if (a === ci) nbrs.push(b)
      else if (b === ci) nbrs.push(a)
    })
    const cx = 113
    const cy = 52
    lgNodes.push({ x: cx, y: cy, label: '', size: 11, fill: 'var(--accent-dim)', border: '2px solid var(--accent)', c: 'var(--accent)', cur: 'default', tip: note ? note.title : '', onClick: null })
    nbrs.forEach((ni, k) => {
      const ang = -Math.PI / 2 + (k * 2 * Math.PI) / Math.max(nbrs.length, 1)
      const x = Math.round(cx + 74 * Math.cos(ang))
      const y = Math.round(cy + 32 * Math.sin(ang))
      lgEdges.push({ x1: cx, y1: cy, x2: x, y2: y })
      const nd = g.nodes[ni]
      lgNodes.push({
        x,
        y,
        label: nd.label,
        size: 7,
        fill: nd.real ? 'var(--panel2)' : 'transparent',
        border: nd.real ? '2px solid var(--edge)' : '2px dashed var(--edge)',
        c: 'var(--muted)',
        cur: nd.real ? 'pointer' : 'default',
        tip: nd.real ? 'Открыть «' + nd.label + '»' : 'Заметки ещё нет',
        onClick: nd.real ? () => openNote(nd.key) : null
      })
    })
    lgEmpty = nbrs.length === 0
  }

  const mmRects = [
    { x: 16, y: 16, w: 22, h: 14, c: '#4ADE80' },
    { x: 60, y: 10, w: 30, h: 22, c: '#22D3EE' },
    { x: 112, y: 16, w: 22, h: 16, c: '#A78BFA' },
    { x: 152, y: 14, w: 20, h: 14, c: '#FB923C' },
    { x: 22, y: 58, w: 26, h: 12, c: '#F472B6' },
    { x: 64, y: 54, w: 24, h: 16, c: '#FBBF24' },
    { x: 112, y: 58, w: 34, h: 20, c: '#2DD4BF' }
  ]

  // командная палитра
  const q = palQ.toLowerCase()
  const read0 = mode === 'read'
  const isFav = !!(active && favs[active])
  const cmds: { k: string; kc: string; label: string; hint: string; act: () => void }[] = [
    { k: '◈', kc: 'var(--accent)', label: 'Открыть граф знаний', hint: 'вид', act: () => { setPalOpen(false); setGraphOn(true) } },
    { k: '✦', kc: 'var(--accent)', label: 'Открыть ИИ-панель', hint: 'ии', act: () => { setPalOpen(false); setAiOpen(true) } },
    { k: '⛶', kc: 'var(--accent)', label: focus ? 'Выйти из фокуса' : 'Режим фокуса', hint: 'Ctrl+Shift+F', act: () => { setPalOpen(false); toggleFocus() } },
    { k: '✎', kc: 'var(--c-note)', label: 'Новая заметка (шаблон)', hint: 'Alt+N', act: () => { setPalOpen(false); setTplOpen(true) } },
    { k: '⊕', kc: 'var(--c-note)', label: 'Дублировать заметку', hint: 'создать', act: () => { setPalOpen(false); duplicateNote() } },
    { k: '★', kc: 'var(--c-code)', label: isFav ? 'Убрать из избранного' : 'В избранное', hint: 'заметка', act: () => { setPalOpen(false); if (active) setFavs((f) => ({ ...f, [active]: !f[active] })) } },
    { k: '⇄', kc: 'var(--c-code)', label: read0 ? 'Режим правки' : 'Режим чтения', hint: 'Ctrl+E', act: () => { setPalOpen(false); setMode((m) => (m === 'read' ? 'edit' : 'read')) } },
    { k: '⫼', kc: 'var(--c-code)', label: 'Сплит: Markdown + превью', hint: 'вид', act: () => { setPalOpen(false); setMode('split') } },
    { k: '#', kc: 'var(--c-note)', label: 'Панель тегов', hint: 'файлы', act: () => { setPalOpen(false); setFilesOpen(true); setLeftTab('tags') } },
    { k: '▦', kc: 'var(--muted)', label: 'Показать/скрыть календарь', hint: 'вид', act: () => { setPalOpen(false); setRightOpen((v) => !v) } },
    { k: '→', kc: 'var(--c-time)', label: 'Вернуться на холст', hint: 'холст', act: onClose },
    { k: '↥', kc: 'var(--muted)', label: 'Свернуть все папки', hint: 'файлы', act: () => { setPalOpen(false); setExpanded({}) } }
  ]
  const palRows: { k: string; kc: string; label: string; hint: string; onClick: () => void }[] = []
  cmds.forEach((c) => {
    if (!q || c.label.toLowerCase().includes(q)) palRows.push({ k: c.k, kc: c.kc, label: c.label, hint: c.hint, onClick: c.act })
  })
  notes.forEach((n) => {
    if (!q || n.name.toLowerCase().includes(q))
      palRows.push({ k: '·', kc: 'var(--muted)', label: n.name, hint: relDir(n.path, root).join('/') || 'корень', onClick: () => { setPalOpen(false); setGraphOn(false); openNote(n.path) } })
  })

  // ИИ-действия
  const aiActs = [
    { t: 'Суммировать', tip: 'Краткая выжимка заметки', k: 'sum' as const },
    { t: 'Связи', tip: 'С чем связать эту заметку', k: 'links' as const },
    { t: 'Продолжить', tip: 'Черновик следующего абзаца', k: 'cont' as const },
    { t: 'Автотеги', tip: 'Подобрать теги по содержимому', k: 'tags' as const }
  ]

  const railOn = (on: boolean): { bg: string; c: string } => (on ? { bg: 'var(--accent-dim)', c: 'var(--accent)' } : { bg: 'transparent', c: 'var(--muted)' })
  const rf = railOn(filesOpen)
  const rc = railOn(rightOpen)
  const rfoc = railOn(focus)

  const closeMenus = (): void => {
    if (menuOpen) setMenuOpen(false)
  }
  const crumb = note ? relDir(note.path, root).concat(note.title).join(' / ') : ''

  // ---------- рендер ----------
  return (
    <div data-screen-label="Редактор заметки" onClick={closeMenus} style={rootVars}>
      <style>{CSS}</style>

      {/* Рельса */}
      <div style={rail}>
        <div title="Персональная ОС" style={railLogo}>ОС</div>
        <RailBtn title="Файлы — показать/скрыть панель" bg={rf.bg} color={rf.c} onClick={() => setFilesOpen((v) => !v)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="12" height="4" rx="1" /><rect x="2" y="9" width="12" height="4" rx="1" /></svg>
        </RailBtn>
        <RailBtn title="Поиск по базе — Ctrl+F" onClick={() => { setFilesOpen(true); setLeftTab('files'); setTimeout(() => searchRef.current?.focus(), 50) }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="7" cy="7" r="4.5" /><line x1="10.5" y1="10.5" x2="14" y2="14" /></svg>
        </RailBtn>
        <RailBtn title="Командная палитра — Ctrl+K" onClick={() => { setPalOpen(true); setPalQ(''); setTimeout(() => palRef.current?.focus(), 60) }} mono>⌘K</RailBtn>
        <RailBtn title="Холст — вернуться на холст" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="4" width="5" height="5" rx="1" /><rect x="4" y="9.5" width="5" height="5" rx="1" /></svg>
        </RailBtn>
        <RailBtn title="Граф знаний — вся база как сеть связей" bg={graphOn ? 'var(--accent-dim)' : 'transparent'} color={graphOn ? 'var(--accent)' : 'var(--muted)'} onClick={() => { setGraphOn((v) => !v); setMenuOpen(false) }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="4" cy="4" r="2" /><circle cx="12" cy="6" r="2" /><circle cx="7" cy="12" r="2" /><line x1="5.5" y1="5.2" x2="10.4" y2="5.7" /><line x1="5" y1="10.6" x2="4.5" y2="6" /><line x1="8.6" y1="10.9" x2="10.8" y2="7.5" /></svg>
        </RailBtn>
        <RailBtn title="Календарь — показать/скрыть правую панель" bg={rc.bg} color={rc.c} onClick={() => setRightOpen((v) => !v)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="12" height="11" rx="2" /><line x1="2" y1="6.5" x2="14" y2="6.5" /><line x1="5" y1="1.5" x2="5" y2="4" /><line x1="11" y1="1.5" x2="11" y2="4" /></svg>
        </RailBtn>
        <RailBtn title="Режим фокуса — Ctrl+Shift+F" bg={rfoc.bg} color={rfoc.c} onClick={toggleFocus} big>⛶</RailBtn>
        <div style={{ flex: 1 }} />
        <RailBtn title="Настройки">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="2.4" /><circle cx="8" cy="8" r="6" strokeDasharray="2.6 2.2" /></svg>
        </RailBtn>
      </div>

      {/* Левая панель */}
      {filesOpen && (
        <div data-screen-label="Файлы" style={leftPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: 2, marginRight: 'auto' }}>
              {(['files', 'tags'] as LeftTab[]).map((k) => (
                <button
                  key={k}
                  title={k === 'files' ? 'Дерево папок и заметок' : 'Теги со счётчиками, мультивыбор'}
                  onClick={() => setLeftTab(k)}
                  style={{ height: 20, border: 'none', borderRadius: 5, background: leftTab === k ? 'var(--accent-dim)' : 'transparent', color: leftTab === k ? 'var(--accent)' : 'var(--muted)', font: "500 10px 'JetBrains Mono',monospace", letterSpacing: '.05em', padding: '0 7px', cursor: 'pointer' }}
                >
                  {k === 'files' ? 'ФАЙЛЫ' : 'ТЕГИ'}
                </button>
              ))}
            </div>
            <IconBtn title="Новая заметка (Alt+N)" onClick={() => setTplOpen(true)}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M11.5 2.5 L13.5 4.5 L6.5 11.5 L4 12 L4.5 9.5 Z" /><line x1="2" y1="14" x2="14" y2="14" /></svg>
            </IconBtn>
            <IconBtn title="Сортировка А-Я / как в хранилище" color={sortAZ ? 'var(--accent)' : 'var(--muted)'} onClick={() => { setSortAZ((v) => !v); toast(sortAZ ? 'Сортировка: как в хранилище' : 'Сортировка: по алфавиту') }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M5 3 L5 13 M5 13 L3 11 M5 13 L7 11" /><path d="M11 13 L11 3 M11 3 L9 5 M11 3 L13 5" /></svg>
            </IconBtn>
            <IconBtn title="Свернуть все папки" onClick={() => setExpanded({})}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 7 L8 3 L12 7" /><path d="M4 13 L8 9 L12 13" /></svg>
            </IconBtn>
          </div>
          <div style={{ padding: '8px 10px 4px' }}>
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.currentTarget.value)} placeholder="Поиск по названию и тексту…" style={leftSearch} />
          </div>
          <div className="ne-scroll" style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rows.map((r) => (
              <div
                key={r.key}
                className="ne-row"
                onClick={r.onClick}
                title={r.title}
                draggable={r.drag}
                onDragStart={r.onDragStart}
                onDragOver={r.onDragOver}
                onDrop={r.onDrop}
                style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: `4px 8px 4px ${r.pad}px`, borderRadius: 6, cursor: r.onClick ? 'pointer' : 'default', background: r.bg }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, flex: 'none', font: "400 9px 'JetBrains Mono',monospace", color: r.chevC }}>{r.chev}</span>
                  <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', font: r.font, color: r.color }}>{r.label}</span>
                  <span style={{ flex: 'none', font: "400 9.5px 'JetBrains Mono',monospace", color: 'var(--c-code)' }}>{r.star}</span>
                </div>
                {r.sub && (
                  <div style={{ marginLeft: 16, font: "400 10px/1.4 'IBM Plex Sans',sans-serif", color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
            <span style={{ font: "500 11px 'IBM Plex Sans',sans-serif", color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{root ? baseOf(root) : 'Хранилище'}</span>
            <div style={{ flex: 1 }} />
            <span style={{ font: "400 9.5px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>{notes.length} заметок</span>
          </div>
        </div>
      )}

      {/* Центральная колонка */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Табы */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 2, padding: '6px 8px 0', background: 'var(--panel)', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {orderedTabs.map((path) => {
            const act = path === active
            const pin = !!pinned[path]
            return (
              <div key={path} onClick={() => openNote(path)} title={baseOf(path)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px 6px 12px', maxWidth: 190, borderRadius: '8px 8px 0 0', cursor: 'pointer', background: act ? 'var(--bg)' : 'transparent', border: `1px solid ${act ? 'var(--border)' : 'transparent'}`, borderBottom: 'none' }}>
                <span style={{ width: 7, height: 7, flex: 'none', borderRadius: 2, background: act ? 'var(--c-note)' : 'var(--edge)' }} />
                <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', font: `${act ? 500 : 400} 11.5px 'IBM Plex Sans',sans-serif`, color: act ? 'var(--text)' : 'var(--muted)' }}>{baseOf(path)}</span>
                <button title={pin ? 'Открепить вкладку' : 'Закрепить вкладку'} onClick={(e) => { e.stopPropagation(); setPinned((pp) => ({ ...pp, [path]: !pp[path] })) }} style={{ width: 16, height: 16, flex: 'none', border: 'none', borderRadius: 4, background: 'transparent', color: pin ? 'var(--accent)' : 'var(--edge)', fontSize: 9, display: 'grid', placeItems: 'center', padding: 0, cursor: 'pointer' }}>{pin ? '◉' : '○'}</button>
                {!pin && (
                  <button title="Закрыть вкладку" onClick={(e) => { e.stopPropagation(); setTabs((t) => { const nt = t.filter((x) => x !== path); if (active === path) setActive(nt[nt.length - 1] || null); return nt }) }} style={{ width: 16, height: 16, flex: 'none', border: 'none', borderRadius: 4, background: 'transparent', color: 'var(--muted)', fontSize: 10, display: 'grid', placeItems: 'center', padding: 0, cursor: 'pointer' }}>✕</button>
                )}
              </div>
            )
          })}
          <button title="Новая вкладка (выбор шаблона)" onClick={() => setTplOpen(true)} style={{ width: 26, flex: 'none', alignSelf: 'center', height: 26, border: 'none', borderRadius: 7, background: 'transparent', color: 'var(--muted)', fontSize: 14, cursor: 'pointer' }}>+</button>
        </div>

        {/* Шапка заметки */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
          <button title="Назад по истории (Alt+←)" onClick={navBack} style={navBtn(histPos > 0)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 3 L5 8 L10 13" /></svg>
          </button>
          <button title="Вперёд по истории (Alt+→)" onClick={navFwd} style={navBtn(histPos < hist.length - 1)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 3 L11 8 L6 13" /></svg>
          </button>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, font: "400 11px 'JetBrains Mono',monospace", color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden' }}>{crumb}</div>
          <div style={{ display: 'flex', gap: 2, background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, padding: 2 }}>
            {(['read', 'edit', 'split'] as Mode[]).map((k) => (
              <button key={k} title={k === 'read' ? 'Только чтение (Ctrl+E)' : k === 'edit' ? 'Редактирование Markdown (Ctrl+E)' : 'Markdown слева, превью справа'} onClick={() => setMode(k)} style={{ height: 22, border: 'none', borderRadius: 6, background: mode === k ? 'var(--accent-dim)' : 'transparent', color: mode === k ? 'var(--accent)' : 'var(--muted)', font: "500 9.5px 'JetBrains Mono',monospace", padding: '0 9px', cursor: 'pointer' }}>{k === 'read' ? 'ЧТЕНИЕ' : k === 'edit' ? 'ПРАВКА' : 'СПЛИТ'}</button>
            ))}
          </div>
          <button title="ИИ-ассистент по заметке" onClick={() => setAiOpen((v) => !v)} style={{ height: 26, border: `1px solid ${aiOpen ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 7, background: aiOpen ? 'var(--accent-dim)' : 'transparent', color: aiOpen ? 'var(--accent)' : 'var(--muted)', font: "500 10px 'JetBrains Mono',monospace", padding: '0 10px', cursor: 'pointer' }}>✦ ИИ</button>
          <div style={{ position: 'relative' }}>
            <button title="Ещё" onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }} style={{ width: 26, height: 26, border: 'none', borderRadius: 7, background: menuOpen ? 'var(--panel2)' : 'transparent', color: 'var(--muted)', display: 'grid', placeItems: 'center', fontSize: 13, letterSpacing: 1, cursor: 'pointer' }}>⋯</button>
            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 32, width: 220, background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 14px 34px rgba(0,0,0,.5)', padding: 5, zIndex: 40, display: 'flex', flexDirection: 'column' }}>
                <MenuItem onClick={() => { setMenuOpen(false); if (note) { if (onSendToCanvas) onSendToCanvas(note.title, note.md); toast('Заметка добавлена нодой на холст') } }}>→ Отправить на холст</MenuItem>
                <MenuItem onClick={() => { setMenuOpen(false); if (note) { try { navigator.clipboard.writeText(note.md) } catch { /* noop */ } toast('Markdown скопирован в буфер обмена') } }}>⧉ Скопировать Markdown</MenuItem>
                <MenuItem onClick={duplicateNote}>⊕ Дублировать заметку</MenuItem>
                <MenuItem color="var(--c-code)" onClick={() => { setMenuOpen(false); if (active) setFavs((f) => ({ ...f, [active]: !f[active] })) }}>★ {isFav ? 'Убрать из избранного' : 'В избранное'}</MenuItem>
                <MenuItem onClick={() => { setMenuOpen(false); if (note) { setRenaming(true); setTmpTitle(note.title); setTimeout(() => renameRef.current?.focus(), 60) } }}>✎ Переименовать</MenuItem>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 6px' }} />
                <MenuItem color="#F87171" onClick={deleteNote}>🗑 В корзину</MenuItem>
              </div>
            )}
          </div>
        </div>

        {/* Тело + ИИ-панель */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div ref={scrollRef} className="ne-scroll" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
            <div style={{ maxWidth: mode === 'split' ? 1280 : 760, margin: '0 auto', padding: '36px 40px 80px' }}>
              {note && !renaming && (
                <div onClick={() => { setRenaming(true); setTmpTitle(note.title); setTimeout(() => renameRef.current?.focus(), 60) }} title="Кликните, чтобы переименовать" style={{ font: "600 30px/1.2 'IBM Plex Sans',sans-serif", color: 'var(--c-note)', marginBottom: 22, cursor: 'text' }}>{note.title}</div>
              )}
              {note && renaming && (
                <input ref={renameRef} value={tmpTitle} onChange={(e) => setTmpTitle(e.currentTarget.value)} onBlur={commitRename} onKeyDown={(e) => { if (e.code === 'Enter') e.currentTarget.blur(); if (e.code === 'Escape') setRenaming(false) }} style={{ width: '100%', background: 'var(--panel)', border: '1px solid var(--accent)', borderRadius: 10, color: 'var(--c-note)', font: "600 30px/1.2 'IBM Plex Sans',sans-serif", padding: '2px 10px', marginBottom: 22, outline: 'none' }} />
              )}

              {!note && (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', font: "400 13px 'IBM Plex Sans',sans-serif" }}>
                  {root ? 'Выберите заметку слева или создайте новую ✎' : 'Хранилище не выбрано — откройте папку через меню «Заметки»'}
                </div>
              )}

              {note && (
                <>
                  {/* Свойства */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 12, background: 'var(--panel)', marginBottom: 30, overflow: 'hidden' }}>
                    <button onClick={() => setPropsOpen((v) => !v)} className="ne-hover2" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', color: 'var(--muted)', font: "500 10px 'JetBrains Mono',monospace", letterSpacing: '.06em', padding: '10px 14px', textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ width: 10 }}>{propsOpen ? '▾' : '▸'}</span><span>СВОЙСТВА</span>
                    </button>
                    {propsOpen && (
                      <div style={{ padding: '2px 14px 12px', display: 'flex', flexDirection: 'column' }}>
                        {propRows.map((p, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', minHeight: 26 }}>
                            <span style={{ width: 92, flex: 'none', display: 'flex', alignItems: 'center', gap: 7, font: "400 12px 'IBM Plex Sans',sans-serif", color: 'var(--muted)' }}><span style={{ font: "400 10px 'JetBrains Mono',monospace" }}>{p.icon}</span>{p.name}</span>
                            <span style={{ flex: 1, minWidth: 0, font: `400 12px ${p.vfont}`, color: p.vcolor, userSelect: 'text', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', borderBottom: p.vline, cursor: p.vcursor as React.CSSProperties['cursor'] }}>{p.value}</span>
                          </div>
                        ))}
                        <button title="Добавить свойство" onClick={() => setExtraProps((v) => v + 1)} className="ne-hover2" style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--muted)', font: "400 12px 'IBM Plex Sans',sans-serif", padding: '5px 8px', margin: '4px 0 0 -8px', cursor: 'pointer' }}>+ Добавить свойство</button>
                      </div>
                    )}
                  </div>

                  <div style={{ display: mode === 'split' ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: 26, alignItems: 'start' }}>
                    {/* Редактор — live-preview на CodeMirror (как в Obsidian) */}
                    {editVisible && active && (
                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
                          {FMT.map((f) => (
                            <button key={f.t} title={f.tip} onClick={() => fmtInsert(f.b, f.a, f.ph)} className="ne-fmt" style={{ height: 24, minWidth: 26, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--panel2)', color: 'var(--text)', font: f.font, padding: '0 8px', cursor: 'pointer' }}>{f.t}</button>
                          ))}
                        </div>
                        <div style={{ height: mode === 'split' ? 'calc(100vh - 340px)' : 'calc(100vh - 300px)', minHeight: 460, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                          <MarkdownEditor
                            ref={cmRef}
                            docId={active}
                            value={value}
                            onChange={onEditorChange}
                            onOpenLink={openWiki}
                            onOpenBoard={(n) => { onClose(); onOpenBoard(n) }}
                            boards={boards}
                            notes={notes}
                          />
                        </div>
                      </div>
                    )}

                    {/* Чтение */}
                    {readVisible && (
                      <div style={{ display: 'flex', flexDirection: 'column', userSelect: 'text' }}>
                        {blocks.map((b, bi) => (
                          <div key={bi} id={b.anchor || undefined} style={{ font: b.font, color: b.color, margin: b.margin, padding: b.pad, background: b.bg, borderLeft: b.bl, borderRadius: b.radius }}>
                            {b.isText && b.spans.map((s, si) => (
                              <span key={si} onClick={s.click || undefined} style={{ fontWeight: s.w, fontStyle: s.fs, color: s.c, borderBottom: s.bb, cursor: s.cur }}>{s.t}</span>
                            ))}
                            {b.isTable && (
                              <div style={{ display: 'grid', gridTemplateColumns: b.cols, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                                {b.cells!.map((c, ci2) => (
                                  <div key={ci2} style={{ padding: '8px 12px', font: c.font, color: c.color, background: c.bg, borderBottom: '1px solid var(--border)' }}>{c.t}</div>
                                ))}
                              </div>
                            )}
                            {b.isImg && (
                              <div style={{ height: 180, border: '1px dashed var(--edge)', borderRadius: 12, background: 'repeating-linear-gradient(45deg,var(--panel) 0 12px,var(--panel2) 12px 24px)', display: 'grid', placeItems: 'center' }}>
                                <span style={{ font: "500 10.5px 'JetBrains Mono',monospace", color: 'var(--muted)', background: 'var(--bg)', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)' }}>{b.alt} — перетащите изображение</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ИИ-панель */}
          {aiOpen && (
            <div data-screen-label="ИИ-панель" style={{ width: 300, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderLeft: '1px solid var(--border)', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
                <span style={{ font: "500 10.5px 'JetBrains Mono',monospace", color: 'var(--muted)', letterSpacing: '.04em' }}>ИИ-АССИСТЕНТ</span>
                <span style={{ font: "500 10px 'JetBrains Mono',monospace", color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 7px', borderRadius: 4, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aiModelLabel || aiModel || 'модель'}</span>
                <div style={{ flex: 1 }} />
                <button title="Закрыть панель" onClick={() => setAiOpen(false)} className="ne-hover2" style={{ width: 22, height: 22, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--muted)', fontSize: 10, cursor: 'pointer' }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                {aiActs.map((a) => (
                  <button key={a.k} title={a.tip} onClick={() => aiRun(a.k)} className="ne-fmt" style={{ height: 24, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--panel2)', color: 'var(--text)', font: "500 10px 'JetBrains Mono',monospace", padding: '0 9px', cursor: 'pointer' }}>{a.t}</button>
                ))}
              </div>
              <div ref={aiBoxRef} className="ne-scroll" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {aiMsgs.map((m, mi) => (
                  <div key={mi} style={{ alignSelf: m.role === 'u' ? 'flex-end' : 'flex-start', maxWidth: '90%', background: m.role === 'u' ? 'var(--accent-dim)' : 'var(--panel2)', border: `1px solid ${m.role === 'u' ? 'var(--accent)' : 'var(--border)'}`, borderRadius: m.role === 'u' ? '10px 10px 3px 10px' : '10px 10px 10px 3px', padding: '8px 11px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ font: "400 11.5px/1.55 'IBM Plex Sans',sans-serif", whiteSpace: 'pre-line', userSelect: 'text', animation: m.thinking ? 'ne-pulse 1.1s infinite' : 'none' }}>{m.text}</div>
                    {m.btn && (
                      <button onClick={m.onBtn || undefined} style={{ alignSelf: 'flex-start', border: '1px solid var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 6, font: "500 10px 'JetBrains Mono',monospace", padding: '4px 9px', cursor: 'pointer' }}>{m.btn}</button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
                <input value={aiInput} onChange={(e) => setAiInput(e.currentTarget.value)} onKeyDown={(e) => { if (e.code === 'Enter') aiSendMsg() }} placeholder="Спросить про заметку…" className="ne-input" style={{ flex: 1, background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', font: "400 11.5px 'IBM Plex Sans',sans-serif", padding: '7px 10px', outline: 'none' }} />
                <button title="Отправить" onClick={aiSendMsg} style={{ width: 30, height: 30, border: 'none', borderRadius: 8, background: 'var(--accent)', color: '#0A0B0D', fontSize: 13, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>↑</button>
              </div>
            </div>
          )}
        </div>

        {/* Статус-бар */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '5px 14px', background: 'var(--panel)', borderTop: '1px solid var(--border)', font: "400 10px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>
          <span title="Заметки, ссылающиеся на эту">обратных ссылок: {backlinks.length}</span>
          <div style={{ flex: 1 }} />
          <span title="Оценка времени чтения">~{readMin} мин чтения</span>
          <span>слов: {words}</span>
          <span>символов: {note ? note.md.length : 0}</span>
          <span title="Все изменения сохранены локально" style={{ color: 'var(--c-note)' }}>● сохранено</span>
        </div>
      </div>

      {/* Правая панель */}
      {rightOpen && (
        <div data-screen-label="Календарь" style={rightPanel}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '14px 14px 8px' }}>
            <span style={{ font: "600 16px 'IBM Plex Sans',sans-serif", color: 'var(--text)' }}>{monthNames[calM]}</span>
            <span style={{ font: "600 16px 'IBM Plex Sans',sans-serif", color: 'var(--accent)' }}>{calY}</span>
            <div style={{ flex: 1 }} />
            <SmallBtn title="Предыдущий месяц" onClick={() => { setCalM((m) => (m === 0 ? 11 : m - 1)); setCalY((y) => (calM === 0 ? y - 1 : y)) }}>‹</SmallBtn>
            <SmallBtn title="К сегодняшнему дню" onClick={() => { setCalY(todayIso.getFullYear()); setCalM(todayIso.getMonth()) }} mono>СЕГОДНЯ</SmallBtn>
            <SmallBtn title="Следующий месяц" onClick={() => { setCalM((m) => (m === 11 ? 0 : m + 1)); setCalY((y) => (calM === 11 ? y + 1 : y)) }}>›</SmallBtn>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, padding: '0 12px' }}>
            {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map((d) => (
              <div key={d} style={{ textAlign: 'center', font: "500 8.5px 'JetBrains Mono',monospace", color: 'var(--muted)', padding: '4px 0' }}>{d}</div>
            ))}
            {calDays.map((d, i) => (
              <button key={i} title={d.tip} onClick={d.onClick} className="ne-cal" style={{ aspectRatio: '1', border: `1px solid ${d.border}`, borderRadius: 7, background: d.bg, color: d.color, font: d.font, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, padding: 0, cursor: 'pointer' }}>
                <span>{d.n}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: d.dot }} />
              </button>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '12px 12px 0' }} />
          <div className="ne-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            <SectionTitle>ЛОКАЛЬНЫЙ ГРАФ</SectionTitle>
            <div style={{ position: 'relative', height: 118, margin: '0 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {lgEdges.map((e, i) => (
                  <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke="var(--edge)" strokeWidth="1.2" />
                ))}
              </svg>
              {lgNodes.map((n, i) => (
                <div key={i} onClick={n.onClick || undefined} title={n.tip} style={{ position: 'absolute', left: n.x, top: n.y, transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: n.cur }}>
                  <div style={{ width: n.size, height: n.size, borderRadius: '50%', background: n.fill, border: n.border }} />
                  {n.label && <div style={{ font: "400 8.5px 'JetBrains Mono',monospace", color: n.c, whiteSpace: 'nowrap', maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</div>}
                </div>
              ))}
              {lgEmpty && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', font: "400 10px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>нет связей</div>}
            </div>

            <SectionTitle>СТРУКТУРА</SectionTitle>
            <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {outline.length === 0 && <div style={{ padding: '4px 8px', font: "400 11.5px 'IBM Plex Sans',sans-serif", color: 'var(--muted)' }}>— нет заголовков —</div>}
              {outline.map((o, i) => (
                <div key={i} onClick={o.onClick} className="ne-hover2" title="Прокрутить к заголовку" style={{ padding: `4px 8px 4px ${o.pad}px`, borderRadius: 6, cursor: 'pointer', font: "400 11.5px 'IBM Plex Sans',sans-serif", color: o.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.t}</div>
              ))}
            </div>

            <SectionTitle>ИЗМЕНЕНО НЕДАВНО</SectionTitle>
            <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentRows.map((rr) => (
                <div key={rr.path} onClick={() => openNote(rr.path)} className="ne-hover2" title="Открыть заметку" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, cursor: 'pointer' }}>
                  <span style={{ flex: 1, minWidth: 0, font: "400 11.5px 'IBM Plex Sans',sans-serif", color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rr.title}</span>
                  <span style={{ flex: 'none', font: "400 8.5px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>{rr.when}</span>
                </div>
              ))}
            </div>

            <SectionTitle>ОБРАТНЫЕ ССЫЛКИ · {backlinks.length}</SectionTitle>
            <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {backlinks.map((bl) => (
                <div key={bl.path} onClick={() => openNote(bl.path)} className="ne-back" title="Перейти к заметке" style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 10px', borderRadius: 8, background: 'var(--panel2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  <span style={{ font: "500 11.5px 'IBM Plex Sans',sans-serif", color: 'var(--text)' }}>{bl.title}</span>
                  <span style={{ font: "400 10.5px/1.45 'IBM Plex Sans',sans-serif", color: 'var(--muted)' }}>{bl.snippet}</span>
                </div>
              ))}
              {backlinks.length === 0 && <div style={{ padding: '6px 10px', font: "400 11px 'IBM Plex Sans',sans-serif", color: 'var(--muted)' }}>Никто пока не ссылается на эту заметку</div>}
            </div>

            <SectionTitle>ПОХОЖИЕ ЗАМЕТКИ</SectionTitle>
            <div style={{ padding: '0 8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {simRows.length === 0 && <div style={{ padding: '6px 10px', font: "400 11px 'IBM Plex Sans',sans-serif", color: 'var(--muted)' }}>— пока нет —</div>}
              {simRows.map((sm) => (
                <div key={sm.path} onClick={() => openNote(sm.path)} className="ne-hover2" title="Открыть похожую заметку" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ flex: 1, minWidth: 0, font: "400 11.5px 'IBM Plex Sans',sans-serif", color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sm.title}</span>
                  <span style={{ font: "500 9px 'JetBrains Mono',monospace", color: 'var(--accent)', background: 'var(--accent-dim)', padding: '2px 6px', borderRadius: 4 }}>{sm.pct}%</span>
                </div>
              ))}
            </div>

            <SectionTitle>СТАТИСТИКА БАЗЫ</SectionTitle>
            <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 14, font: "400 9.5px 'JetBrains Mono',monospace", color: 'var(--muted)' }}><span>заметок: {statNotes}</span><span>слов: {statWords}</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 3 }}>
                {actCells.map((c, i) => (
                  <div key={i} style={{ aspectRatio: '1', borderRadius: 2, background: c }} />
                ))}
              </div>
              <div style={{ font: "400 8.5px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>активность за 12 недель</div>
            </div>

            {showMinimap && (
              <>
                <SectionTitle>ХОЛСТ · МОЙ ПРОЕКТ</SectionTitle>
                <div onClick={onClose} title="Вернуться на холст" className="ne-mm" style={{ position: 'relative', height: 104, margin: '0 12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', overflow: 'hidden' }}>
                  {mmRects.map((m, i) => (
                    <div key={i} style={{ position: 'absolute', left: m.x, top: m.y, width: m.w, height: m.h, background: m.c, borderRadius: 2, opacity: 0.8 }} />
                  ))}
                  <div style={{ position: 'absolute', right: 7, bottom: 5, font: "400 8.5px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>открыть →</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Граф знаний */}
      {graphOn && (
        <div data-screen-label="Граф знаний" style={{ position: 'absolute', top: 0, bottom: 0, left: 52, right: 0, zIndex: 25, display: 'flex', flexDirection: 'column', background: 'var(--bg)', backgroundImage: 'radial-gradient(var(--grid) 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
            <span style={{ font: "500 10px 'JetBrains Mono',monospace", color: 'var(--muted)', letterSpacing: '.06em' }}>ГРАФ ЗНАНИЙ</span>
            <span style={{ font: "400 10px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>{gStats}</span>
            <div style={{ flex: 1 }} />
            {allTags.map((t) => {
              const on = graphTag === t
              return (
                <button key={t} title="Фильтр по тегу" onClick={() => setGraphTag(on ? '' : t)} style={{ height: 22, border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 6, background: on ? 'var(--accent-dim)' : 'transparent', color: on ? 'var(--accent)' : 'var(--muted)', font: "500 10px 'JetBrains Mono',monospace", padding: '0 8px', cursor: 'pointer' }}>{t}</button>
              )
            })}
            <button title="Закрыть граф (Esc)" onClick={() => setGraphOn(false)} className="ne-hover2" style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--muted)', fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>
          <div onWheel={(e) => { const z = Math.max(0.5, Math.min(2, gZoom * (e.deltaY > 0 ? 0.9 : 1.1))); setGZoom(Math.round(z * 100) / 100) }} style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            <div style={{ position: 'relative', width: 900, height: 560, transform: `scale(${gZoom})`, transformOrigin: 'center' }}>
              <svg style={{ position: 'absolute', left: 0, top: 0, width: 900, height: 560, overflow: 'visible', pointerEvents: 'none' }}>
                {g.edges.map(([a, b], i) => {
                  const vis = nodeVis(g.nodes[a]) && nodeVis(g.nodes[b])
                  const hot = g.nodes[a].key === active || g.nodes[b].key === active
                  return (
                    <line key={i} x1={Math.round(g.pos[a].x)} y1={Math.round(g.pos[a].y)} x2={Math.round(g.pos[b].x)} y2={Math.round(g.pos[b].y)} stroke={hot ? 'var(--accent)' : 'var(--edge)'} strokeWidth="1.4" strokeDasharray={g.nodes[a].real && g.nodes[b].real ? 'none' : '4 4'} opacity={vis ? (hot ? 0.9 : 0.55) : 0.1} />
                  )
                })}
              </svg>
              {g.nodes.map((n, i) => {
                const act = n.key === active
                const openFn = async (): Promise<void> => {
                  if (n.real) {
                    openNote(n.key)
                    setGraphOn(false)
                  } else {
                    const dir = findDir(/inbox|входящ/i)
                    const res = await window.flow.vaultCreate({ dir, name: n.label, content: '# ' + n.label + '\nЗаметка создана из графа знаний.' })
                    if (res.ok) {
                      await refreshTree()
                      openNote(res.path)
                      setGraphOn(false)
                      setMode('edit')
                    }
                  }
                }
                return (
                  <div key={n.key} onMouseDown={(e) => gDown(e, i, openFn)} title={n.real ? `«${n.label}» — клик откроет, тяните для перестановки` : 'Заметки ещё нет — клик создаст её'} style={{ position: 'absolute', left: Math.round(g.pos[i].x), top: Math.round(g.pos[i].y), transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'grab', opacity: nodeVis(n) ? 1 : 0.18 }}>
                    <div style={{ width: 12 + n.deg * 5, height: 12 + n.deg * 5, borderRadius: '50%', background: n.real ? (act ? 'var(--accent-dim)' : 'var(--panel2)') : 'transparent', border: n.real ? `2px solid ${act ? 'var(--accent)' : 'var(--edge)'}` : '2px dashed var(--edge)', boxShadow: act ? '0 0 18px rgba(34,211,238,.35)' : 'none' }} />
                    <div style={{ font: `${act ? 500 : 400} 10.5px 'IBM Plex Sans',sans-serif`, color: act ? 'var(--accent)' : n.real ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 18, padding: '6px 14px', background: 'var(--panel)', borderTop: '1px solid var(--border)', font: "400 10px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>
            <span>клик — открыть · тяните ноды</span><span>колесо — зум ({Math.round(gZoom * 100)}%)</span><span>пунктир — заметки ещё нет, клик создаст</span><span>размер — число связей</span>
          </div>
        </div>
      )}

      {/* Командная палитра */}
      {palOpen && (
        <div onClick={() => setPalOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(6,7,9,.55)', zIndex: 60, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: 110 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 540, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ font: "400 12px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>›</span>
              <input ref={palRef} value={palQ} onChange={(e) => setPalQ(e.currentTarget.value)} placeholder="Команда или заметка…" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', font: "400 13px 'IBM Plex Sans',sans-serif" }} />
              <span style={{ font: "400 9px 'JetBrains Mono',monospace", color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 5px' }}>ESC</span>
            </div>
            <div className="ne-scroll" style={{ maxHeight: 320, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {palRows.map((p, i) => (
                <div key={i} onClick={p.onClick} className="ne-hover2" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}>
                  <span style={{ width: 18, textAlign: 'center', font: "400 11px 'JetBrains Mono',monospace", color: p.kc }}>{p.k}</span>
                  <span style={{ flex: 1, minWidth: 0, font: "400 12.5px 'IBM Plex Sans',sans-serif", color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.label}</span>
                  <span style={{ font: "400 9.5px 'JetBrains Mono',monospace", color: 'var(--muted)' }}>{p.hint}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Выбор шаблона */}
      {tplOpen && (
        <div onClick={() => setTplOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(6,7,9,.55)', zIndex: 60, display: 'grid', placeItems: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 460, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 24px 60px rgba(0,0,0,.6)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ font: "500 10px 'JetBrains Mono',monospace", color: 'var(--muted)', letterSpacing: '.06em' }}>НОВАЯ ЗАМЕТКА · ВЫБЕРИТЕ ШАБЛОН</span>
              <div style={{ flex: 1 }} />
              <button title="Закрыть" onClick={() => setTplOpen(false)} className="ne-hover2" style={{ width: 22, height: 22, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--muted)', fontSize: 10, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: 12 }}>
              {TPLS.map((tp) => (
                <button key={tp.name} onClick={() => createNote(tp)} className="ne-tpl" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--panel2)', padding: '12px 14px', textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ font: "400 16px 'JetBrains Mono',monospace", color: 'var(--accent)' }}>{tp.icon}</span>
                  <span style={{ font: "500 12.5px 'IBM Plex Sans',sans-serif", color: 'var(--text)' }}>{tp.name}</span>
                  <span style={{ font: "400 10.5px/1.4 'IBM Plex Sans',sans-serif", color: 'var(--muted)' }}>{tp.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Тост */}
      {toastMsg && (
        <div style={{ position: 'absolute', bottom: 44, left: '50%', transform: 'translateX(-50%)', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 16px', font: "400 11.5px 'IBM Plex Sans',sans-serif", color: 'var(--text)', boxShadow: '0 10px 30px rgba(0,0,0,.5)', zIndex: 70, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{toastMsg}</span>
          {toastAct && (
            <button onClick={() => { const a = toastAct; setToastMsg(''); setToastAct(null); a.fn() }} style={{ border: '1px solid var(--accent)', background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 6, font: "500 10px 'JetBrains Mono',monospace", padding: '3px 9px', cursor: 'pointer' }}>{toastAct.label}</button>
          )}
        </div>
      )}
    </div>
  )
}

// ---------- мелкие компоненты ----------
function RailBtn({ title, onClick, children, bg = 'transparent', color = 'var(--muted)', mono, big }: { title: string; onClick?: () => void; children: React.ReactNode; bg?: string; color?: string; mono?: boolean; big?: boolean }): JSX.Element {
  return (
    <button title={title} onClick={onClick} className="ne-rail" style={{ width: 34, height: 34, border: 'none', borderRadius: 8, background: bg, color, display: 'grid', placeItems: 'center', cursor: 'pointer', ...(mono ? { font: "500 9.5px 'JetBrains Mono',monospace" } : {}), ...(big ? { fontSize: 13 } : {}) }}>{children}</button>
  )
}
function IconBtn({ title, onClick, children, color = 'var(--muted)' }: { title: string; onClick?: () => void; children: React.ReactNode; color?: string }): JSX.Element {
  return (
    <button title={title} onClick={onClick} className="ne-hover2" style={{ width: 24, height: 24, border: 'none', borderRadius: 6, background: 'transparent', color, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>{children}</button>
  )
}
function SmallBtn({ title, onClick, children, mono }: { title: string; onClick?: () => void; children: React.ReactNode; mono?: boolean }): JSX.Element {
  return (
    <button title={title} onClick={onClick} className="ne-hover2" style={{ height: 22, minWidth: 22, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: mono ? '0 6px' : 0, ...(mono ? { font: "500 9px 'JetBrains Mono',monospace" } : { fontSize: 11 }) }}>{children}</button>
  )
}
function MenuItem({ onClick, children, color = 'var(--text)' }: { onClick?: () => void; children: React.ReactNode; color?: string }): JSX.Element {
  return (
    <button onClick={onClick} className="ne-menuitem" style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 7, background: 'transparent', color, font: "400 12px 'IBM Plex Sans',sans-serif", padding: '7px 9px', textAlign: 'left', cursor: 'pointer' }}>{children}</button>
  )
}
function SectionTitle({ children }: { children: React.ReactNode }): JSX.Element {
  return <div style={{ padding: '12px 14px 6px', font: "500 10px 'JetBrains Mono',monospace", color: 'var(--muted)', letterSpacing: '.05em' }}>{children}</div>
}

const FMT = [
  { t: 'B', tip: 'Жирный', font: "600 11px 'JetBrains Mono',monospace", b: '**', a: '**', ph: 'жирный' },
  { t: 'I', tip: 'Курсив', font: "italic 400 11px 'JetBrains Mono',monospace", b: '*', a: '*', ph: 'курсив' },
  { t: '[[ ]]', tip: 'Вики-ссылка на заметку', font: "500 10.5px 'JetBrains Mono',monospace", b: '[[', a: ']]', ph: 'Название заметки' },
  { t: '☐', tip: 'Чекбокс-задача', font: "500 10.5px 'JetBrains Mono',monospace", b: '\n- [ ] ', a: '', ph: 'задача' },
  { t: '•', tip: 'Пункт списка', font: "500 10.5px 'JetBrains Mono',monospace", b: '\n- ', a: '', ph: 'пункт' },
  { t: '❝', tip: 'Цитата', font: "500 10.5px 'JetBrains Mono',monospace", b: '\n> ', a: '', ph: 'цитата' },
  { t: '▦', tip: 'Таблица', font: "500 10.5px 'JetBrains Mono',monospace", b: '\n| Колонка 1 | Колонка 2 |\n| --- | --- |\n| ', a: ' |  |', ph: 'значение' },
  { t: '▣', tip: 'Изображение', font: "500 10.5px 'JetBrains Mono',monospace", b: '\n![', a: ']', ph: 'описание изображения' }
]

const rail: React.CSSProperties = { width: 52, flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 0', background: 'var(--panel)', borderRight: '1px solid var(--border)', zIndex: 30 }
const railLogo: React.CSSProperties = { width: 26, height: 26, marginBottom: 8, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 7, display: 'grid', placeItems: 'center', color: 'var(--accent)', font: "600 11px 'JetBrains Mono',monospace" }
const leftPanel: React.CSSProperties = { width: 238, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderRight: '1px solid var(--border)', minHeight: 0, zIndex: 20 }
const rightPanel: React.CSSProperties = { width: 250, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--panel)', borderLeft: '1px solid var(--border)', minHeight: 0, zIndex: 20 }
const leftSearch: React.CSSProperties = { width: '100%', background: 'var(--panel2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text)', font: "400 11.5px 'IBM Plex Sans',sans-serif", padding: '6px 9px', outline: 'none' }
const navBtn = (on: boolean): React.CSSProperties => ({ width: 26, height: 26, border: 'none', borderRadius: 7, background: 'transparent', color: on ? 'var(--text)' : 'var(--edge)', display: 'grid', placeItems: 'center', cursor: 'pointer' })

const CSS = `
.ne-scroll::-webkit-scrollbar { width:8px; height:8px; }
.ne-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius:4px; }
.ne-scroll::-webkit-scrollbar-track { background: transparent; }
.ne-row:hover { background: var(--panel2) !important; }
.ne-rail:hover { background: var(--panel2); color: var(--text); }
.ne-hover:hover { background: var(--border); }
.ne-hover2:hover { background: var(--panel2); color: var(--text); }
.ne-menuitem:hover { background: var(--border); }
.ne-fmt:hover { border-color: var(--accent) !important; color: var(--accent) !important; }
.ne-cal:hover { background: var(--panel2) !important; }
.ne-back:hover { border-color: var(--edge) !important; }
.ne-mm:hover { border-color: var(--accent) !important; }
.ne-tpl:hover { border-color: var(--accent) !important; }
.ne-input:focus { border-color: var(--accent) !important; }
@keyframes ne-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
/* CodeMirror live-preview редактор */
.vault-cm { --vault-serif: 'IBM Plex Sans', -apple-system, 'Segoe UI', system-ui, sans-serif; --vault-mono: 'JetBrains Mono', monospace; }
.vault-cm .cm-scroller::-webkit-scrollbar { width:8px; height:8px; }
.vault-cm .cm-scroller::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius:4px; }
.vault-cm .cm-tooltip.cm-tooltip-autocomplete { background: var(--panel2); border:1px solid var(--accent); border-radius:8px; box-shadow:0 14px 34px rgba(0,0,0,.55); }
.vault-cm .cm-tooltip-autocomplete ul li { font-family: var(--vault-serif); font-size:12.5px; padding:5px 9px; }
.vault-cm .cm-tooltip-autocomplete ul li[aria-selected] { background: var(--accent-dim); color: var(--accent); }
`
