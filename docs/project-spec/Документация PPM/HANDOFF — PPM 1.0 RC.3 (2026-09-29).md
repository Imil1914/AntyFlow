---
type: handoff
project_id: intellect-ppm
created: 2026-09-29
status: current
---

# Передача дел — PPM 1.0 RC.3 (состояние на 2026-09-29, ~21:45 МСК)

Файл для агента, который продолжит работу. Здесь: что это за проект, что сделано за 2026-09-28…29 (RC.2 и RC.3),
где всё лежит, как собирать и проверять, какие правила обязательны и что осталось открытым. Подробности по каждой
задаче — в карточках-спецификациях, планах и журналах, ссылки ниже.

**Термины (важно не путать):**
- **Git** — система контроля версий на компьютерах разработчиков (`git clone/commit/push`); её никто не заменял.
- **Forgejo** — собственный Git-сервер владельца (аналог GitHub/GitLab, хранит репозитории, веб-интерфейс, PR,
  команды и доступы), работает рядом с PPM на `git.<домен>`. **Везде ниже «Git-сервер» = Forgejo.**
- **GitHub** — внешний сервис; интеграция PPM с ним (GitHub App, G1.x) сохранилась, но теперь не обязательна.
- **PPM** — сама система управления проектами (форк Plane); она не хранит код, а подключает Git-сервер и показывает
  коммиты и PR в разделе «Код», у задач и на Холсте.

---

## 1. Проект в двух словах

- **PPM** — система управления проектами на основе **Plane** (форк, лицензия AGPL-3.0) с Холстом (tldraw),
  Хранилищем документов, «Мозгом проекта» (поиск/RAG), разделом «Код» и **собственным Git-сервером Forgejo**.
  Интерфейс — по-русски. Владелец — не разработчик, говорит по-русски, делегирует («делай до конца»), решения
  принимает через вопросы с вариантами.
- **Репозитории:**
  - корневой — `/Users/ermolov/Desktop/PPM` (десктоп-приложение AntyFlow на Electron + вся документация PPM);
  - `plane-fork` — `/Users/ermolov/Desktop/PPM/plane-fork` (вложенный git-репозиторий, в корне закреплён как указатель):
    - `apps/api` — Django 5.2 + DRF + Celery + Channels;
    - `apps/web` — React Router + MobX + SWR;
    - `apps/admin` (`/god-mode`), `apps/space` (публикация), `apps/live` (Hocuspocus, совместное редактирование);
    - `packages/*`: `@ppm/brand` (строки en/ru), `@plane/editor` (Tiptap), `@ppm/canvas` и др.;
    - `deployments/ppm` — комплект развёртывания: Docker Compose, Caddy, bash-скрипты, `RUNBOOK.md`.
- **Ветка** в обоих репозиториях: `feat/i0.6-work-item-projections`. **Ничего не опубликовано (push не делался)** —
  публикация только с явного разрешения владельца.

---

## 2. Обязательные правила (нарушать нельзя)

1. **Без push и публикации** без явного «да» владельца. Коммиты — локальные.
2. **Коммиты в `plane-fork` — только через временный индекс.** Там husky/lint-staged: `GIT_INDEX_FILE=<tmp> git read-tree HEAD`
   → `git add -A -- <пути>` → `git write-tree` → `git commit-tree` → `git update-ref` → `git read-tree HEAD`.
   Никогда не `git add` (в т.ч. `-N`) в настоящий индекс `plane-fork`. Образцы скриптов —
   `.superpowers/sdd/2026-09-29-g22-sso/run/commit-w13.sh`, `…/2026-09-28-g21-forgejo/run/g21-commit-w5.sh`.
   В конце сообщения коммита — строка `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
3. **Не трогать и не коммитить** незакоммиченные файлы параллельной сессии владельца на Холсте:
   `apps/web/core/components/ppm-canvas/workspace.tsx`, `board-presence.tsx`, `canvas-v2.css` (шапка «вкладки-папки,
   вариант B»). Их исключают из всех коммитов (`':(exclude)…'`).
4. **Пароли и секреты:** никогда не вводить пароли, не печатать и не пересказывать в чат значения из файлов учёток
   и `.env`; тестовые учётки — только в git-игнорируемых файлах с правами 600.
5. **Окружение владельца неприкосновенно:**
   - dev-контейнеры `plane-fork-*`: `plane-fork-api-1` работает с `uvicorn --reload` на этом же дереве, поэтому новый
     код обязан импортироваться без новых библиотек и без применённых миграций;
   - dev-сервер web `:3000`;
   - стенд приёмки `ppm-accept` (п. 7) и ретранслятор `ppm-accept-lan-relay` — только осознанные действия по шагам
     RUNBOOK.

   Свои Docker-стеки — только с уникальным `-p <имя>` и `down -v` в конце.
6. **UI-строки — по-русски** (механизм `packages/ppm-brand`, английский интерфейс не ломать); горячие клавиши — через
   `e.code` (у владельца русская раскладка).
7. **Mac владельца — 16 ГБ памяти и небольшой диск** (ночью 29.09 диск кончился, днём сборка при ~8 ГБ повесила
   Docker; после перезапуска Docker вечером 29.09 — ~45 ГБ свободно). Перед сборкой образов проверяйте `df -h`.
   - Тяжёлые команды (полный vitest, tsc, docker-стеки тестов, сборки образов) — только через очередь:
     `bash /Users/ermolov/Desktop/PPM/docs/superpowers/plans/2026-09-28-g21-forgejo/tools/heavy.sh <команда>`.
   - Освобождать место безопасно так: `docker builder prune -f --filter until=24h`.
   - Каждый `docker compose -p X … run --build api-tests` оставляет образ `X-api-tests` — после работы удаляйте.
8. **Классификатор автоматического режима** отказал обновлению стенда одним скриптом; те же команды RUNBOOK по одной
   проходят.

---

## 3. Что сделано: история версий и коммиты

### plane-fork (ветка `feat/i0.6-work-item-projections`)

| Коммит | Метка | Что |
|---|---|---|
| `8267e0c290` | `ppm-1.0.0-rc.1` | RC.1 (2026-09-27) |
| `7299f0cd05` | | как поднять локальный стенд приёмки RC.1 |
| `4d015f7ba1` | | **G2.1 API** — провайдерный контракт `ppm_git/providers/base.py`, реестр, `ForgejoClient`, вебхук Forgejo, подключение репозиториев |
| `264fc32f0a` | | **G2.1 комплект** — Forgejo 15 rootless в `docker-compose.git.yml`, `ppm-env.sh add-git`, `ppm-deploy.sh git-bootstrap`/`git-admin`, бэкапы с Forgejo, RUNBOOK §17 |
| `43529bd05c` | | **G2.1 web** — «Наш Git-сервер» в разделе «Код», «Как скачать код» |
| `80d3aae3bb` | | **Просьбы владельца 2026-09-28** — вход (нет молчаливой регистрации), русский интерфейс (линия R), массовые действия (линия B), живые графики спринта (линия S), аватарки исполнителей на Холсте (линия C) |
| `a9db1a118a` | `ppm-1.0.0-rc.2` | исправления по сквозной проверке G2.1 |
| `54b552e583` | | ночные правки: дочистка русского (уведомления, заявки, настройки, редактор — линия R2), дата слияния PR «Слит 28 сент., 14:05» (M), правки по ревью W5 (F), инструкция стенда §6 |
| `a239dd4773` | | **G2.2 web** — возврат на Git-сервер после входа, «Код» для руководителя, вкладка «Git-сервер» в центре администратора |
| `f1e681e8e0` | | **G2.2 API** — PPM как OpenID Connect-провайдер (`plane/ppm_oidc`), движок доступов Forgejo (`ppm_git/forgejo_access.py`, `forgejo_admin.py`, миграция `ppm_git 0009`), API руководителя и статуса |
| `37aa4b5d65` | | **G2.2 комплект** (`add-sso`, оверлей `docker-compose.git-sso.yml`, `git-bootstrap` с единым входом, ротации) + **мониторинг** (`ppm-monitor.sh`, RUNBOOK §14) |
| `8aa211c1e8` | | **UX2.1** — изменения в реальном времени (`plane/ppm_realtime`, web `ppm-realtime/**`) |
| `b4c27c58d1` | | **G2.3** — «Вставить коммит/PR» и «Что сделано за период» (`ppm_git/work_summary.py`, web `ppm-git/insert/**`) |
| `2bc75e4bc3` | | исправления по сквозной проверке G2.2 + **«Отключить»/«Включить» пользователя** (`plane/ppm_core`, миграция `ppm_core 0001`) |
| `9648d7af2d` | `ppm-1.0.0-rc.3` | исправления по итоговой проверке RC.3 (живые доски, «Мои задачи», вставка в заметку в Chrome, русские статусы, флаг realtime в комплекте) |

После метки: `67d9a21753` — инструкция стенда для RC.3 (`ACCEPTANCE-LOCAL.md` §6–7) и тест проводки флага сборки
realtime. Рабочее дерево чистое, кроме файлов сессии владельца на Холсте и неотслеживаемых побайтных копий
`packages/i18n/{en,ru}` (мусор, можно удалить; в коммиты не брать).

### Корневой репозиторий

| Коммит | Метка | Что |
|---|---|---|
| `c1e6148` | `ppm-1.0.0-rc.1` | release notes, статусы, чек-лист приёмки RC.1 |
| `56a4e63` | | G2.1: спецификация, ADR «Forgejo», план |
| `96b755e` | `ppm-1.0.0-rc.2` | release notes RC.2, блок 9 чек-листа, G2.1 → review |
| `9e0e578` | `ppm-1.0.0-rc.3` | спецификации и планы G2.2 / UX2.1 / G2.3, release notes RC.3, блок 10 чек-листа, CHANGELOG; указатель на `9648d7af2d` |

---

## 4. Возможности по областям (что и где в коде)

### 4.1 Свой Git-сервер (G2.1) — Forgejo 15 рядом с PPM
- Forgejo 15 rootless, закреплён по digest (`PPM_FORGEJO_IMAGE` в `ppm-env.sh`), своя база в том же PostgreSQL,
  сайт `git.<домен>` за Caddy, SSH на порту 2222, закрытая регистрация, без исходящих запросов.
- В PPM:
  - провайдерный контракт `apps/api/plane/ppm_git/providers/{base,__init__,forgejo,github}.py`;
  - приёмник `POST /api/ppm/v1/git/forgejo/webhook/` (HMAC `X-Forgejo-Signature`);
  - сверка — Celery beat 15 мин;
  - подключение репозиториев: `…/git/providers/forgejo/repositories/`.
- web: `apps/web/core/components/ppm-git/**` (`route.tsx` — раздел «Код»), `apps/web/core/services/ppm-git.service.ts`.
- RUNBOOK §17 — люди, организации, команды, быстрый старт разработчика, бэкап и восстановление Forgejo.

### 4.2 Единый вход и доступы (G2.2) — карточка R1–R30, R15a
- **OIDC-провайдер** `apps/api/plane/ppm_oidc/**` (django-oauth-toolkit 3.4.1, jwcrypto 1.6.1, oauthlib 3.3.1):
  - точки: `/auth/oidc/{authorize,token,userinfo,jwks}/`, `/.well-known/openid-configuration`, внутренний discovery
    `/auth/oidc/internal/…` (снаружи — 404 в Caddy), `/auth/oidc/continue/<id>/` (возврат после входа);
  - клиент — команда `manage.py ppm_oidc_client --ensure|--disable|--status`;
  - защита: троттлинг только ошибок клиента, солёный HMAC-хешер секрета;
  - мягкая деградация без библиотеки.
- **Движок доступов** `apps/api/plane/ppm_git/{forgejo_access.py, forgejo_admin.py, signals.py, tasks.py}`, модели
  `PpmForgejoAccount/Organization/Team/SyncRun` (миграция `0009`):
  - учётка создаётся при первом «Войти через PPM» (`source_id` + `login_name` = UUID, без пароля);
  - **локальные учётки не перенимаются** — это решение по безопасности;
  - пространство → организация, проект → команды `<КЛЮЧ>-admin` / `<КЛЮЧ>` / `<КЛЮЧ>-read`;
  - отключение → `prohibit_login`;
  - события, хуки массовых записей, полная сверка раз в 10 мин (beat `ppm-git-forgejo-access-reconcile`);
  - защита чужих учёток (`admin_granted`, владелец токена).
- **API руководителя и статуса:**
  - права — `ppm_git/permissions.py` (`connect_git_server_repositories`);
  - представления и сервисы — `views.py`, `provider_services.py`, `forgejo_access_status.py`;
  - статус — `GET /api/ppm/v1/git/forgejo/access/status/`, `POST …/access/sync/` (429 `GIT_SYNC_RATE_LIMITED`).
- **web:**
  - `apps/web/helpers/ppm-oidc-return.helper.ts` (ровно одна форма `/auth/oidc/continue/<id>/`, навигация только для
    вошедшего);
  - `core/lib/wrappers/authentication-wrapper.tsx`;
  - «Код» (`ppm-git/**`);
  - центр администратора `apps/web/core/components/ppm-admin/**` — вкладки «Git-сервер» и «Пользователи».
- **«Отключить / Включить» пользователя (R15a):**
  - модель `PpmUserSuspension` и `suspension.py` в `apps/api/plane/ppm_core/**`;
  - страж `pre_save` на `User`: отключённого не включают ни вход, ни смена пароля, ни устаревшее сохранение профиля;
  - завершение сессий, отзыв токенов Git-сервера, сверка.
- **Комплект:**
  - `ppm-env.sh add-sso`, оверлей `deployments/ppm/docker-compose.git-sso.yml` (`ENABLE_AUTO_REGISTRATION=false`,
    `ACCOUNT_LINKING=disabled`, `USERNAME=nickname`, `LANDING_PAGE=login`, `ENABLE_INTERNAL_SIGNIN=$PPM_GIT_LOCAL_SIGNIN`);
  - `ppm-deploy.sh git-bootstrap` при `PPM_GIT_SSO_ENABLED=1`: клиент OIDC → источник «PPM» в Forgejo (секрет пишется
    в `login_source.cfg` через stdin psql, не в argv) → id источника → токен администрирования → первая сверка;
  - `rotate-sso-key [--finish]`, `rotate-sso-secret`; аварийный вход — `PPM_GIT_LOCAL_SIGNIN=1`;
  - RUNBOOK §17.14.

### 4.3 Реальное время (UX2.1) — карточка U1–U10
- API `apps/api/plane/ppm_realtime/**`:
  - сокет `/ws/ppm/v1/workspaces/<slug>/events/` с подписками на проекты (≤ 50), пакетной перепроверкой доступа
    раз в ~15 с, лимитом 10 сокетов на человека и фильтром гостей;
  - одно групповое сообщение на фиксацию;
  - публикация из сигналов и массовых путей (однострочные вызовы в `app/views/{issue,cycle,module,workspace,estimate}`,
    `api/views/{cycle,module}`, `bgtasks/{deletion_task,issue_automation_task}`, `authentication/utils/workspace_project_join.py`);
  - маршрут — в `ppm_canvas/routing.py`.
- web `apps/web/core/components/ppm-realtime/**`:
  - клиент с переподключением, терминальными кодами 4401/4403/4404/1009 и паузой после 4429;
  - склейка ≈300 мс, точечные перечитывания;
  - опрос линии S раз в 120 с как страховка.
- Флаг `PPM_REALTIME_EVENTS_ENABLED` (сервер, комплект, аргумент сборки web).

### 4.4 Коммиты в отчётах (G2.3) — карточка G1–G6
- API `…/git/objects/search/` и `…/git/work-summary/`: сводка на конец периода, часовой пояс проекта, ≤ 92 дня,
  экранированный HTML/markdown (`ppm_git/work_summary.py`).
- web `apps/web/core/components/ppm-git/insert/**`:
  - диалоги; точки вызова — комментарии, описание задачи, страницы (меню «/» через мост
    `packages/editor/src/ce/extensions/g23-insert-git-object-bridge.ts`), заметки Хранилища
    (`ppm-vault/route.tsx`, textarea);
  - вставляется **ссылка-снимок**, не живой чип.

### 4.5 Мониторинг и оповещения
- `deployments/ppm/ppm-monitor.sh` (cron раз в 5 мин):
  - проверяет сервисы, HTTPS PPM и `git.`, диск, свежесть и сбои бэкапа (маркер пишет `ppm-backup.sh`), сертификаты;
  - Telegram и/или SMTP — только если настроены, сообщения по-русски;
  - секреты передаются только через stdin в curl.
- RUNBOOK §14.

### 4.6 Прочее из RC.2 (просьбы владельца)
- Вход: неизвестная почта не превращается молча в регистрацию.
- Русский интерфейс с падежами и датами.
- Массовые действия «Статус / Исполнитель / Спринт / Удалить».
- Живые графики спринта.
- Аватарки исполнителей на Холсте.
- Дата слияния PR.

---

## 5. Настройки (имена фиксированы)

**API (`apps/api/plane/settings/common.py`):**
- Forgejo: `PPM_FORGEJO_URL`, `PPM_FORGEJO_PUBLIC_URL`, `PPM_FORGEJO_TOKEN` (только чтение),
  `PPM_FORGEJO_WEBHOOK_SECRET`, `PPM_FORGEJO_SSH_ENABLED`, `PPM_FORGEJO_ADMIN_TOKEN` (администрирование),
  `PPM_FORGEJO_SSO_SOURCE_ID`.
- Единый вход: `PPM_GIT_SSO_ENABLED`, `PPM_OIDC_PRIVATE_KEY` (PEM в base64 или `_FILE`),
  `PPM_OIDC_PREVIOUS_PRIVATE_KEY`, `PPM_OIDC_CLIENT_ID` (`forgejo`), `PPM_OIDC_CLIENT_SECRET` (hex ≥ 32),
  `PPM_OIDC_INTERNAL_URL` (`http://api:8000`), `PPM_OIDC_FORGEJO_REDIRECT_URI`, `PPM_OIDC_*_RATE_LIMIT`.
- Прочее: `PPM_REALTIME_EVENTS_ENABLED`, `PPM_ADMIN_CENTER_ENABLED`.

**Комплект (`deployments/ppm/ppm.env.example`, `ppm-env.sh`):**
- Git-сервер: `PPM_GIT_SERVER_ENABLED`, `PPM_GIT_DOMAIN`, `PPM_GIT_PUBLIC_URL`, `PPM_GIT_SSH_ENABLED`,
  `PPM_GIT_SSH_PORT`, `PPM_FORGEJO_IMAGE`, секреты `FORGEJO_*`.
- Единый вход и реальное время: `PPM_GIT_SSO_ENABLED`, `PPM_GIT_LOCAL_SIGNIN`, `PPM_REALTIME_EVENTS_ENABLED`.
- Оповещения: `PPM_ALERT_*` (Telegram, SMTP), пороги `PPM_MONITOR_*`.

**Команды комплекта:**
- `ppm-env.sh` — `init | check | add-git | add-sso | set | set-secret`.
- `ppm-deploy.sh` — `up | release <ver> | git-bootstrap [--rotate-token] | git-admin | rotate-sso-key |
  rotate-sso-secret | preflight | smoke | status | logs | scan-logs | destroy`.
- Отдельные скрипты: `ppm-backup.sh`, `ppm-restore.sh`, `ppm-monitor.sh --once|--test`,
  `ppm-build.sh --rev <коммит|метка> --release <имя>`.

---

## 6. Сборка и проверки (базовые числа на RC.3)

| Проверка | Как | База |
|---|---|---|
| web vitest | `cd plane-fork/apps/web && ./node_modules/.bin/vitest run` (через heavy.sh) | 2138/2138 |
| web tsc | `plane-fork/apps/web/node_modules/.bin/tsc --noEmit` (из `apps/web`, heavy.sh) | 0 ошибок |
| oxlint | из корня `plane-fork`: `./node_modules/.bin/oxlint apps/web` | 719 предупреждений / 0 ошибок (= база) |
| oxfmt | из корня `plane-fork`, пути без `..` | чисто |
| API | `cd plane-fork && PPM_E2E_MINIO_IMAGE=ppm-af12-minio:RELEASE.2025-09-07T16-13-09Z docker compose -p <уник> -f docker-compose-test.yml run --rm api-tests pytest <пути> -q --create-db`, затем `down -v` и `docker image rm <уник>-api-tests:latest` | весь набор 1728 passed / 4 skipped (живые тесты Forgejo пропускаются) |
| ruff | `docker run --rm --entrypoint ruff -v "$PWD/apps/api":/code:ro -w /code plane-fork-api-tests:latest check --no-cache …` | чисто |
| комплект | `bash deployments/ppm/tests/cli-checks.sh`; `…/monitor-checks.sh`; `python3 …/git_bootstrap_test.py` | 362/0; 35/0; 48/0 |
| `@ppm/brand` | после правок строк — пересобрать `dist` (`./node_modules/.bin/tsdown` в пакете); web берёт `dist` | 116 тестов |
| `@plane/editor` | после правок — `tsc` + `tsdown` в пакете | — |

- Образ тестов API `plane-fork-api-tests:latest` уже содержит django-oauth-toolkit.
- В dev-БД владельца **не применены** миграции `ppm_git 0009`, `ppm_core 0001` и таблицы `oauth2_provider`:
  функции единого входа и «Отключить» в dev ответят ошибкой до `migrate`. Остальное работает.

**Как проверяли:**
- Каждую линию проверяло отдельное ревью: вход, доступы, комплект и отключение — ревью безопасности Opus.
- Сквозная проверка G2.2 на живом Forgejo 15.0.9: 9 сценариев из 9.
- Итоговая проверка RC.3 (10 сценариев, 3 из них частично) — найденное исправлено в `9648d7af2d`:
  - реальное время в двух браузерах — ≤ 0,74 с;
  - нагрузка 20 сокетов × 200 изменений — 4000/4000, медиана 148 мс, p95 249 мс;
  - сводка совпала с базой;
  - отключение закрывает PPM и Git за 3,3 с;
  - секреты — 0 совпадений в 54 050 строках журналов.

Отчёты: `.superpowers/sdd/2026-09-29-g22-sso/task-E-report.md`, `task-EF-report.md`.

---

## 7. Стенд приёмки владельца `ppm-accept` (на этом Mac)

- PPM: **https://ppm-accept.localhost:18443**, Git-сервер: **https://git.ppm-accept.localhost:18443**, SSH `2222`
  (только `127.0.0.1`). Проект Compose `ppm-accept`, env — `plane-fork/deployments/ppm/.runtime/ppm-accept.env` (600).
- Учётки (не читать в чат, не печатать): `.runtime/ppm-accept/acceptance-credentials.txt` (ADMIN, OWNER, ROBOT_*,
  BIO_MEMBER, OUTSIDER), `team-credentials.txt` (`lead@ppm.test`, `worker1..3@ppm.test`),
  `forgejo-admin-credentials.txt` (администратор Forgejo `owner`, одноразовый пароль).
- CA стенда для git по HTTPS: `.runtime/ppm-accept/stand-root-ca.crt`; бэкапы — `.runtime/ppm-accept-backups/`.
- Доступ с Windows по Wi-Fi: контейнер `ppm-accept-lan-relay` на IP Mac (`ipconfig getifaddr en0`) → `proxy:18443`;
  на Windows — `netsh portproxy`. Ретранслятор работает на образе `ppm-accept/api:1.0.0-rc.1` — не удалять этот образ,
  пока ретранслятор нужен.
- Инструкция для владельца — `plane-fork/deployments/ppm/ACCEPTANCE-LOCAL.md` (§6 — как выложить свой проект в Git).
- Владелец **реально пользуется стендом**: в ROBOT его задача «Провести ресерч статей» (ROBOT-7). Не добавлять
  демо-данные к его задачам.
- **Текущее состояние (21:45):** стенд работает на **RC.3** с единым входом. Обновлён по шагам: бэкап → `add-sso` →
  `PPM_GIT_LOCAL_SIGNIN=1` (только на стенде, чтобы работал локальный `owner`) → `release 1.0.0-rc.3` →
  `git-bootstrap`. preflight — все проверки `ok`; страница входа Git-сервера показывает «Войти через PPM»; внутренний
  discovery снаружи — 404; доступ по Wi-Fi — 200. Инструкция — `ACCEPTANCE-LOCAL.md` §6–7, чек-лист — блок 10.
- **Инцидент 2026-09-29 12:30–21:15:** сборка образов RC.3 при нехватке места на диске повесила Docker Desktop
  (стенд и dev-API были недоступны ~9 ч). Лечение — остановить зависшие клиенты сборки, принудительно перезапустить
  Docker Desktop (контейнеры поднимаются сами), собрать недостающий образ отдельно (`--services live`). Ещё одна
  ловушка: «продление» блокировки heavy.sh через `touch` превратило каталог-замок в файл — очередь встала; замок-файл
  удалён. Подробности — в памяти ассистента (`ppm-dev-env-gotchas.md`).

---

## 8. Открытые вопросы и хвосты

**Решения владельца (до выкладки на сервер):**
- **Инфраструктура:** сервер (≥ 4 vCPU, 8–16 ГБ, ≥ 100 ГБ), домен + DNS `ppm.…` и `git.…`, почта для Let's Encrypt,
  SSH-доступ.
- **Лицензии:**
  - публикация исходников по AGPL §13 (где);
  - лицензия tldraw (бесплатно с водяным знаком или платно).
- **Эксплуатация:** место для копий бэкапов вне сервера; SMTP для писем PPM (сейчас не настроен); канал оповещений
  (Telegram-бот или почта).
- **Приёмка:** на стенде по чек-листу (блоки 1–10), точки T5/T6' в `inventory.md`.

**Вопрос владельцу (не блокер):** гость проекта с ограниченным доступом видит в «Коде» и в поиске коммитов все
коммиты и PR проекта (так было в G2.1). Если это не нужно — ограничить.

**Известные ограничения (записаны в release notes и RUNBOOK):**
- **Отчёты:** статус коммита или PR в отчёте — снимок на момент вставки.
- **Git-сервер:**
  - локальные учётки Forgejo PPM не трогает — их пересматривает администратор;
  - запись в Git из PPM для Forgejo не делается.
- **«Отключить»:**
  - не удаляет ключи API;
  - не закрывает уже открытую вкладку документа (`live` проверяет сессию только при подключении).
- **Производительность:** у `IssueActivity` нет индекса (project, field, created_at) — сводка за 92 дня сканирует
  журнал проекта.

**Технический долг и мелочи:**
- Мусор `packages/i18n/{en,ru}` (неотслеживаемые копии) — удалить.
- В web нет jsdom — поведенческие тесты компонентов заменены тестами исходника («проводки»); часть UI проверена
  только сквозными прогонами.
- Хвосты G2.1 (ранее отмеченные):
  - флаг начала недели на сервере;
  - схлопывание постраничности в выборе репозитория при 409;
  - косметическая строка журнала токена;
  - гонка «Без спринта» в массовых действиях (проверить вручную).

---

## 9. Где искать подробности

- **Спецификации:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/`:
  - «G2.1 — ADR и внедрение self-hosted Git provider.md»;
  - «G2.2 — Единый вход через PPM и автодоступы к коду.md»;
  - «G2.3 — Коммиты и PR в отчётах о работе.md»;
  - «UX2.1 — Изменения в реальном времени для всех участников.md»;
  - README.md в той же папке — статусы всех карточек;
  - ADR: `Intelligence-first/Решение — Forgejo как собственный Git-сервер PPM.md`.
- **Планы:** `docs/superpowers/plans/2026-09-28-g21-forgejo/plan.md`,
  `docs/superpowers/plans/2026-09-29-{g22-sso,ux21-realtime,g23-reports}/plan.md` — фиксированные имена и контракты.
- **Журналы работы:** `.superpowers/sdd/<программа>/` (локально, git-игнорируется):
  - `progress.md` — все решения («Ruling: …»), вердикты ревью, коммиты;
  - `task-*-brief.md` / `task-*-report.md` — задания и отчёты линий;
  - `research/*.md` — факты о коде PPM и живом Forgejo 15 (проверенные пробой: `must_change_password`, поиск перед
    созданием учётки, sudo, `units_map`, что Forgejo не проверяет подпись ID token и т.д.).
- **Выпуск:**
  - `docs/project-spec/Документация PPM/RELEASE-NOTES-1.0-RC.md` (разделы RC.3, RC.2) и `CHANGELOG.md`;
  - чек-лист `Intelligence-first/Чек-лист приёмки владельца — PPM 1.0 RC.md` (блоки 9–10);
  - `plane-fork/deployments/ppm/RUNBOOK.md` (§1–17), `ACCEPTANCE-LOCAL.md`.
- **Память ассистента** (для Claude Code): `~/.claude/projects/-Users-ermolov-Desktop-PPM/memory/` — `MEMORY.md` и
  заметки (`ppm-release-rc.md`, `ppm-git-forgejo.md`, `ppm-dev-env-gotchas.md` и др.).

---

## 10. Как работали (если продолжать тем же способом)

- Крупное — спецификация (карточка) → план с фиксированными контрактами → линии-исполнители.
  - У каждой линии свой бриф и отчёт.
  - Ревью каждой линии: задание, спецификация, отчёт и пакет диффа.
  - Раунды исправлений и узкое повторное ревью.
  - Сквозная проверка на одноразовом стеке из собранного коммита.
  - Коммит волной.
- Спорные места решаются и записываются в `progress.md` как «Ruling: что решено — почему — цена ошибки».
- Владельцу — коротко, по-русски, без жаргона; решения — через вопросы с вариантами и рекомендацией.
