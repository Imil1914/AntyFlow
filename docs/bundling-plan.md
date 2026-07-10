# План: OpenCode + OpenScience + AnythingLLM внутри одного установщика Flow

Статус: **план (код ещё не пишем)**. Цель — чтобы все три компонента шли внутри
одного установщика Flow и работали «из коробки», без установки на чужом ПК
Node.js / git / глобальных npm-CLI.

## 0. Что имеем сейчас (факты из кода)

| Компонент | Запуск (сейчас) | Внешняя зависимость |
|---|---|---|
| **AnythingLLM** | 1-й запуск: `git clone` v1.15.0 → `userData/anythingllm`, локальный yarn, `yarn install` server/collector/frontend + сборка фронта; далее `spawn('node', ['index.js'])` в `server/` (:3001) и `collector/` (:8888), env `STORAGE_DIR`, `SERVER_PORT`, `NODE_ENV=production`, prisma-клиент | **системный Node + git** |
| **OpenScience** | `spawn('openscience serve --port 8790', {shell})` | глобальный `@synsci/openscience` в PATH |
| **OpenCode** | `spawn('opencode', ['serve','--port',N,'--hostname','127.0.0.1'])` | глобальный `opencode` в PATH |

- `src/main/anythingllm.ts` — clone/install/build/spawn AnythingLLM.
- `src/main/openscience.ts` — spawn openscience.
- `src/main/index.ts` (~строка 172) — spawn opencode.
- Упаковка: electron-builder, `files: out/**`, `asarUnpack` для нативных модулей.
  **`extraResources` не используется** — сюда и будем класть сайдкары.
- Electron `^33.2.0` → внутренний Node ≈ 20.18 (ABI 115).

## 1. Целевая архитектура — «sidecar в resources/»

«Один exe» буквально невозможно: это самостоятельные серверы, их нельзя слить в
один процесс с `Flow.exe`. Правильный паттерн — **сайдкары**:

```
Flow.exe (Electron main)
 └─ resources/
     ├─ bin/opencode.exe              ← standalone-бинарник
     ├─ node/node.exe                 ← приватный Node (для JS-сайдкаров)
     ├─ openscience/                  ← npm-пакет @synsci/openscience + его deps
     └─ anythingllm/                  ← prebuilt: server + collector + built frontend + node_modules
```

- Кладём через electron-builder `extraResources` (копируется в `resources/` рядом с exe).
- В рантайме путь: `process.resourcesPath` (packaged) / локальная папка (dev).
- Запуск как дочерние процессы — как сейчас, но **по абсолютным путям из resources/**,
  а не из PATH. Никаких системных Node/git/CLI не требуется.

Единый резолвер путей (новый модуль `src/main/sidecars.ts`):
```
function resDir(): string {
  return app.isPackaged
    ? process.resourcesPath                       // …/resources
    : join(app.getAppPath(), 'sidecars')          // dev: локальная папка с теми же бинарями
}
```

### Почему приватный Node, а не Node из Electron
Нативные модули (better-sqlite3, onnxruntime-node, sharp, prisma-engine) собраны под
**конкретную ABI**. Если AnythingLLM собран под обычный Node 20/22, а запустить его
Node-ом из Electron (`ELECTRON_RUN_AS_NODE`) с другой ABI — краш при `require`.
Поэтому:
- для **AnythingLLM** и любых JS-сайдкаров с нативщиной — вкладываем **приватный
  `node.exe`** ровно той версии, под которую собраны их модули, и спавним им;
- для **OpenCode** приватный Node не нужен вовсе — это самостоятельный бинарник.

## 2. Пошаговый план по компонентам

### 2.1 OpenCode (🟢 легко, делаем первым — обкатать паттерн)
1. Скачать Windows-бинарник opencode (релизный `.exe`/zip), положить в
   `sidecars/bin/opencode.exe` (dev) и настроить `extraResources` → `resources/bin/`.
2. В `index.ts`: заменить `spawn('opencode', …)` на `spawn(join(resDir(),'bin','opencode.exe'), …)`.
3. Проверка: opencode-нода поднимается на чистой машине без глобального CLI.
- Размер: ~30–60 МБ. Рисков почти нет (standalone).

### 2.2 Приватный Node (общий инфраструктурный шаг)
1. Взять Windows x64 Node нужной версии (напр. официальный `node.exe` LTS 20.x —
   согласовать с тем, под что собираем AnythingLLM), положить в `sidecars/node/node.exe`.
2. `extraResources` → `resources/node/`.
3. Хелпер `nodeBin() = join(resDir(),'node','node.exe')`.
- Размер: ~50–70 МБ (один node.exe).

### 2.3 OpenScience (🟡 средне)
1. В отдельной папке `npm install @synsci/openscience` (с его зависимостями), проверить
   нативные модули; собрать/переустановить их под приватный Node (`npm rebuild`
   нужной версией) если есть.
2. Скопировать результат в `sidecars/openscience/`, `extraResources` → `resources/openscience/`.
3. В `openscience.ts`: вместо `spawn('openscience serve …', {shell})` →
   `spawn(nodeBin(), [join(resDir(),'openscience','node_modules','.bin','openscience'|CLI-entry), 'serve','--port',PORT], {cwd})`.
   (Уточнить точку входа CLI пакета — обычно `bin` в его package.json.)
4. Проверка на чистой машине без глобального CLI и без выключения Kaspersky, если получится.
- Размер: ~50–100 МБ. Риск: нативные зависимости, точка входа CLI.

### 2.4 AnythingLLM (🔴 тяжело — prebuilt целиком)
Цель: положить **готовое** приложение, без clone/install/build на машине юзера.

**Подготовка билд-артефакта (делается один раз на билд-машине):**
1. Клонировать v1.15.0, `yarn install` server/collector/frontend, `yarn build` фронта
   (как сейчас делает первый запуск), сгенерировать prisma-клиент.
2. **Пересобрать нативные модули под приватный Node** (той же версии, что в 2.2):
   `better-sqlite3`, `onnxruntime-node`, `sharp` и prisma-engine — `npm rebuild`/
   соответствующие пост-инсталлы под целевую ABI.
3. Вырезать лишнее (`.git`, кэши, dev-зависимости фронта после сборки, исходники фронта —
   оставить только `server/public`), чтобы уменьшить размер.
4. Сложить `server/`, `collector/`, собранный фронт в `sidecars/anythingllm/`.

**Упаковка:** `extraResources` → `resources/anythingllm/`. Native-модули НЕ должны
попадать в asar — они уже вне asar (в resources), это ок.

**Рантайм (`anythingllm.ts`):**
1. Убрать/обойти ветку `install()` (clone+yarn+build) для packaged-режима — считать,
   что всё готово в `resources/anythingllm`.
2. `STORAGE_DIR` оставить в `userData/anythingllm-storage` (пользовательские данные —
   вне resources, resources только read-only и перетираются при обновлении!).
3. Спавнить приватным Node:
   `spawn(nodeBin(), ['index.js'], {cwd: join(resDir(),'anythingllm','server'), env:{…STORAGE_DIR, SERVER_PORT, NODE_ENV:'production'}})`
   и то же для collector.
4. prisma: при первом старте выполнить `migrate deploy`/`db push` приватным Node,
   указывая на пользовательскую БД в STORAGE_DIR.

**Размер: +300 МБ … 1 ГБ.** Это главный вклад в разбухание установщика
(сейчас `win-unpacked` уже 1.1 ГБ).

## 3. Изменения в упаковке (package.json → build)

```jsonc
"extraResources": [
  { "from": "sidecars/bin",         "to": "bin" },
  { "from": "sidecars/node",        "to": "node" },
  { "from": "sidecars/openscience", "to": "openscience" },
  { "from": "sidecars/anythingllm", "to": "anythingllm" }
]
```
- Папка `sidecars/` — в `.gitignore` (большие бинарники не коммитим; собираются
  отдельным скриптом `scripts/prepare-sidecars.*`).
- Проверить, что NSIS-инсталлятор тянет resources (по умолчанию да).

## 4. Риски и на что смотреть

- **ABI нативных модулей** ↔ версия приватного Node — главный источник крашей.
  Зафиксировать одну версию Node и собирать всё под неё.
- **Размер установщика** — с AnythingLLM легко 1.5–2 ГБ. Оценить приемлемость;
  возможен отдельный «полный» и «лёгкий» установщик.
- **Обновления** — resources перетираются при апдейте Flow; пользовательские данные
  (STORAGE_DIR, БД) держать строго в `userData`, чтобы не терялись.
- **Антивирус/Defender/Kaspersky** — неподписанные бинарники-сайдкары могут
  триггерить эвристику (OpenScience уже ловил KSN). Подписывать бинарники по возможности.
- **Лицензии** (все MIT — перепаковка разрешена): приложить их LICENSE в `resources/*/`.
- **Кросс-платформенность** — план выше для Windows x64; для mac/linux нужны свои
  бинарники Node/opencode и своя пересборка нативных модулей.
- **Порты** (3001/8888/8790 + порт opencode) — оставить проверку занятости/выбор
  свободного, как сейчас.

## 5. Порядок работ (предлагаемый)

1. **Фаза A** — инфраструктура: `sidecars.ts` (резолвер путей), `extraResources`,
   скрипт `prepare-sidecars`, приватный Node. **+ OpenCode** (обкатать паттерн).
2. **Фаза B** — **OpenScience** на приватном Node.
3. **Фаза C** — **AnythingLLM** prebuilt: скрипт подготовки артефакта, пересборка
   нативных модулей, рантайм-переключение packaged→resources, prisma-миграции.
4. **Фаза D** — сборка полного установщика, тест на «чистой» Windows-машине
   (без Node/git/CLI), замер размера и первого запуска.

## 6. Оценки

| Фаза | Труд | Размер (+) | Риск |
|---|---|---|---|
| A (infra + OpenCode) | небольшой | ~80–130 МБ | низкий |
| B (OpenScience) | средний | ~50–100 МБ | средний (native/entry) |
| C (AnythingLLM prebuilt) | большой | ~300 МБ–1 ГБ | высокий (ABI, prisma, размер) |
| D (сборка+тест на чистой ОС) | средний | — | средний |
