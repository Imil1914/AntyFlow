# UX0.2 · раздел C (Холст) — карта кода для плана реализации

Дата: 2026-09-24. Только чтение: в `/Users/ermolov/Desktop/PPM` и `plane-fork` ничего не менялось. Все номера строк сверены
по **текущему рабочему дереву**, а не по HEAD. Номера из карточки UX0.2 устарели и сдвинулись на 40–300 строк.

Базовый путь: `W = /Users/ermolov/Desktop/PPM/plane-fork/apps/web/core/components/ppm-canvas/`

## 0. Состояние дерева и стоп-правило карточки

- `plane-fork` — сабмодуль, ветка `feat/i0.6-work-item-projections`, HEAD `53988697a8` (2026-09-13).
- Незакоммичены изменения в `editor.tsx`, `shape.tsx`, `canvas.css`, `route.tsx`: `git diff --stat` = 4 files, +10202/−401.
- Файлы `workspace.tsx`, `brain-panel.tsx`, `commands.ts`, `board-presence.tsx`, `board-recovery.ts`, `board-save-retry.ts`,
  `board-workspace-state.ts`, `desktop-import.ts`, `minimal-workspace.tsx`, а также `apps/web/tests/ppm-canvas/` и
  `apps/web/e2e/` **не отслеживаются git (`??`)**.
- Стоп-правило карточки: «Если I0.6 ещё правит `ppm-canvas/*`, дождаться слияния». I0.6 не влит: его работа лежит
  незакоммиченной в тех же файлах. Перед реализацией C нужен коммит или заморозка I0.6/AF, иначе правки смешаются с чужими.

Размеры: `workspace.tsx` 1562, `editor.tsx` 3353, `brain-panel.tsx` 2933, `canvas.css` 4867, `shape.tsx` 2600 строк.

Режимы монтирования (`route.tsx:39-77`):

```tsx
const isAntyFlowShellEnabled = isPpmAntyFlowShellEnabled(process.env.PPM_ANTYFLOW_SHELL_ENABLED);
...
{isAntyFlowShellEnabled ? (<PpmCanvasWorkspace …/>) : (<PpmMinimalCanvasWorkspace …/>)}
```

`minimal-workspace.tsx` (rollback при `PPM_ANTYFLOW_SHELL_ENABLED=0`) рендерит только `<PpmCanvasEditor>`: без шапки,
рейки и футера. **В этом режиме карточка статуса в editor — единственный индикатор сохранения.** Любая переделка
карточки должна сохранить её в minimal-режиме (см. §2).

---

## 1. «Спросить проект» (C.1)

### 1.1 Точки входа — полный список

| Что | Где | Код |
|---|---|---|
| Кнопка в шапке | `workspace.tsx:745-753` | см. ниже |
| Рендер панели | `workspace.tsx:1041-1055` | `{brainPanelOpen && (<PpmBrainPanel …/>)}` |
| Состояние | `workspace.tsx:132` | `const [brainPanelOpen, setBrainPanelOpen] = useState(false);` |
| Закрытие по Esc | `workspace.tsx:242-248` | любой Esc (window, capture) → `setBrainPanelOpen(false)` |
| Импорт | `workspace.tsx:73` | `import { PpmBrainPanel } from "./brain-panel";` (статический) |
| Палитра команд | нет | в `commands` (`workspace.tsx:501-640`) нет пункта ask/brain |
| `commands.ts` | нет команды открытия | есть только команды вставки результатов: `add-agent-answer`, `add-orchestrator-run`, `add-search-results` (`commands.ts:26-28`) |
| Горячие клавиши | нет | |
| URL-параметры | нет | editor читает только `ppm_vault_*` (`editor.tsx:922-948`) и `ppm_git_*` (`:972-997`) |
| Другие экраны | нет | `PpmBrainService` используется только в `brain-panel.tsx` (workspace импортирует лишь тип) |

```tsx
// workspace.tsx:745-753
        <button
          type="button"
          className="ppm-canvas-brain-trigger"
          aria-label={ppmT("ask_project.title")}
          onClick={() => setBrainPanelOpen(true)}
        >
          <BrainCircuit aria-hidden="true" />
          <span>{ppmT("ask_project.title")}</span>
        </button>
```

Обслуживающий код в workspace, нужный только панели: `saveAnswerToCanvas` (`:322-348`), `saveSearchToCanvas`
(`:350-357`), `saveOrchestratorRunToCanvas` (`:359-366`), `selectionByBoardId` (`:137`, `:299-307`),
`orchestratorRunVersionsByBoardId` (`:138-140`, `:309-320`). При выключенном флаге их можно оставить: это дёшево и
безопасно.

### 1.2 Что ещё живёт в `brain-panel.tsx` (2933 строки, `export function PpmBrainPanel` — `:282`)

Порядок блоков в `return` (`:1204-1797`):

1. Шапка `role="dialog" aria-label="Спросить проект" aria-modal="true"` (`:1205`).
2. Здоровье индекса: «Готово / В очереди / Ошибки» (`:1226-1230`).
3. Плашка «Ответы без внешней ИИ-модели…» (`:1232-1237`).
4. Четыре агента: «Сводка проекта» `project_reporter` (`:1239-1261`), «Декомпозиция работы» `work_decomposer`
   (`:1263-1323`), «Аналитик связей» `relationship_analyst` (`:1325-1380`), «Библиотекарь знаний»
   `knowledge_librarian` (`:1382-1442`).
5. Форма вопроса (`:1448-1522`) с двумя действиями:
   - **«Найти источники»** (`:1492-1500`, `submitSearch` `:537`). Это **поиск без ИИ** по индексу проекта через
     `PpmBrainService.query/streamQuery` → `POST …/brain/query/` с `source_types: ["work_item", "vault_file", "git_code"]`
     (`services/ppm-brain.service.ts:764-790`);
   - «Спросить» (запуск ответа).
6. Прогресс, восстановление запусков, отмена/повтор, «Добавить на холст» (`:1536-1705`).
7. Тело (`:1707-1793`): результат агента, ответ, результаты поиска (`SearchResults` `:2689`) **или**
   `SourceList` (`:2741`) — список источников с кнопкой «Переиндексировать» (`reindex` `:1113` →
   `POST …/brain/reindex/`), и `MemoryList` (`:2807`) — подтверждение и отклонение записей памяти (`reviewMemory` `:1150`).

### 1.3 Где ещё можно искать по источникам проекта

- Глобальный поиск Plane (Power-K и поиск в верхней панели) → `apps/api/plane/app/views/search/base.py:277-286`
  `MODELS_MAPPER`: `workspace, project, issue, cycle, module, issue_view, page, intake`.
  **Файлов Хранилища и кода Git в нём нет.**
- Хранилище (`ppm-vault/route.tsx`): поиска нет, только дерево. Есть политика индексации на файл
  (`:47-51` «Индексировать в Мозге проекта», селект `:540-553`) и ссылка «На холст «Мозг проекта»» (`:533`).
- Код (`ppm-git/route.tsx:1433-1450`): блок «Поиск по коду» показывает **только статус** индекса. Сам поиск — в панели Холста.
- **Итог:** после скрытия панели пропадут единственный UI-поиск по содержимому Хранилища и Git, ручная переиндексация и
  проверка памяти. Карточка это предусматривает: «Если скрытие «Спросить проект» убирает единственный путь к поиску по
  индексу проекта, не угадывать… спросить владельца». Решение владельца «поиск по проекту остаётся в общем поиске» верно
  только для задач, документов, спринтов и направлений. → **Открытый вопрос №1.**

### 1.4 Предлагаемое гейтирование `PPM_PROJECT_ASK_ENABLED` (по умолчанию `0`)

Проводка флага по образцу `PPM_ANTYFLOW_SHELL_ENABLED`:

1. `apps/web/vite.config.ts:16-19` — добавить строку
   `viteEnv.PPM_PROJECT_ASK_ENABLED = process.env.PPM_PROJECT_ASK_ENABLED ?? "0";`.
   Без этого `process.env` заменяется JSON-литералом без ключа (`define: {"process.env": JSON.stringify(viteEnv)}`, `:22-24`).
2. `turbo.json:9-12` — добавить `"PPM_PROJECT_ASK_ENABLED"` в `globalEnv`, иначе кэш turbo не учтёт флаг.
3. `apps/web/.env.example:14-15` — строка-комментарий `PPM_PROJECT_ASK_ENABLED="0"`.
4. Хелпер с безопасным значением по умолчанию «выключено»:
   - вариант A (как остальные флаги): `packages/ppm-canvas/src/index.ts` рядом с `isPpmAntyFlowShellEnabled` (`:2072-2075`):
     ```ts
     export function isPpmProjectAskEnabled(value: string | undefined): boolean {
       if (value === undefined) return false;
       return new Set(["1", "true", "yes", "on", "enabled"]).has(value.trim().toLowerCase());
     }
     ```
     Тест добавить в `packages/ppm-canvas/src/__tests__/canvas-node.test.ts` рядом с `:1124-1128`.
     ⚠ `@ppm/canvas` подключается через `dist` (`package.json` `"main": "./dist/index.mjs"`, dist в `.gitignore`), поэтому
     нужен `pnpm --filter @ppm/canvas build` (tsdown), прежде чем web увидит экспорт;
   - вариант B (без пересборки пакета): локальный `W/project-ask-flag.ts` + `apps/web/tests/ppm-canvas/project-ask-flag.test.ts`.
5. `workspace.tsx`: константа модуля (флаг вшивается на этапе сборки)
   `const IS_PROJECT_ASK_ENABLED = isPpmProjectAskEnabled(process.env.PPM_PROJECT_ASK_ENABLED);`
   - `:745-753` → `{IS_PROJECT_ASK_ENABLED && (<button className="ppm-canvas-brain-trigger" …>)}`;
   - `:1041` → `{IS_PROJECT_ASK_ENABLED && brainPanelOpen && (<PpmBrainPanel …/>)}`;
   - Esc-ветку (`:247`) не трогать: `setBrainPanelOpen(false)` при закрытой панели ничего не делает.
   - Статический импорт `:73` оставить. `lazy()` дал бы задержку показа при `=1`, а при `=1` поведение должно совпадать с текущим.
6. `brain-panel.tsx`, `ppm-brain.service.ts`, ноды `search` / `agent_query` / `agent_answer` / `orchestrator` в
   `shape.tsx:287-510` и их CSS **не трогать**. Ноды прежних запусков остаются видимыми: это данные.
   Их единственная кнопка «Разложить запуск» (`shape.tsx:322-383`) работает локально на холсте и ИИ не запускает.

При `=1` результат байт-в-байт совпадает с текущим JSX. При `=0` нет кнопки, панели и сетевых запросов к `brain/*` из UI
Холста: запросы идут только из `loadState` панели (`brain-panel.tsx:400-448`).

### 1.5 Тесты и проверки, которые затрагивает C.1

- Unit: `apps/web/tests/ppm-canvas/brain-agent-service.test.ts` тестирует только сервис — **не затронут**.
- E2E `apps/web/e2e/ppm-canvas-collaboration.spec.ts:982-1017` («narrow Canvas keeps … named actions»):
  `const brain = owner.page.getByRole("button", { name: /Спросить проект|Ask project/ })` и `await expect(control).toBeVisible()`
  → **упадёт при `=0`**. Нужно убрать `brain` из списка контролов (или проверять только при `=1`).
- E2E `apps/web/e2e/ppm-demo.spec.ts:473-510` (сценарий «Спросить проект»): уже устарел до UX0.2 — ищет
  `getByRole("region", { name: "Спросить проект" })` и `.ppm-ask-panel__result`, а таких селекторов в коде нет
  (панель — `role="dialog"`, классы `ppm-brain-panel__*`). Там же `:432` — регион «Индекс Мозга проекта» в Хранилище,
  которого тоже нет. Сценарий пометить `test.skip` при `PPM_PROJECT_ASK_ENABLED!=="1"`.
- Проверка вручную: при `=0` в шапке нет кнопки и нет запросов `brain/health|sources|memory|answer-runs|agent-runs`
  (DevTools → Network). При `=1` кнопка и панель прежние.

---

## 2. Статус сохранения (C.2)

### 2.1 Три текущих места

1. **Точка во вкладке** — `workspace.tsx:704`: `<SyncDot status={syncByBoardId[board.board_id]} />` для каждой
   открытой вкладки. `SyncDot` — `:1476-1478` (`aria-hidden="true"`).
2. **Карточка** — `editor.tsx:2410-2610`, `<aside className="ppm-canvas-status" aria-live="polite">` внутри
   `CanvasControls` (`:2151`), который рендерится как tldraw `InFrontOfTheCanvas` (`:1912-1960`).
3. **Футер** — `workspace.tsx:1011-1017`:
   ```tsx
      <footer className="ppm-canvas-workspace__status">
        <span>
          <SyncDot status={syncByBoardId[activeBoardId]} />
          {ppmT(syncStatusLabel(syncByBoardId[activeBoardId], capabilities.edit))}
        </span>
        <span>{capabilities.edit ? ppmT("canvas.shared_badge") : ppmT("canvas.read_only_title")}</span>
      </footer>
   ```
   `syncStatusLabel` (`:1506-1517`) при `!canEdit && (!status || status === "saved")` возвращает
   `"canvas.read_only_title"`. Поэтому у читателя фраза «Холст только для чтения» стоит **дважды** — и слева, и справа.

### 2.2 Состав карточки `editor.tsx:2410-2610`

| # | Блок | Строки | Тип |
|---|---|---|---|
| a | Заголовок: иконка `BrainCircuit` + `ppmT("project.brain")` («Холст») + метка статуса | 2411-2427 | дубль футера |
| b | `<p className="ppm-canvas-status__notice" data-status={syncStatus}>` — описание статуса или восстановления | 2428-2440 | **E2E-якорь** |
| c | Выбор черновика `<select>` (при >1 кандидате) | 2441-2452 | блокирующее |
| d | «Восстановить черновик» / «Проверить сохранение», «Скачать черновик», «Удалить черновик» | 2453-2468 | блокирующее |
| e | Предупреждение: хранилище черновиков недоступно | 2469-2471 | предупреждение |
| f | Слияние: «Проверить безопасное слияние» / «Сохранить объединённую версию» | 2472-2491 | блокирующее (conflict, export_only) |
| g | «Экспортировать доску» / «Импортировать доску» + скрытый `<input type=file accept="application/json,.json,.flow.json">` | 2492-2516 | сведения о доске, **E2E-якорь** |
| h | Предпросмотр импорта AntyFlow `role="dialog"` | 2517-2550 | итог импорта, **E2E-якорь** |
| i | «Импортировано: N» + отчёт | 2551-2564 | итог импорта |
| j | Ошибка импорта | 2565 | итог импорта |
| k | «Повторить сохранение» / «Скопировать локальное состояние» / «Загрузить версию с сервера» | 2566-2582 | блокирующее |
| l | `<details>` «Объекты холста · N» со списком и фокусом на объекте | 2583-2609 | сведения о доске |

Переходы статусов (`editor.tsx`): `setSyncStatus("corrupt")` — `:619`, `:839`. `conflict` — `:420`, `:450`, `:777`,
`:812`, `:1458`, `:1553`. `error` — `:453`, `:708`, `:833`, `:870`, `:1312`, `:1564`, `:1591`. Восстановление
(`setRecoveryDraft`/`setRecoveryMode`) **всегда** идёт в паре с `error` или `conflict` (`:688-698`, `:776-777`,
`:1494-1497`, `:1552-1553`, `:1563-1564`). Значит, условие «блокирующее» =
`recoveryMode || syncStatus ∈ {conflict, error, corrupt}` (+ `draftStorageUnavailable` как предупреждение).

CSS карточки: `canvas.css:2920-2934` (`.ppm-canvas-status`, z 315, `top: 3.25rem; right: .75rem; width: min(17rem,…)`)
и `:2936-3130`. **Уже сейчас** `@media (max-width: 720px) { .ppm-canvas-status { display: none; } }` (`:4726-4729`), так что
на телефоне действия восстановления и слияния **недоступны**.

### 2.3 E2E-якоря, которые нельзя сломать

- `ppm-canvas-collaboration.spec.ts:147, 180, 227, 258, 343, 466, 627, 637` —
  `.ppm-canvas-status__notice[data-status="conflict"|"error"]` + `toBeVisible()`;
- `:294, 300, 432, 434, 582` — кнопка «Восстановить черновик»; `:368, 370, 504` — «Проверить сохранение»;
  `:498, 597` — «Скачать черновик»; `:571` — `combobox` «Выберите локальный черновик»;
- `ppm-canvas-performance.spec.ts:303-305` — `.ppm-canvas-status__notice` должен **существовать** в активном редакторе с
  `data-status="saved"`. Проверяется только атрибут, видимость не нужна. Локатор строгий: элемент должен быть ровно один;
- `ppm-canvas-performance.spec.ts:233, 284` — `.ppm-canvas-workspace__editor[data-active="true"] input[type="file"]`
  (`setInputFiles`), то есть скрытый input импорта должен быть в DOM, даже когда «Сведения о доске» свёрнуты;
- `:238-240, 289-291` — `… [role="dialog"]`: предпросмотр импорта, первая кнопка — подтверждение. Внутри editor не
  должно появиться второго `role="dialog"`. У нового контейнера «Сведения о доске» роль `dialog` **не ставить**;
- `ppm-demo.spec.ts:147` — `getByText("Все изменения сохранены", { exact: true }).toBeVisible()`. Сейчас совпадений два
  (футер и карточка), и strict mode падает. После правки совпадение будет одно;
- `ppm-demo.spec.ts:565` — `getByText("Холст только для чтения", { exact: true })`. Сейчас два совпадения (левая и правая
  часть футера) плюс карточка. После правки — одно.

### 2.4 ⚠ Ловушка: `CanvasControls` перемонтируется при каждом изменении deps

`components = useMemo(() => ({ ...HIDDEN_TLDRAW_UI, InFrontOfTheCanvas: () => (<CanvasControls …/>) }), [...])`
(`editor.tsx:1912-2002`). В deps есть `syncStatus`, `semanticEdges`, `mergePreview` и др. tldraw рендерит
`jsx(InFrontOfTheCanvas, {})` (`@tldraw/editor/dist-cjs/lib/components/default-components/DefaultCanvas.js:178-181`).
Каждая новая функция — новый тип компонента, поэтому **всё поддерево `CanvasControls` размонтируется**:
`semanticPanelOpen` (`:2246`), `pickerOpen`, `boardPickerOpen`, состояние `<details>`.

Вывод из статического анализа (вживую не проверено): панель «Смысловые связи» закрывается сама после «Создать связь»
(`setSemanticEdges` → новый memo) и после каждого цикла автосохранения. **Любое новое состояние «свернуто/развернуто» и
«панель открыта» нужно хранить в `PpmCanvasEditor`** и передавать пропсами (добавив их в deps). Иначе оно будет сбрасываться.

### 2.5 Предлагаемая схема (минимальный diff)

1. `PpmCanvasEditor` получает проп `statusPlacement?: "card" | "footer"` (по умолчанию `"card"`):
   - `minimal-workspace.tsx:65-74` его не передаёт → текущая карточка без изменений (rollback-путь не меняется);
   - `workspace.tsx:989-1005` передаёт `statusPlacement="footer"`.
2. В `CanvasControls` при `"footer"`:
   - **Баннер блокирующих состояний** `<section className="ppm-canvas-status ppm-canvas-status--alert" aria-live="polite">`
     рендерится при `recoveryMode || syncStatus ∈ {conflict,error,corrupt} || draftStorageUnavailable`.
     Туда JSX-блоки b, c, d, e, f, k переносятся **дословно** с теми же подписями и классами. Заголовок a — метка статуса и
     иконка `AlertTriangle` вместо «Холст». Позиция — сверху по центру над холстом:
     `top:.75rem; left:50%; transform:translateX(-50%); width:min(40rem, calc(100% - 1.5rem))`.
     В `@media (max-width:720px)` вернуть `.ppm-canvas-status--alert { display:grid }`, чтобы восстановление стало
     доступно и на телефоне;
   - **Скрытая живая область** в неблокирующем состоянии:
     `<p className="ppm-canvas-status__notice ppm-visually-hidden" data-status={syncStatus} aria-live="polite">…описание…</p>`.
     Так остаётся ровно один `.ppm-canvas-status__notice` (якорь perf-e2e) и сохраняется озвучка статуса. Свой
     visually-hidden класс добавить в canvas.css — сейчас такого нет. В блокирующем состоянии этот `<p>` живёт внутри баннера;
     два одновременно не рендерить;
   - **«Сведения о доске»** — кнопка-пилюля `top:.75rem; right:.75rem` с текстом «Доска · N объектов»,
     `aria-expanded`/`aria-controls`. В раскрытом виде показывает блоки g, h, i, j, l. Скрытый `<input type=file>`
     рендерить **всегда**, вне раскрываемой части (якорь e2e). Состояние `boardInfoOpen` хранится в `PpmCanvasEditor`
     (§2.4). Принудительно раскрывать при `desktopImport || desktopImportCount !== undefined || importError`, иначе
     предпросмотр импорта не будет виден. Роль контейнера — `region` или без роли, **не `dialog`**.
3. Футер (`workspace.tsx:1011-1017`) — единственный видимый статус:
   ```tsx
   const statusKey = syncStatusLabel(syncByBoardId[activeBoardId], capabilities.edit);
   …
   <span>{capabilities.edit ? ppmT("canvas.shared_badge") : statusKey === "canvas.read_only_title" ? null : ppmT("canvas.read_only_title")}</span>
   ```
   Так «Холст только для чтения» показывается один раз, а в состоянии ошибки у читателя признак «только чтение» не теряется.
4. Точка во вкладке (`workspace.tsx:704`) — рендерить только при
   `status ∈ {saving, error, conflict, corrupt}`: `{shouldShowTabSyncDot(status) && <SyncDot …/>}`. Полностью убирать
   нельзя: футер показывает статус только **активной** доски, а фоновые доски тоже сохраняются и могут упасть с ошибкой
   (`hasPendingCanvasChanges` `:1523-1525` блокирует закрытие вкладки). → **Открытый вопрос №2** (буквально карточка
   требует «один раз»).
5. «Версия 0» — две точки:
   - `workspace.tsx:1182-1184` (строка доски в переключателе) `<small>{ppmT("canvas.board_version")} {board.version}</small>`;
   - `editor.tsx:2856-2858` (выбор доски для ссылки) — тот же `<small>`.

   Заменить на `formatPpmTimeAgo(board.updated_at, currentLocale)` из `@/helpers/ppm-time-ago.helper` (тест
   `tests/workspace/ppm-time-ago.test.ts`), с новым ключом `canvas.board_updated` («Изменена» / «Updated») в
   `packages/ppm-brand/src/index.ts`. Или просто удалить `<small>`. `currentLocale` — из `useTranslation()` `@plane/i18n`
   (так делает `usePpmTranslation`, `core/hooks/use-ppm-translation.ts`).
6. (опционально) В палитре добавить команды «Экспортировать доску» / «Импортировать доску» / «Объекты холста» через
   существующую шину `dispatchPpmCanvasCommand` (`commands.ts:91-93`). Это ещё одна точка входа, если пилюля неудобна.

Что может сломаться и как проверить:
- recovery/merge недостижимы → прогнать e2e collaboration (conflict, offline error, восстановление черновика,
  выбор из нескольких черновиков) и вручную: DevTools offline → правка → баннер «Изменения не сохранены» + «Повторить
  сохранение»; две вкладки → conflict → «Проверить безопасное слияние»;
- импорт → e2e performance (иерархия и 300 фигур): `setInputFiles` + `[role=dialog]`;
- minimal-режим → `PPM_ANTYFLOW_SHELL_ENABLED=0`: карточка как раньше.

---

## 3. Рейка (C.3)

- По умолчанию развёрнута: `workspace.tsx:130` `const [railExpanded, setRailExpanded] = useState(true);`.
- Автосворачивание: `workspace.tsx:144-152`
  ```tsx
    const narrowViewport = window.matchMedia("(max-width: 980px)");
    const collapseRailOnNarrowViewport = () => { if (narrowViewport.matches) setRailExpanded(false); };
  ```
  Эффект срабатывает после отрисовки, поэтому на узком экране рейка сначала мигает развёрнутой.
- CSS-брейкпоинт 980 (`canvas.css:4744-4792`): при ≤980 колонка всегда 3.5rem, а развёрнутая рейка становится
  оверлеем (`width: min(13.375rem, …)`, тень).
- Бренд: `workspace.tsx:757-767` → `<span>AF</span>` и `{railExpanded && <strong>AntyFlow</strong>}`. Подпись кнопки
  `ppmT("canvas.collapse_panel" | "canvas.expand_panel")` = «Свернуть/Развернуть панель AntyFlow»
  (`packages/ppm-brand/src/index.ts:1345-1346` ru, `:606-607` en).
- «Холст» всегда активен: `workspace.tsx:769-775` `<RailButton active … icon={LayoutGrid} label={ppmT("canvas.canvas")}
  onClick={() => runCanvasCommand("select")} />`. В `RailButton` (`:1434-1469`) есть только `data-active`, нет `aria-pressed`;
  имя кнопки берётся из `title={label}` и содержимого (`<span>` + `<kbd>`).
- Подписи разделов: `RailSectionLabel` (`:1471-1474`) → `.ppm-canvas-rail__label` (`canvas.css:2001-2008`):
  `font-size: 0.5625rem` (9 px), `letter-spacing: 0.11em`, uppercase, `color: var(--txt-tertiary)` (4,47:1 в светлой).
  То же 9 px у «АКТИВНЫЕ ДОСКИ» `.ppm-canvas-board-panel__list > small` (`:2277-2284`) и у `kbd` в палитре (`:2459-2466`).

Предложения:
1. `useState(() => typeof window === "undefined" || !window.matchMedia(CANVAS_RAIL_COLLAPSE_QUERY).matches)` и тот же
   запрос в эффекте, где `CANVAS_RAIL_COLLAPSE_QUERY = "(max-width: 1279px)"` вынести в `board-workspace-state.ts`.
   Сворачивать только при сужении, как сейчас. CSS-оверлей 980 не трогать. SSR выключен (`react-router.config.ts`
   `ssr:false`), workspace грузится лениво — `window` доступен.
2. Бренд: `<img src={PPM_BRAND.assets.mark} alt="" aria-hidden className="…"/>` (как в `ppm-shell/product-logo.tsx:28-31`)
   или `<span>PPM</span>` + `{railExpanded && <strong>PPM</strong>}`. Холст доступен только при включённом бренде
   (`isPpmCanvasEnabled` требует shell, shell требует brand), поэтому `PPM_BRAND` безопасен. Ключи
   `canvas.collapse_panel/expand_panel` → «Свернуть/Развернуть панель инструментов» (ru и en).
3. `aria-pressed`: добавить в `RailButton` проп `pressed?: boolean` →
   `aria-pressed={pressed}` и `data-active={pressed || undefined}`. Жёсткий `active` у «Холст» убрать. Текущий
   инструмент брать из editor: в `CanvasControls`
   `const toolId = useValue("ppm canvas tool", () => editor.getCurrentToolId(), [editor]);` + `useEffect(() =>
   onToolChange?.(boardId, toolId), …)`. Новый проп `onToolChange` у `PpmCanvasEditor` (как `onSelectionChange`,
   `editor.tsx:136`) и `toolByBoardId` в workspace (как `selectionByBoardId`). «Холст» → `pressed={tool === "select"}`,
   «Нарисовать визуальную связь» → `pressed={tool === "arrow"}`.
   Стиль активного пункта перевести с `box-shadow: inset 2px 0 0` (`canvas.css:2039-2041`), который перебивает
   фокус-кольцо бренда, на `::before`.
4. 9 px → 11 px: `.ppm-canvas-rail__label`, `.ppm-canvas-board-panel__list > small`, `.ppm-canvas-command-palette > label kbd`
   → `font-size: 0.6875rem; letter-spacing: 0.06em`. Метаданные 10 px → 11 px: футер `canvas.css:2127`, `kbd` рейки и
   триггера `:1935`, `.ppm-canvas-board-row__open small` `:2342`.

Что может сломаться:
- e2e `ppm-canvas-collaboration.spec.ts` ищет `/Добавить заметку ⇧N|Add note ⇧N/` при 1440 px. Рейка там останется
  развёрнутой, а имя кнопки — «метка + kbd». **Не добавлять `aria-label` в развёрнутом виде**, иначе имя потеряет «⇧N».
  Для свёрнутой рейки `aria-label={label}` безопасен;
- e2e на 320 px ждут `not.toHaveAttribute("data-rail-expanded")` — выполняется;
- ширина 981–1279: рейка свёрнута, по клику разворачивается колонкой.

---

## 4. tldraw: тема, выделение, шрифт, цвета (C.4, C.7)

### 4.1 Текущие props

```tsx
// editor.tsx:2055-2062
          <Tldraw
            cameraOptions={{ wheelBehavior: "pan" }}
            components={components}
            shapeUtils={[PpmCanvasNodeShapeUtil]}
            onMount={setEditor}
          >
            {presence && <PpmCanvasRealtimeCursors presence={presence} />}
          </Tldraw>
```

tldraw 3.15.6. Контейнер создаётся с `tl-theme__light` (`@tldraw/editor/dist-cjs/lib/TldrawEditor.js:94`) и переключается
на `tl-theme__dark` по `editor.user.getIsDarkMode()`. `UserPreferencesManager.getIsDarkMode()`: `colorScheme`
`"dark" | "light" | "system"`, иначе `inferDarkMode ? OS : false`. `inferDarkMode` смотрит на **ОС**, а не на
`data-theme` PPM, поэтому не подходит. Цвета фигур (стрелки «black») задаёт JS-палитра: светлая `#1d1d1d`,
тёмная `#f2f2f2` (`@tldraw/tlschema/dist-cjs/index.js:51`, `:330`).

Контраст: `#1d1d1d` на `#15171c` = **1,06:1** (сейчас). `#f2f2f2` на `#15171c` = **16,02:1** (после синхронизации).

### 4.2 Синхронизация темы

Plane уже маппит тему: `resolveGeneralTheme` из `@plane/utils` (`packages/utils/src/theme-legacy.ts:26-27`) даёт
`"light" | "dark" | "system"`. Это тот же union, что `TLUserPreferences.colorScheme`. Используется в
`apps/web/app/provider.tsx:39-46` вместе с `useTheme()` из `next-themes` (`ThemeProvider`, `app/root.tsx:109-112`,
темы `light, dark, light-contrast, dark-contrast, custom`).

```tsx
// editor.tsx, в PpmCanvasEditor
import { useTheme } from "next-themes";
import { resolveGeneralTheme } from "@plane/utils";
…
const { resolvedTheme } = useTheme();
const colorScheme = resolveGeneralTheme(resolvedTheme);
useEffect(() => {
  if (!editor || editor.user.getUserPreferences().colorScheme === colorScheme) return;
  editor.user.updateUserPreferences({ colorScheme });
}, [colorScheme, editor]);
```

Эффект пишет в общий localStorage tldraw (`TLDRAW_USER_DATA_v3`) и рассылает изменение по BroadcastChannel. Все открытые
редакторы досок получают одно значение — это ожидаемо. Тема `custom` → `system` (по ОС). Пограничный случай, можно оставить.

### 4.3 Выделение и шрифт

`canvas.css:2648-2655`:

```css
.ppm-canvas-shell .tl-container {
  --color-background: var(--bg-surface-1);
  --color-low: var(--bg-surface-2);
  --color-low-border: var(--border-subtle);
  --color-primary: var(--bg-accent-primary);
  --color-text: var(--txt-primary);
  font-family: Inter, "Segoe UI", sans-serif;
}
```

Специфичность `.ppm-canvas-shell .tl-container` (0,2,0) выше `.tl-theme__dark` (0,1,0), поэтому переопределения PPM
переживают смену темы. Добавить:

```css
  --color-primary: var(--border-accent-strong);            /* было --bg-accent-primary: #22d3ee на #fff = 1,81:1 */
  --color-selected: var(--border-accent-strong);
  --color-selection-stroke: var(--border-accent-strong);
  --color-selection-fill: color-mix(in srgb, var(--border-accent-strong) 16%, transparent);
  font-family: var(--ppm-font-sans, var(--font-body, ui-sans-serif, system-ui, sans-serif));
```

`--border-accent-strong`: светлая = `--ppm-color-accent-active` `#0891b2` (3,68:1 на `#fff`, ≥ 3:1 для UI);
тёмная = `--ppm-color-focus` `#67e8f9` (12,37:1 на `#15171c`) — `packages/ppm-brand/src/tokens.css:198` (light — `:109`; dark-блок, строка
`--border-accent-strong: var(--ppm-color-focus);`). После A.3 (`#0e7490`) — 5,36:1. У tldraw `--color-selected` /
`--color-selection-stroke` по умолчанию синие `hsl(214 84% 56%)` (`tldraw.css:147,167,202,222`).

Моно: `canvas.css:3709`, `:3837` — `"SFMono-Regular", Consolas, monospace`, в панели — `:1445-1448`.
→ `var(--ppm-font-mono, var(--font-code, ui-monospace, monospace))`.

### 4.4 Цвета нод (C.7)

Каждая нода получает цветовой класс: `shape.tsx:238` `ppm-canvas-node--${kind} ${COLOR_CLASS[…]}`, `COLOR_CLASS`
`:91-96` = cyan/green/violet/yellow. Базовый фон `.ppm-canvas-node` (`canvas.css:3188-3197`: `color:#1e293b;
background:#fef3c7`) всегда перебивается цветовым классом (`:3213-3227`). Цветовые классы стоят ниже в файле, поэтому
перебивают и `--group` / `--frame` (`:3199-3211`).

Литералы внутри нод (полный список — `canvas-css-color-literals.tsv` в этой папке, 181 строка, из них 74 в `ppm-brain-panel`):
- «чернила» `rgb(15 23 42 / α)` — ~30 раз (chrome, kind, deck, diagram, code, table, board-link, agent/orchestrator);
- «бумага» `rgb(255 255 255 / α)` — ~15 раз;
- текст `#1e293b` / `#0f172a` (`:3194`, `:3702`, `:4175`, `:4239`);
- особые: fallback `#fee2e2 / #7f1d1d / #991b1b` (`:3229-3241`), ошибка диаграммы `#b91c1c` (`:3714`), код
  `#0f172a/#e2e8f0` (`:3835-3836`, тёмный блок в обеих темах — можно оставить), work-item-card `#166534`, `#7c2d12`,
  `#9f1239` (`:4203-4292`), фиолетовые оттенки orchestrator (`:3505-3543`).

Предложение — механическая замена с сохранением альфы. В светлой теме визуально ничего не меняется:

```css
.ppm-canvas-shell {
  --ppm-canvas-node-ink: #0f172a;         /* rgb(15 23 42) */
  --ppm-canvas-node-fg: #1e293b;
  --ppm-canvas-node-paper: #ffffff;
  --ppm-canvas-node-yellow: rgb(254 243 199 / 0.94);
  --ppm-canvas-node-cyan: rgb(207 250 254 / 0.82);
  --ppm-canvas-node-green: rgb(220 252 231 / 0.92);
  --ppm-canvas-node-violet: rgb(237 233 254 / 0.92);
}
[data-theme*="dark"] .ppm-canvas-shell {
  --ppm-canvas-node-ink: var(--txt-primary);
  --ppm-canvas-node-fg: var(--txt-primary);
  --ppm-canvas-node-paper: var(--bg-surface-1);
  --ppm-canvas-node-yellow: color-mix(in srgb, var(--ppm-node-note, #fbbf24) 18%, var(--bg-surface-2));
  --ppm-canvas-node-cyan:   color-mix(in srgb, var(--ppm-node-project, #22d3ee) 18%, var(--bg-surface-2));
  --ppm-canvas-node-green:  color-mix(in srgb, var(--ppm-node-decision, #34d399) 18%, var(--bg-surface-2));
  --ppm-canvas-node-violet: color-mix(in srgb, var(--ppm-node-task, #a78bfa) 18%, var(--bg-surface-2));
}
/* пример замены: rgb(15 23 42 / 0.58) → color-mix(in srgb, var(--ppm-canvas-node-ink) 68%, transparent) */
```

Контраст (скрипт `contrast.mjs`, `muted.mjs` в этой папке):
- тёмная, фон 18% оттенка на `#1b1e24`: `--txt-primary` 9,2–10,2:1; `--txt-secondary` 5,75–6,38:1; «чернила» 58% на этом
  фоне — около 3,6–4,0 (**мало**), поэтому для текста минимум α = 0,68 или `--txt-secondary`. Отделение карточки от холста
  1,45–1,61:1 — нужна граница `color-mix(ink 14%)`;
- **светлая, уже сейчас:** приглушённый текст нод `rgb(15 23 42/.58)` на пастели = **4,17–4,29:1 < 4,5**. При α = 0,68 —
  5,76–5,96:1. Предлагаю поднять минимальную альфу для текста до 0,68 в обеих темах;
- сейчас в тёмной теме пастель светится на `#15171c` с контрастом 15–16:1 («ослепительные пятна»).

Альтернатива с меньшим риском — «приглушённый стикер» в тёмной теме: пастель 80–85% на `#1b1e24`, тёмный текст
остаётся. fg 8,2–9,9:1, но muted 3,6–3,9:1 (провал), и свечение остаётся на 10–12:1. Не рекомендую.

Пастели статусов (всё в `.ppm-brain-panel*`, видно только при `PPM_PROJECT_ASK_ENABLED=1`) → токены Plane
(`packages/tailwind-config/variables.css:248-298` light, `:498-548` dark):
- `#86efac` (`:957, 1099, 1200, 1398, 1529, 1560, 1747`), `#4ade80` (`:1204`), `#bbf7d0` (`:1282`) → `var(--txt-success-primary)`;
- `#fcd34d` (`:967, 1093, 1194, 1680, 1754, 1778, 1895`), `#fde68a` (`:1134`) → `var(--txt-warning-primary)`;
- `#fca5a5` (`:704, 961, 1103, 1208, 1333, 1513, 1533, 1686`), `#fecaca` (`:634, 810, 1276`) → `var(--txt-danger-primary)`;
- `.ppm-brain-panel__apply-actions button { color:#052e16; background:#4ade80 }` (`:1369-1377`) →
  `background: var(--bg-success-primary); color: var(--txt-on-color)` (после A.1 `--txt-on-color` снова белый);
- `.ppm-brain-panel__agent-run-save button { color: var(--txt-primary); background: var(--bg-accent-primary) }`
  (`:844-857`, 1,5:1 в тёмной) → `color: var(--txt-on-accent, var(--txt-on-color))` (A.1 вводит `--txt-on-accent`).

Сейчас на белом эти пастели дают 1,21–1,90:1, в тёмной — 9,45–14,79:1.

Хром Холста вне нод:
- точки присутствия `canvas.css:182-201` (`#f59e0b/#22c55e/#ef4444`) и точки сохранения `:2144-2158`
  (`#22c55e/#eab308/#ef4444`) → `var(--ppm-color-success|warning|danger, <текущий hex>)`;
- тост `:2586, :2599` `#ef4444` → `var(--border-danger-strong)` / `var(--txt-danger-primary)`;
- опасная кнопка архива `:2570-2574` `color:white; background:#dc2626` → `var(--bg-danger-primary)` + текст из A.1.

### 4.5 Ярлык курсора коллеги (≥ 4,5:1)

`editor.tsx:2145-2149`:

```ts
function presenceCursorColor(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.codePointAt(0)!) % 360;
  return `hsl(${hash} 72% 52%)`;
}
```

Используется в `:2132` как `--ppm-presence-cursor-color`. CSS `canvas.css:2686-2700`: `color: white; background:
var(--ppm-presence-cursor-color)`. Белый на `hsl(h 72% 52%)` — минимум **1,45:1** (h≈60). Даже с выбором «белый или
чёрный» на эту заливку минимум 4,38. Решение: заливку ярлыка `hsl(h 80% 72%)` и текст `#0e0f12` — **≥ 5,61:1 для всех
360 оттенков** (скрипт `cursor.mjs`). Стрелку курсора оставить `hsl(h 72% 52%)`. Реализация: хелпер вынести в
`board-presence.tsx` как чистую функцию `presenceCursorColors(userId) → { cursor, label }`, добавить CSS-переменную
`--ppm-presence-cursor-label` и тест контраста по всем оттенкам в `tests/ppm-canvas/board-presence.test.ts`. Аватары в чипе
(`board-presence.tsx:393-395`, CSS `:208-220`) можно красить той же функцией — опционально.

---

## 5. Шкала слоёв (C.5)

Все z-index в `canvas.css`:

| z | Селектор | Строка | Контекст наложения |
|---|---|---|---|
| 350 | `.ppm-canvas-workspace__header` | 21 | контекст предка (фактически root) |
| 360 | `.ppm-canvas-rail` | 1941 | то же |
| 340 | `.ppm-canvas-workspace__status` (футер) | 2116 | то же |
| 1 | `.ppm-canvas-workspace__content` | 2094 | создаёт контекст для всего editor |
| 500 | `.ppm-canvas-popover-backdrop`, `.ppm-canvas-dialog-backdrop` | 2169 | workspace |
| 600 | `.ppm-canvas-toast` | 2578 | workspace |
| 620 | `.ppm-brain-panel` | 240 | workspace — **перекрывает тост** |
| 310/315/320/325/330/340/360/390 | empty / status / topbar (мёртвый) / picker / semantic / file-drop-dialog / remote-cursors / file-drop-notice | 3135, 2923, 2862, 3849, 4007, 2742, 2660, 2713 | внутри content (z 1); выше `.tl-canvas` (у него `contain: strict` → свой контекст) и водяного знака tldraw (`--layer-watermark: 200`) |

Plane: `ModalCore` `relative z-30` (`packages/ui/src/modals/modal-core.tsx:34,47`); модалка Power-K `relative z-50`
(`core/components/power-k/ui/modal/wrapper.tsx:121`); Propel Dialog — оверлей `z-90`, окно `z-100`
(`packages/propel/src/dialog/root.tsx:44-49`); тултипы и контекстное меню `z-50`; тосты Propel — портал в body,
`z-[calc(1000-var(--toast-index))]` (`packages/propel/src/toast/toast.tsx:126`). Единой шкалы токенов у Plane нет.

Предложение (минимально и без каскада):
1. `.ppm-canvas-workspace { isolation: isolate; }` (`canvas.css:1-12`). Все z Холста (350–620) остаются внутри своего
   контекста. Модалки, Power-K, выпадающие меню верхней панели и тосты Plane (портал в body, z 30–1000) рисуются поверх
   шапки и рейки — критерий «модалки Plane перекрывают шапку Холста». Порядок внутри Холста не меняется.
2. Тост выше панели: `.ppm-canvas-toast` → z 640 (или панель → 590).
3. Для документации — локальные токены на `.ppm-canvas-workspace`:
   `--ppm-canvas-z-footer:340; --ppm-canvas-z-header:350; --ppm-canvas-z-rail:360; --ppm-canvas-z-overlay:500;
   --ppm-canvas-z-panel:620; --ppm-canvas-z-toast:640;`. Числа внутри editor **не перенумеровывать в 1–9**: водяной знак
   tldraw (z 200 в том же контексте) тогда встанет поверх пикеров и карточек.

Проверка: открыть Power-K («Поиск команд…» в верхней панели) и любую модалку Plane на `/brain/` — шапка и рейка затемнены
и не кликаются. Тост Plane виден поверх Холста. Оверлеи Холста (доски, палитра) по-прежнему закрывают шапку и рейку. Axe
e2e на 1440/320 должен остаться чистым.

---

## 6. Мелочи (C.6)

### 6.1 Esc для «Смысловых связей»
- Панель: `editor.tsx:2881-3088`, `<section className="ppm-semantic-edges" aria-label=…>` (`:2970`), закрывается только
  крестиком (`:2976-2978`). Esc не обрабатывается.
- Открывается командой `semantic-edges` (`:2333-2335`), состояние — `semanticPanelOpen` (`:2246`) в `CanvasControls` (см. §2.4).
- Глобальный Esc обрабатывает только workspace (`workspace.tsx:242-248`: меню досок, палитра, диалог, панель «Спросить»).
  Слушатель на `window` в фазе capture; `preventDefault` и остановки нет.
- ⚠ Не проверять «открыта ли модалка» через DOM в отдельном bubble-слушателе: setState из capture-слушателя workspace
  коммитится в микротаске между слушателями. Одно нажатие Esc закроет и палитру, и связи.
- Предложение:
  1. поднять `semanticPanelOpen` в `PpmCanvasEditor` (проп + deps memo);
  2. на `<section>` — `onKeyDown`: при `event.code === "Escape"` → `stopPropagation` + `onClose()`, при открытии фокус на
     первый контрол;
  3. запасной путь, когда фокус на холсте: в Esc-ветке workspace, если ничего другого не закрылось
     (`!boardMenuOpen && !commandPaletteOpen && !dialog && !brainPanelOpen`) и пользователь не печатает (или фокус внутри
     `.ppm-semantic-edges`), вызвать `dispatchPpmCanvasCommand({ boardId, command: "close-panels" })`. Новую команду
     `"close-panels"` добавить в `commands.ts:12-43`, обработчик в `CanvasControls` (`:2281`).
- Риск: tldraw тоже использует Esc (снять выделение, выйти из редактирования). Если панель закрывается при фокусе на
  холсте, одно Esc сделает оба действия — это допустимо.

### 6.2 Подсказка ⌘K и перехват ⌘K
- `workspace.tsx:742` `<kbd>⌘K</kbd>` — зашито.
- Слушатель `workspace.tsx:227-269`: `window.addEventListener("keydown", onKeyDown, true)` (capture). Для
  `(metaKey||ctrlKey) && event.code === "KeyK"` вызывает `preventDefault()` + `stopImmediatePropagation()` (`:232-241`),
  **независимо от того, где фокус**.
- Plane: `ShortcutHandler.handleKeyDown` на `document` (bubble, `power-k/global-shortcuts.tsx:71`) —
  `(e.metaKey || e.ctrlKey) && key === "k"` по `e.key` (`power-k/core/shortcut-handler.ts:74-82`). В ЙЦУКЕН `e.key = "л"`,
  поэтому не срабатывает (это D.6). Закрытие Power-K по ⌘K — React `onKeyDown` (`power-k/ui/modal/wrapper.tsx:71`,
  `navigation/top-nav-power-k.tsx:145`).
- Итог сейчас: на Холсте ⌘K всегда открывает палитру Холста. Даже при открытом Power-K Plane событие гасится на window,
  Power-K не закрывается, а под ним открывается палитра Холста.
- Предложение (владелец ⌘K определяется фокусом): обрабатывать ⌘K, только если
  `document.activeElement` — body/null или лежит внутри `.ppm-canvas-workspace`. Иначе `return` без остановки
  распространения, и Plane-оверлей получит своё событие. Подсказку сделать платформенной: чистая функция
  `formatCanvasCommandShortcut(platform)` в `board-workspace-state.ts`:
  `/mac|iphone|ipad/i.test(navigator.userAgentData?.platform ?? navigator.platform) ? "⌘K" : "Ctrl K"` + `aria-keyshortcuts`.
  В Plane похожая логика есть в `power-k/ui/modal/command-item-shortcut-badge.tsx:16`, но она склеивает «CtrlK» без пробела.
  → **Открытый вопрос №4**: альтернатива — отдать ⌘K Plane везде, а палитре Холста назначить другую клавишу.

### 6.3 `@keyframes ppm-canvas-spin`
`canvas.css:4699-4703`: `.ppm-work-items-view__loading svg { animation: ppm-canvas-spin 0.9s linear infinite; }`. В файле
есть только `@keyframes ppm-canvas-pulse` (`:2160`). Добавить
`@keyframes ppm-canvas-spin { to { transform: rotate(360deg); } }`. Reduced-motion (`:4858-4867`, `.ppm-canvas-shell *`)
покрывает это место: оно внутри shell.

### 6.4 Невалидный фон
`canvas.css:2639-2646`:
```css
.ppm-canvas-shell {
  …
  background:
    radial-gradient(circle at 12% 12%, rgb(var(--color-accent-primary-rgb) / 0.07), transparent 28rem),
    var(--bg-surface-1);
}
```
`--color-accent-primary-rgb` нигде не определён (grep по `apps`, `packages` — одно вхождение). Декларация невалидна на
этапе вычисления, фон прозрачный; под ним `.tl-background` = `--color-background`. Заменить на
`background: var(--bg-surface-1);` — визуально ничего не изменится.

### 6.5 Мёртвый CSS нижнего тулбара
`canvas.css:2859-2918` (`.ppm-canvas-topbar`, `.ppm-canvas-toolbar-button*`, `.ppm-canvas-topbar__divider`) и
`:4731-4741` (`.ppm-canvas-toolbar-button span` внутри `@media (max-width:720px)`). Grep по всему репозиторию:
вхождения только в `canvas.css`. Удалить.

### 6.6 «Версия 0» и повтор read-only — см. §2.5 п. 3 и п. 5.

---

## 7. Тесты и команды (базовая линия снята 2026-09-24 00:34)

| Команда | Результат |
|---|---|
| `cd plane-fork/apps/web && node_modules/.bin/vitest run tests/ppm-canvas tests/canvas` | **7 files, 66 tests passed** |
| `cd plane-fork/packages/ppm-canvas && node_modules/.bin/vitest run` | **2 files, 37 tests passed** |
| `cd plane-fork/packages/ppm-canvas && node scripts/audit-browser-boundary.mjs` | passed (3 isolated roots) |
| `cd plane-fork/apps/web && ../../node_modules/.bin/oxlint core/components/ppm-canvas` | 0 warnings, 0 errors |
| `cd plane-fork/apps/web && ../../node_modules/.bin/oxfmt --check core/components/ppm-canvas` | clean (14 files) |
| `cd plane-fork/apps/web && node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile <scratch>/web.tsbuildinfo` | **exit 0, 0 errors** (`--incremental false` нельзя: composite, TS6379) |

Примечания:
- `npm test` в корне PPM (M0.6 guard) проверяет только desktop `src/` (корневой `tsconfig.json` `include: ["src", …]`).
  plane-fork он не покрывает; для web — команда tsc выше или `pnpm --filter web check:types` (пишет `.react-router/types`
  и `.turbo/tsconfig.tsbuildinfo`).
- `web` `check:lint` = `oxlint --max-warnings=11957 .`: новые предупреждения могут вывести за лимит.
- Если меняются ключи `@ppm/brand` или экспорты `@ppm/canvas`: `pnpm --filter @ppm/brand test` (vitest + аудит строк) и
  `pnpm --filter @ppm/brand build` / `pnpm --filter @ppm/canvas build` (dist не хранится в git).
- Unit-тестов компонентов Холста нет, только чистые модули. E2E (`apps/web/e2e/*.spec.ts`, без `playwright.config`)
  требуют живого стенда и в unit-базовую линию не входят.

Новые тесты (предложение):
1. `isPpmProjectAskEnabled`: `undefined`/`""`/`"0"`/`"off"` → false; `"1"`/`"true"`/`"on"` → true.
2. `board-workspace-state.test.ts`: `formatCanvasCommandShortcut("MacIntel")` → «⌘K», `("Win32")` → «Ctrl K»;
   `shouldShowTabSyncDot`; `footerStatusLabels(status, canEdit)` — «только чтение» ровно один раз;
   `isBlockingCanvasStatus`.
3. `board-presence.test.ts`: контраст ярлыка курсора ≥ 4,5 для 0–359°.
4. `canvas-theme` (если выносить): `resolveGeneralTheme` → colorScheme для light, dark, light-contrast, dark-contrast, custom.
5. Статический CSS-тест (vitest читает `canvas.css` через fs, в `tests/` это разрешено): есть `@keyframes
   ppm-canvas-spin`; нет `--color-accent-primary-rgb`, `.ppm-canvas-topbar`, `Inter, "Segoe UI"`; у
   `.ppm-canvas-workspace` есть `isolation: isolate`; нет `font-size` < 0.6875rem в хроме (rail/footer/palette/board-panel).

E2E, которые надо обновить: `ppm-canvas-collaboration.spec.ts:996, 1001` (тест с `:982`) (кнопка «Спросить проект») и
`ppm-demo.spec.ts:473-510` (skip при выключенном флаге).

Визуальный дымовой прогон: `/brain/` в тёмной и светлой темах на 1440/1024/390. Проверить: пустая доска; доска с заметкой
каждого цвета и стрелкой (контраст стрелки в тёмной); выделение (цвет); read-only участник (гость); offline-ошибка и
баннер; конфликт в двух вкладках и слияние; импорт `.flow.json`; объекты и экспорт через «Доска»; Power-K и модалка Plane
поверх шапки; Esc в «Смысловых связях»; курсор коллеги (две сессии); рейка на 1279/1280/980.
