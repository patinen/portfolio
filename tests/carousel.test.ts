import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  wrapCarouselIndex,
  circularCarouselOffset,
  carouselKeyDelta,
  swipeDelta,
} from "../src/lib/carousel";
test("circular navigation wraps empty, one, two and three project sets", () => {
  assert.equal(wrapCarouselIndex(-1, 3), 2);
  assert.equal(wrapCarouselIndex(3, 3), 0);
  assert.equal(wrapCarouselIndex(-7, 3), 2);
  assert.equal(wrapCarouselIndex(7, 3), 1);
  for (const count of [0, 1])
    for (const index of [-2, 0, 2])
      assert.equal(wrapCarouselIndex(index, count), 0);
  assert.equal(wrapCarouselIndex(-1, 2), 1);
  assert.equal(wrapCarouselIndex(2, 2), 0);
});
test("signed shortest offsets keep both neighbors beside the active project", () => {
  assert.deepEqual(
    [0, 1, 2].map((index) => circularCarouselOffset(index, 0, 3)),
    [0, 1, -1],
  );
  assert.deepEqual(
    [0, 1, 2].map((index) => circularCarouselOffset(index, 2, 3)),
    [1, -1, 0],
  );
  assert.equal(circularCarouselOffset(0, 0, 1), 0);
  assert.deepEqual(
    [0, 1].map((index) => circularCarouselOffset(index, 0, 2)),
    [0, 1],
  );
  assert.deepEqual(
    [0, 1].map((index) => circularCarouselOffset(index, 1, 2)),
    [1, 0],
  );
  for (const count of [3, 4, 6])
    for (let active = 0; active < count; active++) {
      assert.equal(
        circularCarouselOffset(
          wrapCarouselIndex(active - 1, count),
          active,
          count,
        ),
        -1,
      );
      assert.equal(
        circularCarouselOffset(
          wrapCarouselIndex(active + 1, count),
          active,
          count,
        ),
        1,
      );
      for (const delta of [-1, 1]) {
        const next = wrapCarouselIndex(active + delta, count);
        assert.equal(circularCarouselOffset(next, active, count), delta);
        assert.equal(circularCarouselOffset(active, next, count), -delta);
      }
    }
});
test("arrow keys and deliberate horizontal swipes select neighboring projects", () => {
  assert.equal(carouselKeyDelta("ArrowRight"), 1);
  assert.equal(carouselKeyDelta("ArrowLeft"), -1);
  assert.equal(wrapCarouselIndex(carouselKeyDelta("ArrowLeft"), 3), 2);
  assert.equal(wrapCarouselIndex(2 + carouselKeyDelta("ArrowRight"), 3), 0);
  assert.equal(wrapCarouselIndex(2 + swipeDelta(-80, 10), 3), 0);
  assert.equal(wrapCarouselIndex(swipeDelta(80, 10), 3), 2);
  for (const key of ["Tab", "Enter", "ArrowDown"])
    assert.equal(carouselKeyDelta(key), 0);
  assert.equal(swipeDelta(-80, 10), 1);
  assert.equal(swipeDelta(80, 10), -1);
  assert.equal(swipeDelta(49, 0), 0);
  assert.equal(swipeDelta(80, 100), 0);
});
test("interaction wiring preserves focus, links and readable motion/touch fallbacks", () => {
  const read = (path: string) =>
    readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");
  const carousel = read("src/components/projects/project-carousel.tsx");
  assert.ok(carousel.includes("inert={index !== active}"));
  assert.ok(carousel.includes("focus({ preventScroll: true })"));
  assert.ok(carousel.includes("carouselKeyDelta(event.key)"));
  assert.ok(/swipeDelta\(\s*event.clientX/.test(carousel));
  assert.ok(!carousel.includes("disabled="));
  assert.ok(carousel.includes("projects.length > 1"));
  assert.ok(carousel.includes("circularCarouselOffset(index, active"));
  assert.ok(!/setInterval|setTimeout|autoplay/i.test(carousel));
  const tech = read("src/components/stack/technology-index.tsx");
  assert.equal((tech.match(/<Link\s/g) || []).length, 1);
  assert.ok(tech.includes("technology.definition"));
  assert.ok(!tech.includes('"use client"'));
  const css = read("app/globals.css");
  assert.ok(
    /\(hover: hover\)\s*and\s*\(pointer: fine\)\s*and\s*\(prefers-reduced-motion: no-preference\)/.test(
      css,
    ),
  );
  assert.ok(css.includes(".has-definition:focus-within"));
  assert.ok(css.includes("transform-style: preserve-3d"));
  assert.ok(css.includes("grid-template-columns: repeat(3"));
  assert.ok(css.includes("grid-template-columns: repeat(2"));
  assert.ok(!css.includes("line-clamp"));
});

test("technology masks use normalized assets and color without injecting SVG markup", () => {
  const read = (path: string) =>
    readFileSync(new URL(path, new URL("../", import.meta.url)), "utf8");
  const tech = read("src/components/stack/technology-index.tsx");
  assert.ok(!tech.includes("next/image"));
  assert.ok(tech.includes('technology.brandColor ?? "var(--accent)"'));
  assert.ok(tech.includes('maskImage: `url("${technology.icon.url}")`'));
  assert.ok(tech.includes('WebkitMaskImage: `url("${technology.icon.url}")`'));
  const css = read("app/globals.css");
  for (const prefix of ["", "-webkit-"])
    for (const rule of [
      "mask-repeat: no-repeat",
      "mask-position: center",
      "mask-size: contain",
    ])
      assert.ok(css.includes(prefix + rule));
  const logoRule = css.match(/\.technology-logo\s*\{([^}]+)\}/)?.[1];
  assert.ok(logoRule);
  assert.ok(!/background:|border:/.test(logoRule));
});
