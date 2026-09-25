// PPM · Гибрид A+B — единственный источник значений для всех H-артбордов и TOKENS.md.
// Основа — «Тихий графит» (A), светлая пара — «бумага и тушь» (B), приёмы B/C.

// ---------- OKLCH <-> sRGB ----------
export function oklchToRgb(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return [r, g, bb];
}
const enc = (x) => { x = Math.min(1, Math.max(0, x)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055; };
const dec = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export function hex(L, C, H) {
  const rgb = oklchToRgb(L, C, H);
  return '#' + rgb.map((x) => Math.round(enc(x) * 255).toString(16).padStart(2, '0')).join('');
}
export function inGamut(L, C, H) { return oklchToRgb(L, C, H).every((x) => x >= -0.0015 && x <= 1.0015); }
export function hexToOklch(h) {
  h = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => dec(parseInt(h.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI; if (H < 0) H += 360;
  return [L, C, C < 0.002 ? 0 : H];
}
export function lum(h) {
  h = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => dec(parseInt(h.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function cr(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
export function mix(a, b, t) { // t = доля a, смешение в sRGB (как альфа-наложение)
  const p = (h) => [0, 2, 4].map((i) => parseInt(h.replace('#', '').slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v * t + B[i] * (1 - t)).toString(16).padStart(2, '0')).join('');
}
export const fmtOk = (L, C, H) => `oklch(${+L.toFixed(3)} ${+C.toFixed(3)} ${Math.round(H)})`;

// ---------- токены цвета ----------
// [имя, группа, роль по-русски, тёмная [L,C,H], светлая [L,C,H], мост Plane]
// «mix:<a>:<b>:<t>» — наложение a на b с долей t (альфа), для подложки выделения.
const HD = 70;   // тон графита
const HP = 80;   // тон бумаги (светлые поверхности)
const HI = 70;   // тон туши (светлый текст и границы)
const HA = 212;  // тон акцента (тёмная)
const HL = 228;  // тон акцента (светлая: затемнённый голубой без ухода в бирюзу)
export const COLOR = [
  // Поверхности
  ['--ppm-color-canvas', 'bg', 'Фон приложения: верхняя панель и поля вокруг рабочей панели', [0.172, 0.004, HD], [0.952, 0.007, HP], '--bg-canvas'],
  ['--ppm-color-surface-1', 'bg', 'Рабочая панель: сайдбар, список, правая колонка', [0.2, 0.005, HD], [0.986, 0.004, HP], '--bg-surface-1'],
  ['--ppm-color-surface-2', 'bg', 'Полосы групп, шапка таблицы, вторичные панели', [0.226, 0.006, HD], [0.966, 0.006, HP], '--bg-surface-2'],
  ['--ppm-color-layer-1', 'bg', 'Приподнятое: поле ввода, карточка, всплывающее меню', [0.252, 0.006, HD], [1, 0, 0], '--bg-layer-1 · --bg-layer-2'],
  ['--ppm-color-layer-1-hover', 'bg', 'Наведение на строку, пункт, кнопку', [0.276, 0.007, HD], [0.945, 0.007, HP], '--bg-layer-1-hover · --bg-layer-transparent-hover'],
  ['--ppm-color-layer-1-selected', 'bg', 'Нажато, активный пункт навигации', [0.302, 0.007, HD], [0.922, 0.008, HP], '--bg-layer-1-selected · --bg-layer-1-active'],
  // Границы
  ['--ppm-color-border', 'border', 'Разделитель (декоративный, без требования 3:1)', [0.34, 0.008, HD], [0.888, 0.008, HI], '--border-subtle'],
  ['--ppm-color-border-control', 'border', 'Граница поля, чипа, переключателя — не ниже 3:1', [0.54, 0.008, HD], [0.6, 0.01, HI], '--border-subtle-1'],
  ['--ppm-color-border-strong', 'border', 'Граница при наведении на поле', [0.6, 0.008, HD], [0.54, 0.01, HI], '--border-strong'],
  // Текст и иконки
  ['--ppm-color-text', 'text', 'Основной текст', [0.955, 0.004, HD], [0.22, 0.008, HI], '--txt-primary · --txt-icon-primary'],
  ['--ppm-color-text-secondary', 'text', 'Вторичный текст, пункты навигации', [0.84, 0.006, HD], [0.38, 0.01, HI], '--txt-secondary · --txt-icon-secondary'],
  ['--ppm-color-text-muted', 'text', 'Приглушённый: метаданные, подписи, счётчики', [0.73, 0.007, HD], [0.48, 0.01, HI], '--txt-tertiary · --txt-icon-tertiary'],
  ['--ppm-color-text-placeholder', 'text', 'Подсказка в пустом поле', [0.7, 0.007, HD], [0.5, 0.01, HI], '--txt-placeholder'],
  ['--ppm-color-icon-subtle', 'text', 'Тихие иконки и шевроны — не ниже 3:1', [0.63, 0.008, HD], [0.56, 0.01, HI], '— (новый)'],
  ['--ppm-color-text-disabled', 'text', 'Недоступное (исключение WCAG 1.4.3)', [0.52, 0.008, HD], [0.68, 0.008, HI], '--txt-disabled'],
  // Акцент
  ['--ppm-color-accent', 'accent', 'Основное действие, знак «живой» карточки', [0.8, 0.1, HA], [0.49, 0.09, HL], '--bg-accent-primary'],
  ['--ppm-color-accent-hover', 'accent', 'Основное действие: наведение', [0.86, 0.085, HA], [0.44, 0.085, HL], '--bg-accent-primary-hover'],
  ['--ppm-color-accent-active', 'accent', 'Основное действие: нажатие', [0.74, 0.1, HA], [0.4, 0.08, HL], '--bg-accent-primary-active'],
  ['--ppm-color-accent-text', 'accent', 'Ссылки и текст акцента', [0.8, 0.1, HA], [0.49, 0.09, HL], '--txt-accent-primary · --txt-link-primary'],
  ['--ppm-color-on-accent', 'accent', 'Текст и иконки на акценте', [0.2, 0.03, HA], [0.99, 0.004, HP], '--txt-on-accent'],
  ['--ppm-color-focus', 'accent', 'Кольцо фокуса 2 px (с зазором 2 px)', [0.86, 0.085, HA], [0.44, 0.085, HL], '--ppm-color-focus'],
  ['--ppm-color-selection', 'accent', 'Рамка выделения 1 px, маркеры', [0.8, 0.1, HA], [0.49, 0.09, HL], '--border-accent-strong'],
  ['--ppm-color-selection-bg', 'accent', 'Подложка выделенной строки/карточки (акцент 14 %)', 'mix:--ppm-color-accent:--ppm-color-surface-1:0.14', 'mix:--ppm-color-accent:--ppm-color-surface-1:0.1', '--bg-accent-subtle'],
  // Сигнал
  ['--ppm-color-danger', 'signal', 'Опасная кнопка (заливка)', [0.5, 0.135, 25], [0.52, 0.165, 27], '--bg-danger-primary'],
  ['--ppm-color-on-danger', 'signal', 'Текст на опасной кнопке', [0.955, 0.004, HD], [0.99, 0.004, HP], '--txt-on-color'],
  ['--ppm-color-danger-text', 'signal', 'Текст «Блокирует», «Конфликт версий»', [0.74, 0.12, 25], [0.52, 0.165, 27], '--txt-danger-primary'],
  ['--ppm-color-danger-line', 'signal', 'Линия «Блокирует» и «Противоречит»', [0.68, 0.13, 25], [0.56, 0.17, 28], '--border-danger-strong'],
  ['--ppm-color-warning', 'signal', 'Предупреждение (тот же тон, что «В работе»)', [0.8, 0.11, 75], [0.56, 0.115, 68], '--txt-warning-primary'],
  ['--ppm-color-success', 'signal', 'Успех, проверки пройдены', [0.76, 0.11, 150], [0.53, 0.115, 150], '--txt-success-primary'],
  // Статусы задач (глиф: форма + цвет + слово)
  ['--ppm-status-backlog', 'status', 'Бэклог — пунктирный круг', 'ref:--ppm-color-icon-subtle', 'ref:--ppm-color-icon-subtle', ''],
  ['--ppm-status-todo', 'status', 'К работе — пустой круг', 'ref:--ppm-color-text-secondary', 'ref:--ppm-color-text-secondary', ''],
  ['--ppm-status-progress', 'status', 'В работе — половина', [0.8, 0.11, 75], [0.6, 0.12, 70], ''],
  ['--ppm-status-review', 'status', 'На проверке — три четверти', [0.76, 0.1, 300], [0.53, 0.12, 305], ''],
  ['--ppm-status-done', 'status', 'Готово — заливка и галка', [0.76, 0.11, 150], [0.55, 0.12, 150], ''],
  ['--ppm-status-cancelled', 'status', 'Отменена — круг с крестом', 'ref:--ppm-color-icon-subtle', 'ref:--ppm-color-icon-subtle', ''],
  // Типы объектов (равная светлота: тёмная L 0,76 · C 0,07; светлая L 0,52 · C 0,08)
  ['--ppm-type-task', 'type', 'Задача', [0.76, 0.07, 265], [0.52, 0.08, 265], '--ppm-node-task'],
  ['--ppm-type-doc', 'type', 'Документ', [0.76, 0.07, 330], [0.52, 0.08, 330], ''],
  ['--ppm-type-file', 'type', 'Файл Хранилища', [0.76, 0.07, 95], [0.52, 0.08, 95], ''],
  ['--ppm-type-code', 'type', 'Код: PR, ветка', [0.76, 0.07, 40], [0.52, 0.08, 40], ''],
  ['--ppm-type-decision', 'type', 'Решение', [0.76, 0.07, 160], [0.52, 0.08, 160], '--ppm-node-decision'],
  // Проект (цвет команды — только глиф/аватар)
  ['--ppm-project-avatar-bg', 'project', 'Аватар проекта: подложка (тон команды, ROBOT = 135)', [0.34, 0.045, 135], [0.91, 0.045, 135], ''],
  ['--ppm-project-avatar-fg', 'project', 'Аватар проекта: буква', [0.86, 0.08, 135], [0.4, 0.08, 135], ''],
  // Холст
  ['--ppm-color-board', 'board', 'Поверхность доски Холста', [0.172, 0.004, HD], [0.975, 0.008, HP], 'tldraw `--color-background` (сейчас `--bg-surface-1`)'],
  ['--ppm-color-board-grid', 'board', 'Точки сетки (декор)', [0.3, 0.006, HD], [0.87, 0.012, HP], 'сетка tldraw `--color-grid`'],
  ['--ppm-color-section-tick', 'board', 'Угловые засечки секции', [0.63, 0.008, HD], [0.56, 0.01, HI], '— (новый)'],
  ['--ppm-color-link', 'board', 'Смысловая связь 1,5 px', [0.73, 0.007, HD], [0.48, 0.01, HI], '— (новый)'],
  ['--ppm-color-link-visual', 'board', 'Визуальная стрелка 1 px', [0.54, 0.008, HD], [0.6, 0.01, HI], '— (новый)'],
  // Добавлено для H-Canvas: роли Холста как ссылки на существующие ступени, новых значений нет.
  ['--ppm-color-link-emphasis', 'board', 'Связи выделенного объекта: линия 2 px и рамка их чипов', 'ref:--ppm-color-text-secondary', 'ref:--ppm-color-text-secondary', '— (новый)'],
  ['--ppm-color-card-live', 'board', 'Живая карточка источника: подложка', 'ref:--ppm-color-surface-1', 'ref:--ppm-color-surface-1', '— (новый)'],
  ['--ppm-color-card-own', 'board', 'Своя карточка (заметка, решение): подложка', 'ref:--ppm-color-layer-1', 'ref:--ppm-color-layer-1', '— (новый)'],
  ['--ppm-color-card-found-border', 'board', 'Найдено поиском: пунктирная рамка 1 px, не ниже 3:1', 'ref:--ppm-color-border-control', 'ref:--ppm-color-border-control', '— (новый)'],
];

function build(themeIdx) {
  const out = {}; const ok = {};
  const pass = (resolveMix) => {
    for (const row of COLOR) {
      const [name] = row; const v = row[3 + themeIdx];
      if (Array.isArray(v)) { out[name] = hex(...v); ok[name] = fmtOk(...v); }
      else if (typeof v === 'string' && v.startsWith('ref:')) { const r = v.slice(4); if (out[r]) { out[name] = out[r]; ok[name] = `var(${r})`; } }
      else if (resolveMix && typeof v === 'string' && v.startsWith('mix:')) {
        const [, a, b, t] = v.split(':'); out[name] = mix(out[a], out[b], +t);
        const o = hexToOklch(out[name]); ok[name] = `${fmtOk(...o)} ≈ ${a.replace('--ppm-color-', '')} ${Math.round(+t * 100)} %`;
      }
    }
  };
  pass(false); pass(true);
  return { hex: out, ok };
}
export const DARK = build(0);
export const LIGHT = build(1);

// Удобные короткие имена для генераторов
export function theme(t) {
  const h = t.hex;
  return {
    canvas: h['--ppm-color-canvas'], s1: h['--ppm-color-surface-1'], s2: h['--ppm-color-surface-2'], l1: h['--ppm-color-layer-1'],
    hover: h['--ppm-color-layer-1-hover'], sel: h['--ppm-color-layer-1-selected'],
    border: h['--ppm-color-border'], ctl: h['--ppm-color-border-control'], strong: h['--ppm-color-border-strong'],
    text: h['--ppm-color-text'], t2: h['--ppm-color-text-secondary'], t3: h['--ppm-color-text-muted'], ph: h['--ppm-color-text-placeholder'],
    icon: h['--ppm-color-icon-subtle'], dis: h['--ppm-color-text-disabled'],
    acc: h['--ppm-color-accent'], accH: h['--ppm-color-accent-hover'], accA: h['--ppm-color-accent-active'], accT: h['--ppm-color-accent-text'],
    onAcc: h['--ppm-color-on-accent'], focus: h['--ppm-color-focus'], selB: h['--ppm-color-selection'], selBg: h['--ppm-color-selection-bg'],
    danger: h['--ppm-color-danger'], onDanger: h['--ppm-color-on-danger'], dangerT: h['--ppm-color-danger-text'], dangerL: h['--ppm-color-danger-line'],
    warn: h['--ppm-color-warning'], ok: h['--ppm-color-success'],
    st: { backlog: h['--ppm-status-backlog'], todo: h['--ppm-status-todo'], progress: h['--ppm-status-progress'], review: h['--ppm-status-review'], done: h['--ppm-status-done'], cancel: h['--ppm-status-cancelled'] },
    ty: { task: h['--ppm-type-task'], doc: h['--ppm-type-doc'], file: h['--ppm-type-file'], code: h['--ppm-type-code'], decision: h['--ppm-type-decision'] },
    projBg: h['--ppm-project-avatar-bg'], projFg: h['--ppm-project-avatar-fg'],
    board: h['--ppm-color-board'], grid: h['--ppm-color-board-grid'], tick: h['--ppm-color-section-tick'], link: h['--ppm-color-link'], linkV: h['--ppm-color-link-visual'],
  };
}

// ---------- тени (только всплывающие) ----------
export const SHADOW = {
  dark: '0 1px 2px oklch(0 0 0 / 0.4), 0 8px 24px oklch(0 0 0 / 0.45)',
  light: '0 1px 2px oklch(0.22 0.008 70 / 0.08), 0 8px 24px -4px oklch(0.22 0.008 70 / 0.16)',
};

// ---------- радиусы ----------
export const RADIUS = [
  ['--ppm-radius-xs', 4, 'Чипы, клавиши, бейджи, чип-цитата'],
  ['--ppm-radius-sm', 6, 'Кнопки, поля, строки, переключатель'],
  ['--ppm-radius-md', 8, 'Карточки, рабочая панель, меню'],
  ['--ppm-radius-lg', 12, 'Диалоги, крупные контейнеры, рамка доски'],
];

// ---------- шрифты ----------
export const FONT_SANS = `'IBM Plex Sans',system-ui,sans-serif`;
export const FONT_MONO = `'IBM Plex Mono',ui-monospace,monospace`;
export const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wdth,wght@85..100,400..600&amp;display=swap';

// Типографическая шкала: [токен, роль, удобная [size, lh, weight, tracking], компактная [...], семья]
export const TYPE = [
  ['--ppm-text-display', 'Паспорт, обзор проекта', [28, 36, 600, -0.02], [24, 32, 600, -0.02], 'sans'],
  ['--ppm-text-title-1', 'Заголовок карточки задачи', [20, 28, 600, -0.01], [18, 24, 600, -0.01], 'sans'],
  ['--ppm-text-title-2', 'Заголовок панели', [16, 24, 600, 0], [15, 20, 600, 0], 'sans'],
  ['--ppm-text-title-3', 'Группа, секция, крошка', [14, 20, 600, 0], [13, 20, 600, 0], 'sans'],
  ['--ppm-text-body', 'Строки списка, текст', [14, 20, 400, 0], [13, 20, 400, 0], 'sans'],
  ['--ppm-text-ui', 'Навигация, кнопки, поля', [13, 20, 500, 0], [13, 20, 500, 0], 'sans'],
  ['--ppm-text-meta', 'Метаданные, колонки', [12, 16, 400, 0], [12, 16, 400, 0], 'sans'],
  ['--ppm-text-mono', 'ID задач, ветки, время', [12, 16, 400, 0], [11, 16, 400, 0], 'mono'],
  ['--ppm-text-mono-sm', 'Клавиши, номер цитаты, версия', [11, 16, 500, 0], [11, 16, 500, 0], 'mono'],
];

// ---------- плотность ----------
// [токен, что это, удобная, компактная]
export const DENSITY = [
  ['--ppm-row-height', 'Строка списка', 36, 32],
  ['--ppm-group-row-height', 'Полоса группы', 36, 32],
  ['--ppm-table-head-height', 'Заголовки колонок', 32, 28],
  ['--ppm-sidebar-item-height', 'Пункт сайдбара', 32, 28],
  ['--ppm-topbar-height', 'Верхняя панель', 48, 44],
  ['--ppm-page-header-height', 'Шапка страницы', 52, 44],
  ['--ppm-sprint-strip-height', 'Шкала спринта', 60, 52],
  ['--ppm-toolbar-height', 'Фильтры', 44, 40],
  ['--ppm-control-height', 'Кнопка, поле', 32, 28],
  ['--ppm-control-height-sm', 'Чип, переключатель', 28, 24],
  ['--ppm-page-padding-x', 'Поля страницы', 24, 16],
  ['--ppm-cell-gap', 'Зазор колонок', 12, 8],
  ['--ppm-panel-padding', 'Поля панели', 20, 16],
  ['--ppm-avatar-size', 'Аватар в строке', 20, 18],
];
export const DENS = {
  comfortable: Object.fromEntries(DENSITY.map((d) => [d[0], d[2]])),
  compact: Object.fromEntries(DENSITY.map((d) => [d[0], d[3]])),
};
export const TYPEV = {
  comfortable: Object.fromEntries(TYPE.map((t) => [t[0], t[2]])),
  compact: Object.fromEntries(TYPE.map((t) => [t[0], t[3]])),
};

// ---------- роли моста Plane, которые есть в tokens.css (в артбордах не используются, значения выведены из тех же шкал) ----------
export const EXTRA = [
  ['--ppm-color-layer-2', 'bridge', 'Вложенное в layer-1 (поле в меню)', [0.276, 0.007, 70], [1, 0, 0], '--bg-layer-2'],
  ['--ppm-color-layer-2-hover', 'bridge', 'Наведение на layer-2', [0.302, 0.007, 70], [0.965, 0.006, 80], '--bg-layer-2-hover'],
  ['--ppm-color-layer-2-selected', 'bridge', 'Нажато на layer-2', [0.326, 0.008, 70], [0.935, 0.008, 80], '--bg-layer-2-selected · --bg-layer-2-active'],
  ['--ppm-color-layer-3', 'bridge', 'Третий уровень вложенности', [0.29, 0.007, 70], [0.972, 0.006, 80], '--bg-layer-3'],
  ['--ppm-color-layer-3-hover', 'bridge', 'Наведение на layer-3', [0.314, 0.008, 70], [0.945, 0.007, 80], '--bg-layer-3-hover'],
  ['--ppm-color-layer-3-selected', 'bridge', 'Нажато на layer-3', [0.338, 0.008, 70], [0.922, 0.008, 80], '--bg-layer-3-selected · --bg-layer-3-active'],
  ['--ppm-color-layer-disabled', 'bridge', 'Недоступный контрол', [0.276, 0.007, 70], [0.94, 0.006, 80], '--bg-layer-disabled'],
  ['--ppm-color-border-emphasis', 'bridge', 'Самая сильная граница', [0.66, 0.008, 70], [0.5, 0.01, 70], '--border-strong-1'],
  ['--ppm-color-accent-text-hover', 'bridge', 'Ссылка при наведении', [0.86, 0.085, 212], [0.44, 0.085, 228], '--txt-accent-secondary · --txt-link-primary-hover'],
  ['--ppm-color-icon-accent-subtle', 'bridge', 'Иконка акцента, не ниже 3:1', [0.86, 0.085, 212], [0.55, 0.09, 228], '--txt-icon-accent-subtle'],
];
export const ALPHA = [
  ['--ppm-color-alpha-hover', 'Прозрачное наведение', 'oklch(0.955 0.004 70 / 6%)', 'oklch(0.22 0.008 70 / 5%)', '--bg-layer-transparent-hover'],
  ['--ppm-color-alpha-active', 'Прозрачное нажатие', 'oklch(0.955 0.004 70 / 9%)', 'oklch(0.22 0.008 70 / 8%)', '--bg-layer-transparent-active'],
  ['--ppm-color-alpha-selected', 'Прозрачное выделение', 'oklch(0.955 0.004 70 / 12%)', 'oklch(0.22 0.008 70 / 10%)', '--bg-layer-transparent-selected'],
];
// Шкалы Plane (--neutral-*, --brand-*): через них Plane раскрашивает немостовые места
export const NEUTRAL_SCALE = {
  dark: [['black', 0.15, 0.003, 70], ['100', 0.172, 0.004, 70], ['200', 0.2, 0.005, 70], ['300', 0.226, 0.006, 70], ['400', 0.252, 0.006, 70], ['500', 0.302, 0.007, 70], ['600', 0.34, 0.008, 70], ['700', 0.52, 0.008, 70], ['800', 0.6, 0.008, 70], ['900', 0.7, 0.007, 70], ['1000', 0.73, 0.007, 70], ['1100', 0.84, 0.006, 70], ['1200', 0.955, 0.004, 70], ['white', 0.985, 0.003, 70]],
  light: [['white', 1, 0, 0], ['100', 0.986, 0.004, 80], ['200', 0.966, 0.006, 80], ['300', 0.952, 0.007, 80], ['400', 0.935, 0.008, 80], ['500', 0.922, 0.008, 80], ['600', 0.888, 0.008, 70], ['700', 0.68, 0.008, 70], ['800', 0.6, 0.01, 70], ['900', 0.5, 0.01, 70], ['1000', 0.48, 0.01, 70], ['1100', 0.38, 0.01, 70], ['1200', 0.22, 0.008, 70], ['black', 0.17, 0.006, 70]],
};
export const BRAND_SCALE = {
  dark: [['100', 0.27, 0.04, 212], ['200', 0.32, 0.05, 212], ['300', 0.4, 0.065, 212], ['400', 0.5, 0.08, 212], ['500', 0.6, 0.09, 212], ['600', 0.7, 0.1, 212], ['700', 0.8, 0.1, 212], ['800', 0.86, 0.085, 212], ['900', 0.91, 0.06, 212], ['1000', 0.94, 0.04, 212], ['1100', 0.965, 0.025, 212], ['1200', 0.985, 0.012, 212]],
  light: [['100', 0.975, 0.012, 228], ['200', 0.95, 0.025, 228], ['300', 0.91, 0.045, 228], ['400', 0.84, 0.065, 228], ['500', 0.72, 0.085, 228], ['600', 0.6, 0.09, 228], ['700', 0.49, 0.09, 228], ['800', 0.44, 0.085, 228], ['900', 0.4, 0.08, 228], ['1000', 0.34, 0.062, 228], ['1100', 0.28, 0.055, 228], ['1200', 0.22, 0.04, 228]],
};
export const SPACE = [['--ppm-space-1', 4], ['--ppm-space-2', 8], ['--ppm-space-3', 12], ['--ppm-space-4', 16], ['--ppm-space-5', 20], ['--ppm-space-6', 24], ['--ppm-space-8', 32]];

// ---------- Холст (добавлено для H-Canvas; существующие значения не менялись) ----------
// Хром Холста зависит от плотности, объекты на доске — нет (их размер задаёт масштаб холста).
// [токен, что, удобная, компактная]
export const CANVAS = [
  ['--ppm-sidebar-width', 'Боковая панель, развёрнута (как в «Задачах»)', '232 px', '232 px'],
  ['--ppm-sidebar-width-collapsed', 'Боковая панель, свёрнута до рейки иконок — по умолчанию на Холсте', '48 px', '48 px'],
  ['--ppm-canvas-rail-width', 'Рейка инструментов Холста, развёрнута (окно от 1280 px)', '136 px', '136 px'],
  ['--ppm-canvas-rail-width-collapsed', 'Рейка инструментов Холста, свёрнута (окно уже 1280 px)', '48 px', '48 px'],
  ['--ppm-inspector-width', 'Инспектор выделенного: плавающая панель поверх доски под пилюлей «Доска» (ширина как у колонки куратора)', '304 px', '304 px'],
  ['--ppm-canvas-overlay-inset', 'Отступ пилюли «Доска» и инспектора от краёв доски; их правый край — на линии кнопки «Найти в проекте»', '16 px', '16 px'],
  ['--ppm-canvas-status-height', 'Строка статуса под доской', '32 px', '28 px'],
  ['--ppm-canvas-grid-step', 'Шаг точечной сетки доски (точка 1 px), к ней привязываются углы объектов', '16 px', '16 px'],
  ['--ppm-canvas-card-padding', 'Поля карточки на доске', '12 px', '12 px'],
  ['--ppm-canvas-card-footer-height', 'Подвал живой карточки с «Открыть»', '36 px', '36 px'],
  ['--ppm-canvas-toolbar-height', 'Панель выделения над объектом (всплывающая, с тенью)', '32 px', '32 px'],
  ['--ppm-canvas-handle-size', 'Угловой маркер выделения', '8 px', '8 px'],
  ['--ppm-link-width', 'Смысловая связь', '1,5 px', '1,5 px'],
  ['--ppm-link-width-emphasis', 'Связи выделенного объекта', '2 px', '2 px'],
  ['--ppm-link-width-visual', 'Визуальная стрелка', '1 px', '1 px'],
  ['--ppm-link-dash', 'Пунктир «Противоречит»', '4 3', '4 3'],
  ['--ppm-link-port-radius', 'Порт — точка в начале смысловой связи', '2,5 px', '2,5 px'],
  ['--ppm-link-arrow', 'Стрелка: длина × ширина', '6 × 9 px', '6 × 9 px'],
  ['--ppm-link-bar', 'Засечка ⊣ «Блокирует»: длина × толщина', '11 × 2 px', '11 × 2 px'],
  ['--ppm-link-chip-height', 'Чип связи на линии (11/16 · 500)', '20 px', '20 px'],
  ['--ppm-radius-full', 'Пилюля «Доска» — единственная круглая форма в хроме Холста', '999 px', '999 px'],
];
