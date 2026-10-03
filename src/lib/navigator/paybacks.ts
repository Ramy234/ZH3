// The two paybacks beside each other. Money pays back in years, the climate in kilometres. Pure sums on figures that are
// already on the page or in a dated federal source. Nothing here enters the francs, and there is no personal kilogram.

/** Kilometres after which an electric car has made up its higher production emissions, as federal sources state them. */
export const CLIMATE_KM = {
  low: 30000,
  high: 50000,
  lowSource: "bfe-2020",
  highSource: "energieschweiz-oekobilanz",
} as const;

export type TwoPaybacks = {
  /** The extra price spread over the window, a month at a time, before any interest. Null when there is no extra price. */
  monthlyExtra: number | null;
  /** What cheaper running gives back each month. Null when running does not cost less. */
  monthlyGain: number | null;
  /** Years of driving at this distance until the production emissions are made up, from the low and the high source figure. */
  climateYears: [number, number] | null;
};

const tenth = (n: number) => Math.round(n * 10) / 10;

export function twoPaybacks(r: { cash: number; saving: number; km: number; horizon: number; alreadyElectric: boolean }): TwoPaybacks {
  const months = Math.max(1, r.horizon) * 12;
  return {
    monthlyExtra: r.cash > 0 ? Math.round(r.cash / months) : null,
    monthlyGain: r.saving > 40 ? Math.round(r.saving / 12) : null,
    climateYears: !r.alreadyElectric && r.km >= 1000 ? [tenth(CLIMATE_KM.low / r.km), tenth(CLIMATE_KM.high / r.km)] : null,
  };
}
