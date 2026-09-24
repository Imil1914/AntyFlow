---
type: implementation_task
project_id: intellect-ppm
task_id: ADM0.1
status: review
priority: P0
created: 2026-09-19
updated: 2026-09-19
---

# ADM0.1 — Центр глобального администратора

## Пользовательский результат

Защищённый администратор PPM видит все проекты и их состояние в отдельном административном режиме. РП и обычные
участники не видят этот интерфейс и не могут получить доступ прямым URL.

## Зависимости и входы

- AF0.1 accepted;
- protected global-admin registry и audit policy;
- документы 05, 06 и 13.

## Scope

- список/поиск проектов и пользователей;
- состояние Canvas/Vault/Brain/Git integrations;
- вход в проект в явно обозначенном admin mode;
- re-auth для опасных операций;
- audit просмотра и административных действий;
- empty/error/degraded states;
- negative tests для всех неглобальных ролей.

## Не входит

- выдача global admin через UI;
- чтение provider secrets;
- скрытое действие от имени РП;
- массовое удаление проектов.

## Критерии приёмки

1. Global admin находит и открывает любой проект.
2. Admin mode заметен и не смешивается с membership проекта.
3. РП, участник и наблюдатель получают `403` на API и route.
4. Каждое административное действие появляется в audit.
5. Назначение/снятие global admin выполняется только утверждённым bootstrap-процессом.

## Проверки

- role matrix и direct URL/API negative tests;
- re-auth и audit;
- поиск/пагинация;
- revoked/deactivated project;
- build и browser smoke.

## Rollback

Выключить admin-center feature flag. Protected registry и audit records сохраняются.

## Реализация

- добавлен защищённый API `/api/ppm/v1/admin/` для проверки роли, поиска проектов и пользователей, аудита,
  входа в проект в admin mode и повторного подтверждения пароля;
- global admin наследует административный доступ ко всем рабочим пространствам и проектам без создания скрытого
  membership;
- добавлен отдельный экран `/ppm-admin` с вкладками «Проекты», «Пользователи», «Аудит», состоянием
  Canvas/Vault/Brain/Git и честными статусами ещё не настроенных интеграций;
- вход в проект из центра добавляет `ppm_admin_mode=1` и показывает заметный баннер с возвратом в центр;
- пункт «Центр администратора» появляется в меню профиля только у владельца защищённой роли;
- назначение и снятие роли остаются только в защищённой management-команде с actor/reason и отдельным role audit;
- добавлен feature flag `PPM_ADMIN_CENTER_ENABLED`; административные записи при отключении не удаляются.

## Доказательства

- API contract: `63 passed` — role matrix, все рабочие пространства/проекты, revoked role, поиск, пагинация,
  re-auth, audit, multi-board Canvas и миграция истории;
- frontend: `27 passed`, `@ppm/brand` — `19 passed`, brand audit — `passed`;
- `ruff`, Django system check и `makemigrations --check` — без ошибок;
- web typecheck и production build — успешно;
- browser smoke: защищённый администратор открыл `/ppm-admin`, увидел оба проекта, пользователей и audit, вошёл
  в проект с баннером admin mode; после отзыва временной тестовой роли direct URL показал запрет доступа;
- миграция `ppm_canvas.0004_global_admin_center_audit` применена в локальной среде.
