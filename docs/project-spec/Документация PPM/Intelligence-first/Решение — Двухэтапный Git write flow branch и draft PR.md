---
type: proposed_architecture_decision
project_id: intellect-ppm
decision_id: git-write-two-stage-flow
status: proposed
created: 2026-09-21
updated: 2026-09-21
owner_decision_required: true
---

# Решение — Двухэтапный Git write flow: branch, затем draft PR

## Почему требуется решение

Текущий preview G1.3 показывает branch и draft PR как одно предложение. Однако нормальный GitHub flow выглядит
так: создать branch, сделать и отправить commit, затем открыть pull request. Сразу после создания branch его head
совпадает с base; создавать скрытый пустой commit только ради PR небезопасно и не входит в подтверждённый preview.

Основание:

- [GitHub: quickstart for pull requests](https://docs.github.com/en/pull-requests/get-started/pull-request-quickstart)
  задаёт последовательность branch → changes/commit → pull request;
- [GitHub: создание Git reference](https://docs.github.com/en/rest/git/refs) требует repository permission
  `Contents: write`;
- [GitHub: создание pull request](https://docs.github.com/en/rest/pulls/pulls) требует repository permission
  `Pull requests: write`.

## Рекомендуемое решение

Разделить G1.3 на два явных подтверждаемых действия.

### Действие 1 — создать branch

Preview показывает repository, точный base SHA, имя новой branch, Work Item и provider account. После approve PPM
создаёт только новый ref. PPM не создаёт commit, не изменяет файлы и не делает force push.

### Действие 2 — создать draft PR

После первого commit/push PPM получает webhook/reconciliation, показывает новый preview: base/head SHA, commit
summary, Work Item, PR title/body и provider account. Только новое approve создаёт draft PR. Webhook сам по себе
никогда не запускает provider write.

## Минимальные права GitHub App

- `Metadata: read` — штатное обязательное чтение GitHub App;
- `Contents: write` — только создание нового branch ref;
- `Pull requests: write` — только создание draft PR;
- `Workflows: write`, `Administration: write`, `Issues: write` и merge permission не запрашивать.

Installation token запрашивается только для выбранного repository. Токен не сохраняется и не передаётся browser.

## Preconditions и идемпотентность

- branch apply повторно проверяет installation, repository, base ref и base SHA;
- существующая branch считается replay только если она уже связана с тем же action и ожидаемым исходным SHA;
- чужая branch с тем же именем даёт `conflict`, PPM её не двигает и не удаляет;
- draft PR apply требует head SHA, отличающийся от base SHA;
- существующий PR считается replay только при совпадении repository/base/head и сохранённого provider object id;
- rate limit, revoked token, permission drift и protected-branch rejection сохраняются как видимая ошибка без
  скрытого повтора;
- merge отсутствует во всех API, capability и UI PPM.

## Отклонённый вариант

Не создавать автоматический «пустой» commit ради мгновенного draft PR. Это дополнительная запись в repository,
которой нет в preview, она загрязняет историю и смешивает создание branch с изменением кода.

## Rollout после решения владельца

1. Обновить GitHub App permissions и повторно принять их в GitHub.
2. Добавить отдельный branch apply endpoint за `PPM_GIT_WRITE_ENABLED=0`.
3. Добавить webhook-aware готовность второго preview после commit/push.
4. Добавить отдельный draft PR apply endpoint.
5. Пройти живой E2E и только затем разрешить write-флаг для выбранного тестового проекта.

## Требуемое решение владельца

Подтвердить двухэтапный flow и минимальные права выше либо отдельно потребовать другой сценарий. До решения
provider write остаётся выключен.
