# G2.2 «Единый вход через PPM и автодоступы к коду» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Исполнители получают бриф своей
> линии из `.superpowers/sdd/2026-09-29-g22-sso/task-<ЛИНИЯ>-brief.md`; этот файл — общая карта с фиксированными
> именами и контрактами.

**Goal:** На Git-сервере (Forgejo 15) вход только кнопкой «Войти через PPM», учётки и доступы к коду ведёт PPM по
пространствам, проектам и ролям; руководитель проекта сам подключает репозитории; состояние — в центре администратора.

**Architecture:** PPM становится OpenID Connect-провайдером (django-oauth-toolkit, новое приложение `plane.ppm_oidc`)
для единственного клиента — Forgejo; при обмене кода на токены PPM обеспечивает учётку человека в Forgejo через admin
API (предсоздание с `source_id` + `login_name = sub`). Модуль доступов в `plane.ppm_git` приводит Forgejo к модели
PPM: пространство → организация, проект → команды по ролям, репозитории проекта → в команды, отключение →
`prohibit_login`; сигналы + отложенные задачи + полная сверка каждые 10 минут. Комплект развёртывания включает единый
вход ключами окружения и `git-bootstrap`.

**Tech Stack:** Django 5.2 + DRF + Celery + django-oauth-toolkit 3.x + jwcrypto (`plane-fork/apps/api`), React Router +
MobX (`apps/web`), Docker Compose + Caddy + bash (`deployments/ppm`), Forgejo 15.0.9 rootless.

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/G2.2 — Единый вход через PPM и автодоступы к коду.md`
(R1–R30); исследования — `.superpowers/sdd/2026-09-29-g22-sso/research/{forgejo-facts,ppm-facts}.md`.

## Global Constraints

- Решение владельца 2026-09-29: G2.2 на ночь и день, «делай до конца», коммиты локальные по волнам через временный
  индекс, без push. База — `plane-fork` `a9db1a118a` (метка `ppm-1.0.0-rc.2`); в рабочем дереве параллельно лежат
  незакоммиченные линии ночи (R2, M, O, F) и файлы сессии владельца (`ppm-canvas/workspace.tsx`,
  `board-presence.tsx`, `canvas-v2.css`) — чужое не трогать.
- **Мягкая деградация:** без установленного `oauth2_provider` (dev-API владельца `plane-fork-api-1` с `uvicorn
  --reload` смонтирован на это же дерево и НЕ получит новую библиотеку) приложение `plane.ppm_oidc` не подключается,
  маршруты `/auth/oidc/*` не монтируются, всё остальное работает. Без `PPM_GIT_SSO_ENABLED=1` и полной настройки
  модуль доступов ничего не делает и не обращается к новым таблицам (сигналы — no-op).
- Точки OIDC (фиксированы): `/auth/oidc/authorize/`, `/auth/oidc/token/`, `/auth/oidc/userinfo/`, `/auth/oidc/jwks/`,
  `/auth/oidc/.well-known/openid-configuration` (публичный discovery), `/auth/oidc/internal/.well-known/openid-configuration`
  (для Forgejo: `issuer` и `authorization_endpoint` — публичные, `token_endpoint`/`userinfo_endpoint`/`jwks_uri` —
  на `PPM_OIDC_INTERNAL_URL`), `/auth/oidc/continue/<id>/`. `issuer` = `WEB_URL` + `/auth/oidc`. Имена маршрутов DOT —
  в пространстве имён `oauth2_provider` (как ждёт DOT).
- Настройки API (имена фиксированы; все строки в `settings/common.py` добавляет линия S1): `PPM_GIT_SSO_ENABLED`
  (0/1), `PPM_OIDC_PRIVATE_KEY` (PEM в base64 одной строкой; поддержка `_FILE` как у `_ppm_secret`),
  `PPM_OIDC_PREVIOUS_PRIVATE_KEY` (необязательный, для ротации — публикуется в JWKS), `PPM_OIDC_CLIENT_ID`
  (`forgejo`), `PPM_OIDC_CLIENT_SECRET`, `PPM_OIDC_INTERNAL_URL` (`http://api:8000`), `PPM_FORGEJO_ADMIN_TOKEN`,
  `PPM_FORGEJO_SSO_SOURCE_ID` (целое), `PPM_OIDC_FORGEJO_REDIRECT_URI` (вычисляется из `PPM_FORGEJO_PUBLIC_URL` +
  `/user/oauth2/PPM/callback`, если не задан).
- Переменные комплекта (имена фиксированы): `PPM_GIT_SSO_ENABLED` (1 для новых установок с Git-сервером),
  `PPM_GIT_LOCAL_SIGNIN` (0), `PPM_OIDC_CLIENT_ID`, секреты `PPM_OIDC_PRIVATE_KEY`, `PPM_OIDC_CLIENT_SECRET` (48 hex),
  `PPM_FORGEJO_ADMIN_TOKEN` (пишет bootstrap), `PPM_FORGEJO_SSO_SOURCE_ID` (пишет bootstrap). Источник входа в Forgejo
  называется ровно `PPM`; discovery для него — `http://api:8000/auth/oidc/internal/.well-known/openid-configuration`;
  redirect URI — `${PPM_GIT_PUBLIC_URL}/user/oauth2/PPM/callback`.
- Forgejo (compose при `PPM_GIT_SSO_ENABLED=1`): `FORGEJO__oauth2_client__ENABLE_AUTO_REGISTRATION=false`,
  `ACCOUNT_LINKING=disabled`, `USERNAME=nickname`, `UPDATE_AVATAR=false`,
  `FORGEJO__service__ENABLE_INTERNAL_SIGNIN=${PPM_GIT_LOCAL_SIGNIN}`; `[oauth2] ENABLED=false` и
  `ENABLE_BASIC_AUTHENTICATION` не менять. Источник: `add-oauth --name PPM --provider openidConnect --key <client_id>
  --secret <secret> --auto-discover-url <internal> --skip-local-2fa --scopes "openid profile email groups"`, без
  `--admin-group`/`--group-team-map`; после add/update — рестарт Forgejo.
- Модуль доступов — контракт (имена фиксированы, линия S2):
  - `plane/ppm_git/forgejo_access.py`: `forgejo_sso_is_configured() -> bool`; `ensure_account_for_login(user) ->
    PpmForgejoAccount` (исключение `ForgejoAccessError(code: str, message: str)`); `apply_user_access(user, *,
    budget_seconds: float = 5.0) -> bool` (True — всё применено); `forgejo_username_for(user) -> str | None`;
    `schedule_access_sync(*, user_ids=(), project_ids=(), workspace_ids=(), full: bool = False) -> None`.
  - `plane/ppm_git/forgejo_admin.py`: `ForgejoAdminClient` (запись через `PPM_FORGEJO_ADMIN_TOKEN`, те же классы
    ошибок и таймауты, что у `ForgejoClient`).
  - Модели (миграция `ppm_git 0009_forgejo_access`): `PpmForgejoAccount` (user 1:1, `forgejo_user_id` уник.,
    `username` уник., `adopted`, `prohibited`, `last_synced_at`, `last_error_code/message`), `PpmForgejoOrganization`
    (`workspace_id` уник., `forgejo_org_id`, `name`, `adopted`), `PpmForgejoTeam` (`project_id`, `role` ∈ admin/write/
    read, `forgejo_team_id`, `name`; уник. (`project_id`, `role`)), `PpmForgejoSyncRun` (время, вид full/scoped, итог
    ok/partial/error, `counts`, `problems` — без секретов).
  - Задачи: `plane.ppm_git.tasks.sync_forgejo_access_task(scope: dict)`, `plane.ppm_git.tasks.reconcile_forgejo_access`
    (beat `ppm-git-forgejo-access-reconcile`, каждые 10 мин).
- Связка S1 ↔ S2: token endpoint после проверки кода и до выдачи токенов вызывает `ensure_account_for_login(user)`,
  затем `apply_user_access(user)`; `ForgejoAccessError` → ответ OAuth `server_error` без подробностей, код — в лог.
  Утверждения `nickname`/`preferred_username` = `forgejo_username_for(user)`. S1 в своих тестах подменяет эти функции.
- HTTP-контракт для web (S2 ↔ S4):
  - `GET …/workspaces/<ws>/projects/<p>/git/` — в `providers.forgejo` добавляются `sso_enabled: bool`,
    `username: string | null` (имя текущего пользователя на Git-сервере), `sso_login_url: string | null`
    (`${public}/user/oauth2/PPM`); в `capabilities` — `connect_git_server_repositories: bool` (администратор проекта при
    включённом едином входе или глобальный администратор).
  - `GET/POST …/git/providers/forgejo/repositories/` — как в G2.1; администратору проекта отдаются только репозитории
    организации его пространства, где у его учётки права администратора; нет учётки — 409 `FORGEJO_ACCOUNT_REQUIRED`.
  - `GET /api/ppm/v1/git/forgejo/access/status/` (глобальный администратор) → `{ configured, sso_enabled, reachable,
    last_full_sync: { started_at, finished_at, status, counts } | null, problems: [{ at, kind, subject, message }],
    forgejo_admin_url }`; `POST /api/ppm/v1/git/forgejo/access/sync/` → 202 `{ scheduled: true }`; остальным — 403
    `GIT_PERMISSION_DENIED`; частый запуск сверки — 429 `GIT_SYNC_RATE_LIMITED` через `ppm_error_response` с
    `details.retry_after_seconds` (целое) и заголовком `Retry-After` (как у `PpmGitProviderRateLimited`).
  - `counts` в статусе (зафиксировано 2026-09-29 по отчётам S2a/S4): интерфейс показывает `accounts`, `organizations`,
    `teams`, `repositories` (итоги полной сверки) и `changes` (изменений за прогон); прочие счётчики S2a — служебные,
    в интерфейс не выводятся.
- Имена команд: `<IDENT>-admin` (admin, `can_create_org_repo`), `<IDENT>` (write), `<IDENT>-read` (read); не-admin
  команды — только с `units_map`. Организация = slug пространства (правила Forgejo, ≤ 40).
- Учётки: `POST /admin/users` с `source_id`, `login_name = <UUID пользователя>`, `must_change_password: false`, без
  пароля; поиск перед созданием `GET /admin/users?source_id=&login_name=`; локальные учётки **не перенимаются**
  (ревью безопасности S2a, 2026-09-29); `ppm-bot`, владелец токена администрирования и любые учётки, созданные не PPM
  (в т.ч. администраторы), не меняются и не выводятся из команд никогда.
- Секреты (ключ подписи, секрет клиента, токены, коды) не печатаются, не коммитятся, не уходят в логи, аудит, ответы
  API, argv процессов; тестовые учётки — только в одноразовых стеках, в git-игнорируемых файлах 600.
- Окружение владельца (`plane-fork-*`, стенд `ppm-accept` + `ppm-accept-lan-relay`, dev-сервер :3000) не трогать;
  свои стеки — `-p ppm-g22-<линия>…` и `down -v`; тяжёлые команды — через `heavy.sh` (Mac 16 ГБ).
- UI-строки по-русски, горячие клавиши через `e.code`, облик v1/v2 цел, миграции аддитивные, GitHub-поведение
  неизменно.

## Линии и порядок

| Линия | Бриф | Требования | Файлы (владение) | Старт | Модель |
|---|---|---|---|---|---|
| S1 «OIDC-провайдер» | task-S1-brief.md | R1–R7 (API), R28 (свои тесты) | `apps/api/plane/ppm_oidc/**`, `apps/api/plane/settings/common.py`, `apps/api/plane/urls.py`, `apps/api/requirements/base.txt`, `apps/api/plane/tests/contract/ppm_oidc/**` | сразу | opus |
| S2 «Доступы» | task-S2-brief.md | R8–R19 (API), R28 (свои тесты) | `apps/api/plane/ppm_git/**` (новые модули, модели, миграция 0009, права, представления, URL, задачи, сигналы), `apps/api/plane/celery.py`, `apps/api/plane/tests/contract/ppm_git/test_forgejo_access_*.py` | после линии M (она правит `ppm_git/views.py`) | opus |
| S3 «Комплект» | task-S3-brief.md | R23–R27 | `deployments/ppm/**` (кроме `ACCEPTANCE-LOCAL.md`) | после линии O (она правит комплект) | opus |
| S4 «Web» | task-S4-brief.md | R6 (web), R18 (UI), R20–R22 | обёртка авторизации и формы входа, центр администратора, `ppm-git/**`, `ppm-git.service.ts`, `packages/ppm-brand` (свои ключи) | после линий R2 (словари) и M (`ppm-git/**`) | sonnet |
| E «Сквозная проверка» | task-E-brief.md | R29–R30 | отчёт и тестовые артефакты; дефекты — владельцам линий | после S1–S4 | opus |

S1 и S2 не пересекаются по файлам (все настройки пишет S1). Образ тестов API `plane-fork-api-tests` пересобирает S1
**до** правки `INSTALLED_APPS` (иначе чужие прогоны упадут на импорте) — только добавлением закреплённых пакетов.

## Review Focus

1. Человек не вошёл в PPM (или вошёл другим пользователем) и нажал «Войти через PPM» — после входа он возвращается
   в Forgejo уже вошедшим под правильной учёткой; устаревший или повторно использованный `continue` — понятная
   страница, не 500 и не петля (S1 + S4, тесты).
2. Часть почты до `@` совпадает с именем чужой учётки Forgejo или с аварийным администратором — PPM выдаёт имя с
   суффиксом и никогда не перенимает чужую учётку, даже с той же почтой (S2, тесты).
3. Исключение из пространства идёт массовым `.update(is_active=False)` без сигналов — полная сверка убирает человека
   из команд за ≤ 10 мин; отключённый пользователь не может `git push` уже выданным токеном и SSH-ключом (S2 + E).
4. Forgejo недоступен или медленный во время обмена кода — вход понятно отклоняется, повтор не создаёт вторую учётку
   (поиск перед созданием идемпотентен), вход без применённых доступов дожимается фоновой задачей (S1/S2 + E).
5. Секрет клиента, ключ подписи и токен администрирования не появляются в логах API/Celery/Caddy/Forgejo, в ответах,
   аудите, описи бэкапа и в argv при `git-bootstrap` (S3 cli-checks + E scan-logs).

## Волны коммитов (локально, временный индекс, без push)

- W6 — ночные мелочи: R2 (русский), M (дата слияния PR), O (мониторинг + RUNBOOK §17 по ревью W5), F (ревью W5),
  `ACCEPTANCE-LOCAL.md` §6. W7 — G2.2 API (S1 + S2). W8 — G2.2 комплект (S3). W9 — G2.2 web (S4). Затем документы
  (CHANGELOG, статусы, release notes) и после линии E — метка `ppm-1.0.0-rc.3`, обновление стенда.
