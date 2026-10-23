import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Section } from "../src/components/ui/section";

test("section owns its number and removes a redundant CMS number from labels", () => {
  const markup = renderToStaticMarkup(createElement(Section, {
    id: "services", index: 2, label: "02 / Services", title: "Services", children: null,
  }));
  assert.ok(markup.includes("Services"));
  assert.ok(!markup.includes("02 / 02"));
});
