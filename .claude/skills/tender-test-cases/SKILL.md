---
name: tender-test-cases
description: Maintain JuicyBids test cases - Firmenpass profiles in examples/, expected verdicts in examples/t5-expected.json - and run npm run eval to compare the live pipeline with them. Use for tickets T5 and T11 or when checking assessment quality.
---

# Tender test cases

Owner: B3 (T5 done, T11). Rules: `AGENTS.md`. Fields and scoring: `docs/firmenpass.md`.

## Files
- `examples/<id>.pass.json`: one Firmenpass per company. Must pass `validatePass` (`npm run scout -- examples/<id>.pass.json --offline` shows errors).
- `examples/t5-expected.json`: `cases[]` with `profile`, `notice` (noticeId), `title`, `expected` (`go` or `nogo`), `score` (T5 reference), and `now` (fixed evaluation time, because deadlines expire).
- `examples/README.md`: assumptions made when filling required fields, and known differences.

## Add or change a case
1. Pick a real notice from `data/bayern/index.json` (Bavaria, `tag` `tender`, open deadline at `now`). Use its noticeId without the `-01` version suffix.
2. Add a profile or reuse one. Fill required fields; prefer real proofs (`references`, `revenue_band_eur`, `liability_insurance_eur`) over leaving them out, because missing proofs become to-dos and cap at GO MIT AUFLAGE.
3. Add the case to `t5-expected.json`. Expected `go` accepts GO; GO MIT AUFLAGE counts as "teilweise". Expected `nogo` also passes when the prefilter drops the notice.
4. Do not copy contact data from source pages into examples.

## Run (T11)
1. `npm start` in one terminal (Eve with the OpenAI model).
2. `npm run eval` in another. It prints a table and writes `.local/eval.md`.
3. For every row that is not "ja", record profile, notice, expected, actual, likely cause (profile data, prefilter, prompt) in `docs/tickets/T11/abweichungen.md`. Hand prompt issues to T20 (`assessment-prompt` skill).
4. Save the run as `docs/tickets/T11/t5-eval-live.md`.

## Done when
- Every case is "ja", or each difference has a recorded cause and owner.
