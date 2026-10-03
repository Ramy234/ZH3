import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { loadSittings, type SittingsAnswer } from "@/lib/navigator/sittings-server";
import { MIN_CELL, type Count } from "@/lib/navigator/sittings";
import { COHORT_RE } from "@/lib/navigator/telemetry";

export const Route = createFileRoute("/sittings")({
  head: () => ({ meta: [{ title: "Sittings · BEV Navigator" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Sittings,
});

const LABEL: Record<string, string> = {
  fold_why: "opened 'why this result'",
  fold_evidence: "opened the evidence",
  share: "used Share",
  picture: "made the picture",
  reminder: "set the reminder",
  try_lever: "tried a lever",
};

// Ticked in this browser only. Nothing here is sent anywhere.
const CHECKLIST = [
  "Open the sitting link on a phone and finish the path once. The result page must load.",
  "Say out loud that nothing personal is asked and that 'keep this car' is a fair ending.",
  "Give each group its own code (i1, i2, ...). Never one code per person.",
  "Read this page only after at least 5 people in a group have finished.",
  "Do not write down who answered what. This page cannot show it, and you should not rebuild it.",
  "Note what people said about the wording, then change the wording in the app, not the numbers.",
];

function Bars({ items, label }: { items: Count[]; label: (k: string) => string }) {
  if (!items.length) return <p className="mt-1 text-sm text-muted">Nothing at {MIN_CELL} or more.</p>;
  const top = Math.max(...items.map((i) => i.n));
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((i) => (
        <li key={i.key} className="text-sm">
          <div className="flex justify-between gap-3">
            <span>{label(i.key)}</span>
            <span className="tabular-nums text-muted">{i.n}</span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-line">
            <div className="h-1.5 rounded-full bg-spruce" style={{ width: `${Math.max(6, (100 * i.n) / top)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Sittings() {
  const load = useServerFn(loadSittings);
  const [key, setKey] = useState("");
  const [answer, setAnswer] = useState<SittingsAnswer | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [ticked, setTicked] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("bev-sittings-checklist");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length === CHECKLIST.length) setTicked(parsed.map(Boolean));
    } catch {
      /* storage can be blocked; the list still works for this visit */
    }
  }, []);

  const tick = (i: number) =>
    setTicked((prev) => {
      const next = prev.map((v, j) => (j === i ? !v : v));
      try {
        window.localStorage.setItem("bev-sittings-checklist", JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      setAnswer(await load({ data: { key } }));
    } catch {
      setAnswer({ state: "locked" });
    } finally {
      setBusy(false);
      setKey("");
    }
  };

  const cleanCode = code.trim().toLowerCase();
  const link = COHORT_RE.test(cleanCode) && typeof window !== "undefined" ? `${window.location.origin}/?s=${cleanCode}` : null;

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 text-ink">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-xs font-medium tracking-widest text-spruce uppercase">Internal · not for participants</p>
        <h1 className="font-serif mt-2 text-3xl leading-tight">Sittings</h1>
        <p className="mt-2 text-sm leading-snug text-muted">
          One code per group, like <span className="font-medium text-ink">i1</span>. Counts only, never a person. A group under {MIN_CELL} finished sessions shows nothing.
        </p>

        <section className="mt-6 rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold">Make a link</h2>
          <label className="mt-2 block text-sm text-muted" htmlFor="code">Group code, letters then one or two digits</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={5}
            className="mt-1 w-full rounded-xl border border-line bg-sheet px-3 py-2 text-base" placeholder="i1" />
          <p className="mt-2 text-sm break-all">{link ?? <span className="text-muted">Type a code to see the link.</span>}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold">Before and after a sitting</h2>
          <p className="mt-1 text-xs text-muted">Ticks stay in this browser only.</p>
          <ul className="mt-2 space-y-2">
            {CHECKLIST.map((item, i) => (
              <li key={item}>
                <label className="flex items-start gap-3 text-sm leading-snug">
                  <input type="checkbox" checked={ticked[i]} onChange={() => tick(i)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-spruce)]" />
                  <span>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-4 rounded-2xl border border-line bg-card p-4">
          <h2 className="text-sm font-semibold">Results</h2>
          {answer?.state !== "ok" ? (
            <form onSubmit={submit} className="mt-2">
              <label className="block text-sm text-muted" htmlFor="key">Access key</label>
              <input id="key" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off"
                className="mt-1 w-full rounded-xl border border-line bg-sheet px-3 py-2 text-base" />
              <button type="submit" disabled={busy || !key} className="mt-3 min-h-11 rounded-full bg-spruce px-5 text-sm font-medium text-spruce-ink disabled:opacity-50">
                {busy ? "Checking" : "Show counts"}
              </button>
              {answer?.state === "off" ? <p className="mt-2 text-sm text-muted">This page is switched off on this server (no SITTINGS_KEY set).</p> : null}
              {answer?.state === "locked" ? <p className="mt-2 text-sm text-muted">That key did not open it.</p> : null}
            </form>
          ) : (
            <div className="mt-2 space-y-4">
              {answer.report.sittings.length === 0 ? <p className="text-sm text-muted">No sitting codes yet.</p> : null}
              {answer.report.sittings.map((s) => (
                <article key={s.code} className="rounded-xl border border-line p-3">
                  <h3 className="text-base font-semibold">{s.code}</h3>
                  {s.finished == null ? (
                    <p className="mt-1 text-sm text-muted">{s.flags[0]}</p>
                  ) : (
                    <>
                      <p className="mt-1 text-sm">
                        {s.finished} finished · {s.covered} covered within 8 years · {s.keep} keep or later
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-snug">
                        {s.flags.map((f) => <li key={f}>{f}</li>)}
                      </ul>
                      <h4 className="mt-3 text-xs font-medium tracking-widest text-muted uppercase">On the result page</h4>
                      <Bars items={s.actions} label={(k) => LABEL[k] ?? k} />
                      <h4 className="mt-3 text-xs font-medium tracking-widest text-muted uppercase">Barrier</h4>
                      <Bars items={s.barriers} label={(k) => k} />
                      <h4 className="mt-3 text-xs font-medium tracking-widest text-muted uppercase">Unclear</h4>
                      <Bars items={s.unclear} label={(k) => k} />
                    </>
                  )}
                </article>
              ))}
              <p className="text-xs text-muted">{answer.report.withoutCode} finished sessions came without a code. Sample sessions are left out.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
