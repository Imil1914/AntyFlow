# AF2.1 — Часть R (рейка и фигуры): план реализации

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

### Task 1 (R1): Модель тулкита и плавающая рейка v2 по группам (K1)

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

### Task 2 (R2): Палитра PPM для tldraw, стикер «пишешь сразу», рамки с цветом

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

### Task 3 (R3): Панель стилей над выделением (K2/K3)

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

### Task 4 (R4): «+» продолжения схемы (K2)

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

### Task 5 (R5): Регрессии панели — панель задач и инспектор, единый счётчик, e2e, масштаб v1

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
