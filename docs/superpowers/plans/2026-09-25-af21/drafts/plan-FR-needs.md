# AF2.1 — нужды частей F и R к контроллеру, линиям B и S (2026-09-25)

Проверено по рабочему дереву (снимок базы `ae3c2c1b` = `07f3b2e5`; правки второго агента — `201ab5f4 → 2737bb5f`).
Нужды линии B к F/R (`plan-B-needs.md`) учтены: F1 — пакеты (без `pdfjs-dist`), F2 — `format`, F3 — поля кода, F4 —
`work_item_id` пунктов чек-листа + `.passthrough()` + сброс у копий, F5 — `page_ref` для любой привязки `entity_type "page"`,
F6 — `canvas-content.css` последним, F7 — пустой блок `// ── B ──` в `af21-canvas.ts` (ключи B добавляет сама B), F8 — шов
`handleTldrawMount` (B-блок) и заглушка `registerPpmCanvasExternalContent(editor, getDeps) => () => void`, F9 — сигнатура
`ChecklistEditor` и разметка `NativeNodeCard` для заметки/кода не меняются; R1 — `add-document-page`/`add-page-ref` R не
обрабатывает, R3 — R не перехватывает вставку, R4 — панель стилей скрыта для блока кода.

## §1 Контроллеру: палитра — `pink` вместо `slate` (правка CONTRACTS §3)

CONTRACTS §3 перечисляет `neutral | slate | blue | cyan | green | yellow | orange | terracotta | violet`, а утверждённые
макеты K2 (панель «Цвет») и K3 (розовый стикер «Порог ΔE — 12?») и спецификация («палитра PPM: 8 оттенков … (K3)») дают
Нейтральный, Жёлтый, Янтарный, Терракотовый, **Розовый**, Фиолетовый, Синий, Бирюзовый, Зелёный — без «сланцевого». План F
(F1) публикует `PPM_CANVAS_COLORS = neutral, yellow, orange, terracotta, pink, violet, blue, cyan, green` (порядок K2).
Если нужен именно `slate` — одна строка в `PPM_CANVAS_COLORS`, одна пара значений в `PPM_PALETTE_HEX` (R1) и ключ
`canvas.palette.*`; прошу подтвердить `pink` правкой CONTRACTS.

## §2 Контроллеру: версия схемы не повышается (правка CONTRACTS §3)

`PPM_CANVAS_SCHEMA_VERSION` = 2 закреплена сервером (`apps/api/plane/ppm_canvas/serializers.py:44` —
`IntegerField(min_value=2, max_value=2)`, `schema.py:7-8`) и экспортом доски (`ppmCanvasBoardExportSchema`), а
~10 фикстур `packages/ppm-canvas/src/__tests__/canvas-node.test.ts` ждут `status: "valid"` при `schema_version: 2`.
Все поля AF2.1 обратно совместимы (надмножество палитры, `default()` у `format`/`theme`/`locked`/`wrap`, необязательный
`work_item_id`), поэтому «миграция» = заполнение значений по умолчанию при чтении; тест `af21-schema.test.ts` это закрепляет.
Повышение версии потребовало бы синхронной правки сервера (линия S) и фикстур — вне AF2.1.

## §3 Контроллеру: владение файлами (дополнение CONTRACTS §0)

- F2 до старта R/B правит для возврата облика v1: `workspace.tsx`, `commands.ts`, `board-workspace-state.ts`, `shape.tsx`
  (только `ChecklistEditorV1`/`TableEditorV1`, выбор по `grammarV2`, условие кнопки копирования ссылки на задачу, `COLOR_CLASS`
  в F1), `canvas.css`, `editor.tsx`. После F2 эти файлы — по CONTRACTS §0.
- Новые файлы F (заморожены): `apps/web/core/components/ppm-canvas/canvas-rail-legacy.tsx` (рейка UX1.1, облик v1),
  `apps/web/tests/ppm-canvas/af21-foundation.test.ts` (страж v1 и точек монтирования).
- Новые файлы R: `canvas-toolkit-model.ts` (чистые данные/геометрия), `canvas-toolkit-actions.ts` (действия с редактором);
  тесты `toolkit-model|toolkit-theme|toolkit-style|toolkit-quick-connect|rail-v2|rail-regressions.test.ts` (шаблон §0).
- Команды: F2 добавил в `commands.ts` все id линии B (`add-document-page`, `add-page-ref`, `add-list`, `add-file`, `add-git`),
  чтобы B не правила `commands.ts`; R1 добавляет свои (`draw-geo` с `detail.geo`, `open-find`, `open-board-panel`).

## §4 Линии B: блоки `editor.tsx`

- Блоки B (созданы F2): импорты (пустой), шов `handleTldrawMount` (перед `const components = useMemo`), команды содержимого
  в `switch` `CanvasControls` (`add-document-page`, `add-page-ref`, `add-file`, `add-git` — пустые `break`; `add-list` создаёт
  чек-лист). B может заменить пустые случаи своим слушателем, но пары маркеров `// ── AF2.1 B: … ──` / `// ── /AF2.1 B ──`
  должны остаться сбалансированными и их должно быть ≥ 3 (страж `af21-foundation.test.ts`).
- В атрибутах `<Tldraw>` стоит строка-комментарий `// AF2.1: onMount and acceptedImageMimeTypes belong to line B (plan-B B4).`
  — B добавляет `acceptedImageMimeTypes` рядом с `onMount={handleTldrawMount}`.
- Блоки R, которые B не трогает: импорты R, `shapeUtils`, дочерние `<Tldraw>` (`PpmCanvasStyleToolbar`, `PpmCanvasQuickConnect`),
  команды R, и три блока R5 (`// ── AF2.1 R: (R5) …`): `inspectorHidden`, счётчик объектов в `CanvasControls`, `nativeShapeLabel`.
- Страж F2 проверяет порядок импортов `canvas.css → canvas-v2.css → canvas-toolkit.css → canvas-content.css` и то, что каждый
  селектор `canvas-content.css` начинается с `:where(html[data-ppm-design="v2"])`.

## §5 Линии B: что R оставляет ей

1. **Автоужатие «Досок задач» (регрессия №7, рулинг R8):** эффект `shape.tsx:1583-1591` (`updateShape … { w: 360, h: 160 }` без
   действия пользователя) и компактная заглушка `WorkItemsViewNode` под v2 (`:1702-1715`, с `onPointerDown={stopEventPropagation}`
   на всей карточке) — в файле B. Нужно: убрать эффект, вернуть рабочий канбан под v2 (клики проходят благодаря
   `pointer-events: auto`). `grep -rn "w: 360, h: 160" apps/web/core/components/ppm-canvas/` → сейчас только `shape.tsx`.
2. **e2e заметки:** `apps/web/e2e/ppm-demo.spec.ts:296` ищет textbox «Напишите заметку в Markdown…» — после перехода заметки
   на отрисованный Markdown (двойной клик — правка) B сохраняет доступное имя поля правки или правит этот селектор.
   R5 правит только селекторы рейки (`:294`, `:300` и 13 мест в `ppm-canvas-collaboration.spec.ts`).
3. **Цвет карточек PPM:** корень карточки должен сохранять класс `ppm-canvas-node--<цвет>` (`COLOR_CLASS`, F1) — на нём
   держится оформление палитры R2 (полоса сверху и цвет глифа под v2). Цвет пишет R3 через `visual.color`.
4. **Панель стилей и собственные панели карточек:** R3 скрывает панель стилей, если в выделении блок кода (`ppmCardKind(card) === "code"`).
   Если B добавит другие карточки со своей панелью над карточкой — сообщить R (одно условие в `readSelection`).

## §6 Контроллеру: операции и проверки

- После F1 (`corepack pnpm install --offline`) — перезапуск Vite :3000 (KaTeX CSS/шрифты из `apps/web/node_modules/katex`).
- `pdfjs-dist` не устанавливается (B не использует); если B передумает — вторая установка и второй перезапуск Vite.
- Живые проверки: F2 Step 11 (v1/v2), R4 Step 8 («+»), сводные приёмки R; e2e — на стенде, если поднят (R5 меняет селекторы).
- Тёмная палитра (`PPM_PALETTE_HEX.dark`) в макетах не задана — значения выведены равной светлотой; показать владельцу на
  доске «Тест Холста» в тёмной теме (контраст текста стикера ≥ 4,5:1 проверить глазами/инструментом).

## §7 Уточнения к спецификации и макетам (решения R, записать в CHANGELOG)

- «+» у стикера — родные клон-«+» tldraw (рулинг R1); свой оверлей «+» — у фигур `geo` и карточек PPM.
- «Цилиндр» из K1 в наборе geo tldraw 3.15.6 нет — не показывается (спецификация: «из набора geo tldraw»); «Скруглённый» =
  `oval` (капсула), «Параллелограмм» = `rhombus`, «Стрелка» = `arrow-right`.
- «Схема» в «Документы и текст» открывает меню «Фигуры» (как в спецификации: «открывает те же фигуры»).
- «Комментарий» из K1/K4 — AF2.3, в рейку AF2.1 не входит.
- «Ещё ▸»: «Найти в проекте» (панель «Мозг проекта»), «Задачи и бэклог», «Ссылка на доску», «Доска: объекты, импорт и экспорт»
  (открывает панель «Доска»).
- Стикеры масштабируются (`NoteShapeUtil.configure({ resizeMode: "scale" })`), рамки tldraw показывают цвет (`showColors`).

## §8 Риски для ревью

- `FrameShapeUtil.configure({ showColors: true })` заменяет валидатор свойства `color` рамки на стиль (тот же набор значений)
  — доски с рамками tldraw должны открываться; проверить на «Тест Холста» (и в v1 после v2).
- Палитра tldraw — глобальный объект; v1/минимальный режим получают исходную палитру (`applyPpmCanvasTldrawTheme(false)`).
- `.passthrough()` у пунктов чек-листа меняет выводимый тип (индексная подпись) — web tsc должен остаться 0 (F1 Step 14).
- Опция `filter` у `editor.getShapeAtPoint` (R4) — сверить с сигнатурой `Editor.ts:5167` при реализации.
- Счётчики тестов web в шагах R не учитывают тесты B, идущей параллельно.
