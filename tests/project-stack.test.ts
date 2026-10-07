import { test } from "node:test";
import assert from "node:assert/strict";
import { groupProjectStack } from "../src/lib/project-stack";
test("technical snapshot groups CMS categories and retains unclassified and name-only entries", () => {
  const groups = groupProjectStack({
    stack: [
      { id: "1", name: "First", slug: "first", category: "Runtime" },
      { id: "2", name: "Second", slug: "second", category: "Runtime" },
      { id: "3", name: "Third", slug: "third" },
    ],
    technologies: ["First", "Second", "Third", "Name only"],
  });
  assert.deepEqual(
    groups.map((group) => group.category),
    ["Runtime", undefined],
  );
  assert.deepEqual(
    groups[0].technologies.map((item) => item.name),
    ["First", "Second"],
  );
  assert.deepEqual(
    groups[1].technologies.map((item) => item.name),
    ["Third", "Name only"],
  );
  assert.equal(groups[1].technologies[1].slug, undefined);
});
test("empty and partial stacks produce no invented categories or missing references", () => {
  assert.deepEqual(groupProjectStack({ stack: [], technologies: [] }), []);
  assert.deepEqual(
    groupProjectStack({
      stack: [],
      technologies: ["Name only"],
    })[0].technologies.map((item) => item.name),
    ["Name only"],
  );
  assert.equal(
    groupProjectStack({
      stack: [{ id: "1", name: "First", slug: "first", category: " " }],
      technologies: [],
    })[0].category,
    undefined,
  );
});
