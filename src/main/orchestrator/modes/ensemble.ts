// ============================================================================
// Ensemble / Parallel (раздел 3.4 ТЗ). N узлов решают ОДНУ задачу независимо
// (без обмена мнениями, в отличие от Council). Selector выбирает лучший (best-of-n)
// по критериям успеха. Для повышения надёжности на критичных подзадачах.
// ============================================================================
import type { TaskResult } from '../contracts'
import { type ModeContext, loadContext, callRole, writeOutput, mkResult, traceCall, pick } from './common'
import { extractJson, shortSummary } from '../util'

const N = 3

export async function execute(ctx: ModeContext): Promise<TaskResult> {
  const { rt, task, command } = ctx
  rt.status({ task_id: task.id, status: 'running', mode: 'ensemble' })

  const worker = pick(ctx, 'writer')
  const baseContext = await loadContext(rt, command.context_refs)
  let tokens = 0
  let calls = 0

  // N независимых попыток (варьируем инструкцией, чтобы решения различались).
  const attempts = await Promise.all(
    Array.from({ length: N }, async (_, i) => {
      const user =
        `Подзадача: ${task.description}\nКритерии успеха: ${task.success_criteria}` +
        (baseContext ? `\n\nКонтекст:\n${baseContext}` : '') +
        `\n\n(Вариант ${i + 1}: предложи самостоятельное, отличное от других решение.)`
      const started = Date.now()
      const r = await callRole(rt, worker, user, { timeoutMs: command.timeout_ms })
      const key = await writeOutput(rt, task.id, `ensemble:${i}`, i, r.content, { variant: i })
      traceCall(ctx, `ensemble:${i}`, 'ensemble', command.context_refs, key, r.tokens, 1, Date.now() - started, `вариант ${i + 1}`)
      return { i, content: r.content, key, tokens: r.tokens, ok: r.ok }
    })
  )
  for (const a of attempts) {
    tokens += a.tokens
    calls++
  }
  const valid = attempts.filter((a) => a.ok && a.content.trim())
  if (!valid.length) return mkResult(task.id, 'failure', '', '', { tokens, calls }, 0, ['все варианты ensemble провалились'])
  if (valid.length === 1) return mkResult(task.id, 'success', valid[0].key, valid[0].content, { tokens, calls }, 0.6)

  // Selector: best-of-n, строгий JSON {choice, rationale}.
  const selector = pick(ctx, 'selector')
  const selUser =
    `Критерии успеха: ${task.success_criteria}\n\nКандидаты:\n` +
    valid.map((a, idx) => `### Кандидат ${idx}\n${shortSummary(a.content, 900)}`).join('\n\n') +
    '\n\nВыбери лучший кандидат. Ответь строго JSON: {"choice":<индекс>,"rationale":str}.'
  const started = Date.now()
  const s = await callRole(rt, selector, selUser, { timeoutMs: command.timeout_ms })
  calls++
  tokens += s.tokens
  const parsed = extractJson<{ choice?: number; rationale?: string }>(s.content)
  let idx = typeof parsed?.choice === 'number' ? parsed.choice : 0
  if (idx < 0 || idx >= valid.length) idx = 0
  const chosen = valid[idx]
  traceCall(ctx, selector.node_id, 'ensemble', valid.map((a) => a.key), chosen.key, s.tokens, 1, Date.now() - started, `выбран кандидат ${idx}`)

  return mkResult(task.id, 'success', chosen.key, chosen.content, { tokens, calls }, 0.8, parsed?.rationale ? [] : [])
}
