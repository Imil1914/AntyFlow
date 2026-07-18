// ============================================================================
// Веб-сборка: оркестратор строит УПОРЯДОЧЕННЫЙ набор артефактов проекта на доске,
// делегируя генерацию сильным веб-моделям (ChatGPT/Gemini/GLM с логином, round-robin),
// а при пустом ответе webview — падая на локальную API-модель. Так результат
// предсказуемо orderly ВСЕГДА: обзор решений (таблица), что учитывать (список),
// требования (список), архитектура (Mermaid-схема), канбан по неделям, ТЗ по неделям
// (документ), метрики (таблица), риски (заметка).
//
// Раньше план артефактов генерировала сама веб-модель — одна ошибка парсинга JSON
// обрушивала всё в «один документ». Теперь план ФИКСИРОВАННЫЙ (blueprint), а модель
// лишь наполняет каждый артефакт по строгой схеме типа. Ноды создаются ОДНОЙ пачкой
// → кластеры по группам. Опирается на сводку ресерч-фазы (context).
// ============================================================================
import type { Runtime, BoardNodeSpec, TaskResult } from './contracts'
import { extractJson } from './util'

// mode: 'gen' — содержимое генерирует модель; 'seed' — нода создаётся засеянной (готова к запуску).
type Blueprint = { type: string; title: string; group: string; ask: string; mode: 'gen' | 'seed' }

// Фиксированный НУМЕРОВАННЫЙ набор артефактов для «визуализируй/спланируй мой проект».
// Порядок = порядок выполнения (что делать сначала, что потом). Задействованы РАЗНЫЕ типы нод.
const BLUEPRINT: Blueprint[] = [
  {
    mode: 'gen',
    type: 'table',
    group: 'Ресерч',
    title: 'Обзор существующих решений',
    ask: 'Сравни существующие подходы/работы/продукты, релевантные проекту (опирайся на контекст ресерча). Столбцы: «Решение/Работа», «Подход/метод», «Данные/входы», «Результаты/метрики», «Ограничения». Реальные примеры.'
  },
  {
    mode: 'gen',
    type: 'list',
    group: 'Ресерч',
    title: 'Что учитывать и чего избегать',
    ask: 'Ключевые факторы успеха и типичные ошибки/подводные камни для этого проекта. Группы: «Учитывать», «Избегать», «Открытые вопросы».'
  },
  {
    mode: 'seed',
    type: 'search',
    group: 'Ресерч',
    title: 'Веб-поиск по теме',
    ask: 'Готовый поисковый запрос по теме проекта.'
  },
  {
    mode: 'gen',
    type: 'list',
    group: 'Требования',
    title: 'Требования к реализации',
    ask: 'Функциональные и нефункциональные требования. Группы-категории по смыслу проекта (напр. Данные, Модель/методы, Интерфейс, Инфраструктура, Валидация/метрики).'
  },
  {
    mode: 'gen',
    type: 'diagram',
    group: 'Архитектура',
    title: 'Архитектура решения',
    ask: 'Схема сквозного пайплайна от входных данных до результата/интерфейса. Mermaid flowchart с русскими подписями.'
  },
  {
    mode: 'gen',
    type: 'kanban',
    group: 'План',
    title: 'Канбан: план на 8 недель',
    ask: 'Детальный план работ на 2 месяца по неделям до MVP.'
  },
  {
    mode: 'gen',
    type: 'doc',
    group: 'ТЗ',
    title: 'Техническое задание (MVP за 2 месяца)',
    ask: 'Подробное ТЗ: цель и объём MVP; входные данные; методы/модель; метрики качества; архитектура; понедельный план (раздел на каждую из 8 недель); критерии приёмки; риски. Максимально конкретно по теме проекта.'
  },
  {
    mode: 'gen',
    type: 'table',
    group: 'План',
    title: 'Метрики и критерии MVP',
    ask: 'Таблица метрик и целевых значений. Столбцы: «Показатель», «Как измеряем», «Baseline», «Цель MVP».'
  },
  {
    mode: 'gen',
    type: 'notebook',
    group: 'Прототип',
    title: 'Ноутбук: прототип модели',
    ask: 'Рабочий прототип ключевой части решения (напр. загрузка данных, признаки, обучение baseline-модели, оценка).'
  },
  {
    mode: 'seed',
    type: 'deck',
    group: 'Презентация',
    title: 'Презентация проекта',
    ask: 'Тема презентации проекта.'
  },
  {
    mode: 'seed',
    type: 'ai',
    group: 'Помощник',
    title: 'ИИ-ассистент по проекту',
    ask: 'Помогай по реализации проекта: планирование, код, метрики, вопросы по теме.'
  },
  {
    mode: 'gen',
    type: 'note',
    group: 'План',
    title: 'Риски и как их снижать',
    ask: 'Ключевые риски проекта и меры их снижения — кратко, по пунктам.'
  }
]

// Тип артефакта → kind ноды.
const TYPE_MAP: Record<string, BoardNodeSpec['kind']> = {
  kanban: 'kanban',
  table: 'sheet',
  sheet: 'sheet',
  list: 'list',
  doc: 'doc',
  diagram: 'diagram',
  notebook: 'notebook',
  deck: 'deck',
  search: 'search',
  ai: 'ai',
  note: 'note'
}

// По каким веб-моделям раскидываем (round-robin). App-обработчик берёт указанного
// провайдера, а если он не открыт — первую доступную веб-ноду.
const PROVIDERS = ['webgemini', 'webglm', 'webgpt']

async function askWeb(rt: Runtime, prompt: string, provider?: string, timeoutMs = 150000): Promise<{ text: string; provider?: string }> {
  try {
    const r = await rt.webLLMAsk({ prompt, provider, timeoutMs })
    return { text: r.ok ? (r.text || '').trim() : '', provider: r.provider }
  } catch {
    return { text: '' }
  }
}

function stripFences(s: string): string {
  return String(s || '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .trim()
}

function genPrompt(goal: string, kind: BoardNodeSpec['kind'], d: Blueprint, context: string): string {
  const head =
    `Проект: ${goal}\n` +
    (context ? `Контекст из ресерча статей (используй факты отсюда):\n${context.slice(0, 1500)}\n` : '') +
    `\nСоздаём артефакт: «${d.title}».\nЧто нужно (следуй строго): ${d.ask}\n\n`
  if (kind === 'kanban') {
    return (
      head +
      'Собери ПОДРОБНУЮ канбан-доску-план. Ответь СТРОГО ОДНИМ JSON без пояснений:\n' +
      '{"columns":[{"name":"Неделя 1 — <кратко цель недели>","cards":["конкретная задача с деталями","…"]}]}\n' +
      'Колонки = 8 недель («Неделя 1»…«Неделя 8»), в названии колонки — цель недели. В КАЖДОЙ неделе 5–8 КОНКРЕТНЫХ ' +
      'задач с деталями (что именно сделать и какой результат), реальные шаги по сути проекта — без общих фраз и заглушек.'
    )
  }
  if (kind === 'notebook') {
    return (
      head +
      'Собери Jupyter-ноутбук — рабочий прототип. Ответь СТРОГО ОДНИМ JSON без пояснений:\n' +
      '{"cells":[{"type":"markdown","source":"## Заголовок и пояснение"},{"type":"code","source":"# полный код\\nimport numpy as np"}]}\n' +
      'Требования: перед КАЖДЫМ блоком кода — markdown-ячейка с объяснением что и зачем; код ПОЛНЫЙ, рабочий, ' +
      'с подробными комментариями на русском; 8–14 ячеек; НИКАКИХ сокращений вроде «...» или «# ваш код здесь».'
    )
  }
  if (kind === 'sheet') {
    return (
      head +
      'Собери ТАБЛИЦУ с реальными данными. Ответь СТРОГО ОДНИМ JSON без пояснений:\n' +
      '{"headers":["Столбец 1","Столбец 2"],"rows":[["ячейка","ячейка"]]}\n' +
      '≥5 строк, число ячеек в строке = числу заголовков, содержательные значения по сути задачи.'
    )
  }
  if (kind === 'list') {
    return (
      head +
      'Собери СГРУППИРОВАННЫЙ СПИСОК. Ответь СТРОГО ОДНИМ JSON без пояснений:\n' +
      '{"title":"Заголовок","groups":[{"name":"Категория","items":["пункт","пункт"]}]}\n' +
      '3–7 категорий с конкретными реальными пунктами.'
    )
  }
  if (kind === 'diagram') {
    return (
      head +
      'Нарисуй СХЕМУ на Mermaid (flowchart TD или LR). Подписи узлов — на русском. ' +
      'Верни ТОЛЬКО валидный код Mermaid, без markdown-ограждений и без пояснений.'
    )
  }
  if (kind === 'doc') {
    return (
      head +
      'Напиши ПОЛНЫЙ, подробный документ в Markdown (заголовки, списки, таблицы, при нужде формулы $…$). ' +
      'Если нужна разбивка по неделям/этапам — раздел на каждую. Глубоко и конкретно. ' +
      'Ответь ТОЛЬКО Markdown-документом (без пояснений о процессе).'
    )
  }
  return head + 'Напиши содержательную заметку по сути (Markdown, по пунктам, без пояснений о процессе).'
}

// Сгенерировать содержимое артефакта: сперва веб-модель, при пустом ответе — API-модель.
async function genArtifact(
  rt: Runtime,
  goal: string,
  kind: BoardNodeSpec['kind'],
  d: Blueprint,
  context: string,
  provider: string
): Promise<{ text: string; via: string }> {
  const prompt = genPrompt(goal, kind, d, context)
  const w = await askWeb(rt, prompt, provider, 150000)
  if (w.text && w.text.length > 30) return { text: w.text, via: w.provider || 'веб' }
  // Фолбэк: локальная API-модель (надёжно возвращает текст/JSON).
  const a = await rt.aiChat({ model: '', messages: [{ role: 'user', content: prompt }], timeoutMs: 120000 })
  return { text: a.ok ? a.content.trim() : '', via: 'api' }
}

// Разобрать ответ в спеку ноды под тип. Не распозналось — кладём документом (не теряем).
function parseArtifact(kind: BoardNodeSpec['kind'], d: Blueprint, text: string): BoardNodeSpec | null {
  const title = d.title.slice(0, 100)
  const facet = d.group
  if (!text.trim()) return null
  if (kind === 'kanban') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = extractJson<any>(text)
    const cols = j?.columns || j?.kanban?.columns
    if (Array.isArray(cols) && cols.length) return { kind: 'kanban', title, facet, data: { columns: cols } }
    return { kind: 'doc', title, facet, body: stripFences(text).slice(0, 12000) }
  }
  if (kind === 'sheet') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = extractJson<any>(text)
    if (j && (Array.isArray(j.rows) || Array.isArray(j.headers))) return { kind: 'sheet', title, facet, data: { headers: j.headers, rows: j.rows } }
    return { kind: 'doc', title, facet, body: stripFences(text).slice(0, 12000) }
  }
  if (kind === 'list') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = extractJson<any>(text)
    const groups = j?.groups || j?.list?.groups
    if (Array.isArray(groups) && groups.length) return { kind: 'list', title, facet, data: { title: j?.title || title, groups } }
    return { kind: 'doc', title, facet, body: stripFences(text).slice(0, 12000) }
  }
  if (kind === 'diagram') {
    const code = stripFences(text)
    if (/\b(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|mindmap)\b/i.test(code)) {
      return { kind: 'diagram', title, facet, body: code.slice(0, 8000) }
    }
    return { kind: 'doc', title, facet, body: code.slice(0, 12000) }
  }
  if (kind === 'notebook') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = extractJson<any>(text)
    const cells = j?.cells
    if (Array.isArray(cells) && cells.length) return { kind: 'notebook', title, facet, data: { cells } }
    // не распознали ячейки — кладём код документом, чтобы не потерять
    return { kind: 'doc', title, facet, body: stripFences(text).slice(0, 12000) }
  }
  if (kind === 'doc') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = extractJson<any>(text)
    const md = j && (j.markdown || j.text) ? j.markdown || j.text : stripFences(text)
    return { kind: 'doc', title, facet, body: String(md).slice(0, 12000) }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j = extractJson<any>(text)
  const t = j && (j.text || j.note) ? j.text || j.note : stripFences(text)
  return { kind: 'note', title, facet, body: String(t).slice(0, 4000) }
}

function mkResult(summary: string, calls: number, key: string): TaskResult {
  return { task_id: 'root', status: 'success', output_vault_key: key, summary, confidence: 0.8, cost_spent: { tokens: 0, calls }, issues: [] }
}

// Засеянная нода (без вызова модели): поиск/презентация/ИИ-ассистент — создаём готовыми
// к запуску, с осмысленным body (запрос/тема/промпт), пользователь жмёт «сгенерировать».
function seedSpec(kind: BoardNodeSpec['kind'], d: Blueprint, goal: string, title: string): BoardNodeSpec {
  const g = goal.slice(0, 220)
  if (kind === 'search') return { kind: 'search', title, facet: d.group, body: goal.slice(0, 120) }
  if (kind === 'deck') return { kind: 'deck', title, facet: d.group, body: `Презентация проекта: ${g}` }
  if (kind === 'ai') return { kind: 'ai', title, facet: d.group, body: `Ты эксперт по проекту: ${g}. ${d.ask}` }
  return { kind: 'note', title, facet: d.group, body: d.ask }
}

// Главная фаза. Строит фиксированный blueprint, наполняя веб-моделями (fallback API).
// { ran:false } только если вообще ничего не удалось построить.
export async function webBuildPhase(rt: Runtime, goal: string, context = ''): Promise<{ ran: boolean; result?: TaskResult }> {
  const started = Date.now()
  rt.status({ task_id: '__webbuild__', status: 'running', summary: 'Веб-сборка: делегирую артефакты веб-моделям…' })

  const specs: BoardNodeSpec[] = []
  const kinds: Record<string, number> = {}
  const providersUsed = new Set<string>()
  let apiFallbacks = 0
  let calls = 0
  let genProvider = 0 // round-robin только по gen-артефактам
  for (let i = 0; i < BLUEPRINT.length; i++) {
    if (rt.isCancelled()) break
    const d = BLUEPRINT[i]
    const kind = TYPE_MAP[d.type] || 'note'
    // Нумерация артефактов = порядок выполнения (что делать сначала, что потом).
    const numTitle = `${i + 1}. ${d.title}`

    // Засеянные ноды (поиск/презентация/ИИ) — без вызова модели, создаём готовыми.
    if (d.mode === 'seed') {
      const spec = seedSpec(kind, d, goal, numTitle)
      specs.push(spec)
      kinds[spec.kind] = (kinds[spec.kind] || 0) + 1
      rt.status({ task_id: '__webbuild__', status: 'running', summary: `Веб-сборка: ${i + 1}/${BLUEPRINT.length} — ${d.title}` })
      continue
    }

    const provider = PROVIDERS[genProvider++ % PROVIDERS.length]
    const g = await genArtifact(rt, goal, kind, d, context, provider)
    calls++
    if (g.via === 'api') apiFallbacks++
    else if (g.via) providersUsed.add(g.via)
    rt.status({ task_id: '__webbuild__', status: 'running', summary: `Веб-сборка: ${i + 1}/${BLUEPRINT.length} — ${d.title} (${g.via})` })
    if (!g.text) continue
    const spec = parseArtifact(kind, { ...d, title: numTitle }, g.text)
    if (spec) {
      specs.push(spec)
      kinds[spec.kind] = (kinds[spec.kind] || 0) + 1
    }
  }

  if (!specs.length) return { ran: false }

  // Все ноды — ОДНОЙ пачкой → раскладываются кластерами по группам.
  await rt.boardCreateNodes(specs)

  const kindsStr = Object.entries(kinds)
    .map(([k, n]) => `${k}×${n}`)
    .join(', ')
  const src = providersUsed.size
    ? `веб: ${[...providersUsed].join(', ')}${apiFallbacks ? `, +${apiFallbacks} локально` : ''}`
    : 'локальная модель (веб-чат не ответил)'
  const summary = `Веб-сборка: ${specs.length} артефактов (${kindsStr}); ${src}`
  const key = await rt.vaultWrite(`project:${rt.projectId}/task:root/output:0`, summary, { kind: 'root_output', status: 'success' })
  rt.trace({
    command_id: rt.newId('cmd'),
    task_id: '__webbuild__',
    node_id: 'role:webllm',
    mode: 'system',
    input_refs: [],
    output_ref: key,
    cost: { tokens: 0, calls },
    duration_ms: Date.now() - started,
    timestamp: Date.now(),
    note: summary
  })
  rt.status({ task_id: '__webbuild__', status: 'success', summary })
  return { ran: true, result: mkResult(summary, calls, key) }
}
