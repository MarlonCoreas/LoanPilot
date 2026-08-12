import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { PAGE_LABELS, ROUTES, TOOL_PAGES, type Lang } from "./routes";

/**
 * The page Apache serves for any address the site does not have
 * (`ErrorDocument 404`, see public/.htaccess).
 *
 * It ships as a single prerendered file in Spanish and re-renders in the
 * reader's language on load, because a static error document cannot know which
 * URL asked for it but the browser can.
 */
const copy = {
  es: {
    code: "ERROR 404",
    title: "Esta página no existe.",
    lead: "El enlace puede estar mal escrito, o la herramienta que buscas cambió de dirección. Estas siguen aquí:",
    home: "Ir al inicio",
  },
  en: {
    code: "ERROR 404",
    title: "This page does not exist.",
    lead: "The link may be mistyped, or the tool you are after moved. These are still here:",
    home: "Go to the home page",
  },
} as const;

export default function NotFound({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return <main className="notfound-page">
    <SiteHeader lang={lang} page="home" />
    <section className="hero notfound-hero">
      <b>{t.code}</b>
      <h1>{t.title}</h1>
      <p>{t.lead}</p>
      <div className="notfound-links">
        <a className="primary" href={ROUTES[lang].home}>{t.home}</a>
        {TOOL_PAGES.map((page) => <a href={ROUTES[lang][page]} key={page}>
          {PAGE_LABELS[lang][page]}<span>→</span>
        </a>)}
      </div>
    </section>
    <SiteFooter lang={lang} />
  </main>;
}
