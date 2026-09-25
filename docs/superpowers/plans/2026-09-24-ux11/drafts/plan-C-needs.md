# UX1.1 — что линии C (Холст) нужно от фазы F

Линия C правит только `apps/web/core/components/ppm-canvas/**`, `packages/ppm-canvas/**`,
`packages/ppm-brand/src/translations/ux11-canvas.ts` и тесты холста. Всё ниже — файлы F; F делает эти правки до старта
линии C (или подтверждает, что они уже есть по CONTRACTS.md). Пути — от `plane-fork/`.

## 1. Аудит Tailwind-классов видит `canvas-v2.css` (обязательно)

Линия C вводит BEM-классы (`ppm-semantic-*`, `ppm-live-card*`, `ppm-found-card*`, `ppm-citation-chip*`,
`ppm-canvas-inspector*`, `ppm-canvas-statusline*`, `ppm-canvas-zoom*`, `ppm-canvas-section__count`,
`ppm-canvas-node__type*`, `ppm-decision__*`), определённые только в новом
`apps/web/core/components/ppm-canvas/canvas-v2.css`. Без записи ниже `audit-tailwind-classes.mjs` сочтёт их
неизвестными.

Файл: `packages/ppm-brand/scripts/audit-tailwind-classes.mjs`, массив `customCssFiles` (`:26-33`). Было:
```js
const customCssFiles = [
  "apps/web/core/components/ppm-canvas/canvas.css",
  "apps/web/styles/globals.css",
```
Стало:
```js
const customCssFiles = [
  "apps/web/core/components/ppm-canvas/canvas.css",
  "apps/web/core/components/ppm-canvas/canvas-v2.css",
  "apps/web/styles/globals.css",
```
Чтение уже защищено `existsSync` (`:73-76`), поэтому запись можно добавить до того, как C создаст файл.

## 2. Токены, которые линия C потребляет (имена — из TOKENS.md; везде стоят фолбэки на роли волны 0)

F определяет их в `packages/ppm-brand/src/tokens.css` под v2 (обе темы; плотностные — в «Удобной» и «Компактной»):

- Цвет, TOKENS §1: `--ppm-color-surface-1`, `--ppm-color-layer-1`, `--ppm-color-layer-1-hover`, `--ppm-color-border`,
  `--ppm-color-border-control`, `--ppm-color-text`, `--ppm-color-text-secondary`, `--ppm-color-text-muted`,
  `--ppm-color-icon-subtle`, `--ppm-color-accent`, `--ppm-color-accent-text`, `--ppm-color-on-accent`,
  `--ppm-color-selection`, `--ppm-color-selection-bg`, `--ppm-color-focus`, `--ppm-color-danger-text`,
  `--ppm-color-danger-line`, `--ppm-color-success`, `--ppm-type-task`, `--ppm-type-doc`, `--ppm-type-file`,
  `--ppm-type-code`, `--ppm-type-decision`.
- Группа «Холст», TOKENS §1: `--ppm-color-board`, `--ppm-color-section-tick`, `--ppm-color-link`,
  `--ppm-color-link-emphasis`, `--ppm-color-card-live`, `--ppm-color-card-own`, `--ppm-color-card-found-border`
  (`--ppm-color-board-grid`, `--ppm-color-link-visual` линия C в волне 1 не использует).
- Форма, TOKENS §6: `--ppm-radius-xs` (4 px), `--ppm-radius-sm` (6 px), `--ppm-radius-md` (8 px), `--ppm-radius-full`
  (999 px), `--ppm-shadow-popover`, `--ppm-focus-ring`.
- Типографика, TOKENS §4: `--ppm-font-mono` (IBM Plex Mono), `--ppm-font-stretch-narrow: 85%`.
- Плотность, TOKENS §5: `--ppm-page-header-height` (52/44), `--ppm-control-height` (32/28),
  `--ppm-control-height-sm` (28/24).
- Размеры Холста, TOKENS §11 (просьба определить и их — иначе строка статуса в «Компактной» не станет 28 px):
  `--ppm-canvas-status-height` (32/28), `--ppm-inspector-width` (304 px), `--ppm-canvas-overlay-inset` (16 px),
  `--ppm-canvas-card-footer-height` (36 px), `--ppm-link-width` (1.5px), `--ppm-link-width-emphasis` (2px),
  `--ppm-link-dash` (`4 3`), `--ppm-link-chip-height` (20 px).

Если какой-то токен F не определит, фолбэк линии C равен значению «Удобной» или роли волны 0 — вид не ломается.

Мост tldraw: выделение и основной цвет tldraw уже берутся из `--border-accent-strong`
(`canvas.css:2698-2708`, тест `canvas-css.test.ts:36-44`); F задаёт его значение в v2 (= `--ppm-color-selection`).
Фон доски линия C переключает сама (`--color-background: var(--ppm-color-board, …)` в `canvas-v2.css`).

## 3. Модуль переводов Холста

Как в CONTRACTS §3: F создаёт `packages/ppm-brand/src/translations/ux11-canvas.ts` ровно в виде
```ts
export const UX11_CANVAS_TRANSLATIONS = { en: {}, ru: {} } as const;
```
и вливает его **внутрь литералов** `PPM_TRANSLATIONS.en` / `.ru` (`...UX11_CANVAS_TRANSLATIONS.en` последним спредом),
чтобы `TPpmTranslationKey = keyof (typeof PPM_TRANSLATIONS)["en"]` (`packages/ppm-brand/src/index.ts:1629`) включал новые
ключи. Плюс тест паритета en/ru по трём модулям. Линия C добавляет только новые ключи `canvas.*`
(`canvas.status_sheet`, `canvas.zoom_*`, `canvas.edge_*`, `canvas.live_card*`, `canvas.open_*`, `canvas.kind_*`,
`canvas.section_objects_*`, `canvas.found_*`, `canvas.citation_*`, `canvas.inspector_*`, `canvas.unassigned`,
`canvas.decision_*`, `canvas.add_decision`) и **не переопределяет** существующие; «Предложение ИИ…» (R16) решено новым
ключом `canvas.edge_proposed`, поэтому `canvas.semantic_edges_proposed` в `index.ts` F не трогает.

## 4. Флаг дизайна

`apps/web/core/lib/ppm-design.ts` с `usePpmDesignV2()` и `isPpmDesignV2()` по CONTRACTS §1 (линия C импортирует
`usePpmDesignV2` из `@/lib/ppm-design` в `editor.tsx` и `workspace.tsx`), и атрибут `html[data-ppm-design]` до первой
отрисовки (`apps/web/app/root.tsx`) — весь `canvas-v2.css` висит на нём.

## 5. Шрифт с осью ширины

`@fontsource-variable/ibm-plex-sans/wdth.css` вместо `index.css` в `apps/web/app/root.tsx:38` (CONTRACTS §2). Линия C
сужает длинные заголовки живых карточек `font-stretch: var(--ppm-font-stretch-narrow, 85%)`; без оси `wdth` правило
молча не действует.

## 6. Ничего больше

- Линия C не меняет `packages/ppm-brand/src/index.ts`, `tokens.css`, `root.tsx`, i18n-локали и тесты
  `apps/web/tests/ppm-a11y/**` (кегль и скоуп `canvas-v2.css` проверяет её собственный
  `apps/web/tests/ppm-canvas/canvas-v2-css.test.ts`). По желанию F может добавить `canvas-v2.css` в
  `apps/web/tests/ppm-a11y/min-font-size.test.ts` — это не обязательно.
- Ключа `canvas.board_version` линия C не вводит (`brand.test.ts:142-165` остаётся зелёным; «Версии» в строке статуса
  нет по R5).
