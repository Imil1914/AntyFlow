# I0.2 — Инвентаризация бренд-поверхностей PPM

Актуально на 2026-09-19. Этот перечень фиксирует точки подключения бренда без массового изменения бизнес-компонентов.

| Поверхность | Источник | Проверка |
|---|---|---|
| Название, описание, accent, assets | `plane-fork/packages/ppm-brand/src/index.ts` | `@ppm/brand` unit tests |
| Graphite/Light tokens и Plane/Propel bridge | `plane-fork/packages/ppm-brand/src/tokens.css` | token/contrast tests |
| Root title, meta, favicon и PWA manifest | `plane-fork/apps/web/app/root.tsx` | E1 browser gate |
| PPM mark и lockup | `plane-fork/apps/web/public/ppm-brand/` | asset existence и browser smoke |
| Основной ProductLogo | `plane-fork/apps/web/core/components/ppm-shell/product-logo.tsx` | feature-flag smoke |
| IBM Plex Sans / JetBrains Mono | `plane-fork/apps/web/app/root.tsx` | production build/offline bundle |
| Button/Input/Dialog/Toast | `/about/brand-foundation` | Light/Graphite visual screenshot |
| Версия, лицензия и исходный код PPM | `/about/open-source` | E1 legal/source gate |
| Feature flags | `PPM_BRAND_ENABLED`, `PPM_SHELL_ENABLED` | enabled/disabled unit tests |
| Основные пользовательские строки | `plane-fork/packages/ppm-brand/scripts/audit-user-facing-brand.mjs` | контролируемый audit allowlist |

## Допустимое упоминание базового движка

Название базового open-source компонента хранится только в `packages/ppm-brand/build-manifest.json` для лицензии,
воспроизводимости сборки и upstream attribution. Основной пользовательский путь, логотип, meta и ссылка на исходный код
указывают на PPM.

## Визуальная проверка

E2E-сценарий `E1` открывает `/about/brand-foundation`, одновременно проверяет Light и Graphite, реальные компоненты
Propel, открывает Dialog и сохраняет attachment `i0-2-brand-foundation-light-graphite.png`.
