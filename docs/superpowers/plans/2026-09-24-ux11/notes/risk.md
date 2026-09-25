# Волна 1 — риски, тесты и выкатка (карта для плана)

Дата: 2026-09-24, 21:05–21:35. Режим: только чтение по `/Users/ermolov/Desktop/PPM`. Правок в репо, git-операций,
установок, сборок и рестартов dev-сервера не было. Панель браузера не использовалась.
Истина — текущее рабочее дерево `plane-fork` (волна 0 / UX0.2 применена, не закоммичена).
Сырые логи прогонов: `wave1/map/logs/risk-*.log`. Инструменты-заготовки: `wave1/map/risk-tools/`.

---

## 0. Коротко (что важно для плана)

1. **Новый флаг `PPM_DESIGN_V2`, а не `PPM_BRAND_ENABLED`.** Бренд — корень цепочки: `isPpmShellEnabled` требует бренд
   (`packages/ppm-brand/src/index.ts:1702-1704`), `isPpmCanvasEnabled` требует оболочку
   (`packages/ppm-canvas/src/index.ts:2066-2070`), а `route.tsx:43` при выключенном холсте уводит на «Задачи».
   Выключить облик волны 1 через бренд значит потерять русскую оболочку и Холст. Предлагается три значения:
   `0 | preview | 1`. Флаг действует только при включённом бренде и выставляет `html[data-ppm-design="v1|v2"]`.
2. **Мгновенный откат возможен только для того, что лежит под `[data-ppm-design="v2"]`.** Это токены, CSS холста
   и Tailwind-классы через `@custom-variant ppm-v2`. Новый DOM (шкала спринта, колонка куратора, строка статуса,
   слой смысловых связей) закрывается константой из того же резолвера, и для его отката нужна перезагрузка.
3. **Тесты, которые сломаются первыми, ищут правило по подстроке.** `canvas-css.test.ts:6-10` и `rail.test.ts:17`
   берут первое вхождение `"<селектор> {"`. Если правило `:where([data-ppm-design="v2"]) .ppm-canvas-shell {`
   окажется в файле выше базового, тест прочитает не тот блок. Так же `token-contract.test.ts:40-44` берёт
   первое правило с `[data-theme*="light"]`. Поэтому **до первой строки v2-CSS** нужно укрепить поиск в тестах
   (раздел 1.6) или вынести v2 в отдельный файл.
4. **Самый дорогой риск по производительности — плейсхолдеры виртуализации при новой плотности.** Строка списка
   сейчас `min-h-11` (44 px, `list/block.tsx:182`). Плейсхолдер жёсткий: `h-11` в `list-layout-loader.tsx:26`,
   высоты на десктопе не записываются (`shouldRecordHeights={isMobile}`, `block-root.tsx:143`). В таблице тот же
   жёсткий `calc(2.75rem - 1px)` (`spreadsheet/issue-row.tsx:99`). При строках 36/32 px без синхронной правки
   плейсхолдеров прокрутка больших списков будет прыгать.
5. **Холст: оверлей монтируется заново при каждой смене зависимости.** `InFrontOfTheCanvas` создаётся заново в
   `useMemo` с 46 зависимостями (`editor.tsx:1963-2070`). Среди них `syncStatus`, то есть каждое
   сохранение. Любое часто меняющееся значение новой строки статуса (масштаб, время) нельзя передавать через эти
   зависимости. Кроме того, редакторов одновременно смонтировано до 8 (`MAX_OPEN_CANVAS_BOARDS = 8`), и
   неактивные скрыты через `visibility:hidden`, а не `display:none`.
6. **Шрифты.** Ось `wdth` есть только в `wdth.css`/`standard.css` у `@fontsource-variable/ibm-plex-sans`. Сейчас
   импортируется `index.css`, где только `wght`. Файлы с `wdth` крупнее: latin 65 488 против 45 712 Б, cyrillic
   46 012 против 29 512 Б. Preload Inter (48 256 Б) при включённом бренде грузится впустую. Plex Mono подключён
   только с весом 400. tldraw 3.15.6 без `assetUrls` берёт свои шрифты с `cdn.tldraw.com`.
7. **Функциональные ловушки дизайна A.** Если убрать с живой карточки задачи на холсте нативные `<select>`
   статуса, приоритета и исполнителей (`shape.tsx:2058-2135`), пропадёт существующая функция («Правки вносятся в
   Задачах») и сломается e2e E2 (`selectOption` по `getByLabel("Статус")`). Строка «Версия 14» противоречит
   решению волны 0: тест `brand.test.ts:157-164` требует, чтобы ключ `canvas.board_version` не существовал.
8. **Регрессии нельзя автоматически сравнить по пикселям на страницах за логином без живого стека.** Предлагается
   три слоя: (а) headless system Chrome по публичным страницам: проверено, работает, детерминировано;
   (б) read-only замеры контроллера в его браузере без паролей и без экспорта cookie; (в) одноразовый docker-гейт,
   который запускает владелец, на синтетических аккаунтах. Для «Задач» в нём нет фикстуры.
9. **Базовые числа подтверждены прогоном 2026-09-24 21:10–21:20.** web vitest 30 файлов / 184, `@ppm/brand` 41,
   `@ppm/canvas` 38, корневой `npm test` 653, web tsc 0, canvas tsc ровно одна старая ошибка, oxlint 719/0,
   i18n 18×3837 (раздел 5).

---

## 1. Что фиксирует текущую разметку и визуал (и что придётся обновить)

### 1.1 Юнит-тесты `apps/web/tests` (vitest, env `node`, без DOM)

| Тест (строки) | Что закреплено | Когда сломается в волне 1 | Действие |
|---|---|---|---|
| `ppm-canvas/canvas-css.test.ts:6-10` | `ruleBody()` = **первое вхождение подстроки** `"${selector} {"` | v2-правило с тем же хвостом селектора выше базового (`… .ppm-canvas-shell {`) | Сначала якорить по началу строки (1.6, diff A) |
| `…/canvas-css.test.ts:18-21` | `.ppm-canvas-shell` = `background: var(--bg-surface-1);`, нет `--color-accent-primary-rgb` | Смена фона холста в базовом правиле, а не в v2 | Фон v2 менять только в v2-правиле |
| `…/canvas-css.test.ts:23-34` | Точные строки `font-family: var(--ppm-font-sans, var(--font-body, …))` в `.ppm-canvas-shell .tl-container`; `var(--ppm-font-mono, var(--font-code, …))` в `.ppm-canvas-diagram > textarea` и `.ppm-canvas-code__body`; нет `Inter` и `"SFMono-Regular", Consolas, monospace` | Смена стека шрифтов в базовых правилах | Шрифт v2 менять через токен `--ppm-font-*`, не в canvas.css |
| `…/canvas-css.test.ts:36-44` | Переменные tldraw `--color-primary/--color-selected/--color-selection-stroke: var(--border-accent-strong);`, `--color-selection-fill: color-mix(... 16%, transparent)` | Новый цвет выделения, вписанный прямо в `.tl-container` | Менять значение `--border-accent-strong` в v2-токенах |
| `…/canvas-css.test.ts:46-53` | `.ppm-canvas-workspace { … isolation: isolate`; нет `.ppm-canvas-topbar` и `.ppm-canvas-toolbar-button` | Возврат верхней панели инструментов на холст | Не возвращать; бриф её не требует |
| `ppm-canvas/rail.test.ts:6-8` | `CANVAS_RAIL_COLLAPSE_QUERY === "(max-width: 1279px)"` (`board-workspace-state.ts:8`) | Другой порог сворачивания рейки | Бриф («до ~1280 свёрнута, на 1440 развёрнута») совпадает; не менять |
| `…/rail.test.ts:10-21` | `font-size ≥ 0.6875rem` у `.ppm-canvas-rail__label` (canvas.css:2019), `.ppm-canvas-board-panel__list > small` (:2311), `.ppm-canvas-workspace__status` (:2142); поиск по подстроке `sel + " {"` | Мелкий кегль в новой строке статуса; v2-правило выше базового | Якорить (diff A); минимум 11 px |
| `ppm-a11y/min-font-size.test.ts:17-33` | В TSX `ppm-*` запрещены `text-9`, `text-10`, `text-[≤10px]`; в canvas.css `font-size` меньше 0.6875rem | Новые кегли в `px`/`var()`: тест их **не видит** (regex только `rem`) | Расширить проверку на `px` и на значения токенов (diff C) |
| `ppm-a11y/on-color-usage.test.ts:10-26` | В одном правиле canvas.css нельзя сочетать фон `--bg-accent-primary` и `color: var(--txt-on-color)`; `propel/button/helper.tsx`: `primary: "…text-on-accent`, `"error-fill": "…text-on-color` | Перекраска кнопок правкой helper-а | Кнопки v2 делать через токены; эти пары не трогать |
| `ppm-canvas/presence-contrast.test.ts:31-36` | Подпись курсора коллеги ≥ 4.5:1 против жёсткой тёмной туши `[14,15,18]` (#0e0f12) на всех 360° | Смена цвета подписи (`canvas.css:2740-2755` `color: #0e0f12`) на тёплый графит | Менять цвет вместе с константой теста |
| `ppm-canvas/sync-status.test.ts` | Блокирующие статусы, точка во вкладке, в футере нет повтора «только чтение» | Новая строка статуса «Лист · Версия · Сохранено · 12:41 · 100 %» | Логику `board-workspace-state.ts` переиспользовать, не переписывать |
| `ppm-canvas/shortcut.test.ts` | Подсказка `⌘K` / `Ctrl K`; кому принадлежит сочетание | — | Не менять |
| `ppm-canvas/brain-panel-mode.test.ts` | Порядок секций «Найти в проекте» | Перекомпоновка панели в v2 | Порядок сохранить |
| `navigation/navigation-accessibility.test.tsx:175-217` | Строки разметки: `aria-current="page"`, `focus-visible:outline-accent-strong`, `focus-visible:outline-offset-2`, `group-focus-within/menu-item:visible`, RU-ярлыки, combobox у `TopNavPowerK` | Рестайл пунктов навигации и поиска команд | Эти классы и атрибуты сохранить; v2-классы добавлять вариантом `ppm-v2:` |
| `navigation/top-navigation-gating.test.ts:13-24` | Точные выражения классов в `top-navigation-root.tsx` (`isPpmShell ? "hidden shrink-0 sm:block" : "shrink-0"`, `<IconButton className="sm:hidden"`, `"min-w-0 gap-1": isPpmShell`, `isPpmShell ? "min-w-0 flex-1" : "flex-1 shrink-0"`) | Верхняя панель 44–48 px | Не переписывать эти выражения; v2 через CSS или `ppm-v2:` |
| `navigation/project-navigation-items.test.ts:53-136` и `brand.test.ts:116-129` | Порядок ключей: overview, brain, work_items, views, cycles, modules, intake, knowledge, pages, code, settings; видимость по ролям | Группировка сайдбара (Работа / Знания). **В брифе нет «Заявок» (intake)** | Группировать без смены порядка; intake не убирать |
| `navigation/ppm-navigation.helper.test.ts` | Маршруты без шапки, где нужна кнопка разворота сайдбара | Новые маршруты без шапки | Дописать маршрут в хелпер и тест |
| `ppm-a11y/icon-button-names.test.ts:11-31` | `aria-label` у иконочных кнопок в 5 файлах, среди них `issues/issue-layouts/filters/header/layout-selection.tsx` (переключатель Список/Доска в «Задачах») | Рестайл шапки «Задач» | `aria-label` сохранить |
| `ppm-shell/english-leftovers.test.ts` | Шаблон `isPpmShell ? ppmT(…) : "<upstream>"` на одной строке в шапках Спринтов, Направлений, Фильтров, Документов, Архива, Черновиков | Правка этих шапок (крошки «ROBOT › Задачи») | Шаблон сохранить |
| `ppm-vault/tree-navigation.test.ts`, `ppm-shell/dialog-dismiss.test.ts` | Роли и поведение Хранилища и диалогов | Только токены | — |

В `packages/propel` и `packages/ui` юнит-тестов нет, только 45 `*.stories.tsx`. Сравнение скриншотов через
Storybook без сборки не получить, поэтому этот вариант отброшен.

### 1.2 Тесты пакетов

| Тест | Что закреплено | Действие |
|---|---|---|
| `ppm-brand/src/__tests__/brand.test.ts:167-188` | **Точные значения v1:** `PPM_BRAND.accentColor === "#22D3EE"`; `--ppm-color-accent: oklch(0.7971 0.1339 211.53)`; `--bg-accent-primary: var(--ppm-color-accent)`; `--ppm-color-canvas` тёмной `oklch(0.1687 0.0065 271.01)` и светлой `oklch(0.9545 0.0046 258.32)`; `--border-accent-strong: var(--ppm-color-selection)`; пары контраста `#062B32/#22D3EE` и другие | Если v2 **добавляется** рядом с v1, тесты зелёные. Если v2 **заменяет** v1, тесты придётся переписать, а откат флагом пропадёт. Рекомендуется добавлять |
| `brand.test.ts:142-165` | Плашка «Объектов: {count}» нейтральна к числу; **ключа `canvas.board_version` нет** («removes the unused canvas.board_version key») | «Версия 14» в строке статуса (из B) противоречит решению волны 0. Нужен новый ключ, например `canvas.status_version`, и решение владельца (открытый вопрос 1) |
| `brand.test.ts:18-28, 64-68` | Истинностные таблицы `isPpmBrandEnabled` и `isPpmShellEnabled` | Добавить таблицу для `resolvePpmDesign` (diff 4.2-b) |
| `ppm-brand/src/__tests__/token-contract.test.ts:35-44` | `findRule` берёт **первое** правило: light — с `[data-theme*="light"]` без `:is(`, dark — с `[data-theme*="dark"]`, bridge, borders `:not([data-theme$="-contrast"])`, константы `[data-ppm-brand="enabled"]` | v2-блоки ставить **после** v1 и параметризовать тест на v1 и v2 (diff B) |
| `token-contract.test.ts:106-150` | Для каждой темы: текст ≥ 4.5 на 12 поверхностях; чернила на акцентных заливках ≥ 4.5; `--txt-on-color` на красных заливках ≥ 4.5; границы `control/strong/emphasis` ≥ 3; различимость слоёв (1.07/1.1/1.25); фокус ≥ 3 и ≠ выделению; layer-2 не темнее layer-1; одинаковый набор ролей в обеих темах | Контракт обязателен и для v2: тёплый графит и «бумага и тушь». Прогнать тот же набор по v2 |
| `token-contract.test.ts:152-172` | Нет `--border-*` в ролях и bridge; нет `html[data-ppm-brand="enabled"][data-theme`; **все** `--bg-/--txt-/--border-/--neutral-` только под `data-ppm-brand="enabled"` | Каждый v2-селектор должен содержать `[data-ppm-brand="enabled"]` и оставаться (0,1,0) через `:where()` |
| `token-contract.test.ts:159-162, 174-193` | Кольцо фокуса в `@layer utilities`; переопределение шрифта редактора вне `@layer`, строки `--font-style: var(--ppm-font-sans)` и `font-family: var(--ppm-font-mono)` | Моно в v2 менять через значение `--ppm-font-mono`, не правкой этих правил |
| `i18n-overlay.test.ts` | В итоговом RU-интерфейсе нет «рабочий элемент», «цикл», «модул…», «представлени…», «Plane» | Новые строки (шкала спринта, куратор, строка статуса) заводить в `PPM_TRANSLATIONS` en+ru. **Нельзя добавлять ключи в `packages/i18n/src/locales/*`**: это ломает 18×3837 |
| `ppm-canvas/src/__tests__/canvas-node.test.ts` (38 тестов вместе с performance) | Схема данных нод: `visual.color ∈ {yellow,cyan,green,violet}`, ширина 160–1600, высота 96–1200 (`index.ts:70-78`), виды нод, миграции | **Не трогать.** Новые цвета типов и размеры только в CSS; существующие карточки должны влезать в сохранённые размеры (от 160×96) |

### 1.3 E2E-зацепки, которые нужно сохранить (`apps/web/e2e`, Playwright; без живого стека не запускаются)

**Холст** (collaboration 17 тестов, performance 2, auth-csrf 1; в строке README AF1.2 записано `19/19` на каждый
браузер Chrome/Firefox/WebKit, теперь тестов 20; перебазировать при первом прогоне):
- Классы и атрибуты: `.ppm-canvas-workspace` без `data-rail-expanded` на 320 px; `.ppm-canvas-workspace__header`
  (контролы в его границах на 320 px); `.ppm-canvas-board-switcher`; `.ppm-canvas-board-row__open`;
  `.ppm-canvas-command-trigger`; `.ppm-canvas-tabs__new`; `.ppm-canvas-tab` с кнопкой «Закрыть вкладку доски»;
  `.ppm-canvas-workspace__editor[data-active="true"] [role="application"]`;
  `.ppm-canvas-shell[data-ppm-canvas-mode="edit|read"]`; `.ppm-canvas-presence[data-status="online|offline"]`
  (текст «2»); `.ppm-canvas-status__notice[data-status=…]`. **Скрытый дубль уведомления** в футерной раскладке
  (`editor.tsx:2733-2739`, `.ppm-visually-hidden`) нужен тесту `performance.spec.ts:303-305`
  (`data-status="saved"`). Как «лишний» его не удалять.
- Роли и имена: main `/Холст проекта|Project canvas/`, application «tldraw», кнопки `/Добавить заметку ⇧N/`
  (около 13 мест). Имя складывается из `<span>` и `<kbd>` внутри flex-кнопки (`workspace.tsx:1486-1525`,
  `canvas.css:2036-2050 display:flex`). Если детей рейки сделать inline или убрать `kbd`, пропадёт пробел или
  «⇧N» в вычисленном имени, и e2e упадут. Также: «Найти команду холста», `/Найти в проекте|…/`, «Приблизить»,
  «Отдалить», диалоги «Доски», «Палитра команд холста», «Новая доска» с полем «Название доски», tablist
  «Открытые доски холста», «Восстановить черновик», «Проверить сохранение», «Скачать черновик», combobox
  «Выберите локальный черновик».
- Порядок кнопок: в предпросмотре импорта `preview.locator("button").first()` — это **подтверждение**
  (`performance.spec.ts:240, 291`). Если в v2 первой поставить «Отмена», импорт не выполнится.
- `#main-sidebar` с классом `w-0` на 320 px (`resizable-sidebar.tsx:189-193`).
- Axe WCAG 2.0/2.1/2.2 A/AA на `.ppm-canvas-workspace` при 1440 и 320 px: доска по умолчанию, переключатель
  досок, палитра команд (`collaboration.spec.ts:1026-1068`). Любой контраст v2 ниже нормы здесь упадёт.
- Сохранение идёт только по `store.listen(…, { scope: "document", source: "user" })` (`editor.tsx:728`). Поэтому
  панорама, масштаб и выделение при визуальной проверке **не создают версий доски**, а перетаскивание, ввод и
  инструменты создают.

**Демо-спек** `ppm-demo.spec.ts`: `html[data-ppm-brand="enabled"]`, `#email/#password`, «Продолжить»;
`.ppm-work-item-card` с `getByLabel("Статус")` и `selectOption` (нативный `<select>`, `shape.tsx:2071-2089`);
`.ppm-canvas-node--note input.ppm-canvas-node__title` и предок с классом `ppm-canvas-node`;
`[data-ppm-canvas-node-kind="vault_file_ref"]`; «Нарисовать визуальную связь»; «Убрать с холста»; видимый текст
**«Все изменения сохранены»** (`waitForCanvasVersion`, :148). Если строка статуса v2 покажет «Сохранено · 12:41»
вместо `canvas.sync_saved`, тест сломается. Страница `/about/brand-foundation` проверяется по заголовкам
«PPM brand foundation», «Light», «Graphite», по полям «Название проекта, тема …» и кнопке «Открыть Dialog»;
это пригодится, если страницу расширять под образцы v2.

**Задачи** (e2e нет вовсе). Поведение держится на DOM-атрибутах: `data-entity-id` и `data-entity-group-id`
(`entity-select-action.tsx:39-40`), по ним клавиатурный мультивыбор ищет элементы
(`use-multiple-select.ts:129-131`); `id="issue_${id}_${group}_${sub}"` (`utils.tsx:525`); `id="issue-${id}"` у
`ControlLink`; класс `highlight` (`HIGHLIGHT_CLASS`); цели DnD `dropTargetForElements` на блоке и группе;
`draggable` на строке. Автотестов на это нет, поэтому нужен ручной или контроллерный смоук (раздел 2.5).

### 1.4 Заранее устаревшие e2e-селекторы (не регрессии волны 1, не засчитывать)

- `ppm-demo.spec.ts:292`: main «Мозг проекта». Сейчас `brain.title` = «Холст проекта» (`route.tsx:56`, в
  pre-image волны 0 значение то же).
- `ppm-demo.spec.ts:295, 300`: «Добавить заметку» и «Добавить задачу» с `exact: true`. У развёрнутой рейки в
  имени есть «⇧N» и «⇧T».
- `ppm-demo.spec.ts:403-406`: ссылка «Добавить на холст «Мозг проекта»». Ключ `vault.add_to_canvas` нигде не
  используется, в Хранилище захардкожено «На холст «Мозг проекта»» (`ppm-vault/route.tsx:597`, старое имя
  «Мозг проекта» видно пользователю; см. раздел 6).
- `ppm-demo.spec.ts:433`: region «Индекс Мозга проекта». Ключ `brain_index.title` в `apps/web` не используется.
- В репо нет сид-команды демо ROBOT/BIO и кредов `PPM_DEMO_*`, поэтому спек локально не запускается.

### 1.5 Скриптовые гейты и дыры в их охвате

- `packages/ppm-brand/scripts/audit-tailwind-classes.mjs` (входит в `@ppm/brand test`) сканирует **только**
  каталоги `ppm-*` и 7 `extraFiles` (:16-24). CSS-классы берёт из 6 файлов `customCssFiles` (:26-33). Правки
  волны 1 в Plane-файлах (`issues/issue-layouts/list/*`, `ui/loader/layouts/list-layout-loader.tsx`, сайдбар,
  шапка «Задач») этот аудит **не видит**, и там может снова появиться «невидимый класс», найденный в волне 0.
  Каждый Plane-файл, который трогает волна 1, нужно добавить в `extraFiles`, а каждый новый CSS-файл (например
  `canvas-v2.css`) — в `customCssFiles`. Иначе BEM-классы v2 уйдут в «notes» или в violations.
- `audit-user-facing-brand.mjs` проверяет 24 файла, среди них `issues/header.tsx` (шапка «Задач»),
  `issues/peek-overview/properties.tsx`, `workspace/sidebar/projects-list.tsx`, `sidebar-menu-items.tsx`. Слово
  «Plane» туда добавлять нельзя.
- `packages/ppm-canvas/scripts/audit-browser-boundary.mjs`: изоляция 3 корней. Новые импорты в `@ppm/canvas`
  проверять им.
- i18n `sync-check --ci` (18×3837) и `check-overlay.ts` (OK). Новые строки добавлять только в
  `PPM_TRANSLATIONS` или в RU-оверлей.
- `oxfmt --check` на изменённых файлах. В волне 0 провал REG-1 был именно здесь. Запускать точечно, не по всему
  `apps/web`.

### 1.6 Минимальные правки тестов, которые стоит сделать до первой строки v2-CSS

**A. `apps/web/tests/ppm-canvas/canvas-css.test.ts:6-10`** (и то же для `rail.test.ts:17`): якорить по началу
строки, тогда v2-переопределения не перехватят поиск:
```ts
function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(^|\\n)${escaped} \\{`).exec(css);
  expect(match, selector).not.toBeNull();
  const start = match!.index;
  return css.slice(start, css.indexOf("}", start));
}
```
**B. `packages/ppm-brand/src/__tests__/token-contract.test.ts:40-44`**: исключить v2 из поиска v1 и прогнать тот
же `describe` по v2:
```ts
const isV2 = (s: string) => s.includes('data-ppm-design="v2"');
const pick = (v2: boolean) => ({
  light: findRule((s) => isV2(s) === v2 && s.includes('[data-theme*="light"]') && !s.includes(":is(")),
  dark: findRule((s) => isV2(s) === v2 && s.includes('[data-theme*="dark"]') && !s.includes(":is(")),
});
// describe.each([["v1", pick(false)], ["v2", pick(true)]])(…) — тот же набор контрактов 106-150
```
**C. `apps/web/tests/ppm-a11y/min-font-size.test.ts:31`**: проверять и `px` (меньше 11), и файл
`canvas-v2.css`, если он появится:
```ts
const small = [...css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)].filter(([, n, u]) => (u === "px" ? +n < 11 : +n < 0.6875));
```
**D. Новый страж** `apps/web/tests/ppm-design/v2-gating.test.ts`: каждый верхнеуровневый селектор в
`canvas-v2.css` начинается с `:where([data-ppm-design="v2"])`, каждое правило токенов v2 содержит
`[data-ppm-brand="enabled"]`, а плейсхолдер списка и строка списка берут высоту из одного токена
(`--ppm-row-height`).

---

## 2. Визуальная регрессия: что есть локально и как проверять безопасно

### 2.1 Что установлено (проверено скриптом `risk-tools/pw-smoke.mjs`)

| Инструмент | Статус |
|---|---|
| `@playwright/test` 1.63.0 (`apps/web` devDeps), `@axe-core/playwright` 4.13.0 | есть |
| System Google Chrome через `channel: "chrome"` | **работает**, 153.0.8010.53, headless |
| Встроенные WebKit 26.6 и Firefox 155.0 (`~/Library/Caches/ms-playwright`) | работают |
| Встроенный Chromium (`chromium_headless_shell-1243`) | **нет**. Нужен `channel: "chrome"`: это `PPM_E2E_BROWSER_CHANNEL=chrome`, по умолчанию так в `scripts/ppm-canvas-browser-gate.sh:105-111` |
| `playwright.config.*` | **нет**. Гейт передаёт спеки и флаги в CLI (`gate.sh:122-132`); без конфига эталоны `toHaveScreenshot` легли бы рядом со спеком в репо |
| Попиксельное сравнение без установки | `sharp@0.35.3` из pnpm-store `plane-fork`: проверено `risk-tools/sharp-diff-smoke.mjs`. `pixelmatch` и `pngjs` не установлены |
| `.gitignore` | `apps/web/test-results/` и `apps/web/playwright-report/` игнорируются. `test-results` Playwright **чистит при каждом прогоне**, эталоны там хранить нельзя |
| Детектор impeccable (`~/.claude/skills/impeccable/scripts/impeccable detect --json <url>`) | в волне 0 работал на публичных URL; на страницах за логином работал через `detect.js` в браузере контроллера |

### 2.2 Варианты

| Вариант | Логин | Что покрывает | Риски и ограничения |
|---|---|---|---|
| **A. Headless Chrome по публичным страницам** запущенного `:3000` (`/sign-in`, `/about/brand-foundation`, `/about/open-source`, `/about/ppm-guide`) | не нужен | Токены обеих тем, кнопки, поля, диалог, тосты Propel; после расширения страницы — образцы v2 (раздел 2.4) | Только GET; внешние запросы блокируются. Малая вероятность, что Vite доптимизирует зависимость и перезагрузит вкладки владельца (эти страницы уже открывались в discovery). Строк списка и холста здесь нет |
| **B. Браузер контроллера (владелец уже вошёл), только чтение** | используется существующая сессия | Реальные «Задачи» и «Холст» в обеих темах, плотностях и версиях дизайна: скриншоты глазами плюс JSON-замеры `risk-tools/probe-live.js` (высоты строк, шрифты, контраст < 4.5, текст < 12 px, горизонтальный overflow, наличие e2e-зацепок) | Нет PNG-файлов для diff, только сравнение глазами и числа. Вкладка должна быть на переднем плане (в скрытой IntersectionObserver и rAF стоят, строки остаются плейсхолдерами; отмечено в заметках волны 0). Не кликать и не нажимать клавиши после открытия оверлеев; `localStorage.theme`, `ppm_density`, `ppm_design` прочитать до проверки и вернуть после |
| **C. Одноразовый docker-гейт** `bash scripts/ppm-canvas-browser-gate.sh --browser-only chrome` (владелец запускает сам) | синтетические роли со случайными паролями, агенты креды не трогают | Существующие 20 e2e, Axe AA, 300 фигур и 5 вкладок; можно добавить `ppm-visual.spec.ts` с `toHaveScreenshot` | Docker, миграции, отдельный web на :3100, **dev-сервер владельца не трогается** (`gate.sh:92-94`). Сид `seed_ppm_canvas_browser_gate.py` не создаёт задачи и спринты, так что для «Задач» нужна новая синтетическая фикстура ROBOT (по `BRIEF.md`) только в одноразовой БД. `PPM_DESIGN_V2` нужно экспортировать в окружение гейта |
| **D. Макеты `.dc.html`** (headless Chrome, как у судьи) | не нужен | Сравнение «макет против реализации» | Макеты тянут Google Fonts; реальные страницы с ними не сравнишь попиксельно, только глазами |

**Запрещено:** вводить пароли, экспортировать cookie или `storageState` из сессии владельца в Playwright (это
передача токена сессии), сидировать что-либо в рабочую БД владельца, запускать второй dev-сервер Vite с общим
`node_modules/.vite` (оптимизатор зависимостей может перезагрузить вкладки владельца), рестартовать :3000.

### 2.3 Рекомендуемый протокол

1. **Эталон до первой правки волны 1** (вариант A): `BASE_URL=http://localhost:3000 DESIGNS=v1 node
   risk-tools/capture-matrix.mjs`. Скрипт снимает публичные маршруты в светлой и тёмной теме, в обеих плотностях
   атрибута (пока без эффекта), сохраняет PNG и `manifest.json` со шрифтами, атрибутами и overflow. Пропускает
   только GET и HEAD к `:3000` и к API `:8000` (`VITE_API_BASE_URL` в `apps/web/.env:1`); любую запись и любой
   внешний запрос обрывает. Самопроверка `--selftest` прошла и детерминирована.
2. **После каждой задачи волны 1** снять тот же набор с `DESIGNS=v1` и выполнить `node capture-matrix.mjs --diff
   <эталон> <новый>`. **При выключенном флаге ожидается `identical`.** Это автоматическое доказательство, что
   прежний вид при выключенном флаге не изменился. Отличия допустимы только от байтов шрифта, если сменить
   `index.css` на `wdth.css`; при `wdth=100` глифы те же, скриншот это покажет.
3. **Приёмка v2** (вариант B, контроллер): маршруты «Задачи» проекта 228 (список), «Холст» (активная доска),
   Обзор, сайдбар в развёрнутом и свёрнутом виде; матрица {светлая, тёмная} × {Удобная, Компактная} × {v1, v2}
   через `localStorage` и атрибуты. На каждую ячейку JSON `probe-live.js` и скриншот. Порог:
   `lowContrastCount = 0`, текст < 11 px отсутствует, `overflowX = false`, все зацепки из 1.3 на месте,
   высоты строк 36/32 px в v2 и 44 px в v1.
4. **По желанию владельца** (вариант C): гейт Chrome/Firefox/WebKit дважды, с `PPM_DESIGN_V2=0` и `=1`, плюс Axe.

### 2.4 Безопасная площадка без логина

`/about/brand-foundation` — публичный маршрут вне `(all)` (`app/routes/core.ts:19-21`), сейчас «I0.2 smoke». Если
добавить туда секцию или маршрут `/about/design-system` с образцами v2 (токены обеих тем; шкала для двух
плотностей; кнопки, поля, чипы; глифы статусов; строка задачи на тех же классах и токенах; карточки холста на
классах `.ppm-canvas-node*`; концы связей; строка статуса), варианту A будут доступны строки и карточки без
входа. Данные только синтетические. Заголовки и кнопки, которые проверяет e2e (1.3), сохранить.

### 2.5 Смоук «ничего не сломали» (руками или контроллером, без записи данных, кроме явно одобренных)

«Задачи»: перетаскивание внутри группы и между группами, мультивыбор (чекбокс и клавиатура), peek, инлайн-правка
свойств, быстрое добавление, «Показать ещё» в группе, раскрытие подзадач, свернуть и развернуть группу (хранится
локально), липкие заголовки групп, переключение Список/Доска/Таблица/Календарь/Гант. Тот же список компонентов
используют 6 корней: проектные задачи, спринт, направление, фильтр задач, архив, «Мои задачи» профиля
(`list/roots/*`).
Холст: каждый вид ноды, правка заметки, **инлайн-статус, приоритет, срок и исполнители на карточке задачи**,
«Убрать с холста», визуальная связь, панель смысловых связей, вкладки и клавиатура, диалоги досок, ⌘K, «Найти в
проекте» с сохранением на холст, импорт и экспорт, баннеры восстановления и конфликта, режим «только чтение»,
курсоры, рейка, масштаб, дроп файла.
Оболочка: сайдбар (свернуть, peek, узкий экран), навигация проекта, Power-K (`e.code`), верхняя панель < 640 px,
«Входящие», «Помощь», профиль, смена темы.
Флаги: `PPM_ANTYFLOW_SHELL_ENABLED=0` (минимальный холст, статус «card»), `PPM_PROJECT_ASK_ENABLED=1` (полная
панель), `PPM_SHELL_ENABLED=0` (upstream-разметка шапки), `PPM_BRAND_ENABLED=0` (v2 выключен полностью).

### 2.6 Заготовки инструментов (scratchpad, в репо не класть)

`wave1/map/risk-tools/`:
- `pw-smoke.mjs` — проверка запуска Chrome, WebKit, Firefox и Chromium; результат в 2.1.
- `capture-matrix.mjs` — матрица маршрутов × тем × плотностей × версий дизайна, `--diff` на `sharp`,
  `--selftest` без приложения. Прогнан: высоты строк 45/37/33 для v1 / Удобная / Компактная в тестовой странице,
  два прогона `identical`.
- `probe-live.js` — read-only JSON-замер для `javascript_tool` контроллера. Самопроверка `probe-selftest.mjs`
  прошла.
- `sharp-diff-smoke.mjs` — проверка, что `sharp` из pnpm-store подключается и сравнивает пиксели.

---

## 3. Риски производительности

### 3.1 Плотность и виртуализация списка (высокий)

- Строка: `block.tsx:182` задаёт `min-h-11 … py-3 text-13` и `flex-col` плюс `md:flex-row`/`lg:flex-row`: на
  узкой ширине строка многострочная, высота не фиксирована.
- Виртуализация: `block-root.tsx:136-143` — `RenderIfVisible verticalOffset={100}`, плейсхолдер
  `ListLoaderItemRow`, `shouldRecordHeights={isMobile}`. На десктопе высоту **не запоминает**, плейсхолдер
  всегда `h-11` (`list-layout-loader.tsx:26`). `render-if-visible-HOC.tsx:82-96`: высота замеряется только при
  `shouldRecordHeights`.
- Таблица: `spreadsheet/issue-row.tsx:92-108` — инлайн `height: calc(2.75rem - 1px)`,
  `shouldRecordHeights={false}`; ячейка `h-11` (:275). Канбан: `kanban/block.tsx:276 defaultHeight="100px"`.
- **Последствие:** при строке 36 или 32 px и плейсхолдере 44 px каждая строка, уходящая за полосу ±100 %
  вьюпорта, меняет высоту на 8–12 px. Прокрутка прыгает, ползунок «дышит», сбивается автопрокрутка к активной
  строке (`use-multiple-select.ts:129-140`).
- **Решение:** строка и плейсхолдер берут высоту из одного токена: `min-h-11 ppm-v2:min-h-[var(--ppm-row-height)]`
  в строке, `h-11 ppm-v2:h-[var(--ppm-row-height)]` в `ListLoaderItemRow`, а в таблице
  `calc(var(--ppm-row-height, 2.75rem) - 1px)`, где в v1 токен равен 2.75rem. Не масштабировать плотность через
  `font-size` у `html`: все Plane-отступы в rem, поплывёт весь интерфейс.

### 3.2 Больше смонтированных строк (средний)

Полоса наблюдения примерно в 3 высоты вьюпорта (rootMargin 100 %). При видимой области около 800 px выходит
около 55 строк при 44 px, около 67 при 36 px (+22 %) и около 75 при 32 px (+36 %). В каждой строке
`IssueProperties` с набором выпадающих списков. Пагинация прежняя (`perPageCount: group_by ? 50 : 100`,
`base-list-root.tsx:88-90`). Не добавлять в строку новые тяжёлые узлы (тултипы, аватары, «полоски
доказательств») сверх текущих; новые элементы — через CSS или один лёгкий глиф.

### 3.3 Оверлей холста перемонтируется (высокий для новой строки статуса и слоя связей)

- `editor.tsx:1963-2070`: `components.InFrontOfTheCanvas` — новая стрелочная функция при каждой смене любой из
  46 зависимостей: `syncStatus`, `semanticEdges`, `boardInfoOpen`, `mergePreview` и других. React
  получает **новый тип** компонента и перемонтирует весь `CanvasControls`: баннеры, пилюлю «Доска», панель
  связей. Комментарий `editor.tsx:1944-1946` это подтверждает.
- **Правило для волны 1:** ничего быстро меняющегося в эти зависимости. Строку статуса («Лист 2 из 3 · Версия 14
  · Сохранено · 12:41 · 100 %») рисовать в футере `workspace.tsx:1060-1066`, вне tldraw. Масштаб брать листовым
  компонентом через `useValue(() => editor.getZoomLevel())` у активного редактора (реестр редакторов по
  `boardId`), **не поднимать в состояние workspace**: иначе каждый шаг зума перерисует шапку, рейку из примерно
  20 кнопок и обёртки всех редакторов.
- Смонтировано **до 8 редакторов** (`board-workspace-state.ts:3`), неактивные скрыты через `visibility:hidden`
  (`canvas.css:2130-2140`), а не `display:none`. Смена `data-theme`, `data-ppm-design`, `data-ppm-density` и
  подмена шрифта пересчитывают стили и раскладку DOM **всех** открытых досок (до 8×300 HTML-фигур). Таймеры на
  каждый редактор (часы «12:41», «обновлена N минут назад») недопустимы; нужен максимум один таймер на
  workspace. Уже есть опрос задач раз в 30 с на каждый редактор (`editor.tsx:1069`); новых опросов не добавлять.

### 3.4 Смысловые связи на холсте (средний, новый слой)

Сейчас смысловые связи только в панели (`SemanticEdgesPanel`, `editor.tsx:3073+`); на холсте рисуются только
визуальные стрелки tldraw. Для концов по типу (⊣ «Блокирует», пунктир «Противоречит», стрелка
«Зависит/Реализует») и подписей на линии:
- **Не создавать стрелки tldraw.** Это запись в документ доски: новые версии, синхронизация соавторам, после
  отката стрелки останутся в данных.
- Рисовать SVG в слоте `OnTheCanvas` (есть в tldraw 3.15.6). Координаты страничные, камеру применяет сам tldraw,
  пересчёт нужен только при смене границ связанных фигур (`useValue` по `getShapePageBounds`). Рёбра подавать
  через контекст, как `PpmWorkItemProjectionContext`, а не через зависимости `components`.
- Не рисовать рёбра вне вьюпорта; подписи без собственного `useValue` на каждую.

### 3.5 Стиль карточек на 300 фигурах (средний)

- В брифе тени только у всплывающих элементов, и для зума это хорошо: без `backdrop-filter`, `filter` и больших
  размытых `box-shadow` на нодах.
- tldraw ставит `--tl-zoom` на контейнер при каждом шаге зума (`useZoomCss.mjs:10`). Правила вида
  `calc(1px / var(--tl-zoom))` на каждой ноде дают пересчёт стилей 300 нод на кадр. Угловые засечки делать
  псевдоэлементами в страничном масштабе.
- «Сначала сужается (`wdth`), потом многоточие» не делать замером в JS (ResizeObserver на каждый заголовок при
  зуме — это layout thrash). Вариант: `line-clamp: 2` плюс `font-stretch: 87.5%` по эвристике длины строки при
  рендере.
- Уровень детализации (скрывать тело при малом зуме) через **одну** подписку на уровне
  `.ppm-canvas-shell[data-zoom-band]`, не `useValue` в каждой фигуре.
- Существующие карточки хранят размеры в данных (от 160×96). Новая типографика 14 px и две строки заголовка
  должны в них помещаться, иначе контент обрежется.

### 3.6 Шрифты (средний)

- `root.tsx:38` импортирует `@fontsource-variable/ibm-plex-sans` (`index.css`, только `wght`, без
  `font-stretch`). Сужение **не заработает**, пока не подключить `wdth.css` или `standard.css` (`font-stretch:
  75% 100%`; метаданные: `wdth` 75–100).
- Не подключать `index.css` и `wdth.css` одновременно: у обоих одно семейство «IBM Plex Sans Variable». Для
  ширины 100 % выиграет последний объявленный набор, для 85 % второй, и браузер скачает оба комплекта.
  Рекомендация: **заменить** импорт на `/wdth.css`. Для v1 это лишние около 36 КБ (latin +19,8 КБ, cyrillic
  +16,5 КБ) при первом визите; `font-stretch` в коде нигде не используется, поэтому вид не меняется. Проверяется
  пиксельным diff из 2.3.
- `root.tsx:72-78` делает preload Inter latin (48 256 Б) даже при включённом бренде, где UI на Plex: загрузка
  впустую (находка discovery). Предлагается preload `ibm-plex-sans-cyrillic-wdth-normal.woff2` и
  `…-latin-wdth-normal.woff2` при бренде и Inter только при `!IS_PPM_BRAND_ENABLED`.
- `@fontsource/ibm-plex-mono` (5.2.7) в `index.css` содержит только вес 400. Если v2 даёт моно 500 или 600
  (ROBOT-12, строка статуса), нужен `…/500.css` (latin около 15 КБ, cyrillic около 8 КБ), иначе браузер
  синтезирует жирное начертание.
- `font-display: swap` означает мигание начертания и сдвиг раскладки в строках и карточках. Нативный текст tldraw
  (подписи стрелок, text-фигуры) измеряется при рендере и после подмены шрифта может остаться с кривой рамкой.
- **tldraw без `assetUrls`** (`editor.tsx:2123-2130`) грузит свои шрифты с `cdn.tldraw.com/3.15.6/fonts/*`:
  Plex Sans/Mono/Serif и Shantell Sans (`tldraw/…/static-assets/assetUrls.mjs:3-22`). Это внешний запрос,
  который не работает офлайн и спорит с правилом «исходящие только к настроенным провайдерам». Если подписи связей
  делать нативными стрелками, запросов станет больше. Можно задать `assetUrls.fonts` на локальные файлы
  fontsource (открытый вопрос 5).

### 3.7 Данные для «Задач» (средний)

- Шкала спринта не требует новых запросов: все спринты грузит `project-wrapper.tsx:130`.
- Колонка куратора: «Просрочено» из уже загруженных задач, но это только первая страница каждой группы (до 50),
  так что цифры будут неполными. «Заблокировано» потребовало бы связей по каждой задаче (N+1 запросов), чего
  делать нельзя. «Ждёт проверки» зависит от статуса, которого по умолчанию в Plane нет, выдумывать нельзя.
  «Последние изменения»: ленты проекта в CE нет, можно взять `updated_at` загруженных задач. Решение владельца
  (открытый вопрос 3).
- Группа «Отменена» свёрнута по умолчанию: свёрнутые группы хранятся **локально**
  (`project/filter.store.ts:144-158, 273-284`, ключ `kanban_filters`), а не на сервере. Умолчание применять только
  когда сохранённого значения нет и только в v2. `display_filters` (группировка, порядок, пустые группы)
  **серверные** (`updateProjectUserProperties`), их не трогать.

### 3.8 Риски процесса разработки

- Владелец работает в приложении на :3000, HMR живой. Правка `vite.config.ts` перезапускает сервер Vite
  изнутри и перезагружает все вкладки; правка `root.tsx` тоже даёт полную перезагрузку. Незасохранённый Markdown
  в Хранилище может пропасть; черновики холста восстанавливаются. Такие правки собирать в одну и предупреждать
  владельца.
- Пересборка `@ppm/brand`/`@ppm/canvas` (`tsdown --no-clean`) при работающем Vite давала кратковременные 500 в
  волне 0 (задача 9). Пересобирать один раз на задачу.
- `.env` не перечитывается при перезапуске конфига (`dotenv` не перезаписывает ключи), поэтому смена
  `PPM_DESIGN_V2` в `.env` требует ручного рестарта. Это действие владельца; агенты сервер не рестартуют.

---

## 4. Стратегия флагов

### 4.1 Решение

| | `PPM_BRAND_ENABLED` (переиспользовать) | **`PPM_DESIGN_V2` (новый)** |
|---|---|---|
| Выключение | Выключает оболочку, RU и Холст (`route.tsx:39-43`) | Возвращает вид волны 0, остальное работает |
| Данные | — | Не трогает: только атрибуты и localStorage |
| Итог | ✗ | ✓ |

Значения `PPM_DESIGN_V2`:
- `0` — только v1.
- `preview` — по умолчанию v1, v2 включается в конкретном браузере через `localStorage["ppm_design"]="v2"`.
- `1` — по умолчанию v2, в конкретном браузере можно вернуть v1 через `localStorage["ppm_design"]="v1"`.

При `PPM_BRAND_ENABLED=0` всегда v1. TSX в оболочке (сайдбар, верхняя панель) дополнительно требует
`isPpmShell`, чтобы при `PPM_SHELL_ENABLED=0` оставалась upstream-разметка: это требует
`top-navigation-gating.test.ts`.

Выкатка: на время реализации значение по умолчанию `preview`, так что владелец продолжает работать в привычном
виде, а контроллер включает v2 у себя. После приёмки поставить `1` (одна строка в `vite.config.ts`) и
перезапустить сервер руками.

### 4.2 Куда проходит флаг: точные места и минимальные diff

a) `apps/web/vite.config.ts:16-20` (define `process.env`):
```ts
viteEnv.PPM_DESIGN_V2 = process.env.PPM_DESIGN_V2 ?? "preview";
```
b) `packages/ppm-brand/src/index.ts` после `:1704` (плюс пересборка dist: `cd packages/ppm-brand &&
./node_modules/.bin/tsdown --no-clean`):
```ts
export type TPpmDesign = "v1" | "v2";
export type TPpmDensity = "comfortable" | "compact";
export const PPM_DESIGN_STORAGE_KEY = "ppm_design";
export const PPM_DENSITY_STORAGE_KEY = "ppm_density";

/** Wave 1 look (hybrid A+B): "0" off, "preview" off with a per-browser opt-in, "1" on with a per-browser opt-out. */
export function resolvePpmDesign(flag: string | undefined, brandValue: string | undefined, override?: string | null): TPpmDesign {
  if (!isPpmBrandEnabled(brandValue)) return "v1";
  const mode = flag?.trim().toLowerCase() ?? "0";
  const allowOverride = mode === "preview" || mode === "1" || mode === "true";
  if (allowOverride && (override === "v1" || override === "v2")) return override;
  return mode === "1" || mode === "true" ? "v2" : "v1";
}
export const resolvePpmDensity = (value: string | null | undefined): TPpmDensity =>
  value === "compact" ? "compact" : "comfortable";
```
Тесты: `brand.test.ts` — таблица: бренд выключен → v1 при любых значениях; `0` игнорирует override;
`preview` → v1, `preview`+`v2` → v2; `1` → v2, `1`+`v1` → v1; мусор в override игнорируется.

c) `turbo.json:9-13` (`globalEnv`): добавить `"PPM_DESIGN_V2"`. Без этого turbo не передаст переменную и не учтёт
её в кэше.

d) `apps/web/.env.example:14-18`: добавить
```
# Облик волны 1 (гибрид A+B): 0 — прежний вид, preview — прежний вид с личным включением (localStorage ppm_design=v2), 1 — новый вид.
PPM_DESIGN_V2="preview"
```
e) `apps/web/app/root.tsx`:
- `:46-47`: `const PPM_DESIGN = resolvePpmDesign(process.env.PPM_DESIGN_V2, process.env.PPM_BRAND_ENABLED);`
- `:86-91`: `<html … data-ppm-design={PPM_DESIGN} data-ppm-density="comfortable">`
- В `<head>` перед `<Meta />` добавить скрипт до первой отрисовки, как у next-themes. CSP нет:
  `apps/web/nginx/nginx.conf:24-27` ставит только XFO, nosniff, HSTS, XSS. Скрипт читает `ppm_design` и
  `ppm_density` из localStorage в `try/catch` и выставляет атрибуты по тем же правилам, что
  `resolvePpmDesign`; значения флага вшиваются строкой при сборке. `<html suppressHydrationWarning>` уже есть,
  атрибут из скрипта гидрация не перетрёт.
- `:109-112`: `defaultTheme={IS_PPM_BRAND_ENABLED ? (PPM_DESIGN === "v2" ? "system" : "dark") : "system"}`.
  Это влияет только на браузеры без `localStorage.theme` и профили без темы: `profile.theme` по умолчанию `{}`
  (`apps/api/plane/db/models/user.py:227`), а `store-wrapper.tsx:56-76` применяет тему профиля один раз.
  Override не учитывается: тема по умолчанию берётся из build-флага. Если нужен «system» и при override,
  ThemeProvider должен читать тот же резолвер на клиенте.
- `:34-44` и `:72-78`: `@fontsource-variable/ibm-plex-sans/wdth.css` вместо `index.css`; preload Plex (cyrillic и
  latin wdth) при бренде, Inter только без бренда (3.6).

f) Для TSX один источник: `getPpmDesign()` в `apps/web/core/components/ppm-shell/` читает
`document.documentElement.dataset.ppmDesign` (уже выставлен скриптом) и падает на build-значение. Это не
`process.env` напрямую, иначе при `preview` TSX и CSS разойдутся.

g) Docker: `apps/web/Dockerfile.web:46-68` не пробрасывает ни одного `PPM_*` (отложено в волне 0), так что в
образе всегда значение по умолчанию из `vite.config.ts`. Гейт-workflow
`.github/workflows/ppm-canvas-browser-gate.yml`: матрица `PPM_DESIGN_V2: [0, 1]`, по желанию.

### 4.3 Что закрывается атрибутом (мгновенный откат), а что константой (откат перезагрузкой)

**Атрибут `[data-ppm-design="v2"]`, только CSS:**
1. `packages/ppm-brand/src/tokens.css`. Новые блоки **после** v1 с тем же выравниванием специфичности (0,1,0)
   (шапка файла :8-13):
   `:where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]` для светлой темы,
   `:where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]:where([data-theme*="dark"])` для тёмной,
   `:where([data-ppm-brand="enabled"][data-ppm-design="v2"]) [data-theme*="light|dark"]` для локальных тем
   (секции `ThemeSmoke`). Отдельный блок границ `:not([data-theme$="-contrast"])` для v2, чтобы не ломать
   high-contrast темы Plane. В v2: роли тёплого графита и «бумаги и туши», спокойный циан и его ступени
   (пересчитать `--brand-100…1200`: сейчас это точная шкала Tailwind cyan, `tokens.css:97-108`), радиусы
   4/6/8/12, тени только у поповеров, `--ppm-font-mono: "IBM Plex Mono", …` (он уже импортирован,
   `root.tsx:44`; в Plane `--font-code` и так Plex Mono), токены плотности.
2. Плотность: `:where(html[data-ppm-design="v2"])[data-ppm-density="compact"]` задаёт `--ppm-row-height: 2rem`,
   `--ppm-text-body: 0.8125rem` и прочее. Специфичность должна быть (0,1,0), блок ставится после блока
   «Удобной». Если завернуть в `:where()` весь селектор, получится (0,0,0), и «Компактная» проиграет блоку v2
   (0,1,0) независимо от порядка. В Удобной: 2.25rem и 0.875rem. **В v1 те же токены объявить со значениями
   v1** (2.75rem), чтобы TSX мог потреблять их без ветвления. Токены плотности без префиксов `--bg-`, `--txt-`,
   `--border-`, `--neutral-` не подпадают под требование контракта о шлюзе через бренд, но держать их всё равно
   стоит под `[data-ppm-brand="enabled"]`.
3. Tailwind-варианты в `tokens.css` (он идёт через тот же конвейер `@tailwindcss/postcss`, что и `dark` в
   `tailwind-config/variables.css:1`):
   ```css
   @custom-variant ppm-v2 (&:where([data-ppm-design="v2"], [data-ppm-design="v2"] *));
   @custom-variant ppm-compact (&:where([data-ppm-design="v2"][data-ppm-density="compact"] *));
   ```
   В TSX пишется `className="min-h-11 py-3 text-13 ppm-v2:min-h-[var(--ppm-row-height)] ppm-v2:py-0"`: v1 без
   изменений, v2 включается атрибутом. Аудит классов загружает дизайн-систему из `globals.css` вместе с
   импортом `tokens.css`, так что варианты он увидит.
   **Ловушка `cn()`** (`packages/utils/src/common.ts:14-68`, её же нашёл `infra.md` §0.3). В `twMerge` у Plane
   любой `text-*`, кроме типографских токенов, попадает в группу `custom-typography`. Поэтому
   `text-[length:var(--x)]` и `text-secondary` с одинаковым набором вариантов конфликтуют, и размер теряется.
   Кегль по плотности делать через `@utility ppm-text-*` или CSS-класс, а не через `text-[…]`. Высоты и
   отступы (`min-h-*`, `h-*`, `py-*`) `cn()` сливает корректно.
4. Холст: отдельный `apps/web/core/components/ppm-canvas/canvas-v2.css`, импортируется рядом с
   `editor.tsx:134`, все селекторы с префиксом `:where([data-ppm-design="v2"])` (специфичность как у базовых,
   выигрывает порядком). Сюда: хром нод, радиусы, типографика, угловые засечки (`::before`/`::after`), срезанный
   угол решения (`clip-path`), вкладки, рейка, внешний вид строки статуса, фокус ≠ выделение. Файл добавить в
   `customCssFiles` аудита. Базовый `canvas.css` не трогать, тогда 1.1 и 1.6-A не страдают. Специфичность
   переопределения должна совпадать с базовым правилом, а префикс шлюза оставаться внутри `:where()`. Пример:
   `[data-theme*="dark"] .ppm-canvas-shell` имеет (0,2,0) (`canvas.css:2688`), поэтому для v2 нужно
   `:where([data-ppm-design="v2"])[data-theme*="dark"] .ppm-canvas-shell`, а не только `… .ppm-canvas-shell`.
   Это составной селектор без пробела: оба атрибута стоят на одном `<html>`, и потомковый вариант
   `:where([data-ppm-design="v2"]) [data-theme*="dark"]` ничего не найдёт.
   CSS-чанк холста грузится лениво, и порядок `canvas.css` → `canvas-v2.css` держится порядком импортов в
   `editor.tsx`.
5. Цвета нод и статусов на холсте: перепривязка `--ppm-canvas-node-*` (`canvas.css:2674-2696`) в v2-правилах.
   Данные `visual.color` те же.

**Константа `getPpmDesign() === "v2"` (новый DOM, откат перезагрузкой):**
- «Задачи»: шкала спринта в шапке, колонка куратора (раздел 3.7), заголовки колонок, свёрнутая «Отменена» как
  умолчание, подсказка клавиш в основной кнопке («Новая задача N / Т», `e.code`), тон пустых состояний (строки
  в `PPM_TRANSLATIONS`).
- Холст: строка статуса (3.3), слой смысловых связей в `OnTheCanvas` (3.4), тело карточки «Найдено поиском»
  (только из **существующих** полей ноды; новое поле означало бы изменение данных).
- Оболочка (плюс `isPpmShell`): заголовки групп сайдбара (секции уже есть:
  `project-navigation.tsx:62-158 ppmSection`), кнопка «Новая задача» в сайдбаре, переключатель плотности в
  профиле: `settings/profile/content/pages/preferences/default-list.tsx`, рядом с `ThemeSwitcher`.
- Всегда вне флага: сохранять классы, атрибуты, роли и имена из 1.3. Инлайн-`<select>` на карточке задачи не
  удалять (см. 0.7).

### 4.4 Хранение предпочтений: без серверных данных

| Что | Где | Почему |
|---|---|---|
| Облик v1/v2 (override) | `localStorage["ppm_design"]` | Только в этом браузере; v1 ключ игнорирует |
| Плотность | `localStorage["ppm_density"]` | `profile.theme` — JSONField на сервере. Запись туда `ppm_density` (так предлагает `infra.md` §0.2) меняет данные. `updateUserTheme` (`store/user/profile.store.ts:243-255`) сливает ключ в объект темы в памяти и отправляет PATCH со **всем** объектом `theme`: если записать до загрузки профиля, серверные `primary`, `background` и `darkPalette` затрутся значениями по умолчанию. Переключатель темы после записи ещё и перезагружает страницу (`theme-switcher.tsx:43-72`). Минус локального хранения: плотность не переезжает между устройствами. Решает владелец (открытый вопрос 4). Имя ключа — с подчёркиванием, как `app_sidebar_collapsed` и как в `infra.md` |
| Тема по умолчанию | `defaultTheme` next-themes | Уже существующий механизм; выбор темы в профиле работает как прежде |
| Свёрнутые группы | существующий локальный `kanban_filters` | Без изменений |

Проверка «данные не тронуты»: при переключении v1/v2 вкладка Network не показывает запросов записи (POST, PATCH,
PUT, DELETE), номер версии доски (`version` в ответе `…/canvas/boards/<id>/`) не растёт, `profile.theme` не
меняется.

### 4.5 Уровни отката

1. **Мгновенно, в одном браузере:** `localStorage["ppm_design"]="v1"` и перезагрузка. CSS-часть можно
   переключить и без перезагрузки, сменой атрибута.
2. **Глобально:** `PPM_DESIGN_V2=0` в `apps/web/.env` и ручной рестарт (владелец). Для Docker — пересборка
   образа со значением по умолчанию.
3. **По файлу:** как в волне 0. Завести `docs/superpowers/plans/<дата>-wave1/tools/{w1-pre.sh,w1-diff.sh}`
   (копии `ux02-pre.sh`/`ux02-diff.sh` с новым путём `PRE`) и снимать pre-image **до первой правки** каждого
   файла. База — текущее рабочее дерево с незакоммиченной волной 0. Pre-images волны 0 (`…/2026-09-24-ux02/pre/`,
   164 файла) фиксируют состояние **до** UX0.2; для отката волны 1 они не подходят.
4. Миграций нет ни в одну сторону: ключи localStorage v1 не читает.

---

## 5. Базовые числа (не ухудшать)

Свежий прогон 2026-09-24 21:10–21:20, только чтение (`--tsBuildInfoFile` вне репо). Логи в `wave1/map/logs/risk-*`.

| Проверка | Команда (cwd) | Результат сейчас | CHANGELOG волны 0 / final-checks |
|---|---|---|---|
| web vitest | `plane-fork/apps/web`: `./node_modules/.bin/vitest run` | **30 файлов / 184 passed**, 1,73 с | 184/184 ✓ (до волны 0: 15 файлов / 97) |
| `@ppm/brand` vitest | `plane-fork/packages/ppm-brand`: `./node_modules/.bin/vitest run` | **3 файла / 41 passed** | 41/41 ✓ (до волны 0: 19) |
| brand audit | `node scripts/audit-user-facing-brand.mjs` | passed, **24 surfaces** | ✓ |
| Tailwind audit | `node scripts/audit-tailwind-classes.mjs` | passed, **30 files** (плюс заметки о BEM без CSS, например `ppm-canvas-node__vault-*` в `shape.tsx:2210-2224`) | ✓ |
| brand tsc | `./node_modules/.bin/tsc --noEmit --tsBuildInfoFile <scratch>` | **0** | ✓ |
| `@ppm/canvas` vitest | `plane-fork/packages/ppm-canvas`: `./node_modules/.bin/vitest run` | **2 файла / 38 passed** | 38/38 ✓ |
| canvas boundary audit | `node scripts/audit-browser-boundary.mjs` | passed, **3 isolated roots** | ✓ |
| canvas tsc | `tsc --noEmit --tsBuildInfoFile <scratch>` | **ровно 1** старая ошибка `src/index.ts(1803,7) TS2322` | та же ✓ |
| web tsc | `tsc --noEmit -p tsconfig.json --tsBuildInfoFile <scratch>` | **0**, около 16 с | 0 ✓ |
| web oxlint | `../../node_modules/.bin/oxlint --max-warnings=11957 .` | **719 warnings / 0 errors** (1958 файлов) | 719/0 ✓ (было 1954 файла) |
| i18n | `plane-fork/packages/i18n`: `./node_modules/.bin/tsx scripts/sync-check.ts --ci`; `tsx scripts/check-overlay.ts` | **18 локалей × 3837**, overlay OK | ✓ |
| root guard | `/Users/ermolov/Desktop/PPM`: `npm test` | **20 файлов / 653 passed** (M0.6, 13 допущенных диагностик) | 653/653 ✓ |
| propel/ui tsc | — (не перезапускал) | — | 0/0 по final-checks |
| e2e гейт | `scripts/ppm-canvas-browser-gate.sh` (не запускал: docker и креды) | — | README AF1.2: `19/19` на Chrome, Firefox и WebKit; перф-базис dev-стенда 2026-09-23: reload **1490/2658/2352 ms** (Chrome/FF/WebKit), переключения **183–1824 ms** |

Гейт на каждую задачу волны 1: все строки выше не хуже. Число тестов только растёт, провалов 0. `oxfmt --check`
на изменённых файлах. Плюс пиксельный diff v1 из 2.3 (`identical`) и JSON-замеры v2 из 2.3-3.

---

## 6. Найдено попутно (вне прямого объёма)

- `ppm-vault/route.tsx:597` — захардкоженная строка «На холст «Мозг проекта»»: старое имя холста в интерфейсе,
  мимо `ppmT`.
- Знак `apps/web/public/ppm-brand/mark.svg` залит Tailwind `#22D3EE`. Это `<img>`, favicon и манифест
  (`site.ppm.webmanifest.json`, `theme_color #0E0F12`, `root.tsx:95`), атрибутом их не перекрасить. Для
  спокойного циана нужен второй ассет или инлайн-SVG с `currentColor`.
- Нативный текст tldraw грузит шрифты с `cdn.tldraw.com` (3.6).
- Водяной знак и лицензионная отметка tldraw не должны перекрываться новой нижней строкой статуса (глобальное
  правило волны 0). Сейчас футер — отдельная строка сетки (`canvas.css:1-15`, `grid-template-rows: 3.25rem
  minmax(0,1fr) 1.75rem`), поверх холста он не ложится; так и оставить.
- Отложенный долг волны 0, который задевает строки «Задач»: вложенные кнопки в выпадающих списках Plane
  (`dropdowns/buttons.tsx`).

## 7. Открытые вопросы владельцу

1. «Версия 14» в строке статуса (из B) противоречит решению волны 0 убрать служебную версию (тест
   `brand.test.ts:157-164`). Показывать версию снова, под новым ключом?
2. В макете A правки идут в «Задачах», а карточка на холсте только читается. Убрать инлайн-правку статуса,
   приоритета, срока и исполнителей на холсте значит удалить работающую функцию. Предложение: оставить правку
   с новой подачей.
3. Колонка куратора: «заблокировано» требует N+1 запросов, «ждёт проверки» не определено в CE,
   «последние изменения» без ленты проекта. Согласны на версию из уже загруженных данных с пометкой «в текущей
   выборке»?
4. Плотность хранить на устройстве (localStorage, без серверных данных) или в профиле (запись в
   `profile.theme`)?
5. Настроить `assetUrls` tldraw на локальные шрифты: это убирает внешние запросы к `cdn.tldraw.com`, но меняет
   поведение сверх облика.
6. Кто и когда запускает docker-гейт с синтетической фикстурой «Задач»? Агенты не вводят креды и не сидируют
   рабочую БД.
7. `PPM_DESIGN_V2` по умолчанию: `preview` на время работ, `1` после приёмки. Устраивает?
