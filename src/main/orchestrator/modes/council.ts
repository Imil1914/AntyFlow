// ============================================================================
// Council (раздел 3.2 ТЗ). N ролей отвечают параллельно, каждая — своя точка
// зрения. Между раундами передаём ТОЛЬКО summary (иначе контекст растёт линейно
// с числом участников). Финализация — synthesizer сводит мнения в одно решение.
// ============================================================================
import type { TaskResult, NodeRegistryEntry } from '../contracts'
import { type ModeContext, loadContext, callRole, writeOutput, mkResult, traceCall, pick } from './common'
import { shortSummary } from '../util'

const PERSPECTIVES = [
  { key: 'optimist', label: 'сторонник', system: 'Твоя роль в совете — сторонник: обоснуй лучшее решение и его сильные стороны.' },
  { key: 'risk', label: 'критик рисков', system: 'Твоя роль в совете — критик рисков: вскрой слабые места, риски и подводные камни.' },
  { key: 'expert', label: 'эксперт', system: 'Твоя роль в совете — предметный эксперт: дай технически точную, взвешенную позицию.' }
]

const REVISION_ROUNDS = 1

export async function execute(ctx: ModeContext): Promise<TaskResult> {
  const { rt, task, command } = ctx
  rt.status({ task_id: task.id, status: 'running', mode: 'council' })

  const baseContext = await loadContext(rt, command.context_refs)
  const memberNode: NodeRegistryEntry = pick(ctx, 'writer')
  let tokens = 0
  let calls = 0

  // Раунд 1: параллельные мнения.
  let opinions = await Promise.all(
    PERSPECTIVES.map(async (p) => {
      const user =
        `Подзадача: ${task.description}\nКритерии успеха: ${task.success_criteria}` +
        (baseContext ? `\n\nКонтекст:\n${baseContext}` : '')
      const started = Date.now()
      const r = await callRole(rt, memberNode, user, { extraSystem: p.system, timeoutMs: command.timeout_ms })
      const key = await writeOutput(rt, task.id, `council:${p.key}`, 0, r.content, { perspective: p.key })
      traceCall(ctx, `council:${p.key}`, 'council', command.context_refs, key, r.tokens, 1, Date.now() - started, `мнение: ${p.label}`)
      return { p, content: r.content, key, tokens: r.tokens }
    })
  )
  for (const o of opinions) {
    tokens += o.tokens
    calls++
  }

  // Раунды ревизии: каждый видит SUMMARY остальных (не полный текст).
  for (let round = 1; round <= REVISION_ROUNDS; round++) {
    if (rt.isCancelled()) break
    const revised = await Promise.all(
      opinions.map(async (o, idx) => {
        const others = opinions
          .filter((_, j) => j !== idx)
          .map((x) => `[${x.p.label}]: ${shortSummary(x.content, 300)}`)
          .join('\n')
        const user =
          `Подзадача: ${task.description}\nКритерии успеха: ${task.success_criteria}\n\n` +
          `Краткие позиции коллег:\n${others}\n\nТвоя прошлая позиция:\n${shortSummary(o.content, 400)}\n\n` +
          'Пересмотри и при необходимости уточни свою позицию.'
        const started = Date.now()
        const r = await callRole(rt, memberNode, user, { extraSystem: o.p.system, timeoutMs: command.timeout_ms })
        const key = await writeOutput(rt, task.id, `council:${o.p.key}`, round, r.content, { perspective: o.p.key, round })
        traceCall(ctx, `council:${o.p.key}`, 'council', [o.key], key, r.tokens, 1, Date.now() - started, `ревизия ${round}: ${o.p.label}`)
        return { p: o.p, content: r.content, key, tokens: r.tokens }
      })
    )
    for (const o of revised) {
      tokens += o.tokens
      calls++
    }
    opinions = revised
  }

  // Финализация: synthesizer сводит всё в одно решение.
  const synth = pick(ctx, 'synthesizer')
  const synthUser =
    `Подзадача: ${task.description}\nКритерии успеха: ${task.success_criteria}\n\n` +
    'Позиции совета:\n' +
    opinions.map((o) => `## ${o.p.label}\n${o.content}`).join('\n\n') +
    '\n\nСведи это в единое связное решение, явно разрешив противоречия.'
  const started = Date.now()
  const s = await callRole(rt, synth, synthUser, { timeoutMs: command.timeout_ms })
  calls++
  tokens += s.tokens
  const finalKey = await writeOutput(rt, task.id, synth.node_id, 0, s.content, { role: 'synthesizer' })
  traceCall(ctx, synth.node_id, 'council', opinions.map((o) => o.key), finalKey, s.tokens, 1, Date.now() - started, 'синтез решения')

  return mkResult(task.id, s.ok ? 'success' : 'partial', finalKey, s.content, { tokens, calls }, s.ok ? 0.75 : 0.4, s.ok ? [] : [s.content])
}
