import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { assumptionFor, disputeFor, unsettledForPage } from "../app/disputes.ts";
import { FAQ } from "../app/faq.ts";
import { absoluteUrl, LANGS, OG_CARD, ogImagePath, PAGES, PAGE_META, ROUTES } from "../app/routes.ts";
import { disputedVersions } from "../app/rules.ts";
import { OFFICIAL } from "../app/sources.ts";
import { fillDates, formatYearDay, SITE_DATES } from "../app/calendar.ts";
import { holesIn } from "../app/holes.ts";
import { fillFigures } from "../app/stakes.ts";
import { CONTESTED_FIGURES, RULES_REVIEWED } from "../app/statutory.ts";

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

  for (const icon of [
    "favicon.ico", "favicon.svg", "favicon-96x96.png",
    "apple-touch-icon.png", "logo-512.png",
  ]) {
    await access(new URL(icon, outputRoot));
  }
  assert.match(html, /rel="icon" type="image\/png" sizes="96x96" href="\/favicon-96x96\.png"/);
  assert.match(html, /rel="shortcut icon" href="\/favicon\.ico"/);
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
  // EVERY HERO ASSERTION HERE NAMES THE ACCENT HALF OF THE h1, never the first
  // half, and that is load-bearing rather than a style: since the headlines were
  // rewritten to lead with a search term, the first half of each one is also the
  // <title> and the og:title. A page that shipped an empty root would still
  // match it, and this test — whose entire job is to prove the body rendered —
  // would pass on a blank page. The accent half exists only inside the hero.
  //
  // Seven of them had drifted and this test had been failing since 421af70,
  // which moved the copy without moving the assertions. Only one failure showed
  // at a time, because assert throws on the first: the loan hero hid the
  // settlement one, which hid the annual one, and so on down. "Entiende tu
  // préstamo" still lives in `OG_CARD`, which paints the Open Graph image and is
  // a different surface with its own voice — so the string was findable in the
  // repository, which is what made the staleness look like a passing test.
  assert.match(loans, /Decide con claridad/);
  assert.match(loans, /Costo efectivo anual estimado/);
  assert.match(settlement, /Al terminar tu empleo/);
  assert.match(settlement, /Indemnización \/ prestación/);
  assert.match(withholding, /Decreto Ejecutivo 10\/2025/);

  // The card page: the contrast between the two futures is the page, so both
  // sides of it have to survive into the prerendered markup rather than wait
  // for JavaScript — and so does the fact that the minimum is not the pace at
  // which the debt ends, which is the sentence the whole tool is built around.
  const [card, enCard] = await Promise.all([pageHtml("es", "creditCard"), pageHtml("en", "creditCard")]);
  assert.match(card, /Cuánto te cuesta/);
  assert.match(card, /Solo el mínimo/);
  assert.match(card, /Con el abono/);
  assert.match(card, /Por qué el mínimo dura tanto/);
  assert.match(enCard, /What the minimum/);
  assert.match(enCard, /Minimum only/);
  assert.match(enCard, /Why the minimum takes so long/);
  // It applies no Salvadoran rule, so it makes no freshness claim — the same
  // silence the loan page keeps. A badge here would be a borrowed credential.
  for (const html of [loans, card]) {
    assert.doesNotMatch(html, /Fuentes verificadas el/, "a page with no statutory rule claims no date");
  }
  assert.doesNotMatch(enCard, /Sources verified on/);
  // And the SSF is offered as somewhere to compare rates, not as the authority
  // behind a figure on the screen.
  assert.ok(card.includes(OFFICIAL.ssf), "no link to the published rates and commissions");

  // The annual return: the page that sits closest to advice, so what is
  // asserted here is mostly what it must NOT do.
  const [annual, enAnnual] = await Promise.all([
    pageHtml("es", "annualTax"), pageHtml("en", "annualTax"),
  ]);
  assert.match(annual, /Contra lo que ya te retuvieron/);
  assert.match(enAnnual, /Against what was already withheld/);
  // The estimate notice is above the calculator, not at the foot. Position is
  // the assertion: a notice under the results is a notice nobody read.
  const noticeAt = annual.indexOf("Esto es una estimación educativa");
  assert.ok(noticeAt > 0, "the notice is missing");
  assert.ok(noticeAt < annual.indexOf("Tu año"), "the notice sits below the calculator");
  assert.match(annual, /no sustituye tu declaración oficial ante la DGII ni la revisión de un contador/i);
  // It never promises money. "Estimación del saldo" is the register; a refund
  // promise is the one sentence this page is not allowed to contain.
  assert.match(annual, /Saldo estimado/);
  assert.doesNotMatch(annual, /te devolver|te van a devolver|recibirás/i);
  assert.doesNotMatch(enAnnual, /you will (be refunded|receive|get) /i);
  // The two figures a reader acts on: the deadline and the receipts that close
  // a balance due.
  assert.match(annual, /30 de abril de \d{4}/);
  assert.match(annual, /Lo que cerraría este saldo/);
  assert.match(enAnnual, /What would close this balance/);
  // And the citations that took the longest to pin down.
  assert.match(annual, /art(\.|ículos) 34 y 37|arts\. 34 y 37/);
  assert.match(annual, /Ley Integral del Sistema de Pensiones arts\. 14, 16 y 26/);

  const aguinaldo = await pageHtml("es", "aguinaldo");
  assert.match(aguinaldo, /Cuánto te toca este año/);
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
  assert.match(enLoans, /Decide with clarity/);
  assert.match(enSettlement, /When employment ends/);
  assert.match(enWithholding, /Every deduction from your pay/);
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
  // will actually read names each rule the registry marks, in both languages,
  // with its article and its argument. Marking a rule DISPUTED in `rules.ts`
  // and shipping a page that does not mention it is the failure this whole page
  // is a defence against.
  const contested = disputedVersions();
  assert.ok(contested.length > 0);

  for (const lang of LANGS) {
    const html = await pageHtml(lang, "disputed");
    for (const { rule, version } of contested) {
      const where = `${lang} ${rule.id}`;
      const dispute = disputeFor(rule.id);
      const assumption = assumptionFor(rule.id);
      const entry = dispute ?? assumption;
      assert.ok(entry, `${where}: marked in the registry and written up nowhere`);

      // The anchor every callout across the site links into.
      assert.ok(html.includes(`id="${rule.id}"`), `${where}: no anchor to link a callout at`);
      assert.ok(html.includes(escapeHtml(entry.question[lang])), `${where}: the question is missing`);
      assert.ok(html.includes(escapeHtml(version.norm)), `${where}: the article is missing`);
      assert.ok(html.includes(OFFICIAL[version.source]), `${where}: nothing to open and check`);
      for (const reading of dispute?.readings ?? []) {
        assert.ok(html.includes(escapeHtml(reading.label[lang])), `${where}: a reading is missing`);
      }
      // What a silence has instead of a second reading: how far it travels. It
      // is the half a reader cannot reconstruct, so it has to reach the markup.
      if (assumption) {
        // Filled, not raw: `reach` is a template with holes the engine fills.
        // Comparing the template would look for "{closedCycle}" in the markup.
        const reach = fillFigures(assumption.reach[lang], rule.id, lang);
        assert.ok(html.includes(escapeHtml(reach)), `${where}: its reach is missing`);
        assert.ok(html.includes(escapeHtml(assumption.silence[lang])), `${where}: the texts are not quoted`);
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

test("the page separates the disagreements from the silences", async () => {
  // The correction this section split is. A reader shown "the two readings" for
  // a figure nobody contests is being handed a manufactured counter-argument,
  // and a silence filed under disputes reads as the softer of the two problems
  // when it is usually the harder one. Both headings have to be on the page,
  // each with its own anchor, or the two lists are one list again.
  const headings = {
    es: ["Reglas en disputa", "Supuestos sin fuente"],
    en: ["Rules in dispute", "Assumptions with no source"],
  };
  for (const lang of LANGS) {
    const html = await pageHtml(lang, "disputed");
    for (const heading of headings[lang]) {
      assert.ok(html.includes(escapeHtml(heading)), `${lang}: the "${heading}" section is missing`);
    }
    for (const anchor of ["disputed", "unsourced"]) {
      assert.ok(html.includes(`id="${anchor}"`), `${lang}: no anchor for the ${anchor} section`);
    }
    // Each entry lands under the heading its flags put it under, which is only
    // observable in the order the two lists are rendered in.
    const [disputedAt, unsourcedAt] = [html.indexOf('id="disputed"'), html.indexOf('id="unsourced"')];
    assert.ok(disputedAt < unsourcedAt, lang);
    for (const { rule, version } of disputedVersions("disputed")) {
      assert.ok(html.indexOf(`id="${rule.id}"`) > disputedAt, `${lang} ${rule.id}`);
      assert.ok(html.indexOf(`id="${rule.id}"`) < unsourcedAt,
        `${lang} ${rule.id} is ${version.status.join(" + ")} and rendered among the silences`);
    }
    for (const { rule } of disputedVersions("unsourced")) {
      assert.ok(html.indexOf(`id="${rule.id}"`) > unsourcedAt,
        `${lang} ${rule.id} is a silence and rendered among the disagreements`);
    }
  }
});

test("each calculator names the unsettled rules it applies, before being asked", async () => {
  // The deep-linked callouts are conditional by nature — the article 187
  // divergence only appears on a resignation carrying a part-year of vacation —
  // so a reader whose dates miss all of them would never learn that any of this
  // is unsettled. The panel is the unconditional half, and it is generated from
  // `RULE_USAGE`, so this also catches an anchor that stops matching after a
  // rule is renamed.
  //
  // Silences count. The divisor behind every daily figure is not contested by
  // anybody, and a panel that listed the arguable readings while staying quiet
  // about the invented ones would be the more flattering half of the truth.
  for (const lang of LANGS) {
    const disputedPath = ROUTES[lang].disputed;
    for (const page of PAGES) {
      if (page === "home" || page === "disputed") continue;
      const html = await pageHtml(lang, page);
      const expected = unsettledForPage(page);
      for (const item of expected) {
        assert.ok(html.includes(`${disputedPath}#${item.rule}`),
          `${lang} ${page} applies ${item.rule} and links to no explanation of it`);
        assert.ok(html.includes(escapeHtml(item.question[lang])), `${lang} ${page}: ${item.rule}`);
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

/**
 * The regression this whole mechanism exists for.
 *
 * The article 187 entry claimed a resignation two months past the anniversary
 * was worth "around 90 dollars at the minimum wage, and over 300 on a salary of
 * a thousand". The engine says $44.52 and $110.41. The 90 was the $90.16 of the
 * MTPS statement — a $937.54 salary — carried up from the readings below it and
 * given a label it did not fit, and the 300 corresponded to nothing at all. It
 * survived every review the project had, because prose is not checked the way
 * arithmetic is, and it was the first figure an accountant would verify on the
 * page whose entire argument is that the figures can be verified.
 *
 * So the rule is now structural rather than a matter of care: a stakes or reach
 * block may not contain a money literal. Not "must agree with the engine" —
 * may not contain one. A hand-written amount cannot drift from a calculation it
 * was never connected to if it cannot be written down in the first place.
 *
 * The other blocks are deliberately exempt. `readings`, `silence`, `choice` and
 * `why` quote official documents — the $90.16 and the $367.40 the MTPS prints,
 * the $1,500 ceiling article 2 names — and those figures are correct precisely
 * because they are transcriptions and not calculations. Deriving them would
 * replace a quotation with an assertion, which is the opposite of what this
 * page is for.
 */
const MONEY = /\$\s?\d|\d+(?:[.,]\d+)?\s*(?:d[óo]lares|dollars)\b/i;

test("no stakes or reach block writes an amount by hand", () => {
  const entries = disputedVersions().map(({ rule }) => {
    const dispute = disputeFor(rule.id);
    const assumption = assumptionFor(rule.id);
    return {
      id: rule.id,
      // "Qué está en juego" for a disagreement, "Hasta dónde llega" for a
      // silence: the same slot on the card, and the same rule about figures.
      block: dispute ? "stakes" : "reach",
      text: dispute?.stakes ?? assumption?.reach,
    };
  });
  assert.ok(entries.length > 0);

  for (const { id, block, text } of entries) {
    assert.ok(text, `${id}: has no ${block} block`);
    for (const lang of LANGS) {
      const template = text[lang];
      const bare = template.replace(/\{[a-zA-Z]+\}/g, "");
      assert.ok(!MONEY.test(bare),
        `${id} ${lang}: ${block} writes an amount by hand — "${bare.match(MONEY)?.[0]}". `
        + "Derive it in CONTESTED_FIGURES and leave a {hole} here.");

      // Filling has to work, and has to leave nothing behind. A hole naming a
      // figure the scenario does not produce throws inside `fillFigures`; this
      // catches the other direction, where the syntax itself is malformed.
      const filled = fillFigures(template, id, lang);
      assert.ok(!filled.includes("{"), `${id} ${lang}: ${block} still holds template syntax`);
      // And the injected text must actually carry the figures, or the block is
      // prose that merely looks derived.
      for (const hole of holesIn(template)) {
        assert.ok(id in CONTESTED_FIGURES && hole in CONTESTED_FIGURES[id],
          `${id} ${lang}: {${hole}} is not derived`);
      }
    }
  }
});

test("every derived figure is quoted by the entry that derives it", () => {
  // The other end of the same seam. A scenario nobody quotes is a calculation
  // running on every build with nothing checking its result, and it is the
  // shape a figure takes on the way out: the sentence gets rewritten, the hole
  // disappears, and the derivation stays behind looking maintained.
  for (const [id, figures] of Object.entries(CONTESTED_FIGURES)) {
    const dispute = disputeFor(id);
    const assumption = assumptionFor(id);
    const text = dispute?.stakes ?? assumption?.reach;
    assert.ok(text, `${id}: derives figures for an entry that does not exist`);
    const used = new Set(LANGS.flatMap((lang) => holesIn(text[lang])));
    for (const name of Object.keys(figures)) {
      assert.ok(used.has(name), `${id}: derives {${name}} and no sentence uses it`);
    }
    // Both languages have to quote the same figures. A number that appears in
    // the Spanish and not in the English is one of the two pages being less
    // specific than the other about what a rule costs somebody.
    const [es, en] = LANGS.map((lang) => holesIn(text[lang]).sort().join(","));
    assert.equal(es, en, `${id}: the two languages quote different figures`);
  }
});

test("the footer stamps which build the reader is looking at", async () => {
  // The failure this prevents: a review conducted in good faith against a
  // cached copy, with no way for either side to notice. It is not a claim
  // about the law and must not be confused with one, so it is checked here
  // alongside the freshness line it sits below and differs from.
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    assert.match(html, /class="build-stamp"/,
      `${lang} ${page}: no build stamp in the footer`);
    assert.match(html, /class="build-stamp">(Versión|Build) \d{4}-\d{2}-\d{2}/,
      `${lang} ${page}: the build stamp carries no date`);
  }
});

/**
 * The second half of the same lesson, learned the same way.
 *
 * D.L. 433 moved the aguinaldo's PAYMENT WINDOW to 20 October and left its
 * ACCRUAL CYCLE where it was, closing 11 December. Before the reform both fell
 * on 12 December, so for fifty years one sentence could carry both meanings —
 * and the prose written in that world did. When the cycle was corrected in
 * August 2026 the registry moved and the sentences did not:
 *
 *   - Two FAQ entries ended up adjacent, one saying 20 October is not the day
 *     service is measured and the next saying it is.
 *   - The aguinaldo calculator's cycle note still told readers the site
 *     prorated over the calendar year, months after it had stopped, and
 *     credited that to the MTPS — the same overstated attribution that had
 *     already been withdrawn from the disputed-rules page.
 *   - A call to action on the settlement page still sent people to "the days
 *     you are owed at 20 October".
 *
 * All of it shipped. So the dates stop being writable: prose names them
 * through {holes} and `calendar.ts` fills them from the registry version in
 * force. A future decree moves one entry and every sentence follows.
 */
const CYCLE_DATE = new RegExp(
  "(20\\s+de\\s+octubre|12\\s+de\\s+diciembre|11\\s+de\\s+diciembre|20\\s+de\\s+diciembre"
  + "|20\\s+October|12\\s+December|11\\s+December|20\\s+December)", "i");

test("no published sentence writes an aguinaldo cycle date by hand", async () => {
  // Read as source text, because the point is that the SENTENCE may not hold
  // the date — checking the rendered HTML would pass happily on prose that
  // hardcodes exactly what the registry happens to say today, which is the
  // state the site was already in when this went wrong.
  const copySources = ["faq.ts", "routes.ts", "AguinaldoPage.tsx", "StatutoryTools.tsx"];
  for (const file of copySources) {
    const source = await readFile(new URL(`../app/${file}`, import.meta.url), "utf8");
    for (const [index, line] of source.split("\n").entries()) {
      // Comments explain the rule and must be able to name the dates; the
      // registry itself is where they legitimately live.
      const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, "");
      const hit = code.match(CYCLE_DATE);
      assert.ok(!hit,
        `app/${file}:${index + 1}: writes "${hit?.[0]}" into copy. `
        + "Use a {hole} — cycleOpens, cycleCloses, windowOpens, windowCloses or "
        + "previousCutoff — and let calendar.ts fill it from the registry.");
    }
  }
});

test("the aguinaldo calendar renders from the registry in both languages", async () => {
  // The dates the registry actually holds, so a wrong hole cannot pass by
  // rendering something plausible.
  assert.deepEqual(SITE_DATES.cycleOpens, { month: 12, day: 12 });
  assert.deepEqual(SITE_DATES.cycleCloses, { month: 12, day: 11 });
  assert.deepEqual(SITE_DATES.windowOpens, { month: 10, day: 20 });
  assert.deepEqual(SITE_DATES.windowCloses, { month: 12, day: 20 });
  // The pre-reform cutoff comes from the rule's own earlier version, so the
  // "before the reform" half of every sentence is as checkable as the rest.
  assert.deepEqual(SITE_DATES.previousCutoff, { month: 12, day: 12 });

  assert.equal(fillDates("{cycleOpens} al {cycleCloses}", "es"), "12 de diciembre al 11 de diciembre");
  assert.equal(fillDates("{windowOpens} to {windowCloses}", "en"), "20 October to 20 December");
  assert.throws(() => fillDates("{noSuchDay}", "es"), /calendar/);

  // And the filled text has to reach the reader: no {hole} may survive into
  // any published page, in either language.
  for (const [lang, page] of everyPage) {
    const html = await pageHtml(lang, page);
    const leaked = html.match(/\{(cycleOpens|cycleCloses|windowOpens|windowCloses|previousCutoff)\}/);
    assert.ok(!leaked, `${lang} ${page}: shipped an unfilled ${leaked?.[0]}`);
  }
});

test("both FAQ entries name the day the bonus cycle actually closes", async () => {
  // THE CONTRADICTION, PINNED BY WHAT IT LACKED. The deadline entry used to
  // say "20 October is also the day your length of service is read at" and
  // close with "before the reform both happened on 12 December", while the
  // entry directly above it said 20 October is NOT that day. What the broken
  // version never contained was 11 December — the day the cycle closes and the
  // scale is actually read — so requiring both entries to name it is a real
  // regression test: run it against the old copy and it fails.
  //
  // Detecting the wrong CLAIM is not attempted. A regex cannot tell "es la
  // fecha en que se mide" from "no es la fecha en que se mide", and the first
  // draft of this test failed on the correct sentence for exactly that reason.
  // Prose is policed here by requiring the right facts to be present; that the
  // dates themselves cannot drift from the registry is the other test's job.
  const closes = { es: "11 de diciembre", en: "11 December" };
  for (const lang of LANGS) {
    const entries = FAQ[lang];
    // Matched on question and answer together: the deadline entry never says
    // "aguinaldo" in its answer — the word is in its question — and filtering
    // on the answer alone silently found only one of the two.
    const about = entries.filter(({ question, answer }) =>
      /aguinaldo|bonus/i.test(`${question} ${answer}`)
      && new RegExp(formatYearDay(SITE_DATES.windowOpens, lang)).test(answer));
    assert.ok(about.length >= 2, `${lang}: expected both bonus-date entries, found ${about.length}`);
    for (const entry of about) {
      assert.match(entry.answer, new RegExp(closes[lang]),
        `${lang}: "${entry.question}" names the payment window but never the day the cycle closes`);
    }
  }
});
