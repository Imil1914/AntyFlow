---
id: project-intellect-ppm
created: 2026-09-11
updated: 2026-09-20
type: project
project_home: true
project_id: intellect-ppm
status: active
priority: high
area: project-management
areas:
  - intellect
related_domains:
  - ai-math
owner: "Мамин И."
team:
  - Мамин
next_action: "Провести owner review I1.1, затем перейти к I1.2"
tags:
  - type/project
  - domain/intellect
---

# PPM — система интеллекта проекта

## Результат проекта

AntyFlow-first web-платформа для 5–20 команд проектной школы: единая среда управления задачами, файлами, знаниями, визуальными связями, проектным AI и кодом. Plane Community работает внутри как функциональный движок, но пользователь видит самостоятельный продукт PPM.

## Состояние сейчас

- Проект создаётся для фонда «Интеллект».
- Архитектурное решение уточнено владельцем: Plane Community полностью входит в поставку как внутренний движок, но не задаёт внешний вид и первый пользовательский опыт.
- AntyFlow становится основой оболочки, навигации и дизайн-языка всего продукта; центральный экран проекта — `Мозг проекта` на базе Canvas.
- Plane остаётся источником истины для auth, workspace, projects, Work Items, Cycles, Modules, Views и Pages.
- Project Vault становится источником истины для папок, Markdown-заметок, PDF и остальных проектных файлов.
- Project Brain строит отдельный для каждого project индекс и граф, отвечает с цитатами и предлагает связи; индекс всегда производный и восстанавливаемый.
- Git-контур связывает проект, Work Items и Canvas с внешним или self-hosted Git provider; PPM не пишет собственный Git-сервер.
- Актуальная стабильная база интеграции — Plane `v1.4.2` под AGPL-3.0.
- Предыдущие web-first v1 и Plane-first v2 сохранены как история и помечены `superseded`.
- I0.3 принята владельцем 2026-09-13 и зафиксирована отдельным локальным коммитом Plane fork; push не выполнялся.
- Для I0.3 реализованы и проверены на работающем API PPM shell, русский first path, сохранение выбора языка, reload-safe navigation, штатный Work Item flow, runtime-варианты Guest/Viewer, Member и Admin, keyboard/focus semantics.
- Автоматические проверки I0.3 проходят: brand tests/audit, navigation tests, typecheck, lint, production PPM build и rollback Plane build.
- I0.4 принята владельцем 2026-09-13: browser-safe `Мозг проекта` поддерживает note/group, визуальные стрелки, локальное сохранение, project isolation и read-only режим.
- Автоматические проверки I0.4, production/rollback builds, ручной Canvas smoke и повторный контейнерный auth/outsider smoke через Plane API проходят.
- I1.1 реализована локально и передана на owner review: Vault поддерживает backlinks/graph, stable rename/move,
  версии и restore, корзину, ZIP export и явный обмен с `Документами` с provenance.
- **Ответственный:** Мамин И.
- **Статус:** I1.1 в `review`; `accepted` выставляет только владелец.

## Документация

- [Каноническое Intelligence-first ТЗ v3](<Документация PPM/Intelligence-first/README.md>)
- [Принятое архитектурное решение](<Документация PPM/Intelligence-first/Решение — AntyFlow-first система интеллекта проекта.md>)
- [План реализации и релизы](<Документация PPM/Intelligence-first/15 — План реализации и релизы.md>)
- [Матрица требований](<Документация PPM/Intelligence-first/20 — Матрица требований и трассировка.md>)
- [Очередь I0, I1 и Git](<Документация PPM/Intelligence-first/tasks/README.md>)
- [Историческая редакция v2](<Документация PPM/Plane-first/README.md>)
- [Историческая редакция v1](<Документация PPM/README.md>)

## Следующий шаг

- [ ] Провести owner review I1.1 по сценарию из карточки, не выставляя `accepted` автоматически.
- [ ] После решения владельца перейти к I1.2 — Semantic GraphRAG и память проекта.
- [ ] I0.10 оставить после AF1.2; не возвращать циклическую зависимость I1.1 от release gate.

## Журнал изменений

### 2026-09-20

- I1.1 доведена до `review`: добавлены backlinks/graph, stable rename/move, версии/restore, корзина, безопасный ZIP и
  явный Page↔Markdown transfer с provenance; общий backend regression, web/Canvas tests, build и browser smoke прошли.
- Исправлена циклическая зависимость: I1.1 теперь зависит от I0.7 и AF0.5, а I0.10 остаётся release gate после AF1.2.

### 2026-09-13

- Владелец принял I0.4 переходом к следующему этапу.
- После успешной загрузки закреплённого backend image повторён контейнерный auth/outsider smoke: unauthenticated получает `401`, Admin/Member/Guest — `200`, outsider — `409/404`; временные изменения ролей полностью откатились.
- I0.4 доведена до `review`: реализован browser-safe Canvas core, note/group, visual arrows, role-aware UI и обратимый feature flag.
- Владелец принял I0.3 переходом к следующему этапу; начата подготовка отдельной ветки I0.4.

### 2026-09-12

- I0.3 доведена до `review`: полный auth/project/Work Item E2E и runtime-матрица ролей пройдены на локальном API, production и rollback builds проходят.
- Владелец расширил целевой продукт: AntyFlow-first оболочка, Project Vault, изолированный Project Brain и интегрированный Git-контур.
- Создана каноническая Intelligence-first редакция ТЗ v3 с архитектурой, моделью данных, API, UX, безопасностью, эксплуатацией, тестированием и исполнимой очередью.
- Plane-first v2 сохранена как историческая редакция; её карточки больше не являются исполнительной очередью.
- Сформирован новый подход к продукту для 5–20 команд.
- Создан комплект web-first документации, двухдневный критический путь и очередь P0.1–P0.8.
- Полноценный Git-контур вынесен после приёмки MVP.
- По решению владельца подход заменён: Plane Community становится ядром продукта, AntyFlow — встроенным project Canvas.
- Создана актуальная Plane-first редакция ТЗ и очередь PF0.1–PF0.7; первоначальный план сохранён как `superseded`.

### 2026-09-11

- Создана главная карточка проекта.
