import LegalPage from "./LegalPage";
import LoanPage from "./page";
import PlatformHome from "./PlatformHome";

export type SitePath = "/" | "/prestamos/" | "/finiquito/" | "/retenciones/";

export function normalizePath(pathname: string): SitePath {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/prestamos") return "/prestamos/";
  if (path === "/finiquito") return "/finiquito/";
  if (path === "/retenciones") return "/retenciones/";
  return "/";
}

export default function App({ pathname }: { pathname: string }) {
  const route = normalizePath(pathname);
  if (route === "/prestamos/") return <LoanPage />;
  if (route === "/finiquito/") return <LegalPage page="settlement" />;
  if (route === "/retenciones/") return <LegalPage page="withholding" />;
  return <PlatformHome />;
}
