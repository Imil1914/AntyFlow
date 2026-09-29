# AntyFlow

**AntyFlow** (приложение «Flow») — локальное десктоп-приложение на Electron, React и tldraw: бесконечный AI-холст с
нодами — заметки и документы, ИИ-чаты, канбан и бэклог, таблицы, схемы, PDF с вопросами по документу, Jupyter,
презентации, агенты и оркестратор. Работает на Windows; модели подключаются по API (OpenAI-совместимые провайдеры,
локально — LM Studio или Ollama).

## Что умеет

- бесконечный холст на tldraw: все ноды — один shape `flow-node` с полем `kind`, контекст передаётся по стрелкам;
- заметки и Markdown, Хранилище с настоящими `.md`, дерево файлов, wiki-ссылки, обратные ссылки и граф;
- канбан и бэклог, таблицы с формулами, схемы Mermaid, код, презентации, Jupyter-ноутбуки, голосовой ввод;
- ИИ-чат и связи контекста между нодами, PDF с вопросами по документу и локальный RAG;
- локальные агенты (OpenCode, OpenScience, AnythingLLM) и оркестратор (pipeline, actor-critic, council и другие
  режимы);
- файловая и real-time синхронизация досок (`sync-server/` — Cloudflare Worker).

Подробный снимок — [что реализовано](<docs/РЕАЛИЗОВАНО.md>).

## Быстрый запуск

### Требования

- Windows 10/11;
- Node.js 20 LTS или 22 LTS;
- Git;
- по желанию: Python 3, LM Studio/Ollama и ComfyUI.

### Установка и запуск

```bash
git clone https://github.com/Imil1914/AntyFlow.git
cd AntyFlow
npm ci
npm run dev
```

Node.js 24 пока не используется: для закреплённой версии `better-sqlite3` нет подходящего готового бинарника в
проверенном окружении (ограничение записано и в `package.json`). Как пересобрать `better-sqlite3` под Electron —
[`CLAUDE.md`](CLAUDE.md), раздел «Нативные модули».

### Проверки

```bash
npm test         # vitest, включая проверку базовой линии типов (docs/materials-orchestrator/baselines)
npm run build    # сборка electron-vite в out/
```

### Установщик Windows

```bash
npm run dist     # установщик и release/win-unpacked/Flow.exe
```

Перед `npm run dist` закройте запущенный `Flow.exe`: Windows может заблокировать замену файлов в `release/`.

## Настройка ИИ

1. Откройте командное меню `Ctrl+K`.
2. Выберите «Настройки провайдеров».
3. Укажите OpenAI-совместимый `baseURL`, модель и собственный API-ключ.

Для локального LM Studio обычно используется `http://127.0.0.1:1234/v1`. Секреты хранятся локально в профиле
приложения (`%APPDATA%/flow/`) и не должны попадать в Git.

## Структура репозитория

```text
src/main/            Electron main: IPC, провайдеры моделей, агенты, оркестратор, PDF, Vault
src/preload/         безопасный мост window.flow между main и renderer
src/renderer/src/    React UI: холст, ноды, доски, сайдбар, Хранилище
src/shared/          общий код main и renderer (профиль оркестратора)
sync-server/         Cloudflare Worker для real-time синхронизации досок
scripts/             подготовка сайдкаров, иконка, сборка AnythingLLM
build/               ресурсы установщика (иконки)
docs/                ТЗ и журнал пакета улучшений, план упаковки, материаловедческий оркестратор
```

## Документация

- [`CLAUDE.md`](CLAUDE.md) — как поднять, собрать и проверить проект, соглашения (памятка для агентов и разработчиков);
- [ТЗ пакета улучшений v1](docs/TZ-improvements.md) и [журнал выполнения](docs/CHANGELOG-improvements.md);
- [план упаковки OpenCode, OpenScience и AnythingLLM в установщик](docs/bundling-plan.md);
- [материаловедческий оркестратор](docs/materials-orchestrator/README.md);
- [что реализовано](<docs/РЕАЛИЗОВАНО.md>);
- [сервер синхронизации](sync-server/README.md).

## Безопасность

- не коммитьте `.env`, API-ключи, токены, cookies и пользовательские данные;
- не помещайте секреты в снимки холста, логи и тестовые данные.

## История и лицензия

До 2026-09-30 AntyFlow жил в одном репозитории с документацией web-продукта PPM; история коммитов сохранена целиком,
включая старые коммиты этой документации. Лицензия AntyFlow пока не выбрана — это решение владельца.
