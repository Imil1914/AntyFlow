# UX1.1 — Часть F: фундамент и оболочка (план реализации)

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

### Task F1: Флаг `PPM_DESIGN_V2`, режим дизайна и плотность до первой отрисовки

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

### Task F2: Токены v2: роли обеих тем, акцент, статусы, типы, Холст, форма, плотности, типографика

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

### Task F3: Шрифты, API Tailwind v2 и системные правила

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

### Task F4: Строки UX1.1, русские имена статусов, «Плотность» в «Профиль → Предпочтения»

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

### Task F5: Оболочка v2

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
