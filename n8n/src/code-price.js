// n8n node "Code". The francs were computed in the browser. This node checks they arrived and are numbers.
// It copies them. It never recalculates them.
const row = $input.first().json;
const p = row.raw && row.raw.price;
if (!p || typeof p !== 'object') throw new Error('Missing price');
const money = (v) => {
  const n = typeof v === 'number' ? v : NaN;
  if (!Number.isFinite(n)) throw new Error('Price field is not a number');
  return Math.max(-500000, Math.min(500000, Math.round(n)));
};
const cantons = ['ZH','BE','LU','UR','SZ','OW','NW','GL','ZG','FR','SO','BS','BL','SH','AR','AI','SG','GR','AG','TG','TI','VD','VS','NE','GE','JU'];
const canton = typeof p.canton === 'string' && cantons.includes(p.canton) ? p.canton : null;
const homeSource = typeof p.homeSource === 'string' && /^(placeholder|elcom-h4-\d{4}(-[A-Z]{2}|-municipality)?)$/.test(p.homeSource) ? p.homeSource : 'placeholder';
const price = {
  annualKeep: money(p.annualKeep),
  annualSwap: money(p.annualSwap),
  cash: money(p.cash),
  saving: money(p.saving),
  paybackYears: p.paybackYears == null || !Number.isFinite(Number(p.paybackYears)) ? null : Math.round(Number(p.paybackYears) * 10) / 10,
  withinHorizon: p.withinHorizon === true,
  dataset: typeof p.dataset === 'string' && /^[a-z0-9-]{1,40}$/.test(p.dataset) ? p.dataset : null,
  model: typeof p.model === 'string' && /^[a-z0-9-]{1,40}$/.test(p.model) ? p.model : null,
  cited: ['tco-2023'],
  homeSource,
  canton,
};
row.payload.nodes.push({ id: 'price', n8n: 'Code', engine: 'browser', output: price });
return [{ json: row }];
