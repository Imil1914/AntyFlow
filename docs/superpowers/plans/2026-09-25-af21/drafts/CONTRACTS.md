# AF2.1 — общие контракты для частей плана (F+R, B, S)

## 0. Порядок и владение файлами
- **Фаза F (фундамент)** — первой, последовательно (1–2 задачи): зависимости, схема узлов, точки монтирования, CSS-файлы,
  модуль переводов, восстановление облика v1. После неё параллельно три линии: **R** (панель и фигуры), **B** (содержимое и
  файлы), **S** (сервер). Линии не правят файлы друг друга.
- Владение (пути от plane-fork/):
  - **F**: `apps/web/package.json`, `pnpm-lock.yaml`, `packages/ppm-canvas/**` (схема, миграции, фабрики узлов — ВСЕ изменения
    схемы делает F заранее), `packages/ppm-brand/src/translations/af21-canvas.ts` (создаёт с ключами всех линий; линии
    дописывают только свои ключи в своих блоках), `packages/ppm-brand/src/index.ts` (подключение модуля),
    `apps/web/core/components/ppm-canvas/editor.tsx` (точки монтирования; после F его правят только R и B по своим
    разметкам-блокам, см. §2), `apps/web/core/components/ppm-canvas/canvas.css` (восстановление v1), создание пустых
    `canvas-toolkit.css` (R) и `canvas-content.css` (B) и их импорт.
  - **R**: `workspace.tsx`, `commands.ts`, `board-workspace-state.ts`, новые `canvas-rail.tsx`, `canvas-style-toolbar.tsx`,
    `canvas-quick-connect.tsx`, `canvas-tldraw-theme.ts` (палитра, configure нативных фигур), `canvas-toolkit.css`, тесты
    `apps/web/tests/ppm-canvas/rail*.test.ts|toolkit*.test.ts`, e2e-якоря в `apps/web/e2e/*` (только селекторы рейки).
  - **B**: `shape.tsx` (карточки: заметка, код, документ, файлы, чек-лист «Сделать задачами», доска задач — канбан;
    по согласованию с R: R не трогает shape.tsx), новые `note-markdown.tsx`, `code-block.tsx`, `file-preview.tsx`,
    `canvas-external-content.ts` (обработчики вставки/перетаскивания), `canvas-pages.ts` (поиск/создание документов),
    `canvas-content.css`, `apps/web/core/services/ppm-canvas.service.ts`/`ppm-vault.service.ts` (новые вызовы), тесты
    `apps/web/tests/ppm-canvas/content*.test.ts|note*.test.ts|code*.test.ts|files*.test.ts`, при необходимости
    `packages/editor/**` (формулы в «Документах», последняя необязательная задача).
  - **S**: `apps/api/plane/ppm_vault/**`, `apps/api/plane/ppm_canvas/**` (серверная часть), тесты `apps/api/plane/tests/**`.
- Перед первой правкой файла: `docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`.
- Сборка пакетов: `docs/superpowers/plans/2026-09-25-af21/tools/af21-pkg-build.sh <ppm-brand|ppm-canvas|…>`.
- Коммитов нет; снимки — контроллер (`af21-snap.sh`); dev-сервер :3000 не трогать (перезапуск Vite после установки
  пакетов — контроллер).

## 1. Облик и гейтинг
- Облик v1 (`PPM_DESIGN_V2=0` или `localStorage.ppm_design="v1"`): поведение и разметка Холста как в конце UX1.1
  (снимок `201ab5f4` в цепочке ux11) + исправление кликов `.ppm-canvas-node { pointer-events: auto }`. F восстанавливает
  v1-ветки, которые второй агент изменил для обоих обликов (рейка, чек-лист, таблица, панель задач, стили).
- Всё новое AF2.1 — только при `usePpmCanvasGrammarV2()` (v2 + рабочее пространство Холста). Минимальный режим
  (`PPM_ANTYFLOW_SHELL_ENABLED=0`) не меняется.

## 2. Точки монтирования (F создаёт в editor.tsx, линии наполняют свои модули)
- Дочерние элементы `<Tldraw>` (не в `components`-memo): `<PpmCanvasStyleToolbar />` (R), `<PpmCanvasQuickConnect />` (R).
- Рейка: `workspace.tsx` рендерит `<PpmCanvasRail …/>` под v2 (R), под v1 — прежняя рейка волны 1.
- `onMount`: `registerPpmCanvasExternalContent(editor, deps)` из `canvas-external-content.ts` (B) — регистрирует обработчики
  'files', 'url', 'svg-text'; `applyPpmCanvasTldrawTheme()` из `canvas-tldraw-theme.ts` (R) — вызывается на уровне модуля
  до монтирования (палитра, `NoteShapeUtil.configure`, `FrameShapeUtil.configure`) и передаёт shapeUtils в `<Tldraw>`.
- Команды: `commands.ts` (R) — добавить id: `add-sticky`, `add-note`, `add-document-page`, `add-list`, `add-table`, `add-code`,
  `open-shapes`, `add-frame`, `add-work-item`, `add-work-items-view`, `add-file`, `add-git`, `open-semantic-edges`, … ; обработчики
  карточек PPM в editor.tsx вызывают фабрики из `packages/ppm-canvas` (F).

## 3. Схема узлов (F, с миграцией и тестами в packages/ppm-canvas)
- Цвет карточек PPM: `visual.color` расширить до палитры PPM `ppm-color` = `neutral | slate | blue | cyan | green | yellow |
  orange | terracotta | violet` (старые 4 значения мапятся). Нативным фигурам tldraw цвет — через `DefaultColorStyle`
  (палитра tldraw перекрашена в оттенки PPM в `canvas-tldraw-theme.ts`).
- Заметка: `format: "plain" | "markdown"` (новые заметки — markdown; старые — plain, отображаются как раньше).
- Код: `language` (строка из списка lowlight common + «Plain Text»), `theme: "light" | "dark" | "auto"`, `locked: boolean`,
  `wrap: boolean`.
- `page_ref` — фабрика узла документа (ветка `entity_type === "page"` в `createPpmContentRefNode`).
- Неизвестные поля сохраняются; версия схемы узла повышается; старые доски открываются.

## 4. Переводы
- Модуль `packages/ppm-brand/src/translations/af21-canvas.ts` (`AF21_CANVAS_TRANSLATIONS = { en, ru }`), ключи `canvas.*`
  (новые, не переопределяя существующие), паритет en/ru, без «ИИ». F создаёт модуль и подключает его последним спредом.

## 5. Сервер (S) — контракты для B
- `GET /api/ppm/v1/workspaces/<slug>/projects/<pid>/vault/entries/<id>/preview/` → `{ kind: "docx"|"xlsx"|"pptx"|"text"|"unsupported",
  html?: string (санитизировано), sheets?: [{name, rows: string[][] (≤200×50)}], slides?: [{index, title, text}],
  truncated: boolean }`; кеш по хэшу версии; лимиты (размер распакованного ≤ 20 МиБ, число файлов в zip, время);
  права — как у `/file/`.
- Поиск документов для Холста: `GET …/ppm/v1/…/canvas/projections/search/?type=page&q=` (или отдельный
  `…/projections/pages/?q=`) — только страницы, видимые пользователю (публичные проекта + свои приватные).
- Имена вставленных файлов: сервер принимает имя от клиента; при конфликте имени — ответ 409 `VAULT_NAME_CONFLICT`
  (клиент B добавляет суффикс « (2)»).
- (Необязательно) расширение форматов Хранилища: gif; аудио/видео — только если с проверкой сигнатур и Range; иначе явно
  вне AF2.1.

## 6. Проверки (не хуже базовой линии после UX1.1)
- web vitest (≈350), brand 79/79 + аудиты, canvas 38+/audit, web tsc 0, oxlint 719/0, root 653/653; API: pytest для
  затронутых приложений (см. как их запускают в репо; docker-контейнер API на :8000).
