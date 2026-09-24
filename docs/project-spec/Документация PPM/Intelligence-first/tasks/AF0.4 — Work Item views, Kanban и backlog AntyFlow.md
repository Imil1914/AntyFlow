---
type: implementation_task
project_id: intellect-ppm
task_id: AF0.4
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-20
---

# AF0.4 — Work Item views, Kanban и backlog AntyFlow

## Пользовательский результат

На Canvas доступны карточки задач, Kanban, backlog и списки в стиле AntyFlow, но все изменения работают с теми же
Plane Work Items, которые видны в разделе «Работа».

## Зависимости и входы

- AF0.3 accepted;
- I0.6 accepted либо возвращённые замечания закрыты;
- Plane Work Item/View APIs и project capabilities.

## Scope

- `work_item_ref` в визуальном стиле AntyFlow;
- `work_items_view` с list/Kanban/backlog layouts;
- filters/group/sort и сохранённая конфигурация view-node;
- drag card между status columns через Plane API;
- quick edit state/priority/assignee/due date;
- create Work Item из view-node;
- live refresh, stale/deleted/archived states;
- remove projection отдельно от delete source.
- обзор проекта со счётчиками Work Items по статусам;
- project-scoped CSV-экспорт Work Items и Markdown-сводка с целью, прогрессом, активными работами и блокировками;
- UTF-8, русские заголовки, безопасное CSV-экранирование и корректные имена файлов.

## Не входит

- PPM tickets table;
- автономные карточки Kanban, выдаваемые за project tasks;
- destructive mass edit без preview/capability;
- копирование комментариев/history в Canvas snapshot.

## Критерии приёмки

1. Одна задача имеет один Plane ID во всех Canvas views.
2. Drag между колонками меняет Plane state и виден в разделе «Работа».
3. Несколько view-nodes показывают одну задачу без дублирования source.
4. Viewer не выполняет quick edit/drag/create.
5. Удаление view-node/карточки с доски не удаляет Work Item.
6. Cross-project filter/entity ID получает deny.
7. Интерфейс соответствует AntyFlow fixture для Kanban/backlog.
8. CSV содержит ключ, название, статус, приоритет, исполнителя и срок, а Markdown — проверяемую сводку.
9. Экспорт не включает данные другого проекта; outsider получает отказ, а не пустой файл.

## Проверки

- projection/view schema contracts;
- Plane API permission/source-version/idempotency;
- drag/group/filter integration;
- snapshot-тесты CSV/Markdown: кириллица, кавычки, переносы строк, пустой проект и 100 Work Items;
- permission-тесты обзора и экспорта;
- cross-project negative tests;
- visual/performance/build.

## Текущее состояние реализации

AF0.4 готова к owner review в ветке `feat/i0.6-work-item-projections` Plane fork.

Реализована серверная проекция `work_items_view` поверх штатных Plane Work Items без второй таблицы задач. View-node
поддерживает Kanban, backlog и list, сохранённые фильтры, группировку и сортировку, live refresh, создание Work Item,
быстрое изменение статуса, приоритета, исполнителя и срока, optimistic update с восстановлением после ошибки, а также
безопасное удаление только представления. Drag между колонками использует тот же versioned Plane update path.

Добавлены project-scoped обзор и экспорт: CSV в UTF-8 с русскими заголовками и стандартным экранированием, а также
Markdown-сводка с целью проекта, прогрессом, активными задачами и блокировками. Чужие state/assignee/entity IDs дают
явный отказ, viewer не может создавать и изменять задачи, outsider не может читать или экспортировать проект.

Проверки 2026-09-20:

- `62 passed` — полный backend contract/regression набор `plane/tests/contract/ppm_canvas`;
- `22 passed` — `@ppm/canvas`, включая browser-boundary audit;
- `19 passed` — `@ppm/brand`, включая brand audit;
- `35 passed` — web Canvas/UI Vitest;
- web typecheck и точечный lint проходят без ошибок;
- локальная авторизованная browser-проверка: view-node добавляется на общую доску проекта, загружает 9 реальных Plane
  Work Items, фильтр статуса даёт `9 → 1 → 9`, русские названия приоритетов отображаются корректно, а быстрый перевод
  `I03ПР-8` из `Backlog` в `Todo` сохраняется в source и после проверки возвращён в `Backlog`;
- reload сохраняет view-node и его конфигурацию; исходная задача при удалении/изменении представления не копируется.

Интерактивное перетаскивание мышью и визуальное соответствие на пользовательском экране остаются частью owner review;
серверный update path, permissions, source version и rollback закрыты контрактами. Коммит и push до решения владельца не
выполняются.

## Rollback

Отключить `work_items_view`; существующие bindings остаются и открываются как обычные `work_item_ref`.

## Stop rules

- требуется создать независимую таблицу задач;
- drag меняет source без source-version/capability check;
- массовая операция не имеет понятного preview/partial failure.
