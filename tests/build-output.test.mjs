import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

const outputRoot = new URL("../dist/", import.meta.url);
const indexHtml = () => readFile(new URL("index.html", outputRoot), "utf8");
const routeHtml = (route) => readFile(new URL(`${route}/index.html`, outputRoot), "utf8");

test("builds a self-contained static site", async () => {
  const [html, files] = await Promise.all([indexHtml(), readdir(outputRoot)]);

  assert.match(html, /<title>Herramientas financieras para El Salvador \| LoanPilot<\/title>/i);
  assert.match(html, /https:\/\/loanpilot\.marloncoreas\.com\//i);
  assert.match(html, /src="\/assets\/.+\.js"/i);
  assert.ok(files.includes("assets"));

  await access(new URL("favicon.svg", outputRoot));
  await access(new URL("robots.txt", outputRoot));
  await access(new URL("sitemap.xml", outputRoot));
  await access(new URL(".htaccess", outputRoot));
  await Promise.all(["prestamos", "finiquito", "retenciones"].map((route) => access(new URL(`${route}/index.html`, outputRoot))));
});

test("prerenders the directory and every calculator instead of shipping empty roots", async () => {
  const [html, loans, settlement, withholding] = await Promise.all([
    indexHtml(), routeHtml("prestamos"), routeHtml("finiquito"), routeHtml("retenciones"),
  ]);

  for (const page of [html, loans, settlement, withholding]) assert.doesNotMatch(page, /<div id="root"><\/div>/);
  assert.match(html, /Elige una herramienta/);
  assert.match(html, /Calculadora de préstamos/);
  assert.match(html, /Finiquito e indemnización/);
  assert.match(html, /Retenciones salariales/);
  assert.match(loans, /Entiende tu préstamo/);
  assert.match(loans, /Costo efectivo anual estimado/);
  assert.match(settlement, /Calcula lo que corresponde al terminar tu empleo/);
  assert.match(settlement, /Indemnización \/ prestación/);
  assert.match(settlement, /Las piezas de una liquidación laboral/);
  assert.match(settlement, /Salario base y topes/);
  assert.doesNotMatch(settlement, /class="statutory-tabs"/);
  assert.match(withholding, /Entiende cada descuento de tu salario/);
  assert.match(withholding, /Decreto Ejecutivo 10\/2025/);
  assert.match(withholding, /Los descuentos que forman tu pago neto/);
  assert.match(withholding, /Retención de renta/);
  assert.doesNotMatch(withholding, /class="statutory-tabs"/);
});

test("gives every page its own title and canonical URL", async () => {
  const routes = [
    ["prestamos", "Calculadora de préstamos", "/prestamos/"],
    ["finiquito", "Calculadora de finiquito e indemnización", "/finiquito/"],
    ["retenciones", "Calculadora de retenciones salariales", "/retenciones/"],
  ];
  for (const [route, title, canonical] of routes) {
    const html = await routeHtml(route);
    assert.match(html, new RegExp(`<title>${title}`));
    assert.match(html, new RegExp(`rel="canonical" href="https://loanpilot\\.marloncoreas\\.com${canonical}"`));
  }
});

test("uses the same professional footer across the platform", async () => {
  const pages = await Promise.all([
    indexHtml(), routeHtml("prestamos"), routeHtml("finiquito"), routeHtml("retenciones"),
  ]);
  for (const html of pages) {
    assert.match(html, /class="site-footer"/);
    assert.match(html, /Privado por diseño/);
    assert.match(html, /href="\/prestamos\/"/);
    assert.match(html, /href="\/finiquito\/"/);
    assert.match(html, /href="\/retenciones\/"/);
    assert.match(html, /Fuentes oficiales/);
  }
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
