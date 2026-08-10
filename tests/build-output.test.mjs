import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { absoluteUrl, LANGS, PAGES, PAGE_META, ROUTES } from "../app/routes.ts";

const outputRoot = new URL("../dist/", import.meta.url);
const indexHtml = () => readFile(new URL("index.html", outputRoot), "utf8");
// Route paths are absolute and end in a slash, which is exactly the shape a
// relative URL against dist/ needs once the leading slash is dropped.
const pageHtml = (lang, page) =>
  readFile(new URL(`${ROUTES[lang][page].slice(1)}index.html`, outputRoot), "utf8");

const everyPage = LANGS.flatMap((lang) => PAGES.map((page) => [lang, page]));

test("builds a self-contained static site", async () => {
  const [html, files] = await Promise.all([indexHtml(), readdir(outputRoot)]);

  assert.match(html, /<title>Herramientas financieras para El Salvador \| LoanPilot<\/title>/i);
  assert.match(html, /src="\/assets\/.+\.js"/i);
  assert.ok(files.includes("assets"));

  await access(new URL("favicon.svg", outputRoot));
  await access(new URL("robots.txt", outputRoot));
  await access(new URL("sitemap.xml", outputRoot));
  await access(new URL(".htaccess", outputRoot));
  // Every route in the table has to exist on disk, in both languages.
  await Promise.all(everyPage.map(([lang, page]) => pageHtml(lang, page)));
});

test("prerenders every page instead of shipping empty roots", async () => {
  const pages = await Promise.all(everyPage.map(([lang, page]) => pageHtml(lang, page)));
  for (const html of pages) assert.doesNotMatch(html, /<div id="root"><\/div>/);

  const [home, loans, settlement, withholding] = await Promise.all([
    pageHtml("es", "home"), pageHtml("es", "loans"),
    pageHtml("es", "settlement"), pageHtml("es", "withholding"),
  ]);
  assert.match(home, /Elige una herramienta/);
  assert.match(loans, /Entiende tu préstamo/);
  assert.match(loans, /Costo efectivo anual estimado/);
  assert.match(settlement, /Calcula lo que corresponde al terminar tu empleo/);
  assert.match(settlement, /Indemnización \/ prestación/);
  assert.match(withholding, /Decreto Ejecutivo 10\/2025/);
  // The review date is the site's freshness claim; if the badge stops rendering,
  // the pages keep citing decrees with nothing saying when they were checked.
  for (const html of [settlement, withholding]) {
    assert.match(html, /Fuentes verificadas el \d{1,2} de [a-zé]+ de \d{4}/);
  }

  const [enHome, enLoans, enSettlement, enWithholding] = await Promise.all([
    pageHtml("en", "home"), pageHtml("en", "loans"),
    pageHtml("en", "settlement"), pageHtml("en", "withholding"),
  ]);
  assert.match(enHome, /Choose a tool/);
  assert.match(enLoans, /Understand your loan/);
  assert.match(enSettlement, /Estimate what is due when employment ends/);
  assert.match(enWithholding, /Understand every deduction from your pay/);
  for (const html of [enSettlement, enWithholding]) {
    assert.match(html, /Sources verified on \d{1,2} [A-Za-z]+ \d{4}/);
  }
  // A page that says lang="es" while serving English is the bug this whole
  // route split exists to prevent.
  for (const html of [enHome, enLoans, enSettlement, enWithholding]) {
    assert.match(html, /<html lang="en">/);
  }
});

test("gives every page its own title, canonical URL and link preview", async () => {
  const seen = new Set();
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    const meta = PAGE_META[lang][page];
    const url = absoluteUrl(lang, page).replaceAll(".", "\\.");
    const where = `${lang} ${page}`;

    assert.match(html, new RegExp(`<title>${meta.title.replaceAll("|", "\\|")}</title>`), where);
    assert.match(html, new RegExp(`rel="canonical" href="${url}"`), where);
    assert.match(html, new RegExp(`property="og:url" content="${url}"`), where);
    assert.match(html, new RegExp(`property="og:title" content="${meta.ogTitle.replaceAll("|", "\\|")}"`), where);
    assert.match(html, new RegExp(`name="twitter:title" content="${meta.ogTitle.replaceAll("|", "\\|")}"`), where);
    for (const tag of ['name="description"', 'property="og:description"', 'name="twitter:description"']) {
      assert.match(html, new RegExp(`${tag} content="${meta.description.slice(0, 40)}`), `${where} is missing its ${tag}`);
    }
    // A copy-paste in the metadata table would hand two pages the same identity.
    assert.equal(seen.has(meta.title), false, `duplicate title: ${meta.title}`);
    seen.add(meta.title);
  }
});

test("declares reciprocal hreflang alternates on every page", async () => {
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    // Each page must point at both translations and itself, or search engines
    // treat the cluster as one-directional and drop it.
    for (const other of LANGS) {
      const href = absoluteUrl(other, page).replaceAll(".", "\\.");
      assert.match(html, new RegExp(`rel="alternate" hreflang="${other}" href="${href}"`), `${lang} ${page} -> ${other}`);
    }
    assert.match(html, new RegExp(`hreflang="x-default" href="${absoluteUrl("es", page).replaceAll(".", "\\.")}"`));
    assert.match(html, new RegExp(`property="og:locale" content="${lang === "es" ? "es_SV" : "en_US"}"`));
  }
});

test("the language switch links to the same page in the other language", async () => {
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    const other = lang === "es" ? "en" : "es";
    assert.match(html, new RegExp(`href="${ROUTES[other][page]}" hreflang="${other}"`), `${lang} ${page}`);
  }
});

test("generates a sitemap that matches the routes actually built", async () => {
  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(
    listed.sort(),
    everyPage.map(([lang, page]) => absoluteUrl(lang, page)).sort(),
  );
});

test("keeps navigation inside the reader's language", async () => {
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    const foreign = lang === "es" ? "en" : "es";
    for (const target of PAGES) {
      assert.match(html, new RegExp(`href="${ROUTES[lang][target]}"`), `${lang} ${page} -> ${target}`);
    }
    // Only the language switch may point at the other language, and it links
    // to the counterpart of this page and nothing else.
    const foreignLinks = [...html.matchAll(/href="(\/[^":]*)"/g)]
      .map((match) => match[1])
      .filter((href) => Object.values(ROUTES[foreign]).includes(href));
    assert.deepEqual([...new Set(foreignLinks)], [ROUTES[foreign][page]], `${lang} ${page}`);
  }
});

test("ships link previews, a security policy and a no-JavaScript notice", async () => {
  const html = await indexHtml();

  assert.match(html, /property="og:image" content="https:\/\/[^"]+\/og\.png"/i);
  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /http-equiv="Content-Security-Policy"/i);
  assert.match(html, /<noscript>/i);

  // The card only renders if the file the tags point at actually ships.
  await access(new URL("og.png", outputRoot));
});

test("carries no scaffolding or hosting-provider traces", async () => {
  const [html, files] = await Promise.all([
    indexHtml(),
    readdir(new URL("assets/", outputRoot)),
  ]);

  assert.doesNotMatch(html, /codex|openai|hostinger|cloudflare|workers/i);
  assert.doesNotMatch(html, /Your site is taking shape/i);

  const stylesheets = await Promise.all(
    files
      .filter((name) => name.endsWith(".css"))
      .map((name) => readFile(new URL(`assets/${name}`, outputRoot), "utf8")),
  );
  // The stylesheet is hand-written; a framework preflight leaking back in
  // would quietly restore ~3 kB of rules the design never used.
  for (const css of stylesheets) {
    assert.doesNotMatch(css, /tailwind|@layer theme/i);
  }
});
