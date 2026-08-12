import { renderToStaticMarkup } from "react-dom/server";
import App from "../app/App";

// Build-time snapshot of the page, injected into index.html so crawlers and
// link previews get real content instead of an empty root element. The browser
// re-renders from scratch on load (see main.tsx) because every default in the
// form is derived from the current date, which a build-time snapshot cannot know.
export function render(pathname = "/") {
  return renderToStaticMarkup(<App pathname={pathname} />);
}

// Re-exported so the prerender script reads the route table from the same
// module the application routes with, instead of keeping a second copy.
export {
  alternates, absoluteUrl, LANGS, OG_CARD, OG_LOCALE, ogImagePath, PAGES, PAGE_META, ROUTES,
  SITE_ORIGIN,
} from "../app/routes";
export { structuredDataScript } from "../app/seo";
export { RULES_REVIEWED } from "../app/statutory";
