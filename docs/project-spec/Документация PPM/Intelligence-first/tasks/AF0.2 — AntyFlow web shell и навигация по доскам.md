---
type: implementation_task
project_id: intellect-ppm
task_id: AF0.2
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-19
---

# AF0.2 — AntyFlow web shell и навигация по доскам

## Пользовательский результат

Canvas внутри PPM выглядит и управляется как AntyFlow: знакомая панель, каталог нод, камера, команды и вкладки
нескольких открытых досок без выхода из проекта.

## Зависимости и входы

- AF0.1 accepted;
- desktop `src/renderer/src/App.tsx`, `os/*` и visual fixtures как эталон;
- PPM design tokens и route context.

## Scope

- визуальная декомпозиция desktop AntyFlow и golden screenshots;
- Canvas header/rail, node palette/flyouts, command palette;
- pointer/trackpad zoom-pan-fit, selection, multi-select и keyboard shortcuts;
- board switcher и вкладки открытых досок;
- create/rename/reorder/duplicate/archive/restore UX по capabilities;
- loading/empty/error/conflict/read-only states;
- responsive desktop/tablet layout, keyboard и reduced motion.

## Не входит

- реализация новых node bodies;
- AI/server adapters;
- realtime presence;
- копирование Electron settings/webview UI.

## Порядок реализации

1. Создать screenshot/interaction inventory desktop AntyFlow.
2. Вынести browser-safe shell components и tokens.
3. Подключить board tabs к AF0.1 API.
4. Перенести camera, selection, drag/drop и command behavior.
5. Перенести palette/navigation без неработающих пунктов.
6. Добавить keyboard/a11y/error states.
7. Выполнить visual regression и browser smoke.

## Критерии приёмки

1. Внешний вид основных Canvas surfaces соответствует утверждённым AntyFlow fixtures.
2. Пользователь открывает несколько досок вкладками и переключается без потери pending state.
3. Board actions показываются только при наличии capability.
4. Note/work_item_ref из текущей версии продолжают работать.
5. Palette не содержит ложных активных функций.
6. Canvas полностью доступен с клавиатуры для основных действий.
7. Остальные маршруты PPM не меняют layout.

## Проверки

- component/unit tests board tabs и command palette;
- visual screenshots desktop/tablet, dark/light;
- keyboard/focus/reduced-motion audit;
- pan/zoom/drag/drop/manual smoke;
- production build и route regressions.

## Результат реализации

- добавлена AntyFlow-оболочка с rail, вкладками открытых досок, списком досок, статусом сохранения и command
  palette;
- create/open/rename/reorder/duplicate/archive/restore связаны с AF0.1 API и скрываются по capabilities;
- несколько досок остаются смонтированными, поэтому локальное pending-состояние не теряется при переключении;
- для вкладок действует безопасный лимит без автоматического закрытия несохранённой доски;
- добавлены keyboard navigation, `⌘/Ctrl+K`, zoom/fit/align, responsive layout и reduced-motion rules;
- shell можно независимо отключить через `PPM_ANTYFLOW_SHELL_ENABLED`, вернув minimal renderer без потери данных;
- будущие projection-node payload не ломают текущий renderer и проходят browser-safe type boundary.

## Доказательства для review

- `@ppm/canvas`: 13 unit tests и browser-boundary audit;
- web: 26 Canvas/navigation tests, полный TypeScript check и production build;
- oxlint завершён без ошибок (существующие upstream warnings остаются в разрешённом baseline);
- browser smoke: создание второй доски, вкладки, note/group, autosave, reload, command palette и отсутствие
  конфликта с глобальным `⌘/Ctrl+K`;
- server contract/migration suite: 42 проверки, включая multi-board migration и cross-role access.

Карточка переведена на `review`: реализация и build gate завершены, визуальная owner acceptance остаётся за
владельцем проекта.

## Rollback

Feature flag возвращает minimal Canvas renderer; board data остаются доступны.

## Stop rules

- для визуального переноса требуется Electron API;
- shell скрывает tldraw license/watermark requirements;
- вкладки создают отдельные личные snapshots вместо общих boards.
