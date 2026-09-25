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
