import assert from "node:assert/strict";
import test from "node:test";

import { LANGS, PAGES, ROUTES, resolveRoute } from "../app/routes.ts";

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
