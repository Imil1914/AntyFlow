---
type: implementation_task
project_id: intellect-ppm
task_id: AF0.5
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-20
---

# AF0.5 — Файлы, PDF, изображения, схемы и презентации на Canvas

## Пользовательский результат

Команда добавляет на доски Markdown, документы, PDF, изображения, референсы, Mermaid-схемы и презентации с
превью и переходом к каноническому файлу проекта.

## Зависимости и входы

- AF0.3 accepted;
- I0.7 accepted для Vault;
- I1.1 projection contracts либо выделенный минимальный subset принят отдельно.

## Scope

- `page_ref`, `attachment_ref`, `vault_file_ref`;
- `pdf`, `image`, `reference`, `diagram`, `deck` renderers;
- drag/drop и безопасный upload в Vault/Plane по явному выбору;
- lazy previews, locators, loading/error/quarantine states;
- Mermaid sanitize и image/PDF limits;
- открыть источник, заменить версию, убрать только projection;
- экспорт/импорт provenance.

## Не входит

- скрытые копии файлов;
- выполнение macro/active SVG/HTML;
- office collaborative editing внутри Canvas;
- OCR без отдельной карточки.

## Критерии приёмки

1. Каждый тип открывается после reload и ведёт к каноническому source.
2. Drop ясно предлагает место хранения и не создаёт две скрытые копии.
3. Viewer не загружает/заменяет файл.
4. Чужой project source не добавляется по подставленному ID.
5. Large/malicious/quarantined file даёт безопасное диагностируемое состояние.
6. Diagram content не исполняет HTML/JS.
7. Визуальные fixtures соответствуют AntyFlow.

## Проверки

- MIME/size/path/security fixtures;
- projection permission/source-version;
- preview lazy loading;
- Mermaid/XSS tests;
- visual/performance/build.

## Текущее состояние реализации

AF0.5 готова к owner review в ветке `feat/i0.6-work-item-projections` Plane fork.

Реализованы project-scoped bindings `page`, `attachment` и `vault_file`: холст хранит UUID, версию и
provenance, а не blob. Сервер повторно проверяет project boundary, видимость source и роль пользователя.
Изменение source version обновляет живую проекцию; удаление с доски не удаляет исходник.

Хранилище проекта принимает Markdown, PDF, PNG/JPEG/WebP и безопасные файлы-референсы. Тип и MIME
определяются на сервере по сигнатуре; active SVG/HTML/JS и файлы с ложным расширением отклоняются до
публикации. Замена файла создаёт immutable version с optimistic conflict control. Превью изображений и PDF
загружаются лениво из private API; quarantine/deleted/error состояния показаны без исполнения содержимого.

При drop редактор явно выбирает один канонический source: «Хранилище проекта» или «Вложение задачи».
Viewer не может загружать и заменять файлы. Добавлены native Canvas nodes `diagram` и `deck`; Mermaid работает в
`securityLevel: strict`, опасные directives отклоняются, а результат показывается как изображение, без вставки SVG
в DOM. Экспорт доски включает source manifest с entity ID, URL и source version.

## Доказательства проверки

- `71 passed` — полный backend contract/regression набор `plane/tests/contract/ppm_canvas` и `ppm_vault`;
- backend `ruff check`, `ruff format --check`, Django system check и `makemigrations --check --dry-run` — без ошибок;
- `24 passed` — `@ppm/canvas`, включая media/provenance/Mermaid security и browser-boundary audit;
- `19 passed` — `@ppm/brand`, включая user-facing brand audit;
- `35 passed` — web Canvas/UI Vitest; web typecheck, точечный lint и production build проходят;
- авторизованный browser-smoke в проекте `I03 Проверка`: созданы и сохранены Mermaid-схема и
  deck; PNG загружен в выбранную папку хранилища, добавлен на холст как binding-only проекция,
  private preview показан после reload, доступны «Открыть источник», «Заменить версию» и «Убрать с холста».

Интерактивный drag/drop и финальное визуальное сравнение с личным AntyFlow остаются частью owner review. Коммит и push до
решения владельца не выполняются.

## Rollback

Отключить media node renderers и показывать безопасные source cards; файлы/versions не удалять.

## Stop rules

- source приходится копировать без явного provenance;
- preview требует небезопасный iframe;
- upload обходит Vault/Plane permission boundary.
