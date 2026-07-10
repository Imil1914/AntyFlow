// Собирает prebuilt-артефакт AnythingLLM для вкладывания в установщик Flow.
//
// Источник — уже установленный репозиторий в userData (его готовит первый запуск
// AnythingLLM в приложении): %APPDATA%\Flow\anythingllm\repo. Отсюда берём server/ и
// collector/ (с их node_modules и собранным фронтом в server/public), БЕЗ пользовательских
// данных (server/storage) и мусора. Затем в КОПИИ переключаем prisma на env("DATABASE_URL")
// и регенерируем клиент приватным Node — чтобы в рантайме БД жила в userData (resources/
// доступен только на чтение).
//
// Запуск (один раз, на билд-машине, где AnythingLLM уже установлен приложением):
//   npm run build-anythingllm
//
// Результат: sidecars/anythingllm/{server,collector}  → пойдёт в resources/anythingllm.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, cpSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIDE = join(ROOT, 'sidecars')
const OUT = join(SIDE, 'anythingllm')
const NODE = join(SIDE, 'node', process.platform === 'win32' ? 'node.exe' : 'node')

// Источник: userData-репозиторий AnythingLLM, подготовленный приложением.
const APPDATA = process.env.APPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Roaming')
const SRC = join(APPDATA, 'Flow', 'anythingllm', 'repo')

const log = (m) => console.log('[anythingllm] ' + m)
const dirMB = (p) => (existsSync(p) ? (dirSize(p) / 1024 / 1024).toFixed(0) : '0')
function dirSize(p) {
  let sum = 0
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const f = join(d, e.name)
      if (e.isDirectory()) walk(f)
      else
        try {
          sum += statSync(f).size
        } catch {
          /* ignore */
        }
    }
  }
  try {
    walk(p)
  } catch {
    /* ignore */
  }
  return sum
}

function assertSource() {
  if (!existsSync(SRC)) {
    throw new Error(
      'Не найден собранный AnythingLLM: ' +
        SRC +
        '\nСначала установи его в приложении (нода AnythingLLM → «Установить»), затем повтори.'
    )
  }
  // Фронт должен быть скопирован в server/public (финальный шаг install).
  // AnythingLLM переименовывает entry в _index.html (postbuild), index.html может не быть.
  const hasEntry = (dir) => existsSync(join(dir, '_index.html')) || existsSync(join(dir, 'index.html'))
  const pubDir = join(SRC, 'server', 'public')
  if (!hasEntry(pubDir)) {
    const dist = join(SRC, 'frontend', 'dist')
    if (hasEntry(dist)) {
      log('server/public пуст — копирую frontend/dist → server/public')
      cpSync(dist, pubDir, { recursive: true })
    } else {
      throw new Error('Фронт не собран (нет _index.html в frontend/dist). Доустанови AnythingLLM в приложении.')
    }
  }
  for (const need of ['server/node_modules', 'collector/node_modules']) {
    if (!existsSync(join(SRC, need))) throw new Error('Нет ' + need + ' в ' + SRC)
  }
}

// Копируем часть репозитория, отсекая пользовательские данные и мусор.
function copyPart(part, skip) {
  const from = join(SRC, part)
  const to = join(OUT, part)
  log('копирую ' + part + ' (' + dirMB(from) + ' МБ) …')
  cpSync(from, to, {
    recursive: true,
    filter: (s) => {
      const rel = s.slice(from.length + 1).replace(/\\/g, '/')
      if (!rel) return true
      return !skip.some((re) => re.test(rel))
    }
  })
}

// prisma sqlite url жёстко прописан в схеме → переключаем на env("DATABASE_URL"),
// чтобы в рантайме указать путь БД в userData (writable).
function patchPrisma() {
  const schema = join(OUT, 'server', 'prisma', 'schema.prisma')
  let src = readFileSync(schema, 'utf8')
  const before = src
  src = src.replace(/url\s*=\s*"file:[^"]*"/, 'url      = env("DATABASE_URL")')
  if (src === before) log('ВНИМАНИЕ: не нашёл жёсткий sqlite url в схеме (возможно уже env?)')
  else {
    writeFileSync(schema, src)
    log('schema.prisma → url = env("DATABASE_URL")')
  }
  // Регенерируем prisma-клиент приватным Node под новую схему.
  const serverDir = join(OUT, 'server')
  const prismaCli = join(serverDir, 'node_modules', 'prisma', 'build', 'index.js')
  log('prisma generate (приватный Node) …')
  execFileSync(NODE, [prismaCli, 'generate', '--schema=./prisma/schema.prisma'], {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./storage/anythingllm.db' } // фиктивно, generate не коннектится
  })
}

// Убрать из артефактного server/.env машинно-зависимые STORAGE_DIR/DATABASE_URL —
// в рантайме их задаёт приложение (путь в userData). Секреты (JWT/SIG) оставляем.
function stripEnv() {
  const envf = join(OUT, 'server', '.env')
  if (!existsSync(envf)) return
  const kept = readFileSync(envf, 'utf8')
    .split(/\r?\n/)
    .filter((l) => !/^\s*(STORAGE_DIR|DATABASE_URL)\s*=/.test(l))
    .join('\n')
  writeFileSync(envf, kept)
  log('server/.env: убрал STORAGE_DIR/DATABASE_URL (задаются в рантайме)')
}

// collector при старте зовёт wipeCollectorStorage() → readdir по hotdir и storage/tmp.
// Эти папки должны существовать, иначе процесс падает (files is not iterable).
function ensureCollectorDirs() {
  const hot = join(OUT, 'collector', 'hotdir')
  const tmp = join(OUT, 'collector', 'storage', 'tmp')
  mkdirSync(hot, { recursive: true })
  mkdirSync(tmp, { recursive: true })
  const md = join(hot, '__HOTDIR__.md')
  if (!existsSync(md)) writeFileSync(md, 'This is the hotdir for collector processing.\n')
  log('collector: hotdir + storage/tmp на месте')
}

function main() {
  if (!existsSync(NODE)) throw new Error('Нет приватного Node: ' + NODE + ' — запусти npm run prepare-sidecars')
  assertSource()
  log('источник: ' + SRC + '  (' + dirMB(SRC) + ' МБ)')
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })

  const skipServer = [/^storage(\/|$)/, /^\.git(\/|$)/, /\.log$/, /^logs(\/|$)/]
  // collector: НЕ вырезаем hotdir/storage целиком — иначе баг AnythingLLM
  // (wipeCollectorStorage делает readdir по несуществующей hotdir без return → краш).
  // Оставляем сами папки и __HOTDIR__.md, выкидываем лишь случайные файлы в hotdir.
  const skipCollector = [/^\.git(\/|$)/, /\.log$/, /^hotdir\/(?!__HOTDIR__\.md$)/]
  copyPart('server', skipServer)
  copyPart('collector', skipCollector)

  ensureCollectorDirs()
  patchPrisma()
  stripEnv()

  log('готово. sidecars/anythingllm = ' + dirMB(OUT) + ' МБ')
  log('  → пойдёт в resources/anythingllm установщика.')
}

main()
