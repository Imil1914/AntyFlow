// Готовит папку sidecars/ перед сборкой установщика (electron-builder → extraResources).
// Наполняет её крупными бинарниками, которые пойдут ВНУТРЬ установщика Flow, чтобы на
// чужом ПК не требовались системный Node / глобальные npm-CLI:
//
//   sidecars/bin/opencode.exe   — standalone-бинарник OpenCode (копируем из npm global)
//   sidecars/node/node.exe      — приватный Node LTS (качаем с nodejs.org)
//
// Идемпотентно: уже вложенные файлы не трогает. Запуск: `npm run prepare-sidecars`.
// Windows x64. (mac/linux — добавим позже вместе с кросс-сборкой.)
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, rmSync, statSync, createWriteStream } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIDE = join(ROOT, 'sidecars')
const NODE_VERSION = '20.18.1' // приватный Node: LTS, совместим с нативными модулями (AnythingLLM)

const isWin = process.platform === 'win32'
const log = (m) => console.log('[sidecars] ' + m)
const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(1) + ' МБ'

function ensureDir(p) {
  mkdirSync(p, { recursive: true })
}

// ---------- OpenCode ----------
function prepareOpencode() {
  const dest = join(SIDE, 'bin', isWin ? 'opencode.exe' : 'opencode')
  if (existsSync(dest)) {
    log('OpenCode уже вложен (' + mb(dest) + ') — пропуск')
    return
  }
  if (!isWin) {
    log('OpenCode: не-Windows пока не поддержан этим скриптом — пропуск')
    return
  }
  let globalRoot = ''
  try {
    globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
  } catch {
    /* ignore */
  }
  const candidates = [
    globalRoot && join(globalRoot, 'opencode-ai', 'node_modules', 'opencode-windows-x64', 'bin', 'opencode.exe'),
    globalRoot && join(globalRoot, 'opencode-ai', 'node_modules', 'opencode-windows-x64-baseline', 'bin', 'opencode.exe')
  ].filter(Boolean)
  const src = candidates.find((c) => existsSync(c))
  if (!src) {
    log('OpenCode-бинарник не найден. Установи глобально: npm i -g opencode-ai@latest')
    log('  искал в: ' + candidates.join('  |  '))
    return
  }
  ensureDir(dirname(dest))
  copyFileSync(src, dest)
  log('OpenCode скопирован: ' + src)
  log('  → ' + dest + '  (' + mb(dest) + ')')
}

// ---------- OpenScience (standalone Bun-бинарник) ----------
function prepareOpenscience() {
  const dest = join(SIDE, 'bin', isWin ? 'openscience.exe' : 'openscience')
  if (existsSync(dest)) {
    log('OpenScience уже вложен (' + mb(dest) + ') — пропуск')
    return
  }
  if (!isWin) {
    log('OpenScience: не-Windows пока не поддержан этим скриптом — пропуск')
    return
  }
  let globalRoot = ''
  try {
    globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
  } catch {
    /* ignore */
  }
  // Реальный бинарник лежит в платформенном подпакете @synsci/openscience-windows-x64.
  const nm = globalRoot && join(globalRoot, '@synsci', 'openscience', 'node_modules', '@synsci')
  const candidates = [
    nm && join(nm, 'openscience-windows-x64', 'bin', 'openscience.exe'),
    nm && join(nm, 'openscience-windows-x64-baseline', 'bin', 'openscience.exe')
  ].filter(Boolean)
  const src = candidates.find((c) => existsSync(c))
  if (!src) {
    log('OpenScience-бинарник не найден. Установи глобально: npm i -g @synsci/openscience@latest')
    log('  искал в: ' + candidates.join('  |  '))
    return
  }
  ensureDir(dirname(dest))
  copyFileSync(src, dest)
  log('OpenScience скопирован: ' + src)
  log('  → ' + dest + '  (' + mb(dest) + ')')
}

// ---------- Приватный Node ----------
async function download(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status + ' для ' + url)
  await new Promise((resolve, reject) => {
    const out = createWriteStream(dest)
    Readable.fromWeb(res.body).pipe(out)
    out.on('finish', resolve)
    out.on('error', reject)
  })
}

async function prepareNode() {
  const dest = join(SIDE, 'node', isWin ? 'node.exe' : 'node')
  if (existsSync(dest)) {
    log('Приватный Node уже вложен (' + mb(dest) + ') — пропуск')
    return
  }
  if (!isWin) {
    log('Node: не-Windows пока не поддержан этим скриптом — пропуск')
    return
  }
  const cache = join(SIDE, '.cache')
  ensureDir(cache)
  const base = `node-v${NODE_VERSION}-win-x64`
  const zip = join(cache, base + '.zip')
  const url = `https://nodejs.org/dist/v${NODE_VERSION}/${base}.zip`
  log('Качаю Node ' + NODE_VERSION + ' … ' + url)
  await download(url, zip)
  log('  скачано (' + mb(zip) + '), распаковываю node.exe')
  // Извлекаем только node.exe через PowerShell Expand-Archive (без сторонних зависимостей).
  const extractDir = join(cache, base)
  rmSync(extractDir, { recursive: true, force: true })
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -Force -LiteralPath '${zip}' -DestinationPath '${cache}'"`,
    { stdio: 'inherit' }
  )
  const nodeExe = join(extractDir, 'node.exe')
  if (!existsSync(nodeExe)) throw new Error('node.exe не найден после распаковки: ' + nodeExe)
  ensureDir(dirname(dest))
  copyFileSync(nodeExe, dest)
  rmSync(cache, { recursive: true, force: true })
  log('Приватный Node готов → ' + dest + '  (' + mb(dest) + ')')
}

async function main() {
  ensureDir(SIDE)
  ensureDir(join(SIDE, 'bin'))
  ensureDir(join(SIDE, 'node'))
  prepareOpencode()
  prepareOpenscience()
  await prepareNode()
  log('Готово. Содержимое sidecars/ попадёт в resources/ установщика.')
}

main().catch((e) => {
  console.error('[sidecars] ОШИБКА:', e)
  process.exit(1)
})
