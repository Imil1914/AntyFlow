# AntyFlow web shell — инвентаризация переноса AF0.2

Дата проверки: 2026-09-19.

## Эталон

- desktop-композиция: `src/renderer/src/App.tsx`;
- палитра и размеры оболочки: `src/renderer/src/os/theme.ts`;
- command/search overlay: `src/renderer/src/os/overlays.tsx`;
- иконки и группы нод: `src/renderer/src/os/icons.tsx`, `src/renderer/src/os/nodeIcons.tsx`;
- web-реализация: `plane-fork/apps/web/core/components/ppm-canvas/workspace.tsx` и `canvas.css`.

## Перенесённые поверхности и взаимодействия

| Desktop AntyFlow | Web PPM AF0.2 | Решение |
|---|---|---|
| Раздвижной rail 56/214 px | rail 56/214 px | Сохранены пропорции, cyan accent и compact/expanded режим. |
| Хлебная крошка проекта и меню досок | project/board switcher | Доски серверные, права берутся из capabilities. |
| Локальный список досок | вкладки и каталог общих досок | До восьми открытых вкладок; существующая вкладка не вытесняется автоматически. |
| Новая/переименовать/удалить | create/rename/reorder/duplicate/archive/restore | Удаление заменено восстановимым архивом. |
| Cmd/Ctrl+K | command palette | Показывает только реально подключённые команды. |
| Click/drag nodes | click palette + tldraw drag | Базовые ноды создаются кнопками/клавиатурой, объекты свободно перетаскиваются на холсте. |
| Trackpad pan/pinch, zoom/fit | tldraw pan/zoom/fit | `wheelBehavior: pan`, zoom и fit доступны также кнопками. |
| Selection/multi-select/arrows | tldraw selection and arrow tool | Сохранены штатные canvas interactions и добавлено выравнивание. |
| Статус-бар | sync/read-only footer | Отражает loading/saving/saved/error/conflict/corrupt. |
| Графит/Обсидиан/Светлая | PPM design tokens | Shell наследует dark/light тему PPM без отдельного хранилища темы. |

## «Найти в проекте» (UX0.2, 2026-09-24)

Кнопка и панель Project Brain на Холсте переименованы из «Спросить проект» в «Найти в проекте» и по умолчанию
работают в режиме только поиска: остаются поиск по источникам с цитатами, состояние индекса с
«Переиндексировать» и память проекта, но без агентов и генерации ответов. Управляется флагом
`PPM_PROJECT_ASK_ENABLED` (`isPpmProjectAskEnabled()` из `@ppm/canvas`), по умолчанию `0` — тогда панель не
запрашивает `answer-runs`/`agent-runs`; при `1` возвращается прежний полный режим с четырьмя агентами. Флаг
проброшен через `vite.config.ts` и `turbo.json`, но пока не передаётся в Docker (осознанно отложено). Подробности
— CHANGELOG PPM, запись «2026-09-24 — UX0.2 волна 0».

## Осознанно не перенесено в AF0.2

- Electron IPC, локальные команды запуска, webview и desktop settings;
- AI, RAG, агенты, генеративная студия и граф знаний до появления серверных adapters;
- файловый drop, PDF, изображения, схемы и презентации до AF0.5;
- realtime presence до AF1.2;
- скрытие обязательной лицензией tldraw маркировки;
- кнопки-заглушки для функций, которых ещё нет в web.

## Защита данных

- вкладка с `saving`, `error` или `conflict` не закрывается и не архивируется;
- при лимите вкладок новая доска не вытесняет уже открытую;
- все открытые editor instances остаются смонтированными, поэтому pending autosave продолжается при переключении;
- `PPM_ANTYFLOW_SHELL_ENABLED=0` возвращает минимальный renderer той же серверной доски и не меняет данные.

## Visual baseline

Контрольные размеры: desktop 1440×900 и tablet 1024×768, dark и light. Проверяются rail, header/tabs,
board switcher, command palette, read-only/error states и отсутствие изменения внешнего layout PPM.
