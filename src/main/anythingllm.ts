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
import { anythingllmDir, nodeBin } from './sidecars'

const REPO = 'https://github.com/Mintplex-Labs/anything-llm.git'
// Пиновый стабильный релиз: master бывает нестабилен (ловили краш zod/v3 из MCP SDK).
const TAG = 'v1.15.0'
export const ANY_PORT = 3001
const COLLECTOR_PORT = 8888

// Загрузить PDF (base64) в AnythingLLM и вшить его в рабочее пространство (RAG).
// Нужен API-ключ AnythingLLM (Settings → Developer API в его интерфейсе).
// MIME-тип и корректное имя файла по расширению (для upload в collector).
function mimeFor(name: string): { mime: string; fname: string } {
  const n = (name || 'file').toLowerCase()
  if (n.endsWith('.pdf')) return { mime: 'application/pdf', fname: name }
  if (n.endsWith('.docx')) return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fname: name }
  if (n.endsWith('.pptx')) return { mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', fname: name }
  if (n.endsWith('.md') || n.endsWith('.markdown')) return { mime: 'text/markdown', fname: name }
  if (n.endsWith('.txt') || n.endsWith('.text')) return { mime: 'text/plain', fname: name }
  if (/\.(csv|json|html?|xml|rtf)$/.test(n)) return { mime: 'text/plain', fname: name }
  // без расширения — считаем текстом
  return { mime: 'text/plain', fname: /\.[a-z0-9]+$/.test(n) ? name : name + '.txt' }
}

// Список рабочих пространств (проектов) AnythingLLM — для выбора, куда грузить RAG.
export async function listWorkspaces(apiKey: string): Promise<{ ok: boolean; error?: string; workspaces?: Array<{ name: string; slug: string }> }> {
  if (!apiKey) return { ok: false, error: 'нет API-ключа AnythingLLM' }
  const base = `http://localhost:${ANY_PORT}/api/v1`
  try {
    const r = await fetch(`${base}/workspaces`, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!r.ok) return { ok: false, error: r.status === 401 || r.status === 403 ? 'неверный API-ключ AnythingLLM' : `AnythingLLM ${r.status}` }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = (await r.json()) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspaces = ((d.workspaces || []) as any[]).map((w) => ({ name: String(w.name), slug: String(w.slug) }))
    return { ok: true, workspaces }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function ingestDocument(
  base64: string,
  name: string,
  apiKey: string,
  workspaceName = 'Flow'
): Promise<{ ok: boolean; error?: string; location?: string }> {
  if (!apiKey) return { ok: false, error: 'нет API-ключа AnythingLLM (⚙ Настройки)' }
  const base = `http://localhost:${ANY_PORT}/api/v1`
  const H: Record<string, string> = { Authorization: `Bearer ${apiKey}` }
  try {
    // 1) найти/создать рабочее пространство
    const wsR = await fetch(`${base}/workspaces`, { headers: H })
    if (!wsR.ok) {
      return {
        ok: false,
        error:
          wsR.status === 401 || wsR.status === 403
            ? 'AnythingLLM: неверный API-ключ (сгенерируй в AnythingLLM → Settings → Developer API)'
            : `AnythingLLM недоступен (${wsR.status})`
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsD = (await wsR.json()) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let slug: string | undefined = (wsD.workspaces || []).find((w: any) => w.name === workspaceName)?.slug
    if (!slug) {
      const newR = await fetch(`${base}/workspace/new`, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName })
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newD = (await newR.json().catch(() => ({}))) as any
      slug = newD?.workspace?.slug
    }
    if (!slug) return { ok: false, error: 'не удалось создать workspace' }

    // 2) дождаться collector (обработчик документов, :8888) — без него upload = 500
    let collectorUp = await isCollectorHealthy()
    for (let i = 0; i < 15 && !collectorUp; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      collectorUp = await isCollectorHealthy()
    }

    // 3) загрузить документ (multipart) — mimetype/имя по реальному расширению,
    //    чтобы collector правильно распарсил не только PDF, но и docx/txt/md/pptx.
    const form = new FormData()
    const { mime, fname } = mimeFor(name)
    form.append('file', new Blob([Buffer.from(base64, 'base64')], { type: mime }), fname)
    const upR = await fetch(`${base}/document/upload`, { method: 'POST', headers: H, body: form })
    if (!upR.ok) {
      let body = ''
      try {
        body = (await upR.text()).replace(/\s+/g, ' ').slice(0, 200)
      } catch {
        /* ignore */
      }
      const hint = !collectorUp ? ' — обработчик документов (collector :8888) не запущен' : ''
      return { ok: false, error: `AnythingLLM upload ${upR.status}${hint}${body ? ' — ' + body : ''}` }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upD = (await upR.json()) as any
    const loc = upD?.documents?.[0]?.location
    if (!loc) return { ok: false, error: 'AnythingLLM: загрузка без location' }

    // 4) вшить документ в рабочее пространство (эмбеддинги)
    const emR = await fetch(`${base}/workspace/${slug}/update-embeddings`, {
      method: 'POST',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ adds: [loc] })
    })
    if (!emR.ok) return { ok: false, error: `AnythingLLM embed ${emR.status}` }
    return { ok: true, location: String(loc) }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

// Убрать документ из RAG: снять эмбеддинги из workspace и удалить исходник из системы.
// location — то, что вернул ingestDocument (напр. "custom-documents/файл-uuid.json").
export async function removeDocument(
  location: string,
  apiKey: string,
  workspaceName = 'Flow'
): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey) return { ok: false, error: 'нет API-ключа AnythingLLM' }
  if (!location) return { ok: true }
  const base = `http://localhost:${ANY_PORT}/api/v1`
  const H: Record<string, string> = { Authorization: `Bearer ${apiKey}` }
  try {
    // 1) снять эмбеддинги из рабочего пространства (убирает документ из ответов RAG)
    const wsR = await fetch(`${base}/workspaces`, { headers: H })
    if (wsR.ok) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wsD = (await wsR.json()) as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slug: string | undefined = (wsD.workspaces || []).find((w: any) => w.name === workspaceName)?.slug
      if (slug) {
        await fetch(`${base}/workspace/${slug}/update-embeddings`, {
          method: 'POST',
          headers: { ...H, 'Content-Type': 'application/json' },
          body: JSON.stringify({ deletes: [location] })
        }).catch(() => {})
      }
    }
    // 2) удалить исходный документ из системы (освобождает хранилище). Best-effort.
    await fetch(`${base}/system/remove-documents`, {
      method: 'DELETE',
      headers: { ...H, 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: [location] })
    }).catch(() => {})
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

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
// Prebuilt-режим: артефакт вложен в установщик (resources/anythingllm). Тогда сам
// репозиторий read-only в resources, а данные (storage + БД) живут в userData.
function bundledDir(): string | null {
  return anythingllmDir()
}
function usingBundled(): boolean {
  return !!bundledDir()
}
// Node для запуска: приватный (вложенный) в prebuilt-режиме, системный — в dev/clone.
function anyNode(): string {
  return (usingBundled() && nodeBin()) || 'node'
}
function repoDir(): string {
  return bundledDir() || join(baseDir(), 'repo')
}
// В prebuilt-режиме storage обязан быть writable → userData; в dev — внутри репозитория.
function storageDir(): string {
  return usingBundled() ? join(baseDir(), 'storage') : join(repoDir(), 'server', 'storage')
}
// Путь к sqlite-БД для prisma (схема артефакта использует env("DATABASE_URL")).
function dbUrl(): string {
  return 'file:' + join(storageDir(), 'anythingllm.db').replace(/\\/g, '/')
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

// Entry фронта: AnythingLLM переименовывает index.html → _index.html (postbuild).
function frontendBuilt(): boolean {
  const pub = join(repoDir(), 'server', 'public')
  return existsSync(join(pub, '_index.html')) || existsSync(join(pub, 'index.html'))
}
// Признак «установлено»: в prebuilt-режиме артефакт всегда готов; иначе — репозиторий
// склонирован, зависимости сервера стоят, фронт собран в server/public.
function isInstalled(): boolean {
  if (usingBundled()) return true
  return (
    existsSync(join(repoDir(), 'server', 'node_modules')) &&
    frontendBuilt() &&
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

  // 5. Prisma: генерация клиента и миграции БД.
  // ВАЖНО: prisma generate перезаписывает query_engine-*.node. Если сервер уже
  // запущен (напр. осиротевший процесс от прошлой сессии), файл залочен → EPERM
  // «operation not permitted, unlink». Поэтому: если клиент уже сгенерирован —
  // пропускаем generate (он не нужен повторно). Так повторный install не падает.
  setPhase('migrating', 'Готовлю базу данных…')
  const serverDir = join(repoDir(), 'server')
  const prismaEngine = join(serverDir, 'node_modules', '.prisma', 'client', 'query_engine-windows.dll.node')
  const prismaIndex = join(serverDir, 'node_modules', '.prisma', 'client', 'index.js')
  if (!existsSync(prismaEngine) && !existsSync(prismaIndex)) {
    await runStep('npx', ['prisma', 'generate', '--schema=./prisma/schema.prisma'], serverDir)
  } else {
    appendFileSync(logFile(), '\n=== [migrating] prisma client уже сгенерирован — пропускаю generate ===\n')
  }
  await runStep('npx', ['prisma', 'migrate', 'deploy', '--schema=./prisma/schema.prisma'], serverDir)
}

// Prebuilt: создать БД в userData при первом запуске (prisma migrate deploy приватным Node).
// В dev-режиме БД создаётся в install() — тут ничего не делаем.
async function ensureDb(): Promise<void> {
  if (!usingBundled()) return
  mkdirSync(storageDir(), { recursive: true })
  if (existsSync(join(storageDir(), 'anythingllm.db'))) return
  setPhase('migrating', 'Готовлю базу данных…')
  const serverDir = join(repoDir(), 'server')
  const prismaCli = join(serverDir, 'node_modules', 'prisma', 'build', 'index.js')
  await new Promise<void>((resolve, reject) => {
    const p = spawn(anyNode(), [prismaCli, 'migrate', 'deploy', '--schema=./prisma/schema.prisma'], {
      cwd: serverDir,
      shell: false,
      windowsHide: true,
      env: { ...process.env, DATABASE_URL: dbUrl(), STORAGE_DIR: storageDir() }
    })
    const stream = createWriteStream(logFile(), { flags: 'a' })
    p.stdout?.pipe(stream)
    p.stderr?.pipe(stream)
    p.on('error', reject)
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error('prisma migrate завершился с кодом ' + code))))
  })
}

// Общее окружение для server/collector. В prebuilt добавляем DATABASE_URL (БД в userData).
function svcEnv(port: number): Record<string, string> {
  const env: Record<string, string> = {
    ...process.env,
    NODE_ENV: 'production',
    STORAGE_DIR: storageDir(),
    SERVER_PORT: String(port)
  }
  if (usingBundled()) env.DATABASE_URL = dbUrl()
  return env
}

// Запуск server и collector — по отдельности, чтобы уметь поднимать любой из них.
// В prebuilt зовём приватный Node напрямую (shell:false), в dev — системный через PATH.
function startServer(): void {
  if (serverProc) return
  const outStream = createWriteStream(join(baseDir(), 'runtime.log'), { flags: 'a' })
  serverProc = spawn(anyNode(), ['index.js'], {
    cwd: join(repoDir(), 'server'),
    shell: !usingBundled(),
    windowsHide: true,
    env: svcEnv(ANY_PORT)
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
  // При старте collector зовёт wipeCollectorStorage(), которая читает collector/hotdir
  // и collector/storage/tmp. Если storage/tmp нет (свежая установка), там баг апстрима
  // (нет return после resolve при ошибке readdir) → «TypeError: files is not iterable»
  // роняет процесс, и AnythingLLM «не поднимается за 120с». Создаём папки заранее.
  try {
    const colRoot = join(repoDir(), 'collector')
    const hot = join(colRoot, 'hotdir')
    mkdirSync(hot, { recursive: true })
    if (!existsSync(join(hot, '__HOTDIR__.md'))) writeFileSync(join(hot, '__HOTDIR__.md'), '')
    mkdirSync(join(colRoot, 'storage', 'tmp'), { recursive: true })
  } catch {
    /* ignore */
  }
  const outStream = createWriteStream(join(baseDir(), 'runtime.log'), { flags: 'a' })
  collectorProc = spawn(anyNode(), ['index.js'], {
    cwd: join(repoDir(), 'collector'),
    shell: !usingBundled(),
    windowsHide: true,
    // STORAGE_DIR обязателен и collector'у: в production он резолвит
    // path.resolve(STORAGE_DIR, 'documents'); без него краш при старте.
    env: svcEnv(COLLECTOR_PORT)
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
    await ensureDb() // prebuilt: создать БД в userData при первом запуске
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
      // spawn(...,{shell:true}) на Windows оставляет дочерний node-процесс — .kill()
      // гасит только оболочку, а node держит query_engine DLL. Убиваем ВСЁ дерево,
      // иначе осиротевший сервер блокирует следующий prisma generate (EPERM).
      if (p?.pid && process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { windowsHide: true, shell: false })
      } else {
        p?.kill()
      }
    } catch {
      /* ignore */
    }
  }
  serverProc = null
  collectorProc = null
  if (phase === 'running' || phase === 'starting') setPhase('idle', '')
}
