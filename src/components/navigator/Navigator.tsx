import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, ChevronDown, Download, RotateCcw } from "lucide-react";
import { CostChart } from "@/components/navigator/CostChart";
import { ClimateChart } from "@/components/navigator/ClimateChart";
import { FACTS, FACT_VIEW, type Fact, type FactKey } from "@/lib/navigator/facts";
import { applyDataset } from "@/lib/navigator/dataset";
import { wouldHaveToBeTrue, type Counterfactual, type LeverKey } from "@/lib/navigator/counterfactual";
import { CANTONS, listFacts, loadDataset, cantonHomeRate, lookupPostcode, officialHomeRate, saveSession, type OfficialHome, type SessionBag } from "@/lib/navigator/session";
import {
  BARRIERS,
  CLASSES,
  EMPTY,
  FUELS,
  KM_BANDS,
  PARKING,
  SAMPLE,
  USES,
  chf,
  evaluate,
  OUT,
  SOURCES,
  focusKind,
  homeCopy,
  kmPhrase,
  labelClass,
  labelFuel,
  labelBarrier,
  parkPhrase,
  paybackTitle,
  planText,
  researchRecord,
  shiftLine,
  suggestToggles,
  usesForBarrier,
  type Answers,
  type Barrier,
  type CarClass,
  type CostSting,
  type Fuel,
  type KmBand,
  type Parking,
  type Result,
  type Toggles,
  type TripFreq,
  type UseId,
  type UsedStance,
  type WorkAccess,
} from "@/lib/navigator/model";

type Step =
  | "intro"
  | "barrier"
  | "class"
  | "fuel"
  | "uses"
  | "km"
  | "parking"
  | "confirm"
  | "focus"
  | "result";

const FLOW: Step[] = ["barrier", "parking", "class", "fuel", "km", "focus"];
const STORAGE = "bev-navigator-v2";

const NODES = [
  { name: "You", engine: "Form", line: "One tap. The barrier, not a form." },
  { name: "Sort", engine: "TypeSafe", line: "A label and a confidence. No paragraph." },
  { name: "Price", engine: "Code", line: "Payback stays arithmetic, in the browser." },
  { name: "Options", engine: "Switch", line: "A finite list: 2:1, used, work, a mobile charger." },
  { name: "Plan", engine: "Postgres", line: "One anonymous row when the result opens, and again after a change." },
] as const;

const BACK: Record<Step, Step | null> = {
  intro: null,
  barrier: null,
  parking: "barrier",
  class: "parking",
  fuel: "class",
  uses: "fuel",
  km: "fuel",
  confirm: "km",
  focus: "km",
  result: "focus",
};

const KICKER: Record<Step, string> = {
  intro: "BEV Navigator",
  barrier: "Ordinary week",
  class: "Your car",
  fuel: "Fuel",
  uses: "What it is for",
  km: "Kilometres",
  parking: "Where it sleeps",
  confirm: "Does this fit",
  focus: "One more question",
  result: "Your check",
};

type Gap = "km" | "payback" | "price" | "wording";

type Saved = {
  step: Step;
  answers: Answers;
  sample: boolean;
  pinned: Toggles | null;
  sessionId: string;
  fromSample?: boolean;
};

export function Navigator() {
  // A new screen always opens at its top. Without this, the result could open with its title scrolled away.
  const scroller = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("barrier");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [sample, setSample] = useState(false);
  const [pinned, setPinned] = useState<Toggles | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [openMore, setOpenMore] = useState(false);
  const [openTrace, setOpenTrace] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sheet, setSheet] = useState<FactKey | null>(null);
  const [opened, setOpened] = useState<FactKey[]>([]);
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [official, setOfficial] = useState<OfficialHome | null>(null);
  const [canton, setCanton] = useState<string | null>(null);
  const [cantonRate, setCantonRate] = useState<OfficialHome | null>(null);
  const [cantonState, setCantonState] = useState<"idle" | "loading" | "failed">("idle");
  const [homeGrain, setHomeGrain] = useState<"municipality" | null>(null);
  const [sent, setSent] = useState<"idle" | "sending" | "saved" | "failed">("idle");
  const [sentStage, setSentStage] = useState<"mid" | "final" | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);
  const [fromSample, setFromSample] = useState(false);
  const timer = useRef<number | null>(null);
  const sendSession = useServerFn(saveSession);
  const loadFacts = useServerFn(listFacts);
  const fetchDataset = useServerFn(loadDataset);
  const [datasetVersion, setDatasetVersion] = useState<string | undefined>(undefined);
  const loadOfficial = useServerFn(officialHomeRate);
  const loadCanton = useServerFn(cantonHomeRate);
  const lookupPlace = useServerFn(lookupPostcode);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Saved>;
        if (saved.answers && saved.step) {
          const legacy: Record<string, Step> = { intro: "barrier", confirm: "focus", uses: "km" };
          const next = legacy[saved.step] ?? saved.step;
          const known: Step[] = [...FLOW, "result"];
          setStep(known.includes(next) ? next : "barrier");
          setAnswers({ ...EMPTY, ...saved.answers, uses: saved.answers.uses ?? [] });
          setSample(Boolean(saved.sample));
          setPinned(saved.pinned ?? null);
          setFromSample(Boolean(saved.fromSample));
          setSessionId(saved.sessionId || crypto.randomUUID());
        } else {
          setSessionId(crypto.randomUUID());
        }
      } else {
        setSessionId(crypto.randomUUID());
      }
    } catch {
      setSessionId(crypto.randomUUID());
    }
    setHydrated(true);
    void fetchDataset()
      .then((d) => {
        applyDataset(d.rows);
        setDatasetVersion(d.version);
      })
      .catch(() => undefined);
    void loadOfficial()
      .then((row) => setOfficial(row))
      .catch(() => setOfficial(null));
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Saved = { step, answers, sample, pinned, sessionId, fromSample };
    try {
      localStorage.setItem(STORAGE, JSON.stringify(payload));
    } catch {
      // A private window can refuse storage. The check still works without it.
    }
  }, [hydrated, step, answers, sample, pinned, sessionId, fromSample]);

  function later(fn: () => void) {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, 160);
  }

  function reset() {
    setAnswers(EMPTY);
    setSample(false);
    setPinned(null);
    setOpenMore(false);
    setOpenTrace(false);
    setSheet(null);
    setOpened([]);
    setSent("idle");
    setSentStage(null);
    setGap(null);
    setCanton(null);
    setCantonRate(null);
    setHomeGrain(null);
    setCantonState("idle");
    setFromSample(false);
    setStep("barrier");
  }

  function start() {
    setAnswers(EMPTY);
    setSample(false);
    setPinned(null);
    setSheet(null);
    setOpened([]);
    setSent("idle");
    setSentStage(null);
    setFromSample(false);
    setStep("barrier");
  }

  function showSample() {
    setAnswers(SAMPLE);
    setSample(true);
    setFromSample(true);
    setPinned(null);
    setSheet(null);
    setSent("idle");
    setSentStage(null);
    setStep("result");
  }

  function patch(partial: Partial<Answers>, next?: Step) {
    setAnswers((prev) => ({ ...prev, ...partial }));
    setPinned(null);
    setSample(false);
    setSent("idle");
    setSentStage(null);
    if (next) later(() => setStep(next));
  }

  // The insurance switch was removed from the page. Old saved states must not carry it into a row.
  const toggles: Toggles = { ...(pinned ?? suggestToggles(answers)), insDiscount: false };
  const priced =
    step === "result" || step === "focus" || (Boolean(answers.barrier && answers.parking) && step !== "barrier");
  const result = priced ? evaluate(answers, toggles, cantonRate ?? official, canton) : null;
  const showSoFar = Boolean(result && answers.parking && step !== "barrier" && step !== "result");

  async function pickCanton(code: string | null) {
    setCanton(code);
    setSent("idle");
    setSentStage(null);
    if (!code) {
      setCantonRate(null);
      setHomeGrain(null);
      setCantonState("idle");
      return;
    }
    setHomeGrain(null);
    setCantonState("loading");
    try {
      const row = await loadCanton({ data: code });
      setCantonRate(row);
      setCantonState(row ? "idle" : "failed");
    } catch {
      setCantonRate(null);
      setCantonState("failed");
    }
  }

  async function usePostcode(plz: string) {
    setCantonState("loading");
    setSent("idle");
    setSentStage(null);
    try {
      const hit = await lookupPlace({ data: plz });
      if (!hit) {
        setCantonState("failed");
        return;
      }
      setCanton(hit.canton);
      if (hit.homeChf > 0.1) {
        setHomeGrain("municipality");
        setCantonRate({ homeChf: hit.homeChf, n: hit.n, year: hit.year, place: hit.place });
      } else {
        setHomeGrain(null);
        setCantonRate(null);
      }
      setCantonState("idle");
    } catch {
      setCantonState("failed");
    }
  }

  function adjust(partial: Partial<Answers>) {
    setAnswers((prev) => ({ ...prev, ...partial }));
    setSample(false);
    setSent("idle");
    setSentStage(null);
  }

  function flip(key: keyof Toggles) {
    setPinned({ ...toggles, [key]: !toggles[key] });
    setSample(false);
    setSent("idle");
    setSentStage(null);
  }

  function applyFollow(partial: Partial<Answers>) {
    setAnswers((prev) => {
      const add = partial.uses ?? [];
      const rest = { ...partial };
      delete rest.uses;
      const uses = add.length ? (Array.from(new Set([...prev.uses, ...add])) as UseId[]) : prev.uses;
      return { ...prev, ...rest, uses };
    });
    setPinned(null);
    setSample(false);
    setSent("idle");
    setSentStage(null);
    setSheet(null);
  }

  function openFact(key: FactKey) {
    setSheet(key);
    setOpened((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }

  function stageSent(stage: "mid" | "final"): "idle" | "sending" | "saved" | "failed" {
    return sentStage === stage ? sent : "idle";
  }

  async function send(stage: "mid" | "final") {
    if (!result || !sessionId) return;
    setSent("sending");
    setSentStage(stage);
    const bag: SessionBag = {
      clientSession: sessionId,
      stage,
      barrier: result.answers.barrier,
      carClass: result.answers.carClass,
      fuel: result.answers.fuel,
      uses: result.answers.uses,
      kmBand: result.answers.km,
      parking: result.answers.parking,
      workAccess: result.answers.workAccess,
      tripFreq: result.answers.tripFreq,
      usedStance: result.answers.usedStance,
      costSting: result.answers.costSting,
      mobileInterest: result.answers.mobileInterest,
      worry: result.answers.worry,
      unclear: gap,
      openedFacts: opened,
      persona: result.persona.id,
      personaProbability: result.persona.probability,
      toggles: result.toggles,
      annualKeep: result.annualKeep,
      annualSwap: result.annualSwap,
      cash: result.cash,
      saving: result.saving,
      paybackYears: result.paybackYears,
      withinHorizon: result.withinHorizon,
      homeOfficial: result.homeOfficial,
      canton: cantonRate ? canton : null,
      homeGrain,
      listPrice: result.answers.listPrice ?? null,
      resalePrice: result.answers.resalePrice ?? null,
      keepYears: result.answers.keepYears ?? null,
      mixHome: result.answers.mix?.home ?? null,
      mixWork: result.answers.mix?.work ?? null,
      mixPublic: result.answers.mix?.public ?? null,
      litres: result.answers.litres ?? null,
      gearQuote: result.answers.gearQuote ?? null,
      rentDays: result.answers.rentDays ?? null,
      fromSample,
      datasetVersion,
    };
    try {
      await sendSession({ data: bag });
      setSent("saved");
    } catch {
      setSent("failed");
    }
  }

  const autoKey =
    step === "result" && result && sessionId && hydrated && !sample
      ? [
          result.annualKeep,
          result.annualSwap,
          result.paybackYears,
          result.canton ?? "",
          result.homeOfficial ? "1" : "0",
          opened.join(","),
          JSON.stringify(result.toggles),
          JSON.stringify(result.answers),
          gap ?? "",
        ].join("|")
      : "";

  useEffect(() => {
    if (!autoKey) return;
    const t = window.setTimeout(() => {
      void send("final");
    }, 700);
    return () => window.clearTimeout(t);
  }, [autoKey]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [step]);

  const soFar = showSoFar && result ? <SoFar result={result} step={step} /> : null;

  let body: ReactNode = null;
  if (step === "barrier") {
    body = (
      <BarrierStep
        value={answers.barrier}
        onPick={(id) => patch({ barrier: id, uses: usesForBarrier(id) }, "parking")}
        onSample={showSample}
        onFact={openFact}
      />
    );
  } else if (step === "parking") {
    body = (
      <Single
        step={step}
        title="Where does the car sleep?"
        hint="The next screen shows a payback: years until the extra money to switch is covered by a lower cost to run. Until you correct the car, it uses a typical one."
        options={PARKING}
        value={answers.parking}
        notes={[
          { optionId: "shared", fact: "tenant-right", label: "What a tenant can ask, today" },
          { optionId: "shared", fact: "mobile-charger", label: "Read about a mobile charger" },
          { optionId: "none", fact: "tenant-right", label: "If there is no bay with the home" },
          { optionId: "none", fact: "mobile-charger", label: "Read about charging without a bay" },
        ]}
        onFact={openFact}
        onPick={(id) => patch({ parking: id as Parking }, "class")}
        onBack={() => setStep("barrier")}
      />
    );
  } else if (step === "class") {
    body = (
      <Single
        step={step}
        title="What do you drive now?"
        hint="Class is enough. No number plate."
        options={CLASSES}
        value={answers.carClass}
        onPick={(id) => patch({ carClass: id as CarClass }, "fuel")}
        onBack={() => setStep("parking")}
      />
    );
  } else if (step === "fuel") {
    body = (
      <Single
        step={step}
        title="What does it run on?"
        hint="Already electric means the check looks at size and charging. It does not try to sell you a switch."
        options={FUELS}
        value={answers.fuel}
        onPick={(id) => patch({ fuel: id as Fuel }, "km")}
        onBack={() => setStep("class")}
      />
    );
  } else if (step === "km") {
    body = (
      <Single
        step={step}
        title="About how far in a year?"
        hint="Most people miss the true year, some too high and some far too low. A band is safer than a precise number you do not have. If the service sticker shows last year’s kilometres, use that. A wrong band moves the yearly fuel or power. It does not change the price of the car."
        options={KM_BANDS}
        value={answers.km}
        onPick={(id) => patch({ km: id as KmBand }, "focus")}
        onBack={() => setStep("fuel")}
      />
    );
  } else if (step === "focus" && result) {
    body = (
      <Focus
        answers={answers}
        aha={answersReady(answers) ? result.aha : null}
        onPick={(partial) => patch(partial)}
        onContinue={() => setStep("result")}
        onBack={() => setStep("km")}
        onFact={openFact}
        onSend={() => void send("mid")}
        sent={stageSent("mid")}
      />
    );
  } else if (step === "result" && result) {
    body = (
      <ResultView
        result={result}
        sample={sample}
        openMore={openMore}
        openTrace={openTrace}
        copied={copied}
        sent={stageSent("final")}
        onFlip={flip}
        onToggleMore={() => setOpenMore((v) => !v)}
        onToggleTrace={() => setOpenTrace((v) => !v)}
        onEdit={() => {
          setSample(false);
          setStep("parking");
        }}
        onSampleOff={start}
        onReset={reset}
        onBack={() => setStep("focus")}
        onFact={openFact}
        onUse={(id) => {
          setAnswers((prev) => {
            const has = prev.uses.includes(id);
            const uses = has ? prev.uses.filter((u) => u !== id) : [...prev.uses, id];
            return { ...prev, uses: uses.length > 0 ? uses : ["everyday"] };
          });
          setSample(false);
          setSent("idle");
          setSentStage(null);
        }}
        gap={gap}
        onGap={(id) => {
          setGap(id);
          if (id === "payback") document.getElementById("how-payback")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(planText(result));
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
        onDownload={() => {
          const blob = new Blob([JSON.stringify(researchRecord(result, sessionId || "local", opened, datasetVersion), null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "bev-navigator-record.json";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }}
        onSend={() => void send("final")}
        canton={canton}
        cantonState={cantonState}
        onCanton={(code) => void pickCanton(code)}
        onAdjust={adjust}
        onPostcode={usePostcode}
        grain={homeGrain}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto grid min-h-dvh w-full max-w-5xl grid-cols-[minmax(0,1fr)] md:w-fit md:grid-cols-[16rem_28rem] md:gap-10 md:px-6">
        <aside className="hidden md:flex md:flex-col md:justify-start md:pt-16">
          <p className="text-xs font-medium tracking-widest text-spruce uppercase">n8n · five nodes</p>
          <p className="font-serif mt-3 text-3xl leading-tight">The same path the workflow will run.</p>
          <ol className="mt-6">
            {NODES.map((node, i) => {
              const on = i === railIndex(step, sentStage === "final");
              return (
                <li key={node.name} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span
                      className={`grid h-7 w-7 place-items-center rounded-full text-xs font-medium ${
                        on ? "bg-spruce text-spruce-ink" : "border border-line bg-card text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {i < NODES.length - 1 ? <span className="mt-1 h-8 w-px bg-line" /> : null}
                  </span>
                  <span className="min-w-0 pb-4">
                    <span className="block text-sm font-medium">
                      {node.name}
                      <span className="font-normal text-muted"> · {node.engine}</span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-muted">{node.line}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>
        <div className="relative flex h-dvh flex-col bg-sheet md:my-6 md:h-auto md:max-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-3rem)] md:rounded-3xl md:border md:border-line">
          <div ref={scroller} className="safe-pad flex min-h-0 flex-1 flex-col overflow-y-auto">{body}</div>
          {soFar}
          {sheet ? (
            <FactSheet
              factKey={sheet}
              facts={facts}
              onClose={() => setSheet(null)}
              onLoad={() => {
                if (!facts) void loadFacts().then(setFacts).catch(() => setFacts(Object.values(FACTS)));
              }}
              onFollow={applyFollow}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function answersReady(a: Answers): boolean {
  const focus = focusKind(a);
  if (focus === "work") return a.workAccess != null;
  if (focus === "trips") return a.uses.includes("towing") || a.tripFreq != null;
  if (focus === "trust") return a.usedStance != null;
  return a.costSting != null;
}

function Header({
  step,
  onBack,
  planSent = false,
}: {
  step: Step;
  onBack?: () => void;
  planSent?: boolean;
}) {
  const index = FLOW.indexOf(step);
  // One segment per question. The result fills the whole bar. The five-node rail stays on the desktop side panel only.
  const filled = step === "result" ? FLOW.length : index + 1;
  void planSent;
  return (
    <header className="sticky top-0 z-10 bg-sheet px-5 pt-4 pb-3">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-card"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-11 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            {KICKER[step]}
            {index >= 0 ? ` · ${index + 1} of ${FLOW.length}` : ""}
          </p>
          <ol className="mt-2 flex gap-1" aria-label={`Step ${Math.min(filled, FLOW.length)} of ${FLOW.length}`}>
            {FLOW.map((name, i) => (
              <li key={name} className="min-w-0 flex-1" aria-current={i === filled - 1 ? "step" : undefined}>
                <span className={`block h-1 rounded-full ${i < filled ? "bg-spruce" : "bg-line"}`} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </header>
  );
}

function railIndex(step: Step, planSent: boolean): number {
  if (step === "result") return planSent ? 4 : 3;
  if (step === "focus") return 2;
  if (step === "class" || step === "fuel" || step === "km") return 1;
  return 0;
}

function BarrierStep({
  value,
  onPick,
  onSample,
  onFact,
}: {
  value: Barrier | null;
  onPick: (id: Barrier) => void;
  onSample: () => void;
  onFact: (fact: FactKey) => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Header step="barrier" />
      <div className="flex flex-1 flex-col px-5 pt-2 pb-6">
        <h1 className="font-serif text-[1.7rem] leading-tight">Would an electric car already work for an ordinary week?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tap what would still stop you. Six taps, about a minute, nothing typed. Keeping your car is a fair ending.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {BARRIERS.map((opt) => (
            <Choice key={opt.id} title={opt.title} detail={opt.detail} selected={value === opt.id} onClick={() => onPick(opt.id)} />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
          <button type="button" onClick={onSample} className="min-h-11 text-sm font-medium text-spruce">
            See a worked example
          </button>
          <button type="button" onClick={() => onFact("two-for-one")} className="min-h-11 text-sm font-medium text-spruce">
            The 2:1 idea
          </button>
          <button type="button" onClick={() => onFact("battery")} className="min-h-11 text-sm font-medium text-spruce">
            Battery certificates
          </button>
        </div>
      </div>
    </div>
  );
}

const LEVER_PHRASE: Record<LeverKey, string> = {
  used: "a used car with a checked battery",
  rightSize: "one class down, with the rare days rented",
  work: "charging at work",
  home: "charging where the car sleeps",
  publicPlan: "a public charging plan",
  tariff: "a cheaper home tariff",
  pv: "solar on the roof",
};

function WhatWouldHaveToBeTrue({ result, onTry }: { result: Result; onTry: (key: keyof Toggles) => void }) {
  const c: Counterfactual = wouldHaveToBeTrue(result);
  if (c.kind === "none") return null;
  const year = (n: number) => `year ${Math.ceil(n)}`;
  const lever = c.kind === "covered" ? null : c.best;
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-medium">What would have to be true</h2>
      {c.kind === "covered" ? (
        <p className="mt-2 text-sm leading-relaxed">
          The extra price could be {chf(c.room)} higher before the covering year passes {c.window}. That is the room this case has, on placeholder prices.
        </p>
      ) : c.kind === "no-saving" ? (
        <p className="mt-2 text-sm leading-relaxed">
          On these figures the electric car does not cost less to run, so no purchase price makes the extra money come back.
          {lever ? ` Only a change in how it is charged or bought could: ${LEVER_PHRASE[lever.key]}.` : " Nothing in the switches below changes that."} Keeping the car is a complete answer.
        </p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed">
          For the extra price to be covered within {c.window} years, one of two things would have to change: the extra price would have to be {chf(c.extraPriceMustFall)} lower, or the saving {chf(c.yearlySavingMustRise)} a year higher.
          {lever
            ? ` The switch here that moves it most is ${LEVER_PHRASE[lever.key]}: ${year(result.paybackYears ?? 0)} becomes ${year(lever.paybackAfter)}${lever.reaches ? `, inside ${c.window} years` : `, still past ${c.window}`}.`
            : " None of the switches below moves it."}{" "}
          Keeping the car is a complete answer.
        </p>
      )}
      {lever ? (
        <button type="button" onClick={() => onTry(lever.key)} className="mt-3 min-h-11 rounded-full border border-line bg-sheet px-4 text-sm font-medium">
          Try it: {LEVER_PHRASE[lever.key]}
        </button>
      ) : null}
    </section>
  );
}

async function shareOrCopy(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

function ActionBar({ onShare, onChange, onDetails, note }: { onShare: () => void; onChange: () => void; onDetails: () => void; note: string | null }) {
  const cls = "min-h-11 min-w-0 flex-1 rounded-full border border-line bg-card px-2 text-sm font-medium";
  return (
    <div className="sticky bottom-0 z-10 border-t border-line bg-sheet px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {note ? <p role="status" className="pb-1 text-center text-xs text-muted">{note}</p> : null}
      <div className="flex gap-2">
        <button type="button" onClick={onShare} className={cls}>
          Share
        </button>
        <button type="button" onClick={onChange} className={cls}>
          Adjust
        </button>
        <button type="button" onClick={onDetails} className={cls}>
          Details
        </button>
      </div>
    </div>
  );
}

function Fold({ id, title, line, open, onToggle, children }: { id: string; title: string; line: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section id={id}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-medium">{title}</span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">{line}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="mt-4 flex flex-col gap-4">{children}</div> : null}
    </section>
  );
}

function NoteButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-1 min-h-11 px-1 text-left text-sm font-medium text-spruce">
      {label}
    </button>
  );
}


function Single({
  step,
  title,
  hint,
  options,
  value,
  notes,
  onFact,
  onPick,
  onBack,
}: {
  step: Step;
  title: string;
  hint: string;
  options: { id: string; title: string; detail?: string }[];
  value: string | null;
  notes?: { optionId: string; fact: FactKey; label: string }[];
  onFact?: (fact: FactKey) => void;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Header step={step} onBack={onBack} />
      <div className="flex flex-1 flex-col px-5 pt-2 pb-6">
        <h1 className="font-serif text-3xl leading-tight">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>
        <div className="mt-5 flex flex-col gap-2">
          {options.map((opt) => {
            const matched = notes?.filter((n) => n.optionId === opt.id) ?? [];
            return (
              <div key={opt.id}>
                <Choice title={opt.title} detail={opt.detail} selected={value === opt.id} onClick={() => onPick(opt.id)} />
                {matched.map((note) =>
                  onFact ? <NoteButton key={note.fact} label={note.label} onClick={() => onFact(note.fact)} /> : null,
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Choice({
  title,
  detail,
  selected,
  onClick,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-14 w-full rounded-2xl border px-4 py-3 text-left transition-colors duration-200 ${
        selected ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card text-ink"
      }`}
    >
      <span className="block text-base font-medium">{title}</span>
      {detail ? (
        <span className={`mt-0.5 block text-sm leading-snug ${selected ? "text-spruce-ink" : "text-muted"}`}>{detail}</span>
      ) : null}
    </button>
  );
}


function Focus({
  answers,
  aha,
  onPick,
  onContinue,
  onBack,
  onFact,
  onSend,
  sent,
}: {
  answers: Answers;
  aha: string | null;
  onPick: (partial: Partial<Answers>) => void;
  onContinue: () => void;
  onBack: () => void;
  onFact: (fact: FactKey) => void;
  onSend: () => void;
  sent: "idle" | "sending" | "saved" | "failed";
}) {
  const kind = focusKind(answers);
  const spec = focusSpec(kind, answers);
  const ready = answersReady(answers);
  const note = kind === "trips" ? "two-for-one" : kind === "trust" ? "battery" : kind === "work" ? "workplace" : null;
  return (
    <div className="flex flex-1 flex-col">
      <Header step="focus" onBack={onBack} />
      <div className="flex flex-1 flex-col px-5 pt-2 pb-6">
        <h1 className="font-serif text-3xl leading-tight">{spec.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{spec.hint}</p>
        {note ? <NoteButton label="Read the short note" onClick={() => onFact(note)} /> : null}
        <div className="mt-5 flex flex-col gap-2">
          {spec.options.map((opt) => (
            <Choice key={opt.id} title={opt.title} detail={opt.detail} selected={spec.value === opt.id} onClick={() => onPick(opt.patch)} />
          ))}
        </div>
        {ready && aha ? (
          <div className="mt-4 rounded-2xl bg-amber px-4 py-3 text-sm leading-relaxed text-amber-ink">{aha}</div>
        ) : null}
        <button
          type="button"
          disabled={!ready}
          onClick={onContinue}
          className="mt-6 h-12 rounded-full bg-spruce font-medium text-spruce-ink disabled:opacity-40"
        >
          See the numbers
        </button>
        <button type="button" onClick={onSend} className="mt-3 text-sm text-muted">
          {sent === "saved" ? "Anonymous snapshot sent" : sent === "sending" ? "Sending…" : "Send these taps, anonymously"}
        </button>
      </div>
    </div>
  );
}

function focusSpec(kind: ReturnType<typeof focusKind>, answers: Answers) {
  if (kind === "work") {
    const options: { id: WorkAccess; title: string; detail: string; patch: Partial<Answers> }[] = [
      { id: "yes", title: "Yes, I can charge at work", detail: "A normal week, not a one-off favour.", patch: { workAccess: "yes" } },
      { id: "ask", title: "I can ask", detail: "It is not a no until someone has said no.", patch: { workAccess: "ask" } },
      { id: "no", title: "No", detail: "Then home or the public network has to carry the week.", patch: { workAccess: "no" } },
    ];
    return {
      title: "Could the car charge at work?",
      hint: "For a lot of people this covers more kilometres than a wallbox that does not exist yet.",
      options,
      value: answers.workAccess,
    };
  }
  if (kind === "trips") {
    if (answers.uses.includes("towing")) {
      return {
        title: "Towing stays in the case.",
        hint: "A smaller car will not be offered as a substitute. The prices respect that.",
        options: [
          {
            id: "often" as TripFreq,
            title: "Understood — keep this class",
            detail: "You can still see what charging does to the year cost.",
            patch: { tripFreq: "often" as TripFreq },
          },
        ],
        value: answers.tripFreq,
      };
    }
    const options: { id: TripFreq; title: string; detail: string; patch: Partial<Answers> }[] = [
      { id: "rare", title: "Rarely", detail: "Less than once a year.", patch: { tripFreq: "rare" } },
      { id: "yearly", title: "About once a year", detail: "The holiday, not the Tuesday.", patch: { tripFreq: "yearly" } },
      { id: "often", title: "Several times a year", detail: "Then a larger battery can be a real need.", patch: { tripFreq: "often" } },
    ];
    return {
      title: "How often is the long trip?",
      hint: "The trip you worry about often weighs more than the kilometres you actually drive.",
      options,
      value: answers.tripFreq,
    };
  }
  if (kind === "trust") {
    const options: { id: UsedStance; title: string; detail: string; patch: Partial<Answers> }[] = [
      { id: "yes", title: "Yes, if the battery is certified", detail: "A written health check, not a seller’s word.", patch: { usedStance: "yes" } },
      { id: "new", title: "Only if it is new", detail: "You pay to avoid the unknown.", patch: { usedStance: "new" } },
      { id: "no", title: "I do not want a used electric car", detail: "Then the cash figure stays high. That is allowed.", patch: { usedStance: "no" } },
    ];
    return {
      title: "Would a used car be acceptable?",
      hint: "This is the difference between a rumour and a number.",
      options,
      value: answers.usedStance,
    };
  }
  const options: { id: CostSting; title: string; detail: string; patch: Partial<Answers> }[] = [
    { id: "price", title: "The purchase price", detail: "Writing the cheque, or the value falling after.", patch: { costSting: "price" } },
    { id: "month", title: "What it costs each month", detail: "Fuel, power, insurance, tax, tyres.", patch: { costSting: "month" } },
    { id: "both", title: "Both", detail: "Honest. They pull in different directions.", patch: { costSting: "both" } },
  ];
  return {
    title: "What stings more?",
    hint: "The purchase price starts the case with a used car. The other two change the wording, not the francs. Every switch stays yours.",
    options,
    value: answers.costSting,
  };
}

function ResultView({
  result,
  sample,
  openMore,
  openTrace,
  copied,
  onFlip,
  onToggleMore,
  onToggleTrace,
  onEdit,
  onSampleOff,
  onReset,
  onBack,
  onCopy,
  onDownload,
  onFact,
  onUse,
  onSend,
  onGap,
  gap,
  sent,
  canton,
  cantonState,
  onCanton,
  onAdjust,
  onPostcode,
  grain,
}: {
  result: Result;
  sample: boolean;
  openMore: boolean;
  openTrace: boolean;
  copied: boolean;
  sent: "idle" | "sending" | "saved" | "failed";
  onFlip: (key: keyof Toggles) => void;
  onToggleMore: () => void;
  onToggleTrace: () => void;
  onEdit: () => void;
  onSampleOff: () => void;
  onReset: () => void;
  onBack: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onFact: (fact: FactKey) => void;
  onUse: (id: UseId) => void;
  onSend: () => void;
  onGap: (id: Gap) => void;
  gap: Gap | null;
  canton: string | null;
  cantonState: "idle" | "loading" | "failed";
  onCanton: (code: string | null) => void;
  onAdjust: (partial: Partial<Answers>) => void;
  onPostcode: (plz: string) => Promise<void>;
  grain: "municipality" | null;
}) {
  const [climateOpen, setClimateOpen] = useState(false);
  // Two closed folds hold the reasoning and the evidence. The decision, the next steps and the levers stay on the page.
  const [folds, setFolds] = useState({ why: false, evidence: false });
  const [barNote, setBarNote] = useState<string | null>(null);
  useEffect(() => {
    if (gap !== "payback") return;
    setFolds((f) => ({ ...f, why: true }));
    const id = window.setTimeout(() => document.getElementById("how-payback")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return () => window.clearTimeout(id);
  }, [gap]);
  const home = homeCopy(result.answers.parking);
  const primary: { key: keyof Toggles; title: string; hint: string }[] = [
    { key: "home", title: home.title, hint: home.hint },
    { key: "work", title: "Charging at work", hint: "Counts a share of kilometres at an illustrative staff rate. Not free power." },
    { key: "used", title: "Used car, battery checked", hint: "A lower purchase price, plus a certificate. Placeholder prices." },
    { key: "rightSize", title: "Smaller car, book the exception", hint: "The 2:1 idea: own the car for ordinary days, rent the rare ones." },
  ];
  const more: { key: keyof Toggles; title: string; hint: string }[] = [
    { key: "publicPlan", title: "A public charging plan", hint: "Lowers the public rate. Still a placeholder, not a network tariff." },
    { key: "tariff", title: "A cheaper home tariff", hint: "Only matters for the home share of charging." },
    { key: "pv", title: "Solar covers part of home charging", hint: "Only if the roof is already there. An illustrative share of home charging at a lower rate. Not the cost of the panels, and not a federal solar grant." },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Header step="result" onBack={onBack} planSent={sent === "saved"} />
      <div className="flex flex-col gap-4 px-5 pt-2 pb-8">
        {sample ? (
          <div className="rounded-2xl bg-moss px-4 py-3 text-sm leading-relaxed text-moss-ink">
            Sample case: compact diesel, about 14,000 km, shared garage, able to ask at work. Not your life.
            <button type="button" onClick={onSampleOff} className="mt-2 block font-medium underline">
              Start with mine
            </button>
          </div>
        ) : null}

        <div>
          <h1 className="font-serif text-3xl leading-tight">{result.headline}</h1>
          <p className="mt-3 text-base leading-relaxed whitespace-pre-line">{result.verdict}</p>
          {sample ? null : (
            <p className="mt-3 text-sm leading-relaxed text-muted">Opening this page stores an anonymous session. No name, and no postcode.</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Keep it</p>
              <p className="font-serif mt-2 text-2xl tabular-nums leading-none">{chf(result.annualKeep)}</p>
              <p className="mt-1 text-sm text-muted">a year, on these figures</p>
            </div>
            <div className="rounded-2xl border border-line bg-card p-3">
              <p className="text-xs font-medium tracking-widest text-muted uppercase">Switch</p>
              <p className="font-serif mt-2 text-2xl tabular-nums leading-none">{chf(result.annualSwap)}</p>
              <p className="mt-1 text-sm text-muted">a year, plus {chf(result.cash)} at the start</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-line bg-card p-3">
            <p className="text-xs text-muted">Left is thousand francs. Along the bottom, the year.</p>
            <div className="mt-2 flex gap-5 text-sm text-ink">
              <span className="flex items-center gap-2">
                <span className="w-8 border-t-2 border-dashed border-ink" />
                Keep
              </span>
              <span className="flex items-center gap-2">
                <span className="h-[3px] w-8 rounded-full bg-spruce" />
                Switch
              </span>
            </div>
            <CostChart data={result.series} />
            <p className="mt-2 text-xs text-muted">How long you would keep the next car. The title follows this. The payback year does not.</p>
            <div className="mt-1 flex gap-1.5">
              {([8, 12, 16, 24, 32] as const).map((years) => {
                const on = (result.answers.keepYears ?? 8) === years;
                return (
                  <button
                    key={years}
                    type="button"
                    onClick={() => onAdjust({ keepYears: years === 8 ? null : years })}
                    className={`min-w-0 flex-1 rounded-full border px-1 py-1.5 text-sm ${on ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
                  >
                    {years}
                    {years === 8 ? <span className="block text-[10px] leading-none font-normal">study</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                aria-pressed={!result.toggles.used}
                onClick={() => {
                  if (result.answers.listPrice != null) onAdjust({ listPrice: null });
                  if (result.toggles.used) onFlip("used");
                }}
                className={`min-w-0 flex-1 rounded-full border px-2 py-1.5 text-sm ${result.toggles.used ? "border-line bg-sheet" : "border-spruce bg-spruce text-spruce-ink"}`}
              >
                New
              </button>
              <button
                type="button"
                aria-pressed={result.toggles.used}
                onClick={() => {
                  if (result.answers.listPrice != null) onAdjust({ listPrice: null });
                  if (!result.toggles.used) onFlip("used");
                }}
                className={`min-w-0 flex-1 rounded-full border px-2 py-1.5 text-sm ${result.toggles.used ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
              >
                Used
              </button>
              <button
                type="button"
                aria-pressed={result.toggles.rightSize}
                aria-disabled={result.answers.uses.includes("towing") || result.iceClass === "small"}
                onClick={() => {
                  if (!result.answers.uses.includes("towing") && result.iceClass !== "small") onFlip("rightSize");
                }}
                className={`min-w-0 flex-1 rounded-full border px-2 py-1.5 text-sm ${
                  result.answers.uses.includes("towing") || result.iceClass === "small"
                    ? "border-line bg-sheet text-muted"
                    : result.toggles.rightSize
                      ? "border-spruce bg-spruce text-spruce-ink"
                      : "border-line bg-sheet"
                }`}
              >
                One class down
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {result.answers.uses.includes("towing")
                ? "New or used, same class. One class down stays off: a few rental days do not replace towing."
                : result.iceClass === "small"
                  ? "New or used, same class. One class down stays off: a small city car has no class below it."
                  : result.toggles.rightSize
                  ? "One class down: a smaller car, and the rare days are rented. It can sit on new or used."
                  : "New or used, same class. One class down is a smaller car. The rare days are rented."}
            </p>
            <a className="mt-2 inline-block text-sm font-medium text-spruce underline" href={SOURCES["tco-2023"].url} target="_blank" rel="noopener noreferrer">
              {SOURCES["tco-2023"].title}, {SOURCES["tco-2023"].published}
            </a>
          </div>
          <button
            type="button"
            aria-expanded={climateOpen}
            onClick={() => setClimateOpen((v) => !v)}
            className="text-left text-sm font-medium text-spruce"
          >
            {climateOpen ? "Hide the climate comparison" : "Climate, if you want the comparison"}
          </button>
          {climateOpen ? <ClimateLine alreadyElectric={result.answers.fuel === "electric"} /> : null}
          <p className="mt-3 text-sm leading-relaxed">
            <span className="font-medium">{paybackTitle(result)}.</span>{" "}
            {result.paybackYears == null || result.saving <= 40
              ? "The green line never comes down to the dashed one. Running it does not cost less."
              : result.withinHorizon
                ? "The green line starts higher, then crosses the dashed one. That crossing is the payback. Nobody sends you the difference."
                : "The green line is still above the dashed one at the right edge. The crossing is later than this picture."}
          </p>
        </div>

        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-medium">What is still open</h2>
          <p className="mt-2 text-sm leading-relaxed">
            You named “{labelBarrier(result.answers.barrier ?? "unsure")}”.{" "}
            {result.steps[0]
              ? `${result.steps[0].title}. ${result.steps[0].detail}`
              : "Nothing further is priced until a switch or a figure above changes."}
          </p>
        </section>

        <WhatWouldHaveToBeTrue result={result} onTry={onFlip} />

        <section>
          <h2 className="font-medium">Next steps</h2>
          <ol className="mt-3 space-y-3">
            {result.steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-card px-4 py-3">
                <p className="text-xs font-medium tracking-widest text-muted uppercase">Step {i + 1}</p>
                <p className="mt-1 font-medium">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{s.detail}</p>
                {s.lines ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                    {s.lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ) : null}
                {s.lines ? (
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(s.lines!.join("\n"))}
                    className="mt-2 text-sm font-medium text-spruce"
                  >
                    Copy the list
                  </button>
                ) : null}
                {s.link ? (
                  <a className="mt-2 block text-sm font-medium text-spruce underline" href={s.link.href} target="_blank" rel="noopener noreferrer">
                    {s.link.name}
                  </a>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section id="levers">
          <h2 className="font-medium">See what changes the number</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Each switch recalculates immediately. A page is shown only when it matches this case. The prices are placeholders, not a quote and not an offer.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                result.answers.barrier === "trips" ||
                result.toggles.rightSize ||
                result.answers.uses.includes("holiday") ||
                result.answers.uses.includes("long")
                  ? { fact: "two-for-one" as const, label: "Read 2:1" }
                  : null,
                result.answers.barrier === "charging" ||
                result.answers.parking === "shared" ||
                result.answers.parking === "none" ||
                result.answers.parking === "unsure"
                  ? { fact: "mobile-charger" as const, label: "Read mobile charger" }
                  : null,
                result.answers.barrier === "trust" || result.toggles.used || result.answers.usedStance === "yes"
                  ? { fact: "battery" as const, label: "Read battery check" }
                  : null,
                result.answers.barrier === "cost" || result.answers.barrier === "unsure" || !result.withinHorizon
                  ? { fact: "public-tariff" as const, label: "Why prices are not live" }
                  : null,
                !result.canton ? { fact: "canton-tax" as const, label: "Why the tax is not your canton" } : null,
                result.answers.parking === "house" || result.answers.parking === "own" || result.toggles.pv
                  ? { fact: "local-grant" as const, label: "Grants and a solar roof" }
                  : null,
              ].filter((item) => item != null)
                .slice(0, 3)
            ).map((item) => (
              <button key={item.fact} type="button" onClick={() => onFact(item.fact)} className="rounded-full border border-line bg-card px-3 py-2 text-sm">
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {USES.map((u) => {
              const on = result.answers.uses.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onUse(u.id)}
                  className={`rounded-full border px-3 py-2 text-sm ${on ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
                >
                  {u.title}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {primary.map((row) => (
              <ToggleRow key={row.key} row={row} on={result.toggles[row.key]} result={result} onFlip={onFlip} />
            ))}
          </div>
          {result.towingBlocked ? (
            <p className="mt-3 rounded-2xl bg-moss px-4 py-3 text-sm leading-relaxed text-moss-ink">
              Towing is on, so the smaller car was not applied. Renting a few days does not replace a tow car.
            </p>
          ) : null}
          <button type="button" onClick={onToggleMore} className="mt-3 flex min-h-11 w-full items-center justify-between text-sm font-medium" aria-expanded={openMore}>
            Finer assumptions
            <ChevronDown className={`h-4 w-4 transition-transform ${openMore ? "rotate-180" : ""}`} />
          </button>
          {openMore ? (
            <div className="mt-2 flex flex-col gap-2">
              {more.map((row) => (
                <ToggleRow key={row.key} row={row} on={result.toggles[row.key]} result={result} onFlip={onFlip} />
              ))}
            </div>
          ) : null}
        </section>

        <button type="button" onClick={onEdit} className="rounded-2xl border border-line bg-card px-4 py-3 text-left">
          <span className="block text-xs font-medium tracking-widest text-muted uppercase">This case</span>
          <span className="mt-1 block text-sm">
            {labelClass(result.iceClass)} · {labelFuel(result.answers.fuel ?? "petrol")} · {kmPhrase(result.answers.km, result.km, result.kmSource === "default" ? result.persona.title : undefined)} ·{" "}
            {parkPhrase(result.answers.parking)}
          </span>
          <span className="mt-1 block text-sm font-medium text-spruce">Edit answers</span>
        </button>

        <ShareNote result={result} />

        <Fold
          id="why"
          title="Why this result"
          line="The payback sum, what the year is made of, where the electric kilometres charge, and the worries the francs do not close."
          open={folds.why}
          onToggle={() => setFolds((f) => ({ ...f, why: !f.why }))}
        >
        <section id="how-payback" className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-medium">What the payback year is for</h2>
          {result.paybackYears == null || result.saving <= 40 ? (
            <p className="mt-2 text-sm leading-relaxed">
              Payback is the extra price of switching, divided by how much less the electric car costs to run each year. It is how long you must keep the car before you are not poorer for having switched. On these figures there is no such year. Running it does not cost less, so the extra price is never covered. Keeping the car is a fair result.
            </p>
          ) : (
            <>
              <p className="font-serif mt-3 text-2xl leading-snug tabular-nums">
                {chf(result.cash)} extra
                <span className="px-1 text-muted">÷</span>
                {chf(result.saving)} a year
              </p>
              <p className="mt-1 text-sm text-muted">That is {paybackTitle(result).toLowerCase()}.</p>
              <p className="mt-3 text-sm leading-relaxed">
                {result.paybackYears < 1
                  ? "There is no wait. On these figures the switch does not cost more up front, so the only benefit left is the cheaper year, and only while you keep the car. Nobody sends you that difference."
                  : `If you still own the car at ${paybackTitle(result).toLowerCase()}, the cheaper running has covered the extra price. Each year after that, you simply spend about ${chf(result.saving)} less. If you sell or give it up before then, you have paid more in total than if you had kept this car. Nobody sends you the difference.`}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {result.paybackYears <= 8
                  ? "Eight years is not a reward. It is the time a federal cost study, in March 2023, used for a newly bought car. This case falls inside that window, so a hold of that length would see the crossing."
                  : `Eight years is not a failing grade. It is the time a federal cost study, in March 2023, used for a newly bought car. This case needs about ${Math.ceil(result.paybackYears)} years, so that window is too short. A used or smaller car is what moves the year. Keeping yours is still a fair result.`}
              </p>
              <SourceCards ids={["tco-2023", "tco-2023-report"]} />
            </>
          )}
          {result.paybackYears == null || result.saving <= 40 ? <SourceCards ids={["tco-2023", "tco-2023-report"]} /> : null}
        </section>

        <YearSplit parts={result.parts} cash={result.cash} />
        <ChargeMix blend={result.blend} homeOfficial={result.homeOfficial} place={result.official?.place ?? null} />

        <div className="rounded-2xl bg-amber px-4 py-3 text-sm leading-relaxed text-amber-ink">{result.aha}</div>

        <section>
          <h2 className="font-medium">If the number is not the whole worry</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            These are not priced, and they do not talk you into a car. Each page says what the worry is protecting, what is dated, and what this check will not pretend.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={() => onFact("tenant-right")} className="min-h-12 rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium">
              The building will say no
            </button>
            <button type="button" onClick={() => onFact("winter")} className="min-h-12 rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium">
              Winter, and the trip that is not a Tuesday
            </button>
            <button type="button" onClick={() => onFact("not-for-me")} className="min-h-12 rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium">
              I just do not want one
            </button>
          </div>
        </section>
        </Fold>

        <Fold
          id="evidence"
          title="What went into the number"
          line="Every figure with its tag and source, how it was decided, and the place."
          open={folds.evidence}
          onToggle={() => setFolds((f) => ({ ...f, evidence: !f.evidence }))}
        >
        <section className="rounded-2xl border border-line bg-card">
          <h2 className="px-4 pt-4 font-medium">What went into the number</h2>
          <p className="px-4 pt-1 text-sm leading-relaxed text-muted">You means you tapped it. Default filled a gap and says so. Official is a dated public figure, not your bill. Model means a placeholder. A row with a control can be changed here, and the number updates.</p>
          <ul className="mt-2 divide-y divide-line">
            {result.assumptions.map((row) => (
              <li key={row.label} className="px-4 py-3">
                <AssumptionRow row={row} result={result} onAdjust={onAdjust} onFlip={onFlip} />
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-card">
          <button type="button" onClick={onToggleTrace} className="flex min-h-14 w-full items-center justify-between px-4 text-left" aria-expanded={openTrace}>
            <span>
              <span className="block font-medium">How this was decided</span>
              <span className="mt-0.5 block text-sm text-muted">The sum, then the five steps. No chat.</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openTrace ? "rotate-180" : ""}`} />
          </button>
          {openTrace ? (
            <div className="px-4 pb-4">
              <ul className="space-y-3">
                {result.trace.map((row) => (
                  <li key={row.question}>
                    <p className="text-xs font-medium tracking-widest text-muted uppercase">{row.kind === "choice" ? "Your tap" : row.kind === "yesno" ? "A switch" : "The sum"}</p>
                    <p className="mt-1 text-sm font-medium">{row.question}</p>
                    <p className="mt-1 text-sm">{row.answer}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{row.note}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-2">
                {result.persona.ranked.slice(0, 3).map((p) => (
                  <div key={p.id}>
                    <div className="flex justify-between text-xs text-muted">
                      <span>{p.title}</span>
                      <span className="tabular-nums">{Math.round(p.probability * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-line">
                      <div className="h-full bg-spruce" style={{ width: `${Math.round(p.probability * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Payback is the extra money to switch, divided by how much less the car costs to run each year. The francs in that sum are placeholders until a dated source replaces them. The situation above does not enter the sum.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                The same five steps can later run in n8n. Nothing in n8n runs yet. A TypeSafe node would replace only the situation, and only with a closed choice. It does not write a paragraph and it does not price the car. The price stays in this browser. Reaching this page stores the taps and the numbers. No name, no postcode, no sentence.
              </p>
              <ol className="mt-3 space-y-2 text-sm">
                <li>1 · Form — your taps</li>
                <li>2 · TypeSafe choice — situation, not a recommendation</li>
                <li>3 · Code — payback, in the browser</li>
                <li>4 · Switch — finite options, including 2:1 and a mobile charger</li>
                <li>5 · Postgres — one session bag, no name, no postcode</li>
              </ol>
            </div>
          ) : null}
        </section>

        <LocalPerson
          canton={canton}
          cantonState={cantonState}
          onCanton={onCanton}
          onPostcode={onPostcode}
          place={result.official?.place ?? null}
          grain={grain}
        />
        </Fold>

        <section id="plan" className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-medium">Keep the plan</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {sent === "sending"
              ? "Updating the stored plan…"
              : sent === "failed"
                ? "Not stored. The plan below is still the current case."
                : "Stored. It follows every change on this page. Not a sentence. No name, no postcode."}
          </p>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl bg-sheet p-3 text-sm leading-relaxed">{planText(result)}</pre>
          <div className="mt-4 flex flex-col gap-2">
            {sent === "failed" ? (
              <button type="button" onClick={onSend} className="h-12 rounded-full bg-spruce font-medium text-spruce-ink">
                Try again
              </button>
            ) : null}
            <button type="button" onClick={onDownload} className="flex h-12 items-center justify-center gap-2 rounded-full border border-line bg-sheet font-medium">
              <Download className="h-4 w-4" />
              Download the same record
            </button>
            <button type="button" onClick={onCopy} className="h-12 rounded-full border border-line bg-sheet font-medium">
              {copied ? "Copied" : "Copy the plan as text"}
            </button>
          </div>
        </section>

        <section>
          <h2 className="font-medium">Did something not make sense?</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Tap one. It is stored with the anonymous session. There is no message box and no reply.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                ["km", "The kilometres were a guess"],
                ["payback", "I do not understand payback"],
                ["price", "A price here looks wrong"],
                ["wording", "A sentence was unclear"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={gap === id}
                onClick={() => onGap(id)}
                className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-medium ${gap === id ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {gap === "km" ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">Edit the answers and pick the other band. The yearly cost moves. The price of the car does not.</p>
          ) : null}
          {gap === "payback" ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">The sum is above the chart: extra price divided by the cheaper year. It is not a refund.</p>
          ) : null}
          {gap === "price" ? (
            <button type="button" onClick={() => onFact("public-tariff")} className="mt-3 text-left text-sm font-medium text-spruce">
              Open why these prices are not live
            </button>
          ) : null}
          {gap === "wording" ? (
            <p className="mt-3 text-sm leading-relaxed text-muted">Noted as wording. Nothing here will rephrase itself.</p>
          ) : null}
        </section>

        <p className="text-xs leading-relaxed text-muted">
          Indicative only. Not financial, insurance, tax, or purchase advice. Electricity, vehicle prices, tax, and rental days are labelled placeholders, not live Swiss tariffs or a dealer offer. The climate line is a published comparison of two new cars. It is not calculated for this case, and it does not change the payback. Winter range and data-security comparisons are not calculated here.
        </p>

        <button type="button" onClick={onReset} className="flex h-11 items-center justify-center gap-2 text-sm font-medium text-muted">
          <RotateCcw className="h-4 w-4" />
          Start again
        </button>
      </div>
      <ActionBar
        note={barNote}
        onShare={() =>
          void shareOrCopy(shareText(result)).then((how) => {
            setBarNote(how === "copied" ? "Copied. Paste it where you like." : how === "failed" ? "Could not share from here. Use “Ask someone else” below." : null);
          })
        }
        onChange={() => document.getElementById("levers")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onDetails={() => {
          setFolds({ why: true, evidence: true });
          window.setTimeout(() => document.getElementById("why")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        }}
      />
    </div>
  );
}

function ClimateLine({ alreadyElectric }: { alreadyElectric: boolean }) {
  const src = SOURCES["foen-2023"];
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-medium">Climate, beside the money</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">Greenhouse gases for two new mid-size cars, over the whole life. Not francs, and not your kilometres.</p>
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs text-muted">Index · new petrol = 100 · not francs, not years</p>
        <ClimateChart
          domain={100}
          ticks={[0, 50, 100]}
          data={[
            { name: "New petrol", value: 100, fill: "var(--color-muted)" },
            { name: "New electric", value: 45, fill: "var(--color-spruce)" },
          ]}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {alreadyElectric
          ? "You already drive electric. This is still a new electric car against a new petrol car."
          : "About 55 percent lower on the Swiss consumer mix. About 65 percent lower on renewable electricity. Keeping the car you own is not in the study, so it has no bar here."}
      </p>
      <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-xs text-muted">Same study, a trip of 5 km. Public transport = 1. Not the index above.</p>
        <ClimateChart
          domain={12}
          ticks={[0, 6, 12]}
          height={168}
          data={[
            { name: "Mid-size petrol", value: 12, fill: "var(--color-muted)" },
            { name: "Battery electric", value: 6, fill: "var(--color-spruce)" },
            { name: "Public transport", value: 1, fill: "var(--color-ink)" },
          ]}
        />
        <p className="text-xs leading-relaxed text-muted">
          A bicycle is lower still. In that comparison the petrol car is about 26 times a bicycle, and the electric car about 12 times. A bar that short would not show.
        </p>
      </div>
      <a className="mt-2 inline-block text-sm font-medium text-spruce underline" href={src.url} target="_blank" rel="noopener noreferrer">
        {src.title}, {src.published}
      </a>
    </section>
  );
}

function SourceCards({ ids }: { ids: (keyof typeof SOURCES)[] }) {
  return (
    <ol className="mt-3 flex flex-col gap-2">
      {ids.map((id, index) => {
        const src = SOURCES[id];
        return (
          <li key={id} className="rounded-xl border border-line px-3 py-2">
            <a className="text-sm font-medium text-spruce underline" href={src.url} target="_blank" rel="noopener noreferrer">
              {index + 1}. {src.title}
            </a>
            <p className="mt-0.5 text-sm leading-snug text-muted">
              {src.publisher}. {src.published}. {src.supports} {src.notThis}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function AssumptionRow({
  row,
  result,
  onAdjust,
  onFlip,
}: {
  row: Result["assumptions"][number];
  result: Result;
  onAdjust: (partial: Partial<Answers>) => void;
  onFlip: (key: keyof Toggles) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const mix = result.answers.mix ?? result.blend;
  function moveShare(key: "home" | "work" | "public", dir: number) {
    const keys = ["home", "work", "public"] as const;
    const donor = keys
      .filter((item) => item !== key)
      .sort((a, b) => mix[b] - mix[a])[0]!;
    const step = dir * 0.1;
    const room = dir > 0 ? mix[donor] : mix[key];
    const moved = Math.min(Math.abs(step), room) * Math.sign(step);
    onAdjust({
      mix: {
        ...mix,
        [key]: Math.round((mix[key] + moved) * 10) / 10,
        [donor]: Math.round((mix[donor] - moved) * 10) / 10,
      },
    });
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm">{row.label}</span>
          <span className="mt-0.5 block text-sm text-muted">{row.value}</span>
        </span>
        <span className="shrink-0 rounded-full bg-moss px-2 py-1 text-xs font-medium text-moss-ink">{row.tag}</span>
      </div>
      {row.link ? (
        <a className="mt-1 inline-block text-sm font-medium text-spruce underline" href={row.link.href} target="_blank" rel="noopener noreferrer">
          {row.link.name}
        </a>
      ) : null}
      {row.edit ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-sm font-medium text-spruce">
          {open ? "Close" : "Change this"}
        </button>
      ) : null}
      {open && row.edit === "car" ? (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {CLASSES.map((item) => (
              <button key={item.id} type="button" onClick={() => onAdjust({ carClass: item.id })} className="rounded-full border border-line bg-sheet px-3 py-1.5 text-sm">
                {item.title}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {FUELS.map((item) => (
              <button key={item.id} type="button" onClick={() => onAdjust({ fuel: item.id })} className="rounded-full border border-line bg-sheet px-3 py-1.5 text-sm">
                {item.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {open && row.edit === "km" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {KM_BANDS.map((item) => (
            <button key={item.id} type="button" onClick={() => onAdjust({ km: item.id })} className="rounded-full border border-line bg-sheet px-3 py-1.5 text-sm">
              {item.title}
            </button>
          ))}
        </div>
      ) : null}
      {open && row.edit === "parking" ? (
        <div className="mt-2 flex flex-col gap-2">
          {PARKING.map((item) => (
            <button key={item.id} type="button" onClick={() => onAdjust({ parking: item.id })} className="min-h-11 rounded-2xl border border-line bg-sheet px-3 text-left text-sm">
              {item.title}
            </button>
          ))}
        </div>
      ) : null}
      {open && row.edit === "mix" ? (
        <div className="mt-2 flex flex-col gap-2">
          {(["home", "work", "public"] as const).map((key) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-sm capitalize">{key}</span>
              <span className="flex items-center gap-2">
                <button type="button" onClick={() => moveShare(key, -1)} className="h-9 w-9 rounded-full border border-line" aria-label={`Less ${key}`}>
                  −
                </button>
                <span className="w-10 text-center text-sm tabular-nums">{Math.round(mix[key] * 100)}%</span>
                <button type="button" onClick={() => moveShare(key, 1)} className="h-9 w-9 rounded-full border border-line" aria-label={`More ${key}`}>
                  +
                </button>
              </span>
            </div>
          ))}
          <button type="button" onClick={() => onAdjust({ mix: null })} className="text-left text-sm font-medium text-spruce">
            Back to the model split
          </button>
        </div>
      ) : null}
      {open && (row.edit === "price" || row.edit === "resale") ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const n = Number(draft.replace(/[^\d]/g, ""));
            if (row.edit === "price") onAdjust({ listPrice: Number.isFinite(n) && n > 0 ? n : null });
            else onAdjust({ resalePrice: Number.isFinite(n) && n > 0 ? n : null });
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            inputMode="numeric"
            placeholder={row.edit === "price" ? "Price you saw" : "What yours might sell for"}
            className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-sheet px-3 text-sm"
          />
          <button type="submit" className="h-11 rounded-full border border-line px-3 text-sm font-medium">
            Use it
          </button>
        </form>
      ) : null}
      {open && row.edit === "keep" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {([8, 12, 16, 24, 32] as const).map((years) => (
            <button key={years} type="button" onClick={() => onAdjust({ keepYears: years === 8 ? null : years })} className="rounded-full border border-line bg-sheet px-3 py-1.5 text-sm">
              {years} years{years === 8 ? " · the study" : ""}
            </button>
          ))}
        </div>
      ) : null}
      {open && row.edit === "power" ? (
        <button type="button" onClick={() => document.getElementById("place")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="mt-2 text-left text-sm font-medium text-spruce">
          The home price changes with the place, further down. Work and public have no tariff to type.
        </button>
      ) : null}
      {open && row.edit === "fuelUse" ? (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const n = Number(draft.replace(",", "."));
            onAdjust({ litres: n >= 3 && n <= 14 ? Math.round(n * 10) / 10 : null });
            setDraft("");
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            inputMode="decimal"
            placeholder="Litres per 100 km"
            className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-sheet px-3 text-sm"
          />
          <button type="submit" className="h-11 rounded-full border border-line px-3 text-sm font-medium">
            Use it
          </button>
          <button type="button" onClick={() => onAdjust({ litres: null })} className="text-sm font-medium text-spruce">
            Class figure
          </button>
        </form>
      ) : null}
      {open && row.edit === "gear" ? (
        <div className="mt-2 flex flex-col gap-2">
          <button type="button" onClick={() => onAdjust({ gearQuote: 0 })} className="min-h-11 rounded-2xl border border-line bg-sheet px-3 text-left text-sm">
            None. A socket is already there.
          </button>
          <button type="button" onClick={() => onAdjust({ gearQuote: null })} className="min-h-11 rounded-2xl border border-line bg-sheet px-3 text-left text-sm">
            Leave the placeholder
          </button>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const n = Number(draft.replace(/[^\d]/g, ""));
              if (n >= 0 && n <= 20000) onAdjust({ gearQuote: n });
              setDraft("");
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              inputMode="numeric"
              placeholder="A quote, in francs"
              className="h-11 min-w-0 flex-1 rounded-2xl border border-line bg-sheet px-3 text-sm"
            />
            <button type="submit" className="h-11 rounded-full border border-line px-3 text-sm font-medium">
              Use it
            </button>
          </form>
        </div>
      ) : null}
      {open && row.edit === "days" ? (
        result.towingBlocked || result.iceClass === "small" ? (
          <p className="mt-2 text-sm text-muted">
            {result.towingBlocked ? "Towing is on. A few rental days do not replace that car." : "A small city car has no class below it, so there is nothing smaller to rent around."}
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {([0, 2, 4, 8] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => {
                  onAdjust({ rentDays: days });
                  const want = days > 0;
                  if (result.toggles.rightSize !== want) onFlip("rightSize");
                }}
                className="rounded-full border border-line bg-sheet px-3 py-1.5 text-sm"
              >
                {days === 0 ? "None" : `${days} days`}
              </button>
            ))}
          </div>
        )
      ) : null}
    </div>
  );
}

function YearSplit({ parts, cash }: { parts: Result["parts"]; cash: number }) {
  const [open, setOpen] = useState<string | null>(null);
  const max = Math.max(...parts.flatMap((part) => [part.keep, part.swap]), 1);
  const keepTotal = parts.reduce((sum, part) => sum + part.keep, 0);
  const swapTotal = parts.reduce((sum, part) => sum + part.swap, 0);
  const saved = keepTotal - swapTotal;
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-medium">What the year is made of</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Grey is the car you have. Green is switching. Open a line to see the sum. A link is shown only when the publisher’s own page exists, and that page is not this amount.
      </p>
      <ul className="mt-4 flex flex-col gap-4">
        {parts.map((part) => {
          const shown = open === part.label;
          return (
            <li key={part.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">{part.label}</span>
                <span className="tabular-nums text-muted">
                  {chf(part.keep)}
                  <span className="px-1">→</span>
                  {chf(part.swap)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-muted" style={{ width: `${Math.round((part.keep / max) * 100)}%` }} />
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-spruce" style={{ width: `${Math.round((part.swap / max) * 100)}%` }} />
              </div>
              <button
                type="button"
                aria-expanded={shown}
                onClick={() => setOpen(shown ? null : part.label)}
                className="mt-1.5 flex items-center gap-1 text-sm font-medium text-spruce"
              >
                {shown ? "Hide the sum" : "How this line is made"}
                <ChevronDown className={`h-4 w-4 transition ${shown ? "rotate-180" : ""}`} />
              </button>
              {shown ? (
                <div className="mt-2">
                  <p className="text-sm leading-relaxed text-muted">{part.how}</p>
                  {part.link ? (
                    <a className="mt-2 inline-block text-sm font-medium text-spruce underline" href={part.link.href} target="_blank" rel="noopener noreferrer">
                      {part.link.name}
                    </a>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">The year, added up</span>
          <span className="tabular-nums">
            {chf(keepTotal)}
            <span className="px-1 text-muted">→</span>
            {chf(swapTotal)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed">
          {saved > 40
            ? `Switching costs ${chf(saved)} less to run for a year. That is fuel, insurance, tax, service and any rental days. It is not the price of the car, and nobody sends it to you.`
            : saved < -40
              ? `Switching costs ${chf(-saved)} more to run for a year. There is no yearly saving to set against a purchase.`
              : "The two years are about the same. There is no yearly saving to set against a purchase."}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {cash <= 0
            ? "In this case there is no extra price to cover, so the year above is the whole money difference. A used car, or a smaller one, is what usually does that."
            : `The extra price is ${chf(cash)}. The yearly total is what has to cover it. A used or smaller car lowers that price. It does not change this sum, unless the running cost changes too.`}
        </p>
      </div>
    </section>
  );
}

function shareText(result: Result): string {
  const pay =
    result.paybackYears == null || result.saving <= 40
      ? "There is no payback year. On these figures the switch does not cost less to run."
      : `${paybackTitle(result)}. That is how long the cheaper running takes to cover the extra price. Nobody sends that difference.`;
  const open = labelBarrier(result.answers.barrier ?? "unsure");
  const next = result.steps[0]?.title;
  return [
    "Would an electric car already work for an ordinary week?",
    `Keeping the car: ${chf(result.annualKeep)} a year.`,
    `Switching: ${chf(result.annualSwap)} a year, plus ${chf(result.cash)} at the start.`,
    pay,
    `Still open: ${open}.`,
    next ? `Next: ${next}.` : "",
    "The prices are placeholders. Not a quote, and not an offer.",
  ]
    .filter(Boolean)
    .join("\n");
}

function ShareNote({ result }: { result: Result }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(result);
  return (
    <section>
      <h2 className="font-medium">Ask someone else</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        The note is both years, the money at the start, the worry you named, and the next step. Not where the car sleeps. Nothing is sent until you send it.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center rounded-2xl border border-line bg-card px-4 text-sm font-medium"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            const finish = () => {
              setCopied(true);
            };
            if (typeof navigator !== "undefined" && navigator.share) {
              void navigator.share({ text }).catch((error: unknown) => {
                if (error instanceof DOMException && error.name === "AbortError") return;
                void navigator.clipboard?.writeText(text).then(finish);
              });
              return;
            }
            void navigator.clipboard?.writeText(text).then(finish);
          }}
          className="flex min-h-12 items-center rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium"
        >
          {copied ? "Copied. Paste it where you like." : "Copy the note"}
        </button>
      </div>
    </section>
  );
}

function LocalPerson({
  canton,
  cantonState,
  onCanton,
  onPostcode,
  place,
  grain,
}: {
  canton: string | null;
  cantonState: "idle" | "loading" | "failed";
  onCanton: (code: string | null) => void;
  onPostcode: (plz: string) => Promise<void>;
  place: string | null;
  grain: "municipality" | null;
}) {
  const [open, setOpen] = useState(false);
  const [plz, setPlz] = useState("");
  return (
    <section id="place">
      <h2 className="font-medium">A place, if you want one</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {grain === "municipality" && place
          ? `The home price is the ElCom figure for ${place}. The tax is the TCS figure for the canton, not your registration. The postcode was used for that lookup and is not stored.`
          : place && place !== "Switzerland"
            ? `The home price is now the ElCom mean for ${place}. The tax is the TCS figure for the nearest published car in that canton, not your registration.`
            : "The home price is a Swiss mean. A canton changes the tax and the mean. A postcode gets the commune price, then it is dropped."}
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const digits = plz.trim();
          if (!/^[1-9]\d{3}$/.test(digits)) return;
          void onPostcode(digits).then(() => setPlz(""));
        }}
      >
        <input
          value={plz}
          onChange={(event) => setPlz(event.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          autoComplete="postal-code"
          aria-label="Swiss postcode"
          placeholder="Postcode"
          className="h-12 w-28 rounded-2xl border border-line bg-card px-3 text-sm"
        />
        <button type="submit" className="h-12 rounded-full border border-line bg-card px-4 text-sm font-medium">
          Use it once
        </button>
      </form>
      <p className="mt-2 text-sm leading-relaxed text-muted">A name is not asked. It would make the row a person, and it does not change the francs.</p>
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onCanton(null);
          }}
          className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-medium ${canton == null ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
        >
          Keep the Swiss mean
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-medium ${canton ? "border-spruce bg-card" : "border-line bg-card"}`}
        >
          {canton ? CANTONS.find((row) => row.code === canton)?.name ?? canton : "Or pick a canton"}
        </button>
      </div>
      {cantonState === "loading" ? <p className="mt-2 text-sm text-muted">Reading the ElCom price…</p> : null}
      {cantonState === "failed" ? <p className="mt-2 text-sm text-muted">That place did not come back. The Swiss mean stays.</p> : null}
      {open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {CANTONS.map((row) => (
            <button
              key={row.code}
              type="button"
              onClick={() => {
                setOpen(false);
                onCanton(row.code);
              }}
              className={`rounded-full border px-3 py-2 text-sm ${canton === row.code ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
            >
              {row.code}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <a href={OUT.energyAdvice} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-line bg-card px-4 py-3">
          <span className="block text-sm font-medium">A commune needs their page, not this one</span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">EnergieSchweiz directory. You type the postcode there. It is not stored here.</span>
        </a>
        <a href={OUT.tenantGuide} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-line bg-card px-4 py-3">
          <span className="block text-sm font-medium">A page to take to the landlord</span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">Swiss eMobility and EnergieSchweiz, on charging in a rented building. Not legal advice, and not this sum.</span>
        </a>
        <a href={OUT.tcsKm} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-line bg-card px-4 py-3">
          <span className="block text-sm font-medium">Your own tax and insurance</span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">TCS kilometre costs. They ask you to sign in. Their number replaces nothing here.</span>
        </a>
      </div>
    </section>
  );
}

function ChargeMix({ blend, homeOfficial, place }: { blend: Result["blend"]; homeOfficial: boolean; place: string | null }) {
  const rows = [
    { label: "Home", n: blend.home, color: "bg-spruce" },
    { label: "Work", n: blend.work, color: "bg-amber-ink" },
    { label: "Public", n: blend.public, color: "bg-ink" },
  ];
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-medium">Where the electric kilometres charge</h2>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={rows.map((row) => `${row.label} ${Math.round(row.n * 100)} percent`).join(", ")}
      >
        {rows.map((row) => (
          <div key={row.label} className={row.color} style={{ width: `${Math.round(row.n * 100)}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${row.color}`} />
            {row.label} {Math.round(row.n * 100)}%
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {homeOfficial
          ? `A split the model uses. Not your meter. The home price inside it is the ElCom 2026 figure for ${place && place !== "Switzerland" ? place : "Switzerland as a whole"}, not your bill.`
          : "A split the model uses. Not your meter. It changes the power line above, and nothing else."}
      </p>
    </section>
  );
}

function ToggleRow({
  row,
  on,
  result,
  onFlip,
}: {
  row: { key: keyof Toggles; title: string; hint: string };
  on: boolean;
  result: Result;
  onFlip: (key: keyof Toggles) => void;
}) {
  const flipped = evaluate(result.answers, { ...result.toggles, [row.key]: !on }, result.official, result.canton);
  const effect = shiftLine(result, flipped);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onFlip(row.key)}
      className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
    >
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border ${
          on ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"
        }`}
        aria-hidden
      >
        {on ? <Check className="h-4 w-4" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{row.title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-muted">{on ? row.hint : effect}</span>
      </span>
    </button>
  );
}

function SoFar({ result, step }: { result: Result; step: Step }) {
  const years = result.paybackYears;
  const ready = Boolean(result.answers.carClass && result.answers.fuel && result.answers.km);
  const width = !ready || years == null ? 0 : (Math.min(years, 32) / 32) * 100;
  const past = years != null && years > 8;
  const waiting =
    step === "class"
      ? "The class sets the price and the fuel. A year before that would not be your car."
      : step === "fuel"
        ? "The fuel sets that line. The year waits until the distance is yours too."
        : "The distance band is the piece that moves the year. It is not an odometer reading.";
  return (
    <div className="border-t border-line bg-card px-5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            {ready ? "Years to cover the extra price" : "The year waits"}
          </p>
          <p className="font-serif mt-1 text-2xl tabular-nums leading-none">{ready ? paybackTitle(result) : "—"}</p>
        </div>
        {ready ? (
          <p className="max-w-48 text-right text-sm leading-snug text-muted">
            {result.answers.km === "unsure"
              ? `${chf(result.annualSwap)} a year. Distance is a typical figure, and it stays labelled.`
              : `${chf(result.annualSwap)} a year if you switch.`}
          </p>
        ) : null}
      </div>
      <div className="relative mt-3 h-1 rounded-full bg-line" aria-hidden>
        <div className={`h-full rounded-full ${past && ready ? "bg-amber-ink" : "bg-spruce"}`} style={{ width: `${width}%` }} />
        <span className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-ink" style={{ left: "25%" }} />
      </div>
      <div className="relative mt-1 h-4 text-xs text-muted" aria-hidden>
        <span className="absolute left-0">Now</span>
        <span className="absolute left-1/4 -translate-x-1/2">8 years</span>
        <span className="absolute right-0">32</span>
      </div>
      <p className="mt-2 text-sm leading-snug text-muted">
        {ready
          ? years == null
            ? "No year. On these figures switching does not cost less to run, so nothing covers the extra price."
            : years > 32
            ? "Past 32 years on this picture. Past the mark, you would need to keep the car longer than the study used. This is not money you receive."
            : "The mark is 8 years. Past it, you would need to keep the car longer than the study used. This is not money you receive."
          : waiting}{" "}
        <a className="font-medium text-spruce underline" href={SOURCES["tco-2023"].url} target="_blank" rel="noopener noreferrer">
          {SOURCES["tco-2023"].title}, {SOURCES["tco-2023"].published}
        </a>
      </p>
    </div>
  );
}

const FOLLOW: Record<FactKey, { prompt: string; chips: { label: string; detail?: string; patch: Partial<Answers> }[] }> = {
  "two-for-one": {
    prompt: "How often is the trip the smaller car cannot do?",
    chips: [
      { label: "Rarely", patch: { tripFreq: "rare", uses: ["holiday"] } },
      { label: "About once a year", patch: { tripFreq: "yearly", uses: ["holiday"] } },
      { label: "Several times a year", patch: { tripFreq: "often", uses: ["holiday", "long"] } },
    ],
  },
  "mobile-charger": {
    prompt: "Is a charger on the existing line worth a look for this building?",
    chips: [
      { label: "Yes, look at it", patch: { mobileInterest: "yes" } },
      { label: "Not for this case", patch: { mobileInterest: "no" } },
    ],
  },
  battery: {
    prompt: "Would a used car be acceptable if the battery is certified?",
    chips: [
      { label: "Yes, if it is certified", detail: "A used car can stay in the case. The price is still a placeholder.", patch: { usedStance: "yes" } },
      { label: "Only if it is new", detail: "A used car will not be treated as the case.", patch: { usedStance: "new" } },
    ],
  },
  workplace: {
    prompt: "Can the car charge at work on a normal week?",
    chips: [
      { label: "Yes", patch: { workAccess: "yes" } },
      { label: "I can ask", patch: { workAccess: "ask" } },
      { label: "No", patch: { workAccess: "no" } },
    ],
  },
  "public-tariff": {
    prompt: "There is no live Swiss public tariff in this check. The rate stays a labelled placeholder until a source is dated.",
    chips: [],
  },
  "tenant-right": {
    prompt: "Is a written ask worth making for this building?",
    chips: [
      { label: "Yes. I can ask, and keep the answer", patch: { worry: "tenant" } },
      { label: "Not this building", patch: { worry: null } },
    ],
  },
  winter: {
    prompt: "Is winter the ordinary week, or one trip?",
    chips: [
      { label: "One rare trip", detail: "Then it is the smaller-car question, not a bigger battery.", patch: { worry: "winter", tripFreq: "rare", uses: ["holiday"] } },
      { label: "Winter weeks are the problem", detail: "The ordinary week itself is the worry. The francs still have no winter factor.", patch: { worry: "winter" } },
    ],
  },
  "not-for-me": {
    prompt: "Should this check try to overturn that?",
    chips: [{ label: "No. Leave the feeling as a choice", patch: { worry: "refuse" } }],
  },
  "canton-tax": {
    prompt: "There is no canton question on the main path. Naming one would not make this number a tax assessment.",
    chips: [],
  },
  "local-grant": {
    prompt: "There is no town question. A commune is close to an address, and a grant that might already be used up would still not belong in this sum.",
    chips: [],
  },
};

function FactSheet({
  factKey,
  facts,
  onClose,
  onLoad,
  onFollow,
}: {
  factKey: FactKey;
  facts: Fact[] | null;
  onClose: () => void;
  onLoad: () => void;
  onFollow: (partial: Partial<Answers>) => void;
}) {
  useEffect(() => {
    onLoad();
  }, [factKey]);
  const fact = facts?.find((row) => row.key === factKey) ?? FACTS[factKey];
  const view = FACT_VIEW[factKey];
  const follow = FOLLOW[factKey];
  const when = fact.as_of.split("-").reverse().join(".");
  const [openLine, setOpenLine] = useState<string | null>(null);
  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-sheet">
      <div className="safe-pad flex flex-1 flex-col px-5 pt-4 pb-6">
        <button type="button" onClick={onClose} className="flex min-h-11 items-center gap-2 text-sm font-medium text-spruce">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <p className="mt-4 text-sm leading-snug text-muted">{view.kicker}</p>
        <h1 className="font-serif mt-2 text-3xl leading-tight">{fact.title}</h1>
        {view.figure ? (
          <div className="mt-5 rounded-2xl border border-line bg-card p-4">
            <p className="font-serif text-5xl tabular-nums leading-none">{view.figure.value}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={view.figure.caption}>
              <div className="h-full rounded-full bg-spruce" style={{ width: `${Math.round(view.figure.fill * 100)}%` }} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{view.figure.caption}</p>
          </div>
        ) : null}
        {view.compare ? (
          <div className="mt-5">
            <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
              {[view.compare.left, view.compare.right].map((side) => {
                const max = Math.max(view.compare!.left.amount, view.compare!.right.amount, 1);
                const width = side.amount <= 0 ? 0 : Math.max(8, Math.round((side.amount / max) * 100));
                return (
                  <div key={side.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm text-muted">{side.label}</p>
                      <p className="font-serif text-2xl tabular-nums leading-none">{side.value}</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className="h-full rounded-full bg-spruce" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{view.compare.caption}</p>
          </div>
        ) : null}
        <ul className="mt-4 flex flex-col gap-2">
          {view.lines.map((line) => {
            const shown = openLine === line.label;
            const canOpen = Boolean(line.more?.length);
            return (
              <li key={line.label} className="rounded-2xl border border-line bg-card px-4 py-3">
                {canOpen ? (
                  <button
                    type="button"
                    aria-expanded={shown}
                    onClick={() => setOpenLine(shown ? null : line.label)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span>
                      <span className="block text-sm font-medium">{line.label}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-muted">{line.text}</span>
                    </span>
                    <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-spruce transition ${shown ? "rotate-180" : ""}`} />
                  </button>
                ) : (
                  <>
                    <p className="text-sm font-medium">{line.label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{line.text}</p>
                  </>
                )}
                {shown && line.more ? (
                  <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                    {line.more.map((item) => (
                      <p key={item.label} className="text-sm leading-relaxed">
                        <span className="font-medium">{item.label}. </span>
                        <span className="text-muted">{item.text}</span>
                      </p>
                    ))}
                    {line.link ? (
                      <a className="text-sm font-medium text-spruce underline" href={line.link.href} target="_blank" rel="noopener noreferrer">
                        {line.link.name}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm leading-relaxed text-muted">{fact.source}</p>
        {fact.url ? (
          <a className="mt-1 inline-block text-sm font-medium text-spruce underline" href={fact.url} target="_blank" rel="noopener noreferrer">
            {fact.linkName ?? fact.title}
          </a>
        ) : (
          <p className="mt-1 text-sm text-muted">No separate public page for this note.</p>
        )}
        <p className="mt-1 text-sm text-muted">Checked {when}.</p>
        <section className="mt-6">
          {follow.chips.length > 0 ? (
            <>
              <h2 className="font-serif text-2xl leading-tight">{follow.prompt}</h2>
              <div className="mt-3 flex flex-col gap-2">
                {follow.chips.map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => onFollow(chip.patch)}
                    className="min-h-14 rounded-2xl border border-line bg-card px-4 py-3 text-left"
                  >
                    <span className="block text-base font-medium">{chip.label}</span>
                    {chip.detail ? <span className="mt-0.5 block text-sm leading-snug text-muted">{chip.detail}</span> : null}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-muted">{follow.prompt}</p>
          )}
        </section>
      </div>
    </div>
  );
}
