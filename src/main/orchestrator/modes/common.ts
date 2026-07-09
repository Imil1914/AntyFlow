// ============================================================================
// Общий контекст и помощники для всех режимов исполнения (раздел 3 ТЗ).
// Единый интерфейс режима: execute(ctx) -> TaskResult.
// ============================================================================
import type {
  Runtime,
  TaskNode,
  ControlPlaneCommand,
  NodeRegistryEntry,
  Budget,
  TaskResult,
  TaskStatus,
  ExecutionMode
} from '../contracts'
import { shortSummary } from '../util'

export type ModeContext = {
  rt: Runtime
  task: TaskNode
  command: ControlPlaneCommand
  candidates: NodeRegistryEntry[]
  budget: Budget
}

export type ModeFn = (ctx: ModeContext) => Promise<TaskResult>

// Загрузить контекст из ключей Vault (data-plane): узел получает ССЫЛКИ, а сам
// подгружает и держит контекст минимальным (передаём выдержки, не весь объём).
export async function loadContext(rt: Runtime, refs: string[], perRef = 1200): Promise<string> {
  if (!refs.length) return ''
  const map = await rt.vaultReadMany(refs)
  return Object.entries(map)
    .map(([k, v]) => `# ${k}\n${shortSummary(v, perRef)}`)
    .join('\n\n')
}

// Вызвать роль (реестровую запись) с её системным промптом.
export async function callRole(
  rt: Runtime,
  node: NodeRegistryEntry,
  userContent: string,
  opts: { extraSystem?: string; images?: string[]; timeoutMs?: number } = {}
): Promise<{ ok: boolean; content: string; tokens: number }> {
  const system = opts.extraSystem ? `${node.system_prompt}\n\n${opts.extraSystem}` : node.system_prompt
  const res = await rt.aiChat({
    model: node.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent }
    ],
    images: opts.images,
    timeoutMs: opts.timeoutMs ?? 120000
  })
  return res.ok ? { ok: true, content: res.content, tokens: res.totalTokens } : { ok: false, content: res.error, tokens: 0 }
}

// Ключ вывода по соглашению ТЗ 2.2.
export function outputKey(rt: Runtime, taskId: string, nodeId: string, iteration: number): string {
  return `project:${rt.projectId}/task:${taskId}/node:${nodeId}/output:${iteration}`
}

// Записать вывод в Vault и вернуть ключ.
export async function writeOutput(
  rt: Runtime,
  taskId: string,
  nodeId: string,
  iteration: number,
  content: string,
  meta: Record<string, unknown> = {}
): Promise<string> {
  const key = outputKey(rt, taskId, nodeId, iteration)
  await rt.vaultWrite(key, content, { taskId, nodeId, iteration, ...meta })
  return key
}

export function mkResult(
  taskId: string,
  status: TaskStatus,
  outputKey: string,
  content: string,
  cost: { tokens: number; calls: number },
  confidence: number,
  issues: string[] = []
): TaskResult {
  return {
    task_id: taskId,
    status,
    output_vault_key: outputKey,
    summary: shortSummary(content, 500),
    confidence,
    cost_spent: cost,
    issues
  }
}

// Записать трейс одного вызова (раздел 5 ТЗ).
export function traceCall(
  ctx: ModeContext,
  nodeId: string,
  mode: ExecutionMode,
  inputRefs: string[],
  outputRef: string,
  tokens: number,
  calls: number,
  durationMs: number,
  note?: string
): void {
  ctx.rt.trace({
    command_id: ctx.command.command_id,
    task_id: ctx.task.id,
    node_id: nodeId,
    mode,
    input_refs: inputRefs,
    output_ref: outputRef,
    cost: { tokens, calls },
    duration_ms: durationMs,
    timestamp: Date.now(),
    parent_command_id: ctx.command.parent_command_id,
    note
  })
}

// Выбрать реестровую запись нужного типа среди кандидатов (с фолбэком).
export function pick(ctx: ModeContext, type: string): NodeRegistryEntry {
  return (
    ctx.candidates.find((c) => c.type === type) ??
    ctx.candidates.find((c) => c.type === 'writer') ??
    ctx.candidates[0]
  )
}
