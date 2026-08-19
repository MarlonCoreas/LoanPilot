import { useAnchoredEntry } from "./anchor";
import AguinaldoPage from "./AguinaldoPage";
import AnnualTaxPage from "./AnnualTaxPage";
import CreditCardPage from "./CreditCardPage";
import DisputedRulesPage from "./DisputedRulesPage";
import LegalPage from "./LegalPage";
import NotFound from "./NotFound";
import OvertimePage from "./OvertimePage";
import LoanPage from "./page";
import PlatformHome from "./PlatformHome";
import { resolveRoute } from "./routes";

export default function App({ pathname }: { pathname: string }) {
  const { lang, page } = resolveRoute(pathname);
  // Every page, once: see the note on the hook for why the browser's own jump
  // does not survive this application's first render.
  useAnchoredEntry();
  if (page === "notFound") return <NotFound lang={lang} />;
  if (page === "loans") return <LoanPage lang={lang} />;
  if (page === "creditCard") return <CreditCardPage lang={lang} />;
  if (page === "settlement") return <LegalPage lang={lang} page="settlement" />;
  if (page === "aguinaldo") return <AguinaldoPage lang={lang} />;
  if (page === "overtime") return <OvertimePage lang={lang} />;
  if (page === "withholding") return <LegalPage lang={lang} page="withholding" />;
  if (page === "annualTax") return <AnnualTaxPage lang={lang} />;
  if (page === "disputed") return <DisputedRulesPage lang={lang} />;
  return <PlatformHome lang={lang} />;
}
