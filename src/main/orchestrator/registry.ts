// ============================================================================
// Node Registry — реестр агентов-узлов (раздел 2.1 ТЗ).
// Встроенные роль-шаблоны (system prompt + capabilities) образуют «холодный
// резерв»: их можно инстанцировать в любой момент под нужную модель. CRUD хранит
// пользовательские правки в userData/orchestrator/registry.json.
// ============================================================================
import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { NodeRegistryEntry, NodeRequirements } from './contracts'

// Базовые роли. Промпты держим лаконичными и «структурными»: критик и селектор
// ОБЯЗАНЫ отвечать строгим JSON (это опора Actor-Critic / Ensemble).
type RoleTemplate = { type: string; capabilities: string[]; system_prompt: string }

export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    type: 'planner',
    capabilities: ['decompose', 'plan', 'reason'],
    system_prompt:
      'Ты планировщик-архитектор. Декомпозируешь проект в дерево подзадач (DAG) со строгими критериями успеха. Отвечаешь ТОЛЬКО валидным JSON без пояснений.'
  },
  {
    type: 'writer',
    capabilities: ['generate', 'write', 'draft', 'summarize'],
    system_prompt:
      'Ты эксперт-исполнитель. Выполняешь поставленную подзадачу качественно и по существу, строго следуя критериям успеха. Без воды и без мета-комментариев.'
  },
  {
    type: 'critic',
    capabilities: ['evaluate', 'review', 'score'],
    system_prompt:
      'Ты строгий критик-оценщик. Оцениваешь результат по данной rubric. Отвечаешь ТОЛЬКО JSON: {"scores":[{"criterion":str,"score":0..1}],"overall":0..1,"pass":bool,"feedback":str}. feedback — конкретные исправления, не общие слова.'
  },
  {
    type: 'researcher',
    capabilities: ['research', 'gather', 'analyze'],
    system_prompt:
      'Ты исследователь. Собираешь и структурируешь факты по подзадаче, отмечаешь неопределённости. Кратко, по пунктам, с опорой на предоставленный контекст.'
  },
  {
    type: 'coder',
    capabilities: ['code', 'implement', 'debug'],
    system_prompt:
      'Ты инженер-программист. Пишешь корректный, самодостаточный код под задачу. Возвращаешь только код и краткое пояснение к нему.'
  },
  {
    type: 'synthesizer',
    capabilities: ['synthesize', 'merge', 'reconcile'],
    system_prompt:
      'Ты синтезатор. Сводишь несколько мнений/черновиков в одно связное решение, разрешая противоречия явно. Итог — единый цельный результат.'
  },
  {
    type: 'selector',
    capabilities: ['select', 'compare', 'vote'],
    system_prompt:
      'Ты арбитр. Из нескольких кандидатов выбираешь лучший по критериям успеха. Отвечаешь ТОЛЬКО JSON: {"choice":<индекс с 0>,"rationale":str}.'
  },
  {
    type: 'reviewer',
    capabilities: ['review', 'risk', 'critique'],
    system_prompt:
      'Ты ревьюер рисков. Ищешь слабые места, риски и упущения в результате. Отвечаешь кратким структурированным списком проблем и рекомендаций.'
  }
]

function regPath(): string {
  return join(app.getPath('userData'), 'orchestrator', 'registry.json')
}

// Инстанцировать роли под конкретную модель (холодный резерв → активные записи).
function seed(defaultModel: string): NodeRegistryEntry[] {
  return ROLE_TEMPLATES.map((r) => ({
    node_id: `role:${r.type}`,
    type: r.type,
    capabilities: r.capabilities,
    tools: [],
    model: defaultModel,
    system_prompt: r.system_prompt,
    cost_per_call_estimate: 1500,
    avg_latency_ms: 4000,
    max_context_tokens: 64000,
    status: 'idle'
  }))
}

// Полный реестр: сохранённые пользователем записи + недостающие роли-дефолты.
export function getRegistry(defaultModel: string): NodeRegistryEntry[] {
  let saved: NodeRegistryEntry[] = []
  try {
    if (existsSync(regPath())) saved = JSON.parse(readFileSync(regPath(), 'utf-8')) as NodeRegistryEntry[]
  } catch {
    saved = []
  }
  const byId = new Map(saved.map((e) => [e.node_id, e]))
  for (const s of seed(defaultModel)) {
    const ex = byId.get(s.node_id)
    if (!ex) byId.set(s.node_id, s)
    // если у сохранённой записи не задана модель — подставляем текущую дефолтную
    else if (!ex.model) byId.set(s.node_id, { ...ex, model: defaultModel })
  }
  return [...byId.values()]
}

// CRUD: сохранить/обновить запись
export function upsertNode(entry: NodeRegistryEntry): void {
  const list = getRegistry(entry.model || '')
  const idx = list.findIndex((e) => e.node_id === entry.node_id)
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  try {
    writeFileSync(regPath(), JSON.stringify(list, null, 2), 'utf-8')
  } catch {
    /* ignore */
  }
}

export function removeNode(nodeId: string): void {
  const list = getRegistry('').filter((e) => e.node_id !== nodeId)
  try {
    writeFileSync(regPath(), JSON.stringify(list, null, 2), 'utf-8')
  } catch {
    /* ignore */
  }
}

// find_candidates(task_requirements) → подходящие узлы (раздел 2.1 ТЗ).
export function findCandidates(req: NodeRequirements, defaultModel: string): NodeRegistryEntry[] {
  const all = getRegistry(defaultModel).filter((e) => e.status !== 'disabled')
  const scored = all
    .map((e) => {
      let score = 0
      if (req.type && e.type === req.type) score += 10
      if (req.capabilities) for (const c of req.capabilities) if (e.capabilities.includes(c)) score += 2
      return { e, score }
    })
    .filter((s) => (req.type || req.capabilities ? s.score > 0 : true))
    .sort((a, b) => b.score - a.score)
  return scored.map((s) => s.e)
}

// Достать конкретную роль (с фолбэком на writer, если роль неизвестна).
export function roleNode(type: string, defaultModel: string): NodeRegistryEntry {
  const all = getRegistry(defaultModel)
  return all.find((e) => e.type === type) ?? all.find((e) => e.type === 'writer') ?? all[0]
}
