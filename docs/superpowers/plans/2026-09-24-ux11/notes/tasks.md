# Волна 1 · Карта: редизайн списка «Задачи» (read-only)

Дата: 2026-09-24. Источник истины — рабочее дерево `/Users/ermolov/Desktop/PPM/plane-fork` (ветка
`feat/i0.6-work-item-projections`, волна 0 не закоммичена). Все пути ниже — от `plane-fork/`.
Ничего не менялось; запускались только существующие тесты: `apps/web` vitest — **30 файлов / 184 теста, все
зелёные** (baseline для волны 1), `tests/power-k/shortcut-handler.test.ts` — 4/4.

Гейт для всего нового UI: `isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED)` из
`@ppm/brand` (паттерн уже в `core/components/issues/header.tsx:54`). `PPM_BRAND_ENABLED=0` ⇒ shell тоже off.
`PPM_ANTYFLOW_SHELL_ENABLED` / `PPM_PROJECT_ASK_ENABLED` — только Холст (`ppm-canvas/route.tsx:41`,
`ppm-canvas/workspace.tsx:88`), к Задачам не относятся. При флаге off каждая правка обязана рендерить ровно
upstream-ветку (как волна 0: `isPpmShell ? новое : upstream`).

---

## 0. TL;DR (что есть, чего нет)

| Элемент макета | Данные есть? | Источник / цена |
|---|---|---|
| Шкала спринта (день N из M, засечки, «сегодня», «осталось K дней», «открыто X из Y») | **Да** | `cycle.store` уже загружен `ProjectAuthWrapper` (0 новых запросов); свежие счётчики — 1 запрос `cycles/<id>/progress/` (есть `fetchActiveCycleProgress`) |
| Колонка куратора: «Просрочено» | **Да** | поля `target_date`, `state__group`/`state_id` уже в payload списка; строго `< today` (upstream `shouldHighlightIssueDueDate` считает и «сегодня») |
| «Заблокировано» (Plane relation `blocked_by`) | **Да, 1 запрос** | существующий `GET …/issues-detail/?expand=issue_relation&state_group=backlog,unstarted,started` (default per_page 1000, префетчи, без N+1). Per-issue `issue-relation/` = N+1 — не использовать |
| «Ждёт проверки» | **Нет однозначного** | в Plane нет группы «review»; дефолтные статусы проекта — англ. `Backlog/Todo/In Progress/Done/Cancelled`, «На проверке» нигде не сидится. Только эвристика по имени статуса группы `started` → вопрос владельцу |
| «Последние изменения» (что поменялось) | **Нет project-level API** | в CE нет фида активности проекта. Бесплатно: «кто и когда обновил» из `updated_at/updated_by` уже загруженных задач. «Что именно поменялось» → нужен крошечный read-only эндпоинт на `IssueActivity` |
| Полоска доказательств: статус | **Да** | `state_id` → `useProjectState().getStateById` |
| … PR (номер/кол-во) | **Да, 1 запрос на проект** | `GET /api/ppm/v1/workspaces/<ws_uuid>/projects/<id>/git/links/` существует (API), в web-сервисе метода нет — добавить `listLinks` |
| … состояние PR (черновик/открыт/слит) | **Частично** | состояние живёт в `PpmGitObject`; `links/` его не отдаёт. Overview отдаёт `objects[:100]` (тяжёлый, обрезан). Нужно крошечное additive-поле в `serialize_link` |
| … проверки PR «2/3» | **НЕТ** | check-runs/statuses не синхронизируются (`providers/github.py:559-574`: `"metadata": {}`), нужен новый синк GitHub — не «tiny», вне волны 1 |
| … материалы | **Да (вложения+ссылки)** | `attachment_count`, `link_count` уже в payload списка (0 запросов). **Файлы Хранилища к задаче не привязаны вообще** (нет модели) — «N материалов из Хранилища» недоступно без нового агрегата по связям Холста |
| Канонический порядок статусов | **Уже так** | при `group_by="state"` группы сортирует `sortStates` (backlog→unstarted→started→completed→cancelled, затем `sequence`) |
| Свёрнутая «Отменена» по умолчанию | **Да, без серверных фильтров** | свёрнутость групп хранится в localStorage (`issue_local_filters`), не на сервере |
| Группировка по статусам по умолчанию | **Нет** | серверный дефолт `display_filters.group_by = None` → список плоский («All work items»). Включение по умолчанию = изменение сохраняемых фильтров → вопрос владельцу |
| «Новая задача  N / Т» в кнопке | **Кнопка — да; сочетание — конфликт** | одиночной «c»/«n» нет; создание задачи = последовательность `ni` (Power-K). Одиночная `n` ломает `ni/nd/nv/nc/nm/np` без доработки обработчика |

---

## 1. Анатомия страницы «Задачи» (project issues list)

Маршрут `apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/`:
- `layout.tsx:14-23` — `<AppHeader header={<ProjectIssuesHeader/>} mobileHeader=…/>` + `<ContentWrapper><Outlet/></ContentWrapper>`.
  **Удобный слот для шкалы спринта**: между `AppHeader` и `ContentWrapper` (только этот маршрут, не влияет на
  спринты/направления/фильтры задач). `AppHeader` — `core/components/core/app-header.tsx:26-32` (`h-11`).
- `page.tsx:28-35` — `PageHead` + `<ProjectLayoutRoot/>` (используется **только** здесь, проверено grep).
- `header.tsx:9-11` → `IssuesHeader` (`core/components/issues/header.tsx`).
- `mobile-header.tsx` — мобильный переключатель вида/отображения (без основной кнопки).

Корень раскладки `core/components/issues/issue-layouts/roots/project-layout-root.tsx`:
```tsx
66  if (!workspaceSlug || !projectId || !workItemFilters) return <></>;
67  return (
68    <IssuesStoreContext.Provider value={EIssuesStoreType.PROJECT}>
69      <ProjectLevelWorkItemFiltersHOC …>
79        {({ filter: projectWorkItemsFilter }) => (
80          <div className="relative flex h-full w-full flex-col overflow-hidden">
81            {projectWorkItemsFilter && ( <WorkItemFiltersRow … /> )}
89            <div className="relative h-full w-full overflow-auto bg-surface-1">
91              {issues?.getIssueLoader() === "mutation" && ( …Spinner fixed top-[70px] right-[20px]… )}
96              <ProjectIssueLayout activeLayout={activeLayout} />
97            </div>
98            {/* peek overview */}
99            <IssuePeekOverview />
100         </div>
```
Слота справа нет. Правая панель выбранной задачи — это не колонка, а оверлей-портал:
`core/components/issues/peek-overview/view.tsx:121-134`
```tsx
121  const peekOverviewIssueClassName = cn(
122    !embedIssue ? "absolute z-[25] flex flex-col overflow-hidden rounded-sm border … bg-surface-1 transition-all duration-300" : `h-full w-full`,
125    !embedIssue && {
126      "top-0 right-0 bottom-0 w-full border-0 border-l md:w-[50%]": peekMode === "side-peek",
…
134  const portalContainer = document.getElementById("full-screen-portal") as HTMLElement;
```
Портал — `app/(all)/[workspaceSlug]/(projects)/layout.tsx:19` (`absolute inset-0` над всей областью проектов).
Значит колонка куратора = новый in-flow `aside` справа от скроллера списка; когда задача «подсмотрена»
(`useIssueDetail().peekIssue` установлен), side-peek (50 % ширины) и так её перекрывает — колонку можно просто
не рендерить (`!peekIssue`), чтобы не дублировать контент для скринридера. Клик по пункту колонки →
`setPeekIssue({ workspaceSlug, projectId, issueId })` (как `list/block.tsx:89-101`); outside-click детектор
peek (`view.tsx:88-100`) сначала закроет текущий peek — это ок.

Список (LIST): `list/roots/project-root.tsx:17-39` → `list/base-list-root.tsx` → `list/default.tsx` (`List`) →
`list/list-group.tsx` (`ListGroup`) → `list/headers/group-by-card.tsx` (`HeaderGroupByCard`) +
`list/blocks-list.tsx` → `list/block-root.tsx` (`IssueBlockRoot`, виртуализация `RenderIfVisible`) →
`list/block.tsx` (`IssueBlock`, строка) → `properties/all-properties.tsx` (`IssueProperties`).
`IssueBlock` рендерится всеми list-корнями (project, cycle, module, project-view, profile, archived) —
стиль строки поменяется везде; полоска доказательств/колонка/шкала — только там, где есть провайдер (см. §4).

Ключевые места:
- `base-list-root.tsx:86-91` — `collapsedGroups = issueFilters.kanbanFilters`; `fetchIssues("init-loader", { canGroup: true, perPageCount: group_by ? 50 : 100 })` — в сторе лежит лишь **загруженная страница** (по 50 на группу / 100 без группировки) и **с учётом фильтров** → сводки проекта нельзя честно считать из `issueMap`.
- `base-list-root.tsx:137-153` — `handleCollapsedGroups` пишет `EIssueFilterType.KANBAN_FILTERS` (общий для Доски и Списка).
- `default.tsx:90-95` — `getGroupByColumns({ groupBy, includeNone: true, isWorkspaceLevel, isEpic })`.
- `list-group.tsx:105` `const isExpanded = !collapsedGroups?.group_by.includes(group.id);`
  `:256` `const shouldExpand = (!!groupIssueCount && isExpanded) || !group_by;`
  `:266-287` шапка группы: `<Row className="w-full flex-shrink-0 border-b border-subtle bg-layer-1 py-1 pr-3 hover:bg-layer-1-hover" …><HeaderGroupByCard …/></Row>`;
  `:330-345` quick add (`QuickAddIssueRoot` + `ListQuickAddIssueButton`, sticky bottom).
- `group-by-card.tsx:113-121` — переключатель свёрнутости = `<div onClick>` (без клавиатуры/`aria-expanded`);
  `:118-119` заголовок + счётчик; `:137,:144` англ. «Create work item» / «Add an existing work item» (только
  спринт/направление); `:77-87` англ. тосты «Success!/Error!».
- `block.tsx:179-192` — строка:
  ```tsx
  182  "group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover",
  184    "border-accent-strong": getIsIssuePeeked(issue.id) && peekIssue?.nestingLevel === nestingLevel,
  185    "border-strong-1": isIssueActive,
  187    "bg-accent-primary/5 hover:bg-accent-primary/10": isIssueSelected,
  189    "md:flex-row md:items-center": isSidebarCollapsed,
  190    "lg:flex-row lg:items-center": !isSidebarCollapsed,
  ```
  44 px (`min-h-11 py-3`). Волна 0 (`notes/tokens.md` §8.5) уже зафиксировала: peeked `border-accent-strong` без
  ширины границы невидим, bulk-selected 1,03–1,09:1 — «owner question». Волна 1 должна это закрыть.
  `:236-248` ID (`IssueIdentifier`, не моно), `:273-281` заголовок (`text-body-xs-medium`, `truncate` + Tooltip),
  `:297-331` свойства + quick actions; англ. тексты `:195-201` (тост «Cannot move work item») и `:212-216`
  (tooltip «Only work items within the current project…»).
- `all-properties.tsx` — ячейки по `displayProperties` (пользовательские, сохраняются на сервере):
  state `:201-215` (глиф+имя), priority, dates (`:307-309` подсветка `shouldHighlightIssueDueDate`),
  assignee, modules (`projectDetails.module_view`), cycle (`cycle_view`), estimate, sub-issues, **attachments
  `:442-463`**, **links `:466-487`**, labels.
- Лоадер/плейсхолдер строки: `core/components/ui/loader/layouts/list-layout-loader.tsx:24-30` (`h-11`) — используется
  `block-root.tsx:142` как placeholder невидимых строк (`shouldRecordHeights={isMobile}` → на десктопе высоты не
  запоминаются ⇒ при 36/32 px строках будет «прыжок» скролла, если не поменять и плейсхолдер).
- Quick add: `quick-add/button/list.tsx:18-24` (`Row … py-3` + `onClick` на div, без клавиатуры),
  `quick-add/form/list.tsx`.
- Англ. остатки в раскладке списка (волна 0 не покрыла, тест `tests/ppm-shell/english-leftovers.test.ts`
  этот файл не сканирует): `issue-layouts/utils.tsx:126-135` — группа без группировки
  `name: \`All ${isEpic ? "Epics" : "work items"}\``; `:206-207, :233-234, :289, :322` — «None»;
  `getStateGroupColumns` `:258-271` берёт англ. `STATE_GROUPS[*].label`. Так как дефолтный `group_by = null`,
  **сейчас в PPM над плоским списком висит «All work items»**.

Шапка `core/components/issues/header.tsx:129-141`:
```tsx
129  {canUserCreateIssue && (
130    <Button variant="primary" size="lg"
133      onClick={() => { toggleCreateIssueModal(true, EIssuesStoreType.PROJECT); }}
136      data-ph-element={WORK_ITEM_TRACKER_ELEMENTS.HEADER_ADD_BUTTON.WORK_ITEMS}>
138      <div className="block sm:hidden">{t("issue.label", { count: 1 })}</div>
139      <div className="hidden sm:block">{t("issue.add.label")}</div>   // RU-оверлей: «Добавить задачу»
140    </Button>
```
Файл входит в brand-аудит (`packages/ppm-brand/scripts/audit-user-facing-brand.mjs:15`) — слово «plane» вне
импортов запрещено. `Button` (`packages/propel/src/button/button.tsx:12-41`) принимает `children` и любые
`aria-*` — `<kbd>` внутрь можно без изменения пропела. `HeaderFilters` (`core/components/issues/filters.tsx:37-43,
97-127`) — 5 раскладок, фильтры, «Отображение», «Аналитика»; не трогать (функционал).

---

## 2. Шкала спринта

### Данные (0 новых запросов)
- Циклы проекта грузит `core/layouts/auth-layout/project-wrapper.tsx:129-133`:
  `useSWR(PROJECT_ALL_CYCLES(projectId, currentProjectRole), () => fetchAllCycles(workspaceSlug, projectId), { revalidateIfStale: false, revalidateOnFocus: false })`.
- `core/store/cycle.store.ts:214-223` `currentProjectActiveCycleId` (по `status.toLowerCase() === "current"`),
  `:239-243` `currentProjectActiveCycle`, `:339-345` `getProjectCycleDetails(projectId)` (null до загрузки),
  `:414-437` `fetchAllCycles`, `:485-494` `fetchActiveCycleProgress` (мержит свежие счётчики в `cycleMap`).
- API `apps/api/plane/app/views/cycle/base.py:184-268` (list) отдаёт `name, start_date, end_date, status`
  (`"CURRENT"` по TZ проекта, аннотация `:153-167`), `total_issues, completed_issues, cancelled_issues`;
  даты конвертированы в TZ проекта (`user_timezone_converter`). Тип `ICycle` — `packages/types/src/cycle/cycle.ts:87-114`
  (`cancelled_issues` в `TProgressSnapshot`). Свежие счётчики: `GET …/cycles/<id>/progress/`
  (`core/services/cycle.service.ts:40-50`, API `cycle/base.py:660-782`).
- Утилиты: `packages/utils/src/datetime.ts:111-128` `findTotalDaysInRange` (inclusive), `:155-163`
  `findHowManyDaysLeft`, `:283-296` `getDate` (берёт `YYYY-MM-DD`, локальная дата — ок для TZ-строк).
- Ограничение: `Project.cycle_view` **по умолчанию False** (`apps/api/plane/db/models/project.py:94`,
  `module_view` тоже False) → у многих проектов «Спринты» выключены — шкалу не показывать; если включены, но
  текущего спринта нет — тихая строка «Активного спринта нет» (+ ссылка на Спринты для админов) или ничего.
- Счётчики из списка циклов устаревают после правок статусов в списке (SWR без ревалидации). Рекомендация: в
  шкале один `useSWR(["ppm-sprint-progress", cycleId], () => fetchActiveCycleProgress(ws, pid, cycleId), { revalidateOnFocus: true })`.

Расчёт (чистый хелпер, тест в node-окружении):
`totalDays = findTotalDaysInRange(start, end)` (16–29 → 14); `dayIndex = differenceInCalendarDays(today, start) + 1`
(23 → 8); `daysLeft = differenceInCalendarDays(end, today)` (→ 6); `open = total − completed − cancelled`
(макет B «Открыто 5 из 7»). Диапазон «16–29 сент.» — `Intl.DateTimeFormat("ru", { day: "numeric", month: "short" })`;
плюрали «день/дня/дней» — `Intl.PluralRules("ru")` (PPM-переводы `@ppm/brand` — плоские строки без ICU,
`core/hooks/use-ppm-translation.ts:12-16`).

### Минимальный диф
- Новое: `apps/web/core/components/ppm-tasks/sprint-scale.tsx` (observer; `useProject().getProjectById(projectId)?.cycle_view`,
  `useCycle().getProjectCycleDetails(projectId)?.find(c => c.status?.toLowerCase() === "current")`; SVG засечек
  с `aria-label`, число дня — `font-code`, штриховка прошедших дней, отметка «сегодня»; ≥11 px).
- Новое: `apps/web/helpers/ppm-tasks.helper.ts` → `computePpmSprintScale(start, end, today)` + `formatPpmSprintRange`,
  `pluralizeRu`. Тест: `apps/web/tests/ppm-tasks/sprint-scale.test.ts` (границы: до старта, последний день,
  1-дневный спринт, TZ-строки `…T00:00:00+03:00`).
- `issues/(list)/layout.tsx` (рекомендуемый слот):
  ```tsx
  const isPpmShell = isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED);
  <AppHeader … />
  {isPpmShell && <PpmSprintScale />}   // сам решает, рендериться ли (cycle_view, активный спринт)
  <ContentWrapper>…
  ```
  Альтернатива — первая строка внутри `project-layout-root.tsx:80` (над `WorkItemFiltersRow`); тогда шкала
  окажется внутри `ProjectLevelWorkItemFiltersHOC` — не нужно. Layout-слот чище.

---

## 3. Колонка куратора («ничего не выбрано»)

### Слот (минимальный диф в `project-layout-root.tsx:89-97`)
```tsx
const isPpmShell = isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED);
const { peekIssue } = useIssueDetail();
const showCurator = isPpmShell && activeLayout === EIssueLayoutTypes.LIST && !peekIssue;
…
{isPpmShell ? (
  <div className="relative flex h-full w-full overflow-hidden">
    <div className="relative h-full min-w-0 flex-1 overflow-auto bg-surface-1">{/* mutation loader + layout, как было */}</div>
    {showCurator && <PpmTasksCuratorColumn workspaceSlug={workspaceSlug} projectId={projectId} />}
  </div>
) : (
  /* строки 89-97 без изменений */
)}
```
`aside` скрывать ниже ~1440 px (`hidden min-[1440px]:flex w-80 shrink-0 border-l border-subtle`): брейкпоинты
Tailwind вьюпортные, а строки списка переключаются в `lg:flex-row` по вьюпорту (`block.tsx:189-190`) — при
сайдбаре + 320 px колонке ширина списка ~700 px, свойства начнут переноситься. Либо container queries
(`@container` на скроллере + `@3xl:flex-row` только в PPM-ветке строки).

### «Требует внимания» — данные
1. **Просрочено**: `target_date < today` и группа ∉ {completed, cancelled}. Поля уже в payload списка
   (`apps/api/plane/utils/grouper.py:106-130`: `target_date`, `state__group`, `completed_at`, `updated_at`,
   `updated_by`, `attachment_count`, `link_count`…; тип `packages/types/src/issues/issue.ts:58-103`).
   Upstream `shouldHighlightIssueDueDate` (`packages/utils/src/work-item/base.ts:172-187`) даёт `<= 0`, т.е.
   «сегодня» тоже — для «просрочено» нужен строгий `< 0` в своём хелпере.
2. **Заблокировано** (Plane `IssueRelation`): `IssueRelation(issue=X, related_issue=Y, relation_type="blocked_by")`
   = X заблокирована Y (`app/views/issue/relation.py:53-60`). В CE связи «Блокирует/Заблокирована» создаются
   (`core/components/relations/index.tsx:27-40`). Источник без N+1 — существующий эндпоинт
   `IssueDetailEndpoint` (`app/views/issue/base.py:975-1092`, URL `workspaces/<slug>/projects/<id>/issues-detail/`
   `app/urls/issue.py:48`): `expand=issue_relation` префетчит связи (`:1063-1077`), легаси-фильтр
   `state_group=backlog,unstarted,started` поддержан (`utils/issue_filters.py:96-103, 433`), пагинация по
   умолчанию 1000 (`utils/paginator.py:643-653`), assignee/label/module — префетч (`:1007-1025`). Сериализатор
   `app/serializers/issue.py:824-924` кладёт в `issue_relation[]` `{id, sequence_id, name, relation_type, state_id…}`
   блокера. Web уже умеет: `core/services/issue/issue.service.ts:40-58` сам переключает путь на `issues-detail/`,
   если в `expand` есть `issue_relation` и нет `group_by`. Стор связей умеет разобрать ответ:
   `core/store/issue/issue-details/relation.store.ts:271-309` `extractRelationsFromIssues` (кладёт в
   `relationMap`, тот же, что правит peek) — изменения связей из peek сразу отражаются.
   Блокер «активен», если его группа ∉ {completed, cancelled} (группа — `getStateById(state_id)`; блокер из
   другого проекта → считать активным).
   Не использовать: per-issue `GET …/issues/<id>/issue-relation/` (N+1); `ENABLE_ISSUE_DEPENDENCIES=false`
   (`packages/constants/src/issue/filter.ts:361`) — expand в списке включается только для Gantt
   (`store/issue/helpers/issue-filter-helper.store.ts:122-123`).
   Осторожно: смысловые связи Холста «Блокирует» (`ppm_canvas/models.py:44-53`, `PpmSemanticRelationType.BLOCKS`)
   с Plane-связями **не синхронизированы** — это второй, независимый «блок».
3. **Ждёт проверки**: данных нет. `StateGroup` = backlog/unstarted/started/completed/cancelled/triage
   (`db/models/state.py:14-20`); `DEFAULT_STATES` англ. (`:24-62`), РУ-статусы/«На проверке» нигде не создаются
   (CHANGELOG 2026-09-24 «Отложено: изменения стартовых данных и статусов по умолчанию в API»). Варианты:
   (a) эвристика `group === "started" && /провер|review|ревью/i.test(name)`, секция скрыта, если такого статуса
   нет; (b) «PR открыт и не черновик» из Git (нужен §4.2 additive); (c) настройка проекта. → вопрос владельцу.

Рекомендуемый хук `usePpmTaskAttention(workspaceSlug, projectId)`:
`useSWR(["ppm-task-attention", projectId], () => issueService.getIssues(ws, pid, { expand: "issue_relation", state_group: "backlog,unstarted,started" }))`
→ `relation.extractRelationsFromIssues(results)`; для state/target_date предпочитать живые значения
`issueMap[id]` (реакция на inline-правки без рефетча); вывод — чистый хелпер
`derivePpmTaskAttention({ today, issues, getState, getBlockers })` (топ-N, тест в node). Один запрос на
заход; `revalidateOnFocus: true`. Этот же ответ даёт строкам чип «Заблокирована · ROBOT-12» (макет B/C) через
контекст §4.

### «Последние изменения» — данных project-level нет
- В CE нет ленты активности проекта: `IssueActivity` читается только per-issue (`app/views/issue/activity.py:24-60`
  `…/issues/<id>/history/`) и per-user (`app/views/workspace/user.py:375-402` `user-activity/<user_id>/` —
  фильтр `actor=user_id`, т.е. N запросов по участникам). Grep по `IssueActivity.objects` в views — других нет.
- «Память проекта» (`ppm_brain` `knowledge/memory/`, `ppm_brain/views.py:1032-1046`) не годится: до 200 записей,
  `serialize_memory_record` на каждую делает 2 запроса и **пишет** freshness (`ppm_brain/memory.py:253-271,301-326`).
- Git overview (`ppm_git/views.py:318-372`) тяжёлый (репозитории, подключения, `objects[:100]`, 20 write-actions).
- Вариант A (0 API, волна 1): из уже загруженных задач проекта (`useIssues().issueMap`, фильтр
  `project_id`, `!archived_at`, `!is_draft`) топ-5 по `updated_at`: «Даша П. обновила ROBOT-12 · сегодня, 11:52»
  (`useMember().getUserDetails(updated_by)`, `helpers/ppm-time-ago.helper.ts:11-28`). Честно: без «что изменилось».
- Вариант B (крошечный read-only API, нужен ок владельца): `GET /api/ppm/v1/workspaces/<ws>/projects/<id>/work-items/activity/?limit=10`
  → `IssueActivity.objects.filter(project_id=…, issue_id__in=get_visible_work_items(project, user).values("id"))
  .exclude(field__in=["comment","vote","reaction","draft"]).select_related("actor","issue").order_by("-created_at")[:limit]`
  + `IssueActivitySerializer`. Гостевые права уже зашиты в `ppm_canvas/services.py:242-258` `get_visible_work_items`
  (гость без `guest_view_all_features` видит только свои). ~30 строк + контрактный тест рядом с
  `tests/contract/ppm_canvas/test_work_items_view_api.py`.

---

## 4. Полоска доказательств в строке

### 4.1 Источники
- **Статус**: `issue.state_id` → `useProjectState().getStateById` (глиф формы `StateGroupIcon` + цвет + имя).
  В строке статус уже есть ячейкой `StateDropdown` (`all-properties.tsx:201-215`) — JUDGE: «убрать повтор глифа
  статуса в первой ячейке полоски» ⇒ полоска = PR + материалы (+ чип «Заблокирована»).
- **PR**: `PpmGitLink` (`ppm_git/models.py:381-425`: `work_item` FK, `object_type` ∈ branch/commit/pull_request,
  `ref`, `title`, `canonical_url`, `status`, `origin`, `git_object`). API списка:
  `ppm_git/views.py:639-649` `GET …/git/links/` — **все активные связи проекта одним запросом**
  (`select_related("repository","work_item__project")`, без N+1), сериализация `:78-98` (`work_item.id`,
  `object_type`, `ref` = номер PR для синка GitHub `providers/github.py:552-578`, `git_object_id`).
  Права: `ppm_git/permissions.py:6-43` — read у любого участника/глобадмина, DENY → 403 (молча «нет данных»).
  Web: `core/services/ppm-git.service.ts` — есть `getOverview` (`:291-298`), **нет** `listLinks`; путь
  `/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}/git/` (`:485-487`) — нужен **UUID** workspace:
  `useWorkspace().getWorkspaceBySlug(slug)?.id` (как `ppm-git/route.tsx:118-151`). Автосвязи создаются по
  ключу `ROBOT-12` в PR/ветке (`ppm_git/provider_services.py:484-530`).
- **Состояние PR**: только в `PpmGitObject.state/is_draft` (`models.py:340-379`); `links/` не отдаёт. Overview
  отдаёт `objects[:100]` (`views.py:341-345`) — ненадёжно. Крошечная additive-правка (read-only):
  в `serialize_link` добавить `"git_object": {"state", "is_draft"} | None` и `select_related("git_object")` в
  `PpmGitLinkListView.get` и в overview. Контрактные тесты ключи линка точно не сравнивают
  (`tests/contract/ppm_git/test_git_api.py:160-205`), запрет только на `token/password/secret…` (`:279-280`).
- **Проверки PR «2/3» — недоступно** (нет синка check-runs, `metadata: {}` у PR). Не рисовать; не показывать «—».
- **Материалы**: `attachment_count` (FileAsset `ISSUE_ATTACHMENT`) + `link_count` (IssueLink) — уже в payload.
  Хранилище к задачам не привязано: `ppm_vault/models.py` — только entry→entry wiki-ссылки (`PpmVaultLink :216-252`);
  связь «файл ↔ задача» существует лишь как смысловые рёбра Холста между биндингами (`ppm_canvas/models.py:258-324`
  `PpmCanvasBinding` + `PpmCanvasSemanticEdge`) — агрегата нет, это не «tiny» (волна 2+). Дроп файла на Холст
  может создать **вложение задачи** (`canvas.file_drop_plane`) → оно уже считается в `attachment_count`.

### 4.2 Минимальный диф
- Новое `core/components/ppm-tasks/task-evidence-context.tsx`: `PpmTaskEvidenceContext` с
  `{ gitByWorkItem: Map<id, {prs: TPpmGitLink[]; branches: number}>, blockersByWorkItem: Map<id, {id; label}[]> }`.
  Провайдер ставится **только** в `project-layout-root.tsx` (под флагом) → cycle/module/view/profile/archived
  списки полоску не получают (контекст `undefined` → компонент `null`).
- Новое `use-ppm-git-links.ts`: `useSWR(["ppm-git-links", workspaceId, projectId], () => service.listLinks(...), { revalidateOnFocus: true, shouldRetryOnError: false })`.
- `ppm-git.service.ts`: `async listLinks(workspaceId, projectId): Promise<{ capabilities: TPpmGitCapabilities; links: TPpmGitLink[] }>` → `this.get(\`${this.gitPath(...)}links/\`)` + `normalizeGitError`.
- Новое `core/components/ppm-tasks/task-evidence.tsx` (PR «PR #48» или «PR 2», tooltip со списком, ссылка
  наружу `target=_blank rel=noopener`; скрепка «N» с tooltip «2 вложения · 1 ссылка»; ничего не рендерить,
  если пусто).
- `list/block.tsx` (под флагом): вставить `<PpmTaskEvidence issue={issue} />` перед `IssueProperties` (`:300`) и
  передать в `IssueProperties` `displayProperties` без `attachment_count/link` (иначе дубли с полоской) —
  сохранённые настройки пользователя не меняются, только рендер:
  `displayProperties={isPpmShell ? { ...displayProperties, attachment_count: false, link: false } : displayProperties}`.
- Хелпер `groupPpmGitLinksByWorkItem(links)` в `helpers/ppm-tasks.helper.ts` + тест.

---

## 5. Порядок статусов, «Отменена», группировка

- **Порядок уже канонический** при `group_by = "state"`: `issue-layouts/utils.tsx:241-256` `getStateColumns` →
  `store.state.projectStates` (`core/store/state.store.ts:110-115`) → `sortStates`
  (`packages/utils/src/work-item/state.ts:17-26`: порядок ключей `STATE_GROUPS`
  backlog→unstarted→started→completed→cancelled, внутри — `sequence`). «На проверке» встанет после «В работе»,
  если это статус группы `started` с большим `sequence`. Для `group_by = "state_detail.group"` порядок тот же,
  но подписи англ. (`utils.tsx:258-271` `STATE_GROUPS[*].label`) → под флагом брать
  `t("workspace_projects.state.<key>")` (RU: «Бэклог/Не начато/В процессе/Завершено/Отменено» — не совпадает со
  словарём брифа «К работе/В работе/Готово/Отменена»).
- **Имена групп = имена статусов (данные)**. В существующих проектах они англ. (`Backlog/Todo/In Progress/Done/
  Cancelled`). Для РУ-вида без миграции — отображаемый алиас только для точных дефолтных имён
  (`STATE_GROUPS[group].defaultStateName === state.name` → «Бэклог/К работе/В работе/Готово/Отменена»), данные не
  трогать. → вопрос владельцу (иначе переименование статусов = изменение данных).
- **Свёрнутость групп НЕ на сервере**: `kanbanFilters.group_by` (id свёрнутых групп) читается/пишется в
  localStorage `issue_local_filters` (`store/issue/project/filter.store.ts:144-160` fetch, `:273-294` set;
  `store/issue/helpers/issue-filter-helper.store.ts:199-261`), общий для Доски и Списка. Серверные
  `display_filters` не участвуют.
  Рекомендация (без изменения сохранённых фильтров и без влияния на Доску): отдельный PPM-ключ localStorage,
  например `ppm_tasks_cancelled_expanded:<projectId>` через `getValueFromLocalStorage/setValueIntoLocalStorage`
  (`core/hooks/use-local-storage.tsx:9-28`, с try/catch). В `list-group.tsx:105`:
  ```tsx
  const isPpmCancelled = isPpmShell && (group_by === "state"
    ? projectState.getStateById(group.id)?.group === "cancelled"
    : group_by === "state_detail.group" && group.id === "cancelled");
  const isExpanded = isPpmCancelled ? ppmCancelledExpanded : !collapsedGroups?.group_by.includes(group.id);
  ```
  и в переключателе шапки для таких групп менять PPM-ключ вместо `handleCollapsedGroups`. Заодно drop в свёрнутую
  группу (`:234-236` раскрывает через `handleCollapsedGroups`) — учесть ту же ветку.
  «Отменена 0» видна, если `show_empty_groups = true` (серверный дефолт `True`, `db/models/issue.py:61-70`).
- **Группировка по статусам по умолчанию — это изменение сохраняемых фильтров.** Дефолт строки
  `ProjectUserProperty.display_filters` = `get_default_display_filters()` с `group_by: None`
  (`db/models/project.py:342-352`, `db/models/issue.py:61-70`); на клиенте `getComputedDisplayFilters` тоже
  `group_by: null` (`packages/utils/src/work-item/base.ts:270-287`). Варианты: (a) оставить как у пользователя +
  «Группировка: статус» в тулбаре; (b) PPM-дефолт `group_by: "state"` только для **новых** строк
  `ProjectUserProperty` (серверная правка, существующие не трогаются); (c) in-memory подмена в `fetchFilters`
  без записи — неотличима от явного «без группировки» без доп. маркера. → вопрос владельцу.

---

## 6. Кнопка «Новая задача  N / Т» и сочетание

### Где «создать» сейчас
- Одиночной «c» (и «n») **нет**. Создание задачи — последовательность **`ni`**:
  `core/components/power-k/config/creation/command.ts:67-78`
  ```ts
  create_work_item: { id: "create_work_item", type: "action", group: "create",
    i18n_title: "power_k.creation_actions.create_work_item", icon: LayersIcon,
    keySequence: "ni", action: () => toggleCreateIssueModal(true), … }
  ```
  Остальные создания тоже на `n`: `nd` страница (`:85`), `nv` фильтр задач (`:98`), `nc` спринт (`:113`),
  `nm` направление (`:126`), `np` проект (`:139`).
- Регистрация/обработка: `power-k/projects-app-provider.tsx:81` `<GlobalShortcutsProvider …/>` (смонтирован в
  `app/(all)/[workspaceSlug]/(projects)/layout.tsx:17`) → `power-k/global-shortcuts.tsx:41-80` (`registerMultiple`,
  `document.addEventListener("keydown", handler)`) → `power-k/core/shortcut-handler.ts`:
  `:35-42` `getShortcutKey` по `e.code` (волна 0; физическая `KeyN` = «Т» в ЙЦУКЕН — раскладка уже решена),
  `:148-174` `handleKeyOrSequence`: сначала полная последовательность, при длине 1 — одиночный `shortcut`, иначе
  ждём 1 с.
- **Конфликт**: одиночный `shortcut: "n"` (или `keySequence: "n"`) сработает на первом нажатии и сделает
  `ni/nd/nv/nc/nm/np` недостижимыми. В upstream сейчас нет ни одного одиночного ключа, совпадающего с префиксом
  последовательности (одиночные `s,p,a,i,l` — контекст задачи `ui/pages/context-based/work-item/commands.ts:214-384`,
  `m,s` — направление; префиксы последовательностей `g,o,n`).
- Холст перехватывает только `Shift+N/G/T` в capture на window (`ppm-canvas/workspace.tsx:286-302`) — голая `N`
  с ним не конфликтует.

### Варианты (рекомендация — А)
- **А. Отложенный одиночный ключ при неоднозначности (обратно совместимо).** В `ShortcutHandler`: если есть
  одиночная команда для ключа И этот ключ — префикс более длинной видимой `keySequence`, не исполнять сразу, а
  ставить pending на ~400 мс; следующая клавиша, завершающая последовательность, отменяет pending. Нужен метод
  реестра `hasKeySequencePrefix(ctx, prefix)` (`core/registry.ts` рядом с `findByKeySequence :124-127`). Без
  конфликтов (весь upstream сегодня) поведение побитово прежнее. Под флагом `create_work_item` получает
  `shortcut: "n"`, **`keySequence: "ni"` сохраняется** (иначе «n»→pending, «i» даёт несуществующую `ni` и
  pending отменится). Цена: модалка по `N` открывается через ~0,4 с. Тесты: расширить
  `apps/web/tests/power-k/shortcut-handler.test.ts` (там уже `vi.stubGlobal("window", { setTimeout, clearTimeout })`,
  нужен `vi.useFakeTimers()`): «N» → через задержку create; «N,I» → ровно один create; «N,D» → только page;
  «G,I» (без одиночной) — как раньше; KeyN/«т» в РУ-раскладке.
- Б. Страничный перехват только на «Задачах» (capture + `stopImmediatePropagation`, как Холст): мгновенно, но
  на этой странице умирают `ni/nd/nv/nc/nm/np`.
- В. Под флагом перенести прочие `n?`-создания на другой префикс — меняет привычные сочетания (против
  «не ломать»).

### Диф кнопки (`header.tsx:129-141`, под флагом)
```tsx
<Button variant="primary" size="lg" onClick={…} data-ph-element={…}
  {...(isPpmShell ? { "aria-keyshortcuts": "N", title: ppmT("tasks.new_task_hint") } : {})}>
  <div className="block sm:hidden">{t("issue.label", { count: 1 })}</div>
  <div className="hidden sm:block">{isPpmShell ? ppmT("tasks.new_task") : t("issue.add.label")}</div>
  {isPpmShell && (
    <span aria-hidden="true" className="hidden items-center gap-1 font-code text-11 sm:inline-flex">
      <kbd …>N</kbd>/<kbd …>Т</kbd>
    </span>
  )}
</Button>
```
Подсказку показывать только если сочетание реально работает (т.е. вместе с вариантом А/Б). Классы — только
семантические утилиты (аудит: `packages/ppm-brand/scripts/audit-tailwind-classes.mjs`, тема сбрасывает
`--color-*/--font-*/--text-*`; нет `font-mono`, `text-15`, `bg-red-500`). Цвет kbd на акцентной заливке —
`text-on-accent`-семейство волны 0 (`--txt-on-accent`), не `text-on-color`.

---

## 7. Строка/шапка группы/quick add — точки редизайна (под флагом)

- Плотность: `block.tsx:182` `min-h-11 … py-3` → PPM-ветка `min-h-[var(--ppm-row-height,2.75rem)] py-1`
  (фолбэк = upstream 44 px, если токена нет; токены `--ppm-row-height` 36/32 — область дизайн-системы, имя из
  HYBRID-BRIEF). То же для плейсхолдера `list-layout-loader.tsx:26` (`h-11`) — иначе прыжки виртуализации;
  шапки группы `list-group.tsx:267` (`py-1`) и `quick-add/button/list.tsx:19` (`py-3`).
- Выбранная (peek) строка: заменить невидимое `border-accent-strong` (`block.tsx:184`) на
  `bg-layer-transparent-selected` (+ тонкая акцентная метка слева); фокус остаётся кольцом волны 0
  (фокус ≠ выделение). Токены есть: `packages/tailwind-config/variables.css:225-240`.
- Моно-ID: обернуть `block.tsx:237` `<div className="flex-shrink-0 …">` классом `font-code` — кнопка
  `IdentifierText` (`issues/issue-detail/identifier-text.tsx:53-60`) наследует шрифт (preflight `font: inherit`),
  менять общий компонент не нужно.
- Шапка группы: `group-by-card.tsx:113-121` → `<button type="button" aria-expanded={isExpanded}>` (сейчас div
  без клавиатуры); РУ-строки для `:137,:144,:77-87` через `isPpmShell ? ppmT(…) : "<upstream>"` на той же строке
  (правило `english-leftovers.test.ts`). «All work items»/«None» — `utils.tsx:130,207,234,289,322` так же.
- Заголовок: `truncate` + Tooltip оставить; сужение `wdth` — только через container query/CSS (без JS-замеров
  в строках списка).
- Колонки/заголовки колонок (макет B) требуют grid в PPM-ветке строки вместо flex-wrap `all-properties.tsx:197-198`
  — крупнее; какие ячейки показывать, по-прежнему решают `displayProperties` пользователя (не переопределять,
  кроме скрытия attachment/link из §4.2).

## 8. Строки, тесты, команды

- Новые строки — в `packages/ppm-brand/src/index.ts` (`PPM_TRANSLATIONS.en` `:24-…`, `ru` `:821-…`; ключ-тип
  `TPpmTranslationKey = keyof en` `:1629`), напр. `tasks.new_task`, `tasks.new_task_hint`, `tasks.sprint.*`,
  `tasks.curator.*`, `tasks.evidence.*`, `tasks.group.all`. RU-строки проверяет
  `packages/ppm-brand/src/__tests__/i18n-overlay.test.ts:76-81` (запрет «цикл», «модул», «представлени»,
  «рабочий элемент»). В RU-оверлей (`locales/i18n-overlay.json`) новые ключи не класть — там разрешены только
  переопределения upstream-ключей (`:48-64`).
- Новая папка `apps/web/core/components/ppm-tasks/` автоматически попадёт в Tailwind-аудит (`/ppm-[^/]+/`,
  `audit-tailwind-classes.mjs:83-86`); добавить её в списки a11y-тестов:
  `apps/web/tests/ppm-a11y/min-font-size.test.ts:18` (массив папок), при необходимости `icon-button-names.test.ts:11-17`.
  Кастомные классы (`.ppm-task-*`) определять в файле из `customCssFiles` (`audit-tailwind-classes.mjs:26-33`),
  иначе — предупреждения аудита.
- Тесты (node, без DOM): `apps/web/tests/ppm-tasks/{sprint-scale,attention,evidence}.test.ts` для чистых
  хелперов `apps/web/helpers/ppm-tasks.helper.ts`; `tests/power-k/shortcut-handler.test.ts` — новые кейсы.
- Команды: `cd apps/web && node_modules/.bin/vitest run` (baseline 184/184); `pnpm --filter @ppm/brand test`
  (vitest + brand-аудит + tailwind-аудит); `cd apps/web && pnpm check:types`; `pnpm check:lint`
  (порог `--max-warnings=11957`); `oxfmt --check`; API (если §3B/§4.2): pytest контрактов
  `apps/api/plane/tests/contract/ppm_git/test_git_api.py`, новый тест активности (нужна БД, см.
  `apps/api/tests/RUNNING_TESTS.md`). Проверка флагов: `PPM_SHELL_ENABLED=0` и `PPM_BRAND_ENABLED=0` — разметка
  списка/шапки = upstream.

## 9. Доп. данные для колонки (если макет H покажет, как C)
- Распределение по статусам: при `group_by="state"` — `issues.getGroupIssueCount(stateId, undefined, false)`
  (серверные totals по группе, не зависят от пагинации); для спринта — `backlog/unstarted/started/completed/
  cancelled_issues` из `cycles/<id>/progress/` (`cycle/base.py:660-782`).
- «Направления» (как C): `useModule().getProjectModuleDetails(projectId)` — счётчики модулей уже в сторе
  (`ProjectAuthWrapper` грузит `fetchModulesSlim`+`fetchModules`), но только при `module_view` (дефолт False).

## 10. Риски
1. `IssueBlock` общий для всех list-корней (спринт, направление, фильтр задач, профиль, архив) — смена плотности/
   выделения видна везде; смоук всех этих страниц в обеих темах и обеих плотностях.
2. Виртуализация: плейсхолдер `h-11` (`list-layout-loader.tsx:26`) ≠ 36/32 px → «прыжки» при скролле, если не
   поменять вместе со строкой.
3. `extractRelationsFromIssues` **перезаписывает** `relationMap[issueId]` целиком: если запросить только
   `expand=issue_relation`, у этих задач пропадут обратные «blocking» до повторной загрузки peek. Либо
   `expand=issue_relation,issue_related`, либо не писать в общий стор (держать локально в хуке).
4. Сводки из `issueMap` (просрочено/последние изменения, вариант A) неполны при пагинации (50/группа, 100 без
   группировки) и сужены rich-фильтрами — колонку куратора кормить отдельным запросом (§3), а не списком.
5. Счётчики спринта из `fetchAllCycles` устаревают после правок в списке (SWR без ревалидации) — нужен
   `fetchActiveCycleProgress` в шкале.
6. «Сегодня»: `getDate` берёт локальную дату браузера, даты спринта — в TZ проекта; на стыке суток «день N»
   может отличаться на 1 от серверного `status="CURRENT"`.
7. Сочетание `N`: вариант А добавляет ~0,4 с задержки к `N`; неаккуратная реализация сломает `ni/nd/nv/nc/nm/np`
   (покрыть тестами). Вариант Б гасит все `n?` на странице Задач.
8. Скрытие `attachment_count/link` в PPM-ветке `IssueProperties` (их заменяет полоска) — пользователь, включивший
   эти свойства, увидит их в другом месте/формате; сохранённые настройки не меняются.
9. Два независимых «блока»: Plane `blocked_by` и смысловые рёбра Холста `blocks` — колонка покажет только первый.
10. Алиасы имён статусов (если одобрят) могут маскировать намеренно названный «Done»; только точные
    дефолтные имена + только под флагом.
11. Новые классы: только семантические утилиты темы (аудит валит `font-mono`, `text-15`, `bg-*-500`); текст ≥ 11 px
    (`tests/ppm-a11y/min-font-size.test.ts` — добавить `ppm-tasks`); `header.tsx` под brand-аудитом (без «plane»).
12. `peek` side-peek = 50 % ширины оверлеем — колонка куратора под ним скрывается; если владелец захочет
    «карточку выбранной задачи в той же колонке», это отдельная и крупная переделка peek (`view.tsx`).

## 11. Открытые вопросы владельцу
1. «Ждёт проверки»: эвристика по имени статуса группы `started` (/провер|review/), «PR открыт и не черновик», или
   настройка проекта? Скрывать секцию, если такого статуса нет?
2. «Последние изменения»: хватит «кто/когда обновил задачу» из загруженных данных (0 API) или одобрить крошечный
   read-only эндпоинт ленты `IssueActivity` проекта (§3, вариант B)?
3. Группировка по статусам по умолчанию: (a) не трогать, (b) PPM-дефолт `group_by:"state"` только для новых
   `ProjectUserProperty`, (c) иное? Сейчас большинство видит плоский список с «All work items».
4. Показывать ли англ. дефолтные статусы (`Backlog/Todo/In Progress/Done/Cancelled`) как «Бэклог/К работе/В работе/
   Готово/Отменена» (алиас отображения, без миграции данных)?
5. `N / Т`: принять задержку ~0,4 с (все `n?` сохраняются) или мгновенный перехват только на странице Задач?
6. Состояние PR в полоске: одобрить additive-поле `git_object {state, is_draft}` в `serialize_link` (+`select_related`)?
7. «Материалы» = вложения + ссылки задачи (Хранилище к задачам не привязано) — ок для волны 1?
8. Колонка куратора: показывать с ≥ 1440 px и прятать при открытом peek — ок?
9. Нужен ли отдельный флаг-рубильник редизайна Задач (напр. `PPM_TASKS_V1_ENABLED`) или достаточно
   `PPM_SHELL_ENABLED`?
