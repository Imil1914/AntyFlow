import {
  Tldraw,
  createShapeId,
  useEditor,
  useValue,
  getSnapshot,
  loadSnapshot,
  DefaultStylePanel,
  type Editor,
  type TLAssetStore,
  type TLComponents,
  type TLShapeId
} from 'tldraw'
import { useSync } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FlowArrowShapeUtil, FlowNodeShapeUtil, NodeFullscreenOverlay, sheetModelFromFile, webLLMRegistry, digestDayRange, rollupMemory, readBoardMem, migrateBoardExtras, searchTranscripts, type FlowNodeShape } from './shapes/FlowNodeShapeUtil'
import { hydrateBoard, bmetaGet, bmetaSet, migrateLocalStorageToDb } from './boardStore'
import { buildNodeIndex } from './search'
import { DESIGN_CSS } from './slides/design'
import SlideEditor from './slides/SlideEditor'
import { OS_CSS, themeVars, THEME_ORDER, THEME_SWATCH, type ThemeName } from './os/theme'
import { IconCanvas, IconObsidian, IconGraph, IconAgents, IconGen, IconSettings } from './os/icons'
import { NodeIcon, GroupIcon } from './os/nodeIcons'
import { HierarchyPanel } from './os/HierarchyPanel'
import {
  Toast,
  GlobalSearch,
  RagModal,
  GraphOverlay,
  AgentsStudio,
  GenStudio,
  MobileView,
  type Command,
  type SearchNav
} from './os/overlays'
import { VaultView } from './vault/VaultView'

const customShapeUtils = [FlowNodeShapeUtil, FlowArrowShapeUtil]

// Управление камерой, удобное и для мыши, и для тачпада (как в Figma/Miro):
//  • прокрутка / два пальца по тачпаду — панорама холста;
//  • щипок (pinch) на тачпаде или Ctrl+колесо — зум;
//  • панель ⊖ % ⊕ ⤢ в статус-баре — зум и «вписать» для тех, у кого нет жестов.
// (раньше было wheelBehavior:'zoom' — на тачпаде прокрутка дёргано зумила).
const CAMERA_OPTIONS = { wheelBehavior: 'pan' as const, panSpeed: 1, zoomSpeed: 1 }

// Общая доска в режиме real-time: стор берём с sync-сервера (useSync), а не из
// локального IndexedDB. Курсоры и правки других участников — из коробки.
function SharedBoard({
  uri,
  components,
  onMount
}: {
  uri: string
  components: TLComponents
  onMount: (ed: Editor) => void
}) {
  const store = useSync({ uri, assets: flowAssetStore, shapeUtils: customShapeUtils })
  return (
    <Tldraw
      store={store}
      shapeUtils={customShapeUtils}
      components={components}
      cameraOptions={CAMERA_OPTIONS}
      onMount={onMount}
    />
  )
}

// Оркестратор (research-фаза скилла lecture-forge) просит создать ноды на доске.
// Раскладываем кластерами по граням: каждая грань — свой столбец, узлы стопкой.
type OrchNodeSpec = {
  kind: string
  title: string
  body?: string
  facet?: string
  url?: string
  meta?: Record<string, unknown>
  data?: unknown // структура для интерактивных нод (kanban/sheet/list)
}
// Короткий id для карточек/колонок канбана (формат как у kbId в шейпах).
const orchRid = (): string => {
  try {
    return crypto.randomUUID().slice(0, 8)
  } catch {
    return Math.random().toString(36).slice(2, 10)
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildKanbanExtra(data: any): string {
  const palette = ['#F59E0B', '#60A5FA', '#4ADE80', '#A78BFA', '#F87171', '#2DD4BF', '#F472B6']
  const cols = Array.isArray(data?.columns) ? data.columns : []
  const columns = cols
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any, i: number) => ({
      id: orchRid(),
      name: String(c?.name ?? c?.title ?? `Колонка ${i + 1}`),
      color: typeof c?.color === 'string' ? c.color : palette[i % palette.length],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cards: (Array.isArray(c?.cards) ? c.cards : [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((k: any) => ({ id: orchRid(), text: typeof k === 'string' ? k : String(k?.text ?? ''), done: typeof k === 'object' ? !!k?.done : false }))
        .filter((k: { text: string }) => k.text)
    }))
    .filter((c: { name: string; cards: unknown[] }) => c.name || c.cards.length)
  return JSON.stringify({ kanban: { columns } })
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildListExtra(data: any): string {
  const groups = (Array.isArray(data?.groups) ? data.groups : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((g: any) => ({ name: String(g?.name ?? ''), items: (Array.isArray(g?.items) ? g.items : []).map(String).filter(Boolean) }))
    .filter((g: { name: string; items: unknown[] }) => g.name || g.items.length)
  return JSON.stringify({ list: { title: String(data?.title ?? ''), groups } })
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildSheetExtra(data: any): string {
  const headers = Array.isArray(data?.headers) ? data.headers.map(String) : []
  const rows = Array.isArray(data?.rows) ? data.rows : []
  const cells: Record<string, string> = {}
  let cols = headers.length
  headers.forEach((h: string, c: number) => {
    cells[`0:${c}`] = h
  })
  const off = headers.length ? 1 : 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows.forEach((r: any, ri: number) => {
    const arr = Array.isArray(r) ? r : [r]
    cols = Math.max(cols, arr.length)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arr.forEach((v: any, c: number) => {
      cells[`${off + ri}:${c}`] = String(v ?? '')
    })
  })
  return JSON.stringify({ sheet: { rows: Math.max(off + rows.length, 1), cols: Math.max(cols, 1), cells } })
}
// Размеры оркестраторной ноды по типу спеки.
function orchDims(kind: string): { w: number; h: number } {
  switch (kind) {
    case 'kanban':
      return { w: 1000, h: 460 }
    case 'sheet':
      return { w: 620, h: 380 }
    case 'list':
      return { w: 940, h: 520 }
    case 'diagram':
      return { w: 520, h: 420 }
    case 'notebook':
      return { w: 900, h: 760 }
    case 'deck':
      return { w: 640, h: 420 }
    case 'ai':
      return { w: 440, h: 480 }
    case 'search':
      return { w: 440, h: 380 }
    case 'anythingllm':
      return { w: 680, h: 560 }
    case 'doc':
      return { w: 400, h: 340 }
    case 'paper':
      return { w: 380, h: 190 }
    default:
      return { w: 380, h: 260 }
  }
}
// Собрать историю ноутбука (props.history) из ячеек, выданных моделью.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNotebookHistory(data: any): string {
  const raw = Array.isArray(data?.cells) ? data.cells : []
  const cells = raw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any, i: number) => ({
      id: `cell_${orchRid()}_${i}`,
      type: c?.type === 'markdown' ? 'markdown' : 'code',
      source: String(c?.source ?? ''),
      outputs: [],
      count: null,
      rendered: c?.type === 'markdown'
    }))
    .filter((c: { source: string }) => c.source.trim())
  return JSON.stringify({ cells: cells.length ? cells : [{ id: `cell_${orchRid()}`, type: 'code', source: '', outputs: [], count: null }] })
}
// Собрать props шейпа из спеки оркестратора: интерактивные ноды (kanban/sheet/list) —
// с настоящим props.extra; статьи/гипотезы/заметки — как note; документ — doc.
function orchShapeProps(n: OrchNodeSpec): Record<string, unknown> {
  const dims = orchDims(n.kind)
  if (n.kind === 'kanban') {
    return { kind: 'kanban', title: (n.title || 'Канбан').slice(0, 100), extra: buildKanbanExtra(n.data), ...dims }
  }
  if (n.kind === 'sheet') {
    return { kind: 'sheet', title: (n.title || 'Таблица').slice(0, 100), extra: buildSheetExtra(n.data), ...dims }
  }
  if (n.kind === 'list') {
    // Интерактивная карточка списка — kind 'listcard'.
    return { kind: 'listcard', title: (n.title || 'Список').slice(0, 100), extra: buildListExtra(n.data), ...dims }
  }
  if (n.kind === 'diagram') {
    // body = исходный код Mermaid (DiagramBody рисует его предпросмотром).
    return { kind: 'diagram', title: (n.title || 'Схема').slice(0, 100), body: n.body || '', ...dims }
  }
  if (n.kind === 'notebook') {
    return { kind: 'notebook', title: (n.title || 'Ноутбук').slice(0, 100), history: buildNotebookHistory(n.data), ...dims }
  }
  if (n.kind === 'deck') {
    // body = тема презентации (DeckBody генерирует слайды по ней).
    return { kind: 'deck', title: (n.title || 'Презентация').slice(0, 100), body: n.body || '', ...dims }
  }
  if (n.kind === 'ai') {
    // body = стартовый промпт ИИ-ассистента.
    return { kind: 'ai', title: (n.title || 'ИИ-ассистент').slice(0, 100), body: n.body || '', ...dims }
  }
  if (n.kind === 'search') {
    // body = поисковый запрос (SearchBody ищет по нему).
    return { kind: 'search', title: (n.title || 'Поиск').slice(0, 100), body: n.body || '', ...dims }
  }
  if (n.kind === 'anythingllm') {
    return { kind: 'anythingllm', title: (n.title || 'База знаний').slice(0, 100), ...dims }
  }
  if (n.kind === 'doc') {
    return { kind: 'doc', title: (n.title || 'Документ').slice(0, 100), body: n.body || '', ...dims }
  }
  // paper / hypothesis / note → note (со значком и кликабельной ссылкой)
  const icon = n.kind === 'paper' ? '📄 ' : n.kind === 'hypothesis' ? '💡 ' : ''
  let body = n.body || ''
  if (n.url) body += `${body ? '\n\n' : ''}[${n.url}](${n.url})`
  return { kind: 'note', title: (icon + (n.title || '')).slice(0, 100), body, ...dims }
}
function createOrchNodes(editor: Editor, nodes: OrchNodeSpec[]): void {
  if (!nodes?.length) return
  const GAP_X = 60
  const GAP_Y = 28
  // Кладём СПРАВА от всех уже существующих нод (иначе разные пачки — статьи ресерча и
  // веб-сборка — накладываются друг на друга). Если холст пуст — от угла вьюпорта.
  let startX: number
  let startY: number
  const existing = editor.getCurrentPageShapes().filter((s) => s.type === 'flow-node')
  if (existing.length) {
    let maxX = -Infinity
    let minY = Infinity
    for (const s of existing) {
      const b = editor.getShapePageBounds(s.id)
      if (b) {
        maxX = Math.max(maxX, b.maxX)
        minY = Math.min(minY, b.y)
      }
    }
    startX = (isFinite(maxX) ? maxX : editor.getViewportPageBounds().x) + 140
    startY = isFinite(minY) ? minY : editor.getViewportPageBounds().y + 60
  } else {
    const vb = editor.getViewportPageBounds()
    startX = vb.x + 60
    startY = vb.y + 60
  }
  const byFacet = new Map<string, OrchNodeSpec[]>()
  for (const n of nodes) {
    const f = n.facet || 'Прочее'
    if (!byFacet.has(f)) byFacet.set(f, [])
    byFacet.get(f)!.push(n)
  }
  const created: ReturnType<typeof createShapeId>[] = []
  let x = startX
  for (const [facet, items] of byFacet) {
    // Ширина столбца = максимум ширины его нод (чтобы широкие канбаны/таблицы не наезжали).
    const colW = Math.max(380, ...items.map((n) => orchDims(n.kind).w))
    let y = startY
    // Заголовок грани
    const hid = createShapeId()
    editor.createShape<FlowNodeShape>({
      id: hid,
      type: 'flow-node',
      x,
      y,
      props: { kind: 'note', title: `🗂 ${facet}`, body: '', w: colW, h: 60 }
    })
    created.push(hid)
    y += 60 + GAP_Y
    for (const n of items) {
      const id = createShapeId()
      const props = orchShapeProps(n)
      editor.createShape<FlowNodeShape>({ id, type: 'flow-node', x, y, props: props as never })
      created.push(id)
      y += (props.h as number) + GAP_Y
    }
    x += colW + GAP_X
  }
  try {
    if (created.length) editor.select(...created)
    editor.zoomToFit({ animation: { duration: 300 } })
  } catch {
    /* ignore */
  }
}

const SANS = "'IBM Plex Sans', -apple-system, 'Segoe UI', system-ui, sans-serif"
const MONO = "'JetBrains Mono', monospace"

// Сворачиваемая панель стилей tldraw: по умолчанию скрыта, разворачивается кнопкой 🎨.
function CollapsibleStylePanel() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, pointerEvents: 'all' }}>
      <button
        className="os-btn"
        title={open ? 'Скрыть стили' : 'Стили фигуры'}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          color: open ? 'var(--accent)' : 'var(--muted)',
          cursor: 'pointer',
          fontSize: 16,
          display: 'grid',
          placeItems: 'center'
        }}
      >
        🎨
      </button>
      {open && <DefaultStylePanel />}
    </div>
  )
}

// --- Доски (каждая — свой ключ персиста tldraw) ---
// shared/roomId — режим real-time совместной работы через sync-сервер (Cloudflare).
type Board = { id: string; name: string; key: string; shared?: boolean; roomId?: string }
const BOARDS_LS = 'flow-boards'
const CURRENT_LS = 'flow-current-board'
const SYNC_SERVER_LS = 'flow-sync-server' // базовый URL sync-сервера (wss://…)

// Инлайновое хранилище ассетов для sync: картинки/файлы кодируются в data-URL прямо
// в документе. Для нашего сценария (личный круг) этого достаточно; тяжёлые медиа
// стоит хранить в R2/S3 отдельным asset store.
const flowAssetStore: TLAssetStore = {
  async upload(_asset, file) {
    const src = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(r.error)
      r.readAsDataURL(file)
    })
    return { src }
  },
  resolve(asset) {
    return asset.props.src
  }
}
function loadBoards(): Board[] {
  try {
    const b = JSON.parse(localStorage.getItem(BOARDS_LS) || 'null')
    if (Array.isArray(b) && b.length) return b
  } catch {
    /* ignore */
  }
  // По умолчанию — одна доска на легаси-ключе (сохраняем прежние данные)
  return [{ id: 'main', name: 'Моя доска', key: 'flow-canvas-v4' }]
}
const boardMenuBtn = (color: string): React.CSSProperties => ({
  border: '1px solid var(--border)',
  borderRadius: 7,
  padding: '7px',
  fontSize: 12,
  fontWeight: 600,
  background: 'var(--panel2)',
  color,
  cursor: 'pointer',
  textAlign: 'center'
})

// Чипы нод в сайдбаре (перетаскиваются на холст или клик — создать по центру)
const SIDEBAR_CHIPS = [
  { kind: 'note', title: 'Заметка', label: 'Md', color: 'var(--c-note)' },
  { kind: 'ai', title: 'ИИ-ассистент', label: 'ИИ', color: 'var(--c-chat)' },
  { kind: 'list', title: 'Список', label: 'Сп', color: 'var(--c-code)' },
  { kind: 'kanban', title: 'Канбан-доска', label: 'Кб', color: 'var(--c-chat)' },
  { kind: 'board', title: 'Бэклог (мультиканбан)', label: 'Бэ', color: 'var(--c-chat)' },
  { kind: 'sheet', title: 'Таблица', label: 'Тб', color: 'var(--c-note)' },
  { kind: 'code', title: 'Код', label: '{}', color: 'var(--c-code)' },
  { kind: 'search', title: 'Поиск', label: 'Пс', color: 'var(--c-chat)' },
  { kind: 'image', title: 'Изображение', label: 'Из', color: 'var(--c-img)' },
  { kind: 'deck', title: 'Презентация', label: 'Пр', color: 'var(--c-media)' },
  { kind: 'diagram', title: 'Схема', label: 'Сх', color: 'var(--c-chat)' },
  { kind: 'ref', title: 'Референс', label: 'Рф', color: 'var(--c-chat)' },
  { kind: 'doc', title: 'Документ', label: 'Дк', color: 'var(--c-note)' },
  { kind: 'opencode', title: 'OpenCode', label: 'OC', color: 'var(--c-code)' },
  { kind: 'anythingllm', title: 'AnythingLLM', label: 'AL', color: 'var(--c-chat)' },
  { kind: 'openscience', title: 'OpenScience', label: 'OS', color: 'var(--c-chat)' },
  { kind: 'notebook', title: 'Jupyter-ноутбук', label: 'Jp', color: 'var(--c-code)' },
  { kind: 'webgpt', title: 'ChatGPT (веб-логин)', label: 'GP', color: 'var(--c-chat)' },
  { kind: 'webgemini', title: 'Gemini (веб-логин)', label: 'Gm', color: 'var(--c-chat)' },
  { kind: 'webglm', title: 'GLM (веб-логин)', label: 'GL', color: 'var(--c-chat)' },
  { kind: 'orchestrator', title: 'Оркестратор', label: '🕸', color: 'var(--c-img)' }
]

// Категории нод: клик по иконке категории → всплывающая плашка с типами нод.
const NODE_GROUPS: Array<{ id: string; title: string; subtitle: string; icon: string; kinds: string[] }> = [
  { id: 'assist', title: 'Ассистент', subtitle: 'Заметки, ИИ-чат и поиск', icon: 'ai', kinds: ['note', 'ai', 'search'] },
  { id: 'docs', title: 'Документы и текст', subtitle: 'Документы, таблицы, списки, канбан, бэклог, схемы и презентации', icon: 'doc', kinds: ['list', 'kanban', 'board', 'doc', 'sheet', 'diagram', 'deck'] },
  { id: 'code', title: 'Код и данные', subtitle: 'Python-код и Jupyter-ноутбук', icon: 'code', kinds: ['code', 'notebook'] },
  { id: 'media', title: 'Медиа', subtitle: 'Генерация картинок и референсы', icon: 'image', kinds: ['image', 'ref'] },
  { id: 'agents', title: 'ИИ-агенты', subtitle: 'OpenCode, OpenScience, AnythingLLM', icon: 'opencode', kinds: ['opencode', 'openscience', 'anythingllm'] },
  { id: 'webchats', title: 'Веб-чаты (логин)', subtitle: 'ChatGPT, Gemini, GLM — вход своим аккаунтом в webview', icon: 'ai', kinds: ['webgpt', 'webgemini', 'webglm'] }
]
// Ноды-одиночки (без группы) — прямой чип в сайдбаре.
const STANDALONE_NODES = ['orchestrator']
const chipOf = (kind: string) => SIDEBAR_CHIPS.find((c) => c.kind === kind)
const chipTitle = (kind: string): string => chipOf(kind)?.title ?? kind
const chipColor = (kind: string): string | undefined => chipOf(kind)?.color

type Provider = {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: string
  enabled: boolean
}

type McpEntry = {
  id: string
  name: string
  command: string
  args: string[]
  env: Record<string, string>
  enabled: boolean
  status: string
  toolCount: number
  error?: string
}

const MCP_STATUS: Record<string, { label: string; color: string }> = {
  ready: { label: 'готов', color: '#4ADE80' },
  connecting: { label: 'подключение…', color: '#FBBF24' },
  error: { label: 'ошибка', color: '#F87171' },
  off: { label: 'выкл', color: '#8B93A3' }
}

// Глобальные стили нод (классы flow-*, рендер Markdown)
const GLOBAL_CSS = `
  .os-flyout { animation: flyin .14s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes flyin { from { opacity: 0; transform: translateX(-6px) scale(.98) } to { opacity: 1; transform: none } }
  .os-flyout-item:hover { background: color-mix(in srgb, var(--text) 8%, transparent); }
  .os-flyout-item:active { transform: scale(.98); }
  .flow-run-btn:hover:not(:disabled) { filter: brightness(1.09); }
  .flow-run-btn:active:not(:disabled) { transform: translateY(1px); }
  .flow-mini-btn:hover { background: rgba(255,255,255,0.16) !important; color: var(--text) !important; }
  .flow-plus-btn:hover { filter: brightness(1.12); transform: translateY(-50%) scale(1.08) !important; }
  .flow-plus-btn { transition: filter .15s, transform .1s; }
  .flow-input { font-family: inherit; }
  .flow-input:focus { border-color: var(--accent) !important; }
  .flow-input::placeholder { color: var(--muted); }
  .flow-scroll::-webkit-scrollbar { width: 8px; }
  .flow-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 4px; }
  .flow-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

  .flow-md { font-size: 14px; line-height: 1.6; color: var(--text); word-break: break-word; }
  .flow-md > *:first-child { margin-top: 0; }
  .flow-md > *:last-child { margin-bottom: 0; }
  .flow-md h1, .flow-md h2, .flow-md h3, .flow-md h4 { margin: 0.85em 0 0.4em; line-height: 1.3; font-weight: 600; letter-spacing: -0.01em; }
  .flow-md h1 { font-size: 1.4em; }
  .flow-md h2 { font-size: 1.25em; }
  .flow-md h3 { font-size: 1.1em; }
  .flow-md p { margin: 0.5em 0; }
  .flow-md ul, .flow-md ol { margin: 0.5em 0; padding-left: 1.4em; }
  .flow-md li { margin: 0.2em 0; }
  .flow-md a { color: var(--accent); text-decoration: none; }
  .flow-md a:hover { text-decoration: underline; }
  .flow-md strong { font-weight: 700; color: var(--text); }
  .flow-md code { background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px;
    font-family: ${MONO}; font-size: 0.88em; }
  .flow-md pre { border-radius: 9px; padding: 11px 13px; overflow: auto; margin: 0.6em 0;
    border: 1px solid rgba(255,255,255,0.08); }
  .flow-md pre code { background: none !important; padding: 0; font-size: 12.5px; line-height: 1.55; }
  .flow-md blockquote { border-left: 3px solid rgba(255,255,255,0.25); margin: 0.6em 0;
    padding: 0.1em 0.9em; color: var(--muted); }
  .flow-md table { border-collapse: collapse; margin: 0.6em 0; font-size: 0.92em; display: block; overflow-x: auto; }
  .flow-md th, .flow-md td { border: 1px solid rgba(255,255,255,0.15); padding: 5px 9px; }
  .flow-md th { background: rgba(255,255,255,0.06); font-weight: 600; }
  .flow-md hr { border: none; border-top: 1px solid rgba(255,255,255,0.12); margin: 0.9em 0; }
  .flow-md img { max-width: 100%; border-radius: 6px; }
  .flow-md .katex { font-size: 1.05em; }
  .flow-md .katex-display { overflow-x: auto; overflow-y: hidden; padding: 4px 0; }
  .flow-set-input {
    width: 100%; box-sizing: border-box;
    background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); font-size: 12.5px;
    padding: 7px 9px; outline: none; font-family: inherit;
  }
  .flow-set-input:focus { border-color: var(--accent); }
`

// ─────────────────────────────────────────────────────────────
// Фон холста — радиальная сетка из точек, синхронная с камерой tldraw
// ─────────────────────────────────────────────────────────────
function DotGridBackground() {
  const editor = useEditor()
  const cam = useValue('camera', () => editor.getCamera(), [editor])
  const size = 24 * cam.z
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'var(--bg)',
        backgroundImage: 'radial-gradient(var(--grid) 1px, transparent 1px)',
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${cam.x * cam.z}px ${cam.y * cam.z}px`
      }}
    />
  )
}

const KIND_COLORS: Record<string, string> = {
  note: 'var(--c-note)',
  doc: 'var(--c-note)',
  ai: 'var(--c-chat)',
  search: 'var(--c-chat)',
  ref: 'var(--c-chat)',
  code: 'var(--c-code)',
  codeblock: 'var(--c-code)',
  image: 'var(--c-img)',
  answer: 'var(--c-img)',
  deck: 'var(--c-media)',
  diagram: 'var(--c-chat)',
  slide: 'var(--muted)',
  orchestrator: 'var(--c-img)',
  orchtask: 'var(--c-img)',
  orchcall: 'var(--c-chat)'
}

// ─────────────────────────────────────────────────────────────
// Мини-карта — читает реальные ноды с холста
// ─────────────────────────────────────────────────────────────
function OSMinimap({ editor }: { editor: Editor | null }) {
  const data = useValue(
    'minimap',
    () => {
      if (!editor) return null
      const shapes = editor.getCurrentPageShapes()
      const vp = editor.getViewportPageBounds()
      const rects = shapes
        .map((s) => {
          const b = editor.getShapePageBounds(s.id)
          if (!b) return null
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kind = (s as any).props?.kind as string | undefined
          return { x: b.x, y: b.y, w: b.w, h: b.h, color: (kind && KIND_COLORS[kind]) || 'var(--muted)' }
        })
        .filter((r): r is { x: number; y: number; w: number; h: number; color: string } => !!r)
      let minX = vp.minX
      let minY = vp.minY
      let maxX = vp.maxX
      let maxY = vp.maxY
      rects.forEach((r) => {
        minX = Math.min(minX, r.x)
        minY = Math.min(minY, r.y)
        maxX = Math.max(maxX, r.x + r.w)
        maxY = Math.max(maxY, r.y + r.h)
      })
      const worldW = maxX - minX || 1
      const worldH = maxY - minY || 1
      const MMW = 180
      const MMH = 112
      const pad = 8
      const scale = Math.min((MMW - pad * 2) / worldW, (MMH - pad * 2) / worldH)
      const offX = (MMW - worldW * scale) / 2
      const offY = (MMH - worldH * scale) / 2
      const map = (x: number, y: number, w: number, h: number) => ({
        l: offX + (x - minX) * scale,
        t: offY + (y - minY) * scale,
        w: Math.max(3, w * scale),
        h: Math.max(2, h * scale)
      })
      return {
        rects: rects.map((r) => ({ ...map(r.x, r.y, r.w, r.h), color: r.color })),
        vp: map(vp.x, vp.y, vp.w, vp.h)
      }
    },
    [editor]
  )
  if (!data) return null
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        right: 14,
        bottom: 14,
        width: 180,
        height: 112,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        overflow: 'hidden',
        zIndex: 10
      }}
    >
      {data.rects.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: r.l,
            top: r.t,
            width: r.w,
            height: r.h,
            borderRadius: 1.5,
            background: r.color,
            opacity: 0.85
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          left: data.vp.l,
          top: data.vp.t,
          width: data.vp.w,
          height: data.vp.h,
          border: '1px solid var(--accent)',
          borderRadius: 2,
          background: 'var(--accent-dim)'
        }}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Статус-бар
// ─────────────────────────────────────────────────────────────
function StatusBar({
  editor,
  theme,
  setTheme
}: {
  editor: Editor | null
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}) {
  const zoom = useValue('zoom', () => (editor ? editor.getZoomLevel() : 1), [editor])
  const sep = <span style={{ width: 1, height: 12, background: 'var(--border)' }} />
  const zbtn: CSSProperties = {
    minWidth: 18,
    height: 18,
    borderRadius: 5,
    padding: '0 5px',
    font: `600 12px ${MONO}`,
    lineHeight: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  // Реальные данные: модель по умолчанию, GPU-память, статус сервисов/провайдеров.
  const [model, setModel] = useState('')
  const [provName, setProvName] = useState('')
  const [isLocal, setIsLocal] = useState(true)
  const [cloudCount, setCloudCount] = useState(0)
  const [gpu, setGpu] = useState<{ name: string; usedMB: number; totalMB: number } | null>(null)
  const [svc, setSvc] = useState<{ comfy: boolean; lm: boolean } | null>(null)

  useEffect(() => {
    let alive = true
    const isLoc = (url: string) => /127\.0\.0\.1|localhost/.test(url || '')
    const loadModel = async () => {
      try {
        const [s, provs] = await Promise.all([window.flow.getSettings(), window.flow.getProviders()])
        if (!alive) return
        const chosen = s.defaultModel || ''
        const [pid, ...rest] = chosen.includes('::') ? chosen.split('::') : ['lmstudio', chosen]
        const prov = provs.find((p) => p.id === pid)
        setModel(rest.join('::') || chosen)
        setProvName(prov?.name || pid)
        setIsLocal(!!prov && isLoc(prov.baseURL))
        setCloudCount(provs.filter((p) => p.enabled && !isLoc(p.baseURL)).length)
      } catch {
        /* ignore */
      }
    }
    const poll = async () => {
      try {
        const st = await window.flow.servicesStatus()
        if (alive) setSvc(st)
      } catch {
        /* ignore */
      }
    }
    // GPU опрашивается через nvidia-smi (запуск процесса). Делаем это редко, а если
    // NVIDIA нет (первый вызов не удался) — прекращаем совсем, чтобы не спавнить
    // процесс каждые несколько секунд (это давало периодические подлагивания).
    let gpuDead = false
    const pollGpu = async () => {
      if (gpuDead) return
      try {
        const g = await window.flow.sysGpu()
        if (!alive) return
        if (g.ok) setGpu(g)
        else {
          setGpu(null)
          gpuDead = true
        }
      } catch {
        if (alive) {
          setGpu(null)
          gpuDead = true
        }
      }
    }
    loadModel()
    poll()
    pollGpu()
    const t1 = setInterval(poll, 8000)
    const t2 = setInterval(loadModel, 15000)
    const t3 = setInterval(pollGpu, 20000)
    return () => {
      alive = false
      clearInterval(t1)
      clearInterval(t2)
      clearInterval(t3)
    }
  }, [])

  const vramFrac = gpu ? gpu.usedMB / gpu.totalMB : 0
  const dot = (on: boolean) => (
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: on ? 'var(--c-note)' : 'var(--muted)' }} />
  )
  return (
    <div
      style={{
        height: 28,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 12px',
        background: 'var(--panel)',
        borderTop: '1px solid var(--border)',
        font: `400 10.5px ${MONO}`,
        color: 'var(--muted)',
        zIndex: 20
      }}
    >
      {/* Модель по умолчанию (реальная) */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Модель по умолчанию (⚙ Настройки)">
        {dot(!!model)}
        {model ? `${model} · ${isLocal ? 'локально' : provName}` : 'модель не выбрана'}
      </span>
      {sep}
      {/* Видеопамять GPU (реальная, nvidia-smi) */}
      {gpu ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={gpu.name}>
          VRAM {(gpu.usedMB / 1024).toFixed(1)}/{(gpu.totalMB / 1024).toFixed(0)} ГБ
          <span
            style={{
              width: 56,
              height: 4,
              background: 'var(--bg)',
              borderRadius: 2,
              overflow: 'hidden',
              display: 'inline-block'
            }}
          >
            <span
              style={{
                display: 'block',
                width: `${Math.min(100, vramFrac * 100)}%`,
                height: '100%',
                background: vramFrac > 0.9 ? '#F87171' : 'var(--accent)'
              }}
            />
          </span>
        </span>
      ) : (
        <span style={{ color: 'var(--muted)' }} title="nvidia-smi недоступен">
          GPU: н/д
        </span>
      )}
      {sep}
      {/* Подключённые платформы (реальные) */}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="LM Studio (127.0.0.1:1234)">
        {dot(!!svc?.lm)}
        LM Studio · {svc?.lm ? 'работает' : 'ожидание'}
      </span>
      {sep}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="ComfyUI (127.0.0.1:8188)">
        {dot(!!svc?.comfy)}
        ComfyUI · {svc?.comfy ? 'работает' : 'ожидание'}
      </span>
      {cloudCount > 0 && (
        <>
          {sep}
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Включённые облачные провайдеры">
            {dot(true)}☁ {cloudCount}
          </span>
        </>
      )}
      <div style={{ flex: 1 }} />
      <span
        style={{ display: 'flex', alignItems: 'center', gap: 3 }}
        title="Зум. Тачпад: щипок двумя пальцами или Ctrl+прокрутка. Прокрутка/два пальца — панорама."
      >
        <button className="os-btn" title="Отдалить" onClick={() => editor?.zoomOut()} style={zbtn}>
          −
        </button>
        <button
          className="os-btn"
          title="Сбросить зум (100%)"
          onClick={() => editor?.resetZoom()}
          style={{ ...zbtn, minWidth: 42, fontVariantNumeric: 'tabular-nums' }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button className="os-btn" title="Приблизить" onClick={() => editor?.zoomIn()} style={zbtn}>
          +
        </button>
        <button className="os-btn" title="Вписать всё на экран" onClick={() => editor?.zoomToFit()} style={zbtn}>
          ⤢
        </button>
      </span>
      {sep}
      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        тема
        {THEME_ORDER.map((t) => (
          <button
            key={t}
            className="os-btn"
            title={t}
            onClick={() => setTheme(t)}
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: THEME_SWATCH[t],
              border: `1px solid ${theme === t ? 'var(--accent)' : 'var(--border)'}`,
              padding: 0
            }}
          />
        ))}
      </span>
    </div>
  )
}

// --- Панель настроек: провайдеры моделей (функциональная, из прошлой версии) ---
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [models, setModels] = useState<{ value: string; label: string; group: string }[]>([])
  const [defaultModel, setDefaultModel] = useState('')
  const [mcp, setMcp] = useState<McpEntry[]>([])
  const [saved, setSaved] = useState(false)
  // Автозапуск сервисов
  const [autoStart, setAutoStart] = useState(false)
  const [comfyCmd, setComfyCmd] = useState('')
  const [comfyCwd, setComfyCwd] = useState('')
  const [lmsCmd, setLmsCmd] = useState('')
  // Научные источники
  const [elsevierKey, setElsevierKey] = useState('')
  const [elsevierInsttoken, setElsevierInsttoken] = useState('')
  const [unpaywallEmail, setUnpaywallEmail] = useState('')
  const [anythingllmKey, setAnythingllmKey] = useState('')
  const [elsTest, setElsTest] = useState<string>('')
  const [elsTesting, setElsTesting] = useState(false)
  // T2.1: PDF-RAG
  const [ragHybrid, setRagHybrid] = useState(true)
  const [ragTopN, setRagTopN] = useState(8)
  const [ragReranker, setRagReranker] = useState(false)
  // T2.4: память доски через retrieval
  const [memoryRetrieval, setMemoryRetrieval] = useState(true)
  const [memoryContextBudget, setMemoryContextBudget] = useState(4000)
  const testElsevier = async () => {
    setElsTesting(true)
    setElsTest('')
    try {
      // сохраняем текущие ключи перед проверкой, чтобы тест использовал их
      await window.flow.saveSettings({ elsevierKey, elsevierInsttoken, unpaywallEmail })
      const r = await window.flow.papersTestElsevier()
      if (!r.ok) {
        setElsTest('Ошибка: ' + r.error)
        return
      }
      const mark = (s: string) => (s === 'ok' ? '✅' : s === 'fail' ? '❌' : '➖')
      setElsTest(
        `${mark(r.key)} Ключ (поиск): ${r.keyMsg}\n` +
          `${mark(r.token)} Токен: ${r.tokenMsg}\n` +
          `${mark(r.fulltext)} Полный текст: ${r.ftMsg}`
      )
    } catch (e) {
      setElsTest('Ошибка: ' + String(e))
    } finally {
      setElsTesting(false)
    }
  }
  const [svc, setSvc] = useState<{ comfy: boolean; lm: boolean } | null>(null)
  const [startup, setStartup] = useState(false)

  const refreshSvc = () => window.flow?.servicesStatus().then(setSvc).catch(() => setSvc(null))
  const toggleStartup = (v: boolean) => {
    setStartup(v)
    window.flow?.setStartup({ enabled: v }).catch(() => {})
  }

  useEffect(() => {
    window.flow?.getProviders().then(setProviders).catch(() => setProviders([]))
    window.flow?.listModels().then(setModels).catch(() => setModels([]))
    window.flow
      ?.getSettings()
      .then((s) => {
        setDefaultModel(s.defaultModel)
        setAutoStart(!!s.autoStart)
        setComfyCmd(s.comfyCmd || '')
        setComfyCwd(s.comfyCwd || '')
        setLmsCmd(s.lmsCmd || '')
        setElsevierKey(s.elsevierKey || '')
        setElsevierInsttoken(s.elsevierInsttoken || '')
        setUnpaywallEmail(s.unpaywallEmail || '')
        setAnythingllmKey(s.anythingllmKey || '')
        setRagHybrid(s.ragHybrid !== false)
        setRagTopN(s.ragTopN || 8)
        setRagReranker(!!s.ragReranker)
        setMemoryRetrieval(s.memoryRetrieval !== false)
        setMemoryContextBudget(s.memoryContextBudget || 4000)
      })
      .catch(() => {})
    window.flow?.mcpList().then(setMcp).catch(() => setMcp([]))
    window.flow?.getStartup().then(setStartup).catch(() => {})
    refreshSvc()
    const t = setInterval(refreshSvc, 5000)
    return () => clearInterval(t)
  }, [])

  const patch = (id: string, p: Partial<Provider>) =>
    setProviders((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)))

  const mcpPatch = (id: string, p: Partial<McpEntry>) =>
    setMcp((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)))
  const mcpEnv = (id: string, key: string, val: string) =>
    setMcp((list) => list.map((x) => (x.id === id ? { ...x, env: { ...x.env, [key]: val } } : x)))

  const save = async () => {
    await window.flow.saveProviders(providers)
    await window.flow.saveSettings({ defaultModel, autoStart, comfyCmd, comfyCwd, lmsCmd, elsevierKey, elsevierInsttoken, unpaywallEmail, anythingllmKey, ragHybrid, ragTopN, ragReranker, memoryRetrieval, memoryContextBudget })
    await window.flow.mcpSave(
      mcp.map(({ id, name, command, args, env, enabled }) => ({ id, name, command, args, env, enabled }))
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const groups = Array.from(new Set(models.map((m) => m.group)))

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(5,6,9,0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: SANS
      }}
      onClick={onClose}
    >
      <div
        className="os-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: '92vw',
          maxHeight: '86vh',
          overflow: 'auto',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          color: 'var(--text)',
          padding: 22
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', flex: 1 }}>
            ⚙ Провайдеры моделей
          </h2>
          <button
            className="os-btn"
            onClick={onClose}
            style={{
              width: 30,
              height: 30,
              border: '1px solid var(--border)',
              borderRadius: 7,
              background: 'var(--panel2)',
              color: 'var(--muted)',
              fontSize: 13
            }}
          >
            ✕
          </button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          Включи провайдера, впиши baseURL и API-ключ. Для API без списка моделей укажи модели вручную через запятую.
          Модели появятся в выпадающем списке нод, сгруппированные по провайдеру.
        </p>

        <div
          style={{
            border: '1px solid rgba(74,222,128,0.3)',
            background: 'rgba(74,222,128,0.07)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 14
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>⭐ Модель по умолчанию</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
            Используется в нодах, где модель не выбрана явно. Рекомендация по цене/качеству — DeepSeek.
          </div>
          <select
            className="flow-set-input"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.currentTarget.value)}
            style={{ cursor: 'pointer' }}
          >
            <option value="">— не задана (LM Studio) —</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {models
                  .filter((m) => m.group === g)
                  .map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Автозапуск локальных сервисов */}
        <div
          style={{
            border: '1px solid var(--border)',
            background: 'var(--panel2)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.currentTarget.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>🚀 Автозапуск при старте приложения</span>
          </label>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            При запуске Flow сам поднимет ComfyUI и LM Studio, если они ещё не запущены. Укажи команды запуска.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: svc?.comfy ? 'var(--c-note)' : 'var(--muted)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
              ComfyUI {svc ? (svc.comfy ? '· работает' : '· не запущен') : ''}
            </span>
            <button
              className="os-btn"
              onClick={() => window.flow?.startService({ name: 'comfy' }).then(() => setTimeout(refreshSvc, 1500))}
              style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
            >
              Запустить
            </button>
          </div>
          <input
            className="flow-set-input"
            placeholder="Команда ComfyUI (напр. D:\\ComfyUI\\run_nvidia_gpu.bat)"
            value={comfyCmd}
            onChange={(e) => setComfyCmd(e.currentTarget.value)}
          />
          <input
            className="flow-set-input"
            placeholder="Рабочая папка ComfyUI (необязательно)"
            value={comfyCwd}
            onChange={(e) => setComfyCwd(e.currentTarget.value)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: svc?.lm ? 'var(--c-note)' : 'var(--muted)' }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
              LM Studio {svc ? (svc.lm ? '· работает' : '· не запущен') : ''}
            </span>
            <button
              className="os-btn"
              onClick={() => window.flow?.startService({ name: 'lm' }).then(() => setTimeout(refreshSvc, 1500))}
              style={{ fontSize: 11, padding: '4px 9px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)' }}
            >
              Запустить
            </button>
          </div>
          <input
            className="flow-set-input"
            placeholder='Команда LM Studio (напр. lms server start)'
            value={lmsCmd}
            onChange={(e) => setLmsCmd(e.currentTarget.value)}
          />
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            Подсказка: LM Studio — установи CLI и укажи <code>lms server start</code>. ComfyUI — путь к своему .bat-файлу
            запуска. Команды сохрани кнопкой ниже.
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>📕 PDF-поиск (RAG)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="checkbox" checked={ragHybrid} onChange={(e) => setRagHybrid(e.currentTarget.checked)} />
            Гибридный поиск (BM25 + эмбеддинги + RRF)
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>— лучше находит точные термины, аббревиатуры, числа</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)' }}>
            Чанков в ответ (top-N):
            <input
              className="flow-set-input"
              type="number"
              min={1}
              max={40}
              value={ragTopN}
              onChange={(e) => setRagTopN(Math.max(1, Math.min(40, Number(e.currentTarget.value) || 8)))}
              style={{ width: 72 }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)', cursor: 'not-allowed' }}>
            <input type="checkbox" checked={ragReranker} disabled onChange={(e) => setRagReranker(e.currentTarget.checked)} />
            Реранкер (bge-reranker) — скоро, требует загрузки модели
          </label>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>🧠 Память доски</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="checkbox" checked={memoryRetrieval} onChange={(e) => setMemoryRetrieval(e.currentTarget.checked)} />
            Умная память (retrieval)
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>— подтягивать релевантное, а не всю память (экономит токены)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)' }}>
            Бюджет памяти (токенов):
            <input
              className="flow-set-input"
              type="number"
              min={500}
              max={32000}
              step={500}
              value={memoryContextBudget}
              onChange={(e) => setMemoryContextBudget(Math.max(500, Math.min(32000, Number(e.currentTarget.value) || 4000)))}
              style={{ width: 90 }}
            />
          </label>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ fontSize: 13, fontWeight: 600 }}>🔬 Научные источники (поиск статей)</div>
          <input
            className="flow-set-input"
            placeholder="Email для Unpaywall (легальный бесплатный PDF по DOI)"
            value={unpaywallEmail}
            onChange={(e) => setUnpaywallEmail(e.currentTarget.value)}
            onBlur={(e) => window.flow?.saveSettings({ unpaywallEmail: e.currentTarget.value.trim() })}
          />
          <input
            className="flow-set-input"
            placeholder="Elsevier API-ключ (dev.elsevier.com)"
            value={elsevierKey}
            onChange={(e) => setElsevierKey(e.currentTarget.value)}
            onBlur={(e) => window.flow?.saveSettings({ elsevierKey: e.currentTarget.value.trim() })}
          />
          <input
            className="flow-set-input"
            placeholder="Elsevier Institutional Token (для полного текста вне сети института)"
            value={elsevierInsttoken}
            onChange={(e) => setElsevierInsttoken(e.currentTarget.value)}
            onBlur={(e) => window.flow?.saveSettings({ elsevierInsttoken: e.currentTarget.value.trim() })}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={testElsevier}
              disabled={elsTesting}
              style={{
                border: '1px solid var(--accent)',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 12,
                cursor: elsTesting ? 'default' : 'pointer'
              }}
            >
              {elsTesting ? '⏳ Проверяю…' : '🔍 Проверить Elsevier'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>(сохранит ключи и протестирует доступ)</span>
          </div>
          {elsTest && (
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                background: 'var(--panel-2, rgba(255,255,255,0.04))',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 10px'
              }}
            >
              {elsTest}
            </div>
          )}
          <input
            className="flow-set-input"
            placeholder="AnythingLLM API-ключ (для заливки статей в базу знаний)"
            value={anythingllmKey}
            onChange={(e) => setAnythingllmKey(e.currentTarget.value)}
            onBlur={(e) => window.flow?.saveSettings({ anythingllmKey: e.currentTarget.value.trim() })}
          />
          <div style={{ fontSize: 10.5, color: '#4ADE80' }}>Ключи сохраняются автоматически при выходе из поля.</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            OpenAlex (arXiv/PubMed/журналы) работает без ключей. Для полного текста Elsevier нужен API-ключ
            и, вне сети института, <b>institutional token</b> (запроси в библиотеке института). Без токена — только абстракты.
            <b>AnythingLLM-ключ</b> — сгенерируй в самом AnythingLLM (Settings → Developer API), тогда ИИ/оркестратор
            смогут заливать статьи в его базу знаний. Ключи хранятся локально.
          </div>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={startup}
              onChange={(e) => toggleStartup(e.currentTarget.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>💻 Запускать Flow при входе в Windows</span>
          </label>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.45 }}>
            Применяется сразу. Flow будет открываться автоматически после входа в систему.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {providers.map((p) => (
            <div
              key={p.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 12,
                background: p.enabled ? 'var(--accent-dim)' : 'var(--panel2)'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => patch(p.id, { enabled: e.currentTarget.checked })}
                  style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                {p.id === 'lmstudio' && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(локально)</span>}
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                  className="flow-set-input"
                  placeholder="baseURL (напр. https://openrouter.ai/api/v1)"
                  value={p.baseURL}
                  onChange={(e) => patch(p.id, { baseURL: e.currentTarget.value })}
                />
                {p.id !== 'lmstudio' && (
                  <input
                    className="flow-set-input"
                    type="password"
                    placeholder="API-ключ"
                    value={p.apiKey}
                    onChange={(e) => patch(p.id, { apiKey: e.currentTarget.value })}
                  />
                )}
                <input
                  className="flow-set-input"
                  placeholder="Модели вручную через запятую (напр. glm-4.6, glm-4.5-air)"
                  value={p.models}
                  onChange={(e) => patch(p.id, { models: e.currentTarget.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 22 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700 }}>🔧 MCP-серверы (инструменты для ИИ)</h3>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Дают ИИ доступ к файлам, памяти, браузеру и др. Включи нужные → Сохранить (сервер скачается через npx при
            первом запуске). В ИИ-ноде включи тумблер «🔧 Инструменты MCP».
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mcp.map((s) => {
              const st = MCP_STATUS[s.status] ?? MCP_STATUS.off
              const envKeys = Object.keys(s.env || {})
              return (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: 12,
                    background: s.enabled ? 'rgba(94,92,230,0.08)' : 'var(--panel2)'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => mcpPatch(s.id, { enabled: e.currentTarget.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{s.name}</span>
                    {s.enabled && (
                      <span style={{ fontSize: 11, color: st.color }}>
                        ● {st.label}
                        {s.toolCount ? ` · ${s.toolCount} инстр.` : ''}
                      </span>
                    )}
                  </label>
                  {envKeys.length > 0 && s.enabled && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {envKeys.map((k) => (
                        <input
                          key={k}
                          className="flow-set-input"
                          type="password"
                          placeholder={k}
                          value={s.env[k]}
                          onChange={(e) => mcpEnv(s.id, k, e.currentTarget.value)}
                        />
                      ))}
                    </div>
                  )}
                  {s.error && s.enabled && (
                    <div style={{ fontSize: 11, color: '#F87171', marginTop: 6, wordBreak: 'break-word' }}>
                      {s.error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <button
            className="os-btn"
            onClick={save}
            style={{
              border: 'none',
              borderRadius: 9,
              padding: '10px 20px',
              fontSize: 13.5,
              fontWeight: 600,
              color: 'var(--bg)',
              cursor: 'pointer',
              background: 'var(--accent)'
            }}
          >
            Сохранить
          </button>
          {saved && <span style={{ fontSize: 12.5, color: 'var(--c-note)' }}>✓ Сохранено</span>}
        </div>
      </div>
    </div>
  )
}

// Размеры новой ноды по типу
function sizeFor(kind: string): { w: number; h: number } {
  const h =
    kind === 'ai'
      ? 480
      : kind === 'orchestrator'
      ? 620
      : kind === 'notebook'
      ? 760
      : kind === 'pdf'
      ? 620
      : kind === 'kanban'
      ? 460
      : kind === 'board'
      ? 720
      : kind === 'listcard'
      ? 520
      : kind === 'sheet'
      ? 380
      : kind === 'openscience'
      ? 460
      : kind === 'anythingllm'
      ? 460
      : kind === 'webgpt' || kind === 'webgemini' || kind === 'webglm'
      ? 620
      : kind === 'diagram'
      ? 380
      : kind === 'ai' || kind === 'search' || kind === 'image' || kind === 'deck' || kind === 'opencode' || kind === 'list'
        ? 340
        : kind === 'code'
          ? 240
          : 180
  const w =
    kind === 'ai'
      ? 440
      : kind === 'orchestrator'
      ? 460
      : kind === 'notebook'
      ? 900
      : kind === 'kanban'
      ? 1000
      : kind === 'board'
      ? 1120
      : kind === 'listcard'
      ? 940
      : kind === 'sheet'
      ? 620
      : kind === 'openscience'
      ? 560
      : kind === 'webgpt' || kind === 'webgemini' || kind === 'webglm'
      ? 560
      : kind === 'pdf'
      ? 480
      : kind === 'ai' ||
    kind === 'code' ||
    kind === 'search' ||
    kind === 'image' ||
    kind === 'deck' ||
    kind === 'diagram' ||
    kind === 'opencode' ||
    kind === 'anythingllm' ||
    kind === 'list'
      ? 320
      : kind === 'ref'
        ? 240
        : 280
  return { w, h }
}

const TL_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const TL_WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

// ── Таймлайн доски: бесконечная временная СЕТКА (координатный слой), не ноды ──
// Ось Y = время: TL_DAY_H пикселей на день. День dayIndex 0 = TL_EPOCH (понедельник),
// вниз = будущее, вверх = прошлое. Каждый день — горизонтальная полоса во всю ширину;
// каждая неделя (7 дней) окрашена в свой пастельный тон. Всё бесконечно.
const TL_DAY_H = 1700 // высота полосы дня (px) — вмещает ~5 нод по вертикали
const TL_WEEK_W = 4600 // ширина колонки недельных окошек (page px, слева от дневной зоны)
const TL_MONTH_W = 5600 // ширина колонки месячных окошек (ещё левее)
// Начало отсчёта времени (dayIndex 0) = ДЕНЬ СОЗДАНИЯ доски. Ставится при загрузке/включении
// таймлайна через setTlEpoch(boardCreatedMs). До этого — безопасный дефолт.
let TL_EPOCH_MS = new Date(2024, 0, 1).getTime()
const tlStartOfDay = (ms: number): number => {
  const d = new Date(ms)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
const setTlEpoch = (ms: number): void => {
  TL_EPOCH_MS = tlStartOfDay(ms)
}
// Мягкие пастельные тона недель (полупрозрачные — читаемо на тёмной теме).
const TL_PASTELS = [
  'rgba(244,114,182,0.11)',
  'rgba(96,165,250,0.11)',
  'rgba(74,222,128,0.11)',
  'rgba(251,191,36,0.11)',
  'rgba(167,139,250,0.11)',
  'rgba(45,212,191,0.11)',
  'rgba(248,113,113,0.11)',
  'rgba(129,140,248,0.11)'
]
const tlPad = (n: number): string => String(n).padStart(2, '0')
const tlDate = (dayIndex: number): Date => {
  const d = new Date(TL_EPOCH_MS)
  d.setDate(d.getDate() + dayIndex)
  return d
}
const tlIso = (dayIndex: number): string => {
  const d = tlDate(dayIndex)
  return `${d.getFullYear()}-${tlPad(d.getMonth() + 1)}-${tlPad(d.getDate())}`
}
const tlTodayIndex = (): number => Math.round((tlStartOfDay(Date.now()) - TL_EPOCH_MS) / 86400000)
const mod = (a: number, n: number): number => ((a % n) + n) % n
// День создания доски (start-of-day). Храним в board_meta (БД, кэш в boardStore); для старых
// досок пробуем вывести из id вида 'b<base36-timestamp>', иначе — сегодня.
function boardCreatedMs(boardId: string): number {
  const stored = bmetaGet(boardId, 'board.createdMs')
  if (stored) return Number(stored)
  let ms = Date.now()
  if (boardId && boardId[0] === 'b') {
    const t = parseInt(boardId.slice(1), 36)
    if (t > 1500000000000 && t < 4000000000000) ms = t
  }
  const sod = tlStartOfDay(ms)
  bmetaSet(boardId, 'board.createdMs', String(sod))
  return sod
}

// Фон таймлайна. Дневная зона — правая полуплоскость (page x≥0): пастельные полосы-дни
// (цвет по неделям) с полубесконечными вправо линиями. Слева от неё — колонки недельных
// и месячных окошек. Ещё левее — пусто (свободная зона, только точки). Всё бесконечно по Y.
function TimelineBackground(): JSX.Element {
  const editor = useEditor()
  const cam = useValue('tl-cam', () => editor.getCamera(), [editor])
  const vsb = useValue('tl-vsb', () => editor.getViewportScreenBounds(), [editor])
  const z = cam.z
  const W = vsb.w
  const H = vsb.h
  const sx = (px: number): number => (px + cam.x) * z // page-x → screen-x
  const sy = (py: number): number => (py + cam.y) * z // page-y → screen-y
  const dayLeft = sx(0)
  const weekLeft = sx(-TL_WEEK_W)
  const monthLeft = sx(-TL_WEEK_W - TL_MONTH_W)
  // Таймлайн начинается с ДНЯ СОЗДАНИЯ доски (dayIndex 0) — раньше него ничего не рисуем
  // (выше — пустая свободная зона, только точки).
  const first = Math.max(0, Math.floor(-cam.y / TL_DAY_H) - 1)
  const last = Math.ceil((H / z - cam.y) / TL_DAY_H) + 1
  const todayIdx = tlTodayIndex()
  const bandLeft = Math.max(dayLeft, 0)
  const els: JSX.Element[] = []
  if (last <= first) {
    return (
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--grid) 1px, transparent 1px)', backgroundSize: `${24 * z}px ${24 * z}px`, backgroundPosition: `${cam.x * z}px ${cam.y * z}px` }} />
      </div>
    )
  }

  // Полосы-дни + линии — только правее page x=0, полубесконечно вправо.
  for (let i = first; i < last; i++) {
    const top = sy(i * TL_DAY_H)
    const h = TL_DAY_H * z
    const pastel = TL_PASTELS[mod(Math.floor(i / 7), TL_PASTELS.length)]
    els.push(
      <div key={'b' + i} style={{ position: 'absolute', left: bandLeft, top, width: Math.max(0, W - bandLeft), height: h, background: pastel, borderTop: `1px solid ${mod(i, 7) === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)'}`, boxSizing: 'border-box' }} />
    )
    if (h > 18) {
      const d = tlDate(i)
      els.push(
        <div key={'dl' + i} style={{ position: 'absolute', left: Math.max(dayLeft + 10, 4), top: top + 8, font: `600 12px ${SANS}`, color: i === todayIdx ? 'var(--accent)' : 'var(--text)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          {TL_WD[d.getDay()]} {tlPad(d.getDate())}.{tlPad(d.getMonth() + 1)}
          {i === todayIdx && <span style={{ marginLeft: 8, fontWeight: 700 }}>● сегодня</span>}
        </div>
      )
    }
  }

  // Недельные окошки (7 дней от понедельника).
  for (let w = Math.floor(first / 7); w <= Math.floor((last - 1) / 7); w++) {
    const i0 = w * 7
    els.push(
      <div key={'w' + w} style={{ position: 'absolute', left: weekLeft, top: sy(i0 * TL_DAY_H), width: TL_WEEK_W * z, height: 7 * TL_DAY_H * z, boxSizing: 'border-box', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10 * z, background: 'rgba(148,163,184,0.06)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', font: `700 17px ${SANS}`, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '.04em' }}>
          Неделя {Math.floor(i0 / 7) + 1}
          <span style={{ color: 'var(--muted)', fontWeight: 500 }}>  ·  {tlPad(tlDate(i0).getDate())}.{tlPad(tlDate(i0).getMonth() + 1)}–{tlPad(tlDate(i0 + 6).getDate())}.{tlPad(tlDate(i0 + 6).getMonth() + 1)}</span>
        </div>
      </div>
    )
  }

  // Месячные окошки (календарный месяц) — ещё левее.
  const seenM = new Set<string>()
  for (let k = first; k < last; k++) {
    const d = tlDate(k)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (seenM.has(key)) continue
    seenM.add(key)
    const startIdxRaw = k - (d.getDate() - 1)
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const startIdx = Math.max(startIdxRaw, 0) // первый месяц — не раньше дня создания доски
    const endIdxExcl = startIdxRaw + daysInMonth
    els.push(
      <div key={'m' + key} style={{ position: 'absolute', left: monthLeft, top: sy(startIdx * TL_DAY_H), width: TL_MONTH_W * z, height: (endIdxExcl - startIdx) * TL_DAY_H * z, boxSizing: 'border-box', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12 * z, background: 'rgba(100,116,139,0.10)', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', font: `800 22px ${SANS}`, color: 'var(--text)', whiteSpace: 'nowrap', letterSpacing: '.05em', textTransform: 'uppercase' }}>{TL_MONTHS[d.getMonth()]} {d.getFullYear()}</div>
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'var(--bg)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--grid) 1px, transparent 1px)', backgroundSize: `${24 * z}px ${24 * z}px`, backgroundPosition: `${cam.x * z}px ${cam.y * z}px` }} />
      {els}
    </div>
  )
}

// Плавающая панель таймлайна: действует на день в центре вьюпорта. Ручная выжимка +
// удаление (сжатие) пустых дня/недели/месяца — сдвигает всё, что ниже, вверх на длину периода.
function TimelineDigestPanel({ editor, boardId, onToast }: { editor: Editor; boardId: string; onToast: (m: string) => void }): JSX.Element {
  const vpb = useValue('tl-vpb', () => editor.getViewportPageBounds(), [editor])
  const centerY = vpb.y + vpb.h / 2
  const dayIdx = Math.max(0, Math.floor(centerY / TL_DAY_H)) // не раньше дня создания доски
  const date = tlDate(dayIdx)
  const [busy, setBusy] = useState(false)

  const runDigest = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    onToast('Собираю выжимку дня…')
    try {
      const r = await digestDayRange(editor, boardId, dayIdx * TL_DAY_H, (dayIdx + 1) * TL_DAY_H, tlIso(dayIdx))
      if (r.ok) onToast('Выжимка дня добавлена в память доски ✓')
      else if (r.empty) onToast('В этом дне нет контента для выжимки')
      else onToast('Ошибка выжимки: ' + (r.error || ''))
    } finally {
      setBusy(false)
    }
  }

  // Пусто ли [startIdx, startIdx+span) по контенту (без служебных нод).
  const rangeEmpty = (startIdx: number, span: number): boolean => {
    const yTop = startIdx * TL_DAY_H
    const yBot = (startIdx + span) * TL_DAY_H
    return !editor.getCurrentPageShapes().some((s) => {
      if (s.type !== 'flow-node') return false
      const k = (s as FlowNodeShape).props.kind
      if (k === 'boardmem' || k === 'daylane' || k === 'tlaxis') return false
      const b = editor.getShapePageBounds(s.id)
      if (!b) return false
      const cy = b.y + b.h / 2
      return cy >= yTop && cy < yBot
    })
  }
  // Удалить пустой период: сдвинуть всё ниже него вверх на span дней (убрать пустое время).
  const collapse = (startIdx: number, span: number, label: string): void => {
    if (!rangeEmpty(startIdx, span)) {
      onToast(`${label} не пуст — сначала перенеси/удали его ноды`)
      return
    }
    const yBot = (startIdx + span) * TL_DAY_H
    const shift = span * TL_DAY_H
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = []
    for (const s of editor.getCurrentPageShapes()) {
      const b = editor.getShapePageBounds(s.id)
      if (!b) continue
      if (b.y + b.h / 2 >= yBot) updates.push({ id: s.id, type: s.type, y: (s as unknown as { y: number }).y - shift })
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (updates.length) editor.updateShapes(updates as any)
    onToast(`${label} удалён — ниже сдвинуто на ${span} дн.${updates.length ? '' : ' (ничего ниже не было)'}`)
  }

  const wkStart = Math.floor(dayIdx / 7) * 7
  const mStart = dayIdx - (date.getDate() - 1)
  const dim = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const isToday = dayIdx === tlTodayIndex()
  const divider = <span style={{ width: 1, height: 15, background: 'var(--border)', flexShrink: 0 }} />

  return (
    <div
      style={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        background: 'color-mix(in srgb, var(--panel) 85%, transparent)',
        border: '1px solid var(--border)',
        borderRadius: 9,
        padding: '5px 11px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
        backdropFilter: 'blur(7px)',
        fontFamily: SANS
      }}
    >
      <style>{`
        .tl-btn{background:none;border:none;padding:0;margin:0;cursor:pointer;font:500 11.5px ${SANS};color:var(--muted);transition:color .12s;white-space:nowrap}
        .tl-btn:disabled{cursor:default;opacity:.55}
        .tl-act{color:var(--text);font-weight:600}
        .tl-act:hover:not(:disabled){color:var(--accent)}
        .tl-del:hover{color:#e79595}
      `}</style>
      <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', letterSpacing: '.01em' }}>
        <b style={{ color: isToday ? 'var(--accent)' : 'var(--text)', fontWeight: 600 }}>
          {TL_WD[date.getDay()]} {tlPad(date.getDate())}.{tlPad(date.getMonth() + 1)}
        </b>
        <span style={{ margin: '0 5px', opacity: 0.4 }}>·</span>Н{Math.floor(dayIdx / 7) + 1}
      </span>
      {divider}
      <button className="tl-btn tl-act" onClick={runDigest} disabled={busy} title="Собрать выжимку контента дня (в центре экрана) в память доски">
        {busy ? 'сбор…' : 'Выжимка дня'}
      </button>
      {divider}
      <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.6 }}>очистить</span>
      <button className="tl-btn tl-del" onClick={() => collapse(dayIdx, 1, 'День')} title="Удалить (сжать) день, если он пуст">
        день
      </button>
      <button className="tl-btn tl-del" onClick={() => collapse(wkStart, 7, 'Неделя')} title="Удалить (сжать) неделю, если она пуста">
        нед
      </button>
      <button className="tl-btn tl-del" onClick={() => collapse(mStart, dim, 'Месяц')} title="Удалить (сжать) месяц, если он пуст">
        мес
      </button>
    </div>
  )
}

// Прочитать File → base64 (без data-URL префикса).
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(new Error('read error'))
    r.readAsDataURL(file)
  })
}

// Диалог при дропе текстовых файлов: класть ли их в RAG (базу знаний AnythingLLM) и в
// какой проект (workspace). Ноды на доску создаются в любом случае — RAG опционален.
function RagDropModal({
  files,
  onClose,
  onConfirm
}: {
  files: File[]
  onClose: () => void
  onConfirm: (opts: { rag: boolean; workspace: string }) => void
}): JSX.Element {
  const [workspaces, setWorkspaces] = useState<Array<{ name: string; slug: string }> | null>(null)
  const [wsErr, setWsErr] = useState('')
  const [ws, setWs] = useState<string>(() => localStorage.getItem('flow-rag-project') || 'Flow')
  const [creating, setCreating] = useState(false)
  const [newWs, setNewWs] = useState('')

  useEffect(() => {
    let alive = true
    window.flow?.anythingWorkspaces?.().then((r) => {
      if (!alive) return
      if (r?.ok && r.workspaces) {
        setWorkspaces(r.workspaces)
        // если сохранённого проекта нет в списке — добавим его как вариант
        if (r.workspaces.length && !r.workspaces.some((w) => w.name === ws) && ws !== 'Flow') setCreating(false)
      } else {
        setWsErr(r?.error || 'AnythingLLM недоступен')
      }
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resolveWs = (): string => (creating ? newWs.trim() : ws) || 'Flow'
  const confirm = (rag: boolean): void => {
    const workspace = resolveWs()
    if (rag) localStorage.setItem('flow-rag-project', workspace)
    onConfirm({ rag, workspace })
  }

  const fieldStyle: React.CSSProperties = {
    background: 'var(--panel2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 13,
    padding: '8px 10px',
    fontFamily: SANS,
    outline: 'none',
    width: '100%'
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '92vw',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          padding: 20,
          fontFamily: SANS,
          color: 'var(--text)'
        }}
      >
        <div style={{ font: `600 15px ${SANS}`, marginBottom: 4 }}>Добавить в базу знаний (RAG)?</div>
        <div style={{ font: `400 12px ${SANS}`, color: 'var(--muted)', marginBottom: 14 }}>
          {files.length} файл(ов) лягут нодами на доску. Выбери, класть ли их в RAG и в какой проект.
        </div>

        <div style={{ maxHeight: 96, overflow: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f, i) => (
            <div key={i} style={{ font: `400 12px ${MONO}`, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              📄 {f.name}
            </div>
          ))}
        </div>

        <div style={{ font: `600 11px ${MONO}`, color: 'var(--muted)', letterSpacing: '.06em', marginBottom: 6 }}>ПРОЕКТ (ХРАНИЛИЩЕ RAG)</div>
        {creating ? (
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              autoFocus
              value={newWs}
              onChange={(e) => setNewWs(e.currentTarget.value)}
              placeholder="Имя нового проекта…"
              style={fieldStyle}
            />
            <button onClick={() => setCreating(false)} style={{ ...fieldStyle, width: 'auto', cursor: 'pointer', color: 'var(--muted)' }} title="К списку">
              ↩
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <select value={ws} onChange={(e) => setWs(e.currentTarget.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>
              {(workspaces && workspaces.length ? workspaces.map((w) => w.name) : Array.from(new Set(['Flow', ws]))).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setCreating(true)
                setNewWs('')
              }}
              style={{ ...fieldStyle, width: 'auto', cursor: 'pointer', color: 'var(--accent)', whiteSpace: 'nowrap' }}
              title="Создать новый проект"
            >
              ＋ Новый
            </button>
          </div>
        )}
        {wsErr && (
          <div style={{ font: `400 11px ${SANS}`, color: '#F0A83A', marginBottom: 6 }}>
            {wsErr} — можно указать имя проекта, он создастся при заливке.
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button
            onClick={() => confirm(false)}
            style={{ border: '1px solid var(--border)', background: 'var(--panel2)', color: 'var(--text)', borderRadius: 9, fontSize: 13, padding: '9px 14px', cursor: 'pointer', fontFamily: SANS }}
          >
            Только на доску
          </button>
          <button
            onClick={() => confirm(true)}
            style={{ border: 'none', background: 'var(--accent)', color: '#04121f', fontWeight: 700, borderRadius: 9, fontSize: 13, padding: '9px 16px', cursor: 'pointer', fontFamily: SANS }}
          >
            На доску + в RAG
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [theme, setTheme] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('flow-theme') as ThemeName | null
    return saved && THEME_ORDER.includes(saved) ? saved : 'Графит'
  })
  useEffect(() => {
    localStorage.setItem('flow-theme', theme)
    // Переменные темы кладём и на :root, чтобы их наследовали ПОРТАЛЫ (полноэкранный
    // режим ноды, меню и т.п. рендерятся в document.body — вне корневого div со стилями).
    const root = document.documentElement
    for (const [k, v] of Object.entries(themeVars(theme))) {
      if (k.startsWith('--')) root.style.setProperty(k, String(v))
    }
  }, [theme])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editSlideId, setEditSlideId] = useState<string | null>(null)

  // Доски
  const [boards, setBoards] = useState<Board[]>(() => loadBoards())
  const [currentBoardId, setCurrentBoardId] = useState<string>(
    () => localStorage.getItem(CURRENT_LS) || loadBoards()[0].id
  )
  const [boardMenu, setBoardMenu] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const board = boards.find((b) => b.id === currentBoardId) || boards[0]
  // Таймлайн-режим доски (бесконечная временная сетка) — свой флаг у каждой доски.
  const [timelineOn, setTimelineOn] = useState<boolean>(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Одноразовая миграция localStorage → БД (идемпотентна), затем гидратация доски.
      await migrateLocalStorageToDb()
      await hydrateBoard(currentBoardId)
      if (cancelled) return
      setTlEpoch(boardCreatedMs(currentBoardId)) // отсчёт дней — от дня создания доски
      setTimelineOn(bmetaGet(currentBoardId, 'timeline.on') === '1')
    })()
    return () => {
      cancelled = true
    }
  }, [currentBoardId])

  // АВТО-выгрузка памяти: прошедшие дни (< сегодня) с контентом, но без записи в памяти —
  // автоматически суммаризуем (по ≤2 за проход, свежие раньше). При включении + каждые 10 мин.
  useEffect(() => {
    if (!timelineOn || !editor) return
    let stopped = false
    const runAuto = async (): Promise<void> => {
      if (stopped) return
      const today = tlTodayIndex()
      const have = new Set(readBoardMem(currentBoardId).map((e) => e.date))
      const shapes = editor.getCurrentPageShapes()
      const hasContent = (i: number): boolean => {
        const yTop = i * TL_DAY_H
        const yBot = (i + 1) * TL_DAY_H
        return shapes.some((s) => {
          if (s.type !== 'flow-node') return false
          const k = (s as FlowNodeShape).props.kind
          if (k === 'boardmem' || k === 'daylane' || k === 'tlaxis') return false
          const b = editor.getShapePageBounds(s.id)
          if (!b) return false
          const cy = b.y + b.h / 2
          return cy >= yTop && cy < yBot
        })
      }
      const todo: number[] = []
      for (let i = today - 1; i >= today - 21 && todo.length < 2; i--) {
        if (have.has(tlIso(i))) continue
        if (hasContent(i)) todo.push(i)
      }
      for (const i of todo) {
        if (stopped) break
        const r = await digestDayRange(editor, currentBoardId, i * TL_DAY_H, (i + 1) * TL_DAY_H, tlIso(i))
        if (r.ok) showToast('🧠 Авто-память: день ' + tlIso(i) + ' выгружен')
      }
      if (stopped) return
      const keys = new Set(readBoardMem(currentBoardId).map((e) => e.date))
      // Сводка ЗАВЕРШЁННОЙ недели (все 7 дней < сегодня).
      const wLast = Math.floor((today - 1) / 7)
      const wEnd = wLast * 7 + 6
      if (wEnd < today) {
        const wKey = tlIso(wEnd) + ' · неделя ' + (wLast + 1)
        if (!keys.has(wKey)) {
          const wDates: string[] = []
          for (let k = wLast * 7; k <= wEnd; k++) wDates.push(tlIso(k))
          const r = await rollupMemory(currentBoardId, 'week', wKey, 'неделю ' + (wLast + 1), wDates)
          if (r.ok) showToast('🧠 Авто-память: сводка недели ' + (wLast + 1))
        }
      }
      if (stopped) return
      // Сводка ЗАВЕРШЁННОГО месяца (все дни < сегодня).
      const dY = tlDate(today - 1)
      const mStart = today - 1 - (dY.getDate() - 1)
      const dim = new Date(dY.getFullYear(), dY.getMonth() + 1, 0).getDate()
      const mEnd = mStart + dim - 1
      if (mEnd < today) {
        const mKey = tlIso(mEnd) + ' · ' + TL_MONTHS[dY.getMonth()] + ' ' + dY.getFullYear()
        if (!keys.has(mKey)) {
          const mDates: string[] = []
          for (let k = mStart; k <= mEnd; k++) mDates.push(tlIso(k))
          const r = await rollupMemory(currentBoardId, 'month', mKey, TL_MONTHS[dY.getMonth()] + ' ' + dY.getFullYear(), mDates)
          if (r.ok) showToast('🧠 Авто-память: сводка месяца')
        }
      }
    }
    const t = setTimeout(runAuto, 4000) // немного после открытия
    const iv = setInterval(runAuto, 10 * 60 * 1000)
    return () => {
      stopped = true
      clearTimeout(t)
      clearInterval(iv)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timelineOn, editor, currentBoardId])
  // URL sync-сервера (общий для всех досок этого устройства). По умолчанию —
  // задеплоенный воркер владельца; можно сменить через «⚙ Сервер синхронизации».
  const [syncServer, setSyncServer] = useState<string>(
    () => localStorage.getItem(SYNC_SERVER_LS) || 'wss://flow-sync.untrioir.workers.dev'
  )
  useEffect(() => {
    localStorage.setItem(SYNC_SERVER_LS, syncServer)
  }, [syncServer])
  // Полный адрес комнаты доски на sync-сервере (wss://…/connect/<roomId>)
  const roomUri = (b: Board): string => {
    if (!b.shared || !b.roomId || !syncServer) return ''
    const base = syncServer.replace(/\/+$/, '')
    return `${base}/connect/${encodeURIComponent(b.roomId)}`
  }

  useEffect(() => {
    localStorage.setItem(BOARDS_LS, JSON.stringify(boards))
  }, [boards])
  useEffect(() => {
    localStorage.setItem(CURRENT_LS, currentBoardId)
  }, [currentBoardId])

  // --- Файловая синхронизация холстов через папку Vault ---
  // Снимок каждого холста пишется в `<vault>/.flow-canvas/<key>.json`; если Vault
  // указывает на облачную папку — холсты синхронизируются между устройствами.
  // Конфликты — last-write-wins по updatedAt. IndexedDB tldraw остаётся локальным
  // рабочим кэшем, файлы — слой синхронизации поверх него.
  const syncStamps = useRef<Record<string, number>>(
    (() => {
      try {
        return JSON.parse(localStorage.getItem('flow-canvas-stamps') || '{}')
      } catch {
        return {}
      }
    })()
  )
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressSave = useRef(false)
  const boardsReady = useRef(false)
  const persistStamps = () => {
    try {
      localStorage.setItem('flow-canvas-stamps', JSON.stringify(syncStamps.current))
    } catch {
      /* ignore */
    }
  }

  const pullCanvas = useCallback(async (ed: Editor, key: string) => {
    try {
      const res = await window.flow?.canvasRead({ key })
      if (!res || !res.snapshot) return
      if (res.updatedAt > (syncStamps.current[key] ?? 0)) {
        suppressSave.current = true
        loadSnapshot(ed.store, res.snapshot as never)
        try {
          migrateBoardExtras(ed) // T1.2: миграция/детект повреждённых extra после загрузки
        } catch {
          /* миграция не должна ронять загрузку */
        }
        syncStamps.current[key] = res.updatedAt
        persistStamps()
        setTimeout(() => {
          suppressSave.current = false
        }, 1000)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const scheduleSaveCanvas = useCallback((ed: Editor, key: string, name: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (suppressSave.current) return
      try {
        const snap = getSnapshot(ed.store)
        const ts = Date.now()
        const r = await window.flow?.canvasWrite({ key, snapshot: snap, updatedAt: ts, name })
        if (r && r.ok) {
          syncStamps.current[key] = ts
          persistStamps()
        }
        // T4.1: переиндексировать доску для глобального поиска (целиком — удалённые ноды выпадают).
        try {
          window.flow?.nodes?.reindex({ boardId: key, boardName: name, nodes: buildNodeIndex(ed) })
        } catch {
          /* индексация не критична */
        }
      } catch {
        /* ignore */
      }
    }, 1500)
  }, [])

  // Общий обработчик монтирования редактора (и для локальной, и для общей доски).
  // Для общих досок файловый синк отключаем — источник истины там сервер.
  const handleMount = useCallback(
    (ed: Editor, b: Board) => {
      setEditor(ed)
      try {
        ed.user.updateUserPreferences({ colorScheme: 'dark' })
      } catch {
        /* не критично */
      }
      try {
        ed.sideEffects.registerAfterDeleteHandler('shape', (rec) => {
          const r = rec as unknown as { type?: string; id?: string; props?: { kind?: string; extra?: string } }
          if (r?.type !== 'flow-node') return
          const kind = r.props?.kind
          // Нода с кодом — гасим процесс.
          if (kind === 'codeblock' && r.id) {
            window.flow?.killCode({ id: r.id })
            return
          }
          // PDF-нода — авто-очистка RAG: локальный индекс (pdfId) и документ в
          // AnythingLLM (anyDoc). Но не трогаем, если ту же статью держит другая нода.
          if (kind === 'pdf') {
            let ex: { pdfId?: string; anyDoc?: string } = {}
            try {
              ex = JSON.parse(r.props?.extra || '{}')
            } catch {
              /* ignore */
            }
            if (!ex.pdfId && !ex.anyDoc) return
            let sharedPdf = false
            let sharedDoc = false
            try {
              for (const s of ed.getCurrentPageShapes()) {
                const sp = s as unknown as { type?: string; props?: { extra?: string } }
                if (sp.type !== 'flow-node') continue
                let e2: { pdfId?: string; anyDoc?: string } = {}
                try {
                  e2 = JSON.parse(sp.props?.extra || '{}')
                } catch {
                  /* ignore */
                }
                if (ex.pdfId && e2.pdfId === ex.pdfId) sharedPdf = true
                if (ex.anyDoc && e2.anyDoc === ex.anyDoc) sharedDoc = true
              }
            } catch {
              /* ignore */
            }
            if (ex.pdfId && !sharedPdf) window.flow?.pdfDelete?.({ id: ex.pdfId })
            if (ex.anyDoc && !sharedDoc) window.flow?.anythingRemove?.({ location: ex.anyDoc })
          }
        })
      } catch {
        /* не критично */
      }
      if (b.shared) return // общая доска: синхронизирует сервер, файловый синк не нужен
      const bKey = b.key
      const bName = b.name
      setTimeout(() => pullCanvas(ed, bKey), 700)
      // T1.2: подстраховка для локальных досок без удалённого снапшота — прогнать
      // миграцию/детект повреждённых extra после того, как стор наполнится.
      setTimeout(() => {
        try {
          migrateBoardExtras(ed)
        } catch {
          /* не критично */
        }
        // T4.1: индексируем доску при открытии (чтобы её ноды искались и без правок).
        try {
          window.flow?.nodes?.reindex({ boardId: bKey, boardName: bName, nodes: buildNodeIndex(ed) })
        } catch {
          /* не критично */
        }
      }, 1500)
      try {
        ed.store.listen(() => scheduleSaveCanvas(ed, bKey, bName), { source: 'user', scope: 'document' })
      } catch {
        /* API отличается — не критично */
      }
    },
    [pullCanvas, scheduleSaveCanvas]
  )

  // Оркестратор (research-фаза) просит выложить статьи/гипотезы нодами на доску.
  useEffect(() => {
    if (!editor) return
    const off = window.flow?.onOrchCreateNodes?.((payload) => {
      try {
        createOrchNodes(editor, payload.nodes as OrchNodeSpec[])
      } catch {
        /* не критично */
      }
    })
    return off
  }, [editor])

  // Оркестратор просит вписать запрос в веб-чат-ноду (ChatGPT/Gemini/GLM) и вернуть ответ.
  // Цель: явный target по id → provider (kind) → любая открытая веб-чат-нода.
  useEffect(() => {
    const off = window.flow?.onOrchAskWebLLM?.(async (m) => {
      const respond = (ok: boolean, text: string, provider?: string): void => {
        window.flow?.orchWebLLMResult?.({ projectId: m.projectId, requestId: m.requestId, ok, text, provider })
      }
      try {
        let driver = m.target ? webLLMRegistry.get(m.target) : undefined
        if (!driver && m.provider) {
          const name = m.provider === 'webgemini' ? 'Gemini' : m.provider === 'webglm' ? 'GLM' : 'ChatGPT'
          for (const d of webLLMRegistry.values()) if (d.provider === name) { driver = d; break }
        }
        if (!driver) driver = [...webLLMRegistry.values()][0]
        if (!driver) return respond(false, '')
        const text = await driver.ask(m.prompt, m.timeoutMs)
        respond(!!text, text || '', driver.provider)
      } catch (e) {
        respond(false, String((e as Error)?.message || e))
      }
    })
    return off
  }, [])

  // Список досок: при старте подтянуть из файла (если он новее), дальше — писать при изменениях.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await window.flow?.canvasBoardsRead()
        if (!cancelled && res && Array.isArray(res.boards) && res.boards.length) {
          const localTs = Number(localStorage.getItem('flow-boards-stamp') || '0')
          if (res.updatedAt > localTs) {
            setBoards(res.boards)
            localStorage.setItem('flow-boards-stamp', String(res.updatedAt))
          }
        }
      } catch {
        /* ignore */
      } finally {
        boardsReady.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    if (!boardsReady.current) return
    const ts = Date.now()
    localStorage.setItem('flow-boards-stamp', String(ts))
    window.flow?.canvasBoardsWrite({ boards, updatedAt: ts })
  }, [boards])

  // Когда окно снова в фокусе — проверить, не появился ли на другом устройстве более
  // свежий снимок текущего холста (облако мог его подтянуть).
  useEffect(() => {
    const onFocus = () => {
      if (editor && board) pullCanvas(editor, board.key)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [editor, board, pullCanvas])

  // Смена доски — сбросить отложенное сохранение прошлого холста.
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [board?.key])

  const newBoard = () => {
    const id = 'b' + Date.now().toString(36)
    const b: Board = { id, name: `Доска ${boards.length + 1}`, key: 'flow-board-' + id }
    bmetaSet(id, 'board.createdMs', String(tlStartOfDay(Date.now()))) // день создания доски
    setBoards((x) => [...x, b])
    setCurrentBoardId(id)
    setBoardMenu(false)
  }
  // Вкл/выкл таймлайн-режим доски. При включении: создаём ноду «Память доски» (если нет)
  // и переносим камеру на сегодняшний день.
  const toggleTimeline = () => {
    setTlEpoch(boardCreatedMs(currentBoardId)) // отсчёт от дня создания доски
    const next = !timelineOn
    setTimelineOn(next)
    bmetaSet(currentBoardId, 'timeline.on', next ? '1' : '0')
    setBoardMenu(false)
    if (next && editor) {
      const hasMem = editor.getCurrentPageShapes().some((s) => s.type === 'flow-node' && (s as FlowNodeShape).props.kind === 'boardmem')
      if (!hasMem) {
        const memId = createShapeId()
        const todayY = tlTodayIndex() * TL_DAY_H
        editor.createShape<FlowNodeShape>({
          id: memId,
          type: 'flow-node',
          x: -(TL_WEEK_W + TL_MONTH_W) - 640, // в свободной зоне, левее месячных окошек
          y: todayY,
          props: { kind: 'boardmem', title: 'Память доски', extra: JSON.stringify({ boardId: currentBoardId }), w: 560, h: 420 }
        })
      }
      try {
        editor.setCamera({ x: 40, y: -(tlTodayIndex() * TL_DAY_H) + 80, z: 0.55 }, { animation: { duration: 400 } })
      } catch {
        /* ignore */
      }
      showToast('🗓 Таймлайн включён — прокрути вниз/вверх: дни бесконечны, недели окрашены')
    } else {
      showToast('🗓 Таймлайн выключен')
    }
  }
  const renameBoard = (name: string) =>
    setBoards((x) => x.map((b) => (b.id === currentBoardId ? { ...b, name } : b)))
  const deleteBoard = () => {
    if (boards.length <= 1) return
    const gone = boards.find((b) => b.id === currentBoardId)
    const rest = boards.filter((b) => b.id !== currentBoardId)
    setBoards(rest)
    setCurrentBoardId(rest[0].id)
    setBoardMenu(false)
    if (gone) {
      delete syncStamps.current[gone.key]
      persistStamps()
      window.flow?.canvasRemove({ key: gone.key })
      window.flow?.nodes?.deleteBoard({ boardId: gone.key }) // T4.1: убрать из поискового индекса
    }
  }

  // --- Общий доступ к доске (real-time через sync-сервер) ---
  const askServer = (): string | null => {
    const v = window.prompt(
      'Адрес sync-сервера (wss://…).\nНапример: wss://flow-sync.ТВОЙ-АккаунТ.workers.dev',
      syncServer
    )
    if (v == null) return null
    const t = v.trim()
    setSyncServer(t)
    return t
  }
  const makeShared = () => {
    let srv = syncServer
    if (!srv) {
      const v = askServer()
      if (!v) return
      srv = v
    }
    const roomId = board.roomId || 'room-' + Math.random().toString(36).slice(2, 10)
    setBoards((x) => x.map((b) => (b.id === currentBoardId ? { ...b, shared: true, roomId } : b)))
    setBoardMenu(false)
    setToast('Доска общая. ID комнаты: ' + roomId)
  }
  const unshareBoard = () => {
    setBoards((x) => x.map((b) => (b.id === currentBoardId ? { ...b, shared: false } : b)))
    setBoardMenu(false)
  }
  const joinShared = () => {
    let srv = syncServer
    if (!srv) {
      const v = askServer()
      if (!v) return
      srv = v
    }
    const roomId = window.prompt('ID комнаты общей доски (его даёт владелец):', '')?.trim()
    if (!roomId) return
    const id = 'b' + Date.now().toString(36)
    setBoards((x) => [...x, { id, name: 'Общая доска', key: 'flow-board-' + id, shared: true, roomId }])
    setCurrentBoardId(id)
    setBoardMenu(false)
  }
  const copyRoomId = () => {
    if (board.roomId) {
      navigator.clipboard?.writeText(board.roomId)
      setToast('ID комнаты скопирован: ' + board.roomId)
    }
  }

  const exportBoard = () => {
    if (!editor) return
    try {
      const json = JSON.stringify(getSnapshot(editor.store))
      const base64 = btoa(unescape(encodeURIComponent(json)))
      const safe = board.name.replace(/[^\wа-яА-ЯёЁ \-]/g, '').trim() || 'board'
      window.flow?.saveFile({ base64, name: safe + '.flow.json' })
    } catch {
      /* ignore */
    }
  }
  const importBoard = (file: File) => {
    const r = new FileReader()
    r.onload = () => {
      try {
        const snap = JSON.parse(String(r.result))
        if (editor) loadSnapshot(editor.store, snap)
        setBoardMenu(false)
      } catch {
        setToast('Не удалось импортировать файл доски')
      }
    }
    r.readAsText(file)
  }

  // Оверлеи
  const [cmdkOpen, setCmdkOpen] = useState(false)
  // T4.1: отложенный фокус на ноду после переключения доски (доска грузится асинхронно).
  const pendingFocus = useRef<{ boardId: string; shapeId?: string; wantMem?: boolean } | null>(null)
  const [ragOpen, setRagOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [vaultOpen, setVaultOpen] = useState(false)
  // Навигация по разделам сайдбара: открытие одного оверлея закрывает остальные,
  // «Холст» = все закрыты (пользователь работает на доске).
  const anyOverlayOpen = vaultOpen || graphOpen || agentsOpen || genOpen || settingsOpen
  const closeAllOverlays = () => {
    setVaultOpen(false)
    setGraphOpen(false)
    setAgentsOpen(false)
    setGenOpen(false)
    setSettingsOpen(false)
  }
  const openOverlay = (which: 'vault' | 'graph' | 'agents' | 'gen' | 'settings') => {
    setVaultOpen(which === 'vault')
    setGraphOpen(which === 'graph')
    setAgentsOpen(which === 'agents')
    setGenOpen(which === 'gen')
    setSettingsOpen(which === 'settings')
  }
  // Открыть доску холста по имени (клик по [[[доске]]] в заметке Obsidian).
  // Нет такой доски — создаём новую с этим именем. Затем закрываем оверлеи → на холст.
  const openBoardByName = (name: string) => {
    const nm = name.trim()
    if (!nm) return
    const found = boards.find((b) => b.name.toLowerCase() === nm.toLowerCase())
    if (found) {
      setCurrentBoardId(found.id)
    } else {
      const id = 'b' + Date.now().toString(36)
      setBoards((x) => [...x, { id, name: nm, key: 'flow-board-' + id }])
      setCurrentBoardId(id)
      showToast('Создана доска «' + nm + '»')
    }
    closeAllOverlays()
  }
  const [flyout, setFlyout] = useState<{ id: string; top: number } | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // раздвижной сайдбар
  const [hierarchyOpen, setHierarchyOpen] = useState(() => localStorage.getItem('flow-hier-open') !== '0')
  useEffect(() => {
    localStorage.setItem('flow-hier-open', hierarchyOpen ? '1' : '0')
  }, [hierarchyOpen])
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout((showToast as unknown as { _t?: number })._t)
    ;(showToast as unknown as { _t?: number })._t = window.setTimeout(() => setToast(null), 2800)
  }, [])

  // Открытие редактора слайда по клику на ✏️ в карточке-слайде
  useEffect(() => {
    const h = (e: Event) => setEditSlideId((e as CustomEvent).detail as string)
    window.addEventListener('flow-edit-slide', h)
    return () => window.removeEventListener('flow-edit-slide', h)
  }, [])

  // Полноэкранный режим ноды по клику на ⛶ в её шапке
  const [fsNodeId, setFsNodeId] = useState<string | null>(null)
  useEffect(() => {
    const h = (e: Event) => setFsNodeId((e as CustomEvent).detail as string)
    window.addEventListener('flow-fullscreen-node', h)
    return () => window.removeEventListener('flow-fullscreen-node', h)
  }, [])

  // Закрытие всплывающей плашки категории по клику вне неё / Esc
  useEffect(() => {
    if (!flyout) return
    const close = (): void => setFlyout(null)
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setFlyout(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [flyout])

  const addNode = useCallback(
    (kind: string, title: string, screenPt?: { x: number; y: number }) => {
      if (!editor) return
      const id = createShapeId()
      const { w, h } = sizeFor(kind)
      let x: number
      let y: number
      if (screenPt) {
        const p = editor.screenToPage(screenPt)
        x = p.x - w / 2
        y = p.y - h / 2
      } else {
        const c = editor.getViewportPageBounds().center
        x = c.x - w / 2
        y = c.y - h / 2
      }
      editor.createShape<FlowNodeShape>({ id, type: 'flow-node', x, y, props: { kind, title, w, h } })
      editor.select(id)
    },
    [editor]
  )

  // Отправить заметку из редактора нодой на холст (кнопка «→ Отправить на холст»)
  const sendNoteToCanvas = useCallback(
    (title: string, md: string) => {
      if (!editor) return
      const id = createShapeId()
      const { w, h } = sizeFor('note')
      const c = editor.getViewportPageBounds().center
      editor.createShape<FlowNodeShape>({
        id,
        type: 'flow-node',
        x: c.x - w / 2,
        y: c.y - h / 2,
        props: { kind: 'note', title, body: md, w, h }
      })
      editor.select(id)
    },
    [editor]
  )

  // Создание ноды из файла, брошенного на холст (фото → ref, PDF/Word/PPTX/текст → doc)
  const addFileNode = useCallback(
    (file: File, screenPt: { x: number; y: number }, idx: number, opts?: { noRag?: boolean }) => {
      if (!editor) return
      const IMG = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|ico|tiff?)$/i
      const PDF = /\.pdf$/i
      const DOCX = /\.(docx|pptx)$/i
      const SHEET = /\.(xlsx|xls|csv)$/i
      const off = idx * 26
      const mkNode = (kind: string, extraProps: Record<string, unknown>, title: string): void => {
        const id = createShapeId()
        const { w, h } = sizeFor(kind)
        const p = editor.screenToPage({ x: screenPt.x + off, y: screenPt.y + off })
        editor.createShape<FlowNodeShape>({
          id,
          type: 'flow-node',
          x: p.x - w / 2,
          y: p.y - h / 2,
          props: { kind, title, w, h, ...extraProps }
        })
        editor.select(id)
      }
      const r = new FileReader()
      if (file.type.startsWith('image/') || IMG.test(file.name)) {
        r.onload = () => mkNode('ref', { extra: JSON.stringify({ image: String(r.result) }) }, file.name)
        r.readAsDataURL(file)
      } else if (PDF.test(file.name)) {
        // PDF сохраняем ФАЙЛОМ на диск (не в доску!) и создаём pdf-ноду по id
        r.onload = async () => {
          const base64 = String(r.result).split(',')[1] || ''
          const id = 'pdf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
          try {
            const imp = await window.flow.pdfImport({ base64, id })
            if (imp.ok) mkNode('pdf', { extra: JSON.stringify({ pdfId: id, name: file.name, noRag: opts?.noRag || undefined }) }, file.name)
            else mkNode('doc', { body: `[Не удалось сохранить PDF: ${imp.error}]` }, file.name)
          } catch (e) {
            mkNode('doc', { body: `[Ошибка PDF «${file.name}»: ${String(e)}]` }, file.name)
          }
        }
        r.readAsDataURL(file)
      } else if (DOCX.test(file.name)) {
        r.onload = async () => {
          const base64 = String(r.result).split(',')[1] || ''
          try {
            const res = await window.flow.extractDoc({ base64, name: file.name })
            mkNode('doc', { body: res.ok ? res.text : `[Не удалось извлечь текст: ${res.error}]` }, file.name)
          } catch (e) {
            mkNode('doc', { body: `[Ошибка чтения «${file.name}»: ${String(e)}]` }, file.name)
          }
        }
        r.readAsDataURL(file)
      } else if (SHEET.test(file.name)) {
        // Excel/CSV → нода-таблица с данными
        sheetModelFromFile(file)
          .then((model) => mkNode('sheet', { title: file.name.replace(SHEET, ''), extra: JSON.stringify({ sheet: model }) }, file.name))
          .catch((e) => mkNode('doc', { body: `[Не удалось прочитать таблицу «${file.name}»: ${String(e)}]` }, file.name))
      } else {
        r.onload = () => mkNode('doc', { body: String(r.result || '').slice(0, 40000) }, file.name)
        r.readAsText(file)
      }
    },
    [editor]
  )

  // Текстовые файлы (статьи и пр.), для которых предлагаем выбор «в RAG / в какой проект».
  const RAG_TEXT = /\.(pdf|docx|pptx|txt|md|markdown|rtf)$/i
  const dropFiles = useCallback(
    (files: FileList, screenPt: { x: number; y: number }) => {
      const arr = Array.from(files)
      const textFiles = arr.filter((f) => RAG_TEXT.test(f.name))
      const others = arr.filter((f) => !RAG_TEXT.test(f.name))
      // Не-текстовые (картинки/таблицы) — сразу нодами.
      others.forEach((f, i) => addFileNode(f, screenPt, i))
      // Текстовые — через диалог выбора RAG/проекта (ноды создаст обработчик подтверждения).
      if (textFiles.length) setRagDrop({ files: textFiles, screenPt })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addFileNode]
  )

  // Диалог выбора RAG при дропе текстовых файлов.
  const [ragDrop, setRagDrop] = useState<{ files: File[]; screenPt: { x: number; y: number } } | null>(null)
  const handleRagDrop = useCallback(
    async (opts: { rag: boolean; workspace: string }) => {
      const pending = ragDrop
      setRagDrop(null)
      if (!pending) return
      // Ноды на доску — всегда. Если выбрано «без RAG» — помечаем PDF noRag, чтобы он
      // НЕ индексировался локально (не эмбеддился). В RAG (AnythingLLM) — только при opts.rag ниже.
      pending.files.forEach((f, i) => addFileNode(f, pending.screenPt, i, { noRag: !opts.rag }))
      if (!opts.rag) return
      showToast(`Заливаю ${pending.files.length} файл(ов) в RAG «${opts.workspace}»…`)
      let ok = 0
      for (const f of pending.files) {
        try {
          const base64 = await fileToBase64(f)
          const r = await window.flow.anythingIngest({ base64, name: f.name, workspace: opts.workspace })
          if (r.ok) ok++
        } catch {
          /* ignore single-file failure */
        }
      }
      showToast(ok === pending.files.length ? `В RAG «${opts.workspace}» добавлено ${ok} файл(ов) ✓` : `В RAG «${opts.workspace}»: ${ok}/${pending.files.length} (проверь AnythingLLM/ключ)`)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ragDrop, addFileNode]
  )

  // ⌘K и Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
        e.preventDefault()
        setCmdkOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setCmdkOpen(false)
        setRagOpen(false)
        setGraphOpen(false)
        setAgentsOpen(false)
        setGenOpen(false)
        setMobileOpen(false)
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Приблизить к выделенной ноде ровно на 100% — чтобы работать с ней чётко,
  // без размытия, которое неизбежно при отдалении холста (webview/картинки/canvas
  // масштабируются как растр). Обзор — издалека, работа — вплотную на 100%.
  const zoomToSelectedNode = useCallback(() => {
    if (!editor) return
    const b = editor.getSelectionPageBounds()
    if (!b) return
    // Разные типы нод хотят разного: webview (растровая поверхность Chromium) чёток
    // только на 100% — фиксируем 100%. Слайды/презентации/заметки — разворачиваем на
    // весь экран, чтобы было крупно и читаемо (там при увеличении картинка не «мылит»).
    const sel = editor.getSelectedShapes()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kinds = sel.map((s) => (s as any).props?.kind).filter(Boolean)
    const webviewOnly =
      kinds.length > 0 && kinds.every((k: string) => k === 'openscience' || k === 'anythingllm')
    if (webviewOnly) {
      editor.zoomToBounds(b, { targetZoom: 1, inset: 24, animation: { duration: 250 } })
    } else {
      editor.zoomToBounds(b, { inset: 48, animation: { duration: 250 } })
    }
  }, [editor])

  // T4.1: сфокусировать/центрировать камеру на ноде (с подсветкой-выделением).
  const focusShape = useCallback((ed: Editor, shapeId: string): boolean => {
    try {
      const sid = shapeId as TLShapeId
      const b = ed.getShapePageBounds(sid)
      if (!b) return false
      ed.setSelectedShapes([sid])
      ed.zoomToBounds(b, { inset: 80, animation: { duration: 300 } })
      return true
    } catch {
      return false
    }
  }, [])

  // T4.1: переход по результату глобального поиска.
  const handleSearchNav = useCallback(
    (t: SearchNav) => {
      if (t.type === 'command') {
        t.run()
        return
      }
      if (t.type === 'transcript') {
        if (!editor || !focusShape(editor, t.shapeId)) showToast('Этот чат — на другой доске, открой её вручную')
        return
      }
      const target = boards.find((b) => b.key === t.boardId || b.id === t.boardId)
      const targetId = target?.id
      if (!targetId) {
        showToast('Доска не найдена')
        return
      }
      if (t.type === 'node') {
        if (targetId === currentBoardId) {
          if (editor) focusShape(editor, t.shapeId)
        } else {
          pendingFocus.current = { boardId: targetId, shapeId: t.shapeId }
          setCurrentBoardId(targetId)
        }
        return
      }
      // t.type === 'memory'
      const focusMem = (ed: Editor): boolean => {
        const mem = ed
          .getCurrentPageShapes()
          .find((s) => s.type === 'flow-node' && (s as FlowNodeShape).props.kind === 'boardmem')
        if (mem) return focusShape(ed, String(mem.id))
        return false
      }
      if (targetId === currentBoardId) {
        if (editor && !focusMem(editor)) showToast('Включи «🗓 Таймлайн доски», чтобы увидеть ноду памяти')
      } else {
        pendingFocus.current = { boardId: targetId, wantMem: true }
        setCurrentBoardId(targetId)
      }
    },
    [boards, currentBoardId, editor, focusShape, showToast]
  )

  // T4.1: после переключения доски дождаться загрузки снапшота и сфокусировать ноду.
  useEffect(() => {
    if (!editor || !pendingFocus.current) return
    const target = pendingFocus.current
    if (target.boardId !== currentBoardId) return
    let tries = 0
    let stopped = false
    const tick = (): void => {
      if (stopped || !pendingFocus.current) return
      if (target.shapeId) {
        if (focusShape(editor, target.shapeId)) {
          pendingFocus.current = null
          return
        }
      } else if (target.wantMem) {
        const mem = editor
          .getCurrentPageShapes()
          .find((s) => s.type === 'flow-node' && (s as FlowNodeShape).props.kind === 'boardmem')
        if (mem) {
          focusShape(editor, String(mem.id))
          pendingFocus.current = null
          return
        }
      }
      tries++
      if (tries < 20) setTimeout(tick, 150)
      else pendingFocus.current = null
    }
    const t0 = setTimeout(tick, 250)
    return () => {
      stopped = true
      clearTimeout(t0)
    }
  }, [editor, currentBoardId, focusShape])

  // Горячая клавиша Shift+F (через e.code — работает и в русской раскладке).
  // Capture-фаза, чтобы сработать раньше инструмента tldraw; не мешаем вводу текста.
  useEffect(() => {
    if (!editor) return
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF' || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey) return
      const ae = document.activeElement as HTMLElement | null
      const typing =
        !!ae &&
        (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable || ae.tagName === 'WEBVIEW')
      if (typing || editor.getEditingShapeId() || !editor.getSelectedShapeIds().length) return
      e.preventDefault()
      e.stopImmediatePropagation()
      zoomToSelectedNode()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [editor, zoomToSelectedNode])

  // Надёжный перехват перетаскивания файлов из ОС: на уровне документа в
  // capture-фазе — срабатывает раньше tldraw (который иначе глотает drop) и
  // раньше Electron (который иначе пытается «открыть» файл в окне).
  useEffect(() => {
    const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')
    const onOver = (e: DragEvent): void => {
      if (hasFiles(e)) e.preventDefault() // без этого drop вообще не сработает
    }
    const onDrop = (e: DragEvent): void => {
      if (e.dataTransfer?.files?.length) {
        e.preventDefault()
        e.stopPropagation()
        dropFiles(e.dataTransfer.files, { x: e.clientX, y: e.clientY })
      }
    }
    document.addEventListener('dragover', onOver, true)
    document.addEventListener('drop', onDrop, true)
    return () => {
      document.removeEventListener('dragover', onOver, true)
      document.removeEventListener('drop', onDrop, true)
    }
  }, [dropFiles])

  // Скрытый input для вставки PDF через файловый диалог (альтернатива drag&drop)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const onPickPdf = (files: FileList | null): void => {
    if (!files || !files.length || !editor) return
    const c = editor.pageToScreen(editor.getViewportPageBounds().center)
    dropFiles(files, { x: c.x, y: c.y })
  }

  const commands: Command[] = useMemo(
    () => [
      { label: 'Новая заметка', hint: 'нода', run: () => addNode('note', 'Заметка') },
      { label: 'Новая ИИ-чат-нода', hint: 'нода', run: () => addNode('ai', 'ИИ-ассистент') },
      { label: 'Новая код-панель', hint: 'нода', run: () => addNode('code', 'Код') },
      { label: 'Веб-поиск', hint: 'нода', run: () => addNode('search', 'Поиск') },
      { label: 'Генерация изображения', hint: 'нода', run: () => addNode('image', 'Изображение') },
      { label: 'Референс (фото)', hint: 'нода', run: () => addNode('ref', 'Референс') },
      { label: 'Презентация', hint: 'нода', run: () => addNode('deck', 'Презентация') },
      { label: 'Новая схема (Mermaid)', hint: 'нода', run: () => addNode('diagram', 'Схема') },
      { label: 'Документ', hint: 'нода', run: () => addNode('doc', 'Документ') },
      { label: 'OpenCode (агент для кода)', hint: 'нода', run: () => addNode('opencode', 'OpenCode') },
      { label: 'AnythingLLM (RAG-ассистент)', hint: 'нода', run: () => addNode('anythingllm', 'AnythingLLM') },
      { label: 'OpenScience (научный AI-воркбенч)', hint: 'нода', run: () => addNode('openscience', 'OpenScience') },
      { label: 'Jupyter-ноутбук (Colab)', hint: 'нода', run: () => addNode('notebook', 'Jupyter-ноутбук') },
      { label: 'PDF-документ (аннотации + Q&A)', hint: 'файл', run: () => pdfInputRef.current?.click() },
      { label: 'Новый RAG-проект…', hint: 'модалка', run: () => setRagOpen(true) },
      { label: 'Открыть граф знаний', hint: 'оверлей', run: () => setGraphOpen(true) },
      { label: 'Студия агентов', hint: 'оверлей', run: () => setAgentsOpen(true) },
      { label: 'Генеративная студия', hint: 'оверлей', run: () => setGenOpen(true) },
      { label: 'Мобильный вид · туннель', hint: 'оверлей', run: () => setMobileOpen(true) },
      { label: 'Настройки провайдеров', hint: 'оверлей', run: () => setSettingsOpen(true) },
      { label: 'Тема: Графит', hint: 'стиль', run: () => setTheme('Графит') },
      { label: 'Тема: Обсидиан', hint: 'стиль', run: () => setTheme('Обсидиан') },
      { label: 'Тема: Тёплый уголь', hint: 'стиль', run: () => setTheme('Тёплый уголь') },
      { label: 'Тема: Светлая', hint: 'стиль', run: () => setTheme('Светлая') },
      { label: 'Приблизить к ноде · 100% (Shift+F)', hint: 'вид', run: () => zoomToSelectedNode() }
    ],
    [addNode, zoomToSelectedNode]
  )

  // Оставляем инструменты рисования tldraw («фигма»-панель снизу + панель стилей справа),
  // прячем только дублирующую навигацию/меню — свою обвязку рисуем сами.
  const components: TLComponents = useMemo(
    () =>
      ({
        Background: timelineOn ? TimelineBackground : DotGridBackground,
        StylePanel: CollapsibleStylePanel,
        PageMenu: null,
        NavigationPanel: null,
        MainMenu: null,
        HelpMenu: null,
        ZoomMenu: null,
        DebugMenu: null,
        DebugPanel: null,
        SharePanel: null,
        MenuPanel: null,
        TopPanel: null,
        QuickActions: null,
        ActionsMenu: null,
        HelperButtons: null,
        Minimap: null,
        KeyboardShortcutsDialog: null
      }) as TLComponents,
    [timelineOn]
  )

  // Элемент раздвижного сайдбара: иконка (+ подпись, когда панель развёрнута).
  const RailItem = ({
    icon,
    label,
    title,
    active,
    color,
    onClick,
    dragKind
  }: {
    icon: React.ReactNode
    label: string
    title?: string
    active?: boolean
    color?: string
    onClick?: (e: React.MouseEvent) => void
    dragKind?: string
  }) => {
    const iconColor = color ?? (active ? 'var(--accent)' : 'var(--muted)')
    return (
      <div
        className={'os-btn os-rail' + (dragKind ? ' os-chip' : '')}
        title={title ?? label}
        draggable={!!dragKind}
        onDragStart={dragKind ? (e) => e.dataTransfer.setData('text/plain', dragKind) : undefined}
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          height: 38,
          width: '100%',
          borderRadius: 9,
          flex: '0 0 auto',
          padding: sidebarOpen ? '0 9px' : 0,
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          background: active ? 'var(--accent-dim)' : 'transparent'
        }}
      >
        <span style={{ width: 22, flex: '0 0 auto', display: 'grid', placeItems: 'center', color: iconColor }}>
          {icon}
        </span>
        {sidebarOpen && (
          <span
            className="os-rail-label"
            style={{ font: `500 12.5px ${SANS}`, color: active ? 'var(--accent)' : 'var(--text)' }}
          >
            {label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        ...themeVars(theme),
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: SANS,
        userSelect: 'none'
      }}
    >
      <style>{OS_CSS}</style>
      <style>{GLOBAL_CSS}</style>
      <style>{DESIGN_CSS}</style>

      {/* Основной ряд: сайдбар + холст */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Сайдбар (раздвижной) */}
        <div
          className="os-scroll"
          style={{
            width: sidebarOpen ? 214 : 56,
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            padding: 8,
            background: 'var(--panel)',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            overflowX: 'hidden',
            transition: 'width .18s ease',
            zIndex: 20
          }}
        >
          {/* Заголовок + переключатель свернуть/развернуть */}
          <button
            className="os-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? 'Свернуть панель' : 'Развернуть панель'}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 40,
              width: '100%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: sidebarOpen ? '0 8px' : 0,
              justifyContent: sidebarOpen ? 'space-between' : 'center',
              marginBottom: 4
            }}
          >
            {sidebarOpen && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent)',
                    borderRadius: 7,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--accent)',
                    font: `600 11px ${MONO}`
                  }}
                >
                  ОС
                </span>
                <span style={{ font: `600 14px ${SANS}`, color: 'var(--text)' }}>Flow</span>
              </span>
            )}
            <span style={{ font: `600 16px ${MONO}`, color: 'var(--muted)', width: 22, display: 'grid', placeItems: 'center' }}>
              {sidebarOpen ? '«' : '»'}
            </span>
          </button>

          <RailItem icon={<IconCanvas />} label="Холст" active={!anyOverlayOpen} onClick={closeAllOverlays} />
          <RailItem icon={<IconObsidian />} label="Заметки" active={vaultOpen} onClick={() => openOverlay('vault')} />
          <RailItem icon={<IconGraph />} label="Граф знаний" active={graphOpen} onClick={() => openOverlay('graph')} />
          <RailItem icon={<IconAgents />} label="Агенты" active={agentsOpen} onClick={() => openOverlay('agents')} />
          <RailItem icon={<IconGen />} label="Генеративная студия" active={genOpen} onClick={() => openOverlay('gen')} />
          <RailItem icon={<IconSettings />} label="Настройки" active={settingsOpen} onClick={() => openOverlay('settings')} />

          <div style={{ height: 1, background: 'var(--border)', margin: '8px 4px' }} />
          {sidebarOpen && (
            <div style={{ font: `600 9px ${MONO}`, color: 'var(--muted)', letterSpacing: '.08em', padding: '0 9px 3px' }}>
              НОДЫ
            </div>
          )}

          {NODE_GROUPS.map((g) => (
            <RailItem
              key={g.id}
              icon={<GroupIcon id={g.id} size={18} />}
              label={g.title}
              title={g.title}
              active={flyout?.id === g.id}
              onClick={(e) => {
                e.stopPropagation()
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setFlyout((f) => (f?.id === g.id ? null : { id: g.id, top: rect.top }))
              }}
            />
          ))}
          {STANDALONE_NODES.map((kind) => (
            <RailItem
              key={kind}
              icon={<NodeIcon kind={kind} size={18} />}
              label={chipTitle(kind)}
              title={`Перетащите на холст: ${chipTitle(kind)}`}
              color={chipColor(kind)}
              dragKind={kind}
              onClick={() => addNode(kind, chipTitle(kind))}
            />
          ))}
        </div>

        {/* Панель иерархии нод (кто с кем связан) — между вкладками и холстом */}
        {hierarchyOpen ? (
          <HierarchyPanel editor={editor} onClose={() => setHierarchyOpen(false)} />
        ) : (
          <button
            onClick={() => setHierarchyOpen(true)}
            title="Показать иерархию нод"
            style={{
              flexShrink: 0,
              width: 22,
              border: 'none',
              borderRight: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: 13,
              writingMode: 'vertical-rl',
              padding: '10px 0',
              letterSpacing: '.05em'
            }}
          >
            » Иерархия
          </button>
        )}

        {/* Холст */}
        <div
          className="os-canvas"
          style={{ flex: 1, position: 'relative', minWidth: 0, background: 'var(--bg)' }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            // Файлы с рабочего стола → ноды на холсте
            if (e.dataTransfer.files && e.dataTransfer.files.length) {
              e.preventDefault()
              dropFiles(e.dataTransfer.files, { x: e.clientX, y: e.clientY })
              return
            }
            const kind = e.dataTransfer.getData('text/plain')
            if (!kind) return
            e.preventDefault()
            const chip = SIDEBAR_CHIPS.find((c) => c.kind === kind)
            addNode(kind, chip?.title ?? 'Нода', { x: e.clientX, y: e.clientY })
          }}
        >
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              onPickPdf(e.currentTarget.files)
              e.currentTarget.value = ''
            }}
          />
          {board.shared && roomUri(board) ? (
            <SharedBoard
              key={'shared-' + board.roomId}
              uri={roomUri(board)}
              components={components}
              onMount={(ed) => handleMount(ed, board)}
            />
          ) : (
            <Tldraw
              key={board.key}
              persistenceKey={board.key}
              shapeUtils={customShapeUtils}
              components={components}
              cameraOptions={CAMERA_OPTIONS}
              onMount={(ed) => handleMount(ed, board)}
            />
          )}

          {/* Хлебная крошка + переключатель досок */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 12, left: 14, zIndex: 12 }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 10px 6px 12px',
                font: `500 11.5px ${SANS}`,
                color: 'var(--muted)'
              }}
            >
              Мой проект <span style={{ color: 'var(--border)' }}>/</span>
              <button
                className="os-btn"
                onClick={() => setBoardMenu((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text)',
                  font: `600 11.5px ${SANS}`,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: 6
                }}
              >
                {board.name}
                <span style={{ fontSize: 9, color: 'var(--muted)' }}>▾</span>
              </button>
            </div>

            {boardMenu && (
              <div
                style={{
                  marginTop: 6,
                  width: 240,
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ font: `500 9px ${MONO}`, color: 'var(--muted)', letterSpacing: '.06em', padding: '2px 4px' }}>
                  ДОСКИ
                </div>
                <div className="os-scroll" style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {boards.map((b) => (
                    <button
                      key={b.id}
                      className="os-btn os-tab"
                      onClick={() => {
                        setCurrentBoardId(b.id)
                        setBoardMenu(false)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        border: 'none',
                        borderRadius: 7,
                        padding: '7px 9px',
                        background: b.id === currentBoardId ? 'var(--accent-dim)' : 'transparent',
                        color: b.id === currentBoardId ? 'var(--accent)' : 'var(--text)',
                        font: `500 12px ${SANS}`,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: b.id === currentBoardId ? 'var(--accent)' : 'var(--border)', flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                    </button>
                  ))}
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

                <div style={{ font: `500 9px ${MONO}`, color: 'var(--muted)', letterSpacing: '.06em', padding: '2px 4px' }}>
                  ПЕРЕИМЕНОВАТЬ
                </div>
                <input
                  className="flow-set-input"
                  value={board.name}
                  onChange={(e) => renameBoard(e.currentTarget.value)}
                  style={{ marginBottom: 2 }}
                />

                <button className="os-btn" onClick={newBoard} style={boardMenuBtn('var(--accent)')}>
                  ＋ Новая доска
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="os-btn" onClick={exportBoard} style={{ ...boardMenuBtn('var(--text)'), flex: 1 }}>
                    ⬇ Экспорт
                  </button>
                  <button
                    className="os-btn"
                    onClick={() => importInputRef.current?.click()}
                    style={{ ...boardMenuBtn('var(--text)'), flex: 1 }}
                  >
                    ⬆ Импорт
                  </button>
                </div>
                <button
                  className="os-btn"
                  onClick={toggleTimeline}
                  style={boardMenuBtn(timelineOn ? '#34D399' : '#64748B')}
                  title="Бесконечная временная сетка: каждый день — горизонтальная полоса во всю ширину, неделя своим пастельным цветом. Прокрутка вверх/вниз — прошлое/будущее."
                >
                  🗓 Таймлайн доски: {timelineOn ? 'вкл ✓' : 'выкл'}
                </button>

                {/* Real-time совместная работа */}
                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                {!board.shared ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="os-btn" onClick={makeShared} style={{ ...boardMenuBtn('#34D399'), flex: 1 }}>
                      🌐 Сделать общей
                    </button>
                    <button className="os-btn" onClick={joinShared} style={{ ...boardMenuBtn('var(--text)'), flex: 1 }}>
                      🔗 Подключиться
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--muted)', padding: '2px 2px' }}>
                      🌐 Общая доска · ID: <b style={{ color: 'var(--text)' }}>{board.roomId}</b>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="os-btn" onClick={copyRoomId} style={{ ...boardMenuBtn('#34D399'), flex: 1 }}>
                        📋 Копировать ID
                      </button>
                      <button className="os-btn" onClick={unshareBoard} style={{ ...boardMenuBtn('var(--muted)'), flex: 1 }}>
                        ⏹ Отключить
                      </button>
                    </div>
                  </>
                )}
                <button className="os-btn" onClick={askServer} style={{ ...boardMenuBtn('var(--muted)'), fontSize: 11 }}>
                  ⚙ Сервер синхронизации{syncServer ? ' ✓' : ' (не задан)'}
                </button>

                {boards.length > 1 && (
                  <button className="os-btn" onClick={deleteBoard} style={boardMenuBtn('#F87171')}>
                    🗑 Удалить доску
                  </button>
                )}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) importBoard(f)
                    e.currentTarget.value = ''
                  }}
                />
              </div>
            )}
          </div>

          {/* Верхняя панель кнопок убрана — «Туннель», «RAG-проект» и палитра
              доступны через Ctrl/⌘+K (см. командную палитру). */}

          <OSMinimap editor={editor} />
        </div>
      </div>

      {/* Статус-бар */}
      <StatusBar editor={editor} theme={theme} setTheme={setTheme} />

      {/* Оверлеи */}
      <GlobalSearch
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        commands={commands}
        onNavigate={handleSearchNav}
        searchTranscripts={searchTranscripts}
      />
      <RagModal open={ragOpen} onClose={() => setRagOpen(false)} onToast={showToast} />
      <GraphOverlay open={graphOpen} onClose={() => setGraphOpen(false)} />
      <AgentsStudio open={agentsOpen} onClose={() => setAgentsOpen(false)} onToast={showToast} />
      <GenStudio
        open={genOpen}
        onClose={() => setGenOpen(false)}
        onToCanvas={() => {
          setGenOpen(false)
          addNode('image', 'Изображение')
          showToast('Результат воркфлоу добавлен на холст новой нодой')
        }}
      />
      <MobileView
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToast={showToast}
        onToCanvas={() => addNode('note', 'Заметка')}
      />

      <VaultView
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onToast={showToast}
        boards={boards.map((b) => b.name)}
        onOpenBoard={openBoardByName}
        onSendToCanvas={sendNoteToCanvas}
      />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {editSlideId && editor && (
        <SlideEditor editor={editor} slideId={editSlideId} onClose={() => setEditSlideId(null)} />
      )}
      {fsNodeId && editor && (
        <NodeFullscreenOverlay shapeId={fsNodeId} editor={editor} onClose={() => setFsNodeId(null)} />
      )}

      {/* Всплывающая плашка категории нод */}
      {flyout &&
        (() => {
          const g = NODE_GROUPS.find((x) => x.id === flyout.id)
          if (!g) return null
          const railW = sidebarOpen ? 214 : 56
          const estH = 74 + g.kinds.length * 42 + 12
          const top = Math.max(8, Math.min(flyout.top, window.innerHeight - estH - 12))
          return (
            <div
              className="os-flyout"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: railW + 6,
                top,
                zIndex: 60,
                width: 266,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', gap: 11, padding: '13px 14px' }}>
                <span
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 9,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--panel2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)'
                  }}
                >
                  <GroupIcon id={g.id} size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: `600 13.5px ${SANS}`, color: 'var(--text)' }}>{g.title}</div>
                  <div style={{ font: `400 11px ${SANS}`, color: 'var(--muted)', lineHeight: 1.35, marginTop: 2 }}>
                    {g.subtitle}
                  </div>
                </div>
              </div>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <div style={{ padding: 6 }}>
                {g.kinds.map((kind) => (
                  <div
                    key={kind}
                    className="os-flyout-item"
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', kind)}
                    onClick={() => {
                      addNode(kind, chipTitle(kind))
                      setFlyout(null)
                    }}
                    title={`Перетащите на холст: ${chipTitle(kind)}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '9px 11px',
                      borderRadius: 9,
                      cursor: 'grab',
                      color: 'var(--text)',
                      transition: 'background .12s, transform .05s'
                    }}
                  >
                    <span style={{ width: 22, display: 'grid', placeItems: 'center', color: chipColor(kind) ?? 'var(--muted)' }}>
                      <NodeIcon kind={kind} size={18} />
                    </span>
                    <span style={{ font: `500 13px ${SANS}` }}>{chipTitle(kind)}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

      {ragDrop && <RagDropModal files={ragDrop.files} onClose={() => setRagDrop(null)} onConfirm={handleRagDrop} />}

      {timelineOn && editor && <TimelineDigestPanel editor={editor} boardId={currentBoardId} onToast={showToast} />}

      <Toast text={toast} />
    </div>
  )
}
