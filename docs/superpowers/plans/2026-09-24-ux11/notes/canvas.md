# Волна 1 · Холст — карта кода для плана реализации (гибрид A+B)

Только чтение. Рабочее дерево `/Users/ermolov/Desktop/PPM/plane-fork` принято за истину (волна 0 не закоммичена; HEAD
plane-fork = `53988697a8`, большая часть ppm-canvas — незакоммиченные файлы). Номера строк — по рабочему дереву на
2026-09-24 21:2x. Контрольные суммы (sha256, первые 12):

| файл | строк | sha256 |
|---|---|---|
| `apps/web/core/components/ppm-canvas/editor.tsx` | 3565 | 7c9908d08131 |
| `apps/web/core/components/ppm-canvas/shape.tsx` | 2600 | 5a87831511ee |
| `apps/web/core/components/ppm-canvas/workspace.tsx` | 1625 | 3f02b73ac0d1 |
| `apps/web/core/components/ppm-canvas/canvas.css` | 4990 | 1be17ab8e0ae |
| `apps/web/core/components/ppm-canvas/board-workspace-state.ts` | 160 | d29a7494b7d1 |
| `packages/ppm-canvas/src/index.ts` | 2156 | 136bdc209c3e |
| `apps/web/core/services/ppm-canvas.service.ts` | 550 | 5c334de9605a |
| `packages/ppm-brand/src/index.ts` | 1736 | dcf726038d35 |

Извлечённый текст макетов (структура + aria): `…/wave1/map/_A-Canvas.txt`, `…/wave1/map/_B-Canvas.txt`.
H-* артбордов на момент карты нет.

---

## 0. Базовая линия тестов (снята 2026-09-24 21:11, ничего не менялось)

```bash
cd packages/ppm-canvas && ./node_modules/.bin/vitest run          # 2 files, 38 tests — PASS (177 ms)
cd packages/ppm-canvas && node scripts/audit-browser-boundary.mjs # "browser boundary audit passed (3 isolated roots)"
cd apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas tests/canvas tests/ppm-a11y  # 16 files, 96 tests — PASS
```
(`timeout` в zsh отсутствует — запускать без него.) Полный скрипт пакета: `pnpm --filter @ppm/canvas test`
(= vitest + audit). **Важно:** `apps/web` берёт `@ppm/canvas` из `packages/ppm-canvas/dist` (`package.json` →
`main: ./dist/index.mjs`; dist собран 12:11:06, совпадает с src). Любая правка `packages/ppm-canvas/src/index.ts`
требует `pnpm --filter @ppm/canvas build` (tsdown), иначе web увидит старые типы/функции.

Гварды, которые затронет редизайн (все зелёные сейчас):
- `apps/web/tests/ppm-a11y/min-font-size.test.ts` — в `canvas.css` все `font-size: Xrem` ≥ 0.6875rem; в tsx ppm-* нет
  `text-9/10`, `text-[<11px]`.
- `apps/web/tests/ppm-canvas/rail.test.ts` — `CANVAS_RAIL_COLLAPSE_QUERY === "(max-width: 1279px)"`; `.ppm-canvas-rail__label`,
  `.ppm-canvas-board-panel__list > small`, `.ppm-canvas-workspace__status` ≥ 0.6875rem.
- `apps/web/tests/ppm-canvas/canvas-css.test.ts` — `.ppm-canvas-shell` фон `var(--bg-surface-1)`; шрифты
  `--ppm-font-sans/--ppm-font-mono`; tldraw `--color-primary/selected/selection-stroke: var(--border-accent-strong)`;
  `isolation: isolate` у workspace; нет `.ppm-canvas-topbar`.
- `apps/web/tests/ppm-a11y/on-color-usage.test.ts` — `--txt-on-color` не на акцентной заливке в canvas.css.
- `apps/web/tests/ppm-canvas/sync-status.test.ts` — `isBlockingCanvasStatus`, `shouldShowTabSyncDot`, `footerRoleLabelKey`.
- `packages/ppm-canvas/scripts/audit-browser-boundary.mjs` — в `apps/web/core/components/ppm-canvas/**` запрещены импорты
  `fs/path/node:*`, `@tldraw/sync`, маркеры `window.flow`, `ipcRenderer`… (новые файлы слоя связей — только браузерные).

E2E-якоря, которые редизайн НЕ должен ломать (Playwright, `apps/web/e2e/`):

| где | якорь |
|---|---|
| `ppm-demo.spec.ts:148` | `getByText("Все изменения сохранены", { exact: true }).toBeVisible()` — точный текст статуса «сохранено» |
| `ppm-demo.spec.ts:165-176` | `.ppm-canvas-node--note input.ppm-canvas-node__title`; `.ppm-work-item-card` c текстом задачи; кнопка `"Нарисовать визуальную связь"` exact; drag стрелкой от правого края заметки (x+w-4) к левому краю карточки (x+4) |
| `ppm-demo.spec.ts:296-318` | textbox `"Новая заметка"` (aria-label инпута заголовка заметки!), textbox `"Напишите заметку в Markdown…"`, кнопка `"Добавить задачу"` exact, **`workItemCard.getByLabel("Статус")` → `<select>` состояния прямо на карточке**, `selectOption` |
| `ppm-demo.spec.ts:409` | `[data-ppm-canvas-node-kind="vault_file_ref"]` на HTMLContainer |
| `ppm-demo.spec.ts:523-529` | `.ppm-work-item-card` → button `"Убрать с холста"` exact |
| `ppm-demo.spec.ts:578` | `getByText("Холст только для чтения", { exact: true })` — ровно одно совпадение |
| `ppm-canvas-performance.spec.ts:229-240, 284-291` | `…editor[data-active] input[type="file"]` всегда в DOM; `[role="dialog"]` предпросмотра импорта — единственный dialog в editor, первая кнопка = подтверждение |
| `ppm-canvas-performance.spec.ts:303-305` | ровно один `.ppm-canvas-status__notice` c `data-status="saved"` в активном редакторе |
| `ppm-canvas-performance.spec.ts:323-324` | кнопки `/Приблизить|Zoom in/` и `/Отдалить|Zoom out/` — **уникальные** по имени на странице |
| `ppm-canvas-collaboration.spec.ts` (много) | `/Добавить заметку ⇧N|Add note ⇧N/`; `.ppm-canvas-status__notice[data-status=conflict|error]`; `.ppm-canvas-shell[data-ppm-canvas-mode]`; `.ppm-canvas-presence[data-status]`; tablist `/Открытые доски холста/`; `"Закрыть вкладку доски"`; `.ppm-canvas-workspace` без `data-rail-expanded` на узком экране |

Семантических связей e2e не покрывает вообще (только unit-схема в `canvas-node.test.ts:1340`).

---

## 1. Смысловые связи: модель, текущий UI, отрисовка на холсте

### 1.1 Модель данных (не меняется)

- Типы: `packages/ppm-canvas/src/index.ts:52-63` `PPM_CANVAS_SEMANTIC_RELATION_TYPES` =
  `relates_to, depends_on, blocks, explains, implements, evidence_for, contradicts, derived_from, result_of`.
- Схема ответа: `index.ts:865-880` `ppmCanvasSemanticEdgeSchema` — `edge_id, board_id, from_shape_id, to_shape_id
  ("shape:…"), relation_type, label|null, confidence|null, origin (user|agent|import), confirmation_status
  (proposed|confirmed|rejected), confirmed_by/at, created_by/at, updated_at`; `:882-888` list/mutation.
- Запросы: `index.ts:1036-1050` (`TPpmCanvasSemanticEdgeCreateRequest`, `…PatchRequest`).
- Web-сервис: `apps/web/core/services/ppm-canvas.service.ts:401-452` (`getSemanticEdges/createSemanticEdge/
  updateSemanticEdge/deleteSemanticEdge`, пути `…/canvas/boards/{board}/semantic-edges/[{edge}/]`).
- API: `apps/api/plane/ppm_canvas/urls.py:104-111`; `views.py:661-783` (GET отдаёт **все**, включая `rejected`;
  PATCH подтверждения только из `proposed`, иначе 409 `CANVAS_EDGE_ALREADY_REVIEWED`); `serializers.py:87-136`
  (`from≠to`; `origin=agent` → `proposed`, иначе `confirmed`); `services.py:1994-2050` `create_semantic_edge`:
  идемпотентность по `client_operation_id` и **обе фигуры обязаны существовать в текущей СОХРАНЁННОЙ версии доски**
  (`canvas_snapshot_shape_ids(current.snapshot_json)`, иначе 409 `CANVAS_EDGE_SHAPE_NOT_FOUND`).
- Модель: `models.py:302-351` `PpmCanvasSemanticEdge`, уникальность `(board, from_shape_id, to_shape_id, relation_type)`,
  `ordering=("created_at","id")`, индексы по from/to shape. Дублирование доски копирует связи (`services.py:~1819`,
  тест `tests/contract/ppm_canvas/test_multiboard_api.py:284`).
- Связи **не** в tldraw-снимке, **нет** realtime-рассылки (в `realtime.py/consumers.py` про edges ничего);
  редактор перечитывает их только при инициализации (`editor.tsx:657-661`) и после чужого сохранения доски
  (`editor.tsx:884-888`). Экспорт доски (`index.ts:2020-2055`) связи не включает. Удаление фигуры оставляет
  «осиротевшую» связь (сервер её не чистит) — слой должен молча пропускать связи без фигур.
- Поиск «Найти в проекте» использует связи как граф ранжирования (`brain-panel.tsx:2818` «Поднято смысловой связью»).
- Точные места API: список `views.py:675` (`board.semantic_edges.all()`), 409 `CANVAS_EDGE_ALREADY_REVIEWED`
  `views.py:736`, DELETE `views.py:761`; `serialize_semantic_edge services.py:1975`, `create_semantic_edge :1994`,
  409 `CANVAS_EDGE_SHAPE_NOT_FOUND :2026`; копирование при дублировании `services.py:1819`.

### 1.2 Текущий UI — только список

- Состояние в `PpmCanvasEditor`: `editor.tsx:268` `semanticEdges`; открыт/закрыт `:252-253`
  (`semanticPanelOpen`, `semanticPanelFocusRef`, вынесено из overlay из-за ремоунта — см. 1.5).
- Мутации: `createSemanticEdge :1911-1924` (origin "user", `client_operation_id: crypto.randomUUID()`),
  `deleteSemanticEdge :1926-1932`, `reviewSemanticEdge :1934-1942`; открыть/закрыть `:1950-1961`.
- Панель: `SemanticEdgesPanel editor.tsx:3073-3300` (класс `.ppm-semantic-edges`, CSS `canvas.css:4129-4292`,
  абсолютно слева сверху z 330): форма «Исходный/Целевой объект» (`<select>` по всем нодам, префилл из 2 выделенных
  `:3102-3123`), «Тип связи», «Уточнение», «Создать связь»; список «Сохранённые связи» с «Подтвердить/Отклонить»
  для `proposed` и «Удалить». Подписи типов — `SEMANTIC_RELATION_LABELS :3061-3071` → ключи
  `canvas.semantic_relation_*` (`packages/ppm-brand/src/index.ts:1363-1371` ru).
- Монтаж: внутри `CanvasControls` (`:2687-2699`), т.е. внутри tldraw `InFrontOfTheCanvas`.
- Вход: команда `semantic-edges` (`editor.tsx:2428-2430`), кнопка рейки `workspace.tsx:926-932`, палитра
  `workspace.tsx:619-624`. **Читатель (гость/read-only) связи не видит вовсе:** кнопка рейки внутри
  `capabilities.edit` и `disabled={!activeBoardEditReady}`, палитра добавляет команду только при edit-ready,
  `runCanvasCommand` (`workspace.tsx:319-323`) пропускает в read-only лишь `select/fit-view/zoom-in/zoom-out`.
  В minimal-режиме (`PPM_ANTYFLOW_SHELL_ENABLED=0`) входа в панель нет совсем.
- Ловушки текстов: `canvas.semantic_edges_proposed` = «Предложение ИИ — требуется подтверждение» (в 1.0 «ИИ» в UI
  запрещено брифом); `evidence_for` = «Подтверждает», а бриф/макеты говорят «Основание для».

### 1.3 Как рисовать на холсте в tldraw 3.15.6 — варианты

Проверено по исходникам `node_modules/.pnpm/@tldraw+editor@3.15.6…/src/lib/components/default-components/DefaultCanvas.tsx`:

```
.tl-canvas
  <svg.tl-svg-context><defs>…
  .tl-html-layer.tl-shapes  (transform: scale(z) translate(x+offset,y+offset); z-index var(--layer-canvas-shapes)=300)
     <OnTheCanvasWrapper/>      ← слот components.OnTheCanvas, ДО фигур
     SelectionBackground, фигуры (.tl-shape с z-index = rendering index)
  .tl-overlays (pointer-events:none, z 500) > .tl-html-layer (тот же transform)
     …ShapeIndicators, SelectionForeground, Handles, <OverlaysWrapper/> (.tl-custom-overlays.tl-overlays__item, pointer-events:none)
<InFrontOfTheCanvasWrapper/>    ← экранные координаты, НЕ трансформируется камерой
```

| вариант | плюсы | минусы |
|---|---|---|
| **A. Своя tldraw-фигура `ppm-semantic-edge` (ShapeUtil)** | tldraw сам делает hit-test, выделение, culling | Связи хранятся в БД отдельно от снимка → фигуры попадут в `getSnapshot().document` и сохранятся в версию доски (двойной источник истины), будут участвовать в undo/копировании/удалении, `store.listen(source:"user")` запустит автосохранение. **Не подходит.** |
| **B. `InFrontOfTheCanvas` + `pageToViewport`** | над всем, просто позиционировать | перерисовка на каждый кадр pan/zoom (`useValue(getCamera)`); надо повторить tldraw-сдвиг `offset` (DefaultCanvas.tsx: `modulate(z,…)`), линии поверх карточек; и главное — **этот слот уже занят `CanvasControls` через inline-функцию в memo → ремоунт при каждом изменении deps** |
| **C. `components.OnTheCanvas` (рекомендую)** | уже внутри трансформируемого слоя → рисуем в **page-координатах**, при pan/zoom React не работает вообще (двигается CSS transform); линии под карточками (у `.tl-shape` положительный z-index); выравнивание с DOM фигур гарантировано | чипы тоже масштабируются с камерой (как и карточки) — нужен LOD; чип может перекрыться карточкой, стоящей на середине отрезка; линии под полупрозрачным фоном group/frame будут приглушены (в v2 секции прозрачные — см. 2.4) |

Вариант «C + чипы в `Overlays`» (линии под, чипы над карточками) возможен (тот же transform, `pointer-events:none`
у обёртки, `all` у чипов), но чипы будут закрывать края близко стоящих карточек — оставить на потом.

### 1.4 Предлагаемая архитектура (C)

Новые файлы (браузерные, без node-импортов — audit):

1. `apps/web/core/components/ppm-canvas/semantic-edge-geometry.ts` — чистые функции без tldraw/React
   (тестируются в node-vitest):
   ```ts
   export type TPpmBox = { x: number; y: number; w: number; h: number };
   export type TPpmEdgeEnd = "arrow" | "bar" | "none";
   export type TPpmEdgeStyle = { end: TPpmEdgeEnd; startDot: boolean; dash: "solid" | "dashed"; tone: "neutral" | "danger" };
   export const SEMANTIC_EDGE_STYLE: Record<TPpmCanvasSemanticRelationType, TPpmEdgeStyle> = {
     relates_to:   { end: "none",  startDot: false, dash: "solid",  tone: "neutral" },
     depends_on:   { end: "arrow", startDot: false, dash: "solid",  tone: "neutral" },
     blocks:       { end: "bar",   startDot: false, dash: "solid",  tone: "danger"  }, // ⊣, единственный красный
     explains:     { end: "arrow", startDot: false, dash: "solid",  tone: "neutral" },
     implements:   { end: "arrow", startDot: false, dash: "solid",  tone: "neutral" },
     evidence_for: { end: "arrow", startDot: true,  dash: "solid",  tone: "neutral" }, // как B: точка-«порт» + стрелка
     contradicts:  { end: "none",  startDot: false, dash: "dashed", tone: "neutral" }, // пунктир, симметрично
     derived_from: { end: "arrow", startDot: false, dash: "solid",  tone: "neutral" },
     result_of:    { end: "arrow", startDot: false, dash: "solid",  tone: "neutral" },
   };
   // Отрезок центр→центр, обрезанный границами прямоугольников (+4px зазор); null, если прямоугольники пересекаются.
   export function buildSemanticEdgeGeometry(from: TPpmBox, to: TPpmBox, relation): null | {
     line: string;            // "M x1 y1 L x2 y2"
     head: string | null;     // треугольник 9×8 (arrow) или перпендикуляр ±6 (bar) у конца `to`
     startDot: { x: number; y: number } | null;
     mid: { x: number; y: number }; angle: number; length: number;
   };
   export function shouldShowEdgeLabel(length: number, zoom: number, chipWidth = 96) // LOD: zoom ≥ 0.5 && length ≥ chip+16
   ```
   Наконечники рисовать явными `<path>` (как в макетах), не `<marker>`: цвет через `currentColor`/CSS-класс,
   без зависимости от `fill="context-stroke"`. Маршрут в волне 1 — прямой отрезок; ортогональная «ступенька» из A
   (`M…H…Q…V…`) — отдельная итерация.

2. `apps/web/core/components/ppm-canvas/semantic-edges-layer.tsx`:
   ```tsx
   import { createContext, memo, useContext } from "react";
   import { SVGContainer, stopEventPropagation, useEditor, useValue, type TLShapeId } from "tldraw";
   export type TPpmSemanticLayerValue = {
     edges: readonly TPpmCanvasSemanticEdge[];
     enabled: boolean;                   // true только в workspace-режиме (см. §5)
     focusedEdgeId?: string;
     onOpenEdge: (edgeId: string) => void;
   };
   export const PpmSemanticEdgesContext = createContext<TPpmSemanticLayerValue>({ edges: [], enabled: false, onOpenEdge: () => undefined });

   // Стабильная ссылка на модульный компонент → в components memo НЕ ремоунтится (в отличие от InFrontOfTheCanvas).
   export function PpmSemanticEdgesLayer() {
     const { edges, enabled } = useContext(PpmSemanticEdgesContext);
     const editor = useEditor();
     const zoomBucket = useValue("ppm edge lod", () => (editor.getZoomLevel() >= 0.5 ? 1 : 0), [editor]); // ререндер только на пороге
     const selected = useValue("ppm edge selection", () => editor.getSelectedShapeIds(), [editor]);
     if (!enabled) return null;
     const visible = edges.filter((e) => e.confirmation_status !== "rejected");
     return (
       <div className="ppm-semantic-layer" aria-hidden="true">
         <SVGContainer className="ppm-semantic-layer__lines">
           {visible.map((e) => <SemanticEdgePath edge={e} key={e.edge_id} highlighted={selected.includes(e.from_shape_id as TLShapeId) || selected.includes(e.to_shape_id as TLShapeId)} />)}
         </SVGContainer>
         {zoomBucket === 1 && visible.map((e) => <SemanticEdgeChip edge={e} key={e.edge_id} />)}
       </div>
     );
   }
   const SemanticEdgePath = memo(function SemanticEdgePath({ edge, highlighted }) {
     const editor = useEditor();
     const g = useValue(`ppm edge ${edge.edge_id}`, () => {           // подписка только на bounds двух фигур
       const a = editor.getShapePageBounds(edge.from_shape_id as TLShapeId);
       const b = editor.getShapePageBounds(edge.to_shape_id as TLShapeId);
       return a && b ? buildSemanticEdgeGeometry(a, b, edge.relation_type) : null;
     }, [editor, edge.from_shape_id, edge.to_shape_id, edge.relation_type]);
     if (!g) return null;                                              // осиротевшая/перекрытая связь
     return <g className="ppm-semantic-edge" data-relation={edge.relation_type} data-confirmation={edge.confirmation_status} data-highlighted={highlighted || undefined}>…</g>;
   });
   // Чип: HTML в page-координатах (absolute; left/top = mid − половина ширины), pointer-only (см. 1.6).
   ```

3. `editor.tsx` (минимальный diff):
   - импорт `PpmSemanticEdgesContext, PpmSemanticEdgesLayer`;
   - новое состояние рядом с `:252` — `const [focusedEdgeId, setFocusedEdgeId] = useState<string>()` (в
     `PpmCanvasEditor`, НЕ в `CanvasControls` — ремоунт, см. wave-0 notes §2.4);
   - в `components` memo (`:1963-2021`) добавить **`OnTheCanvas: PpmSemanticEdgesLayer,`** (ссылка модульная,
     deps не меняются);
   - `semanticLayerValue = useMemo(() => ({ edges: semanticEdges, enabled: statusPlacement === "footer",
     focusedEdgeId, onOpenEdge: (id) => { setFocusedEdgeId(id); openSemanticPanel(); } }), […])` и
     `<PpmSemanticEdgesContext.Provider value={semanticLayerValue}>` вокруг `<Tldraw>` (`:2121-2132`, рядом с
     `PpmWorkItemProjectionContext.Provider`; контексты доходят до компонентов внутри холста — так уже работают карточки);
   - `SemanticEdgesPanel` (`:3073`) получает `focusedEdgeId` → `<li data-focused>` + `scrollIntoView({block:"nearest"})`;
   - (связанное, но отдельным шагом) показывать панель-список и читателю: в `workspace.tsx:321` добавить
     `"semantic-edges"` в read-only allowlist; кнопку рейки `:926-932` вынести из `capabilities.edit` без `disabled`
     для читателя (панель уже поддерживает `canEdit=false`, `:3192`).
   - (опционально) перечитывать связи на `window` focus/раз в 30 с, как `WorkItemsViewNode` (`shape.tsx:1399-1408`),
     раз realtime для связей нет.

4. `canvas.css` (новый блок; все размеры ≥ 0.6875rem):
   ```css
   .ppm-semantic-layer { position:absolute; inset:0; pointer-events:none; }
   .ppm-semantic-edge { color: var(--ppm-edge-stroke, var(--border-strong)); }         /* ≥3:1 к фону холста */
   .ppm-semantic-edge path { fill:none; stroke:currentColor; stroke-width:1.5; }
   .ppm-semantic-edge .ppm-semantic-edge__head { fill:currentColor; stroke:none; }      /* bar: stroke, не fill */
   .ppm-semantic-edge[data-relation="blocks"] { color: var(--txt-danger-primary); }
   .ppm-semantic-edge[data-relation="contradicts"] path:first-child { stroke-dasharray: 6 4; }
   .ppm-semantic-edge[data-confirmation="proposed"] { opacity:.7; } … path:first-child { stroke-dasharray: 2 3; }
   .ppm-semantic-edge[data-highlighted] { color: var(--border-accent-strong); }         /* blocks остаётся красным */
   .ppm-semantic-chip { position:absolute; pointer-events:all; height:1.25rem; padding:0 .375rem; border:1px solid var(--border-subtle-1);
     border-radius:.25rem; background:var(--bg-surface-1); color:var(--txt-secondary); font-size:.6875rem; white-space:nowrap; transform:translate(-50%,-50%); }
   .ppm-semantic-chip[data-relation="blocks"] { border-color: var(--txt-danger-primary); color: var(--txt-danger-primary); }
   ```
   Токены `--ppm-edge-*` лучше завести в `packages/ppm-brand/src/tokens.css` (агент токенов), здесь — только
   fallback на существующие роли.

### 1.5 Производительность (сотни фигур/связей)

- Pan/zoom: 0 React-работы (CSS transform слоя), кроме одного `useValue` порога LOD (ререндер только при пересечении
  0.5). Сравнить: вариант B дал бы O(E) ререндер на каждый кадр.
- Перетаскивание фигуры: пересчитываются только `SemanticEdgePath`, чьи `useValue` читали bounds этой фигуры
  (`getShapePageBounds` — кэшированный computed tldraw). E=300 → единицы `<path>` на кадр.
- Изменение списка связей (create/delete/review, редко): ререндер слоя O(E).
- Выделение: одна подписка на `getSelectedShapeIds()` на слой (ререндер слоя при смене выделения; при E в сотни — ок;
  если станет узко — перенести `highlighted` в `useValue` внутри каждой связи).
- Нет culling: пути за экраном браузер почти не стоит; при необходимости — `editor.getCulledShapes()` (есть в 3.15.6,
  `@tldraw/editor dist-cjs/index.d.ts:2665`), но это подписка на камеру.
- Слой монтируется в каждом открытом редакторе (до 8 вкладок, `MAX_OPEN_CANVAS_BOARDS`), скрытые вкладки
  `visibility:hidden` — пересчёт идёт только при изменении их фигур (фоновые доски не редактируются).
- e2e-бюджет `ppm-canvas-performance.spec.ts` (300 фигур, переключение 5 вкладок, zoom/pan) слой не должен заметно
  менять; добавить в этот spec проверку «доска с N связями открывается/переключается в прежнем бюджете» — опционально.

### 1.6 Hit-test и доступность чипов

- `.tl-canvas` не задаёт `pointer-events`, поэтому элементы `OnTheCanvas` по умолчанию ловят указатель; обёртку
  слоя — `pointer-events:none`, чип — `all`. React-события чипа всплывают к `onPointerDown` холста
  (`useCanvasEvents` вешается на `.tl-canvas`) → в обработчике чипа `stopEventPropagation(e)` (экспорт tldraw,
  `index.d.ts:5790`), иначе tldraw начнёт brush/выделение. Колесо над чипом по-прежнему панорамирует (gesture на холсте).
- Клик по чипу → `onOpenEdge(edge_id)` → открыть «Смысловые связи» со строкой в фокусе. Удаление/подтверждение —
  только в панели/инспекторе (там есть права и подтверждения).
- Клавиатура: чипы — pointer-only (`aria-hidden` слой, без tabIndex). Фокусируемые кнопки внутри `.tl-canvas`
  опасны: tldraw-шорткаты (Delete и т.п.) сработают по выделенным фигурам. Доступный путь к тем же данным —
  панель-список (`.ppm-semantic-edges`, уже клавиатурная, Esc закрывает `:3176-3181`) и список «Связи на холсте»
  в инспекторе (§4.3).
- Чип под карточкой (середина отрезка под фигурой) не кликается — ожидаемо; при `length < ширина чипа + 16`
  чип не рисуем (`shouldShowEdgeLabel`), тип всё равно читается по концу линии.

### 1.7 Визуальные стрелки tldraw ≠ смысловые связи

Инструмент «Нарисовать визуальную связь» (`draw-connection` → `editor.setCurrentTool("arrow")`, `editor.tsx:2425-2427`)
создаёт tldraw-`arrow` в снимке (e2e `drawConnection`). Бриф: «визуальные стрелки — тоньше и нейтральнее». У
tldraw-стрелок цвет/штрих задаются стилями tldraw (`--color-*` в `.ppm-canvas-shell .tl-container`,
`canvas.css:2698-2708`); оркестраторские стрелки создаются с `color:"violet", dash:"draw"` (`shape.tsx:1177-1194`).
Минимально: не трогать; различие обеспечивает чип + наконечник смысловых связей.

---

## 2. Грамматика карточек

### 2.1 Анатомия сейчас (`shape.tsx`)

Общий корень: `PpmCanvasNodeCard :223-244` → `<HTMLContainer className="ppm-canvas-node ppm-canvas-node--{kind}
ppm-canvas-node--{color}" data-ppm-canvas-node-kind={kind}>` (`:237-240`). Цвет — `COLOR_CLASS :91-96` по
`node.visual.color` (yellow/cyan/green/violet) → сплошной фон-«бумажка» (`canvas.css:3338-3352`, токены
`--ppm-canvas-node-*` `:2679-2696`; dark — `color-mix(--ppm-node-note|project|decision|task 18%, --bg-surface-2)`).
Рамка/радиус/тень — `.ppm-canvas-node :3313-3322` (radius .75rem = совпадает с `indicator()` `rx=12`,
`shape.tsx:201-203`). Маршрутизация по kind — `NodeEditor :246-518`.

| семейство | kind | компонент (строки) | корень | шапка | тело | низ | данные |
|---|---|---|---|---|---|---|---|
| своё | note, document, group, frame | `NativeNodeCard :534-675` | `.ppm-canvas-node__native` | `.ppm-canvas-node__chrome :550-586`: UPPERCASE подпись kind (`NATIVE_NODE_LABELS :520-532` → «Новая заметка», «Новая группа»…) + Свернуть/Дублировать/Удалить | `<input.ppm-canvas-node__title aria-label=«Новая заметка»>` `:587-596` + `<textarea.ppm-canvas-node__body>` `:599-623` | — | node JSON в `props.node` |
| своё | checklist, table, code, board_link | то же, `ChecklistEditor :677-766`, `TableEditor :768-892` | то же | то же | редакторы | — | то же |
| своё (живые данные) | work_items_view | `WorkItemsViewNode :1351-~1956` | `.ppm-work-items-view` | своя шапка с фильтрами | канбан/список/бэклог (`onLoadView`, опрос 30 с + focus `:1399-1408`) | экспорт | `PpmWorkItemProjectionContext` |
| своё | diagram, deck | `DiagramNode :2384-2451`, `DeckNode :2453-2531` | `.ppm-canvas-diagram/deck` | kind + title | mermaid-превью / слайд | навигация | node |
| живая | work_item_ref | `WorkItemProjectionCard :2022-2175` | `.ppm-work-item-card` (`canvas.css:4294-4435`) | идентификатор (как kind) + заголовок + бейдж **«PPM»** `:2064` | `__fields :2068-2146`: `<select aria-label="Статус">`, «Приоритет», `<input type=date>` «Срок», `<select multiple>` исполнители | «Открыть источник» + «Убрать с холста» `:2154-2172` | `bindingsByShapeId.get(shape.id).source` (`TPpmWorkItemProjection`, `index.ts:685-709`), `options` |
| живая | page_ref, attachment_ref, vault_file_ref(+binding) | `ContentProjectionCard :2177-2248` | `.ppm-canvas-node__content.--vault` (**CSS для `--vault`, `__vault-title/meta/link` отсутствует** — `grep vault canvas.css` = 0) | kind-подпись (`CONTENT_SOURCE_LABELS :2565-2569` → «Page», «Материал Vault», «Вложение задачи») + title | excerpt | «Открыть …» + «Убрать с холста» | `TPpmCanvasContentBinding.source` (`index.ts:722-756`: title, excerpt, extension, mime, size, preview_url, source_status) |
| живая | pdf, image, reference | `MediaProjectionCard :2250-2382` | `.ppm-canvas-media` | kind + title + «PDF · 2,4 МБ · vN» | ленивое превью (`useLazyPreview :2533-2551`) | Открыть / Заменить файл / Убрать | то же |
| живая | git_ref | `GitReferenceCard :1271-1349` | `.ppm-canvas-node__content--vault` + `data-git-object` | «Запрос на слияние (PR)» + title | «GITHUB · repo», «Связанная задача: ROBOT-12» | «Открыть в Git», «Убрать с холста» | `TPpmCanvasGitBinding.source` (`index.ts:758-803`: provider, repository_name, ref, state, author_name, base/head_ref, commit_sha, work_items[]) |
| живая (legacy) | vault_file_ref без binding | inline `:264-283` | `.ppm-canvas-node__content--vault` | «Материал Vault» | «EXT · версия N» | ссылка | node |
| найденное | search | inline `:287-320` | `.ppm-agent-node--search` (только общий `.ppm-agent-node`, спец-CSS нет) | «Поиск по проекту» + title | `<p>{query}</p>`, «Найденные источники · N», до 5 ссылок «n. title ↗» | чипы-meta: режим, «Контекст · N / Весь проект», «Ограниченный режим», запуск | `node.results[]` (`index.ts:352-362`: title, excerpt ≤10k, source_type work_item/vault_file/git_code, source_version, source_url, locator, score) |
| ИИ (скрыто флагом) | orchestrator, orchtask, orchcall, agent_query, agent_answer | inline `:322-515` | `.ppm-agent-node--*` | … | … | … | рендер сохраняется для старых досок |

### 2.2 Целевая грамматика гибрида и что поменять

**Общее правило «не ломать»:** все классы-якоря (`.ppm-canvas-node--{kind}`, `data-ppm-canvas-node-kind`,
`.ppm-work-item-card`, `input.ppm-canvas-node__title`, `aria-label` инпутов и селектов, тексты
«Убрать с холста», «Нарисовать визуальную связь») сохраняются; новое — дополнительными элементами/классами.
Новые стили — под `.ppm-canvas-shell[data-ppm-canvas-grammar="v2"]` (атрибут ставит editor при
`statusPlacement==="footer"`, `editor.tsx:2115-2120`), чтобы minimal-режим (`PPM_ANTYFLOW_SHELL_ENABLED=0`) остался
визуально прежним (см. §5).

**Свои (заметка/документ/секция/решение)** — «тихий графит»:
- Фон нейтральный (`var(--bg-layer-1)`/`--bg-surface-1`), граница `--border-subtle`, без «бумажных» заливок;
  `visual.color` НЕ удалять из данных — показывать приглушённо: цвет глифа типа/тонкая метка
  (`--ppm-node-accent: var(--ppm-node-note|project|decision|task)` на `.ppm-canvas-node--{color}`).
- Шапка `.ppm-canvas-node__chrome` (`shape.tsx:550-586`): добавить глиф типа (те же lucide, что в рейке:
  StickyNote/FileText/ListChecks/Table2/Code2/Group/Frame/Link/Columns3/Workflow/Presentation) и подпись в
  sentence case — **новые ключи** `canvas.kind_note` «Заметка», `canvas.kind_document` «Документ»,
  `canvas.kind_section` «Секция», … (сейчас в шапке «НОВАЯ ЗАМЕТКА» из `canvas.note_title`). **`aria-label`
  инпута заголовка оставить `ppmT(NATIVE_NODE_LABELS[kind])`** — e2e ищет textbox «Новая заметка».
  CSS: снять `text-transform:uppercase; letter-spacing` у `.ppm-canvas-node__chrome > span` (`canvas.css:3397-3406`)
  и у `.ppm-canvas-node__kind` (`:3443-3450`) в v2; кнопки шапки показывать на `:hover`, `:focus-within`,
  у выбранной фигуры.
- Заголовок: 2 строки → сужение `font-stretch` → многоточие (правка судьи). CSS: `display:-webkit-box;
  -webkit-line-clamp:2` + контейнерный запрос по ширине карточки `@container (max-width: 17rem) { font-stretch: 87.5% }`.
  **Ось wdth не загружена:** `apps/web/app/root.tsx:38` импортирует `@fontsource-variable/ibm-plex-sans` (= только
  wght). Нужен `@fontsource-variable/ibm-plex-sans/wdth.css` (то же имя семейства «IBM Plex Sans Variable»,
  `font-stretch: 75% 100%`, есть cyrillic/cyrillic-ext) — это правка агента шрифтов/токенов, холст от неё зависит.
- Низ (опционально): `updated_at` относительным временем (`formatPpmTimeAgo`, `@/helpers/ppm-time-ago.helper`).
  Имя автора: в ноде только `author_id` (uuid/"legacy"/"unknown"), резолва участников в canvas-компонентах нет —
  либо контекст-резолвер из workspace (`useMember`), либо не показывать.

**Живые карточки источников:**
- Общий компонент шапки `LiveSourceHeader` (новый, в `shape.tsx` или `live-card.tsx`), используется в
  `WorkItemProjectionCard`, `ContentProjectionCard`, `MediaProjectionCard`, `GitReferenceCard`:
  `[глиф источника] [источник: ppmT("project.tasks"|"project.knowledge"|"project.collaborative_pages"|"project.code")]
  [моно-идентификатор: identity.identifier | "PDF" | "PR #48"] … [LiveGlyph]`.
  Ключи источников уже есть: `project.tasks` «Задачи», `project.knowledge` «Хранилище»,
  `project.collaborative_pages` «Документы», `project.code` «Код» (`packages/ppm-brand/src/index.ts:971-978`).
  Бейдж «PPM» (`shape.tsx:2064`, `.ppm-work-item-card__source` зелёная пилюля `canvas.css:4324-4334`) → заменить на
  имя источника. Бриф запрещает в UI «Page», «Vault», «проекция» — сейчас это в `canvas.page` «Page»,
  `canvas.vault_file` «Материал Vault», `canvas.open_vault` «Открыть в Vault», `canvas.open_page` «Открыть Page»,
  `canvas.file_drop_uploading` «…живую проекцию…», `canvas.remove_projection_error` «Проекция не удалена…».
- `LiveGlyph` — инлайн-SVG «три узла» (как знак PPM; геометрия из макета A: `<path d="M3.75 3.75 12.25 8 5.25 12.25"
  stroke-width=1.5/><circle cx=3.75 cy=3.75 r=2/><circle cx=12.25 cy=8 r=2/><circle cx=5.25 cy=12.25 r=2/>`,
  viewBox 0 0 16 16, цвет `--txt-accent-primary`), `role="img" aria-label="Живая карточка"`,
  `title="Живая карточка: данные берутся из источника"` (новые ключи).
- Заголовок 14/20 semibold, 2 строки.
- Метаданные задачи одной строкой: `StateGroupIcon` (`@plane/propel/icons`, `packages/propel/src/icons/state/
  state-group-icon.tsx:26`, `stateGroup = display.state.group` как `TStateGroups` с fallback) + имя статуса,
  `PriorityIcon` (`@plane/propel/icons`), аватар/имя исполнителя, срок. **Селект «Статус» обязан остаться на
  карточке** (e2e `getByLabel("Статус")` + `selectOption`) — стилизовать как тихий «чип-селект» (`appearance:none`,
  глиф слева). Приоритет/срок — так же. Мультиселект исполнителей (`<select multiple>` 2.5rem) в v2 заменить
  аватаром+именем, а редактирование исполнителей перенести в инспектор (§4.3); в minimal-режиме (без инспектора)
  оставить как есть — развилка по контексту грамматики (`PpmCanvasGrammarContext`), либо оставить мультиселект и в
  v2 (проще, некрасиво) — **решить в плане**.
- Низ: `«Открыть ↗»` = `<a href={identity.source_url} aria-label="Открыть ROBOT-12 в Задачах">` (новый ключ с
  подстановкой; e2e на «Открыть источник» в карточке не завязаны); «Убрать с холста» можно сделать иконкой, но
  **accessible name ровно «Убрать с холста»** (`aria-label`) — e2e `exact:true`.
- Производные от связей признаки (реальные данные, не выдумка): «Ждёт ROBOT-12» — входящая confirmed `blocks`
  от другой work_item-карточки на доске; счётчик связей. Источник — тот же `PpmSemanticEdgesContext`.
- Чего в проекции НЕТ (в макетах есть): спринт, направление, число комментариев, «#48 2/3» у задачи (PR-связь
  есть только у git-проекции: `display.work_items[]`). Не показывать, если не на доске.
- CSS для контентных/git-карточек писать с нуля (сейчас их классы без правил).

**Найденное поиском (`search`)** — пунктирная карточка:
- v2 CSS: `.ppm-canvas-node--search { border-style: dashed; background: color-mix(in srgb, var(--bg-surface-1) 70%, transparent); }`.
- Шапка: глиф поиска + «Найдено поиском» + запрос в «ёлочках» (сейчас «Поиск по проекту» + title + `<p>{query}</p>`).
- **Фрагмент**: `results[0].excerpt` как `<blockquote>` (clamp 5 строк); для `source_type==="git_code"` — моно,
  нумерация с `locator.line_start`.
- **Чип-цитата** для каждого результата: `[n] {title} · {локатор} · v{версия}` → `<a href={source_url}>`.
  Форматтер локатора уже есть, но приватный: `brain-panel.tsx:2972-2984` `formatLocator` (identifier → «Задача X»,
  page → «path, страница N», git_code → «path, строки a–b · sha»). Вынести в
  `apps/web/core/components/ppm-canvas/citation-format.ts` и переиспользовать в панели и карточке.
  Версия Хранилища: `source_version = "{N}:{content_hash}"` (`apps/api/plane/ppm_brain/adapters.py:217, 244`,
  `load_vault_file_metadata :206` / `load_vault_file :223`) → «v{N}»; у кода — `"{commit_sha}:{content_hash}"`
  (`adapters.py:275, 321`) → короткий sha.
- **Состояние «изменился … · сравнить»**: честно вычислимо только для результатов, у которых на ЭТОЙ доске есть живая
  карточка того же источника: `bindingsByShapeId` c `entity_id === result.source_id` и
  `binding.source_version` (для vault — часть до «:») ≠ версии в результате → `data-stale` + «изменился после поиска ·
  открыть» (ссылка на источник; диффа версий в продукте нет — есть только список версий Хранилища
  `ppm-vault.service.ts:269 getVersions`). Формулировку «после решения» из макета без модели решения не получить.
- Ограничения данных (не выдумывать): **CSV не индексируется** (`adapters.py:206-215, 223-240`: только Markdown и PDF;
  иначе `SOURCE_TYPE_NOT_INDEXABLE`) → «строки 14–22 CSV»-таблица из макета B/брифа недостижима; «[1] Решение» как
  результат поиска тоже невозможен (источники поиска: `work_item | vault_file | git_code`,
  `ppm_brain/models.py:7-10`). Из PDF — «страница N», из кода — «строки a–b», из md — путь (+ word_start/end).

### 2.3 «Решение» (срезанный угол + «принято») — в модели его нет

`PPM_CANVAS_NODE_KINDS` (`index.ts:6-32`) не содержит `decision`; «решение» в продукте есть только как запись
памяти проекта (`ppm_brain/models.py:46-51` `PpmProjectMemoryKind.DECISION`, с `freshness_status`
«Возможно устарело»), но создаётся она только из ИИ-ответа (`brain-panel.tsx:1162-1181`, режим full) — в 1.0
недоступно. Варианты для холста:

| | A. `note` + вариант (рекомендую) | B. новый kind `decision` |
|---|---|---|
| данные | в `ppmCanvasNoteSchema` (`index.ts:94-99`, уже `.passthrough()`) добавить optional `variant: z.enum(["note","decision"])`, `decision_status: z.enum(["proposed","accepted"])` | новая схема + union `:616-642` + `PPM_CANVAS_OWNED_NODE_KINDS` + `PPM_CANVAS_NODE_REGISTRY` + `createPpmCanvasNode` + `migrateLegacyNode` + `NATIVE_NODE_LABELS` (typed Record — компилятор заставит) |
| совместимость | старый код/экспорт/дубликат видят обычную заметку (`updatePpmCanvasNode`/`duplicatePpmCanvasNode` спредят поля, `index.ts:1947-1987`) | старые вкладки покажут fallback «неизвестный объект» (данные не теряются: `parseAndMigrate` → `unknown`, `:1915`) |
| бэкенд | не валидирует kinds (`ppm_canvas/schema.py` — только размер/структура) | то же |
| тесты | +1 кейс в `canvas-node.test.ts` | правка «creates every browser-safe native node type» `:864-906` |

UI решения (оба варианта): команда `add-decision` (`commands.ts:12-43` + `workspace.tsx` рейка/палитра +
`editor.tsx` switch `:2376`), шапка «Решение · принято» (переключатель `decision_status`), «Основание» —
**производное от связей**: входящие confirmed `evidence_for` (from → решение) с заголовками/версиями исходных
карточек; «Из задачи ROBOT-7» — связь `derived_from/result_of` с work_item-карточкой. Срезанный угол:
`.ppm-canvas-node[data-variant="decision"] { clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%) }`
+ диагональ `::after` (clip-path срезает border и тень). `indicator()` (`shape.tsx:201-203`) для решения вернуть
`<path>` со срезом, иначе контур выделения не совпадёт. Stale у оснований (P2): при «принято» сохранить в ноде
`decision_evidence: [{shape_id, entity_id, source_version}]` и сравнивать с текущими `bindingsByShapeId`.

### 2.4 Секции (group/frame): угловые засечки + «N объектов»

- CSS сейчас: `.ppm-canvas-node--group :3324-3329` (2px dashed, фон cyan .72), `--frame :3331-3336` (2px solid, фон .4).
  Линии связей (`OnTheCanvas`, под фигурами) под полупрозрачным фоном секции будут приглушены → в v2 фон секции
  прозрачный/≤3 %.
- Засечки: `::before` на `.ppm-canvas-node--frame, --group` (`inset:0; pointer-events:none;`) с 8 слоями
  `linear-gradient` по углам (12×1.5 px), цвет `--border-strong`. Внутри карточки, т.к. `.ppm-canvas-node{overflow:hidden}` (`:3316`).
  Проверить в тёмной теме (JUDGE).
- «Захват и сортировка · 4 объекта»: число детей — `useValue(() => editor.getSortedChildIdsForParent(shape.id).length)`
  (API есть в 3.15.6, `index.d.ts:2893`; дети у group/frame разрешены `canReceiveNewChildrenOfType :189-195`).
  Новый ключ с плюрализацией («объект/объекта/объектов»).

### 2.5 Прочее по карточкам

- Радиус: если v2 уходит на 8px, `indicator()` c `rx=12` рассинхронится; `indicator` — метод ShapeUtil без
  React-контекста. Проще держать карточки на 12px (`--ppm-radius-lg`) либо рисовать индикатор с `rx` из
  модульной константы для обоих режимов.
- ⚠ Проверить вживую (статически не нашёл механизма): tldraw ставит `.tl-html-container { pointer-events: none }`
  (tldraw.css:1172-1177), это наследуется всеми контролами карточек; `canvas.css` для `.ppm-canvas-node` ничего не
  переопределяет. `.tl-shape` получает `all` только когда что-то выделено/редактируется (`tldraw/tldraw.css:837-847`;
  `tldraw` реэкспортирует весь `@tldraw/editor` — `dist-esm/index.mjs:21`, поэтому `SVGContainer`,
  `stopEventPropagation`, `useValue` импортируются из `"tldraw"`, как в `editor.tsx:32-44`). Если мышью контролы
  карточек сейчас не нажимаются — это существующее поведение, и тогда инспектор (§4.3, обычный DOM вне tldraw)
  становится основным местом правок. Для чипов связей `pointer-events:all` ставить явно.
- ⚠ Шорткаты tldraw по умолчанию, вероятно, активны (UI tldraw смонтирован, скрыты только компоненты
  `HIDDEN_TLDRAW_UI editor.tsx:172-197`, `overrides/tools` не заданы): V/H/D/A/N/F/T… Буквенные подсказки макетов
  («Решение D/В», «Заметка N/Т») конфликтуют с дефолтами tldraw (D=draw, N=sticky). Не добавлять буквенные
  шорткаты без `overrides`.

---

## 3. Строка статуса «Лист N из M · Версия V · Сохранено · 12:41 · 100 %»

Сейчас: `workspace.tsx:1060-1066`
```tsx
<footer className="ppm-canvas-workspace__status">
  <span><SyncDot status={syncByBoardId[activeBoardId]} />{ppmT(activeStatusKey)}</span>
  {activeRoleKey && <span>{ppmT(activeRoleKey)}</span>}
</footer>
```
(`activeStatusKey/activeRoleKey :701-703`, `syncStatusLabel :1562-1573`, `footerRoleLabelKey`
`board-workspace-state.ts:130-137`; CSS `canvas.css:2142-2186`, строка грида 1.75rem `:8`). Только в workspace
(`statusPlacement="footer"`, `workspace.tsx:1051`); minimal-режим показывает карточку статуса (`editor.tsx:2701-2731`).

| часть | где есть сейчас | чего не хватает |
|---|---|---|
| Лист N из M | `workspace.tsx:308` `activeBoards` (active, отсортированы `compareBoards`): `index = activeBoards.findIndex(b => b.board_id === activeBoardId) + 1`, `total = activeBoards.length` | ничего |
| Версия V | в editor только **ref** `versionRef` (`editor.tsx:273`), присваивается в 6 местах: `:423` (save), `:621` (сброс), `:644` (init), `:864` (refresh), `:1457` (merge), `:1597` (restore). `board.version` из списка досок (`index.ts:840`) устаревает после первого автосохранения (список не перечитывается) | поднять наверх: helper `commitBoardVersion(version, savedAt)` вместо 6 присваиваний + проп `onBoardMetaChange?(boardId, {version, savedAt})` |
| Сохранено | `syncByBoardId` (`workspace.tsx:139`, из `onSyncStatusChange`, `editor.tsx:939-941`) | ничего; **текст** — см. ниже |
| 12:41 | `response.saved_at` (`index.ts:976`) в `flushSave` **отбрасывается** (`editor.tsx:422-423`); `remoteCanvas.saved_at` (`index.ts:937`, nullable) тоже не хранится | тот же `commitBoardVersion(…, savedAt)`; формат `Intl.DateTimeFormat(locale,{hour:"2-digit",minute:"2-digit"})` |
| 100 % | нигде; zoom только командами `editor.tsx:2437-2447` | ребёнок `<Tldraw>` (как `PpmCanvasRealtimeCursors :2169-2215`, НЕ в `CanvasControls`): `useValue("ppm zoom", () => Math.round(editor.getZoomLevel()*100), [editor])` + `useEffect → onZoomChange?(boardId, zoom)`; округление гасит дребезг при pinch |

Минимальный diff:
- `editor.tsx` props (`:136-154`): `onBoardMetaChange?`, `onZoomChange?`; `commitBoardVersion` (обновляет ref и
  зовёт колбэк; в init/refresh — `remoteCanvas.saved_at`, в save/merge — `response.saved_at`, в restore —
  `current.saved_at`, сброс `:621` → `{version:0, savedAt:null}`); `<PpmCanvasViewportReporter boardId onZoomChange/>`
  внутри `<Tldraw>` рядом с курсорами (`:2129`).
- `commands.ts:12-43` — `"zoom-reset"`; `editor.tsx` switch — `editor.resetZoom()` (есть, `index.d.ts:1973`);
  `workspace.tsx:321` — добавить `"zoom-reset"` в read-only allowlist.
- `workspace.tsx`: `metaByBoardId`, `zoomByBoardId` (как `syncByBoardId`, с guard «не менять, если равно»);
  футер из отдельных `<span>` (разделитель «·» через CSS `::before`), чтобы точные текстовые якоря остались
  отдельными элементами:
  ```tsx
  <footer className="ppm-canvas-workspace__status">
    <span className="ppm-canvas-statusline">
      <span>{t("canvas.status_sheet", {index, total})}</span>                  {/* «Лист 2 из 3» */}
      {meta?.version ? <span>{t("canvas.status_version", {version})}</span> : null} {/* Версия 0 не показывать */}
      <span><SyncDot status={status} />{ppmT(activeStatusKey)}</span>          {/* текст — якорь e2e */}
      {status === "saved" && meta?.savedAt && <time dateTime={meta.savedAt}>{formatClock(meta.savedAt)}</time>}
      <button type="button" className="ppm-canvas-statusline__zoom"
        aria-label={t("canvas.zoom_reset_label", {zoom})}                      /* «Масштаб 100 %, сбросить» — НЕ «Приблизить» */
        onClick={() => runCanvasCommand("zoom-reset")}>{zoom}&nbsp;%</button>
    </span>
    {activeRoleKey && <span>{ppmT(activeRoleKey)}</span>}
  </footer>
  ```
  Чистый форматтер частей — в `board-workspace-state.ts` (`formatCanvasStatusParts({index,total,version,status,
  savedAt,zoom,canEdit})`) + тест.
- Текст «Сохранено» vs e2e: макет хочет «Сохранено», а `ppm-demo.spec.ts:148` ждёт точный «Все изменения
  сохранены» (`canvas.sync_saved`, ru `packages/ppm-brand/src/index.ts:1209`). Варианты: оставить текст ключа;
  или новый ключ `canvas.status_saved_short` «Сохранено» только для футера + правка e2e на
  `/^(Все изменения сохранены|Сохранено)$/`. `canvas.sync_saved` не трогать (им пользуется карточка minimal-режима).
- `aria-live` у футера НЕ ставить (zoom заспамит); озвучка статуса уже идёт через скрытый
  `.ppm-canvas-status__notice` в editor (`:2734-2739`, e2e-якорь — оставить ровно один).
- Кнопки «Приблизить/Отдалить» в футер **не добавлять** — дубли имени сломают `ppm-canvas-performance.spec.ts:323-324`
  (они в рейке `workspace.tsx:956-967`). Undo/redo в футер — тоже дубли имён рейки (`:933-946`), не нужно.
- (опц.) «Выделено: 1 из 10»: `selectionByBoardId[activeBoardId].length` уже есть (`workspace.tsx:158`); общее
  число нод — только в `CanvasControls` (`nodes`, `:2332-2339`) → ещё один колбэк; не обязательно.
- Узкие экраны: `@media (max-width:680px)` — оставить только статус и масштаб.

---

## 4. Рейка, вкладки, пилюля, инспектор

### 4.1 Что уже есть (волна 0)

- Рейка `workspace.tsx:802-1020` (`.ppm-canvas-rail`, CSS `canvas.css:1965-2118`): бренд-кнопка сворачивания,
  разделы «Навигация» (Холст pressed по `toolByBoardId`, Доски), «Узлы» (заметка ⇧N, документ, чек-лист, таблица,
  код, группа ⇧G, рамка, ссылка на доску, задача ⇧T, вид задач, схема, презентация, «Нарисовать визуальную
  связь» pressed=arrow, «Смысловые связи», отменить, повторить), «Вид» (показать всё, приблизить, отдалить) +
  выравнивание. Свёрнута < 1280 px (`CANVAS_RAIL_COLLAPSE_QUERY`, `board-workspace-state.ts:8`), оверлей < 980 px
  (`canvas.css:4867-4915`). Гибрид («свёрнута до ~1280, развёрнута на 1440») уже выполнен → волна 1 = рестайл по
  токенам/плотности (`min-height: 2.375rem` → `--ppm-row-height` 36/32).
- Вкладки `workspace.tsx:721-764` (tablist «Открытые доски холста», точка статуса только для проблем), «+»
  `:765-775`, палитра `:776-788`, присутствие `:789`, «Найти в проекте» `:790-799` (в режиме search подпись
  `project_search.title` = «Найти в проекте»). Всё, что просит бриф, на месте → рестайл.
- Пилюля «Доска · Объектов: N» — `editor.tsx:2764-2798` (`.ppm-canvas-board-info`, `canvas.css:3180-3219`),
  в общем верхнем оверлее с баннером блокирующих состояний (`:2741-2799`, `canvas.css:3128-3170`); скрыта < 720 px.
- Ни в workspace, ни в editor **инспектора нет**. Выделение уходит наверх только ради «Найти в проекте»
  (`onSelectionChange` → `selectionByBoardId`, `workspace.tsx:335-343`, `:1102`).

### 4.2 Возможная контекстная панель выделения (A: «Открыть источник · Связать · В секцию · Ещё»)

Новая сущность; в волне 1 необязательна. Минимум: «Связать» = `semantic-edges` c префиллом (панель уже берёт пару из
выделения `:3102-3123`); «Открыть источник» = ссылка из проекции. Если делать — только как ребёнок `<Tldraw>` или
`OnTheCanvas`/`Overlays`, не в `InFrontOfTheCanvas`-memo.

### 4.3 Минимальный инспектор на существующих данных

Место: новый компонент `apps/web/core/components/ppm-canvas/canvas-inspector.tsx`, монтируется в `PpmCanvasEditor`
**сиблингом `<Tldraw>` внутри `.ppm-canvas-shell`** (`editor.tsx:2114-2166`, рядом с `FileDropDialog`) — не в
`CanvasControls` (ремоунт) и не в workspace (данные — bindings/edges/options/колбэки — живут в editor; подъём
состояния = большой diff). Только при `statusPlacement === "footer"`.

```tsx
const inspectedShapeId = useValue("ppm inspected shape", () => {
  const only = editor?.getOnlySelectedShape();                 // index.d.ts:1626
  return only?.type === PPM_CANVAS_SHAPE_TYPE ? only.id : undefined;
}, [editor]);
…
{statusPlacement === "footer" && editor && inspectedShapeId && (
  <CanvasInspector
    editor={editor} shapeId={inspectedShapeId}
    binding={bindingsByShapeId.get(inspectedShapeId)} options={workItemOptions}
    canEdit={effectiveCanEdit} pending={pendingWorkItemIds}
    edges={semanticEdges}
    onUpdateWorkItem={updateWorkItemProjection}                // тот же путь, что у карточки (projectionContext.onUpdate)
    onRemove={removeProjection} onOpenEdges={openSemanticPanel}
    onClose={() => editor.selectNone()}
  />
)}
```

Данные, которые реально есть:
- Задача (`TPpmWorkItemProjection`, `index.ts:685-709`): идентификатор, заголовок, `source_url`, статус
  (`state{name,group,color}`), приоритет, исполнители (`display_name`, `avatar_url`), срок (`due_date` → «через 3 дня»
  `Intl.RelativeTimeFormat("ru")`), `source_status`, `capabilities.update/editable_fields`, `source_version`;
  опции правки `workItemOptions` (states/priorities/assignees). Правка — `updateWorkItemProjection(shapeId, binding,
  patch)` (как у карточки). **Нет:** спринт, направление, комментарии, PR (PR — только если на доске есть git-карточка
  с `display.work_items` ∋ эта задача).
- Документ/файл/вложение (`index.ts:722-745`): title, excerpt, extension, mime, size, preview_url, версия, статус.
- Git (`index.ts:758-792`): provider, repository_name, object_type, ref, state, author_name, base/head_ref,
  commit_sha, work_items[] → «Скопировать имя ветки» (`navigator.clipboard.writeText(head_ref)`).
- Своя нода: kind, title, `created_at/updated_at`; для секции — число детей.
- «Связи на холсте · N»: `edges.filter(e => (e.from_shape_id===id || e.to_shape_id===id) && e.confirmation_status!=="rejected")`
  → строки «→ Блокирует · ROBOT-15 …» / «← Реализует · PR #48 …» (заголовок другой ноды — как `titleByShapeId`
  `editor.tsx:3108-3117`), клик → `focusShape(editor, otherId)` (`:3550-3553`); кнопка «Все связи» → панель.
- Подпись: вместо макетного «Правки вносятся в Задачах…» (в PPM правка на холсте идёт прямо в задачу) —
  «Изменения сохраняются в источнике. Карточка на холсте обновится сама.»

Размещение/слои: `position:absolute; top:3.5rem; right:.75rem; bottom:.75rem; width:min(20rem,40%)` (под пилюлей
«Доска»), z 320 (между status 315 и picker 325; шкала `canvas.css`: 310…360 внутри `.ppm-canvas-workspace__content`
z 1). «Мозг/Найти в проекте» (`.ppm-brain-panel` z 620, `canvas.css:240-254`) его перекрывает — ок. Скрыть < 980 px.
Esc — закрыть (снять выделение). `role="complementary"` + `aria-label="Инспектор выделенного"`, **не `dialog`**
(единственный dialog в editor — предпросмотр импорта, e2e). Колоночный вариант A (сужает холст) — через портал в
узел, который даёт workspace (`createPortal(…, inspectorHost)`), дороже; не для волны 1.

---

## 5. Флаги и откат

- `PPM_BRAND_ENABLED=0` или `PPM_SHELL_ENABLED=0` → холст недоступен вовсе: `route.tsx:39-43`
  (`isPpmCanvasEnabled` требует shell, shell требует brand; `index.ts:2066-2070`) → редирект на Задачи. Всё из этой
  карты живёт за этим гейтом автоматически (canvas.css импортируется только `editor.tsx:134`).
- `PPM_ANTYFLOW_SHELL_ENABLED=0` → `PpmMinimalCanvasWorkspace` (`minimal-workspace.tsx`), тот же `editor.tsx` +
  `shape.tsx`, `statusPlacement` по умолчанию `"card"`. Чтобы этот откат оставался «как до волны 1»:
  `enabled` слоя связей, инспектор, meta/zoom-колбэки и атрибут `data-ppm-canvas-grammar="v2"` включать только при
  `statusPlacement==="footer"`; новые CSS-правила карточек — только под этим атрибутом (старые правила не удалять).
- `PPM_PROJECT_ASK_ENABLED` (по умолчанию выкл, `index.ts:2078-2081`): ИИ-ноды не создаются, но старые рендерятся —
  не трогать их разметку; `proposed`-связи от агентов в 1.0 новыми не появятся, у старых — нейтральный чип
  «Предложено» (новый ключ), без «ИИ».

---

## 6. Тесты и команды для плана

Запуск (разрешено, ничего не собирает):
```bash
cd packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs
cd apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas tests/canvas tests/ppm-a11y
pnpm --filter @ppm/canvas build        # ТОЛЬКО если меняется packages/ppm-canvas/src (вариант решения, §2.3)
npx tsc --noEmit (в apps/web)           # сверка с baseline-манифестом M0.6 по правилам репозитория
```
Новые unit-тесты (node-окружение, без tldraw/DOM):
- `apps/web/tests/ppm-canvas/semantic-edge-geometry.test.ts` — обрезка по рамкам, пересекающиеся рамки → null,
  наконечник по типу (blocks→bar, contradicts/relates_to→none, остальные→arrow), середина для чипа, LOD.
- `…/semantic-edge-style.test.ts` — `SEMANTIC_EDGE_STYLE` покрывает все `PPM_CANVAS_SEMANTIC_RELATION_TYPES`;
  `tone:"danger"` только у `blocks`; `dashed` только у `contradicts`.
- `…/status-line.test.ts` — `formatCanvasStatusParts`: «Лист 2 из 3», нет «Версия 0», saving/error/read-only,
  `100 %` с неразрывным пробелом.
- `…/citation-format.test.ts` — перенесённый `formatLocator` (identifier/page/git lines/path), «v2» из «2:hash»,
  stale-правило.
- `canvas-css.test.ts` += `.ppm-semantic-layer{pointer-events:none}`, `.ppm-semantic-chip{pointer-events:all}`,
  `contradicts` → `stroke-dasharray`, v2-правила только под `[data-ppm-canvas-grammar="v2"]`; min-font гард уже есть.
- (вариант A решения) `canvas-node.test.ts` — нота с `variant:"decision"` валидна, переживает update/duplicate/export.
E2E: при смене текста «сохранено» — правка `ppm-demo.spec.ts:148`; ручные проверки — связи у гостя (read-only),
создание связи сразу после новой карточки (409 до автосохранения), перетаскивание 300-фигурной доски со связями,
minimal-режим `PPM_ANTYFLOW_SHELL_ENABLED=0` без визуальных изменений.

---

## 7. Риски (кратко)

1. Ремоунт overlay: всё новое состояние — в `PpmCanvasEditor`; `OnTheCanvas` — модульный компонент + контекст.
2. 409 `CANVAS_EDGE_SHAPE_NOT_FOUND`: связь к только что добавленной карточке падает до автосохранения — в панели
   перед созданием вызвать `flushSave()` или показать понятную ошибку (сейчас общее «Не удалось изменить…»).
3. Нет realtime для связей: коллеги увидят новую связь только после чужого сохранения доски/перезагрузки.
4. Чипы масштабируются камерой: при zoom < 1 текст < 11 px → LOD (скрывать < 0.5), тип читается по концу линии.
5. Линии под секциями с заливкой приглушаются → в v2 секции прозрачные.
6. Карточки: pointer-events контролов (§2.5) — проверить вживую до решения, что остаётся на карточке.
7. e2e-якоря §0 (особенно «Статус» на карточке, «Убрать с холста», «Новая заметка», точный текст «Все изменения
   сохранены», уникальность «Приблизить/Отдалить», один `.ppm-canvas-status__notice`, единственный `dialog`).
8. Шрифт: без `ibm-plex-sans/wdth.css` сужение заголовков не работает.
9. Словарь: «Page», «Vault», «проекция», «ИИ» ещё в ключах холста.
10. Экспорт доски не несёт связи (существующее поведение; не обещать в UI).

## 8. Открытые вопросы владельцу/плану

1. «Решение»: вариант `note`+`variant` (A) или новый kind (B)? Нужен ли статус «принято» и снимок версий оснований?
2. Подписи связей: `evidence_for` «Подтверждает» → «Основание для» (бриф)? `result_of` «Результат» → «Результат
   для»? `derived_from` «Происходит из»?
3. Состояние цитаты: «изменился после поиска · открыть» (честно) вместо «после решения · сравнить» (нет модели/диффа)?
4. Минимальный режим (`PPM_ANTYFLOW_SHELL_ENABLED=0`) сохраняем визуально прежним (скоуп `data-ppm-canvas-grammar`)?
5. Инспектор: оверлей справа под пилюлей (дёшево) или колонка, сужающая холст (портал, дороже)?
6. Исполнители на карточке: убрать мультиселект в инспектор (v2) или оставить?
7. «Сохранено» в строке статуса ценой правки e2e или оставить «Все изменения сохранены»?
8. Показывать связи и панель-список читателю (сейчас недоступны)?
9. Маршрут линий: прямые (волна 1) или ортогональные с закруглениями, как в A?
10. Перечитывать связи по focus/таймеру (компенсация отсутствия realtime)?
