# AF2.2 «Живая карта проекта» — общие контракты для частей плана (F, M, C, S)

Спецификация (обязательна): `docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.2 — Живая карта проекта: сборка из спринта, светофор, «Не на карте», «Что изменилось».md`.
Основа — рабочее дерево после AF2.1 (без коммитов). Макет K5: `docs/superpowers/plans/2026-09-25-af21/mockups/K5-Living-Map.png`
(+ `.dc.html`, тёмная — `K5-Living-Map-Dark.dc.html`). Облик — волна 1 «гибрид A+B» (токены `--ppm-*`), шрифты и CSS-приёмы
как в AF2.1 (`canvas-toolkit.css`, `canvas-content.css`: каждый селектор начинается с
`:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]`, без запятых внутри `:where(...)` — гард
`af21-foundation.test.ts`).

## 0. Порядок и владение файлами (пути от plane-fork/)
- **F (фундамент)** — первой, одна задача. После неё параллельно **M** (карта), **C** (изменения), **S** (сервер; S может
  стартовать сразу, он независим от F). Линии не правят файлы друг друга; в общих файлах — только свои размеченные блоки.
- **F:** `packages/ppm-canvas/**` (поле `map` у узла `group`, тесты схемы), `packages/ppm-brand/src/translations/af22-living-map.ts`
  (создаёт с блоками `// F`, `// M`, `// C`, `// T`; линии дописывают ключи только в своём блоке) и его подключение в
  `packages/ppm-brand/src/index.ts` (последним спредом, после AF2.1), новая папка `apps/web/core/components/ppm-canvas/living-map/`
  с файлами-заглушками (см. §2) и `living-map.css` (импорт в `editor.tsx` после `canvas-content.css`), точки монтирования
  в `editor.tsx`/`workspace.tsx`/`canvas-rail.tsx`/`commands.ts`/`canvas-toolkit-model.ts` (размеченные блоки
  `// ── AF2.2 M: … ──` / `// ── AF2.2 C: … ──` / `// ── /AF2.2 … ──`), глубокая ссылка `?shape=`, тест
  `apps/web/tests/ppm-canvas/af22-foundation.test.ts`.
- **M (карта):** `living-map/map-*.ts(x)`, `living-map/sprint-*.ts(x)`, `living-map/task-relations*.ts(x)`,
  `living-map/traffic-light*.ts(x)`, `living-map/not-on-map*.ts(x)`, `living-map/living-map-facts.ts` (наполняет хук фактов),
  `apps/web/core/services/ppm-canvas-map.service.ts` (новый), блоки `AF2.2 M` в `shape.tsx` (ветка `map` у карточки `group`,
  оформление светофора у живой карточки задачи), в `editor.tsx` (обработчик команды `build-sprint-map`, `+ Добавить`),
  CSS в `living-map.css` (блок `/* M */`), тесты `apps/web/tests/ppm-canvas/living-map-{assembly,relations,traffic,tray}*.test.ts`.
- **C (изменения и «На карте»):** `living-map/changes-*.ts(x)`, `living-map/change-chips*.ts(x)`, `living-map/board-changes.ts`
  (наполняет хук изменений), `apps/web/core/services/ppm-canvas-changes.service.ts` (новый), блоки `AF2.2 C` в `shape.tsx`
  (метки «изменено/добавлено» на карточках), `editor.tsx` (кнопка и панель), новый
  `apps/web/core/components/issues/issue-detail/ppm-canvas-boards.tsx` и его монтирование в
  `issues/issue-detail/sidebar.tsx` и `issues/peek-overview/properties.tsx` (размеченные блоки `AF2.2 C`), CSS в
  `living-map.css` (блок `/* C */`), тесты `apps/web/tests/ppm-canvas/living-map-changes*.test.ts`,
  `apps/web/tests/ppm-canvas/issue-canvas-boards.test.ts`.
- **S (сервер):** `apps/api/plane/ppm_canvas/**` (модель `PpmCanvasBoardUserState` + миграция `0009_*`, новые модули сервисов
  по желанию: `changes.py`, `board_user_state.py`, `batch_bindings.py`, `work_item_boards.py`; `views.py`, `urls.py`,
  `serializers.py`), тесты `apps/api/plane/tests/contract/ppm_canvas/test_{batch_bindings,board_changes,board_user_state,work_item_boards}_api.py`.
- Перед первой правкой файла: `docs/superpowers/plans/2026-09-26-af22/tools/af22-pre.sh <путь от plane-fork>`.
  Сборка пакетов: `…/tools/af22-pkg-build.sh <ppm-brand|ppm-canvas>`. Коммитов нет; снимки — контроллер (`af22-snap.sh`).
  Dev-сервер :3000 не трогать; `git add` (в т.ч. `-N`) не выполнять.

## 1. Облик и гейтинг
- Всё новое на Холсте — только при `grammarV2` (`usePpmCanvasGrammarV2()` / проп `grammarV2` в editor.tsx). v1 и
  минимальный режим (`PPM_ANTYFLOW_SHELL_ENABLED=0`) — без изменений.
- «На карте» в задаче (вне Холста) — только при облике v2 (`usePpmDesignV2()` из `@/lib/ppm-design`).
- Несколько открытых вкладок досок (AF2.1 R19): каждая вкладка — свой редактор; всё, что слушает document/window или
  пишет в доску, действует только при `isActive` (проп `PpmCanvasEditor`).

## 2. Точки монтирования и заглушки (F создаёт; линии наполняют свои модули, не трогая чужие)
- `living-map/living-map-context.ts` (F): `PpmLivingMapContext` = `{ trafficLight: boolean; setTrafficLight(v): void;
  facts: ReadonlyMap<string /*work_item_id*/, TWorkItemFacts>; changes: TBoardChangeIndex; mapSections: ... }` с
  безопасными значениями по умолчанию; провайдер `PpmLivingMapProvider` в `editor.tsx` вокруг `<Tldraw>` вызывает
  `useLivingMapFacts(args)` (M, файл `living-map/living-map-facts.ts`, заглушка F возвращает пустые факты) и
  `useBoardChanges(args)` (C, файл `living-map/board-changes.ts`, заглушка F возвращает пустой индекс).
  Типы `TWorkItemFacts` и `TBoardChangeIndex` — в `living-map/living-map-types.ts` (F; M и C могут расширять только
  необязательными полями).
- Дочерние элементы `<Tldraw>` (не в components-memo): `<PpmTaskRelationsLayer />` (M, `living-map/task-relations-layer.tsx`).
- Правая колонка поверх холста (F: контейнер `.ppm-living-map-aside` в `CanvasControls` рядом с пилюлей «Доска ·
  Объектов»): сверху кнопки `<PpmTrafficLightToggle />` (M) и `<PpmChangesButton />` (C), ниже панели
  `<PpmChangesPanel />` (C) и `<PpmNotOnMapTray />` (M). Заглушки F рендерят `null`.
- Команда `build-sprint-map` (F: id в `commands.ts`, пункт «Карта спринта» в группе «Из проекта» рейки v2 и в палитре
  v2, кнопка в пустом состоянии новой доски v2); обработчик в `editor.tsx` блок `AF2.2 M` вызывает
  `openSprintMapDialog()` из `living-map/map-assembly-dialog.tsx` (M; заглушка F — no-op).
- Глубокая ссылка (F): `…/brain?board=<board_id>&shape=<shape_id>` — после загрузки доски выбрать фигуру и центрировать
  камеру (масштаб не менять), параметр `shape` удалить из адреса (`replaceState`), только для активной вкладки.

## 3. Схема узлов (F, в packages/ppm-canvas, с тестами)
- Узел `group`: необязательное поле `map` — дискриминированное объединение
  `{ role: "sprint"; cycle_id: string (uuid) } | { role: "section"; module_id: string (uuid) | null }`.
  Версия схемы остаётся 2; группы без `map` и старые доски разбираются как раньше; неизвестные поля сохраняются;
  фабрики: `createPpmSprintFrameNode({ cycleId, title, ...})`, `createPpmMapSectionNode({ moduleId, title, ... })`
  (размеры по умолчанию и цвета — нейтральные, как у секций UX1.1).
- Живая карточка задачи — существующая `work_item_ref` (фабрика узла ссылки на задачу), без изменений схемы.

## 4. Переводы
- `packages/ppm-brand/src/translations/af22-living-map.ts`, `AF22_LIVING_MAP_TRANSLATIONS = { en, ru }`, паритет en/ru,
  без «ИИ», префиксы: `canvas.map.*` (M), `canvas.traffic.*` (M), `canvas.tray.*` (M), `canvas.changes.*` (C),
  `issue.canvas_boards.*` (C), `canvas.af22.*` (F). Существующие ключи не переопределять.

## 5. Сервер (S) — контракты для M и C (все пути под `/api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/`)
- **S1** `POST canvas/boards/<board_id>/bindings/batch/` — тело `{ "items": [{ "shape_id": str, "entity_type": "work_item" |
  <другие виды одиночной привязки>, "entity_id": uuid, "client_operation_id"?: str }] }` (1…200, иначе 400
  `CANVAS_BATCH_TOO_LARGE`/`CANVAS_BATCH_EMPTY`); права — редактирование доски; ответ 200 `{ "results": [ { "shape_id",
  "status": "created" | "error", "binding"?: <тот же JSON, что у одиночной привязки>, "error"?: { "code", "message" } } ] }`
  — порядок как во входе; каждая привязка pending до сохранения доски (как одиночная).
- **S2** `GET canvas/boards/<board_id>/changes/?since=<ISO 8601>&limit=<1..200, по умолчанию 200>` → 200 `{ "since", "until",
  "items": [ { "id": str (стабильный), "kind": "work_item.state" | "work_item.assignees" | "work_item.due" |
  "work_item.priority" | "work_item.name" | "work_item.relation" | "git.pull_request.opened" |
  "git.pull_request.merged" | "vault.version" | "board.node.added" | "board.node.changed", "occurred_at": ISO,
  "actor": { "id", "display_name" } | null, "entity": { "type": "work_item" | "pull_request" | "vault_file" | "node",
  "id", "identifier"?: str, "title"?: str }, "shape_ids": [str], "detail": { "field"?, "old"?, "new"? } } ],
  "truncated": bool }`, новые первыми. Задачи — привязанные к доске (активные привязки) + задачи спринта, если на доске
  есть рамка спринта (`map.role = sprint` в текущем снимке). Права — чтение доски; видимость задач — как в
  `get_visible_work_items`; файлы — как в Хранилище; `since` раньше 30 дней → обрезается до 30 дней, `truncated: true`.
- **S3** `GET canvas/boards/<board_id>/me/` → 200 `{ "seen_at": ISO | null, "seen_version": int | null }`;
  `PUT canvas/boards/<board_id>/me/seen/` → 200 то же (серверное «сейчас», текущая версия доски). Права — чтение доски.
- **S4** `GET canvas/work-items/<work_item_id>/boards/` → 200 `{ "results": [ { "board_id", "name", "shape_id" } ] }`;
  только активные привязки, не архивные доски, доступные на чтение; задача невидима пользователю → 404.
- Ошибки — в формате PPM `{ "error": { "code", "message", "request_id", "details"? } }` (как в `responses.py`).

## 6. Данные Plane для клиента (M, C — существующие API и сторы)
- Спринты: `CycleService`/`useCycle()` (`cycle.store.ts`: `currentProjectActiveCycleId`, `getProjectCycleDetails`,
  `fetchAllCycles`), прогресс — `…/cycles/{id}/progress/`; шкала «День N из M» — `computePpmSprintScale`
  (`apps/web/core/components/ppm-tasks/sprint.ts`).
- Направления: `ModuleService`/`useModule()` (`module.store.ts`: `fetchModules`), задачи направления —
  `…/modules/{id}/issues/`; у задачи — `module_ids`.
- Задачи спринта со связями: Plane-список задач с `expand=issue_relation` (как `apps/web/core/components/ppm-tasks/services.ts:20-28`),
  фильтр по спринту — `…/cycles/{id}/cycle-issues/` (M уточняет по коду).
- PR задач: `GET /api/ppm/v1/…/git/links/` (все активные связи проекта), группировка как `ppm-tasks/evidence.ts:42`.

## 7. Проверки (не хуже базовой линии после AF2.1, 2026-09-25)
web vitest 72 файла / 599, web tsc 0, oxlint 719/0, oxfmt по файлам AF2.2 — чисто; `@ppm/brand` 86 + оба аудита;
`@ppm/canvas` 50 + аудит (tsc — 1 старая ошибка TS2322 orchcall); корневой `npm test` 653/653; API:
`ppm_vault` + `ppm_canvas` — 172 (docker compose `-p <уникальное имя>` … `down -v`).
