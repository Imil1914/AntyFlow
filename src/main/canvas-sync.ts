// Файловая синхронизация холстов между устройствами.
// tldraw держит рабочий стор в IndexedDB (быстрый локальный кэш), а сюда мы
// дополнительно пишем снимок каждого холста как .json в подпапку Vault
// (`<vaultRoot>/.flow-canvas/`). Если Vault указывает на облачную папку
// (OneDrive/Dropbox/Google Drive), холсты синхронизируются между ноутбуками сами.
// Стратегия разрешения конфликтов — last-write-wins по updatedAt (для личного
// использования на двух устройствах не одновременно этого достаточно).
import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}
function vaultRoot(): string {
  try {
    const r = JSON.parse(readFileSync(settingsPath(), 'utf-8')).vaultRoot
    return typeof r === 'string' ? r : ''
  } catch {
    return ''
  }
}

// Папка синхронизации холстов внутри Vault (создаём при необходимости).
function syncDir(create = false): string {
  const root = vaultRoot()
  if (!root || !existsSync(root)) return ''
  const dir = join(root, '.flow-canvas')
  if (create && !existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
    } catch {
      return ''
    }
  }
  return dir
}

// Безопасное имя файла из ключа доски (ключи вида `flow-board-<id>` уже безопасны).
function keyFile(dir: string, key: string): string {
  const safe = String(key).replace(/[^\w.-]/g, '_').slice(0, 120)
  return join(dir, safe + '.json')
}

export function registerCanvasSyncIpc(): void {
  // Доступна ли синхронизация (выбран ли Vault)
  ipcMain.handle('canvas:status', () => {
    const dir = syncDir(false)
    return { enabled: !!dir, dir }
  })

  // Прочитать снимок холста по ключу доски
  ipcMain.handle('canvas:read', (_e, args: { key: string }) => {
    const dir = syncDir(false)
    if (!dir) return null
    try {
      const f = keyFile(dir, args.key)
      if (!existsSync(f)) return null
      const raw = JSON.parse(readFileSync(f, 'utf-8'))
      if (!raw || !raw.snapshot) return null
      return { snapshot: raw.snapshot, updatedAt: Number(raw.updatedAt) || 0, name: raw.name }
    } catch {
      return null
    }
  })

  // Записать снимок холста
  ipcMain.handle(
    'canvas:write',
    (_e, args: { key: string; snapshot: unknown; updatedAt: number; name?: string }) => {
      const dir = syncDir(true)
      if (!dir) return { ok: false, error: 'Vault не выбран' }
      try {
        writeFileSync(
          keyFile(dir, args.key),
          JSON.stringify({ snapshot: args.snapshot, updatedAt: args.updatedAt, name: args.name || '' }),
          'utf-8'
        )
        return { ok: true }
      } catch (e) {
        return { ok: false, error: String(e) }
      }
    }
  )

  // Прочитать список досок (метаданные)
  ipcMain.handle('canvas:boards:read', () => {
    const dir = syncDir(false)
    if (!dir) return null
    try {
      const f = join(dir, 'boards.json')
      if (!existsSync(f)) return null
      const raw = JSON.parse(readFileSync(f, 'utf-8'))
      if (!raw || !Array.isArray(raw.boards)) return null
      return { boards: raw.boards, updatedAt: Number(raw.updatedAt) || 0 }
    } catch {
      return null
    }
  })

  // Записать список досок
  ipcMain.handle('canvas:boards:write', (_e, args: { boards: unknown; updatedAt: number }) => {
    const dir = syncDir(true)
    if (!dir) return { ok: false, error: 'Vault не выбран' }
    try {
      writeFileSync(join(dir, 'boards.json'), JSON.stringify({ boards: args.boards, updatedAt: args.updatedAt }), 'utf-8')
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  // Удалить файл снимка (когда доска удалена) — не обязательно, но чисто
  ipcMain.handle('canvas:remove', (_e, args: { key: string }) => {
    const dir = syncDir(false)
    if (!dir) return { ok: false }
    try {
      const f = keyFile(dir, args.key)
      if (existsSync(f)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('fs').unlinkSync(f)
      }
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  // Список ключей, для которых есть файлы (диагностика/чистка)
  ipcMain.handle('canvas:list', () => {
    const dir = syncDir(false)
    if (!dir) return []
    try {
      return readdirSync(dir)
        .filter((n) => n.endsWith('.json') && n !== 'boards.json')
        .map((n) => n.replace(/\.json$/, ''))
    } catch {
      return []
    }
  })
}
