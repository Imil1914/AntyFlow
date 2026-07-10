// Мини-карта иерархии нод текущей доски: кто с кем связан.
// Строится из flow-node шейпов и стрелок-связей (направление start→end).
// Оркестраторы — корни сверху; дети по исходящим стрелкам; ноды с несколькими
// родителями помечаются бейджем, а повторные вхождения — «ссылкой» (↩), чтобы
// не дублировать поддерево и не зацикливаться.
import { useValue, type Editor } from 'tldraw'
import { NodeIcon } from './nodeIcons'

type FlowShape = { id: string; type: string; props: { kind: string; title: string } }

const KIND_COLOR: Record<string, string> = {
  note: '#4ADE80', ai: '#22D3EE', doc: '#4ADE80', answer: '#A78BFA', code: '#FBBF24', codeblock: '#FBBF24',
  search: '#22D3EE', image: '#A78BFA', deck: '#F472B6', slide: '#8B93A3', ref: '#22D3EE', diagram: '#22D3EE',
  opencode: '#F97316', anythingllm: '#14B8A6', openscience: '#2C7BE5', notebook: '#F9A825', pdf: '#FF6B6B',
  orchestrator: '#A78BFA', orchtask: '#A78BFA', orchcall: '#38BDF8', list: '#F59E0B', listcard: '#F59E0B',
  kanban: '#38BDF8', board: '#818CF8', sheet: '#34D399'
}
const KIND_LABEL: Record<string, string> = {
  note: 'Заметка', ai: 'ИИ-чат', doc: 'Документ', answer: 'Ответ', code: 'Код', codeblock: 'Код',
  search: 'Поиск', image: 'Картинка', deck: 'Слайды', slide: 'Слайд', ref: 'Референс', diagram: 'Схема',
  opencode: 'OpenCode', anythingllm: 'AnythingLLM', openscience: 'OpenScience', notebook: 'Ноутбук', pdf: 'PDF',
  orchestrator: 'Оркестратор', orchtask: 'Задача', orchcall: 'Вызов', list: 'Список', listcard: 'Список',
  kanban: 'Канбан', board: 'Бэклог', sheet: 'Таблица'
}
const colorOf = (k: string): string => KIND_COLOR[k] ?? '#8B93A3'
const labelOf = (s: FlowShape): string => (s.props.title || '').trim() || KIND_LABEL[s.props.kind] || s.props.kind

type Row = {
  id: string
  kind: string
  name: string
  depth: number
  isRef: boolean // повторное вхождение (уже показан выше)
  parents: number // сколько входящих связей
  isOrch: boolean
  hasKids: boolean
}

function buildRows(editor: Editor): { rows: Row[]; free: Row[]; count: number; links: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = editor.getCurrentPageShapes() as any[]
  const nodes = all.filter((s) => s.type === 'flow-node') as FlowShape[]
  if (!nodes.length) return { rows: [], free: [], count: 0, links: 0 }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const ids = new Set(nodes.map((n) => n.id))
  const children = new Map<string, string[]>()
  const indeg = new Map<string, number>()
  nodes.forEach((n) => {
    children.set(n.id, [])
    indeg.set(n.id, 0)
  })

  let links = 0
  for (const a of all) {
    if (a.type !== 'arrow') continue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bs = (editor as any).getBindingsFromShape(a.id, 'arrow') as Array<{ toId: string; props?: { terminal?: string } }>
    const start = bs.find((b) => b.props?.terminal === 'start')?.toId
    const end = bs.find((b) => b.props?.terminal === 'end')?.toId
    if (start && end && ids.has(start) && ids.has(end) && start !== end) {
      children.get(start)!.push(end)
      indeg.set(end, indeg.get(end)! + 1)
      links++
    }
  }

  const isOrch = (id: string): boolean => byId.get(id)!.props.kind === 'orchestrator'
  const mkRow = (id: string, depth: number, isRef: boolean): Row => {
    const n = byId.get(id)!
    return {
      id,
      kind: n.props.kind,
      name: labelOf(n),
      depth,
      isRef,
      parents: indeg.get(id)!,
      isOrch: isOrch(id),
      hasKids: (children.get(id)?.length ?? 0) > 0
    }
  }

  // Корни: оркестраторы + ноды без входящих связей. Оркестраторы — первыми.
  const rootIds = nodes
    .filter((n) => isOrch(n.id) || indeg.get(n.id) === 0)
    .map((n) => n.id)
    .sort((a, b) => (isOrch(b) ? 1 : 0) - (isOrch(a) ? 1 : 0))

  const rows: Row[] = []
  const visited = new Set<string>()
  const dfs = (id: string, depth: number): void => {
    if (visited.has(id)) {
      rows.push(mkRow(id, depth, true))
      return
    }
    visited.add(id)
    rows.push(mkRow(id, depth, false))
    for (const k of children.get(id) ?? []) dfs(k, depth + 1)
  }
  for (const r of rootIds) if (!visited.has(r)) dfs(r, 0)

  // Свободные — ноды, не достижимые ни от одного корня (циклы без входа/изоляты уже
  // в rootIds; сюда попадут только ноды внутри циклов без корня).
  const free: Row[] = []
  for (const n of nodes) if (!visited.has(n.id)) free.push(mkRow(n.id, 0, false))

  return { rows, free, count: nodes.length, links }
}

export function HierarchyPanel({ editor, onClose }: { editor: Editor | null; onClose: () => void }): JSX.Element {
  const data = useValue(
    'hierarchy',
    () => (editor ? buildRows(editor) : { rows: [], free: [], count: 0, links: 0 }),
    [editor]
  )
  const selected = useValue('hierarchy-sel', () => (editor ? editor.getSelectedShapeIds() : []), [editor])
  const selSet = new Set(selected as string[])

  const focus = (id: string): void => {
    if (!editor) return
    try {
      editor.select(id as never)
      editor.zoomToSelection({ animation: { duration: 250 } })
    } catch {
      /* не критично */
    }
  }

  const renderRow = (r: Row): JSX.Element => {
    const col = colorOf(r.kind)
    const active = selSet.has(r.id)
    return (
      <div
        key={r.id + (r.isRef ? ':ref' : '')}
        className="hier-row"
        onClick={() => focus(r.id)}
        title={`${r.name} · ${KIND_LABEL[r.kind] || r.kind}${r.parents > 1 ? ` · связей-входов: ${r.parents}` : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '4px 8px',
          paddingLeft: 8 + r.depth * 15,
          borderRadius: 7,
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1.2,
          color: active ? 'var(--text)' : r.isRef ? 'var(--muted)' : 'var(--text)',
          background: active ? `color-mix(in srgb, ${col} 20%, transparent)` : 'transparent',
          boxShadow: active ? `inset 2px 0 0 ${col}` : 'none',
          opacity: r.isRef ? 0.6 : 1
        }}
      >
        {/* линия-коннектор для глубины > 0 */}
        {r.depth > 0 && (
          <span style={{ color: 'var(--muted)', opacity: 0.5, fontSize: 11, marginLeft: -4, flexShrink: 0 }}>
            {r.isRef ? '↩' : '└'}
          </span>
        )}
        <span
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            borderRadius: 6,
            display: 'grid',
            placeItems: 'center',
            color: col,
            background: `color-mix(in srgb, ${col} 15%, transparent)`,
            border: `1px solid color-mix(in srgb, ${col} 30%, transparent)`
          }}
        >
          <NodeIcon kind={r.kind} size={12} />
        </span>
        {r.isOrch && <span style={{ fontSize: 11, flexShrink: 0 }}>👑</span>}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: r.isOrch ? 600 : 400 }}>
          {r.name}
        </span>
        {/* нода с несколькими родителями — красивый бейдж «в нескольких ветках» */}
        {r.parents > 1 && !r.isRef && (
          <span
            title={`Подключена к ${r.parents} нодам`}
            style={{
              flexShrink: 0,
              fontSize: 9.5,
              fontWeight: 700,
              color: '#F59E0B',
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.35)',
              borderRadius: 999,
              padding: '0 5px',
              lineHeight: '15px'
            }}
          >
            ⇉{r.parents}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        width: 224,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: 'var(--panel)',
        borderRight: '1px solid var(--border)',
        zIndex: 19
      }}
    >
      <style>{HIER_CSS}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 10px 8px',
          flexShrink: 0
        }}
      >
        <span style={{ font: `600 12px var(--mono, monospace)`, color: 'var(--text)', letterSpacing: '.03em' }}>
          ИЕРАРХИЯ
        </span>
        {data.count > 0 && (
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            {data.count} нод · {data.links} связей
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={onClose}
          title="Скрыть панель"
          style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
        >
          «
        </button>
      </div>

      <div className="hier-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '2px 6px 12px' }}>
        {data.count === 0 ? (
          <div style={{ padding: '10px 10px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
            Пусто. Добавьте ноды на доску и свяжите их стрелками — здесь появится карта
            «кто с кем связан». Оркестратор 👑 будет сверху.
          </div>
        ) : (
          <>
            {data.rows.map(renderRow)}
            {data.free.length > 0 && (
              <>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '.06em',
                    padding: '10px 8px 4px',
                    opacity: 0.7
                  }}
                >
                  Свободные (в цикле)
                </div>
                {data.free.map(renderRow)}
              </>
            )}
          </>
        )}
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '8px 10px',
          borderTop: '1px solid var(--border)',
          fontSize: 10.5,
          color: 'var(--muted)',
          lineHeight: 1.4
        }}
      >
        <div>👑 — оркестратор (главный)</div>
        <div>
          <span style={{ color: '#F59E0B' }}>⇉N</span> — в нескольких ветках · ↩ — ссылка
        </div>
      </div>
    </div>
  )
}

const HIER_CSS = `
.hier-row:hover { background: rgba(255,255,255,0.05) !important; }
.hier-scroll::-webkit-scrollbar { width:9px; }
.hier-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius:5px; }
`
