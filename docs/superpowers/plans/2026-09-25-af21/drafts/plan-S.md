# AF2.1 — часть S (серверная линия): план реализации

> **Для исполнителя.** Задачи S1 → S2 → S3 выполнять по порядку, шаг за шагом (TDD: сначала красный тест, потом код).
> Коммитов нет. Рабочее дерево `plane-fork` — источник истины (в нём незакоммиченная работа нескольких сессий): править
> только файлы из раздела «Файлы» своей задачи, перед первой правкой — `af21-pre.sh`. Весь код ниже прогнан 2026-09-25 на
> копии `apps/api` в изолированном тестовом стеке: `136 passed` для `ppm_vault` + `ppm_canvas`, `ruff` чистый.

**Цель линии.** Серверная часть AF2.1 для содержимого Холста:
1. **S1** — безопасный серверный предпросмотр Word/Excel/PowerPoint и текстовых файлов Хранилища (docx → санитизированный
   HTML, xlsx → значения ячеек, pptx → заголовки и текст слайдов, txt/md/csv/json/код → текст) с кешем по хэшу версии.
2. **S2** — поиск документов PPM (Plane Pages) для вставки на Холст (`projections/search/?types=page`): только видимые
   пользователю.
3. **S3** — вставка файлов из буфера: имя от клиента, детерминированный 409 с подсказкой свободного имени, GIF с проверкой
   сигнатуры, файлы кода, понятная ошибка превышения лимита.
4. **S4** — аудио/видео: вне AF2.1, обоснование ниже.

**Архитектура.** Всё — в существующих PPM-приложениях `plane.ppm_vault` и `plane.ppm_canvas`, по их образцам: `APIView` +
`BaseSessionAuthentication` + `IsAuthenticated`, ошибки через `ppm_error_response` (`{"error": {code, message, request_id,
details}}`), права — `get_ppm_project_access` (Хранилище) и `get_ppm_canvas_access` (Холст). Новые модули:
`ppm_vault/formats.py` (словарь форматов) и `ppm_vault/preview.py` (построение предпросмотра, лимиты, кеш). Без миграций,
без новых зависимостей, без правок `settings/*.py` (лимиты читаются через `getattr(settings, имя, по_умолчанию)`), без
внешних запросов.

**Стек.** Django 5.2.15, DRF 3.17.1, Python 3.12.5 (образ API), `zipfile` (stdlib), `lxml==6.1.0`
(`apps/api/requirements/base.txt:56`), `openpyxl==3.1.2` (`:46`), `nh3==0.2.18` (`:79`), кеш Django (`django_redis`,
`settings/common.py:393-399`); тесты — pytest 9.0.3 + pytest-django 4.12.0 (`requirements/test.txt`).

**Зависимости.** Линия S не пересекается с F/R/B ни по одному файлу и не ждёт их: может стартовать сразу после F (или
параллельно с ней). B потребляет контракты из блоков «Интерфейс» задач S1–S3; сводка для B, F и контроллера —
`drafts/plan-S-needs.md`.

---

## 0. Глобальные ограничения линии S

1. **Владение** (CONTRACTS §0): только `apps/api/plane/ppm_vault/**`, `apps/api/plane/ppm_canvas/**`,
   `apps/api/plane/tests/**`. Не трогать: `apps/api/plane/settings/**`, `apps/api/plane/urls.py`,
   `apps/api/requirements/**`, миграции, `apps/web/**`, `packages/**`, `apps/proxy/**`.
2. **Пред-образы.** Перед первой правкой каждого файла и перед созданием нового:
   `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`
   (для нового файла сохраняется маркер `.__absent__`; повторный вызов для того же пути ничего не делает).
3. **Без коммитов**; не выполнять `git add/stash/checkout/restore`. Снимки делает контроллер (`af21-snap.sh`).
4. **Dev-стек не трогать.** `plane-fork-api-1` (:8000), `plane-fork-plane-db-1` и остальные сервисы `docker-compose-local.yml`
   не перезапускать. pytest в dev-образе отсутствует (`docker exec plane-fork-api-1 python -m pytest` →
   `No module named pytest`), поэтому тесты — только в изолированном compose-проекте `ppm-af21-s` (ниже). Dev-API запущен с
   `uvicorn --reload --reload-dir /code` (`apps/api/bin/docker-entrypoint-api-local.sh`, последняя строка) и монтирует
   `./apps/api`, поэтому правки видны на :8000 сразу — это используется только для дымовой проверки маршрута без
   авторизации (`curl` без cookies, пользовательские данные не читаются).
5. **Ошибки и тексты.** Только `ppm_error_response`; сообщения — по-русски; коды — `UPPER_SNAKE` (новых кодов нет:
   используются существующие `VAULT_…` и `PROJECTION_SEARCH_INVALID`). Существующие поля и коды ответов не меняются, новые
   поля только добавляются.
6. **Ничего не исполнять из файлов.** Никаких подпроцессов/LibreOffice/`eval`; `openpyxl.load_workbook(read_only=True,
   data_only=True, keep_links=False)` (формулы не вычисляются, VBA не загружается — `keep_vba` по умолчанию `False`).
7. **Тесты** — контрактные, по образцу `apps/api/plane/tests/contract/ppm_vault/test_vault_api.py`:
   `pytestmark = [pytest.mark.contract, pytest.mark.django_db]`, фабрики `plane.tests.factories`, локальное приватное
   хранилище (`settings.PPM_LOCAL_ASSET_UPLOADS = True`, `settings.PPM_VAULT_STORAGE_ROOT = str(tmp_path / …)`), в тестах
   предпросмотра — `LocMemCache` с уникальным `LOCATION` (не зависят от Redis и друг от друга).
8. **Стиль** — `ruff` по `apps/api/pyproject.toml` (line-length 120, правила `E`, `F`): `ruff check` и
   `ruff format --check` чистые для всех изменённых файлов.
9. **Номера строк** во всех «Было» — по рабочему дереву 2026-09-25 до правок линии S; вставки выше по файлу сдвигают
   нижние строки, поэтому ориентир — текст блока «Было»: каждый такой блок проверен скриптом и встречается в текущем
   файле ровно один раз, а каждый блок «Стало» — дословно в прогнанном коде.

### 0.1 Как запускаются API-тесты (проверено 2026-09-25)

В репозитории API-тесты идут через `docker-compose-test.yml`: сервис `api-tests` монтирует `./apps/api` в `/code`, при
старте ставит `requirements/test.txt`, работает с `DJANGO_SETTINGS_MODULE=plane.settings.test`; `apps/api/pytest.ini`
добавляет `--reuse-db --nomigrations -vs`; зависимости — отдельные `test-db`/`test-redis`/`test-mq`/`test-minio` на tmpfs
(подробно — `apps/api/tests/RUNNING_TESTS.md`). На этой машине (ARM64) образа MinIO из Quay нет, есть локальный
`ppm-af12-minio:RELEASE.2025-09-07T16-13-09Z` — его выбирают переменной `PPM_E2E_MINIO_IMAGE`. Чтобы не собирать образ
заново (минуты, сеть), линия переиспользует уже собранный `plane-fork-api-tests:latest` под именем своего проекта:

```bash
# один раз на линию (тег образа Docker — не правка репозитория)
cd /Users/ermolov/Desktop/PPM/plane-fork
docker image inspect ppm-af21-s-api-tests:latest >/dev/null 2>&1 \
  || docker tag plane-fork-api-tests:latest ppm-af21-s-api-tests:latest
```

Дальше в задачах «**`PYTEST <пути>`**» означает ровно эту команду (подставлять целиком):

```bash
cd /Users/ermolov/Desktop/PPM/plane-fork && \
PPM_E2E_MINIO_IMAGE=ppm-af12-minio:RELEASE.2025-09-07T16-13-09Z \
docker compose -p ppm-af21-s -f docker-compose-test.yml run --rm api-tests \
  pytest -p no:cacheprovider -q -W ignore::DeprecationWarning <пути>
```

- Первый запуск поднимает `ppm-af21-s-test-{db,redis,mq,minio}-1` (≈30–60 с); сервисы остаются поднятыми между запусками.
  Каждый запуск заново ставит test-зависимости pip'ом (нужна сеть к PyPI, ≈20 с) — это штатное поведение compose-файла.
- `-p no:cacheprovider` и `PYTHONDONTWRITEBYTECODE=1` (задан в `Dockerfile.dev`) — pytest ничего не пишет в рабочее дерево.
- Не запускать два `PYTEST` одновременно (общая тестовая БД при `--reuse-db`).
- **Базовая линия до S (проверено):** `PYTEST plane/tests/contract/ppm_vault` → `19 passed`;
  `PYTEST plane/tests/contract/ppm_canvas` → `99 passed`.
- После всей линии (если контроллер не просит оставить стек для ревью):
  `cd /Users/ermolov/Desktop/PPM/plane-fork && docker compose -p ppm-af21-s -f docker-compose-test.yml down -v`.

«**`RUFF <файлы>`**» — линт в одноразовом контейнере, без записи кеша в дерево (`--no-cache`):

```bash
docker run --rm -v /Users/ermolov/Desktop/PPM/plane-fork/apps/api:/code -w /code --entrypoint sh \
  plane-fork-api-tests:latest -c 'pip install -q ruff==0.9.7 && ruff check --no-cache <файлы> && ruff format --no-cache --check <файлы>'
```

Ожидается `All checks passed!` и `N files already formatted`.

---

## Задача S1 — серверный предпросмотр файлов Хранилища (≈45 мин)

**Файлы**
- Создать: `apps/api/plane/ppm_vault/formats.py` — словарь форматов (Office, код, текст); его же импортирует S3.
- Создать: `apps/api/plane/ppm_vault/preview.py` — построение предпросмотра, лимиты, кеш.
- Изменить: `apps/api/plane/ppm_vault/views.py` — импорт после строки 36 (`from .links import entry_path, serialize_link`);
  новый класс между концом `PpmVaultFileContentView` (строка 367, `return Response(serialize_entry(entry))`) и
  `class PpmVaultBacklinksView` (строка 370).
- Изменить: `apps/api/plane/ppm_vault/urls.py` — импорт между строками 8 и 9, маршрут перед закрывающей `]` (строка 97).
- Создать тест: `apps/api/plane/tests/contract/ppm_vault/test_vault_preview_api.py`.

**Интерфейс (контракт для B; уточняет CONTRACTS §5)**

`GET /api/ppm/v1/workspaces/<workspace_id:uuid>/projects/<project_id:uuid>/vault/entries/<entry_id:uuid>/preview/`

- В CONTRACTS §5 указан `<slug>`, но все маршруты Хранилища принимают **UUID пространства**
  (`ppm_vault/urls.py:28` — `PROJECT = "workspaces/<uuid:workspace_id>/projects/<uuid:project_id>/vault/"`; клиент —
  `apps/web/core/services/ppm-vault.service.ts:346-347`). Контракт исправлен на UUID (передано в `plan-S-needs.md`).
- Права — ровно как у `/file/` (`PpmVaultFileContentView.get`, `ppm_vault/views.py:321-342`):
  `require_access(request, workspace_id, project_id)` (чтение) + `get_entry(vault=vault, entry_id=entry_id)` (только
  `ACTIVE` в Хранилище этого проекта).

Ответ `200`, заголовок `Cache-Control: private, no-store`:

```jsonc
{
  "entry_id": "uuid", "version": 3, "content_hash": "sha256-hex", "extension": "docx",
  "kind": "docx" | "xlsx" | "pptx" | "text" | "unsupported",
  "truncated": false,
  // kind = "docx": только теги p, h1–h4, ul, li, br, table, tbody, tr, td; без атрибутов
  "html": "<h1>…</h1><p>…</p><ul><li>…</li></ul><table><tbody><tr><td>…</td></tr></tbody></table>",
  // kind = "xlsx": ≤ 5 видимых листов, каждый ≤ 200 строк × 50 столбцов, только значения (кеш формул), строки выровнены по ширине
  "sheets": [{ "name": "Лист1", "rows": [["A1", "B1"], ["A2", ""]] }],
  // kind = "pptx": порядок из p:sldIdLst, ≤ 200 слайдов, title ≤ 300 символов, text ≤ 4000
  "slides": [{ "index": 1, "title": "Заголовок", "text": "Строка 1\nСтрока 2" }],
  // kind = "text": txt, md (из версии Markdown), csv, json, код из formats.py; ≤ 256 КиБ
  "text": "…", "encoding": "utf-8" | "windows-1251",
  // kind = "unsupported":
  "reason": "type" | "too_large" | "limits" | "invalid" | "encrypted" | "binary"
}
```

| `reason` | Когда | Что показывает B |
|---|---|---|
| `type` | формат без серверного предпросмотра: pdf и картинки (их B показывает через `/pdf/` и `/file/`), doc/xls/ppt/odt/ods/odp/key | иконка + «Скачать» |
| `too_large` | исходник больше `PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES` (файл не читается) | «Слишком большой для предпросмотра» |
| `limits` | архив нарушает лимиты (элементов > 2000, распакованного > 20 МиБ суммарно, элемент > 1 МиБ со сжатием > 200×) | «Слишком сложный файл» |
| `invalid` | повреждён или не разбирается (в т. ч. элемент распаковывается больше заявленного размера) | «Не удалось прочитать» |
| `encrypted` | защищён паролем (OLE-контейнер вместо zip) или зашифрованный элемент zip | «Защищён паролем» |
| `binary` | «текстовый» файл содержит NUL-байты | «Не похоже на текст» |

Ошибки: `401 AUTHENTICATION_REQUIRED`; `403 VAULT_PERMISSION_DENIED`; `404 VAULT_ENTRY_NOT_FOUND` (нет, в корзине, другой
проект); `400 VAULT_INVALID_FILE_TYPE` (папка); `503 VAULT_STORAGE_FAILED` (объект недоступен в хранилище).

Лимиты (переопределяются настройками Django через `getattr`, в `settings/*.py` не добавляются):

| Настройка | По умолчанию | Смысл |
|---|---|---|
| `PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES` | 16 МиБ | больше — `too_large` без чтения (страховка на случай подъёма лимита загрузки) |
| `PPM_VAULT_PREVIEW_ZIP_MAX_MEMBERS` | 2000 | число элементов архива |
| `PPM_VAULT_PREVIEW_ZIP_MAX_UNCOMPRESSED_BYTES` | 20 МиБ | сумма заявленных распакованных размеров (CONTRACTS §5) |
| `PPM_VAULT_PREVIEW_ZIP_MAX_RATIO` | 200 | для элементов > 1 МиБ |
| `PPM_VAULT_PREVIEW_TEXT_MAX_BYTES` | 256 КиБ | текстовый предпросмотр |
| `PPM_VAULT_PREVIEW_MAX_OUTPUT_CHARS` | 400 000 | суммарно символов в html/ячейках/слайдах |
| `PPM_VAULT_PREVIEW_TIME_BUDGET_MS` | 5000 | кооперативный дедлайн разбора |
| `PPM_VAULT_PREVIEW_CACHE_SECONDS` | 86 400 | TTL кеша |

**Решения S1.**
- **Кеш «по хэшу версии».** Ключ `ppm:vault-preview:` + sha256(версия схемы предпросмотра | kind | extension |
  `content_hash` текущей версии | лимиты). Новая версия файла → новый хэш → новый ключ; одинаковые байты у разных записей
  дают одинаковый предпросмотр (утечки нет: чтобы попасть в ключ, нужно иметь сами байты). В кеше нет идентификаторов —
  `entry_id`/`version` добавляются к ответу после проверки прав. Ошибки кеша (Redis недоступен) → пересчёт с записью в лог;
  сбои хранилища не кешируются. Смена логики разбора → поднять `PREVIEW_SCHEMA_VERSION`.
- **Тайм-аут.** Кооперативный дедлайн (проверка в циклах блоков/строк/слайдов) + ограниченный вход (≤ 20 МиБ XML; глубина
  XML у libxml2 без `huge_tree` ≤ 256) вместо жёсткого прерывания: `signal.alarm` не работает вне главного потока (ASGI
  выполняет синхронные view в пуле потоков), подпроцесс на каждый предпросмотр несоразмерен задаче. Исчерпание бюджета →
  частичный результат с `truncated: true`.
- **Старые форматы** (doc/xls/ppt — OLE, odt/ods/odp — ODF) → `unsupported/type`: вне AF2.1, «Скачать» работает.
- **Кодировка текста:** UTF-8 (BOM допускается); если не UTF-8 и нет NUL — cp1251 (частый случай для CSV из Excel),
  `encoding` сообщает, что выбрано.

- [ ] **S1.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
  apps/api/plane/ppm_vault/formats.py apps/api/plane/ppm_vault/preview.py \
  apps/api/plane/ppm_vault/views.py apps/api/plane/ppm_vault/urls.py \
  apps/api/plane/tests/contract/ppm_vault/test_vault_preview_api.py
```

Ожидается (при первом вызове) 5 строк `pre-image saved: apps/api/plane/…`.

- [ ] **S1.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_vault/test_vault_preview_api.py` целиком:

```python
import io
import uuid
import zipfile
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from openpyxl import Workbook
from rest_framework import status

from plane.ppm_vault import preview as vault_preview
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
P_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
SLIDE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"


def make_user():
    marker = uuid.uuid4().hex
    return UserFactory(username=f"preview-{marker}", email=f"preview-{marker}@plane.test")


@pytest.fixture
def vault_project(settings, tmp_path):
    settings.PPM_LOCAL_ASSET_UPLOADS = True
    settings.PPM_VAULT_STORAGE_ROOT = str(tmp_path / "private-vault")
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": f"ppm-preview-{uuid.uuid4().hex}",
        }
    }
    user = make_user()
    workspace = WorkspaceFactory(owner=user)
    WorkspaceMemberFactory(workspace=workspace, member=user, role=20)
    project = ProjectFactory(workspace=workspace, identifier="PRV")
    ProjectMemberFactory(workspace=workspace, project=project, member=user, role=20)
    return user, workspace, project


def vault_url(workspace, project, suffix=""):
    return f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/vault/{suffix}"


def upload(api_client, workspace, project, name, payload):
    response = api_client.post(
        vault_url(workspace, project, "files/"),
        {"file": SimpleUploadedFile(name, payload, content_type="application/octet-stream")},
        format="multipart",
    )
    assert response.status_code == status.HTTP_201_CREATED, response.data
    return response.data["id"]


def preview(api_client, workspace, project, entry_id):
    return api_client.get(vault_url(workspace, project, f"entries/{entry_id}/preview/"))


def zip_bytes(members, compression=zipfile.ZIP_DEFLATED):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression) as archive:
        for name, content in members.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def docx_bytes(body_xml, *, doctype=""):
    document = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>{doctype}'
        f'<w:document xmlns:w="{W_NS}"><w:body>{body_xml}</w:body></w:document>'
    )
    styles = (
        f'<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="{W_NS}">'
        '<w:style w:type="paragraph" w:styleId="1"><w:name w:val="heading 1"/></w:style>'
        "</w:styles>"
    )
    return zip_bytes({"word/document.xml": document, "word/styles.xml": styles})


def paragraph(text, style=None, numbered=False):
    properties = ""
    if style or numbered:
        style_xml = f'<w:pStyle w:val="{style}"/>' if style else ""
        numbering = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>' if numbered else ""
        properties = f"<w:pPr>{style_xml}{numbering}</w:pPr>"
    return f'<w:p>{properties}<w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'


def pptx_bytes(slides_in_order):
    relationships = []
    slide_ids = []
    members = {}
    for position, (file_number, title, body) in enumerate(slides_in_order, start=2):
        relationships.append(
            f'<Relationship Id="rId{position}" Type="{SLIDE_REL}" Target="slides/slide{file_number}.xml"/>'
        )
        slide_ids.append(f'<p:sldId id="{254 + position}" r:id="rId{position}"/>')
        members[f"ppt/slides/slide{file_number}.xml"] = (
            f'<p:sld xmlns:p="{P_NS}" xmlns:a="{A_NS}"><p:cSld><p:spTree>'
            '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Title"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr>'
            f"</p:nvSpPr><p:txBody><a:p><a:r><a:t>{title}</a:t></a:r></a:p></p:txBody></p:sp>"
            '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Body"/><p:cNvSpPr/><p:nvPr><p:ph idx="1"/></p:nvPr>'
            f"</p:nvSpPr><p:txBody><a:p><a:r><a:t>{body}</a:t></a:r></a:p></p:txBody></p:sp>"
            "</p:spTree></p:cSld></p:sld>"
        )
    members["ppt/presentation.xml"] = (
        f'<p:presentation xmlns:p="{P_NS}" xmlns:r="{R_NS}"><p:sldIdLst>{"".join(slide_ids)}</p:sldIdLst>'
        "</p:presentation>"
    )
    members["ppt/_rels/presentation.xml.rels"] = (
        f'<Relationships xmlns="{REL_NS}">{"".join(relationships)}</Relationships>'
    )
    return zip_bytes(members)


def xlsx_bytes(rows, cols, *, sheet_title="Бюджет"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = sheet_title
    for row in range(1, rows + 1):
        for col in range(1, cols + 1):
            sheet.cell(row=row, column=col, value=f"R{row}C{col}")
    sheet["A1"] = "Статья"
    sheet["B1"] = 1250.0
    sheet["C1"] = "=B1*2"
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_docx_preview_builds_sanitized_html_with_headings_lists_and_tables(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    table = (
        "<w:tbl><w:tr><w:tc>" + paragraph("Срок") + "</w:tc><w:tc>" + paragraph("Октябрь") + "</w:tc></w:tr></w:tbl>"
    )
    body = (
        paragraph("План запуска", style="1")
        + paragraph("Обычный текст &lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x onerror=alert(2)&gt;")
        + paragraph("Первый пункт", numbered=True)
        + paragraph("Второй пункт", numbered=True)
        + table
    )
    entry_id = upload(api_client, workspace, project, "План.docx", docx_bytes(body))

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response["Cache-Control"] == "private, no-store"
    assert response.data["kind"] == "docx"
    assert response.data["entry_id"] == entry_id
    assert response.data["version"] == 1
    assert response.data["truncated"] is False
    html = response.data["html"]
    assert "<h1>План запуска</h1>" in html
    assert "<ul><li>Первый пункт</li><li>Второй пункт</li></ul>" in html
    assert "<table><tbody><tr><td>Срок</td><td>Октябрь</td></tr></tbody></table>" in html
    assert "&lt;script&gt;alert(1)&lt;/script&gt;&lt;img src=x onerror=alert(2)&gt;" in html
    assert "<script" not in html
    assert "<img" not in html


def test_docx_external_entity_is_never_resolved(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    doctype = '<!DOCTYPE w:document [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
    body = "<w:p><w:r><w:t>до &xxe; после</w:t></w:r></w:p>"
    entry_id = upload(api_client, workspace, project, "xxe.docx", docx_bytes(body, doctype=doctype))

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "docx"
    assert "root:" not in response.data["html"]
    assert "до" in response.data["html"]


def test_xlsx_preview_returns_values_only_within_200_by_50(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "Бюджет.xlsx", xlsx_bytes(205, 52))

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "xlsx"
    assert response.data["truncated"] is True
    sheet = response.data["sheets"][0]
    assert sheet["name"] == "Бюджет"
    assert len(sheet["rows"]) == 200
    assert {len(row) for row in sheet["rows"]} == {50}
    assert sheet["rows"][0][:3] == ["Статья", "1250", ""]
    assert sheet["rows"][199][49] == "R200C50"


def test_pptx_preview_follows_presentation_slide_order(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    payload = pptx_bytes([(2, "Введение", "Цель проекта"), (1, "Итоги", "Что сделано")])
    entry_id = upload(api_client, workspace, project, "Доклад.pptx", payload)

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "pptx"
    assert response.data["slides"] == [
        {"index": 1, "title": "Введение", "text": "Цель проекта"},
        {"index": 2, "title": "Итоги", "text": "Что сделано"},
    ]


def test_text_markdown_and_unsupported_kinds(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    settings.PPM_VAULT_PREVIEW_TEXT_MAX_BYTES = 64
    csv_id = upload(api_client, workspace, project, "data.csv", "имя;сумма\nАнна;10\n".encode("utf-8"))
    long_id = upload(api_client, workspace, project, "long.txt", b"x" * 200)
    legacy_id = upload(api_client, workspace, project, "legacy.txt", "Привет".encode("cp1251"))
    markdown = api_client.post(
        vault_url(workspace, project, "markdown/"),
        {"name": "README", "content": "# Заголовок"},
        format="json",
    )
    image_id = upload(api_client, workspace, project, "scheme.png", b"\x89PNG\r\n\x1a\n" + b"image")
    old_word_id = upload(api_client, workspace, project, "old.doc", b"\xd0\xcf\x11\xe0legacy")

    csv_preview = preview(api_client, workspace, project, csv_id)
    long_preview = preview(api_client, workspace, project, long_id)
    legacy_preview = preview(api_client, workspace, project, legacy_id)
    markdown_preview = preview(api_client, workspace, project, markdown.data["id"])
    image_preview = preview(api_client, workspace, project, image_id)
    old_word_preview = preview(api_client, workspace, project, old_word_id)

    assert csv_preview.data["kind"] == "text"
    assert csv_preview.data["text"] == "имя;сумма\nАнна;10\n"
    assert csv_preview.data["encoding"] == "utf-8"
    assert long_preview.data["truncated"] is True
    assert long_preview.data["text"] == "x" * 64
    assert legacy_preview.data["text"] == "Привет"
    assert legacy_preview.data["encoding"] == "windows-1251"
    assert markdown_preview.data["kind"] == "text"
    assert markdown_preview.data["text"] == "# Заголовок"
    assert image_preview.data == {**image_preview.data, "kind": "unsupported", "reason": "type"}
    assert old_word_preview.data["kind"] == "unsupported"
    assert old_word_preview.data["reason"] == "type"


def test_zip_bomb_and_hostile_archives_are_refused_without_500(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    bomb = zip_bytes({"word/document.xml": b"\x00" * (21 * 1024 * 1024)})
    assert len(bomb) < 64 * 1024
    bomb_id = upload(api_client, workspace, project, "bomb.docx", bomb)
    garbage_id = upload(api_client, workspace, project, "garbage.xlsx", b"not a zip archive")
    encrypted_id = upload(
        api_client, workspace, project, "secret.docx", b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 64
    )
    settings.PPM_VAULT_PREVIEW_ZIP_MAX_MEMBERS = 10
    crowded_id = upload(
        api_client,
        workspace,
        project,
        "crowded.pptx",
        zip_bytes({f"ppt/slides/slide{index}.xml": "<x/>" for index in range(20)}),
    )

    responses = {
        name: preview(api_client, workspace, project, entry_id)
        for name, entry_id in {
            "bomb": bomb_id,
            "garbage": garbage_id,
            "encrypted": encrypted_id,
            "crowded": crowded_id,
        }.items()
    }

    assert {name: response.status_code for name, response in responses.items()} == {
        "bomb": 200,
        "garbage": 200,
        "encrypted": 200,
        "crowded": 200,
    }
    assert {name: (response.data["kind"], response.data["reason"]) for name, response in responses.items()} == {
        "bomb": ("unsupported", "limits"),
        "garbage": ("unsupported", "invalid"),
        "encrypted": ("unsupported", "encrypted"),
        "crowded": ("unsupported", "limits"),
    }


def test_member_that_inflates_past_its_declared_size_is_rejected(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("word/document.xml", b"<" * (256 * 1024))
        archive.filelist[0].file_size = 16
    entry_id = upload(api_client, workspace, project, "forged.docx", buffer.getvalue())

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "unsupported"
    assert response.data["reason"] == "invalid"


def test_exhausted_time_budget_returns_truncated_preview(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "Долгий.docx", docx_bytes(paragraph("Текст")))
    settings.PPM_VAULT_PREVIEW_TIME_BUDGET_MS = -1

    response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "docx"
    assert response.data["html"] == ""
    assert response.data["truncated"] is True


def test_source_over_preview_limit_is_not_read(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "big.txt", b"a" * 128)
    settings.PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES = 64

    with patch.object(vault_preview, "open_private_object") as opened:
        response = preview(api_client, workspace, project, entry_id)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["kind"] == "unsupported"
    assert response.data["reason"] == "too_large"
    opened.assert_not_called()


def test_preview_is_cached_by_version_hash_and_refreshed_by_new_version(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    entry_id = upload(api_client, workspace, project, "notes.txt", "первая версия".encode("utf-8"))

    with patch.object(vault_preview, "open_private_object", wraps=vault_preview.open_private_object) as opened:
        first = preview(api_client, workspace, project, entry_id)
        second = preview(api_client, workspace, project, entry_id)
        replaced = api_client.put(
            vault_url(workspace, project, f"entries/{entry_id}/file/"),
            {
                "base_version": "1",
                "file": SimpleUploadedFile("notes.txt", "вторая версия".encode("utf-8"), content_type="text/plain"),
            },
            format="multipart",
        )
        third = preview(api_client, workspace, project, entry_id)

    assert first.data["text"] == second.data["text"] == "первая версия"
    assert replaced.status_code == status.HTTP_200_OK
    assert third.data["version"] == 2
    assert third.data["text"] == "вторая версия"
    assert opened.call_count == 2


def test_preview_uses_vault_read_permissions(api_client, vault_project):
    owner, workspace, project = vault_project
    guest = make_user()
    outsider = make_user()
    WorkspaceMemberFactory(workspace=workspace, member=guest, role=5)
    ProjectMemberFactory(workspace=workspace, project=project, member=guest, role=5)
    WorkspaceMemberFactory(workspace=workspace, member=outsider, role=15)
    other_project = ProjectFactory(workspace=workspace, identifier="PRV2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=owner, role=20)
    api_client.force_authenticate(user=owner)
    entry_id = upload(api_client, workspace, project, "secret.txt", b"private text")
    trashed_id = upload(api_client, workspace, project, "trashed.txt", b"gone")
    api_client.delete(vault_url(workspace, project, f"entries/{trashed_id}/"))

    foreign = api_client.get(vault_url(workspace, other_project, f"entries/{entry_id}/preview/"))
    trashed = preview(api_client, workspace, project, trashed_id)
    api_client.force_authenticate(user=guest)
    guest_response = preview(api_client, workspace, project, entry_id)
    api_client.force_authenticate(user=outsider)
    outsider_response = preview(api_client, workspace, project, entry_id)
    api_client.force_authenticate(user=None)
    anonymous = preview(api_client, workspace, project, entry_id)

    assert foreign.status_code == status.HTTP_404_NOT_FOUND
    assert foreign.data["error"]["code"] == "VAULT_ENTRY_NOT_FOUND"
    assert trashed.status_code == status.HTTP_404_NOT_FOUND
    assert guest_response.status_code == status.HTTP_200_OK
    assert guest_response.data["text"] == "private text"
    assert outsider_response.status_code == status.HTTP_403_FORBIDDEN
    assert outsider_response.data["error"]["code"] == "VAULT_PERMISSION_DENIED"
    assert "private text" not in str(outsider_response.data)
    assert anonymous.status_code == status.HTTP_401_UNAUTHORIZED
```

- [ ] **S1.3 Тест красный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_preview_api.py`
  Ожидается ошибка сбора: `ERROR plane/tests/contract/ppm_vault/test_vault_preview_api.py` с
  `ModuleNotFoundError: No module named 'plane.ppm_vault.preview'`, итог `1 error`.

- [ ] **S1.4 Создать `apps/api/plane/ppm_vault/formats.py`:**

```python
"""File-format vocabulary shared by Vault upload validation and server previews (AF2.1)."""

# Office Open XML formats whose preview is built on the server from the archive content.
OFFICE_PREVIEW_EXTENSIONS = frozenset({"docx", "xlsx", "pptx"})

# Source code and configuration stored as plain UTF-8 text. Browser-active markup
# (html, htm, xhtml, xml, svg) is deliberately absent: it is never accepted as "code".
CODE_TEXT_EXTENSIONS = frozenset(
    {
        "bash",
        "c",
        "cc",
        "cfg",
        "cjs",
        "cpp",
        "cs",
        "css",
        "cxx",
        "dart",
        "go",
        "gql",
        "graphql",
        "h",
        "hpp",
        "ini",
        "java",
        "jl",
        "js",
        "jsx",
        "kt",
        "kts",
        "less",
        "log",
        "lua",
        "mjs",
        "php",
        "proto",
        "ps1",
        "py",
        "r",
        "rb",
        "rs",
        "scala",
        "scss",
        "sh",
        "sql",
        "swift",
        "tex",
        "toml",
        "ts",
        "tsv",
        "tsx",
        "yaml",
        "yml",
        "zsh",
    }
)

# Extensions whose preview is the (size-capped) text itself.
TEXT_PREVIEW_EXTENSIONS = frozenset({"csv", "json", "md", "txt"}) | CODE_TEXT_EXTENSIONS
```

- [ ] **S1.5 Создать `apps/api/plane/ppm_vault/preview.py`:**

```python
"""Server-built previews of Vault files for the Canvas and the Vault UI (AF2.1).

Security model: nothing in a document is executed. Office Open XML parts are read
with zipfile + lxml (entities not resolved, no network, no DTD) and openpyxl in
read-only/data-only mode (formulas are never evaluated, VBA is never loaded).
Archive limits are checked on the central directory before any part is
decompressed, zipfile itself refuses to inflate a member past its declared size,
and every loop runs under an output and time budget. docx HTML is assembled from
escaped text and passed through nh3 with a tag allowlist and no attributes.
"""

import codecs
import datetime
import hashlib
import html
import io
import logging
import posixpath
import time
import warnings
import zipfile

import nh3
from django.conf import settings
from django.core.cache import cache
from lxml import etree

from .formats import OFFICE_PREVIEW_EXTENSIONS, TEXT_PREVIEW_EXTENSIONS
from .models import PpmVaultEntryKind
from .storage import open_private_object


logger = logging.getLogger("plane.api")

PREVIEW_SCHEMA_VERSION = 1
CACHE_PREFIX = "ppm:vault-preview:"

XLSX_MAX_SHEETS = 5
XLSX_MAX_ROWS = 200
XLSX_MAX_COLS = 50
CELL_MAX_CHARS = 300
PPTX_MAX_SLIDES = 200
SLIDE_TITLE_MAX_CHARS = 300
SLIDE_TEXT_MAX_CHARS = 4000
DOCX_MAX_BLOCKS = 3000
DOCX_TABLE_MAX_ROWS = 200
DOCX_TABLE_MAX_COLS = 50
OLE_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"
ALLOWED_HTML_TAGS = {"p", "h1", "h2", "h3", "h4", "ul", "li", "br", "table", "tbody", "tr", "td"}

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
MC = "http://schemas.openxmlformats.org/markup-compatibility/2006"


def _q(namespace, tag):
    return f"{{{namespace}}}{tag}"


W_BODY, W_P, W_PPR, W_PSTYLE, W_NUMPR, W_VAL = (
    _q(W, "body"),
    _q(W, "p"),
    _q(W, "pPr"),
    _q(W, "pStyle"),
    _q(W, "numPr"),
    _q(W, "val"),
)
W_T, W_TAB, W_BR, W_CR, W_NBH = _q(W, "t"), _q(W, "tab"), _q(W, "br"), _q(W, "cr"), _q(W, "noBreakHyphen")
W_TBL, W_TR, W_TC = _q(W, "tbl"), _q(W, "tr"), _q(W, "tc")
W_CONTAINERS = {_q(W, "sdt"), _q(W, "sdtContent"), _q(W, "customXml")}
W_SKIPPED = {_q(W, "del"), _q(W, "moveFrom"), _q(W, "delText"), _q(W, "instrText"), _q(MC, "Fallback")}
A_P, A_T, A_BR, A_TC = _q(A, "p"), _q(A, "t"), _q(A, "br"), _q(A, "tc")


class PreviewRejected(Exception):
    def __init__(self, reason):
        self.reason = reason
        super().__init__(reason)


class PreviewStorageUnavailable(Exception):
    pass


def _limit(name, default):
    return int(getattr(settings, name, default))


def preview_limits():
    return {
        "source_max_bytes": _limit("PPM_VAULT_PREVIEW_SOURCE_MAX_BYTES", 16 * 1024 * 1024),
        "zip_max_members": _limit("PPM_VAULT_PREVIEW_ZIP_MAX_MEMBERS", 2000),
        "zip_max_uncompressed_bytes": _limit("PPM_VAULT_PREVIEW_ZIP_MAX_UNCOMPRESSED_BYTES", 20 * 1024 * 1024),
        "zip_max_ratio": _limit("PPM_VAULT_PREVIEW_ZIP_MAX_RATIO", 200),
        "text_max_bytes": _limit("PPM_VAULT_PREVIEW_TEXT_MAX_BYTES", 256 * 1024),
        "output_max_chars": _limit("PPM_VAULT_PREVIEW_MAX_OUTPUT_CHARS", 400_000),
        "time_budget_ms": _limit("PPM_VAULT_PREVIEW_TIME_BUDGET_MS", 5000),
        "cache_seconds": _limit("PPM_VAULT_PREVIEW_CACHE_SECONDS", 86_400),
    }


class _Budget:
    """Caps total output characters and wall time; hitting a cap marks the preview truncated."""

    def __init__(self, limits):
        self.deadline = time.monotonic() + limits["time_budget_ms"] / 1000
        self.chars_left = limits["output_max_chars"]
        self.truncated = False

    def expired(self):
        if time.monotonic() > self.deadline:
            self.truncated = True
            return True
        return False

    def take(self, text, max_chars=None):
        if max_chars is not None and len(text) > max_chars:
            text = text[:max_chars]
            self.truncated = True
        if self.chars_left <= 0:
            self.truncated = True
            return None
        if len(text) > self.chars_left:
            text = text[: self.chars_left]
            self.truncated = True
        self.chars_left -= len(text)
        return text


def _unsupported(reason):
    return {"kind": "unsupported", "reason": reason, "truncated": False}


def build_entry_preview(entry):
    """Return the preview payload of the entry's current version (cached by content hash)."""
    version = entry.current_version
    if version is None:
        return {"entry_id": str(entry.id), "version": 0, "content_hash": "", "extension": "", **_unsupported("type")}
    limits = preview_limits()
    key = _cache_key(entry=entry, version=version, limits=limits)
    payload = _cache_get(key)
    if payload is None:
        payload = _compute_preview(entry=entry, version=version, limits=limits)
        _cache_set(key, payload, limits["cache_seconds"])
    return {
        "entry_id": str(entry.id),
        "version": version.version,
        "content_hash": version.content_hash or "",
        "extension": entry.extension or "",
        **payload,
    }


def _cache_key(*, entry, version, limits):
    fingerprint = "|".join(
        [
            str(PREVIEW_SCHEMA_VERSION),
            entry.kind,
            (entry.extension or "").casefold(),
            version.content_hash or f"version:{version.id}",
            ",".join(f"{name}={limits[name]}" for name in sorted(limits) if name != "cache_seconds"),
        ]
    )
    return CACHE_PREFIX + hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()


def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:  # noqa: BLE001 - a cache outage must degrade to recomputation, not a 500
        logger.warning("PPM vault preview cache read failed")
        return None


def _cache_set(key, payload, timeout):
    try:
        cache.set(key, payload, timeout)
    except Exception:  # noqa: BLE001
        logger.warning("PPM vault preview cache write failed")


def _preview_format(entry):
    extension = (entry.extension or "").casefold()
    if entry.kind == PpmVaultEntryKind.MARKDOWN:
        return "markdown"
    if entry.kind != PpmVaultEntryKind.FILE:
        return None
    if extension in OFFICE_PREVIEW_EXTENSIONS:
        return extension
    if extension in TEXT_PREVIEW_EXTENSIONS:
        return "text"
    return None


def _compute_preview(*, entry, version, limits):
    preview_format = _preview_format(entry)
    if preview_format is None:
        return _unsupported("type")
    if preview_format == "markdown":
        return _text_payload((version.content_text or "").encode("utf-8"), limits)
    if int(version.size_bytes or 0) > limits["source_max_bytes"]:
        return _unsupported("too_large")
    raw = _read_object(version.object_key, limits["source_max_bytes"])
    if raw is None:
        return _unsupported("too_large")
    try:
        if preview_format == "text":
            return _text_payload(raw, limits)
        if raw.startswith(OLE_SIGNATURE):
            raise PreviewRejected("encrypted")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            if preview_format == "docx":
                return _docx_payload(raw, limits)
            if preview_format == "xlsx":
                return _xlsx_payload(raw, limits)
            return _pptx_payload(raw, limits)
    except PreviewRejected as rejected:
        return _unsupported(rejected.reason)
    except Exception as exc:  # noqa: BLE001 - malformed third-party documents must not become 500s
        logger.info(
            "PPM vault preview could not parse a document",
            extra={"entry_id": str(entry.id), "error": type(exc).__name__},
        )
        return _unsupported("invalid")


def _read_object(object_key, max_bytes):
    try:
        file_obj = open_private_object(object_key)
    except (OSError, ValueError) as exc:
        raise PreviewStorageUnavailable() from exc
    if file_obj is None:
        raise PreviewStorageUnavailable()
    try:
        data = file_obj.read(max_bytes + 1)
    except OSError as exc:
        raise PreviewStorageUnavailable() from exc
    finally:
        file_obj.close()
    return None if len(data) > max_bytes else data


def _text_payload(raw, limits):
    cap = limits["text_max_bytes"]
    truncated = len(raw) > cap
    chunk = raw[:cap]
    if b"\x00" in chunk:
        return _unsupported("binary")
    try:
        text = codecs.getincrementaldecoder("utf-8-sig")("strict").decode(chunk, final=not truncated)
        encoding = "utf-8"
    except UnicodeDecodeError:
        text = chunk.decode("cp1251", errors="replace")
        encoding = "windows-1251"
    return {"kind": "text", "text": text, "encoding": encoding, "truncated": truncated}


def _open_archive(raw, limits):
    try:
        archive = zipfile.ZipFile(io.BytesIO(raw))
    except (zipfile.BadZipFile, zipfile.LargeZipFile, ValueError, OSError) as exc:
        raise PreviewRejected("invalid") from exc
    try:
        members = archive.infolist()
        if len(members) > limits["zip_max_members"]:
            raise PreviewRejected("limits")
        total = 0
        for member in members:
            if member.flag_bits & 0x1:
                raise PreviewRejected("encrypted")
            total += member.file_size
            if total > limits["zip_max_uncompressed_bytes"]:
                raise PreviewRejected("limits")
            if member.file_size > 1024 * 1024 and member.file_size > member.compress_size * limits["zip_max_ratio"]:
                raise PreviewRejected("limits")
    except PreviewRejected:
        archive.close()
        raise
    return archive


def _read_member(archive, name, limits, *, required=True):
    try:
        member = archive.getinfo(name)
    except KeyError:
        if required:
            raise PreviewRejected("invalid")
        return None
    cap = limits["zip_max_uncompressed_bytes"]
    with archive.open(member) as handle:
        data = handle.read(cap + 1)
    if len(data) > cap:
        raise PreviewRejected("limits")
    return data


def _xml(data):
    parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        load_dtd=False,
        dtd_validation=False,
        huge_tree=False,
        remove_comments=True,
        remove_pis=True,
    )
    try:
        return etree.fromstring(data, parser)
    except etree.XMLSyntaxError as exc:
        raise PreviewRejected("invalid") from exc


def _sanitize(markup):
    return nh3.clean(markup, tags=ALLOWED_HTML_TAGS, attributes={"*": set()}, url_schemes=set())


def _escape(text):
    return html.escape(text).replace("\n", "<br>")


# --- docx -------------------------------------------------------------------------------------


def _heading_level(style_name):
    name = " ".join((style_name or "").split()).casefold()
    if name == "title":
        return 1
    if name == "subtitle":
        return 2
    compact = name.replace(" ", "")
    if compact.startswith("heading") and compact[len("heading") :].isdigit():
        return max(1, min(int(compact[len("heading") :]), 4))
    return 0


def _docx_heading_styles(archive, limits):
    data = _read_member(archive, "word/styles.xml", limits, required=False)
    if not data:
        return {}
    levels = {}
    for style in _xml(data).iter(_q(W, "style")):
        style_id = style.get(_q(W, "styleId"))
        name = style.find(_q(W, "name"))
        level = _heading_level(name.get(W_VAL) if name is not None else "")
        if style_id and level:
            levels[style_id] = level
    return levels


def _run_texts(element, out):
    for child in element:
        tag = child.tag
        if not isinstance(tag, str) or tag in W_SKIPPED:
            continue
        if tag == W_T:
            out.append(child.text or "")
        elif tag == W_TAB:
            out.append("\t")
        elif tag in (W_BR, W_CR):
            out.append("\n")
        elif tag == W_NBH:
            out.append("-")
        else:
            _run_texts(child, out)


def _paragraph_text(paragraph):
    out = []
    _run_texts(paragraph, out)
    return "".join(out).strip()


def _docx_blocks(container):
    for child in container:
        if child.tag in (W_P, W_TBL):
            yield child
        elif child.tag in W_CONTAINERS:
            yield from _docx_blocks(child)


def _nested_texts(element):
    texts = []
    for child in element:
        if child.tag == W_P:
            text = _paragraph_text(child)
            if text:
                texts.append(text)
        elif child.tag in (W_TBL, W_TR, W_TC) or child.tag in W_CONTAINERS:
            texts.extend(_nested_texts(child))
    return texts


def _docx_table(table, budget):
    rows = [child for child in table if child.tag == W_TR]
    if len(rows) > DOCX_TABLE_MAX_ROWS:
        budget.truncated = True
    rows_html = []
    for row in rows[:DOCX_TABLE_MAX_ROWS]:
        cells = [child for child in row if child.tag == W_TC]
        if len(cells) > DOCX_TABLE_MAX_COLS:
            budget.truncated = True
        cells_html = []
        for cell in cells[:DOCX_TABLE_MAX_COLS]:
            text = budget.take("\n".join(_nested_texts(cell)), CELL_MAX_CHARS)
            if text is None:
                break
            cells_html.append(f"<td>{_escape(text)}</td>")
        if cells_html:
            rows_html.append(f"<tr>{''.join(cells_html)}</tr>")
        if budget.chars_left <= 0:
            break
    return f"<table><tbody>{''.join(rows_html)}</tbody></table>" if rows_html else ""


def _docx_payload(raw, limits):
    budget = _Budget(limits)
    with _open_archive(raw, limits) as archive:
        document = _read_member(archive, "word/document.xml", limits)
        heading_styles = _docx_heading_styles(archive, limits)
    body = _xml(document).find(W_BODY)
    if body is None:
        raise PreviewRejected("invalid")
    parts = []
    list_open = False
    for index, block in enumerate(_docx_blocks(body)):
        if index >= DOCX_MAX_BLOCKS or budget.expired():
            budget.truncated = True
            break
        if block.tag == W_TBL:
            if list_open:
                parts.append("</ul>")
                list_open = False
            parts.append(_docx_table(block, budget))
            continue
        text = _paragraph_text(block)
        if not text:
            continue
        text = budget.take(text)
        if text is None:
            break
        level = 0
        is_list_item = False
        properties = block.find(W_PPR)
        if properties is not None:
            style = properties.find(W_PSTYLE)
            if style is not None:
                style_id = style.get(W_VAL) or ""
                level = heading_styles.get(style_id) or _heading_level(style_id)
            is_list_item = properties.find(W_NUMPR) is not None
        if is_list_item and not level:
            if not list_open:
                parts.append("<ul>")
                list_open = True
            parts.append(f"<li>{_escape(text)}</li>")
            continue
        if list_open:
            parts.append("</ul>")
            list_open = False
        tag = f"h{level}" if level else "p"
        parts.append(f"<{tag}>{_escape(text)}</{tag}>")
    if list_open:
        parts.append("</ul>")
    return {"kind": "docx", "html": _sanitize("".join(parts)), "truncated": budget.truncated}


# --- xlsx -------------------------------------------------------------------------------------


def _cell_text(value):
    if value is None:
        return ""
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() and abs(value) < 1e15 else f"{value:.15g}"
    if isinstance(value, datetime.datetime):
        if value.time() == datetime.time(0, 0):
            return value.date().isoformat()
        return value.isoformat(sep=" ", timespec="seconds")
    if isinstance(value, (datetime.date, datetime.time)):
        return value.isoformat()
    return str(value)


def _rectangular_rows(rows):
    while rows and not any(rows[-1]):
        rows.pop()
    width = 0
    for row in rows:
        for index, cell in enumerate(row):
            if cell:
                width = max(width, index + 1)
    return [(row + [""] * width)[:width] for row in rows]


def _xlsx_payload(raw, limits):
    from openpyxl import load_workbook

    budget = _Budget(limits)
    _open_archive(raw, limits).close()
    workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True, keep_links=False)
    try:
        visible = [sheet for sheet in workbook.worksheets if getattr(sheet, "sheet_state", "visible") == "visible"]
        worksheets = visible or workbook.worksheets[:1]
        if len(worksheets) > XLSX_MAX_SHEETS:
            budget.truncated = True
        sheets = []
        for worksheet in worksheets[:XLSX_MAX_SHEETS]:
            rows = []
            for row_index, row in enumerate(
                worksheet.iter_rows(
                    min_row=1,
                    max_row=XLSX_MAX_ROWS + 1,
                    max_col=XLSX_MAX_COLS + 1,
                    values_only=True,
                )
            ):
                if row_index >= XLSX_MAX_ROWS:
                    if any(value is not None for value in row):
                        budget.truncated = True
                    break
                if any(value is not None for value in row[XLSX_MAX_COLS:]):
                    budget.truncated = True
                cells = []
                for value in row[:XLSX_MAX_COLS]:
                    text = budget.take(_cell_text(value), CELL_MAX_CHARS)
                    if text is None:
                        break
                    cells.append(text)
                rows.append(cells)
                if budget.chars_left <= 0 or budget.expired():
                    break
            sheets.append({"name": worksheet.title, "rows": _rectangular_rows(rows)})
            if budget.chars_left <= 0 or budget.expired():
                break
    finally:
        workbook.close()
    return {"kind": "xlsx", "sheets": sheets, "truncated": budget.truncated}


# --- pptx -------------------------------------------------------------------------------------


def _part_name(base, target):
    target = (target or "").strip()
    if not target:
        return None
    name = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join(base, target))
    return None if name.startswith("..") else name


def _drawing_paragraph(paragraph):
    return "".join("\n" if node.tag == A_BR else (node.text or "") for node in paragraph.iter(A_T, A_BR)).strip()


def _slide_text(slide):
    title_parts = []
    body_parts = []
    for shape in slide.iter(_q(P, "sp"), _q(P, "graphicFrame")):
        if shape.tag == _q(P, "graphicFrame"):
            for cell in shape.iter(A_TC):
                text = " ".join(filter(None, (_drawing_paragraph(p) for p in cell.iter(A_P))))
                if text:
                    body_parts.append(text)
            continue
        placeholder = shape.find(f"{_q(P, 'nvSpPr')}/{_q(P, 'nvPr')}/{_q(P, 'ph')}")
        is_title = placeholder is not None and placeholder.get("type") in {"title", "ctrTitle"}
        text_body = shape.find(_q(P, "txBody"))
        if text_body is None:
            continue
        paragraphs = [text for text in (_drawing_paragraph(p) for p in text_body.iter(A_P)) if text]
        (title_parts if is_title else body_parts).extend(paragraphs)
    return " ".join(title_parts), "\n".join(body_parts)


def _pptx_payload(raw, limits):
    budget = _Budget(limits)
    slides = []
    with _open_archive(raw, limits) as archive:
        presentation = _xml(_read_member(archive, "ppt/presentation.xml", limits))
        relationships = _xml(_read_member(archive, "ppt/_rels/presentation.xml.rels", limits))
        targets = {}
        for relationship in relationships.iter(_q(PKG_REL, "Relationship")):
            if relationship.get("TargetMode") == "External" or not relationship.get("Type", "").endswith("/slide"):
                continue
            part = _part_name("ppt", relationship.get("Target"))
            if part:
                targets[relationship.get("Id")] = part
        order = [slide_id.get(_q(R, "id")) for slide_id in presentation.iter(_q(P, "sldId"))]
        if len(order) > PPTX_MAX_SLIDES:
            budget.truncated = True
        for index, relationship_id in enumerate(order[:PPTX_MAX_SLIDES], start=1):
            if budget.expired():
                break
            part = targets.get(relationship_id)
            data = _read_member(archive, part, limits, required=False) if part else None
            if data is None:
                continue
            title, text = _slide_text(_xml(data))
            title = budget.take(title, SLIDE_TITLE_MAX_CHARS)
            text = budget.take(text, SLIDE_TEXT_MAX_CHARS) if title is not None else None
            if title is None or text is None:
                break
            slides.append({"index": index, "title": title, "text": text})
    return {"kind": "pptx", "slides": slides, "truncated": budget.truncated}
```

- [ ] **S1.6 `apps/api/plane/ppm_vault/views.py` — импорт.** Было (строки 36–37):

```python
from .links import entry_path, serialize_link
from .storage import open_private_object, private_object_url
```

Стало:

```python
from .links import entry_path, serialize_link
from .preview import PreviewStorageUnavailable, build_entry_preview
from .storage import open_private_object, private_object_url
```

- [ ] **S1.7 `views.py` — новый view.** Было (строки 367–370):

```python
        return Response(serialize_entry(entry))


class PpmVaultBacklinksView(PpmVaultAPIView):
```

Стало:

```python
        return Response(serialize_entry(entry))


class PpmVaultFilePreviewView(PpmVaultAPIView):
    def get(self, request, workspace_id, project_id, entry_id):
        _, vault, denied = self.require_access(request, workspace_id, project_id)
        if denied:
            return denied
        entry = self.get_entry(vault=vault, entry_id=entry_id)
        if entry.kind == PpmVaultEntryKind.FOLDER:
            raise PpmVaultConflict(code="VAULT_INVALID_FILE_TYPE", message="У папки нет предпросмотра.")
        try:
            payload = build_entry_preview(entry)
        except PreviewStorageUnavailable as exc:
            raise PpmVaultConflict(code="VAULT_STORAGE_FAILED", message="Файл временно недоступен.") from exc
        response = Response(payload)
        response["Cache-Control"] = "private, no-store"
        return response


class PpmVaultBacklinksView(PpmVaultAPIView):
```

(`PpmVaultEntryKind` и `PpmVaultConflict` уже импортированы в `views.py:12-34`; `VAULT_STORAGE_FAILED` уже
отображается в 503 функцией `error_status`, `views.py:84-85`.)

- [ ] **S1.8 `apps/api/plane/ppm_vault/urls.py`.** Было (строки 8–9):

```python
    PpmVaultFileContentView,
    PpmVaultFileUploadView,
```

Стало:

```python
    PpmVaultFileContentView,
    PpmVaultFilePreviewView,
    PpmVaultFileUploadView,
```

Было (строки 92–97):

```python
    path(
        f"{PROJECT}entries/<uuid:entry_id>/file/",
        PpmVaultFileContentView.as_view(),
        name="ppm-vault-file-content",
    ),
]
```

Стало:

```python
    path(
        f"{PROJECT}entries/<uuid:entry_id>/file/",
        PpmVaultFileContentView.as_view(),
        name="ppm-vault-file-content",
    ),
    path(
        f"{PROJECT}entries/<uuid:entry_id>/preview/",
        PpmVaultFilePreviewView.as_view(),
        name="ppm-vault-file-preview",
    ),
]
```

- [ ] **S1.9 Тест зелёный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_preview_api.py` → `11 passed`.
- [ ] **S1.10 Регрессия.** `PYTEST plane/tests/contract/ppm_vault plane/tests/contract/ppm_canvas` → `129 passed`
  (ppm_vault 19 + 11, ppm_canvas 99).
- [ ] **S1.11 Линт.** `RUFF plane/ppm_vault/formats.py plane/ppm_vault/preview.py plane/ppm_vault/views.py plane/ppm_vault/urls.py plane/tests/contract/ppm_vault/test_vault_preview_api.py`
  → `All checks passed!`, `5 files already formatted`.
- [ ] **S1.12 Дымовая проверка маршрута на dev-API** (без авторизации, данные не читаются):

```bash
curl -s http://localhost:8000/api/ppm/v1/workspaces/00000000-0000-0000-0000-000000000000/projects/00000000-0000-0000-0000-000000000000/vault/entries/00000000-0000-0000-0000-000000000000/preview/
```

  До S1 — `404`. После — `{"error":{"code":"AUTHENTICATION_REQUIRED","message":"Требуется авторизация.",…}}` (HTTP 401).
  Если сразу после сохранения всё ещё 404 — подождать 2–3 с (перезагрузка uvicorn) и повторить.

**Приёмка S1**
- [ ] Маршрут `…/vault/entries/<id>/preview/` отвечает по контракту для docx/xlsx/pptx/text/unsupported.
- [ ] docx: заголовки по стилям (`styles.xml` → «heading N»/«Title»), списки `<ul><li>`, таблицы; HTML только из
  разрешённых тегов без атрибутов; `<script>`/`<img>` из текста документа приходят экранированными.
- [ ] XXE: внешняя сущность не раскрывается (тест `test_docx_external_entity_is_never_resolved`).
- [ ] xlsx: ≤ 200 × 50, только значения, `truncated: true` при обрезке; pptx: порядок из `p:sldIdLst`.
- [ ] Zip-бомба (21 МиБ нулей в ~21 КиБ), «лишние» элементы, мусор вместо zip, OLE-контейнер, элемент, распаковывающийся
  больше заявленного, — `200` с `unsupported` и нужной причиной, без 500.
- [ ] Исходник больше лимита не читается (`open_private_object` не вызывается); исчерпанный бюджет времени → `truncated`.
- [ ] Кеш: повторный запрос не читает хранилище; новая версия файла пересчитывается.
- [ ] Права как у `/file/`: гость — 200, не участник проекта — 403, аноним — 401, чужой проект и корзина — 404.
- [ ] Регрессия `129 passed`, `ruff` чистый, пред-образы сохранены.

---

## Задача S2 — поиск документов для Холста (≈30 мин)

**Файлы**
- Изменить: `apps/api/plane/ppm_canvas/services.py` — импорт в строке 9; две новые функции между концом
  `serialize_missing_work_item` (строки 597–622) и `def _content_source_url` (строка 625).
- Изменить: `apps/api/plane/ppm_canvas/serializers.py` — `PpmProjectionSearchSerializer.validate_types` (строки 150–154).
- Изменить: `apps/api/plane/ppm_canvas/views.py` — импорты (строки 78–79 и 83–84); ветка `types=page` в
  `PpmProjectionSearchView.get` (строки 784–805) сразу после проверки сериализатора (строки 789–791).
- Создать тест: `apps/api/plane/tests/contract/ppm_canvas/test_page_search_api.py`.

**Интерфейс (контракт для B — совпадает с тем, что уже заложено в plan-B, Task B3)**

`GET /api/ppm/v1/workspaces/<workspace_id:uuid>/projects/<project_id:uuid>/projections/search/?types=page&q=&limit=&cursor=`

- Существующий маршрут поиска Холста (`ppm_canvas/urls.py:123-127`) получает второй тип: `types=page`. Без `types` и при
  `types=work_item` — прежнее поведение (поиск задач). Смешивать типы нельзя (`types=page,work_item` → 400).
- `q` ≤ 160 символов (пусто — все видимые), ищется в названии и тексте (`name`/`description_stripped`, без учёта регистра;
  кириллица проверена тестом на PostgreSQL 15.7-alpine); `limit` 1–50 (по умолчанию 20); `cursor` — смещение.
- Порядок: при `q` — сначала совпадения в названии, затем `-updated_at, -id`; без `q` — `-updated_at, -id`.
- Элемент результата — **та же проекция содержимого**, что возвращает привязка (`serialize_content_source`,
  `ppm_canvas/services.py:697-771`; клиентская схема `ppmCanvasContentProjectionSchema`,
  `packages/ppm-canvas/src/index.ts:722-745`, не strict — лишние ключи допустимы) **плюс блок `page`**:

```jsonc
{
  "results": [
    {
      "identity": { "entity_type": "page", "entity_id": "uuid", "workspace_id": "uuid", "project_id": "uuid",
                    "source_url": "/<workspace_slug>/projects/<project_id>/pages/<page_id>" },
      "display": { "title": "Регламент планёрки", "excerpt": "Каждый вторник", "extension": ".page",
                   "mime_type": "text/html", "size_bytes": 27, "preview_url": null, "source_status": "active" },
      "capabilities": { "read": true, "update": true, "delete_source": false },
      "source_version": "2026-09-25T12:00:00.123456+00:00",
      "page": {
        "updated_at": "2026-09-25T12:00:00.123456+00:00",
        "owned_by": { "id": "uuid", "display_name": "Борис" },
        "access": "public"            // "private" бывает только у собственных документов пользователя
      }
    }
  ],
  "next_cursor": "20"                 // или null
}
```

  Поля из постановки: id → `identity.entity_id`, название → `display.title` («Без названия», если пусто), фрагмент →
  `display.excerpt` (≤ 500 символов, как у карточки документа), дата → `page.updated_at`, автор → `page.owned_by.display_name`.
- Ошибки: `400 PROJECTION_SEARCH_INVALID` (`details` — ошибки полей), `401 AUTHENTICATION_REQUIRED`,
  `403 CANVAS_PERMISSION_DENIED`, `404 PROJECT_NOT_FOUND`.
- Вставка найденного документа на доску — существующим `POST …/canvas/boards/<board_id>/bindings/` с
  `entity_type: "page"` (`create_content_binding`), который повторно проверяет приватность в `get_content_source`
  (`ppm_canvas/services.py:639-657`).

**Правила видимости** (как `ProjectPagePermission`, `apps/api/plane/app/permissions/page.py:42-67`, и
`get_content_source(PAGE)`): активная связь `ProjectPage` именно с этим проектом (`deleted_at IS NULL`), документ не удалён
мягко (`Page.objects`), не в архиве (`archived_at IS NULL`), и `access = public` **или** `owned_by = пользователь`. Доступ к
проекту — `require_project_access` Холста (участник любой роли, включая гостя: Plane разрешает гостям GET публичных
документов, `page.py:113-117`). Чужие приватные документы не видны никому, включая глобального администратора (как в Plane:
`_has_private_page_action_access` → `False`, `page.py:97-102`).

**Почему расширение `projections/search/`, а не отдельный маршрут:** CONTRACTS §5 называет этот вариант первым, plan-B
(Task B3, `searchPages`) уже вызывает `…/projections/search/` с `types: "page"` и разбирает ответ схемой проекций
содержимого, а при несовпадении схемы молча уходит на запасной путь (список Plane с фильтром на клиенте). Совпадение
контракта убирает этот скрытый обход. Существующий поиск задач не меняется (регрессия `test_projection_api.py` — 20 тестов).

- [ ] **S2.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
  apps/api/plane/ppm_canvas/services.py apps/api/plane/ppm_canvas/serializers.py \
  apps/api/plane/ppm_canvas/views.py apps/api/plane/tests/contract/ppm_canvas/test_page_search_api.py
```

- [ ] **S2.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_canvas/test_page_search_api.py`:

```python
import uuid

import pytest
from django.utils import timezone
from rest_framework import status

from plane.db.models import Page, ProjectPage
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]


def make_user(display_name=""):
    marker = uuid.uuid4().hex
    user = UserFactory(username=f"pages-{marker}", email=f"pages-{marker}@plane.test")
    if display_name:
        user.display_name = display_name
        user.save(update_fields=["display_name"])
    return user


@pytest.fixture
def pages_project():
    owner = make_user("Анна")
    colleague = make_user("Борис")
    workspace = WorkspaceFactory(owner=owner)
    project = ProjectFactory(workspace=workspace, identifier="PGS")
    for member in (owner, colleague):
        WorkspaceMemberFactory(workspace=workspace, member=member, role=15)
        ProjectMemberFactory(workspace=workspace, project=project, member=member, role=15)
    return owner, colleague, workspace, project


def make_page(workspace, project, owner, name, *, access=Page.PUBLIC_ACCESS, html="<p>Текст</p>"):
    page = Page.objects.create(
        workspace=workspace,
        name=name,
        description_html=html,
        owned_by=owner,
        access=access,
    )
    ProjectPage.objects.create(workspace=workspace, project=project, page=page)
    return page


def search_pages(api_client, workspace, project, **params):
    return api_client.get(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/projections/search/",
        {"types": "page", **params},
    )


def result_ids(response):
    return [item["identity"]["entity_id"] for item in response.data["results"]]


def test_page_search_returns_only_pages_visible_to_the_user(api_client, pages_project):
    owner, colleague, workspace, project = pages_project
    public = make_page(workspace, project, colleague, "Регламент планёрки", html="<p>Каждый вторник</p>")
    own_private = make_page(workspace, project, owner, "Мои заметки", access=Page.PRIVATE_ACCESS)
    foreign_private = make_page(workspace, project, colleague, "Личное Бориса", access=Page.PRIVATE_ACCESS)
    archived = make_page(workspace, project, owner, "Старый план")
    archived.archived_at = timezone.now().date()
    archived.save(update_fields=["archived_at"])
    deleted = make_page(workspace, project, owner, "Удалённый")
    deleted.deleted_at = timezone.now()
    deleted.save(update_fields=["deleted_at"])
    unlinked = make_page(workspace, project, owner, "Отвязанный")
    ProjectPage.objects.filter(page=unlinked).delete()
    other_project = ProjectFactory(workspace=workspace, identifier="PGS2")
    ProjectMemberFactory(workspace=workspace, project=other_project, member=owner, role=15)
    elsewhere = make_page(workspace, other_project, owner, "Чужой проект")
    api_client.force_authenticate(user=owner)

    response = search_pages(api_client, workspace, project)

    assert response.status_code == status.HTTP_200_OK
    assert set(result_ids(response)) == {str(public.id), str(own_private.id)}
    for hidden in (foreign_private, archived, deleted, unlinked, elsewhere):
        assert str(hidden.id) not in result_ids(response)
    item = next(result for result in response.data["results"] if result["identity"]["entity_id"] == str(public.id))
    assert item["identity"] == {
        "entity_type": "page",
        "entity_id": str(public.id),
        "workspace_id": str(workspace.id),
        "project_id": str(project.id),
        "source_url": f"/{workspace.slug}/projects/{project.id}/pages/{public.id}",
    }
    assert item["display"]["title"] == "Регламент планёрки"
    assert item["display"]["excerpt"] == "Каждый вторник"
    assert item["display"]["source_status"] == "active"
    assert item["source_version"] == public.updated_at.isoformat()
    assert item["page"] == {
        "updated_at": public.updated_at.isoformat(),
        "owned_by": {"id": str(colleague.id), "display_name": "Борис"},
        "access": "public",
    }
    assert "Личное Бориса" not in str(response.data)


def test_page_search_filters_ranks_by_title_and_paginates(api_client, pages_project):
    owner, _, workspace, project = pages_project
    body_match = make_page(workspace, project, owner, "Протокол", html="<p>Итог: карта проекта готова</p>")
    title_match = make_page(workspace, project, owner, "Карта проекта")
    make_page(workspace, project, owner, "Бюджет")
    api_client.force_authenticate(user=owner)

    first = search_pages(api_client, workspace, project, q="карта", limit=1)
    second = search_pages(api_client, workspace, project, q="карта", limit=1, cursor=first.data["next_cursor"])
    mixed = api_client.get(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/projections/search/",
        {"types": "page,work_item"},
    )
    too_many = search_pages(api_client, workspace, project, limit=500)

    assert result_ids(first) == [str(title_match.id)]
    assert first.data["next_cursor"] == "1"
    assert result_ids(second) == [str(body_match.id)]
    assert second.data["next_cursor"] is None
    assert mixed.status_code == status.HTTP_400_BAD_REQUEST
    assert mixed.data["error"]["code"] == "PROJECTION_SEARCH_INVALID"
    assert too_many.status_code == status.HTTP_400_BAD_REQUEST


def test_page_search_requires_project_membership(api_client, pages_project):
    owner, _, workspace, project = pages_project
    make_page(workspace, project, owner, "Секретная стратегия")
    outsider = make_user()
    WorkspaceMemberFactory(workspace=workspace, member=outsider, role=15)
    guest = make_user()
    WorkspaceMemberFactory(workspace=workspace, member=guest, role=5)
    ProjectMemberFactory(workspace=workspace, project=project, member=guest, role=5)

    api_client.force_authenticate(user=outsider)
    denied = search_pages(api_client, workspace, project)
    api_client.force_authenticate(user=guest)
    guest_view = search_pages(api_client, workspace, project)

    assert denied.status_code == status.HTTP_403_FORBIDDEN
    assert denied.data["error"]["code"] == "CANVAS_PERMISSION_DENIED"
    assert "Секретная стратегия" not in str(denied.data)
    assert guest_view.status_code == status.HTTP_200_OK
    assert [item["display"]["title"] for item in guest_view.data["results"]] == ["Секретная стратегия"]
    assert guest_view.data["results"][0]["capabilities"]["update"] is False
```

- [ ] **S2.3 Тест красный.** `PYTEST plane/tests/contract/ppm_canvas/test_page_search_api.py` → `3 failed`
  (сейчас `types=page` отвергается сериализатором: `400 PROJECTION_SEARCH_INVALID` вместо 200).

- [ ] **S2.4 `services.py` — импорт.** Было (строка 9):

```python
from django.db.models import Count, F, Max, Q
```

Стало:

```python
from django.db.models import Case, Count, F, IntegerField, Max, Q, Value, When
```

- [ ] **S2.5 `services.py` — функции.** Было (строки 621–625):

```python
        "source_version": binding.source_version,
    }


def _content_source_url(*, project, entity_type, entity_id):
```

Стало:

```python
        "source_version": binding.source_version,
    }


def search_project_pages(*, project, user, query, cursor, limit):
    """Pages the user may open from this project: public ones plus the user's own private ones."""
    queryset = (
        Page.objects.filter(
            workspace_id=project.workspace_id,
            archived_at__isnull=True,
            project_pages__project_id=project.id,
            project_pages__workspace_id=project.workspace_id,
            project_pages__deleted_at__isnull=True,
        )
        .filter(Q(access=Page.PUBLIC_ACCESS) | Q(owned_by_id=user.id))
        .select_related("owned_by")
    )
    ordering = ["-updated_at", "-id"]
    if query:
        queryset = queryset.filter(Q(name__icontains=query) | Q(description_stripped__icontains=query)).annotate(
            name_rank=Case(When(name__icontains=query, then=Value(0)), default=Value(1), output_field=IntegerField())
        )
        ordering.insert(0, "name_rank")
    page = list(queryset.order_by(*ordering)[cursor : cursor + limit + 1])
    has_more = len(page) > limit
    return page[:limit], str(cursor + limit) if has_more else None


def serialize_page_search_result(*, page, project, access):
    owner = page.owned_by
    return {
        **serialize_content_source(source=page, entity_type=PpmCanvasEntityType.PAGE, project=project, access=access),
        "page": {
            "updated_at": page.updated_at.isoformat(),
            "owned_by": {
                "id": str(page.owned_by_id),
                "display_name": (owner.display_name or owner.first_name or "") if owner else "",
            },
            "access": "private" if page.access == Page.PRIVATE_ACCESS else "public",
        },
    }


def _content_source_url(*, project, entity_type, entity_id):
```

(`serialize_content_source` объявлена ниже в том же модуле — вызывается во время выполнения, это корректно. Дубликатов
строк нет без `distinct()`: активная связь проект–документ уникальна — `project_page_unique_project_page_when_deleted_at_null`,
`apps/api/plane/db/models/page.py:142-147`; условия по `project_pages__*` стоят в одном `filter()` и относятся к одной
строке связи.)

- [ ] **S2.6 `serializers.py` — второй тип поиска.** Было (строки 150–154):

```python
    def validate_types(self, value):
        entity_types = {item.strip() for item in value.split(",") if item.strip()}
        if entity_types != {PpmCanvasEntityType.WORK_ITEM}:
            raise serializers.ValidationError("Only work_item projections are available in this release.")
        return [PpmCanvasEntityType.WORK_ITEM]
```

Стало:

```python
    def validate_types(self, value):
        entity_types = {item.strip() for item in value.split(",") if item.strip()}
        if entity_types == {PpmCanvasEntityType.PAGE}:
            return [PpmCanvasEntityType.PAGE]
        if entity_types != {PpmCanvasEntityType.WORK_ITEM}:
            raise serializers.ValidationError("Search one projection type per request: work_item or page.")
        return [PpmCanvasEntityType.WORK_ITEM]
```

(DRF вызывает `validate_types` и для значения по умолчанию, поэтому `validated_data["types"]` — всегда список.)

- [ ] **S2.7 `views.py` — импорты.** Было (строки 78–79): `    save_canvas_snapshot,` / `    search_work_items,` →
  вставить между ними `    search_project_pages,`. Было (строки 83–84): `    serialize_git_source,` /
  `    serialize_semantic_edge,` → вставить между ними `    serialize_page_search_result,`.
  (`PpmCanvasEntityType` уже импортирован, `views.py:25`.)

- [ ] **S2.8 `views.py` — ветка `types=page`.** Было (строки 789–792):

```python
        serializer = PpmProjectionSearchSerializer(data=request.query_params)
        if not serializer.is_valid():
            return self.invalid_payload(request, serializer, code="PROJECTION_SEARCH_INVALID")
        work_items, next_cursor = search_work_items(
```

Стало:

```python
        serializer = PpmProjectionSearchSerializer(data=request.query_params)
        if not serializer.is_valid():
            return self.invalid_payload(request, serializer, code="PROJECTION_SEARCH_INVALID")
        if serializer.validated_data["types"] == [PpmCanvasEntityType.PAGE]:
            pages, next_cursor = search_project_pages(
                project=project,
                user=request.user,
                query=serializer.validated_data["q"],
                cursor=serializer.validated_data["cursor"],
                limit=serializer.validated_data["limit"],
            )
            return Response(
                {
                    "results": [
                        serialize_page_search_result(page=page, project=project, access=access) for page in pages
                    ],
                    "next_cursor": next_cursor,
                },
                status=status.HTTP_200_OK,
            )
        work_items, next_cursor = search_work_items(
```

- [ ] **S2.9 Тест зелёный.** `PYTEST plane/tests/contract/ppm_canvas/test_page_search_api.py` → `3 passed`.
- [ ] **S2.10 Регрессия.** `PYTEST plane/tests/contract/ppm_canvas` → `102 passed` (в т. ч. 20 тестов
  `test_projection_api.py` на поиск задач).
- [ ] **S2.11 Линт.** `RUFF plane/ppm_canvas/services.py plane/ppm_canvas/serializers.py plane/ppm_canvas/views.py plane/tests/contract/ppm_canvas/test_page_search_api.py`
  → `All checks passed!`, `4 files already formatted`.

**Приёмка S2**
- [ ] Видны: публичные документы проекта и собственные приватные. Не видны: чужие приватные, архивные, мягко удалённые,
  отвязанные от проекта, документы другого проекта (тест проверяет каждый случай).
- [ ] Элемент — проекция содержимого `page` (разбирается `ppmCanvasContentProjectionSchema`) + блок `page` с датой,
  автором и видимостью; поиск по названию и тексту, совпадения в названии — первыми; пагинация `next_cursor`.
- [ ] Не участник проекта — 403 без утечки названий; гость — видит публичные, `capabilities.update = false`.
- [ ] Поиск задач (`types` по умолчанию / `work_item`) не изменился; смешанные типы — 400; регрессия `102 passed`;
  `ruff` чистый.

---

## Задача S3 — вставка файлов: имена, конфликты, GIF, код, лимит (≈35 мин)

**Решения S3**

| Вопрос | Решение | Обоснование |
|---|---|---|
| Имя от клиента | Уже работает: имя берётся из имени части multipart (`_uploaded_file_metadata` → `validate_entry_name`, `ppm_vault/services.py:110-111`; Django оставляет только базовое имя). Отдельное поле `name` не добавляем. | B передаёт `new File([blob], "Вставка-2026-09-25-153012.png", { type })` в существующий `uploadFile` (`ppm-vault.service.ts:172-184`). Тест закрепляет кириллицу и регистр. |
| 409 при дубле | Уже детерминирован: частичный уникальный индекс `ppm_vault_unique_active_name` (`ppm_vault/models.py:122-126`) → `IntegrityError` → `409 VAULT_NAME_CONFLICT` (`services.py:202-204`). Добавляем **предпроверку до записи объекта** (не пишем 5 МиБ впустую) и `details: {name, suggested_name}` — первое свободное «Имя (n).ext», n = 2…999, сравнение как у индекса (`normalize_name`: регистр, пробелы). Гонка двух одновременных загрузок по-прежнему даёт 409 от индекса (без `suggested_name`). | Несколько картинок, вставленных в одну секунду, получают одинаковое имя — B делает один повтор с `suggested_name`, без цикла угадываний. |
| GIF | Разрешить: сигнатура `GIF87a`/`GIF89a`, kind `image`, MIME `image/gif`. | Растровый формат без активного содержимого (SVG по-прежнему запрещён — тест `test_active_svg_and_mismatched_image_are_rejected`); отдаётся как остальные картинки: `inline` + `Content-Security-Policy: default-src 'none'; sandbox` + `nosniff` (`views.py:336-341`); сервер GIF не декодирует. AVIF/HEIC/TIFF/BMP — не добавляем (редки в буфере, TIFF не показывают браузеры). |
| Лимит | Оставить 5 МиБ (`FILE_SIZE_LIMIT`, `settings/common.py:489`; `_binary_limit`, `services.py:129-134`), в ответ `VAULT_FILE_TOO_LARGE` добавить `details: {size_bytes, limit_bytes}`. | Прокси режет тело запроса тем же `FILE_SIZE_LIMIT` (`apps/proxy/Caddyfile.ce:2-3`, `Caddyfile.aio.ce:2-3`): поднять лимит только в Django бесполезно за прокси и развело бы dev (:8000 напрямую) и prod. Подъём `FILE_SIZE_LIMIT` меняет все загрузки Plane и поверхность DoS — решение оператора (одна переменная окружения двигает прокси и Django вместе, код менять не нужно). Типичный скриншот 1–4 МБ укладывается; для большего B показывает понятную ошибку с лимитом из `details`. |
| Код | Принимать исходный код и конфиги (`CODE_TEXT_EXTENSIONS` из S1) как `file` с MIME `text/plain`, только валидный UTF-8 (BOM допускается) без NUL; HTML/XML/SVG/XHTML не принимаются. Файл больше лимита не декодируется (сначала отказ по размеру). | Критерий приёмки 4 требует просмотр и «Скачать» для кода, а сейчас Хранилище код не принимает. `text/plain` + `attachment` + CSP sandbox + `nosniff` исключают исполнение в нашем источнике; разметка, которую браузер мог бы отрисовать, не принимается вовсе. Существующие txt/csv/json остаются без проверки кодировки (не ломаем CSV в cp1251). |

**Интерфейс (контракт для B)** — `POST /api/ppm/v1/workspaces/<workspace_id>/projects/<project_id>/vault/files/`
(multipart: `file`, необязательный `parent_id`), без изменений формы успешного ответа (`201`, `serialize_entry`). Новое:

```jsonc
// 409 — имя занято в этой папке (без учёта регистра и лишних пробелов)
{ "error": { "code": "VAULT_NAME_CONFLICT", "message": "Материал с таким именем уже существует.", "request_id": "…",
  "details": { "name": "Вставка-2026-09-25-153012.png", "suggested_name": "Вставка-2026-09-25-153012 (2).png" } } }
// suggested_name = null, если свободного варианта нет (n > 999 или имя длиннее 255)
// 400 — больше лимита
{ "error": { "code": "VAULT_FILE_TOO_LARGE", "message": "Файл пустой или превышает допустимый размер.", "request_id": "…",
  "details": { "size_bytes": 7340032, "limit_bytes": 5242880 } } }
// 400 — формат: VAULT_INVALID_FILE_TYPE (SVG, неверная сигнатура картинки, код не в UTF-8/с NUL, html/xml, аудио/видео)
```

Расширение имени должно соответствовать содержимому (сервер проверяет сигнатуру по расширению): B берёт расширение из
MIME блоба (`image/png` → `png`, `image/jpeg` → `jpg`, `image/webp` → `webp`, `image/gif` → `gif`).

**Файлы**
- Изменить: `apps/api/plane/ppm_vault/services.py` — импорты (строки 1–3, 19), `IMAGE_SIGNATURES` (строки 23–28),
  `_uploaded_file_metadata` (строки 110–126) + три новые функции перед `_binary_limit` (строка 129),
  `create_uploaded_file` (строки 148–150), `replace_uploaded_file` (строки 219–221).
- Создать тест: `apps/api/plane/tests/contract/ppm_vault/test_vault_paste_api.py`.

- [ ] **S3.1 Пред-образы.**

```bash
/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh \
  apps/api/plane/ppm_vault/services.py apps/api/plane/tests/contract/ppm_vault/test_vault_paste_api.py
```

- [ ] **S3.2 Падающий тест.** Создать `apps/api/plane/tests/contract/ppm_vault/test_vault_paste_api.py`:

```python
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from plane.ppm_vault.models import PpmVaultEntry
from plane.tests.factories import (
    ProjectFactory,
    ProjectMemberFactory,
    UserFactory,
    WorkspaceFactory,
    WorkspaceMemberFactory,
)


pytestmark = [pytest.mark.contract, pytest.mark.django_db]

PNG = b"\x89PNG\r\n\x1a\n" + b"pasted-screenshot"
GIF = b"GIF89a" + b"\x01\x00\x01\x00\x00\x00\x00;"


def make_user():
    marker = uuid.uuid4().hex
    return UserFactory(username=f"paste-{marker}", email=f"paste-{marker}@plane.test")


@pytest.fixture
def vault_project(settings, tmp_path):
    settings.PPM_LOCAL_ASSET_UPLOADS = True
    settings.PPM_VAULT_STORAGE_ROOT = str(tmp_path / "private-vault")
    user = make_user()
    workspace = WorkspaceFactory(owner=user)
    WorkspaceMemberFactory(workspace=workspace, member=user, role=20)
    project = ProjectFactory(workspace=workspace, identifier="PST")
    ProjectMemberFactory(workspace=workspace, project=project, member=user, role=20)
    return user, workspace, project


def upload(api_client, workspace, project, name, payload, content_type="application/octet-stream"):
    return api_client.post(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/vault/files/",
        {"file": SimpleUploadedFile(name, payload, content_type=content_type)},
        format="multipart",
    )


def test_pasted_image_keeps_client_name_and_duplicate_gets_deterministic_conflict(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)

    created = upload(api_client, workspace, project, "Вставка-2026-09-25-153012.png", PNG, "image/png")
    duplicate = upload(api_client, workspace, project, "вставка-2026-09-25-153012.PNG", PNG, "image/png")
    retried = upload(
        api_client,
        workspace,
        project,
        duplicate.data["error"]["details"]["suggested_name"],
        PNG,
        "image/png",
    )
    second_duplicate = upload(api_client, workspace, project, "Вставка-2026-09-25-153012.png", PNG, "image/png")

    assert created.status_code == status.HTTP_201_CREATED
    assert created.data["name"] == "Вставка-2026-09-25-153012.png"
    assert created.data["kind"] == "image"
    assert duplicate.status_code == status.HTTP_409_CONFLICT
    assert duplicate.data["error"]["code"] == "VAULT_NAME_CONFLICT"
    assert duplicate.data["error"]["details"] == {
        "name": "вставка-2026-09-25-153012.PNG",
        "suggested_name": "вставка-2026-09-25-153012 (2).PNG",
    }
    assert retried.status_code == status.HTTP_201_CREATED
    assert second_duplicate.data["error"]["details"]["suggested_name"] == "Вставка-2026-09-25-153012 (3).png"
    assert PpmVaultEntry.objects.filter(project_id=project.id, kind="image").count() == 2


def test_gif_is_accepted_only_with_gif_signature(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)

    gif = upload(api_client, workspace, project, "анимация.gif", GIF, "image/gif")
    fake = upload(api_client, workspace, project, "fake.gif", PNG, "image/gif")
    served = api_client.get(
        f"/api/ppm/v1/workspaces/{workspace.id}/projects/{project.id}/vault/entries/{gif.data['id']}/file/"
    )

    assert gif.status_code == status.HTTP_201_CREATED
    assert gif.data["kind"] == "image"
    assert gif.data["mime_type"] == "image/gif"
    assert served["Content-Type"] == "image/gif"
    assert served["Content-Security-Policy"] == "default-src 'none'; sandbox"
    assert fake.status_code == status.HTTP_400_BAD_REQUEST
    assert fake.data["error"]["code"] == "VAULT_INVALID_FILE_TYPE"


def test_code_files_are_stored_as_utf8_plain_text(api_client, vault_project):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)

    script = upload(api_client, workspace, project, "robot.py", "print('Привет')\n".encode("utf-8"))
    binary = upload(api_client, workspace, project, "tool.py", b"\x00\x01\x02ELF")
    legacy = upload(api_client, workspace, project, "old.js", "var s = 'Привет';".encode("cp1251"))
    markup = upload(api_client, workspace, project, "page.html", b"<script>alert(1)</script>")

    assert script.status_code == status.HTTP_201_CREATED
    assert script.data["kind"] == "file"
    assert script.data["mime_type"] == "text/plain"
    assert script.data["extension"] == "py"
    assert [binary.status_code, legacy.status_code, markup.status_code] == [400, 400, 400]
    assert {binary.data["error"]["code"], legacy.data["error"]["code"], markup.data["error"]["code"]} == {
        "VAULT_INVALID_FILE_TYPE"
    }


def test_image_limit_stays_at_file_size_limit_and_reports_it(api_client, vault_project, settings):
    user, workspace, project = vault_project
    api_client.force_authenticate(user=user)
    settings.FILE_SIZE_LIMIT = 32

    oversized = upload(api_client, workspace, project, "big.png", PNG + b"x" * 64, "image/png")

    assert oversized.status_code == status.HTTP_400_BAD_REQUEST
    assert oversized.data["error"]["code"] == "VAULT_FILE_TOO_LARGE"
    assert oversized.data["error"]["details"] == {"size_bytes": len(PNG) + 64, "limit_bytes": 32}
    assert not PpmVaultEntry.objects.filter(project_id=project.id, kind="image").exists()
```

- [ ] **S3.3 Тест красный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_paste_api.py` → `4 failed`
  (нет `details.suggested_name`; GIF и `.py` отклоняются с 400; у `VAULT_FILE_TOO_LARGE` пустые `details`).

- [ ] **S3.4 Импорты.** Было (строки 1–3): `import hashlib` / `import re` / `import uuid` → добавить первой строкой
  `import codecs`. Было (строка 19): `from .storage import copy_private_object, delete_private_object, put_private_object`
  → добавить строкой выше `from .formats import CODE_TEXT_EXTENSIONS`.

- [ ] **S3.5 GIF.** Было (строки 27–28):

```python
    "webp": ("image/webp", lambda header: header.startswith(b"RIFF") and header[8:12] == b"WEBP"),
}
```

Стало:

```python
    "webp": ("image/webp", lambda header: header.startswith(b"RIFF") and header[8:12] == b"WEBP"),
    "gif": ("image/gif", lambda header: header.startswith((b"GIF87a", b"GIF89a"))),
}
```

- [ ] **S3.6 Код и проверка имени.** Было (строки 121–129):

```python
    if extension in REFERENCE_MIME_TYPES:
        return name, extension, PpmVaultEntryKind.FILE, REFERENCE_MIME_TYPES[extension]
    raise PpmVaultConflict(
        code="VAULT_INVALID_FILE_TYPE",
        message="Разрешены PDF, PNG, JPEG, WebP и безопасные офисные или текстовые файлы.",
    )


def _binary_limit(kind):
```

Стало:

```python
    if extension in REFERENCE_MIME_TYPES:
        return name, extension, PpmVaultEntryKind.FILE, REFERENCE_MIME_TYPES[extension]
    if extension in CODE_TEXT_EXTENSIONS:
        _require_utf8_text(uploaded_file)
        return name, extension, PpmVaultEntryKind.FILE, "text/plain"
    raise PpmVaultConflict(
        code="VAULT_INVALID_FILE_TYPE",
        message="Разрешены PDF, PNG, JPEG, WebP, GIF, офисные и текстовые файлы, исходный код.",
    )


def _require_utf8_text(uploaded_file):
    if int(getattr(uploaded_file, "size", 0) or 0) > _binary_limit(PpmVaultEntryKind.FILE):
        return  # the caller rejects the size; oversized input is never decoded
    decoder = codecs.getincrementaldecoder("utf-8-sig")("strict")
    try:
        for chunk in uploaded_file.chunks():
            if b"\x00" in chunk:
                raise ValueError("NUL byte in a text file")
            decoder.decode(chunk)
        decoder.decode(b"", final=True)
    except ValueError as exc:  # UnicodeDecodeError is a ValueError
        raise PpmVaultConflict(
            code="VAULT_INVALID_FILE_TYPE",
            message="Файл с кодом должен быть текстом в кодировке UTF-8.",
        ) from exc
    finally:
        uploaded_file.seek(0)


def _suggest_free_name(*, vault, parent, name):
    stem, dot, extension = name.rpartition(".")
    if not dot or not stem:
        stem, extension = name, ""
    suffix = f".{extension}" if extension else ""
    taken = set(
        PpmVaultEntry.objects.filter(
            vault=vault,
            parent=parent,
            normalized_name__startswith=normalize_name(stem),
            status__in=[PpmVaultEntryStatus.ACTIVE, PpmVaultEntryStatus.QUARANTINED],
        ).values_list("normalized_name", flat=True)
    )
    for index in range(2, 1000):
        candidate = f"{stem} ({index}){suffix}"
        if len(candidate) > 255:
            return None
        if normalize_name(candidate) not in taken:
            return candidate
    return None


def _assert_name_available(*, vault, parent, name):
    taken = PpmVaultEntry.objects.filter(
        vault=vault,
        parent=parent,
        normalized_name=normalize_name(name),
        status__in=[PpmVaultEntryStatus.ACTIVE, PpmVaultEntryStatus.QUARANTINED],
    ).exists()
    if taken:
        raise PpmVaultConflict(
            code="VAULT_NAME_CONFLICT",
            message="Материал с таким именем уже существует.",
            details={"name": name, "suggested_name": _suggest_free_name(vault=vault, parent=parent, name=name)},
        )


def _binary_limit(kind):
```

- [ ] **S3.7 `create_uploaded_file`.** Было (строки 148–151):

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(code="VAULT_FILE_TOO_LARGE", message="Файл пустой или превышает допустимый размер.")
    if extension == "md":
```

Стало:

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(
            code="VAULT_FILE_TOO_LARGE",
            message="Файл пустой или превышает допустимый размер.",
            details={"size_bytes": size, "limit_bytes": _binary_limit(kind)},
        )
    _assert_name_available(vault=vault, parent=parent, name=name)
    if extension == "md":
```

- [ ] **S3.8 `replace_uploaded_file`.** Было (строки 219–222):

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(code="VAULT_FILE_TOO_LARGE", message="Файл пустой или превышает допустимый размер.")
    content_hash = _hash_uploaded_file(uploaded_file)
```

Стало:

```python
    size = int(getattr(uploaded_file, "size", 0) or 0)
    if size <= 0 or size > _binary_limit(kind):
        raise PpmVaultConflict(
            code="VAULT_FILE_TOO_LARGE",
            message="Файл пустой или превышает допустимый размер.",
            details={"size_bytes": size, "limit_bytes": _binary_limit(kind)},
        )
    content_hash = _hash_uploaded_file(uploaded_file)
```

(Первые три строки блоков S3.7 и S3.8 одинаковы; различает их последняя строка: `if extension == "md":` —
`create_uploaded_file`, `content_hash = _hash_uploaded_file(uploaded_file)` — `replace_uploaded_file`.)

- [ ] **S3.9 Тест зелёный.** `PYTEST plane/tests/contract/ppm_vault/test_vault_paste_api.py` → `4 passed`.
- [ ] **S3.10 Регрессия.** `PYTEST plane/tests/contract/ppm_vault plane/tests/contract/ppm_canvas` → `136 passed`
  (ppm_vault 19 + 11 + 4 = 34, ppm_canvas 102).
- [ ] **S3.11 Линт.** `RUFF plane/ppm_vault/services.py plane/tests/contract/ppm_vault/test_vault_paste_api.py`
  → `All checks passed!`, `2 files already formatted`.

**Приёмка S3**
- [ ] Имя вставленного файла от клиента сохраняется как есть (кириллица, регистр); дубль — `409 VAULT_NAME_CONFLICT` с
  `suggested_name`, повтор с ним — `201`; следующий дубль предлагает `(3)`.
- [ ] Предпроверка имени стоит до записи объекта в хранилище; гонка по-прежнему закрыта индексом.
- [ ] GIF принимается только с сигнатурой GIF и отдаётся с `image/gif` + CSP sandbox; SVG и подделки — 400.
- [ ] `.py` в UTF-8 — `201`, `text/plain`; NUL/cp1251/`.html` — 400 `VAULT_INVALID_FILE_TYPE`.
- [ ] Лимит 5 МиБ не изменён; `VAULT_FILE_TOO_LARGE` отдаёт `size_bytes`/`limit_bytes`.
- [ ] Регрессия `136 passed`, `ruff` чистый.

---

## S4 — аудио и видео: вне AF2.1 (обоснование)

Спецификация допускает аудио/видео, только «если сервер примет форматы и отдаст файл с поддержкой диапазонов». В AF2.1
это не делаем:
1. **Нет Range в локальном хранилище.** `/file/` отдаёт `FileResponse` без поддержки `Range`
   (`ppm_vault/views.py:333-342`; `django.http.FileResponse` диапазоны не обрабатывает). Safari не воспроизводит видео без
   `206 Partial Content`, Chrome не перематывает. Нужен собственный ответ с диапазонами (`bytes=a-b`, суффиксы,
   несколько диапазонов → 416/одиночный, `If-Range`, `Accept-Ranges`) и отдельное ревью безопасности. В режиме S3/MinIO
   диапазоны уже работают через подписанную ссылку (`ppm_vault/storage.py:57-65`, 300 с), то есть работа нужна только
   для локального режима, но именно он используется в dev и тестах.
2. **Лимит 5 МиБ за прокси** (см. S3): 5 МиБ видео — 10–40 секунд; без подъёма `FILE_SIZE_LIMIT` (решение оператора)
   ценность близка к нулю.
3. **Сигнатуры и полиглоты.** mp4/mov/m4a (ISO BMFF `ftyp` + белый список брендов), webm (EBML), mp3 (ID3/синхрослово),
   wav (`RIFF…WAVE`), ogg (`OggS`) проверяются легко, но медиапарсеры браузеров — частый источник уязвимостей, а отдача
   `inline` с нашего источника требует тех же sandbox-заголовков и отдельной проверки.

**Итог:** аудио/видео в AF2.1 не принимаются (сервер отвечает `400 VAULT_INVALID_FILE_TYPE`, B показывает «Формат не
поддерживается Хранилищем»). Предлагаемая отдельная задача после AF2.1: «Аудио и видео в Хранилище» — сигнатуры с белым
списком брендов, ответ с диапазонами для локального хранилища + тесты (`206`, `416`, суффикс, `If-Range`), решение
владельца о `FILE_SIZE_LIMIT`, карточка с `<audio>/<video>` в B.

---

## Review Focus (безопасность) — на что смотреть ревьюеру

1. **Права.** Предпросмотр использует ровно `require_access` + `get_entry`, как `/file/` (тест: гость 200, не участник 403,
   аноним 401, чужой проект 404, корзина 404). Поиск документов: чужие приватные не попадают в выдачу никогда (в т. ч.
   глобальному администратору), архивные/удалённые/отвязанные/из другого проекта исключены; нужен доступ к проекту.
   Идентификаторы (`entry_id`, `version`) добавляются к ответу после проверки прав, в кеше их нет.
2. **Zip-бомбы.** До распаковки — проверка центрального каталога (число элементов, сумма заявленных размеров, степень
   сжатия, бит шифрования); `zipfile` не распаковывает элемент больше заявленного `file_size` (чтение обрывается, CRC не
   сходится → `invalid`; тест `test_member_that_inflates_past_its_declared_size_is_rejected`); openpyxl получает архив
   только после проверки; `_read_member` читает не больше `cap + 1` байт. Исходник > 16 МиБ не читается вовсе.
3. **XML.** lxml: `resolve_entities=False, no_network=True, load_dtd=False, huge_tree=False` (тест XXE). openpyxl в образе
   парсит через lxml с `resolve_entities=False` (`openpyxl.xml.functions`) и потоково через `xml.etree.iterparse` на
   expat 2.6.3 (встроенная защита от «billion laughs» с expat 2.4); `defusedxml` в образе нет (проверено:
   `openpyxl.xml.DEFUSEDXML == False`) — новая зависимость не требуется.
4. **HTML.** Собирается только из экранированного текста (`html.escape`), затем `nh3.clean(tags=allowlist,
   attributes={"*": set()}, url_schemes=set())` — без атрибутов, ссылок и картинок. B дополнительно пропускает через
   DOMPurify.
5. **Ничего не исполняется:** нет подпроцессов и макросов; `data_only=True` — только сохранённые значения формул;
   `keep_links=False`.
6. **Ресурсы.** Вход ≤ 16 МиБ в памяти, выход ≤ 400 000 символов, бюджет времени 5 с, TTL кеша 24 ч; в логах только
   `entry_id` и класс исключения, без содержимого.
7. **Кеш по хэшу содержимого** общий для записей с одинаковыми байтами — безопасно (ключ требует знания байтов); ключ
   включает лимиты и версию схемы.
8. **Загрузка.** GIF — по сигнатуре; код — UTF-8 без NUL, `text/plain`, отдаётся `attachment` + CSP sandbox; HTML/XML/SVG
   не принимаются; предпроверка имени — до записи в хранилище; `suggested_name` вычисляется только в пределах той же папки
   того же Хранилища (не раскрывает ничего вне прав пользователя, у которого и так есть право записи).
9. **Сознательно не сделано:** ограничение частоты запросов предпросмотра (нагрузка ограничена кешем и числом файлов,
   создавать файлы может только участник с правом записи) — кандидат в O0.1; жёсткое прерывание разбора (см. «Тайм-аут»);
   верхняя граница `cursor` у поиска Холста — существующее поведение `PpmProjectionSearchSerializer`
   (`ppm_canvas/serializers.py:147`, общее с поиском задач), линия S его не меняет.

---

## Итоговая проверка линии S

- [ ] `PYTEST plane/tests/contract/ppm_vault plane/tests/contract/ppm_canvas` → `136 passed`.
- [ ] `RUFF plane/ppm_vault/formats.py plane/ppm_vault/preview.py plane/ppm_vault/views.py plane/ppm_vault/urls.py plane/ppm_vault/services.py plane/ppm_canvas/services.py plane/ppm_canvas/serializers.py plane/ppm_canvas/views.py plane/tests/contract/ppm_vault/test_vault_preview_api.py plane/tests/contract/ppm_vault/test_vault_paste_api.py plane/tests/contract/ppm_canvas/test_page_search_api.py`
  → `All checks passed!`, `11 files already formatted`.
- [ ] `/Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-25-af21/tools/af21-diff.sh apps/api` показывает только
  11 файлов линии S: новые `ppm_vault/formats.py`, `ppm_vault/preview.py` и три тестовых файла; изменённые
  `ppm_vault/{views,urls,services}.py` и `ppm_canvas/{services,serializers,views}.py`.
- [ ] Дымовой `curl` из S1.12 даёт 401.
- [ ] `docker compose -p ppm-af21-s -f docker-compose-test.yml down -v` (если контроллер не просит оставить стек).
- [ ] Записи для CHANGELOG/отчёта: новый маршрут `…/vault/entries/<id>/preview/`; `types=page` в
  `…/projections/search/`; GIF и код в Хранилище; `suggested_name` и `details` лимита; аудио/видео — вне AF2.1.
