# UX0.2 — карта инфраструктуры: флаги, проверки, baseline

Дата: 2026-09-24, ~00:25–00:35 локального времени. Режим: только чтение в `/Users/ermolov/Desktop/PPM` и `plane-fork`.
Все сырые выводы лежат рядом: `scratchpad/ux02/map/baseline-*.txt`.

Состояние дерева: root на ветке `feat/i0.6-work-item-projections`. `plane-fork` — сабмодуль, HEAD `53988697a8`
(`feat(ppm): add versioned canvas persistence`), 187 строк в `git status --short`: чужая незакоммиченная работа
I0.6/AF/G/ADM. В `ppm-canvas/` файлы `workspace.tsx`, `brain-panel.tsx`, `board-*.ts`, `commands.ts`,
`desktop-import.ts`, `minimal-workspace.tsx` **не отслеживаются** (`??`). `editor.tsx`, `canvas.css`, `route.tsx`
и `shape.tsx` изменены (`M`). Поэтому `git diff` не отделит изменения UX0.2 от I0.6 (см. «Риски»).

---

## 1. Флаги: как они устроены сейчас

### 1.1 Где объявлены и откуда берут значения

| Флаг | Значение по умолчанию и где оно задано | Хелпер (чистая функция, значение передаётся аргументом) | Где читается |
|---|---|---|---|
| `PPM_BRAND_ENABLED` | `"1"`: `apps/web/vite.config.ts:16` | `isPpmBrandEnabled(value)`: `packages/ppm-brand/src/index.ts:1542-1545` (deny-list `DISABLED_FLAG_VALUES` в `:20`) | `app/root.tsx:46`: `data-ppm-brand` на `<html>` (`:87`), meta, links, `defaultTheme` (`:111`); ещё ~60 файлов |
| `PPM_SHELL_ENABLED` | `"1"`: `vite.config.ts:19` | `isPpmShellEnabled(value, brandValue)`: `index.ts:1551-1553` (И с brand) | `root.tsx:47`: `data-ppm-shell`, `lang`; `ppm-shell/locale-bootstrap.tsx:13` (module const) и др. |
| `PPM_CANVAS_ENABLED` | `"1"`: `vite.config.ts:17` | `isPpmCanvasEnabled(value, shellEnabled)`: `packages/ppm-canvas/src/index.ts:2066-2070` | `ppm-canvas/route.tsx:40`, `project-navigation.tsx:74`, `projects-list-item.tsx:101`, `project/card.tsx:74`, `use-navigation-items.ts:42`, `project-feature-page.tsx:63` |
| `PPM_ANTYFLOW_SHELL_ENABLED` | `"1"`: `vite.config.ts:18` | `isPpmAntyFlowShellEnabled(value)`: `packages/ppm-canvas/src/index.ts:2072-2075` | только `ppm-canvas/route.tsx:41` (выбор `PpmCanvasWorkspace` или `PpmMinimalCanvasWorkspace`, `:59-76`) |

Текущий код `vite.config.ts:8-19`:

```ts
// Expose public Vite vars and the non-secret PPM brand rollback flag.
const viteEnv = Object.keys(process.env)
  .filter((k) => k.startsWith("VITE_"))
  .reduce<Record<string, string>>((a, k) => { a[k] = process.env[k] ?? ""; return a; }, {});

viteEnv.PPM_BRAND_ENABLED = process.env.PPM_BRAND_ENABLED ?? "1";
viteEnv.PPM_CANVAS_ENABLED = process.env.PPM_CANVAS_ENABLED ?? "1";
viteEnv.PPM_ANTYFLOW_SHELL_ENABLED = process.env.PPM_ANTYFLOW_SHELL_ENABLED ?? "1";
viteEnv.PPM_SHELL_ENABLED = process.env.PPM_SHELL_ENABLED ?? "1";
...
  define: { "process.env": JSON.stringify(viteEnv) },
```

`dotenv.config({ path: apps/web/.env })` в `vite.config.ts:6` загружает `.env` в `process.env` (без override).

Все хелперы с включением по умолчанию используют deny-list: `undefined`, `""` и любое незнакомое значение → `true`.
Только `0/false/no/off/disabled` (без учёта регистра, с trim) → `false`. В `@ppm/brand` это module const
`DISABLED_FLAG_VALUES` (`index.ts:20`), в `@ppm/canvas` каждый раз inline `new Set([...])` (`:2069`, `:2074`).

### 1.2 Другие места, через которые проходят флаги

- `plane-fork/turbo.json:4-12`: `globalEnv` содержит `PPM_BRAND_ENABLED`, `PPM_CANVAS_ENABLED`,
  `PPM_ANTYFLOW_SHELL_ENABLED`, `PPM_SHELL_ENABLED`. В `turbo.json` нет `envMode`, поэтому turbo 2.9.18 работает
  в strict-режиме. **Переменная, которой нет в `globalEnv`, не доходит до задач `turbo run build/dev`** и не входит
  в ключ кэша. Команда `pnpm --filter web dev` (так запущен текущий dev-сервер) идёт мимо turbo, на неё это не влияет.
- `apps/web/.env.example:14-15`: документирован только `PPM_ANTYFLOW_SHELL_ENABLED="1"`.
  `.github/workflows/ppm-canvas-browser-gate.yml` делает `cp apps/web/.env.example apps/web/.env`: всё, что попадёт
  в `.env.example`, станет окружением browser-gate.
- `apps/web/.env` (локальный) содержит только `VITE_*` ключи, `PPM_*` нет. Значит, в dev все флаги берут значения
  по умолчанию из `vite.config.ts`.
- `apps/web/Dockerfile.web` передаёт в сборку только `VITE_*` ARG/ENV. `PPM_*` не пробрасываются, поэтому
  Docker-сборка всегда получает значения по умолчанию из `vite.config.ts`.
- Серверные флаги Brain/агентов (`PPM_BRAIN_*`, `PPM_AGENTS_*`) живут отдельно: `plane-fork/.env.example:34-49`,
  `docker-compose-local.yml:83` (`PPM_AGENTS_WRITE_ENABLED: "1"` для API). Клиентский флаг UX0.2 их не трогает.
- Документация флагов: `plane-fork/docs/ppm/brand-surface-inventory.md` (таблица с BRAND/SHELL),
  `docs/ppm/antyflow-web-shell-inventory.md:42` (root, ANTYFLOW_SHELL).

### 1.3 Существующие тесты флагов

- `packages/ppm-brand/src/__tests__/brand.test.ts:18-28` (`isPpmBrandEnabled`) и `:64-68` (`isPpmShellEnabled`).
- `packages/ppm-canvas/src/__tests__/canvas-node.test.ts:1118-1122` (`isPpmCanvasEnabled`) и `:1124-1128`
  (`isPpmAntyFlowShellEnabled`), внутри `describe("PPM Canvas project boundary")` (`:1109`); импорт в `:18-19`.
- `apps/web/tests/navigation/project-navigation-items.test.ts:28-39,117`: `isPpmCanvasEnabled` подаётся как
  параметр в `buildProjectNavigationItems` (чистая функция), а не через env.

### 1.4 Как значение доходит до клиента (dev и production)

- **Production (`react-router build`)**: `define` статически заменяет `process.env` в коде на JSON-литерал.
  Значение фиксируется в момент сборки. Смена флага требует пересборки.
- **Dev (`react-router dev`, Vite 8.0.16)**: замены в исходнике нет. Я проверил на живом сервере:
  `GET /core/components/ppm-canvas/route.tsx` содержит `isPpmAntyFlowShellEnabled(process.env.PPM_ANTYFLOW_SHELL_ENABLED)`
  как есть. Значения присваиваются в рантайме модулем `/@vite/env`:
  `globalThis["process"]["env"] = {"VITE_...", "PPM_BRAND_ENABLED":"1","PPM_CANVAS_ENABLED":"1","PPM_ANTYFLOW_SHELL_ENABLED":"1","PPM_SHELL_ENABLED":"1"}`.
  Ключа `PPM_PROJECT_ASK_ENABLED` там сейчас нет, поэтому в браузере он читается как `undefined`.
- **Vitest (`apps/web/vitest.config.ts`)** не использует `vite.config.ts`: там нет `define`. `process.env` —
  это реальное окружение Node. В тестах флаг задаётся через `vi.stubEnv(...)`. Module-level const читается в момент
  импорта, поэтому удобнее передавать флаг пропом или тестировать чистый хелпер.

### 1.5 Нужен ли перезапуск dev-сервера (пункт 4)

Текущий сервер: PID 68145, `node apps/web/node_modules/@react-router/dev/bin.js dev --port 3000`, cwd `apps/web`,
слушает `127.0.0.1:3000`. Запущен 2026-09-23 10:18 процессом Codex
`…/codex-runtimes/codex-primary-runtime/…/pnpm.mjs --filter web dev`. В окружении процесса переменных `PPM_*` нет.
`GET /` → 200, `<html data-ppm-brand="enabled" data-ppm-shell="enabled" lang="ru">`.

Поведение Vite 8 (`vite/dist/node/chunks/node.js:26792-26811`, `handleHMRUpdate`): если изменился config-файл,
его зависимость или env-файл (`.env`, `.env.local`, `.env.development`, `.env.development.local` в `apps/web`),
Vite пишет «changed, restarting server…» и **сам перезапускает сервер в том же процессе**. Браузер после этого
делает полную перезагрузку.

| Изменение | Подхватится без ручного рестарта? |
|---|---|
| Новая строка в `vite.config.ts` (например, `viteEnv.PPM_PROJECT_ASK_ENABLED = … ?? "0"`) | Да: авторестарт, конфиг выполняется заново |
| Первое добавление `PPM_PROJECT_ASK_ENABLED=1` в `apps/web/.env` | Да: авторестарт, dotenv впервые задаёт ключ |
| Смена уже загруженного значения в `.env` (1→0) или удаление ключа | **Нет.** `dotenv.config()` не перезаписывает ключи, которые уже есть в `process.env` того же процесса. Нужен ручной рестарт (убить PID и снова `pnpm --filter web dev`) или `PPM_PROJECT_ASK_ENABLED=… pnpm --filter web dev` |
| `export VAR=…` в другом shell | Нет, нужен рестарт с этой переменной |
| `packages/ppm-brand/src/tokens.css` | Да, HMR: пакет экспортирует `./tokens.css` → `./src/tokens.css` (исходник). Импорт в `apps/web/styles/globals.css:2` |
| JSON локалей `packages/i18n/src/locales/ru/*.json` | Да: `@plane/i18n` грузит их в рантайме через `import(\`../locales/${language}/${namespace}.json\`)` (`dist/index.js:137`, `locales` — symlink на `src/locales`). Инстанс i18n кэширует ресурсы, может понадобиться перезагрузка страницы |
| TS в `packages/ppm-brand/src/index.ts` или `packages/ppm-canvas/src/index.ts` | **Нет.** `apps/web` импортирует `./dist/index.mjs` (`exports "."` в обоих `package.json`). Нужна сборка dist (`tsdown`). Потом Vite перезагрузит страницу: `@ppm/*` не пре-бандлятся, `node_modules/.vite/deps/_metadata.json` содержит 112 записей, ни одной `@ppm`/`@plane` |
| `turbo.json` | На работающий dev-сервер не влияет |

Сейчас dist свежие: `ppm-brand/dist` собран 23.09 21:06, `src/index.ts` изменён в 21:02; `ppm-canvas/dist` собран
12:33, `src` изменён в 12:31. Во время сборки `tsdown` по умолчанию очищает `dist/`, и открытая страница может
на мгновение упасть с ошибкой импорта. При работающем dev-сервере лучше `tsdown --no-clean` (так уже устроен
скрипт `dev` у `@ppm/brand`).

---

## 2. Рецепт: `PPM_PROJECT_ASK_ENABLED` (выключен по умолчанию)

### 2.1 Где разместить хелпер

**Рекомендация: `@ppm/canvas`**, рядом с `isPpmAntyFlowShellEnabled`. Флаг касается только Холста: кнопка
`workspace.tsx:745-753` и панель `workspace.tsx:1041-1055`. Все флаги Холста уже резолвятся в
`ppm-canvas/route.tsx:39-41`.

Альтернатива: `@ppm/brand`, рядом с `isPpmBrandEnabled`. Пакет `ppm-brand` сейчас проходит свой `check:types`,
а `ppm-canvas` — нет (см. §4, одна старая ошибка). Но brand отвечает за бренд и оболочку, не за функции Холста.

Отличие от существующих хелперов: флаг **выключен по умолчанию**, поэтому нужен allow-list, а не deny-list.
Пустое, отсутствующее или незнакомое значение → `false` (fail-closed).

### 2.2 Изменения по файлам (минимальные)

1. `plane-fork/packages/ppm-canvas/src/index.ts`: вставить сразу после `:2075` (конец `isPpmAntyFlowShellEnabled`):

   ```ts
   /**
    * Ask Project and the Canvas agent panel are hidden in PPM 1.0 (owner decision 2026-09-23).
    * The flag is opt-in: an unset, empty or unknown value keeps them hidden. Earlier runs stay intact.
    */
   export function isPpmProjectAskEnabled(value: string | undefined): boolean {
     if (value === undefined) return false;
     return new Set(["1", "true", "yes", "on", "enabled"]).has(value.trim().toLowerCase());
   }
   ```

2. Тест `plane-fork/packages/ppm-canvas/src/__tests__/canvas-node.test.ts`:
   - импорт: добавить `isPpmProjectAskEnabled,` после `isPpmMermaidSourceSafe,` (`:20`), сохранив алфавитный порядок;
   - после `:1128` внутри `describe("PPM Canvas project boundary")`:

   ```ts
   it("keeps Ask Project hidden unless it is explicitly enabled", () => {
     expect(isPpmProjectAskEnabled(undefined)).toBe(false);
     expect(isPpmProjectAskEnabled("")).toBe(false);
     expect(isPpmProjectAskEnabled("0")).toBe(false);
     expect(isPpmProjectAskEnabled("off")).toBe(false);
     expect(isPpmProjectAskEnabled("maybe")).toBe(false);
     expect(isPpmProjectAskEnabled("1")).toBe(true);
     expect(isPpmProjectAskEnabled(" TRUE ")).toBe(true);
     expect(isPpmProjectAskEnabled("on")).toBe(true);
   });
   ```

3. Пересобрать dist: `cd plane-fork/packages/ppm-canvas && ./node_modules/.bin/tsdown --no-clean`
   (эквивалент `pnpm --filter @ppm/canvas build`). Без этого `apps/web` получит TS2305 в typecheck, а в рантайме —
   ошибку «does not provide an export named isPpmProjectAskEnabled».

4. `plane-fork/apps/web/vite.config.ts`: после `:18` добавить
   `viteEnv.PPM_PROJECT_ASK_ENABLED = process.env.PPM_PROJECT_ASK_ENABLED ?? "0";`
   и обновить комментарий `:8`, например «…and the non-secret PPM rollout flags». Без этой строки ключа не будет
   в `define`, и флаг нельзя будет включить: хелпер всегда вернёт `false`.

5. `plane-fork/turbo.json`: в `globalEnv` вставить `"PPM_PROJECT_ASK_ENABLED",` перед `"PPM_SHELL_ENABLED"`
   (сейчас `:12`). Иначе strict env mode turbo отрежет переменную при `turbo run build/dev`.

6. `plane-fork/apps/web/.env.example`: в конец (после `:15`) добавить

   ```
   # «Спросить проект» и агенты на Холсте скрыты в PPM 1.0. Set to 1 to show them again; earlier runs are kept.
   PPM_PROJECT_ASK_ENABLED="0"
   ```

7. Место использования: `plane-fork/apps/web/core/components/ppm-canvas/route.tsx`.
   - `:12` → `import { isPpmAntyFlowShellEnabled, isPpmCanvasEnabled, isPpmProjectAskEnabled } from "@ppm/canvas";`
   - после `:41` → `const isProjectAskEnabled = isPpmProjectAskEnabled(process.env.PPM_PROJECT_ASK_ENABLED);`
   - в `<PpmCanvasWorkspace …>` (`:60-67`) → `projectAskEnabled={isProjectAskEnabled}`

   В `workspace.tsx` добавить `projectAskEnabled?: boolean;` в `TPpmCanvasWorkspaceProps` (`:77-84`) и в
   деструктуризацию (`:105-112`, по умолчанию `false`). Затем:
   - `:745-753`: кнопка `ppm-canvas-brain-trigger` только при `projectAskEnabled`;
   - `:1041`: `{projectAskEnabled && brainPanelOpen && (<PpmBrainPanel …/>)}`.

   `saveAnswerToCanvas`, `saveOrchestratorRunToCanvas` и ноды `agent_answer/orchestrator` в `shape.tsx`
   **не трогать**: старые данные должны отображаться. Альтернатива пропу — module const в `workspace.tsx`
   по образцу `locale-bootstrap.tsx:13`. Проп проще тестировать.

8. Документация: `docs/ppm/antyflow-web-shell-inventory.md` (root, рядом с `:42`) и строка в CHANGELOG (§5).

### 2.3 Где жить тестам

- Юнит-тест хелпера: `packages/ppm-canvas/src/__tests__/canvas-node.test.ts` (п. 2 выше). Если хелпер поедет в
  `@ppm/brand`, то `packages/ppm-brand/src/__tests__/brand.test.ts`, рядом с `describe("PPM brand feature flag")` `:18`.
- Web-уровень (по желанию): `apps/web/tests/ppm-canvas/*.test.ts` (environment `node`, JSDOM нет; в тестах
  навигации рендер через `renderToStaticMarkup`, см. `tests/navigation/navigation-accessibility.test.tsx`).
  Рендерить `workspace.tsx` целиком тяжело: tldraw, сервисы, mobx. Реалистичный вариант — вынести решение
  «показывать ли кнопку/панель» в чистую функцию или проп и проверить хелпер плюс проброс в route.

---

## 3. Команды проверки

`pnpm` в PATH **нет** (`which pnpm` → not found). `AGENTS.md` plane-fork пишет команды через `pnpm`. Dev-сервер
запущен Codex-овским pnpm 11.19.0 (`/Users/ermolov/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback/pnpm`),
а `packageManager` в `plane-fork/package.json` — `pnpm@11.3.0`. Везде ниже есть эквивалент на локальных бинарниках,
он работает без pnpm и без сети.

| Что | Через pnpm/turbo | Без pnpm (проверено) |
|---|---|---|
| `@ppm/brand` тесты | `pnpm --filter @ppm/brand test` (= `vitest run && node scripts/audit-user-facing-brand.mjs`) | `cd plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs` |
| `@ppm/canvas` тесты | `pnpm --filter @ppm/canvas test` (= `vitest run && node scripts/audit-browser-boundary.mjs`) | `cd plane-fork/packages/ppm-canvas && ./node_modules/.bin/vitest run && node scripts/audit-browser-boundary.mjs` |
| сборка dist пакетов | `pnpm --filter @ppm/brand build`, `pnpm --filter @ppm/canvas build`, или `pnpm exec turbo run build --filter='web^...'` (так в browser-gate) | `cd plane-fork/packages/ppm-<x> && ./node_modules/.bin/tsdown [--no-clean]` |
| web unit | `pnpm --filter web test` (= `vitest run`, `apps/web/vitest.config.ts`: `include: tests/**/*.test.{ts,tsx}`, env `node`) | `cd plane-fork/apps/web && ./node_modules/.bin/vitest run` |
| web typecheck | `pnpm --filter web check:types` (= `react-router typegen && tsc --noEmit`) | `cd plane-fork/apps/web && ./node_modules/.bin/react-router typegen && ./node_modules/.bin/tsc --noEmit` |
| typecheck пакетов | `pnpm --filter @ppm/brand check:types`, `pnpm --filter @ppm/canvas check:types` (`tsc --noEmit`) | `./node_modules/.bin/tsc --noEmit` в каталоге пакета |
| lint | `pnpm --filter web check:lint` (= `oxlint --max-warnings=11957 .`); пакеты: `oxlint .` | `cd plane-fork/apps/web && ../../node_modules/.bin/oxlint --max-warnings=11957 .` |
| format | `pnpm --filter web check:format` (= `oxfmt --check .`); brand: `oxfmt --check src scripts tsdown.config.ts package.json tsconfig.json build-manifest.json` | `../../node_modules/.bin/oxfmt --check <пути>` |
| i18n sync | `pnpm dlx tsx packages/i18n/scripts/sync-check.ts --ci` (workflow) | `cd plane-fork/packages/i18n && ./node_modules/.bin/tsx scripts/sync-check.ts --ci` |
| web production build | `pnpm --filter web build` (= `react-router build`) после сборки зависимостей `pnpm exec turbo run build --filter='web^...'` | `cd plane-fork/apps/web && ./node_modules/.bin/react-router build` (я **не запускал**: запрещено). Выход: `apps/web/build/client/assets/*.css` |
| root guard | `cd /Users/ermolov/Desktop/PPM && npm test` | то же |
| Plane pin | `npm run plane:verify:baseline` / `npm run plane:verify` (root) | `node scripts/plane-baseline/verify.mjs [--baseline-only]` |
| детектор | `~/.claude/skills/impeccable/scripts/impeccable detect --json <paths|url>` (см. `discovery/05-detector.md`) | — |

Замечания по командам:

- `tsc` в `apps/web` инкрементальный. `packages/typescript-config/base.json` задаёт
  `tsBuildInfoFile: ".turbo/tsconfig.tsbuildinfo"`, это разрешается в **общий** файл
  `packages/typescript-config/.turbo/tsconfig.tsbuildinfo` для всех пакетов. Повторный прогон занял 3 с,
  потому что кэш был тёплым. Для честного baseline я запускал `tsc --noEmit --tsBuildInfoFile <scratch>`:
  полный прогон, 15 с, в дерево ничего не пишет.
- `react-router typegen` пишет в `apps/web/.react-router/` (git-ignored, `.gitignore:112`).
- Для сборки на CI: `NODE_OPTIONS=--max-old-space-size=4096`.
- `apps/web/build/client` (сборка 24.09 00:11) новее всех исходников `apps/web/{core,app,helpers}` и
  `packages/ppm-{brand,canvas}/src`, то есть соответствует текущему дереву. Годится для аудита классов B2 до
  первых правок; после правок нужна новая сборка. CSS: `globals-DZa7ZJYQ.css` (245 КБ), `editor-C_0bWknX.css`
  (157 КБ), `root-C4QmZ0gw.css`.
- На PPM-ветках нет автоматического CI для web. Upstream workflows срабатывают на PR в `preview`/`master`,
  `ppm-canvas-browser-gate.yml` и `build-branch.yml` запускаются только вручную, `react-doctor.yml` — на любой PR.
  Корневой `.github/workflows/plane-baseline.yml` проверяет только пин и golden path unmodified Plane. Поэтому
  CI-проверку классов (B2) надёжнее подключить как скрипт в `test`/`check`-скрипте пакета: так уже сделаны
  `audit-user-facing-brand.mjs` и `audit-browser-boundary.mjs`, которые агенты реально запускают.

---

## 4. Baseline ДО изменений (запущено 2026-09-24 00:25–00:35)

| # | Команда | Результат |
|---|---|---|
| a1 | `packages/ppm-brand`: `./node_modules/.bin/vitest run` | **PASS**: 1 файл, **19/19** тестов, 119 мс (vitest 4.1.8) |
| a2 | `packages/ppm-brand`: `node scripts/audit-user-facing-brand.mjs` | **PASS**: «passed (23 surfaces, controlled allowlist)» |
| b | `apps/web`: `./node_modules/.bin/vitest run` (полный набор, не подмножество) | **PASS**: **15 файлов, 97/97** тестов, 1,29 с. В stderr шум из `navigation-accessibility.test.tsx`: «useLayoutEffect does nothing on the server» ×4 (не ошибка) |
| c1 | `apps/web`: `react-router typegen && tsc --noEmit` (скрипт пакета, тёплый кэш) | **PASS**: exit 0, 0 ошибок, 3 с |
| c2 | `apps/web`: `tsc --noEmit --tsBuildInfoFile <scratch>` (холодный, полный) | **PASS**: exit 0, **0 ошибок**, 15 с |
| c3 | `packages/ppm-brand`: `tsc --noEmit` (buildinfo в scratch) | **PASS**: 0 ошибок |
| c4 | `packages/ppm-canvas`: `tsc --noEmit` (buildinfo в scratch) | **FAIL (старая ошибка)**: exit 2, 1 ошибка: `src/index.ts(1803,7): error TS2322: Type '{ action_id?: string; kind: "orchcall"; run_id: string; trace_id: string; }' is not assignable to type '{ action_id: string; kind: "orchtask"; run_id: string; }'.` (`previousRef = callRef;`, orchestrator projections). Не наша, но добавлять новых нельзя |
| d | root: `npm test` (vitest 4.1.10, включает M0.6 guard) | **PASS**: **20 файлов, 653/653**, 4,25 с. Guard: tsc root exit 2 с ровно 13 разрешёнными диагностиками, сравнение `{ok:true}`. В stderr «ExperimentalWarning: SQLite» ×2 (шум). Root `tsconfig.json` включает только `src` и `electron.vite.config.ts`, поэтому правки в `plane-fork` на guard не влияют |
| e1 | lint `ppm-brand` / `ppm-canvas`: `oxlint .` | 0 warnings, 0 errors (оба) |
| e2 | lint `apps/web`: `oxlint --max-warnings=11957 .` | PASS: **719 warnings, 0 errors**. **0 предупреждений в файлах `ppm-*`** |
| f1 | format `ppm-brand` / `ppm-canvas` (`oxfmt --check …` из скриптов) | PASS (оба) |
| f2 | format `apps/web`: `oxfmt --check .` | exit 1 только из-за `test-results/.last-run.json` (артефакт Playwright, git-ignored). Все исходники отформатированы |
| g | `packages/ppm-canvas`: `node scripts/audit-browser-boundary.mjs` (read-only скан) | PASS: «passed (3 isolated roots)» |
| h | i18n: `tsx scripts/sync-check.ts --ci` | PASS: 18 локалей, по 3837 ключей, всё синхронно |
| i | root: `node scripts/plane-baseline/verify.mjs --baseline-only` | PASS: «v1.4.2 @ 5f7d927…», «checkout is dirty; baseline-only…», 5 integrity checks |
| j | root: `node scripts/plane-baseline/verify.mjs` (полный) | **FAIL (старая)**: «Submodule HEAD is 53988697…; expected 7e6aa54d…» и «Plane submodule contains tracked or untracked changes.» |

**Не запускал**: vitest `@ppm/canvas` (в моей задаче его нет; перед правкой хелпера его нужно прогнать:
`cd plane-fork/packages/ppm-canvas && ./node_modules/.bin/vitest run`), production build web, Playwright e2e
(нужен живой стек и секреты).

Сырые выводы: `baseline-ppm-brand-vitest.txt`, `baseline-ppm-brand-audit.txt`, `baseline-web-vitest.txt`,
`baseline-web-vitest-verbose.txt`, `baseline-web-typegen.txt`, `baseline-web-tsc.txt`, `baseline-web-tsc-fresh.txt`,
`baseline-brand-tsc.txt`, `baseline-canvas-tsc.txt`, `baseline-*-oxlint*.txt`, `baseline-*-oxfmt.txt`,
`baseline-root-npm-test.txt`, `baseline-i18n-sync.txt`, `baseline-plane-verify*.txt`.

Разбивка web unit (97): canvas-access 4, navigation-accessibility 3, project-navigation-items 6, admin-mode 2,
admin-service 4, board-presence 9, board-recovery 14, board-save-retry 2, board-workspace-state 6,
brain-agent-service 12, desktop-import 19, webhook-status 3, ppm-time-ago 4, ppm-workspace-access 5, workspace-slug 4.

---

## 5. Правила репозитория (обязательные проверки, CHANGELOG, коммиты)

- Root `CLAUDE.md` (написан для desktop AntyFlow):
  - `npm test` — M0.6 guard: точное мультимножество 13 диагностик;
  - raw `npx tsc --noEmit` без новых диагностик (guard запускает его сам);
  - `npm run build` — это **electron-vite build** desktop-приложения, к plane-fork отношения не имеет;
  - smoke;
  - CHANGELOG;
  - горячие клавиши только через `e.code`;
  - UI на русском.
- Root `AGENTS.md`:
  - §10: «Не заявляй проверку пройденной, если команда не запускалась»; для UI нужны loading/empty/error, keyboard
    и reduced-motion;
  - §12: формат коммита `<type>(<scope>): <результат>`. В plane-fork принято `feat(ppm): …`, например
    `53988697a8 feat(ppm): add versioned canvas persistence`;
  - не трогать чужие незакоммиченные правки; `accepted` ставит только владелец, агент поднимает статус до `review`;
  - §14: остановиться при пересечении с чужими незакоммиченными изменениями.
- `plane-fork/AGENTS.md`:
  - `pnpm check` (format, lint, types);
  - «All features require unit tests»;
  - oxfmt, oxlint;
  - `pnpm turbo run <cmd> --filter=<pkg>`.
- `plane-fork/packages/tailwind-config/AGENTS.md`: ближайший AGENTS для `variables.css` (B1). Это философия
  Canvas/Surface/Layer: `bg-canvas` только в корне, surfaces — соседи, layers вложены. Важно для A2 (развести
  surface/layer/hover/selected).
- CHANGELOG PPM: `docs/project-spec/Документация PPM/CHANGELOG.md` (root repo). Формат: `## 2026-09-23 — <заголовок>`
  и маркированный список; новые записи сверху, во front-matter `updated:`.
- Очередь: в `docs/project-spec/Документация PPM/Intelligence-first/tasks/README.md` **строки UX0.2 нет**. Таблица
  «Этап UX/ADM» `:57-62`, формат
  `| [UX0.2 — …](<UX0.2 — ….md>) | P0 | \`status\` | зависимости | результат |`.
- Коммит в сабмодуль потребует обновить пин в root: `infra/plane/baseline-manifest.json` (`integrationCommit`,
  `ppmPatches`), иначе `plane:verify` останется красным. Он и сейчас красный.

---

## 6. Риски и что может сломаться

1. **Playwright e2e опирается на кнопку «Спросить проект».** `apps/web/e2e/ppm-demo.spec.ts:473-512`:
   `getByRole("button", { name: "Спросить проект" })`, `region "Спросить проект"`, `.ppm-ask-panel__result`,
   «Сохранить на холсте». При `PPM_PROJECT_ASK_ENABLED=0` этот блок упадёт. Варианты: пропускать его
   (`test.skip(process.env.PPM_PROJECT_ASK_ENABLED !== "1", …)`) или прогонять gate с флагом `=1`.
   Этот spec, похоже, и так устарел: `:432-436` ищет region «Индекс Мозга проекта», а ключ `brain_index.title`
   есть только в `@ppm/brand` и не используется ни одним компонентом `apps/web`.
2. **e2e опирается на карточку статуса сохранения (C2).** `apps/web/e2e/ppm-canvas-performance.spec.ts:303-305` ждёт
   `.ppm-canvas-status__notice[data-status="saved"]`. Этот элемент — «неубираемая карточка» `editor.tsx:2410-2490`
   (в карточке задачи указано `2138–2324`, строки уехали). Если статус переедет в футер, нужно сохранить хук
   `data-status` или поправить spec.
   Ещё: `ppm-canvas-collaboration.spec.ts:98` кликает `getByRole("button", { name: /Добавить заметку ⇧N/ })`
   на rail. При свёрнутой по умолчанию панели (C3) accessible name должен сохраниться.
3. **Единственный UI-путь к индексу проекта.** `PpmBrainService` (`query/streamQuery`, `reindex`, `getMemory`,
   `reviewMemory`, `getHealth`, `getSources`) используется только в `brain-panel.tsx`. Если скрыть панель, из UI
   пропадут поиск по индексу, переиндексация и ревью памяти. Это ровно stop rule карточки: «…не угадывать, где он
   будет жить: спросить владельца». Карточка говорит «поиск остаётся в общем поиске», но общий поиск Plane индекс
   Brain не использует.
4. **Чужая незакоммиченная работа I0.6 в тех же файлах.** `workspace.tsx` и `brain-panel.tsx` не отслеживаются,
   `editor.tsx`, `canvas.css`, `route.tsx`, `shape.tsx` изменены. Stop rule карточки: «Если I0.6 ещё правит
   `ppm-canvas/*`, дождаться слияния». Пользователь остановил агентов, но I0.6 не закоммичен. Рекомендация:
   перед правками снять копии затрагиваемых файлов в scratch (например, `cp` в `scratchpad/ux02/pre/`), чтобы потом
   получить чистый diff UX0.2 (`diff -ru pre/ current`) и иметь откат. Порядок коммитов (сначала I0.6, потом UX0.2)
   согласовать с владельцем.
5. **Нужна пересборка dist.** Любой новый экспорт из `@ppm/canvas` или `@ppm/brand` виден в `apps/web` (dev,
   vitest, tsc) только после `tsdown`. Типичный ложный красный: `TS2305 Module '@ppm/canvas' has no exported member`.
6. **`@ppm/canvas` `check:types` уже красный** (TS2322 `src/index.ts:1803`). Если хелпер поедет туда, новые ошибки
   нужно отличать от этой. Сравнивать выводы до и после.
7. **Строго закодированные значения в тестах бренда.** `brand.test.ts:134-151` проверяет `#22D3EE`,
   `"--ppm-color-accent: #22d3ee"`, `"--ppm-color-canvas: #0e0f12"`, `"#eef0f3"`,
   `"--border-accent-strong: var(--ppm-color-focus)"` и пары контраста (`#0891B2` на белом ≥ 3). Правки A
   (OKLCH, `#0e7490`) их сломают, тесты нужно обновить в той же правке. `brand.test.ts:122-129` проверяет, что
   `code` имеет статус `planned` и `stage: "G0.1"`. Правка D5 (`index.ts:1529`, в карточке указано `:1521`) сломает
   этот тест. `PPM_PROJECT_NAVIGATION_CONTRACT` не используется в `apps/web`, только в тестах.
8. **Audit-скрипт бренда.** `audit-user-facing-brand.mjs` сканирует 23 файла с allowlist слов «Plane». Правки D4
   могут сделать строки allowlist неактуальными; скрипт при этом не падает. Добавлять файлы в `auditScope` стоит
   осознанно.
9. **Docker и turbo.** Без записи в `turbo.json.globalEnv` флаг не пройдёт через `turbo run`. Dockerfile.web не
   пробрасывает `PPM_*`, поэтому в Docker-сборке флаг всегда будет значением по умолчанию `"0"`. Rollback
   `PPM_PROJECT_ASK_ENABLED=1` сработает только в сборке вне Docker или после добавления ARG/ENV.
10. **Сброс dev-значения.** Переключение флага в `apps/web/.env` после первой загрузки не применится без ручного
    рестарта: dotenv не перезаписывает ключи (§1.5).
11. `.react-router/` и общий tsbuildinfo пишутся при `check:types`. Это не tracked-файлы, но запуск typecheck
    разных пакетов подряд инвалидирует общий кэш: не ошибка, просто медленнее.

## 7. Открытые вопросы

1. Куда владелец хочет перенести поиск по индексу проекта, переиндексацию и ревью памяти, если панель скрыта? Или
   временно оставить только поиск без агентов? Это stop rule карточки.
2. Коммитить ли UX0.2, пока I0.6 не закоммичен (в тех же файлах `ppm-canvas/*`)? В каком порядке?
3. `e2e/ppm-demo.spec.ts`: обновить (skip при выключенном флаге) в рамках UX0.2 или прогонять gate с `=1`?
4. Хелпер в `@ppm/canvas` (рекомендую) или в `@ppm/brand`?
5. Нужно ли пробрасывать `PPM_*` в `Dockerfile.web`, чтобы rollback флагами работал и для Docker-сборки?
   В текущем scope этого нет.
