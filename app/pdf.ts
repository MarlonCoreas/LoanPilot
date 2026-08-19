import { reviewedDate } from "./reviewed";
import type { Citation } from "./rules";
import type { Lang } from "./routes";
import { OFFICIAL } from "./sources";

/**
 * The calculators as documents, and the one place that knows what one looks
 * like.
 *
 * Three exports had grown independently — the loan quote, the overtime
 * calculation and now the settlement — and each carried its own copy of the
 * same four things: the green band with the brand, the date it was generated,
 * the line saying this is an estimate, and the sources at the foot. Four
 * chances per calculator to drift, and they already had: one wrote the
 * generation date from `toISOString`, which after 18:00 in El Salvador is
 * tomorrow, and another wrote it from the local calendar.
 *
 * So the chrome lives here and a calculator supplies only what is its own:
 * a title, some tables, the notes its case raised, and the rules it applied.
 * Adding the withholding PDF should be writing a `PdfSpec`, not writing jsPDF.
 *
 * Two constraints shape the rendering, and both come from what this file is
 * for. It has to survive a black-and-white printer, because the person holding
 * it is taking it to a human resources desk or to the MTPS: nothing here
 * signals meaning by hue alone, the dark band prints as dark with knocked-out
 * text, and the total is bold as well as shaded. And it has to fit one page
 * where the content allows, because a two-page estimate loses its second page.
 *
 * `jspdf` and `jspdf-autotable` are imported dynamically, at the click, so that
 * a reader who never exports anything does not download them. Everything runs
 * in the browser: no figure the user typed leaves the tab, which is the whole
 * premise of the site and would be quietly broken by rendering server-side.
 *
 * WHAT A CALLER MAY PUT IN A STRING. jsPDF's built-in fonts encode WinAnsi, and
 * a codepoint outside it is not dropped — it is rendered as some other
 * character, so the document is wrong rather than incomplete and nobody notices
 * until it is printed. Two that a calculator reaches for naturally:
 *
 *   U+2212 MINUS SIGN (−)          comes out as a quotation mark
 *   U+2197 NORTH EAST ARROW (↗)    comes out as "!—"
 *
 * The payslip check printed "−$176.00" as "\"$176.00" this way. Em dash, middot,
 * the Spanish accents and the guillemets are all inside the encoding and are
 * used throughout. Where a page wants the typographic minus on screen, it passes
 * the ASCII hyphen for this document instead — see `signed` in StatutoryTools.
 */

export type PdfTable = {
  head: string[];
  body: string[][];
  /** Index into `body` of the row that carries the total, drawn as one. */
  totalRow?: number;
  /** Columns to set against the right edge, where money belongs. */
  numeric?: number[];
  /** A long schedule: smaller type, narrower margins, several pages allowed. */
  dense?: boolean;
};

export type PdfSpec = {
  /** Becomes `loanpilot-<slug>-<yyyy-mm-dd>.pdf`. */
  slug: string;
  title: string;
  /** One line under the title in the band: what case this document is about. */
  subtitle?: string;
  tables: PdfTable[];
  /** Paragraphs under the tables: caveats, disputed readings, what is missing. */
  notes?: string[];
  /** The articles applied, straight out of `rules.ts`. */
  citations?: Citation[];
  /** The day those sources were last read back, as the page shows it. */
  reviewed?: string;
  /** The estimate-not-advice line. Always printed, never optional. */
  disclaimer: string;
};

const copy = {
  es: {
    generated: "Generado",
    page: "Página",
    of: "de",
    sources: "FUENTES OFICIALES",
    verified: (date: string) => `verificadas el ${date}`,
  },
  en: {
    generated: "Generated",
    page: "Page",
    of: "of",
    sources: "OFFICIAL SOURCES",
    verified: (date: string) => `verified on ${date}`,
  },
} as const;

const INK: [number, number, number] = [16, 42, 42];
const MINT: [number, number, number] = [169, 244, 207];
const MINT_DARK: [number, number, number] = [26, 127, 100];

const PAGE_WIDTH = 216;
const PAGE_HEIGHT = 279;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
/** Where content starts under the band on page one, and under the rule after. */
const BODY_TOP = 35;
const CONTINUED_TOP = 26;
/** Room the footer needs, so nothing is written into it. */
const FOOTER_SPACE = 16;

/**
 * The local calendar day, not the UTC one.
 *
 * `toISOString().slice(0, 10)` is a day ahead in El Salvador every evening
 * after six, which put one date in a file name and another in the footer of
 * the same document.
 */
function localStamp(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The document itself, and the name it should be saved under.
 *
 * Split from the download so the rendering can be exercised outside a browser —
 * a build script can ask for a sample settlement and look at it — and so the
 * only browser-only call in this file is the one line that saves.
 */
export async function buildPdf(spec: PdfSpec, lang: Lang) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"), import("jspdf-autotable"),
  ]);
  const t = copy[lang];
  const locale = lang === "es" ? "es-SV" : "en-US";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const lastY = () => (doc as typeof doc & { lastAutoTable?: { finalY: number } })
    .lastAutoTable?.finalY ?? BODY_TOP;

  // --- The band, and the slimmer version every later page carries -----------
  doc.setFillColor(...INK);
  doc.rect(0, 0, PAGE_WIDTH, 28, "F");
  doc.setTextColor(...MINT);
  doc.setFontSize(17);
  doc.text("LoanPilot", MARGIN, 13);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(spec.title, MARGIN, 20);
  if (spec.subtitle) {
    doc.setFontSize(7.5);
    doc.setTextColor(190, 214, 205);
    doc.text(spec.subtitle, MARGIN, 25);
  }

  let y = BODY_TOP;

  /** Move to a fresh page when `needed` millimetres will not fit below `y`. */
  const room = (needed: number) => {
    if (y + needed <= PAGE_HEIGHT - FOOTER_SPACE) return;
    doc.addPage();
    y = CONTINUED_TOP;
  };

  for (const table of spec.tables) {
    const side = table.dense ? 8 : MARGIN;
    const numeric = table.numeric ?? [];
    autoTable(doc, {
      startY: y,
      head: [table.head],
      body: table.body,
      theme: "grid",
      // Both header fills print as solid dark on a monochrome printer, and the
      // text on them is white, so the contrast survives the loss of colour.
      headStyles: {
        fillColor: table.dense ? INK : MINT_DARK,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: table.dense ? 7 : 8.5,
      },
      styles: {
        fontSize: table.dense ? 6.4 : 8,
        // Tight on purpose. A settlement carries three tables, its notes and a
        // dozen citations, and the difference between one page and two is a
        // millimetre per row — the second page is the one that gets left in
        // the printer.
        cellPadding: table.dense ? 1.4 : 1.35,
        textColor: [26, 38, 35],
        lineColor: [206, 216, 211],
        lineWidth: 0.1,
      },
      columnStyles: Object.fromEntries(numeric.map((index) => [index, { halign: "right" as const }])),
      margin: { left: side, right: side, top: CONTINUED_TOP, bottom: FOOTER_SPACE },
      // The total is the row the reader looks for first. It is bold as well as
      // shaded, because the shading is what a monochrome printer flattens.
      didParseCell: (hook) => {
        if (hook.section !== "body" || hook.row.index !== table.totalRow) return;
        hook.cell.styles.fontStyle = "bold";
        hook.cell.styles.fillColor = [223, 248, 233];
      },
    });
    y = lastY() + 4;
  }

  // --- Notes: what this particular case raised ------------------------------
  if (spec.notes?.length) {
    doc.setFontSize(8);
    doc.setTextColor(58, 70, 66);
    for (const note of spec.notes) {
      const lines = doc.splitTextToSize(note, CONTENT_WIDTH) as string[];
      room(lines.length * 3.4 + 2.5);
      lines.forEach((line, index) => doc.text(line, MARGIN, y + index * 3.4));
      y += lines.length * 3.4 + 2.5;
    }
  }

  // --- Sources: the articles applied, and the documents behind them ---------
  //
  // The URL is printed in full and not hidden behind the article name. A link
  // is useless on paper, and this document exists to be printed and handed
  // over: a reader has to be able to type the address and read the text.
  //
  // Grouped by document, because that is the unit a reader acts on: eleven
  // articles in a settlement come from six documents, and printing the same
  // hundred-character address five times cost a page and told nobody anything.
  // The articles come first and the address last, in the order the reader uses
  // them — what was applied, then where to go and check it.
  const grouped = Object.values((spec.citations ?? []).reduce<Record<string, { source: keyof typeof OFFICIAL; norms: string[] }>>(
    (groups, citation) => {
      groups[citation.source] ??= { source: citation.source, norms: [] };
      groups[citation.source].norms.push(citation.norm);
      return groups;
    }, {}));

  if (spec.citations?.length) {
    // The block is measured before a line of it is drawn, so that it moves to
    // the next page whole rather than leaving its heading and two entries
    // stranded at the foot of this one. It only moves if it would actually fit
    // there: a list longer than a page has to break somewhere, and breaking it
    // after the heading is better than an empty page followed by the same break.
    doc.setFontSize(7);
    const blockHeight = grouped.reduce((total, group) => {
      const norms = group.norms.flatMap((norm) => doc.splitTextToSize(norm, CONTENT_WIDTH - 8) as string[]);
      const urls = doc.splitTextToSize(OFFICIAL[group.source], CONTENT_WIDTH - 8) as string[];
      return total + (norms.length + urls.length) * 3 + 1.2;
    }, 10);
    if (blockHeight <= PAGE_HEIGHT - FOOTER_SPACE - CONTINUED_TOP) room(blockHeight);
    else room(12);
    // The rule separates the sources from what came before them. At the top of
    // a continuation page nothing came before, and the page already has the
    // header rule, so a second one three millimetres under it is just a smudge.
    if (y > CONTINUED_TOP) {
      doc.setDrawColor(206, 216, 211);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 5;
    }
    doc.setFontSize(7.5);
    doc.setTextColor(...MINT_DARK);
    const heading = spec.reviewed
      ? `${t.sources} · ${t.verified(reviewedDate(lang, spec.reviewed))}`
      : t.sources;
    doc.text(heading, MARGIN, y);
    y += 4.5;

    grouped.forEach((group, index) => {
      const url = OFFICIAL[group.source];
      const norms = group.norms.flatMap((norm) => doc.splitTextToSize(norm, CONTENT_WIDTH - 8) as string[]);
      const urls = doc.splitTextToSize(url, CONTENT_WIDTH - 8) as string[];
      room((norms.length + urls.length) * 3 + 1.2);
      doc.setFontSize(7);
      doc.setTextColor(120, 132, 128);
      doc.text(String(index + 1).padStart(2, "0"), MARGIN, y);
      doc.setTextColor(38, 52, 48);
      norms.forEach((line, row) => doc.text(line, MARGIN + 8, y + row * 3));
      y += norms.length * 3;
      doc.setFontSize(6.4);
      doc.setTextColor(...MINT_DARK);
      urls.forEach((line, row) => doc.textWithLink(line, MARGIN + 8, y + row * 3, { url }));
      y += urls.length * 3 + 1.2;
    });
  }

  // --- The estimate line, which is the last thing the eye lands on ----------
  const disclaimer = doc.splitTextToSize(spec.disclaimer, CONTENT_WIDTH) as string[];
  room(disclaimer.length * 3.2 + 4);
  doc.setFontSize(7);
  doc.setTextColor(112, 124, 120);
  disclaimer.forEach((line, index) => doc.text(line, MARGIN, y + index * 3.2));

  // --- Footers, drawn last because "page 1 of 3" needs to know about 3 ------
  const generated = new Date();
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    if (page > 1) {
      doc.setFontSize(7.5);
      doc.setTextColor(...MINT_DARK);
      doc.text(`LoanPilot · ${spec.title}`, MARGIN, 14);
      doc.setDrawColor(206, 216, 211);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, 17, PAGE_WIDTH - MARGIN, 17);
    }
    doc.setFontSize(7);
    doc.setTextColor(130, 140, 137);
    doc.text(
      `${t.generated}: ${generated.toLocaleDateString(locale)} · loanpilot.marloncoreas.com`,
      MARGIN, PAGE_HEIGHT - 8);
    if (pages > 1) {
      doc.text(`${t.page} ${page} ${t.of} ${pages}`,
        PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: "right" });
    }
  }

  return { doc, fileName: `loanpilot-${spec.slug}-${localStamp(generated)}.pdf` };
}

export async function downloadPdf(spec: PdfSpec, lang: Lang) {
  const { doc, fileName } = await buildPdf(spec, lang);
  doc.save(fileName);
}
