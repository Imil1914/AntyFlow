import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const dir = "/Users/ermolov/Desktop/PPM/plane-fork/packages/i18n/src/locales/ru";
function flatten(obj, prefix = "", o = {}) { for (const [k, v] of Object.entries(obj)) { const key = prefix ? `${prefix}.${k}` : k; if (v && typeof v === "object") flatten(v, key, o); else o[key] = v; } return o; }
const cats = {
  module_to_napravlenie: /(?<!\p{L})модул/iu,
  view_to_filter: /представлени/iu,
  page_feature_to_document: /(?<!\p{L})страниц/iu,
  intake_to_zayavki: /(?<!\p{L})(при[её]м|предложени|входящ)/iu,
  plane_brand: /(?<![\p{L}.])Plane(?![\p{L}.])/u,
  sub_item: /подэлемент|под-элемент/iu,
  english_only: /^[^А-Яа-яЁё]*[A-Za-z]{3,}[^А-Яа-яЁё]*$/u,
};
const EXCL = { page_feature_to_document: /^(common\.json:(you_do_not_have_the_permission_to_access_this_page|cloud_maintenance_message\.)|power-k\.json:power_k\.miscellaneous_actions\.copy_current_page_url|project-settings\.json:project_settings\.general\.archive_project)/,
  plane_brand: /^(integration\.json|auth\.json:sso\.|workspace-settings\.json:workspace_settings\.settings\.applications\.|template\.json:templates\.settings\.form\.publish\.)/ ,
  intake_to_zayavki: /^(auth\.json|notification\.json|navigation\.json:sidebar\.inbox|power-k\.json:power_k\.navigation_actions\.nav_inbox|workspace-settings\.json:workspace_settings\.settings\.webhooks)/ };
const out = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const flat = flatten(JSON.parse(readFileSync(path.join(dir, f), "utf8")));
  for (const [k, v] of Object.entries(flat)) {
    if (typeof v !== "string") continue;
    const id = `${f}:${k}`;
    for (const [c, re] of Object.entries(cats)) if (re.test(v) && !(EXCL[c] && EXCL[c].test(id))) (out[c] ||= []).push(`${id} => ${JSON.stringify(v)}`);
  }
}
let txt = "";
for (const [c, list] of Object.entries(out)) txt += `\n### ${c} (${list.length})\n` + list.join("\n") + "\n";
writeFileSync(process.argv[2], txt);
console.log(Object.fromEntries(Object.entries(out).map(([c, l]) => [c, l.length])));
