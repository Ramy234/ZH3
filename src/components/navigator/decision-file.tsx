// The decision file: one printed page for "a car like this". Built in the browser from the answers already on the screen, shown only
// when the person prints it (or saves it as a PDF). Nothing is sent anywhere. It has no car model: blank lines are for the person to
// fill in by hand when a seller gives them a concrete car. It is a record of how far this check got, not an offer and not advice.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ACTIONS_SEED } from "@/lib/navigator/actions";
import type { ChargeVerdict } from "@/lib/navigator/charging";
import { WATCH_SEED } from "@/lib/navigator/watch";
import { chf, paybackTitle, SOURCES, type Result } from "@/lib/navigator/model";

const BLANKS = ["Car (make, model, year)", "Vehicle identification number", "Price quoted, CHF", "Seller and date", "Battery certificate: date, kilometres, method, result", "Battery warranty left", "Notes"];

const LEASING = [
  "Residual value: who sets it, and what happens if the car is worth less at the end?",
  "Kilometres a year included, and the price of each extra kilometre.",
  "Early return: what does it cost, and when is it allowed?",
  "The battery: whose warranty applies, and does it pass to the next owner?",
];

export function DecisionFile({ result, caseLine, verdict, drivers, origin }: { result: Result; caseLine: string; verdict: ChargeVerdict | null; drivers: string[]; origin: string }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  const sellerQuestions = ACTIONS_SEED.find((a) => a.id === "ask-seller")?.template ?? "";
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return createPortal(
    <div id="decision-file" aria-hidden>
      <h1>My decision file, for a car like this</h1>
      <p className="df-sub">Made on {today} in my own browser. Nothing was sent anywhere. A record of one neutral check for Switzerland, not an offer and not advice.</p>

      <h2>The result</h2>
      <p className="df-strong">{result.headline}</p>
      {result.verdict.split("\n").map((l) => (
        <p key={l}>{l}</p>
      ))}
      <table>
        <tbody>
          <tr>
            <th scope="row">Keep the car, per year</th>
            <td>{chf(result.annualKeep)}</td>
          </tr>
          <tr>
            <th scope="row">Switch, per year</th>
            <td>{chf(result.annualSwap)}</td>
          </tr>
          <tr>
            <th scope="row">Extra money at the start</th>
            <td>{chf(result.cash)}</td>
          </tr>
          <tr>
            <th scope="row">Payback (reference window: 8 years)</th>
            <td>{paybackTitle(result)}</td>
          </tr>
        </tbody>
      </table>

      {result.usedCeiling ? (
        <>
          <h2>If I look at used electric cars: the price to watch for</h2>
          <p>
            {result.usedCeiling.saving <= 40
              ? `On running costs alone nothing covers the extra price. A certified used one comes out even at about ${chf(result.usedCeiling.chf)}.`
              : `To cover its extra price inside ${result.usedCeiling.window} years on these figures, a certified used one would have to cost no more than about ${chf(result.usedCeiling.chf)}.`}{" "}
            The class reference for a used one is {chf(result.usedCeiling.classUsed)}. Worked out from my car's resale ({chf(result.usedCeiling.resale)}), the yearly saving ({chf(result.usedCeiling.saving)}) times {result.usedCeiling.window} years, minus charging gear and battery check ({chf(result.usedCeiling.gear)}). A class figure, not a listing.
          </p>
        </>
      ) : null}

      <h2>What I told the check</h2>
      <p>{caseLine}</p>
      {drivers.length ? <p>Figures that move this result most: {drivers.join(", ")}.</p> : null}
      <p>
        Charging set-up: {verdict ? `${verdict.title}. ${verdict.text}` : "not checked."}
      </p>

      <h2>Figures it used, and who they came from</h2>
      <ul>
        {result.assumptions.map((s) => (
          <li key={s.label}>
            {s.label}: {s.value} ({s.tag})
          </li>
        ))}
      </ul>
      <p className="df-small">
        Class figures and placeholders, not a quote. Every figure with its publisher and date: {origin}/method. Cost study window: {SOURCES["tco-2023"].title}, {SOURCES["tco-2023"].published}.
      </p>

      <h2>Five questions for any seller</h2>
      <ol>
        {sellerQuestions
          .replace(/^.*?Please tell me in writing:\s*/, "")
          .replace(/\s*Thank you\.$/, "")
          .split(/\s*\d\)\s*/)
          .filter(Boolean)
          .map((q) => (
            <li key={q}>{q}</li>
          ))}
      </ol>

      <h2>If it is a used car: the battery certificate</h2>
      <p>It should show four things: the date of the reading, the kilometres that day, the method (read from the car, not guessed from its age), and the state of health.</p>

      <h2>If it is a lease: four things to ask</h2>
      <ul>
        {LEASING.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>

      <h2>Rules still being decided (not law)</h2>
      <ul>
        {WATCH_SEED.map((w) => (
          <li key={w.id}>
            {w.title}. {w.source}. Looked at again after {w.nextCheck}.
          </li>
        ))}
      </ul>

      <h2>To fill in by hand</h2>
      <div className="df-blanks">
        {BLANKS.map((b) => (
          <div key={b}>
            <span>{b}</span>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
