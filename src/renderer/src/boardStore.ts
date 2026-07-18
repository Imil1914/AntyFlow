// ============================================================================
// Пер-борд мета (board_meta) в renderer + одноразовая миграция localStorage → SQLite (T1.1).
//
// board_meta хранит пер-борд флаги (таймлайн и пр.) в локальной БД (main). Как и с
// памятью доски, часть чтений синхронна (таймлайн-математика), поэтому держим здесь
// синхронный кэш, гидратируемый при загрузке/смене доски.
// ============================================================================
import { hydrateBoardMem, hydrateMemEmbeddings, refreshMemCfg } from './shapes/FlowNodeShapeUtil'

const bid = (boardId: string): string => boardId || 'default'
const metaCache = new Map<string, Record<string, string>>()
const metaHydrated = new Set<string>()

/** Загрузить board_meta доски из БД в кэш. Вызывать при открытии/смене доски. */
export async function hydrateBoardMeta(boardId: string): Promise<void> {
  const id = bid(boardId)
  try {
    const res = await window.flow.boardmeta.getAll({ boardId: id })
    if (res.ok) {
      metaCache.set(id, { ...res.data })
      metaHydrated.add(id)
    }
  } catch {
    /* мягкая деградация */
  }
}

/** Гидратация всего пер-борд состояния (мета + память) одной точкой. */
export async function hydrateBoard(boardId: string): Promise<void> {
  await Promise.all([hydrateBoardMeta(boardId), hydrateBoardMem(boardId), refreshMemCfg()])
  // Эмбеддинги памяти (T2.4) — после того как выжимки уже в кэше (readBoardMem).
  void hydrateMemEmbeddings(boardId)
}

/** Синхронное чтение мета из кэша (null, если ключа нет / доска не гидратирована). */
export function bmetaGet(boardId: string, key: string): string | null {
  const m = metaCache.get(bid(boardId))
  return m && key in m ? m[key] : null
}

/** Запись мета: сразу в кэш + асинхронно в БД. */
export function bmetaSet(boardId: string, key: string, value: string): void {
  const id = bid(boardId)
  const m = { ...(metaCache.get(id) || {}) }
  m[key] = value
  metaCache.set(id, m)
  window.flow.boardmeta
    .set({ boardId: id, key, value })
    .then((r) => {
      if (!r.ok) console.error('[boardmeta] set failed:', r.error)
    })
    .catch((e) => console.error('[boardmeta] set error:', e))
}

// --- Одноразовая миграция localStorage → БД ---
const MIGRATED_FLAG = 'flow-db-migrated-v1'
const BOARDMEM_PREFIX = 'flow-boardmem-'
const BOARDMEM_MIGRATED_PREFIX = 'flow-boardmem-migrated-'
const TIMELINE_ON_PREFIX = 'flow-timeline-on-'
const BOARD_CREATED_PREFIX = 'flow-board-created-'

type OldBoardMemEntry = { date?: string; text?: string; ts?: number; scope?: 'day' | 'week' | 'month' }

/**
 * Собирает из localStorage память досок (flow-boardmem-*) и флаги таймлайна, отправляет
 * в main (тот пишет в БД и сохраняет сырой дамп в backup/), и ТОЛЬКО после подтверждения
 * помечает ключи перенесёнными (boardmem-ключи переименовываются с префиксом migrated-,
 * данные не удаляются). Идемпотентно: при выставленном флаге ничего не делает.
 */
export async function migrateLocalStorageToDb(): Promise<{ migrated: boolean; memory: number; meta: number }> {
  if (localStorage.getItem(MIGRATED_FLAG) === '1') return { migrated: false, memory: 0, meta: 0 }

  const memory: { boardId: string; periodKind: 'day' | 'week' | 'month'; periodKey: string; content: string; ts?: number }[] = []
  const meta: { boardId: string; key: string; value: string }[] = []
  const boardmemKeys: string[] = []
  const raw: Record<string, string> = {}

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (k.startsWith(BOARDMEM_PREFIX) && !k.startsWith(BOARDMEM_MIGRATED_PREFIX)) {
      const boardId = k.slice(BOARDMEM_PREFIX.length)
      const rawVal = localStorage.getItem(k) || '[]'
      raw[k] = rawVal
      boardmemKeys.push(k)
      try {
        const arr = JSON.parse(rawVal)
        if (Array.isArray(arr)) {
          for (const e of arr as OldBoardMemEntry[]) {
            if (!e || typeof e.date !== 'string' || typeof e.text !== 'string') continue
            memory.push({
              boardId,
              periodKind: e.scope || 'day',
              periodKey: e.date,
              content: e.text,
              ts: typeof e.ts === 'number' ? e.ts : undefined
            })
          }
        }
      } catch {
        /* битый JSON — пропускаем, сырой дамп всё равно сохранён */
      }
    } else if (k.startsWith(TIMELINE_ON_PREFIX)) {
      const boardId = k.slice(TIMELINE_ON_PREFIX.length)
      const v = localStorage.getItem(k) || '0'
      raw[k] = v
      meta.push({ boardId, key: 'timeline.on', value: v === '1' ? '1' : '0' })
    } else if (k.startsWith(BOARD_CREATED_PREFIX)) {
      const boardId = k.slice(BOARD_CREATED_PREFIX.length)
      const v = localStorage.getItem(k) || ''
      if (v) {
        raw[k] = v
        meta.push({ boardId, key: 'board.createdMs', value: v })
      }
    }
  }

  // Нечего мигрировать — просто ставим флаг, чтобы больше не сканировать.
  if (!memory.length && !meta.length) {
    localStorage.setItem(MIGRATED_FLAG, '1')
    return { migrated: false, memory: 0, meta: 0 }
  }

  try {
    const res = await window.flow.dbImportLocalDump({ memory, meta, rawDump: JSON.stringify(raw) })
    if (!res.ok) {
      console.error('[migrate] import failed, оставляем localStorage как есть:', res.error)
      return { migrated: false, memory: 0, meta: 0 }
    }
  } catch (e) {
    console.error('[migrate] import error:', e)
    return { migrated: false, memory: 0, meta: 0 }
  }

  // Успех: помечаем boardmem-ключи перенесёнными (переименование, данные сохраняем).
  for (const k of boardmemKeys) {
    try {
      const val = localStorage.getItem(k)
      if (val != null) {
        localStorage.setItem(BOARDMEM_MIGRATED_PREFIX + k.slice(BOARDMEM_PREFIX.length), val)
        localStorage.removeItem(k)
      }
    } catch {
      /* ignore */
    }
  }
  localStorage.setItem(MIGRATED_FLAG, '1')
  return { migrated: true, memory: memory.length, meta: meta.length }
}
