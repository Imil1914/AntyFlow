# AF2.2, линия S: что клиентским линиям M и C нужно знать сверх CONTRACTS §5

Источник правды: код и тесты из `drafts/plan-S.md` (прогнаны 2026-09-26, 195 passed). Всё ниже — наблюдаемое поведение
этого кода; формы из CONTRACTS §5 не меняются, здесь только уточнения.

## 1. Общее для всех эндпоинтов S

- Базовый путь: `/api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/`. В пути нужны **UUID** пространства и
  проекта, не slug. На Холсте они уже есть; в карточке задачи (линия C, «На карте») UUID пространства брать так же, как
  `ppm-tasks/data-context.tsx:39-41`: `useWorkspace().getWorkspaceBySlug(workspaceSlug)?.id`.
- Ошибки — формат PPM `{"error": {"code", "message", "request_id", "details"}}` (`details` всегда объект, может быть
  пустым), разбирается существующей `ppmCanvasErrorResponseSchema` (`@ppm/canvas`). Исключение: при выключенном флаге
  `PPM_CANVAS_MULTIBOARD_ENABLED` все пять эндпоинтов отвечают **404 в формате DRF** `{"detail": "…"}` — как остальные
  эндпоинты досок; показывать как «недоступно».
- Общие коды: 401 `AUTHENTICATION_REQUIRED`; 403 `CANVAS_PERMISSION_DENIED` (не участник проекта — для эндпоинтов
  чтения S2–S4; у пакета S1 и не участник, и читатель получают 403 `CANVAS_WRITE_FORBIDDEN`, как у сохранения доски);
  404 `CANVAS_BOARD_NOT_FOUND` (доска не этого проекта **или архивная**).
- Все даты — `datetime.isoformat()` в UTC: `"2026-09-26T07:12:03.123456+00:00"` (микросекунды могут отсутствовать,
  если равны нулю). В zod — `z.string().datetime({ offset: true })`.

## 2. S1 — `POST canvas/boards/<board_id>/bindings/batch/`

**Запрос** `{"items": [{"shape_id", "entity_type", "entity_id", "client_operation_id"?}]}`:
- `shape_id` — `^shape:[A-Za-z0-9_-]+$`, ≤ 255 (id фигуры tldraw); `entity_type` — любой вид одиночной привязки:
  `work_item | page | attachment | vault_file | repository | branch | commit | pull_request`; `entity_id` — UUID.
- `client_operation_id` (если передан) — **UUID**, как у одиночной привязки (иная строка — ошибка пункта
  `BINDING_INVALID`); `null` равносилен отсутствию.
- `client_operation_id` можно не передавать: сервер выводит детерминированный `uuid5(доска, фигура, тип, источник)`,
  поэтому повтор того же пакета (обрыв сети, повторный клик) возвращает **те же** привязки. Если передаёте свой — тот же
  UUID для другой фигуры/источника даёт ошибку пункта `BINDING_OPERATION_REUSED`.

**Ответ 200** (даже если все пункты с ошибками), `results` — строго в порядке `items`:

```jsonc
{ "results": [
  { "shape_id": "shape:abc", "status": "created",
    "binding": { /* ровно JSON одиночного POST …/bindings/, включая "idempotent_replay": false|true */ } },
  { "shape_id": "shape:def" /* или null, если пункт не объект или shape_id не строка */, "status": "error",
    "error": { "code": "WORK_ITEM_NOT_FOUND", "message": "Задача не найдена в текущем проекте.", "details": {} } }
] }
```

- `binding` разбирается существующей `ppmCanvasBindingMutationResponseSchema` (`@ppm/canvas`, как в
  `PpmCanvasService.bindWorkItem`); для `page`/`attachment`/`vault_file` — как в `bindContent`
  (`normalizeContentBindingUrls`).
- `status: "created"` и при идемпотентном повторе (`binding.idempotent_replay: true`, тот же `binding_id`); такая
  привязка может быть уже `active`, если между повторами доску сохранили.
- Привязки создаются `pending`. Чтобы они стали активными, следующее сохранение доски (`PUT …/snapshot/`) должно
  содержать все эти фигуры и передать их id в `binding_changes.activate`. **Лимит `activate`/`remove` в одном сохранении
  поднят со 100 до 200** — полный пакет активируется одним снимком (один шаг истории). Пакет realtime не рассылает: другие
  участники увидят карточки после сохранения, как и раньше.
- Стоимость (финальная волна, M-10): видимость задач и правило гостя для страниц проверяются один раз на пакет; пакет из
  200 задач — ≈0,35 с на сервере (было ≈1 с), доска на это время заблокирована для сохранений других участников.

| Уровень | HTTP | `code` | Когда |
|---|---|---|---|
| запрос | 400 | `CANVAS_BATCH_INVALID` | тело не объект или `items` не список |
| запрос | 400 | `CANVAS_BATCH_EMPTY` | `items: []` |
| запрос | 400 | `CANVAS_BATCH_TOO_LARGE` | больше 200; `details: {"max_items": 200, "received": N}` |
| запрос | 403 | `CANVAS_WRITE_FORBIDDEN` | у пользователя только чтение (гость) или нет доступа к проекту |
| запрос | 409 | `CANVAS_BOARD_ARCHIVED` | доску заархивировали во время запроса |
| пункт | — | `BINDING_INVALID` | пункт не прошёл проверку; `details` — ошибки по полям (`shape_id`, `entity_type`, `entity_id`, `client_operation_id`, `non_field_errors`) |
| пункт | — | `WORK_ITEM_NOT_FOUND` | задачи нет в проекте, она невидима пользователю, удалена, в архиве или черновик |
| пункт | — | `CONTENT_SOURCE_NOT_FOUND` / `CONTENT_SOURCE_QUARANTINED` | страница/вложение/файл не найдены или недоступны / файл в карантине |
| пункт | — | `GIT_SOURCE_NOT_FOUND` | Git-объект не найден или неактивен |
| пункт | — | `BINDING_SHAPE_CONFLICT` | фигура уже привязана на этой доске (в том числе предыдущим пунктом того же пакета); `details: {"shape_id"}` |
| пункт | — | `BINDING_OPERATION_REUSED` | `client_operation_id` уже использован для другой фигуры/источника; `details: {"binding_id"}` |
| пункт | — | `BINDING_CONFLICT` | редкая гонка уникальности в БД; повторить пакет |

## 3. S2 — `GET canvas/boards/<board_id>/changes/?since=…&limit=…`

**Параметры.** `since` — обязательный ISO 8601 с часовым поясом. Передавать через `URLSearchParams` /
`encodeURIComponent` (неэкранированный `+00:00` превращается в пробел и даёт 400); проще всего — `new
Date(x).toISOString()` (`…Z`). `limit` — 1…200, по умолчанию 200. Ошибки параметров — 400 `CANVAS_CHANGES_INVALID`,
`details` по параметрам (`{"since": [...]}`, `{"limit": [...]}`). Права — чтение доски (гость видит ленту своих задач).

**Ответ.** `since` — **фактическое** начало окна: если запрошено раньше `until − 30 дней`, сервер обрезает до этой
границы и ставит `truncated: true` — заголовок «Что изменилось с {дата}» строить по `since` из ответа. `until` —
серверное «сейчас». `items` — новые первыми (сортировка `occurred_at`, затем `id`, по убыванию). `truncated: true` —
окно обрезано, событий больше `limit`, или источник упёрся во внутренний предел: показывать «показаны не все».

**Событие.** `{id, kind, occurred_at, actor, entity, shape_ids, detail}`:
- `id` — устойчивый ключ `<kind>:<ключ источника>`; одинаковый между опросами (годится для React-ключей и «новых» меток).
- `actor` — `{id: uuid, display_name}` или `null`. Всегда `null` у Git-событий и у авторов, которые не участники
  пространства. **S2a:** у `board.node.added` фигуры без своей метки времени (нативная фигура; карточка PPM, вставленная
  или скопированная со старым `created_at`) — автор версии доски, в которой фигура появилась; у `board.node.changed` —
  автор версии, сохранившей текущий `updated_at` карточки (то есть показанную правку). Если эту версию сохранили до S2a
  (без отметок) — `null` («на доске»). Поэтому свои добавления и правки на доске теперь тоже скрываются в режиме «с
  последнего просмотра» (R9).
- `entity.identifier` есть только у задач (`"LMP-12"`) и PR (`"#7"`, если известен номер); `entity.title` — у задач
  (текущее название, может быть `""`), PR, файлов (имя), карточек PPM с непустым заголовком (≤ 160); у нативных фигур
  заголовка нет. Отсутствующие ключи не приходят (не `null`).
- `shape_ids` — фигуры этой доски, к которым относится событие (для выделения и меток «изменено/добавлено»); `[]` — у
  задач спринта, которых нет на доске.
- `detail.old` / `detail.new` — строки или `null` («было пусто» / «стало пусто» / «скрыто»).

| `kind` | `entity.type`, `entity.id` | `detail` | `id` | `occurred_at` |
|---|---|---|---|---|
| `work_item.state` | `work_item`, id задачи | `{field: "state", old, new}` — названия статусов | `work_item.state:<IssueActivity.id>` | время записи Plane |
| `work_item.assignees` | то же | `{field: "assignees", old, new}` — имя: добавлен → `old: null, new: имя`; снят → наоборот; по событию на человека | `work_item.assignees:<…>` | то же |
| `work_item.due` | то же | `{field: "due_date", old, new}` — `YYYY-MM-DD` или `null` | `work_item.due:<…>` | то же |
| `work_item.priority` | то же | `{field: "priority", old, new}` — `urgent`, `high`, `medium`, `low`, `none` | `work_item.priority:<…>` | то же |
| `work_item.name` | то же | `{field: "name", old, new}` — ≤ 255 символов | `work_item.name:<…>` | то же |
| `work_item.relation` | то же | `{field: <тип связи>, old, new}` — добавлена → `new` = идентификатор другой задачи; удалена → `old`; `null`, если другая задача пользователю не видна | `work_item.relation:<id первой записанной строки пары>` (S2a; задача и поле — из неё) | позднее из пары |
| `git.pull_request.opened` | `pull_request`, id `PpmGitObject` (для ручной ссылки без объекта — id `PpmGitLink`) | `{field: "work_items", new: "LMP-3, LMP-7"}` — видимые задачи доски/спринта, связанные с PR | `git.pull_request.opened:<id PR>` | первое появление PR в PPM |
| `git.pull_request.merged` | то же | то же | `git.pull_request.merged:<id PR>` | **S2a:** время слияния у провайдера (GitHub `merged_at`); у PR, ещё не пересинхронизированного после обновления, — последнее обновление влитого PR у провайдера |
| `vault.version` | `vault_file`, id записи Хранилища | `{field: "version", old, new}` — `old`: `"N-1"` или `null` (первая версия), `new`: `"N"` | `vault.version:<PpmVaultVersion.id>` | время версии |
| `board.node.added` | `node`, id фигуры | карточка PPM: `{field: "kind", new: <вид узла>}` (`note`, `group`, `work_item_ref`, `vault_file_ref`, …); нативная фигура: `{field: "shape_type", new: <тип tldraw>}` (`note` = стикер, `geo`, `text`, `frame`, `image`, …) | `board.node.added:<shape_id>` | `created_at` карточки; иначе время сохранённой версии, в которой фигура появилась (для истории до S2a — поиск по версиям: не позже настоящего времени, устойчиво между опросами). **Никогда** — у фигур исходного содержимого доски (первой сохранённой версии, см. ниже) |
| `board.node.changed` | `node`, id фигуры | `{field: "kind", new: <вид узла>}` | `board.node.changed:<shape_id>:<updated_at узла>` — после каждой новой правки id новый, прежнее событие исчезает | `updated_at` карточки |

- **Типы связей в `detail.field`** — как в истории Plane, с направлением от `entity`: `blocked_by` (entity
  заблокирована `other`), `blocking` (entity блокирует `other`), `start_before`/`start_after`,
  `finish_before`/`finish_after` («Зависит от»), `relates_to` («Связано»), `implemented_by` (other реализует entity),
  `implements` (entity реализует other), `duplicate` («Дубликат» — на доске не рисуется, но в ленте есть). Две строки
  одной связи Plane сервер склеивает в одно событие с фигурами обеих задач.
- **Что НЕ событие:** перемещение и изменение размера фигур, стрелки/линии/перо/маркер (`arrow`, `line`, `draw`,
  `highlight`) и tldraw-группировка; описание, комментарии, метки, даты начала, спринты и модули задач; изменения
  нативных фигур (только «добавлено»). Сворачивание карточки PPM меняет её `updated_at` — это `board.node.changed`.
- **Доска сравнивается по сохранённым версиям:** текущая сохранённая против последней сохранённой на момент `since`.
  Несохранённые правки в ленту не попадают; после автосохранения (≈1 с) — со следующим опросом. С S2a каждая версия
  при сохранении отмечает, какие фигуры в ней появились и у каких карточек PPM сменился `updated_at` узла, — отсюда
  время и автор событий доски; следующие сохранения их не переставляют.
- **Исходное содержимое доски (финальная волна, M-1).** Первая сохранённая версия доски (наименьший номер: первое
  сохранение новой доски — собранная карта; у копии доски — версия 1 с содержимым копии) — её исходное содержимое:
  фигуры этой версии **никогда** не дают `board.node.added` — при любом `since` и в любом режиме (правило по id фигуры:
  удалённая и возвращённая фигура исходного содержимого тоже не «добавлена»). Изменённые позже карточки — по-прежнему
  `board.node.changed`; если `since` раньше первой версии, «изменена» только карточка, чью правку сохранила версия после
  исходного содержимого (отметка правки), а не любая с `updated_at` в окне. Итог: участник, впервые открывший свежую
  карту без личной отметки, видит «Что изменилось» пустым (а не «добавлено» на каждой карточке); после «Разложить всё»,
  «+ Добавить» и правок — только их. Копия доски сразу после копирования — пустая лента. Доска без версий — пустой
  список, без ошибок.
- **PR (S2a):** влитый до начала окна PR — не событие (ни «открыт», ни «влит»), даже если позже у него была активность
  у провайдера (комментарий, метка): после «Отметить просмотренным» он не возвращается в ленту. PR, который PPM впервые
  увидел уже влитым (слияние не позже первого появления: репозиторий подключили позже, пропущен webhook), даёт только
  «влит» — «открыт» не бывает позже «влит» (финальная волна).
- **Задачи ленты:** активные привязки задач на доске + задачи спринта, если в **сохранённом** снимке есть узел `group`
  с `map: {"role": "sprint", "cycle_id": "<uuid>"}` (схема F; до 10 рамок; спринт должен быть этого проекта). Ограниченный
  гость получает события только своих задач. **Рамки спринта (M-7):** сервер берёт задачи **всех** рамок спринта
  снимка (до 10, на любой глубине), в том числе в режиме «с начала спринта» (его `since` задаёт клиент); шапка клиента
  (название и начало спринта) — по первой рамке верхнего уровня (одно правило для C и M, клиент). На доске с двумя
  картами лента покажет задачи обоих спринтов, а шапка — один; это принятое решение.
- Отметка по умолчанию (spec E): `GET …/me/` → `seen_at`; если `null` — `max(created_at доски из списка досок, сейчас −
  7 дней)` считает клиент. «С начала спринта» — `start_date` спринта; если старше 30 дней, сервер обрежет окно
  (`truncated: true`). После `PUT …/me/seen/` запрашивать ленту с `since = seen_at` из ответа PUT.
- Стоимость: число запросов не зависит от размера доски; доска на 300 фигур — ≈11–20 мс на сервере (S2a: 11 запросов,
  для истории до S2a — до 21). Длинная история (финальная волна): 3000 версий доски за 30 дней, 300 фигур — 20–25 мс,
  ≈30 запросов (с учётом проверок прав). Опрос раз в 60 с при открытой панели (R8) — нормально.

## 4. S3 — `GET canvas/boards/<board_id>/me/` и `PUT canvas/boards/<board_id>/me/seen/`

- Оба отвечают 200 `{"seen_at": ISO | null, "seen_version": int | null}`; `null`/`null` — отметки ещё нет.
- `PUT` тело не читает (можно пустое): `seen_at` — серверное «сейчас», `seen_version` — текущая версия доски (`0`, если
  доску ещё не сохраняли). Отметка личная; повторный `PUT` сдвигает ту же отметку вперёд; одновременные `PUT` из двух
  вкладок безопасны.
- Права — чтение доски: гость тоже может отмечать. Архивная или чужая доска → 404 `CANVAS_BOARD_NOT_FOUND`.
- На dev-стенде эндпоинты заработают после `migrate ppm_canvas` (делает контроллер; до этого — 500).

## 5. S4 — `GET canvas/work-items/<work_item_id>/boards/`

- 200 `{"results": [{"board_id": uuid, "name": str, "shape_id": str}]}` — **одна строка на доску** (первая по времени
  карточка задачи на ней), порядок — как в рейке досок. Только активные привязки (ожидающие — фигура ещё не сохранена —
  не видны) на активных досках; архивных досок нет. Не лежит ни на одной — `{"results": []}`.
- 404 `WORK_ITEM_NOT_FOUND` — задача невидима пользователю (ограниченный гость, чужая задача), удалена или из другого
  проекта; название при этом не раскрывается. 403 `CANVAS_PERMISSION_DENIED` — не участник проекта.
- Эндпоинт не создаёт Холст проекту — безопасно вызывать при каждом открытии карточки задачи.
- Ссылка на доску с выделением карточки — глубокая ссылка F (CONTRACTS §2): `…/brain?board=<board_id>&shape=<shape_id>`.

## 6. Предлагаемые zod-схемы (для `ppm-canvas-map.service.ts` и `ppm-canvas-changes.service.ts`)

```ts
import { z } from "zod";
import { ppmCanvasBindingMutationResponseSchema } from "@ppm/canvas";

export const ppmBatchBindingResultSchema = z.discriminatedUnion("status", [
  z.object({ shape_id: z.string(), status: z.literal("created"), binding: ppmCanvasBindingMutationResponseSchema }),
  z.object({
    shape_id: z.string().nullable(),
    status: z.literal("error"),
    error: z.object({ code: z.string(), message: z.string(), details: z.record(z.string(), z.unknown()) }),
  }),
]);
export const ppmBatchBindingResponseSchema = z.object({ results: z.array(ppmBatchBindingResultSchema) });

export const PPM_BOARD_CHANGE_KINDS = [
  "work_item.state", "work_item.assignees", "work_item.due", "work_item.priority", "work_item.name",
  "work_item.relation", "git.pull_request.opened", "git.pull_request.merged", "vault.version",
  "board.node.added", "board.node.changed",
] as const;
export const ppmBoardChangeSchema = z.object({
  id: z.string(),
  kind: z.enum(PPM_BOARD_CHANGE_KINDS),
  occurred_at: z.string().datetime({ offset: true }),
  actor: z.object({ id: z.string().uuid(), display_name: z.string() }).nullable(),
  entity: z.object({
    type: z.enum(["work_item", "pull_request", "vault_file", "node"]),
    id: z.string(), // для "node" — id фигуры ("shape:…"), не UUID
    identifier: z.string().optional(),
    title: z.string().optional(),
  }),
  shape_ids: z.array(z.string()),
  detail: z.object({
    field: z.string().optional(),
    old: z.string().nullable().optional(),
    new: z.string().nullable().optional(),
  }),
});
export const ppmBoardChangesResponseSchema = z.object({
  since: z.string().datetime({ offset: true }),
  until: z.string().datetime({ offset: true }),
  items: z.array(ppmBoardChangeSchema),
  truncated: z.boolean(),
});

export const ppmBoardUserStateSchema = z.object({
  seen_at: z.string().datetime({ offset: true }).nullable(),
  seen_version: z.number().int().nonnegative().nullable(),
});

export const ppmWorkItemBoardsResponseSchema = z.object({
  results: z.array(z.object({ board_id: z.string().uuid(), name: z.string(), shape_id: z.string() })),
});
```

## 7. Git-связи: состояние PR (финальная волна, M-6)

- `GET git/links/`, `GET git/` (`links`) и ответ `POST git/links/` — у каждой связи новое поле `git_object_state`:
  состояние Git-объекта как у объекта (`serialize_git_object.state`): у PR — `"open"`, `"closed"` (закрыт **без**
  слияния), `"merged"`; у ветки — как пришло от провайдера (например, `"deleted"`); у ручной ссылки без Git-объекта
  (`git_object_id: null`) — `null`. В zod: `git_object_state: z.string().nullable()`.
- Лоток «Не на карте» (клиент, FW-W) не показывает PR с `"closed"`; `"merged"`, `"open"` и `null` остаются.
- Состояние читается вместе со связью (`select_related`) — число запросов списка не зависит от числа связей.
