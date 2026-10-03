-- The public-tariff fact now says what the public rate is (the TCS 2026 average) instead of calling it a placeholder.
update bev_facts set
  title = $t$Public charging prices differ a lot$t$,
  body = $b$There is no maintained Swiss feed of public charging prices. This check uses the TCS 2026 averages: about 59 rappen a kWh at a fast charger and 51 with a subscription. TCS lists AC charging at about 50 and 40. Providers differ by half or more, and roaming can add a lot. Swiss law requires the price in francs per unit, such as kWh or minutes, shown before and during charging. Check the operator in the app before you drive there. If most of your charging is at home, this price matters little. If you have no home charger, it matters most.$b$,
  source = $s$TCS, charging on the road, 2026 (page undated). Price-display rule: Preisbekanntgabeverordnung. Not a live tariff.$s$,
  url = 'https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/elektromobilitaet/elektroauto-unterwegs-laden.php',
  as_of = '2026-10-03',
  status = 'dated'
where key = 'public-tariff';
