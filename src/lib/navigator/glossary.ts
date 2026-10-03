// Plain words for the terms this check uses. No term here changes a figure; it only says what a word means.
// Kept as data so one list serves the Sources panel and the method page, and a test can pin it.
export type Word = { term: string; plain: string };

export const GLOSSARY: Word[] = [
  { term: "kWh (kilowatt-hour)", plain: "The unit electricity is sold in. A car that uses 18 kWh per 100 km needs 18 kWh to drive 100 km." },
  { term: "kW (kilowatt)", plain: "How fast energy flows, like litres per minute at a tap. A 11 kW wallbox adds about 11 kWh each hour at best." },
  { term: "AC and DC charging", plain: "AC is the slower kind, from a wallbox or a normal point, and the car converts it. DC is the fast kind at a motorway station, and the converting is done outside the car." },
  { term: "Wallbox", plain: "A fixed charging box on a wall, installed by an electrician. Faster and safer for daily use than a household socket." },
  { term: "Load management", plain: "A control that shares one building connection between several cars, so that no fuse trips and nobody has to charge at 3 a.m." },
  { term: "Battery health", plain: "How much of its original capacity a battery still has, as a percentage. A certificate should say when it was read, at how many kilometres, and how." },
  { term: "Residual value", plain: "What a car is expected to be worth at the end of a lease or a holding period. In a lease, who carries the risk if it is worth less is worth asking." },
  { term: "Payback year", plain: "The extra money at the start, divided by how much less a year costs. It is how long you must keep the car before you are not poorer for switching." },
  { term: "Class figure", plain: "One rough number for a whole class of car, such as a small car. Never a quote and never a particular model." },
  { term: "Placeholder", plain: "A figure used because no firm public figure exists. It is labelled as such and the result page shows how far the answer moves if it is off." },
  { term: "Gap", plain: "Something that stands between a person and a car that would work for them, such as no place to charge. The check names the gap, never blames the person." },
];
