// n8n node "Build request" (W7). Turns the cleaned text and the closed question list into one Jev call.
// One call, several narrow questions, each with an option for "none of these". The text is the only free input.
const SPEC = __SPEC__;
const { words } = $input.first().json;
return [{ json: { ...$input.first().json, request: { state: words, model: SPEC.model, questions: SPEC.questions } } }];
