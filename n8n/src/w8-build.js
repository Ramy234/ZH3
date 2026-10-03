// n8n node "Build request" (W8). The vision step's description is the only input to Jev: one closed question, one "none" option.
const SCENES = ['own_wallbox', 'shared_garage', 'street_parking', 'public_charger', 'no_charging_visible', 'not_a_parking_scene'];
// One output per picture, paired with "Pick pictures" by position.
const picked = $('Pick pictures').all().map((i) => i.json);
return $input.all().map((it, n) => {
const first = it.json;
const raw = first.content && first.content[0] && typeof first.content[0].text === 'string' ? first.content[0].text : String(first.description ?? '');
const description = raw.replace(/\s+/g, ' ').replace(/https?:\/\/\S+/gi, '').slice(0, 600).trim();
const url = picked[n] ? picked[n].url : null;
const expect = picked[n] ? picked[n].expect : null;
return { json: {
  url, expect, described: description.length > 0,
  request: {
    state: description,
    model: 'jev-latest',
    questions: {
      scene: {
        type: 'choice',
        instructions: 'The text describes a photo. Say which parking or charging situation it shows. Choose only from what the text says. If the text does not say, choose not_a_parking_scene or no_charging_visible.',
        criteria: {
          own_wallbox: 'a charging box or socket on a private house or a car park bay the person owns',
          shared_garage: 'a shared or underground garage with several bays and no visible charging point',
          street_parking: 'cars parked along a street, no charging point',
          public_charger: 'a public charging station or charging post in a public place',
          no_charging_visible: 'a parking place where no charging point is mentioned',
          not_a_parking_scene: 'the text is not about parking or charging',
        },
      },
    },
  },
} };
});
