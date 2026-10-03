// n8n node "Check input" (W6). The only thing W6 accepts: one short piece of text.
// The text is used for this one run and is never written anywhere. It is not in the reply either.
const body = $input.first().json.body ?? $input.first().json;
const words = typeof body.words === 'string' ? body.words.replace(/\s+/g, ' ').trim() : '';
if (words.length < 3) throw new Error('Too short');
if (words.length > 280) throw new Error('Too long');
return [{ json: { words } }];
