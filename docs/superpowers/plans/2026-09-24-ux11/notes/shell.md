# Wave 1 map · Plane shell restyle surface (hybrid A+B)

Mapper scope: top bar, main sidebar (+ project navigation groups), issue list rows, property chips,
Propel/@plane/ui primitives (Button, IconButton, Input, Badge, Tabs, Tooltip, Menu), popovers, peek
overview, modals, icons. Read-only mapping of the current working tree (wave 0 = UX0.2 uncommitted, treated as truth).

Target values come from the owner brief (`directions/HYBRID-BRIEF.md`: top bar 44-48 px, rows 36 px / 14 px text
«Удобная», 32 px / 13 px «Компактная», radii 4/6/8/12, icons 16 px stroke 1.5, shadows only on floating layers) and
the A mock measurements (`design-canvas/project/A-*.dc.html`: header 44, controls 28, primary 32, segmented 24, sidebar
item 28 r6, row 40 with `inset 2px 0 0 accent` for the open item, group header 36). No `H-*.dc.html` hybrid boards
existed when this was written (checked at 21:04 and 21:25); **H-System is the final source for numbers**, the token
names below are the slots to fill.

Helper scripts (read-only, in this folder): `shell-tw-probe.mjs <candidate...>` prints the CSS the current PPM
Tailwind design system generates for a class (same entry as the build); `shell-tw-theme.mjs --radius-md ...` prints
resolved theme values; `shell-proposed.css` is the §4.2 block extracted verbatim and `shell-css-check.mjs` parses it
with lightningcss 1.30.2 (result: valid, no warnings; LightningCSS merges equal-declaration rules into comma lists,
which keeps per-selector specificity).

---

## 0. TL;DR

1. **Most sizes are not token-driven.** Tailwind v4 compiles heights, paddings, icon sizes to
   `calc(var(--spacing) * N)` (one global multiplier) and **inlines shadow values** into each `shadow-*` utility.
   What *is* var-driven and can be re-pointed under `[data-ppm-brand="enabled"]` with zero component edits:
   all colours (`--bg-*`, `--txt-*`, `--border-*`, already bridged), radii `--radius-xs..3xl`, font sizes
   `--text-*`, `--height-header` (`h-header`), `--padding-page-x/y` (`px-page-x`, used by every `Row`).
2. **Radii already equal the hybrid scale.** `rounded-sm/md/lg/xl` = 4/6/8/12 px (`--radius-sm..xl`, verified via the
   design system). Do **not** change the radius tokens: 733 `rounded-sm` uses mix chips, small buttons and popovers.
   Align per role with hooks (popovers → 8, modals → 12, search → 6). `--ppm-radius-sm/md/lg` in tokens.css
   (6/8/12) are orphaned (no consumer) and their names clash with Tailwind's scale; rename to role tokens.
3. **Elevation policy is achievable with zero component edits** (layer b): neutralise `.shadow-raised-100`
   (resting secondary buttons, kanban cards, comments), re-point `.shadow-raised-200`, `.shadow-overlay-100/200`
   (all of their static uses are floating layers) to `--ppm-shadow-popover`, and add a shadow to every
   react-popper surface through the attribute Popper already writes: **`[data-popper-placement]`** (30 popover
   surfaces incl. `CustomMenu`, `CustomSelect`, `CustomSearchSelect`, all property dropdowns). Modals via
   `[id^="headlessui-dialog-panel-"]`. `shadow-sm/md/lg` are dead classes (produce no CSS) and must not be relied on.
4. **Icons:** lucide (323 importing files) renders `<svg class="lucide …" stroke-width="2" viewBox="0 0 24 24">`;
   one gated rule `svg.lucide { stroke-width: 2.25 }` gives exactly 1.5 px at 16 px (scales like the mock, whose
   icons are drawn at stroke 1.5 in a 16-unit box). Propel icons (411 files) are **filled outlines** (`fill={color}`,
   no stroke): stroke cannot be changed by CSS; they stay ≈1.25 px. Accept or replace later.
5. **Rows, sidebar items and the top bar need stable hooks** → a handful of minimal edits (layer c). Critically,
   **do not style `.group\/list-block` or `.group\/list-header`**: they are shared with the Gantt sidebar
   (JS `BLOCK_HEIGHT = 44`, `HEADER_HEIGHT = 48` in `gantt-chart/constants.ts:7,9`) and the spreadsheet rows.
6. **Grouping Работа / Знания is NOT implemented.** Items carry `ppmSection` metadata
   (`project-navigation-items.ts:15,27`) but `ProjectNavigation` renders one flat list
   (`project-navigation.tsx:117-150`); labels also need two new PPM translation keys.
7. The app frame (`pr-2 pb-2 pl-2` padding + `rounded-lg border` card) sits in 4 upstream files; the mock is flush
   (header border-bottom + sidebar border-right). Removing it needs small `isPpmShell`-gated edits.
8. Existing constraints: source-regex test `tests/navigation/top-navigation-gating.test.ts` pins exact class
   strings in `top-navigation-root.tsx`; `packages/ppm-brand/scripts/audit-tailwind-classes.mjs` fails dead classes
   in PPM-owned files (incl. `top-nav-power-k.tsx`, `project-navigation.tsx`); token contract tests parse
   `tokens.css`. Baseline now: `apps/web` `tests/navigation` + `tests/ppm-a11y` 7 files / 25 tests pass;
   `packages/ppm-brand` vitest 3 files / 41 tests pass; tailwind audit passes (30 files).

---

## 1. How styling resolves here (verified facts)

### 1.1 Tailwind v4 compile shape (via `shell-tw-probe.mjs`, current tree)

| Candidate | Generated CSS | Drivable by a variable? |
|---|---|---|
| `rounded-sm/md/lg/xl/2xl`, `rounded-xs` | `border-radius: var(--radius-*)` | yes (global) |
| `rounded` | `border-radius: 0.25rem` (literal) | no |
| `shadow-raised-100/200`, `shadow-overlay-100/200` | `--tw-shadow: 0px … var(--tw-shadow-color, #292f3d0f) …; box-shadow: var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)` | **no** (values inlined). Only hook: `--tw-shadow-color`, registered `inherits: false` (must be set on the element itself) |
| `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` | **no CSS** (`@theme { --shadow-*: initial }` in `tailwind-config/variables.css:710`) | dead classes |
| `min-h-10`, `h-11`, `size-4`, `px-2`, `leading-5` | `calc(var(--spacing) * N)` | only via global `--spacing` (never touch) |
| `h-header` | `height: var(--height-header)` = 3.25rem (52 px) | yes |
| `px-page-x` / `py-page-y` | `padding-inline: var(--padding-page-x)` = 1.35rem (21.6 px) | yes |
| `text-11/12/13/14` | `font-size: var(--text-13)` etc. | yes (see density caveat §3.5) |
| `text-body-xs-medium` | `font-size: var(--text-body-xs-medium)` → `var(--text-13)`, line-height 1.4 | yes, but resolved at `:root` |
| `border` / `border-[0.5px]` | `border-width: 1px` / `0.5px` literal | no |
| `border-subtle`, `-subtle-1`, `-strong`, `-strong-1` | `border-color: var(--border-*)` | yes (bridged in tokens.css:232-241) |
| `stroke-[1.5]`, `stroke-2` | `stroke-width: 1.5` / `2` | n/a |

Theme values (`shell-tw-theme.mjs`): `--radius-xs .125rem, -sm .25rem, -md .375rem, -lg .5rem, -xl .75rem,
-2xl 1rem, -3xl 1.5rem`, `--spacing .25rem`, `--height-header 3.25rem`, `--padding-page-x/y 1.35rem`,
`--text-11 .6875rem … --text-14 .875rem`, `--default-border-width 1px`.

Source: `packages/tailwind-config/variables.css:692-724` (`@theme`: radius reset only `--radius-4xl`, border widths,
`--shadow-*: initial` + 7 custom shadows, `--height-header: 3.25rem`, `--padding-page(-x/-y): 1.35rem`),
`:980-1017` (fonts, `--text-9 … --text-40`).

### 1.2 Cascade layers and gating

- Layer order in the compiled sheet: `properties, theme, base, components, utilities`. `tokens.css` is imported
  second in `apps/web/styles/globals.css:2` (`@import "@ppm/brand/tokens.css";`) and contributes to `@layer base`
  (token blocks) and `@layer utilities` (focus ring, tokens.css:275-318); the editor font rules are unlayered on
  purpose (tokens.css:320-330).
- Token overrides in `@layer base` beat Tailwind's `:root,:host` theme block (`@layer theme`) regardless of
  specificity → `--padding-page-x`, `--height-header`, `--radius-*` can be re-pointed from tokens.css.
- Class overrides must live in `@layer utilities` with `html[data-ppm-brand="enabled"] …` prefix (≥ (0,2,1)) to beat
  single utilities (0,1,0) and their hover/focus variants (0,2,0). Unlayered overrides would also beat hover/focus
  variants (breaks states) — avoid. Tailwind `!` utilities (e.g. `!bg-layer-transparent-active` in
  `sidebar-navigation.tsx:22`) are important-in-utilities; do not fight them with `!important`, re-point the variable
  they read on the hooked element instead (see §3.4 "scoped variable trick").
- Presentation attributes (`stroke-width="2"` from lucide/`strokeWidth` props) lose to any author CSS; evidence:
  Tailwind `stroke-*` utilities already override lucide attributes in this app.
- Gating attributes are set only on `<html>` (`apps/web/app/root.tsx:86-89`):
  `data-ppm-brand={IS_PPM_BRAND_ENABLED ? "enabled" : "disabled"}`,
  `data-ppm-shell={IS_PPM_SHELL_ENABLED ? "enabled" : "disabled"}` (shell implies brand:
  `isPpmShellEnabled = isPpmBrandEnabled(brand) && isPpmBrandEnabled(shell)`, `packages/ppm-brand/src/index.ts:1702-1704`).
  Flags are build-time (`apps/web/vite.config.ts:16-20`). CSS gated on these attributes is a complete rollback.
- Flag usage for this area: **visual** (colour, radius, elevation, stroke, hairlines) → `PPM_BRAND_ENABLED`
  (`html[data-ppm-brand="enabled"]`); **structure/layout** (frame removal, top bar composition, nav groups, labels) →
  `PPM_SHELL_ENABLED` (`isPpmShell` in TSX or `html[data-ppm-shell="enabled"]`). `PPM_ANTYFLOW_SHELL_ENABLED` and
  `PPM_PROJECT_ASK_ENABLED` are canvas-only (`ppm-canvas/route.tsx:41`, `ppm-canvas/workspace.tsx:88-89`) — the shell
  restyle does not touch them.
- Theme default: `root.tsx:109-112` `defaultTheme={IS_PPM_BRAND_ENABLED ? "dark" : "system"}` → for «по системе»
  change to `"system"`. After login `core/lib/wrappers/store-wrapper.tsx:73` applies
  `setTheme(userProfile?.theme?.theme || "system")`, so users who saved a theme keep it.

### 1.3 File ownership (diff vs upstream v1.4.2 `5f7d92784c`, working tree)

PPM-modified already (safe to extend with `isPpmShell` branches): `navigation/top-navigation-root.tsx`,
`navigation/top-nav-power-k.tsx`, `navigation/project-navigation-items.ts`, `workspace/sidebar/{project-navigation,
sidebar-item, sidebar-menu-items, projects-list, projects-list-item, workspace-menu-root, help-section/root,
user-menu-root}.tsx`, `sidebar/{sidebar-wrapper, resizable-sidebar, sidebar-item, sidebar-toggle-button}.tsx`,
`app/root.tsx`, `styles/globals.css`, `propel/{button,icon-button}/helper.tsx` (+1/-1 each).

Pure upstream (edits widen the upstream diff; wave 0 explicitly refused to fix ~130 upstream dead classes for that
reason — `docs/superpowers/plans/2026-09-24-ux02/notes/classes.md:234`): `workspace/content-wrapper.tsx`,
`(projects)/layout.tsx`, `(settings)/layout.tsx`, `settings/profile/layout.tsx`, `sidebar/sidebar-navigation.tsx`,
`sidebar/add-button.tsx`, `workspace/sidebar/quick-actions.tsx`, `issue-layouts/list/*`, `properties/all-properties.tsx`,
`ui/loader/layouts/list-layout-loader.tsx`, `dropdowns/buttons.tsx`, `peek-overview/*`, `core/app-header.tsx`, all of
`packages/propel` and `packages/ui` except the two helper lines above.

---

## 2. Surface map (current code → hybrid target → mechanism)

### 2.1 App frame (between top bar and content)

- `core/components/workspace/content-wrapper.tsx:24-37`
  ```tsx
  <div className="relative flex size-full flex-col overflow-hidden bg-canvas …">
    <TopNavigationRoot />
    <div className="relative flex size-full overflow-hidden">
      {shouldRenderAppRail && <AppRailRoot />}
      <div className={cn("relative size-full flex-grow overflow-hidden pr-2 pb-2 pl-2 …", { "pl-0!": shouldRenderAppRail })}>
  ```
- `app/(all)/[workspaceSlug]/(projects)/layout.tsx:18`
  `<div className="relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-subtle">` (+ `#full-screen-portal` at :19, `<main … bg-surface-1>` at :23).
  Same frame: `(settings)/layout.tsx:16`, `settings/profile/layout.tsx:19`.
- App rail is off (`core/lib/app-rail/provider.tsx:25` `isEnabled = false`; layout mounts the provider without it).
- Target (mock): flush shell — top bar with `border-bottom`, sidebar `border-right`, no 8 px gutter, no rounded card.
- Mechanism: classes only; no token. Hook without edit only for the projects frame
  (`div:has(> #full-screen-portal)`), none for the wrapper padding → **(c) 4 gated edits**, see §4.3 C1.

### 2.2 Top bar — `core/components/navigation/top-navigation-root.tsx` (PPM file, 123 lines)

| Element | Code | Now | Target |
|---|---|---|---|
| Container | :56-61 `cn("z-[27] flex min-h-10 w-full items-center bg-canvas px-3.5 transition-all duration-300", { "min-w-0 gap-1": isPpmShell, "px-2": !showLabel })` | 40 px, no bottom border (frame gives separation), `bg-canvas` | 44 px, 1 px `border-subtle` bottom, bg = app background role |
| Sidebar toggle | :63-72 → `AppSidebarToggleButton` (`sidebar-toggle-button.tsx:20-23`: IconButton ghost `base` 24 px, lucide `PanelLeft` 16 px) | ok | keep |
| Workspace switcher | :74-76 → `WorkspaceMenuRoot variant="top-navigation"` | see below | 28 px control, 13 px |
| Search | :78-80 → `TopNavPowerK` | see below | 28 px, r6, `Ctrl K` hint |
| Narrow search btn | :83-92 IconButton ghost `xl` (32 px, icon 20 px), `sm:hidden` | ok | optional `lg` |
| Inbox | :93-115 `AppSidebarItem` link; icon box `size-8 rounded-md` (`sidebar/sidebar-item.tsx:62`), `<InboxIcon className="size-5" />` :101, unread dot `size-2` :105 | 20 px icon | **16 px** |
| Help | `workspace/sidebar/help-section/root.tsx:40-48` PPM branch `"flex h-8 items-center gap-1.5 rounded-md bg-layer-2 px-2.5 text-11 font-medium text-secondary …"`, `HelpCircle size-4` | 32 px, 11 px text, filled chip | 28 px ghost, 12-13 px |
| User | :117 `<div className="flex size-8 … rounded-md hover:bg-layer-1-hover">` + `user-menu-root.tsx:59-67` `Avatar size={20}` in `grid size-8 … rounded-md` | 32/20 | 28/24 (mock) optional |

Coupled positions (must follow a height change):
- `workspace/sidebar/workspace-menu-root.tsx:154-161` dropdown is `fixed … mt-1 … rounded-xl border border-subtle bg-surface-1 shadow-raised-200` with `"top-10 left-4": variant === "top-navigation"` → at 44 px header use `top-11` (44 + mt-1 = 4 px gap).
- Switcher button `:120-141`: `"group/menu-button flex flex-grow … rounded-sm p-1 text-13 font-medium text-secondary hover:bg-layer-1"`, logo `size-7` (28 px) `rounded-md`, name `<h4 className="truncate text-14 font-medium text-primary">`, chevron `size-4`.
- Search dropdown in `top-nav-power-k.tsx:267-274` is `absolute -top-[6px] … pt-10 … rounded-md border border-subtle bg-surface-1 shadow-overlay-100` relative to the search box, not to the bar → independent of bar height, depends on the input staying `h-7`.

`top-nav-power-k.tsx` (PPM file, in tailwind-audit `extraFiles`):
- :217-223 width `w-[364px] max-w-[calc(100vw-2rem)]`, open `w-[554px]`;
- :225-233 label `"flex h-7 w-full items-center rounded-lg border border-subtle-1 bg-layer-2 p-2 … focus-within:border-accent-strong focus-within:ring-1 focus-within:ring-accent-strong"` → **r8 now, r6 target**;
- :234 `SearchIcon … size-3.5` (14 px, matches mock); no shortcut hint today → add `Ctrl K`/`⌘K` using
  `formatShortcutForDisplay` from `power-k/ui/modal/command-item-shortcut-badge.tsx:17` (PPM file).

Tests pinning this file: `tests/navigation/top-navigation-gating.test.ts:13-24` requires the literal strings
`className={isPpmShell ? "hidden shrink-0 sm:block" : "shrink-0"}>…<TopNavPowerK />`,
`{isPpmShell && (<IconButton className="sm:hidden"`, `"min-w-0 gap-1": isPpmShell`,
`className={isPpmShell ? "min-w-0 flex-1" : "flex-1 shrink-0"}>…<WorkspaceMenuRoot`. Add new keys, do not rewrite
these. `tests/navigation/navigation-accessibility.test.tsx:194-209` renders `TopNavPowerK` and asserts roles/labels
(adding a `<kbd>` hint is compatible).

### 2.3 Main sidebar

Container — `core/components/sidebar/resizable-sidebar.tsx` (PPM file):
- :188-205 `id="main-sidebar"` `"z-20 h-full border-r border-subtle bg-surface-1"`, width from inline style;
  `app/(all)/[workspaceSlug]/(projects)/_sidebar.tsx:32-34,53` width = localStorage `sidebarWidth` ?? `SIDEBAR_WIDTH`
  250 (`packages/constants/src/sidebar.ts:7`), min 236 / max 350 (`resizable-sidebar.tsx:46-47`). Mock 232 → would need
  `minWidth` change; recommend keep 250.
- :206-211 main `<aside className="group/sidebar … bg-surface-1 pt-3">`; :231-253 peek panel (no id) has dead
  `shadow-sm` and `<aside className="group/sidebar … bg-surface-1 pt-4 … rounded-md rounded-tl-none rounded-bl-none border-r border-subtle">`.
  Hooks without edits: `#main-sidebar`, `.group\/sidebar` (unique to this file, both asides).

Header + quick action — `core/components/sidebar/sidebar-wrapper.tsx` (PPM file):
- :57-78 `flex flex-col gap-3 px-3` → title row `px-2` → `<span className="pt-1 text-16 font-medium text-primary">{title}</span>`
  (title = `PPM_BRAND.name` "PPM" in shell, `(projects)/sidebar.tsx:37-39`); customize-nav IconButton base (shown only
  when `title === "Projects" || title === "PPM"`, :64 — keep the prop if the header becomes a logo); toggle button.
  Brief wants the PPM mark → reuse `components/ppm-shell/product-logo.tsx` (needs a small size variant; today
  `size-7` / `size-9` + 18 px wordmark).
- :80-88 ScrollArea viewport `"flex flex-col gap-3 … px-3 pt-3 pb-0.5"`.
- Quick action: `workspace/sidebar/quick-actions.tsx:80-93` (upstream) → `sidebar/add-button.tsx:17-26` (upstream)
  `<Button variant="secondary" size="xl" className="w-full justify-start">` (32 px, **`shadow-raised-100`**), label
  `AddWorkItemIcon size-4` + `max-w-[145px] truncate text-13 font-medium`. Real shortcut is the sequence `n i`
  (`power-k/config/creation/command.ts:73` `keySequence: "ni"`), not a single `N` as C's mock shows.

Nav item primitive — `core/components/sidebar/sidebar-navigation.tsx:15-31` (upstream, 7 consumers, all sidebar):
```tsx
"group relative flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-md px-2 py-1 outline-none",
{ "!bg-layer-transparent-active text-primary": isActive,
  "text-secondary hover:bg-layer-transparent-hover active:bg-layer-transparent-active": !isActive }
```
Consumers: `workspace/sidebar/sidebar-item.tsx:84-92` (inner `flex items-center gap-1.5 py-[1px]`, icon from
`helper.tsx:21-43` all `size-4`, label `<p className="text-13 leading-5 font-medium">`) → height 8 + 2 + 20 = **30 px**;
`project-navigation.tsx:135`, `user-menu-item.tsx:59`, `extended-sidebar-item.tsx:196`, `workspace-menu-item.tsx:66`,
`projects-list.tsx:252`, `sidebar-menu-items.tsx:186`. No hook today (only the class string) → **(c) C4 data attribute**.

Section headers (PPM files): `sidebar-menu-items.tsx:116-138` «Рабочее пространство» and `projects-list.tsx:171-183`
«Проекты»: `"group flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-placeholder hover:bg-layer-transparent-hover"`, label `text-13 font-semibold`.

Project rows — `projects-list-item.tsx:298-306` `"group/project-item relative flex w-full items-center rounded-md px-2 py-1.5 text-primary hover:bg-layer-transparent-hover"` (+ `bg-surface-2` menu-active, `bg-layer-transparent-active` highlighted), name `text-13 font-medium text-secondary` (:345/:352), logo 16 px.
`.group\/project-item` is shared only by sidebar-like rows (`extended-sidebar-item.tsx:170`, `favorites/favorite-folder.tsx:163`, `favorites/favorite-items/common/favorite-item-wrapper.tsx:24`) → acceptable zero-edit hook.
Tree panel `:492-494` `Disclosure.Panel "relative mt-1 mb-1.5 flex flex-col gap-0.5 pl-6"` + guide line
`absolute top-0 bottom-1 left-[15px] w-[1px] bg-layer-3`.

Project navigation — `workspace/sidebar/project-navigation.tsx` (PPM file):
```tsx
116  return (
117    <nav aria-label={isPpmShell ? ppmT("navigation.project") : t("project")} className="flex flex-col gap-0.5">
118      {navigationItemsMemo.map((item) => {
119        if (!item.shouldRender) return;
121        const hasAccess = allowPermissions(item.access, EUserPermissionsLevel.PROJECT, workspaceSlug, project.id);
122        if (!hasAccess) return null;
135            <SidebarNavItem isActive={itemIsActive}>
138                  <item.icon className={`size-4 flex-shrink-0 ${item.name === "Intake" ? "stroke-1" : "stroke-[1.5]"}`} />
141                  <span className="text-11 font-medium">
```
- **Labels are 11 px** (upstream has the same `text-11`, so any change must be `isPpmShell`-gated).
- `stroke-[1.5]` on lucide icons (Gauge, Network, Code2, Settings) renders 1.0 px at 16 px; the Propel ones are fill.
- **No grouping.** `navigation/project-navigation-items.ts:15` `TPpmNavigationSection = "context" | "work" | "knowledge" | "code" | "project"`, every PPM item has `ppmSection` (:62,74,86,98,110,122,134,146,158,170,182); canonical order in `@ppm/brand` `PPM_PROJECT_NAVIGATION_CONTRACT` (`index.ts:1646-1662`, asserted by `brand.test.ts:116-129`). Missing: rendering of headers and i18n keys (`navigation.section_*` do not exist; only `navigation.project` etc., `index.ts:137-148` en / `:934-945` ru).
- Default navigation mode is `ACCORDION` (`packages/types/src/navigation-preferences.ts:61-65`) → project nav renders inside the sidebar tree; `TABBED` mode uses `TabNavigationRoot` in the `h-header` row (`[projectId]/layout.tsx:33-51`).
- Tests: `tests/navigation/project-navigation-items.test.ts` asserts item keys/order per role (grouping must not change `buildProjectNavigationItems`).

### 2.4 Issue list rows (`core/components/issues/issue-layouts/list/*`, all upstream)

| Part | Code | Now |
|---|---|---|
| Row | `list/block.tsx:179-192` `<Row className={cn("group/list-block relative flex min-h-11 flex-col gap-3 bg-layer-transparent py-3 text-13 transition-colors hover:bg-layer-transparent-hover", { "border-accent-strong": peeked, "border-strong-1": isIssueActive, "last:border-b-transparent": …, "bg-accent-primary/5 hover:bg-accent-primary/10": isIssueSelected, "bg-layer-1": isCurrentBlockDragging, "md:flex-row md:items-center": isSidebarCollapsed, "lg:flex-row lg:items-center": !isSidebarCollapsed })}` | min 44 px (12 + 20 + 12), stacked below md/lg |
| Row x-padding | `Row` → `packages/ui/src/row/helper.tsx:15-18` `REGULAR: "px-page-x"` | 21.6 px (token) |
| Title | `block.tsx:280` `<p className="cursor-pointer truncate text-body-xs-medium text-primary">` | 13 px / 1.4, 500 |
| Identifier | `block.tsx:236-247` → `issue-detail/identifier-text.tsx:13-16,55` `text-12 font-medium … text-caption-sm-regular` (sans) | mock: Plex Mono 11-12 |
| Properties | `block.tsx:300-308` `IssueProperties className="relative flex flex-wrap … items-center gap-2 whitespace-nowrap"`; each chip wrapped in `<div className="h-5">` (`properties/all-properties.tsx:203,220,239,275,299,323,348,369,391`) | chips 20 px |
| Divider | `list/block-root.tsx:139` RenderIfVisible `classNames={\`relative ${isLastChild && !isExpanded ? "" : "border-b border-b-subtle"}\`}` | 1 px `--border-subtle` (hairline ✓) |
| Placeholder | `block-root.tsx:142-143` `placeholderChildren={<ListLoaderItemRow … renderForPlaceHolder …/>}`, `shouldRecordHeights={isMobile}` → on desktop off-screen rows are the placeholder: `ui/loader/layouts/list-layout-loader.tsx:24-30` `Row "flex h-11 items-center justify-between py-3"` | fixed 44 px |
| Group header | `list/list-group.tsx:266-270` `Row "w-full flex-shrink-0 border-b border-subtle bg-layer-1 py-1 pr-3 hover:bg-layer-1-hover"` (+ `sticky top-0 z-[2]`) → `list/headers/group-by-card.tsx:93` `"group/list-header flex w-full flex-shrink-0 items-center gap-2 py-1.5"`, title `:118 line-clamp-1 … font-medium text-primary`, count `:119 pl-2 text-13 font-medium text-tertiary`, add `:127,150 h-5 w-5 rounded-xs` | ≈ 40 px, `bg-layer-1` |

States today: hover = `--bg-layer-transparent-hover`; multi-select = 5 %/10 % accent; **peeked and keyboard-active
are invisible**: `border-accent-strong` / `border-strong-1` set only `border-color` and the Row has no border width
(the visible 1 px line comes from the wrapper in block-root). Target (mock A): open item = selected fill +
`box-shadow: inset 2px 0 0 <accent>`; hover subtle; focus ≠ selection (focus ring stays on the `ControlLink <a>`).

Hooks: none unique. `group/list-block` also on `gantt-chart/sidebar/issues/block.tsx:47`, `base-layouts/gantt/sidebar.tsx:104`, `issues/workspace-draft/draft-issue-block.tsx:136`, `spreadsheet/issue-row.tsx:265`; `group/list-header` also on `gantt-chart/sidebar/root.tsx:66`, `spreadsheet/spreadsheet-header.tsx:54`. Gantt aligns rows by JS constants (`gantt-chart/constants.ts:7 BLOCK_HEIGHT = 44`, `:9 HEADER_HEIGHT = 48`) → styling these shared classes would misalign the Gantt chart. **(c) C6 data attributes.**

Row height maths: chip 20 px + 2 × pad. 36 px → pad 8; 32 px → pad 6. If the placeholder is not changed together
with the row, desktop scrolling shows 44 px placeholders turning into 36 px rows (scroll jump).

### 2.5 Property chips — `core/components/dropdowns/buttons.tsx` (upstream)

- `DropdownButton` → `BorderButton` (:69-96) / `BackgroundButton` (:98-121) / `TransparentButton` (:123-149), each
  `<Tooltip><Button variant="ghost" size="sm" className={cn("flex h-full w-full items-center justify-start gap-1.5 border-[0.5px] border-strong", { "bg-layer-transparent-active": isActive }, className)}>`.
  Propel `sm` = `h-5 rounded-sm px-1.5 text-caption-md-medium` (20 px, r4, 12 px) but `h-full` wins via
  tailwind-merge, so height = parent `div.h-5` in all-properties. Radius 4 ✓ (chip role). Border 0.5 px
  `--border-strong` (≥ 3:1 control border in PPM tokens).
- **Nested interactive content** (deferred from wave 0, CHANGELOG 2026-09-24 «Отложено: переделка вложенных кнопок в
  выпадающих списках Plane (`dropdowns/buttons.tsx`)»): e.g. `dropdowns/state/base.tsx:153-201` renders
  `<button className="clickable …">` → `DropdownButton` → Propel `<Button>` = `<button>` inside `<button>`. Same
  pattern in `member/base.tsx:125-160`, `date.tsx:124-163`, etc. Minimal fix: render a `<span>` with
  `getButtonStyling("ghost", "sm")` (exported by `@plane/propel/button`) instead of `<Button>` — identical classes,
  no nested button (§4.3 C8).
- Popover panels of these dropdowns carry `[data-popper-placement]` (see §2.8).

### 2.6 Propel / @plane/ui primitives

| Primitive (consumers in apps/web) | File:line | Current sizes / radius / elevation | Hybrid fit |
|---|---|---|---|
| Propel `Button` (166 importing files; `<Button size>` tally in `apps/web/core`: lg 113, default base 65, xl 33, sm 8) | `propel/src/button/helper.tsx:10-41`; icons `:53-58`; `button.tsx:36-38` forces `strokeWidth: 2` on prepend/append icons | sm `h-5 rounded-sm px-1.5 text-caption-md-medium`, base `h-6 rounded-md px-2 text-body-xs-medium`, lg `h-7 rounded-md`, xl `h-8 rounded-md text-body-sm-medium` → 20/24/28/32, r4/6/6/6; `secondary` = `border border-strong bg-layer-2 … shadow-raised-100` | heights already = mock (24 segmented, 28 controls, 32 primary), r6 ✓; drop resting shadow (b); icon stroke via lucide rule (b) overrides the forced attribute |
| Propel `IconButton` (38 files) | `propel/src/icon-button/helper.tsx:11-41`; `icon-button.tsx:36-45` | sm `size-5 rounded-sm`, base `size-6`, lg `size-7`, xl `size-8` (`rounded-md`); icon 14/16/16/20; secondary has `shadow-raised-100` | ✓ except xl icon 20 px |
| `@plane/ui` `Input` (43 files) | `packages/ui/src/form-fields/input.tsx:37-49` | `rounded-md border-[0.5px] border-subtle-1 bg-layer-2 text-13`; xs `px-1.5 py-1`, sm `px-3 py-2` | r6 ✓; border is 0.5 px (1 device px on 2×) — judge wants field borders ≥ 3:1 (colour is already the control border) |
| Propel `Badge` (1 file) | `propel/src/badge/helper.tsx:19-23` | sm `h-4 rounded-sm`, base `h-5 rounded-md`, lg `h-6 rounded-md` | chips should be r4 — negligible reach |
| Propel `Tabs` (5 files) | `propel/src/tabs/tabs.tsx:71` list `rounded-lg p-0.5 text-13` (`bg-layer-3` contained); `:95-102` trigger `rounded-md … p-1`, selected `data-[selected]:shadow-sm data-[selected]:raised-200 … border-subtle-1 bg-layer-2` (both shadow tokens are dead); `:132` indicator `shadow-sm … h-6 rounded-xs` | mock segmented: box 28 r6 1 px border, items 24 r4 — leave for Tasks mapper |
| Propel `Tooltip` (118 files) | `propel/src/tooltip/root.tsx:57-63` Positioner `"z-50 max-w-xs gap-1 overflow-hidden rounded-lg border border-subtle-1 bg-layer-2 px-2 py-1.5 break-words shadow-overlay-200"`; text `text-caption-md-medium` / `text-caption-sm-regular` (12/11) | floating → shadow ok; unique class `shadow-overlay-200` is a zero-edit hook |
| `@plane/ui` `CustomMenu` (61 files) | `packages/ui/src/dropdowns/custom-menu.tsx:206-219` `"shadow-md my-1 min-w-[12rem] overflow-y-scroll rounded-md border border-strong-1 bg-surface-1 px-2 py-2.5 text-11 … ring-1 ring-strong-1/15"` + `{...attributes.popper}`; items `:474-476` `"w-full truncate rounded-sm px-1 py-1.5 …"`; submenu `:435-436`, `:528-529` | **no shadow** (dead `shadow-md`), strong-1 border + ring, 11 px text | r8, hairline, popover shadow → `[data-popper-placement]` |
| Propel `Menu` (1 file) | `propel/src/menu/menu.tsx:189` | `rounded-md border-[0.5px] border-strong … shadow-raised-200 text-11` | same as popovers |
| `ModalCore` (54 files) + `AlertModalCore` (17) | `packages/ui/src/modals/modal-core.tsx:44` overlay `fixed inset-0 bg-backdrop`; `:58-63` `Dialog.Panel "relative w-full transform rounded-lg bg-surface-1 text-left shadow-raised-200 transition-all"` + `EModalWidth` (`constants.ts:12-23`) | r8, small raised shadow | r12 + overlay shadow via `[id^="headlessui-dialog-panel-"]` |
| Propel `Dialog` (1 file) | `propel/src/dialog/root.tsx:44-45` `BASE_CLASSNAME = "… rounded-lg shadow-md … border border-subtle"`, has `data-slot="dialog-content"` (:105) | dead shadow | hook `[data-slot="dialog-content"]` |
| Page header `AppHeader` | `core/components/core/app-header.tsx:27` `Row "flex h-11 w-full items-center gap-2 border-b border-subtle bg-surface-1"` | 44 px ✓ | keep; `h-header` rows (52 px) differ — see §3.1 |

Propel already uses a `data-slot` convention (tabs `tabs.tsx:48,69,93,118`, popover `popover/root.tsx:45-69`, dialog
`dialog/root.tsx:59-121`, command, scroll-area, skeleton, separator) → adding `data-slot`/`data-variant`/`data-size`
to Button/IconButton/Tooltip/Input would follow existing practice (optional, §4.3 C10).

### 2.7 Peek overview — `core/components/issues/peek-overview/view.tsx` (upstream)

```tsx
121  const peekOverviewIssueClassName = cn(
122    !embedIssue ? "absolute z-[25] flex flex-col overflow-hidden rounded-sm border border-subtle bg-surface-1 transition-all duration-300" : `h-full w-full`,
125    !embedIssue && { "top-0 right-0 bottom-0 w-full border-0 border-l md:w-[50%]": peekMode === "side-peek",
127      "top-[8.33%] left-[8.33%] size-5/6": peekMode === "modal", "absolute inset-0 m-4": peekMode === "full-screen" });
141          className={peekOverviewIssueClassName}
142          style={{ boxShadow: "0px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 6px 12px 0px rgba(16, 24, 40, 0.12), 0px 1px 16px 0px rgba(16, 24, 40, 0.12)" }}
```
- Inline style → only `!important` or an edit can change it; no stable hook. Header `peek-overview/header.tsx:157`
  `p-4`, bare icon buttons `h-4 w-4`, `IconButton variant="secondary" size="lg"` (resting shadow).
- Portal target `#full-screen-portal` lives in the projects frame (`(projects)/layout.tsx:19`) — unaffected by frame
  styling changes.
- Minimal edit: `boxShadow: "var(--ppm-shadow-overlay, 0px 4px 8px …upstream…)"` (identical when brand off because
  the variable is only defined under `[data-ppm-brand="enabled"]`) + `data-ppm-surface="peek"` for radius (§4.3 C7).

### 2.8 Popovers (all floating surfaces) — zero-edit hooks

- **`[data-popper-placement]`**: react-popper 2.3.0 + @popperjs/core 2.11.8 set it via `computeStyles`
  (`@popperjs/core/lib/modifiers/computeStyles.js:158`) and every consumer spreads `{...attributes.popper}` on the
  *visual* box. 30 files: `packages/ui` `custom-menu.tsx:219,434`, `custom-select.tsx`, `custom-search-select.tsx`,
  `context-menu/item.tsx:198`, `popovers/popover.tsx:77`, `dropdown/single-select.tsx:150`, `multi-select.tsx`,
  `form-fields/input-color-picker.tsx`; `apps/web` `dropdowns/{priority,date,date-range,estimate}.tsx`,
  `dropdowns/{state,intake-state,project}/base.tsx`, `dropdowns/{module,cycle,member}/*-options.tsx`,
  `issues/issue-layouts/filters/header/helpers/dropdown.tsx`, `calendar/dropdowns/*`, `properties/label-dropdown.tsx`,
  `issue-detail/label/*`, `issues/select/base.tsx`, onboarding, gpt/comic popovers. (Attribute appears after
  Popper's first update — one frame without shadow.)
- `.shadow-raised-200` static uses are all floating (dropdown panels, `ModalCore`, workspace dropdown,
  editor bubble/slash/mention/table menus, colour pickers, toast, switch-account modal, `profile/sidebar.tsx:90`
  mobile fixed panel). Cards use the separate `hover:shadow-raised-200` (`ui/card/helper.tsx:30`,
  `propel/card/helper.tsx:30`, `project/card.tsx:215`).
- `.shadow-overlay-100`: `top-nav-power-k.tsx:269`, `propel/toast/toast.tsx:214`; `.shadow-overlay-200`: tooltip only.
- `.shadow-raised-100` (20 uses): propel secondary Button/IconButton, kanban card (`kanban/block.tsx:265`),
  comments, billing toggles, about pages, `ppm-admin/admin-center.tsx:442` — and **one popover**
  (`filters/header/helpers/dropdown.tsx:103`, which also has `[data-popper-placement]`, so ordering the popper rule
  after the neutralising rule restores its shadow).
- Dead-shadow floating surfaces without popper: `ui/dropdowns/context-menu/root.tsx:215` (hook `data-context-menu="true"`),
  propel context-menu `:68` and combobox `:177` (base-ui popups, 2 consumers), extended sidebar flyout
  (`(projects)/extended-sidebar-wrapper.tsx:47` dead `shadow-sm`, has `id={excludedElementId}`).
- Popover text is mostly `text-11`; panel radius mostly `rounded-sm` (4) or `rounded-md` (6); borders
  `border-[0.5px] border-strong` / `border-subtle-1` / `border border-strong-1` + ring.

### 2.9 Icons

- lucide-react 0.469.0 `dist/esm/Icon.js`: `strokeWidth = 2`, `className: mergeClasses("lucide", className)`, attrs
  `viewBox 0 0 24 24, stroke currentColor, stroke-linecap/linejoin round`. 323 files import lucide; 0 use
  `absoluteStrokeWidth`; explicit `strokeWidth=` props ≈ 709 (mostly `2`, many on fill-based Propel icons where they
  do nothing); Tailwind `stroke-[1.5]` ×30, `stroke-2` ×27, `stroke-[2]` ×2, `stroke-1` ×2.
- Propel icons: `packages/propel/src/icons/icon-wrapper.tsx:17-49` (16×16 viewBox, `fill="none"` wrapper) with
  paths `fill={color}` (e.g. `workspace/home-icon.tsx`, `actions/close-icon.tsx`) → outline weight baked at ≈1.25 px.
- Stroke maths: mock icons are 16-unit boxes with `stroke-width="1.5"` rendered at 14-16 px (A-System: «16 px ·
  штрих 1,5 · без подложек»). Equivalent in lucide's 24-unit box: `1.5 × 24 / 16 = 2.25` (1.5 px @16, 1.31 @14,
  1.13 @12, 1.88 @20). Default lucide 2 = 1.33 px @16; the PPM `stroke-[1.5]` class = 1.0 px @16.
- Sizes today: sidebar/project nav 16 ✓, top-bar inbox 20 ✗, help 16 ✓, search 14 ✓, chips 12-14 ✓, IconButton xl 20.

---

## 3. Radii · hairlines · elevation · density policy

### 3.1 Radii (4 chips / 6 controls / 8 cards+popovers / 12 sections+modals)

- Tokens already match: `--radius-sm 4`, `--radius-md 6`, `--radius-lg 8`, `--radius-xl 12`. Keep them; add role
  aliases for documentation and new PPM code: `--ppm-radius-chip: var(--radius-sm)`, `--ppm-radius-control:
  var(--radius-md)`, `--ppm-radius-card: var(--radius-lg)`, `--ppm-radius-section: var(--radius-xl)`, and delete the
  orphaned `--ppm-radius-sm/md/lg` (tokens.css:28-30; `grep` finds no consumer).
- Role mismatches to fix by hook, not token: popovers r4/r6 → 8 (`[data-popper-placement]`), modals r8 → 12
  (dialog panel id / `data-slot`), top-nav search r8 → 6 (PPM file), peek r4 → 12 in modal mode / 0 side-peek.
- `--height-header` 52 px (`h-header`: tabbed project header `[projectId]/layout.tsx:35`, `browse/[workItem]/header.tsx:41`,
  notifications `workspace-notifications/sidebar/root.tsx:65`, Gantt loader) vs `AppHeader` `h-11` 44 px → set
  `--height-header: 2.75rem` (44) for one header height (token-only, low risk; Gantt real header uses JS 48).
- `--padding-page-x/y: 1.35rem` → `1.5rem` (24 px, 4-px grid, mock row padding 0 24px). Token-only; affects every
  `Row`, spreadsheet cells, settings/page wrappers (`px-page-x` in ~36 places) — horizontal only, low risk.

### 3.2 Hairlines

- Dividers are already 1 px `--border-subtle` (row wrapper, headers, sidebar edge). "Hairline" = 1 CSS px of the
  `--border-subtle` role (tokens mapper sets N7 L≈0.34 dark). Controls keep `--border-subtle-1`/`--border-strong`
  (≥ 3:1, token contract test «control borders are >= 3:1»).
- `border-[0.5px]` ×119 (+ side variants ×46) in 76 files = 1 device pixel on 2× screens (thinner than the mock's
  1 px, lower perceived contrast for fields/chips). Option (b): `html[data-ppm-brand="enabled"] .border-\[0\.5px\] { border-width: 1px }`
  (+ `-t/-b/-r/-y` variants). Global, 1 px inner-size change in 20 px chips; decide with H-System.

### 3.3 Elevation (only floating layers)

`--ppm-shadow-popover` / `--ppm-shadow-overlay` must be defined per theme (dark needs far higher alpha; current
Plane shadows are `#292f3d` at 3-10 % alpha — invisible on graphite). Put them in both role blocks of tokens.css
(light :47-115 and dark :118-184) so «both themes declare the same role set» stays green.

### 3.4 Scoped variable trick (states without `!important`)

Utilities read variables at the element (`.bg-layer-transparent-hover{background-color:var(--bg-layer-transparent-hover)}`).
On a hooked element, re-point the variable instead of overriding the class:
`[data-ppm-nav-item][data-active] { --bg-layer-transparent-active: var(--ppm-nav-active-bg); }` changes what the
upstream `!bg-layer-transparent-active` paints, with no specificity/`!important` fight.

### 3.5 Density hooks consumed by the shell (owned by the tokens/density mapper)

Shell needs: `--ppm-row-height` (36/32), `--ppm-row-pad-y` (8/6), `--ppm-sidebar-item-height` (32/28 proposed; A mock
28), `--ppm-font-size-body` (14/13), `--ppm-topbar-height` (44 both). Suggested switch: `data-ppm-density="compact"`
on `<html>` (`root.tsx` already has `suppressHydrationWarning`), default comfortable when absent; UI toggle next to
`ThemeSwitcher` in `settings/profile/content/pages/preferences/default-list.tsx:14-20`.
Caveat: `--text-body-*` tokens are declared on `:root` as `var(--text-13)`, so remapping `--text-13` only works on
`html` itself and reflows the whole app (fixed widths like `max-w-[145px]`, `w-48` panels). Prefer role tokens applied
by the shell hooks over a global `--text-13` remap in wave 1.

---

## 4. Layered implementation plan with concrete minimal diffs

### 4.1 Layer (a) — tokens only (`packages/ppm-brand/src/tokens.css`)

```css
/* in the constants block (tokens.css:17-44), [data-ppm-brand="enabled"] */
-    --ppm-radius-sm: 0.375rem;
-    --ppm-radius-md: 0.5rem;
-    --ppm-radius-lg: 0.75rem;
+    --ppm-radius-chip: var(--radius-sm);      /* 4  */
+    --ppm-radius-control: var(--radius-md);   /* 6  */
+    --ppm-radius-card: var(--radius-lg);      /* 8  cards, popovers */
+    --ppm-radius-section: var(--radius-xl);   /* 12 sections, modals */
+    --ppm-icon-stroke: 2.25;                  /* lucide 24-unit grid: 1.5 px at 16 px */
+    --ppm-topbar-height: 2.75rem;             /* 44 px */
+    --ppm-row-height: 2.25rem;                /* 36 «Удобная»; density mapper owns the compact override */
+    --ppm-row-pad-y: 0.5rem;
+    --ppm-sidebar-item-height: 2rem;
+    /* Plane layout tokens (declared in @theme on :root; @layer base wins over @layer theme) */
+    --height-header: 2.75rem;                 /* was 3.25rem */
+    --padding-page-x: 1.5rem;                 /* was 1.35rem */
+    --padding-page-y: 1.5rem;
```
Note: the constants block selector is `[data-ppm-brand="enabled"]` (html only in practice). Add
`--ppm-shadow-popover` / `--ppm-shadow-overlay` to both theme role blocks (values from H-System; must be visible on
dark graphite, e.g. multi-layer black at 35-55 %).

Risk: low. `--padding-page-x` widens every row/header by 2.4 px per side; `--height-header` shrinks 4 rarely-seen
rows by 8 px.

### 4.2 Layer (b) — new gated stylesheet `packages/ppm-brand/src/shell.css`

Wiring (4 small edits): `packages/ppm-brand/package.json` exports `"./shell.css": "./src/shell.css"`;
`packages/ppm-brand/tsdown.config.ts` `customExports` same line; `apps/web/styles/globals.css` add
`@import "@ppm/brand/shell.css";` right after line 2; add the file to `customCssFiles` in
`packages/ppm-brand/scripts/audit-tailwind-classes.mjs:25-32` (only matters if it ever defines classes).
Alternative: append the same block to tokens.css (no wiring, but mixes component overrides into the token SSOT).

```css
/* PPM shell (wave 1). Everything is gated by html[data-ppm-brand="enabled"]; brand off = upstream. */
@layer utilities {
  /* Icons: lucide stroke 1.5 px at 16 px (beats stroke-* utilities and strokeWidth attributes). */
  html[data-ppm-brand="enabled"] svg.lucide {
    stroke-width: var(--ppm-icon-stroke, 2.25);
  }

  /* Elevation: resting controls and cards are flat. Two separate rules on purpose: inside one :is() the
     :hover argument would lift BOTH to (0,3,1) and beat the popper rule below regardless of order. */
  html[data-ppm-brand="enabled"] .shadow-raised-100 {
    --tw-shadow: 0 0 #0000; /* (0,2,1) */
  }
  html[data-ppm-brand="enabled"] .hover\:shadow-raised-200:hover {
    --tw-shadow: 0 0 #0000; /* card hover lift (ui/propel Card WITH_SHADOW, project card) */
  }
  /* Floating layers share one elevation token. */
  html[data-ppm-brand="enabled"] :is(.shadow-raised-200, .shadow-overlay-100, .shadow-overlay-200) {
    --tw-shadow: var(--ppm-shadow-popover, 0 0 #0000);
  }
  /* Every react-popper surface (CustomMenu/Select/SearchSelect, property dropdowns, ui Popover …). Same specificity
     (0,2,1) as the .shadow-raised-100 rule, so it must stay AFTER it: filters/header/helpers/dropdown.tsx:103 has
     both shadow-raised-100 and [data-popper-placement] and must keep its shadow. */
  html[data-ppm-brand="enabled"] :is([data-popper-placement], [data-context-menu="true"]) {
    border-radius: var(--ppm-radius-card, 0.5rem);
    --tw-shadow: var(--ppm-shadow-popover, 0 0 #0000);
    box-shadow:
      var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000),
      var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  }
  /* Modals: headless ModalCore (54 consumers), power-k, switch-account; propel Dialog. */
  html[data-ppm-brand="enabled"] :is([id^="headlessui-dialog-panel-"], [data-slot="dialog-content"]) {
    border-radius: var(--ppm-radius-section, 0.75rem);
    --tw-shadow: var(--ppm-shadow-overlay, 0 0 #0000);
    box-shadow:
      var(--tw-inset-shadow, 0 0 #0000), var(--tw-inset-ring-shadow, 0 0 #0000),
      var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
  }

  /* Sidebar project rows (projects list, favorites, extended sidebar) — class hook is sidebar-only. */
  html[data-ppm-brand="enabled"] .group\/project-item {
    min-height: var(--ppm-sidebar-item-height);
    padding-block: 0;
  }

  /* Hooks added in layer (c) — inert until the attributes exist. */
  html[data-ppm-brand="enabled"] [data-ppm-nav-item] {
    min-height: var(--ppm-sidebar-item-height);
    padding-block: 0;
  }
  html[data-ppm-brand="enabled"] [data-ppm-nav-item][data-active] {
    --bg-layer-transparent-active: var(--ppm-nav-active-bg, var(--bg-layer-1-selected));
  }
  html[data-ppm-brand="enabled"] :is([data-ppm-row="issue"], [data-ppm-row="placeholder"]) {
    min-height: var(--ppm-row-height);
    padding-block: var(--ppm-row-pad-y);
  }
  html[data-ppm-brand="enabled"] [data-ppm-row="placeholder"] {
    height: var(--ppm-row-height);
  }
  html[data-ppm-brand="enabled"] [data-ppm-row="issue"][data-peeked] {
    --bg-layer-transparent: var(--ppm-row-selected-bg, var(--bg-layer-1-selected));
    box-shadow: inset 2px 0 0 var(--border-accent-strong);
  }
  html[data-ppm-brand="enabled"] [data-ppm-row="group-header"] {
    min-height: var(--ppm-row-height);
    padding-block: 0;
  }
  html[data-ppm-brand="enabled"] [data-ppm-surface="peek"][data-peek-mode="modal"] {
    border-radius: var(--ppm-radius-section);
  }
}
```
Checks before shipping (b):
- The `[data-peeked]` rule sets `box-shadow` on the row; the row is not focusable (focus ring is on the parent
  `ControlLink <a>`), so the wave-0 ring composition is not overwritten.
- Verified: `.bg-layer-transparent { background-color: var(--bg-layer-transparent); }` and
  `.\!bg-layer-transparent-active { background-color: var(--bg-layer-transparent-active) !important; }` read the
  variable on the element, so the scoped re-pointing works for the row and for the `!`-important sidebar state.
  Peeked + hover shows the hover overlay (`--bg-layer-transparent-hover`); re-point it too if the design wants the
  selected fill to persist on hover.
- Specificity map of the block: lucide (0,2,2); neutralise/popover/modal/nav/row/placeholder rules (0,2,1);
  `[data-ppm-nav-item][data-active]`, `[data-ppm-row="issue"][data-peeked]`, `.hover\:shadow-raised-200:hover` and the
  peek-mode rule (0,3,1). All beat single utilities (0,1,0) and hover/focus variants (0,2,0); none uses `!important`.
  Wave-0 focus ring (tokens.css:280-302) is (0,2,1) in the same layer and composes `--tw-shadow`, so popover and
  button shadows survive focus.
- Power-K panel (`power-k/ui/modal/wrapper.tsx:151`, wave-0 `styles/power-k.css` is `@layer components`, no radius/shadow) gets r12 + overlay shadow — acceptable, verify visually.
- Add `packages/ppm-brand/src/__tests__/shell-contract.test.ts`: every rule selector in shell.css starts with
  `html[data-ppm-brand="enabled"]` or `html[data-ppm-shell="enabled"]`; no `!important`; rules live inside `@layer`.

Risk: low-medium (global reach, but pure paint; brand off = untouched). Largest visual change: every popover gains a
shadow and 8 px radius; every lucide icon gets heavier/lighter by ≤ 0.5 px.

### 4.3 Layer (c) — minimal component edits (ordered by value/risk)

| # | File (ownership) | Edit | Gate | Risk |
|---|---|---|---|---|
| C1 | `workspace/content-wrapper.tsx:31-35` (upstream) | import `isPpmShellEnabled` from `@ppm/brand`, `const isPpmShell = isPpmShellEnabled(process.env.PPM_SHELL_ENABLED, process.env.PPM_BRAND_ENABLED)`, add `"p-0": isPpmShell` to the `cn()` object (`@plane/utils` `cn` = tailwind-merge, `packages/utils/src/common.ts:46,69`; a later `p-0` drops `pr-2 pb-2 pl-2`) | shell | low (layout) |
| C1 | `(projects)/layout.tsx:18`, `(settings)/layout.tsx:16`, `settings/profile/layout.tsx:19` (upstream) | `cn("…rounded-lg border border-subtle", { "rounded-none border-0": isPpmShell })` | shell | low; add a source-regex test like `top-navigation-gating.test.ts` pinning the upstream strings |
| C2 | `navigation/top-navigation-root.tsx:57-60` (PPM) | add key `"min-h-11 border-b border-subtle": isPpmShell,` (keep `"min-w-0 gap-1": isPpmShell` literal for the test); `:101` `className={isPpmShell ? "size-4" : "size-5"}` | shell | low |
| C2 | `workspace/sidebar/workspace-menu-root.tsx:159` (PPM) | `"top-10 left-4": variant === "top-navigation" && !isPpmShell, "top-11 left-4": variant === "top-navigation" && isPpmShell`; optional `:133` logo `size-6`, `:135` `text-13` under shell | shell | low (coupled to C2) |
| C2 | `navigation/top-nav-power-k.tsx:228` (PPM, audited) | shell branch `rounded-md` instead of `rounded-lg`; add `{IS_PPM_SHELL_ENABLED && !searchTerm && <kbd …>{formatShortcutForDisplay("cmd+k")}</kbd>}` before the clear button; optional width 320 | shell | low; classes must compile (audit) |
| C2 | `workspace/sidebar/help-section/root.tsx:46` (PPM) | shell branch `h-7 … bg-transparent … text-12` (ghost, 28 px) | shell | low |
| C3 | `workspace/sidebar/project-navigation.tsx:116-151` (PPM) + `packages/ppm-brand/src/index.ts` (+2 keys ×2 locales) | filter visible items first, then render a group label when `isPpmShell && item.ppmSection !== prev.ppmSection && SECTION_LABELS[item.ppmSection]` (work → `navigation.section_work` «Работа»/"Work", knowledge → `navigation.section_knowledge` «Знания»/"Knowledge"); wrap each labelled run in `role="group" aria-labelledby`; `:141` label `isPpmShell ? "text-13" : "text-11 font-medium"` (or a density role class `text-[length:var(--ppm-font-size-body)]`, which compiles); the global lucide rule (0,2,2) already overrides `:138` `stroke-[1.5]`, so that class can stay (Intake is a Propel stroke icon with its own `strokeWidth="1.25"`, not `.lucide`) | shell | low; keep `buildProjectNavigationItems` untouched so `project-navigation-items.test.ts` stays green; add a render test for headers |
| C4 | `sidebar/sidebar-navigation.tsx:18-27` (upstream, 31 lines) | add `data-ppm-nav-item="" data-active={isActive ? "" : undefined}` to the div | none needed (inert attrs) | very low |
| C5 | `sidebar/sidebar-wrapper.tsx:61-62` (PPM) | shell: PPM mark + name instead of `text-16` title (extend `ppm-shell/product-logo.tsx` with a `size="sm"` variant); keep `title` prop so `:64` still shows the customize button | shell | low |
| C6 | `issue-layouts/list/block.tsx:179-181` (upstream) | `<Row data-ppm-row="issue" data-peeked={getIsIssuePeeked(issue.id) && peekIssue?.nestingLevel === nestingLevel ? "" : undefined} data-active={isIssueActive ? "" : undefined} …>`; optional `data-ppm-row-title` on `:280` `<p>` for density font size | none (inert) | low; `Row` spreads `...rest` (`ui/src/row/row.tsx:19-26`) |
| C6 | `ui/loader/layouts/list-layout-loader.tsx:24-30` (upstream) | `data-ppm-row={renderForPlaceHolder ? "placeholder" : undefined}` | none | very low; **must ship with the row change** (scroll jump otherwise) |
| C6 | `issue-layouts/list/list-group.tsx:266` (upstream) | `data-ppm-row="group-header"` on the group `Row` | none | very low |
| C7 | `peek-overview/view.tsx:140-145` (upstream) | `style={{ boxShadow: "var(--ppm-shadow-overlay, 0px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 6px 12px 0px rgba(16, 24, 40, 0.12), 0px 1px 16px 0px rgba(16, 24, 40, 0.12))" }}` + `data-ppm-surface="peek" data-peek-mode={peekMode}` | none (fallback = upstream) | very low |
| C8 | `dropdowns/buttons.tsx:81-145` (upstream; wave-0 deferred item) | replace inner Propel `<Button …>` with `<span className={cn(getButtonStyling("ghost", "sm"), "…same classes…")}>` in the 3 variants — removes `<button>` in `<button>` | none (a11y fix, same look) | low-medium: verify tooltip still opens on hover/focus (base-ui `Tooltip.Trigger render={span}`), check consumers passing `buttonClassName` |
| C9 | `app/root.tsx:111` (PPM) | `defaultTheme="system"` (brief: «по настройке системы») | brand | low; pre-login only |
| C10 (opt.) | `propel/src/button/button.tsx:29-35`, `icon-button/icon-button.tsx:29-35` | `data-slot="button" data-variant={variant} data-size={size}` (propel convention) for future per-role styling instead of global class hooks | none | very low |

Diff sketches (exact enough to plan; line numbers as of this tree):

```diff
# C2 core/components/navigation/top-navigation-root.tsx:56-61, :101
       className={cn("z-[27] flex min-h-10 w-full items-center bg-canvas px-3.5 transition-all duration-300", {
         "min-w-0 gap-1": isPpmShell,
+        "min-h-11 border-b border-subtle": isPpmShell,
         "px-2": !showLabel,
       })}
-                    <InboxIcon className="size-5" />
+                    <InboxIcon className={isPpmShell ? "size-4" : "size-5"} />

# C2 core/components/workspace/sidebar/workspace-menu-root.tsx:157-160
-                      "top-10 left-4": variant === "top-navigation",
+                      "top-10 left-4": variant === "top-navigation" && !isPpmShell,
+                      "top-11 left-4": variant === "top-navigation" && isPpmShell,
```

```tsx
// C3 core/components/workspace/sidebar/project-navigation.tsx (replaces the map at :118-150; keeps markup per item)
const SECTION_LABEL_KEYS: Partial<Record<TPpmNavigationSection, TPpmTranslationKey>> = {
  work: "navigation.section_work",
  knowledge: "navigation.section_knowledge",
};
const visibleItems = navigationItemsMemo.filter(
  (item) => item.shouldRender && allowPermissions(item.access, EUserPermissionsLevel.PROJECT, workspaceSlug, project.id)
);
// render: for index i, if isPpmShell && item.ppmSection && item.ppmSection !== visibleItems[i - 1]?.ppmSection
//   && SECTION_LABEL_KEYS[item.ppmSection] → emit
//   <p id={`${project.id}-nav-${item.ppmSection}`} className="px-2 pt-2 pb-1 text-12 font-medium text-tertiary">…</p>
// (or wrap the run in <div role="group" aria-labelledby=…>). Shell off → identical flat list (same filter semantics:
// upstream `return;`/`return null` skip == filter).
// packages/ppm-brand/src/index.ts: en "navigation.section_work": "Work", "navigation.section_knowledge": "Knowledge";
//                                  ru "navigation.section_work": "Работа", "navigation.section_knowledge": "Знания".
```

```diff
# C6 core/components/issues/issue-layouts/list/block.tsx:179-181
       <Row
         ref={issueRef}
+        data-ppm-row="issue"
+        data-peeked={getIsIssuePeeked(issue.id) && peekIssue?.nestingLevel === nestingLevel ? "" : undefined}
+        data-active={isIssueActive ? "" : undefined}
         className={cn(

# C6 core/components/ui/loader/layouts/list-layout-loader.tsx:24-26
     <Row
       ref={ref}
+      data-ppm-row={renderForPlaceHolder ? "placeholder" : undefined}
       className={cn("flex h-11 items-center justify-between py-3", {

# C7 core/components/issues/peek-overview/view.tsx:140-145
           ref={issuePeekOverviewRef}
+          data-ppm-surface="peek"
+          data-peek-mode={peekMode}
           className={peekOverviewIssueClassName}
           style={{
             boxShadow:
-              "0px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 6px 12px 0px rgba(16, 24, 40, 0.12), 0px 1px 16px 0px rgba(16, 24, 40, 0.12)",
+              "var(--ppm-shadow-overlay, 0px 4px 8px 0px rgba(0, 0, 0, 0.12), 0px 6px 12px 0px rgba(16, 24, 40, 0.12), 0px 1px 16px 0px rgba(16, 24, 40, 0.12))",
           }}

# C8 core/components/dropdowns/buttons.tsx:81-93 (same for :109-118 and :134-145)
-      <Button
-        variant="ghost"
-        size="sm"
-        className={cn(
+      <span
+        className={cn(
+          getButtonStyling("ghost", "sm"),
           "flex h-full w-full items-center justify-start gap-1.5 border-[0.5px] border-strong",
           { "bg-layer-transparent-active": isActive },
           className
         )}
       >
         {children}
-      </Button>
+      </span>
```

Explicit non-goals / do-not:
- do not change `--spacing`, `--radius-sm/md/lg/xl`, or remap `--text-13` globally in this wave;
- do not target `.group\/list-block`, `.group\/list-header`, `.h-11.py-3`, or other class-combination selectors;
- do not use `shadow-sm/md/lg` (dead; tailwind audit fails them in PPM files);
- do not write unlayered overrides for interactive elements (they defeat hover/focus variants);
- do not set `--tw-shadow-color` on ancestors (registered `inherits: false`);
- do not replace Propel filled icons in wave 1 (411 importers).

### 4.4 Tests / commands

Baseline (run 2026-09-24 21:24, read-only):
- `cd apps/web && ./node_modules/.bin/vitest run tests/navigation tests/ppm-a11y` → 7 files / 25 tests pass
  (full `apps/web` suite was 184/184 at wave-0 sign-off per CHANGELOG).
- `cd packages/ppm-brand && ./node_modules/.bin/vitest run` → 3 files / 41 tests pass;
  `node scripts/audit-tailwind-classes.mjs` → passes (30 files, warnings only for `ppm-canvas-node__*` custom classes).
- Wave-0 gates to repeat: `apps/web` `tsc` 0 errors (`pnpm --filter web check:types`), `oxlint` 719 warnings / 0 errors
  (`check:lint`), `oxfmt --check`, `packages/propel` + `packages/ui` `tsc` 0 errors, `node scripts/audit-user-facing-brand.mjs`,
  root `npm test` 653/653 (M0.6 guard).
New/updated tests to plan:
- `packages/ppm-brand/src/__tests__/shell-contract.test.ts` (gating/no-important/layer, §4.2);
- token contract: role parity with new `--ppm-shadow-*` in both theme blocks (existing test covers it automatically);
- `apps/web/tests/navigation/top-navigation-gating.test.ts`: extend with the new `"min-h-11 border-b border-subtle": isPpmShell` key;
- new source-regex test for C1 files (upstream strings kept when shell off), in the style of `top-navigation-gating.test.ts`;
- `project-navigation` render test (grouped headers, only when shell on; flat when off);
- `brand.test.ts`: `getPpmTranslation("ru", "navigation.section_work") === "Работа"`, `…section_knowledge === "Знания"`;
- add `top-navigation-root.tsx` (and C3/C5 files if not already) to `extraFiles` of the tailwind audit so shell-branch classes are checked;
- `tests/ppm-a11y`: no nested `<button>` in `DropdownButton` markup (C8).

---

## 5. Risks

1. Global paint rules (lucide stroke, popover shadow/radius) touch every screen incl. editor and canvas lucide icons;
   visual review in both themes needed. Brand off is untouched by construction.
2. Row height change without the placeholder hook → desktop scroll jumps (placeholders stay 44 px).
3. Styling shared classes (`group/list-block`, `group/list-header`) → Gantt misalignment (JS 44/48 px).
4. Header height change without moving the fixed workspace dropdown (`top-10`) → menu overlaps the bar by 4 px.
   C1 (frame removal) and C2 (top-bar `border-b`) must land together: the frame has no top padding, so with only C2
   the bar's bottom border and the frame's top border stack into a 2 px line; with only C1 the bar loses its separator.
5. Frame removal edits 3-4 upstream files (merge surface on Plane upgrades); keep them one-line and gated.
6. Remapping `--text-13` for density reflows the whole app (fixed widths, 11 px menus) — keep density to shell hooks
   in wave 1.
7. `[id^="headlessui-dialog-panel-"]` depends on Headless UI 1.7.19 id format; pin with a test or switch to a
   `data-ppm-surface="modal"` attribute in `modal-core.tsx:58` (1 line).
8. `[data-popper-placement]` appears one frame after mount (no shadow on the first frame) — cosmetic.
9. Tooltip behaviour after C8 must be re-checked (trigger element changes from `<button>` to `<span>`).
10. Propel filled icons (≈1.25 px) next to lucide at 1.5 px — slight weight mismatch in mixed lists (project nav mixes both).

## 6. Open questions for the owner / H-System

1. Exact density numbers for sidebar items (A mock 28; proposal 32/28) and whether the top bar changes with density.
2. Popover radius 8 vs keeping the 12 px workspace dropdown; modal radius 12?
3. Hairline policy: normalise `border-[0.5px]` to 1 px under brand, or keep device-pixel hairlines?
4. Sidebar/top bar background role: mock uses the darker «Фон приложения» for both and a lighter surface for main;
   today top bar = `--bg-canvas`, sidebar and main = `--bg-surface-1`.
5. Should the sidebar «Новая задача» become primary with a shortcut hint, and which hint (real shortcut is `N I` / `Т Ш`)?
6. Wordmark in the sidebar header (mark + «PPM») vs top-bar-left mark as in the mock.
