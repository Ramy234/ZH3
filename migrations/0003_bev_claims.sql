insert into bev_facts (key, title, body, source, as_of, status) values
(
  'tenant-right',
  'What a tenant can ask for, today',
  'There is no general right to a charger. Article 260a of the Code of Obligations lets a tenant change the rented space only with the landlord written consent. A bay is for parking a car. Charging it is not yet treated as that ordinary use. A draft change to the Energy Act, in consultation until 12 October 2026, would let a person who lives in the building, and whose bay came with the home, require a basic installation: a supply line, a way to meter use, and load management where needed. In the draft the owner pays for that basic work and may pass the cost into the parking rent. The user pays for the charging point itself. The work must stay reasonable. This is not law. It does not cover a workplace, and it does not decide a mobile charger in one building. Ask in writing, and keep the answer.',
  'Federal Council consultation opened 19 June 2026, Motion 23.3936. Article 260a CO as in force. Not legal advice.',
  '2026-10-02',
  'draft'
),
(
  'winter',
  'Winter range is a real trip, not a slogan',
  'In the gfs.bern Mobility Monitor of September 2025, 78 percent of people still named range as a concern. This check does not apply a winter factor to the kilometres or the francs. One percentage would pretend to be their road, their speed and their heater. What can be checked is narrower: the longest trip they actually take in winter, whether that trip is rare enough to borrow, and a measured consumption on that kind of day. Not the brochure figure. If the ordinary week is fine and the worry is one trip, that is the smaller-car question, not a reason to size the car for the worst day.',
  'gfs.bern Mobility Monitor, 13 September 2025, for the 78 percent. This model still has no winter factor.',
  '2026-10-02',
  'dated'
),
(
  'not-for-me',
  'Not wanting one is allowed',
  'A feeling is not a calculation error. People refuse a switch because the car is part of how they see themselves, because a bad story travelled further than a good one, or because the decision is not theirs alone. This check will not talk them out of that. It separates two things. The francs are a model. The refusal does not have to move. If the number says the switch does not pay, the feeling and the money agree. If the number says it does pay, the feeling can still win. Write that down as a choice. Do not correct it as ignorance.',
  'Project stance, October 2026. Not a psychological diagnosis.',
  '2026-10-02',
  'stance'
)
on conflict (key) do nothing;
