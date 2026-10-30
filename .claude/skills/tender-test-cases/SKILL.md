---
name: tender-test-cases
description: Build TenderScout test cases - a fictional contractor profile plus real Bavarian notices with the expected go/no-go and reasons - and compare pipeline output against them. Use for tickets T5 and T11 or when checking assessment quality.
---

# Tender test cases

Owner: B3 (T5, T11). Rules: `AGENTS.md`.

## Inputs
- `data/bayern/index.json` and the notice files next to it (run the `tender-data-import` skill first if empty).
- The input schema. Draft until T9 is closed:
```json
{"trade":"roofing","cpv_prefixes":["45261"],"states":["DE-BY"],"min_value_eur":20000,"max_value_eur":500000,
 "certifications":["Meisterbetrieb","Präqualifikation Bau"],"capacity_note":"2 Kolonnen, Start frühestens Januar",
 "exclusions":["Vertragsstrafe > 5%","Ausführungsfrist < 4 Wochen"],"lookback_days":14}
```

## Steps (T5)
1. Write three fictional company profiles in `examples/<name>.profile.json`. Use real trades with enough open tenders (count open tenders per CPV prefix in `data/bayern/index.json`). Make one profile that should get zero matches.
2. For each profile pick real notices from `data/bayern/`: at least one clear go, one clear no-go, and one borderline. Five distinct notices in total.
3. Write `examples/<name>.expected.md` in German. Per notice:
   - `id` and `source.link`
   - expected Go/No-Go and a score band (e.g. 70-90)
   - the reasons, each tied to a field in the notice file (`eforms.lots[].selectionCriteria`, `plannedStart`, `estimatedValue`, `deadline`) or to the profile
   - facts that must appear unchanged in the report (deadline, CPV, buyer)
4. Do not copy contact data from source pages into examples.

## Steps (T11)
1. Run each profile through the pipeline (command from D once T10 is done; until then mark `TODO (T10)`).
2. Compare the report with the expected file: go/no-go, score band, reasons, unchanged facts, no invented notices.
3. Record differences in `docs/tickets/T11/abweichungen.md` as a table: profile, notice, expected, actual, likely cause (data, prefilter, prompt). Hand prompt issues to T20.

## Done when
- Three profiles, five real notices, expected results with field-based reasons.
- For T11: every difference recorded with a likely cause.
