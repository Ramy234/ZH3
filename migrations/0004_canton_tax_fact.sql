insert into bev_facts (key, title, body, source, as_of, status) values
(
  'canton-tax',
  'The tax in this check is not your canton',
  'Cantons do not tax a car the same way. A TCS comparison from February 2026, still the reference used in 2026 roundups, put one electric car at 0 francs a year in Glarus, Solothurn and Zurich, and at 921 francs in Fribourg. A smaller electric car in the same comparison paid much less. Geneva dropped its electric exemption in 2025. Glarus and Solothurn have said theirs ends in 2027. This check uses one illustrative tax per car class. It does not ask where you live. A postcode can identify a household, and a list of 26 cantons would be another form before you have seen a number. A dated canton table can replace the placeholder later, and only if you choose to name the canton. Until then the gap stays labelled.',
  'TCS vehicle-tax comparison, February 2026. Not this model, and not a tax assessment.',
  '2026-10-02',
  'dated'
)
on conflict (key) do nothing;
