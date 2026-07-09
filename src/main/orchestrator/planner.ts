// ============================================================================
// Planner (раздел 2.3a ТЗ). Декомпозирует проект в дерево подзадач (DAG) со
// строгими критериями успеха и предполагаемым режимом. Один модельный вызов;
// при сбое парсинга — безопасный фолбэк на одну pipeline-задачу.
// ============================================================================
import type { Runtime, TaskNode, ExecutionMode, RubricCriterion } from './contracts'
import { extractJson, shortSummary } from './util'

const MODES: ExecutionMode[] = ['pipeline', 'council', 'actor_critic', 'ensemble', 'recursive']

const PLANNER_SYSTEM =
  'Ты планировщик-архитектор мульти-агентной системы. Разбей проект на 2–6 подзадач в виде DAG. ' +
  'Для каждой укажи: id (короткий), description, deps (массив id зависимостей), mode (один из: ' +
  'pipeline — линейная генерация; actor_critic — нужна итеративная проверка качества; ' +
  'council — есть противоречивые требования/нужны разные точки зрения; ensemble — критично, нужна надёжность (best-of-n); ' +
  'recursive — подзадача сама огромная и требует своей декомпозиции), ' +
  'success_criteria (явные проверяемые критерии успеха), size (small|medium|large), ' +
  'и для actor_critic — rubric: массив {criterion, weight}. ' +
  'Отвечай СТРОГО валидным JSON вида: ' +
  '{"tasks":[{"id":"t1","description":"...","deps":[],"mode":"pipeline","success_criteria":"...","size":"small","rubric":[]}]}. ' +
  'Без пояснений, без markdown-ограждений.'

type RawTask = {
  id?: string
  description?: string
  deps?: string[]
  mode?: string
  success_criteria?: string
  size?: string
  rubric?: RubricCriterion[]
}

export async function plan(rt: Runtime, goal: string, materials: string[], plannerModel: string): Promise<TaskNode[]> {
  // Материалы передаём как КЛЮЧИ + краткие выдержки (data-plane: не сырой объём).
  let context = ''
  if (materials.length) {
    const map = await rt.vaultReadMany(materials)
    context =
      '\n\nИсходные материалы (выдержки):\n' +
      Object.entries(map)
        .map(([k, v]) => `- ${k}: ${shortSummary(v, 400)}`)
        .join('\n')
  }

  const started = Date.now()
  const res = await rt.aiChat({
    model: plannerModel,
    messages: [
      { role: 'system', content: PLANNER_SYSTEM },
      { role: 'user', content: `Проект: ${goal}${context}` }
    ],
    timeoutMs: 120000
  })

  let tasks: TaskNode[] = []
  if (res.ok) {
    const parsed = extractJson<{ tasks?: RawTask[] }>(res.content)
    if (parsed?.tasks?.length) tasks = normalize(parsed.tasks)
  }
  if (!tasks.length) tasks = fallback(goal)

  rt.trace({
    command_id: rt.newId('cmd'),
    task_id: 'planner',
    node_id: 'role:planner',
    mode: 'planner',
    input_refs: materials,
    output_ref: `project:${rt.projectId}/tree`,
    cost: { tokens: res.ok ? res.totalTokens : 0, calls: 1 },
    duration_ms: Date.now() - started,
    timestamp: Date.now(),
    note: `Планировщик выдал ${tasks.length} подзадач`
  })

  return tasks
}

// Привести сырой JSON к валидным TaskNode: чистим id, режимы, убираем битые deps и циклы.
function normalize(raw: RawTask[]): TaskNode[] {
  const nodes: TaskNode[] = raw
    .filter((t) => t && (t.id || t.description))
    .map((t, i) => ({
      id: (t.id || `t${i + 1}`).toString().trim(),
      description: (t.description || '').toString().trim() || `Подзадача ${i + 1}`,
      deps: Array.isArray(t.deps) ? t.deps.map((d) => String(d)) : [],
      mode: (MODES.includes(t.mode as ExecutionMode) ? t.mode : 'pipeline') as ExecutionMode,
      success_criteria: (t.success_criteria || 'Результат соответствует описанию подзадачи').toString(),
      size: (['small', 'medium', 'large'].includes(t.size as string) ? t.size : 'medium') as TaskNode['size'],
      rubric: Array.isArray(t.rubric) && t.rubric.length ? t.rubric : undefined
    }))
  const ids = new Set(nodes.map((n) => n.id))
  // Отбросить ссылки на несуществующие подзадачи
  for (const n of nodes) n.deps = n.deps.filter((d) => ids.has(d) && d !== n.id)
  // Разорвать циклы (простая проверка достижимости)
  removeCycles(nodes)
  return nodes
}

function removeCycles(nodes: TaskNode[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const state = new Map<string, number>() // 0 нет, 1 в стеке, 2 готово
  const visit = (id: string): void => {
    const n = byId.get(id)
    if (!n) return
    state.set(id, 1)
    for (const d of [...n.deps]) {
      const st = state.get(d) || 0
      if (st === 1) n.deps = n.deps.filter((x) => x !== d) // ребро назад → удаляем
      else if (st === 0) visit(d)
    }
    state.set(id, 2)
  }
  for (const n of nodes) if (!state.get(n.id)) visit(n.id)
}

function fallback(goal: string): TaskNode[] {
  return [
    {
      id: 't1',
      description: goal,
      deps: [],
      mode: 'pipeline',
      success_criteria: 'Задача выполнена согласно запросу',
      size: 'medium'
    }
  ]
}
