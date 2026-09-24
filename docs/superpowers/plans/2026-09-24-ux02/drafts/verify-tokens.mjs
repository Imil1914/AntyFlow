// UX0.2 §A — proposed PPM role tokens (OKLCH) and WCAG 2.x verification.
// Run: node verify-tokens.mjs            (exit code 1 if any hard check fails)
// Colour math: ./color-lib.mjs (OKLab/OKLCH -> sRGB, gamut-checked; WCAG relative luminance).
import { contrast, toHex, over, lum, inGamut, rgbToHex, rgbToOklch, hexToRgb } from './color-lib.mjs';
const hx = (h) => { const [L, C, H] = rgbToOklch(hexToRgb(h)); return { L: +L.toFixed(3), C, H, css: h }; };

const ok = (L, C, H) => ({ L, C, H, css: `oklch(${L} ${C} ${H})` });
const NH = 258; // neutral hue kept from current PPM Graphite/Light (H 254-271)

// ---------------------------------------------------------------- PROPOSAL
export const PROPOSED = {
  light: {
    // surfaces & layers
    canvas: ok(0.9545, 0.0046, 258.32),            // was #eef0f3 (0.954) - unchanged look
    'surface-1': ok(1, 0, 0),                // #ffffff
    'surface-2': ok(0.9725, 0.0045, 258.32),       // was #f4f6f9 (0.972)
    'layer-1': ok(0.949, 0.006, NH),          // was = surface-2 (collapsed)
    'layer-1-hover': ok(0.915, 0.008, NH),
    'layer-1-selected': ok(0.896, 0.01, NH),  // also layer-1-active
    'layer-2': ok(1, 0, 0),
    'layer-2-hover': ok(0.965, 0.005, NH),
    'layer-2-selected': ok(0.912, 0.009, NH),
    'layer-3': ok(0.948, 0.006, NH),
    'layer-3-hover': ok(0.915, 0.008, NH),
    'layer-3-selected': ok(0.898, 0.01, NH),
    'layer-disabled': ok(0.935, 0.006, NH),
    // borders
    'border-subtle': ok(0.9, 0.01, NH),      // dividers (decorative, no 3:1 requirement)
    'border-subtle-1': ok(0.62, 0.022, NH),  // form-control boundary >= 3:1
    'border-strong': ok(0.6, 0.022, NH),     // checkbox/radio/secondary button >= 3:1
    'border-strong-1': ok(0.55, 0.022, NH),
    // text
    'txt-primary': ok(0.2303, 0.0125, 264.29),     // #1a1d23 unchanged
    'txt-secondary': ok(0.42, 0.024, 258),
    'txt-tertiary': ok(0.475, 0.022, 262),
    'txt-placeholder': ok(0.488, 0.02, 262),
    'txt-disabled': ok(0.68, 0.018, 262),    // exempt (inactive UI), reported only
    // accent
    'accent-fill': ok(0.7971, 0.1339, 211.53),  // #22d3ee unchanged
    'accent-fill-hover': ok(0.7148, 0.1257, 215.22), // #06b6d4 unchanged
    'accent-fill-active': ok(0.66, 0.118, 218),   // was #0891b2 (ink 4.08:1)
    'on-accent': ok(0.2674, 0.042, 213.14),    // #062b32 unchanged, now scoped to accent fills
    'accent-text': ok(0.48, 0.085, 225),     // was #0891b2 3.68:1
    'accent-text-hover': ok(0.42, 0.075, 228),
    'accent-subtle': ok(0.9841, 0.0189, 200.87),  // ~#ecfeff (brand-100)
    'accent-subtle-hover': ok(0.9563, 0.0443, 203.39), // ~#cffafe
    'accent-subtle-active': ok(0.9167, 0.0772, 205.04), // ~#a5f3fc
    'selection-border': ok(0.6089, 0.1109, 221.72), // #0891b2 as border-accent-strong (>=3:1), no longer = focus
    focus: ok(0.5, 0.09, 224),               // ring, distinct from selection-border by L and by shape (gap ring)
    'icon-accent-subtle': ok(0.6, 0.11, 222),
    // Plane status fills (NOT overridden by PPM; listed for on-color checks)
    'danger-fill': ok(0.583, 0.238666, 28.4765), 'danger-fill-hover': ok(0.5095, 0.208583, 28.513), 'danger-fill-active': ok(0.4446, 0.1774, 26.79),
    'success-fill': ok(0.632, 0.185972, 147.3695), 'warning-fill': ok(0.7724, 0.172798, 65.367),
    'on-color': ok(0.9876, 0.0017, 247.84),     // restored upstream mapping var(--neutral-100) with PPM neutral-100 (#fafbfc)
  },
  dark: {
    canvas: ok(0.1687, 0.0065, 271.01),           // #0e0f12 unchanged
    'surface-1': ok(0.2047, 0.0104, 268.17),       // #15171c unchanged
    'surface-2': ok(0.2345, 0.0124, 264.3),      // #1b1e24 unchanged
    'layer-1': ok(0.2593, 0.0144, 261.67),         // ~#20242b (was = surface-2)
    'layer-1-hover': ok(0.292, 0.016, 262),
    'layer-1-selected': ok(0.325, 0.018, 262),
    'layer-2': ok(0.28, 0.015, 262),         // was surface-1 (darker than layer-1!)
    'layer-2-hover': ok(0.31, 0.017, 262),
    'layer-2-selected': ok(0.345, 0.019, 262),
    'layer-3': ok(0.3, 0.016, 262),
    'layer-3-hover': ok(0.33, 0.018, 262),
    'layer-3-selected': ok(0.355, 0.02, 262),
    'layer-disabled': ok(0.3, 0.016, 262),
    'border-subtle': ok(0.3, 0.018, 264),    // divider (#272b34 was 0.289)
    'border-subtle-1': ok(0.55, 0.026, 262), // form-control boundary >= 3:1
    'border-strong': ok(0.57, 0.026, 262),
    'border-strong-1': ok(0.62, 0.026, 262),
    'txt-primary': ok(0.9365, 0.0087, 264.52),  // #e7eaf0 unchanged
    'txt-secondary': ok(0.82, 0.018, 261),
    'txt-tertiary': ok(0.765, 0.021, 258),
    'txt-placeholder': ok(0.73, 0.022, 262),
    'txt-disabled': ok(0.55, 0.026, 263),
    'accent-fill': ok(0.7971, 0.1339, 211.53),
    'accent-fill-hover': ok(0.7148, 0.1257, 215.22),
    'accent-fill-active': ok(0.66, 0.118, 218),
    'on-accent': ok(0.2674, 0.042, 213.14),
    'accent-text': ok(0.7971, 0.1339, 211.53),  // #22d3ee unchanged
    'accent-text-hover': ok(0.8651, 0.1153, 207.08), // #67e8f9
    'accent-subtle': ok(0.2824, 0.0435, 212.26), // #082f36
    'accent-subtle-hover': ok(0.3323, 0.052, 210.79), // #0b3d45
    'accent-subtle-active': ok(0.4173, 0.0676, 210.7), // #0e5661 unchanged
    'selection-border': ok(0.7971, 0.1339, 211.53), // accent, no longer = focus
    focus: ok(0.8651, 0.1153, 207.08),          // #67e8f9 ring
    'icon-accent-subtle': ok(0.8651, 0.1153, 207.08),
    'danger-fill': ok(0.4446, 0.1774, 26.79), 'danger-fill-hover': ok(0.5095, 0.208583, 28.513), 'danger-fill-active': ok(0.583, 0.238666, 28.4765),
    'success-fill': ok(0.7914, 0.2091, 151.66), 'warning-fill': ok(0.7724, 0.172798, 65.367),
    'on-color': ok(0.9814, 0.0045, 258.32),       // PPM dark neutral-white #f7f9fc (upstream maps neutral-1200; see note)
  },
};


// ---------------------------------------------------------------- CURRENT (tokens.css @ working tree, for baseline)
export const CURRENT = {
  light: { canvas: hx('#eef0f3'), 'surface-1': hx('#ffffff'), 'surface-2': hx('#f4f6f9'), 'layer-1': hx('#f4f6f9'), 'layer-1-hover': hx('#e7ebf0'), 'layer-1-selected': hx('#d5dae1'),
    'layer-2': hx('#ffffff'), 'layer-2-hover': hx('#f4f6f9'), 'layer-2-selected': hx('#e7ebf0'), 'layer-3': hx('#eef0f3'), 'layer-3-hover': hx('#e7ebf0'), 'layer-3-selected': hx('#d5dae1'), 'layer-disabled': hx('#e7ebf0'),
    'border-subtle': hx('#e7ebf0'), 'border-subtle-1': hx('#d5dae1'), 'border-strong': hx('#c2c9d2'), 'border-strong-1': hx('#aeb6c2'),
    'txt-primary': hx('#1a1d23'), 'txt-secondary': hx('#4b5563'), 'txt-tertiary': hx('#6b7280'), 'txt-placeholder': hx('#8b93a3'), 'txt-disabled': hx('#aeb6c2'),
    'accent-fill': hx('#22d3ee'), 'accent-fill-hover': hx('#06b6d4'), 'accent-fill-active': hx('#0891b2'), 'on-accent': hx('#062b32'), 'accent-text': hx('#0891b2'), 'accent-text-hover': hx('#0e7490'),
    'accent-subtle': hx('#ecfeff'), 'accent-subtle-hover': hx('#cffafe'), 'accent-subtle-active': hx('#a5f3fc'), 'selection-border': hx('#0891b2'), focus: hx('#0891b2'), 'icon-accent-subtle': hx('#22d3ee'),
    'danger-fill': hx('#e7000b'), 'danger-fill-hover': hx('#c10007'), 'danger-fill-active': hx('#9f0712'), 'success-fill': hx('#00a63e'), 'warning-fill': hx('#fe9a00'), 'on-color': hx('#062b32') },
  dark: { canvas: hx('#0e0f12'), 'surface-1': hx('#15171c'), 'surface-2': hx('#1b1e24'), 'layer-1': hx('#1b1e24'), 'layer-1-hover': hx('#20242b'), 'layer-1-selected': hx('#272b34'),
    'layer-2': hx('#15171c'), 'layer-2-hover': hx('#1b1e24'), 'layer-2-selected': hx('#20242b'), 'layer-3': hx('#20242b'), 'layer-3-hover': hx('#272b34'), 'layer-3-selected': hx('#303641'), 'layer-disabled': hx('#272b34'),
    'border-subtle': hx('#272b34'), 'border-subtle-1': hx('#272b34'), 'border-strong': hx('#303641'), 'border-strong-1': hx('#3b424f'),
    'txt-primary': hx('#e7eaf0'), 'txt-secondary': hx('#b4bbc7'), 'txt-tertiary': hx('#8b93a3'), 'txt-placeholder': hx('#737c8d'), 'txt-disabled': hx('#3b424f'),
    'accent-fill': hx('#22d3ee'), 'accent-fill-hover': hx('#06b6d4'), 'accent-fill-active': hx('#0891b2'), 'on-accent': hx('#062b32'), 'accent-text': hx('#22d3ee'), 'accent-text-hover': hx('#67e8f9'),
    'accent-subtle': hx('#082f36'), 'accent-subtle-hover': hx('#0b3d45'), 'accent-subtle-active': hx('#0e5661'), 'selection-border': hx('#67e8f9'), focus: hx('#67e8f9'), 'icon-accent-subtle': hx('#67e8f9'),
    'danger-fill': hx('#9f0712'), 'danger-fill-hover': hx('#c10007'), 'danger-fill-active': hx('#e7000b'), 'success-fill': hx('#05df72'), 'warning-fill': hx('#fe9a00'), 'on-color': hx('#062b32') },
};
const MODE = process.argv.includes('--current') ? 'current' : 'proposed';
export const THEMES = MODE === 'current' ? CURRENT : PROPOSED;

// alpha overlays (Plane: light alpha-black oklch(0.1482 0.0034 196.79) / dark alpha-white)
const ALPHA = {
  light: { ink: 'oklch(0.1482 0.0034 196.79)', upstream: { hover: 0.05, active: 0.1, selected: 0.15 }, proposal: { hover: 0.06, active: 0.09, selected: 0.11 } },
  dark: { ink: 'oklch(1 0 0)', upstream: { hover: 0.05, active: 0.1, selected: 0.15 }, proposal: { hover: 0.07, active: 0.1, selected: 0.13 } },
};

// ---------------------------------------------------------------- CHECKS
let fails = 0;
const rows = [];
const hex = (t, k) => toHex(THEMES[t][k].css);
const col = (t, k) => THEMES[t][k].css;
function check(theme, label, fg, bg, min, { hard = true } = {}) {
  const r = contrast(fg, bg);
  const pass = r >= min;
  if (!pass && hard) fails++;
  rows.push(`${theme.padEnd(5)} ${pass ? 'PASS' : hard ? 'FAIL' : 'warn'} ${r.toFixed(2).padStart(5)} >= ${min}  ${label}`);
  return r;
}
function ge(theme, label, a, b, min) { // a must be at least `min` ratio vs b (state separation)
  return check(theme, label, a, b, min);
}

for (const t of ['light', 'dark']) {
  const T = THEMES[t];
  // gamut
  if (MODE === 'proposed') for (const [k, v] of Object.entries(T)) if (!inGamut(v.L, v.C, v.H)) rows.push(`${t} gamut-clip ${k} ${v.css}`);
  const a = ALPHA[t];
  const surfaces = ['canvas', 'surface-1', 'surface-2', 'layer-1', 'layer-1-hover', 'layer-1-selected', 'layer-2', 'layer-2-hover', 'layer-2-selected', 'layer-3', 'layer-3-hover', 'layer-3-selected'];
  const composite = {};
  for (const base of ['surface-1', 'surface-2']) for (const [st, al] of Object.entries(MODE === 'current' ? a.upstream : a.proposal)) composite[`transparent-${st}@${base}`] = over(a.ink, al, col(t, base));
  // 1. text >= 4.5 on every surface and state
  for (const txt of ['txt-primary', 'txt-secondary', 'txt-tertiary', 'txt-placeholder', 'accent-text']) {
    for (const s of surfaces) check(t, `${txt} on ${s}`, col(t, txt), col(t, s), 4.5);
    for (const [k, v] of Object.entries(composite)) check(t, `${txt} on ${k}`, col(t, txt), v, 4.5);
  }
  check(t, 'accent-text-hover on surface-1', col(t, 'accent-text-hover'), col(t, 'surface-1'), 4.5);
  check(t, 'accent-text-hover on layer-1-hover', col(t, 'accent-text-hover'), col(t, 'layer-1-hover'), 4.5);
  for (const s of ['accent-subtle', 'accent-subtle-hover', 'accent-subtle-active']) check(t, `accent-text on ${s}`, col(t, 'accent-text'), col(t, s), 4.5);
  for (const base of ['surface-1', 'canvas']) {
    check(t, `accent-text on accent-fill/20 over ${base} (counter badge)`, col(t, 'accent-text'), over(col(t, 'accent-fill'), 0.2, col(t, base)), 4.5);
    check(t, `accent-text on accent-fill/10 over ${base}`, col(t, 'accent-text'), over(col(t, 'accent-fill'), 0.1, col(t, base)), 4.5);
  }
  for (const s of ['surface-1', 'layer-1', 'layer-1-selected']) check(t, `txt-disabled on ${s} (exempt SC1.4.3)`, col(t, 'txt-disabled'), col(t, s), 3, { hard: false });
  // 2. on-accent ink on accent fills; on-color on danger fills
  for (const f of ['accent-fill', 'accent-fill-hover', 'accent-fill-active']) check(t, `on-accent on ${f}`, col(t, 'on-accent'), col(t, f), 4.5);
  for (const f of ['danger-fill', 'danger-fill-hover', 'danger-fill-active']) check(t, `on-color on ${f}`, col(t, 'on-color'), col(t, f), 4.5);
  for (const f of ['success-fill', 'warning-fill']) {
    check(t, `on-color on ${f} (upstream behaviour, icon 3:1)`, col(t, 'on-color'), col(t, f), 3, { hard: false });
    check(t, `on-accent ink on ${f} (scoped ink, icon 3:1)`, col(t, 'on-accent'), col(t, f), 3);
  }
  // 3. meaningful borders >= 3:1
  for (const b of ['border-subtle-1', 'border-strong', 'border-strong-1']) for (const s of ['canvas', 'surface-1', 'surface-2', 'layer-1', 'layer-2']) check(t, `${b} vs ${s}`, col(t, b), col(t, s), 3);
  for (const s of ['surface-1', 'surface-2', 'layer-2']) check(t, `selection-border vs ${s}`, col(t, 'selection-border'), col(t, s), 3);
  for (const s of ['surface-1', 'surface-2', 'layer-1']) check(t, `icon-accent-subtle vs ${s} (icon 3:1)`, col(t, 'icon-accent-subtle'), col(t, s), 3);
  // 4. focus ring >= 3:1 vs adjacent colours; distinct from selection border
  for (const s of ['canvas', 'surface-1', 'surface-2', 'layer-1', 'layer-1-selected', 'layer-2']) check(t, `focus ring vs ${s}`, col(t, 'focus'), col(t, s), 3);
  check(t, 'focus ring vs accent-fill (with surface gap)', col(t, 'focus'), col(t, 'surface-1'), 3);
  rows.push(`${t.padEnd(5)} info  focus ${hex(t, 'focus')} vs selection-border ${hex(t, 'selection-border')}: ${contrast(col(t, 'focus'), col(t, 'selection-border')).toFixed(2)}:1 (distinct by L + ring-with-gap shape)`);
  // 5. state separation
  ge(t, 'layer-1 vs surface-2 (tile on panel)', col(t, 'layer-1'), col(t, 'surface-2'), 1.07);
  ge(t, 'layer-1 vs surface-1', col(t, 'layer-1'), col(t, 'surface-1'), 1.07);
  ge(t, 'layer-1-hover vs layer-1', col(t, 'layer-1-hover'), col(t, 'layer-1'), 1.1);
  ge(t, 'layer-1-hover vs surface-2', col(t, 'layer-1-hover'), col(t, 'surface-2'), 1.1);
  ge(t, 'layer-1-selected vs surface-2', col(t, 'layer-1-selected'), col(t, 'surface-2'), 1.25);
  ge(t, 'layer-1-selected vs surface-1', col(t, 'layer-1-selected'), col(t, 'surface-1'), 1.25);
  ge(t, 'layer-1-selected vs layer-1', col(t, 'layer-1-selected'), col(t, 'layer-1'), 1.15);
  ge(t, 'layer-1-selected vs layer-1-hover', col(t, 'layer-1-selected'), col(t, 'layer-1-hover'), 1.05);
  ge(t, 'layer-2-hover vs layer-2', col(t, 'layer-2-hover'), col(t, 'layer-2'), 1.1);
  ge(t, 'layer-2-selected vs layer-2', col(t, 'layer-2-selected'), col(t, 'layer-2'), 1.25);
  ge(t, 'layer-3-hover vs layer-3', col(t, 'layer-3-hover'), col(t, 'layer-3'), 1.1);
  ge(t, 'layer-3-selected vs layer-3', col(t, 'layer-3-selected'), col(t, 'layer-3'), 1.15);
  for (const base of ['surface-1', 'surface-2']) {
    ge(t, `transparent-hover vs ${base}`, composite[`transparent-hover@${base}`], col(t, base), 1.1);
    ge(t, `transparent-selected vs ${base}`, composite[`transparent-selected@${base}`], col(t, base), 1.25);
  }
  if (t === 'dark') {
    const l1 = lum(col(t, 'layer-1')), l2 = lum(col(t, 'layer-2')), l3 = lum(col(t, 'layer-3'));
    const okOrder = l2 >= l1 && l3 >= l2;
    if (!okOrder) fails++;
    rows.push(`dark  ${okOrder ? 'PASS' : 'FAIL'} elevation order layer-1 ${hex(t, 'layer-1')} <= layer-2 ${hex(t, 'layer-2')} <= layer-3 ${hex(t, 'layer-3')}`);
  }
  // text hierarchy monotonic
  const order = t === 'light' ? ['txt-primary', 'txt-secondary', 'txt-tertiary', 'txt-placeholder', 'txt-disabled'] : ['txt-primary', 'txt-secondary', 'txt-tertiary', 'txt-placeholder', 'txt-disabled'];
  const Ls = order.map((k) => T[k].L);
  const mono = t === 'light' ? Ls.every((v, i) => i === 0 || v > Ls[i - 1]) : Ls.every((v, i) => i === 0 || v < Ls[i - 1]);
  if (!mono) fails++;
  rows.push(`${t.padEnd(5)} ${mono ? 'PASS' : 'FAIL'} text hierarchy monotonic ${order.map((k) => `${k.replace('txt-', '')}=${T[k].L}`).join(' ')}`);
}

// ---------------------------------------------------------------- TABLE
console.log(`# MODE=${MODE}: PPM role values (OKLCH -> sRGB hex)\n`);
console.log('| role | light OKLCH | light hex | dark OKLCH | dark hex |');
console.log('|---|---|---|---|---|');
for (const k of Object.keys(THEMES.light)) {
  const l = THEMES.light[k], d = THEMES.dark[k];
  console.log(`| ${k} | \`${l.css}\` | ${toHex(l.css)} | \`${d.css}\` | ${toHex(d.css)} |`);
}
for (const t of ['light', 'dark']) {
  const a = ALPHA[t];
  for (const [st, al] of Object.entries(MODE === 'current' ? a.upstream : a.proposal)) console.log(`| layer-transparent-${st} (${t}) | ${a.ink} / ${al * 100}% (upstream ${a.upstream[st] * 100}%) | on s1 ${rgbToHex(over(a.ink, al, col(t, 'surface-1')))} | | |`);
}
console.log('\n# Checks\n');
for (const r of rows) console.log(r);
console.log(`\nHARD FAILS: ${fails}`);
process.exitCode = fails ? 1 : 0;
