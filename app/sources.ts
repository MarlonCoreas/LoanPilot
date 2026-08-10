/**
 * Every official document the site cites, in one place. The footer and the
 * calculators each kept their own copy of this map and had already drifted:
 * two different MTPS entries, and a minimum-wage link pointing at the decree
 * whose table had been replaced.
 */
export const OFFICIAL = {
  laborCode: "https://www.asamblea.gob.sv/sites/default/files/documents/decretos/AD778A29-F1B3-495E-AE19-E2B05D93685D.pdf",
  laborService: "https://www.mtps.gob.sv/servicios/calculo-de-indemnizacion-en-linea/",
  resignation: "https://www.mtps.gob.sv/download/decreto-no-592-ley-reguladora-de-la-prestacion-economica-por-renuncia-voluntaria/",
  // Decree 12 replaced the wage table in Decree 11, so it is the document that
  // actually carries the figures the calculator uses.
  minimumWage: "https://www.jurisprudencia.gob.sv/DocumentosBoveda/R/2/2020-2029/2025/05/10A54E.HTML",
  aguinaldoReform: "https://www.mtps.gob.sv/2025/10/27/entrega-anticipada-de-aguinaldo-es-opcional-de-empresarios/",
  withholding: "https://www.transparenciafiscal.gob.sv/downloads/pdf/700-DGII-DC-2025-01.pdf",
  incomeTax: "https://transparencia.mh.gob.sv/downloads/pdf/DC5811.pdf",
  isss: "https://ovisss.isss.gob.sv/documentos_ofivi/Lineamiento_Mod_Salario_Maximo.pdf",
  pensions: "https://ssf.gob.sv/estadisticas/marco-legal-y-normativo/leyes-2/",
  ssf: "https://ssf.gob.sv/servicios/tasas-de-interes-comisiones-y-recargos/",
  treasury: "https://www.mh.gob.sv/modificacion-a-las-tablas-de-retencion-del-impuesto-sobre-la-renta-decreto-ejecutivo-no-10/",
  issues: "https://github.com/MarlonCoreas/LoanPilot/issues/new?template=calculation.yml",
} as const;
