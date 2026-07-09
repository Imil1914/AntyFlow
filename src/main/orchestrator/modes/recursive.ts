// ============================================================================
// Recursive Decomposition (раздел 3.5 ТЗ). Крупная подзадача делегируется
// саб-оркестратору (отдельный worker — см. брокер) с урезанным scope и бюджетом.
// Результат — контракт TaskResult, интегрируется родителем.
// ============================================================================
import type { TaskResult } from '../contracts'
import { type ModeContext, writeOutput, mkResult, traceCall } from './common'
import { deriveSubBudget } from '../budget'

export async function execute(ctx: ModeContext): Promise<TaskResult> {
  const { rt, task, command } = ctx
  rt.status({ task_id: task.id, status: 'running', mode: 'recursive' })

  // Урезанный бюджет для ветки (раздел 2.3d ТЗ). Материалы передаём ССЫЛКАМИ.
  const subBudget = deriveSubBudget(ctx.budget, command.budget.max_tokens || ctx.budget.max_tokens_per_task * 2)
  const started = Date.now()

  const sub = await rt.spawnSub({
    goal: `${task.description}\n\nКритерии успеха: ${task.success_criteria}`,
    budget: subBudget,
    materials: command.context_refs
  })

  // Интеграция: перечитываем вывод саб-оркестратора и переписываем под ключ этой
  // подзадачи, чтобы зависимые узлы родителя ссылались на стабильный ключ.
  let content = ''
  if (sub.output_vault_key) {
    const raw = await rt.vaultRead(sub.output_vault_key)
    content = raw ?? sub.summary
  } else {
    content = sub.summary
  }
  const key = await writeOutput(rt, task.id, 'sub-orchestrator', 0, content, {
    sub_status: sub.status,
    sub_output: sub.output_vault_key
  })
  traceCall(ctx, 'sub-orchestrator', 'recursive', command.context_refs, key, sub.cost_spent.tokens, sub.cost_spent.calls, Date.now() - started, `саб-оркестратор: ${sub.status}`)

  // Статус подзадачи наследует статус саб-оркестратора (needs_human_review пробрасывается).
  return mkResult(task.id, sub.status, key, content, sub.cost_spent, sub.confidence, sub.issues)
}
