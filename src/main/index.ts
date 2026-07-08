import { app, BrowserWindow, ipcMain, shell, dialog, Menu, type WebContents } from 'electron'
import { join } from 'path'
import { spawn } from 'child_process'
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'
import { ensureAnything, anyState, stopAnything, onAnyProgress } from './anythingllm'
import { ensureOpenscience, opensciState, stopOpenscience, onOpensciProgress } from './openscience'
import { registerNotebookIpc, stopAllKernels } from './notebook'
import { registerPdfIpc, searchPdf } from './pdf'

registerNotebookIpc()
registerPdfIpc()
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import JSZip from 'jszip'
import { PDFParse } from 'pdf-parse'
import {
  ensureConnected,
  getOpenAITools,
  callTool,
  getMcpConfig,
  saveMcpConfig,
  reconnect,
  mcpStatus,
  type McpServer
} from './mcp'

// Единое хранилище для ВСЕХ способов запуска (dev-лаунчер, ярлык, установленное
// приложение) — чтобы доски и настройки не терялись между версиями.
try {
  app.setPath('userData', join(app.getPath('appData'), 'flow'))
} catch {
  /* до app-ready appData уже доступен; если нет — оставляем дефолт */
}

// --- Провайдеры моделей (локальные и по API) ---
type Provider = {
  id: string
  name: string
  baseURL: string
  apiKey: string
  models: string // список моделей вручную, через запятую (для API без /models)
  enabled: boolean
}
type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

// Провайдеры по умолчанию. baseURL — OpenAI-совместимые эндпоинты.
const DEFAULT_PROVIDERS: Provider[] = [
  { id: 'lmstudio', name: 'LM Studio', baseURL: 'http://127.0.0.1:1234/v1', apiKey: '', models: '', enabled: true },
  { id: 'zai', name: 'Z.ai GLM', baseURL: 'https://api.z.ai/api/paas/v4', apiKey: '', models: 'glm-4.6', enabled: false },
  { id: 'openrouter', name: 'OpenRouter', baseURL: 'https://openrouter.ai/api/v1', apiKey: '', models: '', enabled: false },
  { id: 'cherry', name: 'Cherry AI', baseURL: '', apiKey: '', models: '', enabled: false }
]

function providersPath() {
  return join(app.getPath('userData'), 'providers.json')
}

function getProviders(): Provider[] {
  try {
    const raw = readFileSync(providersPath(), 'utf-8')
    const saved = JSON.parse(raw) as Provider[]
    // Дополняем недостающие дефолтные провайдеры (на случай обновлений)
    const byId = new Map(saved.map((p) => [p.id, p]))
    for (const d of DEFAULT_PROVIDERS) if (!byId.has(d.id)) byId.set(d.id, d)
    return [...byId.values()]
  } catch {
    return DEFAULT_PROVIDERS
  }
}

// --- Общие настройки (модель по умолчанию + автозапуск сервисов) ---
type Settings = {
  defaultModel: string
  autoStart: boolean
  comfyCmd: string // команда запуска ComfyUI (напр. путь к run_nvidia_gpu.bat)
  comfyCwd: string // рабочая папка ComfyUI (необязательно)
  lmsCmd: string // команда запуска LM Studio (напр. "lms server start")
}
const DEFAULT_SETTINGS: Settings = {
  defaultModel: '',
  autoStart: false,
  comfyCmd: '',
  comfyCwd: '',
  lmsCmd: ''
}
function settingsPath() {
  return join(app.getPath('userData'), 'settings.json')
}
function getSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(readFileSync(settingsPath(), 'utf-8')) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}
ipcMain.handle('settings:get', () => getSettings())
// Сохраняем ЧАСТИЧНО — сливаем с текущими, чтобы не терять другие поля
ipcMain.handle('settings:set', (_e, s: Partial<Settings>) => {
  try {
    writeFileSync(settingsPath(), JSON.stringify({ ...getSettings(), ...s }, null, 2), 'utf-8')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

// --- Автозапуск локальных сервисов (ComfyUI, LM Studio) ---
async function isUp(urls: string[]): Promise<boolean> {
  for (const u of urls) {
    try {
      const c = new AbortController()
      const t = setTimeout(() => c.abort(), 1500)
      const r = await fetch(u, { signal: c.signal })
      clearTimeout(t)
      if (r.ok) return true
    } catch {
      /* следующий адрес */
    }
  }
  return false
}
// fetch с таймаутом — чтобы недоступный сервис (например выключенный LM Studio,
// порт которого не отвечает) давал быструю ошибку, а не висел вечно и не крутил
// спиннер в чате бесконечно.
async function fetchT(url: string, opts: RequestInit = {}, ms = 120000): Promise<Response> {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), ms)
  try {
    return await fetch(url, { ...opts, signal: c.signal })
  } finally {
    clearTimeout(t)
  }
}
// Запустить команду в фоне (отвязанно от приложения)
function launchDetached(cmd: string, cwd?: string) {
  if (!cmd || !cmd.trim()) return
  try {
    const p = spawn(cmd, {
      shell: true,
      cwd: cwd && existsSync(cwd) ? cwd : undefined,
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    })
    p.unref()
  } catch {
    /* не критично */
  }
}
// --- OpenCode server (агентный ассистент для кода) ---
// Поднимаем `opencode serve` в директории проекта и проксируем запросы,
// чтобы renderer не упирался в CORS.
let opencodeProc: ReturnType<typeof spawn> | null = null
let opencodePort = 0
let opencodeCwd = ''

async function opencodeHealthy(port: number): Promise<boolean> {
  try {
    const r = await fetchT(`http://127.0.0.1:${port}/global/health`, {}, 1500)
    return r.ok
  } catch {
    return false
  }
}

async function ensureOpencode(cwd: string): Promise<{ ok: boolean; port?: number; error?: string }> {
  const dir = cwd && existsSync(cwd) ? cwd : app.getPath('home')
  if (opencodeProc && opencodePort && opencodeCwd === dir && (await opencodeHealthy(opencodePort))) {
    return { ok: true, port: opencodePort }
  }
  if (opencodeProc) {
    try {
      opencodeProc.kill()
    } catch {
      /* ignore */
    }
    opencodeProc = null
  }
  const port = 4096
  try {
    const p = spawn('opencode', ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
      shell: true,
      cwd: dir,
      stdio: 'ignore',
      windowsHide: true
    })
    opencodeProc = p
    opencodePort = port
    opencodeCwd = dir
    p.on('exit', () => {
      if (opencodeProc === p) {
        opencodeProc = null
        opencodePort = 0
      }
    })
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500))
      if (await opencodeHealthy(port)) return { ok: true, port }
    }
    return { ok: false, error: 'opencode server не поднялся за 20с' }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

ipcMain.handle('opencode:ensure', async (_e, args: { cwd?: string }) => {
  return ensureOpencode(args?.cwd || '')
})

ipcMain.handle('opencode:providers', async (_e, args: { cwd?: string }) => {
  const en = await ensureOpencode(args?.cwd || '')
  if (!en.ok) return { ok: false as const, error: en.error }
  try {
    const r = await fetchT(`http://127.0.0.1:${en.port}/config/providers`, {}, 8000)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await r.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providers = (data.providers || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      models: Object.keys(p.models || {}),
      env: p.env || []
    }))
    return { ok: true as const, providers, defaultModel: data.default || '' }
  } catch (e) {
    return { ok: false as const, error: String(e) }
  }
})

ipcMain.handle('opencode:session', async (_e, args: { cwd?: string; title?: string }) => {
  const en = await ensureOpencode(args?.cwd || '')
  if (!en.ok) return { ok: false as const, error: en.error }
  try {
    const r = await fetchT(
      `http://127.0.0.1:${en.port}/session`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: args?.title || 'Flow OpenCode' })
      },
      10000
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: any = await r.json()
    return { ok: true as const, id: s.id as string, directory: s.directory as string }
  } catch (e) {
    return { ok: false as const, error: String(e) }
  }
})

ipcMain.handle(
  'opencode:message',
  async (_e, args: { cwd?: string; sessionId: string; model?: string; text: string }) => {
    const en = await ensureOpencode(args?.cwd || '')
    if (!en.ok) return { ok: false as const, error: en.error }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { parts: [{ type: 'text', text: args.text }] }
      if (args.model) body.model = args.model
      const r = await fetchT(
        `http://127.0.0.1:${en.port}/session/${args.sessionId}/message`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        },
        300000
      )
      if (!r.ok) {
        const t = await r.text()
        return { ok: false as const, error: `HTTP ${r.status}: ${t.slice(0, 400)}` }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg: any = await r.json()
      const parts = msg.parts || msg.info?.parts || []
      const text = Array.isArray(parts)
        ? parts
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((p: any) => p.type === 'text')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => p.text || '')
            .join('\n')
            .trim()
        : ''
      return { ok: true as const, text: text || '(пустой ответ ассистента)' }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  }
)

ipcMain.handle('opencode:setAuth', async (_e, args: { cwd?: string; provider: string; key: string }) => {
  const en = await ensureOpencode(args?.cwd || '')
  if (!en.ok) return { ok: false as const, error: en.error }
  try {
    const r = await fetchT(
      `http://127.0.0.1:${en.port}/auth/${args.provider}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'api', key: args.key })
      },
      10000
    )
    if (!r.ok) {
      const t = await r.text()
      return { ok: false as const, error: `HTTP ${r.status}: ${t.slice(0, 200)}` }
    }
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: String(e) }
  }
})

// --- Настоящий терминал OpenCode (PTY через node-pty) ---
// Для ноды OpenCode мы поднимаем реальный псевдотерминал и запускаем в нём
// `opencode` TUI — ровно так, как он выглядит в терминале. Renderer рисует его
// через xterm.js. Сессия живёт по id ноды: даже если нода уедет за экран и
// React её размонтирует, процесс и буфер вывода сохраняются, а при возврате
// мы «переигрываем» накопленный вывод в новый xterm.
type PtySession = {
  proc: import('@homebridge/node-pty-prebuilt-multiarch').IPty
  wc: WebContents
  buffer: string
}
const ptySessions = new Map<string, PtySession>()
const PTY_BUFFER_MAX = 256 * 1024 // держим последние ~256КБ вывода для реплея

function ptyShell(): { file: string; args: string[] } {
  if (process.platform === 'win32') return { file: 'cmd.exe', args: [] }
  return { file: process.env.SHELL || '/bin/bash', args: [] }
}

ipcMain.handle(
  'pty:start',
  (
    e,
    args: {
      id: string
      cwd?: string
      cols?: number
      rows?: number
      autostart?: boolean
      autostartCmd?: string
    }
  ) => {
    const id = args.id
    const cols = Math.max(2, args.cols || 80)
    const rows = Math.max(2, args.rows || 24)
    const existing = ptySessions.get(id)
    if (existing) {
      // Нода вернулась в поле зрения — переигрываем накопленный вывод.
      existing.wc = e.sender
      try {
        existing.proc.resize(cols, rows)
      } catch {
        /* ignore */
      }
      if (existing.buffer) e.sender.send('pty:data', { id, data: existing.buffer })
      return { ok: true as const, reused: true }
    }
    const cwd = args.cwd && existsSync(args.cwd) ? args.cwd : app.getPath('home')
    try {
      const sh = ptyShell()
      const proc = pty.spawn(sh.file, sh.args, {
        name: 'xterm-256color',
        cols,
        rows,
        cwd,
        env: { ...process.env, TERM: 'xterm-256color' } as Record<string, string>
      })
      const sess: PtySession = { proc, wc: e.sender, buffer: '' }
      ptySessions.set(id, sess)
      proc.onData((data) => {
        sess.buffer += data
        if (sess.buffer.length > PTY_BUFFER_MAX) sess.buffer = sess.buffer.slice(-PTY_BUFFER_MAX)
        try {
          sess.wc.send('pty:data', { id, data })
        } catch {
          /* окно закрыто */
        }
      })
      proc.onExit(({ exitCode }) => {
        try {
          sess.wc.send('pty:exit', { id, exitCode })
        } catch {
          /* ignore */
        }
        ptySessions.delete(id)
      })
      // Автозапуск команды внутри свежей оболочки (по умолчанию opencode;
      // ноды могут передать свою — например openscience).
      if (args.autostart !== false) {
        const cmd = args.autostartCmd || 'opencode'
        setTimeout(() => {
          try {
            proc.write(cmd + '\r')
          } catch {
            /* ignore */
          }
        }, 250)
      }
      return { ok: true as const, reused: false }
    } catch (err) {
      return { ok: false as const, error: String(err) }
    }
  }
)

ipcMain.on('pty:write', (_e, args: { id: string; data: string }) => {
  const s = ptySessions.get(args.id)
  if (s) {
    try {
      s.proc.write(args.data)
    } catch {
      /* ignore */
    }
  }
})

ipcMain.on('pty:resize', (_e, args: { id: string; cols: number; rows: number }) => {
  const s = ptySessions.get(args.id)
  if (s) {
    try {
      s.proc.resize(Math.max(2, args.cols), Math.max(2, args.rows))
    } catch {
      /* ignore */
    }
  }
})

// Отправить готовую команду в терминал (кнопки тулбара: opencode / auth login).
ipcMain.on('pty:run', (_e, args: { id: string; cmd: string; interrupt?: boolean }) => {
  const s = ptySessions.get(args.id)
  if (!s) return
  try {
    if (args.interrupt) s.proc.write('\x03') // Ctrl-C — выйти из текущего TUI в оболочку
    setTimeout(
      () => {
        try {
          s.proc.write(args.cmd + '\r')
        } catch {
          /* ignore */
        }
      },
      args.interrupt ? 150 : 0
    )
  } catch {
    /* ignore */
  }
})

ipcMain.on('pty:kill', (_e, args: { id: string }) => {
  const s = ptySessions.get(args.id)
  if (s) {
    try {
      s.proc.kill()
    } catch {
      /* ignore */
    }
    ptySessions.delete(args.id)
  }
})

// --- AnythingLLM (управляемый сайдкар) ---
onAnyProgress((p) => {
  for (const w of BrowserWindow.getAllWindows()) {
    try {
      w.webContents.send('anythingllm:progress', p)
    } catch {
      /* ignore */
    }
  }
})
ipcMain.handle('anythingllm:ensure', async () => ensureAnything())
ipcMain.handle('anythingllm:state', async () => anyState())
ipcMain.handle('anythingllm:stop', async () => {
  stopAnything()
  return { ok: true as const }
})

// --- OpenScience (@synsci/openscience — headless-сервер + webview) ---
onOpensciProgress((p) => {
  for (const w of BrowserWindow.getAllWindows()) {
    try {
      w.webContents.send('openscience:progress', p)
    } catch {
      /* ignore */
    }
  }
})
ipcMain.handle('openscience:ensure', async () => ensureOpenscience())
ipcMain.handle('openscience:state', async () => opensciState())
ipcMain.handle('openscience:stop', async () => {
  stopOpenscience()
  return { ok: true as const }
})

// PDF Q&A со стримингом: поиск релевантных чанков строго по pdf_id + запрос к LLM
// с потоковой отдачей токенов в renderer (события pdf:token / pdf:done / pdf:error).
ipcMain.handle(
  'pdf:ask',
  async (
    e,
    args: {
      reqId: string
      model: string
      pdfId: string
      question: string
      queryVector?: number[]
      selection?: string
      imageDataUrl?: string
    }
  ) => {
    const chosen = args.model || getSettings().defaultModel || ''
    const [providerId, ...rest] = chosen.includes('::') ? chosen.split('::') : ['lmstudio', chosen]
    const modelId = rest.join('::') || chosen
    const providers = getProviders()
    const p = providers.find((x) => x.id === providerId) ?? providers.find((x) => x.id === 'lmstudio')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const send = (ch: string, payload: any): void => {
      try {
        e.sender.send(ch, payload)
      } catch {
        /* окно закрыто */
      }
    }
    if (!p || !p.baseURL) {
      send('pdf:error', { reqId: args.reqId, error: 'Провайдер не настроен (проверь ⚙ Настройки)' })
      return { ok: false as const, error: 'Провайдер не настроен' }
    }
    // RAG строго внутри этого PDF
    const ctxChunks = args.queryVector?.length ? searchPdf(args.pdfId, args.queryVector, 5) : []
    const ctx = ctxChunks.map((c) => `[стр. ${c.page}] ${c.text}`).join('\n\n')
    const userText =
      (args.selection ? `Выделенный фрагмент документа:\n"""\n${args.selection}\n"""\n\n` : '') +
      (ctx ? `Дополнительный контекст из этого же PDF:\n${ctx}\n\n` : '') +
      `Вопрос: ${args.question}`
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any = args.imageDataUrl
      ? [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: args.imageDataUrl } }
        ]
      : userText
    const messages = [
      {
        role: 'system',
        content:
          'Ты помогаешь пользователю понять фрагмент PDF-документа. Отвечай по существу, опираясь на ' +
          'выделенный фрагмент и приведённый контекст из того же документа. Если данных не хватает — скажи прямо.'
      },
      { role: 'user', content: userContent }
    ]
    try {
      const r = await fetch(`${p.baseURL}/chat/completions`, {
        method: 'POST',
        headers: authHeaders(p),
        body: JSON.stringify({ model: modelId, messages, stream: true })
      })
      if (!r.ok || !r.body) {
        const t = await r.text().catch(() => '')
        send('pdf:error', { reqId: args.reqId, error: `${p.name}: ошибка ${r.status}: ${t.slice(0, 300)}` })
        return { ok: false as const, error: `HTTP ${r.status}` }
      }
      const reader = (r.body as ReadableStream<Uint8Array>).getReader()
      const dec = new TextDecoder()
      let buf = ''
      let full = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        let nl: number
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const j = JSON.parse(data)
            const delta = j.choices?.[0]?.delta?.content || ''
            if (delta) {
              full += delta
              send('pdf:token', { reqId: args.reqId, delta })
            }
          } catch {
            /* неполный кадр SSE — дождёмся остального */
          }
        }
      }
      send('pdf:done', { reqId: args.reqId, text: full })
      return { ok: true as const, text: full }
    } catch (err) {
      send('pdf:error', { reqId: args.reqId, error: String(err) })
      return { ok: false as const, error: String(err) }
    }
  }
)

ipcMain.handle('dialog:pickFolder', async () => {
  const win = BrowserWindow.getAllWindows()[0]
  const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
  if (res.canceled || !res.filePaths.length) return { ok: false as const }
  return { ok: true as const, path: res.filePaths[0] }
})

app.on('will-quit', () => {
  if (opencodeProc) {
    try {
      opencodeProc.kill()
    } catch {
      /* ignore */
    }
  }
  for (const s of ptySessions.values()) {
    try {
      s.proc.kill()
    } catch {
      /* ignore */
    }
  }
  ptySessions.clear()
  stopAnything()
  stopOpenscience()
  stopAllKernels()
})

const COMFY_URLS = ['http://127.0.0.1:8188/system_stats', 'http://127.0.0.1:8000/system_stats']
const LM_URLS = ['http://127.0.0.1:1234/v1/models']

async function autoStartServices() {
  const s = getSettings()
  if (!s.autoStart) return
  if (s.comfyCmd && !(await isUp(COMFY_URLS))) launchDetached(s.comfyCmd, s.comfyCwd)
  if (s.lmsCmd && !(await isUp(LM_URLS))) launchDetached(s.lmsCmd)
}

ipcMain.handle('services:status', async () => ({
  comfy: await isUp(COMFY_URLS),
  lm: await isUp(LM_URLS)
}))
ipcMain.handle('services:start', async (_e, args: { name: 'comfy' | 'lm' }) => {
  const s = getSettings()
  if (args.name === 'comfy') launchDetached(s.comfyCmd, s.comfyCwd)
  else if (args.name === 'lm') launchDetached(s.lmsCmd)
  return { ok: true }
})

// --- Автозапуск самого Flow при входе в Windows ---
ipcMain.handle('startup:get', () => app.getLoginItemSettings().openAtLogin)
ipcMain.handle('startup:set', (_e, args: { enabled: boolean }) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = { openAtLogin: args.enabled }
    // В dev/лаунчере execPath = electron.exe — передаём путь к приложению аргументом
    if (!app.isPackaged) {
      opts.path = process.execPath
      opts.args = [app.getAppPath()]
    }
    app.setLoginItemSettings(opts)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

function authHeaders(p: Provider): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (p.apiKey) h['Authorization'] = `Bearer ${p.apiKey}`
  return h
}

// Модели провайдера: сначала ручной список, иначе пробуем /models
async function providerModels(p: Provider): Promise<string[]> {
  const manual = p.models.split(',').map((s) => s.trim()).filter(Boolean)
  if (manual.length) return manual
  if (!p.baseURL) return []
  try {
    const r = await fetchT(`${p.baseURL}/models`, { headers: authHeaders(p) }, 8000)
    if (!r.ok) return []
    const j = (await r.json()) as { data?: Array<{ id: string }> }
    return (j.data ?? []).map((m) => m.id).slice(0, 60)
  } catch {
    return []
  }
}

// --- Обработчики ---

ipcMain.handle('providers:list', () => getProviders())

ipcMain.handle('providers:save', (_e, list: Provider[]) => {
  try {
    writeFileSync(providersPath(), JSON.stringify(list, null, 2), 'utf-8')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
})

// Агрегированный список моделей всех включённых провайдеров.
// value = "providerId::modelId", group = имя провайдера.
ipcMain.handle('ai:models', async () => {
  const out: Array<{ value: string; label: string; group: string }> = []
  // Параллельно — иначе один недоступный провайдер задерживает весь список
  const enabled = getProviders().filter((p) => p.enabled)
  const lists = await Promise.all(enabled.map((p) => providerModels(p)))
  enabled.forEach((p, i) => {
    for (const m of lists[i]) out.push({ value: `${p.id}::${m}`, label: m, group: p.name })
  })
  return out
})

// Отправить диалог модели выбранного провайдера
ipcMain.handle(
  'ai:chat',
  async (_e, args: { model: string; messages: ChatMessage[]; images?: string[] }) => {
  // Пустая модель → берём модель по умолчанию из настроек
  const chosen = args.model || getSettings().defaultModel || ''
  // chosen = "providerId::modelId" (или просто modelId → считаем LM Studio)
  const [providerId, ...rest] = chosen.includes('::')
    ? chosen.split('::')
    : ['lmstudio', chosen]
  const modelId = rest.join('::') || chosen
  const providers = getProviders()
  const p = providers.find((x) => x.id === providerId) ?? providers.find((x) => x.id === 'lmstudio')
  if (!p || !p.baseURL) {
    return { ok: false as const, error: 'Провайдер не настроен (проверь ⚙ Настройки)' }
  }
  // Если приложены картинки-референсы — добавляем их в последнее сообщение (vision)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let msgs: any[] = args.messages
  if (args.images?.length) {
    msgs = args.messages.map((m, i) =>
      i === args.messages.length - 1 && m.role === 'user'
        ? {
            role: 'user',
            content: [
              { type: 'text', text: m.content },
              ...args.images!.map((url) => ({ type: 'image_url', image_url: { url } }))
            ]
          }
        : m
    )
  }
  try {
    const r = await fetchT(`${p.baseURL}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(p),
      body: JSON.stringify({ model: modelId, messages: msgs, stream: false })
    })
    if (!r.ok) {
      const t = await r.text()
      return { ok: false as const, error: `${p.name}: ошибка ${r.status}: ${t}` }
    }
    const j = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { total_tokens?: number }
    }
    const content = j.choices?.[0]?.message?.content ?? ''
    const totalTokens = j.usage?.total_tokens ?? 0
    return { ok: true as const, content, totalTokens }
  } catch (e) {
    const timedOut = e instanceof Error && e.name === 'AbortError'
    return {
      ok: false as const,
      error:
        p.id === 'lmstudio'
          ? `Не удалось подключиться к LM Studio (порт 1234 запущен?)${timedOut ? ' — превышено время ожидания' : ''}`
          : timedOut
            ? `${p.name}: превышено время ожидания ответа (модель не ответила вовремя).`
            : `Не удалось подключиться к ${p.name}. Проверь baseURL и ключ в ⚙ Настройках.`
    }
  }
  }
)

// --- MCP: список серверов, сохранение, агентный чат ---
ipcMain.handle('mcp:list', () => mcpStatus())
ipcMain.handle('mcp:save', async (_e, list: McpServer[]) => {
  saveMcpConfig(list)
  reconnect().catch(() => {}) // переподключаемся в фоне
  return { ok: true }
})

// Агентный чат: модель может вызывать инструменты MCP (tool-calling)
ipcMain.handle('ai:agentChat', async (_e, args: { model: string; messages: ChatMessage[] }) => {
  await ensureConnected()
  const tools = getOpenAITools()
  const chosen = args.model || getSettings().defaultModel || ''
  const [providerId, ...rest] = chosen.includes('::') ? chosen.split('::') : ['lmstudio', chosen]
  const modelId = rest.join('::') || chosen
  const providers = getProviders()
  const p = providers.find((x) => x.id === providerId) ?? providers.find((x) => x.id === 'lmstudio')
  if (!p || !p.baseURL) return { ok: false as const, error: 'Провайдер не настроен (⚙ Настройки)' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgs: any[] = [...args.messages]
  let totalTokens = 0
  try {
    for (let step = 0; step < 6; step++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = { model: modelId, messages: msgs, stream: false }
      if (tools.length) {
        body.tools = tools
        body.tool_choice = 'auto'
      }
      const r = await fetchT(`${p.baseURL}/chat/completions`, {
        method: 'POST',
        headers: authHeaders(p),
        body: JSON.stringify(body)
      })
      if (!r.ok) {
        const t = await r.text()
        return { ok: false as const, error: `${p.name}: ошибка ${r.status}: ${t}` }
      }
      const j = (await r.json()) as {
        choices?: Array<{ message?: any }>
        usage?: { total_tokens?: number }
      }
      totalTokens = j.usage?.total_tokens ?? totalTokens
      const msg = j.choices?.[0]?.message
      if (!msg) return { ok: false as const, error: 'Пустой ответ модели' }

      const toolCalls = msg.tool_calls
      if (toolCalls && toolCalls.length) {
        msgs.push(msg) // сообщение ассистента с вызовами инструментов
        for (const tc of toolCalls) {
          let a: unknown = {}
          try {
            a = JSON.parse(tc.function?.arguments || '{}')
          } catch {
            /* ignore */
          }
          const result = await callTool(tc.function?.name, a)
          msgs.push({ role: 'tool', tool_call_id: tc.id, content: result })
        }
        continue // ещё один проход — модель увидит результаты инструментов
      }
      return { ok: true as const, content: msg.content ?? '', totalTokens }
    }
    return { ok: true as const, content: '(достигнут лимит шагов инструментов)', totalTokens }
  } catch (e) {
    return { ok: false as const, error: String(e) }
  }
})

// --- Веб-поиск (DuckDuckGo, без API-ключа) ---
function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

// Раскодировать ссылку-редирект DuckDuckGo (//duckduckgo.com/l/?uddg=...)
function decodeDDG(href: string): string {
  const m = href.match(/[?&]uddg=([^&]+)/)
  if (m) {
    try {
      return decodeURIComponent(m[1])
    } catch {
      return m[1]
    }
  }
  return href.startsWith('//') ? 'https:' + href : href
}

ipcMain.handle('web:search', async (_e, args: { query: string }) => {
  try {
    const url = 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(args.query)
    const r = await fetchT(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, 15000)
    if (!r.ok) return { ok: false as const, error: `Ошибка поиска ${r.status}` }
    const html = await r.text()
    const linkRe = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g
    const snipRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g
    const links: Array<{ url: string; title: string }> = []
    let m: RegExpExecArray | null
    while ((m = linkRe.exec(html)) && links.length < 8) {
      links.push({ url: decodeDDG(m[1].replace(/&amp;/g, '&')), title: stripTags(m[2]) })
    }
    const snippets: string[] = []
    let s: RegExpExecArray | null
    while ((s = snipRe.exec(html)) && snippets.length < 8) snippets.push(stripTags(s[1]))
    const results = links.map((t, i) => ({ ...t, snippet: snippets[i] ?? '' }))
    return { ok: true as const, results }
  } catch {
    return { ok: false as const, error: 'Нет доступа к интернету или DuckDuckGo недоступен' }
  }
})

// Сохранить файл (base64) через системный диалог
ipcMain.handle('file:save', async (_e, args: { base64: string; name: string }) => {
  try {
    const res = await dialog.showSaveDialog({ defaultPath: args.name })
    if (res.canceled || !res.filePath) return { ok: false as const, error: 'Отменено' }
    writeFileSync(res.filePath, Buffer.from(args.base64, 'base64'))
    shell.showItemInFolder(res.filePath)
    return { ok: true as const, path: res.filePath }
  } catch (e) {
    return { ok: false as const, error: String(e) }
  }
})

// --- Извлечение текста из PDF / DOCX / PPTX (для вложений в ИИ-ноду) ---
function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
}
// Текст из OOXML: параграфы <w:p>/<a:p>, текстовые прогоны <w:t>/<a:t>
function ooxmlText(xml: string): string {
  const out: string[] = []
  for (const p of xml.split(/<\/(?:w:p|a:p)>/)) {
    const runs = [...p.matchAll(/<(?:w:t|a:t)[^>]*>([\s\S]*?)<\/(?:w:t|a:t)>/g)].map((m) => decodeXmlEntities(m[1]))
    const line = runs.join('')
    if (line.trim()) out.push(line)
  }
  return out.join('\n')
}

ipcMain.handle('file:extractText', async (_e, args: { base64: string; name: string }) => {
  try {
    const buf = Buffer.from(args.base64, 'base64')
    const ext = (args.name.split('.').pop() || '').toLowerCase()
    let text = ''
    if (ext === 'pdf') {
      const parser = new PDFParse({ data: buf })
      const res = await parser.getText()
      text = res.text || ''
      await parser.destroy()
    } else if (ext === 'docx') {
      const zip = await JSZip.loadAsync(buf)
      const f = zip.file('word/document.xml')
      text = f ? ooxmlText(await f.async('string')) : ''
    } else if (ext === 'pptx') {
      const zip = await JSZip.loadAsync(buf)
      const slides = Object.keys(zip.files)
        .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => parseInt(a.match(/(\d+)/)![1], 10) - parseInt(b.match(/(\d+)/)![1], 10))
      const parts: string[] = []
      for (let i = 0; i < slides.length; i++) {
        const t = ooxmlText(await zip.file(slides[i])!.async('string'))
        if (t.trim()) parts.push(`Слайд ${i + 1}:\n${t}`)
      }
      text = parts.join('\n\n')
    } else {
      return { ok: false as const, error: 'Поддерживаются PDF, DOCX, PPTX' }
    }
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 80000)
    if (!text) {
      return { ok: false as const, error: 'Текст не найден (возможно, это скан-картинка без текста)' }
    }
    return { ok: true as const, text }
  } catch (e) {
    return { ok: false as const, error: 'Не удалось прочитать файл: ' + String(e) }
  }
})

// Открыть ссылку во внешнем браузере
ipcMain.handle('shell:open', (_e, args: { url: string }) => {
  try {
    shell.openExternal(args.url)
  } catch {
    /* ignore */
  }
  return { ok: true }
})

// --- Генерация картинок через ComfyUI (локальный сервер) ---
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Авто-определение адреса ComfyUI (портативная версия — 8188, Desktop — 8000)
let comfyBase = ''
async function getComfy(): Promise<string> {
  if (comfyBase) return comfyBase
  for (const b of ['http://127.0.0.1:8188', 'http://127.0.0.1:8000']) {
    try {
      const r = await fetch(`${b}/system_stats`)
      if (r.ok) {
        comfyBase = b
        return b
      }
    } catch {
      /* пробуем следующий */
    }
  }
  return 'http://127.0.0.1:8188'
}

// Получить список значений поля ноды из ComfyUI (например список моделей)
async function comfyList(base: string, node: string, field: string): Promise<string[]> {
  try {
    const r = await fetch(`${base}/object_info/${node}`)
    if (!r.ok) return []
    const j = (await r.json()) as any
    return j?.[node]?.input?.required?.[field]?.[0] ?? []
  } catch {
    return []
  }
}

// Списки моделей ComfyUI: чекпоинты (SDXL), unet (FLUX), clip, vae
ipcMain.handle('comfy:models', async () => {
  try {
    const base = await getComfy()
    const [checkpoints, unets, clips, vaes] = await Promise.all([
      comfyList(base, 'CheckpointLoaderSimple', 'ckpt_name'),
      comfyList(base, 'UNETLoader', 'unet_name'),
      comfyList(base, 'DualCLIPLoader', 'clip_name1'),
      comfyList(base, 'VAELoader', 'vae_name')
    ])
    return { ok: true as const, checkpoints, unets, clips, vaes }
  } catch {
    return { ok: false as const, error: 'ComfyUI не запущен (порт 8188/8000)' }
  }
})

// text-to-image воркфлоу ComfyUI (API-формат). Разный для FLUX и SDXL.
function buildImageWorkflow(a: {
  checkpoint: string
  prompt: string
  negative: string
  width: number
  height: number
  steps: number
  seed: number
  modelType: string
  clipL?: string
  t5?: string
  vae?: string
}) {
  if (a.modelType === 'flux') {
    // FLUX: отдельные загрузчики (UNET + двойной CLIP + VAE), cfg=1, 16-кан. латент
    return {
      '12': { class_type: 'UNETLoader', inputs: { unet_name: a.checkpoint, weight_dtype: 'default' } },
      '10': {
        class_type: 'DualCLIPLoader',
        inputs: { clip_name1: a.clipL, clip_name2: a.t5, type: 'flux' }
      },
      '11': { class_type: 'VAELoader', inputs: { vae_name: a.vae } },
      '6': { class_type: 'CLIPTextEncode', inputs: { text: a.prompt, clip: ['10', 0] } },
      '35': { class_type: 'FluxGuidance', inputs: { guidance: 3.5, conditioning: ['6', 0] } },
      '7': { class_type: 'CLIPTextEncode', inputs: { text: a.negative, clip: ['10', 0] } },
      '5': {
        class_type: 'EmptySD3LatentImage',
        inputs: { width: a.width, height: a.height, batch_size: 1 }
      },
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: a.seed,
          steps: a.steps,
          cfg: 1,
          sampler_name: 'euler',
          scheduler: 'simple',
          denoise: 1,
          model: ['12', 0],
          positive: ['35', 0],
          negative: ['7', 0],
          latent_image: ['5', 0]
        }
      },
      '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['11', 0] } },
      '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'flow', images: ['8', 0] } }
    }
  }
  // SDXL / SD1.5: классический воркфлоу
  return {
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed: a.seed,
        steps: a.steps,
        cfg: 7,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0]
      }
    },
    '4': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: a.checkpoint } },
    '5': { class_type: 'EmptyLatentImage', inputs: { width: a.width, height: a.height, batch_size: 1 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { text: a.prompt, clip: ['4', 1] } },
    '7': { class_type: 'CLIPTextEncode', inputs: { text: a.negative, clip: ['4', 1] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['4', 2] } },
    '9': { class_type: 'SaveImage', inputs: { filename_prefix: 'flow', images: ['8', 0] } }
  }
}

ipcMain.handle(
  'comfy:generate',
  async (
    _e,
    a: {
      checkpoint: string
      prompt: string
      negative: string
      width: number
      height: number
      steps: number
      modelType: string
    }
  ) => {
    try {
      const COMFY = await getComfy()
      const seed = Math.floor(Math.random() * 1e15)

      // Для FLUX подбираем текст-энкодеры и VAE из установленных файлов
      let clipL: string | undefined
      let t5: string | undefined
      let vae: string | undefined
      if (a.modelType === 'flux') {
        const clips = await comfyList(COMFY, 'DualCLIPLoader', 'clip_name1')
        const vaes = await comfyList(COMFY, 'VAELoader', 'vae_name')
        clipL = clips.find((c) => /clip_l/i.test(c))
        t5 = clips.find((c) => /t5/i.test(c))
        vae = vaes.find((v) => /ae|flux/i.test(v)) ?? vaes[0]
        const missing: string[] = []
        if (!clipL) missing.push('• clip_l.safetensors → папка models/clip')
        if (!t5) missing.push('• t5xxl_fp8_e4m3fn.safetensors → папка models/clip')
        if (!vae) missing.push('• ae.safetensors → папка models/vae')
        if (missing.length) {
          return {
            ok: false as const,
            error: 'Для FLUX не хватает файлов:\n' + missing.join('\n')
          }
        }
      }

      const wf = buildImageWorkflow({ ...a, seed, clipL, t5, vae })
      const pr = await fetch(`${COMFY}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wf, client_id: 'flow' })
      })
      if (!pr.ok) {
        const t = await pr.text()
        return { ok: false as const, error: `ComfyUI: ${pr.status} ${t.slice(0, 300)}` }
      }
      const { prompt_id } = (await pr.json()) as { prompt_id: string }
      // Ждём готовности картинки (до ~3 минут)
      for (let i = 0; i < 120; i++) {
        await sleep(1500)
        const hr = await fetch(`${COMFY}/history/${prompt_id}`)
        if (!hr.ok) continue
        const h = (await hr.json()) as any
        const entry = h[prompt_id]
        if (entry?.outputs) {
          for (const nodeId of Object.keys(entry.outputs)) {
            const imgs = entry.outputs[nodeId].images
            if (imgs && imgs.length) {
              const im = imgs[0]
              const vr = await fetch(
                `${COMFY}/view?filename=${encodeURIComponent(im.filename)}&subfolder=${encodeURIComponent(im.subfolder || '')}&type=${encodeURIComponent(im.type || 'output')}`
              )
              const buf = Buffer.from(await vr.arrayBuffer())
              return { ok: true as const, image: 'data:image/png;base64,' + buf.toString('base64') }
            }
          }
        }
      }
      return { ok: false as const, error: 'Истекло время ожидания генерации' }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  }
)

// --- Запуск Python-кода ---
// Команда Python (на Windows обычно 'python', на др. системах 'python3')
const PYTHON = process.platform === 'win32' ? 'python' : 'python3'

// Обёртка: выполняет код пользователя, ловит stdout/stderr,
// сохраняет графики matplotlib в PNG и пишет всё в result.json
const PY_WRAPPER = `
import os, sys, io, json, glob, base64, contextlib, traceback
workdir = sys.argv[1]
userfile = sys.argv[2]
os.chdir(workdir)
os.environ.setdefault('MPLBACKEND', 'Agg')
result = {'stdout': '', 'images': []}
buf = io.StringIO()
try:
    with open(userfile, 'r', encoding='utf-8') as f:
        src = f.read()
    g = {'__name__': '__main__'}
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        exec(compile(src, '<flow>', 'exec'), g)
except SystemExit:
    pass
except Exception:
    buf.write('\\n' + traceback.format_exc())
result['stdout'] = buf.getvalue()
try:
    if 'matplotlib.pyplot' in sys.modules:
        plt = sys.modules['matplotlib.pyplot']
        for num in plt.get_fignums():
            p = os.path.join(workdir, '_flow_fig_%d.png' % num)
            plt.figure(num).savefig(p, dpi=110, bbox_inches='tight')
except Exception:
    pass
for p in sorted(glob.glob(os.path.join(workdir, '_flow_fig_*.png'))):
    try:
        with open(p, 'rb') as f:
            result['images'].append('data:image/png;base64,' + base64.b64encode(f.read()).decode())
    except Exception:
        pass
with open(os.path.join(workdir, 'result.json'), 'w', encoding='utf-8') as f:
    json.dump(result, f)
`

// Реестр запущенных процессов по id ноды (чтобы можно было остановить)
const runningProcs = new Map<string, ReturnType<typeof spawn>>()

// Остановить процесс ноды (вызывается при удалении квадрата с кодом)
ipcMain.handle('code:kill', (_e, args: { id: string }) => {
  const p = runningProcs.get(args.id)
  if (p) {
    try {
      p.kill()
    } catch {
      /* ignore */
    }
    runningProcs.delete(args.id)
  }
  return { ok: true }
})

ipcMain.handle('code:run', async (_e, args: { id: string; code: string }) => {
  let dir = ''
  try {
    dir = mkdtempSync(join(tmpdir(), 'flow-code-'))
    writeFileSync(join(dir, 'wrapper.py'), PY_WRAPPER, 'utf-8')
    writeFileSync(join(dir, 'user.py'), args.code ?? '', 'utf-8')

    const result = await new Promise<unknown>((resolve) => {
      const proc = spawn(PYTHON, ['wrapper.py', dir, join(dir, 'user.py')], {
        cwd: dir,
        env: { ...process.env, MPLBACKEND: 'Agg', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' }
      })
      runningProcs.set(args.id, proc)
      let stderr = ''
      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        proc.kill()
      }, 120000)
      proc.stderr.on('data', (d) => (stderr += d.toString()))
      proc.on('error', (e) => {
        clearTimeout(timer)
        runningProcs.delete(args.id)
        resolve({
          ok: false,
          error:
            'Не удалось запустить Python. Убедись, что Python установлен и доступен командой "python".\n' +
            e.message
        })
      })
      proc.on('close', (_code, signal) => {
        clearTimeout(timer)
        runningProcs.delete(args.id)
        if (timedOut) {
          resolve({ ok: false, error: 'Превышено время выполнения (120 с)' })
          return
        }
        // Убит сигналом (удалили квадрат) — молча останавливаемся
        if (signal) {
          resolve({ ok: false, error: '', killed: true })
          return
        }
        try {
          const rp = join(dir, 'result.json')
          if (existsSync(rp)) {
            const r = JSON.parse(readFileSync(rp, 'utf-8')) as {
              stdout?: string
              images?: string[]
            }
            resolve({ ok: true, stdout: r.stdout ?? '', images: r.images ?? [] })
          } else {
            resolve({ ok: false, error: stderr || 'Python не вернул результат' })
          }
        } catch (e) {
          resolve({ ok: false, error: String(e) })
        }
      })
    })
    return result
  } catch (e) {
    return { ok: false, error: String(e) }
  } finally {
    try {
      if (dir) rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
})

// Создаём главное окно приложения
function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Flow',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true // нужно для встраивания UI AnythingLLM (<webview>)
    }
  })

  // В режиме разработки грузим из dev-сервера (с горячей перезагрузкой),
  // в собранном приложении — из готового HTML-файла.
  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    // DEV: зеркалим консоль окна в терминал, чтобы видеть ошибки/логи рендерера
    win.webContents.on('console-message', (_e, level, message) => {
      if (message.includes('[whisper]') || level >= 2) {
        console.log(`[renderer] ${message}`)
      }
    })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Один экземпляр приложения: повторный запуск (двойной клик по иконке)
// не плодит окна и не ломает хранилище — просто фокусирует уже открытое окно.
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0]
    if (w) {
      if (w.isMinimized()) w.restore()
      w.focus()
    }
  })

  // Electron готов — открываем окно
  app.whenReady().then(() => {
    // Убираем стандартное меню: его акселераторы (Ctrl+C/V/X/Z/A — роли copy/paste/
    // undo…) перехватывали сочетания до нашего кода. Chromium сам обрабатывает
    // копирование/вставку/отмену в текстовых полях, так что ввод текста не страдает.
    Menu.setApplicationMenu(null)
    createWindow()
    // Подключаем MCP-серверы в фоне, чтобы инструменты были готовы
    ensureConnected().catch(() => {})
    // Автозапуск ComfyUI / LM Studio, если включён и они ещё не подняты
    autoStartServices().catch(() => {})

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

// Закрыли все окна — выходим (кроме macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
