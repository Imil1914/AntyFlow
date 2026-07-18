// ============================================================================
// Скилл lecture-forge, стадии 4–5: плейбук (методика письма) + сборка финальной
// лекции. Плейбук вшивается в промпты планировщика/ролей на научных темах; сборка
// синтезирует один самодостаточный .md по 10-фазной анатомии, опираясь на корпус.
// ============================================================================
import type { Runtime } from './contracts'
import { extractJson } from './util'

// Сжатый плейбук из references/ скилла (анатомия + микро-структура + рубрика + ремесло).
export const LECTURE_FORGE_PLAYBOOK =
  'МЕТОДИКА LECTURE-FORGE (следуй строго):\n' +
  '• ДВА СЛОЯ ВСЕГДА: для каждого понятия — и интуиция/мотивация, и строгий формализм. ' +
  'Никогда не давай формулу, не сказав зачем; никогда интуицию без последующей строгости.\n' +
  '• МИКРО-СТРУКТУРА КАЖДОЙ СЕКЦИИ (порядок важен): 1) интуиция/аналогия; 2) строгое ' +
  'определение + короткий gloss «иначе говоря…»; 3) механизм/вывод по шагам (почему каждый шаг верен); ' +
  '4) визуализация (Mermaid/формула/график) с подписью и ссылкой из текста; 5) разобранный пример с реальными числами; ' +
  '6) границы применимости (когда верно, что ломает); 7) связь-мостик со следующей секцией.\n' +
  '• 10-ФАЗНАЯ АНАТОМИЯ ЛЕКЦИИ: 0 Шапка (аудитория, пререквизиты, 3–7 целей «вы сможете…», глубина); ' +
  '1 Крючок и мотивация (задача/парадокс + главный вопрос лекции); 2 Карта понятий (Mermaid mindmap/flowchart + маршрут); ' +
  '3 Фундамент (нужные пререквизиты + таблица обозначений); 4 Ядро (секции по микро-структуре, с переходами); ' +
  '5 Синтез (всё в единую картину); 6 Ловушки и заблуждения; 7 Практика (задачи с ПОЛНЫМИ решениями); ' +
  '8 Итог + шпаргалка + «если запомнить одно»; 9 Куда копать глубже (из собранного корпуса, ссылки НЕ выдумывать); 10 Глоссарий.\n' +
  '• РЕМЕСЛО: мотивируй прежде чем определять; двухслойные предложения; прозрачность вывода (без «легко видеть»); ' +
  'гигиена обозначений (символ не меняет смысл); конкретность через числа; явные допущения; указатели пути.\n' +
  '• ЧЕСТНОСТЬ: опирайся на СОБРАННЫЙ КОРПУС статей; различай статус утверждений (факт / модель / открытый вопрос); ' +
  'НЕ выдумывай ссылки; не воспроизводи чужой текст дословно.\n' +
  '• ФОРМАТ: Markdown; формулы LaTeX ($...$ и $$...$$); диаграммы Mermaid; таблицы; подписанные рисунки.'

type LectureSection = { title?: string; brief?: string }

// Собрать финальную лекцию. По умолчанию — ПОСЕКЦИОННОЕ письмо: план секций (JSON) →
// каждая секция пишется отдельным вызовом по микро-структуре методики (со знанием
// соседних секций для мостиков и с корпусом для ссылок) → сшивка. Так каждая секция
// получает полное «внимание» и бюджет, а не один перегруженный вызов. Если план не
// удался — фолбэк на одиночный синтез. Кладёт .md в Vault и нодой на доску.
export async function assembleLecture(
  rt: Runtime,
  goal: string,
  materialKeys: string[],
  taskSummaries: string[]
): Promise<string> {
  const started = Date.now()
  // Материалы (литература/гипотезы) — выдержками, не сырым объёмом.
  let corpus = ''
  if (materialKeys.length) {
    const map = await rt.vaultReadMany(materialKeys)
    corpus = Object.entries(map)
      .map(([k, v]) => `### ${k}\n${(v || '').slice(0, 2500)}`)
      .join('\n\n')
  }
  const outputs = taskSummaries.filter(Boolean).slice(0, 12).join('\n\n---\n\n').slice(0, 8000)

  // 1) План секций (покрывает 10-фазную анатомию). STRICT JSON.
  const outlineRes = await rt.aiChat({
    model: '',
    messages: [
      {
        role: 'system',
        content:
          'Ты планировщик лекции. По методике ниже составь ПЛАН из 8–14 секций, покрывающих 10-фазную анатомию ' +
          '(Шапка/цели; Крючок-мотивация; Карта понятий; Фундамент; секции Ядра; Синтез; Ловушки; Практика; Итог+шпаргалка; ' +
          'Куда копать глубже; Глоссарий). Для КАЖДОЙ секции — краткое «что именно раскрыть» (brief, 1–2 предложения). ' +
          'Ответь СТРОГО JSON без пояснений: {"sections":[{"title":"...","brief":"..."}]}\n\n' +
          LECTURE_FORGE_PLAYBOOK
      },
      {
        role: 'user',
        content:
          `ТЕМА: ${goal}\n\n` +
          (corpus ? `КОРПУС (выдержки):\n${corpus.slice(0, 4000)}\n\n` : '') +
          (outputs ? `ЧЕРНОВИКИ ПОДЗАДАЧ:\n${outputs.slice(0, 3000)}\n\n` : '') +
          'Составь план секций лекции.'
      }
    ],
    timeoutMs: 90000
  })
  let sections: LectureSection[] = []
  if (outlineRes.ok) sections = (extractJson<{ sections?: LectureSection[] }>(outlineRes.content)?.sections || [])
  sections = sections.filter((s) => s && s.title).slice(0, 14)

  // Фолбэк: план не удался → старый одиночный синтез (не роняем стадию).
  if (sections.length < 3) {
    return assembleLectureSingle(rt, goal, corpus, outputs, materialKeys, started)
  }

  rt.status({ task_id: '__lecture__', status: 'running', summary: `Лекция: план из ${sections.length} секций, пишу…` })

  // 2) Пишем секции по очереди. Бюджет — централизованный hard-stop: при исчерпании
  //    aiChat вернёт ok:false / rt.isCancelled()=true, и мы корректно останавливаемся.
  const toc = sections.map((s, i) => `${i + 1}. ${s.title}`).join('\n')
  const parts: string[] = []
  let calls = 1
  let tokens = outlineRes.ok ? outlineRes.totalTokens : 0
  for (let i = 0; i < sections.length; i++) {
    if (rt.isCancelled()) break
    const s = sections[i]
    const prev = sections[i - 1]?.title
    const next = sections[i + 1]?.title
    const secRes = await rt.aiChat({
      model: '',
      messages: [
        {
          role: 'system',
          content:
            'Ты автор лекции. Напиши ОДНУ секцию строго по микро-структуре методики: 1) интуиция/аналогия; ' +
            '2) строгое определение + gloss «иначе говоря…»; 3) механизм/вывод по шагам; 4) визуализация (Mermaid/формула/график) ' +
            'с подписью; 5) разобранный пример с реальными числами; 6) границы применимости; 7) мостик к следующей секции. ' +
            'Двухслойно (интуиция + формализм). Markdown, LaTeX ($…$ и $$…$$), Mermaid. Ссылки НЕ выдумывай — бери из корпуса. ' +
            `Выведи ТОЛЬКО Markdown секции, начиная с заголовка «## ${i + 1}. <название>».\n\n` +
            LECTURE_FORGE_PLAYBOOK
        },
        {
          role: 'user',
          content:
            `ТЕМА ЛЕКЦИИ: ${goal}\n` +
            `ПЛАН (для контекста и мостиков):\n${toc}\n\n` +
            `ПИШЕШЬ СЕКЦИЮ ${i + 1}: «${s.title}»\n` +
            `Что раскрыть: ${s.brief || '—'}\n` +
            (prev ? `Предыдущая секция: «${prev}». ` : '') +
            (next ? `Следующая секция: «${next}» — сделай к ней явный мостик.` : 'Это финальная секция.') +
            (corpus ? `\n\nКОРПУС (выдержки, ссылки бери отсюда):\n${corpus.slice(0, 3500)}` : '')
        }
      ],
      timeoutMs: 120000
    })
    if (secRes.ok && secRes.content.trim()) {
      parts.push(secRes.content.trim())
      tokens += secRes.totalTokens
    } else {
      parts.push(`## ${i + 1}. ${s.title}\n\n_(секция не сгенерирована)_`)
      // Бюджет исчерпан — дальше писать нечем, останавливаемся.
      if (!secRes.ok && secRes.error === 'budget_exceeded') break
    }
    calls++
    rt.status({ task_id: '__lecture__', status: 'running', summary: `Лекция: секция ${i + 1}/${sections.length}` })
  }

  const md = `# ${goal}\n\n${parts.join('\n\n')}`.trim()
  const key = await rt.vaultWrite(`project:${rt.projectId}/lecture`, md, { kind: 'output' })
  await rt.boardCreateNodes([
    { kind: 'note', title: '📚 Лекция: ' + goal.slice(0, 70), body: md.slice(0, 12000), facet: 'Лекция' }
  ])
  rt.trace({
    command_id: rt.newId('cmd'),
    task_id: '__lecture__',
    node_id: 'role:synthesizer',
    mode: 'system',
    input_refs: materialKeys,
    output_ref: key,
    cost: { tokens, calls },
    duration_ms: Date.now() - started,
    timestamp: Date.now(),
    note: `Лекция посекционно: ${sections.length} секций, ${md.length} симв.`
  })
  rt.status({
    task_id: '__lecture__',
    status: 'success',
    summary: `Лекция собрана: ${sections.length} секций, ${Math.round(md.length / 1000)}к симв. — на доске и в Vault`
  })
  return key
}

// Одиночный синтез (фолбэк, если план секций не удался): вся анатомия одним вызовом.
async function assembleLectureSingle(
  rt: Runtime,
  goal: string,
  corpus: string,
  outputs: string,
  materialKeys: string[],
  started: number
): Promise<string> {
  const res = await rt.aiChat({
    model: '',
    messages: [
      {
        role: 'system',
        content:
          'Ты автор-синтезатор. Собери ОДНУ самодостаточную, технически строгую лекцию в Markdown по методике ниже, ' +
          'опираясь на собранный корпус и черновые материалы подзадач. Лекция должна быть глубокой и не упрощать предмет. ' +
          'Выведи ТОЛЬКО итоговый Markdown лекции (без пояснений о процессе).\n\n' +
          LECTURE_FORGE_PLAYBOOK
      },
      {
        role: 'user',
        content:
          `ТЕМА: ${goal}\n\n` +
          (corpus ? `СОБРАННЫЙ КОРПУС (литература + гипотезы):\n${corpus}\n\n` : '') +
          (outputs ? `ЧЕРНОВЫЕ МАТЕРИАЛЫ ПОДЗАДАЧ:\n${outputs}\n\n` : '') +
          'Собери финальную лекцию по 10-фазной анатомии. Раздел «Куда копать глубже» построй из корпуса.'
      }
    ],
    timeoutMs: 180000
  })
  if (!res.ok || !res.content.trim()) return ''

  const md = res.content.trim()
  const key = await rt.vaultWrite(`project:${rt.projectId}/lecture`, md, { kind: 'output' })
  await rt.boardCreateNodes([
    { kind: 'note', title: '📚 Лекция: ' + goal.slice(0, 70), body: md.slice(0, 12000), facet: 'Лекция' }
  ])
  rt.trace({
    command_id: rt.newId('cmd'),
    task_id: '__lecture__',
    node_id: 'role:synthesizer',
    mode: 'system',
    input_refs: materialKeys,
    output_ref: key,
    cost: { tokens: res.ok ? res.totalTokens : 0, calls: 1 },
    duration_ms: Date.now() - started,
    timestamp: Date.now(),
    note: `Лекция собрана одиночным синтезом (${md.length} симв.)`
  })
  rt.status({ task_id: '__lecture__', status: 'success', summary: `Лекция собрана (${Math.round(md.length / 1000)}к симв.) — на доске и в Vault` })
  return key
}
