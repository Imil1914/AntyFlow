# AF2.1 — Инструменты Холста: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Панель инструментов Холста по группам, стикеры, фигуры со «+» и связями, цвет у любого объекта, заметки с Markdown и формулами, блок кода, документы PPM на холсте, вставка картинок и файлы с просмотром и скачиванием; исправление регрессий после второго агента.

**Architecture:** Фаза F (библиотеки, схема узлов, переводы, облик v1 как в конце UX1.1, точки монтирования) — первой; затем параллельно линии R (панель и фигуры), B (содержимое и файлы), S (сервер) с непересекающимися файлами (`drafts/CONTRACTS.md` §0). Всё новое — под грамматикой Холста v2; облик v1 — как в конце UX1.1. Коммитов нет: исходники до правки — `2026-09-25-af21/pre/`, патч — `tools/af21-diff.sh > af21.patch`.

**Tech Stack:** React Router 7 + Vite, tldraw 3.15.6 (нативные note/geo/arrow/frame, привязки стрелок), marked + DOMPurify + KaTeX + lowlight/highlight.js (из lock/store, офлайн), Django (ppm_vault, ppm_canvas), vitest, pytest в docker-compose-test.

**Spec:** [`docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.1 — Инструменты Холста: панель по группам, стикеры, схемы, заметки, код, файлы.md`](<../../project-spec/Документация PPM/Intelligence-first/tasks/AF2.1 — Инструменты Холста: панель по группам, стикеры, схемы, заметки, код, файлы.md>)

**Материалы** (`docs/superpowers/plans/2026-09-25-af21/`): `drafts/CONTRACTS.md`, `drafts/lane-{F,R,B,S}-preamble.md`, `drafts/plan-*-needs.md`, `notes/tech-notes.md`, `notes/other-agent-analysis.md`, `mockups/K*.png|.dc.html`, `tools/af21-*.sh`.

## Решения контроллера (обязательны, 2026-09-25)
- C1: палитра карточек — 9 значений как на макетах (с «розовым», без «slate»); старые 4 значения сохраняют имена.
- C2: версия схемы узлов остаётся 2 (сервер принимает только её); новые поля обратносовместимы, значения по умолчанию при чтении.
- C3: pdfjs-dist не подключаем; PDF — через `/pdf/` без песочницы для файлов Хранилища.
- C4: формулы в редакторе «Документов» (B7) и аудио/видео (S4) — вне AF2.1.
- C5: добавить в S3 скачивание с настоящим именем файла: `vault/entries/<id>/file/?download=1` → `Content-Disposition: attachment; filename*=UTF-8''…` (спецификация — `drafts/plan-S-needs.md`).
- C6: все URL Хранилища — с UUID пространства (не slug), как в текущем API (поправка к CONTRACTS §5 от линии S).
- C7: дополнительные файлы вне CONTRACTS (canvas-toolkit-model.ts, canvas-toolkit-actions.ts, canvas-rail-legacy.tsx, af21-foundation.test.ts) — разрешены.

## Global Constraints
- Рабочее дерево — единственный источник правды; не выполнять git add/commit/stash/reset/checkout/clean; чужие изменения не трогать (параллельно может работать агент бэкенда в `apps/api/**` вне ppm_vault/ppm_canvas).
- Перед первой правкой любого файла — `docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`.
- Облик v1 — как в конце UX1.1 (+ исправление кликов); всё новое — только под грамматикой Холста v2; минимальный режим не меняется.
- Без ИИ, без новых внешних запросов (KaTeX и подсветка — локально; вставка URL не ходит в сеть); Markdown санитизируется.
- Горячие клавиши — только `e.code`; строки — в `packages/ppm-brand/src/translations/af21-canvas.ts` (en и ru, свой блок части).
- Dev-сервер :3000 не перезапускать (перезапуск Vite после установки пакетов делает контроллер).
- Базовая линия (не ухудшать): web 57 файлов / 350; brand 79 + аудиты; canvas 39 + аудит (tsc — 1 старая ошибка); web tsc 0; oxlint 719/0; root 653/653; API: ppm_vault 19, ppm_canvas 99 (docker-compose-test).

## Review Focus
1. Старые доски: открываются без потерь, старые заметки/коды/цвета отображаются как раньше, ничего не пишется без действия пользователя.
2. Облик v1 и минимальный режим — как в конце UX1.1; e2e-якоря целы.
3. Безопасность: санитизация Markdown/превью, zip-бомбы и размеры, права на страницы/файлы, никакого `data:` в новых снимках.
4. Клики и фокус: элементы внутри карточек нажимаются; оверлеи («+», панель стилей) не мешают выделению и перетаскиванию; горячие клавиши не срабатывают при вводе текста.
5. Производительность: 300 фигур, оверлеи не пересоздают холст, нет лишних перерисовок при pan/zoom.


---

## Фаза F — фундамент (последовательно, первой)

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

### Task 1 (F1): Библиотеки в `apps/web`, схема узлов AF2.1 и модуль переводов

**Files:**
- Modify: `packages/ppm-canvas/src/index.ts` — `:65-66` (палитра), `:89-94` (`ppmCanvasNoteSchema`), `:109-113`
  (`ppmCanvasChecklistItemSchema`), `:1977` (`duplicatePpmCanvasNode`, копия пункта чек-листа), `:144-153`
  (`ppmCanvasCodeSchema`), `:648` (типы, после `TPpmCanvasVaultFileRefNode`), `:1214-1228` и `:1232-1240` и `:1258-1262`
  (`createPpmCanvasNode`), `:1353-1388` (`createPpmContentRefNode`).
- Create: `packages/ppm-canvas/src/__tests__/af21-schema.test.ts`.
- Create: `packages/ppm-brand/src/translations/af21-canvas.ts`, `packages/ppm-brand/src/__tests__/af21-translations.test.ts`.
- Modify: `packages/ppm-brand/src/index.ts:2` (импорт), `:828` (спред en), `:1637` (спред ru).
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx:117-122` (`COLOR_CLASS` на 9 цветов — иначе web tsc TS2739).
- Modify: `apps/web/package.json` (раздел `dependencies`, `:21-…`), `pnpm-lock.yaml` (только через установку).

**Interfaces:**
- Consumes: `ppmCanvasPageRefSchema` (`packages/ppm-canvas/src/index.ts:231-237`), `PPM_CANVAS_NODE_REGISTRY.page_ref`
  (`:1154-1158`, cyan 360×240), `isPpmCanvasColor` (`:2149-2151`), `UX11_CANVAS_TRANSLATIONS` (порядок спредов, `index.ts:826-828, 1635-1637`).
- Produces: всё из строк «Палитра», «Заметка», «Код», «Документ», «Строки» таблицы имён; зависимости `katex@0.16.47`,
  `marked@16.4.2`, `dompurify@3.4.15`, `highlight.js` и `lowlight` (`catalog:` → 11.11.1 / 3.3.0). `pdfjs-dist` не ставится:
  линия B его не использует (`plan-B-needs.md` F1).

- [ ] **Step 1: Сохранить исходники**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools
  $T/af21-pre.sh packages/ppm-canvas/src/index.ts packages/ppm-canvas/src/__tests__/af21-schema.test.ts \
    packages/ppm-brand/src/index.ts packages/ppm-brand/src/translations/af21-canvas.ts \
    packages/ppm-brand/src/__tests__/af21-translations.test.ts apps/web/core/components/ppm-canvas/shape.tsx \
    apps/web/package.json pnpm-lock.yaml
  ```
  Ожидание: восемь строк `pre-image saved: …` (для новых файлов — `.__absent__`).

- [ ] **Step 2: Написать падающий тест схемы** — `packages/ppm-canvas/src/__tests__/af21-schema.test.ts`:
  ```ts
  // AF2.1 F1: palette colours, note format, code fields and the document (page_ref) card — all backward compatible:
  // boards saved before AF2.1 open unchanged, unknown fields survive, the board schema version stays 2 (server-pinned).
  import { describe, expect, it } from "vitest";
  import {
    PPM_CANVAS_COLORS,
    PPM_CANVAS_LEGACY_COLOR_MAP,
    PPM_CANVAS_LEGACY_COLORS,
    PPM_CANVAS_SCHEMA_VERSION,
    createPpmCanvasNode,
    createPpmContentRefNode,
    duplicatePpmCanvasNode,
    normalizePpmCanvasColor,
    parseAndMigratePpmCanvasNode,
    serializePpmCanvasNode,
    updatePpmCanvasNode,
  } from "../index";

  const NOW = "2026-09-25T12:00:00.000Z";
  const PAGE_BINDING = {
    binding_id: "7b0f5d0e-3f55-4a51-9c32-1f7f3d1a2b01",
    entity_type: "page" as const,
    entity_id: "2c1d8f41-6a0b-4d8e-8d0f-5b8f0e4f7a02",
    source_version: "2026-09-25T11:59:00Z",
  };

  function storedNote(extra: Record<string, unknown> = {}) {
    return {
      schema_version: 2,
      kind: "note",
      title: "Старая заметка",
      body: "a*b*c",
      author_id: "user-1",
      created_at: NOW,
      updated_at: NOW,
      visual: { color: "yellow", width: 320, height: 220 },
      ...extra,
    };
  }

  describe("AF2.1 canvas schema", () => {
    it("keeps the board schema version the server accepts", () => {
      expect(PPM_CANVAS_SCHEMA_VERSION).toBe(2);
    });

    it("publishes the PPM palette: neutral + 8 hues, and every legacy colour maps to itself", () => {
      expect(PPM_CANVAS_COLORS).toEqual([
        "neutral",
        "yellow",
        "orange",
        "terracotta",
        "pink",
        "violet",
        "blue",
        "cyan",
        "green",
      ]);
      for (const legacy of PPM_CANVAS_LEGACY_COLORS) {
        expect(PPM_CANVAS_LEGACY_COLOR_MAP[legacy]).toBe(legacy);
        expect(PPM_CANVAS_COLORS).toContain(legacy);
      }
    });

    it("reads a pre-AF2.1 note as valid plain text with its colour and unknown fields intact", () => {
      const result = parseAndMigratePpmCanvasNode(storedNote({ future_hint: { keep: true } }));
      expect(result.status).toBe("valid");
      if (result.status !== "valid" || result.node.kind !== "note") throw new Error("Expected a valid note.");
      expect(result.node.format).toBe("plain");
      expect(result.node.visual.color).toBe("yellow");
      expect(result.node).toMatchObject({ body: "a*b*c", future_hint: { keep: true } });
    });

    it("round-trips every palette colour and rejects a colour outside the palette", () => {
      for (const color of PPM_CANVAS_COLORS) {
        const result = parseAndMigratePpmCanvasNode(storedNote({ visual: { color, width: 320, height: 220 } }));
        expect(result.status, color).toBe("valid");
        if (result.status === "valid") expect(result.node.visual.color).toBe(color);
      }
      expect(parseAndMigratePpmCanvasNode(storedNote({ visual: { color: "red", width: 320, height: 220 } })).status).toBe(
        "corrupt"
      );
    });

    it("normalizes any stored colour to the palette", () => {
      expect(normalizePpmCanvasColor("pink", "neutral")).toBe("pink");
      expect(normalizePpmCanvasColor("red", "neutral")).toBe("neutral");
      expect(normalizePpmCanvasColor(undefined, "yellow")).toBe("yellow");
    });

    it("creates Markdown notes by default and plain notes on request, with an optional palette colour", () => {
      const markdown = createPpmCanvasNode({ authorId: "user-1", kind: "note", now: NOW, title: "Заметка" });
      const plain = createPpmCanvasNode({
        authorId: "user-1",
        color: "pink",
        kind: "note",
        noteFormat: "plain",
        now: NOW,
        title: "Заметка",
      });
      if (markdown.kind !== "note" || plain.kind !== "note") throw new Error("Expected notes.");
      expect(markdown.format).toBe("markdown");
      expect(plain.format).toBe("plain");
      expect(plain.visual.color).toBe("pink");
      expect(markdown.visual.color).toBe("yellow");
    });

    it("gives old code blocks the AF2.1 defaults and keeps new fields through an update", () => {
      const legacy = parseAndMigratePpmCanvasNode({
        schema_version: 2,
        kind: "code",
        title: "Код",
        code: "print(1)",
        language: "python",
        executable: false,
        author_id: "user-1",
        created_at: NOW,
        updated_at: NOW,
        visual: { color: "violet", width: 460, height: 340 },
      });
      if (legacy.status !== "valid" || legacy.node.kind !== "code") throw new Error("Expected a valid code block.");
      expect(legacy.node).toMatchObject({ language: "python", theme: "auto", locked: false, wrap: false });

      const created = createPpmCanvasNode({ authorId: "user-1", kind: "code", now: NOW, title: "Код" });
      if (created.kind !== "code") throw new Error("Expected code.");
      expect(created).toMatchObject({ language: "text", theme: "auto", locked: false, wrap: false, executable: false });
      const locked = updatePpmCanvasNode(created, { locked: true, theme: "dark", wrap: true }, NOW);
      expect(locked).toMatchObject({ locked: true, theme: "dark", wrap: true });
      const reread = parseAndMigratePpmCanvasNode(JSON.parse(serializePpmCanvasNode(locked)));
      expect(reread).toMatchObject({ status: "valid", node: { locked: true, theme: "dark", wrap: true } });
    });

    it("creates a document card from a page binding and refuses any other binding", () => {
      const card = createPpmContentRefNode({
        authorId: "user-1",
        binding: PAGE_BINDING,
        kind: "page_ref",
        now: NOW,
        sourceUrl: "/robot/projects/228/pages/2c1d8f41-6a0b-4d8e-8d0f-5b8f0e4f7a02",
        title: "Отчёт о калибровке",
      });
      expect(card).toMatchObject({
        schema_version: 2,
        kind: "page_ref",
        title: "Отчёт о калибровке",
        binding: PAGE_BINDING,
        visual: { color: "cyan", width: 360, height: 240 },
      });
      expect(parseAndMigratePpmCanvasNode(card).status).toBe("valid");
      expect(() =>
        createPpmContentRefNode({
          authorId: "user-1",
          binding: { ...PAGE_BINDING, entity_type: "vault_file" },
          kind: "page_ref",
          now: NOW,
          sourceUrl: "/x",
          title: "Не документ",
        })
      ).toThrow("A document card requires a page binding.");
    });

    it("makes a page binding a document card even when the caller guessed «reference» (editor.tsx contentNodeKind)", () => {
      const card = createPpmContentRefNode({
        authorId: "user-1",
        binding: PAGE_BINDING,
        extension: ".page",
        kind: "reference",
        now: NOW,
        sourceUrl: "/robot/projects/228/pages/2c1d8f41-6a0b-4d8e-8d0f-5b8f0e4f7a02",
        title: "Отчёт о калибровке",
      });
      expect(card.kind).toBe("page_ref");
      expect(card).not.toHaveProperty("extension");
    });

    it("links checklist items to tasks, keeps unknown item fields and unlinks copies", () => {
      const result = parseAndMigratePpmCanvasNode({
        schema_version: 2,
        kind: "checklist",
        title: "Список",
        items: [
          { id: "a", text: "Замер", checked: false, work_item_id: "9b2f4c1e-0d7a-4b8e-9f10-2a3b4c5d6e7f", hint: "keep" },
          { id: "b", text: "Отчёт", checked: true },
        ],
        author_id: "user-1",
        created_at: NOW,
        updated_at: NOW,
        visual: { color: "green", width: 320, height: 220 },
      });
      if (result.status !== "valid" || result.node.kind !== "checklist") throw new Error("Expected a valid checklist.");
      expect(result.node.items[0]).toMatchObject({ work_item_id: "9b2f4c1e-0d7a-4b8e-9f10-2a3b4c5d6e7f", hint: "keep" });
      expect(result.node.items[1]).not.toHaveProperty("work_item_id");
      const copy = duplicatePpmCanvasNode(result.node, "user-2", NOW);
      expect(copy.items[0]).not.toHaveProperty("work_item_id");
      expect(copy.items[0]).toMatchObject({ text: "Замер", hint: "keep" });
      expect(copy.items[0]?.id).not.toBe("a");
      expect(
        parseAndMigratePpmCanvasNode({
          ...result.node,
          items: [{ id: "c", text: "x", checked: false, work_item_id: "not-a-uuid" }],
        }).status
      ).toBe("corrupt");
    });

    it("still creates media cards through the same factory", () => {
      const image = createPpmContentRefNode({
        authorId: "user-1",
        binding: { ...PAGE_BINDING, entity_type: "vault_file" },
        extension: "png",
        kind: "image",
        now: NOW,
        sourceUrl: "/file",
        title: "Вставка.png",
      });
      expect(image).toMatchObject({ kind: "image", extension: "png", alt: "Вставка.png" });
    });
  });
  ```

- [ ] **Step 3: Убедиться, что тест падает**
  `cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run src/__tests__/af21-schema.test.ts`
  Ожидание: FAIL — `SyntaxError`/`TypeError` импорта (`PPM_CANVAS_LEGACY_COLOR_MAP`, `normalizePpmCanvasColor` не
  экспортируются); после их добавления без остальной реализации — `expected [ 'yellow', 'cyan', 'green', 'violet' ] to
  deeply equal [ 'neutral', … ]`.

- [ ] **Step 4: Реализовать схему в `packages/ppm-canvas/src/index.ts`** (проверено на копии пакета: 3 файла / 48 тестов,
  tsc — только старая TS2322).
  1. `:65-66` — было:
     ```ts
     export const PPM_CANVAS_COLORS = ["yellow", "cyan", "green", "violet"] as const;
     export type TPpmCanvasColor = (typeof PPM_CANVAS_COLORS)[number];
     ```
     стало:
     ```ts
     // AF2.1: палитра PPM — нейтральный + 8 оттенков равной светлоты, в порядке панели «Цвет» (макеты K2/K3).
     // Прежние четыре значения входят в неё без изменений, поэтому старые доски читаются как есть
     // (PPM_CANVAS_LEGACY_COLOR_MAP — тождественное отображение, закреплено тестом af21-schema.test.ts).
     export const PPM_CANVAS_COLORS = [
       "neutral",
       "yellow",
       "orange",
       "terracotta",
       "pink",
       "violet",
       "blue",
       "cyan",
       "green",
     ] as const;
     export type TPpmCanvasColor = (typeof PPM_CANVAS_COLORS)[number];
     export const PPM_CANVAS_LEGACY_COLORS = ["yellow", "cyan", "green", "violet"] as const;
     export const PPM_CANVAS_LEGACY_COLOR_MAP = {
       yellow: "yellow",
       cyan: "cyan",
       green: "green",
       violet: "violet",
     } as const satisfies Record<(typeof PPM_CANVAS_LEGACY_COLORS)[number], TPpmCanvasColor>;

     /** Any stored colour → a palette colour: palette values pass through, anything else becomes `fallback`. */
     export function normalizePpmCanvasColor(value: unknown, fallback: TPpmCanvasColor): TPpmCanvasColor {
       return isPpmCanvasColor(value) ? value : fallback;
     }
     ```
  2. `:89-94` — было:
     ```ts
     export const ppmCanvasNoteSchema = z
       .object({
         ...sharedOwnedNodeFields,
         kind: z.literal("note"),
       })
       .passthrough();
     ```
     стало:
     ```ts
     // AF2.1: заметки до AF2.1 — простой текст ("plain": показываются как раньше); новые — Markdown.
     export const PPM_CANVAS_NOTE_FORMATS = ["plain", "markdown"] as const;
     export type TPpmCanvasNoteFormat = (typeof PPM_CANVAS_NOTE_FORMATS)[number];

     export const ppmCanvasNoteSchema = z
       .object({
         ...sharedOwnedNodeFields,
         kind: z.literal("note"),
         format: z.enum(PPM_CANVAS_NOTE_FORMATS).default("plain"),
       })
       .passthrough();
     ```
  3. `:144-153` — было:
     ```ts
     export const ppmCanvasCodeSchema = z
       .object({
         ...sharedNodeFields,
         kind: z.literal("code"),
         title: z.string().max(160),
         code: z.string().max(100_000),
         language: z.string().max(64),
         executable: z.literal(false),
       })
       .passthrough();
     ```
     стало:
     ```ts
     // AF2.1: блок кода — тема подсветки, замок «только чтение», перенос строк. Язык — имя lowlight (common) или "text"
     // («Plain Text»); старые блоки получают значения по умолчанию при чтении.
     export const PPM_CANVAS_CODE_THEMES = ["light", "dark", "auto"] as const;
     export type TPpmCanvasCodeTheme = (typeof PPM_CANVAS_CODE_THEMES)[number];
     export const PPM_CANVAS_CODE_PLAIN_LANGUAGE = "text";

     export const ppmCanvasCodeSchema = z
       .object({
         ...sharedNodeFields,
         kind: z.literal("code"),
         title: z.string().max(160),
         code: z.string().max(100_000),
         language: z.string().max(64),
         executable: z.literal(false),
         theme: z.enum(PPM_CANVAS_CODE_THEMES).default("auto"),
         locked: z.boolean().default(false),
         wrap: z.boolean().default(false),
       })
       .passthrough();
     ```
  4. После строки `export type TPpmCanvasVaultFileRefNode = z.infer<typeof ppmCanvasVaultFileRefSchema>;` (`:648`) добавить:
     ```ts
     export type TPpmCanvasPageRefNode = z.infer<typeof ppmCanvasPageRefSchema>;
     ```
  5. `createPpmCanvasNode` (`:1214-1228`) — было:
     ```ts
     export function createPpmCanvasNode({
       authorId,
       body = "",
       kind,
       now = new Date().toISOString(),
       targetBoardId,
       title,
     }: {
       authorId: string;
       body?: string;
       kind: TPpmCanvasOwnedNodeKind;
       now?: string;
       targetBoardId?: string;
       title: string;
     }): TPpmCanvasOwnedNode {
     ```
     стало:
     ```ts
     export function createPpmCanvasNode({
       authorId,
       body = "",
       color,
       kind,
       noteFormat = "markdown",
       now = new Date().toISOString(),
       targetBoardId,
       title,
     }: {
       authorId: string;
       body?: string;
       /** AF2.1: a palette colour chosen at creation (sticky-like cards); the kind default otherwise. */
       color?: TPpmCanvasColor;
       kind: TPpmCanvasOwnedNodeKind;
       /** AF2.1: new notes are Markdown; pass "plain" to create a note that renders exactly like a pre-AF2.1 one. */
       noteFormat?: TPpmCanvasNoteFormat;
       now?: string;
       targetBoardId?: string;
       title: string;
     }): TPpmCanvasOwnedNode {
     ```
     и в теле (`:1237-1242`) — было:
     ```ts
         visual: {
           color: definition.defaultColor,
           width: definition.defaultWidth,
           height: definition.defaultHeight,
         },
       };
       const payload: Record<string, unknown> = { ...common };
     ```
     стало:
     ```ts
         visual: {
           color: color ?? definition.defaultColor,
           width: definition.defaultWidth,
           height: definition.defaultHeight,
         },
       };
       const payload: Record<string, unknown> = { ...common };
       if (kind === "note") payload.format = noteFormat;
     ```
     и ветка кода (`:1259-1263`) — было:
     ```ts
       if (kind === "code") {
         payload.code = body;
         payload.language = "text";
         payload.executable = false;
       }
     ```
     стало:
     ```ts
       if (kind === "code") {
         payload.code = body;
         payload.language = PPM_CANVAS_CODE_PLAIN_LANGUAGE;
         payload.executable = false;
         payload.theme = "auto";
         payload.locked = false;
         payload.wrap = false;
       }
     ```
  6. `createPpmContentRefNode` (`:1353-1370`, заголовок до `const definition = PPM_CANVAS_NODE_REGISTRY[kind];` включительно)
     — было:
     ```ts
     export function createPpmContentRefNode({
       authorId,
       binding,
       extension,
       kind,
       now = new Date().toISOString(),
       sourceUrl,
       title,
     }: {
       authorId: string;
       binding: z.input<typeof ppmCanvasContentNodeBindingSchema>;
       extension: string | null;
       kind: "pdf" | "image" | "reference";
       now?: string;
       sourceUrl: string;
       title: string;
     }): TPpmCanvasMediaNode {
       const definition = PPM_CANVAS_NODE_REGISTRY[kind];
     ```
     стало (тело прежней функции ниже `const definition …` не меняется — оно становится телом `createPpmMediaRefNode`;
     единственный вызов `editor.tsx:533-545` передаёт `kind: mediaKind` и читает только `visual`/сериализацию — тип-объединение
     результата ему подходит):
     ```ts
     type TPpmContentRefNodeInput = {
       authorId: string;
       binding: z.input<typeof ppmCanvasContentNodeBindingSchema>;
       now?: string;
       sourceUrl: string;
       title: string;
     };

     // AF2.1: a «Документы» page (entity_type "page") always becomes the document card page_ref, whatever media kind the
     // caller guessed — editor.tsx passes contentNodeKind(...) = "reference" for pages (mime text/html, extension .page).
     export function createPpmContentRefNode({
       authorId,
       binding,
       extension = null,
       kind,
       now = new Date().toISOString(),
       sourceUrl,
       title,
     }: TPpmContentRefNodeInput & {
       extension?: string | null;
       kind: "pdf" | "image" | "reference" | "page_ref";
     }): TPpmCanvasMediaNode | TPpmCanvasPageRefNode {
       if (kind === "page_ref" || binding.entity_type === "page")
         return createPpmPageRefNode({ authorId, binding, now, sourceUrl, title });
       return createPpmMediaRefNode({ authorId, binding, extension, kind, now, sourceUrl, title });
     }

     function createPpmPageRefNode({
       authorId,
       binding,
       now = new Date().toISOString(),
       sourceUrl,
       title,
     }: TPpmContentRefNodeInput): TPpmCanvasPageRefNode {
       if (binding.entity_type !== "page") throw new Error("A document card requires a page binding.");
       const definition = PPM_CANVAS_NODE_REGISTRY.page_ref;
       return ppmCanvasNodeSchema.parse({
         schema_version: PPM_CANVAS_SCHEMA_VERSION,
         kind: "page_ref",
         title,
         source_url: sourceUrl,
         binding,
         author_id: authorId,
         created_at: now,
         updated_at: now,
         visual: {
           color: definition.defaultColor,
           width: definition.defaultWidth,
           height: definition.defaultHeight,
         },
       }) as TPpmCanvasPageRefNode;
     }

     function createPpmMediaRefNode({
       authorId,
       binding,
       extension,
       kind,
       now = new Date().toISOString(),
       sourceUrl,
       title,
     }: TPpmContentRefNodeInput & { extension: string | null; kind: "pdf" | "image" | "reference" }): TPpmCanvasMediaNode {
       const definition = PPM_CANVAS_NODE_REGISTRY[kind];
     ```

  7. `ppmCanvasChecklistItemSchema` (`:109-113`) — было:
     ```ts
     export const ppmCanvasChecklistItemSchema = z.object({
       id: z.string().min(1).max(120),
       text: z.string().max(1_000),
       checked: z.boolean(),
     });
     ```
     стало:
     ```ts
     export const ppmCanvasChecklistItemSchema = z
       .object({
         id: z.string().min(1).max(120),
         text: z.string().max(1_000),
         checked: z.boolean(),
         // AF2.1: «Сделать задачами» links the item to the Plane task created from it (line B); unknown item fields survive.
         work_item_id: z.string().uuid().nullable().optional(),
       })
       .passthrough();
     ```
  8. `duplicatePpmCanvasNode` (`:1977`) — было:
     ```ts
       if (node.kind === "checklist") duplicate.items = node.items.map((item) => ({ ...item, id: createPortableId() }));
     ```
     стало:
     ```ts
       if (node.kind === "checklist")
         // A copied item is a new, unlinked item: the Plane task stays with the original.
         duplicate.items = node.items.map(({ work_item_id: _workItemId, ...item }) => ({ ...item, id: createPortableId() }));
     ```

- [ ] **Step 5: Прогнать пакет**
  `cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs && ./node_modules/.bin/tsc --noEmit`
  Ожидание: `Test Files 3 passed (3)`, `Tests 50 passed (50)` (39 + 11); аудит `PPM Canvas browser boundary audit passed
  (3 isolated roots).`; tsc — ровно одна старая ошибка `src/index.ts(1909,7): error TS2322 … "orchcall" … "orchtask"`
  (строка сместилась с 1810, текст тот же). Формат: `../../node_modules/.bin/oxfmt src/index.ts src/__tests__/af21-schema.test.ts`.

- [ ] **Step 6: Пересобрать пакет** — `$T/af21-pkg-build.sh ppm-canvas`; проверка:
  `grep -c "normalizePpmCanvasColor\|TPpmCanvasPageRefNode\|PPM_CANVAS_CODE_THEMES" $PF/packages/ppm-canvas/dist/index.d.mts` ≥ 3.

- [ ] **Step 7: Карточкам PPM — классы для всей палитры** (`apps/web/core/components/ppm-canvas/shape.tsx:117-122`) — было:
  ```ts
  const COLOR_CLASS: Record<TPpmCanvasNode["visual"]["color"], string> = {
    cyan: "ppm-canvas-node--cyan",
    green: "ppm-canvas-node--green",
    violet: "ppm-canvas-node--violet",
    yellow: "ppm-canvas-node--yellow",
  };
  ```
  стало (новые классы без правил в v1: v1 видит только старые 4 цвета; оформление палитры под v2 — линия R, R3):
  ```ts
  const COLOR_CLASS: Record<TPpmCanvasNode["visual"]["color"], string> = {
    blue: "ppm-canvas-node--blue",
    cyan: "ppm-canvas-node--cyan",
    green: "ppm-canvas-node--green",
    neutral: "ppm-canvas-node--neutral",
    orange: "ppm-canvas-node--orange",
    pink: "ppm-canvas-node--pink",
    terracotta: "ppm-canvas-node--terracotta",
    violet: "ppm-canvas-node--violet",
    yellow: "ppm-canvas-node--yellow",
  };
  ```

- [ ] **Step 8: Написать падающий тест переводов** — `packages/ppm-brand/src/__tests__/af21-translations.test.ts`:
  ```ts
  // AF2.1 F1: the canvas-toolkit strings (palette, rail, shapes, style toolbar, «+»; line B adds note/code/document/files)
  // stay in en/ru parity, never override an existing key and reach PPM_TRANSLATIONS unchanged.
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation, PPM_TRANSLATIONS } from "../index";
  import { AF21_CANVAS_TRANSLATIONS } from "../translations/af21-canvas";
  import { UX11_CANVAS_TRANSLATIONS } from "../translations/ux11-canvas";
  import { UX11_SYSTEM_TRANSLATIONS } from "../translations/ux11-system";
  import { UX11_TASKS_TRANSLATIONS } from "../translations/ux11-tasks";

  const PALETTE = ["neutral", "yellow", "orange", "terracotta", "pink", "violet", "blue", "cyan", "green"] as const;

  describe("AF2.1 canvas translations", () => {
    it("en and ru carry the same keys", () => {
      expect(Object.keys(AF21_CANVAS_TRANSLATIONS.ru).toSorted()).toEqual(
        Object.keys(AF21_CANVAS_TRANSLATIONS.en).toSorted()
      );
    });

    it("every key is a canvas.* key", () => {
      for (const key of Object.keys(AF21_CANVAS_TRANSLATIONS.en)) expect(key).toMatch(/^canvas\.[a-z0-9_]+(\.[a-z0-9_]+)?$/);
    });

    it("never shares a key with the UX1.1 modules", () => {
      const ux11 = new Set(
        [UX11_SYSTEM_TRANSLATIONS, UX11_TASKS_TRANSLATIONS, UX11_CANVAS_TRANSLATIONS].flatMap((mod) =>
          Object.keys(mod.en)
        )
      );
      for (const key of Object.keys(AF21_CANVAS_TRANSLATIONS.en)) expect(ux11.has(key), key).toBe(false);
    });

    it("reaches PPM_TRANSLATIONS unchanged in both locales", () => {
      for (const locale of ["en", "ru"] as const)
        for (const [key, value] of Object.entries(AF21_CANVAS_TRANSLATIONS[locale]))
          expect((PPM_TRANSLATIONS[locale] as Record<string, string>)[key], `${locale}:${key}`).toBe(value);
    });

    it("names every palette colour as on the K2 colour panel", () => {
      expect(PALETTE.map((color) => getPpmTranslation("ru", `canvas.palette.${color}`))).toEqual([
        "Нейтральный",
        "Жёлтый",
        "Янтарный",
        "Терракотовый",
        "Розовый",
        "Фиолетовый",
        "Синий",
        "Бирюзовый",
        "Зелёный",
      ]);
    });

    it("keeps the K1 menu wording", () => {
      expect(getPpmTranslation("ru", "canvas.rail.docs")).toBe("Документы и текст");
      expect(getPpmTranslation("ru", "canvas.rail.docs_caption")).toBe("Заметки, документы, таблицы и схемы");
      expect(getPpmTranslation("ru", "canvas.rail.project_caption")).toBe("Живые карточки: правки — в источнике");
      expect(getPpmTranslation("ru", "canvas.quick.with_link")).toBe("{shape} · сразу со связью");
    });

    it("never says «ИИ»/AI", () => {
      for (const value of Object.values(AF21_CANVAS_TRANSLATIONS.ru)) expect(value).not.toMatch(/(?<!\p{L})ИИ(?!\p{L})/u);
      for (const value of Object.values(AF21_CANVAS_TRANSLATIONS.en)) expect(value).not.toMatch(/\bAI\b/);
    });
  });
  ```

- [ ] **Step 9: Убедиться, что тест падает**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/af21-translations.test.ts`
  Ожидание: FAIL — `Failed to resolve import "../translations/af21-canvas"`.

- [ ] **Step 10: Создать модуль строк** — `packages/ppm-brand/src/translations/af21-canvas.ts` (91 ключ в каждой локали:
  палитра F и рейка/фигуры/стили/«+» линии R по K1–K3; блок `// ── B ──` пуст — линия B добавляет свои ключи сама, её
  список — `plan-B-needs.md` F7; R дописывает только в свои блоки):
  ```ts
  // AF2.1 · Инструменты Холста. Только новые ключи canvas.*; существующие ключи PPM_TRANSLATIONS не переопределяются
  // (дубликат — ошибка TS2783 в PPM_TRANSLATIONS). Блоки по линиям плана: F — палитра, R — рейка/фигуры/стили/«+»,
  // B — заметка/код/документ/список/файлы (ключи добавляет линия B). Линия пишет только в свой блок, en и ru вместе.
  export const AF21_CANVAS_TRANSLATIONS = {
    en: {
      // ── F: palette ──
      "canvas.palette.neutral": "Neutral",
      "canvas.palette.yellow": "Yellow",
      "canvas.palette.orange": "Amber",
      "canvas.palette.terracotta": "Terracotta",
      "canvas.palette.pink": "Pink",
      "canvas.palette.violet": "Violet",
      "canvas.palette.blue": "Blue",
      "canvas.palette.cyan": "Teal",
      "canvas.palette.green": "Green",
      // ── R: rail ──
      "canvas.rail.label": "Canvas tools",
      "canvas.rail.with_shortcut": "{label} — {keys}",
      "canvas.rail.menu": "Menu «{name}»",
      "canvas.rail.select": "Select",
      "canvas.rail.hand": "Hand",
      "canvas.rail.sticky": "Sticky note",
      "canvas.rail.text": "Text",
      "canvas.rail.shapes": "Shapes",
      "canvas.rail.shapes_caption": "Flowcharts and TRIZ",
      "canvas.rail.pen": "Pen",
      "canvas.rail.frame": "Frame",
      "canvas.rail.connection": "Connection",
      "canvas.rail.docs": "Documents and text",
      "canvas.rail.docs_caption": "Notes, documents, tables and diagrams",
      "canvas.rail.note": "Note",
      "canvas.rail.note_hint": "Markdown and formulas, lives on the board",
      "canvas.rail.document": "Document",
      "canvas.rail.document_hint": "Created in Documents",
      "canvas.rail.list": "List",
      "canvas.rail.list_hint": "Items with checkmarks",
      "canvas.rail.table": "Table",
      "canvas.rail.table_hint": "Rows and columns",
      "canvas.rail.code": "Code",
      "canvas.rail.code_hint": "Block with syntax highlighting",
      "canvas.rail.diagram": "Diagram",
      "canvas.rail.diagram_hint": "Shapes and connections for flowcharts",
      "canvas.rail.project": "From the project",
      "canvas.rail.project_caption": "Live cards: edits go to the source",
      "canvas.rail.work_item": "Task",
      "canvas.rail.work_items_view": "Task board",
      "canvas.rail.file": "File",
      "canvas.rail.git": "Git object",
      "canvas.rail.page": "PPM document",
      "canvas.rail.source_tasks": "Tasks",
      "canvas.rail.source_vault": "Vault",
      "canvas.rail.source_code": "Code",
      "canvas.rail.source_pages": "Documents",
      "canvas.rail.more": "More",
      "canvas.rail.more_caption": "Search, import and export, board objects",
      "canvas.rail.find": "Find in project",
      "canvas.rail.board_link": "Link to a board",
      // ── R: shapes (tldraw geo) ──
      "canvas.shape.rectangle": "Rectangle",
      "canvas.shape.rounded": "Rounded",
      "canvas.shape.ellipse": "Oval",
      "canvas.shape.diamond": "Diamond",
      "canvas.shape.parallelogram": "Parallelogram",
      "canvas.shape.trapezoid": "Trapezoid",
      "canvas.shape.triangle": "Triangle",
      "canvas.shape.hexagon": "Hexagon",
      "canvas.shape.cloud": "Cloud",
      "canvas.shape.arrow": "Arrow",
      // ── R: style toolbar ──
      "canvas.style.shape_toolbar": "Shape toolbar",
      "canvas.style.sticky_toolbar": "Sticky note toolbar",
      "canvas.style.card_toolbar": "Card toolbar",
      "canvas.style.color": "Colour",
      "canvas.style.color_value": "Colour: {name}",
      "canvas.style.color_title": "Shape colour",
      "canvas.style.text": "Text",
      "canvas.style.text_size": "Text size {size}",
      "canvas.style.bold": "Bold",
      "canvas.style.bold_short": "B",
      "canvas.style.shape": "Shape",
      "canvas.style.shape_value": "Shape: {name}",
      "canvas.style.fill": "Fill",
      "canvas.style.fill_none": "No fill",
      "canvas.style.fill_semi": "White",
      "canvas.style.fill_solid": "Colour",
      "canvas.style.font": "Font",
      "canvas.style.font_draw": "Handwritten",
      "canvas.style.font_sans": "Sans",
      "canvas.style.font_serif": "Serif",
      "canvas.style.font_mono": "Monospace",
      "canvas.style.more": "More",
      // ── R: quick connect «+» ──
      "canvas.quick.continue": "Continue",
      "canvas.quick.continue_diagram": "Continue the diagram",
      "canvas.quick.up": "Continue up",
      "canvas.quick.right": "Continue right",
      "canvas.quick.down": "Continue down",
      "canvas.quick.left": "Continue left",
      "canvas.quick.handle_hint": "{direction}: new shape with a connection",
      "canvas.quick.with_link": "{shape} · connected right away",
      "canvas.quick.more_shapes": "More shapes",
      // ── B ── (line B adds its keys here, en and ru together — plan-B.md, Step «Строки»)
    },
    ru: {
      // ── F: palette ──
      "canvas.palette.neutral": "Нейтральный",
      "canvas.palette.yellow": "Жёлтый",
      "canvas.palette.orange": "Янтарный",
      "canvas.palette.terracotta": "Терракотовый",
      "canvas.palette.pink": "Розовый",
      "canvas.palette.violet": "Фиолетовый",
      "canvas.palette.blue": "Синий",
      "canvas.palette.cyan": "Бирюзовый",
      "canvas.palette.green": "Зелёный",
      // ── R: rail ──
      "canvas.rail.label": "Инструменты холста",
      "canvas.rail.with_shortcut": "{label} — {keys}",
      "canvas.rail.menu": "Меню «{name}»",
      "canvas.rail.select": "Выбор",
      "canvas.rail.hand": "Рука",
      "canvas.rail.sticky": "Стикер",
      "canvas.rail.text": "Текст",
      "canvas.rail.shapes": "Фигуры",
      "canvas.rail.shapes_caption": "Блок-схемы и ТРИЗ",
      "canvas.rail.pen": "Перо",
      "canvas.rail.frame": "Рамка",
      "canvas.rail.connection": "Связь",
      "canvas.rail.docs": "Документы и текст",
      "canvas.rail.docs_caption": "Заметки, документы, таблицы и схемы",
      "canvas.rail.note": "Заметка",
      "canvas.rail.note_hint": "Markdown и формулы, живёт на доске",
      "canvas.rail.document": "Документ",
      "canvas.rail.document_hint": "Создаётся в «Документах»",
      "canvas.rail.list": "Список",
      "canvas.rail.list_hint": "Пункты с отметками",
      "canvas.rail.table": "Таблица",
      "canvas.rail.table_hint": "Строки и столбцы",
      "canvas.rail.code": "Код",
      "canvas.rail.code_hint": "Блок с подсветкой синтаксиса",
      "canvas.rail.diagram": "Схема",
      "canvas.rail.diagram_hint": "Фигуры и связи для блок-схем",
      "canvas.rail.project": "Из проекта",
      "canvas.rail.project_caption": "Живые карточки: правки — в источнике",
      "canvas.rail.work_item": "Задача",
      "canvas.rail.work_items_view": "Доска задач",
      "canvas.rail.file": "Файл",
      "canvas.rail.git": "Git-объект",
      "canvas.rail.page": "Документ PPM",
      "canvas.rail.source_tasks": "Задачи",
      "canvas.rail.source_vault": "Хранилище",
      "canvas.rail.source_code": "Код",
      "canvas.rail.source_pages": "Документы",
      "canvas.rail.more": "Ещё",
      "canvas.rail.more_caption": "Поиск, импорт и экспорт, объекты доски",
      "canvas.rail.find": "Найти в проекте",
      "canvas.rail.board_link": "Ссылка на доску",
      // ── R: shapes (tldraw geo) ──
      "canvas.shape.rectangle": "Прямоугольник",
      "canvas.shape.rounded": "Скруглённый",
      "canvas.shape.ellipse": "Овал",
      "canvas.shape.diamond": "Ромб",
      "canvas.shape.parallelogram": "Параллелограмм",
      "canvas.shape.trapezoid": "Трапеция",
      "canvas.shape.triangle": "Треугольник",
      "canvas.shape.hexagon": "Шестиугольник",
      "canvas.shape.cloud": "Облако",
      "canvas.shape.arrow": "Стрелка",
      // ── R: style toolbar ──
      "canvas.style.shape_toolbar": "Панель фигуры",
      "canvas.style.sticky_toolbar": "Панель стикера",
      "canvas.style.card_toolbar": "Панель карточки",
      "canvas.style.color": "Цвет",
      "canvas.style.color_value": "Цвет: {name}",
      "canvas.style.color_title": "Цвет фигуры",
      "canvas.style.text": "Текст",
      "canvas.style.text_size": "Размер текста {size}",
      "canvas.style.bold": "Жирный",
      "canvas.style.bold_short": "Ж",
      "canvas.style.shape": "Форма",
      "canvas.style.shape_value": "Форма: {name}",
      "canvas.style.fill": "Заливка",
      "canvas.style.fill_none": "Без заливки",
      "canvas.style.fill_semi": "Белая",
      "canvas.style.fill_solid": "Цветная",
      "canvas.style.font": "Шрифт",
      "canvas.style.font_draw": "Рукописный",
      "canvas.style.font_sans": "Без засечек",
      "canvas.style.font_serif": "С засечками",
      "canvas.style.font_mono": "Моноширинный",
      "canvas.style.more": "Ещё",
      // ── R: quick connect «+» ──
      "canvas.quick.continue": "Продолжить",
      "canvas.quick.continue_diagram": "Продолжить схему",
      "canvas.quick.up": "Продолжить вверх",
      "canvas.quick.right": "Продолжить вправо",
      "canvas.quick.down": "Продолжить вниз",
      "canvas.quick.left": "Продолжить влево",
      "canvas.quick.handle_hint": "{direction}: новая фигура со связью",
      "canvas.quick.with_link": "{shape} · сразу со связью",
      "canvas.quick.more_shapes": "Другие фигуры",
      // ── B ── (line B adds its keys here, en and ru together — plan-B.md, Step «Строки»)
    },
  } as const;
  ```
  Подключить последним спредом в `packages/ppm-brand/src/index.ts`:
  - `:2` — перед `import { UX11_CANVAS_TRANSLATIONS } from "./translations/ux11-canvas";` вставить строку
    `import { AF21_CANVAS_TRANSLATIONS } from "./translations/af21-canvas";`
  - `:828` — после `    ...UX11_CANVAS_TRANSLATIONS.en,` вставить `    ...AF21_CANVAS_TRANSLATIONS.en,`
  - `:1637` — после `    ...UX11_CANVAS_TRANSLATIONS.ru,` вставить `    ...AF21_CANVAS_TRANSLATIONS.ru,`

- [ ] **Step 11: Прогнать пакет brand и пересобрать**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  Ожидание: `Test Files 7 passed (7)`, `Tests 86 passed (86)` (79 + 7); оба аудита PASS; tsc без вывода (дубликат ключа дал
  бы TS2783). Формат: `../../node_modules/.bin/oxfmt src/index.ts src/translations/af21-canvas.ts src/__tests__/af21-translations.test.ts`.
  Затем `$T/af21-pkg-build.sh ppm-brand`; проверка: `grep -c "canvas.rail.docs_caption" $PF/packages/ppm-brand/dist/index.mjs` ≥ 1.

- [ ] **Step 12: Добавить библиотеки в `apps/web/package.json`** — в `dependencies`, по алфавиту, пять вставок после
  существующих строк:
  - `:52` `"date-fns": "catalog:",` → следующей строкой `"dompurify": "3.4.15",`
  - `:54` `"export-to-csv": "catalog:",` → `"highlight.js": "catalog:",`
  - `:55` `"isbot": "catalog:",` → `"katex": "0.16.47",`
  - `:56` `"lodash-es": "catalog:",` → `"lowlight": "catalog:",`
  - `:57` `"lucide-react": "catalog:",` → `"marked": "16.4.2",`
  `pdfjs-dist` не добавлять (F-D11).
  Версии — ровно те, что в `pnpm-lock.yaml` (`dompurify@3.4.15` `:7321`, `katex@0.16.47` `:8362`, `marked@16.4.2` `:8696`); `highlight.js`/`lowlight` — из каталога `pnpm-workspace.yaml` (`^11.8.0` → 11.11.1,
  `^3.0.0` → 3.3.0, как у `packages/editor`). Все пять пакетов несут свои типы (`katex/types/katex.d.ts`,
  `marked/lib/marked.d.ts`, `dompurify/dist/purify.cjs.d.ts`, `highlight.js/types`, `lowlight` exports).

- [ ] **Step 13: Установить офлайн**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm install --offline
  ```
  Ожидание: `Done in …`, без `ERR_PNPM_NO_OFFLINE_*`. Проверка:
  ```bash
  cd $PF/apps/web && for p in katex marked dompurify lowlight highlight.js; do test -e node_modules/$p/package.json && echo "ok $p"; done
  git -C $PF diff --stat -- pnpm-lock.yaml
  ```
  Ожидание: пять `ok …`; в `pnpm-lock.yaml` изменён только блок `importers → apps/web → dependencies` (пять записей),
  раздел `packages:` не меняется. Если `--offline` не находит пакет — остановиться (BLOCKED), сеть не включать.
  **Сообщить контроллеру: Vite на :3000 нужно перезапустить** (оптимизатор зависимостей не видит новые пакеты).

- [ ] **Step 14: Прогнать web**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run` → `Test Files 57 passed (57)`, `Tests 350 passed (350)`;
  web tsc (см. Global Constraints) → без вывода; oxlint → `Found 719 warnings and 0 errors.`
  Формат: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/components/ppm-canvas/shape.tsx package.json`.

**Приёмка F1:**
- [ ] Спецификация «Контракты и инварианты»: новые поля (цвет из палитры, формат заметки, поля кода) — с тестом; старые
  доски открываются без потерь; неизвестные поля сохраняются (`af21-schema.test.ts` зелёный, `canvas-node.test.ts` не менялся).
- [ ] Рулинг R4: marked + DOMPurify + KaTeX + lowlight подключены в `apps/web` офлайн (corepack pnpm).
- [ ] CONTRACTS §4: `AF21_CANVAS_TRANSLATIONS` подключён последним, паритет en/ru, без «ИИ», без переопределений.
- [ ] Проверки: canvas 3/48 + аудит + 1 старая ошибка tsc; brand 7/86 + аудиты; web 57/350, tsc 0, oxlint 719/0.

---

### Task 2 (F2): Облик v1 как в конце UX1.1 и точки монтирования линий R и B

**Files:**
- Create (F, заморожен): `apps/web/core/components/ppm-canvas/canvas-rail-legacy.tsx`.
- Create (заглушки, владельцы — R/B): `canvas-rail.tsx` (R), `canvas-style-toolbar.tsx` (R), `canvas-quick-connect.tsx` (R),
  `canvas-tldraw-theme.ts` (R), `canvas-toolkit.css` (R), `canvas-external-content.ts` (B), `canvas-content.css` (B) — все в
  `apps/web/core/components/ppm-canvas/`.
- Create: `apps/web/tests/ppm-canvas/af21-foundation.test.ts`.
- Modify: `apps/web/core/components/ppm-canvas/commands.ts:12-44`; `board-workspace-state.ts:6-9, 163-164`;
  `workspace.tsx` (импорты `:12-47, :56-73`; состояние `:141-150, :175-192`; клавиши `:303-325`; палитра команд `:579-691`;
  шапка `:732-740`; рейка `:822-973`); `editor.tsx` (импорты `:18-33, :85-89, :131-142`; пропсы `:210-213`; `:228`; `:2047-2229`;
  `CanvasControls` `:2349-2601, :2797-2815`; `WorkItemPicker` `:3006-3176`); `shape.tsx` (`:760-764`, после `:1049`,
  `:2433-2454`); `canvas.css` (`:17-19, :2002-2045, :2046-2095, :3958-3984, :4032-4068, :4103-4115, :4189-4277, :5063-5092`).
- Modify: `apps/web/tests/ppm-canvas/status-line.test.ts:95-96`.

**Interfaces:**
- Consumes: снимок `201ab5f4` (`git -C $PF show 201ab5f4:<путь>`) — эталон v1; `isCanvasGrammarV2`, `usePpmCanvasGrammarV2`
  (`canvas-grammar.ts:10-17`); `findFreeNodePosition` (`editor.tsx:3506-3574`, оставить); `TPpmCanvasCommand` (`commands.ts:46`).
- Produces: строки «Команды», «Рейка», «Оверлеи», «Тема tldraw», «Вставка», «Панель задач», «CSS» таблицы имён; размеченные
  блоки в `editor.tsx`: `// ── AF2.1 R: …` (импорты, shapeUtils, дочерние `<Tldraw>`, команды R) и `// ── AF2.1 B: …`
  (импорты, deps вставки, команды B), каждый закрыт `// ── /AF2.1 R ──` / `// ── /AF2.1 B ──`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools
  D=apps/web/core/components/ppm-canvas
  $T/af21-pre.sh $D/canvas-rail-legacy.tsx $D/canvas-rail.tsx $D/canvas-style-toolbar.tsx $D/canvas-quick-connect.tsx \
    $D/canvas-tldraw-theme.ts $D/canvas-toolkit.css $D/canvas-external-content.ts $D/canvas-content.css \
    $D/commands.ts $D/board-workspace-state.ts $D/workspace.tsx $D/editor.tsx $D/shape.tsx $D/canvas.css \
    apps/web/tests/ppm-canvas/af21-foundation.test.ts apps/web/tests/ppm-canvas/status-line.test.ts
  ```

- [ ] **Step 2: Написать падающий тест** — `apps/web/tests/ppm-canvas/af21-foundation.test.ts`:
  ```ts
  // AF2.1 F2: облик v1 возвращён к концу UX1.1 (снимок 201ab5f4) + исправление кликов; точки монтирования линий R и B.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { isCanvasCommandAllowedReadOnly } from "@/components/ppm-canvas/board-workspace-state";
  import { PPM_CANVAS_COMMANDS } from "@/components/ppm-canvas/commands";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const editor = read("editor.tsx");
  const workspace = read("workspace.tsx");
  const shape = read("shape.tsx");
  const legacyRail = read("canvas-rail-legacy.tsx");
  const css = read("canvas.css");

  // Bodies of the rules whose selector list contains `selector` exactly (works inside @media and comma lists).
  function ruleBodies(source: string, selector: string): string[] {
    const flat = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
    return [...flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, prelude]) =>
        prelude
          .split(",")
          .map((item) => item.trim())
          .includes(selector)
      )
      .map((match) => match[2]);
  }

  const ruleBody = (source: string, selector: string): string | undefined => ruleBodies(source, selector)[0];

  function functionSource(source: string, name: string): string {
    const start = source.indexOf(`function ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const next = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, next === -1 ? undefined : next);
  }

  describe("AF2.1 F2: v1 as at the end of UX1.1", () => {
    it("restores the UX1.1 commands and declares every AF2.1 command once", () => {
      for (const command of [
        "add-code",
        "add-group",
        "add-frame",
        "add-board-link",
        "add-work-item",
        "add-work-items-view",
        "add-diagram",
        "add-deck",
        "open-tasks",
        "draw-pen",
        "add-sticky",
        "select-hand",
        "open-shapes",
        "open-semantic-edges",
        "add-document-page",
        "add-page-ref",
        "add-list",
        "add-file",
        "add-git",
      ])
        expect(PPM_CANVAS_COMMANDS, command).toContain(command);
      expect(new Set(PPM_CANVAS_COMMANDS).size).toBe(PPM_CANVAS_COMMANDS.length);
    });

    it("keeps the UX1.1 read-only set in v1; the tasks panel and semantic links are v2 tools", () => {
      for (const command of ["select", "fit-view", "zoom-in", "zoom-out"])
        expect(isCanvasCommandAllowedReadOnly(command, false), command).toBe(true);
      for (const command of ["open-tasks", "open-semantic-edges", "semantic-edges", "zoom-reset", "select-hand"]) {
        expect(isCanvasCommandAllowedReadOnly(command, false), command).toBe(false);
        expect(isCanvasCommandAllowedReadOnly(command, true), command).toBe(true);
      }
      expect(isCanvasCommandAllowedReadOnly("add-sticky", true)).toBe(false);
    });

    it("renders the UX1.1 rail in v1 and line R's slot in v2", () => {
      // Line R (R1) adds its own props to <PpmCanvasRail …/>; the v1 branch stays exactly the legacy rail.
      expect(workspace).toMatch(
        /\{designV2 \? \(\s*<PpmCanvasRail\s+\{\.\.\.railProps\}[\s\S]*?\/>\s*\) : \(\s*<PpmCanvasLegacyRail \{\.\.\.railProps\} \/>\s*\)\}/
      );
      expect(workspace).toContain("window.matchMedia(CANVAS_RAIL_COLLAPSE_QUERY)");
      expect(workspace).not.toContain("ppm-canvas-rail-expanded");
      expect(workspace).not.toContain("ppm-canvas-shape-menu");
      expect(workspace).not.toContain("railTooltip");
      expect(workspace).not.toMatch(/^function RailButton\(/m);
    });

    it("keeps the rail exactly as UX1.1 drew it: brand, labels with shortcuts, links, zoom and alignment", () => {
      expect(legacyRail).toContain("PPM_BRAND.assets.mark");
      expect(legacyRail).toContain("title={label}");
      expect(legacyRail).not.toContain("aria-label={label}");
      for (const shortcut of ['shortcut="⇧N"', 'shortcut="⇧G"', 'shortcut="⇧T"']) expect(legacyRail).toContain(shortcut);
      for (const command of ["add-board-link", "semantic-edges", "fit-view", "zoom-in", "zoom-out", "align-left", "undo"])
        expect(legacyRail, command).toContain(`onRunCommand("${command}")`);
    });

    it("brings back ⇧G for sections and ⇧T «Добавить задачу» in v1 (the tasks panel in v2)", () => {
      expect(workspace).toMatch(/event\.shiftKey && event\.code === "KeyG"[\s\S]{0,160}runCanvasCommand\("add-group"\)/);
      expect(workspace).toContain('runCanvasCommand(designV2 ? "open-tasks" : "add-work-item")');
    });

    it("shows «copy board link» and «copy task link» only under v2", () => {
      expect(workspace).toMatch(/\{designV2 && \(\s*<button\s+type="button"\s+className="ppm-canvas-board-copy"/);
      expect(shape).toContain("{grammarV2 && identity.source_url && (");
    });

    it("restores the UX1.1 task and board pickers next to the v2 tasks panel", () => {
      expect(editor).toMatch(/export default function PpmCanvasEditor\(\{\s*authorId,\s*boardId,\s*boards,/);
      expect(editor).toContain("function BoardLinkPicker(");
      expect(editor).toContain("if (canEdit) setBoardPickerOpen(true);");
      expect(editor).toContain("if (canEdit) setPickerOpen(true);");
      for (const command of ["add-code", "add-group", "add-frame", "add-work-items-view", "add-diagram", "add-deck"])
        expect(editor, command).toContain(`case "${command}":`);
      expect(editor).toMatch(/<WorkItemPicker\s+variant="panel"/);
      expect(editor).toMatch(
        /variant === "panel"\s*\?\s*"ppm-work-item-picker ppm-work-item-picker--panel"\s*:\s*"ppm-work-item-picker"/
      );
    });
  });

  describe("AF2.1 F2: mount points for lines R and B", () => {
    it("mounts the overlays as leaf children of <Tldraw>, never inside the components memo", () => {
      const tldraw = editor.slice(editor.indexOf("<Tldraw"), editor.indexOf("</Tldraw>"));
      expect(tldraw).toContain("shapeUtils={shapeUtils}");
      expect(tldraw).toContain("onMount={handleTldrawMount}");
      expect(tldraw).toContain("{grammarV2 && <PpmCanvasStyleToolbar canEdit={effectiveCanEdit} />}");
      expect(tldraw).toContain("{grammarV2 && <PpmCanvasQuickConnect authorId={authorId} canEdit={effectiveCanEdit} />}");
      const memo = editor.slice(
        editor.indexOf("const components = useMemo<TLComponents>("),
        editor.indexOf("const projectionContext = useMemo(")
      );
      expect(memo).not.toContain("PpmCanvasStyleToolbar");
      expect(memo).not.toContain("PpmCanvasQuickConnect");
      expect(editor).toContain("const shapeUtils = useMemo(() => getPpmCanvasShapeUtils(grammarV2), [grammarV2]);");
      // The onMount seam belongs to line B (plan-B B4 fills it with the paste/drop/⌘U registration).
      expect(editor).toMatch(/const handleTldrawMount = useCallback\(/);
    });

    it("marks balanced R and B blocks in editor.tsx", () => {
      for (const [lane, minimum] of [
        ["R", 4],
        ["B", 3],
      ] as const) {
        const opened = editor.split(`── AF2.1 ${lane}:`).length - 1;
        const closed = editor.split(`── /AF2.1 ${lane} ──`).length - 1;
        expect(opened, lane).toBeGreaterThanOrEqual(minimum);
        expect(closed, lane).toBe(opened);
      }
    });

    it("imports the lines' stylesheets after canvas-v2.css", () => {
      const order = ['import "./canvas.css";', 'import "./canvas-v2.css";', 'import "./canvas-toolkit.css";', 'import "./canvas-content.css";'].map(
        (line) => editor.indexOf(line)
      );
      expect(order[0]).toBeGreaterThan(0);
      for (let index = 1; index < order.length; index++) expect(order[index]).toBeGreaterThan(order[index - 1]);
    });

    it("keeps the lines' stylesheets v2-only", () => {
      for (const name of ["canvas-toolkit.css", "canvas-content.css"]) {
        const flat = read(name).replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
        const selectors = [...flat.matchAll(/([^{}]+)\{/g)]
          .map((match) => match[1].trim())
          .filter((prelude) => !prelude.startsWith("@"))
          .flatMap((prelude) => prelude.split(",").map((selector) => selector.trim()));
        for (const selector of selectors) expect(selector, `${name}: ${selector}`).toMatch(/^:where\(html\[data-ppm-design="v2"\]\)/);
      }
    });

    it("uses the UX1.1 checklist and table in v1 (the checklist toggle is the clicks fix)", () => {
      expect(shape).toMatch(/grammarV2 \? \(\s*<ChecklistEditor [^>]*\/>\s*\) : \(\s*<ChecklistEditorV1 /);
      expect(shape).toMatch(/grammarV2 \? \(\s*<TableEditor [^>]*\/>\s*\) : \(\s*<TableEditorV1 /);
      const checklist = functionSource(shape, "ChecklistEditorV1");
      expect(checklist).toContain("<label key={item.id}>");
      expect(checklist).toContain('role="checkbox"');
      expect(checklist).toContain("runCanvasPointerAction(");
      const table = functionSource(shape, "TableEditorV1");
      expect(table).not.toContain("canvas.table_remove_row");
      expect(table).not.toContain("onTableCellKeyDown");
    });

    it("returns canvas.css to UX1.1 for v1 and keeps the clicks fix", () => {
      expect(ruleBody(css, ".ppm-canvas-node")).toContain("pointer-events: auto;");
      expect(ruleBody(css, ".ppm-canvas-workspace[data-rail-expanded]")).toContain("--ppm-canvas-rail-width: 13.375rem;");
      const brand = ruleBody(css, ".ppm-canvas-rail__brand") ?? "";
      expect(brand).toContain("padding: 0 0.25rem;");
      expect(brand).not.toContain("position: sticky");
      const picker = ruleBody(css, ".ppm-work-item-picker") ?? "";
      for (const declaration of ["bottom: 4.25rem;", "left: 50%;", "transform: translateX(-50%);"])
        expect(picker).toContain(declaration);
      expect(picker).not.toContain("right: 0.75rem");
      expect(ruleBody(css, ".ppm-work-item-picker--panel")).toContain("right: 0.75rem;");
      expect(css).toContain("@media (max-width: 980px)");
      expect(css).not.toContain("@media (max-width: 1279px)");
      expect(css).not.toContain(".ppm-canvas-shape-menu");
      expect(css).not.toContain(".ppm-canvas-rail-tooltip");
      expect(ruleBody(css, ".ppm-canvas-checklist > label")).toBeDefined();
      // The UX1.1 table rules stay; the second agent's table rules apply only under the v2 grammar.
      for (const body of ruleBodies(css, ".ppm-canvas-table th")) expect(body).not.toContain("white-space: nowrap");
      expect(ruleBody(css, '[data-ppm-canvas-grammar="v2"] .ppm-canvas-table th')).toContain("white-space: nowrap;");
    });
  });
  ```
  И в `apps/web/tests/ppm-canvas/status-line.test.ts` после строки `:96`
  (`expect(isCanvasCommandAllowedReadOnly("draw-rectangle", true)).toBe(false);`) добавить:
  ```ts
      // AF2.1 F2: the tasks panel is a v2 tool; v1 keeps the UX1.1 read-only set.
      expect(isCanvasCommandAllowedReadOnly("open-tasks", false)).toBe(false);
  ```

- [ ] **Step 3: Убедиться, что тесты падают**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/af21-foundation.test.ts tests/ppm-canvas/status-line.test.ts`
  Ожидание: FAIL — `ENOENT … canvas-rail-legacy.tsx`, `expected [ … ] to include 'add-code'`, `open-tasks` для v1 —
  `expected true to be false`, `expected -1 to be greater than …` (импорты CSS), `@media (max-width: 980px)` не найден.

- [ ] **Step 4: Команды и права читателя**
  - `commands.ts:12-44` — массив `PPM_CANVAS_COMMANDS` заменить целиком:
    ```ts
    export const PPM_CANVAS_COMMANDS = [
      "select",
      "add-note",
      "add-document",
      "add-checklist",
      "add-table",
      // UX1.1 (restored by AF2.1 F2 — облик v1 и палитра команд)
      "add-code",
      "add-group",
      "add-frame",
      "add-board-link",
      "add-work-item",
      "add-work-items-view",
      "add-diagram",
      "add-deck",
      // Second agent (kept for v2)
      "draw-rectangle",
      "draw-ellipse",
      "draw-diamond",
      "draw-line",
      "draw-pen",
      "draw-text",
      "open-tasks",
      // AF2.1 line R (handled in the R block of editor.tsx)
      "add-sticky",
      "select-hand",
      "open-shapes",
      "open-semantic-edges",
      // AF2.1 line B (handled in the B block of editor.tsx)
      "add-document-page",
      "add-page-ref",
      "add-list",
      "add-file",
      "add-git",
      "add-agent-answer",
      "add-orchestrator-run",
      "add-search-results",
      "draw-connection",
      "semantic-edges",
      "undo",
      "redo",
      "zoom-in",
      "zoom-out",
      "fit-view",
      "zoom-reset",
      "focus-selection",
      "align-left",
      "align-center-horizontal",
      "align-right",
      "align-top",
      "align-center-vertical",
      "align-bottom",
    ] as const;
    ```
  - `board-workspace-state.ts:6-8` — комментарий вернуть к UX1.1:
    ```ts
    // Below this width the rail starts (and snaps back to) collapsed so it does not eat canvas space
    // on laptop-size viewports. Independent of canvas.css's 980px overlay breakpoint, which still
    // governs when an expanded rail floats over the canvas instead of taking its own column.
    ```
    `:163-164` — было:
    ```ts
    const READ_ONLY_COMMANDS_V1: readonly string[] = ["select", "open-tasks", "fit-view", "zoom-in", "zoom-out"];
    const READ_ONLY_COMMANDS_V2: readonly string[] = [...READ_ONLY_COMMANDS_V1, "zoom-reset", "semantic-edges"];
    ```
    стало:
    ```ts
    const READ_ONLY_COMMANDS_V1: readonly string[] = ["select", "fit-view", "zoom-in", "zoom-out"];
    // AF2.1: the tasks panel and the read-only semantic links are v2 tools.
    const READ_ONLY_COMMANDS_V2: readonly string[] = [
      ...READ_ONLY_COMMANDS_V1,
      "zoom-reset",
      "semantic-edges",
      "open-semantic-edges",
      "open-tasks",
      "select-hand",
    ];
    ```

- [ ] **Step 5: Рейка UX1.1 отдельным модулем и слот v2**
  - Создать `canvas-rail-legacy.tsx` (тело — дословно `201ab5f4:workspace.tsx:827-1060` и `:1542-1586`, переименованы только
    привязки: `railExpanded→expanded`, `setRailExpanded(…)→onToggleExpanded()`, `runCanvasCommand→onRunCommand`,
    `setBoardMenuOpen(…)→onToggleBoards()`, `capabilities.edit→canEdit`, `activeBoardEditReady→editReady`; тип иконки —
    `LucideIcon` вместо `typeof BrainCircuit`):
    ```tsx
    // AF2.1 F2: the Canvas rail exactly as at the end of UX1.1 (snapshot 201ab5f4, workspace.tsx:827-1060 and
    // RailButton/RailSectionLabel :1542-1586), extracted verbatim with renamed bindings. Облик v1 renders only this rail;
    // under v2 `canvas-rail.tsx` (line R) replaces it. Do not add AF2.1 features here: v1 must stay «как в конце UX1.1».
    import {
      AlignCenterHorizontal,
      AlignCenterVertical,
      AlignEndHorizontal,
      AlignEndVertical,
      AlignStartHorizontal,
      AlignStartVertical,
      ChevronLeft,
      ChevronRight,
      Code2,
      Columns3,
      FileText,
      Focus,
      Frame,
      GitFork,
      Group,
      LayoutGrid,
      Link,
      ListChecks,
      ListPlus,
      Menu,
      Network,
      Presentation,
      Redo2,
      StickyNote,
      Table2,
      Undo2,
      Workflow,
      ZoomIn,
      ZoomOut,
      type LucideIcon,
    } from "lucide-react";
    import { PPM_BRAND } from "@ppm/brand";
    import { usePpmTranslation } from "@/hooks/use-ppm-translation";
    import { isCanvasCommandAllowedReadOnly } from "./board-workspace-state";
    import type { TPpmCanvasCommand } from "./commands";

    export type TPpmCanvasRailProps = {
      /** tldraw tool id of the active board ("select", "arrow", …). */
      activeTool?: string;
      /** capabilities.edit — the project role may edit this Canvas. */
      canEdit: boolean;
      designV2: boolean;
      /** activeBoardEditReady — the active board is loaded, editable and not blocked. */
      editReady: boolean;
      expanded: boolean;
      onRunCommand: (command: TPpmCanvasCommand) => void;
      onToggleBoards: () => void;
      onToggleExpanded: () => void;
    };

    export function PpmCanvasLegacyRail({
      activeTool,
      canEdit,
      designV2,
      editReady,
      expanded,
      onRunCommand,
      onToggleBoards,
      onToggleExpanded,
    }: TPpmCanvasRailProps) {
      const ppmT = usePpmTranslation();
      return (
        <aside className="ppm-canvas-rail" aria-label={ppmT("canvas.toolbar")}>
          <button
            type="button"
            className="ppm-canvas-rail__brand"
            title={ppmT(expanded ? "canvas.collapse_panel" : "canvas.expand_panel")}
            aria-label={ppmT(expanded ? "canvas.collapse_panel" : "canvas.expand_panel")}
            onClick={() => onToggleExpanded()}
          >
            <img src={PPM_BRAND.assets.mark} alt="" aria-hidden="true" />
            {expanded && <strong>PPM</strong>}
            {expanded ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
          </button>
          <RailSectionLabel expanded={expanded} label={ppmT("canvas.navigation")} />
          <RailButton
            pressed={activeTool === "select"}
            expanded={expanded}
            icon={LayoutGrid}
            label={ppmT("canvas.canvas")}
            onClick={() => onRunCommand("select")}
          />
          <RailButton
            expanded={expanded}
            icon={Menu}
            label={ppmT("canvas.boards")}
            onClick={() => onToggleBoards()}
          />
          <RailSectionLabel expanded={expanded} label={ppmT("canvas.nodes")} />
          {canEdit && (
            <>
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={StickyNote}
                label={ppmT("canvas.add_note")}
                shortcut="⇧N"
                onClick={() => onRunCommand("add-note")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={FileText}
                label={ppmT("canvas.add_document")}
                onClick={() => onRunCommand("add-document")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={ListChecks}
                label={ppmT("canvas.add_checklist")}
                onClick={() => onRunCommand("add-checklist")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Table2}
                label={ppmT("canvas.add_table")}
                onClick={() => onRunCommand("add-table")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Code2}
                label={ppmT("canvas.add_code")}
                onClick={() => onRunCommand("add-code")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Group}
                label={ppmT("canvas.add_group")}
                shortcut="⇧G"
                onClick={() => onRunCommand("add-group")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Frame}
                label={ppmT("canvas.add_frame")}
                onClick={() => onRunCommand("add-frame")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Link}
                label={ppmT("canvas.add_board_link")}
                onClick={() => onRunCommand("add-board-link")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={ListPlus}
                label={ppmT("canvas.add_work_item")}
                shortcut="⇧T"
                onClick={() => onRunCommand("add-work-item")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Columns3}
                label={ppmT("canvas.add_work_items_view")}
                onClick={() => onRunCommand("add-work-items-view")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Workflow}
                label={ppmT("canvas.add_diagram")}
                onClick={() => onRunCommand("add-diagram")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Presentation}
                label={ppmT("canvas.add_deck")}
                onClick={() => onRunCommand("add-deck")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={GitFork}
                label={ppmT("canvas.draw_connection")}
                pressed={activeTool === "arrow"}
                onClick={() => onRunCommand("draw-connection")}
              />
              <RailButton
                // v2: the read-only list stays reachable when the board is read-only, in conflict or being restored.
                disabled={!editReady && !isCanvasCommandAllowedReadOnly("semantic-edges", designV2)}
                expanded={expanded}
                icon={Network}
                label={ppmT("canvas.semantic_edges")}
                onClick={() => onRunCommand("semantic-edges")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Undo2}
                label={ppmT("canvas.undo")}
                onClick={() => onRunCommand("undo")}
              />
              <RailButton
                disabled={!editReady}
                expanded={expanded}
                icon={Redo2}
                label={ppmT("canvas.redo")}
                onClick={() => onRunCommand("redo")}
              />
            </>
          )}
          {designV2 && !canEdit && (
            <RailButton
              expanded={expanded}
              icon={Network}
              label={ppmT("canvas.semantic_edges")}
              onClick={() => onRunCommand("semantic-edges")}
            />
          )}
          {(!designV2 || (expanded && canEdit)) && (
            <RailSectionLabel expanded={expanded} label={ppmT("canvas.view")} />
          )}
          {!designV2 && (
            <>
              <RailButton
                expanded={expanded}
                icon={Focus}
                label={ppmT("canvas.fit_view")}
                onClick={() => onRunCommand("fit-view")}
              />
              <RailButton
                expanded={expanded}
                icon={ZoomIn}
                label={ppmT("canvas.zoom_in")}
                onClick={() => onRunCommand("zoom-in")}
              />
              <RailButton
                expanded={expanded}
                icon={ZoomOut}
                label={ppmT("canvas.zoom_out")}
                onClick={() => onRunCommand("zoom-out")}
              />
            </>
          )}
          {expanded && canEdit && (
            <div className="ppm-canvas-rail__align" aria-label={ppmT("canvas.align")}>
              <button
                disabled={!editReady}
                type="button"
                title={ppmT("canvas.align_left")}
                onClick={() => onRunCommand("align-left")}
              >
                <AlignStartVertical aria-hidden="true" />
              </button>
              <button
                type="button"
                title={ppmT("canvas.align_center_horizontal")}
                onClick={() => onRunCommand("align-center-horizontal")}
                disabled={!editReady}
              >
                <AlignCenterVertical aria-hidden="true" />
              </button>
              <button
                disabled={!editReady}
                type="button"
                title={ppmT("canvas.align_right")}
                onClick={() => onRunCommand("align-right")}
              >
                <AlignEndVertical aria-hidden="true" />
              </button>
              <button
                disabled={!editReady}
                type="button"
                title={ppmT("canvas.align_top")}
                onClick={() => onRunCommand("align-top")}
              >
                <AlignStartHorizontal aria-hidden="true" />
              </button>
              <button
                type="button"
                title={ppmT("canvas.align_center_vertical")}
                onClick={() => onRunCommand("align-center-vertical")}
                disabled={!editReady}
              >
                <AlignCenterHorizontal aria-hidden="true" />
              </button>
              <button
                disabled={!editReady}
                type="button"
                title={ppmT("canvas.align_bottom")}
                onClick={() => onRunCommand("align-bottom")}
              >
                <AlignEndHorizontal aria-hidden="true" />
              </button>
            </div>
          )}
        </aside>
      );
    }

    function RailButton({
      disabled = false,
      expanded,
      icon: Icon,
      label,
      onClick,
      // Only actual toggle buttons ("Холст" / "Нарисовать визуальную связь") pass this. Leaving it
      // undefined for plain action buttons (add-note, undo, ...) keeps aria-pressed off them entirely
      // instead of falsely announcing every rail button as a toggle.
      pressed,
      shortcut,
    }: {
      disabled?: boolean;
      expanded: boolean;
      icon: LucideIcon;
      label: string;
      onClick: () => void;
      pressed?: boolean;
      shortcut?: string;
    }) {
      return (
        <button
          type="button"
          className="ppm-canvas-rail-button"
          aria-pressed={pressed}
          data-active={pressed || undefined}
          disabled={disabled}
          title={label}
          onClick={onClick}
        >
          <Icon aria-hidden="true" />
          {expanded && (
            <>
              <span>{label}</span>
              {shortcut && <kbd>{shortcut}</kbd>}
            </>
          )}
        </button>
      );
    }

    function RailSectionLabel({ expanded, label }: { expanded: boolean; label: string }) {
      if (!expanded) return <span className="ppm-canvas-rail__divider" aria-hidden="true" />;
      return <small className="ppm-canvas-rail__label">{label}</small>;
    }
    ```
  - Создать `canvas-rail.tsx` (владелец — R; заглушка = рейка UX1.1, чтобы v2 работал между F2 и R1):
    ```tsx
    // AF2.1 mount point (F2). Line R (R1) replaces the body with the grouped floating rail (K1). Until then v2 keeps the
    // end-of-UX1.1 rail, so the Canvas stays usable between F2 and R1. Rendered by workspace.tsx only under design v2.
    import { PpmCanvasLegacyRail, type TPpmCanvasRailProps } from "./canvas-rail-legacy";

    export type { TPpmCanvasRailProps };

    export function PpmCanvasRail(props: TPpmCanvasRailProps) {
      return <PpmCanvasLegacyRail {...props} />;
    }
    ```
  - `workspace.tsx`:
    1. Импорты lucide (`:12-47`): удалить `Circle`, `Diamond`, `PanelLeftClose`, `PanelLeftOpen`, `PenTool`, `Square`, `Type`,
       `ArrowRight`, `Frame`, `ListChecks`, `ListPlus`, `StickyNote`, `Table2`, `Undo2`, `Redo2`, `MousePointer2`, `FileText` —
       **только те**, что после правок не используются в файле (проверка: `grep -c "<Имя\b\|{Имя}" workspace.tsx` = 0 перед
       удалением; tsc/oxlint `no-unused-vars` подтверждает). `Copy` остаётся (кнопка ссылки на доску).
    2. Импорт из `./board-workspace-state` (`:56-73`): добавить `CANVAS_RAIL_COLLAPSE_QUERY,` перед `canvasBoardTabsKey,`.
       После строки `import { createCanvasZoomStore, type TPpmCanvasZoomStore } from "./canvas-zoom-store";` добавить:
       ```ts
       import { PpmCanvasLegacyRail } from "./canvas-rail-legacy";
       import { PpmCanvasRail } from "./canvas-rail";
       ```
    3. Состояние (`:141-150`) — было:
       ```ts
         const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
         const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
         const [railExpanded, setRailExpanded] = useState(() => {
           try {
             return typeof window !== "undefined" && window.localStorage.getItem("ppm-canvas-rail-expanded") === "true";
           } catch {
             return false;
           }
         });
         const [railTooltip, setRailTooltip] = useState<{ label: string; top: number }>();
       ```
       стало:
       ```ts
         const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
         const [railExpanded, setRailExpanded] = useState(
           () => typeof window === "undefined" || !window.matchMedia(CANVAS_RAIL_COLLAPSE_QUERY).matches
         );
       ```
    4. Эффект и подсказка (`:175-192`) — было: `useEffect(() => { try { window.localStorage.setItem("ppm-canvas-rail-expanded", …` …
       `setRailTooltip(undefined); }, [railExpanded]);` и функция `showRailTooltip` целиком; стало (как `201ab5f4:181-188`):
       ```ts
         useEffect(() => {
           const narrowViewport = window.matchMedia(CANVAS_RAIL_COLLAPSE_QUERY);
           const collapseRailOnNarrowViewport = () => {
             if (narrowViewport.matches) setRailExpanded(false);
           };
           narrowViewport.addEventListener("change", collapseRailOnNarrowViewport);
           return () => narrowViewport.removeEventListener("change", collapseRailOnNarrowViewport);
         }, []);
       ```
    5. Клавиши (`:303-325`): в ветке `Escape` удалить строку `setShapeMenuOpen(false);`; блок `⇧T` заменить и вернуть `⇧G`:
       ```ts
             if (event.shiftKey && event.code === "KeyG") {
               event.preventDefault();
               event.stopImmediatePropagation();
               runCanvasCommand("add-group");
             }
             if (event.shiftKey && event.code === "KeyT") {
               event.preventDefault();
               event.stopImmediatePropagation();
               // v1 (UX1.1): «Добавить задачу»; v2: панель «Задачи и бэклог».
               runCanvasCommand(designV2 ? "open-tasks" : "add-work-item");
             }
       ```
    6. Палитра команд (`:579-691`): вернуть список `201ab5f4:workspace.tsx:556-705` (UX1.1: `add-code`, `add-group`,
       `add-frame`, `add-board-link`, `add-work-item`, `add-work-items-view`, `add-diagram`, `add-deck`, `draw-connection`,
       `semantic-edges` в блоке правки и `designV2 && !activeBoardEditReady` → `semantic-edges`) и добавить элементы второго
       агента **только под v2**: сразу после `{ command: "select", … }` вставить
       `...(designV2 ? [{ command: "open-tasks" as const, id: "open-tasks", keywords: ["tasks", "backlog"], label: ppmT("canvas.tasks_panel") }] : []),`,
       а в начало блока `activeBoardEditReady ? [...]` — `...(designV2 ? DRAW_COMMANDS(ppmT) : []),`, где на уровне модуля
       (после `const PpmCanvasEditor = lazy(…)`, `:80`):
       ```ts
       // Second agent's native tools (shapes, line, pen, text) — v2 only; line R regroups them in the rail (R1).
       function DRAW_COMMANDS(ppmT: (key: TPpmTranslationKey) => string): TPpmCanvasCommandItem<TPpmCanvasCommand>[] {
         return [
           { command: "draw-rectangle", id: "draw-rectangle", keywords: ["shape", "box"], label: ppmT("canvas.tool_rectangle") },
           { command: "draw-ellipse", id: "draw-ellipse", keywords: ["shape", "circle"], label: ppmT("canvas.tool_ellipse") },
           { command: "draw-diamond", id: "draw-diamond", keywords: ["shape", "decision"], label: ppmT("canvas.tool_diamond") },
           { command: "draw-line", id: "draw-line", keywords: ["line"], label: ppmT("canvas.tool_line") },
           { command: "draw-pen", id: "draw-pen", keywords: ["draw", "pen"], label: ppmT("canvas.tool_pen") },
           { command: "draw-text", id: "draw-text", keywords: ["text", "write"], label: ppmT("canvas.tool_text") },
         ];
       }
       ```
       (импорт `import type { TPpmTranslationKey } from "@ppm/brand";` добавить к импортам, если его нет); зависимости
       `useMemo` — `[activeBoardEditReady, designV2, ppmT]`. Проверка эквивалентности v1:
       `diff <(git -C $PF show 201ab5f4:apps/web/core/components/ppm-canvas/workspace.tsx | sed -n '556,705p') <(sed -n '/const commands = useMemo/,/^  );$/p' $PF/apps/web/core/components/ppm-canvas/workspace.tsx)`
       — отличаются только две строки со спредами `designV2 ? …` и массив зависимостей.
    7. Шапка (`:732-740`): кнопку `ppm-canvas-board-copy` обернуть `{designV2 && ( … )}` (F-D8).
    8. Рейка (`:822-973`, от `<aside` до закрывающего `)}` блока `shapeMenuOpen && …` включительно) заменить на:
       ```tsx
             {designV2 ? (
               <PpmCanvasRail {...railProps} />
             ) : (
               <PpmCanvasLegacyRail {...railProps} />
             )}
       ```
       где перед `return (` компонента (после `const activeRoleKey = …`, `:713`) добавить:
       ```ts
         const railProps = {
           activeTool,
           canEdit: capabilities.edit,
           designV2,
           editReady: activeBoardEditReady,
           expanded: railExpanded,
           onRunCommand: runCanvasCommand,
           onToggleBoards: () => setBoardMenuOpen((current) => !current),
           onToggleExpanded: () => setRailExpanded((current) => !current),
         };
       ```
       (`activeTool` в workspace — `string | undefined`, поэтому в `TPpmCanvasRailProps` оно необязательное.)
    9. Удалить функции `RailButton` и `RailSectionLabel` из `workspace.tsx` (`:1454-1499`) — они живут в `canvas-rail-legacy.tsx`.

- [ ] **Step 6: `editor.tsx` — v1 UX1.1 и точки монтирования**
  1. Импорты. В `from "tldraw"` (`:34-47`) ничего не удалять (`Box`, `GeoShapeGeoStyle` нужны). После
     `import { resolveGeneralTheme } from "@plane/utils";` вернуть `import { useTranslation } from "@plane/i18n";` (перед ним)
     и после `import { usePpmTranslation } …` не трогать; добавить `import { formatPpmTimeAgo } from "@/helpers/ppm-time-ago.helper";`
     перед `import { usePpmTranslation } from "@/hooks/use-ppm-translation";`. После блока `from "./desktop-import";` (`:131`):
     ```ts
     // ── AF2.1 R: rail overlays and the tldraw palette (canvas-toolkit.css) ──
     import { PpmCanvasQuickConnect } from "./canvas-quick-connect";
     import { PpmCanvasStyleToolbar } from "./canvas-style-toolbar";
     import { getPpmCanvasShapeUtils } from "./canvas-tldraw-theme";
     // ── /AF2.1 R ──
     // ── AF2.1 B: imports of line B (canvas-external-content.ts, note/code/file modules) ──
     // ── /AF2.1 B ──
     ```
     После `import "./canvas-v2.css";` (`:142`):
     ```ts
     // oxlint-disable-next-line import/no-unassigned-import -- AF2.1 line R: rail, style toolbar, «+», palette (v2 only)
     import "./canvas-toolkit.css";
     // oxlint-disable-next-line import/no-unassigned-import -- AF2.1 line B: note, code, document and file cards (v2 only)
     import "./canvas-content.css";
     ```
  2. Пропсы (`:210-213`): вернуть `boards,` после `boardId,` в деструктуризации `PpmCanvasEditor`.
  3. После `const grammarV2 = isCanvasGrammarV2(designV2, statusPlacement);` (`:228`):
     ```ts
       // ── AF2.1 R: tldraw shape utils (+ PPM palette for native shapes under v2). Stable per mount: grammarV2 is fixed. ──
       const shapeUtils = useMemo(() => getPpmCanvasShapeUtils(grammarV2), [grammarV2]);
       // ── /AF2.1 R ──
     ```
  4. Перед `const components = useMemo<TLComponents>(` (`:2047`) — шов монтирования линии B (нужда B F8: B сам ставит
     регистрацию `registerPpmCanvasExternalContent(mounted, getExternalContentDeps)` только под `grammarV2` и
     `acceptedImageMimeTypes` у `<Tldraw>`; F2 даёт только шов с прежним поведением `setEditor`):
     ```ts
       // ── AF2.1 B: <Tldraw onMount> seam — line B registers paste/drop/⌘U handlers here (v2 grammar only). ──
       const handleTldrawMount = useCallback((mounted: Editor) => {
         setEditor(mounted);
       }, []);
       // ── /AF2.1 B ──
     ```
  5. `components` (`:2051-2102`): вернуть проп `boards={boards}` в `<CanvasControls …>` (после `boardInfoOpen=…`) и `boards` в
     массив зависимостей (после `boardInfoOpen,`), как в `201ab5f4:editor.tsx:2050-2110`.
  6. `<Tldraw>` (`:2221-2229`) — было:
     ```tsx
                     <Tldraw
                       cameraOptions={{ wheelBehavior: "pan" }}
                       components={components}
                       shapeUtils={[PpmCanvasNodeShapeUtil]}
                       onMount={setEditor}
                     >
                       {presence && <PpmCanvasRealtimeCursors presence={presence} />}
                       {grammarV2 && onZoomChange && <PpmCanvasZoomReporter boardId={boardId} onZoomChange={onZoomChange} />}
                     </Tldraw>
     ```
     стало:
     ```tsx
                     <Tldraw
                       cameraOptions={{ wheelBehavior: "pan" }}
                       components={components}
                       shapeUtils={shapeUtils}
                       // AF2.1: onMount and acceptedImageMimeTypes belong to line B (plan-B B4).
                       onMount={handleTldrawMount}
                     >
                       {presence && <PpmCanvasRealtimeCursors presence={presence} />}
                       {grammarV2 && onZoomChange && <PpmCanvasZoomReporter boardId={boardId} onZoomChange={onZoomChange} />}
                       {/* ── AF2.1 R: overlays — leaf children of <Tldraw>, never inside the components memo ── */}
                       {grammarV2 && <PpmCanvasStyleToolbar canEdit={effectiveCanEdit} />}
                       {grammarV2 && <PpmCanvasQuickConnect authorId={authorId} canEdit={effectiveCanEdit} />}
                       {/* ── /AF2.1 R ── */}
                     </Tldraw>
     ```
     `PpmCanvasNodeShapeUtil` остаётся в импорте из `./shape` (его использует `canvas-tldraw-theme.ts`; в `editor.tsx` после
     правки он не нужен — удалить из импорта, если oxlint/tsc сообщает о неиспользуемом).
  7. `CanvasControls` — v1 из UX1.1:
     - пропсы и тип: вернуть `boards` (`boards: TPpmCanvasBoard[];`) как в `201ab5f4:editor.tsx:2346, 2398`;
     - состояние: после `const projectionContext = useContext(PpmWorkItemProjectionContext);` вернуть
       ```ts
         const [pickerOpen, setPickerOpen] = useState(false);
         const [boardPickerOpen, setBoardPickerOpen] = useState(false);
       ```
     - `switch` (`:2514-2596`): после `case "add-table": … break;` вставить случаи UX1.1 (дословно `201ab5f4:editor.tsx:2518-2541`):
       ```ts
               case "add-code":
                 if (canEdit) createNode(editor, authorId, "code", ppmT("canvas.code_title"));
                 break;
               case "add-group":
                 if (canEdit) createNode(editor, authorId, "group", ppmT("canvas.group_title"));
                 break;
               case "add-frame":
                 if (canEdit) createNode(editor, authorId, "frame", ppmT("canvas.frame_title"));
                 break;
               case "add-board-link":
                 if (canEdit) setBoardPickerOpen(true);
                 break;
               case "add-work-item":
                 if (canEdit) setPickerOpen(true);
                 break;
               case "add-work-items-view":
                 if (canEdit) createNode(editor, authorId, "work_items_view", ppmT("canvas.work_items_view_title"));
                 break;
               case "add-diagram":
                 if (canEdit) createNode(editor, authorId, "diagram", ppmT("canvas.diagram_title"));
                 break;
               case "add-deck":
                 if (canEdit) createNode(editor, authorId, "deck", ppmT("canvas.deck_title"));
                 break;
       ```
       и перед `case "undo":` — размеченные блоки линий:
       ```ts
               // ── AF2.1 R: tool commands (sticky, hand, shapes menu, semantic links) — line R fills these cases ──
               case "add-sticky":
               case "select-hand":
               case "open-shapes":
                 break;
               case "open-semantic-edges":
                 if (!semanticPanelOpen) onOpenSemanticPanel();
                 break;
               // ── /AF2.1 R ──
               // ── AF2.1 B: content commands (document page, PPM document, list, file, Git object) — line B fills ──
               case "add-document-page":
               case "add-page-ref":
               case "add-file":
               case "add-git":
                 break;
               case "add-list":
                 if (canEdit) createNode(editor, authorId, "checklist", ppmT("canvas.checklist_title"));
                 break;
               // ── /AF2.1 B ──
       ```
     - рендер (`:2797-2815`): перед `{tasksPanelOpen && (` вставить пикеры UX1.1 (дословно `201ab5f4:editor.tsx:2792-2815`):
       ```tsx
             {pickerOpen && canEdit && (
               <WorkItemPicker
                 onAdd={async (source) => {
                   await onBindWorkItem(source);
                   setPickerOpen(false);
                 }}
                 onClose={() => setPickerOpen(false)}
                 onCreate={async (name) => {
                   await onCreateWorkItem(name);
                   setPickerOpen(false);
                 }}
                 onSearch={onSearchWorkItems}
               />
             )}
             {boardPickerOpen && canEdit && (
               <BoardLinkPicker
                 boards={boards.filter((board) => board.status === "active" && board.board_id !== boardId)}
                 onAdd={(board) => {
                   createNode(editor, authorId, "board_link", board.name, board.board_id);
                   setBoardPickerOpen(false);
                 }}
                 onClose={() => setBoardPickerOpen(false)}
               />
             )}
       ```
       и панели задач (второй агент) добавить `variant="panel"`: `<WorkItemPicker` → `<WorkItemPicker variant="panel"`
       в блоке `{tasksPanelOpen && (`.
  8. `WorkItemPicker` (`:3006-3176`): проп `variant = "picker"` (тип `variant?: "picker" | "panel";`); корень —
     `<section className={variant === "panel" ? "ppm-work-item-picker ppm-work-item-picker--panel" : "ppm-work-item-picker"} …>`;
     в `results.map` для `variant !== "panel"` — разметка строки UX1.1 (дословно `201ab5f4:editor.tsx:3112-3125`, `disabled`
     дополнен `addDisabled ||`):
     ```tsx
             {results.map((source) =>
               variant === "panel" ? (
                 /* текущий блок <div className="ppm-work-item-picker__row" …> … </div> без изменений */
               ) : (
                 <button
                   type="button"
                   disabled={addDisabled || Boolean(actionId)}
                   key={source.identity.entity_id}
                   onClick={() => void add(source)}
                 >
                   <span>
                     <strong>{source.display.title}</strong>
                     <small>
                       {source.identity.identifier} · {source.display.state?.name ?? ppmT("canvas.work_item_no_state")}
                     </small>
                   </span>
                   <Plus aria-hidden="true" />
                 </button>
               )
             )}
     ```
     (комментарий-заглушку в первой ветке заменить существующим блоком `<div className="ppm-work-item-picker__row" …>` —
     он переносится как есть, с `key`).
  9. Вернуть функцию `BoardLinkPicker` дословно из `201ab5f4:editor.tsx:3151-3189` перед `function SemanticEdgesPanel(`:
     `git -C $PF show 201ab5f4:apps/web/core/components/ppm-canvas/editor.tsx | sed -n '3151,3189p'` — первая строка
     `function BoardLinkPicker({`, последняя `}`, 39 строк.

- [ ] **Step 7: `shape.tsx` — чек-лист и таблица v1, ссылка на задачу только v2**
  1. `:760-764` — было:
     ```tsx
               {node.kind === "checklist" && (
                 <ChecklistEditor editor={editor} node={node} readonly={readonly} shape={shape} />
               )}
               {node.kind === "table" && <TableEditor editor={editor} node={node} readonly={readonly} shape={shape} />}
     ```
     стало:
     ```tsx
               {node.kind === "checklist" &&
                 (grammarV2 ? (
                   <ChecklistEditor editor={editor} node={node} readonly={readonly} shape={shape} />
                 ) : (
                   <ChecklistEditorV1 editor={editor} node={node} readonly={readonly} shape={shape} />
                 ))}
               {node.kind === "table" &&
                 (grammarV2 ? (
                   <TableEditor editor={editor} node={node} readonly={readonly} shape={shape} />
                 ) : (
                   <TableEditorV1 editor={editor} node={node} readonly={readonly} shape={shape} />
                 ))}
     ```
  2. Сразу после конца текущей `TableEditor` (закрывающая `}` на `:1062`) вставить
     `ChecklistEditorV1` (UX1.1 `201ab5f4:shape.tsx:812-901` с одной заменой — переключатель, F-D6):
     ```tsx
     function ChecklistEditorV1({
       editor,
       node,
       readonly,
       shape,
     }: {
       editor: Editor;
       node: Extract<TPpmCanvasOwnedNode, { kind: "checklist" }>;
       readonly: boolean;
       shape: TPpmCanvasShape;
     }) {
       const ppmT = usePpmTranslation();
       return (
         <div className="ppm-canvas-checklist">
           {node.items.map((item) => (
             <label key={item.id}>
               {/* AF2.1 F2: the only v1 change against UX1.1 — the clicks fix. tldraw intercepts native checkbox clicks
                   inside shapes, so the toggle is a button with checkbox semantics (as under v2). */}
               <button
                 type="button"
                 // oxlint-disable-next-line jsx_a11y/prefer-tag-over-role
                 role="checkbox"
                 className="ppm-canvas-checklist__toggle"
                 aria-label={item.text || ppmT("canvas.checklist_item")}
                 aria-checked={item.checked}
                 disabled={readonly}
                 onClick={(event) => {
                   event.stopPropagation();
                   updateNode(editor, shape, node, {
                     items: node.items.map((current) =>
                       current.id === item.id ? { ...current, checked: !item.checked } : current
                     ),
                   });
                 }}
                 onKeyDown={stopEventPropagation}
                 onPointerDown={stopEventPropagation}
               >
                 {item.checked ? "✓" : ""}
               </button>
               <input
                 value={item.text}
                 disabled={readonly}
                 maxLength={1_000}
                 onChange={(event) =>
                   updateNode(editor, shape, node, {
                     items: node.items.map((current) =>
                       current.id === item.id ? { ...current, text: event.currentTarget.value } : current
                     ),
                   })
                 }
                 onKeyDown={stopEventPropagation}
                 onPointerDown={stopEventPropagation}
               />
               {!readonly && (
                 <button
                   type="button"
                   aria-label={ppmT("canvas.node_remove")}
                   onClick={stopEventPropagation}
                   onKeyDown={(event) =>
                     runCanvasKeyboardAction(event, () =>
                       updateNode(editor, shape, node, { items: node.items.filter((current) => current.id !== item.id) })
                     )
                   }
                   onPointerDown={(event) =>
                     runCanvasPointerAction(event, () =>
                       updateNode(editor, shape, node, { items: node.items.filter((current) => current.id !== item.id) })
                     )
                   }
                 >
                   <Trash2 aria-hidden="true" />
                 </button>
               )}
             </label>
           ))}
           {!readonly && (
             <button
               type="button"
               onClick={stopEventPropagation}
               onKeyDown={(event) =>
                 runCanvasKeyboardAction(event, () =>
                   updateNode(editor, shape, node, {
                     items: [...node.items, { id: crypto.randomUUID(), text: "", checked: false }],
                   })
                 )
               }
               onPointerDown={(event) =>
                 runCanvasPointerAction(event, () =>
                   updateNode(editor, shape, node, {
                     items: [...node.items, { id: crypto.randomUUID(), text: "", checked: false }],
                   })
                 )
               }
             >
               <Plus aria-hidden="true" />
               {ppmT("canvas.checklist_add_item")}
             </button>
           )}
         </div>
       );
     }
     ```
     и `TableEditorV1` — дословно `201ab5f4:shape.tsx:903-1027` с переименованием:
     ```bash
     git -C $PF show 201ab5f4:apps/web/core/components/ppm-canvas/shape.tsx | sed -n '903,1027p' \
       | sed '1s/^function TableEditor(/function TableEditorV1(/' > /tmp/af21-table-v1.tsx
     wc -l < /tmp/af21-table-v1.tsx   # 125
     md5 -q /tmp/af21-table-v1.tsx    # bc9a81c39d09cf56a063fade45a8c93f
     ```
     содержимое `/tmp/af21-table-v1.tsx` вставить после `ChecklistEditorV1` (первая строка `function TableEditorV1({`).
  3. Кнопка «Скопировать ссылку на задачу» в `WorkItemProjectionCard` (`:2433-2454`): условие
     `{identity.source_url && (` → `{grammarV2 && identity.source_url && (` (`grammarV2` уже объявлен в функции, `:2266`).

- [ ] **Step 8: Заглушки точек монтирования** (полное содержимое):
  - `canvas-style-toolbar.tsx`:
    ```tsx
    // AF2.1 mount point (F2). Line R (R3) renders the contextual style toolbar here (K2/K3): colour, text size, font,
    // fill, shape for tldraw shapes; palette colour for PPM cards. A leaf child of <Tldraw> (editor.tsx), rendered only
    // under the v2 grammar — never inside the InFrontOfTheCanvas memo, which remounts on every autosave.
    export type TPpmCanvasStyleToolbarProps = { canEdit: boolean };

    export function PpmCanvasStyleToolbar(_props: TPpmCanvasStyleToolbarProps) {
      return null;
    }
    ```
  - `canvas-quick-connect.tsx`:
    ```tsx
    // AF2.1 mount point (F2). Line R (R4) renders the four «+» around a single selected shape/card here (K2).
    // A leaf child of <Tldraw> (editor.tsx), rendered only under the v2 grammar.
    export type TPpmCanvasQuickConnectProps = { authorId: string; canEdit: boolean };

    export function PpmCanvasQuickConnect(_props: TPpmCanvasQuickConnectProps) {
      return null;
    }
    ```
  - `canvas-tldraw-theme.ts`:
    ```ts
    // AF2.1 mount point (F2). Line R (R2) recolours tldraw's DefaultColorThemePalette to the PPM palette and configures
    // the native note/frame utils. editor.tsx calls getPpmCanvasShapeUtils(grammarV2) once per mount (useMemo), before
    // <Tldraw> mounts; v1 must get tldraw's defaults back (the palette object is global).
    import type { TLAnyShapeUtilConstructor } from "tldraw";
    import { PpmCanvasNodeShapeUtil } from "./shape";

    export function applyPpmCanvasTldrawTheme(_grammarV2: boolean): void {}

    export function getPpmCanvasShapeUtils(grammarV2: boolean): TLAnyShapeUtilConstructor[] {
      applyPpmCanvasTldrawTheme(grammarV2);
      return [PpmCanvasNodeShapeUtil];
    }
    ```
  - `canvas-external-content.ts`:
    ```ts
    // AF2.1 mount point (F2). Line B registers tldraw external content handlers here ('files' → Vault → live card,
    // 'url' without network, 'svg-text'), variant A of ruling R5, and calls this from its handleTldrawMount block in
    // editor.tsx (v2 grammar only). Handlers register once and read fresh state through getDeps(); returns a cleanup.
    import type { Editor } from "tldraw";

    /** Line B extends this type with what its handlers need (uploads, bindings, placement). */
    export type TPpmCanvasExternalContentDeps = { canEdit: boolean };

    export function registerPpmCanvasExternalContent(
      _editor: Editor,
      _getDeps: () => TPpmCanvasExternalContentDeps
    ): () => void {
      return () => undefined;
    }
    ```
  - `canvas-toolkit.css`:
    ```css
    /*
     * AF2.1 line R: grouped rail (K1), style toolbar (K2/K3), quick connect «+» (K2), PPM palette for cards.
     * Every selector starts with :where(html[data-ppm-design="v2"]) — облик v1 не меняется (af21-foundation.test.ts).
     * Created empty by F2; imported after canvas-v2.css.
     */
    ```
  - `canvas-content.css`:
    ```css
    /*
     * AF2.1 line B: note (Markdown, KaTeX), code block, document, list, file previews (K3/K4).
     * Every selector starts with :where(html[data-ppm-design="v2"]) — облик v1 не меняется (af21-foundation.test.ts).
     * Created empty by F2; imported after canvas-toolkit.css.
     */
    ```

- [ ] **Step 9: `canvas.css` — вернуть v1 (правила второго агента, общие для обоих обликов)**
  Точные правки (номера — текущий файл):
  1. `:17-19` `.ppm-canvas-workspace[data-rail-expanded] { --ppm-canvas-rail-width: 14.5rem; }` → `13.375rem`.
     Правила `.ppm-canvas-board-copy*` (`:21-40`) оставить (кнопка теперь только под v2).
  2. `.ppm-canvas-rail__brand` (`:2002-2014`): удалить строки `position: sticky;`, `top: 0;`, `z-index: 2;`; `padding: 0 0.5625rem;`
     → `padding: 0 0.25rem;`. Удалить правило `.ppm-canvas-rail__brand:focus-visible { … }` (`:2021-2024`).
     `.ppm-canvas-rail__brand > svg` (`:2041-2046`): `width: 1.2rem; height: 1.2rem;` → `width: 0.875rem; height: 0.875rem;`,
     `color: var(--txt-primary);` → `color: var(--txt-tertiary);`.
  3. Удалить правила `.ppm-canvas-rail-tooltip` и `.ppm-canvas-shape-menu`, `.ppm-canvas-shape-menu button`,
     `.ppm-canvas-shape-menu button:hover, .ppm-canvas-shape-menu button:focus-visible`, `.ppm-canvas-shape-menu svg`
     (`:2048-2095`) — разметки больше нет (R1 строит свои меню в `canvas-toolkit.css`).
  4. `.ppm-canvas-node` (`:3391`) — `pointer-events: auto;` **оставить**.
  5. Чек-лист (`:3958-3984`): селектор `.ppm-canvas-checklist__item {` → `.ppm-canvas-checklist > label,\n.ppm-canvas-checklist__item {`;
     в списке `.ppm-canvas-checklist input[type="text"], .ppm-canvas-checklist__item > input:not([type="checkbox"]), …`
     добавить `.ppm-canvas-checklist label > input:not([type="checkbox"]),` вторым селектором. `.ppm-canvas-checklist__toggle*`
     оставить (v1 использует переключатель, F-D6).
  6. Таблица (`:4032-4068`): каждый селектор блока второго агента получает префикс `[data-ppm-canvas-grammar="v2"] `:
     `.ppm-canvas-table th {` → `[data-ppm-canvas-grammar="v2"] .ppm-canvas-table th {`; то же для `th input`, `td input`,
     `th button`, `__row-action button`, `:hover`-пары, `svg`-пары и `.ppm-canvas-table__row-action`.
  7. Пикер (`:4103-4115`) — было:
     ```css
       pointer-events: auto;
       position: absolute;
       z-index: 325;
       top: 0.75rem;
       right: 0.75rem;
       bottom: 0.75rem;
       display: grid;
       width: min(25rem, calc(100% - 1.5rem));
       max-height: calc(100% - 1.5rem);
       grid-template-rows: auto auto minmax(0, 1fr) auto auto;
       padding: 0.75rem;
     ```
     стало (UX1.1, `201ab5f4:canvas.css:3972-3983`):
     ```css
       pointer-events: auto;
       position: absolute;
       z-index: 325;
       bottom: 4.25rem;
       left: 50%;
       display: grid;
       width: min(28rem, calc(100% - 1.5rem));
       max-height: min(34rem, calc(100% - 7rem));
       padding: 0.75rem;
       transform: translateX(-50%);
     ```
     и сразу после правила `.ppm-work-item-picker { … }` добавить модификатор панели (значения второго агента):
     ```css
     /* AF2.1 F2: «Задачи и бэклог» (v2) — right-side panel; the picker (v1, «Добавить задачу») stays bottom-centre. */
     .ppm-work-item-picker--panel {
       top: 0.75rem;
       right: 0.75rem;
       bottom: 0.75rem;
       left: auto;
       width: min(25rem, calc(100% - 1.5rem));
       max-height: calc(100% - 1.5rem);
       grid-template-rows: auto auto minmax(0, 1fr) auto auto;
       transform: none;
     }

     .ppm-work-item-picker--panel .ppm-work-item-picker__results {
       max-height: none;
     }
     ```
     `.ppm-work-item-picker__results` (`:4189-4195`): `min-height: 0;` → `max-height: 17rem;\n  min-height: 0;`.
     Правила `__row`, `__copy`, `.ppm-work-items-view--compact*`, `.ppm-work-item-card__copy` оставить (разметка только v2).
  8. `@media (max-width: 1279px) {` (`:5063`) → `@media (max-width: 980px) {`; внутри: `width: min(14.5rem, …)` →
     `width: min(13.375rem, calc(100vw - 4rem));`; в списке скрываемых вернуть `.ppm-canvas-rail__brand > svg,` после
     `.ppm-canvas-rail__brand > strong,`; после правила `… [data-rail-expanded] .ppm-canvas-rail__label { display: block; }`
     вернуть:
     ```css
       .ppm-canvas-workspace[data-rail-expanded] .ppm-canvas-rail__brand > svg {
         display: inline;
       }
     ```
  Контроль: `diff <(git -C $PF show 201ab5f4:apps/web/core/components/ppm-canvas/canvas.css) $PF/apps/web/core/components/ppm-canvas/canvas.css`
  показывает только: `.ppm-canvas-board-copy*`, `pointer-events: auto`, чек-лист (`__item`, `__toggle`), табличные правила
  с префиксом v2, `--panel`, `__row`/`__copy`, `--compact`, `__copy` карточки.

- [ ] **Step 10: Прогнать тесты**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/af21-foundation.test.ts tests/ppm-canvas/status-line.test.ts`
  → зелёные. Затем весь web: `./node_modules/.bin/vitest run` → `Test Files 58 passed (58)`, `Tests 363 passed (363)`
  (350 + 13). web tsc → без вывода. oxlint → `Found 719 warnings and 0 errors.` (новых предупреждений нет:
  неиспользуемые импорты удалены, `_props`/`_editor`/`_getDeps`/`_grammarV2` — префикс `_`; модуль вставки F2 не импортирует — его
  импортирует B).
  Формат: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/components/ppm-canvas/{canvas-rail-legacy,canvas-rail,canvas-style-toolbar,canvas-quick-connect,workspace,editor,shape}.tsx core/components/ppm-canvas/{canvas-tldraw-theme,canvas-external-content,commands,board-workspace-state}.ts tests/ppm-canvas/af21-foundation.test.ts tests/ppm-canvas/status-line.test.ts`.
  Самопроверка: `$T/af21-diff.sh apps/web/core/components/ppm-canvas apps/web/tests/ppm-canvas | less`.

- [ ] **Step 11: Живая проверка (делает контроллер на доске «Тест Холста», проект 228)**
  - `localStorage.ppm_design="v1"` + перезагрузка: рейка UX1.1 (знак PPM, «Холст», «Доски», «Узлы» с ⇧N/⇧G/⇧T, «Вид» с
    «Показать всё», «Приблизить», «Отдалить»; при развёрнутой — выравнивание); `⇧T` открывает «Добавить задачу» снизу по
    центру; «Ссылка на доску» создаёт карточку; чек-лист: отметка пункта переключается, «Добавить пункт» работает; таблица
    без кнопок удаления; нет кнопки копирования ссылки в шапке; e2e-имя «Добавить заметку ⇧N» у кнопки развёрнутой рейки.
  - `localStorage.removeItem("ppm_design")` + перезагрузка (v2): рейка UX1.1 v2-ветки; палитра команд содержит «Задачи и
    бэклог» и инструменты фигур; `⇧T` открывает панель справа; копирование ссылки на доску работает.

**Приёмка F2:**
- [ ] Спецификация E / рулинг R7: облик v1 — как в конце UX1.1 + исправление кликов; всё новое — под v2.
- [ ] Регрессии `other-agent-analysis` №1 (смысловые связи: рейка v1/v2 и палитра), №2 (масштаб v1), №4 (секции/рамки
  из интерфейса), №5 (новые рейка/чек-лист/таблица/панель/стили не действуют в v1), №9 (бренд в рейке, брейкпойнт),
  №10 (BoardLinkPicker, проп `boards`) — закрыты для v1; для v2 они закрываются рейкой R1.
- [ ] CONTRACTS §2: точки монтирования созданы; R и B правят только свои модули и размеченные блоки `editor.tsx`.
- [ ] Проверки: web 58/363, tsc 0, oxlint 719/0; пакеты не менялись.


---

## Линия R — панель и фигуры (параллельно с B и S после F)

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

### Task 3 (R1): Модель тулкита и плавающая рейка v2 по группам (K1)

**Files:**
- Create: `$D/canvas-toolkit-model.ts`, `apps/web/tests/ppm-canvas/toolkit-model.test.ts`, `apps/web/tests/ppm-canvas/rail-v2.test.ts`.
- Modify: `$D/canvas-rail.tsx` (заглушка F2 → рейка целиком), `$D/commands.ts` (массив и `TPpmCanvasCommandDetail`),
  `$D/board-workspace-state.ts` (`READ_ONLY_COMMANDS_V2`), `$D/workspace.tsx` (`runCanvasCommand`, клавиши, слот рейки),
  `$D/editor.tsx` (R-блок команд), `$D/canvas-toolkit.css`, `packages/ppm-brand/src/translations/af21-canvas.ts` (блок R).

**Interfaces:**
- Consumes (F2): `TPpmCanvasRailProps` (`canvas-rail-legacy.tsx`), слот `{designV2 ? <PpmCanvasRail {...railProps} /> : …}`
  (`workspace.tsx`), R-блок `switch` в `CanvasControls` (`editor.tsx`), команды `add-sticky`, `select-hand`, `open-shapes`,
  `open-semantic-edges`, `add-document-page`, `add-page-ref`, `add-list`, `add-file`, `add-git`, `add-work-item`,
  `add-work-items-view`, `add-code`, `add-table`, `add-note`, `add-frame`, `add-board-link`, `open-tasks`, `draw-*`;
  строки `canvas.rail.*`, `canvas.shape.*` (F1); `fillCanvasTemplate` (`canvas-grammar.ts:76-80`).
- Produces: модель (таблица имён), `PpmCanvasRail(props: TPpmCanvasRailProps & { onDrawGeo(geo), onFind() })`,
  `PpmGeoGlyph`, команды `draw-geo`/`open-find`/`open-board-panel`, `TPpmCanvasCommandDetail.geo?: TPpmGeo`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  $T/af21-pre.sh $D/canvas-toolkit-model.ts apps/web/tests/ppm-canvas/toolkit-model.test.ts \
    apps/web/tests/ppm-canvas/rail-v2.test.ts $D/canvas-rail.tsx $D/commands.ts $D/board-workspace-state.ts \
    $D/workspace.tsx $D/editor.tsx $D/canvas-toolkit.css packages/ppm-brand/src/translations/af21-canvas.ts
  ```
  (файлы F2 уже имеют pre-image — скрипт их пропустит.)

- [ ] **Step 2: Падающий тест модели** — `apps/web/tests/ppm-canvas/toolkit-model.test.ts` (покрывает модель всех задач R;
  проверено на копии модуля: 12/12):
  ```ts
  // AF2.1 line R: rail groups and shortcuts (R1), PPM palette for tldraw (R2/R3), quick connect placement (R4),
  // object counter (R5). Pure data — no tldraw runtime.
  import { describe, expect, it } from "vitest";
  import type { TLDefaultColorTheme } from "tldraw";
  import {
    PPM_GEO_SHAPES,
    PPM_PALETTE_HEX,
    PPM_QUICK_CONNECT_GAP,
    PPM_QUICK_CONNECT_SHAPES,
    PPM_RAIL_MENUS,
    isCountedCanvasShape,
    paintPpmColorTheme,
    placeQuickConnectShape,
    ppmColorForTldraw,
    quickConnectAnchors,
    quickConnectHandlePoints,
    railShortcutCommand,
    railShortcutLabel,
    tldrawColorForPpm,
    visibleRailMenuItems,
    type TPpmBox,
  } from "@/components/ppm-canvas/canvas-toolkit-model";

  const PALETTE = ["neutral", "yellow", "orange", "terracotta", "pink", "violet", "blue", "cyan", "green"] as const;
  const TL_NAMES = [
    "black",
    "grey",
    "light-violet",
    "violet",
    "blue",
    "light-blue",
    "yellow",
    "orange",
    "green",
    "light-green",
    "light-red",
    "red",
    "white",
  ] as const;
  const key = { altKey: false, ctrlKey: false, metaKey: false, shiftKey: false };

  function fakeTheme(): TLDefaultColorTheme {
    const entry = (name: string) => ({
      solid: `solid-${name}`,
      semi: `semi-${name}`,
      pattern: `pattern-${name}`,
      fill: `fill-${name}`,
      frame: { headingStroke: "h", headingFill: "h", stroke: "s", fill: "f", text: "t" },
      note: { fill: `note-${name}`, text: "t" },
      highlight: { srgb: `hl-${name}`, p3: `p3-${name}` },
    });
    return {
      id: "light",
      text: "#000000",
      background: "#f9fafb",
      solid: "#fcfffe",
      ...Object.fromEntries(TL_NAMES.map((name) => [name, entry(name)])),
    } as TLDefaultColorTheme;
  }

  const overlap = (a: TPpmBox, b: TPpmBox) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  describe("rail (R1)", () => {
    it("maps bare V/H/S/T/P by e.code (Russian layout too) and ignores modified presses", () => {
      expect(railShortcutCommand({ ...key, code: "KeyV" })).toBe("select");
      expect(railShortcutCommand({ ...key, code: "KeyH" })).toBe("select-hand");
      expect(railShortcutCommand({ ...key, code: "KeyS" })).toBe("add-sticky");
      expect(railShortcutCommand({ ...key, code: "KeyT" })).toBe("draw-text");
      expect(railShortcutCommand({ ...key, code: "KeyP" })).toBe("draw-pen");
      expect(railShortcutCommand({ ...key, code: "KeyS", shiftKey: true })).toBeUndefined();
      expect(railShortcutCommand({ ...key, code: "KeyV", metaKey: true })).toBeUndefined();
      expect(railShortcutCommand({ ...key, code: "KeyN" })).toBeUndefined();
      expect(railShortcutLabel("select")).toBe("V / М");
      expect(railShortcutLabel("add-sticky")).toBe("S / Ы");
      expect(railShortcutLabel("add-note")).toBeUndefined();
    });

    it("groups the menus as in K1", () => {
      expect(PPM_RAIL_MENUS.docs.items.map((item) => item.command)).toEqual([
        "add-note",
        "add-document-page",
        "add-list",
        "add-table",
        "add-code",
        "open-shapes",
      ]);
      expect(PPM_RAIL_MENUS.project.items.map((item) => item.command)).toEqual([
        "add-work-item",
        "add-work-items-view",
        "add-file",
        "add-git",
        "add-page-ref",
      ]);
      expect(PPM_RAIL_MENUS.shapes.items).toHaveLength(PPM_GEO_SHAPES.length);
      for (const item of PPM_RAIL_MENUS.docs.items) expect(item.hintKey, item.command).toBeDefined();
      for (const item of PPM_RAIL_MENUS.project.items) expect(item.sourceKey, item.command).toBeDefined();
    });

    it("offers a read-only viewer only the read-only items", () => {
      expect(visibleRailMenuItems(PPM_RAIL_MENUS.docs, false)).toEqual([]);
      expect(visibleRailMenuItems(PPM_RAIL_MENUS.more, false).map((item) => item.command)).toEqual([
        "open-find",
        "open-tasks",
        "open-board-panel",
      ]);
      expect(visibleRailMenuItems(PPM_RAIL_MENUS.more, true)).toHaveLength(4);
    });

    it("uses only tldraw 3.15.6 geo types and continues with the K2 shapes", () => {
      const tldrawGeo = new Set([
        "cloud",
        "rectangle",
        "ellipse",
        "triangle",
        "diamond",
        "pentagon",
        "hexagon",
        "octagon",
        "star",
        "rhombus",
        "rhombus-2",
        "oval",
        "trapezoid",
        "arrow-right",
        "arrow-left",
        "arrow-up",
        "arrow-down",
        "x-box",
        "check-box",
        "heart",
      ]);
      for (const shape of PPM_GEO_SHAPES) expect(tldrawGeo.has(shape.geo), shape.geo).toBe(true);
      expect(PPM_QUICK_CONNECT_SHAPES).toEqual(["rectangle", "diamond", "ellipse", "rhombus"]);
    });
  });

  describe("palette (R2/R3)", () => {
    it("round-trips every PPM colour through tldraw for shapes and stickers", () => {
      for (const color of PALETTE)
        for (const kind of ["note", "shape"] as const)
          expect(ppmColorForTldraw(tldrawColorForPpm(color, kind), kind), `${kind}:${color}`).toBe(color);
    });

    it("reads tldraw's default colour as the yellow sticker and the neutral shape", () => {
      expect(ppmColorForTldraw("black", "note")).toBe("yellow");
      expect(ppmColorForTldraw("black", "shape")).toBe("neutral");
      expect(ppmColorForTldraw("light-green", "shape")).toBe("green");
    });

    it("paints stickers, strokes and fills with the K2 values and keeps the original untouched", () => {
      const original = fakeTheme();
      const painted = paintPpmColorTheme(original, "light");
      expect(painted.yellow.note.fill).toBe(PPM_PALETTE_HEX.light.yellow.fill);
      expect(painted.orange.solid).toBe(PPM_PALETTE_HEX.light.orange.stroke);
      expect(painted.orange.semi).toBe(PPM_PALETTE_HEX.light.orange.fill);
      expect(painted["light-red"].note.fill).toBe(PPM_PALETTE_HEX.light.pink.fill);
      expect(painted.black.note.fill).toBe(PPM_PALETTE_HEX.light.yellow.fill);
      expect(painted.black.solid).toBe("#1d1a17");
      expect(painted.white.note.fill).toBe("#ffffff");
      expect(painted.yellow.highlight.srgb).toBe("hl-yellow");
      expect(original.yellow.note.fill).toBe("note-yellow");
      expect(paintPpmColorTheme(original, "light")).toEqual(painted);
    });

    it("gives every colour its own sticker fill in both themes", () => {
      for (const mode of ["light", "dark"] as const) {
        const fills = PALETTE.map((color) => PPM_PALETTE_HEX[mode][color].fill);
        expect(new Set(fills).size, mode).toBe(PALETTE.length);
      }
    });
  });

  describe("quick connect (R4)", () => {
    const source: TPpmBox = { x: 0, y: 0, w: 200, h: 100 };
    const size = { w: 200, h: 100 };

    it("puts the new shape one gap away, centred on the source axis", () => {
      expect(placeQuickConnectShape(source, "right", size, [source])).toEqual({ x: 200 + PPM_QUICK_CONNECT_GAP, y: 0, w: 200, h: 100 });
      expect(placeQuickConnectShape(source, "down", size, [source])).toEqual({ x: 0, y: 100 + PPM_QUICK_CONNECT_GAP, w: 200, h: 100 });
      expect(placeQuickConnectShape(source, "left", { w: 100, h: 60 }, [source])).toEqual({
        x: -PPM_QUICK_CONNECT_GAP - 100,
        y: 20,
        w: 100,
        h: 60,
      });
      expect(placeQuickConnectShape(source, "up", size, [source]).y).toBe(-PPM_QUICK_CONNECT_GAP - 100);
    });

    it("never overlaps an existing object and supports many links from one shape", () => {
      const occupied: TPpmBox[] = [source];
      for (let index = 0; index < 6; index++) {
        const placed = placeQuickConnectShape(source, "right", size, occupied);
        for (const box of occupied) expect(overlap(placed, box), `${index}`).toBe(false);
        occupied.push(placed);
      }
      expect(occupied).toHaveLength(7);
    });

    it("anchors the arrow on the facing sides and puts the «+» outside each side", () => {
      expect(quickConnectAnchors("right")).toEqual({ start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } });
      expect(quickConnectAnchors("up")).toEqual({ start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } });
      expect(quickConnectHandlePoints({ x: 10, y: 20, w: 100, h: 50 }, 24)).toEqual({
        up: { x: 60, y: -4 },
        right: { x: 134, y: 45 },
        down: { x: 60, y: 94 },
        left: { x: -14, y: 45 },
      });
    });
  });

  describe("object counter (R5)", () => {
    it("counts cards, stickers, shapes, text and frames, not connections or pen strokes", () => {
      for (const type of ["ppm-canvas-node", "note", "geo", "text", "frame", "image"]) expect(isCountedCanvasShape({ type })).toBe(true);
      for (const type of ["arrow", "line", "draw", "highlight"]) expect(isCountedCanvasShape({ type })).toBe(false);
    });
  });
  ```
- [ ] **Step 3: Падающий тест разводки рейки** — `apps/web/tests/ppm-canvas/rail-v2.test.ts`:
  ```ts
  // AF2.1 R1: the grouped floating rail is v2-only, runs real e.code tools and keeps semantic links for readers.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { isCanvasCommandAllowedReadOnly } from "@/components/ppm-canvas/board-workspace-state";
  import { PPM_CANVAS_COMMANDS } from "@/components/ppm-canvas/commands";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const rail = read("canvas-rail.tsx");
  const workspace = read("workspace.tsx");
  const editor = read("editor.tsx");
  // Formatting-proof source checks: oxfmt may wrap calls/objects and add trailing commas.
  const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  describe("AF2.1 R1 rail", () => {
    it("declares the rail commands and lets readers open search, tasks, board panel and semantic links", () => {
      for (const command of ["draw-geo", "open-find", "open-board-panel"]) expect(PPM_CANVAS_COMMANDS).toContain(command);
      for (const command of ["open-find", "open-board-panel", "open-semantic-edges", "select-hand"]) {
        expect(isCanvasCommandAllowedReadOnly(command, true), command).toBe(true);
        expect(isCanvasCommandAllowedReadOnly(command, false), command).toBe(false);
      }
    });

    it("renders four menus with titled flyouts and one-line hints", () => {
      has(rail, 'aria-haspopup="menu"');
      has(rail, 'role="menuitem"');
      for (const menu of ['trigger("shapes"', 'trigger("docs"', 'trigger("project"', 'trigger("more")']) has(rail, menu);
      has(rail, "visibleRailMenuItems(definition, editReady)");
      has(rail, 'fillCanvasTemplate(ppmT("canvas.rail.with_shortcut"), { keys: shortcut, label })');
      has(rail, 'tool("open-semantic-edges", Network, ppmT("canvas.semantic_edges"))');
    });

    it("takes V/H/S/T/P by e.code only under v2, outside inputs", () => {
      has(workspace, "const toolCommand = designV2 ? railShortcutCommand(event) : undefined;");
      expect(workspace.indexOf("railShortcutCommand(event)")).toBeGreaterThan(workspace.indexOf("if (typing ||"));
      expect(workspace).toMatch(/<PpmCanvasRail\s+\{\.\.\.railProps\}\s+onDrawGeo=/);
    });

    it("handles the rail commands inside the R block of the editor", () => {
      const block = editor.slice(editor.indexOf("// ── AF2.1 R: tool commands"), editor.indexOf("// ── /AF2.1 R ──", editor.indexOf("// ── AF2.1 R: tool commands")));
      for (const needle of ['case "select-hand":', 'editor.setCurrentTool("hand")', 'case "draw-geo":', "GeoShapeGeoStyle, detail.geo", 'case "open-board-panel":'])
        has(block, needle);
    });
  });
  ```
- [ ] **Step 4: Убедиться, что тесты падают**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-model.test.ts tests/ppm-canvas/rail-v2.test.ts`
  Ожидание: FAIL — `Failed to resolve import "@/components/ppm-canvas/canvas-toolkit-model"`; `expected [ … ] to include 'draw-geo'`;
  `expected '…' to contain 'aria-haspopup="menu"'`.

- [ ] **Step 5: Строки R** — в `af21-canvas.ts`, в конец блока `// ── R: rail ──` обеих локалей:
  - en: `"canvas.rail.board_panel": "Board: objects, import and export",`, `"canvas.rail.object": "Object",`
  - ru: `"canvas.rail.board_panel": "Доска: объекты, импорт и экспорт",`, `"canvas.rail.object": "Объект",`
  Затем `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run` → `7 passed`, `86 passed`; `$T/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 6: Модель** — создать `$D/canvas-toolkit-model.ts` (полностью; `freeSpotNear` добавит R2, `isRichTextBold`/
  `setRichTextBold` — R3):
  ```ts
  // AF2.1 line R: pure data and geometry of the canvas toolkit (rail groups, shortcuts, geo shapes, PPM palette for
  // tldraw, quick-connect placement, object counter). No runtime tldraw import — covered by node-env vitest.
  import type { TPpmTranslationKey } from "@ppm/brand";
  import type { TPpmCanvasColor } from "@ppm/canvas";
  import type { TLDefaultColorTheme, TLDefaultColorThemeColor } from "tldraw";
  import type { TPpmCanvasCommand } from "./commands";

  // ─────────────── Shortcuts (e.code — the owner types on a Russian layout) ───────────────

  export type TPpmRailShortcut = {
    code: "KeyV" | "KeyH" | "KeyS" | "KeyT" | "KeyP";
    latin: string;
    cyrillic: string;
    command: TPpmCanvasCommand;
  };

  /** Real single-key tools of the v2 rail (K1): Выбор V, Рука H, Стикер S, Текст T, Перо P. */
  export const PPM_RAIL_SHORTCUTS: readonly TPpmRailShortcut[] = [
    { code: "KeyV", latin: "V", cyrillic: "М", command: "select" },
    { code: "KeyH", latin: "H", cyrillic: "Р", command: "select-hand" },
    { code: "KeyS", latin: "S", cyrillic: "Ы", command: "add-sticky" },
    { code: "KeyT", latin: "T", cyrillic: "Е", command: "draw-text" },
    { code: "KeyP", latin: "P", cyrillic: "З", command: "draw-pen" },
  ];

  /** «V / М»: the key on both layouts, as in the K1 tooltips. */
  export function railShortcutLabel(command: TPpmCanvasCommand): string | undefined {
    const shortcut = PPM_RAIL_SHORTCUTS.find((item) => item.command === command);
    return shortcut ? `${shortcut.latin} / ${shortcut.cyrillic}` : undefined;
  }

  export function railShortcutKey(command: TPpmCanvasCommand): string | undefined {
    return PPM_RAIL_SHORTCUTS.find((item) => item.command === command)?.latin;
  }

  /** Only a bare key press is a tool shortcut: Shift/Ctrl/Alt/Meta combinations belong to other commands. */
  export function railShortcutCommand(event: {
    altKey: boolean;
    code: string;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
  }): TPpmCanvasCommand | undefined {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return undefined;
    return PPM_RAIL_SHORTCUTS.find((item) => item.code === event.code)?.command;
  }

  // ─────────────── tldraw geo shapes (3.15.6 set) ───────────────

  export const PPM_GEO_SHAPES = [
    { geo: "rectangle", labelKey: "canvas.shape.rectangle" },
    // tldraw «oval» is a capsule — the rounded box of flowcharts.
    { geo: "oval", labelKey: "canvas.shape.rounded" },
    { geo: "ellipse", labelKey: "canvas.shape.ellipse" },
    { geo: "diamond", labelKey: "canvas.shape.diamond" },
    // tldraw «rhombus» is the slanted parallelogram (input/output block).
    { geo: "rhombus", labelKey: "canvas.shape.parallelogram" },
    { geo: "trapezoid", labelKey: "canvas.shape.trapezoid" },
    { geo: "triangle", labelKey: "canvas.shape.triangle" },
    { geo: "hexagon", labelKey: "canvas.shape.hexagon" },
    { geo: "cloud", labelKey: "canvas.shape.cloud" },
    { geo: "arrow-right", labelKey: "canvas.shape.arrow" },
  ] as const satisfies readonly { geo: string; labelKey: TPpmTranslationKey }[];

  export type TPpmGeo = (typeof PPM_GEO_SHAPES)[number]["geo"];

  /** K2 «Продолжить»: прямоугольник · ромб · овал · параллелограмм · ещё. */
  export const PPM_QUICK_CONNECT_SHAPES: readonly TPpmGeo[] = ["rectangle", "diamond", "ellipse", "rhombus"];

  export function isPpmGeo(value: unknown): value is TPpmGeo {
    return PPM_GEO_SHAPES.some((shape) => shape.geo === value);
  }

  export function geoLabelKey(geo: string): TPpmTranslationKey | undefined {
    return PPM_GEO_SHAPES.find((shape) => shape.geo === geo)?.labelKey;
  }

  // ─────────────── Rail groups (K1) ───────────────

  export type TPpmRailMenuItem = {
    command: TPpmCanvasCommand;
    geo?: TPpmGeo;
    labelKey: TPpmTranslationKey;
    hintKey?: TPpmTranslationKey;
    sourceKey?: TPpmTranslationKey;
    /** Reachable for a read-only viewer (the command is in READ_ONLY_COMMANDS_V2). */
    readOnly?: boolean;
  };

  export type TPpmRailMenuId = "shapes" | "docs" | "project" | "more";

  export type TPpmRailMenu = {
    id: TPpmRailMenuId;
    labelKey: TPpmTranslationKey;
    captionKey: TPpmTranslationKey;
    layout: "grid" | "list";
    items: readonly TPpmRailMenuItem[];
  };

  export const PPM_RAIL_MENUS: Readonly<Record<TPpmRailMenuId, TPpmRailMenu>> = {
    shapes: {
      id: "shapes",
      labelKey: "canvas.rail.shapes",
      captionKey: "canvas.rail.shapes_caption",
      layout: "grid",
      items: PPM_GEO_SHAPES.map(({ geo, labelKey }) => ({ command: "draw-geo" as const, geo, labelKey })),
    },
    docs: {
      id: "docs",
      labelKey: "canvas.rail.docs",
      captionKey: "canvas.rail.docs_caption",
      layout: "list",
      items: [
        { command: "add-note", labelKey: "canvas.rail.note", hintKey: "canvas.rail.note_hint" },
        { command: "add-document-page", labelKey: "canvas.rail.document", hintKey: "canvas.rail.document_hint" },
        { command: "add-list", labelKey: "canvas.rail.list", hintKey: "canvas.rail.list_hint" },
        { command: "add-table", labelKey: "canvas.rail.table", hintKey: "canvas.rail.table_hint" },
        { command: "add-code", labelKey: "canvas.rail.code", hintKey: "canvas.rail.code_hint" },
        { command: "open-shapes", labelKey: "canvas.rail.diagram", hintKey: "canvas.rail.diagram_hint" },
      ],
    },
    project: {
      id: "project",
      labelKey: "canvas.rail.project",
      captionKey: "canvas.rail.project_caption",
      layout: "list",
      items: [
        { command: "add-work-item", labelKey: "canvas.rail.work_item", sourceKey: "canvas.rail.source_tasks" },
        { command: "add-work-items-view", labelKey: "canvas.rail.work_items_view", sourceKey: "canvas.rail.source_tasks" },
        { command: "add-file", labelKey: "canvas.rail.file", sourceKey: "canvas.rail.source_vault" },
        { command: "add-git", labelKey: "canvas.rail.git", sourceKey: "canvas.rail.source_code" },
        { command: "add-page-ref", labelKey: "canvas.rail.page", sourceKey: "canvas.rail.source_pages" },
      ],
    },
    more: {
      id: "more",
      labelKey: "canvas.rail.more",
      captionKey: "canvas.rail.more_caption",
      layout: "list",
      items: [
        { command: "open-find", labelKey: "canvas.rail.find", readOnly: true },
        { command: "open-tasks", labelKey: "canvas.tasks_panel", readOnly: true },
        { command: "add-board-link", labelKey: "canvas.rail.board_link" },
        { command: "open-board-panel", labelKey: "canvas.rail.board_panel", readOnly: true },
      ],
    },
  };

  /** Items a viewer may use: everything for an editor, only `readOnly` items for a read-only viewer. */
  export function visibleRailMenuItems(menu: TPpmRailMenu, editReady: boolean): readonly TPpmRailMenuItem[] {
    return editReady ? menu.items : menu.items.filter((item) => item.readOnly);
  }

  // ─────────────── PPM palette → tldraw colours (K2/K3) ───────────────

  export type TTldrawColorName =
    | "black"
    | "grey"
    | "light-violet"
    | "violet"
    | "blue"
    | "light-blue"
    | "yellow"
    | "orange"
    | "green"
    | "light-green"
    | "light-red"
    | "red"
    | "white";

  /** For stickers, tldraw's default colour ("black") reads as the default yellow sticker; "white" is the neutral one. */
  export type TPpmStyledKind = "note" | "shape";

  const PPM_TO_TLDRAW: Record<Exclude<TPpmCanvasColor, "neutral">, TTldrawColorName> = {
    yellow: "yellow",
    orange: "orange",
    terracotta: "red",
    pink: "light-red",
    violet: "violet",
    blue: "blue",
    cyan: "light-blue",
    green: "green",
  };

  export function tldrawColorForPpm(color: TPpmCanvasColor, kind: TPpmStyledKind): TTldrawColorName {
    if (color === "neutral") return kind === "note" ? "white" : "black";
    return PPM_TO_TLDRAW[color];
  }

  export function ppmColorForTldraw(color: string, kind: TPpmStyledKind): TPpmCanvasColor {
    if (color === "black") return kind === "note" ? "yellow" : "neutral";
    if (color === "grey" || color === "white") return "neutral";
    if (color === "light-violet") return "violet";
    if (color === "light-green") return "green";
    const match = (Object.entries(PPM_TO_TLDRAW) as [TPpmCanvasColor, TTldrawColorName][]).find(([, name]) => name === color);
    return match ? match[0] : "neutral";
  }

  type TPaletteSwatch = { fill: string; stroke: string };

  /** Light values — the K2 colour panel; dark values keep the hue order at equal lightness on the graphite board. */
  export const PPM_PALETTE_HEX: Record<"light" | "dark", Record<TPpmCanvasColor, TPaletteSwatch>> = {
    light: {
      neutral: { fill: "#ffffff", stroke: "#847f7a" },
      yellow: { fill: "#fbebb2", stroke: "#847020" },
      orange: { fill: "#fddfbe", stroke: "#9d671c" },
      terracotta: { fill: "#ffdacd", stroke: "#a7593d" },
      pink: { fill: "#fbdae8", stroke: "#a0557b" },
      violet: { fill: "#e8dffc", stroke: "#7c61a8" },
      blue: { fill: "#d7e8fe", stroke: "#4773ab" },
      cyan: { fill: "#c9efee", stroke: "#2a8080" },
      green: { fill: "#d0f0d5", stroke: "#428252" },
    },
    dark: {
      neutral: { fill: "#24221f", stroke: "#a39e98" },
      yellow: { fill: "#3d3520", stroke: "#d6b958" },
      orange: { fill: "#40301f", stroke: "#e0a45c" },
      terracotta: { fill: "#42281f", stroke: "#e5886a" },
      pink: { fill: "#3f2530", stroke: "#e08ab2" },
      violet: { fill: "#2f2a42", stroke: "#b7a3eb" },
      blue: { fill: "#23304a", stroke: "#8fb3ea" },
      cyan: { fill: "#1f3a3a", stroke: "#6cc7c5" },
      green: { fill: "#243a29", stroke: "#86c796" },
    },
  };

  export const PPM_PALETTE_INK = {
    light: { text: "#1d1a17", muted: "#736e69", paper: "#ffffff" },
    dark: { text: "#ece8e3", muted: "#a39e98", paper: "#24221f" },
  } as const;

  function swatchEntry(
    base: TLDefaultColorThemeColor,
    fill: string,
    stroke: string,
    text: string,
    noteFill = fill
  ): TLDefaultColorThemeColor {
    return {
      ...base,
      solid: stroke,
      fill: stroke,
      semi: fill,
      pattern: stroke,
      frame: { headingStroke: stroke, headingFill: fill, stroke, fill, text },
      note: { fill: noteFill, text },
    };
  }

  /**
   * The PPM version of one tldraw theme, built from tldraw's original (never from an already painted one, so the call
   * is idempotent). tldraw paints stickers with `note.fill`, shape strokes with `solid`, the «solid» fill with `semi`.
   */
  export function paintPpmColorTheme(original: TLDefaultColorTheme, mode: "light" | "dark"): TLDefaultColorTheme {
    const hex = PPM_PALETTE_HEX[mode];
    const ink = PPM_PALETTE_INK[mode];
    const painted = { ...original, text: ink.text, solid: ink.paper } as TLDefaultColorTheme;
    for (const [color, name] of Object.entries(PPM_TO_TLDRAW) as [Exclude<TPpmCanvasColor, "neutral">, TTldrawColorName][])
      painted[name] = swatchEntry(original[name], hex[color].fill, hex[color].stroke, ink.text);
    painted["light-violet"] = swatchEntry(original["light-violet"], hex.violet.fill, hex.violet.stroke, ink.text);
    painted["light-green"] = swatchEntry(original["light-green"], hex.green.fill, hex.green.stroke, ink.text);
    painted.white = swatchEntry(original.white, hex.neutral.fill, hex.neutral.stroke, ink.text);
    // Default colour: ink strokes on a white fill for shapes, the yellow sticker for notes.
    painted.black = swatchEntry(original.black, hex.neutral.fill, ink.text, ink.text, hex.yellow.fill);
    painted.grey = swatchEntry(original.grey, hex.neutral.fill, ink.muted, ink.text, hex.neutral.fill);
    return painted;
  }

  // ─────────────── Quick connect «+» (K2) ───────────────

  export type TPpmBox = { x: number; y: number; w: number; h: number };
  export type TPpmDirection = "up" | "right" | "down" | "left";

  export const PPM_QUICK_CONNECT_GAP = 80;

  function overlaps(a: TPpmBox, b: TPpmBox, margin: number): boolean {
    return a.x < b.x + b.w + margin && a.x + a.w + margin > b.x && a.y < b.y + b.h + margin && a.y + a.h + margin > b.y;
  }

  /**
   * Where the continued shape goes: `gap` away from `source` in `direction`, centred on the source's axis. If that
   * spot is taken, it walks further along the direction (one shape + gap per step), then sideways (alternating), so the
   * new shape never overlaps another object — the same «без наложений» rule as findFreeNodePosition.
   */
  export function placeQuickConnectShape(
    source: TPpmBox,
    direction: TPpmDirection,
    size: { w: number; h: number },
    occupied: readonly TPpmBox[],
    gap = PPM_QUICK_CONNECT_GAP
  ): TPpmBox {
    const horizontal = direction === "left" || direction === "right";
    const sign = direction === "right" || direction === "down" ? 1 : -1;
    const base: TPpmBox = horizontal
      ? {
          x: sign > 0 ? source.x + source.w + gap : source.x - gap - size.w,
          y: source.y + (source.h - size.h) / 2,
          ...size,
        }
      : {
          x: source.x + (source.w - size.w) / 2,
          y: sign > 0 ? source.y + source.h + gap : source.y - gap - size.h,
          ...size,
        };
    const along = (horizontal ? size.w : size.h) + gap;
    const across = (horizontal ? size.h : size.w) + gap / 2;
    for (let step = 0; step < 12; step++) {
      for (const side of [0, 1, -1, 2, -2]) {
        const candidate: TPpmBox = horizontal
          ? { ...base, x: base.x + sign * step * along, y: base.y + side * across }
          : { ...base, x: base.x + side * across, y: base.y + sign * step * along };
        if (!occupied.some((box) => overlaps(candidate, box, gap / 4))) return candidate;
      }
    }
    return { ...base, x: horizontal ? base.x + sign * 12 * along : base.x, y: horizontal ? base.y : base.y + sign * 12 * along };
  }

  /** Anchor of the arrow on the source and target (tldraw normalized anchors): the facing sides' midpoints. */
  export function quickConnectAnchors(direction: TPpmDirection): {
    start: { x: number; y: number };
    end: { x: number; y: number };
  } {
    switch (direction) {
      case "up":
        return { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };
      case "right":
        return { start: { x: 1, y: 0.5 }, end: { x: 0, y: 0.5 } };
      case "down":
        return { start: { x: 0.5, y: 1 }, end: { x: 0.5, y: 0 } };
      case "left":
        return { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
    }
  }

  /** Screen position of each «+»: the middle of each side of the selection, `offset` px outside it. */
  export function quickConnectHandlePoints(bounds: TPpmBox, offset = 24): Record<TPpmDirection, { x: number; y: number }> {
    return {
      up: { x: bounds.x + bounds.w / 2, y: bounds.y - offset },
      right: { x: bounds.x + bounds.w + offset, y: bounds.y + bounds.h / 2 },
      down: { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h + offset },
      left: { x: bounds.x - offset, y: bounds.y + bounds.h / 2 },
    };
  }

  // ─────────────── Object counter (one rule for the «Доска · Объектов: N» pill and the «Объекты» list) ───────────────

  const UNCOUNTED_SHAPE_TYPES = new Set(["arrow", "line", "draw", "highlight"]);

  /** Objects are cards, stickers, shapes, text, frames, images; connections and pen strokes are not (K1, K2, K4). */
  export function isCountedCanvasShape(shape: { type: string }): boolean {
    return !UNCOUNTED_SHAPE_TYPES.has(shape.type);
  }
  ```

- [ ] **Step 7: Команды и права читателя**
  - `commands.ts`: в `PPM_CANVAS_COMMANDS` после `"open-semantic-edges",` добавить `"draw-geo",`, `"open-find",`,
    `"open-board-panel",`; в `TPpmCanvasCommandDetail` после `command: TPpmCanvasCommand;` добавить
    ```ts
      /** AF2.1 R1: the geo type for "draw-geo" (rail «Фигуры», quick connect «ещё»). */
      geo?: TPpmGeo;
    ```
    и в начало файла `import type { TPpmGeo } from "./canvas-toolkit-model";`.
  - `board-workspace-state.ts` (`READ_ONLY_COMMANDS_V2`, F2): после `"select-hand",` добавить `"open-find",`, `"open-board-panel",`.

- [ ] **Step 8: Рейка** — `$D/canvas-rail.tsx` заменить целиком:
  ```tsx
  // AF2.1 R1 (line R): the grouped floating rail of design v2 (K1). Выбор, Рука | Стикер, Текст, Фигуры ▸, Перо, Рамка,
  // Связь | Документы и текст ▸, Из проекта ▸, Смысловые связи | Ещё ▸, Отменить, Повторить. Shortcut hints are the real
  // e.code keys handled in workspace.tsx (railShortcutCommand); menus: title, caption, items with a one-line hint.
  import { useEffect, useRef, useState } from "react";
  import {
    Archive,
    BookOpen,
    Code2,
    Columns3,
    FileText,
    Frame,
    GitPullRequest,
    Hand,
    LayoutGrid,
    Link,
    List,
    ListTodo,
    MousePointer2,
    Network,
    NotebookText,
    PenTool,
    Redo2,
    Search,
    Shapes,
    Spline,
    SquareCheck,
    SquarePlus,
    StickyNote,
    Table2,
    Type,
    Undo2,
    Waypoints,
    Workflow,
    type LucideIcon,
  } from "lucide-react";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate } from "./canvas-grammar";
  import type { TPpmCanvasRailProps } from "./canvas-rail-legacy";
  import {
    PPM_RAIL_MENUS,
    railShortcutKey,
    railShortcutLabel,
    visibleRailMenuItems,
    type TPpmGeo,
    type TPpmRailMenuId,
    type TPpmRailMenuItem,
  } from "./canvas-toolkit-model";
  import type { TPpmCanvasCommand } from "./commands";

  export type { TPpmCanvasRailProps };

  export type TPpmCanvasToolkitRailProps = TPpmCanvasRailProps & {
    onDrawGeo: (geo: TPpmGeo) => void;
    onFind: () => void;
  };

  const MENU_ICONS: Record<TPpmRailMenuId, LucideIcon> = {
    shapes: Shapes,
    docs: FileText,
    project: Waypoints,
    more: SquarePlus,
  };

  const ITEM_ICONS: Partial<Record<TPpmCanvasCommand, LucideIcon>> = {
    "add-note": NotebookText,
    "add-document-page": BookOpen,
    "add-list": List,
    "add-table": Table2,
    "add-code": Code2,
    "open-shapes": Workflow,
    "add-work-item": SquareCheck,
    "add-work-items-view": Columns3,
    "add-file": Archive,
    "add-git": GitPullRequest,
    "add-page-ref": FileText,
    "open-find": Search,
    "open-tasks": ListTodo,
    "add-board-link": Link,
    "open-board-panel": LayoutGrid,
  };

  export function PpmCanvasRail({ activeTool, canEdit, editReady, onDrawGeo, onFind, onRunCommand }: TPpmCanvasToolkitRailProps) {
    const ppmT = usePpmTranslation();
    const [openMenu, setOpenMenu] = useState<TPpmRailMenuId>();
    const rootRef = useRef<HTMLDivElement>(null);
    const railRef = useRef<HTMLElement>(null);
    const triggerRefs = useRef<Partial<Record<TPpmRailMenuId, HTMLButtonElement | null>>>({});

    useEffect(() => {
      if (!openMenu) return;
      const onPointerDown = (event: PointerEvent) => {
        if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
        setOpenMenu(undefined);
      };
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        triggerRefs.current[openMenu]?.focus();
        setOpenMenu(undefined);
      };
      window.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("keydown", onKeyDown, true);
      return () => {
        window.removeEventListener("pointerdown", onPointerDown, true);
        window.removeEventListener("keydown", onKeyDown, true);
      };
    }, [openMenu]);

    const runItem = (item: TPpmRailMenuItem) => {
      if (item.command === "open-shapes") {
        setOpenMenu("shapes");
        return;
      }
      setOpenMenu(undefined);
      if (item.command === "draw-geo" && item.geo) onDrawGeo(item.geo);
      else if (item.command === "open-find") onFind();
      else onRunCommand(item.command);
    };

    const tool = (command: TPpmCanvasCommand, icon: LucideIcon, label: string, options: { disabled?: boolean; pressed?: boolean } = {}) => (
      <RailTool
        command={command}
        disabled={options.disabled}
        icon={icon}
        label={label}
        pressed={options.pressed}
        onRun={(next) => {
          setOpenMenu(undefined);
          onRunCommand(next);
        }}
      />
    );

    const trigger = (menu: TPpmRailMenuId, disabled = false) => (
      <RailMenuTrigger
        buttonRef={(element) => {
          triggerRefs.current[menu] = element;
        }}
        disabled={disabled}
        expanded={openMenu === menu}
        icon={MENU_ICONS[menu]}
        label={ppmT(PPM_RAIL_MENUS[menu].labelKey)}
        menu={menu}
        onToggle={() => setOpenMenu((current) => (current === menu ? undefined : menu))}
      />
    );

    const menuTop = openMenu ? (triggerRefs.current[openMenu]?.offsetTop ?? 0) - (railRef.current?.scrollTop ?? 0) : 0;

    return (
      <div ref={rootRef} className="ppm-canvas-toolkit">
        <aside ref={railRef} className="ppm-canvas-toolkit-rail" aria-label={ppmT("canvas.rail.label")}>
          {tool("select", MousePointer2, ppmT("canvas.rail.select"), { pressed: activeTool === "select" })}
          {tool("select-hand", Hand, ppmT("canvas.rail.hand"), { pressed: activeTool === "hand" })}
          {canEdit && (
            <>
              <span className="ppm-canvas-toolkit-rail__divider" aria-hidden="true" />
              {tool("add-sticky", StickyNote, ppmT("canvas.rail.sticky"), { disabled: !editReady })}
              {tool("draw-text", Type, ppmT("canvas.rail.text"), { disabled: !editReady, pressed: activeTool === "text" })}
              {trigger("shapes", !editReady)}
              {tool("draw-pen", PenTool, ppmT("canvas.rail.pen"), { disabled: !editReady, pressed: activeTool === "draw" })}
              {tool("add-frame", Frame, ppmT("canvas.rail.frame"), { disabled: !editReady })}
              {tool("draw-connection", Spline, ppmT("canvas.rail.connection"), {
                disabled: !editReady,
                pressed: activeTool === "arrow",
              })}
              <span className="ppm-canvas-toolkit-rail__divider" aria-hidden="true" />
              {trigger("docs", !editReady)}
              {trigger("project", !editReady)}
            </>
          )}
          {tool("open-semantic-edges", Network, ppmT("canvas.semantic_edges"))}
          <span className="ppm-canvas-toolkit-rail__divider" aria-hidden="true" />
          {trigger("more")}
          {canEdit && (
            <>
              {tool("undo", Undo2, ppmT("canvas.undo"), { disabled: !editReady })}
              {tool("redo", Redo2, ppmT("canvas.redo"), { disabled: !editReady })}
            </>
          )}
        </aside>
        {openMenu && <RailMenu editReady={editReady} menu={openMenu} top={menuTop} onRun={runItem} />}
      </div>
    );
  }

  function RailTool({
    command,
    disabled = false,
    icon: Icon,
    label,
    onRun,
    pressed,
  }: {
    command: TPpmCanvasCommand;
    disabled?: boolean;
    icon: LucideIcon;
    label: string;
    onRun: (command: TPpmCanvasCommand) => void;
    pressed?: boolean;
  }) {
    const ppmT = usePpmTranslation();
    const shortcut = railShortcutLabel(command);
    const key = railShortcutKey(command);
    return (
      <button
        type="button"
        className="ppm-canvas-toolkit-rail__tool"
        aria-keyshortcuts={key}
        aria-label={label}
        aria-pressed={pressed}
        data-active={pressed || undefined}
        disabled={disabled}
        title={shortcut ? fillCanvasTemplate(ppmT("canvas.rail.with_shortcut"), { keys: shortcut, label }) : label}
        onClick={() => onRun(command)}
      >
        <Icon aria-hidden="true" />
        {key && <kbd aria-hidden="true">{key}</kbd>}
      </button>
    );
  }

  function RailMenuTrigger({
    buttonRef,
    disabled,
    expanded,
    icon: Icon,
    label,
    menu,
    onToggle,
  }: {
    buttonRef: (element: HTMLButtonElement | null) => void;
    disabled: boolean;
    expanded: boolean;
    icon: LucideIcon;
    label: string;
    menu: TPpmRailMenuId;
    onToggle: () => void;
  }) {
    return (
      <button
        ref={buttonRef}
        type="button"
        className="ppm-canvas-toolkit-rail__tool"
        aria-expanded={expanded}
        aria-haspopup="menu"
        aria-label={label}
        data-active={expanded || undefined}
        data-menu={menu}
        disabled={disabled}
        title={label}
        onClick={onToggle}
      >
        <Icon aria-hidden="true" />
        <span className="ppm-canvas-toolkit-rail__corner" aria-hidden="true" />
      </button>
    );
  }

  function RailMenu({
    editReady,
    menu,
    onRun,
    top,
  }: {
    editReady: boolean;
    menu: TPpmRailMenuId;
    onRun: (item: TPpmRailMenuItem) => void;
    top: number;
  }) {
    const ppmT = usePpmTranslation();
    const definition = PPM_RAIL_MENUS[menu];
    const items = visibleRailMenuItems(definition, editReady);
    const firstItemRef = useRef<HTMLButtonElement>(null);
    const MenuIcon = MENU_ICONS[menu];
    useEffect(() => firstItemRef.current?.focus(), [menu]);
    return (
      <div
        className="ppm-canvas-toolkit-menu"
        data-layout={definition.layout}
        role="menu"
        aria-label={fillCanvasTemplate(ppmT("canvas.rail.menu"), { name: ppmT(definition.labelKey) })}
        style={{ top }}
      >
        <header>
          <span className="ppm-canvas-toolkit-menu__icon">
            <MenuIcon aria-hidden="true" />
          </span>
          <span>
            <strong>{ppmT(definition.labelKey)}</strong>
            <small>{ppmT(definition.captionKey)}</small>
          </span>
        </header>
        <div className="ppm-canvas-toolkit-menu__items">
          {items.map((item, index) => {
            const Icon = ITEM_ICONS[item.command];
            return (
              <button
                key={`${item.command}:${item.geo ?? ""}`}
                ref={index === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                onClick={() => onRun(item)}
              >
                {item.geo ? <PpmGeoGlyph geo={item.geo} /> : Icon && <Icon aria-hidden="true" />}
                <span>
                  <strong>{ppmT(item.labelKey)}</strong>
                  {item.hintKey && <small>{ppmT(item.hintKey)}</small>}
                </span>
                {item.sourceKey && <em>{ppmT(item.sourceKey)}</em>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const GEO_PATHS: Record<TPpmGeo, string> = {
    rectangle: "M2 3h24v14H2Z",
    oval: "M9 3h10a7 7 0 0 1 0 14H9A7 7 0 0 1 9 3Z",
    ellipse: "M2 10a12 7 0 1 0 24 0a12 7 0 1 0-24 0Z",
    diamond: "M14 2 26 10 14 18 2 10Z",
    rhombus: "M7 3h19l-5 14H2Z",
    trapezoid: "M7 3h14l5 14H2Z",
    triangle: "M14 2 26 18H2Z",
    hexagon: "M8 2h12l6 8-6 8H8l-6-8Z",
    cloud: "M8 17a5 5 0 0 1-.6-10A6 6 0 0 1 19 6a5 5 0 0 1 1 11Z",
    "arrow-right": "M2 7h15V3l9 7-9 7v-4H2Z",
  };

  /** Outline preview of a tldraw geo type (rail «Фигуры», «Продолжить», style toolbar «Форма»). */
  export function PpmGeoGlyph({ geo }: { geo: TPpmGeo }) {
    return (
      <svg className="ppm-canvas-geo-glyph" viewBox="0 0 28 20" aria-hidden="true">
        <path d={GEO_PATHS[geo]} fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth={1.5} />
      </svg>
    );
  }
  ```

- [ ] **Step 9: `workspace.tsx`**
  1. Импорт: после `import { PpmCanvasRail } from "./canvas-rail";` (F2) — `import { railShortcutCommand, type TPpmGeo } from "./canvas-toolkit-model";`.
  2. `runCanvasCommand` (`:343-347` до правок F2) — было:
     ```ts
       const runCanvasCommand = (command: TPpmCanvasCommand) => {
         if (!activeBoardId) return;
         if (!activeBoardEditReady && !isCanvasCommandAllowedReadOnly(command, designV2)) return;
         dispatchPpmCanvasCommand({ boardId: activeBoardId, command });
       };
     ```
     стало:
     ```ts
       const runCanvasCommand = (command: TPpmCanvasCommand, extra: { geo?: TPpmGeo } = {}) => {
         if (!activeBoardId) return;
         if (!activeBoardEditReady && !isCanvasCommandAllowedReadOnly(command, designV2)) return;
         dispatchPpmCanvasCommand({ boardId: activeBoardId, command, ...extra });
       };
     ```
     и в `railProps` (F2) `onRunCommand: runCanvasCommand` → `onRunCommand: (command: TPpmCanvasCommand) => runCanvasCommand(command)`.
  3. Клавиши: сразу после строки `if (typing || !activeBoardId || !editableBoardIds.has(activeBoardId)) return;` вставить:
     ```ts
           // AF2.1 R1: real single-key tools of the v2 rail, by e.code (Russian layout: М, Р, Ы, Е, З).
           const toolCommand = designV2 ? railShortcutCommand(event) : undefined;
           if (toolCommand) {
             event.preventDefault();
             event.stopImmediatePropagation();
             runCanvasCommand(toolCommand);
             return;
           }
     ```
  4. Слот (F2) — было `<PpmCanvasRail {...railProps} />`, стало:
     ```tsx
               <PpmCanvasRail
                 {...railProps}
                 onDrawGeo={(geo) => runCanvasCommand("draw-geo", { geo })}
                 onFind={() => setBrainPanelOpen(true)}
               />
     ```

- [ ] **Step 10: `editor.tsx`, R-блок команд** (`// ── AF2.1 R: tool commands …`, F2) — было:
  ```ts
          case "add-sticky":
          case "select-hand":
          case "open-shapes":
            break;
  ```
  стало (`add-sticky` наполнит R2):
  ```ts
          case "add-sticky":
          case "open-shapes":
            break;
          case "select-hand":
            editor.setCurrentTool("hand");
            break;
          case "draw-geo":
            if (canEdit && detail.geo) {
              editor.setStyleForNextShapes(GeoShapeGeoStyle, detail.geo);
              editor.setCurrentTool("geo");
            }
            break;
          case "open-board-panel":
            onToggleBoardInfo();
            break;
  ```
  (`GeoShapeGeoStyle` уже импортирован, `editor.tsx:38`; `onToggleBoardInfo` — проп `CanvasControls`; добавить его в массив
  зависимостей эффекта команд.)

- [ ] **Step 11: CSS рейки** — в `canvas-toolkit.css` после комментария:
  ```css
  /* R1 · Рейка v2 (K1): плавающая панель слева на холсте; колонка рейки сетки рабочего пространства не нужна. */
  :where(html[data-ppm-design="v2"]) .ppm-canvas-workspace,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-workspace[data-rail-expanded] {
    --ppm-canvas-rail-width: 0px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit {
    position: absolute;
    z-index: 360;
    top: calc(3.25rem + var(--ppm-canvas-overlay-inset, 1rem));
    left: var(--ppm-canvas-overlay-inset, 1rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail {
    display: flex;
    max-height: calc(100vh - 12rem);
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.25rem;
    overflow-y: auto;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
    box-shadow: var(--ppm-shadow-popover, 0 0.4rem 1.4rem rgb(0 0 0 / 0.18));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool {
    position: relative;
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    flex: none;
    place-items: center;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool:hover:not(:disabled) {
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool[data-active] {
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1-selected, var(--bg-layer-1-selected));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool:focus-visible,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu button:focus-visible {
    outline: 2px solid var(--ppm-color-focus, var(--border-accent-strong));
    outline-offset: -2px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool:disabled {
    opacity: 0.45;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool > svg {
    width: 1.125rem;
    height: 1.125rem;
    stroke-width: 1.5;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__tool > kbd {
    position: absolute;
    right: 0.125rem;
    bottom: 0;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font: 500 0.6875rem/1 var(--ppm-font-mono, monospace);
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__corner {
    position: absolute;
    right: 0.1875rem;
    bottom: 0.1875rem;
    width: 0;
    height: 0;
    border-bottom: 0.25rem solid currentColor;
    border-left: 0.25rem solid transparent;
    opacity: 0.7;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-rail__divider {
    height: 1px;
    flex: none;
    margin: 0.25rem 0.375rem;
    background: var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu {
    position: absolute;
    left: calc(100% + 0.5rem);
    display: grid;
    width: 18rem;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-lg, 0.75rem);
    background: var(--ppm-color-surface-2, var(--bg-surface-2));
    box-shadow: var(--ppm-shadow-popover, 0 0.4rem 1.4rem rgb(0 0 0 / 0.18));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu > header {
    display: grid;
    grid-template-columns: 2.25rem minmax(0, 1fr);
    align-items: center;
    gap: 0.625rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu__icon {
    display: grid;
    width: 2.25rem;
    height: 2.25rem;
    place-items: center;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu > header strong,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu__items strong {
    display: block;
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.8125rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu small,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu em {
    display: block;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    font-style: normal;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu__items {
    display: grid;
    padding: 0.25rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu[data-layout="grid"] .ppm-canvas-toolkit-menu__items {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu__items > button {
    display: grid;
    grid-template-columns: 1.25rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.625rem;
    padding: 0.5rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu[data-layout="grid"] .ppm-canvas-toolkit-menu__items > button {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu__items > button:hover {
    background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-toolkit-menu__items > button > svg {
    width: 1.125rem;
    height: 1.125rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-geo-glyph {
    width: 1.75rem !important;
    height: 1.25rem !important;
  }
  ```
  (`!important` только у размера глифа в сетке «Фигуры», чтобы перебить правило `> svg`; других нет.)

- [ ] **Step 12: Прогнать**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-model.test.ts tests/ppm-canvas/rail-v2.test.ts tests/ppm-canvas/af21-foundation.test.ts`
  → зелёные (12 + 4 + 13). Весь web → `Test Files 60 passed (60)`, `Tests 379 passed (379)`; tsc 0 (свои пути); oxlint 719/0.
  Формат: `../../node_modules/.bin/oxfmt core/components/ppm-canvas/{canvas-rail,workspace,editor}.tsx core/components/ppm-canvas/{canvas-toolkit-model,commands,board-workspace-state}.ts tests/ppm-canvas/{toolkit-model,rail-v2}.test.ts`.

**Приёмка R1:**
- [ ] Спецификация A: панель v2 по группам как K1 (заголовок, подпись, пункты с пояснением), «Фигуры ▸» — набор geo tldraw
  (прямоугольник, скруглённый, овал, ромб, параллелограмм, трапеция, треугольник, шестиугольник, облако, стрелка), «Ещё ▸»
  (найти в проекте, задачи и бэклог, ссылка на доску, объекты/импорт/экспорт), отменить/повторить; подсказки — только
  реальные клавиши.
- [ ] Регрессия №1: «Смысловые связи» есть в рейке v2 у редактора и читателя (читатель — список только для чтения).
- [ ] v1 — рейка UX1.1 (F2), клавиши V/H/S/T/P в v1 не перехватываются.

---

### Task 4 (R2): Палитра PPM для tldraw, стикер «пишешь сразу», рамки с цветом

**Files:**
- Modify: `$D/canvas-tldraw-theme.ts` (заглушка F2 → полностью), `$D/canvas-toolkit-model.ts` (+ `freeSpotNear`),
  `$D/editor.tsx` (R-блок: `add-sticky`), `$D/canvas-toolkit.css` (переменные палитры и цвета карточек PPM).
- Create: `$D/canvas-toolkit-actions.ts`, `apps/web/tests/ppm-canvas/toolkit-theme.test.ts`.

**Interfaces:**
- Consumes: `getPpmCanvasShapeUtils(grammarV2)` вызывается `editor.tsx` в `useMemo` до монтирования `<Tldraw>` (F2);
  `paintPpmColorTheme`, `PPM_PALETTE_HEX` (R1); классы `ppm-canvas-node--<цвет>` (F1, `shape.tsx` `COLOR_CLASS`).
- Produces: `applyPpmCanvasTldrawTheme(grammarV2)` (v2 — палитра PPM, v1 — исходная tldraw), `getPpmCanvasShapeUtils(grammarV2)`
  (v2: + `NoteShapeUtil.configure({ resizeMode: "scale" })`, `FrameShapeUtil.configure({ showColors: true })`),
  `createPpmSticky(editor)`, `startEditingShape(editor, id)`, `freeSpotNear(center, size, occupied)`, CSS
  `--ppm-palette-<цвет>-fill/-stroke`, `--ppm-card-accent`.

- [ ] **Step 1:** `$T/af21-pre.sh $D/canvas-toolkit-actions.ts apps/web/tests/ppm-canvas/toolkit-theme.test.ts`
- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/toolkit-theme.test.ts`:
  ```ts
  // AF2.1 R2: PPM palette for native shapes (v2 only, v1 gets tldraw's palette back), sticker placement, card colours.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { freeSpotNear, type TPpmBox } from "@/components/ppm-canvas/canvas-toolkit-model";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const overlap = (a: TPpmBox, b: TPpmBox) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  // Formatting-proof source checks: oxfmt may wrap calls/objects and add trailing commas.
  const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  describe("AF2.1 R2 theme", () => {
    it("paints the palette only under v2 and restores tldraw's original otherwise", () => {
      const theme = read("canvas-tldraw-theme.ts");
      has(theme, "structuredClone(DefaultColorThemePalette.lightMode)");
      has(theme, "const source = grammarV2 ? PPM_PALETTE : ORIGINAL_PALETTE;");
      has(theme, 'NoteShapeUtil.configure({ resizeMode: "scale" })');
      has(theme, "FrameShapeUtil.configure({ showColors: true })");
      has(theme, "grammarV2 ? [PpmCanvasNodeShapeUtil, PpmNoteShapeUtil, PpmFrameShapeUtil] : [PpmCanvasNodeShapeUtil]");
    });

    it("creates a sticker you type into right away (S / rail)", () => {
      const actions = read("canvas-toolkit-actions.ts");
      has(actions, 'editor.setCurrentTool("select.editing_shape", { shape, target: "shape" })');
      expect(read("editor.tsx")).toMatch(/case "add-sticky":\s*if \(canEdit\) createPpmSticky\(editor\);/);
    });

    it("places a new sticker at the centre, or next to whatever is there, never on top", () => {
      const size = { w: 200, h: 200 };
      expect(freeSpotNear({ x: 500, y: 300 }, size, [])).toEqual({ x: 400, y: 200, w: 200, h: 200 });
      const occupied: TPpmBox[] = [{ x: 380, y: 180, w: 240, h: 240 }];
      for (let index = 0; index < 5; index++) {
        const spot = freeSpotNear({ x: 500, y: 300 }, size, occupied);
        for (const box of occupied) expect(overlap(spot, box)).toBe(false);
        occupied.push(spot);
      }
    });

    it("colours PPM cards from the palette only under the v2 grammar", () => {
      const css = read("canvas-toolkit.css");
      for (const color of ["neutral", "yellow", "orange", "terracotta", "pink", "violet", "blue", "cyan", "green"])
        expect(css, color).toContain(`[data-ppm-canvas-grammar="v2"] .ppm-canvas-node--${color}`);
      expect(css).toContain("--ppm-palette-pink-fill: #fbdae8;");
    });
  });
  ```
- [ ] **Step 3:** `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-theme.test.ts` → FAIL
  (`freeSpotNear is not a function`, строки темы не найдены).
- [ ] **Step 4: `freeSpotNear`** — в `canvas-toolkit-model.ts` после `quickConnectHandlePoints` добавить:
  ```ts
  /** A free box of `size` centred on `center`; if something is there, the nearest free spot to the right of it. */
  export function freeSpotNear(center: { x: number; y: number }, size: { w: number; h: number }, occupied: readonly TPpmBox[]): TPpmBox {
    const box: TPpmBox = { x: center.x - size.w / 2, y: center.y - size.h / 2, ...size };
    const blocker = occupied.find((other) => overlaps(box, other, 16));
    return blocker ? placeQuickConnectShape(blocker, "right", size, occupied, 24) : box;
  }
  ```
- [ ] **Step 5: Тема** — `$D/canvas-tldraw-theme.ts` заменить целиком:
  ```ts
  // AF2.1 R2 (line R): the PPM palette for tldraw's native shapes. DefaultColorThemePalette is a global object; under v2
  // it holds the PPM values (K2/K3), under v1 tldraw's originals (v1 = end of UX1.1). editor.tsx calls
  // getPpmCanvasShapeUtils(grammarV2) in a useMemo before <Tldraw> mounts; the design never changes within a page load.
  import {
    DefaultColorThemePalette,
    FrameShapeUtil,
    NoteShapeUtil,
    type TLAnyShapeUtilConstructor,
  } from "tldraw";
  import { paintPpmColorTheme } from "./canvas-toolkit-model";
  import { PpmCanvasNodeShapeUtil } from "./shape";

  const ORIGINAL_PALETTE = {
    lightMode: structuredClone(DefaultColorThemePalette.lightMode),
    darkMode: structuredClone(DefaultColorThemePalette.darkMode),
  };

  const PPM_PALETTE = {
    lightMode: paintPpmColorTheme(ORIGINAL_PALETTE.lightMode, "light"),
    darkMode: paintPpmColorTheme(ORIGINAL_PALETTE.darkMode, "dark"),
  };

  // Stickers scale like in Miro (text grows with them); frames show their palette colour on the heading and fill.
  const PpmNoteShapeUtil = NoteShapeUtil.configure({ resizeMode: "scale" });
  const PpmFrameShapeUtil = FrameShapeUtil.configure({ showColors: true });

  export function applyPpmCanvasTldrawTheme(grammarV2: boolean): void {
    const source = grammarV2 ? PPM_PALETTE : ORIGINAL_PALETTE;
    Object.assign(DefaultColorThemePalette.lightMode, structuredClone(source.lightMode));
    Object.assign(DefaultColorThemePalette.darkMode, structuredClone(source.darkMode));
  }

  export function getPpmCanvasShapeUtils(grammarV2: boolean): TLAnyShapeUtilConstructor[] {
    applyPpmCanvasTldrawTheme(grammarV2);
    return grammarV2 ? [PpmCanvasNodeShapeUtil, PpmNoteShapeUtil, PpmFrameShapeUtil] : [PpmCanvasNodeShapeUtil];
  }
  ```
- [ ] **Step 6: Действия** — создать `$D/canvas-toolkit-actions.ts`:
  ```ts
  // AF2.1 line R: editor actions of the toolkit (sticker, edit mode, PPM card colour). Runtime tldraw — no node tests.
  import { createShapeId, type Editor, type TLNoteShape, type TLShapeId } from "tldraw";
  import { freeSpotNear, isCountedCanvasShape, type TPpmBox } from "./canvas-toolkit-model";

  const STICKER_SIZE = { w: 200, h: 200 };

  /** Page boxes of every counted object — the obstacles for new shapes («без наложений»). */
  export function occupiedBoxes(editor: Editor): TPpmBox[] {
    return editor
      .getCurrentPageShapes()
      .filter(isCountedCanvasShape)
      .map((shape) => editor.getShapePageBounds(shape))
      .filter((bounds): bounds is NonNullable<typeof bounds> => Boolean(bounds))
      .map((bounds) => ({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }));
  }

  /** Select the shape and put its label into edit mode (tldraw's startEditingShapeWithLabel, not exported in 3.15). */
  export function startEditingShape(editor: Editor, id: TLShapeId): void {
    const shape = editor.getShape(id);
    if (!shape) return;
    editor.select(id);
    editor.setEditingShape(id);
    editor.setCurrentTool("select.editing_shape", { shape, target: "shape" });
  }

  /** «Стикер» (rail, S): a yellow sticker in the free middle of the view, ready for typing. One undo step. */
  export function createPpmSticky(editor: Editor): TLShapeId {
    const id = createShapeId();
    const spot = freeSpotNear(editor.getViewportPageBounds().center, STICKER_SIZE, occupiedBoxes(editor));
    editor.markHistoryStoppingPoint("ppm add sticker");
    editor.createShape<TLNoteShape>({ id, type: "note", x: spot.x, y: spot.y, props: { color: "yellow" } });
    startEditingShape(editor, id);
    return id;
  }
  ```
- [ ] **Step 7: `editor.tsx`, R-блок** — было `case "add-sticky":\n          case "open-shapes":\n            break;`, стало:
  ```ts
          case "add-sticky":
            if (canEdit) createPpmSticky(editor);
            break;
          case "open-shapes":
            break;
  ```
  и в R-блок импортов (F2) — `import { createPpmSticky } from "./canvas-toolkit-actions";`.
- [ ] **Step 8: CSS палитры и карточек PPM** — в `canvas-toolkit.css` добавить (значения = `PPM_PALETTE_HEX`; тёмная тема —
  тот же механизм, что у токенов v2: `.dark` на `<html>` от next-themes, как в `packages/ppm-brand/src/tokens-v2.css`):
  ```css
  /* R2 · Палитра PPM (K2/K3): нейтральный + 8 оттенков равной светлоты. Совпадает с PPM_PALETTE_HEX. */
  :where(html[data-ppm-design="v2"]) {
    --ppm-palette-neutral-fill: #ffffff;
    --ppm-palette-neutral-stroke: #847f7a;
    --ppm-palette-yellow-fill: #fbebb2;
    --ppm-palette-yellow-stroke: #847020;
    --ppm-palette-orange-fill: #fddfbe;
    --ppm-palette-orange-stroke: #9d671c;
    --ppm-palette-terracotta-fill: #ffdacd;
    --ppm-palette-terracotta-stroke: #a7593d;
    --ppm-palette-pink-fill: #fbdae8;
    --ppm-palette-pink-stroke: #a0557b;
    --ppm-palette-violet-fill: #e8dffc;
    --ppm-palette-violet-stroke: #7c61a8;
    --ppm-palette-blue-fill: #d7e8fe;
    --ppm-palette-blue-stroke: #4773ab;
    --ppm-palette-cyan-fill: #c9efee;
    --ppm-palette-cyan-stroke: #2a8080;
    --ppm-palette-green-fill: #d0f0d5;
    --ppm-palette-green-stroke: #428252;
  }

  :where(html[data-ppm-design="v2"].dark) {
    --ppm-palette-neutral-fill: #24221f;
    --ppm-palette-neutral-stroke: #a39e98;
    --ppm-palette-yellow-fill: #3d3520;
    --ppm-palette-yellow-stroke: #d6b958;
    --ppm-palette-orange-fill: #40301f;
    --ppm-palette-orange-stroke: #e0a45c;
    --ppm-palette-terracotta-fill: #42281f;
    --ppm-palette-terracotta-stroke: #e5886a;
    --ppm-palette-pink-fill: #3f2530;
    --ppm-palette-pink-stroke: #e08ab2;
    --ppm-palette-violet-fill: #2f2a42;
    --ppm-palette-violet-stroke: #b7a3eb;
    --ppm-palette-blue-fill: #23304a;
    --ppm-palette-blue-stroke: #8fb3ea;
    --ppm-palette-cyan-fill: #1f3a3a;
    --ppm-palette-cyan-stroke: #6cc7c5;
    --ppm-palette-green-fill: #243a29;
    --ppm-palette-green-stroke: #86c796;
  }

  /* Карточки PPM (UX1.1: нейтральная подложка, цвет — подсказка): цвет палитры — глиф типа и полоса сверху. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--neutral { --ppm-card-accent: transparent; }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--yellow { --ppm-card-accent: var(--ppm-palette-yellow-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--orange { --ppm-card-accent: var(--ppm-palette-orange-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--terracotta { --ppm-card-accent: var(--ppm-palette-terracotta-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--pink { --ppm-card-accent: var(--ppm-palette-pink-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--violet { --ppm-card-accent: var(--ppm-palette-violet-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--blue { --ppm-card-accent: var(--ppm-palette-blue-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--cyan { --ppm-card-accent: var(--ppm-palette-cyan-stroke); }
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--green { --ppm-card-accent: var(--ppm-palette-green-stroke); }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node {
    box-shadow: inset 0 3px 0 var(--ppm-card-accent, transparent);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node .ppm-canvas-node__type-icon {
    color: var(--ppm-card-accent, var(--ppm-color-icon-subtle, var(--txt-tertiary)));
  }
  ```
  Проверка: `grep -n "\.dark\b\|:where(.dark" $PF/packages/ppm-brand/src/tokens-v2.css | head -3` — селектор тёмной темы v2
  тот же (`.dark`); если в `tokens-v2.css` используется `[data-theme="dark"]`, заменить `html[data-ppm-design="v2"].dark` на
  `html[data-ppm-design="v2"][data-theme="dark"]` (одна правка). Правило `box-shadow` не трогает секции/рамки (у них
  `.ppm-canvas-node--frame`/`--group` со своими тенями в `canvas-v2.css` — проверить глазами, что засечки не пропали; при
  конфликте добавить `:not(.ppm-canvas-node--group):not(.ppm-canvas-node--frame)`).
- [ ] **Step 9: Прогнать** — `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-theme.test.ts tests/ppm-canvas/toolkit-model.test.ts`
  → зелёные; весь web → `61 passed`, `383 passed`; tsc 0; oxlint 719/0. Формат — свои файлы.

**Приёмка R2:**
- [ ] Рулинг R1: стикер — нативная `note`: ввод сразу (S, рейка), рост/масштаб, клон-«+» tldraw, цвет из палитры PPM.
- [ ] Спецификация B: цвет PPM у фигур/стикеров/рамок в светлой и тёмной теме; секции/рамки создаются из интерфейса
  (рейка «Рамка» → `add-frame`, F2), рамки tldraw показывают цвет.
- [ ] v1: палитра tldraw исходная (при `ppm_design=v1` стикер по N — исходный жёлтый tldraw `#FCE19C`).

---

### Task 5 (R3): Панель стилей над выделением (K2/K3)

**Files:**
- Modify: `$D/canvas-style-toolbar.tsx` (заглушка F2 → полностью), `$D/canvas-toolkit-model.ts` (+ жирный в richText),
  `$D/canvas-toolkit-actions.ts` (+ цвет карточки PPM), `$D/canvas-toolkit.css`.
- Create: `apps/web/tests/ppm-canvas/toolkit-style.test.ts`.

**Interfaces:**
- Consumes: `<PpmCanvasStyleToolbar canEdit={effectiveCanEdit} />` — дочерний `<Tldraw>` под `grammarV2` (F2);
  `tldrawColorForPpm`, `ppmColorForTldraw`, `PPM_PALETTE_HEX`, `PPM_GEO_SHAPES`, `geoLabelKey` (R1); `PpmGeoGlyph` (R1);
  `PPM_CANVAS_COLORS`, `parseSerializedPpmCanvasNode`, `ppmCanvasNodeSchema`, `serializePpmCanvasNode` (`@ppm/canvas`);
  `PPM_CANVAS_SHAPE_TYPE`, `TPpmCanvasShape` (`shape.tsx`, только импорт).
- Produces: панель (`TldrawUiContextualToolbar`; не показывается, если в выделении блок кода — у него своя панель B),
  `isRichTextBold`, `setRichTextBold`, `ppmCardKind`, `ppmCardColor`, `setPpmCardColor`.

- [ ] **Step 1:** `$T/af21-pre.sh apps/web/tests/ppm-canvas/toolkit-style.test.ts`
- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/toolkit-style.test.ts`:
  ```ts
  // AF2.1 R3: the style toolbar — bold on the whole sticker text, one toolbar as a leaf of <Tldraw>, card colours.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { isRichTextBold, setRichTextBold } from "@/components/ppm-canvas/canvas-toolkit-model";

  const doc = {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Порог ΔE — " }, { type: "text", text: "12?", marks: [{ type: "italic" }] }] },
      { type: "paragraph" },
    ],
  };
  const toolbar = readFileSync(new URL("../../core/components/ppm-canvas/canvas-style-toolbar.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../../core/components/ppm-canvas/canvas-toolkit-actions.ts", import.meta.url), "utf8");
  // Formatting-proof source checks: oxfmt may wrap calls/objects and add trailing commas.
  const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  describe("AF2.1 R3 style toolbar", () => {
    it("makes the whole sticker text bold and back, keeping other marks", () => {
      expect(isRichTextBold(doc)).toBe(false);
      const bold = setRichTextBold(doc, true);
      expect(isRichTextBold(bold)).toBe(true);
      expect(JSON.stringify(bold)).toContain('"marks":[{"type":"italic"},{"type":"bold"}]');
      expect(setRichTextBold(bold, false)).toEqual(doc);
      expect(isRichTextBold({ type: "doc", content: [{ type: "paragraph" }] })).toBe(false);
    });

    it("styles tldraw shapes through the style API and PPM cards through visual.color", () => {
      for (const needle of [
        "TldrawUiContextualToolbar",
        "editor.setStyleForSelectedShapes(DefaultColorStyle",
        "editor.setStyleForSelectedShapes(DefaultSizeStyle",
        "editor.setStyleForSelectedShapes(GeoShapeGeoStyle",
        "editor.setStyleForSelectedShapes(DefaultFillStyle",
        "editor.setStyleForSelectedShapes(DefaultFontStyle",
        "setPpmCardColor(editor, cards, next)",
        "richTextEditor.chain().focus().toggleBold().run()",
      ])
        has(toolbar, needle);
      has(actions, "visual: { ...parsed.node.visual, color }");
    });

    it("stays away from the code block's own toolbar (line B)", () => {
      has(toolbar, 'if (cards.some((card) => ppmCardKind(card) === "code")) return undefined;');
    });
  });
  ```
- [ ] **Step 3:** `./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-style.test.ts` → FAIL (`isRichTextBold is not a function`,
  `expected '' to contain 'TldrawUiContextualToolbar'`).
- [ ] **Step 4: Жирный в richText** — в конец `canvas-toolkit-model.ts`:
  ```ts
  // ─────────────── Bold on a whole sticker (TipTap JSON of tldraw richText; mark name "bold" — StarterKit) ───────────────

  type TRichTextNode = { type: string; text?: string; marks?: { type: string }[]; content?: TRichTextNode[] };

  function textNodes(node: TRichTextNode): TRichTextNode[] {
    if (node.type === "text") return [node];
    return (node.content ?? []).flatMap(textNodes);
  }

  export function isRichTextBold(doc: TRichTextNode): boolean {
    const texts = textNodes(doc);
    return texts.length > 0 && texts.every((node) => node.marks?.some((mark) => mark.type === "bold"));
  }

  export function setRichTextBold<TDoc extends TRichTextNode>(doc: TDoc, bold: boolean): TDoc {
    const visit = (node: TRichTextNode): TRichTextNode => {
      if (node.type === "text") {
        const marks = (node.marks ?? []).filter((mark) => mark.type !== "bold");
        const next = bold ? [...marks, { type: "bold" }] : marks;
        const { marks: _marks, ...rest } = node;
        return next.length > 0 ? { ...rest, marks: next } : rest;
      }
      return node.content ? { ...node, content: node.content.map(visit) } : node;
    };
    return visit(doc) as TDoc;
  }
  ```
- [ ] **Step 5: Цвет карточки PPM** — в конец `canvas-toolkit-actions.ts` (и импорты в начало файла:
  `import { parseSerializedPpmCanvasNode, ppmCanvasNodeSchema, serializePpmCanvasNode, type TPpmCanvasColor } from "@ppm/canvas";`,
  `import type { TPpmCanvasShape } from "./shape";`):
  ```ts
  /** The node kind of a PPM card ("note", "code", "work_item_ref", …), or undefined for an unreadable card. */
  export function ppmCardKind(shape: TPpmCanvasShape): string | undefined {
    const parsed = parseSerializedPpmCanvasNode(shape.props.node);
    return parsed.status === "valid" || parsed.status === "migrated" ? parsed.node.kind : undefined;
  }

  /** The palette colour of a PPM card, or undefined for an unreadable card. */
  export function ppmCardColor(shape: TPpmCanvasShape): TPpmCanvasColor | undefined {
    const parsed = parseSerializedPpmCanvasNode(shape.props.node);
    return parsed.status === "valid" || parsed.status === "migrated" ? parsed.node.visual.color : undefined;
  }

  /** «Цвет» for PPM cards: visual.color of the node (F1 palette) — the same shape-props path as every card edit. */
  export function setPpmCardColor(editor: Editor, cards: readonly TPpmCanvasShape[], color: TPpmCanvasColor): void {
    const now = new Date().toISOString();
    for (const shape of cards) {
      const parsed = parseSerializedPpmCanvasNode(shape.props.node);
      if (parsed.status !== "valid" && parsed.status !== "migrated") continue;
      const node = ppmCanvasNodeSchema.parse({ ...parsed.node, visual: { ...parsed.node.visual, color }, updated_at: now });
      editor.updateShape<TPpmCanvasShape>({ id: shape.id, type: shape.type, props: { node: serializePpmCanvasNode(node) } });
    }
  }
  ```
- [ ] **Step 6: Панель** — `$D/canvas-style-toolbar.tsx` заменить целиком:
  ```tsx
  // AF2.1 R3 (line R): the compact style toolbar above the selection (K2 shape, K3 sticker). Colour for everything (PPM
  // palette), text size S/M/L, bold (stickers), shape/fill/font (by type). A leaf child of <Tldraw> under the v2 grammar.
  import { useCallback, useState } from "react";
  import { Bold, ChevronDown, Ellipsis } from "lucide-react";
  import {
    Box,
    DefaultColorStyle,
    DefaultFillStyle,
    DefaultFontStyle,
    DefaultSizeStyle,
    GeoShapeGeoStyle,
    TldrawUiContextualToolbar,
    useEditor,
    useValue,
    type Editor,
    type TLNoteShape,
    type TLShape,
  } from "tldraw";
  import { PPM_CANVAS_COLORS, type TPpmCanvasColor } from "@ppm/canvas";
  import type { TPpmTranslationKey } from "@ppm/brand";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate } from "./canvas-grammar";
  import { PpmGeoGlyph } from "./canvas-rail";
  import { ppmCardColor, ppmCardKind, setPpmCardColor } from "./canvas-toolkit-actions";
  import {
    PPM_GEO_SHAPES,
    PPM_PALETTE_HEX,
    geoLabelKey,
    isPpmGeo,
    isRichTextBold,
    ppmColorForTldraw,
    setRichTextBold,
    tldrawColorForPpm,
  } from "./canvas-toolkit-model";
  import { PPM_CANVAS_SHAPE_TYPE, type TPpmCanvasShape } from "./shape";

  export type TPpmCanvasStyleToolbarProps = { canEdit: boolean };

  type TSelection = {
    cards: TPpmCanvasShape[];
    notes: TLNoteShape[];
    others: TLShape[];
    labelKey: TPpmTranslationKey;
    showSize: boolean;
    showGeo: boolean;
    showBold: boolean;
    showMore: boolean;
  };

  const SIZES = [
    { value: "s", label: "S" },
    { value: "m", label: "M" },
    { value: "l", label: "L" },
  ] as const;
  const FILLS = [
    { value: "none", labelKey: "canvas.style.fill_none" },
    { value: "semi", labelKey: "canvas.style.fill_semi" },
    { value: "solid", labelKey: "canvas.style.fill_solid" },
  ] as const;
  const FONTS = [
    { value: "draw", labelKey: "canvas.style.font_draw" },
    { value: "sans", labelKey: "canvas.style.font_sans" },
    { value: "serif", labelKey: "canvas.style.font_serif" },
    { value: "mono", labelKey: "canvas.style.font_mono" },
  ] as const;
  const TEXT_TYPES = new Set(["note", "geo", "text", "arrow"]);

  function readSelection(editor: Editor): TSelection | undefined {
    if (editor.getInstanceState().isReadonly) return undefined;
    const shapes = editor.getSelectedShapes();
    if (shapes.length === 0) return undefined;
    const cards = shapes.filter((shape): shape is TPpmCanvasShape => shape.type === PPM_CANVAS_SHAPE_TYPE);
    // Line B's code block has its own toolbar above the card (K3): no second toolbar over it (plan-B-needs R4).
    if (cards.some((card) => ppmCardKind(card) === "code")) return undefined;
    const notes = shapes.filter((shape): shape is TLNoteShape => shape.type === "note");
    const others = shapes.filter((shape) => shape.type !== PPM_CANVAS_SHAPE_TYPE && shape.type !== "note");
    const onlyNotes = notes.length === shapes.length;
    const onlyGeo = others.length === shapes.length && others.every((shape) => shape.type === "geo");
    const labelKey: TPpmTranslationKey = onlyNotes
      ? "canvas.style.sticky_toolbar"
      : cards.length === shapes.length
        ? "canvas.style.card_toolbar"
        : "canvas.style.shape_toolbar";
    return {
      cards,
      notes,
      others,
      labelKey,
      showSize: cards.length === 0 && shapes.some((shape) => TEXT_TYPES.has(shape.type)),
      showGeo: onlyGeo,
      showBold: onlyNotes,
      showMore: cards.length === 0 && shapes.some((shape) => shape.type === "geo" || shape.type === "note" || shape.type === "text"),
    };
  }

  function sharedValue(editor: Editor, style: typeof DefaultColorStyle | typeof DefaultSizeStyle | typeof GeoShapeGeoStyle) {
    const shared = editor.getSharedStyles().get(style);
    return shared?.type === "shared" ? String(shared.value) : undefined;
  }

  export function PpmCanvasStyleToolbar({ canEdit }: TPpmCanvasStyleToolbarProps) {
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    const [panel, setPanel] = useState<"color" | "geo" | "more">();
    const selection = useValue("ppm style selection", () => (canEdit ? readSelection(editor) : undefined), [canEdit, editor]);
    const busy = useValue(
      "ppm style busy",
      () => editor.isInAny("select.translating", "select.resizing", "select.rotating", "select.brushing", "select.dragging_handle"),
      [editor]
    );
    const color = useValue(
      "ppm style colour",
      (): TPpmCanvasColor | undefined => {
        const current = readSelection(editor);
        if (!current) return undefined;
        const colors = new Set<TPpmCanvasColor>();
        for (const card of current.cards) {
          const value = ppmCardColor(card);
          if (value) colors.add(value);
        }
        const tl = sharedValue(editor, DefaultColorStyle);
        if (current.notes.length + current.others.length > 0) {
          if (!tl) return undefined;
          colors.add(ppmColorForTldraw(tl, current.others.length === 0 ? "note" : "shape"));
        }
        return colors.size === 1 ? [...colors][0] : undefined;
      },
      [editor]
    );
    const size = useValue("ppm style size", () => sharedValue(editor, DefaultSizeStyle), [editor]);
    const geo = useValue("ppm style geo", () => sharedValue(editor, GeoShapeGeoStyle), [editor]);
    const bold = useValue(
      "ppm style bold",
      () => {
        const notes = editor.getSelectedShapes().filter((shape): shape is TLNoteShape => shape.type === "note");
        return notes.length > 0 && notes.every((note) => isRichTextBold(note.props.richText));
      },
      [editor]
    );
    const getSelectionBounds = useCallback(() => {
      const bounds = editor.getSelectionScreenBounds();
      return bounds ? new Box(bounds.x, bounds.y, bounds.width, 0) : undefined;
    }, [editor]);

    if (!selection) return null;

    const applyColor = (next: TPpmCanvasColor) => {
      const cards = selection.cards;
      editor.markHistoryStoppingPoint("ppm style colour");
      editor.run(() => {
        if (selection.notes.length + selection.others.length > 0) {
          editor.setStyleForSelectedShapes(DefaultColorStyle, tldrawColorForPpm(next, "shape"));
          // Stickers read neutral as white paper, not as tldraw's default colour.
          if (selection.notes.length > 0)
            editor.updateShapes(
              selection.notes.map((note) => ({ id: note.id, type: "note" as const, props: { color: tldrawColorForPpm(next, "note") } }))
            );
          if (selection.notes.length === 0) editor.setStyleForNextShapes(DefaultColorStyle, tldrawColorForPpm(next, "shape"));
        }
        if (cards.length > 0) setPpmCardColor(editor, cards, next);
      });
      setPanel(undefined);
    };

    const applySize = (value: (typeof SIZES)[number]["value"]) => {
      editor.markHistoryStoppingPoint("ppm style size");
      editor.run(() => {
        editor.setStyleForSelectedShapes(DefaultSizeStyle, value);
        editor.setStyleForNextShapes(DefaultSizeStyle, value);
      });
    };

    const applyGeo = (value: string) => {
      if (!isPpmGeo(value)) return;
      editor.markHistoryStoppingPoint("ppm style shape");
      editor.setStyleForSelectedShapes(GeoShapeGeoStyle, value);
      setPanel(undefined);
    };

    const toggleBold = () => {
      const richTextEditor = editor.getRichTextEditor();
      if (editor.getEditingShapeId() && richTextEditor) {
        richTextEditor.chain().focus().toggleBold().run();
        return;
      }
      editor.markHistoryStoppingPoint("ppm style bold");
      editor.updateShapes(
        selection.notes.map((note) => ({
          id: note.id,
          type: "note" as const,
          props: { richText: setRichTextBold(note.props.richText, !bold) },
        }))
      );
    };

    const colorName = color ? ppmT(`canvas.palette.${color}` as TPpmTranslationKey) : undefined;
    const swatch = (value: TPpmCanvasColor) => ({
      background: `var(--ppm-palette-${value}-fill, ${PPM_PALETTE_HEX.light[value].fill})`,
      borderColor: `var(--ppm-palette-${value}-stroke, ${PPM_PALETTE_HEX.light[value].stroke})`,
    });

    return (
      <TldrawUiContextualToolbar
        className="ppm-canvas-style-toolbar"
        getSelectionBounds={getSelectionBounds}
        isMousingDown={busy}
        label={ppmT(selection.labelKey)}
      >
        {panel === "color" && (
          <div className="ppm-canvas-style-toolbar__panel" role="group" aria-label={ppmT("canvas.style.color_title")}>
            <header>
              <span>{ppmT("canvas.style.color")}</span>
              {colorName && <strong>{colorName}</strong>}
            </header>
            <div className="ppm-canvas-style-toolbar__swatches">
              {PPM_CANVAS_COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="ppm-canvas-style-toolbar__swatch"
                  aria-label={ppmT(`canvas.palette.${value}` as TPpmTranslationKey)}
                  aria-pressed={color === value}
                  style={swatch(value)}
                  title={ppmT(`canvas.palette.${value}` as TPpmTranslationKey)}
                  onClick={() => applyColor(value)}
                />
              ))}
            </div>
          </div>
        )}
        {panel === "geo" && (
          <div className="ppm-canvas-style-toolbar__panel" role="group" aria-label={ppmT("canvas.style.shape")}>
            <div className="ppm-canvas-style-toolbar__shapes">
              {PPM_GEO_SHAPES.map((shape) => (
                <button
                  key={shape.geo}
                  type="button"
                  aria-label={ppmT(shape.labelKey)}
                  aria-pressed={geo === shape.geo}
                  title={ppmT(shape.labelKey)}
                  onClick={() => applyGeo(shape.geo)}
                >
                  <PpmGeoGlyph geo={shape.geo} />
                </button>
              ))}
            </div>
          </div>
        )}
        {panel === "more" && (
          <div className="ppm-canvas-style-toolbar__panel" role="group" aria-label={ppmT("canvas.style.more")}>
            {selection.showGeo && (
              <div className="ppm-canvas-style-toolbar__choices" role="group" aria-label={ppmT("canvas.style.fill")}>
                <span>{ppmT("canvas.style.fill")}</span>
                {FILLS.map((fill) => (
                  <button key={fill.value} type="button" onClick={() => editor.setStyleForSelectedShapes(DefaultFillStyle, fill.value)}>
                    {ppmT(fill.labelKey)}
                  </button>
                ))}
              </div>
            )}
            <div className="ppm-canvas-style-toolbar__choices" role="group" aria-label={ppmT("canvas.style.font")}>
              <span>{ppmT("canvas.style.font")}</span>
              {FONTS.map((font) => (
                <button key={font.value} type="button" onClick={() => editor.setStyleForSelectedShapes(DefaultFontStyle, font.value)}>
                  {ppmT(font.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="ppm-canvas-style-toolbar__row">
          <button
            type="button"
            className="ppm-canvas-style-toolbar__color"
            aria-expanded={panel === "color"}
            aria-label={colorName ? fillCanvasTemplate(ppmT("canvas.style.color_value"), { name: colorName }) : ppmT("canvas.style.color")}
            onClick={() => setPanel((current) => (current === "color" ? undefined : "color"))}
          >
            <span className="ppm-canvas-style-toolbar__dot" style={color ? swatch(color) : undefined} aria-hidden="true" />
            <ChevronDown aria-hidden="true" />
          </button>
          {selection.showSize && (
            <div className="ppm-canvas-style-toolbar__sizes" role="group" aria-label={ppmT("canvas.style.text")}>
              <span aria-hidden="true">{ppmT("canvas.style.text")}</span>
              {SIZES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={fillCanvasTemplate(ppmT("canvas.style.text_size"), { size: option.label })}
                  aria-pressed={size === option.value}
                  onClick={() => applySize(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          {selection.showBold && (
            <button
              type="button"
              className="ppm-canvas-style-toolbar__bold"
              aria-label={ppmT("canvas.style.bold")}
              aria-pressed={bold}
              onClick={toggleBold}
            >
              <Bold aria-hidden="true" />
            </button>
          )}
          {selection.showGeo && (
            <button
              type="button"
              className="ppm-canvas-style-toolbar__geo"
              aria-expanded={panel === "geo"}
              aria-label={
                geo && geoLabelKey(geo)
                  ? fillCanvasTemplate(ppmT("canvas.style.shape_value"), { name: ppmT(geoLabelKey(geo)!) })
                  : ppmT("canvas.style.shape")
              }
              onClick={() => setPanel((current) => (current === "geo" ? undefined : "geo"))}
            >
              {geo && isPpmGeo(geo) && <PpmGeoGlyph geo={geo} />}
              <span>{ppmT("canvas.style.shape")}</span>
              <ChevronDown aria-hidden="true" />
            </button>
          )}
          {selection.showMore && (
            <button
              type="button"
              aria-expanded={panel === "more"}
              aria-label={ppmT("canvas.style.more")}
              onClick={() => setPanel((current) => (current === "more" ? undefined : "more"))}
            >
              <Ellipsis aria-hidden="true" />
            </button>
          )}
        </div>
      </TldrawUiContextualToolbar>
    );
  }
  ```
  Примечания исполнителю: (1) `geoLabelKey(geo)!` — после проверки `geoLabelKey(geo)` в том же выражении; если oxlint
  ругается на non-null assertion, вынести в `const geoKey = geo ? geoLabelKey(geo) : undefined;`. (2) `editor.isInAny` и
  `editor.getRichTextEditor` есть в 3.15.6 (`Editor.ts:1426`, `:2421`). (3) Жёлтая заливка по умолчанию у стикеров («black» ≡
  жёлтый) читается панелью как «Жёлтый» (`ppmColorForTldraw("black","note")`).
- [ ] **Step 7: CSS панели** — в `canvas-toolkit.css`:
  ```css
  /* R3 · Панель стилей (K2/K3): строка кнопок, над ней — панель цвета/формы/«ещё». */
  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar .tlui-buttons__horizontal {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.375rem;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__row,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__panel {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
    box-shadow: var(--ppm-shadow-popover, 0 0.4rem 1.4rem rgb(0 0 0 / 0.18));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__panel {
    flex-direction: column;
    align-items: stretch;
    padding: 0.625rem 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__panel > header {
    display: flex;
    justify-content: space-between;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__swatches,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__shapes,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__choices {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__swatch {
    width: 1.5rem;
    height: 1.5rem;
    border: 1.5px solid;
    border-radius: 50%;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__swatch[aria-pressed="true"] {
    outline: 2px solid var(--ppm-color-text, var(--txt-primary));
    outline-offset: 2px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar button {
    display: inline-flex;
    min-width: 1.75rem;
    height: 1.75rem;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 0 0.375rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar button:hover,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar button[aria-pressed="true"],
  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar button[aria-expanded="true"] {
    background: var(--ppm-color-layer-1-selected, var(--bg-layer-1-selected));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar button:focus-visible {
    outline: 2px solid var(--ppm-color-focus, var(--border-accent-strong));
    outline-offset: -2px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar button > svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__dot {
    width: 1rem;
    height: 1rem;
    border: 1.5px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: 50%;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__sizes {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0 0.25rem;
    border-inline: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-style-toolbar__sizes > span {
    margin-right: 0.25rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }
  ```
- [ ] **Step 8: Прогнать** — `./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-style.test.ts` → зелёный; весь web →
  `62 passed`, `386 passed`; tsc 0; oxlint 719/0; формат своих файлов.

**Приёмка R3:**
- [ ] Рулинг R3: своя компактная панель (`TldrawUiContextualToolbar` + `setStyleForSelectedShapes`), стандартная StylePanel
  выключена (F2 не трогал `HIDDEN_TLDRAW_UI`).
- [ ] Критерий 2: цвет меняется у фигуры, стикера и карточки PPM (карточка — `visual.color`, видно полосой и глифом).
- [ ] K3: у стикера — цвет, S/M/L, «Ж»; K2: у фигуры — цвет, S/M/L, «Форма ▾», «…».
- [ ] Панель не пересоздаёт холст (дочерний элемент `<Tldraw>`), скрыта при перетаскивании и у читателя.

---

### Task 6 (R4): «+» продолжения схемы (K2)

**Files:**
- Modify: `$D/canvas-quick-connect.tsx` (заглушка F2 → полностью), `$D/canvas-toolkit-actions.ts` (+ связь и продолжение),
  `$D/canvas-toolkit.css`.
- Create: `apps/web/tests/ppm-canvas/toolkit-quick-connect.test.ts`.

**Interfaces:**
- Consumes: `<PpmCanvasQuickConnect authorId canEdit />` — дочерний `<Tldraw>` под `grammarV2` (F2); `placeQuickConnectShape`,
  `quickConnectAnchors`, `quickConnectHandlePoints`, `PPM_QUICK_CONNECT_SHAPES`, `PPM_GEO_SHAPES`, `geoLabelKey` (R1);
  `occupiedBoxes`, `startEditingShape` (R2); `PpmGeoGlyph` (R1); `PPM_CANVAS_SHAPE_TYPE` (`shape.tsx`).
- Produces: `continueWithShape(editor, sourceId, direction, geo)`, `connectToPoint(editor, sourceId, direction, pagePoint)`.

- [ ] **Step 1:** `$T/af21-pre.sh apps/web/tests/ppm-canvas/toolkit-quick-connect.test.ts`
- [ ] **Step 2: Падающий тест** (геометрия — в `toolkit-model.test.ts` R1; здесь — разводка):
  ```ts
  // AF2.1 R4: quick connect «+» — a leaf of <Tldraw>, native tldraw bindings on both ends, stickers keep their clone «+».
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const overlay = readFileSync(new URL("canvas-quick-connect.tsx", dir), "utf8");
  const actions = readFileSync(new URL("canvas-toolkit-actions.ts", dir), "utf8");
  // Formatting-proof source checks: oxfmt may wrap calls/objects and add trailing commas.
  const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  describe("AF2.1 R4 quick connect", () => {
    it("binds the arrow to the source and to the new shape, as one undo step, then types into the new shape", () => {
      has(actions, 'props: { isExact: false, isPrecise: true, normalizedAnchor: anchors.start, terminal: "start" }');
      has(actions, 'props: { isExact: false, isPrecise: true, normalizedAnchor: anchors.end, terminal: "end" }');
      has(actions, 'editor.markHistoryStoppingPoint("ppm quick connect")');
      has(actions, "placeQuickConnectShape(");
      has(actions, "startEditingShape(editor, shapeId);");
    });

    it("offers «+» for shapes and PPM cards only (stickers keep tldraw's clone handles), never to readers", () => {
      has(overlay, 'const CONNECTABLE_TYPES = new Set<string>(["geo", PPM_CANVAS_SHAPE_TYPE]);');
      has(overlay, "editor.getInstanceState().isReadonly");
      has(overlay, 'role="menu"');
      for (const direction of ["up", "right", "down", "left"]) expect(overlay).toContain(`"${direction}"`);
    });

    it("turns a drag of «+» into a connection to a point or to the shape under the pointer", () => {
      has(actions, "editor.getShapeAtPoint(pagePoint");
      has(overlay, "connectToPoint(editor, target.id, drag.direction, editor.screenToPage(");
    });
  });
  ```
- [ ] **Step 3:** `./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-quick-connect.test.ts` → FAIL.
- [ ] **Step 4: Действия** — в `canvas-toolkit-actions.ts` добавить (импорты: `type TLArrowBinding`, `type TLArrowShape`,
  `type TLGeoShape` из `"tldraw"`; `placeQuickConnectShape`, `quickConnectAnchors`, `type TPpmDirection`, `type TPpmGeo` из
  `./canvas-toolkit-model`):
  ```ts
  function anchorPoint(editor: Editor, id: TLShapeId, anchor: { x: number; y: number }) {
    const bounds = editor.getShapePageBounds(id);
    return bounds ? { x: bounds.x + bounds.w * anchor.x, y: bounds.y + bounds.h * anchor.y } : undefined;
  }

  /** An arrow bound at both ends: from the facing side of `fromId` to the facing side of `toId`. */
  export function connectShapes(editor: Editor, fromId: TLShapeId, toId: TLShapeId, direction: TPpmDirection): TLShapeId | undefined {
    const anchors = quickConnectAnchors(direction);
    const start = anchorPoint(editor, fromId, anchors.start);
    const end = anchorPoint(editor, toId, anchors.end);
    if (!start || !end) return undefined;
    const arrowId = createShapeId();
    editor.createShape<TLArrowShape>({
      id: arrowId,
      type: "arrow",
      x: start.x,
      y: start.y,
      props: { start: { x: 0, y: 0 }, end: { x: end.x - start.x, y: end.y - start.y } },
    });
    editor.createBindings<TLArrowBinding>([
      { fromId: arrowId, toId: fromId, type: "arrow", props: { isExact: false, isPrecise: true, normalizedAnchor: anchors.start, terminal: "start" } },
      { fromId: arrowId, toId, type: "arrow", props: { isExact: false, isPrecise: true, normalizedAnchor: anchors.end, terminal: "end" } },
    ]);
    return arrowId;
  }

  /** K2 «Продолжить»: a new geo shape next to the source without overlap, connected, in edit mode. One undo step. */
  export function continueWithShape(editor: Editor, sourceId: TLShapeId, direction: TPpmDirection, geo: TPpmGeo): void {
    const source = editor.getShape(sourceId);
    const bounds = source ? editor.getShapePageBounds(source) : undefined;
    if (!source || !bounds) return;
    const size = source.type === "geo" ? { w: bounds.w, h: bounds.h } : { w: 200, h: 120 };
    const box = placeQuickConnectShape({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h }, direction, size, occupiedBoxes(editor));
    const style =
      source.type === "geo"
        ? (({ color, dash, fill, font, size: textSize }: TLGeoShape["props"]) => ({ color, dash, fill, font, size: textSize }))(
            (source as TLGeoShape).props
          )
        : {};
    const shapeId = createShapeId();
    editor.markHistoryStoppingPoint("ppm quick connect");
    editor.run(() => {
      editor.createShape<TLGeoShape>({ id: shapeId, type: "geo", x: box.x, y: box.y, props: { ...style, geo, h: box.h, w: box.w } });
      connectShapes(editor, sourceId, shapeId, direction);
    });
    startEditingShape(editor, shapeId);
  }

  /** Drag of «+»: an arrow from the source to the shape under the pointer (bound) or to the point (free end). */
  export function connectToPoint(editor: Editor, sourceId: TLShapeId, direction: TPpmDirection, pagePoint: { x: number; y: number }): void {
    const hit = editor.getShapeAtPoint(pagePoint, {
      hitInside: true,
      margin: 8,
      filter: (shape) => shape.id !== sourceId && shape.type !== "arrow",
    });
    editor.markHistoryStoppingPoint("ppm quick connect");
    if (hit) {
      editor.run(() => {
        const arrowId = connectShapes(editor, sourceId, hit.id, direction);
        if (arrowId) editor.select(arrowId);
      });
      return;
    }
    const anchors = quickConnectAnchors(direction);
    const start = anchorPoint(editor, sourceId, anchors.start);
    if (!start) return;
    const arrowId = createShapeId();
    editor.run(() => {
      editor.createShape<TLArrowShape>({
        id: arrowId,
        type: "arrow",
        x: start.x,
        y: start.y,
        props: { start: { x: 0, y: 0 }, end: { x: pagePoint.x - start.x, y: pagePoint.y - start.y } },
      });
      editor.createBindings<TLArrowBinding>([
        { fromId: arrowId, toId: sourceId, type: "arrow", props: { isExact: false, isPrecise: true, normalizedAnchor: anchors.start, terminal: "start" } },
      ]);
      editor.select(arrowId);
    });
  }
  ```
  Проверить сигнатуру `getShapeAtPoint` (`@tldraw/editor/src/lib/editor/Editor.ts:5167`): опции `hitInside`, `margin`, `filter`
  — если `filter` называется иначе, взять имя из сигнатуры (одна правка, тест ищет только `editor.getShapeAtPoint(pagePoint`).
  Деструктуризация `style` при oxlint-замечании заменяется на явный объект из `(source as TLGeoShape).props`.
- [ ] **Step 5: Оверлей** — `$D/canvas-quick-connect.tsx` заменить целиком:
  ```tsx
  // AF2.1 R4 (line R): four «+» around one selected shape or PPM card (K2). Click → «Продолжить» picker → a connected
  // shape in edit mode; drag → an arrow to a point or to another shape. Stickers keep tldraw's own clone «+» (ruling R1).
  import { useEffect, useState, type PointerEvent as ReactPointerEvent } from "react";
  import { Ellipsis, Plus } from "lucide-react";
  import { useEditor, useValue } from "tldraw";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate } from "./canvas-grammar";
  import { PpmGeoGlyph } from "./canvas-rail";
  import { connectToPoint, continueWithShape } from "./canvas-toolkit-actions";
  import {
    PPM_GEO_SHAPES,
    PPM_QUICK_CONNECT_SHAPES,
    geoLabelKey,
    quickConnectHandlePoints,
    type TPpmDirection,
    type TPpmGeo,
  } from "./canvas-toolkit-model";
  import { PPM_CANVAS_SHAPE_TYPE } from "./shape";

  export type TPpmCanvasQuickConnectProps = { authorId: string; canEdit: boolean };

  const CONNECTABLE_TYPES = new Set<string>(["geo", PPM_CANVAS_SHAPE_TYPE]);
  const DIRECTIONS: readonly TPpmDirection[] = ["up", "right", "down", "left"];
  const DIRECTION_KEYS = {
    up: "canvas.quick.up",
    right: "canvas.quick.right",
    down: "canvas.quick.down",
    left: "canvas.quick.left",
  } as const;

  type TDrag = { direction: TPpmDirection; startX: number; startY: number; x: number; y: number };

  export function PpmCanvasQuickConnect({ canEdit }: TPpmCanvasQuickConnectProps) {
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    const [picker, setPicker] = useState<{ direction: TPpmDirection; more: boolean; hover: TPpmGeo }>();
    const [drag, setDrag] = useState<TDrag>();
    const target = useValue(
      "ppm quick connect target",
      () => {
        if (!canEdit || editor.getInstanceState().isReadonly || editor.getEditingShapeId()) return undefined;
        if (!editor.isIn("select.idle")) return undefined;
        const shape = editor.getOnlySelectedShape();
        if (!shape || !CONNECTABLE_TYPES.has(shape.type)) return undefined;
        const bounds = editor.getShapePageBounds(shape);
        if (!bounds) return undefined;
        const topLeft = editor.pageToViewport({ x: bounds.x, y: bounds.y });
        const zoom = editor.getZoomLevel();
        return { id: shape.id, box: { x: topLeft.x, y: topLeft.y, w: bounds.w * zoom, h: bounds.h * zoom } };
      },
      [canEdit, editor]
    );

    useEffect(() => setPicker(undefined), [target?.id]);

    useEffect(() => {
      if (!drag || !target) return;
      const onMove = (event: PointerEvent) => setDrag((current) => current && { ...current, x: event.clientX, y: event.clientY });
      const onUp = (event: PointerEvent) => {
        const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
        if (moved) connectToPoint(editor, target.id, drag.direction, editor.screenToPage({ x: event.clientX, y: event.clientY }));
        else setPicker({ direction: drag.direction, hover: "rectangle", more: false });
        setDrag(undefined);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
    }, [drag, editor, target]);

    if (!target) return null;
    const points = quickConnectHandlePoints(target.box, 20);
    const container = editor.getViewportScreenBounds();

    const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, direction: TPpmDirection) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      setDrag({ direction, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY });
    };

    const choose = (geo: TPpmGeo) => {
      if (!picker) return;
      continueWithShape(editor, target.id, picker.direction, geo);
      setPicker(undefined);
    };

    const pickerPoint = picker ? points[picker.direction] : undefined;
    const shapes = picker?.more ? PPM_GEO_SHAPES.map((shape) => shape.geo) : PPM_QUICK_CONNECT_SHAPES;

    return (
      <div className="ppm-canvas-quick-connect">
        {drag && (
          <svg className="ppm-canvas-quick-connect__drag" aria-hidden="true">
            <line
              x1={points[drag.direction].x}
              y1={points[drag.direction].y}
              x2={drag.x - container.x}
              y2={drag.y - container.y}
            />
          </svg>
        )}
        {DIRECTIONS.map((direction) => {
          const label = fillCanvasTemplate(ppmT("canvas.quick.handle_hint"), { direction: ppmT(DIRECTION_KEYS[direction]) });
          return (
            <button
              key={direction}
              type="button"
              className="ppm-canvas-quick-handle"
              data-direction={direction}
              data-active={picker?.direction === direction || undefined}
              aria-label={label}
              title={label}
              style={{ left: points[direction].x, top: points[direction].y }}
              onPointerDown={(event) => beginDrag(event, direction)}
              onClick={(event) => {
                // Keyboard activation (Enter/Space) only; pointer clicks are resolved on pointerup.
                if (event.detail === 0) setPicker({ direction, hover: "rectangle", more: false });
              }}
            >
              <Plus aria-hidden="true" />
            </button>
          );
        })}
        {picker && pickerPoint && (
          <div
            className="ppm-canvas-quick-picker"
            role="menu"
            aria-label={ppmT("canvas.quick.continue_diagram")}
            style={{ left: pickerPoint.x + 16, top: pickerPoint.y + 16 }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setPicker(undefined);
            }}
          >
            <strong>{ppmT("canvas.quick.continue")}</strong>
            <div className="ppm-canvas-quick-picker__shapes">
              {shapes.map((geo) => {
                const labelKey = geoLabelKey(geo);
                return (
                  <button
                    key={geo}
                    type="button"
                    role="menuitem"
                    aria-label={labelKey ? ppmT(labelKey) : geo}
                    data-active={picker.hover === geo || undefined}
                    onFocus={() => setPicker((current) => current && { ...current, hover: geo })}
                    onMouseEnter={() => setPicker((current) => current && { ...current, hover: geo })}
                    onClick={() => choose(geo)}
                  >
                    <PpmGeoGlyph geo={geo} />
                  </button>
                );
              })}
              {!picker.more && (
                <button
                  type="button"
                  role="menuitem"
                  aria-label={ppmT("canvas.quick.more_shapes")}
                  onClick={() => setPicker((current) => current && { ...current, more: true })}
                >
                  <Ellipsis aria-hidden="true" />
                </button>
              )}
            </div>
            <small>
              {fillCanvasTemplate(ppmT("canvas.quick.with_link"), {
                shape: ppmT(geoLabelKey(picker.hover) ?? "canvas.shape.rectangle"),
              })}
            </small>
          </div>
        )}
      </div>
    );
  }
  ```
- [ ] **Step 6: CSS** — в `canvas-toolkit.css`:
  ```css
  /* R4 · «+» продолжения (K2): кружки 16 px на серединах сторон, меню «Продолжить», линия перетаскивания. */
  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-connect {
    pointer-events: none;
    position: absolute;
    z-index: 360;
    inset: 0;
    overflow: hidden;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-handle {
    pointer-events: auto;
    position: absolute;
    display: grid;
    width: 1.25rem;
    height: 1.25rem;
    place-items: center;
    border: 1px solid var(--ppm-color-accent, var(--bg-accent-primary));
    border-radius: 50%;
    color: var(--ppm-color-accent-text, var(--txt-accent-primary));
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
    transform: translate(-50%, -50%);
    cursor: crosshair;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-handle:hover,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-handle[data-active] {
    color: var(--ppm-color-on-accent, #fff);
    background: var(--ppm-color-accent, var(--bg-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-handle:focus-visible {
    outline: 2px solid var(--ppm-color-focus, var(--border-accent-strong));
    outline-offset: 2px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-handle > svg {
    width: 0.75rem;
    height: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-connect__drag {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-connect__drag line {
    stroke: var(--ppm-color-link, var(--txt-secondary));
    stroke-dasharray: 4 3;
    stroke-width: 1.5;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker {
    pointer-events: auto;
    position: absolute;
    display: grid;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
    box-shadow: var(--ppm-shadow-popover, 0 0.4rem 1.4rem rgb(0 0 0 / 0.18));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker > strong {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-weight: 400;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker__shapes {
    display: flex;
    gap: 0.25rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker__shapes > button {
    display: grid;
    width: 2.5rem;
    height: 2rem;
    place-items: center;
    border-radius: var(--ppm-radius-sm, 0.375rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker__shapes > button:hover,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker__shapes > button[data-active] {
    background: var(--ppm-color-layer-1-selected, var(--bg-layer-1-selected));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-quick-picker > small {
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }
  ```
- [ ] **Step 7: Прогнать** — `./node_modules/.bin/vitest run tests/ppm-canvas/toolkit-quick-connect.test.ts tests/ppm-canvas/toolkit-model.test.ts`
  → зелёные; весь web → `63 passed`, `389 passed`; tsc 0; oxlint 719/0.
- [ ] **Step 8: Живая проверка (контроллер, «Тест Холста»)** — выделить прямоугольник → четыре «+»; клик по «+» справа →
  «Продолжить», «Ромб» → ромб справа без наложения, стрелка от середины правой стороны, курсор в подписи; повторить 4 раза
  с одной фигуры (≥ 4 связей, новые фигуры не накладываются); перетащить «+» на другую фигуру → стрелка привязана (двигаем
  фигуру — стрелка следует); перетащить в пустоту → свободный конец; ⌘Z убирает фигуру и стрелку одним шагом; у стикера —
  только родные «+» tldraw; у читателя «+» нет.

**Приёмка R4:**
- [ ] Рулинг R2 и критерий 2: «+» создаёт связанную фигуру за один клик; у одной фигуры ≥ 4 связей; фигуры не накладываются.
- [ ] K2: «Продолжить: прямоугольник · ромб · овал · параллелограмм · …», подпись «Прямоугольник · сразу со связью».
- [ ] Перетаскивание «+» — стрелка к точке или к фигуре; одно действие — один шаг отмены.

---

### Task 7 (R5): Регрессии панели — панель задач и инспектор, единый счётчик, e2e, масштаб v1

**Files:**
- Modify: `$D/editor.tsx` — `inspectorHidden` (`const inspectorHidden =` в `PpmCanvasEditor`, до правок F `:2194-2196`) и счётчик
  объектов в `CanvasControls` (`shapeCount`, `:2476`; `objectsList` `:2768-2794`; пилюля `:2905`) — R5 оборачивает оба места
  в блоки `// ── AF2.1 R: (R5) … ──` / `// ── /AF2.1 R ──` (нужда §4: B их не трогает).
- Modify: `$D/canvas-toolkit.css` (панель задач v2), `apps/web/e2e/ppm-canvas-collaboration.spec.ts` (13 мест + гость),
  `apps/web/e2e/ppm-demo.spec.ts:294, :300`.
- Create: `apps/web/tests/ppm-canvas/rail-regressions.test.ts`.

**Interfaces:**
- Consumes: `tasksPanelOpen` (`editor.tsx:264`), `isCountedCanvasShape` (R1), `renderPlaintextFromRichText` (tldraw,
  `index.ts:619`), строки `canvas.rail.sticky`, `canvas.rail.text`, `canvas.rail.frame`, `canvas.rail.object`, `canvas.shape.*`.
- Produces: единое правило счёта объектов (v2): карточки PPM, стикеры, фигуры, текст, рамки, картинки; не считаются
  стрелки, линии, перо, маркер.

- [ ] **Step 1:** `$T/af21-pre.sh apps/web/tests/ppm-canvas/rail-regressions.test.ts apps/web/e2e/ppm-canvas-collaboration.spec.ts apps/web/e2e/ppm-demo.spec.ts`
- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/rail-regressions.test.ts`:
  ```ts
  // AF2.1 R5: regressions of the second agent that belong to the toolkit (other-agent-analysis «Регрессии»).
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const editor = read("../../core/components/ppm-canvas/editor.tsx");
  const toolkitCss = read("../../core/components/ppm-canvas/canvas-toolkit.css");
  const legacyRail = read("../../core/components/ppm-canvas/canvas-rail-legacy.tsx");
  const collaboration = read("../../e2e/ppm-canvas-collaboration.spec.ts");
  const demo = read("../../e2e/ppm-demo.spec.ts");
  // Formatting-proof source checks: oxfmt may wrap calls/objects and add trailing commas.
  const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  describe("AF2.1 R5 regressions", () => {
    it("#2: v1 keeps zoom buttons in the rail", () => {
      for (const command of ["fit-view", "zoom-in", "zoom-out"]) expect(legacyRail).toContain(`onRunCommand("${command}")`);
    });

    it("#3: the tasks panel never covers the inspector or the «Доска» pill", () => {
      expect(editor).toMatch(/const inspectorHidden =\s*tasksPanelOpen \|\|/);
      expect(toolkitCss).toContain('[data-ppm-canvas-grammar="v2"] .ppm-work-item-picker--panel');
      expect(toolkitCss).toContain("top: calc(var(--ppm-canvas-overlay-inset, 1rem) + 2.75rem);");
    });

    it("#6: one rule counts objects for the pill and the «Объекты» list in v2", () => {
      has(editor, "const objectCount = grammarV2 ? countedShapes.length + nodes.length : nodes.length;");
      has(editor, 'ppmT("canvas.board_info_objects").replace("{count}", String(objectCount))');
      has(editor, '{ppmT("canvas.objects")} · {objectCount}');
      // shapeCount stays only for the empty state (plan-F F-D5), never for the pill.
      expect(norm(editor)).not.toContain(norm("String(shapeCount))"));
    });

    it("#8: e2e drives the grouped rail of v2", () => {
      expect(collaboration).not.toContain("Добавить заметку ⇧N");
      expect(collaboration).toContain("async function addCanvasNote(page: Page)");
      expect(demo).not.toContain('name: "Добавить задачу", exact: true }).click()');
      expect(demo).toContain('getByRole("menuitem", { name: /^Задача/ })');
    });
  });
  ```
- [ ] **Step 3:** `./node_modules/.bin/vitest run tests/ppm-canvas/rail-regressions.test.ts` → FAIL (#3, #6, #8; #2 зелёный после F2).
- [ ] **Step 4: Панель задач не закрывает инспектор** — `editor.tsx`, было:
  ```ts
    const inspectorHidden =
      boardInfoOpen || Boolean(desktopImport) || isBlockingCanvasStatus(syncStatus, Boolean(recoveryDraft));
  ```
  стало:
  ```ts
    // ── AF2.1 R: (R5) one right-side panel at a time — «Задачи и бэклог» hides the inspector (regression #3). ──
    const inspectorHidden =
      tasksPanelOpen ||
      boardInfoOpen ||
      Boolean(desktopImport) ||
      isBlockingCanvasStatus(syncStatus, Boolean(recoveryDraft));
    // ── /AF2.1 R ──
  ```
  и в `canvas-toolkit.css`:
  ```css
  /* R5 · «Задачи и бэклог» (v2): под пилюлей «Доска», на месте инспектора (инспектор скрыт, пока панель открыта). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-picker--panel {
    z-index: 320;
    top: calc(var(--ppm-canvas-overlay-inset, 1rem) + 2.75rem);
    right: var(--ppm-canvas-overlay-inset, 1rem);
    bottom: var(--ppm-canvas-overlay-inset, 1rem);
    width: min(var(--ppm-inspector-width, 19rem), calc(100% - 2rem));
    max-height: none;
    border-radius: var(--ppm-radius-md, 0.5rem);
    box-shadow: var(--ppm-shadow-popover, 0 0.4rem 1.4rem rgb(0 0 0 / 0.18));
  }
  ```
- [ ] **Step 5: Единый счётчик** — `CanvasControls`:
  - было (`:2476`):
    ```ts
      const shapeCount = useValue("ppm canvas shape count", () => editor.getCurrentPageShapes().length, [editor]);
    ```
    стало:
    ```ts
      // ── AF2.1 R: (R5) one object rule for the «Доска · Объектов: N» pill and the «Объекты» list (regression #6). ──
      const grammarV2 = usePpmCanvasGrammarV2();
      const shapeCount = useValue("ppm canvas shape count", () => editor.getCurrentPageShapes().length, [editor]);
      const countedShapes = useValue(
        "ppm canvas counted native shapes",
        () =>
          editor
            .getCurrentPageShapes()
            .filter((shape) => shape.type !== PPM_CANVAS_SHAPE_TYPE && isCountedCanvasShape(shape))
            .map((shape) => ({ id: shape.id, label: nativeShapeLabel(editor, shape) })),
        [editor]
      );
      const objectCount = grammarV2 ? countedShapes.length + nodes.length : nodes.length;
      // ── /AF2.1 R ──
    ```
    `shapeCount` остаётся только для пустого состояния (F-D5). Импорты (R-блок F2): `import { usePpmCanvasGrammarV2 } from "./canvas-grammar";`
    (если ещё не импортирован — в `editor.tsx` уже есть `PpmCanvasGrammarContext, isCanvasGrammarV2` из `./canvas-grammar`:
    добавить имя в ту же строку `:124`), `import { isCountedCanvasShape } from "./canvas-toolkit-model";`,
    `renderPlaintextFromRichText` и `type TLShape` — в импорт из `"tldraw"`.
  - функция на уровне модуля (после `findFreeNodePosition`), внутри R-блока:
    ```ts
    // ── AF2.1 R: (R5) a readable name of a native shape in the «Объекты» list. ──
    function nativeShapeLabel(editor: Editor, shape: TLShape): { key: TPpmTranslationKey; text: string } {
      const props = shape.props as { richText?: Parameters<typeof renderPlaintextFromRichText>[1]; name?: string; geo?: string };
      const text = props.richText ? renderPlaintextFromRichText(editor, props.richText).trim().slice(0, 80) : (props.name ?? "");
      const key: TPpmTranslationKey =
        shape.type === "note"
          ? "canvas.rail.sticky"
          : shape.type === "text"
            ? "canvas.rail.text"
            : shape.type === "frame"
              ? "canvas.rail.frame"
              : shape.type === "geo" && props.geo && geoLabelKey(props.geo)
                ? geoLabelKey(props.geo)!
                : "canvas.rail.object";
      return { key, text };
    }
    // ── /AF2.1 R ──
    ```
    (импорт `geoLabelKey` рядом с `isCountedCanvasShape`.)
  - `objectsList` (`:2768-2794`): `{ppmT("canvas.objects")} · {nodes.length}` → `{ppmT("canvas.objects")} · {objectCount}`;
    `{nodes.length === 0 ? (` → `{objectCount === 0 ? (`; в `<ul>` после `{nodes.map(…)}` добавить (только v2 — в v1
    `countedShapes` не показывается, как в UX1.1):
    ```tsx
              {grammarV2 &&
                countedShapes.map(({ id, label }) => (
                  <li key={id}>
                    <button type="button" onClick={() => focusShape(editor, id)}>
                      <Frame aria-hidden="true" />
                      <span>{label.text ? `${ppmT(label.key)} · ${label.text}` : ppmT(label.key)}</span>
                    </button>
                  </li>
                ))}
    ```
    Проверить сигнатуру `focusShape(editor, shapeId)` (`grep -n "^function focusShape" editor.tsx`) — принимает `TLShapeId`/`string`;
    `id` из `getCurrentPageShapes()` — `TLShapeId`.
  - пилюля (`:2905`): `String(shapeCount)` → `String(objectCount)`.
- [ ] **Step 6: e2e** — `apps/web/e2e/ppm-canvas-collaboration.spec.ts`: после импортов добавить
  ```ts
  // AF2.1 R5: design v2 (default) groups the rail — «Заметка» lives in «Документы и текст».
  async function addCanvasNote(page: Page) {
    await page.getByRole("button", { name: /^(Документы и текст|Documents and text)$/ }).click();
    await page.getByRole("menuitem", { name: /^(Заметка|Note)/ }).click();
  }
  ```
  (если `Page` не импортирован — `import { type Page } from "@playwright/test";` в существующий импорт); каждое
  `await <X>.getByRole("button", { name: /Добавить заметку ⇧N|Add note ⇧N/ }).click();` (строки 98, 175, 222, 253, 340, 410,
  461, 483, 536, 541, 622, 629) → `await addCanvasNote(<X>);` с тем же `<X>` (`owner.page`, `page`, `member.page`, `secondPage`);
  строка 665 (гость) →
  `await expect(guest.page.getByRole("button", { name: /^(Документы и текст|Documents and text)$/ })).toHaveCount(0);`.
  Проверка: `grep -c "Добавить заметку ⇧N" apps/web/e2e/ppm-canvas-collaboration.spec.ts` → 0.
  `apps/web/e2e/ppm-demo.spec.ts`:
  - `:294` `await ownerPage.getByRole("button", { name: "Добавить заметку", exact: true }).click();` →
    ```ts
        await ownerPage.getByRole("button", { name: "Документы и текст", exact: true }).click();
        await ownerPage.getByRole("menuitem", { name: /^Заметка/ }).click();
    ```
  - `:300` `await ownerPage.getByRole("button", { name: "Добавить задачу", exact: true }).click();` →
    ```ts
        await ownerPage.getByRole("button", { name: "Из проекта", exact: true }).click();
        await ownerPage.getByRole("menuitem", { name: /^Задача/ }).click();
    ```
  (строки `:296` про «Напишите заметку в Markdown…» — зона линии B: нужда §5.) e2e не запускаются в этой задаче (нужен
  стенд); контроллер гоняет их на живом стенде, если он поднят.
- [ ] **Step 7: Автоужатие «Досок задач»** — эффект живёт в `shape.tsx:1583-1591` (`useEffect … editor.updateShape … { w: 360, h: 160 }`)
  — это файл линии B: R его не трогает; удаление и рабочий канбан — нужда §5 (B). Проверка отсутствия других мест:
  `grep -rn "w: 360, h: 160" $PF/apps/web/core/components/ppm-canvas/` → только `shape.tsx`.
- [ ] **Step 8: Прогнать** — `./node_modules/.bin/vitest run tests/ppm-canvas/rail-regressions.test.ts` → зелёный; весь web →
  `64 passed`, `393 passed`; tsc 0; oxlint 719/0; e2e-файлы — `../../node_modules/.bin/oxlint e2e/ppm-canvas-collaboration.spec.ts e2e/ppm-demo.spec.ts` (0 ошибок).
  Формат своих файлов.

**Приёмка R5 (спецификация E, критерий 5):**
- [ ] №2 масштаб v1 (F2 + тест), №3 панель задач не перекрывает инспектор и пилюлю, №6 единый счётчик (v2), №8 e2e на
  рейку v2; №7 — передано B (нужда §5), №1/№4/№5/№9/№10 — закрыты F2 (v1) и R1 (v2).

---

## Сводная приёмка линии R

- [ ] Критерий 1 (пункты панели, часть R): стикер, текст, фигуры, перо, рамка, связь, смысловые связи, «Ещё» — работают;
  пункты «Документы и текст»/«Из проекта» вызывают команды, обработчики которых — линия B (до B — без действия, кроме
  `add-note`, `add-table`, `add-code`, `add-list`, `add-work-item`, `add-work-items-view`, восстановленных F2).
- [ ] Критерий 2: «+» за один клик, ≥ 4 связей, цвет у фигуры/стикера/карточки PPM.
- [ ] Критерий 5: облик v1 как в конце UX1.1 — R его не меняет (стражи F2 зелёные).
- [ ] Критерий 6: web 64/393, tsc 0, oxlint 719/0; brand 7/86 + аудиты; canvas 3/50.


---

## Линия B — содержимое и файлы (параллельно с R и S после F)

## Линия B — «Содержимое и файлы» (параллельно с R и S, после фазы F)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на Холсте (облик v2) заметка пишет Markdown с формулами KaTeX и подсветкой кода и превращается в задачу или
документ PPM; блок кода — как на фото владельца (K3: номера строк, язык, тема, замок, «…»); документ PPM — живая
карточка с превью и «Открыть ↗», создаётся и ищется прямо с холста; вставка/перетаскивание/⌘U кладут файлы в
Хранилище с понятным именем и живой карточкой (в снимке нет `data:`); у любой файловой карточки есть «Просмотр»
(картинка, PDF, текст/Markdown/JSON/CSV/код, docx/xlsx/pptx) и «Скачать»; «Доска задач» снова рабочий канбан;
чек-лист превращает пункты в задачи; старые картинки `data:` переносятся в Хранилище по подтверждению.

**Architecture:**
- Линия B стартует после фазы F и идёт параллельно с R (рейка, фигуры) и S (сервер). Правим **только** файлы линии B
  (CONTRACTS §0): `shape.tsx`, новые модули `apps/web/core/components/ppm-canvas/{canvas-code,canvas-markdown,
  canvas-content-actions,canvas-placement,canvas-pages,canvas-file-kind,canvas-checklist,canvas-image-migration,
  canvas-external-content}.ts` и `{note-markdown,code-block,canvas-page-picker,file-preview}.tsx`, `canvas-content.css`,
  `apps/web/core/services/{ppm-canvas,ppm-vault}.service.ts`, блок «B» в `packages/ppm-brand/src/translations/af21-canvas.ts`,
  тесты `apps/web/tests/ppm-canvas/{note-markdown,code-block,content-pages,files-external-content,files-preview,
  content-checklist-migration}.test.ts`. В `editor.tsx` — только блоки с разметкой
  `// ── AF2.1 B · <имя> ──` … `// ── /AF2.1 B ──` и две точечные правки, перечисленные в задачах (сигнатура
  `createProjectionShape`, ветка v2 в `handleFileDrop`). Что нужно от F/S/R — в `drafts/plan-B-needs.md`.
- Всё новое — только при грамматике v2 (`usePpmCanvasGrammarV2()` в карточках, `grammarV2` в `editor.tsx`). Облик v1
  и минимальный режим (`statusPlacement="card"`) — без изменений: старые ветки разметки не трогаем, обработчики
  внешнего контента при v1 делегируют стандартным обработчикам tldraw.
- Действия карточек (заметка → задача/документ, превью, скачивание, чек-лист → задачи, новый документ) идут через
  **новый** контекст `PpmCanvasContentActionsContext` (`canvas-content-actions.ts`), который провайдит блок B в
  `editor.tsx`. Форма `PpmWorkItemProjectionContext` (волна 1) не меняется.
- Чистая логика (Markdown, KaTeX, подсветка, имена файлов, CSV, размещение, миграция) — в `.ts`-модулях без DOM:
  тесты web идут в `environment: "node"` (`apps/web/vitest.config.ts:13`), jsdom в store нет. DOMPurify в node
  не поддерживается (`isSupported === false`, `sanitize === undefined` — проверено на dompurify@3.4.15), поэтому
  `sanitizeCanvasHtml` без DOM **экранирует** вход (fail-closed), а сырой HTML не проходит уже на уровне marked.
- Коммитов нет. Перед первой правкой каждого файла (и перед созданием нового) —
  `docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`.

**Tech Stack:** React 18 + React Router 7 + Vite 8, tldraw 3.15.6 (`registerExternalContentHandler`,
`externalContentHandlers`, `putExternalContent`, `getEditingShapeId`, `setEditingShape`, `getShapeAtPoint` —
`@tldraw/editor/src/lib/editor/Editor.ts:8888-8952`; `onMount` вызывается после
`registerDefaultExternalContentHandlers`, `tldraw/src/lib/Tldraw.tsx:~248-262`, поэтому наши обработчики перекрывают
стандартные), marked@16.4.2 (`new Marked`, расширения `level: "block" | "inline"`), katex@0.16.47
(`renderToString(tex, { throwOnError: false, trust: false })`), dompurify@3.4.15, lowlight@3.3.0 (`createLowlight(common)`,
37 языков вместе с `plaintext`), lucide-react 0.469.0, zod (есть в `apps/web/package.json:82`), vitest 4 (env node).

**Spec:** «AF2.1 — Инструменты Холста…» §C, §D, §E (п. «Доска задач», «тихое ужатие»), инварианты, критерии 1, 3, 4, 5, 6;
рулинги R4, R5, R6, R8. Контракты — `drafts/CONTRACTS.md` §0–§6. Макеты — `mockups/K3-Text-Code.png`,
`mockups/K4-Files-Comments.png` (комментарии/обсуждение на K4 — AF2.3, **не** делаем). Заметки —
`notes/tech-notes.md` («Вставка/перетаскивание», «Превью файлов сейчас», «Документы»), `notes/other-agent-analysis.md`
(регрессия 7).

**Проверено по рабочему дереву (2026-09-25, до фазы F):** `apps/web/core/components/ppm-canvas/shape.tsx` 2960 строк
`c528e57be11b`, `editor.tsx` 3764 `17c59907d7ad`, `apps/web/core/services/ppm-canvas.service.ts` 550 `5c334de9605a`,
`ppm-vault.service.ts` 361 `d289c32831db`, `packages/ppm-canvas/src/index.ts` 2163 `427499737346` (sha256, первые 12
знаков). Номера строк ниже — по этому состоянию; F сдвинет их — искать по приведённой строке-якорю.

Ключевые якоря (проверены):
- `shape.tsx:279` `function NodeEditor`, `:552` `return <NativeNodeCard editor={editor} node={node} shape={shape} />;`,
  `:814` `ChecklistEditor`, `:1559` `WorkItemsViewNode` (`:1570` `const compact = usePpmCanvasGrammarV2();`,
  `:1583-1590` эффект автоужатия `props: { w: 360, h: 160 }`, `:1702-1715` заглушка `ppm-work-items-view--compact`),
  `:2474` `ContentProjectionCard`, `:2586` `MediaProjectionCard` (`:2665-2673` `<iframe … sandbox="" src={previewUrl}>`),
  `:2893` `useLazyPreview`, `:2949` `updateNode`.
- `editor.tsx:210` `export default function PpmCanvasEditor`, `:525` `createContentProjectionShape(binding, pagePoint?)`
  (pagePoint — **центр** карточки), `:1290` `createProjectionShape(binding)` (`:1308` `findFreeNodePosition`),
  `:1352` `createWorkItem`, `:1888` `addUploadedContent(entityType, entityId, index, origin)`, `:1957` `handleFileDrop`
  (`onDropCapture` на `.ppm-canvas-shell` глушит drop до tldraw — `:2213-2214`), `:2162` `projectionContext`,
  `:2221-2229` `<Tldraw … onMount={setEditor}>`, `:2248-2255` уведомление `.ppm-canvas-file-drop-notice` (Toasts
  tldraw скрыты: `HIDDEN_TLDRAW_UI.Toasts = null`, `:203`), `:3473` `createNode`, `:3506` `findFreeNodePosition`,
  `:3754` `contentNodeKind`.
- Сервер: `apps/api/plane/ppm_vault/services.py:23-45` (форматы Хранилища: pdf, png, jpg, jpeg, webp по сигнатуре;
  csv, doc, docx, json, key, md, odp, ods, odt, ppt, pptx, txt, xls, xlsx по расширению), `:204` `VAULT_NAME_CONFLICT`
  (HTTP 409, `views.py:83`), `views.py:300-345` `/pdf/` (всегда `application/pdf`, `nosniff`) и `/file/`
  (`inline` только pdf/картинки, иначе `attachment`, `CSP: default-src 'none'; sandbox`); при S3 — 302 на подписанную
  ссылку (`storage.py:61-69`); локально (по умолчанию `PPM_LOCAL_ASSET_UPLOADS=1`, `settings/local.py:12`) —
  `FileResponse`. `apps/api/plane/ppm_canvas/services.py:633-636` `preview_url` Хранилища = `…/vault/entries/<id>/file/`;
  `:698-710` страница: `extension ".page"`, `mime "text/html"`, `excerpt` 500 знаков, `preview_url null`,
  `source_version = updated_at`. Эндпоинт холста `work-items/` принимает только `name/state_id/priority/assignee_ids/
  due_date` (`ppm_canvas/serializers.py:216-228`). Plane `POST pages/` принимает `description_html`
  (`app/views/page/base.py:~137`), список страниц — только свои и публичные (`:98`).

## Решения линии B (фиксируются в CHANGELOG карточки)

| # | Вопрос | Решение |
|---|---|---|
| RB1 | Старые заметки | `format: "plain"` (и заметки без поля после миграции F) остаются в `NativeNodeCard` как раньше (textarea). Новая карточка `NoteCardV2` — только `grammarV2 && format === "markdown"` |
| RB2 | Просмотр ↔ правка | Через состояние редактирования tldraw: двойной клик и Enter при одной выделенной карточке (`canEdit() → true`, `shape.tsx:217`) ставят `editingShapeId`; выход — Esc, ⌘/Ctrl+Enter, клик мимо. Своих обработчиков dblclick нет |
| RB3 | Картинки в Markdown | Не загружаются (только alt-текст): «без новых внешних запросов». Ссылки — только `http(s)`, `mailto`, относительные и `#`; открываются в новой вкладке с `noopener noreferrer nofollow` |
| RB4 | «Сделать задачей» | Эндпоинт холста `work-items/` (имя = заголовок или первая строка, ≤ 255). Описание не переносится (эндпоинт его не принимает) — заметка остаётся рядом. Карточка задачи — справа от заметки без наложения (`findSpotBeside`) |
| RB5 | «Сделать документом» | `ProjectPageService.create` с `access: PUBLIC`, `description_html` = Markdown → HTML (формулы как `<code>$…$</code>`, без разметки KaTeX), DOMPurify; затем `bindContent(entity_type "page")` → живая карточка справа от заметки |
| RB6 | Блок кода | Своя разметка без новой зависимости редактора: textarea поверх подсвеченного `<pre>` в одной ячейке grid (одинаковые шрифт и отступы), Tab/⇧Tab — 2 пробела, `e.code`. Панель (тема · язык · замок · «…») — строкой **внутри** карточки, а не над ней (у `.tl-shape` `pointer-events:none`, панель вне геометрии ненадёжна) |
| RB7 | PDF | Полноэкранный просмотр — `<iframe>` **без** `sandbox` на `/pdf/` Хранилища (сервер отдаёт только `application/pdf` после проверки сигнатуры `%PDF-` и `nosniff`); встроенный просмотрщик Chrome в песочнице не работает. Вложения задач (`attachment`) остаются в `sandbox=""` как в волне 1. pdf.js не подключаем (при S3 нужен CORS MinIO для fetch) |
| RB8 | Текст/CSV/JSON/код | Сначала превью-эндпоинт S (`kind: "text"`, поле `text`), при 404/ошибке — `GET /file/` текстом (работает в локальном хранилище), иначе иконка и «Скачать». Markdown-материалы — `GET /content/` |
| RB9 | «Скачать» | Blob через API (`withCredentials`) и имя из карточки; при ошибке — `window.open(<file>?download=1, "_blank", "noopener")`. Markdown-материал — из `/content/` |
| RB10 | Перетаскивание под v2 | Файлы сразу в Хранилище (K4: «Отпустите, чтобы добавить N файла — они сохранятся в Хранилище»); отпущенные на живую карточку задачи — вложениями этой задачи (прежняя возможность диалога «В задачу»). При v1 — прежний `FileDropDialog` |
| RB11 | Вставка URL / SVG | URL → заметка Markdown `<url>` с заголовком «хост» без запроса в сеть; SVG-текст → уведомление «сохраните как PNG» (Хранилище SVG не принимает) |
| RB12 | Размер при вставке | Клиент не режет по размеру (лимит — настройка сервера `FILE_SIZE_LIMIT`); сервер отвечает `VAULT_FILE_TOO_LARGE`, текст ошибки показываем. Не более 20 файлов за раз (как `handleFileDrop`) |
| RB13 | Старые картинки `data:` | Не автоматически: при открытии доски редактором под v2 — уведомление «N картинок хранятся внутри доски (X МБ). Перенести в Хранилище?» с «Перенести» / «Не сейчас» (отказ помнится в sessionStorage на доску). Перенос обратим: undo tldraw и версии доски. GIF/SVG остаются, их число называется |
| RB14 | «Доска задач» | Под v2 — полный канбан волны 1 (заглушка и эффект автоужатия удалены), «Открыть бэклог» — вторичная кнопка в шапке; подпись «Доска задач» в шапке — ручка перетаскивания (`data-ppm-drag-handle`) |
| RB15 | Формулы в «Документах» (B7) | В AF2.1 не делаем — обоснование в Task B7 |

## Global Constraints (линия B)

- Рабочее дерево `plane-fork` — истина (волны UX0.2/UX1.1, фаза F и соседние линии не закоммичены). Никаких
  `git add/commit/stash/reset/checkout`. Dev-сервер :3000 и контейнер API :8000 не перезапускать (Vite после установки
  пакетов перезапускает контроллер).
- Перед первой правкой **любого** файла (и перед созданием нового):
  `cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork> …`
- Не трогать файлы F, R и S (CONTRACTS §0): `packages/ppm-canvas/**`, `apps/web/package.json`, `pnpm-lock.yaml`,
  `workspace.tsx`, `commands.ts`, `canvas.css`, `canvas-v2.css`, `canvas-toolkit.css`, `canvas-rail.tsx`, `apps/api/**`.
  В `editor.tsx` — только блоки `// ── AF2.1 B · … ──` и две правки, названные в B1 и B4. Нужды — в `drafts/plan-B-needs.md`.
- Контракты F потребляем как существующие (проверка — Step 0 задачи B1): зависимости `marked`, `dompurify`, `katex`,
  `lowlight` в `apps/web/package.json`; поля схемы `note.format`, `code.{language,theme,locked,wrap}`,
  `checklist.items[].work_item_id`; ветка `page` в `createPpmContentRefNode`; пустой `canvas-content.css`,
  импортированный в `editor.tsx`; модуль `af21-canvas.ts` с блоком «B»; вызов
  `registerPpmCanvasExternalContent(editor, getDeps)` в `onMount` (если F его не поставил — B4 ставит сам в своём блоке).
- Строки UI — только ключи `canvas.*` в блоке «B» `packages/ppm-brand/src/translations/af21-canvas.ts` (en и ru —
  одинаковые наборы, без «ИИ», «Page», «Vault»), существующие ключи не переопределять. После правки —
  `docs/superpowers/plans/2026-09-25-af21/tools/af21-pkg-build.sh ppm-brand`. `pnpm` не вызывать.
- Горячие клавиши — только `e.code` (`Tab`, `Escape`, `Enter`); новых глобальных сочетаний не вводим (⌘U — tldraw).
- CSS линии — только `canvas-content.css`; каждый селектор начинается с
  `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]` (исключение — диалоги-порталы в `body`
  `.ppm-canvas-content-backdrop`, `.ppm-canvas-page-picker`, `.ppm-file-preview`: только `:where(html[data-ppm-design="v2"])`); каждый `var(--ppm-…)` — с фолбэком на роль
  волны 0; кегль ≥ 0.6875rem; без запятых внутри `:is()/:not()`.
- Без сети из браузера сверх API PPM: KaTeX CSS/шрифты — `import "katex/dist/katex.min.css"` (собирает Vite), подсветка —
  lowlight, никаких CDN, `fetch` сторонних URL, картинок из Markdown.
- Формат — точечно: `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ../../node_modules/.bin/oxfmt <файлы>`;
  пакеты — `cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxfmt <файлы>`.
- Линт по своим файлам: `cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxlint <файлы>` →
  `Found 0 warnings and 0 errors.` (если `react/no-danger` включён — строкой выше
  `// oxlint-disable-next-line react/no-danger -- HTML прошёл sanitizeCanvasHtml (DOMPurify)`).
- Типы: `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
  --tsBuildInfoFile /Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-25-af21-canvas-toolkit/web-B.tsbuildinfo 2>&1
  | grep -E "ppm-canvas/|ppm-vault.service|ppm-canvas.service|tests/ppm-canvas"` — пусто (соседние линии могут быть
  посреди правки, поэтому фильтр по своим путям).
- Базовая линия (не ухудшать, CONTRACTS §6): web vitest ≈350 зелёные, brand 79/79 + аудиты, canvas 38+/audit,
  web tsc 0, oxlint 719/0, root 653/653.
- E2E-якоря, которые линия B обязана сохранить: `[data-ppm-canvas-node-kind="vault_file_ref"]`; кнопка «Убрать с холста»;
  `.ppm-work-item-card` + `getByLabel("Статус")`; textbox «Новая заметка» (v1); ровно один `.ppm-canvas-status__notice`
  в активном редакторе (наше уведомление — `.ppm-canvas-file-drop-notice`, другой класс); единственный `[role="dialog"]`
  внутри редактора при предпросмотре импорта (наши диалоги — порталом в `document.body`).

## Review Focus (линия B)

1. **Санитизация.** Сырой HTML в Markdown экранируется на уровне marked (`renderer.html`), затем весь HTML идёт через
   `sanitizeCanvasHtml` (DOMPurify: без `script/style/iframe/object/embed/img/image/use/form`, без `srcset/xlink:href`,
   без data-атрибутов); `javascript:`/`data:` ссылки не рендерятся; KaTeX с `trust: false` (без `\href`, `\url`,
   `\htmlStyle`); без DOM — экранирование (fail-closed). HTML превью Office от S и `description_html` страниц — тоже через
   `sanitizeCanvasHtml`. Тесты: B1 `note-markdown.test.ts`, B5 `files-preview.test.ts`.
2. **Нет сети.** Вставка URL не вызывает `fetch` (B4 тест со шпионом `globalThis.fetch`), картинки Markdown не
   грузятся, KaTeX/шрифты/подсветка локальные (B1 тест: нет `https?://` в `note-markdown.tsx`).
3. **Размеры.** Markdown ≤ 50 000 знаков (лимит `body`), код ≤ 100 000 (лимит схемы), подсветка до 20 000 знаков, превью
   текста ≤ 1 МиБ, CSV ≤ 200×50, не более 20 файлов за вставку; `data:` больше не попадает в снимок доски.
4. **PDF без песочницы — только `/pdf/` Хранилища** (сигнатура проверена сервером, `application/pdf`, `nosniff`);
   вложения задач — прежний `sandbox=""`.
5. **v1 и минимальный режим без изменений.** Обработчики внешнего контента при v1 делегируют стандартным; карточки
   v1 (`NativeNodeCard`, канбан, медиа) рендерятся прежней разметкой; `canvas-content.css` действует только при v2.
6. **Права.** Читатель: просмотр и «Скачать» есть, правки/«Сделать задачей/документом»/вставка — нет (сервер всё равно
   проверяет права Хранилища, Документов и задач).
7. **Живые источники (I1/I2).** Задача/документ/файл создаются через их API и кладутся ссылкой; «Убрать с холста» не
   удаляет источник; миграция `data:` удаляет только фигуру-картинку tldraw после успешной загрузки и привязки.

## Карта файлов линии B

| Файл | Задачи |
|---|---|
| `apps/web/core/components/ppm-canvas/canvas-code.ts` (новый) | B1, B2 |
| `apps/web/core/components/ppm-canvas/canvas-markdown.ts` (новый) | B1 |
| `apps/web/core/components/ppm-canvas/canvas-content-actions.ts` (новый) | B1, B3, B5, B6 |
| `apps/web/core/components/ppm-canvas/canvas-placement.ts` (новый) | B1 |
| `apps/web/core/components/ppm-canvas/note-markdown.tsx` (новый) | B1 |
| `apps/web/core/components/ppm-canvas/code-block.tsx` (новый) | B2 |
| `apps/web/core/components/ppm-canvas/canvas-pages.ts` (новый) | B3 |
| `apps/web/core/components/ppm-canvas/canvas-page-picker.tsx` (новый) | B3 |
| `apps/web/core/components/ppm-canvas/canvas-external-content.ts` (новый/заглушка F) | B4 |
| `apps/web/core/components/ppm-canvas/canvas-file-kind.ts` (новый) | B4, B5 |
| `apps/web/core/components/ppm-canvas/file-preview.tsx` (новый) | B5 |
| `apps/web/core/components/ppm-canvas/canvas-checklist.ts` (новый) | B6 |
| `apps/web/core/components/ppm-canvas/canvas-image-migration.ts` (новый) | B6 |
| `apps/web/core/components/ppm-canvas/shape.tsx` | B1, B2, B3, B5, B6 |
| `apps/web/core/components/ppm-canvas/editor.tsx` (блоки B) | B1, B3, B4, B5, B6 |
| `apps/web/core/components/ppm-canvas/canvas-content.css` (создаёт F пустым) | B1–B6 |
| `apps/web/core/services/ppm-canvas.service.ts` | B3 |
| `apps/web/core/services/ppm-vault.service.ts` | B5 |
| `packages/ppm-brand/src/translations/af21-canvas.ts` (блок «B») | B1–B6 |
| `apps/web/tests/ppm-canvas/{note-markdown,code-block,content-pages,files-external-content,files-preview,content-checklist-migration}.test.ts` (новые) | B1–B6 |
| `packages/editor/**` | B7 — не трогаем (решение) |

Порядок внутри линии — последовательный: B1 → B2 → B3 → B4 → B5 → B6 (B7 — только решение). Общие модули
(`canvas-code.ts`, `canvas-content-actions.ts`) создаёт B1, следующие задачи дописывают их точечными правками.

---

### Task 8 (B1): Заметка v2 — Markdown, формулы KaTeX, подсветка кода, «Сделать задачей» и «Сделать документом»

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-code.ts`, `canvas-markdown.ts`, `canvas-content-actions.ts`,
  `canvas-placement.ts`, `note-markdown.tsx`
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx` — импорты `:87-105`, `NodeEditor` `:552`
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — импорты `:49-137`, `createProjectionShape` `:1290-1308`,
  блок B после `createWorkItem` (`:1352-1363`), провайдер вокруг `<Tldraw>` (`:2221-2229`), уведомление после
  `fileDropNotice` (`:2248-2255`)
- Modify: `apps/web/core/components/ppm-canvas/canvas-content.css`, `packages/ppm-brand/src/translations/af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/note-markdown.test.ts` (новый)

**Interfaces:**
- Consumes (F): `note.format: "plain" | "markdown"` (новые — `"markdown"`), `createPpmCanvasNode({ kind: "note" })`
  с `format: "markdown"`; пакеты `marked`, `dompurify`, `katex`, `lowlight`; `canvas-content.css` импортирован;
  `AF21_CANVAS_TRANSLATIONS` с блоком «B». Существующие: `usePpmCanvasGrammarV2`, `OWN_NODE_KIND_KEYS`,
  `fillCanvasTemplate` (`canvas-grammar.ts:9-80`), `OwnNodeGlyph` (`live-card.tsx`), `PPM_CANVAS_NODE_REGISTRY`
  (`@ppm/canvas`, `work_item_ref` 360×248, `page_ref` 360×240), `ProjectPageService.create`, `EPageAccess` (`@plane/types`).
- Produces: `canvas-code.ts` — `escapeHtml`, `normalizeCodeLanguage`, `codeLanguageLabel`, `CANVAS_CODE_LANGUAGES`,
  `CODE_LANGUAGE_LABELS`, `CODE_HIGHLIGHT_MAX_CHARS`, `highlightCodeLines`, `highlightCodeHtml`, тип `TCodeSegment`;
  `canvas-markdown.ts` — `renderCanvasMarkdown`, `markdownToPageHtml`, `sanitizeCanvasHtml`, `noteTaskName`,
  `CANVAS_MARKDOWN_MAX_CHARS`; `canvas-content-actions.ts` — `PpmCanvasContentActionsContext`,
  `TPpmCanvasContentActions`; `canvas-placement.ts` — `findSpotBeside`, `rectsOverlap`, `TPlacementRect`;
  `note-markdown.tsx` — `NoteCardV2`; `editor.tsx` — `createProjectionShape(binding, placement?)`; классы
  `.ppm-note-card`, `.ppm-note-markdown`; ключи `canvas.note_make_task`, `canvas.note_make_document`,
  `canvas.note_empty`, `canvas.note_markdown_hint`, `canvas.note_title_placeholder`, `canvas.note_untitled`,
  `canvas.note_task_created`, `canvas.note_document_created`, `canvas.note_action_error`, `canvas.content_notice_close`.

- [ ] **Step 0: Проверить контракты F** (ничего не правит; при провале — стоп и запись в `plan-B-needs.md`)
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork && \
  grep -nE '"(marked|dompurify|katex|lowlight)"' apps/web/package.json && \
  ls apps/web/node_modules/marked apps/web/node_modules/dompurify apps/web/node_modules/katex apps/web/node_modules/lowlight >/dev/null && \
  grep -n 'format' packages/ppm-canvas/src/index.ts | grep -n 'plain' && \
  grep -nE 'theme|locked|wrap' packages/ppm-canvas/src/index.ts | head -5 && \
  grep -n 'work_item_id' packages/ppm-canvas/src/index.ts | head -3 && \
  grep -n 'canvas-content.css' apps/web/core/components/ppm-canvas/editor.tsx && \
  grep -n 'AF21_CANVAS_TRANSLATIONS' packages/ppm-brand/src/index.ts
  ```
  Ожидается: четыре строки зависимостей, строка `format: z.enum(["plain", "markdown"])` (или эквивалент), поля кода,
  `work_item_id` у пунктов чек-листа, импорт `./canvas-content.css`, подключение модуля переводов.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-code.ts apps/web/core/components/ppm-canvas/canvas-markdown.ts \
    apps/web/core/components/ppm-canvas/canvas-content-actions.ts apps/web/core/components/ppm-canvas/canvas-placement.ts \
    apps/web/core/components/ppm-canvas/note-markdown.tsx apps/web/core/components/ppm-canvas/shape.tsx \
    apps/web/core/components/ppm-canvas/editor.tsx apps/web/core/components/ppm-canvas/canvas-content.css \
    packages/ppm-brand/src/translations/af21-canvas.ts apps/web/tests/ppm-canvas/note-markdown.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/note-markdown.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { highlightCodeHtml, normalizeCodeLanguage } from "@/components/ppm-canvas/canvas-code";
  import {
    markdownToPageHtml,
    noteTaskName,
    renderCanvasMarkdown,
    sanitizeCanvasHtml,
  } from "@/components/ppm-canvas/canvas-markdown";
  import { findSpotBeside } from "@/components/ppm-canvas/canvas-placement";

  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/${name}`, import.meta.url), "utf8");
  const shapeSource = read("shape.tsx");
  const noteSource = read("note-markdown.tsx");
  const editorSource = read("editor.tsx");

  describe("note card v2: Markdown, KaTeX, code (AF2.1 B1)", () => {
    it("renders Markdown structure and safe links", () => {
      const html = renderCanvasMarkdown("## Калибровка\n\n- красный\n- синий\n\n[Замеры](https://example.org/a.csv)");
      expect(html).toContain("<h2>Калибровка</h2>");
      expect(html).toContain("<li>красный</li>");
      expect(html).toContain(
        '<a href="https://example.org/a.csv" rel="noopener noreferrer nofollow" target="_blank">Замеры</a>'
      );
    });

    it("never passes raw HTML, unsafe links or remote images through", () => {
      const html = renderCanvasMarkdown(
        "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1)) ![logo](https://evil.example/p.png)"
      );
      expect(html).not.toMatch(/<script|<img/i);
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(html).not.toContain('href="javascript:');
      expect(html).not.toContain("evil.example");
      expect(html).toContain("logo");
    });

    it("renders LaTeX with KaTeX inline and as a block, never throws and trusts nothing", () => {
      const html = renderCanvasMarkdown(
        "Порог $\\Delta E < 12$.\n\n$$\n\\Delta E = \\sqrt{(L_1-L_2)^2}\n$$\n\nОшибка $\\frac{1}{$ и $\\href{javascript:alert(1)}{x}$"
      );
      expect(html).toContain('<span class="katex">');
      expect(html).toContain('class="katex-display"');
      expect(html).toContain("katex-error");
      expect(html).not.toContain('href="javascript');
      expect(renderCanvasMarkdown("Цена $5 и $6")).not.toContain("katex");
      expect(renderCanvasMarkdown("Цена \\$5")).not.toContain("katex");
    });

    it("highlights fenced code locally with lowlight", () => {
      const html = renderCanvasMarkdown("```py\ndef classify(lab):\n    return lab\n```");
      expect(html).toContain('<code class="hljs language-python">');
      expect(html).toContain('<span class="hljs-keyword">def</span>');
      expect(normalizeCodeLanguage("py")).toBe("python");
      expect(normalizeCodeLanguage("text")).toBe("plaintext");
      expect(normalizeCodeLanguage("brainfuck")).toBe("plaintext");
      expect(highlightCodeHtml("<b>&", "plaintext")).toBe("&lt;b&gt;&amp;");
    });

    it("fails closed without a DOM: the sanitizer escapes instead of passing HTML", () => {
      expect(sanitizeCanvasHtml("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
    });

    it("builds Documents HTML without KaTeX markup and names tasks after the note", () => {
      const html = markdownToPageHtml("# Отчёт\n\nПорог $\\Delta E$\n\n$$x^2$$\n\n<b>x</b>");
      expect(html).toContain("<h1>Отчёт</h1>");
      expect(html).toContain("<code>$\\Delta E$</code>");
      expect(html).toContain("<pre><code>$$x^2$$</code></pre>");
      expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
      expect(html).not.toContain("katex");
      expect(noteTaskName("", "## Замерить при лампе\n\nтекст")).toBe("Замерить при лампе");
      expect(noteTaskName("  Порог ΔE  ", "")).toBe("Порог ΔE");
      expect(noteTaskName("", "   ")).toBe("");
      expect(noteTaskName("x".repeat(300), "")).toHaveLength(255);
    });

    it("places the new card beside the note without overlapping", () => {
      const note = { x: 0, y: 0, w: 320, h: 220 };
      expect(findSpotBeside(note, { w: 360, h: 180 }, [note])).toEqual({ x: 344, y: 0 });
      const blocker = { x: 344, y: 0, w: 360, h: 180 };
      expect(findSpotBeside(note, { w: 360, h: 180 }, [note, blocker])).toEqual({ x: 344, y: 204 });
    });

    it("mounts the Markdown note only under grammar v2 and sanitizes before injecting", () => {
      expect(shapeSource).toMatch(/grammarV2 && node\.kind === "note" && node\.format === "markdown"/);
      expect(noteSource).toContain('import "katex/dist/katex.min.css";');
      expect(noteSource).not.toMatch(/https?:\/\//);
      expect(noteSource).toMatch(/useMemo\(\s*\(\)\s*=>\s*sanitizeCanvasHtml\(\s*renderCanvasMarkdown\(/);
      expect(noteSource).toContain("dangerouslySetInnerHTML={{ __html: html }}");
      expect(editorSource).toContain("<PpmCanvasContentActionsContext.Provider value={contentActions}>");
    });

    it("names the note actions in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.note_make_task")).toBe("Сделать задачей");
      expect(getPpmTranslation("ru", "canvas.note_make_document")).toBe("Сделать документом");
      expect(getPpmTranslation("en", "canvas.note_make_task")).toBe("Make a task");
      expect(getPpmTranslation("en", "canvas.note_make_document")).toBe("Make a document");
    });
  });
  ```
  Запуск:
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/note-markdown.test.ts
  ```
  Ожидается FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-code"`.

- [ ] **Step 3: `canvas-code.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { common, createLowlight } from "lowlight";

  // AF2.1 B1/B2: локальная подсветка (lowlight = highlight.js, набор common). Без сети и без innerHTML в блоке кода:
  // дерево hast превращается в плоские сегменты; HTML-строка для заметок собирается с экранированием.
  const lowlight = createLowlight(common);

  /** Выше этого размера подсветка выключается: 300 фигур без просадки (инвариант спецификации). */
  export const CODE_HIGHLIGHT_MAX_CHARS = 20_000;

  export const CODE_LANGUAGE_LABELS: Readonly<Record<string, string>> = {
    plaintext: "Plain Text",
    arduino: "Arduino",
    bash: "Bash",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    css: "CSS",
    diff: "Diff",
    go: "Go",
    graphql: "GraphQL",
    ini: "INI",
    java: "Java",
    javascript: "JavaScript",
    json: "JSON",
    kotlin: "Kotlin",
    less: "Less",
    lua: "Lua",
    makefile: "Makefile",
    markdown: "Markdown",
    objectivec: "Objective-C",
    perl: "Perl",
    php: "PHP",
    "php-template": "PHP Template",
    python: "Python",
    "python-repl": "Python REPL",
    r: "R",
    ruby: "Ruby",
    rust: "Rust",
    scss: "SCSS",
    shell: "Shell",
    sql: "SQL",
    swift: "Swift",
    typescript: "TypeScript",
    vbnet: "VB.NET",
    wasm: "WebAssembly",
    xml: "XML / HTML",
    yaml: "YAML",
  };

  /** «Plain Text» первым, затем языки lowlight common по подписи. */
  export const CANVAS_CODE_LANGUAGES: readonly string[] = [
    "plaintext",
    ...lowlight
      .listLanguages()
      .filter((language) => language !== "plaintext")
      .sort((left, right) =>
        (CODE_LANGUAGE_LABELS[left] ?? left).localeCompare(CODE_LANGUAGE_LABELS[right] ?? right, "en")
      ),
  ];

  const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
    "": "plaintext",
    text: "plaintext",
    txt: "plaintext",
    plain: "plaintext",
    "plain text": "plaintext",
    tex: "plaintext",
    latex: "plaintext",
    py: "python",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    sh: "bash",
    zsh: "bash",
    yml: "yaml",
    html: "xml",
    htm: "xml",
    svg: "xml",
    md: "markdown",
    "c++": "cpp",
    "c#": "csharp",
    cs: "csharp",
    rs: "rust",
    rb: "ruby",
    kt: "kotlin",
    golang: "go",
    h: "c",
    hpp: "cpp",
    m: "objectivec",
    pl: "perl",
    vb: "vbnet",
    mk: "makefile",
  };

  export function normalizeCodeLanguage(value: string | null | undefined): string {
    const key = (value ?? "").trim().toLowerCase();
    const candidate = LANGUAGE_ALIASES[key] ?? key;
    return candidate && lowlight.registered(candidate) ? candidate : "plaintext";
  }

  export function codeLanguageLabel(language: string): string {
    const normalized = normalizeCodeLanguage(language);
    return CODE_LANGUAGE_LABELS[normalized] ?? normalized;
  }

  export function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  export type TCodeSegment = { className: string; text: string };

  // Минимальная форма узла hast (lowlight отдаёт Root); тип «hast» напрямую apps/web недоступен (isolated linker).
  type THastNode = {
    children?: THastNode[];
    properties?: { className?: unknown };
    type: string;
    value?: string;
  };

  function collectSegments(node: THastNode, classes: readonly string[], out: TCodeSegment[]) {
    if (node.type === "text") {
      out.push({ className: classes.join(" "), text: node.value ?? "" });
      return;
    }
    const own = Array.isArray(node.properties?.className) ? (node.properties.className as string[]) : [];
    const next = own.length > 0 ? [...classes, ...own] : classes;
    for (const child of node.children ?? []) collectSegments(child, next, out);
  }

  /** Строки кода с сегментами подсветки; токен, занимающий несколько строк, режется по `\n`. */
  export function highlightCodeLines(code: string, language: string): TCodeSegment[][] {
    const normalized = normalizeCodeLanguage(language);
    const segments: TCodeSegment[] = [];
    if (normalized === "plaintext" || code.length > CODE_HIGHLIGHT_MAX_CHARS) {
      segments.push({ className: "", text: code });
    } else {
      collectSegments(lowlight.highlight(normalized, code) as unknown as THastNode, [], segments);
    }
    const lines: TCodeSegment[][] = [[]];
    for (const segment of segments) {
      segment.text.split("\n").forEach((part, index) => {
        if (index > 0) lines.push([]);
        if (part) lines[lines.length - 1].push({ className: segment.className, text: part });
      });
    }
    return lines;
  }

  /** Экранированный HTML подсветки (для заметок; перед вставкой всё равно проходит sanitizeCanvasHtml). */
  export function highlightCodeHtml(code: string, language: string): string {
    return highlightCodeLines(code, language)
      .map((line) =>
        line
          .map((segment) =>
            segment.className
              ? `<span class="${escapeHtml(segment.className)}">${escapeHtml(segment.text)}</span>`
              : escapeHtml(segment.text)
          )
          .join("")
      )
      .join("\n");
  }
  ```

- [ ] **Step 4: `canvas-markdown.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import DOMPurify from "dompurify";
  import katex from "katex";
  import { Marked, type RendererObject, type TokenizerAndRendererExtension } from "marked";
  import { escapeHtml, highlightCodeHtml, normalizeCodeLanguage } from "./canvas-code";

  // AF2.1 B1: Markdown заметки. Три слоя защиты: (1) сырой HTML экранируется в marked (renderer.html), картинки не
  // рендерятся, опасные ссылки превращаются в текст; (2) KaTeX с trust:false; (3) DOMPurify перед вставкой в DOM.

  /** Совпадает с лимитом поля body заметки (packages/ppm-canvas: sharedOwnedNodeFields.body ≤ 50 000). */
  export const CANVAS_MARKDOWN_MAX_CHARS = 50_000;
  const SAFE_HREF = /^(?:https?:|mailto:|\/(?!\/)|#)/i;

  function renderMath(tex: string, displayMode: boolean): string {
    return katex.renderToString(tex, {
      displayMode,
      maxExpand: 200,
      maxSize: 20,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: false,
      trust: false,
    });
  }

  type TMathRender = (tex: string, displayMode: boolean) => string;

  function mathExtensions(render: TMathRender): TokenizerAndRendererExtension[] {
    return [
      {
        name: "ppmMathBlock",
        level: "block",
        start(src) {
          return /^\$\$/m.exec(src)?.index;
        },
        tokenizer(src) {
          const match = /^\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$[ \t]*(?:\n+|$)/.exec(src);
          return match ? { type: "ppmMathBlock", raw: match[0], text: match[1].trim() } : undefined;
        },
        renderer(token) {
          return render(String(token.text), true);
        },
      },
      {
        name: "ppmMathInline",
        level: "inline",
        start(src) {
          const index = src.indexOf("$");
          return index < 0 ? undefined : index;
        },
        tokenizer(src) {
          // «$…$»: без пробела у границ и без цифры сразу после закрывающего — «$5 и $6» остаётся текстом.
          const match = /^\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/.exec(src);
          return match ? { type: "ppmMathInline", raw: match[0], text: match[1] } : undefined;
        },
        renderer(token) {
          return render(String(token.text), false);
        },
      },
    ];
  }

  function safeRenderer(code: RendererObject["code"]): RendererObject {
    return {
      html({ text }) {
        return escapeHtml(text);
      },
      image({ text }) {
        // RB3: без внешних запросов — картинки из Markdown не загружаются, остаётся подпись.
        return escapeHtml(text);
      },
      link({ href, title, tokens }) {
        const label = this.parser.parseInline(tokens);
        if (!SAFE_HREF.test(href.trim())) return label;
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href.trim())}"${titleAttribute} rel="noopener noreferrer nofollow" target="_blank">${label}</a>`;
      },
      code,
    };
  }

  const noteMarkdown = new Marked({ async: false, breaks: true, gfm: true });
  noteMarkdown.use({
    extensions: mathExtensions((tex, displayMode) =>
      displayMode ? `<div class="ppm-note-math">${renderMath(tex, true)}</div>\n` : renderMath(tex, false)
    ),
    renderer: safeRenderer(({ text, lang }) => {
      const language = normalizeCodeLanguage(lang);
      return `<pre class="ppm-note-code"><code class="hljs language-${language}">${highlightCodeHtml(text, language)}</code></pre>\n`;
    }),
  });

  // «Сделать документом»: HTML для редактора «Документов» — без разметки KaTeX (её схема редактора не знает),
  // формулы остаются исходником в <code>, код — обычным <pre><code>.
  const pageMarkdown = new Marked({ async: false, breaks: true, gfm: true });
  pageMarkdown.use({
    extensions: mathExtensions((tex, displayMode) =>
      displayMode ? `<pre><code>${escapeHtml(`$$${tex}$$`)}</code></pre>\n` : `<code>${escapeHtml(`$${tex}$`)}</code>`
    ),
    renderer: safeRenderer(({ text, lang }) => {
      const language = normalizeCodeLanguage(lang);
      const languageClass = language === "plaintext" ? "" : ` class="language-${language}"`;
      return `<pre><code${languageClass}>${escapeHtml(text)}</code></pre>\n`;
    }),
  });

  /** HTML заметки до санитизации (в DOM — только через sanitizeCanvasHtml). */
  export function renderCanvasMarkdown(source: string): string {
    return noteMarkdown.parse(source.slice(0, CANVAS_MARKDOWN_MAX_CHARS)) as string;
  }

  export function markdownToPageHtml(source: string): string {
    return pageMarkdown.parse(source.slice(0, CANVAS_MARKDOWN_MAX_CHARS)) as string;
  }

  export function sanitizeCanvasHtml(html: string): string {
    // Без DOM (node, SSR) DOMPurify не работает: не пропускаем разметку вовсе.
    if (!DOMPurify.isSupported) return escapeHtml(html);
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target"],
      ALLOW_DATA_ATTR: false,
      FORBID_ATTR: ["srcset", "xlink:href", "formaction"],
      FORBID_TAGS: [
        "audio",
        "base",
        "button",
        "embed",
        "form",
        "iframe",
        "image",
        "img",
        "input",
        "link",
        "meta",
        "object",
        "select",
        "source",
        "style",
        "textarea",
        "use",
        "video",
      ],
      USE_PROFILES: { html: true, mathMl: true, svg: true },
    });
  }

  /** Имя задачи/документа: заголовок заметки или первая непустая строка без Markdown-префикса, ≤ 255. */
  export function noteTaskName(title: string, body: string): string {
    const fromTitle = title.trim();
    if (fromTitle) return fromTitle.slice(0, 255);
    const line = body
      .split("\n")
      .map((raw) => raw.replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)/, "").trim())
      .find(Boolean);
    return (line ?? "").slice(0, 255);
  }
  ```
  `safeRenderer` возвращает `RendererObject`, поэтому у `link` контекстный `this` — рендерер marked 16 с
  `this.parser.parseInline`. Если tsc всё же даёт TS2683 на `this`, взять `link({ href, title, text })` и вместо
  `this.parser.parseInline(tokens)` вернуть `escapeHtml(text)`: форматирование внутри текста ссылки теряется,
  безопасность та же.

- [ ] **Step 5: `canvas-placement.ts` и `canvas-content-actions.ts` (новые)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // canvas-placement.ts — AF2.1 B: «рядом с карточкой без наложения» (заметка → задача/документ, чек-лист → задачи).
  export type TPlacementRect = { h: number; w: number; x: number; y: number };

  export function rectsOverlap(a: TPlacementRect, b: TPlacementRect, gap: number): boolean {
    return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  }

  /** Справа (шагами вниз), под, слева, над; если всё занято — справа ниже всех занятых. */
  export function findSpotBeside(
    anchor: TPlacementRect,
    size: { h: number; w: number },
    occupied: readonly TPlacementRect[],
    gap = 24
  ): { x: number; y: number } {
    const candidates: { x: number; y: number }[] = [];
    for (let step = 0; step < 6; step += 1)
      candidates.push({ x: anchor.x + anchor.w + gap, y: anchor.y + step * (size.h + gap) });
    candidates.push({ x: anchor.x, y: anchor.y + anchor.h + gap });
    candidates.push({ x: anchor.x - size.w - gap, y: anchor.y });
    candidates.push({ x: anchor.x, y: anchor.y - size.h - gap });
    const free = candidates.find((point) => !occupied.some((rect) => rectsOverlap({ ...point, ...size }, rect, gap)));
    if (free) return free;
    const bottom = Math.max(anchor.y + anchor.h, ...occupied.map((rect) => rect.y + rect.h));
    return { x: anchor.x + anchor.w + gap, y: bottom + gap };
  }
  ```
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { createContext } from "react";
  import type { TPpmCanvasShape } from "./shape";

  // canvas-content-actions.ts — AF2.1 B: действия карточек содержимого. Отдельный контекст, чтобы не менять форму
  // PpmWorkItemProjectionContext (волна 1). Реализации — блок «AF2.1 B» в editor.tsx; они сами ловят ошибки и
  // сообщают о результате через notify, промисы не отклоняются.
  export type TPpmCanvasContentActions = {
    canEdit: boolean;
    createPageFromNote: (anchor: TPpmCanvasShape, title: string, markdown: string) => Promise<void>;
    createTaskFromText: (anchor: TPpmCanvasShape, name: string) => Promise<void>;
    notify: (message: string) => void;
  };

  export const PpmCanvasContentActionsContext = createContext<TPpmCanvasContentActions>({
    canEdit: false,
    createPageFromNote: async () => undefined,
    createTaskFromText: async () => undefined,
    notify: () => undefined,
  });
  ```

- [ ] **Step 6: `note-markdown.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useContext, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
  import { FileText, ListTodo, LoaderCircle } from "lucide-react";
  import { stopEventPropagation, useValue, type Editor } from "tldraw";
  import type { TPpmCanvasOwnedNode } from "@ppm/canvas";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { OWN_NODE_KIND_KEYS } from "./canvas-grammar";
  import { PpmCanvasContentActionsContext } from "./canvas-content-actions";
  import { noteTaskName, renderCanvasMarkdown, sanitizeCanvasHtml } from "./canvas-markdown";
  import { OwnNodeGlyph } from "./live-card";
  import type { TPpmCanvasShape } from "./shape";
  // oxlint-disable-next-line import/no-unassigned-import -- KaTeX: стили и шрифты собирает Vite локально (без CDN)
  import "katex/dist/katex.min.css";

  type TNoteNode = Extract<TPpmCanvasOwnedNode, { kind: "note" }>;

  // AF2.1 B1 (K3): заметка — отрисованный Markdown с формулами; двойной клик или Enter — правка (состояние
  // редактирования tldraw), Esc или ⌘/Ctrl+Enter — обратно. «Сделать задачей» / «Сделать документом» — живые
  // источники рядом с заметкой (I1/I2).
  export function NoteCardV2({
    editor,
    node,
    onPatch,
    shape,
  }: {
    editor: Editor;
    node: TNoteNode;
    onPatch: (patch: Partial<Pick<TNoteNode, "body" | "title">>) => void;
    shape: TPpmCanvasShape;
  }) {
    const ppmT = usePpmTranslation();
    const actions = useContext(PpmCanvasContentActionsContext);
    const readonly = editor.getInstanceState().isReadonly;
    const editing = useValue("ppm note editing", () => editor.getEditingShapeId() === shape.id, [editor, shape.id]);
    const [busy, setBusy] = useState<"document" | "task">();
    const html = useMemo(() => sanitizeCanvasHtml(renderCanvasMarkdown(node.body)), [node.body]);
    const canAct = actions.canEdit && !readonly;

    const run = async (kind: "document" | "task") => {
      if (busy || !canAct) return;
      const name = noteTaskName(node.title, node.body) || ppmT("canvas.note_untitled");
      setBusy(kind);
      try {
        if (kind === "task") await actions.createTaskFromText(shape, name);
        else await actions.createPageFromNote(shape, name, node.body);
      } finally {
        setBusy(undefined);
      }
    };

    const onSourceKeyDown = (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      event.stopPropagation();
      if (event.code === "Escape" || (event.code === "Enter" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        editor.setEditingShape(null);
      }
    };

    // Ссылка внутри отрисованного текста должна открываться, а не начинать перетаскивание карточки.
    const onViewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("a")) event.stopPropagation();
    };

    return (
      <div className="ppm-note-card" data-editing={editing && !readonly ? true : undefined}>
        <header className="ppm-note-card__header">
          <span className="ppm-canvas-node__type">
            <OwnNodeGlyph kind="note" />
            {ppmT(OWN_NODE_KIND_KEYS.note)}
          </span>
          {canAct && (
            <div className="ppm-note-card__actions">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run("task")}
                onKeyDown={stopEventPropagation}
                onPointerDown={stopEventPropagation}
              >
                {busy === "task" ? <LoaderCircle aria-hidden="true" /> : <ListTodo aria-hidden="true" />}
                {ppmT("canvas.note_make_task")}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run("document")}
                onKeyDown={stopEventPropagation}
                onPointerDown={stopEventPropagation}
              >
                {busy === "document" ? <LoaderCircle aria-hidden="true" /> : <FileText aria-hidden="true" />}
                {ppmT("canvas.note_make_document")}
              </button>
            </div>
          )}
        </header>
        {editing && !readonly ? (
          <>
            <input
              aria-label={ppmT("canvas.note_title_placeholder")}
              className="ppm-note-card__title-input"
              maxLength={160}
              placeholder={ppmT("canvas.note_title_placeholder")}
              value={node.title}
              onChange={(event) => onPatch({ title: event.currentTarget.value })}
              onKeyDown={onSourceKeyDown}
              onPointerDown={stopEventPropagation}
            />
            <textarea
              // oxlint-disable-next-line jsx_a11y/no-autofocus -- правка начинается двойным кликом или Enter
              autoFocus
              aria-label={ppmT("canvas.note_body_placeholder")}
              className="ppm-note-card__source"
              maxLength={50_000}
              spellCheck
              value={node.body}
              onChange={(event) => onPatch({ body: event.currentTarget.value })}
              onKeyDown={onSourceKeyDown}
              onPointerDown={stopEventPropagation}
              onWheelCapture={stopEventPropagation}
            />
            <small className="ppm-note-card__hint">{ppmT("canvas.note_markdown_hint")}</small>
          </>
        ) : (
          <>
            {node.title.trim() && <h3 className="ppm-note-card__title">{node.title}</h3>}
            {node.body.trim() ? (
              <div
                className="ppm-note-markdown"
                // oxlint-disable-next-line react/no-danger -- HTML прошёл sanitizeCanvasHtml (DOMPurify)
                dangerouslySetInnerHTML={{ __html: html }}
                onPointerDown={onViewPointerDown}
              />
            ) : (
              <p className="ppm-note-card__empty">{ppmT("canvas.note_empty")}</p>
            )}
          </>
        )}
      </div>
    );
  }
  ```
  Ключ `canvas.note_body_placeholder` уже есть в `PPM_TRANSLATIONS` (используется `shape.tsx:740`). Если
  `jsx_a11y/no-autofocus` не включён — строку `oxlint-disable` убрать (oxlint сообщает о лишней директиве).

- [ ] **Step 7: `shape.tsx` — маршрут карточки заметки v2**
  Импорты (после `import { LiveOpenLink, LiveSourceHeader, OwnNodeGlyph } from "./live-card";`, `:104`):
  ```ts
  import { NoteCardV2 } from "./note-markdown";
  ```
  `NodeEditor`, строка `:552`. Было:
  ```tsx
    return <NativeNodeCard editor={editor} node={node} shape={shape} />;
  }
  ```
  Стало:
  ```tsx
    // AF2.1 B1: новая заметка (format "markdown") — только под грамматикой v2; старые (plain) — как раньше (RB1).
    if (grammarV2 && node.kind === "note" && node.format === "markdown") {
      return (
        <NoteCardV2 editor={editor} node={node} shape={shape} onPatch={(patch) => updateNode(editor, shape, node, patch)} />
      );
    }
    return <NativeNodeCard editor={editor} node={node} shape={shape} />;
  }
  ```

- [ ] **Step 8: `editor.tsx` — размещение карточки задачи и действия содержимого**
  Импорты: в список из `@ppm/canvas` (`:49-86`) добавить `PPM_CANVAS_NODE_REGISTRY,`; в импорт `./canvas-grammar`
  (`:127`) — `fillCanvasTemplate`; после него:
  ```ts
  import { EPageAccess } from "@plane/types";
  import { ProjectPageService } from "@/services/page/project-page.service";
  import { PpmCanvasContentActionsContext, type TPpmCanvasContentActions } from "./canvas-content-actions";
  import { markdownToPageHtml, sanitizeCanvasHtml } from "./canvas-markdown";
  import { findSpotBeside, type TPlacementRect } from "./canvas-placement";
  ```
  (`EFileAssetType` уже импортируется из `@plane/types` на `:88` — объединить в один импорт.)

  `createProjectionShape`, `:1290-1308`. Было:
  ```ts
  const createProjectionShape = useCallback(
    async (binding: TPpmCanvasWorkItemBinding) => {
  ```
  и
  ```ts
      const id = binding.shape_id as TLShapeId;
      const position = findFreeNodePosition(activeEditor, node.visual.width, node.visual.height);
  ```
  Стало:
  ```ts
  const createProjectionShape = useCallback(
    async (binding: TPpmCanvasWorkItemBinding, placement?: { x: number; y: number }) => {
  ```
  и
  ```ts
      const id = binding.shape_id as TLShapeId;
      // AF2.1 B1: «Сделать задачей» кладёт карточку рядом с источником; остальные пути — как раньше.
      const position = placement
        ? { ...placement, inViewport: true }
        : findFreeNodePosition(activeEditor, node.visual.width, node.visual.height);
  ```
  Остальные вызовы (`bindWorkItem`, `createWorkItem`) передают один аргумент — не меняются.

  Блок B сразу после `createWorkItem` (`:1352-1363`):
  ```ts
  // ── AF2.1 B · действия содержимого (заметка → задача/документ) ──
  const pageService = useMemo(() => new ProjectPageService(), []);
  const [contentNotice, setContentNotice] = useState<string>();
  const occupiedPageRects = useCallback(
    (activeEditor: Editor): TPlacementRect[] =>
      activeEditor
        .getCurrentPageShapes()
        .filter((shape) => !["arrow", "line", "draw"].includes(shape.type))
        .map((shape) => activeEditor.getShapePageBounds(shape))
        .filter((bounds): bounds is NonNullable<typeof bounds> => Boolean(bounds))
        .map((bounds) => ({ h: bounds.h, w: bounds.w, x: bounds.x, y: bounds.y })),
    []
  );
  const spotBeside = useCallback(
    (anchor: TPpmCanvasShape, size: { h: number; w: number }) => {
      const activeEditor = editorRef.current;
      const bounds = activeEditor?.getShapePageBounds(anchor.id);
      if (!activeEditor || !bounds) return undefined;
      return findSpotBeside({ h: bounds.h, w: bounds.w, x: bounds.x, y: bounds.y }, size, occupiedPageRects(activeEditor));
    },
    [occupiedPageRects]
  );
  const createTaskFromText = useCallback(
    async (anchor: TPpmCanvasShape, name: string) => {
      if (!editableRef.current) return;
      const size = {
        h: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultHeight,
        w: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultWidth,
      };
      try {
        const binding = await service.createWorkItem(workspaceId, projectId, boardId, {
          name: name.slice(0, 255),
          shape_id: createShapeId(),
          client_operation_id: crypto.randomUUID(),
        });
        await createProjectionShape(binding, spotBeside(anchor, size));
        setContentNotice(
          fillCanvasTemplate(ppmT("canvas.note_task_created"), {
            name: binding.source.identity.identifier ?? binding.source.display.title,
          })
        );
      } catch {
        setContentNotice(ppmT("canvas.note_action_error"));
      }
    },
    [boardId, createProjectionShape, ppmT, projectId, service, spotBeside, workspaceId]
  );
  const placePageBinding = useCallback(
    async (pageId: string, center?: { x: number; y: number }) => {
      const binding = await service.bindContent(workspaceId, projectId, boardId, {
        shape_id: createShapeId(),
        entity_type: "page",
        entity_id: pageId,
        client_operation_id: crypto.randomUUID(),
      });
      await createContentProjectionShape(binding, center);
    },
    [boardId, createContentProjectionShape, projectId, service, workspaceId]
  );
  const createPageFromNote = useCallback(
    async (anchor: TPpmCanvasShape, title: string, markdown: string) => {
      if (!editableRef.current) return;
      const size = { h: PPM_CANVAS_NODE_REGISTRY.page_ref.defaultHeight, w: PPM_CANVAS_NODE_REGISTRY.page_ref.defaultWidth };
      try {
        const page = await pageService.create(workspaceSlug, projectId, {
          access: EPageAccess.PUBLIC,
          description_html: sanitizeCanvasHtml(markdownToPageHtml(markdown)) || "<p></p>",
          name: title.slice(0, 255),
        });
        if (!page.id) throw new Error("Page id is missing.");
        const spot = spotBeside(anchor, size);
        await placePageBinding(page.id, spot ? { x: spot.x + size.w / 2, y: spot.y + size.h / 2 } : undefined);
        setContentNotice(fillCanvasTemplate(ppmT("canvas.note_document_created"), { name: page.name ?? title }));
      } catch {
        setContentNotice(ppmT("canvas.note_action_error"));
      }
    },
    [pageService, placePageBinding, ppmT, projectId, spotBeside, workspaceSlug]
  );
  // ── /AF2.1 B ──
  ```
  Блок B перед `const projectionContext = useMemo(` (`:2162`):
  ```ts
  // ── AF2.1 B · контекст действий содержимого ──
  const contentActions = useMemo<TPpmCanvasContentActions>(
    () => ({
      canEdit: effectiveCanEdit,
      createPageFromNote,
      createTaskFromText,
      notify: setContentNotice,
    }),
    [createPageFromNote, createTaskFromText, effectiveCanEdit]
  );
  // ── /AF2.1 B ──
  ```
  Провайдер — внутри `PpmSemanticEdgeFocusContext.Provider` (`:2220`), обернуть `<Tldraw …>…</Tldraw>`:
  ```tsx
                <PpmCanvasContentActionsContext.Provider value={contentActions}>
                  <Tldraw …без изменений…>…</Tldraw>
                </PpmCanvasContentActionsContext.Provider>
  ```
  Уведомление — сразу после блока `{fileDropNotice && (…)}` (`:2248-2255`), тем же механизмом PPM (Toasts tldraw скрыты):
  ```tsx
      {/* ── AF2.1 B · уведомление содержимого ── */}
      {grammarV2 && contentNotice && (
        <div className="ppm-canvas-file-drop-notice" data-ppm-notice="content" role="status">
          <span>{contentNotice}</span>
          <button type="button" aria-label={ppmT("canvas.content_notice_close")} onClick={() => setContentNotice(undefined)}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}
      {/* ── /AF2.1 B ── */}
  ```

- [ ] **Step 9: Стили** — дописать в `canvas-content.css`:
  ```css
  /* AF2.1 B1 · Заметка v2 (K3). Все селекторы — только облик v2 и рабочее пространство. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1rem;
    overflow: hidden;
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__actions {
    display: inline-flex;
    gap: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: var(--ppm-control-height-sm, 1.75rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__actions svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown {
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    font-size: 0.8125rem;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown :where(h1, h2, h3, h4) {
    margin: 0.5rem 0 0.25rem;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown :where(p, ul, ol) {
    margin: 0 0 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown :where(ul, ol) {
    padding-left: 1.25rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown ul {
    list-style: disc;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown ol {
    list-style: decimal;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown a {
    color: var(--ppm-color-link, var(--txt-accent-primary));
    text-decoration: underline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown .ppm-note-math {
    margin: 0.5rem 0;
    overflow-x: auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown .ppm-note-code {
    margin: 0 0 0.5rem;
    padding: 0.5rem 0.625rem;
    overflow-x: auto;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    background: var(--ppm-color-surface-2, var(--bg-layer-2));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__source {
    min-height: 0;
    flex: 1 1 auto;
    resize: none;
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__title-input {
    font-size: 0.9375rem;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__hint,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__empty {
    margin: 0;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }
  ```
  Цвета подсветки `.hljs-*` задаёт B2 (общие для заметки и блока кода).

- [ ] **Step 10: Строки** — в блок «B» модуля `packages/ppm-brand/src/translations/af21-canvas.ts` (только ключи,
  которых там ещё нет; проверить `grep -n "canvas.note_make_task" packages/ppm-brand/src/translations/af21-canvas.ts`):
  ```ts
      // en (блок B)
      "canvas.note_make_task": "Make a task",
      "canvas.note_make_document": "Make a document",
      "canvas.note_empty": "Double-click or press Enter to write",
      "canvas.note_markdown_hint": "Markdown · $formula$ · ```code``` · Esc — done",
      "canvas.note_title_placeholder": "Title",
      "canvas.note_untitled": "Note from the canvas",
      "canvas.note_task_created": "Task {name} created next to the note",
      "canvas.note_document_created": "Document «{name}» created next to the note",
      "canvas.note_action_error": "Could not complete the action. Try again.",
      "canvas.content_notice_close": "Close the notice",
  ```
  ```ts
      // ru (блок B)
      "canvas.note_make_task": "Сделать задачей",
      "canvas.note_make_document": "Сделать документом",
      "canvas.note_empty": "Дважды щёлкните или нажмите Enter, чтобы писать",
      "canvas.note_markdown_hint": "Markdown · $формула$ · ```код``` · Esc — готово",
      "canvas.note_title_placeholder": "Заголовок",
      "canvas.note_untitled": "Заметка с холста",
      "canvas.note_task_created": "Задача {name} создана рядом с заметкой",
      "canvas.note_document_created": "Документ «{name}» создан рядом с заметкой",
      "canvas.note_action_error": "Не удалось выполнить действие. Повторите попытку.",
      "canvas.content_notice_close": "Закрыть уведомление",
  ```
  ```bash
  /Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pkg-build.sh ppm-brand
  ```
  Ожидается: `✔ Build complete` без ошибок.

- [ ] **Step 11: Проверка**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/note-markdown.test.ts
  ```
  Ожидается: `9 passed`. Затем формат, линт, типы:
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ../../node_modules/.bin/oxfmt \
    core/components/ppm-canvas/canvas-code.ts core/components/ppm-canvas/canvas-markdown.ts \
    core/components/ppm-canvas/canvas-content-actions.ts core/components/ppm-canvas/canvas-placement.ts \
    core/components/ppm-canvas/note-markdown.tsx core/components/ppm-canvas/shape.tsx \
    core/components/ppm-canvas/editor.tsx tests/ppm-canvas/note-markdown.test.ts
  cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxfmt packages/ppm-brand/src/translations/af21-canvas.ts && \
    node_modules/.bin/oxlint apps/web/core/components/ppm-canvas/{canvas-code,canvas-markdown,canvas-content-actions,canvas-placement}.ts \
    apps/web/core/components/ppm-canvas/note-markdown.tsx
  ```
  Ожидается `Found 0 warnings and 0 errors.`; фильтр tsc из Global Constraints — пусто. Весь набор web:
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run` — все зелёные (≈350 + новые).

**Acceptance (B1):**
- [ ] Критерий 3: на доске «Тест Холста» (проект 228) новая заметка показывает `## Заголовок`, списки, ссылку,
  `$\Delta E < 12$` и блок `$$…$$` KaTeX; ```` ```python ```` подсвечен; двойной клик/Enter — правка, Esc — просмотр.
- [ ] «Сделать задачей» создаёт задачу Plane (видна в «Задачах»), живая карточка — справа от заметки без наложения,
  уведомление «Задача ROBOT-… создана рядом с заметкой».
- [ ] «Сделать документом» создаёт документ в «Документах» с текстом заметки (формулы — исходником в коде), живая карточка
  документа рядом; «Убрать с холста» не удаляет задачу/документ (I1/I2).
- [ ] `<script>`, `<img onerror>`, `javascript:` в заметке отображаются текстом; во вкладке «Сеть» нет запросов вне API.
- [ ] v1 (`localStorage.ppm_design="v1"`) и старые заметки (`format: "plain"`) — прежний textarea.

---

### Task 9 (B2): Блок кода (K3, фото владельца) — номера строк, язык, тема, замок, «…»

**Files:**
- Create: `apps/web/core/components/ppm-canvas/code-block.tsx`
- Modify: `apps/web/core/components/ppm-canvas/canvas-code.ts` (дописать), `shape.tsx` (`NodeEditor`, после вставки B1),
  `note-markdown.tsx` (атрибут темы кода), `canvas-content.css`, `af21-canvas.ts` (блок «B»)
- Test: `apps/web/tests/ppm-canvas/code-block.test.ts` (новый)

**Interfaces:**
- Consumes (F): `code.language: string`, `code.theme: "light" | "dark" | "auto"`, `code.locked: boolean`, `code.wrap: boolean`
  (старые узлы мигрированы: `language` как было, `theme "auto"`, `locked false`, `wrap false`); B1: `highlightCodeLines`,
  `normalizeCodeLanguage`, `codeLanguageLabel`, `CANVAS_CODE_LANGUAGES`; `resolveGeneralTheme` (`@plane/utils`),
  `useTheme` (`next-themes`) — как в `editor.tsx:236-237`.
- Produces: `canvas-code.ts` — `codeFileExtension`, `codeDownloadName`, `insertSoftTab`, `nextCodeTheme`,
  `resolveCodeTheme`, `languageForFileName`, тип `TCodeTheme`; `code-block.tsx` — `CodeBlockCard`, тип `TCodePatch`;
  классы `.ppm-code-block`, `.ppm-code-block__*`, цвета `.hljs-*` для блока и заметки; ключи `canvas.code_theme`,
  `canvas.code_theme_auto`, `canvas.code_theme_light`, `canvas.code_theme_dark`, `canvas.code_language`,
  `canvas.code_lock`, `canvas.code_unlock`, `canvas.code_more`, `canvas.code_copy`, `canvas.code_copied`,
  `canvas.code_download`, `canvas.code_wrap`, `canvas.code_locked_hint`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/code-block.tsx apps/web/tests/ppm-canvas/code-block.test.ts
  ```
  (остальные файлы задачи уже сохранены в B1 — скрипт их пропускает).

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/code-block.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    CANVAS_CODE_LANGUAGES,
    codeDownloadName,
    codeFileExtension,
    codeLanguageLabel,
    highlightCodeLines,
    insertSoftTab,
    languageForFileName,
    nextCodeTheme,
    resolveCodeTheme,
  } from "@/components/ppm-canvas/canvas-code";

  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/${name}`, import.meta.url), "utf8");
  const shapeSource = read("shape.tsx");
  const codeSource = read("code-block.tsx");
  const css = read("canvas-content.css").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");

  describe("code block card (AF2.1 B2, K3)", () => {
    it("offers Plain Text first and the lowlight common set", () => {
      expect(CANVAS_CODE_LANGUAGES[0]).toBe("plaintext");
      expect(CANVAS_CODE_LANGUAGES).toHaveLength(37);
      expect(CANVAS_CODE_LANGUAGES).toEqual(expect.arrayContaining(["python", "typescript", "json", "sql", "bash"]));
      expect(codeLanguageLabel("plaintext")).toBe("Plain Text");
      expect(codeLanguageLabel("text")).toBe("Plain Text");
      expect(codeLanguageLabel("cpp")).toBe("C++");
    });

    it("splits highlighted code into numbered lines, multi-line tokens included", () => {
      const lines = highlightCodeLines('x = 1\n"""doc\nstring"""\nreturn x', "python");
      expect(lines).toHaveLength(4);
      expect(lines[1].map((segment) => segment.className)).toContain("hljs-string");
      expect(lines[2][0]).toEqual({ className: "hljs-string", text: 'string"""' });
      expect(lines[3][0]).toEqual({ className: "hljs-keyword", text: "return" });
      expect(highlightCodeLines("a\n", "plaintext")).toEqual([[{ className: "", text: "a" }], []]);
    });

    it("downloads with the right extension and a safe name", () => {
      expect(codeFileExtension("python")).toBe("py");
      expect(codeFileExtension("typescript")).toBe("ts");
      expect(codeFileExtension("text")).toBe("txt");
      expect(codeDownloadName("Классификатор цвета", "python")).toBe("Классификатор цвета.py");
      expect(codeDownloadName('a/b:c*?"<>|', "json")).toBe("a b c.json");
      expect(codeDownloadName("  ", "sql")).toBe("code.sql");
      expect(languageForFileName("calibrate.PY")).toBe("python");
      expect(languageForFileName("data.csv")).toBe("plaintext");
    });

    it("inserts and removes two-space indents with Tab / Shift+Tab", () => {
      expect(insertSoftTab("ab", 1, 1, false)).toEqual({ value: "a  b", start: 3, end: 3 });
      expect(insertSoftTab("a\nb", 0, 3, false)).toEqual({ value: "  a\n  b", start: 2, end: 7 });
      expect(insertSoftTab("  a\n  b", 0, 7, true)).toEqual({ value: "a\nb", start: 0, end: 3 });
      expect(insertSoftTab("  ab", 2, 2, true)).toEqual({ value: "ab", start: 0, end: 0 });
    });

    it("cycles the block theme auto → light → dark and resolves auto by the app theme", () => {
      expect(nextCodeTheme("auto")).toBe("light");
      expect(nextCodeTheme("light")).toBe("dark");
      expect(nextCodeTheme("dark")).toBe("auto");
      expect(resolveCodeTheme("auto", true)).toBe("dark");
      expect(resolveCodeTheme("auto", false)).toBe("light");
      expect(resolveCodeTheme("light", true)).toBe("light");
    });

    it("mounts the K3 block only under grammar v2 and never executes or injects code", () => {
      expect(shapeSource).toMatch(/grammarV2 && node\.kind === "code"/);
      expect(codeSource).not.toMatch(/dangerouslySetInnerHTML|new Function|eval\(/);
      expect(codeSource).toContain('event.code === "Tab"');
      expect(codeSource).not.toMatch(/event\.key ===/);
      expect(css).toContain(':where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block[data-theme="dark"]');
    });

    it("names the toolbar in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.code_lock")).toBe("Только чтение");
      expect(getPpmTranslation("ru", "canvas.code_download")).toBe("Скачать файлом");
      expect(getPpmTranslation("ru", "canvas.code_wrap")).toBe("Перенос строк");
      expect(getPpmTranslation("en", "canvas.code_copy")).toBe("Copy");
    });
  });
  ```
  Запуск: `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/code-block.test.ts`
  → FAIL: `does not provide an export named 'codeDownloadName'`.

- [ ] **Step 3: `canvas-code.ts` — дописать в конец**
  ```ts
  // ── B2: блок кода ──
  export type TCodeTheme = "auto" | "dark" | "light";

  const CODE_FILE_EXTENSIONS: Readonly<Record<string, string>> = {
    plaintext: "txt",
    arduino: "ino",
    bash: "sh",
    c: "c",
    cpp: "cpp",
    csharp: "cs",
    css: "css",
    diff: "diff",
    go: "go",
    graphql: "graphql",
    ini: "ini",
    java: "java",
    javascript: "js",
    json: "json",
    kotlin: "kt",
    less: "less",
    lua: "lua",
    makefile: "mk",
    markdown: "md",
    objectivec: "m",
    perl: "pl",
    php: "php",
    "php-template": "php",
    python: "py",
    "python-repl": "py",
    r: "r",
    ruby: "rb",
    rust: "rs",
    scss: "scss",
    shell: "sh",
    sql: "sql",
    swift: "swift",
    typescript: "ts",
    vbnet: "vb",
    wasm: "wat",
    xml: "xml",
    yaml: "yaml",
  };

  export function codeFileExtension(language: string): string {
    return CODE_FILE_EXTENSIONS[normalizeCodeLanguage(language)] ?? "txt";
  }

  export function codeDownloadName(title: string, language: string): string {
    const base =
      title
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120) || "code";
    return `${base}.${codeFileExtension(language)}`;
  }

  /** Язык подсветки по имени файла («calibrate.py» → python); неизвестное — Plain Text. */
  export function languageForFileName(name: string): string {
    const extension = /\.([a-z0-9+#-]+)$/i.exec(name)?.[1] ?? "";
    return normalizeCodeLanguage(extension);
  }

  /** Tab — два пробела у курсора или у каждой строки выделения; Shift+Tab — снять до двух пробелов. */
  export function insertSoftTab(
    value: string,
    start: number,
    end: number,
    outdent: boolean
  ): { end: number; start: number; value: string } {
    const indent = "  ";
    if (!outdent && start === end) {
      return { end: start + indent.length, start: start + indent.length, value: value.slice(0, start) + indent + value.slice(end) };
    }
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.slice(lineStart, end);
    const lines = block.split("\n");
    const changed = lines.map((line) => (outdent ? line.replace(/^ {1,2}/, "") : indent + line));
    const nextBlock = changed.join("\n");
    const firstDelta = changed[0].length - lines[0].length;
    return {
      end: end + (nextBlock.length - block.length),
      start: Math.max(lineStart, start + firstDelta),
      value: value.slice(0, lineStart) + nextBlock + value.slice(end),
    };
  }

  export function nextCodeTheme(theme: TCodeTheme): TCodeTheme {
    return theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
  }

  export function resolveCodeTheme(theme: TCodeTheme, appDark: boolean): "dark" | "light" {
    if (theme === "auto") return appDark ? "dark" : "light";
    return theme;
  }
  ```
  Проверка по тесту: `insertSoftTab("a\nb", 0, 3, false)` → `lineStart = 0`, блок `"a\nb"` → `"  a\n  b"`, `start = 2`,
  `end = 7`; `insertSoftTab("  ab", 2, 2, true)` → блок `"  "` → `""`, `start = 0`, `end = 0`.

- [ ] **Step 4: `code-block.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useMemo, useState, type KeyboardEvent } from "react";
  import { Copy, Download, Ellipsis, Lock, LockOpen, Moon, Sun, SunMoon, WrapText } from "lucide-react";
  import { useTheme } from "next-themes";
  import { stopEventPropagation, useValue, type Editor } from "tldraw";
  import type { TPpmCanvasOwnedNode } from "@ppm/canvas";
  import { resolveGeneralTheme } from "@plane/utils";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import {
    CANVAS_CODE_LANGUAGES,
    codeDownloadName,
    codeLanguageLabel,
    highlightCodeLines,
    insertSoftTab,
    nextCodeTheme,
    normalizeCodeLanguage,
    resolveCodeTheme,
  } from "./canvas-code";
  import type { TPpmCanvasShape } from "./shape";

  type TCodeNode = Extract<TPpmCanvasOwnedNode, { kind: "code" }>;
  export type TCodePatch = Partial<Pick<TCodeNode, "code" | "language" | "locked" | "theme" | "title" | "wrap">>;

  const THEME_LABEL_KEYS = {
    auto: "canvas.code_theme_auto",
    dark: "canvas.code_theme_dark",
    light: "canvas.code_theme_light",
  } as const;

  // AF2.1 B2 (K3): блок кода — номера строк, подсветка lowlight, тема блока, замок, «…». Код только хранится и
  // показывается (executable: false в схеме): никакого eval/innerHTML — подсветка собирается React-элементами.
  export function CodeBlockCard({
    editor,
    node,
    onPatch,
    shape,
  }: {
    editor: Editor;
    node: TCodeNode;
    onPatch: (patch: TCodePatch) => void;
    shape: TPpmCanvasShape;
  }) {
    const ppmT = usePpmTranslation();
    const { resolvedTheme } = useTheme();
    const readonly = editor.getInstanceState().isReadonly;
    const locked = readonly || node.locked;
    const editingShape = useValue("ppm code editing", () => editor.getEditingShapeId() === shape.id, [editor, shape.id]);
    const editing = editingShape && !locked;
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const language = normalizeCodeLanguage(node.language);
    const lines = useMemo(() => highlightCodeLines(node.code, language), [language, node.code]);
    const theme = resolveCodeTheme(node.theme, resolveGeneralTheme(resolvedTheme) === "dark");

    const onSourceKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation();
      if (event.code === "Tab") {
        event.preventDefault();
        const target = event.currentTarget;
        const next = insertSoftTab(target.value, target.selectionStart, target.selectionEnd, event.shiftKey);
        onPatch({ code: next.value });
        requestAnimationFrame(() => target.setSelectionRange(next.start, next.end));
        return;
      }
      if (event.code === "Escape" || (event.code === "Enter" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        editor.setEditingShape(null);
      }
    };

    const copy = async () => {
      setMenuOpen(false);
      try {
        await navigator.clipboard.writeText(node.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
      } catch {
        setCopied(false);
      }
    };

    const download = () => {
      setMenuOpen(false);
      const url = URL.createObjectURL(new Blob([node.code], { type: "text/plain;charset=utf-8" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = codeDownloadName(node.title, language);
      anchor.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="ppm-code-block" data-locked={node.locked || undefined} data-theme={theme}>
        <header className="ppm-code-block__toolbar">
          <button
            type="button"
            className="ppm-code-block__tool"
            aria-label={`${ppmT("canvas.code_theme")}: ${ppmT(THEME_LABEL_KEYS[node.theme])}`}
            title={`${ppmT("canvas.code_theme")}: ${ppmT(THEME_LABEL_KEYS[node.theme])}`}
            disabled={readonly}
            onClick={() => onPatch({ theme: nextCodeTheme(node.theme) })}
            onPointerDown={stopEventPropagation}
          >
            {node.theme === "dark" ? (
              <Moon aria-hidden="true" />
            ) : node.theme === "light" ? (
              <Sun aria-hidden="true" />
            ) : (
              <SunMoon aria-hidden="true" />
            )}
          </button>
          <select
            aria-label={ppmT("canvas.code_language")}
            className="ppm-code-block__language"
            disabled={readonly}
            value={language}
            onChange={(event) => onPatch({ language: event.currentTarget.value })}
            onKeyDown={stopEventPropagation}
            onPointerDown={stopEventPropagation}
          >
            {CANVAS_CODE_LANGUAGES.map((id) => (
              <option key={id} value={id}>
                {codeLanguageLabel(id)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ppm-code-block__tool"
            aria-label={ppmT(node.locked ? "canvas.code_unlock" : "canvas.code_lock")}
            aria-pressed={node.locked}
            title={ppmT(node.locked ? "canvas.code_locked_hint" : "canvas.code_lock")}
            disabled={readonly}
            onClick={() => onPatch({ locked: !node.locked })}
            onPointerDown={stopEventPropagation}
          >
            {node.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          </button>
          <div className="ppm-code-block__menu-anchor">
            <button
              type="button"
              className="ppm-code-block__tool"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={ppmT("canvas.code_more")}
              onClick={() => setMenuOpen((open) => !open)}
              onPointerDown={stopEventPropagation}
            >
              <Ellipsis aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="ppm-code-block__menu" role="menu">
                <button type="button" role="menuitem" onClick={() => void copy()} onPointerDown={stopEventPropagation}>
                  <Copy aria-hidden="true" />
                  {ppmT("canvas.code_copy")}
                </button>
                <button type="button" role="menuitem" onClick={download} onPointerDown={stopEventPropagation}>
                  <Download aria-hidden="true" />
                  {ppmT("canvas.code_download")}
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={node.wrap}
                  disabled={readonly}
                  onClick={() => {
                    setMenuOpen(false);
                    onPatch({ wrap: !node.wrap });
                  }}
                  onPointerDown={stopEventPropagation}
                >
                  <WrapText aria-hidden="true" />
                  {ppmT("canvas.code_wrap")}
                </button>
              </div>
            )}
          </div>
          {copied && (
            <span className="ppm-code-block__copied" role="status">
              {ppmT("canvas.code_copied")}
            </span>
          )}
        </header>
        <div
          className="ppm-code-block__body"
          data-wrap={node.wrap || undefined}
          onWheelCapture={editing ? stopEventPropagation : undefined}
        >
          <ol className="ppm-code-block__gutter" aria-hidden="true">
            {lines.map((_, index) => (
              <li key={index}>{index + 1}</li>
            ))}
          </ol>
          <div className="ppm-code-block__code">
            <pre aria-label={codeLanguageLabel(language)}>
              <code>
                {lines.map((line, lineIndex) => (
                  <span className="ppm-code-block__line" key={lineIndex}>
                    {line.map((segment, segmentIndex) => (
                      <span className={segment.className || undefined} key={segmentIndex}>
                        {segment.text}
                      </span>
                    ))}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
            {editing && (
              <textarea
                // oxlint-disable-next-line jsx_a11y/no-autofocus -- правка начинается двойным кликом или Enter
                autoFocus
                aria-label={ppmT("canvas.code_body_placeholder")}
                className="ppm-code-block__source"
                maxLength={100_000}
                spellCheck={false}
                value={node.code}
                wrap={node.wrap ? "soft" : "off"}
                onChange={(event) => onPatch({ code: event.currentTarget.value })}
                onKeyDown={onSourceKeyDown}
                onPointerDown={stopEventPropagation}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
  ```
  Ключ `canvas.code_body_placeholder` уже есть (`shape.tsx:779`). Замок: при `locked` состояние редактирования tldraw
  игнорируется (textarea не показывается), язык/тема/перенос меняются только снятием замка редактором проекта.

- [ ] **Step 5: `shape.tsx` — маршрут блока кода и тема кода в заметке**
  Импорт рядом с `NoteCardV2`: `import { CodeBlockCard } from "./code-block";`. В `NodeEditor` перед веткой заметки B1:
  ```tsx
    // AF2.1 B2: блок кода K3 — только под грамматикой v2; v1 — прежний NativeNodeCard (textarea + поле «Язык»).
    if (grammarV2 && node.kind === "code") {
      return (
        <CodeBlockCard editor={editor} node={node} shape={shape} onPatch={(patch) => updateNode(editor, shape, node, patch)} />
      );
    }
  ```
  `note-markdown.tsx` — тема подсветки кода в заметке следует теме приложения. Импорты: `import { useTheme } from
  "next-themes";`, `import { resolveGeneralTheme } from "@plane/utils";`. В теле после `const canAct = …`:
  ```tsx
    const { resolvedTheme } = useTheme();
    const codeTheme = resolveGeneralTheme(resolvedTheme) === "dark" ? "dark" : "light";
  ```
  Было: `<div className="ppm-note-card" data-editing={editing && !readonly ? true : undefined}>`
  Стало: `<div className="ppm-note-card" data-code-theme={codeTheme} data-editing={editing && !readonly ? true : undefined}>`

- [ ] **Step 6: Стили** — дописать в `canvas-content.css`:
  ```css
  /* AF2.1 B2 · Блок кода (K3) и подсветка hljs для блока и заметки. Палитра — своя, светлая/тёмная, ≥ 4.5:1. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card {
    --ppm-code-bg: #f6f8fa;
    --ppm-code-text: #1f2328;
    --ppm-code-gutter: #6e7781;
    --ppm-code-keyword: #cf222e;
    --ppm-code-string: #0a3069;
    --ppm-code-number: #0550ae;
    --ppm-code-comment: #57606a;
    --ppm-code-title: #8250df;
    --ppm-code-builtin: #953800;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block[data-theme="dark"],
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card[data-code-theme="dark"] {
    --ppm-code-bg: #0d1117;
    --ppm-code-text: #e6edf3;
    --ppm-code-gutter: #8b949e;
    --ppm-code-keyword: #ff7b72;
    --ppm-code-string: #a5d6ff;
    --ppm-code-number: #79c0ff;
    --ppm-code-comment: #8b949e;
    --ppm-code-title: #d2a8ff;
    --ppm-code-builtin: #ffa657;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block {
    display: flex;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-code-text, #1f2328);
    background: var(--ppm-code-bg, #f6f8fa);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__toolbar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    border-bottom: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__tool {
    display: inline-grid;
    width: var(--ppm-control-height-sm, 1.75rem);
    height: var(--ppm-control-height-sm, 1.75rem);
    place-items: center;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    color: inherit;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__tool svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__language {
    height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.375rem;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    color: inherit;
    background: transparent;
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu-anchor {
    position: relative;
    margin-left: auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu {
    position: absolute;
    z-index: 2;
    top: calc(100% + 0.25rem);
    right: 0;
    display: grid;
    min-width: 11rem;
    padding: 0.25rem;
    border: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.5rem;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    font-size: 0.75rem;
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu button[aria-checked="true"] {
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__copied {
    font-size: 0.6875rem;
    color: var(--ppm-code-gutter, #6e7781);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__body {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__gutter {
    position: sticky;
    left: 0;
    margin: 0;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    color: var(--ppm-code-gutter, #6e7781);
    background: var(--ppm-code-bg, #f6f8fa);
    list-style: none;
    text-align: right;
    user-select: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__code {
    display: grid;
    min-width: 0;
    flex: 1 1 auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__code > :where(pre, textarea) {
    grid-area: 1 / 1;
    margin: 0;
    padding: 0.5rem 0.75rem 0.5rem 0.25rem;
    border: 0;
    font: inherit;
    line-height: inherit;
    tab-size: 2;
    white-space: pre;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__body[data-wrap] .ppm-code-block__code > :where(pre, textarea) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__source {
    overflow: hidden;
    resize: none;
    color: transparent;
    background: transparent;
    caret-color: var(--ppm-code-text, #1f2328);
    outline: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__line {
    display: inline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-keyword, .hljs-selector-tag, .hljs-doctag) {
    color: var(--ppm-code-keyword, #cf222e);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-string, .hljs-regexp, .hljs-meta .hljs-string) {
    color: var(--ppm-code-string, #0a3069);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-number, .hljs-literal, .hljs-attr, .hljs-variable, .hljs-attribute) {
    color: var(--ppm-code-number, #0550ae);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-comment, .hljs-quote, .hljs-meta) {
    color: var(--ppm-code-comment, #57606a);
    font-style: italic;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-title, .hljs-section, .hljs-name) {
    color: var(--ppm-code-title, #8250df);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-built_in, .hljs-type, .hljs-params) {
    color: var(--ppm-code-builtin, #953800);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card .ppm-note-code {
    color: var(--ppm-code-text, #1f2328);
    background: var(--ppm-code-bg, #f6f8fa);
  }
  ```
  Внимание: внутри `:where(...)` здесь запятые — это допустимо для `canvas-content.css` (правило «без запятых внутри
  `:is()/:not()`» относится к тесту `canvas-v2-css.test.ts`, который делит список по запятой; наш тест ищет подстроку).

- [ ] **Step 7: Строки** — блок «B» `af21-canvas.ts`:
  ```ts
      // en
      "canvas.code_theme": "Block theme",
      "canvas.code_theme_auto": "as the app",
      "canvas.code_theme_light": "light",
      "canvas.code_theme_dark": "dark",
      "canvas.code_language": "Language",
      "canvas.code_lock": "Read only",
      "canvas.code_unlock": "Allow editing",
      "canvas.code_locked_hint": "Read only — unlock to edit",
      "canvas.code_more": "More actions",
      "canvas.code_copy": "Copy",
      "canvas.code_copied": "Copied",
      "canvas.code_download": "Download as a file",
      "canvas.code_wrap": "Wrap lines",
  ```
  ```ts
      // ru
      "canvas.code_theme": "Тема блока",
      "canvas.code_theme_auto": "как в приложении",
      "canvas.code_theme_light": "светлая",
      "canvas.code_theme_dark": "тёмная",
      "canvas.code_language": "Язык",
      "canvas.code_lock": "Только чтение",
      "canvas.code_unlock": "Разрешить правку",
      "canvas.code_locked_hint": "Только чтение — снимите замок, чтобы править",
      "canvas.code_more": "Ещё действия",
      "canvas.code_copy": "Копировать",
      "canvas.code_copied": "Скопировано",
      "canvas.code_download": "Скачать файлом",
      "canvas.code_wrap": "Перенос строк",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 8: Проверка**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/code-block.test.ts tests/ppm-canvas/note-markdown.test.ts
  ```
  Ожидается: `16 passed`. Формат/линт/типы — как в B1 Step 11 для `canvas-code.ts`, `code-block.tsx`, `note-markdown.tsx`,
  `shape.tsx`, `tests/ppm-canvas/code-block.test.ts`, `af21-canvas.ts`.

**Acceptance (B2):**
- [ ] Критерий 3: блок кода на тестовой доске — номера строк, подсветка Python (как на фото владельца), смена языка
  (Plain Text первым), тема ☀/☾/авто, замок «только чтение» (двойной клик не открывает правку), «…»: Копировать,
  Скачать файлом (`<заголовок>.py`), Перенос строк.
- [ ] Tab/⇧Tab делают отступ 2 пробела, Esc/⌘Enter — выход из правки; горячие клавиши холста при вводе не срабатывают.
- [ ] Читатель видит блок, может копировать и скачать; правка/язык/тема/замок недоступны. v1 — прежняя карточка кода.

---

### Task 10 (B3): Документы — живая карточка, «Новый документ», «Документ PPM», превью из `description_html`

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-pages.ts`, `canvas-page-picker.tsx`
- Modify: `apps/web/core/services/ppm-canvas.service.ts` (метод `searchPages`, схема ответа)
- Modify: `canvas-content-actions.ts` (поля `createPage`, `openPagePicker`, `loadPageHtml`)
- Modify: `shape.tsx` — `ContentProjectionCard` `:2474-2584` (ветка страницы под v2)
- Modify: `editor.tsx` — блок B (создание/поиск/кеш превью, слушатель команд, выбор документа)
- Modify: `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/content-pages.test.ts` (новый)

**Interfaces:**
- Consumes: S — `GET /api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/projections/search/?types=page&q=&limit=`
  → `{ results: TPpmCanvasContentProjection[] (entity_type "page"), next_cursor }` (CONTRACTS §5; если S выберет
  отдельный путь `…/projections/pages/` — поменять одну строку в `searchPages`). **Запасной путь, пока S не готов:**
  `ProjectPageService.fetchAll(workspaceSlug, projectId)` (Plane `GET /api/workspaces/<slug>/projects/<pid>/pages/`
  отдаёт только свои и публичные страницы, `app/views/page/base.py:98`) с фильтром по имени на клиенте — выбирается
  автоматически при любой ошибке/несовпадении схемы серверного поиска. F — ветка `page` в `createPpmContentRefNode`
  (узел `page_ref` 360×240). R — id команд `add-document-page` («Новый документ») и `add-page-ref` («Документ PPM»)
  в `commands.ts`. Существующие: `ProjectPageService.fetchById(slug, pid, id, false)` (`description_html`),
  `ppmCanvasContentProjectionSchema` (`@ppm/canvas`), `formatDueDate`, `fillCanvasTemplate`, `useLazyPreview`.
- Produces: `PpmCanvasService.searchPages`, тип `TPpmCanvasPageSearchResponse`; `canvas-pages.ts` — `searchCanvasPages`,
  `formatPageUpdated`, `CANVAS_PAGE_SEARCH_LIMIT`, типы `TCanvasPageHit`, `TCanvasPageSearchDeps`;
  `canvas-page-picker.tsx` — `PpmCanvasPagePicker`; поля контекста `createPage`, `openPagePicker`, `loadPageHtml`;
  ключи `canvas.page_new`, `canvas.page_pick_title`, `canvas.page_search_placeholder`, `canvas.page_search_empty`,
  `canvas.page_search_fallback`, `canvas.page_untitled`, `canvas.page_updated`, `canvas.page_created`,
  `canvas.page_placed`, `canvas.page_preview_error`, `canvas.page_open`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-pages.ts apps/web/core/components/ppm-canvas/canvas-page-picker.tsx \
    apps/web/core/services/ppm-canvas.service.ts apps/web/tests/ppm-canvas/content-pages.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/content-pages.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it, vi } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { formatPageUpdated, searchCanvasPages } from "@/components/ppm-canvas/canvas-pages";

  const P1 = "11111111-1111-4111-8111-111111111111";
  const P2 = "22222222-2222-4222-8222-222222222222";
  const WS = "33333333-3333-4333-8333-333333333333";
  const PR = "44444444-4444-4444-8444-444444444444";
  const shapeSource = readFileSync(new URL("../../core/components/ppm-canvas/shape.tsx", import.meta.url), "utf8");

  function pageProjection(id: string, title: string, excerpt: string | null) {
    return {
      identity: { entity_type: "page" as const, entity_id: id, workspace_id: WS, project_id: PR, source_url: `/ws/projects/${PR}/pages/${id}` },
      display: {
        title,
        excerpt,
        extension: ".page",
        mime_type: "text/html",
        size_bytes: 10,
        preview_url: null,
        source_status: "active" as const,
      },
      capabilities: { read: true, update: true, delete_source: false },
      source_version: "2026-09-24T12:00:00+00:00",
    };
  }

  describe("Documents on the canvas (AF2.1 B3)", () => {
    it("uses the canvas pages search when the server supports it", async () => {
      const listProjectPages = vi.fn();
      const result = await searchCanvasPages("отчёт", {
        listProjectPages,
        searchServer: async () => ({
          results: [pageProjection(P1, "Отчёт о калибровке", "Датчик TCS34725…")],
          next_cursor: null,
        }),
      });
      expect(result).toEqual({
        source: "server",
        hits: [{ excerpt: "Датчик TCS34725…", id: P1, title: "Отчёт о калибровке" }],
      });
      expect(listProjectPages).not.toHaveBeenCalled();
    });

    it("falls back to the Plane pages list filtered on the client", async () => {
      const result = await searchCanvasPages("КАЛИБ", {
        listProjectPages: async () => [
          { id: P2, name: "Протокол калибровки", archived_at: null },
          { id: P1, name: "Калибровка: отчёт", archived_at: null },
          { id: "55555555-5555-4555-8555-555555555555", name: "Калибровка (архив)", archived_at: "2026-09-01T00:00:00Z" },
          { id: "66666666-6666-4666-8666-666666666666", name: "Спринт 4", archived_at: null },
        ],
        searchServer: async () => {
          throw new Error("404");
        },
      });
      expect(result.source).toBe("fallback");
      expect(result.hits.map((hit) => hit.id)).toEqual([P1, P2]);
    });

    it("shows when the document changed instead of a raw version", () => {
      expect(formatPageUpdated("2026-09-24T12:00:00+00:00", "ru", "изменён {date}")).toBe("изменён 24 сент.");
      expect(formatPageUpdated(null, "ru", "изменён {date}")).toBeNull();
      expect(formatPageUpdated("7", "ru", "изменён {date}")).toBeNull();
    });

    it("renders the page preview through the sanitizer and hides the «.page» pseudo-extension", () => {
      expect(shapeSource).toContain("sanitizeCanvasHtml(pageHtml)");
      expect(shapeSource).toMatch(/binding\.entity_type === "page" \? null/);
    });

    it("names the Documents actions in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.page_new")).toBe("Новый документ");
      expect(getPpmTranslation("ru", "canvas.page_pick_title")).toBe("Документ PPM");
      expect(getPpmTranslation("en", "canvas.page_new")).toBe("New document");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-pages"`.

- [ ] **Step 3: `ppm-canvas.service.ts` — поиск документов**
  Импорты: `import { z } from "zod";` в начало; в список из `@ppm/canvas` (`:3-41`) добавить
  `ppmCanvasContentProjectionSchema,`. После импортов (перед `const PPM_ASSET_API_BASE_URL`):
  ```ts
  // AF2.1 B3: поиск документов для Холста (сервер S). Ответ — проекции содержимого только типа «page».
  const ppmCanvasPageSearchResponseSchema = z.object({
    results: z.array(ppmCanvasContentProjectionSchema),
    next_cursor: z.string().nullable(),
  });
  export type TPpmCanvasPageSearchResponse = z.infer<typeof ppmCanvasPageSearchResponseSchema>;
  ```
  Метод — сразу после `searchWorkItems` (`:242-257`):
  ```ts
  async searchPages(
    workspaceId: string,
    projectId: string,
    query: string,
    cursor?: string,
    limit = 20
  ): Promise<TPpmCanvasPageSearchResponse> {
    try {
      const response = await this.get(`${this.projectPath(workspaceId, projectId)}/projections/search/`, {
        params: { types: "page", q: query, cursor, limit },
      });
      return ppmCanvasPageSearchResponseSchema.parse(response.data);
    } catch (error) {
      throw normalizeCanvasError(error);
    }
  }
  ```
  (Если сервер ещё отдаёт задачи на `types=page`, `parse` падает на `entity_type` — это и есть сигнал запасного пути.)

- [ ] **Step 4: `canvas-pages.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPage } from "@plane/types";
  import type { TPpmCanvasPageSearchResponse } from "@/services/ppm-canvas.service";
  import { fillCanvasTemplate, formatDueDate } from "./canvas-grammar";

  // AF2.1 B3: «Документ PPM» — поиск существующих документов. Основной путь — поиск Холста (S): только видимые
  // пользователю страницы проекта. Запасной — список Plane (свои + публичные) с фильтром по имени на клиенте.
  export const CANVAS_PAGE_SEARCH_LIMIT = 20;

  export type TCanvasPageHit = { excerpt: string | null; id: string; title: string };

  export type TCanvasPageSearchDeps = {
    listProjectPages: () => Promise<Partial<TPage>[]>;
    searchServer: (query: string) => Promise<TPpmCanvasPageSearchResponse>;
  };

  export async function searchCanvasPages(
    query: string,
    deps: TCanvasPageSearchDeps
  ): Promise<{ hits: TCanvasPageHit[]; source: "fallback" | "server" }> {
    const trimmed = query.trim();
    try {
      const response = await deps.searchServer(trimmed);
      return {
        hits: response.results
          .filter((result) => result.identity.entity_type === "page" && result.display.source_status !== "deleted")
          .slice(0, CANVAS_PAGE_SEARCH_LIMIT)
          .map((result) => ({
            excerpt: result.display.excerpt,
            id: result.identity.entity_id,
            title: result.display.title,
          })),
        source: "server",
      };
    } catch {
      const needle = trimmed.toLocaleLowerCase("ru");
      const pages = await deps.listProjectPages();
      const hits = pages
        .filter((page) => Boolean(page.id) && !page.archived_at)
        .map((page) => ({
          title: (page.name ?? "").trim(),
          id: page.id as string,
          updated: String(page.updated_at ?? ""),
        }))
        .filter((page) => !needle || page.title.toLocaleLowerCase("ru").includes(needle))
        .sort((left, right) => {
          const leftPrefix = left.title.toLocaleLowerCase("ru").startsWith(needle) ? 0 : 1;
          const rightPrefix = right.title.toLocaleLowerCase("ru").startsWith(needle) ? 0 : 1;
          return leftPrefix - rightPrefix || right.updated.localeCompare(left.updated) || left.title.localeCompare(right.title, "ru");
        })
        .slice(0, CANVAS_PAGE_SEARCH_LIMIT)
        .map(({ id, title }) => ({ excerpt: null, id, title }));
      return { hits, source: "fallback" };
    }
  }

  /** У страниц source_version = updated_at (ISO) — показываем «изменён 24 сент.», а не «v2026-09-24T…». */
  export function formatPageUpdated(
    sourceVersion: string | null | undefined,
    locale: string,
    template: string
  ): string | null {
    const date = /^(\d{4}-\d{2}-\d{2})T/.exec(sourceVersion ?? "")?.[1];
    return date ? fillCanvasTemplate(template, { date: formatDueDate(date, locale) }) : null;
  }
  ```
  Проверка сортировки теста: «Калибровка: отчёт» начинается с «калиб» (0), «Протокол калибровки» — нет (1) → `[P1, P2]`;
  архивная и «Спринт 4» отфильтрованы.

- [ ] **Step 5: `canvas-content-actions.ts` — новые поля**
  В тип `TPpmCanvasContentActions` добавить:
  ```ts
    /** «Новый документ»: создать страницу и положить живую карточку (свободное место в видимой области). */
    createPage: () => Promise<void>;
    /** HTML страницы для превью карточки (кеш по id и версии); null — недоступно. */
    loadPageHtml: (pageId: string, sourceVersion: string | null) => Promise<string | null>;
    /** «Документ PPM»: открыть поиск существующих документов. */
    openPagePicker: () => void;
  ```
  В значение по умолчанию: `createPage: async () => undefined, loadPageHtml: async () => null, openPagePicker: () => undefined,`.

- [ ] **Step 6: `canvas-page-picker.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useRef, useState, type KeyboardEvent } from "react";
  import { createPortal } from "react-dom";
  import { FileText, LoaderCircle, Search, X } from "lucide-react";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { searchCanvasPages, type TCanvasPageHit, type TCanvasPageSearchDeps } from "./canvas-pages";

  // AF2.1 B3: «Документ PPM» — поиск существующих документов. Порталом в body: внутри редактора остаётся ровно один
  // [role="dialog"] (предпросмотр импорта, e2e-якорь).
  export function PpmCanvasPagePicker({
    deps,
    onClose,
    onPick,
  }: {
    deps: TCanvasPageSearchDeps;
    onClose: () => void;
    onPick: (hit: TCanvasPageHit) => Promise<void>;
  }) {
    const ppmT = usePpmTranslation();
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<TCanvasPageHit[]>([]);
    const [source, setSource] = useState<"fallback" | "server">("server");
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState<string>();
    const requestRef = useRef(0);

    useEffect(() => {
      const request = ++requestRef.current;
      setLoading(true);
      const timer = window.setTimeout(() => {
        void searchCanvasPages(query, deps)
          .then((result) => {
            if (request !== requestRef.current) return;
            setHits(result.hits);
            setSource(result.source);
          })
          .catch(() => {
            if (request === requestRef.current) setHits([]);
          })
          .finally(() => {
            if (request === requestRef.current) setLoading(false);
          });
      }, 250);
      return () => window.clearTimeout(timer);
    }, [deps, query]);

    const pick = async (hit: TCanvasPageHit) => {
      if (placing) return;
      setPlacing(hit.id);
      try {
        await onPick(hit);
        onClose();
      } finally {
        setPlacing(undefined);
      }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.code === "Escape") onClose();
      if (event.code === "Enter" && hits[0] && event.target instanceof HTMLInputElement) void pick(hits[0]);
    };

    return createPortal(
      <div className="ppm-canvas-content-backdrop" role="presentation" onPointerDown={onClose}>
        <div
          aria-label={ppmT("canvas.page_pick_title")}
          aria-modal="true"
          className="ppm-canvas-page-picker"
          role="dialog"
          onKeyDown={onKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <strong>{ppmT("canvas.page_pick_title")}</strong>
            <button type="button" aria-label={ppmT("canvas.close")} onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </header>
          <label className="ppm-canvas-page-picker__search">
            <Search aria-hidden="true" />
            <input
              // oxlint-disable-next-line jsx_a11y/no-autofocus -- диалог открыт командой, ввод начинается сразу
              autoFocus
              aria-label={ppmT("canvas.page_search_placeholder")}
              placeholder={ppmT("canvas.page_search_placeholder")}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            {loading && <LoaderCircle aria-hidden="true" />}
          </label>
          {source === "fallback" && <small>{ppmT("canvas.page_search_fallback")}</small>}
          <ul>
            {hits.map((hit) => (
              <li key={hit.id}>
                <button type="button" disabled={Boolean(placing)} onClick={() => void pick(hit)}>
                  <FileText aria-hidden="true" />
                  <span>
                    <strong>{hit.title || ppmT("canvas.page_untitled")}</strong>
                    {hit.excerpt && <small>{hit.excerpt}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!loading && hits.length === 0 && <p>{ppmT("canvas.page_search_empty")}</p>}
        </div>
      </div>,
      window.document.body
    );
  }
  ```
  Ключ `canvas.close` уже есть (`editor.tsx:2251`).

- [ ] **Step 7: `shape.tsx` — карточка документа под v2** (`ContentProjectionCard`, `:2474-2584`)
  Импорты: `import { PpmCanvasContentActionsContext } from "./canvas-content-actions";`,
  `import { sanitizeCanvasHtml } from "./canvas-markdown";`, `import { formatPageUpdated } from "./canvas-pages";`.
  В начале функции (после `const grammarV2 = usePpmCanvasGrammarV2();`, `:2487`):
  ```tsx
    const contentActions = useContext(PpmCanvasContentActionsContext);
    const { currentLocale } = useTranslation();
    const pageId = binding?.entity_type === "page" ? binding.entity_id : undefined;
    const pageVersion = binding?.source_version ?? null;
    const cardEditor = useEditor();
    const visible = useLazyPreview(cardEditor, shape.id);
    const [pageHtml, setPageHtml] = useState<string | null>(null);
    useEffect(() => {
      if (!grammarV2 || !pageId || !visible) return;
      let active = true;
      void contentActions.loadPageHtml(pageId, pageVersion).then((html) => {
        if (active) setPageHtml(html);
      });
      return () => {
        active = false;
      };
    }, [contentActions, grammarV2, pageId, pageVersion, visible]);
  ```
  (все хуки — до раннего `return` для `!binding`, `:2489`). В `LiveSourceHeader` (`:2518-2524`, строка `:2521`) было:
  ```tsx
          identifier={display.extension ? display.extension.slice(1).toUpperCase() : null}
  ```
  стало:
  ```tsx
          identifier={binding.entity_type === "page" ? null : display.extension ? display.extension.slice(1).toUpperCase() : null}
  ```
  Абзац превью (`:2534` `{display.excerpt && <p>{display.excerpt}</p>}`) было → стало:
  ```tsx
      {grammarV2 && binding.entity_type === "page" && pageHtml ? (
        <div
          className="ppm-live-card__page-preview"
          // oxlint-disable-next-line react/no-danger -- description_html прошёл sanitizeCanvasHtml (DOMPurify)
          dangerouslySetInnerHTML={{ __html: sanitizeCanvasHtml(pageHtml) }}
        />
      ) : (
        display.excerpt && <p>{display.excerpt}</p>
      )}
  ```
  Строка версии под v2 (`:2537` `<span className="ppm-canvas-node__vault-meta ppm-live-card__version">{liveMeta}</span>`) —
  для страницы дата изменения:
  ```tsx
        <span className="ppm-canvas-node__vault-meta ppm-live-card__version">
          {binding.entity_type === "page"
            ? (formatPageUpdated(binding.source_version, currentLocale, ppmT("canvas.page_updated")) ?? "")
            : liveMeta}
        </span>
  ```
  `useTranslation` уже импортирован (`shape.tsx:89`), `useEditor`, `useEffect`, `useState` — тоже.

- [ ] **Step 8: `editor.tsx` — блок B «документы»** (после блока B1 «действия содержимого»):
  ```ts
  // ── AF2.1 B · документы (новый, поиск, превью) ──
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const pageHtmlCacheRef = useRef(new Map<string, string | null>());
  const freePageCenter = useCallback(() => {
    const activeEditor = editorRef.current;
    if (!activeEditor) return undefined;
    const size = PPM_CANVAS_NODE_REGISTRY.page_ref;
    const spot = findFreeNodePosition(activeEditor, size.defaultWidth, size.defaultHeight);
    return { x: spot.x + size.defaultWidth / 2, y: spot.y + size.defaultHeight / 2 };
  }, []);
  const createPage = useCallback(async () => {
    if (!editableRef.current) return;
    try {
      const name = ppmT("canvas.page_untitled");
      const page = await pageService.create(workspaceSlug, projectId, {
        access: EPageAccess.PUBLIC,
        description_html: "<p></p>",
        name,
      });
      if (!page.id) throw new Error("Page id is missing.");
      await placePageBinding(page.id, freePageCenter());
      setContentNotice(fillCanvasTemplate(ppmT("canvas.page_created"), { name: page.name ?? name }));
    } catch {
      setContentNotice(ppmT("canvas.note_action_error"));
    }
  }, [freePageCenter, pageService, placePageBinding, ppmT, projectId, workspaceSlug]);
  const loadPageHtml = useCallback(
    async (pageId: string, sourceVersion: string | null) => {
      const key = `${pageId}:${sourceVersion ?? ""}`;
      if (pageHtmlCacheRef.current.has(key)) return pageHtmlCacheRef.current.get(key) ?? null;
      try {
        const page = await pageService.fetchById(workspaceSlug, projectId, pageId, false);
        const html = page.description_html?.trim() ? page.description_html.slice(0, 200_000) : null;
        pageHtmlCacheRef.current.set(key, html);
        return html;
      } catch {
        pageHtmlCacheRef.current.set(key, null);
        return null;
      }
    },
    [pageService, projectId, workspaceSlug]
  );
  const pageSearchDeps = useMemo(
    () => ({
      listProjectPages: () => pageService.fetchAll(workspaceSlug, projectId),
      searchServer: (query: string) => service.searchPages(workspaceId, projectId, query),
    }),
    [pageService, projectId, service, workspaceId, workspaceSlug]
  );
  const placeExistingPage = useCallback(
    async (hit: { id: string; title: string }) => {
      try {
        await placePageBinding(hit.id, freePageCenter());
        setContentNotice(fillCanvasTemplate(ppmT("canvas.page_placed"), { name: hit.title || ppmT("canvas.page_untitled") }));
      } catch {
        setContentNotice(ppmT("canvas.note_action_error"));
      }
    },
    [freePageCenter, placePageBinding, ppmT]
  );
  useEffect(() => {
    // Команды рейки R: «Новый документ» и «Документ PPM». Свой слушатель — чтобы не пробрасывать пропсы в оверлей.
    const onCommand = (event: Event) => {
      const detail = (event as CustomEvent<TPpmCanvasCommandDetail>).detail;
      if (!grammarV2 || detail?.boardId !== boardId || !editableRef.current) return;
      if (detail.command === "add-document-page") void createPage();
      if (detail.command === "add-page-ref") setPagePickerOpen(true);
    };
    window.addEventListener(PPM_CANVAS_COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(PPM_CANVAS_COMMAND_EVENT, onCommand);
  }, [boardId, createPage, grammarV2]);
  // ── /AF2.1 B ──
  ```
  В `contentActions` (блок B1) добавить `createPage, loadPageHtml, openPagePicker: () => setPagePickerOpen(true),` и эти
  зависимости в массив `useMemo`. Рядом с уведомлением содержимого (блок B1 в разметке) добавить:
  ```tsx
      {grammarV2 && pagePickerOpen && (
        <PpmCanvasPagePicker deps={pageSearchDeps} onClose={() => setPagePickerOpen(false)} onPick={placeExistingPage} />
      )}
  ```
  Импорт: `import { PpmCanvasPagePicker } from "./canvas-page-picker";`. Тип `TPpmCanvasCommandDetail` и
  `PPM_CANVAS_COMMAND_EVENT` уже импортированы (`editor.tsx:104`). Если R ещё не добавил `add-page-ref` в
  `PPM_CANVAS_COMMANDS`, tsc сообщит `TS2367` на сравнении — это нужда к R (`plan-B-needs.md`), не обходить приведением.

- [ ] **Step 9: Стили** — дописать в `canvas-content.css`:
  ```css
  /* AF2.1 B3 · Документ PPM: превью описания и выбор документа. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__page-preview {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__page-preview :where(h1, h2, h3, p, ul, ol) {
    margin: 0;
    font-size: inherit;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-content-backdrop {
    position: fixed;
    z-index: 60;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: var(--ppm-color-backdrop, rgb(0 0 0 / 0.4));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker {
    display: grid;
    width: min(32rem, 100%);
    max-height: min(36rem, 90vh);
    gap: 0.5rem;
    padding: 1rem;
    overflow: auto;
    border-radius: var(--ppm-radius-lg, 0.75rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker header,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker__search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker__search input {
    min-width: 0;
    flex: 1 1 auto;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker li button {
    display: flex;
    width: 100%;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker small {
    display: block;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }
  ```
  (Диалог — портал в `body`, вне `[data-ppm-canvas-grammar]`, поэтому его селекторы ограничены только обликом v2.)

- [ ] **Step 10: Строки** — блок «B»:
  ```ts
      // en
      "canvas.page_new": "New document",
      "canvas.page_pick_title": "PPM document",
      "canvas.page_search_placeholder": "Find a document by title",
      "canvas.page_search_empty": "No documents found",
      "canvas.page_search_fallback": "Search by title only",
      "canvas.page_untitled": "Untitled document",
      "canvas.page_updated": "changed {date}",
      "canvas.page_created": "Document «{name}» created",
      "canvas.page_placed": "Document «{name}» placed on the canvas",
  ```
  ```ts
      // ru
      "canvas.page_new": "Новый документ",
      "canvas.page_pick_title": "Документ PPM",
      "canvas.page_search_placeholder": "Найти документ по названию",
      "canvas.page_search_empty": "Документы не найдены",
      "canvas.page_search_fallback": "Поиск только по названию",
      "canvas.page_untitled": "Документ без названия",
      "canvas.page_updated": "изменён {date}",
      "canvas.page_created": "Документ «{name}» создан",
      "canvas.page_placed": "Документ «{name}» добавлен на холст",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 11: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/content-pages.test.ts`
  → `5 passed`; затем формат/линт/tsc (B1 Step 11) для `canvas-pages.ts`, `canvas-page-picker.tsx`,
  `canvas-content-actions.ts`, `shape.tsx`, `editor.tsx`, `ppm-canvas.service.ts`, теста и `af21-canvas.ts`.

**Acceptance (B3):**
- [ ] Критерий 1: «Документ» (Новый документ) создаёт страницу в «Документах» и кладёт живую карточку; «Документ PPM»
  находит существующую (сервер S или запасной путь с подписью «Поиск только по названию») и кладёт карточку.
- [ ] Карточка документа (K3): «Документы», заголовок, превью 4 строки из `description_html` (санитизировано),
  «изменён 24 сент.», «Открыть ↗»; приватный документ другого пользователя не виден (сервер).
- [ ] «Убрать с холста» не удаляет документ; v1 — прежняя карточка содержимого.

---

### Task 11 (B4): Вставка, перетаскивание и ⌘U → Хранилище (обработчики внешнего контента tldraw)

**Files:**
- Create (или заменить заглушку F): `apps/web/core/components/ppm-canvas/canvas-external-content.ts`
- Create: `apps/web/core/components/ppm-canvas/canvas-file-kind.ts`
- Modify: `editor.tsx` — блок B после `uploadDropToWorkItem` (`:1926-1955`), `handleFileDrop` (`:1957-1973`),
  атрибуты `<Tldraw>` (`onMount`, `acceptedImageMimeTypes`, `:2221-2226`), подсказка перетаскивания в разметке
- Modify: `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/files-external-content.test.ts` (новый)

**Interfaces:**
- Consumes: tldraw `editor.externalContentHandlers` (публичное поле, `Editor.ts:8888`), `registerExternalContentHandler`,
  `putExternalContent`, `getShapeAtPoint(point, { hitInside: true })`, `TLExternalContent` (`files` — `{ files, point?,
  ignoreParent? }`, `url` — `{ url, point? }`, `svg-text` — `{ text, point? }`; `external-content.ts:39-76`); вставка
  блобов tldraw называет файл `tldrawFile` (`ui/hooks/clipboard/pasteFiles.ts:17-19`), Chrome — `image.png`; ⌘U →
  `helpers.insertMedia()` → `putExternalContent({ type: "files", point: центр видимой области })` с фильтром
  `accept` из `acceptedImageMimeTypes`+`acceptedVideoMimeTypes` (`ui/overrides.ts:37-50`, `Tldraw.tsx:154-178`).
  PPM: `vaultService.uploadFile(workspaceId, projectId, file)` (`ppm-vault.service.ts:172`), `PpmVaultServiceError.code`
  (`VAULT_NAME_CONFLICT` → 409, `VAULT_INVALID_FILE_TYPE`, `VAULT_FILE_TOO_LARGE`), `addUploadedContent`
  (`editor.tsx:1888`), `fileService.uploadProjectAsset` (`:1932`), `createPpmCanvasNode` (заметка F → `format: "markdown"`).
  F — точка `onMount` в `<Tldraw>`; S — приём имени от клиента и 409 при конфликте (уже так: `ppm_vault/services.py:147,204`).
- Produces: `canvas-external-content.ts` — `registerPpmCanvasExternalContent(editor, getDeps) → () => void`,
  `putFilesIntoVault`, `pastedFileName`, `withNameSuffix`, `isVaultNameConflict`, `uploadWithUniqueName`, `dropHintKey`,
  `PPM_PASTE_MAX_FILES`, тип `TPpmCanvasExternalContentDeps`; `canvas-file-kind.ts` — `PPM_VAULT_UPLOAD_EXTENSIONS`,
  `PPM_VAULT_ACCEPT`, `fileExtension`, `extensionForMime`, `isVaultUploadable`; в `editor.tsx` — `handleTldrawMount`,
  `getExternalContentDeps`; класс `.ppm-canvas-drop-hint`; ключи `canvas.paste_saved`, `canvas.paste_unsupported`,
  `canvas.paste_upload_error`, `canvas.paste_svg_unsupported`, `canvas.drop_hint_one|few|many`, `canvas.drop_attached`,
  `canvas.link_note_title`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-external-content.ts apps/web/core/components/ppm-canvas/canvas-file-kind.ts \
    apps/web/tests/ppm-canvas/files-external-content.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/files-external-content.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { afterEach, describe, expect, it, vi } from "vitest";
  import type { Editor } from "tldraw";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    dropHintKey,
    pastedFileName,
    registerPpmCanvasExternalContent,
    type TPpmCanvasExternalContentDeps,
  } from "@/components/ppm-canvas/canvas-external-content";
  import { isVaultUploadable } from "@/components/ppm-canvas/canvas-file-kind";

  const editorSource = readFileSync(new URL("../../core/components/ppm-canvas/editor.tsx", import.meta.url), "utf8");
  const NOW = new Date(2026, 8, 25, 15, 30, 12);
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.png", { type: "image/png" });

  function createFakeEditor() {
    const previous = {
      files: vi.fn(async () => undefined),
      "svg-text": vi.fn(async () => undefined),
      url: vi.fn(async () => undefined),
    };
    const handlers: Record<string, ((info: unknown) => unknown) | null> = { ...previous };
    const fake = {
      externalContentHandlers: handlers,
      getViewportPageBounds: () => ({ center: { x: 500, y: 300 } }),
      putExternalContent: async (info: { type: string }) => handlers[info.type]?.(info),
      registerExternalContentHandler(type: string, handler: ((info: unknown) => unknown) | null) {
        handlers[type] = handler;
        return fake;
      },
    };
    return { editor: fake as unknown as Editor, handlers, previous };
  }

  function createDeps(overrides: Partial<TPpmCanvasExternalContentDeps> = {}) {
    const notices: string[] = [];
    const deps: TPpmCanvasExternalContentDeps = {
      canEdit: true,
      createLinkNote: vi.fn(),
      grammarV2: true,
      notify: (message) => notices.push(message),
      now: () => NOW,
      placeVaultEntry: vi.fn(async () => undefined),
      t: (key) => getPpmTranslation("ru", key),
      uploadToVault: vi.fn(async (file: File) => ({ id: `entry:${file.name}` })),
      ...overrides,
    };
    return { deps, notices };
  }

  afterEach(() => vi.restoreAllMocks());

  describe("paste, drop and ⌘U into the Vault (AF2.1 B4)", () => {
    it("gives pasted files a readable name and keeps real names", () => {
      expect(pastedFileName({ name: "image.png", type: "image/png" }, NOW)).toBe("Вставка-2026-09-25-153012.png");
      expect(pastedFileName({ name: "tldrawFile", type: "image/jpeg" }, NOW)).toBe("Вставка-2026-09-25-153012.jpg");
      expect(pastedFileName({ name: "Схема захвата.pdf", type: "application/pdf" }, NOW)).toBe("Схема захвата.pdf");
      expect(isVaultUploadable("Вставка-2026-09-25-153012.png")).toBe(true);
      expect(isVaultUploadable("anim.gif")).toBe(false);
    });

    it("uploads pasted files to the Vault and places live cards at the paste point", async () => {
      const { editor } = createFakeEditor();
      const { deps, notices } = createDeps();
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [png()], point: { x: 10, y: 20 } });
      expect(vi.mocked(deps.uploadToVault).mock.calls[0][0].name).toBe("Вставка-2026-09-25-153012.png");
      expect(deps.placeVaultEntry).toHaveBeenCalledWith("entry:Вставка-2026-09-25-153012.png", { x: 10, y: 20 }, 0);
      expect(notices.at(-1)).toContain("Сохранено в Хранилище: 1");
    });

    it("retries a name conflict with a numbered suffix", async () => {
      const { editor } = createFakeEditor();
      const conflict = Object.assign(new Error("Материал с таким именем уже существует."), { code: "VAULT_NAME_CONFLICT" });
      const uploadToVault = vi
        .fn<(file: File) => Promise<{ id: string }>>()
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce({ id: "entry-2" });
      const { deps } = createDeps({ uploadToVault });
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [png()] });
      expect(uploadToVault.mock.calls.map(([file]) => file.name)).toEqual([
        "Вставка-2026-09-25-153012.png",
        "Вставка-2026-09-25-153012 (2).png",
      ]);
      expect(deps.placeVaultEntry).toHaveBeenCalledWith("entry-2", { x: 500, y: 300 }, 0);
    });

    it("rejects formats the Vault does not accept with a Russian notice", async () => {
      const { editor } = createFakeEditor();
      const { deps, notices } = createDeps();
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [new File(["GIF89a"], "anim.gif", { type: "image/gif" })] });
      expect(deps.uploadToVault).not.toHaveBeenCalled();
      expect(notices.join(" ")).toContain("anim.gif");
      expect(notices.join(" ")).toContain("Хранилище не принимает");
    });

    it("keeps the v1 behaviour: delegates to the default tldraw handlers", async () => {
      const { editor, previous } = createFakeEditor();
      const { deps } = createDeps({ grammarV2: false });
      registerPpmCanvasExternalContent(editor, () => deps);
      const info = { type: "files" as const, files: [png()] };
      await editor.putExternalContent(info);
      expect(previous.files).toHaveBeenCalledWith(info);
      expect(deps.uploadToVault).not.toHaveBeenCalled();
    });

    it("turns a pasted URL into a link note without any network request", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { editor } = createFakeEditor();
      const { deps } = createDeps();
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "url", url: "https://example.org/report", point: { x: 1, y: 2 } });
      expect(deps.createLinkNote).toHaveBeenCalledWith("https://example.org/report", { x: 1, y: 2 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does nothing but explain for readers, and restores the handlers on dispose", async () => {
      const { editor, handlers, previous } = createFakeEditor();
      const { deps, notices } = createDeps({ canEdit: false });
      const dispose = registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [png()] });
      expect(deps.uploadToVault).not.toHaveBeenCalled();
      expect(notices).toEqual([getPpmTranslation("ru", "canvas.file_drop_placeholder")]);
      dispose();
      expect(handlers.files).toBe(previous.files);
      expect(handlers.url).toBe(previous.url);
    });

    it("picks the Russian plural for the drop hint and wires the handlers in onMount", () => {
      expect([1, 3, 5, 21].map((count) => dropHintKey(count, "ru"))).toEqual([
        "canvas.drop_hint_one",
        "canvas.drop_hint_few",
        "canvas.drop_hint_many",
        "canvas.drop_hint_one",
      ]);
      expect(dropHintKey(21, "en")).toBe("canvas.drop_hint_many");
      expect(editorSource).toContain("registerPpmCanvasExternalContent(mounted, getExternalContentDeps)");
      expect(editorSource).toMatch(/if \(grammarV2Ref\.current\) \{\s*void dropFilesV2Ref\.current\(files, pagePoint\);/);
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-external-content"` (или, если F создал
  заглушку, — `does not provide an export named 'pastedFileName'`).

- [ ] **Step 3: `canvas-file-kind.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // AF2.1 B4/B5: форматы Хранилища и виды просмотра. Список расширений — зеркало сервера
  // (apps/api/plane/ppm_vault/services.py: IMAGE_SIGNATURES + REFERENCE_MIME_TYPES); сервер остаётся источником истины.
  export const PPM_VAULT_UPLOAD_EXTENSIONS = [
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "csv",
    "doc",
    "docx",
    "json",
    "key",
    "md",
    "odp",
    "ods",
    "odt",
    "ppt",
    "pptx",
    "txt",
    "xls",
    "xlsx",
  ] as const;

  const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
    "application/json": "json",
    "application/msword": "doc",
    "application/pdf": "pdf",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "text/csv": "csv",
    "text/markdown": "md",
    "text/plain": "txt",
  };

  /** Для выбора файла по ⌘U: MIME и расширения (часть ОС не знает MIME у .md/.csv/.key). */
  export const PPM_VAULT_ACCEPT: readonly string[] = [
    ...Object.entries(MIME_EXTENSIONS)
      .filter(([, extension]) => (PPM_VAULT_UPLOAD_EXTENSIONS as readonly string[]).includes(extension))
      .map(([mime]) => mime),
    ...PPM_VAULT_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`),
  ];

  export function fileExtension(name: string): string {
    return /\.([a-z0-9]{1,8})$/i.exec(name)?.[1]?.toLowerCase() ?? "";
  }

  export function extensionForMime(mime: string): string {
    return MIME_EXTENSIONS[mime.toLowerCase()] ?? "";
  }

  export function isVaultUploadable(name: string): boolean {
    return (PPM_VAULT_UPLOAD_EXTENSIONS as readonly string[]).includes(fileExtension(name));
  }
  ```

- [ ] **Step 4: `canvas-external-content.ts` (новый; заглушку F заменить целиком, сигнатуру сохранить)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { Editor, VecLike } from "tldraw";
  import type { TPpmTranslationKey } from "@ppm/brand";
  import { fillCanvasTemplate } from "./canvas-grammar";
  import { extensionForMime, fileExtension, isVaultUploadable } from "./canvas-file-kind";

  // AF2.1 B4 (R5, вариант A): вставка ⌘V, перетаскивание и ⌘U идут через обработчики внешнего контента tldraw →
  // Хранилище → живая карточка. В снимке доски не остаётся base64. Обработчики регистрируются один раз в onMount,
  // актуальное состояние читается через getDeps (refs). Под v1 — стандартные обработчики tldraw (как в UX1.1).
  export const PPM_PASTE_MAX_FILES = 20;
  const GENERIC_FILE_NAMES = /^(?:tldrawfile|image|blob|file|untitled|pasted[ -]?image|screenshot)(?:\.[a-z0-9]+)?$/i;

  export type TPpmCanvasExternalContentDeps = {
    canEdit: boolean;
    createLinkNote: (url: string, point: VecLike) => void;
    grammarV2: boolean;
    notify: (message: string) => void;
    now: () => Date;
    placeVaultEntry: (entryId: string, point: VecLike, index: number) => Promise<void>;
    t: (key: TPpmTranslationKey) => string;
    uploadToVault: (file: File) => Promise<{ id: string }>;
  };

  /** «image.png» из буфера и «tldrawFile» → «Вставка-2026-09-25-153012.png»; настоящие имена сохраняются. */
  export function pastedFileName(file: { name: string; type: string }, now: Date): string {
    const ownExtension = fileExtension(file.name);
    if (file.name && ownExtension && !GENERIC_FILE_NAMES.test(file.name)) return file.name;
    const extension = ownExtension || extensionForMime(file.type);
    const pad = (value: number) => String(value).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(
      now.getMinutes()
    )}${pad(now.getSeconds())}`;
    return `Вставка-${stamp}${extension ? `.${extension}` : ""}`;
  }

  export function withNameSuffix(name: string, attempt: number): string {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${attempt})${name.slice(dot)}` : `${name} (${attempt})`;
  }

  export function isVaultNameConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "VAULT_NAME_CONFLICT";
  }

  /** Имя занято (409 VAULT_NAME_CONFLICT) → «Имя (2).ext», «Имя (3).ext»… до 5 попыток. */
  export async function uploadWithUniqueName<T>(
    upload: (file: File) => Promise<T>,
    file: File,
    name: string,
    attempts = 5
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const candidate = attempt === 1 ? name : withNameSuffix(name, attempt);
      try {
        return await upload(new File([file], candidate, { lastModified: file.lastModified, type: file.type }));
      } catch (error) {
        lastError = error;
        if (!isVaultNameConflict(error)) throw error;
      }
    }
    throw lastError;
  }

  export function dropHintKey(
    count: number,
    locale: string
  ): "canvas.drop_hint_few" | "canvas.drop_hint_many" | "canvas.drop_hint_one" {
    const category = new Intl.PluralRules(locale.toLowerCase().startsWith("ru") ? "ru" : "en").select(count);
    if (category === "one") return "canvas.drop_hint_one";
    if (category === "few") return "canvas.drop_hint_few";
    return "canvas.drop_hint_many";
  }

  export async function putFilesIntoVault(
    deps: TPpmCanvasExternalContentDeps,
    files: readonly File[],
    point: VecLike
  ): Promise<number> {
    if (!deps.canEdit) {
      deps.notify(deps.t("canvas.file_drop_placeholder"));
      return 0;
    }
    const now = deps.now();
    const named = files.slice(0, PPM_PASTE_MAX_FILES).map((file) => ({ file, name: pastedFileName(file, now) }));
    const rejected = named.filter(({ name }) => !isVaultUploadable(name)).map(({ name }) => name);
    const errors: string[] = [];
    let placed = 0;
    for (const [index, { file, name }] of named.filter(({ name }) => isVaultUploadable(name)).entries()) {
      try {
        const entry = await uploadWithUniqueName(deps.uploadToVault, file, name);
        await deps.placeVaultEntry(entry.id, point, index);
        placed += 1;
      } catch (error) {
        errors.push(error instanceof Error && error.message ? error.message : deps.t("canvas.paste_upload_error"));
      }
    }
    const parts = [
      placed > 0 ? fillCanvasTemplate(deps.t("canvas.paste_saved"), { count: placed }) : null,
      rejected.length > 0 ? fillCanvasTemplate(deps.t("canvas.paste_unsupported"), { names: rejected.join(", ") }) : null,
      ...[...new Set(errors)],
    ].filter((part): part is string => Boolean(part));
    if (parts.length > 0) deps.notify(parts.join(" "));
    return placed;
  }

  export function registerPpmCanvasExternalContent(
    editor: Editor,
    getDeps: () => TPpmCanvasExternalContentDeps
  ): () => void {
    const previous = {
      files: editor.externalContentHandlers.files,
      svg: editor.externalContentHandlers["svg-text"],
      url: editor.externalContentHandlers.url,
    };
    editor.registerExternalContentHandler("files", async (info) => {
      const deps = getDeps();
      if (!deps.grammarV2) return previous.files?.(info);
      await putFilesIntoVault(deps, info.files, info.point ?? editor.getViewportPageBounds().center);
    });
    editor.registerExternalContentHandler("url", async (info) => {
      const deps = getDeps();
      if (!deps.grammarV2) return previous.url?.(info);
      // RB11: без запроса в сеть (стандартный обработчик тянет страницу ради превью закладки).
      if (!deps.canEdit) return;
      deps.createLinkNote(info.url, info.point ?? editor.getViewportPageBounds().center);
    });
    editor.registerExternalContentHandler("svg-text", async (info) => {
      const deps = getDeps();
      if (!deps.grammarV2) return previous.svg?.(info);
      deps.notify(deps.t("canvas.paste_svg_unsupported"));
    });
    return () => {
      editor.registerExternalContentHandler("files", previous.files ?? null);
      editor.registerExternalContentHandler("url", previous.url ?? null);
      editor.registerExternalContentHandler("svg-text", previous.svg ?? null);
    };
  }
  ```
  Проверка по тесту: «Сохранено в Хранилище: 1» — ru-строка `canvas.paste_saved` (Step 8); «Хранилище не принимает» —
  `canvas.paste_unsupported`. Если tsc не принимает `previous.files?.(info)` из-за типа поля
  `externalContentHandlers` (`{ [K in TLExternalContent['type']]: … | null }`), привести один раз:
  `const handlers = editor.externalContentHandlers as Record<string, ((info: unknown) => unknown) | null | undefined>;`.

- [ ] **Step 5: `editor.tsx` — блок B «внешний контент»** (после `uploadDropToWorkItem`, перед `handleFileDrop`):
  Импорты: `import { useTranslation } from "@plane/i18n";`,
  `import { dropHintKey, registerPpmCanvasExternalContent, type TPpmCanvasExternalContentDeps } from "./canvas-external-content";`,
  `import { PPM_VAULT_ACCEPT } from "./canvas-file-kind";`.
  ```ts
  // ── AF2.1 B · вставка, перетаскивание, ⌘U ──
  const { currentLocale } = useTranslation();
  const grammarV2Ref = useRef(grammarV2);
  grammarV2Ref.current = grammarV2;
  const bindingsRef = useRef(bindingsByShapeId);
  bindingsRef.current = bindingsByShapeId;
  const [dropHintCount, setDropHintCount] = useState<number>();
  const dropHintTimerRef = useRef<number>();
  const showDropHint = useCallback((count: number) => {
    setDropHintCount((current) => (current === count ? current : count));
    window.clearTimeout(dropHintTimerRef.current);
    // dragover приходит каждые ~50 мс; тишина 400 мс = курсор ушёл (без onDragLeave у оболочки).
    dropHintTimerRef.current = window.setTimeout(() => setDropHintCount(undefined), 400);
  }, []);
  const showDropHintRef = useRef(showDropHint);
  showDropHintRef.current = showDropHint;
  const createLinkNote = useCallback(
    (url: string, point: { x: number; y: number }) => {
      const activeEditor = editorRef.current;
      if (!activeEditor || !editableRef.current) return;
      let host = url;
      try {
        host = new URL(url).hostname || url;
      } catch {
        host = url;
      }
      const safeUrl = url.replace(/[\s<>]/g, (character) => encodeURIComponent(character));
      const node = createPpmCanvasNode({ authorId, body: `<${safeUrl}>`, kind: "note", title: host.slice(0, 160) });
      const id = createShapeId();
      activeEditor.createShape<TPpmCanvasShape>({
        id,
        type: PPM_CANVAS_SHAPE_TYPE,
        x: point.x - node.visual.width / 2,
        y: point.y - node.visual.height / 2,
        props: { h: node.visual.height, node: serializePpmCanvasNode(node), w: node.visual.width },
      });
      activeEditor.select(id);
    },
    [authorId]
  );
  const externalContentDepsRef = useRef<TPpmCanvasExternalContentDeps>();
  externalContentDepsRef.current = {
    canEdit: effectiveCanEdit,
    createLinkNote,
    grammarV2,
    notify: setContentNotice,
    now: () => new Date(),
    placeVaultEntry: (entryId, point, index) => addUploadedContent("vault_file", entryId, index, point),
    t: ppmT,
    uploadToVault: (file) => vaultService.uploadFile(workspaceId, projectId, file),
  };
  const getExternalContentDeps = useCallback(
    (): TPpmCanvasExternalContentDeps => externalContentDepsRef.current as TPpmCanvasExternalContentDeps,
    []
  );
  // Стабильная функция: tldraw вызывает onMount один раз и выполняет возвращённую очистку при размонтировании.
  const handleTldrawMount = useCallback(
    (mounted: Editor) => {
      setEditor(mounted);
      return registerPpmCanvasExternalContent(mounted, getExternalContentDeps);
    },
    [getExternalContentDeps]
  );
  const dropFilesV2 = useCallback(
    async (files: File[], pagePoint: { x: number; y: number }) => {
      setDropHintCount(undefined);
      const activeEditor = editorRef.current;
      if (!activeEditor) return;
      const target = activeEditor.getShapeAtPoint(pagePoint, { hitInside: true });
      const binding = target ? bindingsRef.current.get(target.id) : undefined;
      if (binding?.entity_type !== "work_item") {
        await activeEditor.putExternalContent({ type: "files", files, point: pagePoint, ignoreParent: false });
        return;
      }
      // RB10: отпустили на живую карточку задачи — вложения этой задачи (прежняя возможность «В задачу»).
      const size = { h: PPM_CANVAS_NODE_REGISTRY.reference.defaultHeight, w: PPM_CANVAS_NODE_REGISTRY.reference.defaultWidth };
      const spot = spotBeside(target as TPpmCanvasShape, size);
      const center = spot ? { x: spot.x + size.w / 2, y: spot.y + size.h / 2 } : pagePoint;
      try {
        for (const [index, file] of files.entries()) {
          const uploaded = await fileService.uploadProjectAsset(
            workspaceSlug,
            projectId,
            { entity_identifier: binding.entity_id, entity_type: EFileAssetType.ISSUE_ATTACHMENT },
            file
          );
          await addUploadedContent("attachment", uploaded.asset_id, index, center);
        }
        setContentNotice(
          fillCanvasTemplate(ppmT("canvas.drop_attached"), {
            count: files.length,
            name: binding.source.identity.identifier ?? binding.source.display.title,
          })
        );
      } catch (error) {
        setContentNotice(error instanceof Error && error.message ? error.message : ppmT("canvas.source_action_error"));
      }
    },
    [addUploadedContent, fileService, ppmT, projectId, spotBeside, workspaceSlug]
  );
  const dropFilesV2Ref = useRef(dropFilesV2);
  dropFilesV2Ref.current = dropFilesV2;
  // ── /AF2.1 B ──
  ```
  Примечание: `addUploadedContent` трактует точку как центр карточки (`editor.tsx:1902` → `createContentProjectionShape`
  вычитает половину размера) — поэтому передаём центр.

- [ ] **Step 6: `handleFileDrop` (`:1957-1973`) — ветка v2**
  Было:
  ```ts
    if (event.type !== "drop") return;
    if (!editableRef.current || !editorRef.current) {
      setFileDropNotice(true);
      return;
    }
    const files = [...event.dataTransfer.files].slice(0, 20);
    if (files.length === 0) return;
    setFileDropError(undefined);
    setPlaneDropPickerOpen(false);
    setPendingFileDrop({
      files,
      pagePoint: editorRef.current.screenToPage({ x: event.clientX, y: event.clientY }),
    });
  }, []);
  ```
  Стало:
  ```ts
    // AF2.1 B4 (RB10): под v2 — подсказка K4 во время перетаскивания и сразу Хранилище; v1 — диалог как раньше.
    if (event.type !== "drop") {
      if (grammarV2Ref.current && editableRef.current) showDropHintRef.current(event.dataTransfer.items.length);
      return;
    }
    if (!editableRef.current || !editorRef.current) {
      setFileDropNotice(true);
      return;
    }
    const files = [...event.dataTransfer.files].slice(0, 20);
    if (files.length === 0) return;
    const pagePoint = editorRef.current.screenToPage({ x: event.clientX, y: event.clientY });
    if (grammarV2Ref.current) {
      void dropFilesV2Ref.current(files, pagePoint);
      return;
    }
    setFileDropError(undefined);
    setPlaneDropPickerOpen(false);
    setPendingFileDrop({ files, pagePoint });
  }, []);
  ```

- [ ] **Step 7: `<Tldraw>` (`:2221-2226`) и подсказка в разметке**
  Было (после F, если F не поставил свой вызов):
  ```tsx
                <Tldraw
                  cameraOptions={{ wheelBehavior: "pan" }}
                  components={components}
                  shapeUtils={[PpmCanvasNodeShapeUtil]}
                  onMount={setEditor}
                >
  ```
  Стало (атрибуты `shapeUtils` и прочие — как их оставили F/R; меняются только две строки):
  ```tsx
                <Tldraw
                  acceptedImageMimeTypes={grammarV2 ? PPM_VAULT_ACCEPT : undefined}
                  cameraOptions={{ wheelBehavior: "pan" }}
                  components={components}
                  shapeUtils={[PpmCanvasNodeShapeUtil]}
                  onMount={handleTldrawMount}
                >
  ```
  Если F уже вызывает `registerPpmCanvasExternalContent(...)` внутри своего `onMount`, заменить его аргумент на
  `getExternalContentDeps`, чтобы в файле был ровно один вызов `registerPpmCanvasExternalContent(mounted, getExternalContentDeps)`.
  `acceptedImageMimeTypes` влияет только на фильтр выбора файла ⌘U (стандартные обработчики под v2 перекрыты).
  Подсказка — в блоке B разметки рядом с уведомлением содержимого:
  ```tsx
      {grammarV2 && dropHintCount !== undefined && (
        <div className="ppm-canvas-drop-hint" role="status">
          <Download aria-hidden="true" />
          <span>{fillCanvasTemplate(ppmT(dropHintKey(dropHintCount, currentLocale)), { count: dropHintCount })}</span>
        </div>
      )}
  ```
  (`Download` уже импортирован из lucide-react, `editor.tsx:23`.)

- [ ] **Step 8: Стили и строки**
  `canvas-content.css`:
  ```css
  /* AF2.1 B4 · Подсказка перетаскивания (K4): внизу по центру холста, не перехватывает указатель. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-drop-hint {
    position: absolute;
    z-index: 330;
    bottom: 6rem;
    left: 50%;
    display: flex;
    max-width: min(34rem, calc(100% - 2rem));
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border: 1px solid var(--ppm-color-accent, var(--txt-accent-primary));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.8125rem;
    pointer-events: none;
    transform: translateX(-50%);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-drop-hint svg {
    width: 1.25rem;
    height: 1.25rem;
    flex: none;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }
  ```
  Блок «B» `af21-canvas.ts`:
  ```ts
      // en
      "canvas.paste_saved": "Saved to Knowledge: {count}.",
      "canvas.paste_unsupported": "Knowledge does not accept: {names}. Use PDF, PNG, JPEG, WebP, office or text files.",
      "canvas.paste_upload_error": "Could not upload the file to Knowledge.",
      "canvas.paste_svg_unsupported": "SVG is not supported yet — save the image as PNG and paste it again.",
      "canvas.drop_hint_one": "Drop to add {count} file — it will be saved to Knowledge",
      "canvas.drop_hint_few": "Drop to add {count} files — they will be saved to Knowledge",
      "canvas.drop_hint_many": "Drop to add {count} files — they will be saved to Knowledge",
      "canvas.drop_attached": "Attached to {name}: {count}",
  ```
  ```ts
      // ru
      "canvas.paste_saved": "Сохранено в Хранилище: {count}.",
      "canvas.paste_unsupported": "Хранилище не принимает: {names}. Подойдут PDF, PNG, JPEG, WebP, офисные и текстовые файлы.",
      "canvas.paste_upload_error": "Не удалось загрузить файл в Хранилище.",
      "canvas.paste_svg_unsupported": "SVG пока не поддерживается — сохраните картинку как PNG и вставьте снова.",
      "canvas.drop_hint_one": "Отпустите, чтобы добавить {count} файл — он сохранится в Хранилище",
      "canvas.drop_hint_few": "Отпустите, чтобы добавить {count} файла — они сохранятся в Хранилище",
      "canvas.drop_hint_many": "Отпустите, чтобы добавить {count} файлов — они сохранятся в Хранилище",
      "canvas.drop_attached": "Прикреплено к {name}: {count}",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 9: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/files-external-content.test.ts`
  → `8 passed`; формат/линт/tsc (B1 Step 11) для `canvas-external-content.ts`, `canvas-file-kind.ts`, `editor.tsx`,
  теста, `af21-canvas.ts`. Регрессия v1: `vitest run tests/ppm-canvas` целиком — зелёный.

**Acceptance (B4):**
- [ ] Критерий 4: скриншот из буфера (⌘V) на доске «Тест Холста» → файл «Вставка-2026-…-HHMMSS.png» в Хранилище и живая
  карточка в точке вставки; вторая вставка в ту же секунду → «… (2).png»; снимок доски (`GET …/boards/<id>/`) без `data:`.
- [ ] Перетаскивание 3 файлов показывает подсказку K4 «Отпустите, чтобы добавить 3 файла — они сохранятся в Хранилище»;
  на карточку задачи — вложения задачи; ⌘U открывает выбор с PDF/офисом/текстом.
- [ ] GIF/SVG/видео — уведомление по-русски без загрузки; вставка URL — заметка-ссылка, в «Сети» нет запроса к URL.
- [ ] Читатель: вставка не загружает, объясняет «Загружать файлы на холст могут только редакторы проекта.»; v1 — прежний
  диалог «В Хранилище / В задачу» и стандартная вставка tldraw.

---

### Task 12 (B5): Файловые карточки — «Просмотр» на весь экран и «Скачать»; «Доска задач» снова канбан

**Files:**
- Create: `apps/web/core/components/ppm-canvas/file-preview.tsx`
- Modify: `canvas-file-kind.ts` (виды просмотра, CSV, URL PDF), `apps/web/core/services/ppm-vault.service.ts`
  (`getPreview`, `getFileText`, `getFileBlob`, `downloadUrl`, тип `TPpmVaultPreview`), `canvas-content-actions.ts`
  (`previewFile`, `downloadFile`)
- Modify: `shape.tsx` — `MediaProjectionCard` `:2586-2742` (кнопки, PDF), `ContentProjectionCard` `:2474-2584` (кнопки),
  `WorkItemsViewNode` `:1559-2052` (канбан под v2)
- Modify: `editor.tsx` — блок B (состояние просмотра, скачивание, диалог), `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/files-preview.test.ts` (новый)

**Interfaces:**
- Consumes: S — `GET /api/ppm/v1/workspaces/<ws>/projects/<pid>/vault/entries/<id>/preview/` →
  `{ kind: "docx" | "xlsx" | "pptx" | "text" | "unsupported", html?, sheets?: [{ name, rows }], slides?: [{ index, title,
  text }], text?, truncated }` (CONTRACTS §5 + поле `text` для `kind: "text"` — нужда в `plan-B-needs.md`); при 404 —
  запасные пути RB8. Опционально S: `GET …/file/?download=1` → `attachment; filename*=UTF-8''<имя>` (RB9, без него
  файл скачивается с именем-идентификатором). Существующие: `vaultService.pdfUrl/fileUrl/getMarkdown`
  (`ppm-vault.service.ts:137,330-336`), `renderCanvasMarkdown`, `sanitizeCanvasHtml`, `highlightCodeLines`,
  `languageForFileName`, `PPM_CANVAS_NODE_REGISTRY.work_items_view` (1100×680), `projectionContext.onOpenTasks`.
- Produces: `canvas-file-kind.ts` — `filePreviewKind`, `parseCsvPreview`, `vaultPdfUrlFromPreview`,
  `PPM_TEXT_PREVIEW_MAX_BYTES`, тип `TFilePreviewKind`; `PpmVaultService.getPreview/getFileText/getFileBlob/downloadUrl`;
  `file-preview.tsx` — `PpmFilePreviewDialog`, `saveCanvasBlob`; поля контекста `previewFile`, `downloadFile`; классы
  `.ppm-file-preview*`, `.ppm-live-card__action`; ключи `canvas.file_preview`, `canvas.file_download`,
  `canvas.file_preview_loading`, `canvas.file_preview_error`, `canvas.file_preview_unsupported`,
  `canvas.file_preview_truncated`, `canvas.file_download_error`, `canvas.file_open_in_vault`, `canvas.file_slide`,
  `canvas.work_items_view_expand`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/file-preview.tsx apps/web/core/services/ppm-vault.service.ts \
    apps/web/tests/ppm-canvas/files-preview.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/files-preview.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { filePreviewKind, parseCsvPreview, vaultPdfUrlFromPreview } from "@/components/ppm-canvas/canvas-file-kind";

  const read = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");
  const shapeSource = read("components/ppm-canvas/shape.tsx");
  const previewSource = read("components/ppm-canvas/file-preview.tsx");
  const vaultServiceSource = read("services/ppm-vault.service.ts");

  describe("file cards: preview and download (AF2.1 B5)", () => {
    it("chooses the preview by extension and MIME type", () => {
      expect(filePreviewKind(".png", "image/png")).toBe("image");
      expect(filePreviewKind(".pdf", "application/pdf")).toBe("pdf");
      expect(filePreviewKind(".md", "text/markdown")).toBe("markdown");
      expect(filePreviewKind(".csv", "text/csv")).toBe("csv");
      expect(filePreviewKind(".json", "application/json")).toBe("json");
      expect(filePreviewKind(".py", "text/x-python")).toBe("code");
      expect(filePreviewKind(".txt", "text/plain")).toBe("text");
      expect(["docx", "xlsx", "pptx"].map((extension) => filePreviewKind(`.${extension}`, "application/octet-stream"))).toEqual([
        "office",
        "office",
        "office",
      ]);
      expect(filePreviewKind(".key", "application/octet-stream")).toBe("download");
      expect(filePreviewKind(".svg", "image/svg+xml")).toBe("code");
    });

    it("parses CSV with quotes, detects the delimiter and caps the size", () => {
      expect(parseCsvPreview('a,b\n"1,5",2\n')).toEqual({ rows: [["a", "b"], ["1,5", "2"]], truncated: false });
      expect(parseCsvPreview("a;b\r\n1;2")).toEqual({ rows: [["a", "b"], ["1", "2"]], truncated: false });
      expect(parseCsvPreview('"say ""hi""",x')).toEqual({ rows: [['say "hi"', "x"]], truncated: false });
      const big = parseCsvPreview("x\n".repeat(300));
      expect(big.rows).toHaveLength(200);
      expect(big.truncated).toBe(true);
      expect(parseCsvPreview(Array.from({ length: 60 }, (_, index) => `c${index}`).join(",")).rows[0]).toHaveLength(50);
    });

    it("previews Vault PDFs through /pdf/ without a sandbox, attachments stay sandboxed", () => {
      expect(vaultPdfUrlFromPreview("http://localhost:8000/api/ppm/v1/workspaces/w/projects/p/vault/entries/e/file/")).toBe(
        "http://localhost:8000/api/ppm/v1/workspaces/w/projects/p/vault/entries/e/pdf/"
      );
      expect(shapeSource).toContain('sandbox={vaultPdf ? undefined : ""}');
      expect(previewSource).toContain("createPortal(");
      expect(previewSource).toContain("sanitizeCanvasHtml(preview.html)");
      expect(previewSource).toMatch(/sandbox=\{isVault \? undefined : ""\}/);
      expect(vaultServiceSource).toContain("entries/${entryId}/preview/");
    });

    it("restores the working task board under v2 without silent writes", () => {
      expect(shapeSource).not.toContain("ppm-work-items-view--compact");
      expect(shapeSource).not.toMatch(/props: \{ w: 360, h: 160 \}/);
      expect(shapeSource).toContain("data-ppm-drag-handle");
      expect(shapeSource).toMatch(/grammarV2 && \(\s*<button[^>]*className="ppm-work-items-view__backlog"/);
    });

    it("names preview and download in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.file_preview")).toBe("Просмотр");
      expect(getPpmTranslation("ru", "canvas.file_download")).toBe("Скачать");
      expect(getPpmTranslation("en", "canvas.file_download")).toBe("Download");
    });
  });
  ```
  Запуск → FAIL: `does not provide an export named 'filePreviewKind'`.

- [ ] **Step 3: `canvas-file-kind.ts` — дописать**
  ```ts
  // ── B5: просмотр файлов ──
  import { languageForFileName } from "./canvas-code";
  ```
  (импорт поднять в начало файла) и в конец:
  ```ts
  export type TFilePreviewKind = "code" | "csv" | "download" | "image" | "json" | "markdown" | "office" | "pdf" | "text";

  /** Предел текста для просмотра (≤ 1 МиБ): больше — обрезаем с пометкой. */
  export const PPM_TEXT_PREVIEW_MAX_BYTES = 1_048_576;
  const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  const OFFICE_EXTENSIONS = new Set(["docx", "xlsx", "pptx"]);

  export function filePreviewKind(extension: string | null | undefined, mime: string): TFilePreviewKind {
    const normalized = (extension ?? "").replace(/^\./, "").toLowerCase() || extensionForMime(mime);
    if (IMAGE_EXTENSIONS.has(normalized) && mime.startsWith("image/")) return "image";
    if (normalized === "pdf" || mime === "application/pdf") return "pdf";
    if (normalized === "md" || mime === "text/markdown") return "markdown";
    if (normalized === "csv" || mime === "text/csv") return "csv";
    if (normalized === "json" || mime === "application/json") return "json";
    if (OFFICE_EXTENSIONS.has(normalized)) return "office";
    if (normalized && languageForFileName(`file.${normalized}`) !== "plaintext") return "code";
    if (normalized === "txt" || normalized === "log" || mime.startsWith("text/")) return "text";
    return "download";
  }

  /** CSV/TSV для просмотра: кавычки, «""», разделитель «,», «;» или Tab по первой строке; ≤ maxRows × maxColumns. */
  export function parseCsvPreview(
    text: string,
    maxRows = 200,
    maxColumns = 50
  ): { rows: string[][]; truncated: boolean } {
    const newline = text.indexOf("\n");
    const firstLine = newline >= 0 ? text.slice(0, newline) : text;
    const delimiter = [";", "\t"].reduce(
      (best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best),
      ","
    );
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    let truncated = false;
    const pushRow = () => {
      if (row.length > maxColumns) truncated = true;
      rows.push(row.slice(0, maxColumns));
      row = [];
    };
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (character === '"') quoted = false;
        else cell += character;
        continue;
      }
      if (character === '"' && cell === "") {
        quoted = true;
        continue;
      }
      if (character === delimiter) {
        row.push(cell);
        cell = "";
        continue;
      }
      if (character === "\n" || character === "\r") {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        row.push(cell);
        cell = "";
        pushRow();
        if (rows.length >= maxRows) {
          truncated = truncated || index < text.length - 1;
          return { rows, truncated };
        }
        continue;
      }
      cell += character;
    }
    if (cell !== "" || row.length > 0) {
      row.push(cell);
      pushRow();
    }
    return { rows, truncated };
  }

  /** preview_url Хранилища (…/entries/<id>/file/) → …/entries/<id>/pdf/ (RB7). */
  export function vaultPdfUrlFromPreview(previewUrl: string): string {
    return previewUrl.replace(/\/file\/(?=$|[?#])/, "/pdf/");
  }
  ```
  Проверка теста CSV: `'a,b\n"1,5",2\n'` → строки `["a","b"]`, `["1,5","2"]`, хвост пуст; 300 строк `x\n` → на 200-й
  `\n` индекс 399 < 599 → `truncated: true`.

- [ ] **Step 4: `ppm-vault.service.ts` — превью, текст, blob, ссылка скачивания**
  Тип — после `TPpmVaultTransfer` (`:77-86`):
  ```ts
  // AF2.1 B5: превью файла, построенное сервером (S): Office → html/листы/слайды, текст → text. HTML уже санитизирован
  // сервером; клиент всё равно пропускает его через DOMPurify.
  export type TPpmVaultPreview = {
    html?: string;
    kind: "docx" | "pptx" | "text" | "unsupported" | "xlsx";
    sheets?: Array<{ name: string; rows: string[][] }>;
    slides?: Array<{ index: number; text: string; title: string }>;
    text?: string;
    truncated: boolean;
  };
  ```
  Методы — перед `pdfUrl(` (`:330`):
  ```ts
  async getPreview(workspaceId: string, projectId: string, entryId: string): Promise<TPpmVaultPreview> {
    try {
      const response = await this.get(`${this.vaultPath(workspaceId, projectId)}entries/${entryId}/preview/`);
      return response.data as TPpmVaultPreview;
    } catch (error) {
      throw normalizeVaultError(error);
    }
  }

  async getFileText(workspaceId: string, projectId: string, entryId: string): Promise<string> {
    try {
      const response = await this.get(`${this.entryPath(workspaceId, projectId, entryId)}file/`, {}, {
        responseType: "text",
        transformResponse: [(data: unknown) => data],
      });
      return String(response.data ?? "");
    } catch (error) {
      throw normalizeVaultError(error);
    }
  }

  async getFileBlob(workspaceId: string, projectId: string, entryId: string): Promise<Blob> {
    try {
      const response = await this.get(`${this.entryPath(workspaceId, projectId, entryId)}file/`, {}, { responseType: "blob" });
      return response.data as Blob;
    } catch (error) {
      throw normalizeVaultError(error);
    }
  }

  downloadUrl(workspaceId: string, projectId: string, entryId: string) {
    return `${this.fileUrl(workspaceId, projectId, entryId)}?download=1`;
  }
  ```
  (`this.get(url, params, config)` сливает оба объекта в конфиг axios — `api.service.ts:38-43`. Путь превью записан через
  `vaultPath` + `entries/${entryId}/preview/`, чтобы тест нашёл строку.)

- [ ] **Step 5: `canvas-content-actions.ts` — поля просмотра**
  Импорт `import type { TPpmCanvasContentBinding } from "@ppm/canvas";`; в тип:
  ```ts
    /** «Скачать»: blob через API и имя из карточки; при ошибке — ссылка ?download=1 в новой вкладке (RB9). */
    downloadFile: (binding: TPpmCanvasContentBinding) => Promise<void>;
    /** «Просмотр»: полноэкранный диалог (портал в body). */
    previewFile: (binding: TPpmCanvasContentBinding) => void;
  ```
  в значение по умолчанию: `downloadFile: async () => undefined, previewFile: () => undefined,`.

- [ ] **Step 6: `file-preview.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
  import { createPortal } from "react-dom";
  import { ArrowUpRight, Download, FileText, LoaderCircle, X } from "lucide-react";
  import type { TPpmCanvasContentBinding } from "@ppm/canvas";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import type { PpmVaultService, TPpmVaultPreview } from "@/services/ppm-vault.service";
  import { highlightCodeLines, languageForFileName } from "./canvas-code";
  import { filePreviewKind, parseCsvPreview, PPM_TEXT_PREVIEW_MAX_BYTES, vaultPdfUrlFromPreview } from "./canvas-file-kind";
  import { renderCanvasMarkdown, sanitizeCanvasHtml } from "./canvas-markdown";

  type TPreviewState =
    | { status: "loading" }
    | { status: "error" }
    | { status: "unsupported" }
    | { status: "ready"; preview: TPpmVaultPreview }
    | { status: "text"; text: string; truncated: boolean };

  export function saveCanvasBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function loadText(
    binding: TPpmCanvasContentBinding,
    vaultService: PpmVaultService
  ): Promise<{ text: string; truncated: boolean }> {
    const { identity } = binding.source;
    try {
      const preview = await vaultService.getPreview(identity.workspace_id, identity.project_id, binding.entity_id);
      if (preview.kind === "text" && typeof preview.text === "string") return { text: preview.text, truncated: preview.truncated };
    } catch {
      // RB8: превью S недоступно — читаем сам файл (локальное хранилище); ошибка ниже уйдёт в «Скачать».
    }
    const text = await vaultService.getFileText(identity.workspace_id, identity.project_id, binding.entity_id);
    return { text: text.slice(0, PPM_TEXT_PREVIEW_MAX_BYTES), truncated: text.length > PPM_TEXT_PREVIEW_MAX_BYTES };
  }

  // AF2.1 B5 (K4): полноэкранный просмотр файла. Картинка и PDF — по ссылкам Хранилища; текст/CSV/JSON/код —
  // текстом с подсветкой; Markdown — как заметка; Office — превью, построенное сервером (S). Всё HTML — через DOMPurify.
  export function PpmFilePreviewDialog({
    binding,
    onClose,
    onDownload,
    vaultService,
  }: {
    binding: TPpmCanvasContentBinding;
    onClose: () => void;
    onDownload: (binding: TPpmCanvasContentBinding) => Promise<void>;
    vaultService: PpmVaultService;
  }) {
    const ppmT = usePpmTranslation();
    const { display, identity } = binding.source;
    const isVault = binding.entity_type === "vault_file";
    const kind = filePreviewKind(display.extension, display.mime_type);
    const [state, setState] = useState<TPreviewState>({ status: "loading" });
    const [sheetIndex, setSheetIndex] = useState(0);
    const closeRef = useRef<HTMLButtonElement>(null);
    const fileUrl = isVault
      ? vaultService.fileUrl(identity.workspace_id, identity.project_id, binding.entity_id)
      : (display.preview_url ?? "");
    const pdfUrl = isVault && display.preview_url ? vaultPdfUrlFromPreview(display.preview_url) : fileUrl;

    useEffect(() => {
      closeRef.current?.focus();
      let active = true;
      const settle = (next: TPreviewState) => {
        if (active) setState(next);
      };
      if (kind === "image" || kind === "pdf") settle(fileUrl ? { status: "ready", preview: { kind: "unsupported", truncated: false } } : { status: "error" });
      else if (!isVault) settle({ status: "unsupported" });
      else if (kind === "markdown")
        void vaultService
          .getMarkdown(identity.workspace_id, identity.project_id, binding.entity_id)
          .then((markdown) => settle({ status: "text", text: markdown.content, truncated: false }), () => settle({ status: "error" }));
      else if (kind === "office")
        void vaultService
          .getPreview(identity.workspace_id, identity.project_id, binding.entity_id)
          .then(
            (preview) => settle(preview.kind === "unsupported" ? { status: "unsupported" } : { status: "ready", preview }),
            () => settle({ status: "unsupported" })
          );
      else if (kind === "download") settle({ status: "unsupported" });
      else
        void loadText(binding, vaultService).then(
          (result) => settle({ status: "text", ...result }),
          () => settle({ status: "unsupported" })
        );
      return () => {
        active = false;
      };
    }, [binding, fileUrl, identity.project_id, identity.workspace_id, isVault, kind, vaultService]);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.code === "Escape") onClose();
    };

    const body = useMemo(() => {
      if (state.status === "loading")
        return (
          <p className="ppm-file-preview__message">
            <LoaderCircle aria-hidden="true" /> {ppmT("canvas.file_preview_loading")}
          </p>
        );
      if (state.status === "error" || state.status === "unsupported")
        return (
          <div className="ppm-file-preview__message">
            <FileText aria-hidden="true" />
            <p>{ppmT(state.status === "error" ? "canvas.file_preview_error" : "canvas.file_preview_unsupported")}</p>
            <button type="button" onClick={() => void onDownload(binding)}>
              <Download aria-hidden="true" /> {ppmT("canvas.file_download")}
            </button>
          </div>
        );
      if (kind === "image") return <img alt={display.title} referrerPolicy="no-referrer" src={fileUrl} />;
      if (kind === "pdf")
        return (
          // RB7: PDF Хранилища — /pdf/ без песочницы (application/pdf + nosniff от сервера); вложения — в песочнице.
          <iframe referrerPolicy="no-referrer" sandbox={isVault ? undefined : ""} src={pdfUrl} title={display.title} />
        );
      if (state.status === "text") {
        const notice = state.truncated ? <small>{ppmT("canvas.file_preview_truncated")}</small> : null;
        if (kind === "markdown")
          return (
            <>
              <div
                className="ppm-file-preview__markdown"
                // oxlint-disable-next-line react/no-danger -- HTML прошёл sanitizeCanvasHtml (DOMPurify)
                dangerouslySetInnerHTML={{ __html: sanitizeCanvasHtml(renderCanvasMarkdown(state.text)) }}
              />
              {notice}
            </>
          );
        if (kind === "csv") {
          const table = parseCsvPreview(state.text);
          return (
            <>
              <PreviewTable rows={table.rows} />
              {(table.truncated || state.truncated) && <small>{ppmT("canvas.file_preview_truncated")}</small>}
            </>
          );
        }
        let text = state.text;
        if (kind === "json") {
          try {
            text = JSON.stringify(JSON.parse(state.text), null, 2);
          } catch {
            text = state.text;
          }
        }
        const language = kind === "json" ? "json" : kind === "code" ? languageForFileName(display.title) : "plaintext";
        return (
          <>
            <PreviewCode language={language} text={text} />
            {notice}
          </>
        );
      }
      const { preview } = state;
      if (preview.kind === "docx" && preview.html)
        return (
          <div
            className="ppm-file-preview__document"
            // oxlint-disable-next-line react/no-danger -- HTML сервера (nh3) повторно прошёл sanitizeCanvasHtml (DOMPurify)
            dangerouslySetInnerHTML={{ __html: sanitizeCanvasHtml(preview.html) }}
          />
        );
      if (preview.kind === "xlsx" && preview.sheets?.length) {
        const sheet = preview.sheets[Math.min(sheetIndex, preview.sheets.length - 1)];
        return (
          <>
            <div className="ppm-file-preview__tabs" role="tablist">
              {preview.sheets.map((item, index) => (
                <button
                  aria-selected={index === sheetIndex}
                  key={`${item.name}-${index}`}
                  role="tab"
                  type="button"
                  onClick={() => setSheetIndex(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <PreviewTable rows={sheet.rows} />
            {preview.truncated && <small>{ppmT("canvas.file_preview_truncated")}</small>}
          </>
        );
      }
      if (preview.kind === "pptx" && preview.slides?.length)
        return (
          <ol className="ppm-file-preview__slides">
            {preview.slides.map((slide) => (
              <li key={slide.index}>
                <strong>
                  {ppmT("canvas.file_slide")} {slide.index} · {slide.title}
                </strong>
                <p>{slide.text}</p>
              </li>
            ))}
          </ol>
        );
      return <p className="ppm-file-preview__message">{ppmT("canvas.file_preview_unsupported")}</p>;
    }, [binding, display.title, fileUrl, isVault, kind, onDownload, pdfUrl, ppmT, sheetIndex, state]);

    return createPortal(
      <div className="ppm-canvas-content-backdrop" role="presentation" onPointerDown={onClose}>
        <div
          aria-label={display.title}
          aria-modal="true"
          className="ppm-file-preview"
          data-kind={kind}
          role="dialog"
          onKeyDown={onKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header className="ppm-file-preview__header">
            <strong>{display.title}</strong>
            <span>{display.extension?.replace(/^\./, "").toUpperCase()}</span>
            <button type="button" onClick={() => void onDownload(binding)}>
              <Download aria-hidden="true" /> {ppmT("canvas.file_download")}
            </button>
            {identity.source_url && (
              <a href={identity.source_url} rel="noopener noreferrer" target="_blank">
                {ppmT("canvas.file_open_in_vault")} <ArrowUpRight aria-hidden="true" />
              </a>
            )}
            <button ref={closeRef} type="button" aria-label={ppmT("canvas.close")} onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="ppm-file-preview__body">{body}</div>
        </div>
      </div>,
      window.document.body
    );
  }

  function PreviewTable({ rows }: { rows: string[][] }) {
    return (
      <div className="ppm-file-preview__table">
        <table>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) =>
                  rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function PreviewCode({ language, text }: { language: string; text: string }) {
    const lines = useMemo(() => highlightCodeLines(text, language), [language, text]);
    return (
      <pre className="ppm-file-preview__code">
        <code>
          {lines.map((line, lineIndex) => (
            <span className="ppm-file-preview__line" key={lineIndex}>
              <span aria-hidden="true" className="ppm-file-preview__number">
                {lineIndex + 1}
              </span>
              {line.map((segment, segmentIndex) => (
                <span className={segment.className || undefined} key={segmentIndex}>
                  {segment.text}
                </span>
              ))}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    );
  }
  ```
  Картинки и PDF вложений задач (`attachment`) идут по `display.preview_url` (Plane-ассет), остальное у вложений — «Скачать».

- [ ] **Step 7: `shape.tsx` — кнопки на карточках, PDF, канбан**
  Импорты: `Eye` в список lucide (`:19-41`); `import { vaultPdfUrlFromPreview } from "./canvas-file-kind";`
  (`PpmCanvasContentActionsContext` импортирован в B3).
  **`MediaProjectionCard`** — после `const grammarV2 = usePpmCanvasGrammarV2();` (`:2603`):
  ```tsx
    const contentActions = useContext(PpmCanvasContentActionsContext);
  ```
  после `const liveSource = …` (`:2621`):
  ```tsx
    const vaultPdf = grammarV2 && binding.entity_type === "vault_file" && node.kind === "pdf" && Boolean(previewUrl);
  ```
  PDF-фрейм (`:2665-2673`). Было:
  ```tsx
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox=""
              src={previewUrl}
              title={display.title}
              onError={() => setPreviewError(true)}
            />
  ```
  Стало:
  ```tsx
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer"
              // RB7: PDF Хранилища под v2 — /pdf/ без песочницы (просмотрщик в песочнице не работает); вложения — как раньше.
              sandbox={vaultPdf ? undefined : ""}
              src={vaultPdf ? `${vaultPdfUrlFromPreview(previewUrl)}#toolbar=0&view=FitH` : previewUrl}
              title={display.title}
              onError={() => setPreviewError(true)}
            />
  ```
  В `<footer>` (`:2681`) первой строкой:
  ```tsx
          {grammarV2 && !unavailable && (
            <>
              <button
                type="button"
                className="ppm-live-card__action"
                onClick={() => contentActions.previewFile(binding)}
                onPointerDown={stopEventPropagation}
              >
                <Eye aria-hidden="true" />
                {ppmT("canvas.file_preview")}
              </button>
              <button
                type="button"
                className="ppm-live-card__action"
                onClick={() => void contentActions.downloadFile(binding)}
                onPointerDown={stopEventPropagation}
              >
                <Download aria-hidden="true" />
                {ppmT("canvas.file_download")}
              </button>
            </>
          )}
  ```
  **`ContentProjectionCard`** — в `<footer>` (`:2545`) первой строкой тот же фрагмент с условием
  `grammarV2 && binding.entity_type !== "page" && display.source_status !== "deleted"` (переменная `contentActions`
  уже объявлена в B3).
  **`WorkItemsViewNode`**: `:1570` было `const compact = usePpmCanvasGrammarV2();` → стало
  `const grammarV2 = usePpmCanvasGrammarV2();`. Удалить эффект `:1583-1590` целиком (тихая запись новой версии доски —
  регрессия 7 второго агента). Удалить блок `if (compact) { … }` `:1702-1715`. Корень (`:1717-1722`) было:
  ```tsx
      <div
        className="ppm-work-items-view"
        data-layout={node.layout}
        onPointerDown={stopEventPropagation}
        onWheelCapture={stopEventPropagation}
      >
  ```
  стало:
  ```tsx
      <div
        className="ppm-work-items-view"
        data-layout={node.layout}
        onPointerDown={(event) => {
          // RB14: под v2 подпись «Доска задач» — ручка: выделить и перетащить карточку; остальное — клики канбана.
          if (grammarV2 && (event.target as HTMLElement).closest("[data-ppm-drag-handle]")) return;
          stopEventPropagation(event);
        }}
        onWheelCapture={stopEventPropagation}
      >
  ```
  В `.ppm-work-items-view__identity` (`:1725-1726`) было `<span>{ppmT("canvas.work_items_view")}</span>` → стало
  `<span data-ppm-drag-handle={grammarV2 || undefined}>{ppmT("canvas.work_items_view")}</span>`. Первой строкой
  `.ppm-work-items-view__actions` (`:1742`):
  ```tsx
          {grammarV2 && (
            <button
              type="button"
              className="ppm-work-items-view__backlog"
              onClick={projectionContext.onOpenTasks}
              onPointerDown={stopEventPropagation}
            >
              {ppmT("canvas.open_backlog")}
            </button>
          )}
          {grammarV2 && !readonly && shape.props.w <= 420 && shape.props.h <= 220 && (
            // Доски, которые прежний эффект уже ужал до 360×160, разворачиваются только по действию пользователя.
            <button
              type="button"
              className="ppm-work-items-view__backlog"
              onClick={() => {
                const { defaultHeight: h, defaultWidth: w } = PPM_CANVAS_NODE_REGISTRY.work_items_view;
                editor.updateShape<TPpmCanvasShape>({
                  id: shape.id,
                  type: shape.type,
                  props: { h, w, node: serializePpmCanvasNode(updatePpmCanvasNode(node, { visual: { ...node.visual, height: h, width: w } })) },
                });
              }}
              onPointerDown={stopEventPropagation}
            >
              {ppmT("canvas.work_items_view_expand")}
            </button>
          )}
  ```
  `PPM_CANVAS_NODE_REGISTRY` добавить в импорт из `@ppm/canvas` (`:59-86`). Переменную `compact` больше нигде не
  использовать (`grep -n "compact" shape.tsx` → только классы `--compact` отсутствуют).

- [ ] **Step 8: `editor.tsx` — блок B «просмотр и скачивание»** (после блока B4):
  Импорт: `import { PpmFilePreviewDialog, saveCanvasBlob } from "./file-preview";`.
  ```ts
  // ── AF2.1 B · просмотр и скачивание файлов ──
  const [previewBinding, setPreviewBinding] = useState<TPpmCanvasContentBinding>();
  const downloadFile = useCallback(
    async (binding: TPpmCanvasContentBinding) => {
      const { display, identity } = binding.source;
      const fileName = display.title || `file${display.extension ?? ""}`;
      if (binding.entity_type !== "vault_file") {
        const url = display.preview_url ?? identity.source_url;
        if (url) window.open(url, "_blank", "noopener");
        else setContentNotice(ppmT("canvas.file_download_error"));
        return;
      }
      try {
        const isMarkdown = display.mime_type === "text/markdown" || display.extension === ".md";
        const blob = isMarkdown
          ? new Blob(
              [(await vaultService.getMarkdown(identity.workspace_id, identity.project_id, binding.entity_id)).content],
              { type: "text/markdown;charset=utf-8" }
            )
          : await vaultService.getFileBlob(identity.workspace_id, identity.project_id, binding.entity_id);
        saveCanvasBlob(blob, fileName);
      } catch {
        // RB9: при S3 blob упирается в CORS подписанной ссылки — отдаём браузеру ссылку скачивания.
        window.open(vaultService.downloadUrl(identity.workspace_id, identity.project_id, binding.entity_id), "_blank", "noopener");
      }
    },
    [ppmT, vaultService]
  );
  // ── /AF2.1 B ──
  ```
  В `contentActions` добавить `downloadFile, previewFile: setPreviewBinding,` (+ зависимость `downloadFile`). В разметку
  блока B:
  ```tsx
      {grammarV2 && previewBinding && (
        <PpmFilePreviewDialog
          binding={previewBinding}
          vaultService={vaultService}
          onClose={() => setPreviewBinding(undefined)}
          onDownload={downloadFile}
        />
      )}
  ```

- [ ] **Step 9: Стили** — `canvas-content.css`:
  ```css
  /* AF2.1 B5 · Кнопки файловых карточек и полноэкранный просмотр (портал в body — только облик v2). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__action,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-items-view__backlog {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.5rem;
    border: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    border-radius: var(--ppm-radius-sm, 0.25rem);
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__action svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] [data-ppm-drag-handle] {
    cursor: grab;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview {
    --ppm-code-bg: #f6f8fa;
    --ppm-code-text: #1f2328;
    --ppm-code-keyword: #cf222e;
    --ppm-code-string: #0a3069;
    --ppm-code-number: #0550ae;
    --ppm-code-comment: #57606a;
    --ppm-code-title: #8250df;
    --ppm-code-builtin: #953800;
    display: grid;
    width: min(72rem, 100%);
    height: min(52rem, calc(100vh - 2rem));
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    border-radius: var(--ppm-radius-lg, 0.75rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header strong {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header :where(button, a) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header svg {
    width: 1rem;
    height: 1rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__body {
    min-height: 0;
    padding: 1rem;
    overflow: auto;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__body > :where(img, iframe) {
    width: 100%;
    height: 100%;
    border: 0;
    object-fit: contain;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__message {
    display: grid;
    min-height: 12rem;
    place-items: center;
    gap: 0.5rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    text-align: center;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__table table {
    border-collapse: collapse;
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__table :where(th, td) {
    padding: 0.375rem 0.625rem;
    border-bottom: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    text-align: left;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__tabs [aria-selected="true"] {
    font-weight: 600;
    text-decoration: underline;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__code {
    margin: 0;
    padding: 0.75rem;
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-code-text, #1f2328);
    background: var(--ppm-code-bg, #f6f8fa);
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__number {
    display: inline-block;
    min-width: 3ch;
    margin-right: 1rem;
    color: var(--ppm-code-comment, #57606a);
    text-align: right;
    user-select: none;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-keyword, .hljs-literal) {
    color: var(--ppm-code-keyword, #cf222e);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-string, .hljs-attr) {
    color: var(--ppm-code-string, #0a3069);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-number, .hljs-variable) {
    color: var(--ppm-code-number, #0550ae);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-comment, .hljs-meta) {
    color: var(--ppm-code-comment, #57606a);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-title, .hljs-name) {
    color: var(--ppm-code-title, #8250df);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-built_in, .hljs-type) {
    color: var(--ppm-code-builtin, #953800);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__slides li {
    margin-bottom: 0.75rem;
  }
  ```

- [ ] **Step 10: Строки** — блок «B»:
  ```ts
      // en
      "canvas.file_preview": "Preview",
      "canvas.file_download": "Download",
      "canvas.file_preview_loading": "Preparing the preview…",
      "canvas.file_preview_error": "Could not open the preview.",
      "canvas.file_preview_unsupported": "No preview for this format — download the file.",
      "canvas.file_preview_truncated": "Only the beginning of the file is shown.",
      "canvas.file_download_error": "Could not download the file.",
      "canvas.file_open_in_vault": "Open in Knowledge",
      "canvas.file_slide": "Slide",
      "canvas.work_items_view_expand": "Expand the board",
  ```
  ```ts
      // ru
      "canvas.file_preview": "Просмотр",
      "canvas.file_download": "Скачать",
      "canvas.file_preview_loading": "Готовим просмотр…",
      "canvas.file_preview_error": "Не удалось открыть просмотр.",
      "canvas.file_preview_unsupported": "Для этого формата нет просмотра — скачайте файл.",
      "canvas.file_preview_truncated": "Показано только начало файла.",
      "canvas.file_download_error": "Не удалось скачать файл.",
      "canvas.file_open_in_vault": "Открыть в Хранилище",
      "canvas.file_slide": "Слайд",
      "canvas.work_items_view_expand": "Развернуть доску",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 11: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/files-preview.test.ts`
  → `5 passed`; весь `tests/ppm-canvas` и `card-grammar.test.ts` (якоря карточек) — зелёные; формат/линт/tsc для
  `canvas-file-kind.ts`, `file-preview.tsx`, `ppm-vault.service.ts`, `canvas-content-actions.ts`, `shape.tsx`,
  `editor.tsx`, теста и `af21-canvas.ts`.

**Acceptance (B5):**
- [ ] Критерий 4: «Скачать» и «Просмотр» работают для картинки, PDF (виден просмотрщик браузера, а не «заблокировано»),
  Markdown (как заметка), кода (`.py`, если S принимает код; иначе `.json`/`.txt`), CSV (таблица), docx/xlsx/pptx
  (превью S: текст, листы с вкладками, слайды); прочее — иконка и «Скачать». Esc/крестик/щелчок по фону закрывают.
- [ ] Критерий 5 / R8: «Доска задач» под v2 — канбан с колонками, перетаскиванием и созданием; без записи версии доски
  при открытии (журнал версий не растёт); «Открыть бэклог» — вторичная кнопка; ужатая раньше доска — «Развернуть доску».
- [ ] v1: карточки медиа/содержимого и канбан — разметка UX1.1 (PDF в `sandbox=""`, без новых кнопок).

---

### Task 13 (B6): Чек-лист «Сделать задачами» и перенос старых картинок `data:` в Хранилище

**Решение по миграции (RB13): делаем перенос, но только по подтверждению.** Автоматический перенос при открытии
доски — тихая запись от имени первого открывшего редактора (то же, что регрессия 7) и загрузка файлов без его ведома;
«только уведомление» оставляет доски > 2 МиБ несохраняемыми (`apps/api/plane/ppm_canvas/schema.py:9,25-35`). Компромисс:
при открытии доски редактором под v2, если в снимке есть картинки `data:`, показывается уведомление с числом и объёмом
и кнопками «Перенести в Хранилище» / «Не сейчас» (отказ помнится в sessionStorage для этой доски). Перенос: для каждой
картинки PNG/JPEG/WebP — загрузка в Хранилище («Вставка-…» или исходное имя), живая карточка в центре старой картинки,
удаление фигуры `image` и ассета `data:`; при ошибке картинка остаётся. Всё одной точкой истории (⌘Z возвращает), плюс
версии доски на сервере. GIF/SVG Хранилище не принимает — они остаются, число называется. Если ассет использован
несколькими фигурами — переносится только первая, ассет остаётся (редкий случай, без риска двойной привязки).

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-checklist.ts`, `canvas-image-migration.ts`
- Modify: `shape.tsx` — `ChecklistEditor` `:814-901`; `canvas-content-actions.ts` (`convertChecklistItems`)
- Modify: `editor.tsx` — блок B (превращение пунктов, уведомление и перенос `data:`), импорт `type TLAssetId`
- Modify: `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/content-checklist-migration.test.ts` (новый)

**Interfaces:**
- Consumes (F): `checklist.items[]` с необязательным `work_item_id: string (uuid) | null` (схема F; без него отметки
  «уже задача» теряются при разборе — `ppmCanvasChecklistItemSchema` сейчас `z.object` без `passthrough`,
  `packages/ppm-canvas/src/index.ts:109-113`). B1: `createProjectionShape(binding, placement?)`, `spotBeside`,
  `setContentNotice`; B4: `pastedFileName`, `uploadWithUniqueName`, `extensionForMime`, `isVaultUploadable`;
  tldraw `editor.getAssets()`, `deleteAssets`, `markHistoryStoppingPoint`; `formatFileSize` (`editor.tsx:3760`).
- Produces: `canvas-checklist.ts` — `checklistItemsToConvert`, `markConvertedItems`, тип `TChecklistItem`;
  `canvas-image-migration.ts` — `findInlineImageAssets`, `dataUrlToFile`, `inlineImagesDismissKey`, тип
  `TInlineImageAsset`; поле контекста `convertChecklistItems`; классы `.ppm-canvas-checklist__convert`,
  `.ppm-canvas-checklist__task`, `.ppm-canvas-inline-images`; ключи `canvas.checklist_make_tasks`,
  `canvas.checklist_converted`, `canvas.checklist_converted_partial`, `canvas.checklist_item_is_task`,
  `canvas.inline_images_notice`, `canvas.inline_images_unsupported`, `canvas.inline_images_move`,
  `canvas.inline_images_later`, `canvas.inline_images_done`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-checklist.ts apps/web/core/components/ppm-canvas/canvas-image-migration.ts \
    apps/web/tests/ppm-canvas/content-checklist-migration.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/content-checklist-migration.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { checklistItemsToConvert, markConvertedItems } from "@/components/ppm-canvas/canvas-checklist";
  import {
    dataUrlToFile,
    findInlineImageAssets,
    inlineImagesDismissKey,
  } from "@/components/ppm-canvas/canvas-image-migration";

  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/${name}`, import.meta.url), "utf8");
  const PNG = "data:image/png;base64,iVBORw0KGgo=";
  const TASK = "77777777-7777-4777-8777-777777777777";

  describe("checklist → tasks and inline images → Vault (AF2.1 B6)", () => {
    it("converts only checked, non-empty items that are not tasks yet", () => {
      const items = [
        { id: "a", text: "Замерить при лампе", checked: true },
        { id: "b", text: "  ", checked: true },
        { id: "c", text: "Спросить Олега", checked: false },
        { id: "d", text: "Эталоны", checked: true, work_item_id: TASK },
      ];
      expect(checklistItemsToConvert(items).map((item) => item.id)).toEqual(["a"]);
      expect(markConvertedItems(items, { a: TASK })[0]).toEqual({ ...items[0], work_item_id: TASK });
      expect(markConvertedItems(items, {})[0]).toBe(items[0]);
    });

    it("finds data: images, sizes them and flags formats the Vault rejects", () => {
      const found = findInlineImageAssets([
        { id: "asset:1", type: "image", props: { mimeType: "image/png", name: "image.png", src: PNG } },
        { id: "asset:2", type: "image", props: { src: "https://example.org/x.png" } },
        { id: "asset:3", type: "image", props: { src: "data:image/gif;base64,R0lGODlh" } },
        { id: "asset:4", type: "video", props: { src: "data:video/mp4;base64,AAAA" } },
      ]);
      expect(found).toEqual([
        { assetId: "asset:1", bytes: 8, mime: "image/png", name: "image.png", src: PNG, supported: true },
        { assetId: "asset:3", bytes: 6, mime: "image/gif", name: "", src: "data:image/gif;base64,R0lGODlh", supported: false },
      ]);
      expect(inlineImagesDismissKey("b-1")).toBe("ppm-canvas-inline-images-dismissed:b-1");
    });

    it("turns a data: URL back into the original bytes", async () => {
      const file = dataUrlToFile(PNG, "Вставка-2026-09-25-153012.png");
      expect(file.name).toBe("Вставка-2026-09-25-153012.png");
      expect(file.type).toBe("image/png");
      expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });

    it("wires the checklist button and the confirmation notice under v2 only", () => {
      expect(read("shape.tsx")).toContain("checklistItemsToConvert(node.items)");
      const editorSource = read("editor.tsx");
      expect(editorSource).toContain("inlineImagesDismissKey(boardId)");
      expect(editorSource).toMatch(/grammarV2 && effectiveCanEdit && inlineImages\.length > 0/);
    });

    it("names the actions in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.checklist_make_tasks").replace("{count}", "2")).toBe("Сделать задачами · 2");
      expect(getPpmTranslation("ru", "canvas.inline_images_move")).toBe("Перенести в Хранилище");
      expect(getPpmTranslation("en", "canvas.inline_images_later")).toBe("Not now");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-checklist"`.

- [ ] **Step 3: `canvas-checklist.ts` и `canvas-image-migration.ts` (новые)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // canvas-checklist.ts — AF2.1 B6: «Сделать задачами» для отмеченных пунктов, пункт помнит свою задачу.
  export type TChecklistItem = { checked: boolean; id: string; text: string; work_item_id?: string | null };

  export function checklistItemsToConvert<T extends TChecklistItem>(items: readonly T[]): T[] {
    return items.filter((item) => item.checked && item.text.trim() !== "" && !item.work_item_id);
  }

  export function markConvertedItems<T extends TChecklistItem>(
    items: readonly T[],
    converted: Readonly<Record<string, string>>
  ): T[] {
    return items.map((item) => (converted[item.id] ? { ...item, work_item_id: converted[item.id] } : item));
  }
  ```
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { extensionForMime, isVaultUploadable } from "./canvas-file-kind";

  // canvas-image-migration.ts — AF2.1 B6 (RB13): картинки, вставленные до AF2.1, лежат в снимке доски как data: URL
  // (inlineBase64AssetStore tldraw). Находим их и переносим в Хранилище только по подтверждению редактора.
  export type TInlineImageAsset = {
    assetId: string;
    bytes: number;
    mime: string;
    name: string;
    src: string;
    supported: boolean;
  };

  type TAssetLike = { id: string; props?: { mimeType?: string | null; name?: string; src?: string | null }; type: string };

  export function findInlineImageAssets(assets: readonly TAssetLike[]): TInlineImageAsset[] {
    return assets.flatMap((asset) => {
      const src = asset.props?.src ?? "";
      if (asset.type !== "image" || !src.startsWith("data:")) return [];
      const comma = src.indexOf(",");
      const header = src.slice(5, comma);
      const mime = (header.split(";")[0] || asset.props?.mimeType || "application/octet-stream").toLowerCase();
      const payload = src.length - comma - 1;
      const padding = src.endsWith("==") ? 2 : src.endsWith("=") ? 1 : 0;
      const bytes = header.includes(";base64") ? Math.floor((payload * 3) / 4) - padding : payload;
      const extension = extensionForMime(mime);
      return [
        {
          assetId: asset.id,
          bytes,
          mime,
          name: asset.props?.name ?? "",
          src,
          supported: Boolean(extension) && isVaultUploadable(`image.${extension}`),
        },
      ];
    });
  }

  export function dataUrlToFile(dataUrl: string, name: string): File {
    const comma = dataUrl.indexOf(",");
    const header = dataUrl.slice(5, comma);
    const payload = dataUrl.slice(comma + 1);
    const bytes = header.includes(";base64")
      ? Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(payload));
    return new File([bytes], name, { type: header.split(";")[0] || "application/octet-stream" });
  }

  export function inlineImagesDismissKey(boardId: string): string {
    return `ppm-canvas-inline-images-dismissed:${boardId}`;
  }
  ```

- [ ] **Step 4: `canvas-content-actions.ts` — поле превращения пунктов**
  ```ts
    /** «Сделать задачами»: задачи Plane по пунктам, карточки столбиком рядом; ответ — id пункта → id задачи. */
    convertChecklistItems: (anchor: TPpmCanvasShape, items: { id: string; text: string }[]) => Promise<Record<string, string>>;
  ```
  по умолчанию: `convertChecklistItems: async () => ({}),`.

- [ ] **Step 5: `shape.tsx` — `ChecklistEditor` (`:814-901`)**
  Импорты: `import { checklistItemsToConvert, markConvertedItems } from "./canvas-checklist";`. В начале функции после
  `const ppmT = usePpmTranslation();` (`:825`):
  ```tsx
    const grammarV2 = usePpmCanvasGrammarV2();
    const contentActions = useContext(PpmCanvasContentActionsContext);
    const projectionContext = useContext(PpmWorkItemProjectionContext);
    const [converting, setConverting] = useState(false);
    const pending = checklistItemsToConvert(node.items);
    const taskLink = (workItemId: string) => {
      for (const binding of projectionContext.bindingsByShapeId.values()) {
        if (binding.entity_type === "work_item" && binding.entity_id === workItemId) return binding.source.identity;
      }
      return undefined;
    };
    const convert = async () => {
      if (converting || pending.length === 0) return;
      setConverting(true);
      try {
        const converted = await contentActions.convertChecklistItems(
          shape,
          pending.map((item) => ({ id: item.id, text: item.text }))
        );
        // Пока шли запросы, пункты могли поменять: берём свежий узел из редактора.
        const current = editor.getShape<TPpmCanvasShape>(shape.id);
        const parsed = current ? parseSerializedPpmCanvasNode(current.props.node) : undefined;
        const latest =
          parsed && (parsed.status === "valid" || parsed.status === "migrated") && parsed.node.kind === "checklist"
            ? parsed.node
            : node;
        if (Object.keys(converted).length > 0)
          updateNode(editor, current ?? shape, latest, { items: markConvertedItems(latest.items, converted) });
      } finally {
        setConverting(false);
      }
    };
  ```
  В строке пункта после `<input … />` (`:852-866`) и перед кнопкой удаления:
  ```tsx
            {grammarV2 && item.work_item_id && (
              <a
                className="ppm-canvas-checklist__task"
                href={taskLink(item.work_item_id)?.source_url ?? undefined}
                title={ppmT("canvas.checklist_item_is_task")}
                onClick={stopEventPropagation}
                onPointerDown={stopEventPropagation}
              >
                <ListTodo aria-hidden="true" />
                {taskLink(item.work_item_id)?.identifier ?? ""}
              </a>
            )}
  ```
  После кнопки «Добавить пункт» (`:884-898`), внутри `.ppm-canvas-checklist`:
  ```tsx
        {grammarV2 && !readonly && contentActions.canEdit && pending.length > 0 && (
          <button
            type="button"
            className="ppm-canvas-checklist__convert"
            disabled={converting}
            onClick={() => void convert()}
            onKeyDown={stopEventPropagation}
            onPointerDown={stopEventPropagation}
          >
            {converting ? <LoaderCircle aria-hidden="true" /> : <ListTodo aria-hidden="true" />}
            {fillCanvasTemplate(ppmT("canvas.checklist_make_tasks"), { count: pending.length })}
          </button>
        )}
  ```
  (`ListTodo`, `LoaderCircle`, `parseSerializedPpmCanvasNode`, `useState`, `useContext`, `fillCanvasTemplate` уже
  импортированы в `shape.tsx`.)

- [ ] **Step 6: `editor.tsx` — блок B «чек-лист и картинки data:»** (после блока B5)
  Импорты: `type TLAssetId` в импорт из `tldraw` (`:33-47`);
  `import { dataUrlToFile, findInlineImageAssets, inlineImagesDismissKey, type TInlineImageAsset } from "./canvas-image-migration";`;
  в импорт из `./canvas-external-content` добавить `pastedFileName, uploadWithUniqueName`.
  ```ts
  // ── AF2.1 B · чек-лист → задачи; перенос картинок data: (RB13) ──
  const convertChecklistItems = useCallback(
    async (anchor: TPpmCanvasShape, items: { id: string; text: string }[]) => {
      const converted: Record<string, string> = {};
      if (!editableRef.current) return converted;
      const size = {
        h: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultHeight,
        w: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultWidth,
      };
      for (const item of items.slice(0, 20)) {
        try {
          const binding = await service.createWorkItem(workspaceId, projectId, boardId, {
            name: item.text.trim().slice(0, 255),
            shape_id: createShapeId(),
            client_operation_id: crypto.randomUUID(),
          });
          // spotBeside пересчитывает занятые места: каждая следующая карточка встаёт ниже предыдущей.
          await createProjectionShape(binding, spotBeside(anchor, size));
          converted[item.id] = binding.entity_id;
        } catch {
          break;
        }
      }
      const count = Object.keys(converted).length;
      setContentNotice(
        count === items.length
          ? fillCanvasTemplate(ppmT("canvas.checklist_converted"), { count })
          : fillCanvasTemplate(ppmT("canvas.checklist_converted_partial"), { count, total: items.length })
      );
      return converted;
    },
    [boardId, createProjectionShape, ppmT, projectId, service, spotBeside, workspaceId]
  );
  const [inlineImages, setInlineImages] = useState<TInlineImageAsset[]>([]);
  const [inlineMigrationBusy, setInlineMigrationBusy] = useState(false);
  useEffect(() => {
    if (!editor || !grammarV2 || !effectiveCanEdit || syncStatus !== "saved") return;
    try {
      if (window.sessionStorage.getItem(inlineImagesDismissKey(boardId))) return;
    } catch {
      // sessionStorage недоступен — уведомление всё равно показываем.
    }
    setInlineImages(findInlineImageAssets(editor.getAssets()));
  }, [boardId, editor, effectiveCanEdit, grammarV2, syncStatus]);
  const dismissInlineImages = useCallback(() => {
    try {
      window.sessionStorage.setItem(inlineImagesDismissKey(boardId), "1");
    } catch {
      // не критично: уведомление просто вернётся при следующем открытии
    }
    setInlineImages([]);
  }, [boardId]);
  const migrateInlineImages = useCallback(async () => {
    const activeEditor = editorRef.current;
    if (!activeEditor || !editableRef.current || inlineMigrationBusy) return;
    setInlineMigrationBusy(true);
    activeEditor.markHistoryStoppingPoint("ppm move inline images");
    const now = new Date();
    let moved = 0;
    for (const asset of inlineImages.filter((item) => item.supported)) {
      const users = activeEditor
        .getCurrentPageShapes()
        .filter((shape) => shape.type === "image" && (shape.props as { assetId?: string | null }).assetId === asset.assetId);
      const first = users[0];
      if (!first) continue;
      try {
        const file = dataUrlToFile(asset.src, pastedFileName({ name: asset.name, type: asset.mime }, now));
        const entry = await uploadWithUniqueName(
          (candidate) => vaultService.uploadFile(workspaceId, projectId, candidate),
          file,
          file.name
        );
        const bounds = activeEditor.getShapePageBounds(first);
        await addUploadedContent("vault_file", entry.id, 0, bounds ? bounds.center : activeEditor.getViewportPageBounds().center);
        activeEditor.deleteShape(first.id);
        if (users.length === 1) activeEditor.deleteAssets([asset.assetId as TLAssetId]);
        moved += 1;
      } catch {
        // Картинка остаётся на доске; число непереносённых — в уведомлении.
      }
    }
    setContentNotice(fillCanvasTemplate(ppmT("canvas.inline_images_done"), { count: moved }));
    setInlineImages(findInlineImageAssets(activeEditor.getAssets()));
    setInlineMigrationBusy(false);
  }, [addUploadedContent, inlineImages, inlineMigrationBusy, ppmT, projectId, vaultService, workspaceId]);
  const inlineSupported = inlineImages.filter((item) => item.supported);
  // ── /AF2.1 B ──
  ```
  В `contentActions` добавить `convertChecklistItems` (+ зависимость). В разметку блока B:
  ```tsx
      {grammarV2 && effectiveCanEdit && inlineImages.length > 0 && (
        <div className="ppm-canvas-inline-images" role="status">
          <span>
            {inlineSupported.length > 0 &&
              fillCanvasTemplate(ppmT("canvas.inline_images_notice"), {
                count: inlineSupported.length,
                size: formatFileSize(inlineSupported.reduce((total, item) => total + item.bytes, 0)),
              })}
            {inlineImages.length > inlineSupported.length &&
              ` ${fillCanvasTemplate(ppmT("canvas.inline_images_unsupported"), { count: inlineImages.length - inlineSupported.length })}`}
          </span>
          {inlineSupported.length > 0 && (
            <button type="button" disabled={inlineMigrationBusy} onClick={() => void migrateInlineImages()}>
              {ppmT("canvas.inline_images_move")}
            </button>
          )}
          <button type="button" onClick={dismissInlineImages}>
            {ppmT("canvas.inline_images_later")}
          </button>
        </div>
      )}
  ```

- [ ] **Step 7: Стили и строки**
  `canvas-content.css`:
  ```css
  /* AF2.1 B6 · Чек-лист → задачи; уведомление о картинках внутри доски (вверху по центру, не над нижним уведомлением). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-checklist__convert {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-checklist__task {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.6875rem;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-canvas-checklist__convert, .ppm-canvas-checklist__task) svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inline-images {
    position: absolute;
    z-index: 330;
    top: 3.5rem;
    left: 50%;
    display: flex;
    max-width: min(40rem, calc(100% - 2rem));
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.8125rem;
    transform: translateX(-50%);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inline-images button {
    flex: none;
    font-weight: 600;
  }
  ```
  Блок «B» `af21-canvas.ts`:
  ```ts
      // en
      "canvas.checklist_make_tasks": "Make tasks · {count}",
      "canvas.checklist_converted": "Tasks created: {count}",
      "canvas.checklist_converted_partial": "Tasks created: {count} of {total}. Try again for the rest.",
      "canvas.checklist_item_is_task": "Already a task",
      "canvas.inline_images_notice": "{count} images are stored inside the board ({size}). Move them to Knowledge so the board saves faster?",
      "canvas.inline_images_unsupported": "{count} more in GIF or SVG stay on the board.",
      "canvas.inline_images_move": "Move to Knowledge",
      "canvas.inline_images_later": "Not now",
      "canvas.inline_images_done": "Moved to Knowledge: {count}",
  ```
  ```ts
      // ru
      "canvas.checklist_make_tasks": "Сделать задачами · {count}",
      "canvas.checklist_converted": "Создано задач: {count}",
      "canvas.checklist_converted_partial": "Создано задач: {count} из {total}. Повторите для остальных.",
      "canvas.checklist_item_is_task": "Уже задача",
      "canvas.inline_images_notice": "Картинок внутри доски: {count} ({size}). Перенести их в Хранилище, чтобы доска сохранялась быстрее?",
      "canvas.inline_images_unsupported": "Ещё {count} в GIF или SVG останутся на доске.",
      "canvas.inline_images_move": "Перенести в Хранилище",
      "canvas.inline_images_later": "Не сейчас",
      "canvas.inline_images_done": "Перенесено в Хранилище: {count}",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 8: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/content-checklist-migration.test.ts`
  → `5 passed`; затем полный прогон линии:
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas && ./node_modules/.bin/vitest run
  ```
  Ожидается: все зелёные (новые: 9 + 7 + 5 + 8 + 5 + 5 = 39). Формат/линт/tsc для файлов задачи.

**Acceptance (B6):**
- [ ] Спецификация §C «Список»: отметить 2 пункта → «Сделать задачами · 2» → две задачи Plane, две живые карточки
  столбиком справа, у пунктов — метка «ROBOT-…» со ссылкой; повторное нажатие не создаёт дублей.
- [ ] Доска со старой вставленной картинкой: уведомление с числом и объёмом; «Перенести в Хранилище» → карточка файла
  на месте картинки, в снимке нет `data:`; ⌘Z возвращает картинку; «Не сейчас» — уведомление не возвращается в этой
  вкладке; читатель уведомления не видит.

---

#### Примечание B7: Формулы LaTeX в редакторе «Документов» — **решение: в AF2.1 не делаем**

Проверено по коду (2026-09-25):
- Страницы Plane хранятся как Yjs-бинарь; HTML для API и поиска строит сервер реального времени `apps/live`
  функцией `getAllDocumentFormatsFromDocumentEditorBinaryData` из `@plane/editor`
  (`apps/live/src/extensions/database.ts:10-12,42`) по схеме `DocumentEditorExtensionsWithoutProps`
  (`packages/editor/src/core/extensions/core-without-props.ts:30`, `packages/editor/src/core/helpers/yjs-utils.ts`).
  Новый узел формулы надо добавить **и** в редактор, **и** в «схему без пропсов», **и** пересобрать/перезапустить
  `apps/live`; если хоть одна сторона его не знает — узел молча выпадает при конвертации в HTML (потеря данных в
  «Документах»), а старые клиенты с кешем бандла ломают совместное редактирование документа.
- `katex` не зависимость `packages/editor` (`packages/editor/package.json:46-75`); добавление — правка
  `pnpm-lock.yaml` (владелец F) и сборка пакета редактора, которого нет среди `af21-pkg-build.sh`
  (`ppm-brand|ppm-canvas|propel|ui|i18n`).
- Контроллер не перезапускает `apps/live` в этой волне; живую проверку совместной правки документа с формулой на
  доске 228 провести нельзя без него.

Что уже покрыто в AF2.1: формулы пишутся и отображаются в **заметке** Холста (B1); «Сделать документом» переносит их
исходником `$…$` в `<code>` (B1, RB5) — без потерь, и их можно будет отрисовать, когда появится узел формулы.

Отдельная задача после AF2.1 («Формулы в Документах»): узел `mathInline`/`mathBlock` (`atom: true`, атрибут `latex`),
`renderHTML` → `<span data-type="math-inline" data-latex="…">` (стабильный HTML для сервера), NodeView с
`katex.render(…, { throwOnError: false, trust: false })`, ввод `$…$`/`$$…$$` через input rule, одновременное добавление
в `CoreEditorExtensionsWithoutProps`/`DocumentEditorExtensionsWithoutProps`, `katex` в `packages/editor/package.json`,
пересборка `apps/live`, миграция: разбор `<code>$…$</code>` из документов, созданных «Сделать документом», в узлы формул.

---

## Сводная приёмка линии B (после B6)

- [ ] `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run` — всё зелёное (≈350 + 39 новых).
- [ ] `cd /Users/ermolov/Desktop/PPM/plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run && node
  scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit` —
  79+/79+ и аудиты чистые (новые ключи en/ru парные, без «ИИ»).
- [ ] web tsc: фильтр из Global Constraints пуст; полный `tsc --noEmit` после всех линий — 0.
- [ ] `cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxlint apps/web/core/components/ppm-canvas
  apps/web/core/services/ppm-canvas.service.ts apps/web/core/services/ppm-vault.service.ts` — 0 ошибок, предупреждений
  не больше базовой линии (719 во всём web).
- [ ] `docs/superpowers/plans/2026-09-25-af21/tools/af21-diff.sh apps/web/core/components/ppm-canvas/editor.tsx` — правки
  B только в блоках `AF2.1 B`, в `createProjectionShape` (параметр `placement`) и в `handleFileDrop` (ветка v2).
- [ ] Живая проверка на доске «Тест Холста» (проект 228), облик v2: заметка (Markdown, `$…$`, `$$…$$`, код), «Сделать
  задачей», «Сделать документом», код (K3), «Новый документ», «Документ PPM», вставка скриншота (⌘V), перетаскивание 3
  файлов, ⌘U, просмотр и скачивание картинки/PDF/Markdown/кода/docx/xlsx/pptx, «Доска задач» (канбан, клики,
  перетаскивание), чек-лист → задачи, перенос старой картинки. Облик v1 (`localStorage.ppm_design="v1"`) — как в конце
  UX1.1. Старая доска (до AF2.1) открывается без потерь.
- [ ] Сеть браузера: при вставке URL, открытии заметок с картинками/формулами и просмотре файлов нет запросов вне API
  PPM (и подписанных ссылок MinIO при S3).


---

## Линия S — сервер (параллельно с R и B после F)

> **Для исполнителя.** Задачи S1 → S2 → S3 выполнять по порядку, шаг за шагом (TDD: сначала красный тест, потом код).
> Коммитов нет. Рабочее дерево `plane-fork` — источник истины (в нём незакоммиченная работа нескольких сессий): править
> только файлы из раздела «Файлы» своей задачи, перед первой правкой — `af21-pre.sh`. Весь код ниже прогнан 2026-09-25 на
> копии `apps/api` в изолированном тестовом стеке: `136 passed` для `ppm_vault` + `ppm_canvas`, `ruff` чистый.

**Цель линии.** Серверная часть AF2.1 для содержимого Холста:
1. **S1** — безопасный серверный предпросмотр Word/Excel/PowerPoint и текстовых файлов Хранилища (docx → санитизированный
   HTML, xlsx → значения ячеек, pptx → заголовки и текст слайдов, txt/md/csv/json/код → текст) с кешем по хэшу версии.
2. **S2** — поиск документов PPM (Plane Pages) для вставки на Холст (`projections/search/?types=page`): только видимые
   пользователю.
3. **S3** — вставка файлов из буфера: имя от клиента, детерминированный 409 с подсказкой свободного имени, GIF с проверкой
   сигнатуры, файлы кода, понятная ошибка превышения лимита.
4. **S4** — аудио/видео: вне AF2.1, обоснование ниже.

**Архитектура.** Всё — в существующих PPM-приложениях `plane.ppm_vault` и `plane.ppm_canvas`, по их образцам: `APIView` +
`BaseSessionAuthentication` + `IsAuthenticated`, ошибки через `ppm_error_response` (`{"error": {code, message, request_id,
details}}`), права — `get_ppm_project_access` (Хранилище) и `get_ppm_canvas_access` (Холст). Новые модули:
`ppm_vault/formats.py` (словарь форматов) и `ppm_vault/preview.py` (построение предпросмотра, лимиты, кеш). Без миграций,
без новых зависимостей, без правок `settings/*.py` (лимиты читаются через `getattr(settings, имя, по_умолчанию)`), без
внешних запросов.

**Стек.** Django 5.2.15, DRF 3.17.1, Python 3.12.5 (образ API), `zipfile` (stdlib), `lxml==6.1.0`
(`apps/api/requirements/base.txt:56`), `openpyxl==3.1.2` (`:46`), `nh3==0.2.18` (`:79`), кеш Django (`django_redis`,
`settings/common.py:393-399`); тесты — pytest 9.0.3 + pytest-django 4.12.0 (`requirements/test.txt`).

**Зависимости.** Линия S не пересекается с F/R/B ни по одному файлу и не ждёт их: может стартовать сразу после F (или
параллельно с ней). B потребляет контракты из блоков «Интерфейс» задач S1–S3; сводка для B, F и контроллера —
`drafts/plan-S-needs.md`.

---

## 0. Глобальные ограничения линии S

1. **Владение** (CONTRACTS §0): только `apps/api/plane/ppm_vault/**`, `apps/api/plane/ppm_canvas/**`,
   `apps/api/plane/tests/**`. Не трогать: `apps/api/plane/settings/**`, `apps/api/plane/urls.py`,
   `apps/api/requirements/**`, миграции, `apps/web/**`, `packages/**`, `apps/proxy/**`.
2. **Пред-образы.** Перед первой правкой каждого файла и перед созданием нового:
   `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`
   (для нового файла сохраняется маркер `.__absent__`; повторный вызов для того же пути ничего не делает).
3. **Без коммитов**; не выполнять `git add/stash/checkout/restore`. Снимки делает контроллер (`af21-snap.sh`).
4. **Dev-стек не трогать.** `plane-fork-api-1` (:8000), `plane-fork-plane-db-1` и остальные сервисы `docker-compose-local.yml`
   не перезапускать. pytest в dev-образе отсутствует (`docker exec plane-fork-api-1 python -m pytest` →
   `No module named pytest`), поэтому тесты — только в изолированном compose-проекте `ppm-af21-s` (ниже). Dev-API запущен с
   `uvicorn --reload --reload-dir /code` (`apps/api/bin/docker-entrypoint-api-local.sh`, последняя строка) и монтирует
   `./apps/api`, поэтому правки видны на :8000 сразу — это используется только для дымовой проверки маршрута без
   авторизации (`curl` без cookies, пользовательские данные не читаются).
5. **Ошибки и тексты.** Только `ppm_error_response`; сообщения — по-русски; коды — `UPPER_SNAKE` (новых кодов нет:
   используются существующие `VAULT_…` и `PROJECTION_SEARCH_INVALID`). Существующие поля и коды ответов не меняются, новые
   поля только добавляются.
6. **Ничего не исполнять из файлов.** Никаких подпроцессов/LibreOffice/`eval`; `openpyxl.load_workbook(read_only=True,
   data_only=True, keep_links=False)` (формулы не вычисляются, VBA не загружается — `keep_vba` по умолчанию `False`).
7. **Тесты** — контрактные, по образцу `apps/api/plane/tests/contract/ppm_vault/test_vault_api.py`:
   `pytestmark = [pytest.mark.contract, pytest.mark.django_db]`, фабрики `plane.tests.factories`, локальное приватное
   хранилище (`settings.PPM_LOCAL_ASSET_UPLOADS = True`, `settings.PPM_VAULT_STORAGE_ROOT = str(tmp_path / …)`), в тестах
   предпросмотра — `LocMemCache` с уникальным `LOCATION` (не зависят от Redis и друг от друга).
8. **Стиль** — `ruff` по `apps/api/pyproject.toml` (line-length 120, правила `E`, `F`): `ruff check` и
   `ruff format --check` чистые для всех изменённых файлов.
9. **Номера строк** во всех «Было» — по рабочему дереву 2026-09-25 до правок линии S; вставки выше по файлу сдвигают
   нижние строки, поэтому ориентир — текст блока «Было»: каждый такой блок проверен скриптом и встречается в текущем
   файле ровно один раз, а каждый блок «Стало» — дословно в прогнанном коде.

### 0.1 Как запускаются API-тесты (проверено 2026-09-25)

В репозитории API-тесты идут через `docker-compose-test.yml`: сервис `api-tests` монтирует `./apps/api` в `/code`, при
старте ставит `requirements/test.txt`, работает с `DJANGO_SETTINGS_MODULE=plane.settings.test`; `apps/api/pytest.ini`
добавляет `--reuse-db --nomigrations -vs`; зависимости — отдельные `test-db`/`test-redis`/`test-mq`/`test-minio` на tmpfs
(подробно — `apps/api/tests/RUNNING_TESTS.md`). На этой машине (ARM64) образа MinIO из Quay нет, есть локальный
`ppm-af12-minio:RELEASE.2025-09-07T16-13-09Z` — его выбирают переменной `PPM_E2E_MINIO_IMAGE`. Чтобы не собирать образ
заново (минуты, сеть), линия переиспользует уже собранный `plane-fork-api-tests:latest` под именем своего проекта:

```bash
# один раз на линию (тег образа Docker — не правка репозитория)
cd /Users/ermolov/Desktop/PPM/plane-fork
docker image inspect ppm-af21-s-api-tests:latest >/dev/null 2>&1 \
  || docker tag plane-fork-api-tests:latest ppm-af21-s-api-tests:latest
```

Дальше в задачах «**`PYTEST <пути>`**» означает ровно эту команду (подставлять целиком):

```bash
cd /Users/ermolov/Desktop/PPM/plane-fork && \
PPM_E2E_MINIO_IMAGE=ppm-af12-minio:RELEASE.2025-09-07T16-13-09Z \
docker compose -p ppm-af21-s -f docker-compose-test.yml run --rm api-tests \
  pytest -p no:cacheprovider -q -W ignore::DeprecationWarning <пути>
```

- Первый запуск поднимает `ppm-af21-s-test-{db,redis,mq,minio}-1` (≈30–60 с); сервисы остаются поднятыми между запусками.
  Каждый запуск заново ставит test-зависимости pip'ом (нужна сеть к PyPI, ≈20 с) — это штатное поведение compose-файла.
- `-p no:cacheprovider` и `PYTHONDONTWRITEBYTECODE=1` (задан в `Dockerfile.dev`) — pytest ничего не пишет в рабочее дерево.
- Не запускать два `PYTEST` одновременно (общая тестовая БД при `--reuse-db`).
- **Базовая линия до S (проверено):** `PYTEST plane/tests/contract/ppm_vault` → `19 passed`;
  `PYTEST plane/tests/contract/ppm_canvas` → `99 passed`.
- После всей линии (если контроллер не просит оставить стек для ревью):
  `cd /Users/ermolov/Desktop/PPM/plane-fork && docker compose -p ppm-af21-s -f docker-compose-test.yml down -v`.

«**`RUFF <файлы>`**» — линт в одноразовом контейнере, без записи кеша в дерево (`--no-cache`):

```bash
docker run --rm -v /Users/ermolov/Desktop/PPM/plane-fork/apps/api:/code -w /code --entrypoint sh \
  plane-fork-api-tests:latest -c 'pip install -q ruff==0.9.7 && ruff check --no-cache <файлы> && ruff format --no-cache --check <файлы>'
```

Ожидается `All checks passed!` и `N files already formatted`.

---

### Task 14 (S1): серверный предпросмотр файлов Хранилища (≈45 мин)

**Файлы**
- Создать: `apps/api/plane/ppm_vault/formats.py` — словарь форматов (Office, код, текст); его же импортирует S3.
- Создать: `apps/api/plane/ppm_vault/preview.py` — построение предпросмотра, лимиты, кеш.
- Изменить: `apps/api/plane/ppm_vault/views.py` — импорт после строки 36 (`from .links import entry_path, serialize_link`);
  новый класс между концом `PpmVaultFileContentView` (строка 367, `return Response(serialize_entry(entry))`) и
  `class PpmVaultBacklinksView` (строка 370).
- Изменить: `apps/api/plane/ppm_vault/urls.py` — импорт между строками 8 и 9, маршрут перед закрывающей `]` (строка 97).
- Создать тест: `apps/api/plane/tests/contract/ppm_vault/test_vault_preview_api.py`.

**Интерфейс (контракт для B; уточняет CONTRACTS §5)**

`GET /api/ppm/v1/workspaces/<workspace_id:uuid>/projects/<project_id:uuid>/vault/entries/<entry_id:uuid>/preview/`

- В CONTRACTS §5 указан `<slug>`, но все маршруты Хранилища принимают **UUID пространства**
  (`ppm_vault/urls.py:28` — `PROJECT = "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/vault/"`; клиент —
  `apps/web/core/services/ppm-vault.service.ts:346-347`). Контракт исправлен на UUID (передано в `plan-S-needs.md`).
- Права — ровно как у `/file/` (`PpmVaultFileContentView.get`, `ppm_vault/views.py:321-342`):
  `require_access(request, workspace_id, project_id)` (чтение) + `get_entry(vault=vault, entry_id=entry_id)` (только
  `ACTIVE` в Хранилище этого проекта).

Ответ `200`, заголовок `Cache-Control: private, no-store`:

```jsonc
{
  "entry_id": "uuid", "version": 3, "content_hash": "sha256-hex", "extension": "docx",
  "kind": "docx" | "xlsx" | "pptx" | "text" | "unsupported",
  "truncated": false,
  // kind = "docx": только теги p, h1–h4, ul, li, br, table, tbody, tr, td; без атрибутов
  "html": "<h1>…</h1><p>…</p><ul><li>…</li></ul><table><tbody><tr><td>…</td></tr></tbody></table>",
  // kind = "xlsx": ≤ 5 видимых листов, каждый ≤ 200 строк × 50 столбцов, только значения (кеш формул), строки выровнены по ширине
  "sheets": [{ "name": "Лист1", "rows": [["A1", "B1"], ["A2", ""]] }],
  // kind = "pptx": порядок из p:sldIdLst, ≤ 200 слайдов, title ≤ 300 символов, text ≤ 4000
  "slides": [{ "index": 1, "title": "Заголовок", "text": "Строка 1\nСтрока 2" }],
  // kind = "text": txt, md (из версии Markdown), csv, json, код из formats.py; ≤ 256 КиБ
  "text": "…", "encoding": "utf-8" | "windows-1251",
  // kind = "unsupported":
  "reason": "type" | "too_large" | "limits" | "invalid" | "encrypted" | "binary"
}
```

| `reason` | Когда | Что показывает B |
|---|---|---|
| `type` | формат без серверного предпросмотра: pdf и картинки (их B показывает через `/pdf/` и `/file/`), doc/xls/ppt/odt/ods/odp/key | иконка + «Скачать» |
| `too_large` | исходник больше `PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES` (файл не читается) | «Слишком большой для предпросмотра» |
| `limits` | архив нарушает лимиты (элементов > 2000, распакованного > 20 МиБ суммарно, элемент > 1 МиБ со сжатием > 200×) | «Слишком сложный файл» |
| `invalid` | повреждён или не разбирается (в т. ч. элемент распаковывается больше заявленного размера) | «Не удалось прочитать» |
| `encrypted` | защищён паролем (OLE-контейнер вместо zip) или зашифрованный элемент zip | «Защищён паролем» |
| `binary` | «текстовый» файл содержит NUL-байты | «Не похоже на текст» |

Ошибки: `401 AUTHENTICATION_REQUIRED`; `403 VAULT_PERMISSION_DENIED`; `404 VAULT_ENTRY_NOT_FOUND` (нет, в корзине, другой
проект); `400 VAULT_INVALID_FILE_TYPE` (папка); `503 VAULT_STORAGE_FAILED` (объект недоступен в хранилище).

Лимиты (переопределяются настройками Django через `getattr`, в `settings/*.py` не добавляются):

| Настройка | По умолчанию | Смысл |
|---|---|---|
| `PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES` | 16 МиБ | больше — `too_large` без чтения (страховка на случай подъёма лимита загрузки) |
| `PPM_VAULT_PREVIEW_ZIP_MAX_MEMBERS` | 2000 | число элементов архива |
| `PPM_VAULT_PREVIEW_ZIP_MAX_UNCOMPRESSED_BYTES` | 20 МиБ | сумма заявленных распакованных размеров (CONTRACTS §5) |
| `PPM_VAULT_PREVIEW_ZIP_MAX_RATIO` | 200 | для элементов > 1 МиБ |
| `PPM_VAULT_PREVIEW_TEXT_MAX_BYTES` | 256 КиБ | текстовый предпросмотр |
| `PPM_VAULT_PREVIEW_MAX_OUTPUT_CHARS` | 400 000 | суммарно символов в html/ячейках/слайдах |
| `PPM_VAULT_PREVIEW_TIME_BUDGET_MS` | 5000 | кооперативный дедлайн разбора |
| `PPM_VAULT_PREVIEW_CACHE_SECONDS` | 86 400 | TTL кеша |

**Решения S1.**
- **Кеш «по хэшу версии».** Ключ `ppm:vault-preview:` + sha256(версия схемы предпросмотра | kind | extension |
  `content_hash` текущей версии | лимиты). Новая версия файла → новый хэш → новый ключ; одинаковые байты у разных записей
  дают одинаковый предпросмотр (утечки нет: чтобы попасть в ключ, нужно иметь сами байты). В кеше нет идентификаторов —
  `entry_id`/`version` добавляются к ответу после проверки прав. Ошибки кеша (Redis недоступен) → пересчёт с записью в лог;
  сбои хранилища не кешируются. Смена логики разбора → поднять `PREVIEW_SCHEMA_VERSION`.
- **Тайм-аут.** Кооперативный дедлайн (проверка в циклах блоков/строк/слайдов) + ограниченный вход (≤ 20 МиБ XML; глубина
  XML у libxml2 без `huge_tree` ≤ 256) вместо жёсткого прерывания: `signal.alarm` не работает вне главного потока (ASGI
  выполняет синхронные view в пуле потоков), подпроцесс на каждый предпросмотр несоразмерен задаче. Исчерпание бюджета →
  частичный результат с `truncated: true`.
- **Старые форматы** (doc/xls/ppt — OLE, odt/ods/odp — ODF) → `unsupported/type`: вне AF2.1, «Скачать» работает.
- **Кодировка текста:** UTF-8 (BOM допускается); если не UTF-8 и нет NUL — cp1251 (частый случай для CSV из Excel),
  `encoding` сообщает, что выбрано.

- [ ] **S1.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
  apps/api/plane/ppm_vault/formats.py apps/api/plane/ppm_vault/preview.py \
  apps/api/plane/ppm_vault/views.py apps/api/plane/ppm_vault/urls.py \
  apps/api/plane/tests/contract/ppm_vault/test_vault_preview_api.py
```

Ожидается (при первом вызове) 5 строк `pre-image saved: apps/api/plane/…`.

- [ ] **S1.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_vault/test_vault_preview_api.py` целиком:

```python
import io
import uuid
import zipfile
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook
from rest_framework import status

from plane.ppm_vault import preview as vault_preview
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
SLIDE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"


def make_user():
    marker = uuid.uuid4().hex
    return UserFactory(username=f"preview-{marker}", email=f"preview-{marker}@plane.test")


@pytest.fixture
def vault_project(settings, tmp_path):
    settings.PPM_LOCAL_ASSET_UPLOADS = True
    settings.PPM_VAULT_STORAGE_ROOT = str(tmp_path / "private-vault")
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": f"ppm-preview-{uuid.uuid4().hex}",
        }
    }
    user = make_user()
    workspace = WorkspaceFactory(owner=user)
    WorkspaceMemberFactory(workspace=workspace, member=user, role=20)
    project = ProjectFactory(workspace=workspace, identifier="PRV")
    ProjectMemberFactory(workspace=workspace, project=project, member=user, role=20)
    return user, workspace, project


def vault_url(workspace, project, suffix=""):
    return f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/vault/{suffix}"


def upload(api_client, workspace, project, name, payload):
    response = api_client.post(
        vault_url(workspace, project, "files/"),
        {"file": SimpleUploadedFile(name, payload, content_type="application/octet-stream")},
        format="multipart",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.data
    return response.data["id"]


def preview(api_client, workspace, project, entry_id):
    return api_client.get(vault_url(workspace, project, f"entries/{entry_id}/preview/"))


def zip_bytes(members, compression=zipfile.ZIP_DEFLATED):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression) as archive:
        for name, content in members.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def docx_bytes(body_xml, *, doctype=""):
    document = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>{doctype}'
        f'<w:document xmlns:w="{W_NS}"><w:body>{body_xml}</w:body></w:document>'
    )
    styles = (
        f'<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="{W_NS}">'
        '<w:style w:type="paragraph" w:styleId="1"><w:name w:val="heading 1"/></w:style>'
        "</w:styles>"
    )
    return zip_bytes({"word/document.xml": document, "word/styles.xml": styles})


def paragraph(text, style=None, numbered=False):
    properties = ""
    if style or numbered:
        style_xml = f'<w:pStyle w:val="{style}"/>' if style else ""
        numbering = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' if numbered else ""
        properties = f"<w:pPr>{style_xml}{numbering}</w:pPr>"
    return f'<w:p>{properties}<w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'


def pptx_bytes(slides_in_order):
    relationships = []
    slide_ids = []
    members = {}
    for position, (file_number, title, body) in enumerate(slides_in_order, start=2):
        relationships.append(
            f'<Relationship Id="rId{position}" Type="{SLIDE_REL}" Target="slides/slide{file_number}.xml"/>'
        )
        slide_ids.append(f'<p:sldId id="{254 + position}" r:id="rId{position}"/>')
        members[f"ppt/slides/slide{file_number}.xml"] = (
            f'<p:sld xmlns:p="{P_NS}" xmlns:a="{A_NS}"><p:cSld><p:spTree>'
            '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr>'
            f"</p:nvSpPr><p:txBody><a:p><a:r><a:t>{title}</a:t></a:r></a:p></p:txBody></p:sp>"
            '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr><p:ph idx="1"/></p:nvPr>'
            f"</p:nvSpPr><p:txBody><a:p><a:r><a:t>{body}</a:t></a:r></a:p></p:txBody></p:sp>"
            "</p:spTree></p:cSld></p:sld>"
        )
    members["ppt/presentation.xml"] = (
        f'<p:presentation xmlns:p="{P_NS}" xmlns:r="{R_NS}"><p:sldIdLst>{"".join(slide_ids)}</p:sldIdLst>'
        "</p:presentation>"
    )
    members["ppt/_rels/presentation.xml.rels"] = (
        f'<Relationships xmlns="{REL_NS}">{"".join(relationships)}</Relationships>'
    )
    return zip_bytes(members)


def xlsx_bytes(rows, cols, *, sheet_title="Бюджет"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title
    for row in range(1, rows + 1):
        for col in range(1, cols + 1):
            sheet.cell(row=row, column=col, value=f"R{row}C{col}")
    sheet["A1"] = "Статья"
    sheet["B1"] = 1250.0
    sheet["C1"] = "=B1*2"
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_docx_preview_builds_sanitized_html_with_headings_lists_and_tables(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    table = (
        "<w:tbl><w:tr><w:tc>" + paragraph("Срок") + "</w:tc><w:tc>" + paragraph("Октябрь") + "</w:tc></w:tr></w:tbl>"
    )
    body = (
        paragraph("План запуска", style="1")
        + paragraph("Обычный текст &lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x onerror=alert(2)&gt;")
        + paragraph("Первый пункт", numbered=True)
        + paragraph("Второй пункт", numbered=True)
        + table
    )
    entry_id = upload(api_client, workspace, project, "План.docx", docx_bytes(body))

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response["Cache-Control"] == "private, no-store"
    assert response.data["kind"] == "docx"
    assert response.data["entry_id"] == entry_id
    assert response.data["version"] == 1
    assert response.data["truncated"] is False
    html = response.data["html"]
    assert "<h1>План запуска</h1>" in html
    assert "<ul><li>Первый пункт</li><li>Второй пункт</li></ul>" in html
    assert "<table><tbody><tr><td>Срок</td><td>Октябрь</td></tr></tbody></table>" in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x onerror=alert(2)&gt;" in html
    assert "<script" not in html
    assert "<img" not in html


def test_docx_external_entity_is_never_resolved(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    doctype = '<!DOCTYPE w:document [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
    body = "<w:p><w:r><w:t>до &xxe; после</w:t></w:r></w:p>"
    entry_id = upload(api_client, workspace, project, "xxe.docx", docx_bytes(body, doctype=doctype))

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "docx"
    assert "root:" not in response.data["html"]
    assert "до" in response.data["html"]


def test_xlsx_preview_returns_values_only_within_200_by_50(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "Бюджет.xlsx", xlsx_bytes(205, 52))

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "xlsx"
    assert response.data["truncated"] is True
    sheet = response.data["sheets"][0]
    assert sheet["name"] == "Бюджет"
    assert len(sheet["rows"]) == 200
    assert {len(row) for row in sheet["rows"]} == {50}
    assert sheet["rows"][0][:3] == ["Статья", "1250", ""]
    assert sheet["rows"][199][49] == "R200C50"


def test_pptx_preview_follows_presentation_slide_order(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    payload = pptx_bytes([(2, "Введение", "Цель проекта"), (1, "Итоги", "Что сделано")])
    entry_id = upload(api_client, workspace, project, "Доклад.pptx", payload)

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "pptx"
    assert response.data["slides"] == [
        {"index": 1, "title": "Введение", "text": "Цель проекта"},
        {"index": 2, "title": "Итоги", "text": "Что сделано"},
    ]


def test_text_markdown_and_unsupported_kinds(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    settings.PPM_VAULT_PREVIEW_TEXT_MAX_BYTES = 64
    csv_id = upload(api_client, workspace, project, "data.csv", "имя;сумма\nАнна;10\n".encode("utf-8"))
    long_id = upload(api_client, workspace, project, "long.txt", b"x" * 200)
    legacy_id = upload(api_client, workspace, project, "legacy.txt", "Привет".encode("cp1251"))
    markdown = api_client.post(
        vault_url(workspace, project, "markdown/"),
        {"name": "README", "content": "# Заголовок"},
        format="json",
    )
    image_id = upload(api_client, workspace, project, "scheme.png", b"\x89PNG\r\n\x1a\n" + b"image")
    old_word_id = upload(api_client, workspace, project, "old.doc", b"\xd0\xcf\x11\xe0legacy")

    csv_preview = preview(api_client, workspace, project, csv_id)
    long_preview = preview(api_client, workspace, project, long_id)
    legacy_preview = preview(api_client, workspace, project, legacy_id)
    markdown_preview = preview(api_client, workspace, project, markdown.data["id"])
    image_preview = preview(api_client, workspace, project, image_id)
    old_word_preview = preview(api_client, workspace, project, old_word_id)

    assert csv_preview.data["kind"] == "text"
    assert csv_preview.data["text"] == "имя;сумма\nАнна;10\n"
    assert csv_preview.data["encoding"] == "utf-8"
    assert long_preview.data["truncated"] is True
    assert long_preview.data["text"] == "x" * 64
    assert legacy_preview.data["text"] == "Привет"
    assert legacy_preview.data["encoding"] == "windows-1251"
    assert markdown_preview.data["kind"] == "text"
    assert markdown_preview.data["text"] == "# Заголовок"
    assert image_preview.data == {**image_preview.data, "kind": "unsupported", "reason": "type"}
    assert old_word_preview.data["kind"] == "unsupported"
    assert old_word_preview.data["reason"] == "type"


def test_zip_bomb_and_hostile_archives_are_refused_without_500(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    bomb = zip_bytes({"word/document.xml": b"\x00" * (21 * 1024 * 1024)})
    assert len(bomb) < 64 * 1024
    bomb_id = upload(api_client, workspace, project, "bomb.docx", bomb)
    garbage_id = upload(api_client, workspace, project, "garbage.xlsx", b"not a zip archive")
    encrypted_id = upload(
        api_client, workspace, project, "secret.docx", b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 64
    )
    settings.PPM_VAULT_PREVIEW_ZIP_MAX_MEMBERS = 10
    crowded_id = upload(
        api_client,
        workspace,
        project,
        "crowded.pptx",
        zip_bytes({f"ppt/slides/slide{index}.xml": "<x/>" for index in range(20)}),
    )

    responses = {
        name: preview(api_client, workspace, project, entry_id)
        for name, entry_id in {
            "bomb": bomb_id,
            "garbage": garbage_id,
            "encrypted": encrypted_id,
            "crowded": crowded_id,
        }.items()
    }

    assert {name: response.status_code for name, response in responses.items()} == {
        "bomb": 200,
        "garbage": 200,
        "encrypted": 200,
        "crowded": 200,
    }
    assert {name: (response.data["kind"], response.data["reason"]) for name, response in responses.items()} == {
        "bomb": ("unsupported", "limits"),
        "garbage": ("unsupported", "invalid"),
        "encrypted": ("unsupported", "encrypted"),
        "crowded": ("unsupported", "limits"),
    }


def test_member_that_inflates_past_its_declared_size_is_rejected(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", b"<" * (256 * 1024))
        archive.filelist[0].file_size = 16
    entry_id = upload(api_client, workspace, project, "forged.docx", buffer.getvalue())

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "unsupported"
    assert response.data["reason"] == "invalid"


def test_exhausted_time_budget_returns_truncated_preview(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "Долгий.docx", docx_bytes(paragraph("Текст")))
    settings.PPM_VAULT_PREVIEW_TIME_BUDGET_MS = -1

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "docx"
    assert response.data["html"] == ""
    assert response.data["truncated"] is True


def test_source_over_preview_limit_is_not_read(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "big.txt", b"a" * 128)
    settings.PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES = 64

    with patch.object(vault_preview, "open_private_object") as opened:
        response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "unsupported"
    assert response.data["reason"] == "too_large"
    opened.assert_not_called()


def test_preview_is_cached_by_version_hash_and_refreshed_by_new_version(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "notes.txt", "первая версия".encode("utf-8"))

    with patch.object(vault_preview, "open_private_object", wraps=vault_preview.open_private_object) as opened:
        first = preview(api_client, workspace, project, entry_id)
        second = preview(api_client, workspace, project, entry_id)
        replaced = api_client.put(
            vault_url(workspace, project, f"entries/{entry_id}/file/"),
            {
                "base_version": "1",
                "file": SimpleUploadedFile("notes.txt", "вторая версия".encode("utf-8"), content_type="text/plain"),
            },
            format="multipart",
        )
        third = preview(api_client, workspace, project, entry_id)

    assert first.data["text"] == second.data["text"] == "первая версия"
    assert replaced.status_code == status.HTTP_200_OK
    assert third.data["version"] == 2
    assert third.data["text"] == "вторая версия"
    assert opened.call_count == 2


def test_preview_uses_vault_read_permissions(api_client, vault_project):
    owner, workspace, project = vault_project
    guest = make_user()
    outsider = make_user()
    WorkspaceMemberFactory(workspace=workspace, member=guest, role=5)
    ProjectMemberFactory(workspace=workspace, project=project, member=guest, role=5)
    WorkspaceMemberFactory(workspace=workspace, member=outsider, role=15)
    other_project = ProjectFactory(workspace=workspace, identifier="PRV2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=owner, role=20)
    api_client.force_authenticate(user=owner)
    entry_id = upload(api_client, workspace, project, "secret.txt", b"private text")
    trashed_id = upload(api_client, workspace, project, "trashed.txt", b"gone")
    api_client.delete(vault_url(workspace, project, f"entries/{trashed_id}/"))

    foreign = api_client.get(vault_url(workspace, other_project, f"entries/{entry_id}/preview/"))
    trashed = preview(api_client, workspace, project, trashed_id)
    api_client.force_authenticate(user=guest)
    guest_response = preview(api_client, workspace, project, entry_id)
    api_client.force_authenticate(user=outsider)
    outsider_response = preview(api_client, workspace, project, entry_id)
    api_client.force_authenticate(user=None)
    anonymous = preview(api_client, workspace, project, entry_id)

    assert foreign.status_code == status.HTTP_404_NOT_FOUND
    assert foreign.data["error"]["code"] == "VAULT_ENTRY_NOT_FOUND"
    assert trashed.status_code == status.HTTP_404_NOT_FOUND
    assert guest_response.status_code == status.HTTP_200_OK
    assert guest_response.data["text"] == "private text"
    assert outsider_response.status_code == status.HTTP_403_FORBIDDEN
    assert outsider_response.data["error"]["code"] == "VAULT_PERMISSION_DENIED"
    assert "private text" not in str(outsider_response.data)
    assert anonymous.status_code == status.HTTP_401_UNAUTHORIZED
```

- [ ] **S1.3 Тест красный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_preview_api.py`
  Ожидается ошибка сбора: `ERROR plane/tests/contract/ppm_vault/test_vault_preview_api.py` с
  `ModuleNotFoundError: No module named 'plane.ppm_vault.preview'`, итог `1 error`.

- [ ] **S1.4 Создать `apps/api/plane/ppm_vault/formats.py`:**

```python
"""File-format vocabulary shared by Vault upload validation and server previews (AF2.1)."""

# Office Open XML formats whose preview is built on the server from the archive content.
OFFICE_PREVIEW_EXTENSIONS = frozenset({"docx", "xlsx", "pptx"})

# Source code and configuration stored as plain UTF-8 text. Browser-active markup
# (html, htm, xhtml, xml, svg) is deliberately absent: it is never accepted as "code".
CODE_TEXT_EXTENSIONS = frozenset(
    {
        "bash",
        "c",
        "cc",
        "cfg",
        "cjs",
        "cpp",
        "cs",
        "css",
        "cxx",
        "dart",
        "go",
        "gql",
        "graphql",
        "h",
        "hpp",
        "ini",
        "java",
        "jl",
        "js",
        "jsx",
        "kt",
        "kts",
        "less",
        "log",
        "lua",
        "mjs",
        "php",
        "proto",
        "ps1",
        "py",
        "r",
        "rb",
        "rs",
        "scala",
        "scss",
        "sh",
        "sql",
        "swift",
        "tex",
        "toml",
        "ts",
        "tsv",
        "tsx",
        "yaml",
        "yml",
        "zsh",
    }
)

# Extensions whose preview is the (size-capped) text itself.
TEXT_PREVIEW_EXTENSIONS = frozenset({"csv", "json", "md", "txt"}) | CODE_TEXT_EXTENSIONS
```

- [ ] **S1.5 Создать `apps/api/plane/ppm_vault/preview.py`:**

```python
"""Server-built previews of Vault files for the Canvas and the Vault UI (AF2.1).

Security model: nothing in a document is executed. Office Open XML parts are read
with zipfile + lxml (entities not resolved, no network, no DTD) and openpyxl in
read-only/data-only mode (formulas are never evaluated, VBA is never loaded).
Archive limits are checked on the central directory before any part is
decompressed, zipfile itself refuses to inflate a member past its declared size,
and every loop runs under an output and time budget. docx HTML is assembled from
escaped text and passed through nh3 with a tag allowlist and no attributes.
"""

import codecs
import datetime
import hashlib
import html
import io
import logging
import posixpath
import time
import warnings
import zipfile

import nh3
from django.conf import settings
from django.core.cache import cache
from lxml import etree

from .formats import OFFICE_PREVIEW_EXTENSIONS, TEXT_PREVIEW_EXTENSIONS
from .models import PpmVaultEntryKind
from .storage import open_private_object


logger = logging.getLogger("plane.api")

PREVIEW_SCHEMA_VERSION = 1
CACHE_PREFIX = "ppm:vault-preview:"

XLSX_MAX_SHEETS = 5
XLSX_MAX_ROWS = 200
XLSX_MAX_COLS = 50
CELL_MAX_CHARS = 300
PPTX_MAX_SLIDES = 200
SLIDE_TITLE_MAX_CHARS = 300
SLIDE_TEXT_MAX_CHARS = 4000
DOCX_MAX_BLOCKS = 3000
DOCX_TABLE_MAX_ROWS = 200
DOCX_TABLE_MAX_COLS = 50
OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
ALLOWED_HTML_TAGS = {"p", "h1", "h2", "h3", "h4", "ul", "li", "br", "table", "tbody", "tr", "td"}

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"


def _q(namespace, tag):
    return f"{{{namespace}}}{tag}"


W_BODY, W_P, W_PPR, W_PSTYLE, W_NUMPR, W_VAL = (
    _q(W, "body"),
    _q(W, "p"),
    _q(W, "pPr"),
    _q(W, "pStyle"),
    _q(W, "numPr"),
    _q(W, "val"),
)
W_T, W_TAB, W_BR, W_CR, W_NBH = _q(W, "t"), _q(W, "tab"), _q(W, "br"), _q(W, "cr"), _q(W, "noBreakHyphen")
W_TBL, W_TR, W_TC = _q(W, "tbl"), _q(W, "tr"), _q(W, "tc")
W_CONTAINERS = {_q(W, "sdt"), _q(W, "sdtContent"), _q(W, "customXml")}
W_SKIPPED = {_q(W, "del"), _q(W, "moveFrom"), _q(W, "delText"), _q(W, "instrText"), _q(MC, "Fallback")}
A_P, A_T, A_BR, A_TC = _q(A, "p"), _q(A, "t"), _q(A, "br"), _q(A, "tc")


class PreviewRejected(Exception):
    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)


class PreviewStorageUnavailable(Exception):
    pass


def _limit(name, default):
    return int(getattr(settings, name, default))


def preview_limits():
    return {
        "source_max_bytes": _limit("PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES", 16 * 1024 * 1024),
        "zip_max_members": _limit("PPM_VAULT_PREVIEW_ZIP_MAX_MEMBERS", 2000),
        "zip_max_uncompressed_bytes": _limit("PPM_VAULT_PREVIEW_ZIP_MAX_UNCOMPRESSED_BYTES", 20 * 1024 * 1024),
        "zip_max_ratio": _limit("PPM_VAULT_PREVIEW_ZIP_MAX_RATIO", 200),
        "text_max_bytes": _limit("PPM_VAULT_PREVIEW_TEXT_MAX_BYTES", 256 * 1024),
        "output_max_chars": _limit("PPM_VAULT_PREVIEW_MAX_OUTPUT_CHARS", 400_000),
        "time_budget_ms": _limit("PPM_VAULT_PREVIEW_TIME_BUDGET_MS", 5000),
        "cache_seconds": _limit("PPM_VAULT_PREVIEW_CACHE_SECONDS", 86_400),
    }


class _Budget:
    """Caps total output characters and wall time; hitting a cap marks the preview truncated."""

    def __init__(self, limits):
        self.deadline = time.monotonic() + limits["time_budget_ms"] / 1000
        self.chars_left = limits["output_max_chars"]
        self.truncated = False

    def expired(self):
        if time.monotonic() > self.deadline:
            self.truncated = True
            return True
        return False

    def take(self, text, max_chars=None):
        if max_chars is not None and len(text) > max_chars:
            text = text[:max_chars]
            self.truncated = True
        if self.chars_left <= 0:
            self.truncated = True
            return None
        if len(text) > self.chars_left:
            text = text[: self.chars_left]
            self.truncated = True
        self.chars_left -= len(text)
        return text


def _unsupported(reason):
    return {"kind": "unsupported", "reason": reason, "truncated": False}


def build_entry_preview(entry):
    """Return the preview payload of the entry's current version (cached by content hash)."""
    version = entry.current_version
    if version is None:
        return {"entry_id": str(entry.id), "version": 0, "content_hash": "", "extension": "", **_unsupported("type")}
    limits = preview_limits()
    key = _cache_key(entry=entry, version=version, limits=limits)
    payload = _cache_get(key)
    if payload is None:
        payload = _compute_preview(entry=entry, version=version, limits=limits)
        _cache_set(key, payload, limits["cache_seconds"])
    return {
        "entry_id": str(entry.id),
        "version": version.version,
        "content_hash": version.content_hash or "",
        "extension": entry.extension or "",
        **payload,
    }


def _cache_key(*, entry, version, limits):
    fingerprint = "|".join(
        [
            str(PREVIEW_SCHEMA_VERSION),
            entry.kind,
            (entry.extension or "").casefold(),
            version.content_hash or f"version:{version.id}",
            ",".join(f"{name}={limits[name]}" for name in sorted(limits) if name != "cache_seconds"),
        ]
    )
    return CACHE_PREFIX + hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()


def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:  # noqa: BLE001 - a cache outage must degrade to recomputation, not a 500
        logger.warning("PPM vault preview cache read failed")
        return None


def _cache_set(key, payload, timeout):
    try:
        cache.set(key, payload, timeout)
    except Exception:  # noqa: BLE001
        logger.warning("PPM vault preview cache write failed")


def _preview_format(entry):
    extension = (entry.extension or "").casefold()
    if entry.kind == PpmVaultEntryKind.MARKDOWN:
        return "markdown"
    if entry.kind != PpmVaultEntryKind.FILE:
        return None
    if extension in OFFICE_PREVIEW_EXTENSIONS:
        return extension
    if extension in TEXT_PREVIEW_EXTENSIONS:
        return "text"
    return None


def _compute_preview(*, entry, version, limits):
    preview_format = _preview_format(entry)
    if preview_format is None:
        return _unsupported("type")
    if preview_format == "markdown":
        return _text_payload((version.content_text or "").encode("utf-8"), limits)
    if int(version.size_bytes or 0) > limits["source_max_bytes"]:
        return _unsupported("too_large")
    raw = _read_object(version.object_key, limits["source_max_bytes"])
    if raw is None:
        return _unsupported("too_large")
    try:
        if preview_format == "text":
            return _text_payload(raw, limits)
        if raw.startswith(OLE_SIGNATURE):
            raise PreviewRejected("encrypted")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            if preview_format == "docx":
                return _docx_payload(raw, limits)
            if preview_format == "xlsx":
                return _xlsx_payload(raw, limits)
            return _pptx_payload(raw, limits)
    except PreviewRejected as rejected:
        return _unsupported(rejected.reason)
    except Exception as exc:  # noqa: BLE001 - malformed third-party documents must not become 500s
        logger.info(
            "PPM vault preview could not parse a document",
            extra={"entry_id": str(entry.id), "error": type(exc).__name__},
        )
        return _unsupported("invalid")


def _read_object(object_key, max_bytes):
    try:
        file_obj = open_private_object(object_key)
    except (OSError, ValueError) as exc:
        raise PreviewStorageUnavailable() from exc
    if file_obj is None:
        raise PreviewStorageUnavailable()
    try:
        data = file_obj.read(max_bytes + 1)
    except OSError as exc:
        raise PreviewStorageUnavailable() from exc
    finally:
        file_obj.close()
    return None if len(data) > max_bytes else data


def _text_payload(raw, limits):
    cap = limits["text_max_bytes"]
    truncated = len(raw) > cap
    chunk = raw[:cap]
    if b"\x00" in chunk:
        return _unsupported("binary")
    try:
        text = codecs.getincrementaldecoder("utf-8-sig")("strict").decode(chunk, final=not truncated)
        encoding = "utf-8"
    except UnicodeDecodeError:
        text = chunk.decode("cp1251", errors="replace")
        encoding = "windows-1251"
    return {"kind": "text", "text": text, "encoding": encoding, "truncated": truncated}


def _open_archive(raw, limits):
    try:
        archive = zipfile.ZipFile(io.BytesIO(raw))
    except (zipfile.BadZipFile, zipfile.LargeZipFile, ValueError, OSError) as exc:
        raise PreviewRejected("invalid") from exc
    try:
        members = archive.infolist()
        if len(members) > limits["zip_max_members"]:
            raise PreviewRejected("limits")
        total = 0
        for member in members:
            if member.flag_bits & 0x1:
                raise PreviewRejected("encrypted")
            total += member.file_size
            if total > limits["zip_max_uncompressed_bytes"]:
                raise PreviewRejected("limits")
            if member.file_size > 1024 * 1024 and member.file_size > member.compress_size * limits["zip_max_ratio"]:
                raise PreviewRejected("limits")
    except PreviewRejected:
        archive.close()
        raise
    return archive


def _read_member(archive, name, limits, *, required=True):
    try:
        member = archive.getinfo(name)
    except KeyError:
        if required:
            raise PreviewRejected("invalid")
        return None
    cap = limits["zip_max_uncompressed_bytes"]
    with archive.open(member) as handle:
        data = handle.read(cap + 1)
    if len(data) > cap:
        raise PreviewRejected("limits")
    return data


def _xml(data):
    parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        load_dtd=False,
        dtd_validation=False,
        huge_tree=False,
        remove_comments=True,
        remove_pis=True,
    )
    try:
        return etree.fromstring(data, parser)
    except etree.XMLSyntaxError as exc:
        raise PreviewRejected("invalid") from exc


def _sanitize(markup):
    return nh3.clean(markup, tags=ALLOWED_HTML_TAGS, attributes={"*": set()}, url_schemes=set())


def _escape(text):
    return html.escape(text).replace("\n", "<br>")


# --- docx -------------------------------------------------------------------------------------


def _heading_level(style_name):
    name = " ".join((style_name or "").split()).casefold()
    if name == "title":
        return 1
    if name == "subtitle":
        return 2
    compact = name.replace(" ", "")
    if compact.startswith("heading") and compact[len("heading") :].isdigit():
        return max(1, min(int(compact[len("heading") :]), 4))
    return 0


def _docx_heading_styles(archive, limits):
    data = _read_member(archive, "word/styles.xml", limits, required=False)
    if not data:
        return {}
    levels = {}
    for style in _xml(data).iter(_q(W, "style")):
        style_id = style.get(_q(W, "styleId"))
        name = style.find(_q(W, "name"))
        level = _heading_level(name.get(W_VAL) if name is not None else "")
        if style_id and level:
            levels[style_id] = level
    return levels


def _run_texts(element, out):
    for child in element:
        tag = child.tag
        if not isinstance(tag, str) or tag in W_SKIPPED:
            continue
        if tag == W_T:
            out.append(child.text or "")
        elif tag == W_TAB:
            out.append("\t")
        elif tag in (W_BR, W_CR):
            out.append("\n")
        elif tag == W_NBH:
            out.append("-")
        else:
            _run_texts(child, out)


def _paragraph_text(paragraph):
    out = []
    _run_texts(paragraph, out)
    return "".join(out).strip()


def _docx_blocks(container):
    for child in container:
        if child.tag in (W_P, W_TBL):
            yield child
        elif child.tag in W_CONTAINERS:
            yield from _docx_blocks(child)


def _nested_texts(element):
    texts = []
    for child in element:
        if child.tag == W_P:
            text = _paragraph_text(child)
            if text:
                texts.append(text)
        elif child.tag in (W_TBL, W_TR, W_TC) or child.tag in W_CONTAINERS:
            texts.extend(_nested_texts(child))
    return texts


def _docx_table(table, budget):
    rows = [child for child in table if child.tag == W_TR]
    if len(rows) > DOCX_TABLE_MAX_ROWS:
        budget.truncated = True
    rows_html = []
    for row in rows[:DOCX_TABLE_MAX_ROWS]:
        cells = [child for child in row if child.tag == W_TC]
        if len(cells) > DOCX_TABLE_MAX_COLS:
            budget.truncated = True
        cells_html = []
        for cell in cells[:DOCX_TABLE_MAX_COLS]:
            text = budget.take("\n".join(_nested_texts(cell)), CELL_MAX_CHARS)
            if text is None:
                break
            cells_html.append(f"<td>{_escape(text)}</td>")
        if cells_html:
            rows_html.append(f"<tr>{''.join(cells_html)}</tr>")
        if budget.chars_left <= 0:
            break
    return f"<table><tbody>{''.join(rows_html)}</tbody></table>" if rows_html else ""


def _docx_payload(raw, limits):
    budget = _Budget(limits)
    with _open_archive(raw, limits) as archive:
        document = _read_member(archive, "word/document.xml", limits)
        heading_styles = _docx_heading_styles(archive, limits)
    body = _xml(document).find(W_BODY)
    if body is None:
        raise PreviewRejected("invalid")
    parts = []
    list_open = False
    for index, block in enumerate(_docx_blocks(body)):
        if index >= DOCX_MAX_BLOCKS or budget.expired():
            budget.truncated = True
            break
        if block.tag == W_TBL:
            if list_open:
                parts.append("</ul>")
                list_open = False
            parts.append(_docx_table(block, budget))
            continue
        text = _paragraph_text(block)
        if not text:
            continue
        text = budget.take(text)
        if text is None:
            break
        level = 0
        is_list_item = False
        properties = block.find(W_PPR)
        if properties is not None:
            style = properties.find(W_PSTYLE)
            if style is not None:
                style_id = style.get(W_VAL) or ""
                level = heading_styles.get(style_id) or _heading_level(style_id)
            is_list_item = properties.find(W_NUMPR) is not None
        if is_list_item and not level:
            if not list_open:
                parts.append("<ul>")
                list_open = True
            parts.append(f"<li>{_escape(text)}</li>")
            continue
        if list_open:
            parts.append("</ul>")
            list_open = False
        tag = f"h{level}" if level else "p"
        parts.append(f"<{tag}>{_escape(text)}</{tag}>")
    if list_open:
        parts.append("</ul>")
    return {"kind": "docx", "html": _sanitize("".join(parts)), "truncated": budget.truncated}


# --- xlsx -------------------------------------------------------------------------------------


def _cell_text(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() and abs(value) < 1e15 else f"{value:.15g}"
    if isinstance(value, datetime.datetime):
        if value.time() == datetime.time(0, 0):
            return value.date().isoformat()
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, (datetime.date, datetime.time)):
        return value.isoformat()
    return str(value)


def _rectangular_rows(rows):
    while rows and not any(rows[-1]):
        rows.pop()
    width = 0
    for row in rows:
        for index, cell in enumerate(row):
            if cell:
                width = max(width, index + 1)
    return [(row + [""] * width)[:width] for row in rows]


def _xlsx_payload(raw, limits):
    from openpyxl import load_workbook

    budget = _Budget(limits)
    _open_archive(raw, limits).close()
    workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True, keep_links=False)
    try:
        visible = [sheet for sheet in workbook.worksheets if getattr(sheet, "sheet_state", "visible") == "visible"]
        worksheets = visible or workbook.worksheets[:1]
        if len(worksheets) > XLSX_MAX_SHEETS:
            budget.truncated = True
        sheets = []
        for worksheet in worksheets[:XLSX_MAX_SHEETS]:
            rows = []
            for row_index, row in enumerate(
                worksheet.iter_rows(
                    min_row=1,
                    max_row=XLSX_MAX_ROWS + 1,
                    max_col=XLSX_MAX_COLS + 1,
                    values_only=True,
                )
            ):
                if row_index >= XLSX_MAX_ROWS:
                    if any(value is not None for value in row):
                        budget.truncated = True
                    break
                if any(value is not None for value in row[XLSX_MAX_COLS:]):
                    budget.truncated = True
                cells = []
                for value in row[:XLSX_MAX_COLS]:
                    text = budget.take(_cell_text(value), CELL_MAX_CHARS)
                    if text is None:
                        break
                    cells.append(text)
                rows.append(cells)
                if budget.chars_left <= 0 or budget.expired():
                    break
            sheets.append({"name": worksheet.title, "rows": _rectangular_rows(rows)})
            if budget.chars_left <= 0 or budget.expired():
                break
    finally:
        workbook.close()
    return {"kind": "xlsx", "sheets": sheets, "truncated": budget.truncated}


# --- pptx -------------------------------------------------------------------------------------


def _part_name(base, target):
    target = (target or "").strip()
    if not target:
        return None
    name = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(base, target))
    return None if name.startswith("..") else name


def _drawing_paragraph(paragraph):
    return "".join("\n" if node.tag == A_BR else (node.text or "") for node in paragraph.iter(A_T, A_BR)).strip()


def _slide_text(slide):
    title_parts = []
    body_parts = []
    for shape in slide.iter(_q(P, "sp"), _q(P, "graphicFrame")):
        if shape.tag == _q(P, "graphicFrame"):
            for cell in shape.iter(A_TC):
                text = " ".join(filter(None, (_drawing_paragraph(p) for p in cell.iter(A_P))))
                if text:
                    body_parts.append(text)
            continue
        placeholder = shape.find(f"{_q(P, 'nvSpPr')}/{_q(P, 'nvPr')}/{_q(P, 'ph')}")
        is_title = placeholder is not None and placeholder.get("type") in {"title", "ctrTitle"}
        text_body = shape.find(_q(P, "txBody"))
        if text_body is None:
            continue
        paragraphs = [text for text in (_drawing_paragraph(p) for p in text_body.iter(A_P)) if text]
        (title_parts if is_title else body_parts).extend(paragraphs)
    return " ".join(title_parts), "\n".join(body_parts)


def _pptx_payload(raw, limits):
    budget = _Budget(limits)
    slides = []
    with _open_archive(raw, limits) as archive:
        presentation = _xml(_read_member(archive, "ppt/presentation.xml", limits))
        relationships = _xml(_read_member(archive, "ppt/_rels/presentation.xml.rels", limits))
        targets = {}
        for relationship in relationships.iter(_q(PKG_REL, "Relationship")):
            if relationship.get("TargetMode") == "External" or not relationship.get("Type", "").endswith("/slide"):
                continue
            part = _part_name("ppt", relationship.get("Target"))
            if part:
                targets[relationship.get("Id")] = part
        order = [slide_id.get(_q(R, "id")) for slide_id in presentation.iter(_q(P, "sldId"))]
        if len(order) > PPTX_MAX_SLIDES:
            budget.truncated = True
        for index, relationship_id in enumerate(order[:PPTX_MAX_SLIDES], start=1):
            if budget.expired():
                break
            part = targets.get(relationship_id)
            data = _read_member(archive, part, limits, required=False) if part else None
            if data is None:
                continue
            title, text = _slide_text(_xml(data))
            title = budget.take(title, SLIDE_TITLE_MAX_CHARS)
            text = budget.take(text, SLIDE_TEXT_MAX_CHARS) if title is not None else None
            if title is None or text is None:
                break
            slides.append({"index": index, "title": title, "text": text})
    return {"kind": "pptx", "slides": slides, "truncated": budget.truncated}
```

- [ ] **S1.6 `apps/api/plane/ppm_vault/views.py` — импорт.** Было (строки 36–37):

```python
from .links import entry_path, serialize_link
from .storage import open_private_object, private_object_url
```

Стало:

```python
from .links import entry_path, serialize_link
from .preview import PreviewStorageUnavailable, build_entry_preview
from .storage import open_private_object, private_object_url
```

- [ ] **S1.7 `views.py` — новый view.** Было (строки 367–370):

```python
        return Response(serialize_entry(entry))


class PpmVaultBacklinksView(PpmVaultAPIView):
```

Стало:

```python
        return Response(serialize_entry(entry))


class PpmVaultFilePreviewView(PpmVaultAPIView):
    def get(self, request, workspace_id, project_id, entry_id):
        _, vault, denied = self.require_access(request, workspace_id, project_id)
        if denied:
            return denied
        entry = self.get_entry(vault=vault, entry_id=entry_id)
        if entry.kind == PpmVaultEntryKind.FOLDER:
            raise PpmVaultConflict(code="VAULT_INVALID_FILE_TYPE", message="У папки нет предпросмотра.")
        try:
            payload = build_entry_preview(entry)
        except PreviewStorageUnavailable as exc:
            raise PpmVaultConflict(code="VAULT_STORAGE_FAILED", message="Файл временно недоступен.") from exc
        response = Response(payload)
        response["Cache-Control"] = "private, no-store"
        return response


class PpmVaultBacklinksView(PpmVaultAPIView):
```

(`PpmVaultEntryKind` и `PpmVaultConflict` уже импортированы в `views.py:12-34`; `VAULT_STORAGE_FAILED` уже
отображается в 503 функцией `error_status`, `views.py:84-85`.)

- [ ] **S1.8 `apps/api/plane/ppm_vault/urls.py`.** Было (строки 8–9):

```python
    PpmVaultFileContentView,
    PpmVaultFileUploadView,
```

Стало:

```python
    PpmVaultFileContentView,
    PpmVaultFilePreviewView,
    PpmVaultFileUploadView,
```

Было (строки 92–97):

```python
    path(
        f"{PROJECT}entries/<uuid:entry_id>/file/",
        PpmVaultFileContentView.as_view(),
        name="ppm-vault-file-content",
    ),
]
```

Стало:

```python
    path(
        f"{PROJECT}entries/<uuid:entry_id>/file/",
        PpmVaultFileContentView.as_view(),
        name="ppm-vault-file-content",
    ),
    path(
        f"{PROJECT}entries/<uuid:entry_id>/preview/",
        PpmVaultFilePreviewView.as_view(),
        name="ppm-vault-file-preview",
    ),
]
```

- [ ] **S1.9 Тест зелёный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_preview_api.py` → `11 passed`.
- [ ] **S1.10 Регрессия.** `PYTEST plane/tests/contract/ppm_vault plane/tests/contract/ppm_canvas` → `129 passed`
  (ppm_vault 19 + 11, ppm_canvas 99).
- [ ] **S1.11 Линт.** `RUFF plane/ppm_vault/formats.py plane/ppm_vault/preview.py plane/ppm_vault/views.py plane/ppm_vault/urls.py plane/tests/contract/ppm_vault/test_vault_preview_api.py`
  → `All checks passed!`, `5 files already formatted`.
- [ ] **S1.12 Дымовая проверка маршрута на dev-API** (без авторизации, данные не читаются):

```bash
curl -s http://localhost:8000/api/ppm/v1/workspaces/00000000-0000-0000-0000-000000000000/projects/00000000-0000-0000-0000-000000000000/vault/entries/00000000-0000-0000-0000-000000000000/preview/
```

  До S1 — `404`. После — `{"error":{"code":"AUTHENTICATION_REQUIRED","message":"Требуется авторизация.",…}}` (HTTP 401).
  Если сразу после сохранения всё ещё 404 — подождать 2–3 с (перезагрузка uvicorn) и повторить.

**Приёмка S1**
- [ ] Маршрут `…/vault/entries/<id>/preview/` отвечает по контракту для docx/xlsx/pptx/text/unsupported.
- [ ] docx: заголовки по стилям (`styles.xml` → «heading N»/«Title»), списки `<ul><li>`, таблицы; HTML только из
  разрешённых тегов без атрибутов; `<script>`/`<img>` из текста документа приходят экранированными.
- [ ] XXE: внешняя сущность не раскрывается (тест `test_docx_external_entity_is_never_resolved`).
- [ ] xlsx: ≤ 200 × 50, только значения, `truncated: true` при обрезке; pptx: порядок из `p:sldIdLst`.
- [ ] Zip-бомба (21 МиБ нулей в ~21 КиБ), «лишние» элементы, мусор вместо zip, OLE-контейнер, элемент, распаковывающийся
  больше заявленного, — `200` с `unsupported` и нужной причиной, без 500.
- [ ] Исходник больше лимита не читается (`open_private_object` не вызывается); исчерпанный бюджет времени → `truncated`.
- [ ] Кеш: повторный запрос не читает хранилище; новая версия файла пересчитывается.
- [ ] Права как у `/file/`: гость — 200, не участник проекта — 403, аноним — 401, чужой проект и корзина — 404.
- [ ] Регрессия `129 passed`, `ruff` чистый, пред-образы сохранены.

---

### Task 15 (S2): поиск документов для Холста (≈30 мин)

**Файлы**
- Изменить: `apps/api/plane/ppm_canvas/services.py` — импорт в строке 9; две новые функции между концом
  `serialize_missing_work_item` (строки 597–622) и `def _content_source_url` (строка 625).
- Изменить: `apps/api/plane/ppm_canvas/serializers.py` — `PpmProjectionSearchSerializer.validate_types` (строки 150–154).
- Изменить: `apps/api/plane/ppm_canvas/views.py` — импорты (строки 78–79 и 83–84); ветка `types=page` в
  `PpmProjectionSearchView.get` (строки 784–805) сразу после проверки сериализатора (строки 789–791).
- Создать тест: `apps/api/plane/tests/contract/ppm_canvas/test_page_search_api.py`.

**Интерфейс (контракт для B — совпадает с тем, что уже заложено в plan-B, Task B3)**

`GET /api/ppm/v1/workspaces/<workspace_id:uuid>/projects/<project_id:uuid>/projections/search/?types=page&q=&limit=&cursor=`

- Существующий маршрут поиска Холста (`ppm_canvas/urls.py:123-127`) получает второй тип: `types=page`. Без `types` и при
  `types=work_item` — прежнее поведение (поиск задач). Смешивать типы нельзя (`types=page,work_item` → 400).
- `q` ≤ 160 символов (пусто — все видимые), ищется в названии и тексте (`name`/`description_stripped`, без учёта регистра;
  кириллица проверена тестом на PostgreSQL 15.7-alpine); `limit` 1–50 (по умолчанию 20); `cursor` — смещение.
- Порядок: при `q` — сначала совпадения в названии, затем `-updated_at, -id`; без `q` — `-updated_at, -id`.
- Элемент результата — **та же проекция содержимого**, что возвращает привязка (`serialize_content_source`,
  `ppm_canvas/services.py:697-771`; клиентская схема `ppmCanvasContentProjectionSchema`,
  `packages/ppm-canvas/src/index.ts:722-745`, не strict — лишние ключи допустимы) **плюс блок `page`**:

```jsonc
{
  "results": [
    {
      "identity": { "entity_type": "page", "entity_id": "uuid", "workspace_id": "uuid", "project_id": "uuid",
                    "source_url": "/<workspace_slug>/projects/<project_id>/pages/<page_id>" },
      "display": { "title": "Регламент планёрки", "excerpt": "Каждый вторник", "extension": ".page",
                   "mime_type": "text/html", "size_bytes": 27, "preview_url": null, "source_status": "active" },
      "capabilities": { "read": true, "update": true, "delete_source": false },
      "source_version": "2026-09-25T12:00:00.123456+00:00",
      "page": {
        "updated_at": "2026-09-25T12:00:00.123456+00:00",
        "owned_by": { "id": "uuid", "display_name": "Борис" },
        "access": "public"            // "private" бывает только у собственных документов пользователя
      }
    }
  ],
  "next_cursor": "20"                 // или null
}
```

  Поля из постановки: id → `identity.entity_id`, название → `display.title` («Без названия», если пусто), фрагмент →
  `display.excerpt` (≤ 500 символов, как у карточки документа), дата → `page.updated_at`, автор → `page.owned_by.display_name`.
- Ошибки: `400 PROJECTION_SEARCH_INVALID` (`details` — ошибки полей), `401 AUTHENTICATION_REQUIRED`,
  `403 CANVAS_PERMISSION_DENIED`, `404 PROJECT_NOT_FOUND`.
- Вставка найденного документа на доску — существующим `POST …/canvas/boards/<board_id>/bindings/` с
  `entity_type: "page"` (`create_content_binding`), который повторно проверяет приватность в `get_content_source`
  (`ppm_canvas/services.py:639-657`).

**Правила видимости** (как `ProjectPagePermission`, `apps/api/plane/app/permissions/page.py:42-67`, и
`get_content_source(PAGE)`): активная связь `ProjectPage` именно с этим проектом (`deleted_at IS NULL`), документ не удалён
мягко (`Page.objects`), не в архиве (`archived_at IS NULL`), и `access = public` **или** `owned_by = пользователь`. Доступ к
проекту — `require_project_access` Холста (участник любой роли, включая гостя: Plane разрешает гостям GET публичных
документов, `page.py:113-117`). Чужие приватные документы не видны никому, включая глобального администратора (как в Plane:
`_has_private_page_action_access` → `False`, `page.py:97-102`).

**Почему расширение `projections/search/`, а не отдельный маршрут:** CONTRACTS §5 называет этот вариант первым, plan-B
(Task B3, `searchPages`) уже вызывает `…/projections/search/` с `types: "page"` и разбирает ответ схемой проекций
содержимого, а при несовпадении схемы молча уходит на запасной путь (список Plane с фильтром на клиенте). Совпадение
контракта убирает этот скрытый обход. Существующий поиск задач не меняется (регрессия `test_projection_api.py` — 20 тестов).

- [ ] **S2.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
  apps/api/plane/ppm_canvas/services.py apps/api/plane/ppm_canvas/serializers.py \
  apps/api/plane/ppm_canvas/views.py apps/api/plane/tests/contract/ppm_canvas/test_page_search_api.py
```

- [ ] **S2.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_canvas/test_page_search_api.py`:

```python
import uuid

import pytest
from django.utils import timezone
from rest_framework import status

from plane.db.models import Page, ProjectPage
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]


def make_user(display_name=""):
    marker = uuid.uuid4().hex
    user = UserFactory(username=f"pages-{marker}", email=f"pages-{marker}@plane.test")
    if display_name:
        user.display_name = display_name
        user.save(update_fields=["display_name"])
    return user


@pytest.fixture
def pages_project():
    owner = make_user("Анна")
    colleague = make_user("Борис")
    workspace = WorkspaceFactory(owner=owner)
    project = ProjectFactory(workspace=workspace, identifier="PGS")
    for member in (owner, colleague):
        WorkspaceMemberFactory(workspace=workspace, member=member, role=15)
        ProjectMemberFactory(workspace=workspace, project=project, member=member, role=15)
    return owner, colleague, workspace, project


def make_page(workspace, project, owner, name, *, access=Page.PUBLIC_ACCESS, html="<p>Текст</p>"):
    page = Page.objects.create(
        workspace=workspace,
        name=name,
        description_html=html,
        owned_by=owner,
        access=access,
    )
    ProjectPage.objects.create(workspace=workspace, project=project, page=page)
    return page


def search_pages(api_client, workspace, project, **params):
    return api_client.get(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/projections/search/",
        {"types": "page", **params},
    )


def result_ids(response):
    return [item["identity"]["entity_id"] for item in response.data["results"]]


def test_page_search_returns_only_pages_visible_to_the_user(api_client, pages_project):
    owner, colleague, workspace, project = pages_project
    public = make_page(workspace, project, colleague, "Регламент планёрки", html="<p>Каждый вторник</p>")
    own_private = make_page(workspace, project, owner, "Мои заметки", access=Page.PRIVATE_ACCESS)
    foreign_private = make_page(workspace, project, colleague, "Личное Бориса", access=Page.PRIVATE_ACCESS)
    archived = make_page(workspace, project, owner, "Старый план")
    archived.archived_at = timezone.now().date()
    archived.save(update_fields=["archived_at"])
    deleted = make_page(workspace, project, owner, "Удалённый")
    deleted.deleted_at = timezone.now()
    deleted.save(update_fields=["deleted_at"])
    unlinked = make_page(workspace, project, owner, "Отвязанный")
    ProjectPage.objects.filter(page=unlinked).delete()
    other_project = ProjectFactory(workspace=workspace, identifier="PGS2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=owner, role=15)
    elsewhere = make_page(workspace, other_project, owner, "Чужой проект")
    api_client.force_authenticate(user=owner)

    response = search_pages(api_client, workspace, project)

    assert response.status_code == status.HTTP_200_OK
    assert set(result_ids(response)) == {str(public.id), str(own_private.id)}
    for hidden in (foreign_private, archived, deleted, unlinked, elsewhere):
        assert str(hidden.id) not in result_ids(response)
    item = next(result for result in response.data["results"] if result["identity"]["entity_id"] == str(public.id))
    assert item["identity"] == {
        "entity_type": "page",
        "entity_id": str(public.id),
        "workspace_id": str(workspace.id),
        "project_id": str(project.id),
        "source_url": f"/{workspace.slug}/projects/{project.id}/pages/{public.id}",
    }
    assert item["display"]["title"] == "Регламент планёрки"
    assert item["display"]["excerpt"] == "Каждый вторник"
    assert item["display"]["source_status"] == "active"
    assert item["source_version"] == public.updated_at.isoformat()
    assert item["page"] == {
        "updated_at": public.updated_at.isoformat(),
        "owned_by": {"id": str(colleague.id), "display_name": "Борис"},
        "access": "public",
    }
    assert "Личное Бориса" not in str(response.data)


def test_page_search_filters_ranks_by_title_and_paginates(api_client, pages_project):
    owner, _, workspace, project = pages_project
    body_match = make_page(workspace, project, owner, "Протокол", html="<p>Итог: карта проекта готова</p>")
    title_match = make_page(workspace, project, owner, "Карта проекта")
    make_page(workspace, project, owner, "Бюджет")
    api_client.force_authenticate(user=owner)

    first = search_pages(api_client, workspace, project, q="карта", limit=1)
    second = search_pages(api_client, workspace, project, q="карта", limit=1, cursor=first.data["next_cursor"])
    mixed = api_client.get(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/projections/search/",
        {"types": "page,work_item"},
    )
    too_many = search_pages(api_client, workspace, project, limit=500)

    assert result_ids(first) == [str(title_match.id)]
    assert first.data["next_cursor"] == "1"
    assert result_ids(second) == [str(body_match.id)]
    assert second.data["next_cursor"] is None
    assert mixed.status_code == status.HTTP_400_BAD_REQUEST
    assert mixed.data["error"]["code"] == "PROJECTION_SEARCH_INVALID"
    assert too_many.status_code == status.HTTP_400_BAD_REQUEST


def test_page_search_requires_project_membership(api_client, pages_project):
    owner, _, workspace, project = pages_project
    make_page(workspace, project, owner, "Секретная стратегия")
    outsider = make_user()
    WorkspaceMemberFactory(workspace=workspace, member=outsider, role=15)
    guest = make_user()
    WorkspaceMemberFactory(workspace=workspace, member=guest, role=5)
    ProjectMemberFactory(workspace=workspace, project=project, member=guest, role=5)

    api_client.force_authenticate(user=outsider)
    denied = search_pages(api_client, workspace, project)
    api_client.force_authenticate(user=guest)
    guest_view = search_pages(api_client, workspace, project)

    assert denied.status_code == status.HTTP_403_FORBIDDEN
    assert denied.data["error"]["code"] == "CANVAS_PERMISSION_DENIED"
    assert "Секретная стратегия" not in str(denied.data)
    assert guest_view.status_code == status.HTTP_200_OK
    assert [item["display"]["title"] for item in guest_view.data["results"]] == ["Секретная стратегия"]
    assert guest_view.data["results"][0]["capabilities"]["update"] is False
```

- [ ] **S2.3 Тест красный.** `PYTEST plane/tests/contract/ppm_canvas/test_page_search_api.py` → `3 failed`
  (сейчас `types=page` отвергается сериализатором: `400 PROJECTION_SEARCH_INVALID` вместо 200).

- [ ] **S2.4 `services.py` — импорт.** Было (строка 9):

```python
from django.db.models import Count, F, Max, Q
```

Стало:

```python
from django.db.models import Case, Count, F, IntegerField, Max, Q, Value, When
```

- [ ] **S2.5 `services.py` — функции.** Было (строки 621–625):

```python
        "source_version": binding.source_version,
    }


def _content_source_url(*, project, entity_type, entity_id):
```

Стало:

```python
        "source_version": binding.source_version,
    }


def search_project_pages(*, project, user, query, cursor, limit):
    """Pages the user may open from this project: public ones plus the user's own private ones."""
    queryset = (
        Page.objects.filter(
            workspace_id=project.workspace_id,
            archived_at__isnull=True,
            project_pages__project_id=project.id,
            project_pages__workspace_id=project.workspace_id,
            project_pages__deleted_at__isnull=True,
        )
        .filter(Q(access=Page.PUBLIC_ACCESS) | Q(owned_by_id=user.id))
        .select_related("owned_by")
    )
    ordering = ["-updated_at", "-id"]
    if query:
        queryset = queryset.filter(Q(name__icontains=query) | Q(description_stripped__icontains=query)).annotate(
            name_rank=Case(When(name__icontains=query, then=Value(0)), default=Value(1), output_field=IntegerField())
        )
        ordering.insert(0, "name_rank")
    page = list(queryset.order_by(*ordering)[cursor : cursor + limit + 1])
    has_more = len(page) > limit
    return page[:limit], str(cursor + limit) if has_more else None


def serialize_page_search_result(*, page, project, access):
    owner = page.owned_by
    return {
        **serialize_content_source(source=page, entity_type=PpmCanvasEntityType.PAGE, project=project, access=access),
        "page": {
            "updated_at": page.updated_at.isoformat(),
            "owned_by": {
                "id": str(page.owned_by_id),
                "display_name": (owner.display_name or owner.first_name or "") if owner else "",
            },
            "access": "private" if page.access == Page.PRIVATE_ACCESS else "public",
        },
    }


def _content_source_url(*, project, entity_type, entity_id):
```

(`serialize_content_source` объявлена ниже в том же модуле — вызывается во время выполнения, это корректно. Дубликатов
строк нет без `distinct()`: активная связь проект–документ уникальна — `project_page_unique_project_page_when_deleted_at_null`,
`apps/api/plane/db/models/page.py:142-147`; условия по `project_pages__*` стоят в одном `filter()` и относятся к одной
строке связи.)

- [ ] **S2.6 `serializers.py` — второй тип поиска.** Было (строки 150–154):

```python
    def validate_types(self, value):
        entity_types = {item.strip() for item in value.split(",") if item.strip()}
        if entity_types != {PpmCanvasEntityType.WORK_ITEM}:
            raise serializers.ValidationError("Only work_item projections are available in this release.")
        return [PpmCanvasEntityType.WORK_ITEM]
```

Стало:

```python
    def validate_types(self, value):
        entity_types = {item.strip() for item in value.split(",") if item.strip()}
        if entity_types == {PpmCanvasEntityType.PAGE}:
            return [PpmCanvasEntityType.PAGE]
        if entity_types != {PpmCanvasEntityType.WORK_ITEM}:
            raise serializers.ValidationError("Search one projection type per request: work_item or page.")
        return [PpmCanvasEntityType.WORK_ITEM]
```

(DRF вызывает `validate_types` и для значения по умолчанию, поэтому `validated_data["types"]` — всегда список.)

- [ ] **S2.7 `views.py` — импорты.** Было (строки 78–79): `    save_canvas_snapshot,` / `    search_work_items,` →
  вставить между ними `    search_project_pages,`. Было (строки 83–84): `    serialize_git_source,` /
  `    serialize_semantic_edge,` → вставить между ними `    serialize_page_search_result,`.
  (`PpmCanvasEntityType` уже импортирован, `views.py:25`.)

- [ ] **S2.8 `views.py` — ветка `types=page`.** Было (строки 789–792):

```python
        serializer = PpmProjectionSearchSerializer(data=request.query_params)
        if not serializer.is_valid():
            return self.invalid_payload(request, serializer, code="PROJECTION_SEARCH_INVALID")
        work_items, next_cursor = search_work_items(
```

Стало:

```python
        serializer = PpmProjectionSearchSerializer(data=request.query_params)
        if not serializer.is_valid():
            return self.invalid_payload(request, serializer, code="PROJECTION_SEARCH_INVALID")
        if serializer.validated_data["types"] == [PpmCanvasEntityType.PAGE]:
            pages, next_cursor = search_project_pages(
                project=project,
                user=request.user,
                query=serializer.validated_data["q"],
                cursor=serializer.validated_data["cursor"],
                limit=serializer.validated_data["limit"],
            )
            return Response(
                {
                    "results": [
                        serialize_page_search_result(page=page, project=project, access=access) for page in pages
                    ],
                    "next_cursor": next_cursor,
                },
                status=status.HTTP_200_OK,
            )
        work_items, next_cursor = search_work_items(
```

- [ ] **S2.9 Тест зелёный.** `PYTEST plane/tests/contract/ppm_canvas/test_page_search_api.py` → `3 passed`.
- [ ] **S2.10 Регрессия.** `PYTEST plane/tests/contract/ppm_canvas` → `102 passed` (в т. ч. 20 тестов
  `test_projection_api.py` на поиск задач).
- [ ] **S2.11 Линт.** `RUFF plane/ppm_canvas/services.py plane/ppm_canvas/serializers.py plane/ppm_canvas/views.py plane/tests/contract/ppm_canvas/test_page_search_api.py`
  → `All checks passed!`, `4 files already formatted`.

**Приёмка S2**
- [ ] Видны: публичные документы проекта и собственные приватные. Не видны: чужие приватные, архивные, мягко удалённые,
  отвязанные от проекта, документы другого проекта (тест проверяет каждый случай).
- [ ] Элемент — проекция содержимого `page` (разбирается `ppmCanvasContentProjectionSchema`) + блок `page` с датой,
  автором и видимостью; поиск по названию и тексту, совпадения в названии — первыми; пагинация `next_cursor`.
- [ ] Не участник проекта — 403 без утечки названий; гость — видит публичные, `capabilities.update = false`.
- [ ] Поиск задач (`types` по умолчанию / `work_item`) не изменился; смешанные типы — 400; регрессия `102 passed`;
  `ruff` чистый.

---

### Task 16 (S3): вставка файлов: имена, конфликты, GIF, код, лимит (≈35 мин)

**Решения S3**

| Вопрос | Решение | Обоснование |
|---|---|---|
| Имя от клиента | Уже работает: имя берётся из имени части multipart (`_uploaded_file_metadata` → `validate_entry_name`, `ppm_vault/services.py:110-111`; Django оставляет только базовое имя). Отдельное поле `name` не добавляем. | B передаёт `new File([blob], "Вставка-2026-09-25-153012.png", { type })` в существующий `uploadFile` (`ppm-vault.service.ts:172-184`). Тест закрепляет кириллицу и регистр. |
| 409 при дубле | Уже детерминирован: частичный уникальный индекс `ppm_vault_unique_active_name` (`ppm_vault/models.py:122-126`) → `IntegrityError` → `409 VAULT_NAME_CONFLICT` (`services.py:202-204`). Добавляем **предпроверку до записи объекта** (не пишем 5 МиБ впустую) и `details: {name, suggested_name}` — первое свободное «Имя (n).ext», n = 2…999, сравнение как у индекса (`normalize_name`: регистр, пробелы). Гонка двух одновременных загрузок по-прежнему даёт 409 от индекса (без `suggested_name`). | Несколько картинок, вставленных в одну секунду, получают одинаковое имя — B делает один повтор с `suggested_name`, без цикла угадываний. |
| GIF | Разрешить: сигнатура `GIF87a`/`GIF89a`, kind `image`, MIME `image/gif`. | Растровый формат без активного содержимого (SVG по-прежнему запрещён — тест `test_active_svg_and_mismatched_image_are_rejected`); отдаётся как остальные картинки: `inline` + `Content-Security-Policy: default-src 'none'; sandbox` + `nosniff` (`views.py:336-341`); сервер GIF не декодирует. AVIF/HEIC/TIFF/BMP — не добавляем (редки в буфере, TIFF не показывают браузеры). |
| Лимит | Оставить 5 МиБ (`FILE_SIZE_LIMIT`, `settings/common.py:489`; `_binary_limit`, `services.py:129-134`), в ответ `VAULT_FILE_TOO_LARGE` добавить `details: {size_bytes, limit_bytes}`. | Прокси режет тело запроса тем же `FILE_SIZE_LIMIT` (`apps/proxy/Caddyfile.ce:2-3`, `Caddyfile.aio.ce:2-3`): поднять лимит только в Django бесполезно за прокси и развело бы dev (:8000 напрямую) и prod. Подъём `FILE_SIZE_LIMIT` меняет все загрузки Plane и поверхность DoS — решение оператора (одна переменная окружения двигает прокси и Django вместе, код менять не нужно). Типичный скриншот 1–4 МБ укладывается; для большего B показывает понятную ошибку с лимитом из `details`. |
| Код | Принимать исходный код и конфиги (`CODE_TEXT_EXTENSIONS` из S1) как `file` с MIME `text/plain`, только валидный UTF-8 (BOM допускается) без NUL; HTML/XML/SVG/XHTML не принимаются. Файл больше лимита не декодируется (сначала отказ по размеру). | Критерий приёмки 4 требует просмотр и «Скачать» для кода, а сейчас Хранилище код не принимает. `text/plain` + `attachment` + CSP sandbox + `nosniff` исключают исполнение в нашем источнике; разметка, которую браузер мог бы отрисовать, не принимается вовсе. Существующие txt/csv/json остаются без проверки кодировки (не ломаем CSV в cp1251). |

**Интерфейс (контракт для B)** — `POST /api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/vault/files/`
(multipart: `file`, необязательный `parent_id`), без изменений формы успешного ответа (`201`, `serialize_entry`). Новое:

```jsonc
// 409 — имя занято в этой папке (без учёта регистра и лишних пробелов)
{ "error": { "code": "VAULT_NAME_CONFLICT", "message": "Материал с таким именем уже существует.", "request_id": "…",
  "details": { "name": "Вставка-2026-09-25-153012.png", "suggested_name": "Вставка-2026-09-25-153012 (2).png" } } }
// suggested_name = null, если свободного варианта нет (n > 999 или имя длиннее 255)
// 400 — больше лимита
{ "error": { "code": "VAULT_FILE_TOO_LARGE", "message": "Файл пустой или превышает допустимый размер.", "request_id": "…",
  "details": { "size_bytes": 7340032, "limit_bytes": 5242880 } } }
// 400 — формат: VAULT_INVALID_FILE_TYPE (SVG, неверная сигнатура картинки, код не в UTF-8/с NUL, html/xml, аудио/видео)
```

Расширение имени должно соответствовать содержимому (сервер проверяет сигнатуру по расширению): B берёт расширение из
MIME блоба (`image/png` → `png`, `image/jpeg` → `jpg`, `image/webp` → `webp`, `image/gif` → `gif`).

**Файлы**
- Изменить: `apps/api/plane/ppm_vault/services.py` — импорты (строки 1–3, 19), `IMAGE_SIGNATURES` (строки 23–28),
  `_uploaded_file_metadata` (строки 110–126) + три новые функции перед `_binary_limit` (строка 129),
  `create_uploaded_file` (строки 148–150), `replace_uploaded_file` (строки 219–221).
- Создать тест: `apps/api/plane/tests/contract/ppm_vault/test_vault_paste_api.py`.

- [ ] **S3.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
  apps/api/plane/ppm_vault/services.py apps/api/plane/tests/contract/ppm_vault/test_vault_paste_api.py
```

- [ ] **S3.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_vault/test_vault_paste_api.py`:

```python
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from plane.ppm_vault.models import PpmVaultEntry
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]

PNG = b"\x89PNG\r\n\x1a\n" + b"pasted-screenshot"
GIF = b"GIF89a" + b"\x01\x00\x01\x00\x00\x00\x00;"


def make_user():
    marker = uuid.uuid4().hex
    return UserFactory(username=f"paste-{marker}", email=f"paste-{marker}@plane.test")


@pytest.fixture
def vault_project(settings, tmp_path):
    settings.PPM_LOCAL_ASSET_UPLOADS = True
    settings.PPM_VAULT_STORAGE_ROOT = str(tmp_path / "private-vault")
    user = make_user()
    workspace = WorkspaceFactory(owner=user)
    WorkspaceMemberFactory(workspace=workspace, member=user, role=20)
    project = ProjectFactory(workspace=workspace, identifier="PST")
    ProjectMemberFactory(workspace=workspace, project=project, member=user, role=20)
    return user, workspace, project


def upload(api_client, workspace, project, name, payload, content_type="application/octet-stream"):
    return api_client.post(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/vault/files/",
        {"file": SimpleUploadedFile(name, payload, content_type=content_type)},
        format="multipart",
    )


def test_pasted_image_keeps_client_name_and_duplicate_gets_deterministic_conflict(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)

    created = upload(api_client, workspace, project, "Вставка-2026-09-25-153012.png", PNG, "image/png")
    duplicate = upload(api_client, workspace, project, "вставка-2026-09-25-153012.PNG", PNG, "image/png")
    retried = upload(
        api_client,
        workspace,
        project,
        duplicate.data["error"]["details"]["suggested_name"],
        PNG,
        "image/png",
    )
    second_duplicate = upload(api_client, workspace, project, "Вставка-2026-09-25-153012.png", PNG, "image/png")

    assert created.status_code == status.HTTP_201_CREATED
    assert created.data["name"] == "Вставка-2026-09-25-153012.png"
    assert created.data["kind"] == "image"
    assert duplicate.status_code == status.HTTP_409_CONFLICT
    assert duplicate.data["error"]["code"] == "VAULT_NAME_CONFLICT"
    assert duplicate.data["error"]["details"] == {
        "name": "вставка-2026-09-25-153012.PNG",
        "suggested_name": "вставка-2026-09-25-153012 (2).PNG",
    }
    assert retried.status_code == status.HTTP_201_CREATED
    assert second_duplicate.data["error"]["details"]["suggested_name"] == "Вставка-2026-09-25-153012 (3).png"
    assert PpmVaultEntry.objects.filter(project_id=project.id, kind="image").count() == 2


def test_gif_is_accepted_only_with_gif_signature(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)

    gif = upload(api_client, workspace, project, "анимация.gif", GIF, "image/gif")
    fake = upload(api_client, workspace, project, "fake.gif", PNG, "image/gif")
    served = api_client.get(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/vault/entries/{gif.data['id']}/file/"
    )

    assert gif.status_code == status.HTTP_201_CREATED
    assert gif.data["kind"] == "image"
    assert gif.data["mime_type"] == "image/gif"
    assert served["Content-Type"] == "image/gif"
    assert served["Content-Security-Policy"] == "default-src 'none'; sandbox"
    assert fake.status_code == status.HTTP_400_BAD_REQUEST
    assert fake.data["error"]["code"] == "VAULT_INVALID_FILE_TYPE"


def test_code_files_are_stored_as_utf8_plain_text(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)

    script = upload(api_client, workspace, project, "robot.py", "print('Привет')\n".encode("utf-8"))
    binary = upload(api_client, workspace, project, "tool.py", b"\x00\x01\x02ELF")
    legacy = upload(api_client, workspace, project, "old.js", "var s = 'Привет';".encode("cp1251"))
    markup = upload(api_client, workspace, project, "page.html", b"<script>alert(1)</script>")

    assert script.status_code == status.HTTP_201_CREATED
    assert script.data["kind"] == "file"
    assert script.data["mime_type"] == "text/plain"
    assert script.data["extension"] == "py"
    assert [binary.status_code, legacy.status_code, markup.status_code] == [400, 400, 400]
    assert {binary.data["error"]["code"], legacy.data["error"]["code"], markup.data["error"]["code"]} == {
        "VAULT_INVALID_FILE_TYPE"
    }


def test_image_limit_stays_at_file_size_limit_and_reports_it(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    settings.FILE_SIZE_LIMIT = 32

    oversized = upload(api_client, workspace, project, "big.png", PNG + b"x" * 64, "image/png")

    assert oversized.status_code == status.HTTP_400_BAD_REQUEST
    assert oversized.data["error"]["code"] == "VAULT_FILE_TOO_LARGE"
    assert oversized.data["error"]["details"] == {"size_bytes": len(PNG) + 64, "limit_bytes": 32}
    assert not PpmVaultEntry.objects.filter(project_id=project.id, kind="image").exists()
```

- [ ] **S3.3 Тест красный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_paste_api.py` → `4 failed`
  (нет `details.suggested_name`; GIF и `.py` отклоняются с 400; у `VAULT_FILE_TOO_LARGE` пустые `details`).

- [ ] **S3.4 Импорты.** Было (строки 1–3): `import hashlib` / `import re` / `import uuid` → добавить первой строкой
  `import codecs`. Было (строка 19): `from .storage import copy_private_object, delete_private_object, put_private_object`
  → добавить строкой выше `from .formats import CODE_TEXT_EXTENSIONS`.

- [ ] **S3.5 GIF.** Было (строки 27–28):

```python
    "webp": ("image/webp", lambda header: header.startswith(b"RIFF") and header[8:12] == b"WEBP"),
}
```

Стало:

```python
    "webp": ("image/webp", lambda header: header.startswith(b"RIFF") and header[8:12] == b"WEBP"),
    "gif": ("image/gif", lambda header: header.startswith((b"GIF87a", b"GIF89a"))),
}
```

- [ ] **S3.6 Код и проверка имени.** Было (строки 121–129):

```python
    if extension in REFERENCE_MIME_TYPES:
        return name, extension, PpmVaultEntryKind.FILE, REFERENCE_MIME_TYPES[extension]
    raise PpmVaultConflict(
        code="VAULT_INVALID_FILE_TYPE",
        message="Разрешены PDF, PNG, JPEG, WebP и безопасные офисные или текстовые файлы.",
    )


def _binary_limit(kind):
```

Стало:

```python
    if extension in REFERENCE_MIME_TYPES:
        return name, extension, PpmVaultEntryKind.FILE, REFERENCE_MIME_TYPES[extension]
    if extension in CODE_TEXT_EXTENSIONS:
        _require_utf8_text(uploaded_file)
        return name, extension, PpmVaultEntryKind.FILE, "text/plain"
    raise PpmVaultConflict(
        code="VAULT_INVALID_FILE_TYPE",
        message="Разрешены PDF, PNG, JPEG, WebP, GIF, офисные и текстовые файлы, исходный код.",
    )


def _require_utf8_text(uploaded_file):
    if int(getattr(uploaded_file, "size", 0) or 0) > _binary_limit(PpmVaultEntryKind.FILE):
        return  # the caller rejects the size; oversized input is never decoded
    decoder = codecs.getincrementaldecoder("utf-8-sig")("strict")
    try:
        for chunk in uploaded_file.chunks():
            if b"\x00" in chunk:
                raise ValueError("NUL byte in a text file")
            decoder.decode(chunk)
        decoder.decode(b"", final=True)
    except ValueError as exc:  # UnicodeDecodeError is a ValueError
        raise PpmVaultConflict(
            code="VAULT_INVALID_FILE_TYPE",
            message="Файл с кодом должен быть текстом в кодировке UTF-8.",
        ) from exc
    finally:
        uploaded_file.seek(0)


def _suggest_free_name(*, vault, parent, name):
    stem, dot, extension = name.rpartition(".")
    if not dot or not stem:
        stem, extension = name, ""
    suffix = f".{extension}" if extension else ""
    taken = set(
        PpmVaultEntry.objects.filter(
            vault=vault,
            parent=parent,
            normalized_name__startswith=normalize_name(stem),
            status__in=[PpmVaultEntryStatus.ACTIVE, PpmVaultEntryStatus.QUARANTINED],
        ).values_list("normalized_name", flat=True)
    )
    for index in range(2, 1000):
        candidate = f"{stem} ({index}){suffix}"
        if len(candidate) > 255:
            return None
        if normalize_name(candidate) not in taken:
            return candidate
    return None


def _assert_name_available(*, vault, parent, name):
    taken = PpmVaultEntry.objects.filter(
        vault=vault,
        parent=parent,
        normalized_name=normalize_name(name),
        status__in=[PpmVaultEntryStatus.ACTIVE, PpmVaultEntryStatus.QUARANTINED],
    ).exists()
    if taken:
        raise PpmVaultConflict(
            code="VAULT_NAME_CONFLICT",
            message="Материал с таким именем уже существует.",
            details={"name": name, "suggested_name": _suggest_free_name(vault=vault, parent=parent, name=name)},
        )


def _binary_limit(kind):
```

- [ ] **S3.7 `create_uploaded_file`.** Было (строки 148–151):

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(code="VAULT_FILE_TOO_LARGE", message="Файл пустой или превышает допустимый размер.")
    if extension == "md":
```

Стало:

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(
            code="VAULT_FILE_TOO_LARGE",
            message="Файл пустой или превышает допустимый размер.",
            details={"size_bytes": size, "limit_bytes": _binary_limit(kind)},
        )
    _assert_name_available(vault=vault, parent=parent, name=name)
    if extension == "md":
```

- [ ] **S3.8 `replace_uploaded_file`.** Было (строки 219–222):

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(code="VAULT_FILE_TOO_LARGE", message="Файл пустой или превышает допустимый размер.")
    content_hash = _hash_uploaded_file(uploaded_file)
```

Стало:

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(
            code="VAULT_FILE_TOO_LARGE",
            message="Файл пустой или превышает допустимый размер.",
            details={"size_bytes": size, "limit_bytes": _binary_limit(kind)},
        )
    content_hash = _hash_uploaded_file(uploaded_file)
```

(Первые три строки блоков S3.7 и S3.8 одинаковы; различает их последняя строка: `if extension == "md":` —
`create_uploaded_file`, `content_hash = _hash_uploaded_file(uploaded_file)` — `replace_uploaded_file`.)

- [ ] **S3.9 Тест зелёный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_paste_api.py` → `4 passed`.
- [ ] **S3.10 Регрессия.** `PYTEST plane/tests/contract/ppm_vault plane/tests/contract/ppm_canvas` → `136 passed`
  (ppm_vault 19 + 11 + 4 = 34, ppm_canvas 102).
- [ ] **S3.11 Линт.** `RUFF plane/ppm_vault/services.py plane/tests/contract/ppm_vault/test_vault_paste_api.py`
  → `All checks passed!`, `2 files already formatted`.

**Приёмка S3**
- [ ] Имя вставленного файла от клиента сохраняется как есть (кириллица, регистр); дубль — `409 VAULT_NAME_CONFLICT` с
  `suggested_name`, повтор с ним — `201`; следующий дубль предлагает `(3)`.
- [ ] Предпроверка имени стоит до записи объекта в хранилище; гонка по-прежнему закрыта индексом.
- [ ] GIF принимается только с сигнатурой GIF и отдаётся с `image/gif` + CSP sandbox; SVG и подделки — 400.
- [ ] `.py` в UTF-8 — `201`, `text/plain`; NUL/cp1251/`.html` — 400 `VAULT_INVALID_FILE_TYPE`.
- [ ] Лимит 5 МиБ не изменён; `VAULT_FILE_TOO_LARGE` отдаёт `size_bytes`/`limit_bytes`.
- [ ] Регрессия `136 passed`, `ruff` чистый.

---

#### Примечание S4 — аудио и видео: вне AF2.1 (обоснование)

Спецификация допускает аудио/видео, только «если сервер примет форматы и отдаст файл с поддержкой диапазонов». В AF2.1
это не делаем:
1. **Нет Range в локальном хранилище.** `/file/` отдаёт `FileResponse` без поддержки `Range`
   (`ppm_vault/views.py:333-342`; `django.http.FileResponse` диапазоны не обрабатывает). Safari не воспроизводит видео без
   `206 Partial Content`, Chrome не перематывает. Нужен собственный ответ с диапазонами (`bytes=a-b`, суффиксы,
   несколько диапазонов → 416/одиночный, `If-Range`, `Accept-Ranges`) и отдельное ревью безопасности. В режиме S3/MinIO
   диапазоны уже работают через подписанную ссылку (`ppm_vault/storage.py:57-65`, 300 с), то есть работа нужна только
   для локального режима, но именно он используется в dev и тестах.
2. **Лимит 5 МиБ за прокси** (см. S3): 5 МиБ видео — 10–40 секунд; без подъёма `FILE_SIZE_LIMIT` (решение оператора)
   ценность близка к нулю.
3. **Сигнатуры и полиглоты.** mp4/mov/m4a (ISO BMFF `ftyp` + белый список брендов), webm (EBML), mp3 (ID3/синхрослово),
   wav (`RIFF…WAVE`), ogg (`OggS`) проверяются легко, но медиапарсеры браузеров — частый источник уязвимостей, а отдача
   `inline` с нашего источника требует тех же sandbox-заголовков и отдельной проверки.

**Итог:** аудио/видео в AF2.1 не принимаются (сервер отвечает `400 VAULT_INVALID_FILE_TYPE`, B показывает «Формат не
поддерживается Хранилищем»). Предлагаемая отдельная задача после AF2.1: «Аудио и видео в Хранилище» — сигнатуры с белым
списком брендов, ответ с диапазонами для локального хранилища + тесты (`206`, `416`, суффикс, `If-Range`), решение
владельца о `FILE_SIZE_LIMIT`, карточка с `<audio>/<video>` в B.

---

## Review Focus (безопасность) — на что смотреть ревьюеру

1. **Права.** Предпросмотр использует ровно `require_access` + `get_entry`, как `/file/` (тест: гость 200, не участник 403,
   аноним 401, чужой проект 404, корзина 404). Поиск документов: чужие приватные не попадают в выдачу никогда (в т. ч.
   глобальному администратору), архивные/удалённые/отвязанные/из другого проекта исключены; нужен доступ к проекту.
   Идентификаторы (`entry_id`, `version`) добавляются к ответу после проверки прав, в кеше их нет.
2. **Zip-бомбы.** До распаковки — проверка центрального каталога (число элементов, сумма заявленных размеров, степень
   сжатия, бит шифрования); `zipfile` не распаковывает элемент больше заявленного `file_size` (чтение обрывается, CRC не
   сходится → `invalid`; тест `test_member_that_inflates_past_its_declared_size_is_rejected`); openpyxl получает архив
   только после проверки; `_read_member` читает не больше `cap + 1` байт. Исходник > 16 МиБ не читается вовсе.
3. **XML.** lxml: `resolve_entities=False, no_network=True, load_dtd=False, huge_tree=False` (тест XXE). openpyxl в образе
   парсит через lxml с `resolve_entities=False` (`openpyxl.xml.functions`) и потоково через `xml.etree.iterparse` на
   expat 2.6.3 (встроенная защита от «billion laughs» с expat 2.4); `defusedxml` в образе нет (проверено:
   `openpyxl.xml.DEFUSEDXML == False`) — новая зависимость не требуется.
4. **HTML.** Собирается только из экранированного текста (`html.escape`), затем `nh3.clean(tags=allowlist,
   attributes={"*": set()}, url_schemes=set())` — без атрибутов, ссылок и картинок. B дополнительно пропускает через
   DOMPurify.
5. **Ничего не исполняется:** нет подпроцессов и макросов; `data_only=True` — только сохранённые значения формул;
   `keep_links=False`.
6. **Ресурсы.** Вход ≤ 16 МиБ в памяти, выход ≤ 400 000 символов, бюджет времени 5 с, TTL кеша 24 ч; в логах только
   `entry_id` и класс исключения, без содержимого.
7. **Кеш по хэшу содержимого** общий для записей с одинаковыми байтами — безопасно (ключ требует знания байтов); ключ
   включает лимиты и версию схемы.
8. **Загрузка.** GIF — по сигнатуре; код — UTF-8 без NUL, `text/plain`, отдаётся `attachment` + CSP sandbox; HTML/XML/SVG
   не принимаются; предпроверка имени — до записи в хранилище; `suggested_name` вычисляется только в пределах той же папки
   того же Хранилища (не раскрывает ничего вне прав пользователя, у которого и так есть право записи).
9. **Сознательно не сделано:** ограничение частоты запросов предпросмотра (нагрузка ограничена кешем и числом файлов,
   создавать файлы может только участник с правом записи) — кандидат в O0.1; жёсткое прерывание разбора (см. «Тайм-аут»);
   верхняя граница `cursor` у поиска Холста — существующее поведение `PpmProjectionSearchSerializer`
   (`ppm_canvas/serializers.py:147`, общее с поиском задач), линия S его не меняет.

---

## Итоговая проверка линии S

- [ ] `PYTEST plane/tests/contract/ppm_vault plane/tests/contract/ppm_canvas` → `136 passed`.
- [ ] `RUFF plane/ppm_vault/formats.py plane/ppm_vault/preview.py plane/ppm_vault/views.py plane/ppm_vault/urls.py plane/ppm_vault/services.py plane/ppm_canvas/services.py plane/ppm_canvas/serializers.py plane/ppm_canvas/views.py plane/tests/contract/ppm_vault/test_vault_preview_api.py plane/tests/contract/ppm_vault/test_vault_paste_api.py plane/tests/contract/ppm_canvas/test_page_search_api.py`
  → `All checks passed!`, `11 files already formatted`.
- [ ] `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-diff.sh apps/api` показывает только
  11 файлов линии S: новые `ppm_vault/formats.py`, `ppm_vault/preview.py` и три тестовых файла; изменённые
  `ppm_vault/{views,urls,services}.py` и `ppm_canvas/{services,serializers,views}.py`.
- [ ] Дымовой `curl` из S1.12 даёт 401.
- [ ] `docker compose -p ppm-af21-s -f docker-compose-test.yml down -v` (если контроллер не просит оставить стек).
- [ ] Записи для CHANGELOG/отчёта: новый маршрут `…/vault/entries/<id>/preview/`; `types=page` в
  `…/projections/search/`; GIF и код в Хранилище; `suggested_name` и `details` лимита; аудио/видео — вне AF2.1.
