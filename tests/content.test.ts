import { test } from "node:test";
import assert from "node:assert/strict";
import { clampIndex } from "../src/lib/carousel";
import { copy, rowSchema, safeUrl } from "../src/content/normalize";
test("finite carousel bounds for 0, 1, 2, 3, 5 and 8 records", () => {
  for (const count of [0, 1, 2, 3, 5, 8]) {
    assert.equal(clampIndex(-1, count), 0);
    assert.equal(clampIndex(count + 1, count), Math.max(0, count - 1));
    for (let i = 0; i < count; i++) assert.equal(clampIndex(i, count), i);
  }
});
test("validated translation normalization preserves CMS copy without fabricating fields", () => {
  assert.deepEqual(
    copy(
      rowSchema.parse({
        id: 1,
        translations: [{ id: 3, languages_code: "fi", title: "Otsikko" }],
      }),
    ),
    { title: "Otsikko" },
  );
  assert.deepEqual(copy(rowSchema.parse({ id: 1 })), {});
  assert.throws(() => rowSchema.parse({ translations: "bad" }));
});
test("links reject executable protocols", () => {
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
