import assert from "node:assert/strict";
import test from "node:test";

import { anchorId } from "../app/anchor.ts";
import { decodeShare, encodeShare, sanitiseValue, shareUrl } from "../app/share.ts";

const SCHEMA = {
  sal: { kind: "money", max: 1000000 },
  hrs: { kind: "decimal", max: 744 },
  ms: { kind: "int", max: 12 },
  de: { kind: "date" },
  pg: { kind: "flag" },
  sec: { kind: "option", values: ["commerce", "maquila"] },
};

test("a link carries what the reader typed and nothing else", () => {
  const fragment = encodeShare(SCHEMA, {
    sal: "900", hrs: "4.5", ms: "12", de: "2025-03-01", pg: "1", sec: "commerce",
  });
  assert.deepEqual(decodeShare(SCHEMA, fragment), {
    sal: "900", hrs: "4.5", ms: "12", de: "2025-03-01", pg: "1", sec: "commerce",
  });
  // A key the schema does not know is not carried and is not accepted back.
  const withExtra = encodeShare(SCHEMA, { sal: "900", nombre: "Marlon" });
  assert.ok(!withExtra.includes("Marlon"), withExtra);
  assert.deepEqual(decodeShare(SCHEMA, "sal=900&nombre=Marlon"), { sal: "900" });
});

test("an empty field travels as nothing, not as a zero", () => {
  // THE BUG THIS PREVENTS: an untouched optional field arriving at the other
  // end as a figure the sender never entered. The bonus box left blank on
  // /renta-anual/ must not reappear as $0 of bonus that was declared.
  const fragment = encodeShare(SCHEMA, { sal: "900", hrs: "", ms: undefined });
  assert.equal(fragment, "sal=900");
  assert.equal(decodeShare(SCHEMA, fragment).hrs, undefined);
});

test("everything from the fragment is validated, and a bad field drops alone", () => {
  const decoded = decodeShare(SCHEMA, "sal=900&hrs=abc&ms=99&de=2025-02-30&sec=oro&pg=maybe");
  assert.deepEqual(decoded, { sal: "900" }, "one good field survives five bad ones");

  // Each shape, refused for its own reason.
  assert.equal(sanitiseValue(SCHEMA.sal, "900.5"), "900.5");
  assert.equal(sanitiseValue(SCHEMA.sal, "900.555"), null, "three decimals is not money");
  assert.equal(sanitiseValue(SCHEMA.sal, "-900"), null, "no negative amounts");
  assert.equal(sanitiseValue(SCHEMA.sal, "1e9"), null, "no exponents");
  assert.equal(sanitiseValue(SCHEMA.sal, "2000000"), null, "over the cap");
  assert.equal(sanitiseValue(SCHEMA.ms, "12"), "12");
  assert.equal(sanitiseValue(SCHEMA.ms, "13"), null);
  assert.equal(sanitiseValue(SCHEMA.ms, "1.5"), null, "a count has no decimals");
  assert.equal(sanitiseValue(SCHEMA.de, "2024-02-29"), "2024-02-29", "a leap day is a real day");
  assert.equal(sanitiseValue(SCHEMA.de, "2025-02-29"), null, "and 2025 has none");
  assert.equal(sanitiseValue(SCHEMA.de, "1899-01-01"), null, "outside the accepted years");
  assert.equal(sanitiseValue(SCHEMA.de, "01/03/2025"), null, "ISO only");
  assert.equal(sanitiseValue(SCHEMA.pg, "true"), null, "a flag is 1 or 0");
  assert.equal(sanitiseValue(SCHEMA.sec, "commerce"), "commerce");
  assert.equal(sanitiseValue(SCHEMA.sec, "COMMERCE"), null, "the list is exact");
});

test("nothing that could carry a name or a script gets through", () => {
  // No shape in this module accepts free text, and this is the test that says
  // so out loud: the values below are refused by their shape, not by a filter,
  // which is why a new shape cannot quietly open the door.
  const hostile = [
    "<script>alert(1)</script>", "javascript:alert(1)", "Marlon Coreas",
    "0000-0000-0000-0000", "'; DROP TABLE", " ", "900\nsal=1",
  ];
  for (const value of hostile) {
    for (const key of Object.keys(SCHEMA)) {
      assert.equal(sanitiseValue(SCHEMA[key], value), null, `${key} accepted ${JSON.stringify(value)}`);
    }
  }
  // And an oversized value is refused before it is even parsed.
  assert.equal(sanitiseValue(SCHEMA.sal, "9".repeat(64)), null);
  assert.deepEqual(decodeShare(SCHEMA, `sal=${"9".repeat(2000)}`), {});
});

test("an anchor and a shared calculation cannot be mistaken for each other", () => {
  // THEY SHARE ONE FRAGMENT, and two modules read it: `share.ts` fills the form
  // and `anchor.ts` scrolls to a section. A change to either test that nobody
  // mirrored would swallow every anchor on the site, or blank a reader's form
  // because they followed a link down the page. So the two are held together
  // here rather than in a comment.
  for (const id of ["tools", "guide", "deudas", "calculator", "aguinaldoScaleOnExit"]) {
    assert.equal(anchorId(`#${id}`), id, "a plain id is an anchor");
    assert.deepEqual(decodeShare(SCHEMA, `#${id}`), {}, `${id} must carry no inputs`);
  }

  const payload = `#${encodeShare(SCHEMA, { sal: "900", de: "2025-03-01" })}`;
  assert.equal(anchorId(payload), null, "a payload is never an anchor");
  assert.equal(Object.keys(decodeShare(SCHEMA, payload)).length, 2);

  // Neither, and no exception: an empty fragment and a hand-typed one.
  assert.equal(anchorId("#"), null);
  assert.equal(anchorId(""), null);
  assert.equal(anchorId("#no-existe-%zz"), null, "a stray percent is not an id");
  assert.deepEqual(decodeShare(SCHEMA, "#no-existe-%zz"), {});
  // An id that legitimately needs escaping still resolves.
  assert.equal(anchorId("#secci%C3%B3n"), "sección");
});

test("an ordinary in-page anchor decodes to nothing", () => {
  // The site links to `#tools` and to `#aguinaldoScaleOnExit`. Neither is a
  // shared calculation, and reading one as a set of inputs would blank a form
  // for a reader who only followed a link down the page.
  assert.deepEqual(decodeShare(SCHEMA, "#tools"), {});
  assert.deepEqual(decodeShare(SCHEMA, "#aguinaldoScaleOnExit"), {});
  assert.deepEqual(decodeShare(SCHEMA, ""), {});
  assert.deepEqual(decodeShare(SCHEMA, "#"), {});
});

test("the figures go after the hash, which is the whole point", () => {
  const url = shareUrl(SCHEMA, { sal: "900" }, "https://loanpilot.marloncoreas.com/finiquito/");
  assert.equal(url, "https://loanpilot.marloncoreas.com/finiquito/#sal=900");
  // The part before the # is what a server sees, and it has no figures in it.
  assert.ok(!url.split("#")[0].includes("900"));
  // An existing fragment is replaced, not appended to: opening a shared link
  // and then sharing it again must not stack two payloads.
  const again = shareUrl(SCHEMA, { sal: "1000" }, url);
  assert.equal(again, "https://loanpilot.marloncoreas.com/finiquito/#sal=1000");
  // Nothing to share is a plain link to the page, not a bare hash.
  assert.equal(shareUrl(SCHEMA, {}, "https://loanpilot.marloncoreas.com/finiquito/"),
    "https://loanpilot.marloncoreas.com/finiquito/");
});

test("a form's string comes back as the same string", () => {
  // The schemas themselves live in the page components, which import React and
  // cannot be loaded here. What this checks is the contract they all rely on.
  const values = { sal: "1234.56", hrs: "0.25", ms: "5", de: "2026-12-31", pg: "0", sec: "maquila" };
  assert.deepEqual(decodeShare(SCHEMA, encodeShare(SCHEMA, values)), values);
});
