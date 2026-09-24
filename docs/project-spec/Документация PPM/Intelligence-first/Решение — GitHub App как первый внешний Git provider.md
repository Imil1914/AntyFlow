---
type: architecture_decision
decision_id: ppm-first-external-git-provider
project_id: intellect-ppm
status: approved
version: 1
created: 2026-09-19
updated: 2026-09-20
owners:
  - product_owner
---

# Решение — GitHub App как первый внешний Git provider

## Статус

`approved`: 2026-09-20 владелец подтвердил продолжение работ по G1.1 с GitHub App как первым provider. Создание
внешнего GitHub App и ввод production credentials остаются отдельным ручным шагом владельца.

## Контекст

- основной remote PPM уже размещён на GitHub: `https://github.com/Imil1914/PPM.git`;
- G0.1 уже даёт безопасные ручные repository/branch/commit/PR links и не должен зависеть от provider;
- G1.1 требует read-only синхронизацию repositories, branches, commits и pull requests;
- пароль Git-аккаунта, personal access token и личный SSH-ключ не должны попадать в PPM;
- первый provider нужен как узкий adapter, а не как новый источник истины для Git-данных.

## Предлагаемое решение

1. Первым внешним provider для G1.1 выбрать **GitHub**.
2. Использовать **GitHub App installation**, а не classic OAuth App и не personal access token.
3. Подключать только явно выбранные repositories и хранить в PPM только installation/repository identifiers
   и нормализованные metadata.
4. Installation access token создавать на сервере по требованию, ограничивать конкретными repositories
   и permissions, не хранить как долгоживущий секрет.
5. Private key GitHub App и webhook secret хранить только в server secret store/окружении; никогда не
   отдавать browser и не писать в logs.
6. Оставить provider interface независимым от GitHub, чтобы позже добавить GitLab/Forgejo без миграции
   доменной модели.
7. Разделить install flow на Setup URL и OAuth Callback URL: GitHub возвращает `installation_id` только в
   Setup URL, затем PPM запускает OAuth с `state` и PKCE, проверяет принадлежность installation пользователю и
   повторно проверяет роль РП. Встроенный `Request user authorization during installation` не включать.

## Минимальные permissions GitHub App

| Repository permission | Уровень G1.1 | Зачем |
|---|---|---|
| Metadata | read | имя, URL, visibility, default branch и доступность repository |
| Contents | read | branches, commits и reconciliation без clone и без write |
| Pull requests | read | pull request metadata, reviewers, base/head и статус |

G1.1 не запрашивает `Contents: write`, `Pull requests: write`, `Administration`, `Members`, `Actions` и `Secrets`.
Write permissions могут появиться только в отдельном решении G1.3 с preview/approval.

## Webhooks и защита от повтора

PPM подписывается только на:

- `installation` и `installation_repositories` — отзыв/изменение доступа;
- `push` — branches и commits;
- `pull_request` — pull request lifecycle.

Приём webhook:

1. читает raw body до JSON parsing;
2. проверяет `X-Hub-Signature-256` через HMAC-SHA256 и constant-time comparison;
3. требует `X-GitHub-Delivery` и сохраняет его с unique constraint;
4. сверяет installation/repository с активной project connection;
5. сохраняет минимальный normalized event и hash body, но не сырой payload бессрочно;
6. быстро отвечает и передаёт idempotent processing в background queue;
7. на duplicate delivery возвращает успех без второго изменения.

Потерянные события восстанавливаются reconciliation job по repository с conditional requests, rate-limit
backoff и курсором последней успешной синхронизации.

## Модель доступа PPM

- подключать/отключать GitHub App и выбирать repository может глобальный администратор PPM или РП
  конкретного проекта;
- связь с project выполняется только после server-side project permission check;
- РП, участник и наблюдатель видят Git metadata только доступного им project;
- события GitHub никогда не расширяют project membership;
- auto-link по Work Item key сначала доказывает, что Work Item принадлежит тому же project;
- revoke блокирует новые provider calls, но сохраняет исторические canonical URLs и audit.

## Почему не GitLab первым

GitLab остаётся целевым вторым adapter, но первый vertical slice на GitHub:

- проверяется на фактическом remote PPM;
- даёт installation-level доступ к явно выбранным repositories;
- не требует personal access token;
- позволяет доказать полный branch → commit → push → PR поток на том же provider.

Это не отменяет будущий self-hosted Git provider: GitLab и Forgejo сравниваются отдельно в G2.1.

## Что уже можно переиспользовать

Plane fork содержит общие OAuth и webhook primitives, GitHub models/UI и provider authentication code. Они
используются только после security review: login OAuth не подменяет project GitHub App installation, а
user-created outgoing webhooks не подменяют provider webhook receiver.

Существующий `GithubRepositorySync.credentials` не переиспользуется: поле — обычный JSON, а его модель относится к
прежней синхронизации GitHub Issues, а не к read-only Git metadata G1.1. Так же не используется login OAuth token:
аутентификация пользователя и доступ PPM к repository остаются разными trust boundaries.

## Границы реализации после одобрения

G1.1 расширяет существующий `ppm_git`, а не создаёт параллельную Git-подсистему:

- provider-neutral interface отвечает за installation token, repository/branch/commit/PR reads и normalization;
- `PpmGitConnection` хранит project-scoped installation/repository binding, granted permissions, status и last sync;
- существующий `PpmGitRepository` получает provider identity/sync state, но canonical и clone URLs G0.1 не меняются;
- normalized Git objects хранят project/repository scope, immutable provider key, canonical URL, safe metadata и `source_version`;
- delivery receipt хранит provider delivery ID, event, body hash и processing state; project mutations создаются отдельно и
  идемпотентно после проверки project binding;
- reconciliation и webhook processing идут через Celery; provider HTTP не выполняется в browser;
- API и audit показывают connection health, permission drift, last success/error и revoke, но никогда secrets.

Миграция additive: ручные repository/link rows G0.1 сохраняются. Подключение provider либо сопоставляется с
существующим repository по normalized provider identity, либо создаёт его через те же validation rules. Отключение
provider не архивирует repository и не удаляет `PpmGitLink`.

## Альтернативы

1. **GitLab OAuth первым.** Отклонено в кандидате: текущий PPM remote не в GitLab, а OAuth scopes шире
   installation permissions GitHub App.
2. **GitHub OAuth App/PAT.** Отклонено: долгоживущий user credential хуже изолирован по repositories и жизненному
   циклу.
3. **Только ручные URL G0.1.** Отклонено как финальное состояние: нет webhook/reconciliation и актуальных
   commit/PR metadata.
4. **Самописный Git server.** Отклонено архитектурой PPM.

## Последствия при одобрении

- G1.1 переходит из `planned` в `ready` только после приёмки G0.1;
- первая реализация read-only: никаких branch/PR write actions;
- нужен GitHub App, созданный владельцем GitHub-аккаунта/организации;
- production требует HTTPS callback/webhook URL и secret store;
- локальная разработка использует fixture/replay или явно одобренный HTTPS tunnel; внешний tunnel не
  запускается агентом без явного согласия.

## Проверки G1.1

1. install/cancel/denied/revoke;
2. private repository picker и repository permission change;
3. HMAC signature, missing/invalid signature, duplicate delivery и replay;
4. push и pull request create/update/close/merge;
5. auto-link по ключу Work Item без cross-project link;
6. rate-limit/retry/backoff и reconciliation после пропущенного webhook;
7. secret redaction в API, browser, logs и audit;
8. disconnect с сохранением historical canonical URLs;
9. branch → commit → push → PR на тестовом repository;
10. regression G0.1 при выключенной provider feature.

## Откат

Выключить provider feature, отозвать/uninstall GitHub App и остановить consumers. Ручные repository и Git
object links G0.1, canonical URLs и их Canvas projections продолжают работать.

## Источники, проверено 2026-09-19

- [Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)
- [Best practices for creating a GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app)
- [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
- [GitLab webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/)
