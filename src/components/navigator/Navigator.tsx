import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { notesForUses } from "@/lib/navigator/uses-effect";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Ban,
  Building2,
  Car,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  Download,
  Fuel as FuelIcon,
  Gauge,
  House,
  Leaf,
  ParkingSquare,
  PlugZap,
  RotateCcw,
  Route,
  ShieldCheck,
  Truck,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BatteryProgress, CostBars, PaybackRuler } from "@/components/navigator/viz";
import { paybackWord, scenario as runScenario, sensitivity } from "@/lib/navigator/sensitivity";
import { WithoutCard } from "@/components/navigator/without-card";
import { ExploreTabs, Glossary, NextMove, WhatIf, type PanelDef } from "@/components/navigator/result-parts";
import { BatteryAge, YearDays } from "@/components/navigator/idea-diagrams";
import { featuresOf, rankActions } from "@/lib/navigator/actions";
import { ChargeCheck, WatchList } from "@/components/navigator/charge-check";
import { DecisionFile } from "@/components/navigator/decision-file";
import { NO_SETUP, chargeVerdict, setupDone, type ChargeSetup } from "@/lib/navigator/charging";
import { olderThanUsual } from "@/lib/navigator/freshness";
import { WATCH_SEED, type Watch } from "@/lib/navigator/watch";
import { InPerson, MoreToExplore, RightsCard, UsedPriceCard } from "@/components/navigator/place-parts";
import { rightsFor, type Tenure } from "@/lib/navigator/rights";
import { CostChart } from "@/components/navigator/CostChart";
import { FACTS, FACT_VIEW, type Fact, type FactKey } from "@/lib/navigator/facts";
import { applyDataset, seedRows, type DatasetRow } from "@/lib/navigator/dataset";
import { numberSheet, type SheetKind } from "@/lib/navigator/numbers";
import { NumberSheetModal } from "@/components/navigator/numbers-ui";
import { cleanActions, cleanCohort, cleanVia, type Action, type Via } from "@/lib/navigator/telemetry";
import { classifyWords, logWords, wordsBoxOn } from "@/lib/navigator/words-server";
import { deviceAnswer, type WordsAnswer, type WordsMeta, type WordsOutcome } from "@/lib/navigator/classifier";
import { ordinaryWeek } from "@/lib/navigator/week";
import { cardBlob } from "@/lib/navigator/share-card";
import { localPostcode, POSTCODE_SOURCE } from "@/lib/navigator/postcodes";
import { twoPaybacks } from "@/lib/navigator/paybacks";
import { NotDriving } from "@/components/navigator/not-driving";
import { MethodNote } from "@/components/navigator/method-note";
import { revisitIcs } from "@/lib/navigator/revisit";
import { wouldHaveToBeTrue, type Counterfactual, type LeverKey } from "@/lib/navigator/counterfactual";
import { CANTONS, listFacts, loadDataset, cantonHomeRate, forgetSession, lookupMunicipality, officialHomeRate, saveSession, listWatch, listEvents, type OfficialHome, type SessionBag } from "@/lib/navigator/session";
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
  SPECS,
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
  { name: "Plan", engine: "Postgres", line: "One row, under a random session number, when the result opens, and again after a change." },
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
  barrier: "An ordinary week",
  class: "Your car",
  fuel: "Fuel",
  uses: "What it is for",
  km: "Kilometres",
  parking: "Where you park",
  confirm: "Does this fit",
  focus: "One last question",
  result: "Your check",
};

type Gap = "km" | "payback" | "price" | "wording";

type Saved = {
  step: Step;
  answers: Answers;
  sample: boolean;
  /** Only the switches the person flipped. The rest keep following their answers. */
  pinned: Partial<Toggles> | null;
  sessionId: string;
  fromSample?: boolean;
  cohort?: string | null;
  actions?: string[];
  barrierVia?: string | null;
};

// The seed carries the wording of every row, so a sentence that describes a number is never older than the number.
applyDataset(seedRows());

export function Navigator() {
  // A new screen always opens at its top. Without this, the result could open with its title scrolled away.
  const scroller = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<Step>("barrier");
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [sample, setSample] = useState(false);
  const [pinned, setPinned] = useState<Partial<Toggles> | null>(null);
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
  // Optional place. The postcode is sent once with the result and stored apart from the answers; the settlement is a tap.
  const [postcode, setPostcode] = useState<string | null>(null);
  // The next move shown first, and what the person said about each move. Closed values only: "<action id>.<outcome>".
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [moveShown, setMoveShown] = useState<string | null>(null);
  const [settlement, setSettlement] = useState<"city" | "town" | "rural" | null>(null);
  const [tenure, setTenure] = useState<Tenure | null>(null);
  const fetchEvents = useServerFn(listEvents);
  // Optional charging set-up check on "My place": three taps, closed values, never in the francs.
  const [chargeSetup, setChargeSetup] = useState<ChargeSetup>(NO_SETUP);
  const [sent, setSent] = useState<"idle" | "sending" | "saved" | "failed">("idle");
  const [sentStage, setSentStage] = useState<"mid" | "final" | null>(null);
  const [gap, setGap] = useState<Gap | null>(null);
  const [fromSample, setFromSample] = useState(false);
  const timer = useRef<number | null>(null);
  const sendSession = useServerFn(saveSession);
  const loadFacts = useServerFn(listFacts);
  const fetchDataset = useServerFn(loadDataset);
  const fetchWatch = useServerFn(listWatch);
  const [watch, setWatch] = useState<Watch[]>(WATCH_SEED);
  const [datasetVersion, setDatasetVersion] = useState<string | undefined>(undefined);
  const [datasetRows, setDatasetRows] = useState<DatasetRow[]>(() => seedRows());
  const [cohort, setCohort] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [barrierVia, setBarrierVia] = useState<Via>("tap");
  const [wordsOn, setWordsOn] = useState(false);
  const askWordsFlag = useServerFn(wordsBoxOn);
  const askWords = useServerFn(classifyWords);
  const reportWords = useServerFn(logWords);
  const forget = useServerFn(forgetSession);
  const [forgotten, setForgotten] = useState<"no" | "working" | "done" | "failed">("no");
  const [hint, setHint] = useState<{ parking?: Parking; tenure?: Tenure }>({});
  useEffect(() => {
    askWordsFlag().then((on) => setWordsOn(Boolean(on))).catch(() => setWordsOn(false));
  }, []);
  const record = (action: Action) => setActions((prev) => (prev.includes(action) ? prev : [...prev, action]));
  const loadOfficial = useServerFn(officialHomeRate);
  const loadCanton = useServerFn(cantonHomeRate);
  const lookupMunicipalityPrice = useServerFn(lookupMunicipality);

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
          setCohort(cleanCohort(saved.cohort));
          setActions(cleanActions(saved.actions));
          setBarrierVia(cleanVia(saved.barrierVia));
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
    const fromLink = cleanCohort(new URLSearchParams(window.location.search).get("s"));
    if (fromLink) setCohort(fromLink);
    setHydrated(true);
    void fetchDataset()
      .then((d) => {
        applyDataset(d.rows);
        setDatasetVersion(d.version);
        setDatasetRows(d.rows as DatasetRow[]);
      })
      .catch(() => undefined);
    void fetchWatch()
      .then((rows) => setWatch(rows))
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
    const payload: Saved = { step, answers, sample, pinned, sessionId, fromSample, cohort, actions, barrierVia };
    try {
      localStorage.setItem(STORAGE, JSON.stringify(payload));
    } catch {
      // A private window can refuse storage. The check still works without it.
    }
  }, [hydrated, step, answers, sample, pinned, sessionId, fromSample, cohort, actions, barrierVia]);

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
    setActions([]);
    setBarrierVia("tap");
    setSent("idle");
    setSentStage(null);
    setGap(null);
    setCanton(null);
    setCantonRate(null);
    setHomeGrain(null);
    setCantonState("idle");
    setFromSample(false);
    clearPersonal();
    setForgotten("no");
    setSessionId(crypto.randomUUID());
    setStep("barrier");
  }

  // "Start again" forgets the optional extras too: postcode, settlement, set-up taps and the taps on moves.
  function clearPersonal() {
    setPostcode(null);
    setSettlement(null);
    setTenure(null);
    setChargeSetup(NO_SETUP);
    setOutcomes([]);
    setMoveShown(null);
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
    clearPersonal();
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
  const toggles: Toggles = { ...suggestToggles(answers), ...(pinned ?? {}), insDiscount: false };
  const priced =
    step === "result" || step === "focus" || (Boolean(answers.barrier && answers.parking) && step !== "barrier");
  const result = priced ? evaluate(answers, toggles, cantonRate ?? official, canton) : null;
  const showSoFar = Boolean(result && answers.parking && step !== "barrier" && step !== "result");

  async function pickCanton(code: string | null) {
    setCanton(code);
    setPostcode(null);
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
      const local = await localPostcode(plz);
      if (!local) {
        setCantonState("failed");
        return;
      }
      const hit = await lookupMunicipalityPrice({ data: { bfs: local.bfs, canton: local.canton, place: local.place } });
      if (!hit) {
        setCantonState("failed");
        return;
      }
      setCanton(hit.canton);
      setPostcode(plz);
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
    setPinned({ ...(pinned ?? {}), [key]: !toggles[key] });
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
      postcode,
      settlement,
      tenure,
      moveShown,
      outcomes,
      chargeSetup,
      fromSample,
      datasetVersion,
      cohort,
      actions,
      barrierVia,
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
          postcode ?? "",
          settlement ?? "",
          tenure ?? "",
          moveShown ?? "",
          outcomes.join(","),
          `${chargeSetup.main ?? ""}${chargeSetup.backup ?? ""}${chargeSetup.standing ?? ""}`,
          result.homeOfficial ? "1" : "0",
          opened.join(","),
          JSON.stringify(result.toggles),
          JSON.stringify(result.answers),
          gap ?? "",
          actions.join(","),
        ].join("|")
      : "";

  useEffect(() => {
    if (!autoKey || forgotten === "done" || forgotten === "working") return;
    const t = window.setTimeout(() => {
      void send("final");
    }, 700);
    return () => window.clearTimeout(t);
  }, [autoKey, forgotten]);

  const [showRail, setShowRail] = useState(false);
  useEffect(() => {
    setShowRail(new URLSearchParams(window.location.search).has("workflow"));
  }, []);
  const firstScreen = useRef(true);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    // Keyboard and screen-reader users land on the new screen's title. Not on first load.
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    const title = scroller.current?.querySelector("h1");
    title?.setAttribute("tabindex", "-1");
    title?.focus({ preventScroll: true });
  }, [step]);

  const soFar = showSoFar && result ? <SoFar result={result} step={step} /> : null;

  const recapFor = (upTo: Step): ReactNode => {
    const order: Step[] = ["barrier", "parking", "class", "fuel", "km"];
    const label: Record<string, string | null> = {
      barrier: answers.barrier ? labelBarrier(answers.barrier) : null,
      parking: answers.parking ? (PARKING.find((o) => o.id === answers.parking)?.title ?? null) : null,
      class: answers.carClass ? labelClass(answers.carClass) : null,
      fuel: answers.fuel ? labelFuel(answers.fuel) : null,
      km: answers.km ? (KM_BANDS.find((o) => o.id === answers.km)?.title ?? null) : null,
    };
    const items = order
      .slice(0, order.indexOf(upTo) === -1 ? order.length : order.indexOf(upTo))
      .filter((st) => label[st])
      .map((st) => ({ label: label[st] as string, step: st }));
    return <Recap items={items} onJump={(st) => setStep(st)} />;
  };

  let body: ReactNode = null;
  if (step === "barrier") {
    body = (
      <BarrierStep
        value={answers.barrier}
        onPick={(id) => {
          setBarrierVia("tap");
          setHint({});
          patch({ barrier: id, uses: usesForBarrier(id) }, "parking");
        }}
        wordsBox={
          <WordsBox
            aiOn={wordsOn}
            ask={(words, useAi) => (useAi ? askWords({ data: { words } }) : Promise.resolve(deviceAnswer(words)))}
            onConfirm={(id, h) => {
              setBarrierVia("words");
              setHint({ ...(h.parking ? { parking: h.parking as Parking } : {}), ...(h.tenure ? { tenure: h.tenure as Tenure } : {}) });
              patch({ barrier: id, uses: usesForBarrier(id) }, "parking");
            }}
            onReport={(meta, outcome) => void reportWords({ data: { meta, outcome } }).catch(() => undefined)}
          />
        }
        onSample={showSample}
        onFact={openFact}
      />
    );
  } else if (step === "parking") {
    body = (
      <Single
        recap={recapFor("parking")}
        step={step}
        title="Where do you park at night?"
        hint="This decides whether you could charge at home. After four more taps you get a payback figure: the years until cheaper running covers the extra price of switching."
        options={PARKING}
        value={answers.parking}
        suggested={hint.parking}
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
        recap={recapFor("class")}
        step={step}
        title="What do you drive now?"
        hint="The class is enough. No number plate needed."
        options={CLASSES}
        value={answers.carClass}
        onPick={(id) => patch({ carClass: id as CarClass }, "fuel")}
        onBack={() => setStep("parking")}
      />
    );
  } else if (step === "fuel") {
    body = (
      <Single
        recap={recapFor("fuel")}
        step={step}
        title="What does it run on?"
        hint="If you already drive electric, the check looks at size and charging instead. It never tries to sell you anything."
        options={FUELS}
        value={answers.fuel}
        onPick={(id) => patch({ fuel: id as Fuel }, "km")}
        onBack={() => setStep("class")}
      />
    );
  } else if (step === "km") {
    body = (
      <Single
        recap={recapFor("km")}
        step={step}
        title="About how far in a year?"
        hint="A range is fine. If your last service sticker or invoice shows the kilometres, use that."
        more="Most people guess their yearly distance a bit off. A wrong range changes the yearly fuel or electricity cost, but not the price of the car."
        options={KM_BANDS}
        value={answers.km}
        onPick={(id) => patch({ km: id as KmBand }, "focus")}
        onBack={() => setStep("fuel")}
      />
    );
  } else if (step === "focus" && result) {
    body = (
      <Focus
        recap={recapFor("focus")}
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
        pinnedToggles={pinned}
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
        forgotten={forgotten}
        onForget={() => {
          if (!sessionId) return;
          setForgotten("working");
          void forget({ data: { clientSession: sessionId } })
            .then((r) => setForgotten(r.ok ? "done" : "failed"))
            .catch(() => setForgotten("failed"));
        }}
        canton={canton}
        cantonState={cantonState}
        onCanton={(code) => void pickCanton(code)}
        onAdjust={adjust}
        onAction={record}
        onPostcode={usePostcode}
        grain={homeGrain}
        settlement={settlement}
        onSettlement={(v) => {
          setSettlement(v);
          setSent("idle");
          setSentStage(null);
        }}
        postcodeSet={postcode != null}
        tenure={tenure}
        tenureHint={hint.tenure}
        onTenure={(t) => {
          setTenure(t);
          setSent("idle");
          setSentStage(null);
        }}
        onLoadEvents={() => fetchEvents()}
        watch={watch}
        chargeSetup={chargeSetup}
        onChargeSetup={(next) => {
          setChargeSetup(next);
          setSent("idle");
          setSentStage(null);
        }}
        outcomes={outcomes}
        onOutcome={(key) => {
          const id = key.slice(0, key.lastIndexOf("."));
          setOutcomes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev.filter((k) => !k.startsWith(`${id}.`)), key]));
          setSent("idle");
          setSentStage(null);
        }}
        onShown={setMoveShown}
        datasetRows={datasetRows}
        datasetVersion={datasetVersion}
      />
    );
  }

  const isResult = step === "result";
  const answerLines = answerRecap(answers);
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="hidden border-b border-line bg-sheet lg:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-8">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-spruce text-volt">
              <Zap className="h-3.5 w-3.5" aria-hidden />
            </span>
            BEV Navigator
            <span className="font-normal text-muted">· A neutral check for Switzerland</span>
          </p>
          <p className="flex items-center gap-5 text-sm text-muted">
            <span>No sign-in. Nothing typed. Keeping your car is a fair result.</span>
            <Link to="/method" className="font-medium text-spruce underline underline-offset-2">
              How it works
            </Link>
          </p>
        </div>
      </div>
      <div
        className={`mx-auto flex h-dvh w-full flex-col lg:h-auto lg:min-h-[calc(100dvh-3.5rem)] lg:flex-row lg:items-start lg:gap-10 lg:px-8 lg:py-8 ${
          isResult ? "lg:max-w-6xl" : "lg:max-w-6xl"
        }`}
      >
        {isResult ? null : (
          <aside className="hidden lg:sticky lg:top-8 lg:block lg:w-80 lg:shrink-0">
            <div className="rounded-3xl bg-spruce p-6 text-spruce-ink">
              <p className="text-xs font-medium tracking-widest text-volt uppercase">Your ordinary week</p>
              <p className="font-serif mt-3 text-2xl leading-tight">Would an electric car already work for you?</p>
              <div className="mt-5">
                <BatteryProgress
                  tone="dark"
                  filled={Math.max(0, FLOW.indexOf(step) + 1)}
                  total={FLOW.length}
                  label={`Question ${Math.max(1, FLOW.indexOf(step) + 1)} of ${FLOW.length}`}
                />
                <p className="mt-2 text-xs text-spruce-ink/70">
                  Question {Math.max(1, FLOW.indexOf(step) + 1)} of {FLOW.length}. About a minute.
                </p>
              </div>
              {answerLines.length > 0 ? (
                <dl className="mt-5 space-y-2.5 border-t border-white/15 pt-4">
                  {answerLines.map((row) => (
                    <div key={row.step}>
                      <dt className="text-[11px] tracking-widest text-spruce-ink/60 uppercase">{row.kicker}</dt>
                      <dd className="text-sm leading-snug">
                        <button type="button" onClick={() => setStep(row.step)} className="min-h-6 text-left underline decoration-white/30 underline-offset-2 hover:decoration-volt">
                          {row.label}
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-5 border-t border-white/15 pt-4 text-sm leading-relaxed text-spruce-ink/80">
                  Tap what fits. Your answers appear here, and you can change any of them.
                </p>
              )}
            </div>
            {soFar ? <div className="mt-4 overflow-hidden rounded-2xl border border-line">{soFar}</div> : null}
            {showRail ? (
              <div className="mt-4 rounded-2xl border border-line bg-card p-4">
                <p className="text-xs font-medium tracking-widest text-spruce uppercase">n8n · five nodes</p>
                <ol className="mt-3">
                  {NODES.map((node, i) => {
                    const on = i === railIndex(step, sentStage === "final");
                    return (
                      <li key={node.name} className="flex gap-3">
                        <span className="flex flex-col items-center">
                          <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-medium ${on ? "bg-spruce text-spruce-ink" : "border border-line bg-card text-muted"}`}>
                            {i + 1}
                          </span>
                          {i < NODES.length - 1 ? <span className="mt-1 h-6 w-px bg-line" /> : null}
                        </span>
                        <span className="min-w-0 pb-3 text-sm">
                          <span className="block font-medium">{node.name} <span className="font-normal text-muted">· {node.engine}</span></span>
                          <span className="block leading-snug text-muted">{node.line}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </aside>
        )}
        <div
          className={`relative flex min-h-0 w-full flex-1 flex-col bg-sheet lg:flex-none ${
            isResult ? "lg:bg-transparent" : "lg:min-w-0 lg:max-w-3xl lg:rounded-3xl lg:border lg:border-line"
          }`}
        >
          <div ref={scroller} className="safe-pad flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-visible lg:pb-6">
            <SoFarContext.Provider value={showSoFar && result ? { result } : null}>
              <div key={step} className="step-in flex flex-1 flex-col">
                {body}
              </div>
            </SoFarContext.Provider>
          </div>
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

const RECAP_KICKER: Record<string, string> = { barrier: "What would stop you", parking: "Where you park", class: "Your car", fuel: "Fuel", km: "Distance" };
function answerRecap(a: Answers): { step: Step; kicker: string; label: string }[] {
  const rows: { step: Step; label: string | null }[] = [
    { step: "barrier", label: a.barrier ? labelBarrier(a.barrier) : null },
    { step: "parking", label: a.parking ? (PARKING.find((o) => o.id === a.parking)?.title ?? null) : null },
    { step: "class", label: a.carClass ? labelClass(a.carClass) : null },
    { step: "fuel", label: a.fuel ? labelFuel(a.fuel) : null },
    { step: "km", label: a.km ? (KM_BANDS.find((o) => o.id === a.km)?.title ?? null) : null },
  ];
  return rows.filter((r): r is { step: Step; label: string } => r.label != null).map((r) => ({ step: r.step, kicker: RECAP_KICKER[r.step]!, label: r.label }));
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
  flush = false,
}: {
  step: Step;
  onBack?: () => void;
  planSent?: boolean;
  flush?: boolean;
}) {
  const index = FLOW.indexOf(step);
  const soFarCtx = useContext(SoFarContext);
  const [openYear, setOpenYear] = useState(false);
  const yrs = soFarCtx?.result.paybackYears ?? null;
  const yearReady = Boolean(soFarCtx?.result.answers.carClass && soFarCtx?.result.answers.fuel && soFarCtx?.result.answers.km);
  // The chip says what the number is, so it needs no key: the extra price is repaid by this year.
  const soFarChip = !yearReady ? "Repaid in year ?" : yrs == null ? "No payback" : `Repaid in year ${Math.max(1, Math.ceil(yrs))}`;
  const soFarLabel = !yearReady
    ? "Years to cover the extra price. Waiting for your answers. Tap to read why."
    : `Years to cover the extra price: ${yrs == null ? "none on these figures" : Math.max(1, Math.ceil(yrs))}. Tap to open the three checkpoints.`;
  // One segment per question. The result fills the whole bar. The five-node rail stays on the desktop side panel only.
  const filled = step === "result" ? FLOW.length : index + 1;
  void planSent;
  return (
    <header className={`sticky top-0 z-10 rounded-t-3xl bg-sheet px-5 pt-4 pb-3 lg:static lg:pt-6 ${flush ? "lg:bg-transparent lg:px-0 lg:pt-0" : "lg:px-8"}`}>
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
          <span className="w-11 shrink-0 lg:hidden" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">
            {KICKER[step]}
            {index >= 0 ? ` · ${index + 1} of ${FLOW.length}` : ""}
          </p>
          <div className="mt-2 flex items-center gap-2 lg:hidden">
            <div className="min-w-0 flex-1">
              <BatteryProgress filled={filled} total={FLOW.length} label={`Step ${Math.min(filled, FLOW.length)} of ${FLOW.length}`} />
            </div>
            {soFarCtx && step !== "barrier" && step !== "result" ? (
              <button
                type="button"
                onClick={() => setOpenYear((v) => !v)}
                aria-expanded={openYear}
                aria-label={soFarLabel}
                className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-medium tabular-nums ${openYear ? "border-spruce bg-moss text-moss-ink" : "border-line bg-card"}`}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-spruce" />
                {soFarChip}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {soFarCtx && openYear && step !== "barrier" && step !== "result" ? (
        <div className="absolute inset-x-3 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-line shadow-lg lg:hidden">
          <SoFar result={soFarCtx.result} step={step} />
        </div>
      ) : null}
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
  wordsBox,
  onSample,
  onFact,
}: {
  value: Barrier | null;
  onPick: (id: Barrier) => void;
  wordsBox: ReactNode;
  onSample: () => void;
  onFact: (fact: FactKey) => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <Header step="barrier" />
      <div className="flex flex-1 flex-col px-5 pt-2 pb-6 lg:px-8">
        <h1 className="font-serif text-[1.7rem] leading-tight lg:text-4xl">Would an electric car already work for an ordinary week?</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tap what would still hold you back. Six taps, about a minute, nothing you have to type. Keeping your car is a perfectly fair result.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {BARRIERS.map((opt) => (
            <Choice key={opt.id} icon={opt.id} title={opt.title} detail={opt.detail} selected={value === opt.id} onClick={() => onPick(opt.id)} />
          ))}
        </div>
        {wordsBox}
        <NotDriving onShare={shareOrCopy} onFact={onFact} />
        <div className="mt-4 rounded-2xl border border-line bg-card p-4">
          <p className="text-sm font-medium">Not sure where to start?</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">Start from a typical case. It is filled in for you and clearly marked, and you can change any answer.</p>
          <button type="button" onClick={onSample} className="mt-2 inline-flex min-h-11 items-center rounded-full border border-spruce px-4 text-sm font-medium text-spruce">
            Start from a typical case
          </button>
        </div>
        <section className="mt-6" aria-labelledby="ideas-title">
          <h2 id="ideas-title" className="text-xs font-medium tracking-widest text-muted uppercase">Ideas worth knowing</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            {(
              [
                ["two-for-one", "2:1", "A smaller car, and a bigger one only on the days you need it", "See a year of days"],
                ["battery", "Battery", "A used car's battery, checked by its age, now with a free warranty", "See it by car age"],
                ["mobile-charger", "Charger", "Charging in a shared garage without rebuilding it", "See what exists"],
              ] as const
            ).map(([key, tag, title, cta]) => (
              <li key={key}>
                <button type="button" onClick={() => onFact(key)} className="flex h-full min-h-11 w-full flex-col rounded-2xl border border-line bg-card p-3 text-left">
                  <span className="text-xs font-medium tracking-widest text-spruce uppercase">{tag}</span>
                  <span className="mt-1 text-sm font-medium leading-snug">{title}</span>
                  <span className="mt-2 text-xs font-medium text-spruce underline underline-offset-2">{cta}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Also worth a minute:{" "}
            <button type="button" onClick={() => onFact("wait-or-not")} className="min-h-11 font-medium text-spruce underline underline-offset-2">
              Should I wait for better batteries?
            </button>{" "}
            <button type="button" onClick={() => onFact("car-data")} className="min-h-11 font-medium text-spruce underline underline-offset-2">
              Does a connected car track me?
            </button>{" "}
            <button type="button" onClick={() => onFact("value-loss")} className="min-h-11 font-medium text-spruce underline underline-offset-2">
              Why does a car lose value?
            </button>{" "}
            <button type="button" onClick={() => onFact("leasing")} className="min-h-11 font-medium text-spruce underline underline-offset-2">
              Leasing instead of buying?
            </button>{" "}
            <button type="button" onClick={() => onFact("test-drive")} className="min-h-11 font-medium text-spruce underline underline-offset-2">
              Try it for 48 hours first?
            </button>
          </p>
        </section>
        <MethodNote />
      </div>
    </div>
  );
}

// Optional. The sentence is read on this phone by simple keyword rules. Only if the person ticks the box, and the server has the
// AI service switched on, it is sent once to be read there. Either way it comes back as one category to confirm and is dropped.
function WordsBox({
  aiOn,
  ask,
  onConfirm,
  onReport,
}: {
  aiOn: boolean;
  ask: (words: string, useAi: boolean) => Promise<WordsAnswer>;
  onConfirm: (id: Barrier, hints: { parking?: string | null; tenure?: string | null }) => void;
  onReport: (meta: WordsMeta, outcome: WordsOutcome) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [useAi, setUseAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [got, setGot] = useState<Extract<WordsAnswer, { ok: true }> | "failed" | "declined" | null>(null);

  async function send() {
    setBusy(true);
    let out: WordsAnswer;
    try {
      out = await ask(text, useAi && aiOn);
      if ("error" in out && useAi) out = deviceAnswer(text);
    } catch {
      out = deviceAnswer(text);
    }
    setGot("ok" in out ? out : "failed");
    setText("");
    setBusy(false);
  }
  const decide = (ans: Extract<WordsAnswer, { ok: true }>, outcome: WordsOutcome, id?: Barrier) => {
    onReport(ans.meta, outcome);
    if (id) onConfirm(id, { parking: ans.parking, tenure: ans.tenure });
    else setGot("declined");
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-11 text-left text-sm font-medium text-spruce">
        Prefer to say it in your own words?
      </button>
    );
  }
  return (
    <div className="mt-3 rounded-2xl border border-line bg-card p-4">
      {got === null ? (
        <>
          <label htmlFor="own-words" className="text-sm font-medium">
            What would still stop you?
          </label>
          <textarea
            id="own-words"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={280}
            rows={3}
            className="mt-2 w-full rounded-xl border border-line bg-sheet px-3 py-2 text-base"
          />
          <p className="mt-1 text-xs leading-snug text-muted">
            One sentence, no names or addresses. It is read on this phone by simple keyword rules, then dropped. Nothing is saved; we only count whether the suggestion was right.
          </p>
          {aiOn ? (
            <label className="mt-2 flex min-h-11 items-start gap-2 text-xs leading-snug text-muted">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
              <span>Also let an AI service read it, for a better guess. It runs in the United States, does not learn from it, and the sentence is not kept here.</span>
            </label>
          ) : null}
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || text.trim().length < 3}
            className="mt-3 min-h-11 rounded-full bg-spruce px-5 text-sm font-medium text-spruce-ink disabled:opacity-50"
          >
            {busy ? "Reading" : "Suggest a category"}
          </button>
        </>
      ) : got === "failed" || got === "declined" || got.barrier == null || got.band === "ask" ? (
        <p className="text-sm leading-snug">
          {got === "failed" ? "That did not work." : got === "declined" ? "Okay." : "I could not tell for sure."} Please tap one of the options above.
          {typeof got === "object" && got.personal ? " It looked like it had personal details. They were not kept." : ""}
        </p>
      ) : (
        <>
          <p className="text-sm leading-snug">
            That sounds like <span className="font-medium">“{labelBarrier(got.barrier)}”</span>
            {got.alt ? (
              <>
                , or maybe <span className="font-medium">“{labelBarrier(got.alt)}”</span>
              </>
            ) : null}
            . Is that right?
          </p>
          {got.personal ? <p className="mt-1 text-xs leading-snug text-muted">It looked like it had personal details. They were not kept.</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => decide(got, "yes", got.barrier as Barrier)} className="min-h-11 rounded-full bg-spruce px-5 text-sm font-medium text-spruce-ink">
              Yes, that is it
            </button>
            {got.alt ? (
              <button type="button" onClick={() => decide(got, "alt", got.alt as Barrier)} className="min-h-11 rounded-full border border-spruce px-5 text-sm font-medium text-spruce">
                Rather “{labelBarrier(got.alt)}”
              </button>
            ) : null}
            <button type="button" onClick={() => decide(got, "no")} className="min-h-11 rounded-full border border-line px-5 text-sm font-medium">
              No, I will tap
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const LEVER_PHRASE: Record<LeverKey, string> = {
  used: "a used car with a checked battery",
  rightSize: "one class down, with the rare days rented",
  work: "charging at work",
  home: "charging where you park",
  publicPlan: "a public charging plan",
  tariff: "a cheaper home tariff",
  pv: "solar on the roof",
};

function OrdinaryWeek({ result }: { result: Result }) {
  const w = ordinaryWeek(result);
  const km = Math.max(10, Math.round(w.weekKm / 10) * 10);
  const pct = Math.round(w.share * 100);
  const fill = Math.min(w.share, 1) * 100;
  const parts = [
    { id: "home", label: "Home", value: w.mix.home, color: "#1f4a38" },
    { id: "work", label: "Work", value: w.mix.work, color: "#6f9a85" },
    { id: "public", label: "Public", value: w.mix.public, color: "#6a4a12" },
  ].filter((p) => p.value > 0.005);
  const range = Math.round(w.fullChargeKm / 10) * 10;
  return (
    <section className="rounded-2xl border border-line bg-card p-4" aria-labelledby="week-title">
      <h2 id="week-title" className="font-medium">
        Your ordinary week, in battery
      </h2>
      <p className="font-serif mt-2 text-2xl tabular-nums leading-snug">About {km} km a week</p>
      <div
        role="img"
        aria-label={`${pct} percent of one ${w.battery} kilowatt-hour battery. ${parts.map((p) => `${p.label} ${Math.round(p.value * 100)} percent`).join(", ")}.`}
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-line"
      >
        <div className="flex h-full" style={{ width: `${fill}%` }}>
          {parts.map((p) => (
            <span key={p.id} className="h-full" style={{ width: `${p.value * 100}%`, background: p.color }} />
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden>
        <span>0</span>
        <span>one {w.battery} kWh battery</span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
            {p.label} {Math.round(p.value * 100)} %
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed">
        {w.share > 1
          ? `That is more than one full battery a week (${pct} %).`
          : `That is about ${pct} % of one battery.`}{" "}
        {w.coversWeek
          ? `One full charge would cover the whole week, about ${range} km.`
          : `One full charge covers about ${range} km, less than this week. It would take a stop on the way.`}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        The week is the yearly kilometres divided by 52, spread evenly. Battery size is a class placeholder and consumption is the class figure. No winter factor, no motorway speed. It does not change a franc.
      </p>
    </section>
  );
}

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

type RecapItem = { label: string; step: Step };

function Recap({ items, onJump }: { items: RecapItem[]; onJump: (step: Step) => void }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Your answers so far" data-hscroll className="-mx-5 mb-3 overflow-x-auto px-5 lg:hidden">
      <ul className="flex w-max gap-1.5 pr-5">
        {items.map((item) => (
          <li key={item.step}>
            <button type="button" onClick={() => onJump(item.step)} className="min-h-9 rounded-full border border-line bg-card px-3 text-xs whitespace-nowrap text-muted">
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
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
  recap,
  more,
  suggested,
}: {
  step: Step;
  title: string;
  hint: string;
  more?: string;
  suggested?: string;
  recap?: ReactNode;
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
      <div className="flex flex-1 flex-col px-5 pt-1 pb-6 lg:px-8">
        {recap}
        <h1 className="font-serif text-3xl leading-tight lg:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{hint}</p>
        {more ? (
          <details className="mt-1 text-sm text-muted">
            <summary className="min-h-9 cursor-pointer py-1.5 font-medium text-spruce">Why a band?</summary>
            <p className="pb-1 leading-relaxed">{more}</p>
          </details>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          {options.map((opt) => {
            const matched = notes?.filter((n) => n.optionId === opt.id) ?? [];
            return (
              <div key={opt.id}>
                <Choice icon={step === "km" && opt.id === "mid" ? "mid_km" : step === "km" || step === "class" || step === "fuel" || step === "parking" ? opt.id : undefined} title={opt.title} detail={opt.detail} tag={suggested === opt.id && value !== opt.id ? "From your sentence. Tap to confirm." : undefined} selected={value === opt.id} onClick={() => onPick(opt.id)} />
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

const CHOICE_ICON: Record<string, LucideIcon> = {
  // barriers
  charging: PlugZap,
  cost: Wallet,
  trips: Route,
  trust: ShieldCheck,
  // parking
  house: House,
  own: ParkingSquare,
  shared: Building2,
  none: Ban,
  // car class
  small: Car,
  compact: CarFront,
  mid: CarFront,
  suv: Truck,
  van: Truck,
  // fuel
  petrol: FuelIcon,
  diesel: FuelIcon,
  hybrid: Leaf,
  electric: Zap,
  // distance
  lt10: Gauge,
  mid_km: Gauge,
  gt20: Gauge,
  unsure: CircleHelp,
};

function Choice({
  title,
  detail,
  selected,
  onClick,
  icon,
  tag,
}: {
  title: string;
  detail?: string;
  selected: boolean;
  onClick: () => void;
  icon?: string;
  tag?: string;
}) {
  const Icon = icon ? CHOICE_ICON[icon] : undefined;
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`group flex min-h-14 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-200 active:scale-[0.99] ${
        selected ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card text-ink hover:border-spruce/50"
      }`}
    >
      {Icon ? (
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-volt text-spruce" : "bg-moss text-moss-ink"}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        {detail ? <span className={`mt-0.5 block text-sm leading-snug ${selected ? "text-spruce-ink/85" : "text-muted"}`}>{detail}</span> : null}
        {tag ? <span className="mt-1 block text-xs font-medium text-spruce">{tag}</span> : null}
      </span>
      {selected ? <Check className="h-5 w-5 shrink-0 text-volt" aria-hidden /> : null}
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
  recap,
}: {
  recap?: ReactNode;
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
      <div className="flex flex-1 flex-col px-5 pt-1 pb-6 lg:px-8">
        {recap}
        <h1 className="font-serif text-3xl leading-tight lg:text-4xl">{spec.title}</h1>
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
          className="mt-6 h-12 rounded-full bg-spruce font-medium text-spruce-ink disabled:opacity-40 lg:self-start lg:px-10"
        >
          See the numbers
        </button>
        <button type="button" onClick={onSend} className="mt-3 text-sm text-muted">
          {sent === "saved" ? "Snapshot sent, no name" : sent === "sending" ? "Sending…" : "Send these taps, no name"}
        </button>
      </div>
    </div>
  );
}

function focusSpec(kind: ReturnType<typeof focusKind>, answers: Answers) {
  if (kind === "work") {
    const options: { id: WorkAccess; title: string; detail: string; patch: Partial<Answers> }[] = [
      { id: "yes", title: "Yes, I can charge at work", detail: "A normal week, not a one-off favour.", patch: { workAccess: "yes" } },
      { id: "ask", title: "I can ask", detail: "Worth asking before you rule it out.", patch: { workAccess: "ask" } },
      { id: "no", title: "No", detail: "Then home charging or public charging has to cover the week.", patch: { workAccess: "no" } },
    ];
    return {
      title: "Could the car charge at work?",
      hint: "For many people, charging at work covers more kilometres than a home wallbox they do not have yet.",
      options,
      value: answers.workAccess,
    };
  }
  if (kind === "trips") {
    if (answers.uses.includes("towing")) {
      return {
        title: "You tow, so the size stays.",
        hint: "Towing stays in the picture, so a smaller car is not suggested as a replacement.",
        options: [
          {
            id: "often" as TripFreq,
            title: "Got it, keep this size",
            detail: "You can still see what charging does to your yearly cost.",
            patch: { tripFreq: "often" as TripFreq },
          },
        ],
        value: answers.tripFreq,
      };
    }
    const options: { id: TripFreq; title: string; detail: string; patch: Partial<Answers> }[] = [
      { id: "rare", title: "Rarely", detail: "Less than once a year.", patch: { tripFreq: "rare" } },
      { id: "yearly", title: "About once a year", detail: "A holiday trip, not the daily run.", patch: { tripFreq: "yearly" } },
      { id: "often", title: "Several times a year", detail: "Then a larger battery can be a real need.", patch: { tripFreq: "often" } },
    ];
    return {
      title: "How often is the long trip?",
      hint: "The one long trip you worry about often weighs more than the kilometres you drive every week.",
      options,
      value: answers.tripFreq,
    };
  }
  if (kind === "trust") {
    const options: { id: UsedStance; title: string; detail: string; patch: Partial<Answers> }[] = [
      { id: "yes", title: "Yes, if the battery is certified", detail: "With a written battery health check, not just the seller’s word.", patch: { usedStance: "yes" } },
      { id: "new", title: "Only if it is new", detail: "You pay more to avoid the unknown.", patch: { usedStance: "new" } },
      { id: "no", title: "I do not want a used electric car", detail: "Then the upfront cost stays high. That is a fair choice.", patch: { usedStance: "no" } },
    ];
    return {
      title: "Would a used car be acceptable?",
      hint: "A battery check turns a rumour into a number you can judge.",
      options,
      value: answers.usedStance,
    };
  }
  const options: { id: CostSting; title: string; detail: string; patch: Partial<Answers> }[] = [
    { id: "price", title: "The purchase price", detail: "Paying for the car, or watching its value fall.", patch: { costSting: "price" } },
    { id: "month", title: "What it costs each month", detail: "Fuel, power, insurance, tax, tyres.", patch: { costSting: "month" } },
    { id: "both", title: "Both", detail: "Fair enough. They pull in different directions.", patch: { costSting: "both" } },
  ];
  return {
    title: "What bothers you more about the cost?",
    hint: "If the purchase price bothers you, we start with a used car. The other answers only change the wording, not the francs. You can change every setting later.",
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
  pinnedToggles,
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
  forgotten,
  onForget,
  onGap,
  gap,
  sent,
  canton,
  cantonState,
  onCanton,
  onAdjust,
  onAction,
  onPostcode,
  grain,
  settlement,
  onSettlement,
  postcodeSet,
  tenure,
  tenureHint,
  onTenure,
  onLoadEvents,
  watch,
  chargeSetup,
  onChargeSetup,
  outcomes,
  onOutcome,
  onShown,
  datasetRows,
  datasetVersion,
}: {
  watch: Watch[];
  chargeSetup: ChargeSetup;
  onChargeSetup: (next: ChargeSetup) => void;
  outcomes: string[];
  onOutcome: (key: string) => void;
  onShown: (id: string | null) => void;
  datasetRows: DatasetRow[];
  datasetVersion: string | undefined;
  onAction: (action: Action) => void;
  result: Result;
  sample: boolean;
  openMore: boolean;
  openTrace: boolean;
  copied: boolean;
  sent: "idle" | "sending" | "saved" | "failed";
  onFlip: (key: keyof Toggles) => void;
  pinnedToggles: Partial<Toggles> | null;
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
  forgotten: "no" | "working" | "done" | "failed";
  onForget: () => void;
  onGap: (id: Gap) => void;
  gap: Gap | null;
  canton: string | null;
  cantonState: "idle" | "loading" | "failed";
  onCanton: (code: string | null) => void;
  onAdjust: (partial: Partial<Answers>) => void;
  onPostcode: (plz: string) => Promise<void>;
  grain: "municipality" | null;
  settlement: "city" | "town" | "rural" | null;
  onSettlement: (v: "city" | "town" | "rural" | null) => void;
  postcodeSet: boolean;
  tenure: Tenure | null;
  tenureHint?: Tenure;
  onTenure: (t: Tenure | null) => void;
  onLoadEvents: () => Promise<import("@/lib/navigator/session").PublicEvent[]>;
}) {
  const rights = useMemo(() => rightsFor({ canton, tenure, postcodeSet, result }), [canton, tenure, postcodeSet, result]);
  const sens = useMemo(() => sensitivity(result), [result]);
  const [sheetKind, setSheetKind] = useState<SheetKind | null>(null);
  const frame = result.answers.keepYears ?? 8;
  const [panel, setPanel] = useState<PanelDef["id"]>("whatif");
  const [picks, setPicks] = useState<Record<string, number>>({});
  const [showWithout, setShowWithout] = useState(false);
  const [barNote, setBarNote] = useState<string | null>(null);
  const scen = useMemo(
    () => (sens ? runScenario(result, Object.fromEntries(Object.entries(picks).map(([k, v]) => [k, v / 4]))) : null),
    [result, sens, picks],
  );
  const scenOutcome = scen ? { payback: scen.paybackYears != null && scen.saving > 40 ? scen.paybackYears : null, saving: scen.saving } : null;
  const verdictSetup = useMemo(() => chargeVerdict(chargeSetup, result.answers.workAccess), [chargeSetup, result.answers.workAccess]);
  const ranked = useMemo(
    () => rankActions(featuresOf(result, verdictSetup?.level ?? null), (sens?.drivers ?? []).map((d) => ({ id: d.id, label: d.label }))),
    [result, sens, verdictSetup],
  );
  const shownId = ranked.find((r) => !outcomes.some((o) => o === `${r.action.id}.done` || o === `${r.action.id}.not_for_me`))?.action.id ?? null;
  useEffect(() => {
    onShown(shownId);
  }, [shownId]);
  // One panel is open at a time, so the page stays short. Opening one jumps to it, or to a named spot.
  function openPanel(id: PanelDef["id"], scrollTo: string | null) {
    if (id === "sources" && panel !== "sources") {
      onAction("fold_evidence");
      onAction("fold_why");
    }
    setPanel(id);
    if (scrollTo) window.setTimeout(() => document.getElementById(scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }
  useEffect(() => {
    if (gap !== "payback") return;
    onAction("fold_why");
    setPanel("sources");
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
  // The note is read at the moment of the tap, before the chip flips, so it says what that tap did.
  const [useChangeLine, setUseChangeLine] = useState<string | null>(null);
  const notes = useMemo(() => notesForUses(result, pinnedToggles), [result, pinnedToggles]);
  const leversSection = (
        <section id="levers">
          <h2 className="font-medium">Try a change</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Each switch below recalculates at once, and says what it did. The prices are rough class figures, not a quote and not an offer.
          </p>
          <p className="mt-3 text-xs font-medium tracking-widest text-muted uppercase">Read first, no change to the figures</p>
          <div className="mt-2 flex flex-wrap gap-2">
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
          <p className="mt-3 text-xs font-medium tracking-widest text-muted uppercase">What you use the car for</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="What you use the car for">
            {USES.map((u) => {
              const on = result.answers.uses.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setUseChangeLine(notes.find((n) => n.id === u.id)?.text ?? null);
                    onUse(u.id);
                  }}
                  className={`min-h-11 rounded-full border px-3 py-2 text-sm ${on ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
                >
                  {u.title}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-sm leading-snug text-muted" aria-live="polite">
            {useChangeLine ?? `Moves the francs: ${notes.filter((n) => n.kind === "francs").map((n) => USES.find((u) => u.id === n.id)?.title.toLowerCase()).join(", ") || "none right now"}. The others change the wording and which move comes first, not a franc.`}
          </p>
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
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="lg:mb-2">
        <Header step="result" onBack={onBack} planSent={sent === "saved"} flush />
      </div>
      <div className="flex flex-col gap-4 px-5 pt-2 pb-8 lg:grid lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-0 lg:pt-0">
        <div className="flex flex-col gap-4">
          {sample ? (
            <div className="rounded-2xl bg-moss px-4 py-3 text-sm leading-relaxed text-moss-ink">
              Sample case: compact diesel, about 14,000 km, shared garage, able to ask at work. Not your life.
              <button type="button" onClick={onSampleOff} className="mt-2 block min-h-11 font-medium underline">
                Start with mine
              </button>
            </div>
          ) : null}
          <section className="rounded-3xl bg-spruce p-5 text-spruce-ink lg:p-6" aria-labelledby="result-title">
            <p className="text-xs font-medium tracking-widest text-volt uppercase">Your check</p>
            <h1 id="result-title" className="font-serif mt-2 text-3xl leading-tight lg:text-[2rem]">
              {result.headline}
            </h1>
            <div className="mt-3 flex flex-col gap-2 lg:gap-1.5">
              {result.verdict.split("\n").map((line) => {
                const cut = line.indexOf(". ");
                const lead = cut === -1 ? line : line.slice(0, cut + 1);
                const rest = cut === -1 ? "" : line.slice(cut + 2);
                return (
                  <p key={line} className="text-base leading-snug tabular-nums lg:text-[15px]">
                    <span className="font-medium">{lead}</span>
                    {rest ? <span className="block text-sm leading-snug text-spruce-ink/75 lg:text-[13px]">{rest}</span> : null}
                  </p>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setSheetKind("keep")} className="rounded-2xl bg-white/10 p-3 text-left transition-colors hover:bg-white/15">
                <p className="text-xs font-medium tracking-widest text-spruce-ink/70 uppercase">Keep it</p>
                <p className="font-serif mt-2 text-2xl tabular-nums leading-none text-volt">{chf(result.annualKeep)}</p>
                <p className="mt-1 text-sm text-spruce-ink/75">a year to run</p>
                <p className="mt-2 text-xs font-medium text-volt underline underline-offset-2">How it is made</p>
              </button>
              <button type="button" onClick={() => setSheetKind("switch")} className="rounded-2xl bg-white/10 p-3 text-left transition-colors hover:bg-white/15">
                <p className="text-xs font-medium tracking-widest text-spruce-ink/70 uppercase">Switch</p>
                <p className="font-serif mt-2 text-2xl tabular-nums leading-none text-volt">{chf(result.annualSwap)}</p>
                <p className="mt-1 text-sm text-spruce-ink/75">a year to run</p>
                <p className="mt-2 text-xs font-medium text-volt underline underline-offset-2">How it is made</p>
              </button>
            </div>
            <button type="button" onClick={() => setSheetKind("cash")} className="mt-2 flex min-h-11 w-full items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-left text-sm transition-colors hover:bg-white/15">
              <span>
                <span className="font-medium tabular-nums">{chf(result.cash)}</span> extra at the start
              </span>
              <span className="text-xs font-medium text-volt underline underline-offset-2">How it is made</span>
            </button>
            {sens ? (
              <div className="mt-5 border-t border-white/15 pt-4">
                <p className="text-xs font-medium tracking-widest text-spruce-ink/70 uppercase">When the savings cover the extra price</p>
                <div className="mt-3">
                  <PaybackRuler base={sens.base} best={sens.best} worst={sens.worst} frame={frame} tone="dark" scenario={scenOutcome} />
                </div>
                {scenOutcome ? (
                  <p className="mt-2 text-sm leading-snug text-spruce-ink" aria-live="polite">
                    <span className="font-medium text-volt">With your changes: {paybackWord(scenOutcome)}</span>, saving {chf(scenOutcome.saving)} a year.{" "}
                    <button type="button" onClick={() => setPicks({})} className="min-h-11 font-medium underline underline-offset-2">
                      Back to my answers
                    </button>
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-x-5">
                  <button type="button" onClick={() => setSheetKind("payback")} className="min-h-11 py-2 text-sm font-medium text-volt underline underline-offset-2">
                    How the year is worked out
                  </button>
                  <button type="button" onClick={() => openPanel("whatif", "explore")} className="inline-block min-h-11 py-2 text-sm font-medium text-volt underline underline-offset-2">
                    Move a figure
                  </button>
                </div>
              </div>
            ) : null}
            {sample ? null : (
              <p className="mt-2 text-xs leading-relaxed text-spruce-ink/60">Opening this page saves one record under a random session number. No name, no address.</p>
            )}
          </section>
        </div>
        <div className="flex flex-col gap-4">
        <div>
          <div id="chart" className="scroll-mt-4 rounded-2xl border border-line bg-card p-3 lg:p-5">
            <p className="text-xs text-muted">Total cost in thousand francs (left), year by year (bottom).</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink">
              <span className="flex items-center gap-2">
                <span className="w-8 border-t-2 border-dashed border-ink" />
                Keep
              </span>
              <span className="flex items-center gap-2">
                <span className="h-[3px] w-8 rounded-full bg-spruce" />
                Switch
              </span>
              {showWithout ? (
                <span className="flex items-center gap-2">
                  <span className="w-8 border-t-[3px] border-dotted border-amber-ink" />
                  Without a car
                </span>
              ) : null}
              {scen ? (
                <span className="flex items-center gap-2">
                  <span className="w-8 border-t-[3px] border-dotted border-[#7a9a1a]" />
                  With your changes
                </span>
              ) : null}
            </div>
            <CostChart data={result.series} ghost={scen?.series ?? null} without={showWithout ? result.without.series : null} />
            <p className="mt-2 text-xs text-muted">How long would you keep the next car? The headline follows this. The payback year does not.</p>
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
                aria-pressed={showWithout}
                onClick={() => setShowWithout((on) => !on)}
                className={`min-w-0 flex-1 rounded-full border px-2 py-1.5 text-sm ${showWithout ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-sheet"}`}
              >
                No car
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              {result.toggles.rightSize
                ? "New or used, same class. A smaller car with the rare days rented is already counted (the 2:1 idea). Change it under What if. Without a car adds a third line."
                : "New or used, same class. Without a car adds a third line: a travel card and a few rented days."}
            </p>
            {showWithout ? <WithoutCard result={result} /> : null}
            <a className="mt-2 inline-block text-sm font-medium text-spruce underline" href={SOURCES["tco-2023"].url} target="_blank" rel="noopener noreferrer">
              {SOURCES["tco-2023"].title}, {SOURCES["tco-2023"].published}
            </a>
          </div>
          <button
            type="button"
            onClick={() => openPanel("climate", "explore")}
            className="mt-3 flex min-h-14 w-full flex-col items-start justify-center rounded-2xl border border-line bg-sheet px-4 py-2 text-left"
          >
            <span className="text-sm font-medium text-spruce">Two paybacks: money in years, climate in kilometres</span>
            <span className="text-xs leading-snug text-muted">{(() => {
              const t = twoPaybacks({ cash: result.cash, saving: result.saving, km: result.km, horizon: result.series.length - 1, alreadyElectric: result.answers.fuel === "electric" });
              return t.climateYears ? `Climate: about ${t.climateYears[0]} to ${t.climateYears[1]} years of driving at your distance. Never in the francs.` : "Climate, by distance driven, from the federal study. Never in the francs.";
            })()}</span>
          </button>
          <p className="mt-3 text-sm leading-relaxed">
            <span className="font-medium">{paybackTitle(result)}.</span>{" "}
            {result.paybackYears == null || result.saving <= 40
              ? "The green line never comes down to the dashed one. Running it does not cost less."
              : result.withinHorizon
                ? "The green line starts higher, then crosses the dashed one. That crossing is the payback. Nobody sends you the difference."
                : "The green line is still above the dashed one at the right edge. The crossing is later than this picture."}
          </p>
        </div>

        <NextMove
          ranked={ranked}
          outcomes={outcomes}
          onOutcome={onOutcome}
          onCopy={(text) => void navigator.clipboard?.writeText(text)}
          onRemind={() => {
            onAction("reminder");
            downloadReminder();
          }}
          onTry={(item) => {
            const a = item.action;
            if (a.lever && !result.toggles[a.lever]) {
              onAction("try_lever");
              onFlip(a.lever);
            }
            openPanel(a.panel ?? "whatif", a.lever ? "chart" : "explore");
          }}
        />

        <ExploreTabs panels={PANELS} value={panel} onChange={(id) => openPanel(id, null)}>
          {panel === "whatif" ? (
            sens ? (
              <WhatIf
                result={result}
                sens={sens}
                picks={picks}
                onPick={(id, v) => setPicks((prev) => ({ ...prev, [id]: v }))}
                onReset={() => setPicks({})}
                scenario={scen}
                rows={datasetRows}
              >
          <details className="mt-4 border-t border-line pt-1">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-spruce">Switches, what you use the car for, and what would have to be true</summary>
            <div className="mt-2 flex flex-col gap-4">
        {leversSection}

        <WhatWouldHaveToBeTrue
          result={result}
          onTry={(key) => {
            onAction("try_lever");
            onFlip(key);
          }}
        />

            </div>
          </details>
              </WhatIf>
            ) : (
              <>
        {leversSection}

              </>
            )
          ) : null}
          {panel === "week" ? (
            <>
        <OrdinaryWeek result={result} />

        <section className="rounded-2xl border border-line bg-card p-4 lg:p-5">
          <h2 className="font-medium">Where a year of running goes</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Francs a year, line by line. The purchase price and the extra cash at the start are not in these bars.</p>
          <div className="mt-4">
            <CostBars parts={result.parts} />
          </div>
        </section>

        <YearSplit parts={result.parts} cash={result.cash} />
        <ChargeMix blend={result.blend} homeOfficial={result.homeOfficial} place={result.official?.place ?? null} />

        <div className="rounded-2xl bg-amber px-4 py-3 text-sm leading-relaxed text-amber-ink">{result.aha}</div>

            </>
          ) : null}
          {panel === "place" ? (
            <>
        <LocalPerson
          canton={canton}
          cantonState={cantonState}
          onCanton={onCanton}
          onPostcode={onPostcode}
          place={result.official?.place ?? null}
          grain={grain}
          settlement={settlement}
          onSettlement={onSettlement}
          postcodeSet={postcodeSet}
        />

        <RightsCard rows={rights} tenure={tenure} onTenure={onTenure} hint={tenureHint} />

        <ChargeCheck
          setup={chargeSetup}
          onSetup={(next) => {
            if (!setupDone(chargeSetup) && setupDone(next)) onAction("charge_check");
            onChargeSetup(next);
          }}
          workAccess={result.answers.workAccess}
          parking={result.answers.parking}
          kwhPer100={SPECS[result.bevClass].kwh}
          onNext={() => document.getElementById("next-move")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        />
        <WatchList rows={watch} onFact={onFact} today={new Date().toISOString().slice(0, 10)} />

        <section>
          <h2 className="font-medium">If the number is not the whole worry</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            These are not priced, and they do not talk you into a car. Each page says what the worry is protecting, what is dated, and what this check will not pretend.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button type="button" onClick={() => onFact("tenant-right")} className="min-h-12 rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium">
              The building might say no
            </button>
            <button type="button" onClick={() => onFact("winter")} className="min-h-12 rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium">
              Winter, and the long trip
            </button>
            <button type="button" onClick={() => onFact("not-for-me")} className="min-h-12 rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium">
              I simply do not want one
            </button>
          </div>
        </section>
            </>
          ) : null}
          {panel === "climate" ? (
            <div id="climate" className="scroll-mt-4 flex flex-col gap-4">
              <TwoPaybacksCard result={result} onFact={onFact} onSource={() => openPanel("sources", "how-payback")} />
              <ClimateLine alreadyElectric={result.answers.fuel === "electric"} km={result.answers.km} />
            </div>
          ) : null}
          {panel === "sources" ? (
            <>
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

        <Glossary id="glossary" />

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
                The same five steps can later run in n8n. Nothing in n8n runs yet. A TypeSafe node would replace only the situation, and only with a closed choice. It does not write a paragraph and it does not price the car. The price stays in this browser. Reaching this page stores the taps and the numbers, rounded to bands. A postcode is stored only if you type one, and apart from the rest. No name, no sentence.
              </p>
              <ol className="mt-3 space-y-2 text-sm">
                <li>1 · Form — your taps</li>
                <li>2 · TypeSafe choice — situation, not a recommendation</li>
                <li>3 · Code — payback, in the browser</li>
                <li>4 · Switch — finite options, including 2:1 and a mobile charger</li>
                <li>5 · Postgres — one session bag, no name; a postcode only if you add it</li>
              </ol>
            </div>
          ) : null}
        </section>

        <section>
          <h2 className="font-medium">Did something not make sense?</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Tap one. It is saved with your record, under a random session number. There is no message box and no reply.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                ["km", "The distance was a guess"],
                ["payback", "I do not understand the payback"],
                ["price", "A price here looks wrong"],
                ["wording", "Something was unclear"],
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

        <p className="text-sm">
          <Link to="/method" className="inline-block min-h-11 py-3 font-medium text-spruce underline">
            How the check works, every figure and what it leaves out
          </Link>
        </p>
            </>
          ) : null}
        </ExploreTabs>

        {result.headline === "Keep this car" && result.usedCeiling ? <UsedPriceCard result={result} /> : null}

        <div className="rounded-2xl border border-line bg-card px-4 py-3">
          <span className="block text-xs font-medium tracking-widest text-muted uppercase">This case</span>
          <span className="mt-1 block text-sm">
            {labelClass(result.iceClass)} · {labelFuel(result.answers.fuel ?? "petrol")} · {kmPhrase(result.answers.km, result.km, result.kmSource === "default" ? result.persona.title : undefined)} ·{" "}
            {parkPhrase(result.answers.parking)}
            {" · "}
            {canton ? `Canton ${canton}` : "no canton yet"}
            {tenure ? ` · ${tenure === "own" ? "owner" : "tenant"}` : ""}
          </span>
          <span className="mt-1 flex flex-wrap gap-x-5">
            <button type="button" onClick={onEdit} className="min-h-11 text-sm font-medium text-spruce underline underline-offset-2">
              Edit answers
            </button>
            <button
              type="button"
              onClick={() => openPanel("place", "place")}
              className="min-h-11 text-sm font-medium text-spruce underline underline-offset-2"
            >
              Add canton, postcode, own or rent
            </button>
            <button
              type="button"
              onClick={() => {
                onAction("dossier");
                printDossier();
              }}
              className="min-h-11 text-sm font-medium text-spruce underline underline-offset-2"
            >
              Decision file
            </button>
          </span>
        </div>

        <div id="keep" className="flex flex-col gap-4">
        <section id="decision-file-card" className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-medium">Take it with you</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            One page to print or save as a PDF: your result, the figures it used, questions for a seller, the battery certificate fields, lease questions and empty boxes for the model and the quote. Made on this device. Nothing is sent.
          </p>
          <button
            type="button"
            onClick={() => {
              onAction("dossier");
              printDossier();
            }}
            className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-spruce font-medium text-spruce-ink"
          >
            <Download className="h-4 w-4" />
            Print or save the decision file
          </button>
        </section>

        <details className="rounded-2xl border border-line bg-card px-4">
          <summary className="min-h-12 cursor-pointer py-3 text-sm font-medium">Share it, set a reminder, or keep a copy</summary>
          <div className="flex flex-col gap-4 pb-4">
            <ShareNote result={result} onAction={onAction} />
        <section id="plan" className="border-t border-line pt-4">
          <h2 className="font-medium">Keep the plan</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {sent === "sending"
              ? "Updating the stored plan…"
              : sent === "failed"
                ? "Not stored. The plan below is still the current case."
                : forgotten === "done"
                  ? "Deleted. Nothing about this visit is stored any more, and nothing will be until you start again."
                  : "Stored, as bands. It follows every change on this page. No name, no sentence."}
          </p>
          <pre tabIndex={0} aria-label="The plan as text, scrollable" className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap [overflow-wrap:anywhere] rounded-2xl bg-sheet p-3 text-sm leading-relaxed">{planText(result)}</pre>
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
            <button type="button" onClick={onForget} disabled={forgotten === "working" || forgotten === "done"} className="h-12 rounded-full border border-line bg-sheet font-medium disabled:opacity-50">
              {forgotten === "working" ? "Deleting" : forgotten === "done" ? "Deleted" : "Delete what is stored about this visit"}
            </button>
            {forgotten === "failed" ? <p role="status" className="text-sm text-muted">That did not work. Try again in a moment.</p> : null}
          </div>
        </section>
          </div>
        </details>

        <MoreToExplore tenure={tenure} />
        <InPerson canton={canton} load={onLoadEvents} />

        </div>

        <p className="text-xs leading-relaxed text-muted">
          Indicative only. Not financial, insurance, tax or purchase advice. Prices marked as placeholders are not live tariffs or a dealer offer. Climate, winter range and data security are not in the francs and are not calculated for your car.
        </p>

        <button type="button" onClick={onReset} className="flex h-11 items-center justify-center gap-2 text-sm font-medium text-muted">
          <RotateCcw className="h-4 w-4" />
          Start again
        </button>
        </div>
      </div>
      <DecisionFile
        result={result}
        verdict={verdictSetup}
        drivers={(sens?.drivers ?? []).slice(0, 3).map((d) => d.label)}
        caseLine={`${labelClass(result.iceClass)} · ${labelFuel(result.answers.fuel ?? "petrol")} · ${kmPhrase(result.answers.km, result.km, result.kmSource === "default" ? result.persona.title : undefined)} · ${parkPhrase(result.answers.parking)}`}
        origin={typeof window === "undefined" ? "" : window.location.origin}
      />
      {sheetKind ? <NumberSheetModal sheet={numberSheet(sheetKind, result, datasetRows)} version={datasetVersion} onClose={() => setSheetKind(null)} /> : null}
      <ActionBar
        note={barNote}
        onShare={() => {
          onAction("share");
          void shareOrCopy(shareText(result)).then((how) => {
            setBarNote(how === "copied" ? "Copied. Paste it where you like." : how === "failed" ? "Could not share from here. Use “Ask someone else” below." : null);
          });
        }}
        onChange={() => openPanel("whatif", "explore")}
        onDetails={() => openPanel("sources", "explore")}
      />
    </div>
  );
}

const PANELS: PanelDef[] = [
  { id: "whatif", label: "What if" },
  { id: "week", label: "My week" },
  { id: "place", label: "My place" },
  { id: "climate", label: "Climate" },
  { id: "sources", label: "Sources" },
];

function downloadReminder() {
  const url = window.location.hostname === "localhost" ? null : window.location.origin;
  const blob = new Blob([revisitIcs(new Date(), 6, url)], { type: "text/calendar" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "bev-navigator-reminder.ics";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}

function printDossier() {
  document.body.classList.add("print-dossier");
  const done = () => {
    document.body.classList.remove("print-dossier");
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  window.setTimeout(() => window.print(), 60);
}

function TwoPaybacksCard({ result, onFact, onSource }: { result: Result; onFact: (fact: FactKey) => void; onSource: () => void }) {
  const horizon = result.series.length - 1;
  const t = twoPaybacks({ cash: result.cash, saving: result.saving, km: result.km, horizon, alreadyElectric: result.answers.fuel === "electric" });
  const lo = SOURCES["bfe-2020"];
  const hi = SOURCES["energieschweiz-oekobilanz"];
  return (
    <section className="rounded-2xl border border-line bg-card p-4" aria-labelledby="two-paybacks-title">
      <h2 id="two-paybacks-title" className="font-medium">
        Two paybacks, two units
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">Money pays back in years of owning the car. The climate pays back in kilometres driven. They are different questions, and neither is in the other.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-sheet p-3">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Money</p>
          <p className="font-serif mt-1 text-xl leading-snug">{paybackTitle(result)}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t.monthlyExtra != null && t.monthlyGain != null
              ? `Spread over the ${horizon} years, the extra price is about ${chf(t.monthlyExtra)} a month, before interest. Cheaper running gives back about ${chf(t.monthlyGain)} a month. When the second is bigger, the switch pays for itself inside the picture.`
              : t.monthlyExtra != null
                ? `Spread over the ${horizon} years, the extra price is about ${chf(t.monthlyExtra)} a month, before interest. On these figures running does not cost less, so nothing gives it back.`
                : "On these figures there is no extra price to cover."}
          </p>
        </div>
        <div className="rounded-xl bg-sheet p-3">
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Climate</p>
          {t.climateYears ? (
            <>
              <p className="font-serif mt-1 text-xl leading-snug">
                About {t.climateYears[0]} to {t.climateYears[1]} years of driving
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                An electric car is built with more emissions, mostly the battery. Driving makes that up after about 30,000 km in one federal factsheet and about 50,000 km for one pair of cars in another. At your {result.km.toLocaleString("de-CH")} km a year, that is the range shown.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {result.answers.fuel === "electric" ? "You already drive electric, so that production is already behind you." : "Not shown: the distance is too low or unknown to say."}
            </p>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Studies, cars and electricity mixes give different distances, and this is not calculated for your car. It never changes the francs, and there is no personal figure in kilograms.{" "}
        <a className="font-medium text-spruce underline" href={lo.url} target="_blank" rel="noopener noreferrer">{lo.publisher}, {lo.published}</a>
        {" · "}
        <a className="font-medium text-spruce underline" href={hi.url} target="_blank" rel="noopener noreferrer">EnergieSchweiz, life-cycle page</a>
      </p>
      <details className="mt-2 text-sm">
        <summary className="min-h-11 cursor-pointer py-2 font-medium text-spruce">A company writes a car off. Why not you?</summary>
        <p className="leading-relaxed text-muted">
          A company spreads the price of a car over a few years as a yearly cost, because that is how its accounts work. A household pays the price, or a loan, and later gets back what the car sells for. What it loses is the difference, the value loss, and it is the biggest cost of a car. So this check asks how long cheaper running takes to cover the extra price, and what happens if you sell sooner.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onFact("value-loss")} className="min-h-11 rounded-full border border-spruce px-4 text-sm font-medium text-spruce">
            What value loss means
          </button>
          <button type="button" onClick={onSource} className="min-h-11 rounded-full border border-line px-4 text-sm font-medium">
            The payback sum, step by step
          </button>
        </div>
      </details>
    </section>
  );
}

function ClimateLine({ alreadyElectric, km }: { alreadyElectric: boolean; km: KmBand | null }) {
  const src = SOURCES["bfe-2025"];
  // The federal study's three zones on one yearly-distance scale. The person's own band is lit. No francs, no personal kilograms.
  const MAX = 24000;
  const zones = [
    { from: 0, to: 4500, label: "Under about 4,000 to 5,000: usually not worth it", fill: "bg-line" },
    { from: 4500, to: 8000, label: "In between: depends on the car", fill: "bg-amber" },
    { from: 8000, to: MAX, label: "From about 8,000: almost always worth it", fill: "bg-moss" },
  ];
  const band = km === "lt10" ? [0, 10000] : km === "mid" ? [10000, 20000] : km === "gt20" ? [20000, MAX] : null;
  const pct = (n: number) => `${(n / MAX) * 100}%`;
  const line =
    km === "lt10"
      ? "Your band crosses the line. Under about 4,000 to 5,000 km a year the study finds replacing usually is not justified. Above about 8,000 it almost always is. In between it depends on the two cars."
      : km === "mid" || km === "gt20"
        ? "At your distance the study finds replacing a combustion car with a new electric car almost always lowers greenhouse gases."
        : "You were not sure of your distance, so no zone is lit. From about 8,000 km a year the study finds replacing almost always lowers greenhouse gases.";
  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <h2 className="font-medium">Climate, beside the money</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">A separate question from the francs. It never changes the payback. This is what the federal study found for a switch, by distance driven.</p>
      <div className="mt-4" role="img" aria-label={`Yearly distance from 0 to 24,000 km. Under about 4,000 to 5,000 usually not worth it for the climate, in between depends on the car, from about 8,000 almost always worth it.${band ? " Your distance band is marked." : ""}`}>
        <div className="relative h-8 overflow-hidden rounded-full">
          {zones.map((z) => (
            <span key={z.label} className={`absolute top-0 h-8 ${z.fill}`} style={{ left: pct(z.from), width: pct(z.to - z.from) }} />
          ))}
          {band ? <span className="absolute top-1 h-6 rounded-full border-2 border-spruce bg-spruce/15" style={{ left: pct(band[0]), width: pct(band[1] - band[0]) }} /> : null}
        </div>
        <div className="relative mt-1 h-4 text-[11px] tabular-nums text-muted">
          {[0, 8000, 16000, 24000].map((n) => (
            <span key={n} className="absolute -translate-x-1/2" style={{ left: pct(n) }}>
              {n === 0 ? "0" : `${n / 1000}k`}
            </span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs leading-snug">
          {zones.map((z) => (
            <span key={z.label} className="flex items-start gap-1.5">
              <span className={`mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-line ${z.fill}`} aria-hidden />
              {z.label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed">{line}</p>
      <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-muted">
        <li>
          <span className="font-medium text-ink">About 92 percent</span> of the car pairs the study compared save greenhouse gases when the combustion car is replaced by a new electric car of the same class.
        </li>
        <li>
          The battery is about a fifth of an electric car&apos;s lifetime emissions. It is paid back by driving, which is why distance matters.
        </li>
        <li>
          {alreadyElectric
            ? "You already drive electric. The study's advice on size and green electricity still applies."
            : "Replacing an older car saves as much per kilometre as replacing a newer one. The older one just has fewer kilometres left."}
        </li>
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        The study counts a 16-year life and 200,000 km, so the climate picture is longer than the 8-year window used for the money. It uses the Swiss consumer electricity mix. Green electricity does better. It does not cover the car you keep.
      </p>
      <a className="mt-2 inline-block min-h-11 py-2 text-sm font-medium text-spruce underline" href={src.url} target="_blank" rel="noopener noreferrer">
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
  const here = typeof window === "undefined" || /^(localhost|127\.|\[)/.test(window.location.hostname) ? null : window.location.origin;
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
    here ? `Check your own week: ${here}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function PictureCard({ result, text, onAction }: { result: Result; text: string; onAction: (action: Action) => void }) {
  const [pic, setPic] = useState<{ url: string; blob: Blob } | null>(null);
  const [state, setState] = useState<"idle" | "making" | "failed">("idle");
  const url = pic?.url;
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  const make = async () => {
    onAction("picture");
    setState("making");
    try {
      const host = /^(localhost|127\.|\[)/.test(window.location.hostname) ? null : window.location.host;
      const blob = await cardBlob(result, host);
      setPic({ url: URL.createObjectURL(blob), blob });
      setState("idle");
    } catch {
      setState("failed");
    }
  };
  const file = pic ? new File([pic.blob], "bev-navigator.png", { type: "image/png" }) : null;
  const canShareFile = Boolean(file && typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] }));
  const btn = "flex min-h-12 items-center rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium";
  if (!pic) {
    return (
      <button type="button" onClick={() => void make()} disabled={state === "making"} className={btn}>
        {state === "making" ? "Making the picture" : state === "failed" ? "Could not make a picture. Try again" : "Make a picture to share"}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <img src={pic.url} alt={text} className="w-full rounded-2xl border border-line" />
      <p className="text-xs leading-relaxed text-muted">Made on this phone. No name, no place, no postcode. Nothing is uploaded.</p>
      {canShareFile && file ? (
        <button
          type="button"
          onClick={() => void navigator.share({ files: [file], text }).catch(() => undefined)}
          className={btn}
        >
          Share the picture
        </button>
      ) : null}
      <a href={pic.url} download="bev-navigator.png" className={btn}>
        Save the picture
      </a>
    </div>
  );
}

function ShareNote({ result, onAction }: { result: Result; onAction: (action: Action) => void }) {
  const [copied, setCopied] = useState(false);
  const text = shareText(result);
  return (
    <section>
      <h2 className="font-medium">Ask someone else</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        The note is both years, the money at the start, the worry you named, and the next step. Not where you park. Nothing is sent until you send it.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onAction("share")}
          className="flex min-h-12 items-center rounded-2xl border border-line bg-card px-4 text-sm font-medium"
        >
          WhatsApp
        </a>
        <button
          type="button"
          onClick={() => {
            onAction("share");
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
        <PictureCard key={`${result.headline}-${result.annualKeep}-${result.annualSwap}-${result.cash}`} result={result} text={text} onAction={onAction} />
        <button
          type="button"
          onClick={() => {
            onAction("reminder");
            downloadReminder();
          }}
          className="flex min-h-12 items-center rounded-2xl border border-line bg-card px-4 text-left text-sm font-medium"
        >
          Remind me in six months (a calendar file)
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
  settlement,
  onSettlement,
  postcodeSet,
}: {
  canton: string | null;
  cantonState: "idle" | "loading" | "failed";
  onCanton: (code: string | null) => void;
  onPostcode: (plz: string) => Promise<void>;
  place: string | null;
  grain: "municipality" | null;
  settlement: "city" | "town" | "rural" | null;
  onSettlement: (v: "city" | "town" | "rural" | null) => void;
  postcodeSet: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [plz, setPlz] = useState("");
  const SETTLEMENTS = [
    ["city", "In a city"],
    ["town", "Town or agglomeration"],
    ["rural", "Countryside"],
  ] as const;
  return (
    <section id="place" className="rounded-2xl border border-line bg-card p-4 lg:p-5">
      <h2 className="font-medium">Make it local</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {grain === "municipality" && place
          ? `The home price is now the ElCom figure for ${place}. The tax is the TCS figure for the canton, not your registration.`
          : place && place !== "Switzerland"
            ? `The home price is now the ElCom mean for ${place}. The tax is the TCS figure for the nearest published car in that canton, not your registration.`
            : "Electricity prices, taxes and charging rules differ by canton and by commune. Tell us roughly where you live and the home price changes to your area. It is optional."}
      </p>

      <p className="mt-4 text-sm font-medium">Where do you live?</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {SETTLEMENTS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={settlement === id}
            onClick={() => onSettlement(settlement === id ? null : id)}
            className={`min-h-12 rounded-2xl border px-4 text-left text-sm font-medium ${settlement === id ? "border-spruce bg-spruce text-spruce-ink" : "border-line bg-card"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex gap-2"
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
          Use my postcode
        </button>
      </form>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {postcodeSet ? "Postcode added. Stored apart from your answers, with no name." : "Optional. Skip it and nothing changes."}
      </p>
      <details className="mt-1 text-sm text-muted">
        <summary className="min-h-8 cursor-pointer py-1 font-medium text-spruce">What happens to it?</summary>
        <p className="leading-relaxed">
          A postcode is stored apart from your answers, so we can count where information is missing. We ask for no name and no address, and nobody can look you up from it. It is deleted automatically after twelve months. Anything shown to others covers at least ten people.
        </p>
        <p className="leading-relaxed">
          The postcode is matched to its municipality on your device, with the official list of the Federal Office of Topography ({POSTCODE_SOURCE.credit},{" "}
          <a className="font-medium text-spruce underline" href={POSTCODE_SOURCE.url} target="_blank" rel="noopener noreferrer">{POSTCODE_SOURCE.title}</a>). Only the municipality number is sent to read its electricity price. A postcode can cover more than one municipality; the one with most addresses is used.
        </p>
      </details>

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
          <span className="block text-sm font-medium">Your commune&apos;s own page</span>
          <span className="mt-0.5 block text-sm leading-snug text-muted">EnergieSchweiz directory. Local grants and rules sit there, not in this sum.</span>
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

const SoFarContext = createContext<{ result: Result } | null>(null);

function SoFar({ result, step }: { result: Result; step: Step }) {
  const [pick, setPick] = useState<"study" | "yours" | "far">("yours");
  const years = result.paybackYears;
  const ready = Boolean(result.answers.carClass && result.answers.fuel && result.answers.km);
  const width = !ready || years == null ? 0 : (Math.min(years, 32) / 32) * 100;
  const waiting =
    step === "class"
      ? "The class sets the price and the fuel. A year before that would not be your car."
      : step === "fuel"
        ? "The fuel sets that line. The year waits until the distance is yours too."
        : "The distance band is the piece that moves the year. It is not an odometer reading.";
  if (!ready) {
    // Until the distance is chosen there is no year to show. Say why in two lines, not in a half-empty gauge.
    return (
      <div className="border-t border-line bg-card px-5 py-3">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">The year waits</p>
        <p className="mt-1 text-sm leading-snug text-muted">{waiting}</p>
      </div>
    );
  }
  const spot = !ready || years == null ? null : (Math.min(years, 32) / 32) * 100;
  const checkpoints = [
    { id: "study" as const, label: "Year 8", sub: "the study's window", at: 25 },
    { id: "yours" as const, label: years == null ? "No year" : `Year ${Math.max(1, Math.ceil(years))}`, sub: "your car", at: spot },
    { id: "far" as const, label: "Year 32", sub: "the far end", at: 100 },
  ];
  const sentence =
    pick === "study"
      ? "A federal cost study counted 8 years for a newly bought car. It is the window the headline uses. It is not a promise."
      : pick === "far"
        ? "The far end of this gauge. A payback beyond 32 years shows as past it."
        : years == null
          ? "No year. On these figures switching does not cost less to run, so nothing covers the extra price."
          : years > 32
            ? "Past 32 years on this picture. Past the study's window, you would need to keep the car longer than the study used. This is not money you receive."
            : years > 8
              ? "Past the study's window: you would need to keep the car longer than the study used. This is not money you receive."
              : "Inside the study's window. This is not money you receive.";
  return (
    <div className="border-t border-line bg-card px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted uppercase">Years to cover the extra price</p>
          <p className="font-serif mt-1 text-2xl tabular-nums leading-none">{paybackTitle(result)}</p>
        </div>
        <p className="max-w-48 text-right text-sm leading-snug text-muted">
          {result.answers.km === "unsure"
            ? `${chf(result.annualSwap)} a year. Distance is a typical figure, and it stays labelled.`
            : `${chf(result.annualSwap)} a year if you switch.`}
        </p>
      </div>
      <div className="relative mt-4 h-2 rounded-full bg-line" aria-hidden>
        <div
          className="h-full rounded-full bg-spruce motion-safe:transition-[width] motion-safe:duration-500"
          style={{ width: `${width}%` }}
        />
        {checkpoints.map((c) =>
          c.at == null ? null : (
            <span
              key={c.id}
              className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 motion-safe:transition-[left] motion-safe:duration-500 ${
                c.id === "yours" ? "border-spruce bg-spruce" : "border-ink bg-card"
              } ${pick === c.id ? "ring-4 ring-spruce/20" : ""}`}
              style={{ left: `${c.at}%` }}
            />
          ),
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Three checkpoints on the way to the payback year">
        {checkpoints.map((c) => {
          const on = pick === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPick(c.id)}
              className={`min-h-14 rounded-2xl border px-2 py-2 text-left ${on ? "border-spruce bg-moss text-moss-ink" : "border-line bg-sheet"}`}
            >
              <span className="block text-sm font-medium tabular-nums">{c.label}</span>
              <span className="block text-xs leading-tight text-muted">{c.sub}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-sm leading-snug text-muted" aria-live="polite">
        {sentence}{" "}
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
    prompt: "Public charging uses the TCS 2026 average, not a live price. Providers differ by half or more.",
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
    prompt: "Open “My place” on the result to pick a canton or add a postcode. It changes the tax line and the home price, and it is still not a tax assessment.",
    chips: [],
  },
  "local-grant": {
    prompt: "Open “My place” on the result and add a postcode to get your commune's page. A grant that might already be used up still would not belong in this sum.",
    chips: [],
  },
  "wait-or-not": {
    prompt: "Your result already shows what a year of the car you have costs to run. That is the price of waiting. Open “What if” to see how sure it is.",
    chips: [],
  },
  "car-data": {
    prompt: "This sheet changes no answer. The message to ask the maker is in “Your next move” when trust is what holds you back.",
    chips: [],
  },
  "value-loss": {
    prompt: "Your result already counts the sale price at the end. Open “What if” to see what a few thousand francs more or less would do.",
    chips: [],
  },
  leasing: {
    prompt: "This check prices no lease. If you are offered one, the questions above are the ones to get answered in writing.",
    chips: [],
  },
  "test-drive": {
    prompt: "This sheet changes no answer. If you can try the car for two days, your charging check on the result is the list of what to try.",
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
        {view.diagram === "year-days" ? <YearDays /> : null}
        {view.diagram === "battery-age" ? <BatteryAge /> : null}
        {view.figure ? (
          <div className="mt-5 rounded-2xl border border-line bg-card p-4">
            <p className="font-serif text-5xl tabular-nums leading-none">{view.figure.value}</p>
            {view.figure.fill != null ? (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={view.figure.caption}>
                <div className="h-full rounded-full bg-spruce" style={{ width: `${Math.round(view.figure.fill * 100)}%` }} />
              </div>
            ) : null}
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
        {view.links?.length ? (
          <ul className="mt-4 flex flex-col gap-2">
            {view.links.map((l) => (
              <li key={l.href}>
                <a className="block rounded-2xl border border-line bg-card px-4 py-3" href={l.href} target="_blank" rel="noopener noreferrer">
                  <span className="block text-sm font-medium text-spruce underline underline-offset-2">{l.name}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted">{l.note}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-muted">{fact.source}</p>
        {fact.url && !view.links?.some((l) => l.href === fact.url) ? (
          <a className="mt-1 inline-block min-h-11 py-2 text-sm font-medium text-spruce underline" href={fact.url} target="_blank" rel="noopener noreferrer">
            {fact.linkName ?? fact.title}
          </a>
        ) : null}
        <p className="mt-1 text-sm text-muted">
          Checked {when}.{olderThanUsual(factKey, fact.as_of) ? " Older than usual for this kind of fact, so look at the source before you rely on it." : ""}
        </p>
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
