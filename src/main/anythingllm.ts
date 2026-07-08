// AnythingLLM как управляемый сайдкар.
// Flow сам клонирует и поднимает сервер AnythingLLM (без Docker) отдельными
// Node-процессами: server (:3001) + collector (:8888). Первый запуск тяжёлый
// (clone + npm install + сборка фронта), дальше — просто старт процессов.
// Нативные зависимости AnythingLLM (LanceDB, sharp, onnxruntime) на N-API,
// поэтому системный Node подходит без пересборки под конкретную версию.
import { app } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, appendFileSync, createWriteStream } from 'fs'

const REPO = 'https://github.com/Mintplex-Labs/anything-llm.git'
// Пиновый стабильный релиз: master бывает нестабилен (ловили краш zod/v3 из MCP SDK).
const TAG = 'v1.15.0'
export const ANY_PORT = 3001
const COLLECTOR_PORT = 8888

export type AnyPhase =
  | 'idle'
  | 'cloning'
  | 'installing'
  | 'building'
  | 'migrating'
  | 'starting'
  | 'running'
  | 'error'

type Progress = { phase: AnyPhase; message: string }

let phase: AnyPhase = 'idle'
let message = ''
let lastError = ''
let busy = false
let serverProc: ChildProcess | null = null
let collectorProc: ChildProcess | null = null
let progressCb: ((p: Progress) => void) | null = null

export function onAnyProgress(cb: (p: Progress) => void): void {
  progressCb = cb
}

function baseDir(): string {
  return join(app.getPath('userData'), 'anythingllm')
}
function repoDir(): string {
  return join(baseDir(), 'repo')
}
function storageDir(): string {
  return join(repoDir(), 'server', 'storage')
}
function logFile(): string {
  return join(baseDir(), 'install.log')
}

function setPhase(p: AnyPhase, msg = ''): void {
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

// Признак «установлено»: репозиторий склонирован, зависимости сервера стоят,
// фронт собран в server/public.
function isInstalled(): boolean {
  return (
    existsSync(join(repoDir(), 'server', 'node_modules')) &&
    existsSync(join(repoDir(), 'server', 'public', 'index.html')) &&
    existsSync(join(repoDir(), 'collector', 'node_modules'))
  )
}

async function isServerHealthy(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    const r = await fetch(`http://localhost:${ANY_PORT}/api/ping`, { signal: ctrl.signal })
    clearTimeout(t)
    return r.ok
  } catch {
    return false
  }
}

// collector жив, если порт 8888 вообще отвечает (любой HTTP-ответ, даже 404).
async function isCollectorHealthy(): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2000)
    await fetch(`http://localhost:${COLLECTOR_PORT}/`, { signal: ctrl.signal })
    clearTimeout(t)
    return true
  } catch {
    return false
  }
}

export async function anyState(): Promise<{
  phase: AnyPhase
  message: string
  installed: boolean
  running: boolean
  port: number
  error: string
}> {
  const running = phase === 'running' ? await isServerHealthy() : false
  return {
    phase: running ? 'running' : phase,
    message,
    installed: isInstalled(),
    running,
    port: ANY_PORT,
    error: lastError
  }
}

// Выполнить команду, стримя вывод в install.log. Отклоняется при ненулевом коде.
// shell:true нужен для запуска npm/npx (.cmd) через PATH, поэтому аргументы с
// пробелами (путь userData содержит «Имиль Ермолов») экранируем кавычками вручную —
// иначе командная строка cmd.exe разъедется.
function runStep(cmd: string, args: string[], cwd: string, env?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const quote = (s: string) => (/\s/.test(s) && !/^".*"$/.test(s) ? `"${s}"` : s)
    const safeArgs = args.map(quote)
    log(`\n$ ${cmd} ${safeArgs.join(' ')}   (cwd=${cwd})\n`)
    const p = spawn(cmd, safeArgs, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, ...env }
    })
    const stream = createWriteStream(logFile(), { flags: 'a' })
    p.stdout?.pipe(stream)
    p.stderr?.pipe(stream)
    p.on('error', reject)
    p.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args[0] || ''} завершился с кодом ${code}`))
    })
  })
}

// AnythingLLM собирается yarn'ом (его yarn.lock — источник истины; npm подбирает
// иные версии и ломает дерево, напр. zod). yarn ставим локально в tools/ и зовём
// через node bin/yarn.js — без глобальных изменений и corepack.
function toolsDir(): string {
  return join(baseDir(), 'tools')
}
function yarnJs(): string {
  return join(toolsDir(), 'node_modules', 'yarn', 'bin', 'yarn.js')
}
async function ensureYarn(): Promise<string> {
  const js = yarnJs()
  if (existsSync(js)) return js
  mkdirSync(toolsDir(), { recursive: true })
  writeFileSync(join(toolsDir(), 'package.json'), '{"private":true}\n')
  setPhase('installing', 'Готовлю пакетный менеджер (yarn)…')
  await runStep('npm', ['install', 'yarn@1.22.22', '--no-audit', '--no-fund'], toolsDir())
  return js
}

// Полная установка AnythingLLM с нуля.
async function install(): Promise<void> {
  mkdirSync(baseDir(), { recursive: true })
  try {
    writeFileSync(logFile(), `AnythingLLM install log — ${new Date().toISOString()}\n`)
  } catch {
    /* ignore */
  }

  // 1. Клонирование (если репо ещё нет)
  if (!existsSync(join(repoDir(), 'package.json'))) {
    setPhase('cloning', 'Скачиваю AnythingLLM…')
    try {
      rmSync(repoDir(), { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    // core.longpaths=true — иначе на Windows checkout падает на длинных путях AnythingLLM.
    // --branch TAG — пиновый стабильный релиз.
    await runStep(
      'git',
      ['-c', 'core.longpaths=true', 'clone', '--depth', '1', '--branch', TAG, REPO, 'repo'],
      baseDir()
    )
  }

  // 2. Установка зависимостей yarn'ом (frozen-lockfile — точное дерево из yarn.lock).
  const yarn = await ensureYarn()
  const yarnInstall = (cwd: string) => runStep('node', [yarn, 'install', '--frozen-lockfile'], cwd)
  setPhase('installing', 'Ставлю зависимости сервера… (это долго, ~несколько минут)')
  await yarnInstall(join(repoDir(), 'server'))
  setPhase('installing', 'Ставлю зависимости collector…')
  await yarnInstall(join(repoDir(), 'collector'))
  setPhase('installing', 'Ставлю зависимости фронтенда…')
  await yarnInstall(join(repoDir(), 'frontend'))

  // 3. ENV-файлы. ВАЖНО: server/.env НЕ перезатираем целиком — AnythingLLM хранит там
  // выбор LLM, ключи (LLM_PROVIDER, *_API_KEY, *_MODEL_PREF) и подписи сессий
  // (SIG_KEY/SIG_SALT). Мержим: сохраняем всё существующее, лишь гарантируем
  // STORAGE_DIR и SERVER_PORT. Иначе повторный install() стирал настройки юзера.
  mkdirSync(storageDir(), { recursive: true })
  const serverEnvPath = join(repoDir(), 'server', '.env')
  const setEnv = (src: string, key: string, val: string): string => {
    const line = `${key}=${val}`
    const re = new RegExp(`^${key}=.*$`, 'm')
    return re.test(src) ? src.replace(re, line) : `${src.replace(/\s*$/, '')}\n${line}\n`.replace(/^\n+/, '')
  }
  let serverEnv = existsSync(serverEnvPath) ? readFileSync(serverEnvPath, 'utf-8') : ''
  serverEnv = setEnv(serverEnv, 'STORAGE_DIR', `"${storageDir().replace(/\\/g, '/')}"`)
  serverEnv = setEnv(serverEnv, 'SERVER_PORT', String(ANY_PORT))
  writeFileSync(serverEnvPath, serverEnv)
  // frontend/collector .env можно писать всегда — там нет пользовательских настроек.
  if (!existsSync(join(repoDir(), 'frontend', '.env')))
    writeFileSync(join(repoDir(), 'frontend', '.env'), `VITE_API_BASE='/api'\n`)
  if (!existsSync(join(repoDir(), 'collector', '.env')))
    writeFileSync(join(repoDir(), 'collector', '.env'), `\n`)

  // 4. Сборка фронтенда → server/public
  setPhase('building', 'Собираю интерфейс AnythingLLM…')
  await runStep('node', [yarn, 'build'], join(repoDir(), 'frontend'))
  const dist = join(repoDir(), 'frontend', 'dist')
  const pub = join(repoDir(), 'server', 'public')
  try {
    rmSync(pub, { recursive: true, force: true })
  } catch {
    /* ignore */
  }
  cpSync(dist, pub, { recursive: true })

  // 5. Prisma: генерация клиента и миграции БД
  setPhase('migrating', 'Готовлю базу данных…')
  const serverDir = join(repoDir(), 'server')
  await runStep('npx', ['prisma', 'generate', '--schema=./prisma/schema.prisma'], serverDir)
  await runStep('npx', ['prisma', 'migrate', 'deploy', '--schema=./prisma/schema.prisma'], serverDir)
}

// Запуск server и collector — по отдельности, чтобы уметь поднимать любой из них.
function startServer(): void {
  if (serverProc) return
  const outStream = createWriteStream(join(baseDir(), 'runtime.log'), { flags: 'a' })
  serverProc = spawn('node', ['index.js'], {
    cwd: join(repoDir(), 'server'),
    shell: true,
    windowsHide: true,
    env: { ...process.env, NODE_ENV: 'production', STORAGE_DIR: storageDir(), SERVER_PORT: String(ANY_PORT) }
  })
  serverProc.stdout?.pipe(outStream)
  serverProc.stderr?.pipe(outStream)
  serverProc.on('exit', () => {
    serverProc = null
    if (phase === 'running') setPhase('idle', 'Сервер остановлен')
  })
}

function startCollector(): void {
  if (collectorProc) return
  const outStream = createWriteStream(join(baseDir(), 'runtime.log'), { flags: 'a' })
  collectorProc = spawn('node', ['index.js'], {
    cwd: join(repoDir(), 'collector'),
    shell: true,
    windowsHide: true,
    // STORAGE_DIR обязателен и collector'у: в production он резолвит
    // path.resolve(STORAGE_DIR, 'documents'); без него краш при старте.
    env: { ...process.env, NODE_ENV: 'production', STORAGE_DIR: storageDir(), SERVER_PORT: String(COLLECTOR_PORT) }
  })
  collectorProc.stdout?.pipe(outStream)
  collectorProc.stderr?.pipe(outStream)
  collectorProc.on('exit', () => {
    collectorProc = null
  })
}

// Главная точка входа: гарантировать, что AnythingLLM установлен и оба сервиса живы.
// Идемпотентна: поднимает только то, что упало (напр. перезапустит collector,
// даже если сервер уже работает).
export async function ensureAnything(): Promise<{ ok: boolean; port?: number; error?: string }> {
  if (busy) return { ok: true, port: ANY_PORT }
  const serverUp = await isServerHealthy()
  const collectorUp = await isCollectorHealthy()
  if (serverUp && collectorUp) {
    setPhase('running', '')
    return { ok: true, port: ANY_PORT }
  }
  busy = true
  lastError = ''
  try {
    if (!isInstalled()) {
      await install()
    }
    setPhase('starting', serverUp ? 'Запускаю обработчик документов…' : 'Запускаю AnythingLLM…')
    if (!serverUp) startServer()
    if (!collectorUp) startCollector()
    // Ждём поднятия обоих (первый старт prisma-движка / collector небыстрый)
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      if ((await isServerHealthy()) && (await isCollectorHealthy())) {
        setPhase('running', '')
        busy = false
        return { ok: true, port: ANY_PORT }
      }
    }
    throw new Error('server/collector не поднялись за 120с')
  } catch (e) {
    lastError = String(e instanceof Error ? e.message : e)
    setPhase('error', lastError)
    busy = false
    return { ok: false, error: lastError }
  }
}

export function stopAnything(): void {
  for (const p of [serverProc, collectorProc]) {
    try {
      p?.kill()
    } catch {
      /* ignore */
    }
  }
  serverProc = null
  collectorProc = null
  if (phase === 'running' || phase === 'starting') setPhase('idle', '')
}
