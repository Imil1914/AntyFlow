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

export function pdfFilePath(id: string): string {
  return pdfPath(id)
}

export function registerPdfIpc(): void {
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

  // Поиск top-K строго в пределах одного pdf_id.
  ipcMain.handle('pdf:search', (_e, args: { id: string; vector: number[]; topK?: number }) => {
    try {
      return { ok: true as const, chunks: searchPdf(args.id, args.vector, args.topK || 5) }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  })

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
