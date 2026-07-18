// PDF-хранилище и лёгкий локальный RAG для ноды PDF-аннотаций.
// - Сам PDF лежит файлом на диске (userData/pdf/files/<id>.pdf) — не в localStorage.
// - Векторный индекс (чанки + эмбеддинги) хранится JSON'ом на диске по каждому PDF
//   отдельно, поэтому поиск ВСЕГДА изолирован строго в пределах одного pdf_id.
// Эмбеддинги считает renderer (transformers.js) и присылает готовые векторы —
// здесь только хранение и косинусный поиск.
import { app, ipcMain } from 'electron'
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'

function ensureDir(sub: string): string {
  const d = join(app.getPath('userData'), 'pdf', sub)
  mkdirSync(d, { recursive: true })
  return d
}
function pdfPath(id: string): string {
  return join(ensureDir('files'), id + '.pdf')
}
function indexPath(id: string): string {
  return join(ensureDir('index'), id + '.json')
}

type Chunk = { id: string; page: number; text: string; vector: number[] }
type PdfIndex = { pdf_id: string; dim: number; chunks: Chunk[] }

function loadIndex(id: string): PdfIndex {
  try {
    return JSON.parse(readFileSync(indexPath(id), 'utf-8')) as PdfIndex
  } catch {
    return { pdf_id: id, dim: 0, chunks: [] }
  }
}
function saveIndex(idx: PdfIndex): void {
  writeFileSync(indexPath(idx.pdf_id), JSON.stringify(idx))
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let na = 0
  let nb = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8)
}

// Достаёт релевантные чанки строго из одного PDF (используется и в pdf:ask).
export function searchPdf(
  id: string,
  vector: number[],
  topK = 5
): Array<{ page: number; text: string; score: number }> {
  const idx = loadIndex(id)
  const scored = idx.chunks.map((c) => ({ page: c.page, text: c.text, score: cosine(vector, c.vector) }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, topK)
}

// ── T2.1: гибридный retrieval (BM25 + эмбеддинги + RRF) ──────────────────────
// Лексический скоринг считается по чанкам индекса на лету: тексты уже сериализованы
// в index/<id>.json, корпус одного PDF мал (десятки–сотни чанков), поэтому отдельный
// minisearch-персист не нужен. Токенизация — по буквам/цифрам Unicode (рус+англ).
function ragTokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
}

type Ranked = { idx: number; score: number }

function bm25Rank(chunks: Chunk[], queryText: string, topK: number): Ranked[] {
  const q = Array.from(new Set(ragTokenize(queryText)))
  if (!q.length || !chunks.length) return []
  const docs = chunks.map((c) => ragTokenize(c.text))
  const N = docs.length
  const avgdl = docs.reduce((s, d) => s + d.length, 0) / N || 1
  const df = new Map<string, number>()
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) || 0) + 1)
  const idf = new Map<string, number>()
  for (const t of q) {
    const n = df.get(t) || 0
    idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)))
  }
  const k1 = 1.5
  const b = 0.75
  const scored: Ranked[] = docs.map((d, i) => {
    const tf = new Map<string, number>()
    for (const t of d) tf.set(t, (tf.get(t) || 0) + 1)
    let s = 0
    for (const t of q) {
      const f = tf.get(t) || 0
      if (!f) continue
      s += (idf.get(t) || 0) * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (d.length / avgdl))))
    }
    return { idx: i, score: s }
  })
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, topK)
}

function vectorRank(chunks: Chunk[], vector: number[], topK: number): Ranked[] {
  return chunks
    .map((c, i) => ({ idx: i, score: cosine(vector, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

// Reciprocal Rank Fusion: устойчивое слияние разношкальных ранжирований.
function rrfMerge(rankings: Ranked[][], k = 60): Ranked[] {
  const acc = new Map<number, number>()
  for (const r of rankings) r.forEach((item, rank) => acc.set(item.idx, (acc.get(item.idx) || 0) + 1 / (k + rank + 1)))
  return Array.from(acc.entries())
    .map(([idx, score]) => ({ idx, score }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Гибридный поиск в пределах одного PDF: top-40 лексических + top-40 векторных → RRF → top-N.
 * hybrid=false или пустой queryText → прежнее чисто векторное поведение (мягкая деградация).
 * Реранкер (T2.1, опционально) подключается в этом же месте, когда доступна модель — сейчас
 * его отсутствие эквивалентно «гибрид без реранка».
 */
export function searchPdfHybrid(
  id: string,
  vector: number[] | undefined,
  queryText: string,
  opts?: { hybrid?: boolean; topN?: number }
): Array<{ page: number; text: string; score: number }> {
  const idx = loadIndex(id)
  if (!idx.chunks.length) return []
  const topN = Math.max(1, opts?.topN ?? 8)
  const hasVec = !!(vector && vector.length)
  const t0 = Date.now()
  if (opts?.hybrid === false || !(queryText || '').trim()) {
    const out = hasVec ? searchPdf(id, vector as number[], topN) : []
    console.log(`[rag] pdf ${id}: vector-only top=${out.length} за ${Date.now() - t0}мс`)
    return out
  }
  const tLex = Date.now()
  const lex = bm25Rank(idx.chunks, queryText, 40)
  const tVec = Date.now()
  const vec = hasVec ? vectorRank(idx.chunks, vector as number[], 40) : []
  const tMerge = Date.now()
  const merged = rrfMerge([vec, lex]).slice(0, topN)
  console.log(
    `[rag] pdf ${id}: hybrid lex=${lex.length}(${tVec - tLex}мс) vec=${vec.length}(${tMerge - tVec}мс) ` +
      `→ top=${merged.length}, всего ${Date.now() - t0}мс`
  )
  return merged.map((m) => ({ page: idx.chunks[m.idx].page, text: idx.chunks[m.idx].text, score: m.score }))
}

export function pdfFilePath(id: string): string {
  return pdfPath(id)
}

export function registerPdfIpc(getRag?: () => { hybrid: boolean; topN: number }): void {
  // Сохранить PDF на диск. Возвращает путь; id формирует renderer.
  ipcMain.handle('pdf:import', (_e, args: { base64: string; id: string }) => {
    try {
      const raw = args.base64.includes(',') ? args.base64.split(',').pop() || '' : args.base64
      writeFileSync(pdfPath(args.id), Buffer.from(raw, 'base64'))
      try {
        rmSync(indexPath(args.id), { force: true }) // свежий индекс
      } catch {
        /* ignore */
      }
      return { ok: true as const, id: args.id, path: pdfPath(args.id) }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  })

  // Отдать байты PDF (base64) для рендера в renderer через pdfjs.
  ipcMain.handle('pdf:bytes', (_e, args: { id: string }) => {
    try {
      if (!existsSync(pdfPath(args.id))) return { ok: false as const, error: 'PDF не найден на диске' }
      return { ok: true as const, base64: readFileSync(pdfPath(args.id)).toString('base64') }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  })

  // Добавить порцию чанков с уже посчитанными векторами.
  ipcMain.handle('pdf:index-add', (_e, args: { id: string; chunks: Chunk[] }) => {
    try {
      const idx = loadIndex(args.id)
      for (const c of args.chunks) {
        if (c.vector?.length) {
          idx.dim = c.vector.length
          idx.chunks.push(c)
        }
      }
      saveIndex(idx)
      return { ok: true as const, total: idx.chunks.length }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  })

  // Поиск строго в пределах одного pdf_id. С queryText и включённым гибридом (T2.1) —
  // BM25+вектор+RRF; иначе — чисто векторно (обратная совместимость).
  ipcMain.handle(
    'pdf:search',
    (_e, args: { id: string; vector: number[]; topK?: number; query?: string }) => {
      try {
        const rag = getRag?.() ?? { hybrid: true, topN: 8 }
        const topN = args.topK || rag.topN || 8
        if (args.query && args.query.trim()) {
          return { ok: true as const, chunks: searchPdfHybrid(args.id, args.vector, args.query, { hybrid: rag.hybrid, topN }) }
        }
        return { ok: true as const, chunks: searchPdf(args.id, args.vector, topN) }
      } catch (e) {
        return { ok: false as const, error: String(e) }
      }
    }
  )

  // Есть ли готовый индекс и сколько в нём чанков.
  ipcMain.handle('pdf:indexed', (_e, args: { id: string }) => {
    const idx = loadIndex(args.id)
    return { ok: true as const, indexed: existsSync(indexPath(args.id)), count: idx.chunks.length }
  })

  ipcMain.handle('pdf:delete', (_e, args: { id: string }) => {
    try {
      rmSync(pdfPath(args.id), { force: true })
      rmSync(indexPath(args.id), { force: true })
    } catch {
      /* ignore */
    }
    return { ok: true as const }
  })
}
