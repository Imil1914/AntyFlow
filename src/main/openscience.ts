// OpenScience (@synsci/openscience) как встроенный воркспейс.
// openscience serve --port N поднимает headless-сервер, который отдаёт веб-воркспейс
// на http://localhost:N (без TUI и без открытия внешнего браузера). Мы поднимаем его
// один раз на фиксированном порту и показываем внутри ноды через <webview>.
// Онбординг/ключи настраиваются прямо в веб-интерфейсе воркспейса.
import { app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, appendFileSync } from 'fs'

const PORT = 8790
export type OsPhase = 'idle' | 'starting' | 'running' | 'error'
type Progress = { phase: OsPhase; message: string }

let phase: OsPhase = 'idle'
let message = ''
let lastError = ''
let url = ''
let proc: ChildProcess | null = null
let progressCb: ((p: Progress) => void) | null = null
// Рабочая папка запущенного сервера = «проект» openscience (сессии/чаты
// привязаны к worktree=cwd). Нужна, чтобы понять, надо ли перезапускать сервер
// при выборе другой папки проекта в ноде.
let serverCwd = ''

export function onOpensciProgress(cb: (p: Progress) => void): void {
  progressCb = cb
}

function baseDir(): string {
  const d = join(app.getPath('userData'), 'openscience')
  try {
    if (!existsSync(d)) mkdirSync(d, { recursive: true })
  } catch {
    /* ignore */
  }
  return d
}
function logFile(): string {
  return join(baseDir(), 'openscience.log')
}

function setPhase(p: OsPhase, msg = ''): void {
  phase = p
  message = msg
  try {
    appendFileSync(logFile(), `\n=== [${p}] ${msg} ===\n`)
  } catch {
    /* ignore */
  }
  progressCb?.({ phase: p, message: msg })
}
function log(line: string): void {
  try {
    appendFileSync(logFile(), line)
  } catch {
    /* ignore */
  }
}

async function isHealthy(u: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const r = await fetch(u, { signal: ctrl.signal })
    clearTimeout(t)
    return r.ok || r.status < 500
  } catch {
    return false
  }
}

export async function opensciState(): Promise<{
  phase: OsPhase
  message: string
  running: boolean
  url: string
  error: string
  cwd: string
}> {
  const running = phase === 'running' && !!url ? await isHealthy(url) : false
  return { phase: running ? 'running' : phase, message, running, url, error: lastError, cwd: serverCwd }
}

// Поднять (или переиспользовать) сервер openscience в нужной папке-проекте и
// дождаться готовности. cwd задаёт «проект» (сессии привязаны к нему); если сервер
// уже поднят в ДРУГОЙ папке — перезапускаем в запрошенной.
export async function ensureOpenscience(cwd?: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const target = `http://localhost:${PORT}`
  const targetCwd = cwd || app.getPath('home')
  const healthy = await isHealthy(target)
  if (healthy) {
    // Реюзаем, если папка не задана явно или совпадает с текущим проектом сервера.
    if (!cwd || serverCwd === targetCwd) {
      url = target
      if (!serverCwd) serverCwd = targetCwd
      setPhase('running', target)
      return { ok: true, url: target }
    }
    // Нужен другой проект → гасим текущий сервер и ждём освобождения порта.
    setPhase('starting', 'Переключаю проект…')
    stopOpenscience()
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 400))
      if (!(await isHealthy(target))) break
    }
  }
  if (phase === 'starting' && proc) return { ok: false, error: 'Запуск уже идёт' }
  if (proc) {
    try {
      proc.kill()
    } catch {
      /* ignore */
    }
    proc = null
  }

  lastError = ''
  url = ''
  setPhase('starting', 'Поднимаю сервер OpenScience…')

  return new Promise((resolve) => {
    let settled = false
    const done = (r: { ok: boolean; url?: string; error?: string }): void => {
      if (settled) return
      settled = true
      resolve(r)
    }

    // BROWSER=none — на случай, если serve всё же попробует открыть браузер.
    const env = { ...process.env, BROWSER: 'none', CI: '1' }
    serverCwd = targetCwd // «проект» openscience определяется рабочей папкой
    let p: ChildProcess
    try {
      p = spawn('openscience serve --port ' + PORT, {
        shell: true,
        cwd: targetCwd,
        env,
        windowsHide: true
      })
    } catch (e) {
      lastError = String(e)
      setPhase('error', lastError)
      return done({ ok: false, error: lastError })
    }
    proc = p

    const onData = (buf: Buffer): void => {
      const s = buf.toString()
      log(s)
      const last = s.trim().split('\n').pop() || ''
      if (last) setPhase('starting', last.slice(0, 200))
    }
    p.stdout?.on('data', onData)
    p.stderr?.on('data', onData)

    p.on('exit', (code) => {
      log(`\n=== exit code=${code} ===\n`)
      if (proc === p) proc = null
      if (!url) {
        lastError = `openscience serve завершился (код ${code}). Смотри лог: ${logFile()}`
        setPhase('error', lastError)
        done({ ok: false, error: lastError })
      } else {
        phase = 'idle'
        url = ''
      }
    })
    p.on('error', (e) => {
      lastError = `Не удалось запустить openscience: ${e.message}. Установи: npm i -g @synsci/openscience`
      setPhase('error', lastError)
      done({ ok: false, error: lastError })
    })

    // Ждём, пока сервер начнёт отвечать на фиксированном порту.
    void (async () => {
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 1000))
        if (settled && phase === 'error') return
        if (await isHealthy(target)) {
          url = target
          setPhase('running', target)
          return done({ ok: true, url: target })
        }
      }
      if (!url) {
        lastError = 'openscience server не поднялся за 2 минуты. Проверь лог/установку.'
        setPhase('error', lastError)
        done({ ok: false, error: lastError })
      }
    })()
  })
}

export function stopOpenscience(): void {
  if (proc) {
    try {
      // На Windows kill шелла не убивает дочерний openscience.exe — гасим всё дерево,
      // иначе сервер осиротеет и займёт порт при следующем старте.
      if (process.platform === 'win32' && proc.pid) {
        spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { windowsHide: true })
      } else {
        proc.kill()
      }
    } catch {
      /* ignore */
    }
    proc = null
  }
  // Дополнительно освобождаем порт от ЛЮБОГО слушателя (в т.ч. осиротевшего сервера
  // прошлой сессии, который мы не отслеживаем) — иначе рестарт в другой папке-проекте
  // упадёт с «port in use».
  if (process.platform === 'win32') {
    try {
      spawn(
        `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /PID %a /F /T`,
        { shell: true, windowsHide: true }
      )
    } catch {
      /* ignore */
    }
  }
  phase = 'idle'
  url = ''
}
