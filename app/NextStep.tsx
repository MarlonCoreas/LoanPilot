/**
 * One line beside a result, pointing at the calculator that answers the
 * question that result just raised.
 *
 * WHY IT IS NOT A LIST AT THE FOOT. Every page already carries a "related
 * tools" panel down there, and it is read by nobody: a reader who has just seen
 * a number is not scrolling past the sources to look for what to do about it.
 * This goes where the question appears — under the December excess, under the
 * taxable slice of a bonus, under the gross total of a settlement — and it says
 * what the other page would tell them, not just its name.
 *
 * TWO PER PAGE AT MOST, and only where the next question is a real one. A
 * calculator that ends every block with a suggestion to visit another
 * calculator is an ad for itself; the value of this line is that it is rare
 * enough to be read.
 */
export default function NextStep({ href, children, cta }: {
  href: string;
  /** The question, in the reader's own situation. */
  children: React.ReactNode;
  /** What the other page does about it. Never a bare page name. */
  cta: string;
}) {
  return <p className="next-step">
    <i aria-hidden="true">→</i>
    <span>{children} <a href={href}>{cta}</a></span>
  </p>;
}
