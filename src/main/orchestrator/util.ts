// ============================================================================
// Чистые утилиты worker-стороны (planner / engine / modes). Без зависимостей от
// electron — чтобы воркер бандлился отдельно и легко.
// ============================================================================

// Достать первый JSON-объект/массив из ответа модели (снимает ```json ... ``` и
// текст вокруг). Возвращает null, если не удалось распарсить.
export function extractJson<T = unknown>(text: string): T | null {
  if (!text) return null
  let s = text.trim()
  // убрать markdown-ограждения
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  // попробовать целиком
  try {
    return JSON.parse(s) as T
  } catch {
    /* ищем сбалансированный фрагмент ниже */
  }
  const start = s.search(/[[{]/)
  if (start < 0) return null
  const open = s[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(s.slice(start, i + 1)) as T
        } catch {
          return null
        }
      }
    }
  }
  return null
}

// Обёртка таймаута. По истечении ms — резолвит fallback (не бросает), чтобы
// deadlock одной команды не валил весь прогон (раздел 6 ТЗ).
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        resolve(fallback)
      }
    }, ms)
    p.then((v) => {
      if (!done) {
        done = true
        clearTimeout(timer)
        resolve(v)
      }
    }).catch(() => {
      if (!done) {
        done = true
        clearTimeout(timer)
        resolve(fallback)
      }
    })
  })
}

// Короткое резюме текста (для summary в TaskResult и обмена между раундами).
export function shortSummary(text: string, max = 500): string {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : t.slice(0, max) + '…'
}

// Оценка токенов, если провайдер не вернул usage (грубо ~4 символа/токен).
export function estimateTokens(...parts: string[]): number {
  const chars = parts.reduce((n, p) => n + (p ? p.length : 0), 0)
  return Math.ceil(chars / 4)
}
