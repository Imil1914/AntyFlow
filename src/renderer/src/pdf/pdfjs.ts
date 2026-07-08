// Обёртка над pdf.js: загрузка PDF, рендер страниц в canvas, извлечение
// постраничного текста и чанкинг по смысловым границам (для RAG-индексации).
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
// Vite отдаёт воркер как URL; без него pdf.js не парсит документ.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PdfDoc = PDFDocumentProxy

export async function loadPdf(bytes: Uint8Array): Promise<PdfDoc> {
  return pdfjs.getDocument({ data: bytes }).promise
}

// Рендер страницы в переданный canvas. Возвращает css-размеры (для оверлеев).
export async function renderPage(
  pdf: PdfDoc,
  pageNum: number,
  canvas: HTMLCanvasElement,
  scale = 1.4
): Promise<{ width: number; height: number }> {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const ctx = canvas.getContext('2d')
  if (!ctx) return { width: viewport.width, height: viewport.height }
  canvas.width = viewport.width
  canvas.height = viewport.height
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport } as any).promise
  return { width: viewport.width, height: viewport.height }
}

// Текст страницы. Переносы строк — по заметным скачкам координаты Y.
export async function extractPageText(pdf: PdfDoc, pageNum: number): Promise<string> {
  const page = await pdf.getPage(pageNum)
  const tc = await page.getTextContent()
  let text = ''
  let lastY: number | null = null
  for (const it of tc.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = it as any
    if (typeof item.str !== 'string') continue
    const y = item.transform?.[5] ?? 0
    if (lastY !== null && Math.abs(y - lastY) > 4) text += '\n'
    text += item.str + ' '
    lastY = y
  }
  return text.replace(/[ \t]+/g, ' ').trim()
}

// Текст, попадающий в нормализованную рамку (0..1) на странице — чтобы у
// выделенной прямоугольником области был и визуальный хайлайт, и сам текст.
export async function textInBBox(
  pdf: PdfDoc,
  pageNum: number,
  bbox: { x: number; y: number; width: number; height: number }
): Promise<string> {
  const scale = 1.5
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const tc = await page.getTextContent()
  const parts: string[] = []
  for (const it of tc.items) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = it as any
    if (typeof item.str !== 'string' || !item.str.trim()) continue
    const t = pdfjs.Util.transform(viewport.transform, item.transform)
    const h = Math.hypot(t[2], t[3]) || 12
    const left = t[4]
    const top = t[5] - h
    const w = (item.width || 0) * scale
    const nx = left / viewport.width
    const ny = top / viewport.height
    const nw = w / viewport.width
    const nh = h / viewport.height
    const ix = Math.max(nx, bbox.x)
    const iy = Math.max(ny, bbox.y)
    const ax = Math.min(nx + nw, bbox.x + bbox.width)
    const ay = Math.min(ny + nh, bbox.y + bbox.height)
    if (ax > ix && ay > iy) parts.push(item.str)
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

// Чанкинг по абзацам с объединением мелких кусков (~700–1200 символов),
// а не по фиксированной длине — так эмбеддинги осмысленнее.
export function chunkText(text: string): string[] {
  const paras = text
    .split(/\n\s*\n|\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
  const chunks: string[] = []
  let cur = ''
  for (const p of paras) {
    if (cur && (cur + '\n' + p).length > 1200) {
      chunks.push(cur)
      cur = p
    } else {
      cur = cur ? cur + '\n' + p : p
    }
    if (cur.length >= 700) {
      chunks.push(cur)
      cur = ''
    }
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks
}
