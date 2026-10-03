-- The range figure in the winter fact: the gfs.bern report prints 78 percent in its summary and 79 percent in the detail
-- (page 20), and the 79 is for voters who would NOT buy a pure electric car, not for all people. Wording corrected.
update bev_facts set
  body = $b$In the gfs.bern Mobility Monitor of September 2025, 79 percent of voters who would not buy a pure electric car called its limited range a very or rather important reason. The report’s own summary prints 78. This is 1,002 voters, asked in June and July 2025 for auto-schweiz, the importers’ body. It is not a count of all drivers. This check does not apply a winter factor to the kilometres or the francs. One percentage would pretend to be their road, their speed and their heater. What can be checked is narrower: the longest trip they actually take in winter, whether that trip is rare enough to borrow, and a measured consumption on that kind of day. Not the brochure figure. If the ordinary week is fine and the worry is one trip, that is the smaller-car question, not a reason to size the car for the worst day.$b$,
  source = $s$gfs.bern Mobility Monitor, 13 September 2025, page 20 for the 79 percent (page 4 prints 78). Commissioned by auto-schweiz. This model still has no winter factor.$s$,
  as_of = '2026-10-03'
where key = 'winter';
