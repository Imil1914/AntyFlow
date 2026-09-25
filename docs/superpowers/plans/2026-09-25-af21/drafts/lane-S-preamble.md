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
