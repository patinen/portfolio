import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { ChatMessageView } from "../src/components/chat/chat-message";
import { ChatPanel } from "../src/components/chat/chat-panel";
import { normalizeChat } from "../src/chat/copy";
import { copy as normalizeCopy } from "../src/content/normalize";
import { selectTranslations, withEnglishFallback } from "../src/content/translations";
import { planSetup } from "../directus/chat/setup.mjs";
const seed = JSON.parse(readFileSync("directus/chat/seed.json", "utf8"));
test("Finnish and English views escape plain-text answers and render only safe sources", () => {
  for (const locale of ["fi", "en"] as const) {
    const copy = normalizeChat({ translations: [{ chat_enabled: true, ...seed[locale] }] })!;
    const html = renderToStaticMarkup(createElement(ChatMessageView, { copy, message: { role: "assistant", content: '<script>alert("x")</script>\nNext line', sources: [{ id: "safe", title: "<b>Source</b>", url: "https://example.com/docs" }, { id: "unsafe", title: "Unsafe", url: "javascript:alert(1)" }] } }));
    assert.ok(html.includes("&lt;script&gt;")); assert.ok(html.includes("\nNext line"));
    assert.ok(!html.includes("<script>")); assert.ok(!html.includes("javascript:"));
    assert.ok(html.includes('rel="noopener noreferrer"')); assert.ok(html.includes("&lt;b&gt;"));
    assert.ok(html.includes(copy.chat_assistant_label));
    const closed = renderToStaticMarkup(createElement(ChatPanel, { locale, copy }));
    assert.ok(closed.includes(copy.chat_open_label)); assert.ok(closed.includes('aria-expanded="false"'));
    assert.ok(!closed.includes('id="personacore-input"'));
  }
});
test("CMS setup preserves nonempty copy and is idempotent without changing existing relation metadata", () => {
  const fields = JSON.parse(readFileSync("directus/chat/fields.json", "utf8")).fields;
  const first = planSetup(fields, [], [{ id: 1, site_settings_id: 1, languages_code: "fi", site_name: "Existing", chat_title: "Editorial title" }], seed, 1);
  assert.equal(first.fields.length, fields.length);
  const finnish = first.translations.find((row: { id?: number }) => row.id === 1)!;
  const values = finnish.values as Record<string, unknown>;
  assert.equal(values.chat_title, undefined); assert.equal(values.site_name, undefined);
  assert.equal(values.chat_enabled, false);
  const rows = first.translations.map((row: { id?: number; values: Record<string, unknown> }) => row.id ? { id: row.id, site_settings_id: 1, languages_code: "fi", chat_title: "Editorial title", ...row.values } : { id: 2, ...row.values });
  assert.deepEqual(planSetup(fields, fields, rows, seed, 1), { fields: [], translations: [], notices: first.notices });
  assert.throws(() => planSetup(fields, [{ field: "chat_enabled", type: "text" }], rows, seed, 1));
});

test("CMS setup leaves missing Finnish rows absent so whole-row English fallback survives", () => {
  const fields = JSON.parse(readFileSync("directus/chat/fields.json", "utf8")).fields;
  const english = { id: 1, site_settings_id: 1, languages_code: "en", site_name: "System Index", site_intro: "Complete English introduction", chat_enabled: true };
  const plan = planSetup(fields, [], [english], seed, 1);
  assert.equal(plan.translations.length, 1);
  assert.equal(plan.translations[0].id, 1);
  assert.equal(plan.translations[0].values.chat_enabled, undefined);
  assert.equal(plan.notices[0].language, "fi");
  const rows = [{ ...english, ...plan.translations[0].values }];
  const parent = [{ id: 1, translations: rows }];
  const selected = withEnglishFallback(selectTranslations(parent, "fi"), selectTranslations(parent, "en"));
  assert.equal(normalizeCopy(selected[0]).site_name, english.site_name);
  assert.equal(normalizeCopy(selected[0]).site_intro, english.site_intro);
  assert.equal(normalizeChat(selected[0])!.chat_title, seed.en.chat_title);
  const again = planSetup(fields, fields, rows, seed, 1);
  assert.equal(again.translations.length, 0);
  assert.deepEqual(again.notices, plan.notices);
});
