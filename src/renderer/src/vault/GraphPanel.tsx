// Граф связей заметок в стиле Obsidian: узлы — заметки, рёбра — [[вики-ссылки]].
// Силовая раскладка (отталкивание + пружины + центр), зум/панорама/перетаскивание.
// Позиции считаем в ref и обновляем атрибуты SVG императивно (без ре-рендеров React),
// поэтому плавно даже на сотнях узлов; симуляция затухает и останавливается.
// DOM-элементы держим в параллельных ref-массивах (индекс = индекс узла/ребра),
// т.к. они привязываются на коммите, а sim-объекты создаются позже в useEffect.
import { useEffect, useRef } from 'react'

export type GraphNode = { id: string; label: string; deg: number }
export type GraphEdge = { s: string; t: string }

type Sim = { id: string; deg: number; x: number; y: number; vx: number; vy: number; fixed: boolean }

export function GraphPanel({
  nodes,
  edges,
  onOpen,
  onClose,
  currentPath
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onOpen: (id: string) => void
  onClose: () => void
  currentPath: string | null
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null)
  const gRef = useRef<SVGGElement>(null)
  const simRef = useRef<Sim[]>([])
  const circleEls = useRef<(SVGCircleElement | null)[]>([])
  const textEls = useRef<(SVGTextElement | null)[]>([])
  const lineEls = useRef<(SVGLineElement | null)[]>([])
  const viewRef = useRef({ tx: 0, ty: 0, scale: 1 })
  const alphaRef = useRef(1)
  const rafRef = useRef(0)

  useEffect(() => {
    const host = svgRef.current
    if (!host || nodes.length === 0) return
    const W = host.clientWidth || 800
    const H = host.clientHeight || 600
    const idxOf = new Map(nodes.map((n, i) => [n.id, i]))

    // Соседи — для подсветки при наведении
    const adj = new Map<string, Set<string>>()
    for (const n of nodes) adj.set(n.id, new Set())
    for (const e of edges) {
      adj.get(e.s)?.add(e.t)
      adj.get(e.t)?.add(e.s)
    }

    // Стартовые позиции по кругу с джиттером
    const R = Math.min(W, H) * 0.35
    simRef.current = nodes.map((n, i) => {
      const a = (i / Math.max(1, nodes.length)) * Math.PI * 2
      return {
        id: n.id,
        deg: n.deg,
        x: W / 2 + Math.cos(a) * R + (Math.random() - 0.5) * 40,
        y: H / 2 + Math.sin(a) * R + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        fixed: false
      }
    })
    const sim = simRef.current
    const byId = new Map(sim.map((s) => [s.id, s]))
    alphaRef.current = 1
    viewRef.current = { tx: 0, ty: 0, scale: 1 }

    const applyTransform = (): void => {
      const v = viewRef.current
      gRef.current?.setAttribute('transform', `translate(${v.tx},${v.ty}) scale(${v.scale})`)
    }
    applyTransform()

    const CX = W / 2
    const CY = H / 2
    const REPULSION = 9000
    const SPRING = 0.02
    const LINK_LEN = 130
    const GRAVITY = 0.016
    const DAMP = 0.86
    const rOf = (deg: number): number => 5 + Math.sqrt(deg) * 2

    const step = (): void => {
      const alpha = alphaRef.current
      for (let i = 0; i < sim.length; i++) {
        const a = sim[i]
        for (let j = i + 1; j < sim.length; j++) {
          const b = sim[j]
          let dx = a.x - b.x
          let dy = a.y - b.y
          let d2 = dx * dx + dy * dy
          if (d2 < 0.01) {
            dx = Math.random() - 0.5
            dy = Math.random() - 0.5
            d2 = 1
          }
          const d = Math.sqrt(d2)
          const f = (REPULSION / d2) * alpha
          a.vx += (dx / d) * f
          a.vy += (dy / d) * f
          b.vx -= (dx / d) * f
          b.vy -= (dy / d) * f
        }
      }
      for (const e of edges) {
        const a = byId.get(e.s)
        const b = byId.get(e.t)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const f = (d - LINK_LEN) * SPRING * alpha
        a.vx += (dx / d) * f
        a.vy += (dy / d) * f
        b.vx -= (dx / d) * f
        b.vy -= (dy / d) * f
      }
      let moved = 0
      for (let i = 0; i < sim.length; i++) {
        const s = sim[i]
        if (!s.fixed) {
          s.vx += (CX - s.x) * GRAVITY * alpha
          s.vy += (CY - s.y) * GRAVITY * alpha
          s.vx *= DAMP
          s.vy *= DAMP
          s.x += s.vx
          s.y += s.vy
          moved += Math.abs(s.vx) + Math.abs(s.vy)
        }
        const c = circleEls.current[i]
        if (c) {
          c.setAttribute('cx', String(s.x))
          c.setAttribute('cy', String(s.y))
        }
        const tx = textEls.current[i]
        if (tx) {
          tx.setAttribute('x', String(s.x))
          tx.setAttribute('y', String(s.y + rOf(s.deg) + 11))
        }
      }
      for (let i = 0; i < edges.length; i++) {
        const line = lineEls.current[i]
        if (!line) continue
        const a = byId.get(edges[i].s)
        const b = byId.get(edges[i].t)
        if (!a || !b) continue
        line.setAttribute('x1', String(a.x))
        line.setAttribute('y1', String(a.y))
        line.setAttribute('x2', String(b.x))
        line.setAttribute('y2', String(b.y))
      }
      alphaRef.current *= 0.985
      rafRef.current = alphaRef.current > 0.03 && moved > 0.5 ? requestAnimationFrame(step) : 0
    }
    const kick = (): void => {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)

    // --- Взаимодействия ---
    let dragNode: Sim | null = null
    let panning = false
    let last = { x: 0, y: 0 }
    let movedPx = 0

    const toWorld = (cx: number, cy: number): { x: number; y: number } => {
      const rect = host.getBoundingClientRect()
      const v = viewRef.current
      return { x: (cx - rect.left - v.tx) / v.scale, y: (cy - rect.top - v.ty) / v.scale }
    }
    const highlight = (nid: string | null): void => {
      const nb = nid ? adj.get(nid) : null
      for (let i = 0; i < sim.length; i++) {
        const on = !nid || sim[i].id === nid || (nb ? nb.has(sim[i].id) : false)
        if (circleEls.current[i]) circleEls.current[i]!.style.opacity = on ? '1' : '0.2'
        if (textEls.current[i]) textEls.current[i]!.style.opacity = on ? '1' : '0.15'
      }
      for (let i = 0; i < edges.length; i++) {
        const on = !nid || edges[i].s === nid || edges[i].t === nid
        if (lineEls.current[i]) lineEls.current[i]!.style.opacity = on ? '0.55' : '0.06'
      }
    }

    const onDown = (ev: PointerEvent): void => {
      host.setPointerCapture(ev.pointerId)
      movedPx = 0
      const nid = (ev.target as Element).getAttribute?.('data-node')
      if (nid) {
        dragNode = byId.get(nid) || null
        if (dragNode) dragNode.fixed = true
      } else {
        panning = true
        last = { x: ev.clientX, y: ev.clientY }
      }
    }
    const onMove = (ev: PointerEvent): void => {
      movedPx += Math.abs(ev.movementX) + Math.abs(ev.movementY)
      if (dragNode) {
        const w = toWorld(ev.clientX, ev.clientY)
        dragNode.x = w.x
        dragNode.y = w.y
        dragNode.vx = 0
        dragNode.vy = 0
        alphaRef.current = Math.max(alphaRef.current, 0.4)
        kick()
      } else if (panning) {
        const v = viewRef.current
        v.tx += ev.clientX - last.x
        v.ty += ev.clientY - last.y
        last = { x: ev.clientX, y: ev.clientY }
        applyTransform()
      } else {
        highlight((ev.target as Element).getAttribute?.('data-node') || null)
      }
    }
    const onUp = (ev: PointerEvent): void => {
      try {
        host.releasePointerCapture(ev.pointerId)
      } catch {
        /* ignore */
      }
      if (dragNode && movedPx < 4) onOpen(dragNode.id)
      if (dragNode) dragNode.fixed = false
      dragNode = null
      panning = false
    }
    const onWheel = (ev: WheelEvent): void => {
      ev.preventDefault()
      const v = viewRef.current
      const rect = host.getBoundingClientRect()
      const mx = ev.clientX - rect.left
      const my = ev.clientY - rect.top
      const ns = Math.min(4, Math.max(0.15, v.scale * (ev.deltaY < 0 ? 1.12 : 1 / 1.12)))
      v.tx = mx - ((mx - v.tx) / v.scale) * ns
      v.ty = my - ((my - v.ty) / v.scale) * ns
      v.scale = ns
      applyTransform()
    }

    host.addEventListener('pointerdown', onDown)
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerup', onUp)
    host.addEventListener('wheel', onWheel, { passive: false })
    void idxOf
    return () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      host.removeEventListener('pointerdown', onDown)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerup', onUp)
      host.removeEventListener('wheel', onWheel)
    }
  }, [nodes, edges, onOpen])

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>🕸 Граф связей</span>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {nodes.length} заметок · {edges.length} связей · колесо — зум, тяни узел — двигать, клик — открыть
        </span>
        <div style={{ flex: 1 }} />
        <button className="vault-btn" onClick={onClose}>
          ✕ Закрыть граф
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {nodes.length === 0 ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
            Нет заметок для графа
          </div>
        ) : (
          <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}>
            <g ref={gRef}>
              {edges.map((e, i) => (
                <line
                  key={i}
                  ref={(el) => {
                    lineEls.current[i] = el
                  }}
                  stroke="var(--border)"
                  strokeWidth={1}
                  style={{ opacity: 0.45 }}
                />
              ))}
              {nodes.map((n, i) => {
                const r = 5 + Math.sqrt(n.deg) * 2
                const isCurrent = n.id === currentPath
                return (
                  <g key={n.id}>
                    <circle
                      ref={(el) => {
                        circleEls.current[i] = el
                      }}
                      data-node={n.id}
                      r={r}
                      fill={isCurrent ? '#F472B6' : n.deg > 0 ? 'var(--accent)' : 'var(--muted)'}
                      style={{ cursor: 'pointer' }}
                    />
                    <text
                      ref={(el) => {
                        textEls.current[i] = el
                      }}
                      textAnchor="middle"
                      fontSize={11}
                      fill="var(--muted)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {n.label}
                    </text>
                  </g>
                )
              })}
            </g>
          </svg>
        )}
      </div>
    </div>
  )
}
