# G2.3 «Коммиты и PR в отчётах о работе» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Исполнители получают бриф своей
> линии из `.superpowers/sdd/2026-09-29-g23-reports/task-<ЛИНИЯ>-brief.md`; этот файл — общая карта.

**Goal:** В комментарии, описании задачи, странице и заметке Хранилища за три действия вставляется ссылка на коммит
или PR проекта с названием и статусом; сводка «Что сделано за период» вставляется готовым текстом со ссылками.

**Architecture:** Два эндпоинта в `plane.ppm_git` (поиск Git-объектов проекта и сводка за период по образцу
`ppm_canvas/changes.py`), права — существующие возможности «Кода» и чтение проекта. Web — два диалога и точки вызова
в редакторах `@plane/editor` (панель, меню «/» страниц) и в текстовом редакторе заметок Хранилища; вставка —
оформленная ссылка-снимок (HTML или markdown), без нового узла редактора.

**Tech Stack:** Django 5.2 + DRF (`apps/api`), React Router + MobX (`apps/web`), `@plane/editor` (Tiptap).

**Spec:** `docs/project-spec/Документация PPM/Intelligence-first/tasks/G2.3 — Коммиты и PR в отчётах о работе.md`
(G1–G6); исследование — `.superpowers/sdd/2026-09-29-g23-reports/research/g23-facts.md`.

## Global Constraints

- Решение владельца 2026-09-29: G2.3 в программе «ночь и день», «делай до конца», коммиты локальные, без push.
  Параллельно работают линии G2.2 (API `plane/ppm_git` — S2a/S2b, комплект) и UX2.1 (`plane/ppm_realtime`, web-клиент
  событий), сессия владельца на Холсте — чужое не трогать.
- HTTP-контракт (фиксирован):
  - `GET /api/ppm/v1/workspaces/<ws>/projects/<p>/git/objects/search/?q=<строка>&type=commit|pull_request&limit=<≤20>`
    → `{ results: [ <serialize_git_object> + { label } ] }`; `q` пустой — последние объекты; права —
    `require_capability(…, "read")`; чужой проект/нет права — 403 `GIT_PERMISSION_DENIED`.
  - `GET /api/ppm/v1/workspaces/<ws>/projects/<p>/git/work-summary/?from=YYYY-MM-DD&to=YYYY-MM-DD` (включительно, в
    часовом поясе проекта, ≤ 92 дней, иначе 400 `WORK_SUMMARY_RANGE_INVALID`) → `{ from, to, totals: { done,
    in_progress, other, commits, pull_requests }, items: [ { work_item: { id, key, name, url, state_name,
    state_group }, commits: [ <git-object> ], pull_requests: [ <git-object> ] } ], markdown, html }`.
  - `label` и тексты сводки — по-русски: коммит — `коммит a1b2c3d «Сообщение…»` (сообщение ≤ 72 символов), PR —
    `PR #12 «Название» · Слит 28 сент.` / `· Открыт` / `· Черновик` / `· Закрыт`.
- Вставка: в `@plane/editor` — HTML-ссылка (`<a href="canonical_url">label</a>`) через API редактора (`EditorRefApi`),
  в заметке Хранилища — markdown `[label](url)` в позицию курсора; сводка — `html` / `markdown` из ответа.
- UI-строки по-русски (механизм `packages/ppm-brand`, свои ключи `g23.*`); облик v1/v2; окружение владельца не
  трогать; тяжёлое — через `heavy.sh`; свои стеки — `-p ppm-g23-<линия>…`.

## Линии и порядок

| Линия | Бриф | Требования | Файлы | Старт | Модель |
|---|---|---|---|---|---|
| G-API | task-GAPI-brief.md | G1–G2, G6 (API) | `plane/ppm_git/{views.py, urls.py}` (новые представления), новый модуль `plane/ppm_git/work_summary.py`, тесты `tests/contract/ppm_git/test_g23_*.py` | после приёмки S2b (G2.2) | opus |
| G-Web | task-GWEB-brief.md | G3–G5, G6 (web) | диалоги в `apps/web/core/components/ppm-git/insert/**`, точки вызова в редакторах описания/комментария/страницы и в заметке Хранилища, `ppm-git.service.ts` (новые методы), `packages/ppm-brand` (`g23.*`), тесты | сразу (по контракту) | sonnet |

## Review Focus

1. Поиск из комментария задачи проекта A не находит объекты проекта B, даже с подобранным SHA (G-API тест).
2. Сводка за неделю на границе дня в часовом поясе проекта (задача закрыта в 23:30 по Москве в воскресенье) —
   попадает в неделю правильно (G-API тест).
3. Вставка в комментарий при пустом редакторе и посреди текста — курсор после ссылки, без потери текста (G-Web).
4. Заметка Хранилища (текстовое поле) — markdown вставляется в позицию курсора, Ctrl+Z отменяет вставку (G-Web).
5. Проект без подключённых репозиториев — понятная пустая подсказка, а не ошибка (G-Web).
