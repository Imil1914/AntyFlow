# AF2.2 · Линия M — «Живая карта»: сборка из спринта, связи «из Задач», «Светофор», «Не на карте»

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** одной командой собрать новую доску-карту спринта (рамка «Спринт · даты» с живой шкалой, секции направлений,
живые карточки задач сеткой), нарисовать между карточками связи Plane «из Задач», выделить «Светофором» просроченные,
заблокированные и готовые задачи (со счётчиками в секциях) и держать под рукой лоток «Не на карте» с «+ Добавить» и
«Разложить всё» — ничего не записывая в доску без нажатия.

**Architecture:**
- Линия M стартует после F2 и идёт параллельно с C (и S). Вся логика — в модулях M в `living-map/` (владение CONTRACTS §0);
  шов с редактором — только то, что опубликовала F (`drafts/plan-F.md`, таблица имён; `drafts/plan-F-notes.md`):
  контекст `usePpmLivingMap()` → `{ facts, mapSections, …поля M, args, changes, trafficLight, setTrafficLight }`,
  окружение `args: TLivingMapArgs` (`editor`, `bindingsByShapeId`, `boards`, `canEdit`, `enabled`, `isActive`, `loaded`,
  `registerBindings`, `onBoardCreated`, …). M не пишет в `editor.tsx` ничего, кроме своих размеченных блоков (импорт и
  `livingMapArgsM`), в `living-map-types.ts` — только необязательные поля в блоках `AF2.2 M`.
- Данные: хук `useLivingMapFacts(args)` (заменяет заглушку F) читает Plane одним запросом на вид (спринт рамки,
  направления, задачи спринта со связями `issues-detail?expand=issue_relation&cycle=…`, проектный список — только для
  карточек вне спринта, Git-связи проекта) — только у активной вкладки v2, при открытии, смене карточек/версий и раз в
  60 с; сводит их чистыми функциями (`map-data.ts`) в `facts`, `mapSections` и поля M (`sprint`, `modules`,
  `relationEdges`, `tray`, `placeFromTray`, `placing`). Всё, что считается, — чистые модули с тестами в env node.
- Запись в доску — только по нажатию: сборка карты (диалог старой доски создаёт **новую** доску и кладёт план в очередь
  страницы; редактор новой доски после `args.loaded && args.canEdit && args.isActive` забирает план), «+ Добавить» и
  «Разложить всё». Путь записи один: пакетная привязка S1 → фигуры одним шагом истории (`applyMapChange`) →
  `args.registerBindings(bindings)` (F: активация ближайшим сохранением, проекция сразу, автосохранение). Сбой — откат
  шага и отмена отложенных привязок.
- Отметка «просмотрено» сборщика (решение контроллера, RM14): когда сохранение новой доски активировало привязки карты,
  её редактор один раз вызывает `PUT …/boards/<id>/me/seen/` сервисом линии C (`PpmCanvasChangesService.markSeen`), —
  свежая карта не открывается с «добавлено» на каждой карточке и «Что изменилось · 50+». Ошибка молча пропускается:
  карта уже собрана. Это не запись в доску (S3 — личное состояние) и не опрос, а продолжение нажатия «Собрать карту».
- Связи «из Задач» — производные: слой (`<PpmTaskRelationsLayer />`, дочерний `<Tldraw>`, смонтирован F) рисует
  порталом в html-слой фигур tldraw — координаты страницы, камера двигает слой сама, линии под карточками, как смысловые
  связи; ни в снимок, ни в `ppm_semantic_edges` ничего не пишется.
- «Светофор»: значение переключателя и его хранение — у F (`trafficLight`/`setTrafficLight`, ключ
  `ppm:af22:traffic-light:<user>`, одно на все вкладки); M вычисляет факты (`facts`, счётчики `mapSections`), рисует
  переключатель (`.ppm-living-map-pill`), рамку и строку на живой карточке, бейджи в шапках секций.

**Tech Stack:** React 18.3 + React Router 7 + Vite, tldraw 3.15.6 (`useValue`, `createShapes`/`updateShapes`,
`markHistoryStoppingPoint`/`bailToMark`, `getCurrentPageShapesSorted`, `getSortedChildIdsForParent`, `SVGContainer`),
`@ppm/canvas` после F1 (`createPpmSprintFrameNode`, `createPpmMapSectionNode`, `getPpmCanvasMap`,
`PPM_CANVAS_GROUP_MAX_SIZE`, `TPpmCanvasGroupNode`, `TPpmCanvasMap`), `@ppm/brand` (`af22-living-map.ts`, блок M),
zod 3.25, lucide-react 0.469, vitest 4 (env node, без DOM), oxlint/oxfmt.

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.2 — Живая карта проекта: сборка из спринта, светофор, «Не на карте», «Что изменилось».md`
— разделы A–D, «Контракты и инварианты», критерии 1–3 и 6, решения R1, R2, R3, R7. Контракты линий (обязательны):
`docs/superpowers/plans/2026-09-26-af22/drafts/CONTRACTS.md`; фундамент — `drafts/plan-F.md` (+ `plan-F-notes.md` §2);
сервер S1 — `drafts/plan-S-contract-notes.md` §2. Макет: `docs/superpowers/plans/2026-09-25-af21/mockups/K5-Living-Map.png`
(+ `.dc.html`, тёмная — `K5-Living-Map-Dark.dc.html`). Нужды M к F/S/C сверх этого — `drafts/plan-M-needs.md`.

**Проверено по рабочему дереву (2026-09-26, до F):** `shape.tsx` 3467 строк `6306cf2c9b8b`, `editor.tsx` 5040
`1512d5e08c98`, `workspace.tsx` 1670 `9bfeac12cf84`, `packages/ppm-canvas/src/index.ts` 2264 `d7fbcf4793de`,
`ppm-canvas.service.ts` 584 `64f16f27b81e` (sha256, 12 знаков). F сдвинет строки — искать по строке-якорю.
- После F1/F2 (дерево на 26.09 02:10): `@ppm/canvas` — `PPM_CANVAS_GROUP_MAX_SIZE = 20_000`, `createPpmSprintFrameNode` /
  `createPpmMapSectionNode` (детерминированы: без случайных id — два вызова с одним `now` дают одну строку),
  `getPpmCanvasMap`, `TPpmCanvasSprintMap`; `editor.tsx` 5186 строк, блоки M: импорты `:239-244`, `livingMapArgsM`
  `:2760-2762`, дочерние `<Tldraw>` `:3263-3266`, `case "build-sprint-map"` `:3793-3797`, «Светофор» `:4214-4216`, лоток
  `:4225-4227`; `shape.tsx` F не трогала (якоря ниже верны; C2 добавит свой блок импортов перед
  `export const PPM_CANVAS_SHAPE_TYPE` и фрагмент в `component()`); сервис линии C1
  `apps/web/core/services/ppm-canvas-changes.service.ts` уже в дереве — `PpmCanvasChangesService.markSeen` (`:113`).
- `shape.tsx:258` `const resized = resizeBox(shape, info, { minHeight: 96, minWidth: 160, maxHeight: 1200, maxWidth: 1600 });`
  (F не трогает — ручной размер рамки карты схлопнулся бы до 1600 × 1200); `:298` `function NodeEditor`, `:593`
  `return <NativeNodeCard editor={editor} node={node} shape={shape} />;`; `:2644` `function WorkItemProjectionCard`,
  `:2657` `const [copiedLink, setCopiedLink] = useState(false);`, `:2659` ранний `return` для `!binding`, `:2680`
  `const assigneeIds = …`, `:2682-2686` корневой `<div className={grammarV2 ? "ppm-work-item-card ppm-live-card" …}`
  `data-source-status={display.source_status}>`, `:2798` `{error && <p className="ppm-work-item-card__error">{error}</p>}`.
- Живая карточка v2: контейнер `.ppm-canvas-node` несёт рамку и фон (`canvas-v2.css:220-233`, специфичность (0,5,0)),
  внутри — `.ppm-work-item-card.ppm-live-card` (сетка `auto auto auto minmax(0,1fr) auto`, `canvas-v2.css:242`).
- tldraw: шейпы в `.tl-html-layer.tl-shapes` имеют `z-index` ≥ `maxShapesPerPage * 2` (`Editor.ts:4068`), слой
  трансформирует камера (`DefaultCanvas.tsx:57-94`, прямые записи в DOM); `createShapes` принимает родителя, создаваемого
  в том же вызове (`Editor.ts:7858-7860`); `transact` откатывает изменения при исключении (`@tldraw/state transactions.ts:273-279`);
  после перетаскивания tldraw сам перевешивает карточку в группу, над которой её отпустили (`kickoutOccludedShapes`,
  `canReceiveNewChildrenOfType` у group — `shape.tsx:236`).
- Plane: строка `IssueRelation(issue=A, related_issue=B, T)` читается «A T B» (`app/views/issue/relation.py:42-105`);
  `issues-detail` принимает `expand=issue_relation`, фильтр `cycle=<id>`, `per_page ≤ 1000`
  (`views/issue/base.py:1028-1100`, `utils/issue_filters.py:320`, `utils/paginator.py:87`); связь в ответе —
  `{ id, project_id, sequence_id, name, relation_type, state_id }` (`serializers/issue.py:874-897`).
- Имя доски уникально среди активных без учёта регистра и пробелов (`ppm_canvas/services.py:84-92, 1670-1682`,
  `CANVAS_BOARD_NAME_CONFLICT` → 409), ≤ 120 знаков (`serializers.py`).
- S1 (`plan-S-contract-notes.md` §2): ответ 200 всегда, `results` строго в порядке `items`, `shape_id` ошибки может быть
  `null`; `client_operation_id` можно не передавать (сервер выводит uuid5 — повтор идемпотентен); одно сохранение
  активирует ≤ 200 привязок.

## Решения линии M (в CHANGELOG карточки)

| # | Вопрос | Решение |
|---|---|---|
| RM1 | Где рисуются связи «из Задач» | Лист `<Tldraw>` (точка F) рисует **порталом** в `.tl-html-layer.tl-shapes` редактора: координаты страницы, пан/зум двигает трансформация tldraw (без React), линии под карточками (как `OnTheCanvas` смысловых связей). Имя класса слоя закреплено тестом по исходнику tldraw 3.15.6 |
| RM2 | Где собирается карта | Диалог (доска, откуда нажали) читает спринт и направления, планирует раскладку (id фигур заранее), создаёт **новую** доску «Карта · …» (`args.onBoardCreated`) и кладёт план в очередь страницы; `PpmSprintMapDialog` редактора новой доски после `args.loaded && args.canEdit && args.isActive` забирает план один раз: S1 → фигуры → `registerBindings`. Пустой спринт — доска не создаётся. Новая доска не пуста (защита) — план не применяется |
| RM3 | Состав и раскладка | Секции — только направления с задачами спринта, по названию (`ru`), «Без направления» — последней; задачи — по номеру; ячейка 360 × 248 (размер живой карточки), 4 колонки, зазор 16, поля секции 16, шапка секции 48, шапка рамки 64, поля рамки 24, между секциями 24. Секции — дети рамки, карточки — дети секций (tldraw `parentId`) |
| RM4 | Больше 200 задач | Карта берёт первые 200 по порядку секций, остальные — в «Не на карте» (S1 ≤ 200; одно сохранение активирует ≤ 200). «Разложить всё» — тоже ≤ 200 за нажатие |
| RM5 | Тело секции | Прозрачное, рамка 1 px + засечки секции; связи рисуются под фигурами — заливка скрыла бы их внутри секции (осознанное отличие от светлой заливки K5) |
| RM6 | «K из T задач готово» | Из спринта Plane (`completed_issues`/`total_issues`, как страница «Спринты»); пока спринт не прочитан — по карточкам рамки (`mapSections`). День — `computePpmSprintScale` |
| RM7 | Имя доски | «Карта · {спринт}», занято — «(2)», «(3)»… (сравнение как `normalize_board_name`); ≤ 120 знаков; 409 от сервера — следующий номер, до 5 попыток |
| RM8 | Направление связей | Линия от связанной задачи B к задаче-владельцу строки A: `blocked_by` → «Блокирует» (⊣ у заблокированной), `start_before`/`finish_before` → «Зависит от» (стрелка к той, от которой зависит), `implemented_by` → «Реализует», `relates_to` — без направления, одна линия на пару; `duplicate` — не рисуется. Задача на доске дважды — связь к карточке с меньшим id |
| RM9 | Данные Plane | Спринт карты — `issues-detail?cycle=<id>&expand=issue_relation` (один запрос); проектный список (последние 1000 по обновлению) — только если на доске есть задачи вне спринта или нет рамки; статус блокирующей — свежий статус её карточки на доске, иначе `work_item_options.states`; чужой проект (статус неизвестен) — «незавершённая», как в «Задачах» |
| RM10 | «Светофор» | completed → «готова» (приглушена) важнее всего; cancelled — без выделения; есть незавершённая блокирующая → «заблокирована {ID}»; срок раньше сегодняшней местной даты → «просрочено · {дата}». Рамка карточки — правилом `:has()` у контейнера (подписана только карточка задачи) |
| RM11 | «Не на карте» | Задачи спринта без карточки и активные PR этих задач без карточки PR (сравнение по `git_object_id` и id связи); сначала задачи по номеру, затем PR. Раскладка по свежему состоянию доски после ответа S1: первая свободная ячейка секции направления без наложений; не хватает — секция растёт на ряд, всё ниже в рамке сдвигается, рамка растёт; нет секции — новая внизу рамки. Новые карточки не выделяются (иначе инспектор v2 закрыл бы лоток), камера подводится к первой, если она вне экрана |
| RM12 | Шапки | Название спринта/направления — живое (Plane), `title` узла — запас на время загрузки; «Без направления» — всегда на языке интерфейса; бейджи счётчиков — только при включённом «Светофоре» |
| RM13 | Диалог | Портал в `body`, корень `data-ppm-canvas-grammar="v2"` + `data-ppm-canvas-modal`; ловушка Tab, Escape — `e.code`; пока открыт — редактор tldraw выключен (`syncCanvasEditorFocus`); закрывается, если вкладка перестала быть активной |
| RM14 | «Что изменилось» у сборщика новой карты | Решение контроллера: после успешного сохранения новой карты — одна личная отметка S3 (`PpmCanvasChangesService.markSeen`, сервис C1). «Сохранено» = каждая привязка, положенная сборкой и всё ещё лежащая на доске, стала `active` в `args.bindingsByShapeId`: `editor.tsx` (`flushSave`) помечает так только привязки успешно сохранённого запроса, а при 409 отменяет их — `active` они не станут. Ошибка отметки — молча. Нет ни одной живой карточки (S1 отказал целиком) — отметки нет (ждать нечего, «добавлено» будет только у рамки). Раскладка из лотка отметку не ставит |
| RM15 | «Отменить» сборку и удаление секции карты | Сборка — один шаг истории (спецификация A), но живые карточки AF2.1 защищены от удаления (обработчик `beforeDelete` в `editor.tsx`), а tldraw удаляет группу вместе с потомками (`deleteShapes`, откат `applyDiff`): без защиты «Отменить» или Delete по секции оставили бы карточки без родителя — вне страницы, невидимыми (`isShapeInPage`). Страж M (хост `PpmSprintMapDialog`, `registerBeforeDeleteHandler`, только `source === "user"`): перед удалением группы карты живые карточки внутри неё переносятся на страницу на тех же местах (`reparentShapes`). Во время «Отменить» история на паузе — перенос не записывается; «Повторить» возвращает карточки в секции. Обычные секции без `map` — как в AF2.1 (общий случай — нужда F). `applyMapChange` не трогает доску только для чтения и закреплённые (locked) рамку и секции (tldraw молча пропустил бы их правки) |

## Global Constraints (линия M)

- **Проверено прогоном:** код плана применён 26.09 по шагам M1 → M4 к копии web в песочнице (дерево с F1/F2 и текущей
  C1, `oxfmt` после каждой задачи): тесты M — 21 / 7 / 8 / 11 и гард F (18) зелёные, web целиком — +4 файла / +47 тестов,
  `tsc --noEmit` web — 0 ошибок, oxlint своих файлов — 0/0, по `core app helpers tests` — 719 (как до M), `@ppm/brand` —
  93 теста и оба аудита. Код в блоках уже в формате `oxfmt`.
- Код в блоках сдвинут ровно на отступ своей ограды ``` (2 пробела у шага, 4–5 у вложенного пункта): в файл — без него.
  «Было» встречается в своём файле один раз.
- Пути — от `plane-fork/`: `PF=/Users/ermolov/Desktop/PPM/plane-fork`, `T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools`,
  `D=apps/web/core/components/ppm-canvas`, `L=$D/living-map`.
- **Коммитов нет.** Никаких `git add` (в т.ч. `-N`), `commit`, `stash`, `reset`, `checkout`, `clean`, `rebase`.
  Перед первой правкой **или созданием** файла: `$T/af22-pre.sh <путь от plane-fork> …`.
- Владение (CONTRACTS §0): только `$L/{map-*,task-relations*,traffic-light*,not-on-map*}.ts(x)`, `$L/living-map-facts.ts`,
  `apps/web/core/services/ppm-canvas-map.service.ts`, `apps/web/tests/ppm-canvas/living-map-{assembly,relations,traffic,tray}.test.ts`
  и фикстура `apps/web/tests/ppm-canvas/fixtures/living-map.ts`; в общих файлах — только блоки `AF2.2 M`:
  `editor.tsx` (импорт, `livingMapArgsM`), `shape.tsx` (блоки создаёт M), `$L/living-map-types.ts`, `$L/living-map.css`
  (`/* ── M: … ── */ … /* ── /M ── */`), `packages/ppm-brand/src/translations/af22-living-map.ts` (блок `// ── M:`,
  en и ru). Чужие маркеры не удалять (гард `af22-foundation.test.ts` считает: `editor.tsx` M ≥ 6, типы M ≥ 4, CSS M = 1).
  Параллельно C правит те же общие файлы — перечитывать файл перед каждой правкой.
- Всё новое — только при грамматике v2: виды проверяют `usePpmLivingMap().args.enabled`, хук при `!args.enabled`
  возвращает `EMPTY_LIVING_MAP_FACTS` и ничего не запрашивает; облик v1 и минимальный режим не меняются.
- AF2.1 R19: читает Plane, слушает окно и пишет в доску только активная вкладка (`args.isActive`); запись — только по
  нажатию редактора (`args.canEdit`) и только через S1 + `args.registerBindings`. Связи «из Задач» — никогда в снимок
  и в `ppm_semantic_edges`.
- Строки — ключи `canvas.map.*`, `canvas.traffic.*`, `canvas.tray.*` в блоке M (en и ru — одинаковые наборы), без «ИИ»/AI;
  словарь PPM: «спринт», «направление», «задача», «PR» — никогда «цикл», «модуль», «представление»
  (`i18n-overlay.test.ts`). После правки — `$T/af22-pkg-build.sh ppm-brand`.
- Горячие клавиши — только `e.code` (M добавляет лишь Escape/Tab внутри своего диалога).
- CSS — каждый селектор начинается с `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]`, без запятых
  внутри `:where(...)`; у каждого `var(--ppm-…)` — фолбэк; кегль ≥ 0.6875rem; текст ≥ 4,5:1, смысловые линии ≥ 3:1 (токены
  `--ppm-color-warning`, `--ppm-color-danger-line`, `--ppm-color-danger-text`, `--ppm-color-success`). Каждый класс из
  TSX линии объявлен в `living-map.css` (аудит Tailwind, `plan-F-notes.md` §1.15). Анимацию — только существующей
  `ppm-canvas-spin` (`@keyframes` ломает гард селекторов), с `prefers-reduced-motion`.
- Производительность: без перерисовок на каждом кадре камеры (слой связей не подписан на камеру; факты и счётчики —
  через строки-подписи `useValue`, меняются только при смене состава); сборка 50 задач — один S1, одно изменение доски.
- oxlint (719 предупреждений — не ухудшать): `.sort()` — только с `// oxlint-disable-next-line unicorn/no-array-sort -- …`
  (lib ES2022: нет `toSorted`); `await` в цикле — с `// oxlint-disable-next-line no-await-in-loop -- …`; каждая ветка
  `.then()` возвращает значение (`promise/always-return`); переменную-результат не называть `next`/`cb`
  (`promise/no-callback-in-promise`); полные зависимости хуков; `useEffect` без массива зависимостей с `setState` — нельзя.
- Проверки (базовая линия после AF2.1, CONTRACTS §7): свои тесты —
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/<файл>`; web целиком — `./node_modules/.bin/vitest run`;
  tsc — `./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-26-af22-living-map/web-M.tsbuildinfo 2>&1 | grep -E "ppm-canvas/|ppm-canvas-map.service|tests/ppm-canvas"`
  → пусто (чужие временные ошибки параллельной C — перечислить в отчёте); oxlint своих файлов —
  `../../node_modules/.bin/oxlint <файлы>` → `Found 0 warnings and 0 errors.`, всего —
  `../../node_modules/.bin/oxlint --max-warnings=11957 .` → `Found 719 warnings and 0 errors.`; формат —
  `../../node_modules/.bin/oxfmt <свои файлы>` (из `apps/web`; перевод — из `packages/ppm-brand`); brand —
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs`.

## Review Focus (линия M)

1. **Несколько вкладок и передача плана.** План новой карты забирает только редактор её доски — активный, загруженный,
   редактируемый, — ровно один раз; диалог открывается только у активной вкладки и закрывается при уходе с неё; лоток
   действует только в активной вкладке у редактора. Тесты: M1 «hands the plan to the new board's editor exactly once» и
   «assembles only in the loaded, editable, active tab of the new board»; M4 «places only for an editor of the active tab».
2. **Частичные отказы S1 и откат.** Часть задач не привязалась — карта из остальных, отказавшие видны в «Не на карте»;
   фигуры не легли (доска стала только для чтения) — шаг истории откатывается, отложенные привязки отменяются, в
   `registerBindings` ничего не уходит; отметка «просмотрено» (RM14) — только после сохранения, активировавшего карточки
   новой карты, ровно один раз, её ошибка не видна; «Отменить» сборку и Delete по секции карты не теряют живые карточки
   (RM15). Тесты: M1 «binds … one change», «keeps the board untouched …», «marks the new map as seen only after the save
   that activated its cards», «keeps live cards on the page when a map group is deleted or the assembly is undone»;
   M4 «cancels bindings whose card cannot be drawn …».
3. **Доска изменилась во время запроса.** Пока шёл S1, кто-то положил карточку в ту же секцию — раскладка по свежему
   состоянию, без наложения. Тест: M4 «plans against the board as it is after the request».
4. **Большие спринты и секции выше 1200.** 205 задач — на карте 200, остальные в лотке; секция 30 задач (2160 px) —
   валидный узел (предел группы F — 20 000) и ручное изменение её размера не схлопывает её до 1200. Тесты: M1
   «puts at most 200 tasks …», «lets a map group be resized past the card limit …».
5. **Читатель, v1 и «ничего само».** Читатель видит лоток без кнопок; при `args.enabled === false` хук пуст и без запросов;
   открытие доски только читает. Тесты: M4 «shows the tray to readers without buttons»; M1 «reads nothing for a board
   without a map or live cards»; M2 «never writes the links …».

## Карта файлов линии M

| Файл | Задача | Ответственность |
|---|---|---|
| `apps/web/core/services/ppm-canvas-map.service.ts` | M1 | S1 `bindBatch`, чтение Plane (спринты, спринт, направления, задачи со связями, PR), `createLivingMapLoaders` |
| `$L/map-model.ts` | M1 | Схемы данных Plane, выбор спринта, имя доски, группировка R7, склонения, роли групп карты, пределы размера, страж удаления групп карты (RM15), типы полей M |
| `$L/map-layout.ts` | M1, M4 | Раскладка карты (M1), свободная ячейка и рост секций для лотка (M4) |
| `$L/map-shapes.ts` | M1, M4 | Частичные фигуры tldraw из узлов, одно изменение доски с откатом, подвод камеры (M1); чтение карты с доски и изменение для лотка (M4) |
| `$L/map-assembly.ts`, `$L/map-assembly-queue.ts` | M1 | План карты, создание доски, сборка на новой доске, отметка «просмотрено» после сохранения (RM14); очередь страницы |
| `$L/map-assembly-dialog.tsx` | M1 | `openSprintMapDialog`, `PpmSprintMapDialog` (диалог + сборка из очереди + отметка RM14 + страж RM15) — вместо заглушки F |
| `$L/map-group-card.tsx` | M1 | Шапки рамки спринта и секций (ветка `map` в `shape.tsx`) |
| `$L/map-data.ts` | M1–M4 | Загрузка и сведение данных: подписи карточек и групп, `mapSections`, спринт, связи, факты, лоток |
| `$L/living-map-facts.ts` | M1, M4 | `useLivingMapFacts(args)` — вместо заглушки F |
| `$L/task-relations.ts`, `$L/task-relations-layer.tsx` | M2 | Связи Plane → линии; слой (вместо заглушки F) |
| `$L/traffic-light.ts`, `$L/traffic-light-toggle.tsx`, `$L/traffic-light-line.tsx` | M3 | Правила «Светофора» и факты; переключатель (вместо заглушки F); строка на карточке |
| `$L/not-on-map.ts`, `$L/not-on-map-tray.tsx` | M4 | Пункты лотка, запросы раскладки, раскладка; лоток (вместо заглушки F) |
| `$D/shape.tsx` | M1, M3 | Блоки M: импорт, предел `onResize`, ветка `map`; «Светофор» у живой карточки |
| `$D/editor.tsx` | M1 | Блоки M: импорт `useProject`, `livingMapArgsM` |
| `$L/living-map-types.ts` | M1 | Необязательные поля M в `TWorkItemFacts`, `TLivingMapFacts`, `TLivingMapArgs` |
| `$L/living-map.css` | M1–M4 | Блок `/* ── M ── */` |
| `packages/ppm-brand/src/translations/af22-living-map.ts` | M1–M4 | Блок `// ── M:` |
| `apps/web/tests/ppm-canvas/fixtures/living-map.ts` | M1 | Общие данные тестов M |

---

### Task M1: «Собрать карту спринта» — диалог, новая доска, раскладка, сборка на новой доске, шапки рамки и секций

**Files:**
- Create: `apps/web/core/services/ppm-canvas-map.service.ts`; `$L/map-model.ts`, `$L/map-layout.ts`, `$L/map-shapes.ts`,
  `$L/map-assembly.ts`, `$L/map-assembly-queue.ts`, `$L/map-group-card.tsx`, `$L/map-data.ts`.
- Replace (заглушки F, имена и сигнатуры прежние): `$L/map-assembly-dialog.tsx`, `$L/living-map-facts.ts`.
- Modify: `$L/living-map-types.ts` (три блока `AF2.2 M`), `$D/editor.tsx` (блок импортов M, блок `livingMapArgsM`),
  `$D/shape.tsx` (новые блоки M: импорт, `onResize`, ветка в `NodeEditor`), `$L/living-map.css` (блок M),
  `packages/ppm-brand/src/translations/af22-living-map.ts` (блок M).
- Test: `apps/web/tests/ppm-canvas/living-map-assembly.test.ts`, фикстура `apps/web/tests/ppm-canvas/fixtures/living-map.ts`.

**Interfaces:**
- Consumes (F, после F2 и сборки `dist`): `createPpmSprintFrameNode({ authorId, cycleId, title, width?, height?, now? })`,
  `createPpmMapSectionNode({ authorId, moduleId: string | null, title, width?, height?, now? })` → `TPpmCanvasGroupNode`;
  `getPpmCanvasMap(node)`, `TPpmCanvasMap`, `TPpmCanvasSprintMap`, `PPM_CANVAS_GROUP_MAX_SIZE` (`@ppm/canvas`);
  `usePpmLivingMap()` (`living-map-context.ts`), `TLivingMapArgs`, `TLivingMapFacts`, `TWorkItemFacts`,
  `TMapSectionSummary`, `EMPTY_LIVING_MAP_FACTS` (`living-map-types.ts`); `args.registerBindings`, `args.onBoardCreated`,
  `args.boards`, `args.loaded`; обработчик F в `CanvasControls`: `case "build-sprint-map": if (canEdit && grammarV2)
  openSprintMapDialog({ boardId })`; `<PpmSprintMapDialog />` смонтирован F дочерним `<Tldraw>`; ключ
  `canvas.af22.sprint_map` (заголовок диалога). Существующие: `PpmCanvasService.createBoard`, `cancelPendingBinding`
  (`ppm-canvas.service.ts`), `formatPpmSprintRange`, `computePpmSprintScale` (`ppm-tasks/sprint.ts`),
  `syncCanvasEditorFocus` (`file-preview.tsx`), `fillCanvasTemplate`, `LiveGlyph`, `useProject().getProjectIdentifierById`,
  `setContentNotice` (блок AF2.1 B1 `editor.tsx`), `workItemOptions` (`editor.tsx`), S1 (`plan-S-contract-notes.md` §2).
  Линия C (C1): `new PpmCanvasChangesService().markSeen(workspaceId, projectId, boardId): Promise<TPpmBoardSeen>`
  (`apps/web/core/services/ppm-canvas-changes.service.ts`, `PUT …/canvas/boards/<id>/me/seen/` с `{}`; ошибки —
  `PpmCanvasServiceError`).
- Produces:
  - сервис: `PpmCanvasMapService` (`bindBatch`, `getCycles`, `getCycle`, `getModules`, `getIssues`, `getPullRequests`),
    `createLivingMapLoaders`, `PPM_CANVAS_BATCH_LIMIT = 200`, `MAP_ISSUES_PAGE_SIZE = 1000`, типы
    `TPpmCanvasBatchBindingItem { entity_id, entity_type, shape_id }`, `TPpmCanvasBatchBindingResult`;
  - `map-model.ts`: схемы `mapIssueSchema`, `mapCycleSchema`, `mapModuleSchema`, `mapPullRequestSchema`, `parseMapList`;
    `dateOnly`, `localDateKey`, `selectSprintCandidates`, `SPRINT_MAP_COMPLETED_DAYS = 60`, `uniqueMapBoardName`,
    `normalizeMapBoardName`, `groupSprintTasks`, `primaryModuleId`, `NO_DIRECTION_KEY`, `pluralKey`, `shapeNodeJson`,
    `readMapRole`, `mapGroupsOf`, `sprintFrameOf`, `encodeMapGroups`, `decodeMapGroups`, `ppmCanvasResizeLimits`,
    `EMPTY_LIVING_MAP_TRAY`; RM15 — `isLiveCardNode(node: string | null): boolean`,
    `mapGroupRescueIds(groupNode, groupId, childrenOf): string[]`, тип `TMapGuardShape`; типы `TMapIssue`, `TMapCycle`, `TMapModule`, `TMapPullRequest`, `TSprintCandidate`,
    `TSprintPhase`, `TMapTaskGroup`, `TMapShapeRef`, `TMapGroup`, `TSprintFrame`, `TLivingMapCard`, `TTaskLinkKind`,
    `TTaskRelationEdge`, `TLivingMapSprint`, `TNotOnMapItem`, `TLivingMapTray`, `TMapPlacementRequest`, `TPlaceOnMapResult`;
  - `map-layout.ts`: `MAP_LAYOUT`, `MAP_SECTION_WIDTH` (1520), `MAP_FRAME_WIDTH` (1568), `sectionRows`, `sectionHeight`,
    `cellOrigin`, `layoutSprintMap`, типы `TMapPoint`, `TMapBox`, `TSprintMapLayout`;
  - `map-shapes.ts`: `TMapShapeChange { create, moves, update }`, `mapCardShape`, `liveCardNode`, `buildSprintMapChange`,
    `applyMapChange`, `revealSprintMap`, `TSprintMapSectionShapes`;
  - `map-assembly.ts`: `planSprintMap`, `buildSprintMapBoard`, `assembleSprintMap`, `isBoardNameConflict`,
    `MAP_ASSEMBLY_LIMIT`, типы `TSprintMapPlan`, `TSprintMapBuildDeps`, `TSprintMapBuildResult`, `TSprintMapAssemblyDeps`;
    RM14 — `sprintMapSaved(cards: readonly TPlacedMapCard[], bindingsByShapeId): boolean`,
    `createSeenAfterSave(markSeen: () => Promise<unknown>): TSeenAfterSave` (`expect(bindings)`, `check(bindingsByShapeId)`),
    типы `TPlacedMapCard { bindingId, shapeId }`, `TSeenAfterSave`;
    `map-assembly-queue.ts`: `queueSprintMapAssembly`, `hasSprintMapAssembly`, `takeSprintMapAssembly`;
  - `map-assembly-dialog.tsx`: `TPpmSprintMapDialogRequest`, `openSprintMapDialog`, `closeSprintMapDialog`,
    `PpmSprintMapDialog`, `TSprintMapDialogDeps`;
  - `map-data.ts`: `TLivingMapLoaders`, `TLivingMapRequest`, `TLivingMapData`, `EMPTY_LIVING_MAP_DATA`,
    `liveCardsSignature`, `liveCardsFromSignature`, `boardWorkItemIds`, `livingMapLoadKey`, `loadLivingMapData`,
    `summarizeMapGroups`, `computeLivingMapView`, `TLivingMapViewInput`, `TLivingMapView`;
  - `map-group-card.tsx`: `LivingMapGroupCard`; `living-map-facts.ts`: `useLivingMapFacts`;
  - поля M: `TWorkItemFacts.dueDate?`, `TLivingMapFacts.{modules?, placeFromTray?, placing?, relationEdges?, sprint?, tray?}`,
    `TLivingMapArgs.{notify?, projectIdentifier?, workItemOptions?}`; класс-фикстура тестов M.

- [ ] **Step 0: Проверить фундамент F** (без него — стоп, статус NEEDS_CONTEXT, ничего не обходить приведениями):
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork
  grep -c "createPpmSprintFrameNode\|createPpmMapSectionNode\|getPpmCanvasMap\|PPM_CANVAS_GROUP_MAX_SIZE" packages/ppm-canvas/dist/index.d.mts
  grep -n "canvas.af22.sprint_map" packages/ppm-brand/dist/index.d.mts | head -1
  ls apps/web/core/components/ppm-canvas/living-map/
  grep -n "export function usePpmLivingMap\|registerBindings\|onBoardCreated" apps/web/core/components/ppm-canvas/living-map/living-map-context.ts apps/web/core/components/ppm-canvas/living-map/living-map-types.ts | head
  grep -n "── AF2.2 M:" apps/web/core/components/ppm-canvas/editor.tsx apps/web/core/components/ppm-canvas/living-map/living-map-types.ts apps/web/core/components/ppm-canvas/living-map/living-map.css
  grep -n "// ── M:" packages/ppm-brand/src/translations/af22-living-map.ts
  grep -n "async markSeen(workspaceId: string, projectId: string, boardId: string)" apps/web/core/services/ppm-canvas-changes.service.ts
  ```
  Ожидание: ≥ 4 совпадений в `dist`; папка с `living-map-{types,context,provider,facts}.ts(x)`, `map-assembly-dialog.tsx`,
  `task-relations-layer.tsx`, `traffic-light-toggle.tsx`, `not-on-map-tray.tsx`, `living-map.css`; в `editor.tsx` блоки M
  «импорты», «окружение линии M», «связи … и диалог», «команда build-sprint-map», «Светофор», «лоток»; в типах — 4 блока M;
  в CSS и переводах — блок M; в сервисе линии C — 1 строка `markSeen` (C1; без неё — ждать C1, статус BLOCKED: RM14
  вызывает этот метод).

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && T=docs/superpowers/plans/2026-09-26-af22/tools; D=apps/web/core/components/ppm-canvas; L=$D/living-map
  $T/af22-pre.sh apps/web/core/services/ppm-canvas-map.service.ts $L/map-model.ts $L/map-layout.ts $L/map-shapes.ts \
    $L/map-assembly.ts $L/map-assembly-queue.ts $L/map-assembly-dialog.tsx $L/map-group-card.tsx $L/map-data.ts \
    $L/living-map-facts.ts $L/living-map-types.ts $L/living-map.css $D/editor.tsx $D/shape.tsx \
    packages/ppm-brand/src/translations/af22-living-map.ts \
    apps/web/tests/ppm-canvas/living-map-assembly.test.ts apps/web/tests/ppm-canvas/fixtures/living-map.ts
  ```
  (файлы, чей образ уже сохранила F, скрипт пропускает.)

- [ ] **Step 2: Фикстура тестов M** — `apps/web/tests/ppm-canvas/fixtures/living-map.ts`:
  ```ts
  // AF2.2 M: общие данные тестов «Живой карты» (линия M). ROBOT-N ↔ uuid(N); все id — корректные UUID (zod).
  import type { TPpmCanvasBoard, TPpmCanvasGitBinding, TPpmCanvasWorkItemBinding } from "@ppm/canvas";
  import type { TMapCycle, TMapIssue, TMapModule, TMapPullRequest } from "@/components/ppm-canvas/living-map/map-model";

  type TMapRelation = TMapIssue["issue_relation"][number];
  type TStateGroup = "backlog" | "cancelled" | "completed" | "started";

  export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  export const seqOf = (id: string) => Number(id.slice(-12));
  export function counter(prefix: string): () => string {
    let value = 0;
    return () => {
      value += 1;
      return `${prefix}${value}`;
    };
  }

  export const WS = uuid(9001);
  export const PROJECT = uuid(9002);
  export const BOARD = uuid(9003);
  export const USER = uuid(9004);
  export const OTHER_PROJECT = uuid(9005);
  export const NOW = "2026-09-26T09:00:00.000Z";
  export const MECH = uuid(7001);
  export const SOFT = uuid(7002);
  export const PRES = uuid(7003);
  export const MODULES: TMapModule[] = [
    { archived_at: null, id: SOFT, name: "Софт" },
    { archived_at: null, id: MECH, name: "Механика" },
    { archived_at: null, id: PRES, name: "Презентация" },
  ];
  export const STATE = { backlog: uuid(6001), cancelled: uuid(6004), completed: uuid(6003), started: uuid(6002) };
  export const STATES = [
    { color: "#8a8a8a", group: "backlog", id: STATE.backlog, name: "Бэклог" },
    { color: "#d97706", group: "started", id: STATE.started, name: "В работе" },
    { color: "#16a34a", group: "completed", id: STATE.completed, name: "Готово" },
    { color: "#9ca3af", group: "cancelled", id: STATE.cancelled, name: "Отменена" },
  ];
  export const PEOPLE = [{ avatar_url: null, display_name: "Миша К.", id: uuid(5001) }];

  export function cycle(
    n: number,
    name: string,
    start: string | null,
    end: string | null,
    extra: Partial<TMapCycle> = {}
  ): TMapCycle {
    return {
      archived_at: null,
      completed_issues: 0,
      end_date: end,
      id: uuid(n),
      name,
      start_date: start,
      total_issues: 0,
      ...extra,
    };
  }

  export const CURRENT = cycle(8001, "Спринт 3", "2026-09-16", "2026-09-29", { completed_issues: 5, total_issues: 9 });

  export function issue(seq: number, moduleIds: string[] = [], extra: Partial<TMapIssue> = {}): TMapIssue {
    return {
      assignee_ids: [],
      cycle_id: CURRENT.id,
      id: uuid(seq),
      issue_relation: [],
      module_ids: moduleIds,
      name: `Задача ${seq}`,
      project_id: PROJECT,
      sequence_id: seq,
      state_id: STATE.started,
      target_date: null,
      ...extra,
    };
  }

  export function relation(seq: number, relationType: string, extra: Partial<TMapRelation> = {}): TMapRelation {
    return {
      id: uuid(seq),
      name: `Задача ${seq}`,
      project_id: PROJECT,
      relation_type: relationType,
      sequence_id: seq,
      state_id: STATE.started,
      ...extra,
    };
  }

  export function workItemBinding(
    seq: number,
    shapeId: string,
    options: { dueDate?: string | null; stateGroup?: TStateGroup } = {}
  ): TPpmCanvasWorkItemBinding & { idempotent_replay: boolean } {
    const state = STATES.find((item) => item.group === (options.stateGroup ?? "started")) ?? STATES[1];
    return {
      binding_id: uuid(50_000 + seq),
      binding_status: "pending",
      entity_id: uuid(seq),
      entity_type: "work_item",
      idempotent_replay: false,
      shape_id: shapeId,
      source: {
        capabilities: { delete_source: false, editable_fields: [], read: true, update: true },
        display: {
          assignees: [],
          due_date: options.dueDate ?? null,
          priority: "none",
          source_status: "active",
          state,
          title: `Задача ${seq}`,
        },
        identity: {
          entity_id: uuid(seq),
          entity_type: "work_item",
          identifier: `ROBOT-${seq}`,
          project_id: PROJECT,
          source_url: `/ws/projects/${PROJECT}/issues/${uuid(seq)}`,
          workspace_id: WS,
        },
        source_version: "1",
      },
      source_version: "1",
    };
  }

  export function pullRequestBinding(
    n: number,
    shapeId: string,
    sourceUrl = `https://git.example.org/robot/pull/${n}`
  ): TPpmCanvasGitBinding & { idempotent_replay: boolean } {
    return {
      binding_id: uuid(60_000 + n),
      binding_status: "pending",
      entity_id: uuid(40_000 + n),
      entity_type: "pull_request",
      idempotent_replay: false,
      shape_id: shapeId,
      source: {
        capabilities: { delete_source: false, read: true, update: false },
        display: {
          author_name: "Олег С.",
          base_ref: "main",
          commit_sha: "",
          head_ref: `feature-${n}`,
          object_type: "pull_request",
          provider: "github",
          ref: `#${n}`,
          repository_name: "robot",
          source_status: "active",
          state: "open",
          title: `PR ${n}`,
          work_items: [{ id: uuid(16), identifier: "ROBOT-16", title: "Задача 16" }],
        },
        identity: {
          entity_id: uuid(40_000 + n),
          entity_type: "pull_request",
          project_id: PROJECT,
          source_url: sourceUrl,
          workspace_id: WS,
        },
        source_version: "1",
      },
      source_version: "1",
    };
  }

  export function pullRequestLink(n: number, workItemSeq: number, extra: Partial<TMapPullRequest> = {}): TMapPullRequest {
    return {
      git_object_id: uuid(40_000 + n),
      id: uuid(30_000 + n),
      object_type: "pull_request",
      ref: String(n),
      repository_name: "robot",
      status: "active",
      title: `ROBOT-${workItemSeq}: PR ${n}`,
      updated_at: "2026-09-25T10:00:00Z",
      work_item: { id: uuid(workItemSeq), identifier: `ROBOT-${workItemSeq}`, title: `Задача ${workItemSeq}` },
      ...extra,
    };
  }

  export function board(name: string): TPpmCanvasBoard {
    return {
      archived_at: null,
      board_id: BOARD,
      created_at: "2026-09-26T09:00:00+00:00",
      created_by: USER,
      name,
      position: 3,
      status: "active",
      updated_at: "2026-09-26T09:00:00+00:00",
      updated_by: USER,
      version: 0,
    };
  }

  // Formatting-proof source checks (как af22-foundation.test.ts): oxfmt может переносить вызовы и ставить запятые.
  export const norm = (text: string) =>
    text
      .replace(/\s+/g, " ")
      .replace(/([([{]) /g, "$1")
      .replace(/ ([)\]}])/g, "$1")
      .replace(/,([)\]}])/g, "$1");

  /** Текст всех блоков `── AF2.2 M: … ── … ── /AF2.2 M ──` файла. */
  export function mBlocks(source: string): string {
    const parts: string[] = [];
    let from = source.indexOf("── AF2.2 M:");
    while (from !== -1) {
      const to = source.indexOf("── /AF2.2 M ──", from);
      if (to === -1) break;
      parts.push(source.slice(from, to));
      from = source.indexOf("── AF2.2 M:", to);
    }
    return parts.join("\n");
  }
  ```

- [ ] **Step 3: Падающий тест** — `apps/web/tests/ppm-canvas/living-map-assembly.test.ts`:
  ```ts
  // AF2.2 M1: «Собрать карту спринта» — выбор спринта, имя новой доски, раскладка по направлениям (R7), пакетная
  // привязка S1, одно изменение доски, сборка в редакторе новой доски; шапки рамки и секций; данные рамки.
  import { readFileSync } from "node:fs";
  import { describe, expect, it, vi } from "vitest";
  import type { Editor } from "tldraw";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    createPpmCanvasNode,
    createPpmMapSectionNode,
    createPpmSprintFrameNode,
    createPpmWorkItemRefNode,
    parseSerializedPpmCanvasNode,
    serializePpmCanvasNode,
    type TPpmCanvasBoard,
  } from "@ppm/canvas";
  import { rectsOverlap } from "@/components/ppm-canvas/canvas-placement";
  import { fillCanvasTemplate } from "@/components/ppm-canvas/canvas-grammar";
  import type { TWorkItemFacts } from "@/components/ppm-canvas/living-map/living-map-types";
  import {
    assembleSprintMap,
    buildSprintMapBoard,
    createSeenAfterSave,
    planSprintMap,
    sprintMapSaved,
  } from "@/components/ppm-canvas/living-map/map-assembly";
  import {
    hasSprintMapAssembly,
    queueSprintMapAssembly,
    takeSprintMapAssembly,
  } from "@/components/ppm-canvas/living-map/map-assembly-queue";
  import {
    computeLivingMapView,
    livingMapLoadKey,
    loadLivingMapData,
    summarizeMapGroups,
  } from "@/components/ppm-canvas/living-map/map-data";
  import {
    layoutSprintMap,
    MAP_FRAME_WIDTH,
    MAP_LAYOUT,
    MAP_SECTION_WIDTH,
  } from "@/components/ppm-canvas/living-map/map-layout";
  import {
    decodeMapGroups,
    encodeMapGroups,
    groupSprintTasks,
    mapGroupRescueIds,
    mapGroupsOf,
    ppmCanvasResizeLimits,
    selectSprintCandidates,
    sprintFrameOf,
    uniqueMapBoardName,
    type TMapCycle,
    type TMapGuardShape,
  } from "@/components/ppm-canvas/living-map/map-model";
  import { applyMapChange, type TMapShapeChange } from "@/components/ppm-canvas/living-map/map-shapes";
  import {
    PpmCanvasMapService,
    type TPpmCanvasBatchBindingItem,
    type TPpmCanvasBatchBindingResult,
  } from "@/services/ppm-canvas-map.service";
  import {
    board,
    BOARD,
    counter,
    CURRENT,
    cycle,
    issue,
    MECH,
    mBlocks,
    MODULES,
    norm,
    NOW,
    PROJECT,
    seqOf,
    SOFT,
    STATES,
    USER,
    uuid,
    workItemBinding,
    WS,
  } from "./fixtures/living-map";

  const t = (key: Parameters<typeof getPpmTranslation>[1]) => getPpmTranslation("ru", key);
  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));

  function created(item: TPpmCanvasBatchBindingItem): TPpmCanvasBatchBindingResult {
    return { binding: workItemBinding(seqOf(item.entity_id), item.shape_id), shape_id: item.shape_id, status: "created" };
  }

  function nodeOf(change: TMapShapeChange, index: number) {
    const parsed = parseSerializedPpmCanvasNode(change.create[index].props?.node ?? "");
    if (parsed.status !== "valid" && parsed.status !== "migrated") throw new Error(`node ${index}: ${parsed.status}`);
    return parsed.node;
  }

  describe("AF2.2 M1: раскладка карты спринта", () => {
    it("lays directions out as full-width sections with up to four cards per row, without overlap", () => {
      const layout = layoutSprintMap([4, 5]);
      expect(MAP_SECTION_WIDTH).toBe(1520);
      expect(layout.frame).toEqual({ h: 1000, w: MAP_FRAME_WIDTH });
      expect(MAP_FRAME_WIDTH).toBe(1568);
      expect(layout.sections.map(({ h, w, x, y }) => ({ h, w, x, y }))).toEqual([
        { h: 312, w: 1520, x: 24, y: 64 },
        { h: 576, w: 1520, x: 24, y: 400 },
      ]);
      expect(layout.sections[1].cells[4]).toEqual({ x: 16, y: 312 });
      const cards = layout.sections.flatMap((section) =>
        section.cells.map((cell) => ({
          h: MAP_LAYOUT.card.h,
          w: MAP_LAYOUT.card.w,
          x: section.x + cell.x,
          y: section.y + cell.y,
        }))
      );
      for (const [index, card] of cards.entries())
        for (const other of cards.slice(index + 1)) expect(rectsOverlap(card, other, 0)).toBe(false);
      for (const section of layout.sections)
        for (const cell of section.cells) {
          expect(cell.x + MAP_LAYOUT.card.w).toBeLessThanOrEqual(section.w - MAP_LAYOUT.sectionPadding);
          expect(cell.y + MAP_LAYOUT.card.h).toBeLessThanOrEqual(section.h - MAP_LAYOUT.sectionPadding);
        }
      expect(layoutSprintMap([]).frame).toEqual({ h: 336, w: MAP_FRAME_WIDTH });
    });

    it("puts a task into its first direction by name and tasks without a known direction last (R7)", () => {
      const groups = groupSprintTasks(
        [issue(9, [SOFT, MECH]), issue(20), issue(5, [MECH]), issue(7, [SOFT]), issue(3, [uuid(7999)])],
        MODULES,
        "Без направления"
      );
      expect(groups.map((group) => [group.title, group.moduleId, group.tasks.map((task) => task.sequence_id)])).toEqual([
        ["Механика", MECH, [5, 9]],
        ["Софт", SOFT, [7]],
        ["Без направления", null, [3, 20]],
      ]);
    });

    it("lets a map group be resized past the card limit, other cards keep 1600 × 1200", () => {
      const frame = serializePpmCanvasNode(
        createPpmSprintFrameNode({
          authorId: USER,
          cycleId: CURRENT.id,
          height: 2160,
          now: NOW,
          title: "Спринт 3",
          width: MAP_FRAME_WIDTH,
        })
      );
      expect(parseSerializedPpmCanvasNode(frame).status).toBe("valid");
      expect(ppmCanvasResizeLimits(frame)).toEqual({ maxHeight: 20_000, maxWidth: 20_000, minHeight: 96, minWidth: 160 });
      const note = serializePpmCanvasNode(
        createPpmCanvasNode({ authorId: USER, kind: "note", now: NOW, title: "Заметка" })
      );
      expect(ppmCanvasResizeLimits(note)).toEqual({ maxHeight: 1200, maxWidth: 1600, minHeight: 96, minWidth: 160 });
    });
  });

  describe("AF2.2 M1: диалог и новая доска", () => {
    it("offers the current sprint first, then upcoming ones, then those finished within 60 days", () => {
      const cycles: TMapCycle[] = [
        cycle(8003, "Спринт 2", "2026-09-02", "2026-09-15"),
        cycle(8005, "Спринт 5", "2026-10-14", "2026-10-27"),
        CURRENT,
        cycle(8004, "Спринт 4", "2026-09-30", "2026-10-13"),
        cycle(8006, "Спринт 0", "2026-07-15", "2026-07-28"),
        cycle(8007, "Спринт −1", "2026-07-01", "2026-07-14"),
        cycle(8008, "Черновик", null, null),
        cycle(8009, "Архив", "2026-09-16", "2026-09-29", { archived_at: "2026-09-20T10:00:00Z" }),
      ];
      expect(selectSprintCandidates(cycles, new Date(2026, 8, 26, 10, 0)).map((item) => [item.name, item.phase])).toEqual(
        [
          ["Спринт 3", "current"],
          ["Спринт 4", "upcoming"],
          ["Спринт 5", "upcoming"],
          ["Спринт 2", "completed"],
          ["Спринт 0", "completed"],
        ]
      );
    });

    it("names the new board after the sprint and never reuses an active board name", () => {
      const template = t("canvas.map.board_name");
      expect(uniqueMapBoardName(template, "Спринт 3", ["Карта проекта"])).toBe("Карта · Спринт 3");
      expect(uniqueMapBoardName(template, "Спринт 3", ["карта ·  спринт 3", "Карта · Спринт 3 (2)"])).toBe(
        "Карта · Спринт 3 (3)"
      );
      expect(Array.from(uniqueMapBoardName(template, "С".repeat(200), [])).length).toBe(120);
    });

    it("plans the map, creates a new board with a free name and queues the plan before opening it", async () => {
      const newBoard = board("Карта · Спринт 3 (2)");
      const createBoard = vi
        .fn<(name: string) => Promise<TPpmCanvasBoard>>()
        .mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "CANVAS_BOARD_NAME_CONFLICT" }))
        .mockResolvedValueOnce(newBoard);
      const queue = vi.fn();
      const onBoardCreated = vi.fn();
      const result = await buildSprintMapBoard(
        {
          createBoard,
          existingBoardNames: () => ["Карта проекта"],
          loadModules: async () => MODULES,
          loadSprintIssues: async (cycleId) => (cycleId === CURRENT.id ? [issue(5, [MECH]), issue(7, [SOFT])] : []),
          locale: "ru",
          newShapeId: counter("shape:c"),
          onBoardCreated,
          queue,
          t,
        },
        { ...CURRENT, phase: "current" }
      );
      expect(createBoard.mock.calls.map(([name]) => name)).toEqual(["Карта · Спринт 3", "Карта · Спринт 3 (2)"]);
      expect(queue).toHaveBeenCalledWith(
        BOARD,
        expect.objectContaining({ cycleId: CURRENT.id, frameTitle: "Спринт 3 · 16–29 сент." })
      );
      expect(queue.mock.invocationCallOrder[0]).toBeLessThan(onBoardCreated.mock.invocationCallOrder[0]);
      expect(onBoardCreated).toHaveBeenCalledWith(newBoard);
      expect(result).toEqual({ boardId: BOARD, boardName: "Карта · Спринт 3 (2)", status: "created", tasks: 2 });
    });

    it("creates no board for a sprint without tasks", async () => {
      const createBoard = vi.fn();
      const result = await buildSprintMapBoard(
        {
          createBoard,
          existingBoardNames: () => [],
          loadModules: async () => [],
          loadSprintIssues: async () => [],
          locale: "ru",
          newShapeId: counter("shape:c"),
          onBoardCreated: vi.fn(),
          queue: vi.fn(),
          t,
        },
        { ...CURRENT, phase: "current" }
      );
      expect(result).toEqual({ status: "empty" });
      expect(createBoard).not.toHaveBeenCalled();
    });

    it("hands the plan to the new board's editor exactly once", () => {
      const plan = { cycleId: CURRENT.id, frameTitle: "Спринт 3", sections: [] };
      queueSprintMapAssembly(BOARD, plan);
      expect(hasSprintMapAssembly(BOARD)).toBe(true);
      expect(takeSprintMapAssembly(BOARD)).toBe(plan);
      expect(takeSprintMapAssembly(BOARD)).toBeUndefined();
      expect(hasSprintMapAssembly(BOARD)).toBe(false);
    });
  });

  describe("AF2.2 M1: сборка на новой доске", () => {
    it("puts at most 200 tasks on a new map (one save activates them); the rest wait in «Не на карте»", () => {
      const issues = Array.from({ length: 205 }, (_, index) => issue(index + 1, [MECH]));
      const plan = planSprintMap({
        cycle: CURRENT,
        frameTitle: "Спринт 3",
        issues,
        modules: MODULES,
        newShapeId: counter("shape:x"),
        noDirectionTitle: "Без направления",
      });
      expect(plan.sections.flatMap((section) => section.tasks)).toHaveLength(200);
      expect(plan.sections[0].tasks.at(-1)?.workItemId).toBe(uuid(200));
    });

    it("binds the sprint tasks in one batch, adds frame, sections and cards as one change and registers them", async () => {
      const ids = counter("shape:m");
      const plan = planSprintMap({
        cycle: CURRENT,
        frameTitle: "Спринт 3 · 16–29 сент.",
        issues: [issue(5, [MECH]), issue(9, [SOFT, MECH]), issue(7, [SOFT]), issue(20)],
        modules: MODULES,
        newShapeId: ids,
        noDirectionTitle: "Без направления",
      });
      expect(plan.sections.map((section) => [section.title, section.tasks.map((task) => task.shapeId)])).toEqual([
        ["Механика", ["shape:m1", "shape:m2"]],
        ["Софт", ["shape:m3"]],
        ["Без направления", ["shape:m4"]],
      ]);
      const bindBatch = vi.fn(async (items: readonly TPpmCanvasBatchBindingItem[]) =>
        items.map(
          (item): TPpmCanvasBatchBindingResult =>
            item.entity_id === uuid(7)
              ? {
                  error: { code: "WORK_ITEM_NOT_FOUND", message: "Задача не найдена." },
                  shape_id: item.shape_id,
                  status: "error",
                }
              : created(item)
        )
      );
      const applied: TMapShapeChange[] = [];
      const registerBindings = vi.fn();
      const cancelBinding = vi.fn(async () => undefined);
      const result = await assembleSprintMap(
        {
          applyChange: (change) => {
            applied.push(change);
            return true;
          },
          authorId: USER,
          bindBatch,
          cancelBinding,
          newShapeId: ids,
          now: () => NOW,
          registerBindings,
        },
        plan
      );
      expect(bindBatch).toHaveBeenCalledTimes(1);
      expect(bindBatch.mock.calls[0][0]).toEqual([
        { entity_id: uuid(5), entity_type: "work_item", shape_id: "shape:m1" },
        { entity_id: uuid(9), entity_type: "work_item", shape_id: "shape:m2" },
        { entity_id: uuid(7), entity_type: "work_item", shape_id: "shape:m3" },
        { entity_id: uuid(20), entity_type: "work_item", shape_id: "shape:m4" },
      ]);
      expect(result).toEqual({ failed: 1, frameId: "shape:m5", placed: 3 });
      expect(applied).toHaveLength(1);
      const [change] = applied;
      expect(change.update).toEqual([]);
      expect(change.moves).toEqual([]);
      expect(change.create.map((shape) => [shape.id, shape.parentId ?? null, shape.x, shape.y])).toEqual([
        ["shape:m5", null, 0, 0],
        ["shape:m6", "shape:m5", 24, 64],
        ["shape:m1", "shape:m6", 16, 48],
        ["shape:m2", "shape:m6", 392, 48],
        ["shape:m7", "shape:m5", 24, 400],
        ["shape:m4", "shape:m7", 16, 48],
      ]);
      const frame = nodeOf(change, 0);
      expect(frame.kind === "group" && frame.map).toEqual({ cycle_id: CURRENT.id, role: "sprint" });
      expect(frame).toMatchObject({ title: "Спринт 3 · 16–29 сент.", visual: { height: 736, width: 1568 } });
      const mechanics = nodeOf(change, 1);
      expect(mechanics.kind === "group" && mechanics.map).toEqual({ module_id: MECH, role: "section" });
      expect(mechanics).toMatchObject({ title: "Механика", visual: { height: 312, width: 1520 } });
      const none = nodeOf(change, 4);
      expect(none.kind === "group" && none.map).toEqual({ module_id: null, role: "section" });
      expect(nodeOf(change, 2)).toMatchObject({ binding: { entity_id: uuid(5) }, kind: "work_item_ref" });
      expect(registerBindings).toHaveBeenCalledTimes(1);
      expect(registerBindings.mock.calls[0][0].map((binding: { entity_id: string }) => binding.entity_id)).toEqual([
        uuid(5),
        uuid(9),
        uuid(20),
      ]);
      expect(cancelBinding).not.toHaveBeenCalled();
    });

    it("keeps the board untouched and cancels the pending bindings when the cards cannot be added", async () => {
      const plan = planSprintMap({
        cycle: CURRENT,
        frameTitle: "Спринт 3",
        issues: [issue(5, [MECH])],
        modules: MODULES,
        newShapeId: counter("shape:f"),
        noDirectionTitle: "Без направления",
      });
      const cancelBinding = vi.fn(async () => undefined);
      const registerBindings = vi.fn();
      await expect(
        assembleSprintMap(
          {
            applyChange: () => false,
            authorId: USER,
            bindBatch: async (items) => items.map(created),
            cancelBinding,
            newShapeId: counter("shape:g"),
            now: () => NOW,
            registerBindings,
          },
          plan
        )
      ).rejects.toThrow();
      expect(cancelBinding).toHaveBeenCalledWith(uuid(50_005));
      expect(registerBindings).not.toHaveBeenCalled();
    });

    it("applies the map as one history step, all or nothing, and never on a read-only board or a locked map", () => {
      function fakeEditor(options: { locked?: string[]; readonly?: boolean; silent?: boolean } = {}) {
        const calls: string[] = [];
        const shapes = new Set<string>(["shape:frame"]);
        const editor = {
          bailToMark: (mark: string) => calls.push(`bail ${mark}`),
          createShapes: (list: { id: string }[]) => {
            calls.push("create");
            if (!options.silent) for (const shape of list) shapes.add(shape.id);
          },
          getIsReadonly: () => Boolean(options.readonly),
          getShape: (id: string) => (shapes.has(id) ? { id } : undefined),
          isShapeOrAncestorLocked: (shape: { id: string } | undefined) =>
            Boolean(shape && options.locked?.includes(shape.id)),
          markHistoryStoppingPoint: (name: string) => {
            calls.push(`mark ${name}`);
            return "mark-1";
          },
          run: (fn: () => void) => fn(),
          updateShapes: () => calls.push("update"),
        } as unknown as Editor;
        return { calls, editor };
      }
      const change: TMapShapeChange = {
        create: [
          {
            id: "shape:a" as never,
            parentId: "shape:frame" as never,
            props: { h: 10, node: "{}", w: 10 },
            type: "ppm-canvas-node",
            x: 0,
            y: 0,
          },
        ],
        moves: [],
        update: [],
      };
      const ok = fakeEditor();
      expect(applyMapChange(ok.editor, change)).toBe(true);
      expect(ok.calls).toEqual(["mark ppm living map", "create"]);
      // Редактор молча ничего не создал — шаг откатывается к метке.
      const silent = fakeEditor({ silent: true });
      expect(applyMapChange(silent.editor, change)).toBe(false);
      expect(silent.calls).toEqual(["mark ppm living map", "create", "bail mark-1"]);
      // Только чтение или закреплённая рамка: доска не трогается вовсе (tldraw молча пропустил бы правки закреплённых).
      for (const blocked of [fakeEditor({ readonly: true }), fakeEditor({ locked: ["shape:frame"] })]) {
        expect(applyMapChange(blocked.editor, change)).toBe(false);
        expect(blocked.calls).toEqual([]);
      }
    });

    it("keeps live cards on the page when a map group is deleted or the assembly is undone (RM15)", () => {
      const node = (value: Parameters<typeof serializePpmCanvasNode>[0]) => serializePpmCanvasNode(value);
      const frame = node(createPpmSprintFrameNode({ authorId: USER, cycleId: CURRENT.id, now: NOW, title: "Спринт 3" }));
      const mech = node(createPpmMapSectionNode({ authorId: USER, moduleId: MECH, now: NOW, title: "Механика" }));
      const soft = node(createPpmMapSectionNode({ authorId: USER, moduleId: SOFT, now: NOW, title: "Софт" }));
      const plain = node(createPpmCanvasNode({ authorId: USER, kind: "group", now: NOW, title: "Секция" }));
      const note = node(createPpmCanvasNode({ authorId: USER, kind: "note", now: NOW, title: "Заметка" }));
      const card = (seq: number) =>
        node(
          createPpmWorkItemRefNode({
            authorId: USER,
            binding: {
              binding_id: uuid(50_000 + seq),
              entity_id: uuid(seq),
              entity_type: "work_item",
              source_version: "1",
            },
            now: NOW,
          })
        );
      const tree: Record<string, TMapGuardShape[]> = {
        "shape:frame": [
          { id: "shape:mech", node: mech, parentId: "shape:frame" },
          { id: "shape:soft", node: soft, parentId: "shape:frame" },
        ],
        "shape:mech": [
          { id: "shape:c5", node: card(5), parentId: "shape:mech" },
          { id: "shape:n1", node: note, parentId: "shape:mech" },
          { id: "shape:sticker", node: null, parentId: "shape:mech" },
        ],
        "shape:plain": [{ id: "shape:c7", node: card(7), parentId: "shape:plain" }],
        "shape:soft": [{ id: "shape:c9", node: card(9), parentId: "shape:soft" }],
      };
      const childrenOf = (id: string) => tree[id] ?? [];
      // Удаляется рамка (или «Отменить» сборку): живые карточки всех её секций — на страницу; заметки уходят с группой.
      expect(mapGroupRescueIds(frame, "shape:frame", childrenOf)).toEqual(["shape:c5", "shape:c9"]);
      expect(mapGroupRescueIds(mech, "shape:mech", childrenOf)).toEqual(["shape:c5"]);
      // Не группа карты — как в AF2.1; карточка сама по себе — не группа.
      expect(mapGroupRescueIds(plain, "shape:plain", childrenOf)).toEqual([]);
      expect(mapGroupRescueIds(card(5), "shape:c5", childrenOf)).toEqual([]);
      const dialog = read("living-map/map-assembly-dialog.tsx");
      has(dialog, 'editor.sideEffects.registerBeforeDeleteHandler("shape", (shape, source) => {');
      has(dialog, 'if (source !== "user" || shape.type !== "ppm-canvas-node") return;');
      has(dialog, "if (rescue.length > 0) editor.reparentShapes(rescue as TLShapeId[], page);");
    });

    it("marks the new map as seen only after the save that activated its cards (RM14)", () => {
      const markSeen = vi.fn(async () => ({ seen_at: NOW, seen_version: 2 }));
      const seen = createSeenAfterSave(markSeen);
      const placed = [workItemBinding(5, "shape:c5"), workItemBinding(9, "shape:c9")];
      const cards = placed.map((binding) => ({ bindingId: binding.binding_id, shapeId: binding.shape_id }));
      const onBoard = (status: "active" | "pending") =>
        new Map(placed.map((binding) => [binding.shape_id, { ...binding, binding_status: status }]));
      // Пока сборка не положила карточки, ждать нечего.
      expect(seen.check(onBoard("active"))).toBe(false);
      seen.expect(placed);
      // Карточки на доске, сохранения ещё не было — или оно не прошло (409 отменяет привязки: active они не станут).
      expect(seen.check(onBoard("pending"))).toBe(false);
      const half = onBoard("pending");
      half.set("shape:c5", { ...placed[0], binding_status: "active" });
      expect(sprintMapSaved(cards, half)).toBe(false);
      expect(seen.check(half)).toBe(false);
      expect(markSeen).not.toHaveBeenCalled();
      // Сохранение прошло — одна отметка; следующие изменения привязок доски её не повторяют.
      expect(seen.check(onBoard("active"))).toBe(true);
      expect(seen.check(onBoard("active"))).toBe(false);
      expect(markSeen).toHaveBeenCalledTimes(1);
      // Карточку убрали до сохранения — её не ждём; убрали все — отметки нет.
      expect(sprintMapSaved(cards, new Map([["shape:c9", { ...placed[1], binding_status: "active" as const }]]))).toBe(
        true
      );
      expect(sprintMapSaved(cards, new Map())).toBe(false);
      // Ошибка отметки молча пропускается (без необработанного отказа): карта уже собрана.
      const failing = vi.fn(async () => {
        throw new Error("Request failed with status code 500");
      });
      const quiet = createSeenAfterSave(failing);
      quiet.expect(placed);
      expect(quiet.check(onBoard("active"))).toBe(true);
      expect(failing).toHaveBeenCalledTimes(1);
      // Сборка кладёт карточки через обёртку: сначала registerBindings F, затем ожидание сохранения; проверка — после
      // каждого изменения привязок доски; отметка — сервисом линии C.
      const dialog = read("living-map/map-assembly-dialog.tsx");
      const register = dialog.indexOf("current.registerBindings(bindings);");
      expect(register).toBeGreaterThan(-1);
      expect(register).toBeLessThan(dialog.indexOf("seenAfterSave.expect(bindings);"));
      has(dialog, "seenAfterSave.check(args.bindingsByShapeId);");
      has(dialog, "return services.changes.markSeen(workspaceId, projectId, boardId);");
      expect(dialog).toContain('from "@/services/ppm-canvas-changes.service"');
    });
  });

  describe("AF2.2 M1: данные рамки и секций", () => {
    it("sends one S1 request without operation ids and pairs the results with the items in order", async () => {
      const service = new PpmCanvasMapService();
      const items: TPpmCanvasBatchBindingItem[] = [
        { entity_id: uuid(5), entity_type: "work_item", shape_id: "shape:c5" },
        { entity_id: uuid(7), entity_type: "work_item", shape_id: "shape:c7" },
      ];
      const post = vi.spyOn(service, "post").mockResolvedValueOnce({
        data: {
          results: [
            created(items[0]),
            {
              error: { code: "BINDING_INVALID", details: {}, message: "Неверный пункт." },
              shape_id: null,
              status: "error",
            },
          ],
        },
      } as never);
      const results = await service.bindBatch(WS, PROJECT, BOARD, items);
      expect(post).toHaveBeenCalledWith(
        `/api/ppm/v1/workspaces/${WS}/projects/${PROJECT}/canvas/boards/${BOARD}/bindings/batch/`,
        {
          items,
        }
      );
      expect(results.map((result) => result.status)).toEqual(["created", "error"]);
      post.mockRejectedValueOnce(new Error("Network Error"));
      const failed = await service.bindBatch(WS, PROJECT, BOARD, items);
      expect(failed).toEqual(
        items.map((item) => ({
          error: { code: "CANVAS_BATCH_FAILED", message: "Network Error" },
          shape_id: item.shape_id,
          status: "error",
        }))
      );
      expect(await service.bindBatch(WS, PROJECT, BOARD, [])).toEqual([]);
    });

    it("finds the sprint frame and its sections on the board and counts their live cards", () => {
      const frameNode = serializePpmCanvasNode(
        createPpmSprintFrameNode({ authorId: USER, cycleId: CURRENT.id, now: NOW, title: "Спринт 3" })
      );
      const mechNode = serializePpmCanvasNode(
        createPpmMapSectionNode({ authorId: USER, moduleId: MECH, now: NOW, title: "Механика" })
      );
      const noneNode = serializePpmCanvasNode(
        createPpmMapSectionNode({ authorId: USER, moduleId: null, now: NOW, title: "Без направления" })
      );
      const groups = mapGroupsOf([
        { id: "shape:frame", node: frameNode, parentId: "page:page" },
        { id: "shape:mech", node: mechNode, parentId: "shape:frame" },
        { id: "shape:none", node: noneNode, parentId: "shape:frame" },
        { id: "shape:c5", node: null, parentId: "shape:mech" },
        { id: "shape:c9", node: null, parentId: "shape:mech" },
        { id: "shape:note", node: null, parentId: "shape:none" },
        // ⌘C/⌘V копия рамки: берётся первая по порядку отрисовки, вторая не мешает.
        { id: "shape:copy", node: frameNode, parentId: "page:page" },
      ]);
      expect(sprintFrameOf(groups)?.id).toBe("shape:frame");
      expect(decodeMapGroups(encodeMapGroups(groups))).toEqual(groups);
      const byId = new Map(groups.map((group) => [group.id, group]));
      expect(byId.get("shape:frame")?.descendants).toEqual([
        "shape:mech",
        "shape:none",
        "shape:c5",
        "shape:c9",
        "shape:note",
      ]);
      expect(byId.get("shape:none")?.map).toEqual({ module_id: null, role: "section" });
      const cards = [
        { binding: workItemBinding(5, "shape:c5"), shapeId: "shape:c5" },
        { binding: workItemBinding(9, "shape:c9"), shapeId: "shape:c9" },
      ];
      const facts = new Map<string, TWorkItemFacts>([
        [uuid(5), { blockedBy: [], relations: [], traffic: "done", workItemId: uuid(5) }],
        [
          uuid(9),
          {
            blockedBy: [{ id: uuid(12), identifier: "ROBOT-12" }],
            relations: [],
            traffic: "blocked",
            workItemId: uuid(9),
          },
        ],
      ]);
      const summaries = summarizeMapGroups(groups, cards, facts);
      expect(summaries.get("shape:mech")).toEqual({ blocked: 1, done: 1, overdue: 0, role: "section", total: 2 });
      expect(summaries.get("shape:frame")).toEqual({ blocked: 1, done: 1, overdue: 0, role: "sprint", total: 2 });
      expect(summaries.get("shape:none")).toEqual({ blocked: 0, done: 0, overdue: 0, role: "section", total: 0 });
    });

    it("shows the Plane sprint behind the frame and marks a sprint that is gone", async () => {
      const loaders = {
        cycle: vi.fn(async () => CURRENT),
        modules: vi.fn(async () => MODULES),
        projectIssues: vi.fn(async () => []),
        pullRequests: vi.fn(async () => []),
        sprintIssues: vi.fn(async () => []),
      };
      const data = await loadLivingMapData(loaders, { boardWorkItemIds: [], cycleId: CURRENT.id, now: 1_000 });
      expect(loaders.cycle).toHaveBeenCalledWith(CURRENT.id);
      const frameNode = serializePpmCanvasNode(
        createPpmSprintFrameNode({ authorId: USER, cycleId: CURRENT.id, now: NOW, title: "Спринт 3" })
      );
      const input = {
        cards: [],
        data,
        groups: mapGroupsOf([{ id: "shape:frame", node: frameNode, parentId: "page:page" }]),
        options: { assignees: [], priorities: [], states: STATES },
        projectId: PROJECT,
        projectIdentifier: "ROBOT",
        today: new Date(2026, 8, 26),
      };
      expect(computeLivingMapView(input).sprint).toEqual({
        cycleId: CURRENT.id,
        done: 5,
        endDate: "2026-09-29",
        missing: false,
        name: "Спринт 3",
        startDate: "2026-09-16",
        total: 9,
      });
      expect(computeLivingMapView(input).modules.get(MECH)?.name).toBe("Механика");
      expect(computeLivingMapView({ ...input, data: { ...data, cycle: null } }).sprint?.missing).toBe(true);
      expect(computeLivingMapView({ ...input, data: { ...data, cycleId: uuid(8099) } }).sprint).toBeNull();
    });

    it("reads nothing for a board without a map or live cards", async () => {
      expect(livingMapLoadKey(null, [])).toBe("");
      const cards = [{ binding: workItemBinding(5, "shape:c5"), shapeId: "shape:c5" }];
      expect(livingMapLoadKey(null, cards)).toBe(`-|${uuid(5)}@1`);
      expect(livingMapLoadKey(CURRENT.id, [])).toBe(`${CURRENT.id}|`);
      const loaders = {
        cycle: vi.fn(async () => CURRENT),
        modules: vi.fn(async () => MODULES),
        projectIssues: vi.fn(async () => []),
        pullRequests: vi.fn(async () => []),
        sprintIssues: vi.fn(async () => []),
      };
      const quiet = await loadLivingMapData(loaders, { boardWorkItemIds: [], cycleId: null, now: 2_000 });
      expect(quiet.loadedAt).toBe(2_000);
      for (const loader of Object.values(loaders)) expect(loader).not.toHaveBeenCalled();
      const hook = read("living-map/living-map-facts.ts");
      has(hook, "if (!loadKey || !isActive) return;");
      has(hook, ": EMPTY_LIVING_MAP_FACTS,");
      expect(hook).not.toContain("./living-map-context");
    });
  });

  describe("AF2.2 M1: швы с F и строки", () => {
    it("assembles only in the loaded, editable, active tab of the new board and only on an empty board", () => {
      const dialog = read("living-map/map-assembly-dialog.tsx");
      has(
        dialog,
        "if (!current.enabled || !current.isActive || !current.loaded || !current.canEdit || assemblingRef.current) return;"
      );
      has(dialog, "const plan = takeSprintMapAssembly(current.boardId);");
      has(dialog, "if (editor.getCurrentPageShapeIds().size > 0) {");
      has(dialog, "bindBatch: (items) => services.map.bindBatch(workspaceId, projectId, boardId, items),");
      has(dialog, "const open = args.enabled && args.isActive && args.canEdit && openedForBoard === args.boardId;");
      for (const marker of [
        'data-ppm-canvas-modal=""',
        'aria-modal="true"',
        'data-ppm-canvas-grammar="v2"',
        'event.code === "Escape"',
        "createPortal(",
      ])
        expect(dialog, marker).toContain(marker);
      expect(dialog).toMatch(/export function openSprintMapDialog\(request: TPpmSprintMapDialogRequest\): void/);
    });

    it("renders map groups through its own card and lifts the resize limit only for them", () => {
      const shape = read("shape.tsx");
      has(
        shape,
        'if (grammarV2 && node.kind === "group" && node.map) return <LivingMapGroupCard node={node} shape={shape} />;'
      );
      expect(shape.indexOf("<LivingMapGroupCard")).toBeLessThan(
        shape.indexOf("return <NativeNodeCard editor={editor} node={node} shape={shape} />;")
      );
      has(shape, "const resized = resizeBox(shape, info, ppmCanvasResizeLimits(shape.props.node));");
      const editor = read("editor.tsx");
      const block = mBlocks(editor);
      has(block, "notify: (message: string) => setContentNotice(message),");
      has(block, "projectIdentifier: livingMapProjectIdentifier, workItemOptions })");
    });

    it("names the map in both languages", () => {
      expect(t("canvas.map.dialog_build")).toBe("Собрать карту");
      expect(t("canvas.map.section_no_direction")).toBe("Без направления");
      expect(getPpmTranslation("en", "canvas.map.dialog_build")).toBe("Build map");
      expect(fillCanvasTemplate(t("canvas.map.sprint_done_many"), { done: 5, total: 9 })).toBe("5 из 9 задач готово");
      expect(fillCanvasTemplate(t("canvas.map.section_blocked_one"), { count: 1 })).toBe("1 заблокирована");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/living-map/map-assembly"`.

- [ ] **Step 4: `map-model.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { z } from "zod";
  import { resolvePpmLocale, type TPpmTranslationKey } from "@ppm/brand";
  import {
    getPpmCanvasMap,
    parseSerializedPpmCanvasNode,
    PPM_CANVAS_GROUP_MAX_SIZE,
    type TPpmCanvasBinding,
    type TPpmCanvasMap,
    type TPpmCanvasSprintMap,
  } from "@ppm/canvas";
  import { fillCanvasTemplate } from "../canvas-grammar";

  // AF2.2 M: модель «Живой карты» без React и tldraw (тесты — env node): данные Plane, выбор спринта, имя доски,
  // раскладка задач по направлениям (R7), роли групп карты на доске, пределы размера и типы необязательных полей M,
  // на которые ссылаются блоки M в living-map-types.ts.

  // ─────────────── Данные Plane (элемент разбирается отдельно: битый выпадает, остальные остаются) ───────────────

  export const mapIssueRelationSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    project_id: z.string().uuid(),
    relation_type: z.string(),
    sequence_id: z.number().int(),
    state_id: z.string().uuid().nullable().catch(null),
  });

  /** Задача из issues-detail с expand=issue_relation (IssueListDetailSerializer, serializers/issue.py:824-897). */
  export const mapIssueSchema = z.object({
    assignee_ids: z.array(z.string()).catch([]),
    cycle_id: z.string().nullable().catch(null),
    id: z.string().uuid(),
    issue_relation: z.array(mapIssueRelationSchema).catch([]),
    module_ids: z.array(z.string()).catch([]),
    name: z.string(),
    project_id: z.string().uuid(),
    sequence_id: z.number().int(),
    state_id: z.string().uuid().nullable().catch(null),
    target_date: z.string().nullable().catch(null),
  });

  export const mapCycleSchema = z.object({
    archived_at: z.string().nullable().catch(null),
    completed_issues: z.number().int().nonnegative().catch(0),
    end_date: z.string().nullable().catch(null),
    id: z.string().uuid(),
    name: z.string(),
    start_date: z.string().nullable().catch(null),
    total_issues: z.number().int().nonnegative().catch(0),
  });

  export const mapModuleSchema = z.object({
    archived_at: z.string().nullable().catch(null),
    id: z.string().uuid(),
    name: z.string(),
  });

  /** Git-связь задачи (GET …/git/links/, ppm-git.service.ts TPpmGitLink) — то, что нужно лотку «Не на карте». */
  export const mapPullRequestSchema = z.object({
    git_object_id: z.string().uuid().nullable().catch(null),
    id: z.string().uuid(),
    object_type: z.string(),
    ref: z.string(),
    repository_name: z.string(),
    status: z.string(),
    title: z.string(),
    updated_at: z.string(),
    work_item: z.object({ id: z.string().uuid(), identifier: z.string(), title: z.string() }),
  });

  export type TMapIssue = z.infer<typeof mapIssueSchema>;
  export type TMapCycle = z.infer<typeof mapCycleSchema>;
  export type TMapModule = z.infer<typeof mapModuleSchema>;
  export type TMapPullRequest = z.infer<typeof mapPullRequestSchema>;

  export function parseMapList<TSchema extends z.ZodTypeAny>(schema: TSchema, raw: unknown): z.infer<TSchema>[] {
    if (!Array.isArray(raw)) return [];
    const items: z.infer<TSchema>[] = [];
    for (const item of raw) {
      const parsed = schema.safeParse(item);
      if (parsed.success) items.push(parsed.data);
    }
    return items;
  }

  // ─────────────── Даты: календарные дни YYYY-MM-DD (как ppm-tasks/sprint.ts), «сегодня» — местная дата ───────────────

  export function dateOnly(value: string | null | undefined): string | null {
    return /^(\d{4}-\d{2}-\d{2})/.exec(value ?? "")?.[1] ?? null;
  }

  export function localDateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function shiftDateKey(key: string, days: number): string {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
  }

  // ─────────────── Диалог «Карта спринта»: какие спринты предлагать ───────────────

  export type TSprintPhase = "completed" | "current" | "upcoming";
  export type TSprintCandidate = TMapCycle & { phase: TSprintPhase };
  export const SPRINT_MAP_COMPLETED_DAYS = 60;
  const PHASE_ORDER: Record<TSprintPhase, number> = { completed: 2, current: 0, upcoming: 1 };

  /** Текущий (сегодня в его датах), затем будущие по началу, затем завершённые за 60 дней — последние первыми. */
  export function selectSprintCandidates(cycles: readonly TMapCycle[], today: Date): TSprintCandidate[] {
    const todayKey = localDateKey(today);
    const oldest = shiftDateKey(todayKey, -SPRINT_MAP_COMPLETED_DAYS);
    const candidates: TSprintCandidate[] = [];
    for (const item of cycles) {
      const start = dateOnly(item.start_date);
      const end = dateOnly(item.end_date);
      if (item.archived_at || !start || !end || end < start) continue;
      if (start <= todayKey && todayKey <= end) candidates.push({ ...item, phase: "current" });
      else if (start > todayKey) candidates.push({ ...item, phase: "upcoming" });
      else if (end >= oldest) candidates.push({ ...item, phase: "completed" });
    }
    // oxlint-disable-next-line unicorn/no-array-sort -- candidates is built here (lib ES2022: no toSorted).
    return candidates.sort(
      (left, right) =>
        PHASE_ORDER[left.phase] - PHASE_ORDER[right.phase] ||
        (left.phase === "completed"
          ? (dateOnly(right.end_date) ?? "").localeCompare(dateOnly(left.end_date) ?? "")
          : (dateOnly(left.start_date) ?? "").localeCompare(dateOnly(right.start_date) ?? "")) ||
        left.name.localeCompare(right.name, "ru")
    );
  }

  // ─────────────── Имя новой доски ───────────────

  export const MAP_BOARD_NAME_MAX = 120;

  /** Как сервер (normalize_board_name, ppm_canvas/services.py:84): пробелы схлопнуты, регистр не важен. */
  export function normalizeMapBoardName(name: string): string {
    return name.split(/\s+/).filter(Boolean).join(" ").toLowerCase();
  }

  function clip(text: string, max: number): string {
    const chars = Array.from(text.trim());
    return chars.length <= max ? chars.join("") : chars.slice(0, Math.max(0, max)).join("").trimEnd();
  }

  /** «Карта · {спринт}»; занято активной доской — «(2)», «(3)»…; не длиннее 120 знаков (схема доски). */
  export function uniqueMapBoardName(template: string, cycleName: string, existing: readonly string[]): string {
    const taken = new Set(existing.map(normalizeMapBoardName));
    const frame = Array.from(fillCanvasTemplate(template, { name: "" })).length;
    for (let attempt = 1; attempt <= 99; attempt += 1) {
      const suffix = attempt === 1 ? "" : ` (${attempt})`;
      const name = `${fillCanvasTemplate(template, { name: clip(cycleName, MAP_BOARD_NAME_MAX - frame - suffix.length) })}${suffix}`;
      if (!taken.has(normalizeMapBoardName(name))) return name;
    }
    return fillCanvasTemplate(template, { name: clip(cycleName, MAP_BOARD_NAME_MAX - frame) });
  }

  // ─────────────── Раскладка по направлениям (R7) ───────────────

  export const NO_DIRECTION_KEY = "none";
  export type TMapTaskGroup = { key: string; moduleId: string | null; tasks: TMapIssue[]; title: string };

  function compareDirections(left: TMapModule, right: TMapModule): number {
    return left.name.localeCompare(right.name, "ru", { sensitivity: "base" }) || left.id.localeCompare(right.id);
  }

  /** R7: задача в нескольких направлениях — в первом по названию; неизвестные (архивные) направления не считаются. */
  export function primaryModuleId(
    moduleIds: readonly string[],
    modulesById: ReadonlyMap<string, TMapModule>
  ): string | null {
    let first: TMapModule | undefined;
    for (const id of moduleIds) {
      const direction = modulesById.get(id);
      if (direction && (!first || compareDirections(direction, first) < 0)) first = direction;
    }
    return first?.id ?? null;
  }

  /** Секции по направлениям (по названию, «Без направления» — последней), задачи в секции — по номеру. */
  export function groupSprintTasks(
    issues: readonly TMapIssue[],
    modules: readonly TMapModule[],
    noDirectionTitle: string
  ): TMapTaskGroup[] {
    const modulesById = new Map(modules.map((direction) => [direction.id, direction]));
    const groups = new Map<string, TMapTaskGroup>();
    for (const item of issues) {
      const moduleId = primaryModuleId(item.module_ids, modulesById);
      const key = moduleId ?? NO_DIRECTION_KEY;
      let group = groups.get(key);
      if (!group) {
        group = { key, moduleId, tasks: [], title: (moduleId && modulesById.get(moduleId)?.name) || noDirectionTitle };
        groups.set(key, group);
      }
      group.tasks.push(item);
    }
    const ordered = [...groups.values()];
    for (const group of ordered) {
      // oxlint-disable-next-line unicorn/no-array-sort -- group.tasks is built here (lib ES2022: no toSorted).
      group.tasks.sort((left, right) => left.sequence_id - right.sequence_id);
    }
    // oxlint-disable-next-line unicorn/no-array-sort -- ordered is a fresh array (lib ES2022: no toSorted).
    return ordered.sort((left, right) => {
      if (left.moduleId === null || right.moduleId === null) {
        if (left.moduleId === right.moduleId) return 0;
        return left.moduleId === null ? 1 : -1;
      }
      return (
        left.title.localeCompare(right.title, "ru", { sensitivity: "base" }) ||
        left.moduleId.localeCompare(right.moduleId)
      );
    });
  }

  // ─────────────── Строки с числами (ru: один / несколько / много; en: один / много) ───────────────

  export function pluralKey<TKey extends TPpmTranslationKey>(
    count: number,
    locale: string,
    keys: { few: TKey; many: TKey; one: TKey }
  ): TKey {
    const category = new Intl.PluralRules(resolvePpmLocale(locale)).select(count);
    if (category === "one") return keys.one;
    return category === "few" ? keys.few : keys.many;
  }

  // ─────────────── Группы карты на доске (узел group с полем map) ───────────────

  export type TMapShapeRef = { id: string; node: string | null; parentId: string };
  export type TMapGroup = { createdAt: string; descendants: readonly string[]; id: string; map: TPpmCanvasMap };
  export type TSprintFrame = TMapGroup & { map: TPpmCanvasSprintMap };

  /** Строка узла PPM из фигуры tldraw; иначе null. */
  export function shapeNodeJson(shape: { props: unknown; type: string }): string | null {
    if (shape.type !== "ppm-canvas-node") return null;
    const node = (shape.props as { node?: unknown }).node;
    return typeof node === "string" ? node : null;
  }

  // Разбор узла дорогой, а строка узла группы при перетаскивании не меняется — кэш по строке (не больше 256).
  const roleCache = new Map<string, { createdAt: string; map: TPpmCanvasMap } | null>();

  /** Роль группы карты (`map` рамки спринта или секции) и дата создания узла; не карта — null. */
  export function readMapRole(node: string | null | undefined): { createdAt: string; map: TPpmCanvasMap } | null {
    if (!node || !node.includes('"map"')) return null;
    const cached = roleCache.get(node);
    if (cached !== undefined) return cached;
    const parsed = parseSerializedPpmCanvasNode(node);
    const map = parsed.status === "valid" || parsed.status === "migrated" ? getPpmCanvasMap(parsed.node) : undefined;
    const role =
      map && (parsed.status === "valid" || parsed.status === "migrated")
        ? { createdAt: parsed.node.created_at, map }
        : null;
    if (roleCache.size >= 256) roleCache.clear();
    roleCache.set(node, role);
    return role;
  }

  /** Группы карты в порядке фигур (рамка — первая по порядку отрисовки) с потомками (секции, карточки) в ширину. */
  export function mapGroupsOf(shapes: readonly TMapShapeRef[]): TMapGroup[] {
    const children = new Map<string, string[]>();
    for (const shape of shapes) {
      const list = children.get(shape.parentId) ?? [];
      list.push(shape.id);
      children.set(shape.parentId, list);
    }
    const groups: TMapGroup[] = [];
    for (const shape of shapes) {
      const role = readMapRole(shape.node);
      if (!role) continue;
      const descendants: string[] = [];
      const queue = [...(children.get(shape.id) ?? [])];
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        descendants.push(id);
        queue.push(...(children.get(id) ?? []));
      }
      groups.push({ createdAt: role.createdAt, descendants, id: shape.id, map: role.map });
    }
    return groups;
  }

  /** Рамка спринта карты: первая по порядку (копия ⌘C/⌘V второй рамкой не мешает). */
  export function sprintFrameOf(groups: readonly TMapGroup[]): TSprintFrame | null {
    return groups.find((group): group is TSprintFrame => group.map.role === "sprint") ?? null;
  }

  /** Подпись состава групп — строка для useValue: перерисовка только при смене ролей и детей, не при перетаскивании. */
  export function encodeMapGroups(groups: readonly TMapGroup[]): string {
    return groups
      .map((group) =>
        [
          group.id,
          group.map.role,
          group.map.role === "sprint" ? group.map.cycle_id : (group.map.module_id ?? ""),
          group.createdAt,
          group.descendants.join(","),
        ].join("\t")
      )
      .join("\n");
  }

  export function decodeMapGroups(signature: string): TMapGroup[] {
    if (!signature) return [];
    return signature.split("\n").map((line) => {
      const [id, role, ref, createdAt, descendants] = line.split("\t");
      const map: TPpmCanvasMap =
        role === "sprint" ? { cycle_id: ref, role: "sprint" } : { module_id: ref || null, role: "section" };
      return { createdAt, descendants: descendants ? descendants.split(",") : [], id, map };
    });
  }

  /** Ручное изменение размера: рамка и секции карты растут с сеткой карточек (предел группы), прочее — 1600 × 1200. */
  export function ppmCanvasResizeLimits(node: string): {
    maxHeight: number;
    maxWidth: number;
    minHeight: number;
    minWidth: number;
  } {
    const map = readMapRole(node) !== null;
    return {
      maxHeight: map ? PPM_CANVAS_GROUP_MAX_SIZE : 1200,
      maxWidth: map ? PPM_CANVAS_GROUP_MAX_SIZE : 1600,
      minHeight: 96,
      minWidth: 160,
    };
  }

  // ─────────────── RM15 · страж: живые карточки не теряются при удалении группы карты ───────────────

  export type TMapGuardShape = { id: string; node: string | null; parentId: string };

  /** Живая карточка — узел PPM с привязкой (тот же признак, что у защиты AF2.1 в editor.tsx). */
  export function isLiveCardNode(node: string | null): boolean {
    if (!node || !node.includes('"binding"')) return false;
    const parsed = parseSerializedPpmCanvasNode(node);
    return (
      (parsed.status === "valid" || parsed.status === "migrated") &&
      "binding" in parsed.node &&
      Boolean(parsed.node.binding)
    );
  }

  /**
   * Удаляется группа карты (рамка или секция): какие живые карточки внутри неё перенести на страницу. tldraw удаляет
   * группу с потомками, а живые карточки AF2.1 не удаляются — без переноса они остались бы без родителя (вне страницы,
   * невидимы). Внутрь живой карточки не заходим; не группа карты — пусто.
   */
  export function mapGroupRescueIds(
    groupNode: string | null,
    groupId: string,
    childrenOf: (id: string) => readonly TMapGuardShape[]
  ): string[] {
    if (!readMapRole(groupNode)) return [];
    const rescue: string[] = [];
    const queue = [...childrenOf(groupId)];
    for (let shape = queue.shift(); shape !== undefined; shape = queue.shift()) {
      if (isLiveCardNode(shape.node)) rescue.push(shape.id);
      else queue.push(...childrenOf(shape.id));
    }
    return rescue;
  }

  // ─────────────── Типы полей линии M (living-map-types.ts ссылается на них import-типами) ───────────────

  /** Живая карточка доски: фигура есть в редакторе, её привязка — задача или PR. */
  export type TLivingMapCard = { binding: TPpmCanvasBinding; shapeId: string };

  export type TTaskLinkKind = "blocks" | "depends_on" | "implements" | "relates_to";
  export type TTaskRelationEdge = {
    fromLabel: string;
    fromShapeId: string;
    id: string;
    kind: TTaskLinkKind;
    toLabel: string;
    toShapeId: string;
  };

  export type TLivingMapSprint = {
    cycleId: string;
    done: number;
    endDate: string | null;
    /** Спринт удалён, в архиве или недоступен: шапка показывает заголовок узла и «спринт недоступен». */
    missing: boolean;
    name: string;
    startDate: string | null;
    total: number;
  };

  export type TNotOnMapItem =
    | {
        assignees: string;
        identifier: string;
        key: string;
        kind: "task";
        moduleId: string | null;
        /** null — «Без направления» (подпись — на языке интерфейса у вида). */
        moduleName: string | null;
        stateGroup: string | null;
        stateName: string | null;
        title: string;
        workItemId: string;
      }
    | {
        entityId: string;
        key: string;
        kind: "pull_request";
        moduleId: string | null;
        moduleName: string | null;
        ref: string | null;
        repositoryName: string;
        title: string;
        workItemId: string;
        workItemIdentifier: string;
      };

  export type TLivingMapTray = { builtAt: string | null; enabled: boolean; items: readonly TNotOnMapItem[] };
  export const EMPTY_LIVING_MAP_TRAY: TLivingMapTray = { builtAt: null, enabled: false, items: [] };

  export type TMapPlacementRequest = {
    entityId: string;
    entityType: "pull_request" | "work_item";
    key: string;
    moduleId: string | null;
    sectionTitle: string;
    size: { h: number; w: number };
  };

  export type TPlaceOnMapResult = { cardIds: string[]; failed: number; placed: number };
  ```

- [ ] **Step 5: `map-layout.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { PPM_CANVAS_NODE_REGISTRY } from "@ppm/canvas";

  // AF2.2 M: раскладка карты спринта — рамка → секции направлений в столбец → карточки сеткой до 4 колонок, без
  // наложений и одинаково при одинаковых данных. Секции — в координатах рамки, карточки — в координатах секции
  // (дети в tldraw живут в системе координат родителя).
  export const MAP_LAYOUT = {
    card: {
      h: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultHeight,
      w: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultWidth,
    },
    columns: 4,
    frameHeader: 64,
    framePadding: 24,
    gap: 16,
    sectionGap: 24,
    sectionHeader: 48,
    sectionPadding: 16,
  } as const;

  export const MAP_SECTION_WIDTH =
    MAP_LAYOUT.sectionPadding * 2 + MAP_LAYOUT.columns * MAP_LAYOUT.card.w + (MAP_LAYOUT.columns - 1) * MAP_LAYOUT.gap;
  export const MAP_FRAME_WIDTH = MAP_SECTION_WIDTH + MAP_LAYOUT.framePadding * 2;

  export type TMapPoint = { x: number; y: number };
  export type TMapBox = TMapPoint & { h: number; w: number };
  export type TSprintMapLayout = { frame: { h: number; w: number }; sections: (TMapBox & { cells: TMapPoint[] })[] };

  export function sectionRows(cardCount: number, columns: number = MAP_LAYOUT.columns): number {
    return Math.max(1, Math.ceil(cardCount / columns));
  }

  export function sectionHeight(rows: number): number {
    return MAP_LAYOUT.sectionHeader + rows * MAP_LAYOUT.card.h + (rows - 1) * MAP_LAYOUT.gap + MAP_LAYOUT.sectionPadding;
  }

  export function cellOrigin(index: number, columns: number = MAP_LAYOUT.columns): TMapPoint {
    return {
      x: MAP_LAYOUT.sectionPadding + (index % columns) * (MAP_LAYOUT.card.w + MAP_LAYOUT.gap),
      y: MAP_LAYOUT.sectionHeader + Math.floor(index / columns) * (MAP_LAYOUT.card.h + MAP_LAYOUT.gap),
    };
  }

  export function layoutSprintMap(cardCounts: readonly number[]): TSprintMapLayout {
    let top: number = MAP_LAYOUT.frameHeader;
    const sections = cardCounts.map((count) => {
      const box = {
        cells: Array.from({ length: count }, (_, index) => cellOrigin(index)),
        h: sectionHeight(sectionRows(count)),
        w: MAP_SECTION_WIDTH,
        x: MAP_LAYOUT.framePadding,
        y: top,
      };
      top += box.h + MAP_LAYOUT.sectionGap;
      return box;
    });
    const bottom = sections.length > 0 ? top - MAP_LAYOUT.sectionGap : MAP_LAYOUT.frameHeader + MAP_LAYOUT.card.h;
    return { frame: { h: bottom + MAP_LAYOUT.framePadding, w: MAP_FRAME_WIDTH }, sections };
  }
  ```

- [ ] **Step 6: `map-shapes.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { Box, type Editor, type TLParentId, type TLShapeId, type TLShapePartial } from "tldraw";
  import {
    createPpmGitRefNode,
    createPpmMapSectionNode,
    createPpmSprintFrameNode,
    createPpmWorkItemRefNode,
    serializePpmCanvasNode,
    type TPpmCanvasBinding,
    type TPpmCanvasNode,
  } from "@ppm/canvas";
  import type { TPpmCanvasShape } from "../shape";
  import { layoutSprintMap, type TMapPoint } from "./map-layout";

  // AF2.2 M: фигуры «Живой карты» и одно изменение доски. shape.tsx's PPM_CANVAS_SHAPE_TYPE — проверенным литералом
  // (как canvas-toolkit-actions.ts): импорт shape.tsx потянул бы в тесты node все карточки.
  const PPM_CANVAS_SHAPE_TYPE = "ppm-canvas-node" satisfies TPpmCanvasShape["type"];

  /** Новые фигуры (родители раньше детей), новые размеры карточек PPM и сдвиги любых фигур — одним шагом истории. */
  export type TMapShapeChange = {
    create: TLShapePartial<TPpmCanvasShape>[];
    moves: TLShapePartial[];
    update: TLShapePartial<TPpmCanvasShape>[];
  };

  export function mapCardShape(
    id: string,
    node: TPpmCanvasNode,
    position: TMapPoint,
    parentId?: string
  ): TLShapePartial<TPpmCanvasShape> {
    return {
      id: id as TLShapeId,
      ...(parentId ? { parentId: parentId as TLParentId } : {}),
      props: { h: node.visual.height, node: serializePpmCanvasNode(node), w: node.visual.width },
      type: PPM_CANVAS_SHAPE_TYPE,
      x: position.x,
      y: position.y,
    };
  }

  /** Живая карточка привязки: задача — work_item_ref, PR — git_ref; PR без https-ссылки — null (схема узла). */
  export function liveCardNode(binding: TPpmCanvasBinding, authorId: string, now: string): TPpmCanvasNode | null {
    if (binding.entity_type === "work_item") {
      return createPpmWorkItemRefNode({
        authorId,
        binding: {
          binding_id: binding.binding_id,
          entity_id: binding.entity_id,
          entity_type: "work_item",
          source_version: binding.source_version,
        },
        now,
      });
    }
    if (binding.entity_type !== "pull_request") return null;
    const { display, identity } = binding.source;
    if (!identity.source_url) return null;
    try {
      return createPpmGitRefNode({
        authorId,
        binding: {
          binding_id: binding.binding_id,
          entity_id: binding.entity_id,
          entity_type: binding.entity_type,
          source_version: binding.source_version,
        },
        canonicalUrl: identity.source_url,
        now,
        objectType: display.object_type,
        provider: display.provider,
        repositoryName: display.repository_name,
        sourceId: binding.entity_id,
        title: display.title,
        workItemKey: display.work_items[0]?.identifier ?? null,
      });
    } catch {
      return null;
    }
  }

  export type TSprintMapSectionShapes = {
    cards: readonly { binding: TPpmCanvasBinding; shapeId: string }[];
    id: string;
    moduleId: string | null;
    title: string;
  };

  /** Рамка спринта в (0, 0) новой доски, секции — её дети, карточки — дети секций; привязки — только нарисованных. */
  export function buildSprintMapChange(input: {
    authorId: string;
    cycleId: string;
    frameId: string;
    frameTitle: string;
    now: string;
    sections: readonly TSprintMapSectionShapes[];
  }): { bindings: TPpmCanvasBinding[]; change: TMapShapeChange } {
    const layout = layoutSprintMap(input.sections.map((section) => section.cards.length));
    const frame = createPpmSprintFrameNode({
      authorId: input.authorId,
      cycleId: input.cycleId,
      height: layout.frame.h,
      now: input.now,
      title: input.frameTitle,
      width: layout.frame.w,
    });
    const create: TLShapePartial<TPpmCanvasShape>[] = [mapCardShape(input.frameId, frame, { x: 0, y: 0 })];
    const bindings: TPpmCanvasBinding[] = [];
    input.sections.forEach((section, index) => {
      const box = layout.sections[index];
      const node = createPpmMapSectionNode({
        authorId: input.authorId,
        height: box.h,
        moduleId: section.moduleId,
        now: input.now,
        title: section.title,
        width: box.w,
      });
      create.push(mapCardShape(section.id, node, box, input.frameId));
      section.cards.forEach((card, cardIndex) => {
        const cardNode = liveCardNode(card.binding, input.authorId, input.now);
        if (!cardNode) return;
        create.push(mapCardShape(card.shapeId, cardNode, box.cells[cardIndex], section.id));
        bindings.push(card.binding);
      });
    });
    return { bindings, change: { create, moves: [], update: [] } };
  }

  /**
   * Одно изменение доски одним шагом истории (спецификация A). Доска только для чтения или закреплённые (locked) рамка и
   * секции — ничего не меняем: tldraw молча пропустил бы правки закреплённых фигур, а карточки легли бы поверх соседей.
   * Исключение внутри run откатывает tldraw (transact); редактор ничего не создал — шаг откатывается к метке. «Отменить»
   * этот шаг снимает рамку и секции, живые карточки остаются на своих местах (защита AF2.1 и страж RM15). Привязки
   * регистрирует вызывающий.
   */
  export function applyMapChange(editor: Editor, change: TMapShapeChange): boolean {
    if (editor.getIsReadonly()) return false;
    const touched = [...change.update, ...change.moves].map((shape) => shape.id as string);
    const parents = change.create.flatMap((shape) => (shape.parentId ? [shape.parentId as string] : []));
    for (const id of [...touched, ...parents]) {
      const shape = editor.getShape(id as TLShapeId);
      if (shape && editor.isShapeOrAncestorLocked(shape)) return false;
    }
    const mark = editor.markHistoryStoppingPoint("ppm living map");
    try {
      editor.run(() => {
        if (change.update.length > 0) editor.updateShapes(change.update);
        if (change.moves.length > 0) editor.updateShapes(change.moves);
        if (change.create.length > 0) editor.createShapes(change.create);
      });
    } catch {
      editor.bailToMark(mark);
      return false;
    }
    if (change.create.every((shape) => editor.getShape(shape.id))) return true;
    editor.bailToMark(mark);
    return false;
  }

  /** Новая карта: камера по ширине рамки, её верх (спринт и первые секции) — в кадре. */
  export function revealSprintMap(editor: Editor, frameId: string): void {
    const bounds = editor.getShapePageBounds(frameId as TLShapeId);
    if (!bounds) return;
    editor.zoomToBounds(new Box(bounds.x, bounds.y, bounds.w, Math.min(bounds.h, Math.round(bounds.w * 0.75))), {
      immediate: true,
      inset: 48,
    });
  }
  ```

- [ ] **Step 7: `ppm-canvas-map.service.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { isAxiosError } from "axios";
  import { z } from "zod";
  import { API_BASE_URL } from "@plane/constants";
  import {
    ppmCanvasBindingMutationResponseSchema,
    ppmCanvasErrorResponseSchema,
    type TPpmCanvasBindingCreateRequest,
  } from "@ppm/canvas";
  import type { TLivingMapLoaders } from "@/components/ppm-canvas/living-map/map-data";
  import {
    mapCycleSchema,
    mapIssueSchema,
    mapModuleSchema,
    mapPullRequestSchema,
    parseMapList,
    type TMapCycle,
    type TMapIssue,
    type TMapModule,
    type TMapPullRequest,
  } from "@/components/ppm-canvas/living-map/map-model";
  import { APIService } from "@/services/api.service";

  // AF2.2 M: данные «Живой карты». Пакетная привязка S1 и чтение Plane одним запросом на вид: задачи со связями
  // (issues-detail + expand=issue_relation, фильтр cycle — задачи спринта), спринт, направления, Git-связи проекта.
  // Без N+1; только API PPM и Plane.

  /** S1 принимает до 200 пунктов, столько же активирует одно сохранение доски (линия S). Вызывающие режут сами. */
  export const PPM_CANVAS_BATCH_LIMIT = 200;
  /** Предел страницы issues-detail (plane/utils/paginator.py MAX_LIMIT). */
  export const MAP_ISSUES_PAGE_SIZE = 1000;

  /** Пункт S1. client_operation_id не передаём: сервер выводит его из доски, фигуры и источника — повтор идемпотентен. */
  export type TPpmCanvasBatchBindingItem = {
    entity_id: string;
    entity_type: TPpmCanvasBindingCreateRequest["entity_type"];
    shape_id: string;
  };

  const ppmCanvasBatchBindingResultSchema = z.discriminatedUnion("status", [
    z.object({ binding: ppmCanvasBindingMutationResponseSchema, shape_id: z.string(), status: z.literal("created") }),
    z.object({
      error: z.object({ code: z.string(), message: z.string() }).passthrough(),
      shape_id: z.string().nullable(),
      status: z.literal("error"),
    }),
  ]);
  const ppmCanvasBatchBindingResponseSchema = z.object({ results: z.array(ppmCanvasBatchBindingResultSchema) });
  export type TPpmCanvasBatchBindingResult = z.infer<typeof ppmCanvasBatchBindingResultSchema>;

  function batchFailure(error: unknown): { code: string; message: string } {
    const parsed = isAxiosError(error) ? ppmCanvasErrorResponseSchema.safeParse(error.response?.data) : undefined;
    if (parsed?.success) return { code: parsed.data.error.code, message: parsed.data.error.message };
    return { code: "CANVAS_BATCH_FAILED", message: error instanceof Error ? error.message : "Canvas request failed." };
  }

  export class PpmCanvasMapService extends APIService {
    constructor() {
      super(API_BASE_URL);
    }

    /** S1: один запрос; ответ — по пункту в порядке входа. Отказ запроса (сеть, 403, 400) — ошибка у каждого пункта. */
    async bindBatch(
      workspaceId: string,
      projectId: string,
      boardId: string,
      items: readonly TPpmCanvasBatchBindingItem[]
    ): Promise<TPpmCanvasBatchBindingResult[]> {
      if (items.length === 0) return [];
      try {
        const response = await this.post(
          `/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}/canvas/boards/${boardId}/bindings/batch/`,
          { items }
        );
        const { results } = ppmCanvasBatchBindingResponseSchema.parse(response.data);
        return items.map(
          (item, index): TPpmCanvasBatchBindingResult =>
            results[index] ?? {
              error: { code: "CANVAS_BATCH_MISSING", message: "No result for this item." },
              shape_id: item.shape_id,
              status: "error",
            }
        );
      } catch (error) {
        const failure = batchFailure(error);
        return items.map(
          (item): TPpmCanvasBatchBindingResult => ({ error: failure, shape_id: item.shape_id, status: "error" })
        );
      }
    }

    /** Спринты проекта без архивных — выбор в диалоге «Карта спринта». */
    async getCycles(workspaceSlug: string, projectId: string): Promise<TMapCycle[]> {
      const response = await this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/cycles/`);
      return parseMapList(mapCycleSchema, response.data).filter((item) => !item.archived_at);
    }

    /** Спринт рамки; удалён, в архиве или недоступен — null («спринт недоступен»); сбой сети — ошибка. */
    async getCycle(workspaceSlug: string, projectId: string, cycleId: string): Promise<TMapCycle | null> {
      try {
        const response = await this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/cycles/${cycleId}/`);
        const parsed = mapCycleSchema.safeParse(response.data);
        return parsed.success && !parsed.data.archived_at ? parsed.data : null;
      } catch (error) {
        if (isAxiosError(error) && (error.response?.status === 403 || error.response?.status === 404)) return null;
        throw error;
      }
    }

    async getModules(workspaceSlug: string, projectId: string): Promise<TMapModule[]> {
      const response = await this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/modules/`);
      return parseMapList(mapModuleSchema, response.data).filter((direction) => !direction.archived_at);
    }

    /** Задачи со связями одним запросом; cycleId — только задачи этого спринта. Видимость — как в «Задачах». */
    async getIssues(workspaceSlug: string, projectId: string, cycleId?: string): Promise<TMapIssue[]> {
      const response = await this.get(`/api/workspaces/${workspaceSlug}/projects/${projectId}/issues-detail/`, {
        params: {
          ...(cycleId ? { cycle: cycleId } : {}),
          expand: "issue_relation",
          order_by: "-updated_at",
          per_page: MAP_ISSUES_PAGE_SIZE,
        },
      });
      return parseMapList(mapIssueSchema, (response.data as { results?: unknown } | undefined)?.results);
    }

    /** Git-связи проекта (PR задач); Git не подключён или нет прав — пусто, лоток без PR. */
    async getPullRequests(workspaceId: string, projectId: string): Promise<TMapPullRequest[]> {
      try {
        const response = await this.get(`/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}/git/links/`);
        return parseMapList(mapPullRequestSchema, (response.data as { links?: unknown } | undefined)?.links);
      } catch {
        return [];
      }
    }
  }

  /** Загрузчики фактов карты одной доски (living-map-facts.ts). */
  export function createLivingMapLoaders(
    service: PpmCanvasMapService,
    scope: { projectId: string; workspaceId: string; workspaceSlug: string }
  ): TLivingMapLoaders {
    return {
      cycle: (cycleId) => service.getCycle(scope.workspaceSlug, scope.projectId, cycleId),
      modules: () => service.getModules(scope.workspaceSlug, scope.projectId),
      projectIssues: () => service.getIssues(scope.workspaceSlug, scope.projectId),
      pullRequests: () => service.getPullRequests(scope.workspaceId, scope.projectId),
      sprintIssues: (cycleId) => service.getIssues(scope.workspaceSlug, scope.projectId, cycleId),
    };
  }
  ```

- [ ] **Step 8: `map-assembly.ts` и `map-assembly-queue.ts` (новые)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPpmTranslationKey } from "@ppm/brand";
  import type { TPpmCanvasBinding, TPpmCanvasBoard } from "@ppm/canvas";
  import { formatPpmSprintRange } from "@/components/ppm-tasks/sprint";
  import {
    PPM_CANVAS_BATCH_LIMIT,
    type TPpmCanvasBatchBindingItem,
    type TPpmCanvasBatchBindingResult,
  } from "@/services/ppm-canvas-map.service";
  import { fillCanvasTemplate } from "../canvas-grammar";
  import {
    groupSprintTasks,
    uniqueMapBoardName,
    type TMapCycle,
    type TMapIssue,
    type TMapModule,
    type TSprintCandidate,
  } from "./map-model";
  import { buildSprintMapChange, type TMapShapeChange, type TSprintMapSectionShapes } from "./map-shapes";

  // AF2.2 M1: «Собрать карту спринта». Диалог доски, где нажали, читает спринт и направления, планирует раскладку и
  // создаёт НОВУЮ доску (существующие не меняются); собирает её редактор новой доски (map-assembly-dialog.tsx):
  // пакетная привязка S1 → фигуры одним шагом истории → args.registerBindings (активация ближайшим сохранением).

  /** Одно сохранение доски активирует не больше 200 привязок (линия S): на карту — первые 200 задач по порядку секций. */
  export const MAP_ASSEMBLY_LIMIT = PPM_CANVAS_BATCH_LIMIT;
  const BOARD_NAME_ATTEMPTS = 5;

  export type TSprintMapTaskPlan = { shapeId: string; workItemId: string };
  export type TSprintMapSectionPlan = {
    key: string;
    moduleId: string | null;
    tasks: TSprintMapTaskPlan[];
    title: string;
  };
  export type TSprintMapPlan = { cycleId: string; frameTitle: string; sections: TSprintMapSectionPlan[] };

  export function planSprintMap(input: {
    cycle: TMapCycle;
    frameTitle: string;
    issues: readonly TMapIssue[];
    modules: readonly TMapModule[];
    newShapeId: () => string;
    noDirectionTitle: string;
  }): TSprintMapPlan {
    let room: number = MAP_ASSEMBLY_LIMIT;
    const sections: TSprintMapSectionPlan[] = [];
    for (const group of groupSprintTasks(input.issues, input.modules, input.noDirectionTitle)) {
      const tasks = group.tasks
        .slice(0, Math.max(0, room))
        .map((item): TSprintMapTaskPlan => ({ shapeId: input.newShapeId(), workItemId: item.id }));
      room -= tasks.length;
      if (tasks.length > 0) sections.push({ key: group.key, moduleId: group.moduleId, tasks, title: group.title });
    }
    return { cycleId: input.cycle.id, frameTitle: input.frameTitle, sections };
  }

  export type TSprintMapBuildDeps = {
    createBoard: (name: string) => Promise<TPpmCanvasBoard>;
    existingBoardNames: () => readonly string[];
    loadModules: () => Promise<TMapModule[]>;
    loadSprintIssues: (cycleId: string) => Promise<TMapIssue[]>;
    locale: string;
    newShapeId: () => string;
    onBoardCreated: (board: TPpmCanvasBoard) => void;
    queue: (boardId: string, plan: TSprintMapPlan) => void;
    t: (key: TPpmTranslationKey) => string;
  };
  export type TSprintMapBuildResult =
    | { boardId: string; boardName: string; status: "created"; tasks: number }
    | { status: "empty" };

  export function isBoardNameConflict(error: unknown): boolean {
    return (
      typeof error === "object" && error !== null && (error as { code?: unknown }).code === "CANVAS_BOARD_NAME_CONFLICT"
    );
  }

  /** Диалог: пустой спринт — доска не создаётся; иначе новая доска с незанятым именем, план — в очередь, затем открыть. */
  export async function buildSprintMapBoard(
    deps: TSprintMapBuildDeps,
    cycle: TSprintCandidate
  ): Promise<TSprintMapBuildResult> {
    const [issues, modules] = await Promise.all([
      deps.loadSprintIssues(cycle.id),
      deps.loadModules().catch((): TMapModule[] => []),
    ]);
    if (issues.length === 0) return { status: "empty" };
    const range = formatPpmSprintRange(cycle.start_date, cycle.end_date, deps.locale);
    const frameTitle = range
      ? fillCanvasTemplate(deps.t("canvas.map.sprint_title"), { name: cycle.name, range })
      : cycle.name;
    const plan = planSprintMap({
      cycle,
      frameTitle,
      issues,
      modules,
      newShapeId: deps.newShapeId,
      noDirectionTitle: deps.t("canvas.map.section_no_direction"),
    });
    const tried: string[] = [];
    for (let attempt = 0; attempt < BOARD_NAME_ATTEMPTS; attempt += 1) {
      const name = uniqueMapBoardName(deps.t("canvas.map.board_name"), cycle.name, [
        ...deps.existingBoardNames(),
        ...tried,
      ]);
      try {
        // oxlint-disable-next-line no-await-in-loop -- a retry waits for the previous name to be refused
        const board = await deps.createBoard(name);
        // Сначала очередь, потом открытие: редактор новой доски может смонтироваться сразу.
        deps.queue(board.board_id, plan);
        deps.onBoardCreated(board);
        return { boardId: board.board_id, boardName: board.name, status: "created", tasks: issues.length };
      } catch (error) {
        if (!isBoardNameConflict(error)) throw error;
        tried.push(name);
      }
    }
    throw new Error("No free name for the sprint map board.");
  }

  export type TSprintMapAssemblyDeps = {
    applyChange: (change: TMapShapeChange) => boolean;
    authorId: string;
    bindBatch: (items: readonly TPpmCanvasBatchBindingItem[]) => Promise<TPpmCanvasBatchBindingResult[]>;
    cancelBinding: (bindingId: string) => Promise<void>;
    newShapeId: () => string;
    now: () => string;
    registerBindings: (bindings: readonly TPpmCanvasBinding[]) => void;
  };
  export type TSprintMapAssemblyResult = { failed: number; frameId: string; placed: number };

  /** Редактор новой доски: S1 → рамка, секции (только с привязанными задачами) и карточки одним изменением → регистрация. */
  export async function assembleSprintMap(
    deps: TSprintMapAssemblyDeps,
    plan: TSprintMapPlan
  ): Promise<TSprintMapAssemblyResult> {
    const tasks = plan.sections.flatMap((section) => section.tasks);
    const results = await deps.bindBatch(
      tasks.map(
        (task): TPpmCanvasBatchBindingItem => ({
          entity_id: task.workItemId,
          entity_type: "work_item",
          shape_id: task.shapeId,
        })
      )
    );
    const bound = new Map<string, TPpmCanvasBinding>();
    const stray: TPpmCanvasBinding[] = [];
    results.forEach((result, index) => {
      const task = tasks[index];
      if (result.status !== "created") return;
      if (task && result.binding.entity_type === "work_item" && result.binding.entity_id === task.workItemId)
        bound.set(task.shapeId, result.binding);
      else stray.push(result.binding);
    });
    const frameId = deps.newShapeId();
    const sections: TSprintMapSectionShapes[] = [];
    for (const section of plan.sections) {
      const cards = section.tasks.flatMap((task) => {
        const binding = bound.get(task.shapeId);
        return binding ? [{ binding, shapeId: task.shapeId }] : [];
      });
      if (cards.length > 0)
        sections.push({ cards, id: deps.newShapeId(), moduleId: section.moduleId, title: section.title });
    }
    const built = buildSprintMapChange({
      authorId: deps.authorId,
      cycleId: plan.cycleId,
      frameId,
      frameTitle: plan.frameTitle,
      now: deps.now(),
      sections,
    });
    const cancel = (bindings: readonly TPpmCanvasBinding[]) =>
      Promise.all(bindings.map((binding) => deps.cancelBinding(binding.binding_id).catch(() => undefined)));
    let applied = false;
    try {
      applied = deps.applyChange(built.change);
    } catch {
      applied = false;
    }
    if (!applied) {
      await cancel([...bound.values(), ...stray]);
      throw new Error("The sprint map could not be added to the board.");
    }
    deps.registerBindings(built.bindings);
    if (stray.length > 0) await cancel(stray);
    return { failed: tasks.length - built.bindings.length, frameId, placed: built.bindings.length };
  }

  // ─────────────── RM14 · отметка «просмотрено» у сборщика после сохранения новой карты ───────────────

  /** Карточка новой карты и её свежая (pending) привязка. */
  export type TPlacedMapCard = { bindingId: string; shapeId: string };

  /**
   * Новая карта сохранена: каждая её привязка, что ещё лежит на доске, стала active. editor.tsx (flushSave) помечает
   * active только привязки успешно сохранённого запроса; при 409 отменяет их — active они не станут. Карточку, которую
   * убрали до сохранения, не ждём; не осталось ни одной — «сохранено» не наступает.
   */
  export function sprintMapSaved(
    cards: readonly TPlacedMapCard[],
    bindingsByShapeId: ReadonlyMap<string, TPpmCanvasBinding>
  ): boolean {
    let active = 0;
    for (const card of cards) {
      const binding = bindingsByShapeId.get(card.shapeId);
      if (!binding || binding.binding_id !== card.bindingId) continue;
      if (binding.binding_status !== "active") return false;
      active += 1;
    }
    return active > 0;
  }

  export type TSeenAfterSave = {
    /** Сборка положила карточки (сразу после args.registerBindings): ждать их сохранения. */
    expect: (bindings: readonly TPpmCanvasBinding[]) => void;
    /** После каждого изменения привязок доски; true — отметка отправлена (один раз на сборку). */
    check: (bindingsByShapeId: ReadonlyMap<string, TPpmCanvasBinding>) => boolean;
  };

  /**
   * Решение контроллера (RM14): свежая карта сборщика не открывается с «добавлено» на всех карточках. После успешного
   * сохранения — одна личная отметка S3 (markSeen — сервис линии C); её ошибка молча пропускается: карта уже собрана.
   */
  export function createSeenAfterSave(markSeen: () => Promise<unknown>): TSeenAfterSave {
    let waiting: TPlacedMapCard[] | null = null;
    return {
      check: (bindingsByShapeId) => {
        if (!waiting || !sprintMapSaved(waiting, bindingsByShapeId)) return false;
        waiting = null;
        void markSeen().catch(() => undefined);
        return true;
      },
      expect: (bindings) => {
        waiting =
          bindings.length > 0
            ? bindings.map((binding) => ({ bindingId: binding.binding_id, shapeId: binding.shape_id }))
            : null;
      },
    };
  }
  ```
  `map-assembly-queue.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TSprintMapPlan } from "./map-assembly";

  // AF2.2 M1: план карты от диалога (редактор прежней доски) — редактору новой доски, в пределах страницы. Забирается
  // один раз, когда новая доска загружена, доступна для правки и активна (map-assembly-dialog.tsx). Перезагрузка
  // страницы до этого — пустая доска «Карта · …» (её можно удалить или собрать карту заново).
  const queued = new Map<string, TSprintMapPlan>();

  export function queueSprintMapAssembly(boardId: string, plan: TSprintMapPlan): void {
    queued.set(boardId, plan);
  }

  export function hasSprintMapAssembly(boardId: string): boolean {
    return queued.has(boardId);
  }

  export function takeSprintMapAssembly(boardId: string): TSprintMapPlan | undefined {
    const plan = queued.get(boardId);
    queued.delete(boardId);
    return plan;
  }
  ```

- [ ] **Step 9: `map-data.ts` (новый; M2–M4 заменяют помеченные строки)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPpmCanvasBinding, TPpmWorkItemEditOptions } from "@ppm/canvas";
  import type { TMapSectionSummary, TWorkItemFacts } from "./living-map-types";
  import {
    EMPTY_LIVING_MAP_TRAY,
    sprintFrameOf,
    type TLivingMapCard,
    type TLivingMapSprint,
    type TLivingMapTray,
    type TMapCycle,
    type TMapGroup,
    type TMapIssue,
    type TMapModule,
    type TMapPullRequest,
    type TTaskRelationEdge,
  } from "./map-model";

  // AF2.2 M: данные «Живой карты» без React: загрузка из Plane и сведение в то, что показывают рамка, секции, связи
  // «из Задач», «Светофор» и лоток. Читает только активная вкладка (living-map-facts.ts); в доску ничего не пишет.

  export type TLivingMapLoaders = {
    cycle: (cycleId: string) => Promise<TMapCycle | null>;
    modules: () => Promise<TMapModule[]>;
    projectIssues: () => Promise<TMapIssue[]>;
    pullRequests: () => Promise<TMapPullRequest[]>;
    sprintIssues: (cycleId: string) => Promise<TMapIssue[]>;
  };
  export type TLivingMapRequest = { boardWorkItemIds: readonly string[]; cycleId: string | null; now: number };
  export type TLivingMapData = {
    cycle: TMapCycle | null;
    cycleId: string | null;
    issues: ReadonlyMap<string, TMapIssue>;
    loadedAt: number;
    modules: readonly TMapModule[];
    pullRequests: readonly TMapPullRequest[];
    sprintIssueIds: readonly string[] | null;
  };
  export const EMPTY_LIVING_MAP_DATA: TLivingMapData = {
    cycle: null,
    cycleId: null,
    issues: new Map(),
    loadedAt: 0,
    modules: [],
    pullRequests: [],
    sprintIssueIds: null,
  };

  const CARD_FIELD = "\t";

  /** Живые карточки задач и PR, чья фигура есть на доске, — строкой: меняется при добавлении, удалении и новой версии. */
  export function liveCardsSignature(
    bindings: ReadonlyMap<string, TPpmCanvasBinding>,
    hasShape: (shapeId: string) => boolean
  ): string {
    const rows: string[] = [];
    for (const [shapeId, binding] of bindings) {
      if (binding.entity_type !== "work_item" && binding.entity_type !== "pull_request") continue;
      if (!hasShape(shapeId)) continue;
      rows.push([shapeId, binding.entity_type, binding.entity_id, binding.source_version ?? ""].join(CARD_FIELD));
    }
    // oxlint-disable-next-line unicorn/no-array-sort -- rows is a local array (lib ES2022: no toSorted).
    return rows.sort().join("\n");
  }

  export function liveCardsFromSignature(
    signature: string,
    bindings: ReadonlyMap<string, TPpmCanvasBinding>
  ): TLivingMapCard[] {
    if (!signature) return [];
    const cards: TLivingMapCard[] = [];
    for (const row of signature.split("\n")) {
      const shapeId = row.split(CARD_FIELD)[0];
      const binding = bindings.get(shapeId);
      if (binding) cards.push({ binding, shapeId });
    }
    return cards;
  }

  export function boardWorkItemIds(cards: readonly TLivingMapCard[]): string[] {
    const ids = new Set<string>();
    for (const card of cards) if (card.binding.entity_type === "work_item") ids.add(card.binding.entity_id);
    // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array from the set (lib ES2022: no toSorted).
    return [...ids].sort();
  }

  /** Что читать заново: спринт рамки и задачи на доске с их версиями; пусто — доска без карты и карточек, чтения нет. */
  export function livingMapLoadKey(cycleId: string | null, cards: readonly TLivingMapCard[]): string {
    const workItems = new Set<string>();
    for (const card of cards)
      if (card.binding.entity_type === "work_item")
        workItems.add(`${card.binding.entity_id}@${card.binding.source_version ?? ""}`);
    if (!cycleId && workItems.size === 0) return "";
    // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array from the set (lib ES2022: no toSorted).
    return `${cycleId ?? "-"}|${[...workItems].sort().join(",")}`;
  }

  export async function loadLivingMapData(
    loaders: TLivingMapLoaders,
    request: TLivingMapRequest
  ): Promise<TLivingMapData> {
    if (!request.cycleId) return { ...EMPTY_LIVING_MAP_DATA, loadedAt: request.now };
    const [cycle, modules] = await Promise.all([
      loaders.cycle(request.cycleId),
      loaders.modules().catch((): TMapModule[] => []),
    ]);
    return { ...EMPTY_LIVING_MAP_DATA, cycle, cycleId: request.cycleId, loadedAt: request.now, modules };
  }

  /** Шапки рамки и секций: живые карточки задач среди потомков группы и их «Светофор». */
  export function summarizeMapGroups(
    groups: readonly TMapGroup[],
    cards: readonly TLivingMapCard[],
    facts: ReadonlyMap<string, TWorkItemFacts>
  ): Map<string, TMapSectionSummary> {
    const workItems = new Map<string, string>();
    for (const card of cards)
      if (card.binding.entity_type === "work_item") workItems.set(card.shapeId, card.binding.entity_id);
    const summaries = new Map<string, TMapSectionSummary>();
    for (const group of groups) {
      const summary: TMapSectionSummary = { blocked: 0, done: 0, overdue: 0, role: group.map.role, total: 0 };
      for (const shapeId of group.descendants) {
        const workItemId = workItems.get(shapeId);
        if (!workItemId) continue;
        summary.total += 1;
        const traffic = facts.get(workItemId)?.traffic;
        if (traffic === "done") summary.done += 1;
        else if (traffic === "blocked") summary.blocked += 1;
        else if (traffic === "overdue") summary.overdue += 1;
      }
      summaries.set(group.id, summary);
    }
    return summaries;
  }

  export type TLivingMapViewInput = {
    cards: readonly TLivingMapCard[];
    data: TLivingMapData;
    groups: readonly TMapGroup[];
    options: TPpmWorkItemEditOptions;
    projectId: string;
    projectIdentifier: string | null;
    today: Date;
  };
  export type TLivingMapView = {
    facts: ReadonlyMap<string, TWorkItemFacts>;
    mapSections: ReadonlyMap<string, TMapSectionSummary>;
    modules: ReadonlyMap<string, TMapModule>;
    relationEdges: readonly TTaskRelationEdge[];
    sprint: TLivingMapSprint | null;
    tray: TLivingMapTray;
  };

  export function computeLivingMapView(input: TLivingMapViewInput): TLivingMapView {
    const frame = sprintFrameOf(input.groups);
    const current = frame !== null && input.data.cycleId === frame.map.cycle_id;
    const cycle = current ? input.data.cycle : null;
    const modules = new Map(input.data.modules.map((direction) => [direction.id, direction]));
    // M3: факты «Светофора» (traffic-light.ts).
    const facts: ReadonlyMap<string, TWorkItemFacts> = new Map();
    return {
      facts,
      mapSections: summarizeMapGroups(input.groups, input.cards, facts),
      modules,
      // M2: связи «из Задач» (task-relations.ts).
      relationEdges: [],
      sprint:
        frame && current
          ? {
              cycleId: frame.map.cycle_id,
              done: cycle?.completed_issues ?? 0,
              endDate: cycle?.end_date ?? null,
              missing: cycle === null,
              name: cycle?.name ?? "",
              startDate: cycle?.start_date ?? null,
              total: cycle?.total_issues ?? 0,
            }
          : null,
      // M4: лоток «Не на карте» (not-on-map.ts).
      tray: EMPTY_LIVING_MAP_TRAY,
    };
  }
  ```

- [ ] **Step 10: `living-map-types.ts` — три блока M** (перечитать файл перед правкой: его же правит C)
  - В `TWorkItemFacts` было:
    ```ts
      // ── AF2.2 M: необязательные поля линии M ──
      // ── /AF2.2 M ──
    };

    /** Header facts of a sprint frame or a map section on this board, keyed by the group's tldraw shape id. */
    ```
    стало:
    ```ts
      // ── AF2.2 M: необязательные поля линии M ──
      /** Срок задачи YYYY-MM-DD — строка «просрочено · 20 сент.» на карточке (traffic === "overdue"). */
      dueDate?: string | null;
      // ── /AF2.2 M ──
    };

    /** Header facts of a sprint frame or a map section on this board, keyed by the group's tldraw shape id. */
    ```
  - В `TLivingMapFacts` было:
    ```ts
      mapSections: ReadonlyMap<string, TMapSectionSummary>;
      // ── AF2.2 M: необязательные поля линии M ──
      // ── /AF2.2 M ──
    ```
    стало:
    ```ts
      mapSections: ReadonlyMap<string, TMapSectionSummary>;
      // ── AF2.2 M: необязательные поля линии M ──
      /** Направления проекта по id — живые названия секций карты и пунктов лотка. */
      modules?: ReadonlyMap<string, import("./map-model").TMapModule>;
      /** «+ Добавить» / «Разложить всё» лотка: только редактор активной вкладки; итог — для уведомления вида. */
      placeFromTray?: (
        keys: readonly string[],
        noDirectionTitle: string
      ) => Promise<import("./map-model").TPlaceOnMapResult | null>;
      /** Идёт раскладка из лотка — кнопки лотка недоступны. */
      placing?: boolean;
      /** Связи «из Задач» между живыми карточками этой доски (task-relations-layer.tsx). */
      relationEdges?: readonly import("./map-model").TTaskRelationEdge[];
      /** Спринт рамки карты: название, даты, прогресс Plane (шапка рамки; C — «с начала спринта»); null — нет рамки. */
      sprint?: import("./map-model").TLivingMapSprint | null;
      /** Лоток «Не на карте» (только доска с рамкой спринта). */
      tray?: import("./map-model").TLivingMapTray;
      // ── /AF2.2 M ──
    ```
  - В `TLivingMapArgs` было:
    ```ts
      // ── AF2.2 M: необязательные поля линии M (значения — livingMapArgsM, блок M в editor.tsx) ──
      // ── /AF2.2 M ──
    ```
    стало:
    ```ts
      // ── AF2.2 M: необязательные поля линии M (значения — livingMapArgsM, блок M в editor.tsx) ──
      /** Уведомление холста (setContentNotice блока AF2.1 B1): итог сборки карты и раскладки из лотка. */
      notify?: (message: string) => void;
      /** Идентификатор проекта Plane («ROBOT») — номера задач в лотке и у блокирующих задач. */
      projectIdentifier?: string | null;
      /** Статусы и участники проекта (work_item_options доски): группы статусов блокирующих, имена в лотке. */
      workItemOptions?: import("@ppm/canvas").TPpmWorkItemEditOptions;
      // ── /AF2.2 M ──
    ```
  (Блок M в `TMapSectionSummary` остаётся пустым.)

- [ ] **Step 11: `living-map-facts.ts` — заменить заглушку F целиком**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useMemo, useRef, useState } from "react";
  import { useValue, type TLShapeId } from "tldraw";
  import type { TPpmWorkItemEditOptions } from "@ppm/canvas";
  import { createLivingMapLoaders, PpmCanvasMapService } from "@/services/ppm-canvas-map.service";
  import { EMPTY_LIVING_MAP_FACTS, type TLivingMapArgs, type TLivingMapFacts } from "./living-map-types";
  import {
    boardWorkItemIds,
    computeLivingMapView,
    EMPTY_LIVING_MAP_DATA,
    liveCardsFromSignature,
    liveCardsSignature,
    livingMapLoadKey,
    loadLivingMapData,
    type TLivingMapData,
  } from "./map-data";
  import { decodeMapGroups, encodeMapGroups, mapGroupsOf, shapeNodeJson, sprintFrameOf } from "./map-model";

  // AF2.2 M: факты «Живой карты» для провайдера F — только чтение. Данные Plane (спринт рамки, направления, задачи со
  // связями, PR) читает лишь активная вкладка v2 (AF2.1 R19): при открытии, при смене карточек или их версий и раз в
  // 60 с; в доску ничего не пишет. args.enabled === false (v1, минимальный режим) — пусто и без запросов.
  // Не импортировать living-map-context.ts (его импортирует провайдер — был бы цикл).

  const NO_WORK_ITEM_OPTIONS: TPpmWorkItemEditOptions = { assignees: [], priorities: [], states: [] };
  const LIVING_MAP_DEBOUNCE_MS = 400;
  const LIVING_MAP_STALE_MS = 60_000;

  export function useLivingMapFacts(args: TLivingMapArgs): TLivingMapFacts {
    const { bindingsByShapeId, editor, enabled, isActive, projectId, workspaceId, workspaceSlug } = args;
    const projectIdentifier = args.projectIdentifier ?? null;
    const workItemOptions = args.workItemOptions ?? NO_WORK_ITEM_OPTIONS;
    // Группы карты и живые карточки — строками-подписями: пересчёт на каждое изменение фигур дешёвый, а перерисовка —
    // только при смене состава (роли групп, их дети, карточки, версии источников), не на кадрах перетаскивания и камеры.
    const groupsKey = useValue(
      "ppm living map groups",
      () =>
        editor && enabled
          ? encodeMapGroups(
              mapGroupsOf(
                editor
                  .getCurrentPageShapesSorted()
                  .map((shape) => ({ id: shape.id, node: shapeNodeJson(shape), parentId: shape.parentId }))
              )
            )
          : "",
      [editor, enabled]
    );
    const cardsKey = useValue(
      "ppm living map cards",
      () =>
        editor && enabled
          ? liveCardsSignature(bindingsByShapeId, (shapeId) => Boolean(editor.getShape(shapeId as TLShapeId)))
          : "",
      [bindingsByShapeId, editor, enabled]
    );
    const groups = useMemo(() => decodeMapGroups(groupsKey), [groupsKey]);
    const cards = useMemo(() => liveCardsFromSignature(cardsKey, bindingsByShapeId), [bindingsByShapeId, cardsKey]);
    const cycleId = sprintFrameOf(groups)?.map.cycle_id ?? null;
    const loadKey = enabled ? livingMapLoadKey(cycleId, cards) : "";
    const loaders = useMemo(
      () => createLivingMapLoaders(new PpmCanvasMapService(), { projectId, workspaceId, workspaceSlug }),
      [projectId, workspaceId, workspaceSlug]
    );
    const [data, setData] = useState<TLivingMapData>(EMPTY_LIVING_MAP_DATA);
    const [tick, setTick] = useState(0);
    const requestRef = useRef(0);
    const loadedRef = useRef({ at: 0, key: "" });
    const inputsRef = useRef({ cycleId, workItemIds: boardWorkItemIds(cards) });
    inputsRef.current = { cycleId, workItemIds: boardWorkItemIds(cards) };

    useEffect(() => {
      if (!loadKey || !isActive) return;
      const interval = window.setInterval(() => setTick((value) => value + 1), LIVING_MAP_STALE_MS);
      return () => window.clearInterval(interval);
    }, [isActive, loadKey]);

    useEffect(() => {
      if (!loadKey || !isActive) return;
      if (loadedRef.current.key === loadKey && Date.now() - loadedRef.current.at < LIVING_MAP_STALE_MS) return;
      const timer = window.setTimeout(() => {
        const request = ++requestRef.current;
        const inputs = inputsRef.current;
        void loadLivingMapData(loaders, {
          boardWorkItemIds: inputs.workItemIds,
          cycleId: inputs.cycleId,
          now: Date.now(),
        })
          .then((loaded) => {
            if (request !== requestRef.current) return undefined;
            loadedRef.current = { at: loaded.loadedAt, key: loadKey };
            setData(loaded);
            return undefined;
          })
          // Сбой чтения не стирает последние известные данные: карта остаётся как была.
          .catch(() => undefined);
      }, LIVING_MAP_DEBOUNCE_MS);
      return () => window.clearTimeout(timer);
    }, [isActive, loadKey, loaders, tick]);

    const view = useMemo(
      () =>
        computeLivingMapView({
          cards,
          data,
          groups,
          options: workItemOptions,
          projectId,
          projectIdentifier,
          today: new Date(),
        }),
      [cards, data, groups, projectId, projectIdentifier, workItemOptions]
    );

    return useMemo<TLivingMapFacts>(
      () =>
        enabled
          ? {
              facts: view.facts,
              mapSections: view.mapSections,
              modules: view.modules,
              relationEdges: view.relationEdges,
              sprint: view.sprint,
              tray: view.tray,
            }
          : EMPTY_LIVING_MAP_FACTS,
      [enabled, view]
    );
  }
  ```

- [ ] **Step 12: `map-assembly-dialog.tsx` — заменить заглушку F целиком** (имена `TPpmSprintMapDialogRequest`,
  `openSprintMapDialog`, `PpmSprintMapDialog` — как у F)
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
  import { createPortal } from "react-dom";
  import { LoaderCircle, Map as MapIcon, X } from "lucide-react";
  import { createShapeId, useEditor, type TLShapeId } from "tldraw";
  import { useTranslation } from "@plane/i18n";
  import { formatPpmSprintRange } from "@/components/ppm-tasks/sprint";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { PpmCanvasChangesService } from "@/services/ppm-canvas-changes.service";
  import { PpmCanvasMapService } from "@/services/ppm-canvas-map.service";
  import { PpmCanvasService } from "@/services/ppm-canvas.service";
  import { fillCanvasTemplate } from "../canvas-grammar";
  import { syncCanvasEditorFocus } from "../file-preview";
  import { usePpmLivingMap } from "./living-map-context";
  import {
    assembleSprintMap,
    buildSprintMapBoard,
    createSeenAfterSave,
    type TSprintMapBuildResult,
  } from "./map-assembly";
  import { hasSprintMapAssembly, queueSprintMapAssembly, takeSprintMapAssembly } from "./map-assembly-queue";
  import {
    mapGroupRescueIds,
    pluralKey,
    selectSprintCandidates,
    shapeNodeJson,
    type TSprintCandidate,
  } from "./map-model";
  import { applyMapChange, revealSprintMap } from "./map-shapes";

  // AF2.2 M1: «Собрать карту спринта». Команда build-sprint-map (рейка, палитра, пустая доска) → блок M CanvasControls
  // (F) → openSprintMapDialog({ boardId }). PpmSprintMapDialog — дочерний <Tldraw> каждой доски v2 (F): показывает
  // диалог у активной вкладки своей доски и собирает карту из очереди, когда это новая доска. Диалог — портал в body:
  // корень [data-ppm-canvas-grammar="v2"] (стили living-map.css) и [data-ppm-canvas-modal] (гард клавиш workspace.tsx).
  export type TPpmSprintMapDialogRequest = { boardId: string };

  let openedFor: string | null = null;
  const listeners = new Set<() => void>();

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  export function openSprintMapDialog(request: TPpmSprintMapDialogRequest): void {
    openedFor = request.boardId;
    emit();
  }

  export function closeSprintMapDialog(): void {
    if (openedFor === null) return;
    openedFor = null;
    emit();
  }

  export type TSprintMapDialogDeps = {
    build: (cycle: TSprintCandidate) => Promise<TSprintMapBuildResult>;
    loadCandidates: () => Promise<TSprintCandidate[]>;
  };

  export function PpmSprintMapDialog() {
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const { args } = usePpmLivingMap();
    const openedForBoard = useSyncExternalStore(
      subscribe,
      () => openedFor,
      () => null
    );
    const argsRef = useRef(args);
    argsRef.current = args;
    const assemblingRef = useRef(false);
    const services = useMemo(
      () => ({ canvas: new PpmCanvasService(), changes: new PpmCanvasChangesService(), map: new PpmCanvasMapService() }),
      []
    );
    // RM14: после сохранения, активировавшего карточки новой карты, — одна личная отметка «просмотрено» (S3, линия C).
    // Компонент — дочерний <Tldraw> (не перемонтируется при сохранении), поэтому ожидание переживает автосохранения.
    const seenAfterSave = useMemo(
      () =>
        createSeenAfterSave(() => {
          const { boardId, projectId, workspaceId } = argsRef.current;
          return services.changes.markSeen(workspaceId, projectId, boardId);
        }),
      [services]
    );
    const open = args.enabled && args.isActive && args.canEdit && openedForBoard === args.boardId;

    // Диалог — только у активной вкладки своей доски (AF2.1 R19).
    useEffect(() => {
      if (openedForBoard === args.boardId && !args.isActive) closeSprintMapDialog();
    }, [args.boardId, args.isActive, openedForBoard]);

    // Пока диалог открыт, горячие клавиши tldraw (Backspace/Delete, буквы инструментов) не доходят до доски.
    useEffect(() => {
      if (!open) return;
      syncCanvasEditorFocus(editor, { isActive: true, modalOpen: true });
      return () => syncCanvasEditorFocus(editor, { isActive: argsRef.current.isActive, modalOpen: false });
    }, [editor, open]);

    // Сборка: план из очереди забирает редактор новой доски — загруженной, доступной для правки и активной — один раз.
    useEffect(() => {
      const current = argsRef.current;
      if (!current.enabled || !current.isActive || !current.loaded || !current.canEdit || assemblingRef.current) return;
      if (!hasSprintMapAssembly(current.boardId)) return;
      const plan = takeSprintMapAssembly(current.boardId);
      if (!plan) return;
      if (editor.getCurrentPageShapeIds().size > 0) {
        // Карта собирается только на новой (пустой) доске — существующее содержимое не трогаем.
        current.notify?.(ppmT("canvas.map.board_not_empty"));
        return;
      }
      assemblingRef.current = true;
      const { boardId, projectId, workspaceId } = current;
      void assembleSprintMap(
        {
          applyChange: (change) => applyMapChange(editor, change),
          authorId: current.authorId,
          bindBatch: (items) => services.map.bindBatch(workspaceId, projectId, boardId, items),
          cancelBinding: (bindingId) => services.canvas.cancelPendingBinding(workspaceId, projectId, boardId, bindingId),
          newShapeId: () => createShapeId(),
          now: () => new Date().toISOString(),
          registerBindings: (bindings) => {
            current.registerBindings(bindings);
            seenAfterSave.expect(bindings);
          },
        },
        plan
      )
        .then((result) => {
          revealSprintMap(editor, result.frameId);
          current.notify?.(
            result.failed > 0
              ? fillCanvasTemplate(ppmT("canvas.map.built_partial"), { failed: result.failed, placed: result.placed })
              : fillCanvasTemplate(ppmT("canvas.map.built"), { count: result.placed })
          );
          return undefined;
        })
        .catch(() => {
          current.notify?.(ppmT("canvas.map.assembly_error"));
        })
        .finally(() => {
          assemblingRef.current = false;
        });
    }, [args.boardId, args.canEdit, args.enabled, args.isActive, args.loaded, editor, ppmT, seenAfterSave, services]);

    // RM14: привязки доски меняются и после сохранения (pending → active) — тогда отметка уходит, один раз на сборку.
    // Это продолжение нажатия «Собрать карту» этой вкладки, не опрос: без сборки ждать нечего.
    useEffect(() => {
      seenAfterSave.check(args.bindingsByShapeId);
    }, [args.bindingsByShapeId, seenAfterSave]);

    // RM15: удаляют группу карты (Delete, «Отменить» сборку) — живые карточки внутри переносятся на страницу на тех же
    // местах: tldraw удаляет группу с потомками, защита AF2.1 карточки не удаляет, и без переноса они остались бы без
    // родителя (невидимы). Только свои изменения: чужие (source "remote") уже перенесены у того, кто удалял.
    useEffect(
      () =>
        editor.sideEffects.registerBeforeDeleteHandler("shape", (shape, source) => {
          if (source !== "user" || shape.type !== "ppm-canvas-node") return;
          const rescue = mapGroupRescueIds(shapeNodeJson(shape), shape.id, (id) =>
            editor.getSortedChildIdsForParent(id as TLShapeId).flatMap((childId) => {
              const child = editor.getShape(childId);
              return child ? [{ id: child.id, node: shapeNodeJson(child), parentId: child.parentId }] : [];
            })
          );
          const page = editor.getAncestorPageId(shape) ?? editor.getCurrentPageId();
          if (rescue.length > 0) editor.reparentShapes(rescue as TLShapeId[], page);
        }),
      [editor]
    );

    const deps = useMemo<TSprintMapDialogDeps>(
      () => ({
        build: (cycle) => {
          const current = argsRef.current;
          return buildSprintMapBoard(
            {
              createBoard: (name) => services.canvas.createBoard(current.workspaceId, current.projectId, name),
              existingBoardNames: () =>
                argsRef.current.boards.filter((item) => item.status === "active").map((item) => item.name),
              loadModules: () => services.map.getModules(current.workspaceSlug, current.projectId),
              loadSprintIssues: (cycleId) => services.map.getIssues(current.workspaceSlug, current.projectId, cycleId),
              locale: currentLocale,
              newShapeId: () => createShapeId(),
              onBoardCreated: (created) => argsRef.current.onBoardCreated(created),
              queue: queueSprintMapAssembly,
              t: ppmT,
            },
            cycle
          );
        },
        loadCandidates: async () => {
          const current = argsRef.current;
          return selectSprintCandidates(
            await services.map.getCycles(current.workspaceSlug, current.projectId),
            new Date()
          );
        },
      }),
      [currentLocale, ppmT, services]
    );

    if (!open) return null;
    return <SprintMapDialog deps={deps} onClose={closeSprintMapDialog} />;
  }

  type TDialogStatus = "build_error" | "building" | "empty" | "load_error" | "loading" | "ready";

  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const PHASE_KEYS = {
    completed: "canvas.map.dialog_phase_completed",
    current: "canvas.map.dialog_phase_current",
    upcoming: "canvas.map.dialog_phase_upcoming",
  } as const;
  const TASK_KEYS = {
    few: "canvas.map.section_tasks_few",
    many: "canvas.map.section_tasks_many",
    one: "canvas.map.section_tasks_one",
  } as const;

  function SprintMapDialog({ deps, onClose }: { deps: TSprintMapDialogDeps; onClose: () => void }) {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const [candidates, setCandidates] = useState<TSprintCandidate[]>([]);
    const [selectedId, setSelectedId] = useState<string>();
    const [status, setStatus] = useState<TDialogStatus>("loading");
    const [attempt, setAttempt] = useState(0);
    const dialogRef = useRef<HTMLDivElement>(null);
    const busy = status === "building";

    useEffect(() => {
      let active = true;
      setStatus("loading");
      void deps
        .loadCandidates()
        .then((list) => {
          if (!active) return undefined;
          setCandidates(list);
          setSelectedId((current) => (current && list.some((item) => item.id === current) ? current : list[0]?.id));
          setStatus("ready");
          return undefined;
        })
        .catch(() => {
          if (active) setStatus("load_error");
        });
      return () => {
        active = false;
      };
    }, [attempt, deps]);

    useEffect(() => {
      dialogRef.current?.focus();
    }, []);

    const selected = candidates.find((item) => item.id === selectedId);
    const close = () => {
      if (!busy) onClose();
    };
    const build = async () => {
      if (!selected || busy) return;
      setStatus("building");
      try {
        const result = await deps.build(selected);
        if (result.status === "empty") {
          setStatus("empty");
          return;
        }
        onClose();
      } catch {
        setStatus("build_error");
      }
    };
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.code === "Escape") {
        close();
        return;
      }
      if (event.code !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = dialog ? [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
      if (!dialog || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focused = document.activeElement;
      if (event.shiftKey && (focused === first || focused === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (focused === last || focused === dialog)) {
        event.preventDefault();
        first.focus();
      }
    };

    return createPortal(
      <div className="ppm-sprint-map-backdrop" data-ppm-canvas-grammar="v2" role="presentation" onPointerDown={close}>
        <div
          ref={dialogRef}
          aria-labelledby="ppm-sprint-map-title"
          aria-modal="true"
          className="ppm-sprint-map-dialog"
          data-ppm-canvas-modal=""
          role="dialog"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header className="ppm-sprint-map-dialog__header">
            <MapIcon aria-hidden="true" />
            <h2 id="ppm-sprint-map-title">{ppmT("canvas.af22.sprint_map")}</h2>
            <button type="button" aria-label={ppmT("canvas.close")} disabled={busy} onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </header>
          {status === "loading" && (
            <p className="ppm-sprint-map-dialog__note" role="status">
              {ppmT("canvas.map.dialog_loading")}
            </p>
          )}
          {status === "load_error" && (
            <p className="ppm-sprint-map-dialog__error" role="alert">
              {ppmT("canvas.map.dialog_load_error")}
              <button type="button" onClick={() => setAttempt((value) => value + 1)}>
                {ppmT("canvas.map.dialog_retry")}
              </button>
            </p>
          )}
          {status !== "loading" && status !== "load_error" && candidates.length === 0 && (
            <p className="ppm-sprint-map-dialog__note">{ppmT("canvas.map.dialog_empty")}</p>
          )}
          {candidates.length > 0 && (
            <fieldset className="ppm-sprint-map-dialog__sprints" disabled={busy}>
              <legend>{ppmT("canvas.map.dialog_sprint_label")}</legend>
              {candidates.map((item) => {
                const range = formatPpmSprintRange(item.start_date, item.end_date, currentLocale);
                const tasks = fillCanvasTemplate(ppmT(pluralKey(item.total_issues, currentLocale, TASK_KEYS)), {
                  count: item.total_issues,
                });
                return (
                  <label
                    key={item.id}
                    className="ppm-sprint-map-dialog__sprint"
                    data-selected={item.id === selectedId || undefined}
                  >
                    <input
                      checked={item.id === selectedId}
                      name="ppm-sprint-map-cycle"
                      type="radio"
                      value={item.id}
                      onChange={() => setSelectedId(item.id)}
                    />
                    <span className="ppm-sprint-map-dialog__sprint-name">{item.name}</span>
                    <span className="ppm-sprint-map-dialog__sprint-meta">
                      {[range, ppmT(PHASE_KEYS[item.phase]), tasks].filter(Boolean).join(" · ")}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          )}
          <p className="ppm-sprint-map-dialog__note">{ppmT("canvas.map.dialog_grouping")}</p>
          {selected && (
            <p className="ppm-sprint-map-dialog__note">
              {fillCanvasTemplate(ppmT("canvas.map.dialog_new_board"), {
                name: fillCanvasTemplate(ppmT("canvas.map.board_name"), { name: selected.name }),
              })}
            </p>
          )}
          {status === "empty" && (
            <p className="ppm-sprint-map-dialog__error" role="alert">
              {ppmT("canvas.map.dialog_no_tasks")}
            </p>
          )}
          {status === "build_error" && (
            <p className="ppm-sprint-map-dialog__error" role="alert">
              {ppmT("canvas.map.dialog_build_error")}
            </p>
          )}
          <footer className="ppm-sprint-map-dialog__footer">
            <button type="button" className="ppm-sprint-map-dialog__secondary" disabled={busy} onClick={onClose}>
              {ppmT("canvas.map.dialog_cancel")}
            </button>
            <button
              type="button"
              className="ppm-sprint-map-dialog__primary"
              aria-busy={busy || undefined}
              disabled={!selected || busy}
              onClick={() => void build()}
            >
              {busy && <LoaderCircle aria-hidden="true" className="ppm-sprint-map-dialog__spinner" />}
              {ppmT(busy ? "canvas.map.dialog_building" : "canvas.map.dialog_build")}
            </button>
          </footer>
        </div>
      </div>,
      window.document.body
    );
  }
  ```

- [ ] **Step 13: `map-group-card.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { ArrowRightToLine, ArrowUpRight, Clock, Flag, Timer } from "lucide-react";
  import { stopEventPropagation } from "tldraw";
  import type { TPpmCanvasGroupNode } from "@ppm/canvas";
  import { useTranslation } from "@plane/i18n";
  import { computePpmSprintScale, formatPpmSprintRange, type TPpmSprintScale } from "@/components/ppm-tasks/sprint";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate } from "../canvas-grammar";
  import { LiveGlyph } from "../live-card";
  import type { TPpmCanvasShape } from "../shape";
  import { usePpmLivingMap } from "./living-map-context";
  import { pluralKey } from "./map-model";

  // AF2.2 M1: узел group с полем map (K5). Рамка спринта — «Спринт · даты», живая шкала «День N из M · K из T задач
  // готово», «Открыть в Спринтах ↗»; секция направления — «Название · N задач», бейджи «Светофора», «↗». Данные —
  // usePpmLivingMap() (факты M и окружение F); заголовок узла — запас, пока Plane не прочитан.
  const SCALE_WIDTH = 200;
  const DONE_KEYS = {
    few: "canvas.map.sprint_done_few",
    many: "canvas.map.sprint_done_many",
    one: "canvas.map.sprint_done_one",
  } as const;
  const TASK_KEYS = {
    few: "canvas.map.section_tasks_few",
    many: "canvas.map.section_tasks_many",
    one: "canvas.map.section_tasks_one",
  } as const;
  const OVERDUE_KEYS = {
    few: "canvas.map.section_overdue_few",
    many: "canvas.map.section_overdue_many",
    one: "canvas.map.section_overdue_one",
  } as const;
  const BLOCKED_KEYS = {
    few: "canvas.map.section_blocked_few",
    many: "canvas.map.section_blocked_many",
    one: "canvas.map.section_blocked_one",
  } as const;

  export function LivingMapGroupCard({ node, shape }: { node: TPpmCanvasGroupNode; shape: TPpmCanvasShape }) {
    if (!node.map) return null;
    return node.map.role === "sprint" ? (
      <SprintFrameHeader cycleId={node.map.cycle_id} shapeId={shape.id} title={node.title} />
    ) : (
      <MapSectionHeader moduleId={node.map.module_id} shapeId={shape.id} title={node.title} />
    );
  }

  function SprintFrameHeader({ cycleId, shapeId, title }: { cycleId: string; shapeId: string; title: string }) {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const { args, mapSections, sprint } = usePpmLivingMap();
    const known = sprint?.cycleId === cycleId ? sprint : null;
    const info = known && !known.missing ? known : null;
    const summary = mapSections.get(shapeId);
    const range = info ? formatPpmSprintRange(info.startDate, info.endDate, currentLocale) : null;
    const heading =
      info && range ? fillCanvasTemplate(ppmT("canvas.map.sprint_title"), { name: info.name, range }) : title;
    const scale = info ? computePpmSprintScale(info.startDate, info.endDate, new Date()) : null;
    // «K из T задач готово» — по спринту Plane (как «Спринты»); пока он не прочитан — по карточкам этой рамки.
    const done = info ? info.done : (summary?.done ?? 0);
    const total = info ? info.total : (summary?.total ?? 0);
    const openLabel = fillCanvasTemplate(ppmT("canvas.map.sprint_open_label"), { name: info?.name || title });
    return (
      <div className="ppm-map-group" data-ppm-map-role="sprint">
        <header className="ppm-map-sprint__header">
          <Timer aria-hidden="true" className="ppm-map-group__icon" />
          <h2 className="ppm-map-sprint__title" title={ppmT("canvas.map.sprint_live_hint")}>
            {heading}
          </h2>
          <LiveGlyph />
          {known?.missing && <span className="ppm-map-sprint__meta">{ppmT("canvas.map.sprint_missing")}</span>}
          {scale && <SprintScale done={done} scale={scale} total={total} />}
          {args.workspaceSlug && (
            <a
              className="ppm-map-sprint__open"
              aria-label={openLabel}
              href={`/${args.workspaceSlug}/projects/${args.projectId}/cycles/${cycleId}`}
              title={openLabel}
              onClick={stopEventPropagation}
              onKeyDown={stopEventPropagation}
              onPointerDown={stopEventPropagation}
            >
              {ppmT("canvas.map.sprint_open")}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </header>
      </div>
    );
  }

  function SprintScale({ done, scale, total }: { done: number; scale: TPpmSprintScale; total: number }) {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const share = total > 0 ? Math.min(1, done / total) : 0;
    const todayX = 1 + Math.round(scale.todayPosition * (SCALE_WIDTH - 2));
    const dayLabel = fillCanvasTemplate(ppmT("tasks.sprint.day_of"), { day: scale.dayIndex, total: scale.totalDays });
    const doneLabel = fillCanvasTemplate(ppmT(pluralKey(total, currentLocale, DONE_KEYS)), { done, total });
    return (
      <span className="ppm-map-sprint__scale">
        <svg
          aria-label={fillCanvasTemplate(ppmT("canvas.map.sprint_progress"), {
            day: scale.dayIndex,
            days: scale.totalDays,
            done,
            total,
          })}
          className="ppm-map-sprint__bar"
          height="12"
          role="img"
          viewBox={`0 0 ${SCALE_WIDTH} 12`}
          width={SCALE_WIDTH}
        >
          <rect className="ppm-map-sprint__track" height="6" rx="3" width={SCALE_WIDTH} x="0" y="3" />
          <rect className="ppm-map-sprint__done" height="6" rx="3" width={Math.round(SCALE_WIDTH * share)} x="0" y="3" />
          <path className="ppm-map-sprint__today" d={`M${todayX} 0.75V11.25`} />
        </svg>
        <span className="ppm-map-sprint__meta">{`${dayLabel} · ${doneLabel}`}</span>
      </span>
    );
  }

  function MapSectionHeader({ moduleId, shapeId, title }: { moduleId: string | null; shapeId: string; title: string }) {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const { args, mapSections, modules, trafficLight } = usePpmLivingMap();
    const summary = mapSections.get(shapeId);
    const tasks = summary?.total ?? 0;
    const name = moduleId ? (modules?.get(moduleId)?.name ?? title) : ppmT("canvas.map.section_no_direction");
    const href =
      moduleId && args.workspaceSlug ? `/${args.workspaceSlug}/projects/${args.projectId}/modules/${moduleId}` : null;
    const openLabel = fillCanvasTemplate(ppmT("canvas.map.section_open"), { name });
    return (
      <div className="ppm-map-group" data-ppm-map-role="section">
        <header className="ppm-map-section__header">
          <Flag aria-hidden="true" className="ppm-map-group__icon" />
          <h3 className="ppm-map-section__title">{name}</h3>
          <span className="ppm-map-section__count">
            {`· ${fillCanvasTemplate(ppmT(pluralKey(tasks, currentLocale, TASK_KEYS)), { count: tasks })}`}
          </span>
          {trafficLight && summary && summary.overdue > 0 && (
            <span className="ppm-map-badge" data-tone="overdue">
              <Clock aria-hidden="true" />
              {fillCanvasTemplate(ppmT(pluralKey(summary.overdue, currentLocale, OVERDUE_KEYS)), {
                count: summary.overdue,
              })}
            </span>
          )}
          {trafficLight && summary && summary.blocked > 0 && (
            <span className="ppm-map-badge" data-tone="blocked">
              <ArrowRightToLine aria-hidden="true" />
              {fillCanvasTemplate(ppmT(pluralKey(summary.blocked, currentLocale, BLOCKED_KEYS)), {
                count: summary.blocked,
              })}
            </span>
          )}
          {href && (
            <a
              className="ppm-map-section__open"
              aria-label={openLabel}
              href={href}
              title={openLabel}
              onClick={stopEventPropagation}
              onKeyDown={stopEventPropagation}
              onPointerDown={stopEventPropagation}
            >
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </header>
      </div>
    );
  }
  ```

- [ ] **Step 14: `shape.tsx` — блоки M** (F файл не трогает; перечитать перед правкой — блоки C идут параллельно)
  1. В конец импортов — сразу над пустой строкой перед `export const PPM_CANVAS_SHAPE_TYPE = "ppm-canvas-node" as const;`,
     то есть после блока B6 AF2.1 и после блока импортов `AF2.2 C`, если C2 уже прошла (чужие блоки не трогать):
     ```ts
     // ── AF2.2 M: «Живая карта» — шапки рамки спринта и секций, «Светофор» живой карточки, предел размера карты ──
     import { LivingMapGroupCard } from "./living-map/map-group-card";
     import { ppmCanvasResizeLimits } from "./living-map/map-model";
     // ── /AF2.2 M ──
     ```
  2. `onResize` (`:258`) — было:
     ```ts
       override onResize(shape: TPpmCanvasShape, info: TLResizeInfo<TPpmCanvasShape>) {
         const resized = resizeBox(shape, info, { minHeight: 96, minWidth: 160, maxHeight: 1200, maxWidth: 1600 });
     ```
     стало:
     ```ts
       override onResize(shape: TPpmCanvasShape, info: TLResizeInfo<TPpmCanvasShape>) {
         // ── AF2.2 M: рамка спринта и секции карты — предел группы (PPM_CANVAS_GROUP_MAX_SIZE), прочее — 1600 × 1200 ──
         const resized = resizeBox(shape, info, ppmCanvasResizeLimits(shape.props.node));
         // ── /AF2.2 M ──
     ```
  3. `NodeEditor` (`:593`) — было:
     ```tsx
       return <NativeNodeCard editor={editor} node={node} shape={shape} />;
     }
     ```
     стало:
     ```tsx
       // ── AF2.2 M: «Живая карта» — рамка спринта и секции направлений (group с полем map), только под v2 ──
       if (grammarV2 && node.kind === "group" && node.map) return <LivingMapGroupCard node={node} shape={shape} />;
       // ── /AF2.2 M ──
       return <NativeNodeCard editor={editor} node={node} shape={shape} />;
     }
     ```

- [ ] **Step 15: `editor.tsx` — блоки M** (только свои блоки; перечитать файл перед правкой)
  1. Блок импортов M (`// ── AF2.2 M: «Карта спринта», связи «из Задач», «Светофор», «Не на карте» ──`) — добавить
     первой строкой блока:
     ```ts
     import { useProject } from "@/hooks/store/use-project";
     ```
  2. Блок окружения — было:
     ```ts
       // ── AF2.2 M: окружение линии M сверх общего (необязательные поля TLivingMapArgs из блока M) ──
       const livingMapArgsM = useMemo<Partial<TLivingMapArgs>>(() => ({}), []);
       // ── /AF2.2 M ──
     ```
     стало:
     ```ts
       // ── AF2.2 M: окружение линии M сверх общего (необязательные поля TLivingMapArgs из блока M) ──
       // Уведомление холста (AF2.1 B1), идентификатор проекта («ROBOT-12» у блокирующих и в лотке), статусы и участники
       // проекта (группы статусов блокирующих задач, имена в лотке) — всё, что уже есть у редактора.
       const { getProjectIdentifierById } = useProject();
       const livingMapProjectIdentifier = getProjectIdentifierById(projectId) || null;
       const livingMapArgsM = useMemo<Partial<TLivingMapArgs>>(
         () => ({
           notify: (message: string) => setContentNotice(message),
           projectIdentifier: livingMapProjectIdentifier,
           workItemOptions,
         }),
         [livingMapProjectIdentifier, workItemOptions]
       );
       // ── /AF2.2 M ──
     ```
     (`setContentNotice` — `useState` блока AF2.1 B1, объявлен выше; `workItemOptions` — состояние редактора.)

- [ ] **Step 16: Стили** — `$L/living-map.css`, между `/* ── M: карта спринта, «Светофор», «Не на карте», связи «из Задач» ── */`
  и `/* ── /M ── */`:
  ```css
  /* M1 · рамка спринта и секции направлений (узел group с полем map). Тело секции прозрачное: связи «из Задач» и
     смысловые связи рисуются под фигурами (html-слой tldraw) — заливка скрыла бы их внутри секции (RM5). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-group {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-group[data-ppm-map-role="section"] {
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-group__icon {
    width: 1rem;
    height: 1rem;
    flex: none;
    color: var(--ppm-color-icon-subtle, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__header {
    display: flex;
    height: 4rem;
    min-width: 0;
    align-items: center;
    gap: 0.625rem;
    padding: 0 1rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__title {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.25rem;
    text-overflow: ellipsis;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__scale {
    display: inline-flex;
    align-items: center;
    gap: 0.625rem;
    margin-left: 1rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__bar {
    flex: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__track {
    fill: var(--ppm-color-layer-2, var(--bg-layer-2));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__done {
    fill: var(--ppm-color-success, var(--txt-success-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__today {
    fill: none;
    stroke: var(--ppm-color-text, var(--txt-primary));
    stroke-linecap: round;
    stroke-width: 2;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__meta {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    line-height: 1rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__open {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    border-radius: var(--ppm-radius-xs, 0.25rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    pointer-events: auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__open svg,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-section__open svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-sprint__open:focus-visible,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-section__open:focus-visible {
    outline: 2px solid var(--ppm-color-focus, var(--border-accent-strong));
    outline-offset: 2px;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-section__header {
    display: flex;
    height: 3rem;
    min-width: 0;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.5rem 0 1rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-section__title {
    min-width: 0;
    margin: 0;
    overflow: hidden;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.25rem;
    text-overflow: ellipsis;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-section__count {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-badge {
    display: inline-flex;
    height: 1.25rem;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    padding: 0 0.375rem 0 0.25rem;
    border: 1px solid currentColor;
    border-radius: var(--ppm-radius-xs, 0.25rem);
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-badge[data-tone="overdue"] {
    color: var(--ppm-color-warning, var(--txt-warning-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-badge[data-tone="blocked"] {
    border-color: var(--ppm-color-danger-line, var(--txt-danger-primary));
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-badge svg {
    width: 0.75rem;
    height: 0.75rem;
    flex: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-map-section__open {
    display: inline-grid;
    width: 1.375rem;
    height: 1.375rem;
    flex: none;
    place-items: center;
    margin-left: auto;
    border-radius: var(--ppm-radius-xs, 0.25rem);
    color: var(--ppm-color-icon-subtle, var(--txt-tertiary));
    pointer-events: auto;
  }

  /* M1 · диалог «Карта спринта» — портал в body, корень несёт data-ppm-canvas-grammar="v2" */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"].ppm-sprint-map-backdrop {
    position: fixed;
    z-index: 60;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: var(--ppm-color-backdrop, rgb(0 0 0 / 0.4));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog {
    display: grid;
    width: min(30rem, 100%);
    max-height: min(38rem, 90vh);
    gap: 0.75rem;
    padding: 1rem;
    overflow: auto;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-lg, 0.75rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    box-shadow: var(--ppm-shadow-popover, 0 8px 24px rgb(0 0 0 / 0.24));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog:focus-visible {
    outline: 2px solid var(--ppm-color-focus, var(--border-accent-strong));
    outline-offset: 2px;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog svg {
    width: 1rem;
    height: 1rem;
    flex: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__header h2 {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__header button {
    display: inline-grid;
    width: 1.75rem;
    height: 1.75rem;
    place-items: center;
    margin-left: auto;
    border: 0;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    background: transparent;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprints {
    display: grid;
    gap: 0.25rem;
    margin: 0;
    padding: 0;
    border: 0;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprints legend {
    margin-bottom: 0.25rem;
    padding: 0;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprint {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: 0.5rem;
    row-gap: 0.125rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-sm, 0.375rem);
    cursor: pointer;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprint[data-selected] {
    border-color: var(--ppm-color-selection, var(--border-accent-strong));
    background: var(--ppm-color-selection-bg, var(--bg-accent-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprint input {
    grid-row: 1 / span 2;
    margin: 0;
    accent-color: var(--ppm-color-accent, var(--bg-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprint-name {
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__sprint-meta,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__note {
    margin: 0;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__error button {
    padding: 0;
    border: 0;
    color: inherit;
    background: transparent;
    text-decoration: underline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__secondary,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__primary {
    display: inline-flex;
    min-height: 2rem;
    align-items: center;
    gap: 0.375rem;
    padding: 0 0.75rem;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    font-size: 0.8125rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__secondary {
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__primary {
    border: 0;
    color: var(--ppm-color-on-accent, var(--txt-on-color));
    background: var(--ppm-color-accent, var(--bg-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog button:focus-visible {
    outline: 2px solid var(--ppm-color-focus, var(--border-accent-strong));
    outline-offset: 2px;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__spinner {
    animation: ppm-canvas-spin 1s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-sprint-map-dialog__spinner {
      animation: none;
    }
  }
  ```

- [ ] **Step 17: Строки** — `af22-living-map.ts`, сразу после строки `// ── M: карта спринта, «Светофор», «Не на карте», связи «из Задач» ──`:
  en (перед `// ── C:` блока en):
  ```ts
      "canvas.map.dialog_sprint_label": "Sprint",
      "canvas.map.dialog_phase_current": "current",
      "canvas.map.dialog_phase_upcoming": "upcoming",
      "canvas.map.dialog_phase_completed": "finished",
      "canvas.map.dialog_grouping": "Sections: by direction",
      "canvas.map.dialog_new_board": "A new board «{name}» will be created; existing boards stay as they are.",
      "canvas.map.dialog_loading": "Loading sprints…",
      "canvas.map.dialog_load_error": "Could not load the sprints.",
      "canvas.map.dialog_retry": "Retry",
      "canvas.map.dialog_empty": "No current, upcoming or recently finished sprints (60 days).",
      "canvas.map.dialog_cancel": "Cancel",
      "canvas.map.dialog_build": "Build map",
      "canvas.map.dialog_building": "Building the map…",
      "canvas.map.dialog_no_tasks": "The sprint has no tasks — no board was created.",
      "canvas.map.dialog_build_error": "Could not build the map. Try again.",
      "canvas.map.board_name": "Map · {name}",
      "canvas.map.board_not_empty": "A sprint map is built on a new empty board only.",
      "canvas.map.built": "The map is built: {count} tasks on it",
      "canvas.map.built_partial": "The map is built: {placed} tasks on it, {failed} not added — see «Not on the map»",
      "canvas.map.assembly_error": "Could not lay the sprint tasks out on the map.",
      "canvas.map.sprint_title": "{name} · {range}",
      "canvas.map.sprint_live_hint": "Live frame: the data comes from Sprints",
      "canvas.map.sprint_done_one": "{done} of {total} task done",
      "canvas.map.sprint_done_few": "{done} of {total} tasks done",
      "canvas.map.sprint_done_many": "{done} of {total} tasks done",
      "canvas.map.sprint_progress": "{done} of {total} done, day {day} of {days}",
      "canvas.map.sprint_open": "Open in Sprints",
      "canvas.map.sprint_open_label": "Open «{name}» in Sprints",
      "canvas.map.sprint_missing": "sprint unavailable",
      "canvas.map.section_no_direction": "No direction",
      "canvas.map.section_tasks_one": "{count} task",
      "canvas.map.section_tasks_few": "{count} tasks",
      "canvas.map.section_tasks_many": "{count} tasks",
      "canvas.map.section_overdue_one": "{count} overdue",
      "canvas.map.section_overdue_few": "{count} overdue",
      "canvas.map.section_overdue_many": "{count} overdue",
      "canvas.map.section_blocked_one": "{count} blocked",
      "canvas.map.section_blocked_few": "{count} blocked",
      "canvas.map.section_blocked_many": "{count} blocked",
      "canvas.map.section_open": "Open direction «{name}»",
  ```
  ru (перед `// ── C:` блока ru):
  ```ts
      "canvas.map.dialog_sprint_label": "Спринт",
      "canvas.map.dialog_phase_current": "идёт сейчас",
      "canvas.map.dialog_phase_upcoming": "впереди",
      "canvas.map.dialog_phase_completed": "завершён",
      "canvas.map.dialog_grouping": "Секции — по направлениям",
      "canvas.map.dialog_new_board": "Будет создана новая доска «{name}»; существующие доски не меняются.",
      "canvas.map.dialog_loading": "Загружаем спринты…",
      "canvas.map.dialog_load_error": "Не удалось загрузить спринты.",
      "canvas.map.dialog_retry": "Повторить",
      "canvas.map.dialog_empty": "Нет текущих, будущих и завершённых за 60 дней спринтов.",
      "canvas.map.dialog_cancel": "Отмена",
      "canvas.map.dialog_build": "Собрать карту",
      "canvas.map.dialog_building": "Собираем карту…",
      "canvas.map.dialog_no_tasks": "В спринте нет задач — доска не создана.",
      "canvas.map.dialog_build_error": "Не удалось собрать карту. Попробуйте ещё раз.",
      "canvas.map.board_name": "Карта · {name}",
      "canvas.map.board_not_empty": "Карта спринта собирается только на новой пустой доске.",
      "canvas.map.built": "Карта собрана: задач на карте — {count}",
      "canvas.map.built_partial": "Карта собрана: на карте {placed}, не добавлено {failed} — они в «Не на карте»",
      "canvas.map.assembly_error": "Не удалось разложить задачи спринта на карте.",
      "canvas.map.sprint_title": "{name} · {range}",
      "canvas.map.sprint_live_hint": "Живая рамка: данные приходят из Спринтов",
      "canvas.map.sprint_done_one": "{done} из {total} задачи готово",
      "canvas.map.sprint_done_few": "{done} из {total} задач готово",
      "canvas.map.sprint_done_many": "{done} из {total} задач готово",
      "canvas.map.sprint_progress": "Готово {done} из {total}, идёт {day}-й день из {days}",
      "canvas.map.sprint_open": "Открыть в Спринтах",
      "canvas.map.sprint_open_label": "Открыть «{name}» в Спринтах",
      "canvas.map.sprint_missing": "спринт недоступен",
      "canvas.map.section_no_direction": "Без направления",
      "canvas.map.section_tasks_one": "{count} задача",
      "canvas.map.section_tasks_few": "{count} задачи",
      "canvas.map.section_tasks_many": "{count} задач",
      "canvas.map.section_overdue_one": "{count} просрочена",
      "canvas.map.section_overdue_few": "{count} просрочены",
      "canvas.map.section_overdue_many": "{count} просрочено",
      "canvas.map.section_blocked_one": "{count} заблокирована",
      "canvas.map.section_blocked_few": "{count} заблокированы",
      "canvas.map.section_blocked_many": "{count} заблокировано",
      "canvas.map.section_open": "Открыть направление «{name}»",
  ```
  Затем
  `cd $PF/packages/ppm-brand && ../../node_modules/.bin/oxfmt src/translations/af22-living-map.ts && $T/af22-pkg-build.sh ppm-brand`.

- [ ] **Step 18: Прогнать тест** —
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/living-map-assembly.test.ts` → `21 passed`;
  затем `tests/ppm-canvas/af22-foundation.test.ts` (гард F: блоки, CSS, экспорты) — зелёный.

- [ ] **Step 19: Формат, линт, типы, полный набор**
  ```bash
  cd $PF/apps/web && ../../node_modules/.bin/oxfmt core/services/ppm-canvas-map.service.ts \
    core/components/ppm-canvas/living-map/{map-model,map-layout,map-shapes,map-assembly,map-assembly-queue,map-data,living-map-facts,living-map-types}.ts \
    core/components/ppm-canvas/living-map/{map-assembly-dialog,map-group-card}.tsx core/components/ppm-canvas/{shape,editor}.tsx \
    tests/ppm-canvas/living-map-assembly.test.ts tests/ppm-canvas/fixtures/living-map.ts
  ../../node_modules/.bin/oxlint core/services/ppm-canvas-map.service.ts core/components/ppm-canvas/living-map tests/ppm-canvas/living-map-assembly.test.ts tests/ppm-canvas/fixtures/living-map.ts
  ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-26-af22-living-map/web-M.tsbuildinfo 2>&1 | grep -E "ppm-canvas/|ppm-canvas-map.service|tests/ppm-canvas"
  ./node_modules/.bin/vitest run
  ../../node_modules/.bin/oxlint --max-warnings=11957 .
  cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs
  ```
  Ожидание: свои файлы — `Found 0 warnings and 0 errors.`; tsc по своим путям — пусто; web vitest — базовая линия + 1 файл /
  +21 тест (плюс файлы F); oxlint — `719 warnings and 0 errors`; brand — зелёный, аудиты чистые.

**Acceptance (M1):**
- [ ] «Карта спринта» (рейка, палитра, пустая доска) у редактора открывает диалог: текущий спринт выбран, есть будущие и
  завершённые за 60 дней; «Собрать карту» создаёт **новую** доску «Карта · Спринт 3» (или «(2)»), она открывается вкладкой,
  на ней за ≤ 5 с (50 задач) — рамка «Спринт 3 · 16–29 сент.» с шкалой «День 8 из 14 · 5 из 9 задач готово» и «Открыть в
  Спринтах ↗», секции по направлениям («Без направления» — последней), живые карточки сеткой до 4 колонок без наложений.
  Сборка — один шаг истории: «Отменить» убирает рамку и секции, живые карточки остаются на своих местах (AF2.1, RM15);
  «Повторить» возвращает их в секции. Delete по секции карты не прячет её живые карточки — они остаются на доске.
- [ ] После первого сохранения новой карты у сборщика кнопка — «Что изменилось» без числа, меток «добавлено» нет; панель
  C (после перезагрузки вкладки или возврата в окно) — «За этот период ничего не изменилось.» (RM14).
- [ ] Существующая доска не меняется; пустой спринт — доски нет и сообщение в диалоге; читатель команды не видит.
- [ ] Большую рамку можно растянуть выше 1200 без схлопывания; v1 и минимальный режим — прежние.

---

### Task M2: связи Plane «из Задач» — отображение типов, загрузка задач со связями, слой только для чтения

**Files:**
- Create: `$L/task-relations.ts`. Replace (заглушка F): `$L/task-relations-layer.tsx`.
- Modify: `$L/map-data.ts` (`loadLivingMapData` целиком, строка `relationEdges`), `$L/living-map.css` (блок M),
  `af22-living-map.ts` (блок M).
- Test: `apps/web/tests/ppm-canvas/living-map-relations.test.ts`.

**Interfaces:**
- Consumes: M1 — `TMapIssue`, `TTaskLinkKind`, `TTaskRelationEdge`, `TLivingMapCard` (`map-model.ts`), `TLivingMapLoaders`,
  `loadLivingMapData`, `computeLivingMapView` (`map-data.ts`), фикстура; F — `usePpmLivingMap().relationEdges`,
  `<PpmTaskRelationsLayer />` дочерний `<Tldraw>` под `grammarV2`. Существующие: `buildSemanticEdgeGeometry`,
  `buildSemanticEdgeEnd` (`semantic-edge-geometry.ts`), `SEMANTIC_EDGE_STYLE`, `SEMANTIC_EDGE_CHIP_MIN_ZOOM`,
  `shouldShowEdgeChip` (`semantic-edge-style.ts`), классы `.ppm-semantic-edge*` (`canvas-v2.css:132-176`),
  `.ppm-visually-hidden` (`canvas.css:3266`), `SVGContainer`, `useValue`, `useEditor` (tldraw).
- Produces: `PLANE_RELATION_LINKS`, `planeRelationLink`, `TASK_LINK_LABEL_KEYS`, `TLDRAW_SHAPES_LAYER_SELECTOR`,
  `TBoardTaskCard`, `taskCards`, `collectTaskRelations` (`task-relations.ts`); `PpmTaskRelationsLayer`; заполненное
  `relationEdges`; `data.issues`/`data.sprintIssueIds` (их потребляют M3, M4).

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && T=docs/superpowers/plans/2026-09-26-af22/tools; L=apps/web/core/components/ppm-canvas/living-map
  $T/af22-pre.sh $L/task-relations.ts $L/task-relations-layer.tsx apps/web/tests/ppm-canvas/living-map-relations.test.ts
  ```

- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/living-map-relations.test.ts`:
  ```ts
  // AF2.2 M2: связи Plane «из Задач» между живыми карточками — типы, направление, одна линия на пару, данные одним
  // запросом; слой только читает и рисует в html-слое фигур tldraw (под карточками, без перерисовок на кадрах камеры).
  import { readFileSync } from "node:fs";
  import { createRequire } from "node:module";
  import { dirname, join } from "node:path";
  import { describe, expect, it, vi } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { createPpmSprintFrameNode, serializePpmCanvasNode } from "@ppm/canvas";
  import { computeLivingMapView, loadLivingMapData } from "@/components/ppm-canvas/living-map/map-data";
  import { mapGroupsOf } from "@/components/ppm-canvas/living-map/map-model";
  import {
    collectTaskRelations,
    planeRelationLink,
    TASK_LINK_LABEL_KEYS,
    TLDRAW_SHAPES_LAYER_SELECTOR,
  } from "@/components/ppm-canvas/living-map/task-relations";
  import { SEMANTIC_EDGE_STYLE } from "@/components/ppm-canvas/semantic-edge-style";
  import {
    CURRENT,
    issue,
    MODULES,
    norm,
    NOW,
    PROJECT,
    relation,
    STATES,
    USER,
    uuid,
    workItemBinding,
  } from "./fixtures/living-map";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));
  const card = (seq: number, shapeId: string) => ({ identifier: `ROBOT-${seq}`, shapeId, workItemId: uuid(seq) });

  describe("AF2.2 M2: связи «из Задач»", () => {
    it("maps Plane relation kinds to the canvas link kinds and skips duplicates and reverse sides", () => {
      expect(
        [
          "blocked_by",
          "start_before",
          "finish_before",
          "relates_to",
          "implemented_by",
          "duplicate",
          "blocking",
          "custom",
        ].map(planeRelationLink)
      ).toEqual(["blocks", "depends_on", "depends_on", "relates_to", "implements", null, null, null]);
      expect(SEMANTIC_EDGE_STYLE.blocks).toMatchObject({ end: "bar", tone: "danger" });
      expect(SEMANTIC_EDGE_STYLE.depends_on.end).toBe("arrow");
      expect(SEMANTIC_EDGE_STYLE.relates_to.end).toBe("none");
      expect(TASK_LINK_LABEL_KEYS.blocks).toBe("canvas.map.relation_blocks");
    });

    it("draws from the blocker to the blocked task, from the dependent task, one line per related pair", () => {
      const issues = [
        issue(15, [], { issue_relation: [relation(12, "blocked_by")] }),
        issue(16, [], { issue_relation: [relation(15, "start_before"), relation(5, "relates_to")] }),
        issue(5, [], {
          issue_relation: [relation(16, "relates_to"), relation(12, "duplicate"), relation(99, "blocked_by")],
        }),
        issue(12),
      ];
      const cards = [card(12, "shape:a"), card(15, "shape:b"), card(16, "shape:c"), card(5, "shape:d")];
      expect(collectTaskRelations(issues, cards)).toEqual([
        {
          fromLabel: "ROBOT-12",
          fromShapeId: "shape:a",
          id: `blocks:${uuid(12)}:${uuid(15)}`,
          kind: "blocks",
          toLabel: "ROBOT-15",
          toShapeId: "shape:b",
        },
        {
          fromLabel: "ROBOT-15",
          fromShapeId: "shape:b",
          id: `depends_on:${uuid(15)}:${uuid(16)}`,
          kind: "depends_on",
          toLabel: "ROBOT-16",
          toShapeId: "shape:c",
        },
        {
          fromLabel: "ROBOT-5",
          fromShapeId: "shape:d",
          id: `relates_to:${uuid(5)}:${uuid(16)}`,
          kind: "relates_to",
          toLabel: "ROBOT-16",
          toShapeId: "shape:c",
        },
      ]);
    });

    it("links a task placed twice through its card with the smaller id and ignores tasks off the board", () => {
      const issues = [issue(9, [], { issue_relation: [relation(7, "implemented_by"), relation(40, "relates_to")] })];
      const cards = [card(9, "shape:z"), card(9, "shape:b"), card(7, "shape:k")];
      expect(collectTaskRelations(issues, cards)).toEqual([
        {
          fromLabel: "ROBOT-7",
          fromShapeId: "shape:k",
          id: `implements:${uuid(7)}:${uuid(9)}`,
          kind: "implements",
          toLabel: "ROBOT-9",
          toShapeId: "shape:b",
        },
      ]);
    });

    it("reads the sprint with its links in one request and the project list only for tasks outside the sprint", async () => {
      const sprint = [issue(12), issue(15, [], { issue_relation: [relation(12, "blocked_by")] })];
      const loaders = {
        cycle: vi.fn(async () => CURRENT),
        modules: vi.fn(async () => MODULES),
        projectIssues: vi.fn(async () => [
          issue(40, [], { cycle_id: null, issue_relation: [relation(15, "relates_to")] }),
        ]),
        pullRequests: vi.fn(async () => []),
        sprintIssues: vi.fn(async () => sprint),
      };
      const inSprint = await loadLivingMapData(loaders, {
        boardWorkItemIds: [uuid(12), uuid(15)],
        cycleId: CURRENT.id,
        now: 1,
      });
      expect(loaders.sprintIssues).toHaveBeenCalledWith(CURRENT.id);
      expect(loaders.projectIssues).not.toHaveBeenCalled();
      expect(inSprint.sprintIssueIds).toEqual([uuid(12), uuid(15)]);
      const mixed = await loadLivingMapData(loaders, {
        boardWorkItemIds: [uuid(15), uuid(40)],
        cycleId: CURRENT.id,
        now: 2,
      });
      expect(loaders.projectIssues).toHaveBeenCalledTimes(1);
      expect([...mixed.issues.keys()]).toEqual([uuid(12), uuid(15), uuid(40)]);
      const plain = await loadLivingMapData(loaders, { boardWorkItemIds: [uuid(40)], cycleId: null, now: 3 });
      expect(loaders.sprintIssues).toHaveBeenCalledTimes(2);
      expect(plain.sprintIssueIds).toBeNull();
      expect(plain.issues.has(uuid(40))).toBe(true);
      loaders.projectIssues.mockRejectedValueOnce(new Error("offline"));
      const partial = await loadLivingMapData(loaders, {
        boardWorkItemIds: [uuid(15), uuid(40)],
        cycleId: CURRENT.id,
        now: 4,
      });
      expect(partial.sprintIssueIds).toEqual([uuid(12), uuid(15)]);
    });

    it("shows the links of the cards that are on the board, on any v2 board", async () => {
      const frame = serializePpmCanvasNode(
        createPpmSprintFrameNode({ authorId: USER, cycleId: CURRENT.id, now: NOW, title: "Спринт 3" })
      );
      const loaders = {
        cycle: async () => CURRENT,
        modules: async () => MODULES,
        projectIssues: async () => [],
        pullRequests: async () => [],
        sprintIssues: async () => [issue(12), issue(15, [], { issue_relation: [relation(12, "blocked_by")] })],
      };
      const data = await loadLivingMapData(loaders, {
        boardWorkItemIds: [uuid(12), uuid(15)],
        cycleId: CURRENT.id,
        now: 1,
      });
      const view = computeLivingMapView({
        cards: [
          { binding: workItemBinding(12, "shape:a"), shapeId: "shape:a" },
          { binding: workItemBinding(15, "shape:b"), shapeId: "shape:b" },
        ],
        data,
        groups: mapGroupsOf([{ id: "shape:frame", node: frame, parentId: "page:page" }]),
        options: { assignees: [], priorities: [], states: STATES },
        projectId: PROJECT,
        projectIdentifier: "ROBOT",
        today: new Date(2026, 8, 26),
      });
      expect(view.relationEdges.map((edge) => [edge.kind, edge.fromShapeId, edge.toShapeId])).toEqual([
        ["blocks", "shape:a", "shape:b"],
      ]);
    });

    it("never writes the links: the layer only reads the context and draws inside tldraw's shapes layer", () => {
      const layer = read("living-map/task-relations-layer.tsx");
      has(layer, "editor.getContainer().querySelector<HTMLElement>(TLDRAW_SHAPES_LAYER_SELECTOR)");
      has(layer, "createPortal(");
      has(layer, 'aria-hidden="true"');
      has(layer, "buildSemanticEdgeGeometry(");
      has(layer, "editor.getZoomLevel() >= SEMANTIC_EDGE_CHIP_MIN_ZOOM");
      for (const forbidden of [
        "createSemanticEdge",
        "updateShapes",
        "createShapes",
        "saveBoard",
        "registerBindings",
        "getCamera",
      ])
        expect(layer, forbidden).not.toContain(forbidden);
      for (const file of ["living-map/task-relations.ts", "living-map/task-relations-layer.tsx"])
        expect(read(file), file).not.toContain("ppm-canvas.service");
      // Слой рисует в html-слое фигур закреплённого tldraw 3.15.6: при обновлении tldraw — сверить класс здесь.
      const nodeRequire = createRequire(import.meta.url);
      const editorEntry = nodeRequire.resolve("@tldraw/editor", { paths: [dirname(nodeRequire.resolve("tldraw"))] });
      const canvas = readFileSync(
        join(dirname(editorEntry), "lib/components/default-components/DefaultCanvas.js"),
        "utf8"
      );
      expect(TLDRAW_SHAPES_LAYER_SELECTOR).toBe(".tl-html-layer.tl-shapes");
      expect(canvas).toContain("tl-html-layer tl-shapes");
    });

    it("names the links as K5 does, in both languages", () => {
      expect(
        (["blocks", "depends_on", "relates_to", "implements"] as const).map((kind) =>
          getPpmTranslation("ru", TASK_LINK_LABEL_KEYS[kind])
        )
      ).toEqual(["Блокирует", "Зависит от", "Связано", "Реализует"]);
      expect(getPpmTranslation("ru", "canvas.map.relation_source")).toBe("из Задач");
      expect(getPpmTranslation("ru", "canvas.map.relation_hint")).toBe("Связь из Задач: изменяется в Задачах");
      expect(getPpmTranslation("en", "canvas.map.relation_blocks")).toBe("Blocks");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/living-map/task-relations"`.

- [ ] **Step 3: `task-relations.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPpmTranslationKey } from "@ppm/brand";
  import type { TLivingMapCard, TMapIssue, TTaskLinkKind, TTaskRelationEdge } from "./map-model";

  // AF2.2 M2: связи Plane «из Задач» между живыми карточками. Производные: считаются из данных Plane при открытии доски и
  // обновлении, в снимок доски и в ppm_semantic_edges не пишутся; правятся только в «Задачах».
  // Строка IssueRelation (issue = A, related_issue = B, T) читается «A T B» (app/views/issue/relation.py:42-105):
  // blocked_by — B блокирует A; start_before / finish_before — A раньше B, значит B зависит от A; implemented_by — B
  // реализует A. Линия идёт от B к A; relates_to — без направления (одна линия на пару); duplicate — не рисуется.
  // В expand=issue_relation приходят только прямые стороны — обратные (blocking, start_after…) не нужны.
  export const PLANE_RELATION_LINKS: Readonly<Record<string, TTaskLinkKind>> = {
    blocked_by: "blocks",
    finish_before: "depends_on",
    implemented_by: "implements",
    relates_to: "relates_to",
    start_before: "depends_on",
  };

  export const TASK_LINK_LABEL_KEYS = {
    blocks: "canvas.map.relation_blocks",
    depends_on: "canvas.map.relation_depends_on",
    implements: "canvas.map.relation_implements",
    relates_to: "canvas.map.relation_relates_to",
  } as const satisfies Record<TTaskLinkKind, TPpmTranslationKey>;

  /** html-слой фигур tldraw (DefaultCanvas): камера двигает его сама, дочерние элементы — в координатах страницы. */
  export const TLDRAW_SHAPES_LAYER_SELECTOR = ".tl-html-layer.tl-shapes";

  export function planeRelationLink(relationType: string): TTaskLinkKind | null {
    return Object.hasOwn(PLANE_RELATION_LINKS, relationType) ? PLANE_RELATION_LINKS[relationType] : null;
  }

  export type TBoardTaskCard = { identifier: string | null; shapeId: string; workItemId: string };

  export function taskCards(cards: readonly TLivingMapCard[]): TBoardTaskCard[] {
    return cards.flatMap((card) =>
      card.binding.entity_type === "work_item"
        ? [
            {
              identifier: card.binding.source.identity.identifier,
              shapeId: card.shapeId,
              workItemId: card.binding.entity_id,
            },
          ]
        : []
    );
  }

  /** Линии между задачами, которые обе лежат на доске; задача на доске дважды — через карточку с меньшим id. */
  export function collectTaskRelations(
    issues: Iterable<TMapIssue>,
    cards: readonly TBoardTaskCard[]
  ): TTaskRelationEdge[] {
    const byWorkItem = new Map<string, TBoardTaskCard>();
    for (const item of cards) {
      const known = byWorkItem.get(item.workItemId);
      if (!known || item.shapeId < known.shapeId) byWorkItem.set(item.workItemId, item);
    }
    const edges = new Map<string, TTaskRelationEdge>();
    for (const item of issues) {
      const owner = byWorkItem.get(item.id);
      if (!owner) continue;
      for (const row of item.issue_relation) {
        const kind = planeRelationLink(row.relation_type);
        const related = kind ? byWorkItem.get(row.id) : undefined;
        if (!kind || !related || related.shapeId === owner.shapeId) continue;
        const [from, to] =
          kind === "relates_to" && owner.workItemId < related.workItemId ? [owner, related] : [related, owner];
        const id = `${kind}:${from.workItemId}:${to.workItemId}`;
        if (!edges.has(id))
          edges.set(id, {
            fromLabel: from.identifier ?? "",
            fromShapeId: from.shapeId,
            id,
            kind,
            toLabel: to.identifier ?? "",
            toShapeId: to.shapeId,
          });
      }
    }
    // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array from the map (lib ES2022: no toSorted).
    return [...edges.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
  ```

- [ ] **Step 4: `map-data.ts` — задачи со связями и `relationEdges`**
  - Импорты — добавить `import { collectTaskRelations, taskCards } from "./task-relations";`.
  - `loadLivingMapData` — заменить функцию целиком на:
    ```ts
    export async function loadLivingMapData(
      loaders: TLivingMapLoaders,
      request: TLivingMapRequest
    ): Promise<TLivingMapData> {
      const { cycleId } = request;
      let cycle: TMapCycle | null = null;
      let modules: TMapModule[] = [];
      let sprintIssues: TMapIssue[] | null = null;
      if (cycleId) {
        [cycle, modules, sprintIssues] = await Promise.all([
          loaders.cycle(cycleId),
          loaders.modules().catch((): TMapModule[] => []),
          loaders.sprintIssues(cycleId),
        ]);
      }
      const issues = new Map<string, TMapIssue>();
      for (const item of sprintIssues ?? []) issues.set(item.id, item);
      // Проектный список (последние 1000 по обновлению) — только ради карточек вне спринта карты или доски без карты.
      if (request.boardWorkItemIds.some((id) => !issues.has(id))) {
        for (const item of await loaders.projectIssues().catch((): TMapIssue[] => []))
          if (!issues.has(item.id)) issues.set(item.id, item);
      }
      return {
        ...EMPTY_LIVING_MAP_DATA,
        cycle,
        cycleId,
        issues,
        loadedAt: request.now,
        modules,
        sprintIssueIds: sprintIssues ? sprintIssues.map((item) => item.id) : null,
      };
    }
    ```
  - В `computeLivingMapView` было:
    ```ts
        // M2: связи «из Задач» (task-relations.ts).
        relationEdges: [],
    ```
    стало:
    ```ts
        relationEdges: collectTaskRelations(input.data.issues.values(), taskCards(input.cards)),
    ```

- [ ] **Step 5: `task-relations-layer.tsx` — заменить заглушку F целиком**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { memo, useEffect, useState } from "react";
  import { createPortal } from "react-dom";
  import { SquareCheck } from "lucide-react";
  import { SVGContainer, useEditor, useValue, type TLShapeId } from "tldraw";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate } from "../canvas-grammar";
  import { buildSemanticEdgeEnd, buildSemanticEdgeGeometry } from "../semantic-edge-geometry";
  import { SEMANTIC_EDGE_CHIP_MIN_ZOOM, SEMANTIC_EDGE_STYLE, shouldShowEdgeChip } from "../semantic-edge-style";
  import { usePpmLivingMap } from "./living-map-context";
  import type { TTaskRelationEdge } from "./map-model";
  import { TASK_LINK_LABEL_KEYS, TLDRAW_SHAPES_LAYER_SELECTOR } from "./task-relations";

  // AF2.2 M2: связи «из Задач». Лист <Tldraw> (точка F) рисует порталом в html-слой фигур tldraw (RM1): там координаты
  // страницы и трансформация камеры — пан/зум не перерисовывают React; z-index фигур выше — линии под карточками, как
  // смысловые связи. Только чтение: ни доски, ни ppm_semantic_edges не трогает; правка — в «Задачах» (подсказка чипа).
  const NO_EDGES: readonly TTaskRelationEdge[] = [];

  export function PpmTaskRelationsLayer() {
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    const { args, relationEdges } = usePpmLivingMap();
    const edges = args.enabled ? (relationEdges ?? NO_EDGES) : NO_EDGES;
    const [host, setHost] = useState<HTMLElement | null>(null);
    useEffect(() => {
      setHost(editor.getContainer().querySelector<HTMLElement>(TLDRAW_SHAPES_LAYER_SELECTOR));
    }, [editor]);
    const showChips = useValue("ppm task relation chips", () => editor.getZoomLevel() >= SEMANTIC_EDGE_CHIP_MIN_ZOOM, [
      editor,
    ]);
    const selectedIds = useValue("ppm task relation selection", () => editor.getSelectedShapeIds(), [editor]);
    if (edges.length === 0) return null;
    const selected = new Set<string>(selectedIds);
    return (
      <>
        <ul aria-label={ppmT("canvas.map.relation_list")} className="ppm-visually-hidden">
          {edges.map((edge) => (
            <li key={edge.id}>
              {fillCanvasTemplate(ppmT("canvas.map.relation_item"), {
                from: edge.fromLabel,
                to: edge.toLabel,
                type: ppmT(TASK_LINK_LABEL_KEYS[edge.kind]),
              })}
            </li>
          ))}
        </ul>
        {host &&
          createPortal(
            <div aria-hidden="true" className="ppm-task-relations-layer">
              {edges.map((edge) => (
                <TaskRelationEdge
                  edge={edge}
                  emphasized={selected.has(edge.fromShapeId) || selected.has(edge.toShapeId)}
                  key={edge.id}
                  showChip={showChips}
                />
              ))}
            </div>,
            host
          )}
      </>
    );
  }

  const TaskRelationEdge = memo(function TaskRelationEdge({
    edge,
    emphasized,
    showChip,
  }: {
    edge: TTaskRelationEdge;
    emphasized: boolean;
    showChip: boolean;
  }) {
    const editor = useEditor();
    const ppmT = usePpmTranslation();
    // Подписка только на границы двух карточек: перетаскивание пересчитывает свои связи, остальное — нет.
    const geometry = useValue(
      `ppm task relation ${edge.id}`,
      () => {
        const from = editor.getShapePageBounds(edge.fromShapeId as TLShapeId);
        const to = editor.getShapePageBounds(edge.toShapeId as TLShapeId);
        return from && to
          ? buildSemanticEdgeGeometry(
              { h: from.h, w: from.w, x: from.x, y: from.y },
              { h: to.h, w: to.w, x: to.x, y: to.y }
            )
          : null;
      },
      [editor, edge.fromShapeId, edge.toShapeId]
    );
    if (!geometry) return null;
    const style = SEMANTIC_EDGE_STYLE[edge.kind];
    const label = ppmT(TASK_LINK_LABEL_KEYS[edge.kind]);
    const source = ppmT("canvas.map.relation_source");
    const endPath = buildSemanticEdgeEnd(geometry.end, geometry.endDirection, style.end);
    return (
      <>
        <SVGContainer
          className="ppm-semantic-edge ppm-task-relation"
          data-emphasized={emphasized || undefined}
          data-origin="tasks"
          data-relation={edge.kind}
          data-tone={style.tone}
        >
          <path className="ppm-semantic-edge__line" d={geometry.path} />
          {endPath && <path className="ppm-semantic-edge__end" d={endPath} />}
          <circle className="ppm-semantic-edge__port" cx={geometry.start.x} cy={geometry.start.y} r={2.5} />
        </SVGContainer>
        {showChip && shouldShowEdgeChip(geometry.labelSegmentLength, `${label} · ${source}`) && (
          <span
            className="ppm-task-relation-chip"
            data-emphasized={emphasized || undefined}
            data-tone={style.tone}
            style={{ left: geometry.label.x, top: geometry.label.y }}
            title={ppmT("canvas.map.relation_hint")}
          >
            {label}
            <span aria-hidden="true" className="ppm-task-relation-chip__divider" />
            <span className="ppm-task-relation-chip__source">
              <SquareCheck aria-hidden="true" />
              {source}
            </span>
          </span>
        )}
      </>
    );
  });
  ```

- [ ] **Step 6: Стили** — в блок M `living-map.css` (перед `/* ── /M ── */`):
  ```css
  /* M2 · связи «из Задач»: линии и концы — классы смысловых связей (canvas-v2.css), слой и чип — свои. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relations-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    overflow: visible;
    pointer-events: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation {
    color: var(--ppm-color-link-emphasis, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation[data-tone="danger"] {
    color: var(--ppm-color-danger-line, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation-chip {
    position: absolute;
    z-index: 1;
    display: inline-flex;
    height: var(--ppm-link-chip-height, 1.25rem);
    align-items: center;
    gap: 0.375rem;
    padding: 0 0.375rem;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-xs, 0.25rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.6875rem;
    font-weight: 500;
    line-height: 1rem;
    white-space: nowrap;
    transform: translate(-50%, -50%);
    cursor: default;
    pointer-events: auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation-chip[data-tone="danger"] {
    border-color: var(--ppm-color-danger-line, var(--txt-danger-primary));
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation-chip__divider {
    width: 1px;
    height: 0.75rem;
    flex: none;
    background: var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation-chip__source {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-weight: 400;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-task-relation-chip__source svg {
    width: 0.75rem;
    height: 0.75rem;
    flex: none;
  }
  ```

- [ ] **Step 7: Строки** — в блок M (после ключей M1), en и ru:
  ```ts
      "canvas.map.relation_blocks": "Blocks",
      "canvas.map.relation_depends_on": "Depends on",
      "canvas.map.relation_relates_to": "Related",
      "canvas.map.relation_implements": "Implements",
      "canvas.map.relation_source": "from Tasks",
      "canvas.map.relation_hint": "A link from Tasks: change it in Tasks",
      "canvas.map.relation_list": "Links from Tasks on this board",
      "canvas.map.relation_item": "{from} — {type} → {to} (a link from Tasks)",
  ```
  ```ts
      "canvas.map.relation_blocks": "Блокирует",
      "canvas.map.relation_depends_on": "Зависит от",
      "canvas.map.relation_relates_to": "Связано",
      "canvas.map.relation_implements": "Реализует",
      "canvas.map.relation_source": "из Задач",
      "canvas.map.relation_hint": "Связь из Задач: изменяется в Задачах",
      "canvas.map.relation_list": "Связи из Задач на доске",
      "canvas.map.relation_item": "{from} — {type} → {to} (связь из Задач)",
  ```
  `oxfmt` файла и `$T/af22-pkg-build.sh ppm-brand`.

- [ ] **Step 8: Прогон** — `vitest run tests/ppm-canvas/living-map-relations.test.ts` → `7 passed`;
  `vitest run tests/ppm-canvas/living-map-assembly.test.ts` — по-прежнему `21 passed`; затем формат/линт/tsc (как M1
  Step 19, файлы: `task-relations.ts`, `task-relations-layer.tsx`, `map-data.ts`, тест), web vitest целиком, brand.

**Acceptance (M2):**
- [ ] На карте (и на любой доске v2 с живыми карточками) между карточками — «Блокирует · из Задач» (красная, ⊣ у
  заблокированной), «Зависит от · из Задач» (стрелка к той, от которой зависит), «Связано», «Реализует»; дубли не рисуются.
- [ ] Связи под карточками, едут с камерой без мигания; чип показывает «Связь из Задач: изменяется в Задачах»; в снимке
  доски и в «Смысловых связях» их нет.

---

### Task M3: «Светофор» — правила, факты, рамка и строка на живой карточке, счётчики секций, переключатель

**Files:**
- Create: `$L/traffic-light.ts`, `$L/traffic-light-line.tsx`. Replace (заглушка F): `$L/traffic-light-toggle.tsx`.
- Modify: `$L/map-data.ts` (строка `facts`), `$D/shape.tsx` (блок импорта M; блоки M в `WorkItemProjectionCard`),
  `$L/living-map.css` (блок M), `af22-living-map.ts` (блок M).
- Test: `apps/web/tests/ppm-canvas/living-map-traffic.test.ts`.

**Interfaces:**
- Consumes: F — `TWorkItemFacts { workItemId, traffic: TTrafficState ("blocked"|"overdue"|"done"|"none"), blockedBy:
  TWorkItemRef[], relations: TWorkItemRelation[] }`, `TWorkItemRelationType`, `usePpmLivingMap().{facts, trafficLight,
  setTrafficLight, args}`, класс `.ppm-living-map-pill`; M1 — `dateOnly`, `localDateKey`, `TLivingMapCard`, `TMapIssue`,
  `summarizeMapGroups` (счётчики — из `facts`), поле `TWorkItemFacts.dueDate?`; M2 — `data.issues`. Существующие:
  `isPpmActiveStateGroup`, `formatPpmIssueIdentifier` (`ppm-tasks/evidence.ts`), `formatDueDate`, `fillCanvasTemplate`.
- Produces: `trafficOf`, `computeWorkItemFacts`, `TTrafficBlocker`, `PLANE_RELATION_TYPES` (`traffic-light.ts`);
  `PpmTrafficLine` (`traffic-light-line.tsx`); `PpmTrafficLightToggle`; атрибут `data-ppm-traffic` живой карточки.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && T=docs/superpowers/plans/2026-09-26-af22/tools; L=apps/web/core/components/ppm-canvas/living-map
  $T/af22-pre.sh $L/traffic-light.ts $L/traffic-light-line.tsx $L/traffic-light-toggle.tsx apps/web/tests/ppm-canvas/living-map-traffic.test.ts
  ```

- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/living-map-traffic.test.ts`:
  ```ts
  // AF2.2 M3: «Светофор» — готова / заблокирована / просрочена по правилам спецификации (C), факты задач доски, счётчики
  // в шапках секций; рамка и строка на живой карточке только под v2 и при включённом переключателе.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { createPpmMapSectionNode, serializePpmCanvasNode } from "@ppm/canvas";
  import { fillCanvasTemplate } from "@/components/ppm-canvas/canvas-grammar";
  import { computeLivingMapView, EMPTY_LIVING_MAP_DATA } from "@/components/ppm-canvas/living-map/map-data";
  import { mapGroupsOf } from "@/components/ppm-canvas/living-map/map-model";
  import { computeWorkItemFacts, trafficOf } from "@/components/ppm-canvas/living-map/traffic-light";
  import {
    issue,
    MECH,
    norm,
    NOW,
    OTHER_PROJECT,
    PROJECT,
    relation,
    STATE,
    STATES,
    USER,
    uuid,
    workItemBinding,
  } from "./fixtures/living-map";

  const TODAY = "2026-09-26";
  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));
  const blocker = (seq: number, stateGroup: string | null) => ({ id: uuid(seq), identifier: `ROBOT-${seq}`, stateGroup });

  function functionSource(source: string, name: string): string {
    const start = source.indexOf(`function ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    const next = source.indexOf("\nfunction ", start + 1);
    return source.slice(start, next === -1 ? undefined : next);
  }

  describe("AF2.2 M3: правила «Светофора»", () => {
    it("marks an unfinished task overdue from the day after its due date, by the local calendar", () => {
      expect(trafficOf({ blockers: [], dueDate: "2026-09-25", stateGroup: "started" }, TODAY)).toEqual({
        blockedBy: [],
        dueDate: "2026-09-25",
        traffic: "overdue",
      });
      expect(trafficOf({ blockers: [], dueDate: "2026-09-26", stateGroup: "started" }, TODAY).traffic).toBe("none");
      expect(trafficOf({ blockers: [], dueDate: "2026-09-25T00:00:00Z", stateGroup: "backlog" }, TODAY)).toMatchObject({
        dueDate: "2026-09-25",
        traffic: "overdue",
      });
      expect(trafficOf({ blockers: [], dueDate: null, stateGroup: "started" }, TODAY).traffic).toBe("none");
    });

    it("puts «blocked» above «overdue» while a blocker is unfinished (unknown states count as unfinished)", () => {
      expect(
        trafficOf({ blockers: [blocker(12, "started")], dueDate: "2026-09-20", stateGroup: "started" }, TODAY)
      ).toEqual({
        blockedBy: [{ id: uuid(12), identifier: "ROBOT-12" }],
        dueDate: "2026-09-20",
        traffic: "blocked",
      });
      expect(
        trafficOf({ blockers: [blocker(12, "completed")], dueDate: "2026-09-20", stateGroup: "started" }, TODAY).traffic
      ).toBe("overdue");
      expect(
        trafficOf({ blockers: [blocker(12, "cancelled")], dueDate: null, stateGroup: "started" }, TODAY).traffic
      ).toBe("none");
      expect(trafficOf({ blockers: [blocker(3, null)], dueDate: null, stateGroup: "started" }, TODAY).traffic).toBe(
        "blocked"
      );
    });

    it("mutes a finished task above everything and leaves a cancelled one alone", () => {
      expect(
        trafficOf({ blockers: [blocker(12, "started")], dueDate: "2026-09-01", stateGroup: "completed" }, TODAY).traffic
      ).toBe("done");
      expect(
        trafficOf({ blockers: [blocker(12, "started")], dueDate: "2026-09-01", stateGroup: "cancelled" }, TODAY).traffic
      ).toBe("none");
    });
  });

  describe("AF2.2 M3: факты задач доски и счётчики секций", () => {
    it("builds the facts of every task on the board from its live card and the Plane links", () => {
      const cards = [
        { binding: workItemBinding(15, "shape:c15"), shapeId: "shape:c15" },
        { binding: workItemBinding(12, "shape:c12", { stateGroup: "completed" }), shapeId: "shape:c12" },
        { binding: workItemBinding(9, "shape:c9", { dueDate: "2026-09-20" }), shapeId: "shape:c9" },
        { binding: workItemBinding(7, "shape:c7"), shapeId: "shape:c7" },
        { binding: workItemBinding(5, "shape:c5", { dueDate: "2026-09-20" }), shapeId: "shape:c5" },
      ];
      const issues = new Map(
        [
          // ROBOT-12 в списке ещё «в работе», но его карточка на доске уже «Готово» — берётся карточка.
          issue(15, [], { issue_relation: [relation(12, "blocked_by", { state_id: STATE.started })] }),
          issue(9, [], { issue_relation: [relation(20, "blocked_by", { state_id: STATE.started })] }),
          issue(7, [], { issue_relation: [relation(3, "blocked_by", { project_id: OTHER_PROJECT, state_id: null })] }),
          issue(5, [], { issue_relation: [relation(16, "relates_to"), relation(16, "custom")] }),
        ].map((item) => [item.id, item])
      );
      const facts = computeWorkItemFacts({
        cards,
        issues,
        projectId: PROJECT,
        projectIdentifier: "ROBOT",
        states: STATES,
        today: new Date(2026, 8, 26, 0, 30),
      });
      expect(facts.get(uuid(15))).toEqual({
        blockedBy: [],
        dueDate: null,
        relations: [{ type: "blocked_by", workItemId: uuid(12) }],
        traffic: "none",
        workItemId: uuid(15),
      });
      expect(facts.get(uuid(12))).toMatchObject({ traffic: "done" });
      expect(facts.get(uuid(9))).toMatchObject({
        blockedBy: [{ id: uuid(20), identifier: "ROBOT-20" }],
        dueDate: "2026-09-20",
        traffic: "blocked",
      });
      expect(facts.get(uuid(7))).toMatchObject({ blockedBy: [{ id: uuid(3), identifier: "#3" }], traffic: "blocked" });
      expect(facts.get(uuid(5))).toMatchObject({
        relations: [{ type: "relates_to", workItemId: uuid(16) }],
        traffic: "overdue",
      });
    });

    it("counts overdue and blocked tasks in the section header", () => {
      const section = serializePpmCanvasNode(
        createPpmMapSectionNode({ authorId: USER, moduleId: MECH, now: NOW, title: "Механика" })
      );
      const view = computeLivingMapView({
        cards: [
          { binding: workItemBinding(9, "shape:c9", { dueDate: "2026-09-20" }), shapeId: "shape:c9" },
          { binding: workItemBinding(5, "shape:c5", { dueDate: "2026-09-20" }), shapeId: "shape:c5" },
        ],
        data: {
          ...EMPTY_LIVING_MAP_DATA,
          issues: new Map([[uuid(9), issue(9, [], { issue_relation: [relation(20, "blocked_by")] })]]),
        },
        groups: mapGroupsOf([
          { id: "shape:mech", node: section, parentId: "page:page" },
          { id: "shape:c9", node: null, parentId: "shape:mech" },
          { id: "shape:c5", node: null, parentId: "shape:mech" },
        ]),
        options: { assignees: [], priorities: [], states: STATES },
        projectId: PROJECT,
        projectIdentifier: "ROBOT",
        today: new Date(2026, 8, 26),
      });
      expect(view.mapSections.get("shape:mech")).toEqual({ blocked: 1, done: 0, overdue: 1, role: "section", total: 2 });
    });
  });

  describe("AF2.2 M3: вид", () => {
    it("decorates the live task card only under v2 with the switch on, through its own blocks", () => {
      const shape = read("shape.tsx");
      const card = functionSource(shape, "WorkItemProjectionCard");
      expect(card.indexOf("const livingMap = usePpmLivingMap();")).toBeGreaterThan(-1);
      expect(card.indexOf("const livingMap = usePpmLivingMap();")).toBeLessThan(
        card.indexOf("if (!binding || binding.entity_type")
      );
      has(
        card,
        "const traffic = grammarV2 && livingMap.trafficLight ? livingMap.facts.get(binding.entity_id) : undefined;"
      );
      has(card, "data-ppm-traffic={trafficState}");
      has(card, "{traffic && trafficState && <PpmTrafficLine facts={traffic} />}");
      expect(card.indexOf("<PpmTrafficLine")).toBeLessThan(
        card.indexOf('{error && <p className="ppm-work-item-card__error">')
      );
      const toggle = read("living-map/traffic-light-toggle.tsx");
      has(toggle, "if (!args.enabled || facts.size === 0) return null;");
      has(toggle, 'role="switch"');
      has(toggle, "aria-checked={trafficLight}");
      has(toggle, "onClick={() => setTrafficLight(!trafficLight)}");
      expect(toggle).toContain("ppm-living-map-pill");
    });

    it("draws the frames with the warning and danger tokens and mutes finished cards without opacity", () => {
      const css = read("living-map/living-map.css");
      const flat = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");
      const rule = (selectorPart: string) => {
        const match = new RegExp(`${selectorPart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^{]*\\{([^}]*)\\}`).exec(flat);
        expect(match, selectorPart).not.toBeNull();
        return match?.[1] ?? "";
      };
      expect(rule('.ppm-live-card[data-ppm-traffic="blocked"])')).toContain("var(--ppm-color-danger-line");
      expect(rule('.ppm-live-card[data-ppm-traffic="overdue"])')).toContain("var(--ppm-color-warning");
      const done = rule('.ppm-live-card[data-ppm-traffic="done"])');
      expect(done).toContain("var(--ppm-color-surface-2");
      expect(done).not.toContain("opacity");
    });

    it("names «Светофор» and its lines in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.traffic.toggle")).toBe("Светофор");
      expect(fillCanvasTemplate(getPpmTranslation("ru", "canvas.traffic.overdue_line"), { date: "20 сент." })).toBe(
        "просрочено · 20 сент."
      );
      expect(fillCanvasTemplate(getPpmTranslation("ru", "canvas.traffic.blocked_line"), { id: "ROBOT-12" })).toBe(
        "заблокирована ROBOT-12"
      );
      expect(getPpmTranslation("en", "canvas.traffic.toggle")).toBe("Traffic light");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/living-map/traffic-light"`.

- [ ] **Step 3: `traffic-light.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPpmWorkItemEditOptions } from "@ppm/canvas";
  import { formatPpmIssueIdentifier, isPpmActiveStateGroup } from "@/components/ppm-tasks/evidence";
  import type { TTrafficState, TWorkItemFacts, TWorkItemRef, TWorkItemRelationType } from "./living-map-types";
  import { dateOnly, localDateKey, type TLivingMapCard, type TMapIssue } from "./map-model";

  // AF2.2 M3: «Светофор» (спецификация, раздел C; RM10). Готова (группа completed) — приглушена, важнее всего; отменена —
  // без выделения; есть незавершённая блокирующая задача — «заблокирована {ID}», важнее «просрочено»; срок раньше
  // сегодняшней местной даты — «просрочено · дата». Блокирующая задача другого проекта (её статус неизвестен) —
  // незавершённая, как в «Задачах» (ppm-tasks/evidence.ts isPpmActiveStateGroup).

  export const PLANE_RELATION_TYPES: ReadonlySet<string> = new Set<TWorkItemRelationType>([
    "blocked_by",
    "blocking",
    "start_before",
    "start_after",
    "finish_before",
    "finish_after",
    "implemented_by",
    "implements",
    "relates_to",
    "duplicate",
  ]);

  export type TTrafficBlocker = TWorkItemRef & { stateGroup: string | null };

  export function trafficOf(
    input: { blockers: readonly TTrafficBlocker[]; dueDate: string | null; stateGroup: string | null },
    todayKey: string
  ): { blockedBy: TWorkItemRef[]; dueDate: string | null; traffic: TTrafficState } {
    const dueDate = dateOnly(input.dueDate);
    const blockedBy = input.blockers
      .filter((item) => isPpmActiveStateGroup(item.stateGroup ?? undefined))
      .map(({ id, identifier }) => ({ id, identifier }));
    let traffic: TTrafficState = "none";
    if (input.stateGroup === "completed") traffic = "done";
    else if (input.stateGroup === "cancelled") traffic = "none";
    else if (blockedBy.length > 0) traffic = "blocked";
    else if (dueDate !== null && dueDate < todayKey) traffic = "overdue";
    return { blockedBy, dueDate, traffic };
  }

  /** Факты задач на доске: статус и срок — с живой карточки (свежее списка), связи и блокирующие — из Plane. */
  export function computeWorkItemFacts(input: {
    cards: readonly TLivingMapCard[];
    issues: ReadonlyMap<string, TMapIssue>;
    projectId: string;
    projectIdentifier: string | null;
    states: TPpmWorkItemEditOptions["states"];
    today: Date;
  }): Map<string, TWorkItemFacts> {
    const stateGroups = new Map(input.states.map((state) => [state.id, state.group]));
    const live = new Map<string, { dueDate: string | null; stateGroup: string | null }>();
    for (const item of input.cards) {
      if (item.binding.entity_type !== "work_item") continue;
      const { display } = item.binding.source;
      live.set(item.binding.entity_id, { dueDate: display.due_date, stateGroup: display.state?.group ?? null });
    }
    const todayKey = localDateKey(input.today);
    const facts = new Map<string, TWorkItemFacts>();
    for (const [workItemId, card] of live) {
      const rows = input.issues.get(workItemId)?.issue_relation ?? [];
      const blockers = rows
        .filter((row) => row.relation_type === "blocked_by")
        .map(
          (row): TTrafficBlocker => ({
            id: row.id,
            identifier: formatPpmIssueIdentifier(
              row.project_id === input.projectId ? input.projectIdentifier : null,
              row.sequence_id
            ),
            stateGroup: live.get(row.id)?.stateGroup ?? (row.state_id ? (stateGroups.get(row.state_id) ?? null) : null),
          })
        );
      const traffic = trafficOf({ blockers, dueDate: card.dueDate, stateGroup: card.stateGroup }, todayKey);
      facts.set(workItemId, {
        ...traffic,
        relations: rows
          .filter((row) => PLANE_RELATION_TYPES.has(row.relation_type))
          .map((row) => ({ type: row.relation_type as TWorkItemRelationType, workItemId: row.id })),
        workItemId,
      });
    }
    return facts;
  }
  ```

- [ ] **Step 4: `map-data.ts` — факты** — импорт `import { computeWorkItemFacts } from "./traffic-light";`; в
  `computeLivingMapView` было:
  ```ts
    // M3: факты «Светофора» (traffic-light.ts).
    const facts: ReadonlyMap<string, TWorkItemFacts> = new Map();
  ```
  стало:
  ```ts
    const facts: ReadonlyMap<string, TWorkItemFacts> = computeWorkItemFacts({
      cards: input.cards,
      issues: input.data.issues,
      projectId: input.projectId,
      projectIdentifier: input.projectIdentifier,
      states: input.options.states,
      today: input.today,
    });
  ```

- [ ] **Step 5: `traffic-light-line.tsx` (новый) и `traffic-light-toggle.tsx` (вместо заглушки F)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { ArrowRightToLine, Clock } from "lucide-react";
  import { useTranslation } from "@plane/i18n";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate, formatDueDate } from "../canvas-grammar";
  import type { TWorkItemFacts } from "./living-map-types";

  // AF2.2 M3: строка «Светофора» над подвалом живой карточки задачи (K5): «заблокирована ROBOT-12» / «просрочено · 20 сент.».
  export function PpmTrafficLine({ facts }: { facts: TWorkItemFacts }) {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    if (facts.traffic === "blocked") {
      const first = facts.blockedBy[0]?.identifier;
      return (
        <p className="ppm-traffic-line" data-tone="blocked">
          <ArrowRightToLine aria-hidden="true" />
          {first
            ? fillCanvasTemplate(ppmT("canvas.traffic.blocked_line"), { id: first })
            : ppmT("canvas.traffic.blocked_unknown")}
        </p>
      );
    }
    if (facts.traffic === "overdue" && facts.dueDate)
      return (
        <p className="ppm-traffic-line" data-tone="overdue">
          <Clock aria-hidden="true" />
          {fillCanvasTemplate(ppmT("canvas.traffic.overdue_line"), { date: formatDueDate(facts.dueDate, currentLocale) })}
        </p>
      );
    return null;
  }
  ```
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { usePpmLivingMap } from "./living-map-context";

  // AF2.2 M3: переключатель «Светофор» в правой колонке (слева от «Доска · Объектов»), вид — пилюля F. Виден, когда на
  // доске есть живые карточки задач; значение и его хранение (у пользователя в браузере, одно на все вкладки) — F.
  export function PpmTrafficLightToggle() {
    const ppmT = usePpmTranslation();
    const { args, facts, setTrafficLight, trafficLight } = usePpmLivingMap();
    if (!args.enabled || facts.size === 0) return null;
    return (
      <button
        type="button"
        role="switch"
        aria-checked={trafficLight}
        className="ppm-living-map-pill ppm-traffic-toggle"
        title={ppmT("canvas.traffic.toggle_hint")}
        onClick={() => setTrafficLight(!trafficLight)}
      >
        <span aria-hidden="true" className="ppm-traffic-toggle__track">
          <span className="ppm-traffic-toggle__thumb" />
        </span>
        {ppmT("canvas.traffic.toggle")}
      </button>
    );
  }
  ```

- [ ] **Step 6: `shape.tsx` — «Светофор» у живой карточки задачи** (перечитать файл; блоки C — в заголовке карточки)
  1. Блок импорта M (M1) — дописать внутрь блока:
     ```ts
     import { usePpmLivingMap } from "./living-map/living-map-context";
     import { PpmTrafficLine } from "./living-map/traffic-light-line";
     ```
  2. `WorkItemProjectionCard` — было (`:2657`):
     ```tsx
       const [copiedLink, setCopiedLink] = useState(false);

       if (!binding || binding.entity_type !== "work_item") {
     ```
     стало:
     ```tsx
       const [copiedLink, setCopiedLink] = useState(false);
       // ── AF2.2 M: «Светофор» — факты карточки из «Живой карты» (без провайдера F — пусто) ──
       const livingMap = usePpmLivingMap();
       // ── /AF2.2 M ──

       if (!binding || binding.entity_type !== "work_item") {
     ```
  3. Было (`:2680`):
     ```tsx
       const assigneeIds = display.assignees.map((assignee) => assignee.id);
     ```
     стало:
     ```tsx
       const assigneeIds = display.assignees.map((assignee) => assignee.id);
       // ── AF2.2 M: «Светофор» — выделение только под v2 и при включённом переключателе ──
       const traffic = grammarV2 && livingMap.trafficLight ? livingMap.facts.get(binding.entity_id) : undefined;
       const trafficState = traffic && traffic.traffic !== "none" ? traffic.traffic : undefined;
       // ── /AF2.2 M ──
     ```
  4. Корневой `<div>` (`:2682-2686`) — было:
     ```tsx
         <div
           className={grammarV2 ? "ppm-work-item-card ppm-live-card" : "ppm-work-item-card"}
           data-source-status={display.source_status}
         >
     ```
     стало:
     ```tsx
         <div
           className={grammarV2 ? "ppm-work-item-card ppm-live-card" : "ppm-work-item-card"}
           data-source-status={display.source_status}
           // AF2.2 M · «Светофор» (living-map.css): рамка «заблокирована»/«просрочено», приглушённая «готова»
           data-ppm-traffic={trafficState}
         >
     ```
  5. Было (`:2798`):
     ```tsx
           {error && <p className="ppm-work-item-card__error">{error}</p>}
     ```
     стало:
     ```tsx
           {/* ── AF2.2 M: «Светофор» — строка «заблокирована ID» / «просрочено · дата» над подвалом ── */}
           {traffic && trafficState && <PpmTrafficLine facts={traffic} />}
           {/* ── /AF2.2 M ── */}
           {error && <p className="ppm-work-item-card__error">{error}</p>}
     ```

- [ ] **Step 7: Стили** — в блок M `living-map.css`:
  ```css
  /* M3 · «Светофор»: переключатель (поверх пилюли F), рамка и строка живой карточки задачи. Рамка — у контейнера
     .ppm-canvas-node (там рамка v2, canvas-v2.css (0,5,0)); :has(> …) — чтобы не подписывать на факты каждую фигуру. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-toggle {
    gap: 0.5rem;
    padding-left: 0.5rem;
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-toggle__track {
    position: relative;
    display: block;
    width: 1.625rem;
    height: 1rem;
    flex: none;
    border-radius: var(--ppm-radius-xs, 0.25rem);
    background: var(--ppm-color-border-strong, var(--border-strong));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-toggle[aria-checked="true"] .ppm-traffic-toggle__track {
    background: var(--ppm-color-accent, var(--bg-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-toggle__thumb {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.125rem;
    background: var(--ppm-color-on-accent, var(--txt-on-color));
    transition: transform 120ms ease;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-toggle[aria-checked="true"] .ppm-traffic-toggle__thumb {
    transform: translateX(0.625rem);
  }

  @media (prefers-reduced-motion: reduce) {
    :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-toggle__thumb {
      transition: none;
    }
  }

  :where(html[data-ppm-design="v2"])
    [data-ppm-canvas-grammar="v2"]
    .ppm-canvas-node.ppm-canvas-node--work_item_ref:has(> .ppm-work-item-card.ppm-live-card[data-ppm-traffic="blocked"]) {
    border-color: var(--ppm-color-danger-line, var(--txt-danger-primary));
    box-shadow: 0 0 0 1px var(--ppm-color-danger-line, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"])
    [data-ppm-canvas-grammar="v2"]
    .ppm-canvas-node.ppm-canvas-node--work_item_ref:has(> .ppm-work-item-card.ppm-live-card[data-ppm-traffic="overdue"]) {
    border-color: var(--ppm-color-warning, var(--txt-warning-primary));
    box-shadow: 0 0 0 1px var(--ppm-color-warning, var(--txt-warning-primary));
  }

  :where(html[data-ppm-design="v2"])
    [data-ppm-canvas-grammar="v2"]
    .ppm-canvas-node.ppm-canvas-node--work_item_ref:has(> .ppm-work-item-card.ppm-live-card[data-ppm-traffic="done"]) {
    background: var(--ppm-color-surface-2, var(--bg-surface-2));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card[data-ppm-traffic="done"] .ppm-live-card__title {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-line {
    display: flex;
    min-width: 0;
    align-items: center;
    align-self: end;
    gap: 0.375rem;
    margin: 0;
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-line[data-tone="overdue"] {
    color: var(--ppm-color-warning, var(--txt-warning-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-line[data-tone="blocked"] {
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-traffic-line svg {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
  }
  ```
  (Тест M3 ищет подстроки `.ppm-live-card[data-ppm-traffic="blocked"])` / `overdue` / `done` — хвост `:has(…)` каждого
  правила; строка правила `done` без `opacity`.)

- [ ] **Step 8: Строки** — в блок M, en и ru:
  ```ts
      "canvas.traffic.toggle": "Traffic light",
      "canvas.traffic.toggle_hint": "Traffic light: highlight blocked and overdue tasks",
      "canvas.traffic.overdue_line": "overdue · {date}",
      "canvas.traffic.blocked_line": "blocked by {id}",
      "canvas.traffic.blocked_unknown": "blocked",
  ```
  ```ts
      "canvas.traffic.toggle": "Светофор",
      "canvas.traffic.toggle_hint": "Светофор: подсветить заблокированные и просроченные задачи",
      "canvas.traffic.overdue_line": "просрочено · {date}",
      "canvas.traffic.blocked_line": "заблокирована {id}",
      "canvas.traffic.blocked_unknown": "заблокирована",
  ```
  `oxfmt` файла и `$T/af22-pkg-build.sh ppm-brand`.

- [ ] **Step 9: Прогон** — `vitest run tests/ppm-canvas/living-map-traffic.test.ts` → `8 passed`; M1 и M2 — зелёные;
  формат/линт/tsc (файлы задачи + `shape.tsx`, `map-data.ts`), web vitest целиком, brand.

**Acceptance (M3):**
- [ ] На карте: просроченная (не готовая и не отменённая) — оранжевая рамка и «просрочено · 20 сент.»; заблокированная
  незавершённой задачей — красная рамка и «заблокирована ROBOT-12» (важнее просрочки); готовая — приглушена; в шапках
  секций — «2 просрочены», «1 заблокирована».
- [ ] «Светофор» справа вверху виден при живых карточках задач, выключение снимает рамки и бейджи во всех открытых
  вкладках, помнится после перезагрузки; v1 — без изменений.

---

### Task M4: лоток «Не на карте» — задачи и PR спринта, «+ Добавить», «Разложить всё»

**Files:**
- Create: `$L/not-on-map.ts`. Replace (заглушка F): `$L/not-on-map-tray.tsx`.
- Modify: `$L/map-layout.ts` (раскладка в секцию), `$L/map-shapes.ts` (чтение карты, изменение для лотка, подвод камеры),
  `$L/map-data.ts` (PR, строка `tray`), `$L/living-map-facts.ts` (`placing`, `placeFromTray`), `$L/living-map.css`
  (блок M), `af22-living-map.ts` (блок M).
- Test: `apps/web/tests/ppm-canvas/living-map-tray.test.ts`.

**Interfaces:**
- Consumes: M1 — `TNotOnMapItem`, `TLivingMapTray`, `TMapPlacementRequest`, `TPlaceOnMapResult`, `readMapRole`,
  `primaryModuleId`, `sprintFrameOf`, `MAP_LAYOUT`, `cellOrigin`, `sectionHeight`, `sectionRows`, `MAP_SECTION_WIDTH`,
  `mapCardShape`, `liveCardNode`, `applyMapChange`, `PpmCanvasMapService.bindBatch`, `PPM_CANVAS_BATCH_LIMIT`; M2 —
  `data.issues`, `data.sprintIssueIds`; F — `args.{canEdit, isActive, enabled, editor, registerBindings, notify, boardId}`,
  `.ppm-living-map-panel`; существующие — `rectsOverlap`, `rectInside` (`canvas-placement.ts`), `isCountedCanvasShape`
  (`canvas-toolkit-model.ts`), `formatPpmIssueIdentifier`, `formatPpmPullRequestRef` (`ppm-tasks/evidence.ts`),
  `PPM_CANVAS_NODE_REGISTRY`, `createPpmMapSectionNode`, `parseSerializedPpmCanvasNode`, `serializePpmCanvasNode`,
  `PpmCanvasService.cancelPendingBinding`.
- Produces: `collectNotOnMap`, `trayPlacementRequest`, `placeOnMap`, `MAP_PLACEMENT_LIMIT`, `TPlaceOnMapDeps`
  (`not-on-map.ts`); `TMapChildRect`, `TMapSectionState`, `TMapState`, `TMapPlacementPlan`, `sectionColumns`,
  `planMapPlacement` (`map-layout.ts`); `TMapShapeRecord`, `readMapRecords`, `mapStateFromRecords`, `withNodeHeight`,
  `buildPlacementChange`, `revealMapCards` (`map-shapes.ts`); `PpmNotOnMapTray`; поля `tray`, `placing`, `placeFromTray`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && T=docs/superpowers/plans/2026-09-26-af22/tools; L=apps/web/core/components/ppm-canvas/living-map
  $T/af22-pre.sh $L/not-on-map.ts $L/not-on-map-tray.tsx apps/web/tests/ppm-canvas/living-map-tray.test.ts
  ```

- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/living-map-tray.test.ts`:
  ```ts
  // AF2.2 M4: «Не на карте» — задачи спринта и их PR без карточки на доске; «+ Добавить» / «Разложить всё» кладут в
  // секцию своего направления, в свободную ячейку без наложений (секция растёт, всё ниже сдвигается), только по нажатию
  // редактора активной вкладки; читатель видит список без кнопок.
  import { readFileSync } from "node:fs";
  import { describe, expect, it, vi } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    createPpmMapSectionNode,
    createPpmSprintFrameNode,
    parseSerializedPpmCanvasNode,
    serializePpmCanvasNode,
  } from "@ppm/canvas";
  import { fillCanvasTemplate } from "@/components/ppm-canvas/canvas-grammar";
  import { computeLivingMapView, EMPTY_LIVING_MAP_DATA } from "@/components/ppm-canvas/living-map/map-data";
  import { planMapPlacement, type TMapState } from "@/components/ppm-canvas/living-map/map-layout";
  import { mapGroupsOf, type TMapPlacementRequest } from "@/components/ppm-canvas/living-map/map-model";
  import {
    buildPlacementChange,
    mapStateFromRecords,
    type TMapShapeChange,
  } from "@/components/ppm-canvas/living-map/map-shapes";
  import { collectNotOnMap, placeOnMap, trayPlacementRequest } from "@/components/ppm-canvas/living-map/not-on-map";
  import type { TPpmCanvasBatchBindingItem, TPpmCanvasBatchBindingResult } from "@/services/ppm-canvas-map.service";
  import {
    counter,
    CURRENT,
    issue,
    MECH,
    MODULES,
    norm,
    NOW,
    PEOPLE,
    PRES,
    PROJECT,
    pullRequestBinding,
    pullRequestLink,
    seqOf,
    SOFT,
    STATE,
    STATES,
    USER,
    uuid,
    workItemBinding,
  } from "./fixtures/living-map";

  const dir = new URL("../../core/components/ppm-canvas/", import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
  const has = (source: string, needle: string) => expect(norm(source), needle).toContain(norm(needle));
  const TASK = { h: 248, w: 360 };
  const FRAME_NODE = serializePpmCanvasNode(
    createPpmSprintFrameNode({
      authorId: USER,
      cycleId: CURRENT.id,
      height: 736,
      now: NOW,
      title: "Спринт 3",
      width: 1568,
    })
  );
  const section = (moduleId: string | null, height: number) =>
    serializePpmCanvasNode(
      createPpmMapSectionNode({
        authorId: USER,
        height,
        moduleId,
        now: NOW,
        title: moduleId ? "Направление" : "Без направления",
        width: 1520,
      })
    );
  const cell = (index: number) => ({ h: 248, w: 360, x: 16 + (index % 4) * 376, y: 48 + Math.floor(index / 4) * 264 });
  const request = (key: string, moduleId: string | null, size = TASK): TMapPlacementRequest => ({
    entityId: uuid(Number(key.replace(/\D/g, "")) || 1),
    entityType: "work_item",
    key,
    moduleId,
    sectionTitle: moduleId ? "Презентация" : "Без направления",
    size,
  });

  function mapState(
    mechCells: number[],
    softChildren: { h: number; w: number; x: number; y: number }[] = [cell(0)]
  ): TMapState {
    return {
      frame: { h: 736, id: "shape:frame", node: FRAME_NODE, w: 1568 },
      others: [],
      sections: [
        {
          children: mechCells.map(cell),
          h: 312,
          id: "shape:mech",
          moduleId: MECH,
          node: section(MECH, 312),
          type: "ppm-canvas-node",
          w: 1520,
          x: 24,
          y: 64,
        },
        {
          children: softChildren,
          h: 312,
          id: "shape:soft",
          moduleId: SOFT,
          node: section(SOFT, 312),
          type: "ppm-canvas-node",
          w: 1520,
          x: 24,
          y: 400,
        },
      ],
    };
  }

  describe("AF2.2 M4: что лежит в лотке", () => {
    it("lists the sprint tasks without a card and the active PRs of sprint tasks without a PR card", () => {
      const items = collectNotOnMap({
        cards: [
          { binding: workItemBinding(5, "shape:c5"), shapeId: "shape:c5" },
          { binding: workItemBinding(16, "shape:c16"), shapeId: "shape:c16" },
          { binding: pullRequestBinding(46, "shape:pr46"), shapeId: "shape:pr46" },
        ],
        issues: new Map(
          [
            issue(5, [MECH]),
            issue(16, [MECH]),
            issue(20, [PRES], { assignee_ids: [uuid(5001)], state_id: STATE.backlog }),
            issue(19, [MECH, SOFT], { assignee_ids: [uuid(5001)] }),
            issue(21, []),
          ].map((item) => [item.id, item])
        ),
        modules: new Map(MODULES.map((item) => [item.id, item])),
        options: { assignees: PEOPLE, priorities: [], states: STATES },
        projectIdentifier: "ROBOT",
        pullRequests: [
          pullRequestLink(50, 16),
          pullRequestLink(46, 11),
          pullRequestLink(47, 5, { status: "unlinked" }),
          pullRequestLink(48, 5, { object_type: "branch" }),
          pullRequestLink(49, 99),
        ],
        sprintIssueIds: [uuid(5), uuid(16), uuid(20), uuid(19), uuid(21)],
      });
      expect(items.map((item) => item.key)).toEqual([
        `task:${uuid(19)}`,
        `task:${uuid(20)}`,
        `task:${uuid(21)}`,
        `pr:${uuid(30_050)}`,
      ]);
      expect(items[0]).toMatchObject({
        assignees: "Миша К.",
        identifier: "ROBOT-19",
        kind: "task",
        moduleId: MECH,
        moduleName: "Механика",
        stateName: "В работе",
      });
      expect(items[1]).toMatchObject({ moduleName: "Презентация", stateGroup: "backlog", stateName: "Бэклог" });
      expect(items[2]).toMatchObject({ moduleId: null, moduleName: null });
      expect(items[3]).toMatchObject({
        entityId: uuid(40_050),
        kind: "pull_request",
        moduleId: MECH,
        ref: "#50",
        workItemIdentifier: "ROBOT-16",
      });
      expect(trayPlacementRequest(items[2], "Без направления")).toEqual({
        entityId: uuid(21),
        entityType: "work_item",
        key: `task:${uuid(21)}`,
        moduleId: null,
        sectionTitle: "Без направления",
        size: { h: 248, w: 360 },
      });
      expect(trayPlacementRequest(items[3], "Без направления")).toMatchObject({
        entityId: uuid(40_050),
        entityType: "pull_request",
        size: { h: 220, w: 360 },
      });
    });

    it("offers the tray only on a map whose sprint has been read", () => {
      const view = computeLivingMapView({
        cards: [],
        data: {
          ...EMPTY_LIVING_MAP_DATA,
          cycleId: CURRENT.id,
          issues: new Map([[uuid(19), issue(19, [MECH])]]),
          sprintIssueIds: [uuid(19)],
        },
        groups: mapGroupsOf([{ id: "shape:frame", node: FRAME_NODE, parentId: "page:page" }]),
        options: { assignees: [], priorities: [], states: STATES },
        projectId: PROJECT,
        projectIdentifier: "ROBOT",
        today: new Date(2026, 8, 26),
      });
      expect(view.tray).toMatchObject({ builtAt: NOW, enabled: true });
      expect(view.tray.items).toHaveLength(1);
      const plain = computeLivingMapView({
        cards: [],
        data: EMPTY_LIVING_MAP_DATA,
        groups: [],
        options: { assignees: [], priorities: [], states: STATES },
        projectId: PROJECT,
        projectIdentifier: "ROBOT",
        today: new Date(2026, 8, 26),
      });
      expect(plain.tray.enabled).toBe(false);
    });
  });

  describe("AF2.2 M4: куда класть", () => {
    it("fills the first free cell of the direction's section, holes and a user's note included", () => {
      expect(planMapPlacement(mapState([0, 2]), [request("task:1", MECH)]).cards).toEqual([
        { key: "task:1", parent: { id: "shape:mech", kind: "section" }, x: 392, y: 48 },
      ]);
      const noted = planMapPlacement(mapState([0], [{ h: 220, w: 320, x: 20, y: 60 }]), [request("task:2", SOFT)]);
      expect(noted.cards[0]).toMatchObject({ x: 392, y: 48 });
      expect(noted.sectionHeights).toEqual([]);
      expect(noted.frameHeight).toBeNull();
    });

    it("grows a full section by a row and moves everything below it down, the frame too", () => {
      const plan = planMapPlacement(mapState([0, 1, 2, 3]), [request("task:3", MECH), request("task:4", MECH)]);
      expect(plan.cards.map(({ x, y }) => [x, y])).toEqual([
        [16, 312],
        [392, 312],
      ]);
      expect(plan.sectionHeights).toEqual([{ h: 576, id: "shape:mech", node: section(MECH, 312) }]);
      expect(plan.moves).toEqual([{ id: "shape:soft", type: "ppm-canvas-node", y: 664 }]);
      expect(plan.frameHeight).toBe(1000);
    });

    it("opens a missing direction's section at the bottom of the frame", () => {
      const plan = planMapPlacement(mapState([0, 1, 2, 3]), [request("task:5", PRES)]);
      expect(plan.newSections).toEqual([
        { h: 312, key: PRES, moduleId: PRES, title: "Презентация", w: 1520, x: 24, y: 736 },
      ]);
      expect(plan.cards).toEqual([{ key: "task:5", parent: { key: PRES, kind: "new" }, x: 16, y: 48 }]);
      expect(plan.frameHeight).toBe(1072);
    });

    it("reads the map from the board: sections by the frame's children, their children, other frame children", () => {
      const state = mapStateFromRecords(
        [
          {
            h: 736,
            id: "shape:frame",
            node: FRAME_NODE,
            parentId: "page:page",
            type: "ppm-canvas-node",
            w: 1568,
            x: 0,
            y: 0,
          },
          {
            h: 312,
            id: "shape:mech",
            node: section(MECH, 312),
            parentId: "shape:frame",
            type: "ppm-canvas-node",
            w: 1520,
            x: 24,
            y: 64,
          },
          { h: 248, id: "shape:c5", node: null, parentId: "shape:mech", type: "ppm-canvas-node", w: 360, x: 16, y: 48 },
          { h: 200, id: "shape:sticker", node: null, parentId: "shape:frame", type: "note", w: 200, x: 24, y: 400 },
        ],
        "shape:frame"
      );
      expect(state?.sections.map((item) => [item.id, item.moduleId, item.children])).toEqual([
        ["shape:mech", MECH, [{ h: 248, w: 360, x: 16, y: 48 }]],
      ]);
      expect(state?.others).toEqual([{ h: 200, id: "shape:sticker", type: "note", w: 200, x: 24, y: 400 }]);
      expect(mapStateFromRecords([], "shape:frame")).toBeNull();
    });
  });

  describe("AF2.2 M4: раскладка по нажатию", () => {
    it("plans against the board as it is after the request and grows the section in the same change", async () => {
      const states = [mapState([0, 1, 2]), mapState([0, 1, 2, 3])];
      const readState = vi.fn(() => states.shift() ?? null);
      const applied: TMapShapeChange[] = [];
      const registerBindings = vi.fn();
      const result = await placeOnMap(
        {
          applyChange: (change) => {
            applied.push(change);
            return true;
          },
          authorId: USER,
          bindBatch: async (items: readonly TPpmCanvasBatchBindingItem[]) =>
            items.map(
              (item): TPpmCanvasBatchBindingResult => ({
                binding: workItemBinding(seqOf(item.entity_id), item.shape_id),
                shape_id: item.shape_id,
                status: "created",
              })
            ),
          cancelBinding: vi.fn(async () => undefined),
          newShapeId: counter("shape:n"),
          now: () => NOW,
          readState,
          registerBindings,
        },
        [request("task:19", MECH)]
      );
      expect(readState).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ cardIds: ["shape:n1"], failed: 0, placed: 1 });
      const [change] = applied;
      expect(change.create.map((shape) => [shape.id, shape.parentId, shape.x, shape.y])).toEqual([
        ["shape:n1", "shape:mech", 16, 312],
      ]);
      const grown = change.update.find((shape) => shape.id === "shape:mech");
      expect(grown?.props?.h).toBe(576);
      const parsed = parseSerializedPpmCanvasNode(grown?.props?.node ?? "");
      expect(parsed.status === "valid" && parsed.node.visual.height).toBe(576);
      expect(change.moves).toEqual([{ id: "shape:soft", type: "ppm-canvas-node", y: 664 }]);
      expect(change.update.find((shape) => shape.id === "shape:frame")?.props?.h).toBe(1000);
      expect(registerBindings.mock.calls[0][0].map((binding: { entity_id: string }) => binding.entity_id)).toEqual([
        uuid(19),
      ]);
    });

    it("cancels bindings whose card cannot be drawn and everything when the board refused the change", async () => {
      const cancelBinding = vi.fn(async () => undefined);
      const pr: TMapPlacementRequest = {
        ...request("pr:50", MECH, { h: 220, w: 360 }),
        entityId: uuid(40_050),
        entityType: "pull_request",
      };
      const bindBatch = async (items: readonly TPpmCanvasBatchBindingItem[]) =>
        items.map(
          (item): TPpmCanvasBatchBindingResult =>
            item.entity_type === "pull_request"
              ? {
                  binding: pullRequestBinding(50, item.shape_id, "http://git.example.org/pull/50"),
                  shape_id: item.shape_id,
                  status: "created",
                }
              : {
                  binding: workItemBinding(seqOf(item.entity_id), item.shape_id),
                  shape_id: item.shape_id,
                  status: "created",
                }
        );
      const base = {
        authorId: USER,
        bindBatch,
        cancelBinding,
        newShapeId: counter("shape:p"),
        now: () => NOW,
        readState: () => mapState([0]),
        registerBindings: vi.fn(),
      };
      const drawn = await placeOnMap({ ...base, applyChange: () => true }, [request("task:19", MECH), pr]);
      expect(drawn).toMatchObject({ failed: 1, placed: 1 });
      expect(cancelBinding).toHaveBeenCalledWith(uuid(60_050));
      cancelBinding.mockClear();
      const refused = await placeOnMap({ ...base, applyChange: () => false }, [request("task:19", MECH)]);
      expect(refused).toEqual({ cardIds: [], failed: 1, placed: 0 });
      expect(cancelBinding).toHaveBeenCalledWith(uuid(50_019));
    });

    it("builds a new section node for a missing direction with the map role", () => {
      const plan = planMapPlacement(mapState([0]), [request("task:5", PRES)]);
      const built = buildPlacementChange({
        authorId: USER,
        bindings: new Map([["task:5", workItemBinding(5, "shape:c5")]]),
        frameId: "shape:frame",
        frameNode: FRAME_NODE,
        newSectionId: () => "shape:pres",
        now: NOW,
        plan,
        shapeIds: new Map([["task:5", "shape:c5"]]),
      });
      const created = built.change.create.find((shape) => shape.id === "shape:pres");
      const node = parseSerializedPpmCanvasNode(created?.props?.node ?? "");
      expect(node.status === "valid" && node.node.kind === "group" && node.node.map).toEqual({
        module_id: PRES,
        role: "section",
      });
      expect(created).toMatchObject({ parentId: "shape:frame", x: 24, y: 736 });
      expect(built.change.create.find((shape) => shape.id === "shape:c5")).toMatchObject({
        parentId: "shape:pres",
        x: 16,
        y: 48,
      });
      expect(built.cardIds).toEqual(["shape:c5"]);
    });

    it("places only for an editor of the active tab and shows the tray to readers without buttons", () => {
      const hook = read("living-map/living-map-facts.ts");
      has(
        hook,
        "if (!current.enabled || !current.canEdit || !current.isActive || !activeEditor || !frameId || placingRef.current) return null;"
      );
      has(hook, ".slice(0, MAP_PLACEMENT_LIMIT)");
      has(hook, "registerBindings: current.registerBindings }");
      const tray = read("living-map/not-on-map-tray.tsx");
      has(tray, "if (!args.enabled || !tray?.enabled || tray.items.length === 0) return null;");
      has(tray, "const canPlace = args.canEdit && Boolean(placeFromTray);");
      expect(tray.match(/\{canPlace && \(/g)?.length).toBe(2);
      has(tray, "void place(tray.items.map((item) => item.key))");
      expect(tray).toContain("ppm-living-map-panel");
    });

    it("names the tray in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.tray.title")).toBe("Не на карте");
      expect(getPpmTranslation("ru", "canvas.tray.place_all")).toBe("Разложить всё");
      expect(fillCanvasTemplate(getPpmTranslation("ru", "canvas.tray.place_label"), { name: "ROBOT-19" })).toBe(
        "Добавить ROBOT-19 на карту"
      );
      expect(getPpmTranslation("en", "canvas.tray.title")).toBe("Not on the map");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/living-map/not-on-map"`.

- [ ] **Step 3: `map-layout.ts` — раскладка в секцию** — дописать в конец файла (импорт вверху:
  `import { rectsOverlap } from "../canvas-placement";`, `import { NO_DIRECTION_KEY, type TMapPlacementRequest } from "./map-model";`):
  ```ts
  // ─────────────── M4 · «Не на карте»: свободная ячейка в секции направления, рост секции, сдвиг ниже ───────────────

  export type TMapChildRect = TMapBox & { id: string; type: string };
  export type TMapSectionState = TMapChildRect & { children: TMapBox[]; moduleId: string | null; node: string };
  /** Карта на доске: секции и прочие дети рамки — в координатах рамки, дети секции — в координатах секции. */
  export type TMapState = {
    frame: { h: number; id: string; node: string; w: number };
    others: TMapChildRect[];
    sections: TMapSectionState[];
  };
  export type TMapPlacementPlan = {
    cards: {
      key: string;
      parent: { id: string; kind: "section" } | { key: string; kind: "new" };
      x: number;
      y: number;
    }[];
    frameHeight: number | null;
    moves: { id: string; type: string; y: number }[];
    newSections: (TMapBox & { key: string; moduleId: string | null; title: string })[];
    sectionHeights: { h: number; id: string; node: string }[];
  };

  const CELL_LIMIT = 4096;

  /** Сколько колонок ячеек вмещает секция (её могли сузить руками), от 1 до 4. */
  export function sectionColumns(width: number): number {
    const fit = Math.floor(
      (width - 2 * MAP_LAYOUT.sectionPadding + MAP_LAYOUT.gap) / (MAP_LAYOUT.card.w + MAP_LAYOUT.gap)
    );
    return Math.max(1, Math.min(MAP_LAYOUT.columns, fit));
  }

  function firstFreeCell(occupied: readonly TMapBox[], columns: number): TMapPoint {
    for (let index = 0; index < CELL_LIMIT; index += 1) {
      const origin = cellOrigin(index, columns);
      const cell = { ...origin, h: MAP_LAYOUT.card.h, w: MAP_LAYOUT.card.w };
      if (!occupied.some((rect) => rectsOverlap(cell, rect, 0))) return origin;
    }
    const bottom = Math.max(MAP_LAYOUT.sectionHeader, ...occupied.map((rect) => rect.y + rect.h + MAP_LAYOUT.gap));
    return { x: MAP_LAYOUT.sectionPadding, y: bottom };
  }

  export function planMapPlacement(state: TMapState, requests: readonly TMapPlacementRequest[]): TMapPlacementPlan {
    const cards: TMapPlacementPlan["cards"] = [];
    const sectionHeights: TMapPlacementPlan["sectionHeights"] = [];
    const growth = new Map<string, number>();
    const bySection = new Map<string, TMapPlacementRequest[]>();
    const missing = new Map<string, TMapPlacementRequest[]>();
    for (const item of requests) {
      const target = state.sections.find((candidate) => candidate.moduleId === item.moduleId);
      const bucket = target ? bySection : missing;
      const key = target ? target.id : (item.moduleId ?? NO_DIRECTION_KEY);
      const list = bucket.get(key) ?? [];
      list.push(item);
      bucket.set(key, list);
    }
    for (const target of state.sections) {
      const list = bySection.get(target.id);
      if (!list) continue;
      const occupied: TMapBox[] = [...target.children];
      const columns = sectionColumns(target.w);
      let needed = target.h;
      for (const item of list) {
        const origin = firstFreeCell(occupied, columns);
        occupied.push({ ...origin, h: MAP_LAYOUT.card.h, w: MAP_LAYOUT.card.w });
        cards.push({ key: item.key, parent: { id: target.id, kind: "section" }, x: origin.x, y: origin.y });
        needed = Math.max(needed, origin.y + MAP_LAYOUT.card.h + MAP_LAYOUT.sectionPadding);
      }
      if (needed > target.h) {
        growth.set(target.id, needed - target.h);
        sectionHeights.push({ h: needed, id: target.id, node: target.node });
      }
    }
    // Всё, что в рамке ниже выросшей секции, едет вниз на её прирост — наложений нет.
    const moves: TMapPlacementPlan["moves"] = [];
    let bottom: number = MAP_LAYOUT.frameHeader - MAP_LAYOUT.sectionGap;
    for (const child of [...state.sections, ...state.others]) {
      let shift = 0;
      for (const target of state.sections)
        if (target.id !== child.id && target.y + target.h <= child.y) shift += growth.get(target.id) ?? 0;
      if (shift > 0) moves.push({ id: child.id, type: child.type, y: child.y + shift });
      bottom = Math.max(bottom, child.y + shift + child.h + (growth.get(child.id) ?? 0));
    }
    // Нет секции направления — новая внизу рамки.
    const newSections: TMapPlacementPlan["newSections"] = [];
    for (const [key, list] of missing) {
      const y = bottom + MAP_LAYOUT.sectionGap;
      const h = sectionHeight(sectionRows(list.length));
      newSections.push({
        h,
        key,
        moduleId: list[0].moduleId,
        title: list[0].sectionTitle,
        w: MAP_SECTION_WIDTH,
        x: MAP_LAYOUT.framePadding,
        y,
      });
      list.forEach((item, index) => {
        const origin = cellOrigin(index);
        cards.push({ key: item.key, parent: { key, kind: "new" }, x: origin.x, y: origin.y });
      });
      bottom = y + h;
    }
    const neededFrame = bottom + MAP_LAYOUT.framePadding;
    return { cards, frameHeight: neededFrame > state.frame.h ? neededFrame : null, moves, newSections, sectionHeights };
  }
  ```
  (Проверка теста «grows a full section…»: `mech` 64..376 растёт на 264 → `soft` (400) → 664; низ 664 + 312 = 976 → рамка
  1000. «opens a missing…»: низ детей 712 → новая секция y = 736, h = 312 → рамка 1072.)

- [ ] **Step 4: `map-shapes.ts` — чтение карты и изменение для лотка** — импорты дописать:
  `createPpmMapSectionNode` уже есть; добавить `parseSerializedPpmCanvasNode` в импорт `@ppm/canvas`;
  `import { rectInside } from "../canvas-placement";`, `import { isCountedCanvasShape } from "../canvas-toolkit-model";`,
  `import type { TMapPlacementPlan, TMapState } from "./map-layout";`, `import { readMapRole, shapeNodeJson } from "./map-model";`.
  В конец файла:
  ```ts
  // ─────────────── M4 · «Не на карте»: карта с доски и изменение для лотка ───────────────

  export type TMapShapeRecord = {
    h: number;
    id: string;
    node: string | null;
    parentId: string;
    type: string;
    w: number;
    x: number;
    y: number;
  };

  /** Фигуры страницы, которые занимают место (связи и штрихи — нет): позиция — в системе координат родителя. */
  export function readMapRecords(editor: Editor): TMapShapeRecord[] {
    return editor
      .getCurrentPageShapes()
      .filter((shape) => isCountedCanvasShape(shape))
      .map((shape) => {
        const bounds = editor.getShapeGeometry(shape).bounds;
        return {
          h: bounds.h,
          id: shape.id,
          node: shapeNodeJson(shape),
          parentId: shape.parentId,
          type: shape.type,
          w: bounds.w,
          x: shape.x + bounds.x,
          y: shape.y + bounds.y,
        };
      });
  }

  export function mapStateFromRecords(records: readonly TMapShapeRecord[], frameId: string): TMapState | null {
    const frame = records.find((record) => record.id === frameId);
    if (!frame?.node) return null;
    const byParent = new Map<string, TMapShapeRecord[]>();
    for (const record of records) {
      const list = byParent.get(record.parentId) ?? [];
      list.push(record);
      byParent.set(record.parentId, list);
    }
    const state: TMapState = {
      frame: { h: frame.h, id: frame.id, node: frame.node, w: frame.w },
      others: [],
      sections: [],
    };
    for (const child of byParent.get(frameId) ?? []) {
      const rect = { h: child.h, id: child.id, type: child.type, w: child.w, x: child.x, y: child.y };
      const role = readMapRole(child.node);
      if (role?.map.role === "section" && child.node)
        state.sections.push({
          ...rect,
          children: (byParent.get(child.id) ?? []).map(({ h, w, x, y }) => ({ h, w, x, y })),
          moduleId: role.map.module_id,
          node: child.node,
        });
      else state.others.push(rect);
    }
    // oxlint-disable-next-line unicorn/no-array-sort -- state.sections is built here (lib ES2022: no toSorted).
    state.sections.sort((left, right) => left.y - right.y || left.id.localeCompare(right.id));
    return state;
  }

  /** Новая высота рамки/секции и в узле (visual.height), как onResize; updated_at не трогаем — рост не правка. */
  export function withNodeHeight(node: string, height: number): string | null {
    const parsed = parseSerializedPpmCanvasNode(node);
    if (parsed.status !== "valid" && parsed.status !== "migrated") return null;
    return serializePpmCanvasNode({ ...parsed.node, visual: { ...parsed.node.visual, height } });
  }

  /** План лотка → изменение доски: рост секций и рамки, сдвиги, новые секции, карточки. Без узла карточки — не кладём. */
  export function buildPlacementChange(input: {
    authorId: string;
    bindings: ReadonlyMap<string, TPpmCanvasBinding>;
    frameId: string;
    frameNode: string;
    newSectionId: () => string;
    now: string;
    plan: TMapPlacementPlan;
    shapeIds: ReadonlyMap<string, string>;
  }): { bindings: TPpmCanvasBinding[]; cardIds: string[]; change: TMapShapeChange } {
    const update: TLShapePartial<TPpmCanvasShape>[] = [];
    for (const grown of input.plan.sectionHeights) {
      const node = withNodeHeight(grown.node, grown.h);
      if (node) update.push({ id: grown.id as TLShapeId, props: { h: grown.h, node }, type: PPM_CANVAS_SHAPE_TYPE });
    }
    if (input.plan.frameHeight !== null) {
      const node = withNodeHeight(input.frameNode, input.plan.frameHeight);
      if (node)
        update.push({
          id: input.frameId as TLShapeId,
          props: { h: input.plan.frameHeight, node },
          type: PPM_CANVAS_SHAPE_TYPE,
        });
    }
    const moves: TLShapePartial[] = input.plan.moves.map((move) => ({
      id: move.id as TLShapeId,
      type: move.type,
      y: move.y,
    }));
    const create: TLShapePartial<TPpmCanvasShape>[] = [];
    const sectionIds = new Map<string, string>();
    for (const created of input.plan.newSections) {
      const id = input.newSectionId();
      sectionIds.set(created.key, id);
      const node = createPpmMapSectionNode({
        authorId: input.authorId,
        height: created.h,
        moduleId: created.moduleId,
        now: input.now,
        title: created.title,
        width: created.w,
      });
      create.push(mapCardShape(id, node, created, input.frameId));
    }
    const bindings: TPpmCanvasBinding[] = [];
    const cardIds: string[] = [];
    for (const placed of input.plan.cards) {
      const binding = input.bindings.get(placed.key);
      const shapeId = input.shapeIds.get(placed.key);
      const parentId = placed.parent.kind === "section" ? placed.parent.id : sectionIds.get(placed.parent.key);
      const node = binding ? liveCardNode(binding, input.authorId, input.now) : null;
      if (!binding || !shapeId || !parentId || !node) continue;
      create.push(mapCardShape(shapeId, node, placed, parentId));
      bindings.push(binding);
      cardIds.push(shapeId);
    }
    return { bindings, cardIds, change: { create, moves, update } };
  }

  /** После «+ Добавить»: камера плавно подводится к первой новой карточке, если её не видно. Выделения нет (RM11). */
  export function revealMapCards(editor: Editor, ids: readonly string[]): void {
    const first = ids[0];
    const bounds = first ? editor.getShapePageBounds(first as TLShapeId) : undefined;
    if (!bounds) return;
    if (!rectInside({ h: bounds.h, w: bounds.w, x: bounds.x, y: bounds.y }, editor.getViewportPageBounds()))
      editor.centerOnPoint(bounds.center, { animation: { duration: 220 } });
  }
  ```

- [ ] **Step 5: `not-on-map.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { PPM_CANVAS_NODE_REGISTRY, type TPpmCanvasBinding, type TPpmWorkItemEditOptions } from "@ppm/canvas";
  import { formatPpmIssueIdentifier, formatPpmPullRequestRef } from "@/components/ppm-tasks/evidence";
  import {
    PPM_CANVAS_BATCH_LIMIT,
    type TPpmCanvasBatchBindingItem,
    type TPpmCanvasBatchBindingResult,
  } from "@/services/ppm-canvas-map.service";
  import { planMapPlacement, type TMapState } from "./map-layout";
  import {
    primaryModuleId,
    type TLivingMapCard,
    type TMapIssue,
    type TMapModule,
    type TMapPlacementRequest,
    type TMapPullRequest,
    type TNotOnMapItem,
    type TPlaceOnMapResult,
  } from "./map-model";
  import { buildPlacementChange, liveCardNode, type TMapShapeChange } from "./map-shapes";

  // AF2.2 M4: лоток «Не на карте» (K5): задачи спринта без карточки на доске и активные PR этих задач без карточки PR.
  // Ничего не добавляет сам: «+ Добавить» / «Разложить всё» — по нажатию редактора, одним S1 и одним шагом истории.

  /** За нажатие — не больше, чем принимает S1 и активирует одно сохранение. */
  export const MAP_PLACEMENT_LIMIT = PPM_CANVAS_BATCH_LIMIT;

  export function collectNotOnMap(input: {
    cards: readonly TLivingMapCard[];
    issues: ReadonlyMap<string, TMapIssue>;
    modules: ReadonlyMap<string, TMapModule>;
    options: TPpmWorkItemEditOptions;
    projectIdentifier: string | null;
    pullRequests: readonly TMapPullRequest[];
    sprintIssueIds: readonly string[];
  }): TNotOnMapItem[] {
    const tasksOnBoard = new Set<string>();
    const gitOnBoard = new Set<string>();
    for (const item of input.cards) {
      if (item.binding.entity_type === "work_item") tasksOnBoard.add(item.binding.entity_id);
      else if (item.binding.entity_type === "pull_request") gitOnBoard.add(item.binding.entity_id);
    }
    const states = new Map(input.options.states.map((state) => [state.id, state]));
    const people = new Map(input.options.assignees.map((person) => [person.id, person.display_name]));
    const sprint = input.sprintIssueIds
      .map((id) => input.issues.get(id))
      .filter((item): item is TMapIssue => Boolean(item));
    // oxlint-disable-next-line unicorn/no-array-sort -- sprint is a fresh array (lib ES2022: no toSorted).
    sprint.sort((left, right) => left.sequence_id - right.sequence_id);
    const directionOf = (item: TMapIssue) => {
      const moduleId = primaryModuleId(item.module_ids, input.modules);
      return { moduleId, moduleName: moduleId ? (input.modules.get(moduleId)?.name ?? null) : null };
    };
    const tasks = sprint
      .filter((item) => !tasksOnBoard.has(item.id))
      .map((item): TNotOnMapItem => {
        const state = item.state_id ? states.get(item.state_id) : undefined;
        const direction = directionOf(item);
        return {
          assignees: item.assignee_ids
            .map((id) => people.get(id))
            .filter(Boolean)
            .join(", "),
          identifier: formatPpmIssueIdentifier(input.projectIdentifier, item.sequence_id),
          key: `task:${item.id}`,
          kind: "task",
          moduleId: direction.moduleId,
          moduleName: direction.moduleName,
          stateGroup: state?.group ?? null,
          stateName: state?.name ?? null,
          title: item.name,
          workItemId: item.id,
        };
      });
    const sprintById = new Map(sprint.map((item) => [item.id, item]));
    const pulls: { item: TNotOnMapItem; sequence: number }[] = [];
    for (const link of input.pullRequests) {
      const owner = sprintById.get(link.work_item.id);
      if (!owner || link.object_type !== "pull_request" || link.status !== "active") continue;
      const entityId = link.git_object_id ?? link.id;
      if (gitOnBoard.has(entityId) || gitOnBoard.has(link.id)) continue;
      const direction = directionOf(owner);
      pulls.push({
        item: {
          entityId,
          key: `pr:${link.id}`,
          kind: "pull_request",
          moduleId: direction.moduleId,
          moduleName: direction.moduleName,
          ref: formatPpmPullRequestRef(link.ref),
          repositoryName: link.repository_name,
          title: link.title,
          workItemId: owner.id,
          workItemIdentifier: link.work_item.identifier,
        },
        sequence: owner.sequence_id,
      });
    }
    // oxlint-disable-next-line unicorn/no-array-sort -- pulls is built here (lib ES2022: no toSorted).
    pulls.sort((left, right) => left.sequence - right.sequence || left.item.key.localeCompare(right.item.key));
    return [...tasks, ...pulls.map((entry) => entry.item)];
  }

  /** Пункт лотка → запрос раскладки: задача — живая карточка 360 × 248, PR — карточка Git 360 × 220. */
  export function trayPlacementRequest(item: TNotOnMapItem, noDirectionTitle: string): TMapPlacementRequest {
    const sectionTitle = item.moduleName ?? noDirectionTitle;
    if (item.kind === "task")
      return {
        entityId: item.workItemId,
        entityType: "work_item",
        key: item.key,
        moduleId: item.moduleId,
        sectionTitle,
        size: {
          h: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultHeight,
          w: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultWidth,
        },
      };
    return {
      entityId: item.entityId,
      entityType: "pull_request",
      key: item.key,
      moduleId: item.moduleId,
      sectionTitle,
      size: { h: PPM_CANVAS_NODE_REGISTRY.git_ref.defaultHeight, w: PPM_CANVAS_NODE_REGISTRY.git_ref.defaultWidth },
    };
  }

  export type TPlaceOnMapDeps = {
    applyChange: (change: TMapShapeChange) => boolean;
    authorId: string;
    bindBatch: (items: readonly TPpmCanvasBatchBindingItem[]) => Promise<TPpmCanvasBatchBindingResult[]>;
    cancelBinding: (bindingId: string) => Promise<void>;
    newShapeId: () => string;
    now: () => string;
    readState: () => TMapState | null;
    registerBindings: (bindings: readonly TPpmCanvasBinding[]) => void;
  };

  /** S1 → раскладка по свежему состоянию доски (могла измениться за время запроса) → одно изменение → регистрация. */
  export async function placeOnMap(
    deps: TPlaceOnMapDeps,
    requests: readonly TMapPlacementRequest[]
  ): Promise<TPlaceOnMapResult> {
    if (requests.length === 0 || !deps.readState()) return { cardIds: [], failed: requests.length, placed: 0 };
    const shapeIds = new Map(requests.map((item) => [item.key, deps.newShapeId()]));
    const results = await deps.bindBatch(
      requests.map(
        (item): TPpmCanvasBatchBindingItem => ({
          entity_id: item.entityId,
          entity_type: item.entityType,
          shape_id: shapeIds.get(item.key) ?? "",
        })
      )
    );
    const now = deps.now();
    const bindings = new Map<string, TPpmCanvasBinding>();
    const rejected: TPpmCanvasBinding[] = [];
    requests.forEach((item, index) => {
      const result = results[index];
      if (result?.status !== "created") return;
      if (result.binding.entity_type === item.entityType && liveCardNode(result.binding, deps.authorId, now))
        bindings.set(item.key, result.binding);
      else rejected.push(result.binding);
    });
    const cancel = (list: readonly TPpmCanvasBinding[]) =>
      Promise.all(list.map((binding) => deps.cancelBinding(binding.binding_id).catch(() => undefined)));
    const state = bindings.size > 0 ? deps.readState() : null;
    if (!state) {
      await cancel([...bindings.values(), ...rejected]);
      return { cardIds: [], failed: requests.length, placed: 0 };
    }
    const plan = planMapPlacement(
      state,
      requests.filter((item) => bindings.has(item.key))
    );
    const built = buildPlacementChange({
      authorId: deps.authorId,
      bindings,
      frameId: state.frame.id,
      frameNode: state.frame.node,
      newSectionId: deps.newShapeId,
      now,
      plan,
      shapeIds,
    });
    let applied = false;
    try {
      applied = deps.applyChange(built.change);
    } catch {
      applied = false;
    }
    if (!applied) {
      await cancel([...bindings.values(), ...rejected]);
      return { cardIds: [], failed: requests.length, placed: 0 };
    }
    deps.registerBindings(built.bindings);
    if (rejected.length > 0) await cancel(rejected);
    return { cardIds: built.cardIds, failed: requests.length - built.bindings.length, placed: built.bindings.length };
  }
  ```

- [ ] **Step 6: `map-data.ts` — PR и лоток** — импорт `import { collectNotOnMap } from "./not-on-map";`.
  1. В `loadLivingMapData` (версия M2) было:
     ```ts
       let sprintIssues: TMapIssue[] | null = null;
       if (cycleId) {
         [cycle, modules, sprintIssues] = await Promise.all([
           loaders.cycle(cycleId),
           loaders.modules().catch((): TMapModule[] => []),
           loaders.sprintIssues(cycleId),
         ]);
       }
     ```
     стало:
     ```ts
       let sprintIssues: TMapIssue[] | null = null;
       let pullRequests: TMapPullRequest[] = [];
       if (cycleId) {
         [cycle, modules, sprintIssues, pullRequests] = await Promise.all([
           loaders.cycle(cycleId),
           loaders.modules().catch((): TMapModule[] => []),
           loaders.sprintIssues(cycleId),
           loaders.pullRequests().catch((): TMapPullRequest[] => []),
         ]);
       }
     ```
     и в `return { … }` добавить поле `pullRequests,` (после `modules,`).
  2. В `computeLivingMapView` было:
     ```ts
         // M4: лоток «Не на карте» (not-on-map.ts).
         tray: EMPTY_LIVING_MAP_TRAY,
     ```
     стало:
     ```ts
         tray:
           frame && current && input.data.sprintIssueIds
             ? {
                 builtAt: frame.createdAt,
                 enabled: true,
                 items: collectNotOnMap({
                   cards: input.cards,
                   issues: input.data.issues,
                   modules,
                   options: input.options,
                   projectIdentifier: input.projectIdentifier,
                   pullRequests: input.data.pullRequests,
                   sprintIssueIds: input.data.sprintIssueIds,
                 }),
               }
             : EMPTY_LIVING_MAP_TRAY,
     ```

- [ ] **Step 7: `living-map-facts.ts` — `placing` и `placeFromTray`**
  1. Импорты: `import { useCallback, useEffect, useMemo, useRef, useState } from "react";`,
     `import { createShapeId, useValue, type TLShapeId } from "tldraw";`, добавить
     `import { PpmCanvasService } from "@/services/ppm-canvas.service";`,
     `import { applyMapChange, mapStateFromRecords, readMapRecords, revealMapCards } from "./map-shapes";`,
     `import { MAP_PLACEMENT_LIMIT, placeOnMap, trayPlacementRequest } from "./not-on-map";`, в импорт из `./map-model`
     — `type TPlaceOnMapResult`.
  2. Было (перед финальным `return useMemo<TLivingMapFacts>(`):
     ```ts
       return useMemo<TLivingMapFacts>(
         () =>
           enabled
             ? {
                 facts: view.facts,
                 mapSections: view.mapSections,
                 modules: view.modules,
                 relationEdges: view.relationEdges,
                 sprint: view.sprint,
                 tray: view.tray,
               }
             : EMPTY_LIVING_MAP_FACTS,
         [enabled, view]
       );
     }
     ```
     стало:
     ```ts
       const [placing, setPlacing] = useState(false);
       const placingRef = useRef(false);
       const argsRef = useRef(args);
       argsRef.current = args;
       const trayItemsRef = useRef(view.tray.items);
       trayItemsRef.current = view.tray.items;
       const frameId = sprintFrameOf(groups)?.id ?? null;
       const placeFromTray = useCallback(
         async (keys: readonly string[], noDirectionTitle: string): Promise<TPlaceOnMapResult | null> => {
           const current = argsRef.current;
           const activeEditor = current.editor;
           // Только по нажатию редактора в активной вкладке своей карты (AF2.1 R19); сам лоток ничего не добавляет.
           if (!current.enabled || !current.canEdit || !current.isActive || !activeEditor || !frameId || placingRef.current)
             return null;
           const wanted = new Set(keys);
           const requests = trayItemsRef.current
             .filter((item) => wanted.has(item.key))
             .slice(0, MAP_PLACEMENT_LIMIT)
             .map((item) => trayPlacementRequest(item, noDirectionTitle));
           if (requests.length === 0) return null;
           placingRef.current = true;
           setPlacing(true);
           const canvas = new PpmCanvasService();
           const mapService = new PpmCanvasMapService();
           const { boardId, projectId: project, workspaceId: workspace } = current;
           try {
             const result = await placeOnMap(
               {
                 applyChange: (change) => applyMapChange(activeEditor, change),
                 authorId: current.authorId,
                 bindBatch: (items) => mapService.bindBatch(workspace, project, boardId, items),
                 cancelBinding: (bindingId) => canvas.cancelPendingBinding(workspace, project, boardId, bindingId),
                 newShapeId: () => createShapeId(),
                 now: () => new Date().toISOString(),
                 readState: () => mapStateFromRecords(readMapRecords(activeEditor), frameId),
                 registerBindings: current.registerBindings,
               },
               requests
             );
             revealMapCards(activeEditor, result.cardIds);
             return result;
           } finally {
             placingRef.current = false;
             setPlacing(false);
           }
         },
         [frameId]
       );

       return useMemo<TLivingMapFacts>(
         () =>
           enabled
             ? {
                 facts: view.facts,
                 mapSections: view.mapSections,
                 modules: view.modules,
                 placeFromTray,
                 placing,
                 relationEdges: view.relationEdges,
                 sprint: view.sprint,
                 tray: view.tray,
               }
             : EMPTY_LIVING_MAP_FACTS,
         [enabled, placeFromTray, placing, view]
       );
     }
     ```

- [ ] **Step 8: `not-on-map-tray.tsx` — заменить заглушку F целиком**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useState } from "react";
  import { ChevronDown, ChevronUp, GitPullRequest, Inbox, LayoutGrid, Plus, SquareCheck } from "lucide-react";
  import { useTranslation } from "@plane/i18n";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { fillCanvasTemplate, formatDueDate } from "../canvas-grammar";
  import { usePpmLivingMap } from "./living-map-context";
  import { dateOnly, type TNotOnMapItem, type TPlaceOnMapResult } from "./map-model";

  // AF2.2 M4: лоток «Не на карте · N» (K5) под кнопками правой колонки, только на доске с рамкой спринта. Сам ничего не
  // добавляет: «+ Добавить» и «Разложить всё» — у редактора (args.canEdit); читатель видит список без кнопок. Лоток живёт в
  // CanvasControls (оверлей пересоздаётся при смене memo) — «свёрнут» помним по доске вне компонента.
  const collapsedBoards = new Set<string>();

  export function PpmNotOnMapTray() {
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const { args, placeFromTray, placing = false, tray } = usePpmLivingMap();
    const [collapsed, setCollapsed] = useState(() => collapsedBoards.has(args.boardId));
    if (!args.enabled || !tray?.enabled || tray.items.length === 0) return null;
    const count = tray.items.length;
    const canPlace = args.canEdit && Boolean(placeFromTray);
    const built = dateOnly(tray.builtAt);
    const notice = (result: TPlaceOnMapResult) => {
      if (result.placed === 0) return ppmT("canvas.tray.place_error");
      if (result.failed > 0)
        return fillCanvasTemplate(ppmT("canvas.tray.placed_partial"), { failed: result.failed, placed: result.placed });
      return fillCanvasTemplate(
        ppmT(result.placed < count && result.placed >= 200 ? "canvas.tray.placed_more" : "canvas.tray.placed"),
        {
          count: result.placed,
        }
      );
    };
    const place = async (keys: readonly string[]) => {
      if (!placeFromTray) return;
      try {
        const result = await placeFromTray(keys, ppmT("canvas.map.section_no_direction"));
        if (result) args.notify?.(notice(result));
      } catch {
        args.notify?.(ppmT("canvas.tray.place_error"));
      }
    };
    const toggle = () => {
      if (collapsed) collapsedBoards.delete(args.boardId);
      else collapsedBoards.add(args.boardId);
      setCollapsed(!collapsed);
    };
    return (
      <section
        aria-label={fillCanvasTemplate(ppmT("canvas.tray.label"), { count })}
        className="ppm-living-map-panel ppm-not-on-map"
      >
        <header className="ppm-not-on-map__header">
          <Inbox aria-hidden="true" />
          <h2 className="ppm-not-on-map__title">
            {ppmT("canvas.tray.title")}
            <span className="ppm-not-on-map__count">· {count}</span>
          </h2>
          {canPlace && (
            <button
              type="button"
              className="ppm-not-on-map__all"
              aria-busy={placing || undefined}
              disabled={placing}
              onClick={() => void place(tray.items.map((item) => item.key))}
            >
              <LayoutGrid aria-hidden="true" />
              {ppmT("canvas.tray.place_all")}
            </button>
          )}
          <button
            type="button"
            className="ppm-not-on-map__toggle"
            aria-expanded={!collapsed}
            aria-label={ppmT(collapsed ? "canvas.tray.expand" : "canvas.tray.collapse")}
            title={ppmT(collapsed ? "canvas.tray.expand" : "canvas.tray.collapse")}
            onClick={toggle}
          >
            {collapsed ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
          </button>
        </header>
        {built && (
          <p className="ppm-not-on-map__subtitle">
            {fillCanvasTemplate(ppmT("canvas.tray.built"), { date: formatDueDate(built, currentLocale) })}
          </p>
        )}
        {!args.canEdit && <p className="ppm-not-on-map__subtitle">{ppmT("canvas.tray.readonly")}</p>}
        {!collapsed && (
          <ul className="ppm-not-on-map__list">
            {tray.items.map((item) => (
              <TrayItem
                canPlace={canPlace}
                item={item}
                key={item.key}
                placing={placing}
                onPlace={() => void place([item.key])}
              />
            ))}
          </ul>
        )}
      </section>
    );
  }

  function TrayItem({
    canPlace,
    item,
    onPlace,
    placing,
  }: {
    canPlace: boolean;
    item: TNotOnMapItem;
    onPlace: () => void;
    placing: boolean;
  }) {
    const ppmT = usePpmTranslation();
    const direction = item.moduleName ?? ppmT("canvas.map.section_no_direction");
    const label =
      item.kind === "task"
        ? item.identifier
        : item.ref
          ? fillCanvasTemplate(ppmT("canvas.tray.pr"), { ref: item.ref })
          : ppmT("canvas.tray.pr_no_ref");
    const context =
      item.kind === "task" ? direction : fillCanvasTemplate(ppmT("canvas.tray.pr_for"), { id: item.workItemIdentifier });
    const meta =
      item.kind === "task"
        ? `${item.stateName ?? ppmT("canvas.tray.no_state")} · ${item.assignees || ppmT("canvas.unassigned")}`
        : `${item.repositoryName} · ${direction}`;
    return (
      <li className="ppm-not-on-map__item">
        <div className="ppm-not-on-map__row">
          {item.kind === "task" ? <SquareCheck aria-hidden="true" /> : <GitPullRequest aria-hidden="true" />}
          <span className="ppm-not-on-map__id">{label}</span>
          <span aria-hidden="true">·</span>
          <span className="ppm-not-on-map__module">{context}</span>
          {canPlace && (
            <button
              type="button"
              className="ppm-not-on-map__add"
              aria-label={fillCanvasTemplate(ppmT("canvas.tray.place_label"), { name: label })}
              disabled={placing}
              onClick={onPlace}
            >
              <Plus aria-hidden="true" />
              {ppmT("canvas.tray.place")}
            </button>
          )}
        </div>
        <div className="ppm-not-on-map__item-title">{item.title}</div>
        <div className="ppm-not-on-map__meta">{meta}</div>
      </li>
    );
  }
  ```
  (Тест считает `{canPlace && (` дважды: «Разложить всё» и «+ Добавить».)

- [ ] **Step 9: Стили** — в блок M `living-map.css`:
  ```css
  /* M4 · лоток «Не на карте» — панель F (.ppm-living-map-panel), строки K5. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map {
    max-height: min(28rem, 60vh);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map svg {
    width: 0.875rem;
    height: 0.875rem;
    flex: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.5rem 0.25rem 1rem;
    color: var(--ppm-color-icon-subtle, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__title {
    display: flex;
    align-items: baseline;
    gap: 0.375rem;
    margin: 0;
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.8125rem;
    font-weight: 600;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__count {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    font-weight: 400;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__all {
    display: inline-flex;
    min-height: 2rem;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
    padding: 0 0.75rem 0 0.625rem;
    border: 0;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-on-accent, var(--txt-on-color));
    background: var(--ppm-color-accent, var(--bg-accent-primary));
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__toggle {
    display: inline-grid;
    width: 1.75rem;
    height: 1.75rem;
    flex: none;
    place-items: center;
    border: 0;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    background: transparent;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__subtitle {
    margin: 0;
    padding: 0 1rem 0.5rem 2.375rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__list {
    display: flex;
    min-height: 0;
    flex-direction: column;
    margin: 0;
    padding: 0 1rem 0.25rem;
    overflow-y: auto;
    list-style: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.5rem 0;
    border-top: 1px solid var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__row {
    display: flex;
    min-width: 0;
    min-height: 1.5rem;
    align-items: center;
    gap: 0.375rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__id {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__module {
    min-width: 0;
    overflow: hidden;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    text-overflow: ellipsis;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__add {
    display: inline-flex;
    min-height: 1.5rem;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    padding: 0 0.5rem 0 0.375rem;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.75rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__item-title {
    overflow: hidden;
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map__meta {
    overflow: hidden;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-not-on-map button:focus-visible {
    outline: 2px solid transparent;
    outline-offset: 2px;
    box-shadow: var(--ppm-focus-ring, 0 0 0 2px var(--border-accent-strong));
  }
  ```

- [ ] **Step 10: Строки** — в блок M, en и ru:
  ```ts
      "canvas.tray.title": "Not on the map",
      "canvas.tray.label": "Not on the map: {count}",
      "canvas.tray.built": "The map was built {date}",
      "canvas.tray.place_all": "Place all",
      "canvas.tray.place": "Add",
      "canvas.tray.place_label": "Add {name} to the map",
      "canvas.tray.pr": "PR {ref}",
      "canvas.tray.pr_no_ref": "PR",
      "canvas.tray.pr_for": "for {id}",
      "canvas.tray.readonly": "Only board editors can add to the map",
      "canvas.tray.collapse": "Collapse the list",
      "canvas.tray.expand": "Expand the list",
      "canvas.tray.placed": "Added to the map: {count}",
      "canvas.tray.placed_more": "Added to the map: {count}. For the rest — «Place all» once more",
      "canvas.tray.placed_partial": "Added to the map: {placed}, not added: {failed}",
      "canvas.tray.place_error": "Could not add to the map",
      "canvas.tray.no_state": "No status",
  ```
  ```ts
      "canvas.tray.title": "Не на карте",
      "canvas.tray.label": "Не на карте: {count}",
      "canvas.tray.built": "Карта собрана {date}",
      "canvas.tray.place_all": "Разложить всё",
      "canvas.tray.place": "Добавить",
      "canvas.tray.place_label": "Добавить {name} на карту",
      "canvas.tray.pr": "PR {ref}",
      "canvas.tray.pr_no_ref": "PR",
      "canvas.tray.pr_for": "к {id}",
      "canvas.tray.readonly": "Добавлять на карту могут редакторы доски",
      "canvas.tray.collapse": "Свернуть список",
      "canvas.tray.expand": "Развернуть список",
      "canvas.tray.placed": "Добавлено на карту: {count}",
      "canvas.tray.placed_more": "Добавлено на карту: {count}. Остальное — ещё раз «Разложить всё»",
      "canvas.tray.placed_partial": "Добавлено на карту: {placed}, не добавлено: {failed}",
      "canvas.tray.place_error": "Не удалось добавить на карту",
      "canvas.tray.no_state": "Без статуса",
  ```
  `oxfmt` файла и `$T/af22-pkg-build.sh ppm-brand`.

- [ ] **Step 11: Прогон** — `vitest run tests/ppm-canvas/living-map-tray.test.ts` → `11 passed`; M1–M3 и
  `af22-foundation.test.ts` — зелёные; формат/линт/tsc (файлы задачи + `map-layout.ts`, `map-shapes.ts`, `map-data.ts`,
  `living-map-facts.ts`), web vitest целиком (базовая линия + файлы F + 4 файла M), oxlint `719/0`, brand.

**Acceptance (M4):**
- [ ] На карте справа — «Не на карте · N»: задачи спринта без карточки («ROBOT-19 · Механика», статус · исполнитель) и PR
  задач спринта без карточки PR («PR #50 · к ROBOT-16»); на доске без рамки лотка нет; сам лоток ничего не добавляет.
- [ ] «+ Добавить» кладёт карточку в секцию своего направления в первую свободную ячейку без наложений (секция растёт,
  секции ниже сдвигаются, рамка растёт; нет секции — новая внизу); «Разложить всё» — всё (≤ 200 за раз) одним шагом
  истории; читатель видит список без кнопок; ошибка S1 — уведомление, доска без изменений.

---

## Самопроверка плана (spec A–D)

- A. Команда (F) → диалог (M1: текущий + будущие + завершённые за 60 дней, «по направлениям», «Собрать карту») → новая
  доска «Карта · …» (M1 `buildSprintMapBoard`) → рамка `map: sprint` с живой шкалой и «Открыть в Спринтах ↗», секции
  `map: section` (R7, «Без направления»), живые карточки ≤ 4 колонок без наложений (M1 раскладка), одним шагом истории,
  привязки одним S1 (M1 `assembleSprintMap`). Схема — F.
- B. `blocked_by`/`start_before`/`finish_before`/`relates_to`/`implemented_by`, `duplicate` — нет; чип «{тип} · из Задач»,
  подсказка «Изменяется в Задачах»; производные, не пишутся; любая доска v2 с живыми карточками (M2).
- C. Переключатель (M3 вид, значение — F), правила и приоритет (M3 `trafficOf`), рамки/строки/приглушение (M3 CSS),
  счётчики в секциях (M1 шапка + M3 факты + `mapSections`).
- D. Лоток (M4): задачи и PR не на доске, «+ Добавить» в секцию направления без наложений, «Разложить всё», ничего само,
  только редактор.
- Сквозные: v2 only (все виды — `args.enabled`), R19 (`args.isActive` в хуке, диалоге, лотке), `e.code`, строки в блоке M,
  без новых внешних запросов, производительность (подписи `useValue`, портал слоя), тест миграции — F.
- Решение контроллера (отметка S3 после сборки): M1 — `createSeenAfterSave` + `PpmCanvasChangesService.markSeen` после
  сохранения, активировавшего привязки (RM14), тест порядка вызовов «marks the new map as seen only after the save…».
- «Один шаг истории» (A) без потери живых карточек при «Отменить» и Delete по секции карты — страж RM15 (M1).
