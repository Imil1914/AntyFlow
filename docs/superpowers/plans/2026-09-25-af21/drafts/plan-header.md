# AF2.1 — Инструменты Холста: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Панель инструментов Холста по группам, стикеры, фигуры со «+» и связями, цвет у любого объекта, заметки с Markdown и формулами, блок кода, документы PPM на холсте, вставка картинок и файлы с просмотром и скачиванием; исправление регрессий после второго агента.

**Architecture:** Фаза F (библиотеки, схема узлов, переводы, облик v1 как в конце UX1.1, точки монтирования) — первой; затем параллельно линии R (панель и фигуры), B (содержимое и файлы), S (сервер) с непересекающимися файлами (`drafts/CONTRACTS.md` §0). Всё новое — под грамматикой Холста v2; облик v1 — как в конце UX1.1. Коммитов нет: исходники до правки — `2026-09-25-af21/pre/`, патч — `tools/af21-diff.sh > af21.patch`.

**Tech Stack:** React Router 7 + Vite, tldraw 3.15.6 (нативные note/geo/arrow/frame, привязки стрелок), marked + DOMPurify + KaTeX + lowlight/highlight.js (из lock/store, офлайн), Django (ppm_vault, ppm_canvas), vitest, pytest в docker-compose-test.

**Spec:** [`docs/project-spec/Документация PPM/Intelligence-first/tasks/AF2.1 — Инструменты Холста: панель по группам, стикеры, схемы, заметки, код, файлы.md`](<../../project-spec/Документация PPM/Intelligence-first/tasks/AF2.1 — Инструменты Холста: панель по группам, стикеры, схемы, заметки, код, файлы.md>)

**Материалы** (`docs/superpowers/plans/2026-09-25-af21/`): `drafts/CONTRACTS.md`, `drafts/lane-{F,R,B,S}-preamble.md`, `drafts/plan-*-needs.md`, `notes/tech-notes.md`, `notes/other-agent-analysis.md`, `mockups/K*.png|.dc.html`, `tools/af21-*.sh`.

## Решения контроллера (обязательны, 2026-09-25)
- C1: палитра карточек — 9 значений как на макетах (с «розовым», без «slate»); старые 4 значения сохраняют имена.
- C2: версия схемы узлов остаётся 2 (сервер принимает только её); новые поля обратносовместимы, значения по умолчанию при чтении.
- C3: pdfjs-dist не подключаем; PDF — через `/pdf/` без песочницы для файлов Хранилища.
- C4: формулы в редакторе «Документов» (B7) и аудио/видео (S4) — вне AF2.1.
- C5: добавить в S3 скачивание с настоящим именем файла: `vault/entries/<id>/file/?download=1` → `Content-Disposition: attachment; filename*=UTF-8''…` (спецификация — `drafts/plan-S-needs.md`).
- C6: все URL Хранилища — с UUID пространства (не slug), как в текущем API (поправка к CONTRACTS §5 от линии S).
- C7: дополнительные файлы вне CONTRACTS (canvas-toolkit-model.ts, canvas-toolkit-actions.ts, canvas-rail-legacy.tsx, af21-foundation.test.ts) — разрешены.

## Global Constraints
- Рабочее дерево — единственный источник правды; не выполнять git add/commit/stash/reset/checkout/clean; чужие изменения не трогать (параллельно может работать агент бэкенда в `apps/api/**` вне ppm_vault/ppm_canvas).
- Перед первой правкой любого файла — `docs/superpowers/plans/2026-09-25-af21/tools/af21-pre.sh <путь от plane-fork>`.
- Облик v1 — как в конце UX1.1 (+ исправление кликов); всё новое — только под грамматикой Холста v2; минимальный режим не меняется.
- Без ИИ, без новых внешних запросов (KaTeX и подсветка — локально; вставка URL не ходит в сеть); Markdown санитизируется.
- Горячие клавиши — только `e.code`; строки — в `packages/ppm-brand/src/translations/af21-canvas.ts` (en и ru, свой блок части).
- Dev-сервер :3000 не перезапускать (перезапуск Vite после установки пакетов делает контроллер).
- Базовая линия (не ухудшать): web 57 файлов / 350; brand 79 + аудиты; canvas 39 + аудит (tsc — 1 старая ошибка); web tsc 0; oxlint 719/0; root 653/653; API: ppm_vault 19, ppm_canvas 99 (docker-compose-test).

## Review Focus
1. Старые доски: открываются без потерь, старые заметки/коды/цвета отображаются как раньше, ничего не пишется без действия пользователя.
2. Облик v1 и минимальный режим — как в конце UX1.1; e2e-якоря целы.
3. Безопасность: санитизация Markdown/превью, zip-бомбы и размеры, права на страницы/файлы, никакого `data:` в новых снимках.
4. Клики и фокус: элементы внутри карточек нажимаются; оверлеи («+», панель стилей) не мешают выделению и перетаскиванию; горячие клавиши не срабатывают при вводе текста.
5. Производительность: 300 фигур, оверлеи не пересоздают холст, нет лишних перерисовок при pan/zoom.
