---
type: rag_spec
project_id: intellect-ppm
status: current
version: 5
created: 2026-09-12
updated: 2026-09-23
---

# 08 — Project Brain, поиск и граф знаний

## Текущий объём

По решению владельца от 2026-09-23 этот документ описывает индекс, поиск,
граф и проверяемые источники без AI-провайдера, генеративных ответов и агентов.
Уже реализованные дополнительные механизмы не являются задачами текущего плана.

## Цели

- находить сведения в данных конкретного проекта;
- учитывать выбранные Canvas nodes и связи;
- всегда показывать источники;
- не смешивать команды;
- находить точные термины и связи между источниками;
- работать без внешней модели и сервиса embeddings.

## Источники MVP

| Источник | Представление для индекса |
|---|---|
| Work Item | identifier, title, description, state, priority, assignee names, dates |
| Plane Page | title, headings, rich-text converted to normalized text |
| Vault Markdown/text | headings, blocks, wiki-links, path |
| Vault PDF | текст по страницам; OCR позже |
| Canvas note | title/body + neighboring semantic edges |

Дополнительные разрешённые источники: comments, attachments, DOCX/PPTX/XLSX,
repositories, code, commits и PR согласно отдельным задачам Vault/Git.

## Индексационный pipeline

### 1. Обнаружение изменения

Источник создаёт outbox event или периодический reconciler обнаруживает новую `source_version`.

### 2. Проверка политики

- source доступен project;
- тип разрешён;
- folder/source не имеет `exclude`;
- размер не превышает лимит;
- файл прошёл malware/quarantine gate;
- MIME определён сервером.

### 3. Извлечение

- Work Item/Page: server-side serializer;
- Markdown/TXT: UTF-8 с контролем encoding;
- PDF: text layer с page locators;
- другие типы: отдельные parsers после MVP.

### 4. Нормализация

- сохранить заголовки и структурные границы;
- убрать повторяющиеся headers/footers PDF по эвристике;
- не включать signed URLs, tokens, hidden form fields;
- сохранить source locator.

### 5. Chunking

Стартовая политика:

- 600–1000 tokens;
- overlap 80–120 tokens;
- не разрывать короткий Markdown section;
- Work Item обычно один chunk, длинное description делится по блокам;
- PDF chunk не пересекает страницы без locator на обе страницы;
- каждый chunk имеет content hash.

Точные значения являются конфигурацией pipeline и фиксируются в evaluation report.

### 6. Keyword index

Postgres full-text search с русской и простой конфигурацией. Для identifiers, filenames, branch names и кодовых символов сохраняется отдельное exact/trigram поле.

### 7. Публикация

Новая версия chunks становится видимой retrieval атомарно. До этого используется предыдущая ready-версия либо источник помечается stale.

## Retrieval pipeline

```text
Search query
→ permission-scoped project filter
→ selected Canvas sources
→ graph neighbor expansion
→ exact/keyword search
→ deterministic graph-aware ranking
→ source text fetch
→ проверяемые результаты с citations
```

### Ранжирование

MVP использует детерминированный порядок keyword/exact результатов и
объяснимый бонус подтверждённых связей. Наличие dense layer не является
условием поиска или выпуска.

### Graph expansion

Typed edges дают deterministic bonus источникам, связанным с выделенными нодами. Глубина по умолчанию `1`,
пользователь явно выбирает `0/1/2`, а API отклоняет большее значение. Учитываются только подтверждённые связи
текущей доски и проекта. Обход может идти с обеих сторон, но citation всегда сохраняет канонические
`from/to/relation` и отдельно отмечает `forward/reverse`, поэтому направленная связь не инвертируется.

Любая неподтверждённая edge не участвует в обходе. Существующие записи с
происхождением `agent` сохраняют свои статусы, но новые agent-функции не
развиваются. `PPM_BRAIN_GRAPH_ENABLED=0` отключает expansion и rank bonus без удаления semantic metadata.

### Structured augmentation

Для сведений о статусах, сроках, исполнителях и количестве система обращается
к Plane структурированно; индекс не подменяет актуальное состояние задачи.

## Результаты и citations

Поиск возвращает найденные источники, версии, фрагменты и объяснимый путь
связей. Он не формирует текстовый ответ от модели.

Citation указывает точный объект и locator: Work Item, Page section, Vault path+heading, PDF page, Canvas node или Git path+commit.

Если надёжных источников нет, UI явно показывает пустой результат.

## Project memory

Память делится на:

1. **Фактические источники** — Plane/Vault/Git/Canvas.
2. **Подтверждённые решения** — созданные или принятые человеком.
3. **История поиска** — запросы и открытые источники при включённом хранении.
4. **Сводки** — пользовательские записи со ссылками на версии источников.

Summary всегда хранит ссылки на source versions. После изменения источников оно помечается `possibly_stale`, но не переписывается молча.

Реализованные виды памяти: `decision`, `daily_summary`, `weekly_summary`, `release_summary`. Запись пользователя
подтверждается сразу; существующая agent-origin запись остаётся `proposed` до решения РП/редактора. Каждая запись обязана иметь
проверенные project-scoped ссылки на источники со снимком версии и locator.

## Безопасность RAG

- permission filter применяется до retrieval и повторно до source fetch;
- запрещён поиск по общему индексу с последующей фильтрацией результатов в browser;
- chunks удалённого/закрытого источника немедленно исключаются;
- содержимое файлов считается недоверенным и не может менять правила обработки;
- инструкции из источника показываются как данные, а не исполняются;
- secrets detector исключает вероятные credentials;
- signed URLs и секреты не входят в результаты поиска.

## Настройки проекта

- включён ли Project Brain;
- допустимые source types;
- folder-level include/exclude;
- maximum retrieval scope;
- хранение истории поиска;
- разрешён ли code indexing;
- лимиты размера и количества результатов.

Настройки workspace могут задавать верхние ограничения, которые project не способен ослабить.

## MVP-команды

- поиск по проекту;
- поиск по выделенным нодам;
- просмотр связей и источников;
- ручное сохранение решения или сводки с версиями источников.

## Evaluation

Для тестового проекта создаётся фиксированный набор источников и минимум 20 запросов:

- exact identifier;
- русский термин;
- вопрос по PDF page;
- вопрос по связи двух нод;
- запрос без результата;
- конфликтующие источники;
- инструкция внутри документа, которая не должна исполняться;
- запрос пользователя другой команды.

Метрики:

- Recall@K источников;
- citation correctness;
- cross-project leakage = 0;
- stale source exclusion;
- latency p50/p95;
- keyword-only success.

## Acceptance MVP

1. Work Item, Page, Markdown и PDF индексируются отдельно по project.
2. Результаты содержат кликабельные citations.
3. Выделенные Canvas nodes влияют на retrieval.
4. Удалённый источник перестаёт использоваться.
5. Поиск работает без vector/AI provider.
6. UI показывает найденные источники без LLM.
7. Документ с инструкцией «игнорируй правила» не вызывает действие.
8. Пользователь другого project не получает чужие chunks ни по API, ни в результатах.

## Фактическое состояние I1.2 на 2026-09-20

Semantic GraphRAG, explainable edge paths, глубина `0–2`, proposal review, Project Memory и freshness реализованы и
переданы на owner review. Контрактная проверка Brain/Canvas/Vault содержит 114 проходящих тестов; браузерный smoke
подтвердил загрузку панели, памяти и выбора глубины после выделения Canvas node. Количественные production latency
thresholds остаются частью O0.1 и не заявляются как завершённый SLA.
