import LegalPage from "./LegalPage";
import NotFound from "./NotFound";
import OvertimePage from "./OvertimePage";
import LoanPage from "./page";
import PlatformHome from "./PlatformHome";
import { resolveRoute } from "./routes";

export default function App({ pathname }: { pathname: string }) {
  const { lang, page } = resolveRoute(pathname);
  if (page === "notFound") return <NotFound lang={lang} />;
  if (page === "loans") return <LoanPage lang={lang} />;
  if (page === "settlement") return <LegalPage lang={lang} page="settlement" />;
  if (page === "overtime") return <OvertimePage lang={lang} />;
  if (page === "withholding") return <LegalPage lang={lang} page="withholding" />;
  return <PlatformHome lang={lang} />;
}
