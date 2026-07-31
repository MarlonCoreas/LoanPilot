import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";

// Build-time snapshot of the page, injected into index.html so crawlers and
// link previews get real content instead of an empty root element. The browser
// re-renders from scratch on load (see main.tsx) because every default in the
// form is derived from the current date, which a build-time snapshot cannot know.
export function render() {
  return renderToStaticMarkup(<Home />);
}
