---
name: assessment-prompt
description: Tune JuicyBids's German assessment prompt in agent/instructions.md (T6 criteria, point ranges, K.O. and to-do rules, strict JSON) and check the effect with npm run eval. Use for tickets T6 and T20 or when verdicts or scores look wrong.
---

# Assessment prompt

Owner: B2 (T6, done: `agent/instructions.md` implements the T6 criteria). D and B3 tune it (T20). Rules: `AGENTS.md`.

## How the decision is split
- The model gets the Firmenpass and at most 25 candidates with facts and `cpvStage`. It returns per candidate: `points` (ten sub-criteria within fixed ranges), `ko`, `todos`, `reasons` (three), `proofs`, `risks`, `unclear`. Format: last section of `agent/instructions.md`.
- The code (`tender/assess.mjs` `score`) adds CPV stage points, applies the T6 caps and decides GO / GO MIT AUFLAGE / NO-GO. Do not ask the model for totals or verdicts.
- Facts (deadline, value, CPV, buyer, link) come from the source. The prompt must keep forbidding the model from repeating or changing them. Unknown ids are dropped by code.
- Field and scoring reference: `docs/firmenpass.md`.

## Tune it (T20)
1. Start Eve (`npm start`), run `npm run eval`, read `.local/eval.md`.
2. Pick one wrong case. Find the cause: data (prefilter), a point range, or the K.O./to-do rule. A to-do caps at 69, a K.O. at 39, so a misplaced to-do or K.O. changes the verdict.
3. Change one rule in `agent/instructions.md`, restart Eve, re-run `npm run eval`. Keep the change only if the case improves and no other case breaks.
4. Changing thresholds or caps is a code change in `tender/assess.mjs` with a test in `tender/scout.test.mjs`, agreed with B2.
5. Save the final run as `docs/tickets/T11/t5-eval-live.md`.

## Keep
- The JSON format, the fact rules and the "Sicherheit" block.
- The stance from T6: work for the company, never claim a fulfilment that is not there.

## Done when
- `npm run eval` matches T5 or every difference is explained in `examples/README.md`.
