/**
 * Every official document the site cites, in one place. The footer and the
 * calculators each kept their own copy of this map and had already drifted:
 * two different MTPS entries, and a minimum-wage link pointing at the decree
 * whose table had been replaced.
 *
 * NOTHING NORMATIVE IS CITED FROM THE PRESS. A figure enters `rules.ts` only
 * through a decree, a consolidated text, or an institutional publication of the
 * body that administers the rule. A newspaper reporting a reform is evidence
 * that the reform happened; it is not evidence of what the reform says, and the
 * difference is invisible three months later when nobody remembers which one
 * the number came from. Every entry below is on a `.gob.sv` domain for that
 * reason, and `tests/rules.test.mjs` holds the line.
 */
/**
 * What each link actually opens, and whose text it carries.
 *
 * WHY THIS EXISTS. Every citation on the site rendered `norm` as the text of a
 * link whose href came from `source`, so a rule reading "Código de Trabajo art.
 * 187" over the MTPS calculator printed a label naming one document and opened
 * another. Nothing could catch it: both fields were right on their own terms —
 * the article IS 187, and the MTPS service IS where the value comes from — and
 * only the pair was wrong. Four rules cited articles of the Labour Code over
 * MTPS explainers the same way, and /renta-anual/ printed two different norms
 * on one URL.
 *
 * `name` is what the reader is told they are opening. `carries` is the list of
 * document identities whose text is actually inside it, written the way a
 * `norm` names them. `tests/rules.test.mjs` fails when a `norm` names an
 * identity its source does not carry and the version does not declare
 * `citedThrough` to say why — which is how a deliberate one-remove citation
 * stays legal and an accident does not.
 *
 * A consolidated text carries many identities and several rules share it: that
 * is correct and must not fire. One URL under two norms is only wrong when the
 * second norm's document is not in there.
 */
export type SourceDoc = { name: string; carries: readonly string[] };

export const DOCUMENTS = {
  laborCode: {
    name: "Código de Trabajo (texto consolidado de la Asamblea Legislativa)",
    carries: ["Código de Trabajo"],
  },
  laborService: {
    name: "MTPS — Cálculo de indemnización en línea",
    carries: [],
  },
  vacation: {
    name: "CSJ — Código de Trabajo, vacación anual remunerada (arts. 177-185)",
    carries: ["Código de Trabajo"],
  },
  resignation: {
    name: "D.L. 592 — Ley Reguladora de la Prestación Económica por Renuncia Voluntaria",
    carries: ["Ley Reguladora de la Prestación Económica por Renuncia Voluntaria"],
  },
  minimumWage: {
    name: "D.E. 12/2025 — tarifas de salarios mínimos",
    carries: ["D.E. 12/2025"],
  },
  aguinaldoDecree: {
    name: "D.L. 440 (bóveda de jurisprudencia), cuyo considerando V cita el D.L. 433",
    carries: ["D.L. 440"],
  },
  quincena25: {
    name: "D.L. 499 — Ley Especial Quincena Veinticinco",
    carries: ["Ley Especial Quincena Veinticinco"],
  },
  aguinaldoTax2025: {
    name: "D.L. 432 — aguinaldo no gravable para el ejercicio 2025",
    carries: ["D.L. 432"],
  },
  aguinaldoReform: {
    name: "MTPS — Entrega anticipada de aguinaldo es opcional de los empleadores",
    carries: [],
  },
  overtimePay: {
    name: "MTPS — Dirección General de Inspección de Trabajo, ejemplo de hora extra",
    carries: [],
  },
  nightShift: {
    name: "MTPS — Cuándo mi jornada es nocturna y cómo me la deben pagar",
    carries: [],
  },
  workingHours: {
    name: "MTPS — Cuántas horas debo trabajar al día",
    carries: [],
  },
  holidayPay: {
    name: "MTPS — Derechos laborales en fechas de asueto",
    carries: [],
  },
  specialSchedules: {
    name: "MTPS — Aprobar horarios de trabajo especiales",
    carries: [],
  },
  withholding: {
    name: "D.E. 10/2025 — tablas de retención del impuesto sobre la renta",
    carries: ["Decreto Ejecutivo 10/2025"],
  },
  incomeTax: {
    name: "Ley de Impuesto sobre la Renta (texto consolidado)",
    // The reform table at the end lists the transitory aguinaldo decrees by
    // number, date and Diario Oficial, so a rule citing one of them is
    // checkable here. Verified against the PDF: D.L. 229, 596, 900 and 159.
    carries: [
      "Ley de Impuesto sobre la Renta",
      "D.L. 229", "D.L. 596", "D.L. 900", "D.L. 159", "D.L. 458",
    ],
  },
  isss: {
    name: "ISSS — Lineamiento de modificación del salario máximo cotizable",
    // Its "BASE LEGAL" transcribes the first paragraph of article 29 of the Ley
    // del Seguro Social, so the 3% is readable here as well as the ceiling.
    carries: [
      "Lineamiento de modificación del salario máximo cotizable del ISSS",
      "Ley del Seguro Social",
    ],
  },
  pensions: {
    name: "Ley Integral del Sistema de Pensiones",
    carries: ["Ley Integral del Sistema de Pensiones"],
  },
  ssf: {
    name: "SSF — Tasas de interés, comisiones y recargos",
    carries: [],
  },
  treasury: {
    name: "Ministerio de Hacienda — Modificación a las tablas de retención (D.E. 10)",
    carries: [],
  },
  issues: {
    name: "LoanPilot — reportar una diferencia en GitHub",
    carries: [],
  },
} as const satisfies Record<string, SourceDoc>;

/**
 * Every document identity the invariant knows how to recognise inside a `norm`.
 *
 * Derived from `DOCUMENTS` rather than listed again: an identity nothing
 * carries cannot be checked, and an identity listed here that no source carries
 * would fail every rule that names it. Ordered longest first so the more
 * specific name wins where one contains another.
 */
export const DOCUMENT_IDENTITIES: readonly string[] = [...new Set(
  Object.values(DOCUMENTS).flatMap((doc) => doc.carries as readonly string[]),
)].sort((a, b) => b.length - a.length);

/**
 * What a citation link opens, printed under the article it names.
 *
 * Not translated, and that is deliberate: these are the titles of Salvadoran
 * documents and every one of them opens in Spanish. Translating the name of a
 * PDF the reader is about to see would misdescribe it, and the English pages
 * already print `norm` in Spanish for the same reason.
 */
export function documentName(source: keyof typeof DOCUMENTS) {
  return DOCUMENTS[source].name;
}

/**
 * Who publishes each host, for the row of sources the home page shows.
 *
 * That row was four names typed by hand — Código de Trabajo, MTPS, Ministerio
 * de Hacienda, SSF — and it had gone stale in the way a hand-kept list always
 * does: the subpages had been citing the LISR, the Ley Integral del Sistema de
 * Pensiones, the ISSS and the D.L. 499 for months while the front door still
 * named four. It is now derived from the rules that actually cite something,
 * and `tests/rules.test.mjs` fails when a rule cites a host nobody has named
 * here, so the row cannot fall behind again.
 *
 * Two Hacienda hosts and two judicial ones collapse into one name each: a
 * reader recognises the institution, not the subdomain that serves the PDF.
 */
export const INSTITUTIONS: Record<string, string> = {
  "www.asamblea.gob.sv": "Asamblea Legislativa",
  "www.mtps.gob.sv": "MTPS",
  "www.csj.gob.sv": "Corte Suprema de Justicia",
  "www.jurisprudencia.gob.sv": "Corte Suprema de Justicia",
  "www.transparenciafiscal.gob.sv": "Ministerio de Hacienda",
  "transparencia.mh.gob.sv": "Ministerio de Hacienda",
  "www.mh.gob.sv": "Ministerio de Hacienda",
  "ovisss.isss.gob.sv": "ISSS",
  "ssf.gob.sv": "SSF",
};

export function institutionOf(source: keyof typeof DOCUMENTS) {
  return INSTITUTIONS[new URL(OFFICIAL[source]).hostname];
}

export const OFFICIAL = {
  // Consolidación oficial actualizada por la Asamblea en diciembre de 2024.
  laborCode: "https://www.asamblea.gob.sv/sites/default/files/documents/decretos/27207B63-DF82-4453-833B-F54B24B52A10.pdf",
  laborService: "https://www.mtps.gob.sv/servicios/calculo-de-indemnizacion-en-linea/",
  // La ficha de la CSJ con los arts. 177-185 de la vacación anual remunerada,
  // transcritos íntegros. Se cita aparte del código completo porque es la
  // fuente corta que un lector puede abrir y comprobar en un minuto.
  //
  // El nombre del archivo lleva los acentos en forma descompuesta (NFD): la
  // "ó" es "o" + acento combinante, y por eso va escapado. Con la forma
  // compuesta, que es la que escribe cualquier editor, el servidor responde
  // 404 — no lo "arregles" sustituyendo los escapes por letras acentuadas.
  vacation: "https://www.csj.gob.sv/wp-content/uploads/2021/06/10-Co%CC%81digo-de-Trabajo-de-El-Salvador-Vacacio%CC%81n-anual-remunerada.pdf",
  resignation: "https://www.mtps.gob.sv/download/decreto-no-592-ley-reguladora-de-la-prestacion-economica-por-renuncia-voluntaria/",
  // Decree 12 replaced the wage table in Decree 11, so it is the document that
  // actually carries the figures the calculator uses.
  minimumWage: "https://www.jurisprudencia.gob.sv/DocumentosBoveda/R/2/2020-2029/2025/05/10A54E.HTML",
  // El D.L. 433 movió el aguinaldo al 20 de octubre, y a agosto de 2026 la
  // Asamblea todavía no lo incorpora a su texto consolidado del Código de
  // Trabajo: los arts. 197, 200 y 202 del PDF de `laborCode` siguen diciendo
  // «doce de diciembre». La cita de grado decreto es entonces el considerando
  // V del D.L. 440, publicado en la bóveda oficial de jurisprudencia, que da
  // número, fecha y Diario Oficial de la reforma:
  //
  //   «Que por medio de Decretos Legislativos números 433 y 434, de fecha 15
  //   de octubre de 2025, publicados en el Diario Oficial n.° 194, Tomo n.°
  //   449, de la misma fecha, se aprobaron reformas al Código de Trabajo y a
  //   la Ley sobre la Compensación Adicional en Efectivo, a fin de ampliar el
  //   periodo para realizar el pago del correspondiente aguinaldo […] entre el
  //   20 de octubre y el 20 diciembre de cada año.»
  //
  // Sustituir este enlace por el del D.L. 433 en cuanto la bóveda lo publique,
  // o por el consolidado del código cuando la Asamblea lo actualice.
  aguinaldoDecree: "https://www.jurisprudencia.gob.sv/DocumentosBoveda/D/2/2020-2029/2025/10/10E76F.PDF",
  // La Ley Especial Quincena Veinticinco, D.L. 499 del 14 de enero de 2026,
  // publicada en el Diario Oficial n.° 8, Tomo n.° 450, de esa misma fecha. Es
  // ley autónoma de nueve artículos, no una reforma al Código de Trabajo.
  //
  // Esta entrada existe porque las tres reglas de la Quincena 25 apuntaban a
  // `laborCode`, que no la contiene y sí trae, en su tabla de reformas, un
  // «D. L. No. 499, 8 DE ABRIL DE 1976». Son dos decretos distintos con el
  // mismo número, y quien siguiera la cita llegaba al de 1976: el peor tipo de
  // enlace roto, porque no parece roto. El PDF exportado agrupa las citas por
  // documento, así que el error ya se imprimía bajo la dirección del código.
  //
  // El enlace es la ficha del decreto en la bóveda de la Asamblea
  // (`leyes-y-decretos/view/6643`), que declara ese número de Diario Oficial,
  // tomo y fecha de publicación. Como todo `asamblea.gob.sv/.../decretos/`, el
  // archivo trae bytes basura antes del `%PDF` y hay que recortarlo para leerlo
  // con poppler; el contenido es texto real, no escaneo.
  quincena25: "https://www.asamblea.gob.sv/sites/default/files/documents/decretos/D72EB960-89D5-443E-AE2D-196F677CB0F2.pdf",
  // El D.L. 432 del 15 de octubre de 2025 (D.O. 194, Tomo 449), que declaró el
  // aguinaldo renta no gravable hasta $1,500 PARA EL EJERCICIO FISCAL 2025 y
  // sólo para ése. Se cita como documento propio, y no dentro de `incomeTax`,
  // porque no reforma la ley: la desplaza por un año. Su art. 1 abre con «No
  // obstante lo dispuesto en el numeral 16) del artículo 4 de la Ley de
  // Impuesto sobre la Renta», de modo que el numeral 16 nunca fue derogado.
  //
  // Su considerando II da además la referencia de ese numeral —D.L. 458 del 31
  // de octubre de 2019, D.O. 215, Tomo 425— que coincide con el marcador (23)
  // de la tabla de reformas del texto consolidado en `incomeTax`.
  aguinaldoTax2025: "https://www.asamblea.gob.sv/sites/default/files/documents/decretos/C386EF17-94EA-44DD-9EA3-98360385F54D.pdf",
  // La explicación del MTPS sobre cómo opera el pago anticipado. Es publicación
  // institucional del ministerio que administra la regla, no prensa, y es la
  // que describe la práctica; el valor normativo lo lleva `aguinaldoDecree`.
  aguinaldoReform: "https://www.mtps.gob.sv/2025/10/27/entrega-anticipada-de-aguinaldo-es-opcional-de-empresarios/",
  // La explicación del MTPS con el ejemplo numérico de la hora extra: es la
  // que fija el orden de las operaciones para la nocturna (el 25% se aplica
  // sobre la hora ya recargada al 100%, no sobre la básica).
  overtimePay: "https://www.mtps.gob.sv/2025/11/24/direccion-general-de-inspeccion-de-trabajo/",
  nightShift: "https://www.mtps.gob.sv/2020/10/27/cuando-mi-jornada-es-nocturna-y-como-me-la-deben-pagar/",
  workingHours: "https://www.mtps.gob.sv/2020/10/26/cuantas-horas-debo-trabajar-al-dia/",
  holidayPay: "https://www.mtps.gob.sv/2026/03/23/voceria-oficial-informa-sobre-derechos-laborales-en-fechas-de-asueto/",
  specialSchedules: "https://www.mtps.gob.sv/servicios/aprobar-horarios-de-trabajo-especiales/",
  withholding: "https://www.transparenciafiscal.gob.sv/downloads/pdf/700-DGII-DC-2025-01.pdf",
  incomeTax: "https://transparencia.mh.gob.sv/downloads/pdf/DC5811.pdf",
  isss: "https://ovisss.isss.gob.sv/documentos_ofivi/Lineamiento_Mod_Salario_Maximo.pdf",
  // The law itself, not the index it used to point at. Every other source here
  // opens the document a figure is read from, and this one opened a list of
  // links — so the one rule the /renta-anual/ thresholds hang on could not be
  // checked from the repository at all. A WordPress upload path is less stable
  // than an index page and that is the trade: if this ever 404s, the index at
  // ssf.gob.sv/estadisticas/marco-legal-y-normativo/leyes-2/ is where the
  // current URL is found again. Nothing in the test suite fetches these, so a
  // break surfaces at the six-month review and not before.
  //
  // Like the asamblea.gob.sv decrees above, the file arrives with eight bytes
  // of rubbish before the `%PDF` header, so `file` calls it "data" and poppler
  // refuses it until the prefix is cut. The text layer underneath is real, not
  // a scan: arts. 14, 16, 26 and 138 were read straight out of it.
  // EL SERVIDOR DE LA SSF FALLA TLS DE FORMA INTERMITENTE, y no es este enlace.
  // A agosto de 2026 `ssf.gob.sv` responde a veces 200 y a veces rechaza la
  // conexión con "no alternative certificate subject name matches target host
  // name": el certificado que sirve alguno de sus nodos no cubre ese nombre.
  // Afecta a las dos entradas de este dominio y puede mostrarle al lector una
  // advertencia del navegador.
  //
  // NO SE ARREGLA CAMBIANDO LA URL. El documento es el correcto y el problema
  // es del otro lado; sustituirlo por una copia en otro dominio rompería la
  // regla del encabezado de este archivo —toda fuente vive en `.gob.sv`— y
  // cambiaría un documento oficial por uno que nadie administra.
  pensions: "https://ssf.gob.sv/wp-content/uploads/2023/02/Ley-Integral-del-Sistema-de-Pensiones.pdf",
  ssf: "https://ssf.gob.sv/servicios/tasas-de-interes-comisiones-y-recargos/",
  treasury: "https://www.mh.gob.sv/modificacion-a-las-tablas-de-retencion-del-impuesto-sobre-la-renta-decreto-ejecutivo-no-10/",
  issues: "https://github.com/MarlonCoreas/LoanPilot/issues/new?template=calculation.yml",
} as const;
