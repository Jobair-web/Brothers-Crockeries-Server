import test from "node:test";
import assert from "node:assert/strict";
import { slugify, escapeRegex } from "../utils/slugify.js";

test("slugify makes url-safe slugs", () => {
  assert.equal(slugify("  Non-stick Frying Pan 26cm! "), "non-stick-frying-pan-26cm");
  assert.equal(slugify("Tea & Coffee Ware"), "tea-coffee-ware");
});

test("slugify returns empty string for non-latin names (callers add a fallback)", () => {
  assert.equal(slugify("ব্রাদার্স"), "");
});

test("escapeRegex neutralises regex metacharacters", () => {
  const rx = new RegExp(escapeRegex("a.b*c(1)"), "i");
  assert.ok(rx.test("A.B*C(1)"));
  assert.ok(!rx.test("axbbc1"));
});
