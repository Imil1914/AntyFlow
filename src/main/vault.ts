// Vault — файловое хранилище заметок в стиле Obsidian.
// Реальные папки и .md-файлы на диске: ту же папку можно открыть в настоящем Obsidian.
// Корень хранится в settings.json (vaultRoot). Все пути в IPC — ОТНОСИТЕЛЬНЫЕ корня,
// с прямыми слэшами; здесь мы их безопасно резолвим и не даём вылезти за пределы корня.
import { app, ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { join, resolve, dirname, basename, extname, relative, sep } from 'path'
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  renameSync,
  rmSync,
  watch,
  type FSWatcher
} from 'fs'

type Settings = Record<string, unknown> & { vaultRoot?: string }

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}
function readSettings(): Settings {
  try {
    return JSON.parse(readFileSync(settingsPath(), 'utf-8'))
  } catch {
    return {}
  }
}
function writeSettings(patch: Settings): void {
  try {
    writeFileSync(settingsPath(), JSON.stringify({ ...readSettings(), ...patch }, null, 2), 'utf-8')
  } catch {
    /* ignore */
  }
}

function getRoot(): string {
  const r = readSettings().vaultRoot
  return typeof r === 'string' ? r : ''
}

// Безопасный резолв относительного пути внутри корня. Кидает при выходе за пределы.
function safe(root: string, rel: string): string {
  const clean = (rel || '').replace(/\\/g, '/').replace(/^\/+/, '')
  const abs = resolve(root, clean)
  const rootAbs = resolve(root)
  if (abs !== rootAbs && !abs.startsWith(rootAbs + sep)) {
    throw new Error('Путь вне хранилища: ' + rel)
  }
  return abs
}

const toRel = (root: string, abs: string): string => relative(root, abs).split(sep).join('/')

// Скрытые/служебные — не показываем в дереве.
const HIDDEN = new Set(['.git', '.obsidian', 'node_modules', '.trash', '.DS_Store'])

export type VaultEntry = {
  name: string
  path: string // относительный, '/'-разделитель
  type: 'dir' | 'file'
  children?: VaultEntry[]
}

function readTree(root: string, absDir: string): VaultEntry[] {
  let names: string[]
  try {
    names = readdirSync(absDir)
  } catch {
    return []
  }
  const dirs: VaultEntry[] = []
  const files: VaultEntry[] = []
  for (const name of names) {
    if (HIDDEN.has(name) || name.startsWith('.')) continue
    const abs = join(absDir, name)
    let st
    try {
      st = statSync(abs)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      dirs.push({ name, path: toRel(root, abs), type: 'dir', children: readTree(root, abs) })
    } else if (extname(name).toLowerCase() === '.md') {
      files.push({ name, path: toRel(root, abs), type: 'file' })
    }
  }
  const byName = (a: VaultEntry, b: VaultEntry) => a.name.localeCompare(b.name, 'ru')
  dirs.sort(byName)
  files.sort(byName)
  return [...dirs, ...files]
}

// Уникальное имя: если путь занят — добавляем " 1", " 2" …
function uniquePath(abs: string): string {
  if (!existsSync(abs)) return abs
  const dir = dirname(abs)
  const ext = extname(abs)
  const base = basename(abs, ext)
  for (let i = 1; i < 1000; i++) {
    const cand = join(dir, `${base} ${i}${ext}`)
    if (!existsSync(cand)) return cand
  }
  return abs
}

// --- Наблюдатель за изменениями на диске (внешние правки, напр. из Obsidian) ---
let watcher: FSWatcher | null = null
let watchedRoot = ''
let notifyTimer: NodeJS.Timeout | null = null
function broadcastChanged(): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('vault:changed')
  }
}
function ensureWatcher(root: string): void {
  if (watchedRoot === root && watcher) return
  if (watcher) {
    try {
      watcher.close()
    } catch {
      /* ignore */
    }
    watcher = null
  }
  watchedRoot = root
  if (!root || !existsSync(root)) return
  try {
    watcher = watch(root, { recursive: true }, () => {
      if (notifyTimer) clearTimeout(notifyTimer)
      notifyTimer = setTimeout(broadcastChanged, 250)
    })
  } catch {
    watcher = null
  }
}

export function registerVaultIpc(): void {
  // Текущий корень хранилища ('' если не выбран)
  ipcMain.handle('vault:root', () => {
    const root = getRoot()
    if (root && existsSync(root)) ensureWatcher(root)
    return { root: root && existsSync(root) ? root : '' }
  })

  // Выбрать/сменить папку хранилища
  ipcMain.handle('vault:pick', async () => {
    const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
    const res = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Выбери папку-хранилище заметок'
    })
    if (res.canceled || !res.filePaths[0]) return { ok: false }
    const root = res.filePaths[0]
    writeSettings({ vaultRoot: root })
    ensureWatcher(root)
    return { ok: true, root }
  })

  // Дерево папок и .md-файлов
  ipcMain.handle('vault:tree', () => {
    const root = getRoot()
    if (!root || !existsSync(root)) return { root: '', tree: [] as VaultEntry[] }
    ensureWatcher(root)
    return { root, tree: readTree(root, root) }
  })

  // Прочитать файл
  ipcMain.handle('vault:read', (_e, args: { path: string }) => {
    const root = getRoot()
    try {
      return { ok: true, content: readFileSync(safe(root, args.path), 'utf-8') }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Записать файл (создаёт папки при необходимости)
  ipcMain.handle('vault:write', (_e, args: { path: string; content: string }) => {
    const root = getRoot()
    try {
      const abs = safe(root, args.path)
      mkdirSync(dirname(abs), { recursive: true })
      writeFileSync(abs, args.content, 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Создать заметку (в папке dir, с базовым именем name). Возвращает итоговый путь.
  ipcMain.handle('vault:create', (_e, args: { dir?: string; name?: string; content?: string }) => {
    const root = getRoot()
    try {
      const dirAbs = safe(root, args.dir || '')
      mkdirSync(dirAbs, { recursive: true })
      const base = (args.name || 'Без названия').replace(/[\\/:*?"<>|]/g, '').trim() || 'Без названия'
      const abs = uniquePath(join(dirAbs, base + '.md'))
      writeFileSync(abs, args.content ?? '', 'utf-8')
      return { ok: true, path: toRel(root, abs) }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Создать папку
  ipcMain.handle('vault:mkdir', (_e, args: { dir?: string; name?: string }) => {
    const root = getRoot()
    try {
      const parent = safe(root, args.dir || '')
      const base = (args.name || 'Новая папка').replace(/[\\/:*?"<>|]/g, '').trim() || 'Новая папка'
      let abs = join(parent, base)
      for (let i = 1; existsSync(abs) && i < 1000; i++) abs = join(parent, `${base} ${i}`)
      mkdirSync(abs, { recursive: true })
      return { ok: true, path: toRel(root, abs) }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Переименовать (в той же папке). Возвращает новый путь.
  ipcMain.handle('vault:rename', (_e, args: { path: string; name: string }) => {
    const root = getRoot()
    try {
      const abs = safe(root, args.path)
      const isDir = statSync(abs).isDirectory()
      const ext = isDir ? '' : extname(abs)
      const clean = (args.name || '').replace(/[\\/:*?"<>|]/g, '').trim()
      if (!clean) return { ok: false, error: 'Пустое имя' }
      const target = join(dirname(abs), clean.endsWith(ext) || !ext ? clean : clean + ext)
      if (target !== abs && existsSync(target)) return { ok: false, error: 'Имя уже занято' }
      renameSync(abs, target)
      return { ok: true, path: toRel(root, target) }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Переместить path внутрь папки destDir. Возвращает новый путь.
  ipcMain.handle('vault:move', (_e, args: { path: string; destDir: string }) => {
    const root = getRoot()
    try {
      const abs = safe(root, args.path)
      const destAbs = safe(root, args.destDir || '')
      const target = join(destAbs, basename(abs))
      if (target === abs) return { ok: true, path: toRel(root, abs) }
      // не даём вложить папку саму в себя
      if (resolve(target).startsWith(resolve(abs) + sep)) return { ok: false, error: 'Нельзя вложить в саму себя' }
      if (existsSync(target)) return { ok: false, error: 'В папке уже есть такой элемент' }
      renameSync(abs, target)
      return { ok: true, path: toRel(root, target) }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Удалить (в корзину ОС, безопасно)
  ipcMain.handle('vault:delete', async (_e, args: { path: string }) => {
    const root = getRoot()
    try {
      const abs = safe(root, args.path)
      try {
        await shell.trashItem(abs)
      } catch {
        rmSync(abs, { recursive: true, force: true })
      }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Показать в проводнике
  ipcMain.handle('vault:reveal', (_e, args: { path: string }) => {
    const root = getRoot()
    try {
      shell.showItemInFolder(safe(root, args.path))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })
}

export function stopVaultWatcher(): void {
  if (watcher) {
    try {
      watcher.close()
    } catch {
      /* ignore */
    }
    watcher = null
  }
}
