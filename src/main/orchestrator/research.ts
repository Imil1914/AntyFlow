// ============================================================================
// Research-фаза (скилл lecture-forge, шаг 1). Для НАУЧНЫХ тем:
//  грани (facets) → поиск ≥ разных статей по каждой → ноды на доску (кластеры по
//  граням) → заливка OA-PDF в AnythingLLM (best-effort) → гипотезы (нодами + в Vault).
// Возвращает ключи Vault (литература/гипотезы) для добавления в materials планировщика.
// Всё «мягко»: сбой любого шага не роняет прогон — фаза просто отдаёт, что успела.
// ============================================================================
import type { Runtime, PaperLite, BoardNodeSpec } from './contracts'
import { extractJson } from './util'

type Facet = { name: string; query: string }
type ResearchPlan = { scientific?: boolean; facets?: Facet[]; yearFrom?: number; yearTo?: number }
type Hypothesis = { statement?: string; refs?: string[]; status?: string; rationale?: string; test?: string }

export async function researchPhase(
  rt: Runtime,
  goal: string
): Promise<{ materials: string[]; summary: string; scientific: boolean }> {
  const started = Date.now()

  // 1) Классификация + грани + английские запросы + годы. Модель по умолчанию (надёжнее).
  const dec = await rt.aiChat({
    model: '',
    messages: [
      {
        role: 'system',
        content:
          'Ты научный ресерч-планировщик. Определи, научная ли тема, и разбей её на 4–6 ГРАНЕЙ (facets) — ' +
          'разных аспектов/подтем. Для КАЖДОЙ грани дай короткий поисковый запрос НА АНГЛИЙСКОМ (2–5 ключевых слов). ' +
          'Если в теме указаны годы — верни yearFrom/yearTo. Ответь СТРОГО JSON без пояснений: ' +
          '{"scientific":true,"facets":[{"name":"Название грани","query":"english keywords"}],"yearFrom":2024,"yearTo":2026}'
      },
      { role: 'user', content: goal }
    ],
    timeoutMs: 60000
  })
  let plan: ResearchPlan = {}
  if (dec.ok) {
    const p = extractJson<ResearchPlan>(dec.content)
    if (p) plan = p
  }
  // Фолбэк: если классификатор сбойнул, но цель явно исследовательская — не пропускаем
  // фазу молча, а строим одну грань из ключевых слов цели.
  if (!plan.scientific || !plan.facets?.length) {
    const looksSci = /стат|research|paper|науч|lecture|лекци|arxiv|гипотез|\bagent|агент|\bllm\b|нейросет|модел/i.test(goal)
    if (!looksSci) return { materials: [], summary: '', scientific: false }
    const kw = goal
      .replace(/[^\p{L}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6)
      .join(' ')
    plan = { scientific: true, facets: [{ name: 'Тема', query: kw || goal.slice(0, 60) }] }
  }

  rt.status({ task_id: '__research__', status: 'running', summary: `Ресерч: ${plan.facets.length} граней` })

  // 2) Поиск по граням + дедуп по DOI/названию.
  const seen = new Set<string>()
  const byFacet: Array<{ facet: string; papers: PaperLite[] }> = []
  for (const f of plan.facets.slice(0, 6)) {
    if (rt.isCancelled()) break
    const found = await rt.papersSearch({ query: f.query, yearFrom: plan.yearFrom, yearTo: plan.yearTo, limit: 8 })
    const uniq: PaperLite[] = []
    for (const p of found) {
      const key = (p.doi || p.title.toLowerCase().replace(/\s+/g, ' ').trim()).slice(0, 180)
      if (!key || seen.has(key)) continue
      seen.add(key)
      uniq.push(p)
    }
    byFacet.push({ facet: f.name || 'Грань', papers: uniq })
  }
  const allPapers = byFacet.flatMap((g) => g.papers)
  const total = allPapers.length

  // 3) Ноды статей на доску (кластеры по граням).
  const nodes: BoardNodeSpec[] = []
  for (const g of byFacet) {
    for (const p of g.papers) {
      const meta = [p.authors.slice(0, 4).join(', '), [p.venue, p.year].filter(Boolean).join(' · ')].filter(Boolean).join('\n')
      const body = [meta, p.abstract ? p.abstract.slice(0, 320) + '…' : ''].filter(Boolean).join('\n\n')
      nodes.push({
        kind: 'paper',
        title: p.title,
        body,
        facet: g.facet,
        url: p.doi ? 'https://doi.org/' + p.doi : p.url || undefined
      })
    }
  }

  // 4) Заливка OA-PDF в AnythingLLM (best-effort — не блокирует прогон).
  let ingested = 0
  const oa = allPapers.filter((p) => p.oa && p.pdfUrl).slice(0, 12)
  if (oa.length) {
    await rt.anythingEnsure().catch(() => false)
    for (const p of oa) {
      if (rt.isCancelled()) break
      const pdf: { ok: boolean; base64?: string } = await rt
        .papersPdf({ doi: p.doi, pdfUrl: p.pdfUrl })
        .catch(() => ({ ok: false }))
      if (pdf.ok && pdf.base64) {
        const ing = await rt.anythingIngest({ base64: pdf.base64, name: p.title.slice(0, 100) }).catch(() => ({ ok: false }))
        if (ing.ok) ingested++
      }
    }
  }

  // 5) Гипотезы из корпуса.
  const corpus = allPapers
    .slice(0, 24)
    .map(
      (p, i) =>
        `[S${i + 1}] ${p.title} (${p.year || '?'}${p.venue ? ', ' + p.venue : ''})${p.abstract ? ' — ' + p.abstract.slice(0, 200) : ''}`
    )
    .join('\n')
  const hRes = corpus
    ? await rt.aiChat({
        model: '',
        messages: [
          {
            role: 'system',
            content:
              'По корпусу статей сгенерируй 3–5 научных ГИПОТЕЗ. Каждая: обоснована ≥2 источниками ([S#]), ' +
              'со статусом (подтверждено|спорно|пробел), обоснованием и способом проверки. Ответь СТРОГО JSON: ' +
              '{"hypotheses":[{"statement":"...","refs":["S1","S3"],"status":"пробел","rationale":"...","test":"..."}]}'
          },
          { role: 'user', content: corpus }
        ],
        timeoutMs: 90000
      })
    : { ok: false as const, error: 'empty corpus' }
  const hyp: Hypothesis[] =
    hRes.ok ? extractJson<{ hypotheses?: Hypothesis[] }>(hRes.content)?.hypotheses || [] : []
  for (const h of hyp) {
    if (!h.statement) continue
    const body = [
      `**Статус:** ${h.status || '—'}`,
      `**Источники:** ${(h.refs || []).join(', ') || '—'}`,
      h.rationale ? `**Обоснование:** ${h.rationale}` : '',
      h.test ? `**Как проверить:** ${h.test}` : ''
    ]
      .filter(Boolean)
      .join('\n\n')
    nodes.push({ kind: 'hypothesis', title: h.statement, body, facet: 'Гипотезы' })
  }

  // Выложить всё на доску одной командой.
  if (nodes.length) await rt.boardCreateNodes(nodes)

  // 6) Артефакты в Vault (для планировщика/лекции).
  const bib = byFacet
    .map(
      (g) =>
        `## ${g.facet}\n` +
        g.papers
          .map(
            (p) =>
              `- **${p.title}** — ${p.authors.slice(0, 3).join(', ')} (${p.year || '?'}, ${p.venue || '—'})` +
              (p.doi ? ` https://doi.org/${p.doi}` : '')
          )
          .join('\n')
    )
    .join('\n\n')
  const litKey = await rt.vaultWrite(
    `project:${rt.projectId}/literature`,
    `# Литература (${total} статей по ${byFacet.length} граням)\n\n${bib}`,
    { kind: 'materials' }
  )
  const hypMd = hyp
    .map(
      (h, i) =>
        `${i + 1}. ${h.statement}\n   - статус: ${h.status || '—'}; источники: ${(h.refs || []).join(', ') || '—'}\n   - проверка: ${h.test || '—'}`
    )
    .join('\n')
  const hypKey = await rt.vaultWrite(`project:${rt.projectId}/hypotheses`, `# Гипотезы\n\n${hypMd}`, {
    kind: 'materials'
  })

  rt.trace({
    command_id: rt.newId('cmd'),
    task_id: '__research__',
    node_id: 'role:researcher',
    mode: 'system',
    input_refs: [],
    output_ref: litKey,
    cost: {
      tokens: (dec.ok ? dec.totalTokens : 0) + (hRes.ok ? hRes.totalTokens : 0),
      calls: 2
    },
    duration_ms: Date.now() - started,
    timestamp: Date.now(),
    note: `Ресерч: ${total} статей по ${byFacet.length} граням, в AnythingLLM ${ingested}, гипотез ${hyp.length}`
  })
  rt.status({
    task_id: '__research__',
    status: 'success',
    summary: `${total} статей на доске (${byFacet.length} граней), ${hyp.length} гипотез, в базе ${ingested}`
  })

  return {
    materials: [litKey, hypKey],
    summary: `Собрано ${total} статей по ${byFacet.length} граням; гипотез ${hyp.length}; залито в AnythingLLM ${ingested}.`,
    scientific: true
  }
}
