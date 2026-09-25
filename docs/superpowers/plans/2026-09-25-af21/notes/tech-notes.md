# AF2.1 — технические заметки (исследование 2026-09-25, только чтение; перепроверять по коду)

Сокращения: CV = plane-fork/apps/web/core/components/ppm-canvas; TL = node_modules/.pnpm/tldraw@3.15.6…/node_modules/tldraw/src/lib;
ED = …/@tldraw+editor@3.15.6…/src/lib; SC = …/@tldraw+tlschema@3.15.6…/src; PK = plane-fork/packages; API = plane-fork/apps/api/plane.

## tldraw 3.15.6
- `<Tldraw shapeUtils={[PpmCanvasNodeShapeUtil]} components onMount={setEditor}>` (CV/editor.tsx:~2221-2226); стандартные фигуры и
  инструменты подмешиваются всегда. Весь UI tldraw выключен `HIDDEN_TLDRAW_UI` (CV/editor.tsx:183-208: ContextMenu, StylePanel,
  Toolbar, RichTextToolbar, ImageToolbar, Toasts = null). Горячие клавиши tldraw работают (N — note, R/O, A, F, T, D, ⌘U, ⌘D).
- `note` (стикер): поля color, labelColor, size s/m/l/xl, font draw|sans|serif|mono, align, verticalAlign, growY, richText;
  200×200, ресайз выключен (`NoteShapeUtil.configure({resizeMode:'scale'})`); 4 клон-хэндла «+» у стикера из коробки;
  Tab/⌘Enter создают соседний стикер. Цвета: 13 значений, палитра `DefaultColorThemePalette` экспортируется и изменяема
  (цвет стикера ставится inline — только через палитру). richText на TipTap (StarterKit без codeBlock/hr, + Link, Highlight).
- `geo`: 20 типов (cloud, rectangle, ellipse, triangle, diamond, pentagon, hexagon, octagon, star, rhombus, rhombus-2, oval,
  trapezoid, arrow-right/left/up/down, x-box, check-box, heart); подпись richText; fill none|semi|solid|pattern|fill;
  dash draw|solid|dashed|dotted; size s–xl. `text`, `frame` (цвет — `FrameShapeUtil.configure({showColors:true})`), `draw`,
  `arrow` (arc|elbow; 9 наконечников; подпись).
- Привязки стрелок — записи `binding:*` (type 'arrow', fromId=стрелка, toId=цель, terminal start|end…); к одной фигуре —
  сколько угодно стрелок (`editor.getBindingsToShape(id,'arrow')`). Карточка PPM может быть целью (canBind true).
- Своя панель стилей: `useRelevantStyles()`, `TldrawUiContextualToolbar`, `*StylePickerSet`, `TldrawUiButtonPicker`;
  применение: `editor.run(() => { editor.setStyleForSelectedShapes(DefaultColorStyle, c); editor.setStyleForNextShapes(...) })`.
  Рендерить ДОЧЕРНИМ элементом `<Tldraw>` (рядом с PpmCanvasRealtimeCursors), НЕ в `InFrontOfTheCanvas`-memo (ремоунт).
  Карточки PPM стилевых полей tldraw не имеют (`props.node.visual.color`, 4 значения) — отдельная обработка/миграция.
- «+ связанная фигура» в 3.15.6 нет (кроме клонов стикера) → свой оверлей: `createShape` + `createBindings`
  (образец — импорт в CV/editor.tsx:1801-1818). Риск: ⌘D/Alt-drag/копирование живых карточек копируют `node.binding` →
  «сироты» (CV/shape.tsx:2597-2617) — учесть.

## Вставка/перетаскивание
- tldraw: paste (TL/ui/hooks/clipboard/pasteFiles.ts), drop, ⌘U → `editor.putExternalContent({type:'files'})` → обработчик
  'files' → asset store → image/video shape. Без `assets` проп — `inlineBase64AssetStore` → base64 в снимке → доска >2 МиБ не
  сохраняется (API/ppm_canvas/schema.py:9, 25-35), ошибка скрыта (Toasts:null).
- PPM drop сейчас: `onDropCapture` на `.ppm-canvas-shell` → `handleFileDrop` → FileDropDialog: «В Хранилище»
  (`vaultService.uploadFile` → `addUploadedContent` → `bindContent` → `createContentProjectionShape` image|pdf|reference) или
  «В задачу» (`uploadProjectAsset(ISSUE_ATTACHMENT)`).
- Рекомендовано (вариант A): в `onMount` — `ed.registerExternalContentHandler('files', …)` → тот же путь «В Хранилище»; имя
  blob из буфера «tldrawFile» без расширения → переименовать «Вставка-YYYY-MM-DD-HHMMSS.png», уникальность имени в папке
  (VAULT_NAME_CONFLICT); GIF/SVG/AVIF Хранилище отклоняет — свой UI ошибки; также переопределить 'url' (закладки ходят в сеть
  `fetch(url,{mode:'no-cors'})`) и 'svg-text'. Обработчики регистрируются один раз — состояние через refs.

## Библиотеки (в lock/store, но apps/web их не импортирует: `.npmrc node-linker=isolated`)
- katex@0.16.47 (css + шрифты, собираются Vite), marked@16.4.2, dompurify@3.4.15, highlight.js@11.11.1, lowlight@3.3.0
  (catalog), markdown-it@14.2.0; react-markdown@8.0.7 — уже прямая зависимость apps/web (без GFM: remark-gfm@4 несовместим).
- Подключение: добавить в apps/web/package.json (версии из lock / `catalog:`) и `corepack pnpm install --offline`
  (pnpm 11.3.0 закеширован в ~/.cache/node/corepack; сеть не нужна). Делает контроллер/задача фундамента, dev-сервер
  может потребовать перезапуска Vite (делает контроллер).
- pdfjs-dist@5.4.296 есть в store (транзитивно от apps/live) — можно подключить так же для просмотра PDF.
- Office-библиотек в JS нет; на сервере есть zipfile + lxml 6.1.0 + openpyxl 3.1.2 + nh3 (apps/api/requirements/base.txt).

## Документы (Plane Pages)
- API Plane: `POST /api/workspaces/{slug}/projects/{pid}/pages/` (name, access 0/1, description_html); `GET pages/{id}/`;
  фронт: `ProjectPageService.create / fetchById`, store `createPage`.
- Бэкенд Холста уже умеет `entity_type=page` (bindContent, проверка приватности, excerpt 500 символов, source_url);
  фронт: схема `page_ref` и карточка есть. Не хватает: ветки `page` в `createPpmContentRefNode` (PK/ppm-canvas/src/index.ts:1353-1388),
  поиска страниц для холста (`projections/search/` ищет только задачи), кнопки/команды, потока «Создать документ».

## Превью файлов сейчас
- Холст: image `<img>`, pdf `<iframe sandbox="">` (плагин PDF в песочнице может не работать — лучше `/pdf/` или pdf.js),
  reference — 500 символов. Хранилище: md — сырой `<pre>`, pdf — iframe на `/pdf/`, image — `/file/`, остальное — «Скачать».
- Хранилище принимает: pdf, png, jpg, webp (по сигнатуре); csv, doc(x), json, key, md, odp, ods, odt, ppt(x), txt, xls(x) (по
  расширению); НЕ принимает gif, svg, видео, аудио, код; лимит 5 МиБ (API/settings/common.py:213-214, 489).
- Эндпоинты: `vault/entries/{id}/file/` (inline pdf/картинки, иначе attachment; CSP sandbox), `/pdf/`, `/content/` (md → JSON),
  `versions/{n}/`, `export/`; при S3 — 302 на presigned (inline, 300 с); локально FileResponse без Range.

## Прочее
- Утечка приватных страниц в ppm_vault/transfers.py — вынесена отдельной задачей (не AF2.1).
- tldraw грузит шрифты/переводы/иконки с cdn.tldraw.com (нужен `assetUrls` для офлайна) — вне AF2.1, если не мешает.
