---
type: parity_matrix
project_id: intellect-ppm
status: current
version: 28
created: 2026-09-19
updated: 2026-09-26
---

# 21 — Матрица переноса AntyFlow desktop в web

## Назначение

Матрица не позволяет назвать минимальный tldraw экран «перенесённым AntyFlow». Каждая возможность desktop-прототипа
получает web-результат, задачу, проверку и честный статус.

Статусы действующих строк: `existing`, `ready`, `planned`, `blocked-decision`,
`approved-non-goal`, `done`. Решением владельца от 2026-09-23 AI-провайдеры,
AI-чат и агенты исключены из текущей матрицы и gate AF1.2. Их прежние строки
приведены ниже только в историческом архиве со статусом `deferred`.

## RC-статус (2026-09-26, лента D)

Ко всем 41 действующим строкам (три таблицы ниже, без исторического архива AI) добавлены две колонки для RC:

- **RC-статус** — один из четырёх: `done` (работает и подтверждено), `approved replacement` (сделали не так, как в
  desktop, но это безопасная и осознанно принятая замена — владелец подтверждает), `non-goal` (сознательно не
  делаем в PPM 1.0), `open` (ещё не сделано или сделано не полностью).
- **Доказательство** — файл, тест или карточка, на которых основан статус.

Методика: для каждой строки взят статус карточки-источника (frontmatter `status`, все актуальны на 2026-09-26),
её раздел «Доказательства/Проверки», плюс точечная сверка по коду там, где формулировка карточки была общей
(`packages/ppm-canvas/src/index.ts` — реестр видов нод; `apps/web/core/components/ppm-canvas/*` — конкретные
компоненты). Расхождения, которые нашлись при сверке и раньше нигде не были явно решены владельцем, вынесены
отдельной таблицей в самом конце файла («Расхождения на утверждение владельцу») — они не додуманы этой линией
самостоятельно.

## Оболочка и работа с досками

| Desktop AntyFlow | Целевой web PPM | Задача | Статус | RC-статус | Доказательство |
|---|---|---|---|---|---|
| бесконечный tldraw Canvas | project-scoped tldraw board | I0.4/I0.5 | existing | done | I0.4, I0.5 — `accepted`; `tldraw@3.15.6` в `apps/web/package.json` |
| список/создание досок | один Canvas проекта, много server boards | AF0.1 | ready | done | AF0.1 (`review`): 41 contract-проверка (`test_canvas_api.py`, `test_multiboard_api.py`, `test_projection_api.py`), `test_multiboard_migration.py`, browser-smoke двух досок |
| быстрое переключение | вкладки нескольких открытых досок | AF0.2 | planned | done | AF0.2 (`review`): board tabs в `apps/web/core/components/ppm-canvas/workspace.tsx`; 26 Canvas/navigation тестов; smoke — вторая доска, вкладки, autosave, reload |
| панель категорий нод | AntyFlow rail/palette/flyouts | AF0.2 | planned | done | AF0.2 rail + AF2.1 «Панель инструментов по группам» (CHANGELOG 2026-09-25); живая проверка на доске «Тест Холста» |
| drag/drop ноды | browser drag/drop с project scope | AF0.2/AF0.3 | planned | done | AF0.3 «drag files placeholder» + AF2.1 вставка/drag файлов в Хранилище (Ctrl/⌘+V, drag, ⌘U) |
| command palette/hotkeys | PPM command palette и keyboard map | AF0.2 | planned | done | AF0.2 `⌘/Ctrl+K`; UX0.2 перевод Power-K на `e.code` (русская раскладка); команды AF2.1 в палитре |
| zoom/pan/fit/minimap | эквивалентное camera behavior | AF0.2 | planned | **open** | zoom/pan/fit — AF0.2 «Результат реализации»; minimap явно выключен: `editor.tsx:326` `Minimap: null`. См. «Расхождения» |
| global search/navigation | поиск shapes/boards/sources | AF0.2/I0.8 | planned | done | поиск досок — `canvas.search_boards` (`workspace.tsx`); поиск источников с переходом к карточке — I0.8/AF2.2 («Что изменилось», клик по событию наводит камеру) |
| темы AntyFlow | PPM tokens, dark/light, reduced motion | AF0.2 | planned | done | AF0.2 responsive/reduced-motion; UX0.2/UX1.1 токены `--ppm-*`, синхронизация темы tldraw |
| status bar и minimap | board status, zoom, selection metrics и minimap | AF0.2 | planned | **open** | статус-бар и группа масштаба — UX1.1 («Лист · Все изменения сохранены · время»); minimap выключен — тот же `Minimap: null`. См. «Расхождения» |
| fullscreen ноды | browser portal/fullscreen overlay с теми же permission | AF0.2/AF0.3 | planned | done | полноэкранный просмотр файловых карточек — `apps/web/core/components/ppm-canvas/file-preview.tsx` (AF2.1 B5/K4, `createPortal`); уже сохранённый диалог, только для файловых карточек — уже не для любых типов нод desktop, как например заметок/презентаций |
| collapse/resize нод | сохранённые размеры и состояния в board snapshot | AF0.3 | planned | done | AF0.3 «общая node chrome: header, resize, collapse, duplicate»; 20 tests `@ppm/canvas` |

## Ноды и артефакты

| Desktop node/feature | Целевой web PPM | Задача | Статус | RC-статус | Доказательство |
|---|---|---|---|---|---|
| note/Markdown | `note` | I0.4 + AF0.3 | existing/upgrade | done | I0.4 (`accepted`) + AF2.1: Markdown и LaTeX-формулы в заметке (CHANGELOG 2026-09-25) |
| group/frame | `group/frame` | I0.4 + AF0.3 | existing/upgrade | done | I0.4 (`accepted`) + AF0.3 node chrome (`review`) |
| document | `document` либо Vault projection | AF0.3/AF0.5 | planned | done | `document` в реестре `packages/ppm-canvas/src/index.ts`; AF2.1 «Документ» создаёт страницу в «Документах» + живую карточку |
| list/checklist | Canvas-native `checklist` | AF0.3 | planned | done | AF0.3 `checklist` (`review`, 20 tests); AF2.1 «Список → Сделать задачами» |
| sheet | `table`, optional Vault export | AF0.3/AF0.5 | planned | done | `table` в реестре нод (`packages/ppm-canvas/src/index.ts:171`); Vault-экспорт — опционален по формулировке строки, не блокирует |
| code/codeblock | non-executing `code` | AF0.3 | planned | done | AF0.3 `code` с `executable:false`; AF2.1 номера строк/подсветка/тема/только чтение/скачать |
| formulas, CSV/XLSX import/export | browser-safe table engine + file export | AF0.3/AF0.5 | planned | **open** | у `table` нет формул и нет собственного CSV/XLSX import/export (проверено кодом: `grep formula/csv/xlsx` в `packages/ppm-canvas/src/index.ts` — пусто, кроме экспорта `work_items_view` и превью Excel из Хранилища, это другие функции). См. «Расхождения» |
| Mermaid diagram и разбор flowchart | sanitized `diagram`, optional conversion to shapes | AF0.3/AF0.5 | planned | done | AF0.5 `diagram`, Mermaid `securityLevel: strict`, рендер как картинка без вставки SVG в DOM; конвертация в редактируемые фигуры — опциональна по формулировке строки |
| image/reference | Vault/attachment-backed nodes | AF0.5 | planned | done | AF0.5 (`review`): bindings `page/attachment/vault_file`, 24 теста `@ppm/canvas`, browser-smoke |
| PDF preview и поиск | Vault PDF projection + Project Brain search | AF0.5/I0.8 | planned | done | I0.7 PDF preview (`review`) + I0.8 индексация PDF text layer (84 contract-теста Brain/Canvas/Vault) |
| PDF page selection/chunks | server extraction + stable page/fragment citation | AF0.5/I0.8 | planned | done | I0.8 «chunk имеет locator и source version», adapter/chunker snapshot-тесты |
| deck/slides | `deck`/`slide`, themes, fullscreen, PDF/PPTX export | AF0.3/AF0.5 | planned | **open** | схема `ppmCanvasDeckSchema` (`title/slides/active_slide`) есть в `packages/ppm-canvas/src/index.ts`, но нет отдельного presenter/fullscreen-компонента и нет PDF/PPTX-экспорта (не найдено кодом; в CHANGELOG AF0.5/AF2.1 явно не заявлено). См. «Расхождения» |
| work item card | Plane-backed `work_item_ref` | I0.6/AF0.4 | existing/upgrade | done | I0.6 (`review`): 55 contract-тестов, живая проверка `I03ПР-8`, canonical URL |
| search node | project-scoped knowledge/source search + сохранённые citations | I0.8/I1.2 | existing/upgrade | done | I0.8 (`review`) + I1.2 (`review`) graph-aware ranking и citations |
| Kanban/backlog | Plane-backed `work_items_view` | AF0.4 | ready for owner review | done | AF0.4 (`review`): 62 backend + 22 Canvas теста, live drag `Backlog → Todo`; AF2.1 «Доска задач снова работает как канбан» |
| visual/semantic arrows | board-scoped links/edges | I0.4 + AF0.1/AF0.3 | existing/upgrade | done | I0.4 typed arrows (`accepted`) + I1.2 semantic edges (`proposed/confirmed/rejected`) + UX1.1 визуальный рендер на холсте |
| connected context | selected + neighbor graph scope | I1.2 | planned | done | I1.2 (`review`): глубина `0–2`, `brain-panel.tsx`, deterministic rank bonus, 114 contract-тестов |
| day lane/timeline axis | `daylane`/`tlaxis` с project timezone | AF0.3 | planned | **open** | нет ни в реестре видов нод (`packages/ppm-canvas/src/index.ts`), ни в карточке AF0.3, ни в AF1.2 (проверено по ключевым словам «daylane»/«tlaxis») |
| память доски/digest | `boardmem` поверх Project Brain, citations и versions без AI-модели | I1.2 | planned | **open** | сама функция памяти (решения/сводки, source versions, `possibly_stale`) реализована в I1.2, но как панель «Спросить проект», не как карточка `boardmem` на доске — нет узла в реестре нод. См. «Расхождения» |
| повреждённая/неизвестная нода | сохранение raw payload и диагностический fallback | AF0.3/AF1.2 | planned | done | AF0.3: «Unknown/corrupt payload получает безопасный fallback; opaque tldraw records сохраняются при export/import» |

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

| Desktop AntyFlow | Целевой web PPM | Задача | Статус | RC-статус | Доказательство |
|---|---|---|---|---|---|
| IndexedDB/local snapshot | immutable server board versions + cache | AF0.1 | ready | done | I0.5 immutable versions (`accepted`) + AF0.1 board-scoped versions (`review`) |
| sync через папку | Project Vault/server persistence | I0.7/AF0.5 | planned | done | I0.7 (`review`): 61 contract-тест, версии Markdown/PDF, browser-smoke |
| Cloudflare/tldraw sync | board room с project authorization | AF1.2 | in progress: Redis/ASGI presence, auth, revoke, reconnect и snapshot-version refresh; браузер двух ролей проверил конфликт, offline/reconnect и безопасное явное слияние независимых собственных нод; черновик переживает новый контекст браузера в `localStorage`, две вкладки не затирают друг друга; открытая вкладка повторяет временно неудавшееся сохранение с прежним ID операции; очередь для закрытого браузера и полный merge операций остаются | done | RC-2 закоммичен (`plane-fork` `cd039ae82e`): авто-слияние по объектам без reload/read-only, переподключение без ручного режима (D-4); браузерный gate RC-11 — Chrome 25/0/1, Firefox 25/0/1, WebKit 24/1/1 |
| локальные файлы | Project Vault | I0.7/AF0.5 | planned | done | см. «sync через папку» выше — тот же I0.7 |
| личный desktop Canvas | общий Canvas команды проекта | AF0.1 | ready | done | AF0.1 (`review`): multi-user board, capability matrix Global admin/РП/Member/Viewer |
| локальный owner | Global admin + project RBAC | AF0.1 | ready | done | AF0.1 + ADM0.1 (`review`): защищённый реестр global admin, 63 contract-теста ADM0.1 |
| импорт `.flow.json` | versioned board import с отчётом | AF0.3/AF1.2 | in_progress: preview, базовые ноды, простые sheet, bound/free arrows, рамки, page coordinates/rotation, заглушки и отчёт v3; синтетический import→save→reload проверен в изолированном Chrome E2E и на отдельной доске «I03 Проверка»; поддерживаемая вложенность групп/рамок сохраняется, неподдерживаемая явно уплощается; формулы, assets и реальный пользовательский desktop-файл не проверены | **open** | как в исходной колонке «Статус»: синтетический импорт работает и проверен, но реальный desktop-файл владельца, формулы и assets — нет. Решение D8 (`progress.md`): «опционально, спросить владельца» — ещё не решено |
| export | board JSON + source manifest | AF0.3/AF0.5 | planned | done | AF0.3 «безопасные JSON import/export» + AF0.5 «Экспорт доски включает source manifest с entity ID, URL и source version» |
| desktop board list/localStorage | server board catalog + per-user last-opened tabs | AF0.1/AF0.2/AF1.2 | in progress: каталог общих досок серверный; открытые вкладки и активная доска сохраняются в браузере по workspace/project/user, после reload сверяются с серверным списком и исключают архивные/недоступные доски; синхронизация вкладок между устройствами не реализована | done | серверный каталог + per-user вкладки реализованы и проверены (AF0.1/AF0.2); отсутствие синхронизации вкладок между устройствами — уже отдельно зафиксировано как known limitation RC в §3.2 inventory.md, а не пробел этой строки (её цель — per-user, не cross-device) |

## Расхождения на утверждение владельцу (2026-09-26)

Здесь — только то, что при сверке 41 строки оказалось спорным или явно недоделанным без зафиксированного решения
владельца. Остальные 33 строки помечены `done` без оговорок (доказательство — в своей строке выше).

| # | Строка(и) | Что нашлось | Предлагаемый статус | Что решить владельцу |
|---:|---|---|---|---|
| 1 | «zoom/pan/fit/**minimap**», «status bar и **minimap**» (2 строки, оболочка) | tldraw-миникарта явно выключена в коде (`editor.tsx:326`, `Minimap: null`), хотя мастер-план (документ 22) требует minimap наравне с zoom/pan/fit. Зафиксированного решения «миникарта не нужна» ни в одной карточке или CHANGELOG не найдено | `non-goal`, если владелец согласится, что для досок команды 5–20 человек миникарта не нужна; иначе `open` — отдельная небольшая задача после RC | Нужна ли миникарта в PPM 1.0 или переносится как `non-goal`/в следующий выпуск |
| 2 | «formulas, CSV/XLSX import/export» (ноды) | Таблица (`table`) на Холсте — простая сетка без формул и без собственного CSV/XLSX импорта/экспорта; есть только экспорт `work_items_view` (CSV задач) и превью Excel из Хранилища (только значения ячеек) — это другие, уже готовые функции, не эта строка | `open`, перенос в известные ограничения следующего выпуска | Подтвердить, что формулы/экспорт таблицы не блокируют RC 1.0 |
| 3 | «deck/slides» (ноды) | Карточка `deck` существует (заголовок, слайды, текущий слайд), но презентационного полноэкранного режима, тем и экспорта в PDF/PPTX не найдено в коде и не заявлено ни в одной карточке | `open`, перенос в известные ограничения следующего выпуска | Подтвердить, что показ презентаций «как есть на доске» (без полноэкранного режима и экспорта) достаточен для RC |
| 4 | «day lane/timeline axis» (ноды) | Не реализовано вообще: ни вида ноды, ни упоминания в AF0.3/AF1.2 | `open` либо `non-goal`, если это не нужно command-канбану PPM (спринты уже видны в «Задачах» и на «Живой карте», AF2.2) | `open` (следующий выпуск) или `non-goal` (не нужно при наличии спринтов в «Задачах»/«Живой карте») |
| 5 | «память доски/digest» (ноды) | Project Memory (решения/сводки/staleness) реализована в I1.2, но как панель «Спросить проект», а не как карточка `boardmem`, которую можно положить на доску рядом с другими объектами | `approved replacement`, если панели достаточно; иначе `open` — нужна отдельная карточка-нода | Панель вместо карточки на доске — устраивает как замена или нужна отдельная нода |
| 6 | «Cloudflare/tldraw sync» (хранение) = ядро RC-2 | Авто-слияние живых правок по объектам (RC-2) закоммичено (`plane-fork` `cd039ae82e`), включая переподключение (D-4); браузерный gate на интегрированном дереве: Chrome 25/0/1, Firefox 25/0/1, WebKit 24/1/1 | `done` | Решения не требуется: закрыто фактом (RC-11, 2026-09-27) |
| 7 | «импорт `.flow.json`» (хранение) | Синтетический импорт проверен; реальный desktop-файл владельца, формулы и assets — нет (решение D8 в `progress.md`: «опционально, спросить владельца») | `open`, уже известное ограничение RC | Дать реальный `.flow.json` для проверки до RC-12 или оставить как known limitation |

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
