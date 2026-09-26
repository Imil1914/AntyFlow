# AF2.2 «Живая карта проекта» — часть S (сервер): план реализации

> **Для агентов-исполнителей.** ОБЯЗАТЕЛЬНЫЙ ПОД-НАВЫК: `superpowers:subagent-driven-development` (рекомендуется) или
> `superpowers:executing-plans`. Задачи — строго по порядку **S1 → S2 → S3 → S4** (все правят `views.py`/`urls.py`, и
> блок «Было» каждой следующей задачи рассчитан на состояние файла после предыдущей). Шаги отмечены чекбоксами
> (`- [ ]`), TDD: сначала красный тест, потом код. **Коммитов нет** (проект не коммитит): шага «Commit» нет, снимок дерева
> делает контроллер (`tools/af22-snap.sh`).

**Цель.** Серверная часть AF2.2: пакетная привязка фигур (S1), лента «Что изменилось» по запросу (S2), личная отметка
«просмотрено» (S3) и поиск досок, на которых лежит задача (S4).

**Архитектура.** Всё — в приложении `plane.ppm_canvas`, по его образцам: `PpmMultiBoardAPIView` +
`require_canvas_capability` (права), `get_or_create_active_canvas` + `resolve_board` (доска проекта, архивная → 404),
ошибки через `ppm_error_response`. Логика — в новых модулях сервисов (`batch_bindings.py`, `changes.py`,
`board_user_state.py`, `work_item_boards.py`), представления — один размеченный блок `# ── AF2.2 S ──` в конце
классов `views.py`, маршруты — один размеченный блок в `urls.py`. Одна новая модель `PpmCanvasBoardUserState` и миграция
`0009_board_user_state`. Лента собирается из существующих данных (решение R4 спецификации: без журнала событий);
пакетная привязка переиспользует путь одиночной привязки (та же семантика и проверки).

**Стек.** Django 5.2.15, DRF, Python 3.12.5, psycopg 3.3.4 (образ `plane-fork-api-tests:latest`), PostgreSQL 15.7
(тестовый стек); тесты — pytest 9.0.3 + pytest-django 4.12.0 (`apps/api/requirements/test.txt`); линт — ruff 0.9.7
(`apps/api/pyproject.toml`: line-length 120, правила `E`, `F`).

**Спецификация.** `docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.2 — Живая карта проекта: сборка из
спринта, светофор, «Не на карте», «Что изменилось».md` — разделы «Сервер (A-S*)», E, «Контракты и инварианты».
Обязательные формы API — `docs/superpowers/plans/2026-09-26-af22/drafts/CONTRACTS.md` §5. Всё, что клиентским линиям M и
C нужно знать сверх §5 (форматы полей, коды ошибок, семантика), — `drafts/plan-S-contract-notes.md`.

**Проверено 2026-09-26.** Весь код плана прогнан на копии `apps/api` в изолированном тестовом стеке: блоки «Было/Стало»
применены скриптом по задачам к чистой копии рабочего дерева (каждый «Было» найден ровно один раз); «красный» прогон
новых тестов на неизменённом коде — 19 failed (404) + ошибка импорта в S3; после S1 — 25 passed, после S2 — 17 passed,
после S3 — 5 passed, после S4 — `ppm_canvas` + `ppm_vault` = **195 passed** (базовая линия 172 = 107 + 65, новых 23);
`ruff check` и `ruff format --check` чистые после каждой задачи. Лента для доски из 300 фигур отвечает за ≈18 мс.

---

## Глобальные ограничения

1. **Владение (CONTRACTS §0).** Только `apps/api/plane/ppm_canvas/**` и тесты
   `apps/api/plane/tests/contract/ppm_canvas/test_{batch_bindings,board_changes,board_user_state,work_item_boards}_api.py`.
   Не трогать: `apps/api/plane/settings/**`, `apps/api/plane/urls.py`, `apps/api/requirements/**`, другие приложения
   (`db`, `ppm_git`, `ppm_vault`, `ppm_core`), `apps/web/**`, `packages/**`.
2. **Пред-образы.** Перед первой правкой или созданием каждого файла:
   `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools/af22-pre.sh <путь от plane-fork>` (для нового
   файла сохраняется маркер `.__absent__`; повторный вызов для того же пути ничего не делает).
3. **Без коммитов**; не выполнять `git add` (в т.ч. `-N`), `git stash/checkout/restore`.
4. **Dev-стек не трогать** (`plane-fork-*` из `docker-compose-local.yml`, dev-сервер :3000). Dev-API :8000 запущен с
   `uvicorn --reload` и монтирует `./apps/api` — правки он подхватит сам. Миграцию `0009` к dev-БД **не применять**: это
   делает контроллер перед живой проверкой (шаг S3.10).
5. **Ошибки** — только `ppm_error_response` (`{"error": {"code", "message", "request_id", "details"}}`), сообщения
   по-русски, коды `UPPER_SNAKE`. Существующие ответы, коды и поля не меняются — только добавляются новые.
6. **Права и приватность** (spec «Контракты и инварианты»): права проверяет сервер; «лента не раскрывает сущности,
   невидимые пользователю»; содержимое (тела заметок, текст файлов, описания задач) в ленту не попадает; без ИИ и новых
   внешних запросов.
7. **Лимиты (spec S1, S2, «Производительность»):** пакет — «до 200 пунктов»; лента — «`since` не раньше 30 дней (иначе
   обрезается, `truncated: true`), не больше 200 событий», новые первыми; «лента ≤ 1 с на доске с 300 фигурами».
8. **Тесты** — контрактные, в стиле `tests/contract/ppm_canvas/*`: `pytestmark = [pytest.mark.contract,
   pytest.mark.django_db]`, фабрики `plane.tests.factories`, `api_client.force_authenticate(user=…)`.
9. **Стиль** — `ruff check` и `ruff format --check` чистые для всех изменённых файлов (команда `RUFF` ниже).
10. **Номера строк** в «Было» — по рабочему дереву 2026-09-26 до правок линии S; вставки выше по файлу сдвигают нижние
    строки, поэтому ориентир — текст блока «Было»: каждый встречается в своём файле ровно один раз на момент своей задачи
    (проверено скриптом), а каждый «Стало» — дословно прогнанный код.

## Review Focus

Входы и отказы, о которых спецификация молчит, но которые первыми ударят по людям; у каждого — тест в задаче-владельце.

1. **Нечитаемые данные доски** — повреждённый или старый JSON карточки, запись без типа, доска без сохранённых версий,
   удалённая задача на доске: лента отвечает 200, пропускает нечитаемое, историю удалённой задачи не показывает
   (S2 `test_feed_survives_unreadable_cards_empty_boards_and_deleted_tasks`).
2. **Чужой `author_id` в снимке** — его пишет клиент; UUID постороннего пользователя не должен раскрыть его имя
   (S2 `test_foreign_author_ids_in_the_snapshot_do_not_reveal_user_names`).
3. **Рамка спринта со спринтом другого проекта** (скопированная доска, ручная правка) — задачи чужого проекта в ленту не
   попадают (S2 `test_feed_includes_tasks_of_the_sprint_frame_even_without_their_cards`).
4. **Пакет с дублями и мусором** — две карточки на одну фигуру, неверный `shape_id`, не-объект вместо пункта: ошибки по
   пунктам, остальные привязки сохраняются, никакого 500 (S1 `test_batch_reports_errors_per_item_and_keeps_the_valid_items`).
5. **Карта на 200 задач одним шагом истории** — прежний лимит сохранения доски (100 активаций) сломал бы полный пакет
   (S1 `test_a_full_batch_of_200_is_bound_in_one_request_and_activated_by_one_save`).

---

## 0. Как запускать тесты и линт

API-тесты идут через `docker-compose-test.yml` (сервис `api-tests` монтирует `./apps/api`, ставит
`requirements/test.txt`, `DJANGO_SETTINGS_MODULE=plane.settings.test`; `apps/api/pytest.ini` добавляет `--reuse-db
--nomigrations`). На этой машине (ARM64) образа MinIO из Quay нет — выбирается локальный через `PPM_E2E_MINIO_IMAGE`.
Чтобы не собирать образ заново (минуты, сеть), линия переиспользует готовый образ под именем своего compose-проекта:

```bash
# один раз на линию (тег образа Docker — не правка репозитория)
cd /Users/ermolov/Desktop/PPM/plane-fork
docker image inspect ppm-af22-s-api-tests:latest >/dev/null 2>&1 \
  || docker tag plane-fork-api-tests:latest ppm-af22-s-api-tests:latest
```

Дальше «**`PYTEST <аргументы>`**» означает ровно эту команду:

```bash
cd /Users/ermolov/Desktop/PPM/plane-fork && \
PPM_E2E_MINIO_IMAGE=ppm-af12-minio:RELEASE.2025-09-07T16-13-09Z \
docker compose -p ppm-af22-s -f docker-compose-test.yml run --rm api-tests \
  pytest -p no:cacheprovider -q -W ignore::DeprecationWarning <аргументы>
```

- Первый запуск поднимает `ppm-af22-s-test-{db,redis,mq,minio}-1` (≈30–60 с), они остаются между запусками; каждый
  запуск заново ставит test-зависимости pip'ом (≈20 с, нужна сеть к PyPI) — штатное поведение compose-файла.
- `--reuse-db`: пока `test-db` жив, схема тестовой БД не пересоздаётся. После появления новой модели (S3) первый прогон —
  с `--create-db`, иначе `relation "ppm_canvas_board_user_states" does not exist`.
- Не запускать два `PYTEST` одновременно (общая тестовая БД).
- Базовая линия до S (проверено): `PYTEST plane/tests/contract/ppm_canvas` → `107 passed`; `ppm_vault` → `65 passed`.
- После всей линии (если контроллер не просит оставить стек):
  `cd /Users/ermolov/Desktop/PPM/plane-fork && docker compose -p ppm-af22-s -f docker-compose-test.yml down -v`.

«**`RUFF <файлы>`**» — линт в одноразовом контейнере, без записи кеша в дерево:

```bash
docker run --rm -v /Users/ermolov/Desktop/PPM/plane-fork/apps/api:/code -w /code --entrypoint sh \
  plane-fork-api-tests:latest -c 'pip install -q ruff==0.9.7 && ruff check --no-cache <файлы> && ruff format --no-cache --check <файлы>'
```

Ожидается `All checks passed!` и `N files already formatted`. Пути файлов — от `apps/api` (например,
`plane/ppm_canvas/views.py`).

## Карта файлов

| Файл (от `apps/api/plane/`) | Задача | Ответственность |
|---|---|---|
| `ppm_canvas/serializers.py` | S1, S2 | `PPM_CANVAS_BATCH_MAX_ITEMS` и лимит активаций/удалений сохранения (100 → 200); сериализатор пункта пакета; `PPM_CANVAS_CHANGES_MAX_ITEMS` и сериализатор параметров ленты |
| `ppm_canvas/batch_bindings.py` (новый) | S1 | пакет привязок: блокировка доски, пункты в savepoint'ах через сервисы одиночной привязки, JSON как у одиночной |
| `ppm_canvas/changes.py` (новый) | S2 | лента «Что изменилось»: источники, видимость, склейка связей, сравнение версий доски, лимиты |
| `ppm_canvas/models.py` | S3 | модель `PpmCanvasBoardUserState` |
| `ppm_canvas/migrations/0009_board_user_state.py` (новый) | S3 | миграция модели |
| `ppm_canvas/board_user_state.py` (новый) | S3 | чтение и установка личной отметки |
| `ppm_canvas/work_item_boards.py` (новый) | S4 | доски задачи по индексу `ppm_binding_source_idx` |
| `ppm_canvas/views.py` | S1–S4 | 5 классов в блоке `# ── AF2.2 S: живая карта проекта ──` … `# ── /AF2.2 S ──` + импорты |
| `ppm_canvas/urls.py` | S1–S4 | 5 маршрутов в размеченном блоке после маршрута `ppm-canvas-board-binding-detail` + импорты |
| `tests/contract/ppm_canvas/test_batch_bindings_api.py` (новый) | S1 | 5 тестов |
| `tests/contract/ppm_canvas/test_board_changes_api.py` (новый) | S2 | 12 тестов |
| `tests/contract/ppm_canvas/test_board_user_state_api.py` (новый) | S3 | 4 теста (включая сверку миграции с моделью) |
| `tests/contract/ppm_canvas/test_work_item_boards_api.py` (новый) | S4 | 2 теста |

Эндпоинты (все под `/api/ppm/v1/workspaces/<workspace_id:uuid>/projects/<project_id:uuid>/`):

| Метод и путь | Имя маршрута | Права |
|---|---|---|
| `POST canvas/boards/<board_id>/bindings/batch/` | `ppm-canvas-board-bindings-batch` | редактирование (`edit`) |
| `GET canvas/boards/<board_id>/changes/?since=&limit=` | `ppm-canvas-board-changes` | чтение (`read`) |
| `GET canvas/boards/<board_id>/me/` | `ppm-canvas-board-user-state` | чтение |
| `PUT canvas/boards/<board_id>/me/seen/` | `ppm-canvas-board-seen` | чтение |
| `GET canvas/work-items/<work_item_id>/boards/` | `ppm-canvas-work-item-boards` | чтение + видимость задачи |

---

## Задача S1 — пакетная привязка `bindings/batch/`

**Файлы**
- Изменить: `apps/api/plane/ppm_canvas/serializers.py:11-28` (константа, лимит активаций) и конец файла (после
  строки 277, `return attrs` в `PpmWorkItemPatchSerializer.validate`) — сериализатор пункта.
- Создать: `apps/api/plane/ppm_canvas/batch_bindings.py`.
- Изменить: `apps/api/plane/ppm_canvas/views.py:21` и `:32-33` (импорты), `:1266-1269` (блок AF2.2 S между концом
  `PpmCanvasWorkItemsViewExport` и `def _plane_issue_request_data`).
- Изменить: `apps/api/plane/ppm_canvas/urls.py:3-4` (импорт), `:83-87` (маршрут после `ppm-canvas-board-binding-detail`).
- Создать тест: `apps/api/plane/tests/contract/ppm_canvas/test_batch_bindings_api.py`.

**Интерфейсы**
- Потребляет (из `ppm_canvas/services.py`, без изменений): `create_work_item_binding(*, board, project, user, shape_id,
  entity_id, client_operation_id) -> (PpmCanvasBinding, bool)`, `create_content_binding(...)` и
  `create_git_binding(...)` (те же аргументы + `entity_type`), `GIT_ENTITY_TYPES`, `PpmCanvasConflict`,
  `PpmProjectionConflict` (поля `code`, `message`, `details`), `get_visible_work_items(*, project, user,
  include_inactive)`, `serialize_work_item(*, issue, access)`, `serialize_missing_work_item(*, binding)`,
  `serialize_binding(*, binding, access, user, project, restricted_guest)`, `_serialize_resolved_binding(*, binding,
  source)`, `_user_is_restricted_guest(*, project, user) -> bool` (AF2.1).
- Производит: `serializers.PPM_CANVAS_BATCH_MAX_ITEMS = 200`; `serializers.PpmCanvasBatchBindingItemSerializer`;
  `batch_bindings.create_bindings_batch(*, board, project, user, access, items: list) -> list[dict]` (результаты в
  порядке входа); `batch_bindings.create_binding(...)` (выбор сервиса по типу, как в одиночном POST);
  `batch_bindings.batch_client_operation_id(*, board_id, shape_id, entity_type, entity_id) -> uuid.UUID`;
  `batch_bindings.serialize_bindings(*, bindings, access, user, project) -> dict[UUID, dict]`; представление
  `views.PpmCanvasBindingBatchView`; маршрут `ppm-canvas-board-bindings-batch`; блоки-маркеры `# ── AF2.2 S: живая карта
  проекта ──` / `# ── /AF2.2 S ──` в `views.py` и `urls.py` (S2–S4 вставляют перед закрывающим маркером).

**Решения S1**
- **Одна транзакция, доска блокируется один раз, каждый пункт — в своей точке сохранения (savepoint), через сервис
  одиночной привязки.** Почему: спецификация требует «ту же семантику и проверки, что у одиночной привязки», а контракт —
  «ответ по каждому пункту» (частичный успех). Переиспользование сервисов исключает расхождение проверок (видимость
  задачи, карантин файла, активность Git-объекта, занятость фигуры, идемпотентность). Вложенный `transaction.atomic()`
  внутри внешнего — это savepoint: `PpmProjectionConflict` или `IntegrityError` откатывает только свой пункт, внешняя
  транзакция живёт дальше (`IntegrityError` ловится снаружи `atomic`, как требует Django). Блокировка доски на весь пакет
  упорядочивает его с другими писателями привязок и снимков (они тоже блокируют доску; холст пакет не блокирует, поэтому
  цикла блокировок с `save_canvas_snapshot` — холст → доска — нет). Отвергнуто: отдельная массовая вставка (дублирует
  проверки и идемпотентность — риск расхождения), фиксация по пункту без общей транзакции (200 циклов блокировки,
  повторы проверок доски). Цена — ≈11 запросов на пункт в сервисах одиночной привязки (замер на тестовом стеке:
  50 пунктов — 577 запросов, 0,24 с; 200 — 2227 запросов, 0,82 с) при бюджете сборки карты 5 с; сериализация ответа —
  одним запросом на все задачи (`serialize_bindings`, как `get_canvas_bindings_payload`).
- **`client_operation_id` необязателен:** без него сервер выводит `uuid5` из (доска, фигура, тип, id источника) — повтор
  того же пакета после обрыва сети возвращает те же привязки (`status: "created"`, `idempotent_replay: true`).
- **Ошибки пунктов — в ответе 200**, даже если все пункты с ошибками; 400 — только для конверта: `items` не список
  (`CANVAS_BATCH_INVALID`), пуст (`CANVAS_BATCH_EMPTY`), больше 200 (`CANVAS_BATCH_TOO_LARGE`, `details: {max_items,
  received}`). Неверный пункт (формат `shape_id`, тип, UUID, не-объект) — ошибка пункта `BINDING_INVALID` с `details` от
  сериализатора: одна испорченная карточка не ломает всю карту.
- **Лимит сохранения доски поднят со 100 до 200** активаций/удалений (`PpmCanvasBindingChangesSerializer`), иначе полный
  пакет нельзя активировать одним снимком — а сборка карты по спецификации «одним шагом истории».
- Права — как у сохранения доски: `require_canvas_capability("edit")` (гость → 403 `CANVAS_WRITE_FORBIDDEN`). Доска
  архивная → 404 `CANVAS_BOARD_NOT_FOUND`; заархивирована между проверкой и блокировкой → 409 `CANVAS_BOARD_ARCHIVED`.

- [ ] **S1.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools/af22-pre.sh \
  apps/api/plane/ppm_canvas/serializers.py apps/api/plane/ppm_canvas/batch_bindings.py \
  apps/api/plane/ppm_canvas/views.py apps/api/plane/ppm_canvas/urls.py \
  apps/api/plane/tests/contract/ppm_canvas/test_batch_bindings_api.py
```

Ожидается (при первом вызове) 5 строк `pre-image saved: apps/api/plane/…`.

- [ ] **S1.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_canvas/test_batch_bindings_api.py` целиком:

```python
import uuid

import pytest
from rest_framework import status

from plane.db.models import Issue, State
from plane.ppm_canvas.models import PpmCanvasBinding, PpmCanvasBindingStatus
from plane.ppm_vault.services import create_markdown, get_or_create_project_vault
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]


def make_user(prefix="batch"):
    marker = uuid.uuid4().hex
    return UserFactory(username=f"{prefix}-{marker}", email=f"{prefix}-{marker}@plane.test")


@pytest.fixture
def batch_project():
    lead = make_user("lead")
    workspace = WorkspaceFactory(owner=lead)
    WorkspaceMemberFactory(workspace=workspace, member=lead, role=20)
    project = ProjectFactory(workspace=workspace, identifier="BAT")
    ProjectMemberFactory(workspace=workspace, project=project, member=lead, role=20)
    state = State.objects.create(
        name="Backlog",
        color="#60646C",
        group="backlog",
        default=True,
        project=project,
        created_by=lead,
    )
    return lead, workspace, project, state


def project_path(workspace, project):
    return f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}"


def boards_url(workspace, project):
    return f"{project_path(workspace, project)}/canvas/boards/"


def batch_url(workspace, project, board_id):
    return f"{boards_url(workspace, project)}{board_id}/bindings/batch/"


def create_issue(project, state, user, name):
    issue = Issue(name=name, project=project, state=state)
    issue.save(created_by_id=user.id)
    return issue


def default_board_id(api_client, workspace, project):
    return api_client.get(boards_url(workspace, project)).data["default_board_id"]


def create_board(api_client, workspace, project, name):
    return api_client.post(
        boards_url(workspace, project),
        {"name": name, "client_operation_id": str(uuid.uuid4())},
        format="json",
    ).data["board_id"]


def batch_item(entity, *, shape_id, entity_type="work_item", operation_id=None):
    item = {"shape_id": shape_id, "entity_type": entity_type, "entity_id": str(entity.id)}
    if operation_id:
        item["client_operation_id"] = str(operation_id)
    return item


def snapshot(*shape_ids):
    return {
        "document": {
            "store": {
                shape_id: {"id": shape_id, "typeName": "shape", "type": "ppm-canvas-node"} for shape_id in shape_ids
            }
        }
    }


def save_board(api_client, workspace, project, board_id, *, shape_ids, activate, base_version=0):
    return api_client.put(
        f"{boards_url(workspace, project)}{board_id}/snapshot/",
        {
            "schema_version": 2,
            "base_version": base_version,
            "snapshot": snapshot(*shape_ids),
            "client_operation_id": str(uuid.uuid4()),
            "binding_changes": {"activate": list(activate), "remove": []},
        },
        format="json",
    )


def test_batch_creates_pending_bindings_in_input_order_with_the_single_binding_json(api_client, batch_project):
    lead, workspace, project, state = batch_project
    first = create_issue(project, state, lead, "Первая задача")
    second = create_issue(project, state, lead, "Вторая задача")
    vault = get_or_create_project_vault(workspace_id=workspace.id, project_id=project.id, user_id=lead.id)
    brief = create_markdown(vault=vault, parent_id=None, name="Контекст.md", content="# Контекст", user_id=lead.id)
    api_client.force_authenticate(user=lead)
    board_id = default_board_id(api_client, workspace, project)
    reference_board_id = create_board(api_client, workspace, project, "Эталон")
    single = api_client.post(
        f"{boards_url(workspace, project)}{reference_board_id}/bindings/",
        {**batch_item(first, shape_id="shape:single"), "client_operation_id": str(uuid.uuid4())},
        format="json",
    )

    response = api_client.post(
        batch_url(workspace, project, board_id),
        {
            "items": [
                batch_item(second, shape_id="shape:second"),
                batch_item(first, shape_id="shape:first"),
                batch_item(brief, shape_id="shape:brief", entity_type="vault_file"),
            ]
        },
        format="json",
    )

    assert single.status_code == status.HTTP_201_CREATED
    assert response.status_code == status.HTTP_200_OK
    results = response.data["results"]
    assert [result["shape_id"] for result in results] == ["shape:second", "shape:first", "shape:brief"]
    assert [result["status"] for result in results] == ["created", "created", "created"]
    assert all("error" not in result for result in results)
    assert [result["binding"]["binding_status"] for result in results] == ["pending", "pending", "pending"]
    assert [result["binding"]["idempotent_replay"] for result in results] == [False, False, False]
    assert [result["binding"]["board_id"] for result in results] == [str(board_id)] * 3
    # «Тот же JSON, что у одиночной привязки»: те же ключи и тот же разрешённый источник.
    assert set(results[1]["binding"]) == set(single.data)
    assert results[1]["binding"]["source"] == single.data["source"]
    assert results[1]["binding"]["entity_id"] == str(first.id)
    assert results[2]["binding"]["source"]["display"]["title"] == "Контекст.md"

    activated = save_board(
        api_client,
        workspace,
        project,
        board_id,
        shape_ids=["shape:second", "shape:first", "shape:brief"],
        activate=[result["binding"]["binding_id"] for result in results],
    )

    assert activated.status_code == status.HTTP_200_OK
    assert PpmCanvasBinding.objects.filter(board_id=board_id, status=PpmCanvasBindingStatus.ACTIVE).count() == 3


def test_batch_reports_errors_per_item_and_keeps_the_valid_items(api_client, batch_project):
    lead, workspace, project, state = batch_project
    kept = create_issue(project, state, lead, "Остаётся")
    also_kept = create_issue(project, state, lead, "Тоже остаётся")
    other_project = ProjectFactory(workspace=workspace, identifier="BAT2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=lead, role=20)
    other_state = State.objects.create(
        name="Backlog",
        color="#60646C",
        group="backlog",
        default=True,
        project=other_project,
        created_by=lead,
    )
    foreign = create_issue(other_project, other_state, lead, "Чужая")
    api_client.force_authenticate(user=lead)
    board_id = default_board_id(api_client, workspace, project)

    response = api_client.post(
        batch_url(workspace, project, board_id),
        {
            "items": [
                batch_item(kept, shape_id="shape:kept"),
                batch_item(foreign, shape_id="shape:foreign"),
                batch_item(also_kept, shape_id="shape:kept"),
                {"shape_id": "not-a-shape", "entity_type": "work_item", "entity_id": str(kept.id)},
                {"shape_id": "shape:vault", "entity_type": "vault_file", "entity_id": str(uuid.uuid4())},
                "garbage",
                batch_item(also_kept, shape_id="shape:also"),
            ]
        },
        format="json",
    )

    assert response.status_code == status.HTTP_200_OK
    results = response.data["results"]
    assert [(result["shape_id"], result["status"], result.get("error", {}).get("code")) for result in results] == [
        ("shape:kept", "created", None),
        ("shape:foreign", "error", "WORK_ITEM_NOT_FOUND"),
        ("shape:kept", "error", "BINDING_SHAPE_CONFLICT"),
        ("not-a-shape", "error", "BINDING_INVALID"),
        ("shape:vault", "error", "CONTENT_SOURCE_NOT_FOUND"),
        (None, "error", "BINDING_INVALID"),
        ("shape:also", "created", None),
    ]
    assert "shape_id" in results[3]["error"]["details"]
    assert results[2]["error"]["message"] == "Эта фигура уже связана с источником."
    assert all("binding" not in result for result in results if result["status"] == "error")
    assert set(PpmCanvasBinding.objects.filter(board_id=board_id).values_list("shape_id", flat=True)) == {
        "shape:kept",
        "shape:also",
    }


def test_batch_retry_is_idempotent_and_a_reused_operation_id_is_an_item_error(api_client, batch_project):
    lead, workspace, project, state = batch_project
    first = create_issue(project, state, lead, "Первая")
    second = create_issue(project, state, lead, "Вторая")
    api_client.force_authenticate(user=lead)
    board_id = default_board_id(api_client, workspace, project)
    operation_id = uuid.uuid4()
    payload = {
        "items": [
            batch_item(first, shape_id="shape:first"),
            batch_item(second, shape_id="shape:second", operation_id=operation_id),
        ]
    }

    created = api_client.post(batch_url(workspace, project, board_id), payload, format="json")
    replayed = api_client.post(batch_url(workspace, project, board_id), payload, format="json")
    reused = api_client.post(
        batch_url(workspace, project, board_id),
        {"items": [batch_item(first, shape_id="shape:third", operation_id=operation_id)]},
        format="json",
    )

    created_ids = [result["binding"]["binding_id"] for result in created.data["results"]]
    assert [result["binding"]["binding_id"] for result in replayed.data["results"]] == created_ids
    assert [result["status"] for result in replayed.data["results"]] == ["created", "created"]
    assert [result["binding"]["idempotent_replay"] for result in replayed.data["results"]] == [True, True]
    assert reused.status_code == status.HTTP_200_OK
    assert reused.data["results"][0]["status"] == "error"
    assert reused.data["results"][0]["error"]["code"] == "BINDING_OPERATION_REUSED"
    assert PpmCanvasBinding.objects.filter(board_id=board_id).count() == 2


def test_batch_validates_its_size_and_requires_edit_access_to_an_active_board(api_client, batch_project):
    lead, workspace, project, state = batch_project
    issue = create_issue(project, state, lead, "Задача")
    guest = make_user("guest")
    WorkspaceMemberFactory(workspace=workspace, member=guest, role=5)
    ProjectMemberFactory(workspace=workspace, project=project, member=guest, role=5)
    api_client.force_authenticate(user=lead)
    board_id = default_board_id(api_client, workspace, project)
    archived_board_id = create_board(api_client, workspace, project, "Архивная")
    api_client.post(
        f"{boards_url(workspace, project)}{archived_board_id}/archive/",
        {"client_operation_id": str(uuid.uuid4())},
        format="json",
    )

    empty = api_client.post(batch_url(workspace, project, board_id), {"items": []}, format="json")
    not_a_list = api_client.post(
        batch_url(workspace, project, board_id),
        {"items": {"shape_id": "shape:one"}},
        format="json",
    )
    too_large = api_client.post(
        batch_url(workspace, project, board_id),
        {"items": [batch_item(issue, shape_id=f"shape:n{index}") for index in range(201)]},
        format="json",
    )
    archived = api_client.post(
        batch_url(workspace, project, archived_board_id),
        {"items": [batch_item(issue, shape_id="shape:archived")]},
        format="json",
    )
    api_client.force_authenticate(user=guest)
    forbidden = api_client.post(
        batch_url(workspace, project, board_id),
        {"items": [batch_item(issue, shape_id="shape:guest")]},
        format="json",
    )

    assert (empty.status_code, empty.data["error"]["code"]) == (400, "CANVAS_BATCH_EMPTY")
    assert (not_a_list.status_code, not_a_list.data["error"]["code"]) == (400, "CANVAS_BATCH_INVALID")
    assert (too_large.status_code, too_large.data["error"]["code"]) == (400, "CANVAS_BATCH_TOO_LARGE")
    assert too_large.data["error"]["details"] == {"max_items": 200, "received": 201}
    assert (archived.status_code, archived.data["error"]["code"]) == (404, "CANVAS_BOARD_NOT_FOUND")
    assert (forbidden.status_code, forbidden.data["error"]["code"]) == (403, "CANVAS_WRITE_FORBIDDEN")
    assert PpmCanvasBinding.objects.count() == 0


def test_a_full_batch_of_200_is_bound_in_one_request_and_activated_by_one_save(api_client, batch_project):
    lead, workspace, project, state = batch_project
    issue = create_issue(project, state, lead, "Задача на двухстах карточках")
    api_client.force_authenticate(user=lead)
    board_id = default_board_id(api_client, workspace, project)
    shape_ids = [f"shape:card-{index}" for index in range(200)]

    created = api_client.post(
        batch_url(workspace, project, board_id),
        {"items": [batch_item(issue, shape_id=shape_id) for shape_id in shape_ids]},
        format="json",
    )
    activated = save_board(
        api_client,
        workspace,
        project,
        board_id,
        shape_ids=shape_ids,
        activate=[result["binding"]["binding_id"] for result in created.data["results"]],
    )

    assert created.status_code == status.HTTP_200_OK
    assert {result["status"] for result in created.data["results"]} == {"created"}
    assert activated.status_code == status.HTTP_200_OK, activated.data
    assert PpmCanvasBinding.objects.filter(board_id=board_id, status=PpmCanvasBindingStatus.ACTIVE).count() == 200
```

- [ ] **S1.3 Убедиться, что тесты падают.** `PYTEST plane/tests/contract/ppm_canvas/test_batch_bindings_api.py`
  Ожидается: `5 failed` — `assert 404 == 200` или `AttributeError: 'JsonResponse' object has no attribute 'data'`
  (маршрута `bindings/batch/` ещё нет).

- [ ] **S1.4 `serializers.py`: константа пакета и лимит сохранения доски.** Было (строки 11–28):

```python
from .schema import PPM_CANVAS_SCHEMA_VERSION, validate_canvas_snapshot


class PpmCanvasBindingChangesSerializer(serializers.Serializer):
    activate = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        allow_empty=True,
        max_length=100,
    )
    remove = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        allow_empty=True,
        max_length=100,
    )
```

Стало:

```python
from .schema import PPM_CANVAS_SCHEMA_VERSION, validate_canvas_snapshot


# AF2.2 S1: пакет привязок и одно сохранение доски принимают одинаковое число проекций — карта спринта на
# 200 задач привязывается одним запросом и активируется одним снимком (одним шагом истории).
PPM_CANVAS_BATCH_MAX_ITEMS = 200


class PpmCanvasBindingChangesSerializer(serializers.Serializer):
    activate = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        allow_empty=True,
        max_length=PPM_CANVAS_BATCH_MAX_ITEMS,
    )
    remove = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        default=list,
        allow_empty=True,
        max_length=PPM_CANVAS_BATCH_MAX_ITEMS,
    )
```

- [ ] **S1.5 `serializers.py`: сериализатор пункта пакета — в конец файла.** Было (строки 274–277, последние в файле):

```python
    def validate(self, attrs):
        if not any(field in attrs for field in ("state_id", "priority", "assignee_ids", "due_date")):
            raise serializers.ValidationError("At least one editable field is required.")
        return attrs
```

Стало:

```python
    def validate(self, attrs):
        if not any(field in attrs for field in ("state_id", "priority", "assignee_ids", "due_date")):
            raise serializers.ValidationError("At least one editable field is required.")
        return attrs


# ── AF2.2 S: живая карта проекта ──


class PpmCanvasBatchBindingItemSerializer(serializers.Serializer):
    """AF2.2 S1: один пункт пакета — те же поля, что у одиночной привязки; `client_operation_id` необязателен
    (без него сервер выводит детерминированный id из доски, фигуры и источника — повтор пакета идемпотентен)."""

    shape_id = serializers.RegexField(r"^shape:[A-Za-z0-9_-]+$", max_length=255)
    entity_type = serializers.ChoiceField(choices=PpmCanvasEntityType.choices)
    entity_id = serializers.UUIDField()
    client_operation_id = serializers.UUIDField(required=False, allow_null=True, default=None)
```

- [ ] **S1.6 Создать `apps/api/plane/ppm_canvas/batch_bindings.py`** целиком:

```python
"""AF2.2 S1 — пакетная привязка фигур доски к источникам (сборка карты спринта одним запросом).

Каждый пункт проходит ровно тот же путь, что одиночная привязка (`create_work_item_binding`,
`create_content_binding`, `create_git_binding`): те же проверки видимости, идемпотентность по
`client_operation_id`, привязка остаётся `pending` до сохранения доски. Пакет — одна транзакция, доска
заблокирована один раз на весь пакет; каждый пункт — в своей точке сохранения (savepoint), поэтому ошибка
одного пункта откатывает только его, а остальные сохраняются. Результаты — в порядке входа.
"""

import uuid

from django.db import IntegrityError, transaction

from .models import PpmCanvasBoard, PpmCanvasEntityType, PpmCanvasStatus
from .serializers import PpmCanvasBatchBindingItemSerializer
from .services import (
    GIT_ENTITY_TYPES,
    PpmCanvasConflict,
    PpmProjectionConflict,
    _serialize_resolved_binding,
    _user_is_restricted_guest,
    create_content_binding,
    create_git_binding,
    create_work_item_binding,
    get_visible_work_items,
    serialize_binding,
    serialize_missing_work_item,
    serialize_work_item,
)


def batch_client_operation_id(*, board_id, shape_id, entity_type, entity_id):
    """Идентификатор операции для пункта без `client_operation_id`: один и тот же для одной и той же фигуры и
    источника на этой доске, поэтому повтор пакета после обрыва сети возвращает уже созданные привязки."""
    return uuid.uuid5(uuid.NAMESPACE_URL, f"ppm:canvas:{board_id}:batch-binding:{shape_id}:{entity_type}:{entity_id}")


def create_binding(*, board, project, user, shape_id, entity_type, entity_id, client_operation_id):
    """Тот же выбор сервиса по типу источника, что в `PpmCanvasBindingListCreateView.post`."""
    if entity_type == PpmCanvasEntityType.WORK_ITEM:
        return create_work_item_binding(
            board=board,
            project=project,
            user=user,
            shape_id=shape_id,
            entity_id=entity_id,
            client_operation_id=client_operation_id,
        )
    create = create_git_binding if entity_type in GIT_ENTITY_TYPES else create_content_binding
    return create(
        board=board,
        project=project,
        user=user,
        shape_id=shape_id,
        entity_type=entity_type,
        entity_id=entity_id,
        client_operation_id=client_operation_id,
    )


def _item_shape_id(item):
    shape_id = item.get("shape_id") if isinstance(item, dict) else None
    return shape_id if isinstance(shape_id, str) and len(shape_id) <= 255 else None


def _error(shape_id, *, code, message, details=None):
    return {
        "shape_id": shape_id,
        "status": "error",
        "error": {"code": code, "message": message, "details": details or {}},
    }


def create_bindings_batch(*, board, project, user, access, items):
    outcomes = []
    with transaction.atomic():
        locked_board = PpmCanvasBoard.objects.select_for_update().get(pk=board.pk)
        if locked_board.status != PpmCanvasStatus.ACTIVE:
            raise PpmCanvasConflict(
                code="CANVAS_BOARD_ARCHIVED",
                message="Доска находится в архиве и не принимает изменения.",
                details={"board_id": str(locked_board.id)},
            )
        for item in items:
            serializer = PpmCanvasBatchBindingItemSerializer(data=item)
            if not serializer.is_valid():
                outcomes.append(
                    _error(
                        _item_shape_id(item),
                        code="BINDING_INVALID",
                        message="Пункт пакета не прошёл проверку.",
                        details=serializer.errors,
                    )
                )
                continue
            data = serializer.validated_data
            operation_id = data["client_operation_id"] or batch_client_operation_id(
                board_id=locked_board.id,
                shape_id=data["shape_id"],
                entity_type=data["entity_type"],
                entity_id=data["entity_id"],
            )
            try:
                with transaction.atomic():
                    binding, replay = create_binding(
                        board=locked_board,
                        project=project,
                        user=user,
                        shape_id=data["shape_id"],
                        entity_type=data["entity_type"],
                        entity_id=data["entity_id"],
                        client_operation_id=operation_id,
                    )
            except PpmProjectionConflict as conflict:
                outcomes.append(
                    _error(data["shape_id"], code=conflict.code, message=conflict.message, details=conflict.details)
                )
            except IntegrityError:
                outcomes.append(
                    _error(
                        data["shape_id"],
                        code="BINDING_CONFLICT",
                        message="Привязку не удалось сохранить: фигура или операция уже заняты.",
                    )
                )
            else:
                outcomes.append({"shape_id": binding.shape_id, "binding": binding, "replay": replay})

    created = [outcome["binding"] for outcome in outcomes if "binding" in outcome]
    payloads = serialize_bindings(bindings=created, access=access, user=user, project=project)
    return [
        {
            "shape_id": outcome["shape_id"],
            "status": "created",
            "binding": {**payloads[outcome["binding"].id], "idempotent_replay": outcome["replay"]},
        }
        if "binding" in outcome
        else outcome
        for outcome in outcomes
    ]


def serialize_bindings(*, bindings, access, user, project):
    """JSON привязок — побайтно как у одиночной привязки (`serialize_binding`), но задачи читаются одним запросом,
    а проверка ограниченного гостя делается один раз на пакет (как в `get_canvas_bindings_payload`)."""
    work_item_ids = [binding.entity_id for binding in bindings if binding.entity_type == PpmCanvasEntityType.WORK_ITEM]
    issues_by_id = {}
    if work_item_ids:
        issues = (
            get_visible_work_items(project=project, user=user, include_inactive=True)
            .filter(id__in=work_item_ids)
            .select_related("project", "workspace", "state")
            .prefetch_related("assignees")
        )
        issues_by_id = {issue.id: issue for issue in issues}
    restricted_guest = None
    if any(binding.entity_type == PpmCanvasEntityType.PAGE for binding in bindings):
        restricted_guest = _user_is_restricted_guest(project=project, user=user)
    payloads = {}
    for binding in bindings:
        if binding.entity_type == PpmCanvasEntityType.WORK_ITEM:
            issue = issues_by_id.get(binding.entity_id)
            source = (
                serialize_work_item(issue=issue, access=access)
                if issue
                else serialize_missing_work_item(binding=binding)
            )
            payloads[binding.id] = _serialize_resolved_binding(binding=binding, source=source)
        else:
            payloads[binding.id] = serialize_binding(
                binding=binding,
                access=access,
                user=user,
                project=project,
                restricted_guest=restricted_guest,
            )
    return payloads
```

- [ ] **S1.7 `views.py`: импорты.** Было (строка 21):

```python
from .permissions import PpmCanvasAccess, get_ppm_canvas_access, get_ppm_canvas_capabilities
```

Стало:

```python
from .batch_bindings import create_bindings_batch
from .permissions import PpmCanvasAccess, get_ppm_canvas_access, get_ppm_canvas_capabilities
```

Было (строки 32–33):

```python
from .serializers import (
    PpmCanvasBindingCreateSerializer,
```

Стало:

```python
from .serializers import (
    PPM_CANVAS_BATCH_MAX_ITEMS,
    PpmCanvasBindingCreateSerializer,
```

- [ ] **S1.8 `views.py`: блок AF2.2 S с представлением пакета.** Было (строки 1266–1269: конец
  `PpmCanvasWorkItemsViewExport.get` и начало вспомогательных функций):

```python
        return response


def _plane_issue_request_data(validated_data):
```

Стало:

```python
        return response


# ── AF2.2 S: живая карта проекта ──


class PpmCanvasBindingBatchView(PpmMultiBoardAPIView):
    """S1: до 200 привязок одним запросом; ответ — по каждому пункту, в порядке входа."""

    def post(self, request, workspace_id, project_id, board_id):
        access, project, _, denied = self.require_canvas_capability(request, workspace_id, project_id, "edit")
        if denied:
            return denied
        items = request.data.get("items") if isinstance(request.data, dict) else None
        if not isinstance(items, list):
            return ppm_error_response(
                request,
                code="CANVAS_BATCH_INVALID",
                message="Передайте пункты пакета списком в поле items.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if not items:
            return ppm_error_response(
                request,
                code="CANVAS_BATCH_EMPTY",
                message="Пакет привязок пуст.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        if len(items) > PPM_CANVAS_BATCH_MAX_ITEMS:
            return ppm_error_response(
                request,
                code="CANVAS_BATCH_TOO_LARGE",
                message=f"В одном пакете можно привязать не больше {PPM_CANVAS_BATCH_MAX_ITEMS} фигур.",
                status_code=status.HTTP_400_BAD_REQUEST,
                details={"max_items": PPM_CANVAS_BATCH_MAX_ITEMS, "received": len(items)},
            )
        canvas = get_or_create_active_canvas(
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=request.user.id,
        )
        board, missing = self.resolve_board(request, canvas, board_id)
        if missing:
            return missing
        try:
            results = create_bindings_batch(
                board=board,
                project=project,
                user=request.user,
                access=access,
                items=items,
            )
        except PpmCanvasConflict as conflict:
            return self.canvas_conflict_response(request, conflict)
        logger.info(
            "PPM Canvas batch projections bound",
            extra={
                "board_id": str(board.id),
                "project_id": str(project.id),
                "user_id": str(request.user.id),
                "items": len(items),
                "errors": sum(1 for result in results if result["status"] == "error"),
            },
        )
        return Response({"results": results}, status=status.HTTP_200_OK)


# ── /AF2.2 S ──


def _plane_issue_request_data(validated_data):
```

- [ ] **S1.9 `urls.py`: импорт и маршрут.** Было (строки 3–4):

```python
from .views import (
    PpmCanvasBindingDetailView,
```

Стало:

```python
from .views import (
    PpmCanvasBindingBatchView,
    PpmCanvasBindingDetailView,
```

Было (строки 83–87):

```python
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/boards/<uuid:board_id>/bindings/<uuid:binding_id>/",
        PpmCanvasBindingDetailView.as_view(),
        name="ppm-canvas-board-binding-detail",
    ),
```

Стало:

```python
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/boards/<uuid:board_id>/bindings/<uuid:binding_id>/",
        PpmCanvasBindingDetailView.as_view(),
        name="ppm-canvas-board-binding-detail",
    ),
    # ── AF2.2 S: живая карта проекта ──
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/boards/<uuid:board_id>/bindings/batch/",
        PpmCanvasBindingBatchView.as_view(),
        name="ppm-canvas-board-bindings-batch",
    ),
    # ── /AF2.2 S ──
```

- [ ] **S1.10 Тесты зелёные.** `PYTEST plane/tests/contract/ppm_canvas/test_batch_bindings_api.py
  plane/tests/contract/ppm_canvas/test_projection_api.py`
  Ожидается: `25 passed` (5 новых + 20 существующих тестов одиночной привязки — её путь не менялся).

- [ ] **S1.11 Линт.** `RUFF plane/ppm_canvas/serializers.py plane/ppm_canvas/batch_bindings.py plane/ppm_canvas/views.py
  plane/ppm_canvas/urls.py plane/tests/contract/ppm_canvas/test_batch_bindings_api.py`
  Ожидается: `All checks passed!`, `5 files already formatted`.

---

## Задача S2 — лента «Что изменилось» `changes/`

**Файлы**
- Изменить: `apps/api/plane/ppm_canvas/serializers.py` — конец файла (после сериализатора пункта из S1.5).
- Создать: `apps/api/plane/ppm_canvas/changes.py`.
- Изменить: `apps/api/plane/ppm_canvas/views.py` — импорты (строки из S1.7) и новый класс перед `# ── /AF2.2 S ──`.
- Изменить: `apps/api/plane/ppm_canvas/urls.py` — импорт (строка 6 до правок S) и маршрут перед `    # ── /AF2.2 S ──`.
- Создать тест: `apps/api/plane/tests/contract/ppm_canvas/test_board_changes_api.py`.

**Интерфейсы**
- Потребляет: `services.get_visible_work_items`; модели `PpmCanvasBinding`, `PpmCanvasVersion` (`snapshot_json`,
  `created_at`, неизменяемы), `plane.db.models.IssueActivity`/`CycleIssue`/`User`, `ppm_git.models.PpmGitLink`
  (+`git_object`), `ppm_vault.models.PpmVaultVersion`; `plane.utils.issue_relation_mapper.get_actual_relation`; схема
  узла группы от линии F: `props.node` (JSON-строка) карточки `type="ppm-canvas-node"` с `kind: "group"` и
  `map: {"role": "sprint", "cycle_id": "<uuid>"}` (CONTRACTS §3).
- Производит: `serializers.PPM_CANVAS_CHANGES_MAX_ITEMS = 200`; `serializers.PpmCanvasBoardChangesQuerySerializer`
  (`since` — обязательный ISO 8601, `limit` — 1…200, по умолчанию 200); `changes.get_board_changes(*, board, project,
  user, since: datetime, limit: int) -> dict` — ответ ровно в форме CONTRACTS §5 S2; `changes.PPM_CANVAS_CHANGES_MAX_DAYS
  = 30`; представление `views.PpmCanvasBoardChangesView`; маршрут `ppm-canvas-board-changes`.

**Решения S2**
1. **Окно и лимиты.** Окно `(since, until]`, `until` — серверное «сейчас». `since` раньше `until − 30 дней` →
   обрезается до этой границы, `truncated: true`; `since` в будущем → равен `until` (пусто). Из каждого источника
   берётся не больше `2·limit + 1` строк (связь задач — две строки на событие); упёрлись → `truncated: true`. Итог
   сортируется по `(occurred_at, id)` по убыванию и режется до `limit` (лишнее → `truncated: true`).
2. **Какие задачи.** Активные привязки `work_item` этой доски плюс задачи спринтов из рамок `group` с `map.role =
   "sprint"` в **текущем сохранённом** снимке (не больше 10 рамок; `CycleIssue` только этого проекта, удалённые спринты не
   считаются — рамка с чужим `cycle_id` ничего не добавляет), пересечённые с `get_visible_work_items(include_inactive=
   True)` без удалённых и черновиков (архивные остаются — их история видна в Plane). Ограниченный гость
   (`guest_view_all_features = False`) видит события только своих задач.
3. **`IssueActivity`** (значения `field` — из `bgtasks/issue_activities_task.py`): `state` → `work_item.state`,
   `assignees` → `work_item.assignees` (строка на каждого добавленного/снятого), `target_date` → `work_item.due`
   (`detail.field = "due_date"`, значения приводятся к `YYYY-MM-DD`), `priority`, `name`; связи — `relates_to`,
   `duplicate`, `blocked_by`, `blocking`, `start_before`, `start_after`, `finish_before`, `finish_after`,
   `implemented_by`, `implements` с глаголом `updated` (добавлена) или `deleted` (удалена). Описание, комментарии, метки,
   дата начала, спринты и модули — не события ленты (спецификация E их не перечисляет).
4. **Связи склеиваются.** Plane пишет связь двумя строками — по одной на каждую задачу, с общим `epoch`, взаимно-обратными
   полями и идентификатором другой задачи в значении (у удаления вторая строка несёт ошибочный `old_identifier`, поэтому
   ключ склейки — `(verb, epoch, get_actual_relation(field), {идентификатор задачи, идентификатор из значения})`). Итог —
   одно событие: id по меньшему id строки (устойчив между опросами), `shape_ids` обеих задач. Идентификатор другой задачи
   показывается, только если она видна пользователю, иначе `null`: ограниченный гость не узнаёт номера чужих задач.
5. **PR.** Провайдер не сохраняет дату открытия (`GitHubAppClient.normalize_pull_request` кладёт `metadata = {}`),
   поэтому «открыт» = первое появление PR в PPM: `PpmGitObject.first_seen_at` (для ручной ссылки без объекта —
   `PpmGitLink.created_at`); PR, у которого с начала окна не было активности у провайдера (`provider_updated_at ≤
   since`), — старый PR из первой синхронизации, события «открыт» нет. «Влит» = `state == "merged"` и `provider_updated_at`
   в окне. Только активные связи с активными репозиториями и только для задач из п. 2 (видимость PR = видимость задачи).
   PR, связанный с несколькими задачами, — одно событие; `shape_ids` — карточки PR (по id объекта или ссылки) и задач.
6. **Файлы Хранилища** — версии (`status = verified`) записей, привязанных к доске; только `ACTIVE` (корзина и карантин не
   видны, как в самом Хранилище); `content_text` не читается (`defer`).
7. **Доска.** База — последняя версия доски с `created_at ≤ since` (нет — пустая доска). Карточка PPM (`type =
   "ppm-canvas-node"`, узел — JSON-строка в `props.node`): нет в базе → `board.node.added` (время — `created_at` узла,
   если он в окне, автор — `author_id`; иначе время версии, где карточка появилась, без автора — вставка или копия со
   старым `created_at`); есть в базе и `updated_at` в окне → `board.node.changed`, **`actor: null`** (узел хранит
   создателя, а не редактора — выдавать создателя за автора правки было бы неправдой). Нативные фигуры tldraw — только
   «добавлено» (нет в базе), кроме `arrow`, `line`, `draw`, `highlight` (как клиентский счётчик объектов
   `canvas-toolkit-model.ts:454`) и `group` (группировка — не новый объект). Перемещение и размер не меняют `updated_at`
   узла — не события; сворачивание карточки меняет — событие. Нечитаемые записи пропускаются.
8. **Время появления фигуры без своей метки** — деление пополам по неизменяемой истории версий: шаг — один запрос, который
   возвращает только ключи фигур версии (`jsonb_each` на стороне Postgres, без передачи снимка до 2 МиБ); не больше 12
   шагов на запрос, при исчерпании — верхняя граница диапазона. История неизменяема, поэтому время устойчиво между
   опросами (лента не «переставляет» события при каждом автосохранении). Сырой SQL — единственный способ взять ключи jsonb
   без выгрузки документа; прецедент `connection.cursor()` — `ppm_canvas/management/commands/ppm_backend_preflight.py:21`;
   БД проекта и тестов — PostgreSQL.
9. **Авторы.** `author_id` карточки пишет клиент, поэтому имя показывается, только если это участник рабочего
   пространства (один запрос на все события); иначе `actor: null`. Для задач — `IssueActivity.actor`; для файлов —
   автор версии (тоже через участников пространства). Имя — `display_name` → имя и фамилия → «Участник» (email не
   отдаётся).
10. **Запросы** не зависят от числа задач, событий, файлов и фигур: до 12 своих (версия, привязки, роль, задачи,
    активность, видимость связанных задач — только если есть связи, PR, файлы, база, ключи базы, время версий, авторы) +
    ≤ 12 шагов по истории + общие проверки прав и холста любого эндпоинта доски (≈20; всего на тестовой доске — 32).
    Тест сравнивает доску с 1 и с 12 «единицами» данных.
11. Эндпоинт — тем же путём, что остальные эндпоинты доски (`require_canvas_capability("read")`,
    `get_or_create_active_canvas`, `resolve_board`): архивная или чужая доска → 404 `CANVAS_BOARD_NOT_FOUND`; параметры
    проверяются после доски → 400 `CANVAS_CHANGES_INVALID` (`details` — по параметрам).

- [ ] **S2.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools/af22-pre.sh \
  apps/api/plane/ppm_canvas/changes.py apps/api/plane/tests/contract/ppm_canvas/test_board_changes_api.py
```

Ожидается 2 строки `pre-image saved: …` (`serializers.py`, `views.py`, `urls.py` сохранены в S1.1).

- [ ] **S2.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_canvas/test_board_changes_api.py` целиком:

```python
import json
import time
import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status

from plane.db.models import Cycle, CycleIssue, Issue, IssueActivity, State
from plane.ppm_canvas.models import PpmCanvasBinding, PpmCanvasBoard, PpmCanvasVersion
from plane.ppm_canvas.services import create_canvas_board, get_or_create_active_canvas, save_canvas_snapshot
from plane.ppm_git.models import (
    PpmGitConnection,
    PpmGitInstallation,
    PpmGitLink,
    PpmGitLinkOrigin,
    PpmGitObject,
    PpmGitRepository,
)
from plane.ppm_vault.models import PpmVaultEntry, PpmVaultVersion
from plane.ppm_vault.services import create_markdown, get_or_create_project_vault, trash_entry, update_markdown
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]


def make_user(prefix, display_name=""):
    marker = uuid.uuid4().hex
    user = UserFactory(username=f"{prefix}-{marker}", email=f"{prefix}-{marker}@plane.test")
    if display_name:
        user.display_name = display_name
        user.save(update_fields=["display_name"])
    return user


def add_member(env, user, role):
    WorkspaceMemberFactory(workspace=env.workspace, member=user, role=role)
    ProjectMemberFactory(workspace=env.workspace, project=env.project, member=user, role=role)
    return user


@pytest.fixture
def board_env():
    lead = make_user("lead", "Анна")
    workspace = WorkspaceFactory(owner=lead)
    WorkspaceMemberFactory(workspace=workspace, member=lead, role=20)
    project = ProjectFactory(workspace=workspace, identifier="LMP")
    ProjectMemberFactory(workspace=workspace, project=project, member=lead, role=20)
    backlog = State.objects.create(
        name="Backlog",
        color="#60646C",
        group="backlog",
        default=True,
        project=project,
        created_by=lead,
    )
    canvas = get_or_create_active_canvas(workspace_id=workspace.id, project_id=project.id, user_id=lead.id)
    return SimpleNamespace(
        lead=lead,
        workspace=workspace,
        project=project,
        backlog=backlog,
        canvas=canvas,
        board=canvas.default_board,
        since=timezone.now() - timedelta(days=2),
    )


def at(env, hours):
    return env.since + timedelta(hours=hours)


def ms(moment):
    """Время узла PPM пишет клиент (`new Date().toISOString()`) — с точностью до миллисекунд."""
    return moment.replace(microsecond=moment.microsecond // 1000 * 1000)


def js_iso(moment):
    return ms(moment).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def create_issue(env, name, *, creator=None):
    issue = Issue(name=name, project=env.project, state=env.backlog)
    issue.save(created_by_id=(creator or env.lead).id)
    return issue


def identifier(issue):
    return f"LMP-{issue.sequence_id}"


def node_record(shape_id, *, kind="note", author=None, created, updated=None, title="", extra=None, x=0):
    node = {
        "schema_version": 2,
        "kind": kind,
        "author_id": str(author.id) if author else "local-user",
        "created_at": js_iso(created),
        "updated_at": js_iso(updated or created),
        "title": title,
        "body": "секретный текст карточки",
        "visual": {"color": "neutral", "width": 240, "height": 160},
        **(extra or {}),
    }
    return {
        "id": shape_id,
        "typeName": "shape",
        "type": "ppm-canvas-node",
        "x": x,
        "y": 0,
        "props": {"w": 240, "h": 160, "node": json.dumps(node, ensure_ascii=False)},
    }


def native_record(shape_id, shape_type, *, x=0):
    return {"id": shape_id, "typeName": "shape", "type": shape_type, "x": x, "y": 0, "props": {}}


def card(shape_id, env, kind="work_item_ref"):
    return node_record(shape_id, kind=kind, author=env.lead, created=env.since - timedelta(days=5))


def save_version(env, *records, moment, activate=(), board=None):
    target = PpmCanvasBoard.objects.get(pk=(board or env.board).pk)
    _, version, _ = save_canvas_snapshot(
        board=target,
        user_id=env.lead.id,
        request_id=uuid.uuid4(),
        base_version=target.current_version,
        schema_version=2,
        snapshot={"document": {"store": {record["id"]: record for record in records}}},
        client_operation_id=uuid.uuid4(),
        binding_changes={"activate": [str(binding.id) for binding in activate], "remove": []},
    )
    PpmCanvasVersion.objects.filter(id=version.id).update(created_at=moment)
    return version


def bind(env, entity_type, entity_id, shape_id, *, board=None):
    return PpmCanvasBinding.objects.create(
        workspace_id=env.workspace.id,
        project_id=env.project.id,
        canvas=env.canvas,
        board=board or env.board,
        shape_id=shape_id,
        entity_type=entity_type,
        entity_id=entity_id,
        client_operation_id=uuid.uuid4(),
        operation_fingerprint=f"test-{shape_id}",
        created_by=env.lead.id,
    )


def activity(env, issue, *, field, moment, old="", new="", actor=None, verb="updated", epoch=None):
    row = IssueActivity.objects.create(
        issue=issue,
        project=env.project,
        workspace=env.workspace,
        verb=verb,
        field=field,
        old_value=old,
        new_value=new,
        actor=actor or env.lead,
        epoch=epoch if epoch is not None else moment.timestamp(),
        comment="",
    )
    IssueActivity.objects.filter(id=row.id).update(created_at=moment)
    return row


def git_repository(env):
    repository = PpmGitRepository.objects.create(
        workspace_id=env.workspace.id,
        project_id=env.project.id,
        name="PPM",
        normalized_name="ppm",
        provider="github",
        provider_repository_id=101,
        provider_full_name="ppm/ppm",
        canonical_url="https://github.com/ppm/ppm",
        clone_https="https://github.com/ppm/ppm.git",
        default_branch="main",
        created_by=env.lead.id,
        updated_by=env.lead.id,
    )
    installation = PpmGitInstallation.objects.create(
        workspace_id=env.workspace.id,
        project_id=env.project.id,
        provider_installation_id=201,
        provider_account_id=301,
        account_login="ppm",
        created_by=env.lead.id,
        updated_by=env.lead.id,
    )
    git_connection = PpmGitConnection.objects.create(
        workspace_id=env.workspace.id,
        project_id=env.project.id,
        installation=installation,
        repository=repository,
        provider_repository_id=101,
        provider_full_name="ppm/ppm",
        created_by=env.lead.id,
        updated_by=env.lead.id,
    )
    return repository, git_connection


def pull_request(env, repository, git_connection, *, number, title, state, first_seen, updated):
    git_object = PpmGitObject.objects.create(
        workspace_id=env.workspace.id,
        project_id=env.project.id,
        connection=git_connection,
        repository=repository,
        object_type="pull_request",
        provider_object_id=str(1000 + number),
        ref=str(number),
        title=title,
        canonical_url=f"https://github.com/ppm/ppm/pull/{number}",
        state=state,
        source_version=f"pr:{number}",
        provider_updated_at=updated,
    )
    PpmGitObject.objects.filter(id=git_object.id).update(first_seen_at=first_seen)
    git_object.refresh_from_db()
    return git_object


def link_pull_request(env, repository, git_object, issue):
    return PpmGitLink.objects.create(
        workspace_id=env.workspace.id,
        project_id=env.project.id,
        repository=repository,
        git_object=git_object,
        work_item=issue,
        object_type="pull_request",
        ref=git_object.ref,
        title=git_object.title[:255],
        canonical_url=git_object.canonical_url,
        origin=PpmGitLinkOrigin.PROVIDER,
        created_by=env.lead.id,
        updated_by=env.lead.id,
    )


def changes_url(env, board=None):
    return (
        f"/api/ppm/v1/workspaces/{env.workspace.id}/projects/{env.project.id}"
        f"/canvas/boards/{(board or env.board).id}/changes/"
    )


def get_changes(api_client, env, *, since, limit=None, board=None):
    params = {"since": since.isoformat()}
    if limit is not None:
        params["limit"] = limit
    return api_client.get(changes_url(env, board), params)


def test_feed_reports_task_field_changes_newest_first_with_stable_ids(api_client, board_env):
    env = board_env
    colleague = add_member(env, make_user("colleague", "Борис"), 15)
    task = create_issue(env, "Собрать карту")
    unrelated = create_issue(env, "Не на доске")
    binding = bind(env, "work_item", task.id, "shape:task")
    save_version(env, card("shape:task", env), moment=env.since - timedelta(hours=1), activate=[binding])
    activity(env, task, field="state", old="Backlog", new="Todo", moment=env.since - timedelta(minutes=5))
    state = activity(env, task, field="state", old="Backlog", new="In progress", actor=colleague, moment=at(env, 1))
    assignee = activity(env, task, field="assignees", old="", new="Борис", moment=at(env, 2))
    due = activity(env, task, field="target_date", old="", new="2026-10-01", moment=at(env, 3))
    priority = activity(env, task, field="priority", old="none", new="high", moment=at(env, 4))
    name = activity(env, task, field="name", old="Собрать карту", new="Собрать карту спринта", moment=at(env, 5))
    activity(env, task, field="description", old="<p>старое</p>", new="<p>секрет</p>", moment=at(env, 6))
    activity(env, task, field="comment", new="секрет", verb="created", moment=at(env, 6))
    activity(env, unrelated, field="state", old="Backlog", new="Done", moment=at(env, 7))
    api_client.force_authenticate(user=env.lead)

    response = get_changes(api_client, env, since=env.since)
    again = get_changes(api_client, env, since=env.since)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["since"] == env.since.isoformat()
    assert response.data["truncated"] is False
    items = response.data["items"]
    assert [item["id"] for item in items] == [
        f"work_item.name:{name.id}",
        f"work_item.priority:{priority.id}",
        f"work_item.due:{due.id}",
        f"work_item.assignees:{assignee.id}",
        f"work_item.state:{state.id}",
    ]
    assert [item["id"] for item in again.data["items"]] == [item["id"] for item in items]
    assert items[-1] == {
        "id": f"work_item.state:{state.id}",
        "kind": "work_item.state",
        "occurred_at": at(env, 1).isoformat(),
        "actor": {"id": str(colleague.id), "display_name": "Борис"},
        "entity": {
            "type": "work_item",
            "id": str(task.id),
            "identifier": identifier(task),
            "title": "Собрать карту",
        },
        "shape_ids": ["shape:task"],
        "detail": {"field": "state", "old": "Backlog", "new": "In progress"},
    }
    assert items[3]["detail"] == {"field": "assignees", "old": None, "new": "Борис"}
    assert items[2]["detail"] == {"field": "due_date", "old": None, "new": "2026-10-01"}
    assert items[1]["detail"] == {"field": "priority", "old": "none", "new": "high"}
    assert items[0]["detail"] == {"field": "name", "old": "Собрать карту", "new": "Собрать карту спринта"}
    assert "секрет" not in json.dumps(response.data, ensure_ascii=False)


def test_feed_includes_tasks_of_the_sprint_frame_even_without_their_cards(api_client, board_env):
    env = board_env
    sprint = Cycle.objects.create(
        name="Спринт 12",
        project=env.project,
        owned_by=env.lead,
        start_date=env.since,
        end_date=env.since + timedelta(days=14),
    )
    next_sprint = Cycle.objects.create(
        name="Спринт 13",
        project=env.project,
        owned_by=env.lead,
        start_date=env.since + timedelta(days=14),
        end_date=env.since + timedelta(days=28),
    )
    in_sprint = create_issue(env, "Задача спринта")
    in_next_sprint = create_issue(env, "Задача следующего спринта")
    CycleIssue.objects.create(cycle=sprint, issue=in_sprint, project=env.project)
    CycleIssue.objects.create(cycle=next_sprint, issue=in_next_sprint, project=env.project)
    sprint_change = activity(env, in_sprint, field="state", old="Backlog", new="In progress", moment=at(env, 1))
    activity(env, in_next_sprint, field="state", old="Backlog", new="In progress", moment=at(env, 2))
    other_project = ProjectFactory(workspace=env.workspace, identifier="LMP2")
    ProjectMemberFactory(workspace=env.workspace, project=other_project, member=env.lead, role=20)
    other_state = State.objects.create(
        name="Backlog",
        color="#60646C",
        group="backlog",
        default=True,
        project=other_project,
        created_by=env.lead,
    )
    foreign_sprint = Cycle.objects.create(
        name="Чужой спринт",
        project=other_project,
        owned_by=env.lead,
        start_date=env.since,
        end_date=env.since + timedelta(days=14),
    )
    foreign_task = Issue(name="Чужая задача", project=other_project, state=other_state)
    foreign_task.save(created_by_id=env.lead.id)
    CycleIssue.objects.create(cycle=foreign_sprint, issue=foreign_task, project=other_project)
    foreign_change = IssueActivity.objects.create(
        issue=foreign_task,
        project=other_project,
        workspace=env.workspace,
        verb="updated",
        field="state",
        old_value="Backlog",
        new_value="Done",
        actor=env.lead,
        comment="",
    )
    IssueActivity.objects.filter(id=foreign_change.id).update(created_at=at(env, 3))
    api_client.force_authenticate(user=env.lead)

    without_frame = get_changes(api_client, env, since=env.since)
    save_version(
        env,
        node_record(
            "shape:sprint",
            kind="group",
            author=env.lead,
            created=env.since - timedelta(days=1),
            title="Спринт 12",
            extra={"map": {"role": "sprint", "cycle_id": str(sprint.id)}},
        ),
        # Рамка со спринтом другого проекта (например, скопированная с чужой доски) ничего не добавляет в ленту.
        node_record(
            "shape:foreign-sprint",
            kind="group",
            author=env.lead,
            created=env.since - timedelta(days=1),
            extra={"map": {"role": "sprint", "cycle_id": str(foreign_sprint.id)}},
        ),
        moment=env.since - timedelta(hours=1),
    )
    with_frame = get_changes(api_client, env, since=env.since)

    assert without_frame.status_code == status.HTTP_200_OK
    assert without_frame.data["items"] == []
    assert [(item["id"], item["shape_ids"]) for item in with_frame.data["items"]] == [
        (f"work_item.state:{sprint_change.id}", [])
    ]


def test_relation_rows_become_one_event_and_invisible_tasks_are_not_revealed(api_client, board_env):
    env = board_env
    guest = add_member(env, make_user("guest", "Гость"), 5)
    blocker = create_issue(env, "Блокер")
    blocked = create_issue(env, "Заблокированная")
    guest_task = create_issue(env, "Задача гостя", creator=guest)
    bindings = [
        bind(env, "work_item", blocker.id, "shape:blocker"),
        bind(env, "work_item", blocked.id, "shape:blocked"),
        bind(env, "work_item", guest_task.id, "shape:guest"),
    ]
    save_version(
        env,
        card("shape:blocker", env),
        card("shape:blocked", env),
        card("shape:guest", env),
        moment=env.since - timedelta(hours=1),
        activate=bindings,
    )
    added_epoch = at(env, 1).timestamp()
    added = [
        activity(env, blocked, field="blocked_by", new=identifier(blocker), moment=at(env, 1), epoch=added_epoch),
        activity(
            env,
            blocker,
            field="blocking",
            new=identifier(blocked),
            moment=at(env, 1) + timedelta(microseconds=7),
            epoch=added_epoch,
        ),
    ]
    removed_epoch = at(env, 2).timestamp()
    removed = [
        activity(
            env,
            blocked,
            field="blocked_by",
            old=identifier(blocker),
            verb="deleted",
            moment=at(env, 2),
            epoch=removed_epoch,
        ),
        activity(
            env,
            blocker,
            field="blocking",
            old=identifier(blocked),
            verb="deleted",
            moment=at(env, 2) + timedelta(microseconds=7),
            epoch=removed_epoch,
        ),
    ]
    activity(env, guest_task, field="relates_to", new=identifier(blocker), moment=at(env, 3))
    api_client.force_authenticate(user=env.lead)
    lead_view = get_changes(api_client, env, since=env.since)
    api_client.force_authenticate(user=guest)
    guest_view = get_changes(api_client, env, since=env.since)

    lead_items = lead_view.data["items"]
    assert [item["kind"] for item in lead_items] == ["work_item.relation"] * 3
    removed_item, added_item = lead_items[1], lead_items[2]
    assert added_item["id"] == f"work_item.relation:{min(str(row.id) for row in added)}"
    assert removed_item["id"] == f"work_item.relation:{min(str(row.id) for row in removed)}"
    assert sorted(added_item["shape_ids"]) == ["shape:blocked", "shape:blocker"]
    assert added_item["detail"]["old"] is None
    assert added_item["detail"]["new"] in {identifier(blocker), identifier(blocked)}
    assert added_item["detail"]["field"] in {"blocked_by", "blocking"}
    assert removed_item["detail"]["new"] is None
    assert removed_item["detail"]["old"] in {identifier(blocker), identifier(blocked)}
    assert lead_items[0]["detail"] == {"field": "relates_to", "old": None, "new": identifier(blocker)}
    guest_items = guest_view.data["items"]
    assert [item["entity"]["id"] for item in guest_items] == [str(guest_task.id)]
    assert guest_items[0]["detail"] == {"field": "relates_to", "old": None, "new": None}
    assert guest_items[0]["shape_ids"] == ["shape:guest"]
    assert identifier(blocker) not in json.dumps(guest_view.data, ensure_ascii=False)


def test_pull_requests_of_board_tasks_are_reported_when_opened_and_merged(api_client, board_env):
    env = board_env
    task = create_issue(env, "Задача с PR")
    elsewhere = create_issue(env, "Задача без карточки")
    binding = bind(env, "work_item", task.id, "shape:task")
    save_version(env, card("shape:task", env), moment=env.since - timedelta(hours=1), activate=[binding])
    repository, git_connection = git_repository(env)
    fresh = pull_request(
        env,
        repository,
        git_connection,
        number=7,
        title="LMP-1: живая карта",
        state="merged",
        first_seen=at(env, 1),
        updated=at(env, 3),
    )
    historical = pull_request(
        env,
        repository,
        git_connection,
        number=3,
        title="Старый PR",
        state="merged",
        first_seen=at(env, 1),
        updated=env.since - timedelta(days=5),
    )
    unrelated = pull_request(
        env,
        repository,
        git_connection,
        number=9,
        title="Чужой PR",
        state="open",
        first_seen=at(env, 2),
        updated=at(env, 2),
    )
    link_pull_request(env, repository, fresh, task)
    link_pull_request(env, repository, historical, task)
    link_pull_request(env, repository, unrelated, elsewhere)
    api_client.force_authenticate(user=env.lead)

    response = get_changes(api_client, env, since=env.since)

    items = response.data["items"]
    assert [item["id"] for item in items] == [
        f"git.pull_request.merged:{fresh.id}",
        f"git.pull_request.opened:{fresh.id}",
    ]
    assert items[0]["occurred_at"] == at(env, 3).isoformat()
    assert items[1]["occurred_at"] == at(env, 1).isoformat()
    assert items[0]["entity"] == {
        "type": "pull_request",
        "id": str(fresh.id),
        "identifier": "#7",
        "title": "LMP-1: живая карта",
    }
    assert items[0]["actor"] is None
    assert items[0]["shape_ids"] == ["shape:task"]
    assert items[0]["detail"] == {"field": "work_items", "new": identifier(task)}


def test_new_versions_of_vault_files_on_the_board_are_reported(api_client, board_env):
    env = board_env
    vault = get_or_create_project_vault(workspace_id=env.workspace.id, project_id=env.project.id, user_id=env.lead.id)
    plan = create_markdown(vault=vault, parent_id=None, name="План.md", content="# v1", user_id=env.lead.id)
    draft = create_markdown(vault=vault, parent_id=None, name="Черновик.md", content="# v1", user_id=env.lead.id)
    removed = create_markdown(vault=vault, parent_id=None, name="Удалённый.md", content="# v1", user_id=env.lead.id)
    bindings = [bind(env, "vault_file", plan.id, "shape:plan"), bind(env, "vault_file", removed.id, "shape:removed")]
    save_version(
        env,
        card("shape:plan", env, "vault_file_ref"),
        card("shape:removed", env, "vault_file_ref"),
        moment=env.since - timedelta(hours=1),
        activate=bindings,
    )
    PpmVaultVersion.objects.filter(entry_id__in=[plan.id, draft.id, removed.id]).update(
        created_at=env.since - timedelta(days=1)
    )
    for entry in (plan, draft, removed):
        update_markdown(entry=entry, base_version=1, content="# v2 секретный абзац", user_id=env.lead.id)
    trash_entry(entry=PpmVaultEntry.objects.get(id=removed.id), user_id=env.lead.id)
    api_client.force_authenticate(user=env.lead)

    response = get_changes(api_client, env, since=env.since)

    second = PpmVaultVersion.objects.get(entry_id=plan.id, version=2)
    assert response.data["items"] == [
        {
            "id": f"vault.version:{second.id}",
            "kind": "vault.version",
            "occurred_at": second.created_at.isoformat(),
            "actor": {"id": str(env.lead.id), "display_name": "Анна"},
            "entity": {"type": "vault_file", "id": str(plan.id), "title": "План.md"},
            "shape_ids": ["shape:plan"],
            "detail": {"field": "version", "old": "1", "new": "2"},
        }
    ]
    assert "секретный абзац" not in json.dumps(response.data, ensure_ascii=False)


def test_board_diff_reports_added_and_changed_cards_and_added_native_shapes(api_client, board_env):
    env = board_env
    colleague = add_member(env, make_user("colleague", "Борис"), 15)
    long_ago = env.since - timedelta(days=3)
    note = node_record("shape:note", author=env.lead, created=long_ago, title="План")
    untouched = node_record("shape:untouched", author=env.lead, created=long_ago, title="Без изменений")
    sticker = native_record("shape:sticker", "note")
    arrow = native_record("shape:arrow", "arrow")
    save_version(env, note, untouched, sticker, arrow, moment=env.since - timedelta(hours=2))
    edited_note = node_record(
        "shape:note", author=env.lead, created=long_ago, updated=at(env, 1), title="План v2", x=500
    )
    new_note = node_record("shape:new", author=colleague, created=at(env, 2), title="Новая заметка")
    moved_sticker = native_record("shape:sticker", "note", x=900)
    geo = native_record("shape:geo", "geo")
    kept = (edited_note, untouched, new_note, moved_sticker, arrow, geo)
    save_version(env, *kept, moment=at(env, 3))
    save_version(
        env,
        *kept,
        native_record("shape:text", "text"),
        native_record("shape:arrow-2", "arrow"),
        native_record("shape:pen", "draw"),
        moment=at(env, 5),
    )
    api_client.force_authenticate(user=env.lead)

    response = get_changes(api_client, env, since=env.since)

    changed_id = f"board.node.changed:shape:note:{ms(at(env, 1)).isoformat()}"
    items = {item["id"]: item for item in response.data["items"]}
    assert set(items) == {
        changed_id,
        "board.node.added:shape:new",
        "board.node.added:shape:geo",
        "board.node.added:shape:text",
    }
    assert items[changed_id] == {
        "id": changed_id,
        "kind": "board.node.changed",
        "occurred_at": ms(at(env, 1)).isoformat(),
        "actor": None,
        "entity": {"type": "node", "id": "shape:note", "title": "План v2"},
        "shape_ids": ["shape:note"],
        "detail": {"field": "kind", "new": "note"},
    }
    assert items["board.node.added:shape:new"]["actor"] == {"id": str(colleague.id), "display_name": "Борис"}
    assert items["board.node.added:shape:new"]["occurred_at"] == ms(at(env, 2)).isoformat()
    assert items["board.node.added:shape:geo"]["detail"] == {"field": "shape_type", "new": "geo"}
    assert items["board.node.added:shape:geo"]["actor"] is None
    assert items["board.node.added:shape:geo"]["entity"] == {"type": "node", "id": "shape:geo"}
    # Время нативной фигуры — время версии, в которой она появилась (история версий неизменяема).
    assert items["board.node.added:shape:geo"]["occurred_at"] == at(env, 3).isoformat()
    assert items["board.node.added:shape:text"]["occurred_at"] == at(env, 5).isoformat()
    assert "секретный текст" not in json.dumps(response.data, ensure_ascii=False)


def test_foreign_author_ids_in_the_snapshot_do_not_reveal_user_names(api_client, board_env):
    env = board_env
    stranger = make_user("stranger", "Посторонний")
    save_version(
        env,
        node_record("shape:forged", author=stranger, created=at(env, 1), title="Подделка"),
        moment=at(env, 2),
    )
    api_client.force_authenticate(user=env.lead)

    response = get_changes(api_client, env, since=env.since)

    assert [item["id"] for item in response.data["items"]] == ["board.node.added:shape:forged"]
    assert response.data["items"][0]["actor"] is None
    assert "Посторонний" not in json.dumps(response.data, ensure_ascii=False)


def test_feed_window_is_capped_at_30_days_and_items_at_the_limit(api_client, board_env):
    env = board_env
    task = create_issue(env, "Задача")
    binding = bind(env, "work_item", task.id, "shape:task")
    save_version(env, card("shape:task", env), moment=env.since - timedelta(hours=1), activate=[binding])
    for hours in (1, 2, 3):
        activity(env, task, field="priority", old="none", new="high", moment=at(env, hours))
    api_client.force_authenticate(user=env.lead)

    clamped = get_changes(api_client, env, since=timezone.now() - timedelta(days=45))
    limited = get_changes(api_client, env, since=env.since, limit=2)
    complete = get_changes(api_client, env, since=env.since)

    assert clamped.status_code == status.HTTP_200_OK
    until = datetime.fromisoformat(clamped.data["until"])
    assert datetime.fromisoformat(clamped.data["since"]) == until - timedelta(days=30)
    assert clamped.data["truncated"] is True
    # 30 дней назад доски ещё не было, поэтому её карточка тоже «добавлена» в этом окне.
    assert sorted(item["kind"] for item in clamped.data["items"]) == [
        "board.node.added",
        "work_item.priority",
        "work_item.priority",
        "work_item.priority",
    ]
    assert [item["occurred_at"] for item in limited.data["items"]] == [
        at(env, 3).isoformat(),
        at(env, 2).isoformat(),
    ]
    assert limited.data["truncated"] is True
    assert len(complete.data["items"]) == 3
    assert complete.data["truncated"] is False


def test_feed_validates_parameters_and_access(api_client, board_env):
    env = board_env
    guest = add_member(env, make_user("guest"), 5)
    outsider = make_user("outsider")
    WorkspaceMemberFactory(workspace=env.workspace, member=outsider, role=15)
    extra, _ = create_canvas_board(
        canvas=env.canvas,
        name="Архивная",
        user_id=env.lead.id,
        client_operation_id=uuid.uuid4(),
    )
    PpmCanvasBoard.objects.filter(id=extra.id).update(status="archived", archived_at=timezone.now())
    api_client.force_authenticate(user=env.lead)

    missing_since = api_client.get(changes_url(env))
    bad_since = api_client.get(changes_url(env), {"since": "вчера"})
    too_many = api_client.get(changes_url(env), {"since": env.since.isoformat(), "limit": 201})
    zulu = api_client.get(changes_url(env), {"since": js_iso(env.since)})
    archived = get_changes(api_client, env, since=env.since, board=extra)
    api_client.force_authenticate(user=guest)
    guest_view = get_changes(api_client, env, since=env.since)
    api_client.force_authenticate(user=outsider)
    denied = get_changes(api_client, env, since=env.since)

    assert (missing_since.status_code, missing_since.data["error"]["code"]) == (400, "CANVAS_CHANGES_INVALID")
    assert "since" in missing_since.data["error"]["details"]
    assert (bad_since.status_code, bad_since.data["error"]["code"]) == (400, "CANVAS_CHANGES_INVALID")
    assert (too_many.status_code, too_many.data["error"]["code"]) == (400, "CANVAS_CHANGES_INVALID")
    assert zulu.status_code == status.HTTP_200_OK
    assert (archived.status_code, archived.data["error"]["code"]) == (404, "CANVAS_BOARD_NOT_FOUND")
    assert guest_view.status_code == status.HTTP_200_OK
    assert (denied.status_code, denied.data["error"]["code"]) == (403, "CANVAS_PERMISSION_DENIED")


def test_feed_survives_unreadable_cards_empty_boards_and_deleted_tasks(api_client, board_env):
    env = board_env
    task = create_issue(env, "Удалённая задача")
    binding = bind(env, "work_item", task.id, "shape:task")
    api_client.force_authenticate(user=env.lead)
    empty = get_changes(api_client, env, since=env.since)
    save_version(
        env,
        card("shape:task", env),
        {"id": "shape:broken", "typeName": "shape", "type": "ppm-canvas-node", "props": {"node": "{не json"}},
        {"id": "shape:odd", "typeName": "shape", "type": "ppm-canvas-node", "props": "oops"},
        {"id": "shape:untyped", "typeName": "shape"},
        {
            "id": "shape:legacy",
            "typeName": "shape",
            "type": "ppm-canvas-node",
            "props": {"node": json.dumps({"kind": "note", "created_at": "когда-то"})},
        },
        moment=at(env, 1),
        activate=[binding],
    )
    activity(env, task, field="state", old="Backlog", new="In progress", moment=at(env, 2))
    with patch("plane.db.mixins.soft_delete_related_objects"):
        task.delete()

    response = get_changes(api_client, env, since=env.since)

    assert empty.status_code == status.HTTP_200_OK
    assert empty.data["items"] == []
    assert response.status_code == status.HTTP_200_OK
    # Нечитаемые карточки и запись без типа пропускаются; карточка без времени — «добавлена» по сравнению с версией
    # на момент since (её не было) со временем версии; история удалённой задачи не показывается.
    assert sorted(item["id"] for item in response.data["items"]) == [
        "board.node.added:shape:legacy",
        "board.node.added:shape:task",
    ]
    assert {item["occurred_at"] for item in response.data["items"]} == {at(env, 1).isoformat()}


def populate(env, board, count, *, repository, git_connection, vault, prefix):
    records, bindings = [], []
    long_ago = env.since - timedelta(days=5)
    for index in range(count):
        task = create_issue(env, f"{prefix} задача {index}")
        bindings.append(bind(env, "work_item", task.id, f"shape:{prefix}-task-{index}", board=board))
        records.append(node_record(f"shape:{prefix}-task-{index}", kind="work_item_ref", created=long_ago))
        for hours, field in ((1, "state"), (2, "priority"), (3, "name")):
            activity(env, task, field=field, old="старое", new="новое", moment=at(env, hours))
        git_object = pull_request(
            env,
            repository,
            git_connection,
            number=len(prefix) * 1000 + index,
            title=f"PR {prefix} {index}",
            state="merged",
            first_seen=at(env, 1),
            updated=at(env, 2),
        )
        link_pull_request(env, repository, git_object, task)
        entry = create_markdown(
            vault=vault,
            parent_id=None,
            name=f"{prefix} файл {index}.md",
            content="# v1",
            user_id=env.lead.id,
        )
        bindings.append(bind(env, "vault_file", entry.id, f"shape:{prefix}-file-{index}", board=board))
        records.append(node_record(f"shape:{prefix}-file-{index}", kind="vault_file_ref", created=long_ago))
    base = [*records, node_record(f"shape:{prefix}-anchor", created=long_ago)]
    save_version(env, *base, moment=env.since - timedelta(hours=1), activate=bindings, board=board)
    added = [
        *(native_record(f"shape:{prefix}-sticker-{index}", "note") for index in range(count)),
        *(node_record(f"shape:{prefix}-new-{index}", author=env.lead, created=at(env, 4)) for index in range(count)),
    ]
    save_version(env, *base, *added, moment=at(env, 5), board=board)


def test_feed_query_count_does_not_grow_with_tasks_events_files_or_shapes(api_client, board_env):
    env = board_env
    repository, git_connection = git_repository(env)
    vault = get_or_create_project_vault(workspace_id=env.workspace.id, project_id=env.project.id, user_id=env.lead.id)
    small = env.board
    large, _ = create_canvas_board(
        canvas=env.canvas,
        name="Большая",
        user_id=env.lead.id,
        client_operation_id=uuid.uuid4(),
    )
    populate(env, small, 1, repository=repository, git_connection=git_connection, vault=vault, prefix="s")
    populate(env, large, 12, repository=repository, git_connection=git_connection, vault=vault, prefix="large")
    api_client.force_authenticate(user=env.lead)

    with CaptureQueriesContext(connection) as small_queries:
        small_response = get_changes(api_client, env, since=env.since, board=small)
    with CaptureQueriesContext(connection) as large_queries:
        large_response = get_changes(api_client, env, since=env.since, board=large)

    # На единицу: 3 изменения задачи, PR открыт и влит, версия файла, стикер и заметка на доске — 8 событий.
    assert len(small_response.data["items"]) == 8
    assert len(large_response.data["items"]) == 12 * 8
    assert len(large_queries.captured_queries) == len(small_queries.captured_queries)
    # ≈20 из них — общие проверки прав и холста любого эндпоинта доски, остальное — по одному запросу на источник.
    assert len(large_queries.captured_queries) <= 40


def test_feed_for_a_board_with_300_shapes_answers_within_a_second(api_client, board_env):
    env = board_env
    long_ago = env.since - timedelta(days=5)
    tasks = [create_issue(env, f"Задача {index}") for index in range(50)]
    bindings = [bind(env, "work_item", task.id, f"shape:task-{index}") for index, task in enumerate(tasks)]
    cards = [node_record(f"shape:task-{index}", kind="work_item_ref", created=long_ago) for index in range(50)]
    notes = [node_record(f"shape:note-{index}", author=env.lead, created=long_ago) for index in range(100)]
    save_version(env, *cards, *notes, moment=env.since - timedelta(hours=1), activate=bindings)
    edited = [
        node_record(f"shape:note-{index}", author=env.lead, created=long_ago, updated=at(env, 1)) for index in range(50)
    ]
    stickers = [native_record(f"shape:sticker-{index}", "note") for index in range(75)]
    shapes = [native_record(f"shape:geo-{index}", "geo") for index in range(75)]
    for step in range(10):
        visible_stickers = stickers[: 75 * (step + 1) // 10]
        save_version(env, *cards, *edited, *notes[50:], *visible_stickers, *shapes, moment=at(env, 2 + step))
    for task in tasks:
        activity(env, task, field="state", old="Backlog", new="In progress", moment=at(env, 3))
    api_client.force_authenticate(user=env.lead)

    started = time.perf_counter()
    response = get_changes(api_client, env, since=env.since)
    elapsed = time.perf_counter() - started

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data["items"]) == 200
    assert response.data["truncated"] is True
    assert elapsed < 1.0
```

- [ ] **S2.3 Убедиться, что тесты падают.** `PYTEST plane/tests/contract/ppm_canvas/test_board_changes_api.py`
  Ожидается: `12 failed` — `assert 404 == 200` или `AttributeError: 'JsonResponse' object has no attribute 'data'`
  (маршрута `changes/` ещё нет).

- [ ] **S2.4 `serializers.py`: параметры ленты — в конец файла.** Было (последняя строка файла после S1.5):

```python
    client_operation_id = serializers.UUIDField(required=False, allow_null=True, default=None)
```

Стало:

```python
    client_operation_id = serializers.UUIDField(required=False, allow_null=True, default=None)


# AF2.2 S2: не больше 200 событий в ленте «Что изменилось».
PPM_CANVAS_CHANGES_MAX_ITEMS = 200


class PpmCanvasBoardChangesQuerySerializer(serializers.Serializer):
    since = serializers.DateTimeField()
    limit = serializers.IntegerField(
        required=False,
        default=PPM_CANVAS_CHANGES_MAX_ITEMS,
        min_value=1,
        max_value=PPM_CANVAS_CHANGES_MAX_ITEMS,
    )
```

- [ ] **S2.5 Создать `apps/api/plane/ppm_canvas/changes.py`** целиком:

```python
"""AF2.2 S2 — лента «Что изменилось» для доски Холста.

Лента собирается по запросу из существующих данных (решение R4: без отдельного журнала событий):

- Plane `IssueActivity` — статус, исполнители, срок, приоритет, название и связи задач, привязанных к доске
  (активные привязки), и задач спринта, если в текущем снимке есть рамка спринта (`group` с `map.role = "sprint"`);
- `PpmGitLink`/`PpmGitObject` — PR этих задач: «открыт» (первое появление PR в PPM) и «влит»;
- `PpmVaultVersion` — новые версии файлов Хранилища, привязанных к доске;
- снимки доски `PpmCanvasVersion` — карточки PPM по `created_at`/`updated_at` узла, нативные фигуры tldraw — «добавлено»
  по сравнению с версией доски на момент `since`; перемещение изменением не считается.

Видимость: задачи — `get_visible_work_items` (ограниченный гость видит только свои); PR — только через видимые задачи;
файлы — только активные записи Хранилища с проверенной версией; идентификатор связанной задачи, которую пользователь
не видит, не раскрывается. Содержимое (текст заметок и файлов, описания) в ленту не попадает.

Число запросов не зависит от числа событий, задач и фигур: по одному на источник, один на авторов и не больше
`SHAPE_TIME_PROBE_BUDGET` коротких запросов к истории версий доски.
"""

import json
import re
import uuid
from collections import defaultdict
from datetime import timedelta
from datetime import timezone as dt_timezone

from django.db import connection
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from plane.db.models import CycleIssue, IssueActivity, User
from plane.ppm_git.models import PpmGitLink, PpmGitLinkStatus, PpmGitObjectType, PpmGitRepositoryStatus
from plane.ppm_vault.models import PpmVaultEntryStatus, PpmVaultVersion, PpmVaultVersionStatus
from plane.utils.issue_relation_mapper import get_actual_relation

from .models import PpmCanvasBinding, PpmCanvasBindingStatus, PpmCanvasEntityType, PpmCanvasVersion
from .services import get_visible_work_items


PPM_CANVAS_CHANGES_MAX_DAYS = 30
PPM_NODE_SHAPE_TYPE = "ppm-canvas-node"
# Как в клиентском счётчике объектов (`canvas-toolkit-model.ts`, UNCOUNTED_SHAPE_TYPES) плюс tldraw-группа:
# связи, линии и штрихи пера — не «добавленный объект», группировка существующих фигур — тоже.
UNTRACKED_NATIVE_SHAPE_TYPES = frozenset({"arrow", "line", "draw", "highlight", "group"})
# Поле IssueActivity → (вид события, поле в detail).
WORK_ITEM_FIELD_KINDS = {
    "state": ("work_item.state", "state"),
    "assignees": ("work_item.assignees", "assignees"),
    "target_date": ("work_item.due", "due_date"),
    "priority": ("work_item.priority", "priority"),
    "name": ("work_item.name", "name"),
}
# Значения IssueActivity.field для связей (bgtasks/issue_activities_task.py: create/delete_issue_relation_activity).
RELATION_FIELDS = frozenset(
    {
        "relates_to",
        "duplicate",
        "blocked_by",
        "blocking",
        "start_before",
        "start_after",
        "finish_before",
        "finish_after",
        "implemented_by",
        "implements",
    }
)
MAX_SPRINT_FRAMES = 10
GIT_LINK_SCAN_LIMIT = 2000
SHAPE_TIME_PROBE_BUDGET = 12
MAX_NODE_JSON_CHARS = 200_000
MAX_TEXT_CHARS = 255
MAX_TITLE_CHARS = 160
DATE_PREFIX = re.compile(r"^\d{4}-\d{2}-\d{2}")

# Ключи фигур (`record.id`, как в schema.canvas_snapshot_shape_ids) одной версии доски — без передачи самого снимка.
VERSION_SHAPE_IDS_SQL = """
    SELECT COALESCE(record.value ->> 'id', record.key)
    FROM ppm_canvas_versions AS saved
    CROSS JOIN LATERAL jsonb_each(
        CASE
            WHEN jsonb_typeof(saved.snapshot_json -> 'document' -> 'store') = 'object'
            THEN saved.snapshot_json -> 'document' -> 'store'
            ELSE '{}'::jsonb
        END
    ) AS record(key, value)
    WHERE saved.board_id = %s
      AND saved.version = %s
      AND jsonb_typeof(record.value) = 'object'
      AND record.value ->> 'typeName' = 'shape'
"""


def get_board_changes(*, board, project, user, since, limit):
    until = timezone.now()
    truncated = False
    floor = until - timedelta(days=PPM_CANVAS_CHANGES_MAX_DAYS)
    if since < floor:
        since, truncated = floor, True
    since = min(since, until)
    # Связь задач пишется в IssueActivity двумя строками (по одной на каждую задачу) и склеивается в одно событие,
    # поэтому из каждого источника берётся вдвое больше строк, чем нужно событий.
    fetch = 2 * limit + 1

    current = (
        PpmCanvasVersion.objects.filter(board=board, version=board.current_version).first()
        if board.current_version
        else None
    )
    shapes = _shape_records(current.snapshot_json) if current else {}
    nodes = {
        shape_id: _parse_node(record)
        for shape_id, record in shapes.items()
        if record.get("type") == PPM_NODE_SHAPE_TYPE
    }
    shapes_by_entity = _bound_shapes(board)
    visible = get_visible_work_items(project=project, user=user, include_inactive=True).filter(
        deleted_at__isnull=True,
        is_draft=False,
    )
    issues = _relevant_work_items(
        visible=visible,
        project=project,
        bound_ids=[
            entity_id
            for entity_type, entity_id in shapes_by_entity
            if entity_type == PpmCanvasEntityType.WORK_ITEM.value
        ],
        cycle_ids=_sprint_cycle_ids(nodes),
    )

    events = []
    work_item_events, capped = _work_item_events(
        project=project,
        issues=issues,
        visible=visible,
        shapes_by_entity=shapes_by_entity,
        since=since,
        until=until,
        fetch=fetch,
    )
    events.extend(work_item_events)
    truncated = truncated or capped
    git_events, capped = _git_events(
        project=project,
        issues=issues,
        shapes_by_entity=shapes_by_entity,
        since=since,
        until=until,
    )
    events.extend(git_events)
    truncated = truncated or capped
    vault_events, capped = _vault_events(
        project=project,
        shapes_by_entity=shapes_by_entity,
        since=since,
        until=until,
        fetch=fetch,
    )
    events.extend(vault_events)
    truncated = truncated or capped
    events.extend(_board_events(board=board, current=current, shapes=shapes, nodes=nodes, since=since, until=until))

    events.sort(key=lambda event: (event["occurred_at"], event["id"]), reverse=True)
    if len(events) > limit:
        events, truncated = events[:limit], True
    _resolve_authors(events, workspace_id=project.workspace_id)
    return {
        "since": since.isoformat(),
        "until": until.isoformat(),
        "items": [_serialize_event(event) for event in events],
        "truncated": truncated,
    }


def _shape_records(snapshot):
    document = snapshot.get("document") if isinstance(snapshot, dict) else None
    store = document.get("store") if isinstance(document, dict) else None
    if not isinstance(store, dict):
        return {}
    return {
        str(record.get("id", record_id)): record
        for record_id, record in store.items()
        if isinstance(record, dict) and record.get("typeName") == "shape"
    }


def _parse_node(record):
    props = record.get("props")
    raw = props.get("node") if isinstance(props, dict) else None
    if not isinstance(raw, str) or len(raw) > MAX_NODE_JSON_CHARS:
        return None
    try:
        node = json.loads(raw)
    except ValueError:
        return None
    return node if isinstance(node, dict) else None


def _sprint_cycle_ids(nodes):
    cycle_ids = set()
    for node in nodes.values():
        if not node or node.get("kind") != "group":
            continue
        config = node.get("map")
        if not isinstance(config, dict) or config.get("role") != "sprint":
            continue
        try:
            cycle_ids.add(uuid.UUID(str(config.get("cycle_id"))))
        except ValueError:
            continue
        if len(cycle_ids) >= MAX_SPRINT_FRAMES:
            break
    return cycle_ids


def _bound_shapes(board):
    shapes = defaultdict(list)
    bindings = (
        PpmCanvasBinding.objects.filter(board=board, status=PpmCanvasBindingStatus.ACTIVE)
        .order_by("created_at", "id")
        .values_list("shape_id", "entity_type", "entity_id")
    )
    for shape_id, entity_type, entity_id in bindings:
        shapes[(str(entity_type), entity_id)].append(shape_id)
    return shapes


def _shapes_for(shapes_by_entity, entity_type, entity_id):
    return list(shapes_by_entity.get((entity_type.value, entity_id), ()))


def _merge_unique(first, second):
    merged = list(first)
    merged.extend(item for item in second if item not in merged)
    return merged


def _relevant_work_items(*, visible, project, bound_ids, cycle_ids):
    scopes = []
    if bound_ids:
        scopes.append(Q(id__in=bound_ids))
    if cycle_ids:
        sprint_items = CycleIssue.objects.filter(
            workspace_id=project.workspace_id,
            project_id=project.id,
            cycle_id__in=cycle_ids,
            cycle__deleted_at__isnull=True,
        ).values("issue_id")
        scopes.append(Q(id__in=sprint_items))
    if not scopes:
        return {}
    scope = scopes[0]
    for extra in scopes[1:]:
        scope |= extra
    return {issue.id: issue for issue in visible.filter(scope).only("id", "sequence_id", "name")}


def _clean_text(value, limit=MAX_TEXT_CHARS):
    if value is None:
        return None
    text = str(value).strip()
    return text[:limit] or None


def _clean_date(value):
    text = _clean_text(value)
    return text[:10] if text and DATE_PREFIX.match(text) else None


def _display_name(user):
    return (
        user.display_name or " ".join(part for part in (user.first_name, user.last_name) if part).strip() or "Участник"
    )


def _user_actor(user):
    return {"id": str(user.id), "display_name": _display_name(user)} if user else None


def _identifier(project, issue):
    return f"{project.identifier}-{issue.sequence_id}"


def _work_item_entity(project, issue):
    return {
        "type": "work_item",
        "id": str(issue.id),
        "identifier": _identifier(project, issue),
        "title": _clean_text(issue.name) or "",
    }


def _relation_other(row):
    return _clean_text(row.new_value if row.verb == "updated" else row.old_value)


def _visible_identifiers(rows, *, project, visible):
    prefix = f"{project.identifier}-"
    sequences = set()
    for row in rows:
        other = _relation_other(row) if row.field in RELATION_FIELDS else None
        if other and other.startswith(prefix) and other[len(prefix) :].isdigit():
            sequences.add(int(other[len(prefix) :]))
    if not sequences:
        return set()
    found = visible.filter(sequence_id__in=sequences).values_list("sequence_id", flat=True)
    return {f"{prefix}{sequence}" for sequence in found}


def _work_item_events(*, project, issues, visible, shapes_by_entity, since, until, fetch):
    if not issues:
        return [], False
    rows = list(
        IssueActivity.objects.filter(
            workspace_id=project.workspace_id,
            project_id=project.id,
            issue_id__in=list(issues),
            field__in=[*WORK_ITEM_FIELD_KINDS, *RELATION_FIELDS],
            verb__in=("updated", "deleted"),
            created_at__gt=since,
            created_at__lte=until,
        )
        .select_related("actor")
        .order_by("-created_at", "-id")[:fetch]
    )
    visible_others = _visible_identifiers(rows, project=project, visible=visible)
    events = []
    relation_groups = defaultdict(list)
    for row in rows:
        issue = issues[row.issue_id]
        if row.field in RELATION_FIELDS:
            other = _relation_other(row)
            moment = row.epoch if row.epoch is not None else row.created_at.replace(microsecond=0).timestamp()
            key = (
                (row.verb, moment, get_actual_relation(row.field), frozenset({_identifier(project, issue), other}))
                if other
                else ("single", row.id)
            )
            relation_groups[key].append(row)
            continue
        kind, detail_field = WORK_ITEM_FIELD_KINDS[row.field]
        clean = _clean_date if row.field == "target_date" else _clean_text
        events.append(
            {
                "id": f"{kind}:{row.id}",
                "kind": kind,
                "occurred_at": row.created_at,
                "actor": _user_actor(row.actor),
                "entity": _work_item_entity(project, issue),
                "shape_ids": _shapes_for(shapes_by_entity, PpmCanvasEntityType.WORK_ITEM, issue.id),
                "detail": {"field": detail_field, "old": clean(row.old_value), "new": clean(row.new_value)},
            }
        )
    for group in relation_groups.values():
        # Обе строки одной связи дают одно событие с устойчивым id (меньший id строки) и фигурами обеих задач.
        primary = min(group, key=lambda row: str(row.id))
        issue = issues[primary.issue_id]
        other = _relation_other(primary)
        shown = other if other in visible_others else None
        shape_ids = []
        for row in group:
            shape_ids = _merge_unique(
                shape_ids, _shapes_for(shapes_by_entity, PpmCanvasEntityType.WORK_ITEM, row.issue_id)
            )
        events.append(
            {
                "id": f"work_item.relation:{primary.id}",
                "kind": "work_item.relation",
                "occurred_at": max(row.created_at for row in group),
                "actor": _user_actor(primary.actor),
                "entity": _work_item_entity(project, issue),
                "shape_ids": shape_ids,
                "detail": {
                    "field": primary.field,
                    "old": shown if primary.verb == "deleted" else None,
                    "new": shown if primary.verb == "updated" else None,
                },
            }
        )
    return events, len(rows) == fetch


def _git_events(*, project, issues, shapes_by_entity, since, until):
    if not issues:
        return [], False
    links = list(
        PpmGitLink.objects.filter(
            workspace_id=project.workspace_id,
            project_id=project.id,
            object_type=PpmGitObjectType.PULL_REQUEST,
            status=PpmGitLinkStatus.ACTIVE,
            repository__status=PpmGitRepositoryStatus.ACTIVE,
            work_item_id__in=list(issues),
        )
        .filter(
            Q(git_object__isnull=True, created_at__gt=since)
            | Q(git_object__first_seen_at__gt=since)
            | Q(git_object__state="merged", git_object__provider_updated_at__gt=since)
        )
        .select_related("git_object")
        .order_by("-created_at", "id")[:GIT_LINK_SCAN_LIMIT]
    )
    groups = defaultdict(list)
    for link in links:
        groups[link.git_object_id or link.id].append(link)
    events = []
    for pull_request_id, group in groups.items():
        git_object = group[0].git_object
        work_item_ids = sorted({link.work_item_id for link in group}, key=lambda item_id: issues[item_id].sequence_id)
        shape_ids = []
        for entity_id in (pull_request_id, *(link.id for link in group)):
            shape_ids = _merge_unique(
                shape_ids, _shapes_for(shapes_by_entity, PpmCanvasEntityType.PULL_REQUEST, entity_id)
            )
        for work_item_id in work_item_ids:
            shape_ids = _merge_unique(
                shape_ids, _shapes_for(shapes_by_entity, PpmCanvasEntityType.WORK_ITEM, work_item_id)
            )
        ref = (git_object.ref if git_object else group[0].ref) or ""
        entity = {
            "type": "pull_request",
            "id": str(pull_request_id),
            "title": _clean_text(git_object.title if git_object else group[0].title) or "",
        }
        if ref:
            entity["identifier"] = f"#{ref}"
        detail = {
            "field": "work_items",
            "new": ", ".join(_identifier(project, issues[item_id]) for item_id in work_item_ids),
        }
        # «Открыт» — момент, когда PPM впервые увидел PR (провайдер не сообщает дату создания); PR, у которого с
        # начала окна не было активности у провайдера, — это старый PR из первой синхронизации, не «открытый сейчас».
        opened_at = git_object.first_seen_at if git_object else min(link.created_at for link in group)
        historical = (
            git_object is not None
            and git_object.provider_updated_at is not None
            and git_object.provider_updated_at <= since
        )
        if since < opened_at <= until and not historical:
            events.append(
                {
                    "id": f"git.pull_request.opened:{pull_request_id}",
                    "kind": "git.pull_request.opened",
                    "occurred_at": opened_at,
                    "actor": None,
                    "entity": entity,
                    "shape_ids": shape_ids,
                    "detail": detail,
                }
            )
        merged_at = git_object.provider_updated_at if git_object and git_object.state == "merged" else None
        if merged_at and since < merged_at <= until:
            events.append(
                {
                    "id": f"git.pull_request.merged:{pull_request_id}",
                    "kind": "git.pull_request.merged",
                    "occurred_at": merged_at,
                    "actor": None,
                    "entity": entity,
                    "shape_ids": shape_ids,
                    "detail": detail,
                }
            )
    return events, len(links) == GIT_LINK_SCAN_LIMIT


def _vault_events(*, project, shapes_by_entity, since, until, fetch):
    entry_ids = [
        entity_id for entity_type, entity_id in shapes_by_entity if entity_type == PpmCanvasEntityType.VAULT_FILE.value
    ]
    if not entry_ids:
        return [], False
    versions = list(
        PpmVaultVersion.objects.filter(
            workspace_id=project.workspace_id,
            project_id=project.id,
            entry_id__in=entry_ids,
            entry__status=PpmVaultEntryStatus.ACTIVE,
            status=PpmVaultVersionStatus.VERIFIED,
            created_at__gt=since,
            created_at__lte=until,
        )
        .select_related("entry")
        .defer("content_text")
        .order_by("-created_at", "-id")[:fetch]
    )
    events = [
        {
            "id": f"vault.version:{version.id}",
            "kind": "vault.version",
            "occurred_at": version.created_at,
            "actor": None,
            "author_id": version.created_by,
            "entity": {
                "type": "vault_file",
                "id": str(version.entry_id),
                "title": _clean_text(version.entry.name) or "",
            },
            "shape_ids": _shapes_for(shapes_by_entity, PpmCanvasEntityType.VAULT_FILE, version.entry_id),
            "detail": {
                "field": "version",
                "old": str(version.version - 1) if version.version > 1 else None,
                "new": str(version.version),
            },
        }
        for version in versions
    ]
    return events, len(versions) == fetch


def _node_time(value):
    if not isinstance(value, str) or len(value) > 64:
        return None
    try:
        parsed = parse_datetime(value)
    except ValueError:
        return None
    if parsed is None:
        return None
    return timezone.make_aware(parsed, dt_timezone.utc) if timezone.is_naive(parsed) else parsed


def _version_shape_ids(*, board_id, version):
    with connection.cursor() as cursor:
        cursor.execute(VERSION_SHAPE_IDS_SQL, [board_id, version])
        return {row[0] for row in cursor.fetchall()}


def _first_versions(*, board_id, low, high, shape_ids):
    """Для фигур, которых нет в версии `low` (0 — пустая доска) и которые есть в `high`, находит версию из (low, high],
    где фигура появилась: деление диапазона пополам, одна короткая выборка ключей на шаг, не больше
    SHAPE_TIME_PROBE_BUDGET шагов на весь запрос. Фигуре, для которой бюджет кончился, достаётся верхняя граница
    её диапазона. История версий неизменяема, поэтому ответ устойчив между опросами."""
    found = {}
    probes = 0
    stack = [(low, high, set(shape_ids))]
    while stack:
        lower, upper, pending = stack.pop()
        if not pending:
            continue
        if upper - lower <= 1 or probes >= SHAPE_TIME_PROBE_BUDGET:
            found.update(dict.fromkeys(pending, upper))
            continue
        middle = (lower + upper) // 2
        present = pending & _version_shape_ids(board_id=board_id, version=middle)
        probes += 1
        stack.append((middle, upper, pending - present))
        stack.append((lower, middle, present))
    return found


def _board_events(*, board, current, shapes, nodes, since, until):
    if current is None:
        return []
    base_version = (
        PpmCanvasVersion.objects.filter(board=board, created_at__lte=since, version__lte=current.version)
        .order_by("-version")
        .values_list("version", flat=True)
        .first()
    ) or 0
    base_ids = _version_shape_ids(board_id=board.id, version=base_version) if base_version else set()
    events = []
    untimed = []
    for shape_id, record in shapes.items():
        shape_type = record.get("type")
        if shape_type == PPM_NODE_SHAPE_TYPE:
            node = nodes.get(shape_id)
            if node is None:
                continue
            created_at = _node_time(node.get("created_at"))
            updated_at = _node_time(node.get("updated_at"))
            entity = {"type": "node", "id": shape_id}
            title = _clean_text(node.get("title"), MAX_TITLE_CHARS) if isinstance(node.get("title"), str) else None
            if title:
                entity["title"] = title
            detail = {"field": "kind", "new": _clean_text(node.get("kind"), 40)}
            if shape_id not in base_ids:
                if created_at and since < created_at:
                    events.append(
                        _board_event(
                            "board.node.added",
                            shape_id,
                            min(created_at, until),
                            entity,
                            detail,
                            author_id=node.get("author_id"),
                        )
                    )
                else:
                    untimed.append((shape_id, entity, detail))
            elif updated_at and since < updated_at and (created_at is None or created_at <= since):
                changed = _board_event("board.node.changed", shape_id, min(updated_at, until), entity, detail)
                changed["id"] = f"board.node.changed:{shape_id}:{updated_at.isoformat()}"
                events.append(changed)
        elif (
            isinstance(shape_type, str) and shape_type not in UNTRACKED_NATIVE_SHAPE_TYPES and shape_id not in base_ids
        ):
            untimed.append(
                (
                    shape_id,
                    {"type": "node", "id": shape_id},
                    {"field": "shape_type", "new": _clean_text(shape_type, 40)},
                )
            )
    if untimed:
        appeared = _first_versions(
            board_id=board.id,
            low=base_version,
            high=current.version,
            shape_ids=[shape_id for shape_id, _, _ in untimed],
        )
        saved_at = dict(
            PpmCanvasVersion.objects.filter(board=board, version__in=set(appeared.values())).values_list(
                "version", "created_at"
            )
        )
        for shape_id, entity, detail in untimed:
            occurred_at = saved_at.get(appeared[shape_id], current.created_at)
            events.append(_board_event("board.node.added", shape_id, occurred_at, entity, detail))
    return events


def _board_event(kind, shape_id, occurred_at, entity, detail, *, author_id=None):
    return {
        "id": f"{kind}:{shape_id}",
        "kind": kind,
        "occurred_at": occurred_at,
        "actor": None,
        "author_id": author_id,
        "entity": entity,
        "shape_ids": [shape_id],
        "detail": detail,
    }


def _resolve_authors(events, *, workspace_id):
    """Автор карточки PPM (`author_id` из снимка — его пишет клиент) и автор версии файла показываются, только если это
    участник рабочего пространства: чужой UUID в снимке не раскрывает имя постороннего пользователя."""
    pending = defaultdict(list)
    for event in events:
        raw = event.pop("author_id", None)
        if not raw:
            continue
        try:
            pending[uuid.UUID(str(raw))].append(event)
        except ValueError:
            continue
    if not pending:
        return
    users = User.objects.filter(
        id__in=list(pending),
        member_workspace__workspace_id=workspace_id,
        member_workspace__is_active=True,
        member_workspace__deleted_at__isnull=True,
    ).only("id", "display_name", "first_name", "last_name")
    for user in users:
        for event in pending[user.id]:
            event["actor"] = _user_actor(user)


def _serialize_event(event):
    return {
        "id": event["id"],
        "kind": event["kind"],
        "occurred_at": event["occurred_at"].isoformat(),
        "actor": event["actor"],
        "entity": event["entity"],
        "shape_ids": event["shape_ids"],
        "detail": event["detail"],
    }
```

- [ ] **S2.6 `views.py`: импорты.** Было (добавлено в S1.7):

```python
from .batch_bindings import create_bindings_batch
```

Стало:

```python
from .batch_bindings import create_bindings_batch
from .changes import get_board_changes
```

Было (в импорте `from .serializers import (`):

```python
    PpmCanvasBindingCreateSerializer,
```

Стало:

```python
    PpmCanvasBindingCreateSerializer,
    PpmCanvasBoardChangesQuerySerializer,
```

- [ ] **S2.7 `views.py`: представление ленты.** Вставить класс перед строкой `# ── /AF2.2 S ──` (две пустые строки до и
  после класса). Было:

```python
# ── /AF2.2 S ──
```

Стало:

```python
class PpmCanvasBoardChangesView(PpmMultiBoardAPIView):
    """S2: лента «Что изменилось» с момента `since` (не раньше 30 дней, не больше 200 событий, новые первыми)."""

    def get(self, request, workspace_id, project_id, board_id):
        _, project, _, denied = self.require_canvas_capability(request, workspace_id, project_id, "read")
        if denied:
            return denied
        canvas = get_or_create_active_canvas(
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=request.user.id,
        )
        board, missing = self.resolve_board(request, canvas, board_id)
        if missing:
            return missing
        serializer = PpmCanvasBoardChangesQuerySerializer(data=request.query_params)
        if not serializer.is_valid():
            return self.invalid_payload(request, serializer, code="CANVAS_CHANGES_INVALID")
        payload = get_board_changes(
            board=board,
            project=project,
            user=request.user,
            since=serializer.validated_data["since"],
            limit=serializer.validated_data["limit"],
        )
        return Response(payload, status=status.HTTP_200_OK)


# ── /AF2.2 S ──
```

- [ ] **S2.8 `urls.py`: импорт и маршрут.** Было:

```python
    PpmCanvasBoardArchiveView,
```

Стало:

```python
    PpmCanvasBoardArchiveView,
    PpmCanvasBoardChangesView,
```

Было (закрывающий маркер блока из S1.9):

```python
    # ── /AF2.2 S ──
```

Стало:

```python
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/boards/<uuid:board_id>/changes/",
        PpmCanvasBoardChangesView.as_view(),
        name="ppm-canvas-board-changes",
    ),
    # ── /AF2.2 S ──
```

- [ ] **S2.9 Тесты зелёные.** `PYTEST plane/tests/contract/ppm_canvas/test_board_changes_api.py
  plane/tests/contract/ppm_canvas/test_batch_bindings_api.py`
  Ожидается: `17 passed`.

- [ ] **S2.10 Линт.** `RUFF plane/ppm_canvas/serializers.py plane/ppm_canvas/changes.py plane/ppm_canvas/views.py
  plane/ppm_canvas/urls.py plane/tests/contract/ppm_canvas/test_board_changes_api.py`
  Ожидается: `All checks passed!`, `5 files already formatted`.

---

## Задача S3 — личная отметка «просмотрено» `me/` и `me/seen/`

**Файлы**
- Изменить: `apps/api/plane/ppm_canvas/models.py:349-351` (конец `PpmCanvasSemanticEdge.Meta`, последние строки файла) —
  новая модель в конец файла.
- Создать: `apps/api/plane/ppm_canvas/migrations/0009_board_user_state.py` (последняя сейчас —
  `0008_git_projection_entity_types`).
- Создать: `apps/api/plane/ppm_canvas/board_user_state.py`.
- Изменить: `apps/api/plane/ppm_canvas/views.py` — импорт и 2 класса перед `# ── /AF2.2 S ──`.
- Изменить: `apps/api/plane/ppm_canvas/urls.py` — 2 импорта (строки 11–12 до правок S) и 2 маршрута перед
  `    # ── /AF2.2 S ──`.
- Создать тест: `apps/api/plane/tests/contract/ppm_canvas/test_board_user_state_api.py`.

**Интерфейсы**
- Потребляет: `PpmCanvasBoard` (поле `current_version`), `settings.AUTH_USER_MODEL`.
- Производит: модель `models.PpmCanvasBoardUserState(board, user, seen_at, seen_version, created_at, updated_at)`, таблица
  `ppm_canvas_board_user_states`, уникальность `ppm_board_user_state_unique (board, user)`; миграция
  `ppm_canvas.0009_board_user_state`; `board_user_state.get_board_user_state(*, board, user) -> {"seen_at": str | None,
  "seen_version": int | None}`; `board_user_state.mark_board_seen(*, board, user) -> тот же dict`;
  `board_user_state.serialize_board_user_state(state | None)`; представления `views.PpmCanvasBoardUserStateView` (GET) и
  `views.PpmCanvasBoardSeenView` (PUT); маршруты `ppm-canvas-board-user-state`, `ppm-canvas-board-seen`.

**Решения S3**
- Поля — ровно из спецификации `(board, user, seen_at, seen_version)` + `id` и служебные `created_at`/`updated_at`;
  пользователь — внешний ключ на `AUTH_USER_MODEL` (такой ключ уже есть у `PpmGlobalAdmin.user`, миграция `0003`
  зависит от `AUTH_USER_MODEL`) с `CASCADE` — отметка не переживает пользователя; доска — `CASCADE`; уникальность пары —
  ограничением (оно же индекс для поиска).
- **PUT — вставка с обновлением по уникальному ключу** (`bulk_create(update_conflicts=True, unique_fields=["board",
  "user"])`, одна команда `INSERT … ON CONFLICT DO UPDATE`): две вкладки, нажавшие «Отметить просмотренным» одновременно,
  не ловят `IntegrityError`, как было бы у `update_or_create`. Время и версия — серверные (`timezone.now()`,
  `board.current_version`; 0 — доска ещё не сохранялась), тело запроса игнорируется: свою отметку нельзя сдвинуть в
  прошлое/будущее.
- Права — чтение доски (гость тоже отмечает: читатель видит ленту); архивная или чужая доска → 404
  `CANVAS_BOARD_NOT_FOUND`; нет отметки → `{"seen_at": null, "seen_version": null}`.
- Тесты идут с `--nomigrations` (таблицы из моделей), поэтому расхождение миграции и модели иначе незаметно: тест
  `makemigrations ppm_canvas --check --dry-run` (с `MIGRATION_MODULES={}`) ловит его, а существующий
  `test_multiboard_migration.py` откатывает и заново применяет всю цепочку `ppm_canvas` — включая `0009` (проверено).

- [ ] **S3.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools/af22-pre.sh \
  apps/api/plane/ppm_canvas/models.py apps/api/plane/ppm_canvas/migrations/0009_board_user_state.py \
  apps/api/plane/ppm_canvas/board_user_state.py apps/api/plane/tests/contract/ppm_canvas/test_board_user_state_api.py
```

Ожидается 4 строки `pre-image saved: …`.

- [ ] **S3.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_canvas/test_board_user_state_api.py` целиком:

```python
import io
import uuid
from datetime import datetime

import pytest
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import override_settings
from django.utils import timezone
from rest_framework import status

from plane.ppm_canvas.models import PpmCanvasBoardUserState
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]


def make_user(prefix):
    marker = uuid.uuid4().hex
    return UserFactory(username=f"{prefix}-{marker}", email=f"{prefix}-{marker}@plane.test")


@pytest.fixture
def seen_project():
    lead = make_user("lead")
    colleague = make_user("colleague")
    guest = make_user("guest")
    workspace = WorkspaceFactory(owner=lead)
    project = ProjectFactory(workspace=workspace, identifier="SEEN")
    for member, role in ((lead, 20), (colleague, 15), (guest, 5)):
        WorkspaceMemberFactory(workspace=workspace, member=member, role=role)
        ProjectMemberFactory(workspace=workspace, project=project, member=member, role=role)
    return lead, colleague, guest, workspace, project


def boards_url(workspace, project):
    return f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/canvas/boards/"


def me_url(workspace, project, board_id):
    return f"{boards_url(workspace, project)}{board_id}/me/"


def seen_url(workspace, project, board_id):
    return f"{me_url(workspace, project, board_id)}seen/"


def save_board(api_client, workspace, project, board_id, *, base_version):
    return api_client.put(
        f"{boards_url(workspace, project)}{board_id}/snapshot/",
        {
            "schema_version": 2,
            "base_version": base_version,
            "snapshot": {"document": {"store": {}}},
            "client_operation_id": str(uuid.uuid4()),
        },
        format="json",
    )


def test_seen_mark_is_personal_and_uses_server_time_and_the_current_board_version(api_client, seen_project):
    lead, colleague, guest, workspace, project = seen_project
    api_client.force_authenticate(user=lead)
    board_id = api_client.get(boards_url(workspace, project)).data["default_board_id"]
    before = api_client.get(me_url(workspace, project, board_id))
    saved = save_board(api_client, workspace, project, board_id, base_version=0)
    started = timezone.now()
    marked = api_client.put(
        seen_url(workspace, project, board_id),
        {"seen_at": "2020-01-01T00:00:00Z", "seen_version": 99},
        format="json",
    )
    finished = timezone.now()
    after = api_client.get(me_url(workspace, project, board_id))
    api_client.force_authenticate(user=colleague)
    colleague_view = api_client.get(me_url(workspace, project, board_id))
    api_client.force_authenticate(user=guest)
    guest_mark = api_client.put(seen_url(workspace, project, board_id), format="json")

    assert before.status_code == status.HTTP_200_OK
    assert before.data == {"seen_at": None, "seen_version": None}
    assert saved.status_code == status.HTTP_200_OK
    assert marked.status_code == status.HTTP_200_OK
    # Тело запроса игнорируется: время и версия — серверные.
    assert started <= datetime.fromisoformat(marked.data["seen_at"]) <= finished
    assert marked.data["seen_version"] == 1
    assert after.data == marked.data
    assert colleague_view.data == {"seen_at": None, "seen_version": None}
    assert guest_mark.status_code == status.HTTP_200_OK
    assert guest_mark.data["seen_version"] == 1
    assert PpmCanvasBoardUserState.objects.filter(board_id=board_id).count() == 2


def test_marking_again_moves_the_same_personal_mark_forward(api_client, seen_project):
    lead, _, _, workspace, project = seen_project
    api_client.force_authenticate(user=lead)
    board_id = api_client.get(boards_url(workspace, project)).data["default_board_id"]

    first = api_client.put(seen_url(workspace, project, board_id), format="json")
    save_board(api_client, workspace, project, board_id, base_version=0)
    second = api_client.put(seen_url(workspace, project, board_id), format="json")

    assert first.data["seen_version"] == 0
    assert second.data["seen_version"] == 1
    assert datetime.fromisoformat(second.data["seen_at"]) > datetime.fromisoformat(first.data["seen_at"])
    assert PpmCanvasBoardUserState.objects.filter(board_id=board_id, user=lead).count() == 1
    with pytest.raises(IntegrityError), transaction.atomic():
        PpmCanvasBoardUserState.objects.create(board_id=board_id, user=lead, seen_at=timezone.now())


def test_seen_mark_requires_read_access_to_an_active_board_of_the_project(api_client, seen_project):
    lead, _, _, workspace, project = seen_project
    outsider = make_user("outsider")
    WorkspaceMemberFactory(workspace=workspace, member=outsider, role=15)
    other_project = ProjectFactory(workspace=workspace, identifier="SEEN2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=lead, role=20)
    api_client.force_authenticate(user=lead)
    board_id = api_client.get(boards_url(workspace, project)).data["default_board_id"]
    foreign_board_id = api_client.get(boards_url(workspace, other_project)).data["default_board_id"]
    archived_id = api_client.post(
        boards_url(workspace, project),
        {"name": "Архивная", "client_operation_id": str(uuid.uuid4())},
        format="json",
    ).data["board_id"]
    api_client.post(
        f"{boards_url(workspace, project)}{archived_id}/archive/",
        {"client_operation_id": str(uuid.uuid4())},
        format="json",
    )

    archived = api_client.put(seen_url(workspace, project, archived_id), format="json")
    foreign = api_client.get(me_url(workspace, project, foreign_board_id))
    api_client.force_authenticate(user=outsider)
    denied_read = api_client.get(me_url(workspace, project, board_id))
    denied_mark = api_client.put(seen_url(workspace, project, board_id), format="json")

    assert (archived.status_code, archived.data["error"]["code"]) == (404, "CANVAS_BOARD_NOT_FOUND")
    assert (foreign.status_code, foreign.data["error"]["code"]) == (404, "CANVAS_BOARD_NOT_FOUND")
    assert (denied_read.status_code, denied_read.data["error"]["code"]) == (403, "CANVAS_PERMISSION_DENIED")
    assert (denied_mark.status_code, denied_mark.data["error"]["code"]) == (403, "CANVAS_PERMISSION_DENIED")
    assert PpmCanvasBoardUserState.objects.count() == 0


@override_settings(MIGRATION_MODULES={})
def test_ppm_canvas_migrations_match_the_models():
    """pytest.ini запускает тесты с --nomigrations (таблицы строятся по моделям), поэтому расхождение миграции 0009 и
    модели иначе незаметно: makemigrations --check падает (SystemExit), если модели требуют новой миграции."""
    output = io.StringIO()
    call_command("makemigrations", "ppm_canvas", "--check", "--dry-run", stdout=output)
    assert "No changes detected" in output.getvalue()
```

- [ ] **S3.3 Убедиться, что тест падает.** `PYTEST plane/tests/contract/ppm_canvas/test_board_user_state_api.py`
  Ожидается: `1 error` при сборке — `ImportError: cannot import name 'PpmCanvasBoardUserState' from
  'plane.ppm_canvas.models'`.

- [ ] **S3.4 `models.py`: модель — в конец файла.** Было (строки 349–351, последние в файле):

```python
            models.Index(fields=["board", "to_shape_id"], name="ppm_edge_to_shape_idx"),
        ]
        ordering = ("created_at", "id")
```

Стало:

```python
            models.Index(fields=["board", "to_shape_id"], name="ppm_edge_to_shape_idx"),
        ]
        ordering = ("created_at", "id")


class PpmCanvasBoardUserState(models.Model):
    """AF2.2 S3: личная отметка «просмотрено» для ленты «Что изменилось» (одна строка на пару доска + пользователь)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(PpmCanvasBoard, on_delete=models.CASCADE, related_name="user_states")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ppm_canvas_board_states",
    )
    seen_at = models.DateTimeField()
    seen_version = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ppm_canvas_board_user_states"
        constraints = [
            models.UniqueConstraint(fields=["board", "user"], name="ppm_board_user_state_unique"),
        ]
```

(`uuid`, `settings`, `models` уже импортированы в строках 1–5.)

- [ ] **S3.5 Создать миграцию `apps/api/plane/ppm_canvas/migrations/0009_board_user_state.py`** целиком:

```python
import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("ppm_canvas", "0008_git_projection_entity_types"),
    ]

    operations = [
        migrations.CreateModel(
            name="PpmCanvasBoardUserState",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("seen_at", models.DateTimeField()),
                ("seen_version", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "board",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_states",
                        to="ppm_canvas.ppmcanvasboard",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ppm_canvas_board_states",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"db_table": "ppm_canvas_board_user_states"},
        ),
        migrations.AddConstraint(
            model_name="ppmcanvasboarduserstate",
            constraint=models.UniqueConstraint(fields=("board", "user"), name="ppm_board_user_state_unique"),
        ),
    ]
```

- [ ] **S3.6 Создать `apps/api/plane/ppm_canvas/board_user_state.py`** целиком:

```python
"""AF2.2 S3 — личная отметка «просмотрено» на доске (для ленты «Что изменилось»).

Одна строка на пару (доска, пользователь). Время и версия берутся на сервере: клиент не может сдвинуть свою отметку
в прошлое или будущее, а два одновременных «Отметить просмотренным» из разных вкладок сходятся в одну строку
(вставка с обновлением по уникальному ключу, без гонки get_or_create).
"""

from django.utils import timezone

from .models import PpmCanvasBoardUserState


def serialize_board_user_state(state):
    if state is None:
        return {"seen_at": None, "seen_version": None}
    return {"seen_at": state.seen_at.isoformat(), "seen_version": state.seen_version}


def get_board_user_state(*, board, user):
    return serialize_board_user_state(PpmCanvasBoardUserState.objects.filter(board=board, user=user).first())


def mark_board_seen(*, board, user):
    state = PpmCanvasBoardUserState(
        board=board,
        user=user,
        seen_at=timezone.now(),
        seen_version=board.current_version,
    )
    PpmCanvasBoardUserState.objects.bulk_create(
        [state],
        update_conflicts=True,
        unique_fields=["board", "user"],
        update_fields=["seen_at", "seen_version", "updated_at"],
    )
    return serialize_board_user_state(state)
```

- [ ] **S3.7 `views.py`: импорт и два класса.** Было:

```python
from .batch_bindings import create_bindings_batch
```

Стало:

```python
from .batch_bindings import create_bindings_batch
from .board_user_state import get_board_user_state, mark_board_seen
```

Вставить классы перед строкой `# ── /AF2.2 S ──` (две пустые строки до и после). Было:

```python
# ── /AF2.2 S ──
```

Стало:

```python
class PpmCanvasBoardUserStateView(PpmMultiBoardAPIView):
    """S3: личная отметка «просмотрено» — `GET …/me/`."""

    def get(self, request, workspace_id, project_id, board_id):
        _, _, _, denied = self.require_canvas_capability(request, workspace_id, project_id, "read")
        if denied:
            return denied
        canvas = get_or_create_active_canvas(
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=request.user.id,
        )
        board, missing = self.resolve_board(request, canvas, board_id)
        if missing:
            return missing
        return Response(get_board_user_state(board=board, user=request.user), status=status.HTTP_200_OK)


class PpmCanvasBoardSeenView(PpmMultiBoardAPIView):
    """S3: «Отметить просмотренным» — `PUT …/me/seen/`: серверное «сейчас» и текущая версия доски."""

    def put(self, request, workspace_id, project_id, board_id):
        _, _, _, denied = self.require_canvas_capability(request, workspace_id, project_id, "read")
        if denied:
            return denied
        canvas = get_or_create_active_canvas(
            workspace_id=workspace_id,
            project_id=project_id,
            user_id=request.user.id,
        )
        board, missing = self.resolve_board(request, canvas, board_id)
        if missing:
            return missing
        return Response(mark_board_seen(board=board, user=request.user), status=status.HTTP_200_OK)


# ── /AF2.2 S ──
```

- [ ] **S3.8 `urls.py`: импорты и маршруты.** Было:

```python
    PpmCanvasBoardRestoreView,
```

Стало:

```python
    PpmCanvasBoardRestoreView,
    PpmCanvasBoardSeenView,
```

Было:

```python
    PpmCanvasBoardSnapshotView,
```

Стало:

```python
    PpmCanvasBoardSnapshotView,
    PpmCanvasBoardUserStateView,
```

Было:

```python
    # ── /AF2.2 S ──
```

Стало:

```python
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/boards/<uuid:board_id>/me/",
        PpmCanvasBoardUserStateView.as_view(),
        name="ppm-canvas-board-user-state",
    ),
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/boards/<uuid:board_id>/me/seen/",
        PpmCanvasBoardSeenView.as_view(),
        name="ppm-canvas-board-seen",
    ),
    # ── /AF2.2 S ──
```

- [ ] **S3.9 Тесты зелёные (новая таблица — `--create-db`).** `PYTEST --create-db
  plane/tests/contract/ppm_canvas/test_board_user_state_api.py plane/tests/contract/ppm_canvas/test_multiboard_migration.py`
  Ожидается: `5 passed` (строка `Got an error creating the test database: database "test_plane" already exists` —
  штатное сообщение pytest-django при пересоздании). Затем
  `RUFF plane/ppm_canvas/models.py plane/ppm_canvas/migrations/0009_board_user_state.py plane/ppm_canvas/board_user_state.py
  plane/ppm_canvas/views.py plane/ppm_canvas/urls.py plane/tests/contract/ppm_canvas/test_board_user_state_api.py` →
  `All checks passed!`, `6 files already formatted`.

- [ ] **S3.10 Передать контроллеру (не выполнять самому).** Перед живой проверкой на проекте 228 контроллер применяет
  миграцию к dev-БД: `docker exec plane-fork-api-1 python manage.py migrate ppm_canvas 0009` — до этого
  `me/`/`me/seen/` на dev-API :8000 отвечают 500 (таблицы нет), остальные эндпоинты S работают.

---

## Задача S4 — доски задачи `canvas/work-items/<id>/boards/`

**Файлы**
- Создать: `apps/api/plane/ppm_canvas/work_item_boards.py`.
- Изменить: `apps/api/plane/ppm_canvas/views.py` — импорт из `.services` (строка 72 до правок S), импорт после блока
  `from .services import (…)` (строки 90–91), класс перед `# ── /AF2.2 S ──`.
- Изменить: `apps/api/plane/ppm_canvas/urls.py` — импорт (строка 16 до правок S) и маршрут перед `    # ── /AF2.2 S ──`.
- Создать тест: `apps/api/plane/tests/contract/ppm_canvas/test_work_item_boards_api.py`.

**Интерфейсы**
- Потребляет: `services.get_visible_work_items`; индекс `ppm_binding_source_idx (workspace_id, project_id, entity_type,
  entity_id)` модели `PpmCanvasBinding`.
- Производит: `work_item_boards.get_work_item_boards(*, project, work_item_id) -> list[{"board_id": str, "name": str,
  "shape_id": str}]`; представление `views.PpmCanvasWorkItemBoardsView`; маршрут `ppm-canvas-work-item-boards`.

**Решения S4**
- **Одна строка на доску** — первая по времени привязки карточка (задача может лежать на доске несколькими карточками;
  «На карте» — список досок); порядок — как в рейке досок (`position`, `created_at`, `id`).
- Только активные привязки (ожидающая — фигура ещё не сохранена — не видна) на активных досках активного холста;
  архивные доски — нет (spec F).
- Права: чтение Холста проекта (у PPM права на доски — на уровне проекта: кто читает Холст, читает все его доски) и
  видимость самой задачи через `get_visible_work_items(include_inactive=True)` без удалённых: невидимая ограниченному
  гостю, удалённая или чужого проекта → 404 `WORK_ITEM_NOT_FOUND` (без раскрытия названия); не участник проекта → 403
  `CANVAS_PERMISSION_DENIED`; задача не на досках → `{"results": []}`.
- **Холст не создаётся:** в отличие от эндпоинтов доски здесь нет `get_or_create_active_canvas` — открытие карточки
  задачи в проекте без Холста не должно создавать ему холст и доску «Главная». Защитный предел выборки — 500 привязок.

- [ ] **S4.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-26-af22/tools/af22-pre.sh \
  apps/api/plane/ppm_canvas/work_item_boards.py apps/api/plane/tests/contract/ppm_canvas/test_work_item_boards_api.py
```

Ожидается 2 строки `pre-image saved: …`.

- [ ] **S4.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_canvas/test_work_item_boards_api.py` целиком:

```python
import uuid
from unittest.mock import patch

import pytest
from rest_framework import status

from plane.db.models import Issue, State
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]


def make_user(prefix):
    marker = uuid.uuid4().hex
    return UserFactory(username=f"{prefix}-{marker}", email=f"{prefix}-{marker}@plane.test")


@pytest.fixture
def boards_project():
    lead = make_user("lead")
    workspace = WorkspaceFactory(owner=lead)
    WorkspaceMemberFactory(workspace=workspace, member=lead, role=20)
    project = ProjectFactory(workspace=workspace, identifier="ONM")
    ProjectMemberFactory(workspace=workspace, project=project, member=lead, role=20)
    state = State.objects.create(
        name="Backlog",
        color="#60646C",
        group="backlog",
        default=True,
        project=project,
        created_by=lead,
    )
    return lead, workspace, project, state


def project_path(workspace, project):
    return f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}"


def boards_url(workspace, project):
    return f"{project_path(workspace, project)}/canvas/boards/"


def work_item_boards_url(workspace, project, work_item_id):
    return f"{project_path(workspace, project)}/canvas/work-items/{work_item_id}/boards/"


def create_issue(project, state, user, name):
    issue = Issue(name=name, project=project, state=state)
    issue.save(created_by_id=user.id)
    return issue


def create_board(api_client, workspace, project, name):
    return api_client.post(
        boards_url(workspace, project),
        {"name": name, "client_operation_id": str(uuid.uuid4())},
        format="json",
    ).data["board_id"]


def place_on_board(api_client, workspace, project, board_id, issue, shape_ids, *, activate=True):
    bindings = [
        api_client.post(
            f"{boards_url(workspace, project)}{board_id}/bindings/",
            {
                "shape_id": shape_id,
                "entity_type": "work_item",
                "entity_id": str(issue.id),
                "client_operation_id": str(uuid.uuid4()),
            },
            format="json",
        ).data
        for shape_id in shape_ids
    ]
    if activate:
        saved = api_client.put(
            f"{boards_url(workspace, project)}{board_id}/snapshot/",
            {
                "schema_version": 2,
                "base_version": 0,
                "snapshot": {
                    "document": {
                        "store": {
                            shape_id: {"id": shape_id, "typeName": "shape", "type": "ppm-canvas-node"}
                            for shape_id in shape_ids
                        }
                    }
                },
                "client_operation_id": str(uuid.uuid4()),
                "binding_changes": {"activate": [binding["binding_id"] for binding in bindings], "remove": []},
            },
            format="json",
        )
        assert saved.status_code == status.HTTP_200_OK, saved.data
    return bindings


def test_work_item_boards_lists_each_active_board_once_with_its_first_card(api_client, boards_project):
    lead, workspace, project, state = boards_project
    task = create_issue(project, state, lead, "Задача на картах")
    api_client.force_authenticate(user=lead)
    main_id = api_client.get(boards_url(workspace, project)).data["default_board_id"]
    sprint_id = create_board(api_client, workspace, project, "Карта · Спринт 12")
    archived_id = create_board(api_client, workspace, project, "Старая карта")
    pending_id = create_board(api_client, workspace, project, "Черновик")
    place_on_board(api_client, workspace, project, main_id, task, ["shape:first", "shape:second"])
    place_on_board(api_client, workspace, project, sprint_id, task, ["shape:sprint"])
    place_on_board(api_client, workspace, project, archived_id, task, ["shape:archived"])
    place_on_board(api_client, workspace, project, pending_id, task, ["shape:pending"], activate=False)
    api_client.post(
        f"{boards_url(workspace, project)}{archived_id}/archive/",
        {"client_operation_id": str(uuid.uuid4())},
        format="json",
    )

    response = api_client.get(work_item_boards_url(workspace, project, task.id))

    assert response.status_code == status.HTTP_200_OK
    assert response.data == {
        "results": [
            {"board_id": str(main_id), "name": "Главная", "shape_id": "shape:first"},
            {"board_id": str(sprint_id), "name": "Карта · Спринт 12", "shape_id": "shape:sprint"},
        ]
    }


def test_work_item_boards_respects_task_visibility_and_project_access(api_client, boards_project):
    lead, workspace, project, state = boards_project
    guest = make_user("guest")
    WorkspaceMemberFactory(workspace=workspace, member=guest, role=5)
    ProjectMemberFactory(workspace=workspace, project=project, member=guest, role=5)
    outsider = make_user("outsider")
    WorkspaceMemberFactory(workspace=workspace, member=outsider, role=15)
    lead_task = create_issue(project, state, lead, "Задача руководителя")
    guest_task = create_issue(project, state, guest, "Задача гостя")
    unplaced = create_issue(project, state, lead, "Нигде не лежит")
    removed = create_issue(project, state, lead, "Удалённая")
    other_project = ProjectFactory(workspace=workspace, identifier="ONM2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=lead, role=20)
    other_state = State.objects.create(
        name="Backlog",
        color="#60646C",
        group="backlog",
        default=True,
        project=other_project,
        created_by=lead,
    )
    foreign = create_issue(other_project, other_state, lead, "Чужая")
    api_client.force_authenticate(user=lead)
    main_id = api_client.get(boards_url(workspace, project)).data["default_board_id"]
    guest_board_id = create_board(api_client, workspace, project, "Доска гостя")
    removed_board_id = create_board(api_client, workspace, project, "Доска удалённой задачи")
    place_on_board(api_client, workspace, project, main_id, lead_task, ["shape:lead"])
    place_on_board(api_client, workspace, project, guest_board_id, guest_task, ["shape:guest"])
    place_on_board(api_client, workspace, project, removed_board_id, removed, ["shape:removed"])
    with patch("plane.db.mixins.soft_delete_related_objects"):
        removed.delete()

    unplaced_view = api_client.get(work_item_boards_url(workspace, project, unplaced.id))
    removed_view = api_client.get(work_item_boards_url(workspace, project, removed.id))
    foreign_view = api_client.get(work_item_boards_url(workspace, project, foreign.id))
    api_client.force_authenticate(user=guest)
    guest_own = api_client.get(work_item_boards_url(workspace, project, guest_task.id))
    guest_other = api_client.get(work_item_boards_url(workspace, project, lead_task.id))
    api_client.force_authenticate(user=outsider)
    outsider_view = api_client.get(work_item_boards_url(workspace, project, lead_task.id))

    assert unplaced_view.status_code == status.HTTP_200_OK
    assert unplaced_view.data == {"results": []}
    assert (removed_view.status_code, removed_view.data["error"]["code"]) == (404, "WORK_ITEM_NOT_FOUND")
    assert (foreign_view.status_code, foreign_view.data["error"]["code"]) == (404, "WORK_ITEM_NOT_FOUND")
    assert guest_own.status_code == status.HTTP_200_OK
    assert guest_own.data == {
        "results": [{"board_id": str(guest_board_id), "name": "Доска гостя", "shape_id": "shape:guest"}]
    }
    assert (guest_other.status_code, guest_other.data["error"]["code"]) == (404, "WORK_ITEM_NOT_FOUND")
    assert "Задача руководителя" not in str(guest_other.data)
    assert (outsider_view.status_code, outsider_view.data["error"]["code"]) == (403, "CANVAS_PERMISSION_DENIED")
```

- [ ] **S4.3 Убедиться, что тесты падают.** `PYTEST plane/tests/contract/ppm_canvas/test_work_item_boards_api.py`
  Ожидается: `2 failed` — `assert 404 == 200` (маршрута ещё нет).

- [ ] **S4.4 Создать `apps/api/plane/ppm_canvas/work_item_boards.py`** целиком:

```python
"""AF2.2 S4 — на каких досках лежит задача (строка «На карте» в карточке задачи).

Поиск идёт по индексу `ppm_binding_source_idx` (workspace_id, project_id, entity_type, entity_id). Учитываются только
активные привязки на активных досках активного холста; ожидающие привязки (фигура ещё не сохранена) и архивные доски
не показываются. Права на доски у PPM — на уровне проекта: кто может читать Холст проекта, читает все его доски.
"""

from .models import PpmCanvasBinding, PpmCanvasBindingStatus, PpmCanvasEntityType, PpmCanvasStatus


WORK_ITEM_BOARDS_SCAN_LIMIT = 500


def get_work_item_boards(*, project, work_item_id):
    bindings = (
        PpmCanvasBinding.objects.filter(
            workspace_id=project.workspace_id,
            project_id=project.id,
            entity_type=PpmCanvasEntityType.WORK_ITEM,
            entity_id=work_item_id,
            status=PpmCanvasBindingStatus.ACTIVE,
            board__status=PpmCanvasStatus.ACTIVE,
            canvas__status=PpmCanvasStatus.ACTIVE,
        )
        .order_by("board__position", "board__created_at", "board_id", "created_at", "id")
        .values_list("board_id", "board__name", "shape_id")[:WORK_ITEM_BOARDS_SCAN_LIMIT]
    )
    results = []
    seen_boards = set()
    for board_id, name, shape_id in bindings:
        # Задача может лежать на доске несколькими карточками — в списке досок она одна, с первой по времени карточкой.
        if board_id in seen_boards:
            continue
        seen_boards.add(board_id)
        results.append({"board_id": str(board_id), "name": name, "shape_id": shape_id})
    return results
```

- [ ] **S4.5 `views.py`: импорты.** Было (строка 72, в импорте `from .services import (`):

```python
    get_work_item_edit_options,
```

Стало:

```python
    get_visible_work_items,
    get_work_item_edit_options,
```

Было (строки 90–91, конец импорта `from .services import (`):

```python
    update_work_item,
)
```

Стало:

```python
    update_work_item,
)
from .work_item_boards import get_work_item_boards
```

- [ ] **S4.6 `views.py`: представление.** Вставить класс перед строкой `# ── /AF2.2 S ──` (две пустые строки до и после).
  Было:

```python
# ── /AF2.2 S ──
```

Стало:

```python
class PpmCanvasWorkItemBoardsView(PpmMultiBoardAPIView):
    """S4: доски, на которых задача лежит живой карточкой (для строки «На карте» в задаче)."""

    def get(self, request, workspace_id, project_id, work_item_id):
        _, project, _, denied = self.require_canvas_capability(request, workspace_id, project_id, "read")
        if denied:
            return denied
        visible = (
            get_visible_work_items(project=project, user=request.user, include_inactive=True)
            .filter(id=work_item_id, deleted_at__isnull=True)
            .exists()
        )
        if not visible:
            return ppm_error_response(
                request,
                code="WORK_ITEM_NOT_FOUND",
                message="Задача не найдена в текущем проекте.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {"results": get_work_item_boards(project=project, work_item_id=work_item_id)},
            status=status.HTTP_200_OK,
        )


# ── /AF2.2 S ──
```

- [ ] **S4.7 `urls.py`: импорт и маршрут.** Было:

```python
    PpmCanvasSemanticEdgeListCreateView,
```

Стало:

```python
    PpmCanvasSemanticEdgeListCreateView,
    PpmCanvasWorkItemBoardsView,
```

Было:

```python
    # ── /AF2.2 S ──
```

Стало:

```python
    path(
        "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/canvas/work-items/<uuid:work_item_id>/boards/",
        PpmCanvasWorkItemBoardsView.as_view(),
        name="ppm-canvas-work-item-boards",
    ),
    # ── /AF2.2 S ──
```

- [ ] **S4.8 Тесты зелёные.** `PYTEST plane/tests/contract/ppm_canvas/test_work_item_boards_api.py` → `2 passed`.

- [ ] **S4.9 Полная проверка линии.** `PYTEST plane/tests/contract/ppm_canvas plane/tests/contract/ppm_vault`
  Ожидается: `195 passed` (было 172; +5 S1, +12 S2, +4 S3, +2 S4). Затем
  `RUFF plane/ppm_canvas/models.py plane/ppm_canvas/migrations/0009_board_user_state.py plane/ppm_canvas/serializers.py
  plane/ppm_canvas/batch_bindings.py plane/ppm_canvas/changes.py plane/ppm_canvas/board_user_state.py
  plane/ppm_canvas/work_item_boards.py plane/ppm_canvas/views.py plane/ppm_canvas/urls.py
  plane/tests/contract/ppm_canvas/test_batch_bindings_api.py plane/tests/contract/ppm_canvas/test_board_changes_api.py
  plane/tests/contract/ppm_canvas/test_board_user_state_api.py plane/tests/contract/ppm_canvas/test_work_item_boards_api.py`
  → `All checks passed!`, `13 files already formatted`. Если контроллер не просит оставить стек —
  `docker compose -p ppm-af22-s -f docker-compose-test.yml down -v` (из `/Users/ermolov/Desktop/PPM/plane-fork`).

---

## Самопроверка плана по спецификации

| Требование (spec / CONTRACTS §5) | Где | Тест |
|---|---|---|
| S1: до 200 пунктов, та же семантика и проверки, pending до сохранения, ответ по пункту, права — редактирование | S1 | все 5 тестов S1; `test_projection_api.py` без изменений |
| S1: коды 400 `CANVAS_BATCH_TOO_LARGE`/`CANVAS_BATCH_EMPTY`, порядок как во входе, JSON как у одиночной | S1 | `…in_input_order_with_the_single_binding_json`, `…validates_its_size…` |
| S2: виды `work_item.state/assignees/due/priority/name/relation` | S2 | `…task_field_changes…`, `…relation_rows…` |
| S2: `git.pull_request.opened/merged`, `vault.version`, `board.node.added/changed`, перемещение — не событие | S2 | `…pull_requests…`, `…vault_files…`, `…board_diff…` |
| S2: задачи доски + задачи спринта карты (`map.role = sprint`) | S2 | `…sprint_frame…` |
| S2: видимость (гости, невидимые задачи и файлы), без выдержек содержимого | S2 | `…relation_rows…` (гость), `…vault_files…` (корзина, текст), `…foreign_author_ids…`, проверки «секрет» |
| S2: `since` ≤ 30 дней + `truncated`, ≤ 200 событий, новые первыми, устойчивые id | S2 | `…window_is_capped…`, `…task_field_changes…` (повторный запрос) |
| S2: без N+1, ≤ 1 с на 300 фигурах | S2 | `…query_count_does_not_grow…`, `…300_shapes…` |
| S3: модель (уникальна по паре) + миграция, GET/PUT, серверное «сейчас» и версия, права — чтение | S3 | все 4 теста S3 + `test_multiboard_migration.py` |
| S4: активные привязки, без архивных досок, только читаемые, видимость задачи | S4 | оба теста S4 |

Плейсхолдеров нет: каждый шаг с кодом содержит код целиком; имена функций, классов, маршрутов и кодов ошибок в
«Интерфейсах» совпадают с кодом (проверено прогоном).
