# Волна 1 — карта инфраструктуры: тема по умолчанию, плотность, шрифты

Дата: 2026-09-24, ~21:05–21:40. Режим: только чтение в `/Users/ermolov/Desktop/PPM` (правок, сборок, установок
не было). Рабочее дерево `plane-fork` с незакоммиченной волной 0 считается истиной. Запускались только
существующие юнит-тесты и аудиты (они только читают файлы):

- `packages/ppm-brand`: `vitest run --no-cache` дал **3 файла, 41/41**. `audit-tailwind-classes.mjs` прошёл
  (30 файлов, есть предупреждения). `audit-user-facing-brand.mjs` прошёл.
- `apps/web`: `vitest run --no-cache` дал **30 файлов, 184/184**.

Проверочные скрипты лежат в `wave1/map/tools/`. Все они только читают, пути к репозиторию в них абсолютные.

| Скрипт | Что делает |
|---|---|
| `woff2-axes.mjs` | Разбирает таблицу `fvar` у woff2 и печатает оси вариативного шрифта |
| `tw-candidates.mjs` | Загружает дизайн-систему Tailwind из `apps/web/styles/globals.css` (как это делает аудит классов) и печатает CSS для указанного класса |
| `cn-probe.mjs`, `cn-probe2.mjs` | Повторяет дословно конфиг `twMerge` из Plane и показывает, какие классы `cn()` отбрасывает |

Мокапы: `design-canvas/project/H-Tasks-{Dark,Light,Compact}.dc.html` появились в 21:30 и учтены ниже.
Файла `H-System.dc.html` пока нет.

---

## 0. Главное

1. **Тема по умолчанию.** Нужна правка в одну строку: `apps/web/app/root.tsx:111`
   `defaultTheme={IS_PPM_BRAND_ENABLED ? "dark" : "system"}` заменить на `defaultTheme="system"`. Это ровно
   upstream v1.4.2. Пользователей, которые уже выбрали тему, правка не трогает: их выбор лежит в
   `profile.theme.theme` на сервере и в `localStorage["theme"]`. Сменится тема только у тех, у кого нет ни того,
   ни другого. Заодно правка чинит скрытый баг: сейчас под брендом при светлой контрастной и «custom» теме
   next-themes ставит на `<html>` inline-стиль `color-scheme: dark` (§1.6).
2. **Плотность.** Значение хранится в `profile.theme.ppm_density` (JSON-поле, миграция не нужна) и зеркалится
   в `localStorage["ppm_density"]`. Применяется через `<html data-ppm-density>`: атрибут ставит inline-скрипт в
   `<head>` до первой отрисовки, а после загрузки профиля его синхронизирует `PpmDensitySync`. Токены живут в
   `tokens.css` и включаются только под флагом бренда. Переключатель ставится на страницу
   `/settings/profile/preferences` рядом с выбором темы.
   **Глобальный рычаг `--text-13` отвергнут.** Мокапы H-Tasks оставляют хром (сайдбар, кнопки) 13 px в обеих
   плотностях, а `text-13` используется примерно в 959 местах.
3. **Ловушка в `cn()`.** Конфиг `twMerge` в Plane (`packages/utils/src/common.ts:15-69`) считает любой
   неизвестный или произвольный `text-*` цветом. Поэтому `cn("text-(length:--x) text-secondary")` превращается
   в `"text-secondary"`, и размер пропадает. Для размера шрифта с учётом плотности нужны утилиты без префикса
   `text-` (`@utility ppm-text-*`). Для высот и отступов подходят Tailwind-классы с переменной:
   `h-(--ppm-row-height,2.75rem)`, `cn` сливает их корректно.
4. **Шрифты.** Сейчас грузится `@fontsource-variable/ibm-plex-sans` (`index.css`), в его файлах есть только
   ось `wght`, поэтому `font-stretch` не работает. Нужно заменить импорт на `…/ibm-plex-sans/wdth.css`: это
   проверенные оси wght 100–700 и wdth 75–100. Моноширинный шрифт перевести с JetBrains Mono на IBM Plex Mono
   400/500 (400 уже импортирован), а preload Inter под брендом заменить на Plex. Лицензия у всех шрифтов OFL-1.1.

---

## 1. Тема по умолчанию

### 1.1 Текущий код

`apps/web/app/root.tsx` (рабочее дерево):

```tsx
 46  const IS_PPM_BRAND_ENABLED = isPpmBrandEnabled(process.env.PPM_BRAND_ENABLED);
 ...
 86    <html
 87      data-ppm-brand={IS_PPM_BRAND_ENABLED ? "enabled" : "disabled"}
 88      data-ppm-shell={IS_PPM_SHELL_ENABLED ? "enabled" : "disabled"}
 89      lang={IS_PPM_SHELL_ENABLED ? "ru" : "en"}
 90      suppressHydrationWarning
 91    >
 ...
 95        <meta name="theme-color" content={IS_PPM_BRAND_ENABLED ? PPM_BRAND.themeColor : "#fff"} />
 ...
109        <ThemeProvider
110          themes={["light", "dark", "light-contrast", "dark-contrast", "custom"]}
111          defaultTheme={IS_PPM_BRAND_ENABLED ? "dark" : "system"}
112        >
```

- Откуда это взялось: `git log -S'IS_PPM_BRAND_ENABLED ? "dark"'` указывает на коммит `7e6aa54d51 feat(ppm): add
  brand foundation and token bridge` (I0.2). В upstream baseline `5f7d92784c:apps/web/app/root.tsx:81` стоит
  `<ThemeProvider themes={[…]} defaultTheme="system">`.
- `PPM_BRAND.themeColor = "#0E0F12"` (`packages/ppm-brand/src/index.ts:7`). В
  `apps/web/public/site.ppm.webmanifest.json` `background_color` и `theme_color` тоже `#0E0F12`.
- Флаги вычисляются при сборке: `apps/web/vite.config.ts:16-20` через `define: {"process.env": …}`. Режим SPA:
  `apps/web/react-router.config.ts` задаёт `ssr:false`, root-макет пререндерится в `build/client/index.html`.

### 1.2 Как работает next-themes 0.4.6

Код: `node_modules/.pnpm/next-themes@0.4.6…/dist/index.mjs`.

- Значения по умолчанию: `storageKey="theme"`, `attribute="data-theme"`, `enableSystem=true`,
  `enableColorScheme=true`. Когда `defaultTheme` не задан, он равен `enableSystem ? "system" : "light"`.
- Inline-скрипт в `<body>` выполняется до контента:
  `localStorage.getItem("theme") || defaultTheme`. Если результат `system`, тема вычисляется через
  `matchMedia("(prefers-color-scheme: dark)")`. В `data-theme` всегда записывается **вычисленное значение**
  (`light` или `dark`), `system` туда не попадает никогда. В пререндеренном `build/client/index.html` скрипт
  сейчас вызывается с аргументами `("data-theme","theme","dark",null,[…],null,true,true)`.
- Значение по умолчанию **не пишется** в localStorage. Туда пишет только `setTheme()`, а также обработчик
  события `storage`, когда ключ удалили в другой вкладке. Если тема `system`, next-themes слушает `matchMedia`
  и сам переключает `data-theme` при смене темы ОС.
- `resolvedTheme` при `system` возвращает `light` или `dark`. Все потребители сравнивают именно его:
  `app/provider.tsx:39-46` (Toast), `ppm-canvas/editor.tsx:222-223,598-600` (colorScheme в tldraw), примерно 20
  мест с картинками пустых состояний. Все они работают и при `system`.
- Селекторы `tokens.css` совместимы с этим поведением:
  - `:where(html)[data-ppm-brand="enabled"]` (`:47`) задаёт светлые роли по умолчанию и срабатывает даже без
    `data-theme`;
  - `:where(html)[data-ppm-brand="enabled"]:where([data-theme*="dark"])` (`:118`) задаёт тёмные роли;
  - семантический мост (`:187-188`) и границы вне `-contrast` (`:233-234`) тоже совпадают.

  Поскольку next-themes пишет в атрибут `light` или `dark`, подстроки `*="light"` и `*="dark"` срабатывают.

### 1.3 Где хранится выбор темы

| Слой | Где | Код |
|---|---|---|
| Сервер | `Profile.theme = models.JSONField(default=dict)` | `apps/api/plane/db/models/user.py:227` |
| API | `GET/PATCH /api/users/me/profile/`; `ProfileSerializer(fields="__all__")`; PATCH с `partial=True` **целиком заменяет** JSON в `theme` | `apps/api/plane/app/urls/user.py:48`, `app/serializers/user.py:201-205`, `app/views/user/base.py:416-430` |
| Создание профиля | `Profile.objects.create(user=user)`, `theme` остаётся `{}` | `authentication/adapter/base.py:390`, `license/api/views/admin.py:244`, `authentication/views/app/magic.py:120`, `authentication/utils/redirection_path.py:10` |
| Типы | `IUserTheme {theme; primary?; background?; darkPalette?}` и отдельный inline-тип `TUserProfile.theme` | `packages/types/src/users.ts:105-110`, `:67-72` |
| Store | `updateUserTheme(data)` сливает `data` в `this.data.theme` и отправляет PATCH **со всем объектом** `theme` | `apps/web/core/store/user/profile.store.ts:243-269` (PATCH на `:252-254`) |
| Сервер → клиент | StoreWrapper, Effect 1: **один раз на сессию пользователя** вызывает `setTheme(profile.theme.theme)`, только если значение есть | `apps/web/core/lib/wrappers/store-wrapper.tsx:56-77` (условие на `:68`) |
| Запись выбора | ThemeSwitcher: `setTheme(v)`, затем `updateUserTheme({theme:v})` и `reload` | `core/components/appearance/theme-switcher.tsx:43-82` (`:46`, `:62`, `:76`) |
| | Power-K: `setTheme`, затем `updateUserTheme` и `reload` | `core/components/power-k/config/preferences-commands.ts:30-55` |
| Выход | `resetOnSignOut()` пишет `localStorage.setItem("theme","system")` | `core/store/root.store.ts:141-143` |
| | Окно смены аккаунта вызывает `setTheme("system")` | `core/components/onboarding/switch-account-modal.tsx:45` |

Во всём API слово `theme` встречается только в модели, сид-данных с темой нет. Бэкенд-тестов на `theme` нет.

### 1.4 На кого повлияет `defaultTheme="system"`

| Пользователь | `localStorage.theme` | `profile.theme.theme` | Сейчас | После правки |
|---|---|---|---|---|
| Новый, свежий браузер | нет | нет (`{}`) | тёмная | тема ОС ✔ |
| Не выбирал тему, ни разу не выходил из аккаунта | нет | нет | тёмная | **тема ОС** (единственная видимая смена; выбора у него не было) |
| Выходил из аккаунта | `"system"` (записано в `root.store.ts:143`) | нет | уже тема ОС | без изменений |
| Выбрал тему явно | есть | есть | его тема | его тема ✔ |
| Выбрал тему, открыл новое устройство | нет | есть | тёмная, потом его тема | тема ОС, потом его тема: однократная вспышка, если он выбрал тёмную на светлой ОС |

Значение `"dark"` в `localStorage.theme` появляется только через `setTheme`, то есть после явного выбора или
синхронизации с профиля. Поэтому правка **не перетирает** уже сделанный выбор.

### 1.5 Минимальный diff и опции

```diff
--- apps/web/app/root.tsx
-        <ThemeProvider
-          themes={["light", "dark", "light-contrast", "dark-contrast", "custom"]}
-          defaultTheme={IS_PPM_BRAND_ENABLED ? "dark" : "system"}
-        >
+        <ThemeProvider themes={["light", "dark", "light-contrast", "dark-contrast", "custom"]} defaultTheme="system">
```

Опционально, хотя и рекомендуется:

- **theme-color** (`root.tsx:95`). Сейчас под брендом браузерный хром всегда тёмный. Предлагается:
  ```tsx
  {IS_PPM_BRAND_ENABLED ? (
    <>
      <meta name="theme-color" media="(prefers-color-scheme: light)" content={PPM_BRAND.themeColorLight} />
      <meta name="theme-color" media="(prefers-color-scheme: dark)" content={PPM_BRAND.themeColor} />
    </>
  ) : (
    <meta name="theme-color" content="#fff" />
  )}
  ```
  Для этого в `PPM_BRAND` (`packages/ppm-brand/src/index.ts:3-14`) добавить `themeColorLight`. Hex-значения
  берутся из финальных токенов светлой («бумага») и тёмной («графит») тем, это зона токенов. `brand.test.ts`
  значение `themeColor` не проверяет.
- **ThemeSwitcher, когда профиль пуст** (`theme-switcher.tsx:37-41`). Сейчас там показывается плейсхолдер
  «Выберите тему». Честнее показывать фактическое значение `system` («Системные настройки», ключ
  `system_preference` уже есть в `packages/i18n/src/locales/ru/common.json:81`):
  `THEME_OPTIONS.find((o) => o.value === (userProfile?.theme?.theme ?? (IS_PPM_BRAND_ENABLED ? "system" : undefined)))`.
- **E2E**. `apps/web/e2e/ppm-demo.spec.ts:270` делает скриншот `"e1-overview-dark"`, не задавая
  `colorScheme`. В Playwright по умолчанию `light`, поэтому после правки скриншот станет светлым, а имя останется
  «dark». Нужно задать `colorScheme: "dark"` в `newContext` (`:99-106` и `:233-240`) или переименовать
  скриншот. Визуальный тест `:621-635` выставляет тему явно, его правка не затрагивает. Юнит-тестов, которые
  опираются на тёмную тему по умолчанию, нет.

### 1.6 Побочный эффект: исправление color-scheme

В `S()` next-themes есть ветка `enableColorScheme`: `D = ["light","dark"].includes(resolved) ? resolved :
(["light","dark"].includes(defaultTheme) ? defaultTheme : null)`, затем `html.style.colorScheme = D`. Её поведение
смоделировано на node:

- `defaultTheme=dark` (сейчас): у `light-contrast` и `custom` получается **`color-scheme: dark` inline**.
  Inline-стиль сильнее `color-scheme: light` из `tokens.css:49`, поэтому скроллбары и нативные контролы
  становятся тёмными на светлом UI.
- `defaultTheme=system`: получается `null`, inline-свойство снимается, и `color-scheme` берётся из CSS.

После правки баг исчезает. Upstream с брендом выключенным вёл себя так же.

---

## 2. Плотность («Удобная» по умолчанию и «Компактная»)

### 2.1 Что показывают мокапы H-Tasks

`H-Tasks-Dark` («Удобная») сравнивался с `H-Tasks-Compact` («Компактная»). Размеры извлечены из inline-стилей.

| Элемент | Удобная | Компактная |
|---|---|---|
| Строка задачи | 36 px | 32 px |
| Заголовок задачи (контент) | 400 14/20 | 400 13/20 |
| Заголовок группы и панели («В работе», «Требует внимания») | 600 14/20 | 600 13/20 |
| ID (`ROBOT-15`, IBM Plex Mono) | 400 12/16 | 400 11/16 |
| Пункт сайдбара (Главная, Черновики, Задачи) | 32 px, **13/20** | 28 px, **13/20** |
| Кнопка «Новая задача», контролы топбара | 32 px, 500 13/20 | 28 px, 500 13/20 |
| Чипы фильтров | 28 px | 24 px |
| Топбар | 48 px | 44 px |
| Шапка страницы (крошки и вид), шапка колонки куратора | 52 px | 44 px |
| Горизонтальный паддинг страницы | 24 px | 16 px |
| Корневой шрифт артборда | 14/20 | 13/20 |

**Вывод.** Плотность меняет контентный текст (14→13), моно-метаданные (12→11) и все высоты. Хром остаётся
13 px в обеих плотностях.

### 2.2 Где хранить

Рекомендуется ключ `profile.theme.ppm_density: "comfortable" | "compact"` плюс зеркало
`localStorage["ppm_density"]`.

- Бэкенд и миграция не нужны. `theme` — это `JSONField(default=dict)`, сериализатор `fields="__all__"`
  принимает любые ключи. Upstream читает только `theme/primary/background/darkPalette`.
- Существующие записи ключ сохраняют. `updateUserTheme` сливает изменения в `this.data.theme` и отправляет весь
  объект (`profile.store.ts:246-254`), поэтому ThemeSwitcher, CustomThemeSelector и Power-K не затирают
  `ppm_density`. Других мест, которые пишут `theme` в обход этой функции, нет: `grep "theme:"` по
  `apps/web/core/{store,components/onboarding,services}` ничего не находит.
- MobX 6.12 работает на прокси (`configure` нигде не вызывается), поэтому новый ключ в
  `profile.data.theme` реактивен.
- Префикс `ppm_` нужен, чтобы в будущем не пересечься с upstream-ключом (например, у upstream уже есть отдельное
  поле `notification_view_mode: full|compact`).
- Вариант «только localStorage» отвергнут: выбор не переносится между устройствами.
- Отдельное поле модели тоже отвергнуто: это миграция в форке Plane.

Типы: изменение в `packages/types/src/users.ts`. Пакет потребляется из `dist`, после правки нужен
`pnpm --filter @plane/types build`.

```diff
+export type TPpmDensity = "comfortable" | "compact";
 export type TUserProfile = {
   ...
   theme: {
     theme: string | undefined;
     primary: string | undefined;
     background: string | undefined;
     darkPalette: boolean | undefined;
+    ppm_density?: TPpmDensity;
   };
 ...
 export interface IUserTheme {
   theme: string | undefined; // 'light', 'dark', 'custom', etc.
   primary?: string | undefined;
   background?: string | undefined;
   darkPalette?: boolean | undefined;
+  ppm_density?: TPpmDensity; // PPM: «Удобная»/«Компактная»; absent = comfortable
 }
```

Если upstream-типы трогать не хочется, можно добавить поле в `IUserTheme` через module augmentation. Но
`TUserProfile.theme` — inline-тип, его так не расширить, и чтение пришлось бы делать через каст. Поэтому
рекомендуется правка в две строки, как и прежние мелкие правки PPM в upstream-пакетах
(`packages/tailwind-config/variables.css`: `--text-color-on-accent: var(--txt-on-accent, var(--txt-on-color))`).

### 2.3 Применение до первой отрисовки и синхронизация

**Чистые хелперы** кладутся в `packages/ppm-brand/src/index.ts`, рядом с `isPpmBrandEnabled` (`:1693`). После
правки нужен `pnpm --filter @ppm/brand build`, потому что web импортирует `dist/index.mjs`.

```ts
export const PPM_DENSITIES = ["comfortable", "compact"] as const;
export type TPpmDensity = (typeof PPM_DENSITIES)[number];
export const PPM_DEFAULT_DENSITY: TPpmDensity = "comfortable";
export const PPM_DENSITY_STORAGE_KEY = "ppm_density";
export const PPM_DENSITY_ATTRIBUTE = "data-ppm-density";
export function normalizePpmDensity(value: unknown): TPpmDensity {
  return value === "compact" ? "compact" : PPM_DEFAULT_DENSITY;
}
/** Inline <head> script, prerendered into index.html: applies this device's copy before first paint. */
export const PPM_DENSITY_BOOTSTRAP_SCRIPT = `(function(){var d="${PPM_DEFAULT_DENSITY}";try{if(localStorage.getItem("${PPM_DENSITY_STORAGE_KEY}")==="compact")d="compact"}catch(e){}document.documentElement.setAttribute("${PPM_DENSITY_ATTRIBUTE}",d)})()`;
```

Тип `TPpmDensity` можно держать в `@ppm/brand` и реэкспортировать или продублировать в `@plane/types`. Это
строковый литерал, расхождения не будет.

**`root.tsx`**, внутри `<head>` перед `<Meta />`:

```tsx
{IS_PPM_BRAND_ENABLED && (
  <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: PPM_DENSITY_BOOTSTRAP_SCRIPT }} />
)}
```

- Скрипт попадает в пререндеренный `index.html` и выполняется до `<body>`, так же как скрипт next-themes.
- Атрибут **не** рендерится в JSX `<html>`. На `<html>` уже стоит `suppressHydrationWarning` (`:90`), и React не
  трогает атрибуты, которых нет в props. По тому же механизму выживает `data-theme`.
- CSP в репозитории нет, `react/no-danger` в oxlint не включён: правило из категории restriction, а в
  `.oxlintrc.json` включены только correctness, suspicious и perf.

**Новый файл `apps/web/core/components/ppm-shell/density.tsx`** (PPM-owned). Он автоматически попадает в
аудит классов и в тест `min-font-size`:

```tsx
import { useEffect } from "react";
import { observer } from "mobx-react";
import { isPpmBrandEnabled, normalizePpmDensity, PPM_DENSITY_ATTRIBUTE, PPM_DENSITY_STORAGE_KEY } from "@ppm/brand";
import type { TPpmDensity } from "@ppm/brand";
import { useUserProfile } from "@/hooks/store/user";

const IS_PPM_BRAND_ENABLED = isPpmBrandEnabled(process.env.PPM_BRAND_ENABLED);

export function applyPpmDensity(density: TPpmDensity) {
  document.documentElement.setAttribute(PPM_DENSITY_ATTRIBUTE, density);
  try { localStorage.setItem(PPM_DENSITY_STORAGE_KEY, density); } catch { /* private mode: attribute still applies */ }
}

/** Once the profile is loaded it is the source of truth; localStorage is only the pre-paint copy. */
export const PpmDensitySync = observer(function PpmDensitySync() {
  const { data: profile } = useUserProfile();
  const profileId = profile?.id;
  const density = normalizePpmDensity(profile?.theme?.ppm_density);
  useEffect(() => {
    if (!IS_PPM_BRAND_ENABLED || !profileId) return;
    applyPpmDensity(density);
  }, [profileId, density]);
  return null;
});
```

Монтируется в `apps/web/app/provider.tsx:45-47`, внутри `StoreProvider` и `TranslationProvider`, рядом с
`<Toast/>`: `<PpmDensitySync />`. Upstream `store-wrapper.tsx` при этом не меняется.

Семантика:

- Профиль загружен. Если у пользователя нет ключа, применяется `comfortable`, а localStorage перезаписывается,
  чтобы плотность прошлого пользователя на этом устройстве не протекала.
- Разлогинен. Остаётся локальная копия.
- `fetchUserProfile` вызывается вместе с текущим пользователем в `authentication-wrapper.tsx:45` через
  `store/user/index.ts:121`, так что профиль приходит рано.

### 2.4 CSS-токены в `packages/ppm-brand/src/tokens.css`

Токены кладутся **только на `<html>`**, как и тёмная тема. Специфичность у них (0,1,0), компактный блок идёт
после базового. Значения взяты из H-Tasks, их нужно сверить с H-System.

```css
  /* ---------------- Density (UX1): «Удобная» by default, «Компактная» from the profile ----------------
     On <html> only: the root.tsx bootstrap sets data-ppm-density before first paint; PpmDensitySync keeps it
     in step with profile.theme.ppm_density. Values: H-Tasks-{Dark,Compact}.dc.html. */
  :where(html)[data-ppm-brand="enabled"] {
    --ppm-font-size-content: 0.875rem; /* 14px: task titles, group/panel headings */
    --ppm-line-height-content: 1.25rem; /* 20px, both densities */
    --ppm-font-size-mono: 0.75rem; /* 12px: IDs, counters (IBM Plex Mono) */
    --ppm-line-height-meta: 1rem; /* 16px */
    --ppm-row-height: 2.25rem; /* 36px */
    --ppm-sidebar-item-height: 2rem; /* 32px */
    --ppm-control-height: 2rem; /* 32px: topbar controls, primary button */
    --ppm-chip-height: 1.75rem; /* 28px */
    --ppm-topbar-height: 3rem; /* 48px */
    --ppm-page-header-height: 3.25rem; /* 52px */
    --ppm-page-padding-x: 1.5rem; /* 24px */
  }
  :where(html)[data-ppm-brand="enabled"]:where([data-ppm-density="compact"]) {
    --ppm-font-size-content: 0.8125rem; /* 13px */
    --ppm-font-size-mono: 0.6875rem; /* 11px = UX0.2 metadata minimum */
    --ppm-row-height: 2rem;
    --ppm-sidebar-item-height: 1.75rem;
    --ppm-control-height: 1.75rem;
    --ppm-chip-height: 1.5rem;
    --ppm-topbar-height: 2.75rem;
    --ppm-page-header-height: 2.75rem;
    --ppm-page-padding-x: 1rem;
  }
```

Утилиты размера текста объявляются на верхнем уровне файла, вне `@layer`, в конце. Так уже сделан блок
`.editor-container`, и `@utility` обязан стоять на верхнем уровне:

```css
/* Density type utilities. Deliberately NOT `text-*`: Plane's cn() (packages/utils/src/common.ts:46-69) classifies
   unknown/arbitrary text-* values as colours, so `cn("text-(length:--x) text-secondary")` drops the size.
   Replace the element's text-13/text-body-* class with these; never stack both on one element. */
@utility ppm-text-content {
  font-size: var(--ppm-font-size-content, var(--text-13));
  line-height: var(--ppm-line-height-content, 1.4);
}
@utility ppm-text-mono-meta {
  font-family: var(--ppm-font-mono, var(--font-code));
  font-size: var(--ppm-font-size-mono, var(--text-12));
  line-height: var(--ppm-line-height-meta, 1rem);
}
```

Совместимость с тестами `token-contract.test.ts`:

- `lightRoles` и `darkRoles` ищутся по `[data-theme*=…]`, `constants` — по точному селектору
  `[data-ppm-brand="enabled"]`. Новые правила ни под один поиск не попадают.
- Тест «brand disabled means upstream» проверяет только префиксы `--bg-`, `--txt-`, `--border-`, `--neutral-`.
- Тест про глубину скобок для `.editor-container` проходит, потому что блоки `@utility` закрыты.

### 2.5 Как использовать токены: проверено в дизайн-системе Tailwind 4.1.17 и конфиге `cn`

| Нужно | Класс | CSS (`tw-candidates.mjs`) | Plane `cn()` (`cn-probe*.mjs`) |
|---|---|---|---|
| высота строки | `h-(--ppm-row-height)` или `min-h-(--ppm-row-height,2.75rem)` | `min-height: var(--ppm-row-height,2.75rem)` | ✔ `"min-h-11 py-3 min-h-(--ppm-row-height,2.75rem)"` даёт `"py-3 min-h-(…)"` |
| паддинг | `px-(--ppm-page-padding-x)` | `padding-inline: var(…)` | ✔ группа `px` |
| интерлиньяж | `leading-(--ppm-line-height-content)` | `--tw-leading` и `line-height` | ✔ группа `leading` |
| сужение шрифта | `font-stretch-(--ppm-font-stretch-narrow)`, статично `font-stretch-85%` | `font-stretch: var(…)` / `85%` | остаётся без изменений |
| размер контента | **`ppm-text-content`** (`@utility`) | см. выше | ✔ `"ppm-text-body text-secondary"` сохраняет оба класса |
| ✗ | `text-(length:--x)`, `text-[length:var(…)]`, `text-[13px]`, `text-ppm-body` | CSS генерируется | **✗ отбрасывается** при следующем `text-secondary`/`text-primary`: `"text-(length:--ppm-font-size-body) text-secondary"` даёт `"text-secondary"` |
| ✗ | `h-ppm-row` (theme/@utility) | CSS есть | `twMerge` его не знает: `"h-11 h-ppm-row"` оставляет оба класса, и победитель зависит от порядка CSS |

Причина: в `common.ts:16-17` у `isCustomTypography` инвертирован результат (`!regex.test`). Группа
`font-size` переопределена целиком (`override`), поэтому `isArbitraryVariableLength` и `isArbitraryLength` в неё
больше не входят. В `tailwind-merge@3.4.0` тема `color: [isAny]` забирает все остальные значения в `text-color`.
Идентичная копия конфига лежит в `packages/propel/src/utils/classname.tsx:46-69`.

**Правило IACVT для компонентов, принадлежащих Plane.** Такие компоненты рендерятся и при `PPM_BRAND_ENABLED=0`.
Там любая `var(--ppm-*)` обязана иметь fallback, равный upstream-значению на этом месте вызова
(`min-h-(--ppm-row-height,2.75rem)` вместо `min-h-11`). Второй вариант — ставить класс только в PPM-ветке
`isPpm… ? … : …`. Переменная без fallback при выключенном бренде становится invalid at computed-value time, и
свойство сбрасывается в `unset`: `height` уходит в `auto`, `line-height` наследуется. Это уже не upstream.

### 2.6 Инвентарь жёстких размеров Plane: места вызова для перевода на токены (в PPM-ветке)

Список задач (list layout, «список по статусам»):

- `issues/issue-layouts/list/block.tsx:182`: `"group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 …"`.
  Нужно `min-h-(--ppm-row-height,2.75rem)`, убрать `py-3`, выровнять строку по центру.
  На `:280` у названия стоит `text-body-xs-medium`, нужен `ppm-text-content` и `font-medium`.
- `list/list-group.tsx:267`: шапка группы `"w-full flex-shrink-0 border-b border-subtle bg-layer-1 py-1 pr-3 …"`.
  `list/headers/group-by-card.tsx:93`: `"… flex-shrink-0 items-center gap-2 py-1.5"`, на `:118` заголовок без
  размера (наследует), на `:119` счётчик `text-13`.
- `quick-add/root.tsx:167` (`px-2 py-3`), `:171` (`text-13`); `quick-add/form/list.tsx:30` (`py-3 text-13 leading-5`).
- `issues/workspace-draft/draft-issue-block.tsx:136`: копия строки списка (`min-h-11 … py-3 text-13`).
- Лоадер: `ui/loader/layouts/list-layout-loader.tsx:26` (`h-11 … py-3`).

Таблица (spreadsheet), если её затронут:

- `spreadsheet/issue-row.tsx:275` (`h-11 … text-13`), `issue-column.tsx:49`, `spreadsheet-header.tsx:54`,
  `spreadsheet-header-column.tsx:39`, `columns/*-column.tsx` (`h-11`).
- Лоадер: `ui/loader/layouts/spreadsheet-layout-loader.tsx:14,21,37,39`.

Оболочка:

- `core/components/core/app-header.tsx:27` (`h-11`, шапка страницы 44 px). В мокапе нужна
  `h-(--ppm-page-header-height,2.75rem)`.
- `packages/ui/src/header/helper.tsx:23-27`: `SECONDARY` задаёт `min-h-[52px]`.
- `--height-header: 3.25rem` (`tailwind-config/variables.css:719`) используют 6 мест через `h-header`.
- `navigation/top-navigation-root.tsx:57`: топбар `min-h-10`, нужно 48/44.
- `sidebar/sidebar-navigation.tsx:20`: `SidebarNavItem` `px-2 py-1`, высота определяется контентом, нужно
  `min-h-(--ppm-sidebar-item-height,0px)`.
- `workspace/sidebar/project-navigation.tsx:136-141`: `py-[1px]`, подпись `text-11 font-medium`. В мокапе 13/20.
- `workspace/sidebar/sidebar-menu-items.tsx:116,120,135,190`: `text-13`, `py-1.5`.
- `sidebar/sidebar-item.tsx:60-68`: рейка, `size-8`, `text-11`.

Прочие списки остаются upstream-плотными в волне 1: `core/list/list-item.tsx:72` (`min-h-[52px] py-4 text-13`),
`issue-detail-widgets/sub-issues/issues-list/list-item.tsx:116` (`min-h-11`).

Масштаб по `apps/web/{core,app,ce}`, `packages/{ui,propel,editor}`: `text-13` около 959 раз,
`text-body-xs-*` 79, `text-11` 649, `text-14` 100, `h-11` 40, `min-h-11` 6.

### 2.7 Отвергнутая альтернатива: глобальный рычаг `--text-13`

**Механизм проверен.** В собранном CSS класс `text-13` компилируется в `.text-13{font-size:var(--text-13)}`, а
`@layer theme{:root{--text-body-xs-regular:var(--text-13)}}` ссылается на ту же переменную (так же и в
`tailwind-config/variables.css:1186-1203`). Значит, одно правило
`:where(html)[data-ppm-brand="enabled"]{--text-13: var(--ppm-font-size-content)}` в `@layer base` перебило бы
значение из `@layer theme` и перекрасило бы примерно 1040 мест, включая `text-body-xs-*`.

**Почему отвергнут:**

1. Мокапы оставляют хром 13 px в «Удобной», а рычаг сделал бы его 14 px.
2. Около 959 мест вызова, риск обрезки текста в фиксированных ширинах. По вертикали риск мал: Propel `Button`
   base имеет `h-6` при `text-body-xs`, 14 × 1.4 = 19,6 px, это влезает. Сочетание «h-4/5/6 плюс text-13»
   встречается один раз (`project-states/state-item-title.tsx:59`).
3. Иерархия 13/14 схлопывается.

**Как вернуть при необходимости:** одна строка в базовом блоке плотности. Решение за владельцем, см. открытые
вопросы.

### 2.8 Интерфейс настройки

Маршрут `/settings/profile/preferences` строится так: `app/(all)/settings/profile/[profileTabId]/page.tsx`, затем
`core/components/settings/profile/content/pages/index.ts:13`, затем `preferences/root.tsx:18-42`, затем
`preferences/default-list.tsx:11-23`. Сейчас там только `<ThemeSwitcher option={{id:"theme",…}} />`.

```diff
--- apps/web/core/components/settings/profile/content/pages/preferences/default-list.tsx
 import { observer } from "mobx-react";
+import { isPpmBrandEnabled } from "@ppm/brand";
 // components
 import { ThemeSwitcher } from "@/components/appearance";
+import { PpmDensitySwitcher } from "@/components/ppm-shell/density-switcher";
+
+const IS_PPM_BRAND_ENABLED = isPpmBrandEnabled(process.env.PPM_BRAND_ENABLED);
 ...
       <ThemeSwitcher … />
+      {IS_PPM_BRAND_ENABLED && <PpmDensitySwitcher />}
     </div>
```

**Новый файл `apps/web/core/components/ppm-shell/density-switcher.tsx`.** Вёрстка повторяет ThemeSwitch:
`SettingsControlItem` из `settings/control-item.tsx:13-25` плюс `CustomSelect` из `@plane/ui`. Перезагрузка
страницы **не нужна**, переменные переключаются сразу.

```tsx
export const PpmDensitySwitcher = observer(function PpmDensitySwitcher() {
  const ppmT = usePpmTranslation();
  const { data: profile, updateUserTheme } = useUserProfile();
  const value = normalizePpmDensity(profile?.theme?.ppm_density);
  const label = (d: TPpmDensity) => ppmT(d === "compact" ? "preferences.density_compact" : "preferences.density_comfortable");
  const onChange = async (next: TPpmDensity) => {
    applyPpmDensity(next); // instant
    try {
      await updateUserTheme({ ppm_density: next });
    } catch {
      // the store rolls back itself (profile.store.ts:256-267); PpmDensitySync re-applies the previous value
      setToast({ type: TOAST_TYPE.ERROR, title: ppmT("preferences.density_error_title"), message: ppmT("preferences.density_error") });
    }
  };
  return (
    <SettingsControlItem
      title={ppmT("preferences.density")}
      description={ppmT("preferences.density_description")}
      control={
        <CustomSelect value={value} label={label(value)} onChange={(v: TPpmDensity) => void onChange(v)}
          buttonClassName="border border-subtle-1" placement="bottom-end" input>
          {PPM_DENSITIES.map((d) => <CustomSelect.Option key={d} value={d}>{label(d)}</CustomSelect.Option>)}
        </CustomSelect>
      }
    />
  );
});
```

**Строки** добавляются в `PPM_TRANSLATIONS` (`packages/ppm-brand/src/index.ts`, секции `en` около `:25` и `ru`
около `:821`). Паритет ключей обеспечивает тип `TPpmTranslationKey = keyof …["en"]`.

| Ключ | ru | en |
|---|---|---|
| `preferences.density` | «Плотность» | «Density» |
| `preferences.density_description` | «Размер текста и высота строк в списках и навигации.» | «Text size and row height in lists and navigation.» |
| `preferences.density_comfortable` | «Удобная» | «Comfortable» |
| `preferences.density_compact` | «Компактная» | «Compact» |
| `preferences.density_error_title` | «Плотность не сохранилась» | «Density was not saved» |
| `preferences.density_error` | «Попробуйте ещё раз.» | «Try again.» |

Запрещённых терминов из `i18n-overlay.test.ts:12-13` здесь нет.

**Опционально:**

- Команда Power-K «Плотность» в `power-k/config/preferences-commands.ts` рядом с `update_interface_theme`
  (`:106-120`, id на `:107`), под флагом бренда.
- На той же странице остались английские литералы волны 0: тосты темы в `theme-switcher.tsx:63-72`
  («Updating theme...», «Theme updated», «Reloading to apply changes...»), в
  `language-and-timezone-list.tsx:34-44,52-61,84,101-102` («Success!», «Select a language», «First day of the
  week», …). Если страницу всё равно трогают, их стоит перевести на шаблон
  `isPpmShell ? ppmT(...) : "<upstream>"`.

### 2.9 Флаги

| Флаг | Поведение при `0` |
|---|---|
| `PPM_BRAND_ENABLED=0` | Скрипта в `<head>` нет, `PpmDensitySync` ничего не делает, переключатель не рендерится, токены в `tokens.css` не активны (селектор `[data-ppm-brand="enabled"]`), классы с fallback дают upstream-значения. Ключ `ppm_density`, если он уже есть в профиле, upstream просто игнорирует |
| `PPM_SHELL_ENABLED`, `PPM_ANTYFLOW_SHELL_ENABLED`, `PPM_PROJECT_ASK_ENABLED` | Не участвуют. Строки берутся через `usePpmTranslation` по текущей локали, от шелла они не зависят |

---

## 3. Шрифты

### 3.1 Что сейчас

`apps/web/app/root.tsx:33-44`:

```tsx
34  // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the Inter font-face globally.
35  import "@fontsource-variable/inter";
36  import interVariableWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
37  // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM UI font-face globally.
38  import "@fontsource-variable/ibm-plex-sans";
39  // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM monospace font-face globally.
40  import "@fontsource-variable/jetbrains-mono";
41  // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the icon font-face globally.
42  import "@fontsource/material-symbols-rounded";
43  // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the editor monospace font-face globally.
44  import "@fontsource/ibm-plex-mono";
```

`root.tsx:69-79`: preload **Inter** (`inter-latin-wght-normal.woff2`) идёт безусловно. Под брендом Inter не
используется: `--font-body` и `--font-heading` указывают на `var(--ppm-font-sans)` (`tokens.css:41-43`). То есть
около 48 KB тратится впустую. В `build/client/index.html` это видно:
`<link rel="preload" href="/assets/inter-latin-wght-normal-Dx4kXJAl.woff2" …>`, URL совпадает с `@font-face` в
`root-*.css`.

Upstream baseline (`5f7d92784c`) импортирует только Inter, Material Symbols и **IBM Plex Mono**. У Plane
`--font-code` равен `"IBM Plex Mono", …` (`tailwind-config/variables.css:989-990`). PPM добавил Plex Sans
Variable и JetBrains Mono Variable.

Токены в `tokens.css`:

- `:26` — `--ppm-font-sans: "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;`
- `:27` — `--ppm-font-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Consolas, monospace;`
- `:41-43` — мост `--font-heading/--font-body/--font-code`;
- `:257-264` — `font-family` на `html` и `body` плюс `code, kbd, pre, samp`;
- `:323-330` — вне слоёв: `.editor-container{--font-style: var(--ppm-font-sans)}` и
  `.ProseMirror pre{font-family: var(--ppm-font-mono)}`. Upstream здесь пишет `JetBrainsMono, monospace`, но
  такое семейство не зарегистрировано (`packages/editor/src/styles/editor.css:238`).

`canvas.css:2707,3834,3962` использует `var(--ppm-font-sans|mono, …)` и сменит шрифт автоматически. Других
импортов `@fontsource` в web нет: admin и space грузят свои шрифты отдельно, бренд в них не подключён.

### 3.2 Что установлено: проверено разбором `fvar`

`@fontsource-variable/ibm-plex-sans@5.2.8` (OFL-1.1). По `metadata.json`: `wdth 75..100`, `wght 100..700`,
`ital`. Экспорты: `"./*.css"` и `"./files/*"`.

| CSS | Файлы | Дескрипторы в @font-face | Реальные оси (`woff2-axes.mjs`) |
|---|---|---|---|
| `index.css` (**сейчас**) = `wght.css` | `*-wght-normal.woff2`, 6 сабсетов | `font-weight: 100 700` | **только wght 100..700** |
| `wdth.css` = `standard.css` (файлы байт в байт одинаковые, CSS отличается только именем) | `*-wdth-normal.woff2` | `font-weight: 100 700; font-stretch: 75% 100%` | **wght 100..700 и wdth 75..100** |
| `wdth-italic.css`, `wght-italic.css`, `standard-italic.css` | италики | — | не импортируются, италик сейчас синтетический (так было и раньше) |

Размеры, байт:

| Сабсет | `wght` | `wdth` | Прирост |
|---|---|---|---|
| cyrillic | 29 512 | 46 012 | |
| latin | 45 712 | 65 488 | |
| cyrillic-ext | 23 568 | 36 668 | |
| latin-ext | 30 964 | 46 744 | |
| cyrillic + latin | 75 224 | 111 500 | **+36 276** |

`@fontsource/ibm-plex-mono@5.2.7` (OFL-1.1) статический, вариативной версии нет. Есть 70 woff2: веса 100–700,
normal и italic, сабсеты cyrillic, cyrillic-ext, latin, latin-ext, vietnamese. `index.css` содержит только 400
normal. Есть `500.css`. Вес 400 cyrillic+latin занимает 8 356 + 14 708 байт, вес 500 — 8 460 + 14 888 байт.

Мокапы H-Tasks загружают `IBM Plex Mono: wght@400;500` и `IBM Plex Sans: wdth,wght@85..100,400..600`. Везде,
где сужают текст, стоит `font-stretch: 85%`.

**Баланс под брендом для RU-UI** (cyrillic + latin):

| | Состав | Байт |
|---|---|---|
| Сейчас | Plex wght 75 224 + JetBrains 52 512 + лишний preload Inter 48 256 | около 176 000 |
| После правки | Plex wdth 111 500 + Plex Mono 400/500 46 412 | около 158 000 |
| Разница | | **около −18 KB** |

### 3.3 Минимальный diff

```diff
--- apps/web/app/root.tsx
 import "@fontsource-variable/inter";
 import interVariableWoff2 from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
-// oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM UI font-face globally.
-import "@fontsource-variable/ibm-plex-sans";
-// oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM monospace font-face globally.
-import "@fontsource-variable/jetbrains-mono";
+// oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the PPM UI font-face (wght 100–700, wdth 75–100) globally.
+import "@fontsource-variable/ibm-plex-sans/wdth.css";
+import plexSansCyrillicWoff2 from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-cyrillic-wdth-normal.woff2?url";
+import plexSansLatinWoff2 from "@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wdth-normal.woff2?url";
 // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the icon font-face globally.
 import "@fontsource/material-symbols-rounded";
 // oxlint-disable-next-line import/no-unassigned-import -- Fontsource registers the editor monospace font-face globally.
 import "@fontsource/ibm-plex-mono";
+// oxlint-disable-next-line import/no-unassigned-import -- PPM UI mono (IDs, counters) uses IBM Plex Mono 500.
+import "@fontsource/ibm-plex-mono/500.css";
 ...
   return [
     ...brandLinks,
     { rel: "stylesheet", href: globalStyles },
-    {
-      rel: "preload",
-      href: interVariableWoff2,
-      as: "font",
-      type: "font/woff2",
-      crossOrigin: "anonymous",
-    },
+    ...(IS_PPM_BRAND_ENABLED ? [plexSansCyrillicWoff2, plexSansLatinWoff2] : [interVariableWoff2]).map((href) => ({
+      rel: "preload",
+      href,
+      as: "font",
+      type: "font/woff2",
+      crossOrigin: "anonymous",
+    })),
   ];
```

```diff
--- packages/ppm-brand/src/tokens.css
     --ppm-font-sans: "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;
-    --ppm-font-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Consolas, monospace;
+    --ppm-font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
+    /* wdth axis of IBM Plex Sans Variable (75–100%), loaded by @fontsource-variable/ibm-plex-sans/wdth.css:
+       long titles narrow to this before any ellipsis. */
+    --ppm-font-stretch-narrow: 85%;
```

Пояснения к diff:

- **Preload совпадёт по URL.** `assetsInlineLimit: 0` (`vite.config.ts`) и дедупликация ассетов в Vite дают
  один URL и для `?url`, и для `@font-face`. Так уже работает с Inter.
- **Зависимость JetBrains в `apps/web/package.json:28` пусть остаётся.** Её удаление меняет lockfile. Импорт
  убирается, и шрифт перестаёт попадать в сборку.
- **Сужение в разметке:** `font-stretch-(--ppm-font-stretch-narrow)` или `font-stretch-85%`. Оба класса есть в
  Tailwind 4.1.17 и проходят аудит классов. `font-stretch` наследуется, поэтому при выключенном бренде
  переменная без значения даёт `unset`, то есть `inherit`, то есть `normal`. У Inter оси wdth всё равно нет.
- **Логика «сначала сузить, потом многоточие»** (A и JUDGE) — отдельная задача Холста и Задач. Инфраструктура
  даёт только ось wdth и токен.
- **Опционально.** Импорт `…/ibm-plex-sans/wdth-italic.css` даст настоящий италик в редакторе. Грузится он
  лениво, только если италик реально встречается на странице.
- **Опционально.** В `--ppm-font-sans` вернуть emoji-fallback, как у Plane (`"Apple Color Emoji", "Segoe UI
  Emoji", …`, `variables.css:983-988`).

### 3.4 Лицензии

Plex Sans, Plex Mono, Inter и JetBrains распространяются под OFL-1.1 (`metadata.json` и `LICENSE` в пакетах),
Material Symbols — под Apache-2.0. OFL разрешает встраивать шрифты в веб-приложение. Уведомлений о лицензиях
сторонних шрифтов в UI сейчас нет (`grep OFL` ничего не нашёл). Это не блокер, но строку в «О программе →
Исходный код» добавить можно.

### 3.5 Смежное (не моя зона, для плана)

- tldraw (`ppm-canvas/editor.tsx:2123-2130`, `<Tldraw>` без `assetUrls`) берёт свои шрифты и иконки с
  `https://cdn.tldraw.com` (`@tldraw/editor/dist-esm/lib/utils/assets.mjs:10`). Встроенные текстовые фигуры
  tldraw не используют Plex: у них свои переменные `--tl-font-sans` и прочие (`tldraw.css:122-125`). Ноды PPM
  (`PpmCanvasNodeShapeUtil`) рендерятся шрифтами PPM.
- `brand.test.ts:168-172` жёстко проверяет старый акцент: `PPM_BRAND.accentColor === "#22D3EE"` и литерал
  `--ppm-color-accent: oklch(0.7971 0.1339 211.53)`. Новый «спокойный циан» из зоны токенов потребует обновить
  эти ожидания.

---

## 4. Тесты и команды

Команды из каталога `plane-fork`. Текущий baseline — зелёный.

| Что | Команда | Сейчас |
|---|---|---|
| brand-тесты и аудиты | `cd packages/ppm-brand && ./node_modules/.bin/vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs` (равно `pnpm --filter @ppm/brand test`) | 41/41, оба аудита PASS |
| сборка dist после правки TS | `pnpm --filter @ppm/brand build`, `pnpm --filter @plane/types build`, или `pnpm exec turbo run build --filter='web^...'` | — |
| web unit | `cd apps/web && ./node_modules/.bin/vitest run` | 30 файлов, 184/184 |
| web typecheck | `cd apps/web && ./node_modules/.bin/react-router typegen && ./node_modules/.bin/tsc --noEmit` | 0 ошибок (baseline волны 0) |
| lint и формат | `apps/web`: `oxlint --max-warnings=11957 .` (baseline 719 предупреждений, 0 ошибок), `oxfmt --check`; brand: `oxfmt --check src scripts …` | — |
| сборка | `pnpm --filter web build`, затем проверка `build/client/index.html` и `build/client/assets/*.css` (ожидания ниже) | — |
| аудит классов по сборке | `node packages/ppm-brand/scripts/audit-tailwind-classes.mjs --built apps/web/build/client/assets` | — |
| e2e | `apps/web/e2e/ppm-demo.spec.ts`: визуальный тест light/dark плюс проверка `data-ppm-density` | — |

Что проверить в собранных файлах:

- аргументы next-themes заканчиваются на `…,"theme","system",…`;
- `<script>` с `data-ppm-density` в `<head>`;
- preload указывает на `ibm-plex-sans-cyrillic-wdth-normal-*.woff2` и `ibm-plex-sans-latin-wdth-normal-*.woff2`;
- в CSS есть `font-stretch:75% 100%` и `--ppm-font-mono:"IBM Plex Mono"`, нет `jetbrains-mono`.

**Новые тесты:**

1. `packages/ppm-brand/src/__tests__/brand.test.ts`, про хелперы плотности:
   - `normalizePpmDensity(undefined)`, `normalizePpmDensity("x")` и `normalizePpmDensity("compact")`;
   - `PPM_DENSITY_BOOTSTRAP_SCRIPT` запускается через `new Function("localStorage","document", script)` на
     заглушках: `compact` ставит `compact`, `null` ставит `comfortable`, исключение из `getItem` тоже ставит
     `comfortable`.
2. `packages/ppm-brand/src/__tests__/token-contract.test.ts`, раздел про плотность. Правила находить по
   декларациям: `rules.find(r => r.decls.has("--ppm-row-height") && !r.selector.includes("compact"))`.
   - оба правила гейтированы `data-ppm-brand="enabled"`;
   - ключи компактного правила входят в ключи базового;
   - каждое компактное значение не больше базового;
   - все размеры шрифта не меньше `0.6875rem`;
   - `--ppm-font-mono` начинается с `"IBM Plex Mono"`;
   - в `@utility ppm-text-*` есть fallback;
   - нигде нет `--text-13:`, чтобы глобальный рычаг не включили незаметно.
3. `apps/web/tests/ppm-shell/theme-font-density.test.ts`, скан исходников в стиле тестов волны 0:
   - в `root.tsx` есть `defaultTheme="system"` и нет `? "dark"`;
   - есть импорт `ibm-plex-sans/wdth.css` и нет импорта `jetbrains-mono`;
   - есть `ibm-plex-mono/500.css`;
   - скрипт плотности стоит за `IS_PPM_BRAND_ENABLED`;
   - `default-list.tsx` рендерит `PpmDensitySwitcher` за флагом бренда.

---

## 5. Риски

1. Пользователи PPM, которые тему не выбирали и ни разу не выходили из аккаунта, перейдут с тёмной на тему ОС.
   Это задумано, но изменение видимое.
2. Однократная вспышка «тема ОС → выбранная» на новом устройстве у тех, кто выбрал тёмную на светлой ОС: до
   Effect 1 в `store-wrapper.tsx:56-77`.
3. Статичный `theme-color #0E0F12` при светлой теме красит браузерный хром в тёмный. Лечится двумя мета-тегами с
   `media`. Манифест с `media` не работает.
4. `cn()` отбрасывает любые `text-(…)` и `text-[…]` размеры. Если плотность применить через `text-*`, размер
   молча пропадёт. Нужны `@utility ppm-text-*` и правило «не ставить вместе с `text-13`».
5. IACVT: `var(--ppm-*)` без fallback на компонентах Plane при `PPM_BRAND_ENABLED=0` уводит высоту в `auto`, а
   `line-height` в наследование. Нужен fallback, равный upstream, или класс только в PPM-ветке.
6. `@ppm/brand` и `@plane/types` читаются из `dist`. Без пересборки получите ложно-красные TS2305 и TS2339.
7. В `theme` любой будущий PATCH без слияния, например мобильный клиент, затёр бы `ppm_density`. Сейчас таких
   мест нет, `updateUserTheme` сливает. Если PATCH не прошёл, store откатывается, и `PpmDensitySync` сам
   возвращает прежнее значение.
8. Шрифт wdth добавляет около +36 KB на cyrillic + latin. Это перекрывается удалением JetBrains и preload Inter,
   итог около −18 KB. Италик остаётся синтетическим.
9. Шрифты и иконки tldraw идут с `cdn.tldraw.com`. В офлайн-развёртывании школ текстовые фигуры tldraw
   откатятся на системный шрифт.
10. Тема «custom» под брендом почти не работает, это наследство I0.2: мост `--bg-*` и `--txt-*` идёт на
    `--ppm-color-*`, а не на `--neutral-*` и `--brand-*` из `applyCustomTheme`. Правка default это не меняет.
11. На странице «Предпочтения» остались английские литералы и тосты Plane (§2.8).

## 6. Открытые вопросы

1. Принимаем ли, что PPM-пользователи без явного выбора переходят с тёмной на тему ОС? Рекомендация: да. Так
   ведёт себя upstream, и так уже происходит после выхода из аккаунта. Альтернатива — одноразовая миграция в
   `localStorage` для профилей, созданных раньше даты релиза.
2. Где хранить плотность: в профиле с зеркалом в localStorage (рекомендация) или только в localStorage?
3. Где действует плотность в волне 1: только на переделываемых поверхностях (оболочка, Задачи, хром Холста), а
   прочие списки Plane остаются upstream (рекомендация)? Или включаем глобальный рычаг `--text-13`, который
   противоречит мокапам хрома 13 px?
4. Точные значения таблицы плотности. Сейчас они из H-Tasks: 48/44, 52/44, 36/32, 32/28, 28/24, 14/13, моно
   12/11. Их нужно подтвердить по H-System, которого пока нет.
5. Нужна ли в волне 1 команда Power-K «Плотность» и сброс `ppm_density` при выходе из аккаунта?
6. Мета-теги `theme-color` для обеих схем: hex берём из финальных токенов «бумаги» и «графита»?
7. Скрывать ли под брендом «Пользовательскую тему» и контрастные темы из `THEME_OPTIONS`?
8. Грузить ли италик Plex Sans (`wdth-italic.css`)? Самостоятельно размещать ассеты tldraw (`assetUrls`)?

## 7. Согласование с соседними картами

Прочитано в 21:37: `shell.md`, `tasks.md`, `risk.md`, `canvas.md`. Решить при сведении плана.

- **Токены плотности названы по-разному.**
  - `shell.md` §3.5 использует `--ppm-font-size-body` (14/13), `--ppm-row-pad-y` (8/6) и топбар «44 в обеих».
  - У меня `--ppm-font-size-content` (14/13), плюс `--ppm-font-size-mono` (12/11) и `--ppm-topbar-height` 48/44.
    Значение 48/44 взято из H-Tasks-Dark и H-Tasks-Compact от 21:30, топбар там 48 и 44.
  - Предлагаю одно имя `--ppm-font-size-content`. `--ppm-row-pad-y` добавить в мой блок: 0.5rem, в компактном
    0.375rem.
- **Ключ localStorage.** В `risk.md` стоит `ppm-density` (через дефис), у меня `ppm_density` (как ключ в
  профиле и как `app_sidebar_collapsed` в Plane). Нужно выбрать одно имя. Для ключа в профиле подчёркивание
  обязательно.
- **Флаг версии дизайна `data-ppm-design="v1|v2"`** из `risk.md` §1-2, §409-410. Если его примут:
  - блоки плотности и `--ppm-font-mono: "IBM Plex Mono"` перенести под `:where(html)[data-ppm-design="v2"]…`;
  - скрипт плотности в `<head>`, `PpmDensitySync` и переключатель тоже ставить за этот флаг;
  - импорт `wdth.css` безопасен и без гейта: он только регистрирует `@font-face` под тем же именем семейства;
  - `defaultTheme="system"` — это JS, CSS-гейт на него не действует. Его либо оставить безусловным (это upstream
    и поведение после выхода из аккаунта), либо вычислять по флагу при сборке.
- **`tasks.md`** согласован. Там `min-h-[var(--ppm-row-height,2.75rem)]` с fallback, равным upstream, и
  предупреждение, что `IssueBlock` общий для всех list-корней: плотность увидят все списки задач.
- **`shell.md`** согласован. Там тоже отказ от глобального `--text-13` и `data-ppm-density` на `<html>`, а
  переключатель рядом с `ThemeSwitcher` в `default-list.tsx`.
