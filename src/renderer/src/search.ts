// ============================================================================
// Индексация нод для глобального поиска (T4.1).
//
// Renderer формирует «выжимку» текстов нод доски и шлёт в main (nodes:reindex → FTS5).
// Извлечение body — обобщённый сбор строковых значений из props.body + props.extra:
// покрывает sheet (значения ячеек), kanban/list (карточки), code (код) и т.п. без
// per-kind экстракторов. Base64/data-URL и слишком длинные строки в индекс не тащим.
// ============================================================================
import type { Editor } from 'tldraw'

export type NodeIndexItem = { shapeId: string; kind: string; title: string; body: string }

function collectStrings(v: unknown, out: string[], depth: number): void {
  if (depth > 6) return
  if (typeof v === 'string') {
    if (v.length <= 2000 && !v.startsWith('data:')) out.push(v)
  } else if (Array.isArray(v)) {
    for (const x of v) {
      if (out.length > 400) break
      collectStrings(x, out, depth + 1)
    }
  } else if (v && typeof v === 'object') {
    for (const x of Object.values(v as Record<string, unknown>)) {
      if (out.length > 400) break
      collectStrings(x, out, depth + 1)
    }
  }
}

// Ноды, которые не имеет смысла показывать в результатах поиска.
const SKIP_KINDS = new Set(['boardmem', 'daylane', 'tlaxis'])

export function buildNodeIndex(editor: Editor): NodeIndexItem[] {
  const items: NodeIndexItem[] = []
  for (const s of editor.getCurrentPageShapes()) {
    if (s.type !== 'flow-node') continue
    const p = (s as unknown as { props: { kind?: string; title?: string; body?: string; extra?: string } }).props
    const kind = p.kind || ''
    if (SKIP_KINDS.has(kind)) continue
    const strings: string[] = []
    if (typeof p.body === 'string' && p.body) strings.push(p.body)
    if (p.extra) {
      try {
        collectStrings(JSON.parse(p.extra), strings, 0)
      } catch {
        /* невалидный extra — тело просто пустое */
      }
    }
    const body = strings.join(' · ').slice(0, 8000)
    items.push({ shapeId: String(s.id), kind, title: (p.title || '').slice(0, 500), body })
  }
  return items
}
