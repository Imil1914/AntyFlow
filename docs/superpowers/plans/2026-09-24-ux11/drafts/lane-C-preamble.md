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
