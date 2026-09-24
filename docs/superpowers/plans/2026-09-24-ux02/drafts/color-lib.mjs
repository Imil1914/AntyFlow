// Shared colour math for UX0.2 token mapping (read-only analysis helper).
// OKLCH -> linear sRGB per Björn Ottosson (OKLab), WCAG 2.x relative luminance.
export const hexToRgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
export function oklchToLinear(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
export function inGamut(L, C, h) {
  return oklchToLinear(L, C, h).every((c) => c >= -1e-4 && c <= 1 + 1e-4);
}
export function oklchToRgb(L, C, h) {
  return oklchToLinear(L, C, h).map((c) => clamp01(toGam(clamp01(c))));
}
export function rgbToOklch(rgb) {
  const [r, g, b] = rgb.map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return [L, C, H];
}
export const rgbToHex = (rgb) => '#' + rgb.map((c) => Math.round(clamp01(c) * 255).toString(16).padStart(2, '0')).join('');
// parse "#hex" | "oklch(L C H)" | "oklch(L C H / a%)" | [r,g,b]
export function parse(c) {
  if (Array.isArray(c)) return c;
  c = c.trim();
  if (c.startsWith('#')) return hexToRgb(c);
  const m = c.match(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/);
  if (m) {
    const L = m[2] === '%' ? +m[1] / 100 : +m[1];
    return oklchToRgb(L, +m[3], +m[4]);
  }
  throw new Error('bad colour ' + c);
}
export const toHex = (c) => rgbToHex(parse(c));
export const lum = (c) => {
  const [r, g, b] = parse(c).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (fg, bg) => {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
// alpha composite (sRGB-space mixing, what browsers do for rgba over opaque)
export const over = (fg, alpha, bg) => {
  const f = parse(fg), b = parse(bg);
  return f.map((c, i) => c * alpha + b[i] * (1 - alpha));
};
export const oklchStr = (L, C, H) => `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
export const hexToOklchStr = (hex) => { const [L, C, H] = rgbToOklch(hexToRgb(hex)); return oklchStr(L, C, H); };
