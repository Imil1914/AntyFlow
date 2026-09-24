// PROTOTYPE v2 (scratch only). Mechanical RU glossary transform with basic agreement heuristics.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const dir = "/Users/ermolov/Desktop/PPM/plane-fork/packages/i18n/src/locales/ru";
const out = process.argv[2] || ".";
const NL = "(?<![\\p{L}])", NR = "(?![\\p{L}])";
const re = (s) => new RegExp(`${NL}${s}${NR}`, "giu");
const cap = (src, dst) => (/^\p{Lu}/u.test(src) ? dst[0].toUpperCase() + dst.slice(1) : dst);
const WI = "[Рр]абоч(?:ий|его|ему|им|ем|ие|их|ими)\\s+элемент(?:а|у|ом|е|ы|ов|ам|ами|ах)?";
// --- agreement tables (masculine -> feminine) for modifiers directly before the work-item phrase
const ADJ_NOM_F = { "новый":"новая","родительский":"родительская","дочерний":"дочерняя","этот":"эта","выбранный":"выбранная","дублирующийся":"дублирующаяся","первый":"первая","входящий":"входящая","повторяющийся":"повторяющаяся","существующий":"существующая","свой":"своя","каждый":"каждая","связанный":"связанная","один":"одна","любой":"любая" };
const ADJ_ACC_F = { "новый":"новую","родительский":"родительскую","дочерний":"дочернюю","этот":"эту","выбранный":"выбранную","первый":"первую","входящий":"входящую","повторяющийся":"повторяющуюся","существующий":"существующую","свой":"свою","каждый":"каждую","один":"одну","любой":"любую" };
const ADJ_GEN_F = { "этого":"этой","нового":"новой","родительского":"родительской","выбранного":"выбранной","первого":"первой","вашего":"вашей","каждого":"каждой","дочернего":"дочерней","своего":"своей","связанного":"связанной","входящего":"входящей","повторяющегося":"повторяющейся","одного":"одной" };
const ADJ_DAT_F = { "этому":"этой","любому":"любой","каждому":"каждой","выбранному":"выбранной","родительскому":"родительской","своему":"своей" };
const ADJ_PREP_F = { "связанном":"связанной","этом":"этой","родительском":"родительской","выбранном":"выбранной" };
const ADJ_INS_F = { "этим":"этой","родительским":"родительской","выбранным":"выбранной" };
const PART_F = (w) => w.replace(/ён$/u,"ена").replace(/ен$/u,"ена").replace(/ан$/u,"ана").replace(/ят$/u,"ята").replace(/ыт$/u,"ыта").replace(/ит$/u,"ита");
const ACC_TRIGGERS = /(?:создать|создайте|добавить|добавьте|удалить|удалите|выберите|выбрать|открыть|откройте|редактировать|изменить|отклонить|отклоните|копировать|скопировать|переместить|назначить|назначьте|архивировать|восстановить|просмотреть|обновить|дублировать|опишите|дайте|добавлять|создавать|начните добавлять|хотите удалить|хотите отклонить|на|в|за|про|через)$/iu;
function workItemSingular(s, flags) {
  // gen/dat/ins/prep singular with preceding modifier
  const oblique = [["рабочего\\s+элемента","задачи",ADJ_GEN_F],["рабочему\\s+элементу","задаче",ADJ_DAT_F],["рабочим\\s+элементом","задачей",ADJ_INS_F],["рабочем\\s+элементе","задаче",ADJ_PREP_F]];
  for (const [p, n, adj] of oblique) {
    s = s.replace(new RegExp(`${NL}((?:\\p{L}+\\s+){0,2})(${p})${NR}`, "giu"), (m, mods, phrase) => {
      const words = mods.split(/\s+/).filter(Boolean);
      const fixed = words.map((w) => (adj[w.toLowerCase()] ? cap(w, adj[w.toLowerCase()]) : w));
      // only rewrite modifiers adjacent (from the right) that are in table
      return (fixed.length ? fixed.join(" ") + " " : "") + cap(phrase, n);
    });
  }
  // nom/acc singular
  s = s.replace(new RegExp(`${NL}((?:\\p{L}+[\\s]+){0,3})(рабочий\\s+элемент)${NR}((?:\\s+\\p{L}+){0,2})`, "giu"), (m, before, phrase, after) => {
    const words = before.split(/\s+/).filter(Boolean);
    // find modifiers adjacent to phrase (from right)
    let i = words.length; while (i > 0 && (ADJ_NOM_F[words[i-1].toLowerCase()] || ADJ_ACC_F[words[i-1].toLowerCase()])) i--;
    const lead = words.slice(0, i), mods = words.slice(i);
    const leadText = lead.join(" ");
    const isAcc = lead.length > 0 && ACC_TRIGGERS.test(lead.slice(-2).join(" ")) || (lead.length > 0 && ACC_TRIGGERS.test(lead.at(-1)));
    const isNomLead = lead.length === 0 || /^(найден|есть|был|это)$/iu.test(lead.at(-1) || "");
    let noun, tbl;
    if (isAcc) { noun = "задачу"; tbl = ADJ_ACC_F; } else { noun = "задача"; tbl = ADJ_NOM_F; if (!isNomLead) flags.add("SG_CASE_GUESS"); }
    const fixedMods = mods.map((w) => cap(w, tbl[w.toLowerCase()] || w));
    let fixedLead = lead.slice();
    if (!isAcc && fixedLead.length && /^найден$/iu.test(fixedLead.at(-1))) fixedLead[fixedLead.length-1] = cap(fixedLead.at(-1), "найдена");
    // predicate participle after nominative
    let aft = after;
    if (!isAcc) aft = after.replace(/^(\s+(?:успешно|уже|не)\s+)?(\s*)(\p{L}+)/u, (mm, adv = "", sp, w) => {
      if (/(ён|ен|ан|ят|ыт)$/u.test(w) && !/(время|имен)$/u.test(w)) return (adv||"") + sp + cap(w, PART_F(w));
      return mm;
    });
    const phraseOut = cap(mods.length ? "x" : phrase, noun);
    return (fixedLead.length ? fixedLead.join(" ") + " " : "") + (fixedMods.length ? fixedMods.join(" ") + " " : "") + (mods.length ? noun : phraseOut) + aft;
  });
  return s;
}
const PLURAL = [["рабочими\\s+элементами","задачами"],["рабочих\\s+элементах","задачах"],["рабочих\\s+элементов","задач"],["рабочих\\s+элемента","задачи"],["рабочим\\s+элементам","задачам"],["рабочие\\s+элементы","задачи"],["рабочие\\s+задачи","задачи"],["рабочих\\s+задач","задач"]];
const EXCLUDE_KEYS = new Set([
  "work-item-type.json:work_item_types.settings.properties.create_update.errors.formula.circular_reference",
  "empty-state.json:workspace_empty_state.dashboard.description",
]);
function flatten(obj, prefix = "", o = {}) { for (const [k, v] of Object.entries(obj)) { const key = prefix ? `${prefix}.${k}` : k; if (v && typeof v === "object") flatten(v, key, o); else o[key] = v; } return o; }
function setPath(obj, keyPath, value) { const parts = keyPath.split("."); let cur = obj; for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] ||= {}; cur[parts.at(-1)] = value; }
const overlay = {}, flagged = []; let changed = 0; const perNs = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const ns = f.replace(/\.json$/, "");
  const flat = flatten(JSON.parse(readFileSync(path.join(dir, f), "utf8")));
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v !== "string" || EXCLUDE_KEYS.has(`${f}:${k}`)) continue;
    const flags = new Set(); let s = v;
    for (const [p, r] of PLURAL) s = s.replace(re(p), (m) => cap(m, r));
    s = workItemSingular(s, flags);
    s = s.replace(re("цикл(ами|ам|ах|ов|ом|а|у|е|ы)?"), (m, e) => cap(m, "спринт" + (e || "")));
    if (/модул/iu.test(s)) flags.add("MODULE_MANUAL");
    if (/представлени/iu.test(s)) flags.add("VIEW_MANUAL");
    if (/рабоч\S*\s+элемент/iu.test(s)) flags.add("WI_LEFTOVER");
    if (s !== v || flags.size) {
      if (s !== v) { changed++; perNs[ns] = (perNs[ns] || 0) + 1; (overlay[ns] ||= {}); setPath(overlay[ns], k, s); }
      if (flags.size) flagged.push({ key: `${ns}:${k}`, flags: [...flags], from: v, to: s });
    }
  }
}
writeFileSync(path.join(out, "ru-overlay.candidate.v2.json"), JSON.stringify(overlay, null, 2) + "\n");
writeFileSync(path.join(out, "ru-overlay.flagged.v2.json"), JSON.stringify(flagged, null, 2) + "\n");
const byFlag = {}; for (const x of flagged) for (const fl of x.flags) byFlag[fl] = (byFlag[fl] || 0) + 1;
console.log({ changed, flagged: flagged.length, byFlag });
