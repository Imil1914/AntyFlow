# AF2.1 — нужды линии B (содержимое и файлы) к F, S, R и контроллеру

Проверено по рабочему дереву 2026-09-25 (до фазы F). Линия B проверяет пункты F в Step 0 задачи B1; при расхождении —
останавливается и пишет сюда, обходных приведений типов не делает.

## F (фундамент) — нужно до старта линии B

| # | Что | Точная форма | Где потребляет B |
|---|---|---|---|
| F1 | Зависимости `apps/web` | `marked` 16.4.2, `dompurify` 3.4.15, `katex` 0.16.47, `lowlight` (`catalog:` 3.3.0) в `apps/web/package.json` + `corepack pnpm install --offline`. `highlight.js` отдельно не нужен (приходит через lowlight). jsdom **не** нужен: тесты B идут в env node | B1–B5 |
| F2 | Заметка | `ppmCanvasNoteSchema.format: z.enum(["plain", "markdown"])`; `createPpmCanvasNode({ kind: "note" })` → `"markdown"`; миграция старых заметок без поля → `"plain"` | B1 (`node.format === "markdown"`), B4 (заметка-ссылка) |
| F3 | Код | `ppmCanvasCodeSchema`: `language: string` (как есть; `"text"` B нормализует в Plain Text), `theme: z.enum(["light","dark","auto"])` (по умолчанию `"auto"`), `locked: z.boolean()` (`false`), `wrap: z.boolean()` (`false`); миграция старых узлов с этими значениями | B2 (`TCodePatch`) |
| F4 | Чек-лист | `ppmCanvasChecklistItemSchema` + `work_item_id: z.string().uuid().nullable().optional()` (сейчас `z.object` без `passthrough` — `packages/ppm-canvas/src/index.ts:109-113`, чужие поля пунктов теряются). Желательно: `duplicatePpmCanvasNode` для чек-листа сбрасывает `work_item_id` у копий | B6 |
| F5 | Документ | `createPpmContentRefNode`: при `binding.entity_type === "page"` возвращает узел `page_ref` (`title`, `source_url`, `binding`, размер `PPM_CANVAS_NODE_REGISTRY.page_ref` 360×240) **независимо от `kind`** — `editor.tsx:532` передаёт `contentNodeKind(...)` = `"reference"` для страниц (`mime "text/html"`, `extension ".page"`). Тип результата расширить до `TPpmCanvasMediaNode \| TPpmCanvasPageRefNode` | B1 (`placePageBinding`), B3 |
| F6 | CSS | пустой `apps/web/core/components/ppm-canvas/canvas-content.css`, импорт в `editor.tsx` **после** `canvas-v2.css` и `canvas-toolkit.css` (с комментарием `oxlint-disable-next-line import/no-unassigned-import`) | B1–B6 |
| F7 | Переводы | `packages/ppm-brand/src/translations/af21-canvas.ts` c `AF21_CANVAS_TRANSLATIONS = { en, ru }` и размеченными блоками `// ── B ──` в обоих языках; подключён последним спредом в `PPM_TRANSLATIONS`. Если F заранее кладёт ключи всех линий — список ключей B ниже | B1–B6 |
| F8 | Точка `onMount` | `<Tldraw … onMount={…}>` в `editor.tsx`: B4 ставит `onMount={handleTldrawMount}` и `acceptedImageMimeTypes={grammarV2 ? PPM_VAULT_ACCEPT : undefined}` (функции — в блоке B). Если F вызывает регистрацию сам — строго `registerPpmCanvasExternalContent(mounted, getExternalContentDeps)` и заглушка модуля с сигнатурой `(editor: Editor, getDeps: () => TPpmCanvasExternalContentDeps) => () => void` | B4 |
| F9 | Облик v1 | При восстановлении v1-веток чек-листа не менять сигнатуру `ChecklistEditor({ editor, node, readonly, shape })` и разметку `NativeNodeCard` для заметки/кода (B отводит v2 до `NativeNodeCard`, `shape.tsx:552`) | B1, B2, B6 |

Ключи блока «B» (en и ru — в задачах B1–B6, Step «Строки»): `canvas.note_make_task`, `canvas.note_make_document`,
`canvas.note_empty`, `canvas.note_markdown_hint`, `canvas.note_title_placeholder`, `canvas.note_untitled`,
`canvas.note_task_created`, `canvas.note_document_created`, `canvas.note_action_error`, `canvas.content_notice_close`,
`canvas.code_theme`, `canvas.code_theme_auto`, `canvas.code_theme_light`, `canvas.code_theme_dark`, `canvas.code_language`,
`canvas.code_lock`, `canvas.code_unlock`, `canvas.code_locked_hint`, `canvas.code_more`, `canvas.code_copy`,
`canvas.code_copied`, `canvas.code_download`, `canvas.code_wrap`, `canvas.page_new`, `canvas.page_pick_title`,
`canvas.page_search_placeholder`, `canvas.page_search_empty`, `canvas.page_search_fallback`, `canvas.page_untitled`,
`canvas.page_updated`, `canvas.page_created`, `canvas.page_placed`, `canvas.paste_saved`, `canvas.paste_unsupported`,
`canvas.paste_upload_error`, `canvas.paste_svg_unsupported`, `canvas.drop_hint_one`, `canvas.drop_hint_few`,
`canvas.drop_hint_many`, `canvas.drop_attached`, `canvas.file_preview`, `canvas.file_download`,
`canvas.file_preview_loading`, `canvas.file_preview_error`, `canvas.file_preview_unsupported`,
`canvas.file_preview_truncated`, `canvas.file_download_error`, `canvas.file_open_in_vault`, `canvas.file_slide`,
`canvas.work_items_view_expand`, `canvas.checklist_make_tasks`, `canvas.checklist_converted`,
`canvas.checklist_converted_partial`, `canvas.checklist_item_is_task`, `canvas.inline_images_notice`,
`canvas.inline_images_unsupported`, `canvas.inline_images_move`, `canvas.inline_images_later`, `canvas.inline_images_done`.
Существующие ключи, которые B переиспользует без изменений: `canvas.note_body_placeholder`, `canvas.code_body_placeholder`,
`canvas.close`, `canvas.open_backlog`, `canvas.file_drop_placeholder`, `canvas.source_action_error`.

## S (сервер)

| # | Что | Форма | Без него |
|---|---|---|---|
| S1 | Превью файла Хранилища (CONTRACTS §5) | `GET /api/ppm/v1/workspaces/<ws>/projects/<pid>/vault/entries/<id>/preview/` → `{ kind: "docx"\|"xlsx"\|"pptx"\|"text"\|"unsupported", html?, sheets?: [{ name, rows: string[][] ≤ 200×50 }], slides?: [{ index, title, text }], text?, truncated }`. **Добавить к контракту:** для `kind: "text"` (txt, csv, json и код, если S их принимает) — поле `text: string` (UTF-8, ≤ 1 МиБ, `truncated`). HTML — после nh3; права — как у `/file/`; неподдерживаемое — `kind: "unsupported"` или 404 | Office → «Скачать»; текст/CSV/JSON — через `GET /file/` (работает только в локальном хранилище, при S3 упирается в CORS MinIO) |
| S2 | Поиск документов для Холста | `GET /api/ppm/v1/workspaces/<ws>/projects/<pid>/projections/search/?types=page&q=&limit=&cursor=` → `{ results: TPpmCanvasContentProjection[] (entity_type "page", display.title, excerpt ≤ 500, source_status), next_cursor }`; только видимые пользователю (публичные проекта + свои приватные), без архивных/удалённых. Если S выберет путь `…/projections/pages/` — сообщить B (одна строка в `PpmCanvasService.searchPages`) | Запасной путь B3: Plane `GET /api/workspaces/<slug>/projects/<pid>/pages/` + фильтр по имени на клиенте (подпись «Поиск только по названию») |
| S3 | (Необязательно) имя при скачивании | `GET …/vault/entries/<id>/file/?download=1` → `Content-Disposition: attachment; filename*=UTF-8''<entry.name>`; при S3 — подписанная ссылка с `attachment` и тем же именем | Запасное скачивание B5 (при ошибке blob) даёт имя-идентификатор `<uuid>.<ext>` или открывает картинку/PDF во вкладке |
| S4 | (Необязательно) форматы | Хранилище: `gif` (сигнатура `GIF87a/GIF89a`) и текстовые/код-файлы (`py, js, ts, tsx, jsx, sql, sh, yaml, yml, toml, xml, c, cpp, h, java, go, rs, rb, kt, swift, r, tex, log`) как `text/plain` с проверкой UTF-8. После — сообщить B: список `PPM_VAULT_UPLOAD_EXTENSIONS` в `canvas-file-kind.ts` (владелец B) обновляется одной правкой | Вставка GIF и файлов кода отклоняется уведомлением по-русски; просмотр кода работает для `.json`/`.txt`/Markdown |
| S5 | Имена от клиента и конфликт | Уже так (`ppm_vault/services.py:147` берёт `uploaded_file.name`, `:204` → 409 `VAULT_NAME_CONFLICT`). Не менять: B4 повторяет с суффиксом « (2)» … « (5)» | — |
| S6 | (AF2.2+, не блокирует) | `description_html` (≤ 50 000, nh3) в `PpmWorkItemCreateSerializer` (`ppm_canvas/serializers.py:216`) — чтобы «Сделать задачей» переносила текст заметки | Задача создаётся с именем; текст остаётся в заметке рядом (RB4) |

## R (рейка и фигуры)

| # | Что | Форма |
|---|---|---|
| R1 | Команды «Новый документ» и «Документ PPM» | id `add-document-page` и `add-page-ref` в `PPM_CANVAS_COMMANDS` (`commands.ts`); рейка шлёт `PPM_CANVAS_COMMAND_EVENT` с `{ boardId, command }`. Обрабатывает B своим слушателем в блоке B `editor.tsx` (B3 Step 8); R эти две команды в `CanvasControls` не обрабатывает |
| R2 | Заметка/код/список из рейки | `add-note`, `add-code`, `add-list` создают узлы фабриками F (`createNode(editor, authorId, "note" \| "code" \| "checklist", …)`); B только рисует их под v2 |
| R3 | Не перехватывать вставку | Никаких своих обработчиков ⌘V/⌘U/drop на холсте: вставка и перетаскивание файлов — только через обработчики внешнего контента B4 |
| R4 | Панель стилей над выделением | Не показывать для карточек PPM с собственной панелью (блок кода B2) или не перекрывать её строку-заголовок; «Стикер» = нативная `note` tldraw (R), «Заметка» = карточка PPM (B) — подписи в рейке не смешивать |

## Контроллер

- Перезапуск Vite после установки пакетов F (KaTeX CSS и шрифты должны резолвиться из `apps/web/node_modules/katex`).
- Живая проверка на доске «Тест Холста» (проект 228) — сводная приёмка линии B; `apps/live` в этой волне не
  перезапускается (поэтому B7 — решение «не делать», см. план).
