# UX1.1 — Новый облик PPM (гибрид A+B, волна 1): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать PPM собственный облик «гибрид A+B» — дизайн-система на всё приложение (тёплый графит / «бумага и
тушь», спокойный голубой акцент, IBM Plex, две плотности), новая оболочка и полная переделка «Задач» и «Холста» —
не ломая существующий функционал и не меняя данные.

**Architecture:**
- Правки идут поверх рабочего дерева `plane-fork`, в котором без коммитов лежит волна 0 (UX0.2).
- Всё новое — за флагом `PPM_DESIGN_V2` (по умолчанию `1`) и атрибутом `html[data-ppm-design="v2"]`:
  CSS — под `:where(html[data-ppm-design="v2"])`, TSX — под `usePpmDesignV2()`/`isPpmDesignV2()`.
  `PPM_DESIGN_V2=0` или `localStorage.ppm_design="v1"` возвращают вид волны 0.
- Порядок: фаза F (фундамент и оболочка) — последовательно; затем линии T («Задачи») и C («Холст») —
  параллельно, с непересекающимися файлами (`drafts/CONTRACTS.md` §0); в конце — общая проверка и живой прогон.
- Коммитов нет: исходники до правки — `2026-09-24-ux11/pre/`, патч — `tools/ux11-diff.sh > ux11.patch`.

**Tech Stack:** plane-fork — React Router 7 + Vite 8, Tailwind 4.1.17, MobX, tldraw 3.15.6, i18next 25 + ICU;
пакеты `@ppm/brand`, `@ppm/canvas`, `@plane/{i18n,propel,ui}` (web берёт их из `dist`); vitest 4; oxlint, oxfmt.

**Spec:** [`docs/project-spec/Документация PPM/Intelligence-first/tasks/UX1.1 — Новый облик PPM: система, Холст и Задачи.md`](<../../project-spec/Документация PPM/Intelligence-first/tasks/UX1.1 — Новый облик PPM: система, Холст и Задачи.md>)

**Материалы** (`docs/superpowers/plans/2026-09-24-ux11/`):
- `drafts/CONTRACTS.md` — общие имена, владение файлами, проверки (обязательно к прочтению каждому исполнителю);
- `drafts/lane-F-preamble.md`, `lane-T-preamble.md`, `lane-C-preamble.md` — ограничения и решения каждой части;
- `drafts/TOKENS.md`, `tokens.mjs` — значения токенов; `mockups/` — макеты (PNG + `.dc.html`);
- `notes/*.md` — карта кода со ссылками на строки и предложенным кодом;
- `tools/ux11-pre.sh` (исходник до первой правки — обязательно), `ux11-diff.sh`, `ux11-snap.sh` (только контроллер),
  `ux11-pkg-build.sh <pkg>` (сборка пакета под общей блокировкой).

## Global Constraints

- Рабочее дерево — единственный источник правды. Не выполнять `git add/commit/stash/reset/checkout/clean`.
  Не трогать чужие незакоммиченные изменения сверх нужного задаче. Параллельно может работать агент бэкенда
  в `apps/api/**` — его файлы не трогать.
- Перед первой правкой любого файла — `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh <путь от plane-fork>`.
- Всё под v2 (см. Architecture). При v1 — вид и поведение волны 0.
- Никаких новых сетевых запросов к внешним сервисам, телеметрии, изменений моделей данных, миграций и API.
  Запросы к существующим эндпоинтам PPM/Plane — только те, что перечислены в части плана.
- Горячие клавиши — только через `e.code`; новых сочетаний не добавлять.
- UI-строки — по-русски, в тоне PPM, без «ИИ»; новые строки — в модули переводов `@ppm/brand`
  (`packages/ppm-brand/src/translations/ux11-*.ts`, en **и** ru). Не трогать `packages/i18n/src/locales/*`.
- Dev-сервер владельца (:3000) не перезапускать, второй не запускать. Правка `vite.config.ts` сама перезапускает Vite.
- Пакеты пересобирать только через `tools/ux11-pkg-build.sh <pkg-dir>`.
- Базовая линия (не ухудшать): brand 41/41 + аудиты; canvas 38/38 + аудит, canvas tsc — 1 старая ошибка;
  i18n 18 × 3837 + overlay OK; web vitest 30 файлов / 184; web tsc 0; oxlint 719 предупреждений / 0 ошибок;
  корень `npm test` 653/653.
- Форматировать только изменённые файлы: `../../node_modules/.bin/oxfmt <файлы>`.
- Данные в браузере владельца при живой проверке не менять (не создавать/не править задачи, доски, связи).

## Review Focus

1. **v1 и откат:** `PPM_DESIGN_V2=0` и `localStorage.ppm_design="v1"` дают вид волны 0 — все правила v2 под скоупом,
   все TSX-ветки v1 сохраняют прежнюю разметку и тестовые выражения. Тесты: F1 (таблица истинности), стражи линий.
2. **Светлая тема и компактная плотность:** весь текст ≥ 4,5:1, смысловые границы ≥ 3:1, строки 36/32 без «прыжков»
   при прокрутке, ничего мельче 11 px. Тесты: контракт токенов v2 (F2), стражи T5 и canvas-v2-css (C1).
3. **Роли и режимы:** читатель/гость видит связи и может сбросить масштаб; минимальный режим Холста
   (`PPM_ANTYFLOW_SHELL_ENABLED=0`) остаётся прежним; до 8 открытых досок со скрытыми вкладками.
4. **Пустые и крайние данные:** проект без спринтов и без статуса проверки, 0 задач, очень длинные названия,
   > 1000 задач, нет Git-ссылок (403/404) — интерфейс честно пуст, без ошибок.
5. **Ширины 1280/1440/1024/390 и открытый peek:** колонка куратора от 1440 px и скрыта при peek; оболочка не даёт
   горизонтального переполнения; сайдбар свёрнут/развёрнут.


---

## Фаза F — фундамент и оболочка (последовательно, первой)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Включить новый облик PPM флагом с мгновенным откатом, дать всему приложению дизайн-систему v2 (токены обеих тем,
две плотности, шрифты Plex с осью ширины, типографические утилиты, системные правила) и перевести оболочку на v2. Это
фундамент, на котором после F параллельно работают линии T (Задачи) и C (Холст).

**Architecture:**
- `PPM_DESIGN_V2` (`0 | preview | 1`, по умолчанию `1`) → `@ppm/brand` `resolvePpmDesign()` → `<html data-ppm-design>` и
  `<html data-ppm-density>` до первой отрисовки (инлайн-скрипт в `root.tsx` читает `localStorage.ppm_design` и
  `localStorage.ppm_density`). CSS волны 1 висит на `:where(html[data-ppm-design="v2"])`, TSX — на `usePpmDesignV2()`.
- Токены v2 — **отдельный** файл `packages/ppm-brand/src/tokens-v2.css` (экспорт `@ppm/brand/tokens-v2.css`), подключается
  после `tokens.css`. Файл волны 0 не меняется, поэтому `PPM_DESIGN_V2=0` и `ppm_design=v1` возвращают вид волны 0 целиком.
- API Tailwind v2 (`@custom-variant ppm-v2 | ppm-compact`, `@utility ppm-text-*`) и системные правила (1 px у смысловых
  границ, иконки lucide 1,5 px, тени только у всплывающих слоёв, радиусы 8/12) — `apps/web/styles/ppm-v2/system.css`.
  Оболочка — `apps/web/styles/ppm-v2/shell.css` на инертных `data-*`-хуках. `apps/web/styles/ppm-v2/tasks.css` — пустой
  файл линии T, подключён **без слоя** (нужда T N2).
- Строки: три модуля `packages/ppm-brand/src/translations/ux11-{system,tasks,canvas}.ts`, влиты в `PPM_TRANSLATIONS`.
- Коммитов нет. Перед первой правкой каждого файла — `ux11-pre.sh`; снимки делает контроллер.

**Tech Stack:** plane-fork (React Router 7 + Vite 8, React 18.3.1, Tailwind 4.1.17, next-themes 0.4.6, MobX), пакет
`@ppm/brand` (tsdown), vitest 4 (env `node`, без DOM), oxlint/oxfmt, шрифты `@fontsource-variable/ibm-plex-sans`
(wdth.css) и `@fontsource/ibm-plex-mono` (400/500) — уже установлены.

**Источники (обязательны):** спецификация `drafts/spec-draft.md` (A, B, C; рулинги R1–R24), контракты `drafts/CONTRACTS.md`
(§0–§3 реализует F), значения `drafts/TOKENS.md` + `drafts/tokens.mjs`, карта кода `notes/{infra,shell,risk}.md`, макеты
`mockups/H-*.png|.dc.html`. Нужды линий `drafts/plan-T-needs.md` (N1–N5) и `drafts/plan-C-needs.md` (§1–§6) учтены в
F2–F5 (сводка в конце). Расхождения с контрактами и макетами — в `drafts/plan-F-needs.md`.

**Порядок:** F1 → F2 → F3 → F4 → F5 строго последовательно; линии T и C стартуют только после F5.

| Задача | Суть | Время |
|---|---|---|
| F1 | Флаг `PPM_DESIGN_V2`, резолверы, скрипт до первой отрисовки, `ppm-design.ts`, тема «как в системе» под v2, `theme-color` | ~40 мин |
| F2 | `tokens-v2.css`: роли обеих тем, акцент и ступени, статусы, типы, Холст, радиусы, тени, плотности, типографика; контракт-тест | ~35 мин |
| F3 | Шрифты (Plex wdth, Plex Mono 400/500, preload), `system.css` (варианты, `ppm-text-*`, R19, иконки, поповеры/модалки), `tasks.css`, стражи | ~40 мин |
| F4 | Модули переводов + паритет, русские имена статусов (N1), «Плотность» в «Профиль → Предпочтения», RU-остатки страницы, аудит (N3) | ~45 мин |
| F5 | Оболочка v2: без рамки, топбар 48/44, `Ctrl K`/`⌘K`, знак PPM, «Новая задача» + `N I`, пункты 32/28, «Работа»/«Знания» | ~45 мин |

## Global Constraints (дополнения части F)

- Все пути — от `plane-fork/` (`PF=/Users/ermolov/Desktop/PPM/plane-fork`, `T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools`).
- Перед первой правкой **или созданием** файла: `$T/ux11-pre.sh <путь от plane-fork>` (для нового файла он запишет
  `.__absent__`). Никаких `git add/commit/stash/reset/checkout`.
- Пакет `@ppm/brand` web читает из `dist`: после любой правки `packages/ppm-brand/src/*.ts` — `$T/ux11-pkg-build.sh ppm-brand`
  **до** правок web, которые импортируют новое (иначе живой dev-сервер владельца покажет ошибку импорта).
- Dev-сервер владельца (:3000) не перезапускать и второй не поднимать. Правка `apps/web/vite.config.ts` сама перезапустит
  Vite — поэтому в F1 она **последняя** (и экспорт `./tokens-v2.css` в `package.json` появляется до неё: иначе кэш
  разрешения пакетов Vite может не увидеть новый экспорт до ручного рестарта). Правки `root.tsx` дают полную перезагрузку
  вкладок — не более одной на задачу.
- Весь CSS волны 1 — под `:where(html[data-ppm-design="v2"])`; правила оболочки — под
  `:where(html[data-ppm-design="v2"][data-ppm-shell="enabled"])` (при `PPM_SHELL_ENABLED=0` остаётся upstream-оболочка).
  Специфичность не растёт; правила F лежат в `@layer utilities` и выигрывают у утилит порядком. Каждый `var(--ppm-*)` в
  правилах — с фолбэком на значение волны 0 этого свойства (ловушка IACVT). `!important` не использовать.
- В upstream-файлах Plane — только инертные `data-*`-атрибуты или ветки `isPpmShell && isDesignV2`; разметка волны 0
  при v1 сохраняется байт-в-байт.
- Не переписывать выражения, закреплённые тестами: `tests/navigation/top-navigation-gating.test.ts:13-24`,
  `tests/navigation/navigation-accessibility.test.tsx` (`aria-current`, `focus-visible:outline-*`, combobox поиска),
  `tests/navigation/project-navigation-items.test.ts` и `brand.test.ts:116-129` (порядок навигации, `intake` не убирать),
  `tests/ppm-shell/english-leftovers.test.ts` (шаблон `isPpmShell ? ppmT(…) : "<upstream>"`). E2E-якоря из
  `notes/risk.md` §1.3 (`#main-sidebar` + `w-0` на 320 px, `aria-label` иконочных кнопок) не трогать.
- Плотность и облик — только `localStorage` (`ppm_density`, `ppm_design`); ни одного запроса записи (R3). Сетевых
  запросов не добавлять: шрифты локальные (fontsource).
- Строки F — только в `packages/ppm-brand/src/translations/ux11-system.ts` (ключи `ux.*`, `density.*`), en **и** ru; без
  «ИИ». В `packages/i18n/src/locales/*` ничего не добавлять.
- Горячие клавиши — только существующие (Power-K по `e.code`); подсказки `N I` и `Ctrl K`/`⌘K` — `aria-hidden`.
- Формат — только точечно: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt <файлы>` (или из `packages/ppm-brand`).
  CSS-файлы oxfmt не форматирует.
- Базовая линия (волна 0, не ухудшать): web vitest 30 файлов / 184; `@ppm/brand` 3 / 41 + оба аудита; `@ppm/canvas` 38;
  web `tsc` 0; oxlint `ppm-*` 0 ошибок; корень `npm test` 653; i18n `sync-check --ci` 18 × 3837; аудит классов PASS (30 файлов).
  Ожидаемые числа после каждой задачи указаны в её шагах.
- Команды:
  - brand: `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  - web: `cd $PF/apps/web && ./node_modules/.bin/vitest run`
  - web tsc: `cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-24-ux11-hybrid-redesign/web-F.tsbuildinfo`
  - oxlint: `cd $PF/apps/web && ../../node_modules/.bin/oxlint <изменённые .ts/.tsx>` → 0 errors.
- Docker (`apps/web/Dockerfile.web`) по-прежнему не пробрасывает `PPM_*` (отложено в волне 0): образ собирается с
  `PPM_DESIGN_V2=1` по умолчанию из `vite.config.ts`.

## Review Focus (часть F)

1. **Флаги выключены.** `PPM_DESIGN_V2=0`, `localStorage.ppm_design="v1"` при `1`, `PPM_BRAND_ENABLED=0`,
   `PPM_SHELL_ENABLED=0`: вид волны 0 (токены v1, JetBrains Mono в v1, рамка, топбар 40 px, плоский список навигации),
   тема по умолчанию тёмная при `0`/`preview`; при `brand=0` — upstream без скрипта. Тесты: `design-flag.test.ts`
   (таблица и скрипт), `token-contract-v2.test.ts` (двойной шлюз каждого правила), `v2-css.test.ts` и `shell-v2.test.ts`
   (шлюзы и инертные хуки). Известное ограничение: личный `ppm_design=v1` при сборке с `1` не возвращает тёмную тему по
   умолчанию (defaultTheme — сборочный, см. `plan-F-needs.md` п. 6).
2. **Светлая тема и контраст.** Весь текст ≥ 4,5:1, смысловые границы/глифы ≥ 3:1 в обеих темах (контракт F2); поля
   ввода на `bg-layer-2` держат границу ≥ 3:1 (исправление значения `layer-2` тёмной темы); кольцо фокуса ≠ выделению;
   поповеры в светлой теме с мягкой тенью, модалки r12. Проверить вручную: выпадающие списки свойств, меню проекта,
   `ModalCore` большого размера, peek.
3. **Плотность «Компактная».** Переключение в профиле мгновенно (атрибут + токены), без перезагрузки и без сетевых
   запросов; топбар 44, пункты 28, поле поиска 28 (= волна 0), текст контента 13; ничего не «прыгает» в оболочке.
4. **Ширины 390 и 1024.** 390: поиск спрятан (`sm:block`), подсказка `Ctrl K` уходит вместе с ним, сайдбар свёрнут
   (`#main-sidebar` `w-0` на 320), без рамки нет горизонтального переполнения, меню пространства открывается под топбаром
   48/44. 1024: сайдбар + контент, группы «Работа»/«Знания» не обрезаются.
5. **Русская раскладка.** `N I` и `Ctrl K` — существующие сочетания Power-K по `e.code`; подсказки только визуальные.
6. **До первой отрисовки.** Нет вспышки v1→v2 и плотности; в консоли нет предупреждений гидратации; приватный режим
   (localStorage бросает) даёт сборочный вид.

## Итоговая таблица имён (публикует F; линии T и C потребляют без правок)

| Что | Имя | Где определено |
|---|---|---|
| Атрибуты `<html>` | `data-ppm-design="v1\|v2"`, `data-ppm-density="comfortable\|compact"` (+ прежние `data-ppm-brand`, `data-ppm-shell`, `data-theme`) | `root.tsx` (JSX + скрипт) |
| `@ppm/brand` | `PPM_DESIGN_STORAGE_KEY`, `PPM_DENSITY_STORAGE_KEY`, `TPpmDesign`, `TPpmDensity`, `resolvePpmDesign`, `resolvePpmDensity`, `getPpmAppearanceBootstrapScript`, `PPM_THEME_COLOR_V2`, `UX11_*_TRANSLATIONS` | `src/index.ts`, `src/translations/*` |
| `@/lib/ppm-design` | `isPpmDesignV2()`, `usePpmDesignV2()`, `getPpmDensity()`, `setPpmDensity()`, `usePpmDensity()`, `PPM_DENSITY_CHANGE_EVENT`, `getPpmStateDisplayName(state, locale)` | `apps/web/core/lib/ppm-design.ts` |
| `@/components/ppm-shell/kbd-hint` | `PpmKbdHint({ keys, tone?: "default"\|"on-accent", className })`, `PPM_CREATE_WORK_ITEM_KEYS` (`["N","I"]`), `getPpmCommandShortcutLabel(platform)` | F5 |
| Варианты Tailwind | `ppm-v2:` (дизайн v2), `ppm-compact:` (v2 + компактная) — ровно как CONTRACTS §2 | `styles/ppm-v2/system.css` |
| Типографика (утилиты) | `ppm-text-display`, `ppm-text-title-1`, `ppm-text-title-2`, `ppm-text-title-3`, `ppm-text-body`, `ppm-text-ui`, `ppm-text-meta`, `ppm-text-mono`, `ppm-text-mono-sm` (размер, интерлиньяж, вес, трекинг; моно — семья и `tabular-nums`); `ppm-font-narrow` (= `font-stretch: var(--ppm-font-stretch-narrow)`) | `system.css` |
| Типографика (токены) | `--ppm-text-<role>-size`, `-leading`, `-weight`, `-tracking` для 9 ролей; `--ppm-font-size-content` = `--ppm-text-body-size` (алиас CONTRACTS §2); `--ppm-font-sans`, `--ppm-font-mono` (IBM Plex Mono), `--ppm-font-stretch-narrow: 85%` | `tokens-v2.css` |
| Плотность (удобная/компактная) | `--ppm-row-height` 36/32, `--ppm-group-row-height` 36/32, `--ppm-table-head-height` 32/28, `--ppm-sidebar-item-height` 32/28, `--ppm-topbar-height` 48/44, `--ppm-page-header-height` 52/44, `--ppm-sprint-strip-height` 60/52, `--ppm-toolbar-height` 44/40, `--ppm-control-height` 32/28, `--ppm-control-height-sm` 28/24, `--ppm-page-padding-x` 24/16, `--ppm-cell-gap` 12/8, `--ppm-panel-padding` 20/16, `--ppm-avatar-size` 20/18, `--ppm-canvas-status-height` 32/28 (в rem) | `tokens-v2.css` |
| Цвет (обе темы) | `--ppm-color-{canvas,surface-1,surface-2,layer-1,layer-1-hover,layer-1-selected,layer-2,layer-2-hover,layer-2-selected,layer-3,layer-3-hover,layer-3-selected,layer-disabled,alpha-hover,alpha-active,alpha-selected,border,border-control,border-strong,border-emphasis,text,text-secondary,text-muted,text-placeholder,icon-subtle,text-disabled,accent,accent-hover,accent-active,accent-text,accent-text-hover,icon-accent-subtle,on-accent,focus,focus-gap,selection,selection-bg,danger,danger-hover,danger-active,on-danger,danger-text,danger-line,warning,success}`; `--ppm-status-{backlog,todo,progress,review,done,cancelled}`; `--ppm-type-{task,doc,file,code,decision}`; `--ppm-project-avatar-{bg,fg}`; Холст: `--ppm-color-{board,board-grid,section-tick,link,link-visual,link-emphasis,card-live,card-own,card-found-border}`; прежние `--ppm-node-*` перепривязаны (TOKENS §2) | `tokens-v2.css` |
| Форма и движение | `--ppm-radius-xs` 4, `-sm` 6, `-md` 8, `-lg` 12, `--ppm-radius-full` 999px; `--ppm-space-{1,2,3,4,5,6,8}`; `--ppm-shadow-popover` (по теме); `--ppm-focus-ring`; `--ppm-motion-fast/-base` | `tokens-v2.css` |
| Холст (геометрия, TOKENS §11) | `--ppm-sidebar-width` 232, `--ppm-sidebar-width-collapsed` 48, `--ppm-canvas-rail-width` 136, `--ppm-canvas-rail-width-collapsed` 48, `--ppm-inspector-width` 304, `--ppm-canvas-overlay-inset` 16, `--ppm-canvas-grid-step` 16px, `--ppm-canvas-card-padding` 12, `--ppm-canvas-card-footer-height` 36, `--ppm-canvas-toolbar-height` 32, `--ppm-canvas-handle-size` 8, `--ppm-link-width` 1.5px, `--ppm-link-width-emphasis` 2px, `--ppm-link-width-visual` 1px, `--ppm-link-dash` `4 3`, `--ppm-link-port-radius` 2.5px, `--ppm-link-arrow-length` 6px + `--ppm-link-arrow-width` 9px, `--ppm-link-bar-length` 11px + `--ppm-link-bar-thickness` 2px, `--ppm-link-chip-height` 20 | `tokens-v2.css` |
| Мост Plane (v2) | `--bg-accent-subtle`→`selection-bg`; `--bg-danger-primary(-hover/-active/-selected)`→`danger*`; `--txt-on-accent`→`on-accent`; `--txt-on-color`→`on-danger`; `--txt-{danger,warning,success}-primary`→`danger-text/warning/success`; `--border-danger-strong`→`danger-line`; остальной мост волны 0 (`--bg-*`, `--txt-*`, `--border-*`, `--border-accent-strong`=`selection`) действует и в v2 | `tokens-v2.css` + `tokens.css` |
| Хуки оболочки | `data-ppm-app-frame="gutter\|panel"`, `data-ppm-topbar`, `data-ppm-topbar-menu`, `data-ppm-command-search`, `data-ppm-command-panel`, `data-ppm-nav-item` (+ `data-active`) | F5 |
| Строки | `density.{label,description,comfortable,compact}`, `ux.nav.section_{work,knowledge}`, `ux.state.{backlog,unstarted,started,completed,cancelled,triage}`, `ux.preferences.*` | `ux11-system.ts` |

Правила применения для линий: в разметке Plane, которая существует и в v1, — `text-13 ppm-v2:ppm-text-body` (вариантное
правило идёт позже базового и выигрывает; проверено сборкой Tailwind), высоты — `min-h-11 ppm-v2:min-h-(--ppm-row-height,2.75rem)`.
Без префикса `ppm-text-*` не ставить на один элемент с `text-11…14`/`text-body-*`/`font-*`: `cn()` оставит оба, победит порядок.

---

### Task 1 (F1): Флаг `PPM_DESIGN_V2`, режим дизайна и плотность до первой отрисовки

**Files:**
- Modify: `packages/ppm-brand/src/index.ts` — новый блок сразу после `isPpmShellEnabled` (`:1702-1704`), перед
  `resolvePpmInitialLanguage` (`:1706`).
- Modify: `packages/ppm-brand/package.json:13` и `packages/ppm-brand/tsdown.config.ts:10` — экспорт `./tokens-v2.css`.
- Create: `packages/ppm-brand/src/tokens-v2.css` (заглушка без правил; наполняет F2).
- Create: `packages/ppm-brand/src/__tests__/design-flag.test.ts`.
- Create: `apps/web/core/lib/ppm-design.ts`.
- Create: `apps/web/tests/ppm-design/ppm-design.test.ts`, `apps/web/tests/ppm-design/flag-wiring.test.ts`.
- Modify: `apps/web/app/root.tsx:15` (импорт), `:46-47` (константы), `:86-95` (`<html>`, скрипт, `theme-color`),
  `:109-112` (`ThemeProvider`).
- Modify (последними): `turbo.json:13`, `apps/web/.env.example:18`, `apps/web/vite.config.ts:20`.

**Interfaces:**
- Consumes: `isPpmBrandEnabled`, `DISABLED_FLAG_VALUES` (`packages/ppm-brand/src/index.ts:20,1693-1696`).
- Produces (CONTRACTS §1): `PPM_DESIGN_STORAGE_KEY = "ppm_design"`, `PPM_DENSITY_STORAGE_KEY = "ppm_density"`,
  `TPpmDesign`, `TPpmDensity`, `resolvePpmDesign(designValue, brandValue, stored)`, `resolvePpmDensity(stored)`; сверх
  контракта — `getPpmAppearanceBootstrapScript(designValue, brandValue)`, `PPM_THEME_COLOR_V2`. Web: `isPpmDesignV2()`,
  `usePpmDesignV2()`, `getPpmDensity()`, `setPpmDensity(d)`, `usePpmDensity()`, `PPM_DENSITY_CHANGE_EVENT`.
  Атрибуты `<html data-ppm-design data-ppm-density>` до первой отрисовки; экспорт `@ppm/brand/tokens-v2.css`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools
  $T/ux11-pre.sh packages/ppm-brand/src/index.ts packages/ppm-brand/package.json packages/ppm-brand/tsdown.config.ts \
    packages/ppm-brand/src/tokens-v2.css packages/ppm-brand/src/__tests__/design-flag.test.ts \
    apps/web/core/lib/ppm-design.ts apps/web/tests/ppm-design/ppm-design.test.ts apps/web/tests/ppm-design/flag-wiring.test.ts \
    apps/web/app/root.tsx apps/web/vite.config.ts turbo.json apps/web/.env.example
  ```
- [ ] **Step 2: Написать падающий тест пакета** — `packages/ppm-brand/src/__tests__/design-flag.test.ts`:
  ```ts
  // UX1.1 F1: PPM_DESIGN_V2 (0 | preview | 1) + per-browser override, density, and the pre-paint script.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import {
    getPpmAppearanceBootstrapScript,
    PPM_DENSITY_STORAGE_KEY,
    PPM_DESIGN_STORAGE_KEY,
    resolvePpmDensity,
    resolvePpmDesign,
  } from "../index";

  const OFF = ["0", "false", "FALSE", "off", "no", "disabled", " 0 "];
  const ON = [undefined, "", "1", "true", "yes", " 1 "];
  const PREVIEW = ["preview", "PREVIEW", " preview "];
  const BRANDS = [undefined, "1", "0"];
  const STORED = [null, "v1", "v2", "garbage"];

  function runScript(script: string, storage: Record<string, string> | "blocked") {
    const attributes: Record<string, string> = {};
    const localStorage = {
      getItem: (key: string) => {
        if (storage === "blocked") throw new Error("SecurityError");
        return storage[key] ?? null;
      },
    };
    const document = { documentElement: { setAttribute: (name: string, value: string) => (attributes[name] = value) } };
    new Function("localStorage", "document", script)(localStorage, document);
    return attributes;
  }

  describe("PPM design flag (UX1.1)", () => {
    it("is always wave 0 when the brand is off", () => {
      for (const flag of [...OFF, ...ON, ...PREVIEW])
        for (const stored of STORED) expect(resolvePpmDesign(flag, "0", stored), `${flag}/${stored}`).toBe("v1");
    });

    it("PPM_DESIGN_V2=0 and its aliases ignore the per-browser choice", () => {
      for (const flag of OFF) for (const stored of STORED) expect(resolvePpmDesign(flag, "1", stored)).toBe("v1");
    });

    it("preview is wave 0 unless this browser opted in with ppm_design=v2", () => {
      for (const flag of PREVIEW) {
        expect(resolvePpmDesign(flag, undefined, "v2")).toBe("v2");
        for (const stored of [null, "v1", "garbage"]) expect(resolvePpmDesign(flag, undefined, stored)).toBe("v1");
      }
    });

    it("1 or unset is v2 unless this browser opted out with ppm_design=v1", () => {
      for (const flag of ON) {
        expect(resolvePpmDesign(flag, undefined, "v1"), String(flag)).toBe("v1");
        for (const stored of [null, "v2", "garbage"]) expect(resolvePpmDesign(flag, undefined, stored)).toBe("v2");
      }
    });

    it("the pre-paint script applies exactly the resolvePpmDesign table", () => {
      for (const flag of [...OFF, ...ON, ...PREVIEW])
        for (const brand of BRANDS)
          for (const stored of STORED) {
            const storage = stored === null ? {} : { [PPM_DESIGN_STORAGE_KEY]: stored };
            const attributes = runScript(getPpmAppearanceBootstrapScript(flag, brand), storage);
            expect(attributes["data-ppm-design"], `${flag}/${brand}/${stored}`).toBe(resolvePpmDesign(flag, brand, stored));
          }
    });

    it("the pre-paint script falls back to the build default when storage is blocked", () => {
      expect(runScript(getPpmAppearanceBootstrapScript("1", "1"), "blocked")).toEqual({
        "data-ppm-design": "v2",
        "data-ppm-density": "comfortable",
      });
      expect(runScript(getPpmAppearanceBootstrapScript("preview", "1"), "blocked")["data-ppm-design"]).toBe("v1");
    });

    it("density is compact only on the exact stored value", () => {
      expect(resolvePpmDensity("compact")).toBe("compact");
      for (const stored of [null, "", "COMPACT", "comfortable", "dense"]) expect(resolvePpmDensity(stored)).toBe("comfortable");
    });

    it("the pre-paint script reads density from this browser only", () => {
      const script = getPpmAppearanceBootstrapScript("1", "1");
      expect(runScript(script, { [PPM_DENSITY_STORAGE_KEY]: "compact" })["data-ppm-density"]).toBe("compact");
      expect(runScript(script, { [PPM_DENSITY_STORAGE_KEY]: "dense" })["data-ppm-density"]).toBe("comfortable");
      expect(runScript(script, {})["data-ppm-density"]).toBe("comfortable");
    });

    it("publishes the storage keys shared with the web helper", () => {
      expect(PPM_DESIGN_STORAGE_KEY).toBe("ppm_design");
      expect(PPM_DENSITY_STORAGE_KEY).toBe("ppm_density");
    });

    it("exports the v2 token stylesheet, also after a tsdown rebuild rewrites package.json", () => {
      const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
      expect(pkg.exports["./tokens-v2.css"]).toBe("./src/tokens-v2.css");
      expect(readFileSync(new URL("../../tsdown.config.ts", import.meta.url), "utf8")).toContain(
        '"./tokens-v2.css": "./src/tokens-v2.css",'
      );
    });
  });
  ```
- [ ] **Step 3: Убедиться, что тест падает**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/design-flag.test.ts`
  Ожидание: FAIL, `TypeError: … resolvePpmDesign is not a function` (и `getPpmAppearanceBootstrapScript`), тест экспорта —
  `expected undefined to be './src/tokens-v2.css'`.
- [ ] **Step 4: Реализовать в `@ppm/brand`**
  - В `src/index.ts` после закрывающей `}` функции `isPpmShellEnabled` (`:1704`) вставить блок (проверен таблицей из
    Step 2 — 10/10):
    ```ts
    // ---------------- UX1.1: design v2 («гибрид A+B») and density ----------------

    export type TPpmDesign = "v1" | "v2";
    export type TPpmDensity = "comfortable" | "compact";

    export const PPM_DESIGN_STORAGE_KEY = "ppm_design";
    export const PPM_DENSITY_STORAGE_KEY = "ppm_density";

    /** meta theme-color of the v2 app background (TOKENS §1 --ppm-color-canvas); asserted by token-contract-v2.test.ts. */
    export const PPM_THEME_COLOR_V2 = { light: "#f2efea", dark: "#11100e" } as const;

    type TPpmDesignMode = "off" | "preview" | "on";

    function getPpmDesignMode(designValue: string | undefined, brandValue: string | undefined): TPpmDesignMode {
      if (!isPpmBrandEnabled(brandValue)) return "off";
      const mode = designValue?.trim().toLowerCase() ?? "";
      if (DISABLED_FLAG_VALUES.has(mode)) return "off";
      return mode === "preview" ? "preview" : "on";
    }

    /**
     * Wave-1 look («гибрид A+B»). PPM_DESIGN_V2: "0" = wave 0 only; "preview" = wave 0 unless this browser opted in
     * (localStorage ppm_design="v2"); "1" or unset = v2 unless this browser opted out (ppm_design="v1").
     * The brand flag wins: PPM_BRAND_ENABLED=0 is always v1.
     */
    export function resolvePpmDesign(
      designValue: string | undefined,
      brandValue: string | undefined,
      stored: string | null
    ): TPpmDesign {
      const mode = getPpmDesignMode(designValue, brandValue);
      if (mode === "off") return "v1";
      if (mode === "preview") return stored === "v2" ? "v2" : "v1";
      return stored === "v1" ? "v1" : "v2";
    }

    /** Density lives only in this browser (R3): "compact" on the exact value, otherwise «Удобная». */
    export function resolvePpmDensity(stored: string | null): TPpmDensity {
      return stored === "compact" ? "compact" : "comfortable";
    }

    /**
     * Inline <head> script for root.tsx: sets <html data-ppm-design data-ppm-density> before first paint. Build-time
     * flags are baked in; only the per-browser choice is read at runtime, with the rules of resolvePpmDesign and
     * resolvePpmDensity (design-flag.test.ts runs the script over the same table).
     */
    export function getPpmAppearanceBootstrapScript(designValue: string | undefined, brandValue: string | undefined): string {
      const mode = getPpmDesignMode(designValue, brandValue);
      return (
        `(function(){var m=${JSON.stringify(mode)},d=null,n=null;` +
        `try{d=localStorage.getItem(${JSON.stringify(PPM_DESIGN_STORAGE_KEY)});` +
        `n=localStorage.getItem(${JSON.stringify(PPM_DENSITY_STORAGE_KEY)})}catch(e){}` +
        `var r=document.documentElement;` +
        `r.setAttribute("data-ppm-design",m==="off"?"v1":m==="preview"?(d==="v2"?"v2":"v1"):(d==="v1"?"v1":"v2"));` +
        `r.setAttribute("data-ppm-density",n==="compact"?"compact":"comfortable")})();`
      );
    }
    ```
  - `package.json:13` — после `"./tokens.css": "./src/tokens.css",` добавить строку
    `"./tokens-v2.css": "./src/tokens-v2.css",`.
  - `tsdown.config.ts:10` — после `"./tokens.css": "./src/tokens.css",` добавить ту же строку
    `"./tokens-v2.css": "./src/tokens-v2.css",` (tsdown перезаписывает `exports` при сборке; без неё экспорт пропадёт).
  - Создать `src/tokens-v2.css` (заглушка, правил нет — их добавит F2):
    ```css
    /*
     * PPM design v2 («гибрид A+B», UX1.1): token layer. Placeholder created by plan-F task F1 so that the
     * "./tokens-v2.css" export exists before the dev server restarts; task F2 fills it. No rules yet.
     */
    ```
- [ ] **Step 5: Прогнать пакет**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  Ожидание: **4 файла / 51** (41 + 10), оба аудита PASS (30 файлов), tsc без вывода.
  Формат: `../../node_modules/.bin/oxfmt src/index.ts src/__tests__/design-flag.test.ts package.json tsdown.config.ts`.
- [ ] **Step 6: Пересобрать пакет** — `$T/ux11-pkg-build.sh ppm-brand` (ожидание: tsdown без ошибок, в
  `dist/index.d.mts` есть `resolvePpmDesign`; `grep -c resolvePpmDesign $PF/packages/ppm-brand/dist/index.d.mts` ≥ 1).
- [ ] **Step 7: Написать падающие тесты web**
  - `apps/web/tests/ppm-design/ppm-design.test.ts`:
    ```ts
    // UX1.1 F1: web helper for the design switch and the device-local density.
    import { readFileSync } from "node:fs";
    import { afterEach, describe, expect, it, vi } from "vitest";
    import {
      getPpmDensity,
      isPpmDesignV2,
      PPM_DENSITY_CHANGE_EVENT,
      setPpmDensity,
    } from "@/lib/ppm-design";

    function stubDom(dataset: Record<string, string>, storage: { setItem: (key: string, value: string) => void }) {
      const events = new EventTarget();
      vi.stubGlobal("document", { documentElement: { dataset } });
      vi.stubGlobal("window", events);
      vi.stubGlobal("localStorage", storage);
      return events;
    }

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    describe("ppm-design helper (UX1.1)", () => {
      it("reads the look from <html data-ppm-design>, whatever the build flag says", () => {
        vi.stubEnv("PPM_DESIGN_V2", "0");
        stubDom({ ppmDesign: "v2" }, { setItem: () => {} });
        expect(isPpmDesignV2()).toBe(true);
        stubDom({ ppmDesign: "v1" }, { setItem: () => {} });
        vi.stubEnv("PPM_DESIGN_V2", "1");
        expect(isPpmDesignV2()).toBe(false);
      });

      it("falls back to the build flags without a document (prerender, unit tests)", () => {
        vi.stubGlobal("document", undefined);
        vi.stubEnv("PPM_BRAND_ENABLED", "1");
        vi.stubEnv("PPM_DESIGN_V2", "1");
        expect(isPpmDesignV2()).toBe(true);
        vi.stubEnv("PPM_DESIGN_V2", "preview");
        expect(isPpmDesignV2()).toBe(false);
        vi.stubEnv("PPM_DESIGN_V2", "1");
        vi.stubEnv("PPM_BRAND_ENABLED", "0");
        expect(isPpmDesignV2()).toBe(false);
      });

      it("density defaults to «Удобная» and follows <html data-ppm-density>", () => {
        stubDom({}, { setItem: () => {} });
        expect(getPpmDensity()).toBe("comfortable");
        stubDom({ ppmDensity: "compact" }, { setItem: () => {} });
        expect(getPpmDensity()).toBe("compact");
      });

      it("setPpmDensity switches the attribute, remembers the choice in this browser and notifies", () => {
        const dataset: Record<string, string> = { ppmDensity: "comfortable" };
        const setItem = vi.fn();
        const events = stubDom(dataset, { setItem });
        const listener = vi.fn();
        events.addEventListener(PPM_DENSITY_CHANGE_EVENT, listener);
        setPpmDensity("compact");
        expect(dataset.ppmDensity).toBe("compact");
        expect(setItem).toHaveBeenCalledWith("ppm_density", "compact");
        expect(listener).toHaveBeenCalledTimes(1);
        expect(getPpmDensity()).toBe("compact");
      });

      it("setPpmDensity still applies when storage is blocked", () => {
        const dataset: Record<string, string> = {};
        stubDom(dataset, {
          setItem: () => {
            throw new Error("QuotaExceededError");
          },
        });
        expect(() => setPpmDensity("compact")).not.toThrow();
        expect(dataset.ppmDensity).toBe("compact");
      });

      it("never writes density to the server (R3)", () => {
        const source = readFileSync(new URL("../../core/lib/ppm-design.ts", import.meta.url), "utf8");
        expect(source).not.toMatch(/@\/hooks\/store|@\/services|updateUserTheme|updateUserProfile|fetch\(/);
      });
    });
    ```
  - `apps/web/tests/ppm-design/flag-wiring.test.ts`:
    ```ts
    // UX1.1 F1: PPM_DESIGN_V2 is wired like the other PPM flags, and root.tsx applies it before first paint.
    import { readFileSync } from "node:fs";
    import { describe, expect, it } from "vitest";

    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
    const root = read("../../app/root.tsx");

    describe("PPM_DESIGN_V2 wiring (UX1.1)", () => {
      it("vite exposes PPM_DESIGN_V2 with the default 1 (R1)", () => {
        expect(read("../../vite.config.ts")).toContain('viteEnv.PPM_DESIGN_V2 = process.env.PPM_DESIGN_V2 ?? "1";');
      });

      it("turbo forwards PPM_DESIGN_V2 to builds and cache keys", () => {
        expect(JSON.parse(read("../../../../turbo.json")).globalEnv).toContain("PPM_DESIGN_V2");
      });

      it(".env.example documents the flag", () => {
        expect(read("../../.env.example")).toMatch(/^PPM_DESIGN_V2="1"$/m);
      });

      it("root.tsx renders both attributes and the brand-gated pre-paint script", () => {
        expect(root).toContain("data-ppm-design={PPM_DESIGN_DEFAULT}");
        expect(root).toContain('data-ppm-density="comfortable"');
        expect(root).toMatch(
          /getPpmAppearanceBootstrapScript\(\s*process\.env\.PPM_DESIGN_V2,\s*process\.env\.PPM_BRAND_ENABLED\s*\)/
        );
        expect(root).toContain(
          "{IS_PPM_BRAND_ENABLED && <script dangerouslySetInnerHTML={{ __html: PPM_APPEARANCE_BOOTSTRAP }} />}"
        );
      });

      it("defaults to the system theme under v2 and keeps the wave-0 dark default otherwise (R2)", () => {
        expect(root).toContain('defaultTheme={IS_PPM_BRAND_ENABLED && PPM_DESIGN_DEFAULT === "v1" ? "dark" : "system"}');
      });

      it("paints the browser chrome from the v2 canvas tokens under v2 (R20)", () => {
        expect(root).toContain('media="(prefers-color-scheme: light)" content={PPM_THEME_COLOR_V2.light}');
        expect(root).toContain('media="(prefers-color-scheme: dark)" content={PPM_THEME_COLOR_V2.dark}');
        expect(root).toContain('content={IS_PPM_BRAND_ENABLED ? PPM_BRAND.themeColor : "#fff"}');
      });
    });
    ```
- [ ] **Step 8: Убедиться, что они падают**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-design`
  Ожидание: FAIL — `Failed to resolve import "@/lib/ppm-design"`; в `flag-wiring` 6 провалов (строк ещё нет).
- [ ] **Step 9: Создать `apps/web/core/lib/ppm-design.ts`** (проверен тестом Step 7 — 6/6):
  ```ts
  /**
   * UX1.1 design switch («гибрид A+B») for TSX. CSS switches on <html data-ppm-design / data-ppm-density>, which
   * root.tsx sets before first paint; TSX reads the same attribute, so markup and styles never disagree (also with
   * PPM_DESIGN_V2=preview + a per-browser opt-in). Density is device-local (R3): localStorage only, no profile write.
   */
  import { useState, useSyncExternalStore } from "react";
  import { PPM_DENSITY_STORAGE_KEY, resolvePpmDensity, resolvePpmDesign } from "@ppm/brand";
  import type { TPpmDensity } from "@ppm/brand";

  export const PPM_DENSITY_CHANGE_EVENT = "ppm:density-change";

  const getRoot = (): HTMLElement | null => (typeof document === "undefined" ? null : document.documentElement);

  /** v2 look is on for this page load: the attribute written by the pre-paint script, else the build flags. */
  export function isPpmDesignV2(): boolean {
    const attribute = getRoot()?.dataset.ppmDesign;
    if (attribute === "v1" || attribute === "v2") return attribute === "v2";
    return resolvePpmDesign(process.env.PPM_DESIGN_V2, process.env.PPM_BRAND_ENABLED, null) === "v2";
  }

  /** Same value for the whole page load (the attribute is set once, before first paint); rollback needs a reload. */
  export function usePpmDesignV2(): boolean {
    const [isV2] = useState(isPpmDesignV2);
    return isV2;
  }

  export function getPpmDensity(): TPpmDensity {
    return resolvePpmDensity(getRoot()?.dataset.ppmDensity ?? null);
  }

  /** Applies instantly (CSS tokens follow the attribute) and remembers the choice in this browser only. */
  export function setPpmDensity(density: TPpmDensity): void {
    const next = resolvePpmDensity(density);
    const root = getRoot();
    if (root) root.dataset.ppmDensity = next;
    try {
      localStorage.setItem(PPM_DENSITY_STORAGE_KEY, next);
    } catch {
      // Private mode or blocked storage: the attribute still applies to this page load.
    }
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(PPM_DENSITY_CHANGE_EVENT, { detail: next }));
  }

  function subscribeToDensity(onChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(PPM_DENSITY_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(PPM_DENSITY_CHANGE_EVENT, onChange);
  }

  export function usePpmDensity(): TPpmDensity {
    return useSyncExternalStore(subscribeToDensity, getPpmDensity, (): TPpmDensity => "comfortable");
  }
  ```
- [ ] **Step 10: `apps/web/app/root.tsx`**
  - `:15` было `import { isPpmBrandEnabled, isPpmShellEnabled, PPM_BRAND } from "@ppm/brand";` — стало:
    ```tsx
    import {
      getPpmAppearanceBootstrapScript,
      isPpmBrandEnabled,
      isPpmShellEnabled,
      PPM_BRAND,
      PPM_THEME_COLOR_V2,
      resolvePpmDesign,
    } from "@ppm/brand";
    ```
  - После `:47` (`const IS_PPM_SHELL_ENABLED = …`) добавить:
    ```tsx
    // UX1.1: build-time default of the wave-1 look; the inline script below applies this browser's choice before paint.
    const PPM_DESIGN_DEFAULT = resolvePpmDesign(process.env.PPM_DESIGN_V2, process.env.PPM_BRAND_ENABLED, null);
    const PPM_APPEARANCE_BOOTSTRAP = getPpmAppearanceBootstrapScript(process.env.PPM_DESIGN_V2, process.env.PPM_BRAND_ENABLED);
    ```
  - `:86-95` было:
    ```tsx
        <html
          data-ppm-brand={IS_PPM_BRAND_ENABLED ? "enabled" : "disabled"}
          data-ppm-shell={IS_PPM_SHELL_ENABLED ? "enabled" : "disabled"}
          lang={IS_PPM_SHELL_ENABLED ? "ru" : "en"}
          suppressHydrationWarning
        >
          <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="theme-color" content={IS_PPM_BRAND_ENABLED ? PPM_BRAND.themeColor : "#fff"} />
    ```
    стало:
    ```tsx
        <html
          data-ppm-brand={IS_PPM_BRAND_ENABLED ? "enabled" : "disabled"}
          data-ppm-shell={IS_PPM_SHELL_ENABLED ? "enabled" : "disabled"}
          data-ppm-design={PPM_DESIGN_DEFAULT}
          data-ppm-density="comfortable"
          lang={IS_PPM_SHELL_ENABLED ? "ru" : "en"}
          suppressHydrationWarning
        >
          <head>
            <meta charSet="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            {IS_PPM_BRAND_ENABLED && <script dangerouslySetInnerHTML={{ __html: PPM_APPEARANCE_BOOTSTRAP }} />}
            {IS_PPM_BRAND_ENABLED && PPM_DESIGN_DEFAULT === "v2" ? (
              <>
                <meta name="theme-color" media="(prefers-color-scheme: light)" content={PPM_THEME_COLOR_V2.light} />
                <meta name="theme-color" media="(prefers-color-scheme: dark)" content={PPM_THEME_COLOR_V2.dark} />
              </>
            ) : (
              <meta name="theme-color" content={IS_PPM_BRAND_ENABLED ? PPM_BRAND.themeColor : "#fff"} />
            )}
    ```
    Пояснение: скрипт стоит в `<head>` до `<Meta/>`/`<Links/>` и до `<body>`, поэтому атрибуты верны до первой отрисовки;
    `suppressHydrationWarning` на `<html>` уже есть — React 18 не «чинит» атрибуты, выставленные скриптом.
  - `:109-112` было `defaultTheme={IS_PPM_BRAND_ENABLED ? "dark" : "system"}` — стало (R2: «как в системе» только под v2):
    ```tsx
              defaultTheme={IS_PPM_BRAND_ENABLED && PPM_DESIGN_DEFAULT === "v1" ? "dark" : "system"}
    ```
- [ ] **Step 11: Флаг в сборку (последним: Vite перезапустится сам)**
  - `turbo.json:13` — после `"PPM_PROJECT_ASK_ENABLED",` добавить `"PPM_DESIGN_V2",`.
  - `apps/web/.env.example` — в конец (после `:18`):
    ```
    
    # Облик волны 1 («гибрид A+B»): 0 — вид волны 0; preview — вид волны 0, личное включение localStorage ppm_design=v2;
    # 1 — новый вид, личный откат localStorage ppm_design=v1.
    PPM_DESIGN_V2="1"
    ```
  - `apps/web/vite.config.ts:20` — после `viteEnv.PPM_PROJECT_ASK_ENABLED = …;` добавить
    `viteEnv.PPM_DESIGN_V2 = process.env.PPM_DESIGN_V2 ?? "1";`
- [ ] **Step 12: Прогнать web**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run` → **32 файла / 196** (184 + 6 + 6).
  - web tsc (команда из Global Constraints) → 0 ошибок.
  - `../../node_modules/.bin/oxlint core/lib/ppm-design.ts app/root.tsx tests/ppm-design` → 0 errors.
  - `../../node_modules/.bin/oxfmt core/lib/ppm-design.ts app/root.tsx vite.config.ts tests/ppm-design/ppm-design.test.ts tests/ppm-design/flag-wiring.test.ts ../../turbo.json`
- [ ] **Step 13: Живой смоук (только GET к :3000)**
  `curl -s http://127.0.0.1:3000/sign-in | grep -o 'data-ppm-design="[a-z0-9]*"\|data-ppm-density="[a-z]*"\|function(){var m="on"\|prefers-color-scheme: dark' | sort -u`
  Ожидание: `data-ppm-design="v2"`, `data-ppm-density="comfortable"`, `function(){var m="on"`, `prefers-color-scheme: dark`.

**Приёмка F1:**
- [ ] Spec A: флаг `PPM_DESIGN_V2` (по умолчанию `1`), атрибут `html[data-ppm-design="v2"]`; `0` → `v1`;
  `localStorage.ppm_design="v1"` → `v1` до первой отрисовки; при `preview` личное включение `v2` (таблица 10/10).
- [ ] R1: один флаг на волну; бренд выключен → всегда `v1`, скрипта нет.
- [ ] R2: `defaultTheme="system"` только при v2 по сборке; при `0`/`preview` — тёмная, как в волне 0; brand off — upstream.
- [ ] R3 (основа): `ppm_density` только в localStorage, атрибут до первой отрисовки, `setPpmDensity` без записи на сервер.
- [ ] R20: `meta theme-color` под v2 — `#f2efea` / `#11100e` (канва v2), под v1 — прежний `#0E0F12`; знак и манифест не тронуты.
- [ ] CONTRACTS §1 — все имена и сигнатуры, включая `isPpmDesignV2()` без DOM (сборочный флаг).

---

### Task 2 (F2): Токены v2: роли обеих тем, акцент, статусы, типы, Холст, форма, плотности, типографика

**Files:**
- Modify: `packages/ppm-brand/src/tokens-v2.css` (заглушка F1 → полный файл).
- Create: `packages/ppm-brand/src/__tests__/token-contract-v2.test.ts`.
- Modify: `apps/web/styles/globals.css:2` (подключение сразу после `tokens.css`).

**Interfaces:**
- Consumes: мост волны 0 в `tokens.css` (`--bg-*`/`--txt-*`/`--border-*` → `--ppm-color-*`, `:187-241`), экспорт
  `@ppm/brand/tokens-v2.css` и `PPM_THEME_COLOR_V2` из F1.
- Produces: все токены «Итоговой таблицы имён» (цвет обеих тем, статусы, типы, Холст, форма, тени, фокус, плотности,
  типографика, геометрия Холста) под `:where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]`; мост v2.

Решения исполнителя (значения TOKENS.md, кроме отмеченных «UX1.1 F»; причины — `plan-F-needs.md` п. 3):
- тёмная `--ppm-color-layer-2` = значение `layer-1` (TOKENS §1, столбец «мост»: `layer-1` → `--bg-layer-1 · --bg-layer-2`);
  значение §2 (L 0,276) давало границе поля (`border-control`) 2,94:1 на `bg-layer-2` — это поля ввода Plane;
- тёмная `--ppm-color-layer-3-selected` L 0,338 → 0,326: подсказка в поле (`text-placeholder`) была 4,44:1;
- добавлены `--ppm-color-danger-hover/-active` (опасная кнопка при наведении/нажатии; на прежней красной шкале Plane
  светлая подпись давала 4,19:1);
- `--ppm-color-selection-bg` задан готовым OKLCH (`#233031`/`#e5ecec`, как в артбордах), а не `color-mix()`;
- на ярких заливках success/warning в v2 остаётся тёмная подпись (в светлой теме v2 `on-accent` светлый).

- [ ] **Step 1: Сохранить исходники**
  `$T/ux11-pre.sh packages/ppm-brand/src/__tests__/token-contract-v2.test.ts apps/web/styles/globals.css`
  (`tokens-v2.css` сохранён в F1 как `.__absent__` — откат удалит файл целиком).
- [ ] **Step 2: Написать падающий контракт-тест** — `packages/ppm-brand/src/__tests__/token-contract-v2.test.ts`:
  ```ts
  // UX1.1 F2: contract for the v2 token layer («гибрид A+B»). Parses tokens-v2.css, converts OKLCH -> sRGB and checks
  // WCAG 2.x ratios per role in both themes. Spec acceptance #1: text >= 4.5:1, meaningful borders/icons >= 3:1.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { PPM_THEME_COLOR_V2 } from "../index";

  const source = readFileSync(new URL("../tokens-v2.css", import.meta.url), "utf8");

  type Rule = { selector: string; decls: Map<string, string> };
  function parseRules(css: string): Rule[] {
    const rules: Rule[] = [];
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const stack: number[] = [];
    let start = 0;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === "{") {
        stack.push(start);
        start = i + 1;
      } else if (ch === "}") {
        const body = clean.slice(start, i);
        const open = clean.lastIndexOf("{", start - 1);
        const selStart = Math.max(clean.lastIndexOf("}", open - 1), clean.lastIndexOf("{", open - 1)) + 1;
        const selector = clean.slice(selStart, open).trim().replace(/\s+/g, " ");
        if (!body.includes("{")) {
          const decls = new Map<string, string>();
          for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls.set(m[1], m[2].trim());
          rules.push({ selector, decls });
        }
        start = stack.pop() ?? 0;
      }
    }
    return rules;
  }
  const rules = parseRules(source);
  const HTML_V2 = ':where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]';
  const LOCAL_V2 = ':where([data-ppm-brand="enabled"][data-ppm-design="v2"])';
  const findRule = (selector: string) => {
    const rule = rules.find((r) => r.selector === selector);
    if (!rule) throw new Error(`rule not found: ${selector}`);
    return rule;
  };
  const constants = findRule(HTML_V2);
  const compact = findRule(`${HTML_V2}[data-ppm-density="compact"]`);
  const lightRoles = findRule(`${HTML_V2}, ${LOCAL_V2} [data-theme*="light"]`);
  const darkRoles = findRule(`${HTML_V2}:where([data-theme*="dark"]), ${LOCAL_V2} [data-theme*="dark"]`);
  const bridge = findRule(`${HTML_V2}, ${LOCAL_V2} :is([data-theme*="light"], [data-theme*="dark"])`);
  const borders = findRule(
    `${HTML_V2}:not([data-theme$="-contrast"]), ${LOCAL_V2} :is([data-theme="light"], [data-theme="dark"])`
  );

  function resolve(theme: Rule, name: string, depth = 0): string {
    const raw = theme.decls.get(name) ?? bridge.decls.get(name) ?? borders.decls.get(name) ?? constants.decls.get(name);
    if (raw === undefined) throw new Error(`unresolved ${name}`);
    if (depth > 10) throw new Error(`cycle at ${name}`);
    const ref = raw.match(/^var\((--[\w-]+)\)$/);
    return ref ? resolve(theme, ref[1], depth + 1) : raw;
  }
  function toLinear(c: number) {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }
  function srgb(color: string): [number, number, number] {
    const ok = color.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/);
    if (!ok) throw new Error(`unsupported colour ${color}`);
    const [L, C, H] = ok.slice(1).map(Number);
    const a = C * Math.cos((H * Math.PI) / 180),
      b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
    return lin.map((v) => {
      const x = Math.min(1, Math.max(0, v));
      return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    }) as [number, number, number];
  }
  function luminance(color: string) {
    const [r, g, b] = srgb(color).map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  function ratio(fg: string, bg: string) {
    const [x, y] = [luminance(fg), luminance(bg)].toSorted((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  }
  const hex = (color: string) =>
    "#" +
    srgb(color)
      .map((v) => Math.round(v * 255).toString(16).padStart(2, "0"))
      .join("");

  const THEMES = { light: lightRoles, dark: darkRoles } as const;
  const SURFACES = [
    "canvas",
    "surface-1",
    "surface-2",
    "layer-1",
    "layer-1-hover",
    "layer-1-selected",
    "layer-2",
    "layer-2-hover",
    "layer-2-selected",
    "layer-3",
    "layer-3-hover",
    "layer-3-selected",
    "selection-bg",
  ];
  const TEXT = ["text", "text-secondary", "text-muted", "text-placeholder", "accent-text", "danger-text"];
  // Meaningful non-text marks: control borders, focus/selection, quiet icons, status glyphs, type icons, canvas lines.
  const MARKS = [
    "--ppm-color-border-control",
    "--ppm-color-border-strong",
    "--ppm-color-border-emphasis",
    "--ppm-color-focus",
    "--ppm-color-selection",
    "--ppm-color-icon-subtle",
    "--ppm-color-danger-line",
    "--ppm-status-backlog",
    "--ppm-status-todo",
    "--ppm-status-progress",
    "--ppm-status-review",
    "--ppm-status-done",
    "--ppm-status-cancelled",
    "--ppm-type-task",
    "--ppm-type-doc",
    "--ppm-type-file",
    "--ppm-type-code",
    "--ppm-type-decision",
    "--ppm-color-link",
    "--ppm-color-section-tick",
    "--ppm-color-card-found-border",
  ];
  const MARK_SURFACES = ["canvas", "surface-1", "surface-2", "layer-1", "layer-2", "board"];

  describe("PPM token contract v2 (UX1.1, гибрид A+B)", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      const role = (r: string) => resolve(theme, `--ppm-color-${r}`);

      it(`${name}: every text role is >= 4.5:1 on every surface, state and the selection fill`, () => {
        for (const t of TEXT)
          for (const s of SURFACES) expect(ratio(role(t), role(s)), `${t} on ${s}`).toBeGreaterThanOrEqual(4.5);
      });

      it(`${name}: labels on accent and danger fills are >= 4.5:1`, () => {
        for (const f of ["accent", "accent-hover", "accent-active"])
          expect(ratio(resolve(theme, "--txt-on-accent"), role(f)), f).toBeGreaterThanOrEqual(4.5);
        for (const f of ["danger", "danger-hover", "danger-active"])
          expect(ratio(resolve(theme, "--txt-on-color"), role(f)), f).toBeGreaterThanOrEqual(4.5);
      });

      it(`${name}: meaningful borders, icons, glyphs and canvas lines are >= 3:1`, () => {
        for (const mark of MARKS)
          for (const s of MARK_SURFACES)
            expect(ratio(resolve(theme, mark), role(s)), `${mark} on ${s}`).toBeGreaterThanOrEqual(3);
      });

      it(`${name}: focus differs from selection and states differ from their base`, () => {
        expect(role("focus")).not.toBe(role("selection"));
        expect(ratio(role("layer-1-hover"), role("layer-1"))).toBeGreaterThan(1.03);
        expect(ratio(role("layer-1-selected"), role("layer-1-hover"))).toBeGreaterThan(1.03);
        expect(ratio(role("selection-bg"), role("surface-1"))).toBeGreaterThan(1.03);
      });
    }

    it("both themes declare the same role set", () => {
      const keys = (r: Rule) => [...r.decls.keys()].toSorted();
      expect(keys(lightRoles)).toEqual(keys(darkRoles));
    });

    it("uses the owner-approved accent (R22) and the canvas colour behind meta theme-color (R20)", () => {
      expect(darkRoles.decls.get("--ppm-color-accent")).toBe("oklch(0.8 0.1 212)");
      expect(lightRoles.decls.get("--ppm-color-accent")).toBe("oklch(0.49 0.09 228)");
      expect(hex(resolve(darkRoles, "--ppm-color-canvas"))).toBe(PPM_THEME_COLOR_V2.dark);
      expect(hex(resolve(lightRoles, "--ppm-color-canvas"))).toBe(PPM_THEME_COLOR_V2.light);
    });

    it("gates every rule twice: brand enabled and design v2", () => {
      for (const r of rules) {
        expect(r.selector, r.selector).toContain('data-ppm-brand="enabled"');
        expect(r.selector, r.selector).toContain('data-ppm-design="v2"');
      }
    });

    it("keeps the flattened specificity and leaves Plane high-contrast borders alone", () => {
      for (const r of [lightRoles, darkRoles, bridge, constants, compact])
        for (const k of r.decls.keys()) expect(k.startsWith("--border-"), `${k} in ${r.selector}`).toBe(false);
      expect(source).not.toMatch(/html\[data-ppm-brand="enabled"\]\[data-theme/);
      expect(source).not.toContain("!important");
    });

    it("compact density only tightens: every compact value <= comfortable, text never below 11px", () => {
      const rem = (v: string) => Number(v.replace("rem", ""));
      for (const [k, v] of compact.decls) {
        expect(constants.decls.has(k), `${k} has a comfortable value`).toBe(true);
        expect(rem(v), k).toBeLessThanOrEqual(rem(constants.decls.get(k)!));
      }
      for (const r of [constants, compact])
        for (const [k, v] of r.decls)
          if (/^--ppm-text-.*-size$/.test(k)) expect(rem(v), k).toBeGreaterThanOrEqual(0.6875);
    });

    it("publishes the density scale of TOKENS §5 (comfortable / compact, px)", () => {
      const px = (r: Rule, k: string) => Math.round(Number(r.decls.get(k)!.replace("rem", "")) * 16);
      const table: Array<[string, number, number]> = [
        ["--ppm-row-height", 36, 32],
        ["--ppm-group-row-height", 36, 32],
        ["--ppm-table-head-height", 32, 28],
        ["--ppm-sidebar-item-height", 32, 28],
        ["--ppm-topbar-height", 48, 44],
        ["--ppm-page-header-height", 52, 44],
        ["--ppm-sprint-strip-height", 60, 52],
        ["--ppm-toolbar-height", 44, 40],
        ["--ppm-control-height", 32, 28],
        ["--ppm-control-height-sm", 28, 24],
        ["--ppm-page-padding-x", 24, 16],
        ["--ppm-cell-gap", 12, 8],
        ["--ppm-panel-padding", 20, 16],
        ["--ppm-avatar-size", 20, 18],
        ["--ppm-text-body-size", 14, 13],
        ["--ppm-text-mono-size", 12, 11],
      ];
      for (const [k, comfortable, dense] of table) {
        expect(px(constants, k), k).toBe(comfortable);
        expect(px(compact, k), k).toBe(dense);
      }
    });

    it("switches the monospace family to IBM Plex Mono and exposes the wdth narrowing token", () => {
      expect(constants.decls.get("--ppm-font-mono")).toMatch(/^"IBM Plex Mono",/);
      expect(constants.decls.get("--ppm-font-stretch-narrow")).toBe("85%");
      expect(source).not.toMatch(/jetbrains/i);
    });
  });
  ```
- [ ] **Step 3: Убедиться, что он падает**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/token-contract-v2.test.ts`
  Ожидание: FAIL при загрузке файла — `Error: rule not found: :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]`
  (в заглушке нет правил).
- [ ] **Step 4: Записать `packages/ppm-brand/src/tokens-v2.css` целиком** (сгенерирован из `drafts/tokens.mjs`; на этом
  файле тест Step 2 даёт 15/15):
  ```css
  /*
   * PPM design v2 («гибрид A+B», UX1.1): token layer.
   * Values: docs/superpowers/plans/2026-09-24-ux11/drafts/TOKENS.md (source tokens.mjs); deviations are marked "UX1.1 F".
   * Double gate: data-ppm-brand="enabled" AND data-ppm-design="v2" on <html>. PPM_DESIGN_V2=0 or
   * localStorage.ppm_design="v1" leaves only tokens.css (wave 0) in effect.
   * Specificity: role/bridge blocks are (0,1,0) like tokens.css and win by source order (this file is imported after it);
   * the compact block is (0,2,0) and wins over the comfortable block regardless of order.
   * Contract: src/__tests__/token-contract-v2.test.ts.
   */

  @layer base {
    /* ---------------- Constants: fonts, radii, spacing, motion, density «Удобная», typography, canvas geometry ---------------- */
    :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"] {
      --ppm-font-sans: "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;
      --ppm-font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      --ppm-font-stretch-narrow: 85%;

      --ppm-radius-xs: 0.25rem; /* chips, keys, badges, citation chip */
      --ppm-radius-sm: 0.375rem; /* buttons, fields, rows */
      --ppm-radius-md: 0.5rem; /* cards, popovers, menus */
      --ppm-radius-lg: 0.75rem; /* dialogs, large containers */
      --ppm-radius-full: 999px;
      --ppm-space-1: 0.25rem;
      --ppm-space-2: 0.5rem;
      --ppm-space-3: 0.75rem;
      --ppm-space-4: 1rem;
      --ppm-space-5: 1.25rem;
      --ppm-space-6: 1.5rem;
      --ppm-space-8: 2rem;
      --ppm-motion-fast: 120ms;
      --ppm-motion-base: 180ms;
      --ppm-focus-ring: 0 0 0 2px var(--ppm-color-focus-gap), 0 0 0 4px var(--ppm-color-focus);

      /* Density «Удобная» (TOKENS §5) */
      --ppm-row-height: 2.25rem;
      --ppm-group-row-height: 2.25rem;
      --ppm-table-head-height: 2rem;
      --ppm-sidebar-item-height: 2rem;
      --ppm-topbar-height: 3rem;
      --ppm-page-header-height: 3.25rem;
      --ppm-sprint-strip-height: 3.75rem;
      --ppm-toolbar-height: 2.75rem;
      --ppm-control-height: 2rem;
      --ppm-control-height-sm: 1.75rem;
      --ppm-page-padding-x: 1.5rem;
      --ppm-cell-gap: 0.75rem;
      --ppm-panel-padding: 1.25rem;
      --ppm-avatar-size: 1.25rem;
      --ppm-font-size-content: var(--ppm-text-body-size); /* CONTRACTS §2 alias */

      /* Typography «Удобная» (TOKENS §4): size / leading / weight / tracking per role */
      --ppm-text-display-size: 1.75rem; /* 28px/36px */
      --ppm-text-display-leading: 2.25rem;
      --ppm-text-display-weight: 600;
      --ppm-text-display-tracking: -0.02em;
      --ppm-text-title-1-size: 1.25rem; /* 20px/28px */
      --ppm-text-title-1-leading: 1.75rem;
      --ppm-text-title-1-weight: 600;
      --ppm-text-title-1-tracking: -0.01em;
      --ppm-text-title-2-size: 1rem; /* 16px/24px */
      --ppm-text-title-2-leading: 1.5rem;
      --ppm-text-title-2-weight: 600;
      --ppm-text-title-2-tracking: 0;
      --ppm-text-title-3-size: 0.875rem; /* 14px/20px */
      --ppm-text-title-3-leading: 1.25rem;
      --ppm-text-title-3-weight: 600;
      --ppm-text-title-3-tracking: 0;
      --ppm-text-body-size: 0.875rem; /* 14px/20px */
      --ppm-text-body-leading: 1.25rem;
      --ppm-text-body-weight: 400;
      --ppm-text-body-tracking: 0;
      --ppm-text-ui-size: 0.8125rem; /* 13px/20px */
      --ppm-text-ui-leading: 1.25rem;
      --ppm-text-ui-weight: 500;
      --ppm-text-ui-tracking: 0;
      --ppm-text-meta-size: 0.75rem; /* 12px/16px */
      --ppm-text-meta-leading: 1rem;
      --ppm-text-meta-weight: 400;
      --ppm-text-meta-tracking: 0;
      --ppm-text-mono-size: 0.75rem; /* 12px/16px */
      --ppm-text-mono-leading: 1rem;
      --ppm-text-mono-weight: 400;
      --ppm-text-mono-tracking: 0;
      --ppm-text-mono-sm-size: 0.6875rem; /* 11px/16px */
      --ppm-text-mono-sm-leading: 1rem;
      --ppm-text-mono-sm-weight: 500;
      --ppm-text-mono-sm-tracking: 0;

      /* Canvas geometry (TOKENS §11): chrome follows density, board objects do not */
      --ppm-sidebar-width: 14.5rem;
      --ppm-sidebar-width-collapsed: 3rem;
      --ppm-canvas-rail-width: 8.5rem;
      --ppm-canvas-rail-width-collapsed: 3rem;
      --ppm-inspector-width: 19rem;
      --ppm-canvas-overlay-inset: 1rem;
      --ppm-canvas-status-height: 2rem;
      --ppm-canvas-grid-step: 16px;
      --ppm-canvas-card-padding: 0.75rem;
      --ppm-canvas-card-footer-height: 2.25rem;
      --ppm-canvas-toolbar-height: 2rem;
      --ppm-canvas-handle-size: 0.5rem;
      --ppm-link-width: 1.5px;
      --ppm-link-width-emphasis: 2px;
      --ppm-link-width-visual: 1px;
      --ppm-link-dash: 4 3;
      --ppm-link-port-radius: 2.5px;
      --ppm-link-arrow-length: 6px;
      --ppm-link-arrow-width: 9px;
      --ppm-link-bar-length: 11px;
      --ppm-link-bar-thickness: 2px;
      --ppm-link-chip-height: 1.25rem;
    }

    /* ---------------- Density «Компактная»: (0,2,0), wins over the block above in any order ---------------- */
    :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"][data-ppm-density="compact"] {
      --ppm-row-height: 2rem;
      --ppm-group-row-height: 2rem;
      --ppm-table-head-height: 1.75rem;
      --ppm-sidebar-item-height: 1.75rem;
      --ppm-topbar-height: 2.75rem;
      --ppm-page-header-height: 2.75rem;
      --ppm-sprint-strip-height: 3.25rem;
      --ppm-toolbar-height: 2.5rem;
      --ppm-control-height: 1.75rem;
      --ppm-control-height-sm: 1.5rem;
      --ppm-page-padding-x: 1rem;
      --ppm-cell-gap: 0.5rem;
      --ppm-panel-padding: 1rem;
      --ppm-avatar-size: 1.125rem;
      --ppm-canvas-status-height: 1.75rem;
      --ppm-text-display-size: 1.5rem; /* 24px/32px */
      --ppm-text-display-leading: 2rem;
      --ppm-text-title-1-size: 1.125rem; /* 18px/24px */
      --ppm-text-title-1-leading: 1.5rem;
      --ppm-text-title-2-size: 0.9375rem; /* 15px/20px */
      --ppm-text-title-2-leading: 1.25rem;
      --ppm-text-title-3-size: 0.8125rem; /* 13px/20px */
      --ppm-text-title-3-leading: 1.25rem;
      --ppm-text-body-size: 0.8125rem; /* 13px/20px */
      --ppm-text-body-leading: 1.25rem;
      --ppm-text-mono-size: 0.6875rem; /* 11px/16px */
      --ppm-text-mono-leading: 1rem;
    }

    /* ---------------- Light «бумага и тушь» (default) ---------------- */
    :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"],
    :where([data-ppm-brand="enabled"][data-ppm-design="v2"]) [data-theme*="light"] {
      /* Surfaces */
      --ppm-color-canvas: oklch(0.952 0.007 80); /* #f2efea */
      --ppm-color-surface-1: oklch(0.986 0.004 80); /* #fcfaf7 */
      --ppm-color-surface-2: oklch(0.966 0.006 80); /* #f6f3ef */
      --ppm-color-layer-1: oklch(1 0 0); /* #ffffff */
      --ppm-color-layer-1-hover: oklch(0.945 0.007 80); /* #efece8 */
      --ppm-color-layer-1-selected: oklch(0.922 0.008 80); /* #e8e5df */
      --ppm-color-layer-2: oklch(1 0 0); /* #ffffff */
      --ppm-color-layer-2-hover: oklch(0.965 0.006 80); /* #f6f3ef */
      --ppm-color-layer-2-selected: oklch(0.935 0.008 80); /* #ece9e4 */
      --ppm-color-layer-3: oklch(0.972 0.006 80); /* #f8f5f1 */
      --ppm-color-layer-3-hover: oklch(0.945 0.007 80); /* #efece8 */
      --ppm-color-layer-3-selected: oklch(0.922 0.008 80); /* #e8e5df */
      --ppm-color-layer-disabled: oklch(0.94 0.006 80); /* #edebe7 */
      --ppm-color-alpha-hover: oklch(0.22 0.008 70 / 5%);
      --ppm-color-alpha-active: oklch(0.22 0.008 70 / 8%);
      --ppm-color-alpha-selected: oklch(0.22 0.008 70 / 10%);
      /* Borders: border is decorative; control/strong/emphasis are meaningful (>= 3:1) */
      --ppm-color-border: oklch(0.888 0.008 70); /* #ded9d4 */
      --ppm-color-border-control: oklch(0.6 0.01 70); /* #847f7a */
      --ppm-color-border-strong: oklch(0.54 0.01 70); /* #736e69 */
      --ppm-color-border-emphasis: oklch(0.5 0.01 70); /* #67625d */
      /* Text and icons */
      --ppm-color-text: oklch(0.22 0.008 70); /* #1d1a17 */
      --ppm-color-text-secondary: oklch(0.38 0.01 70); /* #46423d */
      --ppm-color-text-muted: oklch(0.48 0.01 70); /* #615d58 */
      --ppm-color-text-placeholder: oklch(0.5 0.01 70); /* #67625d */
      --ppm-color-icon-subtle: oklch(0.56 0.01 70); /* #78746e */
      --ppm-color-text-disabled: oklch(0.68 0.008 70); /* #9c9793 */
      /* One accent: cyan 212 (dark) / ink 228 (light). Focus != selection. */
      --ppm-color-accent: oklch(0.49 0.09 228); /* #126a88 */
      --ppm-color-accent-hover: oklch(0.44 0.085 228); /* #025b77 */
      --ppm-color-accent-active: oklch(0.4 0.08 228); /* #004f69 */
      --ppm-color-accent-text: oklch(0.49 0.09 228); /* #126a88 */
      --ppm-color-accent-text-hover: oklch(0.44 0.085 228); /* #025b77 */
      --ppm-color-icon-accent-subtle: oklch(0.55 0.09 228); /* #2b7b9b */
      --ppm-color-on-accent: oklch(0.99 0.004 80); /* #fdfbf9 */
      --ppm-color-focus: oklch(0.44 0.085 228); /* #025b77 */
      --ppm-color-focus-gap: var(--ppm-color-surface-1);
      --ppm-color-selection: oklch(0.49 0.09 228); /* #126a88 */
      --ppm-color-selection-bg: oklch(0.938 0.007 197); /* #e5ecec = accent 10% over surface-1 */
      /* Signal: red only for blockers, conflicts and destructive actions */
      --ppm-color-danger: oklch(0.52 0.165 27); /* #b53530 */
      --ppm-color-danger-hover: oklch(0.47 0.155 27); /* #a02a26, UX1.1 F: derived, on-danger >= 4.5:1 */
      --ppm-color-danger-active: oklch(0.43 0.145 27); /* #8f221f, UX1.1 F: derived, on-danger >= 4.5:1 */
      --ppm-color-on-danger: oklch(0.99 0.004 80); /* #fdfbf9 */
      --ppm-color-danger-text: oklch(0.52 0.165 27); /* #b53530 */
      --ppm-color-danger-line: oklch(0.56 0.17 28); /* #c44037 */
      --ppm-color-warning: oklch(0.56 0.115 68); /* #a06616 */
      --ppm-color-success: oklch(0.53 0.115 150); /* #307e46 */
      /* Task statuses: glyph shape + colour + word */
      --ppm-status-backlog: var(--ppm-color-icon-subtle);
      --ppm-status-todo: var(--ppm-color-text-secondary);
      --ppm-status-progress: oklch(0.6 0.12 70); /* #ad721c */
      --ppm-status-review: oklch(0.53 0.12 305); /* #7c58a3 */
      --ppm-status-done: oklch(0.55 0.12 150); /* #33854a */
      --ppm-status-cancelled: var(--ppm-color-icon-subtle);
      /* Object types: equal lightness */
      --ppm-type-task: oklch(0.52 0.08 265); /* #526897 */
      --ppm-type-doc: oklch(0.52 0.08 330); /* #83587f */
      --ppm-type-file: oklch(0.52 0.08 95); /* #77682e */
      --ppm-type-code: oklch(0.52 0.08 40); /* #905845 */
      --ppm-type-decision: oklch(0.52 0.08 160); /* #3b7759 */
      /* Team colour: project avatar only */
      --ppm-project-avatar-bg: oklch(0.91 0.045 135); /* #d5e9cb */
      --ppm-project-avatar-fg: oklch(0.4 0.08 135); /* #345123 */
      /* Canvas */
      --ppm-color-board: oklch(0.975 0.008 80); /* #faf6f1 */
      --ppm-color-board-grid: oklch(0.87 0.012 80); /* #d8d3cc */
      --ppm-color-section-tick: oklch(0.56 0.01 70); /* #78746e */
      --ppm-color-link: oklch(0.48 0.01 70); /* #615d58 */
      --ppm-color-link-visual: oklch(0.6 0.01 70); /* #847f7a */
      --ppm-color-link-emphasis: var(--ppm-color-text-secondary);
      --ppm-color-card-live: var(--ppm-color-surface-1);
      --ppm-color-card-own: var(--ppm-color-layer-1);
      --ppm-color-card-found-border: var(--ppm-color-border-control);
      --ppm-shadow-popover: 0 1px 2px oklch(0.22 0.008 70 / 0.08), 0 8px 24px -4px oklch(0.22 0.008 70 / 0.16);
      /* Wave-0 canvas node roles re-pointed to the v2 roles (TOKENS §2) */
      --ppm-node-task: var(--ppm-type-task);
      --ppm-node-decision: var(--ppm-type-decision);
      --ppm-node-note: var(--ppm-color-text-secondary);
      --ppm-node-risk: var(--ppm-color-danger-text);
      --ppm-node-project: var(--ppm-project-avatar-fg);
      /* Plane neutral and brand scales (TOKENS §3): Plane paints unbridged places and high-contrast borders through them */
      --neutral-white: oklch(1 0 0); /* #ffffff */
      --neutral-100: oklch(0.986 0.004 80); /* #fcfaf7 */
      --neutral-200: oklch(0.966 0.006 80); /* #f6f3ef */
      --neutral-300: oklch(0.952 0.007 80); /* #f2efea */
      --neutral-400: oklch(0.935 0.008 80); /* #ece9e4 */
      --neutral-500: oklch(0.922 0.008 80); /* #e8e5df */
      --neutral-600: oklch(0.888 0.008 70); /* #ded9d4 */
      --neutral-700: oklch(0.68 0.008 70); /* #9c9793 */
      --neutral-800: oklch(0.6 0.01 70); /* #847f7a */
      --neutral-900: oklch(0.5 0.01 70); /* #67625d */
      --neutral-1000: oklch(0.48 0.01 70); /* #615d58 */
      --neutral-1100: oklch(0.38 0.01 70); /* #46423d */
      --neutral-1200: oklch(0.22 0.008 70); /* #1d1a17 */
      --neutral-black: oklch(0.17 0.006 70); /* #110f0d */
      --brand-100: oklch(0.975 0.012 228); /* #eff9fd */
      --brand-200: oklch(0.95 0.025 228); /* #def2fc */
      --brand-300: oklch(0.91 0.045 228); /* #c3e8f9 */
      --brand-400: oklch(0.84 0.065 228); /* #9ed4ec */
      --brand-500: oklch(0.72 0.085 228); /* #68afcf */
      --brand-600: oklch(0.6 0.09 228); /* #3c8baa */
      --brand-700: oklch(0.49 0.09 228); /* #126a88 */
      --brand-800: oklch(0.44 0.085 228); /* #025b77 */
      --brand-900: oklch(0.4 0.08 228); /* #004f69 */
      --brand-1000: oklch(0.34 0.062 228); /* #083e51 */
      --brand-1100: oklch(0.28 0.055 228); /* #002e3e */
      --brand-1200: oklch(0.22 0.04 228); /* #021e29 */
      --brand-default: var(--ppm-color-accent-text);
    }

    /* ---------------- Dark «Тихий графит» ---------------- */
    :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]:where([data-theme*="dark"]),
    :where([data-ppm-brand="enabled"][data-ppm-design="v2"]) [data-theme*="dark"] {
      /* Surfaces */
      --ppm-color-canvas: oklch(0.172 0.004 70); /* #11100e */
      --ppm-color-surface-1: oklch(0.2 0.005 70); /* #181614 */
      --ppm-color-surface-2: oklch(0.226 0.006 70); /* #1e1c19 */
      --ppm-color-layer-1: oklch(0.252 0.006 70); /* #24221f */
      --ppm-color-layer-1-hover: oklch(0.276 0.007 70); /* #2a2724 */
      --ppm-color-layer-1-selected: oklch(0.302 0.007 70); /* #312e2b */
      --ppm-color-layer-2: oklch(0.252 0.006 70); /* #24221f, = layer-1 (TOKENS §1 bridge column); border-control on inputs stays >= 3:1 */
      --ppm-color-layer-2-hover: oklch(0.302 0.007 70); /* #312e2b */
      --ppm-color-layer-2-selected: oklch(0.326 0.008 70); /* #373430 */
      --ppm-color-layer-3: oklch(0.29 0.007 70); /* #2e2b28 */
      --ppm-color-layer-3-hover: oklch(0.314 0.008 70); /* #34312d */
      --ppm-color-layer-3-selected: oklch(0.326 0.008 70); /* #373430, TOKENS 0.338 -> 0.326: placeholder text >= 4.5:1 */
      --ppm-color-layer-disabled: oklch(0.276 0.007 70); /* #2a2724 */
      --ppm-color-alpha-hover: oklch(0.955 0.004 70 / 6%);
      --ppm-color-alpha-active: oklch(0.955 0.004 70 / 9%);
      --ppm-color-alpha-selected: oklch(0.955 0.004 70 / 12%);
      /* Borders: border is decorative; control/strong/emphasis are meaningful (>= 3:1) */
      --ppm-color-border: oklch(0.34 0.008 70); /* #3b3734 */
      --ppm-color-border-control: oklch(0.54 0.008 70); /* #726e6a */
      --ppm-color-border-strong: oklch(0.6 0.008 70); /* #837f7b */
      --ppm-color-border-emphasis: oklch(0.66 0.008 70); /* #95918d */
      /* Text and icons */
      --ppm-color-text: oklch(0.955 0.004 70); /* #f2f0ed */
      --ppm-color-text-secondary: oklch(0.84 0.006 70); /* #cdcac6 */
      --ppm-color-text-muted: oklch(0.73 0.007 70); /* #aba7a3 */
      --ppm-color-text-placeholder: oklch(0.7 0.007 70); /* #a19e9a */
      --ppm-color-icon-subtle: oklch(0.63 0.008 70); /* #8c8884 */
      --ppm-color-text-disabled: oklch(0.52 0.008 70); /* #6c6864 */
      /* One accent: cyan 212 (dark) / ink 228 (light). Focus != selection. */
      --ppm-color-accent: oklch(0.8 0.1 212); /* #67cfe3 */
      --ppm-color-accent-hover: oklch(0.86 0.085 212); /* #8ce0f1 */
      --ppm-color-accent-active: oklch(0.74 0.1 212); /* #52bccf */
      --ppm-color-accent-text: oklch(0.8 0.1 212); /* #67cfe3 */
      --ppm-color-accent-text-hover: oklch(0.86 0.085 212); /* #8ce0f1 */
      --ppm-color-icon-accent-subtle: oklch(0.86 0.085 212); /* #8ce0f1 */
      --ppm-color-on-accent: oklch(0.2 0.03 212); /* #031a1e */
      --ppm-color-focus: oklch(0.86 0.085 212); /* #8ce0f1 */
      --ppm-color-focus-gap: var(--ppm-color-surface-1);
      --ppm-color-selection: oklch(0.8 0.1 212); /* #67cfe3 */
      --ppm-color-selection-bg: oklch(0.298 0.018 202); /* #233031 = accent 14% over surface-1 */
      /* Signal: red only for blockers, conflicts and destructive actions */
      --ppm-color-danger: oklch(0.5 0.135 25); /* #a23d3a */
      --ppm-color-danger-hover: oklch(0.46 0.13 25); /* #933331, UX1.1 F: derived, on-danger >= 4.5:1 */
      --ppm-color-danger-active: oklch(0.43 0.125 25); /* #872c2a, UX1.1 F: derived, on-danger >= 4.5:1 */
      --ppm-color-on-danger: oklch(0.955 0.004 70); /* #f2f0ed */
      --ppm-color-danger-text: oklch(0.74 0.12 25); /* #ed8c84 */
      --ppm-color-danger-line: oklch(0.68 0.13 25); /* #dd766f */
      --ppm-color-warning: oklch(0.8 0.11 75); /* #e7b369 */
      --ppm-color-success: oklch(0.76 0.11 150); /* #7cc58c */
      /* Task statuses: glyph shape + colour + word */
      --ppm-status-backlog: var(--ppm-color-icon-subtle);
      --ppm-status-todo: var(--ppm-color-text-secondary);
      --ppm-status-progress: oklch(0.8 0.11 75); /* #e7b369 */
      --ppm-status-review: oklch(0.76 0.1 300); /* #bba3e8 */
      --ppm-status-done: oklch(0.76 0.11 150); /* #7cc58c */
      --ppm-status-cancelled: var(--ppm-color-icon-subtle);
      /* Object types: equal lightness */
      --ppm-type-task: oklch(0.76 0.07 265); /* #9bb1de */
      --ppm-type-doc: oklch(0.76 0.07 330); /* #cba1c6 */
      --ppm-type-file: oklch(0.76 0.07 95); /* #bfb17e */
      --ppm-type-code: oklch(0.76 0.07 40); /* #d9a390 */
      --ppm-type-decision: oklch(0.76 0.07 160); /* #8abfa2 */
      /* Team colour: project avatar only */
      --ppm-project-avatar-bg: oklch(0.34 0.045 135); /* #2e3d25 */
      --ppm-project-avatar-fg: oklch(0.86 0.08 135); /* #bbdda9 */
      /* Canvas */
      --ppm-color-board: oklch(0.172 0.004 70); /* #11100e */
      --ppm-color-board-grid: oklch(0.3 0.006 70); /* #302d2b */
      --ppm-color-section-tick: oklch(0.63 0.008 70); /* #8c8884 */
      --ppm-color-link: oklch(0.73 0.007 70); /* #aba7a3 */
      --ppm-color-link-visual: oklch(0.54 0.008 70); /* #726e6a */
      --ppm-color-link-emphasis: var(--ppm-color-text-secondary);
      --ppm-color-card-live: var(--ppm-color-surface-1);
      --ppm-color-card-own: var(--ppm-color-layer-1);
      --ppm-color-card-found-border: var(--ppm-color-border-control);
      --ppm-shadow-popover: 0 1px 2px oklch(0 0 0 / 0.4), 0 8px 24px oklch(0 0 0 / 0.45);
      /* Wave-0 canvas node roles re-pointed to the v2 roles (TOKENS §2) */
      --ppm-node-task: var(--ppm-type-task);
      --ppm-node-decision: var(--ppm-type-decision);
      --ppm-node-note: var(--ppm-color-text-secondary);
      --ppm-node-risk: var(--ppm-color-danger-text);
      --ppm-node-project: var(--ppm-project-avatar-fg);
      /* Plane neutral and brand scales (TOKENS §3): Plane paints unbridged places and high-contrast borders through them */
      --neutral-black: oklch(0.15 0.003 70); /* #0c0b0a */
      --neutral-100: oklch(0.172 0.004 70); /* #11100e */
      --neutral-200: oklch(0.2 0.005 70); /* #181614 */
      --neutral-300: oklch(0.226 0.006 70); /* #1e1c19 */
      --neutral-400: oklch(0.252 0.006 70); /* #24221f */
      --neutral-500: oklch(0.302 0.007 70); /* #312e2b */
      --neutral-600: oklch(0.34 0.008 70); /* #3b3734 */
      --neutral-700: oklch(0.52 0.008 70); /* #6c6864 */
      --neutral-800: oklch(0.6 0.008 70); /* #837f7b */
      --neutral-900: oklch(0.7 0.007 70); /* #a19e9a */
      --neutral-1000: oklch(0.73 0.007 70); /* #aba7a3 */
      --neutral-1100: oklch(0.84 0.006 70); /* #cdcac6 */
      --neutral-1200: oklch(0.955 0.004 70); /* #f2f0ed */
      --neutral-white: oklch(0.985 0.003 70); /* #fbfaf8 */
      --brand-100: oklch(0.27 0.04 212); /* #092c32 */
      --brand-200: oklch(0.32 0.05 212); /* #0a3942 */
      --brand-300: oklch(0.4 0.065 212); /* #0d515c */
      --brand-400: oklch(0.5 0.08 212); /* #196f7e */
      --brand-500: oklch(0.6 0.09 212); /* #2f8e9f */
      --brand-600: oklch(0.7 0.1 212); /* #44afc3 */
      --brand-700: oklch(0.8 0.1 212); /* #67cfe3 */
      --brand-800: oklch(0.86 0.085 212); /* #8ce0f1 */
      --brand-900: oklch(0.91 0.06 212); /* #b4edf9 */
      --brand-1000: oklch(0.94 0.04 212); /* #cef3fb */
      --brand-1100: oklch(0.965 0.025 212); /* #e1f8fd */
      --brand-1200: oklch(0.985 0.012 212); /* #f2fcff */
      --brand-default: var(--ppm-color-accent);
    }

    /* ---------------- v2 bridge additions (theme-agnostic; the wave-0 bridge in tokens.css stays in force) ---------------- */
    :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"],
    :where([data-ppm-brand="enabled"][data-ppm-design="v2"]) :is([data-theme*="light"], [data-theme*="dark"]) {
      --bg-accent-subtle: var(--ppm-color-selection-bg);
      --bg-danger-primary: var(--ppm-color-danger);
      --bg-danger-primary-hover: var(--ppm-color-danger-hover);
      --bg-danger-primary-active: var(--ppm-color-danger-active);
      --bg-danger-primary-selected: var(--ppm-color-danger-active);
      --txt-on-accent: var(--ppm-color-on-accent);
      --txt-on-color: var(--ppm-color-on-danger);
      --txt-danger-primary: var(--ppm-color-danger-text);
      --txt-warning-primary: var(--ppm-color-warning);
      --txt-success-primary: var(--ppm-color-success);
    }

    /* Bright success/warning fills keep dark ink in v2 too: the v2 light on-accent is a light label (tokens.css
       points --txt-on-color at --txt-on-accent for these fills). */
    :where([data-ppm-brand="enabled"][data-ppm-design="v2"]) :where(.bg-success-primary, .bg-warning-primary) {
      --txt-on-color: oklch(0.2 0.03 212); /* #031a1e */
    }

    /* Borders only outside Plane's high-contrast themes (same rule as tokens.css). */
    :where(html[data-ppm-design="v2"])[data-ppm-brand="enabled"]:not([data-theme$="-contrast"]),
    :where([data-ppm-brand="enabled"][data-ppm-design="v2"]) :is([data-theme="light"], [data-theme="dark"]) {
      --border-danger-strong: var(--ppm-color-danger-line);
    }
  }
  ```
- [ ] **Step 5: Прогнать пакет**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
  Ожидание: **5 файлов / 66** (51 + 15), старые `token-contract.test.ts` и `brand.test.ts` зелёные без правок (v1 не
  тронут), аудиты PASS, tsc 0. Пересборка не нужна: CSS web берёт из `src` по экспорту.
- [ ] **Step 6: Подключить в `apps/web/styles/globals.css`** — после `:2` (`@import "@ppm/brand/tokens.css";`) строка:
  ```css
  @import "@ppm/brand/tokens-v2.css";
  ```
- [ ] **Step 7: Проверить**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run` → **32 / 196** (без изменений).
  - `cd $PF/packages/ppm-brand && node scripts/audit-tailwind-classes.mjs` → PASS (дизайн-система грузится с новым импортом).
  - Живой смоук (браузер контроллера, только чтение): в консоли
    `getComputedStyle(document.documentElement).getPropertyValue("--ppm-color-canvas").trim()` → `oklch(0.172 0.004 70)`
    в тёмной теме и `oklch(0.952 0.007 80)` в светлой; при `document.documentElement.dataset.ppmDesign = "v1"` (без
    перезагрузки) — прежнее значение волны 0 `oklch(0.1687 0.0065 271.01)`; вернуть `"v2"`. Цвета v2 владелец увидит
    сразу (HMR CSS).

**Приёмка F2:**
- [ ] Spec B, «Токены»: тёплый графит, «бумага и тушь», голубой акцент 212/228 (R22) и ступени `--brand-*`, статусы,
  категориальная палитра типов равной светлоты, фокус ≠ выделение — значения TOKENS.md (отклонения помечены «UX1.1 F»).
- [ ] Критерий приёмки 1: текст ≥ 4,5:1, смысловые границы/глифы/линии ≥ 3:1 в обеих темах; плотности: компактная
  только уменьшает, текст ≥ 11 px.
- [ ] R19 (основа): радиусы 4/6/8/12 и `--ppm-shadow-popover` по теме; применение — F3.
- [ ] Нужды C §2 и T N4: все перечисленные токены есть (включая `--ppm-canvas-status-height` 32/28, «Холст»-роли, §11).
- [ ] Откат: при `v1` правила файла не совпадают ни с одним элементом (двойной шлюз каждого правила — тест).

---

### Task 3 (F3): Шрифты, API Tailwind v2 и системные правила

**Files:**
- Create: `apps/web/styles/ppm-v2/system.css`, `apps/web/styles/ppm-v2/shell.css` (заголовок; наполняет F5),
  `apps/web/styles/ppm-v2/tasks.css` (заголовок; дальше правит только линия T).
- Modify: `apps/web/styles/globals.css` (три импорта после `tokens-v2.css`).
- Modify: `apps/web/app/root.tsx:37-44` (шрифты) и `:69-79` (preload).
- Modify: `packages/ppm-brand/scripts/audit-tailwind-classes.mjs:26-33` (`customCssFiles`).
- Modify: `apps/web/tests/ppm-a11y/min-font-size.test.ts` (целиком).
- Create: `apps/web/tests/ppm-design/v2-css.test.ts`.

**Interfaces:**
- Consumes: токены F2 (`--ppm-text-*`, `--ppm-radius-*`, `--ppm-shadow-popover`, `--ppm-font-*`).
- Produces: варианты `ppm-v2:`/`ppm-compact:`, утилиты `ppm-text-*` и `ppm-font-narrow`; системные правила v2 (1 px у
  `border-[0.5px]`, lucide 1,5 px, плоские `shadow-raised-100`, тень+r8 у поповеров, тень+r12 у модалок); файлы
  `shell.css`/`tasks.css` подключены; Plex Sans с осью `wdth`, Plex Mono 500.

- [ ] **Step 1: Сохранить исходники**
  `$T/ux11-pre.sh apps/web/styles/ppm-v2/system.css apps/web/styles/ppm-v2/shell.css apps/web/styles/ppm-v2/tasks.css apps/web/tests/ppm-design/v2-css.test.ts apps/web/tests/ppm-a11y/min-font-size.test.ts packages/ppm-brand/scripts/audit-tailwind-classes.mjs`
  (`globals.css`, `root.tsx` уже сохранены).
- [ ] **Step 2: Написать падающие стражи**
  - `apps/web/tests/ppm-design/v2-css.test.ts`:
    ```ts
    // UX1.1 F3: guards for the v2 stylesheets (apps/web/styles/ppm-v2/*.css) and the font wiring.
    import { readFileSync } from "node:fs";
    import { describe, expect, it } from "vitest";

    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
    const code = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
    const STYLES = "../../styles/";
    // tasks.css (lane T) and canvas-v2.css (lane C) have their own guards (plan-T tasks-css.test.ts, plan-C).
    const V2_FILES = ["ppm-v2/system.css", "ppm-v2/shell.css"];
    const GATE = ':where(html[data-ppm-design="v2"]';
    const ROLES = ["display", "title-1", "title-2", "title-3", "body", "ui", "meta", "mono", "mono-sm"];

    /** Selectors of ordinary style rules (at-rule preludes such as @layer/@utility/@media are skipped). */
    function ruleSelectors(css: string): string[] {
      const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
      const selectors: string[] = [];
      let prelude = "";
      const stack: boolean[] = [];
      for (const ch of clean) {
        if (ch === "{") {
          const head = prelude.trim().replace(/\s+/g, " ");
          const insideUtility = stack.includes(true);
          const isAtRule = head.startsWith("@");
          if (!isAtRule && !insideUtility && !head.startsWith("&")) selectors.push(head);
          stack.push(isAtRule && head.startsWith("@utility"));
          prelude = "";
        } else if (ch === "}") {
          stack.pop();
          prelude = "";
        } else if (ch === ";") prelude = "";
        else prelude += ch;
      }
      return selectors;
    }
    /** Splits a selector list on top-level commas. */
    const splitList = (selector: string) => {
      const parts: string[] = [];
      let depth = 0;
      let current = "";
      for (const ch of selector) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) {
          parts.push(current.trim());
          current = "";
        } else current += ch;
      }
      parts.push(current.trim());
      return parts;
    };

    describe("v2 stylesheets (UX1.1)", () => {
      it("globals.css imports the v2 layers after tokens.css, in order", () => {
        const globals = read(`${STYLES}globals.css`);
        const order = [
          '@import "@ppm/brand/tokens.css";',
          '@import "@ppm/brand/tokens-v2.css";',
          '@import "./ppm-v2/system.css";',
          '@import "./ppm-v2/shell.css";',
          '@import "./ppm-v2/tasks.css";',
        ].map((line) => globals.indexOf(line));
        expect(order.every((index) => index >= 0)).toBe(true);
        expect(order).toEqual(order.toSorted((a, b) => a - b));
      });

      it("defines the ppm-v2 and ppm-compact variants exactly as CONTRACTS §2", () => {
        const system = read(`${STYLES}ppm-v2/system.css`);
        expect(system).toContain(
          '@custom-variant ppm-v2 (&:where([data-ppm-design="v2"], [data-ppm-design="v2"] *));'
        );
        expect(system).toContain(
          '@custom-variant ppm-compact (&:where([data-ppm-design="v2"][data-ppm-density="compact"], [data-ppm-design="v2"][data-ppm-density="compact"] *));'
        );
      });

      it("publishes the nine ppm-text-* roles with fallbacks and no text-* utility of its own", () => {
        const system = read(`${STYLES}ppm-v2/system.css`);
        for (const role of ROLES) {
          const body = system.slice(system.indexOf(`@utility ppm-text-${role} {`), system.indexOf("}", system.indexOf(`@utility ppm-text-${role} {`)));
          expect(body, role).toContain(`font-size: var(--ppm-text-${role}-size, `);
          expect(body, role).toContain(`line-height: var(--ppm-text-${role}-leading, `);
        }
        expect(system).not.toMatch(/@utility text-/);
      });

      it("gates every rule on the v2 design attribute and never uses !important", () => {
        for (const file of V2_FILES) {
          const css = code(read(`${STYLES}${file}`));
          for (const selector of ruleSelectors(css))
            for (const part of splitList(selector)) expect(part.startsWith(GATE), `${file}: ${part}`).toBe(true);
          expect(css, file).not.toContain("!important");
        }
      });

      it("gives every var(--ppm-*) a fallback (IACVT)", () => {
        for (const file of V2_FILES) {
          const bare = code(read(`${STYLES}${file}`)).match(/var\(--ppm-[\w-]+\)/g) ?? [];
          expect(bare, file).toEqual([]);
        }
      });

      it("does not remap Plane's global type scale (no --text-13 lever)", () => {
        for (const file of V2_FILES) expect(code(read(`${STYLES}${file}`)), file).not.toMatch(/--text-\d+\s*:/);
      });

      it("loads IBM Plex Sans with the wdth axis and Plex Mono 400/500, preloading Plex under the brand", () => {
        const root = read("../../app/root.tsx");
        expect(root).toContain('import "@fontsource-variable/ibm-plex-sans/wdth.css";');
        expect(root).not.toMatch(/import "@fontsource-variable\/ibm-plex-sans";/);
        expect(root).toContain('import "@fontsource/ibm-plex-mono";');
        expect(root).toContain('import "@fontsource/ibm-plex-mono/500.css";');
        expect(root).toContain('import "@fontsource-variable/jetbrains-mono";');
        expect(root).toMatch(
          /IS_PPM_BRAND_ENABLED \? \[plexSansCyrillicWoff2, plexSansLatinWoff2\] : \[interVariableWoff2\]/
        );
      });
    });
    ```
  - `apps/web/tests/ppm-a11y/min-font-size.test.ts` — заменить целиком (px и фолбэки `var()`, плюс CSS F):
    ```ts
    // UX0.2 Task 14 + UX1.1 F3: guard against sub-11px text creeping back into PPM screens. text-9/text-10 (9px/10px)
    // and inline text-[Npx] below 11px are banned in ppm-* components; every font-size in canvas.css and in the F-owned
    // v2 stylesheets (apps/web/styles/ppm-v2/system.css, shell.css) — rem, px or a var() fallback — must be >= 11px.
    // tasks.css (lane T) and canvas-v2.css (lane C) are covered by the lanes' own guards.
    import { readFileSync, readdirSync, statSync } from "node:fs";
    import { join } from "node:path";
    import { describe, expect, it } from "vitest";

    const ROOT = new URL("../../core/components/", import.meta.url).pathname;
    const STYLES = new URL("../../styles/ppm-v2/", import.meta.url).pathname;

    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? files(p) : [p];
      });

    const tooSmall = (css: string) =>
      [...css.matchAll(/font-size:\s*(?:var\([^,()]+,\s*)?([\d.]+)(rem|px)/g)]
        .filter(([, value, unit]) => (unit === "px" ? Number(value) < 11 : Number(value) < 0.6875))
        .map((match) => match[0]);

    describe("min font size", () => {
      it("has no text smaller than 11px in PPM screens", () => {
        const tsx = ["ppm-git", "ppm-vault", "ppm-admin", "ppm-shell", "ppm-canvas"]
          .flatMap((d) => files(join(ROOT, d)))
          .filter((f) => f.endsWith(".tsx"));
        const bad = tsx
          .flatMap((f) =>
            readFileSync(f, "utf8")
              .split("\n")
              .map((l, i) => [f, i + 1, l] as const)
          )
          .filter(([, , l]) => /\btext-(9|10)\b|text-\[(?:[0-9]|10)px\]/.test(l));
        expect(bad.map(([f, n]) => `${f}:${n}`)).toEqual([]);

        const stylesheets = [join(ROOT, "ppm-canvas/canvas.css"), join(STYLES, "system.css"), join(STYLES, "shell.css")];
        expect(stylesheets.flatMap((f) => tooSmall(readFileSync(f, "utf8")).map((m) => `${f}: ${m}`))).toEqual([]);
      });
    });
    ```
- [ ] **Step 3: Убедиться, что падают**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-design/v2-css.test.ts tests/ppm-a11y/min-font-size.test.ts`
  Ожидание: FAIL — `ENOENT … styles/ppm-v2/system.css`, порядок импортов (`-1`), шрифты (`wdth.css` не найден).
- [ ] **Step 4: Создать `apps/web/styles/ppm-v2/system.css`** (варианты и утилиты проверены загрузчиком дизайн-системы
  Tailwind 4.1.17: `ppm-v2:min-h-(--ppm-row-height,2.75rem)`, `ppm-compact:h-7`, `ppm-v2:ppm-text-mono` дают CSS;
  вариантные правила выводятся после базовых, правила `@layer utilities` — после сгенерированных утилит):
  ```css
  /*
   * PPM design v2 («гибрид A+B», UX1.1): Tailwind API and global paint rules.
   * Inert unless <html data-ppm-design="v2"> (set only when data-ppm-brand="enabled"). Every var() has a fallback.
   */

  /* `ppm-v2:` / `ppm-compact:` variants. Specificity equals the base utility; variant rules are emitted after the
     unprefixed ones, so `h-11 ppm-v2:h-(--ppm-row-height,2.75rem)` keeps wave 0 and switches instantly with the attribute. */
  @custom-variant ppm-v2 (&:where([data-ppm-design="v2"], [data-ppm-design="v2"] *));
  @custom-variant ppm-compact (&:where([data-ppm-design="v2"][data-ppm-density="compact"], [data-ppm-design="v2"][data-ppm-density="compact"] *));

  /* Typography roles (TOKENS §4). Deliberately NOT text-*: Plane's cn() (packages/utils/src/common.ts) treats unknown
     and arbitrary text-* classes as colours and drops them next to text-primary/secondary. Never combine a ppm-text-*
     class with text-11..14, text-body-*, text-caption-* or font-medium/semibold on the same element. Fallbacks are the
     «Удобная» values; use these classes only in v2 markup (usePpmDesignV2() branch or the ppm-v2: variant). */
  @utility ppm-text-display {
    font-size: var(--ppm-text-display-size, 1.75rem);
    line-height: var(--ppm-text-display-leading, 2.25rem);
    font-weight: var(--ppm-text-display-weight, 600);
    letter-spacing: var(--ppm-text-display-tracking, -0.02em);
  }
  @utility ppm-text-title-1 {
    font-size: var(--ppm-text-title-1-size, 1.25rem);
    line-height: var(--ppm-text-title-1-leading, 1.75rem);
    font-weight: var(--ppm-text-title-1-weight, 600);
    letter-spacing: var(--ppm-text-title-1-tracking, -0.01em);
  }
  @utility ppm-text-title-2 {
    font-size: var(--ppm-text-title-2-size, 1rem);
    line-height: var(--ppm-text-title-2-leading, 1.5rem);
    font-weight: var(--ppm-text-title-2-weight, 600);
    letter-spacing: var(--ppm-text-title-2-tracking, 0);
  }
  @utility ppm-text-title-3 {
    font-size: var(--ppm-text-title-3-size, 0.875rem);
    line-height: var(--ppm-text-title-3-leading, 1.25rem);
    font-weight: var(--ppm-text-title-3-weight, 600);
    letter-spacing: var(--ppm-text-title-3-tracking, 0);
  }
  @utility ppm-text-body {
    font-size: var(--ppm-text-body-size, 0.875rem);
    line-height: var(--ppm-text-body-leading, 1.25rem);
    font-weight: var(--ppm-text-body-weight, 400);
    letter-spacing: var(--ppm-text-body-tracking, 0);
  }
  @utility ppm-text-ui {
    font-size: var(--ppm-text-ui-size, 0.8125rem);
    line-height: var(--ppm-text-ui-leading, 1.25rem);
    font-weight: var(--ppm-text-ui-weight, 500);
    letter-spacing: var(--ppm-text-ui-tracking, 0);
  }
  @utility ppm-text-meta {
    font-size: var(--ppm-text-meta-size, 0.75rem);
    line-height: var(--ppm-text-meta-leading, 1rem);
    font-weight: var(--ppm-text-meta-weight, 400);
    letter-spacing: var(--ppm-text-meta-tracking, 0);
  }
  @utility ppm-text-mono {
    font-family: var(--ppm-font-mono, var(--font-code));
    font-size: var(--ppm-text-mono-size, 0.75rem);
    line-height: var(--ppm-text-mono-leading, 1rem);
    font-weight: var(--ppm-text-mono-weight, 400);
    letter-spacing: var(--ppm-text-mono-tracking, 0);
    font-variant-numeric: tabular-nums;
  }
  @utility ppm-text-mono-sm {
    font-family: var(--ppm-font-mono, var(--font-code));
    font-size: var(--ppm-text-mono-sm-size, 0.6875rem);
    line-height: var(--ppm-text-mono-sm-leading, 1rem);
    font-weight: var(--ppm-text-mono-sm-weight, 500);
    letter-spacing: var(--ppm-text-mono-sm-tracking, 0);
    font-variant-numeric: tabular-nums;
  }
  /* «Сначала сужается, потом многоточие»: wdth axis of IBM Plex Sans Variable (loaded from wdth.css). */
  @utility ppm-font-narrow {
    font-stretch: var(--ppm-font-stretch-narrow, 100%);
  }

  @layer utilities {
    /* R19: meaningful borders are 1 CSS px (Plane draws many at 0.5px = one device pixel on 2x screens). */
    :where(html[data-ppm-design="v2"]) .border-\[0\.5px\] {
      border-width: 1px;
    }
    :where(html[data-ppm-design="v2"]) .border-t-\[0\.5px\] {
      border-top-width: 1px;
    }
    :where(html[data-ppm-design="v2"]) .border-b-\[0\.5px\] {
      border-bottom-width: 1px;
    }
    :where(html[data-ppm-design="v2"]) .border-r-\[0\.5px\] {
      border-right-width: 1px;
    }
    :where(html[data-ppm-design="v2"]) .border-l-\[0\.5px\] {
      border-left-width: 1px;
    }
    :where(html[data-ppm-design="v2"]) .border-y-\[0\.5px\] {
      border-block-width: 1px;
    }
    :where(html[data-ppm-design="v2"]) .border-x-\[0\.5px\] {
      border-inline-width: 1px;
    }

    /* Icons: lucide draws on a 24-unit grid; 2.25 there = 1.5px at 16px (spec C). (0,1,1) beats stroke-* utilities and
       the strokeWidth presentation attribute. Propel icons are filled outlines and stay as they are. */
    :where(html[data-ppm-design="v2"]) svg.lucide {
      stroke-width: 2.25;
    }

    /* Elevation: resting controls and cards are flat; only floating layers cast a shadow (TOKENS §6). Separate rules on
       purpose: one :is() with the :hover argument would lift both to (0,2,0) and beat the popover rule below. */
    :where(html[data-ppm-design="v2"]) .shadow-raised-100 {
      --tw-shadow: 0 0 #0000;
    }
    :where(html[data-ppm-design="v2"]) .hover\:shadow-raised-200:hover {
      --tw-shadow: 0 0 #0000;
    }
    :where(html[data-ppm-design="v2"]) :is(.shadow-raised-200, .shadow-overlay-100, .shadow-overlay-200) {
      --tw-shadow: var(--ppm-shadow-popover, 0 0 #0000);
    }
    /* Popovers: every react-popper surface (CustomMenu/Select/SearchSelect, property dropdowns) and the context menu:
       radius 8 + popover shadow. Same specificity as .shadow-raised-100 above and AFTER it on purpose
       (filters/header/helpers/dropdown.tsx carries both). */
    :where(html[data-ppm-design="v2"]) :is([data-popper-placement], [data-context-menu="true"]) {
      border-radius: var(--ppm-radius-md, 0.5rem);
      --tw-shadow: var(--ppm-shadow-popover, 0 0 #0000);
      box-shadow:
        var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000),
        var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }
    /* Modals: Headless UI ModalCore panels and the Propel dialog: radius 12 + popover shadow. */
    :where(html[data-ppm-design="v2"]) :is([id^="headlessui-dialog-panel-"], [data-slot="dialog-content"]) {
      border-radius: var(--ppm-radius-lg, 0.75rem);
      --tw-shadow: var(--ppm-shadow-popover, 0 0 #0000);
      box-shadow:
        var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000),
        var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }
  }
  ```
- [ ] **Step 5: Создать заголовки `shell.css` и `tasks.css`**
  - `apps/web/styles/ppm-v2/shell.css`:
    ```css
    /*
     * PPM design v2 («гибрид A+B», UX1.1): shell. Filled by plan-F task F5; every rule stays under
     * :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]).
     */
    ```
  - `apps/web/styles/ppm-v2/tasks.css` (нужда T N2: файл вне слоёв, правила линии T перекрывают утилиты):
    ```css
    /*
     * PPM design v2 («гибрид A+B», UX1.1): Tasks lane (T) stylesheet. Owner: lane T. Imported by
     * apps/web/styles/globals.css WITHOUT a cascade layer; every rule starts with :where(html[data-ppm-design="v2"]).
     */
    ```
- [ ] **Step 6: Подключить в `apps/web/styles/globals.css`** — сразу после `@import "@ppm/brand/tokens-v2.css";`:
  ```css
  @import "./ppm-v2/system.css";
  @import "./ppm-v2/shell.css";
  @import "./ppm-v2/tasks.css";
  ```
  (без `layer(...)`; `@plane/editor/styles` и остальные импорты остаются ниже).
- [ ] **Step 7: Шрифты в `apps/web/app/root.tsx`**
  - `:37-40` было:
    ```tsx
    // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM UI font-face globally.
    import "@fontsource-variable/ibm-plex-sans";
    // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM monospace font-face globally.
    import "@fontsource-variable/jetbrains-mono";
    ```
    стало:
    ```tsx
    // oxlint-disable-next-line import/no-unassigned-import -- IBM Plex Sans Variable with the wdth axis (UX1.1: font-stretch 85%).
    import "@fontsource-variable/ibm-plex-sans/wdth.css";
    import plexSansCyrillicWoff2 from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-cyrillic-wdth-normal.woff2?url";
    import plexSansLatinWoff2 from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2?url";
    // oxlint-disable-next-line import/no-unassigned-import -- Wave-0 (v1) monospace face; v2 uses IBM Plex Mono.
    import "@fontsource-variable/jetbrains-mono";
    ```
    `index.css` и `wdth.css` одновременно не подключать (одно семейство, скачались бы оба набора). JetBrains остаётся:
    его `@font-face` грузит файлы только при использовании, а v1 (`tokens.css` `--ppm-font-mono`) без него изменил бы вид.
  - После `:44` (`import "@fontsource/ibm-plex-mono";`) добавить:
    ```tsx
    // oxlint-disable-next-line import/no-unassigned-import -- UX1.1: IBM Plex Mono 500 (IDs, keys, citation numbers).
    import "@fontsource/ibm-plex-mono/500.css";
    ```
  - `:72-78` было — один объект preload Inter; стало (Plex под брендом, Inter только без бренда):
    ```tsx
        ...(IS_PPM_BRAND_ENABLED ? [plexSansCyrillicWoff2, plexSansLatinWoff2] : [interVariableWoff2]).map((href) => ({
          rel: "preload",
          href,
          as: "font",
          type: "font/woff2",
          crossOrigin: "anonymous",
        })),
    ```
- [ ] **Step 8: Аудит классов видит CSS волны 1** — `packages/ppm-brand/scripts/audit-tailwind-classes.mjs:26-33`,
  массив `customCssFiles` стало (нужды C §1 и T N3; отсутствующий файл пропускается `existsSync`, `:75`):
  ```js
  const customCssFiles = [
    "apps/web/core/components/ppm-canvas/canvas.css",
    "apps/web/core/components/ppm-canvas/canvas-v2.css",
    "apps/web/styles/globals.css",
    "apps/web/styles/power-k.css",
    "apps/web/styles/emoji.css",
    "apps/web/styles/ppm-v2/system.css",
    "apps/web/styles/ppm-v2/shell.css",
    "apps/web/styles/ppm-v2/tasks.css",
    "packages/tailwind-config/index.css",
    "packages/ppm-brand/src/tokens.css",
    "packages/ppm-brand/src/tokens-v2.css",
  ];
  ```
- [ ] **Step 9: Прогнать**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run` → **33 файла / 203** (196 + 7; `min-font-size` — прежний 1 тест).
  - `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-tailwind-classes.mjs` → 5 / 66, PASS (30 файлов).
  - web tsc → 0; `../../node_modules/.bin/oxfmt app/root.tsx tests/ppm-design/v2-css.test.ts tests/ppm-a11y/min-font-size.test.ts`;
    `cd $PF/packages/ppm-brand && ../../node_modules/.bin/oxfmt scripts/audit-tailwind-classes.mjs`.
  - Смоук (GET): `curl -s http://127.0.0.1:3000/sign-in | grep -o 'ibm-plex-sans-[a-z]*-wdth-normal[^"]*woff2' | sort -u` →
    две строки (cyrillic, latin); `inter-latin-wght` в preload при бренде нет.

**Приёмка F3:**
- [ ] Spec B, «Шрифты»: Plex Sans с осью `wdth` (`font-stretch: 75% 100%` в `@font-face`), Plex Mono 400/500 вместо
  JetBrains под v2, токен `--ppm-font-stretch-narrow: 85%`, preload Plex вместо Inter под брендом, без внешних запросов.
- [ ] CONTRACTS §2: `@custom-variant ppm-v2`/`ppm-compact` дословно, `@utility ppm-text-<role>` (не `text-*`), фолбэки у
  каждого `var(--ppm-*)`, без рычага `--text-13`.
- [ ] Spec C: иконки lucide ≈ 1,5 px, тени только у всплывающих слоёв, радиусы 8 у поповеров и 12 у модалок; R19 —
  смысловые границы 1 px вместо 0,5 px (всё только при v2).
- [ ] Нужды T N2 (tasks.css без слоя), T N3 и C §1 (`customCssFiles`), C §5 (`wdth.css`).

---

### Task 4 (F4): Строки UX1.1, русские имена статусов, «Плотность» в «Профиль → Предпочтения»

**Files:**
- Create: `packages/ppm-brand/src/translations/ux11-system.ts`, `…/ux11-tasks.ts`, `…/ux11-canvas.ts`.
- Modify: `packages/ppm-brand/src/index.ts:1` (импорты), `:819-820` и `:1624-1625` (спреды в `en`/`ru`).
- Create: `packages/ppm-brand/src/__tests__/ux11-translations.test.ts`.
- Modify: `apps/web/core/lib/ppm-design.ts` (+ `getPpmStateDisplayName`, нужда T N1).
- Modify: `apps/web/core/components/dropdowns/state/base.tsx:13,25,84,115,124,172,190` (теперь файл F, N1).
- Create: `apps/web/core/components/ppm-shell/density-switcher.tsx`.
- Modify: `apps/web/core/components/settings/profile/content/pages/preferences/default-list.tsx:7-23`.
- Modify (RU-остатки страницы, `notes/infra.md` §2.8): `apps/web/core/components/appearance/theme-switcher.tsx:7-21,30-35,62-81`,
  `…/preferences/language-and-timezone-list.tsx:7-17,28-63,84,99-104`, `apps/web/core/components/profile/start-of-week-preference.tsx:7-16,24-33`.
- Modify: `packages/ppm-brand/scripts/audit-tailwind-classes.mjs:16-24` (`extraFiles`, нужда T N3).
- Create: `apps/web/tests/ppm-design/state-names.test.ts`, `apps/web/tests/ppm-shell/density-preferences.test.tsx`.

**Interfaces:**
- Consumes: `usePpmTranslation` (`core/hooks/use-ppm-translation.ts`), `SettingsControlItem`
  (`core/components/settings/control-item.tsx:13-25`), `CustomSelect` (`@plane/ui`), F1 `usePpmDensity`/`setPpmDensity`/`usePpmDesignV2`/`isPpmDesignV2`.
- Produces: `UX11_SYSTEM_TRANSLATIONS`, `UX11_TASKS_TRANSLATIONS` (пустой, владелец T), `UX11_CANVAS_TRANSLATIONS`
  (пустой, владелец C) — влиты последними спредами внутрь литералов `PPM_TRANSLATIONS.en/ru`; ключи `density.*`,
  `ux.nav.*`, `ux.state.*`, `ux.preferences.*`; `getPpmStateDisplayName(state, locale)`; `PpmDensitySwitcher`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  $T/ux11-pre.sh packages/ppm-brand/src/translations/ux11-system.ts packages/ppm-brand/src/translations/ux11-tasks.ts \
    packages/ppm-brand/src/translations/ux11-canvas.ts packages/ppm-brand/src/__tests__/ux11-translations.test.ts \
    apps/web/core/components/dropdowns/state/base.tsx apps/web/core/components/ppm-shell/density-switcher.tsx \
    apps/web/core/components/settings/profile/content/pages/preferences/default-list.tsx \
    apps/web/core/components/appearance/theme-switcher.tsx \
    apps/web/core/components/settings/profile/content/pages/preferences/language-and-timezone-list.tsx \
    apps/web/core/components/profile/start-of-week-preference.tsx \
    apps/web/tests/ppm-design/state-names.test.ts apps/web/tests/ppm-shell/density-preferences.test.tsx
  ```
- [ ] **Step 2: Написать падающий тест модулей** — `packages/ppm-brand/src/__tests__/ux11-translations.test.ts`:
  ```ts
  // UX1.1 F4: the three UX1.1 translation modules (F: system, T: tasks, C: canvas) stay in en/ru parity, keep their
  // lane prefix, never overlap and reach PPM_TRANSLATIONS unchanged.
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation, PPM_TRANSLATIONS } from "../index";
  import { UX11_CANVAS_TRANSLATIONS } from "../translations/ux11-canvas";
  import { UX11_SYSTEM_TRANSLATIONS } from "../translations/ux11-system";
  import { UX11_TASKS_TRANSLATIONS } from "../translations/ux11-tasks";

  type TModule = { en: Record<string, string>; ru: Record<string, string> };
  const MODULES: Array<[string, TModule, RegExp]> = [
    ["system", UX11_SYSTEM_TRANSLATIONS, /^(ux|density)\./],
    ["tasks", UX11_TASKS_TRANSLATIONS, /^tasks\./],
    ["canvas", UX11_CANVAS_TRANSLATIONS, /^canvas\./],
  ];

  describe("UX1.1 translation modules", () => {
    it("en and ru carry the same keys in every module", () => {
      for (const [name, mod] of MODULES)
        expect(Object.keys(mod.ru).toSorted(), name).toEqual(Object.keys(mod.en).toSorted());
    });

    it("every key carries its lane prefix", () => {
      for (const [name, mod, prefix] of MODULES)
        for (const key of Object.keys(mod.en)) expect(prefix.test(key), `${name}: ${key}`).toBe(true);
    });

    it("modules never share a key", () => {
      const all = MODULES.flatMap(([, mod]) => Object.keys(mod.en));
      expect(new Set(all).size).toBe(all.length);
    });

    it("every module string reaches PPM_TRANSLATIONS unchanged in both locales", () => {
      for (const [, mod] of MODULES)
        for (const locale of ["en", "ru"] as const)
          for (const [key, value] of Object.entries(mod[locale]))
            expect((PPM_TRANSLATIONS[locale] as Record<string, string>)[key], `${locale}:${key}`).toBe(value);
    });

    it("never says «ИИ»/AI in the 1.0 UI", () => {
      for (const [name, mod] of MODULES) {
        for (const value of Object.values(mod.ru)) expect(value, name).not.toMatch(/(?<!\p{L})ИИ(?!\p{L})/u);
        for (const value of Object.values(mod.en)) expect(value, name).not.toMatch(/\bAI\b/);
      }
    });

    it("publishes the system strings used by the profile and the sidebar", () => {
      expect(getPpmTranslation("ru", "density.label")).toBe("Плотность");
      expect(getPpmTranslation("ru", "density.comfortable")).toBe("Удобная");
      expect(getPpmTranslation("ru", "density.compact")).toBe("Компактная");
      expect(getPpmTranslation("en", "density.label")).toBe("Density");
      expect(getPpmTranslation("ru", "ux.nav.section_work")).toBe("Работа");
      expect(getPpmTranslation("ru", "ux.nav.section_knowledge")).toBe("Знания");
      expect(getPpmTranslation("ru", "ux.state.started")).toBe("В работе");
      expect(getPpmTranslation("en", "ux.state.started")).toBe("In Progress");
    });
  });
  ```
- [ ] **Step 3: Убедиться, что падает**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/ux11-translations.test.ts`
  Ожидание: FAIL — `Failed to load url ../translations/ux11-canvas`.
- [ ] **Step 4: Создать три модуля**
  - `packages/ppm-brand/src/translations/ux11-system.ts`:
    ```ts
    /**
     * UX1.1 («гибрид A+B»): system and shell strings. Owner: lane F. Keys: `ux.*`, `density.*`.
     * en and ru carry the same keys (src/__tests__/ux11-translations.test.ts); no «ИИ»/AI in the 1.0 UI.
     * `ux.state.*`: en = the default state name stored by the API (apps/api/plane/db/models/state.py), ru = display only.
     */
    export const UX11_SYSTEM_TRANSLATIONS = {
      en: {
        "density.label": "Density",
        "density.description": "Text size and row height in lists, navigation and canvas panels. Saved on this device.",
        "density.comfortable": "Comfortable",
        "density.compact": "Compact",
        "ux.nav.section_work": "Work",
        "ux.nav.section_knowledge": "Knowledge",
        "ux.state.backlog": "Backlog",
        "ux.state.unstarted": "Todo",
        "ux.state.started": "In Progress",
        "ux.state.completed": "Done",
        "ux.state.cancelled": "Cancelled",
        "ux.state.triage": "Triage",
        "ux.preferences.theme_updating": "Updating theme...",
        "ux.preferences.theme_updated": "Theme updated",
        "ux.preferences.theme_reloading": "Reloading to apply changes...",
        "ux.preferences.error_title": "Error!",
        "ux.preferences.theme_failed": "Failed to update theme. Please try again.",
        "ux.preferences.success_title": "Success!",
        "ux.preferences.timezone_updated": "Timezone updated successfully",
        "ux.preferences.timezone_failed": "Failed to update timezone",
        "ux.preferences.language_updated": "Language updated successfully",
        "ux.preferences.language_failed": "Failed to update language",
        "ux.preferences.select_language": "Select a language",
        "ux.preferences.start_of_week": "First day of the week",
        "ux.preferences.start_of_week_description": "This will change how all calendars in your app look.",
        "ux.preferences.start_of_week_updated": "First day of the week updated successfully",
        "ux.preferences.update_failed_title": "Update failed",
        "ux.preferences.try_again_later": "Please try again later.",
      },
      ru: {
        "density.label": "Плотность",
        "density.description":
          "Размер текста и высота строк в списках, навигации и на панелях Холста. Сохраняется на этом устройстве.",
        "density.comfortable": "Удобная",
        "density.compact": "Компактная",
        "ux.nav.section_work": "Работа",
        "ux.nav.section_knowledge": "Знания",
        "ux.state.backlog": "Бэклог",
        "ux.state.unstarted": "К работе",
        "ux.state.started": "В работе",
        "ux.state.completed": "Готово",
        "ux.state.cancelled": "Отменена",
        "ux.state.triage": "На разборе",
        "ux.preferences.theme_updating": "Меняем тему…",
        "ux.preferences.theme_updated": "Тема изменена",
        "ux.preferences.theme_reloading": "Перезагружаем страницу, чтобы применить тему…",
        "ux.preferences.error_title": "Ошибка",
        "ux.preferences.theme_failed": "Не удалось сменить тему. Попробуйте ещё раз.",
        "ux.preferences.success_title": "Готово",
        "ux.preferences.timezone_updated": "Часовой пояс обновлён",
        "ux.preferences.timezone_failed": "Не удалось обновить часовой пояс",
        "ux.preferences.language_updated": "Язык обновлён",
        "ux.preferences.language_failed": "Не удалось обновить язык",
        "ux.preferences.select_language": "Выберите язык",
        "ux.preferences.start_of_week": "Первый день недели",
        "ux.preferences.start_of_week_description": "Влияет на все календари в приложении.",
        "ux.preferences.start_of_week_updated": "Первый день недели обновлён",
        "ux.preferences.update_failed_title": "Не удалось сохранить",
        "ux.preferences.try_again_later": "Попробуйте позже.",
      },
    } as const;
    ```
  - `packages/ppm-brand/src/translations/ux11-tasks.ts`:
    ```ts
    /** UX1.1 lane T («Задачи»): strings. Owner: lane T only. New keys only, prefix `tasks.*`; en and ru keep the same keys. */
    export const UX11_TASKS_TRANSLATIONS = { en: {}, ru: {} } as const;
    ```
  - `packages/ppm-brand/src/translations/ux11-canvas.ts` (ровно как в нужде C §3):
    ```ts
    /** UX1.1 lane C («Холст»): strings. Owner: lane C only. New keys only, prefix `canvas.*`; en and ru keep the same keys. */
    export const UX11_CANVAS_TRANSLATIONS = { en: {}, ru: {} } as const;
    ```
- [ ] **Step 5: Влить в `PPM_TRANSLATIONS`** (`packages/ppm-brand/src/index.ts`)
  - После `:1` (`import buildManifest from "../build-manifest.json";`):
    ```ts
    import { UX11_CANVAS_TRANSLATIONS } from "./translations/ux11-canvas";
    import { UX11_SYSTEM_TRANSLATIONS } from "./translations/ux11-system";
    import { UX11_TASKS_TRANSLATIONS } from "./translations/ux11-tasks";
    ```
  - `en`: после строки `"onboarding.size.people": "people",` (исходно `:819`), перед закрывающей `},` литерала `en`:
    ```ts
        // UX1.1 («гибрид A+B»): one module per lane — F system/shell, T tasks, C canvas. Spread last, inside the literal,
        // so TPpmTranslationKey includes the keys; a duplicate of an existing key is a TS2783 error.
        ...UX11_SYSTEM_TRANSLATIONS.en,
        ...UX11_TASKS_TRANSLATIONS.en,
        ...UX11_CANVAS_TRANSLATIONS.en,
    ```
  - `ru`: после строки `"onboarding.size.people": "человек",` (исходно `:1624`; после вставок выше — `:1632`), перед `},`:
    ```ts
        ...UX11_SYSTEM_TRANSLATIONS.ru,
        ...UX11_TASKS_TRANSLATIONS.ru,
        ...UX11_CANVAS_TRANSLATIONS.ru,
    ```
- [ ] **Step 6: Прогнать пакет и собрать**
  `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && ./node_modules/.bin/tsc --noEmit`
  → **6 файлов / 72** (66 + 6), `i18n-overlay.test.ts` (запрет терминов в `PPM_TRANSLATIONS.ru`) зелёный, tsc 0.
  `../../node_modules/.bin/oxfmt src/index.ts src/translations src/__tests__/ux11-translations.test.ts`, затем
  `$T/ux11-pkg-build.sh ppm-brand`.
- [ ] **Step 7: Написать падающие тесты web**
  - `apps/web/tests/ppm-design/state-names.test.ts`:
    ```ts
    // UX1.1 F4 (R11, plan-T N1): Russian display names for the exact default states, data untouched.
    import { readFileSync } from "node:fs";
    import { afterEach, describe, expect, it, vi } from "vitest";
    import { getPpmStateDisplayName } from "@/lib/ppm-design";

    const v2 = () => vi.stubGlobal("document", { documentElement: { dataset: { ppmDesign: "v2" } } });
    const v1 = () => vi.stubGlobal("document", { documentElement: { dataset: { ppmDesign: "v1" } } });

    afterEach(() => vi.unstubAllGlobals());

    describe("getPpmStateDisplayName (UX1.1)", () => {
      it("shows the exact default names in Russian under v2", () => {
        v2();
        expect(getPpmStateDisplayName({ name: "Backlog", group: "backlog" }, "ru")).toBe("Бэклог");
        expect(getPpmStateDisplayName({ name: "Todo", group: "unstarted" }, "ru")).toBe("К работе");
        expect(getPpmStateDisplayName({ name: "In Progress", group: "started" }, "ru")).toBe("В работе");
        expect(getPpmStateDisplayName({ name: "Done", group: "completed" }, "ru")).toBe("Готово");
        expect(getPpmStateDisplayName({ name: "Cancelled", group: "cancelled" }, "ru")).toBe("Отменена");
        expect(getPpmStateDisplayName({ name: "Triage", group: "triage" }, "ru")).toBe("На разборе");
        expect(getPpmStateDisplayName({ name: "In Progress", group: "started" }, "en")).toBe("In Progress");
      });

      it("keeps renamed, custom and cross-group names exactly as stored", () => {
        v2();
        expect(getPpmStateDisplayName({ name: "На проверке", group: "started" }, "ru")).toBe("На проверке");
        expect(getPpmStateDisplayName({ name: "in progress", group: "started" }, "ru")).toBe("in progress");
        expect(getPpmStateDisplayName({ name: "Done", group: "started" }, "ru")).toBe("Done");
      });

      it("keeps wave 0 untouched and tolerates a missing state", () => {
        v1();
        expect(getPpmStateDisplayName({ name: "Backlog", group: "backlog" }, "ru")).toBe("Backlog");
        expect(getPpmStateDisplayName(null, "ru")).toBeUndefined();
        expect(getPpmStateDisplayName(undefined, "ru")).toBeUndefined();
      });

      it("the state dropdown shows the display name and still finds states by their stored name", () => {
        const source = readFileSync(new URL("../../core/components/dropdowns/state/base.tsx", import.meta.url), "utf8");
        expect(source).toContain("const { t, currentLocale } = useTranslation();");
        expect(source).toContain('query: `${state?.name} ${getPpmStateDisplayName(state, currentLocale) ?? ""}`,');
        expect(source).toContain("{getPpmStateDisplayName(state, currentLocale)}");
        expect(source).toContain('tooltipContent={getPpmStateDisplayName(selectedState, currentLocale) ?? t("state")}');
        expect(source).toContain('{getPpmStateDisplayName(selectedState, currentLocale) ?? t("state")}');
      });
    });
    ```
  - `apps/web/tests/ppm-shell/density-preferences.test.tsx`:
    ```tsx
    // UX1.1 F4: «Профиль → Предпочтения» — device-local density switcher (R3) and Russian strings on the page.
    import { readFileSync } from "node:fs";
    import type { ReactNode } from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import { describe, expect, it, vi } from "vitest";
    import { PpmDensitySwitcher } from "@/components/ppm-shell/density-switcher";

    vi.mock("@plane/i18n", () => ({
      useTranslation: () => ({ currentLocale: "ru", t: (key: string) => key }),
    }));

    vi.mock("@plane/ui", () => ({
      CustomSelect: Object.assign(
        ({ label, children }: { label?: ReactNode; children?: ReactNode }) => (
          <div>
            <span>{label}</span>
            {children}
          </div>
        ),
        { Option: ({ children }: { children?: ReactNode }) => <div role="option">{children}</div> }
      ),
    }));

    const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
    const CORE = "../../core/components/";
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // [file under core/components, ppmT key, upstream literal kept for PPM_SHELL_ENABLED=0]
    const RU_CASES: Array<[string, string, string]> = [
      ["appearance/theme-switcher.tsx", "ux.preferences.theme_updating", "Updating theme..."],
      ["appearance/theme-switcher.tsx", "ux.preferences.theme_updated", "Theme updated"],
      ["appearance/theme-switcher.tsx", "ux.preferences.theme_reloading", "Reloading to apply changes..."],
      ["appearance/theme-switcher.tsx", "ux.preferences.error_title", "Error!"],
      ["appearance/theme-switcher.tsx", "ux.preferences.theme_failed", "Failed to update theme. Please try again."],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.success_title", "Success!"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.timezone_updated", "Timezone updated successfully"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.error_title", "Error!"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.timezone_failed", "Failed to update timezone"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.language_updated", "Language updated successfully"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.language_failed", "Failed to update language"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.select_language", "Select a language"],
      ["settings/profile/content/pages/preferences/language-and-timezone-list.tsx", "ux.preferences.start_of_week", "First day of the week"],
      [
        "settings/profile/content/pages/preferences/language-and-timezone-list.tsx",
        "ux.preferences.start_of_week_description",
        "This will change how all calendars in your app look.",
      ],
      ["profile/start-of-week-preference.tsx", "ux.preferences.success_title", "Success"],
      ["profile/start-of-week-preference.tsx", "ux.preferences.start_of_week_updated", "First day of the week updated successfully"],
      ["profile/start-of-week-preference.tsx", "ux.preferences.update_failed_title", "Update failed"],
      ["profile/start-of-week-preference.tsx", "ux.preferences.try_again_later", "Please try again later."],
    ];

    describe("profile preferences (UX1.1)", () => {
      it("renders «Плотность» with both options and says it is saved on this device", () => {
        const markup = renderToStaticMarkup(<PpmDensitySwitcher />);
        expect(markup).toContain("Плотность");
        expect(markup).toContain("Удобная");
        expect(markup).toContain("Компактная");
        expect(markup).toContain("Сохраняется на этом устройстве.");
      });

      it("writes density only to this device (R3)", () => {
        const switcher = read(`${CORE}ppm-shell/density-switcher.tsx`);
        expect(switcher).toContain("onChange={(value: TPpmDensity) => setPpmDensity(value)}");
        expect(switcher).not.toMatch(/updateUserTheme|updateUserProfile|useUserProfile|@\/services/);
      });

      it("shows the switcher only under the v2 design", () => {
        const list = read(`${CORE}settings/profile/content/pages/preferences/default-list.tsx`);
        expect(list).toContain("const isDesignV2 = usePpmDesignV2();");
        expect(list).toContain("{isDesignV2 && <PpmDensitySwitcher />}");
      });

      it("keeps every English literal on the page only as the upstream branch of an isPpmShell ternary", () => {
        for (const [file, key, literal] of RU_CASES) {
          const source = read(`${CORE}${file}`);
          const occurrences = source.split(`"${literal}"`).length - 1;
          const gated = source.match(
            new RegExp(`isPpmShell\\s*\\?\\s*ppmT\\("${escape(key)}"\\)\\s*:\\s*"${escape(literal)}"`, "g")
          );
          expect(occurrences, `${file}: ${literal}`).toBeGreaterThan(0);
          expect(gated?.length ?? 0, `${file}: ${literal}`).toBe(occurrences);
        }
      });
    });
    ```
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-design/state-names.test.ts tests/ppm-shell/density-preferences.test.tsx`
    → FAIL: `getPpmStateDisplayName is not a function`, `Failed to resolve import "@/components/ppm-shell/density-switcher"`.
- [ ] **Step 8: `getPpmStateDisplayName` в `apps/web/core/lib/ppm-design.ts`** (нужда T N1; сигнатура T, типизированные
  ключи вместо приведения типа)
  - Импорты: `import { PPM_DENSITY_STORAGE_KEY, resolvePpmDensity, resolvePpmDesign } from "@ppm/brand";` →
    `import { getPpmTranslation, PPM_DENSITY_STORAGE_KEY, resolvePpmDensity, resolvePpmDesign } from "@ppm/brand";`,
    `import type { TPpmDensity } from "@ppm/brand";` → `import type { TPpmDensity, TPpmTranslationKey } from "@ppm/brand";`.
  - В конец файла:
    ```ts
    // ---------------- UX1.1 R11: Russian names for Plane's exact default states (display only) ----------------

    /** Default states created by the API (apps/api/plane/db/models/state.py:24-62): group → stored name + display key. */
    const PPM_DEFAULT_STATES: Record<string, { name: string; key: TPpmTranslationKey }> = {
      backlog: { name: "Backlog", key: "ux.state.backlog" },
      unstarted: { name: "Todo", key: "ux.state.unstarted" },
      started: { name: "In Progress", key: "ux.state.started" },
      completed: { name: "Done", key: "ux.state.completed" },
      cancelled: { name: "Cancelled", key: "ux.state.cancelled" },
      triage: { name: "Triage", key: "ux.state.triage" },
    };

    /**
     * Display name of a state: under v2 the EXACT default name of its group is shown in the UI language
     * (Backlog → «Бэклог» …); renamed or custom states and wave 0 (v1) keep the stored name. Data is never changed.
     */
    export function getPpmStateDisplayName(
      state: { name: string; group: string } | null | undefined,
      locale: string | undefined
    ): string | undefined {
      if (!state) return undefined;
      const preset = PPM_DEFAULT_STATES[state.group];
      if (!preset || preset.name !== state.name || !isPpmDesignV2()) return state.name;
      return getPpmTranslation(locale, preset.key);
    }
    ```
- [ ] **Step 9: `apps/web/core/components/dropdowns/state/base.tsx`** (нужда T N1; при v1 помощник возвращает `state.name` —
  разметка прежняя)
  - После `:25` (`import { StateOption } from "@/components/workflow";`): `import { getPpmStateDisplayName } from "@/lib/ppm-design";`
  - `:84` `const { t } = useTranslation();` → `const { t, currentLocale } = useTranslation();`
  - `:115` `` query: `${state?.name}`, `` → `` query: `${state?.name} ${getPpmStateDisplayName(state, currentLocale) ?? ""}`, ``
  - `:124` `{state?.name}` → `{getPpmStateDisplayName(state, currentLocale)}`
  - `:172` `tooltipContent={selectedState?.name ?? t("state")}` → `tooltipContent={getPpmStateDisplayName(selectedState, currentLocale) ?? t("state")}`
  - `:190` `{selectedState?.name ?? t("state")}` → `{getPpmStateDisplayName(selectedState, currentLocale) ?? t("state")}`
- [ ] **Step 10: Переключатель плотности**
  - Создать `apps/web/core/components/ppm-shell/density-switcher.tsx`:
    ```tsx
    /**
     * Copyright (c) 2023-present Plane Software, Inc. and contributors
     * SPDX-License-Identifier: AGPL-3.0-only
     * See the LICENSE file for details.
     */

    import { CustomSelect } from "@plane/ui";
    import type { TPpmDensity } from "@ppm/brand";
    // components
    import { SettingsControlItem } from "@/components/settings/control-item";
    // hooks
    import { usePpmTranslation } from "@/hooks/use-ppm-translation";
    // lib
    import { setPpmDensity, usePpmDensity } from "@/lib/ppm-design";

    const DENSITIES: TPpmDensity[] = ["comfortable", "compact"];
    const DENSITY_LABEL_KEYS = {
      comfortable: "density.comfortable",
      compact: "density.compact",
    } as const satisfies Record<TPpmDensity, string>;

    /**
     * «Профиль → Предпочтения»: «Плотность: Удобная / Компактная» (UX1.1, R3). Applies at once through
     * <html data-ppm-density> and is remembered in this browser only: no profile write, no reload.
     */
    export function PpmDensitySwitcher() {
      const ppmT = usePpmTranslation();
      const density = usePpmDensity();

      return (
        <SettingsControlItem
          title={ppmT("density.label")}
          description={ppmT("density.description")}
          control={
            <CustomSelect
              value={density}
              label={ppmT(DENSITY_LABEL_KEYS[density])}
              onChange={(value: TPpmDensity) => setPpmDensity(value)}
              buttonClassName="border border-subtle-1"
              input
              placement="bottom-end"
            >
              {DENSITIES.map((option) => (
                <CustomSelect.Option key={option} value={option}>
                  {ppmT(DENSITY_LABEL_KEYS[option])}
                </CustomSelect.Option>
              ))}
            </CustomSelect>
          }
        />
      );
    }
    ```
  - `…/preferences/default-list.tsx` — стало целиком:
    ```tsx
    /**
     * Copyright (c) 2023-present Plane Software, Inc. and contributors
     * SPDX-License-Identifier: AGPL-3.0-only
     * See the LICENSE file for details.
     */

    import { observer } from "mobx-react";
    // components
    import { ThemeSwitcher } from "@/components/appearance";
    import { PpmDensitySwitcher } from "@/components/ppm-shell/density-switcher";
    // lib
    import { usePpmDesignV2 } from "@/lib/ppm-design";

    export const ProfileSettingsDefaultPreferencesList = observer(function ProfileSettingsDefaultPreferencesList() {
      const isDesignV2 = usePpmDesignV2();

      return (
        <div className="flex flex-col gap-y-1">
          <ThemeSwitcher
            option={{
              id: "theme",
              title: "theme",
              description: "select_or_customize_your_interface_color_scheme",
            }}
          />
          {isDesignV2 && <PpmDensitySwitcher />}
        </div>
      );
    });
    ```
- [ ] **Step 11: Русские остатки страницы (шаблон `isPpmShell ? ppmT(…) : "<upstream>"`, строка upstream сохраняется)**
  - В каждом из трёх файлов добавить импорты `import { isPpmShellEnabled } from "@ppm/brand";` и
    `import { usePpmTranslation } from "@/hooks/use-ppm-translation";`, а в теле компонента (рядом с `useTranslation`):
    ```tsx
    const ppmT = usePpmTranslation();
    const isPpmShell = isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED);
    ```
  - `appearance/theme-switcher.tsx:63-73` — стало:
    ```tsx
            setPromiseToast(updatePromise, {
              loading: isPpmShell ? ppmT("ux.preferences.theme_updating") : "Updating theme...",
              success: {
                title: isPpmShell ? ppmT("ux.preferences.theme_updated") : "Theme updated",
                message: () => (isPpmShell ? ppmT("ux.preferences.theme_reloading") : "Reloading to apply changes..."),
              },
              error: {
                title: isPpmShell ? ppmT("ux.preferences.error_title") : "Error!",
                message: () => (isPpmShell ? ppmT("ux.preferences.theme_failed") : "Failed to update theme. Please try again."),
              },
            });
    ```
    и зависимости `useCallback` (`:81`): `[setTheme, updateUserTheme, userProfile, isPpmShell, ppmT]`.
  - `…/language-and-timezone-list.tsx`:
    - `:34-43` → `title: isPpmShell ? ppmT("ux.preferences.success_title") : "Success!",`,
      `message: isPpmShell ? ppmT("ux.preferences.timezone_updated") : "Timezone updated successfully",`,
      `title: isPpmShell ? ppmT("ux.preferences.error_title") : "Error!",`,
      `message: isPpmShell ? ppmT("ux.preferences.timezone_failed") : "Failed to update timezone",`;
    - `:52-61` → то же для языка: `ux.preferences.success_title`/`"Success!"`, `ux.preferences.language_updated`/`"Language updated successfully"`,
      `ux.preferences.error_title`/`"Error!"`, `ux.preferences.language_failed`/`"Failed to update language"`;
    - `:84` → `label={profile?.language ? getLanguageLabel(profile?.language) : isPpmShell ? ppmT("ux.preferences.select_language") : "Select a language"}`;
    - `:101-102` → `title: isPpmShell ? ppmT("ux.preferences.start_of_week") : "First day of the week",` и
      `description: isPpmShell ? ppmT("ux.preferences.start_of_week_description") : "This will change how all calendars in your app look.",`.
  - `profile/start-of-week-preference.tsx:29,31` →
    ```tsx
          setToast({
            type: TOAST_TYPE.SUCCESS,
            title: isPpmShell ? ppmT("ux.preferences.success_title") : "Success",
            message: isPpmShell ? ppmT("ux.preferences.start_of_week_updated") : "First day of the week updated successfully",
          });
        } catch (_error) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: isPpmShell ? ppmT("ux.preferences.update_failed_title") : "Update failed",
            message: isPpmShell ? ppmT("ux.preferences.try_again_later") : "Please try again later.",
          });
    ```
  Названия дней недели (`START_OF_THE_WEEK_OPTIONS` из `@plane/constants`) не трогаем — это пакет Plane.
- [ ] **Step 12: Аудит классов** — `packages/ppm-brand/scripts/audit-tailwind-classes.mjs:16-24`, в конец `extraFiles`
  (все проверены пробным прогоном аудита — классы валидны; `project-layout-root.tsx` не добавлять: `:92` мёртвый
  `shadow-sm`, см. `plan-F-needs.md` п. 7):
  ```js
    // UX1.1 F4: profile preferences and the shared state dropdown (F).
    "apps/web/core/components/appearance/theme-switcher.tsx",
    "apps/web/core/components/dropdowns/state/base.tsx",
    "apps/web/core/components/profile/start-of-week-preference.tsx",
    "apps/web/core/components/settings/profile/content/pages/preferences/default-list.tsx",
    "apps/web/core/components/settings/profile/content/pages/preferences/language-and-timezone-list.tsx",
    // UX1.1 lane T: Plane files the Tasks lane edits (plan-T-needs.md N3).
    "apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx",
    "apps/web/core/components/issues/header.tsx",
    "apps/web/core/components/issues/issue-layouts/filters/header/layout-selection.tsx",
    "apps/web/core/components/issues/issue-layouts/kanban/default.tsx",
    "apps/web/core/components/issues/issue-layouts/list/block-root.tsx",
    "apps/web/core/components/issues/issue-layouts/list/block.tsx",
    "apps/web/core/components/issues/issue-layouts/list/default.tsx",
    "apps/web/core/components/issues/issue-layouts/list/headers/group-by-card.tsx",
    "apps/web/core/components/issues/issue-layouts/list/list-group.tsx",
    "apps/web/core/components/issues/issue-layouts/quick-add/button/list.tsx",
  ```
- [ ] **Step 13: Прогнать**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run` → **35 файлов / 211** (203 + 4 + 4); `english-leftovers` зелёный.
  - `cd $PF/packages/ppm-brand && node scripts/audit-tailwind-classes.mjs` → PASS (**46 файлов**: 30 + `density-switcher.tsx` + 15).
  - web tsc → 0; oxlint по изменённым `.ts/.tsx` → 0 errors; oxfmt точечно по тем же файлам.
  - i18n не менялась: `cd $PF/packages/i18n && ./node_modules/.bin/tsx scripts/sync-check.ts --ci` → 18 × 3837.
- [ ] **Step 14: Смоук в браузере контроллера (только чтение/localStorage)**: «Профиль → Предпочтения» — строка
  «Плотность · Удобная»; выбор «Компактная» сразу меняет `document.documentElement.dataset.ppmDensity` и высоту пунктов
  (после F5); во вкладке Network нет POST/PATCH; после проверки вернуть `localStorage.ppm_density` к прежнему значению.

**Приёмка F4:**
- [ ] CONTRACTS §3: три модуля, en = ru по ключам, влиты последними спредами, префиксы, пустые T/C (тест паритета).
- [ ] Spec B, «Плотность»: «Удобная»/«Компактная» в «Профиль → Предпочтения», мгновенно, без записи на сервер (R3),
  только при v2.
- [ ] R11 / нужда T N1: русские имена только для точных дефолтов, данные и поиск по имени в данных не меняются; при v1 — прежний вид.
- [ ] Нужда T N3 (`extraFiles`), нужда C §3 (пустой `ux11-canvas.ts`, спред последним).
- [ ] RU-остатки страницы «Предпочтения» (infra §2.8) переведены под шеллом, upstream-строки сохранены.

---

### Task 5 (F5): Оболочка v2

**Files:**
- Create: `apps/web/core/components/ppm-shell/kbd-hint.tsx`, `apps/web/tests/ppm-shell/shell-v2.test.ts`.
- Modify: `apps/web/styles/ppm-v2/shell.css` (заголовок F3 → правила).
- Modify: `apps/web/core/components/navigation/project-navigation-items.ts` (в конец: группировка),
  `apps/web/core/components/workspace/sidebar/project-navigation.tsx:7-30,73-74,114-153`.
- Modify (инертные хуки): `apps/web/core/components/sidebar/sidebar-navigation.tsx:18`,
  `apps/web/core/components/workspace/sidebar/projects-list-item.tsx:298-306`,
  `apps/web/core/components/workspace/content-wrapper.tsx:29`, `apps/web/app/(all)/[workspaceSlug]/(projects)/layout.tsx:18`,
  `apps/web/app/(all)/[workspaceSlug]/(settings)/layout.tsx:16`, `apps/web/app/(all)/settings/profile/layout.tsx:18-19`,
  `apps/web/core/components/navigation/top-navigation-root.tsx:56-57,101`,
  `apps/web/core/components/navigation/top-nav-power-k.tsx:14,225-229,255,267-268`,
  `apps/web/core/components/workspace/sidebar/workspace-menu-root.tsx:154`.
- Modify: `apps/web/core/components/sidebar/sidebar-wrapper.tsx:14-38,61-62`, `apps/web/core/components/workspace/sidebar/quick-actions.tsx:13-24,82-87`.
- Modify: `packages/ppm-brand/scripts/audit-tailwind-classes.mjs:16-24` (`extraFiles`).

**Interfaces:**
- Consumes: `usePpmDesignV2` (F1), токены F2 (`--ppm-topbar-height`, `--ppm-control-height`, `--ppm-sidebar-item-height`,
  `--ppm-radius-sm`, `--ppm-color-layer-1-selected`), строки F4 (`ux.nav.section_*`), Power-K `keySequence: "ni"`
  (`core/components/power-k/config/creation/command.ts:73`).
- Produces: `PpmKbdHint`, `PPM_CREATE_WORK_ITEM_KEYS`, `getPpmCommandShortcutLabel` (для линии T — подсказка `N I` в
  основной кнопке, `tone="on-accent"`); `groupProjectNavigationItems`, `PPM_NAVIGATION_SECTION_LABEL_KEYS`,
  `TProjectNavigationRun`; хуки оболочки из «Итоговой таблицы».

Решение по рамке — `plan-F-needs.md` п. 1 (спецификация «без рамки» против макетов H с рамкой): реализуем спецификацию; вся
рамка переключается двумя правилами `shell.css` (Step 5, блок «No frame»), разметка не меняется.

> **Контроллер — рулинги R25/R26 (обязательны, переопределяют текст задачи ниже):**
> - **R25 — рамку оставляем, как на макетах H** (их видел владелец): НЕ добавлять в `shell.css` блок «No frame» (правила
>   для `[data-ppm-app-frame="gutter"]` и `[data-ppm-app-frame="panel"]`) и НЕ добавлять топбару `border-bottom`.
>   Инертные атрибуты `data-ppm-app-frame` в разметке можно оставить (на будущее). Тесты/приёмку, которые проверяют
>   отсутствие рамки или границу топбара, заменить проверкой, что таких правил в `shell.css` нет.
> - **R26 — у кнопки «Новая задача» в сайдбаре подсказки `N I` нет** (на макете её нет): в `quick-actions.tsx` не
>   добавлять `<PpmKbdHint …>`. `PpmKbdHint`, `PPM_CREATE_WORK_ITEM_KEYS` и `getPpmCommandShortcutLabel` всё равно
>   создаются — их использует линия T в основной кнопке шапки «Задач». Подсказка `Ctrl K`/`⌘K` в поиске топбара остаётся.
> - **R27 — значения токенов, изменённые ради контраста** (`plan-F-needs.md` п. 3), принимаются.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  $T/ux11-pre.sh apps/web/core/components/ppm-shell/kbd-hint.tsx apps/web/tests/ppm-shell/shell-v2.test.ts \
    apps/web/core/components/navigation/project-navigation-items.ts apps/web/core/components/workspace/sidebar/project-navigation.tsx \
    apps/web/core/components/sidebar/sidebar-navigation.tsx apps/web/core/components/workspace/sidebar/projects-list-item.tsx \
    apps/web/core/components/workspace/content-wrapper.tsx "apps/web/app/(all)/[workspaceSlug]/(projects)/layout.tsx" \
    "apps/web/app/(all)/[workspaceSlug]/(settings)/layout.tsx" "apps/web/app/(all)/settings/profile/layout.tsx" \
    apps/web/core/components/navigation/top-navigation-root.tsx apps/web/core/components/navigation/top-nav-power-k.tsx \
    apps/web/core/components/workspace/sidebar/workspace-menu-root.tsx apps/web/core/components/sidebar/sidebar-wrapper.tsx \
    apps/web/core/components/workspace/sidebar/quick-actions.tsx
  ```
- [ ] **Step 2: Написать падающий тест** — `apps/web/tests/ppm-shell/shell-v2.test.ts`:
  ```ts
  // UX1.1 F5: shell v2 — grouped project navigation, inert hooks, shell.css scope, keyboard hints.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    groupProjectNavigationItems,
    PPM_NAVIGATION_SECTION_LABEL_KEYS,
    type TPpmNavigationSection,
    type TProjectNavigationItem,
  } from "@/components/navigation/project-navigation-items";
  import { getPpmCommandShortcutLabel, PPM_CREATE_WORK_ITEM_KEYS } from "@/components/ppm-shell/kbd-hint";

  const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
  const CORE = "../../core/components/";
  const APP = "../../app/";

  const item = (key: string, ppmSection?: TPpmNavigationSection): TProjectNavigationItem => ({
    access: [],
    href: `/demo/projects/p/${key}`,
    i18n_key: key,
    icon: () => null,
    key,
    name: key,
    shouldRender: true,
    sortOrder: 0,
    ppmSection,
  });

  describe("shell v2 (UX1.1)", () => {
    it("groups consecutive items of a section and keeps the canonical order", () => {
      const runs = groupProjectNavigationItems([
        item("overview", "context"),
        item("brain", "context"),
        item("work_items", "work"),
        item("views", "work"),
        item("cycles", "work"),
        item("modules", "work"),
        item("knowledge", "knowledge"),
        item("pages", "knowledge"),
        item("code", "code"),
        item("settings", "project"),
      ]);
      expect(runs.map((run) => run.section)).toEqual(["context", "work", "knowledge", "code", "project"]);
      expect(runs.flatMap((run) => run.items.map(({ key }) => key))).toEqual([
        "overview",
        "brain",
        "work_items",
        "views",
        "cycles",
        "modules",
        "knowledge",
        "pages",
        "code",
        "settings",
      ]);
    });

    it("never merges items without a section or runs that are not adjacent", () => {
      const runs = groupProjectNavigationItems([item("a"), item("b"), item("c", "work"), item("d", "code"), item("e", "work")]);
      expect(runs.map((run) => run.items.map(({ key }) => key))).toEqual([["a"], ["b"], ["c"], ["d"], ["e"]]);
      expect(new Set(runs.map((run) => run.key)).size).toBe(runs.length);
    });

    it("labels only «Работа» and «Знания»", () => {
      expect(Object.keys(PPM_NAVIGATION_SECTION_LABEL_KEYS).toSorted()).toEqual(["knowledge", "work"]);
      expect(getPpmTranslation("ru", PPM_NAVIGATION_SECTION_LABEL_KEYS.work!)).toBe("Работа");
      expect(getPpmTranslation("ru", PPM_NAVIGATION_SECTION_LABEL_KEYS.knowledge!)).toBe("Знания");
    });

    it("groups the project navigation only under shell + v2 and keeps the wave-0 list otherwise", () => {
      const source = read(`${CORE}workspace/sidebar/project-navigation.tsx`);
      expect(source).toContain("if (!(isPpmShell && isDesignV2))");
      expect(source).toContain('role="group"');
      expect(source).toContain("aria-labelledby={labelId}");
      expect(source).toContain('isPpmShell && isDesignV2 ? "text-13 leading-5 font-medium" : "text-11 font-medium"');
    });

    it("adds only inert data-attribute hooks to upstream and shell markup", () => {
      const hooks: Array<[string, string]> = [
        [`${CORE}sidebar/sidebar-navigation.tsx`, 'data-ppm-nav-item=""'],
        [`${CORE}sidebar/sidebar-navigation.tsx`, 'data-active={isActive ? "" : undefined}'],
        [`${CORE}workspace/sidebar/projects-list-item.tsx`, 'data-ppm-nav-item=""'],
        [`${CORE}workspace/content-wrapper.tsx`, 'data-ppm-app-frame="gutter"'],
        [`${APP}(all)/[workspaceSlug]/(projects)/layout.tsx`, 'data-ppm-app-frame="panel"'],
        [`${APP}(all)/[workspaceSlug]/(settings)/layout.tsx`, 'data-ppm-app-frame="panel"'],
        [`${APP}(all)/settings/profile/layout.tsx`, 'data-ppm-app-frame="gutter"'],
        [`${APP}(all)/settings/profile/layout.tsx`, 'data-ppm-app-frame="panel"'],
        [`${CORE}navigation/top-navigation-root.tsx`, 'data-ppm-topbar=""'],
        [`${CORE}navigation/top-nav-power-k.tsx`, 'data-ppm-command-search=""'],
        [`${CORE}navigation/top-nav-power-k.tsx`, 'data-ppm-command-panel=""'],
        [`${CORE}workspace/sidebar/workspace-menu-root.tsx`, 'data-ppm-topbar-menu={variant === "top-navigation" ? "" : undefined}'],
      ];
      for (const [file, hook] of hooks) expect(read(file), file).toContain(hook);
    });

    it("styles only those hooks, under design v2 and the PPM shell", () => {
      const css = read("../../styles/ppm-v2/shell.css").replace(/\/\*[\s\S]*?\*\//g, "");
      const selectors = [...css.matchAll(/^\s*([^@{}\s][^{}]*)\{/gm)].map((match) => match[1].trim());
      expect(selectors.length).toBeGreaterThanOrEqual(8);
      for (const selector of selectors)
        expect(selector.startsWith(':where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-'), selector).toBe(
          true
        );
    });

    it("hints the real shortcuts: Ctrl K / ⌘K by platform and the N I sequence (R9)", () => {
      expect(getPpmCommandShortcutLabel("MacIntel")).toBe("⌘K");
      expect(getPpmCommandShortcutLabel("iPhone")).toBe("⌘K");
      expect(getPpmCommandShortcutLabel("Win32")).toBe("Ctrl K");
      expect(getPpmCommandShortcutLabel("")).toBe("Ctrl K");
      expect([...PPM_CREATE_WORK_ITEM_KEYS]).toEqual(["N", "I"]);
      expect(read(`${CORE}power-k/config/creation/command.ts`)).toContain('keySequence: "ni"');
      // Class order is left to oxfmt's Tailwind sorter: assert the classes, not their order.
      const v2Only = /<PpmKbdHint[^>]*className="(?=[^"]*\bhidden\b)(?=[^"]*ppm-v2:inline-flex)[^"]*"/;
      const quickActions = read(`${CORE}workspace/sidebar/quick-actions.tsx`);
      expect(quickActions).toContain("keys={PPM_CREATE_WORK_ITEM_KEYS}");
      expect(quickActions).toMatch(v2Only);
      const search = read(`${CORE}navigation/top-nav-power-k.tsx`);
      expect(search).toContain("keys={[commandShortcutLabel]}");
      expect(search).toMatch(v2Only);
    });
  });
  ```
- [ ] **Step 3: Убедиться, что падает**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-shell/shell-v2.test.ts`
  Ожидание: FAIL — `Failed to resolve import "@/components/ppm-shell/kbd-hint"`.
- [ ] **Step 4: Создать `apps/web/core/components/ppm-shell/kbd-hint.tsx`** (все классы дают CSS в теме PPM; `cn()` Plane
  сливает `inline-flex` с `hidden ppm-v2:inline-flex` в `hidden ppm-v2:inline-flex` — проверено):
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { cn } from "@plane/utils";

  /**
   * The real «Новая задача» shortcut: the Power-K creation command keySequence "ni" (R9). Power-K matches e.code,
   * so the Latin keys work in the Russian layout too.
   */
  export const PPM_CREATE_WORK_ITEM_KEYS = ["N", "I"] as const;

  /** Command search hint: same rule as the canvas palette hint (ppm-canvas/board-workspace-state.ts). */
  export function getPpmCommandShortcutLabel(platform: string): string {
    return /mac|iphone|ipad/i.test(platform) ? "⌘K" : "Ctrl K";
  }

  type TPpmKbdHintProps = {
    /** One box per key; a combination such as "Ctrl K" is one key. */
    keys: readonly string[];
    /** "default" on neutral surfaces; "on-accent" inside the primary (accent) button (TOKENS §9.9). */
    tone?: "default" | "on-accent";
    /** Visibility belongs to the caller, e.g. "hidden ppm-v2:inline-flex" for a v2-only hint. */
    className?: string;
  };

  /** Visual keyboard hint. aria-hidden: the control keeps its own accessible name. */
  export function PpmKbdHint({ keys, tone = "default", className }: TPpmKbdHintProps) {
    return (
      <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center gap-0.5", className)}>
        {keys.map((key) => (
          <kbd
            key={key}
            className={cn(
              "inline-flex h-4 min-w-4 items-center justify-center rounded-sm border px-1 font-code text-11 leading-none font-medium",
              tone === "on-accent"
                ? "border-transparent bg-accent-primary-active text-on-accent"
                : "border-subtle-1 text-tertiary"
            )}
          >
            {key}
          </kbd>
        ))}
      </span>
    );
  }
  ```
- [ ] **Step 5: Записать `apps/web/styles/ppm-v2/shell.css` целиком** (проходит `v2-css.test.ts` и `shell-v2.test.ts`):
  ```css
  /*
   * PPM design v2 («гибрид A+B», UX1.1): shell. Spec C: no frame around the content (the separators are the top-bar
   * and sidebar borders), top bar 48/44 with a bottom border, command search 32/28, sidebar items 32/28.
   * Gated by design v2 AND the PPM shell: PPM_SHELL_ENABLED=0 keeps the upstream Plane shell. The hooks are inert
   * data-attributes (plan-F task F5); every var(--ppm-*) falls back to the wave-0 value of that property.
   */
  @layer utilities {
    /* No frame: the 8px gutter and the rounded panel border go away (workspace, settings, profile layouts). */
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-app-frame="gutter"] {
      padding: 0;
    }
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-app-frame="panel"] {
      border-width: 0;
      border-radius: 0;
    }

    /* Top bar 48/44 with a bottom border (was min-h-10, no border). */
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-topbar] {
      min-height: var(--ppm-topbar-height, 2.5rem);
      border-bottom: 1px solid var(--border-subtle);
    }
    /* The workspace menu drops from under the taller bar (wave 0: top-10 + mt-1 under a 40px bar). */
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-topbar-menu] {
      top: var(--ppm-topbar-height, 2.5rem);
    }

    /* Command search: control height 32/28, radius 6; the results panel clears the taller field (wave 0: h-7, pt-10). */
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-command-search] {
      height: var(--ppm-control-height, 1.75rem);
      border-radius: var(--ppm-radius-sm, 0.5rem);
    }
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-command-panel] {
      padding-top: calc(var(--ppm-control-height, 1.75rem) + 0.75rem);
    }

    /* Sidebar items 32/28 (SidebarNavItem and project rows). The active item is the neutral selected layer
       (TOKENS §9.1: the accent is not used for navigation); re-pointing the variable keeps the upstream
       !bg-layer-transparent-active utility working without an !important fight. */
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-nav-item] {
      min-height: var(--ppm-sidebar-item-height, auto);
      padding-block: 0;
    }
    :where(html[data-ppm-design="v2"][data-ppm-shell="enabled"]) [data-ppm-nav-item][data-active] {
      --bg-layer-transparent-active: var(--ppm-color-layer-1-selected, var(--bg-layer-1-selected));
    }
  }
  ```
- [ ] **Step 6: Инертные хуки (разметка при v1 не меняется)**
  - `sidebar/sidebar-navigation.tsx:18` — `<div` →
    ```tsx
        <div
          data-ppm-nav-item=""
          data-active={isActive ? "" : undefined}
    ```
  - `workspace/sidebar/projects-list-item.tsx:298` — у `<div className={cn("group/project-item …` перед `className` добавить
    `data-ppm-nav-item=""`.
  - `workspace/content-wrapper.tsx:29` — у `<div className={cn("relative size-full flex-grow overflow-hidden pr-2 pb-2 pl-2 …`
    перед `className` добавить `data-ppm-app-frame="gutter"`.
  - `app/(all)/[workspaceSlug]/(projects)/layout.tsx:18` и `app/(all)/[workspaceSlug]/(settings)/layout.tsx:16` — у
    `<div className="relative flex … rounded-lg border border-subtle">` добавить `data-ppm-app-frame="panel"`.
  - `app/(all)/settings/profile/layout.tsx:18-19` — у внешнего `<div className="… bg-canvas p-2">` добавить
    `data-ppm-app-frame="gutter"`, у `<main className="… rounded-lg border border-subtle bg-surface-1">` —
    `data-ppm-app-frame="panel"`.
  - `navigation/top-navigation-root.tsx:56` — `<div` → `<div data-ppm-topbar=""` (строки `:57-60`, закреплённые
    `top-navigation-gating.test.ts`, не менять); `:101` `<InboxIcon className="size-5" />` →
    `<InboxIcon className={isPpmShell ? "size-5 ppm-v2:size-4" : "size-5"} />`.
  - `workspace/sidebar/workspace-menu-root.tsx:154` — у `<div className={cn("fixed z-21 mt-1 …` перед `className` добавить
    `data-ppm-topbar-menu={variant === "top-navigation" ? "" : undefined}`.
  - `navigation/top-nav-power-k.tsx`:
    - импорт после `:24`: `import { getPpmCommandShortcutLabel, PpmKbdHint } from "@/components/ppm-shell/kbd-hint";`
    - в теле компонента после `const ppmT = usePpmTranslation();` (`:44`):
      `const commandShortcutLabel = getPpmCommandShortcutLabel(typeof navigator === "undefined" ? "" : navigator.platform);`
    - `:225-226` — `<label htmlFor="top-nav-command-input"` → добавить `data-ppm-command-search=""`;
    - перед `{searchTerm && (` (`:255`):
      ```tsx
                {IS_PPM_SHELL_ENABLED && !searchTerm && (
                  <PpmKbdHint keys={[commandShortcutLabel]} className="ml-2 hidden ppm-v2:inline-flex" />
                )}
      ```
    - `:267` — у панели результатов `<div className={cn("absolute -top-[6px] …` добавить `data-ppm-command-panel=""`.
- [ ] **Step 7: Шапка сайдбара и «Новая задача»**
  - `sidebar/sidebar-wrapper.tsx`: `:14` `import { isPpmShellEnabled } from "@ppm/brand";` →
    `import { isPpmShellEnabled, PPM_BRAND } from "@ppm/brand";`; импорт `import { usePpmDesignV2 } from "@/lib/ppm-design";`;
    после `:38` — `const isDesignV2 = usePpmDesignV2();`; `:62` было
    `<span className="pt-1 text-16 font-medium text-primary">{title}</span>` — стало:
    ```tsx
            {isPpmShell && isDesignV2 && title === PPM_BRAND.name ? (
              <span className="flex items-center gap-2 pt-1">
                <img alt="" aria-hidden="true" src={PPM_BRAND.assets.mark} className="size-5 shrink-0 rounded-sm" />
                <span className="text-14 leading-5 font-semibold tracking-[0.06em] text-primary">{title}</span>
              </span>
            ) : (
              <span className="pt-1 text-16 font-medium text-primary">{title}</span>
            )}
    ```
    (знак — прежний `mark.svg`, R20; условие `title === "Projects" || title === "PPM"` у кнопки настройки навигации не трогать).
  - `workspace/sidebar/quick-actions.tsx`: импорты `import { isPpmShellEnabled } from "@ppm/brand";` и
    `import { PpmKbdHint, PPM_CREATE_WORK_ITEM_KEYS } from "@/components/ppm-shell/kbd-hint";`; в теле —
    `const isPpmShell = isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED);`; в `label` (`:83-86`)
    после `<span className="max-w-[145px] truncate text-13 font-medium">…</span>`:
    ```tsx
                  {isPpmShell && (
                    <PpmKbdHint keys={PPM_CREATE_WORK_ITEM_KEYS} className="ml-auto hidden ppm-v2:inline-flex" />
                  )}
    ```
- [ ] **Step 8: Группы навигации проекта «Работа»/«Знания»**
  - В конец `navigation/project-navigation-items.ts`:
    ```ts
    // UX1.1: labelled groups of the project navigation (spec C: «Работа», «Знания»); other sections have no label.
    export const PPM_NAVIGATION_SECTION_LABEL_KEYS: Partial<Record<TPpmNavigationSection, TPpmTranslationKey>> = {
      work: "ux.nav.section_work",
      knowledge: "ux.nav.section_knowledge",
    };

    export type TProjectNavigationRun = {
      key: string;
      section?: TPpmNavigationSection;
      items: TProjectNavigationItem[];
    };

    /** Splits already-filtered items into runs of consecutive items of one section, keeping the canonical order. */
    export function groupProjectNavigationItems(items: TProjectNavigationItem[]): TProjectNavigationRun[] {
      const runs: TProjectNavigationRun[] = [];
      for (const item of items) {
        const last = runs[runs.length - 1];
        if (last && item.ppmSection !== undefined && last.section === item.ppmSection) last.items.push(item);
        else runs.push({ key: `${item.ppmSection ?? "item"}-${item.key}`, section: item.ppmSection, items: [item] });
      }
      return runs;
    }
    ```
  - `workspace/sidebar/project-navigation.tsx`:
    - импорты: `import { cn } from "@plane/utils";`, `import { usePpmDesignV2 } from "@/lib/ppm-design";`, а `:27-30` стало
      ```tsx
      import {
        buildProjectNavigationItems,
        groupProjectNavigationItems,
        PPM_NAVIGATION_SECTION_LABEL_KEYS,
        type TPpmNavigationSection,
        type TProjectNavigationItem,
      } from "@/components/navigation/project-navigation-items";
      ```
    - после `:74` (`const isPpmCanvas = …`): `const isDesignV2 = usePpmDesignV2();`
    - `:114-153` (от `if (!project) return null;` до конца компонента) — стало:
      ```tsx
        if (!project) return null;

        const renderItem = (item: TNavigationItem) => {
          const shouldShowCount = item.key === "intake" && (project.intake_count ?? 0) > 0;
          const itemIsActive = !!isActive(item);

          return (
            <Link
              key={item.key}
              href={getPpmAdminModeNavigationHref(item.href, isGlobalAdmin, searchParams.get("ppm_admin_mode"))}
              aria-current={itemIsActive ? "page" : undefined}
              className="block rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong"
              onClick={handleProjectClick}
            >
              <SidebarNavItem isActive={itemIsActive}>
                <div className="flex w-full items-center justify-between gap-1.5 py-[1px]">
                  <div className="flex items-center gap-1.5">
                    <item.icon
                      className={`size-4 flex-shrink-0 ${item.name === "Intake" ? "stroke-1" : "stroke-[1.5]"}`}
                    />
                    <span className={isPpmShell && isDesignV2 ? "text-13 leading-5 font-medium" : "text-11 font-medium"}>
                      {item.ppmLabelKey ? ppmT(item.ppmLabelKey) : t(item.i18n_key)}
                    </span>
                  </div>
                  {shouldShowCount && <span className="text-11 font-medium text-tertiary">{project.intake_count}</span>}
                </div>
              </SidebarNavItem>
            </Link>
          );
        };

        // Wave 0 and upstream: one flat list, markup unchanged.
        if (!(isPpmShell && isDesignV2))
          return (
            <nav aria-label={isPpmShell ? ppmT("navigation.project") : t("project")} className="flex flex-col gap-0.5">
              {navigationItemsMemo.map((item) => {
                if (!item.shouldRender) return;

                const hasAccess = allowPermissions(item.access, EUserPermissionsLevel.PROJECT, workspaceSlug, project.id);
                if (!hasAccess) return null;

                return renderItem(item);
              })}
            </nav>
          );

        // UX1.1 v2: the same items and access rules, grouped «Работа» / «Знания» (spec C, mockup H-Tasks).
        const runs = groupProjectNavigationItems(
          navigationItemsMemo.filter(
            (item) =>
              item.shouldRender && allowPermissions(item.access, EUserPermissionsLevel.PROJECT, workspaceSlug, project.id)
          )
        );
        const isLabelled = (section?: TPpmNavigationSection) => !!(section && PPM_NAVIGATION_SECTION_LABEL_KEYS[section]);

        return (
          <nav aria-label={ppmT("navigation.project")} className="flex flex-col gap-0.5">
            {runs.map((run, index) => {
              const labelKey = run.section ? PPM_NAVIGATION_SECTION_LABEL_KEYS[run.section] : undefined;
              if (!labelKey)
                return (
                  <div
                    key={run.key}
                    className={cn("flex flex-col gap-0.5", { "mt-2": index > 0 && isLabelled(runs[index - 1].section) })}
                  >
                    {run.items.map(renderItem)}
                  </div>
                );

              const labelId = `ppm-project-nav-${project.id}-${run.section}`;
              return (
                <div key={run.key} role="group" aria-labelledby={labelId} className="flex flex-col gap-0.5">
                  <p id={labelId} className="flex h-7 items-end px-2 pb-1 text-12 leading-4 font-medium text-tertiary">
                    {ppmT(labelKey)}
                  </p>
                  {run.items.map(renderItem)}
                </div>
              );
            })}
          </nav>
        );
      });
      ```
- [ ] **Step 9: Аудит видит файлы оболочки** — `packages/ppm-brand/scripts/audit-tailwind-classes.mjs`, в конец
  `extraFiles` (проверены пробным прогоном — классы валидны):
  ```js
    // UX1.1 F5: shell files with v2 branches or hooks.
    "apps/web/app/(all)/[workspaceSlug]/(projects)/layout.tsx",
    "apps/web/app/(all)/[workspaceSlug]/(settings)/layout.tsx",
    "apps/web/app/(all)/settings/profile/layout.tsx",
    "apps/web/core/components/navigation/top-navigation-root.tsx",
    "apps/web/core/components/sidebar/sidebar-navigation.tsx",
    "apps/web/core/components/sidebar/sidebar-wrapper.tsx",
    "apps/web/core/components/workspace/content-wrapper.tsx",
    "apps/web/core/components/workspace/sidebar/projects-list-item.tsx",
    "apps/web/core/components/workspace/sidebar/quick-actions.tsx",
    "apps/web/core/components/workspace/sidebar/workspace-menu-root.tsx",
  ```
- [ ] **Step 10: Прогнать всё по фазе F**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run` → **36 файлов / 218** (211 + 7), включая
    `top-navigation-gating`, `navigation-accessibility`, `project-navigation-items`, `english-leftovers`.
  - `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`
    → 6 / 72, аудиты PASS (**57 файлов**: 46 + `kbd-hint.tsx` + 10), tsc 0.
  - `cd $PF/packages/ppm-canvas && ./node_modules/.bin/vitest run` → 38 (не тронут).
  - web tsc → 0; `cd $PF/apps/web && ../../node_modules/.bin/oxlint core/components/ppm-shell core/components/navigation core/components/sidebar core/components/workspace core/lib app/root.tsx` → 0 errors;
    oxfmt точечно по всем изменённым `.ts/.tsx` F5.
  - `cd /Users/ermolov/Desktop/PPM && npm test` → 653 (M0.6, 13 диагностик).
- [ ] **Step 11: Смоук в браузере контроллера** (только чтение, localStorage вернуть): матрица {светлая, тёмная} ×
  {Удобная, Компактная} × {v1 через `ppm_design=v1`, v2} на «Задачах» проекта и в «Профиле»: топбар 48/44 с границей,
  без рамки, `Ctrl K` (или `⌘K`) в поиске, знак PPM, «Новая задача · N I», пункты 32/28, «Работа»/«Знания»; при v1 —
  рамка, топбар 40, плоский список; ширины 390/1024 — без горизонтального переполнения; меню пространства под топбаром.

**Приёмка F5:**
- [ ] Spec C: без рамки (разделители — граница топбара и сайдбара); топбар 48/44 с границей снизу и подсказкой `Ctrl K`/`⌘K`;
  знак PPM в шапке сайдбара, «Новая задача» с подсказкой `N I` (R9), пункты 32/28, группы «Работа»/«Знания».
- [ ] Spec C (из F3): иконки 1,5 px, тени только у всплывающих слоёв, радиусы 8/12 — видны на оболочке.
- [ ] Все закреплённые выражения и e2e-якоря целы (`top-navigation-gating`, `navigation-accessibility`,
  `project-navigation-items`, `#main-sidebar`); `PPM_SHELL_ENABLED=0` — upstream-оболочка.

---

## Нужды линий → где выполнены

| Нужда | Где в F |
|---|---|
| T N1 (`ux.state.*`, `getPpmStateDisplayName`, `dropdowns/state/base.tsx`) | F4 Steps 4, 8, 9 |
| T N2 (`tasks.css` пустой, без слоя, после файлов F) | F3 Steps 5–6 |
| T N3 (`customCssFiles` + `extraFiles`) | F3 Step 8, F4 Step 12 (кроме `project-layout-root.tsx` — `plan-F-needs.md` п. 7) |
| T N4 (имена токенов и `ppm-text-*`) | «Итоговая таблица имён», F2, F3 |
| T N5 (контракты без правок) | F1, F4; стражи F не сканируют `tasks.css` |
| C §1 (`canvas-v2.css` в аудите) | F3 Step 8 |
| C §2 (роли §1, «Холст», §4–§6, §11, `--ppm-canvas-status-height` 32/28) | F2 |
| C §3 (пустой `ux11-canvas.ts`, спред последним внутри литералов) | F4 Steps 4–5 |
| C §4 (`@/lib/ppm-design`, атрибут до первой отрисовки) | F1 |
| C §5 (`wdth.css`) | F3 Step 7 |

## Что линиям T и C нужно знать сверх CONTRACTS

1. Токены живут в `@ppm/brand/tokens-v2.css` (не в `tokens.css`); имена и значения — в «Итоговой таблице имён».
   `--ppm-font-size-content` — алиас `--ppm-text-body-size`; стрелка и засечка связи — по два токена
   (`--ppm-link-arrow-length/-width`, `--ppm-link-bar-length/-thickness`).
2. Глобальные правила F уже действуют под v2 — не дублировать: 1 px у `border-[0.5px]`, lucide `stroke-width: 2.25`
   (и на Холсте), `shadow-raised-100` плоский, `[data-popper-placement]`/`[data-context-menu="true"]` — r8 + тень,
   `[id^="headlessui-dialog-panel-"]`/`[data-slot="dialog-content"]` — r12 + тень. Для peek (T) — `var(--ppm-shadow-popover, …)`.
3. Шаблон для Plane-разметки, существующей в v1: `text-13 ppm-v2:ppm-text-body`, `min-h-11 ppm-v2:min-h-(--ppm-row-height,2.75rem)`.
   `ppm-v2:` не включает оболочку — для правил, которые должны молчать при `PPM_SHELL_ENABLED=0`, гейт в TSX (`isPpmShell`).
4. Без рамки контент шире на 16 px и начинается сразу под топбаром 48/44 (в волне 0 — 40 + рамка 8 снизу); сайдбар —
   прежний `#main-sidebar` c `border-r`.
5. `PpmKbdHint` для основной кнопки «Новая задача» (T): `tone="on-accent"`, `keys={PPM_CREATE_WORK_ITEM_KEYS}`,
   видимость — классом вызывающего (`hidden ppm-v2:inline-flex` или ветка `usePpmDesignV2()`).
6. `getPpmStateDisplayName(state, locale)` — для подписей групп, колонки куратора (T) и статуса на карточке Холста (C);
   общий выпадающий список статусов (`dropdowns/state/base.tsx`) уже переведён F.
7. Стражи F: `tests/ppm-design/v2-css.test.ts` проверяет порядок импортов (включая `tasks.css` без слоя) и шлюзы только
   в `system.css`/`shell.css`; `min-font-size.test.ts` — только `canvas.css` и CSS F. `tasks.css` и `canvas-v2.css`
   охраняют стражи линий.
8. После правки своего модуля переводов — `$T/ux11-pkg-build.sh ppm-brand`; дубликат существующего ключа — ошибка TS2783
   в `tsc` пакета; тест паритета F (`ux11-translations.test.ts`) требует префиксы `tasks.*` / `canvas.*` и en = ru.


---

## Линия T — «Задачи» (параллельно с линией C, после фазы F)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** в режиме `v2` список «Задачи» получает плотные строки из токена, заметную подсветку открытой в peek
строки, русские подписи групп и дефолтных статусов, свёрнутую «Отменена», шкалу спринта, кнопку «Новая задача»
с подсказкой `N I`, ячейку «Материалы» (PR + вложения/ссылки), метку «⊣ ROBOT-12» и колонку куратора
«Требует внимания». В режиме `v1` список, шапка и строки рендерятся ровно как в волне 0.

**Architecture:**
- Линия T стартует после фазы F и идёт параллельно линии C в одном рабочем дереве. Трогаем **только** файлы T
  (CONTRACTS §0): `apps/web/core/components/issues/**`, новая папка `apps/web/core/components/ppm-tasks/**`,
  `apps/web/app/**/projects/**/issues/**`, `apps/web/styles/ppm-v2/tasks.css`,
  `packages/ppm-brand/src/translations/ux11-tasks.ts`, тесты `apps/web/tests/ppm-tasks/**`.
- Каждая TSX-правка — под `usePpmDesignV2()` (F, `@/lib/ppm-design`). При `v1` — прежний литерал классов и
  прежняя разметка (тернарник `isDesignV2 ? новое : "<литерал волны 0>"`); это закрепляет тест
  `v1-literals.test.ts`.
- Весь CSS линии — в `apps/web/styles/ppm-v2/tasks.css`, каждое правило под `:where(html[data-ppm-design="v2"])`,
  каждый `var(--ppm-…)` с фолбэком на мост волны 0. Файл подключается F **без слоя** (см. `plan-T-needs.md` N2),
  поэтому его правила перекрывают утилиты Tailwind детерминированно. Отсюда правило: в `tasks.css` не задавать
  `display` элементам, которые прячутся утилитой `hidden` (колонка куратора).
- Новые компоненты делятся на «вид» (чистые пропсы, без сторов и без `next/*` — рендерятся в node-тестах через
  `renderToStaticMarkup`) и «контейнер» (observer, сторы, переводы).
- Коммитов нет. Перед первой правкой файла — `ux11-pre.sh`. Снимки делает контроллер.

**Tech Stack:** React Router 7 + Vite 8, Tailwind 4.1.17, MobX, SWR, i18next; `@ppm/brand` (PPM_TRANSLATIONS);
vitest 4 (node, `renderToStaticMarkup`); oxlint/oxfmt.

**Spec:** `docs/superpowers/plans/2026-09-24-ux11/drafts/spec-draft.md` — раздел D «Задачи», C (строки списков),
рулинги R6–R11 обязательны. Макеты: `mockups/H-Tasks-{Dark,Light,Compact}.{png,dc.html}`.

**Материалы:** `notes/tasks.md` (карта кода), `notes/risk.md` §1.3, §1.5, §3.1, `drafts/TOKENS.md` §1, §4, §5,
`drafts/CONTRACTS.md`, потребности к F — `drafts/plan-T-needs.md`.

## Что линия T берёт у F (контракты, проверяются в T1 Step 0)

| Что | Где | Используем в |
|---|---|---|
| `usePpmDesignV2(): boolean` | `apps/web/core/lib/ppm-design.ts` | все TSX-правки |
| `getPpmStateDisplayName(state, locale)` | там же (нужда N1) | подписи групп «статус», колонка куратора |
| модуль `UX11_TASKS_TRANSLATIONS` влит в `PPM_TRANSLATIONS`, ключи попадают в `TPpmTranslationKey` | `packages/ppm-brand/src/translations/ux11-tasks.ts` (создан F пустым) | `ppmT("tasks.…")` |
| пустой `apps/web/styles/ppm-v2/tasks.css`, подключён в `globals.css` без слоя | нужда N2 | стили линии |
| токены плотности и цвета (`--ppm-row-height`, `--ppm-group-row-height`, `--ppm-sprint-strip-height`, `--ppm-page-padding-x`, `--ppm-page-header-height`, `--ppm-control-height-sm`, `--ppm-color-*`, `--ppm-status-review`, `--ppm-type-code`, `--ppm-font-mono`, `--ppm-font-sans`, `--ppm-font-stretch-narrow`, `--ppm-radius-{xs,sm,md}`) | `tokens.css` (F) | `tasks.css` |
| утилиты `ppm-text-title-3`, `ppm-text-body` | `@utility` F | заголовки групп, названия задач |

## Global Constraints (линия T)

- Рабочее дерево — единственный источник правды. Никаких `git add/commit/stash/reset/checkout`.
- Перед первой правкой **каждого** файла (в т.ч. нового):
  `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh <путь от plane-fork>`.
- После правки `ux11-tasks.ts`: `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pkg-build.sh ppm-brand`
  (web берёт `@ppm/brand` из `dist`).
- Команды (ниже `$PF=/Users/ermolov/Desktop/PPM/plane-fork`):
  - тесты линии: `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-tasks`;
  - все тесты web: `cd $PF/apps/web && ./node_modules/.bin/vitest run` (база 184 + новые);
  - типы (фильтр по путям линии, другая линия может быть посреди правки):
    `cd $PF/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/ux11-web-T.tsbuildinfo 2>&1 | grep -E "core/components/(issues|ppm-tasks)/|/issues/\(list\)/|tests/ppm-tasks/" || echo "T: 0 ошибок"`;
  - формат — только точечно: `cd $PF/apps/web && ../../node_modules/.bin/oxfmt <файлы>`;
  - линт: `cd $PF/apps/web && ../../node_modules/.bin/oxlint core/components/ppm-tasks tests/ppm-tasks` → 0 errors;
  - бренд и аудиты: `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs`.
- Dev-сервер владельца (:3000) не перезапускать, второй не поднимать. Смоук — у контроллера (браузер, только
  чтение; `localStorage.ppm_design`/`ppm_density` прочитать до и вернуть после).
- Горячие клавиши не добавляем (R9). Строки — только в `ux11-tasks.ts` (en **и** ru), в RU нет «цикл», «модул»,
  «представлени», «рабочий элемент», нет «ИИ», нет слова Plane.
- В `ppm-tasks/**` не использовать `cn()` для строк, где смешаны `text-<размер>` и цвет (ловушка twMerge
  `packages/utils/src/common.ts:15-60`); кегль — `ppm-text-*` или `tasks.css`. Текст ≥ 11 px.
- Не трогать e2e-зацепки строк: `id="issue-…"` (`block.tsx:173`), `data-entity-id`/`data-entity-group-id`,
  `id` блока (`block-root.tsx:134`), `HIGHLIGHT_CLASS`, цели DnD.

## Решения по данным (без новых эндпоинтов)

| Элемент | Источник | Запросов на загрузку списка |
|---|---|---|
| Шкала спринта | `cycle.store` (спринты уже грузит `project-wrapper.tsx:129-133`), `project.cycle_view` | **0** |
| «Материалы»: число | `attachment_count` + `link_count` из payload строки списка | **0** |
| «Материалы»: PR | существующий `GET /api/ppm/v1/workspaces/<ws_uuid>/projects/<pid>/git/links/` (`ppm_git/views.py:639-649`: все активные связи проекта, `select_related`) — один раз на проект, SWR | **1** |
| Метка «⊣ ROBOT-12» + колонка куратора | существующий `GET /api/workspaces/<slug>/projects/<pid>/issues-detail/?expand=issue_relation&order_by=-updated_at&per_page=1000` (`IssueDetailEndpoint`, `apps/api/plane/app/views/issue/base.py:975-1103`, префетч связей, без N+1). Один ответ кормит и строки, и колонку | **1** |
| «Ждёт проверки» | статусы проекта из `state.store` (R6) | 0 |
| «Недавно изменённые» | тот же ответ `issues-detail` (топ-5 по `updated_at`, `updated_by`) + живые значения `issueMap` (R7) | 0 |

- Итого на загрузку списка в `v2`: **ровно два GET**, оба без N+1; в `v1` — ноль. Строки других list-корней
  (спринт, направление, фильтр задач, архив, профиль) провайдера не имеют и запросов не делают. Для раскладок
  кроме «Список» запросы выключены (`enabled=false`).
- Повторные запросы: SWR `revalidateOnFocus` и один `mutate()` после закрытия peek (связи и сроки могли
  поменяться в карточке). `shouldRetryOnError: false`.
- `403/404` на Git-ссылках — «нет данных», PR просто не рисуется. Ошибка `issues-detail` — колонка показывает
  «Не удалось загрузить сводку · Повторить», строки — без метки.
- **Отброшено (нужен API, не делаем):** состояние PR (черновик/открыт/слит) и проверки «2/3» (`serialize_link`
  не отдаёт `git_object`, синка check-runs нет); «что именно изменилось» в «Недавно изменённых» (ленты
  активности проекта в CE нет); файлы Хранилища в «Материалах» (к задачам не привязаны); блокировки из смысловых
  рёбер Холста (показываем только связи Plane `blocked_by`).
- Проекты больше 1000 задач: сводка считается по 1000 последним изменённым, колонка честно пишет
  «По 1000 последним изменённым задачам».

## Review Focus (линия T)

1. **v1 без изменений** (`PPM_DESIGN_V2=0` или `localStorage.ppm_design="v1"`): строки 44 px, шапка, группы,
   переключатель вида, кнопка «Добавить задачу» — как в волне 0; нет запросов `issues-detail`/`git/links`.
   Тест: `v1-literals.test.ts` (T1–T5).
2. **Проект без спринтов** (`cycle_view=false`) и со спринтами, но без текущего: шкалы нет, раскладка не прыгает.
   Тест: `sprint.test.ts` (null-ветки), смоук.
3. **Нет статуса «На проверке»**: секции «Ждёт проверки» нет; со статусом группы `started` и именем
   `/провер|review/i` — есть. Тест: `attention.test.ts`.
4. **0 задач**: «Все задачи 0»/пустые группы, колонка с пустыми состояниями («Заблокированных задач нет»,
   «Просроченных задач нет», «Задач пока нет»), без ошибок. Тест: `curator-view.test.tsx`.
5. **Очень длинные названия**: многоточие, у строк с меткой блокировки — сужение `font-stretch: 85%`
   (через `:has()`), метка не обрезается; в колонке названия переносятся.
6. **1280 и 1440 px**: колонка только с 1440 px; на 1280 — список во всю ширину, шкала сжимается.
7. **Peek открыт**: колонки нет; открытая строка — подложка выделения + метка 2 px слева, отличима от кольца
   фокуса; после закрытия колонка возвращается и перезапрашивает сводку.
8. **Компактная плотность**: строка/плейсхолдер/группа 32 px, прокрутка длинного списка без «прыжков»,
   переключение плотности без перезагрузки.
9. **Git не подключён / нет прав / гость**: PR не рисуется, ошибок и повторов нет; гость видит только доступные
   ему задачи (права `IssueDetailEndpoint`).
10. **Другие раскладки и list-корни**: Доска/Календарь/Таблица/Гант — без колонки и без запросов; списки
    спринта/направления/архива — новая плотность и подсветка, но без «Материалов», метки и колонки.
11. **«Отменена»**: свёрнута по умолчанию, раскрытие помнится по проекту (localStorage), Доска не затронута,
    drop в свёрнутую «Отменену» раскрывает её.

---

### Task 6 (T1): Строки и группы списка (плотность, плейсхолдер, peek, «Отменена», русские подписи)

**Files:**
- Create: `apps/web/core/components/ppm-tasks/format.ts`
- Create: `apps/web/core/components/ppm-tasks/list-groups.ts`
- Create: `apps/web/core/components/ppm-tasks/use-localized-groups.ts`
- Create: `apps/web/core/components/ppm-tasks/use-cancelled-groups.ts`
- Create: `apps/web/core/components/ppm-tasks/row-placeholder.tsx`
- Modify (содержимое целиком): `packages/ppm-brand/src/translations/ux11-tasks.ts` (все ключи линии T1–T5)
- Modify: `apps/web/styles/ppm-v2/tasks.css` (блок T1)
- Modify: `apps/web/core/components/issues/issue-layouts/list/block.tsx:21-33` (импорт), `:109` (флаг),
  `:179-192` (строка), `:237` (ID), `:280` (название)
- Modify: `apps/web/core/components/issues/issue-layouts/list/block-root.tsx:21` (импорт), `:78` (флаг), `:142`
  (плейсхолдер)
- Modify: `apps/web/core/components/issues/issue-layouts/list/list-group.tsx:7-48` (импорты), `:105`,
  `:234-236`, `:266-287`
- Modify: `apps/web/core/components/issues/issue-layouts/list/headers/group-by-card.tsx:7-40`, `:42-67`, `:93`,
  `:109-157`
- Modify: `apps/web/core/components/issues/issue-layouts/list/default.tsx:26-36`, `:90-95`
- Modify: `apps/web/core/components/issues/issue-layouts/kanban/default.tsx:26-34`, `:109-114`
- Create (тесты): `apps/web/tests/ppm-tasks/format.test.ts`, `list-groups.test.ts`, `tasks-css.test.ts`,
  `v1-literals.test.ts`, `translations.test.ts`

**Interfaces:**
- Consumes (F): `usePpmDesignV2`, `getPpmStateDisplayName`, `UX11_TASKS_TRANSLATIONS` в `PPM_TRANSLATIONS`,
  `tasks.css` без слоя, токены `--ppm-row-height`, `--ppm-group-row-height`, `--ppm-color-selection(-bg)`,
  `--ppm-font-stretch-narrow`, утилиты `ppm-text-body`, `ppm-text-title-3`.
- Produces: `formatPpmTemplate`, `splitPpmTemplate`, `handlePpmSpaClick` (`format.ts`, для T2–T4);
  классы `.ppm-task-row`, `.ppm-task-title`, `.ppm-task-row-placeholder`, `.ppm-task-group-row`; атрибуты строки
  `data-ppm-peeked`, `data-ppm-selected`; `usePpmLocalizedGroupColumns`; ключи `tasks.*` для T1–T5.

- [ ] **Step 0: Проверить контракты F (без этого не начинать)**
  ```bash
  PF=/Users/ermolov/Desktop/PPM/plane-fork
  grep -n "export function usePpmDesignV2\|export function getPpmStateDisplayName" $PF/apps/web/core/lib/ppm-design.ts
  grep -n "UX11_TASKS_TRANSLATIONS" $PF/packages/ppm-brand/src/index.ts $PF/packages/ppm-brand/src/translations/ux11-tasks.ts
  grep -n "ppm-v2/tasks.css" $PF/apps/web/styles/globals.css
  grep -rn "@utility ppm-text-body\|@utility ppm-text-title-3" $PF/apps/web/styles $PF/packages/ppm-brand/src
  grep -n "\-\-ppm-row-height\|\-\-ppm-group-row-height" -r $PF/packages/ppm-brand/src/tokens.css $PF/apps/web/styles
  ```
  Ожидание: каждая команда что-то находит; строка импорта `tasks.css` — без `layer(`. Если чего-то нет —
  остановиться и сообщить контроллеру (нужды N1–N4 в `plan-T-needs.md`), не реализовывать обход.

- [ ] **Step 1: Сохранить pre-image**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh
  $T apps/web/core/components/ppm-tasks/format.ts apps/web/core/components/ppm-tasks/list-groups.ts \
     apps/web/core/components/ppm-tasks/use-localized-groups.ts apps/web/core/components/ppm-tasks/use-cancelled-groups.ts \
     apps/web/core/components/ppm-tasks/row-placeholder.tsx packages/ppm-brand/src/translations/ux11-tasks.ts \
     apps/web/styles/ppm-v2/tasks.css apps/web/core/components/issues/issue-layouts/list/block.tsx \
     apps/web/core/components/issues/issue-layouts/list/block-root.tsx apps/web/core/components/issues/issue-layouts/list/list-group.tsx \
     apps/web/core/components/issues/issue-layouts/list/headers/group-by-card.tsx apps/web/core/components/issues/issue-layouts/list/default.tsx \
     apps/web/core/components/issues/issue-layouts/kanban/default.tsx apps/web/tests/ppm-tasks/format.test.ts \
     apps/web/tests/ppm-tasks/list-groups.test.ts apps/web/tests/ppm-tasks/tasks-css.test.ts \
     apps/web/tests/ppm-tasks/v1-literals.test.ts apps/web/tests/ppm-tasks/translations.test.ts
  ```

- [ ] **Step 2: Написать падающие тесты**

  `apps/web/tests/ppm-tasks/format.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import { formatPpmTemplate, splitPpmTemplate } from "@/components/ppm-tasks/format";

  describe("PPM tasks templates", () => {
    it("substitutes named placeholders and keeps unknown ones", () => {
      expect(formatPpmTemplate("День {day} из {total}", { day: 8, total: 14 })).toBe("День 8 из 14");
      expect(formatPpmTemplate("Срок — {date}", {})).toBe("Срок — {date}");
    });
    it("splits a template around a token", () => {
      expect(splitPpmTemplate("Ближайший срок — {task}, {date}", "task")).toEqual(["Ближайший срок — ", ", {date}"]);
      expect(splitPpmTemplate("Без токена", "task")).toEqual(["Без токена", ""]);
    });
  });
  ```

  `apps/web/tests/ppm-tasks/list-groups.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import {
    getPpmCancelledStorageKey,
    isPpmCancelledGroup,
    localizePpmGroupColumns,
    parsePpmExpandedGroups,
    togglePpmExpandedGroup,
  } from "@/components/ppm-tasks/list-groups";

  const translate = (key: string) => `t:${key}`;
  const column = (id: string, name: string) => ({ id, name, payload: {}, icon: undefined });
  const noState = () => undefined;

  describe("PPM task list groups", () => {
    it("renames the flat list group", () => {
      const [group] = localizePpmGroupColumns([column("All Issues", "All work items")], {
        groupBy: null,
        translate,
        getStateName: noState,
      });
      expect(group.name).toBe("t:tasks.group.all");
      expect(
        localizePpmGroupColumns([column("All Issues", "All Epics")], { groupBy: null, isEpic: true, translate, getStateName: noState })[0].name
      ).toBe("t:tasks.group.all_epics");
    });

    it("renames None groups by grouping and keeps real names", () => {
      const run = (groupBy: "cycle" | "module" | "labels" | "assignees") =>
        localizePpmGroupColumns([column("c1", "Спринт 3"), column("None", "None")], { groupBy, translate, getStateName: noState }).map(
          (g) => g.name
        );
      expect(run("cycle")).toEqual(["Спринт 3", "t:tasks.group.no_cycle"]);
      expect(run("module")).toEqual(["Спринт 3", "t:tasks.group.no_module"]);
      expect(run("labels")).toEqual(["Спринт 3", "t:tasks.group.no_label"]);
      expect(run("assignees")).toEqual(["Спринт 3", "t:tasks.group.no_assignee"]);
    });

    it("uses the state display name for state grouping and keeps custom states", () => {
      const names: Record<string, string> = { s1: "Бэклог" };
      const groups = localizePpmGroupColumns([column("s1", "Backlog"), column("s2", "Ревью кода")], {
        groupBy: "state",
        translate,
        getStateName: (id) => names[id],
      });
      expect(groups.map((g) => g.name)).toEqual(["Бэклог", "Ревью кода"]);
    });

    it("translates state-group and priority groups", () => {
      expect(
        localizePpmGroupColumns([column("cancelled", "Canceled")], { groupBy: "state_detail.group", translate, getStateName: noState })[0].name
      ).toBe("t:tasks.group.state_cancelled");
      expect(
        localizePpmGroupColumns([column("none", "None")], { groupBy: "priority", translate, getStateName: noState })[0].name
      ).toBe("t:tasks.group.priority_none");
    });

    it("keeps the same object when nothing changes", () => {
      const original = column("l1", "Софт");
      expect(localizePpmGroupColumns([original], { groupBy: "labels", translate, getStateName: noState })[0]).toBe(original);
    });

    it("detects cancelled groups only for state groupings", () => {
      const GROUPS: Record<string, string> = { s9: "cancelled", s1: "backlog" };
      const groupOf = (id: string) => GROUPS[id];
      expect(isPpmCancelledGroup("state", "s9", groupOf)).toBe(true);
      expect(isPpmCancelledGroup("state", "s1", groupOf)).toBe(false);
      expect(isPpmCancelledGroup("state_detail.group", "cancelled", groupOf)).toBe(true);
      expect(isPpmCancelledGroup("priority", "cancelled", groupOf)).toBe(false);
      expect(isPpmCancelledGroup(null, "cancelled", groupOf)).toBe(false);
    });

    it("stores expanded cancelled groups per project, collapsed by default", () => {
      expect(getPpmCancelledStorageKey("p1")).toBe("ppm_tasks_cancelled_expanded:p1");
      expect(parsePpmExpandedGroups(null)).toEqual([]);
      expect(parsePpmExpandedGroups("not json")).toEqual([]);
      expect(parsePpmExpandedGroups('["s9", 3]')).toEqual(["s9"]);
      expect(togglePpmExpandedGroup([], "s9")).toEqual(["s9"]);
      expect(togglePpmExpandedGroup(["s9"], "s9")).toEqual([]);
    });
  });
  ```

  `apps/web/tests/ppm-tasks/tasks-css.test.ts`:
  ```ts
  // UX1.1 T: every Tasks v2 rule is scoped to the v2 design, every --ppm var has a wave-0 fallback,
  // and a list row and its virtualization placeholder take their height from the same token.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const css = readFileSync(new URL("../../styles/ppm-v2/tasks.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
  const body = (selector: string) => rules.find((rule) => rule.selector.split(",").some((part) => part.trim().endsWith(selector)))?.body ?? "";

  describe("tasks.css", () => {
    it("has rules", () => {
      expect(rules.length).toBeGreaterThan(0);
    });
    it("scopes every selector under the v2 design", () => {
      const unscoped = rules
        .flatMap((rule) => rule.selector.split(",").map((part) => part.trim()))
        .filter((part) => !part.startsWith(':where(html[data-ppm-design="v2"]'));
      expect(unscoped).toEqual([]);
    });
    it("gives every --ppm variable a fallback", () => {
      expect(css.match(/var\(--ppm-[\w-]+\)/g) ?? []).toEqual([]);
    });
    it("uses one token for the row and the virtualization placeholder", () => {
      expect(body(".ppm-task-row")).toMatch(/min-height:\s*var\(--ppm-row-height,/);
      expect(body(".ppm-task-row-placeholder")).toMatch(/height:\s*var\(--ppm-row-height,/);
      expect(body(".ppm-task-group-row")).toMatch(/min-height:\s*var\(--ppm-group-row-height,/);
    });
    it("marks the peeked row by background and a 2px left mark, not by focus", () => {
      const peeked = body('.ppm-task-row[data-ppm-peeked="true"]');
      expect(peeked).toMatch(/background-color:\s*var\(--ppm-color-selection-bg,/);
      expect(peeked).toMatch(/box-shadow:\s*inset 2px 0 0 var\(--ppm-color-selection,/);
    });
  });
  ```

  `apps/web/tests/ppm-tasks/v1-literals.test.ts` (регрессионный страж v1; сейчас зелёный, дальше дополняется):
  ```ts
  // UX1.1 T: the v1 (wave 0) branch of every Plane file edited by lane T keeps its exact markup literal.
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const CORE = new URL("../../core/components/", import.meta.url);
  const read = (path: string) => readFileSync(new URL(path, CORE), "utf8");

  const CASES: Array<[string, string]> = [
    [
      "issues/issue-layouts/list/block.tsx",
      '"group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover"',
    ],
    ["issues/issue-layouts/list/block.tsx", '"cursor-pointer truncate text-body-xs-medium text-primary"'],
    ["issues/issue-layouts/list/block-root.tsx", "<ListLoaderItemRow shouldAnimate={false} renderForPlaceHolder defaultPropertyCount={4} />"],
    ["issues/issue-layouts/list/list-group.tsx", '"w-full flex-shrink-0 border-b border-subtle bg-layer-1 py-1 pr-3 hover:bg-layer-1-hover"'],
    ["issues/issue-layouts/list/list-group.tsx", "!collapsedGroups?.group_by.includes(group.id)"],
    ["issues/issue-layouts/list/headers/group-by-card.tsx", '"group/list-header flex w-full flex-shrink-0 items-center gap-2 py-1.5"'],
    ["issues/issue-layouts/list/headers/group-by-card.tsx", '"Create work item"'],
  ];

  describe("lane T keeps the v1 markup literals", () => {
    it.each(CASES)("%s keeps %s", (file, literal) => {
      expect(read(file)).toContain(literal);
    });
  });
  ```

  `apps/web/tests/ppm-tasks/translations.test.ts`:
  ```ts
  // UX1.1 T: every tasks.* key used by lane T exists in both locales, en/ru parity, no banned RU terms.
  import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
  import { join } from "node:path";
  import { PPM_TRANSLATIONS } from "@ppm/brand";
  import { describe, expect, it } from "vitest";

  const en = PPM_TRANSLATIONS.en as Record<string, string>;
  const ru = PPM_TRANSLATIONS.ru as Record<string, string>;
  const taskKeys = (dict: Record<string, string>) => Object.keys(dict).filter((key) => key.startsWith("tasks.")).sort();
  const CORE = new URL("../../core/components/", import.meta.url).pathname;
  const APP = new URL("../../app/", import.meta.url).pathname;
  const walk = (dir: string): string[] =>
    existsSync(dir) ? readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)])) : [];
  const FILES = [
    ...walk(join(CORE, "ppm-tasks")),
    join(CORE, "issues/issue-layouts/list/block.tsx"),
    join(CORE, "issues/issue-layouts/list/list-group.tsx"),
    join(CORE, "issues/issue-layouts/list/headers/group-by-card.tsx"),
    join(CORE, "issues/header.tsx"),
    join(APP, "(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx"),
  ].filter((file) => /\.(ts|tsx)$/.test(file));
  const BANNED = [/рабоч\p{L}*\s+элемент/iu, /(?<!\p{L})цикл(?!ическ)/iu, /(?<!\p{L})модул/iu, /представлени/iu, /(?<!\p{L})ИИ(?!\p{L})/u, /Plane/u];

  describe("tasks.* translations", () => {
    it("defines the same tasks.* keys in en and ru", () => {
      expect(taskKeys(en).length).toBeGreaterThan(40);
      expect(taskKeys(ru)).toEqual(taskKeys(en));
    });
    it("defines every tasks.* key referenced by lane T", () => {
      const used = new Set(
        FILES.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/["'`](tasks\.[a-z0-9_.]+)["'`]/g)].map((m) => m[1]))
      );
      expect([...used].filter((key) => !(key in en) || !(key in ru))).toEqual([]);
    });
    it("keeps banned terms out of the Russian strings", () => {
      expect(taskKeys(ru).filter((key) => BANNED.some((re) => re.test(ru[key])))).toEqual([]);
    });
  });
  ```

- [ ] **Step 3: Запустить — тесты падают**
  `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-tasks`
  Ожидание: FAIL `format`/`list-groups` (модули не найдены), `tasks-css` («has rules» — 0 правил),
  `translations` (0 ключей `tasks.*`); `v1-literals` — PASS.

- [ ] **Step 4: Модуль переводов (все ключи линии)** — заменить содержимое
  `packages/ppm-brand/src/translations/ux11-tasks.ts` целиком:
  ```ts
  /**
   * UX1.1 · линия T («Задачи»). Строки экрана «Задачи» для PPM_TRANSLATIONS (вливает F).
   * en и ru — одинаковые ключи. Плейсхолдеры {name} подставляет formatPpmTemplate (ICU здесь нет).
   */
  export const UX11_TASKS_TRANSLATIONS = {
    en: {
      "tasks.group.all": "All tasks",
      "tasks.group.all_epics": "All epics",
      "tasks.group.no_cycle": "No sprint",
      "tasks.group.no_module": "No direction",
      "tasks.group.no_label": "No label",
      "tasks.group.no_assignee": "Unassigned",
      "tasks.group.state_backlog": "Backlog",
      "tasks.group.state_unstarted": "Unstarted",
      "tasks.group.state_started": "Started",
      "tasks.group.state_completed": "Completed",
      "tasks.group.state_cancelled": "Cancelled",
      "tasks.group.priority_urgent": "Urgent",
      "tasks.group.priority_high": "High",
      "tasks.group.priority_medium": "Medium",
      "tasks.group.priority_low": "Low",
      "tasks.group.priority_none": "No priority",
      "tasks.group.cancelled_empty": "No cancelled tasks — all plans stand",
      "tasks.group.add_in_group": "New task in “{group}”",
      "tasks.group.create_task": "Create task",
      "tasks.group.add_existing": "Add an existing task",
      "tasks.new_task": "New task",
      "tasks.new_task_keys": ", keys N, then I",
      "tasks.sprint.open": "Open sprint",
      "tasks.sprint.scale_label": "Sprint scale",
      "tasks.sprint.today": "today",
      "tasks.sprint.day_of": "Day {day} of {total}",
      "tasks.sprint.days_left_one": "{count} day left",
      "tasks.sprint.days_left_few": "{count} days left",
      "tasks.sprint.days_left_many": "{count} days left",
      "tasks.sprint.days_left_other": "{count} days left",
      "tasks.sprint.last_day": "last day",
      "tasks.evidence.pr": "PR {ref}",
      "tasks.evidence.materials": "Materials: {count}",
      "tasks.evidence.materials_hint": "Attachments: {attachments} · links: {links}",
      "tasks.evidence.blocked_by": "Blocked by task",
      "tasks.evidence.blocked_more": "and {count} more",
      "tasks.curator.title": "Needs attention",
      "tasks.curator.hide": "Hide column",
      "tasks.curator.show": "Show “Needs attention”",
      "tasks.curator.blocked": "Blocked",
      "tasks.curator.blocked_empty": "No blocked tasks",
      "tasks.curator.waits_for": "Waits for",
      "tasks.curator.review": "Awaiting review",
      "tasks.curator.review_empty": "Nothing awaits review",
      "tasks.curator.changed_at": "Changed {when}",
      "tasks.curator.overdue": "Overdue",
      "tasks.curator.overdue_empty": "No overdue tasks",
      "tasks.curator.due_on": "Due {date}",
      "tasks.curator.nearest_due": "Nearest due date — {task}, {date}",
      "tasks.curator.recent": "Recently changed",
      "tasks.curator.recent_empty": "No tasks yet",
      "tasks.curator.more": "and {count} more",
      "tasks.curator.unassigned": "Unassigned",
      "tasks.curator.today_at": "today, {time}",
      "tasks.curator.yesterday_at": "yesterday, {time}",
      "tasks.curator.hint": "Click a task — its card opens on the right and this column hides.",
      "tasks.curator.loading": "Loading…",
      "tasks.curator.error": "Could not load the summary",
      "tasks.curator.retry": "Retry",
      "tasks.curator.partial": "Based on the {count} most recently changed tasks",
    },
    ru: {
      "tasks.group.all": "Все задачи",
      "tasks.group.all_epics": "Все эпики",
      "tasks.group.no_cycle": "Без спринта",
      "tasks.group.no_module": "Без направления",
      "tasks.group.no_label": "Без метки",
      "tasks.group.no_assignee": "Не назначены",
      "tasks.group.state_backlog": "Бэклог",
      "tasks.group.state_unstarted": "К работе",
      "tasks.group.state_started": "В работе",
      "tasks.group.state_completed": "Готово",
      "tasks.group.state_cancelled": "Отменена",
      "tasks.group.priority_urgent": "Срочный",
      "tasks.group.priority_high": "Высокий",
      "tasks.group.priority_medium": "Средний",
      "tasks.group.priority_low": "Низкий",
      "tasks.group.priority_none": "Без приоритета",
      "tasks.group.cancelled_empty": "Отменённых задач нет — все планы в силе",
      "tasks.group.add_in_group": "Новая задача в группе «{group}»",
      "tasks.group.create_task": "Создать задачу",
      "tasks.group.add_existing": "Добавить существующую задачу",
      "tasks.new_task": "Новая задача",
      "tasks.new_task_keys": ", клавиши N, затем I",
      "tasks.sprint.open": "Открыть спринт",
      "tasks.sprint.scale_label": "Шкала спринта",
      "tasks.sprint.today": "сегодня",
      "tasks.sprint.day_of": "День {day} из {total}",
      "tasks.sprint.days_left_one": "остался {count} день",
      "tasks.sprint.days_left_few": "осталось {count} дня",
      "tasks.sprint.days_left_many": "осталось {count} дней",
      "tasks.sprint.days_left_other": "осталось {count} дня",
      "tasks.sprint.last_day": "последний день",
      "tasks.evidence.pr": "PR {ref}",
      "tasks.evidence.materials": "Материалов: {count}",
      "tasks.evidence.materials_hint": "Вложений: {attachments} · ссылок: {links}",
      "tasks.evidence.blocked_by": "Заблокирована задачей",
      "tasks.evidence.blocked_more": "и ещё {count}",
      "tasks.curator.title": "Требует внимания",
      "tasks.curator.hide": "Скрыть колонку",
      "tasks.curator.show": "Показать «Требует внимания»",
      "tasks.curator.blocked": "Заблокировано",
      "tasks.curator.blocked_empty": "Заблокированных задач нет",
      "tasks.curator.waits_for": "Ждёт",
      "tasks.curator.review": "Ждёт проверки",
      "tasks.curator.review_empty": "На проверке ничего нет",
      "tasks.curator.changed_at": "Изменена {when}",
      "tasks.curator.overdue": "Просрочено",
      "tasks.curator.overdue_empty": "Просроченных задач нет",
      "tasks.curator.due_on": "Срок — {date}",
      "tasks.curator.nearest_due": "Ближайший срок — {task}, {date}",
      "tasks.curator.recent": "Недавно изменённые",
      "tasks.curator.recent_empty": "Задач пока нет",
      "tasks.curator.more": "и ещё {count}",
      "tasks.curator.unassigned": "Не назначен",
      "tasks.curator.today_at": "сегодня, {time}",
      "tasks.curator.yesterday_at": "вчера, {time}",
      "tasks.curator.hint": "Нажмите на задачу — справа откроется её карточка, а эта колонка спрячется.",
      "tasks.curator.loading": "Загружаем…",
      "tasks.curator.error": "Не удалось загрузить сводку",
      "tasks.curator.retry": "Повторить",
      "tasks.curator.partial": "По {count} последним изменённым задачам",
    },
  } as const;
  ```
  Затем: `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pkg-build.sh ppm-brand`
  → `✔ Build complete`; `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run` → зелёный (паритет и запрет
  терминов у F).

- [ ] **Step 5: Чистые хелперы и хуки**

  `apps/web/core/components/ppm-tasks/format.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { MouseEvent } from "react";

  /** Подставляет {name} в плоскую строку PPM_TRANSLATIONS (ICU там нет). */
  export function formatPpmTemplate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (match: string, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
    );
  }

  /** Делит шаблон вокруг {token}, чтобы вставить моноширинный ID задачи в середину фразы. */
  export function splitPpmTemplate(template: string, token: string): [string, string] {
    const marker = `{${token}}`;
    const index = template.indexOf(marker);
    if (index === -1) return [template, ""];
    return [template.slice(0, index), template.slice(index + marker.length)];
  }

  /** Обычный клик — действие внутри приложения; клик с модификатором или не левой кнопкой — поведение ссылки. */
  export function handlePpmSpaClick(event: MouseEvent<HTMLAnchorElement>, onOpen: () => void): void {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onOpen();
  }
  ```

  `apps/web/core/components/ppm-tasks/list-groups.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { IGroupByColumn, TIssueGroupByOptions } from "@plane/types";
  import type { TPpmTranslationKey } from "@ppm/brand";

  export const PPM_CANCELLED_EXPANDED_PREFIX = "ppm_tasks_cancelled_expanded:";

  export function getPpmCancelledStorageKey(projectId: string): string {
    return `${PPM_CANCELLED_EXPANDED_PREFIX}${projectId}`;
  }

  export function parsePpmExpandedGroups(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
    } catch {
      return [];
    }
  }

  export function togglePpmExpandedGroup(ids: readonly string[], groupId: string): string[] {
    return ids.includes(groupId) ? ids.filter((id) => id !== groupId) : [...ids, groupId];
  }

  export function isPpmCancelledGroup(
    groupBy: TIssueGroupByOptions | null | undefined,
    groupId: string,
    getStateGroup: (stateId: string) => string | undefined
  ): boolean {
    if (groupBy === "state") return getStateGroup(groupId) === "cancelled";
    if (groupBy === "state_detail.group") return groupId === "cancelled";
    return false;
  }

  const NONE_GROUP_KEYS: Record<string, TPpmTranslationKey> = {
    cycle: "tasks.group.no_cycle",
    module: "tasks.group.no_module",
    labels: "tasks.group.no_label",
    assignees: "tasks.group.no_assignee",
  };
  const STATE_GROUP_KEYS: Record<string, TPpmTranslationKey> = {
    backlog: "tasks.group.state_backlog",
    unstarted: "tasks.group.state_unstarted",
    started: "tasks.group.state_started",
    completed: "tasks.group.state_completed",
    cancelled: "tasks.group.state_cancelled",
  };
  const PRIORITY_KEYS: Record<string, TPpmTranslationKey> = {
    urgent: "tasks.group.priority_urgent",
    high: "tasks.group.priority_high",
    medium: "tasks.group.priority_medium",
    low: "tasks.group.priority_low",
    none: "tasks.group.priority_none",
  };

  export type TPpmGroupLocalizeOptions = {
    groupBy: TIssueGroupByOptions | null | undefined;
    isEpic?: boolean;
    translate: (key: TPpmTranslationKey) => string;
    getStateName: (stateId: string) => string | undefined;
  };

  /** Только отображение: id, payload и порядок групп не меняются (R10, R11). */
  export function localizePpmGroupColumns(groups: IGroupByColumn[], options: TPpmGroupLocalizeOptions): IGroupByColumn[] {
    const { groupBy, isEpic = false, translate, getStateName } = options;
    return groups.map((group) => {
      let name = group.name;
      const noneKey = groupBy ? NONE_GROUP_KEYS[groupBy] : undefined;
      if (!groupBy && group.id === "All Issues") name = translate(isEpic ? "tasks.group.all_epics" : "tasks.group.all");
      else if (group.id === "None" && noneKey) name = translate(noneKey);
      else if (groupBy === "state") name = getStateName(group.id) ?? group.name;
      else if (groupBy === "state_detail.group" && STATE_GROUP_KEYS[group.id]) name = translate(STATE_GROUP_KEYS[group.id]);
      else if (groupBy === "priority" && PRIORITY_KEYS[group.id]) name = translate(PRIORITY_KEYS[group.id]);
      return name === group.name ? group : { ...group, name };
    });
  }
  ```

  `apps/web/core/components/ppm-tasks/use-localized-groups.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useTranslation } from "@plane/i18n";
  import type { IGroupByColumn, TIssueGroupByOptions } from "@plane/types";
  import { useProjectState } from "@/hooks/store/use-project-state";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { getPpmStateDisplayName, usePpmDesignV2 } from "@/lib/ppm-design";
  import { localizePpmGroupColumns } from "./list-groups";

  /** v1 — возвращает тот же массив; v2 — русские подписи групп. Вызывать только из observer-компонентов. */
  export function usePpmLocalizedGroupColumns(
    groups: IGroupByColumn[] | undefined,
    groupBy: TIssueGroupByOptions | null | undefined,
    isEpic = false
  ): IGroupByColumn[] | undefined {
    const isDesignV2 = usePpmDesignV2();
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const { getStateById } = useProjectState();
    if (!isDesignV2 || !groups) return groups;
    return localizePpmGroupColumns(groups, {
      groupBy,
      isEpic,
      translate: ppmT,
      getStateName: (stateId) => getPpmStateDisplayName(getStateById(stateId), currentLocale),
    });
  }
  ```

  `apps/web/core/components/ppm-tasks/use-cancelled-groups.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useCallback, useEffect, useState } from "react";
  import { getPpmCancelledStorageKey, parsePpmExpandedGroups, togglePpmExpandedGroup } from "./list-groups";

  function readExpanded(projectId: string | undefined): string[] {
    if (!projectId || typeof window === "undefined") return [];
    try {
      return parsePpmExpandedGroups(window.localStorage.getItem(getPpmCancelledStorageKey(projectId)));
    } catch {
      return [];
    }
  }

  function writeExpanded(projectId: string, ids: string[]): void {
    try {
      window.localStorage.setItem(getPpmCancelledStorageKey(projectId), JSON.stringify(ids));
    } catch {
      // localStorage недоступен: раскрытие живёт до перезагрузки, сохранённые фильтры не трогаем
    }
  }

  /** «Отменена» свёрнута по умолчанию; раскрытие хранится локально по проекту (не в kanban_filters). */
  export function usePpmExpandedCancelledGroups(projectId: string | undefined) {
    const [expandedIds, setExpandedIds] = useState<string[]>(() => readExpanded(projectId));

    useEffect(() => {
      setExpandedIds(readExpanded(projectId));
    }, [projectId]);

    const toggle = useCallback(
      (groupId: string) => {
        if (!projectId) return;
        const next = togglePpmExpandedGroup(readExpanded(projectId), groupId);
        writeExpanded(projectId, next);
        setExpandedIds(next);
      },
      [projectId]
    );

    const expand = useCallback(
      (groupId: string) => {
        if (!projectId) return;
        const current = readExpanded(projectId);
        if (current.includes(groupId)) return;
        const next = [...current, groupId];
        writeExpanded(projectId, next);
        setExpandedIds(next);
      },
      [projectId]
    );

    const isExpanded = useCallback((groupId: string) => expandedIds.includes(groupId), [expandedIds]);

    return { isExpanded, toggle, expand };
  }
  ```

  `apps/web/core/components/ppm-tasks/row-placeholder.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { Row } from "@plane/ui";

  /** Плейсхолдер виртуализации v2: высота из того же --ppm-row-height, что и у строки (tasks.css). */
  export function PpmTaskRowPlaceholder() {
    return (
      <Row className="ppm-task-row-placeholder flex items-center gap-3 bg-surface-1">
        <span aria-hidden="true" className="h-4 w-14 rounded-sm bg-surface-2" />
        <span aria-hidden="true" className="h-4 w-48 rounded-sm bg-surface-2" />
      </Row>
    );
  }
  ```

- [ ] **Step 6: `tasks.css` — блок T1** (дописать в конец файла, созданного F):
  ```css
  /* UX1.1 · линия T («Задачи»). Все правила — под :where(html[data-ppm-design="v2"]), файл подключён без слоя.
     Здесь нельзя задавать display элементам, которые прячет утилита hidden. */

  /* ─── T1 · строки и группы ─── */
  :where(html[data-ppm-design="v2"]) .ppm-task-row {
    min-height: var(--ppm-row-height, 2.75rem);
  }

  @media (min-width: 48rem) {
    :where(html[data-ppm-design="v2"]) .ppm-task-row.md\:flex-row {
      padding-block: 0;
    }
  }

  @media (min-width: 64rem) {
    :where(html[data-ppm-design="v2"]) .ppm-task-row.lg\:flex-row {
      padding-block: 0;
    }
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-row-placeholder {
    height: var(--ppm-row-height, 2.75rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-row[data-ppm-selected="true"] {
    background-color: var(--ppm-color-selection-bg, var(--bg-accent-subtle));
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-row[data-ppm-peeked="true"] {
    background-color: var(--ppm-color-selection-bg, var(--bg-accent-subtle));
    box-shadow: inset 2px 0 0 var(--ppm-color-selection, var(--border-accent-strong));
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-group-row {
    display: flex;
    align-items: center;
    min-height: var(--ppm-group-row-height, 2.25rem);
  }
  ```
  Пояснение: в режиме «строкой» (`md:flex-row`/`lg:flex-row` из `block.tsx:189-190`) вертикальных отступов нет,
  высота = токен (36/32); в узкой раскладке (две строки) остаётся `py-1.5`. Плейсхолдер = тот же токен → при
  прокрутке высота не меняется (`notes/risk.md` §3.1).

- [ ] **Step 7: `block.tsx`**
  - Импорт после `:31` (`usePlatformOS`): `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - После `:109` (`const { isMobile } = usePlatformOS();`): `const isDesignV2 = usePpmDesignV2();`
  - После `:137` (`const canSelectIssues = …`):
    `const isPeekedHere = getIsIssuePeeked(issue.id) && peekIssue?.nestingLevel === nestingLevel;`
  - `:181-192` было:
    ```tsx
        className={cn(
          "group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover",
          {
            "border-accent-strong": getIsIssuePeeked(issue.id) && peekIssue?.nestingLevel === nestingLevel,
            "border-strong-1": isIssueActive,
            "last:border-b-transparent": !getIsIssuePeeked(issue.id) && !isIssueActive,
            "bg-accent-primary/5 hover:bg-accent-primary/10": isIssueSelected,
    ```
    стало (остальные ключи объекта и их порядок — без изменений):
    ```tsx
        className={cn(
          isDesignV2
            ? "ppm-task-row group/list-block relative flex flex-col gap-3 bg-layer-transparent py-1.5 text-13 transition-colors hover:bg-layer-transparent-hover"
            : "group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover",
          {
            "border-accent-strong": !isDesignV2 && isPeekedHere,
            "border-strong-1": isIssueActive,
            "last:border-b-transparent": !getIsIssuePeeked(issue.id) && !isIssueActive,
            "bg-accent-primary/5 hover:bg-accent-primary/10": !isDesignV2 && isIssueSelected,
    ```
    и сразу после закрывающей `)}` пропа `className` добавить:
    ```tsx
        data-ppm-peeked={isDesignV2 && isPeekedHere ? "true" : undefined}
        data-ppm-selected={isDesignV2 && isIssueSelected ? "true" : undefined}
    ```
    (при `v1` выражения совпадают с прежними, атрибуты не рендерятся).
  - `:237` было `<div className="flex-shrink-0" style={{ minWidth: \`${keyMinWidth}px\` }}>` →
    `<div className={isDesignV2 ? "flex-shrink-0 font-code tabular-nums" : "flex-shrink-0"} style={{ minWidth: \`${keyMinWidth}px\` }}>`
  - `:280` было `<p className="cursor-pointer truncate text-body-xs-medium text-primary">{issue.name}</p>` →
    ```tsx
              <p
                className={
                  isDesignV2
                    ? "ppm-task-title cursor-pointer truncate ppm-text-body text-primary"
                    : "cursor-pointer truncate text-body-xs-medium text-primary"
                }
              >
                {issue.name}
              </p>
    ```

- [ ] **Step 8: `block-root.tsx`**
  - Импорты после `:21`: `import { PpmTaskRowPlaceholder } from "@/components/ppm-tasks/row-placeholder";` и
    `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - После `:78` (`const { isMobile } = usePlatformOS();`): `const isDesignV2 = usePpmDesignV2();`
  - `:142` было
    `placeholderChildren={<ListLoaderItemRow shouldAnimate={false} renderForPlaceHolder defaultPropertyCount={4} />}` →
    ```tsx
        placeholderChildren={
          isDesignV2 ? (
            <PpmTaskRowPlaceholder />
          ) : (
            <ListLoaderItemRow shouldAnimate={false} renderForPlaceHolder defaultPropertyCount={4} />
          )
        }
    ```
    (`ListLoaderItemRow` в `ui/loader/…` не трогаем — файл не принадлежит линии T.)

- [ ] **Step 9: `list-group.tsx`**
  - Импорты: после `:11` `import { useParams } from "next/navigation";`; после `:35`
    `import { usePpmExpandedCancelledGroups } from "@/components/ppm-tasks/use-cancelled-groups";`,
    `import { isPpmCancelledGroup } from "@/components/ppm-tasks/list-groups";`,
    `import { usePpmTranslation } from "@/hooks/use-ppm-translation";`, `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - `:105-108` было:
    ```tsx
    const isExpanded = !collapsedGroups?.group_by.includes(group.id);
    const groupRef = useRef<HTMLDivElement | null>(null);
    const { t } = useTranslation();
    const projectState = useProjectState();
    ```
    стало:
    ```tsx
    const groupRef = useRef<HTMLDivElement | null>(null);
    const { t } = useTranslation();
    const projectState = useProjectState();
    const isDesignV2 = usePpmDesignV2();
    const ppmT = usePpmTranslation();
    const { projectId: routerProjectId } = useParams();
    const projectId = routerProjectId?.toString();
    const cancelledGroups = usePpmExpandedCancelledGroups(projectId);
    const isCancelledGroup =
      isDesignV2 && !!projectId && isPpmCancelledGroup(group_by, group.id, (id) => projectState.getStateById(id)?.group);
    const isExpanded = isCancelledGroup
      ? cancelledGroups.isExpanded(group.id)
      : !collapsedGroups?.group_by.includes(group.id);
    const handleToggleGroup = (value: string) =>
      isCancelledGroup ? cancelledGroups.toggle(value) : handleCollapsedGroups(value);
    ```
  - `:234-236` было `if (!isExpanded) { handleCollapsedGroups(group.id); }` →
    ```tsx
          if (!isExpanded) {
            if (isCancelledGroup) cancelledGroups.expand(group.id);
            else handleCollapsedGroups(group.id);
          }
    ```
  - `:266-270` было `className={cn("w-full flex-shrink-0 border-b border-subtle bg-layer-1 py-1 pr-3 hover:bg-layer-1-hover", {` →
    ```tsx
        className={cn(
          isDesignV2
            ? "ppm-task-group-row w-full flex-shrink-0 border-b border-subtle bg-surface-2 pr-3"
            : "w-full flex-shrink-0 border-b border-subtle bg-layer-1 py-1 pr-3 hover:bg-layer-1-hover",
          {
    ```
    (объект `sticky top-0 z-[2]` без изменений).
  - В `<HeaderGroupByCard …>` (`:271-286`): `handleCollapsedGroups={isDesignV2 ? handleToggleGroup : handleCollapsedGroups}`
    и два новых пропа:
    ```tsx
          isExpanded={isDesignV2 && group_by ? isExpanded : undefined}
          ppmEmptyHint={
            isDesignV2 && isCancelledGroup && groupIssueCount === 0 ? ppmT("tasks.group.cancelled_empty") : undefined
          }
    ```

- [ ] **Step 10: `headers/group-by-card.tsx`**
  - Импорты после `:25`: `import { ChevronRightIcon } from "@plane/propel/icons";` (дописать в импорт `:11`
    рядом с `PlusIcon`), `import { formatPpmTemplate } from "@/components/ppm-tasks/format";`,
    `import { usePpmTranslation } from "@/hooks/use-ppm-translation";`, `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - В `IHeaderGroupByCard` (`:27-40`) добавить `isExpanded?: boolean;` и `ppmEmptyHint?: string;`, в деструктуризацию
    (`:43-55`) — `isExpanded, ppmEmptyHint`.
  - После `:67`:
    ```tsx
    const isDesignV2 = usePpmDesignV2();
    const ppmT = usePpmTranslation();
    const addInGroupLabel = formatPpmTemplate(ppmT("tasks.group.add_in_group"), { group: title });
    const groupIcon = icon ?? <CircleDashed className="size-3.5" strokeWidth={2} />;
    ```
  - `:93` было `<div className="group/list-header flex w-full flex-shrink-0 items-center gap-2 py-1.5">` →
    ```tsx
      <div
        className={
          isDesignV2
            ? "group/list-header flex w-full flex-shrink-0 items-center gap-2"
            : "group/list-header flex w-full flex-shrink-0 items-center gap-2 py-1.5"
        }
      >
    ```
  - `:109-121` (иконка + переключатель) заменить на:
    ```tsx
        {!isDesignV2 && <div className="grid flex-shrink-0 place-items-center overflow-hidden">{groupIcon}</div>}

        {isDesignV2 ? (
          <>
            {isExpanded === undefined ? (
              <div className="flex min-w-0 items-center gap-2">
                <span className="grid flex-shrink-0 place-items-center">{groupIcon}</span>
                <span className="truncate ppm-text-title-3 text-primary">{title}</span>
                <span className="font-code text-12 text-tertiary tabular-nums">{count || 0}</span>
              </div>
            ) : (
              <button
                type="button"
                aria-expanded={isExpanded}
                onClick={() => handleCollapsedGroups(groupID)}
                className="flex min-w-0 items-center gap-2 rounded-md pr-1.5 text-left"
              >
                <ChevronRightIcon
                  aria-hidden="true"
                  className={
                    isExpanded
                      ? "size-3.5 flex-shrink-0 rotate-90 text-tertiary transition-transform"
                      : "size-3.5 flex-shrink-0 text-tertiary transition-transform"
                  }
                />
                <span className="grid flex-shrink-0 place-items-center">{groupIcon}</span>
                <span className="truncate ppm-text-title-3 text-primary">{title}</span>
                <span className="font-code text-12 text-tertiary tabular-nums">{count || 0}</span>
              </button>
            )}
            {ppmEmptyHint && <span className="truncate text-12 text-tertiary">{ppmEmptyHint}</span>}
            <span aria-hidden="true" className="flex-1" />
          </>
        ) : (
          <>
            {/* eslint-disable-next-line jsx_a11y/click-events-have-key-events eslint-disable-next-line jsx_a11y/no-static-element-interactions */}
            <div
              className="relative flex w-full cursor-pointer flex-row items-center gap-1 overflow-hidden"
              onClick={() => handleCollapsedGroups(groupID)}
            >
              <div className="line-clamp-1 inline-block truncate font-medium text-primary">{title}</div>
              <div className="pl-2 text-13 font-medium text-tertiary">{count || 0}</div>
              <div className="px-2.5"></div>
            </div>
          </>
        )}
    ```
    (ветка v1 — прежний JSX `:110-121` дословно; фрагмент в DOM не попадает.)
  - `:137` и `:144`: `{isDesignV2 ? ppmT("tasks.group.create_task") : "Create work item"}` и
    `{isDesignV2 ? ppmT("tasks.group.add_existing") : "Add an existing work item"}`.
  - `:147-156` (ветка без меню) было `) : ( // oxlint… <div className="flex h-5 w-5 …" onClick=…> … </div> ))}` →
    ```tsx
          ) : isDesignV2 ? (
            <button
              type="button"
              aria-label={addInGroupLabel}
              title={addInGroupLabel}
              onClick={() => setIsOpen(true)}
              className="grid size-6 flex-shrink-0 place-items-center rounded-md text-tertiary hover:bg-layer-1-hover hover:text-secondary"
            >
              <PlusIcon aria-hidden="true" width={14} strokeWidth={2} />
            </button>
          ) : (
            // oxlint-disable-next-line jsx_a11y/click-events-have-key-events oxlint-disable-next-line jsx_a11y/no-static-element-interactions
            <div
              className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xs transition-all hover:bg-layer-1"
              onClick={() => {
                setIsOpen(true);
              }}
            >
              <PlusIcon width={14} strokeWidth={2} />
            </div>
          ))}
    ```

- [ ] **Step 11: `list/default.tsx` и `kanban/default.tsx` — русские подписи групп**
  - `list/default.tsx`: импорт после `:32` —
    `import { usePpmLocalizedGroupColumns } from "@/components/ppm-tasks/use-localized-groups";`;
    `:90-95` было `const groups = getGroupByColumns({ … });` →
    ```tsx
    const groups = usePpmLocalizedGroupColumns(
      getGroupByColumns({
        groupBy: group_by as GroupByColumnTypes,
        includeNone: true,
        isWorkspaceLevel: isWorkspaceLevel(storeType),
        isEpic: isEpic,
      }),
      group_by,
      isEpic
    );
    ```
  - `kanban/default.tsx`: импорт после `:28` — тот же; `:109-114` `const list = getGroupByColumns({ … });` →
    ```tsx
    const list = usePpmLocalizedGroupColumns(
      getGroupByColumns({
        groupBy: group_by as GroupByColumnTypes,
        includeNone: true,
        isWorkspaceLevel: isWorkspaceLevel(storeType),
        isEpic: isEpic,
      }),
      group_by,
      isEpic
    );
    ```
  (хук вызывается до ранних `return` — порядок хуков стабилен.)

- [ ] **Step 12: Прогон и формат**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run tests/ppm-tasks` → 5 файлов PASS.
  - `./node_modules/.bin/vitest run` → 184 + новые, всё зелёное.
  - Типы (команда из Global Constraints) → `T: 0 ошибок`.
  - `../../node_modules/.bin/oxfmt core/components/ppm-tasks tests/ppm-tasks core/components/issues/issue-layouts/list/block.tsx core/components/issues/issue-layouts/list/block-root.tsx core/components/issues/issue-layouts/list/list-group.tsx core/components/issues/issue-layouts/list/headers/group-by-card.tsx core/components/issues/issue-layouts/list/default.tsx core/components/issues/issue-layouts/kanban/default.tsx`
  - `../../node_modules/.bin/oxlint core/components/ppm-tasks tests/ppm-tasks` → 0 errors.
  - `cd $PF/packages/ppm-brand && node scripts/audit-tailwind-classes.mjs` → `passed` (классы `ppm-task-*` —
    максимум заметки, пока F не добавил `tasks.css` в `customCssFiles`, N3).
  - `oxfmt` для `packages/ppm-brand/src/translations/ux11-tasks.ts`: `cd $PF/packages/ppm-brand && ../../node_modules/.bin/oxfmt src/translations/ux11-tasks.ts`.

- [ ] **Step 13: Смоук (контроллер, браузер, только чтение)** — «Задачи» проекта с группировкой «статус»,
  тёмная и светлая темы: строки 36 px (DevTools), группа 36 px, открытая в peek строка — подложка + метка слева,
  «Отменена» свёрнута и помнит раскрытие после перезагрузки, «Backlog/Todo/…» показаны как «Бэклог/К работе/…»;
  без группировки — «Все задачи». Затем `localStorage.ppm_design="v1"` + перезагрузка → строки 44 px, «All work
  items», прежние группы; вернуть значение.

**Acceptance T1:**
- [ ] C «Строки списков»: строка и плейсхолдер виртуализации берут высоту из `--ppm-row-height` (тест
  `tasks-css`), открытая в peek строка заметна (подложка + метка 2 px), выделенные чекбоксом — подложка.
- [ ] D: «Отменена» свёрнута по умолчанию (localStorage, по проекту), подписи групп и «Все задачи» по-русски,
  дефолтные статусы — по-русски только в отображении (R10, R11: группировка и данные не меняются).
- [ ] v1: литералы волны 0 на месте (`v1-literals`), атрибуты `data-ppm-*` и классы `ppm-task-*` не рендерятся.
- [ ] Заголовок группы доступен с клавиатуры (`button aria-expanded`), «+» — кнопка с именем.

---

### Task 7 (T2): Шапка «Задач»: счётчик, «Список/Доска», «Новая задача · N I», шкала спринта

**Files:**
- Create: `apps/web/core/components/ppm-tasks/sprint.ts`
- Create: `apps/web/core/components/ppm-tasks/sprint-scale-view.tsx`
- Create: `apps/web/core/components/ppm-tasks/sprint-scale.tsx`
- Create: `apps/web/core/components/ppm-tasks/new-task-label.tsx`
- Modify: `apps/web/core/components/issues/header.tsx:25-39` (импорты), `:54`, `:91-103`, `:137-139`
- Modify: `apps/web/core/components/issues/issue-layouts/filters/header/layout-selection.tsx:7-16`, `:24-61`
- Modify: `apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx:7-23`
- Modify: `apps/web/styles/ppm-v2/tasks.css` (блок T2)
- Modify: `apps/web/tests/ppm-tasks/v1-literals.test.ts` (кейсы T2)
- Create (тесты): `apps/web/tests/ppm-tasks/sprint.test.ts`, `sprint-scale-view.test.tsx`, `new-task-label.test.tsx`

**Interfaces:**
- Consumes: `formatPpmTemplate`, `handlePpmSpaClick` (T1); `useCycle().getProjectCycleDetails`
  (`core/store/cycle.store.ts:339-345`, спринты загружены `project-wrapper.tsx:129-133`), `project.cycle_view`;
  токены `--ppm-sprint-strip-height`, `--ppm-page-padding-x`, `--ppm-control-height-sm`, `--ppm-color-accent-active`,
  `--ppm-color-on-accent`.
- Produces: `computePpmSprintScale`, `formatPpmSprintRange`, `selectPpmPluralKey`, `PPM_DAYS_LEFT_KEYS`;
  `PpmSprintScale`, `PpmSprintScaleView`, `PpmNewTaskLabel`; классы `.ppm-sprint*`, `.ppm-layout-switch*`, `.ppm-kbd`.

- [ ] **Step 1: pre-image**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh
  $T apps/web/core/components/ppm-tasks/sprint.ts apps/web/core/components/ppm-tasks/sprint-scale-view.tsx \
     apps/web/core/components/ppm-tasks/sprint-scale.tsx apps/web/core/components/ppm-tasks/new-task-label.tsx \
     apps/web/core/components/issues/header.tsx apps/web/core/components/issues/issue-layouts/filters/header/layout-selection.tsx \
     "apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx" \
     apps/web/tests/ppm-tasks/sprint.test.ts apps/web/tests/ppm-tasks/sprint-scale-view.test.tsx \
     apps/web/tests/ppm-tasks/new-task-label.test.tsx
  ```

- [ ] **Step 2: Падающие тесты**

  `apps/web/tests/ppm-tasks/sprint.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import { computePpmSprintScale, formatPpmSprintRange, selectPpmPluralKey } from "@/components/ppm-tasks/sprint";

  const today = (y: number, m: number, d: number) => new Date(y, m - 1, d, 13, 30);

  describe("sprint scale", () => {
    it("matches the mockup: 16–29 Sep, today the 23rd", () => {
      const scale = computePpmSprintScale("2026-09-16", "2026-09-29", today(2026, 9, 23));
      expect(scale).not.toBeNull();
      expect(scale?.totalDays).toBe(14);
      expect(scale?.dayIndex).toBe(8);
      expect(scale?.daysLeft).toBe(6);
      expect(scale?.todayPosition).toBeCloseTo(7 / 13);
      expect(scale?.ticks.filter((t) => t.isMajor).map((t) => t.label)).toEqual(["16", "21", "28", "29"]);
      expect(scale?.ticks.every((t) => t.showLabel)).toBe(true);
      expect(scale?.ticks.find((t) => t.isToday)?.label).toBe("23");
    });

    it("reads project-timezone strings by their calendar date", () => {
      const scale = computePpmSprintScale("2026-09-16T00:00:00+03:00", "2026-09-29T23:59:59+03:00", today(2026, 9, 16));
      expect(scale?.dayIndex).toBe(1);
      expect(scale?.daysLeft).toBe(13);
      expect(scale?.todayPosition).toBe(0);
    });

    it("clamps before start and on the last day", () => {
      expect(computePpmSprintScale("2026-09-16", "2026-09-29", today(2026, 9, 14))?.dayIndex).toBe(1);
      const last = computePpmSprintScale("2026-09-16", "2026-09-29", today(2026, 9, 29));
      expect(last?.dayIndex).toBe(14);
      expect(last?.daysLeft).toBe(0);
      expect(last?.todayPosition).toBe(1);
    });

    it("handles a one-day sprint and hides minor labels on long sprints", () => {
      expect(computePpmSprintScale("2026-09-16", "2026-09-16", today(2026, 9, 16))?.ticks[0].position).toBe(0.5);
      const long = computePpmSprintScale("2026-09-01", "2026-09-28", today(2026, 9, 10));
      expect(long?.ticks.filter((t) => t.showLabel).length).toBeLessThan(28);
    });

    it("returns null for missing or inverted dates", () => {
      expect(computePpmSprintScale(null, "2026-09-29", today(2026, 9, 20))).toBeNull();
      expect(computePpmSprintScale("2026-09-29", "2026-09-16", today(2026, 9, 20))).toBeNull();
    });

    it("formats the range like the mockup", () => {
      expect(formatPpmSprintRange("2026-09-16", "2026-09-29", "ru")).toBe("16–29 сент.");
      expect(formatPpmSprintRange("2026-09-28", "2026-10-11", "ru")).toBe("28 сент. – 11 окт.");
      expect(formatPpmSprintRange("2026-09-16", "2026-09-29", "en")).toBe("Sep 16–29");
    });

    it("selects Russian and English plural forms", () => {
      expect([1, 2, 5, 21].map((n) => selectPpmPluralKey(n, "ru"))).toEqual(["one", "few", "many", "one"]);
      expect([1, 6].map((n) => selectPpmPluralKey(n, "en"))).toEqual(["one", "other"]);
    });
  });
  ```

  `apps/web/tests/ppm-tasks/sprint-scale-view.test.tsx`:
  ```tsx
  import { renderToStaticMarkup } from "react-dom/server";
  import { describe, expect, it } from "vitest";
  import { computePpmSprintScale } from "@/components/ppm-tasks/sprint";
  import { PpmSprintScaleView } from "@/components/ppm-tasks/sprint-scale-view";

  describe("PpmSprintScaleView", () => {
    it("renders name, range, day counter, ticks and today marker", () => {
      const scale = computePpmSprintScale("2026-09-16", "2026-09-29", new Date(2026, 8, 23, 12));
      if (!scale) throw new Error("scale expected");
      const html = renderToStaticMarkup(
        <PpmSprintScaleView
          name="Спринт 3"
          href="/ws/projects/p1/cycles/c1"
          rangeLabel="16–29 сент."
          openLabel="Открыть спринт"
          scaleLabel="Шкала спринта: 16–29 сент., день 8 из 14"
          todayLabel="сегодня"
          dayOfLabel="День 8 из 14"
          daysLeftLabel="осталось 6 дней"
          scale={scale}
          onOpen={() => undefined}
        />
      );
      expect(html).toContain('aria-label="Спринт 3"');
      expect(html).toContain('aria-label="Спринт 3, 16–29 сент. Открыть спринт"');
      expect(html).toContain('role="img" aria-label="Шкала спринта: 16–29 сент., день 8 из 14"');
      expect(html).toContain("День 8 из 14");
      expect(html).toContain("осталось 6 дней");
      expect(html.match(/class="ppm-sprint__tick"/g)?.length).toBe(14);
      expect(html).toContain('data-today="true"');
      expect(html).toContain("сегодня");
    });
  });
  ```

  `apps/web/tests/ppm-tasks/new-task-label.test.tsx`:
  ```tsx
  import { renderToStaticMarkup } from "react-dom/server";
  import { describe, expect, it } from "vitest";
  import { PpmNewTaskLabel } from "@/components/ppm-tasks/new-task-label";

  describe("PpmNewTaskLabel", () => {
    it("shows the real N I sequence to the eye and names it for screen readers", () => {
      const html = renderToStaticMarkup(<PpmNewTaskLabel label="Новая задача" keysLabel=", клавиши N, затем I" />);
      expect(html).toContain("Новая задача");
      expect(html).toContain('<span class="sr-only">, клавиши N, затем I</span>');
      expect(html).toMatch(/<span aria-hidden="true"[^>]*><kbd class="ppm-kbd">N<\/kbd><kbd class="ppm-kbd">I<\/kbd><\/span>/);
      expect(html).not.toContain("aria-keyshortcuts");
    });
  });
  ```

- [ ] **Step 3: Запустить** `./node_modules/.bin/vitest run tests/ppm-tasks/sprint.test.ts tests/ppm-tasks/sprint-scale-view.test.tsx tests/ppm-tasks/new-task-label.test.tsx`
  → FAIL (модули не найдены).

- [ ] **Step 4: Хелперы и компоненты**

  `apps/web/core/components/ppm-tasks/sprint.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPpmTranslationKey } from "@ppm/brand";

  const DAY_MS = 86_400_000;
  const LABEL_ALL_DAYS_LIMIT = 16;

  export type TPpmSprintTick = {
    key: string;
    label: string;
    position: number;
    isMajor: boolean;
    isToday: boolean;
    showLabel: boolean;
  };

  export type TPpmSprintScale = {
    totalDays: number;
    dayIndex: number;
    daysLeft: number;
    todayPosition: number;
    ticks: TPpmSprintTick[];
  };

  export type TPpmPluralKey = "one" | "few" | "many" | "other";

  export const PPM_DAYS_LEFT_KEYS: Record<TPpmPluralKey, TPpmTranslationKey> = {
    one: "tasks.sprint.days_left_one",
    few: "tasks.sprint.days_left_few",
    many: "tasks.sprint.days_left_many",
    other: "tasks.sprint.days_left_other",
  };

  /** Календарная дата YYYY-MM-DD как номер дня UTC: без сдвигов часового пояса и перехода на летнее время. */
  function toUtcDay(value: string | null | undefined): number | null {
    const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
    if (!match) return null;
    return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / DAY_MS;
  }

  function localUtcDay(date: Date): number {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
  }

  export function computePpmSprintScale(
    start: string | null | undefined,
    end: string | null | undefined,
    today: Date
  ): TPpmSprintScale | null {
    const startDay = toUtcDay(start);
    const endDay = toUtcDay(end);
    if (startDay === null || endDay === null || endDay < startDay) return null;
    const totalDays = endDay - startDay + 1;
    const todayDay = localUtcDay(today);
    const offset = Math.min(Math.max(todayDay - startDay, 0), totalDays - 1);
    const positionOf = (index: number) => (totalDays === 1 ? 0.5 : index / (totalDays - 1));
    const ticks = Array.from({ length: totalDays }, (_, index): TPpmSprintTick => {
      const date = new Date((startDay + index) * DAY_MS);
      const isMajor = index === 0 || index === totalDays - 1 || date.getUTCDay() === 1;
      const isToday = startDay + index === todayDay;
      return {
        key: date.toISOString().slice(0, 10),
        label: String(date.getUTCDate()),
        position: positionOf(index),
        isMajor,
        isToday,
        showLabel: totalDays <= LABEL_ALL_DAYS_LIMIT || isMajor || isToday,
      };
    });
    return {
      totalDays,
      dayIndex: offset + 1,
      daysLeft: Math.max(endDay - Math.max(todayDay, startDay), 0),
      todayPosition: todayDay < startDay ? 0 : todayDay > endDay ? 1 : positionOf(offset),
      ticks,
    };
  }

  export function formatPpmSprintRange(
    start: string | null | undefined,
    end: string | null | undefined,
    locale: string | undefined
  ): string | null {
    const startDay = toUtcDay(start);
    const endDay = toUtcDay(end);
    if (startDay === null || endDay === null) return null;
    const lang = locale?.toLowerCase().startsWith("ru") ? "ru" : "en";
    const from = new Date(startDay * DAY_MS);
    const to = new Date(endDay * DAY_MS);
    const day = new Intl.DateTimeFormat(lang, { day: "numeric", timeZone: "UTC" });
    const month = new Intl.DateTimeFormat(lang, { month: "short", timeZone: "UTC" });
    const dayMonth = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });
    if (from.getUTCFullYear() === to.getUTCFullYear() && from.getUTCMonth() === to.getUTCMonth())
      return lang === "ru"
        ? `${day.format(from)}–${day.format(to)} ${month.format(to)}`
        : `${month.format(to)} ${day.format(from)}–${day.format(to)}`;
    return `${dayMonth.format(from)} – ${dayMonth.format(to)}`;
  }

  export function selectPpmPluralKey(count: number, locale: string | undefined): TPpmPluralKey {
    const rule = new Intl.PluralRules(locale?.toLowerCase().startsWith("ru") ? "ru" : "en").select(count);
    return rule === "one" || rule === "few" || rule === "many" ? rule : "other";
  }
  ```

  `apps/web/core/components/ppm-tasks/sprint-scale-view.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { handlePpmSpaClick } from "./format";
  import type { TPpmSprintScale } from "./sprint";

  export type TPpmSprintScaleViewProps = {
    name: string;
    href: string;
    rangeLabel: string;
    openLabel: string;
    scaleLabel: string;
    todayLabel: string;
    dayOfLabel: string;
    daysLeftLabel: string;
    scale: TPpmSprintScale;
    onOpen: () => void;
  };

  const toPercent = (value: number) => `${(value * 100).toFixed(3)}%`;

  export function PpmSprintScaleView(props: TPpmSprintScaleViewProps) {
    const { name, href, rangeLabel, openLabel, scaleLabel, todayLabel, dayOfLabel, daysLeftLabel, scale, onOpen } = props;
    // «16–29 сент.» уже кончается точкой — вторую не ставим
    const linkLabel = `${name}, ${rangeLabel.replace(/\.?$/, ".")} ${openLabel}`;
    return (
      <section aria-label={name} className="ppm-sprint">
        <a
          href={href}
          aria-label={linkLabel}
          className="ppm-sprint__name"
          onClick={(event) => handlePpmSpaClick(event, onOpen)}
        >
          <span className="ppm-sprint__title">{name}</span>
          <span className="ppm-sprint__range">{rangeLabel}</span>
        </a>
        <div className="ppm-sprint__track" role="img" aria-label={scaleLabel}>
          <span aria-hidden="true" className="ppm-sprint__elapsed" style={{ width: toPercent(scale.todayPosition) }} />
          <span aria-hidden="true" className="ppm-sprint__axis" />
          {scale.ticks.map((tick) => (
            <span
              key={tick.key}
              aria-hidden="true"
              className="ppm-sprint__tick"
              data-major={tick.isMajor ? "true" : undefined}
              style={{ left: toPercent(tick.position) }}
            />
          ))}
          {scale.ticks
            .filter((tick) => tick.showLabel)
            .map((tick) => (
              <span
                key={`label-${tick.key}`}
                aria-hidden="true"
                className="ppm-sprint__label"
                data-today={tick.isToday ? "true" : undefined}
                style={{ left: toPercent(tick.position) }}
              >
                {tick.label}
              </span>
            ))}
          <span aria-hidden="true" className="ppm-sprint__today" style={{ left: toPercent(scale.todayPosition) }}>
            <span className="ppm-sprint__today-label">{todayLabel}</span>
          </span>
        </div>
        <div className="ppm-sprint__summary">
          <div className="ppm-sprint__day">{dayOfLabel}</div>
          <div className="ppm-sprint__left">{daysLeftLabel}</div>
        </div>
      </section>
    );
  }
  ```

  `apps/web/core/components/ppm-tasks/sprint-scale.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { observer } from "mobx-react";
  import { useParams } from "next/navigation";
  import { useTranslation } from "@plane/i18n";
  import { useCycle } from "@/hooks/store/use-cycle";
  import { useProject } from "@/hooks/store/use-project";
  import { useAppRouter } from "@/hooks/use-app-router";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { formatPpmTemplate } from "./format";
  import { computePpmSprintScale, formatPpmSprintRange, PPM_DAYS_LEFT_KEYS, selectPpmPluralKey } from "./sprint";
  import { PpmSprintScaleView } from "./sprint-scale-view";

  /** Только при включённых спринтах и текущем спринте; данные уже в cycle.store — новых запросов нет. */
  export const PpmSprintScale = observer(function PpmSprintScale() {
    const { workspaceSlug, projectId } = useParams();
    const router = useAppRouter();
    const { currentLocale } = useTranslation();
    const ppmT = usePpmTranslation();
    const { getProjectById } = useProject();
    const { getProjectCycleDetails } = useCycle();
    const slug = workspaceSlug?.toString();
    const pid = projectId?.toString();
    const project = getProjectById(pid);
    if (!slug || !pid || !project?.cycle_view) return null;
    const cycle = getProjectCycleDetails(pid)?.find((item) => item.status?.toLowerCase() === "current");
    if (!cycle) return null;
    const scale = computePpmSprintScale(cycle.start_date, cycle.end_date, new Date());
    const rangeLabel = formatPpmSprintRange(cycle.start_date, cycle.end_date, currentLocale);
    if (!scale || !rangeLabel) return null;
    const dayOfLabel = formatPpmTemplate(ppmT("tasks.sprint.day_of"), { day: scale.dayIndex, total: scale.totalDays });
    const daysLeftLabel =
      scale.daysLeft === 0
        ? ppmT("tasks.sprint.last_day")
        : formatPpmTemplate(ppmT(PPM_DAYS_LEFT_KEYS[selectPpmPluralKey(scale.daysLeft, currentLocale)]), {
            count: scale.daysLeft,
          });
    const href = `/${slug}/projects/${pid}/cycles/${cycle.id}`;
    return (
      <PpmSprintScaleView
        name={cycle.name}
        href={href}
        rangeLabel={rangeLabel}
        openLabel={ppmT("tasks.sprint.open")}
        scaleLabel={`${ppmT("tasks.sprint.scale_label")}: ${rangeLabel}, ${dayOfLabel.toLowerCase()}`}
        todayLabel={ppmT("tasks.sprint.today")}
        dayOfLabel={dayOfLabel}
        daysLeftLabel={daysLeftLabel}
        scale={scale}
        onOpen={() => router.push(href)}
      />
    );
  });
  ```

  `apps/web/core/components/ppm-tasks/new-task-label.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  /** Подпись основной кнопки: реальная последовательность Power-K `ni` (power-k/config/creation/command.ts:73), R9. */
  export function PpmNewTaskLabel({ label, keysLabel }: { label: string; keysLabel: string }) {
    return (
      <span className="hidden items-center gap-2 sm:inline-flex">
        <span>{label}</span>
        <span className="sr-only">{keysLabel}</span>
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <kbd className="ppm-kbd">N</kbd>
          <kbd className="ppm-kbd">I</kbd>
        </span>
      </span>
    );
  }
  ```
  (`aria-keyshortcuts` не ставим: он описывает альтернативы, а не последовательность.)

- [ ] **Step 5: `header.tsx`**
  - Импорты после `:39`: `import { PpmNewTaskLabel } from "@/components/ppm-tasks/new-task-label";`,
    `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - После `:54`: `const isDesignV2 = usePpmDesignV2();`
  - `:91-103` было `{issuesCount && issuesCount > 0 ? ( <Tooltip …><CountChip count={issuesCount} /></Tooltip> ) : null}` →
    ```tsx
          {issuesCount && issuesCount > 0 ? (
            isDesignV2 ? (
              <span className="font-code text-12 text-tertiary tabular-nums">
                <span className="sr-only">{ppmT("work_item.count")} </span>
                {issuesCount}
              </span>
            ) : (
              <Tooltip
                isMobile={isMobile}
                tooltipContent={
                  isPpmShell
                    ? `${ppmT("work_item.count")} ${issuesCount}`
                    : `There are ${issuesCount} ${issuesCount > 1 ? "work items" : "work item"} in this project`
                }
                position="bottom"
              >
                <CountChip count={issuesCount} />
              </Tooltip>
            )
          ) : null}
    ```
  - `:139` было `<div className="hidden sm:block">{t("issue.add.label")}</div>` →
    ```tsx
            {isDesignV2 ? (
              <PpmNewTaskLabel label={ppmT("tasks.new_task")} keysLabel={ppmT("tasks.new_task_keys")} />
            ) : (
              <div className="hidden sm:block">{t("issue.add.label")}</div>
            )}
    ```
  (Файл под brand-аудитом: слова Plane не добавляем.)

- [ ] **Step 6: `layout-selection.tsx` — оформление «Список/Доска»**
  - Импорт после `:16`: `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - После `:27`: `const isDesignV2 = usePpmDesignV2();`
  - `:34-61` (return) заменить на:
    ```tsx
    if (isDesignV2)
      return (
        <div className="ppm-layout-switch">
          {ISSUE_LAYOUTS.filter((l) => layouts.includes(l.key)).map((layout) => (
            <Tooltip key={layout.key} tooltipContent={t(layout.i18n_title)} isMobile={isMobile}>
              <button
                type="button"
                className="ppm-layout-switch__item"
                onClick={() => handleOnChange(layout.key)}
                aria-label={t(layout.i18n_title)}
                aria-pressed={selectedLayout === layout.key}
              >
                <IssueLayoutIcon layout={layout.key} size={14} strokeWidth={1.5} className="size-3.5" />
                {(layout.key === EIssueLayoutTypes.LIST || layout.key === EIssueLayoutTypes.KANBAN) && (
                  <span>{t(layout.i18n_title)}</span>
                )}
              </button>
            </Tooltip>
          ))}
        </div>
      );

    return (
      <div className="flex items-center gap-1 rounded-md bg-layer-3 p-1">
        {ISSUE_LAYOUTS.filter((l) => layouts.includes(l.key)).map((layout) => (
          <Tooltip key={layout.key} tooltipContent={t(layout.i18n_title)} isMobile={isMobile}>
            <button
              type="button"
              className={cn(
                "group grid h-5.5 w-7 place-items-center overflow-hidden rounded-sm transition-all hover:bg-layer-transparent-hover",
                {
                  "bg-layer-transparent-active hover:bg-layer-transparent-active": selectedLayout === layout.key,
                }
              )}
              onClick={() => handleOnChange(layout.key)}
              aria-label={t(layout.i18n_title)}
              aria-pressed={selectedLayout === layout.key}
            >
              <IssueLayoutIcon
                layout={layout.key}
                size={14}
                strokeWidth={2}
                className={`size-3.5 ${selectedLayout == layout.key ? "text-primary" : "text-secondary"}`}
              />
            </button>
          </Tooltip>
        ))}
      </div>
    );
    ```
    (второй `return` — прежние строки `:35-59` дословно.)
    и импорт `EIssueLayoutTypes` как значения: `:11` `import type { EIssueLayoutTypes } from "@plane/types";` →
    `import { EIssueLayoutTypes } from "@plane/types";` (тип используется и как значение). Все пять раскладок
    остаются; `aria-label` у каждой кнопки (страж `ppm-a11y/icon-button-names.test.ts`).

- [ ] **Step 7: Слот шкалы — `issues/(list)/layout.tsx`**
  ```tsx
  // components
  import { Outlet } from "react-router";
  import { AppHeader } from "@/components/core/app-header";
  import { ContentWrapper } from "@/components/core/content-wrapper";
  import { PpmSprintScale } from "@/components/ppm-tasks/sprint-scale";
  import { usePpmDesignV2 } from "@/lib/ppm-design";
  import { ProjectIssuesHeader } from "./header";
  import { ProjectIssuesMobileHeader } from "./mobile-header";

  export default function ProjectIssuesLayout() {
    const isDesignV2 = usePpmDesignV2();
    return (
      <>
        <AppHeader header={<ProjectIssuesHeader />} mobileHeader={<ProjectIssuesMobileHeader />} />
        {isDesignV2 && <PpmSprintScale />}
        <ContentWrapper>
          <Outlet />
        </ContentWrapper>
      </>
    );
  }
  ```
  (слот только на этом маршруте — спринты/направления/фильтры задач не затронуты; `main` — `flex-col`,
  `ContentWrapper` сжимается как сейчас под `AppHeader`).

- [ ] **Step 8: `tasks.css` — блок T2**
  ```css
  /* ─── T2 · шапка: переключатель вида, клавиши, шкала спринта ─── */
  :where(html[data-ppm-design="v2"]) .ppm-layout-switch {
    display: flex;
    align-items: center;
    gap: 2px;
    height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 1px;
    border: 1px solid var(--ppm-color-border-control, var(--border-subtle-1));
    border-radius: var(--ppm-radius-sm, 0.375rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-layout-switch__item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: calc(var(--ppm-control-height-sm, 1.75rem) - 4px);
    padding: 0 8px;
    border-radius: var(--ppm-radius-xs, 0.25rem);
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 500;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-layout-switch__item:hover {
    background-color: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-layout-switch__item[aria-pressed="true"] {
    background-color: var(--ppm-color-layer-1-selected, var(--bg-layer-1-selected));
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: var(--ppm-radius-xs, 0.25rem);
    background-color: var(--ppm-color-accent-active, var(--bg-accent-primary-active));
    color: var(--ppm-color-on-accent, var(--txt-on-accent));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.6875rem;
    line-height: 1rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint {
    flex: none;
    display: flex;
    align-items: center;
    gap: 20px;
    box-sizing: border-box;
    height: var(--ppm-sprint-strip-height, 3.75rem);
    margin: 0.75rem var(--ppm-page-padding-x, 1.5rem) 0;
    padding: 0 16px 0 12px;
    border: 1px solid var(--ppm-color-border, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    background-color: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__name {
    flex: none;
    display: flex;
    flex-direction: column;
    min-width: 88px;
    padding: 2px 4px;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    text-decoration: none;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__name:hover {
    background-color: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__title,
  :where(html[data-ppm-design="v2"]) .ppm-sprint__day {
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.8125rem;
    line-height: 1.25rem;
    font-weight: 600;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__day {
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__range,
  :where(html[data-ppm-design="v2"]) .ppm-sprint__left {
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    line-height: 1rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__track {
    position: relative;
    flex: 1;
    min-width: 0;
    height: 44px;
    margin-inline: 8px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__elapsed {
    position: absolute;
    top: 18px;
    left: 0;
    height: 7px;
    background-image: repeating-linear-gradient(
      -45deg,
      var(--ppm-color-border-control, var(--border-subtle-1)) 0 1px,
      transparent 1px 4px
    );
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__axis {
    position: absolute;
    top: 25px;
    right: 0;
    left: 0;
    height: 1px;
    background-color: var(--ppm-color-border-control, var(--border-subtle-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__tick {
    position: absolute;
    top: 25px;
    width: 1px;
    height: 3px;
    background-color: var(--ppm-color-border-control, var(--border-subtle-1));
    transform: translateX(-0.5px);
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__tick[data-major="true"] {
    height: 5px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__label {
    position: absolute;
    top: 30px;
    transform: translateX(-50%);
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.6875rem;
    line-height: 0.875rem;
    font-variant-numeric: tabular-nums;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__label[data-today="true"] {
    color: var(--ppm-color-text, var(--txt-primary));
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__today {
    position: absolute;
    top: 14px;
    width: 2px;
    height: 17px;
    border-radius: 1px;
    background-color: var(--ppm-color-text, var(--txt-primary));
    transform: translateX(-1px);
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__today-label {
    position: absolute;
    bottom: 100%;
    left: 50%;
    margin-bottom: 1px;
    transform: translateX(-50%);
    color: var(--ppm-color-text, var(--txt-primary));
    font-size: 0.6875rem;
    line-height: 0.75rem;
    font-weight: 500;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-sprint__summary {
    flex: none;
    min-width: 96px;
    text-align: right;
  }

  @media (max-width: 40rem) {
    :where(html[data-ppm-design="v2"]) .ppm-sprint__track {
      display: none;
    }
  }
  ```

- [ ] **Step 9: Дополнить `v1-literals.test.ts`** — в `CASES` добавить:
  ```ts
    ["issues/header.tsx", '<div className="hidden sm:block">{t("issue.add.label")}</div>'],
    ["issues/header.tsx", "<CountChip count={issuesCount} />"],
    ["issues/issue-layouts/filters/header/layout-selection.tsx", '"flex items-center gap-1 rounded-md bg-layer-3 p-1"'],
  ```

- [ ] **Step 10: Прогон, типы, формат**
  - `./node_modules/.bin/vitest run tests/ppm-tasks tests/ppm-a11y` → PASS (включая `icon-button-names`).
  - Типы → `T: 0 ошибок`.
  - `../../node_modules/.bin/oxfmt core/components/ppm-tasks tests/ppm-tasks core/components/issues/header.tsx core/components/issues/issue-layouts/filters/header/layout-selection.tsx "app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx"`
  - `cd $PF/packages/ppm-brand && node scripts/audit-user-facing-brand.mjs` → PASS (header.tsx без Plane).
- [ ] **Step 11: Смоук (контроллер)** — проект со спринтами и текущим спринтом: полоса «Спринт N · 16–29 сент.»,
  засечки дней, длинные засечки по понедельникам и краям, «сегодня», «День 8 из 14 · осталось 6 дней»; клик —
  страница спринта. Проект без спринтов — полосы нет. Кнопка «Новая задача N I», экранный диктор читает
  «Новая задача, клавиши N, затем I»; `N`, затем `I` (и в русской раскладке «Т», «Ш») открывает создание.

**Acceptance T2:**
- [ ] D: шкала спринта только при `cycle_view` и текущем спринте, данные из `cycle.store`, 0 новых запросов.
- [ ] D, R9: «Новая задача» с подсказкой реальной последовательности `N I`; новых сочетаний нет.
- [ ] «Список/Доска» оформлены по макету, остальные раскладки доступны, имена кнопок сохранены.
- [ ] v1: «Добавить задачу», `CountChip`, прежний переключатель (литералы в `v1-literals`).

---

### Task 8 (T3): Данные строки: «Материалы» (PR + вложения/ссылки) и метка «⊣ ROBOT-12»

**Files:**
- Create: `apps/web/core/components/ppm-tasks/evidence.ts`
- Create: `apps/web/core/components/ppm-tasks/services.ts`
- Create: `apps/web/core/components/ppm-tasks/data-context.tsx`
- Create: `apps/web/core/components/ppm-tasks/task-evidence-view.tsx`
- Create: `apps/web/core/components/ppm-tasks/task-evidence.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/list/block.tsx` (импорты, флаг, `:281`, `:300-308`)
- Modify: `apps/web/core/components/issues/issue-layouts/roots/project-layout-root.tsx:7-26`, `:28-43`, `:45-54`, `:89-97`
- Modify: `apps/web/styles/ppm-v2/tasks.css` (блок T3)
- Modify: `apps/web/tests/ppm-tasks/v1-literals.test.ts` (кейс project-layout-root)
- Create (тесты): `apps/web/tests/ppm-tasks/evidence.test.ts`, `evidence-view.test.tsx`

**Interfaces:**
- Consumes: `IssueService.getIssuesFromServer` (`core/services/issue/issue.service.ts:40-61`, путь `issues-detail/`
  при `expand` c `issue_relation`), типы `TPpmGitLink`, `TPpmGitCapabilities` (`core/services/ppm-git.service.ts:42,146`),
  `APIService`, `useWorkspace().getWorkspaceBySlug` (UUID для `/api/ppm/v1/workspaces/<uuid>/…`),
  `useIssueDetail().peekIssue`, `formatPpmTemplate` (T1).
- Produces: `PpmTasksDataProvider`, `usePpmTasksData(): TPpmTasksData | null` (контракт для T4:
  `attention`, `attentionStatus`, `retryAttention`, `relationsByIssue`, `pullRequestsByIssue`); чистые
  `groupPpmPullRequestsByWorkItem`, `formatPpmPullRequestRef`, `indexPpmRelationsByIssue`,
  `collectPpmActiveBlockers`, `isPpmActiveStateGroup`, `countPpmMaterials`, `withoutPpmMaterialProperties`,
  `formatPpmIssueIdentifier`; типы `TPpmAttentionIssue`, `TPpmAttentionRelation`, `TPpmBlocker`,
  `TPpmStateGroupLookup`; `PpmBlockedGlyph` (T4).

- [ ] **Step 1: pre-image**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh
  $T apps/web/core/components/ppm-tasks/evidence.ts apps/web/core/components/ppm-tasks/services.ts \
     apps/web/core/components/ppm-tasks/data-context.tsx apps/web/core/components/ppm-tasks/task-evidence-view.tsx \
     apps/web/core/components/ppm-tasks/task-evidence.tsx apps/web/core/components/issues/issue-layouts/roots/project-layout-root.tsx \
     apps/web/tests/ppm-tasks/evidence.test.ts apps/web/tests/ppm-tasks/evidence-view.test.tsx
  ```
  (`block.tsx`, `tasks.css`, `v1-literals.test.ts` уже сохранены в T1.)

- [ ] **Step 2: Падающие тесты**

  `apps/web/tests/ppm-tasks/evidence.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import {
    collectPpmActiveBlockers,
    countPpmMaterials,
    formatPpmIssueIdentifier,
    formatPpmPullRequestRef,
    groupPpmPullRequestsByWorkItem,
    indexPpmRelationsByIssue,
    withoutPpmMaterialProperties,
  } from "@/components/ppm-tasks/evidence";
  import type { TPpmAttentionIssue } from "@/components/ppm-tasks/evidence";
  import type { TPpmGitLink } from "@/services/ppm-git.service";

  const link = (id: string, workItemId: string, patch: Partial<TPpmGitLink> = {}): TPpmGitLink => ({
    id,
    repository_id: "r1",
    repository_name: "robot",
    repository_provider: "github",
    work_item: { id: workItemId, identifier: "ROBOT-12", title: "Откалибровать датчик цвета" },
    object_type: "pull_request",
    ref: "48",
    title: "Калибровка датчика",
    canonical_url: "https://example.test/pr/48",
    status: "active",
    origin: "provider",
    git_object_id: null,
    created_at: "2026-09-20T10:00:00Z",
    updated_at: "2026-09-20T10:00:00Z",
    ...patch,
  });

  const issue = (id: string, relations: TPpmAttentionIssue["issue_relation"] = []): TPpmAttentionIssue => ({
    id,
    name: id,
    sequence_id: 1,
    project_id: "p1",
    state_id: "s-todo",
    target_date: null,
    updated_at: "2026-09-24T09:00:00Z",
    updated_by: "u1",
    assignee_ids: [],
    issue_relation: relations,
  });

  describe("task evidence", () => {
    it("groups only active pull requests by task, newest first", () => {
      const map = groupPpmPullRequestsByWorkItem([
        link("a", "i12", { updated_at: "2026-09-20T10:00:00Z" }),
        link("b", "i12", { ref: "51", updated_at: "2026-09-22T10:00:00Z" }),
        link("c", "i12", { object_type: "branch", ref: "feature/x" }),
        link("d", "i15", { status: "unlinked" }),
      ]);
      expect(map.get("i12")?.map((l) => l.ref)).toEqual(["51", "48"]);
      expect(map.has("i15")).toBe(false);
    });

    it("formats a PR number only when the ref is numeric", () => {
      expect(formatPpmPullRequestRef("48")).toBe("#48");
      expect(formatPpmPullRequestRef("#48")).toBe("#48");
      expect(formatPpmPullRequestRef("feature/x")).toBeNull();
    });

    it("keeps only blocked_by relations and drops finished blockers", () => {
      const relations = indexPpmRelationsByIssue([
        issue("i15", [
          { id: "i12", project_id: "p1", sequence_id: 12, name: "Датчик", relation_type: "blocked_by", state_id: "s-progress" },
          { id: "i7", project_id: "p1", sequence_id: 7, name: "Готовая", relation_type: "blocked_by", state_id: "s-done" },
          { id: "i9", project_id: "p1", sequence_id: 9, name: "Связанная", relation_type: "relates_to", state_id: "s-todo" },
        ]),
        issue("i3"),
      ]);
      expect(relations.get("i15")?.map((r) => r.id)).toEqual(["i12", "i7"]);
      expect(relations.has("i3")).toBe(false);
      const group = (stateId: string | null | undefined) =>
        ({ "s-progress": "started", "s-done": "completed" } as Record<string, string>)[stateId ?? ""];
      expect(collectPpmActiveBlockers(relations.get("i15") ?? [], group).map((b) => b.sequenceId)).toEqual([12]);
      // живое состояние блокера из списка важнее ответа сервера
      expect(collectPpmActiveBlockers(relations.get("i15") ?? [], group, (id) => (id === "i12" ? "s-done" : undefined))).toEqual([]);
    });

    it("counts materials the user shows and hides the duplicated chips", () => {
      const row = { attachment_count: 2, link_count: 1 };
      expect(countPpmMaterials(row, { attachment_count: true, link: true } as never)).toEqual({ total: 3, attachments: 2, links: 1 });
      expect(countPpmMaterials(row, { attachment_count: false, link: true } as never).total).toBe(1);
      expect(countPpmMaterials(row, undefined).total).toBe(3);
      expect(withoutPpmMaterialProperties({ attachment_count: true, link: true, key: true } as never)).toMatchObject({
        attachment_count: false,
        link: false,
        key: true,
      });
    });

    it("builds identifiers with and without a known project", () => {
      expect(formatPpmIssueIdentifier("ROBOT", 12)).toBe("ROBOT-12");
      expect(formatPpmIssueIdentifier(undefined, 12)).toBe("#12");
    });
  });
  ```

  `apps/web/tests/ppm-tasks/evidence-view.test.tsx`:
  ```tsx
  import { renderToStaticMarkup } from "react-dom/server";
  import { describe, expect, it } from "vitest";
  import { PpmTaskBlockedMarkerView, PpmTaskEvidenceView } from "@/components/ppm-tasks/task-evidence-view";

  describe("evidence views", () => {
    it("renders PR and materials with screen-reader text", () => {
      const html = renderToStaticMarkup(
        <PpmTaskEvidenceView
          pullRequest={{ label: "#48", srLabel: "PR #48", more: 1, titles: "Калибровка\nКалибровка 2" }}
          materials={{ count: 2, srLabel: "Материалов: 2", title: "Вложений: 1 · ссылок: 1" }}
        />
      );
      expect(html).toContain('<span class="sr-only">PR #48</span>');
      expect(html).toContain("#48");
      expect(html).toContain("+1");
      expect(html).toContain('<span class="sr-only">Материалов: 2</span>');
    });

    it("renders nothing without evidence (no dash)", () => {
      expect(renderToStaticMarkup(<PpmTaskEvidenceView pullRequest={null} materials={null} />)).toBe("");
    });

    it("renders the blocked marker as ⊣ + task id with a spoken label", () => {
      const html = renderToStaticMarkup(
        <PpmTaskBlockedMarkerView srText="Заблокирована задачей ROBOT-12" identifier="ROBOT-12" more={0} title="ROBOT-12 · Датчик" />
      );
      expect(html).toContain('class="ppm-task-blocked"');
      expect(html).toContain('<span class="sr-only">Заблокирована задачей ROBOT-12</span>');
      expect(html).toContain("ROBOT-12");
      expect(html).toContain("<svg");
    });
  });
  ```

- [ ] **Step 3: Запустить** `./node_modules/.bin/vitest run tests/ppm-tasks/evidence.test.ts tests/ppm-tasks/evidence-view.test.tsx`
  → FAIL (модули не найдены).

- [ ] **Step 4: Реализация**

  `apps/web/core/components/ppm-tasks/evidence.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { IIssueDisplayProperties } from "@plane/types";
  import type { TPpmGitLink } from "@/services/ppm-git.service";

  /** Связь из IssueListDetailSerializer (apps/api/plane/app/serializers/issue.py:874-897). */
  export type TPpmAttentionRelation = {
    id: string;
    project_id: string;
    sequence_id: number;
    name: string;
    relation_type: string;
    state_id: string | null;
  };

  /** Задача из issues-detail (поля IssueListDetailSerializer.to_representation). */
  export type TPpmAttentionIssue = {
    id: string;
    name: string;
    sequence_id: number;
    project_id: string;
    state_id: string | null;
    target_date: string | null;
    updated_at: string;
    updated_by: string | null;
    assignee_ids: string[];
    issue_relation?: TPpmAttentionRelation[];
  };

  export type TPpmBlocker = { id: string; projectId: string; sequenceId: number; name: string };
  export type TPpmStateGroupLookup = (stateId: string | null | undefined) => string | undefined;

  /** Неизвестная группа (статус чужого проекта не загружен) считается активной. */
  export function isPpmActiveStateGroup(group: string | undefined): boolean {
    return group !== "completed" && group !== "cancelled";
  }

  export function groupPpmPullRequestsByWorkItem(links: readonly TPpmGitLink[]): Map<string, TPpmGitLink[]> {
    const map = new Map<string, TPpmGitLink[]>();
    for (const item of links) {
      if (item.object_type !== "pull_request" || item.status !== "active") continue;
      const list = map.get(item.work_item.id) ?? [];
      list.push(item);
      map.set(item.work_item.id, list);
    }
    for (const list of map.values()) list.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));
    return map;
  }

  export function formatPpmPullRequestRef(ref: string): string | null {
    const match = /^#?(\d+)$/.exec(ref.trim());
    return match ? `#${match[1]}` : null;
  }

  /** В ответе issues-detail relation_type всегда хранится как blocked_by (обратная сторона — blocking). */
  export function indexPpmRelationsByIssue(issues: readonly TPpmAttentionIssue[]): Map<string, TPpmAttentionRelation[]> {
    const map = new Map<string, TPpmAttentionRelation[]>();
    for (const item of issues) {
      const blockedBy = (item.issue_relation ?? []).filter((relation) => relation.relation_type === "blocked_by");
      if (blockedBy.length) map.set(item.id, blockedBy);
    }
    return map;
  }

  export function collectPpmActiveBlockers(
    relations: readonly TPpmAttentionRelation[],
    getStateGroup: TPpmStateGroupLookup,
    getLiveStateId?: (issueId: string) => string | null | undefined
  ): TPpmBlocker[] {
    return relations
      .filter((relation) => {
        const liveStateId = getLiveStateId?.(relation.id);
        return isPpmActiveStateGroup(getStateGroup(liveStateId === undefined ? relation.state_id : liveStateId));
      })
      .map((relation) => ({
        id: relation.id,
        projectId: relation.project_id,
        sequenceId: relation.sequence_id,
        name: relation.name,
      }));
  }

  export function countPpmMaterials(
    issue: { attachment_count?: number | null; link_count?: number | null },
    displayProperties: IIssueDisplayProperties | undefined
  ): { total: number; attachments: number; links: number } {
    const attachments = displayProperties && !displayProperties.attachment_count ? 0 : (issue.attachment_count ?? 0);
    const links = displayProperties && !displayProperties.link ? 0 : (issue.link_count ?? 0);
    return { total: attachments + links, attachments, links };
  }

  /** Только для рендера строки: сохранённые настройки пользователя не меняются. */
  export function withoutPpmMaterialProperties(
    displayProperties: IIssueDisplayProperties | undefined
  ): IIssueDisplayProperties | undefined {
    return displayProperties ? { ...displayProperties, attachment_count: false, link: false } : displayProperties;
  }

  export function formatPpmIssueIdentifier(projectIdentifier: string | undefined | null, sequenceId: number): string {
    return projectIdentifier ? `${projectIdentifier}-${sequenceId}` : `#${sequenceId}`;
  }
  ```

  `apps/web/core/components/ppm-tasks/services.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { API_BASE_URL } from "@plane/constants";
  import { APIService } from "@/services/api.service";
  import { IssueService } from "@/services/issue";
  import type { TPpmGitCapabilities, TPpmGitLink } from "@/services/ppm-git.service";
  import type { TPpmAttentionIssue } from "./evidence";

  export const PPM_ATTENTION_PAGE_SIZE = 1000;

  export type TPpmAttentionPayload = { issues: TPpmAttentionIssue[]; totalCount: number };
  export type TPpmGitLinksPayload = { capabilities: TPpmGitCapabilities; links: TPpmGitLink[] };

  const issueService = new IssueService();

  /** Один запрос на загрузку списка: существующий issues-detail с префетчем связей (без N+1). */
  export async function fetchPpmTasksAttention(workspaceSlug: string, projectId: string): Promise<TPpmAttentionPayload> {
    const response = await issueService.getIssuesFromServer(workspaceSlug, projectId, {
      expand: "issue_relation",
      order_by: "-updated_at",
      per_page: PPM_ATTENTION_PAGE_SIZE,
    });
    const issues = Array.isArray(response?.results) ? (response.results as unknown as TPpmAttentionIssue[]) : [];
    return { issues, totalCount: typeof response?.total_count === "number" ? response.total_count : issues.length };
  }

  /** Один запрос на проект: все активные Git-связи (ppm_git/views.py:639-649). 403/404 — «нет данных». */
  export class PpmTaskGitLinksService extends APIService {
    constructor() {
      super(API_BASE_URL);
    }

    async listLinks(workspaceId: string, projectId: string): Promise<TPpmGitLinksPayload | null> {
      try {
        const response = await this.get(`/api/ppm/v1/workspaces/${workspaceId}/projects/${projectId}/git/links/`);
        return response.data as TPpmGitLinksPayload;
      } catch {
        return null;
      }
    }
  }
  ```

  `apps/web/core/components/ppm-tasks/data-context.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { createContext, useContext, useEffect, useMemo, useRef } from "react";
  import type { ReactNode } from "react";
  import { observer } from "mobx-react";
  import useSWR from "swr";
  import { useIssueDetail } from "@/hooks/store/use-issue-detail";
  import { useWorkspace } from "@/hooks/store/use-workspace";
  import type { TPpmGitLink } from "@/services/ppm-git.service";
  import { groupPpmPullRequestsByWorkItem, indexPpmRelationsByIssue } from "./evidence";
  import type { TPpmAttentionRelation } from "./evidence";
  import { fetchPpmTasksAttention, PpmTaskGitLinksService } from "./services";
  import type { TPpmAttentionPayload } from "./services";

  export type TPpmTasksData = {
    workspaceSlug: string;
    projectId: string;
    attention: TPpmAttentionPayload | undefined;
    attentionStatus: "loading" | "error" | "ready";
    retryAttention: () => void;
    relationsByIssue: Map<string, TPpmAttentionRelation[]>;
    pullRequestsByIssue: Map<string, TPpmGitLink[]>;
  };

  const PpmTasksDataContext = createContext<TPpmTasksData | null>(null);
  const gitLinksService = new PpmTaskGitLinksService();
  const EMPTY_RELATIONS = new Map<string, TPpmAttentionRelation[]>();
  const EMPTY_PULL_REQUESTS = new Map<string, TPpmGitLink[]>();

  type Props = { workspaceSlug: string; projectId: string; enabled: boolean; children: ReactNode };

  /** Ставится только в project-layout-root (v2). Другие list-корни контекста не получают — строки без полоски. */
  export const PpmTasksDataProvider = observer(function PpmTasksDataProvider(props: Props) {
    const { workspaceSlug, projectId, enabled, children } = props;
    const { getWorkspaceBySlug } = useWorkspace();
    const { peekIssue } = useIssueDetail();
    const workspaceId = getWorkspaceBySlug(workspaceSlug)?.id;

    const attentionQuery = useSWR(
      enabled ? ["ppm-tasks-attention", workspaceSlug, projectId] : null,
      () => fetchPpmTasksAttention(workspaceSlug, projectId),
      { revalidateOnFocus: true, shouldRetryOnError: false }
    );
    const gitQuery = useSWR(
      enabled && workspaceId ? ["ppm-tasks-git-links", workspaceId, projectId] : null,
      () => gitLinksService.listLinks(workspaceId as string, projectId),
      { revalidateOnFocus: true, shouldRetryOnError: false }
    );

    // Связи и сроки могли поменяться в карточке задачи: один перезапрос после закрытия peek.
    const isPeekOpen = !!peekIssue;
    const wasPeekOpen = useRef(isPeekOpen);
    const mutateAttention = attentionQuery.mutate;
    useEffect(() => {
      if (wasPeekOpen.current && !isPeekOpen && enabled) void mutateAttention();
      wasPeekOpen.current = isPeekOpen;
    }, [isPeekOpen, enabled, mutateAttention]);

    const attention = attentionQuery.data;
    const gitLinks = gitQuery.data?.links;
    const relationsByIssue = useMemo(
      () => (attention ? indexPpmRelationsByIssue(attention.issues) : EMPTY_RELATIONS),
      [attention]
    );
    const pullRequestsByIssue = useMemo(
      () => (gitLinks ? groupPpmPullRequestsByWorkItem(gitLinks) : EMPTY_PULL_REQUESTS),
      [gitLinks]
    );
    const attentionStatus: TPpmTasksData["attentionStatus"] = attentionQuery.error
      ? "error"
      : attention
        ? "ready"
        : "loading";

    const value = useMemo<TPpmTasksData>(
      () => ({
        workspaceSlug,
        projectId,
        attention,
        attentionStatus,
        retryAttention: () => void mutateAttention(),
        relationsByIssue,
        pullRequestsByIssue,
      }),
      [workspaceSlug, projectId, attention, attentionStatus, mutateAttention, relationsByIssue, pullRequestsByIssue]
    );

    return <PpmTasksDataContext.Provider value={value}>{children}</PpmTasksDataContext.Provider>;
  });

  export function usePpmTasksData(): TPpmTasksData | null {
    return useContext(PpmTasksDataContext);
  }
  ```

  `apps/web/core/components/ppm-tasks/task-evidence-view.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { GitPullRequest, Paperclip } from "lucide-react";

  /** Засечка ⊣ — тот же знак, что конец линии «Блокирует» на Холсте (TOKENS §9 п.4). */
  export function PpmBlockedGlyph({ className = "size-3" }: { className?: string }) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        className={className}
      >
        <path d="M2.75 8h9.5" />
        <path d="M12.25 4.5v7" />
      </svg>
    );
  }

  export type TPpmEvidenceViewProps = {
    pullRequest: { label: string; srLabel: string; more: number; titles: string } | null;
    materials: { count: number; srLabel: string; title: string } | null;
  };

  /** Внутри строки-ссылки (ControlLink = <a>) — только текст, без вложенных ссылок. */
  export function PpmTaskEvidenceView({ pullRequest, materials }: TPpmEvidenceViewProps) {
    if (!pullRequest && !materials) return null;
    return (
      <span className="ppm-task-evidence">
        {pullRequest && (
          <span className="ppm-task-evidence__item" title={pullRequest.titles}>
            <span className="sr-only">{pullRequest.srLabel}</span>
            <GitPullRequest aria-hidden="true" className="ppm-task-evidence__icon--pr size-3.5" strokeWidth={1.5} />
            <span aria-hidden="true">{pullRequest.label}</span>
            {pullRequest.more > 0 && <span aria-hidden="true">{`+${pullRequest.more}`}</span>}
          </span>
        )}
        {materials && (
          <span className="ppm-task-evidence__item" title={materials.title}>
            <span className="sr-only">{materials.srLabel}</span>
            <Paperclip aria-hidden="true" className="ppm-task-evidence__icon size-3.5" strokeWidth={1.5} />
            <span aria-hidden="true">{materials.count}</span>
          </span>
        )}
      </span>
    );
  }

  export type TPpmBlockedMarkerViewProps = { srText: string; identifier: string; more: number; title: string };

  export function PpmTaskBlockedMarkerView({ srText, identifier, more, title }: TPpmBlockedMarkerViewProps) {
    return (
      <span className="ppm-task-blocked" title={title}>
        <span className="sr-only">{srText}</span>
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <PpmBlockedGlyph />
          {identifier}
          {more > 0 && <span>{`+${more}`}</span>}
        </span>
      </span>
    );
  }
  ```

  `apps/web/core/components/ppm-tasks/task-evidence.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { observer } from "mobx-react";
  import type { IIssueDisplayProperties, TIssue, TIssueMap } from "@plane/types";
  import { useProject } from "@/hooks/store/use-project";
  import { useProjectState } from "@/hooks/store/use-project-state";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { usePpmTasksData } from "./data-context";
  import {
    collectPpmActiveBlockers,
    countPpmMaterials,
    formatPpmIssueIdentifier,
    formatPpmPullRequestRef,
    isPpmActiveStateGroup,
  } from "./evidence";
  import { formatPpmTemplate } from "./format";
  import { PpmTaskBlockedMarkerView, PpmTaskEvidenceView } from "./task-evidence-view";

  export const PpmTaskEvidence = observer(function PpmTaskEvidence(props: {
    issue: TIssue;
    displayProperties: IIssueDisplayProperties | undefined;
  }) {
    const { issue, displayProperties } = props;
    const data = usePpmTasksData();
    const ppmT = usePpmTranslation();
    if (!data) return null;
    const pulls = data.pullRequestsByIssue.get(issue.id) ?? [];
    const firstRef = pulls[0] ? formatPpmPullRequestRef(pulls[0].ref) : null;
    const pullRequest = pulls.length
      ? {
          label: firstRef ?? "PR",
          srLabel: formatPpmTemplate(ppmT("tasks.evidence.pr"), { ref: firstRef ?? "" }).trim(),
          more: pulls.length - 1,
          titles: pulls.map((item) => item.title || item.ref).join("\n"),
        }
      : null;
    const counts = countPpmMaterials(issue, displayProperties);
    const materials =
      counts.total > 0
        ? {
            count: counts.total,
            srLabel: formatPpmTemplate(ppmT("tasks.evidence.materials"), { count: counts.total }),
            title: formatPpmTemplate(ppmT("tasks.evidence.materials_hint"), {
              attachments: counts.attachments,
              links: counts.links,
            }),
          }
        : null;
    return <PpmTaskEvidenceView pullRequest={pullRequest} materials={materials} />;
  });

  export const PpmTaskBlockedMarker = observer(function PpmTaskBlockedMarker(props: {
    issue: TIssue;
    issuesMap: TIssueMap;
  }) {
    const { issue, issuesMap } = props;
    const data = usePpmTasksData();
    const ppmT = usePpmTranslation();
    const { getStateById } = useProjectState();
    const { getProjectIdentifierById } = useProject();
    if (!data || !isPpmActiveStateGroup(getStateById(issue.state_id)?.group)) return null;
    const relations = data.relationsByIssue.get(issue.id);
    if (!relations?.length) return null;
    const blockers = collectPpmActiveBlockers(
      relations,
      (stateId) => getStateById(stateId)?.group,
      (issueId) => issuesMap[issueId]?.state_id
    );
    if (!blockers.length) return null;
    const identifiers = blockers.map((blocker) =>
      formatPpmIssueIdentifier(getProjectIdentifierById(blocker.projectId), blocker.sequenceId)
    );
    const more = blockers.length - 1;
    const srText = [
      ppmT("tasks.evidence.blocked_by"),
      identifiers[0],
      more > 0 ? formatPpmTemplate(ppmT("tasks.evidence.blocked_more"), { count: more }) : "",
    ]
      .filter(Boolean)
      .join(" ");
    const title = blockers.map((blocker, index) => `${identifiers[index]} · ${blocker.name}`).join("\n");
    return <PpmTaskBlockedMarkerView srText={srText} identifier={identifiers[0]} more={more} title={title} />;
  });
  ```

- [ ] **Step 5: `block.tsx` (часть T3)**
  - Импорты: `import { usePpmTasksData } from "@/components/ppm-tasks/data-context";`,
    `import { withoutPpmMaterialProperties } from "@/components/ppm-tasks/evidence";`,
    `import { PpmTaskBlockedMarker, PpmTaskEvidence } from "@/components/ppm-tasks/task-evidence";`
  - Рядом с `const isDesignV2 = usePpmDesignV2();` (T1): `const ppmTasksData = usePpmTasksData();` и после неё
    `const showPpmEvidence = isDesignV2 && !!ppmTasksData;` (до раннего `return` на `:131`).
  - После закрывающего `</Tooltip>` названия (`:281`):
    `{showPpmEvidence && <PpmTaskBlockedMarker issue={issue} issuesMap={issuesMap} />}`
  - Перед `<IssueProperties` (`:300`): `{showPpmEvidence && <PpmTaskEvidence issue={issue} displayProperties={displayProperties} />}`
  - В `IssueProperties` (`:305`) `displayProperties={displayProperties}` →
    `displayProperties={showPpmEvidence ? withoutPpmMaterialProperties(displayProperties) : displayProperties}`

- [ ] **Step 6: `project-layout-root.tsx` — провайдер данных**
  - Импорты после `:19`: `import { PpmTasksDataProvider } from "@/components/ppm-tasks/data-context";`,
    `import { usePpmDesignV2 } from "@/lib/ppm-design";`
  - После `ProjectIssueLayout` (`:43`) добавить компонент прокрутки (DOM совпадает с прежними `:89-97`):
    ```tsx
    function ProjectIssueLayoutScroller(props: {
      className: string;
      activeLayout: EIssueLayoutTypes | undefined;
      showMutationLoader: boolean;
    }) {
      return (
        <div className={props.className}>
          {/* mutation loader */}
          {props.showMutationLoader && (
            <div className="shadow-sm fixed top-[70px] right-[20px] z-50 flex h-[40px] w-[40px] items-center justify-center rounded-sm bg-layer-1">
              <Spinner className="h-4 w-4" />
            </div>
          )}
          <ProjectIssueLayout activeLayout={props.activeLayout} />
        </div>
      );
    }
    ```
  - После `:54` (`const activeLayout = …`): `const isDesignV2 = usePpmDesignV2();`
  - `:89-97` заменить на:
    ```tsx
            {isDesignV2 ? (
              <PpmTasksDataProvider
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                enabled={activeLayout === EIssueLayoutTypes.LIST}
              >
                <ProjectIssueLayoutScroller
                  className="relative h-full w-full overflow-auto bg-surface-1"
                  activeLayout={activeLayout}
                  showMutationLoader={issues?.getIssueLoader() === "mutation"}
                />
              </PpmTasksDataProvider>
            ) : (
              <ProjectIssueLayoutScroller
                className="relative h-full w-full overflow-auto bg-surface-1"
                activeLayout={activeLayout}
                showMutationLoader={issues?.getIssueLoader() === "mutation"}
              />
            )}
    ```

- [ ] **Step 7: `tasks.css` — блок T3**
  ```css
  /* ─── T3 · «Материалы» и метка блокировки ─── */
  :where(html[data-ppm-design="v2"]) .ppm-task-evidence {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 12px;
    min-width: 0;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-evidence__item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-evidence__icon {
    flex: none;
    color: var(--ppm-color-icon-subtle, var(--txt-icon-tertiary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-evidence__icon--pr {
    flex: none;
    color: var(--ppm-type-code, var(--txt-icon-tertiary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-blocked {
    display: inline-flex;
    flex: none;
    align-items: center;
    margin-left: 6px;
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-row:has(.ppm-task-blocked) .ppm-task-title {
    font-stretch: var(--ppm-font-stretch-narrow, 85%);
  }
  ```

- [ ] **Step 8: Дополнить `v1-literals.test.ts`**:
  `["issues/issue-layouts/roots/project-layout-root.tsx", 'className="relative h-full w-full overflow-auto bg-surface-1"'],`

- [ ] **Step 9: Прогон, типы, формат, линт** — `vitest run tests/ppm-tasks` PASS; типы `T: 0 ошибок`;
  `oxfmt core/components/ppm-tasks tests/ppm-tasks core/components/issues/issue-layouts/list/block.tsx core/components/issues/issue-layouts/roots/project-layout-root.tsx`;
  `oxlint core/components/ppm-tasks tests/ppm-tasks` → 0 errors.
- [ ] **Step 10: Сеть (контроллер, DevTools → Network, v2, раскладка «Список»)** — на загрузку: один
  `issues-detail/?expand=issue_relation…` и один `git/links/`; при прокрутке — новых нет; в «Доске» — ни одного;
  в `v1` — ни одного. Строка с PR показывает «#48», задача с активным блокером — «⊣ ROBOT-12» красным.

**Acceptance T3:**
- [ ] D, R8: «Материалы» = PR (номер из Git-связей) + вложения + ссылки; без состояний PR и проверок; пусто —
  ничего не рисуется (без «—»).
- [ ] Метка «⊣ ROBOT-12» из связей Plane `blocked_by`, только при активном блокере; живое состояние блокера из
  списка учитывается.
- [ ] Данные: ровно 2 GET на загрузку списка в v2, без N+1; 403/404 — молча.
- [ ] Другие list-корни и v1 — без полоски и без запросов.

---

### Task 9 (T4): Колонка куратора «Требует внимания»

**Files:**
- Create: `apps/web/core/components/ppm-tasks/attention.ts`
- Create: `apps/web/core/components/ppm-tasks/curator-column-view.tsx`
- Create: `apps/web/core/components/ppm-tasks/use-curator-collapsed.ts`
- Create: `apps/web/core/components/ppm-tasks/curator-column.tsx`
- Modify: `apps/web/core/components/issues/issue-layouts/roots/project-layout-root.tsx` (импорты, v2-ветка из T3)
- Modify: `apps/web/styles/ppm-v2/tasks.css` (блок T4)
- Create (тесты): `apps/web/tests/ppm-tasks/attention.test.ts`, `curator-view.test.tsx`

**Interfaces:**
- Consumes: `usePpmTasksData` (T3), `collectPpmActiveBlockers`, `isPpmActiveStateGroup`, `formatPpmIssueIdentifier`,
  `PpmBlockedGlyph` (T3), `formatPpmTemplate`, `splitPpmTemplate`, `handlePpmSpaClick` (T1),
  `getPpmStateDisplayName` (F); сторы `useProjectState().getProjectStates/getStateById`,
  `useMember().getUserDetails`, `useIssues(PROJECT).issueMap`, `useIssueDetail().setPeekIssue/peekIssue`,
  `generateWorkItemLink` (`@plane/utils`).
- Produces: `derivePpmTaskAttention`, `findPpmReviewStateIds`, `mergePpmLiveIssue`, `toPpmDateKey`,
  `formatPpmShortDate`, `formatPpmChangedAt`, `formatPpmMemberShortName`, `getPpmMemberInitials`;
  `PpmTasksCuratorColumn`, `PpmCuratorColumnView`; ключ `localStorage.ppm_tasks_curator_collapsed`.

- [ ] **Step 1: pre-image**
  ```bash
  T=/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh
  $T apps/web/core/components/ppm-tasks/attention.ts apps/web/core/components/ppm-tasks/curator-column-view.tsx \
     apps/web/core/components/ppm-tasks/use-curator-collapsed.ts apps/web/core/components/ppm-tasks/curator-column.tsx \
     apps/web/tests/ppm-tasks/attention.test.ts apps/web/tests/ppm-tasks/curator-view.test.tsx
  ```

- [ ] **Step 2: Падающие тесты**

  `apps/web/tests/ppm-tasks/attention.test.ts`:
  ```ts
  import { describe, expect, it } from "vitest";
  import {
    derivePpmTaskAttention,
    findPpmReviewStateIds,
    formatPpmChangedAt,
    formatPpmMemberShortName,
    getPpmMemberInitials,
    mergePpmLiveIssue,
    toPpmDateKey,
  } from "@/components/ppm-tasks/attention";
  import type { TPpmAttentionIssue } from "@/components/ppm-tasks/evidence";

  const STATES = [
    { id: "s-backlog", name: "Backlog", group: "backlog" },
    { id: "s-todo", name: "Todo", group: "unstarted" },
    { id: "s-progress", name: "In Progress", group: "started" },
    { id: "s-review", name: "На проверке", group: "started" },
    { id: "s-done", name: "Done", group: "completed" },
    { id: "s-cancel", name: "Cancelled", group: "cancelled" },
  ];
  const groupOf = (stateId: string | null | undefined) => STATES.find((s) => s.id === stateId)?.group;
  const make = (seq: number, stateId: string, patch: Partial<TPpmAttentionIssue> = {}): TPpmAttentionIssue => ({
    id: `i${seq}`,
    name: `Задача ${seq}`,
    sequence_id: seq,
    project_id: "p1",
    state_id: stateId,
    target_date: null,
    updated_at: `2026-09-2${Math.min(seq, 9)}T08:00:00Z`,
    updated_by: "u1",
    assignee_ids: [],
    issue_relation: [],
    ...patch,
  });
  const blockedBy = (seq: number, stateId: string) => ({
    id: `i${seq}`,
    project_id: "p1",
    sequence_id: seq,
    name: `Задача ${seq}`,
    relation_type: "blocked_by",
    state_id: stateId,
  });

  const ISSUES = [
    make(15, "s-todo", { issue_relation: [blockedBy(12, "s-progress")] }),
    make(12, "s-progress", { target_date: "2026-09-26" }),
    make(9, "s-review"),
    make(7, "s-done", { target_date: "2026-09-20" }),
    make(3, "s-todo", { issue_relation: [blockedBy(7, "s-done")] }),
    make(4, "s-backlog", { target_date: "2026-09-22" }),
    make(5, "s-cancel", { target_date: "2026-09-01" }),
    make(6, "s-todo", { target_date: "2026-09-24" }),
  ];

  describe("curator attention", () => {
    it("finds review states only in the started group by name", () => {
      expect([...findPpmReviewStateIds(STATES)]).toEqual(["s-review"]);
      expect(findPpmReviewStateIds([{ id: "x", name: "Review", group: "unstarted" }]).size).toBe(0);
      expect(findPpmReviewStateIds([{ id: "y", name: "Code review", group: "started" }]).has("y")).toBe(true);
    });

    it("derives blocked, review, overdue (strictly before today), nearest due and recent", () => {
      const result = derivePpmTaskAttention({
        issues: ISSUES,
        todayKey: "2026-09-24",
        getStateGroup: groupOf,
        reviewStateIds: findPpmReviewStateIds(STATES),
      });
      expect(result.blocked.map((b) => [b.issue.sequence_id, b.blockers.map((x) => x.sequenceId)])).toEqual([[15, [12]]]);
      expect(result.review?.map((i) => i.sequence_id)).toEqual([9]);
      expect(result.overdue.map((i) => i.sequence_id)).toEqual([4]);
      expect(result.nearestDue?.sequence_id).toBe(6);
      expect(result.attentionCount).toBe(3);
      expect(result.recent).toHaveLength(5);
    });

    it("hides the review section when the project has no review state", () => {
      const result = derivePpmTaskAttention({ issues: ISSUES, todayKey: "2026-09-24", getStateGroup: groupOf, reviewStateIds: new Set() });
      expect(result.review).toBeNull();
    });

    it("handles an empty project", () => {
      const result = derivePpmTaskAttention({ issues: [], todayKey: "2026-09-24", getStateGroup: groupOf, reviewStateIds: new Set(["s-review"]) });
      expect(result).toMatchObject({ blocked: [], review: [], overdue: [], nearestDue: null, recent: [], attentionCount: 0 });
    });

    it("prefers live list values over the fetched snapshot", () => {
      const merged = mergePpmLiveIssue(make(4, "s-backlog", { target_date: "2026-09-22" }), {
        state_id: "s-done",
        target_date: "2026-09-22",
        name: "Новое имя",
        assignee_ids: ["u2"],
        updated_at: "2026-09-24T10:00:00Z",
        updated_by: "u2",
      });
      expect(merged).toMatchObject({ state_id: "s-done", name: "Новое имя", assignee_ids: ["u2"], updated_by: "u2" });
    });

    it("formats change time as today / yesterday / date", () => {
      const now = new Date(2026, 8, 24, 15, 0);
      const labels = { today: "сегодня, {time}", yesterday: "вчера, {time}" };
      expect(formatPpmChangedAt(new Date(2026, 8, 24, 11, 52).toISOString(), now, "ru", labels)).toBe("сегодня, 11:52");
      expect(formatPpmChangedAt(new Date(2026, 8, 23, 17, 30).toISOString(), now, "ru", labels)).toBe("вчера, 17:30");
      expect(formatPpmChangedAt(new Date(2026, 8, 20, 9, 5).toISOString(), now, "ru", labels)).toBe("20 сент., 09:05");
      expect(toPpmDateKey(now)).toBe("2026-09-24");
    });

    it("shortens member names like the mockup", () => {
      expect(formatPpmMemberShortName({ first_name: "Даша", last_name: "Петрова", display_name: "dasha" })).toBe("Даша П.");
      expect(formatPpmMemberShortName({ first_name: "", last_name: "", display_name: "oleg" })).toBe("oleg");
      expect(formatPpmMemberShortName(undefined)).toBe("");
      expect(getPpmMemberInitials({ first_name: "Даша", last_name: "Петрова", display_name: "dasha" })).toBe("ДП");
      expect(getPpmMemberInitials({ first_name: "", last_name: "", display_name: "oleg" })).toBe("OL");
    });
  });
  ```

  `apps/web/tests/ppm-tasks/curator-view.test.tsx`:
  ```tsx
  import { renderToStaticMarkup } from "react-dom/server";
  import { describe, expect, it } from "vitest";
  import { PpmCuratorColumnView } from "@/components/ppm-tasks/curator-column-view";
  import type { TPpmCuratorViewProps } from "@/components/ppm-tasks/curator-column-view";

  const LABELS: TPpmCuratorViewProps["labels"] = {
    title: "Требует внимания",
    hide: "Скрыть колонку",
    show: "Показать «Требует внимания»",
    blocked: "Заблокировано",
    blockedEmpty: "Заблокированных задач нет",
    review: "Ждёт проверки",
    reviewEmpty: "На проверке ничего нет",
    overdue: "Просрочено",
    overdueEmpty: "Просроченных задач нет",
    recent: "Недавно изменённые",
    recentEmpty: "Задач пока нет",
    hint: "Нажмите на задачу — справа откроется её карточка, а эта колонка спрячется.",
    loading: "Загружаем…",
    error: "Не удалось загрузить сводку",
    retry: "Повторить",
  };
  const base: TPpmCuratorViewProps = {
    labels: LABELS,
    status: "ready",
    collapsed: false,
    attentionCount: 1,
    blocked: {
      count: 1,
      entries: [
        {
          id: "i15",
          href: "/ws/browse/ROBOT-15/",
          identifier: "ROBOT-15",
          title: "Сценарий сортировки по 4 цветам",
          byline: "Даша П.",
          detail: { prefix: "Ждёт ", code: "ROBOT-12", suffix: " · Откалибровать датчик цвета" },
        },
      ],
    },
    review: null,
    overdue: { count: 0, entries: [], nearest: { prefix: "Ближайший срок — ", code: "ROBOT-12", suffix: ", 26 сент." } },
    recent: [{ id: "i12", href: "/ws/browse/ROBOT-12/", identifier: "ROBOT-12", title: "Откалибровать датчик цвета", initials: "ДП", byline: "Даша П. · сегодня, 11:52" }],
    onToggleCollapsed: () => undefined,
    onRetry: () => undefined,
    onOpenIssue: () => undefined,
  };

  describe("PpmCuratorColumnView", () => {
    it("renders sections, hides review without a review state and shows the nearest due date", () => {
      const html = renderToStaticMarkup(<PpmCuratorColumnView {...base} />);
      expect(html).toContain('aria-label="Требует внимания"');
      expect(html).toContain("min-[1440px]:flex");
      expect(html).toContain("Заблокировано");
      expect(html).not.toContain("Ждёт проверки");
      expect(html).toContain("Просроченных задач нет");
      expect(html).toContain("Ближайший срок — ");
      expect(html).toContain("Даша П. · сегодня, 11:52");
      expect(html).toContain('aria-label="Скрыть колонку"');
      expect(html).toContain(LABELS.hint);
    });

    it("renders empty states and the review section when it exists", () => {
      const html = renderToStaticMarkup(
        <PpmCuratorColumnView
          {...base}
          attentionCount={0}
          blocked={{ count: 0, entries: [] }}
          review={{ count: 0, entries: [] }}
          overdue={{ count: 0, entries: [] }}
          recent={[]}
        />
      );
      expect(html).toContain("Заблокированных задач нет");
      expect(html).toContain("На проверке ничего нет");
      expect(html).toContain("Задач пока нет");
      expect(html).not.toContain("Ближайший срок");
    });

    it("collapses to a rail with a named show button", () => {
      const html = renderToStaticMarkup(<PpmCuratorColumnView {...base} collapsed />);
      expect(html).toContain('aria-label="Показать «Требует внимания»"');
      expect(html).not.toContain("Заблокировано");
    });

    it("shows loading and error states", () => {
      expect(renderToStaticMarkup(<PpmCuratorColumnView {...base} status="loading" />)).toContain("Загружаем…");
      const error = renderToStaticMarkup(<PpmCuratorColumnView {...base} status="error" />);
      expect(error).toContain("Не удалось загрузить сводку");
      expect(error).toContain(">Повторить</button>");
    });
  });
  ```

- [ ] **Step 3: Запустить** `./node_modules/.bin/vitest run tests/ppm-tasks/attention.test.ts tests/ppm-tasks/curator-view.test.tsx` → FAIL.

- [ ] **Step 4: Реализация**

  `apps/web/core/components/ppm-tasks/attention.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { collectPpmActiveBlockers, isPpmActiveStateGroup } from "./evidence";
  import type { TPpmAttentionIssue, TPpmBlocker, TPpmStateGroupLookup } from "./evidence";
  import { formatPpmTemplate } from "./format";

  /** R6: «Ждёт проверки» — только статусы группы started с таким именем; статусы не создаём. */
  export const PPM_REVIEW_STATE_PATTERN = /провер|review/i;
  const RECENT_LIMIT = 5;

  export type TPpmAttention = {
    blocked: Array<{ issue: TPpmAttentionIssue; blockers: TPpmBlocker[] }>;
    review: TPpmAttentionIssue[] | null;
    overdue: TPpmAttentionIssue[];
    nearestDue: TPpmAttentionIssue | null;
    recent: TPpmAttentionIssue[];
    attentionCount: number;
  };

  export function findPpmReviewStateIds(
    states: ReadonlyArray<{ id: string; name: string; group: string }> | undefined
  ): Set<string> {
    return new Set(
      (states ?? []).filter((state) => state.group === "started" && PPM_REVIEW_STATE_PATTERN.test(state.name)).map((state) => state.id)
    );
  }

  const pad = (value: number) => String(value).padStart(2, "0");

  export function toPpmDateKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function dateKeyOf(value: string | null | undefined): string | null {
    return value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  }

  const byUpdatedDesc = (a: TPpmAttentionIssue, b: TPpmAttentionIssue) => Date.parse(b.updated_at) - Date.parse(a.updated_at);

  export function derivePpmTaskAttention(input: {
    issues: readonly TPpmAttentionIssue[];
    todayKey: string;
    getStateGroup: TPpmStateGroupLookup;
    reviewStateIds: ReadonlySet<string>;
    getLiveStateId?: (issueId: string) => string | null | undefined;
  }): TPpmAttention {
    const { issues, todayKey, getStateGroup, reviewStateIds, getLiveStateId } = input;
    const active = issues.filter((item) => isPpmActiveStateGroup(getStateGroup(item.state_id)));
    const blocked = active
      .map((item) => ({
        issue: item,
        blockers: collectPpmActiveBlockers(
          (item.issue_relation ?? []).filter((relation) => relation.relation_type === "blocked_by"),
          getStateGroup,
          getLiveStateId
        ),
      }))
      .filter((entry) => entry.blockers.length > 0)
      .sort((a, b) => byUpdatedDesc(a.issue, b.issue));
    const review = reviewStateIds.size
      ? active.filter((item) => !!item.state_id && reviewStateIds.has(item.state_id)).sort(byUpdatedDesc)
      : null;
    const dated = active
      .map((item) => ({ item, key: dateKeyOf(item.target_date) }))
      .filter((entry): entry is { item: TPpmAttentionIssue; key: string } => entry.key !== null)
      .sort((a, b) => (a.key === b.key ? a.item.sequence_id - b.item.sequence_id : a.key < b.key ? -1 : 1));
    const overdue = dated.filter((entry) => entry.key < todayKey).map((entry) => entry.item);
    const nearestDue = dated.find((entry) => entry.key >= todayKey)?.item ?? null;
    const recent = [...issues].sort(byUpdatedDesc).slice(0, RECENT_LIMIT);
    const attentionIds = new Set([
      ...blocked.map((entry) => entry.issue.id),
      ...(review ?? []).map((item) => item.id),
      ...overdue.map((item) => item.id),
    ]);
    return { blocked, review, overdue, nearestDue, recent, attentionCount: attentionIds.size };
  }

  type TLiveFields = Partial<
    Pick<TPpmAttentionIssue, "state_id" | "target_date" | "name" | "assignee_ids" | "updated_at" | "updated_by">
  >;

  /** Живые значения из issueMap (инлайн-правки в списке) важнее снимка issues-detail. */
  export function mergePpmLiveIssue(item: TPpmAttentionIssue, live: TLiveFields | undefined): TPpmAttentionIssue {
    if (!live) return item;
    return {
      ...item,
      state_id: live.state_id ?? item.state_id,
      target_date: live.target_date !== undefined ? live.target_date : item.target_date,
      name: live.name ?? item.name,
      assignee_ids: live.assignee_ids ?? item.assignee_ids,
      updated_at: live.updated_at ?? item.updated_at,
      updated_by: live.updated_by ?? item.updated_by,
    };
  }

  const langOf = (locale: string | undefined) => (locale?.toLowerCase().startsWith("ru") ? "ru" : "en");

  export function formatPpmShortDate(dateKey: string, locale: string | undefined): string {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Intl.DateTimeFormat(langOf(locale), { day: "numeric", month: "short", timeZone: "UTC" }).format(
      Date.UTC(year, month - 1, day)
    );
  }

  export function formatPpmChangedAt(
    value: string,
    now: Date,
    locale: string | undefined,
    templates: { today: string; yesterday: string }
  ): string {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "";
    const lang = langOf(locale);
    const time = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" }).format(date);
    const dayKey = toPpmDateKey(date);
    if (dayKey === toPpmDateKey(now)) return formatPpmTemplate(templates.today, { time });
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (dayKey === toPpmDateKey(yesterday)) return formatPpmTemplate(templates.yesterday, { time });
    return `${new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" }).format(date)}, ${time}`;
  }

  type TMemberName = { first_name?: string; last_name?: string; display_name?: string } | undefined;

  export function formatPpmMemberShortName(user: TMemberName): string {
    if (!user) return "";
    const first = user.first_name?.trim();
    const last = user.last_name?.trim();
    if (first && last) return `${first} ${last[0]}.`;
    return first || user.display_name?.trim() || "";
  }

  export function getPpmMemberInitials(user: TMemberName): string {
    if (!user) return "";
    const first = user.first_name?.trim();
    const last = user.last_name?.trim();
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    return (first || user.display_name?.trim() || "").slice(0, 2).toUpperCase();
  }
  ```

  `apps/web/core/components/ppm-tasks/curator-column-view.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { ReactNode } from "react";
  import { CalendarClock, Check, MousePointerClick, PanelRightClose, PanelRightOpen } from "lucide-react";
  import { handlePpmSpaClick } from "./format";
  import { PpmBlockedGlyph } from "./task-evidence-view";

  export type TPpmCuratorDetail = { prefix?: string; code?: string; suffix?: string };
  export type TPpmCuratorEntry = {
    id: string;
    href: string;
    identifier: string;
    title: string;
    byline?: string;
    detail?: TPpmCuratorDetail;
  };
  export type TPpmRecentEntry = { id: string; href: string; identifier: string; title: string; initials: string; byline: string };
  type TSection = { count: number; entries: TPpmCuratorEntry[]; moreLabel?: string };

  export type TPpmCuratorViewProps = {
    labels: {
      title: string;
      hide: string;
      show: string;
      blocked: string;
      blockedEmpty: string;
      review: string;
      reviewEmpty: string;
      overdue: string;
      overdueEmpty: string;
      recent: string;
      recentEmpty: string;
      hint: string;
      loading: string;
      error: string;
      retry: string;
    };
    status: "loading" | "error" | "ready";
    collapsed: boolean;
    attentionCount: number;
    blocked: TSection;
    review: TSection | null;
    overdue: TSection & { nearest?: TPpmCuratorDetail };
    recent: TPpmRecentEntry[];
    partialNote?: string;
    onToggleCollapsed: () => void;
    onRetry: () => void;
    onOpenIssue: (issueId: string) => void;
  };

  function Detail({ detail, className }: { detail: TPpmCuratorDetail; className: string }) {
    return (
      <span className={className}>
        {detail.prefix}
        {detail.code && <span className="ppm-curator__code">{detail.code}</span>}
        {detail.suffix}
      </span>
    );
  }

  function Section(props: {
    title: string;
    section: TSection;
    empty: ReactNode;
    glyph: ReactNode;
    kind: "blocked" | "review" | "overdue";
    onOpenIssue: (issueId: string) => void;
  }) {
    const { title, section, empty, glyph, kind, onOpenIssue } = props;
    return (
      <div className="ppm-curator__section">
        <h3 className="ppm-curator__section-title">
          {title}
          <span className="ppm-curator__code">{section.count}</span>
        </h3>
        {section.entries.length === 0
          ? empty
          : section.entries.map((entry) => (
              <a
                key={entry.id}
                href={entry.href}
                className="ppm-curator__item"
                onClick={(event) => handlePpmSpaClick(event, () => onOpenIssue(entry.id))}
              >
                <span aria-hidden="true" className="ppm-curator__glyph" data-kind={kind}>
                  {glyph}
                </span>
                <span className="ppm-curator__body">
                  <span className="ppm-curator__meta">
                    <span className="ppm-curator__code">{entry.identifier}</span>
                    {entry.byline && (
                      <>
                        <span aria-hidden="true">·</span>
                        {entry.byline}
                      </>
                    )}
                  </span>
                  <span className="ppm-curator__title">{entry.title}</span>
                  {entry.detail && <Detail detail={entry.detail} className="ppm-curator__detail" />}
                </span>
              </a>
            ))}
        {section.moreLabel && <p className="ppm-curator__more">{section.moreLabel}</p>}
      </div>
    );
  }

  export function PpmCuratorColumnView(props: TPpmCuratorViewProps) {
    const { labels, status, collapsed, attentionCount, blocked, review, overdue, recent, partialNote } = props;
    const { onToggleCollapsed, onRetry, onOpenIssue } = props;

    if (collapsed)
      return (
        <aside aria-label={labels.title} className="ppm-curator ppm-curator--collapsed hidden flex-col items-center min-[1440px]:flex">
          <button
            type="button"
            aria-label={labels.show}
            title={labels.show}
            aria-expanded={false}
            className="ppm-curator__icon-button"
            onClick={onToggleCollapsed}
          >
            <PanelRightOpen aria-hidden="true" className="size-4" strokeWidth={1.5} />
          </button>
          {status === "ready" && attentionCount > 0 && <span className="ppm-curator__code">{attentionCount}</span>}
        </aside>
      );

    return (
      <aside aria-label={labels.title} className="ppm-curator hidden flex-col min-[1440px]:flex">
        <div className="ppm-curator__head">
          <h2 className="ppm-curator__heading">{labels.title}</h2>
          {status === "ready" && <span className="ppm-curator__code">{attentionCount}</span>}
          <button
            type="button"
            aria-label={labels.hide}
            title={labels.hide}
            aria-expanded
            className="ppm-curator__icon-button ml-auto"
            onClick={onToggleCollapsed}
          >
            <PanelRightClose aria-hidden="true" className="size-4" strokeWidth={1.5} />
          </button>
        </div>

        {status === "loading" && <p className="ppm-curator__status">{labels.loading}</p>}
        {status === "error" && (
          <div className="ppm-curator__status">
            <p>{labels.error}</p>
            <button type="button" className="ppm-curator__retry" onClick={onRetry}>
              {labels.retry}
            </button>
          </div>
        )}
        {status === "ready" && (
          <>
            <div className="ppm-curator__sections">
              <Section
                title={labels.blocked}
                section={blocked}
                kind="blocked"
                glyph={<PpmBlockedGlyph className="size-4" />}
                empty={<p className="ppm-curator__empty">{labels.blockedEmpty}</p>}
                onOpenIssue={onOpenIssue}
              />
              {review && (
                <Section
                  title={labels.review}
                  section={review}
                  kind="review"
                  glyph={
                    <svg viewBox="0 0 14 14" fill="none" className="size-4">
                      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7 7V1.75A5.25 5.25 0 1 1 1.75 7Z" fill="currentColor" />
                    </svg>
                  }
                  empty={<p className="ppm-curator__empty">{labels.reviewEmpty}</p>}
                  onOpenIssue={onOpenIssue}
                />
              )}
              <Section
                title={labels.overdue}
                section={overdue}
                kind="overdue"
                glyph={<CalendarClock className="size-4" strokeWidth={1.5} />}
                empty={
                  <div className="ppm-curator__empty-row">
                    <Check aria-hidden="true" className="ppm-curator__ok size-4" strokeWidth={1.5} />
                    <span className="ppm-curator__body">
                      <span className="ppm-curator__empty-title">{labels.overdueEmpty}</span>
                      {overdue.nearest && <Detail detail={overdue.nearest} className="ppm-curator__detail" />}
                    </span>
                  </div>
                }
                onOpenIssue={onOpenIssue}
              />
            </div>
            <span aria-hidden="true" className="ppm-curator__divider" />
            <h2 className="ppm-curator__recent-heading">{labels.recent}</h2>
            {recent.length === 0 ? (
              <p className="ppm-curator__empty ppm-curator__empty--recent">{labels.recentEmpty}</p>
            ) : (
              <ol className="ppm-curator__recent">
                {recent.map((entry) => (
                  <li key={entry.id}>
                    <a
                      href={entry.href}
                      className="ppm-curator__item"
                      onClick={(event) => handlePpmSpaClick(event, () => onOpenIssue(entry.id))}
                    >
                      <span aria-hidden="true" className="ppm-curator__avatar">
                        {entry.initials}
                      </span>
                      <span className="ppm-curator__body">
                        <span className="ppm-curator__recent-title">
                          <span className="ppm-curator__code">{entry.identifier}</span>
                          <span aria-hidden="true"> · </span>
                          {entry.title}
                        </span>
                        <span className="ppm-curator__detail">{entry.byline}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
            {partialNote && <p className="ppm-curator__more">{partialNote}</p>}
          </>
        )}

        <p className="ppm-curator__foot">
          <MousePointerClick aria-hidden="true" className="size-3.5 flex-none" strokeWidth={1.5} />
          <span>{labels.hint}</span>
        </p>
      </aside>
    );
  }
  ```

  `apps/web/core/components/ppm-tasks/use-curator-collapsed.ts`:
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useCallback, useState } from "react";

  export const PPM_CURATOR_COLLAPSED_KEY = "ppm_tasks_curator_collapsed";

  function readCollapsed(): boolean {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PPM_CURATOR_COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  }

  /** Свёрнутость колонки — только localStorage устройства (без записи на сервер). */
  export function usePpmCuratorCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const toggle = useCallback(() => {
      setCollapsed((previous) => {
        const next = !previous;
        try {
          if (next) window.localStorage.setItem(PPM_CURATOR_COLLAPSED_KEY, "1");
          else window.localStorage.removeItem(PPM_CURATOR_COLLAPSED_KEY);
        } catch {
          // без localStorage колонка сворачивается до перезагрузки
        }
        return next;
      });
    }, []);
    return [collapsed, toggle];
  }
  ```

  `apps/web/core/components/ppm-tasks/curator-column.tsx`:
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { observer } from "mobx-react";
  import { useTranslation } from "@plane/i18n";
  import { EIssuesStoreType } from "@plane/types";
  import { generateWorkItemLink } from "@plane/utils";
  import { useIssueDetail } from "@/hooks/store/use-issue-detail";
  import { useIssues } from "@/hooks/store/use-issues";
  import { useMember } from "@/hooks/store/use-member";
  import { useProject } from "@/hooks/store/use-project";
  import { useProjectState } from "@/hooks/store/use-project-state";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import {
    derivePpmTaskAttention,
    findPpmReviewStateIds,
    formatPpmChangedAt,
    formatPpmMemberShortName,
    formatPpmShortDate,
    getPpmMemberInitials,
    mergePpmLiveIssue,
    toPpmDateKey,
  } from "./attention";
  import { PpmCuratorColumnView } from "./curator-column-view";
  import type { TPpmCuratorEntry, TPpmRecentEntry } from "./curator-column-view";
  import { usePpmTasksData } from "./data-context";
  import { formatPpmIssueIdentifier } from "./evidence";
  import type { TPpmAttentionIssue } from "./evidence";
  import { formatPpmTemplate, splitPpmTemplate } from "./format";
  import { usePpmCuratorCollapsed } from "./use-curator-collapsed";

  const SECTION_LIMIT = 5;

  export const PpmTasksCuratorColumn = observer(function PpmTasksCuratorColumn(props: {
    workspaceSlug: string;
    projectId: string;
  }) {
    const { workspaceSlug, projectId } = props;
    const data = usePpmTasksData();
    const ppmT = usePpmTranslation();
    const { currentLocale } = useTranslation();
    const { getProjectStates, getStateById } = useProjectState();
    const { getUserDetails } = useMember();
    const { getProjectIdentifierById } = useProject();
    const { issueMap } = useIssues(EIssuesStoreType.PROJECT);
    const { setPeekIssue } = useIssueDetail();
    const [collapsed, toggleCollapsed] = usePpmCuratorCollapsed();
    if (!data) return null;

    const now = new Date();
    const issues = (data.attention?.issues ?? []).map((item) => mergePpmLiveIssue(item, issueMap[item.id]));
    const attention = derivePpmTaskAttention({
      issues,
      todayKey: toPpmDateKey(now),
      getStateGroup: (stateId) => getStateById(stateId)?.group,
      reviewStateIds: findPpmReviewStateIds(getProjectStates(projectId)),
      getLiveStateId: (issueId) => issueMap[issueId]?.state_id,
    });

    const identifierOf = (item: { project_id: string; sequence_id: number }) =>
      formatPpmIssueIdentifier(getProjectIdentifierById(item.project_id), item.sequence_id);
    const hrefOf = (item: TPpmAttentionIssue) =>
      generateWorkItemLink({
        workspaceSlug,
        projectId: item.project_id,
        issueId: item.id,
        projectIdentifier: getProjectIdentifierById(item.project_id),
        sequenceId: item.sequence_id,
      });
    const assigneeOf = (item: TPpmAttentionIssue) =>
      item.assignee_ids[0]
        ? formatPpmMemberShortName(getUserDetails(item.assignee_ids[0])) || ppmT("tasks.curator.unassigned")
        : ppmT("tasks.curator.unassigned");
    const changedAt = (value: string) =>
      formatPpmChangedAt(value, now, currentLocale, {
        today: ppmT("tasks.curator.today_at"),
        yesterday: ppmT("tasks.curator.yesterday_at"),
      });
    const entryOf = (item: TPpmAttentionIssue, detail?: TPpmCuratorEntry["detail"]): TPpmCuratorEntry => ({
      id: item.id,
      href: hrefOf(item),
      identifier: identifierOf(item),
      title: item.name,
      byline: assigneeOf(item),
      detail,
    });
    const moreOf = (count: number) =>
      count > SECTION_LIMIT ? formatPpmTemplate(ppmT("tasks.curator.more"), { count: count - SECTION_LIMIT }) : undefined;

    const blockedEntries = attention.blocked.slice(0, SECTION_LIMIT).map(({ issue, blockers }) =>
      entryOf(issue, {
        prefix: `${ppmT("tasks.curator.waits_for")} `,
        code: formatPpmIssueIdentifier(getProjectIdentifierById(blockers[0].projectId), blockers[0].sequenceId),
        suffix: ` · ${blockers[0].name}${blockers.length > 1 ? ` +${blockers.length - 1}` : ""}`,
      })
    );
    const reviewSection = attention.review
      ? {
          count: attention.review.length,
          entries: attention.review.slice(0, SECTION_LIMIT).map((item) =>
            entryOf(item, { prefix: formatPpmTemplate(ppmT("tasks.curator.changed_at"), { when: changedAt(item.updated_at) }) })
          ),
          moreLabel: moreOf(attention.review.length),
        }
      : null;
    const overdueEntries = attention.overdue.slice(0, SECTION_LIMIT).map((item) =>
      entryOf(item, {
        prefix: formatPpmTemplate(ppmT("tasks.curator.due_on"), {
          date: formatPpmShortDate((item.target_date ?? "").slice(0, 10), currentLocale),
        }),
      })
    );
    const nearest = attention.nearestDue;
    const [nearestPrefix, nearestRest] = splitPpmTemplate(ppmT("tasks.curator.nearest_due"), "task");
    const nearestDetail =
      nearest && nearest.target_date
        ? {
            prefix: nearestPrefix,
            code: identifierOf(nearest),
            suffix: formatPpmTemplate(nearestRest, { date: formatPpmShortDate(nearest.target_date.slice(0, 10), currentLocale) }),
          }
        : undefined;
    const recent: TPpmRecentEntry[] = attention.recent.map((item) => {
      const author = item.updated_by ? getUserDetails(item.updated_by) : undefined;
      const name = formatPpmMemberShortName(author);
      return {
        id: item.id,
        href: hrefOf(item),
        identifier: identifierOf(item),
        title: item.name,
        initials: getPpmMemberInitials(author),
        byline: [name, changedAt(item.updated_at)].filter(Boolean).join(" · "),
      };
    });
    const payload = data.attention;
    const partialNote =
      payload && payload.totalCount > payload.issues.length
        ? formatPpmTemplate(ppmT("tasks.curator.partial"), { count: payload.issues.length })
        : undefined;

    return (
      <PpmCuratorColumnView
        labels={{
          title: ppmT("tasks.curator.title"),
          hide: ppmT("tasks.curator.hide"),
          show: ppmT("tasks.curator.show"),
          blocked: ppmT("tasks.curator.blocked"),
          blockedEmpty: ppmT("tasks.curator.blocked_empty"),
          review: ppmT("tasks.curator.review"),
          reviewEmpty: ppmT("tasks.curator.review_empty"),
          overdue: ppmT("tasks.curator.overdue"),
          overdueEmpty: ppmT("tasks.curator.overdue_empty"),
          recent: ppmT("tasks.curator.recent"),
          recentEmpty: ppmT("tasks.curator.recent_empty"),
          hint: ppmT("tasks.curator.hint"),
          loading: ppmT("tasks.curator.loading"),
          error: ppmT("tasks.curator.error"),
          retry: ppmT("tasks.curator.retry"),
        }}
        status={data.attentionStatus}
        collapsed={collapsed}
        attentionCount={attention.attentionCount}
        blocked={{ count: attention.blocked.length, entries: blockedEntries, moreLabel: moreOf(attention.blocked.length) }}
        review={reviewSection}
        overdue={{
          count: attention.overdue.length,
          entries: overdueEntries,
          moreLabel: moreOf(attention.overdue.length),
          nearest: nearestDetail,
        }}
        recent={recent}
        partialNote={partialNote}
        onToggleCollapsed={toggleCollapsed}
        onRetry={data.retryAttention}
        onOpenIssue={(issueId) => {
          const item = issues.find((candidate) => candidate.id === issueId);
          setPeekIssue({ workspaceSlug, projectId: item?.project_id ?? projectId, issueId });
        }}
      />
    );
  });
  ```
  (`generateWorkItemLink` — `packages/utils/src/work-item/base.ts:315-331`, `isEpic`/`isArchived` необязательны;
  сводка строится только по неархивным задачам — `Issue.issue_objects` исключает архив и черновики.)

- [ ] **Step 5: `project-layout-root.tsx` — колонка**
  - Импорты: `import { PpmTasksCuratorColumn } from "@/components/ppm-tasks/curator-column";`,
    `import { useIssueDetail } from "@/hooks/store/use-issue-detail";`
  - После `const isDesignV2 = usePpmDesignV2();`: `const { peekIssue } = useIssueDetail();`
  - v2-ветку из T3 заменить на:
    ```tsx
              <PpmTasksDataProvider
                workspaceSlug={workspaceSlug}
                projectId={projectId}
                enabled={activeLayout === EIssueLayoutTypes.LIST}
              >
                <div className="relative flex h-full w-full overflow-hidden">
                  <ProjectIssueLayoutScroller
                    className="relative h-full min-w-0 flex-1 overflow-auto bg-surface-1"
                    activeLayout={activeLayout}
                    showMutationLoader={issues?.getIssueLoader() === "mutation"}
                  />
                  {activeLayout === EIssueLayoutTypes.LIST && !peekIssue && (
                    <PpmTasksCuratorColumn workspaceSlug={workspaceSlug} projectId={projectId} />
                  )}
                </div>
              </PpmTasksDataProvider>
    ```
  (ветка v1 не меняется; колонка скрыта при открытом peek любого режима и ниже 1440 px — классом `hidden
  min-[1440px]:flex` в виде.)

- [ ] **Step 6: `tasks.css` — блок T4** (без `display` у `.ppm-curator`: видимость задаёт `hidden min-[1440px]:flex`)
  ```css
  /* ─── T4 · колонка куратора ─── */
  :where(html[data-ppm-design="v2"]) .ppm-curator {
    flex: none;
    box-sizing: border-box;
    width: 19rem;
    min-height: 0;
    overflow-y: auto;
    border-left: 1px solid var(--ppm-color-border, var(--border-subtle));
    background-color: var(--ppm-color-surface-1, var(--bg-surface-1));
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator--collapsed {
    width: 2.75rem;
    gap: 6px;
    padding-top: 12px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__head {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;
    height: var(--ppm-page-header-height, 3.25rem);
    padding: 0 12px 0 20px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__heading,
  :where(html[data-ppm-design="v2"]) .ppm-curator__recent-heading {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__recent-heading {
    padding: 14px 20px 4px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__icon-button:hover,
  :where(html[data-ppm-design="v2"]) .ppm-curator__item:hover {
    background-color: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__sections,
  :where(html[data-ppm-design="v2"]) .ppm-curator__recent {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0 8px;
    list-style: none;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__section-title {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    box-sizing: border-box;
    height: 28px;
    margin: 0;
    padding: 0 12px 4px;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__item,
  :where(html[data-ppm-design="v2"]) .ppm-curator__empty-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 12px 8px;
    border-radius: var(--ppm-radius-sm, 0.375rem);
    color: var(--ppm-color-text, var(--txt-primary));
    text-decoration: none;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__glyph {
    flex: none;
    padding-top: 1px;
    color: var(--ppm-color-icon-subtle, var(--txt-icon-tertiary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__glyph[data-kind="blocked"],
  :where(html[data-ppm-design="v2"]) .ppm-curator__glyph[data-kind="overdue"] {
    color: var(--ppm-color-danger-text, var(--txt-danger-primary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__glyph[data-kind="review"] {
    color: var(--ppm-status-review, var(--txt-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__ok {
    flex: none;
    margin-top: 2px;
    color: var(--ppm-color-success, var(--txt-success-primary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    line-height: 1rem;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__title,
  :where(html[data-ppm-design="v2"]) .ppm-curator__empty-title {
    font-size: 0.8125rem;
    line-height: 1.25rem;
    font-stretch: var(--ppm-font-stretch-narrow, 85%);
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__empty-title {
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__recent-title {
    overflow: hidden;
    font-size: 0.8125rem;
    line-height: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__detail {
    overflow: hidden;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
    line-height: 1rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__code {
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1rem;
    font-variant-numeric: tabular-nums;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__avatar {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    margin-top: 2px;
    border-radius: 50%;
    background-color: var(--ppm-color-layer-1-selected, var(--bg-layer-1-selected));
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.6875rem;
    line-height: 1;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__empty,
  :where(html[data-ppm-design="v2"]) .ppm-curator__more,
  :where(html[data-ppm-design="v2"]) .ppm-curator__status {
    margin: 0;
    padding: 4px 12px 8px;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    line-height: 1rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__empty--recent,
  :where(html[data-ppm-design="v2"]) .ppm-curator__status {
    padding-inline: 20px;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__retry {
    margin-top: 6px;
    padding: 0;
    color: var(--ppm-color-accent-text, var(--txt-accent-primary));
    font-size: 0.75rem;
    line-height: 1rem;
    font-weight: 500;
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__divider {
    display: block;
    flex: none;
    height: 1px;
    margin: 16px 20px 0;
    background-color: var(--ppm-color-border, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) .ppm-curator__foot {
    display: flex;
    flex: none;
    align-items: flex-start;
    gap: 8px;
    margin: auto 0 0;
    padding: 12px 20px;
    border-top: 1px solid var(--ppm-color-border, var(--border-subtle));
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
    line-height: 1rem;
  }
  ```

- [ ] **Step 7: Прогон, типы, формат, линт** — `vitest run tests/ppm-tasks` PASS; типы `T: 0 ошибок`;
  `oxfmt core/components/ppm-tasks tests/ppm-tasks core/components/issues/issue-layouts/roots/project-layout-root.tsx`;
  `oxlint core/components/ppm-tasks tests/ppm-tasks` → 0 errors;
  `cd $PF/packages/ppm-brand && node scripts/audit-tailwind-classes.mjs` → passed.
- [ ] **Step 8: Смоук (контроллер)** — окно 1440+: колонка справа 304 px; секции с числами; «Ждёт проверки»
  только в проекте со статусом «На проверке»/review; клик по пункту — открывается peek, колонка прячется, после
  закрытия — возвращается; «Скрыть колонку» — рейка с кнопкой «Показать…», состояние переживает перезагрузку.
  Окно 1280 — колонки нет. Раскладка «Доска» — колонки нет.

**Acceptance T4:**
- [ ] D: колонка ≥ 1440 px, скрыта при открытом peek, сворачивается (localStorage); «Заблокировано»,
  «Ждёт проверки» (R6, только если есть статус), «Просрочено» (+ «Ближайший срок — …»), «Недавно изменённые»
  (топ-5, кто и когда; R7) — только вычислимые данные.
- [ ] Пустые состояния по-русски; загрузка и ошибка с «Повторить».
- [ ] Строгое «просрочено» (`< сегодня`), неактивные задачи (Готово/Отменена) не считаются.

---

### Task 10 (T5): Компактная плотность, быстрое добавление, стражи линии и финальная проверка

**Files:**
- Modify: `apps/web/core/components/issues/issue-layouts/quick-add/button/list.tsx:7-26`
- Modify: `apps/web/styles/ppm-v2/tasks.css` (блок T5)
- Modify: `apps/web/tests/ppm-tasks/v1-literals.test.ts` (кейс quick-add)
- Create: `apps/web/tests/ppm-tasks/guards.test.ts`

**Interfaces:**
- Consumes: всё из T1–T4; токены плотности F (`html[data-ppm-density="compact"]`).
- Produces: `.ppm-task-quick-add`; компактные правила; стражи кегля/области/видимости для линии T.

- [ ] **Step 1: pre-image**
  `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh apps/web/core/components/issues/issue-layouts/quick-add/button/list.tsx apps/web/tests/ppm-tasks/guards.test.ts`

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-tasks/guards.test.ts`:
  ```ts
  // UX1.1 T: text >= 11px on Tasks v2 surfaces, compact density covered, curator visibility left to Tailwind.
  import { readFileSync, readdirSync, statSync } from "node:fs";
  import { join } from "node:path";
  import { describe, expect, it } from "vitest";

  const ROOT = new URL("../../core/components/ppm-tasks/", import.meta.url).pathname;
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));
  const css = readFileSync(new URL("../../styles/ppm-v2/tasks.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleBody = (selectorEnd: string) =>
    [...css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)].find((m) => m[1].trim().endsWith(selectorEnd))?.[2] ?? "";

  describe("Tasks v2 guards", () => {
    it("uses no text below 11px in ppm-tasks components", () => {
      const bad = files(ROOT)
        .filter((f) => f.endsWith(".tsx"))
        .flatMap((f) => readFileSync(f, "utf8").split("\n").map((line, i) => [f, i + 1, line] as const))
        .filter(([, , line]) => /\btext-(9|10)\b|text-\[(?:[0-9]|10)px\]/.test(line));
      expect(bad.map(([f, n]) => `${f}:${n}`)).toEqual([]);
    });

    it("keeps every tasks.css font size at 11px or larger", () => {
      const sizes = [...css.matchAll(/font-size:\s*([\d.]+)(rem|px)/g)].map((m) => (m[2] === "rem" ? Number(m[1]) * 16 : Number(m[1])));
      expect(sizes.filter((px) => px < 11)).toEqual([]);
    });

    it("leaves curator visibility to hidden/min-[1440px]:flex", () => {
      expect(ruleBody(".ppm-curator")).not.toMatch(/display\s*:/);
    });

    it("styles the compact density", () => {
      expect(css).toContain(':where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint');
      expect(css).toContain(':where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-curator__item');
      expect(ruleBody(".ppm-task-quick-add")).toMatch(/min-height:\s*var\(--ppm-row-height,/);
    });
  });
  ```
  Запуск: `./node_modules/.bin/vitest run tests/ppm-tasks/guards.test.ts` → FAIL (нет компактных правил и
  `.ppm-task-quick-add`).

- [ ] **Step 3: `quick-add/button/list.tsx`** — заменить тело компонента (`:14-26`):
  ```tsx
  export const ListQuickAddIssueButton = observer(function ListQuickAddIssueButton(props: TQuickAddIssueButton) {
    const { onClick, isEpic = false } = props;
    const { t } = useTranslation();
    const isDesignV2 = usePpmDesignV2();
    if (isDesignV2)
      return (
        <Row className="ppm-task-quick-add flex w-full items-center bg-layer-transparent">
          <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-2 self-stretch text-left text-13 font-medium text-tertiary hover:text-secondary"
          >
            <PlusIcon aria-hidden="true" className="h-3.5 w-3.5 stroke-2" />
            <span>{isEpic ? t("epic.new") : t("issue.new")}</span>
          </button>
        </Row>
      );
    return (
      <Row
        className="flex w-full cursor-pointer items-center gap-2 bg-layer-transparent py-3 hover:bg-layer-transparent-hover"
        onClick={onClick}
      >
        <PlusIcon className="h-3.5 w-3.5 stroke-2" />
        <span className="text-13 font-medium">{isEpic ? t("epic.new") : t("issue.new")}</span>
      </Row>
    );
  });
  ```
  и импорт `import { usePpmDesignV2 } from "@/lib/ppm-design";` после `:12`. (В v2 кнопка доступна с клавиатуры.)

- [ ] **Step 4: `tasks.css` — блок T5**
  ```css
  /* ─── T5 · быстрое добавление и компактная плотность ─── */
  :where(html[data-ppm-design="v2"]) .ppm-task-quick-add {
    min-height: var(--ppm-row-height, 2.75rem);
  }

  :where(html[data-ppm-design="v2"]) .ppm-task-quick-add:hover {
    background-color: var(--ppm-color-layer-1-hover, var(--bg-layer-1-hover));
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint {
    gap: 16px;
    padding: 0 12px 0 8px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint__track {
    height: 40px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint__elapsed {
    top: 16px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint__axis,
  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint__tick {
    top: 23px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint__label {
    top: 27px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-sprint__today {
    top: 12px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-curator__head {
    padding: 0 12px 0 16px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-curator__item {
    padding: 4px 12px 6px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-curator__recent-heading {
    padding: 12px 16px 4px;
  }

  :where(html[data-ppm-design="v2"][data-ppm-density="compact"]) .ppm-curator__foot {
    padding: 10px 16px;
  }
  ```
  Высоты строк/групп/шкалы/шапки колонки в компактной плотности (32/32/52/44) приходят из токенов F; здесь —
  только отступы, которых нет в токенах (макет `H-Tasks-Compact`).

- [ ] **Step 5: Дополнить `v1-literals.test.ts`**:
  `["issues/issue-layouts/quick-add/button/list.tsx", '"flex w-full cursor-pointer items-center gap-2 bg-layer-transparent py-3 hover:bg-layer-transparent-hover"'],`

- [ ] **Step 6: Финальная проверка линии**
  - `cd $PF/apps/web && ./node_modules/.bin/vitest run` → 184 + тесты линии T (13 файлов `tests/ppm-tasks`),
    всё зелёное; `tests/ppm-a11y`, `tests/ppm-shell` — зелёные.
  - Типы → `T: 0 ошибок`.
  - `../../node_modules/.bin/oxlint core/components/ppm-tasks tests/ppm-tasks core/components/issues` → 0 errors.
  - `../../node_modules/.bin/oxfmt --check core/components/ppm-tasks tests/ppm-tasks core/components/issues/header.tsx core/components/issues/issue-layouts/list core/components/issues/issue-layouts/kanban/default.tsx core/components/issues/issue-layouts/roots/project-layout-root.tsx core/components/issues/issue-layouts/filters/header/layout-selection.tsx core/components/issues/issue-layouts/quick-add/button/list.tsx "app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx"` → без замечаний.
  - `cd $PF/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs` → PASS.
  - Патч линии для контроллера: `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/tools/ux11-diff.sh apps/web/core/components/issues apps/web/core/components/ppm-tasks apps/web/styles/ppm-v2/tasks.css "apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues" packages/ppm-brand/src/translations/ux11-tasks.ts apps/web/tests/ppm-tasks > /Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-24-ux11/checkpoints/lane-T.patch`
- [ ] **Step 7: Смоук-матрица (контроллер, только чтение)** — «Удобная»/«Компактная» × тёмная/светлая:
  строка 36/32, группа 36/32, плейсхолдер = строка (DevTools: высота блоков при быстрой прокутке 200+ задач не
  меняется), шкала 60/52, шапка колонки 52/44; переключение плотности без перезагрузки; «+ Новая задача» внизу
  группы доступна с клавиатуры. Затем `localStorage.ppm_design="v1"` → вид волны 0; вернуть значения.

**Acceptance T5:**
- [ ] B/C: компактная плотность применяется к строкам, группам, шкале и колонке без перезагрузки; прокрутка не
  «прыгает» (критерий приёмки 3).
- [ ] Текст ≥ 11 px в компонентах и `tasks.css` (детектор `tiny-text` = 0 на «Задачах»).
- [ ] Все проверки линии не хуже базы (web 184 + новые, brand 41 + аудиты, tsc 0 по путям T, oxlint 0).


---

## Линия C — «Холст» (параллельно с линией T, после фазы F)

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

### Task 11 (C1): Основа v2 Холста и строка статуса «Лист · Сохранено · 12:41» с группой масштаба

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

### Task 12 (C2): Слой смысловых связей на холсте

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

### Task 13 (C3): Живые карточки источников (шапка источника, знак «три узла», «Открыть ↗»)

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

### Task 14 (C4): Свои карточки и секции (нейтральная подложка, цвет — глифом, засечки, «Название · N объектов»)

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

### Task 15 (C5): Карточка «Найдено поиском» (фрагмент, чипы-цитаты, честная метка устаревания)

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

### Task 16 (C6): Инспектор выделенной живой карточки задачи

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

### Task 17 (C7) (P2, только если C1–C6 зелёные к 08:00 — R18, R24): «Решение» — вариант заметки

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
