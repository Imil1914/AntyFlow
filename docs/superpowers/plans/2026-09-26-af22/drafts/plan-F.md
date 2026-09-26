# AF2.2 — Часть F (фундамент): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить всё общее для линий M (карта спринта, «Светофор», «Не на карте», связи «из Задач») и C («Что
изменилось», «На карте» в задаче): поле `map` у узла `group` с фабриками рамки спринта и секции, модуль переводов с
блоками линий, папку `living-map/` (типы, контекст, провайдер, глубокая ссылка, заглушки M и C, `living-map.css`),
команду «Карта спринта» (рейка v2, палитра v2, пустая доска v2), точки монтирования в `editor.tsx`/`workspace.tsx` и
глубокую ссылку `?board=…&shape=…`.

**Architecture:**
- F — первой: F1 (пакеты) → F2 (web). После F2 параллельно идут M и C; S независима и может идти с самого начала
  (CONTRACTS §0). CONTRACTS называет F «одной задачей»; разбиение на F1/F2 разрешено владельцем задания — F2 зависит от
  собранных в F1 `dist` пакетов (`plan-F-notes.md` §1).
- Схема: `PPM_CANVAS_SCHEMA_VERSION` **остаётся 2** (сервер `apps/api/plane/ppm_canvas/schema.py` пинит 2 и не
  разбирает узлы — `map` сохранится как есть). `map` — необязательное дискриминированное объединение по `role`;
  группы без него читаются как раньше, неизвестные поля (и внутри `map`) сохраняются (`.passthrough()`). Секция карты
  вмещает сетку карточек любой длины, поэтому у **группы** предел размера `PPM_CANVAS_GROUP_MAX_SIZE = 20 000` вместо
  общего 1600 × 1200 (иначе рамка спринта на 50 задач была бы `corrupt`); у остальных видов предел прежний. Копия
  рамки/секции через «Дублировать» — обычная секция (без `map`).
- Контекст «Живой карты» (CONTRACTS §2): `usePpmLivingMap()` → `{ facts, mapSections, changes, trafficLight,
  setTrafficLight, args }`. `PpmLivingMapProvider` (свой файл) оборачивает `<Tldraw>` и вызывает `useLivingMapFacts(args)`
  (M) и `useBoardChanges(args)` (C); `args: TLivingMapArgs` — окружение доски (ид., привязки, редактор tldraw, `isActive`,
  `loaded`, `canEdit`, `registerBindings`, `onBoardCreated`…), собранное в `editor.tsx` одним `useMemo`, колбэки
  рабочего пространства — через ref. Линии расширяют типы и окружение только необязательными полями в своих
  размеченных блоках.
- Правая колонка (K5): под v2 пилюля «Доска · Объектов» переезжает в `.ppm-living-map-aside__bar` вместе с кнопками
  M/C (слева от неё), ниже — панели C и M; под v1 разметка прежняя. Стили — `living-map.css` (блоки F/M/C), общий вид
  кнопок и панелей (`.ppm-living-map-pill`, `.ppm-living-map-panel`) задаёт F.
- Глубокая ссылка: `…/brain?board=<id>&shape=<shape_id>` — редактор активной вкладки v2 после загрузки доски забирает
  `shape` из адреса синхронно (как «На холст» AF2.1), выделяет карточку и центрирует камеру без смены масштаба; нет
  такой карточки — уведомление. Рабочее пространство, переписывая `board` на другую доску, выбрасывает и `shape`.

**Tech Stack:** plane-fork (React Router 7 + Vite, React 18.3, tldraw 3.15.6, MobX), `@ppm/canvas` (zod 3.25, tsdown),
`@ppm/brand` (tsdown), vitest (env `node`, без DOM), oxlint/oxfmt.

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.2 — Живая карта проекта: сборка из спринта, светофор, «Не на карте», «Что изменилось».md`
(разделы A, C, E, F «Контракты и инварианты», R1, R2, R7). Контракты линий (обязательны):
`docs/superpowers/plans/2026-09-26-af22/drafts/CONTRACTS.md` (§0 владение, §1 гейтинг, §2 точки монтирования, §3 схема,
§4 переводы, §7 базовая линия). Макет K5: `docs/superpowers/plans/2026-09-25-af21/mockups/K5-Living-Map.png` (+ `.dc.html`,
тёмная — `K5-Living-Map-Dark.dc.html`). Нужды других линий к F сверх CONTRACTS — `drafts/plan-F-notes.md`.

**Порядок:** F1 → F2 строго последовательно; M и C стартуют после F2.

| Задача | Суть | Время |
|---|---|---|
| F1 | `@ppm/canvas`: поле `map` у группы, предел размера группы, фабрики рамки спринта и секции, `getPpmCanvasMap`, копия без `map`; `@ppm/brand`: `af22-living-map.ts` (блок F + пустые M/C/T), подключение последним спредом; тесты; сборка обоих `dist` | ~30 мин |
| F2 | Команда `build-sprint-map` (команды, рейка «Из проекта», палитра v2, пустая доска v2); папка `living-map/` (типы, контекст + «Светофор», провайдер, глубокая ссылка, заглушки M/C, `living-map.css`); точки монтирования и блоки M/C в `editor.tsx`, `onBoardCreated` и `?shape=` в `workspace.tsx`; аудит Tailwind; `af22-foundation.test.ts` и правки двух тестов AF2.1 | ~70 мин |

## Global Constraints (часть F)

- Пути — от `plane-fork/`: `PF=/Users/ermolov/Desktop/PPM/plane-fork`,
  `T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools`. Переменные оболочки между вызовами не
  сохраняются: каждую команду шагов запускать с `PF=… T=…` в начале той же строки (или с полными путями).
- Рабочее дерево — единственный источник правды (в нём без коммитов лежат UX0.2, UX1.1, AF2.1). **Коммитов нет.**
  Никаких `git add` (в т.ч. `-N`), `commit`, `stash`, `reset`, `checkout`, `clean`, `rebase`; снимки — контроллер (`af22-snap.sh`).
- Перед первой правкой **или созданием** любого файла: `$T/af22-pre.sh <путь от plane-fork> …` (новый файл получает `.__absent__`).
- Пакеты — только `$T/af22-pkg-build.sh ppm-canvas|ppm-brand` (web читает `dist`); сборка — **до** правок web, которые
  импортируют новое.
- `pnpm` нет в PATH: `./node_modules/.bin/*` в каталоге пакета; oxlint/oxfmt — `../../node_modules/.bin/…`.
- Dev-сервер :3000 не трогать и второй не запускать; браузер и живую проверку делает контроллер.
- Всё новое на Холсте — только при грамматике v2 (`grammarV2` в `editor.tsx`, `usePpmCanvasGrammarV2()` в `CanvasControls`,
  `designV2` в `workspace.tsx`); CSS — каждый селектор начинается с `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]`,
  без запятых внутри `:where(...)`. Облик v1 и минимальный режим (`PPM_ANTYFLOW_SHELL_ENABLED=0`, `statusPlacement="card"`)
  не меняются; старые доски открываются как раньше.
- Несколько открытых вкладок (AF2.1 R19): всё, что слушает `window`/`document` или пишет в доску, действует только при `isActive`.
- Ничего не пишется в доску без действия пользователя.
- Схема узлов — версия 2; новые поля необязательны и обратно совместимы (тест миграции).
- Горячие клавиши — только `e.code` (F новых не добавляет). Строки — только в `packages/ppm-brand/src/translations/af22-living-map.ts`
  (en **и** ru, в своём блоке), без «ИИ»/AI; словарь PPM: «спринт», «направление», «задача» — никогда «цикл», «модуль»,
  «представление», «рабочий элемент» (`i18n-overlay.test.ts` проверяет весь `PPM_TRANSLATIONS.ru`).
- Без ИИ и без новых внешних запросов.
- Производительность: без перерисовок на каждом кадре камеры; `<Tldraw>` не пересоздаётся (провайдер снаружи, окружение —
  `useMemo`, колбэки рабочего пространства — через ref, ничего нового в `components`-memo).
- Базовая линия после AF2.1 (CONTRACTS §7, не ухудшать): web vitest 72 файла / 599; web tsc 0; oxlint 719 предупреждений /
  0 ошибок; oxfmt по файлам AF2.2 — чисто; `@ppm/brand` 86 тестов + оба аудита; `@ppm/canvas` 50 тестов + аудит, canvas tsc —
  ровно 1 старая ошибка TS2322 (`orchcall`/`orchtask`); корневой `npm test` 653/653 (F его не касается).
- Команды проверок:
  - canvas: `cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs; ./node_modules/.bin/tsc --noEmit`
  - brand: `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  - web: `cd $PF/apps/web && ./node_modules/.bin/vitest run`
  - web tsc: `cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/af22-F.tsbuildinfo`
  - oxlint: `cd $PF/apps/web && ../../node_modules/.bin/oxlint --max-warnings=11957 .` → `Found 719 warnings and 0 errors.`
- Формат — только свои файлы: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt <файлы>`; в пакете — из его каталога
  `../../node_modules/.bin/oxfmt <файлы>`. CSS oxfmt не форматирует.

## Review Focus (часть F)

1. **Старые доски и большие карты.** Группа без `map` (v2, v1, legacy v0) читается как раньше и не получает `map`;
   рамка спринта 3400 × 4200 — `valid`, а не `corrupt`; у остальных видов предел 1600 × 1200 прежний; свёрнутая высокая
   секция помнит полную высоту. Тесты: `af22-map-schema.test.ts` (F1).
2. **v1 не меняется.** При `ppm_design=v1` справа вверху — та же пилюля «Доска · Объектов» без колонки, на пустой доске —
   одна кнопка «Добавить заметку», «Карты спринта» нет ни в рейке (v1 — рейка UX1.1), ни в палитре; минимальный режим тоже
   без изменений. Тесты: `af22-foundation.test.ts` («v1's pill as it was», пустая доска, палитра под `designV2`).
3. **Чужая вкладка не берёт ссылку.** `?shape=` забирает только активная вкладка v2 своей доски после загрузки;
   ссылка на недоступную/другую доску не выделяет карточку на чужой доске (рабочее пространство выбрасывает `shape`,
   переписывая `board`); нет карточки — уведомление, адрес чистый. Тесты: `af22-foundation.test.ts` (глубокая ссылка).
4. **Холст не пересоздаётся.** Провайдер — снаружи `<Tldraw>`, не в `components`-memo; окружение карты стабильно (ref для
   колбэков рабочего пространства), поэтому выделение в соседней вкладке не перерисовывает карточки. Тесты:
   `af22-foundation.test.ts` («wraps <Tldraw>…», «leaf children…»).
5. **Читатель не собирает карту.** «Карта спринта» не видна читателю в рейке, в палитре — только у редактируемой доски,
   на пустой доске — только редактору, обработчик ещё раз проверяет `canEdit`. Тесты: `af22-foundation.test.ts`,
   `toolkit-model.test.ts`, `files-vault-picker.test.ts`.

Живая проверка (контроллер): пилюля «Доска» открывает свою панель и прокручивает длинный список объектов внутри колонки;
блокирующий баннер (конфликт/восстановление) под v2 стоит над колонкой и её не перекрывает.

## Таблица имён, которые публикует F (линии M, C, S потребляют без правок)

| Что | Имя | Где |
|---|---|---|
| Схема | `PPM_CANVAS_MAP_ROLES = ["sprint", "section"]`, `TPpmCanvasMapRole`; `ppmCanvasMapSchema` (`{ role: "sprint", cycle_id: uuid } \| { role: "section", module_id: uuid \| null }`, `.passthrough()`); `TPpmCanvasMap`, `TPpmCanvasSprintMap`, `TPpmCanvasSectionMap`; `TPpmCanvasGroupNode` (`map?`); `PPM_CANVAS_GROUP_MAX_SIZE = 20_000` (ширина, высота, `expanded_height` группы) | `@ppm/canvas` |
| Фабрики | `createPpmSprintFrameNode({ authorId, cycleId, title, width?, height?, color? = "neutral", now? })`, `createPpmMapSectionNode({ authorId, moduleId: string \| null, title, width?, height?, color? = "neutral", now? })` → `TPpmCanvasGroupNode`; размер по умолчанию — как у секции (560 × 360); заголовок обрезается до 160 знаков; неверный uuid — исключение zod | `@ppm/canvas` |
| Помощники | `getPpmCanvasMap(node)` → `TPpmCanvasMap \| undefined` (только у группы); `duplicatePpmCanvasNode` группы — без `map` | `@ppm/canvas` |
| Строки | `AF22_LIVING_MAP_TRANSLATIONS` (`packages/ppm-brand/src/translations/af22-living-map.ts`): блок F — `canvas.af22.sprint_map`, `canvas.af22.sprint_map_hint`, `canvas.af22.source_sprints`, `canvas.af22.empty_sprint_map`, `canvas.af22.shape_not_found`; пустые блоки `// ── M:` (`canvas.map.*`, `canvas.traffic.*`, `canvas.tray.*`), `// ── C:` (`canvas.changes.*`), `// ── T:` (`issue.canvas_boards.*`, пишет линия C) | `@ppm/brand` |
| Команда | `"build-sprint-map"` (`commands.ts`); пункт «Карта спринта» последним в «Из проекта» (`PPM_RAIL_MENUS.project`), значок `MapIcon`; палитра v2; кнопка «Собрать карту спринта» на пустой доске v2 (отправляет ту же команду); обработчик — блок `AF2.2 M` в `CanvasControls`: `if (canEdit && grammarV2) openSprintMapDialog({ boardId })` | web |
| Типы | `living-map/living-map-types.ts`: `TWorkItemFacts { workItemId, traffic, blockedBy, relations }`, `TTrafficState`, `TWorkItemRef`, `TWorkItemRelation`, `TWorkItemRelationType`, `TMapSectionSummary { role, total, done, overdue, blocked }`, `TLivingMapFacts { facts, mapSections }`, `TBoardChangeMark`, `TBoardChangeIndex { count, byShapeId }`, `TLivingMapArgs`; `EMPTY_LIVING_MAP_FACTS`, `EMPTY_BOARD_CHANGE_INDEX`, `EMPTY_LIVING_MAP_ARGS`; блоки `// ── AF2.2 M:`/`// ── AF2.2 C:` для необязательных полей | web |
| Контекст | `living-map/living-map-context.ts`: `PpmLivingMapContext`, `usePpmLivingMap()`, `TLivingMapContextValue = TLivingMapFacts & { args, changes, setTrafficLight, trafficLight }`, `PPM_LIVING_MAP_DEFAULT`; «Светофор»: `trafficLightStorageKey(authorId)` = `ppm:af22:traffic-light:<id>`, `readTrafficLightPreference`, `writeTrafficLightPreference`, `useTrafficLightPreference` (одно значение на все вкладки страницы, по умолчанию включён) | web |
| Провайдер | `living-map/living-map-provider.tsx`: `PpmLivingMapProvider({ args, children })` | web |
| Ссылка | `living-map/shape-link.ts`: `canvasShapeLinkPath(workspaceSlug, projectId, boardId, shapeId)`, `takeCanvasShapeLink(search, boardId)`, `revealCanvasShape(editor, shapeId)`, `PPM_CANVAS_SHAPE_PARAM = "shape"` | web |
| Заглушки M | `living-map-facts.ts` → `useLivingMapFacts(args): TLivingMapFacts`; `task-relations-layer.tsx` → `PpmTaskRelationsLayer`; `traffic-light-toggle.tsx` → `PpmTrafficLightToggle`; `not-on-map-tray.tsx` → `PpmNotOnMapTray`; `map-assembly-dialog.tsx` → `openSprintMapDialog({ boardId })`, `PpmSprintMapDialog`, `TPpmSprintMapDialogRequest` | web |
| Заглушки C | `board-changes.ts` → `useBoardChanges(args): TBoardChangeIndex`; `changes-button.tsx` → `PpmChangesButton`; `changes-panel.tsx` → `PpmChangesPanel` | web |
| CSS | `living-map/living-map.css` (импорт в `editor.tsx` после `canvas-content.css`): `.ppm-living-map-aside`, `.ppm-living-map-aside__bar`, `.ppm-living-map-pill`, `.ppm-living-map-panel`, `.ppm-living-map-empty-action`; блоки `/* ── M: … ── */ … /* ── /M ── */`, `/* ── C: … ── */ … /* ── /C ── */` | web |
| editor.tsx | проп `onBoardCreated?: (board) => void`; `livingMapArgs` (блок F) с вложенными `livingMapArgsM`/`livingMapArgsC` (блоки M/C); `registerLivingMapBindings`; блоки M: импорты, окружение, `case "build-sprint-map"`, дочерние `<Tldraw>` (`PpmTaskRelationsLayer`, `PpmSprintMapDialog`), «Светофор» и лоток в колонке; блоки C: импорты, окружение, кнопка и панель в колонке | web |

---

### Task 1 (F1): Поле `map` у группы, фабрики карты и модуль переводов AF2.2

**Files:**
- Modify: `packages/ppm-canvas/src/index.ts` — `ppmCanvasGroupSchema` (сейчас `:198-203`); типы — после строки
  `export type TPpmCanvasPageRefNode = z.infer<typeof ppmCanvasPageRefSchema>;` (`:692`); фабрики — перед
  `export function createPpmVaultFileRefNode({` (`:1370`); `duplicatePpmCanvasNode` — перед его `return` (`:2094`).
- Create: `packages/ppm-canvas/src/__tests__/af22-map-schema.test.ts`.
- Create: `packages/ppm-brand/src/translations/af22-living-map.ts`, `packages/ppm-brand/src/__tests__/af22-translations.test.ts`.
- Modify: `packages/ppm-brand/src/index.ts` — импорт (`:2`), спред en (`:830`), спред ru (`:1640`).
- Rebuild (не правится руками): `packages/ppm-canvas/dist`, `packages/ppm-brand/dist`.

**Interfaces:**
- Consumes: `visualSchema`, `sharedOwnedNodeFields`, `PPM_CANVAS_NODE_REGISTRY.group` (cyan 560 × 360), `ppmCanvasNodeSchema`,
  `duplicatePpmCanvasNode` (`packages/ppm-canvas/src/index.ts`); порядок спредов `...AF21_CANVAS_TRANSLATIONS.<locale>`
  (`packages/ppm-brand/src/index.ts:830, 1640`).
- Produces: строки «Схема», «Фабрики», «Помощники», «Строки» таблицы имён; собранные `dist` обоих пакетов (их ждёт F2).

- [ ] **Step 1: Сохранить исходники**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools
  $T/af22-pre.sh packages/ppm-canvas/src/index.ts packages/ppm-canvas/src/__tests__/af22-map-schema.test.ts \
    packages/ppm-brand/src/index.ts packages/ppm-brand/src/translations/af22-living-map.ts \
    packages/ppm-brand/src/__tests__/af22-translations.test.ts
  ```
  Ожидание: пять строк `pre-image saved: …` (для трёх новых файлов — `.__absent__`).

- [ ] **Step 2: Написать падающий тест схемы** — `packages/ppm-canvas/src/__tests__/af22-map-schema.test.ts`:
  ```ts
  // AF2.2 F1: «Живая карта» в схеме узлов — необязательное поле `map` у группы (рамка спринта и секции направлений),
  // фабрики рамки и секции, предел размера группы. Всё обратно совместимо: версия схемы — 2, группы без `map` и старые
  // доски читаются как раньше, неизвестные поля (и внутри `map`) сохраняются.
  import { describe, expect, it } from "vitest";
  import {
    PPM_CANVAS_GROUP_MAX_SIZE,
    PPM_CANVAS_MAP_ROLES,
    PPM_CANVAS_NODE_REGISTRY,
    PPM_CANVAS_SCHEMA_VERSION,
    createPpmCanvasNode,
    createPpmMapSectionNode,
    createPpmSprintFrameNode,
    duplicatePpmCanvasNode,
    getPpmCanvasMap,
    parseAndMigratePpmCanvasNode,
    parseSerializedPpmCanvasNode,
    serializePpmCanvasNode,
    updatePpmCanvasNode,
  } from "../index";

  const NOW = "2026-09-26T09:00:00.000Z";
  const CYCLE_ID = "3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a61";
  const MODULE_ID = "8d4e2f1a-6c3b-4a5d-8e9f-0a1b2c3d4e72";

  function storedGroup(extra: Record<string, unknown> = {}) {
    return {
      schema_version: 2,
      kind: "group",
      title: "Механика",
      body: "",
      author_id: "user-1",
      created_at: NOW,
      updated_at: NOW,
      visual: { color: "cyan", width: 560, height: 360 },
      ...extra,
    };
  }

  describe("AF2.2 living map schema", () => {
    it("keeps the board schema version the server accepts and names the two map roles", () => {
      expect(PPM_CANVAS_SCHEMA_VERSION).toBe(2);
      expect(PPM_CANVAS_MAP_ROLES).toEqual(["sprint", "section"]);
    });

    it("reads a pre-AF2.2 group unchanged: no map is added, unknown fields survive", () => {
      const result = parseAndMigratePpmCanvasNode(storedGroup({ future_hint: { keep: true } }));
      expect(result.status).toBe("valid");
      if (result.status !== "valid" || result.node.kind !== "group") throw new Error("Expected a valid group.");
      expect(result.node).not.toHaveProperty("map");
      expect(getPpmCanvasMap(result.node)).toBeUndefined();
      expect(result.node).toMatchObject({ title: "Механика", future_hint: { keep: true }, visual: { color: "cyan" } });
    });

    it("migrates v1 and legacy v0 groups exactly as before — still without a map", () => {
      const v1 = parseAndMigratePpmCanvasNode({ ...storedGroup(), schema_version: 1 });
      expect(v1).toMatchObject({ status: "migrated", node: { schema_version: 2, kind: "group", title: "Механика" } });
      if (v1.status !== "migrated") throw new Error("Expected a migrated group.");
      expect(v1.node).not.toHaveProperty("map");
      const legacy = parseAndMigratePpmCanvasNode({
        kind: "group",
        title: "Старая секция",
        color: "green",
        width: 700,
        height: 500,
      });
      expect(legacy).toMatchObject({
        status: "migrated",
        node: { kind: "group", title: "Старая секция", body: "", visual: { color: "green", width: 700, height: 500 } },
      });
      if (legacy.status !== "migrated") throw new Error("Expected a migrated legacy group.");
      expect(legacy.node).not.toHaveProperty("map");
    });

    it("creates the sprint frame: a neutral section of the default size that carries the cycle", () => {
      const frame = createPpmSprintFrameNode({
        authorId: "user-1",
        cycleId: CYCLE_ID,
        now: NOW,
        title: "Спринт 3 · 16–29 сент.",
      });
      expect(frame).toMatchObject({
        schema_version: 2,
        kind: "group",
        title: "Спринт 3 · 16–29 сент.",
        body: "",
        map: { role: "sprint", cycle_id: CYCLE_ID },
        author_id: "user-1",
        created_at: NOW,
        updated_at: NOW,
        visual: {
          color: "neutral",
          width: PPM_CANVAS_NODE_REGISTRY.group.defaultWidth,
          height: PPM_CANVAS_NODE_REGISTRY.group.defaultHeight,
        },
      });
      expect(parseAndMigratePpmCanvasNode(frame).status).toBe("valid");
      expect(getPpmCanvasMap(frame)).toEqual({ role: "sprint", cycle_id: CYCLE_ID });
    });

    it("creates module sections, «Без направления» included, sized by the caller", () => {
      const section = createPpmMapSectionNode({
        authorId: "user-1",
        height: 620,
        moduleId: MODULE_ID,
        now: NOW,
        title: "Механика",
        width: 1560,
      });
      const unassigned = createPpmMapSectionNode({
        authorId: "user-1",
        moduleId: null,
        now: NOW,
        title: "Без направления",
      });
      expect(section).toMatchObject({
        map: { role: "section", module_id: MODULE_ID },
        visual: { color: "neutral", width: 1560, height: 620 },
      });
      expect(unassigned.map).toEqual({ role: "section", module_id: null });
      for (const node of [section, unassigned])
        expect(parseSerializedPpmCanvasNode(serializePpmCanvasNode(node))).toMatchObject({
          status: "valid",
          node: { kind: "group", map: node.map },
        });
    });

    it("lets a map group grow past the card limit up to the group limit; other kinds keep 1600 × 1200", () => {
      expect(PPM_CANVAS_GROUP_MAX_SIZE).toBe(20_000);
      const tall = createPpmSprintFrameNode({
        authorId: "user-1",
        cycleId: CYCLE_ID,
        height: 4200,
        now: NOW,
        title: "Спринт",
        width: 3400,
      });
      expect(tall.visual).toMatchObject({ width: 3400, height: 4200 });
      expect(
        parseAndMigratePpmCanvasNode(storedGroup({ visual: { color: "neutral", width: 20_000, height: 20_000 } })).status
      ).toBe("valid");
      expect(
        parseAndMigratePpmCanvasNode(storedGroup({ visual: { color: "neutral", width: 20_001, height: 400 } })).status
      ).toBe("corrupt");
      const note = createPpmCanvasNode({ authorId: "user-1", kind: "note", now: NOW, title: "Заметка" });
      expect(parseAndMigratePpmCanvasNode({ ...note, visual: { ...note.visual, width: 1601 } }).status).toBe("corrupt");
      // A collapsed tall section remembers its full height (shape.tsx toggleCollapsed writes expanded_height).
      const collapsed = updatePpmCanvasNode(
        tall,
        { visual: { ...tall.visual, collapsed: true, expanded_height: 4200, height: 104 } },
        NOW
      );
      expect(collapsed.visual).toMatchObject({ collapsed: true, expanded_height: 4200, height: 104 });
    });

    it("keeps unknown fields inside map and rejects a malformed map", () => {
      expect(
        parseAndMigratePpmCanvasNode(storedGroup({ map: { role: "section", module_id: MODULE_ID, order: 2 } }))
      ).toMatchObject({ status: "valid", node: { map: { role: "section", module_id: MODULE_ID, order: 2 } } });
      for (const map of [
        { role: "sprint" },
        { role: "sprint", cycle_id: "not-a-uuid" },
        { role: "section", module_id: "not-a-uuid" },
        { role: "timeline", cycle_id: CYCLE_ID },
      ])
        expect(parseAndMigratePpmCanvasNode(storedGroup({ map })).status, JSON.stringify(map)).toBe("corrupt");
      expect(() => createPpmSprintFrameNode({ authorId: "user-1", cycleId: "abc", now: NOW, title: "Спринт" })).toThrow();
    });

    it("clips a long Plane name to the title limit without splitting a character", () => {
      const long = `${"Направление ".repeat(20)}🚀`;
      const section = createPpmMapSectionNode({ authorId: "user-1", moduleId: MODULE_ID, now: NOW, title: long });
      expect(section.title.length).toBeLessThanOrEqual(160);
      expect(long.startsWith(section.title)).toBe(true);
      // The rocket's high surrogate would be unit 160: the title stops before it.
      const edge = `${"a".repeat(159)}🚀`;
      expect(createPpmMapSectionNode({ authorId: "user-1", moduleId: null, now: NOW, title: edge }).title).toBe(
        "a".repeat(159)
      );
    });

    it("updates a map group without losing its role and copies it as an ordinary section", () => {
      const section = createPpmMapSectionNode({ authorId: "user-1", moduleId: MODULE_ID, now: NOW, title: "Софт" });
      const renamed = updatePpmCanvasNode(section, { title: "Софт и прошивка" }, NOW);
      expect(renamed.map).toEqual({ role: "section", module_id: MODULE_ID });
      const copy = duplicatePpmCanvasNode(section, "user-2", NOW);
      expect(copy).not.toHaveProperty("map");
      expect(copy).toMatchObject({ kind: "group", title: "Софт", author_id: "user-2" });
      expect(parseAndMigratePpmCanvasNode(copy).status).toBe("valid");
    });

    it("finds the map role only on groups that carry one", () => {
      const note = createPpmCanvasNode({ authorId: "user-1", kind: "note", now: NOW, title: "Заметка" });
      const group = createPpmCanvasNode({ authorId: "user-1", kind: "group", now: NOW, title: "Секция" });
      expect(getPpmCanvasMap(note)).toBeUndefined();
      expect(getPpmCanvasMap(group)).toBeUndefined();
    });
  });
  ```

- [ ] **Step 3: Написать падающий тест переводов** — `packages/ppm-brand/src/__tests__/af22-translations.test.ts`:
  ```ts
  // AF2.2 F1: строки «Живой карты» — паритет en/ru, блоки линий F, M, C, T в каждой локали и ключи только со своим
  // префиксом, без пересечений с модулями UX1.1 и AF2.1, без «ИИ»; модуль подключён последним спредом обеих локалей
  // и доходит до PPM_TRANSLATIONS без изменений.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation, PPM_TRANSLATIONS } from "../index";
  import { AF21_CANVAS_TRANSLATIONS } from "../translations/af21-canvas";
  import { AF22_LIVING_MAP_TRANSLATIONS } from "../translations/af22-living-map";
  import { UX11_CANVAS_TRANSLATIONS } from "../translations/ux11-canvas";
  import { UX11_SYSTEM_TRANSLATIONS } from "../translations/ux11-system";
  import { UX11_TASKS_TRANSLATIONS } from "../translations/ux11-tasks";

  type TLane = "F" | "M" | "C" | "T";

  const LANE_PREFIX: Record<TLane, RegExp> = {
    F: /^canvas\.af22\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$/,
    M: /^canvas\.(?:map|traffic|tray)\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$/,
    C: /^canvas\.changes\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$/,
    T: /^issue\.canvas_boards\.[a-z0-9_]+(?:\.[a-z0-9_]+)*$/,
  };
  const source = readFileSync(new URL("../translations/af22-living-map.ts", import.meta.url), "utf8");
  const indexSource = readFileSync(new URL("../index.ts", import.meta.url), "utf8");

  function localeSection(locale: "en" | "ru"): string {
    const start = source.indexOf(`  ${locale}: {`);
    return source.slice(start, locale === "en" ? source.indexOf("  ru: {") : source.indexOf("} as const;"));
  }

  /** Keys of one locale grouped by the lane block (`// ── F: …`) they are written in. */
  function keysByLane(locale: "en" | "ru"): Record<TLane, string[]> {
    const lanes: Record<TLane, string[]> = { F: [], M: [], C: [], T: [] };
    let lane: TLane | undefined;
    for (const line of localeSection(locale).split("\n")) {
      const marker = /\/\/ ── ([FMCT]):/.exec(line);
      if (marker) lane = marker[1] as TLane;
      const key = /^\s+"([^"]+)":/.exec(line);
      if (!key) continue;
      expect(lane, `${locale}: ${key[1]} stands before the F block`).toBeDefined();
      if (lane) lanes[lane].push(key[1]);
    }
    return lanes;
  }

  describe("AF2.2 living map translations", () => {
    it("en and ru carry the same keys", () => {
      expect(Object.keys(AF22_LIVING_MAP_TRANSLATIONS.ru).toSorted()).toEqual(
        Object.keys(AF22_LIVING_MAP_TRANSLATIONS.en).toSorted()
      );
    });

    it("opens the four lane blocks once per locale, in the order F, M, C, T", () => {
      for (const locale of ["en", "ru"] as const)
        expect(
          [...localeSection(locale).matchAll(/\/\/ ── ([FMCT]):/g)].map((match) => match[1]),
          locale
        ).toEqual(["F", "M", "C", "T"]);
    });

    it("keeps every key in its lane's block with the lane's prefix, the same keys in both locales", () => {
      const en = keysByLane("en");
      const ru = keysByLane("ru");
      for (const lane of ["F", "M", "C", "T"] as const) {
        for (const key of en[lane]) expect(key, `en ${lane}`).toMatch(LANE_PREFIX[lane]);
        expect(ru[lane].toSorted(), lane).toEqual(en[lane].toSorted());
      }
      expect(Object.values(en).flat()).toHaveLength(Object.keys(AF22_LIVING_MAP_TRANSLATIONS.en).length);
    });

    it("never shares a key with the UX1.1 and AF2.1 modules", () => {
      const earlier = new Set(
        [UX11_SYSTEM_TRANSLATIONS, UX11_TASKS_TRANSLATIONS, UX11_CANVAS_TRANSLATIONS, AF21_CANVAS_TRANSLATIONS].flatMap(
          (mod) => Object.keys(mod.en)
        )
      );
      for (const key of Object.keys(AF22_LIVING_MAP_TRANSLATIONS.en)) expect(earlier.has(key), key).toBe(false);
    });

    it("is the last spread of both locales and reaches PPM_TRANSLATIONS unchanged", () => {
      for (const locale of ["en", "ru"] as const) {
        expect(indexSource).toMatch(
          new RegExp(
            `\\.\\.\\.AF21_CANVAS_TRANSLATIONS\\.${locale},\\s+\\.\\.\\.AF22_LIVING_MAP_TRANSLATIONS\\.${locale},\\s+\\},`
          )
        );
        for (const [key, value] of Object.entries(AF22_LIVING_MAP_TRANSLATIONS[locale]))
          expect((PPM_TRANSLATIONS[locale] as Record<string, string>)[key], `${locale}:${key}`).toBe(value);
      }
    });

    it("names the foundation's actions as in the rail, the empty board and the link notice", () => {
      expect(getPpmTranslation("ru", "canvas.af22.sprint_map")).toBe("Карта спринта");
      expect(getPpmTranslation("ru", "canvas.af22.source_sprints")).toBe("Спринты");
      expect(getPpmTranslation("ru", "canvas.af22.empty_sprint_map")).toBe("Собрать карту спринта");
      expect(getPpmTranslation("en", "canvas.af22.sprint_map")).toBe("Sprint map");
      for (const key of ["canvas.af22.sprint_map_hint", "canvas.af22.shape_not_found"] as const) {
        expect(getPpmTranslation("ru", key), key).toMatch(/[а-яё]/i);
        expect(getPpmTranslation("en", key), key).not.toMatch(/[а-яё]/i);
      }
    });

    it("never says «ИИ»/AI", () => {
      for (const value of Object.values(AF22_LIVING_MAP_TRANSLATIONS.ru))
        expect(value).not.toMatch(/(?<!\p{L})ИИ(?!\p{L})/u);
      for (const value of Object.values(AF22_LIVING_MAP_TRANSLATIONS.en)) expect(value).not.toMatch(/\bAI\b/);
    });
  });
  ```

- [ ] **Step 4: Убедиться, что оба теста падают**
  ```bash
  cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run src/__tests__/af22-map-schema.test.ts
  cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/af22-translations.test.ts
  ```
  Ожидание: canvas — FAIL: `SyntaxError`/`TypeError` импорта (`createPpmSprintFrameNode`, `getPpmCanvasMap`,
  `PPM_CANVAS_MAP_ROLES` … не экспортируются); brand — FAIL: `Failed to load url ../translations/af22-living-map`
  (модуля ещё нет).

- [ ] **Step 5: Реализовать схему в `packages/ppm-canvas/src/index.ts`**
  1. Группа (`:198-203`) — было:
     ```ts
     export const ppmCanvasGroupSchema = z
       .object({
         ...sharedOwnedNodeFields,
         kind: z.literal("group"),
       })
       .passthrough();
     ```
     стало:
     ```ts
     // AF2.2 F: «Живая карта». Рамка спринта и секции направлений — обычные секции (группы) с необязательным полем `map`:
     // `{ role: "sprint", cycle_id }` у рамки, `{ role: "section", module_id }` у секции («Без направления» — null).
     // Группы без `map` и старые доски читаются как раньше; неизвестные поля (и внутри `map`) сохраняются; версия — 2.
     // Секция карты вмещает сетку карточек любой длины, поэтому предел размера группы шире общего 1600 × 1200;
     // ручное изменение размера по-прежнему ограничивает onResize карточки (shape.tsx).
     export const PPM_CANVAS_GROUP_MAX_SIZE = 20_000;
     export const PPM_CANVAS_MAP_ROLES = ["sprint", "section"] as const;
     export type TPpmCanvasMapRole = (typeof PPM_CANVAS_MAP_ROLES)[number];

     export const ppmCanvasMapSchema = z.discriminatedUnion("role", [
       z.object({ role: z.literal("sprint"), cycle_id: z.string().uuid() }).passthrough(),
       z.object({ role: z.literal("section"), module_id: z.string().uuid().nullable() }).passthrough(),
     ]);

     const groupVisualSchema = visualSchema.extend({
       expanded_height: z.number().finite().min(96).max(PPM_CANVAS_GROUP_MAX_SIZE).optional(),
       width: z.number().finite().min(160).max(PPM_CANVAS_GROUP_MAX_SIZE),
       height: z.number().finite().min(96).max(PPM_CANVAS_GROUP_MAX_SIZE),
     });

     export const ppmCanvasGroupSchema = z
       .object({
         ...sharedOwnedNodeFields,
         kind: z.literal("group"),
         visual: groupVisualSchema,
         map: ppmCanvasMapSchema.optional(),
       })
       .passthrough();
     ```
     (`visualSchema` — `z.object(...).passthrough()`; `.extend()` в zod 3 сохраняет `passthrough`, неизвестные поля
     `visual` не теряются — закреплено тестом «reads a pre-AF2.2 group unchanged».)
  2. После строки `export type TPpmCanvasPageRefNode = z.infer<typeof ppmCanvasPageRefSchema>;` (`:692`) добавить:
     ```ts
     export type TPpmCanvasGroupNode = z.infer<typeof ppmCanvasGroupSchema>;
     export type TPpmCanvasMap = z.infer<typeof ppmCanvasMapSchema>;
     export type TPpmCanvasSprintMap = Extract<TPpmCanvasMap, { role: "sprint" }>;
     export type TPpmCanvasSectionMap = Extract<TPpmCanvasMap, { role: "section" }>;
     ```
  3. Перед строкой `export function createPpmVaultFileRefNode({` (`:1370`) вставить:
     ```ts
     type TPpmMapGroupInput = {
       authorId: string;
       /** Palette colour; the living map keeps the neutral one, as the v2 sections do. */
       color?: TPpmCanvasColor;
       /** Page px; the section default (560 × 360) when omitted, up to PPM_CANVAS_GROUP_MAX_SIZE. */
       height?: number;
       now?: string;
       /** A Plane name — clipped to the 160-unit title limit. */
       title: string;
       width?: number;
     };

     /** AF2.2 F: the sprint frame of a living map — a section with `map: { role: "sprint", cycle_id }`. */
     export function createPpmSprintFrameNode({
       cycleId,
       ...input
     }: TPpmMapGroupInput & { cycleId: string }): TPpmCanvasGroupNode {
       return createPpmMapGroupNode(input, { role: "sprint", cycle_id: cycleId });
     }

     /** AF2.2 F: a module section of a living map; `moduleId: null` is «Без направления». */
     export function createPpmMapSectionNode({
       moduleId,
       ...input
     }: TPpmMapGroupInput & { moduleId: string | null }): TPpmCanvasGroupNode {
       return createPpmMapGroupNode(input, { role: "section", module_id: moduleId });
     }

     function createPpmMapGroupNode(
       { authorId, color = "neutral", height, now = new Date().toISOString(), title, width }: TPpmMapGroupInput,
       map: TPpmCanvasMap
     ): TPpmCanvasGroupNode {
       const definition = PPM_CANVAS_NODE_REGISTRY.group;
       return ppmCanvasGroupSchema.parse({
         schema_version: PPM_CANVAS_SCHEMA_VERSION,
         kind: "group",
         title: clipPpmCanvasTitle(title),
         body: "",
         map,
         author_id: authorId,
         created_at: now,
         updated_at: now,
         visual: {
           color,
           width: width ?? definition.defaultWidth,
           height: height ?? definition.defaultHeight,
         },
       });
     }

     /** AF2.2 F: the living-map role of a node — `map` of a sprint frame or a map section; undefined otherwise. */
     export function getPpmCanvasMap(node: TPpmCanvasNode): TPpmCanvasMap | undefined {
       return node.kind === "group" ? node.map : undefined;
     }

     // A Plane name as a card title: at most 160 UTF-16 units (as the schema counts), never cut inside a surrogate pair.
     function clipPpmCanvasTitle(title: string, limit = 160): string {
       if (title.length <= limit) return title;
       const last = title.charCodeAt(limit - 1);
       return title.slice(0, last >= 0xd800 && last <= 0xdbff ? limit - 1 : limit);
     }

     ```
  4. `duplicatePpmCanvasNode` (`:2090-2094`) — было:
     ```ts
       if (node.kind === "deck") {
         duplicate.slides = node.slides.map((slide) => ({ ...slide, id: createPortableId() }));
         duplicate.active_slide = 0;
       }
       return ppmCanvasNodeSchema.parse(duplicate) as TNode;
     ```
     стало:
     ```ts
       if (node.kind === "deck") {
         duplicate.slides = node.slides.map((slide) => ({ ...slide, id: createPortableId() }));
         duplicate.active_slide = 0;
       }
       // AF2.2 F: a copied sprint frame or map section is an ordinary section — the map keeps one frame per sprint.
       if (node.kind === "group") delete duplicate.map;
       return ppmCanvasNodeSchema.parse(duplicate) as TNode;
     ```

- [ ] **Step 6: Прогнать пакет холста и собрать его `dist`**
  ```bash
  cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs; ./node_modules/.bin/tsc --noEmit
  ../../node_modules/.bin/oxfmt src/index.ts src/__tests__/af22-map-schema.test.ts
  $T/af22-pkg-build.sh ppm-canvas
  ```
  Ожидание: `Test Files 4 passed (4)`, `Tests 60 passed (60)` (50 + 10); `PPM Canvas browser boundary audit passed`;
  tsc — ровно одна старая ошибка `TS2322` (`orchcall`/`orchtask`, номер строки сдвинулся), других нет; сборка без ошибок
  (`dist/index.d.mts` содержит `createPpmSprintFrameNode`, `getPpmCanvasMap`, `PPM_CANVAS_GROUP_MAX_SIZE`:
  `grep -c "createPpmSprintFrameNode\|getPpmCanvasMap\|PPM_CANVAS_GROUP_MAX_SIZE" dist/index.d.mts` → ≥ 3).

- [ ] **Step 7: Создать модуль переводов** — `packages/ppm-brand/src/translations/af22-living-map.ts`:
  ```ts
  // AF2.2 · Живая карта проекта. Только новые ключи; существующие ключи PPM_TRANSLATIONS не переопределяются
  // (дубликат явного ключа — ошибка TS2783, дубликат ключа модулей UX1.1/AF2.1 ловит af22-translations.test.ts).
  // Блоки по линиям плана, en и ru вместе: F — фундамент (canvas.af22.*); M — карта спринта, «Светофор», «Не на карте»,
  // связи «из Задач» (canvas.map.*, canvas.traffic.*, canvas.tray.*); C — «Что изменилось» (canvas.changes.*);
  // T — «На карте» в задаче, вне Холста (issue.canvas_boards.*; пишет линия C). Линия пишет только в свой блок.
  // Словарь PPM: «спринт», «направление», «задача» — не «цикл», «модуль», «рабочий элемент» (i18n-overlay.test.ts).
  export const AF22_LIVING_MAP_TRANSLATIONS = {
    en: {
      // ── F: фундамент — «Карта спринта» в рейке и на пустой доске, глубокая ссылка на карточку ──
      "canvas.af22.sprint_map": "Sprint map",
      "canvas.af22.sprint_map_hint": "A new board from a sprint: directions, tasks, links",
      "canvas.af22.source_sprints": "Sprints",
      "canvas.af22.empty_sprint_map": "Build a sprint map",
      "canvas.af22.shape_not_found": "The card from the link is not on this board — it may have been removed",
      // ── M: карта спринта, «Светофор», «Не на карте», связи «из Задач» ──
      // ── C: «Что изменилось» ──
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
    ru: {
      // ── F: фундамент — «Карта спринта» в рейке и на пустой доске, глубокая ссылка на карточку ──
      "canvas.af22.sprint_map": "Карта спринта",
      "canvas.af22.sprint_map_hint": "Новая доска из спринта: направления, задачи, связи",
      "canvas.af22.source_sprints": "Спринты",
      "canvas.af22.empty_sprint_map": "Собрать карту спринта",
      "canvas.af22.shape_not_found": "Карточки из ссылки нет на этой доске — возможно, её убрали",
      // ── M: карта спринта, «Светофор», «Не на карте», связи «из Задач» ──
      // ── C: «Что изменилось» ──
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
  } as const;
  ```
  И в `packages/ppm-brand/src/index.ts`:
  - `:2` — после `import { AF21_CANVAS_TRANSLATIONS } from "./translations/af21-canvas";` добавить
    `import { AF22_LIVING_MAP_TRANSLATIONS } from "./translations/af22-living-map";`.
  - `:830` — было:
    ```ts
        ...AF21_CANVAS_TRANSLATIONS.en,
      },
      ru: {
    ```
    стало:
    ```ts
        ...AF21_CANVAS_TRANSLATIONS.en,
        ...AF22_LIVING_MAP_TRANSLATIONS.en,
      },
      ru: {
    ```
  - `:1640` — было:
    ```ts
        ...AF21_CANVAS_TRANSLATIONS.ru,
      },
    } as const;
    ```
    стало:
    ```ts
        ...AF21_CANVAS_TRANSLATIONS.ru,
        ...AF22_LIVING_MAP_TRANSLATIONS.ru,
      },
    } as const;
    ```

- [ ] **Step 8: Прогнать пакет бренда и собрать его `dist`**
  ```bash
  cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit
  ../../node_modules/.bin/oxfmt src/index.ts src/translations/af22-living-map.ts src/__tests__/af22-translations.test.ts
  $T/af22-pkg-build.sh ppm-brand
  ```
  Ожидание: `Test Files 8 passed (8)`, `Tests 93 passed (93)` (86 + 7; `i18n-overlay.test.ts` по-прежнему зелёный —
  в ru нет «цикл»/«модуль»); оба аудита `passed`; tsc без ошибок (ru и en совпадают по ключам, иначе
  `getPpmTranslation` не типизируется); сборка без ошибок (`grep -c "canvas.af22.sprint_map" dist/index.d.mts` → ≥ 1).

- [ ] **Step 9: Web не сломан новой схемой и строками**
  ```bash
  cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/af22-F1.tsbuildinfo
  cd $PF/apps/web && ./node_modules/.bin/vitest run
  ```
  Ожидание: tsc — 0 ошибок (у `visual` группы та же форма, `map` необязателен); vitest — `72 passed` файлов,
  `599 passed` тестов, как в базовой линии.

---

### Task 2 (F2): «Карта спринта», папка `living-map/`, точки монтирования линий M и C, глубокая ссылка `?shape=`

**Files (все web-пути — от `apps/web/core/components/ppm-canvas/`, если не указано иначе):**
- Modify: `commands.ts` — `PPM_CANVAS_COMMANDS` (после `"add-git",`, сейчас `:49`).
- Modify: `canvas-toolkit-model.ts` — `PPM_RAIL_MENUS.project.items` (после пункта `add-page-ref`, `:143`).
- Modify: `canvas-rail.tsx` — импорт `lucide-react` (`:17-18`), `ITEM_ICONS` (`:79`).
- Modify: `workspace.tsx` — эффект адреса `board` (`:279-283`), палитра команд (после блока `add-file`, `:697-712`),
  `<PpmCanvasEditor …>` (после `onOpenBoard={openBoard}`, `:1003`).
- Modify: `editor.tsx` — импорты (`:25` lucide, `:108` commands, после `// ── /AF2.1 B ──` `:232`, CSS `:242`),
  `TPpmCanvasEditorProps` (`:260`), деструктуризация пропсов (`:326`), блок окружения перед
  `const components = useMemo<TLComponents>(` (`:2717-2719`), `<Tldraw>` (`:3143-3166`), `CanvasControls`: `case` в
  обработчике команд (`:3688`), константа `boardInfo` и колонка (`:3941-4099`), пустое состояние (`:4103-4115`).
- Create (F): `living-map/living-map-types.ts`, `living-map/living-map-context.ts`, `living-map/living-map-provider.tsx`,
  `living-map/shape-link.ts`, `living-map/living-map.css`.
- Create (заглушки, владелец M): `living-map/living-map-facts.ts`, `living-map/task-relations-layer.tsx`,
  `living-map/traffic-light-toggle.tsx`, `living-map/not-on-map-tray.tsx`, `living-map/map-assembly-dialog.tsx`.
- Create (заглушки, владелец C): `living-map/board-changes.ts`, `living-map/changes-button.tsx`, `living-map/changes-panel.tsx`.
- Modify: `packages/ppm-brand/scripts/audit-tailwind-classes.mjs` — `customCssFiles` (после `canvas-content.css`) и
  `extraFiles` (в конец).
- Create: `apps/web/tests/ppm-canvas/af22-foundation.test.ts`.
- Modify: `apps/web/tests/ppm-canvas/toolkit-model.test.ts:99-105`, `apps/web/tests/ppm-canvas/files-vault-picker.test.ts:69-75, :90-95`.
- Не трогать: `shape.tsx` (там блоки M и C создают сами линии), `canvas-rail-legacy.tsx`, `minimal-workspace.tsx`.

**Interfaces:**
- Consumes (F1, после сборки `dist`): `TPpmCanvasMapRole`, `TPpmCanvasBinding`, `TPpmCanvasBoard` (`@ppm/canvas`); ключи
  `canvas.af22.*` (`@ppm/brand`), `getPpmProjectPath` (`@ppm/brand`). Из AF2.1: `replaceCanvasSearch` (`editor.tsx`, внизу
  файла), `setContentNotice` (блок AF2.1 B1, `:1480`), `queuedBindingActivationsRef`, `scheduleSaveRef`,
  `setBindingsByShapeId`, `initializationTick`, `effectiveCanEdit`, `grammarV2`, `isActive` (`PpmCanvasEditor`),
  `CanvasControls` (пропсы `boardId`, `canEdit`; `usePpmCanvasGrammarV2()`), `dispatchPpmCanvasCommand` (`commands.ts`),
  `upsertBoard`, `openBoard` (`workspace.tsx`), `visibleRailMenuItems`/`PPM_RAIL_MENUS` (`canvas-toolkit-model.ts`).
- Produces: строки «Команда», «Типы», «Контекст», «Провайдер», «Ссылка», «Заглушки M», «Заглушки C», «CSS», «editor.tsx»
  таблицы имён. Точные сигнатуры:
  - `useLivingMapFacts(args: TLivingMapArgs): TLivingMapFacts`; `useBoardChanges(args: TLivingMapArgs): TBoardChangeIndex`;
  - `openSprintMapDialog(request: { boardId: string }): void`; `PpmSprintMapDialog(): JSX | null`;
    `PpmTaskRelationsLayer()`, `PpmTrafficLightToggle()`, `PpmNotOnMapTray()`, `PpmChangesButton()`, `PpmChangesPanel()` —
    компоненты без пропсов (всё берут из `usePpmLivingMap()` и `useEditor()`);
  - `TLivingMapArgs.registerBindings(bindings: readonly TPpmCanvasBinding[]): void` — фигуры создаёт вызывающий;
  - `TLivingMapArgs.onBoardCreated(board: TPpmCanvasBoard): void` — рабочее пространство добавляет доску и открывает вкладку;
  - `canvasShapeLinkPath(workspaceSlug, projectId, boardId, shapeId): string`,
    `takeCanvasShapeLink(search, boardId): { search: string; shapeId: string } | undefined`,
    `revealCanvasShape(editor, shapeId): boolean`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools
  D=apps/web/core/components/ppm-canvas
  L=$D/living-map
  $T/af22-pre.sh $D/commands.ts $D/canvas-toolkit-model.ts $D/canvas-rail.tsx $D/workspace.tsx $D/editor.tsx \
    $L/living-map-types.ts $L/living-map-context.ts $L/living-map-provider.tsx $L/shape-link.ts $L/living-map.css \
    $L/living-map-facts.ts $L/task-relations-layer.tsx $L/traffic-light-toggle.tsx $L/not-on-map-tray.tsx \
    $L/map-assembly-dialog.tsx $L/board-changes.ts $L/changes-button.tsx $L/changes-panel.tsx \
    packages/ppm-brand/scripts/audit-tailwind-classes.mjs apps/web/tests/ppm-canvas/af22-foundation.test.ts \
    apps/web/tests/ppm-canvas/toolkit-model.test.ts apps/web/tests/ppm-canvas/files-vault-picker.test.ts
  ```
  Ожидание: 22 строки `pre-image saved: …` (14 новых файлов — `.__absent__`).

- [ ] **Step 2: Написать падающий тест фундамента** — `apps/web/tests/ppm-canvas/af22-foundation.test.ts`:
  ```ts
  // AF2.2 F2: фундамент «Живой карты». Команда «Карта спринта» (рейка «Из проекта», палитра v2, пустая доска v2);
  // провайдер вокруг <Tldraw>; правая колонка в CanvasControls; слой связей и диалог сборки — дочерние <Tldraw>;
  // размеченные блоки линий M и C сбалансированы; living-map.css — только v2; глубокая ссылка ?shape= — только у
  // активной вкладки после загрузки доски.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { isCanvasCommandAllowedReadOnly } from "@/components/ppm-canvas/board-workspace-state";
  import { PPM_RAIL_MENUS, visibleRailMenuItems } from "@/components/ppm-canvas/canvas-toolkit-model";
  import { PPM_CANVAS_COMMANDS } from "@/components/ppm-canvas/commands";
  import {
    PPM_LIVING_MAP_DEFAULT,
    readTrafficLightPreference,
    trafficLightStorageKey,
    writeTrafficLightPreference,
  } from "@/components/ppm-canvas/living-map/living-map-context";
  import {
    canvasShapeLinkPath,
    revealCanvasShape,
    takeCanvasShapeLink,
  } from "@/components/ppm-canvas/living-map/shape-link";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const editor = read("editor.tsx");
  const workspace = read("workspace.tsx");
  const rail = read("canvas-rail.tsx");
  const types = read("living-map/living-map-types.ts");
  const provider = read("living-map/living-map-provider.tsx");
  const css = read("living-map/living-map.css");
  // Formatting-proof source checks, as in rail-v2.test.ts: oxfmt may wrap calls and add trailing commas.
  const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  function functionSource(source: string, name: string): string {
    const start = source.indexOf(`function ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const next = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, next === -1 ? undefined : next);
  }

  function sliceBetween(source: string, from: string, to: string): string {
    const start = source.indexOf(from);
    expect(start, from).toBeGreaterThan(-1);
    const end = source.indexOf(to, start + from.length);
    expect(end, to).toBeGreaterThan(start);
    return source.slice(start, end);
  }

  function blocks(source: string, lane: "F" | "M" | "C"): { closed: number; opened: number } {
    return {
      closed: source.split(`── /AF2.2 ${lane} ──`).length - 1,
      opened: source.split(`── AF2.2 ${lane}:`).length - 1,
    };
  }

  // Every selector of a stylesheet (comma lists split; @-rules and keyframe steps skipped).
  function cssSelectors(source: string): string[] {
    const flat = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
    return [...flat.matchAll(/([^{}]+)\{/g)]
      .map((match) => match[1].trim())
      .filter((prelude) => !prelude.startsWith("@") && !/^(?:from|to|\d+(?:\.\d+)?%)$/.test(prelude))
      .flatMap((prelude) => prelude.split(",").map((selector) => selector.trim()));
  }

  function memoryStorage(initial: Record<string, string> = {}) {
    const values = new Map(Object.entries(initial));
    return {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      values,
    };
  }

  function throwingStorage() {
    return {
      getItem: (): string | null => {
        throw new Error("denied");
      },
      setItem: (): void => {
        throw new Error("denied");
      },
    };
  }

  // A tldraw editor reduced to what revealCanvasShape calls; shapes are page boxes by id.
  function fakeEditor(boxes: Record<string, { h: number; w: number; x: number; y: number }>) {
    const calls: string[] = [];
    const fake = {
      centerOnPoint: (point: { x: number; y: number }, options?: { animation?: { duration: number } }) => {
        calls.push(`center ${point.x},${point.y}${options?.animation ? " animated" : ""}`);
        return fake;
      },
      getShape: (id: string) => (boxes[id] ? { id } : undefined),
      getShapePageBounds: (id: string) => {
        const box = boxes[id];
        return box ? { center: { x: box.x + box.w / 2, y: box.y + box.h / 2 } } : undefined;
      },
      select: (id: string) => {
        calls.push(`select ${id}`);
        return fake;
      },
    };
    return { calls, editor: fake as unknown as Parameters<typeof revealCanvasShape>[0] };
  }

  describe("AF2.2 F2: «Карта спринта» — команда, рейка, палитра, пустая доска", () => {
    it("declares build-sprint-map once, as an editing command in both designs", () => {
      expect(PPM_CANVAS_COMMANDS).toContain("build-sprint-map");
      expect(new Set(PPM_CANVAS_COMMANDS).size).toBe(PPM_CANVAS_COMMANDS.length);
      expect(isCanvasCommandAllowedReadOnly("build-sprint-map", true)).toBe(false);
      expect(isCanvasCommandAllowedReadOnly("build-sprint-map", false)).toBe(false);
    });

    it("closes «Из проекта» with «Карта спринта» for editors only, with its hint, source and icon", () => {
      expect(PPM_RAIL_MENUS.project.items.at(-1)).toEqual({
        command: "build-sprint-map",
        labelKey: "canvas.af22.sprint_map",
        hintKey: "canvas.af22.sprint_map_hint",
        sourceKey: "canvas.af22.source_sprints",
      });
      expect(visibleRailMenuItems(PPM_RAIL_MENUS.project, false)).toEqual([]);
      has(rail, '"build-sprint-map": MapIcon');
      expect(getPpmTranslation("ru", "canvas.af22.sprint_map")).toBe("Карта спринта");
      expect(getPpmTranslation("ru", "canvas.af22.source_sprints")).toBe("Спринты");
    });

    it("offers it in the v2 command palette, among the commands of an editable board", () => {
      const block = sliceBetween(workspace, "// ── AF2.2 F: «Карта спринта»", "// ── /AF2.2 F ──");
      has(block, '...(designV2 ? [{ command: "build-sprint-map" as const, id: "build-sprint-map",');
      has(block, 'label: ppmT("canvas.af22.sprint_map")');
      expect(sliceBetween(workspace, "...(activeBoardEditReady", 'command: "undo" as const')).toContain(
        "// ── AF2.2 F: «Карта спринта»"
      );
    });

    it("adds «Собрать карту спринта» to an editor's empty v2 board, through the same command", () => {
      const controls = functionSource(editor, "CanvasControls");
      const empty = controls.slice(controls.indexOf("{shapeCount === 0 && ("));
      has(empty, "{grammarV2 && canEdit && (");
      has(empty, 'onClick={() => dispatchPpmCanvasCommand({ boardId, command: "build-sprint-map" })}');
      has(empty, '{ppmT("canvas.af22.empty_sprint_map")}');
      expect(getPpmTranslation("ru", "canvas.af22.empty_sprint_map")).toBe("Собрать карту спринта");
    });

    it("hands the command to line M inside its block of CanvasControls (an editor under v2 only)", () => {
      // The imports block of line M also names «Карта спринта» — anchor on the command block's own marker.
      const block = sliceBetween(editor, "// ── AF2.2 M: команда build-sprint-map", "// ── /AF2.2 M ──");
      has(block, 'case "build-sprint-map":');
      has(block, "openSprintMapDialog(");
      expect(block).toMatch(/\bcanEdit\b/);
      expect(block).toMatch(/\bgrammarV2\b/);
    });
  });

  describe("AF2.2 F2: точки монтирования линий M и C", () => {
    it("wraps <Tldraw> in the living-map provider, built from the editor's own state", () => {
      const open = editor.indexOf("<PpmLivingMapProvider args={livingMapArgs}>");
      expect(open).toBeGreaterThan(-1);
      expect(open).toBeLessThan(editor.indexOf("<Tldraw\n"));
      expect(editor.indexOf("</PpmLivingMapProvider>")).toBeGreaterThan(editor.indexOf("</Tldraw>"));
      const body = sliceBetween(
        editor,
        "// ── AF2.2 F: «Живая карта» — окружение",
        "const components = useMemo<TLComponents>("
      );
      for (const needle of [
        "canEdit: effectiveCanEdit,",
        "enabled: grammarV2,",
        "loaded: livingMapLoaded,",
        "registerBindings: registerLivingMapBindings,",
        "onBoardCreated: (board) => onBoardCreatedRef.current?.(board),",
        "for (const binding of bindings) queuedBindingActivationsRef.current.add(binding.binding_id);",
        "scheduleSaveRef.current();",
        "...livingMapArgsM,",
        "...livingMapArgsC,",
      ])
        has(body, needle);
      expect(body).toMatch(/\n\s+isActive,\n/);
      has(provider, "const map = useLivingMapFacts(args);");
      has(provider, "const changes = useBoardChanges(args);");
      has(provider, "<PpmLivingMapContext.Provider value={value}>{children}</PpmLivingMapContext.Provider>");
    });

    it("mounts the relations layer and the sprint-map dialog as leaf children of <Tldraw>, never in the components memo", () => {
      const tldraw = editor.slice(editor.indexOf("<Tldraw\n"), editor.indexOf("</Tldraw>"));
      expect(tldraw).toMatch(/\{grammarV2 &&[^\n]*<PpmTaskRelationsLayer\b/);
      expect(tldraw).toMatch(/\{grammarV2 &&[^\n]*<PpmSprintMapDialog\b/);
      const memo = editor.slice(
        editor.indexOf("const components = useMemo<TLComponents>("),
        editor.indexOf("const projectionContext = useMemo(")
      );
      for (const name of ["PpmTaskRelationsLayer", "PpmSprintMapDialog", "PpmLivingMapProvider"])
        expect(memo, name).not.toContain(name);
    });

    it("puts the right column next to «Доска · Объектов» under v2 and keeps v1's pill as it was", () => {
      const controls = functionSource(editor, "CanvasControls");
      expect(controls).toMatch(
        /\{grammarV2 \? \(\s*<div className="ppm-living-map-aside">[\s\S]*?\) : \(?\s*boardInfo\s*\)?\}/
      );
      const aside = sliceBetween(controls, '<div className="ppm-living-map-aside">', "{/* ── /AF2.2 F ── */}");
      const bar = sliceBetween(aside, '<div className="ppm-living-map-aside__bar">', "{boardInfo}");
      has(bar, "<PpmTrafficLightToggle");
      has(bar, "<PpmChangesButton");
      const panels = aside.slice(aside.indexOf("{boardInfo}"));
      has(panels, "<PpmChangesPanel");
      has(panels, "<PpmNotOnMapTray");
      has(controls, 'const boardInfo = (<div className="ppm-canvas-board-info">');
      expect(controls.split('<div className="ppm-canvas-board-info">').length - 1).toBe(1);
    });

    it("marks balanced F, M and C blocks in editor.tsx, workspace.tsx and the shared types", () => {
      for (const [lane, minimum] of [
        ["F", 5],
        ["M", 6],
        ["C", 4],
      ] as const) {
        const count = blocks(editor, lane);
        expect(count.opened, `editor ${lane}`).toBeGreaterThanOrEqual(minimum);
        expect(count.closed, `editor ${lane}`).toBe(count.opened);
      }
      expect(blocks(workspace, "F")).toEqual({ closed: 1, opened: 1 });
      for (const [lane, minimum] of [
        ["M", 4],
        ["C", 2],
      ] as const) {
        const count = blocks(types, lane);
        expect(count.opened, `types ${lane}`).toBeGreaterThanOrEqual(minimum);
        expect(count.closed, `types ${lane}`).toBe(count.opened);
      }
    });

    it("imports living-map.css after the AF2.1 stylesheets", () => {
      const order = [
        'import "./canvas-v2.css";',
        'import "./canvas-toolkit.css";',
        'import "./canvas-content.css";',
        'import "./living-map/living-map.css";',
      ].map((line) => editor.indexOf(line));
      expect(order[0]).toBeGreaterThan(0);
      for (let index = 1; index < order.length; index++) expect(order[index]).toBeGreaterThan(order[index - 1]);
    });

    it("keeps living-map.css inside the v2 canvas grammar, in one F, M and C block each", () => {
      const selectors = cssSelectors(css);
      expect(selectors.length).toBeGreaterThan(0);
      for (const selector of selectors)
        expect(selector, selector).toMatch(/^:where\(html\[data-ppm-design="v2"\]\) \[data-ppm-canvas-grammar="v2"\]/);
      expect(css).not.toMatch(/:where\([^)]*,/);
      expect([...css.matchAll(/\/\* ── ([FMC]): /g)].map((match) => match[1])).toEqual(["F", "M", "C"]);
      for (const lane of ["F", "M", "C"]) expect(css.split(`/* ── /${lane} ── */`).length - 1, lane).toBe(1);
    });

    it("gives every lane its contracted module and export", () => {
      for (const [file, name] of [
        ["living-map/living-map-facts.ts", "useLivingMapFacts"],
        ["living-map/board-changes.ts", "useBoardChanges"],
        ["living-map/task-relations-layer.tsx", "PpmTaskRelationsLayer"],
        ["living-map/traffic-light-toggle.tsx", "PpmTrafficLightToggle"],
        ["living-map/not-on-map-tray.tsx", "PpmNotOnMapTray"],
        ["living-map/map-assembly-dialog.tsx", "openSprintMapDialog"],
        ["living-map/map-assembly-dialog.tsx", "PpmSprintMapDialog"],
        ["living-map/changes-button.tsx", "PpmChangesButton"],
        ["living-map/changes-panel.tsx", "PpmChangesPanel"],
        ["living-map/living-map-provider.tsx", "PpmLivingMapProvider"],
      ] as const)
        expect(read(file), `${file}: ${name}`).toMatch(new RegExp(`export (?:function|const) ${name}\\b`));
      // The provider imports both hooks; a hook importing the context back would be an import cycle.
      for (const file of ["living-map/living-map-facts.ts", "living-map/board-changes.ts"])
        expect(read(file), file).not.toContain("./living-map-context");
    });

    it("starts every living-map view from safe defaults: no facts, no changes, «Светофор» on, nothing enabled", () => {
      expect(PPM_LIVING_MAP_DEFAULT.trafficLight).toBe(true);
      expect(PPM_LIVING_MAP_DEFAULT.facts.size).toBe(0);
      expect(PPM_LIVING_MAP_DEFAULT.mapSections.size).toBe(0);
      expect(PPM_LIVING_MAP_DEFAULT.changes.count).toBe(0);
      expect(PPM_LIVING_MAP_DEFAULT.changes.byShapeId.size).toBe(0);
      expect(PPM_LIVING_MAP_DEFAULT.args).toMatchObject({
        canEdit: false,
        enabled: false,
        isActive: false,
        loaded: false,
      });
    });

    it("remembers «Светофор» per user in the browser, on by default, even when storage is denied", () => {
      const storage = memoryStorage();
      expect(readTrafficLightPreference(storage, "af22-user-a")).toBe(true);
      writeTrafficLightPreference(storage, "af22-user-a", false);
      expect(storage.values.get(trafficLightStorageKey("af22-user-a"))).toBe("off");
      expect(readTrafficLightPreference(storage, "af22-user-a")).toBe(false);
      expect(
        readTrafficLightPreference(memoryStorage({ [trafficLightStorageKey("af22-user-b")]: "off" }), "af22-user-b")
      ).toBe(false);
      expect(readTrafficLightPreference(storage, "af22-user-c")).toBe(true);
      const denied = throwingStorage();
      expect(readTrafficLightPreference(denied, "af22-user-d")).toBe(true);
      writeTrafficLightPreference(denied, "af22-user-d", false);
      expect(readTrafficLightPreference(denied, "af22-user-d")).toBe(false);
      expect(trafficLightStorageKey("user 1")).toBe("ppm:af22:traffic-light:user%201");
    });

    it("lets line M open the board it creates: the workspace adds it to the list and opens its tab", () => {
      has(editor, "onBoardCreated?: (board: TPpmCanvasBoard) => void;");
      has(workspace, "onBoardCreated={(board) => { upsertBoard(board); openBoard(board.board_id); }}");
    });
  });

  describe("AF2.2 F2: глубокая ссылка ?board=…&shape=… («На карте» в задаче)", () => {
    it("builds the Canvas link of a card and reads it back on that board only", () => {
      const path = canvasShapeLinkPath("lab", "p-1", "b-1", "shape:abc");
      expect(path).toBe("/lab/projects/p-1/brain?board=b-1&shape=shape%3Aabc");
      const search = path.slice(path.indexOf("?"));
      expect(takeCanvasShapeLink(search, "b-1")).toEqual({ search: "?board=b-1", shapeId: "shape:abc" });
      expect(takeCanvasShapeLink(search, "b-2")).toBeUndefined();
      expect(takeCanvasShapeLink("?board=b-1", "b-1")).toBeUndefined();
      expect(takeCanvasShapeLink("?board=b-1&shape=", "b-1")).toBeUndefined();
      // Other parameters stay; a bare id gets tldraw's prefix; the rewritten address has nothing left to take.
      const taken = takeCanvasShapeLink("?board=b-1&shape=xyz&tab=2", "b-1");
      expect(taken).toEqual({ search: "?board=b-1&tab=2", shapeId: "shape:xyz" });
      expect(takeCanvasShapeLink(taken?.search ?? "", "b-1")).toBeUndefined();
    });

    it("selects the card and centres the camera on it without changing the zoom", () => {
      const found = fakeEditor({ "shape:abc": { h: 248, w: 360, x: 100, y: 40 } });
      expect(revealCanvasShape(found.editor, "shape:abc")).toBe(true);
      expect(found.calls).toEqual(["select shape:abc", "center 280,164 animated"]);
      const missing = fakeEditor({});
      expect(revealCanvasShape(missing.editor, "shape:gone")).toBe(false);
      expect(missing.calls).toEqual([]);
    });

    it("takes the link only in the active v2 tab after the board loaded; the workspace drops a stale one", () => {
      const at = editor.indexOf("takeCanvasShapeLink(window.location.search, boardId)");
      expect(at).toBeGreaterThan(-1);
      const effect = editor.slice(editor.lastIndexOf("useEffect(", at), editor.indexOf("]);", at) + 3);
      has(effect, "if (!editor || !grammarV2 || !isActive || !livingMapLoaded) return;");
      const take = effect.indexOf("replaceCanvasSearch(link.search)");
      expect(take).toBeGreaterThan(-1);
      expect(take).toBeLessThan(effect.indexOf("revealCanvasShape(editor, link.shapeId)"));
      has(effect, 'setContentNotice(ppmT("canvas.af22.shape_not_found"))');
      const deps = effect.slice(effect.lastIndexOf("}, ["));
      for (const dep of ["boardId", "grammarV2", "isActive", "livingMapLoaded"])
        expect(deps, dep).toMatch(new RegExp(`\\b${dep}\\b`));
      const sync = sliceBetween(
        workspace,
        'url.searchParams.set("board", activeBoardId);',
        'window.history.replaceState(window.history.state, "", url);'
      );
      expect(sync).toContain('url.searchParams.delete("shape");');
    });
  });
  ```
  И обновить два теста AF2.1, которые перечисляют «Из проекта»:
  - `apps/web/tests/ppm-canvas/toolkit-model.test.ts:99-105` — было:
    ```ts
        expect(PPM_RAIL_MENUS.project.items.map((item) => item.command)).toEqual([
          "add-work-item",
          "add-work-items-view",
          "add-file",
          "add-git",
          "add-page-ref",
        ]);
    ```
    стало:
    ```ts
        expect(PPM_RAIL_MENUS.project.items.map((item) => item.command)).toEqual([
          "add-work-item",
          "add-work-items-view",
          "add-file",
          "add-git",
          "add-page-ref",
          // AF2.2 F: «Карта спринта» — последний пункт «Из проекта».
          "build-sprint-map",
        ]);
    ```
  - `apps/web/tests/ppm-canvas/files-vault-picker.test.ts:69-75` — было:
    ```ts
        expect(items.map((item) => item.command)).toEqual([
          "add-work-item",
          "add-work-items-view",
          "add-file",
          "add-git",
          "add-page-ref",
        ]);
    ```
    стало:
    ```ts
        expect(items.map((item) => item.command)).toEqual([
          "add-work-item",
          "add-work-items-view",
          "add-file",
          "add-git",
          "add-page-ref",
          "build-sprint-map",
        ]);
    ```
    и `:90-95` — было:
    ```ts
        expect(items.filter((item) => !isProjectSourceCommand(item.command)).map((item) => item.command)).toEqual([
          "add-work-item",
          "add-work-items-view",
        ]);
        expect(caseBody("add-work-item")).toMatch(/if \(canEdit\) setPickerOpen\(true\);/);
    ```
    стало:
    ```ts
        expect(items.filter((item) => !isProjectSourceCommand(item.command)).map((item) => item.command)).toEqual([
          "add-work-item",
          "add-work-items-view",
          "build-sprint-map",
        ]);
        // AF2.2: «Карта спринта» — case блока M в CanvasControls, открывает диалог сборки карты (линия M).
        expect(caseBody("build-sprint-map")).toContain("openSprintMapDialog(");
        expect(caseBody("add-work-item")).toMatch(/if \(canEdit\) setPickerOpen\(true\);/);
    ```

- [ ] **Step 3: Убедиться, что тесты падают**
  ```bash
  cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/af22-foundation.test.ts tests/ppm-canvas/toolkit-model.test.ts tests/ppm-canvas/files-vault-picker.test.ts
  ```
  Ожидание: FAIL — `af22-foundation.test.ts` не загружается (`Failed to resolve import
  "@/components/ppm-canvas/living-map/living-map-context"` — папки ещё нет); в двух других —
  `expected [ 'add-work-item', …, 'add-page-ref' ] to deeply equal [ …, 'build-sprint-map' ]`.

- [ ] **Step 4: Команда, пункт рейки и значок**
  - `commands.ts` — было:
    ```ts
      "add-git",
      "add-agent-answer",
    ```
    стало:
    ```ts
      "add-git",
      // AF2.2 (the M block of editor.tsx opens «Собрать карту спринта»)
      "build-sprint-map",
      "add-agent-answer",
    ```
  - `canvas-toolkit-model.ts` — было:
    ```ts
          { command: "add-page-ref", labelKey: "canvas.rail.page", sourceKey: "canvas.rail.source_pages" },
        ],
      },
      more: {
    ```
    стало:
    ```ts
          { command: "add-page-ref", labelKey: "canvas.rail.page", sourceKey: "canvas.rail.source_pages" },
          // AF2.2 F: «Карта спринта» — новая доска-карта из спринта; диалог и сборка — линия M (блок M в editor.tsx).
          {
            command: "build-sprint-map",
            labelKey: "canvas.af22.sprint_map",
            hintKey: "canvas.af22.sprint_map_hint",
            sourceKey: "canvas.af22.source_sprints",
          },
        ],
      },
      more: {
    ```
  - `canvas-rail.tsx` — импорт: было `  ListTodo,\n  MousePointer2,` → стало `  ListTodo,\n  MapIcon,\n  MousePointer2,`;
    `ITEM_ICONS` — было:
    ```ts
      "open-board-panel": LayoutGrid,
    };
    ```
    стало:
    ```ts
      "open-board-panel": LayoutGrid,
      // AF2.2 F: «Из проекта → Карта спринта».
      "build-sprint-map": MapIcon,
    };
    ```
    (`MapIcon` — алиас lucide-react 0.469 для значка «Map»; сам `Map` не импортируем, чтобы не затенить глобальный `Map`.)

- [ ] **Step 5: Общие модули F в `living-map/`**
  - `living-map/living-map-types.ts`:
    ```ts
    // AF2.2 «Живая карта проекта» — общие типы линий M (карта спринта, «Светофор», «Не на карте», связи «из Задач») и C
    // («Что изменилось»). Владелец — F. Линии M и C добавляют ТОЛЬКО необязательные поля и ТОЛЬКО в свои размеченные
    // блоки ниже (CONTRACTS §2); обязательные поля и пустые значения — контракт F.
    import type { TPpmCanvasBinding, TPpmCanvasBoard, TPpmCanvasMapRole } from "@ppm/canvas";
    import type { Editor } from "tldraw";

    /** «Светофор» of a live task card (spec C): blocked beats overdue; done is muted; none — nothing to show. */
    export type TTrafficState = "blocked" | "overdue" | "done" | "none";

    /** A Plane relation kind as seen from one task (IssueRelation: the forward kind and its reverse). */
    export type TWorkItemRelationType =
      | "blocked_by"
      | "blocking"
      | "start_before"
      | "start_after"
      | "finish_before"
      | "finish_after"
      | "implemented_by"
      | "implements"
      | "relates_to"
      | "duplicate";

    /** Another Plane task as a card names it («заблокирована ROBOT-12»). */
    export type TWorkItemRef = { id: string; identifier: string | null };

    /** One Plane relation of a task to another task. */
    export type TWorkItemRelation = { type: TWorkItemRelationType; workItemId: string };

    /** Live facts of one task on this board (line M, useLivingMapFacts), keyed by its work item id. */
    export type TWorkItemFacts = {
      /** Plane work item id — the card's `binding.entity_id`. */
      workItemId: string;
      traffic: TTrafficState;
      /** Unfinished tasks that block this one, in Plane's order (the first one is named on the card). */
      blockedBy: readonly TWorkItemRef[];
      /** This task's Plane relations to other tasks («из Задач»: drawn only between tasks on the board). */
      relations: readonly TWorkItemRelation[];
      // ── AF2.2 M: необязательные поля линии M ──
      // ── /AF2.2 M ──
    };

    /** Header facts of a sprint frame or a map section on this board, keyed by the group's tldraw shape id. */
    export type TMapSectionSummary = {
      role: TPpmCanvasMapRole;
      /** Live task cards inside the frame or the section. */
      total: number;
      done: number;
      overdue: number;
      blocked: number;
      // ── AF2.2 M: необязательные поля линии M ──
      // ── /AF2.2 M ──
    };

    /** What line M's useLivingMapFacts returns — spread into the living-map context. */
    export type TLivingMapFacts = {
      facts: ReadonlyMap<string, TWorkItemFacts>;
      mapSections: ReadonlyMap<string, TMapSectionSummary>;
      // ── AF2.2 M: необязательные поля линии M ──
      // ── /AF2.2 M ──
    };

    /** «добавлено» / «изменено» on a card while its user has unseen changes (spec E). */
    export type TBoardChangeMark = "added" | "changed";

    /** What line C's useBoardChanges returns — the context's `changes`. */
    export type TBoardChangeIndex = {
      /** Unseen events of this board («Что изменилось · N»). */
      count: number;
      /** The mark of every card with unseen events, by tldraw shape id. */
      byShapeId: ReadonlyMap<string, TBoardChangeMark>;
      // ── AF2.2 C: необязательные поля линии C ──
      // ── /AF2.2 C ──
    };

    /**
     * The board's editor as the living map sees it. editor.tsx builds it in one useMemo (livingMapArgs) and hands it to
     * useLivingMapFacts, useBoardChanges and every view through the context (`args`).
     */
    export type TLivingMapArgs = {
      authorId: string;
      /** Live bindings of this board by tldraw shape id (the editor's bindingsByShapeId; refreshed every 30 s). */
      bindingsByShapeId: ReadonlyMap<string, TPpmCanvasBinding>;
      boardId: string;
      /** Every board of the project Canvas (names for «Карта · …», links). */
      boards: readonly TPpmCanvasBoard[];
      /** The board is loaded, editable and not blocked (effectiveCanEdit). Write to it only then. */
      canEdit: boolean;
      /** This board's tldraw editor, once mounted. */
      editor: Editor | undefined;
      /** The v2 canvas grammar. false (v1, minimal mode): return the empty value, fetch and listen to nothing. */
      enabled: boolean;
      /** AF2.1 R19: only the active tab polls, listens to window/document and writes to its board. */
      isActive: boolean;
      /** The board's snapshot has loaded (the editor finished initializing). */
      loaded: boolean;
      /** A board created from this editor (the sprint map) joins the workspace's list and opens as the active tab. */
      onBoardCreated: (board: TPpmCanvasBoard) => void;
      onOpenBoard: (boardId: string) => void;
      projectId: string;
      /**
       * Cards the caller has just put on the board with fresh (pending) bindings: they activate with the next save, show
       * their projections at once and schedule an autosave — the path «Задача» from the rail takes.
       */
      registerBindings: (bindings: readonly TPpmCanvasBinding[]) => void;
      workspaceId: string;
      workspaceSlug: string;
      // ── AF2.2 M: необязательные поля линии M (значения — livingMapArgsM, блок M в editor.tsx) ──
      // ── /AF2.2 M ──
      // ── AF2.2 C: необязательные поля линии C (значения — livingMapArgsC, блок C в editor.tsx) ──
      // ── /AF2.2 C ──
    };

    export const EMPTY_LIVING_MAP_FACTS: TLivingMapFacts = { facts: new Map(), mapSections: new Map() };

    export const EMPTY_BOARD_CHANGE_INDEX: TBoardChangeIndex = { byShapeId: new Map(), count: 0 };

    /** The editor environment outside a provider: nothing enabled, nothing to write to. */
    export const EMPTY_LIVING_MAP_ARGS: TLivingMapArgs = {
      authorId: "",
      bindingsByShapeId: new Map(),
      boardId: "",
      boards: [],
      canEdit: false,
      editor: undefined,
      enabled: false,
      isActive: false,
      loaded: false,
      onBoardCreated: () => undefined,
      onOpenBoard: () => undefined,
      projectId: "",
      registerBindings: () => undefined,
      workspaceId: "",
      workspaceSlug: "",
    };
    ```
  - `living-map/living-map-context.ts`:
    ```ts
    // AF2.2 F: контекст «Живой карты» — факты задач (линия M), индекс изменений (линия C), переключатель «Светофора» и
    // окружение доски (args). Значение по умолчанию безопасно: без провайдера (облик v1, минимальный режим, тесты) виды
    // ничего не показывают и никуда не пишут.
    import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
    import {
      EMPTY_BOARD_CHANGE_INDEX,
      EMPTY_LIVING_MAP_ARGS,
      EMPTY_LIVING_MAP_FACTS,
      type TBoardChangeIndex,
      type TLivingMapArgs,
      type TLivingMapFacts,
    } from "./living-map-types";

    export type TLivingMapContextValue = TLivingMapFacts & {
      args: TLivingMapArgs;
      changes: TBoardChangeIndex;
      setTrafficLight: (on: boolean) => void;
      trafficLight: boolean;
    };

    export const PPM_LIVING_MAP_DEFAULT: TLivingMapContextValue = {
      ...EMPTY_LIVING_MAP_FACTS,
      args: EMPTY_LIVING_MAP_ARGS,
      changes: EMPTY_BOARD_CHANGE_INDEX,
      setTrafficLight: () => undefined,
      trafficLight: true,
    };

    export const PpmLivingMapContext = createContext<TLivingMapContextValue>(PPM_LIVING_MAP_DEFAULT);

    export function usePpmLivingMap(): TLivingMapContextValue {
      return useContext(PpmLivingMapContext);
    }

    // ─────────────── «Светофор»: по умолчанию включён, помнится у пользователя в этом браузере ───────────────

    const trafficLightMemory = new Map<string, boolean>();
    const trafficLightListeners = new Set<() => void>();

    export function trafficLightStorageKey(authorId: string): string {
      return ["ppm", "af22", "traffic-light", authorId].map(encodeURIComponent).join(":");
    }

    /** On unless this user switched it off in this browser; storage that throws (private mode) reads as «on». */
    export function readTrafficLightPreference(storage: Pick<Storage, "getItem"> | undefined, authorId: string): boolean {
      const key = trafficLightStorageKey(authorId);
      const remembered = trafficLightMemory.get(key);
      if (remembered !== undefined) return remembered;
      try {
        return storage?.getItem(key) !== "off";
      } catch {
        return true;
      }
    }

    /** Remembers the switch for this page at once (every open board tab follows) and, when it can, in the browser. */
    export function writeTrafficLightPreference(
      storage: Pick<Storage, "setItem"> | undefined,
      authorId: string,
      on: boolean
    ): void {
      const key = trafficLightStorageKey(authorId);
      trafficLightMemory.set(key, on);
      try {
        storage?.setItem(key, on ? "on" : "off");
      } catch {
        // Private mode or a full quota: the switch still holds for this page.
      }
      for (const listener of trafficLightListeners) listener();
    }

    function subscribeTrafficLight(listener: () => void): () => void {
      trafficLightListeners.add(listener);
      return () => {
        trafficLightListeners.delete(listener);
      };
    }

    function browserStorage(): Storage | undefined {
      try {
        return typeof window === "undefined" ? undefined : window.localStorage;
      } catch {
        return undefined;
      }
    }

    function serverTrafficLight(): boolean {
      return true;
    }

    /** The user's «Светофор» switch: one value for every open board tab of the page, kept in this browser. */
    export function useTrafficLightPreference(authorId: string): [boolean, (on: boolean) => void] {
      const on = useSyncExternalStore(
        subscribeTrafficLight,
        () => readTrafficLightPreference(browserStorage(), authorId),
        serverTrafficLight
      );
      const setOn = useCallback(
        (next: boolean) => writeTrafficLightPreference(browserStorage(), authorId, next),
        [authorId]
      );
      return [on, setOn];
    }
    ```
  - `living-map/living-map-provider.tsx`:
    ```tsx
    // AF2.2 F: провайдер «Живой карты» вокруг <Tldraw> (editor.tsx). Собирает в один контекст факты задач (линия M,
    // useLivingMapFacts), индекс изменений (линия C, useBoardChanges), переключатель «Светофора» и окружение доски (args)
    // — для карточек (shape.tsx) и правой колонки (CanvasControls). children — тот же <Tldraw>: смена значения
    // перерисовывает только потребителей контекста, сам холст не пересоздаётся.
    import { useMemo, type ReactNode } from "react";
    import { useBoardChanges } from "./board-changes";
    import { PpmLivingMapContext, useTrafficLightPreference, type TLivingMapContextValue } from "./living-map-context";
    import { useLivingMapFacts } from "./living-map-facts";
    import type { TLivingMapArgs } from "./living-map-types";

    export function PpmLivingMapProvider({ args, children }: { args: TLivingMapArgs; children: ReactNode }) {
      // Хуки линий вызываются всегда (правила хуков); при args.enabled === false (облик v1) они ничего не запрашивают.
      const map = useLivingMapFacts(args);
      const changes = useBoardChanges(args);
      const [trafficLight, setTrafficLight] = useTrafficLightPreference(args.authorId);
      const value = useMemo<TLivingMapContextValue>(
        () => ({ ...map, args, changes, setTrafficLight, trafficLight }),
        [args, changes, map, setTrafficLight, trafficLight]
      );
      return <PpmLivingMapContext.Provider value={value}>{children}</PpmLivingMapContext.Provider>;
    }
    ```
  - `living-map/shape-link.ts`:
    ```ts
    // AF2.2 F: глубокая ссылка на карточку доски. «На карте» в задаче (линия C) ведёт на
    // …/brain?board=<board_id>&shape=<shape_id>; активная вкладка этой доски (editor.tsx, блок F) после загрузки
    // выделяет карточку и подводит к ней камеру, не меняя масштаб. Тот же подвод — у клика по событию «Что изменилось».
    import { getPpmProjectPath } from "@ppm/brand";
    import type { Editor, TLShapeId } from "tldraw";

    export const PPM_CANVAS_SHAPE_PARAM = "shape";

    /** «На карте»: the Canvas address that opens `boardId` and reveals `shapeId` there. */
    export function canvasShapeLinkPath(
      workspaceSlug: string,
      projectId: string,
      boardId: string,
      shapeId: string
    ): string {
      const query = new URLSearchParams({ board: boardId, [PPM_CANVAS_SHAPE_PARAM]: shapeId });
      return `${getPpmProjectPath(workspaceSlug, projectId, "brain")}?${query.toString()}`;
    }

    /**
     * The card of a «На карте» link addressed to this board: its tldraw id and the query without `shape` (the other
     * parameters stay; nothing left — ""). undefined without `shape` or when the link names another board.
     */
    export function takeCanvasShapeLink(search: string, boardId: string): { search: string; shapeId: string } | undefined {
      const parameters = new URLSearchParams(search);
      const raw = parameters.get(PPM_CANVAS_SHAPE_PARAM)?.trim();
      if (!raw || parameters.get("board") !== boardId) return undefined;
      parameters.delete(PPM_CANVAS_SHAPE_PARAM);
      const rest = parameters.toString();
      return { search: rest ? `?${rest}` : "", shapeId: raw.startsWith("shape:") ? raw : `shape:${raw}` };
    }

    /** Selects a card of this board and centres the camera on it, keeping the zoom; false — the board has no such card. */
    export function revealCanvasShape(
      editor: Pick<Editor, "centerOnPoint" | "getShape" | "getShapePageBounds" | "select">,
      shapeId: string
    ): boolean {
      const id = shapeId as TLShapeId;
      const bounds = editor.getShape(id) ? editor.getShapePageBounds(id) : undefined;
      if (!bounds) return false;
      editor.select(id);
      editor.centerOnPoint(bounds.center, { animation: { duration: 220 } });
      return true;
    }
    ```

- [ ] **Step 6: Заглушки линий M и C** (каждая — ровно то, что ниже; линии заменяют тела, не меняя имён и сигнатур)
  - `living-map/living-map-facts.ts` (M):
    ```ts
    // AF2.2 M — заглушка F. Факты живых карточек задач на доске для «Светофора», связей «из Задач», счётчиков секций и
    // лотка «Не на карте». Контракт F: сигнатура, тип результата (TLivingMapFacts, living-map-types.ts), пустое значение
    // при args.enabled === false, опрос и слушатели — только при args.isActive, результат — стабильный объект (useMemo).
    // Не импортировать living-map-context.ts (его импортирует провайдер — был бы цикл).
    import { EMPTY_LIVING_MAP_FACTS, type TLivingMapArgs, type TLivingMapFacts } from "./living-map-types";

    export function useLivingMapFacts(_args: TLivingMapArgs): TLivingMapFacts {
      return EMPTY_LIVING_MAP_FACTS;
    }
    ```
  - `living-map/task-relations-layer.tsx` (M):
    ```tsx
    // AF2.2 M — заглушка F. Связи Plane между живыми карточками задач («Блокирует · из Задач», «Зависит от», «Связано»,
    // «Реализует»): дочерний элемент <Tldraw> в editor.tsx (не в components-memo), данные — usePpmLivingMap().facts.
    // Производные: в доску и в смысловые связи не пишутся; без перерисовки на каждом кадре камеры.
    export function PpmTaskRelationsLayer() {
      return null;
    }
    ```
  - `living-map/traffic-light-toggle.tsx` (M):
    ```tsx
    // AF2.2 M — заглушка F. Переключатель «Светофор» в правой колонке (.ppm-living-map-aside__bar, слева от «Доска ·
    // Объектов»): виден, если на доске есть живые карточки задач; значение — usePpmLivingMap().trafficLight и
    // setTrafficLight (помнится у пользователя в браузере, living-map-context.ts). Вид — .ppm-living-map-pill.
    export function PpmTrafficLightToggle() {
      return null;
    }
    ```
  - `living-map/not-on-map-tray.tsx` (M):
    ```tsx
    // AF2.2 M — заглушка F. Лоток «Не на карте · N» под кнопками правой колонки (только доска-карта с рамкой спринта):
    // задачи спринта и PR, которых нет на доске. «+ Добавить» и «Разложить всё» — только редактору (args.canEdit):
    // пакетная привязка S1, фигуры — одним шагом истории, затем usePpmLivingMap().args.registerBindings. Сам лоток
    // ничего не добавляет. Вид — .ppm-living-map-panel.
    export function PpmNotOnMapTray() {
      return null;
    }
    ```
  - `living-map/map-assembly-dialog.tsx` (M):
    ```tsx
    // AF2.2 M — заглушка F. «Собрать карту спринта»: команда build-sprint-map (рейка «Из проекта», палитра, пустая доска)
    // вызывает openSprintMapDialog({ boardId }) в блоке M CanvasControls (editor.tsx); PpmSprintMapDialog — дочерний
    // элемент <Tldraw> той же доски (блок M), окружение — usePpmLivingMap().args (onBoardCreated, registerBindings, …).
    // Диалог-портал ставит data-ppm-canvas-grammar="v2" и data-ppm-canvas-modal на свой корень (CSS и модальный гард
    // workspace.tsx).
    export type TPpmSprintMapDialogRequest = { boardId: string };

    export function openSprintMapDialog(_request: TPpmSprintMapDialogRequest): void {
      // Заглушка F: диалог открывает линия M.
    }

    export function PpmSprintMapDialog() {
      return null;
    }
    ```
  - `living-map/board-changes.ts` (C):
    ```ts
    // AF2.2 C — заглушка F. «Что изменилось»: индекс непросмотренных изменений доски (лента S2 от личной отметки S3) для
    // меток «изменено/добавлено» на карточках, кнопки и панели правой колонки. Контракт F: сигнатура, тип результата
    // (TBoardChangeIndex, living-map-types.ts), пустой индекс при args.enabled === false, опрос и слушатели — только при
    // args.isActive, результат — стабильный объект (useMemo). Не импортировать living-map-context.ts (цикл).
    import { EMPTY_BOARD_CHANGE_INDEX, type TBoardChangeIndex, type TLivingMapArgs } from "./living-map-types";

    export function useBoardChanges(_args: TLivingMapArgs): TBoardChangeIndex {
      return EMPTY_BOARD_CHANGE_INDEX;
    }
    ```
  - `living-map/changes-button.tsx` (C):
    ```tsx
    // AF2.2 C — заглушка F. Кнопка «Что изменилось · N» в правой колонке (.ppm-living-map-aside__bar); данные —
    // usePpmLivingMap().changes. Вид — .ppm-living-map-pill.
    export function PpmChangesButton() {
      return null;
    }
    ```
  - `living-map/changes-panel.tsx` (C):
    ```tsx
    // AF2.2 C — заглушка F. Панель «Что изменилось с {дата} · N» под кнопками правой колонки (как K5): лента, клик по
    // событию — revealCanvasShape (shape-link.ts), «Отметить просмотренным». Вид — .ppm-living-map-panel.
    export function PpmChangesPanel() {
      return null;
    }
    ```

- [ ] **Step 7: Стили и аудит Tailwind**
  - `living-map/living-map.css`:
    ```css
    /*
     * AF2.2 «Живая карта проекта» — только облик v2 (импорт в editor.tsx после canvas-content.css).
     * Каждый селектор начинается с :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"], без запятых внутри
     * :where(...) (гард af22-foundation.test.ts). Диалог-портал ставит data-ppm-canvas-grammar="v2" на свой корень.
     * Блоки по линиям: F — правая колонка (K5) и общие детали; M — карта, «Светофор», «Не на карте», связи «из Задач»;
     * C — «Что изменилось». Линия пишет только в свой блок.
     */

    /* ── F: правая колонка «Живой карты» (K5) и общие детали линий ── */

    /* The column takes the rest of the top overlay (as the «Доска» pill did); its bar and panels size themselves. */
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-aside {
      pointer-events: none;
      display: flex;
      min-height: 0;
      max-width: 100%;
      flex: 1 1 0;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.5rem;
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-aside__bar {
      pointer-events: none;
      display: flex;
      min-height: 0;
      max-width: 100%;
      flex: 0 1 auto;
      align-items: flex-start;
      justify-content: flex-end;
      gap: 0.5rem;
    }

    /* «Доска · Объектов» keeps its column (pill, then its panel); in the bar it stretches only to the bar's height, so a
       long object list still scrolls inside its panel instead of running off the canvas. */
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-aside__bar > .ppm-canvas-board-info {
      width: auto;
      min-height: 0;
      flex: none;
      align-self: stretch;
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-aside__bar .ppm-canvas-board-info__panel {
      width: 17rem;
    }

    /* A blocking banner (conflict, recovery) stays in the flow above the column: canvas.css places it left of a 17rem
       pill column, and the v2 column with its buttons is wider — it would cover the banner's actions. */
    @container (min-width: 44rem) {
      :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-overlay-top > .ppm-canvas-status--alert {
        position: relative;
        top: auto;
        right: auto;
        left: auto;
        width: min(40rem, 100%);
        max-height: none;
        align-self: center;
        margin-inline: 0;
      }
    }

    /* The pill of «Доска · Объектов» (canvas-v2.css C1) for the column's own buttons: «Светофор» (M), «Что изменилось» (C). */
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-pill {
      pointer-events: auto;
      display: inline-flex;
      min-height: 1.75rem;
      flex: none;
      align-items: center;
      gap: 0.375rem;
      padding: 0 0.625rem;
      border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
      border-radius: var(--ppm-radius-full, 999px);
      color: var(--ppm-color-text-secondary, var(--txt-secondary));
      background: var(--ppm-color-surface-1, var(--bg-surface-1));
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-pill:hover,
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-pill[aria-expanded="true"],
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-pill[aria-pressed="true"] {
      color: var(--ppm-color-text, var(--txt-primary));
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-pill:focus-visible {
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: var(--ppm-focus-ring, 0 0 0 2px var(--border-accent-strong));
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-pill svg {
      width: 0.875rem;
      height: 0.875rem;
      flex: none;
    }

    /* A panel of the column (K5: «Что изменилось», «Не на карте»): the inspector's width, radius 8, the popover shadow. */
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-living-map-panel {
      pointer-events: auto;
      display: grid;
      width: min(var(--ppm-inspector-width, 19rem), 100%);
      min-height: 0;
      flex: 0 1 auto;
      align-content: start;
      overflow-y: auto;
      border: 1px solid var(--ppm-color-border, var(--border-subtle));
      border-radius: var(--ppm-radius-md, 0.5rem);
      color: var(--ppm-color-text, var(--txt-primary));
      background: var(--ppm-color-surface-1, var(--bg-surface-1));
      box-shadow: var(--ppm-shadow-popover, 0 8px 24px rgb(0 0 0 / 0.24));
      font-size: 0.8125rem;
    }

    /* «Собрать карту спринта» under «Добавить заметку» on an empty board: the secondary action. */
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-empty .ppm-living-map-empty-action {
      margin-top: 0.5rem;
      border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
      color: var(--ppm-color-text, var(--txt-primary));
      background: var(--ppm-color-surface-1, var(--bg-surface-1));
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-empty .ppm-living-map-empty-action:hover {
      background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
    }

    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-empty .ppm-living-map-empty-action:focus-visible {
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: var(--ppm-focus-ring, 0 0 0 2px var(--border-accent-strong));
    }

    /* ── /F ── */

    /* ── M: карта спринта, «Светофор», «Не на карте», связи «из Задач» ── */
    /* ── /M ── */

    /* ── C: «Что изменилось» — кнопка, панель, метки на карточках ── */
    /* ── /C ── */
    ```
  - `packages/ppm-brand/scripts/audit-tailwind-classes.mjs` — `customCssFiles`, было:
    ```js
      "apps/web/core/components/ppm-canvas/canvas-content.css",
      "apps/web/styles/globals.css",
    ```
    стало:
    ```js
      "apps/web/core/components/ppm-canvas/canvas-content.css",
      // AF2.2 F: «Живая карта» (living-map/) — классы правой колонки, карты и «Что изменилось»; иначе они — «notes».
      "apps/web/core/components/ppm-canvas/living-map/living-map.css",
      "apps/web/styles/globals.css",
    ```
    `extraFiles` (конец массива), было:
    ```js
      "apps/web/core/components/workspace/sidebar/workspace-menu-root.tsx",
    ];
    ```
    стало:
    ```js
      "apps/web/core/components/workspace/sidebar/workspace-menu-root.tsx",
      // AF2.2 C: «На карте» в задаче лежит вне папок ppm-* — её классы проверяются так же (файл создаёт линия C).
      "apps/web/core/components/issues/issue-detail/ppm-canvas-boards.tsx",
    ];
    ```
    (`extraFiles` фильтруется `existsSync`, до линии C строка ничего не меняет.)

- [ ] **Step 8: `editor.tsx` — импорты, проп, окружение, провайдер, колонка, пустая доска, блок команды M**
  1. Импорт lucide (`:25`) — было `  Frame,\n  MousePointer2,\n  Plus,` → стало `  Frame,\n  MapIcon,\n  MousePointer2,\n  Plus,`.
  2. `:108` — было:
     ```ts
     import { PPM_CANVAS_COMMAND_EVENT, type TPpmCanvasCommandDetail } from "./commands";
     ```
     стало:
     ```ts
     import { dispatchPpmCanvasCommand, PPM_CANVAS_COMMAND_EVENT, type TPpmCanvasCommandDetail } from "./commands";
     ```
  3. Импорты линий (`:232-234`) — было:
     ```ts
     // ── /AF2.1 B ──
     // oxlint-disable-next-line import/no-unassigned-import -- tldraw owns the canvas interaction styles
     import "tldraw/tldraw.css";
     ```
     стало:
     ```ts
     // ── /AF2.1 B ──
     // ── AF2.2 F: «Живая карта» — провайдер, правая колонка, глубокая ссылка ?shape= ──
     import { PpmLivingMapProvider } from "./living-map/living-map-provider";
     import type { TLivingMapArgs } from "./living-map/living-map-types";
     import { revealCanvasShape, takeCanvasShapeLink } from "./living-map/shape-link";
     // ── /AF2.2 F ──
     // ── AF2.2 M: «Карта спринта», связи «из Задач», «Светофор», «Не на карте» ──
     import { openSprintMapDialog, PpmSprintMapDialog } from "./living-map/map-assembly-dialog";
     import { PpmNotOnMapTray } from "./living-map/not-on-map-tray";
     import { PpmTaskRelationsLayer } from "./living-map/task-relations-layer";
     import { PpmTrafficLightToggle } from "./living-map/traffic-light-toggle";
     // ── /AF2.2 M ──
     // ── AF2.2 C: «Что изменилось» — кнопка и панель правой колонки ──
     import { PpmChangesButton } from "./living-map/changes-button";
     import { PpmChangesPanel } from "./living-map/changes-panel";
     // ── /AF2.2 C ──
     // oxlint-disable-next-line import/no-unassigned-import -- tldraw owns the canvas interaction styles
     import "tldraw/tldraw.css";
     ```
  4. CSS (`:241-242`) — было:
     ```ts
     // oxlint-disable-next-line import/no-unassigned-import -- AF2.1 line B: note, code, document and file cards (v2 only)
     import "./canvas-content.css";
     ```
     стало:
     ```ts
     // oxlint-disable-next-line import/no-unassigned-import -- AF2.1 line B: note, code, document and file cards (v2 only)
     import "./canvas-content.css";
     // oxlint-disable-next-line import/no-unassigned-import -- AF2.2: «Живая карта» — правая колонка, карта, светофор (v2 only)
     import "./living-map/living-map.css";
     ```
  5. `TPpmCanvasEditorProps` (`:260`) — было:
     ```ts
       onToolChange?: (boardId: string, toolId: string) => void;
       presence?: TPpmBoardPresenceController;
     ```
     стало:
     ```ts
       onToolChange?: (boardId: string, toolId: string) => void;
       // AF2.2 (v2 workspace): a board created from the editor (the sprint map) joins the workspace's list and opens.
       onBoardCreated?: (board: TPpmCanvasBoard) => void;
       presence?: TPpmBoardPresenceController;
     ```
  6. Деструктуризация (`:326`; `canEdit, isActive = true, onEditabilityChange,` не трогать — их порядок пинит
     `multi-board-focus.test.ts`) — было:
     ```ts
       onToolChange,
       presence,
       projectId,
       statusPlacement = "card",
     ```
     стало:
     ```ts
       onToolChange,
       onBoardCreated,
       presence,
       projectId,
       statusPlacement = "card",
     ```
  7. Окружение карты и глубокая ссылка (`:2717-2719`; к этому месту объявлены все используемые значения, в т.ч.
     `setContentNotice` блока B1) — было:
     ```ts
       // ── /AF2.1 B ──

       const components = useMemo<TLComponents>(
     ```
     стало:
     ```ts
       // ── /AF2.1 B ──

       // ── AF2.2 F: «Живая карта» — окружение линий M и C, запись привязок, глубокая ссылка ?shape= ──
       // Колбэки рабочего пространства пересоздаются на каждой его отрисовке (выделение, инструмент): через ref окружение
       // карты остаётся стабильным, и карточки не перерисовываются от каждого щелчка по холсту.
       const onBoardCreatedRef = useRef(onBoardCreated);
       onBoardCreatedRef.current = onBoardCreated;
       const onOpenBoardRef = useRef(onOpenBoard);
       onOpenBoardRef.current = onOpenBoard;
       // Карточки, которые линия уже положила на холст со свежими (pending) привязками: активация — с ближайшим
       // сохранением, проекция на карточке — сразу, автосохранение — по расписанию (тот же путь, что «Задача» из рейки).
       const registerLivingMapBindings = useCallback((bindings: readonly TPpmCanvasBinding[]) => {
         if (bindings.length === 0) return;
         for (const binding of bindings) queuedBindingActivationsRef.current.add(binding.binding_id);
         setBindingsByShapeId((current) => {
           const next = new Map(current);
           for (const binding of bindings) next.set(binding.shape_id, binding);
           return next;
         });
         scheduleSaveRef.current();
       }, []);
       const livingMapLoaded = initializationTick > 0;
       // ── AF2.2 M: окружение линии M сверх общего (необязательные поля TLivingMapArgs из блока M) ──
       const livingMapArgsM = useMemo<Partial<TLivingMapArgs>>(() => ({}), []);
       // ── /AF2.2 M ──
       // ── AF2.2 C: окружение линии C сверх общего (необязательные поля TLivingMapArgs из блока C) ──
       const livingMapArgsC = useMemo<Partial<TLivingMapArgs>>(() => ({}), []);
       // ── /AF2.2 C ──
       const livingMapArgs = useMemo<TLivingMapArgs>(
         () => ({
           ...livingMapArgsM,
           ...livingMapArgsC,
           authorId,
           bindingsByShapeId,
           boardId,
           boards,
           canEdit: effectiveCanEdit,
           editor,
           enabled: grammarV2,
           isActive,
           loaded: livingMapLoaded,
           onBoardCreated: (board) => onBoardCreatedRef.current?.(board),
           onOpenBoard: (targetBoardId) => onOpenBoardRef.current(targetBoardId),
           projectId,
           registerBindings: registerLivingMapBindings,
           workspaceId,
           workspaceSlug,
         }),
         [
           authorId,
           bindingsByShapeId,
           boardId,
           boards,
           editor,
           effectiveCanEdit,
           grammarV2,
           isActive,
           livingMapArgsC,
           livingMapArgsM,
           livingMapLoaded,
           projectId,
           registerLivingMapBindings,
           workspaceId,
           workspaceSlug,
         ]
       );
       useEffect(() => {
         // «На карте» в задаче ведёт сюда с ?board=<эта доска>&shape=<id>: выделить карточку и подвести к ней камеру,
         // масштаб прежний. Только активная вкладка v2 и только после загрузки доски. Ссылку забираем из адреса
         // синхронно, как «На холст» выше: повтор эффекта и другие вкладки её уже не увидят.
         if (!editor || !grammarV2 || !isActive || !livingMapLoaded) return;
         const link = takeCanvasShapeLink(window.location.search, boardId);
         if (!link || !replaceCanvasSearch(link.search)) return;
         if (!revealCanvasShape(editor, link.shapeId)) setContentNotice(ppmT("canvas.af22.shape_not_found"));
       }, [boardId, editor, grammarV2, isActive, livingMapLoaded, ppmT]);
       // ── /AF2.2 F ──

       const components = useMemo<TLComponents>(
     ```
  8. `<Tldraw>` (`:3143-3166`) — было:
     ```tsx
                       <PpmCanvasProjectSourcesContext.Provider value={projectSources}>
                         <Tldraw
                           acceptedImageMimeTypes={grammarV2 ? PPM_VAULT_ACCEPT : undefined}
                           acceptedVideoMimeTypes={grammarV2 ? [] : undefined}
                           // Мультидоска: читается при создании редактора — скрытая вкладка создаётся «не в фокусе»; дальше
                           // фокус ведёт один эффект (syncCanvasEditorFocus). Это проп tldraw (isFocused редактора), DOM-фокус
                           // он не двигает; по умолчанию у tldraw true — теперь true только у активной вкладки.
                           // oxlint-disable-next-line jsx_a11y/no-autofocus -- проп tldraw: состояние редактора, не DOM-фокус
                           autoFocus={isActive}
                           cameraOptions={{ wheelBehavior: "pan" }}
                           components={components}
                           shapeUtils={shapeUtils}
                           onMount={handleTldrawMount}
                         >
                           {presence && <PpmCanvasRealtimeCursors presence={presence} />}
                           {grammarV2 && onZoomChange && (
                             <PpmCanvasZoomReporter boardId={boardId} onZoomChange={onZoomChange} />
                           )}
                           {/* ── AF2.1 R: overlays — leaf children of <Tldraw>, never inside the components memo ── */}
                           {grammarV2 && <PpmCanvasStyleToolbar canEdit={effectiveCanEdit} />}
                           {grammarV2 && <PpmCanvasQuickConnect authorId={authorId} canEdit={effectiveCanEdit} />}
                           {/* ── /AF2.1 R ── */}
                         </Tldraw>
                       </PpmCanvasProjectSourcesContext.Provider>
     ```
     стало (содержимое `<Tldraw>` прежнее, сдвинуто на 2 пробела; комментарий oxlint остаётся прямо над `autoFocus`):
     ```tsx
                       <PpmCanvasProjectSourcesContext.Provider value={projectSources}>
                         {/* ── AF2.2 F: «Живая карта» — факты (M), изменения (C), «Светофор»: карточки и колонка ── */}
                         <PpmLivingMapProvider args={livingMapArgs}>
                           <Tldraw
                             acceptedImageMimeTypes={grammarV2 ? PPM_VAULT_ACCEPT : undefined}
                             acceptedVideoMimeTypes={grammarV2 ? [] : undefined}
                             // Мультидоска: читается при создании редактора — скрытая вкладка создаётся «не в фокусе»; дальше
                             // фокус ведёт один эффект (syncCanvasEditorFocus). Это проп tldraw (isFocused редактора), DOM-фокус
                             // он не двигает; по умолчанию у tldraw true — теперь true только у активной вкладки.
                             // oxlint-disable-next-line jsx_a11y/no-autofocus -- проп tldraw: состояние редактора, не DOM-фокус
                             autoFocus={isActive}
                             cameraOptions={{ wheelBehavior: "pan" }}
                             components={components}
                             shapeUtils={shapeUtils}
                             onMount={handleTldrawMount}
                           >
                             {presence && <PpmCanvasRealtimeCursors presence={presence} />}
                             {grammarV2 && onZoomChange && (
                               <PpmCanvasZoomReporter boardId={boardId} onZoomChange={onZoomChange} />
                             )}
                             {/* ── AF2.1 R: overlays — leaf children of <Tldraw>, never inside the components memo ── */}
                             {grammarV2 && <PpmCanvasStyleToolbar canEdit={effectiveCanEdit} />}
                             {grammarV2 && <PpmCanvasQuickConnect authorId={authorId} canEdit={effectiveCanEdit} />}
                             {/* ── /AF2.1 R ── */}
                             {/* ── AF2.2 M: связи «из Задач» и диалог «Собрать карту спринта» (дочерние <Tldraw>) ── */}
                             {grammarV2 && <PpmTaskRelationsLayer />}
                             {grammarV2 && <PpmSprintMapDialog />}
                             {/* ── /AF2.2 M ── */}
                           </Tldraw>
                         </PpmLivingMapProvider>
                         {/* ── /AF2.2 F ── */}
                       </PpmCanvasProjectSourcesContext.Provider>
     ```
  9. Обработчик команд `CanvasControls` (`:3688-3689`) — было:
     ```ts
             // ── /AF2.1 B ──
             case "undo":
     ```
     стало:
     ```ts
             // ── /AF2.1 B ──
             // ── AF2.2 M: команда build-sprint-map («Карта спринта»: рейка, палитра, пустая доска) — диалог линии M ──
             case "build-sprint-map":
               if (canEdit && grammarV2) openSprintMapDialog({ boardId });
               break;
             // ── /AF2.2 M ──
             case "undo":
     ```
     (`boardId`, `canEdit`, `grammarV2` уже в зависимостях этого эффекта.)
  10. Пилюля «Доска» — одной константой, колонка под v2. Сначала константа (`:3940-3946`) — было:
      ```tsx
            )}
          </details>
        );

        return (
          <>
            {pickerOpen && canEdit && (
      ```
      стало:
      ```tsx
            )}
          </details>
        );
        // «Доска · Объектов» (экспорт, импорт, объекты): одна пилюля; под v2 она стоит в правой колонке «Живой карты».
        const boardInfo = (
          <div className="ppm-canvas-board-info">
            <button
              ref={boardInfoToggleRef}
              type="button"
              className="ppm-canvas-board-info__toggle"
              aria-controls={boardInfoOpen ? boardInfoPanelId : undefined}
              aria-expanded={boardInfoOpen}
              onClick={onToggleBoardInfo}
            >
              <Frame aria-hidden="true" />
              <span>
                {ppmT("canvas.board_info")} · {ppmT("canvas.board_info_objects").replace("{count}", String(objectCount))}
              </span>
              <ChevronDown aria-hidden="true" />
            </button>
            {/* Always mounted so a file can be imported while "Board" is collapsed. */}
            {canEdit && importInput}
            {boardInfoOpen && (
              <section
                className="ppm-canvas-status ppm-canvas-board-info__panel"
                id={boardInfoPanelId}
                aria-label={ppmT("canvas.board_info")}
              >
                <div className="ppm-canvas-status__actions ppm-canvas-status__actions--always">
                  {exportButton}
                  {canEdit && importButton}
                </div>
                {desktopImportPreview}
                {desktopImportResult}
                {importErrorNotice}
                {objectsList}
              </section>
            )}
          </div>
        );

        return (
          <>
            {pickerOpen && canEdit && (
      ```
      Затем в верхнем оверлее (`:4064-4099`) — было:
      ```tsx
                  <div className="ppm-canvas-board-info">
                    <button
                      ref={boardInfoToggleRef}
                      type="button"
                      className="ppm-canvas-board-info__toggle"
                      aria-controls={boardInfoOpen ? boardInfoPanelId : undefined}
                      aria-expanded={boardInfoOpen}
                      onClick={onToggleBoardInfo}
                    >
                      <Frame aria-hidden="true" />
                      <span>
                        {ppmT("canvas.board_info")} ·{" "}
                        {ppmT("canvas.board_info_objects").replace("{count}", String(objectCount))}
                      </span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    {/* Always mounted so a file can be imported while "Board" is collapsed. */}
                    {canEdit && importInput}
                    {boardInfoOpen && (
                      <section
                        className="ppm-canvas-status ppm-canvas-board-info__panel"
                        id={boardInfoPanelId}
                        aria-label={ppmT("canvas.board_info")}
                      >
                        <div className="ppm-canvas-status__actions ppm-canvas-status__actions--always">
                          {exportButton}
                          {canEdit && importButton}
                        </div>
                        {desktopImportPreview}
                        {desktopImportResult}
                        {importErrorNotice}
                        {objectsList}
                      </section>
                    )}
                  </div>
                </div>
              </>
            )}
      ```
      стало:
      ```tsx
                  {/* ── AF2.2 F: правая колонка «Живой карты» (K5): кнопки рядом с «Доска · Объектов», ниже — панели ── */}
                  {grammarV2 ? (
                    <div className="ppm-living-map-aside">
                      <div className="ppm-living-map-aside__bar">
                        {/* ── AF2.2 M: «Светофор» ── */}
                        <PpmTrafficLightToggle />
                        {/* ── /AF2.2 M ── */}
                        {/* ── AF2.2 C: «Что изменилось · N» ── */}
                        <PpmChangesButton />
                        {/* ── /AF2.2 C ── */}
                        {boardInfo}
                      </div>
                      {/* ── AF2.2 C: панель «Что изменилось» ── */}
                      <PpmChangesPanel />
                      {/* ── /AF2.2 C ── */}
                      {/* ── AF2.2 M: лоток «Не на карте» ── */}
                      <PpmNotOnMapTray />
                      {/* ── /AF2.2 M ── */}
                    </div>
                  ) : (
                    boardInfo
                  )}
                  {/* ── /AF2.2 F ── */}
                </div>
              </>
            )}
      ```
  11. Пустая доска (`:4103-4115`) — было:
      ```tsx
                {canEdit && (
                  <button type="button" onClick={() => createNode(editor, authorId, "note", ppmT("canvas.note_title"))}>
                    <Plus aria-hidden="true" />
                    {ppmT("canvas.add_note")}
                  </button>
                )}
              </div>
            )}
          </>
        );
      }
      ```
      стало:
      ```tsx
                {canEdit && (
                  <button type="button" onClick={() => createNode(editor, authorId, "note", ppmT("canvas.note_title"))}>
                    <Plus aria-hidden="true" />
                    {ppmT("canvas.add_note")}
                  </button>
                )}
                {/* ── AF2.2 F: «Собрать карту спринта» — вторая кнопка пустой доски v2 (та же команда, что в рейке) ── */}
                {grammarV2 && canEdit && (
                  <button
                    type="button"
                    className="ppm-living-map-empty-action"
                    onClick={() => dispatchPpmCanvasCommand({ boardId, command: "build-sprint-map" })}
                  >
                    <MapIcon aria-hidden="true" />
                    {ppmT("canvas.af22.empty_sprint_map")}
                  </button>
                )}
                {/* ── /AF2.2 F ── */}
              </div>
            )}
          </>
        );
      }
      ```

- [ ] **Step 9: `workspace.tsx` — палитра, `?shape=` при смене доски, `onBoardCreated`**
  1. Адрес доски (`:280-283`) — было:
     ```ts
         if (url.searchParams.get("board") !== activeBoardId) {
           url.searchParams.set("board", activeBoardId);
           window.history.replaceState(window.history.state, "", url);
         }
     ```
     стало:
     ```ts
         if (url.searchParams.get("board") !== activeBoardId) {
           url.searchParams.set("board", activeBoardId);
           // AF2.2 F: ?shape= («На карте» в задаче) принадлежит доске ссылки — другая активная доска его не берёт.
           url.searchParams.delete("shape");
           window.history.replaceState(window.history.state, "", url);
         }
     ```
  2. Палитра (`:705-713`) — было:
     ```ts
                       {
                         command: "add-file" as const,
                         id: "add-file",
                         keywords: ["file", "vault", "knowledge"],
                         label: ppmT("canvas.rail.file"),
                       },
                     ]
                   : []),
                 {
                   command: "add-group" as const,
     ```
     стало:
     ```ts
                       {
                         command: "add-file" as const,
                         id: "add-file",
                         keywords: ["file", "vault", "knowledge"],
                         label: ppmT("canvas.rail.file"),
                       },
                     ]
                   : []),
                 // ── AF2.2 F: «Карта спринта» — только v2; команду обрабатывает блок M в editor.tsx (CanvasControls) ──
                 ...(designV2
                   ? [
                       {
                         command: "build-sprint-map" as const,
                         id: "build-sprint-map",
                         keywords: ["sprint", "cycle", "map", "planning"],
                         label: ppmT("canvas.af22.sprint_map"),
                       },
                     ]
                   : []),
                 // ── /AF2.2 F ──
                 {
                   command: "add-group" as const,
     ```
  3. `<PpmCanvasEditor …>` (`:1003`) — было:
     ```tsx
                     onOpenBoard={openBoard}
                     onOrchestratorRunVersionsChange={handleOrchestratorRunVersionsChange}
     ```
     стало:
     ```tsx
                     onOpenBoard={openBoard}
                     // AF2.2 F: «Собрать карту спринта» создаёт доску из редактора — она попадает в список и открывается.
                     onBoardCreated={(board) => {
                       upsertBoard(board);
                       openBoard(board.board_id);
                     }}
                     onOrchestratorRunVersionsChange={handleOrchestratorRunVersionsChange}
     ```

- [ ] **Step 10: Отформатировать свои файлы**
  ```bash
  cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/components/ppm-canvas/commands.ts \
    core/components/ppm-canvas/canvas-toolkit-model.ts core/components/ppm-canvas/canvas-rail.tsx \
    core/components/ppm-canvas/workspace.tsx core/components/ppm-canvas/editor.tsx \
    core/components/ppm-canvas/living-map/*.ts core/components/ppm-canvas/living-map/*.tsx \
    tests/ppm-canvas/af22-foundation.test.ts tests/ppm-canvas/toolkit-model.test.ts tests/ppm-canvas/files-vault-picker.test.ts
  ```
  Ожидание: без ошибок. Если oxfmt переписал альтернативу тернарника колонки как `) : boardInfo}` или перенёс строки —
  тест это допускает (регулярка `\(?\s*boardInfo\s*\)?`, `has()` нормализует пробелы).

- [ ] **Step 11: Прогнать свои тесты**
  ```bash
  cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/af22-foundation.test.ts tests/ppm-canvas/toolkit-model.test.ts tests/ppm-canvas/files-vault-picker.test.ts
  ```
  Ожидание: `Test Files 3 passed (3)`, `Tests 46 passed (46)` (18 + 15 + 13).

- [ ] **Step 12: Полный набор проверок**
  ```bash
  cd $PF/apps/web && ./node_modules/.bin/vitest run
  cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/af22-F2.tsbuildinfo
  cd $PF/apps/web && ../../node_modules/.bin/oxlint --max-warnings=11957 .
  cd $PF/apps/web && ../../node_modules/.bin/oxfmt --check core/components/ppm-canvas/living-map core/components/ppm-canvas/editor.tsx core/components/ppm-canvas/workspace.tsx tests/ppm-canvas/af22-foundation.test.ts
  cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs
  cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs
  ```
  Ожидание: web vitest — `73 passed` файлов, `617 passed` тестов (599 + 18); web tsc — 0; oxlint —
  `Found 719 warnings and 0 errors.` (новый код предупреждений не добавляет: зависимости хуков полные, неиспользуемые
  параметры заглушек — с `_`); oxfmt `--check` — чисто; brand — 93 + оба аудита `passed`, в выводе Tailwind-аудита нет
  заметок про `ppm-living-map-*`; canvas — 60 + аудит `passed` (папка `living-map/` без запрещённых импортов).

- [ ] **Step 13: Самопроверка диффа**
  ```bash
  $T/af22-diff.sh apps/web/core/components/ppm-canvas apps/web/tests/ppm-canvas packages/ppm-brand/scripts > /tmp/af22-F2.patch
  ```
  Проверить глазами: вне блоков `AF2.2 F` изменены только перечисленные строки (импорт lucide, импорт `commands`,
  проп/деструктуризация `onBoardCreated`, константа `boardInfo`, `?shape=` и `onBoardCreated` в `workspace.tsx`, пункт
  рейки, значок, команда); v1-ветки (`statusPlacement === "card"`, альтернатива `boardInfo`, `canvas-rail-legacy.tsx`)
  выдают прежнюю разметку; в `shape.tsx` изменений нет.
