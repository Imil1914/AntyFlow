## Линия B — «Содержимое и файлы» (параллельно с R и S, после фазы F)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на Холсте (облик v2) заметка пишет Markdown с формулами KaTeX и подсветкой кода и превращается в задачу или
документ PPM; блок кода — как на фото владельца (K3: номера строк, язык, тема, замок, «…»); документ PPM — живая
карточка с превью и «Открыть ↗», создаётся и ищется прямо с холста; вставка/перетаскивание/⌘U кладут файлы в
Хранилище с понятным именем и живой карточкой (в снимке нет `data:`); у любой файловой карточки есть «Просмотр»
(картинка, PDF, текст/Markdown/JSON/CSV/код, docx/xlsx/pptx) и «Скачать»; «Доска задач» снова рабочий канбан;
чек-лист превращает пункты в задачи; старые картинки `data:` переносятся в Хранилище по подтверждению.

**Architecture:**
- Линия B стартует после фазы F и идёт параллельно с R (рейка, фигуры) и S (сервер). Правим **только** файлы линии B
  (CONTRACTS §0): `shape.tsx`, новые модули `apps/web/core/components/ppm-canvas/{canvas-code,canvas-markdown,
  canvas-content-actions,canvas-placement,canvas-pages,canvas-file-kind,canvas-checklist,canvas-image-migration,
  canvas-external-content}.ts` и `{note-markdown,code-block,canvas-page-picker,file-preview}.tsx`, `canvas-content.css`,
  `apps/web/core/services/{ppm-canvas,ppm-vault}.service.ts`, блок «B» в `packages/ppm-brand/src/translations/af21-canvas.ts`,
  тесты `apps/web/tests/ppm-canvas/{note-markdown,code-block,content-pages,files-external-content,files-preview,
  content-checklist-migration}.test.ts`. В `editor.tsx` — только блоки с разметкой
  `// ── AF2.1 B · <имя> ──` … `// ── /AF2.1 B ──` и две точечные правки, перечисленные в задачах (сигнатура
  `createProjectionShape`, ветка v2 в `handleFileDrop`). Что нужно от F/S/R — в `drafts/plan-B-needs.md`.
- Всё новое — только при грамматике v2 (`usePpmCanvasGrammarV2()` в карточках, `grammarV2` в `editor.tsx`). Облик v1
  и минимальный режим (`statusPlacement="card"`) — без изменений: старые ветки разметки не трогаем, обработчики
  внешнего контента при v1 делегируют стандартным обработчикам tldraw.
- Действия карточек (заметка → задача/документ, превью, скачивание, чек-лист → задачи, новый документ) идут через
  **новый** контекст `PpmCanvasContentActionsContext` (`canvas-content-actions.ts`), который провайдит блок B в
  `editor.tsx`. Форма `PpmWorkItemProjectionContext` (волна 1) не меняется.
- Чистая логика (Markdown, KaTeX, подсветка, имена файлов, CSV, размещение, миграция) — в `.ts`-модулях без DOM:
  тесты web идут в `environment: "node"` (`apps/web/vitest.config.ts:13`), jsdom в store нет. DOMPurify в node
  не поддерживается (`isSupported === false`, `sanitize === undefined` — проверено на dompurify@3.4.15), поэтому
  `sanitizeCanvasHtml` без DOM **экранирует** вход (fail-closed), а сырой HTML не проходит уже на уровне marked.
- Коммитов нет. Перед первой правкой каждого файла (и перед созданием нового) —
  `docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`.

**Tech Stack:** React 18 + React Router 7 + Vite 8, tldraw 3.15.6 (`registerExternalContentHandler`,
`externalContentHandlers`, `putExternalContent`, `getEditingShapeId`, `setEditingShape`, `getShapeAtPoint` —
`@tldraw/editor/src/lib/editor/Editor.ts:8888-8952`; `onMount` вызывается после
`registerDefaultExternalContentHandlers`, `tldraw/src/lib/Tldraw.tsx:~248-262`, поэтому наши обработчики перекрывают
стандартные), marked@16.4.2 (`new Marked`, расширения `level: "block" | "inline"`), katex@0.16.47
(`renderToString(tex, { throwOnError: false, trust: false })`), dompurify@3.4.15, lowlight@3.3.0 (`createLowlight(common)`,
37 языков вместе с `plaintext`), lucide-react 0.469.0, zod (есть в `apps/web/package.json:82`), vitest 4 (env node).

**Spec:** «AF2.1 — Инструменты Холста…» §C, §D, §E (п. «Доска задач», «тихое ужатие»), инварианты, критерии 1, 3, 4, 5, 6;
рулинги R4, R5, R6, R8. Контракты — `drafts/CONTRACTS.md` §0–§6. Макеты — `mockups/K3-Text-Code.png`,
`mockups/K4-Files-Comments.png` (комментарии/обсуждение на K4 — AF2.3, **не** делаем). Заметки —
`notes/tech-notes.md` («Вставка/перетаскивание», «Превью файлов сейчас», «Документы»), `notes/other-agent-analysis.md`
(регрессия 7).

**Проверено по рабочему дереву (2026-09-25, до фазы F):** `apps/web/core/components/ppm-canvas/shape.tsx` 2960 строк
`c528e57be11b`, `editor.tsx` 3764 `17c59907d7ad`, `apps/web/core/services/ppm-canvas.service.ts` 550 `5c334de9605a`,
`ppm-vault.service.ts` 361 `d289c32831db`, `packages/ppm-canvas/src/index.ts` 2163 `427499737346` (sha256, первые 12
знаков). Номера строк ниже — по этому состоянию; F сдвинет их — искать по приведённой строке-якорю.

Ключевые якоря (проверены):
- `shape.tsx:279` `function NodeEditor`, `:552` `return <NativeNodeCard editor={editor} node={node} shape={shape} />;`,
  `:814` `ChecklistEditor`, `:1559` `WorkItemsViewNode` (`:1570` `const compact = usePpmCanvasGrammarV2();`,
  `:1583-1590` эффект автоужатия `props: { w: 360, h: 160 }`, `:1702-1715` заглушка `ppm-work-items-view--compact`),
  `:2474` `ContentProjectionCard`, `:2586` `MediaProjectionCard` (`:2665-2673` `<iframe … sandbox="" src={previewUrl}>`),
  `:2893` `useLazyPreview`, `:2949` `updateNode`.
- `editor.tsx:210` `export default function PpmCanvasEditor`, `:525` `createContentProjectionShape(binding, pagePoint?)`
  (pagePoint — **центр** карточки), `:1290` `createProjectionShape(binding)` (`:1308` `findFreeNodePosition`),
  `:1352` `createWorkItem`, `:1888` `addUploadedContent(entityType, entityId, index, origin)`, `:1957` `handleFileDrop`
  (`onDropCapture` на `.ppm-canvas-shell` глушит drop до tldraw — `:2213-2214`), `:2162` `projectionContext`,
  `:2221-2229` `<Tldraw … onMount={setEditor}>`, `:2248-2255` уведомление `.ppm-canvas-file-drop-notice` (Toasts
  tldraw скрыты: `HIDDEN_TLDRAW_UI.Toasts = null`, `:203`), `:3473` `createNode`, `:3506` `findFreeNodePosition`,
  `:3754` `contentNodeKind`.
- Сервер: `apps/api/plane/ppm_vault/services.py:23-45` (форматы Хранилища: pdf, png, jpg, jpeg, webp по сигнатуре;
  csv, doc, docx, json, key, md, odp, ods, odt, ppt, pptx, txt, xls, xlsx по расширению), `:204` `VAULT_NAME_CONFLICT`
  (HTTP 409, `views.py:83`), `views.py:300-345` `/pdf/` (всегда `application/pdf`, `nosniff`) и `/file/`
  (`inline` только pdf/картинки, иначе `attachment`, `CSP: default-src 'none'; sandbox`); при S3 — 302 на подписанную
  ссылку (`storage.py:61-69`); локально (по умолчанию `PPM_LOCAL_ASSET_UPLOADS=1`, `settings/local.py:12`) —
  `FileResponse`. `apps/api/plane/ppm_canvas/services.py:633-636` `preview_url` Хранилища = `…/vault/entries/<id>/file/`;
  `:698-710` страница: `extension ".page"`, `mime "text/html"`, `excerpt` 500 знаков, `preview_url null`,
  `source_version = updated_at`. Эндпоинт холста `work-items/` принимает только `name/state_id/priority/assignee_ids/
  due_date` (`ppm_canvas/serializers.py:216-228`). Plane `POST pages/` принимает `description_html`
  (`app/views/page/base.py:~137`), список страниц — только свои и публичные (`:98`).

## Решения линии B (фиксируются в CHANGELOG карточки)

| # | Вопрос | Решение |
|---|---|---|
| RB1 | Старые заметки | `format: "plain"` (и заметки без поля после миграции F) остаются в `NativeNodeCard` как раньше (textarea). Новая карточка `NoteCardV2` — только `grammarV2 && format === "markdown"` |
| RB2 | Просмотр ↔ правка | Через состояние редактирования tldraw: двойной клик и Enter при одной выделенной карточке (`canEdit() → true`, `shape.tsx:217`) ставят `editingShapeId`; выход — Esc, ⌘/Ctrl+Enter, клик мимо. Своих обработчиков dblclick нет |
| RB3 | Картинки в Markdown | Не загружаются (только alt-текст): «без новых внешних запросов». Ссылки — только `http(s)`, `mailto`, относительные и `#`; открываются в новой вкладке с `noopener noreferrer nofollow` |
| RB4 | «Сделать задачей» | Эндпоинт холста `work-items/` (имя = заголовок или первая строка, ≤ 255). Описание не переносится (эндпоинт его не принимает) — заметка остаётся рядом. Карточка задачи — справа от заметки без наложения (`findSpotBeside`) |
| RB5 | «Сделать документом» | `ProjectPageService.create` с `access: PUBLIC`, `description_html` = Markdown → HTML (формулы как `<code>$…$</code>`, без разметки KaTeX), DOMPurify; затем `bindContent(entity_type "page")` → живая карточка справа от заметки |
| RB6 | Блок кода | Своя разметка без новой зависимости редактора: textarea поверх подсвеченного `<pre>` в одной ячейке grid (одинаковые шрифт и отступы), Tab/⇧Tab — 2 пробела, `e.code`. Панель (тема · язык · замок · «…») — строкой **внутри** карточки, а не над ней (у `.tl-shape` `pointer-events:none`, панель вне геометрии ненадёжна) |
| RB7 | PDF | Полноэкранный просмотр — `<iframe>` **без** `sandbox` на `/pdf/` Хранилища (сервер отдаёт только `application/pdf` после проверки сигнатуры `%PDF-` и `nosniff`); встроенный просмотрщик Chrome в песочнице не работает. Вложения задач (`attachment`) остаются в `sandbox=""` как в волне 1. pdf.js не подключаем (при S3 нужен CORS MinIO для fetch) |
| RB8 | Текст/CSV/JSON/код | Сначала превью-эндпоинт S (`kind: "text"`, поле `text`), при 404/ошибке — `GET /file/` текстом (работает в локальном хранилище), иначе иконка и «Скачать». Markdown-материалы — `GET /content/` |
| RB9 | «Скачать» | Blob через API (`withCredentials`) и имя из карточки; при ошибке — `window.open(<file>?download=1, "_blank", "noopener")`. Markdown-материал — из `/content/` |
| RB10 | Перетаскивание под v2 | Файлы сразу в Хранилище (K4: «Отпустите, чтобы добавить N файла — они сохранятся в Хранилище»); отпущенные на живую карточку задачи — вложениями этой задачи (прежняя возможность диалога «В задачу»). При v1 — прежний `FileDropDialog` |
| RB11 | Вставка URL / SVG | URL → заметка Markdown `<url>` с заголовком «хост» без запроса в сеть; SVG-текст → уведомление «сохраните как PNG» (Хранилище SVG не принимает) |
| RB12 | Размер при вставке | Клиент не режет по размеру (лимит — настройка сервера `FILE_SIZE_LIMIT`); сервер отвечает `VAULT_FILE_TOO_LARGE`, текст ошибки показываем. Не более 20 файлов за раз (как `handleFileDrop`) |
| RB13 | Старые картинки `data:` | Не автоматически: при открытии доски редактором под v2 — уведомление «N картинок хранятся внутри доски (X МБ). Перенести в Хранилище?» с «Перенести» / «Не сейчас» (отказ помнится в sessionStorage на доску). Перенос обратим: undo tldraw и версии доски. GIF/SVG остаются, их число называется |
| RB14 | «Доска задач» | Под v2 — полный канбан волны 1 (заглушка и эффект автоужатия удалены), «Открыть бэклог» — вторичная кнопка в шапке; подпись «Доска задач» в шапке — ручка перетаскивания (`data-ppm-drag-handle`) |
| RB15 | Формулы в «Документах» (B7) | В AF2.1 не делаем — обоснование в Task B7 |

## Global Constraints (линия B)

- Рабочее дерево `plane-fork` — истина (волны UX0.2/UX1.1, фаза F и соседние линии не закоммичены). Никаких
  `git add/commit/stash/reset/checkout`. Dev-сервер :3000 и контейнер API :8000 не перезапускать (Vite после установки
  пакетов перезапускает контроллер).
- Перед первой правкой **любого** файла (и перед созданием нового):
  `cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork> …`
- Не трогать файлы F, R и S (CONTRACTS §0): `packages/ppm-canvas/**`, `apps/web/package.json`, `pnpm-lock.yaml`,
  `workspace.tsx`, `commands.ts`, `canvas.css`, `canvas-v2.css`, `canvas-toolkit.css`, `canvas-rail.tsx`, `apps/api/**`.
  В `editor.tsx` — только блоки `// ── AF2.1 B · … ──` и две правки, названные в B1 и B4. Нужды — в `drafts/plan-B-needs.md`.
- Контракты F потребляем как существующие (проверка — Step 0 задачи B1): зависимости `marked`, `dompurify`, `katex`,
  `lowlight` в `apps/web/package.json`; поля схемы `note.format`, `code.{language,theme,locked,wrap}`,
  `checklist.items[].work_item_id`; ветка `page` в `createPpmContentRefNode`; пустой `canvas-content.css`,
  импортированный в `editor.tsx`; модуль `af21-canvas.ts` с блоком «B»; вызов
  `registerPpmCanvasExternalContent(editor, getDeps)` в `onMount` (если F его не поставил — B4 ставит сам в своём блоке).
- Строки UI — только ключи `canvas.*` в блоке «B» `packages/ppm-brand/src/translations/af21-canvas.ts` (en и ru —
  одинаковые наборы, без «ИИ», «Page», «Vault»), существующие ключи не переопределять. После правки —
  `docs/superpowers/plans/2026-09-25-af21/tools/af21-pkg-build.sh ppm-brand`. `pnpm` не вызывать.
- Горячие клавиши — только `e.code` (`Tab`, `Escape`, `Enter`); новых глобальных сочетаний не вводим (⌘U — tldraw).
- CSS линии — только `canvas-content.css`; каждый селектор начинается с
  `:where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"]` (исключение — диалоги-порталы в `body`
  `.ppm-canvas-content-backdrop`, `.ppm-canvas-page-picker`, `.ppm-file-preview`: только `:where(html[data-ppm-design="v2"])`); каждый `var(--ppm-…)` — с фолбэком на роль
  волны 0; кегль ≥ 0.6875rem; без запятых внутри `:is()/:not()`.
- Без сети из браузера сверх API PPM: KaTeX CSS/шрифты — `import "katex/dist/katex.min.css"` (собирает Vite), подсветка —
  lowlight, никаких CDN, `fetch` сторонних URL, картинок из Markdown.
- Формат — точечно: `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ../../node_modules/.bin/oxfmt <файлы>`;
  пакеты — `cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxfmt <файлы>`.
- Линт по своим файлам: `cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxlint <файлы>` →
  `Found 0 warnings and 0 errors.` (если `react/no-danger` включён — строкой выше
  `// oxlint-disable-next-line react/no-danger -- HTML прошёл sanitizeCanvasHtml (DOMPurify)`).
- Типы: `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
  --tsBuildInfoFile /Users/ermolov/Desktop/PPM/.superpowers/sdd/2026-09-25-af21-canvas-toolkit/web-B.tsbuildinfo 2>&1
  | grep -E "ppm-canvas/|ppm-vault.service|ppm-canvas.service|tests/ppm-canvas"` — пусто (соседние линии могут быть
  посреди правки, поэтому фильтр по своим путям).
- Базовая линия (не ухудшать, CONTRACTS §6): web vitest ≈350 зелёные, brand 79/79 + аудиты, canvas 38+/audit,
  web tsc 0, oxlint 719/0, root 653/653.
- E2E-якоря, которые линия B обязана сохранить: `[data-ppm-canvas-node-kind="vault_file_ref"]`; кнопка «Убрать с холста»;
  `.ppm-work-item-card` + `getByLabel("Статус")`; textbox «Новая заметка» (v1); ровно один `.ppm-canvas-status__notice`
  в активном редакторе (наше уведомление — `.ppm-canvas-file-drop-notice`, другой класс); единственный `[role="dialog"]`
  внутри редактора при предпросмотре импорта (наши диалоги — порталом в `document.body`).

## Review Focus (линия B)

1. **Санитизация.** Сырой HTML в Markdown экранируется на уровне marked (`renderer.html`), затем весь HTML идёт через
   `sanitizeCanvasHtml` (DOMPurify: без `script/style/iframe/object/embed/img/image/use/form`, без `srcset/xlink:href`,
   без data-атрибутов); `javascript:`/`data:` ссылки не рендерятся; KaTeX с `trust: false` (без `\href`, `\url`,
   `\htmlStyle`); без DOM — экранирование (fail-closed). HTML превью Office от S и `description_html` страниц — тоже через
   `sanitizeCanvasHtml`. Тесты: B1 `note-markdown.test.ts`, B5 `files-preview.test.ts`.
2. **Нет сети.** Вставка URL не вызывает `fetch` (B4 тест со шпионом `globalThis.fetch`), картинки Markdown не
   грузятся, KaTeX/шрифты/подсветка локальные (B1 тест: нет `https?://` в `note-markdown.tsx`).
3. **Размеры.** Markdown ≤ 50 000 знаков (лимит `body`), код ≤ 100 000 (лимит схемы), подсветка до 20 000 знаков, превью
   текста ≤ 1 МиБ, CSV ≤ 200×50, не более 20 файлов за вставку; `data:` больше не попадает в снимок доски.
4. **PDF без песочницы — только `/pdf/` Хранилища** (сигнатура проверена сервером, `application/pdf`, `nosniff`);
   вложения задач — прежний `sandbox=""`.
5. **v1 и минимальный режим без изменений.** Обработчики внешнего контента при v1 делегируют стандартным; карточки
   v1 (`NativeNodeCard`, канбан, медиа) рендерятся прежней разметкой; `canvas-content.css` действует только при v2.
6. **Права.** Читатель: просмотр и «Скачать» есть, правки/«Сделать задачей/документом»/вставка — нет (сервер всё равно
   проверяет права Хранилища, Документов и задач).
7. **Живые источники (I1/I2).** Задача/документ/файл создаются через их API и кладутся ссылкой; «Убрать с холста» не
   удаляет источник; миграция `data:` удаляет только фигуру-картинку tldraw после успешной загрузки и привязки.

## Карта файлов линии B

| Файл | Задачи |
|---|---|
| `apps/web/core/components/ppm-canvas/canvas-code.ts` (новый) | B1, B2 |
| `apps/web/core/components/ppm-canvas/canvas-markdown.ts` (новый) | B1 |
| `apps/web/core/components/ppm-canvas/canvas-content-actions.ts` (новый) | B1, B3, B5, B6 |
| `apps/web/core/components/ppm-canvas/canvas-placement.ts` (новый) | B1 |
| `apps/web/core/components/ppm-canvas/note-markdown.tsx` (новый) | B1 |
| `apps/web/core/components/ppm-canvas/code-block.tsx` (новый) | B2 |
| `apps/web/core/components/ppm-canvas/canvas-pages.ts` (новый) | B3 |
| `apps/web/core/components/ppm-canvas/canvas-page-picker.tsx` (новый) | B3 |
| `apps/web/core/components/ppm-canvas/canvas-external-content.ts` (новый/заглушка F) | B4 |
| `apps/web/core/components/ppm-canvas/canvas-file-kind.ts` (новый) | B4, B5 |
| `apps/web/core/components/ppm-canvas/file-preview.tsx` (новый) | B5 |
| `apps/web/core/components/ppm-canvas/canvas-checklist.ts` (новый) | B6 |
| `apps/web/core/components/ppm-canvas/canvas-image-migration.ts` (новый) | B6 |
| `apps/web/core/components/ppm-canvas/shape.tsx` | B1, B2, B3, B5, B6 |
| `apps/web/core/components/ppm-canvas/editor.tsx` (блоки B) | B1, B3, B4, B5, B6 |
| `apps/web/core/components/ppm-canvas/canvas-content.css` (создаёт F пустым) | B1–B6 |
| `apps/web/core/services/ppm-canvas.service.ts` | B3 |
| `apps/web/core/services/ppm-vault.service.ts` | B5 |
| `packages/ppm-brand/src/translations/af21-canvas.ts` (блок «B») | B1–B6 |
| `apps/web/tests/ppm-canvas/{note-markdown,code-block,content-pages,files-external-content,files-preview,content-checklist-migration}.test.ts` (новые) | B1–B6 |
| `packages/editor/**` | B7 — не трогаем (решение) |

Порядок внутри линии — последовательный: B1 → B2 → B3 → B4 → B5 → B6 (B7 — только решение). Общие модули
(`canvas-code.ts`, `canvas-content-actions.ts`) создаёт B1, следующие задачи дописывают их точечными правками.

---

### Task B1: Заметка v2 — Markdown, формулы KaTeX, подсветка кода, «Сделать задачей» и «Сделать документом»

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-code.ts`, `canvas-markdown.ts`, `canvas-content-actions.ts`,
  `canvas-placement.ts`, `note-markdown.tsx`
- Modify: `apps/web/core/components/ppm-canvas/shape.tsx` — импорты `:87-105`, `NodeEditor` `:552`
- Modify: `apps/web/core/components/ppm-canvas/editor.tsx` — импорты `:49-137`, `createProjectionShape` `:1290-1308`,
  блок B после `createWorkItem` (`:1352-1363`), провайдер вокруг `<Tldraw>` (`:2221-2229`), уведомление после
  `fileDropNotice` (`:2248-2255`)
- Modify: `apps/web/core/components/ppm-canvas/canvas-content.css`, `packages/ppm-brand/src/translations/af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/note-markdown.test.ts` (новый)

**Interfaces:**
- Consumes (F): `note.format: "plain" | "markdown"` (новые — `"markdown"`), `createPpmCanvasNode({ kind: "note" })`
  с `format: "markdown"`; пакеты `marked`, `dompurify`, `katex`, `lowlight`; `canvas-content.css` импортирован;
  `AF21_CANVAS_TRANSLATIONS` с блоком «B». Существующие: `usePpmCanvasGrammarV2`, `OWN_NODE_KIND_KEYS`,
  `fillCanvasTemplate` (`canvas-grammar.ts:9-80`), `OwnNodeGlyph` (`live-card.tsx`), `PPM_CANVAS_NODE_REGISTRY`
  (`@ppm/canvas`, `work_item_ref` 360×248, `page_ref` 360×240), `ProjectPageService.create`, `EPageAccess` (`@plane/types`).
- Produces: `canvas-code.ts` — `escapeHtml`, `normalizeCodeLanguage`, `codeLanguageLabel`, `CANVAS_CODE_LANGUAGES`,
  `CODE_LANGUAGE_LABELS`, `CODE_HIGHLIGHT_MAX_CHARS`, `highlightCodeLines`, `highlightCodeHtml`, тип `TCodeSegment`;
  `canvas-markdown.ts` — `renderCanvasMarkdown`, `markdownToPageHtml`, `sanitizeCanvasHtml`, `noteTaskName`,
  `CANVAS_MARKDOWN_MAX_CHARS`; `canvas-content-actions.ts` — `PpmCanvasContentActionsContext`,
  `TPpmCanvasContentActions`; `canvas-placement.ts` — `findSpotBeside`, `rectsOverlap`, `TPlacementRect`;
  `note-markdown.tsx` — `NoteCardV2`; `editor.tsx` — `createProjectionShape(binding, placement?)`; классы
  `.ppm-note-card`, `.ppm-note-markdown`; ключи `canvas.note_make_task`, `canvas.note_make_document`,
  `canvas.note_empty`, `canvas.note_markdown_hint`, `canvas.note_title_placeholder`, `canvas.note_untitled`,
  `canvas.note_task_created`, `canvas.note_document_created`, `canvas.note_action_error`, `canvas.content_notice_close`.

- [ ] **Step 0: Проверить контракты F** (ничего не правит; при провале — стоп и запись в `plan-B-needs.md`)
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork && \
  grep -nE '"(marked|dompurify|katex|lowlight)"' apps/web/package.json && \
  ls apps/web/node_modules/marked apps/web/node_modules/dompurify apps/web/node_modules/katex apps/web/node_modules/lowlight >/dev/null && \
  grep -n 'format' packages/ppm-canvas/src/index.ts | grep -n 'plain' && \
  grep -nE 'theme|locked|wrap' packages/ppm-canvas/src/index.ts | head -5 && \
  grep -n 'work_item_id' packages/ppm-canvas/src/index.ts | head -3 && \
  grep -n 'canvas-content.css' apps/web/core/components/ppm-canvas/editor.tsx && \
  grep -n 'AF21_CANVAS_TRANSLATIONS' packages/ppm-brand/src/index.ts
  ```
  Ожидается: четыре строки зависимостей, строка `format: z.enum(["plain", "markdown"])` (или эквивалент), поля кода,
  `work_item_id` у пунктов чек-листа, импорт `./canvas-content.css`, подключение модуля переводов.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-code.ts apps/web/core/components/ppm-canvas/canvas-markdown.ts \
    apps/web/core/components/ppm-canvas/canvas-content-actions.ts apps/web/core/components/ppm-canvas/canvas-placement.ts \
    apps/web/core/components/ppm-canvas/note-markdown.tsx apps/web/core/components/ppm-canvas/shape.tsx \
    apps/web/core/components/ppm-canvas/editor.tsx apps/web/core/components/ppm-canvas/canvas-content.css \
    packages/ppm-brand/src/translations/af21-canvas.ts apps/web/tests/ppm-canvas/note-markdown.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/note-markdown.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { highlightCodeHtml, normalizeCodeLanguage } from "@/components/ppm-canvas/canvas-code";
  import {
    markdownToPageHtml,
    noteTaskName,
    renderCanvasMarkdown,
    sanitizeCanvasHtml,
  } from "@/components/ppm-canvas/canvas-markdown";
  import { findSpotBeside } from "@/components/ppm-canvas/canvas-placement";

  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/${name}`, import.meta.url), "utf8");
  const shapeSource = read("shape.tsx");
  const noteSource = read("note-markdown.tsx");
  const editorSource = read("editor.tsx");

  describe("note card v2: Markdown, KaTeX, code (AF2.1 B1)", () => {
    it("renders Markdown structure and safe links", () => {
      const html = renderCanvasMarkdown("## Калибровка\n\n- красный\n- синий\n\n[Замеры](https://example.org/a.csv)");
      expect(html).toContain("<h2>Калибровка</h2>");
      expect(html).toContain("<li>красный</li>");
      expect(html).toContain(
        '<a href="https://example.org/a.csv" rel="noopener noreferrer nofollow" target="_blank">Замеры</a>'
      );
    });

    it("never passes raw HTML, unsafe links or remote images through", () => {
      const html = renderCanvasMarkdown(
        "<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[x](javascript:alert(1)) ![logo](https://evil.example/p.png)"
      );
      expect(html).not.toMatch(/<script|<img/i);
      expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(html).not.toContain('href="javascript:');
      expect(html).not.toContain("evil.example");
      expect(html).toContain("logo");
    });

    it("renders LaTeX with KaTeX inline and as a block, never throws and trusts nothing", () => {
      const html = renderCanvasMarkdown(
        "Порог $\\Delta E < 12$.\n\n$$\n\\Delta E = \\sqrt{(L_1-L_2)^2}\n$$\n\nОшибка $\\frac{1}{$ и $\\href{javascript:alert(1)}{x}$"
      );
      expect(html).toContain('<span class="katex">');
      expect(html).toContain('class="katex-display"');
      expect(html).toContain("katex-error");
      expect(html).not.toContain('href="javascript');
      expect(renderCanvasMarkdown("Цена $5 и $6")).not.toContain("katex");
      expect(renderCanvasMarkdown("Цена \\$5")).not.toContain("katex");
    });

    it("highlights fenced code locally with lowlight", () => {
      const html = renderCanvasMarkdown("```py\ndef classify(lab):\n    return lab\n```");
      expect(html).toContain('<code class="hljs language-python">');
      expect(html).toContain('<span class="hljs-keyword">def</span>');
      expect(normalizeCodeLanguage("py")).toBe("python");
      expect(normalizeCodeLanguage("text")).toBe("plaintext");
      expect(normalizeCodeLanguage("brainfuck")).toBe("plaintext");
      expect(highlightCodeHtml("<b>&", "plaintext")).toBe("&lt;b&gt;&amp;");
    });

    it("fails closed without a DOM: the sanitizer escapes instead of passing HTML", () => {
      expect(sanitizeCanvasHtml("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
    });

    it("builds Documents HTML without KaTeX markup and names tasks after the note", () => {
      const html = markdownToPageHtml("# Отчёт\n\nПорог $\\Delta E$\n\n$$x^2$$\n\n<b>x</b>");
      expect(html).toContain("<h1>Отчёт</h1>");
      expect(html).toContain("<code>$\\Delta E$</code>");
      expect(html).toContain("<pre><code>$$x^2$$</code></pre>");
      expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
      expect(html).not.toContain("katex");
      expect(noteTaskName("", "## Замерить при лампе\n\nтекст")).toBe("Замерить при лампе");
      expect(noteTaskName("  Порог ΔE  ", "")).toBe("Порог ΔE");
      expect(noteTaskName("", "   ")).toBe("");
      expect(noteTaskName("x".repeat(300), "")).toHaveLength(255);
    });

    it("places the new card beside the note without overlapping", () => {
      const note = { x: 0, y: 0, w: 320, h: 220 };
      expect(findSpotBeside(note, { w: 360, h: 180 }, [note])).toEqual({ x: 344, y: 0 });
      const blocker = { x: 344, y: 0, w: 360, h: 180 };
      expect(findSpotBeside(note, { w: 360, h: 180 }, [note, blocker])).toEqual({ x: 344, y: 204 });
    });

    it("mounts the Markdown note only under grammar v2 and sanitizes before injecting", () => {
      expect(shapeSource).toMatch(/grammarV2 && node\.kind === "note" && node\.format === "markdown"/);
      expect(noteSource).toContain('import "katex/dist/katex.min.css";');
      expect(noteSource).not.toMatch(/https?:\/\//);
      expect(noteSource).toMatch(/useMemo\(\s*\(\)\s*=>\s*sanitizeCanvasHtml\(\s*renderCanvasMarkdown\(/);
      expect(noteSource).toContain("dangerouslySetInnerHTML={{ __html: html }}");
      expect(editorSource).toContain("<PpmCanvasContentActionsContext.Provider value={contentActions}>");
    });

    it("names the note actions in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.note_make_task")).toBe("Сделать задачей");
      expect(getPpmTranslation("ru", "canvas.note_make_document")).toBe("Сделать документом");
      expect(getPpmTranslation("en", "canvas.note_make_task")).toBe("Make a task");
      expect(getPpmTranslation("en", "canvas.note_make_document")).toBe("Make a document");
    });
  });
  ```
  Запуск:
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/note-markdown.test.ts
  ```
  Ожидается FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-code"`.

- [ ] **Step 3: `canvas-code.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { common, createLowlight } from "lowlight";

  // AF2.1 B1/B2: локальная подсветка (lowlight = highlight.js, набор common). Без сети и без innerHTML в блоке кода:
  // дерево hast превращается в плоские сегменты; HTML-строка для заметок собирается с экранированием.
  const lowlight = createLowlight(common);

  /** Выше этого размера подсветка выключается: 300 фигур без просадки (инвариант спецификации). */
  export const CODE_HIGHLIGHT_MAX_CHARS = 20_000;

  export const CODE_LANGUAGE_LABELS: Readonly<Record<string, string>> = {
    plaintext: "Plain Text",
    arduino: "Arduino",
    bash: "Bash",
    c: "C",
    cpp: "C++",
    csharp: "C#",
    css: "CSS",
    diff: "Diff",
    go: "Go",
    graphql: "GraphQL",
    ini: "INI",
    java: "Java",
    javascript: "JavaScript",
    json: "JSON",
    kotlin: "Kotlin",
    less: "Less",
    lua: "Lua",
    makefile: "Makefile",
    markdown: "Markdown",
    objectivec: "Objective-C",
    perl: "Perl",
    php: "PHP",
    "php-template": "PHP Template",
    python: "Python",
    "python-repl": "Python REPL",
    r: "R",
    ruby: "Ruby",
    rust: "Rust",
    scss: "SCSS",
    shell: "Shell",
    sql: "SQL",
    swift: "Swift",
    typescript: "TypeScript",
    vbnet: "VB.NET",
    wasm: "WebAssembly",
    xml: "XML / HTML",
    yaml: "YAML",
  };

  /** «Plain Text» первым, затем языки lowlight common по подписи. */
  export const CANVAS_CODE_LANGUAGES: readonly string[] = [
    "plaintext",
    ...lowlight
      .listLanguages()
      .filter((language) => language !== "plaintext")
      .sort((left, right) =>
        (CODE_LANGUAGE_LABELS[left] ?? left).localeCompare(CODE_LANGUAGE_LABELS[right] ?? right, "en")
      ),
  ];

  const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
    "": "plaintext",
    text: "plaintext",
    txt: "plaintext",
    plain: "plaintext",
    "plain text": "plaintext",
    tex: "plaintext",
    latex: "plaintext",
    py: "python",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    sh: "bash",
    zsh: "bash",
    yml: "yaml",
    html: "xml",
    htm: "xml",
    svg: "xml",
    md: "markdown",
    "c++": "cpp",
    "c#": "csharp",
    cs: "csharp",
    rs: "rust",
    rb: "ruby",
    kt: "kotlin",
    golang: "go",
    h: "c",
    hpp: "cpp",
    m: "objectivec",
    pl: "perl",
    vb: "vbnet",
    mk: "makefile",
  };

  export function normalizeCodeLanguage(value: string | null | undefined): string {
    const key = (value ?? "").trim().toLowerCase();
    const candidate = LANGUAGE_ALIASES[key] ?? key;
    return candidate && lowlight.registered(candidate) ? candidate : "plaintext";
  }

  export function codeLanguageLabel(language: string): string {
    const normalized = normalizeCodeLanguage(language);
    return CODE_LANGUAGE_LABELS[normalized] ?? normalized;
  }

  export function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  export type TCodeSegment = { className: string; text: string };

  // Минимальная форма узла hast (lowlight отдаёт Root); тип «hast» напрямую apps/web недоступен (isolated linker).
  type THastNode = {
    children?: THastNode[];
    properties?: { className?: unknown };
    type: string;
    value?: string;
  };

  function collectSegments(node: THastNode, classes: readonly string[], out: TCodeSegment[]) {
    if (node.type === "text") {
      out.push({ className: classes.join(" "), text: node.value ?? "" });
      return;
    }
    const own = Array.isArray(node.properties?.className) ? (node.properties.className as string[]) : [];
    const next = own.length > 0 ? [...classes, ...own] : classes;
    for (const child of node.children ?? []) collectSegments(child, next, out);
  }

  /** Строки кода с сегментами подсветки; токен, занимающий несколько строк, режется по `\n`. */
  export function highlightCodeLines(code: string, language: string): TCodeSegment[][] {
    const normalized = normalizeCodeLanguage(language);
    const segments: TCodeSegment[] = [];
    if (normalized === "plaintext" || code.length > CODE_HIGHLIGHT_MAX_CHARS) {
      segments.push({ className: "", text: code });
    } else {
      collectSegments(lowlight.highlight(normalized, code) as unknown as THastNode, [], segments);
    }
    const lines: TCodeSegment[][] = [[]];
    for (const segment of segments) {
      segment.text.split("\n").forEach((part, index) => {
        if (index > 0) lines.push([]);
        if (part) lines[lines.length - 1].push({ className: segment.className, text: part });
      });
    }
    return lines;
  }

  /** Экранированный HTML подсветки (для заметок; перед вставкой всё равно проходит sanitizeCanvasHtml). */
  export function highlightCodeHtml(code: string, language: string): string {
    return highlightCodeLines(code, language)
      .map((line) =>
        line
          .map((segment) =>
            segment.className
              ? `<span class="${escapeHtml(segment.className)}">${escapeHtml(segment.text)}</span>`
              : escapeHtml(segment.text)
          )
          .join("")
      )
      .join("\n");
  }
  ```

- [ ] **Step 4: `canvas-markdown.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import DOMPurify from "dompurify";
  import katex from "katex";
  import { Marked, type RendererObject, type TokenizerAndRendererExtension } from "marked";
  import { escapeHtml, highlightCodeHtml, normalizeCodeLanguage } from "./canvas-code";

  // AF2.1 B1: Markdown заметки. Три слоя защиты: (1) сырой HTML экранируется в marked (renderer.html), картинки не
  // рендерятся, опасные ссылки превращаются в текст; (2) KaTeX с trust:false; (3) DOMPurify перед вставкой в DOM.

  /** Совпадает с лимитом поля body заметки (packages/ppm-canvas: sharedOwnedNodeFields.body ≤ 50 000). */
  export const CANVAS_MARKDOWN_MAX_CHARS = 50_000;
  const SAFE_HREF = /^(?:https?:|mailto:|\/(?!\/)|#)/i;

  function renderMath(tex: string, displayMode: boolean): string {
    return katex.renderToString(tex, {
      displayMode,
      maxExpand: 200,
      maxSize: 20,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: false,
      trust: false,
    });
  }

  type TMathRender = (tex: string, displayMode: boolean) => string;

  function mathExtensions(render: TMathRender): TokenizerAndRendererExtension[] {
    return [
      {
        name: "ppmMathBlock",
        level: "block",
        start(src) {
          return /^\$\$/m.exec(src)?.index;
        },
        tokenizer(src) {
          const match = /^\$\$[ \t]*\n?([\s\S]+?)\n?[ \t]*\$\$[ \t]*(?:\n+|$)/.exec(src);
          return match ? { type: "ppmMathBlock", raw: match[0], text: match[1].trim() } : undefined;
        },
        renderer(token) {
          return render(String(token.text), true);
        },
      },
      {
        name: "ppmMathInline",
        level: "inline",
        start(src) {
          const index = src.indexOf("$");
          return index < 0 ? undefined : index;
        },
        tokenizer(src) {
          // «$…$»: без пробела у границ и без цифры сразу после закрывающего — «$5 и $6» остаётся текстом.
          const match = /^\$(?!\s)((?:\\.|[^\\$\n])+?)(?<!\s)\$(?!\d)/.exec(src);
          return match ? { type: "ppmMathInline", raw: match[0], text: match[1] } : undefined;
        },
        renderer(token) {
          return render(String(token.text), false);
        },
      },
    ];
  }

  function safeRenderer(code: RendererObject["code"]): RendererObject {
    return {
      html({ text }) {
        return escapeHtml(text);
      },
      image({ text }) {
        // RB3: без внешних запросов — картинки из Markdown не загружаются, остаётся подпись.
        return escapeHtml(text);
      },
      link({ href, title, tokens }) {
        const label = this.parser.parseInline(tokens);
        if (!SAFE_HREF.test(href.trim())) return label;
        const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
        return `<a href="${escapeHtml(href.trim())}"${titleAttribute} rel="noopener noreferrer nofollow" target="_blank">${label}</a>`;
      },
      code,
    };
  }

  const noteMarkdown = new Marked({ async: false, breaks: true, gfm: true });
  noteMarkdown.use({
    extensions: mathExtensions((tex, displayMode) =>
      displayMode ? `<div class="ppm-note-math">${renderMath(tex, true)}</div>\n` : renderMath(tex, false)
    ),
    renderer: safeRenderer(({ text, lang }) => {
      const language = normalizeCodeLanguage(lang);
      return `<pre class="ppm-note-code"><code class="hljs language-${language}">${highlightCodeHtml(text, language)}</code></pre>\n`;
    }),
  });

  // «Сделать документом»: HTML для редактора «Документов» — без разметки KaTeX (её схема редактора не знает),
  // формулы остаются исходником в <code>, код — обычным <pre><code>.
  const pageMarkdown = new Marked({ async: false, breaks: true, gfm: true });
  pageMarkdown.use({
    extensions: mathExtensions((tex, displayMode) =>
      displayMode ? `<pre><code>${escapeHtml(`$$${tex}$$`)}</code></pre>\n` : `<code>${escapeHtml(`$${tex}$`)}</code>`
    ),
    renderer: safeRenderer(({ text, lang }) => {
      const language = normalizeCodeLanguage(lang);
      const languageClass = language === "plaintext" ? "" : ` class="language-${language}"`;
      return `<pre><code${languageClass}>${escapeHtml(text)}</code></pre>\n`;
    }),
  });

  /** HTML заметки до санитизации (в DOM — только через sanitizeCanvasHtml). */
  export function renderCanvasMarkdown(source: string): string {
    return noteMarkdown.parse(source.slice(0, CANVAS_MARKDOWN_MAX_CHARS)) as string;
  }

  export function markdownToPageHtml(source: string): string {
    return pageMarkdown.parse(source.slice(0, CANVAS_MARKDOWN_MAX_CHARS)) as string;
  }

  export function sanitizeCanvasHtml(html: string): string {
    // Без DOM (node, SSR) DOMPurify не работает: не пропускаем разметку вовсе.
    if (!DOMPurify.isSupported) return escapeHtml(html);
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target"],
      ALLOW_DATA_ATTR: false,
      FORBID_ATTR: ["srcset", "xlink:href", "formaction"],
      FORBID_TAGS: [
        "audio",
        "base",
        "button",
        "embed",
        "form",
        "iframe",
        "image",
        "img",
        "input",
        "link",
        "meta",
        "object",
        "select",
        "source",
        "style",
        "textarea",
        "use",
        "video",
      ],
      USE_PROFILES: { html: true, mathMl: true, svg: true },
    });
  }

  /** Имя задачи/документа: заголовок заметки или первая непустая строка без Markdown-префикса, ≤ 255. */
  export function noteTaskName(title: string, body: string): string {
    const fromTitle = title.trim();
    if (fromTitle) return fromTitle.slice(0, 255);
    const line = body
      .split("\n")
      .map((raw) => raw.replace(/^\s{0,3}(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|>\s*)/, "").trim())
      .find(Boolean);
    return (line ?? "").slice(0, 255);
  }
  ```
  `safeRenderer` возвращает `RendererObject`, поэтому у `link` контекстный `this` — рендерер marked 16 с
  `this.parser.parseInline`. Если tsc всё же даёт TS2683 на `this`, взять `link({ href, title, text })` и вместо
  `this.parser.parseInline(tokens)` вернуть `escapeHtml(text)`: форматирование внутри текста ссылки теряется,
  безопасность та же.

- [ ] **Step 5: `canvas-placement.ts` и `canvas-content-actions.ts` (новые)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // canvas-placement.ts — AF2.1 B: «рядом с карточкой без наложения» (заметка → задача/документ, чек-лист → задачи).
  export type TPlacementRect = { h: number; w: number; x: number; y: number };

  export function rectsOverlap(a: TPlacementRect, b: TPlacementRect, gap: number): boolean {
    return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  }

  /** Справа (шагами вниз), под, слева, над; если всё занято — справа ниже всех занятых. */
  export function findSpotBeside(
    anchor: TPlacementRect,
    size: { h: number; w: number },
    occupied: readonly TPlacementRect[],
    gap = 24
  ): { x: number; y: number } {
    const candidates: { x: number; y: number }[] = [];
    for (let step = 0; step < 6; step += 1)
      candidates.push({ x: anchor.x + anchor.w + gap, y: anchor.y + step * (size.h + gap) });
    candidates.push({ x: anchor.x, y: anchor.y + anchor.h + gap });
    candidates.push({ x: anchor.x - size.w - gap, y: anchor.y });
    candidates.push({ x: anchor.x, y: anchor.y - size.h - gap });
    const free = candidates.find((point) => !occupied.some((rect) => rectsOverlap({ ...point, ...size }, rect, gap)));
    if (free) return free;
    const bottom = Math.max(anchor.y + anchor.h, ...occupied.map((rect) => rect.y + rect.h));
    return { x: anchor.x + anchor.w + gap, y: bottom + gap };
  }
  ```
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { createContext } from "react";
  import type { TPpmCanvasShape } from "./shape";

  // canvas-content-actions.ts — AF2.1 B: действия карточек содержимого. Отдельный контекст, чтобы не менять форму
  // PpmWorkItemProjectionContext (волна 1). Реализации — блок «AF2.1 B» в editor.tsx; они сами ловят ошибки и
  // сообщают о результате через notify, промисы не отклоняются.
  export type TPpmCanvasContentActions = {
    canEdit: boolean;
    createPageFromNote: (anchor: TPpmCanvasShape, title: string, markdown: string) => Promise<void>;
    createTaskFromText: (anchor: TPpmCanvasShape, name: string) => Promise<void>;
    notify: (message: string) => void;
  };

  export const PpmCanvasContentActionsContext = createContext<TPpmCanvasContentActions>({
    canEdit: false,
    createPageFromNote: async () => undefined,
    createTaskFromText: async () => undefined,
    notify: () => undefined,
  });
  ```

- [ ] **Step 6: `note-markdown.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useContext, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
  import { FileText, ListTodo, LoaderCircle } from "lucide-react";
  import { stopEventPropagation, useValue, type Editor } from "tldraw";
  import type { TPpmCanvasOwnedNode } from "@ppm/canvas";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { OWN_NODE_KIND_KEYS } from "./canvas-grammar";
  import { PpmCanvasContentActionsContext } from "./canvas-content-actions";
  import { noteTaskName, renderCanvasMarkdown, sanitizeCanvasHtml } from "./canvas-markdown";
  import { OwnNodeGlyph } from "./live-card";
  import type { TPpmCanvasShape } from "./shape";
  // oxlint-disable-next-line import/no-unassigned-import -- KaTeX: стили и шрифты собирает Vite локально (без CDN)
  import "katex/dist/katex.min.css";

  type TNoteNode = Extract<TPpmCanvasOwnedNode, { kind: "note" }>;

  // AF2.1 B1 (K3): заметка — отрисованный Markdown с формулами; двойной клик или Enter — правка (состояние
  // редактирования tldraw), Esc или ⌘/Ctrl+Enter — обратно. «Сделать задачей» / «Сделать документом» — живые
  // источники рядом с заметкой (I1/I2).
  export function NoteCardV2({
    editor,
    node,
    onPatch,
    shape,
  }: {
    editor: Editor;
    node: TNoteNode;
    onPatch: (patch: Partial<Pick<TNoteNode, "body" | "title">>) => void;
    shape: TPpmCanvasShape;
  }) {
    const ppmT = usePpmTranslation();
    const actions = useContext(PpmCanvasContentActionsContext);
    const readonly = editor.getInstanceState().isReadonly;
    const editing = useValue("ppm note editing", () => editor.getEditingShapeId() === shape.id, [editor, shape.id]);
    const [busy, setBusy] = useState<"document" | "task">();
    const html = useMemo(() => sanitizeCanvasHtml(renderCanvasMarkdown(node.body)), [node.body]);
    const canAct = actions.canEdit && !readonly;

    const run = async (kind: "document" | "task") => {
      if (busy || !canAct) return;
      const name = noteTaskName(node.title, node.body) || ppmT("canvas.note_untitled");
      setBusy(kind);
      try {
        if (kind === "task") await actions.createTaskFromText(shape, name);
        else await actions.createPageFromNote(shape, name, node.body);
      } finally {
        setBusy(undefined);
      }
    };

    const onSourceKeyDown = (event: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
      event.stopPropagation();
      if (event.code === "Escape" || (event.code === "Enter" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        editor.setEditingShape(null);
      }
    };

    // Ссылка внутри отрисованного текста должна открываться, а не начинать перетаскивание карточки.
    const onViewPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if ((event.target as HTMLElement).closest("a")) event.stopPropagation();
    };

    return (
      <div className="ppm-note-card" data-editing={editing && !readonly ? true : undefined}>
        <header className="ppm-note-card__header">
          <span className="ppm-canvas-node__type">
            <OwnNodeGlyph kind="note" />
            {ppmT(OWN_NODE_KIND_KEYS.note)}
          </span>
          {canAct && (
            <div className="ppm-note-card__actions">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run("task")}
                onKeyDown={stopEventPropagation}
                onPointerDown={stopEventPropagation}
              >
                {busy === "task" ? <LoaderCircle aria-hidden="true" /> : <ListTodo aria-hidden="true" />}
                {ppmT("canvas.note_make_task")}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void run("document")}
                onKeyDown={stopEventPropagation}
                onPointerDown={stopEventPropagation}
              >
                {busy === "document" ? <LoaderCircle aria-hidden="true" /> : <FileText aria-hidden="true" />}
                {ppmT("canvas.note_make_document")}
              </button>
            </div>
          )}
        </header>
        {editing && !readonly ? (
          <>
            <input
              aria-label={ppmT("canvas.note_title_placeholder")}
              className="ppm-note-card__title-input"
              maxLength={160}
              placeholder={ppmT("canvas.note_title_placeholder")}
              value={node.title}
              onChange={(event) => onPatch({ title: event.currentTarget.value })}
              onKeyDown={onSourceKeyDown}
              onPointerDown={stopEventPropagation}
            />
            <textarea
              // oxlint-disable-next-line jsx_a11y/no-autofocus -- правка начинается двойным кликом или Enter
              autoFocus
              aria-label={ppmT("canvas.note_body_placeholder")}
              className="ppm-note-card__source"
              maxLength={50_000}
              spellCheck
              value={node.body}
              onChange={(event) => onPatch({ body: event.currentTarget.value })}
              onKeyDown={onSourceKeyDown}
              onPointerDown={stopEventPropagation}
              onWheelCapture={stopEventPropagation}
            />
            <small className="ppm-note-card__hint">{ppmT("canvas.note_markdown_hint")}</small>
          </>
        ) : (
          <>
            {node.title.trim() && <h3 className="ppm-note-card__title">{node.title}</h3>}
            {node.body.trim() ? (
              <div
                className="ppm-note-markdown"
                // oxlint-disable-next-line react/no-danger -- HTML прошёл sanitizeCanvasHtml (DOMPurify)
                dangerouslySetInnerHTML={{ __html: html }}
                onPointerDown={onViewPointerDown}
              />
            ) : (
              <p className="ppm-note-card__empty">{ppmT("canvas.note_empty")}</p>
            )}
          </>
        )}
      </div>
    );
  }
  ```
  Ключ `canvas.note_body_placeholder` уже есть в `PPM_TRANSLATIONS` (используется `shape.tsx:740`). Если
  `jsx_a11y/no-autofocus` не включён — строку `oxlint-disable` убрать (oxlint сообщает о лишней директиве).

- [ ] **Step 7: `shape.tsx` — маршрут карточки заметки v2**
  Импорты (после `import { LiveOpenLink, LiveSourceHeader, OwnNodeGlyph } from "./live-card";`, `:104`):
  ```ts
  import { NoteCardV2 } from "./note-markdown";
  ```
  `NodeEditor`, строка `:552`. Было:
  ```tsx
    return <NativeNodeCard editor={editor} node={node} shape={shape} />;
  }
  ```
  Стало:
  ```tsx
    // AF2.1 B1: новая заметка (format "markdown") — только под грамматикой v2; старые (plain) — как раньше (RB1).
    if (grammarV2 && node.kind === "note" && node.format === "markdown") {
      return (
        <NoteCardV2 editor={editor} node={node} shape={shape} onPatch={(patch) => updateNode(editor, shape, node, patch)} />
      );
    }
    return <NativeNodeCard editor={editor} node={node} shape={shape} />;
  }
  ```

- [ ] **Step 8: `editor.tsx` — размещение карточки задачи и действия содержимого**
  Импорты: в список из `@ppm/canvas` (`:49-86`) добавить `PPM_CANVAS_NODE_REGISTRY,`; в импорт `./canvas-grammar`
  (`:127`) — `fillCanvasTemplate`; после него:
  ```ts
  import { EPageAccess } from "@plane/types";
  import { ProjectPageService } from "@/services/page/project-page.service";
  import { PpmCanvasContentActionsContext, type TPpmCanvasContentActions } from "./canvas-content-actions";
  import { markdownToPageHtml, sanitizeCanvasHtml } from "./canvas-markdown";
  import { findSpotBeside, type TPlacementRect } from "./canvas-placement";
  ```
  (`EFileAssetType` уже импортируется из `@plane/types` на `:88` — объединить в один импорт.)

  `createProjectionShape`, `:1290-1308`. Было:
  ```ts
  const createProjectionShape = useCallback(
    async (binding: TPpmCanvasWorkItemBinding) => {
  ```
  и
  ```ts
      const id = binding.shape_id as TLShapeId;
      const position = findFreeNodePosition(activeEditor, node.visual.width, node.visual.height);
  ```
  Стало:
  ```ts
  const createProjectionShape = useCallback(
    async (binding: TPpmCanvasWorkItemBinding, placement?: { x: number; y: number }) => {
  ```
  и
  ```ts
      const id = binding.shape_id as TLShapeId;
      // AF2.1 B1: «Сделать задачей» кладёт карточку рядом с источником; остальные пути — как раньше.
      const position = placement
        ? { ...placement, inViewport: true }
        : findFreeNodePosition(activeEditor, node.visual.width, node.visual.height);
  ```
  Остальные вызовы (`bindWorkItem`, `createWorkItem`) передают один аргумент — не меняются.

  Блок B сразу после `createWorkItem` (`:1352-1363`):
  ```ts
  // ── AF2.1 B · действия содержимого (заметка → задача/документ) ──
  const pageService = useMemo(() => new ProjectPageService(), []);
  const [contentNotice, setContentNotice] = useState<string>();
  const occupiedPageRects = useCallback(
    (activeEditor: Editor): TPlacementRect[] =>
      activeEditor
        .getCurrentPageShapes()
        .filter((shape) => !["arrow", "line", "draw"].includes(shape.type))
        .map((shape) => activeEditor.getShapePageBounds(shape))
        .filter((bounds): bounds is NonNullable<typeof bounds> => Boolean(bounds))
        .map((bounds) => ({ h: bounds.h, w: bounds.w, x: bounds.x, y: bounds.y })),
    []
  );
  const spotBeside = useCallback(
    (anchor: TPpmCanvasShape, size: { h: number; w: number }) => {
      const activeEditor = editorRef.current;
      const bounds = activeEditor?.getShapePageBounds(anchor.id);
      if (!activeEditor || !bounds) return undefined;
      return findSpotBeside({ h: bounds.h, w: bounds.w, x: bounds.x, y: bounds.y }, size, occupiedPageRects(activeEditor));
    },
    [occupiedPageRects]
  );
  const createTaskFromText = useCallback(
    async (anchor: TPpmCanvasShape, name: string) => {
      if (!editableRef.current) return;
      const size = {
        h: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultHeight,
        w: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultWidth,
      };
      try {
        const binding = await service.createWorkItem(workspaceId, projectId, boardId, {
          name: name.slice(0, 255),
          shape_id: createShapeId(),
          client_operation_id: crypto.randomUUID(),
        });
        await createProjectionShape(binding, spotBeside(anchor, size));
        setContentNotice(
          fillCanvasTemplate(ppmT("canvas.note_task_created"), {
            name: binding.source.identity.identifier ?? binding.source.display.title,
          })
        );
      } catch {
        setContentNotice(ppmT("canvas.note_action_error"));
      }
    },
    [boardId, createProjectionShape, ppmT, projectId, service, spotBeside, workspaceId]
  );
  const placePageBinding = useCallback(
    async (pageId: string, center?: { x: number; y: number }) => {
      const binding = await service.bindContent(workspaceId, projectId, boardId, {
        shape_id: createShapeId(),
        entity_type: "page",
        entity_id: pageId,
        client_operation_id: crypto.randomUUID(),
      });
      await createContentProjectionShape(binding, center);
    },
    [boardId, createContentProjectionShape, projectId, service, workspaceId]
  );
  const createPageFromNote = useCallback(
    async (anchor: TPpmCanvasShape, title: string, markdown: string) => {
      if (!editableRef.current) return;
      const size = { h: PPM_CANVAS_NODE_REGISTRY.page_ref.defaultHeight, w: PPM_CANVAS_NODE_REGISTRY.page_ref.defaultWidth };
      try {
        const page = await pageService.create(workspaceSlug, projectId, {
          access: EPageAccess.PUBLIC,
          description_html: sanitizeCanvasHtml(markdownToPageHtml(markdown)) || "<p></p>",
          name: title.slice(0, 255),
        });
        if (!page.id) throw new Error("Page id is missing.");
        const spot = spotBeside(anchor, size);
        await placePageBinding(page.id, spot ? { x: spot.x + size.w / 2, y: spot.y + size.h / 2 } : undefined);
        setContentNotice(fillCanvasTemplate(ppmT("canvas.note_document_created"), { name: page.name ?? title }));
      } catch {
        setContentNotice(ppmT("canvas.note_action_error"));
      }
    },
    [pageService, placePageBinding, ppmT, projectId, spotBeside, workspaceSlug]
  );
  // ── /AF2.1 B ──
  ```
  Блок B перед `const projectionContext = useMemo(` (`:2162`):
  ```ts
  // ── AF2.1 B · контекст действий содержимого ──
  const contentActions = useMemo<TPpmCanvasContentActions>(
    () => ({
      canEdit: effectiveCanEdit,
      createPageFromNote,
      createTaskFromText,
      notify: setContentNotice,
    }),
    [createPageFromNote, createTaskFromText, effectiveCanEdit]
  );
  // ── /AF2.1 B ──
  ```
  Провайдер — внутри `PpmSemanticEdgeFocusContext.Provider` (`:2220`), обернуть `<Tldraw …>…</Tldraw>`:
  ```tsx
                <PpmCanvasContentActionsContext.Provider value={contentActions}>
                  <Tldraw …без изменений…>…</Tldraw>
                </PpmCanvasContentActionsContext.Provider>
  ```
  Уведомление — сразу после блока `{fileDropNotice && (…)}` (`:2248-2255`), тем же механизмом PPM (Toasts tldraw скрыты):
  ```tsx
      {/* ── AF2.1 B · уведомление содержимого ── */}
      {grammarV2 && contentNotice && (
        <div className="ppm-canvas-file-drop-notice" data-ppm-notice="content" role="status">
          <span>{contentNotice}</span>
          <button type="button" aria-label={ppmT("canvas.content_notice_close")} onClick={() => setContentNotice(undefined)}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}
      {/* ── /AF2.1 B ── */}
  ```

- [ ] **Step 9: Стили** — дописать в `canvas-content.css`:
  ```css
  /* AF2.1 B1 · Заметка v2 (K3). Все селекторы — только облик v2 и рабочее пространство. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1rem;
    overflow: hidden;
    color: var(--ppm-color-text, var(--txt-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__actions {
    display: inline-flex;
    gap: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: var(--ppm-control-height-sm, 1.75rem);
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__actions svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.4;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown {
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    font-size: 0.8125rem;
    line-height: 1.55;
    overflow-wrap: anywhere;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown :where(h1, h2, h3, h4) {
    margin: 0.5rem 0 0.25rem;
    font-size: 0.9375rem;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown :where(p, ul, ol) {
    margin: 0 0 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown :where(ul, ol) {
    padding-left: 1.25rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown ul {
    list-style: disc;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown ol {
    list-style: decimal;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown a {
    color: var(--ppm-color-link, var(--txt-accent-primary));
    text-decoration: underline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown .ppm-note-math {
    margin: 0.5rem 0;
    overflow-x: auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-markdown .ppm-note-code {
    margin: 0 0 0.5rem;
    padding: 0.5rem 0.625rem;
    overflow-x: auto;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    background: var(--ppm-color-surface-2, var(--bg-layer-2));
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__source {
    min-height: 0;
    flex: 1 1 auto;
    resize: none;
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__title-input {
    font-size: 0.9375rem;
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__hint,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card__empty {
    margin: 0;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }
  ```
  Цвета подсветки `.hljs-*` задаёт B2 (общие для заметки и блока кода).

- [ ] **Step 10: Строки** — в блок «B» модуля `packages/ppm-brand/src/translations/af21-canvas.ts` (только ключи,
  которых там ещё нет; проверить `grep -n "canvas.note_make_task" packages/ppm-brand/src/translations/af21-canvas.ts`):
  ```ts
      // en (блок B)
      "canvas.note_make_task": "Make a task",
      "canvas.note_make_document": "Make a document",
      "canvas.note_empty": "Double-click or press Enter to write",
      "canvas.note_markdown_hint": "Markdown · $formula$ · ```code``` · Esc — done",
      "canvas.note_title_placeholder": "Title",
      "canvas.note_untitled": "Note from the canvas",
      "canvas.note_task_created": "Task {name} created next to the note",
      "canvas.note_document_created": "Document «{name}» created next to the note",
      "canvas.note_action_error": "Could not complete the action. Try again.",
      "canvas.content_notice_close": "Close the notice",
  ```
  ```ts
      // ru (блок B)
      "canvas.note_make_task": "Сделать задачей",
      "canvas.note_make_document": "Сделать документом",
      "canvas.note_empty": "Дважды щёлкните или нажмите Enter, чтобы писать",
      "canvas.note_markdown_hint": "Markdown · $формула$ · ```код``` · Esc — готово",
      "canvas.note_title_placeholder": "Заголовок",
      "canvas.note_untitled": "Заметка с холста",
      "canvas.note_task_created": "Задача {name} создана рядом с заметкой",
      "canvas.note_document_created": "Документ «{name}» создан рядом с заметкой",
      "canvas.note_action_error": "Не удалось выполнить действие. Повторите попытку.",
      "canvas.content_notice_close": "Закрыть уведомление",
  ```
  ```bash
  /Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pkg-build.sh ppm-brand
  ```
  Ожидается: `✔ Build complete` без ошибок.

- [ ] **Step 11: Проверка**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/note-markdown.test.ts
  ```
  Ожидается: `9 passed`. Затем формат, линт, типы:
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ../../node_modules/.bin/oxfmt \
    core/components/ppm-canvas/canvas-code.ts core/components/ppm-canvas/canvas-markdown.ts \
    core/components/ppm-canvas/canvas-content-actions.ts core/components/ppm-canvas/canvas-placement.ts \
    core/components/ppm-canvas/note-markdown.tsx core/components/ppm-canvas/shape.tsx \
    core/components/ppm-canvas/editor.tsx tests/ppm-canvas/note-markdown.test.ts
  cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxfmt packages/ppm-brand/src/translations/af21-canvas.ts && \
    node_modules/.bin/oxlint apps/web/core/components/ppm-canvas/{canvas-code,canvas-markdown,canvas-content-actions,canvas-placement}.ts \
    apps/web/core/components/ppm-canvas/note-markdown.tsx
  ```
  Ожидается `Found 0 warnings and 0 errors.`; фильтр tsc из Global Constraints — пусто. Весь набор web:
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run` — все зелёные (≈350 + новые).

**Acceptance (B1):**
- [ ] Критерий 3: на доске «Тест Холста» (проект 228) новая заметка показывает `## Заголовок`, списки, ссылку,
  `$\Delta E < 12$` и блок `$$…$$` KaTeX; ```` ```python ```` подсвечен; двойной клик/Enter — правка, Esc — просмотр.
- [ ] «Сделать задачей» создаёт задачу Plane (видна в «Задачах»), живая карточка — справа от заметки без наложения,
  уведомление «Задача ROBOT-… создана рядом с заметкой».
- [ ] «Сделать документом» создаёт документ в «Документах» с текстом заметки (формулы — исходником в коде), живая карточка
  документа рядом; «Убрать с холста» не удаляет задачу/документ (I1/I2).
- [ ] `<script>`, `<img onerror>`, `javascript:` в заметке отображаются текстом; во вкладке «Сеть» нет запросов вне API.
- [ ] v1 (`localStorage.ppm_design="v1"`) и старые заметки (`format: "plain"`) — прежний textarea.

---

### Task B2: Блок кода (K3, фото владельца) — номера строк, язык, тема, замок, «…»

**Files:**
- Create: `apps/web/core/components/ppm-canvas/code-block.tsx`
- Modify: `apps/web/core/components/ppm-canvas/canvas-code.ts` (дописать), `shape.tsx` (`NodeEditor`, после вставки B1),
  `note-markdown.tsx` (атрибут темы кода), `canvas-content.css`, `af21-canvas.ts` (блок «B»)
- Test: `apps/web/tests/ppm-canvas/code-block.test.ts` (новый)

**Interfaces:**
- Consumes (F): `code.language: string`, `code.theme: "light" | "dark" | "auto"`, `code.locked: boolean`, `code.wrap: boolean`
  (старые узлы мигрированы: `language` как было, `theme "auto"`, `locked false`, `wrap false`); B1: `highlightCodeLines`,
  `normalizeCodeLanguage`, `codeLanguageLabel`, `CANVAS_CODE_LANGUAGES`; `resolveGeneralTheme` (`@plane/utils`),
  `useTheme` (`next-themes`) — как в `editor.tsx:236-237`.
- Produces: `canvas-code.ts` — `codeFileExtension`, `codeDownloadName`, `insertSoftTab`, `nextCodeTheme`,
  `resolveCodeTheme`, `languageForFileName`, тип `TCodeTheme`; `code-block.tsx` — `CodeBlockCard`, тип `TCodePatch`;
  классы `.ppm-code-block`, `.ppm-code-block__*`, цвета `.hljs-*` для блока и заметки; ключи `canvas.code_theme`,
  `canvas.code_theme_auto`, `canvas.code_theme_light`, `canvas.code_theme_dark`, `canvas.code_language`,
  `canvas.code_lock`, `canvas.code_unlock`, `canvas.code_more`, `canvas.code_copy`, `canvas.code_copied`,
  `canvas.code_download`, `canvas.code_wrap`, `canvas.code_locked_hint`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/code-block.tsx apps/web/tests/ppm-canvas/code-block.test.ts
  ```
  (остальные файлы задачи уже сохранены в B1 — скрипт их пропускает).

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/code-block.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    CANVAS_CODE_LANGUAGES,
    codeDownloadName,
    codeFileExtension,
    codeLanguageLabel,
    highlightCodeLines,
    insertSoftTab,
    languageForFileName,
    nextCodeTheme,
    resolveCodeTheme,
  } from "@/components/ppm-canvas/canvas-code";

  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/${name}`, import.meta.url), "utf8");
  const shapeSource = read("shape.tsx");
  const codeSource = read("code-block.tsx");
  const css = read("canvas-content.css").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ");

  describe("code block card (AF2.1 B2, K3)", () => {
    it("offers Plain Text first and the lowlight common set", () => {
      expect(CANVAS_CODE_LANGUAGES[0]).toBe("plaintext");
      expect(CANVAS_CODE_LANGUAGES).toHaveLength(37);
      expect(CANVAS_CODE_LANGUAGES).toEqual(expect.arrayContaining(["python", "typescript", "json", "sql", "bash"]));
      expect(codeLanguageLabel("plaintext")).toBe("Plain Text");
      expect(codeLanguageLabel("text")).toBe("Plain Text");
      expect(codeLanguageLabel("cpp")).toBe("C++");
    });

    it("splits highlighted code into numbered lines, multi-line tokens included", () => {
      const lines = highlightCodeLines('x = 1\n"""doc\nstring"""\nreturn x', "python");
      expect(lines).toHaveLength(4);
      expect(lines[1].map((segment) => segment.className)).toContain("hljs-string");
      expect(lines[2][0]).toEqual({ className: "hljs-string", text: 'string"""' });
      expect(lines[3][0]).toEqual({ className: "hljs-keyword", text: "return" });
      expect(highlightCodeLines("a\n", "plaintext")).toEqual([[{ className: "", text: "a" }], []]);
    });

    it("downloads with the right extension and a safe name", () => {
      expect(codeFileExtension("python")).toBe("py");
      expect(codeFileExtension("typescript")).toBe("ts");
      expect(codeFileExtension("text")).toBe("txt");
      expect(codeDownloadName("Классификатор цвета", "python")).toBe("Классификатор цвета.py");
      expect(codeDownloadName('a/b:c*?"<>|', "json")).toBe("a b c.json");
      expect(codeDownloadName("  ", "sql")).toBe("code.sql");
      expect(languageForFileName("calibrate.PY")).toBe("python");
      expect(languageForFileName("data.csv")).toBe("plaintext");
    });

    it("inserts and removes two-space indents with Tab / Shift+Tab", () => {
      expect(insertSoftTab("ab", 1, 1, false)).toEqual({ value: "a  b", start: 3, end: 3 });
      expect(insertSoftTab("a\nb", 0, 3, false)).toEqual({ value: "  a\n  b", start: 2, end: 7 });
      expect(insertSoftTab("  a\n  b", 0, 7, true)).toEqual({ value: "a\nb", start: 0, end: 3 });
      expect(insertSoftTab("  ab", 2, 2, true)).toEqual({ value: "ab", start: 0, end: 0 });
    });

    it("cycles the block theme auto → light → dark and resolves auto by the app theme", () => {
      expect(nextCodeTheme("auto")).toBe("light");
      expect(nextCodeTheme("light")).toBe("dark");
      expect(nextCodeTheme("dark")).toBe("auto");
      expect(resolveCodeTheme("auto", true)).toBe("dark");
      expect(resolveCodeTheme("auto", false)).toBe("light");
      expect(resolveCodeTheme("light", true)).toBe("light");
    });

    it("mounts the K3 block only under grammar v2 and never executes or injects code", () => {
      expect(shapeSource).toMatch(/grammarV2 && node\.kind === "code"/);
      expect(codeSource).not.toMatch(/dangerouslySetInnerHTML|new Function|eval\(/);
      expect(codeSource).toContain('event.code === "Tab"');
      expect(codeSource).not.toMatch(/event\.key ===/);
      expect(css).toContain(':where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block[data-theme="dark"]');
    });

    it("names the toolbar in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.code_lock")).toBe("Только чтение");
      expect(getPpmTranslation("ru", "canvas.code_download")).toBe("Скачать файлом");
      expect(getPpmTranslation("ru", "canvas.code_wrap")).toBe("Перенос строк");
      expect(getPpmTranslation("en", "canvas.code_copy")).toBe("Copy");
    });
  });
  ```
  Запуск: `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/code-block.test.ts`
  → FAIL: `does not provide an export named 'codeDownloadName'`.

- [ ] **Step 3: `canvas-code.ts` — дописать в конец**
  ```ts
  // ── B2: блок кода ──
  export type TCodeTheme = "auto" | "dark" | "light";

  const CODE_FILE_EXTENSIONS: Readonly<Record<string, string>> = {
    plaintext: "txt",
    arduino: "ino",
    bash: "sh",
    c: "c",
    cpp: "cpp",
    csharp: "cs",
    css: "css",
    diff: "diff",
    go: "go",
    graphql: "graphql",
    ini: "ini",
    java: "java",
    javascript: "js",
    json: "json",
    kotlin: "kt",
    less: "less",
    lua: "lua",
    makefile: "mk",
    markdown: "md",
    objectivec: "m",
    perl: "pl",
    php: "php",
    "php-template": "php",
    python: "py",
    "python-repl": "py",
    r: "r",
    ruby: "rb",
    rust: "rs",
    scss: "scss",
    shell: "sh",
    sql: "sql",
    swift: "swift",
    typescript: "ts",
    vbnet: "vb",
    wasm: "wat",
    xml: "xml",
    yaml: "yaml",
  };

  export function codeFileExtension(language: string): string {
    return CODE_FILE_EXTENSIONS[normalizeCodeLanguage(language)] ?? "txt";
  }

  export function codeDownloadName(title: string, language: string): string {
    const base =
      title
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120) || "code";
    return `${base}.${codeFileExtension(language)}`;
  }

  /** Язык подсветки по имени файла («calibrate.py» → python); неизвестное — Plain Text. */
  export function languageForFileName(name: string): string {
    const extension = /\.([a-z0-9+#-]+)$/i.exec(name)?.[1] ?? "";
    return normalizeCodeLanguage(extension);
  }

  /** Tab — два пробела у курсора или у каждой строки выделения; Shift+Tab — снять до двух пробелов. */
  export function insertSoftTab(
    value: string,
    start: number,
    end: number,
    outdent: boolean
  ): { end: number; start: number; value: string } {
    const indent = "  ";
    if (!outdent && start === end) {
      return { end: start + indent.length, start: start + indent.length, value: value.slice(0, start) + indent + value.slice(end) };
    }
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.slice(lineStart, end);
    const lines = block.split("\n");
    const changed = lines.map((line) => (outdent ? line.replace(/^ {1,2}/, "") : indent + line));
    const nextBlock = changed.join("\n");
    const firstDelta = changed[0].length - lines[0].length;
    return {
      end: end + (nextBlock.length - block.length),
      start: Math.max(lineStart, start + firstDelta),
      value: value.slice(0, lineStart) + nextBlock + value.slice(end),
    };
  }

  export function nextCodeTheme(theme: TCodeTheme): TCodeTheme {
    return theme === "auto" ? "light" : theme === "light" ? "dark" : "auto";
  }

  export function resolveCodeTheme(theme: TCodeTheme, appDark: boolean): "dark" | "light" {
    if (theme === "auto") return appDark ? "dark" : "light";
    return theme;
  }
  ```
  Проверка по тесту: `insertSoftTab("a\nb", 0, 3, false)` → `lineStart = 0`, блок `"a\nb"` → `"  a\n  b"`, `start = 2`,
  `end = 7`; `insertSoftTab("  ab", 2, 2, true)` → блок `"  "` → `""`, `start = 0`, `end = 0`.

- [ ] **Step 4: `code-block.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useMemo, useState, type KeyboardEvent } from "react";
  import { Copy, Download, Ellipsis, Lock, LockOpen, Moon, Sun, SunMoon, WrapText } from "lucide-react";
  import { useTheme } from "next-themes";
  import { stopEventPropagation, useValue, type Editor } from "tldraw";
  import type { TPpmCanvasOwnedNode } from "@ppm/canvas";
  import { resolveGeneralTheme } from "@plane/utils";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import {
    CANVAS_CODE_LANGUAGES,
    codeDownloadName,
    codeLanguageLabel,
    highlightCodeLines,
    insertSoftTab,
    nextCodeTheme,
    normalizeCodeLanguage,
    resolveCodeTheme,
  } from "./canvas-code";
  import type { TPpmCanvasShape } from "./shape";

  type TCodeNode = Extract<TPpmCanvasOwnedNode, { kind: "code" }>;
  export type TCodePatch = Partial<Pick<TCodeNode, "code" | "language" | "locked" | "theme" | "title" | "wrap">>;

  const THEME_LABEL_KEYS = {
    auto: "canvas.code_theme_auto",
    dark: "canvas.code_theme_dark",
    light: "canvas.code_theme_light",
  } as const;

  // AF2.1 B2 (K3): блок кода — номера строк, подсветка lowlight, тема блока, замок, «…». Код только хранится и
  // показывается (executable: false в схеме): никакого eval/innerHTML — подсветка собирается React-элементами.
  export function CodeBlockCard({
    editor,
    node,
    onPatch,
    shape,
  }: {
    editor: Editor;
    node: TCodeNode;
    onPatch: (patch: TCodePatch) => void;
    shape: TPpmCanvasShape;
  }) {
    const ppmT = usePpmTranslation();
    const { resolvedTheme } = useTheme();
    const readonly = editor.getInstanceState().isReadonly;
    const locked = readonly || node.locked;
    const editingShape = useValue("ppm code editing", () => editor.getEditingShapeId() === shape.id, [editor, shape.id]);
    const editing = editingShape && !locked;
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const language = normalizeCodeLanguage(node.language);
    const lines = useMemo(() => highlightCodeLines(node.code, language), [language, node.code]);
    const theme = resolveCodeTheme(node.theme, resolveGeneralTheme(resolvedTheme) === "dark");

    const onSourceKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.stopPropagation();
      if (event.code === "Tab") {
        event.preventDefault();
        const target = event.currentTarget;
        const next = insertSoftTab(target.value, target.selectionStart, target.selectionEnd, event.shiftKey);
        onPatch({ code: next.value });
        requestAnimationFrame(() => target.setSelectionRange(next.start, next.end));
        return;
      }
      if (event.code === "Escape" || (event.code === "Enter" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        editor.setEditingShape(null);
      }
    };

    const copy = async () => {
      setMenuOpen(false);
      try {
        await navigator.clipboard.writeText(node.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
      } catch {
        setCopied(false);
      }
    };

    const download = () => {
      setMenuOpen(false);
      const url = URL.createObjectURL(new Blob([node.code], { type: "text/plain;charset=utf-8" }));
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = codeDownloadName(node.title, language);
      anchor.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="ppm-code-block" data-locked={node.locked || undefined} data-theme={theme}>
        <header className="ppm-code-block__toolbar">
          <button
            type="button"
            className="ppm-code-block__tool"
            aria-label={`${ppmT("canvas.code_theme")}: ${ppmT(THEME_LABEL_KEYS[node.theme])}`}
            title={`${ppmT("canvas.code_theme")}: ${ppmT(THEME_LABEL_KEYS[node.theme])}`}
            disabled={readonly}
            onClick={() => onPatch({ theme: nextCodeTheme(node.theme) })}
            onPointerDown={stopEventPropagation}
          >
            {node.theme === "dark" ? (
              <Moon aria-hidden="true" />
            ) : node.theme === "light" ? (
              <Sun aria-hidden="true" />
            ) : (
              <SunMoon aria-hidden="true" />
            )}
          </button>
          <select
            aria-label={ppmT("canvas.code_language")}
            className="ppm-code-block__language"
            disabled={readonly}
            value={language}
            onChange={(event) => onPatch({ language: event.currentTarget.value })}
            onKeyDown={stopEventPropagation}
            onPointerDown={stopEventPropagation}
          >
            {CANVAS_CODE_LANGUAGES.map((id) => (
              <option key={id} value={id}>
                {codeLanguageLabel(id)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="ppm-code-block__tool"
            aria-label={ppmT(node.locked ? "canvas.code_unlock" : "canvas.code_lock")}
            aria-pressed={node.locked}
            title={ppmT(node.locked ? "canvas.code_locked_hint" : "canvas.code_lock")}
            disabled={readonly}
            onClick={() => onPatch({ locked: !node.locked })}
            onPointerDown={stopEventPropagation}
          >
            {node.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          </button>
          <div className="ppm-code-block__menu-anchor">
            <button
              type="button"
              className="ppm-code-block__tool"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label={ppmT("canvas.code_more")}
              onClick={() => setMenuOpen((open) => !open)}
              onPointerDown={stopEventPropagation}
            >
              <Ellipsis aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="ppm-code-block__menu" role="menu">
                <button type="button" role="menuitem" onClick={() => void copy()} onPointerDown={stopEventPropagation}>
                  <Copy aria-hidden="true" />
                  {ppmT("canvas.code_copy")}
                </button>
                <button type="button" role="menuitem" onClick={download} onPointerDown={stopEventPropagation}>
                  <Download aria-hidden="true" />
                  {ppmT("canvas.code_download")}
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={node.wrap}
                  disabled={readonly}
                  onClick={() => {
                    setMenuOpen(false);
                    onPatch({ wrap: !node.wrap });
                  }}
                  onPointerDown={stopEventPropagation}
                >
                  <WrapText aria-hidden="true" />
                  {ppmT("canvas.code_wrap")}
                </button>
              </div>
            )}
          </div>
          {copied && (
            <span className="ppm-code-block__copied" role="status">
              {ppmT("canvas.code_copied")}
            </span>
          )}
        </header>
        <div
          className="ppm-code-block__body"
          data-wrap={node.wrap || undefined}
          onWheelCapture={editing ? stopEventPropagation : undefined}
        >
          <ol className="ppm-code-block__gutter" aria-hidden="true">
            {lines.map((_, index) => (
              <li key={index}>{index + 1}</li>
            ))}
          </ol>
          <div className="ppm-code-block__code">
            <pre aria-label={codeLanguageLabel(language)}>
              <code>
                {lines.map((line, lineIndex) => (
                  <span className="ppm-code-block__line" key={lineIndex}>
                    {line.map((segment, segmentIndex) => (
                      <span className={segment.className || undefined} key={segmentIndex}>
                        {segment.text}
                      </span>
                    ))}
                    {"\n"}
                  </span>
                ))}
              </code>
            </pre>
            {editing && (
              <textarea
                // oxlint-disable-next-line jsx_a11y/no-autofocus -- правка начинается двойным кликом или Enter
                autoFocus
                aria-label={ppmT("canvas.code_body_placeholder")}
                className="ppm-code-block__source"
                maxLength={100_000}
                spellCheck={false}
                value={node.code}
                wrap={node.wrap ? "soft" : "off"}
                onChange={(event) => onPatch({ code: event.currentTarget.value })}
                onKeyDown={onSourceKeyDown}
                onPointerDown={stopEventPropagation}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
  ```
  Ключ `canvas.code_body_placeholder` уже есть (`shape.tsx:779`). Замок: при `locked` состояние редактирования tldraw
  игнорируется (textarea не показывается), язык/тема/перенос меняются только снятием замка редактором проекта.

- [ ] **Step 5: `shape.tsx` — маршрут блока кода и тема кода в заметке**
  Импорт рядом с `NoteCardV2`: `import { CodeBlockCard } from "./code-block";`. В `NodeEditor` перед веткой заметки B1:
  ```tsx
    // AF2.1 B2: блок кода K3 — только под грамматикой v2; v1 — прежний NativeNodeCard (textarea + поле «Язык»).
    if (grammarV2 && node.kind === "code") {
      return (
        <CodeBlockCard editor={editor} node={node} shape={shape} onPatch={(patch) => updateNode(editor, shape, node, patch)} />
      );
    }
  ```
  `note-markdown.tsx` — тема подсветки кода в заметке следует теме приложения. Импорты: `import { useTheme } from
  "next-themes";`, `import { resolveGeneralTheme } from "@plane/utils";`. В теле после `const canAct = …`:
  ```tsx
    const { resolvedTheme } = useTheme();
    const codeTheme = resolveGeneralTheme(resolvedTheme) === "dark" ? "dark" : "light";
  ```
  Было: `<div className="ppm-note-card" data-editing={editing && !readonly ? true : undefined}>`
  Стало: `<div className="ppm-note-card" data-code-theme={codeTheme} data-editing={editing && !readonly ? true : undefined}>`

- [ ] **Step 6: Стили** — дописать в `canvas-content.css`:
  ```css
  /* AF2.1 B2 · Блок кода (K3) и подсветка hljs для блока и заметки. Палитра — своя, светлая/тёмная, ≥ 4.5:1. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card {
    --ppm-code-bg: #f6f8fa;
    --ppm-code-text: #1f2328;
    --ppm-code-gutter: #6e7781;
    --ppm-code-keyword: #cf222e;
    --ppm-code-string: #0a3069;
    --ppm-code-number: #0550ae;
    --ppm-code-comment: #57606a;
    --ppm-code-title: #8250df;
    --ppm-code-builtin: #953800;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block[data-theme="dark"],
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card[data-code-theme="dark"] {
    --ppm-code-bg: #0d1117;
    --ppm-code-text: #e6edf3;
    --ppm-code-gutter: #8b949e;
    --ppm-code-keyword: #ff7b72;
    --ppm-code-string: #a5d6ff;
    --ppm-code-number: #79c0ff;
    --ppm-code-comment: #8b949e;
    --ppm-code-title: #d2a8ff;
    --ppm-code-builtin: #ffa657;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block {
    display: flex;
    height: 100%;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-code-text, #1f2328);
    background: var(--ppm-code-bg, #f6f8fa);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__toolbar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.375rem;
    border-bottom: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__tool {
    display: inline-grid;
    width: var(--ppm-control-height-sm, 1.75rem);
    height: var(--ppm-control-height-sm, 1.75rem);
    place-items: center;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    color: inherit;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__tool svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__language {
    height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.375rem;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    color: inherit;
    background: transparent;
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu-anchor {
    position: relative;
    margin-left: auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu {
    position: absolute;
    z-index: 2;
    top: calc(100% + 0.25rem);
    right: 0;
    display: grid;
    min-width: 11rem;
    padding: 0.25rem;
    border: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.5rem;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    font-size: 0.75rem;
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__menu button[aria-checked="true"] {
    font-weight: 600;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__copied {
    font-size: 0.6875rem;
    color: var(--ppm-code-gutter, #6e7781);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__body {
    display: flex;
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.5rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__gutter {
    position: sticky;
    left: 0;
    margin: 0;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    color: var(--ppm-code-gutter, #6e7781);
    background: var(--ppm-code-bg, #f6f8fa);
    list-style: none;
    text-align: right;
    user-select: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__code {
    display: grid;
    min-width: 0;
    flex: 1 1 auto;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__code > :where(pre, textarea) {
    grid-area: 1 / 1;
    margin: 0;
    padding: 0.5rem 0.75rem 0.5rem 0.25rem;
    border: 0;
    font: inherit;
    line-height: inherit;
    tab-size: 2;
    white-space: pre;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__body[data-wrap] .ppm-code-block__code > :where(pre, textarea) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__source {
    overflow: hidden;
    resize: none;
    color: transparent;
    background: transparent;
    caret-color: var(--ppm-code-text, #1f2328);
    outline: none;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-code-block__line {
    display: inline;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-keyword, .hljs-selector-tag, .hljs-doctag) {
    color: var(--ppm-code-keyword, #cf222e);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-string, .hljs-regexp, .hljs-meta .hljs-string) {
    color: var(--ppm-code-string, #0a3069);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-number, .hljs-literal, .hljs-attr, .hljs-variable, .hljs-attribute) {
    color: var(--ppm-code-number, #0550ae);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-comment, .hljs-quote, .hljs-meta) {
    color: var(--ppm-code-comment, #57606a);
    font-style: italic;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-title, .hljs-section, .hljs-name) {
    color: var(--ppm-code-title, #8250df);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-code-block, .ppm-note-card) :where(.hljs-built_in, .hljs-type, .hljs-params) {
    color: var(--ppm-code-builtin, #953800);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-note-card .ppm-note-code {
    color: var(--ppm-code-text, #1f2328);
    background: var(--ppm-code-bg, #f6f8fa);
  }
  ```
  Внимание: внутри `:where(...)` здесь запятые — это допустимо для `canvas-content.css` (правило «без запятых внутри
  `:is()/:not()`» относится к тесту `canvas-v2-css.test.ts`, который делит список по запятой; наш тест ищет подстроку).

- [ ] **Step 7: Строки** — блок «B» `af21-canvas.ts`:
  ```ts
      // en
      "canvas.code_theme": "Block theme",
      "canvas.code_theme_auto": "as the app",
      "canvas.code_theme_light": "light",
      "canvas.code_theme_dark": "dark",
      "canvas.code_language": "Language",
      "canvas.code_lock": "Read only",
      "canvas.code_unlock": "Allow editing",
      "canvas.code_locked_hint": "Read only — unlock to edit",
      "canvas.code_more": "More actions",
      "canvas.code_copy": "Copy",
      "canvas.code_copied": "Copied",
      "canvas.code_download": "Download as a file",
      "canvas.code_wrap": "Wrap lines",
  ```
  ```ts
      // ru
      "canvas.code_theme": "Тема блока",
      "canvas.code_theme_auto": "как в приложении",
      "canvas.code_theme_light": "светлая",
      "canvas.code_theme_dark": "тёмная",
      "canvas.code_language": "Язык",
      "canvas.code_lock": "Только чтение",
      "canvas.code_unlock": "Разрешить правку",
      "canvas.code_locked_hint": "Только чтение — снимите замок, чтобы править",
      "canvas.code_more": "Ещё действия",
      "canvas.code_copy": "Копировать",
      "canvas.code_copied": "Скопировано",
      "canvas.code_download": "Скачать файлом",
      "canvas.code_wrap": "Перенос строк",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 8: Проверка**
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/code-block.test.ts tests/ppm-canvas/note-markdown.test.ts
  ```
  Ожидается: `16 passed`. Формат/линт/типы — как в B1 Step 11 для `canvas-code.ts`, `code-block.tsx`, `note-markdown.tsx`,
  `shape.tsx`, `tests/ppm-canvas/code-block.test.ts`, `af21-canvas.ts`.

**Acceptance (B2):**
- [ ] Критерий 3: блок кода на тестовой доске — номера строк, подсветка Python (как на фото владельца), смена языка
  (Plain Text первым), тема ☀/☾/авто, замок «только чтение» (двойной клик не открывает правку), «…»: Копировать,
  Скачать файлом (`<заголовок>.py`), Перенос строк.
- [ ] Tab/⇧Tab делают отступ 2 пробела, Esc/⌘Enter — выход из правки; горячие клавиши холста при вводе не срабатывают.
- [ ] Читатель видит блок, может копировать и скачать; правка/язык/тема/замок недоступны. v1 — прежняя карточка кода.

---

### Task B3: Документы — живая карточка, «Новый документ», «Документ PPM», превью из `description_html`

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-pages.ts`, `canvas-page-picker.tsx`
- Modify: `apps/web/core/services/ppm-canvas.service.ts` (метод `searchPages`, схема ответа)
- Modify: `canvas-content-actions.ts` (поля `createPage`, `openPagePicker`, `loadPageHtml`)
- Modify: `shape.tsx` — `ContentProjectionCard` `:2474-2584` (ветка страницы под v2)
- Modify: `editor.tsx` — блок B (создание/поиск/кеш превью, слушатель команд, выбор документа)
- Modify: `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/content-pages.test.ts` (новый)

**Interfaces:**
- Consumes: S — `GET /api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/projections/search/?types=page&q=&limit=`
  → `{ results: TPpmCanvasContentProjection[] (entity_type "page"), next_cursor }` (CONTRACTS §5; если S выберет
  отдельный путь `…/projections/pages/` — поменять одну строку в `searchPages`). **Запасной путь, пока S не готов:**
  `ProjectPageService.fetchAll(workspaceSlug, projectId)` (Plane `GET /api/workspaces/<slug>/projects/<pid>/pages/`
  отдаёт только свои и публичные страницы, `app/views/page/base.py:98`) с фильтром по имени на клиенте — выбирается
  автоматически при любой ошибке/несовпадении схемы серверного поиска. F — ветка `page` в `createPpmContentRefNode`
  (узел `page_ref` 360×240). R — id команд `add-document-page` («Новый документ») и `add-page-ref` («Документ PPM»)
  в `commands.ts`. Существующие: `ProjectPageService.fetchById(slug, pid, id, false)` (`description_html`),
  `ppmCanvasContentProjectionSchema` (`@ppm/canvas`), `formatDueDate`, `fillCanvasTemplate`, `useLazyPreview`.
- Produces: `PpmCanvasService.searchPages`, тип `TPpmCanvasPageSearchResponse`; `canvas-pages.ts` — `searchCanvasPages`,
  `formatPageUpdated`, `CANVAS_PAGE_SEARCH_LIMIT`, типы `TCanvasPageHit`, `TCanvasPageSearchDeps`;
  `canvas-page-picker.tsx` — `PpmCanvasPagePicker`; поля контекста `createPage`, `openPagePicker`, `loadPageHtml`;
  ключи `canvas.page_new`, `canvas.page_pick_title`, `canvas.page_search_placeholder`, `canvas.page_search_empty`,
  `canvas.page_search_fallback`, `canvas.page_untitled`, `canvas.page_updated`, `canvas.page_created`,
  `canvas.page_placed`, `canvas.page_preview_error`, `canvas.page_open`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-pages.ts apps/web/core/components/ppm-canvas/canvas-page-picker.tsx \
    apps/web/core/services/ppm-canvas.service.ts apps/web/tests/ppm-canvas/content-pages.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/content-pages.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it, vi } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { formatPageUpdated, searchCanvasPages } from "@/components/ppm-canvas/canvas-pages";

  const P1 = "11111111-1111-4111-8111-111111111111";
  const P2 = "22222222-2222-4222-8222-222222222222";
  const WS = "33333333-3333-4333-8333-333333333333";
  const PR = "44444444-4444-4444-8444-444444444444";
  const shapeSource = readFileSync(new URL("../../core/components/ppm-canvas/shape.tsx", import.meta.url), "utf8");

  function pageProjection(id: string, title: string, excerpt: string | null) {
    return {
      identity: { entity_type: "page" as const, entity_id: id, workspace_id: WS, project_id: PR, source_url: `/ws/projects/${PR}/pages/${id}` },
      display: {
        title,
        excerpt,
        extension: ".page",
        mime_type: "text/html",
        size_bytes: 10,
        preview_url: null,
        source_status: "active" as const,
      },
      capabilities: { read: true, update: true, delete_source: false },
      source_version: "2026-09-24T12:00:00+00:00",
    };
  }

  describe("Documents on the canvas (AF2.1 B3)", () => {
    it("uses the canvas pages search when the server supports it", async () => {
      const listProjectPages = vi.fn();
      const result = await searchCanvasPages("отчёт", {
        listProjectPages,
        searchServer: async () => ({
          results: [pageProjection(P1, "Отчёт о калибровке", "Датчик TCS34725…")],
          next_cursor: null,
        }),
      });
      expect(result).toEqual({
        source: "server",
        hits: [{ excerpt: "Датчик TCS34725…", id: P1, title: "Отчёт о калибровке" }],
      });
      expect(listProjectPages).not.toHaveBeenCalled();
    });

    it("falls back to the Plane pages list filtered on the client", async () => {
      const result = await searchCanvasPages("КАЛИБ", {
        listProjectPages: async () => [
          { id: P2, name: "Протокол калибровки", archived_at: null },
          { id: P1, name: "Калибровка: отчёт", archived_at: null },
          { id: "55555555-5555-4555-8555-555555555555", name: "Калибровка (архив)", archived_at: "2026-09-01T00:00:00Z" },
          { id: "66666666-6666-4666-8666-666666666666", name: "Спринт 4", archived_at: null },
        ],
        searchServer: async () => {
          throw new Error("404");
        },
      });
      expect(result.source).toBe("fallback");
      expect(result.hits.map((hit) => hit.id)).toEqual([P1, P2]);
    });

    it("shows when the document changed instead of a raw version", () => {
      expect(formatPageUpdated("2026-09-24T12:00:00+00:00", "ru", "изменён {date}")).toBe("изменён 24 сент.");
      expect(formatPageUpdated(null, "ru", "изменён {date}")).toBeNull();
      expect(formatPageUpdated("7", "ru", "изменён {date}")).toBeNull();
    });

    it("renders the page preview through the sanitizer and hides the «.page» pseudo-extension", () => {
      expect(shapeSource).toContain("sanitizeCanvasHtml(pageHtml)");
      expect(shapeSource).toMatch(/binding\.entity_type === "page" \? null/);
    });

    it("names the Documents actions in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.page_new")).toBe("Новый документ");
      expect(getPpmTranslation("ru", "canvas.page_pick_title")).toBe("Документ PPM");
      expect(getPpmTranslation("en", "canvas.page_new")).toBe("New document");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-pages"`.

- [ ] **Step 3: `ppm-canvas.service.ts` — поиск документов**
  Импорты: `import { z } from "zod";` в начало; в список из `@ppm/canvas` (`:3-41`) добавить
  `ppmCanvasContentProjectionSchema,`. После импортов (перед `const PPM_ASSET_API_BASE_URL`):
  ```ts
  // AF2.1 B3: поиск документов для Холста (сервер S). Ответ — проекции содержимого только типа «page».
  const ppmCanvasPageSearchResponseSchema = z.object({
    results: z.array(ppmCanvasContentProjectionSchema),
    next_cursor: z.string().nullable(),
  });
  export type TPpmCanvasPageSearchResponse = z.infer<typeof ppmCanvasPageSearchResponseSchema>;
  ```
  Метод — сразу после `searchWorkItems` (`:242-257`):
  ```ts
  async searchPages(
    workspaceId: string,
    projectId: string,
    query: string,
    cursor?: string,
    limit = 20
  ): Promise<TPpmCanvasPageSearchResponse> {
    try {
      const response = await this.get(`${this.projectPath(workspaceId, projectId)}/projections/search/`, {
        params: { types: "page", q: query, cursor, limit },
      });
      return ppmCanvasPageSearchResponseSchema.parse(response.data);
    } catch (error) {
      throw normalizeCanvasError(error);
    }
  }
  ```
  (Если сервер ещё отдаёт задачи на `types=page`, `parse` падает на `entity_type` — это и есть сигнал запасного пути.)

- [ ] **Step 4: `canvas-pages.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { TPage } from "@plane/types";
  import type { TPpmCanvasPageSearchResponse } from "@/services/ppm-canvas.service";
  import { fillCanvasTemplate, formatDueDate } from "./canvas-grammar";

  // AF2.1 B3: «Документ PPM» — поиск существующих документов. Основной путь — поиск Холста (S): только видимые
  // пользователю страницы проекта. Запасной — список Plane (свои + публичные) с фильтром по имени на клиенте.
  export const CANVAS_PAGE_SEARCH_LIMIT = 20;

  export type TCanvasPageHit = { excerpt: string | null; id: string; title: string };

  export type TCanvasPageSearchDeps = {
    listProjectPages: () => Promise<Partial<TPage>[]>;
    searchServer: (query: string) => Promise<TPpmCanvasPageSearchResponse>;
  };

  export async function searchCanvasPages(
    query: string,
    deps: TCanvasPageSearchDeps
  ): Promise<{ hits: TCanvasPageHit[]; source: "fallback" | "server" }> {
    const trimmed = query.trim();
    try {
      const response = await deps.searchServer(trimmed);
      return {
        hits: response.results
          .filter((result) => result.identity.entity_type === "page" && result.display.source_status !== "deleted")
          .slice(0, CANVAS_PAGE_SEARCH_LIMIT)
          .map((result) => ({
            excerpt: result.display.excerpt,
            id: result.identity.entity_id,
            title: result.display.title,
          })),
        source: "server",
      };
    } catch {
      const needle = trimmed.toLocaleLowerCase("ru");
      const pages = await deps.listProjectPages();
      const hits = pages
        .filter((page) => Boolean(page.id) && !page.archived_at)
        .map((page) => ({
          title: (page.name ?? "").trim(),
          id: page.id as string,
          updated: String(page.updated_at ?? ""),
        }))
        .filter((page) => !needle || page.title.toLocaleLowerCase("ru").includes(needle))
        .sort((left, right) => {
          const leftPrefix = left.title.toLocaleLowerCase("ru").startsWith(needle) ? 0 : 1;
          const rightPrefix = right.title.toLocaleLowerCase("ru").startsWith(needle) ? 0 : 1;
          return leftPrefix - rightPrefix || right.updated.localeCompare(left.updated) || left.title.localeCompare(right.title, "ru");
        })
        .slice(0, CANVAS_PAGE_SEARCH_LIMIT)
        .map(({ id, title }) => ({ excerpt: null, id, title }));
      return { hits, source: "fallback" };
    }
  }

  /** У страниц source_version = updated_at (ISO) — показываем «изменён 24 сент.», а не «v2026-09-24T…». */
  export function formatPageUpdated(
    sourceVersion: string | null | undefined,
    locale: string,
    template: string
  ): string | null {
    const date = /^(\d{4}-\d{2}-\d{2})T/.exec(sourceVersion ?? "")?.[1];
    return date ? fillCanvasTemplate(template, { date: formatDueDate(date, locale) }) : null;
  }
  ```
  Проверка сортировки теста: «Калибровка: отчёт» начинается с «калиб» (0), «Протокол калибровки» — нет (1) → `[P1, P2]`;
  архивная и «Спринт 4» отфильтрованы.

- [ ] **Step 5: `canvas-content-actions.ts` — новые поля**
  В тип `TPpmCanvasContentActions` добавить:
  ```ts
    /** «Новый документ»: создать страницу и положить живую карточку (свободное место в видимой области). */
    createPage: () => Promise<void>;
    /** HTML страницы для превью карточки (кеш по id и версии); null — недоступно. */
    loadPageHtml: (pageId: string, sourceVersion: string | null) => Promise<string | null>;
    /** «Документ PPM»: открыть поиск существующих документов. */
    openPagePicker: () => void;
  ```
  В значение по умолчанию: `createPage: async () => undefined, loadPageHtml: async () => null, openPagePicker: () => undefined,`.

- [ ] **Step 6: `canvas-page-picker.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useRef, useState, type KeyboardEvent } from "react";
  import { createPortal } from "react-dom";
  import { FileText, LoaderCircle, Search, X } from "lucide-react";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import { searchCanvasPages, type TCanvasPageHit, type TCanvasPageSearchDeps } from "./canvas-pages";

  // AF2.1 B3: «Документ PPM» — поиск существующих документов. Порталом в body: внутри редактора остаётся ровно один
  // [role="dialog"] (предпросмотр импорта, e2e-якорь).
  export function PpmCanvasPagePicker({
    deps,
    onClose,
    onPick,
  }: {
    deps: TCanvasPageSearchDeps;
    onClose: () => void;
    onPick: (hit: TCanvasPageHit) => Promise<void>;
  }) {
    const ppmT = usePpmTranslation();
    const [query, setQuery] = useState("");
    const [hits, setHits] = useState<TCanvasPageHit[]>([]);
    const [source, setSource] = useState<"fallback" | "server">("server");
    const [loading, setLoading] = useState(true);
    const [placing, setPlacing] = useState<string>();
    const requestRef = useRef(0);

    useEffect(() => {
      const request = ++requestRef.current;
      setLoading(true);
      const timer = window.setTimeout(() => {
        void searchCanvasPages(query, deps)
          .then((result) => {
            if (request !== requestRef.current) return;
            setHits(result.hits);
            setSource(result.source);
          })
          .catch(() => {
            if (request === requestRef.current) setHits([]);
          })
          .finally(() => {
            if (request === requestRef.current) setLoading(false);
          });
      }, 250);
      return () => window.clearTimeout(timer);
    }, [deps, query]);

    const pick = async (hit: TCanvasPageHit) => {
      if (placing) return;
      setPlacing(hit.id);
      try {
        await onPick(hit);
        onClose();
      } finally {
        setPlacing(undefined);
      }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.code === "Escape") onClose();
      if (event.code === "Enter" && hits[0] && event.target instanceof HTMLInputElement) void pick(hits[0]);
    };

    return createPortal(
      <div className="ppm-canvas-content-backdrop" role="presentation" onPointerDown={onClose}>
        <div
          aria-label={ppmT("canvas.page_pick_title")}
          aria-modal="true"
          className="ppm-canvas-page-picker"
          role="dialog"
          onKeyDown={onKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header>
            <strong>{ppmT("canvas.page_pick_title")}</strong>
            <button type="button" aria-label={ppmT("canvas.close")} onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </header>
          <label className="ppm-canvas-page-picker__search">
            <Search aria-hidden="true" />
            <input
              // oxlint-disable-next-line jsx_a11y/no-autofocus -- диалог открыт командой, ввод начинается сразу
              autoFocus
              aria-label={ppmT("canvas.page_search_placeholder")}
              placeholder={ppmT("canvas.page_search_placeholder")}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
            {loading && <LoaderCircle aria-hidden="true" />}
          </label>
          {source === "fallback" && <small>{ppmT("canvas.page_search_fallback")}</small>}
          <ul>
            {hits.map((hit) => (
              <li key={hit.id}>
                <button type="button" disabled={Boolean(placing)} onClick={() => void pick(hit)}>
                  <FileText aria-hidden="true" />
                  <span>
                    <strong>{hit.title || ppmT("canvas.page_untitled")}</strong>
                    {hit.excerpt && <small>{hit.excerpt}</small>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!loading && hits.length === 0 && <p>{ppmT("canvas.page_search_empty")}</p>}
        </div>
      </div>,
      window.document.body
    );
  }
  ```
  Ключ `canvas.close` уже есть (`editor.tsx:2251`).

- [ ] **Step 7: `shape.tsx` — карточка документа под v2** (`ContentProjectionCard`, `:2474-2584`)
  Импорты: `import { PpmCanvasContentActionsContext } from "./canvas-content-actions";`,
  `import { sanitizeCanvasHtml } from "./canvas-markdown";`, `import { formatPageUpdated } from "./canvas-pages";`.
  В начале функции (после `const grammarV2 = usePpmCanvasGrammarV2();`, `:2487`):
  ```tsx
    const contentActions = useContext(PpmCanvasContentActionsContext);
    const { currentLocale } = useTranslation();
    const pageId = binding?.entity_type === "page" ? binding.entity_id : undefined;
    const pageVersion = binding?.source_version ?? null;
    const cardEditor = useEditor();
    const visible = useLazyPreview(cardEditor, shape.id);
    const [pageHtml, setPageHtml] = useState<string | null>(null);
    useEffect(() => {
      if (!grammarV2 || !pageId || !visible) return;
      let active = true;
      void contentActions.loadPageHtml(pageId, pageVersion).then((html) => {
        if (active) setPageHtml(html);
      });
      return () => {
        active = false;
      };
    }, [contentActions, grammarV2, pageId, pageVersion, visible]);
  ```
  (все хуки — до раннего `return` для `!binding`, `:2489`). В `LiveSourceHeader` (`:2518-2524`, строка `:2521`) было:
  ```tsx
          identifier={display.extension ? display.extension.slice(1).toUpperCase() : null}
  ```
  стало:
  ```tsx
          identifier={binding.entity_type === "page" ? null : display.extension ? display.extension.slice(1).toUpperCase() : null}
  ```
  Абзац превью (`:2534` `{display.excerpt && <p>{display.excerpt}</p>}`) было → стало:
  ```tsx
      {grammarV2 && binding.entity_type === "page" && pageHtml ? (
        <div
          className="ppm-live-card__page-preview"
          // oxlint-disable-next-line react/no-danger -- description_html прошёл sanitizeCanvasHtml (DOMPurify)
          dangerouslySetInnerHTML={{ __html: sanitizeCanvasHtml(pageHtml) }}
        />
      ) : (
        display.excerpt && <p>{display.excerpt}</p>
      )}
  ```
  Строка версии под v2 (`:2537` `<span className="ppm-canvas-node__vault-meta ppm-live-card__version">{liveMeta}</span>`) —
  для страницы дата изменения:
  ```tsx
        <span className="ppm-canvas-node__vault-meta ppm-live-card__version">
          {binding.entity_type === "page"
            ? (formatPageUpdated(binding.source_version, currentLocale, ppmT("canvas.page_updated")) ?? "")
            : liveMeta}
        </span>
  ```
  `useTranslation` уже импортирован (`shape.tsx:89`), `useEditor`, `useEffect`, `useState` — тоже.

- [ ] **Step 8: `editor.tsx` — блок B «документы»** (после блока B1 «действия содержимого»):
  ```ts
  // ── AF2.1 B · документы (новый, поиск, превью) ──
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const pageHtmlCacheRef = useRef(new Map<string, string | null>());
  const freePageCenter = useCallback(() => {
    const activeEditor = editorRef.current;
    if (!activeEditor) return undefined;
    const size = PPM_CANVAS_NODE_REGISTRY.page_ref;
    const spot = findFreeNodePosition(activeEditor, size.defaultWidth, size.defaultHeight);
    return { x: spot.x + size.defaultWidth / 2, y: spot.y + size.defaultHeight / 2 };
  }, []);
  const createPage = useCallback(async () => {
    if (!editableRef.current) return;
    try {
      const name = ppmT("canvas.page_untitled");
      const page = await pageService.create(workspaceSlug, projectId, {
        access: EPageAccess.PUBLIC,
        description_html: "<p></p>",
        name,
      });
      if (!page.id) throw new Error("Page id is missing.");
      await placePageBinding(page.id, freePageCenter());
      setContentNotice(fillCanvasTemplate(ppmT("canvas.page_created"), { name: page.name ?? name }));
    } catch {
      setContentNotice(ppmT("canvas.note_action_error"));
    }
  }, [freePageCenter, pageService, placePageBinding, ppmT, projectId, workspaceSlug]);
  const loadPageHtml = useCallback(
    async (pageId: string, sourceVersion: string | null) => {
      const key = `${pageId}:${sourceVersion ?? ""}`;
      if (pageHtmlCacheRef.current.has(key)) return pageHtmlCacheRef.current.get(key) ?? null;
      try {
        const page = await pageService.fetchById(workspaceSlug, projectId, pageId, false);
        const html = page.description_html?.trim() ? page.description_html.slice(0, 200_000) : null;
        pageHtmlCacheRef.current.set(key, html);
        return html;
      } catch {
        pageHtmlCacheRef.current.set(key, null);
        return null;
      }
    },
    [pageService, projectId, workspaceSlug]
  );
  const pageSearchDeps = useMemo(
    () => ({
      listProjectPages: () => pageService.fetchAll(workspaceSlug, projectId),
      searchServer: (query: string) => service.searchPages(workspaceId, projectId, query),
    }),
    [pageService, projectId, service, workspaceId, workspaceSlug]
  );
  const placeExistingPage = useCallback(
    async (hit: { id: string; title: string }) => {
      try {
        await placePageBinding(hit.id, freePageCenter());
        setContentNotice(fillCanvasTemplate(ppmT("canvas.page_placed"), { name: hit.title || ppmT("canvas.page_untitled") }));
      } catch {
        setContentNotice(ppmT("canvas.note_action_error"));
      }
    },
    [freePageCenter, placePageBinding, ppmT]
  );
  useEffect(() => {
    // Команды рейки R: «Новый документ» и «Документ PPM». Свой слушатель — чтобы не пробрасывать пропсы в оверлей.
    const onCommand = (event: Event) => {
      const detail = (event as CustomEvent<TPpmCanvasCommandDetail>).detail;
      if (!grammarV2 || detail?.boardId !== boardId || !editableRef.current) return;
      if (detail.command === "add-document-page") void createPage();
      if (detail.command === "add-page-ref") setPagePickerOpen(true);
    };
    window.addEventListener(PPM_CANVAS_COMMAND_EVENT, onCommand);
    return () => window.removeEventListener(PPM_CANVAS_COMMAND_EVENT, onCommand);
  }, [boardId, createPage, grammarV2]);
  // ── /AF2.1 B ──
  ```
  В `contentActions` (блок B1) добавить `createPage, loadPageHtml, openPagePicker: () => setPagePickerOpen(true),` и эти
  зависимости в массив `useMemo`. Рядом с уведомлением содержимого (блок B1 в разметке) добавить:
  ```tsx
      {grammarV2 && pagePickerOpen && (
        <PpmCanvasPagePicker deps={pageSearchDeps} onClose={() => setPagePickerOpen(false)} onPick={placeExistingPage} />
      )}
  ```
  Импорт: `import { PpmCanvasPagePicker } from "./canvas-page-picker";`. Тип `TPpmCanvasCommandDetail` и
  `PPM_CANVAS_COMMAND_EVENT` уже импортированы (`editor.tsx:104`). Если R ещё не добавил `add-page-ref` в
  `PPM_CANVAS_COMMANDS`, tsc сообщит `TS2367` на сравнении — это нужда к R (`plan-B-needs.md`), не обходить приведением.

- [ ] **Step 9: Стили** — дописать в `canvas-content.css`:
  ```css
  /* AF2.1 B3 · Документ PPM: превью описания и выбор документа. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__page-preview {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    font-size: 0.8125rem;
    line-height: 1.5;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__page-preview :where(h1, h2, h3, p, ul, ol) {
    margin: 0;
    font-size: inherit;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-content-backdrop {
    position: fixed;
    z-index: 60;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: var(--ppm-color-backdrop, rgb(0 0 0 / 0.4));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker {
    display: grid;
    width: min(32rem, 100%);
    max-height: min(36rem, 90vh);
    gap: 0.5rem;
    padding: 1rem;
    overflow: auto;
    border-radius: var(--ppm-radius-lg, 0.75rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker header,
  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker__search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker__search input {
    min-width: 0;
    flex: 1 1 auto;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker li button {
    display: flex;
    width: 100%;
    gap: 0.5rem;
    padding: 0.5rem;
    border-radius: var(--ppm-radius-sm, 0.25rem);
    text-align: left;
  }

  :where(html[data-ppm-design="v2"]) .ppm-canvas-page-picker small {
    display: block;
    color: var(--ppm-color-text-muted, var(--txt-tertiary));
    font-size: 0.75rem;
  }
  ```
  (Диалог — портал в `body`, вне `[data-ppm-canvas-grammar]`, поэтому его селекторы ограничены только обликом v2.)

- [ ] **Step 10: Строки** — блок «B»:
  ```ts
      // en
      "canvas.page_new": "New document",
      "canvas.page_pick_title": "PPM document",
      "canvas.page_search_placeholder": "Find a document by title",
      "canvas.page_search_empty": "No documents found",
      "canvas.page_search_fallback": "Search by title only",
      "canvas.page_untitled": "Untitled document",
      "canvas.page_updated": "changed {date}",
      "canvas.page_created": "Document «{name}» created",
      "canvas.page_placed": "Document «{name}» placed on the canvas",
  ```
  ```ts
      // ru
      "canvas.page_new": "Новый документ",
      "canvas.page_pick_title": "Документ PPM",
      "canvas.page_search_placeholder": "Найти документ по названию",
      "canvas.page_search_empty": "Документы не найдены",
      "canvas.page_search_fallback": "Поиск только по названию",
      "canvas.page_untitled": "Документ без названия",
      "canvas.page_updated": "изменён {date}",
      "canvas.page_created": "Документ «{name}» создан",
      "canvas.page_placed": "Документ «{name}» добавлен на холст",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 11: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/content-pages.test.ts`
  → `5 passed`; затем формат/линт/tsc (B1 Step 11) для `canvas-pages.ts`, `canvas-page-picker.tsx`,
  `canvas-content-actions.ts`, `shape.tsx`, `editor.tsx`, `ppm-canvas.service.ts`, теста и `af21-canvas.ts`.

**Acceptance (B3):**
- [ ] Критерий 1: «Документ» (Новый документ) создаёт страницу в «Документах» и кладёт живую карточку; «Документ PPM»
  находит существующую (сервер S или запасной путь с подписью «Поиск только по названию») и кладёт карточку.
- [ ] Карточка документа (K3): «Документы», заголовок, превью 4 строки из `description_html` (санитизировано),
  «изменён 24 сент.», «Открыть ↗»; приватный документ другого пользователя не виден (сервер).
- [ ] «Убрать с холста» не удаляет документ; v1 — прежняя карточка содержимого.

---

### Task B4: Вставка, перетаскивание и ⌘U → Хранилище (обработчики внешнего контента tldraw)

**Files:**
- Create (или заменить заглушку F): `apps/web/core/components/ppm-canvas/canvas-external-content.ts`
- Create: `apps/web/core/components/ppm-canvas/canvas-file-kind.ts`
- Modify: `editor.tsx` — блок B после `uploadDropToWorkItem` (`:1926-1955`), `handleFileDrop` (`:1957-1973`),
  атрибуты `<Tldraw>` (`onMount`, `acceptedImageMimeTypes`, `:2221-2226`), подсказка перетаскивания в разметке
- Modify: `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/files-external-content.test.ts` (новый)

**Interfaces:**
- Consumes: tldraw `editor.externalContentHandlers` (публичное поле, `Editor.ts:8888`), `registerExternalContentHandler`,
  `putExternalContent`, `getShapeAtPoint(point, { hitInside: true })`, `TLExternalContent` (`files` — `{ files, point?,
  ignoreParent? }`, `url` — `{ url, point? }`, `svg-text` — `{ text, point? }`; `external-content.ts:39-76`); вставка
  блобов tldraw называет файл `tldrawFile` (`ui/hooks/clipboard/pasteFiles.ts:17-19`), Chrome — `image.png`; ⌘U →
  `helpers.insertMedia()` → `putExternalContent({ type: "files", point: центр видимой области })` с фильтром
  `accept` из `acceptedImageMimeTypes`+`acceptedVideoMimeTypes` (`ui/overrides.ts:37-50`, `Tldraw.tsx:154-178`).
  PPM: `vaultService.uploadFile(workspaceId, projectId, file)` (`ppm-vault.service.ts:172`), `PpmVaultServiceError.code`
  (`VAULT_NAME_CONFLICT` → 409, `VAULT_INVALID_FILE_TYPE`, `VAULT_FILE_TOO_LARGE`), `addUploadedContent`
  (`editor.tsx:1888`), `fileService.uploadProjectAsset` (`:1932`), `createPpmCanvasNode` (заметка F → `format: "markdown"`).
  F — точка `onMount` в `<Tldraw>`; S — приём имени от клиента и 409 при конфликте (уже так: `ppm_vault/services.py:147,204`).
- Produces: `canvas-external-content.ts` — `registerPpmCanvasExternalContent(editor, getDeps) → () => void`,
  `putFilesIntoVault`, `pastedFileName`, `withNameSuffix`, `isVaultNameConflict`, `uploadWithUniqueName`, `dropHintKey`,
  `PPM_PASTE_MAX_FILES`, тип `TPpmCanvasExternalContentDeps`; `canvas-file-kind.ts` — `PPM_VAULT_UPLOAD_EXTENSIONS`,
  `PPM_VAULT_ACCEPT`, `fileExtension`, `extensionForMime`, `isVaultUploadable`; в `editor.tsx` — `handleTldrawMount`,
  `getExternalContentDeps`; класс `.ppm-canvas-drop-hint`; ключи `canvas.paste_saved`, `canvas.paste_unsupported`,
  `canvas.paste_upload_error`, `canvas.paste_svg_unsupported`, `canvas.drop_hint_one|few|many`, `canvas.drop_attached`,
  `canvas.link_note_title`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-external-content.ts apps/web/core/components/ppm-canvas/canvas-file-kind.ts \
    apps/web/tests/ppm-canvas/files-external-content.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/files-external-content.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { afterEach, describe, expect, it, vi } from "vitest";
  import type { Editor } from "tldraw";
  import { getPpmTranslation } from "@ppm/brand";
  import {
    dropHintKey,
    pastedFileName,
    registerPpmCanvasExternalContent,
    type TPpmCanvasExternalContentDeps,
  } from "@/components/ppm-canvas/canvas-external-content";
  import { isVaultUploadable } from "@/components/ppm-canvas/canvas-file-kind";

  const editorSource = readFileSync(new URL("../../core/components/ppm-canvas/editor.tsx", import.meta.url), "utf8");
  const NOW = new Date(2026, 8, 25, 15, 30, 12);
  const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "image.png", { type: "image/png" });

  function createFakeEditor() {
    const previous = {
      files: vi.fn(async () => undefined),
      "svg-text": vi.fn(async () => undefined),
      url: vi.fn(async () => undefined),
    };
    const handlers: Record<string, ((info: unknown) => unknown) | null> = { ...previous };
    const fake = {
      externalContentHandlers: handlers,
      getViewportPageBounds: () => ({ center: { x: 500, y: 300 } }),
      putExternalContent: async (info: { type: string }) => handlers[info.type]?.(info),
      registerExternalContentHandler(type: string, handler: ((info: unknown) => unknown) | null) {
        handlers[type] = handler;
        return fake;
      },
    };
    return { editor: fake as unknown as Editor, handlers, previous };
  }

  function createDeps(overrides: Partial<TPpmCanvasExternalContentDeps> = {}) {
    const notices: string[] = [];
    const deps: TPpmCanvasExternalContentDeps = {
      canEdit: true,
      createLinkNote: vi.fn(),
      grammarV2: true,
      notify: (message) => notices.push(message),
      now: () => NOW,
      placeVaultEntry: vi.fn(async () => undefined),
      t: (key) => getPpmTranslation("ru", key),
      uploadToVault: vi.fn(async (file: File) => ({ id: `entry:${file.name}` })),
      ...overrides,
    };
    return { deps, notices };
  }

  afterEach(() => vi.restoreAllMocks());

  describe("paste, drop and ⌘U into the Vault (AF2.1 B4)", () => {
    it("gives pasted files a readable name and keeps real names", () => {
      expect(pastedFileName({ name: "image.png", type: "image/png" }, NOW)).toBe("Вставка-2026-09-25-153012.png");
      expect(pastedFileName({ name: "tldrawFile", type: "image/jpeg" }, NOW)).toBe("Вставка-2026-09-25-153012.jpg");
      expect(pastedFileName({ name: "Схема захвата.pdf", type: "application/pdf" }, NOW)).toBe("Схема захвата.pdf");
      expect(isVaultUploadable("Вставка-2026-09-25-153012.png")).toBe(true);
      expect(isVaultUploadable("anim.gif")).toBe(false);
    });

    it("uploads pasted files to the Vault and places live cards at the paste point", async () => {
      const { editor } = createFakeEditor();
      const { deps, notices } = createDeps();
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [png()], point: { x: 10, y: 20 } });
      expect(vi.mocked(deps.uploadToVault).mock.calls[0][0].name).toBe("Вставка-2026-09-25-153012.png");
      expect(deps.placeVaultEntry).toHaveBeenCalledWith("entry:Вставка-2026-09-25-153012.png", { x: 10, y: 20 }, 0);
      expect(notices.at(-1)).toContain("Сохранено в Хранилище: 1");
    });

    it("retries a name conflict with a numbered suffix", async () => {
      const { editor } = createFakeEditor();
      const conflict = Object.assign(new Error("Материал с таким именем уже существует."), { code: "VAULT_NAME_CONFLICT" });
      const uploadToVault = vi
        .fn<(file: File) => Promise<{ id: string }>>()
        .mockRejectedValueOnce(conflict)
        .mockResolvedValueOnce({ id: "entry-2" });
      const { deps } = createDeps({ uploadToVault });
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [png()] });
      expect(uploadToVault.mock.calls.map(([file]) => file.name)).toEqual([
        "Вставка-2026-09-25-153012.png",
        "Вставка-2026-09-25-153012 (2).png",
      ]);
      expect(deps.placeVaultEntry).toHaveBeenCalledWith("entry-2", { x: 500, y: 300 }, 0);
    });

    it("rejects formats the Vault does not accept with a Russian notice", async () => {
      const { editor } = createFakeEditor();
      const { deps, notices } = createDeps();
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [new File(["GIF89a"], "anim.gif", { type: "image/gif" })] });
      expect(deps.uploadToVault).not.toHaveBeenCalled();
      expect(notices.join(" ")).toContain("anim.gif");
      expect(notices.join(" ")).toContain("Хранилище не принимает");
    });

    it("keeps the v1 behaviour: delegates to the default tldraw handlers", async () => {
      const { editor, previous } = createFakeEditor();
      const { deps } = createDeps({ grammarV2: false });
      registerPpmCanvasExternalContent(editor, () => deps);
      const info = { type: "files" as const, files: [png()] };
      await editor.putExternalContent(info);
      expect(previous.files).toHaveBeenCalledWith(info);
      expect(deps.uploadToVault).not.toHaveBeenCalled();
    });

    it("turns a pasted URL into a link note without any network request", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const { editor } = createFakeEditor();
      const { deps } = createDeps();
      registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "url", url: "https://example.org/report", point: { x: 1, y: 2 } });
      expect(deps.createLinkNote).toHaveBeenCalledWith("https://example.org/report", { x: 1, y: 2 });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("does nothing but explain for readers, and restores the handlers on dispose", async () => {
      const { editor, handlers, previous } = createFakeEditor();
      const { deps, notices } = createDeps({ canEdit: false });
      const dispose = registerPpmCanvasExternalContent(editor, () => deps);
      await editor.putExternalContent({ type: "files", files: [png()] });
      expect(deps.uploadToVault).not.toHaveBeenCalled();
      expect(notices).toEqual([getPpmTranslation("ru", "canvas.file_drop_placeholder")]);
      dispose();
      expect(handlers.files).toBe(previous.files);
      expect(handlers.url).toBe(previous.url);
    });

    it("picks the Russian plural for the drop hint and wires the handlers in onMount", () => {
      expect([1, 3, 5, 21].map((count) => dropHintKey(count, "ru"))).toEqual([
        "canvas.drop_hint_one",
        "canvas.drop_hint_few",
        "canvas.drop_hint_many",
        "canvas.drop_hint_one",
      ]);
      expect(dropHintKey(21, "en")).toBe("canvas.drop_hint_many");
      expect(editorSource).toContain("registerPpmCanvasExternalContent(mounted, getExternalContentDeps)");
      expect(editorSource).toMatch(/if \(grammarV2Ref\.current\) \{\s*void dropFilesV2Ref\.current\(files, pagePoint\);/);
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-external-content"` (или, если F создал
  заглушку, — `does not provide an export named 'pastedFileName'`).

- [ ] **Step 3: `canvas-file-kind.ts` (новый)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // AF2.1 B4/B5: форматы Хранилища и виды просмотра. Список расширений — зеркало сервера
  // (apps/api/plane/ppm_vault/services.py: IMAGE_SIGNATURES + REFERENCE_MIME_TYPES); сервер остаётся источником истины.
  export const PPM_VAULT_UPLOAD_EXTENSIONS = [
    "pdf",
    "png",
    "jpg",
    "jpeg",
    "webp",
    "csv",
    "doc",
    "docx",
    "json",
    "key",
    "md",
    "odp",
    "ods",
    "odt",
    "ppt",
    "pptx",
    "txt",
    "xls",
    "xlsx",
  ] as const;

  const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
    "application/json": "json",
    "application/msword": "doc",
    "application/pdf": "pdf",
    "application/vnd.ms-excel": "xls",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "text/csv": "csv",
    "text/markdown": "md",
    "text/plain": "txt",
  };

  /** Для выбора файла по ⌘U: MIME и расширения (часть ОС не знает MIME у .md/.csv/.key). */
  export const PPM_VAULT_ACCEPT: readonly string[] = [
    ...Object.entries(MIME_EXTENSIONS)
      .filter(([, extension]) => (PPM_VAULT_UPLOAD_EXTENSIONS as readonly string[]).includes(extension))
      .map(([mime]) => mime),
    ...PPM_VAULT_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`),
  ];

  export function fileExtension(name: string): string {
    return /\.([a-z0-9]{1,8})$/i.exec(name)?.[1]?.toLowerCase() ?? "";
  }

  export function extensionForMime(mime: string): string {
    return MIME_EXTENSIONS[mime.toLowerCase()] ?? "";
  }

  export function isVaultUploadable(name: string): boolean {
    return (PPM_VAULT_UPLOAD_EXTENSIONS as readonly string[]).includes(fileExtension(name));
  }
  ```

- [ ] **Step 4: `canvas-external-content.ts` (новый; заглушку F заменить целиком, сигнатуру сохранить)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import type { Editor, VecLike } from "tldraw";
  import type { TPpmTranslationKey } from "@ppm/brand";
  import { fillCanvasTemplate } from "./canvas-grammar";
  import { extensionForMime, fileExtension, isVaultUploadable } from "./canvas-file-kind";

  // AF2.1 B4 (R5, вариант A): вставка ⌘V, перетаскивание и ⌘U идут через обработчики внешнего контента tldraw →
  // Хранилище → живая карточка. В снимке доски не остаётся base64. Обработчики регистрируются один раз в onMount,
  // актуальное состояние читается через getDeps (refs). Под v1 — стандартные обработчики tldraw (как в UX1.1).
  export const PPM_PASTE_MAX_FILES = 20;
  const GENERIC_FILE_NAMES = /^(?:tldrawfile|image|blob|file|untitled|pasted[ -]?image|screenshot)(?:\.[a-z0-9]+)?$/i;

  export type TPpmCanvasExternalContentDeps = {
    canEdit: boolean;
    createLinkNote: (url: string, point: VecLike) => void;
    grammarV2: boolean;
    notify: (message: string) => void;
    now: () => Date;
    placeVaultEntry: (entryId: string, point: VecLike, index: number) => Promise<void>;
    t: (key: TPpmTranslationKey) => string;
    uploadToVault: (file: File) => Promise<{ id: string }>;
  };

  /** «image.png» из буфера и «tldrawFile» → «Вставка-2026-09-25-153012.png»; настоящие имена сохраняются. */
  export function pastedFileName(file: { name: string; type: string }, now: Date): string {
    const ownExtension = fileExtension(file.name);
    if (file.name && ownExtension && !GENERIC_FILE_NAMES.test(file.name)) return file.name;
    const extension = ownExtension || extensionForMime(file.type);
    const pad = (value: number) => String(value).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(
      now.getMinutes()
    )}${pad(now.getSeconds())}`;
    return `Вставка-${stamp}${extension ? `.${extension}` : ""}`;
  }

  export function withNameSuffix(name: string, attempt: number): string {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${attempt})${name.slice(dot)}` : `${name} (${attempt})`;
  }

  export function isVaultNameConflict(error: unknown): boolean {
    return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "VAULT_NAME_CONFLICT";
  }

  /** Имя занято (409 VAULT_NAME_CONFLICT) → «Имя (2).ext», «Имя (3).ext»… до 5 попыток. */
  export async function uploadWithUniqueName<T>(
    upload: (file: File) => Promise<T>,
    file: File,
    name: string,
    attempts = 5
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const candidate = attempt === 1 ? name : withNameSuffix(name, attempt);
      try {
        return await upload(new File([file], candidate, { lastModified: file.lastModified, type: file.type }));
      } catch (error) {
        lastError = error;
        if (!isVaultNameConflict(error)) throw error;
      }
    }
    throw lastError;
  }

  export function dropHintKey(
    count: number,
    locale: string
  ): "canvas.drop_hint_few" | "canvas.drop_hint_many" | "canvas.drop_hint_one" {
    const category = new Intl.PluralRules(locale.toLowerCase().startsWith("ru") ? "ru" : "en").select(count);
    if (category === "one") return "canvas.drop_hint_one";
    if (category === "few") return "canvas.drop_hint_few";
    return "canvas.drop_hint_many";
  }

  export async function putFilesIntoVault(
    deps: TPpmCanvasExternalContentDeps,
    files: readonly File[],
    point: VecLike
  ): Promise<number> {
    if (!deps.canEdit) {
      deps.notify(deps.t("canvas.file_drop_placeholder"));
      return 0;
    }
    const now = deps.now();
    const named = files.slice(0, PPM_PASTE_MAX_FILES).map((file) => ({ file, name: pastedFileName(file, now) }));
    const rejected = named.filter(({ name }) => !isVaultUploadable(name)).map(({ name }) => name);
    const errors: string[] = [];
    let placed = 0;
    for (const [index, { file, name }] of named.filter(({ name }) => isVaultUploadable(name)).entries()) {
      try {
        const entry = await uploadWithUniqueName(deps.uploadToVault, file, name);
        await deps.placeVaultEntry(entry.id, point, index);
        placed += 1;
      } catch (error) {
        errors.push(error instanceof Error && error.message ? error.message : deps.t("canvas.paste_upload_error"));
      }
    }
    const parts = [
      placed > 0 ? fillCanvasTemplate(deps.t("canvas.paste_saved"), { count: placed }) : null,
      rejected.length > 0 ? fillCanvasTemplate(deps.t("canvas.paste_unsupported"), { names: rejected.join(", ") }) : null,
      ...[...new Set(errors)],
    ].filter((part): part is string => Boolean(part));
    if (parts.length > 0) deps.notify(parts.join(" "));
    return placed;
  }

  export function registerPpmCanvasExternalContent(
    editor: Editor,
    getDeps: () => TPpmCanvasExternalContentDeps
  ): () => void {
    const previous = {
      files: editor.externalContentHandlers.files,
      svg: editor.externalContentHandlers["svg-text"],
      url: editor.externalContentHandlers.url,
    };
    editor.registerExternalContentHandler("files", async (info) => {
      const deps = getDeps();
      if (!deps.grammarV2) return previous.files?.(info);
      await putFilesIntoVault(deps, info.files, info.point ?? editor.getViewportPageBounds().center);
    });
    editor.registerExternalContentHandler("url", async (info) => {
      const deps = getDeps();
      if (!deps.grammarV2) return previous.url?.(info);
      // RB11: без запроса в сеть (стандартный обработчик тянет страницу ради превью закладки).
      if (!deps.canEdit) return;
      deps.createLinkNote(info.url, info.point ?? editor.getViewportPageBounds().center);
    });
    editor.registerExternalContentHandler("svg-text", async (info) => {
      const deps = getDeps();
      if (!deps.grammarV2) return previous.svg?.(info);
      deps.notify(deps.t("canvas.paste_svg_unsupported"));
    });
    return () => {
      editor.registerExternalContentHandler("files", previous.files ?? null);
      editor.registerExternalContentHandler("url", previous.url ?? null);
      editor.registerExternalContentHandler("svg-text", previous.svg ?? null);
    };
  }
  ```
  Проверка по тесту: «Сохранено в Хранилище: 1» — ru-строка `canvas.paste_saved` (Step 8); «Хранилище не принимает» —
  `canvas.paste_unsupported`. Если tsc не принимает `previous.files?.(info)` из-за типа поля
  `externalContentHandlers` (`{ [K in TLExternalContent['type']]: … | null }`), привести один раз:
  `const handlers = editor.externalContentHandlers as Record<string, ((info: unknown) => unknown) | null | undefined>;`.

- [ ] **Step 5: `editor.tsx` — блок B «внешний контент»** (после `uploadDropToWorkItem`, перед `handleFileDrop`):
  Импорты: `import { useTranslation } from "@plane/i18n";`,
  `import { dropHintKey, registerPpmCanvasExternalContent, type TPpmCanvasExternalContentDeps } from "./canvas-external-content";`,
  `import { PPM_VAULT_ACCEPT } from "./canvas-file-kind";`.
  ```ts
  // ── AF2.1 B · вставка, перетаскивание, ⌘U ──
  const { currentLocale } = useTranslation();
  const grammarV2Ref = useRef(grammarV2);
  grammarV2Ref.current = grammarV2;
  const bindingsRef = useRef(bindingsByShapeId);
  bindingsRef.current = bindingsByShapeId;
  const [dropHintCount, setDropHintCount] = useState<number>();
  const dropHintTimerRef = useRef<number>();
  const showDropHint = useCallback((count: number) => {
    setDropHintCount((current) => (current === count ? current : count));
    window.clearTimeout(dropHintTimerRef.current);
    // dragover приходит каждые ~50 мс; тишина 400 мс = курсор ушёл (без onDragLeave у оболочки).
    dropHintTimerRef.current = window.setTimeout(() => setDropHintCount(undefined), 400);
  }, []);
  const showDropHintRef = useRef(showDropHint);
  showDropHintRef.current = showDropHint;
  const createLinkNote = useCallback(
    (url: string, point: { x: number; y: number }) => {
      const activeEditor = editorRef.current;
      if (!activeEditor || !editableRef.current) return;
      let host = url;
      try {
        host = new URL(url).hostname || url;
      } catch {
        host = url;
      }
      const safeUrl = url.replace(/[\s<>]/g, (character) => encodeURIComponent(character));
      const node = createPpmCanvasNode({ authorId, body: `<${safeUrl}>`, kind: "note", title: host.slice(0, 160) });
      const id = createShapeId();
      activeEditor.createShape<TPpmCanvasShape>({
        id,
        type: PPM_CANVAS_SHAPE_TYPE,
        x: point.x - node.visual.width / 2,
        y: point.y - node.visual.height / 2,
        props: { h: node.visual.height, node: serializePpmCanvasNode(node), w: node.visual.width },
      });
      activeEditor.select(id);
    },
    [authorId]
  );
  const externalContentDepsRef = useRef<TPpmCanvasExternalContentDeps>();
  externalContentDepsRef.current = {
    canEdit: effectiveCanEdit,
    createLinkNote,
    grammarV2,
    notify: setContentNotice,
    now: () => new Date(),
    placeVaultEntry: (entryId, point, index) => addUploadedContent("vault_file", entryId, index, point),
    t: ppmT,
    uploadToVault: (file) => vaultService.uploadFile(workspaceId, projectId, file),
  };
  const getExternalContentDeps = useCallback(
    (): TPpmCanvasExternalContentDeps => externalContentDepsRef.current as TPpmCanvasExternalContentDeps,
    []
  );
  // Стабильная функция: tldraw вызывает onMount один раз и выполняет возвращённую очистку при размонтировании.
  const handleTldrawMount = useCallback(
    (mounted: Editor) => {
      setEditor(mounted);
      return registerPpmCanvasExternalContent(mounted, getExternalContentDeps);
    },
    [getExternalContentDeps]
  );
  const dropFilesV2 = useCallback(
    async (files: File[], pagePoint: { x: number; y: number }) => {
      setDropHintCount(undefined);
      const activeEditor = editorRef.current;
      if (!activeEditor) return;
      const target = activeEditor.getShapeAtPoint(pagePoint, { hitInside: true });
      const binding = target ? bindingsRef.current.get(target.id) : undefined;
      if (binding?.entity_type !== "work_item") {
        await activeEditor.putExternalContent({ type: "files", files, point: pagePoint, ignoreParent: false });
        return;
      }
      // RB10: отпустили на живую карточку задачи — вложения этой задачи (прежняя возможность «В задачу»).
      const size = { h: PPM_CANVAS_NODE_REGISTRY.reference.defaultHeight, w: PPM_CANVAS_NODE_REGISTRY.reference.defaultWidth };
      const spot = spotBeside(target as TPpmCanvasShape, size);
      const center = spot ? { x: spot.x + size.w / 2, y: spot.y + size.h / 2 } : pagePoint;
      try {
        for (const [index, file] of files.entries()) {
          const uploaded = await fileService.uploadProjectAsset(
            workspaceSlug,
            projectId,
            { entity_identifier: binding.entity_id, entity_type: EFileAssetType.ISSUE_ATTACHMENT },
            file
          );
          await addUploadedContent("attachment", uploaded.asset_id, index, center);
        }
        setContentNotice(
          fillCanvasTemplate(ppmT("canvas.drop_attached"), {
            count: files.length,
            name: binding.source.identity.identifier ?? binding.source.display.title,
          })
        );
      } catch (error) {
        setContentNotice(error instanceof Error && error.message ? error.message : ppmT("canvas.source_action_error"));
      }
    },
    [addUploadedContent, fileService, ppmT, projectId, spotBeside, workspaceSlug]
  );
  const dropFilesV2Ref = useRef(dropFilesV2);
  dropFilesV2Ref.current = dropFilesV2;
  // ── /AF2.1 B ──
  ```
  Примечание: `addUploadedContent` трактует точку как центр карточки (`editor.tsx:1902` → `createContentProjectionShape`
  вычитает половину размера) — поэтому передаём центр.

- [ ] **Step 6: `handleFileDrop` (`:1957-1973`) — ветка v2**
  Было:
  ```ts
    if (event.type !== "drop") return;
    if (!editableRef.current || !editorRef.current) {
      setFileDropNotice(true);
      return;
    }
    const files = [...event.dataTransfer.files].slice(0, 20);
    if (files.length === 0) return;
    setFileDropError(undefined);
    setPlaneDropPickerOpen(false);
    setPendingFileDrop({
      files,
      pagePoint: editorRef.current.screenToPage({ x: event.clientX, y: event.clientY }),
    });
  }, []);
  ```
  Стало:
  ```ts
    // AF2.1 B4 (RB10): под v2 — подсказка K4 во время перетаскивания и сразу Хранилище; v1 — диалог как раньше.
    if (event.type !== "drop") {
      if (grammarV2Ref.current && editableRef.current) showDropHintRef.current(event.dataTransfer.items.length);
      return;
    }
    if (!editableRef.current || !editorRef.current) {
      setFileDropNotice(true);
      return;
    }
    const files = [...event.dataTransfer.files].slice(0, 20);
    if (files.length === 0) return;
    const pagePoint = editorRef.current.screenToPage({ x: event.clientX, y: event.clientY });
    if (grammarV2Ref.current) {
      void dropFilesV2Ref.current(files, pagePoint);
      return;
    }
    setFileDropError(undefined);
    setPlaneDropPickerOpen(false);
    setPendingFileDrop({ files, pagePoint });
  }, []);
  ```

- [ ] **Step 7: `<Tldraw>` (`:2221-2226`) и подсказка в разметке**
  Было (после F, если F не поставил свой вызов):
  ```tsx
                <Tldraw
                  cameraOptions={{ wheelBehavior: "pan" }}
                  components={components}
                  shapeUtils={[PpmCanvasNodeShapeUtil]}
                  onMount={setEditor}
                >
  ```
  Стало (атрибуты `shapeUtils` и прочие — как их оставили F/R; меняются только две строки):
  ```tsx
                <Tldraw
                  acceptedImageMimeTypes={grammarV2 ? PPM_VAULT_ACCEPT : undefined}
                  cameraOptions={{ wheelBehavior: "pan" }}
                  components={components}
                  shapeUtils={[PpmCanvasNodeShapeUtil]}
                  onMount={handleTldrawMount}
                >
  ```
  Если F уже вызывает `registerPpmCanvasExternalContent(...)` внутри своего `onMount`, заменить его аргумент на
  `getExternalContentDeps`, чтобы в файле был ровно один вызов `registerPpmCanvasExternalContent(mounted, getExternalContentDeps)`.
  `acceptedImageMimeTypes` влияет только на фильтр выбора файла ⌘U (стандартные обработчики под v2 перекрыты).
  Подсказка — в блоке B разметки рядом с уведомлением содержимого:
  ```tsx
      {grammarV2 && dropHintCount !== undefined && (
        <div className="ppm-canvas-drop-hint" role="status">
          <Download aria-hidden="true" />
          <span>{fillCanvasTemplate(ppmT(dropHintKey(dropHintCount, currentLocale)), { count: dropHintCount })}</span>
        </div>
      )}
  ```
  (`Download` уже импортирован из lucide-react, `editor.tsx:23`.)

- [ ] **Step 8: Стили и строки**
  `canvas-content.css`:
  ```css
  /* AF2.1 B4 · Подсказка перетаскивания (K4): внизу по центру холста, не перехватывает указатель. */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-drop-hint {
    position: absolute;
    z-index: 330;
    bottom: 6rem;
    left: 50%;
    display: flex;
    max-width: min(34rem, calc(100% - 2rem));
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border: 1px solid var(--ppm-color-accent, var(--txt-accent-primary));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.8125rem;
    pointer-events: none;
    transform: translateX(-50%);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-drop-hint svg {
    width: 1.25rem;
    height: 1.25rem;
    flex: none;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }
  ```
  Блок «B» `af21-canvas.ts`:
  ```ts
      // en
      "canvas.paste_saved": "Saved to Knowledge: {count}.",
      "canvas.paste_unsupported": "Knowledge does not accept: {names}. Use PDF, PNG, JPEG, WebP, office or text files.",
      "canvas.paste_upload_error": "Could not upload the file to Knowledge.",
      "canvas.paste_svg_unsupported": "SVG is not supported yet — save the image as PNG and paste it again.",
      "canvas.drop_hint_one": "Drop to add {count} file — it will be saved to Knowledge",
      "canvas.drop_hint_few": "Drop to add {count} files — they will be saved to Knowledge",
      "canvas.drop_hint_many": "Drop to add {count} files — they will be saved to Knowledge",
      "canvas.drop_attached": "Attached to {name}: {count}",
  ```
  ```ts
      // ru
      "canvas.paste_saved": "Сохранено в Хранилище: {count}.",
      "canvas.paste_unsupported": "Хранилище не принимает: {names}. Подойдут PDF, PNG, JPEG, WebP, офисные и текстовые файлы.",
      "canvas.paste_upload_error": "Не удалось загрузить файл в Хранилище.",
      "canvas.paste_svg_unsupported": "SVG пока не поддерживается — сохраните картинку как PNG и вставьте снова.",
      "canvas.drop_hint_one": "Отпустите, чтобы добавить {count} файл — он сохранится в Хранилище",
      "canvas.drop_hint_few": "Отпустите, чтобы добавить {count} файла — они сохранятся в Хранилище",
      "canvas.drop_hint_many": "Отпустите, чтобы добавить {count} файлов — они сохранятся в Хранилище",
      "canvas.drop_attached": "Прикреплено к {name}: {count}",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 9: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/files-external-content.test.ts`
  → `8 passed`; формат/линт/tsc (B1 Step 11) для `canvas-external-content.ts`, `canvas-file-kind.ts`, `editor.tsx`,
  теста, `af21-canvas.ts`. Регрессия v1: `vitest run tests/ppm-canvas` целиком — зелёный.

**Acceptance (B4):**
- [ ] Критерий 4: скриншот из буфера (⌘V) на доске «Тест Холста» → файл «Вставка-2026-…-HHMMSS.png» в Хранилище и живая
  карточка в точке вставки; вторая вставка в ту же секунду → «… (2).png»; снимок доски (`GET …/boards/<id>/`) без `data:`.
- [ ] Перетаскивание 3 файлов показывает подсказку K4 «Отпустите, чтобы добавить 3 файла — они сохранятся в Хранилище»;
  на карточку задачи — вложения задачи; ⌘U открывает выбор с PDF/офисом/текстом.
- [ ] GIF/SVG/видео — уведомление по-русски без загрузки; вставка URL — заметка-ссылка, в «Сети» нет запроса к URL.
- [ ] Читатель: вставка не загружает, объясняет «Загружать файлы на холст могут только редакторы проекта.»; v1 — прежний
  диалог «В Хранилище / В задачу» и стандартная вставка tldraw.

---

### Task B5: Файловые карточки — «Просмотр» на весь экран и «Скачать»; «Доска задач» снова канбан

**Files:**
- Create: `apps/web/core/components/ppm-canvas/file-preview.tsx`
- Modify: `canvas-file-kind.ts` (виды просмотра, CSV, URL PDF), `apps/web/core/services/ppm-vault.service.ts`
  (`getPreview`, `getFileText`, `getFileBlob`, `downloadUrl`, тип `TPpmVaultPreview`), `canvas-content-actions.ts`
  (`previewFile`, `downloadFile`)
- Modify: `shape.tsx` — `MediaProjectionCard` `:2586-2742` (кнопки, PDF), `ContentProjectionCard` `:2474-2584` (кнопки),
  `WorkItemsViewNode` `:1559-2052` (канбан под v2)
- Modify: `editor.tsx` — блок B (состояние просмотра, скачивание, диалог), `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/files-preview.test.ts` (новый)

**Interfaces:**
- Consumes: S — `GET /api/ppm/v1/workspaces/<ws>/projects/<pid>/vault/entries/<id>/preview/` →
  `{ kind: "docx" | "xlsx" | "pptx" | "text" | "unsupported", html?, sheets?: [{ name, rows }], slides?: [{ index, title,
  text }], text?, truncated }` (CONTRACTS §5 + поле `text` для `kind: "text"` — нужда в `plan-B-needs.md`); при 404 —
  запасные пути RB8. Опционально S: `GET …/file/?download=1` → `attachment; filename*=UTF-8''<имя>` (RB9, без него
  файл скачивается с именем-идентификатором). Существующие: `vaultService.pdfUrl/fileUrl/getMarkdown`
  (`ppm-vault.service.ts:137,330-336`), `renderCanvasMarkdown`, `sanitizeCanvasHtml`, `highlightCodeLines`,
  `languageForFileName`, `PPM_CANVAS_NODE_REGISTRY.work_items_view` (1100×680), `projectionContext.onOpenTasks`.
- Produces: `canvas-file-kind.ts` — `filePreviewKind`, `parseCsvPreview`, `vaultPdfUrlFromPreview`,
  `PPM_TEXT_PREVIEW_MAX_BYTES`, тип `TFilePreviewKind`; `PpmVaultService.getPreview/getFileText/getFileBlob/downloadUrl`;
  `file-preview.tsx` — `PpmFilePreviewDialog`, `saveCanvasBlob`; поля контекста `previewFile`, `downloadFile`; классы
  `.ppm-file-preview*`, `.ppm-live-card__action`; ключи `canvas.file_preview`, `canvas.file_download`,
  `canvas.file_preview_loading`, `canvas.file_preview_error`, `canvas.file_preview_unsupported`,
  `canvas.file_preview_truncated`, `canvas.file_download_error`, `canvas.file_open_in_vault`, `canvas.file_slide`,
  `canvas.work_items_view_expand`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/file-preview.tsx apps/web/core/services/ppm-vault.service.ts \
    apps/web/tests/ppm-canvas/files-preview.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/files-preview.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { filePreviewKind, parseCsvPreview, vaultPdfUrlFromPreview } from "@/components/ppm-canvas/canvas-file-kind";

  const read = (path: string) => readFileSync(new URL(`../../core/${path}`, import.meta.url), "utf8");
  const shapeSource = read("components/ppm-canvas/shape.tsx");
  const previewSource = read("components/ppm-canvas/file-preview.tsx");
  const vaultServiceSource = read("services/ppm-vault.service.ts");

  describe("file cards: preview and download (AF2.1 B5)", () => {
    it("chooses the preview by extension and MIME type", () => {
      expect(filePreviewKind(".png", "image/png")).toBe("image");
      expect(filePreviewKind(".pdf", "application/pdf")).toBe("pdf");
      expect(filePreviewKind(".md", "text/markdown")).toBe("markdown");
      expect(filePreviewKind(".csv", "text/csv")).toBe("csv");
      expect(filePreviewKind(".json", "application/json")).toBe("json");
      expect(filePreviewKind(".py", "text/x-python")).toBe("code");
      expect(filePreviewKind(".txt", "text/plain")).toBe("text");
      expect(["docx", "xlsx", "pptx"].map((extension) => filePreviewKind(`.${extension}`, "application/octet-stream"))).toEqual([
        "office",
        "office",
        "office",
      ]);
      expect(filePreviewKind(".key", "application/octet-stream")).toBe("download");
      expect(filePreviewKind(".svg", "image/svg+xml")).toBe("code");
    });

    it("parses CSV with quotes, detects the delimiter and caps the size", () => {
      expect(parseCsvPreview('a,b\n"1,5",2\n')).toEqual({ rows: [["a", "b"], ["1,5", "2"]], truncated: false });
      expect(parseCsvPreview("a;b\r\n1;2")).toEqual({ rows: [["a", "b"], ["1", "2"]], truncated: false });
      expect(parseCsvPreview('"say ""hi""",x')).toEqual({ rows: [['say "hi"', "x"]], truncated: false });
      const big = parseCsvPreview("x\n".repeat(300));
      expect(big.rows).toHaveLength(200);
      expect(big.truncated).toBe(true);
      expect(parseCsvPreview(Array.from({ length: 60 }, (_, index) => `c${index}`).join(",")).rows[0]).toHaveLength(50);
    });

    it("previews Vault PDFs through /pdf/ without a sandbox, attachments stay sandboxed", () => {
      expect(vaultPdfUrlFromPreview("http://localhost:8000/api/ppm/v1/workspaces/w/projects/p/vault/entries/e/file/")).toBe(
        "http://localhost:8000/api/ppm/v1/workspaces/w/projects/p/vault/entries/e/pdf/"
      );
      expect(shapeSource).toContain('sandbox={vaultPdf ? undefined : ""}');
      expect(previewSource).toContain("createPortal(");
      expect(previewSource).toContain("sanitizeCanvasHtml(preview.html)");
      expect(previewSource).toMatch(/sandbox=\{isVault \? undefined : ""\}/);
      expect(vaultServiceSource).toContain("entries/${entryId}/preview/");
    });

    it("restores the working task board under v2 without silent writes", () => {
      expect(shapeSource).not.toContain("ppm-work-items-view--compact");
      expect(shapeSource).not.toMatch(/props: \{ w: 360, h: 160 \}/);
      expect(shapeSource).toContain("data-ppm-drag-handle");
      expect(shapeSource).toMatch(/grammarV2 && \(\s*<button[^>]*className="ppm-work-items-view__backlog"/);
    });

    it("names preview and download in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.file_preview")).toBe("Просмотр");
      expect(getPpmTranslation("ru", "canvas.file_download")).toBe("Скачать");
      expect(getPpmTranslation("en", "canvas.file_download")).toBe("Download");
    });
  });
  ```
  Запуск → FAIL: `does not provide an export named 'filePreviewKind'`.

- [ ] **Step 3: `canvas-file-kind.ts` — дописать**
  ```ts
  // ── B5: просмотр файлов ──
  import { languageForFileName } from "./canvas-code";
  ```
  (импорт поднять в начало файла) и в конец:
  ```ts
  export type TFilePreviewKind = "code" | "csv" | "download" | "image" | "json" | "markdown" | "office" | "pdf" | "text";

  /** Предел текста для просмотра (≤ 1 МиБ): больше — обрезаем с пометкой. */
  export const PPM_TEXT_PREVIEW_MAX_BYTES = 1_048_576;
  const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  const OFFICE_EXTENSIONS = new Set(["docx", "xlsx", "pptx"]);

  export function filePreviewKind(extension: string | null | undefined, mime: string): TFilePreviewKind {
    const normalized = (extension ?? "").replace(/^\./, "").toLowerCase() || extensionForMime(mime);
    if (IMAGE_EXTENSIONS.has(normalized) && mime.startsWith("image/")) return "image";
    if (normalized === "pdf" || mime === "application/pdf") return "pdf";
    if (normalized === "md" || mime === "text/markdown") return "markdown";
    if (normalized === "csv" || mime === "text/csv") return "csv";
    if (normalized === "json" || mime === "application/json") return "json";
    if (OFFICE_EXTENSIONS.has(normalized)) return "office";
    if (normalized && languageForFileName(`file.${normalized}`) !== "plaintext") return "code";
    if (normalized === "txt" || normalized === "log" || mime.startsWith("text/")) return "text";
    return "download";
  }

  /** CSV/TSV для просмотра: кавычки, «""», разделитель «,», «;» или Tab по первой строке; ≤ maxRows × maxColumns. */
  export function parseCsvPreview(
    text: string,
    maxRows = 200,
    maxColumns = 50
  ): { rows: string[][]; truncated: boolean } {
    const newline = text.indexOf("\n");
    const firstLine = newline >= 0 ? text.slice(0, newline) : text;
    const delimiter = [";", "\t"].reduce(
      (best, candidate) => (firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best),
      ","
    );
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    let truncated = false;
    const pushRow = () => {
      if (row.length > maxColumns) truncated = true;
      rows.push(row.slice(0, maxColumns));
      row = [];
    };
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      if (quoted) {
        if (character === '"' && text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (character === '"') quoted = false;
        else cell += character;
        continue;
      }
      if (character === '"' && cell === "") {
        quoted = true;
        continue;
      }
      if (character === delimiter) {
        row.push(cell);
        cell = "";
        continue;
      }
      if (character === "\n" || character === "\r") {
        if (character === "\r" && text[index + 1] === "\n") index += 1;
        row.push(cell);
        cell = "";
        pushRow();
        if (rows.length >= maxRows) {
          truncated = truncated || index < text.length - 1;
          return { rows, truncated };
        }
        continue;
      }
      cell += character;
    }
    if (cell !== "" || row.length > 0) {
      row.push(cell);
      pushRow();
    }
    return { rows, truncated };
  }

  /** preview_url Хранилища (…/entries/<id>/file/) → …/entries/<id>/pdf/ (RB7). */
  export function vaultPdfUrlFromPreview(previewUrl: string): string {
    return previewUrl.replace(/\/file\/(?=$|[?#])/, "/pdf/");
  }
  ```
  Проверка теста CSV: `'a,b\n"1,5",2\n'` → строки `["a","b"]`, `["1,5","2"]`, хвост пуст; 300 строк `x\n` → на 200-й
  `\n` индекс 399 < 599 → `truncated: true`.

- [ ] **Step 4: `ppm-vault.service.ts` — превью, текст, blob, ссылка скачивания**
  Тип — после `TPpmVaultTransfer` (`:77-86`):
  ```ts
  // AF2.1 B5: превью файла, построенное сервером (S): Office → html/листы/слайды, текст → text. HTML уже санитизирован
  // сервером; клиент всё равно пропускает его через DOMPurify.
  export type TPpmVaultPreview = {
    html?: string;
    kind: "docx" | "pptx" | "text" | "unsupported" | "xlsx";
    sheets?: Array<{ name: string; rows: string[][] }>;
    slides?: Array<{ index: number; text: string; title: string }>;
    text?: string;
    truncated: boolean;
  };
  ```
  Методы — перед `pdfUrl(` (`:330`):
  ```ts
  async getPreview(workspaceId: string, projectId: string, entryId: string): Promise<TPpmVaultPreview> {
    try {
      const response = await this.get(`${this.vaultPath(workspaceId, projectId)}entries/${entryId}/preview/`);
      return response.data as TPpmVaultPreview;
    } catch (error) {
      throw normalizeVaultError(error);
    }
  }

  async getFileText(workspaceId: string, projectId: string, entryId: string): Promise<string> {
    try {
      const response = await this.get(`${this.entryPath(workspaceId, projectId, entryId)}file/`, {}, {
        responseType: "text",
        transformResponse: [(data: unknown) => data],
      });
      return String(response.data ?? "");
    } catch (error) {
      throw normalizeVaultError(error);
    }
  }

  async getFileBlob(workspaceId: string, projectId: string, entryId: string): Promise<Blob> {
    try {
      const response = await this.get(`${this.entryPath(workspaceId, projectId, entryId)}file/`, {}, { responseType: "blob" });
      return response.data as Blob;
    } catch (error) {
      throw normalizeVaultError(error);
    }
  }

  downloadUrl(workspaceId: string, projectId: string, entryId: string) {
    return `${this.fileUrl(workspaceId, projectId, entryId)}?download=1`;
  }
  ```
  (`this.get(url, params, config)` сливает оба объекта в конфиг axios — `api.service.ts:38-43`. Путь превью записан через
  `vaultPath` + `entries/${entryId}/preview/`, чтобы тест нашёл строку.)

- [ ] **Step 5: `canvas-content-actions.ts` — поля просмотра**
  Импорт `import type { TPpmCanvasContentBinding } from "@ppm/canvas";`; в тип:
  ```ts
    /** «Скачать»: blob через API и имя из карточки; при ошибке — ссылка ?download=1 в новой вкладке (RB9). */
    downloadFile: (binding: TPpmCanvasContentBinding) => Promise<void>;
    /** «Просмотр»: полноэкранный диалог (портал в body). */
    previewFile: (binding: TPpmCanvasContentBinding) => void;
  ```
  в значение по умолчанию: `downloadFile: async () => undefined, previewFile: () => undefined,`.

- [ ] **Step 6: `file-preview.tsx` (новый)**
  ```tsx
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
  import { createPortal } from "react-dom";
  import { ArrowUpRight, Download, FileText, LoaderCircle, X } from "lucide-react";
  import type { TPpmCanvasContentBinding } from "@ppm/canvas";
  import { usePpmTranslation } from "@/hooks/use-ppm-translation";
  import type { PpmVaultService, TPpmVaultPreview } from "@/services/ppm-vault.service";
  import { highlightCodeLines, languageForFileName } from "./canvas-code";
  import { filePreviewKind, parseCsvPreview, PPM_TEXT_PREVIEW_MAX_BYTES, vaultPdfUrlFromPreview } from "./canvas-file-kind";
  import { renderCanvasMarkdown, sanitizeCanvasHtml } from "./canvas-markdown";

  type TPreviewState =
    | { status: "loading" }
    | { status: "error" }
    | { status: "unsupported" }
    | { status: "ready"; preview: TPpmVaultPreview }
    | { status: "text"; text: string; truncated: boolean };

  export function saveCanvasBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function loadText(
    binding: TPpmCanvasContentBinding,
    vaultService: PpmVaultService
  ): Promise<{ text: string; truncated: boolean }> {
    const { identity } = binding.source;
    try {
      const preview = await vaultService.getPreview(identity.workspace_id, identity.project_id, binding.entity_id);
      if (preview.kind === "text" && typeof preview.text === "string") return { text: preview.text, truncated: preview.truncated };
    } catch {
      // RB8: превью S недоступно — читаем сам файл (локальное хранилище); ошибка ниже уйдёт в «Скачать».
    }
    const text = await vaultService.getFileText(identity.workspace_id, identity.project_id, binding.entity_id);
    return { text: text.slice(0, PPM_TEXT_PREVIEW_MAX_BYTES), truncated: text.length > PPM_TEXT_PREVIEW_MAX_BYTES };
  }

  // AF2.1 B5 (K4): полноэкранный просмотр файла. Картинка и PDF — по ссылкам Хранилища; текст/CSV/JSON/код —
  // текстом с подсветкой; Markdown — как заметка; Office — превью, построенное сервером (S). Всё HTML — через DOMPurify.
  export function PpmFilePreviewDialog({
    binding,
    onClose,
    onDownload,
    vaultService,
  }: {
    binding: TPpmCanvasContentBinding;
    onClose: () => void;
    onDownload: (binding: TPpmCanvasContentBinding) => Promise<void>;
    vaultService: PpmVaultService;
  }) {
    const ppmT = usePpmTranslation();
    const { display, identity } = binding.source;
    const isVault = binding.entity_type === "vault_file";
    const kind = filePreviewKind(display.extension, display.mime_type);
    const [state, setState] = useState<TPreviewState>({ status: "loading" });
    const [sheetIndex, setSheetIndex] = useState(0);
    const closeRef = useRef<HTMLButtonElement>(null);
    const fileUrl = isVault
      ? vaultService.fileUrl(identity.workspace_id, identity.project_id, binding.entity_id)
      : (display.preview_url ?? "");
    const pdfUrl = isVault && display.preview_url ? vaultPdfUrlFromPreview(display.preview_url) : fileUrl;

    useEffect(() => {
      closeRef.current?.focus();
      let active = true;
      const settle = (next: TPreviewState) => {
        if (active) setState(next);
      };
      if (kind === "image" || kind === "pdf") settle(fileUrl ? { status: "ready", preview: { kind: "unsupported", truncated: false } } : { status: "error" });
      else if (!isVault) settle({ status: "unsupported" });
      else if (kind === "markdown")
        void vaultService
          .getMarkdown(identity.workspace_id, identity.project_id, binding.entity_id)
          .then((markdown) => settle({ status: "text", text: markdown.content, truncated: false }), () => settle({ status: "error" }));
      else if (kind === "office")
        void vaultService
          .getPreview(identity.workspace_id, identity.project_id, binding.entity_id)
          .then(
            (preview) => settle(preview.kind === "unsupported" ? { status: "unsupported" } : { status: "ready", preview }),
            () => settle({ status: "unsupported" })
          );
      else if (kind === "download") settle({ status: "unsupported" });
      else
        void loadText(binding, vaultService).then(
          (result) => settle({ status: "text", ...result }),
          () => settle({ status: "unsupported" })
        );
      return () => {
        active = false;
      };
    }, [binding, fileUrl, identity.project_id, identity.workspace_id, isVault, kind, vaultService]);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (event.code === "Escape") onClose();
    };

    const body = useMemo(() => {
      if (state.status === "loading")
        return (
          <p className="ppm-file-preview__message">
            <LoaderCircle aria-hidden="true" /> {ppmT("canvas.file_preview_loading")}
          </p>
        );
      if (state.status === "error" || state.status === "unsupported")
        return (
          <div className="ppm-file-preview__message">
            <FileText aria-hidden="true" />
            <p>{ppmT(state.status === "error" ? "canvas.file_preview_error" : "canvas.file_preview_unsupported")}</p>
            <button type="button" onClick={() => void onDownload(binding)}>
              <Download aria-hidden="true" /> {ppmT("canvas.file_download")}
            </button>
          </div>
        );
      if (kind === "image") return <img alt={display.title} referrerPolicy="no-referrer" src={fileUrl} />;
      if (kind === "pdf")
        return (
          // RB7: PDF Хранилища — /pdf/ без песочницы (application/pdf + nosniff от сервера); вложения — в песочнице.
          <iframe referrerPolicy="no-referrer" sandbox={isVault ? undefined : ""} src={pdfUrl} title={display.title} />
        );
      if (state.status === "text") {
        const notice = state.truncated ? <small>{ppmT("canvas.file_preview_truncated")}</small> : null;
        if (kind === "markdown")
          return (
            <>
              <div
                className="ppm-file-preview__markdown"
                // oxlint-disable-next-line react/no-danger -- HTML прошёл sanitizeCanvasHtml (DOMPurify)
                dangerouslySetInnerHTML={{ __html: sanitizeCanvasHtml(renderCanvasMarkdown(state.text)) }}
              />
              {notice}
            </>
          );
        if (kind === "csv") {
          const table = parseCsvPreview(state.text);
          return (
            <>
              <PreviewTable rows={table.rows} />
              {(table.truncated || state.truncated) && <small>{ppmT("canvas.file_preview_truncated")}</small>}
            </>
          );
        }
        let text = state.text;
        if (kind === "json") {
          try {
            text = JSON.stringify(JSON.parse(state.text), null, 2);
          } catch {
            text = state.text;
          }
        }
        const language = kind === "json" ? "json" : kind === "code" ? languageForFileName(display.title) : "plaintext";
        return (
          <>
            <PreviewCode language={language} text={text} />
            {notice}
          </>
        );
      }
      const { preview } = state;
      if (preview.kind === "docx" && preview.html)
        return (
          <div
            className="ppm-file-preview__document"
            // oxlint-disable-next-line react/no-danger -- HTML сервера (nh3) повторно прошёл sanitizeCanvasHtml (DOMPurify)
            dangerouslySetInnerHTML={{ __html: sanitizeCanvasHtml(preview.html) }}
          />
        );
      if (preview.kind === "xlsx" && preview.sheets?.length) {
        const sheet = preview.sheets[Math.min(sheetIndex, preview.sheets.length - 1)];
        return (
          <>
            <div className="ppm-file-preview__tabs" role="tablist">
              {preview.sheets.map((item, index) => (
                <button
                  aria-selected={index === sheetIndex}
                  key={`${item.name}-${index}`}
                  role="tab"
                  type="button"
                  onClick={() => setSheetIndex(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <PreviewTable rows={sheet.rows} />
            {preview.truncated && <small>{ppmT("canvas.file_preview_truncated")}</small>}
          </>
        );
      }
      if (preview.kind === "pptx" && preview.slides?.length)
        return (
          <ol className="ppm-file-preview__slides">
            {preview.slides.map((slide) => (
              <li key={slide.index}>
                <strong>
                  {ppmT("canvas.file_slide")} {slide.index} · {slide.title}
                </strong>
                <p>{slide.text}</p>
              </li>
            ))}
          </ol>
        );
      return <p className="ppm-file-preview__message">{ppmT("canvas.file_preview_unsupported")}</p>;
    }, [binding, display.title, fileUrl, isVault, kind, onDownload, pdfUrl, ppmT, sheetIndex, state]);

    return createPortal(
      <div className="ppm-canvas-content-backdrop" role="presentation" onPointerDown={onClose}>
        <div
          aria-label={display.title}
          aria-modal="true"
          className="ppm-file-preview"
          data-kind={kind}
          role="dialog"
          onKeyDown={onKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <header className="ppm-file-preview__header">
            <strong>{display.title}</strong>
            <span>{display.extension?.replace(/^\./, "").toUpperCase()}</span>
            <button type="button" onClick={() => void onDownload(binding)}>
              <Download aria-hidden="true" /> {ppmT("canvas.file_download")}
            </button>
            {identity.source_url && (
              <a href={identity.source_url} rel="noopener noreferrer" target="_blank">
                {ppmT("canvas.file_open_in_vault")} <ArrowUpRight aria-hidden="true" />
              </a>
            )}
            <button ref={closeRef} type="button" aria-label={ppmT("canvas.close")} onClick={onClose}>
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="ppm-file-preview__body">{body}</div>
        </div>
      </div>,
      window.document.body
    );
  }

  function PreviewTable({ rows }: { rows: string[][] }) {
    return (
      <div className="ppm-file-preview__table">
        <table>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) =>
                  rowIndex === 0 ? <th key={cellIndex}>{cell}</th> : <td key={cellIndex}>{cell}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function PreviewCode({ language, text }: { language: string; text: string }) {
    const lines = useMemo(() => highlightCodeLines(text, language), [language, text]);
    return (
      <pre className="ppm-file-preview__code">
        <code>
          {lines.map((line, lineIndex) => (
            <span className="ppm-file-preview__line" key={lineIndex}>
              <span aria-hidden="true" className="ppm-file-preview__number">
                {lineIndex + 1}
              </span>
              {line.map((segment, segmentIndex) => (
                <span className={segment.className || undefined} key={segmentIndex}>
                  {segment.text}
                </span>
              ))}
              {"\n"}
            </span>
          ))}
        </code>
      </pre>
    );
  }
  ```
  Картинки и PDF вложений задач (`attachment`) идут по `display.preview_url` (Plane-ассет), остальное у вложений — «Скачать».

- [ ] **Step 7: `shape.tsx` — кнопки на карточках, PDF, канбан**
  Импорты: `Eye` в список lucide (`:19-41`); `import { vaultPdfUrlFromPreview } from "./canvas-file-kind";`
  (`PpmCanvasContentActionsContext` импортирован в B3).
  **`MediaProjectionCard`** — после `const grammarV2 = usePpmCanvasGrammarV2();` (`:2603`):
  ```tsx
    const contentActions = useContext(PpmCanvasContentActionsContext);
  ```
  после `const liveSource = …` (`:2621`):
  ```tsx
    const vaultPdf = grammarV2 && binding.entity_type === "vault_file" && node.kind === "pdf" && Boolean(previewUrl);
  ```
  PDF-фрейм (`:2665-2673`). Было:
  ```tsx
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox=""
              src={previewUrl}
              title={display.title}
              onError={() => setPreviewError(true)}
            />
  ```
  Стало:
  ```tsx
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer"
              // RB7: PDF Хранилища под v2 — /pdf/ без песочницы (просмотрщик в песочнице не работает); вложения — как раньше.
              sandbox={vaultPdf ? undefined : ""}
              src={vaultPdf ? `${vaultPdfUrlFromPreview(previewUrl)}#toolbar=0&view=FitH` : previewUrl}
              title={display.title}
              onError={() => setPreviewError(true)}
            />
  ```
  В `<footer>` (`:2681`) первой строкой:
  ```tsx
          {grammarV2 && !unavailable && (
            <>
              <button
                type="button"
                className="ppm-live-card__action"
                onClick={() => contentActions.previewFile(binding)}
                onPointerDown={stopEventPropagation}
              >
                <Eye aria-hidden="true" />
                {ppmT("canvas.file_preview")}
              </button>
              <button
                type="button"
                className="ppm-live-card__action"
                onClick={() => void contentActions.downloadFile(binding)}
                onPointerDown={stopEventPropagation}
              >
                <Download aria-hidden="true" />
                {ppmT("canvas.file_download")}
              </button>
            </>
          )}
  ```
  **`ContentProjectionCard`** — в `<footer>` (`:2545`) первой строкой тот же фрагмент с условием
  `grammarV2 && binding.entity_type !== "page" && display.source_status !== "deleted"` (переменная `contentActions`
  уже объявлена в B3).
  **`WorkItemsViewNode`**: `:1570` было `const compact = usePpmCanvasGrammarV2();` → стало
  `const grammarV2 = usePpmCanvasGrammarV2();`. Удалить эффект `:1583-1590` целиком (тихая запись новой версии доски —
  регрессия 7 второго агента). Удалить блок `if (compact) { … }` `:1702-1715`. Корень (`:1717-1722`) было:
  ```tsx
      <div
        className="ppm-work-items-view"
        data-layout={node.layout}
        onPointerDown={stopEventPropagation}
        onWheelCapture={stopEventPropagation}
      >
  ```
  стало:
  ```tsx
      <div
        className="ppm-work-items-view"
        data-layout={node.layout}
        onPointerDown={(event) => {
          // RB14: под v2 подпись «Доска задач» — ручка: выделить и перетащить карточку; остальное — клики канбана.
          if (grammarV2 && (event.target as HTMLElement).closest("[data-ppm-drag-handle]")) return;
          stopEventPropagation(event);
        }}
        onWheelCapture={stopEventPropagation}
      >
  ```
  В `.ppm-work-items-view__identity` (`:1725-1726`) было `<span>{ppmT("canvas.work_items_view")}</span>` → стало
  `<span data-ppm-drag-handle={grammarV2 || undefined}>{ppmT("canvas.work_items_view")}</span>`. Первой строкой
  `.ppm-work-items-view__actions` (`:1742`):
  ```tsx
          {grammarV2 && (
            <button
              type="button"
              className="ppm-work-items-view__backlog"
              onClick={projectionContext.onOpenTasks}
              onPointerDown={stopEventPropagation}
            >
              {ppmT("canvas.open_backlog")}
            </button>
          )}
          {grammarV2 && !readonly && shape.props.w <= 420 && shape.props.h <= 220 && (
            // Доски, которые прежний эффект уже ужал до 360×160, разворачиваются только по действию пользователя.
            <button
              type="button"
              className="ppm-work-items-view__backlog"
              onClick={() => {
                const { defaultHeight: h, defaultWidth: w } = PPM_CANVAS_NODE_REGISTRY.work_items_view;
                editor.updateShape<TPpmCanvasShape>({
                  id: shape.id,
                  type: shape.type,
                  props: { h, w, node: serializePpmCanvasNode(updatePpmCanvasNode(node, { visual: { ...node.visual, height: h, width: w } })) },
                });
              }}
              onPointerDown={stopEventPropagation}
            >
              {ppmT("canvas.work_items_view_expand")}
            </button>
          )}
  ```
  `PPM_CANVAS_NODE_REGISTRY` добавить в импорт из `@ppm/canvas` (`:59-86`). Переменную `compact` больше нигде не
  использовать (`grep -n "compact" shape.tsx` → только классы `--compact` отсутствуют).

- [ ] **Step 8: `editor.tsx` — блок B «просмотр и скачивание»** (после блока B4):
  Импорт: `import { PpmFilePreviewDialog, saveCanvasBlob } from "./file-preview";`.
  ```ts
  // ── AF2.1 B · просмотр и скачивание файлов ──
  const [previewBinding, setPreviewBinding] = useState<TPpmCanvasContentBinding>();
  const downloadFile = useCallback(
    async (binding: TPpmCanvasContentBinding) => {
      const { display, identity } = binding.source;
      const fileName = display.title || `file${display.extension ?? ""}`;
      if (binding.entity_type !== "vault_file") {
        const url = display.preview_url ?? identity.source_url;
        if (url) window.open(url, "_blank", "noopener");
        else setContentNotice(ppmT("canvas.file_download_error"));
        return;
      }
      try {
        const isMarkdown = display.mime_type === "text/markdown" || display.extension === ".md";
        const blob = isMarkdown
          ? new Blob(
              [(await vaultService.getMarkdown(identity.workspace_id, identity.project_id, binding.entity_id)).content],
              { type: "text/markdown;charset=utf-8" }
            )
          : await vaultService.getFileBlob(identity.workspace_id, identity.project_id, binding.entity_id);
        saveCanvasBlob(blob, fileName);
      } catch {
        // RB9: при S3 blob упирается в CORS подписанной ссылки — отдаём браузеру ссылку скачивания.
        window.open(vaultService.downloadUrl(identity.workspace_id, identity.project_id, binding.entity_id), "_blank", "noopener");
      }
    },
    [ppmT, vaultService]
  );
  // ── /AF2.1 B ──
  ```
  В `contentActions` добавить `downloadFile, previewFile: setPreviewBinding,` (+ зависимость `downloadFile`). В разметку
  блока B:
  ```tsx
      {grammarV2 && previewBinding && (
        <PpmFilePreviewDialog
          binding={previewBinding}
          vaultService={vaultService}
          onClose={() => setPreviewBinding(undefined)}
          onDownload={downloadFile}
        />
      )}
  ```

- [ ] **Step 9: Стили** — `canvas-content.css`:
  ```css
  /* AF2.1 B5 · Кнопки файловых карточек и полноэкранный просмотр (портал в body — только облик v2). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__action,
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-work-items-view__backlog {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: var(--ppm-control-height-sm, 1.75rem);
    padding: 0 0.5rem;
    border: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    border-radius: var(--ppm-radius-sm, 0.25rem);
    font-size: 0.75rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-live-card__action svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] [data-ppm-drag-handle] {
    cursor: grab;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview {
    --ppm-code-bg: #f6f8fa;
    --ppm-code-text: #1f2328;
    --ppm-code-keyword: #cf222e;
    --ppm-code-string: #0a3069;
    --ppm-code-number: #0550ae;
    --ppm-code-comment: #57606a;
    --ppm-code-title: #8250df;
    --ppm-code-builtin: #953800;
    display: grid;
    width: min(72rem, 100%);
    height: min(52rem, calc(100vh - 2rem));
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    border-radius: var(--ppm-radius-lg, 0.75rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header strong {
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header :where(button, a) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__header svg {
    width: 1rem;
    height: 1rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__body {
    min-height: 0;
    padding: 1rem;
    overflow: auto;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__body > :where(img, iframe) {
    width: 100%;
    height: 100%;
    border: 0;
    object-fit: contain;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__message {
    display: grid;
    min-height: 12rem;
    place-items: center;
    gap: 0.5rem;
    color: var(--ppm-color-text-secondary, var(--txt-secondary));
    text-align: center;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__table table {
    border-collapse: collapse;
    font-size: 0.8125rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__table :where(th, td) {
    padding: 0.375rem 0.625rem;
    border-bottom: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    text-align: left;
    white-space: nowrap;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__tabs [aria-selected="true"] {
    font-weight: 600;
    text-decoration: underline;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__code {
    margin: 0;
    padding: 0.75rem;
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-code-text, #1f2328);
    background: var(--ppm-code-bg, #f6f8fa);
    font-family: var(--ppm-font-mono, ui-monospace, monospace);
    font-size: 0.75rem;
    line-height: 1.5;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__number {
    display: inline-block;
    min-width: 3ch;
    margin-right: 1rem;
    color: var(--ppm-code-comment, #57606a);
    text-align: right;
    user-select: none;
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-keyword, .hljs-literal) {
    color: var(--ppm-code-keyword, #cf222e);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-string, .hljs-attr) {
    color: var(--ppm-code-string, #0a3069);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-number, .hljs-variable) {
    color: var(--ppm-code-number, #0550ae);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-comment, .hljs-meta) {
    color: var(--ppm-code-comment, #57606a);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-title, .hljs-name) {
    color: var(--ppm-code-title, #8250df);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview :where(.hljs-built_in, .hljs-type) {
    color: var(--ppm-code-builtin, #953800);
  }

  :where(html[data-ppm-design="v2"]) .ppm-file-preview__slides li {
    margin-bottom: 0.75rem;
  }
  ```

- [ ] **Step 10: Строки** — блок «B»:
  ```ts
      // en
      "canvas.file_preview": "Preview",
      "canvas.file_download": "Download",
      "canvas.file_preview_loading": "Preparing the preview…",
      "canvas.file_preview_error": "Could not open the preview.",
      "canvas.file_preview_unsupported": "No preview for this format — download the file.",
      "canvas.file_preview_truncated": "Only the beginning of the file is shown.",
      "canvas.file_download_error": "Could not download the file.",
      "canvas.file_open_in_vault": "Open in Knowledge",
      "canvas.file_slide": "Slide",
      "canvas.work_items_view_expand": "Expand the board",
  ```
  ```ts
      // ru
      "canvas.file_preview": "Просмотр",
      "canvas.file_download": "Скачать",
      "canvas.file_preview_loading": "Готовим просмотр…",
      "canvas.file_preview_error": "Не удалось открыть просмотр.",
      "canvas.file_preview_unsupported": "Для этого формата нет просмотра — скачайте файл.",
      "canvas.file_preview_truncated": "Показано только начало файла.",
      "canvas.file_download_error": "Не удалось скачать файл.",
      "canvas.file_open_in_vault": "Открыть в Хранилище",
      "canvas.file_slide": "Слайд",
      "canvas.work_items_view_expand": "Развернуть доску",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 11: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/files-preview.test.ts`
  → `5 passed`; весь `tests/ppm-canvas` и `card-grammar.test.ts` (якоря карточек) — зелёные; формат/линт/tsc для
  `canvas-file-kind.ts`, `file-preview.tsx`, `ppm-vault.service.ts`, `canvas-content-actions.ts`, `shape.tsx`,
  `editor.tsx`, теста и `af21-canvas.ts`.

**Acceptance (B5):**
- [ ] Критерий 4: «Скачать» и «Просмотр» работают для картинки, PDF (виден просмотрщик браузера, а не «заблокировано»),
  Markdown (как заметка), кода (`.py`, если S принимает код; иначе `.json`/`.txt`), CSV (таблица), docx/xlsx/pptx
  (превью S: текст, листы с вкладками, слайды); прочее — иконка и «Скачать». Esc/крестик/щелчок по фону закрывают.
- [ ] Критерий 5 / R8: «Доска задач» под v2 — канбан с колонками, перетаскиванием и созданием; без записи версии доски
  при открытии (журнал версий не растёт); «Открыть бэклог» — вторичная кнопка; ужатая раньше доска — «Развернуть доску».
- [ ] v1: карточки медиа/содержимого и канбан — разметка UX1.1 (PDF в `sandbox=""`, без новых кнопок).

---

### Task B6: Чек-лист «Сделать задачами» и перенос старых картинок `data:` в Хранилище

**Решение по миграции (RB13): делаем перенос, но только по подтверждению.** Автоматический перенос при открытии
доски — тихая запись от имени первого открывшего редактора (то же, что регрессия 7) и загрузка файлов без его ведома;
«только уведомление» оставляет доски > 2 МиБ несохраняемыми (`apps/api/plane/ppm_canvas/schema.py:9,25-35`). Компромисс:
при открытии доски редактором под v2, если в снимке есть картинки `data:`, показывается уведомление с числом и объёмом
и кнопками «Перенести в Хранилище» / «Не сейчас» (отказ помнится в sessionStorage для этой доски). Перенос: для каждой
картинки PNG/JPEG/WebP — загрузка в Хранилище («Вставка-…» или исходное имя), живая карточка в центре старой картинки,
удаление фигуры `image` и ассета `data:`; при ошибке картинка остаётся. Всё одной точкой истории (⌘Z возвращает), плюс
версии доски на сервере. GIF/SVG Хранилище не принимает — они остаются, число называется. Если ассет использован
несколькими фигурами — переносится только первая, ассет остаётся (редкий случай, без риска двойной привязки).

**Files:**
- Create: `apps/web/core/components/ppm-canvas/canvas-checklist.ts`, `canvas-image-migration.ts`
- Modify: `shape.tsx` — `ChecklistEditor` `:814-901`; `canvas-content-actions.ts` (`convertChecklistItems`)
- Modify: `editor.tsx` — блок B (превращение пунктов, уведомление и перенос `data:`), импорт `type TLAssetId`
- Modify: `canvas-content.css`, `af21-canvas.ts`
- Test: `apps/web/tests/ppm-canvas/content-checklist-migration.test.ts` (новый)

**Interfaces:**
- Consumes (F): `checklist.items[]` с необязательным `work_item_id: string (uuid) | null` (схема F; без него отметки
  «уже задача» теряются при разборе — `ppmCanvasChecklistItemSchema` сейчас `z.object` без `passthrough`,
  `packages/ppm-canvas/src/index.ts:109-113`). B1: `createProjectionShape(binding, placement?)`, `spotBeside`,
  `setContentNotice`; B4: `pastedFileName`, `uploadWithUniqueName`, `extensionForMime`, `isVaultUploadable`;
  tldraw `editor.getAssets()`, `deleteAssets`, `markHistoryStoppingPoint`; `formatFileSize` (`editor.tsx:3760`).
- Produces: `canvas-checklist.ts` — `checklistItemsToConvert`, `markConvertedItems`, тип `TChecklistItem`;
  `canvas-image-migration.ts` — `findInlineImageAssets`, `dataUrlToFile`, `inlineImagesDismissKey`, тип
  `TInlineImageAsset`; поле контекста `convertChecklistItems`; классы `.ppm-canvas-checklist__convert`,
  `.ppm-canvas-checklist__task`, `.ppm-canvas-inline-images`; ключи `canvas.checklist_make_tasks`,
  `canvas.checklist_converted`, `canvas.checklist_converted_partial`, `canvas.checklist_item_is_task`,
  `canvas.inline_images_notice`, `canvas.inline_images_unsupported`, `canvas.inline_images_move`,
  `canvas.inline_images_later`, `canvas.inline_images_done`.

- [ ] **Step 1: Сохранить исходники**
  ```bash
  cd /Users/ermolov/Desktop/PPM && docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
    apps/web/core/components/ppm-canvas/canvas-checklist.ts apps/web/core/components/ppm-canvas/canvas-image-migration.ts \
    apps/web/tests/ppm-canvas/content-checklist-migration.test.ts
  ```

- [ ] **Step 2: Падающий тест** `apps/web/tests/ppm-canvas/content-checklist-migration.test.ts`:
  ```ts
  import { readFileSync } from "node:fs";
  import { describe, expect, it } from "vitest";
  import { getPpmTranslation } from "@ppm/brand";
  import { checklistItemsToConvert, markConvertedItems } from "@/components/ppm-canvas/canvas-checklist";
  import {
    dataUrlToFile,
    findInlineImageAssets,
    inlineImagesDismissKey,
  } from "@/components/ppm-canvas/canvas-image-migration";

  const read = (name: string) =>
    readFileSync(new URL(`../../core/components/ppm-canvas/${name}`, import.meta.url), "utf8");
  const PNG = "data:image/png;base64,iVBORw0KGgo=";
  const TASK = "77777777-7777-4777-8777-777777777777";

  describe("checklist → tasks and inline images → Vault (AF2.1 B6)", () => {
    it("converts only checked, non-empty items that are not tasks yet", () => {
      const items = [
        { id: "a", text: "Замерить при лампе", checked: true },
        { id: "b", text: "  ", checked: true },
        { id: "c", text: "Спросить Олега", checked: false },
        { id: "d", text: "Эталоны", checked: true, work_item_id: TASK },
      ];
      expect(checklistItemsToConvert(items).map((item) => item.id)).toEqual(["a"]);
      expect(markConvertedItems(items, { a: TASK })[0]).toEqual({ ...items[0], work_item_id: TASK });
      expect(markConvertedItems(items, {})[0]).toBe(items[0]);
    });

    it("finds data: images, sizes them and flags formats the Vault rejects", () => {
      const found = findInlineImageAssets([
        { id: "asset:1", type: "image", props: { mimeType: "image/png", name: "image.png", src: PNG } },
        { id: "asset:2", type: "image", props: { src: "https://example.org/x.png" } },
        { id: "asset:3", type: "image", props: { src: "data:image/gif;base64,R0lGODlh" } },
        { id: "asset:4", type: "video", props: { src: "data:video/mp4;base64,AAAA" } },
      ]);
      expect(found).toEqual([
        { assetId: "asset:1", bytes: 8, mime: "image/png", name: "image.png", src: PNG, supported: true },
        { assetId: "asset:3", bytes: 6, mime: "image/gif", name: "", src: "data:image/gif;base64,R0lGODlh", supported: false },
      ]);
      expect(inlineImagesDismissKey("b-1")).toBe("ppm-canvas-inline-images-dismissed:b-1");
    });

    it("turns a data: URL back into the original bytes", async () => {
      const file = dataUrlToFile(PNG, "Вставка-2026-09-25-153012.png");
      expect(file.name).toBe("Вставка-2026-09-25-153012.png");
      expect(file.type).toBe("image/png");
      expect([...new Uint8Array(await file.arrayBuffer())]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    });

    it("wires the checklist button and the confirmation notice under v2 only", () => {
      expect(read("shape.tsx")).toContain("checklistItemsToConvert(node.items)");
      const editorSource = read("editor.tsx");
      expect(editorSource).toContain("inlineImagesDismissKey(boardId)");
      expect(editorSource).toMatch(/grammarV2 && effectiveCanEdit && inlineImages\.length > 0/);
    });

    it("names the actions in both languages", () => {
      expect(getPpmTranslation("ru", "canvas.checklist_make_tasks").replace("{count}", "2")).toBe("Сделать задачами · 2");
      expect(getPpmTranslation("ru", "canvas.inline_images_move")).toBe("Перенести в Хранилище");
      expect(getPpmTranslation("en", "canvas.inline_images_later")).toBe("Not now");
    });
  });
  ```
  Запуск → FAIL: `Failed to resolve import "@/components/ppm-canvas/canvas-checklist"`.

- [ ] **Step 3: `canvas-checklist.ts` и `canvas-image-migration.ts` (новые)**
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  // canvas-checklist.ts — AF2.1 B6: «Сделать задачами» для отмеченных пунктов, пункт помнит свою задачу.
  export type TChecklistItem = { checked: boolean; id: string; text: string; work_item_id?: string | null };

  export function checklistItemsToConvert<T extends TChecklistItem>(items: readonly T[]): T[] {
    return items.filter((item) => item.checked && item.text.trim() !== "" && !item.work_item_id);
  }

  export function markConvertedItems<T extends TChecklistItem>(
    items: readonly T[],
    converted: Readonly<Record<string, string>>
  ): T[] {
    return items.map((item) => (converted[item.id] ? { ...item, work_item_id: converted[item.id] } : item));
  }
  ```
  ```ts
  /**
   * Copyright (c) 2023-present Plane Software, Inc. and contributors
   * SPDX-License-Identifier: AGPL-3.0-only
   * See the LICENSE file for details.
   */

  import { extensionForMime, isVaultUploadable } from "./canvas-file-kind";

  // canvas-image-migration.ts — AF2.1 B6 (RB13): картинки, вставленные до AF2.1, лежат в снимке доски как data: URL
  // (inlineBase64AssetStore tldraw). Находим их и переносим в Хранилище только по подтверждению редактора.
  export type TInlineImageAsset = {
    assetId: string;
    bytes: number;
    mime: string;
    name: string;
    src: string;
    supported: boolean;
  };

  type TAssetLike = { id: string; props?: { mimeType?: string | null; name?: string; src?: string | null }; type: string };

  export function findInlineImageAssets(assets: readonly TAssetLike[]): TInlineImageAsset[] {
    return assets.flatMap((asset) => {
      const src = asset.props?.src ?? "";
      if (asset.type !== "image" || !src.startsWith("data:")) return [];
      const comma = src.indexOf(",");
      const header = src.slice(5, comma);
      const mime = (header.split(";")[0] || asset.props?.mimeType || "application/octet-stream").toLowerCase();
      const payload = src.length - comma - 1;
      const padding = src.endsWith("==") ? 2 : src.endsWith("=") ? 1 : 0;
      const bytes = header.includes(";base64") ? Math.floor((payload * 3) / 4) - padding : payload;
      const extension = extensionForMime(mime);
      return [
        {
          assetId: asset.id,
          bytes,
          mime,
          name: asset.props?.name ?? "",
          src,
          supported: Boolean(extension) && isVaultUploadable(`image.${extension}`),
        },
      ];
    });
  }

  export function dataUrlToFile(dataUrl: string, name: string): File {
    const comma = dataUrl.indexOf(",");
    const header = dataUrl.slice(5, comma);
    const payload = dataUrl.slice(comma + 1);
    const bytes = header.includes(";base64")
      ? Uint8Array.from(atob(payload), (character) => character.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(payload));
    return new File([bytes], name, { type: header.split(";")[0] || "application/octet-stream" });
  }

  export function inlineImagesDismissKey(boardId: string): string {
    return `ppm-canvas-inline-images-dismissed:${boardId}`;
  }
  ```

- [ ] **Step 4: `canvas-content-actions.ts` — поле превращения пунктов**
  ```ts
    /** «Сделать задачами»: задачи Plane по пунктам, карточки столбиком рядом; ответ — id пункта → id задачи. */
    convertChecklistItems: (anchor: TPpmCanvasShape, items: { id: string; text: string }[]) => Promise<Record<string, string>>;
  ```
  по умолчанию: `convertChecklistItems: async () => ({}),`.

- [ ] **Step 5: `shape.tsx` — `ChecklistEditor` (`:814-901`)**
  Импорты: `import { checklistItemsToConvert, markConvertedItems } from "./canvas-checklist";`. В начале функции после
  `const ppmT = usePpmTranslation();` (`:825`):
  ```tsx
    const grammarV2 = usePpmCanvasGrammarV2();
    const contentActions = useContext(PpmCanvasContentActionsContext);
    const projectionContext = useContext(PpmWorkItemProjectionContext);
    const [converting, setConverting] = useState(false);
    const pending = checklistItemsToConvert(node.items);
    const taskLink = (workItemId: string) => {
      for (const binding of projectionContext.bindingsByShapeId.values()) {
        if (binding.entity_type === "work_item" && binding.entity_id === workItemId) return binding.source.identity;
      }
      return undefined;
    };
    const convert = async () => {
      if (converting || pending.length === 0) return;
      setConverting(true);
      try {
        const converted = await contentActions.convertChecklistItems(
          shape,
          pending.map((item) => ({ id: item.id, text: item.text }))
        );
        // Пока шли запросы, пункты могли поменять: берём свежий узел из редактора.
        const current = editor.getShape<TPpmCanvasShape>(shape.id);
        const parsed = current ? parseSerializedPpmCanvasNode(current.props.node) : undefined;
        const latest =
          parsed && (parsed.status === "valid" || parsed.status === "migrated") && parsed.node.kind === "checklist"
            ? parsed.node
            : node;
        if (Object.keys(converted).length > 0)
          updateNode(editor, current ?? shape, latest, { items: markConvertedItems(latest.items, converted) });
      } finally {
        setConverting(false);
      }
    };
  ```
  В строке пункта после `<input … />` (`:852-866`) и перед кнопкой удаления:
  ```tsx
            {grammarV2 && item.work_item_id && (
              <a
                className="ppm-canvas-checklist__task"
                href={taskLink(item.work_item_id)?.source_url ?? undefined}
                title={ppmT("canvas.checklist_item_is_task")}
                onClick={stopEventPropagation}
                onPointerDown={stopEventPropagation}
              >
                <ListTodo aria-hidden="true" />
                {taskLink(item.work_item_id)?.identifier ?? ""}
              </a>
            )}
  ```
  После кнопки «Добавить пункт» (`:884-898`), внутри `.ppm-canvas-checklist`:
  ```tsx
        {grammarV2 && !readonly && contentActions.canEdit && pending.length > 0 && (
          <button
            type="button"
            className="ppm-canvas-checklist__convert"
            disabled={converting}
            onClick={() => void convert()}
            onKeyDown={stopEventPropagation}
            onPointerDown={stopEventPropagation}
          >
            {converting ? <LoaderCircle aria-hidden="true" /> : <ListTodo aria-hidden="true" />}
            {fillCanvasTemplate(ppmT("canvas.checklist_make_tasks"), { count: pending.length })}
          </button>
        )}
  ```
  (`ListTodo`, `LoaderCircle`, `parseSerializedPpmCanvasNode`, `useState`, `useContext`, `fillCanvasTemplate` уже
  импортированы в `shape.tsx`.)

- [ ] **Step 6: `editor.tsx` — блок B «чек-лист и картинки data:»** (после блока B5)
  Импорты: `type TLAssetId` в импорт из `tldraw` (`:33-47`);
  `import { dataUrlToFile, findInlineImageAssets, inlineImagesDismissKey, type TInlineImageAsset } from "./canvas-image-migration";`;
  в импорт из `./canvas-external-content` добавить `pastedFileName, uploadWithUniqueName`.
  ```ts
  // ── AF2.1 B · чек-лист → задачи; перенос картинок data: (RB13) ──
  const convertChecklistItems = useCallback(
    async (anchor: TPpmCanvasShape, items: { id: string; text: string }[]) => {
      const converted: Record<string, string> = {};
      if (!editableRef.current) return converted;
      const size = {
        h: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultHeight,
        w: PPM_CANVAS_NODE_REGISTRY.work_item_ref.defaultWidth,
      };
      for (const item of items.slice(0, 20)) {
        try {
          const binding = await service.createWorkItem(workspaceId, projectId, boardId, {
            name: item.text.trim().slice(0, 255),
            shape_id: createShapeId(),
            client_operation_id: crypto.randomUUID(),
          });
          // spotBeside пересчитывает занятые места: каждая следующая карточка встаёт ниже предыдущей.
          await createProjectionShape(binding, spotBeside(anchor, size));
          converted[item.id] = binding.entity_id;
        } catch {
          break;
        }
      }
      const count = Object.keys(converted).length;
      setContentNotice(
        count === items.length
          ? fillCanvasTemplate(ppmT("canvas.checklist_converted"), { count })
          : fillCanvasTemplate(ppmT("canvas.checklist_converted_partial"), { count, total: items.length })
      );
      return converted;
    },
    [boardId, createProjectionShape, ppmT, projectId, service, spotBeside, workspaceId]
  );
  const [inlineImages, setInlineImages] = useState<TInlineImageAsset[]>([]);
  const [inlineMigrationBusy, setInlineMigrationBusy] = useState(false);
  useEffect(() => {
    if (!editor || !grammarV2 || !effectiveCanEdit || syncStatus !== "saved") return;
    try {
      if (window.sessionStorage.getItem(inlineImagesDismissKey(boardId))) return;
    } catch {
      // sessionStorage недоступен — уведомление всё равно показываем.
    }
    setInlineImages(findInlineImageAssets(editor.getAssets()));
  }, [boardId, editor, effectiveCanEdit, grammarV2, syncStatus]);
  const dismissInlineImages = useCallback(() => {
    try {
      window.sessionStorage.setItem(inlineImagesDismissKey(boardId), "1");
    } catch {
      // не критично: уведомление просто вернётся при следующем открытии
    }
    setInlineImages([]);
  }, [boardId]);
  const migrateInlineImages = useCallback(async () => {
    const activeEditor = editorRef.current;
    if (!activeEditor || !editableRef.current || inlineMigrationBusy) return;
    setInlineMigrationBusy(true);
    activeEditor.markHistoryStoppingPoint("ppm move inline images");
    const now = new Date();
    let moved = 0;
    for (const asset of inlineImages.filter((item) => item.supported)) {
      const users = activeEditor
        .getCurrentPageShapes()
        .filter((shape) => shape.type === "image" && (shape.props as { assetId?: string | null }).assetId === asset.assetId);
      const first = users[0];
      if (!first) continue;
      try {
        const file = dataUrlToFile(asset.src, pastedFileName({ name: asset.name, type: asset.mime }, now));
        const entry = await uploadWithUniqueName(
          (candidate) => vaultService.uploadFile(workspaceId, projectId, candidate),
          file,
          file.name
        );
        const bounds = activeEditor.getShapePageBounds(first);
        await addUploadedContent("vault_file", entry.id, 0, bounds ? bounds.center : activeEditor.getViewportPageBounds().center);
        activeEditor.deleteShape(first.id);
        if (users.length === 1) activeEditor.deleteAssets([asset.assetId as TLAssetId]);
        moved += 1;
      } catch {
        // Картинка остаётся на доске; число непереносённых — в уведомлении.
      }
    }
    setContentNotice(fillCanvasTemplate(ppmT("canvas.inline_images_done"), { count: moved }));
    setInlineImages(findInlineImageAssets(activeEditor.getAssets()));
    setInlineMigrationBusy(false);
  }, [addUploadedContent, inlineImages, inlineMigrationBusy, ppmT, projectId, vaultService, workspaceId]);
  const inlineSupported = inlineImages.filter((item) => item.supported);
  // ── /AF2.1 B ──
  ```
  В `contentActions` добавить `convertChecklistItems` (+ зависимость). В разметку блока B:
  ```tsx
      {grammarV2 && effectiveCanEdit && inlineImages.length > 0 && (
        <div className="ppm-canvas-inline-images" role="status">
          <span>
            {inlineSupported.length > 0 &&
              fillCanvasTemplate(ppmT("canvas.inline_images_notice"), {
                count: inlineSupported.length,
                size: formatFileSize(inlineSupported.reduce((total, item) => total + item.bytes, 0)),
              })}
            {inlineImages.length > inlineSupported.length &&
              ` ${fillCanvasTemplate(ppmT("canvas.inline_images_unsupported"), { count: inlineImages.length - inlineSupported.length })}`}
          </span>
          {inlineSupported.length > 0 && (
            <button type="button" disabled={inlineMigrationBusy} onClick={() => void migrateInlineImages()}>
              {ppmT("canvas.inline_images_move")}
            </button>
          )}
          <button type="button" onClick={dismissInlineImages}>
            {ppmT("canvas.inline_images_later")}
          </button>
        </div>
      )}
  ```

- [ ] **Step 7: Стили и строки**
  `canvas-content.css`:
  ```css
  /* AF2.1 B6 · Чек-лист → задачи; уведомление о картинках внутри доски (вверху по центру, не над нижним уведомлением). */
  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-checklist__convert {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-top: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-checklist__task {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 0.125rem;
    font-size: 0.6875rem;
    color: var(--ppm-color-accent, var(--txt-accent-primary));
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] :where(.ppm-canvas-checklist__convert, .ppm-canvas-checklist__task) svg {
    width: 0.875rem;
    height: 0.875rem;
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inline-images {
    position: absolute;
    z-index: 330;
    top: 3.5rem;
    left: 50%;
    display: flex;
    max-width: min(40rem, calc(100% - 2rem));
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--ppm-color-border-subtle, var(--border-subtle));
    border-radius: var(--ppm-radius-md, 0.5rem);
    color: var(--ppm-color-text, var(--txt-primary));
    background: var(--ppm-color-surface-1, var(--bg-surface-1));
    font-size: 0.8125rem;
    transform: translateX(-50%);
  }

  :where(html[data-ppm-design="v2"]) [data-ppm-canvas-grammar="v2"] .ppm-canvas-inline-images button {
    flex: none;
    font-weight: 600;
  }
  ```
  Блок «B» `af21-canvas.ts`:
  ```ts
      // en
      "canvas.checklist_make_tasks": "Make tasks · {count}",
      "canvas.checklist_converted": "Tasks created: {count}",
      "canvas.checklist_converted_partial": "Tasks created: {count} of {total}. Try again for the rest.",
      "canvas.checklist_item_is_task": "Already a task",
      "canvas.inline_images_notice": "{count} images are stored inside the board ({size}). Move them to Knowledge so the board saves faster?",
      "canvas.inline_images_unsupported": "{count} more in GIF or SVG stay on the board.",
      "canvas.inline_images_move": "Move to Knowledge",
      "canvas.inline_images_later": "Not now",
      "canvas.inline_images_done": "Moved to Knowledge: {count}",
  ```
  ```ts
      // ru
      "canvas.checklist_make_tasks": "Сделать задачами · {count}",
      "canvas.checklist_converted": "Создано задач: {count}",
      "canvas.checklist_converted_partial": "Создано задач: {count} из {total}. Повторите для остальных.",
      "canvas.checklist_item_is_task": "Уже задача",
      "canvas.inline_images_notice": "Картинок внутри доски: {count} ({size}). Перенести их в Хранилище, чтобы доска сохранялась быстрее?",
      "canvas.inline_images_unsupported": "Ещё {count} в GIF или SVG останутся на доске.",
      "canvas.inline_images_move": "Перенести в Хранилище",
      "canvas.inline_images_later": "Не сейчас",
      "canvas.inline_images_done": "Перенесено в Хранилище: {count}",
  ```
  `…/tools/af21-pkg-build.sh ppm-brand`.

- [ ] **Step 8: Проверка**
  `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas/content-checklist-migration.test.ts`
  → `5 passed`; затем полный прогон линии:
  ```bash
  cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run tests/ppm-canvas && ./node_modules/.bin/vitest run
  ```
  Ожидается: все зелёные (новые: 9 + 7 + 5 + 8 + 5 + 5 = 39). Формат/линт/tsc для файлов задачи.

**Acceptance (B6):**
- [ ] Спецификация §C «Список»: отметить 2 пункта → «Сделать задачами · 2» → две задачи Plane, две живые карточки
  столбиком справа, у пунктов — метка «ROBOT-…» со ссылкой; повторное нажатие не создаёт дублей.
- [ ] Доска со старой вставленной картинкой: уведомление с числом и объёмом; «Перенести в Хранилище» → карточка файла
  на месте картинки, в снимке нет `data:`; ⌘Z возвращает картинку; «Не сейчас» — уведомление не возвращается в этой
  вкладке; читатель уведомления не видит.

---

### Task B7 (необязательная): Формулы LaTeX в редакторе «Документов» — **решение: в AF2.1 не делаем**

Проверено по коду (2026-09-25):
- Страницы Plane хранятся как Yjs-бинарь; HTML для API и поиска строит сервер реального времени `apps/live`
  функцией `getAllDocumentFormatsFromDocumentEditorBinaryData` из `@plane/editor`
  (`apps/live/src/extensions/database.ts:10-12,42`) по схеме `DocumentEditorExtensionsWithoutProps`
  (`packages/editor/src/core/extensions/core-without-props.ts:30`, `packages/editor/src/core/helpers/yjs-utils.ts`).
  Новый узел формулы надо добавить **и** в редактор, **и** в «схему без пропсов», **и** пересобрать/перезапустить
  `apps/live`; если хоть одна сторона его не знает — узел молча выпадает при конвертации в HTML (потеря данных в
  «Документах»), а старые клиенты с кешем бандла ломают совместное редактирование документа.
- `katex` не зависимость `packages/editor` (`packages/editor/package.json:46-75`); добавление — правка
  `pnpm-lock.yaml` (владелец F) и сборка пакета редактора, которого нет среди `af21-pkg-build.sh`
  (`ppm-brand|ppm-canvas|propel|ui|i18n`).
- Контроллер не перезапускает `apps/live` в этой волне; живую проверку совместной правки документа с формулой на
  доске 228 провести нельзя без него.

Что уже покрыто в AF2.1: формулы пишутся и отображаются в **заметке** Холста (B1); «Сделать документом» переносит их
исходником `$…$` в `<code>` (B1, RB5) — без потерь, и их можно будет отрисовать, когда появится узел формулы.

Отдельная задача после AF2.1 («Формулы в Документах»): узел `mathInline`/`mathBlock` (`atom: true`, атрибут `latex`),
`renderHTML` → `<span data-type="math-inline" data-latex="…">` (стабильный HTML для сервера), NodeView с
`katex.render(…, { throwOnError: false, trust: false })`, ввод `$…$`/`$$…$$` через input rule, одновременное добавление
в `CoreEditorExtensionsWithoutProps`/`DocumentEditorExtensionsWithoutProps`, `katex` в `packages/editor/package.json`,
пересборка `apps/live`, миграция: разбор `<code>$…$</code>` из документов, созданных «Сделать документом», в узлы формул.

---

## Сводная приёмка линии B (после B6)

- [ ] `cd /Users/ermolov/Desktop/PPM/plane-fork/apps/web && ./node_modules/.bin/vitest run` — всё зелёное (≈350 + 39 новых).
- [ ] `cd /Users/ermolov/Desktop/PPM/plane-fork/packages/ppm-brand && ./node_modules/.bin/vitest run && node
  scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs && ./node_modules/.bin/tsc --noEmit` —
  79+/79+ и аудиты чистые (новые ключи en/ru парные, без «ИИ»).
- [ ] web tsc: фильтр из Global Constraints пуст; полный `tsc --noEmit` после всех линий — 0.
- [ ] `cd /Users/ermolov/Desktop/PPM/plane-fork && node_modules/.bin/oxlint apps/web/core/components/ppm-canvas
  apps/web/core/services/ppm-canvas.service.ts apps/web/core/services/ppm-vault.service.ts` — 0 ошибок, предупреждений
  не больше базовой линии (719 во всём web).
- [ ] `docs/superpowers/plans/2026-09-25-af21/tools/af21-diff.sh apps/web/core/components/ppm-canvas/editor.tsx` — правки
  B только в блоках `AF2.1 B`, в `createProjectionShape` (параметр `placement`) и в `handleFileDrop` (ветка v2).
- [ ] Живая проверка на доске «Тест Холста» (проект 228), облик v2: заметка (Markdown, `$…$`, `$$…$$`, код), «Сделать
  задачей», «Сделать документом», код (K3), «Новый документ», «Документ PPM», вставка скриншота (⌘V), перетаскивание 3
  файлов, ⌘U, просмотр и скачивание картинки/PDF/Markdown/кода/docx/xlsx/pptx, «Доска задач» (канбан, клики,
  перетаскивание), чек-лист → задачи, перенос старой картинки. Облик v1 (`localStorage.ppm_design="v1"`) — как в конце
  UX1.1. Старая доска (до AF2.1) открывается без потерь.
- [ ] Сеть браузера: при вставке URL, открытии заметок с картинками/формулами и просмотре файлов нет запросов вне API
  PPM (и подписанных ссылок MinIO при S3).
