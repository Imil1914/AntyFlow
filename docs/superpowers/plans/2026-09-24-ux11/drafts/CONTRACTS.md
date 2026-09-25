# UX1.1 — общие контракты для трёх частей плана (F, T, C)

Этот файл фиксирует имена и границы, которые нужны всем частям плана до того, как они написаны.
Отклоняться нельзя; если контракт не подходит — зафиксировать в `drafts/plan-<part>-needs.md`, а не менять молча.

## 0. Порядок исполнения и владение файлами

- **Фаза F (фундамент и оболочка)** выполняется первой и последовательно. Только после неё стартуют две
  параллельные линии: **T (Задачи)** и **C (Холст)**. Линии работают одновременно в одном рабочем дереве,
  поэтому пересекаться по файлам **нельзя**.
- Владение (пути относительно `plane-fork/`):
  - **F**: `apps/web/vite.config.ts`, `turbo.json`, `.env.example`, `apps/web/app/root.tsx`,
    `packages/ppm-brand/**` (кроме двух модулей переводов линий, см. §3), `packages/tailwind-config/**`,
    `apps/web/styles/**` (кроме `apps/web/styles/ppm-v2/tasks.css`), `apps/web/core/lib/ppm-design.ts`,
    оболочка: `apps/web/core/components/sidebar/**`, `apps/web/core/components/navigation/**`,
    `apps/web/core/components/ppm-shell/**`, `apps/web/core/components/workspace/sidebar/**`,
    страница «Профиль → Предпочтения» (`apps/web/core/components/profile/**`, `.../settings/account/**` по месту),
    `@plane/propel`/`@plane/ui` — только если без этого не обойтись (радиусы/тени поповеров, толщина иконок).
  - **T**: `apps/web/core/components/issues/**`, `apps/web/core/components/ppm-tasks/**` (новая папка),
    `apps/web/app/**/projects/**/issues/**` и `project-layout-root.tsx` (колонка куратора),
    `apps/web/styles/ppm-v2/tasks.css`, `packages/ppm-brand/src/translations/ux11-tasks.ts`,
    тесты в `apps/web/tests/ppm-tasks/**` (или рядом с кодом, по принятому в репо шаблону).
  - **C**: `apps/web/core/components/ppm-canvas/**` (включая новый `canvas-v2.css`, импортируемый в
    `editor.tsx` рядом с `canvas.css`), `packages/ppm-canvas/**`, `packages/ppm-brand/src/translations/ux11-canvas.ts`,
    тесты холста.
  - Файл нужен двум линиям → он принадлежит F, и F делает правку заранее (перечислить в своей части).
- Сборка пакетов (`@ppm/brand`, `@ppm/canvas`, …) — только через
  `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pkg-build.sh <pkg-dir>` (глобальная блокировка: две линии
  могут собирать одновременно). Пакеты web получает из `dist`.
- Перед первой правкой любого файла: `docs/superpowers/plans/2026-09-24-ux11/tools/ux11-pre.sh <путь от plane-fork>`.
- Коммитов нет. Никаких `git add/commit/stash/reset/checkout`. Снимки делает контроллер (`tools/ux11-snap.sh`).
- Dev-сервер владельца (:3000) не перезапускать и второй не запускать. Правка `vite.config.ts` сама перезапустит
  Vite — это допустимо (только в фазе F).

## 1. Флаг и режим дизайна

- Переменная окружения `PPM_DESIGN_V2`: `0 | preview | 1`, **по умолчанию `1`** (рулинг R1).
  Прокидывается как остальные PPM-флаги: `vite.config.ts` define, `turbo.json` `globalEnv`, `.env.example`.
- `@ppm/brand` (F добавляет):
  - `export const PPM_DESIGN_STORAGE_KEY = "ppm_design";`
  - `export const PPM_DENSITY_STORAGE_KEY = "ppm_density";`
  - `export type TPpmDesign = "v1" | "v2";` `export type TPpmDensity = "comfortable" | "compact";`
  - `export function resolvePpmDesign(designValue: string | undefined, brandValue: string | undefined, stored: string | null): TPpmDesign`
    — бренд выключен → `v1`; `0/false/off/no/disabled` → `v1`; `preview` → `stored === "v2" ? "v2" : "v1"`;
    иначе (`1`/пусто) → `stored === "v1" ? "v1" : "v2"`.
  - `export function resolvePpmDensity(stored: string | null): TPpmDensity` — `"compact"` только при точном
    совпадении, иначе `"comfortable"`.
- `<html>` получает `data-ppm-design="v1|v2"` и `data-ppm-density="comfortable|compact"` **до первой отрисовки**
  (инлайн-скрипт в `root.tsx` читает localStorage в `try/catch`; тот же алгоритм, что в `resolvePpmDesign`).
- Web-хелпер `apps/web/core/lib/ppm-design.ts` (F):
  - `export function isPpmDesignV2(): boolean` — `document.documentElement.dataset.ppmDesign === "v2"`
    (на сервере/в тестах без DOM — через `resolvePpmDesign(process.env.PPM_DESIGN_V2, process.env.PPM_BRAND_ENABLED, null)`).
  - `export function usePpmDesignV2(): boolean` — то же значение, стабильно в пределах загрузки страницы.
  - `export function getPpmDensity(): TPpmDensity`, `export function setPpmDensity(d: TPpmDensity): void`
    (пишет localStorage + атрибут `<html>` + событие `ppm:density-change`), `export function usePpmDensity(): TPpmDensity`.
- TSX-изменения линий T и C гейтятся `usePpmDesignV2()`/`isPpmDesignV2()`. При `v1` — прежняя разметка и поведение
  волны 0, байт-в-байт где возможно.

## 2. CSS: область действия, токены, плотность, утилиты

- Весь CSS волны 1 — под `:where(html[data-ppm-design="v2"])` (специфичность не растёт). Никаких правок
  существующих правил вне этого скоупа, кроме подключения файлов.
- F подключает в `apps/web/styles/globals.css` (после `@ppm/brand/tokens.css`) файлы v2: свои (токены/система/оболочка)
  и **пустой** `apps/web/styles/ppm-v2/tasks.css` для линии T. Линия C подключает свой `canvas-v2.css` сама в `editor.tsx`.
- Tailwind 4 custom variants (F, в CSS, который обрабатывает Tailwind):
  `@custom-variant ppm-v2 (&:where([data-ppm-design="v2"], [data-ppm-design="v2"] *));`
  `@custom-variant ppm-compact (&:where([data-ppm-design="v2"][data-ppm-density="compact"], [data-ppm-design="v2"][data-ppm-density="compact"] *));`
- Токены цвета/типографики/плотности/радиусов — **имена и значения из `drafts/TOKENS.md`** (и `drafts/tokens.mjs`).
  Роли называются `--ppm-color-<role>`; плотность — `--ppm-row-height`, `--ppm-group-row-height`,
  `--ppm-table-head-height`, `--ppm-sidebar-item-height`, `--ppm-topbar-height`, `--ppm-page-header-height`,
  `--ppm-control-height`, `--ppm-control-height-sm`, `--ppm-page-padding-x`, `--ppm-cell-gap`,
  `--ppm-font-size-content`; сужение — `--ppm-font-stretch-narrow: 85%`. Если в TOKENS.md имя отличается — прав
  TOKENS.md; F публикует итоговую таблицу имён в своей части плана.
- Типографика: утилиты `@utility ppm-text-<role>` (не `text-*`: `cn()`/twMerge выбрасывает незнакомые `text-*`).
- Каждый `var()` в правилах v2 — с фолбэком на значение волны 0 (ловушка IACVT).
- Строки списков: и строка, и плейсхолдер виртуализации берут высоту из `--ppm-row-height` (T).
- Шрифты (F): IBM Plex Sans с осью ширины (`@fontsource-variable/ibm-plex-sans/wdth.css`, пакет уже установлен),
  IBM Plex Mono 400/500 (`@fontsource/ibm-plex-mono`, уже установлен) вместо JetBrains Mono под v2; preload Plex вместо
  Inter под брендом. Сетевых запросов не добавлять.

## 3. Переводы

- F создаёт `packages/ppm-brand/src/translations/ux11-system.ts`, `ux11-tasks.ts`, `ux11-canvas.ts`, каждый:
  `export const UX11_<PART>_TRANSLATIONS = { en: { … }, ru: { … } } as const;` (en и ru с одинаковыми ключами —
  тест паритета), и вливает их в `PPM_TRANSLATIONS` (`en: { …, ...UX11_SYSTEM_TRANSLATIONS.en, ...UX11_TASKS_TRANSLATIONS.en, ...UX11_CANVAS_TRANSLATIONS.en }`, так же `ru`).
  Модули T и C F создаёт пустыми (`{ en: {}, ru: {} }`); дальше их правят только линии.
- Префиксы ключей: система/оболочка — `ux.*`, `density.*`; Задачи — `tasks.*` (новые, не ломая существующие);
  Холст — `canvas.*` (новые). Строки — по-русски, в тоне PPM, без «ИИ» в 1.0.
- После правки модуля — пересобрать `@ppm/brand` через `ux11-pkg-build.sh ppm-brand`.

## 4. Проверки (базовая линия после волны 0 — не ухудшать)

- web vitest: 184/184; `@ppm/brand`: 41/41 (+audit); `@ppm/canvas`: 38/38 (+audit, 1 старая tsc-ошибка
  `src/index.ts(1803,7) TS2322` в пакете); web `tsc`: 0; oxlint `ppm-*`: 0; корень `npm test`: 653/653
  (13 допущенных диагностик); i18n `sync-check --ci`: 18 × 3837; аудит tailwind-классов: PASS.
- Линии T и C запускают свои тесты и web `tsc`, фильтруя вывод по своим путям (другая линия может быть
  посреди правки). Полный прогон — в финальной фазе.
- Формат: только точечно `../../node_modules/.bin/oxfmt <файлы>`.

## 5. Честные данные (рулинги R6–R9, R11, R17)

- «Материалы» в строке задачи: PR — номер из связей Git; материалы — вложения + ссылки задачи. Без состояний PR и
  проверок.
- «Ждёт проверки» — статус группы `started` с именем `/провер|review/i`; нет — секции нет.
- «Недавно изменённые» — топ-5 задач по `updated_at` с автором `updated_by`, без описания изменения.
- Сочетание создания задачи — подсказка «N I» (последовательность); новых сочетаний нет.
- Русские имена только для точных дефолтных статусов Plane (отображение, данные не меняются).
- «изменился после поиска · открыть» — только при совпадении с живой карточкой на доске и другой версией.
