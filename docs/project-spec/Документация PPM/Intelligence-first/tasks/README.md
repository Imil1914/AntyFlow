---
type: implementation_queue
project_id: intellect-ppm
status: active
version: 46
created: 2026-09-12
updated: 2026-09-27
---

# Очередь задач Intelligence-first

Решение владельца от 2026-09-23: I0.9, AF1.1, I1.3 и I1.4 сняты с текущей
очереди. AI-провайдеры и проектные агенты не являются зависимостью Git,
совместного Холста или выпуска PPM. Реализованный ранее код остаётся
историческим результатом; возобновление требует отдельного решения.

## Правила исполнения

- одна карточка — одна reviewable ветка/изменение;
- `accepted` выставляет только владелец после демонстрации;
- зависимость должна иметь фактический результат, а не только отметку;
- при блокировке не расширять scope молча;
- новые обязательные требования добавляются в [../20 — Матрица требований и трассировка](<../20 — Матрица требований и трассировка.md>);
- старая очередь PF0 сохранена как история и не исполняется параллельно.

## Этап I0 — демонстрационное ядро

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [I0.1 — Fork, pin, лицензия и чистый baseline Plane](<I0.1 — Fork, pin, лицензия и чистый baseline Plane.md>) | P0 | `review` | решение владельца | Plane v1.4.2 и golden/restart gate подтверждены CI |
| [I0.2 — PPM brand foundation и token bridge](<I0.2 — PPM brand foundation и token bridge.md>) | P0 | `review` | решение владельца | темы/assets/components PPM |
| [I0.3 — PPM shell, русская локализация и первый вход](<I0.3 — PPM shell, русская локализация и первый вход.md>) | P0 | `accepted` | I0.2 | пользователь не видит Plane на основном пути |
| [I0.4 — Web Canvas route и browser-safe AntyFlow core](<I0.4 — Web Canvas route и browser-safe AntyFlow core.md>) | P0 | `accepted` | I0.3 | открывается `Мозг проекта` |
| [I0.5 — Canvas persistence, версии и права](<I0.5 — Canvas persistence, версии и права.md>) | P0 | `accepted` | I0.4 | общий сохраняемый Canvas project |
| [I0.6 — Проекция Plane Work Item на Canvas](<I0.6 — Проекция Plane Work Item на Canvas.md>) | P0 | `review` | I0.5 | одна задача в двух представлениях |
| [I0.7 — Project Vault Markdown и PDF MVP](<I0.7 — Project Vault Markdown и PDF MVP.md>) | P0 | `review` | I0.3 | реализовано, требуется решение владельца |
| [I0.8 — Project Brain ingestion и изолированный индекс](<I0.8 — Project Brain ingestion и изолированный индекс.md>) | P0 | `review` | I0.6, I0.7 | реализовано: versioned ingestion, изоляция, keyword/hybrid retrieval и UI |
| [I0.10 — Единый demo deploy и release gate](<I0.10 — Единый demo deploy и release gate.md>) | P0 | `review` | I0.8, AF1.2 | единый deploy и parity текущего объёма |

## Этап AF0 — полноценный AntyFlow Canvas в web

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [AF0.1 — Multi-board Canvas и глобальный администратор](<AF0.1 — Multi-board Canvas и глобальный администратор.md>) | P0 | `review` | решение владельца | реализовано, требуется решение владельца |
| [AF0.2 — AntyFlow web shell и навигация по доскам](<AF0.2 — AntyFlow web shell и навигация по доскам.md>) | P0 | `review` | решение владельца | реализовано, требуется решение владельца |
| [AF0.3 — Browser-safe runtime и базовые ноды AntyFlow](<AF0.3 — Browser-safe runtime и базовые ноды AntyFlow.md>) | P0 | `review` | решение владельца | реализовано, требуется решение владельца |
| [AF0.4 — Work Item views, Kanban и backlog AntyFlow](<AF0.4 — Work Item views, Kanban и backlog AntyFlow.md>) | P0 | `review` | решение владельца | реализовано, требуется решение владельца |
| [AF0.5 — Файлы, PDF, изображения, схемы и презентации на Canvas](<AF0.5 — Файлы, PDF, изображения, схемы и презентации на Canvas.md>) | P0 | `review` | AF0.3, I0.7 | реализовано, требуется решение владельца |

## Этап AF1 — совместная работа AntyFlow

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [AF1.2 — Realtime и gate полной совместимости AntyFlow](<AF1.2 — Realtime и gate полной совместимости AntyFlow.md>) | P0 | `review` | AF0.1–AF0.5 | Chrome/Firefox/WebKit по `19/19`: права/отзыв, глобальный администратор без членства с WebSocket audit, offline/reconnect, долговечный черновик, повтор сохранения с прежним operation ID при временном HTTP-сбое, `320 px`, Axe WCAG A/AA и 300 фигур. Web unit suite `92 passed`; TypeScript/Oxlint/Oxfmt и production build прошли. Синтетический `.flow.json` импортирован в «I03 Проверка» и пережил reload. Полный локальный ARM64 gate восстановил PostgreSQL, Vault и Plane attachment в отдельные БД/тома/хранилище и проверил контрольные суммы, вход четырёх ролей и межпроектный запрет. Опубликованный CI workflow, реальный desktop-файл, очередь для закрытого браузера, ручной a11y/скринридер, целевая VM и owner-approved parity остаются открытыми |

## Этап UX/ADM — завершение оболочки и защищённое администрирование

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [ADM0.1 — Центр глобального администратора](<ADM0.1 — Центр глобального администратора.md>) | P0 | `review` | AF0.1 | реализовано, требуется решение владельца |
| [UX0.1 — Завершение оболочки и терминологии PPM](<UX0.1 — Завершение оболочки и терминологии PPM.md>) | P0 | `review` | I0.3, AF0.2 | реализовано, требуется решение владельца |
| [UX0.2 — Исправления дизайна: токены, доступность, Холст и словарь](<UX0.2 — Исправления дизайна: токены, доступность, Холст и словарь.md>) | P0 | `review` | I0.6, UX0.1 | видимые состояния, AA-контраст, «Найти в проекте», единый русский словарь, доступность |
| [UX1.1 — Новый облик PPM: система, Холст и Задачи](<UX1.1 — Новый облик PPM: система, Холст и Задачи.md>) | P1 | `review` | UX0.2 | гибрид A+B: токены, шрифты, плотность, оболочка, «Задачи» (шкала спринта, материалы, куратор), «Холст» (связи на холсте, живые карточки, инспектор); откат флагом |
| [AF2.1 — Инструменты Холста: панель по группам, стикеры, схемы, заметки, код, файлы](<AF2.1 — Инструменты Холста: панель по группам, стикеры, схемы, заметки, код, файлы.md>) | P1 | `review` | UX1.1 | П1 «Холст 2.0»: панель по группам, стикеры, фигуры со «+», цвет у любого объекта, заметки с Markdown и формулами, блок кода, документы, вставка файлов в Хранилище с просмотром и скачиванием, канбан; только под новым обликом |
| [UX2.1 — Изменения в реальном времени для всех участников](<UX2.1 — Изменения в реальном времени для всех участников.md>) | P1 | `planned` | G2.1 | изменения задач, спринтов и направлений сразу видны у всех участников (быстрая часть — автообновление графиков — сделана в G2.1, линия S) |
| [AF2.2 — Живая карта проекта: сборка из спринта, светофор, «Не на карте», «Что изменилось»](<AF2.2 — Живая карта проекта: сборка из спринта, светофор, «Не на карте», «Что изменилось».md>) | P1 | `review` | AF2.1 | П2 «Холст 2.0»: «Карта спринта» одной кнопкой (рамка спринта, секции по направлениям, живые карточки), связи «из Задач», «Светофор», лоток «Не на карте», «Что изменилось с …» с личной отметкой, «На карте» в задаче; сервер — пакетная привязка, лента изменений, отметка просмотра; только под новым обликом |

## Этап I1 — устойчивый интеллект

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [I1.1 — Vault backlinks, export и расширенные проекции](<I1.1 — Vault backlinks, export и расширенные проекции.md>) | P1 | `review` | I0.7, AF0.5 | реализовано: backlinks, versions/trash, ZIP и явный обмен с Документами |
| [I1.2 — Semantic GraphRAG и память проекта](<I1.2 — Semantic GraphRAG и память проекта.md>) | P1 | `review` | I1.1 | реализованы confirmed graph paths, depth `0–2`, rank bonus и versioned Project Memory |

## Этап G — Git

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [G0.1 — Repository links и ручные связи с Work Items](<G0.1 — Repository links и ручные связи с Work Items.md>) | P0 | `accepted` | AF0.1 | repository URLs и ручные Git↔Work Item/Canvas links |
| [G1.1 — Первый внешний Git provider и webhooks](<G1.1 — Первый внешний Git provider и webhooks.md>) | P0 | `review` | G0.1 | GitHub App, commits/PR sync и подписанный repository webhook проверены вживую |
| [G1.2 — Git projections и code RAG](<G1.2 — Git projections и code RAG.md>) | P0 | `review` | G1.1, I1.2, AF0.3 | проекции, code indexing, citations и revoke проверены вживую |
| [G1.3 — Git write actions и draft PR с подтверждением](<G1.3 — Git write actions и draft PR с подтверждением.md>) | P0 | `review` | G1.1, Git write-permission ADR | preview/decision, provider primitives и live permission diagnostics готовы; apply выключен до ADR |
| [G2.1 — ADR и внедрение self-hosted Git provider](<G2.1 — ADR и внедрение self-hosted Git provider.md>) | P0 | `review` | G1.2, O0.1 | собственный Git-сервер Forgejo рядом с PPM (решение владельца 2026-09-28, объём «Быстрый»): push/pull/PR на своём сервере, провайдер `forgejo` в PPM, бэкапы и RUNBOOK |
| [G2.2 — Единый вход через PPM и автодоступы к коду](<G2.2 — Единый вход через PPM и автодоступы к коду.md>) | P1 | `planned` | G2.1 | вход в Forgejo через PPM, доступ к коду следует за проектами PPM |
| [G2.3 — Коммиты и PR в отчётах о работе](<G2.3 — Коммиты и PR в отчётах о работе.md>) | P1 | `planned` | G2.1 | вставка коммита/PR в документы и комментарии, сводка «что сделано за период» |

## Этап O — production и финальная приёмка

| Задача | P | Статус | Зависит от | Результат |
|---|---:|---|---|---|
| [O0.1 — Production hardening, backup и observability](<O0.1 — Production hardening, backup и observability.md>) | P0 | `review` | AF1.2, G1.3, I0.10 | воспроизводимый deploy и проверенное восстановление |
| [O0.2 — PPM release candidate и финальная приёмка](<O0.2 — PPM release candidate и финальная приёмка.md>) | P0 | `in_progress` | O0.1, обязательные gates | единая принятая сборка PPM |

## Следующее действие

Решение владельца 2026-09-28: PPM выкладывается на сервер вместе с собственным Git-сервером Forgejo (G2.1, объём
«Быстрый»); G2.1 реализована и проверена сквозной проверкой (RC.2, коммиты plane-fork 4d015f7ba1…); ждёт приёмки владельца и выкладки. PPM 1.0 RC.1 собран и закоммичен (2026-09-27): приёмка владельца по чек-листу «Чек-лист приёмки владельца — PPM 1.0 RC»
на локальном стенде, решения перед открытием доступа (AGPL-публикация исходников, условия tldraw SDK), затем
развёртывание на сервере владельца по `plane-fork/deployments/ppm/RUNBOOK.md`. Заметки о выпуске и известные
ограничения — `../RELEASE-NOTES-1.0-RC.md`.

## Исторический журнал реализации до решения 2026-09-23 — неисполняемый архив

Провести owner review G1.1/G1.2 и I1.2. Внешний Git gate завершён на реальном GitHub App и репозитории:
подписанный repository webhook, PR-проекция, code indexing, citations, disconnect/purge/reconnect и защита от
устаревшего worker проверены. App-level webhook остаётся известным ограничением для будущих repositories, но
текущий repository webhook с reconciliation работает.

Безопасный foundation I1.3 и все четыре proposal-only вертикальных среза реализованы без внешней модели:
Project Reporter формирует read-only сводку, Work Decomposer — три черновика задач, Knowledge Librarian —
Markdown-черновик из актуального материала Хранилища, Relationship Analyst — типизированную связь между двумя
выбранными объектами Холста. Selective approve/reject доступен только роли с правом редактирования, повторно
проверяет версии источников и сам по себе не изменяет canonical Work Items, Vault или Canvas semantic edges:
поддержанные записи выполняются только отдельной apply-командой после review. Work
Decomposer создаёт три независимых proposal actions: РП может сохранить только выбранные approve/reject, а
сводка явно показывает принятое, отклонённое и оставшееся. Контролируемый тайм-аут переводит зависшие
`queued`/`running` попытки в `timed_out`, отменяет неприменённые предложения и оставляет `awaiting_approval`
доступным для решения пользователя. Три canonical applier уже реализованы и включены только в локальной
тестовой сборке: создание выбранных Work Items, нового Markdown-файла Хранилища и подтверждённой semantic edge.
В исторической очереди внешний model/provider зависел от model/egress/retention policy;
решение 2026-09-23 сняло эту работу с плана. Cancel/retry реализованы: непринятые действия отменяются без canonical mutation, а повтор требует
те же параметры, создаёт новый run и сохраняет связь в аудите.

G1.3 переведена в `in_progress`: готов локальный точный preview ветки и draft PR, project-scoped
approve/reject, idempotency, stale-source conflict и audit. Внешняя запись по умолчанию выключена, GitHub не
изменяется, apply endpoint ещё не реализован. GitHub provider primitives создания/replay ветки и draft PR уже
покрыты контрактами, но не доступны из пользовательского API. Раздел «Код» теперь показывает готовность каждой
connection, требуемые и отсутствующие permissions, состояние write-флага и все blockers. Кнопка «Проверить права»
перечитывает актуальное состояние установки GitHub App и обновляет локальную диагностику без provider write.
После принятия новых scopes GitHub webhook автоматически обновляет подключённые repositories; UI объясняет точные
шаги выдачи прав и необходимость отдельного подтверждения действий.

AF1.1 также переведена в `in_progress` безопасным независимым срезом: Project Brain умеет сохранить результат
project-scoped поиска на общий Холст как versioned `search`-ноду со снимком запроса, scope, retrieval mode и
ссылками на 12 источников. Живой сценарий search → save → reload проверен в `I03 Проверка`. Внешняя модель и
секреты не подключались. Следом добавлены versioned `orchestrator` snapshots четырёх проектных агентов:
статус, рассмотренные действия, applied-result links и citations сохраняются на общем Холсте без скрытого prompt
и без обхода approval/apply. Успешная сводка и `timed_out` запуск прошли save/reload E2E.
Повторное сохранение теперь обновляет существующую карточку по `run_id`, защищено от stale ответа и сохраняет
наблюдаемую хронологию. Proposal-only E2E подтвердил автоматическое обновление одной карточки после отклонения
трёх действий: canonical сущности не менялись, 9 trace events пережили reload.
API теперь добавляет к запуску redacted server audit trace без metadata, actor id, prompts и tokens. Холст
объединяет серверные события с observed trace по устойчивым идентификаторам и сохраняет реальные timestamps без
дублей. Contract test подтвердил project isolation по project id; живой E2E обновил существующую `timed_out`
карточку с 2 до 3 событий при неизменных 25 объектах и сохранил результат после reload.
Следом реализованы отдельные read-only `orchtask`/`orchcall` projections действий и server audit steps. Явная
команда «Разложить на холсте» идемпотентна по action/trace id и не переносит payload, metadata или prompt. Живой
proposal-only E2E подтвердил create → повтор без дублей → reject → update: после reload сохранены 44 объекта,
включая 6 задач агента и 12 шагов двух тестовых запусков; canonical Work Items не создавались.
Проекции теперь образуют видимый граф `orchestrator → task → call`: привязанные стрелки сохраняются и двигаются
вместе с карточками. Идентичность call учитывает одновременно run и trace, поэтому одинаковые trace id разных
запусков не конфликтуют. Уже разложенный запуск автоматически обновляется после review даже после закрытия и
повторного открытия панели. Живой E2E подтвердил `51 → 58 → 61` PPM-объект, сохранение стрелок после reload и
отсутствие canonical Work Items после трёх отклонений.
Следующий срез добавил фактическую telemetry локальных исполнителей: allowlisted read/propose/apply tool calls
пишутся в redacted audit и раскладываются в те же call-карточки. Browser не получает параметры вызова, prompts,
actor id, tokens или произвольные metadata. Read-only E2E «Сводки проекта» создал одну orchestrator-карточку и
четыре tool-call шага (`61 → 66` PPM-объектов); граф и стрелки сохранились после reload без изменений проекта.
Search, question/answer и orchestrator теперь сохраняют одинаковый server-authored `service_run` passport со
статусом, policy/provider/model и полным набором timestamps. Живой поиск `I0.8` увеличил Холст `66 → 67`, а
паспорт и карточка сохранились после reload; старые карточки читаются без миграции.
Создание всех четырёх агентов теперь использует project-scoped POST/SSE-поток: UI получает `run_id` сразу,
показывает промежуточный запуск и открывает отмену до финала. Серверные контракты закрепляют
`queued → running → completed`, идемпотентный replay и redacted failure; прежний JSON endpoint сохранён.
Живая read-only сводка завершилась через новый поток в обычной панели без изменения задач или Холста.
Каждый локальный read/propose шаг теперь дополнительно отдаёт безопасное progress-событие с устойчивым `call_id`,
именем, режимом, статусом и количеством результатов. Payload, prompt, actor, tokens и произвольные metadata не
покидают backend. Выполнение перенесено в Celery/RabbitMQ worker: SSE читает сохраняемый run/audit, duplicate
delivery атомарно отсекается, а beat восстанавливает queued runs. Нормализованный allowlist-вход хранится только
на сервере и не сериализуется в браузер. UI показывает текущий/последний шаг и не запускает вторую операцию
поверх активного агента. Живой E2E подтвердил «Чтение задачи → Выполнено · результатов: 1» и итоговую
сводку по 9 задачам; production web build пройден. После reload браузера
панель уже находит активный run, показывает «Наблюдение восстановлено», project-scoped detail polling доводит
его до terminal-снимка, а последний завершённый tool step восстанавливается из redacted audit. Живой E2E создал
контролируемый `queued` run, подтвердил восстановление после reload и безопасную отмену; после повторного открытия
показан именно последний отменённый запуск и честное состояние «Сводка отменена». На recovery-срезе web suite: 46 тестов,
TypeScript, Oxfmt, Oxlint и production build пройдены. Внешний provider зависит от решения владельца о
model/egress/retention policy.
Retry теперь также идёт через единый POST/SSE-helper: создаётся новый связанный run, браузер сразу получает его
`run_id`, живые tool progress и возможность отмены, а replay не дублирует исполнение. JSON retry сохранён для
совместимости. Живой повтор отменённой сводки завершился новым результатом `9 / 1 / 0 / 3` и последним шагом
«Чтение задачи · Выполнено · результатов: 1» без изменений задач и Холста.
Answer runs теперь также восстанавливаются после reload: API возвращает только последние собственные запуски,
панель выбирает самый свежий активный Answer/Agent run и повторно подключается к Answer SSE с polling fallback.
Живой E2E прошёл `queued → reload → восстановление → stop → reload → «Запрос остановлен»` без canonical
mutation. Web suite расширен до 48 тестов; production build повторно пройден.
Долговечная очередь Project Agents теперь переживает restart API: live-проверка остановила worker, поставила
Reporter в RabbitMQ, перезапустила API и вернула worker; run завершился со сводкой `9 / 1 / 0 / 3` и ровно одним
`run_started`/`run_completed`. Повторная доставка не исполняет run дважды, queued recovery и безопасная ошибка
недоступной очереди покрыты контрактами. Project Brain suite расширен до 58 тестов, agent foundation — до 27;
web suite остаётся 48 тестов, TypeScript, Oxfmt и Oxlint пройдены.
Поиск, Answer и Project Agents теперь используют общий POST/SSE-контракт и один browser parser. Новые
`query/stream/` и `answers/stream/` сразу отдают `run_id`, безопасный progress и terminal snapshot; поиск можно
остановить без mutation, Answer сохраняет server run и после разрыва продолжает существующий recovery/polling.
Старые JSON/query и Answer create/events endpoints сохранены. Живой E2E выполнил streamed `Git` search и Answer
`I0.8 единый поток` через Celery worker в обычной панели. Следующий security/provider срез закрепил строгий
allowlist входов, redaction server-only полей, cross-project board/shape deny, потоковый completion adapter,
безопасный progress, cooperative cancel без публикации частичного ответа и отдельный policy/key readiness gate.
Project Brain suite теперь содержит 75 тестов, agent foundation — 33, web — 50; TypeScript, Oxfmt, Oxlint и
production build пройдены.
AF1.2 начата отдельным board-presence срезом: ASGI/WebSocket и Redis channel layer изолируют комнаты по
workspace/project/board, session-auth запрещает outsider и cross-project подключение, read-only guest допускается
без права записи, revoke закрывает соединение по heartbeat, а доступ global admin фиксируется аудитом. Web
показывает reconnect/offline/denied state и число участников. Чистая пересборка и restart API сохранили живое
подключение; Canvas API — 69 тестов, web — 53. Синхронизация операций доски, удалённые курсоры,
conflict/offline recovery и полный parity gate ещё не закрыты.
На дату этого исторического журнала I1.1, I0.6–I0.9 и AF0.1–AF0.5
ожидали review; решение 2026-09-23 сняло I0.9 с текущего release gate.
Действующая последовательность определена в
[../22 — Полный план завершения PPM](<../22 — Полный план завершения PPM.md>).
