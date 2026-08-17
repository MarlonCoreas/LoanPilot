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
  pensions: "https://ssf.gob.sv/estadisticas/marco-legal-y-normativo/leyes-2/",
  ssf: "https://ssf.gob.sv/servicios/tasas-de-interes-comisiones-y-recargos/",
  treasury: "https://www.mh.gob.sv/modificacion-a-las-tablas-de-retencion-del-impuesto-sobre-la-renta-decreto-ejecutivo-no-10/",
  issues: "https://github.com/MarlonCoreas/LoanPilot/issues/new?template=calculation.yml",
} as const;
