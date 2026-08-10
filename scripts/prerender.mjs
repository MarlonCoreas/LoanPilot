import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";

const PLACEHOLDER = '<div id="root"></div>';

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
});

try {
  const { render } = await server.ssrLoadModule("/entry-server.tsx");
  const rootTarget = new URL("../dist/index.html", import.meta.url);
  const template = await readFile(rootTarget, "utf8");

  if (!template.includes(PLACEHOLDER)) {
    throw new Error(`prerender: no se encontró ${PLACEHOLDER} en dist/index.html`);
  }

  const routes = [
    { path: "/", title: "Herramientas financieras para El Salvador | LoanPilot", description: "Calculadoras gratuitas de préstamos, finiquito, indemnización y retenciones salariales para El Salvador.", ogTitle: "LoanPilot | Herramientas financieras para El Salvador" },
    { path: "/prestamos/", title: "Calculadora de préstamos en El Salvador | LoanPilot", description: "Calcula cuotas, seguros, costo efectivo y el ahorro de hacer abonos a capital en tu préstamo.", ogTitle: "LoanPilot | Calculadora de préstamos" },
    { path: "/finiquito/", title: "Calculadora de finiquito e indemnización | LoanPilot", description: "Estima indemnización, vacaciones, aguinaldo y salarios pendientes conforme a las reglas laborales de El Salvador.", ogTitle: "LoanPilot | Finiquito e indemnización" },
    { path: "/retenciones/", title: "Calculadora de retenciones salariales | LoanPilot", description: "Estima AFP, ISSS e ISR con las tablas oficiales de retención vigentes en El Salvador.", ogTitle: "LoanPilot | Retenciones salariales" },
  ];

  const metadata = (html, route) => {
    const url = `https://loanpilot.marloncoreas.com${route.path}`;
    return html
      .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
      .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/s, `<meta name="description" content="${route.description}" />`)
      .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`)
      .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`)
      .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${route.ogTitle}" />`)
      .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/s, `<meta property="og:description" content="${route.description}" />`)
      .replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${route.ogTitle}" />`)
      .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/s, `<meta name="twitter:description" content="${route.description}" />`);
  };

  let totalMarkup = 0;
  for (const route of routes) {
    const markup = render(route.path);
    totalMarkup += markup.length;
    const rendered = metadata(template.replace(PLACEHOLDER, `<div id="root">${markup}</div>`), route);
    const target = route.path === "/" ? rootTarget : new URL(`../dist${route.path}index.html`, import.meta.url);
    await mkdir(new URL("./", target), { recursive: true });
    await writeFile(target, rendered);
  }
  console.log(`prerender: ${routes.length} páginas y ${(totalMarkup / 1024).toFixed(1)} kB de HTML incrustados`);
} finally {
  await server.close();
}
