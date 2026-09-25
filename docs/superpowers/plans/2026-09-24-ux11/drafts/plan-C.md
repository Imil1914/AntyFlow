# UX1.1 — Часть C: Холст (гибрид A+B, волна 1) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Холст в новом облике: строка статуса «Лист N из M · Все изменения сохранены · 12:41» с группой масштаба,
смысловые связи нарисованы прямо на холсте и читаются по концу линии, три семейства карточек различаются с первого
взгляда, у выделенной живой карточки задачи есть инспектор. При `html[data-ppm-design="v1"]` холст ведёт себя ровно
как после волны 0.

**Architecture:**
- Линия C стартует после фазы F и идёт параллельно с линией T. Правим **только** файлы линии C
  (`apps/web/core/components/ppm-canvas/**`, `packages/ppm-canvas/**`, `packages/ppm-brand/src/translations/ux11-canvas.ts`,
  тесты холста). Что нужно от F — в `drafts/plan-C-needs.md`.
- Два уровня гейта:
  1. `usePpmDesignV2()` / `isPpmDesignV2()` (F, `@/lib/ppm-design`) — всё новое в TSX. При v1 — прежняя разметка.
  2. «Грамматика v2» = `designV2 && statusPlacement === "footer"` (только рабочее пространство). Её носит атрибут
     `.ppm-canvas-shell[data-ppm-canvas-grammar="v2"]` и контекст `PpmCanvasGrammarContext`. Минимальный режим
     (`PPM_ANTYFLOW_SHELL_ENABLED=0`, `statusPlacement="card"`) остаётся в разметке волны 0.
- Весь CSS линии — в новом `apps/web/core/components/ppm-canvas/canvas-v2.css`, импорт в `editor.tsx` сразу после
  `canvas.css`. Каждый селектор начинается с `:where(html[data-ppm-design="v2"])`; правила карточек, связей и
  инспектора дополнительно ограничены `[data-ppm-canvas-grammar="v2"]`. `canvas.css` не трогаем (ловушка
  `ruleBody()` в `canvas-css.test.ts:6-10` и `rail.test.ts:17` не срабатывает).
- Смысловые связи рисует слой в слоте tldraw `components.OnTheCanvas` (модульная функция + React-контекст). Это не
  стрелки tldraw: данные доски не меняются, автосохранение не запускается, при pan/zoom React не работает.
- Новое состояние живёт в `PpmCanvasEditor`, **не** в `CanvasControls`: `InFrontOfTheCanvas` пересоздаётся при
  смене любой из ~46 зависимостей memo (`editor.tsx:1963-2070`). Масштаб поднимается в строку статуса через внешний
  стор (листовой `useSyncExternalStore`), а не через состояние workspace.
- Коммитов нет. Перед первой правкой каждого файла — `tools/ux11-pre.sh`.

**Tech Stack:** React Router 7 + Vite 8, Tailwind 4.1.17, tldraw 3.15.6 (`OnTheCanvas`, `SVGContainer`, `useValue`,
`stopEventPropagation`, `resetZoom`, `getOnlySelectedShape`, `getSortedChildIdsForParent` — проверено по
`@tldraw/editor/dist-cjs/index.d.ts:1626,1973,2547,2893,5790,5798,6477`), lucide-react 0.469.0, vitest 4 (env `node`),
oxfmt/oxlint.

**Spec:** `drafts/spec-draft.md` §E, рулинги R4, R5, R12–R18, R23. Токены — `drafts/TOKENS.md` §1 (группа
«Холст»), §6, §9, §11. Карта кода — `notes/canvas.md`, риски — `notes/risk.md` §1.3, §3.3–3.5, §4.3. Макеты —
`mockups/H-Canvas-{Dark,Light}.png` (+ `.dc.html`), блок Холста в `mockups/H-System.png`. Левая рейка и свёрнутый
сайдбар макета иллюстративны: рейку и команды холста не перестраиваем; контекстной панели над выделением нет (R15,
R23).

**Проверено по рабочему дереву (2026-09-25):** контрольные суммы совпадают с `notes/canvas.md` —
`editor.tsx` 3565 строк `7c9908d08131`, `shape.tsx` 2600 `5a87831511ee`, `workspace.tsx` 1625 `3f02b73ac0d1`,
`canvas.css` 4990 `1be17ab8e0ae`, `board-workspace-state.ts` 160 `d29a7494b7d1`, `packages/ppm-canvas/src/index.ts`
2156 `136bdc209c3e`. Номера строк ниже — по этому состоянию (до правок линии C). Если F или соседняя задача уже
сдвинула строки — искать по приведённой строке-якорю.

## Решения линии C (фиксируются в CHANGELOG карточки)

| # | Вопрос | Решение |
|---|---|---|
| RC1 | Минимальный режим | Грамматика v2 (слой связей, инспектор, новые карточки, строка статуса) — только при `statusPlacement="footer"`. Минимальный режим получает только общие токены F |
| RC2 | Кнопки масштаба | При v2 «Отдалить · Масштаб 100 %, сбросить · Приблизить · Показать всё» живут только в строке статуса (TOKENS §11). В рейке при v2 кнопок «Вид» нет, подпись «Вид» остаётся над блоком выравнивания у редактора. Имена «Приблизить/Отдалить» уникальны (`ppm-canvas-performance.spec.ts:323-324`) |
| RC3 | Концы связей | Порт (точка 2,5 px) в начале **каждой** смысловой связи (TOKENS §11, легенда H-System). Стрелка 6×9 — все направленные типы; засечка ⊣ 11×2 — «Блокирует»; «Противоречит» — пунктир 4 3 + стрелка; «Связано с» — без конца. Красные только «Блокирует» и «Противоречит» |
| RC4 | Чипы на линиях | Только для указателя (слой `aria-hidden`, `pointer-events` лишь у чипа). Клавиатурный путь — панель «Смысловые связи» и инспектор. LOD: чипы при масштабе ≥ 0,5 и если отрезок длиннее чипа + 16 |
| RC5 | Кнопки шапки своих карточек | Не прячем до наведения: у `.tl-shape` `pointer-events:none` (tldraw `editor.css:1146-1152`), наведение ненадёжно. Делаем их «тихими» (`icon-subtle`, ≥ 3:1) |
| RC6 | Время «12:41» | Это `saved_at` последней сохранённой версии с сервера, а не время загрузки. Не сегодня — с датой. Показывается только рядом с «Все изменения сохранены» |
| RC7 | «Общий холст» | В v2 не повторяем в строке статуса (как на макете). «Холст только для чтения» — прежняя логика `footerRoleLabelKey` |
| RC8 | Исполнители на карточке | Остаётся `<select multiple>` (R4); имена — в подвале карточки; правка также в инспекторе |
| RC9 | Инспектор | Только одна выделенная живая карточка задачи. Скрыт при открытой «Доске», предпросмотре импорта, блокирующем статусе (конфликт/ошибка/повреждение/восстановление) и уже 980 px |
| RC10 | Перечитывание связей | Только на `window focus` и только активной доской (DOM-проверка `data-active`), без таймеров |
| RC11 | R16 | «Предложено — требуется подтверждение» — новый ключ, при v2 (в т. ч. в минимальном режиме); при v1 — прежний текст |

## Global Constraints (линия C)

- Рабочее дерево `plane-fork` — истина (волна 0 и фаза F не закоммичены). Никаких `git add/commit/stash/reset/checkout`.
- Перед первой правкой **любого** файла (и перед созданием нового):
  `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh <путь от plane-fork> …`
- Не трогать файлы линий F и T. `packages/ppm-brand/src/index.ts`, `tokens.css`, `apps/web/app/root.tsx`,
  `apps/web/core/lib/ppm-design.ts`, аудит-скрипты `@ppm/brand` — только через `drafts/plan-C-needs.md`.
- Контракты F потребляем как существующие: `usePpmDesignV2()`/`isPpmDesignV2()` из `@/lib/ppm-design`; токены
  TOKENS.md; пустой модуль `packages/ppm-brand/src/translations/ux11-canvas.ts` вида
  `export const UX11_CANVAS_TRANSLATIONS = { en: {}, ru: {} } as const;`, влитый F в `PPM_TRANSLATIONS`.
  Линия C только **добавляет** ключи `canvas.*` (en и ru одинаковые наборы), существующие ключи не переопределяет.
- После правки `ux11-canvas.ts` — `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pkg-build.sh ppm-brand`; после
  правки `packages/ppm-canvas/src` — `…/ux11-pkg-build.sh ppm-canvas`. `pnpm` не вызывать.
- Каждый `var(--ppm-…)` в `canvas-v2.css` — с фолбэком на роль волны 0 (ловушка IACVT). Кегль ≥ 11 px (0.6875rem).
  В селекторах `canvas-v2.css` не ставить запятые внутри `:is()/:not()` — тест делит список по запятой.
- Горячих клавиш не добавляем (буквенные дефолты tldraw не переопределены — `notes/canvas.md` §2.5).
- Строки UI — только ключи `PPM_TRANSLATIONS`, без «ИИ», «Page», «Vault», «проекция» в новых строках.
- Формат — только точечно: `cd plane-fork/apps/web && ../../node_modules/.bin/oxfmt <файлы>`;
  для пакетов — `cd plane-fork && node_modules/.bin/oxfmt <файлы>`.
- Типы: `cd plane-fork/apps/web && ./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "ppm-canvas|ux11-canvas"` —
  пусто (линия T может быть посреди правки, поэтому фильтруем по своим путям).
- Базовая линия (не ухудшать): web vitest 184/184, `@ppm/brand` 41/41 + audit, `@ppm/canvas` 38/38 + audit
  (одна старая tsc-ошибка `src/index.ts(1803,7) TS2322`), web tsc 0, oxlint `ppm-*` 0.
- E2E-якоря, которые линия C обязана сохранить (`notes/canvas.md` §0, `notes/risk.md` §1.3): видимый точный текст
  «Все изменения сохранены»; ровно один `.ppm-canvas-status__notice` в активном редакторе; уникальные кнопки
  «Приблизить»/«Отдалить»; единственный `[role="dialog"]` в редакторе (предпросмотр импорта); `.ppm-work-item-card`
  с `getByLabel("Статус")` → нативный `<select>`; кнопка «Убрать с холста» (exact); textbox «Новая заметка»;
  `[data-ppm-canvas-node-kind="vault_file_ref"]`; «Нарисовать визуальную связь»; «Холст только для чтения» — одно
  совпадение; `.ppm-canvas-shell[data-ppm-canvas-mode]`.

## Review Focus (линия C)

1. **v1 без изменений.** `localStorage.ppm_design="v1"` и `PPM_DESIGN_V2=0`: `canvas-v2.css` не действует (тест
   скоупа), новый DOM не рендерится (строка статуса, слой связей, инспектор, шапки карточек, чипы-цитаты), рейка
   с кнопками «Вид», старые подписи. Тесты: C1 `canvas-v2-css.test.ts`, `isCanvasCommandAllowedReadOnly(…, false)`.
2. **Читатель/гость.** Видит линии и чипы связей, открывает «Смысловые связи» только для чтения из рейки, палитры и
   чипа, сбрасывает масштаб; инспектор — без контролов правки. Тесты: C1/C2 allowlist, C6 модель.
3. **Минимальный режим `PPM_ANTYFLOW_SHELL_ENABLED=0`.** Нет `data-ppm-canvas-grammar`, нет слоя, инспектора,
   шапок v2; карточка статуса — единственный индикатор сохранения; индикатор выделения с радиусом 12.
4. **8 открытых досок, скрытые вкладки.** Слой и инспектор монтируются в каждом редакторе, но пересчёт идёт только при
   изменении фигур; перечитывание связей — только активной доской; зум скрытых досок не попадает в строку статуса.
5. **Восстановление и конфликт.** Баннер виден, инспектор скрыт, строка статуса показывает проблемный статус без
   времени; в DOM ровно один `.ppm-canvas-status__notice`.
6. **Много связей / производительность.** 300 фигур и сотни связей: pan/zoom без React-рендера слоя (кроме
   порога LOD), перетаскивание пересчитывает только связи двигаемой фигуры, без теней и фильтров на нодах.
7. **Светлая тема.** Линии `link` ≥ 3:1 к доске, красные только у «Блокирует/Противоречит», чипы и засечки видны,
   текст ≥ 4,5:1 (контраст TOKENS §11).

## Карта файлов линии C

| Файл | Задачи |
|---|---|
| `apps/web/core/components/ppm-canvas/canvas-v2.css` (новый) | C1–C7 |
| `apps/web/core/components/ppm-canvas/canvas-grammar.ts` (новый) | C1, C3, C4, C6, C7 |
| `apps/web/core/components/ppm-canvas/canvas-zoom-store.ts` (новый) | C1 |
| `apps/web/core/components/ppm-canvas/semantic-edge-geometry.ts` (новый) | C2 |
| `apps/web/core/components/ppm-canvas/semantic-edge-style.ts` (новый) | C2 |
| `apps/web/core/components/ppm-canvas/semantic-edges-layer.tsx` (новый) | C2 |
| `apps/web/core/components/ppm-canvas/live-card.tsx` (новый) | C3, C4 |
| `apps/web/core/components/ppm-canvas/citation-format.ts` (новый) | C5 |
| `apps/web/core/components/ppm-canvas/canvas-inspector.tsx` (новый) | C6 |
| `apps/web/core/components/ppm-canvas/board-workspace-state.ts` | C1, C2 |
| `apps/web/core/components/ppm-canvas/commands.ts` | C1, C7 |
| `apps/web/core/components/ppm-canvas/editor.tsx` | C1, C2, C6, C7 |
| `apps/web/core/components/ppm-canvas/workspace.tsx` | C1, C2, C7 |
| `apps/web/core/components/ppm-canvas/shape.tsx` | C3, C4, C5, C6, C7 |
| `apps/web/core/components/ppm-canvas/brain-panel.tsx` | C5 |
| `packages/ppm-brand/src/translations/ux11-canvas.ts` | C1–C7 |
| `packages/ppm-canvas/src/index.ts`, `…/__tests__/canvas-node.test.ts` | C7 (P2) |
| `apps/web/tests/ppm-canvas/{status-line,canvas-v2-css,semantic-edge-geometry,semantic-edge-style,card-grammar,citation-format,canvas-inspector}.test.ts` (новые) | C1–C7 |

---

### Task C1: Основа v2 Холста и строка статуса «Лист · Сохранено · 12:41» с группой масштаба

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-v2.css`
- Create: `apps/web/core/components/ppm-canvas/canvas-grammar.ts`
- Create: `apps/web/core/components/ppm-canvas/canvas-zoom-store.ts`
- Modify: `apps/web/core/components/ppm-canvas/board-workspace-state.ts` (дописать в конец, после `:160`)
- Modify: `apps/web/core/components/ppm-canvas/commands.ts:12-43` (`"zoom-reset"` после `"fit-view"`, `:35`)
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — импорты `:7-134`, пропсы `:136-154`, деструктуризация
  `:199-215`, состояние `:268`, `saved_at` в `:423`, `:621`, `:644`, `:864`, `:1457`, `:1597`, эффект рядом с
  `:939-941`, команда в `switch` `:2437-2447`, оболочка `:2114-2132`, новый лист после `PpmCanvasRealtimeCursors`
  (`:2169-2215`)
- Modify: `apps/web/core/components/ppm-canvas/workspace.tsx` — импорты `:1-86`, состояние после `:163`,
  `runCanvasCommand` `:319-323`, «Вид» в рейке `:949-966`, пропсы редактора `:1030-1053`, футер `:1060-1066`,
  новые компоненты после `SyncDot` (`:1532-1534`)
- Modify: `packages/ppm-brand/src/translations/ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/status-line.test.ts` (новый), `apps/web/tests/ppm-canvas/canvas-v2-css.test.ts` (новый)

**Interfaces:**
- Consumes: `usePpmDesignV2()` (F); токены `--ppm-page-header-height`, `--ppm-canvas-status-height`,
  `--ppm-control-height-sm`, `--ppm-radius-*`, `--ppm-color-*`, `--ppm-color-board`, `--ppm-canvas-overlay-inset`,
  `--ppm-focus-ring`, `--ppm-font-mono` (все с фолбэком); ключи `canvas.sync_saved`, `canvas.zoom_in/out`,
  `canvas.fit_view`, `canvas.read_only_title`.
- Produces:
  - `PpmCanvasGrammarContext`, `usePpmCanvasGrammarV2()`, `isCanvasGrammarV2(designV2, placement)`;
  - атрибут `.ppm-canvas-shell[data-ppm-canvas-grammar="v2"]` (для C2–C7);
  - `createCanvasZoomStore()`, `TPpmCanvasZoomStore`;
  - в `board-workspace-state.ts`: `formatCanvasStatusParts`, `formatCanvasSavedTime`, `formatCanvasZoom`,
    `isCanvasCommandAllowedReadOnly`;
  - команда `"zoom-reset"`; пропсы редактора `onSavedAtChange`, `onZoomChange`;
  - ключи `canvas.status_sheet`, `canvas.zoom_group`, `canvas.zoom_reset_label`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-v2.css apps/web/core/components/ppm-canvas/canvas-grammar.ts \
    apps/web/core/components/ppm-canvas/canvas-zoom-store.ts apps/web/core/components/ppm-canvas/board-workspace-state.ts \
    apps/web/core/components/ppm-canvas/commands.ts apps/web/core/components/ppm-canvas/editor.tsx \
    apps/web/core/components/ppm-canvas/workspace.tsx packages/ppm-brand/src/translations/ux11-canvas.ts \
    apps/web/tests/ppm-canvas/status-line.test.ts apps/web/tests/ppm-canvas/canvas-v2-css.test.ts
  ```
  Ожидание: `pre-image saved: …` по каждому пути (для новых файлов создаётся маркер `.__absent__`).

- [ ] **Step 2: Написать падающие тесты**

  `apps/web/tests/ppm-canvas/status-line.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    formatCanvasSavedTime,
    formatCanvasStatusParts,
    formatCanvasZoom,
    isCanvasCommandAllowedReadOnly,
  } from "@/components/ppm-canvas/board-workspace-state";
  import { createCanvasZoomStore } from "@/components/ppm-canvas/canvas-zoom-store";
  import { PPM_CANVAS_COMMANDS } from "@/components/ppm-canvas/commands";

  // Local time on purpose: the footer shows the save time in the viewer's time zone.
  const NOW = new Date(2026, 8, 24, 18, 0);
  const SAVED = new Date(2026, 8, 24, 12, 41).toISOString();
  const base = {
    activeBoardIds: ["a", "b", "c"],
    boardId: "b",
    locale: "ru",
    now: NOW,
    roleKey: "canvas.shared_badge" as const,
    savedAt: SAVED,
    statusKey: "canvas.sync_saved",
  };

  describe("canvas status line (UX1.1 C1)", () => {
    it("shows the sheet position only when the project has several boards", () => {
      expect(formatCanvasStatusParts(base).sheet).toEqual({ index: 2, total: 3 });
      expect(formatCanvasStatusParts({ ...base, activeBoardIds: ["b"] }).sheet).toBeNull();
      expect(formatCanvasStatusParts({ ...base, boardId: "missing" }).sheet).toBeNull();
      const sheet = getPpmTranslation("ru", "canvas.status_sheet").replace("{index}", "2").replace("{total}", "3");
      expect(sheet).toBe("Лист 2 из 3");
    });

    it("keeps the exact saved label and adds the time only next to it", () => {
      expect(getPpmTranslation("ru", "canvas.sync_saved")).toBe("Все изменения сохранены");
      expect(formatCanvasStatusParts(base).time).toEqual({ iso: SAVED, label: "12:41" });
      for (const statusKey of ["canvas.sync_saving", "canvas.sync_error", "canvas.sync_loading", "canvas.read_only_title"]) {
        expect(formatCanvasStatusParts({ ...base, statusKey }).time, statusKey).toBeNull();
      }
      expect(formatCanvasStatusParts({ ...base, savedAt: null }).time).toBeNull();
    });

    it("never shows a version and never repeats the shared badge", () => {
      const parts = formatCanvasStatusParts(base);
      expect(Object.keys(parts)).toEqual(["sheet", "time", "role"]);
      expect(parts.role).toBeNull();
      expect(formatCanvasStatusParts({ ...base, roleKey: "canvas.read_only_title", statusKey: "canvas.sync_error" }).role).toBe(
        "canvas.read_only_title"
      );
    });

    it("formats today's save as HH:MM and older saves with the date", () => {
      expect(formatCanvasSavedTime(SAVED, "ru", NOW)).toBe("12:41");
      expect(formatCanvasSavedTime(new Date(2026, 8, 23, 9, 5).toISOString(), "ru", NOW)).toMatch(/^23 сент\.?,? 09:05$/);
      expect(formatCanvasSavedTime("not a date", "ru", NOW)).toBeNull();
    });

    it("formats zoom with a non-breaking space and a localized reset label", () => {
      expect(formatCanvasZoom(100)).toBe("100 %");
      expect(formatCanvasZoom(49.6)).toBe("50 %");
      expect(getPpmTranslation("ru", "canvas.zoom_reset_label").replace("{zoom}", "100")).toBe("Масштаб 100 %, сбросить");
      expect(getPpmTranslation("ru", "canvas.zoom_reset_label")).not.toMatch(/Приблизить|Отдалить/);
    });

    it("lets readers reset zoom only in the v2 design", () => {
      expect(PPM_CANVAS_COMMANDS).toContain("zoom-reset");
      for (const command of ["select", "fit-view", "zoom-in", "zoom-out"]) {
        expect(isCanvasCommandAllowedReadOnly(command, false), command).toBe(true);
        expect(isCanvasCommandAllowedReadOnly(command, true), command).toBe(true);
      }
      expect(isCanvasCommandAllowedReadOnly("zoom-reset", true)).toBe(true);
      expect(isCanvasCommandAllowedReadOnly("zoom-reset", false)).toBe(false);
      expect(isCanvasCommandAllowedReadOnly("add-note", true)).toBe(false);
    });

    it("publishes zoom per board and skips unchanged values", () => {
      const store = createCanvasZoomStore();
      let calls = 0;
      const unsubscribe = store.subscribe(() => {
        calls += 1;
      });
      expect(store.get("a")).toBe(100);
      store.set("a", 80);
      store.set("a", 80);
      store.set("b", 120);
      expect([store.get("a"), store.get("b"), calls]).toEqual([80, 120, 2]);
      unsubscribe();
      store.set("a", 60);
      expect(calls).toBe(2);
    });
  });
  ```

  `apps/web/tests/ppm-canvas/canvas-v2-css.test.ts` (задачи C2–C7 дописывают сюда свои `it`):
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const V2 = ':where(html[data-ppm-design="v2"])';
  const G = `${V2} [data-ppm-canvas-grammar="v2"]`;
  // oxfmt breaks long selectors and gradients over several lines: strip comments and collapse whitespace first.
  const css = readFileSync(new URL("../../core/components/ppm-canvas/canvas-v2.css", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ");
  const editorSource = readFileSync(new URL("../../core/components/ppm-canvas/editor.tsx", import.meta.url), "utf8");

  function selectors(): string[] {
    return [...css.matchAll(/([^{}]+)\{/g)]
      .map((match) => match[1].trim())
      .filter((prelude) => !prelude.startsWith("@"))
      .flatMap((prelude) => prelude.split(",").map((selector) => selector.trim()));
  }

  // Body of the first rule whose selector list contains `selector` exactly (works inside @media and comma lists).
  function ruleBody(selector: string): string {
    const rule = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, prelude]) =>
      prelude
        .split(",")
        .map((item) => item.trim())
        .includes(selector)
    );
    expect(rule, selector).toBeDefined();
    return rule![2];
  }

  describe("canvas-v2.css (UX1.1)", () => {
    it("is imported right after canvas.css", () => {
      const base = editorSource.indexOf('import "./canvas.css";');
      expect(base).toBeGreaterThan(0);
      expect(editorSource.indexOf('import "./canvas-v2.css";')).toBeGreaterThan(base);
    });

    it("scopes every selector to the v2 design", () => {
      const list = selectors();
      expect(list.length).toBeGreaterThan(0);
      expect(list.filter((selector) => !selector.startsWith(V2))).toEqual([]);
    });

    it("keeps text at or above 11px", () => {
      const small = [...css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)].filter(([, value, unit]) =>
        unit === "px" ? Number(value) < 11 : Number(value) < 0.6875
      );
      expect(small.map((match) => match[0])).toEqual([]);
    });

    it("gives every PPM token a fallback and puts no shadow on canvas nodes", () => {
      expect(css.match(/var\(--ppm-[\w-]+\)/g) ?? []).toEqual([]);
      expect(css).not.toMatch(/\.ppm-canvas-node[^{]*\{[^}]*(box-shadow:\s*(?!none)|(?<!backdrop-)filter:)/);
    });

    it("sizes the workspace chrome from density tokens and paints the board", () => {
      expect(ruleBody(`${V2} .ppm-canvas-workspace`)).toContain("var(--ppm-canvas-status-height, 2rem)");
      expect(ruleBody(`${G} .tl-container`)).toContain("--color-background: var(--ppm-color-board, var(--bg-surface-1));");
    });
  });
  ```
  (Чтобы `G` не ругался линтером как неиспользуемая константа до C2, он уже используется в последнем `it`.)

- [ ] **Step 3: Убедиться, что тесты падают**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/status-line.test.ts tests/ppm-canvas/canvas-v2-css.test.ts
  ```
  Ожидание: FAIL — `does not provide an export named 'formatCanvasStatusParts'` / `Cannot find module …/canvas-zoom-store`
  и `ENOENT … canvas-v2.css`.

- [ ] **Step 4: Переводы** — `packages/ppm-brand/src/translations/ux11-canvas.ts` (F создал пустым) привести к виду:
  ```ts
  // UX1.1 · Холст (линия C). Только новые ключи canvas.*; существующие ключи PPM_TRANSLATIONS не переопределяются.
  export const UX11_CANVAS_TRANSLATIONS = {
    en: {
      "canvas.status_sheet": "Sheet {index} of {total}",
      "canvas.zoom_group": "Zoom",
      "canvas.zoom_reset_label": "Zoom {zoom} %, reset",
    },
    ru: {
      "canvas.status_sheet": "Лист {index} из {total}",
      "canvas.zoom_group": "Масштаб",
      "canvas.zoom_reset_label": "Масштаб {zoom} %, сбросить",
    },
  } as const;
  ```
  Затем `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pkg-build.sh ppm-brand` (ожидание: `Build complete`, код 0).

- [ ] **Step 5: `canvas-grammar.ts` (новый)**
  ```ts
  import { createContext, useContext } from "react";

  // «Грамматика v2» холста — новый облик карточек, слой смысловых связей и инспектор. Включается только в рабочем
  // пространстве (statusPlacement="footer") при html[data-ppm-design="v2"]. Минимальный режим
  // (PPM_ANTYFLOW_SHELL_ENABLED=0) и облик v1 остаются в разметке волны 0.
  export const PpmCanvasGrammarContext = createContext(false);

  export function usePpmCanvasGrammarV2(): boolean {
    return useContext(PpmCanvasGrammarContext);
  }

  export function isCanvasGrammarV2(designV2: boolean, statusPlacement: "card" | "footer"): boolean {
    return designV2 && statusPlacement === "footer";
  }
  ```

- [ ] **Step 6: `canvas-zoom-store.ts` (новый)**
  ```ts
  // Масштаб активной доски для строки статуса. Внешний стор вместо состояния workspace: шаг зума перерисовывает
  // только кнопку «Масштаб 100 %», а не шапку, рейку и обёртки всех открытых редакторов (notes/risk.md §3.3).
  export type TPpmCanvasZoomStore = {
    get: (boardId: string) => number;
    set: (boardId: string, zoom: number) => void;
    subscribe: (listener: () => void) => () => void;
  };

  export function createCanvasZoomStore(): TPpmCanvasZoomStore {
    const zoomByBoardId = new Map<string, number>();
    const listeners = new Set<() => void>();
    return {
      get: (boardId) => zoomByBoardId.get(boardId) ?? 100,
      set: (boardId, zoom) => {
        if (zoomByBoardId.get(boardId) === zoom) return;
        zoomByBoardId.set(boardId, zoom);
        for (const listener of listeners) listener();
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
  }
  ```

- [ ] **Step 7: `board-workspace-state.ts` — дописать в конец файла (после `compareBoards`, `:160`)**
  ```ts
  // UX1.1: commands a read-only viewer may run. v2 adds the zoom reset from the footer.
  const READ_ONLY_COMMANDS_V1: readonly string[] = ["select", "fit-view", "zoom-in", "zoom-out"];
  const READ_ONLY_COMMANDS_V2: readonly string[] = [...READ_ONLY_COMMANDS_V1, "zoom-reset"];

  export function isCanvasCommandAllowedReadOnly(command: string, designV2: boolean): boolean {
    return (designV2 ? READ_ONLY_COMMANDS_V2 : READ_ONLY_COMMANDS_V1).includes(command);
  }

  export type TPpmCanvasStatusParts = {
    sheet: { index: number; total: number } | null;
    time: { iso: string; label: string } | null;
    role: "canvas.read_only_title" | null;
  };

  // UX1.1 status line «Лист 2 из 3 · Все изменения сохранены · 12:41». No version (R5); the saved label itself stays
  // a separate element so the exact e2e text «Все изменения сохранены» keeps matching.
  export function formatCanvasStatusParts(input: {
    activeBoardIds: readonly string[];
    boardId: string;
    locale: string;
    now?: Date;
    roleKey: "canvas.shared_badge" | "canvas.read_only_title" | null;
    savedAt: string | null | undefined;
    statusKey: string;
  }): TPpmCanvasStatusParts {
    const position = input.activeBoardIds.indexOf(input.boardId);
    const total = input.activeBoardIds.length;
    const label =
      input.statusKey === "canvas.sync_saved" && input.savedAt
        ? formatCanvasSavedTime(input.savedAt, input.locale, input.now)
        : null;
    return {
      sheet: position >= 0 && total > 1 ? { index: position + 1, total } : null,
      time: label && input.savedAt ? { iso: input.savedAt, label } : null,
      role: input.roleKey === "canvas.read_only_title" ? input.roleKey : null,
    };
  }

  export function formatCanvasSavedTime(savedAt: string, locale: string, now: Date = new Date()): string | null {
    const date = new Date(savedAt);
    if (Number.isNaN(date.getTime())) return null;
    const sameDay =
      date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
    return new Intl.DateTimeFormat(
      locale || "ru",
      sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    ).format(date);
  }

  export function formatCanvasZoom(zoom: number): string {
    return `${Math.round(zoom)} %`;
  }
  ```

- [ ] **Step 8: `commands.ts`** — в `PPM_CANVAS_COMMANDS` после строки `"fit-view",` (`:35`) добавить `"zoom-reset",`.

- [ ] **Step 9: `editor.tsx` — основа v2, время сохранения, масштаб**
  1. Импорты. После `import { usePpmTranslation } from "@/hooks/use-ppm-translation";` (`:89`):
     ```ts
     import { usePpmDesignV2 } from "@/lib/ppm-design";
     ```
     После `import { isBlockingCanvasStatus } from "./board-workspace-state";` (`:123`):
     ```ts
     import { PpmCanvasGrammarContext, isCanvasGrammarV2 } from "./canvas-grammar";
     ```
     После `import "./canvas.css";` (`:134`):
     ```ts
     // oxlint-disable-next-line import/no-unassigned-import -- UX1.1: v2 look, every rule scoped to html[data-ppm-design="v2"]
     import "./canvas-v2.css";
     ```
  2. Тип пропсов: после строки `onSyncStatusChange?: (boardId: string, status: TPpmCanvasSyncStatus) => void;` (`:145`):
     ```ts
     // UX1.1 (v2 workspace only): server time of the last saved version and the rounded zoom, for the footer.
     onSavedAtChange?: (boardId: string, savedAt: string | null) => void;
     onZoomChange?: (boardId: string, zoom: number) => void;
     ```
     В деструктуризацию (`:199-215`) после `onSyncStatusChange,` добавить `onSavedAtChange,` и `onZoomChange,`.
  3. После `const ppmT = usePpmTranslation();` (`:216`):
     ```ts
     const designV2 = usePpmDesignV2();
     const grammarV2 = isCanvasGrammarV2(designV2, statusPlacement);
     ```
  4. После `const [semanticEdges, setSemanticEdges] = useState<TPpmCanvasSemanticEdge[]>([]);` (`:268`):
     ```ts
     const [savedAt, setSavedAt] = useState<string | null>(null);
     ```
  5. Шесть мест присвоения версии — добавить строку сразу **после** каждого:
     - `:423` `versionRef.current = response.version;` → `setSavedAt(response.saved_at);`
     - `:621` `versionRef.current = 0;` → `setSavedAt(null);`
     - `:644` `versionRef.current = remoteCanvas.version;` → `setSavedAt(remoteCanvas.saved_at);`
     - `:864` `versionRef.current = remoteCanvas.version;` → `setSavedAt(remoteCanvas.saved_at);`
     - `:1457` `versionRef.current = response.version;` → `setSavedAt(response.saved_at);`
     - `:1597` `versionRef.current = current.version;` → `setSavedAt(current.saved_at);`
     (Сеттер стабилен — массивы зависимостей `useCallback` не меняются.)
  6. После эффекта `onSyncStatusChange` (`:939-941`):
     ```ts
     useEffect(() => {
       onSavedAtChange?.(boardId, savedAt);
     }, [boardId, onSavedAtChange, savedAt]);
     ```
  7. `switch` в `CanvasControls`: после ветки `case "fit-view": … break;` (`:2443-2445`):
     ```ts
     case "zoom-reset":
       editor.resetZoom(editor.getViewportScreenCenter(), { animation: { duration: 180 } });
       break;
     ```
  8. Оболочка (`:2114-2132`). Было:
     ```tsx
     <div
       className="ppm-canvas-shell"
       data-ppm-canvas-mode={effectiveCanEdit ? "edit" : "read"}
       onDragOverCapture={handleFileDrop}
       onDropCapture={handleFileDrop}
     >
       <PpmCanvasBoardNavigationContext.Provider value={boardNavigationContext}>
         <PpmWorkItemProjectionContext.Provider value={projectionContext}>
           <Tldraw …>
             {presence && <PpmCanvasRealtimeCursors presence={presence} />}
           </Tldraw>
         </PpmWorkItemProjectionContext.Provider>
       </PpmCanvasBoardNavigationContext.Provider>
     ```
     Стало:
     ```tsx
     <div
       className="ppm-canvas-shell"
       data-ppm-canvas-grammar={grammarV2 ? "v2" : undefined}
       data-ppm-canvas-mode={effectiveCanEdit ? "edit" : "read"}
       onDragOverCapture={handleFileDrop}
       onDropCapture={handleFileDrop}
     >
       <PpmCanvasGrammarContext.Provider value={grammarV2}>
         <PpmCanvasBoardNavigationContext.Provider value={boardNavigationContext}>
           <PpmWorkItemProjectionContext.Provider value={projectionContext}>
             <Tldraw …без изменений…>
               {presence && <PpmCanvasRealtimeCursors presence={presence} />}
               {grammarV2 && onZoomChange && <PpmCanvasZoomReporter boardId={boardId} onZoomChange={onZoomChange} />}
             </Tldraw>
           </PpmWorkItemProjectionContext.Provider>
         </PpmCanvasBoardNavigationContext.Provider>
       </PpmCanvasGrammarContext.Provider>
     ```
  9. После функции `PpmCanvasRealtimeCursors` (заканчивается перед `function CanvasControls(`, `:2217`):
     ```tsx
     // UX1.1: a leaf child of <Tldraw> (never inside the InFrontOfTheCanvas memo). It re-renders only when the rounded
     // zoom percent changes, so pinch and wheel zoom do not touch the workspace tree.
     function PpmCanvasZoomReporter({
       boardId,
       onZoomChange,
     }: {
       boardId: string;
       onZoomChange: (boardId: string, zoom: number) => void;
     }) {
       const editor = useEditor();
       const zoom = useValue("ppm canvas zoom percent", () => Math.round(editor.getZoomLevel() * 100), [editor]);
       useEffect(() => {
         onZoomChange(boardId, zoom);
       }, [boardId, onZoomChange, zoom]);
       return null;
     }
     ```

- [ ] **Step 10: `workspace.tsx` — строка статуса и масштаб**
  1. Импорты: в `from "react"` (`:1-10`) добавить `useSyncExternalStore`; в `lucide-react` (`:11-55`) добавить
     `Minus` (`Focus`, `Plus` уже есть). После `import { usePpmTranslation } from "@/hooks/use-ppm-translation";` (`:61`):
     ```ts
     import { usePpmDesignV2 } from "@/lib/ppm-design";
     ```
     В импорт из `./board-workspace-state` (`:64-79`) добавить `formatCanvasStatusParts`, `formatCanvasZoom`,
     `isCanvasCommandAllowedReadOnly`. После импорта `./brain-panel` (`:82`):
     ```ts
     import { createCanvasZoomStore, type TPpmCanvasZoomStore } from "./canvas-zoom-store";
     ```
  2. После `const presence = usePpmBoardPresence(…);` (`:163`), до любых ранних `return`:
     ```ts
     const designV2 = usePpmDesignV2();
     const { currentLocale } = useTranslation();
     const [savedAtByBoardId, setSavedAtByBoardId] = useState<Record<string, string | null>>({});
     const zoomStore = useMemo(() => createCanvasZoomStore(), []);
     const handleSavedAtChange = useCallback((boardId: string, savedAt: string | null) => {
       setSavedAtByBoardId((current) => (current[boardId] === savedAt ? current : { ...current, [boardId]: savedAt }));
     }, []);
     ```
  3. `runCanvasCommand` (`:319-323`). Было:
     ```ts
     if (!activeBoardEditReady && !["select", "fit-view", "zoom-in", "zoom-out"].includes(command)) return;
     ```
     Стало:
     ```ts
     if (!activeBoardEditReady && !isCanvasCommandAllowedReadOnly(command, designV2)) return;
     ```
  4. Рейка, раздел «Вид» (`:949-966`). Было: `RailSectionLabel … canvas.view` и три `RailButton` (fit-view, zoom-in,
     zoom-out). Стало (RC2):
     ```tsx
     {(!designV2 || (railExpanded && capabilities.edit)) && (
       <RailSectionLabel expanded={railExpanded} label={ppmT("canvas.view")} />
     )}
     {!designV2 && (
       <>
         <RailButton
           expanded={railExpanded}
           icon={Focus}
           label={ppmT("canvas.fit_view")}
           onClick={() => runCanvasCommand("fit-view")}
         />
         <RailButton
           expanded={railExpanded}
           icon={ZoomIn}
           label={ppmT("canvas.zoom_in")}
           onClick={() => runCanvasCommand("zoom-in")}
         />
         <RailButton
           expanded={railExpanded}
           icon={ZoomOut}
           label={ppmT("canvas.zoom_out")}
           onClick={() => runCanvasCommand("zoom-out")}
         />
       </>
     )}
     ```
     Блок выравнивания (`{railExpanded && capabilities.edit && (…)}`) не трогать.
  5. Пропсы `PpmCanvasEditor` (`:1030-1053`): после `onSelectionChange={handleSelectionChange}` добавить
     ```tsx
     onSavedAtChange={designV2 ? handleSavedAtChange : undefined}
     onZoomChange={designV2 ? zoomStore.set : undefined}
     ```
  6. Футер (`:1060-1066`). Было: `<footer className="ppm-canvas-workspace__status">…</footer>`. Стало:
     ```tsx
     {designV2 ? (
       <CanvasStatusLineV2
         activeBoardIds={activeBoards.map((board) => board.board_id)}
         boardId={activeBoardId}
         locale={currentLocale}
         roleKey={activeRoleKey}
         savedAt={savedAtByBoardId[activeBoardId]}
         status={syncByBoardId[activeBoardId]}
         statusKey={activeStatusKey}
         zoomStore={zoomStore}
         onCommand={runCanvasCommand}
       />
     ) : (
       <footer className="ppm-canvas-workspace__status">
         <span>
           <SyncDot status={syncByBoardId[activeBoardId]} />
           {ppmT(activeStatusKey)}
         </span>
         {activeRoleKey && <span>{ppmT(activeRoleKey)}</span>}
       </footer>
     )}
     ```
  7. После `function SyncDot(…)` (`:1532-1534`) добавить:
     ```tsx
     // UX1.1 status line. Separators are aria-hidden siblings, so the saved label keeps its exact text for e2e.
     function CanvasStatusLineV2({
       activeBoardIds,
       boardId,
       locale,
       onCommand,
       roleKey,
       savedAt,
       status,
       statusKey,
       zoomStore,
     }: {
       activeBoardIds: string[];
       boardId: string;
       locale: string;
       onCommand: (command: TPpmCanvasCommand) => void;
       roleKey: ReturnType<typeof footerRoleLabelKey>;
       savedAt: string | null | undefined;
       status?: TPpmCanvasSyncStatus;
       statusKey: ReturnType<typeof syncStatusLabel>;
       zoomStore: TPpmCanvasZoomStore;
     }) {
       const ppmT = usePpmTranslation();
       const parts = formatCanvasStatusParts({ activeBoardIds, boardId, locale, roleKey, savedAt, statusKey });
       return (
         <footer className="ppm-canvas-workspace__status ppm-canvas-statusline">
           <span className="ppm-canvas-statusline__info">
             {parts.sheet && (
               <>
                 <span className="ppm-canvas-statusline__sheet">
                   {ppmT("canvas.status_sheet")
                     .replace("{index}", String(parts.sheet.index))
                     .replace("{total}", String(parts.sheet.total))}
                 </span>
                 <span className="ppm-canvas-statusline__sep" aria-hidden="true">
                   ·
                 </span>
               </>
             )}
             <span className="ppm-canvas-statusline__sync">
               <SyncDot status={status} />
               {ppmT(statusKey)}
             </span>
             {parts.time && (
               <>
                 <span className="ppm-canvas-statusline__sep" aria-hidden="true">
                   ·
                 </span>
                 <time className="ppm-canvas-statusline__time" dateTime={parts.time.iso}>
                   {parts.time.label}
                 </time>
               </>
             )}
             {parts.role && (
               <>
                 <span className="ppm-canvas-statusline__sep" aria-hidden="true">
                   ·
                 </span>
                 <span>{ppmT(parts.role)}</span>
               </>
             )}
           </span>
           <span className="ppm-canvas-zoom" role="group" aria-label={ppmT("canvas.zoom_group")}>
             <button type="button" aria-label={ppmT("canvas.zoom_out")} title={ppmT("canvas.zoom_out")} onClick={() => onCommand("zoom-out")}>
               <Minus aria-hidden="true" />
             </button>
             <CanvasZoomResetButton boardId={boardId} store={zoomStore} onReset={() => onCommand("zoom-reset")} />
             <button type="button" aria-label={ppmT("canvas.zoom_in")} title={ppmT("canvas.zoom_in")} onClick={() => onCommand("zoom-in")}>
               <Plus aria-hidden="true" />
             </button>
             <button type="button" aria-label={ppmT("canvas.fit_view")} title={ppmT("canvas.fit_view")} onClick={() => onCommand("fit-view")}>
               <Focus aria-hidden="true" />
             </button>
           </span>
         </footer>
       );
     }

     function CanvasZoomResetButton({
       boardId,
       onReset,
       store,
     }: {
       boardId: string;
       onReset: () => void;
       store: TPpmCanvasZoomStore;
     }) {
       const ppmT = usePpmTranslation();
       const zoom = useSyncExternalStore(store.subscribe, () => store.get(boardId), () => 100);
       const label = ppmT("canvas.zoom_reset_label").replace("{zoom}", String(zoom));
       return (
         <button type="button" className="ppm-canvas-zoom__reset" aria-label={label} title={label} onClick={onReset}>
           {formatCanvasZoom(zoom)}
         </button>
       );
     }
     ```
     `TPpmCanvasCommand` уже импортирован (`:81`). Ранний выход `if (!activeBoardId) return;` в `runCanvasCommand` сохраняется.

- [ ] **Step 11: `canvas-v2.css` (новый) — шапка файла и правила C1**
  ```css
  /* UX1.1 · Холст, облик v2 (гибрид A+B). Каждый селектор начинается с :where(html[data-ppm-design="v2"]) — при v1
     файл не действует. Карточки, связи и инспектор дополнительно ограничены [data-ppm-canvas-grammar="v2"]
     (только рабочее пространство; минимальный режим остаётся как в волне 0). Цвета и размеры — токены F
     (TOKENS.md §1 «Холст», §11) с фолбэком на роли волны 0. Порядок: этот файл импортируется после canvas.css. */

  /* C1 · Хром рабочего пространства и строка статуса */
  :where(html[data-ppm-design="v2"]) .ppm-canvas-workspace {
    grid-template-rows: var(--ppm-page-header-height, 3.25rem) minmax(0, 1fr) var(--ppm-canvas-status-height, 2rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline {
    gap: 0.75rem;
    padding: 0 0.5rem 0 0.75rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.75rem;
    line-height: 1rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline__info {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
    overflow: hidden;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline__sync {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline__time,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-zoom__reset {
    font-family: var(--ppm-font-mono, var(--font-code, ui-monospace, monospace));
    font-variant-numeric: tabular-nums;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-zoom {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-zoom > button {
    display: inline-grid;
    min-width: var(--ppm-control-height-sm, 1.75rem);
    height: var(--ppm-control-height-sm, 1.75rem);
    place-items: center;
    padding: 0 0.375rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-zoom > button:hover {
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-zoom > button:focus-visible {
    outline: none;
    box-shadow: var(--ppm-focus-ring, 0 0 0 2px var(--border-accent-strong));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-zoom svg {
    width: 1rem;
    height: 1rem;
  }

  @media (max-width: 680px) {
    :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline__sheet,
    :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline__time,
    :where(html[data-ppm-design="v2"]) .ppm-canvas-statusline__sep {
      display: none;
    }
  }

  /* C1 · Доска и пилюля «Доска · Объектов: N» (радиус full, рамка border-control, без тени) */
  :where(html[data-ppm-design="v2"]) .ppm-canvas-shell[data-ppm-canvas-grammar="v2"] {
    background: var(--ppm-color-board, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .tl-container {
    --color-background: var(--ppm-color-board, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-overlay-top {
    inset: var(--ppm-canvas-overlay-inset, 1rem);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-board-info__toggle {
    min-height: 1.75rem;
    padding: 0 0.625rem;
    border-color: var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-full, 999px);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    box-shadow: none;
    backdrop-filter: none;
    font-size: 0.75rem;
    font-weight: 500;
  }
  ```
  Специфичность: `:where(…)` даёт 0, поэтому `[data-ppm-canvas-grammar="v2"] .tl-container` (0,2,0) равен базовому
  `.ppm-canvas-shell .tl-container` (`canvas.css:2698`) и выигрывает порядком импорта.

- [ ] **Step 12: Прогнать тесты, типы, формат**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas tests/canvas tests/ppm-a11y
  ./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "ppm-canvas|ux11-canvas"; echo "grep-exit=$?"
  ../../node_modules/.bin/oxfmt core/components/ppm-canvas/{canvas-grammar.ts,canvas-zoom-store.ts,board-workspace-state.ts,commands.ts,editor.tsx,workspace.tsx,canvas-v2.css} tests/ppm-canvas/{status-line,canvas-v2-css}.test.ts
  cd .. && cd .. && node_modules/.bin/oxfmt packages/ppm-brand/src/translations/ux11-canvas.ts
  node_modules/.bin/oxlint apps/web/core/components/ppm-canvas
  cd packages/ppm-canvas && node scripts/audit-browser-boundary.mjs
  ```
  Ожидание: 16 старых файлов + 2 новых — PASS (96 + 12 тестов); `grep-exit=1` (ошибок линии C нет); oxlint 0 ошибок;
  `browser boundary audit passed`.

**Acceptance C1:**
- [ ] v2: «Лист 2 из 3 · Все изменения сохранены · 12:41» слева, «− · 100 % · + · Показать всё» справа (макет
  H-Canvas); версии нет (R5); у одной доски «Лист …» не показывается.
- [ ] Точный текст «Все изменения сохранены» — отдельный элемент; `.ppm-canvas-status__notice` в редакторе — один.
- [ ] «Приблизить/Отдалить» на странице ровно по одной кнопке (в v2 — в футере, в v1 — в рейке).
- [ ] Читатель сбрасывает масштаб; зум не перерисовывает workspace (React Profiler: при pinch рендерятся только
  `PpmCanvasZoomReporter` и `CanvasZoomResetButton`).
- [ ] v1: футер и рейка байт-в-байт как в волне 0; `data-ppm-canvas-grammar` отсутствует; минимальный режим без
  изменений разметки.

---

### Task C2: Слой смысловых связей на холсте

**Files:**
- Create: `apps/web/core/components/ppm-canvas/semantic-edge-geometry.ts`
- Create: `apps/web/core/components/ppm-canvas/semantic-edge-style.ts`
- Create: `apps/web/core/components/ppm-canvas/semantic-edges-layer.tsx`
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — импорты, состояние у `:252-253`, колбэки
  `:1950-1961`, `components` memo `:1963-2070`, провайдер у `:2122`, пропсы `CanvasControls` `:2224-2324`,
  монтирование панели `:2687-2699`, `SEMANTIC_RELATION_LABELS` `:3061-3071` (удалить), `SemanticEdgesPanel`
  `:3073-3300`
- Modify: `apps/web/core/components/ppm-canvas/workspace.tsx` — рейка после блока `capabilities.edit` (`:829-947`),
  палитра `:541-677`
- Modify: `apps/web/core/components/ppm-canvas/board-workspace-state.ts` (`READ_ONLY_COMMANDS_V2` из C1)
- Modify: `apps/web/core/components/ppm-canvas/canvas-v2.css`, `packages/ppm-brand/src/translations/ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/semantic-edge-geometry.test.ts`, `…/semantic-edge-style.test.ts` (новые),
  `…/canvas-v2-css.test.ts` (+1 `it`)

**Interfaces:**
- Consumes: `grammarV2`, `designV2` (C1); `semanticEdges`, `openSemanticPanel`, `closeSemanticPanel` (editor);
  токены `--ppm-color-link`, `--ppm-color-link-emphasis`, `--ppm-color-danger-line`, `--ppm-color-danger-text`,
  `--ppm-color-board`, `--ppm-link-width`, `--ppm-link-width-emphasis`, `--ppm-link-dash`, `--ppm-link-chip-height`.
- Produces: `buildSemanticEdgeGeometry`, `buildSemanticEdgeEnd`, `TPpmBox`; `SEMANTIC_EDGE_STYLE`,
  `SEMANTIC_RELATION_LABELS` (перенесены из editor), `semanticLinksForShape`, `visibleSemanticEdges`,
  `sameSemanticEdges`, `shouldShowEdgeChip`; `PpmSemanticEdgesContext`, `PpmSemanticEdgesLayer`; ключи
  `canvas.edge_proposed`, `canvas.edge_proposed_short`. Потребители — C6 (инспектор), C7 (основание решения).

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh \
    apps/web/core/components/ppm-canvas/semantic-edge-geometry.ts apps/web/core/components/ppm-canvas/semantic-edge-style.ts \
    apps/web/core/components/ppm-canvas/semantic-edges-layer.tsx apps/web/tests/ppm-canvas/semantic-edge-geometry.test.ts \
    apps/web/tests/ppm-canvas/semantic-edge-style.test.ts
  ```
  (Остальные файлы задачи уже сохранены в C1 — повторный вызов для них ничего не делает.)

- [ ] **Step 2: Падающие тесты**

  `apps/web/tests/ppm-canvas/semantic-edge-geometry.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import { buildSemanticEdgeEnd, buildSemanticEdgeGeometry } from "@/components/ppm-canvas/semantic-edge-geometry";

  const box = (x: number, y: number, w = 100, h = 100) => ({ x, y, w, h });

  describe("semantic edge geometry (R13)", () => {
    it("draws a straight horizontal line between cards on one row, from edge to edge", () => {
      const g = buildSemanticEdgeGeometry(box(0, 0), box(200, 20))!;
      expect(g.route).toBe("straight");
      expect(g.path).toBe("M 100 60 L 198 60");
      expect(g.start).toEqual({ x: 100, y: 60 });
      expect(g.endDirection).toEqual({ x: 1, y: 0 });
      expect(g.label).toEqual({ x: 149, y: 60 });
      expect(buildSemanticEdgeGeometry(box(200, 0), box(0, 0))!.path).toBe("M 200 50 L 102 50");
    });

    it("draws a straight vertical line between cards in one column", () => {
      const g = buildSemanticEdgeGeometry(box(0, 0), box(10, 200))!;
      expect(g.path).toBe("M 55 100 L 55 198");
      expect(g.endDirection).toEqual({ x: 0, y: 1 });
    });

    it("returns null for overlapping cards", () => {
      expect(buildSemanticEdgeGeometry(box(0, 0), box(50, 50))).toBeNull();
    });

    it("routes offset cards as one rounded elbow, horizontal first when dx dominates", () => {
      const g = buildSemanticEdgeGeometry(box(0, 0, 240, 168), box(272, 246, 200, 160))!;
      expect(g.route).toBe("elbow");
      expect(g.path).toBe("M 240 84 L 360 84 Q 372 84 372 96 L 372 244");
      expect(g.end).toEqual({ x: 372, y: 244 });
      expect(g.endDirection).toEqual({ x: 0, y: 1 });
      expect(g.label).toEqual({ x: 372, y: 164 });
      expect(g.labelSegmentLength).toBe(160);
    });

    it("routes vertical first when dy dominates", () => {
      const g = buildSemanticEdgeGeometry(box(0, 0), box(150, 300))!;
      expect(g.path).toBe("M 50 100 L 50 338 Q 50 350 62 350 L 148 350");
      expect(g.label).toEqual({ x: 50, y: 225 });
    });

    it("builds an open arrow, a perpendicular bar or nothing at the end", () => {
      expect(buildSemanticEdgeEnd({ x: 198, y: 60 }, { x: 1, y: 0 }, "arrow")).toBe("M 192 64.5 L 198 60 L 192 55.5");
      expect(buildSemanticEdgeEnd({ x: 372, y: 244 }, { x: 0, y: 1 }, "bar")).toBe("M 366.5 244 L 377.5 244");
      expect(buildSemanticEdgeEnd({ x: 0, y: 0 }, { x: 1, y: 0 }, "none")).toBeNull();
    });
  });
  ```

  `apps/web/tests/ppm-canvas/semantic-edge-style.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import type { TPpmCanvasSemanticEdge, TPpmCanvasSemanticRelationType } from "@ppm/canvas";
  import { getPpmTranslation } from "@ppm/brand";
  import { isCanvasCommandAllowedReadOnly } from "@/components/ppm-canvas/board-workspace-state";
  import {
    SEMANTIC_EDGE_STYLE,
    SEMANTIC_RELATION_LABELS,
    sameSemanticEdges,
    semanticLinksForShape,
    shouldShowEdgeChip,
    visibleSemanticEdges,
  } from "@/components/ppm-canvas/semantic-edge-style";

  const TYPES = ["relates_to", "depends_on", "blocks", "explains", "implements", "evidence_for", "contradicts", "derived_from", "result_of"];

  const edge = (
    id: string,
    from: string,
    to: string,
    relation: TPpmCanvasSemanticRelationType,
    status: TPpmCanvasSemanticEdge["confirmation_status"] = "confirmed"
  ): TPpmCanvasSemanticEdge => ({
    edge_id: id,
    board_id: "board",
    from_shape_id: from,
    to_shape_id: to,
    relation_type: relation,
    label: null,
    confidence: null,
    origin: "user",
    confirmation_status: status,
    confirmed_by: null,
    confirmed_at: null,
    created_by: "user",
    created_at: "2026-09-24T10:00:00Z",
    updated_at: "2026-09-24T10:00:00Z",
  });

  describe("semantic edge style (UX1.1 C2)", () => {
    it("covers all nine relation types with a line ending and a label", () => {
      expect(Object.keys(SEMANTIC_EDGE_STYLE).sort()).toEqual([...TYPES].sort());
      expect(Object.keys(SEMANTIC_RELATION_LABELS).sort()).toEqual([...TYPES].sort());
    });

    it("reads the type without colour: bar blocks, dashed contradicts, arrows elsewhere", () => {
      const byEnd = (end: string) => TYPES.filter((type) => SEMANTIC_EDGE_STYLE[type as TPpmCanvasSemanticRelationType].end === end);
      expect(byEnd("bar")).toEqual(["blocks"]);
      expect(byEnd("none")).toEqual(["relates_to"]);
      expect(TYPES.filter((type) => SEMANTIC_EDGE_STYLE[type as TPpmCanvasSemanticRelationType].dashed)).toEqual(["contradicts"]);
      expect(TYPES.filter((type) => SEMANTIC_EDGE_STYLE[type as TPpmCanvasSemanticRelationType].tone === "danger")).toEqual([
        "blocks",
        "contradicts",
      ]);
    });

    it("keeps the existing relation labels and drops «ИИ» from the proposed state (R16)", () => {
      const ru = (type: TPpmCanvasSemanticRelationType) => getPpmTranslation("ru", SEMANTIC_RELATION_LABELS[type]);
      expect([ru("blocks"), ru("depends_on"), ru("implements"), ru("evidence_for"), ru("contradicts")]).toEqual([
        "Блокирует",
        "Зависит от",
        "Реализует",
        "Подтверждает",
        "Противоречит",
      ]);
      expect(getPpmTranslation("ru", "canvas.edge_proposed")).toBe("Предложено — требуется подтверждение");
      expect(getPpmTranslation("ru", "canvas.edge_proposed_short")).toBe("Предложено");
      expect(getPpmTranslation("ru", "canvas.edge_proposed")).not.toContain("ИИ");
    });

    it("hides chips on segments shorter than the chip", () => {
      expect(shouldShowEdgeChip(40, "Блокирует")).toBe(false);
      expect(shouldShowEdgeChip(200, "Блокирует")).toBe(true);
    });

    it("skips rejected edges and lists a card's links with direction", () => {
      const edges = [edge("1", "shape:a", "shape:b", "blocks"), edge("2", "shape:c", "shape:a", "implements"), edge("3", "shape:a", "shape:d", "depends_on", "rejected")];
      expect(visibleSemanticEdges(edges).map((item) => item.edge_id)).toEqual(["1", "2"]);
      expect(semanticLinksForShape(edges, "shape:a").map((link) => [link.edge.edge_id, link.direction, link.otherShapeId])).toEqual([
        ["1", "out", "shape:b"],
        ["2", "in", "shape:c"],
      ]);
      expect(sameSemanticEdges(edges, [...edges])).toBe(true);
      expect(sameSemanticEdges(edges, [edges[0], { ...edges[1], confirmation_status: "rejected" }, edges[2]])).toBe(false);
    });

    it("opens the read-only link list for viewers only in v2 (R12)", () => {
      expect(isCanvasCommandAllowedReadOnly("semantic-edges", true)).toBe(true);
      expect(isCanvasCommandAllowedReadOnly("semantic-edges", false)).toBe(false);
    });
  });
  ```
  В `canvas-v2-css.test.ts` внутри `describe` добавить:
  ```ts
  it("draws edges under cards, with pointer events only on chips", () => {
    expect(ruleBody(`${G} .ppm-semantic-layer`)).toContain("pointer-events: none;");
    expect(ruleBody(`${G} .ppm-semantic-chip`)).toContain("pointer-events: all;");
    expect(ruleBody(`${G} .ppm-semantic-edge[data-dashed] .ppm-semantic-edge__line`)).toContain(
      "stroke-dasharray: var(--ppm-link-dash, 4 3);"
    );
    expect(ruleBody(`${G} .ppm-semantic-edge[data-tone="danger"]`)).toContain("--ppm-color-danger-line");
  });
  ```
  Запуск: `cd plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/semantic-edge-geometry.test.ts tests/ppm-canvas/semantic-edge-style.test.ts tests/ppm-canvas/canvas-v2-css.test.ts`
  → FAIL (`Cannot find module …/semantic-edge-geometry`, нет правил CSS).

- [ ] **Step 3: `semantic-edge-geometry.ts` (новый)**
  ```ts
  // UX1.1 · Смысловые связи: чистая геометрия маршрута в координатах страницы (без tldraw и React).
  // R13: прямая, если карточки на одной линии (общий отрезок проекций ≥ 24); иначе L-образная ломаная с одним
  // скруглённым изломом, выход — по стороне к цели. Обхода препятствий нет.
  export type TPpmBox = { x: number; y: number; w: number; h: number };
  export type TPpmPoint = { x: number; y: number };
  export type TPpmEdgeEnd = "arrow" | "bar" | "none";

  export type TPpmSemanticEdgeGeometry = {
    route: "straight" | "elbow";
    path: string;
    start: TPpmPoint;
    end: TPpmPoint;
    endDirection: TPpmPoint;
    label: TPpmPoint;
    labelSegmentLength: number;
  };

  export const SEMANTIC_EDGE_MIN_OVERLAP = 24;
  export const SEMANTIC_EDGE_ELBOW_RADIUS = 12;
  export const SEMANTIC_EDGE_END_GAP = 2;
  const ARROW_LENGTH = 6;
  const ARROW_HALF_WIDTH = 4.5;
  const BAR_HALF_LENGTH = 5.5;

  const round = (value: number) => Math.round(value * 100) / 100 || 0;
  const fmt = (point: TPpmPoint) => `${round(point.x)} ${round(point.y)}`;
  const distance = (a: TPpmPoint, b: TPpmPoint) => Math.hypot(b.x - a.x, b.y - a.y);
  const midpoint = (a: TPpmPoint, b: TPpmPoint): TPpmPoint => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const center = (box: TPpmBox): TPpmPoint => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 });

  function unit(from: TPpmPoint, to: TPpmPoint): TPpmPoint {
    const length = distance(from, to) || 1;
    return { x: (to.x - from.x) / length || 0, y: (to.y - from.y) / length || 0 };
  }

  function retract(point: TPpmPoint, direction: TPpmPoint, by: number): TPpmPoint {
    return { x: point.x - direction.x * by, y: point.y - direction.y * by };
  }

  function straight(start: TPpmPoint, rawEnd: TPpmPoint): TPpmSemanticEdgeGeometry {
    const endDirection = unit(start, rawEnd);
    const end = retract(rawEnd, endDirection, SEMANTIC_EDGE_END_GAP);
    return {
      route: "straight",
      path: `M ${fmt(start)} L ${fmt(end)}`,
      start,
      end,
      endDirection,
      label: midpoint(start, end),
      labelSegmentLength: distance(start, end),
    };
  }

  function elbow(start: TPpmPoint, corner: TPpmPoint, rawEnd: TPpmPoint): TPpmSemanticEdgeGeometry {
    const endDirection = unit(corner, rawEnd);
    const end = retract(rawEnd, endDirection, SEMANTIC_EDGE_END_GAP);
    const first = distance(start, corner);
    const second = distance(corner, end);
    const radius = Math.min(SEMANTIC_EDGE_ELBOW_RADIUS, first / 2, second / 2);
    const beforeCorner = retract(corner, unit(start, corner), radius);
    const afterCorner = { x: corner.x + endDirection.x * radius, y: corner.y + endDirection.y * radius };
    const [labelFrom, labelTo] = first >= second ? [start, corner] : [corner, end];
    return {
      route: "elbow",
      path: `M ${fmt(start)} L ${fmt(beforeCorner)} Q ${fmt(corner)} ${fmt(afterCorner)} L ${fmt(end)}`,
      start,
      end,
      endDirection,
      label: midpoint(labelFrom, labelTo),
      labelSegmentLength: Math.max(first, second),
    };
  }

  // Exit point of the ray from the box centre toward `toward` (fallback straight route for degenerate boxes).
  function exitPoint(box: TPpmBox, toward: TPpmPoint): TPpmPoint {
    const origin = center(box);
    const dx = toward.x - origin.x;
    const dy = toward.y - origin.y;
    const tx = dx === 0 ? Number.POSITIVE_INFINITY : box.w / 2 / Math.abs(dx);
    const ty = dy === 0 ? Number.POSITIVE_INFINITY : box.h / 2 / Math.abs(dy);
    const t = Math.min(tx, ty);
    return { x: origin.x + dx * t, y: origin.y + dy * t };
  }

  export function buildSemanticEdgeGeometry(from: TPpmBox, to: TPpmBox): TPpmSemanticEdgeGeometry | null {
    const fromRight = from.x + from.w;
    const fromBottom = from.y + from.h;
    const toRight = to.x + to.w;
    const toBottom = to.y + to.h;
    const overlapX = Math.min(fromRight, toRight) - Math.max(from.x, to.x);
    const overlapY = Math.min(fromBottom, toBottom) - Math.max(from.y, to.y);
    if (overlapX > 0 && overlapY > 0) return null;

    if (overlapY >= SEMANTIC_EDGE_MIN_OVERLAP) {
      const y = Math.max(from.y, to.y) + overlapY / 2;
      const forward = to.x >= fromRight;
      return straight({ x: forward ? fromRight : from.x, y }, { x: forward ? to.x : toRight, y });
    }
    if (overlapX >= SEMANTIC_EDGE_MIN_OVERLAP) {
      const x = Math.max(from.x, to.x) + overlapX / 2;
      const down = to.y >= fromBottom;
      return straight({ x, y: down ? fromBottom : from.y }, { x, y: down ? to.y : toBottom });
    }

    const a = center(from);
    const b = center(to);
    const horizontalFirst = (b.x > fromRight || b.x < from.x) && (a.y < to.y || a.y > toBottom);
    const verticalFirst = (b.y > fromBottom || b.y < from.y) && (a.x < to.x || a.x > toRight);
    const preferHorizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
    if (horizontalFirst && (preferHorizontal || !verticalFirst)) {
      return elbow(
        { x: b.x > a.x ? fromRight : from.x, y: a.y },
        { x: b.x, y: a.y },
        { x: b.x, y: b.y > a.y ? to.y : toBottom }
      );
    }
    if (verticalFirst) {
      return elbow(
        { x: a.x, y: b.y > a.y ? fromBottom : from.y },
        { x: a.x, y: b.y },
        { x: b.x > a.x ? to.x : toRight, y: b.y }
      );
    }
    return straight(exitPoint(from, b), exitPoint(to, a));
  }

  export function buildSemanticEdgeEnd(end: TPpmPoint, direction: TPpmPoint, kind: TPpmEdgeEnd): string | null {
    if (kind === "none") return null;
    const normal = { x: -direction.y || 0, y: direction.x || 0 };
    if (kind === "bar") {
      const a = { x: end.x + normal.x * BAR_HALF_LENGTH, y: end.y + normal.y * BAR_HALF_LENGTH };
      const b = { x: end.x - normal.x * BAR_HALF_LENGTH, y: end.y - normal.y * BAR_HALF_LENGTH };
      return `M ${fmt(a)} L ${fmt(b)}`;
    }
    const base = retract(end, direction, ARROW_LENGTH);
    const left = { x: base.x + normal.x * ARROW_HALF_WIDTH, y: base.y + normal.y * ARROW_HALF_WIDTH };
    const right = { x: base.x - normal.x * ARROW_HALF_WIDTH, y: base.y - normal.y * ARROW_HALF_WIDTH };
    return `M ${fmt(left)} L ${fmt(end)} L ${fmt(right)}`;
  }
  ```
  Проверка чисел теста «bar»: при `direction (0,1)` `normal = (-1, 0)` → `a = (366.5, 244)`, `b = (377.5, 244)`. ✓

- [ ] **Step 4: `semantic-edge-style.ts` (новый)** — перенос `SEMANTIC_RELATION_LABELS` из `editor.tsx:3061-3071`
  дословно:
  ```ts
  import type { TPpmCanvasSemanticEdge, TPpmCanvasSemanticRelationType } from "@ppm/canvas";
  import type { TPpmTranslationKey } from "@ppm/brand";
  import type { TPpmEdgeEnd } from "./semantic-edge-geometry";

  export type TPpmEdgeStyle = { end: TPpmEdgeEnd; dashed: boolean; tone: "neutral" | "danger" };

  // Тип читается по концу линии (TOKENS §9 п.5, §11; RC3). Порт — в начале каждой смысловой связи (рисует слой).
  export const SEMANTIC_EDGE_STYLE = {
    relates_to: { end: "none", dashed: false, tone: "neutral" },
    depends_on: { end: "arrow", dashed: false, tone: "neutral" },
    blocks: { end: "bar", dashed: false, tone: "danger" },
    explains: { end: "arrow", dashed: false, tone: "neutral" },
    implements: { end: "arrow", dashed: false, tone: "neutral" },
    evidence_for: { end: "arrow", dashed: false, tone: "neutral" },
    contradicts: { end: "arrow", dashed: true, tone: "danger" },
    derived_from: { end: "arrow", dashed: false, tone: "neutral" },
    result_of: { end: "arrow", dashed: false, tone: "neutral" },
  } as const satisfies Record<TPpmCanvasSemanticRelationType, TPpmEdgeStyle>;

  // R16: existing relation labels are kept; the panel and the canvas share one map.
  export const SEMANTIC_RELATION_LABELS = {
    relates_to: "canvas.semantic_relation_relates_to",
    depends_on: "canvas.semantic_relation_depends_on",
    blocks: "canvas.semantic_relation_blocks",
    explains: "canvas.semantic_relation_explains",
    implements: "canvas.semantic_relation_implements",
    evidence_for: "canvas.semantic_relation_evidence_for",
    contradicts: "canvas.semantic_relation_contradicts",
    derived_from: "canvas.semantic_relation_derived_from",
    result_of: "canvas.semantic_relation_result_of",
  } as const satisfies Record<TPpmCanvasSemanticRelationType, TPpmTranslationKey>;

  // Chips scale with the camera like cards: below 50 % they are illegible, the line ending still tells the type.
  export const SEMANTIC_EDGE_CHIP_MIN_ZOOM = 0.5;

  export function shouldShowEdgeChip(segmentLength: number, text: string): boolean {
    return segmentLength >= Math.ceil(text.length * 6.2) + 14 + 16;
  }

  export function visibleSemanticEdges(edges: readonly TPpmCanvasSemanticEdge[]): TPpmCanvasSemanticEdge[] {
    return edges.filter((edge) => edge.confirmation_status !== "rejected");
  }

  export type TPpmSemanticLink = { edge: TPpmCanvasSemanticEdge; direction: "out" | "in"; otherShapeId: string };

  export function semanticLinksForShape(edges: readonly TPpmCanvasSemanticEdge[], shapeId: string): TPpmSemanticLink[] {
    return visibleSemanticEdges(edges).flatMap((edge): TPpmSemanticLink[] => {
      if (edge.from_shape_id === shapeId) return [{ edge, direction: "out", otherShapeId: edge.to_shape_id }];
      if (edge.to_shape_id === shapeId) return [{ edge, direction: "in", otherShapeId: edge.from_shape_id }];
      return [];
    });
  }

  export function sameSemanticEdges(a: readonly TPpmCanvasSemanticEdge[], b: readonly TPpmCanvasSemanticEdge[]): boolean {
    return (
      a.length === b.length &&
      a.every(
        (edge, index) =>
          edge.edge_id === b[index].edge_id &&
          edge.updated_at === b[index].updated_at &&
          edge.confirmation_status === b[index].confirmation_status
      )
    );
  }
  ```

- [ ] **Step 5: `semantic-edges-layer.tsx` (новый)**
  ```tsx
  import { createContext, memo, useContext, type PointerEvent } from "react";
  import { SVGContainer, stopEventPropagation, useEditor, useValue, type TLShapeId } from "tldraw";
  import type { TPpmCanvasSemanticEdge } from "@ppm/canvas";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { buildSemanticEdgeEnd, buildSemanticEdgeGeometry } from "./semantic-edge-geometry";
  import {
    SEMANTIC_EDGE_CHIP_MIN_ZOOM,
    SEMANTIC_EDGE_STYLE,
    SEMANTIC_RELATION_LABELS,
    shouldShowEdgeChip,
    visibleSemanticEdges,
  } from "./semantic-edge-style";

  export type TPpmSemanticLayerValue = {
    edges: readonly TPpmCanvasSemanticEdge[];
    enabled: boolean;
    onOpenEdge: (edgeId: string) => void;
  };

  export const PpmSemanticEdgesContext = createContext<TPpmSemanticLayerValue>({
    edges: [],
    enabled: false,
    onOpenEdge: () => undefined,
  });

  // tldraw `OnTheCanvas` slot: already inside the camera-transformed html layer, so everything is drawn in page
  // coordinates and pan/zoom never re-renders React. A module-level component keeps a stable reference, so the
  // editor's components memo does not remount it (unlike InFrontOfTheCanvas).
  export function PpmSemanticEdgesLayer() {
    const { edges, enabled, onOpenEdge } = useContext(PpmSemanticEdgesContext);
    const editor = useEditor();
    const showChips = useValue(
      "ppm semantic edge chips",
      () => editor.getZoomLevel() >= SEMANTIC_EDGE_CHIP_MIN_ZOOM,
      [editor]
    );
    const selectedIds = useValue("ppm semantic edge selection", () => editor.getSelectedShapeIds(), [editor]);
    if (!enabled) return null;
    const visible = visibleSemanticEdges(edges);
    if (visible.length === 0) return null;
    const selected = new Set<string>(selectedIds);
    return (
      <div className="ppm-semantic-layer" aria-hidden="true">
        {visible.map((edge) => (
          <SemanticEdge
            edge={edge}
            emphasized={selected.has(edge.from_shape_id) || selected.has(edge.to_shape_id)}
            key={edge.edge_id}
            showChip={showChips}
            onOpenEdge={onOpenEdge}
          />
        ))}
      </div>
    );
  }

  const SemanticEdge = memo(function SemanticEdge({
    edge,
    emphasized,
    onOpenEdge,
    showChip,
  }: {
    edge: TPpmCanvasSemanticEdge;
    emphasized: boolean;
    onOpenEdge: (edgeId: string) => void;
    showChip: boolean;
  }) {
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    // Subscribes only to the page bounds of the two cards: dragging a card recomputes its own edges, nothing else.
    const geometry = useValue(
      `ppm semantic edge ${edge.edge_id}`,
      () => {
        const from = editor.getShapePageBounds(edge.from_shape_id as TLShapeId);
        const to = editor.getShapePageBounds(edge.to_shape_id as TLShapeId);
        return from && to
          ? buildSemanticEdgeGeometry({ x: from.x, y: from.y, w: from.w, h: from.h }, { x: to.x, y: to.y, w: to.w, h: to.h })
          : null;
      },
      [editor, edge.from_shape_id, edge.to_shape_id]
    );
    // Orphaned edge (a card was deleted) or overlapping cards: nothing to draw.
    if (!geometry) return null;
    const style = SEMANTIC_EDGE_STYLE[edge.relation_type];
    const relation = ppmT(SEMANTIC_RELATION_LABELS[edge.relation_type]);
    const chipText =
      edge.confirmation_status === "proposed" ? `${relation} · ${ppmT("canvas.edge_proposed_short")}` : relation;
    const endPath = buildSemanticEdgeEnd(geometry.end, geometry.endDirection, style.end);
    const onChipPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
      // Otherwise tldraw starts a brush selection under the chip.
      stopEventPropagation(event);
      if (event.button === 0) onOpenEdge(edge.edge_id);
    };
    return (
      <>
        <SVGContainer
          className="ppm-semantic-edge"
          data-confirmation={edge.confirmation_status}
          data-dashed={style.dashed || undefined}
          data-emphasized={emphasized || undefined}
          data-relation={edge.relation_type}
          data-tone={style.tone}
        >
          <path className="ppm-semantic-edge__line" d={geometry.path} />
          {endPath && <path className="ppm-semantic-edge__end" d={endPath} />}
          <circle className="ppm-semantic-edge__port" cx={geometry.start.x} cy={geometry.start.y} r={2.5} />
        </SVGContainer>
        {showChip && shouldShowEdgeChip(geometry.labelSegmentLength, chipText) && (
          <span
            className="ppm-semantic-chip"
            data-confirmation={edge.confirmation_status}
            data-emphasized={emphasized || undefined}
            data-tone={style.tone}
            style={{ left: geometry.label.x, top: geometry.label.y }}
            title={edge.label ? `${chipText}: ${edge.label}` : chipText}
            onPointerDown={onChipPointerDown}
          >
            {chipText}
          </span>
        )}
      </>
    );
  });
  ```

- [ ] **Step 6: `board-workspace-state.ts`** — в строке C1
  `const READ_ONLY_COMMANDS_V2: readonly string[] = [...READ_ONLY_COMMANDS_V1, "zoom-reset"];`
  добавить `"semantic-edges"` (R12). Комментарий над константой дополнить: «v2 adds zoom reset and the read-only
  semantic links list (R12).»

- [ ] **Step 7: `editor.tsx` — слой, фокус связи, R16, перечитывание**
  1. Импорты после строки `canvas-grammar` из C1:
     ```ts
     import { PpmSemanticEdgesContext, PpmSemanticEdgesLayer } from "./semantic-edges-layer";
     import { SEMANTIC_RELATION_LABELS, sameSemanticEdges } from "./semantic-edge-style";
     ```
     Удалить локальную константу `SEMANTIC_RELATION_LABELS` (`:3061-3071`) — остальной код панели ссылается на то же
     имя, значения идентичны.
  2. После `const semanticPanelFocusRef = useRef(false);` (`:253`):
     ```ts
     // UX1.1: the edge whose chip was clicked; the list highlights and scrolls to it. Lives here (not in the overlay).
     const [focusedEdgeId, setFocusedEdgeId] = useState<string>();
     ```
  3. `closeSemanticPanel` (`:1955-1961`): первой строкой тела добавить `setFocusedEdgeId(undefined);`. Сразу после
     `closeSemanticPanel` добавить:
     ```ts
     const openSemanticEdge = useCallback(
       (edgeId: string) => {
         setFocusedEdgeId(edgeId);
         openSemanticPanel();
       },
       [openSemanticPanel]
     );
     const semanticLayerValue = useMemo(
       () => ({ edges: semanticEdges, enabled: grammarV2, onOpenEdge: openSemanticEdge }),
       [grammarV2, openSemanticEdge, semanticEdges]
     );
     ```
  4. `components` memo (`:1963-2070`): после `...HIDDEN_TLDRAW_UI,` добавить
     `...(grammarV2 ? { OnTheCanvas: PpmSemanticEdgesLayer } : {}),`; в JSX `CanvasControls` добавить пропсы
     `designV2={designV2}` и `focusedEdgeId={focusedEdgeId}`; в массив зависимостей — `designV2`, `focusedEdgeId`,
     `grammarV2`. (Все три меняются редко: `designV2`/`grammarV2` постоянны на загрузку, `focusedEdgeId` — по клику.)
  5. Провайдер: внутри `<PpmWorkItemProjectionContext.Provider value={projectionContext}>` обернуть `<Tldraw>`:
     ```tsx
     <PpmSemanticEdgesContext.Provider value={semanticLayerValue}>
       <Tldraw …>…</Tldraw>
     </PpmSemanticEdgesContext.Provider>
     ```
  6. `CanvasControls`: в деструктуризацию (`:2224-2263`) и тип (`:2264-2324`) добавить
     `designV2: boolean;` и `focusedEdgeId?: string;`; в JSX панели (`:2688-2698`) — `designV2={designV2}` и
     `focusedEdgeId={focusedEdgeId}`.
  7. `SemanticEdgesPanel` (`:3073-3300`): в пропсы добавить `designV2: boolean; focusedEdgeId?: string;`. После
     `const sectionRef = useRef<HTMLElement>(null);` добавить:
     ```ts
     const focusedRowRef = useRef<HTMLLIElement>(null);
     useEffect(() => {
       if (focusedEdgeId) focusedRowRef.current?.scrollIntoView({ block: "nearest" });
     }, [focusedEdgeId]);
     ```
     Строка списка (было `<li key={edge.edge_id} data-confirmation={edge.confirmation_status}>`):
     ```tsx
     <li
       key={edge.edge_id}
       data-confirmation={edge.confirmation_status}
       data-focused={edge.edge_id === focusedEdgeId || undefined}
       ref={edge.edge_id === focusedEdgeId ? focusedRowRef : undefined}
     >
     ```
     Подпись «предложено» (было `{ppmT("canvas.semantic_edges_proposed")}`):
     ```tsx
     {ppmT(designV2 ? "canvas.edge_proposed" : "canvas.semantic_edges_proposed")}
     ```
  8. Перечитывание при возврате в окно (RC10) — новый эффект после эффекта `onSavedAtChange` из C1:
     ```ts
     useEffect(() => {
       // Semantic edges have no realtime channel: refresh them when the user comes back, active board only.
       if (!grammarV2) return;
       const onFocus = () => {
         const container = editorRef.current?.getContainer();
         if (!initializedRef.current || !container?.closest(".ppm-canvas-workspace__editor[data-active]")) return;
         void service.getSemanticEdges(workspaceId, projectId, boardId).then(
           (response) =>
             setSemanticEdges((current) =>
               sameSemanticEdges(current, response.semantic_edges) ? current : response.semantic_edges
             ),
           () => undefined
         );
       };
       window.addEventListener("focus", onFocus);
       return () => window.removeEventListener("focus", onFocus);
     }, [boardId, grammarV2, projectId, service, workspaceId]);
     ```

- [ ] **Step 8: `workspace.tsx` — связи для читателя (R12)**
  1. Рейка: сразу после закрывающего `)}` блока `{capabilities.edit && (…)}` (`:948`, перед `RailSectionLabel … canvas.view`):
     ```tsx
     {designV2 && !capabilities.edit && (
       <RailButton
         expanded={railExpanded}
         icon={Network}
         label={ppmT("canvas.semantic_edges")}
         onClick={() => runCanvasCommand("semantic-edges")}
       />
     )}
     ```
  2. Палитра (`:541-677`): после закрывающего `: []),` блока `...(activeBoardEditReady ? [ … ] : [])` с
     `undo/redo` (`:628`, перед `{ command: "fit-view", … }`) добавить
     ```ts
     ...(designV2 && !activeBoardEditReady
       ? [
           {
             command: "semantic-edges" as const,
             id: "semantic-edges",
             keywords: ["meaning", "relation"],
             label: ppmT("canvas.semantic_edges"),
           },
         ]
       : []),
     ```
     и `designV2` в массив зависимостей `useMemo` (`:677`).

- [ ] **Step 9: Переводы** — в `ux11-canvas.ts` добавить в `en`:
  `"canvas.edge_proposed": "Proposed — confirmation required", "canvas.edge_proposed_short": "Proposed",`
  и в `ru`: `"canvas.edge_proposed": "Предложено — требуется подтверждение", "canvas.edge_proposed_short": "Предложено",`.
  Затем `…/tools/ux11-pkg-build.sh ppm-brand`.

- [ ] **Step 10: CSS связей** — дописать в `canvas-v2.css`:
  ```css
  /* C2 · Смысловые связи: линии под карточками, порт в начале, тип — по концу линии (TOKENS §11) */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge {
    color: var(--ppm-color-link, var(--txt-tertiary));
    stroke-width: var(--ppm-link-width, 1.5px);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge__line,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge__end {
    fill: none;
    stroke: currentColor;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge__port {
    fill: currentColor;
    stroke: var(--ppm-color-board, var(--bg-surface-1));
    stroke-width: 1.5px;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge[data-tone="danger"] {
    color: var(--ppm-color-danger-line, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge[data-dashed] .ppm-semantic-edge__line {
    stroke-dasharray: var(--ppm-link-dash, 4 3);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge[data-confirmation="proposed"] .ppm-semantic-edge__line {
    stroke-dasharray: 2 3;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge[data-emphasized] {
    color: var(--ppm-color-link-emphasis, var(--txt-secondary));
    stroke-width: var(--ppm-link-width-emphasis, 2px);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edge[data-emphasized][data-tone="danger"] {
    color: var(--ppm-color-danger-line, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-chip {
    position: absolute;
    z-index: 1;
    display: inline-flex;
    height: var(--ppm-link-chip-height, 1.25rem);
    align-items: center;
    padding: 0 0.375rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-xs, 0.25rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1rem;
    white-space: nowrap;
    transform: translate(-50%, -50%);
    cursor: pointer;
    pointer-events: all;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-chip[data-emphasized] {
    border-color: var(--ppm-color-border-control, var(--border-subtle-1));
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-chip[data-tone="danger"] {
    border-color: var(--ppm-color-danger-line, var(--txt-danger-primary));
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-chip[data-confirmation="proposed"] {
    border-style: dashed;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-semantic-edges li[data-focused] {
    background: var(--ppm-color-selection-bg, var(--bg-accent-subtle));
    box-shadow: inset 2px 0 0 var(--ppm-color-selection, var(--border-accent-strong));
  }
  ```
  Чип `z-index: 1` — внутри контекста наложения `.tl-html-layer` (у него `transform`), ниже `.tl-shape`
  (z = индекс рендера), т. е. линии и чипы — под карточками, чип — над своей линией.

- [ ] **Step 11: Прогон**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas tests/canvas tests/ppm-a11y
  ./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "ppm-canvas|ux11-canvas"; echo "grep-exit=$?"
  ../../node_modules/.bin/oxfmt core/components/ppm-canvas/{semantic-edge-geometry.ts,semantic-edge-style.ts,semantic-edges-layer.tsx,board-workspace-state.ts,editor.tsx,workspace.tsx,canvas-v2.css} tests/ppm-canvas/{semantic-edge-geometry,semantic-edge-style,canvas-v2-css}.test.ts
  cd ../.. && node_modules/.bin/oxfmt packages/ppm-brand/src/translations/ux11-canvas.ts && node_modules/.bin/oxlint apps/web/core/components/ppm-canvas
  cd packages/ppm-canvas && node scripts/audit-browser-boundary.mjs
  cd ../ppm-brand && node scripts/audit-tailwind-classes.mjs
  ```
  Ожидание: всё PASS; `grep-exit=1`; аудит классов PASS (при условии, что F добавил `canvas-v2.css` в
  `customCssFiles`, см. `plan-C-needs.md` §1; иначе новые классы `ppm-semantic-*` попадут в notes/violations —
  остановиться и сообщить контроллеру).

**Acceptance C2:**
- [ ] Все 9 типов рисуются с правильным концом: ⊣ «Блокирует» (красная), пунктир + стрелка «Противоречит»
  (красная), стрелка у остальных направленных, «Связано с» — без конца; у каждой — порт в начале; чип на линии,
  линия видна по обе стороны чипа (spec §E, критерий 4).
- [ ] Связи выделенной карточки — 2 px и `link-emphasis`, красные остаются красными; предложенные — пунктир и чип
  «… · Предложено»; отклонённые не рисуются; «осиротевшие» молча пропускаются.
- [ ] Маршрут: прямая при общей проекции ≥ 24, иначе один скруглённый излом (R13).
- [ ] Клик по чипу открывает «Смысловые связи» с подсвеченной строкой; brush-выделение не начинается.
- [ ] Читатель видит линии и открывает список (без формы и кнопок правки) из рейки, палитры и чипа (R12).
- [ ] Pan/zoom: слой не рендерится (кроме перехода через 0,5); данные доски не меняются, версия не создаётся.
- [ ] Панель: «Предложено — требуется подтверждение» при v2, прежний текст при v1 (R16).

---

### Task C3: Живые карточки источников (шапка источника, знак «три узла», «Открыть ↗»)

**Files:**
- Create: `apps/web/core/components/ppm-canvas/live-card.tsx`
- Modify: `apps/web/core/components/ppm-canvas/canvas-grammar.ts` (дописать)
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx` — импорты `:7-78`, `indicator()` `:201-203`,
  `GitReferenceCard` `:1271-1349`, `WorkItemProjectionCard` `:2022-2175`, `ContentProjectionCard` `:2177-2248`,
  `MediaProjectionCard` `:2250-2382`
- Modify: `apps/web/core/components/ppm-canvas/canvas-v2.css`, `packages/ppm-brand/src/translations/ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/card-grammar.test.ts` (новый), `…/canvas-v2-css.test.ts` (+1 `it`)

**Interfaces:**
- Consumes: `usePpmCanvasGrammarV2()` (C1); `PpmWorkItemProjectionContext`; ключи `project.tasks`,
  `project.knowledge`, `project.collaborative_pages`, `project.code`, `canvas.remove_projection`; токены
  `--ppm-color-card-live`, `--ppm-color-card-own`, `--ppm-color-accent`, `--ppm-type-*`, `--ppm-radius-md`,
  `--ppm-canvas-card-footer-height`, `--ppm-font-stretch-narrow`, `--ppm-control-height-sm`.
- Produces: `LiveGlyph`, `LiveSourceHeader`, `LiveOpenLink` (C6 использует `LiveGlyph`); в `canvas-grammar.ts` —
  `liveSourceForEntity`, `LIVE_SOURCE_LABEL_KEYS`, `LIVE_SOURCE_OPEN_KEYS`, `shouldNarrowTitle`,
  `nodeIndicatorRadius`; класс `.ppm-live-card`; ключи `canvas.live_card`, `canvas.live_card_hint`,
  `canvas.open_short`, `canvas.open_in_{tasks,knowledge,pages,code}`, `canvas.unassigned`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh \
    apps/web/core/components/ppm-canvas/live-card.tsx apps/web/core/components/ppm-canvas/shape.tsx \
    apps/web/tests/ppm-canvas/card-grammar.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/card-grammar.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    LIVE_SOURCE_LABEL_KEYS,
    LIVE_SOURCE_OPEN_KEYS,
    liveSourceForEntity,
    nodeIndicatorRadius,
    shouldNarrowTitle,
  } from "@/components/ppm-canvas/canvas-grammar";

  const shapeSource = readFileSync(new URL("../../core/components/ppm-canvas/shape.tsx", import.meta.url), "utf8");

  describe("live card grammar (UX1.1 C3)", () => {
    it("maps every projection to its PPM section", () => {
      expect(["work_item", "attachment"].map((type) => liveSourceForEntity(type as "work_item"))).toEqual(["tasks", "tasks"]);
      expect(liveSourceForEntity("vault_file")).toBe("knowledge");
      expect(liveSourceForEntity("page")).toBe("pages");
      expect(["repository", "branch", "commit", "pull_request"].map((type) => liveSourceForEntity(type as "commit"))).toEqual([
        "code",
        "code",
        "code",
        "code",
      ]);
      expect(getPpmTranslation("ru", LIVE_SOURCE_LABEL_KEYS.tasks)).toBe("Задачи");
      expect(getPpmTranslation("ru", LIVE_SOURCE_LABEL_KEYS.knowledge)).toBe("Хранилище");
    });

    it("names the open link after the object and the section", () => {
      expect(getPpmTranslation("ru", LIVE_SOURCE_OPEN_KEYS.tasks).replace("{name}", "ROBOT-12")).toBe("Открыть ROBOT-12 в Задачах");
      expect(getPpmTranslation("ru", LIVE_SOURCE_OPEN_KEYS.knowledge).replace("{name}", "«Схема захвата.pdf»")).toBe(
        "Открыть «Схема захвата.pdf» в Хранилище"
      );
      expect(getPpmTranslation("ru", "canvas.live_card")).toBe("Живая карточка");
      for (const key of Object.values(LIVE_SOURCE_OPEN_KEYS)) expect(getPpmTranslation("ru", key)).not.toMatch(/Vault|Page/);
    });

    it("narrows long titles before clamping", () => {
      expect(shouldNarrowTitle("Откалибровать датчик цвета", 360)).toBe(false);
      expect(shouldNarrowTitle("Откалибровать датчик цвета на стенде и записать поправки для всех четырёх режимов освещения", 360)).toBe(true);
    });

    it("keeps the selection outline in sync with the card radius", () => {
      expect(nodeIndicatorRadius(false, "note")).toBe(12);
      expect(nodeIndicatorRadius(true, "work_item_ref")).toBe(8);
      expect(nodeIndicatorRadius(true, "group")).toBe(0);
      expect(nodeIndicatorRadius(true, "frame")).toBe(0);
    });

    it("keeps the e2e anchors of the work item card", () => {
      expect(shapeSource).toContain('className="ppm-work-item-card');
      expect(shapeSource).toContain('aria-label={ppmT("canvas.work_item_state")}');
      expect(shapeSource).toMatch(/aria-label=\{grammarV2 \? ppmT\("canvas\.remove_projection"\) : undefined\}/);
    });
  });
  ```
  В `canvas-v2-css.test.ts` добавить:
  ```ts
  it("paints live cards as surface cards with an accent live glyph", () => {
    expect(ruleBody(`${G} .ppm-canvas-node:not(.ppm-canvas-node--fallback)`)).toContain("border-radius: var(--ppm-radius-md, 0.5rem);");
    expect(ruleBody(`${G} .ppm-live-glyph`)).toContain("var(--ppm-color-accent, var(--txt-accent-primary))");
  });
  ```
  Запуск → FAIL (`does not provide an export named 'liveSourceForEntity'`).

- [ ] **Step 3: `canvas-grammar.ts` — дописать**
  ```ts
  import type { TPpmTranslationKey } from "@ppm/brand";
  // (import добавить в начало файла, рядом с import из "react")

  export type TPpmLiveSource = "tasks" | "knowledge" | "pages" | "code";

  export const LIVE_SOURCE_LABEL_KEYS = {
    tasks: "project.tasks",
    knowledge: "project.knowledge",
    pages: "project.collaborative_pages",
    code: "project.code",
  } as const satisfies Record<TPpmLiveSource, TPpmTranslationKey>;

  export const LIVE_SOURCE_OPEN_KEYS = {
    tasks: "canvas.open_in_tasks",
    knowledge: "canvas.open_in_knowledge",
    pages: "canvas.open_in_pages",
    code: "canvas.open_in_code",
  } as const satisfies Record<TPpmLiveSource, TPpmTranslationKey>;

  export function liveSourceForEntity(
    entityType: "work_item" | "page" | "attachment" | "vault_file" | "repository" | "branch" | "commit" | "pull_request"
  ): TPpmLiveSource {
    if (entityType === "work_item" || entityType === "attachment") return "tasks";
    if (entityType === "vault_file") return "knowledge";
    if (entityType === "page") return "pages";
    return "code";
  }

  // «Сначала сужать, потом многоточие» без замеров в JS (notes/risk.md §3.5): эвристика по длине заголовка и ширине
  // карточки — 14 px Plex Sans ≈ 7,6 px на знак, две строки, запас 10 %.
  export function shouldNarrowTitle(title: string, cardWidth: number): boolean {
    return title.length > Math.floor(((cardWidth - 24) / 7.6) * 1.8);
  }

  // indicator() — метод ShapeUtil без React-контекста: радиус контура выделения совпадает с CSS карточки.
  export function nodeIndicatorRadius(grammarV2: boolean, kind: string | undefined): number {
    if (!grammarV2) return 12;
    return kind === "group" || kind === "frame" ? 0 : 8;
  }
  ```

- [ ] **Step 4: `live-card.tsx` (новый)**
  ```tsx
  import { ArrowUpRight, type LucideIcon } from "lucide-react";
  import { stopEventPropagation } from "tldraw";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import type { TPpmLiveSource } from "./canvas-grammar";

  // «Три узла» — знак живой карточки: данные приходят из источника (TOKENS §9 п.1: акцент — знак живой карточки).
  export function LiveGlyph() {
    const ppmT = usePpmTranslation();
    return (
      <span className="ppm-live-glyph" title={ppmT("canvas.live_card_hint")}>
        <svg viewBox="0 0 16 16" width="14" height="14" role="img" aria-label={ppmT("canvas.live_card")} fill="none">
          <path
            d="M3.75 3.75 12.25 8 5.25 12.25"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <circle cx="3.75" cy="3.75" r="2" fill="currentColor" />
          <circle cx="12.25" cy="8" r="2" fill="currentColor" />
          <circle cx="5.25" cy="12.25" r="2" fill="currentColor" />
        </svg>
      </span>
    );
  }

  export function LiveSourceHeader({
    icon: Icon,
    identifier,
    source,
    sourceLabel,
  }: {
    icon: LucideIcon;
    identifier?: string | null;
    source: TPpmLiveSource;
    sourceLabel: string;
  }) {
    return (
      <div className="ppm-live-card__header" data-source={source}>
        <Icon aria-hidden="true" className="ppm-live-card__source-icon" />
        <span className="ppm-live-card__source">{sourceLabel}</span>
        {identifier && <span className="ppm-live-card__id">{identifier}</span>}
        <LiveGlyph />
      </div>
    );
  }

  export function LiveOpenLink({ href, label }: { href: string; label: string }) {
    const ppmT = usePpmTranslation();
    return (
      <a
        className="ppm-live-card__open"
        href={href}
        aria-label={label}
        title={label}
        onClick={stopEventPropagation}
        onKeyDown={stopEventPropagation}
        onPointerDown={stopEventPropagation}
      >
        {ppmT("canvas.open_short")}
        <ArrowUpRight aria-hidden="true" />
      </a>
    );
  }
  ```

- [ ] **Step 5: `shape.tsx` — импорты и контур выделения**
  1. В `lucide-react` (`:19-32`) добавить `Archive, FileText, FolderGit2, GitBranch, GitCommitHorizontal,
     GitPullRequest, Paperclip, SquareCheck`. После `import { usePpmTranslation } … ;` (`:77`):
     ```ts
     import {
       LIVE_SOURCE_LABEL_KEYS,
       LIVE_SOURCE_OPEN_KEYS,
       liveSourceForEntity,
       nodeIndicatorRadius,
       shouldNarrowTitle,
       usePpmCanvasGrammarV2,
     } from "./canvas-grammar";
     import { LiveOpenLink, LiveSourceHeader } from "./live-card";
     ```
  2. `indicator()` (`:201-203`). Было `return <rect height={shape.props.h} rx={12} ry={12} width={shape.props.w} />;`.
     Стало:
     ```tsx
     override indicator(shape: TPpmCanvasShape) {
       // No React context here: read the grammar from the DOM so the outline matches canvas-v2.css exactly.
       const grammarV2 = Boolean(this.editor.getContainer().closest('[data-ppm-canvas-grammar="v2"]'));
       const parsed = grammarV2 ? parseSerializedPpmCanvasNode(shape.props.node) : undefined;
       const node = parsed && (parsed.status === "valid" || parsed.status === "migrated") ? parsed.node : undefined;
       const radius = nodeIndicatorRadius(grammarV2, node?.kind);
       return <rect height={shape.props.h} rx={radius} ry={radius} width={shape.props.w} />;
     }
     ```
     (При v1 и в минимальном режиме — `rx=12`, как раньше; разбор ноды только при v2.)

- [ ] **Step 6: `WorkItemProjectionCard` (`:2022-2175`)**
  1. После `const error = projectionContext.errorsByShapeId.get(shape.id);` добавить
     `const grammarV2 = usePpmCanvasGrammarV2();` (до раннего `return` для загрузки — хуки выше условий).
  2. Корень (было `<div className="ppm-work-item-card" data-source-status={display.source_status}>`):
     ```tsx
     <div className={grammarV2 ? "ppm-work-item-card ppm-live-card" : "ppm-work-item-card"} data-source-status={display.source_status}>
     ```
  3. Шапка (было `<header>…<span className="ppm-work-item-card__source">PPM</span></header>`):
     ```tsx
     {grammarV2 ? (
       <>
         <LiveSourceHeader
           icon={SquareCheck}
           identifier={identity.identifier}
           source="tasks"
           sourceLabel={ppmT(LIVE_SOURCE_LABEL_KEYS.tasks)}
         />
         <strong className="ppm-live-card__title" data-narrow={shouldNarrowTitle(display.title, shape.props.w) || undefined}>
           {display.title}
         </strong>
       </>
     ) : (
       <header>
         <div>
           <span className="ppm-canvas-node__kind">{identity.identifier ?? ppmT("canvas.work_item")}</span>
           <strong>{display.title}</strong>
         </div>
         <span className="ppm-work-item-card__source">PPM</span>
       </header>
     )}
     ```
     Блок `__fields` (статус, приоритет, срок, исполнители) **не менять** (R4, e2e `getByLabel("Статус")`).
  4. Подвал (было `<footer>{identity.source_url && (<a …>…{ppmT("canvas.open_work_item")}</a>)}{projectionContext.canEdit && (<button …>…{ppmT("canvas.remove_projection")}</button>)}</footer>`):
     ```tsx
     <footer>
       {grammarV2 ? (
         <>
           <span className="ppm-live-card__meta">
             {display.assignees.map((assignee) => assignee.display_name).join(", ") || ppmT("canvas.unassigned")}
           </span>
           {identity.source_url && (
             <LiveOpenLink
               href={identity.source_url}
               label={ppmT(LIVE_SOURCE_OPEN_KEYS.tasks).replace("{name}", identity.identifier ?? display.title)}
             />
           )}
         </>
       ) : (
         identity.source_url && (
           <a href={identity.source_url} onClick={stopEventPropagation} onPointerDown={stopEventPropagation}>
             <ExternalLink aria-hidden="true" />
             {ppmT("canvas.open_work_item")}
           </a>
         )
       )}
       {projectionContext.canEdit && (
         <button
           type="button"
           aria-label={grammarV2 ? ppmT("canvas.remove_projection") : undefined}
           className={grammarV2 ? "ppm-live-card__remove" : undefined}
           disabled={projectionContext.pendingWorkItemIds.has(binding.entity_id)}
           title={grammarV2 ? ppmT("canvas.remove_projection") : undefined}
           onClick={() => projectionContext.onRemove(shape, binding)}
           onPointerDown={stopEventPropagation}
         >
           <Trash2 aria-hidden="true" />
           {!grammarV2 && ppmT("canvas.remove_projection")}
         </button>
       )}
     </footer>
     ```
     Имя кнопки при v2 — ровно «Убрать с холста» (иконка `aria-hidden`), e2e `exact:true` проходит.

- [ ] **Step 7: `ContentProjectionCard` (`:2177-2248`)**
  1. После `const fallbackUrl = node.source_url;` — `const grammarV2 = usePpmCanvasGrammarV2();`.
  2. После `const sourceLabel = CONTENT_SOURCE_LABELS[binding.entity_type];` — `const liveSource = liveSourceForEntity(binding.entity_type);`.
  3. Корень: `className={grammarV2 ? "ppm-canvas-node__content ppm-canvas-node__content--vault ppm-live-card" : "ppm-canvas-node__content ppm-canvas-node__content--vault"}`.
  4. Было `<span className="ppm-canvas-node__kind">{ppmT(sourceLabel)}</span>` и `<strong className="ppm-canvas-node__vault-title">…</strong>`. Стало:
     ```tsx
     {grammarV2 ? (
       <LiveSourceHeader
         icon={binding.entity_type === "page" ? FileText : binding.entity_type === "attachment" ? Paperclip : Archive}
         identifier={display.extension ? display.extension.slice(1).toUpperCase() : null}
         source={liveSource}
         sourceLabel={ppmT(LIVE_SOURCE_LABEL_KEYS[liveSource])}
       />
     ) : (
       <span className="ppm-canvas-node__kind">{ppmT(sourceLabel)}</span>
     )}
     <strong
       className={grammarV2 ? "ppm-live-card__title" : "ppm-canvas-node__vault-title"}
       data-narrow={grammarV2 && shouldNarrowTitle(display.title || fallbackTitle, shape.props.w) ? true : undefined}
     >
       {display.title || fallbackTitle}
     </strong>
     ```
  5. Мета-строка (было `{ppmT("canvas.source_version")} {binding.source_version ?? "—"}`): при v2 —
     `v{binding.source_version ?? "—"}` в `<span className="ppm-canvas-node__vault-meta ppm-live-card__version">`
     (при v1 строка без изменений):
     ```tsx
     <span className={grammarV2 ? "ppm-canvas-node__vault-meta ppm-live-card__version" : "ppm-canvas-node__vault-meta"}>
       {display.extension ? `${display.extension.slice(1).toUpperCase()} · ` : ""}
       {grammarV2 ? `v${binding.source_version ?? "—"}` : `${ppmT("canvas.source_version")} ${binding.source_version ?? "—"}`}
     </span>
     ```
  6. Подвал: ссылку `<a className="ppm-canvas-node__vault-link" …>` при v2 заменить на
     ```tsx
     <LiveOpenLink
       href={identity.source_url ?? fallbackUrl}
       label={ppmT(LIVE_SOURCE_OPEN_KEYS[liveSource]).replace("{name}", `«${display.title || fallbackTitle}»`)}
     />
     ```
     (условие показа прежнее); кнопку «Убрать с холста» — как в Step 6 (иконка + `aria-label` при v2).

- [ ] **Step 8: `MediaProjectionCard` (`:2250-2382`)** — после `const previewUrl = …;` добавить
  `const grammarV2 = usePpmCanvasGrammarV2();`. В `<header>` заменить
  `<span className="ppm-canvas-node__kind">{ppmT(MEDIA_KIND_LABELS[node.kind])}</span>` на
  ```tsx
  {grammarV2 ? (
    <LiveSourceHeader
      icon={binding.entity_type === "attachment" ? Paperclip : Archive}
      identifier={display.extension?.slice(1).toUpperCase() || null}
      source={liveSourceForEntity(binding.entity_type)}
      sourceLabel={ppmT(LIVE_SOURCE_LABEL_KEYS[liveSourceForEntity(binding.entity_type)])}
    />
  ) : (
    <span className="ppm-canvas-node__kind">{ppmT(MEDIA_KIND_LABELS[node.kind])}</span>
  )}
  ```
  В подвале при v2 ссылку «Открыть источник» заменить на `LiveOpenLink` (имя —
  `ppmT(LIVE_SOURCE_OPEN_KEYS[liveSourceForEntity(binding.entity_type)]).replace("{name}", `«${display.title || node.title}»`)`),
  кнопку «Убрать с холста» — иконкой с `aria-label` (как в Step 6); «Заменить файл» не менять. Корню
  `ppm-canvas-media` при v2 добавить класс `ppm-live-card--media`.

- [ ] **Step 9: `GitReferenceCard` (`:1271-1349`)** — после `const binding: … = …;` добавить
  `const grammarV2 = usePpmCanvasGrammarV2();` (до раннего `return`). В основном `return`:
  1. Корень: при v2 добавить класс `ppm-live-card`.
  2. Было `<span className="ppm-canvas-node__kind">{ppmT(GIT_OBJECT_LABELS[…])}</span>`. Стало:
     ```tsx
     {grammarV2 ? (
       <LiveSourceHeader
         icon={
           (display?.object_type ?? node.object_type) === "pull_request"
             ? GitPullRequest
             : (display?.object_type ?? node.object_type) === "branch"
               ? GitBranch
               : (display?.object_type ?? node.object_type) === "commit"
                 ? GitCommitHorizontal
                 : FolderGit2
         }
         identifier={
           (display?.object_type ?? node.object_type) === "commit"
             ? display?.commit_sha.slice(0, 7)
             : `${ppmT(GIT_OBJECT_LABELS[display?.object_type ?? node.object_type])}${display?.ref ? ` ${display.ref}` : ""}`
         }
         source="code"
         sourceLabel={ppmT(LIVE_SOURCE_LABEL_KEYS.code)}
       />
     ) : (
       <span className="ppm-canvas-node__kind">{ppmT(GIT_OBJECT_LABELS[display?.object_type ?? node.object_type])}</span>
     )}
     ```
  3. Ссылку «Открыть в Git» при v2 — `LiveOpenLink` с `ppmT(LIVE_SOURCE_OPEN_KEYS.code).replace("{name}", `«${display?.title ?? node.title}»`)`;
     кнопка «Убрать с холста» — как в Step 6. Состояние PR, автор, ветка — только из `display` (без проверок, R8).

- [ ] **Step 10: Переводы** — в `ux11-canvas.ts` добавить:
  - en: `"canvas.live_card": "Live card", "canvas.live_card_hint": "Live card: data comes from the source", "canvas.open_short": "Open", "canvas.open_in_tasks": "Open {name} in Tasks", "canvas.open_in_knowledge": "Open {name} in Knowledge", "canvas.open_in_pages": "Open {name} in Documents", "canvas.open_in_code": "Open {name} in Code", "canvas.unassigned": "Unassigned",`
  - ru: `"canvas.live_card": "Живая карточка", "canvas.live_card_hint": "Живая карточка: данные берутся из источника", "canvas.open_short": "Открыть", "canvas.open_in_tasks": "Открыть {name} в Задачах", "canvas.open_in_knowledge": "Открыть {name} в Хранилище", "canvas.open_in_pages": "Открыть {name} в Документах", "canvas.open_in_code": "Открыть {name} в Коде", "canvas.unassigned": "Не назначены",`
  Затем `…/tools/ux11-pkg-build.sh ppm-brand`.

- [ ] **Step 11: CSS живых карточек** — дописать в `canvas-v2.css`:
  ```css
  /* C3 · Общая рамка карточки (своя по умолчанию) и живые карточки источников (TOKENS §11, «Три семейства») */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node:not(.ppm-canvas-node--fallback) {
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-card-own, var(--bg-layer-1));
    box-shadow: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--work_item_ref,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--page_ref,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--attachment_ref,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--vault_file_ref,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--pdf,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--image,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--reference,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--git_ref {
    background: var(--ppm-color-card-live, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card {
    display: grid;
    height: 100%;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    gap: 0.5rem;
    padding: 0.75rem 0.75rem 0;
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__header {
    display: flex;
    min-width: 0;
    height: 1.25rem;
    align-items: center;
    gap: 0.375rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__source-icon {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
    color: var(--ppm-type-task, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__header[data-source="knowledge"] .ppm-live-card__source-icon {
    color: var(--ppm-type-file, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__header[data-source="pages"] .ppm-live-card__source-icon {
    color: var(--ppm-type-doc, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__header[data-source="code"] .ppm-live-card__source-icon {
    color: var(--ppm-type-code, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__source {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__id,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__version {
    min-width: 0;
    overflow: hidden;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-family: var(--ppm-font-mono, var(--font-code, ui-monospace, monospace));
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    text-overflow: ellipsis;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-glyph {
    display: inline-flex;
    flex: none;
    margin-left: auto;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__title {
    display: -webkit-box;
    overflow: hidden;
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.875rem;
    font-weight: 600;
    line-height: 1.25rem;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__title[data-narrow] {
    font-stretch: var(--ppm-font-stretch-narrow, 85%);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card > footer {
    display: flex;
    min-height: var(--ppm-canvas-card-footer-height, 2.25rem);
    align-items: center;
    gap: 0.5rem;
    margin: 0 -0.75rem;
    padding: 0 0.75rem;
    border-top: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__meta {
    min-width: 0;
    overflow: hidden;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__open {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__open svg {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__remove {
    display: inline-grid;
    width: 1.5rem;
    height: 1.5rem;
    flex: none;
    place-items: center;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-icon-subtle, var(--txt-tertiary));
  }

  /* Поля задачи — тихие «чипы-селекты» (R4: нативные контролы остаются, подписи — только для скринридера) */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__fields {
    grid-template-columns: repeat(3, minmax(0, max-content));
    gap: 0.25rem 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__fields label > span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__fields select,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__fields input {
    height: var(--ppm-control-height-sm, 1.75rem);
    border-color: transparent;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    background: transparent;
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__fields select:hover,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__fields input:hover {
    border-color: var(--ppm-color-border-control, var(--border-subtle-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-item-card__assignees select {
    height: 2.5rem;
  }
  ```
  Специфичность: у базовых `.ppm-work-item-card > footer a` (0,1,2) и `.ppm-work-item-card__fields label > span`
  (0,1,2) правила v2 имеют (0,2,x) и выше — выигрывают без `!important`.

- [ ] **Step 12: Прогон** — как в C2 Step 11 (плюс файлы `live-card.tsx`, `shape.tsx`, `canvas-grammar.ts`,
  `tests/ppm-canvas/card-grammar.test.ts`). Ожидание: PASS; `grep-exit=1`; аудит классов PASS; `oxlint` 0.

**Acceptance C3:**
- [ ] Задача, файл Хранилища, документ, вложение, PR: шапка «[иконка] Раздел · ID … [три узла]», знак с
  `aria-label` «Живая карточка» и подсказкой; «Открыть ↗» с именем вида «Открыть ROBOT-12 в Задачах» (spec §E).
- [ ] Бейджа «PPM» и слов «Page/Vault/проекция» в новых подписях нет.
- [ ] На карточке задачи — прежние `<select aria-label="Статус">`, приоритет, срок, исполнители, правка работает (R4);
  класс `.ppm-work-item-card`; кнопка «Убрать с холста» с точным именем.
- [ ] Контур выделения совпадает с радиусом 8 (v2) / 12 (v1 и минимальный режим); нет теней на нодах.
- [ ] v1 и минимальный режим — прежняя разметка карточек.

---

### Task C4: Свои карточки и секции (нейтральная подложка, цвет — глифом, засечки, «Название · N объектов»)

**Files:**
- Modify: `apps/web/core/components/ppm-canvas/canvas-grammar.ts`, `apps/web/core/components/ppm-canvas/live-card.tsx`
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx` — `NativeNodeCard` `:534-675`, импорты
- Modify: `apps/web/core/components/ppm-canvas/canvas-v2.css`, `packages/ppm-brand/src/translations/ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/card-grammar.test.ts` (+2 `it`), `…/canvas-v2-css.test.ts` (+1 `it`)

**Interfaces:**
- Consumes: `usePpmCanvasGrammarV2()`; `editor.getSortedChildIdsForParent` (tldraw `index.d.ts:2893`); токены
  `--ppm-color-card-own`, `--ppm-color-section-tick`, `--ppm-type-{file,task,decision,doc}`, `--ppm-color-icon-subtle`.
- Produces: `OWN_NODE_KIND_KEYS`, `sectionObjectCountKey(count, locale)`; `OwnNodeGlyph`; ключи `canvas.kind_*`,
  `canvas.section_objects_{one,few,many}`.

- [ ] **Step 1: Падающие тесты** — в `card-grammar.test.ts` дописать импорт `OWN_NODE_KIND_KEYS, sectionObjectCountKey`
  и блок:
  ```ts
  describe("own cards and sections (UX1.1 C4)", () => {
    it("labels own cards in sentence case by kind", () => {
      expect(getPpmTranslation("ru", OWN_NODE_KIND_KEYS.note)).toBe("Заметка");
      expect(getPpmTranslation("ru", OWN_NODE_KIND_KEYS.group)).toBe("Секция");
      expect(Object.keys(OWN_NODE_KIND_KEYS).sort()).toEqual(
        ["board_link", "checklist", "code", "deck", "diagram", "document", "frame", "group", "note", "table", "work_items_view"].sort()
      );
    });

    it("counts section objects with Russian and English plurals", () => {
      const ru = (count: number) => getPpmTranslation("ru", sectionObjectCountKey(count, "ru")).replace("{count}", String(count));
      expect([ru(1), ru(3), ru(7), ru(11), ru(21), ru(0)]).toEqual([
        "1 объект",
        "3 объекта",
        "7 объектов",
        "11 объектов",
        "21 объект",
        "0 объектов",
      ]);
      const en = (count: number) => getPpmTranslation("en", sectionObjectCountKey(count, "en")).replace("{count}", String(count));
      expect([en(1), en(21)]).toEqual(["1 object", "21 objects"]);
    });

    it("keeps the note title textbox name for e2e", () => {
      expect(shapeSource).toContain("aria-label={ppmT(NATIVE_NODE_LABELS[node.kind])}");
    });
  });
  ```
  В `canvas-v2-css.test.ts`:
  ```ts
  it("draws transparent sections with corner ticks", () => {
    const section = ruleBody(`${G} .ppm-canvas-node--group`);
    expect(section).toContain("background: transparent;");
    expect(section).toContain("border-radius: 0;");
    expect(ruleBody(`${G} .ppm-canvas-node--group::before`)).toContain("--ppm-color-section-tick");
  });
  ```
  Запуск → FAIL (`OWN_NODE_KIND_KEYS` не экспортирован).

- [ ] **Step 2: `canvas-grammar.ts` — дописать** (тип импортировать `import type { TPpmCanvasOwnedNodeKind } from "@ppm/canvas";`):
  ```ts
  export const OWN_NODE_KIND_KEYS = {
    note: "canvas.kind_note",
    document: "canvas.kind_document",
    checklist: "canvas.kind_checklist",
    table: "canvas.kind_table",
    code: "canvas.kind_code",
    group: "canvas.kind_section",
    frame: "canvas.kind_frame",
    board_link: "canvas.kind_board_link",
    work_items_view: "canvas.kind_work_items_view",
    diagram: "canvas.kind_diagram",
    deck: "canvas.kind_deck",
  } as const satisfies Record<TPpmCanvasOwnedNodeKind, TPpmTranslationKey>;

  export function sectionObjectCountKey(
    count: number,
    locale: string
  ): "canvas.section_objects_one" | "canvas.section_objects_few" | "canvas.section_objects_many" {
    const category = new Intl.PluralRules(locale || "ru").select(count);
    if (category === "one") return "canvas.section_objects_one";
    if (category === "few") return "canvas.section_objects_few";
    return "canvas.section_objects_many";
  }
  ```

- [ ] **Step 3: `live-card.tsx` — глиф своей карточки** (дописать; импорты lucide расширить `Code2, Columns3, Frame,
  Group, Link, ListChecks, Presentation, StickyNote, Table2, Workflow, FileText`):
  ```tsx
  const OWN_NODE_ICONS = {
    note: StickyNote,
    document: FileText,
    checklist: ListChecks,
    table: Table2,
    code: Code2,
    group: Group,
    frame: Frame,
    board_link: Link,
    work_items_view: Columns3,
    diagram: Workflow,
    deck: Presentation,
  } as const satisfies Record<TPpmCanvasOwnedNodeKind, LucideIcon>;

  // Своя карточка нейтральна; цвет visual.color — только у этого глифа (TOKENS §8, «цвет — только подсказка»).
  export function OwnNodeGlyph({ kind }: { kind: TPpmCanvasOwnedNodeKind }) {
    const Icon = OWN_NODE_ICONS[kind];
    return <Icon aria-hidden="true" className="ppm-canvas-node__type-icon" />;
  }
  ```
  (`import type { TPpmCanvasOwnedNodeKind } from "@ppm/canvas";`)

- [ ] **Step 4: `shape.tsx` — `NativeNodeCard` (`:534-675`)**
  1. Импорты: из `./canvas-grammar` добавить `OWN_NODE_KIND_KEYS, sectionObjectCountKey`; из `./live-card` —
     `OwnNodeGlyph`; `import { useTranslation } from "@plane/i18n";`.
  2. После `const collapsed = Boolean(node.visual.collapsed);`:
     ```ts
     const grammarV2 = usePpmCanvasGrammarV2();
     const { currentLocale } = useTranslation();
     const isSection = node.kind === "group" || node.kind === "frame";
     const childCount = useValue(
       "ppm section object count",
       () => (grammarV2 && isSection ? editor.getSortedChildIdsForParent(shape.id).length : 0),
       [editor, grammarV2, isSection, shape.id]
     );
     ```
  3. Подпись шапки (было `<span>{ppmT(NATIVE_NODE_LABELS[node.kind])}</span>`):
     ```tsx
     {grammarV2 ? (
       <span className="ppm-canvas-node__type">
         <OwnNodeGlyph kind={node.kind} />
         {ppmT(OWN_NODE_KIND_KEYS[node.kind])}
       </span>
     ) : (
       <span>{ppmT(NATIVE_NODE_LABELS[node.kind])}</span>
     )}
     ```
     Кнопки шапки (Свернуть/Дублировать/Удалить) не меняются и не прячутся (RC5).
  4. Инпут заголовка: `aria-label` оставить `ppmT(NATIVE_NODE_LABELS[node.kind])` (e2e «Новая заметка»); добавить
     `size={grammarV2 && isSection ? Math.min(48, Math.max(8, node.title.length + 1)) : undefined}`.
  5. Сразу после `<input … />` заголовка:
     ```tsx
     {grammarV2 && isSection && (
       <span className="ppm-canvas-section__count">
         <span aria-hidden="true">·</span>
         {ppmT(sectionObjectCountKey(childCount, currentLocale)).replace("{count}", String(childCount))}
       </span>
     )}
     ```

- [ ] **Step 5: Переводы** — `ux11-canvas.ts`:
  - en: `"canvas.kind_note": "Note", "canvas.kind_document": "Document", "canvas.kind_checklist": "Checklist", "canvas.kind_table": "Table", "canvas.kind_code": "Code", "canvas.kind_section": "Section", "canvas.kind_frame": "Frame", "canvas.kind_board_link": "Board link", "canvas.kind_work_items_view": "Task board", "canvas.kind_diagram": "Diagram", "canvas.kind_deck": "Presentation", "canvas.section_objects_one": "{count} object", "canvas.section_objects_few": "{count} objects", "canvas.section_objects_many": "{count} objects",`
  - ru: `"canvas.kind_note": "Заметка", "canvas.kind_document": "Документ", "canvas.kind_checklist": "Чек-лист", "canvas.kind_table": "Таблица", "canvas.kind_code": "Код", "canvas.kind_section": "Секция", "canvas.kind_frame": "Рамка", "canvas.kind_board_link": "Ссылка на доску", "canvas.kind_work_items_view": "Доска задач", "canvas.kind_diagram": "Схема", "canvas.kind_deck": "Презентация", "canvas.section_objects_one": "{count} объект", "canvas.section_objects_few": "{count} объекта", "canvas.section_objects_many": "{count} объектов",`
  Затем `…/tools/ux11-pkg-build.sh ppm-brand`.

- [ ] **Step 6: CSS** — дописать в `canvas-v2.css`:
  ```css
  /* C4 · Свои карточки: нейтральная подложка (рамка — из C3), подпись типа в sentence case, цвет — глиф */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node__chrome {
    min-height: 2rem;
    padding: 0.375rem 0.375rem 0 0.75rem;
    border-bottom: 0;
    background: transparent;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node__type {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 0.375rem;
    overflow: hidden;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node__type-icon {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
    color: var(--ppm-color-icon-subtle, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--yellow .ppm-canvas-node__type-icon {
    color: var(--ppm-type-file, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--cyan .ppm-canvas-node__type-icon {
    color: var(--ppm-type-task, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--green .ppm-canvas-node__type-icon {
    color: var(--ppm-type-decision, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--violet .ppm-canvas-node__type-icon {
    color: var(--ppm-type-doc, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node__chrome button {
    color: var(--ppm-color-icon-subtle, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node__chrome button:hover {
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node__native > .ppm-canvas-node__title {
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.875rem;
    font-weight: 600;
  }

  /* C4 · Секции: прозрачные, прямые углы, угловые засечки 12×2 (TOKENS §6), подпись «Название · N объектов» */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--group,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--frame {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--group::before,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--frame::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) top left / 12px 2px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) top left / 2px 12px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) top right / 12px 2px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) top right / 2px 12px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) bottom left / 12px 2px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) bottom left / 2px 12px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) bottom right / 12px 2px no-repeat,
      linear-gradient(var(--ppm-color-section-tick, var(--border-strong)), var(--ppm-color-section-tick, var(--border-strong))) bottom right / 2px 12px no-repeat;
    pointer-events: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--group .ppm-canvas-node__native,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--frame .ppm-canvas-node__native {
    grid-template-columns: max-content minmax(0, 1fr);
    align-items: baseline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--group .ppm-canvas-node__chrome,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--frame .ppm-canvas-node__chrome,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--group .ppm-canvas-node__native-content,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--frame .ppm-canvas-node__native-content {
    grid-column: 1 / -1;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--group .ppm-canvas-node__type,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--frame .ppm-canvas-node__type {
    visibility: hidden;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-section__count {
    display: inline-flex;
    gap: 0.375rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    white-space: nowrap;
  }
  ```
  (Подпись типа у секций скрыта `visibility`, чтобы высота шапки и кнопки остались на месте. Засечки —
  псевдоэлемент в масштабе страницы, без `calc(… / var(--tl-zoom))` — risk §3.5.)

- [ ] **Step 7: Прогон** — как в C2 Step 11 (файлы C4). Ожидание: PASS.

**Acceptance C4:**
- [ ] Заметка/документ/чек-лист и др.: подложка `card-own`, рамка 1 px, радиус 8, без тени; подпись «Заметка» в
  sentence case с глифом цвета типа; `visual.color` в данных не меняется.
- [ ] Секции прозрачные, прямые углы, 4 угловые засечки, «Захват и сортировка · 7 объектов» с правильным числом
  (обновляется при добавлении/удалении детей); линии связей под секцией не приглушены.
- [ ] Textbox «Новая заметка» и `.ppm-canvas-node--note input.ppm-canvas-node__title` на месте; кнопки шапки
  доступны без наведения.

---

### Task C5: Карточка «Найдено поиском» (фрагмент, чипы-цитаты, честная метка устаревания)

**Files:**
- Create: `apps/web/core/components/ppm-canvas/citation-format.ts`
- Modify: `apps/web/core/components/ppm-canvas/brain-panel.tsx:2972-2984` (удалить `formatLocator`, импорт вместо него)
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx` — `NodeEditor` `:246-251`, ветка `search` `:287-320`,
  новый компонент после `NodeEditor`
- Modify: `apps/web/core/components/ppm-canvas/canvas-v2.css`, `packages/ppm-brand/src/translations/ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/citation-format.test.ts` (новый), `…/canvas-v2-css.test.ts` (+1 `it`)

**Interfaces:**
- Consumes: `TPpmCanvasSearchNode.results[]` (`index.ts:352-362`, `:411-425`), `PpmWorkItemProjectionContext.bindingsByShapeId`;
  форматы версий из API: Хранилище — результат `"{N}:{hash}"` (`ppm_brain/adapters.py:217,244`), привязка `"{N}"`
  (`ppm_canvas/services.py:691-694`); задача — ISO `updated_at` в обоих (`adapters.py:125`, `services.py:538-539`).
- Produces: `formatLocator` (перенос 1:1), `citationParts`, `isCitationStale`; ключи `canvas.found_*`, `canvas.citation_*`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh \
    apps/web/core/components/ppm-canvas/citation-format.ts apps/web/core/components/ppm-canvas/brain-panel.tsx \
    apps/web/tests/ppm-canvas/citation-format.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/citation-format.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import type { TPpmCanvasBinding, TPpmCanvasSearchResult } from "@ppm/canvas";
  import { getPpmTranslation } from "@ppm/brand";
  import { citationParts, formatLocator, isCitationStale } from "@/components/ppm-canvas/citation-format";

  const result = (patch: Partial<TPpmCanvasSearchResult>): TPpmCanvasSearchResult => ({
    result_id: "r1",
    source_id: "11111111-1111-4111-8111-111111111111",
    source_type: "vault_file",
    source_version: "2:abc",
    source_url: "/ws/projects/p/knowledge/x",
    title: "Схема захвата.pdf",
    excerpt: "Сравнили на 120 деталях",
    score: 1,
    locator: { kind: "vault_pdf", path: "Схема захвата.pdf", page: 2 },
    ...patch,
  });
  const binding = (entity_type: string, source_version: string | null, entity_id = "11111111-1111-4111-8111-111111111111") =>
    ({ entity_id, entity_type, source_version }) as TPpmCanvasBinding;

  describe("citation format (UX1.1 C5)", () => {
    it("keeps the brain panel locator text unchanged", () => {
      expect(formatLocator({ identifier: "ROBOT-7" })).toBe("Задача ROBOT-7");
      expect(formatLocator({ path: "docs/Схема.pdf", page: 2 })).toBe("docs/Схема.pdf, страница 2");
      expect(formatLocator({ kind: "git_code", path: "src/a.ts", line_start: 14, line_end: 22, commit_sha: "abcdef1234567890" })).toBe(
        "src/a.ts, строки 14–22 · abcdef123456"
      );
      expect(formatLocator({ path: "notes/x.md" })).toBe("notes/x.md");
      expect(formatLocator({})).toBe("Источник проекта");
      const panel = readFileSync(new URL("../../core/components/ppm-canvas/brain-panel.tsx", import.meta.url), "utf8");
      expect(panel).not.toMatch(/function formatLocator/);
      expect(panel).toContain('import { formatLocator } from "./citation-format";');
    });

    it("builds chip parts: number · source · locator · version", () => {
      expect(citationParts(result({}))).toEqual({ title: "Схема захвата.pdf", page: 2, lines: null, version: "v2" });
      expect(
        citationParts(result({ source_type: "work_item", title: "ROBOT-7 · Выбрать датчик", source_version: "2026-09-20T10:00:00+00:00", locator: { kind: "work_item", identifier: "ROBOT-7" } }))
      ).toEqual({ title: "ROBOT-7", page: null, lines: null, version: null });
      expect(
        citationParts(result({ source_type: "git_code", title: "a.ts", source_version: "abcdef1234567:hash", locator: { kind: "git_code", path: "src/lib/a.ts", line_start: 14, line_end: 22 } }))
      ).toEqual({ title: "a.ts", page: null, lines: "14–22", version: "abcdef1" });
      expect(getPpmTranslation("ru", "canvas.citation_page").replace("{page}", "2")).toBe("стр. 2");
    });

    it("marks a citation stale only against a live card of the same source with another version (R17)", () => {
      expect(isCitationStale(result({}), [binding("vault_file", "3")])).toBe(true);
      expect(isCitationStale(result({ source_version: "3:def" }), [binding("vault_file", "3")])).toBe(false);
      expect(isCitationStale(result({}), [binding("vault_file", "3", "22222222-2222-4222-8222-222222222222")])).toBe(false);
      expect(isCitationStale(result({}), [])).toBe(false);
      const task = result({ source_type: "work_item", source_version: "2026-09-20T10:00:00+00:00" });
      expect(isCitationStale(task, [binding("work_item", "2026-09-22T08:00:00+00:00")])).toBe(true);
      expect(isCitationStale(task, [binding("work_item", "2026-09-20T10:00:00+00:00")])).toBe(false);
      expect(isCitationStale(result({ source_type: "git_code", source_version: "abc:1" }), [binding("pull_request", "x")])).toBe(false);
      expect(getPpmTranslation("ru", "canvas.citation_stale")).toBe("изменился после поиска");
    });
  });
  ```
  В `canvas-v2-css.test.ts`:
  ```ts
  it("frames found-by-search cards with a dashed border of at least 3:1", () => {
    expect(ruleBody(`${G} .ppm-canvas-node--search`)).toContain("border: 1px dashed var(--ppm-color-card-found-border, var(--border-subtle-1));");
  });
  ```
  Запуск → FAIL.

- [ ] **Step 3: `citation-format.ts` (новый)**
  ```ts
  import type { TPpmCanvasBinding, TPpmCanvasSearchResult } from "@ppm/canvas";

  // Moved verbatim from brain-panel.tsx:2972-2984 — the "Find in project" panel and the canvas card share it.
  export function formatLocator(locator: Record<string, string | number>) {
    if (locator.identifier) return `Задача ${locator.identifier}`;
    if (locator.page) return `${locator.path ?? "PDF"}, страница ${locator.page}`;
    if (locator.kind === "git_code" && locator.path) {
      const lines = locator.line_start
        ? `, строки ${locator.line_start}${locator.line_end ? `–${locator.line_end}` : ""}`
        : "";
      const commit = locator.commit_sha ? ` · ${String(locator.commit_sha).slice(0, 12)}` : "";
      return `${locator.path}${lines}${commit}`;
    }
    if (locator.path) return String(locator.path);
    return "Источник проекта";
  }

  export type TPpmCitationParts = { title: string; page: number | null; lines: string | null; version: string | null };

  export function citationParts(result: TPpmCanvasSearchResult): TPpmCitationParts {
    const { locator } = result;
    if (result.source_type === "work_item") {
      return { title: String(locator.identifier ?? result.title), page: null, lines: null, version: null };
    }
    if (result.source_type === "git_code") {
      const path = String(locator.path ?? result.title);
      const start = Number(locator.line_start) || null;
      const end = Number(locator.line_end) || null;
      const lines = start ? (end && end !== start ? `${start}–${end}` : String(start)) : null;
      const sha = result.source_version.split(":")[0];
      return {
        title: path.split("/").pop() || path,
        page: null,
        lines,
        version: /^[0-9a-f]{7,40}$/i.test(sha) ? sha.slice(0, 7) : null,
      };
    }
    const page = Number(locator.page) || null;
    const number = result.source_version.split(":")[0];
    return { title: result.title, page, lines: null, version: /^\d+$/.test(number) ? `v${number}` : null };
  }

  // R17: "changed after the search" only when this board holds a live card of the same source whose version differs.
  export function isCitationStale(result: TPpmCanvasSearchResult, bindings: Iterable<TPpmCanvasBinding>): boolean {
    for (const binding of bindings) {
      if (binding.entity_id !== result.source_id || !binding.source_version) continue;
      if (result.source_type === "vault_file" && binding.entity_type === "vault_file") {
        const found = result.source_version.split(":")[0];
        return /^\d+$/.test(found) && /^\d+$/.test(binding.source_version) && found !== binding.source_version;
      }
      if (result.source_type === "work_item" && binding.entity_type === "work_item") {
        return result.source_version !== binding.source_version;
      }
    }
    return false;
  }
  ```

- [ ] **Step 4: `brain-panel.tsx`** — удалить функцию `formatLocator` (`:2972-2984`), добавить к импортам файла
  `import { formatLocator } from "./citation-format";` (три вызова `:2655`, `:2769`, `:2821` не меняются).

- [ ] **Step 5: `shape.tsx` — карточка «Найдено поиском»**
  1. Импорты: `Search` в `lucide-react`; `import { citationParts, isCitationStale } from "./citation-format";`;
     тип `TPpmCanvasSearchNode` в импорт из `@ppm/canvas`.
  2. В `NodeEditor` после `const [orchestratorProjectionStatus, …] = useState<string>();` (`:249`) —
     `const grammarV2 = usePpmCanvasGrammarV2();`.
  3. Ветка `if (node.kind === "search") {` (`:287`): первой строкой тела — `if (grammarV2) return <FoundBySearchCard node={node} />;`
     (разметка v1 ниже не меняется).
  4. Новый компонент после `NodeEditor`:
     ```tsx
     function FoundBySearchCard({ node }: { node: TPpmCanvasSearchNode }) {
       const ppmT = usePpmTranslation();
       const projectionContext = useContext(PpmWorkItemProjectionContext);
       const results = node.results.slice(0, 5);
       const bindings = [...projectionContext.bindingsByShapeId.values()];
       const stale = results.map((result) => isCitationStale(result, bindings));
       const firstStale = results.find((_, index) => stale[index]);
       const excerpt = results[0]?.excerpt.trim();
       return (
         <div className="ppm-canvas-node__content ppm-found-card">
           <header className="ppm-found-card__header">
             <Search aria-hidden="true" />
             <span>{ppmT("canvas.found_by_search")}</span>
           </header>
           <p className="ppm-found-card__query">{ppmT("canvas.found_query").replace("{query}", node.query)}</p>
           {excerpt ? (
             <blockquote className="ppm-found-card__excerpt" data-code={results[0].source_type === "git_code" || undefined}>
               {excerpt}
             </blockquote>
           ) : (
             <p className="ppm-found-card__empty">{ppmT("canvas.found_no_excerpt")}</p>
           )}
           {results.length > 0 && (
             <ol className="ppm-found-card__citations">
               {results.map((result, index) => {
                 const parts = citationParts(result);
                 const text = [
                   parts.title,
                   parts.page ? ppmT("canvas.citation_page").replace("{page}", String(parts.page)) : null,
                   parts.lines ? ppmT("canvas.citation_lines").replace("{range}", parts.lines) : null,
                   parts.version,
                 ]
                   .filter(Boolean)
                   .join(" · ");
                 const label = ppmT(stale[index] ? "canvas.citation_label_stale" : "canvas.citation_label")
                   .replace("{index}", String(index + 1))
                   .replace("{text}", text);
                 return (
                   <li key={result.result_id}>
                     <a
                       className="ppm-citation-chip"
                       data-stale={stale[index] || undefined}
                       href={result.source_url}
                       aria-label={label}
                       title={label}
                       onClick={stopEventPropagation}
                       onKeyDown={stopEventPropagation}
                       onPointerDown={stopEventPropagation}
                     >
                       <span className="ppm-citation-chip__index">{index + 1}</span>
                       <span className="ppm-citation-chip__text">{text}</span>
                       {stale[index] && <RefreshCw aria-hidden="true" />}
                     </a>
                   </li>
                 );
               })}
             </ol>
           )}
           {firstStale && (
             <p className="ppm-found-card__stale">
               {ppmT("canvas.citation_stale")} ·{" "}
               <a
                 href={firstStale.source_url}
                 onClick={stopEventPropagation}
                 onKeyDown={stopEventPropagation}
                 onPointerDown={stopEventPropagation}
               >
                 {ppmT("canvas.citation_open")}
               </a>
             </p>
           )}
         </div>
       );
     }
     ```
     Данные ноды не меняются (только существующие поля — `notes/risk.md` §4.3). CSV не индексируется — фрагмент
     таблицы не имитируем.

- [ ] **Step 6: Переводы** — `ux11-canvas.ts`:
  - en: `"canvas.found_by_search": "Found by search", "canvas.found_query": "“{query}”", "canvas.found_no_excerpt": "The search returned no excerpt.", "canvas.citation_page": "p. {page}", "canvas.citation_lines": "lines {range}", "canvas.citation_label": "Citation {index}: {text}", "canvas.citation_label_stale": "Citation {index}: {text} — the source changed after the search", "canvas.citation_stale": "changed after the search", "canvas.citation_open": "open",`
  - ru: `"canvas.found_by_search": "Найдено поиском", "canvas.found_query": "«{query}»", "canvas.found_no_excerpt": "Поиск не вернул фрагмент.", "canvas.citation_page": "стр. {page}", "canvas.citation_lines": "строки {range}", "canvas.citation_label": "Цитата {index}: {text}", "canvas.citation_label_stale": "Цитата {index}: {text} — источник изменился после поиска", "canvas.citation_stale": "изменился после поиска", "canvas.citation_open": "открыть",`
  Затем `…/tools/ux11-pkg-build.sh ppm-brand`.

- [ ] **Step 7: CSS** — дописать в `canvas-v2.css`:
  ```css
  /* C5 · Найдено поиском: пунктир (≥ 3:1), цвет доски, фрагмент цитатой, чипы «номер · источник · версия» */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node--search {
    border: 1px dashed var(--ppm-color-card-found-border, var(--border-subtle-1));
    background: var(--ppm-color-board, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card {
    display: flex;
    min-height: 0;
    flex-direction: column;
    gap: 0.375rem;
    padding: 0.75rem;
    overflow: hidden;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__header {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__header svg {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__query,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__stale,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__empty {
    overflow: hidden;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__excerpt {
    display: -webkit-box;
    margin: 0.25rem 0 0;
    padding-left: 0.5rem;
    overflow: hidden;
    border-left: 2px solid var(--ppm-color-border, var(--border-subtle));
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.8125rem;
    line-height: 1.25rem;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__excerpt[data-code] {
    font-family: var(--ppm-font-mono, var(--font-code, ui-monospace, monospace));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__citations {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    margin: 0.25rem 0 0;
    padding: 0;
    list-style: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-citation-chip {
    display: inline-flex;
    max-width: 100%;
    height: 1.25rem;
    align-items: center;
    gap: 0.3125rem;
    padding: 0 0.375rem 0 0.125rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-xs, 0.25rem);
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-citation-chip[data-stale] {
    border-style: dashed;
    border-color: var(--ppm-color-border-control, var(--border-subtle-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-citation-chip__index {
    display: inline-grid;
    min-width: 1rem;
    height: 1rem;
    place-items: center;
    padding: 0 0.1875rem;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: 0.1875rem;
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
    font-family: var(--ppm-font-mono, var(--font-code, ui-monospace, monospace));
    font-size: 0.6875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-citation-chip__text {
    overflow: hidden;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-family: var(--ppm-font-mono, var(--font-code, ui-monospace, monospace));
    font-size: 0.6875rem;
    text-overflow: ellipsis;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-citation-chip svg {
    width: 0.75rem;
    height: 0.75rem;
    flex: none;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-found-card__stale a {
    color: var(--ppm-color-accent-text, var(--txt-accent-primary));
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  ```

- [ ] **Step 8: Прогон** — как в C2 Step 11 (плюс `brain-panel.tsx`, `citation-format.ts`,
  `tests/ppm-canvas/citation-format.test.ts`; `brain-panel-mode.test.ts` — PASS без изменений).

**Acceptance C5:**
- [ ] Пунктирная рамка, «Найдено поиском», запрос в «ёлочках», настоящий фрагмент (`results[0].excerpt`), до 5
  чипов «[n] источник · стр. N · vN» со ссылками (spec §E).
- [ ] «изменился после поиска · открыть» — только если на доске есть живая карточка того же источника с другой
  версией (R17); без неё — нет ни метки, ни пунктирного чипа.
- [ ] Панель «Найти в проекте» показывает локаторы как раньше; v1 — прежняя карточка «Поиск по проекту».

---

### Task C6: Инспектор выделенной живой карточки задачи

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-inspector.tsx`
- Modify: `apps/web/core/components/ppm-canvas/canvas-grammar.ts` (форматтеры срока)
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx:98-104` (`export` у `PRIORITY_LABELS`)
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — импорт, монтирование после
  `</PpmCanvasBoardNavigationContext.Provider>` в оболочке (`:2133`, рядом с `fileDropNotice`)
- Modify: `apps/web/core/components/ppm-canvas/canvas-v2.css`, `packages/ppm-brand/src/translations/ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/canvas-inspector.test.ts` (новый), `…/canvas-v2-css.test.ts` (+1 `it`)

**Interfaces:**
- Consumes: состояние редактора `editor`, `bindingsByShapeId`, `workItemOptions`, `projectionErrors`,
  `pendingWorkItemIds`, `semanticEdges`, `effectiveCanEdit`, `boardInfoOpen`, `desktopImport`, `syncStatus`,
  `recoveryDraft`; `updateWorkItemProjection` (`editor.tsx:1170-1190`, тот же путь, что у карточки);
  `openSemanticPanel`; `semanticLinksForShape`, `SEMANTIC_RELATION_LABELS`, `SEMANTIC_EDGE_STYLE` (C2); `LiveGlyph` (C3).
- Produces: `PpmCanvasInspector`; `formatDueDate`, `formatDueDateRelative`; ключи `canvas.inspector_*`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-inspector.tsx apps/web/tests/ppm-canvas/canvas-inspector.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/canvas-inspector.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { formatDueDate, formatDueDateRelative } from "@/components/ppm-canvas/canvas-grammar";

  const editorSource = readFileSync(new URL("../../core/components/ppm-canvas/editor.tsx", import.meta.url), "utf8");
  const inspectorSource = readFileSync(new URL("../../core/components/ppm-canvas/canvas-inspector.tsx", import.meta.url), "utf8");
  const NOW = new Date(2026, 8, 24, 10, 0);

  describe("canvas inspector (UX1.1 C6)", () => {
    it("formats the due date and its distance in days", () => {
      expect(formatDueDate("2026-09-26", "ru")).toBe("26 сент.");
      expect(formatDueDateRelative("2026-09-27", "ru", NOW)).toBe("через 3 дня");
      expect(formatDueDateRelative("2026-09-24", "ru", NOW)).toBe("сегодня");
      expect(formatDueDateRelative("2026-09-25", "ru", NOW)).toBe("завтра");
      expect(formatDueDateRelative("2026-09-23", "ru", NOW)).toBe("вчера");
    });

    it("is a sibling of <Tldraw>, not part of the remounting overlay (R14)", () => {
      const tldrawEnd = editorSource.indexOf("</Tldraw>");
      const mount = editorSource.indexOf("<PpmCanvasInspector");
      expect(mount).toBeGreaterThan(tldrawEnd);
      const overlay = editorSource.slice(editorSource.indexOf("InFrontOfTheCanvas: () => ("), editorSource.indexOf("const projectionContext = useMemo("));
      expect(overlay).not.toContain("PpmCanvasInspector");
    });

    it("never adds a second dialog to the editor and edits through the projection path", () => {
      expect(inspectorSource).not.toMatch(/role="dialog"|aria-modal/);
      expect(inspectorSource).toContain("onUpdate(shapeId, binding,");
      expect(getPpmTranslation("ru", "canvas.inspector_hint")).toBe("Правки сохраняются в задаче, карточка на холсте обновится сама.");
      expect(getPpmTranslation("ru", "canvas.inspector_links")).toBe("Связи на холсте");
    });
  });
  ```
  В `canvas-v2-css.test.ts`:
  ```ts
  it("floats the inspector under the board pill and hides it on narrow canvases", () => {
    const inspector = ruleBody(`${G} .ppm-canvas-inspector`);
    expect(inspector).toContain("right: var(--ppm-canvas-overlay-inset, 1rem);");
    expect(inspector).toContain("width: min(var(--ppm-inspector-width, 19rem), calc(100% - 2rem));");
    expect(css).toMatch(/@media \(max-width: 979px\)\s*\{[^}]*\.ppm-canvas-inspector\s*\{\s*display: none;/);
  });
  ```
  Запуск → FAIL (`ENOENT canvas-inspector.tsx`).

- [ ] **Step 3: `canvas-grammar.ts` — дописать**
  ```ts
  // Due dates are plain calendar dates (YYYY-MM-DD): compare them as local calendar days, never through UTC midnight.
  export function formatDueDate(dueDate: string, locale: string): string {
    const [year, month, day] = dueDate.split("-").map(Number);
    return new Intl.DateTimeFormat(locale || "ru", { day: "numeric", month: "short" }).format(new Date(year, month - 1, day));
  }

  export function formatDueDateRelative(dueDate: string, locale: string, now: Date = new Date()): string {
    const [year, month, day] = dueDate.split("-").map(Number);
    const days = Math.round(
      (Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000
    );
    return new Intl.RelativeTimeFormat(locale || "ru", { numeric: "auto" }).format(days, "day");
  }
  ```

- [ ] **Step 4: `shape.tsx:98`** — `const PRIORITY_LABELS = {` → `export const PRIORITY_LABELS = {`.

- [ ] **Step 5: `canvas-inspector.tsx` (новый)**
  ```tsx
  import { useId, type KeyboardEvent } from "react";
  import { ArrowLeft, ArrowRight, ArrowUpRight, SquareCheck, X } from "lucide-react";
  import { useValue, type Editor, type TLShapeId } from "tldraw";
  import {
    parseSerializedPpmCanvasNode,
    type TPpmCanvasBinding,
    type TPpmCanvasSemanticEdge,
    type TPpmCanvasWorkItemBinding,
    type TPpmWorkItemEditOptions,
    type TPpmWorkItemPatchRequest,
  } from "@ppm/canvas";
  import { useTranslation } from "@plane/i18n";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { formatDueDate, formatDueDateRelative } from "./canvas-grammar";
  import { LiveGlyph } from "./live-card";
  import { SEMANTIC_EDGE_STYLE, SEMANTIC_RELATION_LABELS, semanticLinksForShape } from "./semantic-edge-style";
  import { PPM_CANVAS_SHAPE_TYPE, PRIORITY_LABELS, type TPpmCanvasShape } from "./shape";

  type TPatch = Omit<TPpmWorkItemPatchRequest, "source_version">;

  type TPpmCanvasInspectorProps = {
    bindingsByShapeId: ReadonlyMap<string, TPpmCanvasBinding>;
    canEdit: boolean;
    edges: readonly TPpmCanvasSemanticEdge[];
    editor: Editor;
    errorsByShapeId: ReadonlyMap<string, string>;
    onOpenLinks: () => void;
    onUpdate: (shapeId: string, binding: TPpmCanvasWorkItemBinding, patch: TPatch) => void;
    options: TPpmWorkItemEditOptions;
    pendingWorkItemIds: ReadonlySet<string>;
  };

  // R14: a floating panel under the "Board" pill, rendered as a sibling of <Tldraw> (plain DOM, reachable by mouse and
  // keyboard). Only a single selected live work-item card has an inspector in wave 1; cards keep inline editing (R4).
  export function PpmCanvasInspector(props: TPpmCanvasInspectorProps) {
    const { bindingsByShapeId, editor } = props;
    const shapeId = useValue(
      "ppm canvas inspected shape",
      () => {
        const only = editor.getOnlySelectedShape();
        return only?.type === PPM_CANVAS_SHAPE_TYPE ? only.id : undefined;
      },
      [editor]
    );
    const binding = shapeId ? bindingsByShapeId.get(shapeId) : undefined;
    if (!shapeId || !binding || binding.entity_type !== "work_item") return null;
    return <WorkItemInspector {...props} binding={binding} shapeId={shapeId} />;
  }

  function WorkItemInspector({
    binding,
    bindingsByShapeId,
    canEdit,
    edges,
    editor,
    errorsByShapeId,
    onOpenLinks,
    onUpdate,
    options,
    pendingWorkItemIds,
    shapeId,
  }: TPpmCanvasInspectorProps & { binding: TPpmCanvasWorkItemBinding; shapeId: TLShapeId }) {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const fieldId = useId();
    const { display, identity } = binding.source;
    const editable = canEdit && binding.source.capabilities.update && display.source_status === "active";
    const pending = pendingWorkItemIds.has(binding.entity_id) || !binding.source.source_version;
    const links = semanticLinksForShape(edges, shapeId);
    const error = errorsByShapeId.get(shapeId);
    const update = (patch: TPatch) => onUpdate(shapeId, binding, patch);
    const close = () => {
      editor.selectNone();
      editor.getContainer().focus();
    };
    const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      if (event.code !== "Escape") return;
      event.stopPropagation();
      close();
    };
    const assigneeNames = display.assignees.map((assignee) => assignee.display_name).join(", ");

    return (
      <section className="ppm-canvas-inspector" aria-label={ppmT("canvas.live_card")} onKeyDown={onKeyDown}>
        <header className="ppm-canvas-inspector__header">
          <LiveGlyph />
          <strong>{ppmT("canvas.live_card")}</strong>
          <button type="button" aria-label={ppmT("canvas.inspector_close")} title={ppmT("canvas.inspector_close")} onClick={close}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="ppm-canvas-inspector__body">
          <p className="ppm-canvas-inspector__source">
            <span>{ppmT("canvas.inspector_source")}</span>
            <SquareCheck aria-hidden="true" />
            <strong>{ppmT("project.tasks")}</strong>
            {identity.identifier && <span className="ppm-canvas-inspector__id">· {identity.identifier}</span>}
          </p>
          <h3 className="ppm-canvas-inspector__title">{display.title}</h3>
          {identity.source_url && (
            <a className="ppm-canvas-inspector__open" href={identity.source_url}>
              <ArrowUpRight aria-hidden="true" />
              {ppmT("canvas.open_work_item")}
            </a>
          )}
          <p className="ppm-canvas-inspector__hint">{ppmT("canvas.inspector_hint")}</p>
          {error && (
            <p className="ppm-canvas-inspector__error" role="status">
              {error}
            </p>
          )}
        </div>
        <dl className="ppm-canvas-inspector__fields">
          <div>
            <dt>
              <label htmlFor={`${fieldId}-state`}>{ppmT("canvas.work_item_state")}</label>
            </dt>
            <dd>
              {editable ? (
                <select
                  id={`${fieldId}-state`}
                  disabled={pending}
                  value={display.state?.id ?? ""}
                  onChange={(event) => update({ state_id: event.currentTarget.value })}
                >
                  {!display.state && <option value="">—</option>}
                  {options.states.map((state) => (
                    <option key={state.id} value={state.id}>
                      {state.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span id={`${fieldId}-state`}>{display.state?.name ?? "—"}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <label htmlFor={`${fieldId}-priority`}>{ppmT("canvas.work_item_priority")}</label>
            </dt>
            <dd>
              {editable ? (
                <select
                  id={`${fieldId}-priority`}
                  disabled={pending}
                  value={display.priority}
                  onChange={(event) => update({ priority: event.currentTarget.value as TPatch["priority"] })}
                >
                  {options.priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {ppmT(PRIORITY_LABELS[priority])}
                    </option>
                  ))}
                </select>
              ) : (
                <span id={`${fieldId}-priority`}>{ppmT(PRIORITY_LABELS[display.priority])}</span>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <label htmlFor={`${fieldId}-due`}>{ppmT("canvas.work_item_due_date")}</label>
            </dt>
            <dd>
              {editable ? (
                <input
                  id={`${fieldId}-due`}
                  disabled={pending}
                  type="date"
                  value={display.due_date ?? ""}
                  onChange={(event) => update({ due_date: event.currentTarget.value || null })}
                />
              ) : (
                <span id={`${fieldId}-due`}>{display.due_date ? formatDueDate(display.due_date, currentLocale) : "—"}</span>
              )}
              {display.due_date && (
                <small className="ppm-canvas-inspector__relative">{formatDueDateRelative(display.due_date, currentLocale)}</small>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <label htmlFor={`${fieldId}-assignees`}>{ppmT("canvas.work_item_assignees")}</label>
            </dt>
            <dd>
              {editable ? (
                <select
                  id={`${fieldId}-assignees`}
                  multiple
                  disabled={pending}
                  value={display.assignees.map((assignee) => assignee.id)}
                  onChange={(event) =>
                    update({ assignee_ids: [...event.currentTarget.selectedOptions].map((option) => option.value) })
                  }
                >
                  {options.assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.display_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span id={`${fieldId}-assignees`}>{assigneeNames || ppmT("canvas.unassigned")}</span>
              )}
            </dd>
          </div>
        </dl>
        <div className="ppm-canvas-inspector__links">
          <header>
            <strong>{ppmT("canvas.inspector_links")}</strong>
            <span>· {links.length}</span>
            <button type="button" onClick={onOpenLinks}>
              {ppmT("canvas.inspector_all_links")}
            </button>
          </header>
          {links.length === 0 ? (
            <p>{ppmT("canvas.inspector_no_links")}</p>
          ) : (
            <ul>
              {links.map((link) => {
                const other = shapeTitle(editor, bindingsByShapeId, link.otherShapeId);
                return (
                  <li key={link.edge.edge_id}>
                    <button
                      type="button"
                      aria-label={ppmT("canvas.inspector_focus_node").replace("{title}", other)}
                      onClick={() => {
                        editor.select(link.otherShapeId as TLShapeId);
                        editor.zoomToSelection({ animation: { duration: 180 } });
                      }}
                    >
                      {link.direction === "out" ? <ArrowRight aria-hidden="true" /> : <ArrowLeft aria-hidden="true" />}
                      <span className="ppm-canvas-inspector__relation" data-tone={SEMANTIC_EDGE_STYLE[link.edge.relation_type].tone}>
                        {ppmT(SEMANTIC_RELATION_LABELS[link.edge.relation_type])}
                      </span>
                      <span className="ppm-canvas-inspector__other">{other}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    );
  }

  function shapeTitle(editor: Editor, bindings: ReadonlyMap<string, TPpmCanvasBinding>, shapeId: string): string {
    const binding = bindings.get(shapeId);
    if (binding?.entity_type === "work_item") {
      return [binding.source.identity.identifier, binding.source.display.title].filter(Boolean).join(" · ");
    }
    if (binding) return binding.source.display.title;
    const shape = editor.getShape<TPpmCanvasShape>(shapeId as TLShapeId);
    if (!shape || shape.type !== PPM_CANVAS_SHAPE_TYPE) return shapeId;
    const parsed = parseSerializedPpmCanvasNode(shape.props.node);
    return (parsed.status === "valid" || parsed.status === "migrated") &&
      "title" in parsed.node &&
      typeof parsed.node.title === "string" &&
      parsed.node.title
      ? parsed.node.title
      : shapeId;
  }
  ```
  Контролы инспектора — обычный DOM вне tldraw: клики и фокус работают (в отличие от контролов внутри `.tl-shape`).
  `id` — через `useId()` (у дубликата доски те же `shape:` ID, во вкладках возможны совпадения).

- [ ] **Step 6: `editor.tsx` — монтирование**
  1. Импорт: `import { PpmCanvasInspector } from "./canvas-inspector";`.
  2. Перед `return (` оболочки (после `const boardNavigationContext = …`, `:2112`):
     ```ts
     // RC9: the inspector never covers the "Board" panel, the import preview or a blocking banner.
     const inspectorHidden =
       boardInfoOpen || Boolean(desktopImport) || isBlockingCanvasStatus(syncStatus, Boolean(recoveryDraft));
     ```
  3. Сразу после `</PpmCanvasGrammarContext.Provider>` (обёртка из C1, т. е. после провайдеров и `<Tldraw>`), до
     `{fileDropNotice && (`:
     ```tsx
     {grammarV2 && editor && !inspectorHidden && (
       <PpmCanvasInspector
         bindingsByShapeId={bindingsByShapeId}
         canEdit={effectiveCanEdit}
         edges={semanticEdges}
         editor={editor}
         errorsByShapeId={projectionErrors}
         options={workItemOptions}
         pendingWorkItemIds={pendingWorkItemIds}
         onOpenLinks={openSemanticPanel}
         onUpdate={(shapeId, binding, patch) => void updateWorkItemProjection(shapeId, binding, patch)}
       />
     )}
     ```

- [ ] **Step 7: Переводы** — `ux11-canvas.ts`:
  - en: `"canvas.inspector_close": "Clear selection", "canvas.inspector_source": "Source", "canvas.inspector_hint": "Changes are saved to the task; the card on the canvas updates itself.", "canvas.inspector_links": "Links on the canvas", "canvas.inspector_all_links": "All links", "canvas.inspector_no_links": "No links on the canvas yet.", "canvas.inspector_focus_node": "Show “{title}” on the canvas",`
  - ru: `"canvas.inspector_close": "Снять выделение", "canvas.inspector_source": "Источник", "canvas.inspector_hint": "Правки сохраняются в задаче, карточка на холсте обновится сама.", "canvas.inspector_links": "Связи на холсте", "canvas.inspector_all_links": "Все связи", "canvas.inspector_no_links": "Связей на холсте пока нет.", "canvas.inspector_focus_node": "Показать «{title}» на холсте",`
  Затем `…/tools/ux11-pkg-build.sh ppm-brand`.

- [ ] **Step 8: CSS** — дописать в `canvas-v2.css`:
  ```css
  /* C6 · Инспектор: плавающая панель под пилюлей «Доска», 304 px, радиус 8, тень всплывающего слоя (TOKENS §11) */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector {
    position: absolute;
    z-index: 320;
    top: calc(var(--ppm-canvas-overlay-inset, 1rem) + 2.25rem);
    right: var(--ppm-canvas-overlay-inset, 1rem);
    display: grid;
    width: min(var(--ppm-inspector-width, 19rem), calc(100% - 2rem));
    max-height: calc(100% - 4.25rem);
    overflow-y: auto;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    box-shadow: var(--ppm-shadow-popover, 0 8px 24px rgb(0 0 0 / 0.24));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__header,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links > header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.75rem 0.625rem 1rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__header {
    border-bottom: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__header button,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links > header button {
    margin-left: auto;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__body,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields {
    display: grid;
    gap: 0.625rem;
    margin: 0;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__source {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__source svg {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--ppm-type-task, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__open {
    display: inline-flex;
    width: fit-content;
    height: var(--ppm-control-height, 2rem);
    align-items: center;
    gap: 0.375rem;
    padding: 0 0.75rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-on-accent, var(--txt-on-accent));
    background: var(--ppm-color-accent, var(--bg-accent-primary));
    font-size: 0.8125rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__hint,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__relative {
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__error {
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields > div {
    display: grid;
    grid-template-columns: 6.5rem minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields dt {
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields dd {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields select,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields input {
    min-width: 0;
    height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.375rem;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1, var(--bg-layer-1));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__fields select[multiple] {
    height: 4.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links ul {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0 0.5rem 0.75rem;
    list-style: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links li > button {
    display: grid;
    width: 100%;
    grid-template-columns: 1rem max-content minmax(0, 1fr);
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.5rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links li > button:hover {
    background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links li svg {
    width: 0.875rem;
    height: 0.875rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__relation {
    padding: 0 0.375rem;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-xs, 0.25rem);
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1.125rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__relation[data-tone="danger"] {
    border-color: var(--ppm-color-danger-line, var(--txt-danger-primary));
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__other {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector__links > p {
    margin: 0;
    padding: 0 1rem 0.75rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }

  @media (max-width: 979px) {
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inspector {
      display: none;
    }
  }
  ```
  Проверка `on-color-usage.test.ts`: правило кнопки «Открыть источник» использует `--ppm-color-on-accent` /
  `--txt-on-accent`, не `--txt-on-color` — тест не затрагивается (он читает только `canvas.css`).

- [ ] **Step 9: Прогон** — как в C2 Step 11 (плюс `canvas-inspector.tsx`, `canvas-grammar.ts`, `shape.tsx`,
  `tests/ppm-canvas/canvas-inspector.test.ts`).

**Acceptance C6:**
- [ ] Одна выделенная живая карточка задачи → справа под пилюлей «Доска» панель «Живая карточка»: источник
  «Задачи · ROBOT-12», заголовок, основная кнопка «Открыть источник», подсказка про сохранение, Статус / Приоритет /
  Срок («26 сент. · через 3 дня») / Исполнители, «Связи на холсте · N» + «Все связи» (spec §E, R14).
- [ ] Правка из инспектора идёт через `updateWorkItemProjection` (ошибки 409 — прежние тексты); карточка
  обновляется; правка на карточке по-прежнему работает (R4).
- [ ] Читатель видит значения и связи без контролов правки; Esc и «Снять выделение» снимают выделение.
- [ ] Выделение не «двигает» холст; инспектор не входит в memo `InFrontOfTheCanvas`; `[role="dialog"]` в
  редакторе по-прежнему один.
- [ ] Инспектора нет при открытой «Доске», предпросмотре импорта, конфликте/ошибке/восстановлении, < 980 px, в v1 и
  минимальном режиме.

---

### Task C7 (P2, только если C1–C6 зелёные к 08:00 — R18, R24): «Решение» — вариант заметки

**Files:**
- Modify: `packages/ppm-canvas/src/index.ts:94-99` (`ppmCanvasNoteSchema`)
- Modify: `packages/ppm-canvas/src/__tests__/canvas-node.test.ts` (+1 `it`)
- Modify: `apps/web/core/components/ppm-canvas/commands.ts` (`"add-decision"` после `"add-note"`, `:14`)
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — `createNode` `:3351-3376`, `switch` `:2376-2383`
- Modify: `apps/web/core/components/ppm-canvas/workspace.tsx` — рейка после «Добавить заметку» (`:831-838`),
  палитра (после `add-note`)
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx` — `NativeNodeCard`, `indicator()`
- Modify: `apps/web/core/components/ppm-canvas/canvas-grammar.ts`, `canvas-v2.css`, `ux11-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/card-grammar.test.ts` (+1 `it`)

**Interfaces:**
- Consumes: `PpmSemanticEdgesContext` (C2) — входящие подтверждённые `evidence_for`; `PpmWorkItemProjectionContext`
  (заголовки и версии оснований).
- Produces: поля ноды `variant?: "note" | "decision"`, `decision_status?: "proposed" | "accepted"` (обратно
  совместимо: старый код видит обычную заметку, `.passthrough()` уже сохраняет поля); `decisionBasisShapeIds`;
  команда `add-decision`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh \
    packages/ppm-canvas/src/index.ts packages/ppm-canvas/src/__tests__/canvas-node.test.ts
  ```

- [ ] **Step 2: Падающие тесты**
  В `packages/ppm-canvas/src/__tests__/canvas-node.test.ts` (в существующий `describe` с нативными нодами):
  ```ts
  it("keeps a decision note compatible with plain notes", () => {
    const note = createPpmCanvasNode({ authorId: "author", kind: "note", now: NOW, title: "Используем TCS34725" });
    const decision = { ...note, variant: "decision" as const, decision_status: "accepted" as const };
    const parsed = parseSerializedPpmCanvasNode(JSON.stringify(decision));
    expect(parsed).toMatchObject({ status: "valid", node: { kind: "note", variant: "decision", decision_status: "accepted" } });
    expect(updatePpmCanvasNode(decision, { title: "Берём TCS34725" }, NOW)).toMatchObject({ variant: "decision" });
    expect(duplicatePpmCanvasNode(decision, "other", NOW)).toMatchObject({ variant: "decision", decision_status: "accepted" });
    expect(parseSerializedPpmCanvasNode(JSON.stringify({ ...note, variant: "banana" }))).toMatchObject({ status: "corrupt" });
  });
  ```
  (Ожидаемый статус для недопустимого значения — сверить с `parseAndMigratePpmCanvasNode` `index.ts:~1900-1933`:
  если схема не прошла — `corrupt`; если реализация возвращает иной статус для ошибок схемы, взять его.)
  В `card-grammar.test.ts`:
  ```ts
  it("builds a decision basis from incoming confirmed «Подтверждает» links", () => {
    const edges = [
      { edge_id: "1", from_shape_id: "shape:csv", to_shape_id: "shape:d", relation_type: "evidence_for", confirmation_status: "confirmed" },
      { edge_id: "2", from_shape_id: "shape:md", to_shape_id: "shape:d", relation_type: "evidence_for", confirmation_status: "proposed" },
      { edge_id: "3", from_shape_id: "shape:d", to_shape_id: "shape:x", relation_type: "evidence_for", confirmation_status: "confirmed" },
      { edge_id: "4", from_shape_id: "shape:y", to_shape_id: "shape:d", relation_type: "blocks", confirmation_status: "confirmed" },
    ] as unknown as TPpmCanvasSemanticEdge[];
    expect(decisionBasisShapeIds(edges, "shape:d")).toEqual(["shape:csv"]);
  });
  ```
  Запуск: `cd plane-fork/packages/ppm-canvas && ./node_modules/.bin/vitest run` и web-тест → FAIL.

- [ ] **Step 3: Схема** — `packages/ppm-canvas/src/index.ts:94-99`. Было:
  ```ts
  export const ppmCanvasNoteSchema = z
    .object({
      ...sharedOwnedNodeFields,
      kind: z.literal("note"),
    })
    .passthrough();
  ```
  Стало:
  ```ts
  export const ppmCanvasNoteSchema = z
    .object({
      ...sharedOwnedNodeFields,
      kind: z.literal("note"),
      // UX1.1 (P2): a decision is a note variant; older clients render it as a plain note.
      variant: z.enum(["note", "decision"]).optional(),
      decision_status: z.enum(["proposed", "accepted"]).optional(),
    })
    .passthrough();
  ```
  Затем `…/tools/ux11-pkg-build.sh ppm-canvas`; `cd packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs`
  → 39/39 PASS; `./node_modules/.bin/tsc --noEmit` — ровно одна старая ошибка `src/index.ts(1803,7)` (номер строки
  может сдвинуться на +3 — сверить текст ошибки).

- [ ] **Step 4: `canvas-grammar.ts` — дописать**
  ```ts
  // «Основание» решения — производное от связей (данные не дублируются): входящие подтверждённые «Подтверждает».
  export function decisionBasisShapeIds(edges: readonly TPpmCanvasSemanticEdge[], decisionShapeId: string): string[] {
    return edges
      .filter(
        (edge) =>
          edge.to_shape_id === decisionShapeId &&
          edge.relation_type === "evidence_for" &&
          edge.confirmation_status === "confirmed"
      )
      .map((edge) => edge.from_shape_id);
  }
  ```
  (`TPpmCanvasSemanticEdge` добавить в `import type … from "@ppm/canvas"`.)

- [ ] **Step 5: Команда** — `commands.ts`: `"add-decision",` после `"add-note",`. `editor.tsx`:
  1. `createNode` (`:3351-3376`): добавить последний параметр `patch?: Record<string, unknown>` и заменить первую
     строку тела на
     `const node = { ...createPpmCanvasNode({ authorId, kind, targetBoardId, title }), ...patch } as TPpmCanvasOwnedNode;`
     (тип `TPpmCanvasOwnedNode` импортировать из `@ppm/canvas`, если его нет в импорте `:46-83`).
  2. `switch` после ветки `add-note`:
     ```ts
     case "add-decision":
       if (canEdit)
         createNode(editor, authorId, "note", ppmT("canvas.decision_title"), undefined, {
           variant: "decision",
           decision_status: "proposed",
           visual: { ...createPpmCanvasNode({ authorId, kind: "note", title: "" }).visual, color: "green" },
         });
       break;
     ```
  `workspace.tsx`: при `designV2` — `RailButton` «Добавить решение» (иконка `Diamond`, без сочетания клавиш) после
  «Добавить заметку» внутри блока `capabilities.edit`, и пункт палитры `{ command: "add-decision" as const, id:
  "add-decision", keywords: ["decision", "adr"], label: ppmT("canvas.add_decision") }` в блоке `activeBoardEditReady`
  (оба — только при `designV2`).

- [ ] **Step 6: `shape.tsx` — вид решения**
  1. `NativeNodeCard` (после хуков C4):
     ```ts
     const edgesContext = useContext(PpmSemanticEdgesContext); // import from "./semantic-edges-layer"
     const projectionContext = useContext(PpmWorkItemProjectionContext);
     // Narrowed note: `updateNode` needs the note type to accept decision_status (Omit over the union drops it).
     const decisionNode = grammarV2 && node.kind === "note" && node.variant === "decision" ? node : undefined;
     const basis = decisionNode ? decisionBasisShapeIds(edgesContext.edges, shape.id) : [];
     const toggleDecision = () => {
       if (!decisionNode) return;
       updateNode(editor, shape, decisionNode, {
         decision_status: decisionNode.decision_status === "accepted" ? "proposed" : "accepted",
       });
     };
     const basisTitle = (sourceId: string) => {
       const sourceBinding = projectionContext.bindingsByShapeId.get(sourceId);
       if (sourceBinding) return sourceBinding.source.display.title;
       const sourceShape = editor.getShape<TPpmCanvasShape>(sourceId as TPpmCanvasShape["id"]);
       const parsedSource = sourceShape ? parseSerializedPpmCanvasNode(sourceShape.props.node) : undefined;
       return parsedSource &&
         (parsedSource.status === "valid" || parsedSource.status === "migrated") &&
         "title" in parsedSource.node &&
         typeof parsedSource.node.title === "string" &&
         parsedSource.node.title
         ? parsedSource.node.title
         : sourceId;
     };
     ```
  2. Корневому `<div className="ppm-canvas-node__native" …>` добавить `data-variant={decisionNode ? "decision" : undefined}`.
  3. Подпись шапки: при `decisionNode` вместо `OwnNodeGlyph`/`kind_note` — глиф `Diamond` +
     `ppmT("canvas.kind_decision")` и кнопка-переключатель (внутри `<span className="ppm-canvas-node__type">` не
     вкладывать — ставить сразу после неё):
     ```tsx
     {decisionNode && (
       <button
         type="button"
         aria-pressed={decisionNode.decision_status === "accepted"}
         className="ppm-decision__status"
         disabled={readonly}
         onClick={stopEventPropagation}
         onKeyDown={(event) => runCanvasKeyboardAction(event, toggleDecision)}
         onPointerDown={(event) => runCanvasPointerAction(event, toggleDecision)}
       >
         {ppmT(decisionNode.decision_status === "accepted" ? "canvas.decision_accepted" : "canvas.decision_mark_accepted")}
       </button>
     )}
     ```
  4. После `<textarea>` заметки (внутри `.ppm-canvas-node__native-content`) при `decisionNode` — блок «Основание»:
     ```tsx
     {decisionNode && (
       <section className="ppm-decision__basis" aria-label={ppmT("canvas.decision_basis")}>
         <strong>{ppmT("canvas.decision_basis")}</strong>
         {basis.length === 0 ? (
           <p>{ppmT("canvas.decision_basis_empty")}</p>
         ) : (
           <ul>
             {basis.map((sourceId) => {
               const sourceBinding = projectionContext.bindingsByShapeId.get(sourceId);
               return (
                 <li key={sourceId}>
                   <span>{basisTitle(sourceId)}</span>
                   {sourceBinding?.entity_type === "vault_file" && sourceBinding.source_version && (
                     <small>v{sourceBinding.source_version}</small>
                   )}
                 </li>
               );
             })}
           </ul>
         )}
       </section>
     )}
     ```
  5. `indicator()` (вариант из C3): перед строкой `const radius = …` добавить
     ```tsx
     if (node?.kind === "note" && node.variant === "decision") {
       const { h, w } = shape.props;
       return <path d={`M 8 0 H ${w - 12} L ${w} 12 V ${h - 8} Q ${w} ${h} ${w - 8} ${h} H 8 Q 0 ${h} 0 ${h - 8} V 8 Q 0 0 8 0 Z`} />;
     }
     ```
     (`node` определён только при грамматике v2 — в v1 и минимальном режиме контур прежний.)
- [ ] **Step 7: Переводы** — en: `"canvas.add_decision": "Add decision", "canvas.decision_title": "New decision", "canvas.kind_decision": "Decision", "canvas.decision_accepted": "accepted", "canvas.decision_mark_accepted": "Mark as accepted", "canvas.decision_basis": "Basis", "canvas.decision_basis_empty": "Link evidence to this decision with «Evidence for».",`
  ru: `"canvas.add_decision": "Добавить решение", "canvas.decision_title": "Новое решение", "canvas.kind_decision": "Решение", "canvas.decision_accepted": "принято", "canvas.decision_mark_accepted": "Отметить как принятое", "canvas.decision_basis": "Основание", "canvas.decision_basis_empty": "Основание появится, когда к решению подведут связь «Подтверждает».",`
  Затем `…/tools/ux11-pkg-build.sh ppm-brand`.
- [ ] **Step 8: CSS** — дописать в `canvas-v2.css`:
  ```css
  /* C7 (P2) · Решение: срезанный правый верхний угол 12 px, «принято» — success, «Основание» из связей */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-node:has(> .ppm-canvas-node__native[data-variant="decision"]) {
    clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-decision__status {
    margin-left: auto;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-decision__status[aria-pressed="true"] {
    color: var(--ppm-color-success, var(--txt-success-primary));
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-decision__basis {
    display: grid;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem 0.75rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }
  ```
  (`:has()` без запятых внутри — тест скоупа проходит. Chrome/Safari/Firefox ≥ 121 поддерживают `:has`; без него —
  карточка без среза, функционально то же.)
- [ ] **Step 9: Прогон** — `@ppm/canvas` vitest 39/39 + audit; web — как в C2 Step 11.

**Acceptance C7:** команда «Добавить решение» (только v2), срезанный угол и совпадающий контур выделения,
переключатель «принято» (success-цвет), «Основание» — из входящих подтверждённых «Подтверждает» с версиями файлов
Хранилища; старые клиенты и экспорт видят обычную заметку.

---

## Сводная приёмка линии C (после C6 или C7)

- [ ] `cd plane-fork/apps/web && ./node_modules/.bin/vitest run` — 184 + новые тесты линии C, 0 падений.
- [ ] `cd plane-fork/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs` —
  38/38 (39/39 с C7), audit PASS.
- [ ] `cd plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-tailwind-classes.mjs` —
  PASS (тест паритета en/ru F — зелёный).
- [ ] web `tsc` без ошибок в путях линии C; `oxlint apps/web/core/components/ppm-canvas` — 0; `oxfmt --check` по
  изменённым файлам — чисто.
- [ ] `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-diff.sh apps/web/core/components/ppm-canvas packages/ppm-canvas packages/ppm-brand/src/translations/ux11-canvas.ts apps/web/tests/ppm-canvas`
  показывает только файлы из «Карты файлов линии C».
- [ ] Ручная проверка контроллером (только чтение, `notes/risk.md` §2.3): доска «Архитектура» в тёмной и светлой
  теме, v2 и `localStorage.ppm_design="v1"`, читатель, 8 вкладок, баннер конфликта; e2e-якоря из Global Constraints
  на месте.
