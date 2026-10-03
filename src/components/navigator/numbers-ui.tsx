import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { chf } from "@/lib/navigator/model";
import { statusWord, type Sheet, type SheetLine } from "@/lib/navigator/numbers";

const BADGE: Record<SheetLine["status"], string> = {
  sourced: "bg-moss text-moss-ink",
  official: "bg-moss text-moss-ink",
  live: "bg-moss text-moss-ink",
  placeholder: "bg-amber text-amber-ink",
  missing: "bg-line text-muted",
};

export function dateLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** One number with its tag, its publisher and date, its link and what it is not. */
export function DatasetLine({ row }: { row: SheetLine }) {
  const when = dateLabel(row.published_on);
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-medium">{row.label}</span>
        <span className="shrink-0 text-right text-sm tabular-nums">{row.value}</span>
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        <span className={`rounded-full px-2 py-0.5 font-medium ${BADGE[row.status]}`}>{statusWord(row.status)}</span>
        {row.publisher ? <span>{row.publisher}</span> : null}
        {when ? <span>· {when}</span> : null}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{row.note}</p>
      {row.source_url ? (
        <a className="mt-1 inline-block min-h-6 text-xs font-medium text-spruce underline" href={row.source_url} target="_blank" rel="noopener noreferrer">
          Open the source
        </a>
      ) : null}
    </li>
  );
}

export function NumberSheetModal({ sheet, version, onClose }: { sheet: Sheet; version: string | undefined; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  const rough = sheet.lines.filter((l) => l.status === "placeholder").length;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 lg:items-center lg:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={sheet.title}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-sheet p-5 lg:rounded-3xl lg:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-widest text-muted uppercase">How this number is made</p>
            <h2 className="font-serif mt-1 text-2xl leading-tight">{sheet.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 rounded-2xl bg-card p-3 text-sm leading-relaxed">{sheet.formula}</p>
        <p className="font-serif mt-3 text-xl tabular-nums">{sheet.worked}</p>

        {sheet.parts.length > 0 ? (
          <div className="mt-5">
            <h3 className="text-sm font-medium">Line by line</h3>
            <ul className="mt-1 divide-y divide-line">
              {sheet.parts.map((p) => (
                <li key={p.label} className="py-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{p.label}</span>
                    <span className="tabular-nums">{chf(p.amount)}</span>
                  </div>
                  <details className="mt-1">
                    <summary className="min-h-7 cursor-pointer text-xs font-medium text-spruce">The sum, and where it comes from</summary>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{p.how}</p>
                    {p.link ? (
                      <a className="mt-1 inline-block text-xs font-medium text-spruce underline" href={p.link.href} target="_blank" rel="noopener noreferrer">
                        {p.link.name}
                      </a>
                    ) : null}
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5">
          <h3 className="text-sm font-medium">The figures it reads</h3>
          <ul className="mt-1 divide-y divide-line">
            {sheet.lines.map((l) => (
              <DatasetLine key={l.key} row={l} />
            ))}
          </ul>
          {rough > 0 ? (
            <p className="mt-2 rounded-2xl bg-amber px-3 py-2 text-xs leading-relaxed text-amber-ink">
              {rough === 1 ? "One figure here is" : `${rough} figures here are`} a rough class figure, not a quote. The check shows its effect on the range under "How sure is this?".
            </p>
          ) : null}
        </div>
        <p className="mt-4 text-xs text-muted">Figures version {version ?? "built in"}.</p>
        <Link to="/method" className="mt-1 inline-block min-h-11 py-3 text-sm font-medium text-spruce underline">
          How the whole check works, and what it leaves out
        </Link>
      </div>
    </div>
  );
}
