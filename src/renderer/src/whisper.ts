// Локальная транскрипция речи через Transformers.js (Whisper, ONNX/WASM).
// Модель качается с HuggingFace один раз при первом использовании и кэшируется
// (IndexedDB браузера Electron), дальше работает офлайн.
import { pipeline, env } from '@huggingface/transformers'

// Грузим модель только с хаба (не ищем локальные файлы в бандле).
env.allowLocalModels = false

type ProgressCb = (msg: string) => void

// Кэш пайплайна между вызовами — модель загружается один раз за сессию.
let transcriberPromise: Promise<any> | null = null

export function loadTranscriber(onProgress?: ProgressCb): Promise<any> {
  if (!transcriberPromise) {
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-base', {
      // fp32 — обходим битую q8/q4-квантизацию (ошибка "Missing required scale" в onnxruntime-web)
      dtype: 'fp32',
      device: 'wasm',
      progress_callback: (p: any) => {
        if (!onProgress) return
        if (p?.status === 'progress' && typeof p.progress === 'number') {
          onProgress(`⬇️ Загрузка модели Whisper: ${Math.round(p.progress)}%`)
        } else if (p?.status === 'ready') {
          onProgress('Модель готова')
        }
      }
    }).catch((e) => {
      // Сбрасываем кэш, чтобы следующая попытка перезагрузила модель
      transcriberPromise = null
      throw e
    })
  }
  return transcriberPromise
}

// Декодирует запись MediaRecorder (webm/opus и т.п.) в моно Float32 @ 16 кГц —
// формат, который ожидает Whisper.
async function blobToPcm16k(blob: Blob): Promise<Float32Array> {
  const arrayBuf = await blob.arrayBuffer()
  const AudioCtx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const decoded = await ctx.decodeAudioData(arrayBuf)
    const targetRate = 16000
    const frames = Math.max(1, Math.ceil(decoded.duration * targetRate))
    const offline = new OfflineAudioContext(1, frames, targetRate)
    const src = offline.createBufferSource()
    src.buffer = decoded
    src.connect(offline.destination)
    src.start()
    const rendered = await offline.startRendering()
    return rendered.getChannelData(0)
  } finally {
    await ctx.close().catch(() => {})
  }
}

// Полный путь: запись → PCM → текст. Язык по умолчанию — русский.
export async function transcribe(blob: Blob, onProgress?: ProgressCb): Promise<string> {
  const transcriber = await loadTranscriber(onProgress)
  const pcm = await blobToPcm16k(blob)
  // Диагностика: длительность и громкость записи
  let sum = 0
  for (let i = 0; i < pcm.length; i++) sum += pcm[i] * pcm[i]
  const rms = Math.sqrt(sum / (pcm.length || 1))
  console.log('[whisper] pcm samples:', pcm.length, 'sec:', (pcm.length / 16000).toFixed(2), 'rms:', rms.toFixed(4))
  if (pcm.length < 1600 || rms < 0.0008) {
    throw new Error('запись пустая/тихая — проверь микрофон и говори громче')
  }
  onProgress?.('🧠 Распознаю речь…')
  const out = await transcriber(pcm, {
    language: 'russian',
    task: 'transcribe',
    chunk_length_s: 30,
    return_timestamps: false
  })
  console.log('[whisper] raw result:', out)
  const text = Array.isArray(out) ? out.map((x: { text?: string }) => x.text || '').join(' ') : (out?.text ?? '')
  return String(text).trim()
}
