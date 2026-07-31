import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("LoanPilot root element was not found");
}

// createRoot, not hydrateRoot: index.html carries a build-time snapshot of the
// page (see entry-server.tsx) whose dates and figures are stale by definition,
// so React discards it and renders against today's date.
root.replaceChildren();

createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
