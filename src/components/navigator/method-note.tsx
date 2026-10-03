/** What the check does and keeps, in a few lines, for anyone who asks. Collapsed on the start page. */
export function MethodNote() {
  return (
    <details className="mt-4 rounded-2xl border border-line bg-card px-4">
      <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium">How this check works, and what it keeps</summary>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 pb-4 text-sm leading-relaxed text-muted">
        <li>The money is plain arithmetic in your browser: the extra price of switching, divided by what the electric car saves each year. No AI writes it.</li>
        <li>Every figure has a label (you, default, official, model) and a source with a date. Where it is a placeholder, it says so.</li>
        <li>Nothing leaves your device until you reach the result. Then one record is kept under a random number: your taps and the figures, rounded. No name. A postcode only if you add it, and it is deleted after twelve months. You can delete the record yourself on the result page.</li>
        <li>AI helps in one optional place: reading a sentence you choose to write into one category, after you tick the box. You confirm it, and the sentence is not kept.</li>
        <li>Where it is weak: class figures, not your car; no winter factor; not advice. Keeping your car is a complete answer.</li>
      </ul>
    </details>
  );
}
