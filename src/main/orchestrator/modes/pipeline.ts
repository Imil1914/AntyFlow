// ============================================================================
// Pipeline (раздел 3.1 ТЗ). Линейная цепочка узлов: output[i] → input[i+1].
// Дефолт для задач без ветвления. Между стадиями передаём ссылку на предыдущий
// вывод (data-plane), а не тащим весь текст через оркестратор.
// ============================================================================
import type { TaskResult } from '../contracts'
import { type ModeContext, loadContext, callRole, writeOutput, mkResult, traceCall, pick } from './common'

export async function execute(ctx: ModeContext): Promise<TaskResult> {
  const { rt, task, command } = ctx
  ctx.rt.status({ task_id: task.id, status: 'running', mode: 'pipeline' })

  // Участники цепочки: если явно заданы — по ним; иначе один исполнитель.
  const stages =
    command.participants.length > 1
      ? command.participants.map((p) => ctx.candidates.find((c) => c.node_id === p) ?? pick(ctx, 'writer'))
      : [pick(ctx, seenTypes(ctx).has('coder') ? 'coder' : 'writer')]

  const baseContext = await loadContext(rt, command.context_refs)
  let prevRef = ''
  let lastContent = ''
  let tokens = 0
  let calls = 0
  const inputRefs = [...command.context_refs]

  for (let i = 0; i < stages.length; i++) {
    if (rt.isCancelled()) return mkResult(task.id, 'failure', prevRef, lastContent, { tokens, calls }, 0, ['cancelled'])
    const node = stages[i]
    const prevBlock = prevRef ? `\n\nВывод предыдущего этапа:\n${lastContent}` : ''
    const user =
      `Подзадача: ${task.description}\nКритерии успеха: ${task.success_criteria}` +
      (baseContext ? `\n\nКонтекст:\n${baseContext}` : '') +
      prevBlock
    const started = Date.now()
    const r = await callRole(rt, node, user, { timeoutMs: command.timeout_ms })
    calls++
    tokens += r.tokens
    lastContent = r.content
    prevRef = await writeOutput(rt, task.id, node.node_id, i, r.content, { stage: i })
    traceCall(ctx, node.node_id, 'pipeline', prevRef ? inputRefs.concat(i > 0 ? [prevRef] : []) : inputRefs, prevRef, r.tokens, 1, Date.now() - started, `этап ${i + 1}/${stages.length}`)
    if (!r.ok) return mkResult(task.id, 'failure', prevRef, lastContent, { tokens, calls }, 0.2, [r.content])
  }

  return mkResult(task.id, 'success', prevRef, lastContent, { tokens, calls }, 0.7)
}

function seenTypes(ctx: ModeContext): Set<string> {
  return new Set(ctx.candidates.map((c) => c.type))
}
