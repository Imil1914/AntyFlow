---
type: project_changelog
project_id: intellect-ppm
status: active
created: 2026-09-12
updated: 2026-09-23
---

# CHANGELOG — PPM

## 2026-09-23 — AI-провайдеры и проектные агенты исключены из текущего плана

- По решению владельца I0.9, AF1.1, I1.3 и I1.4 переведены в `deferred` без даты возобновления.
- Их строки убраны из действующего мастер-плана и матрицы требований; прежние идентификаторы и реализация сохранены в историческом архиве.
- Git G1.3, совместный Холст AF1.2 и выпуск PPM больше не зависят от AI/agent работ.
- Текущий Project Brain ограничен индексированием, поиском, графом, памятью и проверяемыми источниками без AI-модели.
- Матрица desktop→web сохраняет AI/agent строки для истории, но исключает их из parity/release gate.
- Уже написанный код и данные не удалялись; отдельное решение потребуется перед возобновлением этой линии.

## 2026-09-20 — I1.2 Semantic GraphRAG и память проекта переданы на owner review

- Semantic edges получили direction-preserving путь и статус `proposed/confirmed/rejected`; agent-связь не влияет
  на retrieval до явного подтверждения.
- Выбранный Canvas context расширяется только по подтверждённым связям текущего project/board на глубину `0–2`;
  связанный источник получает deterministic bonus, а citation объясняет путь.
- Добавлена Project Memory для решений, дневных, недельных и релизных сводок со снимком source versions/locator,
  proposal review и автоматической отметкой `possibly_stale` после изменения источника.
- Панель `Спросить проект` показывает глубину графа, пути, память и review actions; GraphRAG можно отключить через
  `PPM_BRAIN_GRAPH_ENABLED=0` без удаления данных и без поломки базового retrieval.
- Пройдены 114 backend contract tests, 25 Canvas tests, 35 web tests, typecheck/lint/format, production build и
  локальный browser smoke.

## 2026-09-20 — G1.1 начат с GitHub App

- Владелец принял G0.1 и подтвердил GitHub App как первый внешний Git provider.
- ADR `ppm-first-external-git-provider` переведён в `approved`, карточка G1.1 — в `in_progress`.
- Реализованы GitHub App install flow, project-scoped repository picker, read-only metadata sync и русская панель
  состояния в разделе `Код`.
- Добавлены подписанные HMAC webhooks, защита от повторов, auto-link по Work Item key, Celery consumer,
  rate-limit backoff, reconciliation, disconnect/revoke и аудит.
- Исправлен внешний install flow: раздельные Setup и OAuth Callback URL, `state`, PKCE и повторная server-side
  проверка роли РП без зависимости от локальной browser cookie.
- В локальной БД применены additive migrations; 18 Git contract tests, web typecheck и targeted lint проходят.
- G1.1 остаётся `in_progress` до создания реального GitHub App и внешнего branch → commit → push → PR gate.

## 2026-09-19 — Git foundation G0.1 передан на owner review

- В проекте появился русский раздел `Код` с одним или несколькими репозиториями и основным репозиторием.
- Добавлены безопасные HTTPS/SSH-адреса клонирования без хранения токенов, паролей и SSH-ключей.
- Ветки, коммиты и запросы на слияние вручную связываются с задачами того же проекта.
- Git-репозиторий или связанный объект добавляется на общий Canvas как metadata-проекция с canonical URL.
- Права ограничены project scope; глобальный администратор сохраняет контролируемый доступ ко всем проектам.
- Добавлены аудит, URL-защита, миграция и contract/regression проверки; карточка G0.1 переведена в `review`.

## 2026-09-19 — единый полный план PPM v5

- Добавлен мастер-план, объединяющий уже принятый фундамент, весь незавершённый backlog I0/I1, полный AntyFlow,
  обязательный Git-контур и production release gates.
- Добавлена построчная сверка старых очередей P0/PF0 с новыми карточками и правило нулевой потери scope.
- Возвращены явные критерии P0.7: обзор проекта, CSV Work Items и Markdown-сводка с permission-проверками.
- Git повышен из отложенной P1-линии в обязательный P0-поток: repository links, provider/webhooks, Canvas/code RAG
  и отдельные branch/draft PR actions с preview/approve.
- Добавлены задачи ADM0.1 и UX0.1 для защищённого глобального администрирования и завершения русской оболочки.
- Добавлены O0.1 и O0.2 для deploy, observability, backup/restore и финальной приёмки release candidate.
- Зафиксировано, что старые задачи не отменяются новой линией AF и должны быть приняты либо явно исключены.
- Полный ориентир обязательного PPM 1.0 оценён в 43–72 reviewable сессии с уточнением после AF0.1.

## 2026-09-19 — полноценный AntyFlow Canvas и multi-board план v4

- Владелец утвердил перенос вида и функциональности desktop AntyFlow в web PPM вместо минимального Canvas как конечного результата.
- Зафиксирован один общий Project Canvas на проект и несколько общих досок внутри него; доска стала единицей snapshot, version и realtime room.
- Уточнён доступ: команда проекта работает с общими досками, Viewer читает, РП управляет lifecycle, protected global admin видит все проекты.
- Global admin отделён от workspace/project invitations и требует server registry, bootstrap/re-auth и audit.
- Kanban/backlog AntyFlow возвращены в план как `work_items_view` поверх Plane Work Items без второй базы задач.
- Добавлен поток AF0.1–AF1.2: multi-board/RBAC, web shell, node runtime, Work Item views, файлы/медиа, AI/service adapters, realtime и parity gate.
- Добавлена матрица desktop→web, включая безопасные замены Electron IPC, `fs`, webview, local provider keys, terminal и Jupyter.
- I0.10 теперь зависит от AF1.2 и проверяет E1–E11, миграцию, role isolation и полную parity matrix.

## 2026-09-12 — переход на Intelligence-first редакцию v3

- Владелец уточнил продуктовую рамку: пользователи должны видеть самостоятельный интерфейс PPM/AntyFlow, а не визуально узнаваемый Plane.
- Plane Community сохранён как внутренний функциональный движок и источник истины для auth, workspace, projects, Work Items, Cycles, Modules, Views и Pages.
- Холст определён как `Мозг проекта`: на нём размещаются проекции задач, документов, файлов, Git-объектов и AI-ответов без создания вторых копий сущностей.
- Project Vault определён источником истины для папок, Markdown-заметок и файлов; Plane Pages остаются отдельными совместными страницами внутри единого раздела `Знания`.
- Добавлен Project Brain: изолированные по project hybrid retrieval, граф знаний, цитаты, управляемая память и безопасный lifecycle переиндексации.
- Добавлен поэтапный Git-контур: repository links, внешний provider/webhooks, Git-проекции и code RAG; собственный Git-сервер не разрабатывается.
- Описаны единая модель данных, API и события, RBAC, threat model, deployment, backup/restore, observability и тестовая стратегия.
- Создана очередь I0.1–I0.10, I1.1–I1.4 и G0.1–G2.1 с зависимостями, критериями приёмки, проверками и rollback.
- Plane-first v2 переведена в `superseded`; сохранены её история и применимые технические решения.

## 2026-09-12 — переход на Plane-first редакцию v2

- Владелец изменил архитектурный приоритет: Plane Community становится ядром PPM, а не только продуктовым ориентиром.
- Старая редакция собственного Next.js/Supabase MVP и очередь P0.1–P0.8 помечены `superseded`, файлы сохранены как история.
- Создано актуальное ТЗ `Plane-first`: штатный Plane после регистрации и вкладка AntyFlow «Холст» внутри каждого project.
- Plane определён источником истины для auth, workspace, projects, work items, cycles, modules, pages и attachments.
- Закреплена стратегия fork + pinned stable release; начальная версия — Plane `v1.4.2`.
- Зафиксировано требование AGPL-3.0: сохранить notices и предоставить пользователям соответствующий исходный код модифицированной сетевой версии.
- Создана новая очередь PF0.1–PF0.7; PF0.1 имеет статус `ready`.

## 2026-09-12 — новый web-first подход

- Разрозненные идеи сведены в продуктовую модель PPM для 5–20 команд.
- Plane определён как ориентир по workspace/project/work item/pages, а не объект полного копирования.
- Подготовлено решение-кандидат: отдельный web-first контур рядом с AntyFlow.
- Для двухдневного MVP предложены Next.js, Supabase Auth/Postgres/Storage/RLS и Vercel.
- Зафиксированы роли, сквозные сценарии, модель данных, API, агентный lifecycle и безопасность.
- Git-контур вынесен после P0.8; в MVP остаётся только ссылка на внешний репозиторий.
- Составлен критический путь P0.1–P0.8 на 2026-09-12—2026-09-13.
- Документация имеет статус `draft`; архитектурное решение — `candidate` до подтверждения владельца.
