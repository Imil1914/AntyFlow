---
type: implementation_task
project_id: intellect-ppm
task_id: AF0.1
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-19
---

# AF0.1 — Multi-board Canvas и глобальный администратор

## Пользовательский результат

Каждый проект имеет один общий Canvas с несколькими командными досками. Участники проекта открывают только свои
доски, а защищённый глобальный администратор PPM может открыть Canvas любого проекта.

## Зависимости и входы

- I0.5 фактически реализован;
- [Решение — Полноценный AntyFlow Canvas в web PPM](<../Решение — Полноценный AntyFlow Canvas в web PPM.md>);
- существующие snapshots/versions не должны потеряться.

## Scope

- protected `ppm_global_admins` registry и server permission adapter;
- `ppm_canvas_boards` и board-scoped versions/bindings/semantic edges;
- create/list/read/save/rename/reorder/duplicate/archive/restore API;
- автоматическая доска `Главная` при первом открытии проекта;
- идемпотентная миграция текущего Canvas snapshot/history в `Главную`;
- capability matrix Global admin/РП/Member/Viewer;
- audit и feature flags.

## Не входит

- новый внешний вид AntyFlow;
- новые типы нод;
- realtime/CRDT;
- hard delete досок;
- выдача global admin через обычный UI приглашений.

## Порядок реализации

1. Зафиксировать DB/API schemas и migration invariants.
2. Добавить protected global-admin bootstrap/registry и negative tests.
3. Добавить board model, constraints и indexes.
4. Мигрировать текущий Canvas в board `Главная`.
5. Перевести version/binding/edge services на board scope.
6. Добавить lifecycle API и optimistic concurrency.
7. Сохранить deprecated default-board adapter для старого клиента.
8. Выполнить migration, contract, permission, restart и rollback проверки.

## Контракты и инварианты

- unique active Canvas на project;
- минимум одна active board;
- board всегда принадлежит Canvas текущего project/workspace;
- Global admin — отдельная защищённая platform role;
- обычный пользователь требует активный ProjectMember;
- duplicate не копирует canonical Work Items/files;
- versions immutable и монотонны внутри board;
- миграция повторяема и не меняет source IDs.

## Критерии приёмки

1. Новый project получает Canvas и `Главную` без ручной настройки.
2. В одном проекте создаются и независимо сохраняются минимум три доски.
3. После restart список, порядок, snapshots и versions восстановлены.
4. Existing Canvas после миграции открывается как `Главная` без потери shapes/history.
5. РП/Member редактируют доступный project; Viewer получает read-only.
6. РП/Member получают deny для чужого project/board даже по прямому UUID.
7. Global admin открывает Canvas двух разных workspace/project через тот же server API.
8. Invite, workspace role и project role не могут выдать global admin.
9. Последнюю активную доску нельзя архивировать.
10. Save conflict одной доски не перезаписывает её и не блокирует другую доску.

## Проверки

- clean migration + повторный запуск + existing-data fixture;
- API schema/invalid input/idempotency;
- role/cross-workspace/cross-project/cross-board negative matrix;
- immutable versions и concurrent saves;
- restart и default-board compatibility smoke;
- production web/API build.

## Результат реализации

- добавлены board-scoped модели, версии, bindings, semantic edges и lifecycle API;
- существующий snapshot/history идемпотентно переносится в доску `Главная` со стабильным UUID;
- create, rename, reorder, duplicate, archive и restore используют capability и idempotency checks;
- старая точка чтения/сохранения продолжает работать через default-board adapter;
- protected global admin хранится отдельно от workspace/project roles, выдаётся только server-side командой и
  оставляет audit;
- браузерный save подтверждён после исправления CORS для `X-Request-ID`: созданные note/group переживают reload;
- после restart API сохранённые доски, порядок и содержимое доступны повторно.

## Доказательства для review

- `test_canvas_api.py`, `test_multiboard_api.py`, `test_projection_api.py` — 41 contract check;
- `test_multiboard_migration.py` — реальная миграция `0002 → 0003`, повторный запуск и сохранение IDs/history;
- browser smoke: две доски, переключение вкладок, сохранение, reload и восстановление объектов;
- `manage.py check`, migration consistency и lint ранее пройдены на текущем diff.

Карточка переведена на `review`: функционал реализован, но owner acceptance остаётся за владельцем проекта.

## Rollback

Выключить multi-board UI/API flag и направить старый client на `default_board_id`. Новые boards и versions не
удалять; down migration с данными запрещена.

## Stop rules

- миграция требует удалить или переписать существующую version history;
- global admin проверяется только frontend;
- Plane core role tables нужно менять напрямую;
- board scope нельзя доказать negative test.
