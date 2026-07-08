import {
  Tldraw,
  createShapeId,
  useEditor,
  useValue,
  getSnapshot,
  loadSnapshot,
  type Editor,
  type TLComponents
} from 'tldraw'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlowNodeShapeUtil, NodeFullscreenOverlay, type FlowNodeShape } from './shapes/FlowNodeShapeUtil'
import { DESIGN_CSS } from './slides/design'
import SlideEditor from './slides/SlideEditor'
import { OS_CSS, themeVars, THEME_ORDER, THEME_SWATCH, type ThemeName } from './os/theme'
import { IconFiles, IconGraph, IconAgents, IconGen, IconSettings } from './os/icons'
import { NodeIcon } from './os/nodeIcons'
import {
  Toast,
  CmdK,
  RagModal,
  GraphOverlay,
  AgentsStudio,
  GenStudio,
  MobileView,
  type Command
} from './os/overlays'

const customShapeUtils = [FlowNodeShapeUtil]

const SANS = "'IBM Plex Sans', -apple-system, 'Segoe UI', system-ui, sans-serif"
const MONO = "'JetBrains Mono', monospace"

// --- Доски (каждая — свой ключ персиста tldraw) ---
type Board = { id: string; name: string; key: string }
const BOARDS_LS = 'flow-boards'
const CURRENT_LS = 'flow-current-board'
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
  { kind: 'notebook', title: 'Jupyter-ноутбук', label: 'Jp', color: 'var(--c-code)' }
]

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
  slide: 'var(--muted)'
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
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-note)' }} />
        Llama 3.1 70B · локально
      </span>
      {sep}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        VRAM 18.4/24 ГБ
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
          <span style={{ display: 'block', width: '77%', height: '100%', background: 'var(--accent)' }} />
        </span>
      </span>
      {sep}
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-note)' }} />
        ComfyUI · ожидание
      </span>
      <div style={{ flex: 1 }} />
      <span>{Math.round(zoom * 100)}%</span>
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
    await window.flow.saveSettings({ defaultModel, autoStart, comfyCmd, comfyCwd, lmsCmd })
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
    kind === 'notebook'
      ? 600
      : kind === 'pdf'
      ? 620
      : kind === 'openscience'
      ? 460
      : kind === 'anythingllm'
      ? 460
      : kind === 'diagram'
      ? 380
      : kind === 'ai' || kind === 'search' || kind === 'image' || kind === 'deck' || kind === 'opencode'
        ? 340
        : kind === 'code'
          ? 240
          : 180
  const w =
    kind === 'notebook'
      ? 640
      : kind === 'openscience'
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
    kind === 'anythingllm'
      ? 320
      : kind === 'ref'
        ? 240
        : 280
  return { w, h }
}

export default function App() {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [theme, setTheme] = useState<ThemeName>('Графит')
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

  useEffect(() => {
    localStorage.setItem(BOARDS_LS, JSON.stringify(boards))
  }, [boards])
  useEffect(() => {
    localStorage.setItem(CURRENT_LS, currentBoardId)
  }, [currentBoardId])

  const newBoard = () => {
    const id = 'b' + Date.now().toString(36)
    const b: Board = { id, name: `Доска ${boards.length + 1}`, key: 'flow-board-' + id }
    setBoards((x) => [...x, b])
    setCurrentBoardId(id)
    setBoardMenu(false)
  }
  const renameBoard = (name: string) =>
    setBoards((x) => x.map((b) => (b.id === currentBoardId ? { ...b, name } : b)))
  const deleteBoard = () => {
    if (boards.length <= 1) return
    const rest = boards.filter((b) => b.id !== currentBoardId)
    setBoards(rest)
    setCurrentBoardId(rest[0].id)
    setBoardMenu(false)
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
  const [ragOpen, setRagOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const [genOpen, setGenOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
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

  // Создание ноды из файла, брошенного на холст (фото → ref, PDF/Word/PPTX/текст → doc)
  const addFileNode = useCallback(
    (file: File, screenPt: { x: number; y: number }, idx: number) => {
      if (!editor) return
      const IMG = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|ico|tiff?)$/i
      const PDF = /\.pdf$/i
      const DOCX = /\.(docx|pptx)$/i
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
            if (imp.ok) mkNode('pdf', { extra: JSON.stringify({ pdfId: id, name: file.name }) }, file.name)
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
      } else {
        r.onload = () => mkNode('doc', { body: String(r.result || '').slice(0, 40000) }, file.name)
        r.readAsText(file)
      }
    },
    [editor]
  )

  const dropFiles = useCallback(
    (files: FileList, screenPt: { x: number; y: number }) => {
      Array.from(files).forEach((f, i) => addFileNode(f, screenPt, i))
    },
    [addFileNode]
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
      { label: 'Приблизить к ноде · 100% (Shift+F)', hint: 'вид', run: () => zoomToSelectedNode() }
    ],
    [addNode, zoomToSelectedNode]
  )

  // Оставляем инструменты рисования tldraw («фигма»-панель снизу + панель стилей справа),
  // прячем только дублирующую навигацию/меню — свою обвязку рисуем сами.
  const components: TLComponents = useMemo(
    () =>
      ({
        Background: DotGridBackground,
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
    []
  )

  // Иконка вкладки сайдбара
  const tabBtn = (
    title: string,
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode
  ) => (
    <button
      className="os-btn os-tab"
      title={title}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        border: 'none',
        borderRadius: 8,
        background: active ? 'var(--accent-dim)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--muted)',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      {icon}
    </button>
  )

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
        {/* Сайдбар */}
        <div
          className="os-scroll"
          style={{
            width: 52,
            flex: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            padding: '10px 0',
            background: 'var(--panel)',
            borderRight: '1px solid var(--border)',
            overflowY: 'auto',
            zIndex: 20
          }}
        >
          <div
            title="Персональная ОС"
            style={{
              width: 26,
              height: 26,
              marginBottom: 8,
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
          </div>
          {tabBtn('Файлы', true, () => showToast('Панель «Файлы» — скоро'), <IconFiles />)}
          {tabBtn('Граф знаний', false, () => setGraphOpen(true), <IconGraph />)}
          {tabBtn('Агенты', false, () => setAgentsOpen(true), <IconAgents />)}
          {tabBtn('Генеративная студия', false, () => setGenOpen(true), <IconGen />)}
          {tabBtn('Настройки', false, () => setSettingsOpen(true), <IconSettings />)}
          <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <div style={{ font: `500 8.5px ${MONO}`, color: 'var(--muted)', letterSpacing: '.06em' }}>НОДЫ</div>
          {SIDEBAR_CHIPS.map((c) => (
            <div
              key={c.kind}
              className="os-chip"
              title={`Перетащите на холст: ${c.title}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', c.kind)}
              onClick={() => addNode(c.kind, c.title)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: 'var(--panel2)',
                border: '1px dashed var(--border)',
                display: 'grid',
                placeItems: 'center',
                color: c.color
              }}
            >
              <NodeIcon kind={c.kind} size={17} />
            </div>
          ))}
        </div>

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
          <Tldraw
            key={board.key}
            persistenceKey={board.key}
            shapeUtils={customShapeUtils}
            components={components}
            cameraOptions={{ wheelBehavior: 'zoom' }}
            onMount={(ed) => {
              setEditor(ed)
              try {
                ed.user.updateUserPreferences({ colorScheme: 'dark' })
              } catch {
                /* не критично */
              }
              try {
                ed.sideEffects.registerAfterDeleteHandler('shape', (rec) => {
                  const r = rec as unknown as { type?: string; id?: string; props?: { kind?: string } }
                  if (r?.type === 'flow-node' && r?.props?.kind === 'codeblock' && r.id) {
                    window.flow?.killCode({ id: r.id })
                  }
                })
              } catch {
                /* не критично */
              }
            }}
          />

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

          {/* Верхние кнопки */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{ position: 'absolute', top: 12, right: 14, display: 'flex', gap: 8, zIndex: 10 }}
          >
            <button
              className="os-btn os-topbtn"
              onClick={() => setMobileOpen(true)}
              title="Мобильный вид через Tailscale"
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 12px',
                font: `500 11.5px ${SANS}`,
                color: 'var(--muted)'
              }}
            >
              Туннель
            </button>
            <button
              className="os-btn os-topbtn"
              onClick={() => setRagOpen(true)}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 12px',
                font: `500 11.5px ${SANS}`,
                color: 'var(--text)'
              }}
            >
              + RAG-проект
            </button>
            <button
              className="os-btn os-topbtn"
              onClick={() => setCmdkOpen(true)}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 12px',
                font: `500 11.5px ${MONO}`,
                color: 'var(--muted)'
              }}
            >
              ⌘K
            </button>
          </div>

          <OSMinimap editor={editor} />
        </div>
      </div>

      {/* Статус-бар */}
      <StatusBar editor={editor} theme={theme} setTheme={setTheme} />

      {/* Оверлеи */}
      <CmdK open={cmdkOpen} onClose={() => setCmdkOpen(false)} commands={commands} />
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

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {editSlideId && editor && (
        <SlideEditor editor={editor} slideId={editSlideId} onClose={() => setEditSlideId(null)} />
      )}
      {fsNodeId && editor && (
        <NodeFullscreenOverlay shapeId={fsNodeId} editor={editor} onClose={() => setFsNodeId(null)} />
      )}

      <Toast text={toast} />
    </div>
  )
}
