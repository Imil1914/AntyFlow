# AF2.1 — Часть F (фундамент): план реализации

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
