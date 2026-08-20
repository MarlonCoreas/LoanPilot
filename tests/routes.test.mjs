import assert from "node:assert/strict";
import test from "node:test";

import { LANGS, PAGES, PAGE_LABELS, PAGE_META, ROUTES, TOOL_PAGES, resolveRoute } from "../app/routes.ts";

test("the home description names every calculator the site actually ships", () => {
  // It is the Google snippet, and it had fallen behind by three tools: the
  // credit card, the year-end bonus and the annual return all shipped without
  // ever reaching it. Nothing caught that, because a description is prose and
  // prose does not fail a build.
  //
  // Derived from the nav labels rather than from a list kept here, so the next
  // calculator added to PAGES fails this until the snippet mentions it.
  for (const lang of LANGS) {
    const description = PAGE_META[lang].home.description.toLowerCase();
    for (const page of TOOL_PAGES) {
      assert.ok(description.includes(PAGE_LABELS[lang][page].toLowerCase()),
        `the ${lang} home snippet never mentions ${PAGE_LABELS[lang][page]}`);
    }
    // Google truncates around 160 characters; past that the tail is invisible.
    assert.ok(description.length <= 175,
      `the ${lang} home snippet is ${description.length} characters and will be cut`);
  }
});

test("resolves every route in the table, with or without a trailing slash", () => {
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const path = ROUTES[lang][page];
      assert.deepEqual(resolveRoute(path), { lang, page }, path);
      // Apache redirects a missing trailing slash, but the browser resolves the
      // path before that redirect lands.
      assert.deepEqual(resolveRoute(path.replace(/\/$/, "") || "/"), { lang, page }, path);
    }
  }
});

test("reports an unknown path instead of quietly serving the home page", () => {
  // A soft 404 — the home rendered under a wrong address — is indexed as a
  // duplicate of the real home, and tells the reader nothing went wrong.
  assert.deepEqual(resolveRoute("/prestamo/"), { lang: "es", page: "notFound" });
  assert.deepEqual(resolveRoute("/finiquito/2026/"), { lang: "es", page: "notFound" });
  assert.deepEqual(resolveRoute("/wp-admin/"), { lang: "es", page: "notFound" });
});

test("a missed English path stays in English", () => {
  assert.deepEqual(resolveRoute("/en/settlements/"), { lang: "en", page: "notFound" });
  assert.deepEqual(resolveRoute("/en/typo"), { lang: "en", page: "notFound" });
  // The English home itself is a hit, not a miss.
  assert.deepEqual(resolveRoute("/en"), { lang: "en", page: "home" });
});
