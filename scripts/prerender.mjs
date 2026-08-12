import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";

const PLACEHOLDER = '<div id="root"></div>';
const ALTERNATES_SLOT = "<!--alternates-->";
const JSONLD_SLOT = "<!--jsonld-->";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
});

try {
  const {
    render, alternates, absoluteUrl, LANGS, OG_CARD, OG_LOCALE, ogImagePath, PAGES, PAGE_META,
    ROUTES, RULES_REVIEWED, SITE_ORIGIN, structuredDataScript,
  } = await server.ssrLoadModule("/entry-server.tsx");

  const rootTarget = new URL("../dist/index.html", import.meta.url);
  const template = await readFile(rootTarget, "utf8");

  for (const marker of [PLACEHOLDER, ALTERNATES_SLOT, JSONLD_SLOT]) {
    if (!template.includes(marker)) {
      throw new Error(`prerender: no se encontró ${marker} en dist/index.html`);
    }
  }

  // A silent miss here is the dangerous failure: every page would ship with the
  // template's own title and canonical URL, and nothing at build time would say
  // so. Each substitution must match exactly once, and the replacement is a
  // function so that a `$&` inside a description stays literal text.
  const substitute = (html, pattern, replacement, path) => {
    const matches = html.match(new RegExp(pattern, pattern.flags + "g"));
    if (matches?.length !== 1) {
      throw new Error(`prerender: ${pattern} coincidió ${matches?.length ?? 0} veces en ${path}; se esperaba 1`);
    }
    return html.replace(pattern, () => replacement);
  };

  const metadata = (html, lang, page) => {
    const meta = PAGE_META[lang][page];
    const card = OG_CARD[lang][page];
    const image = `${SITE_ORIGIN}${ogImagePath(lang, page)}`;
    const url = absoluteUrl(lang, page);
    const path = ROUTES[lang][page];
    const alternateTags = alternates(page)
      .map(({ hreflang, href }) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
      .join("\n    ");
    const otherLocales = LANGS
      .filter((item) => item !== lang)
      .map((item) => `<meta property="og:locale:alternate" content="${OG_LOCALE[item]}" />`)
      .join("\n    ");

    const replacements = [
      [/<html lang="[^"]*">/, `<html lang="${lang}">`],
      [/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`],
      [/<meta\s+name="description"\s+content="[^"]*"\s*\/>/s, `<meta name="description" content="${meta.description}" />`],
      [/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`],
      [new RegExp(ALTERNATES_SLOT), `${alternateTags}\n    ${otherLocales}`],
      [/<meta property="og:locale" content="[^"]*"\s*\/>/, `<meta property="og:locale" content="${OG_LOCALE[lang]}" />`],
      [/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`],
      [/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${meta.ogTitle}" />`],
      [/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/s, `<meta property="og:description" content="${meta.description}" />`],
      [/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${meta.ogTitle}" />`],
      [/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/s, `<meta name="twitter:description" content="${meta.description}" />`],
      // The card is per page, like the title: sharing the settlement page used
      // to preview the loan card, which described a different tool entirely.
      [/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${image}" />`],
      [/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/s, `<meta property="og:image:alt" content="${card.alt}" />`],
      [/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${image}" />`],
      [new RegExp(JSONLD_SLOT), structuredDataScript(lang, page)],
    ];
    return replacements.reduce((current, [pattern, replacement]) => substitute(current, pattern, replacement, path), html);
  };

  let pages = 0;
  let totalMarkup = 0;
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const path = ROUTES[lang][page];
      // A card that is declared but not shipped is a broken preview nobody
      // sees until a link is already out in the world. Fail the build instead:
      // the cards are regenerated with `npm run og`.
      await access(new URL(`../dist${ogImagePath(lang, page)}`, import.meta.url)).catch(() => {
        throw new Error(`prerender: falta la tarjeta social dist${ogImagePath(lang, page)}; ejecuta "npm run og"`);
      });
      const markup = render(path);
      totalMarkup += markup.length;
      pages++;
      const rendered = metadata(template.replace(PLACEHOLDER, `<div id="root">${markup}</div>`), lang, page);
      const target = path === "/" ? rootTarget : new URL(`../dist${path}index.html`, import.meta.url);
      await mkdir(new URL("./", target), { recursive: true });
      await writeFile(target, rendered);
    }
  }

  // The document Apache serves for any address the site does not have. It is
  // one file for the whole site, so it carries no canonical URL and no
  // alternates — it is not a page, it is the absence of one — and asks not to
  // be indexed. The markup is Spanish; the browser re-renders it in the
  // language of the URL that missed (see app/NotFound.tsx).
  const notFound = [
    [/<title>[^<]*<\/title>/, "<title>Página no encontrada | LoanPilot</title>"],
    [/<meta\s+name="description"\s+content="[^"]*"\s*\/>/s, '<meta name="description" content="La dirección no corresponde a ninguna herramienta de LoanPilot." />'],
    [/<link rel="canonical" href="[^"]*"\s*\/>/, '<meta name="robots" content="noindex, follow" />'],
    [new RegExp(ALTERNATES_SLOT), ""],
    [new RegExp(JSONLD_SLOT), ""],
  ].reduce(
    (current, [pattern, replacement]) => substitute(current, pattern, replacement, "/404.html"),
    template.replace(PLACEHOLDER, `<div id="root">${render("/404")}</div>`),
  );
  await writeFile(new URL("../dist/404.html", import.meta.url), notFound);

  // Generated rather than hand-kept in public/: a sitemap that lists a route the
  // build does not emit, or misses one it does, is worse than no sitemap.
  const urls = LANGS.flatMap((lang) => PAGES.map((page) => {
    const links = alternates(page)
      .map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
      .join("\n");
    // The review date, not the build date: a lastmod that moves every time the
    // site is rebuilt teaches crawlers to ignore the field. This one changes
    // when the figures behind the pages are actually checked again.
    return `  <url>\n    <loc>${absoluteUrl(lang, page)}</loc>\n${links}\n    <lastmod>${RULES_REVIEWED}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>${page === "home" ? "1.0" : "0.9"}</priority>\n  </url>`;
  })).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  await writeFile(new URL("../dist/sitemap.xml", import.meta.url), sitemap);

  console.log(`prerender: ${pages} páginas, 404.html, sitemap con ${LANGS.length * PAGES.length} URLs y ${(totalMarkup / 1024).toFixed(1)} kB de HTML incrustados (${SITE_ORIGIN})`);
} finally {
  await server.close();
}
