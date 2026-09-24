---
type: implementation_task
project_id: intellect-ppm
task_id: UX0.1
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-20
---

# UX0.1 — Завершение оболочки и терминологии PPM

## Пользовательский результат

Основной путь PPM полностью русифицирован, не содержит дублей и внешних Plane-тупиков, а Canvas каждого проекта
доступен одним очевидным действием.

## Зависимости и входы

- I0.3 accepted;
- AF0.2 accepted либо стабильный shell contract;
- список UX-регрессий из документа 22.

## Scope

- role-aware navigation;
- единая русская терминология;
- быстрый project Canvas entry;
- устранение дублей Projects/Settings;
- `Мои заметки`, `Спринты`, `Хранилище`, `Документы`;
- очистка меню помощи;
- перенос legal/source information из шапки;
- onboarding skip invitations;
- понятные upload/create errors;
- responsive/keyboard smoke.

## Не входит

- изменение источников истины Plane/Vault/Git;
- новый Canvas runtime;
- глобальная роль вне AF0.1.

## Критерии приёмки

1. Неподготовленный пользователь находит Canvas проекта без инструкции.
2. В одном контексте нет двух одинаково названных действий с разным смыслом.
3. Обычный участник не видит workspace/global administration.
4. Помощь не ведёт на продажи, форум или чужой changelog.
5. Основной путь не содержит английского текста, кроме собственных имён и технических идентификаторов.
6. Ошибка upload/create сообщает причину и следующий шаг.

## Проверки

- role-based navigation snapshots;
- locale scan и visual regression;
- onboarding E2E;
- upload/create failure fixtures;
- keyboard/responsive smoke.

## Rollback

Вернуть предыдущие shell labels/components feature flag без отката данных.

## Реализовано 2026-09-19

- доступ к workspace-навигации, созданию проектов и настройкам переведён с признака владельца пространства на
  защищённую роль главного администратора;
- у обычного пользователя скрыты создание пространства, workspace invitations, глобальные разделы и настройки;
- прямой вход обычного пользователя в workspace settings и `/ppm-admin` закрыт;
- быстрый переход на `Холст` добавлен у каждого доступного проекта и работает с клавиатуры;
- проектное меню приведено к терминологии PPM: `Мои заметки`, `Холст`, `Спринты`, `Направления`, `Хранилище`,
  `Документы`, `Код`, `Настройки проекта`;
- очищены меню помощи и профиля, убраны дубли и внешние пользовательские ссылки;
- относительное время, отказ в доступе, роли участников, onboarding и ошибки создания/upload локализованы и дают
  следующий шаг;
- пункт настроек проекта скрыт у участника и остаётся у РП/главного администратора;
- сведения о версии, лицензии и исходном коде вынесены на страницу `О программе` в настройках.

## Evidence 2026-09-19

- `pnpm --filter web check:types` — успешно;
- `pnpm --filter web build` — production build успешно;
- web unit suite: `35 passed` для workspace/admin/navigation;
- `@ppm/brand`: `19 passed`, user-facing brand audit пройден;
- targeted `oxlint`: `0 warnings`, `0 errors`; `git diff --check` — успешно;
- API role/upload/admin suite: `22 passed`;
- browser smoke обычного пользователя: нет workspace/global administration, switcher показывает `Участник команды`,
  прямой workspace settings выдаёт русское ограничение, недавняя активность полностью на русском;
- browser keyboard smoke: быстрый переход `Открыть холст` открыл project Canvas; project navigation и Help проверены
  по доступному DOM.

## Повторная проверка 2026-09-20

- устранена некорректная вложенность кнопок в меню `Помощь`, `Профиль`, drag handle и быстрых действиях проекта;
- ссылка проекта больше не содержит вложенную disclosure-кнопку: один доступный элемент одновременно открывает проект и
  управляет раскрытием его меню;
- trigger уведомлений получил стабильный DOM-элемент для tooltip ref, поэтому React больше не выдаёт предупреждение о
  передаче `ref` функциональному компоненту;
- синхронизация `IssueRootStore` и завершение загрузки `BaseWorkspaceRootStore` переведены в MobX actions; предупреждения
  о записи observable вне action и исключение при ранней инициализации store устранены;
- root `HydrateFallback` и первый кадр языкового bootstrap теперь используют один экран загрузки, как требует SPA mode
  React Router; production build формирует этот fallback в `build/client/index.html`;
- browser smoke подтвердил чистую доступную структуру верхнего меню: `Помощь` содержит только руководство PPM,
  горячие клавиши, сообщение о проблеме и версию; у пользователя без глобальной роли меню `Профиль` содержит только
  профиль и выход;
- после исправлений в свежей браузерной сессии отсутствуют прежние `validateDOMNesting`, MobX strict-mode и React ref
  ошибки. Инструментированный in-app browser всё ещё сообщает общий document hydration mismatch и предупреждения
  сторонних библиотек tldraw/drag-and-drop; они не воспроизводятся статической проверкой итогового SPA shell и остаются
  отдельным предметом диагностики, без ложного закрытия карточки.

### Verification 2026-09-20

- `pnpm --filter web check:types` — успешно;
- targeted `oxlint` для изменённых shell/store файлов — `0 warnings`, `0 errors`;
- web tests navigation/workspace/Canvas — `9 files`, `35 passed`;
- `pnpm --filter web build` — production build успешно;
- browser smoke после перезапуска dev server — меню `Помощь` и `Профиль`, быстрый Canvas entry и доступная структура
  проекта работают; обычному пользователю не показан глобальный административный центр.
