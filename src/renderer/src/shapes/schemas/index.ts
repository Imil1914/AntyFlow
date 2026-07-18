// ============================================================================
// Версионирование схемы нод (T1.2).
//
// props.extra у flow-node — свободный JSON. Чтобы эволюция форматов не ломала старые
// доски, для каждого kind заводим:
//   - zod-схему (пермиссивную: лишние поля сохраняются — обратная совместимость);
//   - целевую версию CURRENT_EXTRA_VERSION[kind] (по умолчанию 1);
//   - цепочку миграций vN → vN+1 (чистые функции).
//
// При загрузке доски каждый extra прогоняется через parseAndMigrateExtra:
//   невалидный JSON / не-объект → нода помечается «повреждена» (данные не теряются);
//   иначе применяются миграции до текущей версии.
//
// ПРАВИЛО (см. README.md рядом): любое изменение формата extra = НОВАЯ версия +
// миграция vN→vN+1 + юнит-тест.
//
// Модуль ЧИСТЫЙ (без tldraw/electron) — покрывается vitest.
// ============================================================================
import { z } from 'zod'

export type ExtraObj = Record<string, unknown>

// Базовая пермиссивная схема: требуем лишь корректный extraVersion (если задан).
// catchall(unknown) сохраняет все прочие поля — старые доски не ломаются.
const baseExtra = z.object({ extraVersion: z.number().int().positive().optional() }).catchall(z.unknown())

// --- note: демонстрация версионирования (v2). ---
// Миграция v1→v2 переименовывает устаревшее поле `pinned` → `favorite`.
// Реальные заметки хранят текст в props.title/props.body, extra обычно пуст, поэтому
// для них миграция безопасна (просто проставит extraVersion: 2).
const noteExtra = z
  .object({
    extraVersion: z.number().int().positive().optional(),
    favorite: z.boolean().optional()
  })
  .catchall(z.unknown())

// Схемы по kind. Отсутствующий kind → базовая пермиссивная схема.
// Ужесточать (перечислять поля) — по мере необходимости, вместе с новой версией+миграцией.
export const EXTRA_SCHEMAS: Record<string, z.ZodTypeAny> = {
  note: noteExtra
}

// Текущая целевая версия extra по kind. Не перечисленные → 1.
export const CURRENT_EXTRA_VERSION: Record<string, number> = {
  note: 2
}

export function currentVersion(kind: string): number {
  return CURRENT_EXTRA_VERSION[kind] ?? 1
}
export function schemaFor(kind: string): z.ZodTypeAny {
  return EXTRA_SCHEMAS[kind] ?? baseExtra
}

// --- Миграции: kind → { fromVersion: (extra) => extra }. Каждая поднимает vN → vN+1. ---
type MigrationFn = (e: ExtraObj) => ExtraObj
export const MIGRATIONS: Record<string, Record<number, MigrationFn>> = {
  note: {
    // v1 → v2: pinned → favorite
    1: (e) => {
      const next: ExtraObj = { ...e }
      if ('pinned' in next) {
        next.favorite = next.pinned
        delete next.pinned
      }
      return next
    }
  }
}

function versionOf(e: ExtraObj): number {
  const v = e.extraVersion
  return typeof v === 'number' && v >= 1 ? Math.floor(v) : 1
}

/**
 * Прогнать цепочку миграций до текущей версии kind. Чистая функция.
 * changed = данные (или версия) изменились и стоит перезаписать extra в сторе.
 */
export function migrateExtra(kind: string, extra: ExtraObj): { extra: ExtraObj; changed: boolean } {
  const target = currentVersion(kind)
  let cur = versionOf(extra)
  // Уже актуально (в т.ч. все v1-kind без extraVersion) — не трогаем, чтобы не
  // переписывать extra у каждой ноды и не «пачкать» доску без нужды.
  if (cur >= target) return { extra, changed: false }
  const chain = MIGRATIONS[kind] || {}
  let obj: ExtraObj = { ...extra }
  while (cur < target) {
    const fn = chain[cur]
    if (fn) obj = fn(obj)
    cur += 1
    obj.extraVersion = cur
  }
  return { extra: obj, changed: true }
}

export type ParseResult =
  | { status: 'ok' | 'migrated'; extra: ExtraObj; json: string }
  | { status: 'corrupt'; raw: string }

function isPlainObject(v: unknown): v is ExtraObj {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Разобрать сырой extra ноды. Невалидный JSON или не-объект → 'corrupt' (нода будет
 * показана заглушкой, данные сохранены в raw). Иначе — миграция + проверка схемой.
 */
export function parseAndMigrateExtra(kind: string, raw: string): ParseResult {
  const src = raw && raw.trim() ? raw : '{}'
  let parsed: unknown
  try {
    parsed = JSON.parse(src)
  } catch {
    return { status: 'corrupt', raw }
  }
  if (!isPlainObject(parsed)) return { status: 'corrupt', raw }
  const { extra, changed } = migrateExtra(kind, parsed)
  const res = schemaFor(kind).safeParse(extra)
  if (!res.success) return { status: 'corrupt', raw }
  const finalExtra = res.data as ExtraObj
  return { status: changed ? 'migrated' : 'ok', extra: finalExtra, json: JSON.stringify(finalExtra) }
}

// --- Реестр «повреждённых» нод (по id shape) для рендера-заглушки ---
const corruptedExtras = new Map<string, string>()
export function markCorrupt(shapeId: string, raw: string): void {
  corruptedExtras.set(shapeId, raw)
}
export function clearCorrupt(shapeId: string): void {
  corruptedExtras.delete(shapeId)
}
export function isExtraCorrupt(shapeId: string): boolean {
  return corruptedExtras.has(shapeId)
}
export function corruptRaw(shapeId: string): string {
  return corruptedExtras.get(shapeId) || ''
}
