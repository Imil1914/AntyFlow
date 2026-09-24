# UX0.2 — раздел D (словарь и остатки Plane): карта кода

Состояние: рабочее дерево `plane-fork` на 2026-09-24 (HEAD `53988697a8`, v1.4.2-4). Всё ниже — по текущему
рабочему дереву, а не по HEAD. Номера строк в карточке UX0.2 частично устарели — в таблицах даны актуальные.

Вспомогательные артефакты (только scratch, в репозиторий не писались):
- `scratchpad/ux02/map/scripts/scan-ru.mjs` — счётчик терминов в ru-локали;
- `scratchpad/ux02/map/scripts/gen-overlay-proto2.mjs` — **прототип** генератора RU-оверлея (склонения + согласование);
- `scratchpad/ux02/map/proto/ru-overlay.candidate.v2.json` — черновик оверлея (545 ключей, требует вычитки);
- `scratchpad/ux02/map/proto/ru-overlay.flagged.v2.json` — 115 строк на ручную правку;
- `scratchpad/ux02/map/proto/manual-keys.txt` — ключи по категориям (модуль/представление/страница/intake/Plane/англ.);
- `scratchpad/ux02/map/proto/hardcoded-pages.txt`, `hardcoded-editor.txt` — захардкоженный английский в Документах/редакторе.

---

## 1. Архитектура i18n сейчас

### 1.1 Plane `@plane/i18n` (packages/i18n)
- `src/core/instance.ts:16` — `i18nInstance = i18n.createInstance()`; `:18-21` — плагины `ICU`, `initReactI18next`,
  `resourcesToBackend((lng, ns) => import(\`../locales/${lng}/${ns}.json\`))` — ленивая загрузка JSON по неймспейсам.
- `:23-24` — стартовый язык из `localStorage["userLanguage"]`, иначе `en`.
- `:26-52` — `init({ lng, fallbackLng: "en", ns: NAMESPACES, defaultNS: "common", fallbackNS: все остальные,
  partialBundledLanguages: true, keySeparator: ".", nsSeparator: false, returnObjects: false, react.useSuspense:false })`
  и затем `loadNamespaces(NAMESPACES)`. Экспорт `initPromise`.
- `src/constants/namespaces.ts:7-36` — 28 неймспейсов (добавление неймспейса = правка массива + файл в 19 локалях).
- `src/hooks/use-translation.ts:39-68` — обёртка над `react-i18next`: `t(key, params)` → `coerceToString`
  (объект → ключ + warn). Возвращает `{ t, currentLocale: i18n.language, changeLanguage, languages }`.
- `src/core/set-language.ts:11-18` — `await initPromise; await changeLanguage(lng); localStorage + <html lang>`.
- `src/provider/index.tsx:15-29` — `TranslationProvider` ждёт `initPromise`.
- `src/index.ts:8-24` — публично экспортируются только `TranslationProvider`, `useTranslation`, `setLanguage`, типы
  и константы. **`i18nInstance` наружу не экспортируется** (package `exports` = только `"."` → `dist/index.js`,
  tsdown `exports: true` генерирует exports сам).
- Сборка: `tsdown` (`packages/i18n/tsdown.config.ts`), web потребляет `dist/` → после правки кода i18n нужен
  `pnpm --filter @plane/i18n build` (turbo `build.dependsOn ^build`).
- ICU: `i18next-icu@2.4.3` мемоизирует скомпилированные сообщения по ключу `${lng}.${ns}.${key}`
  (`node_modules/.pnpm/i18next-icu@2.4.3…/dist/es/index.js:75`), `bindI18n/bindI18nStore` по умолчанию `''` —
  кеш сам не сбрасывается; очистка — `i18nInstance.ICU.clearCache()` (там же `:105-108`, `i18next.ICU = this` `:51`).
- i18next 25.10.9: `BackendConnector.queueLoad` пропускает загрузку, если `store.hasResourceBundle(lng, ns)`
  (`dist/esm/i18next.js:1453`). ⇒ **нельзя класть оверлей в стор ДО загрузки базового бандла** — иначе базовый ru
  не загрузится вовсе. `loaded()` (`:1489`) сначала `addResourceBundle` (эмитит store `"added"`), потом колбэки
  очереди (→ `languageChanged`), потом `emit('loaded')` (`:1518`).
- Скрипты: `sync:check` / `check:sync` (`scripts/sync-check.ts`) сравнивают наличие ключей en↔локали; оверлей вне
  `src/locales` на них не влияет. В ru **0 отсутствующих ключей** относительно en (проверено) — английский в
  интерфейсе идёт из захардкоженных строк в компонентах и из 54 ru-значений, совпадающих с en.

### 1.2 Как PPM переопределяет строки сейчас
- `packages/ppm-brand/src/index.ts:24-1499` — `PPM_TRANSLATIONS = { en: {...}(:25-757), ru: {...}(:758-1499) } as const`.
  Отдельный словарь, **в стор i18next не попадает**. `getPpmTranslation(lang, key)` (`:1579`), `resolvePpmLocale`
  (`:1575`, всё не-ru → en). Тип `TPpmTranslationKey = keyof PPM_TRANSLATIONS["en"]` (`:1502`) — новый ключ
  обязан быть и в `en`, и в `ru` (иначе ошибка типов при индексации ru).
- `apps/web/core/hooks/use-ppm-translation.ts:12-16` — `usePpmTranslation()` → `ppmT(key)` по `currentLocale`.
- Паттерн на местах (I0.3/UX0.1): `isPpmShell ? ppmT("…") : "<upstream literal>"`, например
  `issues/header.tsx:82`, `create-issue-toast-action-items.tsx:89`, `workspace/sidebar/help-section/root.tsx:33-112`.
- `apps/web/core/components/ppm-shell/locale-bootstrap.tsx:13` — `IS_PPM_SHELL_ENABLED = isPpmShellEnabled(
  process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED)`; `:29-44` `PpmLocaleBootstrap` лишь выбирает
  стартовый язык (`resolvePpmInitialLanguage` → `ru`, если в localStorage пусто) и вызывает `setLanguage`;
  до готовности рендерит `PpmLocaleFallback` (`:15-27`). **Стор Plane i18n не патчит.**
  Смонтирован в `apps/web/app/root.tsx:172-182` СНАРУЖИ `AppProvider` (в нём `TranslationProvider`,
  `app/provider.tsx:45`), т. е. дерево приложения рендерится только после `setIsReady(true)`.
- Флаги: `apps/web/vite.config.ts:16-19` — `PPM_BRAND_ENABLED`, `PPM_SHELL_ENABLED` (по умолчанию `"1"`) попадают в
  `process.env` через `define` (`:22-24`). `isPpmShellEnabled` = brand && shell (`ppm-brand/src/index.ts:1551-1553`).
- **Прямые правки upstream ru-локали уже есть в рабочем дереве (не в HEAD; HEAD = upstream, последний коммит в
  `locales/ru` — upstream `65d6a94b0a`)**: `ru/common.json:60` (`preferences` → «Предпочтения»),
  `ru/empty-state.json:171-178`, `ru/navigation.json:10` (`sidebar.stickies` → «Мои заметки»),
  `ru/page.json:47-73`, `ru/stickies.json:1-58` (стикер → заметка), `ru/workspace-settings.json:471`.
  Эти правки **не гейтятся** `PPM_SHELL_ENABLED` (нарушают инвариант карточки «при 0 — upstream»).
- Правила репо по переводу: `plane-fork/.claude/skills/translate/SKILL.md` — канон ru-глоссария Plane
  (Цикл/Модуль/Страница; бренд-марки Plane/Sticky/Intake латиницей; CLDR `one/few/many/other`; `few` = род. ед.;
  «Вы» с заглавной в диалогах; кавычки «…»; «не трогать плейсхолдеры `{var}`»). PPM-глоссарий сознательно
  расходится с ним ⇒ его нельзя вносить в upstream-локали — только оверлеем, иначе конфликт при каждом синке Plane.

---

## 2. Инвентаризация ru-локали (packages/i18n/src/locales/ru, 28 файлов, 6581 строк)

Совпадает с карточкой: **444 вхождения** «рабоч* элемент*» (в 426 строках), **146** «цикл*» (134 строки),
**80** «модул*» (74 строки), **40** «представлени*» (36 строк; 1 — общее значение).

| Термин | Строк по файлам |
|---|---|
| рабочий элемент | work-item 82, work-item-type 49, empty-state 49, common 46, workspace 39, project-settings 35, project 31, inbox 19, settings 16, power-k 15, template 11, cycle 9, workflow 6, integration 6, notification 4, workspace-settings 4, home 3, navigation 2 |
| цикл | project 35, project-settings 30, common 17, power-k 11, empty-state 9, tour 8, workspace 8, cycle 7, work-item 6, work-item-type 2, navigation 1 |
| модуль | project 24, power-k 10, tour 9, empty-state 8, workspace 6, common 4, project-settings 4, module 3, work-item 3, navigation/template/work-item-type 1 |
| представление | project 11, empty-state 7, common 6, power-k 4, project-settings 4, workspace 3, navigation 1 |
| страниц* (Pages) | 144 строки, из них ~60 — фича «Страницы» на основном пути, остальное wiki/tour/generic |
| Plane | 101 строка (41 — integration.json) |
| intake («Предложения»/«Приём»/«Входящие») | 29 строк (см. §8) |

Формы в исходнике (частоты): «рабочих элементов» 117+2, «рабочие элементы» 119+2, «рабочий элемент» 101+3+1,
«рабочего элемента» 68+1, «рабочим элементам» 9, «рабочими элементами» 8, «рабочих элементах» 4,
«рабочем элементе» 3, «рабочему элементу» 3, «рабочим элементом» 2, `few`-форма «рабочих элемента» 1.
Цикл: цикл 42, циклов 36, цикла 29, циклы 18, циклами 6, цикле 6, циклах 5, циклам 2, циклом 1, «циклическая» 1
(`work-item-type.json: …formula.circular_reference` — **исключить**).
Модуль: модуль 27, модули 26, модуля 14, модулей 5, модулями 4, модуле 2, модулем 1, модулям 1.
Представление: представления 21, представление 13, представлений 5, представлениям 1;
`empty-state.json: workspace_empty_state.dashboard.description` («представления аналитики») — **исключить**.
Подэлемент (sub-work-item): 13 строк (`common.sub_work_item(s)`, `work-item.json` sub_issue*, `template.json`).

Английские значения в ru (не бренд/не аббревиатура), видимые в оболочке:
`common.json`: `common.work_structure` «Work structure», `common.execution` «Execution» (группы настроек проекта,
`packages/constants/src/settings/project.ts:28-29`), `common.administration`, `common.developer`,
`common.your_profile` (настройки пространства/профиля), `common.completed_on` «Completed on», `forum` «Forum»;
`automation.json` `am/pm`; `workspace-settings.json` `plane-intelligence.*` «Plane AI», `runners.title`.
Полный список — `proto/manual-keys.txt` раздел `english_only` (57, большинство — Email/URL/CSV и плейсхолдеры).

Строки с «Plane» на основном пути (заменить на PPM или перефразировать): `home.json` `home.empty.create_project.description`,
`home.empty.personalize_account.title`, `home.new_at_plane.title`; `workspace.json` `workspace_creation.subheading`
(онбординг!), `workspace_dashboard.empty_state.*`, `workspace_projects.empty_state.*.comic.title`,
`workspace_pages.empty_state.general.*`; `project.json` `project_page.empty_state.general.title/description`
(пустое состояние Документов, упоминает «Galileo, ИИ-помощник Plane» — в PPM 1.0 без ИИ убрать),
`project_issues.empty_state.no_issues.primary_button.comic.title`; `project-settings.json` `automations.*.description`,
`features.intake.email.description`; `empty-state.json` `common_empty_state.not_found.description`,
`workspace_empty_state.wiki.description`; `power-k.json:143` `help_actions.open_plane_documentation`;
`auth.json` `auth.common.new_to_plane`. Не трогать: `integration.json`, `auth.json: sso.*`,
`workspace-settings.json: settings.applications.*`, placeholders `template.json: publish.*` (бренд/домены).

---

## 3. RU-оверлей: рекомендуемая механика

### 3.1 Вывод
Существующий механизм (правка `ru/*.json`) **не** удовлетворяет инварианту «оверлей только при
`PPM_SHELL_ENABLED`», даёт сотни конфликтов при синке Plane и противоречит канону `translate/SKILL.md`.
Оверлей **возможен без правки upstream-локалей**: нужен один маленький generic-API в коде `@plane/i18n`
(не в `locales/`) — стоп-правило карточки «если оверлей невозможен без правки upstream-локалей» не срабатывает.
Рекомендую: статический, вычитанный JSON-оверлей в `@ppm/brand` + применение в рантайме через `addResourceBundle`
в `PpmLocaleBootstrap`, только при `IS_PPM_SHELL_ENABLED`.

### 3.2 Файлы и правки
1. **`packages/i18n/src/core/overlay.ts` (новый, ~35 строк, без PPM-строк):**
   ```ts
   import { i18nInstance } from "./instance";
   export type TTranslationOverlay = Record<string /*lng*/, Record<string /*ns*/, Record<string, unknown>>>;
   let registered: TTranslationOverlay = {};
   let listening = false;
   let applying = false;
   const apply = (lng: string, ns: string) => {
     const bundle = registered[lng]?.[ns];
     if (!bundle || applying) return;
     applying = true;                       // addResourceBundle эмитит "added" синхронно → защита от рекурсии
     try { i18nInstance.addResourceBundle(lng, ns, bundle, true, true); } finally { applying = false; }
   };
   export function applyTranslationOverlay(overlay: TTranslationOverlay): void {
     registered = overlay;
     for (const lng of Object.keys(overlay))
       for (const ns of Object.keys(overlay[lng]))
         if (i18nInstance.hasResourceBundle(lng, ns)) apply(lng, ns);   // уже загруженные
     if (!listening) { i18nInstance.store.on("added", apply); listening = true; } // будущие загрузки/смена языка
     (i18nInstance as unknown as { ICU?: { clearCache?: () => void } }).ICU?.clearCache?.();
   }
   ```
   Важно: применять только к уже загруженному бандлу или в событии `"added"` (после базового бандла) — см. §1.1
   про `queueLoad`. `"added"` срабатывает внутри `BackendConnector.loaded()` ДО `languageChanged`, поэтому
   компоненты перерисуются уже с оверлеем.
2. **`packages/i18n/src/index.ts:21`** (блок Utilities) — добавить
   `export { applyTranslationOverlay } from "./core/overlay";` и тип `TTranslationOverlay`.
3. **Данные оверлея в `@ppm/brand`:**
   - `packages/ppm-brand/src/locales/i18n-overlay.json` — `{ "ru": { "<ns>": { …вложенные ключи… } }, "en": { … } }`;
     `ru` — глоссарий + ручные правки; `en` — только НОВЫЕ ключи PPM в upstream-неймспейсах (например, заголовки новых
     команд Power-K), чтобы `t()` не показывал ключ при английском интерфейсе (fallbackLng=`en`).
   - `packages/ppm-brand/src/glossary.ts` — единый глоссарий (§4) + `PPM_COMMAND_KEYWORDS` (§5); экспорт из
     `src/index.ts`.
   - Экспорт подпути: **и** `packages/ppm-brand/package.json` `exports` (`"./i18n-overlay.json":
     "./src/locales/i18n-overlay.json"`), **и** `packages/ppm-brand/tsdown.config.ts:9-14` `customExports` —
     иначе `tsdown` при сборке перезапишет `package.json` и потеряет подпуть (так же сделан `./tokens.css`).
   - `scripts/draft-ru-overlay.mjs` (dev-инструмент, не часть сборки) — перенести прототип
     `scratchpad/ux02/map/scripts/gen-overlay-proto2.mjs`: читает upstream `ru/*.json`, применяет таблицы §4,
     выдаёт черновик + список строк на ручную правку. Результат **вычитывается человеком и коммитится**.
   - Перенести в оверлей 6 уже сделанных правок `ru/*.json` (стикеры→заметки, «Предпочтения») и вернуть эти файлы
     к upstream-содержимому (см. открытый вопрос №1).
4. **`apps/web/core/components/ppm-shell/locale-bootstrap.tsx:32-39`:**
   ```tsx
   useEffect(() => {
     if (!IS_PPM_SHELL_ENABLED) return;
     const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
     const initialLanguage = resolvePpmInitialLanguage(storedLanguage, true) as TLanguage;
     void import("@ppm/brand/i18n-overlay.json")
       .then((module) => applyTranslationOverlay(module.default))
       .catch((error) => console.error("PPM: словарь интерфейса не загружен", error)) // мягкая деградация
       .then(() => setLanguage(initialLanguage))
       .finally(() => setIsReady(true));
   }, []);
   ```
   Динамический импорт = отдельный чанк, при `PPM_SHELL_ENABLED=0` не грузится. Регистрировать оверлей ДО
   `setLanguage`. `tsconfig` web: `resolveJsonModule: true` (`packages/typescript-config/react-router.json`).
5. Размер: ~545 ключей механически (прототип) + ~130 ручных (модуль/представление/Документы/intake/подэлемент)
   + ~30 «Plane→PPM» + ~15 английских значений ≈ 700 ключей (~80–100 КБ JSON, отдельный чанк).

### 3.3 Тесты оверлея (новые)
`packages/ppm-brand/src/__tests__/i18n-overlay.test.ts` (vitest, fs-чтение `../../i18n/src/locales/{en,ru}`):
- каждый ключ оверлея существует в upstream ru (нет «протухших»), тип листа = string;
- инвентарь плейсхолдеров совпадает: множество `{name}`/`{count, plural|select`, баланс `{}`, набор
  ICU-ключевых слов (`one/few/many/other`) — `intl-messageformat` в `@ppm/brand` не зависимость, поэтому
  структурная проверка регэкспами;
- «эффективная» ru (upstream ⊕ overlay) не содержит: `/рабоч\p{L}*\s+элемент/iu`,
  `/(?<!\p{L})цикл/iu` (allowlist: `circular_reference`), `/(?<!\p{L})модул/iu`, `/представлени/iu`
  (allowlist: `dashboard.description`), «Предложения|Приём» в intake-ключах, `/(?<![\p{L}.])Plane(?![\p{L}.])/u`
  вне allowlist (integration/sso/applications/publish placeholders);
- JS `\b` не работает с кириллицей — во всех регэкспах использовать `(?<!\p{L})…(?!\p{L})` с флагом `u`.
Юнит на `applyTranslationOverlay` — внутри `packages/i18n` тестовой инфраструктуры нет; вариант: тест в
`apps/web/tests/i18n/overlay.test.ts` поверх собранного `@plane/i18n` (как уже делают тесты, импортирующие
`@ppm/brand` из `dist`), проверки: базовый ru загружается, оверлей перекрывает, ключи без оверлея не тронуты,
повторная смена языка en→ru сохраняет оверлей.

### 3.4 Что может сломаться / как проверить
- Оверлей положен раньше базового бандла → ru не загрузится (пустые ключи). Проверка: тест выше +
  ручной вход с пустым localStorage и с `userLanguage=en` → переключение на ru в профиле.
- Кеш ICU: строка, отформатированная до оверлея, останется старой → `clearCache()`; дерево не рендерится до
  `isReady`, так что риск только при смене языка — проверить смену en→ru→en→ru.
- Сломанный ICU в оверлее → i18next-icu по умолчанию возвращает сырую строку (не крэш), но текст «{count, plural…»
  на экране. Проверка: структурный тест.
- `label`-плюралы (`issue.label`, `cycle.label`, `module.label`, `view.label`) используются как слово-заголовок
  (например, `<title>` задач: `t("issue.label", { count: 2 })`, `issues/(list)/page.tsx:26`) — **не добавлять**
  `few/many` (иначе при count=5 будет «Задач» как заголовок); только заменить слова внутри `one/other`.
- Ключ, одинаковый в нескольких неймспейсах: оверлей кладётся в конкретный ns — поведение `fallbackNS` не меняется.
- `PPM_SHELL_ENABLED=0` → код не выполняется, стор = upstream.
- e2e/юниты: строки оверлея в тестах не используются (проверено grep по `apps/web/e2e`, `apps/web/tests`);
  `e2e/ppm-demo.spec.ts:268,274` проверяют отсутствие «Plane» — оверлей помогает.

---

## 4. Глоссарий и таблицы склонений

Правило регистра: сохранять заглавную первую букву исходной фразы. Все регэкспы — `(?<!\p{L})…(?!\p{L})`, `giu`.

### 4.1 «рабочий элемент» (м.) → «задача» (ж.)
| Исходная форма | Падеж/число | Замена |
|---|---|---|
| рабочий элемент | им. ед. | задача |
| рабочий элемент | вин. ед. (после «Создать/Добавить/Удалить/Выберите/Открыть/Редактировать/Изменить/Отклонить/Копировать ссылку на/на/в/за/через») | задачу |
| рабочего элемента | род. ед. | задачи |
| рабочему элементу | дат. ед. | задаче |
| рабочим элементом | тв. ед. | задачей |
| рабочем элементе | пр. ед. | задаче |
| рабочие элементы | им./вин. мн. | задачи |
| рабочих элементов | род. мн. | задач |
| рабочим элементам | дат. мн. | задачам |
| рабочими элементами | тв. мн. | задачами |
| рабочих элементах | пр. мн. | задачах |
| рабочих элемента (ICU `few`) | род. ед. после 2–4 | задачи |
| рабочие задачи / рабочих задач / рабочую задачу (tour) | — | задачи / задач / задачу |
ICU-шаблон: `one {# задача} few {# задачи} many {# задач} other {# задачи}`.

Согласование (только слово прямо перед фразой; после «Тип …» НЕ трогать — «Тип рабочего элемента» → «Тип задачи»):
- им.: новый→новая, родительский→родительская, дочерний→дочерняя, этот→эта, данный→данная, выбранный→выбранная,
  дублирующийся→дублирующаяся, первый→первая, входящий→входящая, повторяющийся→повторяющаяся,
  существующий→существующая, свой→своя, каждый→каждая, связанный→связанная, один→одна;
- вин.: …→новую, родительскую, дочернюю, эту, выбранную, первую, входящую, повторяющуюся, существующую, свою,
  каждую, одну («хотя бы один рабочий элемент» → «хотя бы одну задачу»);
- род.: этого→этой, нового→новой, родительского→родительской, выбранного→выбранной, первого→первой,
  вашего первого→вашей первой, каждого→каждой, дочернего→дочерней, своего→своей;
- дат.: этому→этой, любому→любой (только если определяет саму фразу), каждому→каждой;
- пр.: связанном→связанной, этом→этой; тв.: этим→этой;
- краткие причастия/сказуемое при им. ед.: создан→создана, обновлен/обновлён→обновлена, удален/удалён→удалена,
  выполнен→выполнена, скопирован→скопирована, перемещён→перемещена, добавлен→добавлена, архивирован→архивирована,
  восстановлен→восстановлена, назначен→назначена, найден→найдена («Найден дублирующийся…» → «Найдена дублирующаяся
  задача»), был→была; во мн. ч. согласование не меняется.
- «подэлемент» → «подзадача» по той же таблице (подэлемента→подзадачи, подэлементы→подзадачи,
  подэлементов/под-элементов→подзадач; «Подэлемент успешно обновлен» → «Подзадача успешно обновлена»).

Прототип (`gen-overlay-proto2.mjs`) по этим правилам меняет 545 строк; остаются 6 строк с неоднозначным падежом
(`workspace_empty_state.your_work_by_priority/_by_state.title` «Пока не назначен рабочий элемент» →
«Пока не назначено ни одной задачи»; `settings_empty_state.workflows.states.description`; `issue.add.press_enter`
→ «Нажмите Enter, чтобы добавить ещё одну задачу»; `issue.empty_state.issue_detail.description` «Данный рабочий
элемент был удален…» → «Эта задача удалена, архивирована или не существует.»; `issue.select.error` → «Выберите
хотя бы одну задачу») и ICU-select внутри строк (`work-item.json: issue.add.cycle.success`
`{count, plural, one {добавлен} …}` → `one {добавлена} other {добавлены}`).

### 4.2 «цикл» (м.) → «спринт» (м.) — механически, окончания совпадают
цикл→спринт, цикла→спринта, циклу→спринту, циклом→спринтом, цикле→спринте, циклы→спринты, циклов→спринтов,
циклам→спринтам, циклами→спринтами, циклах→спринтах; «активный цикл»→«активный спринт» (согласование не
меняется). Исключение: «циклическая ссылка» (`circular_reference`). ICU: `one {# спринт} few {# спринта}
many {# спринтов} other {# спринта}`.

### 4.3 «модуль» (м.) → «направление» (ср.) — 74 строки, **вручную** (согласование м.→ср.)
Формы: модуль→направление, модуля→направления, модулю→направлению, модулем→направлением, модуле→направлении,
модули→направления, модулей→направлений, модулям→направлениям, модулями→направлениями, модулях→направлениях.
Согласование: новый→новое, первый→первое, этот→это, свой первый→своё первое, «Модуль успешно удалён»→
«Направление удалено», «Этот модуль ещё не активен»→«Это направление ещё не активно», «Установите свой первый модуль»→
«Создайте первое направление». Пример-комикс «модуль корзины, модуль шасси или модуль склада» → «направления
«Корзина», «Шасси» или «Склад»». ICU: `one {# направление} few {# направления} many {# направлений} other {# направления}`.

### 4.4 «представление» (ср.) → «фильтр задач» (м.) — 35 строк, **вручную**
Склоняется только «фильтр»: фильтр задач / фильтра задач / фильтру задач / фильтр задач / фильтром задач /
фильтре задач; мн.: фильтры задач / фильтров задач / фильтрам задач / фильтрами задач / фильтрах задач.
Им.=вин. в обоих словах ⇒ падежной неоднозначности нет. Согласование ср.→м.: новое→новый, это→этот,
первое→первый, «Вы уверены, что хотите удалить это представление?» → «…этот фильтр задач?»; «Представления
отключены» → «Фильтры задач отключены»; сказуемые -о → -∅ (создано→создан, удалено→удалён).

### 4.5 Фича «Страницы» (ж.) → «документ» (м.) — ~60 строк основного пути, **вручную**
Карточка D.3 требует «Документы полностью на русском» и совпадения меню («Документы») с заголовками.
страница→документ, страницы (род. ед.)→документа, страницы (им./вин. мн.)→документы (омоформа — только вручную),
странице→документу (дат.) / документе (пр.), страницу→документ, страницей→документом, страниц→документов,
страницам→документам, страницами→документами, страницах→документах. Согласование ж.→м.: новая→новый,
первую→первый, «Страница удалена»→«Документ удалён». Не трогать generic: `you_do_not_have_the_permission_to_access_this_page`,
`cloud_maintenance_message.*`, `power_k.miscellaneous_actions.copy_current_page_url*`,
`project_settings.general.archive_project.description` («на странице проектов»).

### 4.6 Intake → «Заявки» (ж.), см. §8
заявка / заявки / заявке / заявку / заявкой / заявке; мн. заявки / заявок / заявкам / заявки / заявками / заявках.
Согласование как у «задача» (оба ж. р.). В `inbox.json` (это intake!) «рабочий элемент» → «заявка», кроме
`inbox_issue.actions.move` «Перенести {value} в рабочие элементы проекта» → «Перенести {value} в задачи проекта».

### 4.7 Прочее (предлагаю, согласовать)
- «рабочее пространство» (106 вхождений) → «пространство» — PPM уже говорит «Пространство» (`global.workspace`).
- «Состояния» (85) vs «Статусы» (24) — PPM (холст, e2e `getByLabel("Статус")`) использует «Статус».
- «Мои заметки» (stickies) конфликтует с нодой «Заметка» на Холсте (A-shell.md). Вариант: «Личные заметки».
- Собственные строки PPM вне глоссария: `ppm-brand/src/index.ts:818` «Мозг проекта», `:929` «Индекс Мозга проекта»,
  `:991` `knowledge.title` «Знания» (нав: «Хранилище»), `:1008` «Материалы», `:1042` «Добавить на холст «Мозг
  проекта»», `:1290` «Материал Vault», `:1345-1346` «панель AntyFlow»; `apps/web/app/(home)/about/ppm-guide/page.tsx:29`
  «рабочие элементы проекта» → «В разделе «Задачи» — все задачи проекта, фильтры задач и спринты.»

---

## 5. Поиск команд (Power-K)

### 5.1 Сопоставление клавиш
`apps/web/core/components/power-k/core/shortcut-handler.ts`:
- `:14-25` `formatModifierShortcut`: `:21 const key = e.key.toLowerCase(); :22 parts.push(key === " " ? "space" : key);`
- `:71-97` `handleKeyDown`: `:74 const key = e.key.toLowerCase();` `:78 if ((e.metaKey || e.ctrlKey) && key === "k")`.
- Регистрация: `core/registry.ts:89-132` — карты по `shortcut`/`keySequence`/`modifierShortcut` (lower-case),
  `findBy*` через `computedFn`. Обработчик вешается на `document` в `global-shortcuts.tsx:57-80`.
- Ещё два места с `e.key` для ⌘K: `ui/modal/wrapper.tsx:72` и `navigation/top-nav-power-k.tsx:146`
  (`e.key.toLowerCase() === "k"`) — в ЙЦУКЕН `e.key === "л"`, ⌘K/Ctrl+K не закроет/не откроет палитру.
- Зарегистрированные сочетания (все латиница): single `s p a i l m` (контекст задачи/направления);
  sequences `gh gx gy op gp ga gj gr os gs gi oc gc om gm ov gv gd gk ow ni nd nv nc nm np`;
  modifier `cmd+/ cmd+b cmd+shift+c cmd+f shift+f cmd+shift+, shift+a shift+r shift+l shift+e shift+c shift+m
  shift+s cmd+backspace cmd+. cmd+shift+'` (файлы: `config/*.ts`, `ui/pages/context-based/*/commands.ts`).

Предлагаемый diff (новая чистая функция, экспорт для теста):
```ts
const CODE_TO_KEY: Record<string, string> = { Comma: ",", Period: ".", Slash: "/", Quote: "'", Semicolon: ";",
  BracketLeft: "[", BracketRight: "]", Backslash: "\\", Minus: "-", Equal: "=", Backquote: "`", Space: "space" };
export function getShortcutKey(e: Pick<KeyboardEvent, "code" | "key">): string {
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  if (/^Digit[0-9]$/.test(e.code)) return e.code.slice(5);
  if (e.code in CODE_TO_KEY) return CODE_TO_KEY[e.code];
  const key = e.key.toLowerCase();              // Backspace/Delete/Enter/Escape/стрелки — не зависят от раскладки
  return key === " " ? "space" : key;            // e.code пуст (виртуальная клавиатура) → прежнее поведение
}
```
`:21-22` → `parts.push(getShortcutKey(e));`; `:74` → `const key = getShortcutKey(e);`;
`wrapper.tsx:72`, `top-nav-power-k.tsx:146` → `e.code === "KeyK"`.
Изменение поведения (проверить): `cmd+shift+,` и `cmd+shift+'` раньше **никогда не срабатывали** на US-раскладке
(e.key давал `<`/`"`), теперь сработают (`copy_work_item_url` и т. п.); на AZERTY/Dvorak сочетания станут
физическими (по правилу проекта «только e.code»). Escape/Backspace/стрелки/Enter в палитре оставить на `e.key`.
Тестов Power-K нет. Новый `apps/web/tests/power-k/shortcut-handler.test.ts` (env `node`; jsdom/happy-dom не
установлены): `getShortcutKey({code:"KeyG",key:"п"}) === "g"`, `{code:"Comma",key:"<"}` → `","`; сценарий
`ShortcutHandler` с `PowerKCommandRegistry` + фейковый ctx, события `{key:"п",code:"KeyG",…}` затем
`{key:"ш",code:"KeyI"}` → выполняется `gi`; нужно `vi.stubGlobal("window", { setTimeout, clearTimeout })`
(`scheduleSequenceReset` `:146-154` использует `window`), `target: null` (иначе `instanceof HTMLInputElement` в
node упадёт, `:33`).

### 5.2 Навигационные команды PPM и синонимы
- Команды навигации: `config/navigation/commands.ts` (модифицирован: админ-гейты `:80-85`, `canAccessWorkspaceAdministration`),
  union ключей `:23-50`, запись `:57-549`; порядок — `config/navigation/root.ts:16-50`.
  Есть `nav_project_work_items (gi)`, `nav_project_cycles (gc)`, `nav_project_modules (gm)`, `nav_project_views (gv)`,
  `nav_project_pages (gd)`, `nav_project_intake (gk)`, `nav_project_archives (gr)`, `nav_project_settings (gs)`.
  **Нет**: Обзор, Холст, Хранилище, Код.
- Добавить (видимы только при `isPpmShell`, проектный контекст `baseProjectConditions`):
  `nav_project_overview` (`go`, i18n_title **уже есть**: `power_k.navigation_actions.nav_project_overview`,
  ru `power-k.json:108` «Перейти к обзору проекта»), `nav_project_canvas` (`gb`, route `brain`, дополнительно
  `isPpmCanvasEnabled(process.env.PPM_CANVAS_ENABLED, isPpmShell)` из `@ppm/canvas`), `nav_project_knowledge`
  (`gf`, route `knowledge`), `nav_project_code` (`gg`, route `code`). Последовательности свободны (проверено).
  Новые i18n-ключи `power_k.navigation_actions.nav_project_canvas|nav_project_knowledge|nav_project_code` —
  в оверлей `ru` («Открыть холст проекта», «Перейти в хранилище», «Перейти к коду») и `en`
  («Open project canvas», «Go to vault», «Go to code»). Пути — `getPpmProjectPath` или
  `handlePowerKNavigate(ctx, [ws, "projects", pid, "brain"])`.
- Синонимы: поле `keywords?: string[]` уже есть в типе (`core/types.ts:87`), но нигде не используется.
  cmdk 1.1.1 поддерживает `Command.Item keywords` и `filter(value, search, keywords)`.
  Правки: `ui/renderer/command.tsx:60-68` — передать `keywords={command.keywords}`;
  `ui/modal/command-item.tsx:16-32` — проп `keywords` → `<Command.Item keywords={keywords} …>`;
  фильтры `ui/modal/wrapper.tsx:~146-150` и `navigation/top-nav-power-k.tsx:274-278` →
  `(value, search, keywords) => value === "no-results" ? 1 : [value, ...(keywords ?? [])].join(" ").toLowerCase().includes(search.toLowerCase()) ? 1 : 0`.
  Синонимы (из `PPM_COMMAND_KEYWORDS` в `@ppm/brand/glossary.ts`, проставлять только при `isPpmShell`):
  work_items [задачи, задача, рабочие элементы, work items, issues, tasks]; cycles [спринт, спринты, цикл, циклы,
  sprints, cycles]; modules [направление, направления, модуль, модули, modules]; views [фильтр задач, фильтры,
  представление, представления, views]; pages [документы, документ, страницы, pages, docs]; intake [заявки, заявка,
  intake, приём]; overview [обзор, overview]; canvas [холст, доска, карта, canvas, board]; knowledge [хранилище,
  материалы, файлы, знания, vault, pdf, markdown]; code [код, git, github, репозиторий, code]; inbox [входящие,
  уведомления, notifications]; create_work_item [задача, новая задача]; create_cycle [спринт]; create_module
  [направление]; create_view [фильтр задач].
- Русские заголовки результатов: `ui/modal/search-results-map.tsx:39,62,73,84,100,106,112` (`title: "Cycles" |
  "Work items" | "Views" | "Modules" | "Pages" | "Projects" | "Workspaces"`) → `i18n_title` с существующими ключами
  `common.cycles`, `common.work_items`, `common.views`, `common.modules`, `common.pages`, `projects`
  (+ `workspaces`), рендер `t()` в `search-results.tsx:41`; с оверлеем станут «Спринты/Задачи/Фильтры задач/
  Направления/Документы». `ui/modal/search-menu.tsx:92-98` «Search results for "…" in workspace/project:» →
  PPM-ключ (`isPpmShell ? … : upstream`), ru «Результаты по запросу «…» в проекте/пространстве:».
  `ui/modal/command-item-shortcut-badge.tsx:95,110` «then» → «затем» (PPM-ключ; `KeySequenceBadge` — компонент,
  хук допустим). `ui/modal/shortcuts-root.tsx:67` «Keyboard shortcuts» → `t("keyboard_shortcuts")` (ru «Горячие
  клавиши»), `:81` «Search for shortcuts» → PPM-ключ; `ui/modal/context-indicator.tsx:43-44` «Clear context
  (Backspace)»; `ui/pages/work-item-selection-page.tsx:88,126` heading «Issues».
- aria «Suggestions» — это дефолт cmdk `Command.List label="Suggestions"`
  (`node_modules/.pnpm/cmdk@1.1.1…/dist/index.mjs`). Передать `label` в `navigation/top-nav-power-k.tsx:287`
  и `power-k/ui/modal/wrapper.tsx:163` (`label={isPpmShell ? ppmT("navigation.command_results") : undefined}`,
  ru «Результаты поиска команд»). Тест `tests/navigation/navigation-accessibility.test.tsx:40-53` мокает
  `Command.List` с пропсами `children/className/id` — лишний `label` не ломает; можно добавить ассерт.
- Справка: `config/help-commands.ts:33-71` — `open_plane_documentation` (docs.plane.so), `join_forum`
  (forum.plane.so), `report_bug` (github.com/makeplane). При `isPpmShell`: заменить документацию на «Открыть
  руководство PPM» → `/about/ppm-guide` (как `help-section/root.tsx:58`), форум скрыть (`isVisible: () => !isPpmShell`),
  `report_bug` → `${PPM_SOURCE_ATTRIBUTION.repository}/issues/new` (как `help-section/root.tsx:72`), ru-заголовок
  через оверлей «Сообщить о проблеме» (единообразно с меню «Помощь»). Файл добавить в
  `ppm-brand/scripts/audit-user-facing-brand.mjs` scope с allowlist `docs.plane.so`, `forum.plane.so`, `makeplane`.

---

## 6. Остатки Plane на основном пути (file:line → замена)

| Где | Сейчас | Предложение |
|---|---|---|
| API seed: `apps/api/plane/app/views/workspace/base.py:141` `workspace_seed.delay(...)`; задача `apps/api/plane/bgtasks/workspace_seed_task.py:504-545+` читает `apps/api/plane/seeds/data/*.json` | При создании пространства создаётся бот «Plane» (`:523-533`, display_name «Plane», WorkspaceMember role 20), проект с описанием «Welcome to the Plane Demo Project…» (`seeds/data/projects.json`), 7 задач «Welcome to Plane 👋», «5. Use Cycles…» (`issues.json`), 2 документа «Project Design Spec» («Each project in Plane can have its own Wiki space…»), «Project Draft proposal» (`pages.json`), циклы «Cycle 1: Getting Started with Plane», модули, вид «Project Urgent Tasks», английские статусы (`states.json`) | Рекомендую флаг `PPM_WORKSPACE_SEED_ENABLED` в `apps/api/plane/settings/common.py` (рядом с PPM-флагами `:161-205`), по умолчанию `"0"`; ранний `return` в начале `workspace_seed` (так тест `tests/contract/app/test_workspace_app.py:27-59`, который мокает `.delay` и ждёт `assert_called_once`, остаётся зелёным). Альтернатива B: RU-сид (`seeds/data_ru/`) — большая контентная работа. Меняет только НОВЫЕ пространства; существующие данные не мигрировать |
| `apps/api/plane/db/models/state.py:24-61` `DEFAULT_STATES` (Backlog/Todo/In Progress/Done/Cancelled/Triage); применяются в `app/views/project/base.py:243-257` и `api/views/project.py:~269`; «Triage» создаётся в `app/views/intake/base.py:249` и `api/views/intake.py:178` | Английские статусы в каждом новом проекте | Хелпер в `apps/api/plane/ppm_core/` (напр. `default_states.py: get_default_states()`), имена по `settings.PPM_DEFAULT_STATES_LOCALE` (`"ru"` по умолчанию): Бэклог / К выполнению / В работе / Готово / Отменено / Разбор. Код на имена не опирается (поиск по `group`; web не сравнивает имена — проверено). **Ломает** `tests/contract/app/test_project_app.py:92-97` (ожидает английские имена) → в `settings/test.py` задать `PPM_DEFAULT_STATES_LOCALE = "en"` + новый тест с `override_settings`. Существующие проекты не трогать (без миграций) |
| `packages/constants/src/state.ts:22-51` `STATE_GROUPS.*.label` «Backlog/Unstarted/Started/Completed/Canceled»; рендер `profile/overview/state-distribution.tsx:72`, `profile/overview/workload.tsx:42`, `issues/issue-layouts/filters/header/filters/state-group.tsx:55` | Англ. группы («Нагрузка» в A-work.md:186) | `t(\`workspace_projects.state.${group}\`)` (ru: Бэклог/Не начато/В процессе/Завершено/Отменено) под `isPpmShell` |
| `apps/web/core/components/stickies/layout/stickies-list.tsx:24-27,72-73,129` | Иллюстрация `stickies-dark/light.webp` с текстом «Let's start using stickies in Plane!!» | `assetPath={isPpmShell ? undefined : stickiesResolvedPath}` (`DetailedEmptyState` рисует `<img>` только при `assetPath`, `detailed-empty-state-root.tsx:93`); аналогично `stickiesSearchResolvedPath` `:124` |
| `apps/web/app/(all)/[workspaceSlug]/(projects)/stickies/header.tsx:35` `label={\`Stickies\`}`, `:55` «Add sticky» | Англ. крошка и кнопка | `t("stickies.title")` / `t("stickies.add")` (ключи есть; с оверлеем «Мои заметки»/«Добавить заметку») |
| `.../stickies/page.tsx:14` `<PageHead title="Your stickies" />` | Англ. `<title>` | `${workspace} — ${t("stickies.title")}` |
| `apps/web/core/components/stickies/modal/stickies.tsx:39` «Your stickies», `:52` «Add sticky» | Англ. | `t("stickies.title")`, `t("stickies.add")` |
| `apps/web/core/components/stickies/action-bar.tsx:64,103` | «All stickies», «Add sticky» | Компонент `StickyActionBar` нигде не рендерится (grep) — можно не трогать |
| `power-k/config/help-commands.ts:33-58` + `ru/power-k.json:143-144` | «Открыть документацию Plane», «Присоединиться к нашему форуму» | см. §5.2 |
| `apps/web/app/(all)/[workspaceSlug]/(projects)/drafts/page.tsx:14` `pageTitle = "Workspace Draft"` | Англ. `<title>` | `isPpmShell ? \`${workspace} — ${t("drafts")}\` : "Workspace Draft"`; тексты «Недописанные рабочие элементы…» уходят оверлеем (`empty-state.json workspace_empty_state.drafts.*`) |
| `apps/web/core/components/issues/workspace-draft/draft-issue-properties.tsx:187,202,225` | placeholders «Start date», «Due date», «Assignees» | существующие ключи Plane (`start_date`, `due_date`, `assignees` — проверить имена) |
| `apps/web/core/components/settings/project/sidebar/header.tsx:51` `<p>Project settings</p>` | Англ. | `isPpmShell ? ppmT("project.settings") : "Project settings"` (ключ есть: «Настройки проекта») |
| `apps/web/core/components/project/settings/control-section.tsx:63,74` | Англ. описания архивации/удаления | `t("project_settings.general.archive_project.description")`, `t("project_settings.general.delete_project.description")` — ключи **уже есть** в ru (`ru/project-settings.json:8,13`), en-текст совпадает с литералом ⇒ безопасно без гейта |
| `apps/web/core/components/project/form.tsx:327` «Project ID», `:206` alt «Project cover image» | Англ. | `t("common.project_id")` (ru «ID проекта»); alt — PPM-ключ «Обложка проекта» |
| `ru/common.json` `common.work_structure`, `common.execution` (+ `administration`, `developer`, `your_profile`) | «Work structure», «Execution» в группах настроек проекта | Оверлей: «Структура работы», «Выполнение», «Администрирование», «Для разработчиков», «Профиль» |
| `<title>` настроек: `(settings)/settings/projects/[projectId]/page.tsx:32` «- General Settings», `estimates/page.tsx:28`, `labels/page.tsx:28`, `states/page.tsx:32`, `members/page.tsx:34`, `automations/page.tsx:52`, `features/*/page.tsx:32`; пространства: `members/page.tsx:93`, `billing/page.tsx:26`, `integrations/page.tsx:33`, `webhooks/*` | Англ. суффиксы | `t("general_settings")`, `t("common.estimates")`, `t("common.labels")`, `t("common.states")`, `t("common.members")` и т. п. + разделитель « — » (как PPM-страницы) |
| `apps/web/core/components/sidebar/resizable-sidebar.tsx:195` «Main sidebar», `:238` «Sidebar peek view», `:218,260` «Resize sidebar» | Англ. aria | PPM-ключи `navigation.main_sidebar` «Боковая панель», `navigation.sidebar_peek` «Боковая панель (быстрый просмотр)», `navigation.resize_sidebar` «Изменить ширину боковой панели» (en = прежние литералы); в компоненте нет хуков перевода — добавить `usePpmTranslation` + `isPpmShell ? … : literal`. (Отдельно для E: peek-копия всегда в DOM — `aria-hidden`/`inert`, когда не показана) |
| `cmdk` `Command.List` | aria «Suggestions» | §5.2 |
| `apps/web/core/components/instance/not-ready-view.tsx:42` «Welcome to Plane», `onboarding/tour/root.tsx:102` | Англ./Plane | Тур уже отключён в PPM (`home/root.tsx:48-63`); not-ready — экран до настройки инстанса (вне основного пути) — низкий приоритет |

### 6.1 Документы (`/pages`) — полностью на русском (D.3)
Захардкоженный английский (web, ~60 строк; список — `proto/hardcoded-pages.txt`):
- крошки `.../pages/(list)/header.tsx:70`, `(detail)/header.tsx:74` `label="Pages"` → `isPpmShell ? ppmT("project.collaborative_pages") : "Pages"`;
  `(list)/header.tsx:83` «Adding»/«Add page» → `t("common.adding")` / PPM «Новый документ»;
- `<title>`: `.../pages/(list)/page.tsx:52` `${project?.name} - Pages` → `${name} — Документы`;
- `components/pages/list/tab-navigation.tsx:23,27,31` Public/Private/Archived → `t("common.access.public")`,
  `t("common.access.private")`, PPM «Архив»; `list/order-by.tsx:25-27` Name/Date created/Date modified;
  `list/search-input.tsx:67` «Search pages»; `list/filters/root.tsx:68,89`; `list/block-item-action.tsx:46,51`
  («Owned by», «Public/Private»);
- `dropdowns/actions.tsx:97` Make private/public (ключи `power_k.contextual_actions.page.make_private/_public`),
  `:104` Open in new tab (`common.actions.open_in_new_tab`), `:111` Copy link (`common.actions.copy_link`),
  `:120` Make a copy (`common.actions.make_a_copy`), `:138` Delete, `:145` Move;
- `header/syncing-badge.tsx:39-45` «Syncing…», «Connection lost»; `header/offline-badge.tsx:27-32`;
  `header/lock-control.tsx:81-110` Lock/Locked/Unlocked; `header/copy-link-control.tsx:60,66`;
- `editor/title.tsx:55` placeholder «Untitled»; `editor/toolbar/toolbar.tsx:131` «Text»;
  `editor/toolbar/color-dropdown.tsx:71,94`; `editor/toolbar/options-dropdown.tsx:82-108`;
- модалки `modals/delete-page-modal.tsx:55-82`, `modals/export-page-modal.tsx:50-259`, `modals/page-form.tsx:71,122`,
  `version/main-content.tsx:63-94`; `.../pages/(detail)/[pageId]/page.tsx:164` «Page not found»;
  `components/ui/loader/pages-loader.tsx:13`.
- Пакет редактора `packages/editor/src` — **без i18n** (нет зависимости `@plane/i18n`), ~150 англ. строк
  (`core/constants/common.ts:52-166` блоки/выравнивание/цвета, `core/components/menus/menu-items.ts:73-249`,
  `core/extensions/slash-commands/command-items-list.tsx` (42), таблицы, изображения, ссылки; список —
  `proto/hardcoded-editor.txt`). Плейсхолдер пустого документа настраивается пропом
  (`core/extensions/placeholder.ts:46-51`, дефолт «Press '/' for commands...»). Локализация редактора —
  отдельная подзадача (открытый вопрос №4).
- Стартовый шаблон «Project Design Spec» с «Plane» — это **сид** (`apps/api/plane/seeds/data/pages.json`, id 1),
  а не шаблон редактора; уходит вместе с флагом сида.
- Шрифт редактора: `packages/editor/src/styles/variables.css:116` `--font-style: "Inter Variable"` (и `:119`
  `.sans-serif`), код `editor.css:238` `font-family: JetBrainsMono`. Стили редактора подключаются **без слоя**
  (`apps/web/styles/globals.css:3`), а `ppm-brand/src/tokens.css` целиком в `@layer base` ⇒ правило в tokens.css
  проиграет. Нужен **неслоёный** блок в конце `tokens.css`:
  `html[data-ppm-brand="enabled"] .editor-container, html[data-ppm-brand="enabled"] .editor-container.sans-serif { --font-style: var(--ppm-font-sans); }`
  и `html[data-ppm-brand="enabled"] .ProseMirror pre { font-family: var(--ppm-font-mono); }` (serif/monospace не
  трогать). Гейт — `PPM_BRAND_ENABLED`. Пересекается с зоной A (tokens.css) — координировать.

---

## 7. Обзор проекта (D.5)
`apps/web/core/components/ppm-shell/project-feature-page.tsx`:
- `:95-101` карточка Хранилища `status={ppmT("status.planned")}` без `available`;
  `:102-108` карточка Кода — то же. Хранилище/Код работают (`knowledge/page.tsx` → `PpmVaultRoute`,
  `code/page.tsx` → `PpmGitRoute`, без флагов). Правка: `status={ppmT("status.available")}` + `available` на обеих.
- `:81` описание карточки Задач = `ppmT("overview.next_title")` («Продолжить работу» — дублирует заголовок блока
  `:111`) → новый ключ `overview.tasks_description` «Список, доска и спринты проекта».
- Ветка не-overview (`:125-158`, `FEATURE_CONFIG :25-56`, `*.planned`) сейчас не используется — оверview
  единственный потребитель (`overview/page.tsx:11`); можно оставить.
`packages/ppm-brand/src/index.ts`:
- `:923` ru `overview.next_description` «Задачи и холст проекта уже доступны. Следом появятся знания и код.» →
  «Задачи, холст, хранилище и код проекта уже работают. Начните с задач или откройте холст.»;
  `:188` en → «Tasks, canvas, vault, and code are ready. Start with tasks or open the canvas.»
- `:992` ru `knowledge.description` «Здесь будут файлы…» → «Файлы, Markdown-заметки и PDF проекта с историей версий.»;
  `:256` en → «Project files, Markdown notes, and PDFs with version history.»; `:990`/`:254` eyebrow
  «Слой знаний · I0.7» / «Knowledge layer · I0.7» → «Хранилище проекта» / «Project vault»; `:331` en
  `code.eyebrow` «Git layer · G0.1» → «Git».
- `:1529` `{ key: "code", …, capability: "planned", stage: "G0.1" }` → `capability: "available"` (без `stage`).
  Контракт нигде в рантайме не читается (только тест). **Ломает** `src/__tests__/brand.test.ts:122-129`
  («marks unavailable capabilities with a delivery stage», ожидает code/G0.1) → переписать: `plannedCapabilities`
  пуст, `code` — `available`.

---

## 8. «Входящие» (уведомления) vs Intake → «Заявки» (D.2)
Оставить «Входящие» только для уведомлений: `ppm-brand/src/index.ts:764` `global.inbox`
(`sidebar-item.tsx:75`, `top-navigation-root.tsx:62`), `ru/notification.json:3-4`, `ru/navigation.json:16`
`sidebar.inbox`, `ru/power-k.json:81` `nav_inbox`.
Intake сейчас называется пятью способами:
- PPM-навигация: `ppm-brand/src/index.ts:884` `"project.intake": "Входящие"` (en `:150` «Intake») →
  **«Заявки»** (en можно «Requests» или оставить «Intake»); используется в `navigation/project-navigation-items.ts:133`.
- Хедер страницы: `apps/web/core/components/projects/settings/intake/header.tsx:54` `label="Intake"` →
  `isPpmShell ? ppmT("project.intake") : "Intake"`.
- `<title>`: `.../[projectId]/intake/page.tsx:65-71` `t("inbox_issue.page_label", { workspace })` (фолбэк
  `workspace: "Plane"` `:70` → «PPM»).
- Оверлей (29 ключей, `proto/manual-keys.txt` раздел `intake_to_zayavki`): `common.intake` «Предложения»,
  `navigation.sidebar.intake` «Предложения», `inbox_issue.label` «Входящие», `inbox_issue.page_label`
  «{workspace} - Входящие» → «{workspace} — Заявки», `inbox_issue.modal.title` → «Создать заявку»,
  `power_k.navigation_actions.nav_project_intake` «Перейти к предложениям» → «Перейти к заявкам»,
  `project_settings.features.intake.*` «Приём/приёма» → «Заявки/заявок», `project.json disabled_project.empty_state.inbox.*`
  «Функция 'Входящие' отключена…» → «Раздел «Заявки» отключён в этом проекте», `empty-state.json intake_*`,
  `tour.json product_tour.intake.*`, `workspace.json workspace_analytics.intake_trends`; весь `inbox.json`
  («рабочий элемент» → «заявка», §4.6). Исключить: `workspace_settings.settings.applications.webhook_secret.description`
  («входящих запросов вебхука» — generic).

---

## 9. Код: статус разработки (D.7) — `apps/web/core/components/ppm-git/route.tsx` (untracked)
Бэкенд всегда отдаёт `apply_available: False` и блокеры `["OWNER_DECISION_REQUIRED", "APPLY_ENDPOINT_PENDING"]`
(`apps/api/plane/ppm_git/write_actions.py:109-125`), т. е. это не временное состояние, а постоянный внутренний статус.
| Строка | Сейчас | Предложение |
|---|---|---|
| `:806-809` | «Сначала PPM показывает точный preview. Подтверждение сохраняет ваше решение, но в этой сборке ещё не вызывает GitHub и не может выполнить merge.» | «PPM показывает предпросмотр ветки и черновика PR и сохраняет ваше решение. Репозиторий в GitHub при этом не меняется.» |
| `:823-826` | «Внешняя запись выключена до утверждения прав GitHub App…» | «Запись в GitHub выключена. Можно проверить предпросмотр и принять или отклонить предложение — репозиторий не изменится.» |
| `:862-867` `WRITE_BLOCKER_LABELS` (`:864` OWNER_DECISION_REQUIRED, `:865` APPLY_ENDPOINT_PENDING «Кнопка реального применения ещё не подключена») + рендер `:967-974` | Внутренние блокеры видны пользователю | Не показывать служебные: `readiness.blockers.filter((b) => b !== "OWNER_DECISION_REQUIRED" && b !== "APPLY_ENDPOINT_PENDING")` (Record-тип оставить полным) |
| `:886-888` | «Проектируемый безопасный порядок: создать ветку, отправить commit, отдельно подтвердить draft PR.» | «Порядок: ветка → commit → черновик PR. Каждый шаг подтверждается отдельно.» |
| `:893-900` кнопка «Проверить права» рендерится **только** при `canRefresh` (`:559-561`: `capabilities.manage_provider && installations.some(active)`) | — | — |
| `:960` | «Вернитесь сюда и нажмите «Проверить права».» — ссылка на кнопку, которой нет у не-админа/без активной установки | `{canRefresh ? <li>Вернитесь сюда и нажмите «Проверить права».</li> : <li>Попросите администратора проекта проверить права на этой странице.</li>}` |
| `:1062` | «Решение сохранено. GitHub пока не изменён: внешнее применение появится после утверждения write‑прав.» | «Решение сохранено. Репозиторий в GitHub не изменён.» |
Тесты: `apps/web/tests/ppm-git/webhook-status.test.ts` покрывает только хелпер; строки маршрута тестами не
закреплены. Мелкий текст (`text-10`) здесь — зона E.

---

## 10. Тесты и команды (не запускал — задача не разрешала прогон тестов)
- `cd plane-fork && pnpm --filter @ppm/brand test` — vitest `src/__tests__/brand.test.ts` + `scripts/audit-user-facing-brand.mjs`
  (scope 23 файла, `:7-31`; allowlist `:33-49`). Меняется `brand.test.ts:122-129`.
- `pnpm --filter web test` (vitest, `apps/web/vitest.config.ts`: env `node`, `tests/**/*.test.{ts,tsx}`);
  `pnpm --filter web test:navigation`.
- `pnpm --filter @plane/i18n run check:sync` (должен остаться `0 missing/stale/collisions`), `run check:types`,
  `run build` (после добавления `applyTranslationOverlay`).
- `pnpm --filter web check:types`; `pnpm --filter @ppm/brand check:types` / `check:format` (формат
  `build-manifest.json`, `package.json`, `tsdown.config.ts`).
- API: `docker compose -f docker-compose-test.yml up --build --abort-on-container-exit` (см.
  `apps/api/tests/RUNNING_TESTS.md`); релевантно `plane/tests/contract/app/test_workspace_app.py`,
  `test_project_app.py:92-97`.
- Корень PPM: `npm test` (vitest AntyFlow + M0.6 baseline guard) и `npx tsc --noEmit` — по CLAUDE.md.
- Новые: `packages/ppm-brand/src/__tests__/i18n-overlay.test.ts`, `apps/web/tests/power-k/shortcut-handler.test.ts`,
  (опц.) `apps/web/tests/i18n/overlay.test.ts`, API-тест русских статусов с `override_settings`.
- Дымовой: пустой localStorage → вход → Главная (CTA «Новая задача»), проект → Задачи (`<title>` «… — Задачи»),
  Спринты/Направления/Фильтры задач/Документы/Заявки (крошки = меню = `<title>`), настройки проекта (группы),
  ⌘K в раскладке ЙЦУКЕН, «холст», «хранилище», «спринт», «направление» в поиске команд, `gi`/`gc` в ЙЦУКЕН,
  переключение языка ru→en→ru; `PPM_SHELL_ENABLED=0` → upstream-строки и нет новых команд.

---

## 11. Открытые вопросы
1. Переносить ли 6 уже сделанных правок `ru/*.json` (другой агент, UX0.1) в оверлей с возвратом файлов к upstream?
   (Рекомендую да — иначе `PPM_SHELL_ENABLED=0` не возвращает upstream и остаётся конфликт с синком Plane.)
2. Сид пространства: выключить (`PPM_WORKSPACE_SEED_ENABLED=0`) или делать русский демо-проект? Русские имена
   `DEFAULT_STATES` для новых проектов — согласовать (формально данные по умолчанию, не модель; стоп-правило
   «изменения API — вне карточки» трактуется неоднозначно).
3. Термины вне карточки: «рабочее пространство»→«пространство», «Состояния»→«Статусы», «Мои заметки» vs
   «Заметка» на Холсте, «Pages» → «Документы» во всех строках фичи (карточка требует только «полностью на русском»).
4. Локализация пакета `@plane/editor` (~150 строк без i18n) — в UX0.2 или отдельной карточкой? Минимум для UX0.2:
   web-обвязка Документов + плейсхолдер пустого документа + шрифт.
5. Английский текст для `project.intake` в en: «Requests» или оставить «Intake»?
