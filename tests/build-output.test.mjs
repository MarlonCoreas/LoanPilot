import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const outputRoot = new URL("../dist/", import.meta.url);
const indexHtml = () => readFile(new URL("index.html", outputRoot), "utf8");

test("builds a self-contained static site", async () => {
  const [html, files] = await Promise.all([indexHtml(), readdir(outputRoot)]);

  assert.match(html, /<title>Calculadora de préstamos en El Salvador \| LoanPilot<\/title>/i);
  assert.match(html, /https:\/\/loanpilot\.marloncoreas\.com\//i);
  assert.match(html, /src="\/assets\/.+\.js"/i);
  assert.ok(files.includes("assets"));

  await access(new URL("favicon.svg", outputRoot));
  await access(new URL("robots.txt", outputRoot));
  await access(new URL("sitemap.xml", outputRoot));
  await access(new URL(".htaccess", outputRoot));
});

test("prerenders the page instead of shipping an empty root", async () => {
  const html = await indexHtml();

  assert.doesNotMatch(html, /<div id="root"><\/div>/);
  // The headline, the trust line and the guide all have to survive into the
  // HTML: they are what a crawler or a link preview reads without running JS.
  assert.match(html, /Entiende tu préstamo/);
  assert.match(html, /BASADA EN NORMATIVA SALVADOREÑA/);
  assert.match(html, /Tus datos no salen de tu dispositivo/);
  assert.match(html, /Los datos que realmente importan/);
  // The estimate itself, not just the marketing copy, has to be in the markup.
  assert.match(html, /Costo efectivo anual estimado/);
});

test("ships link previews, a security policy and a no-JavaScript notice", async () => {
  const html = await indexHtml();

  assert.match(html, /property="og:title"/i);
  assert.match(html, /property="og:url"/i);
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
