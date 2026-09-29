# UX2.1 «Изменения в реальном времени для всех участников» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Исполнители получают бриф своей
> линии из `.superpowers/sdd/2026-09-29-ux21-realtime/task-<ЛИНИЯ>-brief.md`; этот файл — общая карта.

**Goal:** Изменения задач, спринтов и направлений одним участником видны у остальных за ≤ 2 с без перезагрузки.

**Architecture:** Второй канал в существующих Django Channels (как присутствие на Холсте): сокет пространства
`/ws/ppm/v1/workspaces/<slug>/events/` с подписками на проекты, короткие события без данных, публикация из сигналов
моделей и массовых операций после фиксации транзакции, фильтр гостей на сервере. Клиент — общий менеджер событий
пространства, склейка и точечные перечитывания через существующие сторы и `refresh-scheduler` линии S.

**Tech Stack:** Django 5.2 + Channels (Redis-слой) + Celery (`plane-fork/apps/api`), React Router + MobX + SWR
(`apps/web`).

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/UX2.1 — Изменения в реальном времени для всех участников.md`
(U1–U10); исследование — `.superpowers/sdd/2026-09-29-ux21-realtime/research/ux21-facts.md`.

## Global Constraints

- Решение владельца 2026-09-29: UX2.1 в программе «ночь и день», «делай до конца», коммиты локальные, без push.
  База — `plane-fork` HEAD (после `a239dd4773`); параллельно в дереве работают линии G2.2 (API `plane/ppm_oidc`,
  `plane/ppm_git`, `settings/common.py` — только S1/S2 до их приёмки; комплект `deployments/ppm`) и сессия владельца
  (`ppm-canvas/workspace.tsx`, `board-presence.tsx`, `canvas-v2.css`) — чужое не трогать.
- Маршрут (фиксирован): `ws/ppm/v1/workspaces/<slug>/events/` в общем списке `websocket_urlpatterns` (там же, где
  маршрут присутствия Холста); новое приложение `plane.ppm_realtime` (consumer, публикация, сигналы, фильтр гостей).
- Протокол (фиксирован): клиент → `{"type": "subscribe", "project_ids": [...]}`, `{"type": "unsubscribe",
  "project_ids": [...]}`, `{"type": "ping"}`; сервер → `{"type": "subscribed", "project_ids": [...], "denied":
  [...]}`, `{"type": "event", "project_id", "entity": "issue"|"cycle"|"module"|"project", "action":
  "created"|"updated"|"deleted"|"moved", "ids": [...], "seq", "at"}`, `{"type": "access_revoked", "project_id"}`,
  `{"type": "pong"}`; коды закрытия — как у Холста (4401 не вошёл, 4403 нет доступа к пространству, 4429 слишком
  много подписок/сообщений). Группа проекта — `ppm-events-project-<uuid>`.
- Публикация — только через `plane.ppm_realtime.publish.publish_project_event(project_id, entity, action, ids,
  *, visibility=None)` после `transaction.on_commit`; `visibility` — служебное (кто создал задачу, для фильтра
  гостей), клиенту не уходит.
- Флаги: сервер `PPM_REALTIME_EVENTS_ENABLED` (1 по умолчанию; строку в `settings/common.py` добавляет линия U-API
  **после** приёмки S1 — контроллер скажет), web — тот же флаг через конфигурацию/флаги оболочки (по образцу флагов
  PPM в web); выключено — всё как сейчас (опрос линии S).
- Мягкая деградация: dev-API владельца (`uvicorn --reload` на том же дереве) не должен упасть; без Redis-слоя
  публикация — no-op.
- Секреты и данные задач в событиях не передаются; UI-строки (если появятся) по-русски.
- Окружение владельца не трогать; свои стеки — `-p ppm-ux21-<линия>…` и `down -v`; тяжёлое — через `heavy.sh`.

## Линии и порядок

| Линия | Бриф | Требования | Файлы (владение) | Старт | Модель |
|---|---|---|---|---|---|
| U-API «Канал событий» | task-UAPI-brief.md | U1–U5, U9 (API) | `apps/api/plane/ppm_realtime/**`, маршруты WS (`plane/ppm_canvas/routing.py` или `plane/asgi.py` — где сейчас список), точечные вызовы публикации в массовых операциях задач/спринтов (`plane/app/views/issue/*`, `plane/app/views/cycle/*` — только добавление вызова), `settings/common.py` (одна строка флага + `INSTALLED_APPS` — после приёмки S1), тесты `apps/api/plane/tests/contract/ppm_realtime/**` | сразу (settings — позже) | opus |
| U-Web «Клиент событий» | task-UWEB-brief.md | U6–U8, U9 (web) | новый модуль клиента событий в `apps/web/core/…/ppm-realtime/**`, подключение в раскладке проекта и «Моих задачах», интеграция со сторами задач/спринтов/направлений и `refresh-scheduler` линии S, тесты `apps/web/tests/ppm-realtime/**` | сразу (по протоколу) | sonnet |
| E | task-E-brief.md | U10 | отчёт и артефакты | после обеих | opus |

## Review Focus

1. Гость без «видит всё» подписан на проект — не получает событий чужих задач, спринтов и направлений (U-API тест).
2. Массовое удаление/изменение/перенос задач (линия B) — события приходят, одной пачкой, а не сотнями (U-API тест).
3. Обрыв сокета на минуту (перезапуск API) — клиент сам переподключается и одним перечитыванием подтягивает всё
   пропущенное; без бесконечных переподключений при 4403 (U-Web тест).
4. Вкладка скрыта — перечитывания откладываются до возврата, а не копятся (U-Web тест).
5. Потеря доступа к проекту во время соединения — события перестают приходить за ≤ 15 с (U-API тест).

## Волны коммитов

- W10 — UX2.1 (API + web) после приёмки обеих линий и E.
