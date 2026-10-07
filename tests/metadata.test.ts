import { test } from "node:test";
import assert from "node:assert/strict";
import { contentMetadata } from "../src/lib/metadata";
test("page metadata inherits document title while keeping social identity, description and image", () => {
  const metadata = contentMetadata(
    "fi",
    "Project social title",
    "Project description",
    "/projects/fixture",
    "https://cms.pat1.online/assets/fixture",
  );
  assert.ok(!("title" in metadata));
  assert.equal(metadata.description, "Project description");
  assert.equal(metadata.openGraph?.title, "Project social title");
  assert.deepEqual(
    metadata.openGraph && "images" in metadata.openGraph
      ? metadata.openGraph.images
      : undefined,
    ["https://cms.pat1.online/assets/fixture"],
  );
  assert.ok(
    String(metadata.alternates?.canonical).endsWith("/fi/projects/fixture"),
  );
  assert.ok(
    String(metadata.alternates?.languages?.en).endsWith("/en/projects/fixture"),
  );
});
test("missing CMS social copy remains safe without inventing a title", () => {
  const metadata = contentMetadata("en");
  assert.ok(!("title" in metadata));
  assert.equal(metadata.openGraph?.title, undefined);
});
