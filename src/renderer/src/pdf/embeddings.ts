// Локальные эмбеддинги для RAG по PDF — через Transformers.js (тот же стек, что
// у голосового Whisper). Модель multilingual-e5-small понимает русский, качается
// один раз с HuggingFace и кэшируется в IndexedDB, дальше работает офлайн.
// Считаем в renderer, а готовые векторы отправляем в main для хранения.
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadEmbedder(onProgress?: (msg: string) => void): Promise<any> {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
      // Полная точность fp32 — максимальное качество эмбеддингов (без квантизации).
      dtype: 'fp32',
      device: 'wasm',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      progress_callback: (p: any) => {
        if (onProgress && p?.status === 'progress' && typeof p.progress === 'number') {
          onProgress(`⬇️ Модель эмбеддингов: ${Math.round(p.progress)}%`)
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }).catch((e: any) => {
      extractorPromise = null // сброс, чтобы повторная попытка перезагрузила
      throw e
    })
  }
  return extractorPromise
}

// e5-модели требуют префиксы: "passage: " для кусков документа, "query: " для запроса.
async function embed(text: string, kind: 'query' | 'passage'): Promise<number[]> {
  const extractor = await loadEmbedder()
  const res = await extractor(`${kind}: ${text}`, { pooling: 'mean', normalize: true })
  return Array.from(res.data as Float32Array)
}

export function embedQuery(text: string): Promise<number[]> {
  return embed(text, 'query')
}

// Эмбеддит массив кусков по одному, уступая поток UI между ними (не блокирует холст).
export async function embedPassages(
  texts: string[],
  onEach?: (done: number, total: number) => void
): Promise<number[][]> {
  await loadEmbedder()
  const out: number[][] = []
  for (let i = 0; i < texts.length; i++) {
    out.push(await embed(texts[i], 'passage'))
    onEach?.(i + 1, texts.length)
    await new Promise((r) => setTimeout(r, 0)) // уступаем событийный цикл
  }
  return out
}
