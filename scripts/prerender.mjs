import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";

const PLACEHOLDER = '<div id="root"></div>';

const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "warn",
});

try {
  const { render } = await server.ssrLoadModule("/entry-server.tsx");
  const markup = render();

  const target = new URL("../dist/index.html", import.meta.url);
  const html = await readFile(target, "utf8");

  if (!html.includes(PLACEHOLDER)) {
    throw new Error(`prerender: no se encontró ${PLACEHOLDER} en dist/index.html`);
  }

  await writeFile(target, html.replace(PLACEHOLDER, `<div id="root">${markup}</div>`));
  console.log(`prerender: ${(markup.length / 1024).toFixed(1)} kB de HTML incrustados`);
} finally {
  await server.close();
}
