# CLAUDE.md — playbook для ИИ-агента

Этот файл читается автоматически. Следуй ему, чтобы поднять и собрать проект.

## Что это

**AntyFlow** — десктопное приложение (Electron + React + tldraw): бесконечный AI-холст
с нодами (заметки, ИИ-чаты, канбан, бэклог, PDF, Jupyter, презентации, агенты).
- `src/main/` — Electron main (IPC, провайдеры моделей, агенты, notebook, vault, canvas-sync).
- `src/preload/index.ts` — мост `window.flow` (все IPC-методы объявлять И тут, И в типах
  `src/renderer/src/flow-api.d.ts`).
- `src/renderer/src/App.tsx` — холст, доски, сайдбар, синхронизация.
- `src/renderer/src/shapes/FlowNodeShapeUtil.tsx` — **все виды нод** (большой файл).
- `sync-server/` — Cloudflare Worker для real-time совместной работы (отдельный проект).

## Окружение

- **Windows**, оболочка — **PowerShell** (есть и Bash). Node.js 18+.
- Пользователь запускает **упакованный `Flow.exe`**. Чтобы он увидел правки —
  нужен `npm run dist` (пересобирает `.exe`), а НЕ просто `npm run build`.

## Установка и запуск

```bash
npm install          # один раз
npm run dev          # разработка с hot-reload
```

## Сборка

```bash
npm run build        # только веб-часть в out/ (быстро, для проверки, .exe НЕ трогает)
npm run dist         # полный установщик + release/win-unpacked/Flow.exe
```

**КРИТИЧНО перед `npm run dist`:** закрой запущенный Flow, иначе `EBUSY` на
`release/win-unpacked`:
```powershell
Get-Process -Name Flow -ErrorAction SilentlyContinue | Stop-Process -Force
```
Затем `rm -rf release/win-unpacked` (если осталось) и `npm run dist`.

## Проверка типов

```bash
npx tsc --noEmit
```
Есть **предсуществующие** ошибки, не связанные с твоими правками — их можно
игнорировать (сборка через esbuild всё равно проходит):
- `FlowNodeShapeUtil.tsx` — несколько (exporter `ExportItem`, `OStatus.depth`,
  `setInstruction`, notebook/openscience `Editor→void`).
- `pdf/pdfjs.ts` — `Cannot find module '...pdf.worker.min.mjs?url'` (это Vite `?url`-импорт).

После своих изменений сверяйся: новых ошибок в затронутых файлах быть не должно.

## Добавить новый вид ноды (частый паттерн)

Ноды — единый shape `flow-node` с полем `kind`; данные в `props.extra` (JSON).
Регистрировать новый kind в:
1. `FlowNodeShapeUtil.tsx`: `KINDS`, `KIND_NAME`, `NodeBodySwitch`, при необходимости
   `extractNodeContext` (чтобы ИИ видел содержимое по стрелке).
2. `os/nodeIcons.tsx`: иконка в `NodeIcon`.
3. `App.tsx`: `SIDEBAR_CHIPS`, группа в `NODE_GROUPS`, размеры в `sizeFor`.

## Соглашения проекта

- Горячие клавиши — только через `e.code` (не `e.key`): у пользователя русская раскладка.
- Отвечать/комментировать по-русски.
- IPC: метод добавляется в `src/main/*.ts` (handler) + `src/preload/index.ts` (проброс)
  + `src/renderer/src/flow-api.d.ts` (тип).

## Real-time sync-сервер (Cloudflare)

Только если нужно поднять/переразвернуть совместную работу. Требует интерактива юзера.

```bash
cd sync-server
npm install
npx wrangler login        # откроет браузер — вход в Cloudflare (делает ЮЗЕР)
npx wrangler deploy       # выведет https://flow-sync.<subdomain>.workers.dev
```
Гочи:
- Перед первым `deploy` в дашборде Cloudflare открой **Workers & Pages**, чтобы
  создался `workers.dev` субдомен (иначе ошибка `code: 10063`).
- Используется **SQLite Durable Object** (`new_sqlite_classes` в `wrangler.toml`) —
  работает на **бесплатном** плане, R2 НЕ нужен.
- Свежий субдомен несколько минут поднимает SSL (curl вернёт `000`/exit 35 — это ок).

Подключение в приложении: меню доски → **⚙ Сервер синхронизации** (`wss://…`) →
**🌐 Сделать общей** / **🔗 Подключиться**. Дефолтный адрес прошит в
`App.tsx` (`syncServer` initial) — при необходимости замени на свой воркер.

## Как убедиться, что всё работает

1. `npm install` без ошибок.
2. `npm run build` завершается `✓ built`.
3. `npm run dev` — открывается окно с холстом; можно добавить ноду из сайдбара.
4. Для проверки в упакованном виде — `npm run dist`, затем запустить
   `release/win-unpacked/Flow.exe`.
