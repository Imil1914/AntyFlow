# G2.1 «Свой Git-сервер» (Forgejo, объём «Быстрый») — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Исполнители получают бриф своей
> линии из `.superpowers/sdd/2026-09-28-g21-forgejo/task-<ЛИНИЯ>-brief.md`; этот файл — общая карта.

**Goal:** Forgejo 15 LTS в комплекте развёртывания PPM и второй Git-провайдер `forgejo` в PPM: команды делают
push/pull/PR на своём сервере, PPM видит коммиты и PR, связывает их с задачами и ищет по коду.

**Architecture:** В `ppm_git` выделяется провайдерный контракт чтения и реестр клиентов (GitHub не меняет поведение),
добавляется `ForgejoClient` (Forgejo API v1, служебный токен только на чтение), приёмник системного вебхука Forgejo и
подключение репозиториев глобальным администратором. Forgejo — отдельный сервис комплекта `deployments/ppm` на
`git.<домен>` за тем же Caddy, со своей базой в том же PostgreSQL, в тех же зашифрованных бэкапах.

**Tech Stack:** Django 5.2 + DRF + Celery (`plane-fork/apps/api`), React Router + MobX (`apps/web`), Docker Compose +
Caddy + bash (`deployments/ppm`), Forgejo 15 LTS rootless.

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/G2.1 — ADR и внедрение self-hosted Git provider.md`
(требования R1–R24) и `…/Intelligence-first/Решение — Forgejo как собственный Git-сервер PPM.md`.

## Global Constraints

- Решения владельца 2026-09-28: Forgejo; объём «Быстрый» (свои учётки в Forgejo, без единого входа и автодоступов);
  PPM и Forgejo выкладываются вместе; «делай до конца»; коммиты локальные по волнам через временный индекс, без push.
- Forgejo: `codeberg.org/forgejo/forgejo:15-rootless`, закреплённый по multi-arch digest; настройки только
  `FORGEJO__section__KEY`; данные — том `forgejo_data`; база `forgejo`, роль `forgejo` в `plane-db`.
- Хост Git-сервера — `git.<PPM_DOMAIN>` (отдельный origin), SSH — встроенный сервер Forgejo, порт `2222`.
- Переменные API PPM (имена фиксированы): `PPM_FORGEJO_URL` (`http://forgejo:3000`), `PPM_FORGEJO_PUBLIC_URL`,
  `PPM_FORGEJO_TOKEN`, `PPM_FORGEJO_WEBHOOK_SECRET`, `PPM_FORGEJO_WEBHOOK_MAX_BYTES` (по умолчанию как у GitHub).
- Переменные комплекта (имена фиксированы): `PPM_GIT_SERVER_ENABLED` (1), `PPM_GIT_DOMAIN`, `PPM_GIT_PUBLIC_URL`,
  `PPM_GIT_SSH_ENABLED` (1), `PPM_GIT_SSH_PORT` (2222), `PPM_FORGEJO_IMAGE`, секреты `FORGEJO_DB_PASSWORD`,
  `FORGEJO_SECRET_KEY`, `FORGEJO_INTERNAL_TOKEN`, `FORGEJO_JWT_SECRET`, `FORGEJO_LFS_JWT_SECRET`,
  `PPM_FORGEJO_WEBHOOK_SECRET`, `PPM_FORGEJO_TOKEN` (пишет первичная настройка).
- Приёмник вебхука: `POST /api/ppm/v1/git/forgejo/webhook/`; системный вебхук Forgejo бьёт во внутренний
  `http://api:8000/api/ppm/v1/git/forgejo/webhook/`.
- Токен PPM в Forgejo — только `read:repository,read:organization,read:user`; у PPM нет прав писать в Forgejo.
- Репозитории Forgejo подключает/отключает только глобальный администратор PPM (новая возможность
  `manage_git_server` в `get_ppm_git_capabilities`).
- Поведение GitHub-интеграции не меняется; миграции только аддитивные; UI-строки по-русски; облик v1/v2 цел.
- Секреты не печатаются, не коммитятся, не уходят в браузер/логи/аудит; тестовые учётки — только в одноразовых
  локальных стеках, в git-игнорируемых файлах 600.
- Окружение владельца (`plane-fork-*`, стек приёмки `ppm-accept`, dev-сервер :3000) не трогать.

## HTTP-контракт для web (линия W ↔ линия A2)

- `GET …/workspaces/<ws>/projects/<p>/git/` — добавляются
  `providers: { github: { configured }, forgejo: { configured, public_url | null } }` и
  `capabilities.manage_git_server`; прежнее поле `provider` (сводка GitHub) остаётся.
- `GET …/git/providers/forgejo/repositories/?search=<q>&page=<n>` →
  `{ results: [{ provider_repository_id, full_name, name, owner, description, private, archived, default_branch,
  html_url, clone_https, clone_ssh, updated_at, connected }], page, has_next }`; 403 `GIT_PERMISSION_DENIED` (не
  глобальный администратор), 400 `FORGEJO_NOT_CONFIGURED`, 429 `GIT_PROVIDER_RATE_LIMITED`, 502
  `GIT_PROVIDER_UNAVAILABLE`.
- `POST …/git/providers/forgejo/repositories/` `{ provider_repository_id }` → 201
  `{ repository, connection }` (сериализаторы `serialize_repository` / `serialize_connection`); 409
  `GIT_REPOSITORY_CONFLICT`, 404 `GIT_REPOSITORY_NOT_FOUND`, 403, 400 как выше.
- Отключение — существующий `PpmGitConnectionDetailView` (как у GitHub).
- Репозиторий в ответах уже несёт `provider`, `canonical_url`, `clone_https`, `clone_ssh`; подпись провайдера —
  на клиенте: `github` → «GitHub», `forgejo` → «Наш Git-сервер».

## Линии и порядок

| Линия | Бриф | Требования | Файлы (владение) | Старт | Модель |
|---|---|---|---|---|---|
| A1 «Разъём» | task-A1-brief.md | R1–R2 | `apps/api/plane/ppm_git/**`, `apps/api/plane/tests/contract/ppm_git/**` | сразу | opus |
| D «Forgejo в комплекте» | task-D-brief.md | R14–R21 | `deployments/ppm/**` | сразу | opus |
| W «Код» в web | task-W-brief.md | R10–R13 | `apps/web/core/components/ppm-git/**`, `apps/web/core/services/ppm-git.service.ts`, `apps/web/tests/ppm-git/**` | сразу (по HTTP-контракту) | opus |
| A2 «Провайдер Forgejo» | task-A2-brief.md | R3–R9 | как A1 + `apps/api/plane/settings/*.py` (только Forgejo-переменные) | после приёмки A1 | opus |
| E «Сквозная проверка» | task-E-brief.md | R22–R24 | только отчёт и тестовые артефакты; найденные дефекты — в линии владельцев | после A2, D, W | opus |

A1 и A2 правят одни файлы — строго последовательно. D и W не пересекаются с A по файлам.

## Review Focus

1. Forgejo прислал вебхук с неверной/пустой подписью, чужим репозиторием или повтором доставки — данные не меняются,
   ответ без эха тела (A2, тесты приёмника).
2. РП (не глобальный администратор) пытается перечислить или подключить репозитории Forgejo напрямую через API —
   403, в логах и аудите нет чужих названий (A2, тест прав).
3. Forgejo недоступен или отвечает 5xx/429 во время сверки — подключение получает статус ожидания/ошибки без
   падения очереди, GitHub-подключения не страдают (A2, тест сверки).
4. Существующий файл окружения RC.1 без ключей Git-сервера — `check` объясняет, команда добавления ключей ничего не
   меняет в прежних значениях, старый бэкап без Forgejo восстанавливается (D, cli-checks).
5. В логах Caddy/Forgejo не оказывается токенов из `git clone https://user:token@…`, `?token=` и заголовка
   Authorization (D, scan-logs + E).

## Волны коммитов (локально, временный индекс, без push)

- Волна 1: A1 + A2 + W (провайдер Forgejo и раздел «Код»). Волна 2: D (комплект). Волна 3: документы (CHANGELOG,
  статусы, release notes RC.2). Тег `ppm-1.0.0-rc.2` — после линии E.
