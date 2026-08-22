/**
 * Renderiza una tarjeta social por página y por idioma en `public/og/`, con el
 * tamaño de 1200x630 que esperan WhatsApp, Facebook, LinkedIn y X.
 *
 *   npm run og
 *
 * El texto de cada tarjeta vive en `OG_CARD` (app/routes.ts), junto al resto de
 * los metadatos de la página, y no en este archivo: aquí sólo está el diseño.
 * Los PNG se versionan en el repositorio para que el build no necesite Chrome;
 * hay que volver a ejecutar este comando cuando cambie el texto de una tarjeta.
 */
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createServer } from "vite";

const run = promisify(execFile);

const CHROME_NAMES = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  // Las rutas del PATH cubren las instalaciones de Linux y las de Homebrew.
  ...CHROME_NAMES.flatMap((name) =>
    (process.env.PATH ?? "").split(":").filter(Boolean).map((dir) => join(dir, name))),
];

async function findChrome() {
  for (const candidate of CHROME_PATHS) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Siguiente candidato.
    }
  }
  throw new Error("No se encontró Chrome ni Chromium; son necesarios para renderizar las tarjetas.");
}

/** El HTML de una tarjeta. 1200x630 exactos, sin recursos externos. */
function cardHtml({ eyebrow, line1, line2, sub, accent }, { domain, tags }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <style>
      *{ box-sizing: border-box; margin: 0; padding: 0; }
      html, body { width: 1200px; height: 630px; }
      body {
        background: #102a2a;
        background-image: radial-gradient(#1d3d3b 1.5px, transparent 1.5px);
        background-size: 30px 30px;
        font-family: Helvetica, Arial, sans-serif;
        color: #fffefb;
        padding: 72px 76px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
      }
      .glow {
        position: absolute;
        width: 720px; height: 720px;
        right: -260px; top: -300px;
        background: radial-gradient(circle, ${accent}21, transparent 65%);
      }
      .top { display: flex; align-items: center; gap: 16px; position: relative; }
      .mark {
        width: 54px; height: 54px; border-radius: 50%;
        background: ${accent}; color: #102a2a;
        display: grid; place-items: center;
        font-size: 20px; font-weight: 800; letter-spacing: -1px;
      }
      .word { font-size: 30px; font-weight: 800; letter-spacing: -1px; }
      .pill {
        margin-left: auto;
        padding: 11px 20px 10px;
        border: 1px solid ${accent}4d; border-radius: 999px;
        color: ${accent};
        font-size: 15px; font-weight: 700; letter-spacing: 2px;
      }
      h1 {
        font-size: 82px; line-height: .97; letter-spacing: -3.5px;
        font-weight: 800; position: relative;
      }
      h1 em { font-style: normal; color: ${accent}; }
      .sub {
        margin-top: 26px; max-width: 800px;
        font-size: 25px; line-height: 1.45; color: #a8bab5;
      }
      .foot {
        display: flex; align-items: center; justify-content: space-between;
        border-top: 1px solid #2c4644; padding-top: 26px;
        position: relative;
      }
      .domain { font-size: 22px; font-weight: 700; color: ${accent}; }
      .tags { display: flex; gap: 30px; font-size: 17px; color: #8fa5a0; }
      .tags span::before { content: "✓"; color: ${accent}; margin-right: 9px; font-weight: 800; }
    </style>
  </head>
  <body>
    <div class="glow"></div>

    <div class="top">
      <div class="mark">LP</div>
      <div class="word">LoanPilot</div>
      <div class="pill">${eyebrow}</div>
    </div>

    <div>
      <h1>${line1}<br /><em>${line2}</em></h1>
      <p class="sub">${sub}</p>
    </div>

    <div class="foot">
      <div class="domain">${domain}</div>
      <div class="tags">${tags.map((tag) => `<span>${tag}</span>`).join("")}</div>
    </div>
  </body>
</html>
`;
}

// Las promesas de la tarjeta, en el idioma de la tarjeta.
const TAGS = {
  es: ["Gratis", "Sin registro", "Tus datos no salen del navegador"],
  en: ["Free", "No signup", "Your data stays in your browser"],
};

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });
let workspace;

try {
  const { datedCopy, LANGS, OG_CARD, ogImagePath, PAGES, SITE_ORIGIN } =
    await server.ssrLoadModule("/entry-server.tsx");

  const chrome = await findChrome();
  const domain = SITE_ORIGIN.replace(/^https?:\/\//, "");
  workspace = await mkdtemp(join(tmpdir(), "loanpilot-og-"));
  await mkdir(new URL("../public/og/", import.meta.url), { recursive: true });

  const written = [];
  for (const lang of LANGS) {
    for (const page of PAGES) {
      const source = join(workspace, `${lang}-${page}.html`);
      const card = datedCopy(OG_CARD[lang][page], lang);
      await writeFile(source, cardHtml(card, { domain, tags: TAGS[lang] }));

      const target = fileURLToPath(new URL(`../public${ogImagePath(lang, page)}`, import.meta.url));
      await run(chrome, [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1200,630",
        `--screenshot=${target}`,
        `file://${source}`,
      ]);
      written.push(ogImagePath(lang, page));
    }
  }

  console.log(`og: ${written.length} tarjetas\n${written.map((path) => `  public${path}`).join("\n")}`);
} finally {
  await server.close();
  if (workspace) await rm(workspace, { recursive: true, force: true });
}
