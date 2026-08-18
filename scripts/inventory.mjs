#!/usr/bin/env node
/**
 * The registry, printed as an inventory: every rule with its status, its norm
 * and the date somebody last read it, plus the two lists that matter most —
 * what the project decided without a source, and what it does not model at all.
 *
 * IT IS GENERATED AND NOT WRITTEN DOWN, on purpose. A hand-kept inventory in
 * the README is a second registry, and a second registry drifts: the first
 * decree that adds a rule leaves the table behind, and a reader trusts the
 * stale half because it looks like documentation. This reads `app/rules.ts` and
 * nothing else, so it cannot be out of date by more than the working tree is.
 *
 *   npm run inventory            markdown, for pasting into an issue or a PR
 *   npm run inventory -- --terse one line per rule, for a quick look
 */
import { ALL_RULES, RULE_USAGE } from "../app/rules.ts";

const terse = process.argv.includes("--terse");

/** Which pages apply a rule. A rule no page applies is dead weight and says so. */
const pagesUsing = new Map();
for (const [page, ids] of Object.entries(RULE_USAGE)) {
  if (page === "home") continue;
  for (const id of ids) {
    if (!pagesUsing.has(id)) pagesUsing.set(id, []);
    pagesUsing.get(id).push(page);
  }
}

const statusOf = (rule) => {
  const flags = new Set();
  for (const version of rule.versions) for (const flag of version.status ?? []) flags.add(flag);
  return [...flags];
};

/** The oldest review across a rule's versions: a superseded table is still on screen. */
const oldestReview = (rule) =>
  rule.versions.map((version) => version.reviewed).sort()[0];

const versionCount = ALL_RULES.reduce((total, rule) => total + rule.versions.length, 0);
const flagged = ALL_RULES.filter((rule) => statusOf(rule).length > 0);
const unsourced = ALL_RULES.filter((rule) => statusOf(rule).includes("UNSOURCED"));
const disputed = ALL_RULES.filter((rule) => statusOf(rule).includes("DISPUTED"));
const unmodelled = ALL_RULES.filter((rule) => statusOf(rule).includes("NOT MODELLED"));
const unused = ALL_RULES.filter((rule) => !pagesUsing.has(rule.id));

if (terse) {
  for (const rule of ALL_RULES) {
    const flags = statusOf(rule);
    console.log([
      rule.id.padEnd(30),
      oldestReview(rule),
      (pagesUsing.get(rule.id) ?? ["—"]).join(","),
      flags.length > 0 ? `[${flags.join(" + ")}]` : "",
    ].join("  ").trimEnd());
  }
  console.log(`\n${ALL_RULES.length} reglas · ${versionCount} versiones · ${flagged.length} con estado`);
  process.exit(0);
}

const line = (rule) => {
  const flags = statusOf(rule);
  const version = rule.versions[0];
  return `| \`${rule.id}\` | ${version.unit ?? rule.unit} | ${version.norm} | ${oldestReview(rule)} | ${flags.join(" + ") || "—"} | ${(pagesUsing.get(rule.id) ?? ["—"]).join(", ")} |`;
};

console.log(`# Inventario del registro

${ALL_RULES.length} reglas, ${versionCount} versiones. ${flagged.length} llevan estado:
${disputed.length} en disputa, ${unsourced.length} sin fuente y ${unmodelled.length} fuera de alcance.

Generado con \`npm run inventory\` desde \`app/rules.ts\`. No se edita a mano.

| Regla | Unidad | Norma de la versión vigente | Revisada | Estado | Páginas |
| ----- | ------ | --------------------------- | -------- | ------ | ------- |`);
for (const rule of ALL_RULES) console.log(line(rule));

const detail = (title, rules, lead) => {
  if (rules.length === 0) return;
  console.log(`\n## ${title}\n\n${lead}\n`);
  for (const rule of rules) {
    for (const version of rule.versions) {
      if (!version.status || version.status.length === 0) continue;
      // Notes run to several paragraphs. Every line is indented, not just the
      // first: an unindented continuation breaks out of the list item and the
      // markdown renders the rest of the note as body text under nothing.
      const note = String(version.note ?? "").split("\n").map((line) => `  ${line}`.trimEnd()).join("\n");
      console.log(`- **\`${rule.id}\`** (${version.status.join(" + ")}, desde ${version.from}) — ${version.norm}\n${note}`);
    }
  }
};

detail("Lo que sigue sin fuente", unsourced,
  "Ningún documento fija el dato. No hay dos lecturas que contraponer: el proyecto eligió la cifra y lo declara en pantalla y aquí.");
detail("Lo que está en disputa", disputed,
  "Dos lecturas defendibles, o un texto y una práctica oficial que no dicen lo mismo. El sitio aplica una y nombra la otra.");
detail("Lo que quedó fuera de alcance", unmodelled,
  "La regla existe y ninguna calculadora la aplica. Está en el registro para que el aviso de vencimiento la mantenga bajo revisión y para que quien la busque descubra que falta a propósito.");

if (unused.length > 0) {
  console.log(`\n## Reglas que ninguna página aplica\n`);
  for (const rule of unused) console.log(`- \`${rule.id}\``);
  console.log(`\nQuedan fuera del aviso de \`check:rules\` y de la insignia de cualquier página. La prueba de estructura falla si esta lista deja de estar vacía.`);
}
