---
type: implementation_task
project_id: intellect-ppm
task_id: AF0.3
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-19
---

# AF0.3 — Browser-safe runtime и базовые ноды AntyFlow

## Пользовательский результат

На web-доске работают базовые ноды AntyFlow: заметка, документ, checklist, таблица, код, группы/рамки и обычные
визуальные связи. Они сохраняются, изменяются, копируются и восстанавливаются вместе с доской.

## Зависимости и входы

- AF0.2 accepted;
- desktop `FlowNodeShapeUtil` и schemas как источник поведения;
- board-scoped persistence AF0.1.

## Scope

- versioned node registry/schema v2 и миграции;
- общая node chrome: header, resize, collapse, duplicate, remove-from-board;
- `note`, `document`, `checklist`, `table`, `code`, `group/frame`;
- typed visual links и междосочная link-node;
- copy/paste, multi-select, drag files placeholder, undo/redo;
- import/export безопасного board payload;
- unknown/corrupt node fallback с сохранением opaque data;
- performance baseline 300 shapes.

## Не входит

- выполнение произвольного кода;
- Work Item Kanban/backlog;
- PDF/image/deck bodies;
- AI/provider calls;
- terminal/Jupyter runtime.

## Критерии приёмки

1. Каждый заявленный тип создаётся из palette и редактируется без модального тупика.
2. Reload/restart сохраняет данные и визуальное состояние всех типов.
3. Schema v1 мигрирует в v2 без потери неизвестных полей.
4. Unknown/corrupt node не роняет доску и экспортируется без уничтожения payload.
5. Undo/redo и copy/paste не создают конфликтующих IDs/bindings.
6. 300 смешанных shapes проходят pan/zoom/edit smoke в установленном budget.
7. Code node не исполняет содержимое в browser.

## Проверки

- schema/migration/property fixtures;
- editor operations и persistence tests;
- XSS/Mermaid/code sanitization boundary;
- 300-shape performance smoke;
- visual/a11y/build.

## Rollback

Отключить новые node types в registry/palette. Сохранённые payload остаются unknown-node fallback.

## Stop rules

- schema меняется без migration test;
- renderer требует Node/Electron import;
- пользовательский код исполняется без отдельного sandbox gate.

## Реализовано

- Canvas schema и backend contract переведены на v2; чтение v1 сохранено, migration `0005_canvas_schema_v2` добавлена.
- Добавлены browser-safe ноды `document`, `checklist`, `table`, `code`, `group`, `frame`, `board_link` и общий chrome
  с collapse/expand, duplicate и remove-from-board.
- Code node хранит код только как текст с `executable: false` и не выполняет содержимое в browser.
- Добавлены undo/redo, безопасные JSON import/export, file-drop placeholder, междосочные ссылки и typed semantic relations.
- Панель смысловых связей позволяет явно выбрать исходный и целевой объекты, поменять направление, тип связи и подпись.
- Unknown/corrupt payload получает безопасный fallback; opaque tldraw records сохраняются при export/import.
- Исправлена граница истории после server hydration: undo больше не откатывает загрузку всей доски.

## Доказательства проверки

- `pnpm --filter @ppm/canvas check:types` — passed.
- `pnpm --filter @ppm/canvas test` — 20 tests passed, browser-boundary audit passed.
- `pnpm --filter @ppm/brand test` — 19 tests passed, user-facing brand audit passed.
- `pnpm --filter web check:types` — passed.
- Targeted web tests — 28 tests passed.
- Targeted Canvas lint — 0 warnings, 0 errors.
- `docker exec plane-fork-api-1 pytest plane/tests/contract/ppm_canvas -q` — 55 tests passed.
- `python manage.py makemigrations --check --dry-run` — no changes detected.
- `pnpm --filter web build` — production build passed.
- Browser smoke: создание/редактирование всех новых нод, reload persistence, collapse/duplicate, board link navigation,
  typed semantic relation create/delete, undo/redo и copy/paste проверены в локальном PPM.
- Performance smoke: отдельная доска `AF0.3 — 300 объектов` сохранила и восстановила 300 shapes; pan, zoom и edit
  выполнены успешно, отредактированный текст сохранился после reload.
