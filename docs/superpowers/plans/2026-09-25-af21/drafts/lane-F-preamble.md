> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить всё общее для линий R (панель и фигуры) и B (содержимое и файлы): библиотеки в `apps/web`, схему узлов
(палитра PPM, формат заметки, поля кода, фабрика карточки документа), модуль переводов со строками всех линий, облик v1
«как в конце UX1.1» и точки монтирования, в которые R и B встраиваются независимо.

**Architecture:**
- F — первой и последовательно: F1 → F2. После F2 параллельно идут R, B, S (CONTRACTS §0).
- Схема: версия `PPM_CANVAS_SCHEMA_VERSION` **остаётся 2** — её закрепил сервер (`apps/api/plane/ppm_canvas/serializers.py:44`
  `min_value=max_value=2`, `schema.py:7-8`), а ~10 фикстур `canvas-node.test.ts` ждут `status: "valid"` при `schema_version: 2`.
  Все добавления обратно совместимы: палитра — надмножество старых 4 цветов (тождественное отображение), новые поля
  заметки и кода — с `default()` zod, поэтому старые доски читаются без потерь, неизвестные поля сохраняются
  (`.passthrough()`), миграция = заполнение значений по умолчанию при чтении (закреплено тестом). Расхождение с CONTRACTS §3
  («версия повышается») и замена `slate` → `pink` (макеты K2/K3) — в `plan-FR-needs.md` §1–§2.
- Облик v1 (`PPM_DESIGN_V2=0` или `localStorage.ppm_design="v1"`) = снимок `201ab5f4` (конец UX1.1) + исправление кликов
  `.ppm-canvas-node { pointer-events: auto }`. F2 возвращает v1-ветки, которые второй агент (снимки `201ab5f4 → 2737bb5f`)
  изменил для обоих обликов; полезное из «Сохранить» (`notes/other-agent-analysis.md`) остаётся под v2.
- Точки монтирования (CONTRACTS §2): модули-заглушки с «пустым» поведением, которые R и B наполняют без правок чужих файлов;
  в `editor.tsx` — размеченные блоки `── AF2.1 R ──` / `── AF2.1 B ──`, вне которых линии `editor.tsx` не правят.

**Tech Stack:** plane-fork (React Router 7 + Vite 8, React 18.3.1, tldraw 3.15.6, MobX), `@ppm/canvas` (zod 3, tsdown),
`@ppm/brand` (tsdown), vitest 4 (env `node`, без DOM), oxlint/oxfmt, pnpm 11.3.0 через corepack (офлайн).

**Источники (обязательны):** спецификация `docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.1 — …md`
(рулинги R1–R8), `drafts/CONTRACTS.md` (§0 владение, §1 гейтинг, §2 точки монтирования, §3 схема, §4 переводы),
`notes/tech-notes.md`, `notes/other-agent-analysis.md`, макеты `mockups/K1-Toolbar.png`, `K2-Diagram.png`, `K3-Text-Code.png`,
`K4-Files-Comments.png` (+ `.dc.html`). Нужды к другим частям и к контроллеру — `drafts/plan-FR-needs.md`.

**Порядок:** F1 → F2 строго последовательно; линии R, B, S стартуют после F2.

| Задача | Суть | Время |
|---|---|---|
| F1 | katex, marked, dompurify, lowlight, highlight.js в `apps/web`; схема узлов (палитра, формат заметки, код, пункт чек-листа ↔ задача, `page_ref`); `af21-canvas.ts` (F, R; блок B — пустой) | ~40 мин |
| F2 | Облик v1 как в конце UX1.1 (рейка, команды, палитра команд, чек-лист/таблица, выбор задачи, стили); точки монтирования R и B в `editor.tsx`/`workspace.tsx`; пустые `canvas-toolkit.css`/`canvas-content.css` | ~50 мин |

## Global Constraints (часть F)

- Пути — от `plane-fork/`: `PF=/Users/ermolov/Desktop/PPM/plane-fork`, `T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools`.
- Рабочее дерево — единственный источник правды (в нём без коммитов лежат UX0.2, UX1.1 и правки второго агента).
  Никаких `git add/commit/stash/reset/checkout/clean/rebase`. Коммитов нет; снимки — контроллер (`af21-snap.sh`).
- Перед первой правкой **или созданием** любого файла: `$T/af21-pre.sh <путь от plane-fork>` (новый файл получает `.__absent__`).
- Пакеты — только `$T/af21-pkg-build.sh ppm-canvas|ppm-brand` (web читает `dist`); сборка пакета — **до** правок web, которые
  импортируют новое.
- `pnpm` нет в PATH: пакеты — `./node_modules/.bin/*`; установка зависимостей — только `corepack pnpm install --offline` из `$PF`
  (F1, один раз). После установки контроллер перезапускает Vite (:3000) — исполнитель dev-сервер не трогает и второй не запускает.
- Облик v1 = снимок `201ab5f4` + `pointer-events: auto` у `.ppm-canvas-node`. Всё новое AF2.1 — только при
  `usePpmCanvasGrammarV2()` (TSX) или под `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]` (CSS).
  Минимальный режим (`PPM_ANTYFLOW_SHELL_ENABLED=0`, `statusPlacement="card"`) не меняется.
- Горячие клавиши — только `e.code`; строки — только в `packages/ppm-brand/src/translations/af21-canvas.ts` (en **и** ru, без «ИИ»).
- Без новых сетевых запросов к внешним сервисам; библиотеки ставятся из локального store pnpm.
- Базовая линия AF2.1 (`.superpowers/sdd/2026-09-25-af21-canvas-toolkit/baseline.md`, не ухудшать): brand 6 файлов / 79 +
  оба аудита; canvas 2 / 39 + аудит, canvas tsc — ровно 1 старая ошибка TS2322 (`orchcall`/`orchtask`); i18n 18 × 3837 + overlay;
  web vitest 57 / 350; web tsc 0; oxlint 719 предупреждений / 0 ошибок; корень `npm test` 653/653.
- Команды проверок:
  - canvas: `cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs && ./node_modules/.bin/tsc --noEmit`
  - brand: `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  - web: `cd $PF/apps/web && ./node_modules/.bin/vitest run`
  - web tsc: `cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/af21-F.tsbuildinfo`
  - oxlint: `cd $PF/apps/web && ../../node_modules/.bin/oxlint --max-warnings=11957 .` → `Found 719 warnings and 0 errors.`
- Формат — только свои файлы: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt <файлы>` (в пакетах — из их каталога,
  `../../node_modules/.bin/oxfmt`). CSS oxfmt не форматирует.

## Review Focus (часть F)

1. **Старые доски.** Узлы до AF2.1 читаются `valid` без изменений данных: цвета `yellow|cyan|green|violet` те же, заметка —
   `format: "plain"` (показ как раньше), код — `theme: "auto", locked: false, wrap: false`; неизвестные поля целы; сервер
   по-прежнему принимает `schema_version: 2`. Тест: `af21-schema.test.ts` + весь `canvas-node.test.ts` без правок.
2. **v1 = конец UX1.1.** При `ppm_design=v1`: рейка UX1.1 (знак PPM, «Холст», «Доски», все пункты «Узлы» с ⇧N/⇧G/⇧T,
   «Смысловые связи», масштаб в «Вид», выравнивание), выбор задачи — снизу по центру и закрывается после добавления,
   «Ссылка на доску» работает, чек-лист/таблица — разметка UX1.1 (переключатель пункта — кнопка, это исправление кликов),
   нет кнопки «Скопировать ссылку на доску/задачу», брейкпойнт рейки 980 px. Тест: `af21-foundation.test.ts`.
3. **Полезное второго агента под v2 цело:** `pointer-events: auto`, `findFreeNodePosition`, чек-лист/таблица с удалением
   строк/столбцов и Tab, копирование ссылок на доску и задачу, `draw-*`, панель «Задачи и бэклог» (справа).
4. **Точки монтирования не меняют поведение:** до R и B v2 выглядит как UX1.1-рейка + панель задач; вставка/перетаскивание
   работают как раньше (обработчики tldraw по умолчанию, `onDropCapture` PPM); `<Tldraw>` не пересоздаётся (shapeUtils — memo,
   оверлеи — дочерние элементы `<Tldraw>`, не в `components`).
5. **Зависимости:** пять пакетов разрешены из lock/store без сети; `pnpm-lock.yaml` меняется только в `importers.apps/web`.

## Таблица имён, которые публикует F (линии R и B потребляют без правок)

| Что | Имя | Где |
|---|---|---|
| Палитра | `PPM_CANVAS_COLORS` = `neutral, yellow, orange, terracotta, pink, violet, blue, cyan, green`; `TPpmCanvasColor`; `PPM_CANVAS_LEGACY_COLORS`, `PPM_CANVAS_LEGACY_COLOR_MAP`, `normalizePpmCanvasColor(value, fallback)` | `@ppm/canvas` |
| Заметка | `PPM_CANVAS_NOTE_FORMATS` (`plain \| markdown`), `TPpmCanvasNoteFormat`; `createPpmCanvasNode({ …, noteFormat?, color? })` (по умолчанию заметка — `markdown`) | `@ppm/canvas` |
| Код | `PPM_CANVAS_CODE_THEMES` (`light \| dark \| auto`), `TPpmCanvasCodeTheme`, `PPM_CANVAS_CODE_PLAIN_LANGUAGE = "text"`; поля `theme`, `locked`, `wrap` | `@ppm/canvas` |
| Чек-лист | пункт: `work_item_id?: string \| null` (uuid), пункты `.passthrough()`; копия пункта (`duplicatePpmCanvasNode`) — без `work_item_id` | `@ppm/canvas` |
| Документ | `createPpmContentRefNode({ kind, binding, … })` → `TPpmCanvasMediaNode \| TPpmCanvasPageRefNode`: при `kind: "page_ref"` **или** `binding.entity_type === "page"` — карточка документа `page_ref` (360×240); `TPpmCanvasPageRefNode` | `@ppm/canvas` |
| Строки | `AF21_CANVAS_TRANSLATIONS`: F — `canvas.palette.*`; R — `canvas.rail.*`, `canvas.shape.*`, `canvas.style.*`, `canvas.quick.*`; блок `// ── B ──` пуст — ключи B (`canvas.note_*`, `canvas.code_*`, `canvas.page_*`, `canvas.paste_*`, `canvas.file_*`, …) добавляет линия B | `@ppm/brand` |
| Команды | восстановлены: `add-code`, `add-group`, `add-frame`, `add-board-link`, `add-work-item`, `add-work-items-view`, `add-diagram`, `add-deck`; новые: R — `add-sticky`, `select-hand`, `open-shapes`, `open-semantic-edges`; B — `add-document-page`, `add-page-ref`, `add-list`, `add-file`, `add-git` | `commands.ts` |
| Рейка | `PpmCanvasLegacyRail`, `TPpmCanvasRailProps` (F, заморожен); `PpmCanvasRail(props)` (R; по умолчанию = legacy) | `canvas-rail-legacy.tsx`, `canvas-rail.tsx` |
| Оверлеи | `PpmCanvasStyleToolbar({ canEdit })`, `PpmCanvasQuickConnect({ authorId, canEdit })` → `null` (R) | `canvas-style-toolbar.tsx`, `canvas-quick-connect.tsx` |
| Тема tldraw | `getPpmCanvasShapeUtils(grammarV2)` → `[PpmCanvasNodeShapeUtil]`, `applyPpmCanvasTldrawTheme(grammarV2)` → no-op (R) | `canvas-tldraw-theme.ts` |
| Вставка | шов `handleTldrawMount` (B-блок `editor.tsx`, `<Tldraw onMount={handleTldrawMount}>`; F2 — только `setEditor`); заглушка `registerPpmCanvasExternalContent(editor, getDeps: () => TPpmCanvasExternalContentDeps) => () => void`, `TPpmCanvasExternalContentDeps = { canEdit: boolean }` (B расширяет, B вызывает) | `canvas-external-content.ts` |
| Панель задач | `WorkItemPicker` проп `variant?: "picker" \| "panel"`; класс `ppm-work-item-picker--panel` | `editor.tsx`, `canvas.css` |
| CSS | `canvas-toolkit.css` (R), `canvas-content.css` (B) — пустые, импорт после `canvas-v2.css` | `editor.tsx` |

## Решения F (записать в CHANGELOG карточки)

| # | Вопрос | Решение |
|---|---|---|
| F-D1 | Версия схемы | Не повышается (сервер и фикстуры закрепили 2); совместимость — надмножеством палитры и `default()` |
| F-D2 | Палитра | 9 значений по K2/K3 (`pink` вместо `slate` из CONTRACTS §3) — нужда §1 |
| F-D3 | Заметки v1 | Новые заметки — `markdown` в обоих обликах (v1 показывает текст как раньше, формат не читает) |
| F-D4 | Размещение без наложений | `findFreeNodePosition` — в обоих обликах (поведение размещения, не облик) |
| F-D5 | Пустое состояние | `shapeCount === 0` (стикеры/фигуры тоже скрывают «Начните собирать карту») — в обоих обликах, это исправление |
| F-D6 | Чек-лист v1 | Разметка UX1.1, но переключатель пункта — кнопка `role="checkbox"` (tldraw перехватывает клик по нативному чекбоксу): «+ исправление кликов» |
| F-D7 | Стартовое содержимое | Чек-лист с одним пунктом и таблица 2×2 (фабрика пакета) — в обоих обликах (данные, не облик) |
| F-D8 | `?board=` | Чтение и запись параметра доски в URL — в обоих обликах (ссылка из v2 должна открываться в v1); кнопка «Скопировать ссылку на доску» — только v2 |
| F-D9 | Страница «Документов» на холсте | Привязка `entity_type "page"` всегда даёт карточку `page_ref` (в обоих обликах; раньше — `reference`): это исправление по нужде B F5 |
| F-D10 | Пункт чек-листа | `work_item_id` (uuid, необязательный) + `.passthrough()` пунктов — неизвестные поля пунктов больше не теряются (нужда B F4) |
| F-D11 | `pdfjs-dist` | Не ставится: линия B не использует (`plan-B-needs.md` F1); `highlight.js` ставится явно (в задаче F), хотя B берёт его через lowlight |

---
