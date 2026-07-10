// Научный поиск и скачивание статей из журналов.
// Бесплатно: OpenAlex (агрегатор — индексирует arXiv/PubMed/Crossref, даёт ссылки
// на open-access PDF) + Unpaywall (легальный бесплатный PDF по DOI).
// По подписке: Elsevier ScienceDirect (поиск + полный текст PDF по API-ключу и,
// для доступа вне сети института, institutional token).
import { ipcMain } from 'electron'

export type Paper = {
  id: string
  source: string // openalex | elsevier
  title: string
  authors: string[]
  year: number | null
  abstract: string
  doi: string // чистый DOI без https://doi.org/
  url: string // страница статьи
  pdfUrl: string // прямая ссылка на PDF, если есть open-access
  oa: boolean
  venue: string // журнал/площадка
}

type Keys = {
  elsevierKey?: string
  elsevierInsttoken?: string
  unpaywallEmail?: string
}

async function ft(url: string, init: RequestInit = {}, ms = 20000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

const cleanDoi = (d: string): string =>
  (d || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim()

// OpenAlex хранит абстракт «инвертированным индексом» {слово:[позиции]} — собираем текст.
function fromInverted(inv: Record<string, number[]> | null | undefined): string {
  if (!inv) return ''
  const words: string[] = []
  for (const [w, positions] of Object.entries(inv)) for (const p of positions) words[p] = w
  return words.filter(Boolean).join(' ').slice(0, 4000)
}

async function searchOpenAlex(query: string, limit: number, yearFrom?: number, yearTo?: number): Promise<Paper[]> {
  const filters: string[] = []
  if (yearFrom) filters.push(`from_publication_date:${yearFrom}-01-01`)
  if (yearTo) filters.push(`to_publication_date:${yearTo}-12-31`)
  const url =
    'https://api.openalex.org/works?search=' +
    encodeURIComponent(query) +
    (filters.length ? `&filter=${filters.join(',')}` : '') +
    `&per_page=${Math.min(25, limit)}&mailto=flow-app@example.com`
  const r = await ft(url)
  if (!r.ok) return []
  const d = (await r.json()) as { results?: unknown[] }
  const out: Paper[] = []
  for (const raw of d.results || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = raw as any
    const loc = w.best_oa_location || w.primary_location || {}
    out.push({
      id: String(w.id || cleanDoi(w.doi) || Math.random().toString(36).slice(2)),
      source: 'openalex',
      title: String(w.title || w.display_name || '(без названия)'),
      authors: (w.authorships || []).map((a: { author?: { display_name?: string } }) => a.author?.display_name).filter(Boolean).slice(0, 12),
      year: typeof w.publication_year === 'number' ? w.publication_year : null,
      abstract: fromInverted(w.abstract_inverted_index),
      doi: cleanDoi(w.doi || ''),
      url: String(w.doi || (w.primary_location || {}).landing_page_url || w.id || ''),
      pdfUrl: String(loc.pdf_url || ''),
      oa: !!(w.open_access && w.open_access.is_oa),
      venue: String((w.primary_location?.source?.display_name) || '')
    })
  }
  return out
}

async function searchElsevier(
  query: string,
  limit: number,
  keys: Keys
): Promise<{ papers: Paper[]; note?: string }> {
  if (!keys.elsevierKey) return { papers: [], note: 'Elsevier: не задан API-ключ (⚙ Настройки → Научные источники)' }
  const url =
    'https://api.elsevier.com/content/search/sciencedirect?query=' +
    encodeURIComponent(query) +
    `&count=${Math.min(25, limit)}&httpAccept=application/json`
  const mkHeaders = (withToken: boolean): Record<string, string> => {
    const h: Record<string, string> = { 'X-ELS-APIKey': keys.elsevierKey!, Accept: 'application/json' }
    if (withToken && keys.elsevierInsttoken) h['X-ELS-Insttoken'] = keys.elsevierInsttoken
    return h
  }
  let r: Response
  let tokenDropped = false
  try {
    r = await ft(url, { headers: mkHeaders(true) })
    // Токен не привязан к ключу / невалиден — повторяем БЕЗ токена: поиск-метаданные
    // ScienceDirect доступны по одному API-ключу (полный текст — отдельно).
    if (!r.ok && keys.elsevierInsttoken) {
      const r2 = await ft(url, { headers: mkHeaders(false) })
      if (r2.ok) {
        r = r2
        tokenDropped = true
      } else {
        r = r.status !== 200 ? r : r2
      }
    }
  } catch (e) {
    return { papers: [], note: 'Elsevier: сеть недоступна — ' + String(e) }
  }
  if (!r.ok) {
    let body = ''
    try {
      body = (await r.text()).replace(/\s+/g, ' ').slice(0, 240)
    } catch {
      /* ignore */
    }
    const hint =
      r.status === 401 || r.status === 403
        ? ' (ключ неверный, не активирован для ScienceDirect Search, или нет подписки/insttoken)'
        : r.status === 400
          ? ' (неверный запрос)'
          : ''
    return { papers: [], note: `Elsevier: ошибка ${r.status}${hint}${body ? ' — ' + body : ''}` }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let d: any
  try {
    d = await r.json()
  } catch {
    return { papers: [], note: 'Elsevier: не удалось разобрать ответ' }
  }
  const entries = d?.['search-results']?.entry || []
  const out: Paper[] = []
  for (const e of entries) {
    if (!e || e.error) continue
    const doi = cleanDoi(e['prism:doi'] || '')
    const date = String(e['prism:coverDate'] || '')
    out.push({
      id: doi || String(e['dc:identifier'] || Math.random().toString(36).slice(2)),
      source: 'elsevier',
      title: String(e['dc:title'] || '(без названия)'),
      authors: e['dc:creator'] ? [String(e['dc:creator'])] : [],
      year: date ? Number(date.slice(0, 4)) || null : null,
      abstract: String(e['dc:description'] || e['prism:teaser'] || ''),
      doi,
      url: doi ? 'https://doi.org/' + doi : '',
      pdfUrl: '', // полный текст качаем через article retrieval по DOI
      oa: String(e.openaccess) === 'true' || e.openaccessFlag === true,
      venue: String(e['prism:publicationName'] || 'ScienceDirect')
    })
  }
  const dropNote = tokenDropped
    ? 'Elsevier: institutional token не привязан к API-ключу — поиск идёт без него (полный текст платных статей будет недоступен, пока не получишь токен под этот ключ или не подключишься через VPN института).'
    : undefined
  return { papers: out, note: out.length ? dropNote : dropNote || 'Elsevier: 0 результатов по запросу' }
}

// Легальный бесплатный PDF по DOI (авторская open-access версия), если есть.
async function unpaywallPdf(doi: string, email: string): Promise<string> {
  if (!doi || !email) return ''
  try {
    const r = await ft(`https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(email)}`)
    if (!r.ok) return ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = (await r.json()) as any
    return String(d?.best_oa_location?.url_for_pdf || '')
  } catch {
    return ''
  }
}

// Полный текст PDF через Elsevier (нужны подписка + ключ; вне сети института — insttoken).
async function elsevierPdf(doi: string, keys: Keys): Promise<ArrayBuffer | null> {
  if (!doi || !keys.elsevierKey) return null
  const headers: Record<string, string> = { 'X-ELS-APIKey': keys.elsevierKey, Accept: 'application/pdf' }
  if (keys.elsevierInsttoken) headers['X-ELS-Insttoken'] = keys.elsevierInsttoken
  try {
    const r = await ft('https://api.elsevier.com/content/article/doi/' + encodeURIComponent(doi), { headers }, 30000)
    if (!r.ok) return null
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('pdf')) return null // вернулся не PDF (нет доступа) — считаем неудачей
    return await r.arrayBuffer()
  } catch {
    return null
  }
}

// Диагностика доступа к Elsevier: проверяем ключ (поиск), токен и полный текст.
async function testElsevier(keys: Keys): Promise<{
  key: 'ok' | 'fail' | 'none'
  keyMsg: string
  token: 'ok' | 'fail' | 'none'
  tokenMsg: string
  fulltext: 'ok' | 'fail' | 'none'
  ftMsg: string
}> {
  const out = {
    key: 'none' as 'ok' | 'fail' | 'none',
    keyMsg: '',
    token: 'none' as 'ok' | 'fail' | 'none',
    tokenMsg: '',
    fulltext: 'none' as 'ok' | 'fail' | 'none',
    ftMsg: ''
  }
  if (!keys.elsevierKey) {
    out.keyMsg = 'API-ключ не задан'
    return out
  }
  const errText = async (r: Response): Promise<string> => {
    try {
      return (await r.text()).replace(/\s+/g, ' ').slice(0, 180)
    } catch {
      return `HTTP ${r.status}`
    }
  }
  const searchUrl = 'https://api.elsevier.com/content/search/sciencedirect?query=cancer&count=1&httpAccept=application/json'

  // 1) Поиск по одному ключу (без токена) — доступ к метаданным
  try {
    const r = await ft(searchUrl, { headers: { 'X-ELS-APIKey': keys.elsevierKey, Accept: 'application/json' } })
    out.key = r.ok ? 'ok' : 'fail'
    out.keyMsg = r.ok ? 'поиск работает' : 'ошибка ' + r.status + ' — ' + (await errText(r))
  } catch (e) {
    out.key = 'fail'
    out.keyMsg = String(e)
  }

  // 2) Поиск с институциональным токеном — валиден ли он с этим ключом
  if (keys.elsevierInsttoken) {
    try {
      const r = await ft(searchUrl, {
        headers: { 'X-ELS-APIKey': keys.elsevierKey, 'X-ELS-Insttoken': keys.elsevierInsttoken, Accept: 'application/json' }
      })
      out.token = r.ok ? 'ok' : 'fail'
      out.tokenMsg = r.ok ? 'токен принят с этим ключом' : 'ошибка ' + r.status + ' — ' + (await errText(r))
    } catch (e) {
      out.token = 'fail'
      out.tokenMsg = String(e)
    }
  } else {
    out.tokenMsg = 'токен не задан (для доступа вне сети института)'
  }

  // 3) Полный текст: пробуем скачать PDF известной статьи Elsevier (нужна подписка)
  const testDoi = '10.1016/j.cell.2020.02.052' // Cell (Elsevier), требует подписку
  try {
    const headers: Record<string, string> = { 'X-ELS-APIKey': keys.elsevierKey, Accept: 'application/pdf' }
    // токен добавляем, только если он валиден (иначе весь запрос отвергнут)
    if (keys.elsevierInsttoken && out.token !== 'fail') headers['X-ELS-Insttoken'] = keys.elsevierInsttoken
    const r = await ft('https://api.elsevier.com/content/article/doi/' + testDoi, { headers }, 25000)
    const ct = r.headers.get('content-type') || ''
    if (r.ok && ct.includes('pdf')) {
      out.fulltext = 'ok'
      out.ftMsg = 'полный текст доступен ✓'
    } else {
      out.fulltext = 'fail'
      out.ftMsg = 'нет доступа (' + r.status + ') — нужна подписка + insttoken/VPN института'
    }
  } catch (e) {
    out.fulltext = 'fail'
    out.ftMsg = String(e)
  }
  return out
}

export function registerPapersIpc(getKeys: () => Keys): void {
  ipcMain.handle('papers:testElsevier', async () => {
    try {
      return { ok: true as const, ...(await testElsevier(getKeys())) }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  })

  // Поиск по выбранным источникам, слияние + дедуп по DOI/названию.
  ipcMain.handle(
    'papers:search',
    async (_e, args: { query: string; sources?: string[]; limit?: number; yearFrom?: number; yearTo?: number }) => {
    const q = (args.query || '').trim()
    if (!q) return { ok: false as const, error: 'Пустой запрос' }
    const limit = args.limit || 20
    const sources = args.sources && args.sources.length ? args.sources : ['openalex']
    const keys = getKeys()
    try {
      const notes: string[] = []
      const lists: Paper[][] = []
      if (sources.includes('openalex')) {
        try {
          lists.push(await searchOpenAlex(q, limit, args.yearFrom, args.yearTo))
        } catch (e) {
          notes.push('OpenAlex: ' + String(e))
        }
      }
      if (sources.includes('elsevier')) {
        const els = await searchElsevier(q, limit, keys).catch((e) => ({ papers: [], note: 'Elsevier: ' + String(e) }))
        lists.push(els.papers)
        if (els.note) notes.push(els.note)
      }
      const merged: Paper[] = []
      const seen = new Set<string>()
      for (const list of lists) {
        for (const p of list) {
          const key = (p.doi || p.title.toLowerCase().replace(/\s+/g, ' ').trim()).slice(0, 200)
          if (seen.has(key)) continue
          seen.add(key)
          merged.push(p)
        }
      }
      merged.sort((a, b) => (b.year || 0) - (a.year || 0))
      return { ok: true as const, results: merged.slice(0, limit), note: notes.join(' · ') || undefined }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
    }
  )

  // Скачать PDF статьи → base64. Порядок: прямая OA-ссылка → Elsevier (подписка) → Unpaywall.
  ipcMain.handle('papers:pdf', async (_e, args: { doi?: string; pdfUrl?: string; source?: string }) => {
    const keys = getKeys()
    const doi = cleanDoi(args.doi || '')
    try {
      // 1) прямой open-access PDF
      if (args.pdfUrl) {
        const r = await ft(args.pdfUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 30000)
        if (r.ok) {
          const ct = r.headers.get('content-type') || ''
          const buf = await r.arrayBuffer()
          if (ct.includes('pdf') || (buf.byteLength > 1000 && new Uint8Array(buf.slice(0, 4)).join(',') === '37,80,68,70')) {
            return { ok: true as const, base64: Buffer.from(buf).toString('base64') }
          }
        }
      }
      // 2) Elsevier по подписке
      if (doi) {
        const els = await elsevierPdf(doi, keys)
        if (els) return { ok: true as const, base64: Buffer.from(els).toString('base64') }
      }
      // 3) Unpaywall — легальная бесплатная версия
      if (doi && keys.unpaywallEmail) {
        const up = await unpaywallPdf(doi, keys.unpaywallEmail)
        if (up) {
          const r = await ft(up, { headers: { 'User-Agent': 'Mozilla/5.0' } }, 30000)
          if (r.ok) {
            const buf = await r.arrayBuffer()
            return { ok: true as const, base64: Buffer.from(buf).toString('base64') }
          }
        }
      }
      return { ok: false as const, error: 'PDF недоступен (нет open-access и не сработал доступ по подписке)' }
    } catch (e) {
      return { ok: false as const, error: String(e) }
    }
  })
}
