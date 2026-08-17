#!/usr/bin/env node
/**
 * Warns when a rule a calculator actually applies has gone six months without
 * anyone reading it back against its official source.
 *
 * This is the half that a test cannot do. The suite checks that every figure is
 * the figure the registry declares, which stays true forever after a decree
 * changes — the code and the tests agree with each other and both are wrong.
 * Only a date can catch that, and only if something says the date is old.
 *
 * It WARNS and exits 0 by default, because a stale review is not a broken
 * build: nothing is wrong until someone checks, and failing the build would
 * teach people to bump the dates without opening the documents, which is the
 * one outcome that would make the whole mechanism worse than nothing. Pass
 * `--strict` to make it an error instead.
 *
 * Only rules listed in RULE_USAGE are reported. A rule nobody applies is dead
 * weight, not a live claim, and shouting about it trains people to ignore this.
 */
import { ALL_RULES, RULES, RULE_USAGE } from "../app/rules.ts";

const MAX_AGE_MONTHS = 6;
const strict = process.argv.includes("--strict");
const inGithubActions = process.env.GITHUB_ACTIONS === "true";

const today = new Date();
const cutoff = new Date(today);
cutoff.setUTCMonth(cutoff.getUTCMonth() - MAX_AGE_MONTHS);
const cutoffIso = cutoff.toISOString().slice(0, 10);

/** Which pages apply a rule, so the warning says what is at stake. */
const pagesUsing = new Map();
for (const [page, ids] of Object.entries(RULE_USAGE)) {
  // The home page lists every rule by construction; naming it beside each one
  // would add a word to every line and tell the reader nothing.
  if (page === "home") continue;
  for (const id of ids) {
    if (!pagesUsing.has(id)) pagesUsing.set(id, []);
    pagesUsing.get(id).push(page);
  }
}

const monthsSince = (iso) => {
  const [year, month, day] = iso.split("-").map(Number);
  const months = (today.getUTCFullYear() - year) * 12 + (today.getUTCMonth() + 1 - month);
  return today.getUTCDate() < day ? months - 1 : months;
};

const stale = [];
for (const rule of ALL_RULES) {
  const pages = pagesUsing.get(rule.id);
  if (!pages || pages.length === 0) continue;
  for (const version of rule.versions) {
    if (version.reviewed >= cutoffIso) continue;
    stale.push({ rule, version, pages });
  }
}

const total = ALL_RULES.length;
const used = pagesUsing.size;

if (stale.length === 0) {
  console.log(`✓ ${used} of ${total} rules are in use, and none has gone ${MAX_AGE_MONTHS} months without review.`);
  process.exit(0);
}

// Oldest first: whoever picks this up should start with the worst one.
stale.sort((a, b) => a.version.reviewed.localeCompare(b.version.reviewed));

const label = strict ? "error" : "warning";
console.log(`${stale.length} rule version(s) in use have not been verified in ${MAX_AGE_MONTHS} months:\n`);
for (const { rule, version, pages } of stale) {
  const age = monthsSince(version.reviewed);
  const line = `${rule.id} — last verified ${version.reviewed} (${age} months ago) — ${version.norm} — used by: ${pages.join(", ")}`;
  console.log(`  • ${line}`);
  // GitHub renders these in the run summary, which is what makes a warning
  // that does not fail the build still get seen.
  if (inGithubActions) console.log(`::${label} file=app/rules.ts,title=Regla sin verificar::${line}`);
}
console.log(`\nOpen each source, read the value back, and move \`reviewed\` in app/rules.ts in the same commit.`);
console.log(`Never bump a date without opening the document: the date is the claim.`);

process.exit(strict ? 1 : 0);
