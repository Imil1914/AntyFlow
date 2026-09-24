---
type: implementation_task
project_id: intellect-ppm
task_id: AF1.1
status: deferred
priority: none
created: 2026-09-19
updated: 2026-09-23
---

# AF1.1 — AI и service nodes AntyFlow в web

Решение владельца от 2026-09-23: карточка снята с текущего плана PPM.
Ни AI-провайдеры, ни AI-чат, ни agent/service nodes не являются
критерием выпуска. Ниже сохранён отчёт о уже выполненной работе;
следующие шаги и критерии приёмки этой карточки не активны.

## Пользовательский результат

AI-чат, поиск, связанный контекст, Project Brain и оркестратор работают нодами на общей web-доске, не требуя
Electron/webview и не раскрывая ключи в браузер.

## Зависимости и входы

- AF0.3 и AF0.5 accepted;
- I0.8/I0.9 accepted;
- I1.3 approval/action foundation для write agents;
- approved model/provider and retention policy.

## Scope

- `ai_chat`, `search`, `agent_query`, `agent_answer`, `orchestrator`;
- контекст выделенных/связанных нод и видимый scope;
- citations, streaming, cancel/retry, versions;
- server provider profiles и secret references;
- proposal/preview/approval/audit для writes;
- adapters вместо desktop AnythingLLM/OpenScience/OpenCode/web-chat nodes;
- отдельный design/security gate для `code_job`/`notebook_job`.

## Не входит

- browser webview с чужими сайтами;
- хранение API keys в Canvas/browser;
- произвольный shell;
- unattended write agents;
- sandbox runtime до принятия отдельного threat model.

## Реализованный безопасный срез

21 сентября 2026 года начата реализация AF1.1 без подключения внешней модели:

- добавлен versioned тип Canvas-ноды `search` с запросом, областью поиска, режимом retrieval, degraded state и
  неизменяемым снимком до 12 найденных источников;
- Project Brain выполняет project-scoped поиск на сервере и сохраняет в ноду идентификатор, версию, locator,
  excerpt, score и ссылку каждого источника;
- кнопка «Сохранить на холст» создаёт ноду из результата именно выполненного запроса, даже если пользователь
  после поиска изменил текст или выделение;
- новый поиск и новый вопрос очищают устаревшие карточки прошлых agent runs, поэтому свежий результат больше не
  перекрывается завершившимся или зависшим агентом;
- нода сохраняется общей версией доски и восстанавливается после перезагрузки;
- добавлен versioned тип `orchestrator`: пользователь может закрепить на Холсте проверяемый снимок запуска
  Project Reporter, Work Decomposer, Knowledge Librarian или Relationship Analyst;
- orchestrator node показывает видимый статус запуска, action review summary, предложения, ссылки на уже
  применённые canonical результаты и версионированные citations;
- в снимок не попадают provider secrets, скрытый prompt или право выполнить действие; approval/apply остаются
  отдельными project-scoped командами API;
- timestamps запуска принимают стандартные timezone offsets API и проверяются схемой;
- повторное сохранение запуска работает как idempotent upsert по `run_id`: карточка сохраняет координаты и
  размеры, принимает только более свежий `run_updated_at` и не откатывается устаревшим ответом;
- карточка хранит ограниченную наблюдаемую хронологию статусов запуска и его предложений; после первого
  закрепления review/apply обновляют эту же карточку автоматически в текущей сессии;
- API запуска отдаёт отдельный безопасный `audit_trace`: только идентификатор события, его тип, связанное
  действие и время; `metadata_json`, actor id, prompts, tokens и служебные данные наружу не передаются;
- серверные события запуска и действий объединяются с наблюдаемым снимком по устойчивым trace id, поэтому
  реальные audit timestamps заменяют приблизительное время интерфейса без дублей;
- project isolation и redaction закреплены contract test: даже участник двух проектов получает `404` при
  попытке прочитать запуск через чужой project id;
- добавлены отдельные browser-safe `orchtask` и `orchcall` projections: действие запуска становится read-only
  «Задачей агента», а каждый подтверждённый action-status audit event — отдельным «Шагом агента»;
- кнопка «Разложить на холсте» создаёт/обновляет проекции рядом с карточкой запуска; task upsert использует
  `run_id + action_id`, call upsert — `run_id + trace_id`, поэтому события разных запусков не конфликтуют, а
  повторная команда не создаёт дубли;
- между `orchestrator`, `orchtask` и `orchcall` создаются устойчивые привязанные стрелки: они перемещаются вместе
  с карточками, не дублируются при повторном разложении и сохраняются в общей версии доски;
- если запуск уже был разложен, новое состояние review/audit автоматически обновляет его проекции и стрелки;
  факт разложения определяется по реальным объектам доски, поэтому закрытие панели и reload его не забывают;
- локальные исполнители записывают фактические вызовы allowlisted инструментов чтения, подготовки предложений и
  применения подтверждённых действий; browser получает только имя инструмента, режим, итог и число результатов,
  но не payload, prompt, actor, token usage или служебные metadata;
- server tool events становятся `tool_call` trace и отдельными read-only «Шагами агента»; вызовы без action
  образуют цепочку от orchestrator, а propose/apply вызовы связываются с соответствующей задачей агента;
- `search`, `agent_query`, `agent_answer` и `orchestrator` получили единый browser-safe `service_run` envelope:
  `run_id`, вид запуска, статус, provider/model, policy version и одинаковые created/started/finished/updated
  timestamps; поле optional в схеме, поэтому уже сохранённые карточки остаются читаемыми;
- stateless project search теперь получает server-authored UUID и завершённый run envelope, answer API явно
  сообщает `ppm-brain-answer-v1`, а agent API — фактический `started_at`; Canvas не придумывает эти данные;
- schema проверяет порядок lifecycle timestamps и согласованность статуса поиска с количеством результатов и
  degraded state; неизвестные поля вроде token/secret удаляются до сохранения на Холст;
- добавлен project-scoped потоковый `POST .../knowledge/agents/runs/stream/`: новый запуск последовательно отдаёт
  безопасные снимки `queued → running → final`, повтор того же `client_operation_id` возвращает уже существующий
  итог без повторного выполнения, а ошибка завершается redacted `error` event без traceback; конкурентная отмена
  остаётся нормальным terminal-снимком `cancelled` и не превращается в ложную красную ошибку;
- интерфейс всех четырёх Project Agents переключён на этот поток: карточка запуска появляется до завершения,
  `run_id` и кнопка отмены доступны во время работы, а финальный preview заменяет промежуточный снимок на месте;
  прежний JSON endpoint сохранён для совместимости;
- выполнение потокового запуска перенесено из процесса API в долговечную Celery/RabbitMQ-очередь; API только
  создаёт project-scoped run, ставит его в очередь и наблюдает сохраняемый lifecycle/audit через SSE;
- worker атомарно забирает только `queued` run, поэтому повторная доставка одного сообщения не исполняет агента
  дважды; beat recovery раз в минуту переотправляет потерянные queued runs;
- additive migration `ppm_brain.0008_agent_run_input_json` сохраняет только нормализованный allowlist-вход
  конкретного локального агента, необходимый worker после restart API; поле остаётся server-only и не попадает в
  API/Canvas/audit trace;
- additive migration `ppm_brain.0009_agent_run_worker_lease` добавляет ограниченную аренду, fencing token,
  идентификатор worker и счётчик попыток; эти служебные поля не выдаются browser;
- recovery теперь подхватывает не только `queued`, но и `running` run с истёкшей арендой. Новая попытка получает
  другой fencing token, поэтому проснувшийся старый worker не может дописать audit, proposal, citations или
  terminal status поверх актуального исполнения;
- повторное исполнение переиспользует детерминированные idempotency keys предложений и идентичный набор citations,
  не создавая дубли; после трёх аварийных попыток запуск безопасно становится `timed_out`;
- API сообщает только `attempt_count`, а панель показывает «Исполнение восстановлено» и номер попытки;
- пока Celery task жив, отдельный heartbeat-поток продлевает только его текущую fenced-аренду; после остановки
  процесса heartbeat прекращается и run становится доступен recovery;
- каждый локальный read/propose вызов публикует пару browser-safe progress-событий `running/completed` с одним
  `call_id`, временем, allowlisted именем/режимом и итоговым числом результатов; параметры, prompt, actor,
  token usage и произвольные metadata не передаются;
- UI показывает текущий или последний шаг агента, сохраняет завершённый шаг после быстрого локального запуска и
  блокирует поиск, вопрос или второй агентский запуск до terminal-снимка;
- при повторном открытии панели active `queued/running/applying` run выбирается приоритетно и наблюдается через
  project-scoped detail polling; UI показывает отдельное состояние «Наблюдение восстановлено», повторяет до трёх
  временных ошибок чтения и после terminal-снимка восстанавливает последний tool step из redacted audit;
- если active run отсутствует, панель открывает самый свежий запуск независимо от его terminal-статуса, поэтому
  completed/cancelled результат не перекрывается старым `timed_out`; отменённый Reporter показывает честное
  состояние «Сводка отменена», а не бесконечный spinner;
- поток сохраняет SHA-256 fingerprint и нормализованный allowlist-вход локального агента для восстановления
  очереди; произвольные поля, provider secrets, внутренний prompt и token metadata не принимаются и не
  сериализуются в браузер;
- проекции содержат только безопасные title/summary/status/result URL/timestamp и не переносят action payload,
  preconditions, audit metadata, prompt или provider secret;
- внешний AI provider, client-side secrets и write-действия в этот срез не добавлены.

Живой E2E выполнен в тестовом проекте `I03 Проверка`: запрос `Git` вернул 12 project-scoped источников, нода
была добавлена на Холст и сохранилась после reload. Дополнительно сохранены и восстановлены две orchestrator
cards: успешная read-only «Сводка проекта» с тремя citations и честный `timed_out` снимок декомпозиции. Upsert
проверен на уже существующей карточке без роста числа нод. Отдельный proposal-only запуск был закреплён,
три предложения отклонены без canonical mutation, карточка автоматически обновилась на месте до 9 событий
хронологии и сохранилась после reload. Затем существующая `timed_out` карточка получила серверный audit trace:
число объектов осталось 25, хронология выросла с 2 до 3 проверяемых событий и пережила reload.
Отдельный proposal-only E2E разложил новый запуск в 3 task и 3 call projections, повторная команда сохранила
то же число объектов, а после отклонения предложений добавила только 3 новых audit-step calls. Следующий E2E
подтвердил уже связный граф: после явного разложения Холст вырос с 51 до 58 PPM-объектов, панель была закрыта и
открыта снова со статусом «Карточка актуальна», а сохранение трёх отклонений автоматически обновило граф до 61
объекта без повторного нажатия. После reload сохранились 61 PPM-объект, 12 `orchtask`, 21 `orchcall`, 6
`orchestrator` и привязанные стрелки; реальные задачи проекта не создавались.
Затем read-only «Сводка проекта» прошла фактический telemetry E2E: server зафиксировал один вызов чтения списка
задач и три вызова чтения конкретных задач. Команда разложения увеличила Холст с 61 до 66 PPM-объектов — одна
карточка запуска и четыре tool-call карточки; после reload сохранились все 66 объектов, четыре шага, стрелки и
статус «Все изменения сохранены». Запуск оставался только для чтения.
Следующий E2E сохранил новый поиск `I0.8` с единым паспортом запуска: Холст вырос с 66 до 67 объектов, карточка
показала «Запуск · Ограниченный режим» и server timestamp, а после reload сохранились карточка, паспорт и все 67
объектов.
Потоковый E2E запустил новую read-only «Сводку проекта» из панели: web получил промежуточные снимки через новый
POST/SSE-контур и показал финальную сводку по 9 задачам без canonical mutation и без добавления новой карточки на
Холст. Серверный contract отдельно закрепил точную последовательность `queued → running → completed`,
идемпотентный replay и безопасный `queued → running → failed → error`.
Следующий живой E2E подтвердил безопасный tool progress в той же панели: после запуска остался видимый последний
шаг «Чтение задачи · Выполнено · результатов: 1», финальная сводка показала 9 задач / 1 завершённую / 3 риска,
кнопка «Обновить» снова стала доступна, ошибок не возникло. Задачи и Холст не изменялись. Production web build
завершился успешно.
Recovery E2E создал контролируемый `queued` Reporter, обновил страницу, снова открыл панель и увидел
«Наблюдение восстановлено» с заблокированными конкурирующими командами. Отмена завершила run без изменения
задач/Холста; после повторного открытия панель выбрала этот последний запуск, показала возможность повтора и
«Сводка отменена» вместо spinner.
Повтор агента теперь использует тот же project-scoped SSE-helper, что и первичный запуск: UI получает новый
`run_id`, живые снимки и tool progress, может отменить новую попытку, а исходный run остаётся связанным через
`run_retried_from`. Старый JSON retry endpoint сохранён для совместимости, replay одного operation id не
запускает runner повторно. Живой E2E повторил отменённую сводку, показал последний шаг «Чтение задачи ·
Выполнено · результатов: 1» и новый итог `9 / 1 / 0 / 3`; задачи и Холст не изменились.
Наблюдение за Answer run теперь тоже переживает reload: сервер отдаёт список последних собственных запусков,
панель выбирает самый свежий активный Answer/Agent run и повторно подключается к уже существующему Answer SSE с
polling fallback. Живой E2E прошёл `queued → reload → «Наблюдение за ответом восстановлено» → stop → reload →
«Запрос остановлен»` без canonical mutation.
Долговечная очередь проверена отдельно вживую: worker был остановлен, Reporter `3666bd36-5051-43d1-a958-8a6f8eb7bc51`
создан и отправлен в RabbitMQ, затем API перезапущен и worker возвращён. Запуск завершился без повторного запроса
со сводкой `9 / 1 / 0 / 3`; audit содержит ровно один `run_started` и один `run_completed`. Обычный запуск из
панели также прошёл через новый worker и сохранил прежний progress/итог без изменения задач или Холста.
Поиск, Answer и Project Agents теперь используют один browser-side POST/SSE parser и одинаковые события `run`,
`progress`, `error`, `timeout`. Для поиска и Answer добавлены совместимые streaming endpoints; прежние JSON и
GET-events маршруты сохранены. Поиск сразу отдаёт server-generated `run_id`, безопасный этап выполнения и
финальный результат, а его наблюдение можно остановить без изменения проекта. Answer создаётся и наблюдается
одним запросом, сразу показывает `queued` run, допускает отмену через существующую project-scoped команду и
после 45 секунд без terminal-состояния возвращает управление polling recovery, не отменяя работу. Живой E2E в
`I03 Проверка` подтвердил `/query/stream/` за 89 мс и `/answers/stream/` с реальным Celery worker: запрос
`I0.8 единый поток` завершился в `degraded` режиме с проверяемыми источниками и отобразился в обычной панели.
Следующий безопасный срез подготовил внешний completion adapter к реальному длительному вызову без включения
egress: OpenAI-compatible ответ читается потоково, закрывает stream при отмене и публикует только этап и число
полученных фрагментов. Worker проверяет project-scoped cancel между фрагментами и не сохраняет частичный ответ
или citations после остановки. Adapter проверен полностью локальным mock-контрактом; реальные project data наружу
не отправлялись. Одновременно завершён negative security suite для prompt-like payload, cross-project board/shape
IDs, provider error redaction и отсутствия server-only полей в detail/SSE replay.
Health API и панель теперь показывают безопасную readiness-модель без значения ключа. Даже при выбранном
provider внешний вызов закрыт, пока одновременно не заданы явное egress-разрешение, версия утверждённой политики
и отдельный `PPM_BRAIN_COMPLETION_API_KEY`; legacy `OPENAI_API_KEY` намеренно не используется Project Brain.

## Исторически незавершённое — не планируется к исполнению

- утвердить model/egress/retention policy;
- активировать server-side model/provider adapter только с утверждённой конфигурацией и добавить полноценную
  `ai_chat` ноду;
- проверить готовые heartbeat, потоковый progress и cooperative cancel на разрешённом реальном provider adapter;
- пройти живую отмену намеренно долгого provider-backed запуска после подключения разрешённого adapter;
- отдельно принять security gate для `code_job` и `notebook_job`.

## Критерии приёмки

1. AI node отвечает по разрешённому project context с citations.
2. Browser/network logs не содержат provider secrets.
3. Cross-project node/context ID не влияет на retrieval.
4. Cancel/retry не создаёт дублирующий write/result.
5. Любое изменение источника проходит preview/approve/version recheck/audit.
6. Desktop AI scenarios имеют строку adapter/status в parity matrix.
7. Недоступный provider даёт понятный degraded state без потери доски.

## Проверки

- `@ppm/canvas`: 36 unit tests, включая lifecycle/status/secret negative checks, browser-boundary audit и package
  build;
- Project Brain: 75 contract tests, включая 33 agent-foundation контракта для run envelopes, redaction,
  cross-project run id, долговечной очереди, duplicate delivery, queued/running recovery, worker fencing,
  attempt limit, потокового lifecycle,
  streaming retry, tool progress, replay, безопасной недоступности broker, terminal cancellation, строгого
  allowlist-входа, policy readiness без утечки ключа и cooperative provider-stream cancellation;
- Canvas API: 65 contract tests;
- web: 50 tests, format, lint, TypeScript и production build;
- browser E2E: search → save to Canvas → reload; agent run → snapshot → graph expansion → panel reopen →
  automatic review update → reload с сохранёнными стрелками; потоковая read-only сводка и видимый последний
  tool step через обычную панель; active run → reload → восстановление наблюдения → cancel → честный terminal UI;
  cancelled run → streaming retry → новый linked run → progress → завершённая сводка без canonical mutation;
  active Answer run → reload → восстановленный SSE/polling → stop → terminal state после повторного reload;
  queued Reporter → stop worker → restart API → start worker → completed с единственным start/completion audit;
  expired running Reporter → recovery worker → attempt `2` → completed с одним итогом и видимым сообщением
  восстановления без canonical mutation; streamed search → progress → 12 источников; streamed Answer → queued →
  Celery worker → degraded answer с citations в обычной панели; повторный поиск `изоляция проектов` после
  hardening → 12 разрешённых источников без ошибки и без сохранения нового объекта на Холст;
- provider/stream/cancel contracts, включая закрытие mock-stream при отмене и redacted progress;
- prompt injection/cross-project/secret negative suite — пройден;
- citation correctness;
- approval/idempotency/audit;
- visual/a11y/build.

## Rollback

Отключить AI/service node execution; сохранённые query/answer payload и citations остаются read-only.

## Stop rules

- требуется webview/credential scraping;
- model secret попадает в client;
- agent write выполняется без approval;
- sandbox boundary не доказана для code/notebook jobs.
