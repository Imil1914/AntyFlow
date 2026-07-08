import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  createShapeId,
  resizeBox,
  stopEventPropagation,
  toRichText,
  type Editor,
  type RecordProps,
  type TLBaseShape,
  type TLResizeInfo
} from 'tldraw'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import hljs from 'highlight.js/lib/core'
import pythonLang from 'highlight.js/lib/languages/python'
hljs.registerLanguage('python', pythonLang)
import type { NotebookMsg } from '../flow-api'
import { loadPdf, renderPage, extractPageText, chunkText, textInBBox } from '../pdf/pdfjs'
import { embedPassages, loadEmbedder, embedQuery } from '../pdf/embeddings'
import MarkdownView from '../components/MarkdownView'
import ScaledSlide from '../slides/SlideHtml'
import { parseSlide } from '../slides/SlideView'
import { renderMermaidCode } from '../slides/mermaid'
import { NodeIcon } from '../os/nodeIcons'
import { SLIDE_SYSTEM_PROMPT, PALETTES, customPalette, type Palette } from '../slides/design'
import { slidesToPngs, exportPdf, exportPptx, type ExportItem } from '../slides/exporter'

// Лимит контекста: при достижении диалог начинается заново
const CONTEXT_LIMIT = 64000 // дефолт для локальных моделей

// Размер контекстного окна под конкретную модель (для API-провайдеров).
function contextLimitFor(model: string): number {
  const m = (model || '').toLowerCase()
  if (!m) return CONTEXT_LIMIT
  if (/gemini-1\.5|gemini-2|gemini.*pro|gemini.*flash/.test(m)) return 1000000
  if (/claude|sonnet|opus|haiku/.test(m)) return 200000
  if (/gpt-4o|gpt-4\.1|gpt-4-turbo|o1|o3|gpt-4\b/.test(m)) return 128000
  if (/glm-4|glm-4\.6/.test(m)) return 128000
  if (/deepseek/.test(m)) return 128000
  if (/gpt-3\.5/.test(m)) return 16000
  if (/llama-?3|qwen|mistral|mixtral|gemma|phi/.test(m)) return 32000
  return CONTEXT_LIMIT
}

type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

import { transcribe } from '../whisper'

// Вложения в ИИ-ноду
type Attachment = { id: string; kind: 'image' | 'file'; name: string; dataUrl?: string; text?: string }
const attId = () => Math.random().toString(36).slice(2, 9)
const TEXT_EXT =
  /\.(txt|md|markdown|json|csv|tsv|log|py|js|ts|tsx|jsx|html?|css|xml|ya?ml|ini|toml|sql|c|cpp|h|hpp|java|go|rs|rb|php|sh|bat|env)$/i
// Документы: текст извлекается в главном процессе (pdf-parse / OOXML)
const DOC_EXT = /\.(pdf|docx|pptx)$/i
// Изображения по расширению — на случай пустого MIME (heic/avif/webp с некоторых ОС)
const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|ico|tiff?)$/i

// --- Описание ноды ---
export type FlowNodeShape = TLBaseShape<
  'flow-node',
  {
    w: number
    h: number
    kind: string // note | ai | doc | answer
    title: string
    body: string // текст / промпт / ответ
    model: string // выбранная модель (ai)
    history: string // JSON-история диалога (ai)
    contextTokens: number // использовано токенов контекста (ai)
    answerId: string // id связанной карточки-ответа (ai)
    sourceId: string // id ноды-источника (у answer — его ai-нода)
    extra: string // JSON для будущих полей (чтобы не менять схему)
  }
>

// ---------- Палитра «Персональная ОС» ----------
// Через CSS-переменные — чтобы ноды подхватывали смену темы (Графит/Обсидиан/Тёплый уголь)
const C = {
  card: 'var(--panel)',
  cardTop: 'var(--panel2)',
  field: 'var(--bg)',
  border: 'var(--border)',
  text: 'var(--text)',
  textDim: 'var(--muted)',
  blue: 'var(--accent)',
  green: 'var(--c-note)',
  amber: 'var(--c-code)',
  red: '#F87171'
}

const KINDS: Record<string, { color: string; grad: string; icon: string }> = {
  note: { color: '#4ADE80', grad: 'linear-gradient(160deg,#6ee7a0,#4ADE80)', icon: '📝' },
  ai: { color: '#22D3EE', grad: 'linear-gradient(160deg,#5ce1f5,#22D3EE)', icon: '🤖' },
  doc: { color: '#4ADE80', grad: 'linear-gradient(160deg,#6ee7a0,#4ADE80)', icon: '📄' },
  answer: { color: '#A78BFA', grad: 'linear-gradient(160deg,#c4b1ff,#A78BFA)', icon: '✨' },
  code: { color: '#FBBF24', grad: 'linear-gradient(160deg,#fcd15a,#FBBF24)', icon: '💻' },
  codeblock: { color: '#FBBF24', grad: 'linear-gradient(160deg,#fcd15a,#FBBF24)', icon: '📦' },
  search: { color: '#22D3EE', grad: 'linear-gradient(160deg,#5ce1f5,#22D3EE)', icon: '🔎' },
  image: { color: '#A78BFA', grad: 'linear-gradient(160deg,#c4b1ff,#A78BFA)', icon: '🖼' },
  deck: { color: '#F472B6', grad: 'linear-gradient(160deg,#f89bcd,#F472B6)', icon: '🎞' },
  slide: { color: '#8B93A3', grad: 'linear-gradient(160deg,#a7aebb,#8B93A3)', icon: '▭' },
  ref: { color: '#22D3EE', grad: 'linear-gradient(160deg,#5ce1f5,#22D3EE)', icon: '📎' },
  diagram: { color: '#22D3EE', grad: 'linear-gradient(160deg,#5ce1f5,#22D3EE)', icon: '◇' },
  opencode: { color: '#F97316', grad: 'linear-gradient(160deg,#fb923c,#F97316)', icon: '🖥' },
  anythingllm: { color: '#14B8A6', grad: 'linear-gradient(160deg,#2dd4bf,#14B8A6)', icon: '🧠' },
  openscience: { color: '#2C7BE5', grad: 'linear-gradient(160deg,#5b9cf0,#2C7BE5)', icon: '🔬' },
  notebook: { color: '#F9A825', grad: 'linear-gradient(160deg,#ffca28,#F9A825)', icon: '📓' },
  pdf: { color: '#FF6B6B', grad: 'linear-gradient(160deg,#ff8a8a,#FF6B6B)', icon: '📕' }
}

// Собрать референсы, присоединённые к ноде стрелками (картинки + текст)
function gatherReferences(editor: Editor, deckId: string): { images: string[]; texts: string[] } {
  const images: string[] = []
  const texts: string[] = []
  const seen = new Set<string>()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toDeck = (editor as any).getBindingsToShape(deckId, 'arrow') as Array<{ fromId: string }>
    for (const b of toDeck) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arrowBs = (editor as any).getBindingsFromShape(b.fromId, 'arrow') as Array<{ toId: string }>
      for (const ab of arrowBs) {
        if (ab.toId === deckId || seen.has(ab.toId)) continue
        seen.add(ab.toId)
        const ref = editor.getShape<FlowNodeShape>(ab.toId as never)
        if (!ref || ref.type !== 'flow-node') continue
        const p = ref.props
        try {
          const img = JSON.parse(p.extra || '{}').image
          if (img) images.push(img)
        } catch {
          /* ignore */
        }
        const t = `${p.title ? p.title + ': ' : ''}${p.body || ''}`.trim()
        if (t && p.kind !== 'ref' && p.kind !== 'slide') texts.push(t)
      }
    }
  } catch {
    /* API отличается — не критично */
  }
  return { images, texts }
}

// Живые снимки диалогов агент-нод (opencode/anythingllm/openscience). Их содержимое
// живёт в терминале/webview, а не в props шейпа, поэтому каждая такая нода, пока
// открыта, кладёт сюда свой транскрипт (in-memory, без записи в props — чтобы не
// раздувать undo/сохранение). Сбор контекста по стрелке читает отсюда.
const agentTranscripts = new Map<string, string>()
function setAgentTranscript(id: string, text: string): void {
  const t = (text || '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (t.length > 20) agentTranscripts.set(id, t.slice(-12000))
}
// Убрать ANSI/управляющие последовательности из вывода терминала (без литералов
// управляющих символов в исходнике: ESC через fromCharCode, прочие — по коду).
function stripAnsi(s: string): string {
  const ESC = String.fromCharCode(27)
  const csi = new RegExp(ESC + '\\[[0-9;?]*[ -/]*[@-~]', 'g')
  const other = new RegExp(ESC + '[()#=>][0-9A-Za-z]?', 'g')
  const cleaned = s.replace(csi, '').replace(other, '')
  let out = ''
  for (const ch of cleaned) {
    const c = ch.charCodeAt(0)
    if (c === 9 || c === 10 || c >= 32) out += ch
  }
  return out
}
// Текст-контекст из ноды-источника (для передачи в связанный чат по стрелке).
function extractNodeContext(editor: Editor, s: FlowNodeShape): string {
  const p = s.props
  const title = (p.title || '').trim()
  // Агент-ноды с живым диалогом в терминале/webview — берём их снимок из реестра.
  if (p.kind === 'opencode' || p.kind === 'anythingllm' || p.kind === 'openscience') {
    const t = (agentTranscripts.get(String(s.id)) || '').trim()
    if (!t) return ''
    const label =
      p.kind === 'opencode' ? 'OpenCode (терминал)' : p.kind === 'anythingllm' ? 'AnythingLLM' : 'OpenScience'
    return `${label}${title ? ` «${title}»` : ''}:\n${t.slice(-8000)}`
  }
  if (p.kind === 'ai') {
    // Последние реплики диалога — чтобы следующий чат «видел» ход обсуждения
    try {
      const hist = JSON.parse(p.history || '[]') as ChatMessage[]
      const parts = hist
        .filter((m) => m.role !== 'system')
        .slice(-4)
        .map((m) => `${m.role === 'user' ? 'Вопрос' : 'Ответ'}: ${m.content}`)
      if (parts.length) return `Чат «${title || 'AI'}»:\n${parts.join('\n')}`
    } catch {
      /* ignore */
    }
    return p.body ? `Чат «${title || 'AI'}» (запрос): ${p.body}` : ''
  }
  if (p.kind === 'answer') {
    return p.body ? `Ответ${title && title !== 'Ответ' ? ` «${title}»` : ''}:\n${p.body}` : ''
  }
  if (p.kind === 'notebook') {
    // Ноутбук хранит ячейки в history — собираем код + вывод в читаемый текст
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cells = (JSON.parse(p.history || '{}').cells || []) as any[]
      const parts = cells
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((c: any) => {
          if (c.type === 'markdown') return String(c.source || '')
          let s = '```python\n' + String(c.source || '') + '\n```'
          const outs = (c.outputs || [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((o: any) => (o.kind === 'image' ? '[график]' : String(o.text || '')))
            .filter(Boolean)
            .join('\n')
          if (outs) s += '\n# Вывод:\n' + outs
          return s
        })
        .filter(Boolean)
      const nbText = parts.join('\n\n')
      if (nbText) return `Jupyter-ноутбук${title ? ` «${title}»` : ''}:\n${nbText.slice(0, 12000)}`
    } catch {
      /* ignore */
    }
    return ''
  }
  const b = (p.body || '').trim()
  if (!b) return ''
  return `${title ? title + ':\n' : ''}${b}`
}

// Собрать контекст из нод, соединённых стрелкой с этим чатом — В ЛЮБУЮ СТОРОНУ.
// Любой файл/заметка/ноутбук/код/схема/ответ, связанный стрелкой с чатом, попадает
// в контекст. Исключаем: живые чаты с моделью и собственные ответы этого чата.
function gatherChatContext(editor: Editor, nodeId: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const touching = (editor as any).getBindingsToShape(nodeId, 'arrow') as Array<{ fromId: string }>
    for (const b of touching) {
      // оба конца этой стрелки — второй конец и есть связанная нода
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ends = (editor as any).getBindingsFromShape(b.fromId, 'arrow') as Array<{ toId: string }>
      for (const ab of ends) {
        if (ab.toId === nodeId || seen.has(ab.toId)) continue
        seen.add(ab.toId)
        const src = editor.getShape<FlowNodeShape>(ab.toId as never)
        if (!src || src.type !== 'flow-node') continue
        if (src.id === nodeId) continue // сам себя не тянем
        if (src.props.sourceId === nodeId) continue // это собственный вывод этого чата
        const ctx = extractNodeContext(editor, src)
        if (ctx) out.push(ctx.slice(0, 8000))
      }
    }
  } catch {
    /* API отличается — не критично */
  }
  return out
}

const IMAGE_SIZES: Record<string, [number, number]> = {
  'Квадрат 1024': [1024, 1024],
  'Квадрат 768': [768, 768],
  'Квадрат 512': [512, 512],
  'Портрет 832×1216': [832, 1216],
  'Пейзаж 1216×832': [1216, 832]
}

function kindOf(kind: string) {
  return KINDS[kind] ?? { color: '#8e8e93', grad: 'linear-gradient(160deg,#aeaeb2,#8e8e93)', icon: '⬜' }
}

function fmtTokens(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k'
  return String(n)
}

function useUpdate(editor: Editor, shape: FlowNodeShape) {
  return (patch: Partial<FlowNodeShape['props']>) =>
    editor.updateShape<FlowNodeShape>({ id: shape.id, type: 'flow-node', props: patch })
}

// Соединить две ноды минималистичной линией с кружками на концах
// (используем встроенную стрелку tldraw с наконечниками-точками)
function connectArrow(editor: Editor, fromId: string, toId: string) {
  try {
    const arrowId = createShapeId()
    editor.createShape({
      id: arrowId,
      type: 'arrow',
      props: {
        arrowheadStart: 'dot',
        arrowheadEnd: 'dot',
        color: 'grey',
        size: 's'
      }
    })
    editor.createBinding({
      fromId: arrowId,
      toId: fromId,
      type: 'arrow',
      props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: true }
    } as never)
    editor.createBinding({
      fromId: arrowId,
      toId: toId,
      type: 'arrow',
      props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: true }
    } as never)
  } catch {
    /* стрелки не критичны */
  }
}

// Создать или обновить связанную карточку-результат (ответ ИИ / вывод кода).
// Текст кладётся в body, картинки (графики) — в extra.images.
// Сколько карточек указанного kind уже висит на источнике (для раскладки «паутиной»)
function countChildren(editor: Editor, sourceId: string, kind: string): number {
  return editor
    .getCurrentPageShapes()
    .filter(
      (s) =>
        s.type === 'flow-node' &&
        (s as FlowNodeShape).props.sourceId === sourceId &&
        (s as FlowNodeShape).props.kind === kind
    ).length
}

function ensureResultCard(
  editor: Editor,
  sourceId: string,
  content: string,
  images: string[] = []
) {
  const src = editor.getShape<FlowNodeShape>(sourceId as never)
  if (!src) return
  const extra = images.length ? JSON.stringify({ images }) : '{}'
  const bounds = editor.getShapePageBounds(sourceId as never)
  if (!bounds) return
  // Каждый запрос создаёт НОВУЮ карточку — прошлые ответы остаются на холсте,
  // раскладываются сеткой-каскадом справа и связываются стрелкой (эффект «паутины»).
  const prior = countChildren(editor, sourceId, 'answer')
  const CW = 380
  const CH = Math.max(260, src.props.h)
  const GAP = 40
  const perCol = 4
  const col = Math.floor(prior / perCol)
  const row = prior % perCol
  const id = createShapeId()
  editor.createShape<FlowNodeShape>({
    id,
    type: 'flow-node',
    x: bounds.maxX + 90 + col * (CW + GAP),
    y: bounds.y + row * (CH + GAP),
    props: {
      kind: 'answer',
      title: `Ответ ${prior + 1}`,
      body: content,
      extra,
      sourceId,
      w: CW,
      h: CH
    }
  })
  // Храним последний ответ как answerId (для «продолжить контекст»)
  editor.updateShape<FlowNodeShape>({
    id: sourceId as never,
    type: 'flow-node',
    props: { answerId: id }
  })
  connectArrow(editor, sourceId, id)
}

// Создать или обновить отдельный КВАДРАТ КОДА (из запрос-ноды).
function ensureCodeBlock(editor: Editor, requestId: string, code: string) {
  const src = editor.getShape<FlowNodeShape>(requestId as never)
  if (!src) return
  const bounds = editor.getShapePageBounds(requestId as never)
  if (!bounds) return
  // Каждая генерация — новый квадрат кода; прошлые остаются («паутина»).
  const prior = countChildren(editor, requestId, 'codeblock')
  const CW = 340
  const CH = 300
  const GAP = 40
  const perCol = 4
  const col = Math.floor(prior / perCol)
  const row = prior % perCol
  const id = createShapeId()
  editor.createShape<FlowNodeShape>({
    id,
    type: 'flow-node',
    x: bounds.maxX + 90 + col * (CW + GAP),
    y: bounds.y + row * (CH + GAP),
    props: { kind: 'codeblock', title: `Код ${prior + 1}`, body: code, sourceId: requestId, w: CW, h: CH }
  })
  editor.updateShape<FlowNodeShape>({
    id: requestId as never,
    type: 'flow-node',
    props: { answerId: id }
  })
  connectArrow(editor, requestId, id)
  editor.select(id)
}

// Создать новый ИИ-чат, ПРОДОЛЖАЮЩИЙ контекст (из карточки-ответа).
// Предыдущие вопросы-ответы остаются на холсте отдельными карточками.
function spawnFollowup(editor: Editor, answer: FlowNodeShape) {
  const src = answer.props.sourceId
    ? editor.getShape<FlowNodeShape>(answer.props.sourceId as never)
    : null
  const bounds = editor.getShapePageBounds(answer.id)
  if (!bounds) return
  const id = createShapeId()
  editor.createShape<FlowNodeShape>({
    id,
    type: 'flow-node',
    x: bounds.maxX + 90,
    y: bounds.y,
    props: {
      kind: 'ai',
      title: 'Продолжение',
      w: 300,
      h: 340,
      // Наследуем контекст источника
      model: src?.props.model ?? '',
      history: src?.props.history ?? '[]',
      contextTokens: src?.props.contextTokens ?? 0
    }
  })
  connectArrow(editor, answer.id, id)
  editor.select(id)
}

// ---------- Тело обычной ноды (заметка / документ) ----------
function SimpleBody({
  shape,
  editor,
  isEditing
}: {
  shape: FlowNodeShape
  editor: Editor
  isEditing: boolean
}) {
  const update = useUpdate(editor, shape)
  const { body } = shape.props

  if (isEditing) {
    return (
      <textarea
        className="flow-input"
        value={body}
        onChange={(e) => update({ body: e.currentTarget.value })}
        placeholder="Текст…"
        style={{
          width: '100%',
          height: '100%',
          resize: 'none',
          background: 'transparent',
          border: 'none',
          color: C.text,
          fontSize: 13.5,
          lineHeight: 1.5,
          fontFamily: 'inherit',
          outline: 'none'
        }}
      />
    )
  }
  // Просмотр — рендерим markdown (заголовки, списки, жирный, код, формулы),
  // а не сырой текст. Цвет — var(--text) через .flow-md, контраст нормальный.
  return (
    <div
      className="flow-scroll"
      onWheelCapture={stopEventPropagation}
      style={{ height: '100%', overflow: 'auto', color: C.text }}
    >
      {body ? (
        <MarkdownView content={body} />
      ) : (
        <span style={{ fontSize: 13.5, color: C.textDim }}>Двойной клик — редактировать</span>
      )}
    </div>
  )
}

// ---------- Тело карточки-ответа (текст + графики + «＋») ----------
function AnswerBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const { body } = shape.props
  const [hover, setHover] = useState(false)

  // Картинки (графики из кода) лежат в extra.images
  let images: string[] = []
  try {
    const e = JSON.parse(shape.props.extra || '{}')
    if (Array.isArray(e.images)) images = e.images
  } catch {
    /* ignore */
  }

  // «＋» (доп-вопрос) имеет смысл только для ответов ИИ
  const src = shape.props.sourceId
    ? editor.getShape<FlowNodeShape>(shape.props.sourceId as never)
    : null
  const canFollow = src?.props.kind === 'ai'

  return (
    <div
      style={{ position: 'relative', height: '100%' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="flow-scroll"
        onPointerDown={stopEventPropagation}
        onWheelCapture={stopEventPropagation}
        style={{
          color: C.text,
          userSelect: 'text',
          height: '100%',
          overflow: 'auto',
          paddingRight: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        <MarkdownView content={body || '…'} />
        {images.map((s, i) => (
          <img key={i} src={s} alt="" style={{ maxWidth: '100%', borderRadius: 8 }} />
        ))}
      </div>

      {/* «＋» сбоку — задать доп. вопрос, сохранив контекст */}
      {hover && canFollow && (
        <button
          className="flow-plus-btn"
          title="Задать доп. вопрос (сохранив контекст)"
          onPointerDown={stopEventPropagation}
          onClick={() => spawnFollowup(editor, shape)}
          style={{
            position: 'absolute',
            right: 2,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'linear-gradient(180deg,#409cff,#0a84ff)',
            color: '#fff',
            fontSize: 18,
            lineHeight: '1',
            fontWeight: 400,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(10,132,255,0.5)'
          }}
        >
          +
        </button>
      )}

      {/* Копировать текст ответа (в tldraw Ctrl+C копирует ноду, поэтому нужна кнопка) */}
      {hover && (
        <CopyBtn text={body || ''} />
      )}
    </div>
  )
}

// Кнопка «скопировать текст» — надёжный способ, минуя перехват Ctrl+C tldraw'ом
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      title="Скопировать текст"
      onPointerDown={stopEventPropagation}
      onClick={() => {
        navigator.clipboard.writeText(text).then(
          () => {
            setDone(true)
            setTimeout(() => setDone(false), 1200)
          },
          () => {
            /* clipboard недоступен */
          }
        )
      }}
      style={{
        position: 'absolute',
        right: 2,
        top: 2,
        height: 24,
        padding: '0 8px',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.18)',
        background: done ? '#238636' : 'rgba(30,30,34,0.85)',
        color: '#fff',
        fontSize: 11,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }}
    >
      {done ? '✓ Скопировано' : '📋 Копировать'}
    </button>
  )
}

// ---------- Общий выбор модели (группировка по провайдерам) ----------
function useModels() {
  const [models, setModels] = useState<{ value: string; label: string; group: string }[]>([])
  useEffect(() => {
    window.flow?.listModels().then(setModels).catch(() => setModels([]))
  }, [])
  return models
}

function ModelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const models = useModels()
  const groups = Array.from(new Set(models.map((m) => m.group)))
  return (
    <select
      className="flow-input"
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      style={selectStyle}
    >
      <option value="">
        {models.length ? 'Модель по умолчанию' : 'Нет моделей — LM Studio / ⚙ Настройки'}
      </option>
      {groups.map((g) => (
        <optgroup key={g} label={g}>
          {models
            .filter((m) => m.group === g)
            .map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  )
}

// Разобрать JSON-решение модели «нужен ли поиск»
function parseDecision(text: string): { search: boolean; query: string } | null {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    const j = JSON.parse(m[0])
    return { search: !!j.search, query: String(j.query || '') }
  } catch {
    return null
  }
}

// ---------- Тело ИИ-ноды ----------
// Переиспользуемая кнопка голосового ввода (локальный Whisper).
// onText вызывается с распознанным текстом — нода сама решает, куда его вставить.
function MicButton({ onText, round }: { onText: (t: string) => void; round?: boolean }) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState('')
  const [level, setLevel] = useState(0)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const rafRef = useRef<number>(0)
  const actxRef = useRef<AudioContext | null>(null)

  const stopMeter = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    actxRef.current?.close().catch(() => {})
    actxRef.current = null
    setLevel(0)
  }
  useEffect(() => () => stopMeter(), [])

  const toggle = async () => {
    if (busy) return
    if (recording) {
      recRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Визуализация уровня звука — иконка реагирует на голос
      const actx = new AudioContext()
      actxRef.current = actx
      const analyser = actx.createAnalyser()
      analyser.fftSize = 256
      actx.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.2))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
      const mr = new MediaRecorder(stream)
      chunks.current = []
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size) chunks.current.push(e.data)
      }
      mr.onstop = async () => {
        stopMeter()
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        const blob = new Blob(chunks.current, { type: mr.mimeType || 'audio/webm' })
        if (!blob.size) return
        setBusy(true)
        setHint('распознаю…')
        try {
          const text = await transcribe(blob, (m) => setHint(m))
          if (text) {
            onText(text)
            setHint('')
          } else {
            setHint('пусто — говори чётче')
            setTimeout(() => setHint(''), 6000)
          }
        } catch (e) {
          console.error('[whisper]', e)
          setHint('ошибка: ' + ((e as Error)?.message || String(e)).slice(0, 90))
          setTimeout(() => setHint(''), 12000)
        } finally {
          setBusy(false)
        }
      }
      mr.start()
      recRef.current = mr
      setRecording(true)
    } catch (e) {
      console.error('[whisper] mic', e)
      setHint('нет доступа к микрофону')
      setTimeout(() => setHint(''), 5000)
    }
  }

  const active = recording
  const ring = active ? 3 + level * 20 : 0
  const spread = active ? 1 + level * 9 : 0

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={toggle}
        onPointerDown={stopEventPropagation}
        title="Голосовой ввод — локальный Whisper"
        style={
          round
            ? {
                width: 34,
                height: 34,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 15,
                color: active ? '#fff' : C.textDim,
                background: busy
                  ? '#3a3a3c'
                  : active
                    ? 'linear-gradient(180deg,#ff5a5a,#e0342f)'
                    : 'rgba(255,255,255,0.08)',
                boxShadow: active ? `0 0 ${ring}px ${spread}px rgba(255,70,70,${0.25 + level * 0.55})` : 'none',
                transform: active ? `scale(${1 + level * 0.18})` : 'scale(1)',
                transition: 'background .2s, box-shadow .06s, transform .06s'
              }
            : {
                alignSelf: 'flex-start',
                border: `1px solid ${active ? C.red : C.border}`,
                background: active ? 'rgba(255,80,80,0.15)' : 'rgba(255,255,255,0.05)',
                color: active ? C.red : C.textDim,
                borderRadius: 8,
                fontSize: 11,
                padding: '4px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: active ? `0 0 ${ring}px rgba(255,70,70,${0.3 + level * 0.5})` : 'none'
              }
        }
      >
        {busy ? '⏳' : active ? '⏹' : '🎤'}
        {!round && ' ' + (hint || (active ? 'стоп' : 'голос'))}
      </button>
      {round && hint && (
        <div
          style={{
            position: 'absolute',
            bottom: '120%',
            right: 0,
            whiteSpace: 'nowrap',
            fontSize: 10,
            color: hint.startsWith('ошибка') ? C.red : C.textDim,
            background: C.field,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '2px 6px',
            zIndex: 20
          }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}

function AiBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { body, model, contextTokens } = shape.props
  let ex: { webAuto?: boolean; tools?: boolean } = {}
  try {
    ex = JSON.parse(shape.props.extra || '{}')
  } catch {
    /* ignore */
  }
  const webAuto = !!ex.webAuto
  const toolsOn = !!ex.tools
  const setEx = (patch: Record<string, unknown>) =>
    update({ extra: JSON.stringify({ ...ex, ...patch }) })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Вложения к следующему сообщению: фото (→ vision) и текстовые файлы (→ контекст)
  const [attach, setAttach] = useState<Attachment[]>([])
  const attachInput = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const ctxLimit = contextLimitFor(model)

  const flash = (msg: string) => {
    setNotice(msg)
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 4000)
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach((f) => {
      const r = new FileReader()
      if (f.type.startsWith('image/') || IMG_EXT.test(f.name)) {
        r.onload = () =>
          setAttach((a) => [...a, { id: attId(), kind: 'image', name: f.name, dataUrl: String(r.result) }])
        r.readAsDataURL(f)
      } else if (DOC_EXT.test(f.name)) {
        // PDF / Word / PowerPoint — извлекаем текст в главном процессе
        r.onload = async () => {
          const base64 = String(r.result).split(',')[1] || ''
          flash(`📄 Извлекаю текст из «${f.name}»…`)
          try {
            const res = await window.flow.extractDoc({ base64, name: f.name })
            if (res.ok) {
              setAttach((a) => [...a, { id: attId(), kind: 'file', name: f.name, text: res.text }])
              flash(`✅ «${f.name}» прикреплён`)
            } else {
              flash(`«${f.name}»: ${res.error}`)
            }
          } catch (e) {
            flash(`«${f.name}»: ${String(e)}`)
          }
        }
        r.readAsDataURL(f)
      } else if (TEXT_EXT.test(f.name)) {
        r.onload = () =>
          setAttach((a) => [...a, { id: attId(), kind: 'file', name: f.name, text: String(r.result).slice(0, 20000) }])
        r.readAsText(f)
      } else {
        // Любой другой формат: пытаемся прочитать как текст; бинарь — прикрепляем как факт-вложение
        r.onload = () => {
          const raw = String(r.result || '')
          const sample = raw.slice(0, 4000)
          let bad = 0
          for (let i = 0; i < sample.length; i++) {
            const c = sample.charCodeAt(i)
            if (c === 0xfffd || c < 9 || (c > 13 && c < 32)) bad++
          }
          const binary = sample.length > 0 && bad / sample.length > 0.1
          if (binary || !raw.trim()) {
            const kb = Math.max(1, Math.round(f.size / 1024))
            setAttach((a) => [
              ...a,
              {
                id: attId(),
                kind: 'file',
                name: f.name,
                text: `[бинарный файл «${f.name}», ${kb} КБ — текст не извлекается]`
              }
            ])
            flash(`📎 «${f.name}» прикреплён (бинарный, ${kb} КБ)`)
          } else {
            setAttach((a) => [...a, { id: attId(), kind: 'file', name: f.name, text: raw.slice(0, 20000) }])
            flash(`✅ «${f.name}» прикреплён`)
          }
        }
        r.readAsText(f)
      }
    })
  }

  const run = async () => {
    if (!body.trim() || loading) return
    setError(null)
    setLoading(true)
    try {
      const history: ChatMessage[] = JSON.parse(shape.props.history || '[]')

      // Авто-поиск: модель сама решает, нужен ли веб-поиск
      let searchContext = ''
      if (webAuto) {
        flash('🔎 Проверяю, нужен ли поиск…')
        const decSys =
          'Реши, нужен ли веб-поиск для точного ответа (актуальные события, свежие факты, цены, новости, то что меняется во времени). ' +
          'Ответь СТРОГО одним JSON без пояснений: {"search": true|false, "query": "поисковый запрос"}.'
        const dec = await window.flow.aiChat({
          model,
          messages: [
            { role: 'system', content: decSys },
            { role: 'user', content: body }
          ]
        })
        if (dec.ok) {
          const parsed = parseDecision(dec.content)
          if (parsed?.search && parsed.query) {
            flash('🔎 Ищу в вебе…')
            const sr = await window.flow.webSearch({ query: parsed.query })
            if (sr.ok && sr.results.length) {
              searchContext = sr.results
                .map((x, i) => `[${i + 1}] ${x.title}\n${x.url}\n${x.snippet}`)
                .join('\n\n')
            }
          }
        }
      }

      // Собираем сообщения для финального ответа (поиск вставляем только на этот ход)
      const finalMessages: ChatMessage[] = [...history]
      if (searchContext) {
        finalMessages.push({
          role: 'system',
          content:
            'Актуальные результаты веб-поиска для ответа:\n' +
            searchContext +
            '\nОпирайся на них и ссылайся на источники как [1], [2].'
        })
      }
      // Контекст от связанных чатов/нод: стрелки, ведущие В этот чат
      const linked = gatherChatContext(editor, shape.id)
      if (linked.length) {
        flash(`🔗 Подхватил контекст: ${linked.length} ${linked.length === 1 ? 'источник' : 'источника(ов)'}`)
        finalMessages.push({
          role: 'system',
          content:
            'Пользователь прикрепил к этому чату материалы стрелками на холсте — они приведены ниже ' +
            '(это могут быть заметки, файлы, код, Jupyter-ноутбуки и т.п.). ' +
            'Когда пользователь говорит «этот ноутбук», «этот код», «этот файл», «объясни это» и подобное — ' +
            'он имеет в виду ИМЕННО эти материалы, а не физическое устройство или что-то стороннее. ' +
            'Отвечай прямо по ним и НЕ переспрашивай, что имеется в виду.\n\n' +
            linked.join('\n\n———\n\n')
        })
      }

      // Вложенные текстовые файлы — в контекст
      const fileParts = attach.filter((a) => a.kind === 'file' && a.text)
      if (fileParts.length) {
        finalMessages.push({
          role: 'system',
          content:
            'Вложенные пользователем файлы (используй их как контекст):\n\n' +
            fileParts.map((a) => `=== ${a.name} ===\n${a.text}`).join('\n\n')
        })
      }
      finalMessages.push({ role: 'user', content: body })

      // Вложенные изображения — в vision (поддерживает aiChat)
      const imgs = attach.filter((a) => a.kind === 'image' && a.dataUrl).map((a) => a.dataUrl as string)

      if (toolsOn) flash('🔧 Работаю с инструментами…')
      const res = toolsOn
        ? await window.flow.agentChat({ model, messages: finalMessages })
        : await window.flow.aiChat({ model, messages: finalMessages, images: imgs.length ? imgs : undefined })
      if (!res.ok) {
        setError(res.error)
        return
      }
      // В историю кладём только реальный диалог (без вставленного поиска)
      const newHistory: ChatMessage[] = [
        ...history,
        { role: 'user', content: body },
        { role: 'assistant', content: res.content }
      ]
      const tokens = res.totalTokens || Math.round(JSON.stringify(newHistory).length / 4)
      ensureResultCard(editor, shape.id, res.content)
      setAttach([]) // вложения использованы
      if (tokens >= ctxLimit) {
        // Достигли лимита — начинаем контекст заново
        update({ history: '[]', contextTokens: 0 })
        flash(`Контекст достиг ${fmtTokens(ctxLimit)} — диалог начат заново`)
      } else {
        update({ history: JSON.stringify(newHistory), contextTokens: tokens })
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const resetContext = () => {
    update({ history: '[]', contextTokens: 0 })
    flash('Контекст очищен')
  }

  // Полоска контекста
  const pct = Math.min(contextTokens / ctxLimit, 1)
  const meterColor = pct < 0.6 ? C.green : pct < 0.85 ? C.amber : C.red

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      {/* Выбор модели (LM Studio + API-провайдеры) */}
      <ModelSelect value={model} onChange={(v) => update({ model: v })} />

      {/* Чипы вложений */}
      {attach.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {attach.map((a) => (
            <span
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 11,
                color: C.text,
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: '3px 7px'
              }}
            >
              {a.kind === 'image' && a.dataUrl ? (
                <img src={a.dataUrl} alt="" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} />
              ) : (
                '📄'
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {a.name}
              </span>
              <span
                onClick={() => setAttach((x) => x.filter((y) => y.id !== a.id))}
                style={{ cursor: 'pointer', color: C.textDim }}
              >
                ✕
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Композер — как у современных чатов: поле + панель инструментов */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: C.field,
          border: `1px solid ${dragOver ? C.blue : C.border}`,
          borderRadius: 12,
          padding: 8,
          minHeight: 96
        }}
      >
        <textarea
          className="flow-input"
          value={body}
          onChange={(e) => update({ body: e.currentTarget.value })}
          placeholder="Спроси что-нибудь…"
          style={{
            flex: 1,
            resize: 'none',
            minHeight: 44,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: C.text,
            fontSize: 12.5,
            lineHeight: 1.5,
            fontFamily: 'inherit'
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* «＋» меню: прикрепить / веб-поиск / MCP */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              onPointerDown={stopEventPropagation}
              title="Добавить"
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                border: `1px solid ${C.border}`,
                background: menuOpen ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)',
                color: C.text,
                fontSize: 17,
                lineHeight: 1,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center'
              }}
            >
              ＋
            </button>
            {menuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '120%',
                  left: 0,
                  zIndex: 30,
                  minWidth: 210,
                  background: C.field,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.45)'
                }}
              >
                <button
                  onClick={() => {
                    attachInput.current?.click()
                    setMenuOpen(false)
                  }}
                  style={menuItemStyle}
                >
                  📎 Прикрепить файл / фото
                </button>
                <button onClick={() => setEx({ webAuto: !webAuto })} style={menuItemStyle}>
                  {webAuto ? '✅' : '🔎'}&nbsp; Веб-поиск {webAuto ? '· вкл' : '· выкл'}
                </button>
                <button onClick={() => setEx({ tools: !toolsOn })} style={menuItemStyle}>
                  {toolsOn ? '✅' : '🔧'}&nbsp; Инструменты MCP {toolsOn ? '· вкл' : '· выкл'}
                </button>
              </div>
            )}
          </div>

          {/* Активные режимы */}
          {webAuto && (
            <span title="Веб-поиск включён" style={pillStyle}>
              🔎
            </span>
          )}
          {toolsOn && (
            <span title="MCP включены" style={pillStyle}>
              🔧
            </span>
          )}

          <div style={{ flex: 1 }} />

          {/* Голос — снизу справа, реагирует на голос */}
          <MicButton
            round
            onText={(t) => {
              const cur = ((editor.getShape(shape.id) as FlowNodeShape | undefined)?.props.body as string) || ''
              update({ body: cur ? cur.replace(/\s*$/, '') + ' ' + t : t })
            }}
          />

          {/* Отправить */}
          <button
            onClick={run}
            onPointerDown={stopEventPropagation}
            disabled={loading}
            title="Отправить"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              color: '#fff',
              fontSize: 15,
              display: 'grid',
              placeItems: 'center',
              background: loading ? '#3a3a3c' : 'linear-gradient(180deg,#0a90ff,#0060df)',
              boxShadow: loading ? 'none' : '0 2px 8px rgba(10,132,255,0.35)'
            }}
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
      </div>

      <input
        ref={attachInput}
        type="file"
        multiple
        accept="*/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          addFiles(e.target.files)
          e.currentTarget.value = ''
        }}
      />

      {/* Счётчик контекста — привязан к модели */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: C.textDim, letterSpacing: '0.02em' }}>
            КОНТЕКСТ · {model ? model.slice(0, 18) : 'локальная'}
          </span>
          <span style={{ fontSize: 10.5, color: C.textDim }}>
            {fmtTokens(contextTokens)} / {fmtTokens(ctxLimit)}
            <button className="flow-mini-btn" onClick={resetContext} title="Очистить контекст" style={miniBtnStyle}>
              сброс
            </button>
          </span>
        </div>
        <div style={{ height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct * 100}%`,
              background: meterColor,
              borderRadius: 3,
              transition: 'width .3s ease, background .3s'
            }}
          />
        </div>
      </div>

      {notice && <div style={{ fontSize: 11, color: C.amber }}>{notice}</div>}
      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}
    </div>
  )
}

const fieldStyle = {
  background: C.field,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  color: C.text,
  fontSize: 12.5,
  fontFamily: 'inherit',
  padding: '7px 9px',
  outline: 'none'
} as const

const selectStyle = { ...fieldStyle, cursor: 'pointer' } as const

const miniBtnStyle = {
  marginLeft: 8,
  border: 'none',
  background: 'rgba(255,255,255,0.08)',
  color: C.textDim,
  borderRadius: 5,
  fontSize: 10,
  padding: '1px 6px',
  cursor: 'pointer'
} as const

const menuItemStyle = {
  border: 'none',
  background: 'transparent',
  color: C.text,
  fontSize: 12,
  textAlign: 'left' as const,
  padding: '7px 9px',
  borderRadius: 7,
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const
} as const

const pillStyle = {
  fontSize: 12,
  padding: '2px 6px',
  borderRadius: 6,
  background: 'rgba(80,150,255,0.16)',
  border: `1px solid ${C.border}`
} as const

// Разобрать JSON из props.extra (не падаем на кривом JSON)
function parseExtra(s: string): Record<string, string> {
  try {
    return JSON.parse(s || '{}')
  } catch {
    return {}
  }
}

// Убрать markdown-ограждение ```<язык> … ``` из ответа модели (python, mermaid и т.п.)
function stripFences(text: string): string {
  const m = text.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/)
  return (m ? m[1] : text).trim()
}

// ---------- Запрос-нода: описание → генерация кода в ОТДЕЛЬНЫЙ квадрат ----------
function CodeRequestBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { model } = shape.props
  const instruction = parseExtra(shape.props.extra).instruction ?? ''
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setInstruction = (v: string) => update({ extra: JSON.stringify({ instruction: v }) })

  const generate = async () => {
    if (!instruction.trim() || generating) return
    setError(null)
    setGenerating(true)
    try {
      const sys =
        'Ты — генератор Python-кода. Отвечай ТОЛЬКО рабочим кодом на Python, без пояснений и без markdown-разметки. ' +
        'ВАЖНО: окружение неинтерактивное — НЕ используй input() и чтение с клавиатуры. ' +
        'Если нужно приложение с интерфейсом (например калькулятор) — используй tkinter (откроется отдельное окно). ' +
        'Иначе выводи результат через print() с готовыми примерами. Комментарии на русском допустимы.'
      const res = await window.flow.aiChat({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: instruction }
        ]
      })
      if (res.ok) ensureCodeBlock(editor, shape.id, stripFences(res.content))
      else setError(res.error)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <ModelSelect value={model} onChange={(v) => update({ model: v })} />

      <textarea
        className="flow-input flow-scroll"
        value={instruction}
        onChange={(e) => setInstruction(e.currentTarget.value)}
        placeholder="🤖 Опиши, что написать (напр. «калькулятор на tkinter»)…"
        style={{ ...fieldStyle, flex: 1, minHeight: 60, resize: 'none', lineHeight: 1.45 }}
      />

      <MicButton onText={(t) => setInstruction((p) => (p ? p.replace(/\s*$/, '') + ' ' + t : t))} />

      <button
        className="flow-run-btn"
        onClick={generate}
        disabled={generating}
        style={{
          cursor: generating ? 'default' : 'pointer',
          border: 'none',
          borderRadius: 10,
          padding: '9px',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: generating ? '#3a3a3c' : 'linear-gradient(180deg,#409cff,#0a84ff)',
          boxShadow: generating ? 'none' : '0 2px 8px rgba(10,132,255,0.3)',
          transition: 'filter .15s, transform .05s'
        }}
      >
        {generating ? '🤖 Пишу код…' : '🤖 Сгенерировать код →'}
      </button>

      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}
    </div>
  )
}

// ---------- Квадрат кода: код + запуск → квадрат результата ----------
function CodeBlockBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { body } = shape.props
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    if (running) return
    setError(null)
    setRunning(true)
    try {
      const res = await window.flow.runCode({ id: shape.id, code: body })
      if (res.ok) {
        ensureResultCard(
          editor,
          shape.id,
          res.stdout || '(выполнено без текстового вывода)',
          res.images
        )
      } else if (!res.killed) {
        setError(res.error)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <textarea
        className="flow-input flow-scroll"
        value={body}
        spellCheck={false}
        onChange={(e) => update({ body: e.currentTarget.value })}
        placeholder={'# код появится здесь\n# можно править вручную'}
        style={{
          ...fieldStyle,
          flex: 1,
          minHeight: 90,
          resize: 'none',
          whiteSpace: 'pre',
          overflow: 'auto',
          fontFamily: 'Consolas, "Cascadia Mono", "SF Mono", ui-monospace, monospace',
          fontSize: 13,
          lineHeight: 1.55,
          textRendering: 'optimizeLegibility'
        }}
      />
      <button
        className="flow-run-btn"
        onClick={run}
        disabled={running}
        style={{
          cursor: running ? 'default' : 'pointer',
          border: 'none',
          borderRadius: 10,
          padding: '9px',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: running ? '#3a3a3c' : 'linear-gradient(180deg,#7d7bff,#5e5ce6)',
          boxShadow: running ? 'none' : '0 2px 8px rgba(94,92,230,0.35)',
          transition: 'filter .15s, transform .05s'
        }}
      >
        {running ? '⏳ Выполняю…' : '▶  Запустить код'}
      </button>

      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}
    </div>
  )
}

// ---------- Тело поиск-ноды (веб-поиск + ответ с источниками) ----------
function SearchBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { body, model } = shape.props // body = запрос
  const [results, setResults] = useState<{ title: string; url: string; snippet: string }[]>([])
  const [loading, setLoading] = useState<'' | 'search' | 'answer'>('')
  const [error, setError] = useState<string | null>(null)

  const doSearch = async () => {
    const res = await window.flow.webSearch({ query: body })
    if (!res.ok) {
      setError(res.error)
      return null
    }
    setResults(res.results)
    return res.results
  }

  const search = async () => {
    if (!body.trim() || loading) return
    setError(null)
    setResults([])
    setLoading('search')
    await doSearch()
    setLoading('')
  }

  const answer = async () => {
    if (!body.trim() || loading) return
    setError(null)
    setLoading('answer')
    const r = await doSearch()
    if (r) {
      const context = r.map((x, i) => `[${i + 1}] ${x.title}\n${x.url}\n${x.snippet}`).join('\n\n')
      const sys =
        'Ты отвечаешь на вопрос пользователя, опираясь на результаты веб-поиска ниже. ' +
        'Дай точный ответ на русском в Markdown, ссылайся на источники как [1], [2]. ' +
        'Если данных недостаточно — честно скажи.'
      const prompt = `Вопрос: ${body}\n\nРезультаты поиска:\n${context}`
      const air = await window.flow.aiChat({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt }
        ]
      })
      if (air.ok) ensureResultCard(editor, shape.id, air.content)
      else setError(air.error)
    }
    setLoading('')
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <ModelSelect value={model} onChange={(v) => update({ model: v })} />
      <textarea
        className="flow-input"
        value={body}
        onChange={(e) => update({ body: e.currentTarget.value })}
        placeholder="Что найти?"
        style={{ ...fieldStyle, minHeight: 38, maxHeight: 60, resize: 'none', lineHeight: 1.4 }}
      />
      <MicButton
        onText={(t) => {
          const cur = ((editor.getShape(shape.id) as FlowNodeShape | undefined)?.props.body as string) || ''
          update({ body: cur ? cur.replace(/\s*$/, '') + ' ' + t : t })
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          className="flow-run-btn"
          onClick={search}
          disabled={!!loading}
          style={{
            flex: 1,
            cursor: loading ? 'default' : 'pointer',
            border: 'none',
            borderRadius: 10,
            padding: '8px',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#fff',
            background: loading === 'search' ? '#3a3a3c' : 'linear-gradient(180deg,#5ac8fa,#32ade6)',
            boxShadow: '0 2px 8px rgba(50,173,230,0.3)'
          }}
        >
          {loading === 'search' ? '🔎 Ищу…' : '🔎 Найти'}
        </button>
        <button
          className="flow-run-btn"
          onClick={answer}
          disabled={!!loading}
          style={{
            flex: 1.3,
            cursor: loading ? 'default' : 'pointer',
            border: 'none',
            borderRadius: 10,
            padding: '8px',
            fontSize: 12.5,
            fontWeight: 600,
            color: '#fff',
            background: loading === 'answer' ? '#3a3a3c' : 'linear-gradient(180deg,#409cff,#0a84ff)',
            boxShadow: '0 2px 8px rgba(10,132,255,0.3)'
          }}
        >
          {loading === 'answer' ? '🤖 Думаю…' : '🤖 Ответить'}
        </button>
      </div>

      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}

      {results.length > 0 && (
        <div
          className="flow-scroll"
          style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {results.map((r, i) => (
            <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 6 }}>
              <a
                onClick={() => window.flow.openExternal({ url: r.url })}
                style={{
                  color: '#5ac8fa',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'block',
                  lineHeight: 1.35
                }}
              >
                {r.title}
              </a>
              <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4, marginTop: 2 }}>
                {r.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Нода-референс (загрузка фото, присоединяется стрелкой) ----------
function RefBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  let image = ''
  try {
    image = JSON.parse(shape.props.extra || '{}').image || ''
  } catch {
    /* ignore */
  }
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div
      onPointerDown={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 8,
          overflow: 'hidden',
          background: '#171a20',
          border: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {image ? (
          <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 12, color: C.textDim }}>Нет фото</span>
        )}
      </div>
      <button
        className="flow-run-btn"
        onClick={() => fileRef.current?.click()}
        style={{
          border: 'none',
          borderRadius: 10,
          padding: '8px',
          fontSize: 12.5,
          fontWeight: 600,
          color: '#00303f',
          background: 'linear-gradient(180deg,#8ee0ff,#64d2ff)',
          cursor: 'pointer'
        }}
      >
        📁 Загрузить фото
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.currentTarget.files?.[0]
          if (!f) return
          const r = new FileReader()
          r.onload = () => update({ extra: JSON.stringify({ image: String(r.result) }) })
          r.readAsDataURL(f)
        }}
      />
    </div>
  )
}

// ---------- Тело картинка-ноды (генерация через ComfyUI) ----------
function ImageBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { body } = shape.props // body = промпт
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ex: any = {}
  try {
    ex = JSON.parse(shape.props.extra || '{}')
  } catch {
    /* ignore */
  }
  const checkpoint: string = ex.checkpoint || ''
  const negative: string = ex.negative || ''
  const size: string = ex.size || 'Квадрат 1024'
  const steps: number = ex.steps || 20
  const modelType: string = ex.modelType || 'flux'
  const setEx = (patch: Record<string, unknown>) =>
    update({ extra: JSON.stringify({ ...ex, ...patch }) })

  const [checkpoints, setCheckpoints] = useState<string[]>([])
  const [unets, setUnets] = useState<string[]>([])
  const [ckptError, setCkptError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Превратить идею (на любом языке) в детальный английский промпт для FLUX
  const enhance = async () => {
    if (!body.trim() || enhancing) return
    setEnhancing(true)
    try {
      const sys =
        'Ты составляешь промпты для генератора изображений FLUX. По идее пользователя (на любом языке) верни ОДИН детальный промпт НА АНГЛИЙСКОМ: объекты, стиль, композиция, свет, качество. Только сам промпт, без пояснений и кавычек.'
      const res = await window.flow.aiChat({
        model: '',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: body }
        ]
      })
      if (res.ok) update({ body: res.content.trim() })
      else setError(res.error)
    } catch (e) {
      setError(String(e))
    } finally {
      setEnhancing(false)
    }
  }

  useEffect(() => {
    window.flow?.comfyModels().then((r) => {
      if (r.ok) {
        setCheckpoints(r.checkpoints)
        setUnets(r.unets)
      } else {
        setCkptError(r.error)
      }
    })
  }, [])

  // Для FLUX модель берётся из models/unet, для SDXL — из checkpoints
  const modelList = modelType === 'flux' ? unets : checkpoints

  const generate = async () => {
    if (!body.trim() || loading) return
    setError(null)
    setLoading(true)
    try {
      const [w, h] = IMAGE_SIZES[size] ?? [1024, 1024]
      const res = await window.flow.comfyGenerate({
        checkpoint: checkpoint || modelList[0] || '',
        prompt: body,
        negative,
        width: w,
        height: h,
        steps,
        modelType
      })
      if (res.ok) ensureResultCard(editor, shape.id, `🖼 ${body}`, [res.image])
      else setError(res.error)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      {/* Модель (чекпоинт) + тип */}
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          className="flow-input"
          value={checkpoint}
          onChange={(e) => setEx({ checkpoint: e.currentTarget.value })}
          style={{ ...selectStyle, flex: 1 }}
        >
          <option value="">
            {modelList.length
              ? 'Модель по умолчанию'
              : modelType === 'flux'
                ? 'Нет FLUX — положи модель в models/unet'
                : 'Нет моделей — запусти ComfyUI'}
          </option>
          {modelList.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="flow-input"
          value={modelType}
          onChange={(e) => setEx({ modelType: e.currentTarget.value })}
          title="Тип модели"
          style={{ ...selectStyle, width: 92 }}
        >
          <option value="flux">FLUX</option>
          <option value="sdxl">SDXL</option>
        </select>
      </div>

      {/* Промпт */}
      <textarea
        className="flow-input flow-scroll"
        value={body}
        onChange={(e) => update({ body: e.currentTarget.value })}
        placeholder="Опиши картинку (можно по-русски → нажми «Улучшить»)"
        style={{ ...fieldStyle, flex: 1, minHeight: 50, resize: 'none', lineHeight: 1.4 }}
      />
      <button
        className="flow-run-btn"
        onClick={enhance}
        disabled={enhancing}
        style={{
          cursor: enhancing ? 'default' : 'pointer',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          padding: '7px',
          fontSize: 12,
          fontWeight: 600,
          color: '#e6e6e6',
          background: enhancing ? '#3a3a3c' : '#2f333d'
        }}
      >
        {enhancing ? '🤖 Улучшаю…' : '🤖 Улучшить промпт (в английский)'}
      </button>

      {/* Негатив + размер + шаги */}
      <input
        className="flow-input"
        value={negative}
        onChange={(e) => setEx({ negative: e.currentTarget.value })}
        placeholder="Что исключить (negative)"
        style={fieldStyle}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <select
          className="flow-input"
          value={size}
          onChange={(e) => setEx({ size: e.currentTarget.value })}
          style={{ ...selectStyle, flex: 1 }}
        >
          {Object.keys(IMAGE_SIZES).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <input
          className="flow-input"
          type="number"
          min={1}
          max={60}
          value={steps}
          onChange={(e) => setEx({ steps: Number(e.currentTarget.value) || 20 })}
          title="Шагов"
          style={{ ...fieldStyle, width: 64 }}
        />
      </div>

      <button
        className="flow-run-btn"
        onClick={generate}
        disabled={loading}
        style={{
          cursor: loading ? 'default' : 'pointer',
          border: 'none',
          borderRadius: 10,
          padding: '9px',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: loading ? '#3a3a3c' : 'linear-gradient(180deg,#ff6482,#ff375f)',
          boxShadow: loading ? 'none' : '0 2px 8px rgba(255,55,95,0.35)',
          transition: 'filter .15s, transform .05s'
        }}
      >
        {loading ? '🎨 Рисую…' : '🎨 Сгенерировать'}
      </button>

      {ckptError && !checkpoints.length && (
        <div style={{ fontSize: 11, color: C.textDim }}>{ckptError}</div>
      )}
      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}
    </div>
  )
}

// Разобрать JSON-структуру презентации из ответа модели
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseDeckJSON(text: string): any {
  try {
    const m = text.match(/\{[\s\S]*\}/)
    if (!m) return null
    const j = JSON.parse(m[0])
    if (!Array.isArray(j.slides)) return null
    return j
  } catch {
    return null
  }
}

// Создать карточки-слайды (каждый — HTML) в ряд справа от ноды-презентации
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createSlideNodes(editor: Editor, deckId: string, deck: any): string[] {
  const bounds = editor.getShapePageBounds(deckId as never)
  if (!bounds) return []
  const W = 560
  const H = 315
  const GAP = 44
  const startX = bounds.maxX + 80
  const startY = bounds.y
  const ids: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deck.slides.forEach((slide: any, i: number) => {
    const id = createShapeId()
    editor.createShape<FlowNodeShape>({
      id,
      type: 'flow-node',
      x: startX + i * (W + GAP),
      y: startY,
      props: { kind: 'slide', title: '', body: JSON.stringify(slide), w: W, h: H, extra: '{}' }
    })
    ids.push(id)
  })
  return ids
}

// Сгенерировать/обновить картинку конкретного слайда через FLUX
async function generateSlideImage(
  editor: Editor,
  slideId: string,
  promptOverride?: string
): Promise<{ ok: boolean; error?: string }> {
  const sh = editor.getShape<FlowNodeShape>(slideId as never)
  if (!sh) return { ok: false, error: 'нет слайда' }
  const slide = parseSlide(sh.props.body)
  const prompt = promptOverride || slide.imagePrompt || slide.title || 'abstract background'
  const models = await window.flow.comfyModels()
  const flux = models.ok ? models.unets.find((u) => /flux/i.test(u)) : undefined
  if (!flux) return { ok: false, error: 'FLUX не найден — запусти ComfyUI' }
  const r = await window.flow.comfyGenerate({
    checkpoint: flux,
    prompt,
    negative: '',
    width: 1216,
    height: 832,
    steps: 20,
    modelType: 'flux'
  })
  if (!r.ok) return { ok: false, error: r.error }
  const fresh = editor.getShape<FlowNodeShape>(slideId as never)
  let ex = {}
  try {
    ex = JSON.parse(fresh?.props.extra || '{}')
  } catch {
    /* ignore */
  }
  editor.updateShape<FlowNodeShape>({
    id: slideId as never,
    type: 'flow-node',
    props: { extra: JSON.stringify({ ...ex, image: r.image }) }
  })
  return { ok: true }
}

const exportBtnStyle = {
  flex: 1,
  cursor: 'pointer',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '7px',
  fontSize: 12,
  fontWeight: 600,
  color: '#e6e6e6',
  background: '#2f333d'
} as const

// Применить цветовую палитру ко всем слайдам презентации
function applyPaletteToSlides(editor: Editor, ids: string[], pal: Palette) {
  ids.forEach((id) => {
    const sh = editor.getShape<FlowNodeShape>(id as never)
    if (!sh) return
    const sl = parseSlide(sh.props.body)
    const next = { ...sl, accent: pal.accent, accent2: pal.accent2, bg: pal.bg }
    editor.updateShape<FlowNodeShape>({ id: id as never, type: 'flow-node', props: { body: JSON.stringify(next) } })
  })
}

// ---------- Нода-презентация (дизайнерские HTML-слайды + экспорт) ----------
function DeckBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { body, model } = shape.props
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ex: any = {}
  try {
    ex = JSON.parse(shape.props.extra || '{}')
  } catch {
    /* ignore */
  }
  const count: number = ex.count || 6
  const withImages: boolean = !!ex.withImages
  const palId: string = ex.palette || 'night'
  const customAccent: string = ex.customAccent || '#4c8dff'
  const getPalette = (): Palette =>
    palId === 'custom' ? customPalette(customAccent) : PALETTES.find((p) => p.id === palId) || PALETTES[0]
  const setEx = (p: Record<string, unknown>) => update({ extra: JSON.stringify({ ...ex, ...p }) })

  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  const layoutRef: string | undefined = ex.layoutRef

  // Снять выделение с холста как PNG-макет — ИИ построит презентацию по нему
  const captureLayout = async () => {
    const ids = editor.getSelectedShapeIds().filter((id) => id !== shape.id)
    if (!ids.length) {
      setError('Выдели на холсте фигуры/рамку-макет (инструменты снизу), затем нажми снова')
      return
    }
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const out = await (editor as any).toImage(ids, { format: 'png', background: true, scale: 1, padding: 16 })
      const blob: Blob = out.blob
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result))
        r.onerror = reject
        r.readAsDataURL(blob)
      })
      setEx({ layoutRef: dataUrl })
      setStatus('Макет с холста прикреплён ✅')
    } catch (e) {
      setError('Не удалось снять макет: ' + String(e))
    }
  }

  const generate = async () => {
    if (!body.trim() || busy) return
    setError(null)
    setBusy(true)
    setStatus('🤖 Проектирую слайды…')
    try {
      const refs = gatherReferences(editor, shape.id)
      let userContent = body
      if (refs.texts.length) userContent += '\n\nРеференсы (материалы):\n' + refs.texts.join('\n')
      const allImages = [...(layoutRef ? [layoutRef] : []), ...refs.images]
      const sys =
        SLIDE_SYSTEM_PROMPT +
        (allImages.length
          ? '\nУчитывай приложенные изображения-референсы (стиль, объекты, цвета, композиция).'
          : '') +
        (layoutRef
          ? '\nПЕРВОЕ изображение — МАКЕТ/каркас будущей презентации: следуй его композиции, расположению блоков и структуре слайдов.'
          : '') +
        `\nКоличество слайдов: ${count}.`
      if (allImages.length || refs.texts.length) setStatus('🔗 Учитываю референсы…')
      const res = await window.flow.aiChat({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userContent }
        ],
        images: allImages.length ? allImages : undefined
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      const deck = parseDeckJSON(res.content)
      if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) {
        setError('Не удалось разобрать слайды. Попробуй ещё раз или другую модель.')
        return
      }
      const ids = createSlideNodes(editor, shape.id, deck)
      // Если пользователь сам не выбрал палитру — берём случайную, чтобы разные
      // презентации отличались по цвету, а не были все синими.
      const pal = ex.paletteSet ? getPalette() : PALETTES[Math.floor(Math.random() * PALETTES.length)]
      applyPaletteToSlides(editor, ids, pal)
      setEx({ slideIds: ids, deckTitle: deck.title || 'Презентация', palette: pal.id })
      if (withImages) {
        for (let i = 0; i < ids.length; i++) {
          const sl = parseSlide(editor.getShape<FlowNodeShape>(ids[i] as never)?.props.body || '{}')
          if (!sl.imagePrompt) continue
          setStatus(`🎨 Фото ${i + 1}/${ids.length}…`)
          await generateSlideImage(editor, ids[i])
        }
      }
      setStatus(`Готово: ${ids.length} слайдов ✅`)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const collectSlides = (): ExportItem[] => {
    const ids: string[] = ex.slideIds || []
    return ids
      .map((id) => {
        const s = editor.getShape<FlowNodeShape>(id as never)
        if (!s) return null
        let image = ''
        try {
          image = JSON.parse(s.props.extra || '{}').image || ''
        } catch {
          /* ignore */
        }
        return { slide: parseSlide(s.props.body), image }
      })
      .filter((x): x is ExportItem => !!x)
  }

  const doExport = async (kind: 'pdf' | 'pptx') => {
    const items = collectSlides()
    if (!items.length) {
      setError('Сначала сгенерируй презентацию')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const pngs = await slidesToPngs(items, (i, n) => setStatus(`Рендер ${i}/${n}…`))
      if (kind === 'pdf') await exportPdf(ex.deckTitle || 'presentation', pngs)
      else await exportPptx(ex.deckTitle || 'presentation', pngs)
      setStatus('Экспортировано ✅')
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  const hasSlides = (ex.slideIds || []).length > 0

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <ModelSelect value={model} onChange={(v) => update({ model: v })} />
      <textarea
        className="flow-input flow-scroll"
        value={body}
        onChange={(e) => update({ body: e.currentTarget.value })}
        placeholder="Тема презентации (напр. «MVP-проект по бетону»)"
        style={{ ...fieldStyle, flex: 1, minHeight: 46, resize: 'none', lineHeight: 1.4 }}
      />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 11.5, color: C.textDim }}>Слайдов:</span>
        <input
          className="flow-input"
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setEx({ count: Number(e.currentTarget.value) || 6 })}
          style={{ ...fieldStyle, width: 56 }}
        />
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: C.textDim, cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={withImages}
            onChange={() => setEx({ withImages: !withImages })}
            style={{ width: 14, height: 14, accentColor: C.blue }}
          />
          🎨 фото сразу
        </label>
      </div>

      {/* Цветовая гамма презентации */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 11.5, color: C.textDim }}>Цветовая гамма</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {PALETTES.map((p) => (
            <button
              key={p.id}
              title={p.name}
              onClick={() => {
                setEx({ palette: p.id, paletteSet: true })
                // Сразу перекрашиваем уже созданные слайды — иначе выбор «не работает»
                if (ex.slideIds?.length) {
                  applyPaletteToSlides(editor, ex.slideIds, p)
                  setStatus(`Палитра «${p.name}» применена`)
                }
              }}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${p.accent}, ${p.accent2})`,
                border: palId === p.id ? `2px solid ${C.text}` : `1px solid ${C.border}`
              }}
            />
          ))}
          <input
            type="color"
            title="Свой цвет"
            value={customAccent}
            onChange={(e) => {
              const val = e.currentTarget.value
              setEx({ palette: 'custom', customAccent: val, paletteSet: true })
              if (ex.slideIds?.length) applyPaletteToSlides(editor, ex.slideIds, customPalette(val))
            }}
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              border: palId === 'custom' ? `2px solid ${C.text}` : `1px solid ${C.border}`,
              background: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          />
          {hasSlides && (
            <button
              onClick={() => {
                applyPaletteToSlides(editor, ex.slideIds || [], getPalette())
                setStatus('Палитра применена ко всем слайдам')
              }}
              style={{
                marginLeft: 'auto',
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.05)',
                color: C.textDim,
                borderRadius: 7,
                fontSize: 11,
                padding: '4px 8px',
                cursor: 'pointer'
              }}
            >
              Ко всем
            </button>
          )}
        </div>
      </div>

      {/* Макет с холста → ИИ построит презентацию по нему */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button className="flow-run-btn" onClick={captureLayout} style={{ ...exportBtnStyle, flex: 'none', padding: '7px 10px' }}>
          📐 Макет с холста
        </button>
        {layoutRef ? (
          <span style={{ fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 6 }}>
            <img src={layoutRef} alt="" style={{ width: 26, height: 18, objectFit: 'cover', borderRadius: 3, border: `1px solid ${C.border}` }} />
            прикреплён
            <span onClick={() => setEx({ layoutRef: undefined })} style={{ cursor: 'pointer', color: C.blue }}>
              сброс
            </span>
          </span>
        ) : (
          <span style={{ fontSize: 10.5, color: C.textDim }}>выдели фигуры на холсте</span>
        )}
      </div>

      <button
        className="flow-run-btn"
        onClick={generate}
        disabled={busy}
        style={{
          cursor: busy ? 'default' : 'pointer',
          border: 'none',
          borderRadius: 10,
          padding: '9px',
          fontSize: 13,
          fontWeight: 600,
          color: '#fff',
          background: busy ? '#3a3a3c' : 'linear-gradient(180deg,#ffb340,#ff9500)',
          boxShadow: busy ? 'none' : '0 2px 8px rgba(255,149,0,0.35)'
        }}
      >
        {busy ? '⏳ Работаю…' : '🎞 Сгенерировать презентацию'}
      </button>
      {hasSlides && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="flow-run-btn" onClick={() => doExport('pdf')} disabled={busy} style={exportBtnStyle}>
            ⬇ PDF
          </button>
          <button className="flow-run-btn" onClick={() => doExport('pptx')} disabled={busy} style={exportBtnStyle}>
            ⬇ PPTX
          </button>
        </div>
      )}
      {status && <div style={{ fontSize: 11, color: C.textDim }}>{status}</div>}
      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}
    </div>
  )
}

const slideToolBtn = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(18,21,28,0.82)',
  color: '#fff',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
} as const

// ---------- Карточка-слайд (шаблон-дизайн + панель ✏️/🎨) ----------
function SlideCard({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const { body, w, h } = shape.props
  const slide = parseSlide(body)
  let image = ''
  try {
    image = JSON.parse(shape.props.extra || '{}').image || ''
  } catch {
    /* ignore */
  }
  const [hover, setHover] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)

  const genImg = async () => {
    if (imgBusy) return
    setImgBusy(true)
    await generateSlideImage(editor, shape.id)
    setImgBusy(false)
  }
  const editSlide = () =>
    window.dispatchEvent(new CustomEvent('flow-edit-slide', { detail: shape.id }))

  return (
    <HTMLContainer
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#12151c',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 10px 34px rgba(0,0,0,0.45)',
        pointerEvents: 'all',
        position: 'relative'
      }}
    >
      <ScaledSlide slide={slide} image={image} width={w} />
      {hover && (
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6, zIndex: 5 }}>
          <button
            onPointerDown={stopEventPropagation}
            onClick={() => window.dispatchEvent(new CustomEvent('flow-fullscreen-node', { detail: String(shape.id) }))}
            title="На весь экран"
            style={{ ...slideToolBtn, cursor: 'pointer' }}
          >
            ⛶
          </button>
          <button
            onPointerDown={stopEventPropagation}
            onClick={editSlide}
            title="Редактировать слайд"
            style={{ ...slideToolBtn, cursor: 'pointer' }}
          >
            ✏️
          </button>
          <button
            onPointerDown={stopEventPropagation}
            onClick={genImg}
            disabled={imgBusy}
            title="Сгенерировать фото (FLUX)"
            style={{ ...slideToolBtn, cursor: imgBusy ? 'default' : 'pointer' }}
          >
            {imgBusy ? '⏳' : '🎨'}
          </button>
        </div>
      )}
    </HTMLContainer>
  )
}

// ---------- Разбор Mermaid-flowchart в редактируемые фигуры холста ----------
type FlowParsed = { nodes: string[]; labels: Map<string, string>; edges: { from: string; to: string; label?: string }[] }

// Токен ноды: id + скобки-форма + текст (A[..], B(..), C{..}, ((..)), [[..]], >..])
const NODE_RE = /([A-Za-z0-9_]+)\s*(\[\[|\(\(|\{\{|\[|\(|\{|>)([^\]\)\}]*?)(\]\]|\)\)|\}\}|\]|\)|\})/g
// Оператор-связь: run из - . = < > x o (минимум 2 «телесных» символа)
const EDGE_SPLIT = /\s*[<xo]?[-.=]{2,}[>xo]?\s*/

function parseFlowchart(code: string): FlowParsed {
  const labels = new Map<string, string>()
  const order: string[] = []
  const edges: { from: string; to: string; label?: string }[] = []
  const ensure = (id: string) => {
    if (!labels.has(id)) {
      labels.set(id, id)
      order.push(id)
    }
  }
  const stmts = code
    .replace(/\r/g, '')
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  for (const raw of stmts) {
    if (/^(flowchart|graph|subgraph|end|classDef|class|style|linkStyle|click|direction|%%)/i.test(raw)) continue
    // Явные подписи нод
    let m: RegExpExecArray | null
    NODE_RE.lastIndex = 0
    while ((m = NODE_RE.exec(raw))) {
      ensure(m[1])
      labels.set(m[1], (m[3] || m[1]).trim() || m[1])
    }
    // Убираем скобки-подписи, чтобы остались только id и операторы
    const stripped = raw.replace(NODE_RE, '$1')
    // Достаём подписи связей: |текст| и -- текст -->
    const edgeLabels: string[] = []
    let s2 = stripped.replace(/\|([^|]*)\|/g, (_x, l) => {
      edgeLabels.push(String(l).trim())
      return ' '
    })
    s2 = s2.replace(/--\s*([^->\n]+?)\s*--?>/g, (_x, l) => {
      edgeLabels.push(String(l).trim())
      return ' --> '
    })
    const ids = s2
      .split(EDGE_SPLIT)
      .map((x) => x.trim())
      .filter((x) => /^[A-Za-z0-9_]+$/.test(x))
    ids.forEach(ensure)
    for (let i = 0; i < ids.length - 1; i++) {
      edges.push({ from: ids[i], to: ids[i + 1], label: edgeLabels[i] || undefined })
    }
  }
  return { nodes: order, labels, edges }
}

function clampN(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

// Простая слоёная раскладка (по направлению) → координаты боксов
function layoutFlow(p: FlowParsed, dir: string, ox: number, oy: number) {
  const rank = new Map<string, number>()
  p.nodes.forEach((n) => rank.set(n, 0))
  for (let pass = 0; pass < p.nodes.length + 1; pass++) {
    let changed = false
    for (const e of p.edges) {
      if (rank.has(e.from) && rank.has(e.to)) {
        const nr = (rank.get(e.from) as number) + 1
        if (nr > (rank.get(e.to) as number)) {
          rank.set(e.to, nr)
          changed = true
        }
      }
    }
    if (!changed) break
  }
  const byRank = new Map<number, string[]>()
  p.nodes.forEach((n) => {
    const r = rank.get(n) || 0
    if (!byRank.has(r)) byRank.set(r, [])
    ;(byRank.get(r) as string[]).push(n)
  })
  const horizontal = /LR|RL/i.test(dir)
  const boxH = 66
  const wOf = (id: string) => clampN((p.labels.get(id) || id).length * 10 + 44, 120, 300)
  const pos = new Map<string, { x: number; y: number; w: number; h: number }>()
  const layerGap = horizontal ? 300 : 150
  const crossGap = horizontal ? 110 : 240
  Array.from(byRank.keys())
    .sort((a, b) => a - b)
    .forEach((r) => {
      const list = byRank.get(r) as string[]
      list.forEach((id, i) => {
        const along = r * layerGap
        const cross = i * crossGap
        const x = horizontal ? ox + along : ox + cross
        const y = horizontal ? oy + cross : oy + along
        pos.set(id, { x, y, w: wOf(id), h: boxH })
      })
    })
  return pos
}

// Разобрать текущий Mermaid-код в фигуры холста (редактируются нативно).
// Возвращает число созданных боксов.
function mermaidToShapes(editor: Editor, code: string, ox: number, oy: number): number {
  const dirM = code.match(/(?:flowchart|graph)\s+(TB|TD|BT|RL|LR)/i)
  const dir = dirM ? dirM[1] : 'TB'
  const parsed = parseFlowchart(code)
  if (!parsed.nodes.length) return 0
  const pos = layoutFlow(parsed, dir, ox, oy)
  const idMap = new Map<string, string>()
  const created: string[] = []
  // Боксы
  parsed.nodes.forEach((n) => {
    const box = pos.get(n)
    if (!box) return
    const shId = createShapeId()
    idMap.set(n, shId)
    created.push(shId)
    editor.createShape({
      id: shId as never,
      type: 'geo',
      x: box.x,
      y: box.y,
      props: {
        geo: 'rectangle',
        w: box.w,
        h: box.h,
        color: 'blue',
        fill: 'semi',
        richText: toRichText(parsed.labels.get(n) || n)
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })
  // Стрелки
  parsed.edges.forEach((e) => {
    const from = idMap.get(e.from)
    const to = idMap.get(e.to)
    if (!from || !to) return
    const aId = createShapeId()
    created.push(aId)
    editor.createShape({
      id: aId as never,
      type: 'arrow',
      props: { color: 'grey', size: 'm', ...(e.label ? { richText: toRichText(e.label) } : {}) }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    editor.createBinding({
      fromId: aId,
      toId: from,
      type: 'arrow',
      props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false }
    } as never)
    editor.createBinding({
      fromId: aId,
      toId: to,
      type: 'arrow',
      props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false }
    } as never)
  })
  try {
    editor.setSelectedShapes(created as never)
  } catch {
    /* не критично */
  }
  return parsed.nodes.length
}

// ---------- Нода-схема (Mermaid: описание → диаграмма, живой предпросмотр) ----------
function DiagramBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const { body, model } = shape.props // body = исходник Mermaid
  const instruction = parseExtra(shape.props.extra).instruction ?? ''
  const setInstruction = (v: string) =>
    update({ extra: JSON.stringify({ ...parseExtra(shape.props.extra), instruction: v }) })
  const [gen, setGen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Живой предпросмотр — рисуем императивно через mermaid.render
  useEffect(() => {
    if (previewRef.current) {
      renderMermaidCode(previewRef.current, body?.trim() || 'graph TD; A[Опиши схему выше] --> B[и сгенерируй]')
    }
  }, [body])

  const generate = async () => {
    if (!instruction.trim() || gen) return
    setError(null)
    setGen(true)
    try {
      const sys =
        'Ты генерируешь диаграммы Mermaid. По описанию пользователя верни ТОЛЬКО валидный код Mermaid ' +
        '(flowchart TD/LR, sequenceDiagram, classDiagram, stateDiagram, erDiagram — выбери подходящий тип), ' +
        'без markdown-ограждений и без пояснений. Подписи узлов — на русском.'
      const res = await window.flow.aiChat({
        model,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: instruction }
        ]
      })
      if (res.ok) update({ body: stripFences(res.content) })
      else setError(res.error)
    } catch (e) {
      setError(String(e))
    } finally {
      setGen(false)
    }
  }

  // Разобрать схему в редактируемые фигуры холста (боксы + стрелки)
  const toShapes = () => {
    setError(null)
    try {
      const b = editor.getShapePageBounds(shape.id as never)
      const ox = b ? b.maxX + 90 : 0
      const oy = b ? b.y : 0
      const n = mermaidToShapes(editor, body || '', ox, oy)
      if (!n) setError('Не удалось разобрать схему в блоки (поддерживается flowchart/graph)')
    } catch (e) {
      setError('Ошибка разбора: ' + String(e))
    }
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}
    >
      <ModelSelect value={model} onChange={(v) => update({ model: v })} />
      <textarea
        className="flow-input"
        value={instruction}
        onChange={(e) => setInstruction(e.currentTarget.value)}
        placeholder="Опиши схему (напр. «архитектура: клиент → API → база данных, кэш»)…"
        style={{ ...fieldStyle, minHeight: 42, maxHeight: 70, resize: 'none', lineHeight: 1.4 }}
      />
      <button
        className="flow-run-btn"
        onClick={generate}
        disabled={gen}
        style={{
          cursor: gen ? 'default' : 'pointer',
          border: 'none',
          borderRadius: 10,
          padding: '8px',
          fontSize: 12.5,
          fontWeight: 600,
          color: '#00303f',
          background: gen ? '#3a3a3c' : 'linear-gradient(180deg,#5ce1f5,#22D3EE)',
          boxShadow: gen ? 'none' : '0 2px 8px rgba(34,211,238,0.3)'
        }}
      >
        {gen ? '🤖 Проектирую…' : '◇ Сгенерировать схему'}
      </button>
      <textarea
        className="flow-input flow-scroll"
        value={body}
        spellCheck={false}
        onChange={(e) => update({ body: e.currentTarget.value })}
        placeholder={'graph TD;\n  A[Клиент] --> B[API];\n  B --> C[(База)]'}
        style={{
          ...fieldStyle,
          minHeight: 60,
          maxHeight: 120,
          resize: 'none',
          whiteSpace: 'pre',
          overflow: 'auto',
          fontFamily: 'Consolas, "Cascadia Mono", ui-monospace, monospace',
          fontSize: 12,
          lineHeight: 1.5
        }}
      />
      <button
        onClick={toShapes}
        title="Разобрать схему на редактируемые фигуры холста"
        style={{
          border: `1px solid ${C.border}`,
          background: 'rgba(255,255,255,0.05)',
          color: C.text,
          borderRadius: 10,
          padding: '8px',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        ✏️ Редактировать на холсте (блоки → тянуть за угол, правки текста)
      </button>
      <div
        ref={previewRef}
        className="flow-scroll"
        onWheelCapture={stopEventPropagation}
        style={{
          flex: 1,
          minHeight: 80,
          overflow: 'auto',
          background: C.field,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      />
      {error && <div style={{ fontSize: 11, color: C.red, whiteSpace: 'pre-wrap' }}>{error}</div>}
    </div>
  )
}

// ---------- Общий вид ноды ----------
// Сворачивание ноды хранится на время сессии (без изменения схемы shape)
const collapsedMap = new Map<string, boolean>()
const prevHMap = new Map<string, number>()
const HEADER_H = 39
const NODE_SANS = "'IBM Plex Sans', -apple-system, 'Segoe UI', system-ui, sans-serif"
const NODE_MONO = "'JetBrains Mono', monospace"

// Кружок-порт на краю ноды (как в макете): слева — нейтральный, справа — цвета типа
function PortDot({ side, color }: { side: 'left' | 'right'; color: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        [side]: -5,
        top: 16,
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'var(--panel)',
        border: `2px solid ${color}`,
        pointerEvents: 'none'
      }}
    />
  )
}

// Интерактивный «выход контекста»: потяни от него линию к другому чату,
// чтобы передать туда контекст этой ноды (создаётся стрелка-связь).
function ContextPort({
  editor,
  sourceId,
  color
}: {
  editor: Editor
  sourceId: string
  color: string
}) {
  const [drag, setDrag] = useState<{ x0: number; y0: number; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!drag) return
    const move = (e: PointerEvent) =>
      setDrag((d) => (d ? { ...d, x: e.clientX, y: e.clientY } : d))
    const up = (e: PointerEvent) => {
      try {
        const pt = editor.screenToPage({ x: e.clientX, y: e.clientY })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const target = editor.getShapeAtPoint(pt, {
          hitInside: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filter: (s: any) => s.type === 'flow-node' && s.id !== sourceId
        } as never)
        if (target && target.id !== sourceId) connectArrow(editor, sourceId, target.id as string)
      } catch {
        /* не критично */
      }
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, editor, sourceId])

  return (
    <>
      <div
        title="Потяни к другому чату, чтобы передать ему контекст этой ноды"
        onPointerDown={(e) => {
          stopEventPropagation(e)
          e.preventDefault()
          setDrag({ x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY })
        }}
        style={{
          position: 'absolute',
          right: -7,
          top: 13,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: drag ? color : 'var(--panel)',
          border: `2px solid ${color}`,
          cursor: 'crosshair',
          pointerEvents: 'all',
          zIndex: 6,
          transition: 'background .1s'
        }}
      />
      {drag &&
        createPortal(
          <svg
            style={{
              position: 'fixed',
              inset: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              zIndex: 99999
            }}
          >
            <line
              x1={drag.x0}
              y1={drag.y0}
              x2={drag.x}
              y2={drag.y}
              stroke={color}
              strokeWidth={2.5}
              strokeDasharray="5 5"
            />
            <circle cx={drag.x} cy={drag.y} r={5} fill={color} />
          </svg>,
          document.body
        )}
    </>
  )
}

// ---------- OpenCode: настоящий терминал с TUI (PTY + xterm.js) ----------
// Нода поднимает реальный псевдотерминал в выбранной папке и запускает в нём
// `opencode` — тот же интерфейс, что в обычном терминале, включая его родной
// выбор модели (/models) и авторизацию по API-ключу (opencode auth login).
const OC_THEME = {
  background: '#0d1117',
  foreground: '#c9d1d9',
  cursor: '#fb923c',
  cursorAccent: '#0d1117',
  selectionBackground: 'rgba(251,146,60,0.35)',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc'
}

// Маленькая кнопка тулбара терминала
function OcToolBtn({
  onClick,
  title,
  children,
  accent
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      onPointerDown={stopEventPropagation}
      title={title}
      style={{
        border: `1px solid ${accent ? '#fb923c' : C.border}`,
        background: accent ? 'rgba(251,146,60,0.15)' : '#0d1117',
        color: accent ? '#fb923c' : '#c9d1d9',
        borderRadius: 6,
        fontSize: 11,
        padding: '4px 8px',
        cursor: 'pointer',
        fontFamily: NODE_MONO,
        whiteSpace: 'nowrap'
      }}
    >
      {children}
    </button>
  )
}

function OpencodeBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const ex = parseExtra(shape.props.extra) as { cwd?: string }
  const cwd = ex.cwd || ''
  const setEx = (patch: Record<string, unknown>) => update({ extra: JSON.stringify({ ...ex, ...patch }) })
  const id = String(shape.id)

  const wrapRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)
  const [alive, setAlive] = useState(false)

  // Создаём терминал, когда выбрана папка. Живёт, пока не сменят папку.
  useEffect(() => {
    if (!cwd || !wrapRef.current || termRef.current) return
    const term = new Terminal({
      fontFamily: NODE_MONO,
      fontSize: 12,
      lineHeight: 1.2,
      theme: OC_THEME,
      cursorBlink: true,
      scrollback: 5000,
      convertEol: false
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(wrapRef.current)
    termRef.current = term
    fitRef.current = fit

    term.onData((d) => window.flow.ptyWrite({ id, data: d }))

    const offData = window.flow.onPtyData((msg) => {
      if (msg.id === id) term.write(msg.data)
    })
    const offExit = window.flow.onPtyExit((msg) => {
      if (msg.id === id) {
        setAlive(false)
        term.write('\r\n\x1b[38;2;251;146;60m[opencode завершён — нажми ⟳ чтобы перезапустить]\x1b[0m\r\n')
      }
    })

    const boot = requestAnimationFrame(() => {
      try {
        fit.fit()
      } catch {
        /* контейнер ещё без размера */
      }
      window.flow.ptyStart({ id, cwd, cols: term.cols, rows: term.rows, autostart: true }).then((r) => {
        if (r.ok) setAlive(true)
      })
    })

    const ro = new ResizeObserver(() => {
      const t = termRef.current
      if (!t) return
      try {
        fit.fit()
        window.flow.ptyResize({ id, cols: t.cols, rows: t.rows })
      } catch {
        /* ignore */
      }
    })
    ro.observe(wrapRef.current)

    return () => {
      cancelAnimationFrame(boot)
      offData()
      offExit()
      ro.disconnect()
      term.dispose()
      termRef.current = null
      fitRef.current = null
      // pty НЕ убиваем: сессия должна пережить уход ноды за экран и вернуться.
    }
  }, [cwd, id])

  // Снимок терминала в реестр — чтобы связанный стрелкой ИИ-чат мог взять контекст.
  useEffect(() => {
    const iv = setInterval(() => {
      const term = termRef.current
      if (!term) return
      try {
        const buf = term.buffer.active
        const lines: string[] = []
        const start = Math.max(0, buf.length - 400)
        for (let i = start; i < buf.length; i++) {
          const line = buf.getLine(i)
          if (line) lines.push(line.translateToString(true))
        }
        setAgentTranscript(id, stripAnsi(lines.join('\n')))
      } catch {
        /* ignore */
      }
    }, 4000)
    return () => clearInterval(iv)
  }, [id])

  const pickFolder = async () => {
    const r = await window.flow.pickFolder()
    if (r.ok && r.path !== cwd) {
      window.flow.ptyKill({ id }) // сбросить старую сессию перед сменой папки
      setEx({ cwd: r.path })
    }
  }

  const restart = () => {
    window.flow.ptyKill({ id })
    const t = termRef.current
    if (!t) return
    t.reset()
    setTimeout(() => {
      const term = termRef.current
      if (!term) return
      try {
        fitRef.current?.fit()
      } catch {
        /* ignore */
      }
      window.flow.ptyStart({ id, cwd, cols: term.cols, rows: term.rows, autostart: true }).then((rr) => {
        if (rr.ok) setAlive(true)
        term.focus()
      })
    }, 200)
  }

  const runCmd = (cmd: string) => {
    window.flow.ptyRun({ id, cmd, interrupt: true })
    termRef.current?.focus()
  }

  // Стартовый экран — пока не выбрана папка проекта
  if (!cwd) {
    return (
      <div
        onPointerDown={stopEventPropagation}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: NODE_MONO,
          color: C.textDim,
          textAlign: 'center',
          padding: 12
        }}
      >
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <span style={{ color: '#fb923c' }}>opencode</span> запустится в выбранной папке —
          <br />
          настоящий терминал прямо в ноде.
        </div>
        <button
          onClick={pickFolder}
          onPointerDown={stopEventPropagation}
          style={{
            border: '1px solid #fb923c',
            background: 'linear-gradient(180deg,#fb923c,#ea580c)',
            color: '#fff',
            borderRadius: 8,
            fontSize: 12.5,
            padding: '8px 16px',
            cursor: 'pointer',
            fontFamily: NODE_MONO,
            boxShadow: '0 2px 10px rgba(234,88,12,0.35)'
          }}
        >
          📁 Выбрать папку проекта
        </button>
      </div>
    )
  }

  const folderName = cwd.split(/[\\/]/).slice(-2).join('/')

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', fontFamily: NODE_MONO }}
    >
      {/* Тулбар */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          onClick={pickFolder}
          onPointerDown={stopEventPropagation}
          title={cwd}
          style={{
            flex: 1,
            minWidth: 0,
            border: `1px solid ${C.border}`,
            background: '#0d1117',
            color: '#c9d1d9',
            borderRadius: 6,
            fontSize: 11,
            padding: '4px 8px',
            cursor: 'pointer',
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: NODE_MONO
          }}
        >
          📁 {folderName}
        </button>
        <span
          title={alive ? 'терминал активен' : 'терминал остановлен'}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: alive ? '#3fb950' : '#6e7681',
            flexShrink: 0
          }}
        />
        <OcToolBtn onClick={() => runCmd('opencode')} title="Запустить opencode" accent>
          ▶ opencode
        </OcToolBtn>
        <OcToolBtn onClick={() => runCmd('opencode auth login')} title="Подключить модель по API-ключу">
          🔑 auth
        </OcToolBtn>
        <OcToolBtn onClick={restart} title="Перезапустить терминал">
          ⟳
        </OcToolBtn>
      </div>

      {/* Сам терминал */}
      <div
        ref={wrapRef}
        className="flow-scroll"
        onPointerDown={(e) => {
          stopEventPropagation(e)
          termRef.current?.focus()
        }}
        style={{
          flex: 1,
          minHeight: 90,
          overflow: 'hidden',
          background: '#0d1117',
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: 6
        }}
      />
    </div>
  )
}

// ---------- AnythingLLM: встроенный RAG-ассистент (управляемый сайдкар + webview) ----------
type AnyState = {
  phase: string
  message: string
  installed: boolean
  running: boolean
  port: number
  error: string
}
const ANY_PHASE_LABEL: Record<string, string> = {
  idle: 'Готово к установке',
  cloning: 'Скачиваю AnythingLLM…',
  installing: 'Ставлю зависимости…',
  building: 'Собираю интерфейс…',
  migrating: 'Готовлю базу данных…',
  starting: 'Запускаю сервер…',
  running: 'Работает',
  error: 'Ошибка'
}

function AnythingBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  // editor может пригодиться позже (стрелки→эмбеддинги); пока не используется тут
  void editor
  const id = String(shape.id)
  const [st, setSt] = useState<AnyState | null>(null)
  const [progress, setProgress] = useState<string>('')
  const autoStarted = useRef(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wvRef = useRef<any>(null)

  // Снимок интерфейса (innerText webview) в реестр — для контекста по стрелке.
  useEffect(() => {
    const iv = setInterval(() => {
      const wv = wvRef.current
      if (!wv || !wv.executeJavaScript) return
      try {
        wv.executeJavaScript('document.body ? document.body.innerText : ""')
          .then((txt: string) => setAgentTranscript(id, txt))
          .catch(() => {})
      } catch {
        /* ignore */
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [id])

  useEffect(() => {
    let alive = true
    const poll = () => {
      window.flow.anythingState().then((s) => {
        if (!alive) return
        setSt(s)
        // Уже установлен, но не поднят полностью → сами дозапускаем (в т.ч.
        // перезапустит упавший collector). Установку с нуля НЕ триггерим —
        // её пользователь запускает кнопкой явно.
        if (s.installed && !autoStarted.current && s.phase !== 'error') {
          autoStarted.current = true
          window.flow.anythingEnsure()
        }
      })
    }
    poll()
    const iv = setInterval(poll, 2000)
    const off = window.flow.onAnythingProgress((p) => {
      if (alive) setProgress(ANY_PHASE_LABEL[p.phase] ? `${ANY_PHASE_LABEL[p.phase]} ${p.message || ''}`.trim() : p.message)
    })
    return () => {
      alive = false
      clearInterval(iv)
      off()
    }
  }, [])

  const busy =
    st && !st.running && ['cloning', 'installing', 'building', 'migrating', 'starting'].includes(st.phase)

  const start = () => {
    setProgress('Запускаю…')
    window.flow.anythingEnsure()
  }

  // Запущено → показываем реальный интерфейс AnythingLLM в webview
  if (st?.running) {
    return (
      <div
        onPointerDown={stopEventPropagation}
        style={{ height: '100%', borderRadius: 8, overflow: 'hidden', background: '#0d1117' }}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {React.createElement('webview' as any, {
          ref: wvRef,
          src: `http://localhost:${st.port}`,
          partition: 'persist:anythingllm',
          allowpopups: 'true',
          style: { width: '100%', height: '100%', border: 'none', background: '#0d1117' }
        })}
      </div>
    )
  }

  // Не запущено — экран установки/прогресса
  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: NODE_SANS,
        color: C.textDim,
        textAlign: 'center',
        padding: 14
      }}
    >
      <div style={{ fontSize: 26 }}>🧠</div>
      {busy ? (
        <>
          <div style={{ fontSize: 12.5, color: C.text }}>
            {ANY_PHASE_LABEL[st!.phase] || 'Устанавливаю…'}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, maxWidth: 260, lineHeight: 1.5 }}>
            {progress || st!.message || 'Первый запуск занимает несколько минут.'}
          </div>
          <div
            style={{
              width: 160,
              height: 3,
              borderRadius: 3,
              background: 'rgba(20,184,166,0.2)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg,transparent,#14B8A6,transparent)',
                animation: 'anyshimmer 1.4s linear infinite'
              }}
            />
          </div>
          <style>{`@keyframes anyshimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        </>
      ) : st?.phase === 'error' ? (
        <>
          <div style={{ fontSize: 12.5, color: C.red }}>Ошибка запуска AnythingLLM</div>
          <div style={{ fontSize: 10.5, color: C.textDim, maxWidth: 270, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {st.error || progress}
          </div>
          <button onClick={start} onPointerDown={stopEventPropagation} style={anyBtnStyle}>
            ↻ Повторить
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: C.text }}>
            {st?.installed ? 'AnythingLLM установлен' : 'AnythingLLM ещё не установлен'}
          </div>
          <div style={{ fontSize: 11, color: C.textDim, maxWidth: 260, lineHeight: 1.5 }}>
            {st?.installed
              ? 'Нажми, чтобы запустить локальный сервер.'
              : 'Flow скачает и поднимет его сам. Первый раз — несколько минут и ~1 ГБ загрузки.'}
          </div>
          <button onClick={start} onPointerDown={stopEventPropagation} style={anyBtnStyle}>
            {st?.installed ? '▶ Запустить' : '⬇ Установить и запустить'}
          </button>
        </>
      )}
    </div>
  )
}

const anyBtnStyle: React.CSSProperties = {
  border: '1px solid #14B8A6',
  background: 'linear-gradient(180deg,#2dd4bf,#0d9488)',
  color: '#04201d',
  fontWeight: 700,
  borderRadius: 8,
  fontSize: 12.5,
  padding: '8px 16px',
  cursor: 'pointer',
  fontFamily: NODE_SANS,
  boxShadow: '0 2px 10px rgba(20,184,166,0.35)'
}

// ---------- OpenScience (@synsci/openscience): встроенный веб-воркспейс ----------
// `openscience serve --port 8790` поднимает headless-сервер, отдающий воркспейс на
// http://localhost:8790 (без TUI и без внешнего браузера). Показываем его прямо в
// ноде через <webview> — воркспейс на доске, а не в браузере. Сервером управляет
// главный процесс (src/main/openscience.ts). Модели/ключи настраиваются в самом
// веб-интерфейсе воркспейса. Требует `npm i -g @synsci/openscience`.
type OsState = { phase: string; message: string; running: boolean; url: string; error: string }

function OpenscienceBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  void editor
  const id = String(shape.id)
  const [st, setSt] = useState<OsState | null>(null)
  const [progress, setProgress] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wvRef = useRef<any>(null)
  const started = useRef(false)

  // Снимок воркспейса (innerText webview) в реестр — для контекста по стрелке.
  useEffect(() => {
    const iv = setInterval(() => {
      const wv = wvRef.current
      if (!wv || !wv.executeJavaScript) return
      try {
        wv.executeJavaScript('document.body ? document.body.innerText : ""')
          .then((txt: string) => setAgentTranscript(id, txt))
          .catch(() => {})
      } catch {
        /* ignore */
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [id])

  useEffect(() => {
    let alive = true
    const poll = (): void => {
      window.flow.openscienceState().then((s) => {
        if (!alive) return
        setSt(s)
        // Сервер поднимаем автоматически один раз, если он ещё не запущен.
        if (!s.running && !started.current && s.phase !== 'error' && s.phase !== 'starting') {
          started.current = true
          window.flow.openscienceEnsure()
        }
      })
    }
    poll()
    const iv = setInterval(poll, 2000)
    const off = window.flow.onOpenscienceProgress((p) => {
      if (alive) setProgress(p.message || '')
    })
    return () => {
      alive = false
      clearInterval(iv)
      off()
    }
  }, [])

  const busy = st?.phase === 'starting'
  const start = (): void => {
    started.current = true
    setProgress('Запускаю…')
    window.flow.openscienceEnsure()
  }

  // Сервер поднят → показываем веб-воркспейс OpenScience в webview
  if (st?.running && st.url) {
    return (
      <div
        onPointerDown={stopEventPropagation}
        style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRadius: 8, overflow: 'hidden', background: '#fff' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 8px',
            background: '#0d1117',
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0
          }}
        >
          <button
            onClick={() => {
              try {
                wvRef.current?.reload()
              } catch {
                /* ignore */
              }
            }}
            onPointerDown={stopEventPropagation}
            style={osciNavBtn}
            title="Обновить"
          >
            ↻
          </button>
          <div style={{ flex: 1, fontSize: 10.5, fontFamily: NODE_MONO, color: C.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            OpenScience · {st.url.replace(/^https?:\/\//, '')}
          </div>
          <button
            onClick={() => {
              try {
                window.open(st.url, '_blank')
              } catch {
                /* ignore */
              }
            }}
            onPointerDown={stopEventPropagation}
            style={osciNavBtn}
            title="Открыть в браузере"
          >
            ↗
          </button>
        </div>
        <div style={{ flex: 1, position: 'relative', background: '#fff' }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {React.createElement('webview' as any, {
            ref: wvRef,
            src: st.url,
            partition: 'persist:openscience',
            allowpopups: 'true',
            style: { width: '100%', height: '100%', border: 'none', background: '#fff' }
          })}
        </div>
      </div>
    )
  }

  // Сервер ещё не поднят — прогресс/ошибка/старт
  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: NODE_SANS,
        color: C.textDim,
        textAlign: 'center',
        padding: 14
      }}
    >
      <div style={{ fontSize: 26 }}>🔬</div>
      {busy ? (
        <>
          <div style={{ fontSize: 12.5, color: C.text }}>Поднимаю воркспейс OpenScience…</div>
          <div style={{ fontSize: 10.5, color: C.textDim, maxWidth: 300, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {progress || st?.message || 'openscience serve на localhost:8790…'}
          </div>
          <div style={{ width: 160, height: 3, borderRadius: 3, background: 'rgba(44,123,229,0.2)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,#2C7BE5,transparent)', animation: 'oscishimmer 1.4s linear infinite' }} />
          </div>
          <style>{`@keyframes oscishimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        </>
      ) : st?.phase === 'error' ? (
        <>
          <div style={{ fontSize: 12.5, color: C.red }}>Не удалось поднять OpenScience</div>
          <div style={{ fontSize: 10.5, color: C.textDim, maxWidth: 300, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {st.error || progress}
          </div>
          <div style={{ fontSize: 10, color: C.textDim, maxWidth: 300, lineHeight: 1.5 }}>
            Если не установлен: <span style={{ fontFamily: NODE_MONO }}>npm i -g @synsci/openscience</span>
          </div>
          <button onClick={start} onPointerDown={stopEventPropagation} style={osciBtnStyle}>
            ↻ Повторить
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12.5, color: C.text }}>OpenScience — научный AI-воркбенч</div>
          <div style={{ fontSize: 11, color: C.textDim, maxWidth: 300, lineHeight: 1.5 }}>
            Воркспейс откроется прямо здесь, на доске.
          </div>
          <button onClick={start} onPointerDown={stopEventPropagation} style={osciBtnStyle}>
            ▶ Открыть воркспейс
          </button>
        </>
      )}
    </div>
  )
}

const osciNavBtn: React.CSSProperties = {
  border: 'none',
  background: 'rgba(255,255,255,0.07)',
  color: '#c9d1d9',
  width: 22,
  height: 22,
  borderRadius: 5,
  fontSize: 13,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  fontFamily: NODE_SANS
}

const osciBtnStyle: React.CSSProperties = {
  border: '1px solid #2C7BE5',
  background: 'linear-gradient(180deg,#5b9cf0,#2C7BE5)',
  color: '#04121f',
  fontWeight: 700,
  borderRadius: 8,
  fontSize: 12.5,
  padding: '8px 16px',
  cursor: 'pointer',
  fontFamily: NODE_SANS,
  boxShadow: '0 2px 10px rgba(44,123,229,0.35)'
}

// ---------- Jupyter/Colab-нода: ячейки кода/markdown, постоянный kernel ----------
type NbOutput =
  | { kind: 'stream'; name: string; text: string }
  | { kind: 'image'; data: string }
  | { kind: 'result'; text: string; html?: string | null }
  | { kind: 'error'; text: string }
type NbCell = {
  id: string
  type: 'code' | 'markdown'
  source: string
  outputs: NbOutput[]
  count: number | null
  running?: boolean
  rendered?: boolean
}

let nbCounter = 0
const nbId = (): string => `cell_${Date.now().toString(36)}_${nbCounter++}`
const NB_FONT = "'JetBrains Mono', monospace"

function loadNb(history: string): NbCell[] {
  try {
    const j = JSON.parse(history || '')
    if (Array.isArray(j?.cells) && j.cells.length) return j.cells as NbCell[]
  } catch {
    /* пустой/битый — начнём с одной ячейки */
  }
  return [{ id: nbId(), type: 'code', source: '', outputs: [], count: null }]
}

function nbEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function highlightPy(src: string): string {
  try {
    return hljs.highlight(src, { language: 'python' }).value
  } catch {
    return nbEscape(src)
  }
}

const nbOut: React.CSSProperties = {
  margin: 0,
  padding: '6px 9px',
  fontFamily: NB_FONT,
  fontSize: 11.5,
  lineHeight: 1.5,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  background: '#0d1117',
  borderRadius: 5,
  color: '#c9d1d9'
}

// Редактор кода: подсвеченный <pre> для просмотра, по клику — чёткая textarea
// для правки (без «прозрачного оверлея», который размывал текст).
const NB_CODE: React.CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  fontFamily: NB_FONT,
  fontSize: 13,
  lineHeight: 1.55,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  boxSizing: 'border-box',
  background: '#0d1117',
  borderRadius: 6,
  minHeight: 54
}
function NbCodeEditor({
  value,
  onChange,
  onCommit,
  onRun
}: {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
  onRun: () => void
}) {
  const [editing, setEditing] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const grow = (ta: HTMLTextAreaElement | null): void => {
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }
  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus()
      grow(taRef.current)
    }
  }, [editing])

  if (!editing) {
    return (
      <pre
        onClick={() => setEditing(true)}
        className="hljs"
        style={{ ...NB_CODE, color: '#c9d1d9', cursor: 'text', overflow: 'auto' }}
      >
        {value ? (
          <code style={{ background: 'transparent', padding: 0 }} dangerouslySetInnerHTML={{ __html: highlightPy(value) }} />
        ) : (
          <span style={{ color: C.textDim }}>код… (клик — редактировать)</span>
        )}
      </pre>
    )
  }
  return (
    <textarea
      ref={taRef}
      value={value}
      spellCheck={false}
      onChange={(e) => {
        onChange(e.currentTarget.value)
        grow(e.currentTarget)
      }}
      onBlur={() => {
        setEditing(false)
        onCommit()
      }}
      onPointerDown={stopEventPropagation}
      onKeyDown={(e) => {
        if (e.code === 'Enter' && (e.shiftKey || e.ctrlKey)) {
          e.preventDefault()
          onRun()
          return
        }
        if (e.code === 'Tab') {
          e.preventDefault()
          const ta = e.currentTarget
          const s = ta.selectionStart
          const en = ta.selectionEnd
          onChange(value.slice(0, s) + '    ' + value.slice(en))
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = s + 4
          })
        }
        e.stopPropagation()
      }}
      style={{
        ...NB_CODE,
        width: '100%',
        display: 'block',
        resize: 'none',
        overflow: 'hidden',
        color: '#e6edf3',
        caretColor: '#f9a825',
        border: '1px solid #f9a825',
        outline: 'none'
      }}
    />
  )
}

function NbOutputs({ outputs }: { outputs: NbOutput[] }) {
  if (!outputs.length) return null
  return (
    <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {outputs.map((o, i) => {
        if (o.kind === 'stream')
          return (
            <pre key={i} style={{ ...nbOut, color: o.name === 'stderr' ? '#ffa198' : '#c9d1d9' }}>
              {o.text}
            </pre>
          )
        if (o.kind === 'error')
          return (
            <pre key={i} style={{ ...nbOut, color: '#ffa198', background: 'rgba(248,81,73,0.08)' }}>
              {o.text}
            </pre>
          )
        if (o.kind === 'image')
          return (
            <img
              key={i}
              src={`data:image/png;base64,${o.data}`}
              style={{ maxWidth: '100%', borderRadius: 6, background: '#fff', alignSelf: 'flex-start' }}
            />
          )
        // result
        if (o.html)
          return (
            <div
              key={i}
              className="nb-html"
              style={{ overflow: 'auto', background: '#fff', color: '#111', borderRadius: 6, padding: 6, fontSize: 11.5 }}
              dangerouslySetInnerHTML={{ __html: o.html }}
            />
          )
        return (
          <pre key={i} style={nbOut}>
            {o.text}
          </pre>
        )
      })}
    </div>
  )
}

// Кнопка «запустить» слева от ячейки
function NbRunBtn({ running, onClick }: { running?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      onPointerDown={stopEventPropagation}
      title="Выполнить (Shift+Enter)"
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        fontSize: 12,
        color: '#fff',
        background: running ? '#6e7681' : 'linear-gradient(180deg,#f9a825,#f57f17)'
      }}
    >
      {running ? '…' : '▶'}
    </button>
  )
}

// Защита рендера markdown: битый LaTeX/контент из импортированного .ipynb
// не должен ронять всю ноду — показываем исходник.
class NbSafe extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }
  render(): React.ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function NbCellView({
  cell,
  onChange,
  onCommit,
  onRun,
  onDelete,
  onAddBelow,
  onMove
}: {
  cell: NbCell
  onChange: (src: string) => void
  onCommit: () => void
  onRun: () => void
  onDelete: () => void
  onAddBelow: (type: 'code' | 'markdown') => void
  onMove: (dir: -1 | 1) => void
}) {
  const [hover, setHover] = useState(false)
  const countLabel = cell.running ? '[*]' : cell.count != null ? `[${cell.count}]` : '[ ]'
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', gap: 6, alignItems: 'flex-start', position: 'relative' }}
    >
      {/* левый жёлоб: запуск + счётчик */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 30, paddingTop: 4 }}>
        <NbRunBtn running={cell.running} onClick={onRun} />
        {cell.type === 'code' && (
          <span style={{ fontSize: 9, color: C.textDim, fontFamily: NB_FONT }}>{countLabel}</span>
        )}
      </div>

      {/* тело ячейки */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {cell.type === 'markdown' && cell.rendered && cell.source.trim() ? (
          <div
            onClick={() => {
              cell.rendered = false
              onCommit()
            }}
            title="Клик — редактировать"
            style={{ background: '#0d1117', borderRadius: 6, padding: '6px 12px', cursor: 'text' }}
          >
            <NbSafe fallback={<pre style={nbOut}>{cell.source}</pre>}>
              <MarkdownView content={cell.source} />
            </NbSafe>
          </div>
        ) : cell.type === 'markdown' ? (
          <textarea
            value={cell.source}
            spellCheck={false}
            onChange={(e) => onChange(e.currentTarget.value)}
            onBlur={onCommit}
            onPointerDown={stopEventPropagation}
            onKeyDown={(e) => {
              if (e.code === 'Enter' && (e.shiftKey || e.ctrlKey)) {
                e.preventDefault()
                onRun()
              }
              e.stopPropagation()
            }}
            placeholder="Markdown… (Shift+Enter — показать)"
            style={{
              width: '100%',
              minHeight: 44,
              boxSizing: 'border-box',
              background: '#0d1117',
              border: `1px dashed ${C.border}`,
              borderRadius: 6,
              color: '#c9d1d9',
              fontFamily: NB_FONT,
              fontSize: 12.5,
              padding: '8px 10px',
              resize: 'vertical',
              outline: 'none'
            }}
          />
        ) : (
          <>
            <NbCodeEditor value={cell.source} onChange={onChange} onCommit={onCommit} onRun={onRun} />
            <NbOutputs outputs={cell.outputs} />
          </>
        )}
      </div>

      {/* панелька действий справа (при наведении) */}
      {hover && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'absolute', right: 0, top: 2 }}>
          {[
            { t: '↑', a: () => onMove(-1), title: 'Выше' },
            { t: '↓', a: () => onMove(1), title: 'Ниже' },
            { t: '🗑', a: onDelete, title: 'Удалить' }
          ].map((b) => (
            <button
              key={b.t}
              onClick={b.a}
              onPointerDown={stopEventPropagation}
              title={b.title}
              style={{
                width: 20,
                height: 20,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.08)',
                color: C.textDim,
                fontSize: 10
              }}
            >
              {b.t}
            </button>
          ))}
          <button
            onClick={() => onAddBelow('code')}
            onPointerDown={stopEventPropagation}
            title="Добавить код ниже"
            style={{ width: 20, height: 20, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: C.textDim, fontSize: 12 }}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Импорт/экспорт .ipynb (nbformat v4) ----
function srcToLines(s: string): string[] {
  const parts = s.split('\n')
  return parts.map((l, i) => (i < parts.length - 1 ? l + '\n' : l))
}
function joinSrc(s: string | string[] | undefined): string {
  return Array.isArray(s) ? s.join('') : s || ''
}
function cellsToIpynb(cells: NbCell[]): string {
  const nb = {
    nbformat: 4,
    nbformat_minor: 5,
    metadata: {
      kernelspec: { name: 'python3', display_name: 'Python 3' },
      language_info: { name: 'python' }
    },
    cells: cells.map((c) => {
      if (c.type === 'markdown')
        return { cell_type: 'markdown', metadata: {}, source: srcToLines(c.source) }
      return {
        cell_type: 'code',
        execution_count: c.count,
        metadata: {},
        source: srcToLines(c.source),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        outputs: c.outputs.map((o: NbOutput): any => {
          if (o.kind === 'stream') return { output_type: 'stream', name: o.name, text: srcToLines(o.text) }
          if (o.kind === 'error') return { output_type: 'error', ename: 'Error', evalue: '', traceback: o.text.split('\n') }
          if (o.kind === 'image') return { output_type: 'display_data', data: { 'image/png': o.data }, metadata: {} }
          return {
            output_type: 'execute_result',
            execution_count: c.count,
            data: { 'text/plain': srcToLines(o.text), ...(o.html ? { 'text/html': srcToLines(o.html) } : {}) },
            metadata: {}
          }
        })
      }
    })
  }
  return JSON.stringify(nb, null, 1)
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ipynbToCells(json: any): NbCell[] {
  const cells: NbCell[] = []
  for (const c of json?.cells || []) {
    if (c.cell_type === 'markdown') {
      cells.push({ id: nbId(), type: 'markdown', source: joinSrc(c.source), outputs: [], count: null, rendered: true })
    } else if (c.cell_type === 'code') {
      const outputs: NbOutput[] = []
      for (const o of c.outputs || []) {
        if (o.output_type === 'stream') outputs.push({ kind: 'stream', name: o.name || 'stdout', text: joinSrc(o.text) })
        else if (o.output_type === 'error') outputs.push({ kind: 'error', text: (o.traceback || []).join('\n') })
        else if (o.output_type === 'execute_result' || o.output_type === 'display_data') {
          const d = o.data || {}
          if (d['image/png']) outputs.push({ kind: 'image', data: Array.isArray(d['image/png']) ? d['image/png'].join('') : d['image/png'] })
          else if (d['text/html']) outputs.push({ kind: 'result', text: joinSrc(d['text/plain']), html: joinSrc(d['text/html']) })
          else if (d['text/plain']) outputs.push({ kind: 'result', text: joinSrc(d['text/plain']) })
        }
      }
      cells.push({ id: nbId(), type: 'code', source: joinSrc(c.source), outputs, count: c.execution_count ?? null })
    }
  }
  return cells.length ? cells : [{ id: nbId(), type: 'code', source: '', outputs: [], count: null }]
}

function NotebookBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const id = String(shape.id)
  const nb = useRef<NbCell[]>(loadNb(shape.props.history))
  const [, force] = useState(0)
  const rerender = (): void => force((n) => n + 1)
  const [ready, setReady] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const ex = parseExtra(shape.props.extra) as { python?: string }
  const [python, setPython] = useState<string>(ex.python || '')
  const [kernels, setKernels] = useState<Array<{ name: string; python: string }>>([])

  const persist = (): void => update({ history: JSON.stringify({ cells: nb.current }) })
  const commit = (): void => {
    rerender()
    persist()
  }

  // Список доступных интерпретаторов (py launcher, conda-окружения, системный)
  useEffect(() => {
    window.flow.notebookKernels().then((r) => {
      if (r.ok) setKernels(r.kernels)
    })
  }, [])

  useEffect(() => {
    window.flow.notebookStart({ id, python: ex.python || undefined })
    const off = window.flow.onNotebookMsg((m: NotebookMsg) => {
      if (m.id !== id) return
      if (m.type === 'ready') {
        setReady(true)
        return
      }
      if (m.type === 'exit') {
        setReady(false)
        return
      }
      const c = nb.current.find((x) => x.id === m.cell)
      if (!c) return
      if (m.type === 'stream') {
        const last = c.outputs[c.outputs.length - 1]
        if (last && last.kind === 'stream' && last.name === m.name) last.text += m.text || ''
        else c.outputs.push({ kind: 'stream', name: m.name || 'stdout', text: m.text || '' })
        rerender()
      } else if (m.type === 'image') {
        c.outputs.push({ kind: 'image', data: m.data || '' })
        rerender()
      } else if (m.type === 'result') {
        c.outputs.push({ kind: 'result', text: m.text || '', html: m.html })
        rerender()
      } else if (m.type === 'error') {
        c.outputs.push({ kind: 'error', text: m.text || '' })
        rerender()
      } else if (m.type === 'done') {
        c.running = false
        c.count = m.count ?? c.count
        commit()
      }
    })
    return () => off()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const runCell = (c: NbCell): void => {
    if (c.type === 'markdown') {
      c.rendered = true
      commit()
      return
    }
    c.outputs = []
    c.running = true
    c.count = null
    rerender()
    window.flow.notebookRun({ id, cell: c.id, code: c.source })
  }
  const runAll = (): void => nb.current.forEach((c) => runCell(c))
  const addCell = (type: 'code' | 'markdown', afterId?: string): void => {
    const cell: NbCell = { id: nbId(), type, source: '', outputs: [], count: null, rendered: false }
    const idx = afterId != null ? nb.current.findIndex((x) => x.id === afterId) + 1 : nb.current.length
    nb.current.splice(idx, 0, cell)
    commit()
  }
  const delCell = (cid: string): void => {
    nb.current = nb.current.filter((x) => x.id !== cid)
    if (!nb.current.length) nb.current = [{ id: nbId(), type: 'code', source: '', outputs: [], count: null }]
    commit()
  }
  const moveCell = (cid: string, dir: -1 | 1): void => {
    const i = nb.current.findIndex((x) => x.id === cid)
    const j = i + dir
    if (i < 0 || j < 0 || j >= nb.current.length) return
    const arr = nb.current
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    commit()
  }
  const restart = async (py?: string): Promise<void> => {
    setReady(false)
    await window.flow.notebookRestart({ id, python: py ?? python ?? undefined })
    nb.current.forEach((c) => {
      c.count = null
      c.running = false
    })
    commit()
  }
  // Сменить интерпретатор: сохранить выбор и перезапустить kernel (состояние сбросится)
  const changeKernel = (py: string): void => {
    setPython(py)
    update({ extra: JSON.stringify({ ...ex, python: py }) })
    restart(py)
  }
  const exportIpynb = (): void => {
    const json = cellsToIpynb(nb.current)
    const b64 = btoa(unescape(encodeURIComponent(json)))
    window.flow.saveFile({ base64: b64, name: (shape.props.title || 'notebook') + '.ipynb' })
  }
  const importFile = async (f: File): Promise<void> => {
    try {
      const text = await f.text()
      nb.current = ipynbToCells(JSON.parse(text))
      commit()
    } catch (e) {
      alert('Не удалось прочитать .ipynb: ' + String(e))
    }
  }

  const tbBtn: React.CSSProperties = {
    border: `1px solid ${C.border}`,
    background: '#0d1117',
    color: '#c9d1d9',
    borderRadius: 6,
    fontSize: 11,
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: NODE_SANS,
    whiteSpace: 'nowrap'
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', fontFamily: NODE_SANS }}
    >
      {/* тулбар */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={runAll} onPointerDown={stopEventPropagation} style={{ ...tbBtn, color: '#f9a825', borderColor: '#f9a825' }}>
          ⏵⏵ Запустить всё
        </button>
        <button onClick={() => addCell('code')} onPointerDown={stopEventPropagation} style={tbBtn}>
          + Код
        </button>
        <button onClick={() => addCell('markdown')} onPointerDown={stopEventPropagation} style={tbBtn}>
          + Markdown
        </button>
        <select
          value={python}
          onChange={(e) => changeKernel(e.currentTarget.value)}
          onPointerDown={stopEventPropagation}
          title="Выбрать интерпретатор (conda / py / системный)"
          style={{ ...selectStyle, fontSize: 11, padding: '3px 6px', maxWidth: 150 }}
        >
          <option value="">ядро: по умолчанию</option>
          {kernels.map((k) => (
            <option key={k.python} value={k.python}>
              {k.name}
            </option>
          ))}
        </select>
        <button onClick={() => restart()} onPointerDown={stopEventPropagation} style={tbBtn} title="Перезапустить kernel (сбросить переменные)">
          ⟳
        </button>
        <div style={{ flex: 1 }} />
        <span
          title={ready ? 'Python готов' : 'Python запускается…'}
          style={{ width: 8, height: 8, borderRadius: '50%', background: ready ? '#3fb950' : '#d29922', flexShrink: 0 }}
        />
        <button onClick={() => fileRef.current?.click()} onPointerDown={stopEventPropagation} style={tbBtn} title="Импорт .ipynb">
          ⬇ Импорт
        </button>
        <button onClick={exportIpynb} onPointerDown={stopEventPropagation} style={tbBtn} title="Экспорт .ipynb">
          ⬆ Экспорт
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".ipynb,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.currentTarget.files?.[0]
            if (f) importFile(f)
            e.currentTarget.value = ''
          }}
        />
      </div>

      {/* ячейки */}
      <div className="flow-scroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {nb.current.map((c) => (
          <NbCellView
            key={c.id}
            cell={c}
            onChange={(src) => {
              c.source = src
              rerender()
              persist() // сохраняем сразу, чтобы связанный чат читал актуальный код
            }}
            onCommit={persist}
            onRun={() => runCell(c)}
            onDelete={() => delCell(c.id)}
            onAddBelow={(t) => addCell(t, c.id)}
            onMove={(d) => moveCell(c.id, d)}
          />
        ))}
        <button
          onClick={() => addCell('code')}
          onPointerDown={stopEventPropagation}
          style={{ ...tbBtn, alignSelf: 'flex-start', marginLeft: 36, opacity: 0.7 }}
        >
          + ячейка
        </button>
      </div>
    </div>
  )
}

// ---------- PDF-нода: просмотр страниц + фоновая RAG-индексация ----------
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

// Чтобы не запускать индексацию одного PDF дважды (нода могла ремаунтнуться).
const pdfIndexing = new Set<string>()

// Хайлайт-аннотация на странице PDF. bbox нормализован (0..1) — переживает зум/масштаб.
type PdfQA = { question: string; answer: string; at: number }
type PdfHighlight = {
  id: string
  page: number
  type: 'text' | 'region'
  content: string
  bbox: { x: number; y: number; width: number; height: number }
  qa: PdfQA[]
}
const nid = (p: string): string => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)

function PdfNodeBody({ shape, editor }: { shape: FlowNodeShape; editor: Editor }) {
  const update = useUpdate(editor, shape)
  const ex = parseExtra(shape.props.extra) as {
    pdfId?: string
    name?: string
    indexed?: boolean
    highlights?: PdfHighlight[]
    qaModel?: string
  }
  const pdfId = ex.pdfId || ''
  const setEx = (patch: Record<string, unknown>): void => update({ extra: JSON.stringify({ ...ex, ...patch }) })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfRef = useRef<any>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pageBoxRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ x: number; y: number } | null>(null)
  const [page, setPage] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [indexed, setIndexed] = useState(!!ex.indexed)
  const [progress, setProgress] = useState<{ pct: number; msg: string } | null>(null)
  const [highlights, setHighlights] = useState<PdfHighlight[]>(ex.highlights || [])
  const [sel, setSel] = useState<PdfHighlight | null>(null)
  const [drawing, setDrawing] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

  const saveHls = (next: PdfHighlight[]): void => {
    setHighlights(next)
    setEx({ highlights: next })
  }
  const norm = (e: React.PointerEvent): { x: number; y: number } => {
    const r = pageBoxRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    }
  }
  const onSelDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    stopEventPropagation(e)
    const p = norm(e)
    dragRef.current = p
    setSel(null)
    setDrawing({ x: p.x, y: p.y, width: 0, height: 0 })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onSelMove = (e: React.PointerEvent): void => {
    if (!dragRef.current) return
    const p = norm(e)
    const s = dragRef.current
    setDrawing({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      width: Math.abs(p.x - s.x),
      height: Math.abs(p.y - s.y)
    })
  }
  const onSelUp = async (): Promise<void> => {
    const d = drawing
    dragRef.current = null
    setDrawing(null)
    if (!d || d.width < 0.02 || d.height < 0.008) return // слишком мелко — игнор
    let text = ''
    try {
      text = await textInBBox(pdfRef.current, page, d)
    } catch {
      /* ignore */
    }
    const hl: PdfHighlight = {
      id: nid('hl_'),
      page,
      type: text.length > 3 ? 'text' : 'region',
      content: text,
      bbox: d,
      qa: []
    }
    saveHls([...highlights, hl])
    setSel(hl)
  }

  // --- Q&A по выделению: стриминг ответа + RAG + vision ---
  const models = useModels()
  const qaModel = ex.qaModel || ''
  const [question, setQuestion] = useState('')
  const [live, setLive] = useState('') // стримящийся ответ
  const [asking, setAsking] = useState(false)
  const streamRef = useRef<{
    reqId: string
    onToken: (d: string) => void
    onDone: (t: string) => void
    onError: (e: string) => void
  } | null>(null)

  useEffect(() => {
    const off = window.flow.onPdfStream((m) => {
      const s = streamRef.current
      if (!s || m.reqId !== s.reqId) return
      if (m.channel === 'token') s.onToken(m.delta || '')
      else if (m.channel === 'done') s.onDone(m.text || '')
      else s.onError(m.error || 'ошибка')
    })
    return off
  }, [])

  // Кроп области хайлайта из текущего canvas (для vision по диаграмме/скану)
  const cropRegion = (h: PdfHighlight): string | undefined => {
    const c = canvasRef.current
    if (!c || h.page !== page) return undefined
    const sx = h.bbox.x * c.width
    const sy = h.bbox.y * c.height
    const sw = Math.max(1, h.bbox.width * c.width)
    const sh = Math.max(1, h.bbox.height * c.height)
    const off = document.createElement('canvas')
    off.width = sw
    off.height = sh
    const g = off.getContext('2d')
    if (!g) return undefined
    g.drawImage(c, sx, sy, sw, sh, 0, 0, sw, sh)
    return off.toDataURL('image/png')
  }

  const askQuestion = async (h: PdfHighlight): Promise<void> => {
    if (!question.trim() || asking) return
    const q = question.trim()
    setQuestion('')
    setAsking(true)
    setLive('')
    let queryVector: number[] | undefined
    try {
      if (indexed) queryVector = await embedQuery(q)
    } catch {
      /* без RAG-контекста тоже ответим */
    }
    const imageDataUrl = h.type === 'region' ? cropRegion(h) : undefined
    const reqId = nid('q_')
    const finish = (answer: string): void => {
      streamRef.current = null
      setAsking(false)
      setLive('')
      // История Q&A хранится в самом хайлайте (переживает перезагрузку)
      const next = highlights.map((x) =>
        x.id === h.id ? { ...x, qa: [...x.qa, { question: q, answer, at: Date.now() }] } : x
      )
      saveHls(next)
      setSel(next.find((x) => x.id === h.id) || null)
    }
    streamRef.current = {
      reqId,
      onToken: (d) => setLive((a) => a + d),
      onDone: (t) => finish(t),
      onError: (e) => finish('⚠️ ' + e)
    }
    window.flow.pdfAsk({
      reqId,
      model: qaModel,
      pdfId,
      question: q,
      queryVector,
      selection: h.content || undefined,
      imageDataUrl
    })
  }

  // Загрузка PDF с диска + рендер + запуск индексации
  useEffect(() => {
    if (!pdfId) return
    let alive = true
    ;(async () => {
      try {
        const r = await window.flow.pdfBytes({ id: pdfId })
        if (!r.ok) {
          if (alive) setError('PDF не найден: ' + r.error)
          return
        }
        const pdf = await loadPdf(b64ToBytes(r.base64))
        if (!alive) return
        pdfRef.current = pdf
        setNumPages(pdf.numPages)
        setLoaded(true)
        const st = await window.flow.pdfIndexed({ id: pdfId })
        if (st.indexed && st.count > 0) {
          if (alive) setIndexed(true)
        } else if (!pdfIndexing.has(pdfId)) {
          indexPdf(pdf)
        }
      } catch (e) {
        if (alive) setError('Не удалось открыть PDF: ' + String(e))
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfId])

  // Рендер текущей страницы
  useEffect(() => {
    if (!loaded || !pdfRef.current || !canvasRef.current) return
    renderPage(pdfRef.current, page, canvasRef.current, 1.5).catch(() => {})
  }, [loaded, page])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const indexPdf = async (pdf: any): Promise<void> => {
    pdfIndexing.add(pdfId)
    try {
      setProgress({ pct: 0, msg: 'Извлечение текста…' })
      const all: Array<{ page: number; text: string }> = []
      for (let pg = 1; pg <= pdf.numPages; pg++) {
        const txt = await extractPageText(pdf, pg)
        for (const c of chunkText(txt)) all.push({ page: pg, text: c })
        setProgress({ pct: (pg / pdf.numPages) * 0.3, msg: `Извлечение текста… стр. ${pg}/${pdf.numPages}` })
      }
      if (!all.length) {
        setProgress(null)
        setIndexed(true)
        setEx({ indexed: true })
        return
      }
      // Первый раз качается модель эмбеддингов (~470 МБ) — показываем прогресс
      setProgress({ pct: 0.3, msg: 'Загрузка модели эмбеддингов…' })
      await loadEmbedder((msg) => setProgress({ pct: 0.3, msg }))
      const vectors = await embedPassages(
        all.map((c) => c.text),
        (done, total) => setProgress({ pct: 0.3 + (done / total) * 0.7, msg: `Индексация ${done}/${total}` })
      )
      await window.flow.pdfIndexAdd({
        id: pdfId,
        chunks: all.map((c, i) => ({ id: `${pdfId}_${i}`, page: c.page, text: c.text, vector: vectors[i] }))
      })
      setProgress(null)
      setIndexed(true)
      setEx({ indexed: true })
    } catch (e) {
      setProgress(null)
      setError('Ошибка индексации: ' + String(e))
    } finally {
      pdfIndexing.delete(pdfId)
    }
  }

  if (!pdfId) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: C.textDim, fontSize: 12 }}>
        Перетащи PDF на холст
      </div>
    )
  }

  return (
    <div
      onPointerDown={stopEventPropagation}
      onWheelCapture={stopEventPropagation}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', fontFamily: NODE_SANS }}
    >
      {/* тулбар: навигация по страницам + статус индексации */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: C.textDim }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} onPointerDown={stopEventPropagation} style={pdfBtn}>
          ◀
        </button>
        <span style={{ minWidth: 54, textAlign: 'center' }}>
          {page} / {numPages || '…'}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(numPages || 1, p + 1))}
          onPointerDown={stopEventPropagation}
          style={pdfBtn}
        >
          ▶
        </button>
        <div style={{ flex: 1 }} />
        {indexed ? (
          <span style={{ color: '#3fb950' }}>● проиндексирован</span>
        ) : progress ? (
          <span style={{ color: '#d29922' }}>{progress.msg}</span>
        ) : (
          <span>готовлюсь…</span>
        )}
      </div>

      {/* страница PDF + слой выделения/хайлайтов */}
      <div
        className="flow-scroll"
        style={{
          flex: sel ? '1 1 38%' : 1,
          minHeight: sel ? 120 : 0,
          overflow: 'auto',
          background: '#525659',
          borderRadius: 6,
          display: 'grid',
          placeItems: 'center',
          padding: 8
        }}
      >
        {error ? (
          <span style={{ color: C.red, fontSize: 12, padding: 12, textAlign: 'center' }}>{error}</span>
        ) : (
          <div
            ref={pageBoxRef}
            onPointerDown={onSelDown}
            onPointerMove={onSelMove}
            onPointerUp={onSelUp}
            style={{ position: 'relative', display: 'inline-block', lineHeight: 0, cursor: 'crosshair' }}
          >
            <canvas ref={canvasRef} style={{ maxWidth: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.4)', borderRadius: 2, display: 'block' }} />
            {/* сохранённые хайлайты текущей страницы */}
            {highlights
              .filter((h) => h.page === page)
              .map((h) => (
                <div
                  key={h.id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setSel(h)
                  }}
                  title={h.type === 'text' ? h.content.slice(0, 120) : 'область (диаграмма/скан)'}
                  style={{
                    position: 'absolute',
                    left: `${h.bbox.x * 100}%`,
                    top: `${h.bbox.y * 100}%`,
                    width: `${h.bbox.width * 100}%`,
                    height: `${h.bbox.height * 100}%`,
                    background: h.type === 'text' ? 'rgba(255,235,59,0.32)' : 'rgba(255,107,107,0.12)',
                    border: h.type === 'region' ? '2px solid #FF6B6B' : '1px solid rgba(255,213,0,0.6)',
                    borderRadius: 2,
                    cursor: 'pointer',
                    boxSizing: 'border-box'
                  }}
                />
              ))}
            {/* прямоугольник, который сейчас рисуют */}
            {drawing && (
              <div
                style={{
                  position: 'absolute',
                  left: `${drawing.x * 100}%`,
                  top: `${drawing.y * 100}%`,
                  width: `${drawing.width * 100}%`,
                  height: `${drawing.height * 100}%`,
                  border: '1px dashed #FF6B6B',
                  background: 'rgba(255,107,107,0.15)',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Q&A по выбранному хайлайту: история + стриминг + ввод */}
      {sel && (
        <div
          style={{
            background: '#0d1117',
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: 8,
            fontSize: 12,
            color: '#c9d1d9',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            flex: '1 1 58%',
            minHeight: 220
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: sel.type === 'text' ? '#ffd54f' : '#FF6B6B', fontSize: 10 }}>
              {sel.type === 'text' ? '✎ текст' : '▢ область'} · стр. {sel.page}
            </span>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => {
                saveHls(highlights.filter((h) => h.id !== sel.id))
                setSel(null)
              }}
              onPointerDown={stopEventPropagation}
              title="Удалить хайлайт"
              style={{ ...pdfBtn, padding: '1px 7px', color: C.red }}
            >
              🗑
            </button>
            <button onClick={() => setSel(null)} onPointerDown={stopEventPropagation} style={{ ...pdfBtn, padding: '1px 7px' }}>
              ✕
            </button>
          </div>

          {sel.type === 'text' && sel.content && (
            <div style={{ fontSize: 10.5, color: C.textDim, whiteSpace: 'pre-wrap', maxHeight: 40, overflow: 'auto' }}>
              «{sel.content.slice(0, 300)}»
            </div>
          )}

          {/* история Q&A + текущий стриминг */}
          <div className="flow-scroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sel.qa.map((qa, i) => (
              <div key={i}>
                <div style={{ color: '#58a6ff', fontSize: 10, marginBottom: 2 }}>› {qa.question}</div>
                <div style={{ fontSize: 11.5 }}>
                  <MarkdownView content={qa.answer} />
                </div>
              </div>
            ))}
            {asking && (
              <div>
                <div style={{ color: '#58a6ff', fontSize: 10, marginBottom: 2 }}>⌛…</div>
                <div style={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{live || '…'}</div>
              </div>
            )}
          </div>

          {/* выбор модели (для области нужна vision-модель) + ввод */}
          {models.length > 0 && (
            <select
              value={qaModel}
              onChange={(e) => setEx({ qaModel: e.currentTarget.value })}
              style={{ ...selectStyle, fontSize: 10.5, padding: '3px 6px' }}
            >
              <option value="">модель по умолчанию</option>
              {models.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.group} · {m.label}
                </option>
              ))}
            </select>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={question}
              onChange={(e) => setQuestion(e.currentTarget.value)}
              onPointerDown={stopEventPropagation}
              onKeyDown={(e) => {
                if (e.code === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  askQuestion(sel)
                }
                e.stopPropagation()
              }}
              placeholder={sel.type === 'region' ? 'Вопрос по области (нужна vision-модель)…' : 'Задать вопрос по фрагменту…'}
              style={{
                flex: 1,
                background: C.field,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.text,
                fontSize: 11.5,
                padding: '5px 8px',
                outline: 'none'
              }}
            />
            <button
              onClick={() => askQuestion(sel)}
              onPointerDown={stopEventPropagation}
              disabled={asking || !question.trim()}
              style={{
                border: 'none',
                borderRadius: 6,
                background: asking ? '#3a3a3c' : 'linear-gradient(180deg,#ff8a8a,#FF6B6B)',
                color: '#fff',
                fontSize: 13,
                padding: '5px 12px',
                cursor: asking ? 'default' : 'pointer'
              }}
            >
              {asking ? '…' : '➤'}
            </button>
          </div>
        </div>
      )}

      {/* progress-bar индексации снизу */}
      {progress && (
        <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,107,107,0.2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(progress.pct * 100)}%`, background: '#FF6B6B', transition: 'width 0.2s' }} />
        </div>
      )}
    </div>
  )
}

const pdfBtn: React.CSSProperties = {
  border: `1px solid ${C.border}`,
  background: '#0d1117',
  color: '#c9d1d9',
  borderRadius: 6,
  fontSize: 12,
  padding: '2px 9px',
  cursor: 'pointer'
}

function NodeView({
  shape,
  editor,
  isEditing
}: {
  shape: FlowNodeShape
  editor: Editor
  isEditing: boolean
}) {
  const update = useUpdate(editor, shape)
  const { title, kind, w, h } = shape.props
  const { color } = kindOf(kind)
  const [, force] = useState(0)
  const collapsed = collapsedMap.get(shape.id) ?? h <= HEADER_H + 6

  const toggleCollapse = (e: React.MouseEvent) => {
    stopEventPropagation(e)
    if (collapsed) {
      const restore = prevHMap.get(shape.id) ?? 180
      collapsedMap.set(shape.id, false)
      update({ h: restore })
    } else {
      prevHMap.set(shape.id, h)
      collapsedMap.set(shape.id, true)
      update({ h: HEADER_H })
    }
    force((n) => n + 1)
  }

  return (
    <HTMLContainer style={{ width: w, height: h, position: 'relative', pointerEvents: 'all', fontFamily: NODE_SANS }}>
      <PortDot side="left" color="var(--edge)" />
      <ContextPort editor={editor} sourceId={shape.id} color={color} />

      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 10,
          overflow: 'hidden',
          background: C.card,
          color: C.text,
          border: `1px solid ${C.border}`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
        }}
      >
        {/* Шапка (за неё двигаем ноду; двойной клик — редактировать заголовок) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 12px',
            flexShrink: 0,
            borderBottom: collapsed ? 'none' : `1px solid ${C.border}`
          }}
        >
          <span style={{ color, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <NodeIcon kind={kind} size={15} />
          </span>
          {isEditing ? (
            <input
              className="flow-input"
              value={title}
              onPointerDown={stopEventPropagation}
              onChange={(e) => update({ title: e.currentTarget.value })}
              style={{
                flex: 1,
                background: C.field,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                color: C.text,
                padding: '3px 7px',
                fontSize: 12,
                fontFamily: NODE_MONO,
                outline: 'none'
              }}
            />
          ) : (
            <span
              style={{
                flex: 1,
                font: `500 10.5px ${NODE_MONO}`,
                color: C.textDim,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {title}
            </span>
          )}
          <button
            onPointerDown={stopEventPropagation}
            onClick={() => window.dispatchEvent(new CustomEvent('flow-fullscreen-node', { detail: String(shape.id) }))}
            title="На весь экран"
            style={{ border: 'none', background: 'none', color: C.textDim, fontSize: 12, padding: 0, cursor: 'pointer', lineHeight: 1 }}
          >
            ⛶
          </button>
          <button
            onPointerDown={stopEventPropagation}
            onClick={toggleCollapse}
            title={collapsed ? 'Развернуть' : 'Свернуть'}
            style={{ border: 'none', background: 'none', color: C.textDim, fontSize: 11, padding: 0, cursor: 'pointer' }}
          >
            {collapsed ? '▸' : '▾'}
          </button>
        </div>

        {/* Тело */}
        {!collapsed && (
          <div style={{ flex: 1, padding: 11, overflow: 'hidden' }}>
            <NodeBodySwitch shape={shape} editor={editor} isEditing={isEditing} />
          </div>
        )}
      </div>
    </HTMLContainer>
  )
}

// Свитч тела ноды по типу — используется и в обычной ноде, и в полноэкранном режиме.
function NodeBodySwitch({
  shape,
  editor,
  isEditing
}: {
  shape: FlowNodeShape
  editor: Editor
  isEditing: boolean
}) {
  const kind = shape.props.kind
  return kind === 'ai' ? (
    <AiBody shape={shape} editor={editor} />
  ) : kind === 'code' ? (
    <CodeRequestBody shape={shape} editor={editor} />
  ) : kind === 'codeblock' ? (
    <CodeBlockBody shape={shape} editor={editor} />
  ) : kind === 'search' ? (
    <SearchBody shape={shape} editor={editor} />
  ) : kind === 'image' ? (
    <ImageBody shape={shape} editor={editor} />
  ) : kind === 'ref' ? (
    <RefBody shape={shape} editor={editor} />
  ) : kind === 'deck' ? (
    <DeckBody shape={shape} editor={editor} />
  ) : kind === 'diagram' ? (
    <DiagramBody shape={shape} editor={editor} />
  ) : kind === 'opencode' ? (
    <OpencodeBody shape={shape} editor={editor} />
  ) : kind === 'anythingllm' ? (
    <AnythingBody shape={shape} editor={editor} />
  ) : kind === 'openscience' ? (
    <OpenscienceBody shape={shape} editor={editor} />
  ) : kind === 'notebook' ? (
    <NotebookBody shape={shape} editor={editor} />
  ) : kind === 'pdf' ? (
    <PdfNodeBody shape={shape} editor={editor} />
  ) : kind === 'answer' ? (
    <AnswerBody shape={shape} editor={editor} />
  ) : (
    <SimpleBody shape={shape} editor={editor} isEditing={isEditing} />
  )
}

// Полноэкранный режим ноды: контент рендерится в реальный размер экрана (не как
// масштабированная текстура холста), поэтому webview/картинки/слайды — чёткие.
// Открывается кнопкой ⛶ в шапке; закрывается крестиком или Esc.
export function NodeFullscreenOverlay({
  shapeId,
  editor,
  onClose
}: {
  shapeId: string
  editor: Editor
  onClose: () => void
}) {
  const shape = editor.getShape(shapeId as never) as FlowNodeShape | undefined
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  if (!shape || shape.type !== 'flow-node') return null
  const meta = kindOf(shape.props.kind)
  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        background: 'var(--bg, #0d1117)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Шапка полноэкранного режима */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          borderBottom: `1px solid ${C.border}`,
          background: C.card,
          flexShrink: 0
        }}
      >
        <span style={{ color: meta.color, display: 'flex', alignItems: 'center' }}>
          <NodeIcon kind={shape.props.kind} size={16} />
        </span>
        <span style={{ flex: 1, font: `500 12px ${NODE_MONO}`, color: C.text, letterSpacing: '.04em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {shape.props.title || shape.props.kind}
        </span>
        <button
          onClick={onClose}
          title="Свернуть (Esc)"
          style={{
            border: `1px solid ${C.border}`,
            background: C.field,
            color: C.text,
            borderRadius: 7,
            fontSize: 12,
            padding: '5px 12px',
            cursor: 'pointer',
            fontFamily: NODE_SANS,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          ⤡ Свернуть
        </button>
      </div>
      {/* Тело на весь экран */}
      <div style={{ flex: 1, minHeight: 0, padding: 16, overflow: 'auto' }}>
        {shape.props.kind === 'slide' ? (
          <FullscreenSlide shape={shape} />
        ) : (
          <NodeBodySwitch shape={shape} editor={editor} isEditing={false} />
        )}
      </div>
    </div>,
    document.body
  )
}

// Слайд на весь экран: вписываем 1280×720 в экран с сохранением пропорций,
// рендер в реальный размер — текст и блоки чёткие.
function FullscreenSlide({ shape }: { shape: FlowNodeShape }) {
  const fit = (): number =>
    Math.min(window.innerWidth - 48, 1280 * ((window.innerHeight - 120) / 720))
  const [w, setW] = useState(fit)
  useEffect(() => {
    const on = (): void => setW(fit())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  const slide = parseSlide(shape.props.body)
  let image = ''
  try {
    image = JSON.parse(shape.props.extra || '{}').image || ''
  } catch {
    /* ignore */
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ boxShadow: '0 12px 44px rgba(0,0,0,0.5)', borderRadius: 12, overflow: 'hidden' }}>
        <ScaledSlide slide={slide} image={image} width={w} />
      </div>
    </div>
  )
}

// ---------- ShapeUtil ----------
export class FlowNodeShapeUtil extends ShapeUtil<FlowNodeShape> {
  static override type = 'flow-node' as const

  static override props: RecordProps<FlowNodeShape> = {
    w: T.number,
    h: T.number,
    kind: T.string,
    title: T.string,
    body: T.string,
    model: T.string,
    history: T.string,
    contextTokens: T.number,
    answerId: T.string,
    sourceId: T.string,
    extra: T.string
  }

  getDefaultProps(): FlowNodeShape['props'] {
    return {
      w: 280,
      h: 180,
      kind: 'note',
      title: 'Новая нода',
      body: '',
      model: '',
      history: '[]',
      contextTokens: 0,
      answerId: '',
      sourceId: '',
      extra: '{}'
    }
  }

  override canEdit() {
    return true
  }
  override canResize() {
    return true
  }

  getGeometry(shape: FlowNodeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override onResize(shape: FlowNodeShape, info: TLResizeInfo<FlowNodeShape>) {
    return resizeBox(shape, info)
  }

  component(shape: FlowNodeShape) {
    const editor = this.editor
    const isEditing = editor.getEditingShapeId() === shape.id
    // Слайд рисуется по-особому (без стандартной шапки ноды)
    if (shape.props.kind === 'slide') {
      return <SlideCard shape={shape} editor={editor} />
    }
    return <NodeView shape={shape} editor={editor} isEditing={isEditing} />
  }

  indicator(shape: FlowNodeShape) {
    return <rect width={shape.props.w} height={shape.props.h} rx={10} />
  }
}
