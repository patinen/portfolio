import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Section } from "../src/components/ui/section";

test("section owns its number and removes a redundant CMS number from labels", () => {
  const props: Parameters<typeof Section>[0] = {
    id: "services", index: 2, label: "02 / Services", title: "Services", children: null,
  };
  const markup = renderToStaticMarkup(createElement(Section, props));
  assert.ok(markup.includes("Services"));
  assert.ok(!markup.includes("02 / 02"));
});
