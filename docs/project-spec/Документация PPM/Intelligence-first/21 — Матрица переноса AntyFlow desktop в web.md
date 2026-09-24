---
type: parity_matrix
project_id: intellect-ppm
status: current
version: 27
created: 2026-09-19
updated: 2026-09-23
---

# 21 — Матрица переноса AntyFlow desktop в web

## Назначение

Матрица не позволяет назвать минимальный tldraw экран «перенесённым AntyFlow». Каждая возможность desktop-прототипа
получает web-результат, задачу, проверку и честный статус.

Статусы действующих строк: `existing`, `ready`, `planned`, `blocked-decision`,
`approved-non-goal`, `done`. Решением владельца от 2026-09-23 AI-провайдеры,
AI-чат и агенты исключены из текущей матрицы и gate AF1.2. Их прежние строки
приведены ниже только в историческом архиве со статусом `deferred`.

## Оболочка и работа с досками

| Desktop AntyFlow | Целевой web PPM | Задача | Статус |
|---|---|---|---|
| бесконечный tldraw Canvas | project-scoped tldraw board | I0.4/I0.5 | existing |
| список/создание досок | один Canvas проекта, много server boards | AF0.1 | ready |
| быстрое переключение | вкладки нескольких открытых досок | AF0.2 | planned |
| панель категорий нод | AntyFlow rail/palette/flyouts | AF0.2 | planned |
| drag/drop ноды | browser drag/drop с project scope | AF0.2/AF0.3 | planned |
| command palette/hotkeys | PPM command palette и keyboard map | AF0.2 | planned |
| zoom/pan/fit/minimap | эквивалентное camera behavior | AF0.2 | planned |
| global search/navigation | поиск shapes/boards/sources | AF0.2/I0.8 | planned |
| темы AntyFlow | PPM tokens, dark/light, reduced motion | AF0.2 | planned |
| status bar и minimap | board status, zoom, selection metrics и minimap | AF0.2 | planned |
| fullscreen ноды | browser portal/fullscreen overlay с теми же permission | AF0.2/AF0.3 | planned |
| collapse/resize нод | сохранённые размеры и состояния в board snapshot | AF0.3 | planned |

## Ноды и артефакты

| Desktop node/feature | Целевой web PPM | Задача | Статус |
|---|---|---|---|
| note/Markdown | `note` | I0.4 + AF0.3 | existing/upgrade |
| group/frame | `group/frame` | I0.4 + AF0.3 | existing/upgrade |
| document | `document` либо Vault projection | AF0.3/AF0.5 | planned |
| list/checklist | Canvas-native `checklist` | AF0.3 | planned |
| sheet | `table`, optional Vault export | AF0.3/AF0.5 | planned |
| code/codeblock | non-executing `code` | AF0.3 | planned |
| formulas, CSV/XLSX import/export | browser-safe table engine + file export | AF0.3/AF0.5 | planned |
| Mermaid diagram и разбор flowchart | sanitized `diagram`, optional conversion to shapes | AF0.3/AF0.5 | planned |
| image/reference | Vault/attachment-backed nodes | AF0.5 | planned |
| PDF preview и поиск | Vault PDF projection + Project Brain search | AF0.5/I0.8 | planned |
| PDF page selection/chunks | server extraction + stable page/fragment citation | AF0.5/I0.8 | planned |
| deck/slides | `deck`/`slide`, themes, fullscreen, PDF/PPTX export | AF0.3/AF0.5 | planned |
| work item card | Plane-backed `work_item_ref` | I0.6/AF0.4 | existing/upgrade |
| search node | project-scoped knowledge/source search + сохранённые citations | I0.8/I1.2 | existing/upgrade |
| Kanban/backlog | Plane-backed `work_items_view` | AF0.4 | ready for owner review |
| visual/semantic arrows | board-scoped links/edges | I0.4 + AF0.1/AF0.3 | existing/upgrade |
| connected context | selected + neighbor graph scope | I1.2 | planned |
| day lane/timeline axis | `daylane`/`tlaxis` с project timezone | AF0.3 | planned |
| память доски/digest | `boardmem` поверх Project Brain, citations и versions без AI-модели | I1.2 | planned |
| повреждённая/неизвестная нода | сохранение raw payload и диагностический fallback | AF0.3/AF1.2 | planned |

## Исторический архив — исключённые AI, агенты и вычисления

Этот раздел не является планом работ и не участвует в оценке готовности PPM 1.0.

| Desktop AntyFlow | Безопасный web-эквивалент | Задача | Статус |
|---|---|---|---|
| AI chat node | `ai_chat` через server model adapter | AF1.1 | deferred |
| вложения AI: image/file/doc | Vault-backed attachments с permission и limits | AF1.1 | deferred |
| голосовой ввод | server/browser transcription adapter с consent и limits | AF1.1 | deferred |
| выбор моделей/token budget | policy-filtered model list и server-side limits | AF1.1 | deferred |
| answer node с AI-моделью | citations + immutable common run envelope | I0.9/AF1.1 | deferred |
| создание/заполнение связанных нод из AI | action preview + selective approval | I1.3/AF1.1 | deferred |
| orchestrator | Project Agents + preview/approval/audit | I1.3/AF1.1 | deferred |
| task/call trace overlays | persisted `orchtask`/`orchcall` graph с bound arrows, auto-update и redacted local tool telemetry | I1.3/AF1.1 | deferred |
| AnythingLLM | connector либо PPM RAG adapter | AF1.1 | deferred |
| OpenScience | external/source tools adapter | I1.4/AF1.1 | deferred |
| OpenCode/terminal | sandboxed project job, no browser shell | AF1.1 + security ADR | deferred |
| Jupyter notebook | managed kernel/job + stored outputs | AF1.1 + security ADR | deferred |
| `.ipynb` import/export | sanitized cells/outputs + Vault file version | AF1.1 | deferred |
| ChatGPT/Gemini/GLM webview | provider-backed AI node, без webview/login scraping | AF1.1 | deferred |
| local provider keys | dedicated server secret/file reference без browser/legacy fallback | AF1.1 | deferred |
| settings/providers | настройки AI-провайдеров | AF1.1 | deferred |
| ComfyUI image generation | approved image provider adapter + stored source/result | AF1.1 | deferred |
| local transcript/memory search | project-scoped server index with retention | AF1.1 | deferred |

Исторический отчёт о реализованном коде до решения 2026-09-23:

`search node` имеет первый работающий web-срез: project-scoped поиск Project Brain, versioned source snapshot,
добавление на общий Холст и восстановление после reload. Search, question/answer и orchestrator используют один
`service_run` envelope со статусом, policy/provider/model и timestamps; старые карточки совместимы. Живой E2E
`I0.8` подтвердил `66 → 67 → reload`. Для статуса `done` ещё нужны visual/accessibility fixture, полный negative
suite и owner review.

`answer node` теперь восстанавливает активное наблюдение после reload: project-scoped список возвращает только
собственные runs, панель выбирает самый свежий активный Answer/Agent процесс и снова подключает Answer SSE с
polling fallback. Живой E2E подтвердил reload, явное состояние восстановления, stop и сохранение terminal UI
после второго reload без изменения canonical данных.
Search и Answer дополнительно используют общий с Project Agents browser-side POST/SSE parser и одинаковые
события `run/progress/error/timeout`. Search получает `run_id` до результата и допускает остановку наблюдения;
Answer создаётся и наблюдается одним запросом, сохраняя прежние cancel/reload гарантии. Legacy endpoints
оставлены для совместимости. Живой E2E обоих потоков пройден в `I03 Проверка`.

`orchestrator` имеет первый работающий web-срез: snapshots четырёх Project Agents сохраняют статус, proposals,
review summary, result links и citations без права исполнять действие из Canvas. Повторное сохранение обновляет
существующую ноду по `run_id`, stale snapshots не откатывают её, а observed trace фиксирует увиденные переходы
run/action. Redacted server audit trace добавляет реальные timestamps без metadata, actor id, prompts и tokens;
project isolation подтверждена contract test. Действия и action-status audit events уже раскладываются в
идемпотентные `orchtask`/`orchcall` projections без служебных metadata. Проекции соединены привязанными стрелками,
переживают reload и автоматически обновляются после review даже при повторном открытии панели. Фактические
read/propose/apply вызовы локальных исполнителей теперь сохраняются как redacted tool telemetry и становятся
связанными call-карточками; payload/prompts/actors/tokens в browser не передаются. Создание четырёх агентов уже
идёт через POST/SSE-поток `queued → running → final`, поэтому `run_id`, промежуточное состояние и отмена доступны
до финального preview; replay не выполняет запуск повторно, а ошибки редактируются сервером. Отдельные локальные
read/propose вызовы также отдают безопасные progress-события с `call_id`, режимом, статусом и числом результатов;
UI показывает текущий/последний шаг и не допускает второй запуск поверх активного. Живой E2E подтвердил последний
шаг и финальную сводку без canonical mutation. Долговечная Celery/RabbitMQ-очередь, восстановление queued run
после restart API и running run после падения worker уже реализованы с lease/fencing и проверены без двойного
исполнения; heartbeat живого task также готов. Security negative suite для prompt-like payload, cross-project
IDs и secret/server-only redaction пройден. Completion adapter теперь потоковый, публикует только безопасный
этап/число фрагментов и cooperative закрывает stream при отмене без частичного результата. Для статуса `done`
на тот момент оставались provider-backed `ai_chat`, живая проверка progress/cancel внешнего provider и owner review;
решение 2026-09-23 отменило эти работы. Общий run envelope уже готов. Reload браузера восстанавливает active run через project-scoped detail
polling, показывает отдельное состояние наблюдения и после terminal-снимка возвращает последний redacted tool
step. Живой E2E подтвердил reload и безопасную отмену без canonical mutation. Retry terminal-запуска использует
тот же SSE-helper: новый linked run, progress, отмена и идемпотентный replay проверены контрактом; живой Reporter
повторён до сводки `9 / 1 / 0 / 3` без изменения задач и Холста.

## Хранение и совместная работа

| Desktop AntyFlow | Целевой web PPM | Задача | Статус |
|---|---|---|---|
| IndexedDB/local snapshot | immutable server board versions + cache | AF0.1 | ready |
| sync через папку | Project Vault/server persistence | I0.7/AF0.5 | planned |
| Cloudflare/tldraw sync | board room с project authorization | AF1.2 | in progress: Redis/ASGI presence, auth, revoke, reconnect и snapshot-version refresh; браузер двух ролей проверил конфликт, offline/reconnect и безопасное явное слияние независимых собственных нод; черновик переживает новый контекст браузера в `localStorage`, две вкладки не затирают друг друга; открытая вкладка повторяет временно неудавшееся сохранение с прежним ID операции; очередь для закрытого браузера и полный merge операций остаются |
| локальные файлы | Project Vault | I0.7/AF0.5 | planned |
| личный desktop Canvas | общий Canvas команды проекта | AF0.1 | ready |
| локальный owner | Global admin + project RBAC | AF0.1 | ready |
| импорт `.flow.json` | versioned board import с отчётом | AF0.3/AF1.2 | in_progress: preview, базовые ноды, простые sheet, bound/free arrows, рамки, page coordinates/rotation, заглушки и отчёт v3; синтетический import→save→reload проверен в изолированном Chrome E2E и на отдельной доске «I03 Проверка»; поддерживаемая вложенность групп/рамок сохраняется, неподдерживаемая явно уплощается; формулы, assets и реальный пользовательский desktop-файл не проверены |
| export | board JSON + source manifest | AF0.3/AF0.5 | planned |
| desktop board list/localStorage | server board catalog + per-user last-opened tabs | AF0.1/AF0.2/AF1.2 | in progress: каталог общих досок серверный; открытые вкладки и активная доска сохраняются в браузере по workspace/project/user, после reload сверяются с серверным списком и исключают архивные/недоступные доски; синхронизация вкладок между устройствами не реализована |

## Gate изменения статуса

Активная строка становится `done` только при наличии:

1. работающего пользовательского сценария;
2. server-side permission и project isolation;
3. persistence/reload проверки;
4. visual/interaction fixture;
5. unit/integration/negative tests;
6. указанного rollback;
7. owner review для intentional differences.

`deferred` не требует реализации для PPM 1.0 и не блокирует текущий parity gate.
Существующий код отложенных функций нельзя выдавать за принятую часть выпуска.
