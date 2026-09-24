# UX0.2 §A — tokens, themes, on-color, focus, contrast themes: code map and proposals

Mapper: tokens and themes. Read-only on `/Users/ermolov/Desktop/PPM` and `plane-fork`. The source of truth is the current
working tree (branch `feat/i0.6-work-item-projections`). I did not edit, stage or build anything in the repo. All
scripts and outputs are in this folder (`scratchpad/ux02/map/`). Paths below are relative to `plane-fork/` unless they
say otherwise.

## 0. Short answer

- `tokens.css` is clean: it matches HEAD commit `7e6aa54d51`. `brand.test.ts` has uncommitted edits, but only in the
  shell and attribution sections. The token section (`:132-153`) matches HEAD. Other agents left `canvas.css`,
  `editor.tsx`, `route.tsx` and `shape.tsx` modified, and `ppm-vault/`, `ppm-git/`, `ppm-admin/`,
  `ppm-canvas/workspace.tsx` and `minimal-workspace.tsx` untracked. Treat those files as someone else's work in
  progress.
- **on-color.** `--txt-on-color: #062b32` sits at `tokens.css:118` and `:207`. It darkens every `text-on-color`
  consumer: 110 real call sites (98 more in Storybook). Only about 45 of them sit on the cyan fill. It breaks danger
  buttons: 1.80:1 dark, 3.15:1 light. It also breaks project cards, where the text sits on a black/60 overlay at
  1.19:1. The fix has four parts:
  1. Restore the light on-color.
  2. Add `--txt-on-accent`.
  3. Add a scoped safety-net rule for upstream accent, success and warning fills.
  4. Explicitly switch the primitives and 4 consumers that the scoped rule cannot reach: checkbox, day-picker, Propel
     Avatar and `canvas.css` ×10.
- **OKLCH table.** Built and verified with `verify-tokens.mjs`. The proposal has 0 hard fails in 308 checks. The
  current values have 136 hard fails in the same harness.
- **Cascade simulation.** A cascade simulator ran on Tailwind output compiled from the real config. It shows that
  `PPM_BRAND_ENABLED=0` gives byte-identical upstream values: 0 diffs between current and proposed. It also shows the
  contrast themes are dead with the brand on today (borders 1.2–2.0:1) and come back with the proposal (6–17:1).
- **Focus.** The base-layer box-shadow ring loses to any utility that writes `box-shadow`: `.shadow-raised-100`,
  `.ring-0`, `focus:ring-*`. The fix is a utilities-layer rule with specificity (0,2,1) that composes Tailwind's
  `--tw-*` shadow vars. Text-entry controls keep today's base behaviour.
- **Contrast themes.** A plain `:where()` rewrite is not enough, because `tokens.css` comes after `variables.css` and
  equal specificity still wins by source order. The fix also moves `--border-*` into a block guarded by
  `:not([data-theme$="-contrast"])`.

## 1. Current `packages/ppm-brand/src/tokens.css` (233 lines, working tree = HEAD `7e6aa54d51`)

```css
  1 /*
  2  * PPM brand foundation.
  3  *
  4  * This is the single source of truth for PPM foundation tokens and the
  5  * compatibility bridge to Plane/Propel semantic variables. The bridge is
  6  * deliberately gated, so PPM_BRAND_ENABLED=0 restores the upstream theme.
  7  */
  8
  9 @layer base {
 10   [data-ppm-brand="enabled"] {
 11     --ppm-color-accent: #22d3ee;
 12     --ppm-color-accent-hover: #06b6d4;
 13     --ppm-color-accent-active: #0891b2;
 14     --ppm-color-focus: #67e8f9;
 15     --ppm-color-success: #22c55e;
 16     --ppm-color-warning: #f59e0b;
 17     --ppm-color-danger: #ef4444;
 18
 19     --ppm-font-sans: "IBM Plex Sans Variable", ui-sans-serif, system-ui, sans-serif;
 20     --ppm-font-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Consolas, monospace;
 21     --ppm-radius-sm: 0.375rem;
 22     --ppm-radius-md: 0.5rem;
 23     --ppm-radius-lg: 0.75rem;
 24     --ppm-motion-fast: 120ms;
 25     --ppm-motion-base: 180ms;
 26
 27     --ppm-node-project: #22d3ee;
 28     --ppm-node-task: #a78bfa;
 29     --ppm-node-note: #fbbf24;
 30     --ppm-node-decision: #34d399;
 31     --ppm-node-risk: #fb7185;
 32
 33     /* Plane/Propel typography bridge. */
 34     --font-heading: var(--ppm-font-sans);
 35     --font-body: var(--ppm-font-sans);
 36     --font-code: var(--ppm-font-mono);
 37   }
 38
 39   html[data-ppm-brand="enabled"],
 40   [data-ppm-brand="enabled"] [data-theme*="light"] {
 41     color-scheme: light;
 42     --ppm-color-focus: #0891b2;
 43     --ppm-color-canvas: #eef0f3;
 44     --ppm-color-surface-1: #ffffff;
 45     --ppm-color-surface-2: #f4f6f9;
 46     --ppm-color-layer: #e7ebf0;
 47     --ppm-color-border: #d5dae1;
 48     --ppm-color-border-strong: #aeb6c2;
 49     --ppm-color-text: #1a1d23;
 50     --ppm-color-text-secondary: #4b5563;
 51     --ppm-color-text-muted: #6b7280;
 52
 53     /* Plane neutral and brand scales. */
 54     --neutral-white: #ffffff;
 55     --neutral-100: #fafbfc;
 56     --neutral-200: #f4f6f9;
 57     --neutral-300: #eef0f3;
 58     --neutral-400: #e7ebf0;
 59     --neutral-500: #d5dae1;
 60     --neutral-600: #c2c9d2;
 61     --neutral-700: #aeb6c2;
 62     --neutral-800: #8b93a3;
 63     --neutral-900: #6b7280;
 64     --neutral-1000: #4b5563;
 65     --neutral-1100: #343a46;
 66     --neutral-1200: #1a1d23;
 67     --neutral-black: #0e0f12;
 68     --brand-100: #ecfeff;
 69     --brand-200: #cffafe;
 70     --brand-300: #a5f3fc;
 71     --brand-400: #67e8f9;
 72     --brand-500: #22d3ee;
 73     --brand-600: #06b6d4;
 74     --brand-700: #0891b2;
 75     --brand-800: #0e7490;
 76     --brand-900: #155e75;
 77     --brand-1000: #164e63;
 78     --brand-1100: #083344;
 79     --brand-1200: #052f3b;
 80     --brand-default: var(--ppm-color-accent);
 81
 82     /* Direct semantic bridge for stable component rendering. */
 83     --bg-canvas: var(--ppm-color-canvas);
 84     --bg-surface-1: var(--ppm-color-surface-1);
 85     --bg-surface-2: var(--ppm-color-surface-2);
 86     --bg-layer-1: var(--ppm-color-surface-2);          <- collapsed with surface-2 (A.2)
 87     --bg-layer-1-hover: var(--ppm-color-layer);
 88     --bg-layer-1-active: var(--neutral-500);
 89     --bg-layer-1-selected: var(--neutral-500);
 90     --bg-layer-2: var(--ppm-color-surface-1);
 91     --bg-layer-2-hover: var(--ppm-color-surface-2);
 92     --bg-layer-2-active: var(--ppm-color-layer);
 93     --bg-layer-2-selected: var(--ppm-color-layer);
 94     --bg-layer-3: var(--ppm-color-canvas);
 95     --bg-layer-3-hover: var(--ppm-color-layer);
 96     --bg-layer-3-active: var(--neutral-500);
 97     --bg-layer-3-selected: var(--neutral-500);
 98     --bg-layer-disabled: var(--neutral-400);
 99     --bg-accent-primary: var(--ppm-color-accent);
100     --bg-accent-primary-hover: var(--ppm-color-accent-hover);
101     --bg-accent-primary-active: var(--ppm-color-accent-active);   <- #0891b2: ink #062b32 only 4.08:1
102     --bg-accent-subtle: var(--brand-100);
103     --bg-accent-subtle-hover: var(--brand-200);
104     --bg-accent-subtle-active: var(--brand-300);
105     --border-subtle: var(--neutral-400);                 <- 105-110 override Plane light-contrast borders (A.6)
106     --border-subtle-1: var(--ppm-color-border);
107     --border-strong: var(--neutral-600);
108     --border-strong-1: var(--ppm-color-border-strong);
109     --border-accent-strong: var(--ppm-color-accent-active);
110     --border-accent-subtle: var(--brand-300);
111     --txt-primary: var(--ppm-color-text);
112     --txt-secondary: var(--ppm-color-text-secondary);
113     --txt-tertiary: var(--ppm-color-text-muted);          <- #6b7280 4.23-4.83
114     --txt-placeholder: var(--neutral-800);                <- #8b93a3 2.20-3.09
115     --txt-disabled: var(--neutral-700);
116     --txt-accent-primary: var(--ppm-color-accent-active); <- #0891b2 3.23-3.68
117     --txt-accent-secondary: var(--brand-800);
118     --txt-on-color: #062b32;                              <- A.1
119     --txt-icon-primary: var(--ppm-color-text);
120     --txt-icon-secondary: var(--ppm-color-text-secondary);
121     --txt-icon-tertiary: var(--ppm-color-text-muted);
122     --txt-icon-placeholder: var(--neutral-800);
123     --txt-icon-disabled: var(--neutral-700);
124     --txt-icon-accent-primary: var(--ppm-color-accent-active);
125     --txt-icon-accent-subtle: var(--ppm-color-accent);     <- #22d3ee on white 1.81 (icon needs 3:1)
126     --txt-link-primary: var(--ppm-color-accent-active);
127     --txt-link-primary-hover: var(--brand-800);
128   }
129
130   html[data-ppm-brand="enabled"][data-theme*="dark"],
131   [data-ppm-brand="enabled"] [data-theme*="dark"] {
132     color-scheme: dark;
133     --ppm-color-focus: #67e8f9;
134     --ppm-color-canvas: #0e0f12;
135     --ppm-color-surface-1: #15171c;
136     --ppm-color-surface-2: #1b1e24;
137     --ppm-color-layer: #20242b;
138     --ppm-color-border: #272b34;
139     --ppm-color-border-strong: #3b424f;
140     --ppm-color-text: #e7eaf0;
141     --ppm-color-text-secondary: #b4bbc7;
142     --ppm-color-text-muted: #8b93a3;
143
144     --neutral-black: #0a0b0d;
145     --neutral-100: #0e0f12;
146     --neutral-200: #15171c;
147     --neutral-300: #1b1e24;
148     --neutral-400: #20242b;
149     --neutral-500: #272b34;
150     --neutral-600: #303641;
151     --neutral-700: #3b424f;
152     --neutral-800: #737c8d;
153     --neutral-900: #8b93a3;
154     --neutral-1000: #a4adba;
155     --neutral-1100: #c5cad3;
156     --neutral-1200: #e7eaf0;
157     --neutral-white: #f7f9fc;
158     --brand-100: #082f36;
159     --brand-200: #0b3d45;
160     --brand-300: #0e5661;
161     --brand-400: #117889;
162     --brand-500: #0891b2;
163     --brand-600: #06b6d4;
164     --brand-700: #22d3ee;
165     --brand-800: #67e8f9;
166     --brand-900: #a5f3fc;
167     --brand-1000: #cffafe;
168     --brand-1100: #ecfeff;
169     --brand-1200: #f5feff;
170     --brand-default: var(--ppm-color-accent);
171
172     --bg-canvas: var(--ppm-color-canvas);
173     --bg-surface-1: var(--ppm-color-surface-1);
174     --bg-surface-2: var(--ppm-color-surface-2);
175     --bg-layer-1: var(--ppm-color-surface-2);          <- collapsed with surface-2
176     --bg-layer-1-hover: var(--ppm-color-layer);
177     --bg-layer-1-active: var(--neutral-500);
178     --bg-layer-1-selected: var(--neutral-500);
179     --bg-layer-2: var(--ppm-color-surface-1);          <- #15171c DARKER than layer-1 #1b1e24 (A.2)
180     --bg-layer-2-hover: var(--ppm-color-surface-2);
181     --bg-layer-2-active: var(--ppm-color-layer);
182     --bg-layer-2-selected: var(--ppm-color-layer);
183     --bg-layer-3: var(--ppm-color-layer);
184     --bg-layer-3-hover: var(--neutral-500);
185     --bg-layer-3-active: var(--neutral-600);
186     --bg-layer-3-selected: var(--neutral-600);
187     --bg-layer-disabled: var(--neutral-500);
188     --bg-accent-primary: var(--ppm-color-accent);
189     --bg-accent-primary-hover: var(--ppm-color-accent-hover);
190     --bg-accent-primary-active: var(--ppm-color-accent-active);
191     --bg-accent-subtle: var(--brand-100);
192     --bg-accent-subtle-hover: var(--brand-200);
193     --bg-accent-subtle-active: var(--brand-300);
194     --border-subtle: var(--neutral-500);                <- 194-199 override Plane dark-contrast borders
195     --border-subtle-1: var(--ppm-color-border);
196     --border-strong: var(--neutral-600);
197     --border-strong-1: var(--ppm-color-border-strong);
198     --border-accent-strong: var(--ppm-color-focus);     <- selection colour == focus colour (A.5)
199     --border-accent-subtle: var(--brand-400);
200     --txt-primary: var(--ppm-color-text);
201     --txt-secondary: var(--ppm-color-text-secondary);
202     --txt-tertiary: var(--ppm-color-text-muted);
203     --txt-placeholder: var(--neutral-800);             <- #737c8d 3.37-4.56
204     --txt-disabled: var(--neutral-700);
205     --txt-accent-primary: var(--ppm-color-accent);
206     --txt-accent-secondary: var(--ppm-color-focus);
207     --txt-on-color: #062b32;                           <- A.1 (1.80:1 on #9f0712)
208     --txt-icon-primary: var(--ppm-color-text);
209     --txt-icon-secondary: var(--ppm-color-text-secondary);
210     --txt-icon-tertiary: var(--ppm-color-text-muted);
211     --txt-icon-placeholder: var(--neutral-800);
212     --txt-icon-disabled: var(--neutral-700);
213     --txt-icon-accent-primary: var(--ppm-color-accent);
214     --txt-icon-accent-subtle: var(--ppm-color-focus);
215     --txt-link-primary: var(--ppm-color-accent);
216     --txt-link-primary-hover: var(--ppm-color-focus);
217   }
218
219   html[data-ppm-brand="enabled"],
220   html[data-ppm-brand="enabled"] body {
221     font-family: var(--ppm-font-sans);
222   }
223
224   html[data-ppm-brand="enabled"] :where(code, kbd, pre, samp) {
225     font-family: var(--ppm-font-mono);
226   }
227
228   html[data-ppm-brand="enabled"] :where(a, button, input, select, textarea, [tabindex]):focus-visible {
229     box-shadow:
230       0 0 0 2px var(--bg-canvas),
231       0 0 0 4px var(--ppm-color-focus);
232   }
233 }
```

How it is wired:

- `apps/web/styles/globals.css:1-2` loads `@plane/tailwind-config/index.css` first, then `@ppm/brand/tokens.css`.
- `apps/web/app/root.tsx:87` sets `data-ppm-brand`.
- `root.tsx:109-112` sets up next-themes: `themes={["light","dark","light-contrast","dark-contrast","custom"]}`, default
  `dark` when the brand is on. It writes `data-theme` on `<html>`.
- Admin (`apps/admin/styles/globals.css:1`), Space (`apps/space/styles/globals.css:1`), `packages/ui/styles/globals.css`
  and Propel Storybook import **only** tailwind-config, without `tokens.css`. This matters for any new Tailwind class
  that Propel or ui start using.

## 2. Plane token system: upstream defaults for every variable PPM overrides

Theme names: `packages/constants/src/themes.ts:7`
`THEMES = ["light","dark","light-contrast","dark-contrast","custom"]`. The picker labels are "Light high contrast" and
"Dark high contrast" (`:57`, `:68`). Users can pick them in `core/theme/theme-switch.tsx:62`,
`appearance/theme-switcher.tsx` and Power-K `themes-menu.tsx`.

`packages/tailwind-config/variables.css` layout:

- `:1-3` defines custom variants:
  - `dark` = `&:where([data-theme*="dark"], [data-theme*="dark"] *)`;
  - `dark-high-contrast` = `[data-theme="dark-contrast"]`;
  - `light-high-contrast` = `[data-theme="light-contrast"]`.
- `@layer base { :root, :host { … } }` holds:
  - `:151-213` light palette;
  - `:222-266` light bg;
  - `:268-281` borders;
  - `:283-298` text;
  - `:290` `--txt-on-color: var(--neutral-100)`;
  - `:316` `--txt-icon-on-color: var(--neutral-white)`.
- `@variant dark` at `:400-648`, with `:540` `--txt-on-color: var(--neutral-1200)`.
- `@variant dark-high-contrast` at `:651-667` and `@variant light-high-contrast` at `:671-687`. **They only set
  `--border-*`**, mostly to n1200/n1100/n1000/n900.
- `@theme inline` at `:727-976` maps utilities. For example `:844` `--text-color-on-color: var(--txt-on-color);` and
  `:845` `-disabled`. Compiled utilities reference the `--txt-*` variables directly:
  `.text-on-color{color:var(--txt-on-color)}`.
- `@theme` at `:692-724` resets `--color-*`, `--shadow-*`, `--ring-width-*` and `--outline-width-*` to `initial`
  (`:693`, `:708`, `:710`).

Compiled order in the build from 23.09 (`apps/web/build/client/assets/globals-DZa7ZJYQ.css`, byte offsets):

| Position | What sits there |
|---|---|
| 67 / 2080 / 10502 / 49105 / 56596 | `@layer properties` / `theme` / `base` / `components` / `utilities` |
| ~30564 | Plane dark `:is(:root,:host):where([data-theme*=dark],[data-theme*=dark] *)` |
| 40732 | Plane dark-contrast |
| 41358 | Plane light-contrast |
| 42122 | PPM `[data-ppm-brand=enabled]` |
| 42859 | PPM light `html[data-ppm-brand=enabled],[data-ppm-brand=enabled] [data-theme*=light]` |
| 45808 | PPM dark |
| 49018 | PPM focus rule, still inside `@layer base` |
| 151043 | `.shadow-raised-100`, inside `@layer utilities` |

The full table below is generated by `upstream-table.mjs` from `upstream-table.md` and the cascade simulator.
"upstream" means brand disabled, as resolved. "PPM" means the current `tokens.css` with the brand on. The line
numbers point to `variables.css` and `tokens.css`.

| var | Plane light (variables.css) | upstream light | PPM light | Plane dark | upstream dark | PPM dark |
|---|---|---|---|---|---|---|
| `--bg-canvas` | :222 `var(--neutral-300)` | #eff0f0 | :83 #eef0f3 | :472 `var(--neutral-black)` | #0e0f10 | :172 #0e0f12 |
| `--bg-surface-1` | :223 `var(--neutral-white)` | #ffffff | :84 #ffffff | :473 `var(--neutral-100)` | #141515 | :173 #15171c |
| `--bg-surface-2` | :224 `var(--neutral-100)` | #fafafa | :85 #f4f6f9 | :474 `var(--neutral-200)` | #181a1b | :174 #1b1e24 |
| `--bg-layer-1` | :225 `var(--neutral-200)` | #f4f5f5 | :86 #f4f6f9 (=s2) | :475 `var(--neutral-200)` | #181a1b (=s2 upstream too) | :175 #1b1e24 (=s2) |
| `--bg-layer-1-hover` | :226 n300 | #eff0f0 | :87 #e7ebf0 | :476 n300 | #1d1f20 | :176 #20242b |
| `--bg-layer-1-active/selected` | :227-228 n400 | #eaebeb | :88-89 #d5dae1 | :477-478 n400 | #222425 | :177-178 #272b34 |
| `--bg-layer-2` | :229 n-white | #ffffff | :90 #ffffff | :479 n300 | #1d1f20 | :179 **#15171c** |
| `--bg-layer-2-hover` | :230 n100 | #fafafa | :91 #f4f6f9 | :480 n400 | #222425 | :180 #1b1e24 |
| `--bg-layer-2-active/selected` | :231-232 n200 | #f4f5f5 | :92-93 #e7ebf0 | :481-482 n500 | #2c2e30 | :181-182 #20242b |
| `--bg-layer-3` | :233 n300 | #eff0f0 | :94 #eef0f3 | :483 n400 | #222425 | :183 #20242b |
| `--bg-layer-3-hover` | :234 n400 | #eaebeb | :95 #e7ebf0 | :484 n500 | #2c2e30 | :184 #272b34 |
| `--bg-layer-3-active/selected` | :235-236 n500 | #e4e6e7 | :96-97 #d5dae1 | :485-486 n600 | #36393a | :185-186 #303641 |
| `--bg-layer-transparent-hover/active/selected` | :238-240 alpha-black 5/10/15% | | not bridged | :488-490 alpha-white 5/10/15% | | not bridged |
| `--bg-layer-disabled` | :241 n400 | #eaebeb | :98 #e7ebf0 | :491 n700 | #45484a | :187 #272b34 |
| `--bg-accent-primary` | :242 brand-default | #006399 | :99 #22d3ee | :492 brand-default | #2893cc | :188 #22d3ee |
| `--bg-accent-primary-hover` | :243 brand-900 | #005685 | :100 #06b6d4 | :493 brand-500 | #195c80 | :189 #06b6d4 |
| `--bg-accent-primary-active` | :244 brand-1000 | #003c5c | :101 #0891b2 | :494 brand-400 | #16506f | :190 #0891b2 |
| `--bg-accent-subtle(-hover/-active)` | :245-247 brand-100/200/300 | #f5fbff/#ebf8ff/#d6f1ff | :102-104 #ecfeff/#cffafe/#a5f3fc | :495-497 | #071922/#0a2533/#0f374d | :191-193 #082f36/#0b3d45/#0e5661 |
| `--bg-danger-primary(-hover/-active)` | :253-255 red-700/800/900 | #e7000b/#c10007/#9f0712 | not bridged | :503-505 red-300/400/500 | #9f0712/#c10007/#e7000b | not bridged |
| `--bg-success-primary` / `--bg-warning-primary` | :248 green-700 / :251 amber-600 | #00a63e / #fe9a00 | not bridged | :498 / :501 | #05df72 / #fe9a00 | not bridged |
| `--border-subtle` | :268 n400 | #eaebeb | :105 #e7ebf0 | :518 n400 | #222425 | :194 #272b34 |
| `--border-subtle-1` | :269 n500 | #e4e6e7 | :106 #d5dae1 | :519 n500 | #2c2e30 | :195 #272b34 |
| `--border-strong` | :270 n600 | #dadcdd | :107 #c2c9d2 | :520 n600 | #36393a | :196 #303641 |
| `--border-strong-1` | :271 n700 | #cfd2d3 | :108 #aeb6c2 | :521 n700 | #45484a | :197 #3b424f |
| `--border-accent-strong` | :274 brand-default | #006399 | :109 #0891b2 | :524 brand-default | #2893cc | :198 #67e8f9 (=focus) |
| `--border-accent-subtle` | :275 brand-300 | #d6f1ff | :110 #a5f3fc | :525 brand-300 | #0f374d | :199 #117889 |
| `--txt-primary` | :283 n1200 | #1d1f20 | :111 #1a1d23 | :533 n1200 | #e4e6e7 | :200 #e7eaf0 |
| `--txt-secondary` | :284 n1100 | #4e5355 | :112 #4b5563 | :534 n1100 | #cacdce | :201 #b4bbc7 |
| `--txt-tertiary` | :285 n1000 | #676c6f | :113 #6b7280 | :535 n1000 | #afb3b6 | :202 #8b93a3 |
| `--txt-placeholder` | :286 n900 | #80868a | :114 #8b93a3 | :536 n900 | #959a9d | :203 #737c8d |
| `--txt-disabled` | :287 n800 | #909598 | :115 #aeb6c2 | :537 n800 | #7a8185 | :204 #3b424f |
| `--txt-accent-primary` | :288 brand-default | #006399 | :116 #0891b2 | :538 | #2893cc | :205 #22d3ee |
| `--txt-accent-secondary` | :289 brand-700 | #009ff5 | :117 #0e7490 | :539 brand-700 | #66b6e1 | :206 #67e8f9 |
| **`--txt-on-color`** | **:290 `var(--neutral-100)`** | **#fafafa** | **:118 #062b32** | **:540 `var(--neutral-1200)`** | **#e4e6e7** | **:207 #062b32** |
| `--txt-icon-on-color` | :316 n-white | #ffffff | not bridged (white) | :566 n-white | | not bridged |
| `--txt-icon-*` (primary…accent-subtle) | :300-314 | | :119-125 | :550-564 | | :208-214 |
| `--txt-link-primary(-hover)` | :320-321 brand-default/900 | #006399/#005685 | :126-127 #0891b2/#0e7490 | :570-571 | #2893cc/#66b6e1 | :215-216 #22d3ee/#67e8f9 |
| `--txt-success/warning/danger-*` | :293-298 | #016630/#00a63e/#973c00/#e17100/#9f0712/#e7000b | not bridged | :543-548 | | not bridged |
| Neutral and brand scales | :151-177 | | :54-80 | :402-428 | | :144-170 |

For the full 72-row list (all neutral and brand steps), see `upstream-table.md`.

## 3. `--txt-on-color` consumers (task 2)

Raw grep: `(text|fill|stroke)-on-color`, `txt-on-color` and `text-color-on-color` over `apps/` and `packages/`, in
`.ts`, `.tsx`, `.css`, `.js` and `.mjs` files, excluding node_modules and build output. The result is in
`on-color-raw.txt` (222 lines):

- 98 lines in Propel `*.stories.tsx`;
- 11 definitions or comments (`variables.css`, `tokens.css`, `theme-application.ts:136,186`, `utils/common.ts:22`,
  `propel/utils/classname.tsx:22`);
- 3 commented-out lines (`billing/comparison/plans.tsx:633,641,649`);
- **110 real consumers** (`on-color-consumers.txt`): web 81, admin 2, space 5, packages 22.

**Key mechanism.** `.text-on-color{color:var(--txt-on-color)}` resolves the variable on the element. So an
element-scoped `--txt-on-color` override works for the class. `var(--text-color-on-color)` behaves differently: it is
declared on `:root` as `var(--txt-on-color)`, so it resolves at `:root` and descendants inherit the finished value. An
element-scoped override does **not** reach those consumers.

### 3.1 Categories and what happens when the light on-color comes back

**A. On accent fill, same element or a descendant (≈45). Restoring alone would give light text on cyan (1.5–1.7:1).
The scoped rule (§3.2 C) covers them, or the call site switches.**

- Primitives:
  - `propel/src/button/helper.tsx:16` (primary);
  - `propel/src/icon-button/helper.tsx:17`;
  - `propel/src/toolbar/toolbar.tsx:133`;
  - `ui/src/button/helper.tsx:47`;
  - `ui/src/badge/helper.tsx:53` (ui Badge is not imported in any app);
  - `propel/src/toast/toast.tsx:90` (INFO icon inside `bg-accent-primary`).
- PPM-owned:
  - `ppm-git/route.tsx:511,1051,1235,1244,1958`;
  - `ppm-vault/route.tsx:389,676,725,1137`;
  - `ppm-shell/project-feature-page.tsx:115,144`;
  - `ppm-canvas/route.tsx:121`;
  - `ppm-canvas/minimal-workspace.tsx:48`;
  - `app/(home)/about/ppm-guide/page.tsx:69`.
- Upstream web:
  - `ui/empty-space.tsx:63`;
  - `license/modal/card/plan-upgrade.tsx:80`;
  - `workspace-notifications/.../menu-option-item.tsx:42`;
  - `.../snooze/modal.tsx:181,192` (`bg-accent-primary/90`);
  - `workspace/logo.tsx:26`;
  - `workspace/sidebar/dropdown-item.tsx:80`;
  - `workspace/settings/workspace-details.tsx:161`;
  - `workspace/billing/comparison/plan-detail.tsx:62`, `frequency-toggle.tsx:52`, `plans.tsx:61`;
  - `gantt-chart/chart/views/quarter.tsx:48,73`, `month.tsx:59,83`, `week.tsx:66`;
  - `profile/sidebar.tsx:126`;
  - `issues/.../filter-option.tsx:29`, `display-properties.tsx:76`, `activity-filter.tsx:54`;
  - `calendar/day-tile.tsx:161,210`;
  - `active-cycles/workspace-active-cycles-upgrade.tsx:100` (inside a primary button);
  - `onboarding/profile-setup.tsx:273`, `create-workspace.tsx:122` (`bg-accent-primary/80`),
    `steps/profile/root.tsx:177`, `steps/profile/consent.tsx:25`, `steps/role/root.tsx:152`,
    `steps/usecase/root.tsx:153`, `tour/root.tsx:98`.
- Other apps (unbranded, so they stay upstream): `admin/components/workspace/list-item.tsx:39`,
  `space/.../filter-option.tsx:30`.

**B. On accent fill that the scoped rule CANNOT reach. Each must switch explicitly, or it regresses to about 1.6:1.**

- `ppm-canvas/canvas.css:411, 514, 609, 681, 2419, 2565, 2634, 3177, 3994, 4490`. Each pairs
  `color: var(--txt-on-color); background: var(--bg-accent-primary)` inside custom classes. Rules checked:
  - `.ppm-brain-panel__report > header button`, `__decomposition > footer button`, `__answer header button`,
    `__section-title button`;
  - `.ppm-canvas-board-panel__primary`, `.ppm-canvas-board-dialog__primary`, `.ppm-canvas-workspace-state > button`,
    `.ppm-canvas-empty button`;
  - `.ppm-work-item-picker__create`, `.ppm-work-items-view__more`.
- `ui/src/form-fields/checkbox.tsx:55`. The check `<svg class="… text-on-color">` is a **sibling** of the checked
  `<input class="… bg-accent-primary">` (`:37-47`), not a descendant.
- `propel/src/styles/react-day-picker.css:19`: `--rdp-selected-color: var(--text-color-on-color)` on the selected day,
  whose background is `--rdp-accent-color: var(--background-color-accent-primary)` (`:11`). It resolves at `:root`.
- `propel/src/avatar/avatar.tsx:116-117`: inline `backgroundColor: … "var(--background-color-accent-primary)"`,
  `color: … "var(--text-color-on-color)"`. There is no class and the value resolves at `:root`. Its only user is
  `apps/web/core/components/profile/overview/activity.tsx:12`.

**C. On danger fill (upstream light text is correct; today's ink fails).**

- `propel/button/helper.tsx:18` (`error-fill`) and `icon-button/helper.tsx:19`.
- `ui/button/helper.tsx:77` (`danger`).
- `propel/toolbar/toolbar.tsx:138` (`destructive`).
- `toast.tsx:78` (ERROR).
- `issues/issue-detail/label/create-label.tsx:157`.
- Plus `AlertModalCore`: `ui/src/modals/alert-modal.tsx:45-48` maps `danger → "error-fill"`, and `:70` makes
  `variant = "danger"` the default. `AlertModalCore` has 16 usages; there are 17 more direct `"error-fill"` usages.

Measured: light `#fafbfc` on `#e7000b`/`#c10007`/`#9f0712` gives 4.60/6.20/8.06. Dark `#f7f9fc` on
`#9f0712`/`#c10007`/`#e7000b` gives 7.92/6.08/4.52. The upstream dark value `n1200` would give only 3.96 on the pressed
state.

**D. On success or warning fill.** Upstream light text is poor and the current ink works:

- `toast.tsx:72` (success), `:84` (warning);
- `create-label.tsx:165,167` (`bg-success-primary`);
- `onboarding/switch-account-dropdown.tsx:42` (avatar, 13 px text).

| Label | Theme | success fill | warning fill |
|---|---|---|---|
| Light on-color | light | 3.11 | 2.06 |
| Light on-color | dark | 1.68 | 2.02 |
| Ink | light | 4.67 | 7.04 |
| Ink | dark | 8.45 | 7.04 |

The scoped rule keeps the ink here, so nothing regresses.

**E. On image or dark overlay (restoring FIXES a current bug).**

- `project/card.tsx:235,237,238,253,259`: over `from-black/60` (`:220`). Today #062b32 gives **1.19:1**; restored
  gives 12.2:1.
- `project/form.tsx:245,250`: `from-black/50` (`:205`).
- `project/create/header.tsx:51`: close icon on the cover image.
- `editor/.../full-screen/root.tsx:56`: image viewer on a dark backdrop.
- `auth-screens/footer.tsx:23,27,31`: `dark:text-on-color` logos, where the ink is invisible in dark today.
- Avatars with a photo, where the text is hidden under `<img>`:
  - `home/widgets/empty-states/no-projects.tsx:111`;
  - `workspace/settings/member-columns.tsx:68`;
  - `project/settings/member-columns.tsx:59`;
  - `exporter/column.tsx:30`.
- `no-projects.tsx:121` avatar on `bg-[#028375]`: 4.50 restored vs 3.22 with ink.
- `no-projects.tsx:189` check on `#17a34a`: 3.18 vs 4.56 (an icon only needs 3:1, so both pass).

**F. Misuse: `text-on-color` on a light or transparent background. Visibility flips from dark theme to light theme;
fix the call site.**

| Call site | Background | Contrast now (ink), light / dark | Contrast restored, light / dark |
|---|---|---|---|
| `modules/analytics-sidebar/root.tsx:192`, chevron | `bg-layer-3` | 12.9 / **1.10** | **1.12** / 13.2 |
| `project/settings/member-columns.tsx:69`, initial | `bg-layer-3` | same | same |
| `exporter/column.tsx:38` | dead `bg-gray-700`, so transparent | 15.0 / 1.19 | **1.04** / 17.3 |
| `profile/activity/activity-list.tsx:55,58,137` | dead `bg-gray-500/700`, so transparent | same | same |
| `propel/src/toast/toast.tsx:96,102`, `CircularBarSpinner` | `bg-layer-2` | same | **invisible in light** |

The spinner fills with `currentColor` (`spinners/circular-bar-spinner.tsx:20-26`). Upstream Plane has the same bug.

Suggested fix: use `text-secondary` or `text-icon-secondary`. For dead backgrounds, also replace `bg-gray-*` with
`bg-layer-3`, which overlaps section B.1 of the card.

**G. Other apps (unbranded, stay upstream).**

- `admin/components/instance/failure.tsx:31`;
- `space/components/instance/instance-failure-view.tsx:27`;
- `space/.../comment-detail-card.tsx:83,143,150`.

Card numbers confirmed: `helper.tsx:17` is the error-fill key and `:18` its classes; `alert-modal.tsx:46,70`. There are
33 danger call sites, 17 direct plus 16 AlertModalCore (the card says 32).

### 3.2 Proposal: restore on-color and add `--txt-on-accent`

- **(A) `tokens.css`.**
  - Delete `--txt-on-color: #062b32` at `:118` and `:207`.
  - Light block: `--txt-on-color: var(--neutral-100)`, which mirrors upstream `:290`.
  - Dark block: `--txt-on-color: var(--neutral-white)` (#f7f9fc). This deviates from upstream `n1200` so the pressed
    danger state reaches 4.52 instead of 3.96.
  - Add `--txt-on-accent: oklch(0.2674 0.042 213.14)` (#062b32, unchanged ink) in both theme blocks.
- **(B) Utility available in every app.** Add one inert line to `packages/tailwind-config/variables.css`, after
  `:845`, inside `@theme inline`:

  ```css
  --text-color-on-accent: var(--txt-on-accent, var(--txt-on-color));
  ```

  Without the brand (admin, space, `PPM_BRAND_ENABLED=0`), `text-on-accent` resolves exactly like `text-on-color`. An
  in-memory Tailwind 4.1.17 compile (`tw-compile-check.mjs`) confirmed the output
  `.text-on-accent{color:var(--txt-on-accent,var(--txt-on-color))}`, emitted before the `disabled:` variants.
  - Putting it only in `tokens.css` is not safe: admin and space would lose the class.
  - The alternative, with no upstream CSS change, is the arbitrary class
    `text-[color:var(--txt-on-accent,var(--txt-on-color))]` in the helpers.
- **(C) Safety net in `tokens.css`** (`@layer base`, specificity 0):

  ```css
  :where([data-ppm-brand="enabled"]) :where(.bg-accent-primary, .bg-accent-primary\/80, .bg-accent-primary\/90, .bg-success-primary, .bg-warning-primary) { --txt-on-color: var(--txt-on-accent); }
  ```

  It covers the upstream long tail in §3.1 A and D with no upstream diff. It cannot reach §3.1 B.
- **(D) Explicit switches.**
  - Required, from §3.1 B:
    - `canvas.css` ×10 → `color: var(--txt-on-accent, var(--txt-on-color));`;
    - `checkbox.tsx:55` → `text-on-accent`;
    - `react-day-picker.css:19` → `--rdp-selected-color: var(--txt-on-accent, var(--text-color-on-color));`;
    - `avatar.tsx:117` → `fallbackTextColor ?? "var(--txt-on-accent, var(--text-color-on-color))"`.
  - Recommended, so the intent is explicit:
    - Propel `button/helper.tsx:16`, `icon-button/helper.tsx:17`, `toolbar/toolbar.tsx:133`;
    - ui `button/helper.tsx:47`, `badge/helper.tsx:53`;
    - the PPM-owned sites from §3.1 A → `text-on-accent`.
  - **Leave on `text-on-color`:** `helper.tsx:18`, `icon-button:19`, `toolbar:138`, `ui/button:77`, toast ERROR, and
    everything in §3.1 C and E.
- **(E) Fix the misuse sites in §3.1 F.** They are upstream files, so this is an owner question (§12).

The Propel primary button then keeps dark text: 8.30 on the base fill, 6.19 on hover and 5.02 on the new
`accent-active` #04a3c2. The old #0891b2 gave only 4.08. Danger buttons get light text.

## 4. New OKLCH role table (task 3)

- Script: `verify-tokens.mjs`, using `color-lib.mjs` (OKLab to sRGB with a gamut check, WCAG 2.x).
- Proposal: `node verify-tokens.mjs` exits 0 with **0 hard fails, 308 PASS and 9 warnings**. The warnings are
  informational: `txt-disabled`, which SC 1.4.3 exempts, and upstream on-color on success/warning fills, which the
  scoped ink handles.
- Baseline: `node verify-tokens.mjs --current` exits 1 with **136 hard fails**.
- Outputs: `verify-tokens.out.txt`, `verify-tokens.current.out.txt`, `proposed-table.md`.
- Unchanged colours use exact literals from `exact-oklch.mjs` / `exact-oklch.out.txt`, which round-trip to the same hex.

What the checks cover:

- text primary, secondary, tertiary, placeholder and accent ≥ 4.5 on:
  - canvas, surface-1/2, layer-1/2/3 and their hover and selected states;
  - `layer-transparent-hover/active/selected` composited over surface-1 and surface-2;
- accent text on accent-subtle(-hover/-active) and on `accent/20` and `accent/10` (the counter badge);
- ink on accent fill, hover and active ≥ 4.5; on-color on danger fill, hover and active ≥ 4.5;
- control borders ≥ 3 on canvas, s1, s2, l1 and l2; selection border ≥ 3; icon accent-subtle ≥ 3;
- focus ring ≥ 3 on six backgrounds;
- separation: layer-1 vs surface-2 ≥ 1.07, hover ≥ 1.10, selected vs surface-2 ≥ 1.25, layer-2-selected ≥ 1.25;
- dark elevation order layer-1 ≤ layer-2 ≤ layer-3;
- a monotonic text hierarchy.

| role | light OKLCH | light hex | dark OKLCH | dark hex | change |
|---|---|---|---|---|---|
| canvas | `oklch(0.9545 0.0046 258.32)` | #eef0f3 | `oklch(0.1687 0.0065 271.01)` | #0e0f12 | = |
| surface-1 | `oklch(1 0 0)` | #ffffff | `oklch(0.2047 0.0104 268.17)` | #15171c | = |
| surface-2 | `oklch(0.9725 0.0045 258.32)` | #f4f6f9 | `oklch(0.2345 0.0124 264.3)` | #1b1e24 | = |
| layer-1 | `oklch(0.949 0.006 258)` | #eceef2 | `oklch(0.2593 0.0144 261.67)` | #20242b | was = surface-2 |
| layer-1-hover | `oklch(0.915 0.008 258)` | #e0e3e8 | `oklch(0.292 0.016 262)` | #272c34 | |
| layer-1-selected (= active) | `oklch(0.896 0.01 258)` | #d9dde3 | `oklch(0.325 0.018 262)` | #2f343e | |
| layer-2 | `oklch(1 0 0)` | #ffffff | `oklch(0.28 0.015 262)` | #252930 | dark was #15171c, darker than l1 |
| layer-2-hover | `oklch(0.965 0.005 258)` | #f1f4f7 | `oklch(0.31 0.017 262)` | #2c3039 | |
| layer-2-selected (= active) | `oklch(0.912 0.009 258)` | #dee2e8 | `oklch(0.345 0.019 262)` | #343943 | |
| layer-3 | `oklch(0.948 0.006 258)` | #ebeef2 | `oklch(0.3 0.016 262)` | #292e36 | |
| layer-3-hover | `oklch(0.915 0.008 258)` | #e0e3e8 | `oklch(0.33 0.018 262)` | #30363f | |
| layer-3-selected | `oklch(0.898 0.01 258)` | #d9dee4 | `oklch(0.355 0.02 262)` | #363c47 | |
| layer-disabled | `oklch(0.935 0.006 258)` | #e7eaee | `oklch(0.3 0.016 262)` | #292e36 | |
| layer-transparent hover/active/selected | ink `oklch(0.1482 0.0034 196.79)` 6/9/11% | | white 7/10/13% | | upstream 5/10/15% |
| border-subtle (dividers) | `oklch(0.9 0.01 258)` | #dadee5 | `oklch(0.3 0.018 264)` | #292e37 | ~1.3:1 |
| border-subtle-1 (controls) | `oklch(0.62 0.022 258)` | #7e8794 | `oklch(0.55 0.026 262)` | #697281 | ≥3:1 (3.16–3.64 L; 3.01–3.95 D) |
| border-strong | `oklch(0.6 0.022 258)` | #78818e | `oklch(0.57 0.026 262)` | #6f7887 | ≥3:1 (checkbox, radio, secondary btn) |
| border-strong-1 | `oklch(0.55 0.022 258)` | #6a727f | `oklch(0.62 0.026 262)` | #7e8796 | |
| txt-primary | `oklch(0.2303 0.0125 264.29)` | #1a1d23 | `oklch(0.9365 0.0087 264.52)` | #e7eaf0 | = |
| txt-secondary | `oklch(0.42 0.024 258)` | #454e5a | `oklch(0.82 0.018 261)` | #bec4d0 | |
| txt-tertiary | `oklch(0.475 0.022 262)` | #555d69 | `oklch(0.765 0.021 258)` | #abb3c0 | L was #6b7280 |
| txt-placeholder | `oklch(0.488 0.02 262)` | #5a606c | `oklch(0.73 0.022 262)` | #a0a8b6 | was #8b93a3 / #737c8d |
| txt-disabled (exempt) | `oklch(0.68 0.018 262)` | #9299a4 | `oklch(0.55 0.026 263)` | #6a7281 | |
| accent fill | `oklch(0.7971 0.1339 211.53)` | #22d3ee | same | #22d3ee | = |
| accent fill hover | `oklch(0.7148 0.1257 215.22)` | #06b6d4 | same | | = |
| accent fill active | `oklch(0.66 0.118 218)` | #04a3c2 | same | | was #0891b2 |
| on-accent (ink) | `oklch(0.2674 0.042 213.14)` | #062b32 | same | | new token, same colour |
| accent text / link | `oklch(0.48 0.085 225)` | #136782 | `oklch(0.7971 0.1339 211.53)` | #22d3ee | light was #0891b2 (3.68) |
| accent text hover | `oklch(0.42 0.075 228)` | #11556d | `oklch(0.8651 0.1153 207.08)` | #67e8f9 | |
| accent subtle / hover / active | #ecfeff / #cffafe / #a5f3fc (exact OKLCH) | | #082f36 / #0b3d45 / #0e5661 | | = |
| selection border (`--border-accent-strong`) | `oklch(0.6089 0.1109 221.72)` | #0891b2 | `oklch(0.7971 0.1339 211.53)` | #22d3ee | dark was = focus |
| focus ring | `oklch(0.5 0.09 224)` | #0f6e89 | `oklch(0.8651 0.1153 207.08)` | #67e8f9 | light was #0891b2 |
| icon accent-subtle | `oklch(0.6 0.11 222)` | #058eaf | `oklch(0.8651 0.1153 207.08)` | #67e8f9 | light was #22d3ee (1.81) |
| on-color (restored) | `var(--neutral-100)` = `oklch(0.9876 0.0017 247.84)` | #fafbfc | `var(--neutral-white)` = `oklch(0.9814 0.0045 258.32)` | #f7f9fc | |

Minimum contrast per text role across 18 backgrounds (current → proposed):

| Theme | tertiary | placeholder | accent text |
|---|---|---|---|
| light | 3.21 → 4.76 | 2.05 → 4.60 | 2.45 → 4.54 |
| dark | 3.38 → 5.26 | 2.48 → 4.64 | 4.61 → 5.41 |

Primary and secondary pass in both versions. Separation proposed:

| Pair | light | dark |
|---|---|---|
| layer-1 vs s2 | 1.07 | 1.07 |
| hover vs l1 | 1.11 | 1.11 |
| selected vs s2 | 1.26 | 1.34 |
| selected vs s1 | 1.36 | 1.44 |
| transparent-selected vs s1 | 1.27 | 1.46 |

The neutral and brand scales are re-aligned to the roles, so that tokens PPM does not bridge and the Plane contrast
variants map sensibly (`tokens.proposed.css:83-110`, `:153-179`):

- light n900 = placeholder, n1000 = tertiary, n1100 = secondary, n800 = control border, n700 = disabled;
- dark n700 = control border, n900 = placeholder, n1000 = tertiary, n1100 = secondary.

This also fixes `--txt-link-secondary`: light `n900` at `:322`, dark `n1100` at `:572`.

Extra, for acceptance #2 "any text token" (`status-text.mjs` / `.out.txt`, `status-fix.mjs`). Plane status text is not
bridged and fails on PPM surfaces:

- light `--txt-success-secondary` #00a63e: 2.36–3.22;
- light `--txt-warning-secondary` #e17100: 2.35–3.20;
- light `--txt-danger-secondary` #e7000b: 3.50–4.77;
- dark `--txt-danger-secondary` #ff6467: 3.99 on layer-2-selected.

Optional PPM-gated bridge, all minimums ≥ 4.5 on every surface:

- light success-secondary `oklch(0.48 0.125 150)` (#117034, min 4.52);
- light warning-secondary `oklch(0.5 0.138 46)` (#a04305, min 4.66);
- light danger-secondary `var(--red-800)` (#c10007, min 4.71);
- dark danger-secondary `oklch(0.76 0.14 21)` (#fd8a8a, min 4.86).

The matching `--txt-icon-*-secondary` tokens take the same values.

The full proposed file is `tokens.proposed.css`. The contract-test runner and the Tailwind compile both parse it.

## 5. Focus ring (task 4)

**Why the base rule loses.** `tokens.css:228-232` sits inside `@layer base`: compiled at offset 49018, ahead of
`@layer components` at 49105. Tailwind utilities live in `@layer utilities`, which comes later in the layer order, so
they win **regardless of specificity**. The competing utilities (compiled):

- `.shadow-raised-100{--tw-shadow:…;box-shadow:var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}`
- `.ring-0{--tw-ring-shadow:…0 0 0 calc(0px + …);box-shadow:…}`
- `.focus\:ring-1:focus{…box-shadow:…}`, `.shadow-none{…}`
- `.focus-visible\:outline-none:focus-visible{--tw-outline-style:none;outline-style:none}` and
  `.focus\:outline-none:focus{…}`. These kill any outline-based ring, so "switch to outline in base" does not work
  either.

Where focus is invisible today (brand on):

- **Propel `Button` secondary**: `button/helper.tsx:21-22` is `shadow-raised-100`, and base `:11` adds
  `focus-visible:outline-none`. That is 104 `variant="secondary"` in apps/web, including the "Cancel" button in
  `ui/src/modals/alert-modal.tsx:96`, and "Отображение" and "Аналитика" in the work items header (live A-work). The
  destructive button next to Cancel keeps its ring, but it has `tabIndex={1}` at `:99`, a positive tabindex smell.
- **Propel `IconButton` secondary**: `icon-button/helper.tsx:22-23` (`shadow-raised-100`).
- **Propel and ui `Input` `mode="true-transparent"`**: `propel/src/input/input.tsx:43`, `ui/src/form-fields/input.tsx:43`
  (`ring-0`). Mode `transparent` (`:41`) shows its own 1 px `focus:ring-1 focus:ring-accent-strong` instead of the PPM
  ring. The same holds for ui textarea `:49-51`.
- **Borderless search and title inputs.** Modal search fields use `outline-none focus:ring-0` or `ring-0`:
  `core/modals/bulk-delete-issues-modal.tsx:179`, `existing-issues-list-modal.tsx:154`,
  `inbox/modals/select-duplicate.tsx:143`, `project/multi-select-modal.tsx:95`, `issues/parent-issues-list-modal.tsx:107`,
  `issues/title-input.tsx:153`, `estimates/inputs/*`. This is deliberate upstream design, so the proposal keeps it.
- **Vault upload.** The `<input class="sr-only">` inside a label sits at `ppm-vault/route.tsx:389`; the ring is drawn
  on a 1×1 px element (live A-knowledge).
- **Colour identical to selection.** Dark focus = `--border-accent-strong` = `--txt-accent-secondary` =
  `--txt-link-primary-hover` = `#67e8f9` (`tokens.css:198,206,214,216`). In light, focus = `#0891b2` = accent text =
  selection border (`:42,109,116,126`).
- **PPM nav items.** `focus-visible:outline-accent-primary` is a dead class, absent from the compiled CSS. Used at
  `ppm-shell/project-feature-page.tsx:115,144,151,206`, `workspace/sidebar/project-navigation.tsx:132`,
  `navigation/top-nav-power-k.tsx:255` and `navigation/tab-navigation-overflow-menu.tsx:41,67,81,102`. The outline
  falls back to `currentColor`. `apps/web/tests/navigation/navigation-accessibility.test.tsx:166,184` only asserts the
  class string.

**Proposed fix** (`tokens.proposed.css:262-302`). The compile check shows the rule after the generated utilities, at
43520 > 43107:

1. Keep a **base-layer** ring for text-entry only, via `:where(input:not([type="hidden"]), select, textarea)`. Behaviour
   stays identical to today, so the deliberate `focus:ring-0` opt-outs keep working.
2. Add `@layer utilities` with `html[data-ppm-brand="enabled"] :where(a[href], button, summary,
   input:is([type=checkbox|radio|button|submit|reset|file|range|color]), [tabindex]:not([tabindex="-1"], input, select,
   textarea, [contenteditable])):focus-visible`. Specificity is (0,2,1), which beats `.shadow-*` and `.ring-0` at
   (0,1,0) and `focus-visible:outline-none` and `focus:ring-*` at (0,2,0). The rule sets
   `--tw-ring-offset-shadow: 0 0 0 2px var(--ppm-color-focus-gap)` and
   `--tw-ring-shadow: 0 0 0 4px var(--ppm-color-focus)`, and writes Tailwind's full `box-shadow` composition. Elevation
   (`--tw-shadow`) survives: the secondary button keeps `shadow-raised-100` and gains the ring. `tabindex="-1"`
   containers, such as modal panels and the tldraw container, are excluded.
3. Add `label:has(> input.sr-only:focus-visible)` so the ring shows around the visible label.
4. Add `@media (forced-colors: active)` with `outline: 2px solid CanvasText`, because box-shadow disappears in
   high-contrast mode.
5. Set the gap colour to `--ppm-color-focus-gap: var(--ppm-color-surface-1)`, not `--bg-canvas`. That removes the grey
   halo on white cards.
6. Make focus distinct from selection:
   - Selection = background fill (layer-*-selected) plus `--border-accent-strong: var(--ppm-color-selection)`.
   - Focus = a gapped ring in `--ppm-color-focus`.
   - Light: focus #0f6e89 vs selection #0891b2 (1.59:1 apart, plus shape).
   - Dark: focus #67e8f9 vs selection #22d3ee (shape).

Unlayered CSS still wins where it defines focus itself, as today: `ppm-canvas/canvas.css` (imported unlayered at
`editor.tsx:126`) and `tldraw/tldraw.css` (0 `@layer`, `editor.tsx:124`, `.tlui-button:focus-visible` at `:1863`).

## 6. Contrast themes (task 5)

Plane (compiled):

- `:is(:root,:host):where([data-theme=dark-contrast],[data-theme=dark-contrast] *)` has specificity (0,1,0). It sits at
  offset 40732, before the PPM blocks.
- `light-contrast` is the same, at 41358.

PPM today:

| Selector | Line | Specificity |
|---|---|---|
| `html[data-ppm-brand="enabled"]` | `:39` | (0,1,1) |
| `[data-ppm-brand="enabled"] [data-theme*="light"]` | `:40` | (0,2,0) |
| `html[data-ppm-brand="enabled"][data-theme*="dark"]` | `:130` | (0,2,1) |
| `[data-ppm-brand="enabled"] [data-theme*="dark"]` | `:131` | (0,2,0) |

Result: the brand overrides `--border-*` in contrast themes too.

- A plain `:where()` rewrite, for example `:where(html)[data-ppm-brand]` at (0,1,0), still overrides the contrast
  borders, because it comes later in source.
- Wrapping everything in `:where(...)` to reach (0,0,0) would lose to Plane's `:root` block entirely.

The proposal (`tokens.proposed.css:47-48`, `:118-119`, `:187-188`, `:233-234`):

- Role blocks: `:where(html)[data-ppm-brand="enabled"]` and
  `:where(html)[data-ppm-brand="enabled"]:where([data-theme*="dark"])`, both (0,1,0). They win over Plane's
  `:root`/dark by source order. The nested forms are `:where([data-ppm-brand="enabled"]) [data-theme*="light|dark"]`.
- A theme-agnostic bridge block (`--bg-*`, `--txt-*`), specificity (0,1,0). It also matches nested `[data-theme]`
  elements, so values re-resolve inside `ThemeSmoke` sections and the toast viewport.
- Borders go into `:where(html)[data-ppm-brand="enabled"]:not([data-theme$="-contrast"])` plus nested
  `:is([data-theme="light"],[data-theme="dark"])`. With `light-contrast` or `dark-contrast`, Plane's `@variant
  *-high-contrast` borders apply and resolve through PPM neutrals.
- Light `--brand-default: var(--ppm-color-accent-text)`, so the light-contrast `--border-accent-strong`
  (`variables.css:679`) becomes #136782 instead of #22d3ee (1.8:1). `--brand-default` is otherwise used only by tokens
  PPM already bridges; there are 0 direct usages in code.

Verified by cascade simulation (`tw-dump.mjs` → `compiled-{current,proposed}.css` → `cascade-sim.mjs` +
`cascade-run.mjs` → `cascade-run.out.txt`):

- `data-ppm-brand="disabled"`: **0 differences** between current and proposed in all 4 themes. The gate holds.
- Borders vs surface-1 with the brand on:

  | Theme | current | proposed |
  |---|---|---|
  | light | 1.20 / 1.41 / 1.67 / 2.04 | 1.35 / 3.63 / 3.94 / 4.85 |
  | dark | 1.26 / 1.26 / 1.48 / 1.77 | 1.32 / 3.69 / 4.02 / 4.95 |
  | **light-contrast** | 1.20 … 2.04 (the same as light, so the theme is broken) | **16.88 / 8.43 / 6.65 / 6.32** |
  | **dark-contrast** | 1.26 … 1.77 (broken) | **14.88 / 10.24 / 8.49 / 7.49** |

- Resolved labels:

  | Pair | current | proposed |
  |---|---|---|
  | light on-color / danger / danger-active | 3.15 / 1.80 | 4.60 / 8.06 |
  | dark on-color / danger / danger-active | 1.80 / 3.15 | 7.92 / 4.52 |
  | ink / accent-active | 4.08 | 5.02 |

- `custom` theme: `data-theme="custom"` matches the light block and the border guard, as today. The inline `--neutral-*`,
  `--brand-*` and `--txt-on-color` from `utils/src/theme/theme-application.ts:121-137` still win by inline priority.

## 7. Tests (task 6)

`packages/ppm-brand/src/__tests__/brand.test.ts`: the working tree differs from HEAD only in the shell and attribution
sections. The token part:

```ts
132 describe("PPM token bridge", () => {
133   it("keeps cyan as the single primary accent", () => {
134     expect(PPM_BRAND.accentColor).toBe("#22D3EE");
135     expect(tokenSource).toContain("--ppm-color-accent: #22d3ee");                 // breaks if literal -> OKLCH
136     expect(tokenSource).toContain("--bg-accent-primary: var(--ppm-color-accent)"); // still true (bridge)
137   });
139   it("is gated and provides Graphite and Light semantic surfaces", () => {
140     expect(tokenSource).toContain('[data-ppm-brand="enabled"]');
141     expect(tokenSource).toContain("--ppm-color-canvas: #0e0f12");                // breaks (OKLCH)
142     expect(tokenSource).toContain("--ppm-color-canvas: #eef0f3");                // breaks (OKLCH)
143     expect(tokenSource).toContain("--border-accent-strong: var(--ppm-color-focus)"); // encodes the focus==selection bug
144   });
146   it("keeps representative text and focus combinations above WCAG AA", () => {
147     expect(contrastRatio("#1A1D23", "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
148     expect(contrastRatio("#E7EAF0", "#15171C")).toBeGreaterThanOrEqual(4.5);
149     expect(contrastRatio("#062B32", "#22D3EE")).toBeGreaterThanOrEqual(4.5);
150     expect(contrastRatio("#0891B2", "#FFFFFF")).toBeGreaterThanOrEqual(3);          // accent text at 3:1 only
151     expect(contrastRatio("#67E8F9", "#0E0F12")).toBeGreaterThanOrEqual(3);
152   });
153 });
170-188 contrastRatio / relativeLuminance helpers (hex only)
```

`packages/ppm-brand/src/index.ts:7-8` holds `themeColor: "#0E0F12"` and `accentColor: "#22D3EE"`. Both stay unchanged.

Proposed updates:

- `:135` → `toContain("--ppm-color-accent: oklch(0.7971 0.1339 211.53)")`. Better: resolve and compare to `#22d3ee` with
  the helper below.
- `:141-142` → the OKLCH literals `oklch(0.1687 0.0065 271.01)` and `oklch(0.9545 0.0046 258.32)`, or resolved hex.
- `:143` → `toContain("--border-accent-strong: var(--ppm-color-selection)")`, plus assert focus ≠ selection.
- `:150` → `contrastRatio("#136782", "#FFFFFF") >= 4.5`, the new light accent text.
- Add the describe block from `brand-contract.test.proposed.ts`. It is self-contained: it parses `tokens.css` and
  converts OKLCH to sRGB. It covers:
  - per theme, every text role ≥ 4.5 on 12 surfaces and states;
  - ink ≥ 4.5 on the three accent states; `--txt-on-color` ≠ `#062b32` and ≥ 4.5 on the three Plane danger fills;
  - control, strong and emphasis borders ≥ 3 on five backgrounds; layer-1/s2 ≥ 1.07; hover ≥ 1.10;
    selected/s2 ≥ 1.25; layer-2-selected ≥ 1.25;
  - focus ≥ 3 and ≠ selection;
  - dark elevation order;
  - the same role set in both themes, which guards against a light value leaking into dark;
  - no `--border-*` in role or bridge blocks, a guard containing `:not([data-theme$="-contrast"])`, and no
    `html[data-ppm-brand="enabled"][data-theme` selector;
  - the focus ring inside `@layer utilities`.

  Verified:
  - runner (`runner/__tests__/brand-contract.test.ts` with a vitest shim): **12/12 pass** on `tokens.proposed.css`;
    on the current `tokens.css` it throws "rule not found", as it should (red);
  - type-checks under the ppm-brand strict config (`tscheck/`, tsc 5.8.3, exit 0).

Other tests in this area:

- `apps/web/tests/navigation/navigation-accessibility.test.tsx:166,184` asserts class strings only, so token changes do
  not affect it.
- `apps/web/e2e/ppm-canvas-collaboration.spec.ts:1024-1040` runs Axe WCAG A/AA on `.ppm-canvas-workspace`, including
  color-contrast. It will catch a `canvas.css` on-color regression. It needs a live stack.
- No unit tests assert `text-on-color` or Propel button classes. Propel and ui have Storybook stories only.

## 8. Concrete diff list (file:line)

1. `packages/ppm-brand/src/tokens.css:1-233` → replace with `scratchpad/ux02/map/tokens.proposed.css`:
   - role blocks rewritten with `:where()` (`:39-40`, `:130-131`);
   - `--txt-on-color` changed (`:118`, `:207`);
   - bridge collapsed into one block;
   - borders guarded (old `:105-110`, `:194-199`);
   - scoped ink rule added;
   - focus split between base (text entry) and utilities (`:228-232`);
   - PPM `--ppm-color-*` role names added. Only `tokens.css` and `brand.test.ts` reference `--ppm-color-*`; there are
     0 external consumers.
2. `packages/tailwind-config/variables.css:845+` adds
   `--text-color-on-accent: var(--txt-on-accent, var(--txt-on-color));`. It is inert without the brand.
3. Explicit switches:

   | File:line | Change |
   |---|---|
   | `packages/propel/src/button/helper.tsx:16` | `text-on-color` → `text-on-accent` |
   | `packages/propel/src/icon-button/helper.tsx:17` | same |
   | `packages/propel/src/toolbar/toolbar.tsx:133` | same |
   | `packages/ui/src/button/helper.tsx:47` | same |
   | `packages/ui/src/badge/helper.tsx:53` | same (optional) |
   | `packages/ui/src/form-fields/checkbox.tsx:55` | **required** |
   | `packages/propel/src/styles/react-day-picker.css:19` | **required** |
   | `packages/propel/src/avatar/avatar.tsx:117` | **required** |
   | `apps/web/core/components/ppm-canvas/canvas.css:411,514,609,681,2419,2565,2634,3177,3994,4490` | **required**, see the I0.6 stop rule |
   | PPM-owned TSX from §3.1 A | recommended |

4. Misuse fixes (§3.1 F), upstream files:

   | File:line | Change |
   |---|---|
   | `modules/analytics-sidebar/root.tsx:192` | → `text-secondary` |
   | `project/settings/member-columns.tsx:69` | → `text-secondary` |
   | `exporter/column.tsx:38` | → `bg-layer-3 text-secondary` |
   | `profile/activity/activity-list.tsx:55,58,137` | → `bg-layer-3 text-secondary` |
   | `packages/propel/src/toast/toast.tsx:96,102` | → `text-secondary` |

5. PPM call sites that use `bg-layer-1` as hover or selected inside `bg-surface-2` (tokens alone give only 1.07):

   | File:line | Change |
   |---|---|
   | `ppm-vault/route.tsx:1162` | `data-[active=true]:bg-layer-1` → `data-[active=true]:bg-layer-1-selected` |
   | `ppm-vault/route.tsx:1188` | `data-[selected=true]:bg-layer-1` → `data-[selected=true]:bg-layer-1-selected`; `hover:bg-layer-1` → `hover:bg-layer-1-hover` |
   | `ppm-vault/route.tsx:375,384,455,463,513,531,559,798,858,930,1004` | `hover:bg-layer-1` → `hover:bg-layer-1-hover` |
   | `ppm-admin/admin-center.tsx:494` | `shadow-sm bg-layer-1` → `bg-layer-1-selected`; `shadow-sm` is dead |
   | `ppm-admin/admin-center.tsx:495` | `hover:bg-layer-1/60` → `hover:bg-layer-1-hover` |
   | `ppm-shell/project-feature-page.tsx:206` | `hover:bg-layer-1` → `hover:bg-layer-1-hover` |

   Upstream issue rows in `issues/issue-layouts/list/block.tsx:182-188` have two invisible states:
   - hover `bg-layer-transparent-hover` is fixed by the token (1.14–1.22);
   - peeked `border-accent-strong` has no border width;
   - bulk-selected `bg-accent-primary/5` is only 1.03 light and 1.09 dark.

   Both need call-site changes (owner question).
6. Optional: status-text bridge (§4 extra).
7. `packages/ppm-brand/src/__tests__/brand.test.ts:135,141-143,150` updated, plus the new contract block.

## 9. What can break and how to check it

- **Restoring `--txt-on-color`.**
  - Risk: every consumer that is not on a fill and not an explicit switch flips. Missing any §3.1 B site gives light
    text on cyan at 1.5–1.7:1: canvas buttons, checkbox ticks, the selected date in pickers, Avatar initials. The
    §3.1 F list flips visibility.
  - Check: grep `var(--txt-on-color)|var(--text-color-on-color)` must return 0 hits next to accent fills; the
    contract test; the Canvas Axe e2e; visual checks of the date picker (issue due date), a filter checkbox,
    `/profile/<id>` activity, module sidebar close, a loading toast, a delete confirmation (AlertModalCore) and
    project cards with a cover, in both themes.
- **Scoped ink rule.**
  - Risk: it depends on class names. `bg-(--bg-accent-primary)` or custom CSS is not covered. A danger fill nested
    inside a `.bg-accent-primary` container would get ink (none found).
  - Check: the grep above plus review.
- **Control borders ≥ 3:1** (`border-subtle-1`, `border-strong`, `border-strong-1`).
  - Risk: a visibly heavier look on:
    - Propel Input and ui inputs, textarea, custom-select and search-select;
    - tooltips (`propel/tooltip/root.tsx:59`), context menus (`ui/dropdowns/context-menu/*`), custom-menu
      (`border-strong-1`);
    - spreadsheet grid 0.5 px lines (`spreadsheet/issue-row.tsx:275`, `updated-on-column.tsx:23`) and avatar-group
      rings;
    - Propel tabs selected (`tabs.tsx:96`), secondary buttons (`border-strong`), checkboxes and radios, gantt sidebar.
  - Check: screenshots of Tasks list and spreadsheet, the issue page, modals and the settings forms in both themes.
    The owner decides whether heavy is acceptable (§12).
- **Dark layer-2 lighter** (#15171c → #252930).
  - Affects inputs, secondary buttons, toasts, tooltips, project cards (`project/card.tsx:215` `bg-layer-2`) and the
    Propel Dialog.
  - Check: the `/about/brand-foundation` ThemeSmoke (Button, Input, Dialog, Toast in both themes), the Projects page and
    the issue peek.
- **Light layer-1 darker** (#f4f6f9 → #eceef2).
  - `bg-layer-1` has 531 usages; `var(--bg-layer-1)` appears 63 times in `canvas.css`. Group headers, tiles and canvas
    panels become more distinct.
  - Check: Home, Tasks grouped list, Vault, Admin, Canvas panels.
- **Text hierarchy.** In light, tertiary #555d69 ≈ placeholder #5a606c, and secondary is darker (#454e5a).
  - Risk: less hierarchy. Real input placeholders now read almost like content.
  - Check: a visual read of forms and the Tasks list.
- **Accent active** (#0891b2 → #04a3c2). The pressed primary button is lighter. The change is small.
- **Focus rule.**
  - Risk: rings now appear on every secondary, icon and ghost button, link card and `[tabindex="0"]` item where they
    were suppressed. Possible clipping inside `overflow-hidden` rows. Double indicators where components also style
    outline.
  - Check: Tab through Tasks, the issue page, the modal, Vault, Admin and the Canvas toolbar. Canvas and tldraw stay
    as today because they are unlayered.
  - Browser: `:has()` for the label ring and `:not(A, B)` lists; evergreen only.
- **Contrast themes.**
  - Now actually high-contrast with the brand on (intended). `--brand-default` in light only affects the
    light-contrast accent border.
  - Check: switch to "Light/Dark high contrast" in profile appearance.
- **Gating.**
  - Brand off: 0 diffs (simulated). The Tailwind line and the Propel/ui class switches resolve to the same value.
    Admin and Space are unchanged.
  - Check: run with `PPM_BRAND_ENABLED=0` and compare screenshots.
- **Files shared with in-flight work.**
  - `canvas.css`, `editor.tsx` and `route.tsx` are modified by I0.6.
  - `ppm-vault/`, `ppm-git/`, `ppm-admin/` and `ppm-canvas/{workspace,minimal-workspace,…}.tsx` are **untracked**, so
    there is no git safety net.
  - Take a snapshot or commit before editing, and follow the card's stop rule for `ppm-canvas/*`.
- **Existing tests.** `brand.test.ts:135,141,142,143,150` fail until they are updated in the same change.
  `navigation-accessibility.test.tsx` is unaffected.

## 10. Commands

None of these were run by me, per the mapping rules. The baselines below were recorded by the infra mapper in this
folder.

| Command | Baseline |
|---|---|
| `cd plane-fork && pnpm --filter @ppm/brand test` (vitest + `scripts/audit-user-facing-brand.mjs`) | 19/19 tests pass; audit passed, 23 surfaces (`baseline-ppm-brand-vitest.txt`, `baseline-ppm-brand-audit.txt`) |
| `pnpm --filter @ppm/brand check:types` | empty output (`baseline-brand-tsc.txt`) |
| `pnpm --filter web test` | 15 files, 97 tests pass (`baseline-web-vitest.txt`) |
| `cd /Users/ermolov/Desktop/PPM && npm test` (M0.6 guard) and `npx tsc --noEmit` | 653/653 pass (`baseline-root-npm-test.txt`) |
| `pnpm --filter @plane/propel check:types`, `pnpm --filter @plane/ui check:types` | class-string edits only |
| Canvas Axe e2e in `apps/web/e2e/ppm-canvas-collaboration.spec.ts` (`-g "WCAG"`) | needs a running stack |

Scratch scripts, run by me, read-only against the repo:

| Command | Result |
|---|---|
| `node verify-tokens.mjs` | exit 0, 0 hard fails |
| `node verify-tokens.mjs --current` | exit 1, 136 hard fails |
| `node tw-dump.mjs && node cascade-run.mjs` | gate diffs 0; contrast-theme table |
| `node tw-compile-check.mjs proposed` | `text-on-accent` generated; focus rule in utilities after `focus-visible:outline-none` |
| `node runner/__tests__/brand-contract.test.ts` | 12/12 |
| `node upstream-table.mjs` | `upstream-table.md` |
| `node exact-oklch.mjs` | round-trip literals |
| `node status-text.mjs` | status-text check (`status-text.out.txt`) |

## 11. Artifacts in this folder

| File | What it is |
|---|---|
| `color-lib.mjs` | colour maths |
| `verify-tokens.mjs` (+ `verify-tokens.out.txt`, `verify-tokens.current.out.txt`, `proposed-table.md`) | role table and WCAG checks |
| `exact-oklch.mjs` / `.out.txt` | exact literals for unchanged colours |
| `tokens.proposed.css` | full proposed file |
| `brand-contract.test.proposed.ts`, `runner/`, `tscheck/` | proposed tests, runner, type check |
| `tw-compile-check.mjs`, `tw-dump.mjs`, `compiled-current.css`, `compiled-proposed.css` | Tailwind 4.1.17 in-memory compile |
| `cascade-sim.mjs`, `cascade-run.mjs`, `cascade-run.out.txt` | cascade simulation |
| `upstream-table.mjs` / `upstream-table.md` | upstream vs PPM table |
| `on-color-raw.txt`, `on-color-consumers.txt` | on-color grep |
| `status-text.mjs`, `status-fix.mjs`, `status-text.out.txt` | Plane status text |
| `probe2.mjs`, `probe3.mjs`, `explore.mjs`, `current.mjs` | exploration |

## 12. Open questions for the owner

1. **Control borders ≥ 3:1.** Apply them globally in PPM via `--border-subtle-1`, `--border-strong` and
   `--border-strong-1`, which changes tooltips, menus and the spreadsheet grid? Or change only the form controls, which
   needs Propel/ui call sites outside the gate? A third option is to accept 0.5 px widths where the 3:1 colour renders
   lighter on 1× displays.
2. **Light text hierarchy.** "Placeholder ≥ 4.5 on selected rows" forces tertiary ≈ placeholder. Accept that, or limit
   placeholder ≥ 4.5 to non-selected surfaces?
3. **Upstream bug fixes outside the gate.** These fix upstream Plane in both modes: the §3.1 F misuse sites, the toast
   spinner, issue-row peek and selection visibility. Are they allowed, or does the stop rule "меняет экраны Plane вне
   гейта" apply?
4. **Status text tokens.** Bridge `--txt-success-secondary`, `--txt-warning-secondary` and `--txt-danger-secondary`
   under the brand, so acceptance #2 "любой текстовый токен" holds?
5. **Light accent fill.** Keep `#22d3ee` (1.81:1 vs white, a weak button shape) until wave 1?
6. **Dark on-color.** Use `neutral-white`, which deviates from upstream `neutral-1200` so the pressed danger button
   reaches 4.52?
7. **Utility location.** Add `text-on-accent` to the shared `tailwind-config` (one inert line), or use arbitrary
   classes in Propel/ui?
