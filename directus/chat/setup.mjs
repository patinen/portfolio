import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
export function planSetup(definitions, existingFields, rows, seed, siteId) {
  const known = new Map(existingFields.map(field => [field.field, field]));
  const fields = definitions.filter(field => {
    const old = known.get(field.field);
    if (old && old.type !== field.type) throw new Error("Existing chat field has incompatible type");
    return !old;
  });
  const translations = [];
  for (const language of ["en", "fi"]) {
    const matches = rows.filter(row => row.languages_code === language && String(row.site_settings_id) === String(siteId));
    if (matches.length > 1) throw new Error("Duplicate site translation rows require editorial review");
    const row = matches[0];
    const desired = { chat_enabled: false, ...seed[language] };
    const values = Object.fromEntries(Object.entries(desired).filter(([key]) => !row || row[key] == null || row[key] === ""));
    if (Object.keys(values).length) translations.push(row ? { id: row.id, values } : { values: { site_settings_id: siteId, languages_code: language, ...values } });
  }
  return { fields, translations };
}
async function main() {
  const definitions = JSON.parse(await readFile(new URL("./fields.json", import.meta.url), "utf8"));
  const seed = JSON.parse(await readFile(new URL("./seed.json", import.meta.url), "utf8"));
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const target = args.find(v => v.startsWith("--url="))?.slice(6);
  const siteId = Number(args.find(v => v.startsWith("--site-id="))?.slice(10));
  if (!target) {
    if (apply) throw new Error("Apply requires an explicit URL and site ID");
    console.log(JSON.stringify({ mode: "offline-dry-run", proposal: definitions, seed, note: "No credentials read or CMS requests made. All chat_enabled values remain false." }, null, 2));
    return;
  }
  const base = new URL(target);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/" || !Number.isInteger(siteId) || siteId < 1) throw new Error("Invalid target/site ID");
  // A short-lived setup credential is only read by this explicitly invoked offline administration script.
  const token = process.env.DIRECTUS_SETUP_TOKEN;
  if (!token) throw new Error("Set DIRECTUS_SETUP_TOKEN only for this setup process; never application configuration");
  async function api(path, method = "GET", data) {
    const response = await fetch(new URL(path, base), { method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, ...(data ? { body: JSON.stringify(data) } : {}), signal: AbortSignal.timeout(10000), redirect: "error" });
    if (!response.ok) throw new Error("CMS setup request failed; inspect permissions separately");
    return response.status === 204 ? undefined : (await response.json()).data;
  }
  const fields = await api("/fields/site_settings_translations");
  const rows = await api("/items/site_settings_translations?limit=-1&filter[site_settings_id][_eq]=" + siteId);
  const plan = planSetup(definitions.fields, fields, rows, seed, siteId);
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", plan }, null, 2));
  if (!apply) return;
  for (const field of plan.fields) await api("/fields/site_settings_translations", "POST", field);
  for (const row of plan.translations) await api("/items/site_settings_translations" + (row.id ? "/" + row.id : ""), row.id ? "PATCH" : "POST", row.values);
  console.log("Setup complete. Existing nonempty content preserved; chat remains off unless already enabled by an editor.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(() => { console.error("Chat CMS setup failed. Check explicit target, site ID, schema compatibility and setup permissions; details/credentials suppressed."); process.exitCode = 1; });
