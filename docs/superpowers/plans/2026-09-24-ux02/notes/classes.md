# UX0.2 section B: map of missing Tailwind classes, the CI check and @bprogress

Mapping only. Nothing in `/Users/ermolov/Desktop/PPM` or `plane-fork` was changed. The current working tree was used as the source of truth.
Scratch dir: `/private/tmp/claude-501/-Users-ermolov-Desktop-PPM/da551bb3-42de-49fa-bc48-91a4cdc0c4a8/scratchpad/ux02/map/`

Artifacts in that dir (my files):
- `audit-classes.mjs`: exploration audit. Flags: `--scope=ppm|extended|all`, `--entry=ci`, `--no-build`, `--json`, `--out`.
- `missing-ppm.txt`, `missing-extended.txt`, `missing-all.txt`, `missing-all-byfile.txt`: reports.
- `ppm.json`, `extended.json`, `all.json`, `ci-*.json`: raw per-occurrence results.
- `missing-lines.txt`: the source line for every missing occurrence.
- `vocabulary.txt` and `vocab.mjs`: the allowed utility vocabulary, taken from Tailwind's `getClassList()`.
- `probe.mjs`: checks any class, for example `node probe.mjs bg-danger-subtle text-15`.
- `contrast-pairs.mjs` and `contrast-pairs.txt`: WCAG contrast of the proposed replacement token pairs.
- `proposed-audit-tailwind-classes.mjs`: a drop-in CI script for `packages/ppm-brand/scripts/`. `proposed-run.txt` is its output on the current tree.

Path correction: the card and task point to `apps/web/app/globals.css`. The file is actually
`plane-fork/apps/web/styles/globals.css`. It is linked from `apps/web/app/root.tsx:24` via `@/styles/globals.css?url`.

---

## 1. Mechanism

### How it works

`plane-fork/packages/tailwind-config/variables.css` has three `@theme` blocks (Tailwind 4.1.17, pinned in `pnpm-workspace.yaml:176`).

| line | declaration | effect |
|---|---|---|
| 693 | `--color-*: initial;` | Clears the whole default palette (slate…rose × 50…950). Lines 694–695 re-add only `--color-white` and `--color-black`. `--color-label-{indigo,emerald,grey,crimson,yellow}-*` come back via `@theme inline` (lines 928–962). |
| 697 | `--radius-4xl: initial;` | `rounded-4xl` is gone. Other radii remain. |
| 699/706/708 | `--border-width-*`, `--outline-width-*`, `--ring-width-*: initial` | Only the named `sm/md/lg/xl` are re-added. Bare numbers such as `border-2`, `ring-1` and `outline-2` still work because they are bare-value utilities. |
| 710 | `--shadow-*: initial;` | `shadow`, `shadow-2xs/xs/sm/md/lg/xl/2xl` are gone. Re-added: `raised-100/200/300`, `overlay-100/200`, `direction-left/right` (lines 711–717, all `#292f3d` at 3–10% alpha). |
| 981 | `--font-*: initial;` | `font-sans/serif/mono` are gone. Re-added: `font-heading`, `font-body`, `font-code`. Tailwind's `ignoredThemeKeyMap` protects `--font-weight`. |
| 992 | `--font-weight-*: initial;` | Not listed in the card. `font-thin/extralight/normal/extrabold/black` are gone. Re-added: `light/regular/medium/semibold/bold/heavy`. |
| 1001 | `--text-*: initial;` | `text-xs/sm/base/lg/xl/2xl…9xl` are gone. Re-added: `text-9 10 11 12 13 14 16 18 20 24 28 32 40`, plus `text-h{1..6}-{regular,medium,semibold,bold}`, `text-body-{md,sm,xs}-{…}` and `text-caption-{md,sm,xs}-{…}`. There is no 15 and no bare `text-caption-md`. Color keys survive: Tailwind's `ignoredThemeKeyMap` for `--text` spares `--text-color`, `--text-shadow` and the rest. I verified this in `node_modules/.pnpm/tailwindcss@4.1.17/.../dist/chunk-MEY3PWYT.mjs`. |
| 1017 | `--tracking-*: initial;` | `tracking-tighter/normal/wider/widest` are gone. Re-added: `extra-tight` (-0.025rem), `tight` (-0.05rem), `default` (0), `wide` (0.05rem). Arbitrary `tracking-[0.12em]` still works. |

Why the semantic classes still exist: in Tailwind v4 each color utility looks up its own namespace first and `--color-*` second.
- `bg-*` and gradients `from/via/to-*` use `--background-color-*`.
- `text-*` uses `--text-color-*`.
- `border-*` and `divide-*` use `--border-color-*`.
- `outline-*` uses `--outline-color-*`, and `ring-*` uses `--ring-color-*`.
- `fill-*` uses `--fill-*`, and `stroke-*` uses `--stroke-*`.

The `@theme inline` block (`variables.css:727–976`) fills exactly those namespaces from the runtime vars `--bg-*`, `--txt-*` and `--border-*`. Utilities without a semantic namespace, namely `ring-offset-*`, `caret-*`, `accent-*`, `decoration-*` and `placeholder-*`, only have `white`, `black` and `label-*`. For example, `placeholder-text-placeholder` is dead, while the variant form `placeholder:text-placeholder` works.

Accent gotcha: `bg-accent-primary` and `text-accent-primary` exist, but there is **no `border-accent-primary`, `outline-accent-primary` or `ring-accent-primary`**. The border, outline and ring namespaces only have `accent-strong` and `accent-subtle` (`variables.css:798–799, 813–814, 828–829`).

### Allowed vocabulary

The full list is in `vocabulary.txt`. Everything below was verified with `probe.mjs` against the real design system.

- **Background:** `bg-canvas`, `bg-surface-1/2`, `bg-layer-{1,2,3}[-hover|-active|-selected]`, `bg-layer-transparent[-…]`, `bg-layer-disabled`, `bg-accent-primary[-hover|-active]`, `bg-accent-subtle[-hover|-active]`, `bg-success-primary`, `bg-success-subtle[-1]`, `bg-warning-primary`, `bg-warning-subtle`, `bg-danger-primary[-hover|-active|-selected]`, `bg-danger-subtle[-hover|-active|-selected]`, `bg-danger-transparent[-…]`, `bg-backdrop`, `bg-inverse`, `bg-white`, `bg-black`, `bg-current`, `bg-transparent`, `bg-label-*-*`. Opacity modifiers work on all of them, for example `bg-danger-subtle/50` or `bg-accent-primary/15`.
- **Text color:** `text-primary`, `text-secondary`, `text-tertiary`, `text-placeholder`, `text-disabled`, `text-accent-primary/secondary`, `text-on-color[-disabled]`, `text-inverse`, `text-{success,warning,danger}-{primary,secondary}`, `text-icon-{primary,secondary,tertiary,placeholder,disabled,inverse,on-color,…}`, `text-icon-{accent,success,warning,danger}-{primary,secondary}`, `text-icon-danger`, `text-link-primary[-hover]`, `text-link-secondary`, `text-priority-*`, `text-label-*-*`, `text-white`, `text-black`, `text-current`.
- **Border:** `border-subtle[-1]`, `border-strong[-1]`, `border-inverse`, `border-disabled`, `border-accent-{strong,subtle}`, `border-{success,warning,danger}-{strong,subtle}`, `border-priority-*`, `border-label-*`, `border-white/black/current/transparent`. Widths: `border`, `border-2`, `border-sm/md/lg/xl`.
- **Outline and ring:** `{outline,ring}-{subtle,subtle-1,strong,strong-1,inverse,disabled}`, `{outline,ring}-accent-{strong,subtle}`, `{outline,ring}-{success,warning,danger}-{strong,subtle}`.
- **Fill and stroke:** `fill-/stroke-{primary,secondary,tertiary,placeholder,disabled,accent-primary,…,success-primary,…}`. Avoid `fill-success`, `fill-warning`, `fill-danger` and the matching `stroke-*`: they compile to `var(--text-color-success)`, which is undefined, so they are silently transparent.
- **Shadow:** `shadow-raised-100/200/300`, `shadow-overlay-100/200`, `shadow-direction-left/right`, `shadow-none`, plus colors such as `shadow-black/20`. `drop-shadow-*`, `inset-shadow-*` and `text-shadow-*` keep the Tailwind defaults because they use other namespaces.
- **Font family:** `font-heading`, `font-body`, `font-code`. With PPM on, `font-code` = `--ppm-font-mono` (JetBrains Mono Variable) via `ppm-brand/src/tokens.css:36`. With PPM off, it is IBM Plex Mono (`variables.css:988`).
- **Font weight:** `font-light`, `font-regular`, `font-medium`, `font-semibold`, `font-bold`, `font-heavy`. **`font-normal` does not exist.**
- **Font size:** `text-9 10 11 12 13 14 16 18 20 24 28 32 40`, plus the semantic `text-h1..h6-*`, `text-body-{md,sm,xs}-*` and `text-caption-{md,sm,xs}-*`. Semantic sizes: h1 32, h2 28, h3 24, h4 20, h5 18, h6 16. Arbitrary `text-[15px]` also compiles.
- **Tracking:** `tracking-extra-tight`, `tracking-tight`, `tracking-default`, `tracking-wide`, or arbitrary values. The PPM eyebrow convention is `tracking-[0.12em]` (4 uses).
- Unchanged: radius (except `4xl`), spacing, numeric `leading-N` and named `leading-*`, and `z-N`.

---

## 2. Audit: every class token in PPM sources vs. what Tailwind generates

### Method (`audit-classes.mjs`)

1. **Resolution.** `__unstable__loadDesignSystem(globals.css, {base: apps/web/styles})` from `@tailwindcss/node@4.1.17`, resolved through `apps/web → @tailwindcss/postcss`. This is the exact theme the build uses. A token counts as OK when `ds.candidatesToCss([token])` is non-null.
2. **Cross-check.** Every `.class` selector in the built CSS `apps/web/build/client/assets/*.css`:
   - `globals-DZa7ZJYQ.css` (245,004 B)
   - `editor-C_0bWknX.css`
   - `root-C4QmZ0gw.css`
   - `AppProgressBar-D_Zs2VgL.css`

   All four were built at **2026-09-24 00:11 MSK**, 11 minutes before the audit. `find … -newer globals-DZa7ZJYQ.css` over `ppm-*` returns nothing, so the build is fresh for this scope.
3. **Extraction.** TypeScript AST. Strings are collected from `className`/`*ClassName`/`class` JSX attributes; from `cn/clsx/cx/twMerge/cva` calls; from variables and properties named `*Class*` or `*Tone*`; and from template literals, where boundary tokens are flagged DYNAMIC. A "loose" pass also catches class-shaped strings elsewhere, such as the tone map at `ppm-git/route.tsx:765–767`. Strings in type positions and in `===` comparisons are skipped.
4. **Classification.**
   - **MISSING:** the Tailwind root or variant is known, but the value is not in the theme (`parseCandidate` ≠ ∅, `candidatesToCss` = null).
   - **ok-custom-css:** a plain CSS class from `canvas.css`, `styles/*.css`, tailwind-config, tokens.css, tldraw.css or the build.
   - **UNKNOWN:** neither of the above.

**Validation.** For the ppm and extended scopes there were zero "valid but not in build" tokens and zero "missing but present in build" tokens. The design system and the built CSS agree completely. The CI-style run (`--entry=ci --no-build`, with the dist-only imports stripped) gives the same verdicts: 0 differences on ppm and extended, and 8 differences on `all`, all of them upstream plain CSS classes. The whole run takes about 0.4 s.

### Results

| scope | files | class-token occurrences | MISSING occurrences (unique) |
|---|---|---|---|
| `ppm`: `core/components/ppm-*` + `app/**/ppm-*` (22 files) | 22 | 3054 | **84 (33)** |
| `extended`: + about pages, project-wrapper, sidebar/project-navigation | 31 | 3252 | **90 (34)** |
| PPM-added lines in upstream nav files (see below) | | | +6 |
| `all`: whole `apps/web` (1416 files) | 1416 | 33463 | 215 (93); about 130 in 69 upstream files are Plane's own |

Per file (ppm scope):

| file | MISSING |
|---|---|
| `ppm-git/route.tsx` | 54 |
| `ppm-vault/route.tsx` | 19 |
| `ppm-admin/admin-center.tsx` | 5 |
| `ppm-shell/project-feature-page.tsx` | 4 |
| `app/(home)/about/ppm-guide/page.tsx` | 2 |
| `ppm-canvas/*` | **0** |

The Canvas uses its own `canvas.css`.

Missing classes that PPM added to upstream files, checked with `git diff 5f7d92784c` (the v1.4.2 base):
- `core/components/navigation/tab-navigation-overflow-menu.tsx`, lines 41, 67, 81, 102: `focus-visible:outline-accent-primary`.
- `core/components/navigation/tab-navigation-visible-item.tsx:56`: `focus-visible:outline-accent-primary`. **A test asserts this dead class** at `apps/web/tests/navigation/navigation-accessibility.test.tsx:166`: `expect(markup).toContain("focus-visible:outline-accent-primary")`.
- `core/components/navigation/top-nav-power-k.tsx:255`: `focus-visible:outline-accent-primary`. The same file also has two **upstream** dead classes: `:248 placeholder-text-placeholder` and `:264 shadow-lg`.
- `core/components/workspace/sidebar/project-navigation.tsx:132`: `focus-visible:outline-accent-primary`.
- `core/layouts/auth-layout/project-wrapper.tsx:172`: `border-accent-primary/30`.
- `app/(home)/about/brand-foundation/page.tsx:25–26` and `app/(home)/about/open-source/page.tsx:44,47`: `tracking-widest` and `text-3xl`.
- `onboarding/steps/role/root.tsx:149 border-blue-500` and `onboarding/steps/team/root.tsx:231 bg-onboarding-background-400/40` are upstream classes that PPM only re-formatted. They are not PPM's.

Informational (UNKNOWN, not Tailwind): the Canvas uses BEM hook classes that **have no CSS rule** anywhere.

| class | lines |
|---|---|
| `ppm-canvas-node__content--vault` | `shape.tsx:266, 1305, 2210` |
| `ppm-canvas-node__vault-title` | `shape.tsx:268, 1310, 2214` |
| `ppm-canvas-node__vault-meta` | `shape.tsx:269, 1311, 1315, 2216` |
| `ppm-canvas-node__vault-link` | `shape.tsx:273, 1322, 2224` |
| `ppm-agent-node--search` | `shape.tsx:289` |
| `ppm-agent-node--query` | `shape.tsx:459` |
| `ppm-agent-node--answer` | `shape.tsx:481` |
| `ppm-agent-node__answer` | `shape.tsx:335, 484` |
| `ppm-work-item-card__remove` | `shape.tsx:1338` |
| `ppm-board-link-picker` | `editor.tsx:2841` |

These are for section C to decide. They are unstyled hooks, not broken utilities. There is also one DYNAMIC token: `shape.tsx:238` builds `ppm-canvas-node--${…}`, and its CSS variants exist at `canvas.css:3199–3239`.

---

## 3. Replacements (exact, grouped by file; line numbers as of 2026-09-24 00:30)

Principles:
1. Use Plane's semantic tokens (theme-aware: the dark theme inverts the `--red/green/amber-*` ramps at `variables.css:400–648`).
2. Text uses the `*-primary` tokens (≥ 6.5:1 in both themes, see the table below).
3. Keep every class as a **static full string**. Do not assemble names such as `text-icon-${tone}`, because Tailwind's scanner must see them.
4. None of these lines pass through `cn()`, so tailwind-merge is not involved (its config is at `packages/utils/src/common.ts:46`).

Contrast of the proposed tokens with PPM surfaces (from `contrast-pairs.txt`; light surfaces #fff/#f4f6f9, dark #15171c/#1b1e24):

| pair | light | dark |
|---|---|---|
| text-danger-primary on bg-danger-subtle / surface-2 | 7.64 / 7.72 | 10.97 / 11.49 |
| text-success-primary on bg-success-subtle / surface-2 | 6.81 / 6.59 | 12.10 / 13.83 |
| text-warning-primary on bg-warning-subtle / surface-2 | 6.84 / 6.55 | 11.12 / 13.41 |
| text-danger-secondary on surface-2 | **4.41** | 5.78 |
| text-success-secondary / warning-secondary on surface-2 | **2.97 / 2.96** | 9.38 / 9.69 |
| bg-danger-primary as a dot on surface-2 | 4.41 | **2.00** |
| bg-success-primary as a dot on surface-2 | **2.97** | 9.38 |
| bg-warning-primary as a dot on surface-2 | **1.97** | 7.82 |
| border-*-subtle on surface-2 | 1.1–1.8 | 1.7–1.8 |
| bg-*-subtle on surface-2 | 1.01–1.04 | 1.05–1.21 |

So: **do not use `text-*-secondary` for text.** Status dots should use `bg-current` with `text-icon-*-primary` (the same 900-ramp values as the `*-primary` text rows, ≥ 6.5:1 in both themes); the `bg-*-primary` fills fail 3:1 in one theme each. Banner fills are subtle, so the colored text and border carry the meaning.

### `apps/web/core/components/ppm-vault/route.tsx` (19)

| line | current | proposed |
|---|---|---|
| 425 | `"border-red-500/30 bg-red-500/10 text-red-300"` (error banner, `role=alert`) | `"border-danger-subtle bg-danger-subtle text-danger-primary"` |
| 426 | `"border-green-500/30 bg-green-500/10 text-green-300"` (notice, `role=status`) | `"border-success-subtle bg-success-subtle text-success-primary"` |
| 520 | `border-red-500/30 text-red-300 hover:bg-red-500/10` (the «В корзину» button) | `border-danger-strong text-danger-primary hover:bg-danger-subtle` (mirrors Propel `error-outline`, `packages/propel/src/button/helper.tsx:19–20`, but with the text on `danger-primary` for 4.5:1) |
| 668 | `font-mono … focus:border-accent-primary` (Markdown editor textarea) | `font-code … focus:border-accent-strong` |
| 804 | `text-amber-300` | `text-warning-primary` |
| 930 | `hover:border-accent-primary` | `hover:border-accent-strong` |
| 951 | `"text-amber-300"` | `"text-warning-primary"` |
| 955 | `text-amber-300` | `text-warning-primary` |
| 1062 | `shadow-2xl` (dialog) | `shadow-overlay-200` |
| 1083, 1105, 1116 | `focus:border-accent-primary` (dialog inputs with `outline-none`) | `focus:border-accent-strong` |

Inputs at 668/1083/1105/1116 and git 1153/1984 currently have **no visible focus**: `outline-none` plus a dead focus border. The fix restores the focus indicator (card A.5 / E).

### `apps/web/core/components/ppm-git/route.tsx` (54)

| line | current | proposed |
|---|---|---|
| 493, 1110, 1849 | `border-accent-primary/40` (the sibling `bg-accent-primary/5` is valid) | `border-accent-strong/40` |
| 522 | `border-red-500/30 bg-red-500/10` (error banner, `text-primary` stays) | `border-danger-subtle bg-danger-subtle` |
| 544, 1035 | `border-cyan-500/20 bg-cyan-500/5` (info callouts) | `border-accent-subtle bg-accent-subtle`. In dark theme `border-accent-subtle` = `--brand-400` (bright), so consider `border-accent-subtle/60` after a visual check. |
| 579, 661, 804, 1212 | `text-15` (h3/h2 titles) | `text-16`, matching sibling h2s at 571, 614, 635 and 1925 (`text-16 font-semibold`) |
| 765 | `confirmed: "border-green-500/20 bg-green-500/10 text-green-500"` (`WEBHOOK_STATUS_CLASS_NAMES`) | `"border-success-subtle bg-success-subtle text-success-primary"` |
| 766 | `waiting: "border-amber-500/20 bg-amber-500/10 text-amber-500"` | `"border-warning-subtle bg-warning-subtle text-warning-primary"` |
| 823, 954 | `border-amber-500/20 bg-amber-500/5` (warning notes, `text-secondary` inside) | `border-warning-subtle bg-warning-subtle`. Check `text-secondary` on `bg-warning-subtle` visually. |
| 905 | `"border-green-500/30 bg-green-500/10 text-green-500"` (chip «Готово к применению») | `"border-success-subtle bg-success-subtle text-success-primary"` |
| 906 | `"border-amber-500/30 bg-amber-500/10 text-amber-500"` (chip «Применение закрыто») | `"border-warning-subtle bg-warning-subtle text-warning-primary"` |
| 923 | `<Check className="text-green-500 …">` | `text-icon-success-primary` |
| 925 | `<X className="text-amber-500 …">` | `text-icon-warning-primary` |
| 943 | `permission_ready ? "text-green-500" : "text-amber-500"` | `"text-success-primary" : "text-warning-primary"` |
| 1038, 1281, 1470 | `text-red-500` (error messages) | `text-danger-primary` |
| 1296, 1487, 1531, 1673 | `hover:bg-red-500/10 hover:text-red-500` (destructive ghost buttons) | `hover:bg-danger-subtle hover:text-danger-primary` |
| 1397 | `bg-amber-500/10 text-amber-500` (badge «Основной») | `bg-warning-subtle text-warning-primary` |
| 1447–1456 | status dot `mt-0.5 size-2 shrink-0 rounded-full ${ready ? "bg-green-500" : failed ? "bg-red-500" : enabled ? "bg-amber-500" : "bg-secondary"}` (`aria-hidden`, text label next to it) | **Recommended:** static `… rounded-full bg-current ${ready ? "text-icon-success-primary" : failed ? "text-icon-danger-primary" : enabled ? "text-icon-warning-primary" : "text-icon-tertiary"}`. Simpler alternative: `bg-success-primary / bg-danger-primary / bg-warning-primary / bg-layer-3`, but that fails 3:1 in one theme each (see the table). |
| 1571 | `<Check className="text-green-500 size-3.5" />` (copied) | `text-icon-success-primary` |
| 1919 | `shadow-2xl` (dialog) | `shadow-overlay-200` |
| 1153, 1984 | `focus:border-accent-primary` | `focus:border-accent-strong` |

### `apps/web/core/components/ppm-admin/admin-center.tsx` (5)

| line | current | proposed |
|---|---|---|
| 67 | `text-15` (error title) | `text-16` |
| 145 | `font-mono` (project identifier chip) | `font-code` |
| 305 | `font-mono` (audit action code) | `font-code` |
| 442 | `shadow-sm` (access-denied card) | `shadow-raised-100` |
| 494 | `"shadow-sm bg-layer-1 text-primary"` (active tab) | `"shadow-raised-100 bg-layer-1 text-primary"`. Visibility of the active tab also depends on section A.2 separating `layer-1` from `surface-2`; `bg-layer-1-selected` is an option once A.2 lands. |

### `apps/web/core/components/ppm-shell/project-feature-page.tsx` (4)

- Lines 115, 144, 151, 206: `focus-visible:outline-accent-primary` → `focus-visible:outline-accent-strong`. They already carry `focus-visible:outline-2 focus-visible:outline-offset-2`. Today the outline is drawn in `currentColor`.

### `apps/web/app/(home)/about/ppm-guide/page.tsx` (2), plus `about/brand-foundation/page.tsx:25–26` and `about/open-source/page.tsx:44,47`

- `tracking-widest` (eyebrow `text-caption-md-semibold uppercase`) → `tracking-[0.12em]` (the PPM eyebrow convention). For the exact Tailwind "widest" value, use `tracking-[0.1em]`.
- `text-3xl` (H1 with `font-semibold tracking-tight`) → `text-28`. Alternatively `text-h2-semibold`, which sets size, weight and line-height and would replace `font-semibold`.

### PPM lines in upstream files (optional extension of B.2; recommended, since PPM authored them)

- `navigation/tab-navigation-overflow-menu.tsx:41,67,81,102`, `navigation/tab-navigation-visible-item.tsx:56`, `navigation/top-nav-power-k.tsx:255` and `workspace/sidebar/project-navigation.tsx:132`: `focus-visible:outline-accent-primary` → `focus-visible:outline-accent-strong`. **Update the test at the same time:** `apps/web/tests/navigation/navigation-accessibility.test.tsx:166` → `toContain("focus-visible:outline-accent-strong")`.
- `layouts/auth-layout/project-wrapper.tsx:172`: `border-accent-primary/30` (admin-mode banner, with `bg-accent-primary/10`). The minimal fix is `border-accent-strong/30`. Card E.6 wants a warning color, so do it in one step: `border-warning-subtle bg-warning-subtle`, keeping `text-primary` or moving to `text-warning-primary`.
- If `top-nav-power-k.tsx` is added to the audit as a whole file, two upstream dead classes must be fixed too:
  - `:248 placeholder-text-placeholder` → `placeholder:text-placeholder`, or remove it; `tailwind-config/index.css` already sets the placeholder color globally.
  - `:264 shadow-lg` → `shadow-overlay-100`.

  Otherwise audit only the specific PPM lines.

After the replacements, run the formatter on the changed files: `pnpm exec oxfmt <files>` in `plane-fork`. `.oxfmtrc.json` has `sortTailwindcss` with the stylesheet `packages/tailwind-config/index.css`, so the order of the new, now known, classes will change. `check:format` would fail if they are left unsorted.

Upstream Plane's own dead classes are out of scope: about 130 occurrences in 69 files, for example `packages/propel/src/dialog/root.tsx:45 shadow-md` (the Propel dialog has no shadow) and `shadow-sm` ×17. Do not touch them in UX0.2. That would widen the diff against upstream.

---

## 4. CI check design

Existing pattern:
- `packages/ppm-brand/scripts/audit-user-facing-brand.mjs` and `packages/ppm-canvas/scripts/audit-browser-boundary.mjs` are plain Node ESM scripts. They set `repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url))`, write to stdout, and set `process.exitCode = 1`.
- They are wired as `"test": "vitest run && node scripts/audit-….mjs"` in `packages/ppm-brand/package.json` and `packages/ppm-canvas/package.json`.
- No GitHub workflow runs them. `plane-fork/.github/workflows/pull-request-build-lint-web-apps.yml` only triggers on PRs to `preview` and runs format, lint, types and build. `ppm-canvas-browser-gate.yml` is `workflow_dispatch` only. The root `/.github/workflows/plane-baseline.yml` is the Plane runtime smoke.

Proposal (ready file: `proposed-audit-tailwind-classes.mjs` in the scratch dir):
1. **Location:** `plane-fork/packages/ppm-brand/scripts/audit-tailwind-classes.mjs`.
2. **Wiring:** `packages/ppm-brand/package.json` → `"test": "vitest run && node scripts/audit-user-facing-brand.mjs && node scripts/audit-tailwind-classes.mjs"`.
3. **Resolution without a build.** Load Tailwind's design system from `apps/web/styles/globals.css`, first stripping the two imports that point into built `dist/`: `@plane/editor/styles` → `packages/editor/dist/styles/index.css`, and `@plane/propel/styles/react-day-picker.css` → `dist/...`. Those files have no `@theme`, `@utility` or `@custom-variant` (checked by grep), so the vocabulary is identical. Then check each token with `designSystem.candidatesToCss([token])`.
   - `@tailwindcss/node` is resolved via `createRequire(apps/web/package.json).resolve("@tailwindcss/postcss")` and then `createRequire(that)`. No new dependency and no lockfile change.
   - `typescript` also resolves from apps/web; it is also a devDependency of @ppm/brand.
4. **Canaries.** `bg-danger-subtle`, `text-success-primary`, `shadow-overlay-200` and `font-code` must compile; `bg-red-500`, `shadow-2xl`, `font-mono` and `text-15` must not. The script also fails if `__unstable__loadDesignSystem` is missing. This guards against a silent pass after a Tailwind upgrade; the version is pinned at `pnpm-workspace.yaml:176`.
5. **Scope.** `ppm-*` directories under `apps/web/core/components` and `apps/web/app` are discovered automatically. The PPM-owned files outside them are listed explicitly (see section 3).
6. **Fail and warn.**
   - Fail on MISSING, meaning a known Tailwind root or variant with no CSS.
   - Warn only on non-Tailwind tokens with no CSS rule (the Canvas BEM hooks) and on dynamic template fragments.
   - With `--built <dir>`, it also parses the built CSS and fails on "valid in the theme but absent from the built CSS", which catches files Tailwind does not scan. This is the literal card wording ("существует в собранном CSS") and fits the release gate after `pnpm --filter web build`.
7. **Expected output now:** it fails with **98** violations: 96 PPM-originated plus the 2 upstream classes in `top-nav-power-k`. `--built` finds 0 "not in build" entries. After the replacements the target is 0.
8. **Workflow** (optional but recommended). New file `plane-fork/.github/workflows/ppm-design-audit.yml`:
   - Triggers: `pull_request` with paths `apps/web/**`, `packages/tailwind-config/**` and `packages/ppm-brand/**`; `push` to `ppm/integration-v1.4.2` (the branch in `/.gitmodules`); `workflow_dispatch`.
   - Steps: `actions/checkout@v6`, `actions/setup-node@v6` (node 22), `corepack enable pnpm`, `pnpm install --frozen-lockfile`, `node packages/ppm-brand/scripts/audit-tailwind-classes.mjs`, `node packages/ppm-brand/scripts/audit-user-facing-brand.mjs`.
   - No build is needed; it runs in about 1 s after install.

   An alternative is a vitest wrapper in `apps/web/tests/ppm-design/tailwind-classes.test.ts`, so it runs in the "web unit suite". It needs a cross-package import of the script, so the `@ppm/brand` test script is simpler and matches the existing pattern.

---

## 5. @bprogress: why `--bprogress-color` does nothing and the minimal fix

- `apps/web/styles/globals.css:177–180`:
  ```css
  :root {
    --bprogress-color: var(--background-color-accent-primary);
    --bprogress-height: 2.5px !important;
  }
  ```
  The rules `.bprogress .bar` (186–193) and `.bprogress .peg` (195–201) override `background` and `box-shadow` with `!important`.
- The library CSS is imported inside the **lazy** module `apps/web/core/lib/b-progress/AppProgressBar.tsx:10` (`import "@bprogress/core/css";`). That module is lazy-loaded in `apps/web/app/provider.tsx:20–22` (`lazy(() => import("@/lib/b-progress/AppProgressBar"))`) and rendered at `:44`. Vite emits it as the separate chunk `build/client/assets/AppProgressBar-D_Zs2VgL.css`. At runtime that `<link>` is appended to `<head>` when the chunk loads, **after** `globals.css`, which is in `links()` at `root.tsx:71`.
- The library declares `:root{--bprogress-color:#29d; …; --bprogress-box-shadow:0 0 10px var(--bprogress-color),…}` (`node_modules/.pnpm/@bprogress+core@1.3.4/.../dist/index.css:2–14`). This has the same specificity (0,1,0) as the override, is also unlayered, and comes later, so **the library wins**. Only `--bprogress-height` works, because it carries `!important`. The bar and peg look right anyway because of their own `!important` overrides. But `.indeterminate .inc/.dec` (`index.css`, `background-color: var(--bprogress-color)`), `.spinner-icon` and the page-level `--bprogress-box-shadow` still resolve to `#2299dd`. The detector found exactly that: "dark-glow #2299dd".
- **Minimal fix (one line, same style as the neighbouring declaration):** `apps/web/styles/globals.css:178` → `--bprogress-color: var(--background-color-accent-primary) !important;`. Custom properties accept `!important`, and the build keeps it: the built CSS already contains `--bprogress-height:2.5px!important`.
  - Alternative 1: move the import into CSS with `@import "@bprogress/core/css";` in `globals.css` before line 176, and remove the JS import at `AppProgressBar.tsx:10`. That fixes the cascade order properly but touches an upstream TSX file and the chunking.
  - Alternative 2: raise the selector specificity, for example `:root:root`. This is hacky.
- `--background-color-accent-primary` is emitted in the theme layer (`--background-color-accent-primary:var(--bg-accent-primary)` in the built globals). The accent is `--ppm-color-accent` in both themes, so resolving it at `:root` is fine. With `PPM_BRAND_ENABLED=0` it falls back to Plane's accent, which is also correct.
- Optional design follow-up from the detector review, not required by B.3: drop the peg glow with `.bprogress .peg { display: none; }`.
- Verify: open any route, navigate once, then run `getComputedStyle(document.documentElement).getPropertyValue('--bprogress-color')` in DevTools. It should give the accent (`#22d3ee` with the PPM brand) and not `#29d`. Re-run `impeccable detect`: the "dark-glow #2299dd" finding should disappear.

---

## 6. What could break and how to verify

| change | risk | verification |
|---|---|---|
| Status colors (vault/git) become visible | Intended visual change; wrong semantic tone | Visual smoke of Хранилище (error and notice banner: trigger by renaming to an existing name, or network offline) and Код (webhook chip, readiness chip, permissions ✓/✗, repo index dot, error texts) in light and dark, at 1440 and 390 px |
| `focus-visible:outline-accent-*` fix | The outline color changes from currentColor to accent; it overlaps the ppm-brand box-shadow ring (`tokens.css:228–232`). Both already coexist today, so no new doubling. Section A.5 may redefine focus, so coordinate. | Tab through the project nav, overflow menu, Power-K clear button and feature-page CTAs. **Update `navigation-accessibility.test.tsx:166`.** |
| Input `focus:border-accent-strong` | Restores focus (a11y win); no layout change | Tab into the vault and git dialogs |
| `font-mono` → `font-code` | Vault Markdown editor, admin identifiers and audit codes become monospace (wider), so wrapping and truncation may change | Vault editor with a long line; admin list with a long identifier |
| `text-15` → `text-16` | Probably no change where the size was inherited from body (16px); a change elsewhere | Git page headings, admin error state |
| `text-3xl` → `text-28` | About-page H1s get smaller or larger than inherited | /about/ppm-guide, /about/open-source, /about/brand-foundation |
| `shadow-2xl` → `shadow-overlay-200` | The shadow is faint in dark theme (Plane shadows are #292f3d at 3–10%), which is the same as Plane's own modals | Vault and git dialogs |
| Admin tab `shadow-raised-100` | Tiny shadow; the real visibility fix is section A.2 | Admin centre tabs |
| New CI audit | Could flag false positives if someone writes class strings in unusual places, or a stale allowlist | The canaries plus the `--built` cross-check. Currently validated: design system and build agree 100%. |
| bprogress `!important` | None; affects only one CSS variable | DevTools check above |
| Formatter | New classes get re-sorted | `pnpm exec oxfmt <changed files>` (check with `--check`). The baseline `oxfmt --check` for web only complains about `test-results/.last-run.json`. |

Feature flags: all replacements use tokens that exist in both `PPM_BRAND_ENABLED=1` (tokens.css overrides) and `=0` (Plane values), so rollback semantics are unchanged. No data or API changes.

## 7. Commands

Run in `/Users/ermolov/Desktop/PPM/plane-fork`:
- `node packages/ppm-brand/scripts/audit-tailwind-classes.mjs`. New; now 98 violations, target 0.
- `node packages/ppm-brand/scripts/audit-tailwind-classes.mjs --built apps/web/build/client/assets`. Run after `pnpm --filter web build`, as a release gate.
- `pnpm --filter @ppm/brand test`. Baseline recorded by a sibling agent at 00:25: 19 tests passed, brand audit passed.
- `pnpm --filter web test` (vitest, `apps/web/tests/**`). Baseline at 00:25: 15 files and 97 tests passed. It includes `navigation-accessibility.test.tsx`, which must be updated.
- `pnpm --filter web check:types` and `pnpm --filter web check:format`, or `pnpm exec oxfmt --check <files>`.
- Exploration audit: `node <scratch>/ux02/map/audit-classes.mjs --scope=ppm|extended|all [--entry=ci --no-build]` (read-only).
- Root `npm test` (M0.6 guard) is unaffected by these plane-fork edits.

## 8. Open questions

1. Should the CI scope be `ppm-*` only (the card's wording) or also the PPM-owned lines in upstream nav files and about pages? This is recommended because PPM wrote them. Is it acceptable to fix the 2 upstream dead classes in `top-nav-power-k.tsx`?
2. Status dot: `bg-current` with `text-icon-*` (passes 3:1 everywhere), or the simpler `bg-*-primary`?
3. Info callouts: accent-subtle, or neutral `border-subtle bg-layer-1`, so the cyan is not overused (the detector already flags cyan overuse)?
4. `text-15` → 16 (my recommendation, for consistency) or 14?
5. Admin-mode banner (`project-wrapper.tsx:172`): fix it here with a warning palette to close E.6 at the same time?
6. Should the workflow go into `plane-fork/.github/workflows/`? The fork's PRs don't target `preview`, so the existing web workflow does not run. Or does the owner prefer only the package `test` script?
