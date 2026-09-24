import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
const dir = "/Users/ermolov/Desktop/PPM/plane-fork/packages/i18n/src/locales/ru";
const enDir = "/Users/ermolov/Desktop/PPM/plane-fork/packages/i18n/src/locales/en";
function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") flatten(v, key, out); else out[key] = v;
  }
  return out;
}
const patterns = {
  work_item: /рабоч(ий|его|ему|им|ем|ие|их|ими|ая|ую|ей|ее|ее)\s+элемент/iu,
  work_item_any: /рабоч\S*\s+элемент\S*/giu,
  cycle: /цикл/iu,
  module: /модул/iu,
  view: /представлени/iu,
  inbox_in: /входящ/iu,
  intake: /intake|при[её]м\b|приём|прием/iu,
  pages: /Pages|страниц/iu,
  plane: /\bplane\b/iu,
  stick: /стикер|sticky|stickies/iu,
  epic: /эпик/iu,
};
const res = {}; const perFile = {};
const all = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const flat = flatten(JSON.parse(readFileSync(path.join(dir, f), "utf8")));
  const enFlat = flatten(JSON.parse(readFileSync(path.join(enDir, f), "utf8")));
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v !== "string") continue;
    all[`${f}:${k}`] = { v, en: enFlat[k] };
    for (const [name, re] of Object.entries(patterns)) {
      if (name === "work_item_any") continue;
      if (re.test(v)) {
        (res[name] ||= []).push(`${f}:${k}`);
        perFile[name] ||= {}; perFile[name][f] = (perFile[name][f] || 0) + 1;
      }
    }
  }
}
const mode = process.argv[2] || "summary";
if (mode === "summary") {
  for (const [n, list] of Object.entries(res)) console.log(n, list.length, JSON.stringify(perFile[n]));
  // count occurrences (not strings)
  let occ = 0; const forms = {};
  for (const { v } of Object.values(all)) { const m = v.match(/рабоч\S*\s+элемент\S*/giu); if (m) { occ += m.length; for (const x of m) { const y = x.toLowerCase().replace(/[.,:;!?»)"']+$/,""); forms[y]=(forms[y]||0)+1; } } }
  console.log("work_item occurrences", occ); console.log(JSON.stringify(forms, null, 1));
  const cforms = {}; let cocc=0;
  for (const { v } of Object.values(all)) { const m = v.match(/[А-Яа-яЁё]*цикл[а-яё]*/giu); if (m) { cocc+=m.length; for (const x of m) { const y=x.toLowerCase(); cforms[y]=(cforms[y]||0)+1; } } }
  console.log("cycle occurrences", cocc, JSON.stringify(cforms));
  const mforms = {}; let mocc=0;
  for (const { v } of Object.values(all)) { const m = v.match(/[А-Яа-яЁё]*модул[а-яё]*/giu); if (m) { mocc+=m.length; for (const x of m) { const y=x.toLowerCase(); mforms[y]=(mforms[y]||0)+1; } } }
  console.log("module occurrences", mocc, JSON.stringify(mforms));
  const vforms = {}; let vocc=0;
  for (const { v } of Object.values(all)) { const m = v.match(/[А-Яа-яЁё]*представлени[а-яё]*/giu); if (m) { vocc+=m.length; for (const x of m) { const y=x.toLowerCase(); vforms[y]=(vforms[y]||0)+1; } } }
  console.log("view occurrences", vocc, JSON.stringify(vforms));
  const eforms = {}; let eocc=0;
  for (const { v } of Object.values(all)) { const m = v.match(/[А-Яа-яЁё]*эпик[а-яё]*/giu); if (m) { eocc+=m.length; for (const x of m) { const y=x.toLowerCase(); eforms[y]=(eforms[y]||0)+1; } } }
  console.log("epic occurrences", eocc, JSON.stringify(eforms));
  const sforms = {}; let socc=0;
  for (const { v } of Object.values(all)) { const m = v.match(/[А-Яа-яЁё]*страниц[а-яё]*/giu); if (m) { socc+=m.length; for (const x of m) { const y=x.toLowerCase(); sforms[y]=(sforms[y]||0)+1; } } }
  console.log("page occurrences", socc, JSON.stringify(sforms));
} else if (mode === "list") {
  const name = process.argv[3];
  for (const k of res[name] || []) console.log(k, "=>", JSON.stringify(all[k].v));
} else if (mode === "english") {
  // strings with Latin words that are not placeholders/brand
  for (const [k, { v, en }] of Object.entries(all)) {
    const stripped = v.replace(/\{[^}]*\}/g, "").replace(/<[^>]+>/g, "");
    const latinWords = stripped.match(/[A-Za-z][A-Za-z'’-]{2,}/g) || [];
    const cyr = /[А-Яа-яЁё]/.test(stripped);
    if (latinWords.length && (!cyr || v === en)) console.log(k, "=>", JSON.stringify(v));
  }
} else if (mode === "latin") {
  const counts = {};
  for (const [k, { v }] of Object.entries(all)) {
    const stripped = v.replace(/\{[^}]*\}/g, "").replace(/<[^>]+>/g, "");
    for (const w of stripped.match(/[A-Za-z][A-Za-z'’-]{1,}/g) || []) counts[w] = (counts[w]||0)+1;
  }
  console.log(Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([w,c])=>`${w}:${c}`).join(" "));
}
