# AF2.2 — нужды линии C к F, S, M и контроллеру (сверх CONTRACTS)

Сверено с `drafts/plan-F.md`, `drafts/plan-F-notes.md`, `drafts/plan-S.md` и `drafts/plan-S-contract-notes.md`
(2026-09-26). Код `plan-C.md` прогнан на копии web с заглушками F дословно из `plan-F.md` (шаги 5–7): гарды F
(`living-map.css`, блоки типов, экспорты заглушек, «хук не импортирует контекст») проходят. Новых требований к S нет;
к F — только «не менять» (§1) и два открытых вопроса (§2).

## 1. F — на что опирается C (не менять без сообщения линии C)

1. `living-map/living-map-types.ts`: `TBoardChangeIndex { count; byShapeId; // ── AF2.2 C: … ── // ── /AF2.2 C ── }`,
   `TBoardChangeMark`, `EMPTY_BOARD_CHANGE_INDEX = { byShapeId: new Map(), count: 0 }`; в `TLivingMapArgs` — `authorId`,
   `boardId`, `boards`, `editor`, `enabled`, `isActive`, `projectId`, `workspaceId`, `workspaceSlug`. C1 добавляет
   импорт типа `TBoardChangesPanel` в **новом** блоке `AF2.2 C` под импортами F и два необязательных поля
   (`byWorkItemId?`, `panel?`) внутри блока C типа `TBoardChangeIndex`; гард F «C ≥ 2 и баланс» — 3/3.
   Своих полей в `TLivingMapArgs` C не добавляет: `livingMapArgsC` в `editor.tsx` остаётся `{}`.
2. Заглушки (владелец C): `board-changes.ts` — `useBoardChanges(_args: TLivingMapArgs): TBoardChangeIndex`;
   `changes-button.tsx` — `PpmChangesButton`; `changes-panel.tsx` — `PpmChangesPanel`. C заменяет тела, имена прежние;
   кнопка и панель становятся `export const … = memo(function …)` — регулярка F `export (?:function|const) <имя>\b` это
   принимает. `board-changes.ts` не импортирует `living-map-context.ts`.
3. Монтаж F (шаг 8.10): `<PpmChangesButton />` в `.ppm-living-map-aside__bar`, `<PpmChangesPanel />` ниже — внутри
   `CanvasControls`, т.е. в контексте редактора tldraw (панели нужен `useEditor()`); провайдер снаружи `<Tldraw>` с
   `value` в `useMemo` — C возвращает стабильный объект (`useMemo` по своему состоянию). `editor.tsx` линия C не правит.
4. `.ppm-living-map-pill` и `.ppm-living-map-panel` (F) — C вешает их на кнопку и панель и добавляет только свои классы.
   У панели F `overflow-y: auto`; у C ещё внутренняя прокрутка ленты (`.ppm-changes-panel__list { max-height: 18rem }`),
   чтобы заголовок и «Отметить просмотренным» оставались на виду.
5. Гард CSS F: префикс грамматики, без запятых внутри `:where(...)`, маркеры `/* ── [FMC]: ` по одному в порядке F, M, C.
   Правило C, скрывающее инспектор, пока открыта панель:
   `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .tl-container:has(.ppm-changes-panel) ~ .ppm-canvas-inspector`
   — гард проходит. Просьба: не ужесточать гард до запрета `:has(...)`/`~` после префикса.
6. `canvasShapeLinkPath(workspaceSlug, projectId, boardId, shapeId)` (`living-map/shape-link.ts`) — ссылки «На карте»;
   `getPpmCanvasMap(node)` (`@ppm/canvas`) — поиск рамки спринта; `usePpmLivingMap()` — чтение `changes`.
7. Строки: маркеры `// ── C: «Что изменилось» ──` и `// ── T: «На карте» в задаче (пишет линия C) ──` стоят рядом в en и
   ru до C1 (C1 вставляет 51 ключ `canvas.changes.*` между ними, C3 — 2 ключа `issue.canvas_boards.*` после T);
   `LANE_PREFIX.C`/`.T` теста F совпадают с ключами C.
8. Аудит Tailwind (F, шаг 7): `living-map.css` в `customCssFiles`, `issues/issue-detail/ppm-canvas-boards.tsx` в
   `extraFiles` — классы C3 проверены на теме PPM (все дают CSS).

## 2. F/M — открытые вопросы (решить контроллеру)

1. **Инспектор v2 над правой колонкой** (z-index 320 против 315 у оверлея). C скрывает инспектор только пока открыта
   «Что изменилось» (RC6). Лоток M «Не на карте» виден постоянно — его перекрытие решают M/F; правило C на чужие панели
   не расширяется.
2. «Задачи и бэклог» (`.ppm-work-item-picker--panel`) и «Смысловые связи» тоже ложатся справа поверх колонки — C их не
   трогает; если нужно «одна правая панель за раз» для всех — это правка `inspectorHidden`/панелей в `editor.tsx` (F/AF2.1),
   не линии C.

## 3. S — что C читает (без новых просьб)

- S2 (`plan-S-contract-notes.md` §3): `since` ответа — фактическое начало окна (заголовок «с {дата}» строится по нему);
  `truncated` → «показаны не все»; `id` устойчив (ключи React, сравнение лент между опросами); `actor` — `null` у Git,
  нативных фигур и `board.node.changed` (C пишет «на доске» у событий доски); `detail`: статус — имена, исполнители —
  по событию на человека, срок — `YYYY-MM-DD`, приоритет — ключ, связь — идентификатор другой задачи или `null` (скрыта →
  «связь со скрытой задачей»), PR — `field: "work_items", new: "LMP-3, LMP-7"`, файл — номера версий строками, узел —
  `field: "kind"` (вид узла) или `"shape_type"` (тип tldraw). Две строки одной связи S уже склеивает — C их не склеивает.
- S3: `{seen_at, seen_version}`, `null/null` — отметки нет; `PUT` без тела. До `migrate ppm_canvas` на dev-БД — 500: C
  показывает «Не удалось загрузить изменения. Повторить» (контроллер применяет миграцию перед живой проверкой).
- S4: одна строка на доску, порядок рейки; 404 — задача невидима: строки «На карте» нет.
- 403/404 (в т.ч. 404 DRF при выключенном флаге мультидосок) — C скрывает кнопку и метки на этой доске.

## 4. M — договорённости по общим файлам

1. `shape.tsx`: C правит только свой импорт-блок `AF2.2 C` (сразу после блока B6 AF2.1) и метод
   `PpmCanvasNodeShapeUtil.component()` (фрагмент + `<PpmChangeChip shape={shape} />`). `PpmCanvasNodeCard`, ветка
   `group`, `WorkItemProjectionCard`, `onResize` — зона M, C их не трогает; M не трогает `component()`. Метка висит над
   верхней рамкой справа (`top: -0.625rem; right: 0.75rem`) — M не ставит туда свои элементы.
2. `living-map-types.ts`, `living-map.css`, `af22-living-map.ts` — у каждой линии свои блоки; перечитывать файл перед
   каждой правкой (одновременные Edit перетирают друг друга).
3. «С начала спринта» C находит сам: рамка спринта через `getPpmCanvasMap` среди фигур `args.editor`, дата — стор спринтов
   Plane (`useCycle().getCycleById`, иначе `fetchCycleDetails`). От полей M (`mapSections`) C не зависит.
4. Предложение (необязательно, решает контроллер): после «Собрать карту» M может поставить сборщику личную отметку
   (`new PpmCanvasChangesService().markSeen(ws, pid, newBoardId)` после первого сохранения новой доски). Иначе у сборщика
   сразу «Что изменилось · 50+» и «добавлено» на всех карточках (RC1: свои изменения считаются); это не запись в доску
   (S3 — личное состояние), но и не «действие пользователя» в узком смысле — поэтому только с решения контроллера.

## 5. Контроллер — решения C на подтверждение (полностью — таблица RC в `plan-C.md`)

- RC1: свои изменения считаются (буквально по спецификации; одиночная живая проверка видит свои правки), автор — «Вы».
- RC4: метки — только на карточках PPM, над верхней рамкой; нативные стикеры/фигуры/текст — только в ленте.
- RC6: пока открыта «Что изменилось», инспектор скрыт (CSS блока C).
- RC9: щелчок по событию — `focusChangeShapes` C (лист карточки, все карточки события, центр без смены масштаба) вместо
  `revealCanvasShape` F (у связей и PR карточек несколько, карточка может быть на другом листе); глубокая ссылка «На
  карте» — по-прежнему F.
