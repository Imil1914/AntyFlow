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
