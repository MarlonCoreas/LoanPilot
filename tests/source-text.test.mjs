import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { extname } from "node:path";
import test from "node:test";

/**
 * The repository's own text, read as text.
 *
 * A NUL byte reached `app/rules.ts` through an earlier edit and turned the most
 * important file in the project into a binary blob as far as the tools that
 * read it are concerned: `grep` answers "Binary file matches" and prints
 * nothing, `git diff` refuses to show the change, and a review of that commit
 * showed a file with no visible content. The registry is the one file whose
 * every line is supposed to be readable by a human checking figures against
 * decrees, and for a while it was not — while every test passed, because the
 * character sat inside a string that nothing asserted on.
 *
 * So this is not a style rule. It is the check that the source stays greppable,
 * diffable and reviewable, which is what the rest of the auditability claims in
 * this project are built on.
 *
 * Tab and newline are text. Everything else below U+0020, plus DEL, is not.
 * Carriage return is banned on purpose: no file here uses CRLF, and a stray one
 * is the same class of invisible edit artefact.
 */

const ROOT = new URL("../", import.meta.url);

/** Directories that are not this project's source, or are not text at all. */
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "release", "og"]);

/** What is read as text. A file type absent here is simply not checked. */
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".mjs", ".js", ".json", ".css", ".html", ".md", ".txt",
  ".yml", ".yaml", ".svg", ".sh",
]);
/** Dotfiles carry their whole name in `extname`'s blind spot. */
const TEXT_NAMES = new Set([".htaccess", ".gitignore", "LICENSE"]);

const isText = (name) => TEXT_NAMES.has(name) || TEXT_EXTENSIONS.has(extname(name));

async function textFiles(dir = ROOT, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      found.push(...await textFiles(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`));
    } else if (entry.isFile() && isText(entry.name)) {
      found.push({ path: `${prefix}${entry.name}`, url: new URL(entry.name, dir) });
    }
  }
  return found;
}

/** Every banned codepoint in a file, with the line and column a reader can go to. */
function controlCharacters(contents) {
  const found = [];
  let line = 1;
  let column = 1;
  for (const char of contents) {
    if (char === "\n") {
      line++;
      column = 1;
      continue;
    }
    const code = char.codePointAt(0);
    if (char !== "\t" && (code < 0x20 || code === 0x7F)) found.push({ line, column, code });
    column++;
  }
  return found;
}

const describe = (bad) => bad
  .map(({ line, column, code }) =>
    `U+${code.toString(16).toUpperCase().padStart(4, "0")} at ${line}:${column}`)
  .join(", ");

test("no source file carries a non-printable control character", async () => {
  const files = await textFiles();
  // A walk that silently found nothing would make this test a decoration, and a
  // decoration is exactly what let the NUL through the first time.
  assert.ok(files.length > 30, `only ${files.length} source files were read`);
  assert.ok(files.some((file) => file.path === "app/rules.ts"), "the registry was not read");

  for (const file of files) {
    const bad = controlCharacters(await readFile(file.url, "utf8"));
    assert.deepEqual(bad, [],
      `${file.path} carries ${describe(bad)} — the file is binary to grep, git diff and review`);
  }
});

test("the check would actually catch the character that got through", async () => {
  // The failure mode this guards against is a check that reads every file and
  // notices nothing. A NUL inside a string literal is the exact shape of the
  // one that reached `rules.ts`, so it is the shape asserted on — written as an
  // escape, because a literal one in this file would be the thing the test
  // above forbids.
  const withNul = "const key = `${norm}\u0000${source}`;";
  assert.deepEqual(controlCharacters(withNul), [{ line: 1, column: 21, code: 0 }]);
  assert.equal(describe(controlCharacters(withNul)), "U+0000 at 1:21");

  assert.deepEqual(controlCharacters("line\ttab\nlínea dos\n"), []);
  assert.deepEqual(controlCharacters("carriage\r\n"), [{ line: 1, column: 9, code: 13 }]);
});
