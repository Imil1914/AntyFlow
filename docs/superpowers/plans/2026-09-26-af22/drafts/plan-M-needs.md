# AF2.2 — нужды линии M к F, S, C и контроллеру (сверх CONTRACTS)

Сверено 26.09 ~02:15 с `drafts/plan-F.md`, `plan-F-notes.md`, `plan-S-contract-notes.md`, `plan-C.md`, `plan-C-needs.md`
и с рабочим деревом: F1/F2 уже в дереве (фабрики групп карты, `PPM_CANVAS_GROUP_MAX_SIZE`, заглушки, блоки M в
`editor.tsx`, `living-map-types.ts`, `living-map.css`, `af22-living-map.ts` — ровно как в `plan-F.md`), сервис C1
`ppm-canvas-changes.service.ts` с `markSeen` — тоже. Новых требований к S нет; к F — «не менять» (§1) и два вопроса (§2).

## 1. F — на что опирается M (не менять без сообщения линии M)

1. `TLivingMapArgs`: `authorId`, `bindingsByShapeId`, `boardId`, `boards`, `canEdit`, `editor`, `enabled`, `isActive`,
   `loaded`, `onBoardCreated`, `projectId`, `registerBindings`, `workspaceId`, `workspaceSlug`. Типы `TWorkItemFacts`
   (`workItemId`, `traffic`, `blockedBy`, `relations`), `TTrafficState` с `"none"`, `TWorkItemRef.identifier: string | null`,
   `TMapSectionSummary`, `TLivingMapFacts`, `EMPTY_LIVING_MAP_FACTS`; `usePpmLivingMap()` → `trafficLight`/`setTrafficLight`.
2. Поля M — только необязательные и только в блоках M, типы — встроенным `import("./map-model").…` (строк импорта в
   зону F не добавляем): `TWorkItemFacts.dueDate?`; `TLivingMapFacts.{modules?, placeFromTray?, placing?, relationEdges?,
   sprint?, tray?}`; `TLivingMapArgs.{notify?, projectIdentifier?, workItemOptions?}`. Блок M в `TMapSectionSummary`
   остаётся пустым (гард «типы M ≥ 4» — 4).
3. `editor.tsx`: M добавляет `import { useProject } from "@/hooks/store/use-project";` в свой блок импортов и заполняет
   `livingMapArgsM` (`notify` → `setContentNotice`, `projectIdentifier` → `getProjectIdentifierById(projectId)`,
   `workItemOptions`). Больше M в `editor.tsx` ничего не пишет; число блоков не меняется.
4. Провайдер: `{ ...map, args, changes, … }` — именно разворот, не выбор полей: так поля M доходят до видов.
5. `registerLivingMapBindings` + `flushSave`: после успешного сохранения `binding_status` положенных привязок в
   `bindingsByShapeId` становится `"active"`; при 409 они отменяются и активными не становятся. На это опирается RM14
   («сохранено» = все положенные сборкой привязки, что ещё на доске, — `active`). Если F изменит отражение активации —
   сообщить M.
6. Монтаж: `<PpmSprintMapDialog />` и `<PpmTaskRelationsLayer />` — листья `<Tldraw>` (не в `components`-memo): ожидание
   RM14 и страж RM15 живут в хосте диалога и должны переживать автосохранения. «Светофор» и лоток — в `CanvasControls`
   (перемонтаж при сохранении безвреден: «свёрнут» — модульный набор, раскладка — в хуке провайдера).
7. Гард CSS: M использует после префикса `:has(> …)` (рамка «Светофора» у `.ppm-canvas-node`), обёртки
   `@media (prefers-reduced-motion: reduce)` и составной корень портала
   `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"].ppm-sprint-map-backdrop`. Текущий гард это
   пропускает — просьба не ужесточать. `@keyframes` M не объявляет (крутилка — существующая `ppm-canvas-spin`).
8. `.ppm-living-map-pill` / `.ppm-living-map-panel` — M вешает их и добавляет только свои классы.
9. Фикстура `apps/web/tests/ppm-canvas/fixtures/living-map.ts` — создаёт и ведёт M (id — `uuid(n)`); другим линиям —
   только импорт.

## 2. F — вопросы (решить F или контроллеру)

1. **Секция с живыми карточками при удалении — баг AF2.1, общий случай.** tldraw удаляет группу вместе с потомками
   (`deleteShapes`, откат `applyDiff`), обработчик AF2.1 `beforeDelete` живые карточки не удаляет — они остаются с
   `parentId` исчезнувшей группы: вне страницы (`isShapeInPage` → false), невидимы, но уходят в снимок. M закрывает это
   для групп карты (RM15: страж в `PpmSprintMapDialog` переносит живые карточки на страницу на тех же местах, только
   `source === "user"`; во время «Отменить» история на паузе). Для обычных секций без `map` — предложение F: тот же страж
   с предикатом «группа или рамка PPM» вместо `readMapRole(...)` (одна строка в `mapGroupRescueIds`) либо перенос стража
   рядом с обработчиком AF2.1 в `editor.tsx`. Страж не смонтирован в облике v1 (хост — только при `grammarV2`).
2. **Инспектор v2 над лотком.** Лоток «Не на карте» виден на карте постоянно; инспектор (z 320) при выделении карточки
   ложится поверх правой колонки (z 315). M новые карточки не выделяет (RM11), но пользовательское выделение откроет
   инспектор над лотком. Решить: скрывать лоток при открытом инспекторе, сдвигать колонку или принять. C скрывает инспектор
   только пока открыта своя панель (RC6).
3. (Необязательно) Сохранять сразу, когда в очереди активаций ≥ 50 привязок, а не через 1 с автосохранения.

## 3. S — S1 (сверено с `plan-S-contract-notes.md` §2)

1. M шлёт `{ items: [{ entity_id, entity_type, shape_id }] }` без `client_operation_id` (сервер выводит uuid5 — повтор
   идемпотентен), результаты сопоставляет по индексу (`shape_id` ошибки может быть `null`).
2. PR из лотка: `entity_type: "pull_request"`, `entity_id` = `git_object_id` ссылки (`GET …/git/links/`); для ручной
   ссылки без объекта — id `PpmGitLink`. Если одиночная/пакетная привязка PR по id ссылки не поддерживается — сказать M:
   такие пункты лоток тогда не покажет (одна строка в `collectNotOnMap`).
3. ≤ 200 пунктов в запросе и ≤ 200 активаций в сохранении: M режет сборку и «Разложить всё» до 200.
4. Риск: несколько «+ Добавить» за ~1 с копят в очереди активаций больше 200 → одно сохранение превысит предел. Нужен
   либо внятный отказ сервера (и повтор F), либо сохранение F, когда очередь дошла до 200.

## 4. C — договорённости

1. **RM14 (решение контроллера):** M1 один раз вызывает `new PpmCanvasChangesService().markSeen(workspaceId, projectId,
   newBoardId)` после сохранения, активировавшего привязки новой карты; ошибки молча пропускаются. Хук C во вкладке новой
   доски мог загрузить ленту до отметки (для свежей доски она пуста) — делать ничего не нужно: следующая загрузка читает
   новую отметку. Просьба не менять сигнатуру `markSeen` и экспорт `PpmCanvasChangesService` (M импортирует только их).
2. `shape.tsx`: блоки M — импорт (сразу над `export const PPM_CANVAS_SHAPE_TYPE`, после блока импортов C, если он уже
   есть), предел `onResize`, ветка групп карты в `NodeEditor`, «Светофор» в `WorkItemProjectionCard` (хук, переменные,
   `data-ppm-traffic` на корне, строка над ошибкой). C — только свой импорт и `component()`; рамка «Светофора» рисуется
   на `.ppm-canvas-node` через `:has(> .ppm-work-item-card…)`, метка C — соседний элемент вне `HTMLContainer`: не мешают.
3. «С начала спринта»: C находит спринт сам; `usePpmLivingMap().sprint?.startDate` от M — запасной источник, если нужен.
4. `living-map-types.ts`, `living-map.css`, `af22-living-map.ts` — у каждой линии свои блоки; перечитывать файл перед
   каждой правкой.

## 5. Контроллер

1. Порядок: M1 — после F2 и C1 (M1 импортирует сервис C1; он уже в дереве). M2 → M3 → M4 строго по порядку: они правят
   помеченные строки `map-data.ts` (`// M2:`, `// M3:`, `// M4:`) и `living-map-facts.ts` после M1.
2. Параллельные правки общих файлов с C (`shape.tsx`, `living-map-types.ts`, `living-map.css`, `af22-living-map.ts`):
   перечитывать перед правкой; не запускать `oxfmt` на файл, который в ту же минуту правит другая линия.
3. Предел вкладок: если рабочее пространство не откроет вкладку новой доски, план ждёт в очереди страницы, пока доску не
   откроют в этой сессии; после перезагрузки — пустая доска «Карта · …» (удалить или собрать заново). Принять или
   попросить F открывать новую карту принудительно.
4. Живая проверка после M: карта текущего спринта (50 задач) ≤ 5 с; «Отменить»/«Повторить» сборки (карточки не
   пропадают); Delete по секции карты; «+ Добавить» и «Разложить всё»; «Светофор» в двух вкладках; после первого
   сохранения у сборщика кнопка «Что изменилось» без числа (RM14).
5. Решения RM1–RM15 — в CHANGELOG карточки.
