// What the start page offers someone who has no car, does not want one, or already drives electric.
// Public sources first. Provider pages sit in their own labelled list, never beside a price.
export const NOT_DRIVING = {
  neutral: [
    {
      name: "Federal release on the travel-card price from 13 December 2026",
      href: "https://www.wbf.admin.ch/de/newnsb/AU8_APWrkLN5RPPMOlCGk",
      note: "The Price Supervisor with the public-transport industry, 4 August 2026. A year of the second-class travel card.",
    },
  ],
  providers: [
    {
      name: "SBB: travel card and subscriptions",
      href: "https://www.sbb.ch/de/abos-billette/abonnemente/generalabonnement.html",
      note: "The railway's own page, a provider and not a neutral source. It shows the price valid today.",
    },
    {
      name: "Mobility: car sharing",
      href: "https://www.mobility.ch/de",
      note: "A car-sharing co-operative, a provider and not a neutral source. Listed as an example of a car by the hour.",
    },
  ],
} as const;

export const FRIEND_TEXT = "Would an electric car already work for an ordinary week? A neutral check with Swiss figures: six taps, nothing to type, and keeping the car is a fair result.";
