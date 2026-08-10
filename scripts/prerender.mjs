import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";

const PLACEHOLDER = '<div id="root"></div>';
const ALTERNATES_SLOT = "<!--alternates-->";

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
});

try {
  const {
    render, alternates, absoluteUrl, LANGS, OG_LOCALE, PAGES, PAGE_META, ROUTES, SITE_ORIGIN,
  } = await server.ssrLoadModule("/entry-server.tsx");

  const rootTarget = new URL("../dist/index.html", import.meta.url);
  const template = await readFile(rootTarget, "utf8");

  for (const marker of [PLACEHOLDER, ALTERNATES_SLOT]) {
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
    ];
    return replacements.reduce((current, [pattern, replacement]) => substitute(current, pattern, replacement, path), html);
  };

  let pages = 0;
  let totalMarkup = 0;
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const path = ROUTES[lang][page];
      const markup = render(path);
      totalMarkup += markup.length;
      pages++;
      const rendered = metadata(template.replace(PLACEHOLDER, `<div id="root">${markup}</div>`), lang, page);
      const target = path === "/" ? rootTarget : new URL(`../dist${path}index.html`, import.meta.url);
      await mkdir(new URL("./", target), { recursive: true });
      await writeFile(target, rendered);
    }
  }

  // Generated rather than hand-kept in public/: a sitemap that lists a route the
  // build does not emit, or misses one it does, is worse than no sitemap.
  const urls = LANGS.flatMap((lang) => PAGES.map((page) => {
    const links = alternates(page)
      .map(({ hreflang, href }) => `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
      .join("\n");
    return `  <url>\n    <loc>${absoluteUrl(lang, page)}</loc>\n${links}\n    <changefreq>monthly</changefreq>\n    <priority>${page === "home" ? "1.0" : "0.9"}</priority>\n  </url>`;
  })).join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
  await writeFile(new URL("../dist/sitemap.xml", import.meta.url), sitemap);

  console.log(`prerender: ${pages} páginas, sitemap con ${LANGS.length * PAGES.length} URLs y ${(totalMarkup / 1024).toFixed(1)} kB de HTML incrustados (${SITE_ORIGIN})`);
} finally {
  await server.close();
}
