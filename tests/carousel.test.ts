import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  clampCarouselIndex,
  carouselKeyDelta,
  swipeDelta,
} from "../src/lib/carousel";
test("carousel clamps empty, single and multiple project navigation without wrapping", () => {
  for (const count of [0, 1, 3, 6]) {
    assert.equal(clampCarouselIndex(-1, count), 0);
    assert.equal(clampCarouselIndex(count, count), Math.max(0, count - 1));
  }
  assert.equal(clampCarouselIndex(2, 6), 2);
});
test("arrow keys and deliberate horizontal swipes select neighboring projects", () => {
  assert.equal(carouselKeyDelta("ArrowRight"), 1);
  assert.equal(carouselKeyDelta("ArrowLeft"), -1);
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
