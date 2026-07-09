// ============================================================================
// Actor-Critic (раздел 3.3 ТЗ). Actor генерирует → Critic оценивает по rubric
// (строгий JSON) → при недоборе порога возврат с конкретным фидбеком. Жёсткий
// лимит итераций; при исчерпании — needs_human_review (НЕ молчаливый выход).
// Rubric — из задачи (Planner), не изобретается на лету.
// ============================================================================
import type { TaskResult, RubricCriterion } from '../contracts'
import { type ModeContext, loadContext, callRole, writeOutput, mkResult, traceCall, pick } from './common'
import { extractJson } from '../util'

const THRESHOLD = 0.75

type CriticVerdict = {
  scores?: Array<{ criterion: string; score: number }>
  overall?: number
  pass?: boolean
  feedback?: string
}

const DEFAULT_RUBRIC: RubricCriterion[] = [
  { criterion: 'Соответствие критериям успеха', weight: 2 },
  { criterion: 'Полнота и корректность', weight: 1 },
  { criterion: 'Ясность изложения', weight: 1 }
]

export async function execute(ctx: ModeContext): Promise<TaskResult> {
  const { rt, task, command } = ctx
  rt.status({ task_id: task.id, status: 'running', mode: 'actor_critic' })

  const actor = pick(ctx, 'writer')
  const critic = pick(ctx, 'critic')
  const rubric = task.rubric && task.rubric.length ? task.rubric : DEFAULT_RUBRIC
  const rubricText = rubric.map((r) => `- ${r.criterion} (вес ${r.weight})`).join('\n')
  const baseContext = await loadContext(rt, command.context_refs)
  const maxIter = Math.max(1, command.budget.max_iterations)

  let tokens = 0
  let calls = 0
  let feedback = ''
  let bestContent = ''
  let bestKey = ''
  let bestOverall = -1

  for (let iter = 0; iter < maxIter; iter++) {
    if (rt.isCancelled()) break

    // --- Actor ---
    const actorUser =
      `Подзадача: ${task.description}\nКритерии успеха: ${task.success_criteria}` +
      (baseContext ? `\n\nКонтекст:\n${baseContext}` : '') +
      (feedback ? `\n\nЗамечания критика (учти и исправь):\n${feedback}` : '')
    let started = Date.now()
    const a = await callRole(rt, actor, actorUser, { timeoutMs: command.timeout_ms })
    calls++
    tokens += a.tokens
    const actorKey = await writeOutput(rt, task.id, actor.node_id, iter, a.content, { role: 'actor' })
    traceCall(ctx, actor.node_id, 'actor_critic', command.context_refs, actorKey, a.tokens, 1, Date.now() - started, `actor итерация ${iter + 1}`)
    if (!a.ok) {
      feedback = `Ошибка генерации: ${a.content}`
      continue
    }

    // --- Critic ---
    const criticUser =
      `Оцени результат по rubric. Верни строгий JSON.\n\nRubric:\n${rubricText}\n\n` +
      `Критерии успеха задачи: ${task.success_criteria}\n\nРезультат:\n${a.content}`
    started = Date.now()
    const c = await callRole(rt, critic, criticUser, { timeoutMs: command.timeout_ms })
    calls++
    tokens += c.tokens
    const verdict = extractJson<CriticVerdict>(c.content) || {}
    const overall = clamp(typeof verdict.overall === 'number' ? verdict.overall : verdict.pass ? 1 : 0)
    const criticKey = await writeOutput(rt, task.id, critic.node_id, iter, c.content, { role: 'critic', overall })
    traceCall(ctx, critic.node_id, 'actor_critic', [actorKey], criticKey, c.tokens, 1, Date.now() - started, `critic оценка ${overall.toFixed(2)}`)

    if (overall > bestOverall) {
      bestOverall = overall
      bestContent = a.content
      bestKey = actorKey
    }

    if (overall >= THRESHOLD || verdict.pass === true) {
      return mkResult(task.id, 'success', actorKey, a.content, { tokens, calls }, overall)
    }
    feedback = verdict.feedback || 'Качество ниже порога — улучши по rubric.'
  }

  // Лимит исчерпан → эскалация человеку (раздел 6 ТЗ).
  return mkResult(
    task.id,
    'needs_human_review',
    bestKey,
    bestContent,
    { tokens, calls },
    Math.max(0, bestOverall),
    [`Actor-Critic не достиг порога ${THRESHOLD} за ${maxIter} итераций (лучшая оценка ${Math.max(0, bestOverall).toFixed(2)})`]
  )
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n))
}
