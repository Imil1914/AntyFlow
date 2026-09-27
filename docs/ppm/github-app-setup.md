# Настройка GitHub App для PPM

Эта инструкция завершает внешний gate карточки G1.1. Секреты нельзя добавлять в Git, документацию, сообщения
или клиентский `.env`: они задаются только на API-сервере через secret files или защищённые переменные окружения.

## 1. Публичный адрес

GitHub должен обращаться к API PPM по стабильному HTTPS-адресу. Обозначим его как
`https://api.ppm.example`. Для локальной проверки допустим временный HTTPS tunnel, если владелец явно разрешил
его публикацию.

## 2. Поля GitHub App

Создайте GitHub App и укажите:

- **Homepage URL:** публичный адрес PPM;
- **Callback URL:** `https://api.ppm.example/api/ppm/v1/git/github/callback/`;
- **Request user authorization (OAuth) during installation:** выключено;
- **Setup URL:** `https://api.ppm.example/api/ppm/v1/git/github/setup/`;
- **Redirect on update:** выключено;
- **Webhook:** включён;
- **Webhook URL:** `https://api.ppm.example/api/ppm/v1/git/github/webhook/`;
- **Webhook secret:** отдельное случайное значение из secret store.

PPM после Setup URL сам запускает OAuth-подтверждение с `state` и PKCE. Callback URL должен совпадать точно;
wildcard matching включать не нужно.

## 3. Минимальные права

Repository permissions:

- `Contents: Read-only`;
- `Pull requests: Read-only`;
- `Metadata: Read-only` добавляется GitHub автоматически.

События:

- `Installation`;
- `Installation repositories`;
- `Push`;
- `Pull request`.

Для первого gate достаточно разрешить установку на тестовый аккаунт или организацию и выбрать один тестовый
репозиторий.

## 4. Секреты API-сервера

Задайте на сервере:

```text
PPM_GITHUB_APP_ID
PPM_GITHUB_APP_SLUG
PPM_GITHUB_APP_CLIENT_ID
PPM_GITHUB_CALLBACK_URL
PPM_GITHUB_APP_CLIENT_SECRET_FILE
PPM_GITHUB_APP_PRIVATE_KEY_FILE
PPM_GITHUB_WEBHOOK_SECRET_FILE
```

`PPM_GITHUB_CALLBACK_URL` должен точно совпадать с Callback URL из GitHub App. Временный user access token и
installation access token PPM создаёт по требованию и не сохраняет.

## 5. Контрольный сценарий

1. РП открывает проект → `Код` → `Подключить GitHub`.
2. Устанавливает App только на выбранный repository и подтверждает OAuth.
3. Выбирает repository в PPM и запускает синхронизацию.
4. Создаёт branch с ключом Work Item, commit, push и pull request.
5. PPM получает webhook один раз и связывает branch/commit/PR с Work Item этого project.
6. Один webhook намеренно пропускается; reconciliation восстанавливает metadata.
7. После disconnect/revoke новые вызовы GitHub прекращаются, исторические ссылки остаются читаемыми.

Перед шагом 4 и после первой доставки запустите на API-сервере read-only проверку:

```bash
python manage.py ppm_github_webhook_status \
  --expected-url https://api.ppm.example/api/ppm/v1/git/github/webhook/ \
  --require-delivery
```

Команда ничего не меняет в GitHub, не печатает secret или JWT и завершает gate только при существующей
конфигурации, точном URL и хотя бы одной зарегистрированной доставке. Если webhook ещё не сохранён, она явно
сообщит: `Webhook GitHub App не активирован или ещё не сохранён`.

Только после этого G1.1 можно перевести в `review` и показать владельцу.

## 6. Запись: ветка и черновик PR (G1.3, по умолчанию выключено)

Порядок утверждён владельцем 2026-09-26 ([решение](<../project-spec/Документация PPM/Intelligence-first/Решение — Двухэтапный Git write flow branch и draft PR.md>)):
два отдельных подтверждения — сначала ветка от показанного коммита, затем, после первого commit/push, черновик
PR. Merge из PPM невозможен.

1. В GitHub App → `Permissions & events` → `Repository permissions` выставьте `Contents: Read and write` и
   `Pull requests: Read and write`. Больше ничего не добавляйте (`Workflows`, `Administration`, `Issues` не нужны).
2. В установке приложения примите запрос новых прав только для нужных репозиториев.
3. В PPM: проект → `Код` → «Проверить права»; обе строки прав должны стать «готово».
4. Включите запись на API-сервере: `PPM_GIT_WRITE_ENABLED=1` (без него apply отвечает «Запись в GitHub выключена
   администратором PPM», а страница `Код` показывает ручные команды).
5. Контрольный сценарий (живой E2E, в RC не пройден — нет тестового репозитория): задача → «Новая ветка для
   задачи» → точный предпросмотр → «Подтвердить создание ветки» → «Создать ветку в GitHub» → commit и push в ветку
   → «Подготовить черновик PR» (коммиты видны в предпросмотре) → подтвердить → «Создать черновик PR в GitHub» →
   повтор применения не создаёт дубликат, PR связан с задачей.

Имена веток для записи — только латинские буквы, цифры и `. _ / -` (правила Git, до 244 символов): так ручные
команды, которые PPM показывает при выключенной записи, безопасны в любом терминале. Прерванное применение
(таймаут GitHub, сбой сервера) нельзя отменить — только «Повторить»: PPM сверится с GitHub и зафиксирует уже
созданную ветку или PR.

Откат: `PPM_GIT_WRITE_ENABLED=0` и вернуть права `Read-only`; созданные ветки и PR остаются в GitHub.
