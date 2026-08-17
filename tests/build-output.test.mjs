import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { disputeFor, disputesForPage } from "../app/disputes.ts";
import { FAQ } from "../app/faq.ts";
import { absoluteUrl, LANGS, OG_CARD, ogImagePath, PAGES, PAGE_META, ROUTES } from "../app/routes.ts";
import { disputedVersions } from "../app/rules.ts";
import { OFFICIAL } from "../app/sources.ts";
import { RULES_REVIEWED } from "../app/statutory.ts";

/**
 * What React does to the copy on its way into the markup. Comparing raw
 * Spanish and English prose against rendered HTML fails on the apostrophes and
 * quotation marks the legal quotations are full of, and the failure looks like
 * a missing string rather than an encoding difference.
 */
const escapeHtml = (text) => text
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#x27;");

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

  const aguinaldo = await pageHtml("es", "aguinaldo");
  assert.match(aguinaldo, /Cuánto aguinaldo te toca este año/);
  // The deadline is the one figure on that page a reader can act on, so it has
  // to survive into the prerendered markup and not wait for JavaScript.
  assert.match(aguinaldo, /de diciembre de \d{4}/);
  assert.match(aguinaldo, /Código de Trabajo art\. 198/);
  // The fiscal panel goes as far as the taxable base and stops there. The
  // exempt slice is sourced — numeral 16) is permanent and governs any year no
  // decree displaces — so it is shown; the withholding on the excess is named
  // by no text, so a figure for it must never appear.
  for (const label of [/Porción exenta/, /Base gravada/]) {
    assert.match(aguinaldo, label, "the exempt slice is sourced and belongs on the page");
  }
  assert.doesNotMatch(aguinaldo, /Retención estimada/,
    "no text names the table that withholds on a bonus; printing one would invent it");
  // The claim that a decree may still arrive, and roughly when, is the note
  // that keeps the permanent floor from reading as a settled answer.
  assert.match(aguinaldo, /finales de octubre y principios de diciembre/);
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
    assert.match(html, new RegExp(`href="${ROUTES[other][page]}" hrefLang="${other}"`, "i"), `${lang} ${page}`);
  }
});

test("generates a sitemap that matches the routes actually built", async () => {
  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(
    listed.sort(),
    everyPage.map(([lang, page]) => absoluteUrl(lang, page)).sort(),
  );
  // The review date, not the build date: a lastmod that moves on every build
  // is a field crawlers learn to ignore.
  const stamps = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
  assert.equal(stamps.length, listed.length);
  assert.deepEqual([...new Set(stamps)], [RULES_REVIEWED]);
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

  assert.match(html, /name="twitter:card" content="summary_large_image"/i);
  assert.match(html, /http-equiv="Content-Security-Policy"/i);
  assert.match(html, /<noscript>/i);
});

test("gives every page its own social card, and ships the image", async () => {
  const seen = new Set();
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    const image = `https://loanpilot.marloncoreas.com${ogImagePath(lang, page)}`;
    const where = `${lang} ${page}`;

    // Sharing the settlement page used to preview the loan card: the right
    // title above an image describing a different tool entirely.
    assert.match(html, new RegExp(`property="og:image" content="${image.replaceAll(".", "\\.")}"`), where);
    assert.match(html, new RegExp(`name="twitter:image" content="${image.replaceAll(".", "\\.")}"`), where);
    assert.match(html, new RegExp(`property="og:image:alt" content="${OG_CARD[lang][page].alt.slice(0, 30)}`), where);

    // A card is only a preview if the PNG the tags point at actually ships.
    await access(new URL(ogImagePath(lang, page).slice(1), outputRoot));

    assert.equal(seen.has(image), false, `duplicate card: ${image}`);
    seen.add(image);
  }
});

test("describes every page to search engines with structured data", async () => {
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    const where = `${lang} ${page}`;
    const [, json] = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s) ?? [];
    assert.ok(json, `${where} ships no structured data`);

    const graph = JSON.parse(json)["@graph"];
    const types = graph.map((node) => node["@type"]);
    assert.deepEqual(
      types,
      page === "home"
        ? ["Organization", "WebSite", "FAQPage"]
        // The disputed-rules page takes no input and returns no figure, so it
        // is a document and not an application. Describing it with the
        // calculator vocabulary would promise a crawler a sixth calculator.
        : page === "disputed"
          ? ["Organization", "WebSite", "WebPage", "BreadcrumbList"]
          : ["Organization", "WebSite", "WebApplication", "BreadcrumbList"],
      where,
    );

    if (page === "disputed") {
      const document = graph[2];
      assert.equal(document.url, absoluteUrl(lang, page), where);
      assert.equal(document.inLanguage, lang, where);
      assert.equal(document.offers, undefined, `${where} must not price itself like a tool`);
    } else if (page === "home") {
      // The rich result has to answer what the page answers, not more.
      const questions = graph[2].mainEntity.map((entry) => entry.name);
      assert.deepEqual(questions, FAQ[lang].map((entry) => entry.question), where);
      for (const { question, answer } of FAQ[lang]) {
        assert.ok(html.includes(question), `${where} hides a question it markets: ${question}`);
        assert.ok(html.includes(answer.slice(0, 60)), `${where} hides an answer it markets`);
      }
    } else {
      const app = graph[2];
      assert.equal(app.url, absoluteUrl(lang, page), where);
      assert.equal(app.inLanguage, lang, where);
      assert.equal(app.offers.price, "0", where);
      // The name is the title without the brand suffix, which only works while
      // every title keeps the "<page> | LoanPilot" shape.
      assert.equal(app.name, PAGE_META[lang][page].title.replace(" | LoanPilot", ""), where);
      assert.doesNotMatch(app.name, /LoanPilot/, where);
    }
  }
});

test("publishes every contested rule on the page that exists to carry them", async () => {
  // THE ONE THAT FAILS WHEN A DISPUTE GOES QUIET. Not a check that the file
  // compiles or that the copy exists — a check that the rendered HTML somebody
  // will actually read names each rule the registry marks as contested, in
  // both languages, with its article and both readings. Marking a rule
  // DISPUTED in `rules.ts` and shipping a page that does not mention it is the
  // failure this whole page is a defence against.
  const contested = disputedVersions();
  assert.ok(contested.length > 0);

  for (const lang of LANGS) {
    const html = await pageHtml(lang, "disputed");
    for (const { rule, version } of contested) {
      const dispute = disputeFor(rule.id);
      const where = `${lang} ${rule.id}`;

      // The anchor every callout across the site links into.
      assert.ok(html.includes(`id="${rule.id}"`), `${where}: no anchor to link a callout at`);
      assert.ok(html.includes(escapeHtml(dispute.question[lang])), `${where}: the question is missing`);
      assert.ok(html.includes(escapeHtml(version.norm)), `${where}: the article is missing`);
      assert.ok(html.includes(OFFICIAL[version.source]), `${where}: nothing to open and check`);
      for (const reading of dispute.readings) {
        assert.ok(html.includes(escapeHtml(reading.label[lang])), `${where}: a reading is missing`);
      }
      // Every flag the registry raises has to be visible, not just the first.
      for (const flag of version.status) {
        const label = flag === "DISPUTED" ? { es: "EN DISPUTA", en: "DISPUTED" }
          : flag === "UNSOURCED" ? { es: "SIN FUENTE", en: "UNSOURCED" }
            : { es: "NO MODELADA", en: "NOT MODELLED" };
        assert.ok(html.includes(label[lang]), `${where}: ${flag} is not shown`);
      }
    }
  }
});

test("each calculator names the contested rules it applies, before being asked", async () => {
  // The deep-linked callouts are conditional by nature — the article 187
  // divergence only appears on a resignation carrying a part-year of vacation —
  // so a reader whose dates miss all of them would never learn that any of this
  // is unsettled. The panel is the unconditional half, and it is generated from
  // `RULE_USAGE`, so this also catches an anchor that stops matching after a
  // rule is renamed.
  for (const lang of LANGS) {
    const disputedPath = ROUTES[lang].disputed;
    for (const page of PAGES) {
      if (page === "home" || page === "disputed") continue;
      const html = await pageHtml(lang, page);
      const expected = disputesForPage(page);
      for (const dispute of expected) {
        assert.ok(html.includes(`${disputedPath}#${dispute.rule}`),
          `${lang} ${page} applies ${dispute.rule} and links to no explanation of it`);
        assert.ok(html.includes(escapeHtml(dispute.question[lang])), `${lang} ${page}: ${dispute.rule}`);
      }
      // A calculator that applies none says nothing rather than reassuring the
      // reader with an empty list.
      if (expected.length === 0) {
        assert.doesNotMatch(html, new RegExp(`${disputedPath}#`), `${lang} ${page}`);
      }
    }
  }
});

test("ships an error page the server can hand to a missed address", async () => {
  const html = await readFile(new URL("404.html", outputRoot), "utf8");

  assert.match(html, /<title>Página no encontrada \| LoanPilot<\/title>/);
  assert.match(html, /Esta página no existe/);
  // One file for every wrong address, so it claims no address of its own: a
  // canonical URL here would fold the error page into a real page.
  assert.match(html, /name="robots" content="noindex, follow"/);
  assert.doesNotMatch(html, /rel="canonical"/);
  assert.doesNotMatch(html, /rel="alternate"/);
  // A dead end is worse than a wrong turn: the tools stay one click away.
  for (const page of PAGES) assert.match(html, new RegExp(`href="${ROUTES.es[page]}"`), page);

  const sitemap = await readFile(new URL("sitemap.xml", outputRoot), "utf8");
  assert.doesNotMatch(sitemap, /404/);

  const htaccess = await readFile(new URL(".htaccess", outputRoot), "utf8");
  assert.match(htaccess, /ErrorDocument 404 \/404\.html/);
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
