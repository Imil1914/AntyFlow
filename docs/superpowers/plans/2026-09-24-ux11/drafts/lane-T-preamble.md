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
