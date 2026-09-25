# UX1.1 · Потребности линии T к фазе F

Линия T (экран «Задачи») не трогает файлы F. Ниже — правки, которые F делает заранее (до старта T). T1 Step 0
проверяет каждую; без них T останавливается и сообщает контроллеру.

## N1. Русские имена дефолтных статусов — один помощник на всё приложение (R11)

Нужен двум линиям (T: подписи групп, колонка куратора; C: статус на карточке задачи Холста) и общему
`dropdowns/state/base.tsx` (ячейка статуса в строке, peek, фильтры) → владелец F.

1. `packages/ppm-brand/src/translations/ux11-system.ts` — добавить ключи (en = имя в данных, ru = отображение):
   ```ts
   // en
   "ux.state.backlog": "Backlog",
   "ux.state.unstarted": "Todo",
   "ux.state.started": "In Progress",
   "ux.state.completed": "Done",
   "ux.state.cancelled": "Cancelled",
   "ux.state.triage": "Triage",
   // ru
   "ux.state.backlog": "Бэклог",
   "ux.state.unstarted": "К работе",
   "ux.state.started": "В работе",
   "ux.state.completed": "Готово",
   "ux.state.cancelled": "Отменена",
   "ux.state.triage": "На разборе",
   ```
2. `apps/web/core/lib/ppm-design.ts` — экспорт (имена дефолтов — `apps/api/plane/db/models/state.py:24-62`):
   ```ts
   import { getPpmTranslation } from "@ppm/brand";
   import type { TPpmTranslationKey } from "@ppm/brand";

   const PPM_DEFAULT_STATE_NAMES: Record<string, string> = {
     backlog: "Backlog",
     unstarted: "Todo",
     started: "In Progress",
     completed: "Done",
     cancelled: "Cancelled",
     triage: "Triage",
   };

   /** Только отображение: русское имя для ТОЧНОГО дефолтного имени статуса своей группы; данные не меняются. */
   export function getPpmStateDisplayName(
     state: { name: string; group: string } | null | undefined,
     locale: string | undefined
   ): string | undefined {
     if (!state) return undefined;
     if (!isPpmDesignV2() || PPM_DEFAULT_STATE_NAMES[state.group] !== state.name) return state.name;
     return getPpmTranslation(locale, `ux.state.${state.group}` as TPpmTranslationKey);
   }
   ```
3. `apps/web/core/components/dropdowns/state/base.tsx` — под v2 показывать это имя (поиск по `query` оставить
   по данным + алиасу):
   - `:84` `const { t } = useTranslation();` → `const { t, currentLocale } = useTranslation();`
   - `:115` `query: \`${state?.name}\`,` → `query: \`${state?.name} ${getPpmStateDisplayName(state, currentLocale) ?? ""}\`,`
   - `:124` `{state?.name}` → `{getPpmStateDisplayName(state, currentLocale)}`
   - `:172` `tooltipContent={selectedState?.name ?? t("state")}` →
     `tooltipContent={getPpmStateDisplayName(selectedState, currentLocale) ?? t("state")}`
   - `:190` `{selectedState?.name ?? t("state")}` → `{getPpmStateDisplayName(selectedState, currentLocale) ?? t("state")}`
   - импорт: `import { getPpmStateDisplayName } from "@/lib/ppm-design";`
   В v1 помощник возвращает `state.name` — разметка прежняя.

## N2. Подключение `apps/web/styles/ppm-v2/tasks.css` без слоя

В `apps/web/styles/globals.css` — обычный `@import "./ppm-v2/tasks.css";` **без** `layer(...)`, после
`@import "@ppm/brand/tokens.css";` и после собственных v2-файлов F. Правила T перекрывают утилиты Tailwind
(`py-*`, `bg-*` строки списка) именно потому, что файл вне слоёв. Файл F создаёт пустым (допустим один
комментарий-заголовок); дальше его правит только T.

## N3. Аудит Tailwind-классов (`packages/ppm-brand/scripts/audit-tailwind-classes.mjs`)

- В `customCssFiles` (`:26-33`) добавить `"apps/web/styles/ppm-v2/tasks.css"` — иначе классы `ppm-task-*`,
  `ppm-sprint*`, `ppm-curator*`, `ppm-kbd`, `ppm-layout-switch*` из `core/components/ppm-tasks/**` уйдут в
  «notes».
- В `extraFiles` (`:16-24`) добавить Plane-файлы, которые правит T (риск «невидимого класса», notes/risk.md
  §1.5): `apps/web/core/components/issues/header.tsx`,
  `apps/web/core/components/issues/issue-layouts/list/block.tsx`, `…/list/block-root.tsx`, `…/list/list-group.tsx`,
  `…/list/headers/group-by-card.tsx`, `…/list/default.tsx`, `…/kanban/default.tsx`,
  `…/roots/project-layout-root.tsx`, `…/filters/header/layout-selection.tsx`, `…/quick-add/button/list.tsx`,
  `apps/web/app/(all)/[workspaceSlug]/(projects)/projects/(detail)/[projectId]/issues/(list)/layout.tsx`.
  Сейчас (волна 0) все их классы валидны; T добавляет только `ppm-task-*` (из N3, первый пункт), `ppm-text-*`
  (N4) и штатные утилиты.

## N4. Имена токенов и утилит, которые потребляет T

Подтвердить в итоговой таблице F (если имя иное — прав TOKENS.md, T поправит потребление):
- плотность (обе плотности под `html[data-ppm-design="v2"]`, компактная — `[data-ppm-density="compact"]`):
  `--ppm-row-height` 36/32, `--ppm-group-row-height` 36/32, `--ppm-sprint-strip-height` 60/52,
  `--ppm-page-header-height` 52/44, `--ppm-control-height-sm` 28/24, `--ppm-page-padding-x` 24/16;
- цвет: `--ppm-color-{text,text-secondary,text-muted,border,border-control,surface-1,layer-1-hover,layer-1-selected,selection,selection-bg,icon-subtle,danger-text,success,accent-active,accent-text,on-accent}`,
  `--ppm-status-review`, `--ppm-type-code`;
- шрифт/форма: `--ppm-font-mono`, `--ppm-font-stretch-narrow`, `--ppm-radius-{xs,sm,md}`;
- утилиты `@utility ppm-text-body` (14/20 · 13/20) и `@utility ppm-text-title-3` (14/20 600 · 13/20 600) в CSS,
  который видит Tailwind (для `className` в Plane-файлах T).

## N5. Контракты, которые T принимает как есть (без правок F сверх CONTRACTS)

- `usePpmDesignV2()`/`isPpmDesignV2()` в `apps/web/core/lib/ppm-design.ts`; в node-тестах без DOM не падают.
- `UX11_TASKS_TRANSLATIONS` влит в `PPM_TRANSLATIONS.en/ru`, ключи входят в `TPpmTranslationKey`; тест паритета
  en/ru и запрет терминов F покрывает и `tasks.*`.
- `apps/web/tests/ppm-a11y/min-font-size.test.ts` менять не нужно: для `core/components/ppm-tasks/**` и
  `tasks.css` у T свой страж `apps/web/tests/ppm-tasks/guards.test.ts`.
