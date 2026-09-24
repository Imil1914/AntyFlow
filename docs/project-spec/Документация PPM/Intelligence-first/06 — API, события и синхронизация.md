---
type: api_spec
project_id: intellect-ppm
status: current
version: 6
created: 2026-09-12
updated: 2026-09-23
---

# 06 — API, события и синхронизация

Описанные ниже agent events относятся к сохранённому историческому коду, а не
к действующему плану работ. Контракты текущего PPM 1.0 охватывают Plane,
Canvas, Vault, поиск Project Brain и Git.

## Общий URL-контекст

Все project endpoints имеют форму:

```text
/api/ppm/v1/workspaces/:workspaceId/projects/:projectId/...
```

Сервер не доверяет route IDs и для каждого запроса:

1. проверяет Plane session;
2. проверяет защищённую global-admin role;
3. для обычного пользователя загружает активный project membership;
4. проверяет доступ к project;
5. проверяет capability конкретной операции;
6. валидирует payload и принадлежность board текущему Canvas;
7. выполняет mutation в транзакции;
8. пишет audit/outbox event;
9. возвращает безопасный результат.

## Единый формат ошибок

```json
{
  "error": {
    "code": "CANVAS_VERSION_CONFLICT",
    "message": "Холст был изменён другим участником.",
    "request_id": "uuid",
    "details": {}
  }
}
```

UI показывает локализованное `message`; техническая диагностика связывается через `request_id`.

## Canvas API

```text
GET    /canvas                                      metadata + ordered board list
POST   /canvas/boards                               create board
POST   /canvas/boards/reorder                       reorder active boards
GET    /canvas/boards/:boardId                      board metadata + current snapshot
PATCH  /canvas/boards/:boardId                      rename/settings
POST   /canvas/boards/:boardId/duplicate            duplicate to a new board
POST   /canvas/boards/:boardId/archive              soft archive
POST   /canvas/boards/:boardId/restore              restore archived board
PUT    /canvas/boards/:boardId/snapshot             save new immutable version
GET    /canvas/boards/:boardId/versions             version list
GET    /canvas/boards/:boardId/versions/:version    read version
POST   /canvas/boards/:boardId/bindings
DELETE /canvas/boards/:boardId/bindings/:bindingId
POST   /canvas/boards/:boardId/semantic-edges
PATCH  /canvas/boards/:boardId/semantic-edges/:edgeId
DELETE /canvas/boards/:boardId/semantic-edges/:edgeId
```

`GET /canvas` не возвращает snapshots всех досок. На переходном этапе старые `GET/PUT /canvas` читают/сохраняют
только default board и помечаются deprecated после миграции клиентов.

### `PUT /canvas/boards/:boardId/snapshot`

Запрос:

```json
{
  "schema_version": 2,
  "base_version": 12,
  "snapshot": {},
  "client_operation_id": "uuid"
}
```

Ответ содержит `board_id`, новую `version`, `content_hash`, `saved_at`. Если `base_version` устарел, сервер отвечает
`409 CANVAS_VERSION_CONFLICT` и не перезаписывает новую версию. Несовпадение `projectId/canvasId/boardId` возвращает
deny/not found без раскрытия чужих metadata.

### Lifecycle доски

- create/duplicate/reorder идемпотентны по `client_operation_id`;
- имя проверяется и нормализуется внутри текущего Canvas;
- архивирование последней активной доски запрещено;
- duplicate копирует snapshot и bindings как новые board-scoped records, но не дублирует source entities;
- restore не перезаписывает более новую доску с тем же normalized name молча;
- hard delete отсутствует в пользовательском API.

## Projection API

```text
GET  /projections/search?types=work_item,page,vault_file&q=...
GET  /projections/:type/:entityId
POST /work-items                      создание через Plane service
PATCH /work-items/:id                 allowlisted quick edit
```

Projection response разделяет:

- `identity` — ID/type/source URL;
- `display` — title/status/preview;
- `capabilities` — read/update/delete-source;
- `source_version` — invalidation marker.

## Vault API

```text
GET    /vault/tree
POST   /vault/folders
POST   /vault/files/initiate-upload
POST   /vault/files/:id/complete-upload
GET    /vault/files/:id
GET    /vault/files/:id/content
PUT    /vault/files/:id/content       Markdown/text only
POST   /vault/files/:id/versions/:version/restore
PATCH  /vault/entries/:id             rename/move/index policy
DELETE /vault/entries/:id             move to trash
GET    /vault/files/:id/download
GET    /vault/graph
POST   /vault/export
```

Uploads используют pre-signed URL либо проверенный streaming endpoint. `complete-upload` сверяет размер, hash и MIME до публикации entry.

## Knowledge API

```text
GET  /knowledge/sources
POST /knowledge/sources/:type/:id/index
POST /knowledge/reindex
GET  /knowledge/jobs/:jobId
POST /knowledge/query
GET  /knowledge/memory
POST /knowledge/memory
PATCH /knowledge/memory/:memoryId
POST /knowledge/answers
GET  /knowledge/answers/:runId
POST /knowledge/answers/:runId/cancel
GET  /knowledge/answers/:runId/events
GET  /knowledge/health
```

### `POST /knowledge/query`

```json
{
  "query": "Что блокирует испытания?",
  "scope": {
    "canvas_id": "uuid",
    "board_id": "uuid",
    "selected_shape_ids": ["shape:1", "shape:2"],
    "graph_depth": 1,
    "source_types": ["work_item", "page", "vault_file"]
  },
  "top_k": 12
}
```

`graph_depth` принимает `0–2`. Обход идёт только по `confirmed` semantic edges текущих workspace/project/board;
ответ возвращает `retrieval.graph` с фактической глубиной, числом соседей и путями связей. При
`PPM_BRAIN_GRAPH_ENABLED=0` выбранные источники остаются доступны, но соседний обход и graph bonus отключены.

`POST /knowledge/memory` принимает тип записи, заголовок, текст, `client_operation_id` и 1–50 source references.
Каждая ссылка проверяется в текущем проекте и фиксирует `source_version`/locator. `PATCH` разрешает РП/редактору
подтвердить либо отклонить только `proposed` запись; agent-origin никогда не подтверждается автоматически.

Ответ:

```json
{
  "answer": "...",
  "citations": [
    {
      "citation_id": "c1",
      "source_type": "vault_file",
      "source_id": "uuid",
      "title": "Протокол испытаний.pdf",
      "locator": {"page": 7},
      "excerpt": "..."
    }
  ],
  "retrieval": {
    "mode": "hybrid_graph",
    "degraded": false
  }
}
```

## Agent API

```text
POST /agents/runs
GET  /agents/runs/:runId
POST /agents/runs/:runId/cancel
POST /agents/actions/:actionId/approve
POST /agents/actions/:actionId/reject
```

Approval endpoint повторно проверяет права и source versions. Если объект изменился после формирования preview, действие получает `409 ACTION_PRECONDITION_CHANGED`.

## Git API

```text
GET    /git/connections
POST   /git/connections/start
DELETE /git/connections/:id
GET    /git/repositories
POST   /git/repositories/:id/link
GET    /git/repositories/:id/branches
GET    /git/repositories/:id/commits
GET    /git/repositories/:id/pull-requests
POST   /git/repositories/:id/branches
POST   /git/repositories/:id/pull-requests
POST   /git/webhooks/:provider/:connectionId
```

Создание branch/PR — write action. Оно использует idempotency key и показывает preview имени/базы/головы/описания.

## События

Нормализованный envelope:

```json
{
  "event_id": "uuid",
  "event_type": "vault.file.updated",
  "workspace_id": "uuid",
  "project_id": "uuid",
  "actor_id": "uuid-or-service",
  "entity": {"type": "vault_file", "id": "uuid", "version": "5"},
  "occurred_at": "ISO-8601",
  "schema_version": 1
}
```

Минимальные события:

- `plane.work_item.created|updated|deleted`;
- `plane.page.created|updated|deleted`;
- `plane.attachment.created|deleted`;
- `canvas.board.created|renamed|reordered|duplicated|archived|restored`;
- `canvas.board.saved`;
- `canvas.semantic_edge.created|updated|deleted`;
- `vault.file.created|updated|moved|deleted|restored`;
- `knowledge.source.index.requested|ready|failed|deleted`;
- `git.push.received`;
- `git.pull_request.opened|updated|merged|closed`;
- `agent.run.completed|failed`;
- `agent.action.applied|rejected|failed`.

## Outbox и идемпотентность

Mutation canonical data и запись outbox происходят в одной транзакции. Worker:

1. берёт событие по lease;
2. вычисляет idempotency key;
3. выполняет side effect;
4. фиксирует результат;
5. повторяет с backoff при временной ошибке;
6. переводит в dead-letter после лимита попыток.

Повторный webhook, upload completion, Canvas save или action approve не создаёт дубликат.

## Синхронизация источников с индексом

| Событие | Действие индекса |
|---|---|
| source created | enqueue index |
| source updated | mark stale → enqueue requested version |
| source deleted/access revoked | немедленно исключить из retrieval → удалить chunks async |
| parser/model changed | batch reindex по pipeline version |
| rename/move without content change | обновить locator, embedding не пересчитывать |

## Realtime

До realtime доска сохраняется через optimistic concurrency. Realtime room имеет scope
`workspace_id/project_id/canvas_id/board_id`; подключение разрешает сервер после проверки global-admin role либо
активного ProjectMember. Presence не является правом доступа. Revoke membership закрывает новые соединения и
принудительно завершает активную сессию в пределах короткого TTL/invalidation budget.

## Таймауты и деградация

- Plane API недоступен: проекции показывают `источник временно недоступен`, Canvas открывается;
- vector search недоступен: keyword-only retrieval;
- LLM недоступен: показываются найденные источники без синтеза;
- Git provider недоступен: cached metadata помечается устаревшей;
- extraction failed: файл остаётся доступным, индекс получает понятную ошибку;
- object storage недоступен: metadata видна, upload/download блокируются без потери записи.
