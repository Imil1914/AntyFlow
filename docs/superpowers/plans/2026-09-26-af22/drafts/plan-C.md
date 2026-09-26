# AF2.2 — Часть C («Что изменилось», метки на карточках, «На карте» в задаче): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Кнопка и панель «Что изменилось с … · N» на доске v2 (лента S2 от личной отметки S3, периоды «с последнего
просмотра · с начала спринта · с даты…», щелчок — к карточке, «Отметить просмотренным»), метки «изменено/добавлено» на
карточках и строка «На карте» в задаче Plane со ссылками на доски (S4).

**Architecture:**
- Вся логика — в чистых модулях без DOM (`changes-model.ts`, `changes-format.ts`, сервис с zod) и тестируется в node-env
  vitest; React-часть (хук, кнопка, панель, метка, строка «На карте») — тонкая, её «проводка» пинится тестами по исходнику,
  как в AF2.1.
- `useBoardChanges(args)` заменяет заглушку F и возвращает `changes` контекста «Живой карты»: обязательные поля F
  (`count`, `byShapeId`) + необязательные поля C (`byWorkItemId`, `panel`). Состояние панели (открыта, период, лента,
  отметка) живёт в хуке — внутри провайдера F, снаружи `<Tldraw>`: `CanvasControls` (где F смонтировал кнопку и панель)
  перемонтируется при каждом сохранении доски (`components`-memo), а панель это переживает.
- Две ленты S2: «непросмотренное» (с личной отметки S3 — метки и число на кнопке) и «период панели» (второй запрос только
  когда открытая панель показывает «с начала спринта»/«с даты…»). Запись одна — `PUT …/me/seen/` по кнопке.
- Метка — соседний с карточкой элемент из `PpmCanvasNodeShapeUtil.component()` (у карточки `overflow: hidden`), висит над
  верхней рамкой справа; читает только контекст — камера её не перерисовывает.
- «На карте» — компонент вне Холста (утилиты Tailwind, `usePpmDesignV2()`), ссылка — `canvasShapeLinkPath` F.

**Tech Stack:** plane-fork (React Router 7 + Vite, React 18.3, tldraw 3.15.6, MobX, zod 3.25, axios), `@ppm/brand`
(tsdown), vitest 4 (env `node`, без DOM), oxlint/oxfmt.

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.2 — Живая карта проекта: сборка из спринта, светофор, «Не на карте», «Что изменилось».md`
(разделы E, F, S2–S4, «Контракты и инварианты», R4, R5, R8). Контракты линий: `drafts/CONTRACTS.md` (§0–§5). Швы F —
`drafts/plan-F.md` (таблица имён, шаги 5–8) и `drafts/plan-F-notes.md` §3; форматы S — `drafts/plan-S-contract-notes.md`
§3–§5. Макет — `docs/superpowers/plans/2026-09-25-af21/mockups/K5-Living-Map.png`. Нужды C к F/S/M/контроллеру —
`drafts/plan-C-needs.md`.

**Порядок:** после F2 (и собранных в F1 `dist`). C1 → C2 → C3 строго по порядку (C2 и C3 используют модули C1). S
независима: пока S2/S3 нет на стенде, кнопка скрыта (404) или панель показывает «Не удалось загрузить… Повторить».

| Задача | Суть | Время |
|---|---|---|
| C1 | Сервис S2/S3 (zod по пунктам), модель периода и лент, тексты K5 и даты, `useBoardChanges`, кнопка «Что изменилось · N», панель, строки блока C, CSS блока C | ~60 мин |
| C2 | Метки «изменено/добавлено» на карточках: индекс по фигуре и задаче, `PpmChangeChip`, блок C в `shape.tsx`, CSS | ~20 мин |
| C3 | «На карте» в задаче: S4 в сервисе, `PpmIssueCanvasBoards`, монтирование в боковой панели и превью, строки блока T | ~25 мин |

## Global Constraints (часть C)

- Пути — от `plane-fork/`: `PF=/Users/ermolov/Desktop/PPM/plane-fork`,
  `T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools`,
  `L=$PF/apps/web/core/components/ppm-canvas/living-map`.
- Рабочее дерево — единственный источник правды. **Коммитов нет.** Никаких `git add` (в т.ч. `-N`), `commit`, `stash`,
  `reset`, `checkout`, `clean`, `rebase`; снимки — контроллер (`af22-snap.sh`).
- Перед первой правкой **или созданием** любого файла: `$T/af22-pre.sh <путь от plane-fork> …` (повтор для уже
  сохранённого пути ничего не делает).
- Пакеты — только `$T/af22-pkg-build.sh ppm-brand` (web читает `dist`); сборка — сразу после правки строк, **до** тестов
  web, которые их читают. `pnpm` нет в PATH: `./node_modules/.bin/*` в каталоге пакета; oxlint/oxfmt —
  `../../node_modules/.bin/…`.
- Dev-сервер :3000 не трогать; браузер, миграцию `0009` S на dev-БД и живую проверку делает контроллер.
- Всё новое на Холсте — только при грамматике v2: хук — `args.enabled`, виды — `usePpmCanvasGrammarV2()`; «На карте» —
  только при `usePpmDesignV2()`. Облик v1 и минимальный режим (`PPM_ANTYFLOW_SHELL_ENABLED=0`) не меняются.
- AF2.1 R19: запросы, `window`/`document`-слушатели и опрос — только при `args.isActive` (скрытые вкладки досок молчат).
- Ничего не пишется в доску. Единственная запись линии — личная отметка `PUT …/me/seen/`, только по «Отметить
  просмотренным»; права — чтение доски (читатель тоже отмечает и видит ленту).
- Горячие клавиши — только `e.code` (линия добавляет лишь Escape в панели). Без ИИ и без новых внешних запросов.
- Строки — только `packages/ppm-brand/src/translations/af22-living-map.ts`: блок `// ── C:` — `canvas.changes.*`, блок
  `// ── T:` — `issue.canvas_boards.*` (en **и** ru); словарь PPM: «задача», «спринт», никогда «цикл», «модуль»,
  «представление», «рабочий элемент» (`i18n-overlay.test.ts`).
- CSS — только внутри `/* ── C: «Что изменилось» — кнопка, панель, метки на карточках ── */ … /* ── /C ── */` в
  `living-map.css`; каждый селектор начинается с `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]`, без
  запятых внутри `:where(...)`, без новых комментариев вида `/* ── X: ` (гард `af22-foundation.test.ts`).
- Общие файлы — только свои размеченные блоки `AF2.2 C` (`shape.tsx`, `living-map-types.ts`, `sidebar.tsx`,
  `properties.tsx`); `editor.tsx` линия C **не правит** (кнопку и панель F уже смонтировал в `.ppm-living-map-aside`).
  M правит `shape.tsx`, `living-map-types.ts`, `living-map.css`, `af22-living-map.ts` параллельно: перечитывать файл перед
  каждой правкой, чужие блоки и маркеры не трогать.
- `apps/web/core/components/issues/peek-overview/properties.tsx` — в зоне аудита бренда: в добавленных строках, кроме
  строк-комментариев `//`, нет слова «plane».
- Базовая линия — состояние после F (и уже сделанных M/S), не ухудшать: web tsc 0; oxlint `Found 719 warnings and 0
  errors.` (если F/M изменили число — то, что было перед C); `@ppm/brand` — все тесты + оба аудита; web vitest — всё
  зелёное, линия C добавляет 4 файла / 43 теста (C1: 2 файла / 32, C2: 1 / 6, C3: 1 / 5).
- Код в блоках шагов сдвинут на 2 пробела (отступ пункта списка): в файл он идёт без этих 2 пробелов; «Было» ищется в файле
  ровно в том виде, как после снятия отступа (каждый «Было» встречается в своём файле один раз).
- Команды проверок:
  - web (свои тесты): `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/<файл>`
  - web (всё): `cd $PF/apps/web && ./node_modules/.bin/vitest run`
  - web tsc: `cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/af22-C.tsbuildinfo`
  - oxlint: `cd $PF/apps/web && ../../node_modules/.bin/oxlint --max-warnings=11957 .`
  - brand: `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  - формат — только свои файлы: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt <файлы>`; в пакете —
    `cd $PF/packages/ppm-brand && ../../node_modules/.bin/oxfmt src/translations/af22-living-map.ts`. CSS oxfmt не форматирует.

## Review Focus (часть C)

1. **Фоновые вкладки досок (мультидоска).** Открыто 3–8 досок: ленту запрашивает, окно слушает и опрашивает раз в 60 с
   только активная; возврат на вкладку (или в окно) — одна загрузка, а не две (focus + visibilitychange). Тесты — C1:
   «useBoardChanges: F's contract, only the active board tab…» (4 защиты `!enabled || !isActive`), `shouldRefreshOnReturn`.
2. **Сервер без S2/S3 или без доступа.** 404 DRF при выключенном флаге мультидосок, 404 архивной доски, 403, 500 до
   миграции `0009`: кнопка и метки скрыты (403/404) или панель предлагает «Повторить» (прочее), ничего не падает и не мигает
   при повторных попытках. Тесты — C1: `changesLoadStatus`, `failChangesLoad`, `beginChangesLoad`, видимость кнопки.
3. **Сохранение доски при открытой панели.** Каждое сохранение перемонтирует `CanvasControls`: панель остаётся открытой, с тем
   же периодом и лентой; фокус не уходит из карточки, которую пользователь правит; до 200 строк не пересобираются на каждый
   кадр перетаскивания. Тесты — C1: `consumeFocus` в кнопке и панели, `memo`, состояние в хуке.
4. **События без карточки под рукой.** Задачи спринта вне карты, удалённые фигуры, карточка на другом листе: строка без
   карточки не нажимается (подсказка «Этой карточки нет на доске»), с карточкой на другом листе — переводит на лист; пустой
   список фигур — ничего не делает. Тесты — C1: `focusChangeShapes`, `presentShapeKey`.
5. **Время и даты.** Часовой пояс машины, «сегодня/вчера» около полуночи, прошлый год, «с даты…» и начало спринта — от
   местной полуночи, отметка S3 с микросекундами уходит на сервер как есть, окно старше 30 дней — «показаны не все».
   Тесты — C1: `localDayStartIso`, `defaultChangesSince`, `formatChangeWhen`, `formatChangesSince`, `formatChangesCount`.

Живая проверка (контроллер, проект 228, после миграции `0009`): см. «Acceptance» каждой задачи.

## Решения линии C (записать в CHANGELOG)

| # | Вопрос | Решение |
|---|---|---|
| RC1 | Считать ли свои изменения | Да, буквально по спецификации («всё, что изменилось с прошлого раза»); автор — «Вы». Живая проверка одним пользователем видит свои правки. Шум у сборщика новой карты — см. нужду M в `plan-C-needs.md` |
| RC2 | Что считает N на кнопке и метки | Непросмотренное с личной отметки (S3) независимо от периода панели; вторая лента — только пока открытая панель показывает другой период |
| RC3 | «Группировка» ленты | Новые первыми; у полей «последнего значения» (статус, срок, приоритет, название, версия файла, правка карточки) — одна строка, самая новая; «добавлено» поглощает «изменено» той же карточки; исполнители и связи — по событию (пару строк связи S2 уже склеил). N = строк после свёртки |
| RC4 | Где метки | Только на карточках PPM (узел `ppm-canvas-node`) — над верхней рамкой справа, вне `HTMLContainer` (у карточки `overflow: hidden`); нативные стикеры/фигуры/текст меток не получают (в ленте они есть, щелчок их выделяет) |
| RC5 | Сервер без ленты | 403/404 от S2/S3 — функция скрывается на этой доске; прочие ошибки — «Не удалось загрузить изменения. Повторить» |
| RC6 | Инспектор перекрывает панель | Пока панель открыта, инспектор скрыт (одна правая панель, AF2.1 R5) правилом блока C `.tl-container:has(.ppm-changes-panel) ~ .ppm-canvas-inspector` (у́же, чем вариант из `plan-F-notes.md` §3; оба проходят гард F) |
| RC7 | Где состояние панели и фокус | В хуке (`changes.panel`), не в `CanvasControls`; фокус переходит в панель/на кнопку один раз после явного открытия/закрытия (`consumeFocus`); кнопка и панель — `memo` |
| RC8 | Периоды | «С начала спринта» — только на доске с рамкой спринта (`getPpmCanvasMap`), дата начала — календарная (как `computePpmSprintScale`) от местной полуночи; «с даты…» — поле `type="date"` в пределах 30 дней, пустое при выборе заполняется датой текущего начала периода |
| RC9 | Щелчок по событию | `focusChangeShapes`: лист первой найденной карточки → выделить все карточки события на этом листе → центр камеры без смены масштаба. Не `revealCanvasShape` F: у связей и PR карточек несколько, карточка может быть на другом листе; глубокая ссылка «На карте» остаётся за F |
| RC10 | «На карте» | Строка сразу после «Метки» внутри списка свойств (у читателя приглушена вместе со всеми свойствами); утилиты Tailwind темы PPM; переход — `next/link` (роутер); ошибка или пусто — строки нет |
| RC11 | Род глаголов | В данных нет пола автора: тексты без рода — «ROBOT-16 → В работе», «{задача}: новый исполнитель — {имя}», «добавлено · Даша П. · 22 сент.» |

## Что C берёт у F и S (сверено с `plan-F.md` и `plan-S-contract-notes.md`)

| Откуда | Имя | Где у C |
|---|---|---|
| F | `TLivingMapArgs` (`authorId`, `boardId`, `boards`, `editor`, `enabled`, `isActive`, `projectId`, `workspaceId`, `workspaceSlug`) | аргумент `useBoardChanges` |
| F | `TBoardChangeIndex { count, byShapeId }` + блок `// ── AF2.2 C:`, `TBoardChangeMark`, `EMPTY_BOARD_CHANGE_INDEX` | C1 добавляет `byWorkItemId?`, `panel?` |
| F | `usePpmLivingMap()` → `changes` (провайдер F вызывает `useBoardChanges(args)`) | кнопка, панель, метка |
| F | заглушки `living-map/board-changes.ts`, `changes-button.tsx`, `changes-panel.tsx`; монтаж в `.ppm-living-map-aside` (`__bar` — кнопка, ниже — панель) | C1 заменяет тела, не имена |
| F | `.ppm-living-map-pill`, `.ppm-living-map-panel`; блок C в `living-map.css` | C1, C2 |
| F | `canvasShapeLinkPath(workspaceSlug, projectId, boardId, shapeId)` (`living-map/shape-link.ts`) | C3 |
| F | `getPpmCanvasMap(node)` (`@ppm/canvas`) | рамка спринта (C1) |
| F | блоки `// ── C:` и `// ── T:` в `af22-living-map.ts`; `ppm-canvas-boards.tsx` в `extraFiles` аудита Tailwind | C1, C3 |
| S2 | `GET canvas/boards/<id>/changes/?since&limit` — поля и `detail` по `plan-S-contract-notes.md` §3 (`work_items` у PR, `kind`/`shape_type` у узлов, `null` у скрытой связи) | сервис, тексты |
| S3 | `GET canvas/boards/<id>/me/`, `PUT canvas/boards/<id>/me/seen/` | сервис, хук |
| S4 | `GET canvas/work-items/<id>/boards/` — строка на доску | C3 |

## Карта файлов линии C

| Файл (от `plane-fork/`) | Задача | Что |
|---|---|---|
| `apps/web/core/services/ppm-canvas-changes.service.ts` | C1, C3 | новый: S2, S3 (C1), S4 (C3) |
| `apps/web/core/components/ppm-canvas/living-map/changes-model.ts` | C1, C2 | новый: период, ленты, свёртка, индекс, рамка спринта, переход (C1); метка по задаче (C2) |
| `…/living-map/changes-format.ts` | C1 | новый: тексты и даты |
| `…/living-map/board-changes.ts` | C1 | тело вместо заглушки F |
| `…/living-map/changes-button.tsx`, `…/living-map/changes-panel.tsx` | C1 | тела вместо заглушек F |
| `…/living-map/living-map-types.ts` | C1 | блоки `AF2.2 C` |
| `…/living-map/living-map.css` | C1, C2 | блок C |
| `packages/ppm-brand/src/translations/af22-living-map.ts` | C1, C3 | блоки C и T |
| `…/living-map/change-chips.tsx` | C2 | новый |
| `apps/web/core/components/ppm-canvas/shape.tsx` | C2 | блоки `AF2.2 C` |
| `apps/web/core/components/issues/issue-detail/ppm-canvas-boards.tsx` | C3 | новый |
| `apps/web/core/components/issues/issue-detail/sidebar.tsx`, `…/issues/peek-overview/properties.tsx` | C3 | блоки `AF2.2 C` |
| `apps/web/tests/ppm-canvas/living-map-changes.test.ts`, `…/living-map-changes-panel.test.ts` | C1 | новые |
| `apps/web/tests/ppm-canvas/living-map-changes-chips.test.ts` | C2 | новый |
| `apps/web/tests/ppm-canvas/issue-canvas-boards.test.ts` | C3 | новый |

Код этого плана прогнан 2026-09-26 на копии web с заглушками F из `plan-F.md` (шаги 5–7 дословно) и `@ppm/canvas` с
`getPpmCanvasMap`: состояния C1, C1+C2, C1+C2+C3 — тесты 32 / 38 / 43 passed, `tsc --noEmit` чисто, oxlint 0/0, oxfmt
чисто, гарды F (`living-map.css`, блоки типов, экспорты, «хук не импортирует контекст») проходят.

---

### Task C1: «Что изменилось» — сервис S2/S3, модель и тексты, хук, кнопка и панель

**Files:**
- Create: `apps/web/core/services/ppm-canvas-changes.service.ts`
- Create: `apps/web/core/components/ppm-canvas/living-map/changes-model.ts`, `…/living-map/changes-format.ts`
- Replace (заглушки F, владелец C): `…/living-map/board-changes.ts`, `…/living-map/changes-button.tsx`, `…/living-map/changes-panel.tsx`
- Modify: `…/living-map/living-map-types.ts` (импорт и блок `AF2.2 C` в `TBoardChangeIndex`), `…/living-map/living-map.css`
  (блок C), `packages/ppm-brand/src/translations/af22-living-map.ts` (блок `// ── C:`)
- Rebuild: `packages/ppm-brand/dist` (`$T/af22-pkg-build.sh ppm-brand`)
- Test: `apps/web/tests/ppm-canvas/living-map-changes.test.ts`, `apps/web/tests/ppm-canvas/living-map-changes-panel.test.ts`

**Interfaces:**
- Consumes (F): `TLivingMapArgs`, `TBoardChangeIndex`, `TBoardChangeMark`, `EMPTY_BOARD_CHANGE_INDEX`
  (`living-map-types.ts`); `usePpmLivingMap()` (`living-map-context.ts`); `getPpmCanvasMap` (`@ppm/canvas`); классы
  `.ppm-living-map-pill`, `.ppm-living-map-panel`. Существующее: `APIService` (`get(url, params, config)`, `put`),
  `PpmCanvasServiceError` (`ppm-canvas.service.ts`), `ppmCanvasErrorResponseSchema`, `parseSerializedPpmCanvasNode`,
  `fillCanvasTemplate`, `formatDueDate`, `OWN_NODE_KIND_KEYS`, `usePpmCanvasGrammarV2` (`canvas-grammar.ts`), `geoLabelKey`
  (`canvas-toolkit-model.ts`), `useCycle()` (`getCycleById`, `fetchCycleDetails`), `usePpmTranslation`, `useTranslation`
  (`@plane/i18n`, `currentLocale`).
- Produces:
  - сервис: `PpmCanvasChangesService` — `getChanges(ws, pid, boardId, since, limit = 200): Promise<TPpmBoardChangesResponse>`,
    `getSeen(ws, pid, boardId): Promise<TPpmBoardSeen>`, `markSeen(ws, pid, boardId): Promise<TPpmBoardSeen>`; типы
    `TPpmBoardChange`, `TPpmBoardChangeKind`, `TPpmBoardChangesResponse`, `TPpmBoardSeen`; `PPM_BOARD_CHANGE_KINDS`,
    `PPM_BOARD_CHANGES_LIMIT`, `ppmBoardChangeSchema`, `ppmBoardSeenSchema`.
  - модель (`changes-model.ts`): `PPM_CHANGES_POLL_MS = 60_000`, `PPM_CHANGES_DEFAULT_DAYS = 7`, `PPM_CHANGES_MAX_DAYS = 30`,
    `PPM_CHANGES_RETURN_GAP_MS = 2_000`; типы `TChangesMode`, `TBoardChangesStatus`, `TChangesFeed`, `TChangesPeriodFeed`,
    `TBoardChangesState`, `TBoardChangesPanel`, `TBoardChangesApi`, `TBoardChangesLoadInput`, `TBoardChangesLoad`,
    `TChangeFocusEditor`; функции `defaultChangesSince`, `localDayStartIso`, `localDateValue`, `changesDateBounds`,
    `changesPeriodKey`, `changesSinceForMode`, `loadBoardChanges`, `sameChangeItems`, `beginChangesLoad`,
    `mergeLoadedChanges`, `changesLoadStatus`, `failChangesLoad`, `applySeen`, `shouldRefreshOnReturn`, `changeText`,
    `groupBoardChanges`, `buildBoardChangeIndex` (→ `{ byShapeId, byWorkItemId }`), `findSprintCycleId`,
    `boardTopLevelShapes`, `presentShapeKey`, `focusChangeShapes`; `INITIAL_BOARD_CHANGES_STATE`.
  - тексты (`changes-format.ts`): типы `TChangesT`, `TChangeIcon`, `TBoardChangeView`, `TDescribeChangeContext`; функции
    `formatChangeWhen`, `formatChangesSince`, `formatChangesCount`, `nodeLabelKey`, `boardNodeLabelKey`,
    `nodeKindKeyForShapes`, `describeBoardChange`.
  - `useBoardChanges(args: TLivingMapArgs): TBoardChangeIndex` (`board-changes.ts`), `PpmChangesButton`
    (`changes-button.tsx`), `PpmChangesPanel` (`changes-panel.tsx`); поля `TBoardChangeIndex.byWorkItemId?`, `.panel?`.
  - классы `.ppm-changes-button`, `.ppm-changes-panel`, `.ppm-changes-panel__*`; ключи `canvas.changes.*` (51, список — шаг 5).

- [ ] **Step 0: Сверить швы F** (линия C стартует после F2; при любом расхождении — остановиться и сообщить контроллеру,
  `plan-C-needs.md` §1)
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork
  L=apps/web/core/components/ppm-canvas/living-map
  grep -c "export function useBoardChanges(_args: TLivingMapArgs): TBoardChangeIndex" $L/board-changes.ts
  grep -c "export function PpmChangesButton()" $L/changes-button.tsx
  grep -c "export function PpmChangesPanel()" $L/changes-panel.tsx
  grep -c "const changes = useBoardChanges(args);" $L/living-map-provider.tsx
  grep -c "export function usePpmLivingMap" $L/living-map-context.ts
  grep -n "count: number;\|byShapeId: ReadonlyMap<string, TBoardChangeMark>;\|── AF2.2 C: необязательные поля линии C ──$" $L/living-map-types.ts
  grep -n "enabled: boolean;\|isActive: boolean;\|workspaceSlug: string;" $L/living-map-types.ts
  grep -n "<PpmChangesButton />\|<PpmChangesPanel />" apps/web/core/components/ppm-canvas/editor.tsx
  grep -n "── C: «Что изменилось» — кнопка, панель, метки на карточках ──\|── /C ──" $L/living-map.css
  grep -n "// ── C: «Что изменилось» ──\|// ── T: «На карте» в задаче (пишет линия C) ──" packages/ppm-brand/src/translations/af22-living-map.ts
  grep -c "getPpmCanvasMap" packages/ppm-canvas/dist/index.d.mts
  ```
  Ожидание: по `1` в первых пяти; три строки типов (`count`, `byShapeId`, маркер C в `TBoardChangeIndex`); три строки
  `TLivingMapArgs`; две строки `editor.tsx` (обе внутри `<div className="ppm-living-map-aside">`); две строки CSS; четыре
  строки маркеров переводов (en и ru); `getPpmCanvasMap` ≥ 1.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools
  $T/af22-pre.sh apps/web/core/services/ppm-canvas-changes.service.ts \
    apps/web/core/components/ppm-canvas/living-map/changes-model.ts \
    apps/web/core/components/ppm-canvas/living-map/changes-format.ts \
    apps/web/core/components/ppm-canvas/living-map/board-changes.ts \
    apps/web/core/components/ppm-canvas/living-map/changes-button.tsx \
    apps/web/core/components/ppm-canvas/living-map/changes-panel.tsx \
    apps/web/core/components/ppm-canvas/living-map/living-map-types.ts \
    apps/web/core/components/ppm-canvas/living-map/living-map.css \
    packages/ppm-brand/src/translations/af22-living-map.ts \
    apps/web/tests/ppm-canvas/living-map-changes.test.ts \
    apps/web/tests/ppm-canvas/living-map-changes-panel.test.ts
  ```
  (файлы F уже сохранены F как `.__absent__` — повтор ничего не делает; новые получают `.__absent__`).

- [ ] **Step 2: Падающие тесты**
  `apps/web/tests/ppm-canvas/living-map-changes.test.ts`:
  ```ts
  // AF2.2 C1: «Что изменилось» — сервис S2/S3 (zod, по пунктам), период ленты и правило по умолчанию (R5), загрузка
  // двух лент (непросмотренное и период панели), свёртка, индекс меток, переход к карточке; хук — только у активной
  // вкладки (AF2.1 R19), опрос раз в 60 с при открытой панели (R8), запись — только «Отметить просмотренным».
  import { readFileSync } from "node:fs";
  import { describe, expect, it, vi } from "vitest";
  import type { Editor } from "tldraw";
  import { createPpmCanvasNode } from "@ppm/canvas";
  import {
    applySeen,
    beginChangesLoad,
    buildBoardChangeIndex,
    changesDateBounds,
    changesLoadStatus,
    changesPeriodKey,
    changesSinceForMode,
    defaultChangesSince,
    failChangesLoad,
    findSprintCycleId,
    focusChangeShapes,
    groupBoardChanges,
    INITIAL_BOARD_CHANGES_STATE,
    loadBoardChanges,
    localDayStartIso,
    mergeLoadedChanges,
    PPM_CHANGES_POLL_MS,
    presentShapeKey,
    shouldRefreshOnReturn,
  } from "@/components/ppm-canvas/living-map/changes-model";
  import { PpmCanvasChangesService, type TPpmBoardChange } from "@/services/ppm-canvas-changes.service";
  import { PpmCanvasServiceError } from "@/services/ppm-canvas.service";

  const WS = "22222222-2222-4222-8222-222222222222";
  const PROJECT = "33333333-3333-4333-8333-333333333333";
  const BOARD = "44444444-4444-4444-8444-444444444444";
  const ME = "55555555-5555-4555-8555-555555555555";
  const DASHA = "66666666-6666-4666-8666-666666666666";
  const TASK_15 = "77777777-7777-4777-8777-777777777777";
  const CYCLE = "88888888-8888-4888-8888-888888888888";
  const BASE = `/api/ppm/v1/workspaces/${WS}/projects/${PROJECT}/canvas/boards/${BOARD}/`;
  const DAY = 86_400_000;

  // Местное время: тесты не зависят от часового пояса машины.
  const at = (day: number, hour = 12, minute = 0) => new Date(2026, 8, day, hour, minute).toISOString();
  const NOW = new Date(2026, 8, 26, 12, 0).getTime();

  function change(overrides: Partial<TPpmBoardChange> & Pick<TPpmBoardChange, "id" | "kind">): TPpmBoardChange {
    return {
      actor: { id: DASHA, display_name: "Даша П." },
      detail: {},
      entity: { type: "work_item", id: TASK_15, identifier: "ROBOT-15", title: "Сценарий сортировки" },
      occurred_at: at(22),
      shape_ids: [],
      ...overrides,
    };
  }

  describe("changes service (S2, S3)", () => {
    it("asks for the board feed since a moment, at most 200 events, and drops items it cannot read", async () => {
      const service = new PpmCanvasChangesService();
      const good = change({
        id: "a",
        kind: "work_item.state",
        detail: { field: "state", old: "Todo", new: "In Progress" },
      });
      const get = vi.spyOn(service, "get").mockResolvedValue({
        data: {
          since: at(19),
          until: at(26),
          items: [good, { ...good, id: "b", kind: "work_item.labels" }, { id: "c" }],
          truncated: false,
        },
      } as never);

      const response = await service.getChanges(WS, PROJECT, BOARD, at(19), 500);

      expect(get).toHaveBeenCalledWith(`${BASE}changes/`, { params: { since: at(19), limit: 200 } });
      expect(response.items.map((item) => item.id)).toEqual(["a"]);
      expect(response).toMatchObject({ since: at(19), truncated: false, until: at(26) });
    });

    it("reads and writes the personal checkpoint; an empty answer means «never viewed»", async () => {
      const service = new PpmCanvasChangesService();
      const get = vi.spyOn(service, "get").mockResolvedValue({ data: "" } as never);
      const put = vi.spyOn(service, "put").mockResolvedValue({ data: { seen_at: at(26), seen_version: 7 } } as never);

      await expect(service.getSeen(WS, PROJECT, BOARD)).resolves.toEqual({ seen_at: null, seen_version: null });
      await expect(service.markSeen(WS, PROJECT, BOARD)).resolves.toEqual({ seen_at: at(26), seen_version: 7 });
      expect(get).toHaveBeenCalledWith(`${BASE}me/`);
      expect(put).toHaveBeenCalledWith(`${BASE}me/seen/`, {});
    });

    it("turns a PPM error into PpmCanvasServiceError; 403/404 hide the feature, other failures offer a retry", async () => {
      const service = new PpmCanvasChangesService();
      const notFound = Object.assign(new Error("Request failed"), {
        isAxiosError: true,
        response: {
          status: 404,
          data: {
            error: {
              code: "CANVAS_BOARD_NOT_FOUND",
              message: "Board not found.",
              request_id: "99999999-9999-4999-8999-999999999999",
              details: {},
            },
          },
        },
      });
      vi.spyOn(service, "get").mockRejectedValue(notFound);

      const failure = await service.getSeen(WS, PROJECT, BOARD).catch((reason: unknown) => reason);

      expect(failure).toBeInstanceOf(PpmCanvasServiceError);
      expect(failure).toMatchObject({ code: "CANVAS_BOARD_NOT_FOUND", status: 404 });
      expect(changesLoadStatus(failure)).toBe("unavailable");
      expect(changesLoadStatus(new PpmCanvasServiceError("denied", { status: 403 }))).toBe("unavailable");
      expect(changesLoadStatus(new PpmCanvasServiceError("down", { status: 502 }))).toBe("error");
      expect(changesLoadStatus(new Error("offline"))).toBe("error");
    });
  });

  describe("period of the feed (R5)", () => {
    it("starts from the personal checkpoint, else from the board creation but not earlier than 7 days", () => {
      expect(defaultChangesSince(at(18, 9, 30), at(1), NOW)).toBe(at(18, 9, 30));
      expect(defaultChangesSince(null, at(24), NOW)).toBe(at(24));
      expect(defaultChangesSince(null, at(1), NOW)).toBe(new Date(NOW - 7 * DAY).toISOString());
      expect(defaultChangesSince(null, null, NOW)).toBe(new Date(NOW - 7 * DAY).toISOString());
      expect(defaultChangesSince("not a date", at(24), NOW)).toBe(at(24));
    });

    it("reads «с начала спринта» and «с даты…» as local midnight; without a date — the default period", () => {
      expect(localDayStartIso("2026-09-16")).toBe(new Date(2026, 8, 16).toISOString());
      expect(localDayStartIso("2026-09-16T00:00:00Z")).toBe(new Date(2026, 8, 16).toISOString());
      expect(localDayStartIso("2026-02-31")).toBeNull();
      expect(localDayStartIso("")).toBeNull();
      const base = {
        boardCreatedAt: at(1),
        customDate: "2026-09-20",
        now: NOW,
        seenAt: at(25),
        sprintStart: "2026-09-16",
      };
      expect(changesSinceForMode({ ...base, mode: "last_seen" })).toBe(at(25));
      expect(changesSinceForMode({ ...base, mode: "sprint" })).toBe(new Date(2026, 8, 16).toISOString());
      expect(changesSinceForMode({ ...base, mode: "date" })).toBe(new Date(2026, 8, 20).toISOString());
      expect(changesSinceForMode({ ...base, mode: "sprint", sprintStart: null })).toBe(at(25));
      expect(changesSinceForMode({ ...base, mode: "date", customDate: "" })).toBe(at(25));
      expect(changesPeriodKey("sprint", "", "2026-09-16")).toBe("sprint:2026-09-16");
      expect(changesPeriodKey("date", "2026-09-20", null)).toBe("date:2026-09-20");
      expect(changesDateBounds(NOW)).toEqual({ max: "2026-09-26", min: "2026-08-27" });
    });
  });

  describe("loading the feeds", () => {
    const response = (since: string, items: TPpmBoardChange[] = []) => ({
      items,
      since,
      truncated: false,
      until: at(26),
    });

    it("fetches one feed for «с последнего просмотра», two when the open panel shows another period", async () => {
      const getSeen = vi.fn().mockResolvedValue({ seen_at: at(25), seen_version: 3 });
      const getChanges = vi.fn((since: string) => Promise.resolve(response(since)));
      const input = {
        boardCreatedAt: at(1),
        customDate: "",
        mode: "last_seen" as const,
        now: NOW,
        panelOpen: true,
        sprintStart: "2026-09-16",
      };

      const lastSeen = await loadBoardChanges({ getChanges, getSeen }, input);
      expect(getChanges.mock.calls.map(([since]) => since)).toEqual([at(25)]);
      expect(lastSeen).toMatchObject({ period: null, seenAt: at(25), unseen: { since: at(25) } });

      getChanges.mockClear();
      const sprint = await loadBoardChanges({ getChanges, getSeen }, { ...input, mode: "sprint" });
      expect(getChanges.mock.calls.map(([since]) => since)).toEqual([at(25), new Date(2026, 8, 16).toISOString()]);
      expect(sprint.unseen.since).toBe(at(25));
      expect(sprint.period).toMatchObject({ key: "sprint:2026-09-16", since: new Date(2026, 8, 16).toISOString() });

      getChanges.mockClear();
      const closed = await loadBoardChanges({ getChanges, getSeen }, { ...input, mode: "sprint", panelOpen: false });
      expect(getChanges).toHaveBeenCalledTimes(1);
      expect(closed.period).toBeNull();
    });

    it("keeps the same items array when nothing changed, so card marks do not re-render on every poll", () => {
      const items = [change({ id: "a", kind: "work_item.state" })];
      const loaded = { period: null, seenAt: at(25), unseen: { items, since: at(25), truncated: false } };
      const state = mergeLoadedChanges(INITIAL_BOARD_CHANGES_STATE, loaded);
      const again = mergeLoadedChanges(state, { ...loaded, unseen: { ...loaded.unseen, items: structuredClone(items) } });
      expect(again.unseen?.items).toBe(state.unseen?.items);
      expect(again.status).toBe("ready");
    });

    it("shows «loading» only before the first answer and forgets the feed when it is unavailable", () => {
      expect(beginChangesLoad(INITIAL_BOARD_CHANGES_STATE).status).toBe("loading");
      const ready = mergeLoadedChanges(INITIAL_BOARD_CHANGES_STATE, {
        period: null,
        seenAt: null,
        unseen: { items: [], since: at(19), truncated: false },
      });
      expect(beginChangesLoad(ready)).toBe(ready);
      expect(failChangesLoad(ready, new PpmCanvasServiceError("down", { status: 500 }))).toMatchObject({
        status: "error",
        unseen: ready.unseen,
      });
      const unavailable = failChangesLoad(ready, new PpmCanvasServiceError("gone", { status: 404 }));
      expect(unavailable).toEqual({ ...INITIAL_BOARD_CHANGES_STATE, status: "unavailable" });
      expect(beginChangesLoad(unavailable)).toBe(unavailable);
    });

    it("«Отметить просмотренным» empties the unseen feed at once; a second return within 2 s does not reload", () => {
      const ready = mergeLoadedChanges(INITIAL_BOARD_CHANGES_STATE, {
        period: null,
        seenAt: at(20),
        unseen: {
          items: [change({ id: "a", kind: "work_item.state", shape_ids: ["shape:a"] })],
          since: at(20),
          truncated: true,
        },
      });
      const seen = applySeen(ready, at(26));
      expect(seen.unseen).toEqual({ items: [], since: at(26), truncated: false });
      expect(seen.seenAt).toBe(at(26));
      expect(buildBoardChangeIndex(seen.unseen?.items ?? []).byShapeId.size).toBe(0);
      expect(shouldRefreshOnReturn(NOW - 1_000, NOW)).toBe(false);
      expect(shouldRefreshOnReturn(NOW - 2_000, NOW)).toBe(true);
    });
  });

  describe("grouping the feed", () => {
    it("shows the newest value once per field, keeps every assignee change, «added» hides «changed» of the same card", () => {
      const items = [
        change({ id: "s1", kind: "work_item.state", occurred_at: at(21, 9), detail: { new: "Todo" } }),
        change({ id: "s2", kind: "work_item.state", occurred_at: at(22, 10), detail: { new: "In Progress" } }),
        change({ id: "a1", kind: "work_item.assignees", occurred_at: at(22, 11), detail: { old: "", new: "Олег С." } }),
        change({ id: "a2", kind: "work_item.assignees", occurred_at: at(22, 12), detail: { old: "Миша К.", new: "" } }),
        change({ id: "n1", kind: "board.node.added", occurred_at: at(20), entity: { type: "node", id: "node-1" } }),
        change({ id: "n2", kind: "board.node.changed", occurred_at: at(23), entity: { type: "node", id: "node-1" } }),
        change({ id: "n3", kind: "board.node.changed", occurred_at: at(24), entity: { type: "node", id: "node-2" } }),
      ];
      expect(groupBoardChanges(items).map((item) => item.id)).toEqual(["n3", "a2", "a1", "s2", "n1"]);
    });

    it("keeps every relation event: S2 already merged the two rows Plane writes for one relation", () => {
      const added = change({
        id: "r1",
        kind: "work_item.relation",
        detail: { field: "blocked_by", old: null, new: "ROBOT-12" },
      });
      const removed = change({
        id: "r2",
        kind: "work_item.relation",
        occurred_at: at(23),
        detail: { field: "blocked_by", old: "ROBOT-12", new: null },
      });
      expect(groupBoardChanges([added, removed]).map((item) => item.id)).toEqual(["r2", "r1"]);
    });
  });

  describe("marks on cards", () => {
    it("marks every card an unseen event touches; «added» wins over «changed»; tasks are also found by id", () => {
      const index = buildBoardChangeIndex([
        change({ id: "1", kind: "work_item.state", shape_ids: ["shape:task"] }),
        change({ id: "2", kind: "board.node.added", entity: { type: "node", id: "n" }, shape_ids: ["shape:note"] }),
        change({ id: "3", kind: "board.node.changed", entity: { type: "node", id: "n" }, shape_ids: ["shape:note"] }),
        change({
          id: "4",
          kind: "git.pull_request.merged",
          entity: { type: "pull_request", id: "pr", identifier: "#46" },
          shape_ids: ["shape:task"],
        }),
      ]);
      expect([...index.byShapeId]).toEqual([
        ["shape:task", "changed"],
        ["shape:note", "added"],
      ]);
      expect([...index.byWorkItemId]).toEqual([[TASK_15, "changed"]]);
    });
  });

  const ppmShape = (node: object) => ({ type: "ppm-canvas-node", props: { node: JSON.stringify(node) } });

  describe("the sprint of a map board", () => {
    it("finds the sprint frame (group with map.role = sprint) and ignores sections, other cards and broken nodes", () => {
      const group = createPpmCanvasNode({ authorId: ME, kind: "group", title: "Спринт 3" });
      const section = { ...group, map: { role: "section", module_id: null } };
      const sprint = { ...group, map: { role: "sprint", cycle_id: CYCLE } };
      const note = createPpmCanvasNode({ authorId: ME, kind: "note", title: "sprint" });
      const broken = { type: "ppm-canvas-node", props: { node: '{"sprint"' } };
      expect(findSprintCycleId([ppmShape(section), ppmShape(note), broken, undefined, ppmShape(sprint)])).toBe(CYCLE);
      expect(findSprintCycleId([ppmShape(section), { type: "geo", props: {} }])).toBeNull();
    });
  });

  describe("showing a card from the feed", () => {
    function fakeEditor(pageOf: Record<string, string>, currentPage = "page:1") {
      const calls: unknown[][] = [];
      let page = currentPage;
      const editor = {
        centerOnPoint: (point: unknown, options: unknown) => {
          calls.push(["center", point, options]);
          return editor;
        },
        getAncestorPageId: (shape: { id: string }) => pageOf[shape.id],
        getCurrentPageId: () => page,
        getSelectionPageBounds: () => ({ center: { x: 50, y: 60 } }),
        getShape: (id: string) => (pageOf[id] ? { id, props: {}, type: "geo" } : undefined),
        select: (...ids: string[]) => {
          calls.push(["select", ...ids]);
          return editor;
        },
        setCurrentPage: (next: string) => {
          page = next;
          calls.push(["page", next]);
          return editor;
        },
      };
      return { calls, editor: editor as unknown as Editor };
    }

    it("goes to the card's sheet, selects the cards there and centres the camera without zooming", () => {
      const { calls, editor } = fakeEditor({ "shape:a": "page:2", "shape:b": "page:2", "shape:c": "page:1" });
      expect(focusChangeShapes(editor, ["shape:gone", "shape:a", "shape:c", "shape:b"])).toBe(true);
      expect(calls).toEqual([
        ["page", "page:2"],
        ["select", "shape:a", "shape:b"],
        ["center", { x: 50, y: 60 }, { animation: { duration: 220 } }],
      ]);
    });

    it("does nothing when none of the cards is on the board", () => {
      const { calls, editor } = fakeEditor({});
      expect(focusChangeShapes(editor, ["shape:gone"])).toBe(false);
      expect(calls).toEqual([]);
    });

    it("lists which cards of the feed are on the board as one stable key", () => {
      const entries = [
        change({ id: "1", kind: "work_item.state", shape_ids: ["shape:b", "shape:a"] }),
        change({ id: "2", kind: "work_item.name", shape_ids: ["shape:a", "shape:x"] }),
      ];
      expect(presentShapeKey(entries, (id) => id !== "shape:x")).toBe("shape:a\nshape:b");
    });
  });

  describe("useBoardChanges: F's contract, only the active board tab talks to the server (AF2.1 R19)", () => {
    const source = readFileSync(
      new URL("../../core/components/ppm-canvas/living-map/board-changes.ts", import.meta.url),
      "utf8"
    );

    it("keeps F's signature, stays empty without the v2 grammar and never imports the context (cycle)", () => {
      expect(source).toContain("export function useBoardChanges(args: TLivingMapArgs): TBoardChangeIndex {");
      expect(source).toMatch(/enabled\s*\?\s*\{\s*\.\.\.EMPTY_BOARD_CHANGE_INDEX,/);
      expect(source).toContain(": EMPTY_BOARD_CHANGE_INDEX,");
      expect(source).not.toContain("./living-map-context");
    });

    it("loads, listens to the window and polls only under v2 in the active tab; polls every 60 s while open", () => {
      expect(PPM_CHANGES_POLL_MS).toBe(60_000);
      expect(source.match(/if \(!enabled \|\| !isActive(?: \|\| !open)?(?: \|\| !editor)?\) return;/g)).toHaveLength(4);
      expect(source).toMatch(
        /window\.setInterval\(\(\) => \{\s*if \(document\.visibilityState === "visible"\) void load\(\);\s*\}, PPM_CHANGES_POLL_MS\)/
      );
      expect(source).toContain('window.addEventListener("focus", onReturn);');
      expect(source).toContain('document.addEventListener("visibilitychange", onReturn);');
      expect(source).toContain("}, [enabled, isActive, load, periodKey]);");
    });

    it("writes only the checkpoint, only from «Отметить просмотренным», and does not depend on edit rights", () => {
      expect(source.match(/service\.markSeen\(/g)).toHaveLength(1);
      expect(source).toMatch(
        /const markSeen = useCallback\(\(\) => \{[\s\S]*?service\.markSeen\(workspaceId, projectId, boardId\)/
      );
      expect(source).not.toMatch(/\.(post|patch|delete)\(/);
      expect(source).not.toContain("canEdit");
    });
  });
  ```
  `apps/web/tests/ppm-canvas/living-map-changes-panel.test.ts`:
  ```ts
  // AF2.2 C1: тексты ленты «Что изменилось» как в K5, даты, подписи объектов доски; кнопка и панель — классы колонки F,
  // e.code, запись только по «Отметить просмотренным», фокус только после действия пользователя; строки блока C (en/ru).
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation, PPM_TRANSLATIONS, type TPpmTranslationKey } from "@ppm/brand";
  import { createPpmCanvasNode, serializePpmCanvasNode, type TPpmCanvasOwnedNodeKind } from "@ppm/canvas";
  import {
    boardNodeLabelKey,
    describeBoardChange,
    formatChangesCount,
    formatChangesSince,
    formatChangeWhen,
    type TDescribeChangeContext,
  } from "@/components/ppm-canvas/living-map/changes-format";
  import type { TPpmBoardChange } from "@/services/ppm-canvas-changes.service";

  const ME = "55555555-5555-4555-8555-555555555555";
  const DASHA = "66666666-6666-4666-8666-666666666666";
  const OLEG = "77777777-7777-4777-8777-000000000001";
  const MISHA = "77777777-7777-4777-8777-000000000002";
  const TASK_15 = "77777777-7777-4777-8777-777777777777";
  const at = (day: number, hour = 12, minute = 0) => new Date(2026, 8, day, hour, minute).toISOString();
  const NOW = new Date(2026, 8, 26, 12, 0).getTime();
  const ru = (key: TPpmTranslationKey) => getPpmTranslation("ru", key);
  const en = (key: TPpmTranslationKey) => getPpmTranslation("en", key);
  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/living-map/${name}`, import.meta.url), "utf8");
  const buttonSource = read("changes-button.tsx");
  const panelSource = read("changes-panel.tsx");
  const css = read("living-map.css")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ");

  function change(overrides: Partial<TPpmBoardChange> & Pick<TPpmBoardChange, "id" | "kind">): TPpmBoardChange {
    return {
      actor: { id: DASHA, display_name: "Даша П." },
      detail: {},
      entity: { type: "work_item", id: TASK_15, identifier: "ROBOT-15", title: "Сценарий сортировки" },
      occurred_at: at(22),
      shape_ids: [],
      ...overrides,
    };
  }

  function context(overrides: Partial<TDescribeChangeContext> = {}): TDescribeChangeContext {
    return { currentUserId: ME, locale: "ru", nodeKindKey: () => undefined, now: NOW, t: ru, ...overrides };
  }

  describe("dates in the feed", () => {
    it("says «когда» in the words of the mockup", () => {
      expect(formatChangeWhen(new Date(NOW - 30_000).toISOString(), "ru", ru, NOW)).toBe("только что");
      expect(formatChangeWhen(new Date(NOW - 5 * 60_000).toISOString(), "ru", ru, NOW)).toBe("5 мин. назад");
      expect(formatChangeWhen(at(26, 9, 5), "ru", ru, NOW)).toBe("сегодня, 09:05");
      expect(formatChangeWhen(at(25, 18, 40), "ru", ru, NOW)).toBe("вчера, 18:40");
      expect(formatChangeWhen(at(22), "ru", ru, NOW)).toBe("22 сент.");
      expect(formatChangeWhen(new Date(2025, 11, 30).toISOString(), "ru", ru, NOW)).toBe("30 дек. 2025 г.");
      expect(formatChangeWhen(at(26, 9, 5), "en-US", en, NOW)).toBe("today, 09:05");
      expect(formatChangeWhen("not a date", "ru", ru, NOW)).toBe("—");
    });

    it("names the start of the period: a time today, a date otherwise; «200+» when the feed was cut", () => {
      expect(formatChangesSince(at(26, 11, 41), "ru", NOW)).toBe("11:41");
      expect(formatChangesSince(at(18), "ru", NOW)).toBe("18 сент.");
      expect(formatChangesSince(at(18), "en", NOW)).toBe("Sep 18");
      expect(formatChangesCount(6, false)).toBe("6");
      expect(formatChangesCount(200, true)).toBe("200+");
    });
  });

  describe("texts of the feed (K5)", () => {
    it("writes the K5 lines", () => {
      const state = change({
        id: "1",
        kind: "work_item.state",
        actor: { id: OLEG, display_name: "Олег С." },
        entity: { type: "work_item", id: "t16", identifier: "ROBOT-16" },
        detail: { field: "state", old: "Todo", new: "In Progress" },
      });
      expect(describeBoardChange(state, context())).toEqual({
        detail: "Олег С. · 22 сент.",
        icon: "state",
        text: "ROBOT-16 → В работе",
      });
      const relation = change({
        id: "2",
        kind: "work_item.relation",
        detail: { field: "blocked_by", old: null, new: "ROBOT-12" },
      });
      expect(describeBoardChange(relation, context())).toEqual({
        detail: "новая связь в Задачах · Даша П. · 22 сент.",
        icon: "relation",
        text: "ROBOT-12 блокирует ROBOT-15",
      });
      const version = change({
        id: "3",
        kind: "vault.version",
        occurred_at: at(20),
        actor: { id: MISHA, display_name: "Миша К." },
        entity: { type: "vault_file", id: "f", title: "Схема захвата.pdf" },
        detail: { field: "version", old: "2", new: "3" },
      });
      expect(describeBoardChange(version, context())).toEqual({
        detail: "новая версия · Миша К. · 20 сент.",
        icon: "file",
        text: "Схема захвата.pdf → v3",
      });
      const merged = change({
        id: "4",
        kind: "git.pull_request.merged",
        actor: null,
        occurred_at: at(19),
        entity: { type: "pull_request", id: "pr", identifier: "#46" },
        detail: { field: "work_items", new: "ROBOT-11" },
      });
      expect(describeBoardChange(merged, context())).toEqual({
        detail: "19 сент.",
        icon: "pr_merged",
        text: "PR #46 влит · ROBOT-11",
      });
    });

    it("names the other task changes in plain Russian", () => {
      const text = (kind: TPpmBoardChange["kind"], detail: TPpmBoardChange["detail"]) =>
        describeBoardChange(change({ id: "x", kind, detail }), context()).text;
      expect(text("work_item.assignees", { old: null, new: "Олег С." })).toBe("ROBOT-15: новый исполнитель — Олег С.");
      expect(text("work_item.assignees", { old: "Миша К.", new: null })).toBe("ROBOT-15: снят исполнитель — Миша К.");
      expect(text("work_item.due", { field: "due_date", new: "2026-09-29" })).toBe("ROBOT-15: срок → 29 сент.");
      expect(text("work_item.due", { field: "due_date", old: "2026-09-29", new: null })).toBe("ROBOT-15: срок снят");
      expect(text("work_item.priority", { new: "urgent" })).toBe("ROBOT-15: приоритет → Срочный");
      expect(text("work_item.name", { new: "Сценарий сортировки по цвету" })).toBe(
        "ROBOT-15: название → «Сценарий сортировки по цвету»"
      );
      expect(text("work_item.relation", { field: "relates_to", new: "ROBOT-7" })).toBe("ROBOT-15 связана с ROBOT-7");
      expect(text("work_item.relation", { field: "start_before", new: "ROBOT-7" })).toBe(
        "Зависимость: ROBOT-15 → ROBOT-7"
      );
      expect(text("work_item.relation", { field: "constructor", new: "ROBOT-7" })).toBe("Связь: ROBOT-15 — ROBOT-7");
      expect(text("work_item.state", { new: "Ревью у заказчика" })).toBe("ROBOT-15 → Ревью у заказчика");
      const pullRequest = change({
        id: "pr",
        kind: "git.pull_request.opened",
        entity: { type: "pull_request", id: "p" },
      });
      expect(describeBoardChange(pullRequest, context()).text).toBe("PR — открыт");
    });

    it("says «связь со скрытой задачей» when S2 hides the other task (old and new are null)", () => {
      const hidden = change({
        id: "h",
        kind: "work_item.relation",
        detail: { field: "relates_to", old: null, new: null },
      });
      expect(describeBoardChange(hidden, context())).toEqual({
        detail: "связь изменена в Задачах · Даша П. · 22 сент.",
        icon: "relation",
        text: "ROBOT-15: связь со скрытой задачей",
      });
    });

    it("says who: «Вы» for me, «на доске» for board objects without an author, nothing for system changes", () => {
      const mine = change({
        id: "m",
        kind: "work_item.state",
        actor: { id: ME, display_name: "Анна Л." },
        detail: { new: "Done" },
      });
      expect(describeBoardChange(mine, context()).detail).toBe("Вы · 22 сент.");
      const sticker = change({
        id: "s",
        kind: "board.node.added",
        actor: null,
        occurred_at: at(26, 9, 5),
        entity: { type: "node", id: "shape:s" },
        shape_ids: ["shape:s"],
        detail: { field: "shape_type", new: "note" },
      });
      expect(describeBoardChange(sticker, context({ nodeKindKey: () => "canvas.rail.sticky" }))).toEqual({
        detail: "добавлено · на доске · сегодня, 09:05",
        icon: "added",
        text: "Стикер",
      });
      const note = change({
        id: "n",
        kind: "board.node.changed",
        actor: null,
        entity: { type: "node", id: "shape:n", title: "Калибровка" },
        detail: { field: "kind", new: "note" },
      });
      expect(describeBoardChange(note, context({ nodeKindKey: () => "canvas.kind_note" }))).toEqual({
        detail: "изменено · на доске · 22 сент.",
        icon: "changed",
        text: "Заметка «Калибровка»",
      });
      const system = change({ id: "sys", kind: "work_item.state", actor: null, detail: { new: "Done" } });
      expect(describeBoardChange(system, context()).detail).toBe("22 сент.");
    });

    it("names a board object by its shape, or by the event when the shape has left the board", () => {
      const node = (kind: TPpmCanvasOwnedNodeKind) => ({
        type: "ppm-canvas-node",
        props: { node: serializePpmCanvasNode(createPpmCanvasNode({ authorId: ME, kind, title: "x" })) },
      });
      expect(boardNodeLabelKey(node("note"))).toBe("canvas.kind_note");
      expect(boardNodeLabelKey(node("group"))).toBe("canvas.kind_section");
      expect(boardNodeLabelKey({ type: "note", props: {} })).toBe("canvas.rail.sticky");
      expect(boardNodeLabelKey({ type: "geo", props: { geo: "ellipse" } })).toBe("canvas.shape.ellipse");
      expect(boardNodeLabelKey({ type: "ppm-canvas-node", props: { node: "{" } })).toBe("canvas.rail.object");
      const gone = (detail: TPpmBoardChange["detail"]) =>
        describeBoardChange(
          change({ id: "g", kind: "board.node.added", entity: { type: "node", id: "shape:g" }, detail }),
          context()
        ).text;
      expect(gone({ field: "kind", new: "note" })).toBe("Заметка");
      expect(gone({ field: "kind", new: "work_item_ref" })).toBe("Задача");
      expect(gone({ field: "shape_type", new: "text" })).toBe("Текст");
      expect(gone({ field: "shape_type", new: "geo" })).toBe("Объект");
    });
  });

  describe("button and panel (K5)", () => {
    it("closes by Escape through e.code and writes the checkpoint only from its button", () => {
      expect(panelSource).toContain('if (event.code !== "Escape") return;');
      expect(panelSource).not.toMatch(/event\.key\b/);
      expect(panelSource).toMatch(/className="ppm-changes-panel__seen"[^>]*onClick=\{panel\.markSeen\}/);
      expect(panelSource).toContain("onClick={() => focusChangeShapes(editor, entry.shape_ids)}");
      expect(panelSource).not.toContain("canEdit");
      expect(buttonSource).not.toContain("canEdit");
    });

    it("wears the column's pill and panel (F) and is memoized: CanvasControls re-renders on every drag frame", () => {
      expect(buttonSource).toContain("export const PpmChangesButton = memo(function PpmChangesButton() {");
      expect(panelSource).toContain("export const PpmChangesPanel = memo(function PpmChangesPanel() {");
      expect(buttonSource).toContain('className="ppm-living-map-pill ppm-changes-button"');
      expect(panelSource).toContain('className="ppm-living-map-panel ppm-changes-panel"');
    });

    it("hides the inspector while the panel is open (one right panel) and scrolls a long feed inside the panel", () => {
      expect(css).toContain(
        ':where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .tl-container:has(.ppm-changes-panel) ~ .ppm-canvas-inspector { display: none; }'
      );
      expect(css).toMatch(/\.ppm-changes-panel__list \{[^}]*max-height: 18rem;[^}]*overflow-y: auto;/);
    });

    it("hides the button while the panel is open or the feed is unavailable; focus moves only after a click", () => {
      expect(buttonSource).toContain(
        'const visible = Boolean(grammarV2 && panel && !panel.open && panel.status !== "unavailable");'
      );
      expect(buttonSource).toContain('if (visible && panel?.consumeFocus("button")) buttonRef.current?.focus();');
      expect(panelSource).toContain('if (open && panel?.consumeFocus("panel")) closeRef.current?.focus();');
    });
  });

  describe("strings of block C (af22-living-map.ts)", () => {
    const keys = (locale: "en" | "ru") =>
      new Set(Object.keys(PPM_TRANSLATIONS[locale]).filter((key) => key.startsWith("canvas.changes.")));

    it("keeps en and ru in parity", () => {
      expect(keys("ru")).toEqual(keys("en"));
      expect(keys("ru").size).toBe(51);
    });

    it("uses the K5 wording", () => {
      expect(ru("canvas.changes.mark_seen")).toBe("Отметить просмотренным");
      expect(ru("canvas.changes.chip_changed")).toBe("изменено");
      expect(ru("canvas.changes.chip_added")).toBe("добавлено");
      expect(ru("canvas.changes.mode_sprint")).toBe("с начала спринта");
    });
  });
  ```

- [ ] **Step 3: Запустить — падают**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/living-map-changes.test.ts tests/ppm-canvas/living-map-changes-panel.test.ts`
  → `Test Files 2 failed`: модулей `@/services/ppm-canvas-changes.service`, `…/living-map/changes-model`,
  `…/living-map/changes-format` ещё нет (`Failed to load url … Does the file exist?`).

- [ ] **Step 4: Сервис S2/S3** — `apps/web/core/services/ppm-canvas-changes.service.ts` (новый):
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { isAxiosError } from "axios";
  import { z } from "zod";
  import { API_BASE_URL } from "@plane/constants";
  import { ppmCanvasErrorResponseSchema } from "@ppm/canvas";
  import { APIService } from "@/services/api.service";
  import { PpmCanvasServiceError } from "@/services/ppm-canvas.service";

  // AF2.2 C · «Что изменилось» и «На карте» (сервер S, CONTRACTS §5): S2 — лента изменений доски, S3 — личная отметка
  // просмотра, S4 — доски, где лежит задача. Ленту разбираем по пунктам: пункт неизвестного вида или с битыми полями
  // отбрасывается, остальные показываются — новый вид события на сервере не ломает панель.

  export const PPM_BOARD_CHANGE_KINDS = [
    "work_item.state",
    "work_item.assignees",
    "work_item.due",
    "work_item.priority",
    "work_item.name",
    "work_item.relation",
    "git.pull_request.opened",
    "git.pull_request.merged",
    "vault.version",
    "board.node.added",
    "board.node.changed",
  ] as const;
  export type TPpmBoardChangeKind = (typeof PPM_BOARD_CHANGE_KINDS)[number];

  /** Не больше 200 событий за запрос (S2). */
  export const PPM_BOARD_CHANGES_LIMIT = 200;

  const isoDateTime = z.string().datetime({ offset: true });

  export const ppmBoardChangeSchema = z.object({
    id: z.string().min(1),
    kind: z.enum(PPM_BOARD_CHANGE_KINDS),
    occurred_at: isoDateTime,
    actor: z.object({ id: z.string().min(1), display_name: z.string() }).nullable(),
    entity: z.object({
      type: z.string().min(1),
      id: z.string().min(1),
      identifier: z.string().nullish(),
      title: z.string().nullish(),
    }),
    shape_ids: z.array(z.string().min(1)).default([]),
    detail: z
      .object({ field: z.string().nullish(), old: z.unknown().optional(), new: z.unknown().optional() })
      .default({}),
  });
  export type TPpmBoardChange = z.infer<typeof ppmBoardChangeSchema>;

  const ppmBoardChangesEnvelopeSchema = z.object({
    since: isoDateTime,
    until: isoDateTime,
    items: z.array(z.unknown()),
    truncated: z.boolean(),
  });
  export type TPpmBoardChangesResponse = {
    items: TPpmBoardChange[];
    since: string;
    truncated: boolean;
    until: string;
  };

  export const ppmBoardSeenSchema = z.object({
    seen_at: isoDateTime.nullable().default(null),
    seen_version: z.number().int().nonnegative().nullable().default(null),
  });
  export type TPpmBoardSeen = z.infer<typeof ppmBoardSeenSchema>;

  export class PpmCanvasChangesService extends APIService {
    constructor() {
      super(API_BASE_URL);
    }

    async getChanges(
      workspaceId: string,
      projectId: string,
      boardId: string,
      since: string,
      limit = PPM_BOARD_CHANGES_LIMIT
    ): Promise<TPpmBoardChangesResponse> {
      try {
        const response = await this.get(`${this.boardPath(workspaceId, projectId, boardId)}changes/`, {
          params: { since, limit: Math.min(Math.max(Math.trunc(limit), 1), PPM_BOARD_CHANGES_LIMIT) },
        });
        const envelope = ppmBoardChangesEnvelopeSchema.parse(response.data);
        const items = envelope.items.flatMap((item) => {
          const parsed = ppmBoardChangeSchema.safeParse(item);
          return parsed.success ? [parsed.data] : [];
        });
        return { items, since: envelope.since, truncated: envelope.truncated, until: envelope.until };
      } catch (error) {
        throw normalizeChangesError(error);
      }
    }

    async getSeen(workspaceId: string, projectId: string, boardId: string): Promise<TPpmBoardSeen> {
      try {
        const response = await this.get(`${this.boardPath(workspaceId, projectId, boardId)}me/`);
        // «Ещё не смотрел» — `{ seen_at: null, … }` или пустой ответ.
        return ppmBoardSeenSchema.parse(response.data || {});
      } catch (error) {
        throw normalizeChangesError(error);
      }
    }

    /** Единственная запись линии C — только по нажатию «Отметить просмотренным». */
    async markSeen(workspaceId: string, projectId: string, boardId: string): Promise<TPpmBoardSeen> {
      try {
        const response = await this.put(`${this.boardPath(workspaceId, projectId, boardId)}me/seen/`, {});
        return ppmBoardSeenSchema.parse(response.data || {});
      } catch (error) {
        throw normalizeChangesError(error);
      }
    }

    private boardPath(workspaceId: string, projectId: string, boardId: string) {
      return `${this.projectPath(workspaceId, projectId)}/canvas/boards/${boardId}/`;
    }

    private projectPath(workspaceId: string, projectId: string) {
      return `/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}`;
    }
  }

  function normalizeChangesError(error: unknown): PpmCanvasServiceError {
    if (error instanceof PpmCanvasServiceError) return error;
    if (isAxiosError(error)) {
      const parsed = ppmCanvasErrorResponseSchema.safeParse(error.response?.data);
      if (parsed.success)
        return new PpmCanvasServiceError(parsed.data.error.message, {
          code: parsed.data.error.code,
          details: parsed.data.error.details,
          requestId: parsed.data.error.request_id,
          status: error.response?.status,
        });
      return new PpmCanvasServiceError("Canvas changes request failed.", { status: error.response?.status });
    }
    return new PpmCanvasServiceError(error instanceof Error ? error.message : "Canvas changes request failed.");
  }
  ```
  (`this.get(url, { params })` — второй аргумент `APIService.get` сливается в конфиг axios, как в
  `PpmCanvasService.getBoards`; axios экранирует `+00:00` отметки S3 — `since` уходит как есть, с микросекундами.)

- [ ] **Step 5: Строки блока C** — `packages/ppm-brand/src/translations/af22-living-map.ts`, в **обеих** локалях (ключи —
  строго между маркерами C и T; маркеры C и T стоят рядом, пока линия C их не наполнила). Было (en):
  ```ts
      // ── C: «Что изменилось» ──
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
    ru: {
  ```
  стало (en):
  ```ts
      // ── C: «Что изменилось» ──
      "canvas.changes.button": "What changed",
      "canvas.changes.button_count": "What changed · {count}",
      "canvas.changes.title": "What changed since {date}",
      "canvas.changes.period": "Period",
      "canvas.changes.mode_last_seen": "since my last view",
      "canvas.changes.mode_sprint": "since the sprint started",
      "canvas.changes.mode_date": "since a date…",
      "canvas.changes.date": "Date",
      "canvas.changes.loading": "Loading changes…",
      "canvas.changes.error": "Could not load the changes.",
      "canvas.changes.retry": "Try again",
      "canvas.changes.empty": "Nothing changed in this period.",
      "canvas.changes.truncated": "Not all events are shown: at most 200, from the last 30 days.",
      "canvas.changes.mark_seen": "Mark as viewed",
      "canvas.changes.mark_seen_busy": "Marking…",
      "canvas.changes.mark_seen_error": "Could not mark as viewed. Try again.",
      "canvas.changes.show_on_board": "Show on the board",
      "canvas.changes.not_on_board": "This card is not on the board",
      "canvas.changes.actor_you": "You",
      "canvas.changes.actor_board": "on the board",
      "canvas.changes.just_now": "just now",
      "canvas.changes.today_at": "today, {time}",
      "canvas.changes.yesterday_at": "yesterday, {time}",
      "canvas.changes.chip_changed": "changed",
      "canvas.changes.chip_added": "added",
      "canvas.changes.state": "{item} → {value}",
      "canvas.changes.state_unknown": "{item}: status changed",
      "canvas.changes.assignee_added": "{item}: new assignee — {value}",
      "canvas.changes.assignee_removed": "{item}: assignee removed — {value}",
      "canvas.changes.due_set": "{item}: due → {value}",
      "canvas.changes.due_removed": "{item}: due date removed",
      "canvas.changes.priority": "{item}: priority → {value}",
      "canvas.changes.name": "{item}: title → “{value}”",
      "canvas.changes.relation_blocking": "{item} blocks {other}",
      "canvas.changes.relation_blocked_by": "{other} blocks {item}",
      "canvas.changes.relation_relates_to": "{item} relates to {other}",
      "canvas.changes.relation_duplicate": "{item} duplicates {other}",
      "canvas.changes.relation_implements": "{item} implements {other}",
      "canvas.changes.relation_implemented_by": "{other} implements {item}",
      "canvas.changes.relation_dependency": "Dependency: {item} → {other}",
      "canvas.changes.relation_other": "Relation: {item} — {other}",
      "canvas.changes.relation_hidden": "{item}: relation with a hidden task",
      "canvas.changes.relation_added": "new relation in Tasks",
      "canvas.changes.relation_removed": "relation removed in Tasks",
      "canvas.changes.relation_changed": "relation changed in Tasks",
      "canvas.changes.pr_opened": "PR {pr} opened",
      "canvas.changes.pr_merged": "PR {pr} merged",
      "canvas.changes.version": "{file} → v{value}",
      "canvas.changes.version_unknown": "{file}: new version",
      "canvas.changes.version_new": "new version",
      "canvas.changes.node_titled": "{kind} “{title}”",
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
    ru: {
  ```
  Было (ru):
  ```ts
      // ── C: «Что изменилось» ──
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
  } as const;
  ```
  стало (ru):
  ```ts
      // ── C: «Что изменилось» ──
      "canvas.changes.button": "Что изменилось",
      "canvas.changes.button_count": "Что изменилось · {count}",
      "canvas.changes.title": "Что изменилось с {date}",
      "canvas.changes.period": "Период",
      "canvas.changes.mode_last_seen": "с последнего просмотра",
      "canvas.changes.mode_sprint": "с начала спринта",
      "canvas.changes.mode_date": "с даты…",
      "canvas.changes.date": "Дата",
      "canvas.changes.loading": "Загружаем изменения…",
      "canvas.changes.error": "Не удалось загрузить изменения.",
      "canvas.changes.retry": "Повторить",
      "canvas.changes.empty": "За этот период ничего не изменилось.",
      "canvas.changes.truncated": "Показаны не все события: не больше 200 и не старше 30 дней.",
      "canvas.changes.mark_seen": "Отметить просмотренным",
      "canvas.changes.mark_seen_busy": "Отмечаем…",
      "canvas.changes.mark_seen_error": "Не удалось отметить. Попробуйте ещё раз.",
      "canvas.changes.show_on_board": "Показать на доске",
      "canvas.changes.not_on_board": "Этой карточки нет на доске",
      "canvas.changes.actor_you": "Вы",
      "canvas.changes.actor_board": "на доске",
      "canvas.changes.just_now": "только что",
      "canvas.changes.today_at": "сегодня, {time}",
      "canvas.changes.yesterday_at": "вчера, {time}",
      "canvas.changes.chip_changed": "изменено",
      "canvas.changes.chip_added": "добавлено",
      "canvas.changes.state": "{item} → {value}",
      "canvas.changes.state_unknown": "{item}: статус изменён",
      "canvas.changes.assignee_added": "{item}: новый исполнитель — {value}",
      "canvas.changes.assignee_removed": "{item}: снят исполнитель — {value}",
      "canvas.changes.due_set": "{item}: срок → {value}",
      "canvas.changes.due_removed": "{item}: срок снят",
      "canvas.changes.priority": "{item}: приоритет → {value}",
      "canvas.changes.name": "{item}: название → «{value}»",
      "canvas.changes.relation_blocking": "{item} блокирует {other}",
      "canvas.changes.relation_blocked_by": "{other} блокирует {item}",
      "canvas.changes.relation_relates_to": "{item} связана с {other}",
      "canvas.changes.relation_duplicate": "{item} дублирует {other}",
      "canvas.changes.relation_implements": "{item} реализует {other}",
      "canvas.changes.relation_implemented_by": "{other} реализует {item}",
      "canvas.changes.relation_dependency": "Зависимость: {item} → {other}",
      "canvas.changes.relation_other": "Связь: {item} — {other}",
      "canvas.changes.relation_hidden": "{item}: связь со скрытой задачей",
      "canvas.changes.relation_added": "новая связь в Задачах",
      "canvas.changes.relation_removed": "связь удалена в Задачах",
      "canvas.changes.relation_changed": "связь изменена в Задачах",
      "canvas.changes.pr_opened": "PR {pr} открыт",
      "canvas.changes.pr_merged": "PR {pr} влит",
      "canvas.changes.version": "{file} → v{value}",
      "canvas.changes.version_unknown": "{file}: новая версия",
      "canvas.changes.version_new": "новая версия",
      "canvas.changes.node_titled": "{kind} «{title}»",
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
  } as const;
  ```
  Затем: `$T/af22-pkg-build.sh ppm-brand` и
  `cd $PF/packages/ppm-brand && ../../node_modules/.bin/oxfmt src/translations/af22-living-map.ts`.

- [ ] **Step 6: Типы F — необязательные поля C** — `living-map/living-map-types.ts`. Было:
  ```ts
  import type { TPpmCanvasBinding, TPpmCanvasBoard, TPpmCanvasMapRole } from "@ppm/canvas";
  import type { Editor } from "tldraw";
  ```
  стало:
  ```ts
  import type { TPpmCanvasBinding, TPpmCanvasBoard, TPpmCanvasMapRole } from "@ppm/canvas";
  import type { Editor } from "tldraw";
  // ── AF2.2 C: тип панели «Что изменилось» (changes-model.ts линии C) ──
  import type { TBoardChangesPanel } from "./changes-model";
  // ── /AF2.2 C ──
  ```
  В `TBoardChangeIndex` было:
  ```ts
    byShapeId: ReadonlyMap<string, TBoardChangeMark>;
    // ── AF2.2 C: необязательные поля линии C ──
    // ── /AF2.2 C ──
  };
  ```
  стало:
  ```ts
    byShapeId: ReadonlyMap<string, TBoardChangeMark>;
    // ── AF2.2 C: необязательные поля линии C ──
    /** Tasks with unseen events by Plane work item id: a card put on the board after the feed loaded is marked too. */
    byWorkItemId?: ReadonlyMap<string, TBoardChangeMark>;
    /** The «Что изменилось» panel — period, feed, status, actions (kept in useBoardChanges, outside CanvasControls). */
    panel?: TBoardChangesPanel;
    // ── /AF2.2 C ──
  };
  ```
  (Импорт только типов: цикла времени выполнения нет; гард F считает блоки `AF2.2 C` — 3 открытых, 3 закрытых.)

- [ ] **Step 7: Модель** — `living-map/changes-model.ts` (новый):
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // AF2.2 C1/C2 · «Что изменилось»: чистая модель без React и DOM (node-env vitest). Период ленты («с последнего
  // просмотра» · «с начала спринта» · «с даты…»), правило по умолчанию (R5), загрузка двух лент (непросмотренное — для
  // меток и счётчика, выбранный период — для панели), свёртка, индекс меток, переход к карточке.
  import { getPpmCanvasMap, parseSerializedPpmCanvasNode } from "@ppm/canvas";
  import type { Editor, TLShape, TLShapeId } from "tldraw";
  import type { TPpmBoardChange, TPpmBoardChangesResponse, TPpmBoardSeen } from "@/services/ppm-canvas-changes.service";
  import type { TPpmCanvasShape } from "../shape";
  import type { TBoardChangeMark } from "./living-map-types";

  const DAY_MS = 86_400_000;
  const PPM_NODE_TYPE = "ppm-canvas-node" satisfies TPpmCanvasShape["type"];
  /** R8: пока панель открыта — раз в 60 с. */
  export const PPM_CHANGES_POLL_MS = 60_000;
  /** R5: без отметки — с создания доски, но не раньше 7 дней назад. */
  export const PPM_CHANGES_DEFAULT_DAYS = 7;
  /** S2 отдаёт не больше 30 дней: поле «с даты…» раньше не предлагает. */
  export const PPM_CHANGES_MAX_DAYS = 30;
  /** focus и visibilitychange при возврате в окно приходят парой — один запрос. */
  export const PPM_CHANGES_RETURN_GAP_MS = 2_000;

  export type TChangesMode = "last_seen" | "sprint" | "date";
  export type TBoardChangesStatus = "idle" | "loading" | "ready" | "error" | "unavailable";
  export type TChangesFeed = { items: readonly TPpmBoardChange[]; since: string; truncated: boolean };
  export type TChangesPeriodFeed = TChangesFeed & { key: string };

  export type TBoardChangesState = {
    status: TBoardChangesStatus;
    seenAt: string | null;
    /** С личной отметки: метки на карточках и число на кнопке. */
    unseen: TChangesFeed | null;
    /** Период панели, если он не «с последнего просмотра» (key — какой именно). */
    period: TChangesPeriodFeed | null;
  };

  export const INITIAL_BOARD_CHANGES_STATE: TBoardChangesState = {
    period: null,
    seenAt: null,
    status: "idle",
    unseen: null,
  };

  /** Состояние панели в контексте живой карты (поле `changes.panel`, наполняет useBoardChanges). */
  export type TBoardChangesPanel = {
    /** Фокус переходит в панель или на кнопку один раз — после действия пользователя, не при перемонтировании. */
    consumeFocus: (target: "panel" | "button") => boolean;
    currentUserId: string;
    customDate: string;
    entries: readonly TPpmBoardChange[];
    markError: boolean;
    markSeen: () => void;
    marking: boolean;
    mode: TChangesMode;
    open: boolean;
    retry: () => void;
    setCustomDate: (value: string) => void;
    setMode: (mode: TChangesMode) => void;
    setOpen: (open: boolean) => void;
    since: string | null;
    sprintAvailable: boolean;
    status: TBoardChangesStatus;
    truncated: boolean;
    unseenTruncated: boolean;
  };

  // ─────────────── Период ───────────────

  /** R5: с личной отметки; без неё — с создания доски, но не раньше 7 дней назад. */
  export function defaultChangesSince(seenAt: string | null, boardCreatedAt: string | null, now: number): string {
    if (seenAt && Number.isFinite(Date.parse(seenAt))) return seenAt;
    const floor = now - PPM_CHANGES_DEFAULT_DAYS * DAY_MS;
    const created = boardCreatedAt ? Date.parse(boardCreatedAt) : Number.NaN;
    return new Date(Number.isFinite(created) ? Math.max(created, floor) : floor).toISOString();
  }

  /** Календарная дата «YYYY-MM-DD…» (начало спринта, поле «с даты…») → местная полночь в ISO; иначе null. */
  export function localDayStartIso(date: string | null | undefined): string | null {
    const match = date ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null;
    if (!match) return null;
    const [year, month, day] = [Number(match[1]), Number(match[2]) - 1, Number(match[3])];
    const value = new Date(year, month, day);
    return value.getMonth() === month && value.getDate() === day ? value.toISOString() : null;
  }

  /** Значение `<input type="date">` для местной даты момента. */
  export function localDateValue(value: string | number): string {
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${String(date.getDate()).padStart(2, "0")}`;
  }

  /** Границы поля «с даты…»: не раньше 30 дней (S2) и не позже сегодня. */
  export function changesDateBounds(now: number): { max: string; min: string } {
    return { max: localDateValue(now), min: localDateValue(now - PPM_CHANGES_MAX_DAYS * DAY_MS) };
  }

  export function changesPeriodKey(mode: TChangesMode, customDate: string, sprintStart: string | null): string {
    if (mode === "sprint") return `sprint:${sprintStart ?? ""}`;
    return mode === "date" ? `date:${customDate}` : "last_seen";
  }

  export function changesSinceForMode(input: {
    boardCreatedAt: string | null;
    customDate: string;
    mode: TChangesMode;
    now: number;
    seenAt: string | null;
    sprintStart: string | null;
  }): string {
    const chosen =
      input.mode === "sprint"
        ? localDayStartIso(input.sprintStart)
        : input.mode === "date"
          ? localDayStartIso(input.customDate)
          : null;
    return chosen ?? defaultChangesSince(input.seenAt, input.boardCreatedAt, input.now);
  }

  // ─────────────── Загрузка ───────────────

  export type TBoardChangesApi = {
    getChanges: (since: string) => Promise<TPpmBoardChangesResponse>;
    getSeen: () => Promise<TPpmBoardSeen>;
  };

  export type TBoardChangesLoadInput = {
    boardCreatedAt: string | null;
    customDate: string;
    mode: TChangesMode;
    now: number;
    panelOpen: boolean;
    sprintStart: string | null;
  };

  export type TBoardChangesLoad = { period: TChangesPeriodFeed | null; seenAt: string | null; unseen: TChangesFeed };

  /** Отметка (S3) → лента непросмотренного (S2); если открытая панель показывает другой период — вторая лента. */
  export async function loadBoardChanges(
    api: TBoardChangesApi,
    input: TBoardChangesLoadInput
  ): Promise<TBoardChangesLoad> {
    const { seen_at: seenAt } = await api.getSeen();
    const unseenSince = defaultChangesSince(seenAt, input.boardCreatedAt, input.now);
    const periodSince = input.panelOpen && input.mode !== "last_seen" ? changesSinceForMode({ ...input, seenAt }) : null;
    const [unseen, period] = await Promise.all([
      api.getChanges(unseenSince),
      periodSince !== null && periodSince !== unseenSince ? api.getChanges(periodSince) : Promise.resolve(null),
    ]);
    const unseenFeed = toFeed(unseen);
    const key = changesPeriodKey(input.mode, input.customDate, input.sprintStart);
    return {
      period: periodSince === null ? null : { ...(period ? toFeed(period) : unseenFeed), key },
      seenAt,
      unseen: unseenFeed,
    };
  }

  function toFeed(response: TPpmBoardChangesResponse): TChangesFeed {
    return { items: response.items, since: response.since, truncated: response.truncated };
  }

  export function sameChangeItems(a: readonly TPpmBoardChange[], b: readonly TPpmBoardChange[]): boolean {
    return (
      a.length === b.length &&
      a.every((item, index) => item.id === b[index].id && item.occurred_at === b[index].occurred_at)
    );
  }

  /** «Загружаем…» — только до первого ответа; «недоступно» не мигает при повторных попытках. */
  export function beginChangesLoad(current: TBoardChangesState): TBoardChangesState {
    return current.unseen || current.status === "unavailable" ? current : { ...current, status: "loading" };
  }

  /** Тот же массив событий, если ничего не изменилось: метки на карточках не перерисовываются от опроса. */
  export function mergeLoadedChanges(current: TBoardChangesState, loaded: TBoardChangesLoad): TBoardChangesState {
    const unseen =
      current.unseen && sameChangeItems(current.unseen.items, loaded.unseen.items)
        ? { ...loaded.unseen, items: current.unseen.items }
        : loaded.unseen;
    return { period: loaded.period, seenAt: loaded.seenAt, status: "ready", unseen };
  }

  /** 403/404 — ленты нет (сервер без S2/S3 или нет доступа): кнопка и метки скрыты; прочее — «повторить». */
  export function changesLoadStatus(error: unknown): "error" | "unavailable" {
    const status = typeof error === "object" && error !== null ? (error as { status?: unknown }).status : undefined;
    return status === 403 || status === 404 ? "unavailable" : "error";
  }

  export function failChangesLoad(current: TBoardChangesState, error: unknown): TBoardChangesState {
    const status = changesLoadStatus(error);
    return status === "unavailable" ? { ...INITIAL_BOARD_CHANGES_STATE, status } : { ...current, status };
  }

  /** «Отметить просмотренным» — непросмотренного больше нет: метки исчезают сразу, до новой загрузки. */
  export function applySeen(current: TBoardChangesState, seenAt: string | null): TBoardChangesState {
    return { ...current, seenAt, unseen: { items: [], since: seenAt ?? current.unseen?.since ?? "", truncated: false } };
  }

  export function shouldRefreshOnReturn(lastLoadAt: number, now: number): boolean {
    return now - lastLoadAt >= PPM_CHANGES_RETURN_GAP_MS;
  }

  // ─────────────── Свёртка и метки ───────────────

  // Поле, у которого важно последнее значение: показываем одно — самое новое.
  const LATEST_ONLY_KINDS: ReadonlySet<string> = new Set([
    "work_item.state",
    "work_item.due",
    "work_item.priority",
    "work_item.name",
    "vault.version",
    "board.node.changed",
  ]);

  /** Значение old/new из S2: строка (обрезанная) или число; пустое и прочее — null. */
  export function changeText(value: unknown): string | null {
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  /**
   * Новые первыми; у полей «последнего значения» (статус, срок, приоритет, название, версия файла, правка карточки) —
   * одна строка, самая новая; «добавлено» поглощает «изменено» той же карточки. Связь S2 уже склеил из двух строк Plane.
   */
  export function groupBoardChanges(items: readonly TPpmBoardChange[]): TPpmBoardChange[] {
    const addedNodes = new Set(items.filter((item) => item.kind === "board.node.added").map((item) => item.entity.id));
    // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh copy (lib ES2022: no toSorted).
    const newestFirst = [...items].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
    const taken = new Set<string>();
    const entries: TPpmBoardChange[] = [];
    for (const item of newestFirst) {
      if (item.kind === "board.node.changed" && addedNodes.has(item.entity.id)) continue;
      if (LATEST_ONLY_KINDS.has(item.kind)) {
        const key = `${item.kind}:${item.entity.type}:${item.entity.id}`;
        if (taken.has(key)) continue;
        taken.add(key);
      }
      entries.push(item);
    }
    return entries;
  }

  /** Индекс меток: карточки из shape_ids; задачи — ещё и по id (карточку могли положить после загрузки ленты). */
  export function buildBoardChangeIndex(items: readonly TPpmBoardChange[]): {
    byShapeId: Map<string, TBoardChangeMark>;
    byWorkItemId: Map<string, TBoardChangeMark>;
  } {
    const byShapeId = new Map<string, TBoardChangeMark>();
    const byWorkItemId = new Map<string, TBoardChangeMark>();
    for (const item of items) {
      const mark: TBoardChangeMark = item.kind === "board.node.added" ? "added" : "changed";
      for (const shapeId of item.shape_ids) if (byShapeId.get(shapeId) !== "added") byShapeId.set(shapeId, mark);
      if (item.entity.type === "work_item") byWorkItemId.set(item.entity.id, "changed");
    }
    return { byShapeId, byWorkItemId };
  }

  // ─────────────── Доска ───────────────

  /** Рамка спринта карты — узел group с `map.role = "sprint"` (схема F); без неё «с начала спринта» не предлагается. */
  export function findSprintCycleId(shapes: Iterable<{ props: unknown; type: string } | undefined>): string | null {
    for (const shape of shapes) {
      if (shape?.type !== PPM_NODE_TYPE) continue;
      const serialized = (shape.props as { node?: unknown }).node;
      // Дешёвый отсев до разбора JSON: у рамки спринта в строке узла есть "sprint".
      if (typeof serialized !== "string" || !serialized.includes('"sprint"')) continue;
      const parsed = parseSerializedPpmCanvasNode(serialized);
      if (parsed.status !== "valid" && parsed.status !== "migrated") continue;
      const map = getPpmCanvasMap(parsed.node);
      if (map?.role === "sprint") return map.cycle_id;
    }
    return null;
  }

  /** Фигуры верхнего уровня на всех листах доски (рамка спринта — верхнего уровня). */
  export function boardTopLevelShapes(
    editor: Pick<Editor, "getPages" | "getShape" | "getSortedChildIdsForParent">
  ): (TLShape | undefined)[] {
    return editor
      .getPages()
      .flatMap((page) => editor.getSortedChildIdsForParent(page.id).map((id) => editor.getShape(id)));
  }

  /** Какие карточки ленты есть на доске: строка-ключ, чтобы перетаскивание не перерисовывало панель. */
  export function presentShapeKey(entries: readonly TPpmBoardChange[], exists: (shapeId: string) => boolean): string {
    const present = new Set<string>();
    for (const entry of entries)
      for (const shapeId of entry.shape_ids) if (!present.has(shapeId) && exists(shapeId)) present.add(shapeId);
    // oxlint-disable-next-line unicorn/no-array-sort -- sorts a fresh copy (lib ES2022: no toSorted).
    return [...present].sort().join("\n");
  }

  export type TChangeFocusEditor = Pick<
    Editor,
    | "centerOnPoint"
    | "getAncestorPageId"
    | "getCurrentPageId"
    | "getSelectionPageBounds"
    | "getShape"
    | "select"
    | "setCurrentPage"
  >;

  /** Щелчок по событию: лист первой найденной карточки, выделить её карточки на нём, центр камеры — масштаб не меняется. */
  export function focusChangeShapes(editor: TChangeFocusEditor, shapeIds: readonly string[]): boolean {
    const shapes = shapeIds
      .map((shapeId) => editor.getShape(shapeId as TLShapeId))
      .filter((shape): shape is TLShape => Boolean(shape));
    const pageId = shapes[0] ? editor.getAncestorPageId(shapes[0]) : undefined;
    if (!pageId) return false;
    if (pageId !== editor.getCurrentPageId()) editor.setCurrentPage(pageId);
    editor.select(...shapes.filter((shape) => editor.getAncestorPageId(shape) === pageId).map((shape) => shape.id));
    const bounds = editor.getSelectionPageBounds();
    if (bounds) editor.centerOnPoint(bounds.center, { animation: { duration: 220 } });
    return true;
  }
  ```

- [ ] **Step 8: Тексты и даты** — `living-map/changes-format.ts` (новый):
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // AF2.2 C1 · тексты ленты «Что изменилось» как в K5 («ROBOT-16 → В работе», «ROBOT-12 блокирует ROBOT-15»,
  // «Схема захвата.pdf → v3», «PR #46 влит · ROBOT-11») и даты («только что», «сегодня, 12:41», «22 сент.»). Чистые
  // функции; язык — ru* → ru, иначе en (как в «Задачах»); строки — блок C af22-living-map.ts (@ppm/brand).
  import { resolvePpmLocale, type TPpmTranslationKey } from "@ppm/brand";
  import { parseSerializedPpmCanvasNode } from "@ppm/canvas";
  import type { Editor, TLShapeId } from "tldraw";
  import type { TPpmBoardChange } from "@/services/ppm-canvas-changes.service";
  import { fillCanvasTemplate, formatDueDate, OWN_NODE_KIND_KEYS } from "../canvas-grammar";
  import { geoLabelKey } from "../canvas-toolkit-model";
  import type { TPpmCanvasShape } from "../shape";
  import { changeText } from "./changes-model";

  const DAY_MS = 86_400_000;
  const PPM_NODE_TYPE = "ppm-canvas-node" satisfies TPpmCanvasShape["type"];

  export type TChangesT = (key: TPpmTranslationKey) => string;
  export type TChangeIcon =
    | "added"
    | "assignee"
    | "changed"
    | "due"
    | "file"
    | "name"
    | "pr_merged"
    | "pr_opened"
    | "priority"
    | "relation"
    | "state";
  export type TBoardChangeView = { detail: string; icon: TChangeIcon; text: string };
  export type TDescribeChangeContext = {
    currentUserId: string;
    locale: string;
    /** Подпись вида объекта доски по его фигурам (для board.node.*); undefined — фигуры на доске уже нет. */
    nodeKindKey: (shapeIds: readonly string[]) => TPpmTranslationKey | undefined;
    now: number;
    t: TChangesT;
  };

  // Точные имена статусов Plane по умолчанию → русские (как getPpmStateDisplayName, ppm-design.ts); свои — как есть.
  const DEFAULT_STATE_KEYS: Readonly<Record<string, TPpmTranslationKey>> = {
    Backlog: "ux.state.backlog",
    Todo: "ux.state.unstarted",
    "In Progress": "ux.state.started",
    Done: "ux.state.completed",
    Cancelled: "ux.state.cancelled",
    Triage: "ux.state.triage",
  };

  const PRIORITY_KEYS: Readonly<Record<string, TPpmTranslationKey>> = {
    urgent: "canvas.priority_urgent",
    high: "canvas.priority_high",
    medium: "canvas.priority_medium",
    low: "canvas.priority_low",
    none: "canvas.priority_none",
  };

  const RELATION_KEYS: Readonly<Record<string, TPpmTranslationKey>> = {
    blocking: "canvas.changes.relation_blocking",
    blocked_by: "canvas.changes.relation_blocked_by",
    relates_to: "canvas.changes.relation_relates_to",
    duplicate: "canvas.changes.relation_duplicate",
    implements: "canvas.changes.relation_implements",
    implemented_by: "canvas.changes.relation_implemented_by",
    start_before: "canvas.changes.relation_dependency",
    start_after: "canvas.changes.relation_dependency",
    finish_before: "canvas.changes.relation_dependency",
    finish_after: "canvas.changes.relation_dependency",
  };

  const LIVE_NODE_KEYS: Readonly<Record<string, TPpmTranslationKey>> = {
    work_item_ref: "canvas.rail.work_item",
    page_ref: "canvas.rail.page",
    attachment_ref: "canvas.rail.file",
    vault_file_ref: "canvas.rail.file",
    pdf: "canvas.rail.file",
    image: "canvas.rail.file",
    reference: "canvas.rail.file",
    git_ref: "canvas.rail.git",
  };

  const lookup = (table: Readonly<Record<string, TPpmTranslationKey>>, key: string | null | undefined) =>
    key && Object.hasOwn(table, key) ? table[key] : undefined;

  function clock(date: Date, language: string): string {
    return new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  }

  function shortDate(date: Date, language: string, now: Date): string {
    return new Intl.DateTimeFormat(
      language,
      date.getFullYear() === now.getFullYear()
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "short", year: "numeric" }
    ).format(date);
  }

  function calendarDaysBetween(earlier: Date, later: Date): number {
    return Math.round(
      (Date.UTC(later.getFullYear(), later.getMonth(), later.getDate()) -
        Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())) /
        DAY_MS
    );
  }

  /** «когда» у события: только что · 5 мин. назад · сегодня, 09:05 · вчера, 18:40 · 22 сент. · 30 дек. 2025 г. */
  export function formatChangeWhen(iso: string, locale: string, t: TChangesT, now: number): string {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return "—";
    const language = resolvePpmLocale(locale);
    const delta = now - time;
    if (delta < 60_000) return t("canvas.changes.just_now");
    if (delta < 3_600_000)
      return new Intl.RelativeTimeFormat(language, { numeric: "always", style: "short" }).format(
        -Math.floor(delta / 60_000),
        "minute"
      );
    const date = new Date(time);
    const today = new Date(now);
    const days = calendarDaysBetween(date, today);
    if (days === 0) return fillCanvasTemplate(t("canvas.changes.today_at"), { time: clock(date, language) });
    if (days === 1) return fillCanvasTemplate(t("canvas.changes.yesterday_at"), { time: clock(date, language) });
    return shortDate(date, language, today);
  }

  /** Начало периода в заголовке: сегодня — время («с 12:41»), иначе дата («с 18 сент.»). */
  export function formatChangesSince(iso: string, locale: string, now: number): string {
    const time = Date.parse(iso);
    if (!Number.isFinite(time)) return "—";
    const language = resolvePpmLocale(locale);
    const date = new Date(time);
    const today = new Date(now);
    return calendarDaysBetween(date, today) === 0 ? clock(date, language) : shortDate(date, language, today);
  }

  /** «6», а при обрезке ленты (200 событий или 30 дней) — «200+». */
  export function formatChangesCount(count: number, truncated: boolean): string {
    return truncated ? `${count}+` : String(count);
  }

  /** Срок задачи: «YYYY-MM-DD…» → «29 сент.»; иное — как пришло. */
  function formatChangeDate(value: string, locale: string): string {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
    return match ? formatDueDate(match[1], locale) : value;
  }

  /** Подпись вида объекта доски: свои карточки — как в «Объектах», живые — по источнику, фигуры tldraw — по типу. */
  export function nodeLabelKey(shapeType: string, ppmKind?: string | null, geo?: string | null): TPpmTranslationKey {
    if (shapeType === PPM_NODE_TYPE) {
      if (ppmKind && Object.hasOwn(OWN_NODE_KIND_KEYS, ppmKind))
        return OWN_NODE_KIND_KEYS[ppmKind as keyof typeof OWN_NODE_KIND_KEYS];
      return lookup(LIVE_NODE_KEYS, ppmKind) ?? "canvas.rail.object";
    }
    if (shapeType === "note") return "canvas.rail.sticky";
    if (shapeType === "text") return "canvas.rail.text";
    if (shapeType === "frame") return "canvas.rail.frame";
    if (shapeType === "arrow") return "canvas.shape.arrow";
    return (shapeType === "geo" && geo ? geoLabelKey(geo) : undefined) ?? "canvas.rail.object";
  }

  /** Подпись живой фигуры доски (карточка PPM — по виду узла, geo — по форме). */
  export function boardNodeLabelKey(shape: { props: unknown; type: string }): TPpmTranslationKey {
    const props = shape.props as { geo?: unknown; node?: unknown };
    if (shape.type !== PPM_NODE_TYPE)
      return nodeLabelKey(shape.type, null, typeof props.geo === "string" ? props.geo : null);
    const parsed = typeof props.node === "string" ? parseSerializedPpmCanvasNode(props.node) : undefined;
    return parsed && (parsed.status === "valid" || parsed.status === "migrated")
      ? nodeLabelKey(PPM_NODE_TYPE, parsed.node.kind)
      : "canvas.rail.object";
  }

  /** Вид из самого события (S2: detail.field «kind» — вид узла PPM, «shape_type» — тип фигуры tldraw). */
  function detailNodeLabelKey(detail: TPpmBoardChange["detail"]): TPpmTranslationKey | undefined {
    const value = changeText(detail.new);
    if (!value) return undefined;
    if (detail.field === "kind") return nodeLabelKey(PPM_NODE_TYPE, value);
    return detail.field === "shape_type" ? nodeLabelKey(value) : undefined;
  }

  export function nodeKindKeyForShapes(
    editor: Pick<Editor, "getShape">,
    shapeIds: readonly string[]
  ): TPpmTranslationKey | undefined {
    for (const shapeId of shapeIds) {
      const shape = editor.getShape(shapeId as TLShapeId);
      if (shape) return boardNodeLabelKey(shape);
    }
    return undefined;
  }

  function changeActor(item: TPpmBoardChange, context: TDescribeChangeContext): string | null {
    if (item.actor)
      return item.actor.id === context.currentUserId ? context.t("canvas.changes.actor_you") : item.actor.display_name;
    // Нативные фигуры без автора (S2 сравнивает снимки доски) — «на доске», как в спецификации.
    return item.kind === "board.node.added" || item.kind === "board.node.changed"
      ? context.t("canvas.changes.actor_board")
      : null;
  }

  type THeadline = Omit<TBoardChangeView, "detail"> & { prefix: string | null };

  function headline(item: TPpmBoardChange, context: TDescribeChangeContext): THeadline {
    const { t } = context;
    const fill = (key: TPpmTranslationKey, values: Record<string, string>) => fillCanvasTemplate(t(key), values);
    const name = item.entity.identifier?.trim() || item.entity.title?.trim() || t("canvas.work_item");
    const next = changeText(item.detail.new);
    const previous = changeText(item.detail.old);
    switch (item.kind) {
      case "work_item.state": {
        const stateKey = lookup(DEFAULT_STATE_KEYS, next);
        return {
          icon: "state",
          prefix: null,
          text: next
            ? fill("canvas.changes.state", { item: name, value: stateKey ? t(stateKey) : next })
            : fill("canvas.changes.state_unknown", { item: name }),
        };
      }
      case "work_item.assignees":
        return {
          icon: "assignee",
          prefix: null,
          text: next
            ? fill("canvas.changes.assignee_added", { item: name, value: next })
            : fill("canvas.changes.assignee_removed", { item: name, value: previous ?? "—" }),
        };
      case "work_item.due":
        return {
          icon: "due",
          prefix: null,
          text: next
            ? fill("canvas.changes.due_set", { item: name, value: formatChangeDate(next, context.locale) })
            : fill("canvas.changes.due_removed", { item: name }),
        };
      case "work_item.priority": {
        const priorityKey = lookup(PRIORITY_KEYS, next) ?? "canvas.priority_none";
        return {
          icon: "priority",
          prefix: null,
          text: fill("canvas.changes.priority", { item: name, value: t(priorityKey) }),
        };
      }
      case "work_item.name":
        return {
          icon: "name",
          prefix: null,
          text: fill("canvas.changes.name", { item: name, value: next ?? item.entity.title?.trim() ?? "—" }),
        };
      case "work_item.relation": {
        const other = next ?? previous;
        // S2 не называет задачу, которую пользователь не видит (old и new — null): «связь со скрытой задачей».
        if (!other)
          return {
            icon: "relation",
            prefix: t("canvas.changes.relation_changed"),
            text: fill("canvas.changes.relation_hidden", { item: name }),
          };
        return {
          icon: "relation",
          prefix: t(next ? "canvas.changes.relation_added" : "canvas.changes.relation_removed"),
          text: fill(lookup(RELATION_KEYS, item.detail.field) ?? "canvas.changes.relation_other", { item: name, other }),
        };
      }
      case "git.pull_request.opened":
      case "git.pull_request.merged": {
        const merged = item.kind === "git.pull_request.merged";
        const pr = item.entity.identifier?.trim() || item.entity.title?.trim() || "—";
        const text = fill(merged ? "canvas.changes.pr_merged" : "canvas.changes.pr_opened", { pr });
        // S2: detail.new — задачи доски/спринта, связанные с PR («LMP-3, LMP-7»).
        const task = item.detail.field === "work_items" ? next : null;
        return { icon: merged ? "pr_merged" : "pr_opened", prefix: null, text: task ? `${text} · ${task}` : text };
      }
      case "vault.version": {
        const file = item.entity.title?.trim() || item.entity.identifier?.trim() || t("canvas.rail.file");
        return next
          ? {
              icon: "file",
              prefix: t("canvas.changes.version_new"),
              text: fill("canvas.changes.version", { file, value: next }),
            }
          : { icon: "file", prefix: null, text: fill("canvas.changes.version_unknown", { file }) };
      }
      case "board.node.added":
      case "board.node.changed": {
        const added = item.kind === "board.node.added";
        const kind = t(context.nodeKindKey(item.shape_ids) ?? detailNodeLabelKey(item.detail) ?? "canvas.rail.object");
        const title = item.entity.title?.trim();
        return {
          icon: added ? "added" : "changed",
          prefix: t(added ? "canvas.changes.chip_added" : "canvas.changes.chip_changed"),
          text: title && title !== kind ? fill("canvas.changes.node_titled", { kind, title }) : kind,
        };
      }
      default:
        return { icon: "changed", prefix: null, text: name };
    }
  }

  /** Строка ленты: значок, текст и «что · кто · когда» (K5). */
  export function describeBoardChange(item: TPpmBoardChange, context: TDescribeChangeContext): TBoardChangeView {
    const { icon, prefix, text } = headline(item, context);
    const detail = [
      prefix,
      changeActor(item, context),
      formatChangeWhen(item.occurred_at, context.locale, context.t, context.now),
    ]
      .filter(Boolean)
      .join(" · ");
    return { detail, icon, text };
  }
  ```

- [ ] **Step 9: Хук** — `living-map/board-changes.ts`, всё содержимое заглушки F заменить на:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // AF2.2 C1 · useBoardChanges — `changes` контекста «Живой карты» (провайдер F): индекс меток на карточках, число на
  // кнопке и состояние панели «Что изменилось». Контракт F: пусто при !args.enabled (облик v1, минимальный режим); сеть,
  // window/document — только при args.isActive (AF2.1 R19); результат стабилен (useMemo); living-map-context.ts не
  // импортировать (цикл через провайдер). Лента — при открытии доски и возврате на её вкладку, при открытии панели и смене
  // периода, при возврате в окно и раз в 60 с, пока панель открыта (R8). На сервер пишется одно — личная отметка
  // просмотра, и только по «Отметить просмотренным». Всё состояние живёт здесь, а не в CanvasControls: тот
  // перемонтируется при каждом сохранении доски (components-memo editor.tsx), а панель и её период должны это пережить.
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import { useCycle } from "@/hooks/store/use-cycle";
  import { PpmCanvasChangesService, type TPpmBoardChange } from "@/services/ppm-canvas-changes.service";
  import {
    applySeen,
    beginChangesLoad,
    boardTopLevelShapes,
    buildBoardChangeIndex,
    changesPeriodKey,
    failChangesLoad,
    findSprintCycleId,
    groupBoardChanges,
    INITIAL_BOARD_CHANGES_STATE,
    loadBoardChanges,
    mergeLoadedChanges,
    PPM_CHANGES_POLL_MS,
    shouldRefreshOnReturn,
    type TBoardChangesPanel,
    type TBoardChangesState,
    type TChangesMode,
  } from "./changes-model";
  import { EMPTY_BOARD_CHANGE_INDEX, type TBoardChangeIndex, type TLivingMapArgs } from "./living-map-types";

  const NO_CHANGES: readonly TPpmBoardChange[] = [];

  export function useBoardChanges(args: TLivingMapArgs): TBoardChangeIndex {
    // Зависимости — примитивы окружения, не весь args: его объект меняется с каждой привязкой на доске.
    const { authorId, boardId, boards, editor, enabled, isActive, projectId, workspaceId, workspaceSlug } = args;
    const service = useMemo(() => new PpmCanvasChangesService(), []);
    const cycleStore = useCycle();
    const boardCreatedAt = boards.find((board) => board.board_id === boardId)?.created_at ?? null;
    const [state, setState] = useState<TBoardChangesState>(INITIAL_BOARD_CHANGES_STATE);
    const [open, setOpenState] = useState(false);
    const [mode, setMode] = useState<TChangesMode>("last_seen");
    const [customDate, setCustomDate] = useState("");
    const [sprintStart, setSprintStart] = useState<string | null>(null);
    const [marking, setMarking] = useState(false);
    const [markError, setMarkError] = useState(false);
    // «С начала спринта» — только на карте (есть рамка спринта) и когда известна дата его начала.
    const effectiveMode: TChangesMode = mode === "sprint" && !sprintStart ? "last_seen" : mode;
    const wantedKey = changesPeriodKey(effectiveMode, customDate, sprintStart);
    const periodKey = open ? wantedKey : "closed";
    const requestRef = useRef(0);
    const lastLoadRef = useRef(0);
    const focusTargetRef = useRef<"panel" | "button" | null>(null);
    const inputsRef = useRef({ boardCreatedAt, customDate, mode: effectiveMode, open, sprintStart });
    inputsRef.current = { boardCreatedAt, customDate, mode: effectiveMode, open, sprintStart };

    const load = useCallback(async () => {
      const request = ++requestRef.current;
      lastLoadRef.current = Date.now();
      const { open: panelOpen, ...inputs } = inputsRef.current;
      setState(beginChangesLoad);
      try {
        const loaded = await loadBoardChanges(
          {
            getChanges: (since) => service.getChanges(workspaceId, projectId, boardId, since),
            getSeen: () => service.getSeen(workspaceId, projectId, boardId),
          },
          { ...inputs, now: Date.now(), panelOpen }
        );
        if (request === requestRef.current) setState((current) => mergeLoadedChanges(current, loaded));
      } catch (error) {
        if (request === requestRef.current) setState((current) => failChangesLoad(current, error));
      }
    }, [boardId, projectId, service, workspaceId]);

    // Открытие доски, возврат на её вкладку, открытие и закрытие панели, смена периода.
    useEffect(() => {
      if (!enabled || !isActive) return;
      void load();
    }, [enabled, isActive, load, periodKey]);

    // Возврат в окно браузера (focus и visibilitychange приходят парой — один запрос).
    useEffect(() => {
      if (!enabled || !isActive) return;
      const onReturn = () => {
        if (document.visibilityState !== "visible" || !shouldRefreshOnReturn(lastLoadRef.current, Date.now())) return;
        void load();
      };
      window.addEventListener("focus", onReturn);
      document.addEventListener("visibilitychange", onReturn);
      return () => {
        window.removeEventListener("focus", onReturn);
        document.removeEventListener("visibilitychange", onReturn);
      };
    }, [enabled, isActive, load]);

    // R8: раз в 60 с, пока панель открыта, вкладка доски активна и окно видно.
    useEffect(() => {
      if (!enabled || !isActive || !open) return;
      const timer = window.setInterval(() => {
        if (document.visibilityState === "visible") void load();
      }, PPM_CHANGES_POLL_MS);
      return () => window.clearInterval(timer);
    }, [enabled, isActive, load, open]);

    // Ответы, пришедшие после закрытия доски, в состояние не пишутся.
    useEffect(
      () => () => {
        requestRef.current += 1;
      },
      []
    );

    // «С начала спринта»: рамка спринта на доске → дата начала спринта из стора Plane (или запрос деталей спринта).
    useEffect(() => {
      if (!enabled || !isActive || !open || !editor) return;
      const cycleId = findSprintCycleId(boardTopLevelShapes(editor));
      if (!cycleId) {
        setSprintStart(null);
        return;
      }
      const known = cycleStore.getCycleById(cycleId);
      if (known) {
        setSprintStart(known.start_date);
        return;
      }
      let active = true;
      const fetchSprint = async () => {
        try {
          const cycle = await cycleStore.fetchCycleDetails(workspaceSlug, projectId, cycleId);
          if (active) setSprintStart(cycle.start_date);
        } catch {
          if (active) setSprintStart(null);
        }
      };
      void fetchSprint();
      return () => {
        active = false;
      };
    }, [cycleStore, editor, enabled, isActive, open, projectId, workspaceSlug]);

    const setOpen = useCallback((next: boolean) => {
      focusTargetRef.current = next ? "panel" : "button";
      setOpenState(next);
    }, []);
    const consumeFocus = useCallback((target: "panel" | "button") => {
      if (focusTargetRef.current !== target) return false;
      focusTargetRef.current = null;
      return true;
    }, []);
    const retry = useCallback(() => {
      void load();
    }, [load]);
    const markSeen = useCallback(() => {
      if (marking) return;
      setMarking(true);
      setMarkError(false);
      const run = async () => {
        try {
          const seen = await service.markSeen(workspaceId, projectId, boardId);
          // Загрузки, начатые до отметки, считали непросмотренное от старой отметки — их ответы не нужны.
          requestRef.current += 1;
          setState((current) => applySeen(current, seen.seen_at));
          void load();
        } catch {
          setMarkError(true);
        } finally {
          setMarking(false);
        }
      };
      void run();
    }, [boardId, load, marking, projectId, service, workspaceId]);

    const unseenItems = state.unseen?.items ?? NO_CHANGES;
    const index = useMemo(() => buildBoardChangeIndex(unseenItems), [unseenItems]);
    const unseenEntries = useMemo(() => groupBoardChanges(unseenItems), [unseenItems]);
    const periodFeed =
      effectiveMode === "last_seen" ? state.unseen : state.period?.key === wantedKey ? state.period : null;
    const periodItems = periodFeed?.items;
    const entries = useMemo(
      () => (!periodItems || periodItems === unseenItems ? unseenEntries : groupBoardChanges(periodItems)),
      [periodItems, unseenEntries, unseenItems]
    );
    const panelStatus = state.status === "ready" && !periodFeed ? "loading" : state.status;

    const panel = useMemo<TBoardChangesPanel>(
      () => ({
        consumeFocus,
        currentUserId: authorId,
        customDate,
        entries,
        markError,
        markSeen,
        marking,
        mode: effectiveMode,
        open,
        retry,
        setCustomDate,
        setMode,
        setOpen,
        since: periodFeed?.since ?? null,
        sprintAvailable: Boolean(sprintStart),
        status: panelStatus,
        truncated: periodFeed?.truncated ?? false,
        unseenTruncated: state.unseen?.truncated ?? false,
      }),
      [
        authorId,
        consumeFocus,
        customDate,
        effectiveMode,
        entries,
        markError,
        markSeen,
        marking,
        open,
        panelStatus,
        periodFeed,
        retry,
        setOpen,
        sprintStart,
        state.unseen,
      ]
    );

    return useMemo<TBoardChangeIndex>(
      () =>
        enabled
          ? {
              ...EMPTY_BOARD_CHANGE_INDEX,
              byShapeId: index.byShapeId,
              byWorkItemId: index.byWorkItemId,
              count: unseenEntries.length,
              panel,
            }
          : EMPTY_BOARD_CHANGE_INDEX,
      [enabled, index, panel, unseenEntries.length]
    );
  }
  ```

- [ ] **Step 10: Кнопка** — `living-map/changes-button.tsx`, всё содержимое заглушки F заменить на:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { memo, useEffect, useRef } from "react";
  import { History } from "lucide-react";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate, usePpmCanvasGrammarV2 } from "../canvas-grammar";
  import { formatChangesCount } from "./changes-format";
  import { usePpmLivingMap } from "./living-map-context";

  // AF2.2 C1 · кнопка «Что изменилось · N» в правой колонке (.ppm-living-map-aside__bar, F). Видна под v2, пока панель
  // закрыта и сервер отдаёт ленту; N — непросмотренное с личной отметки. Читателю — так же (отметка личная, S3).
  // memo: CanvasControls перерисовывается на каждое изменение фигур (перетаскивание), кнопке это не нужно.
  export const PpmChangesButton = memo(function PpmChangesButton() {
    const grammarV2 = usePpmCanvasGrammarV2();
    const { changes } = usePpmLivingMap();
    const ppmT = usePpmTranslation();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panel = changes.panel;
    const visible = Boolean(grammarV2 && panel && !panel.open && panel.status !== "unavailable");
    useEffect(() => {
      if (visible && panel?.consumeFocus("button")) buttonRef.current?.focus();
    }, [panel, visible]);
    if (!visible || !panel) return null;
    return (
      <button
        ref={buttonRef}
        type="button"
        className="ppm-living-map-pill ppm-changes-button"
        data-unseen={changes.count > 0 || undefined}
        onClick={() => panel.setOpen(true)}
      >
        <History aria-hidden="true" />
        <span>
          {changes.count > 0
            ? fillCanvasTemplate(ppmT("canvas.changes.button_count"), {
                count: formatChangesCount(changes.count, panel.unseenTruncated),
              })
            : ppmT("canvas.changes.button")}
        </span>
      </button>
    );
  });
  ```

- [ ] **Step 11: Панель** — `living-map/changes-panel.tsx`, всё содержимое заглушки F заменить на:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { memo, useEffect, useId, useMemo, useRef } from "react";
  import {
    CalendarClock,
    Check,
    CircleDot,
    FileText,
    Flag,
    GitMerge,
    GitPullRequest,
    History,
    Link2,
    PenLine,
    SquarePen,
    SquarePlus,
    UserRound,
    X,
    type LucideIcon,
  } from "lucide-react";
  import { useEditor, useValue, type TLShapeId } from "tldraw";
  import { useTranslation } from "@plane/i18n";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import type { TPpmBoardChange } from "@/services/ppm-canvas-changes.service";
  import { fillCanvasTemplate, usePpmCanvasGrammarV2 } from "../canvas-grammar";
  import {
    describeBoardChange,
    formatChangesCount,
    formatChangesSince,
    nodeKindKeyForShapes,
    type TChangeIcon,
  } from "./changes-format";
  import {
    changesDateBounds,
    focusChangeShapes,
    localDateValue,
    presentShapeKey,
    type TChangesMode,
  } from "./changes-model";
  import { usePpmLivingMap } from "./living-map-context";

  const CHANGE_ICONS: Record<TChangeIcon, LucideIcon> = {
    added: SquarePlus,
    assignee: UserRound,
    changed: SquarePen,
    due: CalendarClock,
    file: FileText,
    name: PenLine,
    pr_merged: GitMerge,
    pr_opened: GitPullRequest,
    priority: Flag,
    relation: Link2,
    state: CircleDot,
  };

  const NO_ENTRIES: readonly TPpmBoardChange[] = [];

  // AF2.2 C1 · панель «Что изменилось с {дата} · N» (K5) под кнопками правой колонки: период, лента (значок, текст, кто,
  // когда), щелчок — выделить карточку и подвести камеру (масштаб прежний; карточка на другом листе — сначала лист), внизу
  // «Отметить просмотренным» (S3 PUT — только по нажатию). memo: CanvasControls перерисовывается на каждое изменение
  // фигур, а до 200 строк ленты не должны пересобираться на каждый кадр перетаскивания.
  export const PpmChangesPanel = memo(function PpmChangesPanel() {
    const grammarV2 = usePpmCanvasGrammarV2();
    const { changes } = usePpmLivingMap();
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const titleId = useId();
    const closeRef = useRef<HTMLButtonElement>(null);
    const panel = changes.panel;
    const open = Boolean(grammarV2 && panel?.open && panel.status !== "unavailable");
    const entries = panel?.entries ?? NO_ENTRIES;
    // Какие карточки ленты есть на доске (на любом листе) — одной строкой: перетаскивание панель не перерисовывает.
    const presentKey = useValue(
      "ppm changes present shapes",
      () => (open ? presentShapeKey(entries, (shapeId) => Boolean(editor.getShape(shapeId as TLShapeId))) : ""),
      [editor, entries, open]
    );
    const present = useMemo(() => new Set(presentKey ? presentKey.split("\n") : []), [presentKey]);
    useEffect(() => {
      if (open && panel?.consumeFocus("panel")) closeRef.current?.focus();
    }, [open, panel]);
    if (!open || !panel) return null;

    const now = Date.now();
    const bounds = changesDateBounds(now);
    const loading = panel.status === "idle" || panel.status === "loading";
    const failed = panel.status === "error";
    const close = () => panel.setOpen(false);
    const changeMode = (next: TChangesMode) => {
      if (next === "date" && !panel.customDate) panel.setCustomDate(localDateValue(panel.since ?? now));
      panel.setMode(next);
    };
    const errorLine = (
      <p className="ppm-changes-panel__state" data-error="">
        {ppmT("canvas.changes.error")}
        <button type="button" onClick={panel.retry}>
          {ppmT("canvas.changes.retry")}
        </button>
      </p>
    );

    return (
      <section
        className="ppm-living-map-panel ppm-changes-panel"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.code !== "Escape") return;
          event.stopPropagation();
          close();
        }}
      >
        <header className="ppm-changes-panel__header">
          <History aria-hidden="true" />
          <strong id={titleId}>
            {panel.since
              ? fillCanvasTemplate(ppmT("canvas.changes.title"), {
                  date: formatChangesSince(panel.since, currentLocale, now),
                })
              : ppmT("canvas.changes.button")}
          </strong>
          {!loading && !failed && (
            <span className="ppm-changes-panel__count">· {formatChangesCount(entries.length, panel.truncated)}</span>
          )}
          <button ref={closeRef} type="button" aria-label={ppmT("canvas.close")} onClick={close}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="ppm-changes-panel__period">
          <select
            aria-label={ppmT("canvas.changes.period")}
            value={panel.mode}
            onChange={(event) => changeMode(event.currentTarget.value as TChangesMode)}
          >
            <option value="last_seen">{ppmT("canvas.changes.mode_last_seen")}</option>
            {panel.sprintAvailable && <option value="sprint">{ppmT("canvas.changes.mode_sprint")}</option>}
            <option value="date">{ppmT("canvas.changes.mode_date")}</option>
          </select>
          {panel.mode === "date" && (
            <input
              type="date"
              aria-label={ppmT("canvas.changes.date")}
              max={bounds.max}
              min={bounds.min}
              value={panel.customDate}
              onChange={(event) => panel.setCustomDate(event.currentTarget.value)}
            />
          )}
        </div>
        {loading ? (
          <p className="ppm-changes-panel__state" role="status">
            {ppmT("canvas.changes.loading")}
          </p>
        ) : failed && entries.length === 0 ? (
          errorLine
        ) : entries.length === 0 ? (
          <p className="ppm-changes-panel__state">{ppmT("canvas.changes.empty")}</p>
        ) : (
          <ul className="ppm-changes-panel__list">
            {entries.map((entry) => {
              const view = describeBoardChange(entry, {
                currentUserId: panel.currentUserId,
                locale: currentLocale,
                nodeKindKey: (shapeIds) => nodeKindKeyForShapes(editor, shapeIds),
                now,
                t: ppmT,
              });
              const Icon = CHANGE_ICONS[view.icon];
              const body = (
                <>
                  <Icon aria-hidden="true" className="ppm-changes-panel__icon" />
                  <span className="ppm-changes-panel__text">{view.text}</span>
                  <span className="ppm-changes-panel__meta">{view.detail}</span>
                </>
              );
              return (
                <li key={entry.id}>
                  {entry.shape_ids.some((shapeId) => present.has(shapeId)) ? (
                    <button
                      type="button"
                      className="ppm-changes-panel__item"
                      data-kind={view.icon}
                      title={ppmT("canvas.changes.show_on_board")}
                      onClick={() => focusChangeShapes(editor, entry.shape_ids)}
                    >
                      {body}
                    </button>
                  ) : (
                    <div
                      className="ppm-changes-panel__item"
                      data-kind={view.icon}
                      data-static=""
                      title={ppmT("canvas.changes.not_on_board")}
                    >
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {failed && entries.length > 0 && errorLine}
        {panel.truncated && !loading && <p className="ppm-changes-panel__note">{ppmT("canvas.changes.truncated")}</p>}
        <footer className="ppm-changes-panel__footer">
          <button type="button" className="ppm-changes-panel__seen" disabled={panel.marking} onClick={panel.markSeen}>
            <Check aria-hidden="true" />
            {ppmT(panel.marking ? "canvas.changes.mark_seen_busy" : "canvas.changes.mark_seen")}
          </button>
          {panel.markError && <p role="alert">{ppmT("canvas.changes.mark_seen_error")}</p>}
        </footer>
      </section>
    );
  });
  ```

- [ ] **Step 12: Стили** — `living-map/living-map.css`, блок C. Было:
  ```css
  /* ── C: «Что изменилось» — кнопка, панель, метки на карточках ── */
  /* ── /C ── */
  ```
  стало:
  ```css
  /* ── C: «Что изменилось» — кнопка, панель, метки на карточках ── */

  /* AF2.2 C1 · «Что изменилось»: кнопка — пилюля колонки (.ppm-living-map-pill, F), панель — .ppm-living-map-panel (F);
     здесь только своё: заголовок, период, лента, подвал. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-button[data-unseen] {
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel svg {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.5rem 0.625rem 0.875rem;
    border-bottom: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__header strong {
    min-width: 0;
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__count {
    flex: none;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__header button {
    display: inline-grid;
    width: 1.75rem;
    height: 1.75rem;
    flex: none;
    margin-left: auto;
    place-items: center;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__header button:hover,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] button.ppm-changes-panel__item:hover,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__seen:hover {
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__period {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.5rem 0.875rem 0.25rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__period select,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__period input {
    min-height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.5rem;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.75rem;
  }

  /* Длинная лента прокручивается внутри панели: заголовок и «Отметить просмотренным» всегда на виду. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__list {
    max-height: 18rem;
    margin: 0;
    padding: 0.25rem 0;
    overflow-y: auto;
    list-style: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__item {
    display: grid;
    width: 100%;
    grid-template-columns: 1rem minmax(0, 1fr);
    column-gap: 0.625rem;
    row-gap: 0.125rem;
    padding: 0.5rem 0.875rem;
    color: inherit;
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__item[data-static] {
    cursor: default;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__icon {
    grid-row: span 2;
    margin-top: 0.125rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__text {
    overflow: hidden;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__meta {
    overflow: hidden;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__state {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.75rem 0.875rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__state[data-error] {
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__state button {
    text-decoration: underline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__note {
    margin: 0;
    padding: 0 0.875rem 0.5rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__footer {
    display: grid;
    gap: 0.25rem;
    padding: 0.375rem 0.5rem;
    border-top: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__footer p {
    margin: 0;
    padding: 0 0.375rem;
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__seen {
    display: inline-flex;
    min-height: 1.75rem;
    align-items: center;
    justify-self: start;
    gap: 0.375rem;
    padding: 0 0.375rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel__seen:disabled {
    cursor: default;
    opacity: 0.6;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel button:focus-visible,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel select:focus-visible,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-changes-panel input:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: var(--ppm-focus-ring, 0 0 0 2px var(--border-accent-strong));
  }

  /* Одна правая панель за раз (AF2.1 R5): пока открыта «Что изменилось», инспектор выделенной карточки её не перекрывает
     (инспектор — сосед .tl-container в .ppm-canvas-shell, панель — внутри .tl-container). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .tl-container:has(.ppm-changes-panel) ~ .ppm-canvas-inspector {
    display: none;
  }

  /* ── /C ── */
  ```

- [ ] **Step 13: Запустить — проходят**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/living-map-changes.test.ts tests/ppm-canvas/living-map-changes-panel.test.ts`
  → `Test Files 2 passed (2)`, `Tests 32 passed (32)`.

- [ ] **Step 14: Проверки**
  - web всё: `cd $PF/apps/web && ./node_modules/.bin/vitest run` → всё зелёное (+2 файла / +32 теста), в т.ч.
    `af22-foundation.test.ts` (гард CSS, блоки типов, экспорты заглушек, «хук не импортирует контекст»).
  - web tsc → без вывода; oxlint → число предупреждений то же, `0 errors`.
  - brand (команда из Global Constraints) → зелёные, в т.ч. `af22-translations.test.ts` (ключи C — в блоке C) и
    `i18n-overlay.test.ts`.
  - формат: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/services/ppm-canvas-changes.service.ts core/components/ppm-canvas/living-map/changes-model.ts core/components/ppm-canvas/living-map/changes-format.ts core/components/ppm-canvas/living-map/board-changes.ts core/components/ppm-canvas/living-map/changes-button.tsx core/components/ppm-canvas/living-map/changes-panel.tsx core/components/ppm-canvas/living-map/living-map-types.ts tests/ppm-canvas/living-map-changes.test.ts tests/ppm-canvas/living-map-changes-panel.test.ts`
    → файлы уже в формате (перезапуск тестов после oxfmt — те же 32).

**Acceptance (C1, живая проверка контроллера; перед ней — `migrate ppm_canvas` на dev-БД, иначе S3 отвечает 500):**
- [ ] Доска v2: в колонке справа — «Что изменилось · N» рядом с «Доска · Объектов»; N = непросмотренное с личной отметки
  (без отметки — с создания доски, не раньше 7 дней). v1 и минимальный режим — кнопки нет.
- [ ] Панель: «Что изменилось с {дата} · N», строки как в K5 («ROBOT-16 → В работе», «ROBOT-12 блокирует ROBOT-15 · новая
  связь в Задачах», «Схема захвата.pdf → v3», «PR #46 влит · ROBOT-11», «Заметка · добавлено · …»); щелчок выделяет карточку
  и подводит камеру (масштаб прежний); строка без карточки не нажимается; Esc/× закрывают, фокус возвращается на кнопку.
- [ ] «Отметить просмотренным» — список «За этот период ничего не изменилось», N пропадает; у второго пользователя его
  отметка не меняется; читатель видит ленту и отмечает.
- [ ] «с начала спринта» — только на карте; «с даты…» — лента с выбранного дня; пока панель открыта — обновление раз в 60 с
  (сеть), при возврате в окно — один запрос; скрытые вкладки досок в сеть не ходят.
- [ ] Инспектор выделенной карточки не перекрывает открытую панель; сохранение доски не закрывает панель и не сбрасывает период.

---

### Task C2: Метки «изменено» / «добавлено» на карточках

**Files:**
- Create: `apps/web/core/components/ppm-canvas/living-map/change-chips.tsx`
- Modify: `…/living-map/changes-model.ts` (две функции перед разделом «Доска»), `apps/web/core/components/ppm-canvas/shape.tsx`
  (импорт `:116-118` → блок C после него; `PpmCanvasNodeShapeUtil.component()` `:244-246`), `…/living-map/living-map.css`
  (конец блока C)
- Test: `apps/web/tests/ppm-canvas/living-map-changes-chips.test.ts`

**Interfaces:**
- Consumes: C1 — `buildBoardChangeIndex`, `applySeen`, `mergeLoadedChanges`, `INITIAL_BOARD_CHANGES_STATE`,
  `changes.byShapeId`/`changes.byWorkItemId` контекста (`usePpmLivingMap()`), ключи `canvas.changes.chip_changed`,
  `canvas.changes.chip_added`; существующее — `TPpmCanvasShape`, `parseSerializedPpmCanvasNode`, `usePpmCanvasGrammarV2`.
- Produces: `workItemIdOfNode(serializedNode: string): string | null`, `changeMarkForShape(index, shapeId, workItemId):
  TBoardChangeMark | undefined` (`changes-model.ts`); `PpmChangeChip({ shape }: { shape: TPpmCanvasShape })`
  (`change-chips.tsx`); классы `.ppm-change-chip`, `.ppm-change-chip__dot`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  $T/af22-pre.sh apps/web/core/components/ppm-canvas/living-map/change-chips.tsx \
    apps/web/core/components/ppm-canvas/shape.tsx \
    apps/web/tests/ppm-canvas/living-map-changes-chips.test.ts
  ```

- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/living-map-changes-chips.test.ts`:
  ```ts
  // AF2.2 C2: метки «изменено» / «добавлено» на карточках — по непросмотренному с личной отметки, пропадают после
  // «Отметить просмотренным», без подписок на камеру; только облик v2 (CSS под грамматикой v2).
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { createPpmCanvasNode, createPpmWorkItemRefNode, serializePpmCanvasNode } from "@ppm/canvas";
  import {
    applySeen,
    buildBoardChangeIndex,
    changeMarkForShape,
    INITIAL_BOARD_CHANGES_STATE,
    mergeLoadedChanges,
    workItemIdOfNode,
  } from "@/components/ppm-canvas/living-map/changes-model";
  import type { TPpmBoardChange } from "@/services/ppm-canvas-changes.service";

  const ME = "55555555-5555-4555-8555-555555555555";
  const TASK = "77777777-7777-4777-8777-777777777777";
  const BINDING = "99999999-9999-4999-8999-999999999999";
  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const shapeSource = read("shape.tsx");
  const chipSource = read("living-map/change-chips.tsx");
  const css = read("living-map/living-map.css");

  const taskNode = serializePpmCanvasNode(
    createPpmWorkItemRefNode({
      authorId: ME,
      binding: { binding_id: BINDING, entity_type: "work_item", entity_id: TASK, source_version: null },
    })
  );
  const noteNode = serializePpmCanvasNode(createPpmCanvasNode({ authorId: ME, kind: "note", title: "work_item_ref" }));

  function change(overrides: Partial<TPpmBoardChange> & Pick<TPpmBoardChange, "id" | "kind">): TPpmBoardChange {
    return {
      actor: null,
      detail: {},
      entity: { type: "work_item", id: TASK, identifier: "ROBOT-15" },
      occurred_at: new Date(2026, 8, 22, 12).toISOString(),
      shape_ids: [],
      ...overrides,
    };
  }

  function ruleBody(source: string, selector: string): string | undefined {
    const flat = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
    return [...flat.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, prelude]) =>
      prelude
        .split(",")
        .map((item) => item.trim())
        .includes(selector)
    )?.[2];
  }

  describe("marks «изменено» / «добавлено» (AF2.2 C2)", () => {
    it("finds the task of a live card; other cards have none", () => {
      expect(workItemIdOfNode(taskNode)).toBe(TASK);
      expect(workItemIdOfNode(noteNode)).toBeNull();
      expect(workItemIdOfNode("{broken")).toBeNull();
    });

    it("marks a card by its shape or by its task, «added» first", () => {
      const index = buildBoardChangeIndex([
        change({ id: "1", kind: "work_item.due" }),
        change({ id: "2", kind: "board.node.added", entity: { type: "node", id: "n" }, shape_ids: ["shape:note"] }),
      ]);
      expect(changeMarkForShape(index, "shape:note", null)).toBe("added");
      expect(changeMarkForShape(index, "shape:task-added-later", TASK)).toBe("changed");
      expect(changeMarkForShape(index, "shape:other", null)).toBeUndefined();
      // F's empty index (no provider, v1) has no byWorkItemId at all.
      expect(changeMarkForShape({ byShapeId: new Map() }, "shape:task", TASK)).toBeUndefined();
    });

    it("lasts until «Отметить просмотренным», then disappears", () => {
      const state = mergeLoadedChanges(INITIAL_BOARD_CHANGES_STATE, {
        period: null,
        seenAt: null,
        unseen: {
          items: [change({ id: "1", kind: "work_item.state", shape_ids: ["shape:task"] })],
          since: "",
          truncated: false,
        },
      });
      const before = buildBoardChangeIndex(state.unseen?.items ?? []);
      expect(changeMarkForShape(before, "shape:task", TASK)).toBe("changed");
      const after = buildBoardChangeIndex(applySeen(state, new Date(2026, 8, 26).toISOString()).unseen?.items ?? []);
      expect(changeMarkForShape(after, "shape:task", TASK)).toBeUndefined();
    });

    it("is drawn next to every PPM card from the shape util, outside the clipped card", () => {
      expect(shapeSource).toMatch(
        /override component\(shape: TPpmCanvasShape\) \{\s*return \(\s*<>\s*<PpmCanvasNodeCard shape=\{shape\} \/>\s*\{\/\* ── AF2\.2 C: [^\n]*── \*\/\}\s*<PpmChangeChip shape=\{shape\} \/>\s*\{\/\* ── \/AF2\.2 C ── \*\/\}\s*<\/>/
      );
      expect(shapeSource).toContain('import { PpmChangeChip } from "./living-map/change-chips";');
    });

    it("does not follow the camera: context only, the node parsed once per change of props.node", () => {
      expect(chipSource).not.toMatch(/\buse(?:Value|Editor|QuickReactor)\(/);
      expect(chipSource).toContain("useMemo(() => workItemIdOfNode(shape.props.node), [shape.props.node])");
      expect(chipSource).toContain(
        "const mark = grammarV2 ? changeMarkForShape(changes, shape.id, workItemId) : undefined;"
      );
    });

    it("sits on the top border, never takes clicks, and exists only under the v2 look", () => {
      const chip =
        ruleBody(css, ':where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-change-chip') ?? "";
      for (const declaration of ["position: absolute;", "top: -0.625rem;", "pointer-events: none;"])
        expect(chip).toContain(declaration);
      const flat = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
      const selectors = [...flat.matchAll(/([^{}]+)\{/g)]
        .map((match) => match[1].trim())
        .filter((prelude) => !prelude.startsWith("@"))
        .flatMap((prelude) => prelude.split(",").map((selector) => selector.trim()));
      for (const selector of selectors.filter((item) => /ppm-change/.test(item)))
        expect(selector).toMatch(/^:where\(html\[data-ppm-design="v2"\]\) \[data-ppm-canvas-grammar="v2"\]/);
    });
  });
  ```

- [ ] **Step 3: Запустить — падает**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/living-map-changes-chips.test.ts`
  → FAIL: `ENOENT … living-map/change-chips.tsx` при чтении исходника (и нет экспорта `changeMarkForShape`).

- [ ] **Step 4: Модель — метка по фигуре и по задаче** — `living-map/changes-model.ts`, перед строкой
  `// ─────────────── Доска ───────────────` вставить:
  ```ts
  /** id задачи живой карточки (узел work_item_ref) — для метки по задаче; прочие карточки → null. */
  export function workItemIdOfNode(serializedNode: string): string | null {
    if (!serializedNode.includes('"work_item_ref"')) return null;
    const parsed = parseSerializedPpmCanvasNode(serializedNode);
    return (parsed.status === "valid" || parsed.status === "migrated") && parsed.node.kind === "work_item_ref"
      ? parsed.node.binding.entity_id
      : null;
  }

  export function changeMarkForShape(
    index: { byShapeId: ReadonlyMap<string, TBoardChangeMark>; byWorkItemId?: ReadonlyMap<string, TBoardChangeMark> },
    shapeId: string,
    workItemId: string | null
  ): TBoardChangeMark | undefined {
    return index.byShapeId.get(shapeId) ?? (workItemId ? index.byWorkItemId?.get(workItemId) : undefined);
  }
  ```
  (пустая строка после вставки — перед маркером раздела).

- [ ] **Step 5: Метка** — `living-map/change-chips.tsx` (новый):
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useMemo } from "react";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { usePpmCanvasGrammarV2 } from "../canvas-grammar";
  import type { TPpmCanvasShape } from "../shape";
  import { changeMarkForShape, workItemIdOfNode } from "./changes-model";
  import { usePpmLivingMap } from "./living-map-context";

  // AF2.2 C2 · метка «изменено» / «добавлено» над верхней рамкой карточки (K5), пока у пользователя есть непросмотренные
  // изменения с личной отметки; после «Отметить просмотренным» индекс пуст — меток нет. Рисуется рядом с HTMLContainer
  // карточки, а не внутри (у карточки overflow: hidden). Читает только контекст живой карты — без useValue/useEditor,
  // поэтому камера её не перерисовывает; узел разбирается один раз на изменение props.node.
  export function PpmChangeChip({ shape }: { shape: TPpmCanvasShape }) {
    const grammarV2 = usePpmCanvasGrammarV2();
    const { changes } = usePpmLivingMap();
    const ppmT = usePpmTranslation();
    const workItemId = useMemo(() => workItemIdOfNode(shape.props.node), [shape.props.node]);
    const mark = grammarV2 ? changeMarkForShape(changes, shape.id, workItemId) : undefined;
    if (!mark) return null;
    return (
      <span className="ppm-change-chip" data-mark={mark}>
        <span aria-hidden="true" className="ppm-change-chip__dot" />
        {ppmT(mark === "added" ? "canvas.changes.chip_added" : "canvas.changes.chip_changed")}
      </span>
    );
  }
  ```

- [ ] **Step 6: `shape.tsx` — блок C.** Импорт — было (`:116-118`):
  ```ts
  // ── AF2.1 B: (B6) чек-лист «Сделать задачами» ──
  import { checklistItemsToConvert, markConvertedItems } from "./canvas-checklist";
  // ── /AF2.1 B ──
  ```
  стало:
  ```ts
  // ── AF2.1 B: (B6) чек-лист «Сделать задачами» ──
  import { checklistItemsToConvert, markConvertedItems } from "./canvas-checklist";
  // ── /AF2.1 B ──
  // ── AF2.2 C: (C2) метки «изменено» / «добавлено» на карточках ──
  import { PpmChangeChip } from "./living-map/change-chips";
  // ── /AF2.2 C ──
  ```
  (если M уже вставил свой блок сразу после B6 — блок C идёт сразу после блока B6, перед блоком M; порядок блоков неважен.)
  `PpmCanvasNodeShapeUtil.component()` — было (`:244-246`):
  ```tsx
    override component(shape: TPpmCanvasShape) {
      return <PpmCanvasNodeCard shape={shape} />;
    }
  ```
  стало:
  ```tsx
    override component(shape: TPpmCanvasShape) {
      return (
        <>
          <PpmCanvasNodeCard shape={shape} />
          {/* ── AF2.2 C: (C2) метка «изменено/добавлено» — рядом с карточкой: у карточки overflow: hidden ── */}
          <PpmChangeChip shape={shape} />
          {/* ── /AF2.2 C ── */}
        </>
      );
    }
  ```
  (`.tl-shape` tldraw — `overflow: visible`, поэтому метка над рамкой видна; `PpmCanvasNodeCard` не меняется — в нём правит M.)

- [ ] **Step 7: Стили метки** — `living-map/living-map.css`, в конец блока C. Было:
  ```css
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .tl-container:has(.ppm-changes-panel) ~ .ppm-canvas-inspector {
    display: none;
  }

  /* ── /C ── */
  ```
  стало:
  ```css
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .tl-container:has(.ppm-changes-panel) ~ .ppm-canvas-inspector {
    display: none;
  }

  /* AF2.2 C2 · метка «изменено» / «добавлено» над верхней рамкой карточки: сосед HTMLContainer внутри .tl-shape
     (overflow: visible), клики не берёт. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-change-chip {
    position: absolute;
    z-index: 1;
    top: -0.625rem;
    right: 0.75rem;
    display: inline-flex;
    height: 1.25rem;
    align-items: center;
    gap: 0.25rem;
    padding: 0 0.5rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-full, 999px);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-2, var(--bg-surface-2));
    font-size: 0.6875rem;
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-change-chip__dot {
    width: 0.375rem;
    height: 0.375rem;
    border-radius: 50%;
    background: currentColor;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-change-chip[data-mark="added"] .ppm-change-chip__dot {
    background: var(--ppm-color-accent, var(--txt-accent-primary));
  }

  /* ── /C ── */
  ```

- [ ] **Step 8: Запустить — проходит**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/living-map-changes-chips.test.ts tests/ppm-canvas/living-map-changes.test.ts tests/ppm-canvas/living-map-changes-panel.test.ts`
  → `Test Files 3 passed (3)`, `Tests 38 passed (38)`; затем весь web (`card-grammar.test.ts`, `af21-foundation.test.ts`,
  `af22-foundation.test.ts` — зелёные).

- [ ] **Step 9: Проверки** — web tsc без вывода; oxlint — то же число, `0 errors`; формат:
  `cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/components/ppm-canvas/living-map/change-chips.tsx core/components/ppm-canvas/living-map/changes-model.ts core/components/ppm-canvas/shape.tsx tests/ppm-canvas/living-map-changes-chips.test.ts`.

**Acceptance (C2):**
- [ ] После правки задачи в Plane и возврата на доску (или через 60 с при открытой панели) у её карточки — «• изменено»
  над верхней рамкой справа; у новой карточки/секции — «• добавлено» (точка акцентного цвета); у стикеров и фигур меток нет.
- [ ] «Отметить просмотренным» — все метки пропадают сразу; у другого пользователя остаются, пока он не отметит.
- [ ] Метка не перехватывает щелчки и перетаскивание карточки; панорама и масштаб не перерисовывают карточки (Profiler);
  v1 — меток нет.

---

### Task C3: «На карте» в задаче

**Files:**
- Create: `apps/web/core/components/issues/issue-detail/ppm-canvas-boards.tsx`
- Modify: `apps/web/core/services/ppm-canvas-changes.service.ts` (S4), `packages/ppm-brand/src/translations/af22-living-map.ts`
  (блок `// ── T:`), `apps/web/core/components/issues/issue-detail/sidebar.tsx` (импорт `:43`, после «Метки» `:243-251`),
  `apps/web/core/components/issues/peek-overview/properties.tsx` (импорт `:44`, после «Метки» `:250-253`)
- Rebuild: `packages/ppm-brand/dist`
- Test: `apps/web/tests/ppm-canvas/issue-canvas-boards.test.ts`

**Interfaces:**
- Consumes: C1 — `PpmCanvasChangesService` (`boardPath`/`projectPath`, `normalizeChangesError`); F — `canvasShapeLinkPath`
  (`living-map/shape-link.ts`); существующее — `SidebarPropertyListItem` (`icon: React.FC<{ className?: string }>`, `label`,
  `children`), `useWorkspace().getWorkspaceBySlug(slug)?.id`, `usePpmDesignV2()`, `isPpmCanvasEnabled`, `isPpmShellEnabled`,
  `fillCanvasTemplate`, `next/link` (compat → react-router `Link`).
- Produces: `PpmCanvasChangesService.getWorkItemBoards(ws, pid, workItemId): Promise<{ results: TPpmWorkItemBoard[] }>`,
  `ppmWorkItemBoardsResponseSchema`, `TPpmWorkItemBoard`; `PpmIssueCanvasBoards({ issueId, projectId, workspaceSlug })`;
  ключи `issue.canvas_boards.label`, `issue.canvas_boards.open`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  $T/af22-pre.sh apps/web/core/components/issues/issue-detail/ppm-canvas-boards.tsx \
    apps/web/core/components/issues/issue-detail/sidebar.tsx \
    apps/web/core/components/issues/peek-overview/properties.tsx \
    apps/web/tests/ppm-canvas/issue-canvas-boards.test.ts
  ```

- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/issue-canvas-boards.test.ts`:
  ```ts
  // AF2.2 C3: «На карте» в задаче — доски, где она лежит живой карточкой (S4), ссылка — глубокая ссылка F (открыть доску и
  // выделить карточку); только облик v2; пусто или ошибка — строки нет; место — сразу после «Метки» в боковой панели и в
  // превью; строки блока T (en/ru).
  import { readFileSync } from "node:fs";
  import { describe, expect, it, vi } from "vitest";
  import { getPpmTranslation, PPM_TRANSLATIONS } from "@ppm/brand";
  import { PpmCanvasChangesService } from "@/services/ppm-canvas-changes.service";
  import { PpmCanvasServiceError } from "@/services/ppm-canvas.service";

  const WS = "22222222-2222-4222-8222-222222222222";
  const PROJECT = "33333333-3333-4333-8333-333333333333";
  const TASK = "77777777-7777-4777-8777-777777777777";
  const MAP = "44444444-4444-4444-8444-444444444444";
  const RESEARCH = "44444444-4444-4444-8444-000000000002";
  const read = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");
  const component = read("components/issues/issue-detail/ppm-canvas-boards.tsx");
  const sidebar = read("components/issues/issue-detail/sidebar.tsx");
  const peek = read("components/issues/peek-overview/properties.tsx");

  describe("«На карте» in the task (AF2.2 C3)", () => {
    it("asks S4 for the boards of the task, one row per board", async () => {
      const service = new PpmCanvasChangesService();
      const results = [
        { board_id: MAP, name: "Карта · Спринт 3", shape_id: "shape:1" },
        { board_id: RESEARCH, name: "Исследование", shape_id: "shape:2" },
      ];
      const get = vi.spyOn(service, "get").mockResolvedValue({ data: { results } } as never);
      await expect(service.getWorkItemBoards(WS, PROJECT, TASK)).resolves.toEqual({ results });
      expect(get).toHaveBeenCalledWith(
        `/api/ppm/v1/workspaces/${WS}/projects/${PROJECT}/canvas/work-items/${TASK}/boards/`
      );
    });

    it("turns «задача невидима» (404) into a service error the row swallows", async () => {
      const service = new PpmCanvasChangesService();
      vi.spyOn(service, "get").mockRejectedValue(
        Object.assign(new Error("Request failed"), {
          isAxiosError: true,
          response: {
            status: 404,
            data: {
              error: {
                code: "WORK_ITEM_NOT_FOUND",
                message: "Задача не найдена.",
                request_id: "99999999-9999-4999-8999-999999999999",
                details: {},
              },
            },
          },
        })
      );
      await expect(service.getWorkItemBoards(WS, PROJECT, TASK)).rejects.toBeInstanceOf(PpmCanvasServiceError);
      expect(component).toMatch(/catch \{[\s\S]*?if \(active\) setBoards\(\[\]\);/);
    });

    it("renders only under the v2 look, with the canvas on, and only when the task lies on a board", () => {
      expect(component).toContain("const designV2 = usePpmDesignV2();");
      expect(component).toContain("if (!designV2 || !CANVAS_ENABLED || !workspaceId) return;");
      expect(component).toContain("if (!designV2 || boards.length === 0) return null;");
      // Lane F's deep link (shape-link.ts): …/brain?board=<id>&shape=<shape_id> selects the card on that board.
      expect(component).toContain('import { canvasShapeLinkPath } from "@/components/ppm-canvas/living-map/shape-link";');
      expect(component).toContain("href={canvasShapeLinkPath(workspaceSlug, projectId, board.board_id, board.shape_id)}");
    });

    it("sits right after «Метки» in the details sidebar and in the peek", () => {
      const mount =
        /label=\{t\("common\.labels"\)\}>[\s\S]*?<\/SidebarPropertyListItem>\s*\{\/\* ── AF2\.2 C: [^\n]*── \*\/\}\s*<PpmIssueCanvasBoards\s+workspaceSlug=\{workspaceSlug\}\s+projectId=\{projectId\}\s+issueId=\{issueId\}\s*\/>\s*\{\/\* ── \/AF2\.2 C ── \*\/\}/;
      expect(sidebar).toMatch(mount);
      expect(peek).toMatch(mount);
    });

    it("says «На карте» in both languages (block T)", () => {
      const keys = (locale: "en" | "ru") =>
        new Set(Object.keys(PPM_TRANSLATIONS[locale]).filter((key) => key.startsWith("issue.canvas_boards.")));
      expect(keys("ru")).toEqual(keys("en"));
      expect(keys("ru").size).toBe(2);
      expect(getPpmTranslation("ru", "issue.canvas_boards.label")).toBe("На карте");
      expect(getPpmTranslation("en", "issue.canvas_boards.label")).toBe("On the map");
    });
  });
  ```

- [ ] **Step 3: Запустить — падает**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/issue-canvas-boards.test.ts`
  → FAIL: `ENOENT … issue-detail/ppm-canvas-boards.tsx` (и `service.getWorkItemBoards is not a function`).

- [ ] **Step 4: Сервис — S4** — `ppm-canvas-changes.service.ts`. После строки
  `export type TPpmBoardSeen = z.infer<typeof ppmBoardSeenSchema>;` (и пустой строки) вставить:
  ```ts
  export const ppmWorkItemBoardsResponseSchema = z.object({
    results: z.array(z.object({ board_id: z.string().uuid(), name: z.string(), shape_id: z.string().min(1) })),
  });
  export type TPpmWorkItemBoard = z.infer<typeof ppmWorkItemBoardsResponseSchema>["results"][number];
  ```
  В классе перед `  private boardPath(` вставить (с пустой строкой после):
  ```ts
    async getWorkItemBoards(
      workspaceId: string,
      projectId: string,
      workItemId: string
    ): Promise<{ results: TPpmWorkItemBoard[] }> {
      try {
        const response = await this.get(
          `${this.projectPath(workspaceId, projectId)}/canvas/work-items/${workItemId}/boards/`
        );
        return ppmWorkItemBoardsResponseSchema.parse(response.data);
      } catch (error) {
        throw normalizeChangesError(error);
      }
    }
  ```

- [ ] **Step 5: Строки блока T** — `af22-living-map.ts`. Было (en):
  ```ts
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
    ru: {
  ```
  стало (en):
  ```ts
      // ── T: «На карте» в задаче (пишет линия C) ──
      "issue.canvas_boards.label": "On the map",
      "issue.canvas_boards.open": "Open the board “{name}” and show the task",
    },
    ru: {
  ```
  Было (ru):
  ```ts
      // ── T: «На карте» в задаче (пишет линия C) ──
    },
  } as const;
  ```
  стало (ru):
  ```ts
      // ── T: «На карте» в задаче (пишет линия C) ──
      "issue.canvas_boards.label": "На карте",
      "issue.canvas_boards.open": "Открыть доску «{name}» и показать задачу",
    },
  } as const;
  ```
  Затем `$T/af22-pkg-build.sh ppm-brand` и oxfmt файла переводов.

- [ ] **Step 6: Компонент** — `apps/web/core/components/issues/issue-detail/ppm-canvas-boards.tsx` (новый):
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useMemo, useState } from "react";
  import { observer } from "mobx-react";
  import { Network } from "lucide-react";
  import Link from "next/link";
  import { isPpmShellEnabled } from "@ppm/brand";
  import { isPpmCanvasEnabled } from "@ppm/canvas";
  import { SidebarPropertyListItem } from "@/components/common/layout/sidebar/property-list-item";
  import { fillCanvasTemplate } from "@/components/ppm-canvas/canvas-grammar";
  import { canvasShapeLinkPath } from "@/components/ppm-canvas/living-map/shape-link";
  import { useWorkspace } from "@/hooks/store/use-workspace";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { usePpmDesignV2 } from "@/lib/ppm-design";
  import { PpmCanvasChangesService, type TPpmWorkItemBoard } from "@/services/ppm-canvas-changes.service";

  const CANVAS_ENABLED = isPpmCanvasEnabled(
    process.env.PPM_CANVAS_ENABLED,
    isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED)
  );

  function CanvasBoardsIcon({ className }: { className?: string }) {
    return <Network aria-hidden="true" className={className} />;
  }

  type TPpmIssueCanvasBoardsProps = {
    issueId: string;
    projectId: string;
    workspaceSlug: string;
  };

  // AF2.2 C3 · «На карте»: доски Холста, где задача лежит живой карточкой (S4 — по строке на доску, только читаемые, без
  // архивных, с проверкой видимости задачи). Только облик v2 и включённый Холст; пусто или ошибка — строки нет вовсе.
  // Ссылка открывает доску и выделяет карточку (глубокая ссылка F: canvasShapeLinkPath → ?board=…&shape=…).
  export const PpmIssueCanvasBoards = observer(function PpmIssueCanvasBoards({
    issueId,
    projectId,
    workspaceSlug,
  }: TPpmIssueCanvasBoardsProps) {
    const designV2 = usePpmDesignV2();
    const ppmT = usePpmTranslation();
    const { getWorkspaceBySlug } = useWorkspace();
    const workspaceId = getWorkspaceBySlug(workspaceSlug)?.id;
    const service = useMemo(() => new PpmCanvasChangesService(), []);
    const [boards, setBoards] = useState<TPpmWorkItemBoard[]>([]);

    useEffect(() => {
      setBoards([]);
      if (!designV2 || !CANVAS_ENABLED || !workspaceId) return;
      let active = true;
      const load = async () => {
        try {
          const response = await service.getWorkItemBoards(workspaceId, projectId, issueId);
          if (active) setBoards(response.results);
        } catch {
          // Задача невидима (404), Холст выключен на сервере или сеть — строки «На карте» просто нет.
          if (active) setBoards([]);
        }
      };
      void load();
      return () => {
        active = false;
      };
    }, [designV2, issueId, projectId, service, workspaceId]);

    if (!designV2 || boards.length === 0) return null;
    return (
      <SidebarPropertyListItem icon={CanvasBoardsIcon} label={ppmT("issue.canvas_boards.label")}>
        <ul className="flex w-full min-w-0 flex-col">
          {boards.map((board) => (
            <li key={board.board_id} className="min-w-0">
              <Link
                href={canvasShapeLinkPath(workspaceSlug, projectId, board.board_id, board.shape_id)}
                className="flex h-7.5 items-center truncate px-2 text-body-xs-regular text-primary hover:underline"
                title={fillCanvasTemplate(ppmT("issue.canvas_boards.open"), { name: board.name })}
              >
                {board.name}
              </Link>
            </li>
          ))}
        </ul>
      </SidebarPropertyListItem>
    );
  });
  ```
  (Классы — утилиты темы PPM, уже используемые в этой панели; `living-map.css` вне Холста не загружен. Аудит Tailwind
  проверяет этот файл — F добавил его в `extraFiles`.)

- [ ] **Step 7: Боковая панель задачи** — `issues/issue-detail/sidebar.tsx`. Импорт — было (`:43`):
  ```ts
  import { IssueModuleSelect } from "./module-select";
  ```
  стало:
  ```ts
  import { IssueModuleSelect } from "./module-select";
  // ── AF2.2 C: (C3) «На карте» ──
  import { PpmIssueCanvasBoards } from "./ppm-canvas-boards";
  // ── /AF2.2 C ──
  ```
  После «Метки» — было (`:243-251`):
  ```tsx
              <SidebarPropertyListItem icon={LabelPropertyIcon} label={t("common.labels")}>
                <IssueLabel
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  issueId={issueId}
                  disabled={!isEditable}
                />
              </SidebarPropertyListItem>
            </div>
  ```
  стало:
  ```tsx
              <SidebarPropertyListItem icon={LabelPropertyIcon} label={t("common.labels")}>
                <IssueLabel
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  issueId={issueId}
                  disabled={!isEditable}
                />
              </SidebarPropertyListItem>

              {/* ── AF2.2 C: (C3) «На карте» — доски, где задача лежит живой карточкой; только облик v2 ── */}
              <PpmIssueCanvasBoards workspaceSlug={workspaceSlug} projectId={projectId} issueId={issueId} />
              {/* ── /AF2.2 C ── */}
            </div>
  ```

- [ ] **Step 8: Превью задачи** — `issues/peek-overview/properties.tsx`. Импорт — было (`:44`):
  ```ts
  import { IssueModuleSelect } from "../issue-detail/module-select";
  ```
  стало:
  ```ts
  import { IssueModuleSelect } from "../issue-detail/module-select";
  // ── AF2.2 C: (C3) «На карте» ──
  import { PpmIssueCanvasBoards } from "../issue-detail/ppm-canvas-boards";
  // ── /AF2.2 C ──
  ```
  После «Метки» — было (`:250-253`):
  ```tsx
          <SidebarPropertyListItem icon={LabelPropertyIcon} label={t("common.labels")}>
            <IssueLabel workspaceSlug={workspaceSlug} projectId={projectId} issueId={issueId} disabled={disabled} />
          </SidebarPropertyListItem>
        </div>
  ```
  стало:
  ```tsx
          <SidebarPropertyListItem icon={LabelPropertyIcon} label={t("common.labels")}>
            <IssueLabel workspaceSlug={workspaceSlug} projectId={projectId} issueId={issueId} disabled={disabled} />
          </SidebarPropertyListItem>

          {/* ── AF2.2 C: (C3) «На карте» — доски, где задача лежит живой карточкой; только облик v2 ── */}
          <PpmIssueCanvasBoards workspaceSlug={workspaceSlug} projectId={projectId} issueId={issueId} />
          {/* ── /AF2.2 C ── */}
        </div>
  ```
  (Файл в зоне аудита бренда: добавленные строки не содержат слова «plane».)

- [ ] **Step 9: Запустить — проходит**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/issue-canvas-boards.test.ts tests/ppm-canvas/living-map-changes.test.ts tests/ppm-canvas/living-map-changes-panel.test.ts tests/ppm-canvas/living-map-changes-chips.test.ts`
  → `Test Files 4 passed (4)`, `Tests 43 passed (43)`; затем весь web.

- [ ] **Step 10: Проверки** — web tsc без вывода; oxlint — то же число, `0 errors`; brand (оба аудита: `PPM user-facing
  brand audit passed`, `PPM Tailwind class audit passed`); формат:
  `cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/services/ppm-canvas-changes.service.ts core/components/issues/issue-detail/ppm-canvas-boards.tsx core/components/issues/issue-detail/sidebar.tsx core/components/issues/peek-overview/properties.tsx tests/ppm-canvas/issue-canvas-boards.test.ts`.

**Acceptance (C3):**
- [ ] Облик v2: в задаче, лежащей на досках, под «Метки» — строка «На карте» с названиями досок (боковая панель и превью);
  щелчок открывает Холст на этой доске, карточка выделена, камера у неё (масштаб прежний).
- [ ] Задача не лежит ни на одной доске, доска архивная или недоступна, задача невидима гостю — строки нет; облик v1 — строки нет.
