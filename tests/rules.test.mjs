import assert from "node:assert/strict";
import test from "node:test";

import { ASSUMPTIONS, DISPUTES, assumptionFor, disputeFor, pagesApplying } from "../app/disputes.ts";
import {
  ALL_RULES, citationsFor, disputedVersions, oldestReviewed, reviewedFor, ruleAt, RULES,
  RULE_USAGE, RULES_REVIEWED, sectionFor,
} from "../app/rules.ts";
import { LANGS, PAGES } from "../app/routes.ts";
import { OFFICIAL } from "../app/sources.ts";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * This is what the single `assert.match(RULES_REVIEWED, /^\d{4}-\d{2}-\d{2}$/)`
 * grew into. That assertion could only catch a typo in one hand-edited string;
 * the claim it stood for — that every figure the site applies is traceable to a
 * document and to the day somebody read it — is now a shape, and this is the
 * test that the shape holds.
 */
test("every rule declares a value, a unit, a norm, a live source and a review date", () => {
  assert.ok(ALL_RULES.length > 0, "an empty registry would pass every other check here");

  for (const rule of ALL_RULES) {
    const where = rule.id;
    assert.equal(typeof rule.id, "string", where);
    assert.ok(rule.id.length > 0, where);
    assert.equal(typeof rule.unit, "string", `${where} must say what its value counts`);
    assert.ok(rule.unit.length > 0, where);
    assert.ok(Array.isArray(rule.versions) && rule.versions.length > 0,
      `${where} has no versions, so it applies nothing`);

    for (const version of rule.versions) {
      const at = `${where} @ ${version.from}`;
      assert.match(version.from, ISO_DATE, `${at}: needs the day it takes effect`);
      assert.notEqual(version.value, undefined, `${at}: a rule without a value is a comment`);
      assert.equal(typeof version.norm, "string", at);
      assert.ok(version.norm.length > 0, `${at}: name the article or the decree`);
      // A source key that is not in OFFICIAL would render a broken citation, and
      // an unverifiable figure is the one thing this project cannot ship.
      assert.ok(version.source in OFFICIAL, `${at}: "${version.source}" is not in OFFICIAL`);
      assert.match(OFFICIAL[version.source], /^https:\/\//, `${at}: sources are public https documents`);
      assert.match(version.reviewed, ISO_DATE, `${at}: needs the day a human last read it`);
      if (version.note !== undefined) {
        assert.equal(typeof version.note, "string", at);
        assert.ok(version.note.length > 0, `${at}: an empty note says nothing`);
      }
    }
  }
});

test("the id a rule carries is the key it is filed under", () => {
  // They are two separate strings, and only one of them appears in the CI
  // warning. A rename that moved the key and not the id would send whoever
  // reads that warning looking for a rule that is not there under that name.
  for (const [key, rule] of Object.entries(RULES)) {
    assert.equal(rule.id, key, `RULES.${key} calls itself "${rule.id}"`);
  }
});

test("versions are ordered newest first, which is the order the lookup trusts", () => {
  // `ruleAt` returns the first version whose `from` is on or before the date it
  // is given. Out of order, it would silently hand back a superseded table, and
  // every figure priced with it would be wrong without anything looking wrong.
  for (const rule of ALL_RULES) {
    for (let i = 1; i < rule.versions.length; i++) {
      assert.ok(rule.versions[i - 1].from > rule.versions[i].from,
        `${rule.id}: version ${i} starts on ${rule.versions[i].from}, not before ${rule.versions[i - 1].from}`);
    }
  }
});

test("a date resolves to the version in force, and an older one is flagged", () => {
  const rule = RULES.minimumWage;
  const newest = rule.versions[0];
  const oldest = rule.versions.at(-1);

  const current = ruleAt(rule, "2026-08-16");
  assert.equal(current.version, newest);
  assert.equal(current.predatesRule, false);

  // On the first day of a version, that version already applies.
  assert.equal(ruleAt(rule, newest.from).version, newest);

  // Before every version there is nothing to be right with, so the oldest is
  // used and the caller is told, which is what the settlement page shows.
  const tooEarly = ruleAt(rule, "1900-01-01");
  assert.equal(tooEarly.version, oldest);
  assert.equal(tooEarly.predatesRule, true);
});

test("every page's rules exist, and only the credit pages apply none", () => {
  assert.deepEqual(Object.keys(RULE_USAGE).sort(), [...PAGES].sort(),
    "a page missing from RULE_USAGE would make no freshness claim at all");

  for (const [page, ids] of Object.entries(RULE_USAGE)) {
    assert.deepEqual([...new Set(ids)], ids, `${page} lists a rule twice`);
    for (const id of ids) assert.ok(id in RULES, `${page} uses "${id}", which is not a rule`);
  }

  // Interest on a balance is arithmetic, not statute. Both credit calculators
  // apply nothing Salvadoran and so claim nothing: `reviewedFor` returns
  // undefined and the pages render no verification badge at all.
  for (const page of ["loans", "creditCard"]) {
    assert.deepEqual(RULE_USAGE[page], [],
      `${page} depends on no Salvadoran rule; claiming one would be a claim it cannot back`);
    assert.equal(reviewedFor(page), undefined, page);
  }
  for (const page of ["settlement", "aguinaldo", "overtime", "withholding", "disputed"]) {
    assert.ok(RULE_USAGE[page].length > 0, `${page} rests on statutory rules and lists none`);
    assert.match(reviewedFor(page), ISO_DATE, page);
  }

  // Every rule has to be reachable from a page, or the CI staleness check
  // ignores it and it drifts unwatched.
  const used = new Set(Object.values(RULE_USAGE).flat());
  for (const id of Object.keys(RULES)) {
    assert.ok(used.has(id), `${id} is applied by no page: either wire it up or delete it`);
  }
});

test("a page's claim is its oldest rule, never its newest", () => {
  // The direction is the whole point. Taking the newest would let one same-day
  // edit refresh a claim about figures nobody has looked at in a year.
  for (const page of PAGES) {
    const reviewed = reviewedFor(page);
    if (reviewed === undefined) continue;
    for (const id of RULE_USAGE[page]) {
      for (const version of RULES[id].versions) {
        assert.ok(version.reviewed >= reviewed,
          `${page} claims ${reviewed} but ${id} was last checked on ${version.reviewed}`);
      }
    }
    assert.ok(RULE_USAGE[page].some((id) =>
      RULES[id].versions.some((version) => version.reviewed === reviewed)),
      `${page} claims ${reviewed}, which is not the date of any rule it uses`);
  }

  assert.match(RULES_REVIEWED, ISO_DATE);
  assert.equal(RULES_REVIEWED, oldestReviewed(ALL_RULES));
  // The site-wide claim goes in the sitemap and the structured data, so it can
  // never be newer than the page-level one it summarises.
  for (const page of PAGES) {
    const reviewed = reviewedFor(page);
    if (reviewed !== undefined) assert.ok(RULES_REVIEWED <= reviewed, page);
  }
});

test("no normative figure is cited from the press", () => {
  // The rule this stands for is in the header of `sources.ts`: a value enters
  // the registry through a decree, a consolidated text or a publication of the
  // institution that administers it — never through a newspaper reporting that
  // a reform happened. Reported reforms are how wrong numbers get in: the
  // article is right about the change and vague about the text, and a year
  // later nobody remembers which of the two the figure came from.
  //
  // Every official body in El Salvador publishes on `.gob.sv`, so the domain is
  // the cheap, mechanical half of that rule, and the only half a test can hold.
  // The other half — that the document actually says the figure — is what the
  // `reviewed` date is for.
  for (const rule of ALL_RULES) {
    for (const version of rule.versions) {
      const url = new URL(OFFICIAL[version.source]);
      assert.ok(url.hostname.endsWith(".gob.sv"),
        `${rule.id} @ ${version.from} cites ${url.hostname}, which is not an official Salvadoran domain`);
    }
  }
});

test("a citation list names the version in force, and says each article once", () => {
  // What an exported PDF prints. It has to resolve by date, because a
  // settlement dated 2024 was priced with the pre-reform articles and citing
  // today's decree beside a 2024 figure is a false statement about which text
  // produced it.
  const [current] = citationsFor(["aguinaldoCutoff"], "2026-01-01");
  assert.match(current.norm, /433/, "the 2025 reform governs a 2026 settlement");
  const [older] = citationsFor(["aguinaldoCutoff"], "2024-06-30");
  assert.match(older.norm, /anterior a la reforma/, "a 2024 settlement cites the text it was priced with");

  // Three rules all reading article 58 are one line to a reader, and repeating
  // the article three times in a source list reads as three separate grounds.
  const severance = citationsFor(
    ["severanceDaysPerYear", "severanceMinimumDays", "severanceWageCap"], "2026-08-16");
  assert.equal(severance.length, 1);
  assert.equal(severance[0].norm, "Código de Trabajo art. 58");

  // Every citation has to render: a source key outside OFFICIAL would print an
  // article with no document behind it, which is worse than printing nothing.
  for (const page of ["settlement", "overtime", "withholding"]) {
    const citations = citationsFor(RULE_USAGE[page], "2026-08-16");
    assert.ok(citations.length > 0, page);
    for (const citation of citations) {
      assert.ok(citation.source in OFFICIAL, `${page}: ${citation.source}`);
      assert.ok(citation.norm.length > 0, page);
    }
  }
});

test("the Quincena 25 cites its own decree, not the one that shares its number", () => {
  // Two different decrees are numbered 499. One is the Ley Especial Quincena
  // Veinticinco of 14 January 2026, published in Diario Oficial 8, Tomo 450;
  // the other is a 1976 amendment that appears in the Labour Code's own table
  // of reforms at the end of the consolidated text.
  //
  // These rules used to point `source` at `laborCode`, so a reader who followed
  // the citation opened a document that does not contain the law and does
  // contain a decree with the right number and the wrong half-century. That is
  // worse than a dead link, and the exported PDF — which groups citations under
  // the document they are read from — printed it under the code's address.
  for (const id of ["quincena25SalaryCeiling", "quincena25Rate", "quincena25Exempt",
    "quincena25MandatoryFrom"]) {
    assert.ok(id in RULES, `${id} is not a rule`);
    for (const version of RULES[id].versions) {
      assert.equal(version.source, "quincena25", `${id} cites "${version.source}"`);
      // The norm has to name the law and the date, because the number alone is
      // exactly what was ambiguous.
      assert.match(version.norm, /Ley Especial Quincena Veinticinco/, id);
      assert.match(version.norm, /D\.L\. 499 del 14 de enero de 2026/, id);
    }
  }
  assert.notEqual(OFFICIAL.quincena25, OFFICIAL.laborCode,
    "pointing both at the same document is the bug this test exists for");
});

/**
 * The codepoints jsPDF's built-in fonts can actually draw: WinAnsi, which is
 * Latin-1 plus a block of punctuation borrowed into 0x80-0x9F. Anything outside
 * it is not dropped — it is rendered as some OTHER character — so the document
 * comes out wrong rather than incomplete, and nobody notices until it is on
 * paper. U+2212 MINUS SIGN printed as a quotation mark in the payslip check
 * this way, and U+2197 NORTH EAST ARROW prints as "!—".
 */
const WINANSI_HIGH = new Set([
  0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
  0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178,
]);
const outsideWinAnsi = (text) => [...text].filter((char) => {
  const code = char.codePointAt(0);
  if (code < 0x7F) return false;
  if (code >= 0xA0 && code <= 0xFF) return false;
  return !WINANSI_HIGH.has(code);
});

test("every citation the exported PDFs print can actually be drawn on the page", () => {
  // Norms and source addresses are the one part of a PDF that every calculator
  // shares, so a character the font cannot draw here corrupts every document
  // the site emits rather than one page's. Em dash, guillemets and the Spanish
  // accents are all inside the encoding and are used freely; the arrows and the
  // typographic minus that the interface uses on screen are not.
  for (const rule of ALL_RULES) {
    for (const version of rule.versions) {
      const bad = outsideWinAnsi(version.norm);
      assert.deepEqual(bad, [], `${rule.id} @ ${version.from}: norm carries ${bad.join(" ")}`);
    }
  }
  for (const [key, url] of Object.entries(OFFICIAL)) {
    const bad = outsideWinAnsi(url);
    assert.deepEqual(bad, [], `OFFICIAL.${key} carries ${bad.join(" ")}`);
  }
});

// --- What a note shouts, and what the page has to say back ------------------

const SHOUTS = ["DISPUTED", "UNSOURCED", "NOT MODELLED"];

test("the word a note shouts and the status it carries cannot drift apart", () => {
  // The convention came first: a note that is not a plain reading of a text
  // opens with one of three words in capitals. `status` is that same word as a
  // field, and the page is built from the field — so a note that shouts and a
  // rule that does not declare it would be a dispute the site never publishes,
  // which is the exact failure /reglas-en-disputa/ exists to make impossible.
  for (const rule of ALL_RULES) {
    for (const version of rule.versions) {
      const at = `${rule.id} @ ${version.from}`;
      const shouted = SHOUTS.find((word) => version.note?.startsWith(word));

      if (version.status === undefined) {
        assert.equal(shouted, undefined,
          `${at}: the note shouts ${shouted} and the version declares no status`);
        continue;
      }

      assert.ok(Array.isArray(version.status) && version.status.length > 0, at);
      for (const flag of version.status) {
        assert.ok(SHOUTS.includes(flag), `${at}: "${flag}" is not one of ${SHOUTS.join(", ")}`);
      }
      assert.deepEqual([...new Set(version.status)], version.status, `${at}: repeated status`);
      assert.ok(version.note, `${at}: a status with no note explains nothing`);
      assert.equal(version.status[0], shouted,
        `${at}: the note opens with "${version.note.slice(0, 20)}…" and status says ${version.status[0]}`);
      // Every other flag has to appear somewhere in the note too: the Quincena
      // 25 window is DISPUTED and UNSOURCED, and a reader who is told only the
      // first of those has been told half of what is wrong with the figure.
      for (const flag of version.status.slice(1)) {
        assert.ok(version.note.includes(flag), `${at}: the note never mentions ${flag}`);
      }
    }
  }
});

test("every contested rule is published, in both languages", () => {
  // THE TEST THE PAGE EXISTS FOR. A rule marked DISPUTED with no entry in
  // `disputes.ts` would render as nothing at all on the page that is supposed
  // to carry it — contested in the code and settled on screen, which is worse
  // than never having claimed the transparency in the first place.
  const contested = disputedVersions("disputed");
  assert.ok(contested.length > 0, "an empty list would make every check below vacuous");

  for (const { rule, version } of contested) {
    const dispute = disputeFor(rule.id);
    assert.ok(dispute, `${rule.id} is marked ${version.status.join(" + ")} and is on no page`);

    for (const lang of LANGS) {
      assert.ok(dispute.question[lang]?.length > 20, `${rule.id}: no question in ${lang}`);
      assert.ok(dispute.stakes[lang]?.length > 20, `${rule.id}: no stakes in ${lang}`);
      assert.ok(dispute.why[lang]?.length > 40, `${rule.id}: no reasoning in ${lang}`);
      for (const reading of dispute.readings) {
        assert.ok(reading.label[lang]?.length > 0, `${rule.id}: unlabelled reading in ${lang}`);
        assert.ok(reading.text[lang]?.length > 40, `${rule.id}: empty reading in ${lang}`);
      }
    }

    // Two readings, exactly one of them applied. A dispute with no applied
    // reading describes nothing this site does; one with two claims the
    // calculator produces both figures at once.
    assert.equal(dispute.readings.length, 2, rule.id);
    assert.equal(dispute.readings.filter((reading) => reading.applied).length, 1, rule.id);
    for (const reading of dispute.readings) {
      assert.ok(["text", "practice", "none"].includes(reading.backing),
        `${rule.id}: "${reading.backing}" is not something a reading can rest on`);
    }

    // The link out has to resolve, because a dispute with an unopenable source
    // is a claim the reader cannot check.
    assert.ok(version.source in OFFICIAL, `${rule.id}: ${version.source}`);
  }

  // And nothing the other way: an entry for a rule nobody marked would print a
  // dispute the registry does not have.
  for (const dispute of DISPUTES) {
    assert.ok(dispute.rule in RULES, `${dispute.rule} is not a rule`);
    assert.ok(contested.some(({ rule }) => rule.id === dispute.rule),
      `${dispute.rule} has two readings written for it and is not marked DISPUTED`);
  }
});

test("every unsourced assumption is published, and says how far it reaches", () => {
  // The other half of the same guarantee, and the one with a field the disputes
  // do not have. `reach` is what a reader cannot work out alone: a figure no
  // document fixes matters exactly as much as the number of lines it moves, and
  // an entry that left it out would be a confession with the size filed off.
  const contested = disputedVersions("unsourced");
  assert.ok(contested.length > 0, "an empty list would make every check below vacuous");

  for (const { rule, version } of contested) {
    const assumption = assumptionFor(rule.id);
    assert.ok(assumption, `${rule.id} is marked ${version.status.join(" + ")} and is on no page`);
    // No reading is invented to fill a slot: a silence has no opposing position,
    // and manufacturing one is the failure the second section exists to avoid.
    assert.equal(disputeFor(rule.id), undefined,
      `${rule.id} is unsourced and carries two readings, which it cannot have`);

    for (const lang of LANGS) {
      assert.ok(assumption.question[lang]?.length > 20, `${rule.id}: no question in ${lang}`);
      assert.ok(assumption.silence[lang]?.length > 40, `${rule.id}: the texts are not quoted in ${lang}`);
      assert.ok(assumption.choice[lang]?.length > 40, `${rule.id}: no value stated in ${lang}`);
      assert.ok(assumption.reach[lang]?.length > 40, `${rule.id}: no reach stated in ${lang}`);
      assert.ok(assumption.why[lang]?.length > 40, `${rule.id}: no reasoning in ${lang}`);
    }

    assert.ok(version.source in OFFICIAL, `${rule.id}: ${version.source}`);
  }

  for (const assumption of ASSUMPTIONS) {
    assert.ok(assumption.rule in RULES, `${assumption.rule} is not a rule`);
    assert.ok(contested.some(({ rule }) => rule.id === assumption.rule),
      `${assumption.rule} has an entry but is not marked UNSOURCED`);
  }
});

test("a version flagged both ways is published as a dispute, not as a silence", () => {
  // `quincena25Window` is DISPUTED in which terminations it covers and
  // UNSOURCED in where its window opens. It belongs in the first section: the
  // disagreement is the part a reader has to decide about, and filing it under
  // silences would bury two live readings of article 3.
  const both = RULES.quincena25Window.versions.find((version) => version.status?.length === 2);
  assert.ok(both, "the rule this test is about no longer carries two flags");
  assert.equal(sectionFor(both), "disputed");
  assert.equal(sectionFor({ status: ["UNSOURCED"] }), "unsourced");
  assert.equal(sectionFor({}), "unsourced");
});

test("the disputed page claims exactly the rules it publishes", () => {
  const ids = [...new Set(disputedVersions().map(({ rule }) => rule.id))];
  assert.deepEqual([...RULE_USAGE.disputed].sort(), ids.sort(),
    "its freshness badge is the oldest review among the rules it shows, and nothing else");

  // Each one is reachable from the calculator that applies it, which is what
  // the callouts link into. A dispute nothing applies would be trivia.
  for (const id of ids) {
    assert.ok(pagesApplying(id).length > 0, `${id} is contested and applied by no calculator`);
  }
});

test("the known disputes and the known assumptions are the ones on the page", () => {
  // Named rather than counted, and named PER SECTION, because the sections are
  // what the page promises: a rule that slid from one to the other would change
  // what the site claims about it — a disagreement demoted to a silence, or a
  // silence dressed up as an argument — while a combined list stayed green.
  //
  // A new entry in either is welcome and this is where it is acknowledged; what
  // this catches is one QUIETLY DISAPPEARING. A status dropped in a refactor
  // takes the entry off the page with it, and nothing else here would notice.
  assert.deepEqual(
    disputedVersions("disputed").map(({ rule }) => rule.id).sort(),
    ["aguinaldoCycleStart", "aguinaldoScaleOnExit", "quincena25Window", "vacationProportionalOnExit"],
    "the rules where a text and a practice, or two articles, disagree");
  assert.deepEqual(
    disputedVersions("unsourced").map(({ rule }) => rule.id).sort(),
    ["dailySalaryDivisor"],
    "the rules no document fixes at all");

  // And the two together are everything the registry marks: a section neither
  // list covers would be published under no heading.
  assert.deepEqual(
    disputedVersions().map(({ rule }) => rule.id).sort(),
    ["aguinaldoCycleStart", "aguinaldoScaleOnExit", "dailySalaryDivisor", "quincena25Window",
      "vacationProportionalOnExit"]);
});

test("no rule claims to have been reviewed before it existed, or in the future", () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const rule of ALL_RULES) {
    for (const version of rule.versions) {
      assert.ok(version.reviewed <= today,
        `${rule.id} says it was verified on ${version.reviewed}, which has not happened yet`);
      assert.ok(version.reviewed >= version.from,
        `${rule.id} says it was verified on ${version.reviewed}, before the ${version.from} text existed`);
    }
  }
});
