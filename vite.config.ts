import react from "@vitejs/plugin-react";
import { execFileSync } from "node:child_process";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

/**
 * THE BUILD STAMP, resolved once here and frozen into both bundles.
 *
 * The site is published by hand: `npm run package` writes a zip and somebody
 * uploads it. Nothing else connects a commit to what is being served, and in
 * August 2026 that cost a full review — a round of corrections was read as
 * missing from production, and both the reviewer and the reviewed spent an
 * afternoon on it, when the deployment had been current for two days and the
 * browser was holding an older copy. A page that cannot say which version it is
 * cannot be reviewed; and with a manual upload, this line is also the only
 * evidence anywhere that the upload happened at all.
 *
 * It is `define`d rather than read at runtime so the server render and the
 * browser hydration see the same literal. Reading a clock in the component
 * would produce two different strings for the same page and React would
 * discard the markup.
 */
function git(...args: string[]) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    // A build from a tarball, or from a checkout with no git available. The
    // stamp degrades to the date alone rather than failing the build: an
    // unstamped commit is a smaller problem than a site that cannot be built.
    return "";
  }
}

const commit = git("rev-parse", "--short=7", "HEAD");
const dirty = commit !== "" && git("status", "--porcelain") !== "";
// The calendar day in El Salvador, where the readers are, on the same reasoning
// as `todayIso` in app/loan.ts: a UTC build after 18:00 local stamps tomorrow.
const buildDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

export default defineConfig({
  root: fileURLToPath(new URL("./static", import.meta.url)),
  base: "/",
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  plugins: [react()],
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
    // The "-dirty" suffix is not decoration: a stamp naming a commit that does
    // not describe the files in the zip is worse than no commit at all, because
    // it invites somebody to diff against the wrong tree.
    __BUILD_COMMIT__: JSON.stringify(commit === "" ? "" : `${commit}${dirty ? "-dirty" : ""}`),
  },
  build: {
    outDir: fileURLToPath(new URL("./dist", import.meta.url)),
    emptyOutDir: true,
  },
});
