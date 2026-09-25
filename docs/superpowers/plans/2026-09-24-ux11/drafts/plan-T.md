# UX1.1 · Часть T — экран «Задачи» (линия T): план реализации

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

### Task T1: Строки и группы списка (плотность, плейсхолдер, peek, «Отменена», русские подписи)

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

### Task T2: Шапка «Задач»: счётчик, «Список/Доска», «Новая задача · N I», шкала спринта

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

### Task T3: Данные строки: «Материалы» (PR + вложения/ссылки) и метка «⊣ ROBOT-12»

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

### Task T4: Колонка куратора «Требует внимания»

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

### Task T5: Компактная плотность, быстрое добавление, стражи линии и финальная проверка

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
