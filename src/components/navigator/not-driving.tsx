import { useState } from "react";
import { FRIEND_TEXT, NOT_DRIVING } from "@/lib/navigator/not-driving";
import { RATES, dataNote } from "@/lib/navigator/model";
import type { FactKey } from "@/lib/navigator/facts";

/** For the visitor with no car, no wish for one, or a car that is already electric. Collapsed, so it costs the others nothing. */
export function NotDriving({ onShare, onFact }: { onShare: (text: string) => Promise<"shared" | "copied" | "failed">; onFact: (fact: FactKey) => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const url = typeof window === "undefined" || /^(localhost|127\.|\[)/.test(window.location.hostname) ? "" : ` ${window.location.origin}`;
  const chf = (n: number) => `CHF ${n.toLocaleString("de-CH")}`;
  const list = (items: readonly { name: string; href: string; note: string }[]) => (
    <ul className="mt-2 flex flex-col gap-2">
      {items.map((l) => (
        <li key={l.href}>
          <a className="block rounded-xl border border-line bg-sheet px-3 py-2" href={l.href} target="_blank" rel="noopener noreferrer">
            <span className="block text-sm font-medium text-spruce underline underline-offset-2">{l.name}</span>
            <span className="mt-0.5 block text-xs leading-snug text-muted">{l.note}</span>
          </a>
        </li>
      ))}
    </ul>
  );
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-11 text-left text-sm font-medium text-spruce">
        No car, no wish for one, or already electric?
      </button>
    );
  }
  return (
    <section className="mt-3 rounded-2xl border border-line bg-card p-4" aria-label="No car, no wish for one, or already electric">
      <h2 className="text-sm font-medium">Not driving, or already electric</h2>
      <div className="mt-3 flex flex-col gap-4 text-sm leading-relaxed">
        <div>
          <p className="font-medium">Know someone who drives?</p>
          <p className="text-muted">Send them the check. It carries none of your answers, only the link.</p>
          <button
            type="button"
            onClick={() => void onShare(FRIEND_TEXT + url).then((how) => setNote(how === "shared" ? "Sent." : how === "copied" ? "Copied. Paste it into a message." : "That did not work."))}
            className="mt-2 min-h-11 rounded-full bg-spruce px-5 text-sm font-medium text-spruce-ink"
          >
            Send it to a friend
          </button>
          {note ? <p role="status" className="mt-1 text-xs text-muted">{note}</p> : null}
        </div>
        <div>
          <p className="font-medium">No car, or thinking of giving yours up</p>
          <p className="text-muted">
            {dataNote("rate.travelCard") || `A year of the second-class travel card costs ${chf(RATES.travelCard)} from 13 December 2026.`}
          </p>
          {list(NOT_DRIVING.neutral)}
          <p className="mt-3 text-xs font-medium tracking-widest text-muted uppercase">Providers, not neutral sources</p>
          {list(NOT_DRIVING.providers)}
        </div>
        <div>
          <p className="font-medium">Already driving electric</p>
          <p className="text-muted">Run the check and choose Electric at the fuel step. The money part then has little to compare, but the charging check, “What applies to you” and the climate tab still apply.</p>
        </div>
        <div>
          <p className="font-medium">Simply do not want one</p>
          <p className="text-muted">That is a fair answer, and nothing here tries to overturn it.</p>
          <button type="button" onClick={() => onFact("not-for-me")} className="mt-2 min-h-11 rounded-full border border-line px-5 text-sm font-medium">
            Read what that means
          </button>
        </div>
      </div>
    </section>
  );
}
