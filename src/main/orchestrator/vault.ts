// ============================================================================
// Vault — общее состояние / data-plane (раздел 2.2 ТЗ).
// Файловое хранилище в userData. Ключ-адресуемое: имя проекта извлекается из
// ключа (соглашение project:{id}/...), поэтому read/write работают кросс-проектно
// (нужно для интеграции результатов саб-оркестраторов родителем).
//
// Windows не допускает ':' в имени файла, поэтому весь проект хранится одним
// JSON-словарём <userData>/orchestrator/<projectId>/vault.json. Все операции
// проходят через main (единственный поток), поэтому гонок между воркерами нет.
// ============================================================================
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, readFileSync, writeFileSync, existsSync, appendFileSync, copyFileSync } from 'fs'

type Entry = { content: string; metadata: Record<string, unknown>; ts: number }
type ProjectData = Record<string, Entry>

const cache = new Map<string, ProjectData>()

function root(): string {
  return join(app.getPath('userData'), 'orchestrator')
}
function projectDir(projectId: string): string {
  const d = join(root(), safe(projectId))
  mkdirSync(d, { recursive: true })
  return d
}
// Безопасное имя папки из projectId
function safe(id: string): string {
  return id.replace(/[^A-Za-z0-9_.-]/g, '_')
}
// Извлечь projectId из ключа вида project:{id}/task:...
export function projectOf(key: string): string {
  const m = key.match(/^project:([^/]+)/)
  return m ? m[1] : '_global'
}

function load(projectId: string): ProjectData {
  const cached = cache.get(projectId)
  if (cached) return cached
  const file = join(projectDir(projectId), 'vault.json')
  let data: ProjectData = {}
  if (existsSync(file)) {
    try {
      data = JSON.parse(readFileSync(file, 'utf-8')) as ProjectData
    } catch {
      data = {}
    }
  }
  cache.set(projectId, data)
  return data
}
function persist(projectId: string): void {
  const data = cache.get(projectId)
  if (!data) return
  try {
    writeFileSync(join(projectDir(projectId), 'vault.json'), JSON.stringify(data), 'utf-8')
  } catch {
    /* диск недоступен — не роняем оркестрацию */
  }
}

// --- Публичные операции Vault (раздел 2.2 ТЗ) ---

export function vaultWrite(key: string, content: string, metadata: Record<string, unknown> = {}): string {
  const pid = projectOf(key)
  const data = load(pid)
  data[key] = { content, metadata, ts: Date.now() }
  persist(pid)
  return key
}

export function vaultRead(key: string): string | null {
  const data = load(projectOf(key))
  return data[key]?.content ?? null
}

export function vaultReadMany(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) {
    const v = vaultRead(k)
    if (v != null) out[k] = v
  }
  return out
}

// RAG-поиск. MVP: keyword-скор по содержимому (семантика через эмбеддинги —
// расширение, см. src/renderer/src/pdf/embeddings.ts + nomic-embed).
export function vaultQuery(query: string, filters: Record<string, unknown> = {}): string[] {
  const pid = (filters.project_id as string) || projectOf((filters.key_prefix as string) || '')
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  const scan = (data: ProjectData): Array<{ key: string; score: number }> =>
    Object.entries(data).map(([key, e]) => {
      const text = (key + ' ' + e.content).toLowerCase()
      let score = 0
      for (const t of terms) if (text.includes(t)) score++
      return { key, score }
    })
  const projects = pid && pid !== '_global' ? [pid] : [...cache.keys()]
  const scored: Array<{ key: string; score: number }> = []
  for (const p of projects) scored.push(...scan(load(p)))
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((s) => s.key)
}

// CAG / decisions_log — история решений (раздел 6 ТЗ, обязательно).
export function vaultAppendLog(projectId: string, taskId: string, event: unknown): void {
  const line = JSON.stringify({ ts: Date.now(), task_id: taskId, event }) + '\n'
  try {
    appendFileSync(join(projectDir(projectId), 'decisions_log.jsonl'), line, 'utf-8')
  } catch {
    /* ignore */
  }
}

export function vaultReadLog(projectId: string): unknown[] {
  const file = join(projectDir(projectId), 'decisions_log.jsonl')
  if (!existsSync(file)) return []
  try {
    return readFileSync(file, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l))
  } catch {
    return []
  }
}

// Снимок для отката/дебага.
export function vaultSnapshot(projectId: string): string {
  persist(projectId)
  const snapId = `snap_${Date.now()}`
  const dir = join(projectDir(projectId), 'snapshots')
  mkdirSync(dir, { recursive: true })
  try {
    copyFileSync(join(projectDir(projectId), 'vault.json'), join(dir, `${snapId}.json`))
  } catch {
    /* ignore */
  }
  return snapId
}

// Сбросить кэш проекта (после отмены/завершения не обязательно, но полезно для памяти).
export function vaultEvict(projectId: string): void {
  persist(projectId)
  cache.delete(projectId)
}
