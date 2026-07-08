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
}> {
  const running = phase === 'running' && !!url ? await isHealthy(url) : false
  return { phase: running ? 'running' : phase, message, running, url, error: lastError }
}

// Поднять (или переиспользовать) сервер openscience и дождаться готовности.
export async function ensureOpenscience(): Promise<{ ok: boolean; url?: string; error?: string }> {
  const target = `http://localhost:${PORT}`
  // Порт уже отвечает — используем этот сервер (в т.ч. осиротевший процесс прошлой
  // сессии Flow), а не поднимаем второй, который упал бы с «port in use».
  if (await isHealthy(target)) {
    url = target
    setPhase('running', target)
    return { ok: true, url: target }
  }
  if (phase === 'starting') return { ok: false, error: 'Запуск уже идёт' }
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
    let p: ChildProcess
    try {
      p = spawn('openscience serve --port ' + PORT, {
        shell: true,
        cwd: app.getPath('home'),
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
  phase = 'idle'
  url = ''
}
