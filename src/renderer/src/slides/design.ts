// Дизайн-система слайдов: слайд = HTML 1280×720 с этими классами.
// ИИ генерирует макеты сам, используя только эти классы.
export const DESIGN_CSS = `
.sd-slide {
  width: 1280px; height: 720px; box-sizing: border-box;
  padding: 62px 72px; overflow: hidden; position: relative;
  background: radial-gradient(1200px 720px at 82% -12%, #24314b 0%, #12151c 55%);
  color: #eef1f6; font-family: -apple-system, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  display: flex; flex-direction: column; gap: 22px;
  --accent: #4c8dff; --accent2: #a06bff; --muted: #9aa4b2;
  --card: rgba(255,255,255,0.05); --border: rgba(255,255,255,0.10);
}
.sd-slide * { box-sizing: border-box; }
.sd-kicker { color: var(--accent); font-size: 22px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; }
.sd-title { font-size: 64px; font-weight: 800; line-height: 1.04; letter-spacing: -0.02em; margin: 0; }
.sd-h2 { font-size: 42px; font-weight: 700; letter-spacing: -0.01em; margin: 0; }
.sd-sub { font-size: 27px; color: var(--muted); line-height: 1.4; margin: 0; }
.sd-body { font-size: 26px; line-height: 1.5; }
.sd-row { display: flex; gap: 28px; }
.sd-col { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.sd-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.sd-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 22px; }
.sd-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.028));
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24px; padding: 30px 32px;
  display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.07);
}
.sd-ico {
  font-size: 34px; width: 66px; height: 66px; border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.10);
}
.sd-card h3 { font-size: 29px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
.sd-card p { font-size: 21px; color: var(--muted); margin: 0; line-height: 1.45; }
.sd-stat { font-size: 92px; font-weight: 800; letter-spacing: -0.03em; background: linear-gradient(120deg,var(--accent),var(--accent2)); -webkit-background-clip: text; background-clip: text; color: transparent; line-height: 0.98; }
.sd-statlabel { font-size: 23px; color: var(--muted); font-weight: 500; }
.sd-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 16px; }
.sd-list li { font-size: 27px; line-height: 1.35; padding-left: 40px; position: relative; }
.sd-list li::before { content: ''; position: absolute; left: 0; top: 12px; width: 16px; height: 16px; border-radius: 5px; background: linear-gradient(135deg,var(--accent),var(--accent2)); }
.sd-accent { color: var(--accent); font-weight: 700; }
.sd-quote { font-size: 42px; font-weight: 600; line-height: 1.3; border-left: 6px solid var(--accent); padding-left: 28px; }
.sd-badge { display: inline-block; background: var(--card); border: 1px solid var(--border); border-radius: 999px; padding: 8px 20px; font-size: 20px; color: var(--accent); }
.sd-spacer { flex: 1; }
.sd-footer { font-size: 18px; color: var(--muted); }
.sd-center { justify-content: center; align-items: flex-start; }
.sd-mermaid { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 20px; padding: 20px 24px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.sd-mermaid .mermaid { width: 100%; display:flex; justify-content:center; }
.sd-mermaid svg { max-width: 100%; max-height: 420px; height: auto; }

/* Таймлайн */
.sd-timeline { display: flex; align-items: flex-start; }
.sd-step { flex: 1; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; position: relative; padding: 0 8px; }
.sd-step::before { content: ''; position: absolute; top: 26px; left: -50%; width: 100%; height: 3px; background: var(--border); z-index: 0; }
.sd-step:first-child::before { display: none; }
.sd-step-dot { width: 58px; height: 58px; border-radius: 50%; background: linear-gradient(135deg,var(--accent),var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #fff; z-index: 1; box-shadow: 0 10px 26px rgba(0,0,0,0.38); }
.sd-step-t { font-size: 25px; font-weight: 700; }
.sd-step-x { font-size: 20px; color: var(--muted); line-height: 1.35; }

/* Прогресс-бары */
.sd-bars { display: flex; flex-direction: column; gap: 28px; }
.sd-bar { display: flex; flex-direction: column; gap: 12px; }
.sd-barhead { display: flex; justify-content: space-between; align-items: baseline; font-size: 27px; font-weight: 600; }
.sd-bartrack { height: 24px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); border-radius: 999px; overflow: hidden; }
.sd-barfill { height: 100%; border-radius: 999px; background: linear-gradient(90deg,var(--accent),var(--accent2)); box-shadow: 0 0 18px rgba(255,255,255,0.10); }
`

// Цветовые палитры презентаций (accent / accent2 / фон слайда)
export type Palette = { id: string; name: string; accent: string; accent2: string; bg: string }
const RAD = (a: string, b: string) => `radial-gradient(1200px 720px at 82% -12%, ${a} 0%, ${b} 58%)`
export const PALETTES: Palette[] = [
  { id: 'night', name: 'Ночная синь', accent: '#4c8dff', accent2: '#a06bff', bg: RAD('#243a5e', '#10131b') },
  { id: 'emerald', name: 'Изумруд', accent: '#10b981', accent2: '#5eead4', bg: RAD('#113a30', '#0c1512') },
  { id: 'sunset', name: 'Закат', accent: '#fb7185', accent2: '#fbbf24', bg: RAD('#3a1f2b', '#17110f') },
  { id: 'amethyst', name: 'Аметист', accent: '#a78bfa', accent2: '#22d3ee', bg: RAD('#2a1f4a', '#100f1c') },
  { id: 'graphite', name: 'Графит', accent: '#22d3ee', accent2: '#4ade80', bg: RAD('#1e2a36', '#0e1116') },
  { id: 'crimson', name: 'Кармин', accent: '#f43f5e', accent2: '#fb923c', bg: RAD('#3a1a22', '#140e10') }
]
export function customPalette(accent: string): Palette {
  return { id: 'custom', name: 'Свой цвет', accent, accent2: accent, bg: RAD('#1c2230', '#0e1116') }
}

// Инструкция модели: вернуть структуру слайдов (макет + содержимое).
export const SLIDE_SYSTEM_PROMPT = `Ты — сильный презентационный дизайнер. По теме пользователя составь презентацию.
Верни СТРОГО JSON без пояснений и без markdown:
{"title":"название","slides":[ {слайд}, {слайд} ]}
Каждый слайд — объект с полем "layout" и содержимым. Доступные макеты:
- {"layout":"title","kicker":"НАДЗАГОЛОВОК","title":"Заголовок","subtitle":"подзаголовок","imagePrompt":"english photo prompt"} — титульный.
- {"layout":"bullets","title":"Заголовок","bullets":["пункт","пункт","пункт"],"imagePrompt":"english photo prompt"} — заголовок + список (+ фото справа).
- {"layout":"cards","title":"Заголовок","cards":[{"icon":"📦","heading":"Название","text":"описание"}]} — сетка карточек (2–6).
- {"layout":"stats","title":"Заголовок","stats":[{"value":"80%","label":"описание"}]} — крупные метрики (2–3).
- {"layout":"diagram","title":"Заголовок","diagram":"flowchart LR\\n  A[Идея] --> B[MVP] --> C[Тест] --> D[Запуск]"} — СХЕМА (Mermaid).
- {"layout":"timeline","title":"Заголовок","steps":[{"title":"Этап","text":"кратко"}]} — горизонтальный таймлайн (3–5 этапов).
- {"layout":"compare","title":"Заголовок","columns":[{"heading":"Вариант A","items":["пункт","пункт"]},{"heading":"Вариант B","items":["пункт"]}]} — сравнение 2–3 колонок.
- {"layout":"progress","title":"Заголовок","bars":[{"label":"Метрика","value":75}]} — прогресс-бары (value 0–100).
- {"layout":"image","title":"Заголовок","bullets":["пункт"],"imagePrompt":"english photo prompt"} — текст + крупное фото.
- {"layout":"quote","quote":"цитата","author":"автор"} — акцентная цитата.
Правила разнообразия (ВАЖНО — не делай однотипную презентацию):
- Первый слайд — всегда "title".
- НЕ ставь подряд два слайда с одинаковым "layout".
- Один и тот же "layout" — не более 2 раз за всю презентацию.
- Задействуй МИНИМУМ 5 РАЗНЫХ макетов из списка. Активно используй инфографику
  (stats, cards, timeline, compare, progress, diagram), а не только bullets.
- "bullets" — максимум 2 слайда на всю презентацию.
- Хотя бы 1 слайд "diagram" со схемой Mermaid (flowchart/mindmap/sequenceDiagram),
  где есть процесс/этапы/архитектура/связи.
- Хотя бы 1 "stats", 1 "cards" и 1 ещё какой-нибудь инфографический макет.
- 2–4 слайда с "imagePrompt" (короткий английский промпт для фото по теме слайда).
Контент:
- Текст — на языке темы. Кратко: 3–5 пунктов/карточек на слайд.
- Разные иконки-эмодзи в карточках (не повторяй одну и ту же).
- Осмысленные, разные цифры в stats/progress — не «80%» везде.
- Заголовки слайдов — конкретные и разные по формулировке.`
