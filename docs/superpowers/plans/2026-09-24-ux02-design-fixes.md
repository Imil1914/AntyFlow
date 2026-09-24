# UX0.2 — Исправления дизайна (волна 0): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Сделать все состояния PPM видимыми и читаемыми в обеих темах, убрать с основного пути английский текст и
следы Plane, разгрузить Холст и починить доступность. Существующий функционал не ломаем, данные не трогаем.

**Architecture:**
- Правки идут поверх текущего рабочего дерева `plane-fork` (в нём незакоммиченная работа I0.6 и других карточек).
- Каждое изменение гейтируется существующими флагами: `PPM_BRAND_ENABLED` для токенов, `PPM_SHELL_ENABLED` для
  словаря и оболочки, `PPM_ANTYFLOW_SHELL_ENABLED` для рабочего пространства Холста. Плюс новый флаг
  `PPM_PROJECT_ASK_ENABLED` (по умолчанию `0`) для агентов и генерации ответов.
- Коммитов нет. Перед первой правкой файла его копия сохраняется в `pre/`, в конце собирается отдельный патч UX0.2.

**Tech Stack:**
- plane-fork: React Router 7 + Vite 8, Tailwind 4.1.17, пакеты `@ppm/brand`, `@ppm/canvas`, `@plane/{i18n,propel,ui}`;
- тесты: vitest 4, tldraw 3.15.6, i18next 25 + ICU;
- линт и формат: oxlint и oxfmt.

**Spec:** [`docs/project-spec/Документация PPM/Intelligence-first/tasks/UX0.2 — Исправления дизайна: токены, доступность, Холст и словарь.md`](<../../project-spec/Документация PPM/Intelligence-first/tasks/UX0.2 — Исправления дизайна: токены, доступность, Холст и словарь.md>)

**Решения владельца (2026-09-24), обязательны:**
1. «Спросить проект» превращается в **«Найти в проекте»**. Остаются поиск по источникам с цитатами, состояние индекса
   с кнопкой «Переиндексировать» и память проекта. Агенты и генерация ответов скрыты при `PPM_PROJECT_ASK_ENABLED=0`
   (значение по умолчанию). При `=1` поведение прежнее.
2. Объём безопасный. Отложены отдельными карточками:
   - переделка вложенных кнопок в выпадающих списках Plane (`dropdowns/buttons.tsx`);
   - локализация `@plane/editor`, около 150 строк;
   - изменения стартовых данных и статусов по умолчанию в API;
   - `@plane/ui Collapsible`;
   - передача PPM-флагов в Docker.
3. **Без коммитов.** Патч UX0.2 собирается через `tools/ux02-diff.sh`.
4. Исполнение по шагам: на каждую задачу свежий исполнитель и свежий рецензент.

**Материалы плана** (в папке `2026-09-24-ux02/`):
- `notes/*.md` — подробная карта кода: строки, текущий код, предложенные правки. Ссылки вида `notes/canvas.md §2.5`;
- `drafts/` — проверенные черновики:
  - `tokens.proposed.css` — 0 провалов на 308 проверках контраста;
  - `brand-contract.test.proposed.ts`;
  - `proposed-audit-tailwind-classes.mjs`;
  - генератор оверлея `gen-overlay-proto2.mjs` и его вывод;
- `tools/ux02-pre.sh <paths…>` — сохранить исходник файла **до первой правки**. Обязательно для каждого файла;
- `tools/ux02-diff.sh > ux02.patch` — показать только изменения UX0.2.

## Global Constraints

- Рабочее дерево — единственный источник правды. Не трогать чужие незакоммиченные изменения сверх нужного задаче.
  Не выполнять `git checkout`, `git stash`, `git reset`, `git commit`.
- Перед первой правкой любого файла выполнить
  `docs/superpowers/plans/2026-09-24-ux02/tools/ux02-pre.sh <путь относительно plane-fork>`.
- Токены живут за `PPM_BRAND_ENABLED`, RU-оверлей и изменения оболочки — за `PPM_SHELL_ENABLED`, агенты и ответы — за
  `PPM_PROJECT_ASK_ENABLED` (по умолчанию `0`). При `0` возвращается upstream-вид без потери данных.
- Никаких новых сетевых запросов и телеметрии. Никаких изменений моделей данных, миграций и API.
- Горячие клавиши — только через `e.code`.
- UI-строки на русском, в тоне существующих текстов PPM. Новые строки идут в `@ppm/brand` `PPM_TRANSLATIONS`
  (en **и** ru) или в RU-оверлей. Не добавлять ключи в `packages/i18n/src/locales/*`: CI требует синхронности 19 локалей.
- Компоненты Propel и `@plane/ui`, где они есть. Лицензионную отметку tldraw не скрывать.
- Пакеты `@ppm/brand`, `@ppm/canvas`, `@plane/i18n`, `@plane/propel` и `@plane/ui` web получает из `dist`. После правки
  их `src` пересобрать: `cd plane-fork/packages/<pkg> && ./node_modules/.bin/tsdown --no-clean` (или по скрипту `build`
  пакета; `--no-clean` обязателен, пока работает dev-сервер).
- `pnpm` нет в PATH. Используются локальные бинарники: `./node_modules/.bin/*` и `../../node_modules/.bin/oxlint|oxfmt`.
- Базовое состояние до изменений (не ухудшать):
  - web vitest: 15 файлов, **97/97**;
  - `@ppm/brand`: **19/19** и audit;
  - `@ppm/canvas`: vitest **37/37** и audit;
  - web `tsc`: **0 ошибок**;
  - `@ppm/canvas` `tsc`: **1 старая** ошибка `src/index.ts(1803,7) TS2322`;
  - oxlint: 0 в `ppm-*`;
  - корень `npm test`: **653/653**, 13 допущенных диагностик;
  - i18n `sync-check --ci`: 18 × 3837.
- Изменённые файлы форматировать только точечно: `../../node_modules/.bin/oxfmt <файлы>`. Никогда не запускать по всему
  `apps/web`.

## Review Focus

1. **Флаги выключены** (`PPM_BRAND_ENABLED=0`, `PPM_SHELL_ENABLED=0`, `PPM_ANTYFLOW_SHELL_ENABLED=0`):
   upstream-вид и upstream-строки полностью возвращаются. В минимальном режиме Холста карточка статуса остаётся
   единственным индикатором сохранения. Тесты: задача 1 (все роли под `[data-ppm-brand="enabled"]`), задача 5
   (`statusPlacement` по умолчанию `card`), задача 9 (оверлей не применяется без shell).
2. **Язык и порядок загрузки:** пустой localStorage, сохранённый `ru` и переключение ru → en → ru. Оверлей не должен
   «загружать» namespace раньше базового bundle, иначе строки станут пустыми. Тест: задача 9 — модульный тест на
   i18next-экземпляре.
3. **Холст в состояниях восстановления, конфликта и слияния, читатель-гость:** все действия доступны, в DOM ровно один
   `.ppm-canvas-status__notice`, e2e-якоря целы. Тест: задача 5, `board-workspace-state` и статический тест разметки.
4. **Светлая тема и контрастные темы:** весь текст ≥ 4,5:1, фокус видим и отличается от выделения, основные и опасные
   кнопки читаются. Тест: задача 1, контрактный тест токенов.
5. **Узкие экраны 390 и 1024 и свёрнутый сайдбар:** профиль, помощь и входящие достижимы, рейка свёрнута, нет
   горизонтального переполнения. Тест: задача 13 (хелпер видимости переключателя) и задача 14 (гард кегля).
   Живая проверка — задача 17.

---

## Фаза A — токены и темы (раздел A карточки)

### Task 1: Контракт токенов PPM (OKLCH-роли, on-color/on-accent, фокус, контрастные темы)

**Files:**
- Modify: `plane-fork/packages/ppm-brand/src/tokens.css` (целиком, из `drafts/tokens.proposed.css`)
- Modify: `plane-fork/packages/ppm-brand/src/__tests__/brand.test.ts:135,141-143,150`
- Create: `plane-fork/packages/ppm-brand/src/__tests__/token-contract.test.ts` (из `drafts/brand-contract.test.proposed.ts`)
- Modify: `plane-fork/packages/tailwind-config/variables.css` (одна строка в `@theme inline` после `:845`)

**Interfaces:**
- Produces:
  - CSS-переменные `--txt-on-accent` (тёмные чернила для акцентных заливок), `--ppm-color-selection` и
    `--ppm-color-focus-gap`;
  - роли `--ppm-color-layer-{1,2,3}[-hover|-selected]` и утилита `text-on-accent`;
  - `--txt-on-color` снова светлый на цветных заливках, как в upstream.
- Потребители — задачи 2, 4, 8, 9.

- [ ] **Step 1: Сохранить исходники**
  `…/tools/ux02-pre.sh packages/ppm-brand/src/tokens.css packages/ppm-brand/src/__tests__/brand.test.ts packages/ppm-brand/src/__tests__/token-contract.test.ts packages/tailwind-config/variables.css`
- [ ] **Step 2: Написать контрактный тест (сначала он должен упасть)**
  - Скопировать `drafts/brand-contract.test.proposed.ts` в `packages/ppm-brand/src/__tests__/token-contract.test.ts`.
  - Тест читает `../tokens.css`, переводит OKLCH в sRGB и проверяет по каждой теме:
    - текстовые роли ≥ 4,5 на 12 поверхностях;
    - чернила на акценте ≥ 4,5, `on-color` на danger ≥ 4,5;
    - границы контролов ≥ 3;
    - hover и selected отличимы;
    - фокус ≥ 3 и не совпадает с выделением;
    - dark `layer-2 ≥ layer-1`;
    - `--border-*` только вне `-contrast`;
    - правило фокуса в `@layer utilities`.
  - Если в черновике есть абсолютный путь к scratch, заменить его на `new URL("../tokens.css", import.meta.url)`.
  - Дописать два теста:
    - (1) «бренд выключен = upstream»: каждый блок правил в `tokens.css`, где объявлены `--bg-`, `--txt-`,
      `--border-` или `--neutral-`, имеет селектор с `data-ppm-brand="enabled"`;
    - (2) блок шрифта редактора (Step 4b) есть и стоит **вне** `@layer`.
- [ ] **Step 3: Запустить и убедиться, что тест падает на текущем файле**
  - `cd plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/token-contract.test.ts`
  - Ожидание: FAIL (`rule not found` или провалы контраста).
- [ ] **Step 4: Заменить `tokens.css` черновиком и поправить старые проверки**
  - `cp docs/superpowers/plans/2026-09-24-ux02/drafts/tokens.proposed.css plane-fork/packages/ppm-brand/src/tokens.css`
  - В `brand.test.ts`:
    - `:135` → `--ppm-color-accent: oklch(0.7971 0.1339 211.53)`;
    - `:141-142` → `oklch(0.1687 0.0065 271.01)` и `oklch(0.9545 0.0046 258.32)`;
    - `:143` → `--border-accent-strong: var(--ppm-color-selection)`;
    - `:150` → `contrastRatio("#136782", "#FFFFFF")` `>= 4.5`.
  - Точные значения — в `notes/tokens.md §7`.
- [ ] **Step 4b: Шрифт редактора (раздел D3)**
  - В конец `tokens.css`, **вне** `@layer`: CSS редактора не лежит в слоях и выигрывает у `@layer base`.
    ```css
    html[data-ppm-brand="enabled"] .editor-container,
    html[data-ppm-brand="enabled"] .editor-container.sans-serif { --font-style: var(--ppm-font-sans); }
    html[data-ppm-brand="enabled"] .ProseMirror pre { font-family: var(--ppm-font-mono); }
    ```
- [ ] **Step 5: Добавить утилиту `text-on-accent`**
  - В `packages/tailwind-config/variables.css` внутри `@theme inline`, сразу после строки `--text-color-on-color: …`,
    добавить `--text-color-on-accent: var(--txt-on-accent, var(--txt-on-color));`.
  - Строка инертна без бренда: fallback даёт upstream-значение.
- [ ] **Step 6: Прогнать тесты пакета**
  - `cd plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && ./node_modules/.bin/tsc --noEmit`
  - Ожидание: vitest 19 + новые контрактные тесты зелёные; audit PASS; tsc без вывода.
- [ ] **Step 7: Проверить, что при выключенном бренде ничего не меняется**
  - `node docs/superpowers/plans/2026-09-24-ux02/drafts/verify-tokens.mjs` → `HARD FAILS: 0`.
  - В DevTools на `/about/brand-foundation` при `data-ppm-brand` ≠ `enabled` значения совпадают с upstream (см.
    `notes/tokens.md §9`).
- [ ] **Step 8: Checkpoint**
  - `…/tools/ux02-diff.sh > docs/superpowers/plans/2026-09-24-ux02/checkpoints/task-01.patch`

### Task 2: Потребители on-color, акцент и слои в PPM-экранах

**Files** (полный список строк — `notes/tokens.md §3.2, §8, §10`):
- Modify (обязательные, до них scoped-правило не дотягивается):
  - `apps/web/core/components/ppm-canvas/canvas.css` — 10 мест `var(--txt-on-color)` на акцентной заливке
    (`:411,514,609,681,2419,2565,2634,3177,3994,4490` — сверять по содержимому);
  - `packages/ui/src/form-fields/checkbox.tsx:55`;
  - `packages/propel/src/styles/react-day-picker.css:19`;
  - `packages/propel/src/avatar/avatar.tsx:117`.
- Modify (primary/accent → `text-on-accent`):
  - `packages/propel/src/button/helper.tsx:16`, `packages/propel/src/icon-button/helper.tsx:17`,
    `packages/propel/src/toolbar/toolbar.tsx:133`;
  - `packages/ui/src/button/helper.tsx:47`, `packages/ui/src/badge/helper.tsx:53`;
  - PPM-экраны: `ppm-git/route.tsx:511,1051,1235,1244,1958`, `ppm-vault/route.tsx:389,676,725,1137`,
    `ppm-shell/project-feature-page.tsx:115,144`, `ppm-canvas/route.tsx:121`, `ppm-canvas/minimal-workspace.tsx:48`,
    `app/(home)/about/ppm-guide/page.tsx:69`.
- **Не менять** опасные заливки: `helper.tsx:18`, `icon-button:19`, `toolbar:138`, `ui/button:77`, toast ERROR.
- Modify (ошибочное `text-on-color` на светлом фоне, → `text-secondary`):
  - `modules/analytics-sidebar/root.tsx:192`;
  - `project/settings/member-columns.tsx:69`;
  - `exporter/column.tsx:38`;
  - `profile/activity/activity-list.tsx:55,58,137` (здесь же заменить мёртвые `bg-gray-*` на `bg-layer-3`);
  - `packages/propel/src/toast/toast.tsx:96,102`.
- Modify (слои): в `ppm-vault/route.tsx` — `hover:bg-layer-1` → `hover:bg-layer-1-hover`,
  `data-[active|selected=true]:bg-layer-1` → `bg-layer-1-selected`; то же в `ppm-admin/admin-center.tsx:494-495` и
  `ppm-shell/project-feature-page.tsx:206`.

**Interfaces:**
- Consumes: `--txt-on-accent` и утилиту `text-on-accent` из задачи 1.
- Produces: основные (голубые) кнопки с тёмным текстом, опасные (красные) — со светлым.

- [ ] **Step 1:** `ux02-pre.sh` для каждого файла из списка.
- [ ] **Step 2: Написать падающий статический тест**
  - Файл `apps/web/tests/ppm-a11y/on-color-usage.test.ts`: читает перечисленные файлы как текст.
  - Проверки:
    - (а) в `canvas.css` нет `color: var(--txt-on-color)` в правилах с `background: var(--bg-accent-primary`;
    - (б) `button/helper.tsx` Propel: вариант `primary` содержит `text-on-accent`, `error-fill` — `text-on-color`.
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  describe("on-color usage", () => {
    it("keeps dark ink only on accent fills in canvas.css", () => {
      const css = read("../../core/components/ppm-canvas/canvas.css");
      const offenders = css.split("}").filter((rule) => /background[^;]*var\(--bg-accent-primary/.test(rule) && /color:\s*var\(--txt-on-color\)/.test(rule));
      expect(offenders).toEqual([]);
    });
    it("uses on-accent for primary and on-color for danger buttons", () => {
      const helper = read("../../../../packages/propel/src/button/helper.tsx");
      expect(helper).toMatch(/primary[^\n]*text-on-accent/);
      expect(helper).toMatch(/error-fill[^\n]*text-on-color/);
    });
  });
  ```
- [ ] **Step 3:** Запустить `cd plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-a11y/on-color-usage.test.ts`.
  Ожидание: FAIL.
- [ ] **Step 4: Внести замены по списку**
  - В CSS: `color: var(--txt-on-accent, var(--txt-on-color));`.
  - В `react-day-picker.css:19`: `--rdp-selected-color: var(--txt-on-accent, var(--text-color-on-color));`.
  - В `avatar.tsx:117`: `color: fallbackTextColor ?? "var(--txt-on-accent, var(--text-color-on-color))"`.
- [ ] **Step 5: Пересобрать пакеты**
  - `cd plane-fork/packages/ui && ./node_modules/.bin/tsdown --no-clean`
  - `cd ../propel && ./node_modules/.bin/tsdown --no-clean` (если скрипт `build` другой — выполнить его).
- [ ] **Step 6: Прогнать проверки**
  - `cd plane-fork/apps/web && ./node_modules/.bin/vitest run && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/ux02-web.tsbuildinfo`
  - Ожидание: 97 + новые тесты зелёные; tsc — 0 ошибок.
  - `../../node_modules/.bin/oxfmt <изменённые файлы>` и `../../node_modules/.bin/oxlint core/components/ppm-*` → 0.
- [ ] **Step 7: Визуальный smoke** в тёмной и светлой темах (задача 17 повторит):
  - основная кнопка и подтверждение удаления (AlertModalCore);
  - выбранный день в календаре, чекбоксы фильтров, тост загрузки;
  - дерево Хранилища (выбран и hover), вкладки админки.
- [ ] **Step 8: Checkpoint:** `ux02-diff.sh > checkpoints/task-02.patch`

## Фаза B — пропавшие классы (раздел B)

### Task 3: Аудит Tailwind-классов, замена мёртвых классов, @bprogress, баннер администратора

**Files:**
- Create: `plane-fork/packages/ppm-brand/scripts/audit-tailwind-classes.mjs` (из `drafts/proposed-audit-tailwind-classes.mjs`)
- Modify: `plane-fork/packages/ppm-brand/package.json` — скрипт `test`
- Modify: `ppm-vault/route.tsx` (19), `ppm-git/route.tsx` (54), `ppm-admin/admin-center.tsx` (5),
  `ppm-shell/project-feature-page.tsx` (4), `app/(home)/about/{ppm-guide,brand-foundation,open-source}/page.tsx`.
  Таблица замен — `notes/classes.md §3`.
- Modify (PPM-строки в upstream-файлах): `focus-visible:outline-accent-primary` → `focus-visible:outline-accent-strong` в
  `tab-navigation-overflow-menu.tsx:41,67,81,102`, `tab-navigation-visible-item.tsx:56`, `top-nav-power-k.tsx:255`,
  `workspace/sidebar/project-navigation.tsx:132`.
- Modify: `apps/web/tests/navigation/navigation-accessibility.test.tsx:166` — ожидать `focus-visible:outline-accent-strong`.
- Modify: `apps/web/styles/globals.css:178` → `--bprogress-color: var(--background-color-accent-primary) !important;`
- Modify: `apps/web/core/layouts/auth-layout/project-wrapper.tsx:171-181` — баннер в warning-палитре (раздел E.6):
  `border-b border-warning-subtle bg-warning-subtle px-4 py-2 text-12 text-warning-primary`, `role="status"`, иконка
  `text-icon-warning-primary`, ссылка `font-semibold text-warning-primary underline underline-offset-2`.

**Interfaces:**
- Produces: `node packages/ppm-brand/scripts/audit-tailwind-classes.mjs` (exit 0, когда нарушений нет) входит в
  `@ppm/brand test`. Задачи 4–17 не должны добавлять несуществующие классы.

- [ ] **Step 1:** `ux02-pre.sh` для всех файлов.
- [ ] **Step 2: Добавить аудит (сначала он должен упасть)**
  - Скопировать черновик в `packages/ppm-brand/scripts/audit-tailwind-classes.mjs`.
  - Вместо `PPM_AUDIT_ROOT` корень считать от файла: `new URL("../../..", import.meta.url)`.
  - Канарейки: `bg-danger-subtle`, `shadow-overlay-200`, `font-code` должны компилироваться; `bg-red-500`,
    `shadow-2xl`, `font-mono`, `text-15` — нет.
- [ ] **Step 3:** `cd plane-fork && node packages/ppm-brand/scripts/audit-tailwind-classes.mjs`.
  Ожидание: exit 1, около 98 нарушений.
- [ ] **Step 4: Заменить классы по таблице `notes/classes.md §3`**
  - Цвета статусов → `*-danger|success|warning-*`; `shadow-2xl` → `shadow-overlay-200`; `shadow-sm` →
    `shadow-raised-100`; `font-mono` → `font-code`; `text-15` → `text-16`; `text-3xl` → `text-28`;
    `tracking-widest` → `tracking-[0.12em]`; `focus:border-accent-primary` → `focus:border-accent-strong`.
  - Статус-точку в `ppm-git/route.tsx:1447-1456` собрать из статических классов: `bg-current` +
    `text-icon-{success|danger|warning}-primary` / `text-icon-tertiary`.
  - Инфо-блоки `git:544,1035` → `border-subtle bg-layer-1` (нейтрально, без лишнего голубого).
- [ ] **Step 5:** В `package.json` `@ppm/brand`:
  `"test": "vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs"`.
- [ ] **Step 6:** Поправить ожидание в `navigation-accessibility.test.tsx:166`, `globals.css:178` и баннер в
  `project-wrapper`.
- [ ] **Step 7: Прогнать проверки**
  - `node packages/ppm-brand/scripts/audit-tailwind-classes.mjs` → exit 0.
  - `cd packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs` → PASS.
  - `cd apps/web && ./node_modules/.bin/vitest run` → зелёные.
  - `oxfmt` на изменённые файлы (он пересортирует классы), web `tsc` → 0.
- [ ] **Step 8: Checkpoint** `task-03.patch`.

## Фаза C — Холст (раздел C)

### Task 4: «Найти в проекте»: режим только поиска, флаг агентов, переполнение панели

**Files:**
- Modify: `plane-fork/packages/ppm-canvas/src/index.ts` — после `isPpmAntyFlowShellEnabled` (≈`:2072-2075`)
- Modify: `plane-fork/packages/ppm-canvas/src/__tests__/canvas-node.test.ts` (импорт ≈`:20`, тест после ≈`:1128`)
- Modify: `plane-fork/apps/web/vite.config.ts:16-19`, `plane-fork/turbo.json` (`globalEnv`), `plane-fork/apps/web/.env.example`
- Modify: `apps/web/core/components/ppm-canvas/workspace.tsx` — кнопка ≈`:745-753`, рендер панели ≈`:1041-1055`,
  Esc ≈`:242-248`
- Modify: `apps/web/core/components/ppm-canvas/brain-panel.tsx` — проп `mode`, порядок блоков, один скроллер
- Modify: `apps/web/core/components/ppm-canvas/canvas.css` — панель `overflow-y:auto`; тост `z-index: 640` (≈`:2578`)
- Modify: `packages/ppm-brand/src/index.ts` — новые ключи en и ru
- Modify: `apps/web/e2e/ppm-canvas-collaboration.spec.ts:996,1001`, `apps/web/e2e/ppm-demo.spec.ts:473-510`
- Create: `apps/web/tests/ppm-canvas/brain-panel-mode.test.ts`

**Interfaces:**
- Produces:
  - `isPpmProjectAskEnabled(value: string | undefined): boolean` из `@ppm/canvas`. По умолчанию `false`; включают
    только `1`, `true`, `yes`, `on`, `enabled`;
  - `type TPpmBrainPanelMode = "search" | "full"`;
  - `PpmBrainPanel` получает проп `mode: TPpmBrainPanelMode`;
  - `getBrainPanelSections(mode)` — чистая функция в `brain-panel.tsx` (экспорт для теста), возвращает упорядоченный
    список секций.
- Ключи `@ppm/brand`: `project_search.title` — «Найти в проекте» / «Search project»;
  `project_search.placeholder` — «Что найти в задачах, Хранилище и коде…».

- [ ] **Step 1:** `ux02-pre.sh` для всех файлов.
- [ ] **Step 2: Тест флага (сначала падает)**
  ```ts
  it("keeps Ask Project agents hidden unless explicitly enabled", () => {
    for (const value of [undefined, "", "0", "off", "false", "maybe"]) expect(isPpmProjectAskEnabled(value)).toBe(false);
    for (const value of ["1", " TRUE ", "on", "yes", "enabled"]) expect(isPpmProjectAskEnabled(value)).toBe(true);
  });
  ```
  `cd packages/ppm-canvas && ./node_modules/.bin/vitest run` → FAIL (нет экспорта).
- [ ] **Step 3: Реализовать хелпер**
  ```ts
  /** Owner decision 2026-09-24: PPM 1.0 ships without generative answers and agents; the panel keeps non-AI search. */
  export function isPpmProjectAskEnabled(value: string | undefined): boolean {
    if (value === undefined) return false;
    return new Set(["1", "true", "yes", "on", "enabled"]).has(value.trim().toLowerCase());
  }
  ```
  `./node_modules/.bin/vitest run` → PASS. Затем `./node_modules/.bin/tsdown --no-clean`. Затем
  `./node_modules/.bin/tsc --noEmit` — только старая ошибка `1803`.
- [ ] **Step 4: Проводка флага**
  - `vite.config.ts` после строки `PPM_SHELL_ENABLED`:
    `viteEnv.PPM_PROJECT_ASK_ENABLED = process.env.PPM_PROJECT_ASK_ENABLED ?? "0";`
  - `turbo.json` `globalEnv` += `"PPM_PROJECT_ASK_ENABLED"`.
  - `.env.example` += комментарий «Агенты и генерация ответов на Холсте скрыты в PPM 1.0; 1 — показать» и
    `PPM_PROJECT_ASK_ENABLED="0"`.
- [ ] **Step 5: Тест секций панели (сначала падает)**
  ```ts
  import { describe, expect, it } from "vitest";
  import { getBrainPanelSections } from "@/components/ppm-canvas/brain-panel";
  describe("brain panel modes", () => {
    it("search mode shows only non-AI sections, question first", () => {
      expect(getBrainPanelSections("search")).toEqual(["query", "results", "index", "sources", "memory"]);
    });
    it("full mode keeps agents and answers after the question", () => {
      const s = getBrainPanelSections("full");
      expect(s[0]).toBe("query");
      expect(s).toEqual(expect.arrayContaining(["agents", "answer", "results", "index", "sources", "memory"]));
    });
  });
  ```
  Если импорт `brain-panel.tsx` в node-окружении тянет тяжёлое, вынести `getBrainPanelSections` и тип в
  `apps/web/core/components/ppm-canvas/brain-panel-mode.ts` и импортировать оттуда.
- [ ] **Step 6: Реализовать режим в `brain-panel.tsx`** (структура — `notes/canvas.md §1.2`)
  - Рендер секций идёт в порядке `getBrainPanelSections(mode)`.
  - В режиме `search`:
    - заголовок `ppmT("project_search.title")`, иконка `Search` из `lucide-react`;
    - нет плашки «Ответы без внешней ИИ-модели», нет четырёх агентов, нет кнопки «Спросить»;
    - `placeholder` = `project_search.placeholder`, основная кнопка — «Найти источники» (`submitSearch`);
    - `loadState` **не** запрашивает `answer-runs` и `agent-runs`, нет восстановления или поллинга этих запусков;
    - остаются `SourceList` с «Переиндексировать» и `MemoryList`;
    - «Добавить на холст» для результатов поиска (`saveSearchToCanvas`) остаётся.
  - Во всех режимах:
    - панель `display:flex; flex-direction:column; max-height: calc(100% - …)`;
    - тело `overflow-y:auto; min-height:0` — один скроллер, поле запроса первым;
    - `aria-modal={false}`, потому что пользователь выделяет контекст на холсте.
  - В режиме `full` все прежние блоки на месте, порядок: запрос → агенты → ответ/прогресс → результаты → индекс →
    источники → память.
- [ ] **Step 7: `workspace.tsx`**
  - `const PROJECT_ASK_MODE = isPpmProjectAskEnabled(process.env.PPM_PROJECT_ASK_ENABLED) ? "full" : "search";`
  - Кнопка в шапке:
    - в режиме `search` подпись `project_search.title` и иконка `Search`;
    - в режиме `full` — прежние (`ask_project.title`, `BrainCircuit`).
  - `<PpmBrainPanel mode={PROJECT_ASK_MODE} …/>`.
  - Esc закрывает панель только если фокус внутри `.ppm-brain-panel` или панель не содержит несохранённого черновика
    запроса. Любой другой Esc больше не размонтирует панель (`notes/canvas.md §1.1`).
  - Ноды прежних запусков в `shape.tsx` **не трогать**.
- [ ] **Step 8: CSS**
  - Тост поднять над панелью: `.ppm-canvas-toast { z-index: 640 }`.
  - Панели дать скролл тела.
  - Пастельные статусы панели — в задаче 8.
- [ ] **Step 9: E2E**
  - `ppm-canvas-collaboration.spec.ts:996`: имя кнопки `/Найти в проекте|Search project|Спросить проект|Ask project/`.
  - `ppm-demo.spec.ts:473-510`: `test.skip(process.env.PPM_PROJECT_ASK_ENABLED !== "1", "agents hidden in PPM 1.0")`.
- [ ] **Step 10: Прогнать проверки**
  - web vitest (все + новый), web `tsc`, oxlint `core/components/ppm-canvas` → 0, `oxfmt` на изменённые файлы.
  - `@ppm/brand`: `tsdown --no-clean` (новые ключи), vitest и audit.
- [ ] **Step 11: Живая проверка** на `localhost:3000/…/brain/`:
  - кнопка «Найти в проекте»;
  - запрос «датчик» даёт результаты;
  - в Network нет `answer-runs` и `agent-runs`.
- [ ] **Step 12: Checkpoint** `task-04.patch`.

### Task 5: Статус сохранения показывается один раз

**Files:**
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — проп `statusPlacement`, `CanvasControls` ≈`:2410-2610`,
  memo ≈`:1912-2002`, `<small>` «Версия» ≈`:2856-2858`
- Modify: `apps/web/core/components/ppm-canvas/workspace.tsx` — вкладка ≈`:704`, футер ≈`:1011-1017`, BoardSwitcher
  ≈`:1182-1184`, проп в ≈`:989-1005`
- Modify: `apps/web/core/components/ppm-canvas/board-workspace-state.ts` — новые чистые функции
- Modify: `apps/web/core/components/ppm-canvas/canvas.css` — `.ppm-canvas-status--alert`, `.ppm-canvas-board-info`,
  `.ppm-visually-hidden`, `@media ≤720px`
- Modify: `packages/ppm-brand/src/index.ts` — ключи `canvas.board_updated` («Изменена» / «Updated»),
  `canvas.board_info` («Доска») и `canvas.board_info_objects` («{count} объектов»)
- Create: `apps/web/tests/ppm-canvas/sync-status.test.ts`

**Interfaces:**
- Produces:
  - в `board-workspace-state.ts`:
    - `isBlockingCanvasStatus(status: TPpmCanvasSyncStatus | undefined, recoveryMode: boolean): boolean` — `true`
      при recovery или при статусе conflict, error или corrupt;
    - `shouldShowTabSyncDot(status: TPpmCanvasSyncStatus | undefined): boolean` — `true` для saving, error,
      conflict, corrupt;
    - `footerRoleLabelKey(canEdit: boolean, statusKey: string): "canvas.shared_badge" | "canvas.read_only_title" | null`;
  - `PpmCanvasEditor` получает проп `statusPlacement?: "card" | "footer"`, по умолчанию `"card"`.

- [ ] **Step 1:** `ux02-pre.sh` для файлов.
- [ ] **Step 2: Падающий тест**
  ```ts
  import { describe, expect, it } from "vitest";
  import { footerRoleLabelKey, isBlockingCanvasStatus, shouldShowTabSyncDot } from "@/components/ppm-canvas/board-workspace-state";
  describe("canvas sync status", () => {
    it("treats recovery, conflict, error and corrupt as blocking", () => {
      expect(isBlockingCanvasStatus("saved", false)).toBe(false);
      expect(isBlockingCanvasStatus("saving", false)).toBe(false);
      for (const s of ["conflict", "error", "corrupt"] as const) expect(isBlockingCanvasStatus(s, false)).toBe(true);
      expect(isBlockingCanvasStatus("saved", true)).toBe(true);
    });
    it("shows the tab dot only for problems and saving", () => {
      expect(shouldShowTabSyncDot("saved")).toBe(false);
      expect(shouldShowTabSyncDot(undefined)).toBe(false);
      for (const s of ["saving", "error", "conflict", "corrupt"] as const) expect(shouldShowTabSyncDot(s)).toBe(true);
    });
    it("never repeats the read-only label in the footer", () => {
      expect(footerRoleLabelKey(true, "canvas.sync_saved")).toBe("canvas.shared_badge");
      expect(footerRoleLabelKey(false, "canvas.read_only_title")).toBeNull();
      expect(footerRoleLabelKey(false, "canvas.sync_error")).toBe("canvas.read_only_title");
    });
  });
  ```
  Имена статусов сверить с фактическим типом в `board-workspace-state.ts` или `editor.tsx`.
  Запуск: `./node_modules/.bin/vitest run tests/ppm-canvas/sync-status.test.ts` → FAIL.
- [ ] **Step 3:** Реализовать три функции в `board-workspace-state.ts`. Тест → PASS.
- [ ] **Step 4: `editor.tsx`, схема из `notes/canvas.md §2.5`**
  - При `statusPlacement === "footer"`:
    - баннер `.ppm-canvas-status.ppm-canvas-status--alert` (`aria-live="polite"`) при
      `isBlockingCanvasStatus(...) || draftStorageUnavailable`. В него **дословно** переносятся блоки b, c, d, e, f, k
      с теми же подписями и классами;
    - в неблокирующем состоянии — ровно один `<p className="ppm-canvas-status__notice ppm-visually-hidden" data-status=…>`;
    - пилюля «Доска · N объектов» (`aria-expanded`, **без** `role="dialog"`) с блоками g, h, i, j, l. Её состояние
      `boardInfoOpen` хранится в `PpmCanvasEditor` и передаётся пропсом (добавить в deps memo).
      Принудительно раскрывать при активном импорте или ошибке импорта;
    - скрытый `<input type="file">` рендерится всегда.
  - При `"card"` — прежняя карточка без изменений.
- [ ] **Step 5: `workspace.tsx`**
  - `statusPlacement="footer"`.
  - Вкладка: `{shouldShowTabSyncDot(status) && <SyncDot …/>}`.
  - Футер: правая часть через `footerRoleLabelKey`, `null` не рендерится.
  - «Версия N» заменить на `ppmT("canvas.board_updated")` + `formatPpmTimeAgo(board.updated_at, currentLocale)` из
    `@/helpers/ppm-time-ago.helper`. Язык — из `useTranslation()` `@plane/i18n`.
- [ ] **Step 6: CSS**
  - Баннер сверху по центру: `top:.75rem; left:50%; transform:translateX(-50%); width:min(40rem, calc(100% - 1.5rem))`.
  - В `@media (max-width:720px)` баннер `display:grid`: сейчас восстановление на телефоне недоступно.
  - `.ppm-visually-hidden` — стандартный sr-only.
- [ ] **Step 7: Прогнать проверки**
  - web vitest, `tsc`, oxlint и oxfmt.
  - `@ppm/brand` `tsdown --no-clean` + vitest.
  - `grep -c 'ppm-canvas-status__notice' editor.tsx` — рендер условный, одновременно в DOM не более одного элемента.
- [ ] **Step 8: Живая проверка**
  - Сохранение: в футере «Все изменения сохранены», точки во вкладке нет.
  - DevTools Offline + правка → баннер «Изменения не сохранены» с «Повторить сохранение».
  - Вернуть Online → «Повторить».
  - Пилюля «Доска» раскрывает экспорт, импорт и объекты.
  - `PPM_ANTYFLOW_SHELL_ENABLED=0` не проверяется вживую (перезапуск чужого процесса). Вместо этого убедиться по коду, что
    `minimal-workspace.tsx` не передаёт проп.
- [ ] **Step 9: Checkpoint** `task-05.patch`.

### Task 6: Рейка — свёрнута на узких экранах, бренд PPM, `aria-pressed`, кегль подписей

**Files:**
- Modify: `workspace.tsx` — `useState` рейки ≈`:130`, эффект ≈`:144-152`, бренд ≈`:757-767`, «Холст» ≈`:769-775`,
  `RailButton` ≈`:1434-1469`
- Modify: `board-workspace-state.ts` — `export const CANVAS_RAIL_COLLAPSE_QUERY = "(max-width: 1279px)"`
- Modify: `editor.tsx` — проп `onToolChange?: (boardId: string, toolId: string) => void`; в `CanvasControls`
  `useValue(() => editor.getCurrentToolId())`
- Modify: `canvas.css` — `.ppm-canvas-rail__label` ≈`:2001-2008`, `.ppm-canvas-board-panel__list > small` ≈`:2277`,
  palette `kbd` ≈`:2459-2466`, footer ≈`:2127`, rail `kbd` ≈`:1935`, `.ppm-canvas-board-row__open small` ≈`:2342`,
  активный пункт ≈`:2039-2041`
- Modify: `packages/ppm-brand/src/index.ts:606-607` (en) и `:1345-1346` (ru) — «Свернуть/Развернуть панель инструментов»
- Create/extend: `apps/web/tests/ppm-canvas/rail.test.ts`

**Interfaces:**
- Produces: `CANVAS_RAIL_COLLAPSE_QUERY`; у `RailButton` проп `pressed?: boolean` → `aria-pressed` и `data-active`.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест**
  - `expect(CANVAS_RAIL_COLLAPSE_QUERY).toBe("(max-width: 1279px)")`.
  - Статический тест CSS: у `.ppm-canvas-rail__label` значение `font-size` ≥ `0.6875rem`, в `canvas.css` нет
    `font-size: 0.5625rem` для chrome-селекторов из списка.
  ```ts
  const css = readFileSync(new URL("../../core/components/ppm-canvas/canvas.css", import.meta.url), "utf8");
  for (const sel of [".ppm-canvas-rail__label", ".ppm-canvas-board-panel__list > small", ".ppm-canvas-workspace__status"]) {
    const block = css.slice(css.indexOf(sel + " {"), css.indexOf("}", css.indexOf(sel + " {")));
    const size = Number(/font-size:\s*([\d.]+)rem/.exec(block)?.[1] ?? "1");
    expect(size, sel).toBeGreaterThanOrEqual(0.6875);
  }
  ```
- [ ] **Step 3: Реализовать**
  - Начальное состояние рейки:
    `useState(() => typeof window === "undefined" || !window.matchMedia(CANVAS_RAIL_COLLAPSE_QUERY).matches)`.
    Тот же запрос использовать в эффекте. CSS-оверлей 980 px не трогать.
  - Бренд: `<img src={PPM_BRAND.assets.mark} alt="" aria-hidden="true" />` и `{railExpanded && <strong>PPM</strong>}`.
  - `pressed`: «Холст» — `pressed={tool === "select"}`, «Нарисовать визуальную связь» — `pressed={tool === "arrow"}`.
    Проп `active` убрать.
  - `toolByBoardId` хранится в workspace, как `selectionByBoardId`.
  - Индикатор активного пункта сделать через `::before` (не `box-shadow inset`), чтобы было видно фокус-кольцо.
  - **Не** добавлять `aria-label` развёрнутым кнопкам: e2e ищет `/Добавить заметку ⇧N/`.
- [ ] **Step 4: CSS-кегль**
  - Подписи 9 px → `0.6875rem; letter-spacing:.06em`.
  - Метаданные 10 px → `0.6875rem`.
- [ ] **Step 5: Прогнать проверки:** тесты, `tsc`, lint, fmt; `@ppm/brand` rebuild + test.
- [ ] **Step 6: Живая проверка**
  - 1440: рейка развёрнута, подпись PPM.
  - 1279 и 1024: свёрнута, по клику разворачивается.
  - Инструмент «стрелка» → `aria-pressed` у «Нарисовать связь».
  - Фокус Tab виден.
- [ ] **Step 7: Checkpoint** `task-06.patch`.

### Task 7: tldraw в теме PPM, слои, ⌘K, Esc «Смысловых связей», чистка CSS

**Files:**
- Modify: `editor.tsx`:
  - `PpmCanvasEditor`: `useTheme` из `next-themes` и `resolveGeneralTheme` из `@plane/utils`, синхронизация
    `editor.user.updateUserPreferences({ colorScheme })`;
  - состояние `semanticPanelOpen` поднять из `CanvasControls` (≈`:2246`) в `PpmCanvasEditor`;
  - `onKeyDown` на `<section class="ppm-semantic-edges">` (≈`:2970`).
- Modify: `canvas.css`:
  - блок tldraw-переменных ≈`:2648-2655`: `--color-primary`, `--color-selected` и `--color-selection-stroke` =
    `var(--border-accent-strong)`; `--color-selection-fill` =
    `color-mix(in srgb, var(--border-accent-strong) 16%, transparent)`;
  - шрифт → `var(--ppm-font-sans, var(--font-body, ui-sans-serif, system-ui, sans-serif))`, моно (≈`:3709`, `:3837`) →
    `var(--ppm-font-mono, var(--font-code, ui-monospace, monospace))`;
  - `.ppm-canvas-workspace { isolation: isolate }` (≈`:1-12`);
  - `@keyframes ppm-canvas-spin { to { transform: rotate(360deg); } }`;
  - фон `.ppm-canvas-shell` → `background: var(--bg-surface-1);` (≈`:2642-2645`);
  - удалить мёртвый CSS ≈`:2859-2918` и ≈`:4731-4741`, предварительно проверив grep, что классы нигде не используются.
- Modify: `workspace.tsx` — listener ⌘K ≈`:227-269`; `<kbd>` ≈`:742` → `formatCanvasCommandShortcut(platform)`
- Modify: `board-workspace-state.ts` —
  `formatCanvasCommandShortcut(platform: string): string` возвращает `"⌘K"` для mac, iPhone и iPad, иначе `"Ctrl K"`;
  `shouldCanvasOwnCommandShortcut(activeElement: Element | null, workspace: Element | null): boolean`.
- Create: `apps/web/tests/ppm-canvas/canvas-css.test.ts`,
  `apps/web/tests/ppm-canvas/shortcut.test.ts`

**Interfaces:**
- Produces: `formatCanvasCommandShortcut`, `shouldCanvasOwnCommandShortcut`.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающие тесты**
  ```ts
  // shortcut.test.ts
  expect(formatCanvasCommandShortcut("MacIntel")).toBe("⌘K");
  expect(formatCanvasCommandShortcut("iPhone")).toBe("⌘K");
  expect(formatCanvasCommandShortcut("Win32")).toBe("Ctrl K");
  expect(shouldCanvasOwnCommandShortcut(null, null)).toBe(true); // body/null focus → canvas palette
  // canvas-css.test.ts
  expect(css).toContain("@keyframes ppm-canvas-spin");
  expect(css).not.toContain("--color-accent-primary-rgb");
  expect(css).not.toMatch(/font-family:\s*Inter/);
  expect(css).toMatch(/\.ppm-canvas-workspace\s*\{[^}]*isolation:\s*isolate/);
  ```
  В `shouldCanvasOwnCommandShortcut` элементы передаются параметрами, чтобы тест обходился без DOM. Логика: `true`,
  если `activeElement` — `null` или `document.body`, либо находится внутри `workspace`. Для `body` используется
  проверка `activeElement.tagName === "BODY"`.
- [ ] **Step 3: Реализовать**
  - Тема tldraw:
    ```tsx
    const { resolvedTheme } = useTheme();
    const colorScheme = resolveGeneralTheme(resolvedTheme); // "light" | "dark" | "system"
    useEffect(() => {
      if (editor && editor.user.getUserPreferences().colorScheme !== colorScheme) editor.user.updateUserPreferences({ colorScheme });
    }, [editor, colorScheme]);
    ```
    Проп `inferDarkMode` не использовать: он следует настройке ОС.
  - ⌘K: в capture-listener выйти **без** `stopImmediatePropagation`, если `!shouldCanvasOwnCommandShortcut(...)`.
    Тогда Power-K Plane получает сочетание, когда фокус в оболочке Plane.
  - Esc на панели связей: `if (event.code === "Escape") { event.stopPropagation(); onClose(); }`. При открытии фокус
    ставится на первый контрол.
- [ ] **Step 4: Прогнать проверки:** тесты, `tsc`, lint, fmt.
- [ ] **Step 5: Живая проверка**
  - Тёмная тема: создать заметку и стрелку **на временной доске не создавать**. Проверить уже существующие элементы
    либо цвета выделения и сетки tldraw в DevTools (`.tl-theme__dark` на контейнере).
  - Power-K поверх шапки Холста затемняет всё.
  - Esc закрывает «Смысловые связи».
  - Подсказка `⌘K` на Mac.
- [ ] **Step 6: Checkpoint** `task-07.patch`.

### Task 8: Цвета нод и статусов на токенах, тёмные варианты, ярлык курсора

**Files:**
- Modify: `canvas.css`:
  - на `.ppm-canvas-shell` ввести `--ppm-canvas-node-ink/-fg/-paper/-yellow/-cyan/-green/-violet` с текущими
    светлыми значениями;
  - блок `[data-theme*="dark"] .ppm-canvas-shell` с тёмными вариантами: ink и fg = `--txt-primary`, paper =
    `--bg-surface-1`, цвета = `color-mix(in srgb, var(--ppm-node-*) 18%, var(--bg-surface-2))`;
  - механически заменить `rgb(15 23 42 / α)` на `color-mix(in srgb, var(--ppm-canvas-node-ink) α, transparent)` и
    `rgb(255 255 255 / α)` на paper в диапазонах ≈`:3188-3241, 3261-3330, 3346-3565, 3628-3842, 4169-4308`;
  - минимальная альфа текста `.68`;
  - пастели панели (≈`:634-1895`) → `var(--txt-success|warning|danger-primary)`;
  - кнопка применения → `var(--bg-success-primary)`;
  - точки присутствия и синхронизации → `var(--ppm-color-success|warning|danger)`;
  - архив → `var(--bg-danger-primary)`.
- Modify: `board-presence.tsx` — `presenceCursorColors(userId): { cursor: string; label: string }`
  (label = `hsl(h 80% 72%)`); `editor.tsx` ≈`:2132` выставляет `--ppm-presence-cursor-label`; CSS ≈`:2686-2700`
  `color:#0e0f12; background: var(--ppm-presence-cursor-label)`.
- Create: `apps/web/tests/ppm-canvas/presence-contrast.test.ts`

**Interfaces:**
- Produces: `presenceCursorColors`. Существующий `presenceCursorColor` оставить как обёртку, если на него есть ссылки.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест** — `apps/web/tests/ppm-canvas/presence-contrast.test.ts`, контраст ярлыка ≥ 4,5:1
  для всех оттенков 0–359:
  ```ts
  import { describe, expect, it } from "vitest";
  import { presenceCursorColorsForHue } from "@/components/ppm-canvas/board-presence";

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)) as [number, number, number];
  };
  const parseHsl = (value: string) => {
    const m = /hsl\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(value);
    if (!m) throw new Error(`not hsl: ${value}`);
    return hslToRgb(Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100);
  };
  const luminance = ([r, g, b]: [number, number, number]) => {
    const c = [r, g, b].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a: [number, number, number], b: [number, number, number]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  describe("presence cursor label", () => {
    it("keeps dark label text readable on every hue", () => {
      for (let hue = 0; hue < 360; hue++) {
        const { label } = presenceCursorColorsForHue(hue);
        expect(contrast(parseHsl(label), [14, 15, 18]), `hue ${hue}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  });
  ```
  Экспортировать `presenceCursorColorsForHue(hue: number): { cursor: string; label: string }`, где
  `cursor = hsl(h 72% 52%)` и `label = hsl(h 80% 72%)`. `presenceCursorColors(userId)` — обёртка, считающая hue из
  userId прежним способом.
- [ ] **Step 3: Реализовать и перенести цвета на токены** (список литералов — `notes/canvas.md §4.4`,
  `drafts/canvas-small-fonts.tsv` для соседних правок).
- [ ] **Step 4: Прогнать проверки:** тесты, lint, fmt; grep `rgb(15 23 42` в `canvas.css` → 0 вхождений внутри нод.
- [ ] **Step 5: Живая проверка** в тёмной и светлой темах:
  - существующие ноды, если есть (на доске «228» их нет — проверить по стилям в DevTools);
  - `/about/brand-foundation`.
- [ ] **Step 6: Checkpoint** `task-08.patch`.

## Фаза D — словарь и остатки Plane (раздел D)

### Task 9: API RU-оверлея в `@plane/i18n` и подключение через `@ppm/brand`

**Files:**
- Create: `plane-fork/packages/i18n/src/core/overlay.ts`
- Modify: `plane-fork/packages/i18n/src/index.ts` (экспорт `applyTranslationOverlay`)
- Create: `plane-fork/packages/i18n/scripts/check-overlay.ts`. В пакете нет vitest, поэтому это самостоятельный
  tsx-скрипт на `node:assert`, запуск `./node_modules/.bin/tsx scripts/check-overlay.ts`. Добавить скрипт
  `"check:overlay": "tsx scripts/check-overlay.ts"` в `package.json` пакета.
- Create: `plane-fork/packages/ppm-brand/src/locales/i18n-overlay.json` — начальное содержимое: 6 существующих
  негейтированных правок ru
- Modify: `plane-fork/packages/ppm-brand/package.json` `exports` **и** `tsdown.config.ts` `customExports` —
  подпуть `./i18n-overlay.json`
- Modify: `plane-fork/apps/web/core/components/ppm-shell/locale-bootstrap.tsx:29-44`
- Modify (вернуть к HEAD, перенеся содержимое в оверлей): `packages/i18n/src/locales/ru/{common.json:60,
  empty-state.json:171-178, navigation.json:10, page.json:47-73, stickies.json, workspace-settings.json:471}`.
  Точные ключи — `notes/vocab.md §1.2`. Взять `git show HEAD:<file>`, предварительно сделав `ux02-pre.sh`.

**Interfaces:**
- Produces:
  - `createTranslationOverlay(instance: i18n): { apply(overlay: TTranslationOverlay): void }` — внутренний, для теста;
  - `applyTranslationOverlay(overlay: TTranslationOverlay): void` — публичный, из `@plane/i18n`;
  - `type TTranslationOverlay = Record<string, Record<string, Record<string, unknown>>>` (lng → ns → дерево ключей);
  - `import("@ppm/brand/i18n-overlay.json")`.

- [ ] **Step 1:** `ux02-pre.sh` для всех файлов, включая 6 ru-JSON.
- [ ] **Step 2: Падающая проверка на реальном i18next** — `packages/i18n/scripts/check-overlay.ts`:
  ```ts
  import assert from "node:assert/strict";
  import i18n from "i18next";
  import ICU from "i18next-icu";
  import resourcesToBackend from "i18next-resources-to-backend";
  import { createTranslationOverlay } from "../src/core/overlay";

  const base = { ru: { common: { a: "рабочий элемент", b: "Оставить", n: "{count, plural, one {# элемент} other {# элементов}}" } } };
  async function fresh() {
    const inst = i18n.createInstance();
    inst.use(ICU).use(resourcesToBackend(async (lng: string, ns: string) => { await new Promise((r) => setTimeout(r, 5)); return (base as any)[lng]?.[ns] ?? {}; }));
    await inst.init({ lng: "ru", fallbackLng: "ru", ns: ["common"], defaultNS: "common", partialBundledLanguages: true, nsSeparator: false, interpolation: { escapeValue: false } });
    return inst;
  }
  // (1) overlay registered BEFORE the base bundle loads must not block the base load
  {
    const inst = i18n.createInstance();
    inst.use(ICU).use(resourcesToBackend(async (lng: string, ns: string) => { await new Promise((r) => setTimeout(r, 5)); return (base as any)[lng]?.[ns] ?? {}; }));
    createTranslationOverlay(inst).apply({ ru: { common: { a: "задача" } } });
    await inst.init({ lng: "ru", fallbackLng: "ru", ns: ["common"], defaultNS: "common", partialBundledLanguages: true, nsSeparator: false, interpolation: { escapeValue: false } });
    assert.equal(inst.t("a"), "задача");
    assert.equal(inst.t("b"), "Оставить", "base keys must survive");
  }
  // (2) overlay applied AFTER load replaces the value and clears ICU cache
  {
    const inst = await fresh();
    assert.equal(inst.t("n", { count: 5 }), "5 элементов");
    createTranslationOverlay(inst).apply({ ru: { common: { n: "{count, plural, one {# задача} few {# задачи} many {# задач} other {# задачи}}" } } });
    assert.equal(inst.t("n", { count: 5 }), "5 задач");
    assert.equal(inst.t("b"), "Оставить", "untouched keys stay");
  }
  console.log("overlay check: OK");
  ```
  Запуск: `cd plane-fork/packages/i18n && ./node_modules/.bin/tsx scripts/check-overlay.ts` → падает (нет модуля).
  Если tsx не резолвит `i18next-icu` из `scripts/`, запускать из корня пакета — так и указано выше.
- [ ] **Step 3: Реализовать `packages/i18n/src/core/overlay.ts`**
  (`i18nInstance` уже экспортирован из `./instance`)
  ```ts
  import type { i18n as I18nInstance } from "i18next";
  import { i18nInstance } from "./instance";

  export type TTranslationOverlay = Record<string, Record<string, Record<string, unknown>>>;

  export function createTranslationOverlay(instance: I18nInstance) {
    let pending: TTranslationOverlay = {};
    let subscribed = false;
    let applying = false;
    const applyLoaded = (lng: string, ns: string) => {
      const bundle = pending[lng]?.[ns];
      // Never create a bundle before the base one loaded: i18next would then skip the backend load.
      if (!bundle || !instance.hasResourceBundle(lng, ns)) return;
      applying = true;
      try {
        instance.addResourceBundle(lng, ns, bundle, true, true);
      } finally {
        applying = false;
      }
      (instance as unknown as { ICU?: { clearCache?: () => void } }).ICU?.clearCache?.();
    };
    return {
      apply(overlay: TTranslationOverlay) {
        pending = overlay;
        for (const lng of Object.keys(overlay)) for (const ns of Object.keys(overlay[lng])) applyLoaded(lng, ns);
        if (!subscribed) {
          subscribed = true;
          instance.store.on("added", (lng: string, ns: string) => {
            if (!applying) applyLoaded(lng, ns);
          });
        }
      },
    };
  }

  const defaultOverlay = createTranslationOverlay(i18nInstance);
  export const applyTranslationOverlay = (overlay: TTranslationOverlay): void => defaultOverlay.apply(overlay);
  ```
  В `src/index.ts` экспортировать только `applyTranslationOverlay` и `TTranslationOverlay`. Если ICU отдаёт
  закэшированный результат старого сообщения, тест (2) это поймает; тогда вызывать `clearCache` у экземпляра плагина,
  найденного через `instance.modules`/`services` (см. `notes/vocab.md §1.1`).
  Затем `cd packages/i18n && ./node_modules/.bin/tsdown --no-clean`, `sync-check --ci` → PASS.
- [ ] **Step 4: Подключение в `locale-bootstrap.tsx`** — только при `IS_PPM_SHELL_ENABLED`:
  ```tsx
  const overlayReady = IS_PPM_SHELL_ENABLED
    ? import("@ppm/brand/i18n-overlay.json").then((m) => applyTranslationOverlay(m.default)).catch((error) => console.error("[ppm] i18n overlay", error))
    : Promise.resolve();
  void overlayReady.then(() => setLanguage(initialLanguage)).finally(() => setIsReady(true));
  ```
- [ ] **Step 5:** Перенести 6 правок в оверлей и вернуть ru-файлы к HEAD. `sync-check --ci` → PASS.
  Затем `@ppm/brand` `tsdown --no-clean`: проверить, что подпуть есть в `dist` и в `package.json`.
- [ ] **Step 6: Прогнать проверки:** тесты i18n, web vitest, web `tsc`.
- [ ] **Step 7: Живая проверка**
  - Очистить localStorage → вход → «Мои заметки» по-русски.
  - Профиль: ru → en → ru, строки не пустые.
- [ ] **Step 8: Checkpoint** `task-09.patch`.

### Task 10: Содержимое оверлея — задача, спринт, направление, фильтр задач, документ, заявка

**Files:**
- Modify: `packages/ppm-brand/src/locales/i18n-overlay.json`
- Create: `packages/ppm-brand/scripts/draft-ru-overlay.mjs` (из `drafts/gen-overlay-proto2.mjs`; инструмент
  разработчика, в тесты не входит)
- Create: `packages/ppm-brand/src/__tests__/i18n-overlay.test.ts`

**Interfaces:**
- Consumes: `applyTranslationOverlay` из задачи 9.
- Produces: итоговый ru-интерфейс, в котором нет запрещённых терминов.

- [ ] **Step 1:** `ux02-pre.sh packages/ppm-brand/src/locales/i18n-overlay.json …`.
- [ ] **Step 2: Падающий тест** — `packages/ppm-brand/src/__tests__/i18n-overlay.test.ts`:
  ```ts
  import { readFileSync, readdirSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import overlay from "../locales/i18n-overlay.json";

  const RU_DIR = new URL("../../../i18n/src/locales/ru/", import.meta.url);
  const ALLOW = new Set(["work-item-type:formula.circular_reference", "empty-state:workspace_empty_state.dashboard.description"]);
  const BANNED = [/рабоч\p{L}*\s+элемент/iu, /(?<!\p{L})цикл(?!ическ)/iu, /(?<!\p{L})модул/iu, /представлени/iu, /(?<!\p{L})Plane(?!\p{L})/u];

  type Tree = { [k: string]: string | Tree };
  const flatten = (tree: Tree, prefix = ""): Record<string, string> =>
    Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      return typeof v === "string" ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
    }, {});
  const placeholders = (s: string) => (s.match(/\{\s*[\w.]+/g) ?? []).map((p) => p.replace(/[{\s]/g, "")).sort();
  const balanced = (s: string) => [...s].reduce((d, c) => (d < 0 ? d : c === "{" ? d + 1 : c === "}" ? d - 1 : d), 0) === 0;

  const upstream: Record<string, Record<string, string>> = Object.fromEntries(
    readdirSync(RU_DIR).filter((f) => f.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), flatten(JSON.parse(readFileSync(new URL(f, RU_DIR), "utf8")))]),
  );
  const ru = (overlay as { ru: Record<string, Tree> }).ru;

  describe("PPM RU overlay", () => {
    it("only overrides existing upstream string keys, keeping placeholders and ICU balanced", () => {
      for (const [ns, tree] of Object.entries(ru)) {
        for (const [key, value] of Object.entries(flatten(tree))) {
          const base = upstream[ns]?.[key];
          expect(typeof base, `${ns}:${key} must exist upstream`).toBe("string");
          expect(placeholders(value), `${ns}:${key} placeholders`).toEqual(placeholders(base!));
          expect(balanced(value), `${ns}:${key} braces`).toBe(true);
        }
      }
    });
    it("leaves no banned terms in the effective Russian UI", () => {
      const offenders: string[] = [];
      for (const [ns, keys] of Object.entries(upstream)) {
        const over = ru[ns] ? flatten(ru[ns]) : {};
        for (const [key, base] of Object.entries(keys)) {
          const value = over[key] ?? base;
          if (!ALLOW.has(`${ns}:${key}`) && BANNED.some((re) => re.test(value))) offenders.push(`${ns}:${key} = ${value}`);
        }
      }
      expect(offenders).toEqual([]);
    });
  });
  ```
  Нужен `"resolveJsonModule": true` в tsconfig пакета (проверить; при необходимости читать JSON через `readFileSync`).
  Запуск: `cd plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run src/__tests__/i18n-overlay.test.ts` →
  FAIL: запрещённые термины есть.
- [ ] **Step 3: Сгенерировать черновик**
  - `node packages/ppm-brand/scripts/draft-ru-overlay.mjs /tmp/ux02-overlay`: механические формы по таблицам склонений
    `notes/vocab.md §4.1–4.2`.
  - Слить результат в `i18n-overlay.json`.
- [ ] **Step 4: Ручная вычитка**
  - Около 115 помеченных строк (`drafts/ru-overlay.flagged.v2.json`, `drafts/manual-keys.txt`).
  - Согласование рода: задача — ж., направление — ср., документ — м.
  - Plural-метки `issue.label`, `cycle.label`, `module.label`, `view.label`: меняются только слова внутри `one` и
    `other`, новые формы не добавляются.
  - Intake → «заявка» (29 ключей) и `inbox.json`, кроме `inbox_issue.actions.move`.
  - «Входящие» остаётся только для уведомлений.
  - `common.work_structure` — «Структура работы», `common.execution` — «Выполнение», а также `common.administration`,
    `common.developer`, `common.your_profile`.
- [ ] **Step 5:** Тест → PASS. `@ppm/brand` `tsdown --no-clean`, vitest и audit → PASS. i18n `sync-check` → PASS.
- [ ] **Step 6: Живая проверка**
  - Задачи: «Новая задача», «Спринты» (крошка = меню), «Направления», «Фильтры задач», «Документы», «Заявки».
  - `<title>` вкладок.
- [ ] **Step 7: Checkpoint** `task-10.patch`.

### Task 11: Power-K — `e.code`, команды разделов PPM, русские синонимы, перевод заголовков

**Files** (подробности — `notes/vocab.md §5`):
- Modify: `apps/web/core/components/power-k/core/shortcut-handler.ts:21-22,74` — экспорт
  `getShortcutKey(e: Pick<KeyboardEvent, "code" | "key">): string`
- Modify: `power-k/ui/modal/wrapper.tsx:72`, `navigation/top-nav-power-k.tsx:146` → `e.code === "KeyK"`
- Modify: `power-k/config/navigation/commands.ts` (union ключей и записи) и `root.ts:16-50` — команды
  `nav_project_overview` (`go`), `nav_project_canvas` (`gb`), `nav_project_knowledge` (`gf`), `nav_project_code` (`gg`).
  Показывать только при PPM shell; холст — только при `isPpmCanvasEnabled`.
- Modify: `power-k/ui/renderer/command.tsx:60-68`, `power-k/ui/modal/command-item.tsx:32` — передать `keywords`;
  фильтры `wrapper.tsx:~148`, `top-nav-power-k.tsx:274` сопоставляют и по `[value, ...keywords]`
- Modify: `power-k/ui/modal/search-results-map.tsx:39-112` (`i18n_title`), `search-results.tsx:41`,
  `search-menu.tsx:92-98`, `command-item-shortcut-badge.tsx:95,110`, `shortcuts-root.tsx:67`,
  `Command.List` `label` (`top-nav-power-k.tsx:287`, `wrapper.tsx:163`)
- Modify: `power-k/config/help-commands.ts:33-71` — при PPM shell: `/about/ppm-guide`, `join_forum` скрыт,
  report_bug → `PPM_SOURCE_ATTRIBUTION.repository + "/issues/new"`
- Modify: `packages/ppm-brand/src/index.ts` — `PPM_COMMAND_KEYWORDS` и новые строки (en и ru); новые заголовки команд —
  в оверлей (en и ru)
- Create: `apps/web/tests/power-k/shortcut-handler.test.ts`

**Interfaces:**
- Produces: `getShortcutKey`; `PPM_COMMAND_KEYWORDS: Record<string, string[]>` из `@ppm/brand`.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест**
  ```ts
  import { getShortcutKey } from "@/components/power-k/core/shortcut-handler";
  it("maps physical keys so shortcuts work on the Russian layout", () => {
    expect(getShortcutKey({ code: "KeyG", key: "п" })).toBe("g");
    expect(getShortcutKey({ code: "KeyI", key: "ш" })).toBe("i");
    expect(getShortcutKey({ code: "Digit1", key: "1" })).toBe("1");
    expect(getShortcutKey({ code: "Slash", key: "." })).toBe("/");
    expect(getShortcutKey({ code: "Escape", key: "Escape" })).toBe("escape");
  });
  ```
  Если модуль при импорте обращается к `window`, добавить `vi.stubGlobal("window", { setTimeout, clearTimeout })`.
- [ ] **Step 3: Реализовать**
  - `KeyX` → `x`; `DigitN` → `N`; `Comma` → `,`, `Period` → `.`, `Slash` → `/`, `Quote` → `'`, `Semicolon` → `;`,
    `BracketLeft` → `[`, `BracketRight` → `]`, `Backslash` → `\\`, `Minus` → `-`, `Equal` → `=`, `Backquote` → `` ` ``,
    `Space` → `space`.
  - Остальное — `e.key.toLowerCase()`. Клавиши без символа (Escape, стрелки, Backspace) остаются через `key`.
  - Команды, синонимы и переводы — по `notes/vocab.md §5.2`.
  - Синонимы узкие и только при PPM shell: холст, хранилище, документы, код, спринт, направление, фильтр задач, задача,
    заявки.
- [ ] **Step 4: Прогнать проверки:** web vitest (включая `navigation-accessibility`), `tsc`, lint, fmt; `@ppm/brand`
  rebuild + test; brand audit с разрешёнными upstream-URL.
- [ ] **Step 5: Живая проверка**
  - `Ctrl/⌘ K` → «холст» находит «Перейти к Холсту».
  - В русской раскладке `g` затем `i` (физически «п» затем «ш») переходит к задачам.
  - Помощь → «Открыть руководство PPM».
- [ ] **Step 6: Checkpoint** `task-11.patch`.

### Task 12: Остатки английского и Plane на основном пути, Обзор, Заявки, тексты Git

**Files** (список file:line → замена — `notes/vocab.md §6–§9`):
- Заметки:
  - `stickies-list.tsx:124,129` — `assetPath` не передаётся при PPM, иллюстрация «stickies in Plane!!» убрана;
  - `stickies/header.tsx:35,55`, `stickies/page.tsx:14`, `stickies/modal/stickies.tsx:39,52` → `t("stickies.title")` и
    `t("stickies.add")`.
- Черновики: `drafts/page.tsx:14`.
- Настройки:
  - `settings/project/sidebar/header.tsx:51` → `ppmT("project.settings")`;
  - `control-section.tsx:63,74` → существующие ключи `project_settings.general.*.description`;
  - `project/form.tsx:327` → `t("common.project_id")`;
  - суффиксы `<title>` настроек переводятся существующими ключами.
- Крошки и `<title>`: при PPM shell берутся из `ppmT("project.*")`. Файлы: `cycles/(list)/header.tsx:50`,
  `cycles/(detail)/header.tsx:145`, `modules` `:54`/`:142`, `views` `:38`/`:131`, `pages` `:70`/`:74`,
  `projects/settings/intake/header.tsx:54`, `archives/issues/(detail)/header.tsx:58`; titles
  `modules/(list)/page.tsx:50`, `views/(list)/page.tsx:46`, `pages/(list)/page.tsx:52`.
- `resizable-sidebar.tsx:195,218,238,260` — aria-label через новые ключи `a11y.main_sidebar`, `a11y.resize_sidebar`,
  `a11y.sidebar_peek`.
- Обзор:
  - `ppm-shell/project-feature-page.tsx:100,107` → `status.available`;
  - `:81` → новый ключ `overview.tasks_description`;
  - в `ppm-brand/src/index.ts` переписать `overview.next_description` (ru/en), `knowledge.description` и eyebrow,
    `code.eyebrow`;
  - `PPM_PROJECT_NAVIGATION_CONTRACT.code` → `available` без stage (≈`:1529`) и обновить `brand.test.ts:122-129`.
- Заявки: `ppm-brand/src/index.ts` `project.intake` → «Заявки» (en «Requests»); `intake/header.tsx:54`; fallback
  «Plane» в `intake/page.tsx:70`.
- Git `ppm-git/route.tsx`:
  - переписать `:806-809`, `:823-826`, `:887`, `:1062` без упоминаний состояния сборки;
  - в списке `:968-974` отфильтровать блокеры `OWNER_DECISION_REQUIRED` и `APPLY_ENDPOINT_PENDING`;
  - шаг `:960` — «нажмите «Проверить права»» только при `canRefresh`, иначе «Попросите администратора проекта проверить
    права на этой странице.».
- Названия групп статусов (`profile/overview/state-distribution.tsx:72`, `workload.tsx:42`,
  `filters/state-group.tsx:55`) → `t("workspace_projects.state.${group}")` при PPM shell.
- Create: `apps/web/tests/ppm-shell/english-leftovers.test.ts` — статический скан перечисленных файлов. Литерал
  допустим только как upstream-ветка тернарника `isPpmShell ? … : "<literal>"` на той же строке.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест**
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const APP = new URL("../../app/", import.meta.url);
  const CORE = new URL("../../core/components/", import.meta.url);
  // [file (relative), literal] pairs; file paths verified against notes/vocab.md §6
  const CASES: Array<[URL, string]> = [
    [new URL("stickies/layout/stickies-list.tsx", CORE), "stickies in Plane"],
    [new URL("stickies/modal/stickies.tsx", CORE), "Add sticky"],
    [new URL("stickies/modal/stickies.tsx", CORE), "Your stickies"],
    [new URL("settings/project/sidebar/header.tsx", CORE), "Project settings"],
    [new URL("project/form.tsx", CORE), "Project ID"],
    [new URL("navigation/../sidebar/resizable-sidebar.tsx", CORE), "Main sidebar"],
    [new URL("navigation/../sidebar/resizable-sidebar.tsx", CORE), "Sidebar peek view"],
    [new URL("ppm-git/route.tsx", CORE), "в этой сборке"],
  ];
  const offending = (source: string, literal: string) =>
    source.split("\n").filter((line) => line.includes(literal) && !/isPpmShell\s*\?[^:]*:\s*["'`]/.test(line));

  describe("no English or Plane leftovers on the PPM path", () => {
    it.each(CASES)("%s has no bare %s", (file, literal) => {
      expect(offending(readFileSync(file, "utf8"), literal)).toEqual([]);
    });
  });
  ```
  Исполнитель сверяет фактические пути (например, где лежат `resizable-sidebar.tsx` и stickies-компоненты) через `rg`,
  дополняет `CASES` строками из `notes/vocab.md §6` (Cycles, Modules, Views, Pages, Intake, Workspace Draft) и при
  необходимости поправляет `URL`. Запуск → FAIL.
- [ ] **Step 3:** Внести замены. При выключенном shell upstream-строки должны остаться: паттерн
  `isPpmShell ? ppmT(…) : "<upstream>"`, где upstream-строка не переведена.
- [ ] **Step 4: Прогнать проверки**
  - web vitest, `tsc`, lint, fmt.
  - `@ppm/brand` rebuild + vitest (обновлённый `brand.test.ts:122-129`) + audit.
  - i18n `sync-check`.
- [ ] **Step 5: Живая проверка**
  - Заметки, Черновики, Настройки проекта.
  - Спринты, Направления, Фильтры, Документы, Заявки: крошка = меню = `<title>`.
  - Обзор: Хранилище и Код «Доступно».
  - Код: нет «в этой сборке».
- [ ] **Step 6: Checkpoint** `task-12.patch`.

## Фаза E — доступность и узкие экраны (раздел E)

### Task 13: Верхняя панель на узком экране, путь к навигации при свёрнутом сайдбаре, имена кнопок оболочки

**Files** (детали — `notes/a11y.md §1, §2, §4.2–4.5`):
- Modify: `apps/web/core/components/navigation/top-navigation-root.tsx:46-86`:
  - в корне `min-w-0 gap-1`;
  - колонка пространства `min-w-0 flex-1`;
  - обёртка `TopNavPowerK` — `hidden shrink-0 sm:block`;
  - `IconButton` поиска `sm:hidden` открывает `togglePowerKModal(true)` с `aria-label`
    `ppmT("navigation.open_command_search")`;
  - `TopNavPowerK` получает `max-w-[calc(100vw-2rem)]` (≈`top-nav-power-k.tsx:216,266`);
  - ссылка «Входящие» получает `ariaLabel`.
- Modify: `workspace/sidebar/help-section/root.tsx:41` — подпись PPM обёрнута в `<span className="hidden sm:inline">`.
- Create: `apps/web/helpers/ppm-navigation.helper.ts` — `shouldShowTopNavSidebarToggle({ isPpmShell, sidebarCollapsed,
  pathname, workspaceSlug }): boolean` возвращает `true` для PPM + свёрнутого сайдбара на `/:ws/notifications` и
  `/projects/:id/(overview|brain|knowledge|code)`.
- Modify: `top-navigation-root.tsx` — при `true` перед `WorkspaceMenuRoot` рендерится `<AppSidebarToggleButton/>`.
- Modify: `app/(all)/[workspaceSlug]/(projects)/_sidebar.tsx:45` → `if (isNotificationsPath && !isPpmShell) return null;`
- Modify: `sidebar/sidebar-toggle-button.tsx:18-26` — `aria-label` из существующих
  `aria_labels.projects_sidebar.expand_sidebar|collapse_sidebar`, `aria-expanded`.
- Modify: `workspace/sidebar/sidebar-wrapper.tsx:63-68` — `aria-label={t("customize_navigation")}`.
- Modify: `sidebar/sidebar-item.tsx` — опциональный `ariaLabel` и `aria-current="page"` у активной ссылки.
- Modify: `packages/ppm-brand/src/index.ts` — `navigation.open_command_search`, `navigation.command_results`,
  `global.inbox_unread` (en и ru).
- Create: `apps/web/tests/navigation/ppm-navigation.helper.test.ts`

**Interfaces:**
- Produces: `shouldShowTopNavSidebarToggle`.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест**
  ```ts
  import { shouldShowTopNavSidebarToggle as show } from "@/helpers/ppm-navigation.helper";
  const base = { isPpmShell: true, sidebarCollapsed: true, workspaceSlug: "228" };
  it("offers the sidebar toggle on PPM pages without an app header", () => {
    for (const p of ["/228/notifications/", "/228/projects/x/overview/", "/228/projects/x/brain/", "/228/projects/x/knowledge/", "/228/projects/x/code/"]) expect(show({ ...base, pathname: p })).toBe(true);
    expect(show({ ...base, pathname: "/228/projects/x/issues/" })).toBe(false);
    expect(show({ ...base, sidebarCollapsed: false, pathname: "/228/projects/x/code/" })).toBe(false);
    expect(show({ ...base, isPpmShell: false, pathname: "/228/projects/x/code/" })).toBe(false);
  });
  ```
- [ ] **Step 3:** Реализовать. `navigation-accessibility.test.tsx` должен остаться зелёным; если меняется разметка
  `TopNavPowerK`, обновить ожидания точечно.
- [ ] **Step 4: Прогнать проверки:** web vitest, `tsc`, lint, fmt; `@ppm/brand` rebuild + test.
- [ ] **Step 5: Живая проверка**
  - 390×844: иконка поиска открывает Power-K; «Входящие», «Помощь» и профиль видны, «Выйти» доступен.
  - ⌘B → Обзор, Хранилище, Код, Холст, Входящие: кнопка разворота видна и работает.
- [ ] **Step 6: Checkpoint** `task-13.patch`.

### Task 14: Минимальный кегль в экранах PPM и гард

**Files:**
- Modify:
  - `ppm-git/route.tsx`: `text-10` ×17 → `text-11` для метаданных, `text-12` для содержимого; `text-11`,
    использованный как содержимое, → `text-12`;
  - `ppm-vault/route.tsx`: `text-10` ×6;
  - `ppm-admin/admin-center.tsx`: `text-10` ×5;
  - `ppm-shell/project-feature-page.tsx`.
  - Разметка по строкам — `notes/a11y.md §3`.
- Modify: `canvas.css` — правила ноды < 0.6875rem → ≥ 0.6875rem (`drafts/canvas-small-fonts.tsv`). Фиксированные высоты
  поднять, где текст упирается: ≈`:4663` `height:1.55rem` → `1.75rem`, ≈`:4635` `line-height`. Chrome уже поднят в
  задаче 6. Правила `brain-panel` тоже поднять — они видимы в режиме поиска.
- Create: `apps/web/tests/ppm-a11y/min-font-size.test.ts`

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий гард**
  ```ts
  import { readFileSync, readdirSync, statSync } from "node:fs";
  import { join } from "node:path";
  const ROOT = new URL("../../core/components/", import.meta.url).pathname;
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : [p]; });
  it("has no text smaller than 11px in PPM screens", () => {
    const tsx = ["ppm-git", "ppm-vault", "ppm-admin", "ppm-shell", "ppm-canvas"].flatMap((d) => files(join(ROOT, d))).filter((f) => f.endsWith(".tsx"));
    const bad = tsx.flatMap((f) => readFileSync(f, "utf8").split("\n").map((l, i) => [f, i + 1, l] as const)).filter(([, , l]) => /\btext-(9|10)\b|text-\[(?:[0-9]|10)px\]/.test(l));
    expect(bad.map(([f, n]) => `${f}:${n}`)).toEqual([]);
    const css = readFileSync(join(ROOT, "ppm-canvas/canvas.css"), "utf8");
    const small = [...css.matchAll(/font-size:\s*([\d.]+)rem/g)].filter((m) => Number(m[1]) < 0.6875);
    expect(small.map((m) => m[0])).toEqual([]);
  });
  ```
- [ ] **Step 3:** Поднять размеры. Визуально проверить тесные места: чипы, бейджи, kbd, карточки нод.
- [ ] **Step 4: Прогнать проверки:** гард PASS, аудит классов PASS (`text-11` и `text-12` существуют), `tsc`, lint, fmt.
- [ ] **Step 5: Живая проверка:** Код, Хранилище, Админка при 1440 и 390 — ничего не обрезано.
- [ ] **Step 6: Checkpoint** `task-14.patch`.

### Task 15: Хранилище и Git — адаптивная сетка, ARIA дерева и вкладок, модалки, подтверждения PPM

**Files** (детали — `notes/a11y.md §5`):
- Create: `apps/web/helpers/ppm-vault-tree.helper.ts`:
  - `flattenVaultTree(tree, expanded: Set<string>): TFlatVaultNode[]`;
  - `getVaultTreeKeyAction(code: string, node: TFlatVaultNode): "next" | "prev" | "first" | "last" | "expand" | "collapse" | "parent" | "select" | null`.
- Create: `apps/web/core/components/ppm-shell/use-ppm-confirm.tsx` — `usePpmConfirm()` возвращает
  `{ confirm(opts): Promise<boolean>, confirmDialog: ReactNode }` поверх `AlertModalCore` с русскими подписями, варианты
  `danger` и `primary`.
- Modify: `ppm-vault/route.tsx`:
  - сетка `:445` → `grid-cols-1 grid-rows-[minmax(0,40%)_minmax(0,1fr)] md:grid-cols-[minmax(230px,300px)_minmax(0,1fr)] md:grid-rows-1`;
  - `aside` `border-b md:border-r md:border-b-0`;
  - дерево `:472`, `:1171-1201`: плоский список `role="treeitem"` с `aria-level`, `aria-selected`, `aria-expanded`,
    roving `tabIndex` и `onKeyDown` по `e.code`;
  - вкладки `:406-418`, `:1148-1169`: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, стрелки;
    панели `role="tabpanel"`;
  - `VaultDialog` `:1059-1145` → `ModalCore` (`@plane/ui`) с `Dialog.Title` (`@headlessui/react`), `autoFocus` на первом
    поле, `handleClose={saving ? undefined : onClose}`;
  - `confirm()` `:296` (в корзину, danger), `:327` (восстановить версию, primary) → `await confirm({...})`.
- Modify: `ppm-git/route.tsx` — `DialogFrame` `:1915-1934` → `ModalCore`; `confirm()` `:261`, `:274`, `:303` (danger).
- Modify: `packages/ppm-brand/src/index.ts` — тексты подтверждений (en и ru).
- Modify: `apps/web/e2e/ppm-demo.spec.ts:366-429` — дерево через `getByRole("treeitem", { name })`; устаревшее
  «Project Vault» заменить на «Хранилище проекта».
- Create: `apps/web/tests/ppm-vault/tree-navigation.test.ts`

**Interfaces:**
- Produces: `flattenVaultTree`, `getVaultTreeKeyAction`, `usePpmConfirm`.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест дерева**
  ```ts
  const tree = [{ id: "a", name: "Документы", kind: "folder", children: [{ id: "b", name: "ТЗ.md", kind: "file", children: [] }] }, { id: "c", name: "Схема.pdf", kind: "file", children: [] }];
  it("flattens expanded folders with levels", () => {
    expect(flattenVaultTree(tree, new Set(["a"])).map((n) => [n.id, n.level])).toEqual([["a", 1], ["b", 2], ["c", 1]]);
    expect(flattenVaultTree(tree, new Set()).map((n) => n.id)).toEqual(["a", "c"]);
  });
  it("maps keys by physical code", () => {
    const folder = flattenVaultTree(tree, new Set(["a"]))[0];
    expect(getVaultTreeKeyAction("ArrowDown", folder)).toBe("next");
    expect(getVaultTreeKeyAction("ArrowLeft", folder)).toBe("collapse");
    expect(getVaultTreeKeyAction("Enter", folder)).toBe("select");
    expect(getVaultTreeKeyAction("KeyQ", folder)).toBeNull();
  });
  ```
  Форму узлов сверить с реальным типом дерева в `ppm-vault/route.tsx`.
- [ ] **Step 3:** Реализовать хелперы, `usePpmConfirm` и правки маршрутов. По умолчанию все папки развёрнуты, поведение
  прежнее; шеврон сворачивает.
- [ ] **Step 4: Прогнать проверки:** web vitest, `tsc`, аудит классов, lint, fmt; `@ppm/brand` rebuild + test.
- [ ] **Step 5: Живая проверка**
  - Хранилище при 1440 и 390.
  - Клавиатура: стрелки, Home, End и Enter в дереве; стрелки во вкладках.
  - Диалог «Новая папка»: Esc закрывает, фокус возвращается. **Не создавать папку.**
  - Код: открыть и закрыть диалоги.
  - Подтверждения вызвать **только до окна** и отменить.
- [ ] **Step 6: Checkpoint** `task-15.patch`.

### Task 16: Имена иконок-кнопок на странице задачи (только на стороне приложения)

**Files** (`notes/a11y.md §4.1`):
- `issue-detail-quick-actions.tsx:151` → `aria-label={t("common.actions.copy_link")}`.
- `issue-detail.tsx:228-231` и quick actions комментариев, раскладки, спринтов, направлений и фильтров →
  `customButton={<Ellipsis className="size-4" aria-hidden />}`,
  `customButtonClassName={getIconButtonStyling("secondary","lg")}`, `ariaLabel={ppmT("a11y.more_actions")}`.
  Это заодно убирает кнопку внутри кнопки в `CustomMenu`.
- `subscription.tsx:84` — `aria-label` подписки.
- `sort-root.tsx:19` → `t("common.sort.asc|desc")`.
- `activity-filter.tsx` — иконка + `sr-only`.
- `lite-text/toolbar.tsx:114,155` и `lite-toolbar.tsx` → `aria-label` из `ppmT("a11y.editor.<key>")` + `aria-pressed`.
- `workspace-notifications options/root.tsx:58,70` — `aria-label` = текст подсказки.
- `layout-selection.tsx:38` → `aria-label={t(layout.i18n_title)}` + `aria-pressed`.
- Modify: `packages/ppm-brand/src/index.ts` — `a11y.more_actions`, `a11y.comment_actions`, `a11y.add_reaction`,
  `a11y.editor.{bold,italic,underline,strikethrough,bulleted-list,numbered-list,to-do-list,quote,code,image}`,
  `a11y.attach_image` (en и ru).
- **Не трогать:** `dropdowns/buttons.tsx`, `@plane/ui Collapsible`, Propel `emoji-reaction`. Это отложено.
- Create: `apps/web/tests/ppm-a11y/icon-button-names.test.ts` — статический скан перечисленных файлов.

- [ ] **Step 1:** `ux02-pre.sh`.
- [ ] **Step 2: Падающий тест**
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";

  const CORE = new URL("../../core/components/", import.meta.url);
  // Paths per notes/a11y.md §4.1 — the implementer verifies each with rg before running.
  const FILES = [
    "issues/issue-detail/issue-detail-quick-actions.tsx",
    "issues/issue-detail/subscription.tsx",
    "issues/issue-detail/issue-activity/sort-root.tsx",
    "issues/issue-detail/issue-activity/activity-filter.tsx",
    "issues/issue-layouts/layout-selection.tsx",
  ].map((f) => new URL(f, CORE));

  // An IconButton or icon-only <button> element (opening tag up to its first ">") must carry a name.
  const unnamed = (source: string) =>
    [...source.matchAll(/<(IconButton|button)\b[^>]*>/gs)]
      .map((m) => m[0])
      .filter((tag) => (tag.startsWith("<IconButton") || /icon/i.test(tag)) && !/aria-label=|ariaLabel=|aria-labelledby=/.test(tag));

  describe("icon-only buttons have accessible names", () => {
    it.each(FILES.map((u) => [u.pathname.split("/components/")[1], u] as const))("%s", (_name, url) => {
      expect(unnamed(readFileSync(url, "utf8"))).toEqual([]);
    });
  });
  ```
  Эвристика намеренно простая: сканируются только файлы из списка, где кнопки заведомо иконочные. Запуск → FAIL.
- [ ] **Step 3:** Реализовать.
- [ ] **Step 4: Прогнать проверки:** web vitest, `tsc`, lint, fmt; `@ppm/brand` rebuild + test.
- [ ] **Step 5: Живая проверка:** на `/228/browse/228-1/` скрипт
  `document.querySelectorAll('button:not([aria-label])')` с фильтром по пустому `innerText` даёт заметно меньше
  безымянных кнопок, чем исходные 29. Оставшиеся относятся только к отложенным компонентам — перечислить их в отчёте.
- [ ] **Step 6: Checkpoint** `task-16.patch`.

## Фаза F — итоговая проверка и документация

### Task 17: Полная проверка, живой прогон, детектор, документы

**Files:**
- Modify: `docs/project-spec/Документация PPM/CHANGELOG.md` — секция `## 2026-09-24 — UX0.2 волна 0: …` сверху.
- Modify: `docs/project-spec/Документация PPM/Intelligence-first/tasks/README.md` — строка UX0.2 в таблице UX/ADM,
  статус `review`.
- Modify: карточка UX0.2:
  - `status: review`;
  - раздел «Реализовано 2026-09-24» с результатами проверок и списком отложенного;
  - поправить устаревшие номера строк.
- Modify: `docs/ppm/antyflow-web-shell-inventory.md` — строка про `PPM_PROJECT_ASK_ENABLED` и режим «Найти в проекте».
- Create: `docs/superpowers/plans/2026-09-24-ux02/ux02.patch` (`tools/ux02-diff.sh`).

- [ ] **Step 1: Все автоматические проверки** (сравнить с базовым состоянием, записать вывод в отчёт):
  - `cd plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit`;
  - `cd ../ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs && ./node_modules/.bin/tsc --noEmit` — только старая `1803`;
  - `cd ../i18n && ./node_modules/.bin/tsx scripts/sync-check.ts --ci`;
  - `cd ../../apps/web && ./node_modules/.bin/vitest run && ./node_modules/.bin/react-router typegen && ./node_modules/.bin/tsc --noEmit -p tsconfig.json --tsBuildInfoFile /tmp/ux02-web.tsbuildinfo && ../../node_modules/.bin/oxlint --max-warnings=11957 .`;
  - `cd /Users/ermolov/Desktop/PPM && npm test` → 653/653, 13 диагностик;
  - `oxfmt --check` на все файлы из `ux02-diff.sh --name-only` (список файлов из `pre/`).
- [ ] **Step 2: Живой прогон** во встроенном браузере (пользователь уже вошёл). Отдельная вкладка, только чтение
  данных. Экраны: Главная, Задачи, `/browse/228-1`, Спринты, Направления, Фильтры, Документы, Заявки, Холст, Хранилище,
  Код, Входящие, Настройки проекта, `/about/brand-foundation`.
  - Размеры 1440×900, 1024×768, 390×844.
  - Темы: тёмная и светлая (через атрибут `data-theme`, без записи в профиль).
- [ ] **Step 3: Детектор**
  - `impeccable detect --json` по `apps/web/core/components/ppm-*`.
  - Инъекция `detect.js` на 5 маршрутах: `live-server` запускать **из пустой папки в scratchpad**, останавливать с
    `--keep-inject`.
  - Цель: `low-contrast`, `tiny-text` и `undersized-ui-text` = 0 на `ppm-*`.
- [ ] **Step 4: Итоговая рецензия всего патча** свежим агентом (суперпауэрс requesting-code-review). Исправить важное.
- [ ] **Step 5:** Документы и `ux02.patch`.

---

## Самопроверка плана (выполнена при написании)

- **Покрытие спеки.**
  - A1 — задачи 1–2; A2 — задачи 1–2; A3 — задача 1; A4 — задача 1; A5 — задача 1; A6 — задача 1; A7 — задача 1.
  - B1–B3 — задача 3.
  - C1 — задача 4, изменена решением владельца; C2 — задача 5; C3 — задача 6; C4 — задача 7; C5 — задачи 4 и 7;
    C6 — задачи 5 и 7; C7 — задача 8.
  - D1 — задачи 9–10; D2 — задачи 10 и 12; D3 — **частично**: UI Документов и шрифт редактора в задачах 1 и 12,
    сам `@plane/editor` отложен; D4 — задачи 10 и 12, **без изменений seed в API** (отложено); D5–D7 — задачи 11–12.
  - E1 — задачи 6 и 14; E2 — задачи 13 и 16, без переделки dropdown (отложено); E3–E4 — задача 13; E5 — задача 15;
    E6 — задача 3.
- **Шрифт редактора (D3):** перенесён в задачу 1 (Step 4b и тест (2)).
- **Известное ограничение приёмки.** Критерий 6 карточки («нет слова Plane на основном пути») не выполнится для
  **существующих** данных проекта «228»: демо-задачи «Welcome to Plane» и английские статусы — это данные, а их изменение
  отложено. Для новых проектов исправление даст отдельная API-карточка.
