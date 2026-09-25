> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать облику v2 Холста панель инструментов по группам (K1), нативные стикеры, фигуры и рамки в палитре PPM,
компактную панель стилей над выделением (K2/K3), «+» для продолжения схемы со связью (K2) и закрыть регрессии второго агента,
которые относятся к панели, — не трогая облик v1 и файлы линий B и S.

**Architecture:**
- Линия R идёт после F (F1 → F2) параллельно с B и S. Задачи R1 → R2 → R3 → R4 → R5 последовательно (R3 и R4 используют
  глиф фигур и модель R1, R4 — действия R2).
- Всё новое — только при `designV2` (workspace) / `usePpmCanvasGrammarV2()` и оверлеи `grammarV2 && …` (editor, F2); CSS —
  только в `canvas-toolkit.css` под `:where(html[data-ppm-design="v2"])` (страж F2 `af21-foundation.test.ts`).
- Чистая логика (группы рейки, клавиши, набор geo, палитра → цвета tldraw, размещение «+», счётчик объектов, жирный в
  richText) — в `canvas-toolkit-model.ts` без runtime-импорта tldraw: её покрывают тесты vitest в среде `node`. Действия с
  редактором (стикер, режим ввода, цвет карточки PPM) — `canvas-toolkit-actions.ts`. Компоненты — `canvas-rail.tsx`,
  `canvas-style-toolbar.tsx`, `canvas-quick-connect.tsx`; тема tldraw — `canvas-tldraw-theme.ts`.
- `editor.tsx` линия R правит только внутри блоков `// ── AF2.1 R: … ──` … `// ── /AF2.1 R ──` (созданы F2) и в двух блоках,
  которые R5 размечает сама (`inspectorHidden`, счётчик объектов; B их не трогает — нужда §4).

**Tech Stack:** tldraw 3.15.6 (`TldrawUiContextualToolbar`, `DefaultColorThemePalette`, `NoteShapeUtil.configure`,
`FrameShapeUtil.configure`, `setStyleForSelectedShapes`, `createShape`/`createBindings`), React 18.3.1, lucide-react 0.469,
vitest 4 (env `node`), oxlint/oxfmt.

**Источники:** спецификация AF2.1 (A, B, E; рулинги R1–R3, R7, R8), `drafts/CONTRACTS.md` (§0–§2, §4), `drafts/plan-F.md`
(таблица имён — потребляется без правок), `notes/tech-notes.md` (tldraw 3.15.6), `notes/other-agent-analysis.md`
(«Регрессии»), макеты `mockups/K1-Toolbar.png`, `K2-Diagram.png`, `K3-Text-Code.png` (+ `.dc.html`: подписи, aria, цвета).
Нужды — `drafts/plan-FR-needs.md`.

| Задача | Суть | Время |
|---|---|---|
| R1 | Модель тулкита; плавающая рейка v2 по группам (K1): меню «Фигуры», «Документы и текст», «Из проекта», «Ещё», клавиши V/H/S/T/P по `e.code`, отменить/повторить, «Смысловые связи» (редактор и читатель) | ~50 мин |
| R2 | Палитра PPM для tldraw (светлая/тёмная), `NoteShapeUtil`/`FrameShapeUtil.configure`, стикер «пишешь сразу» (S), цвета карточек PPM в CSS | ~35 мин |
| R3 | Панель стилей над выделением (K2/K3): цвет, S/M/L, «Ж», форма, заливка, шрифт; цвет карточки PPM через `visual.color` | ~45 мин |
| R4 | «+» продолжения (K2): четыре «+», «Продолжить» → фигура без наложения + стрелка с привязками + ввод; перетаскивание «+» | ~45 мин |
| R5 | Регрессии: панель задач не закрывает инспектор, единый счётчик объектов, e2e-селекторы, проверка масштаба v1; нужда B по автоужатию | ~30 мин |

## Global Constraints (часть R)

- Пути — от `plane-fork/`: `PF=/Users/ermolov/Desktop/PPM/plane-fork`, `T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools`,
  `D=apps/web/core/components/ppm-canvas`.
- Коммитов нет; `git add/commit/stash/reset/checkout/clean/rebase` запрещены. Перед первой правкой/созданием файла —
  `$T/af21-pre.sh <путь от plane-fork>`.
- Владение (CONTRACTS §0 + нужда §3): R правит `workspace.tsx`, `commands.ts`, `board-workspace-state.ts`, `canvas-rail.tsx`,
  `canvas-style-toolbar.tsx`, `canvas-quick-connect.tsx`, `canvas-tldraw-theme.ts`, `canvas-toolkit.css`, **новые**
  `canvas-toolkit-model.ts`, `canvas-toolkit-actions.ts`, тесты `apps/web/tests/ppm-canvas/rail*.test.ts|toolkit*.test.ts`,
  селекторы рейки в `apps/web/e2e/*`, свой блок `// ── R` в `packages/ppm-brand/src/translations/af21-canvas.ts`;
  `editor.tsx` — только R-блоки. **Не трогать:** `shape.tsx`, `canvas.css`, `canvas-v2.css`, `canvas-rail-legacy.tsx` (F, заморожен),
  файлы B (`canvas-external-content.ts`, `canvas-content.css`, `note-markdown.tsx`, `code-block.tsx`, `file-preview.tsx`,
  `canvas-pages.ts`, сервисы) и S (`apps/api/**`).
- Вставка и перетаскивание файлов, ⌘V/⌘U — только обработчики внешнего контента линии B (`canvas-external-content.ts`);
  R своих обработчиков paste/drop/⌘U не добавляет. Команды `add-document-page` и `add-page-ref` обрабатывает слушатель B —
  R их в `CanvasControls` не обрабатывает (нужды B R1, R3).
- Облик v1 (`PPM_DESIGN_V2=0` / `localStorage.ppm_design="v1"`) не меняется: рейка v1 — `PpmCanvasLegacyRail`, оверлеи не
  монтируются, палитра tldraw в v1 — исходная (R2 восстанавливает её при `grammarV2=false`).
- Клавиши — только `e.code`, только реальные: V, H, S, T, P (без модификаторов, вне полей ввода), ⇧N, ⇧G, ⇧T (как было).
  Подсказки — «Выбор — V / М» (латиница / кириллица той же клавиши).
- Строки — только `af21-canvas.ts` (ключи из F; новые — в блок `// ── R`, en и ru, без «ИИ»); после правки —
  `$T/af21-pkg-build.sh ppm-brand` **до** правок web, которые используют ключ.
- Производительность: оверлеи — дочерние элементы `<Tldraw>` (не в `components`-memo), подписки — `useValue` с узкими
  вычислениями; ни одного `setState` на каждый кадр камеры, кроме позиции «+» (лёгкий компонент). 300 фигур без просадки.
- Без сети; dev-сервер :3000 не трогать; живую проверку делает контроллер на доске «Тест Холста» (проект 228).
- Базовая линия после F: brand 7/86 + аудиты; canvas 3/50; web 58/363 (числа web в шагах R учитывают только тесты R;
  тесты линии B, если она уже добавила свои, прибавляются к ним); web tsc 0; oxlint 719/0. Ожидаемые числа — в шагах.
- Команды: web `cd $PF/apps/web && ./node_modules/.bin/vitest run [файлы]`; tsc
  `./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/af21-R.tsbuildinfo` (при параллельной линии B
  фильтровать вывод по своим путям и перечислить чужие ошибки в отчёте); oxlint
  `../../node_modules/.bin/oxlint --max-warnings=11957 .`; формат `../../node_modules/.bin/oxfmt <свои файлы>`.

## Review Focus (часть R)

1. **v1 не задет:** при `ppm_design=v1` рейка UX1.1, нет «+»/панели стилей, стикер tldraw (N) — исходного жёлтого tldraw;
   клавиши V/H/S/T/P не перехватываются (только v2). Тест: `rail-v2.test.ts` + `af21-foundation.test.ts` F2.
2. **Клавиатура и русская раскладка:** V/H/S/T/P срабатывают по `e.code` на обеих раскладках, не срабатывают при вводе
   (поля, стикер в режиме ввода, `contenteditable`), с модификаторами и у читателя; меню рейки: Esc закрывает и возвращает
   фокус на кнопку группы, первый пункт получает фокус. Тест: `toolkit-model.test.ts` + ручная проверка.
3. **Связи:** «+» создаёт фигуру без наложения и стрелку с двумя привязками (`binding:*`, start → источник, end → новая
   фигура); у одной фигуры ≥ 4 связей; перетаскивание «+» на фигуру — привязка к ней, в пустоту — свободный конец;
   одно действие = одна точка отмены. Тест: `toolkit-model.test.ts` (геометрия) + живая проверка.
4. **Цвет у всего:** фигура, стикер, рамка — через стиль tldraw (палитра PPM в обеих темах), карточка PPM — `visual.color`
   (миграция F1); в тёмной теме стикер читается (текст ≥ 4,5:1 к заливке). Тест: `toolkit-model.test.ts` (палитра).
5. **Читатель/гость:** видит «Выбор», «Рука», «Смысловые связи» (только чтение) и «Ещё» (найти, задачи, доска); нет групп
   создания, нет «+» и панели стилей. e2e гостя проверяет отсутствие «Документы и текст».

## Имена, которые публикует R (для B и контроллера)

| Что | Имя | Где |
|---|---|---|
| Модель | `PPM_RAIL_SHORTCUTS`, `railShortcutCommand`, `railShortcutLabel`, `railShortcutKey`, `PPM_GEO_SHAPES`, `TPpmGeo`, `PPM_QUICK_CONNECT_SHAPES`, `isPpmGeo`, `geoLabelKey`, `PPM_RAIL_MENUS`, `visibleRailMenuItems`, `tldrawColorForPpm`, `ppmColorForTldraw`, `PPM_PALETTE_HEX`, `PPM_PALETTE_INK`, `paintPpmColorTheme`, `placeQuickConnectShape`, `quickConnectAnchors`, `quickConnectHandlePoints`, `isCountedCanvasShape`, `freeSpotNear` (R2), `isRichTextBold`/`setRichTextBold` (R3) | `canvas-toolkit-model.ts` |
| Действия | `createPpmSticky(editor)`, `startEditingShape(editor, id)` (R2), `ppmCardColor(shape)`, `setPpmCardColor(editor, shapes, color)` (R3) | `canvas-toolkit-actions.ts` |
| Команды | + `draw-geo` (с `detail.geo`), `open-find`, `open-board-panel` | `commands.ts` |
| Глиф | `PpmGeoGlyph({ geo })` | `canvas-rail.tsx` |
| CSS | `.ppm-canvas-toolkit*`, `.ppm-canvas-style-toolbar*`, `.ppm-canvas-quick-*`, `--ppm-palette-<цвет>-fill/-stroke`, `--ppm-card-accent` | `canvas-toolkit.css` |

---
