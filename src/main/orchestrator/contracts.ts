// ============================================================================
// Meta-Orchestrator — контракты (типы) уровня control-plane / data-plane.
// Единый источник правды для main-брокера, воркеров и режимов исполнения.
// ============================================================================

// --- Режимы исполнения (раздел 3 ТЗ) ---
export type ExecutionMode = 'pipeline' | 'council' | 'actor_critic' | 'ensemble' | 'recursive'

// --- Статусы подзадачи (раздел 2.4 / 5 ТЗ) ---
export type TaskStatus = 'pending' | 'running' | 'success' | 'failure' | 'partial' | 'needs_human_review'

// --- Критерий rubric для Actor-Critic (генерируется Planner'ом) ---
export type RubricCriterion = { criterion: string; weight: number }

// --- Узел дерева подзадач (выход Planner'а, раздел 2.3a) ---
export type TaskNode = {
  id: string
  description: string
  deps: string[] // id подзадач, от которых зависит (DAG)
  mode: ExecutionMode // предполагаемый режим (может уточнить modeSelector)
  success_criteria: string // явные критерии успеха
  rubric?: RubricCriterion[] // для actor_critic
  size: 'small' | 'medium' | 'large' // эвристика сложности (→ recursive)
}

export type TaskTree = {
  project_id: string
  goal: string
  tasks: TaskNode[]
}

// --- Бюджеты и лимиты (раздел 2.3c / 6 ТЗ) ---
export type Budget = {
  project_token_budget: number // общий потолок токенов проекта
  max_tokens_per_task: number
  max_iterations_per_mode: number // напр. Actor-Critic ≤ 5 раундов
  max_parallel_nodes: number
  max_recursion_depth: number // по умолчанию 3-4
}

export const DEFAULT_BUDGET: Budget = {
  project_token_budget: 200000,
  max_tokens_per_task: 40000,
  max_iterations_per_mode: 5,
  max_parallel_nodes: 3,
  max_recursion_depth: 4
}

// --- Контракт результата подзадачи (раздел 2.4 ТЗ) — «конверт» наверх ---
export type TaskResult = {
  task_id: string
  status: TaskStatus
  output_vault_key: string
  summary: string // короткое резюме, НЕ полный контент
  confidence: number // 0..1
  cost_spent: { tokens: number; calls: number }
  issues: string[]
}

// --- Команда control-plane (раздел 4 ТЗ) ---
export type ControlPlaneCommand = {
  command_id: string
  task_id: string
  mode: ExecutionMode
  participants: string[] // node_id из реестра
  context_refs: string[] // ключи Vault (НЕ сырые данные)
  role_prompts: Record<string, string>
  success_criteria: string
  rubric?: RubricCriterion[]
  budget: { max_tokens: number; max_iterations: number; max_depth: number }
  timeout_ms: number
  parent_command_id?: string
}

// --- Запись реестра узлов (раздел 2.1 ТЗ) ---
export type NodeRegistryEntry = {
  node_id: string
  type: string // writer | critic | researcher | coder | planner | synthesizer | selector | reviewer
  capabilities: string[]
  tools: string[]
  model: string // 'providerId::modelId'
  system_prompt: string // роль/системный промпт (нужен воркеру для вызова)
  cost_per_call_estimate: number
  avg_latency_ms: number
  max_context_tokens: number
  status: 'idle' | 'busy' | 'error' | 'disabled'
}

export type NodeRequirements = {
  type?: string
  capabilities?: string[]
}

// --- Запись трейса (раздел 5 ТЗ) ---
export type TraceEntry = {
  command_id: string
  task_id: string
  node_id: string
  mode: ExecutionMode | 'planner' | 'system'
  input_refs: string[]
  output_ref: string
  cost: { tokens: number; calls: number }
  duration_ms: number
  timestamp: number
  parent_command_id?: string
  note?: string
}

// --- Событие статуса подзадачи (для живой панели ноды) ---
export type StatusEvent = {
  project_id: string
  task_id: string
  status: TaskStatus
  mode?: ExecutionMode
  summary?: string
  depth: number
}

// --- Запрос human-in-the-loop (раздел 6 ТЗ) ---
export type HumanRequest = {
  request_id: string
  project_id: string
  task_id: string
  reason: string
  best_output_key: string
  best_summary: string
}
export type HumanDecision = { decision: 'approve' | 'reject' | 'edit'; feedback?: string }

// ============================================================================
// Runtime — абстракция «где исполняется оркестратор». Движок и режимы не знают,
// сидят они в воркере или в main: они работают только через этот интерфейс.
// В воркере Runtime — прокси через parentPort к main (см. worker.ts).
// ============================================================================
export type AiChatResult = { ok: true; content: string; totalTokens: number } | { ok: false; error: string }

export interface Runtime {
  projectId: string
  depth: number
  // Вызов модели (проходит через main-брокер → списание мастер-бюджета)
  aiChat(args: { model: string; messages: ChatMessage[]; images?: string[]; timeoutMs?: number }): Promise<AiChatResult>
  // Vault (data-plane)
  vaultWrite(key: string, content: string, metadata?: Record<string, unknown>): Promise<string>
  vaultRead(key: string): Promise<string | null>
  vaultReadMany(keys: string[]): Promise<Record<string, string>>
  vaultQuery(query: string, filters?: Record<string, unknown>): Promise<string[]>
  vaultAppendLog(taskId: string, event: unknown): Promise<void>
  // Реестр узлов
  findCandidates(req: NodeRequirements): Promise<NodeRegistryEntry[]>
  // Трейсинг
  trace(entry: TraceEntry): void
  status(ev: Omit<StatusEvent, 'project_id' | 'depth'>): void
  // Human-in-the-loop (блокирует ТОЛЬКО свою ветку)
  humanRequest(req: Omit<HumanRequest, 'request_id' | 'project_id'>): Promise<HumanDecision>
  // Рекурсия — попросить main заспавнить саб-оркестратор (worker-сиблинг)
  spawnSub(args: { goal: string; budget: Budget; materials: string[] }): Promise<TaskResult>
  // Отмена / исчерпание бюджета — проверять в циклах
  isCancelled(): boolean
  // Уникальные id
  newId(prefix: string): string
}

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

// ============================================================================
// Протокол сообщений worker ↔ main (через parentPort).
// req/res коррелируются по reqId. Fire-and-forget: trace / status.
// ============================================================================
export type WorkerToMain =
  | { t: 'aiChat'; reqId: string; model: string; messages: ChatMessage[]; images?: string[]; timeoutMs?: number }
  | { t: 'vaultWrite'; reqId: string; key: string; content: string; metadata?: Record<string, unknown> }
  | { t: 'vaultRead'; reqId: string; key: string }
  | { t: 'vaultReadMany'; reqId: string; keys: string[] }
  | { t: 'vaultQuery'; reqId: string; query: string; filters?: Record<string, unknown> }
  | { t: 'vaultAppendLog'; reqId: string; taskId: string; event: unknown }
  | { t: 'findCandidates'; reqId: string; req: NodeRequirements }
  | { t: 'spawnSub'; reqId: string; goal: string; budget: Budget; materials: string[] }
  | { t: 'humanRequest'; reqId: string; taskId: string; reason: string; best_output_key: string; best_summary: string }
  | { t: 'trace'; entry: TraceEntry }
  | { t: 'status'; ev: Omit<StatusEvent, 'project_id' | 'depth'> }
  | { t: 'result'; result: TaskResult }
  | { t: 'log'; message: string }

export type MainToWorker =
  | { t: 'aiChatRes'; reqId: string; res: AiChatResult }
  | { t: 'vaultWriteRes'; reqId: string; key: string }
  | { t: 'vaultReadRes'; reqId: string; content: string | null }
  | { t: 'vaultReadManyRes'; reqId: string; map: Record<string, string> }
  | { t: 'vaultQueryRes'; reqId: string; keys: string[] }
  | { t: 'vaultAppendLogRes'; reqId: string }
  | { t: 'findCandidatesRes'; reqId: string; entries: NodeRegistryEntry[] }
  | { t: 'spawnSubRes'; reqId: string; result: TaskResult }
  | { t: 'humanRequestRes'; reqId: string; decision: HumanDecision }

// Данные, передаваемые воркеру при старте
export type WorkerData = {
  projectId: string
  goal: string
  budget: Budget
  depth: number
  materials: string[] // ключи Vault с исходными материалами
  plannerModel: string
  branch: string // префикс task_id этой ветки (root = '', саб = 's{depth}_{n}~…') — уникальность id между ветками
  cancelBuf: SharedArrayBuffer // Int32Array[0] !== 0 → отмена всего прогона
}
