# Test profiles (T5)

Three fictional companies from T5, converted to the Firmenpass format (`docs/firmenpass.md`), and the expected results in `t5-expected.json`.

```sh
npm start                                                   # terminal 1: Eve with the OpenAI model
npm run scout -- examples/p1-alpendach.pass.json            # one live report
npm run scout -- examples/p1-alpendach.pass.json --offline  # layout check without model
npm run eval                                                # all T5 cases, live model, writes .local/eval.md
```

## Assumptions added during conversion
T5 used the draft schema. Required Firmenpass fields that T5 does not state were filled in as follows; change them if B3 knows better.

| Profile | Field | Value | Reason |
|---|---|---|---|
| all | `cpv_prefixes` | derived from `trades` | T5 used `4526`, which also matches steel and scaffolding (T2); catalogue gives `45261` |
| all | `service_description` | written from the T5 profile text | required, at least 20 characters |
| P1 | `available_from` | `2027-01-01` | "Start ab Januar 2027" |
| P1 | `employees` | 8 | "2 Kolonnen je 4 Fachkräfte" |
| P2, P3 | `available_from` | `2026-12-01` | not stated in T5 |
| P2 | `bid_lead_days` | 7 | exclusion "Restlaufzeit < 7 Kalendertage" |
| P3 | `free_capacity` | 80–200 PT/Jahr | from `capacity_note` |
| P3 | `references` | EVB-IT experience, public sector | was listed under certifications |

## Known differences to T5 expectations
- B1 (Systemdach) and B3 (Stadtbücherei) come out as GO MIT AUFLAGE instead of GO: both notices require three comparable references and the T5 profiles list none. Under T6 that is a fixable gap. Adding `references` to P1 and P2 should give GO.
- B2, the steel case and B4 are dropped by the deterministic prefilter (value above `max_value_eur`, deadline shorter than `bid_lead_days`). The outcome NO-GO matches T5.
Latest live run: `docs/tickets/T11/t5-eval-live.md`.

## Freitext-Anfrage (P4)
`p4-pi-informatik.prompt.txt` is a plain German request without JSON. The agent derives the Firmenpass itself (`tender/intake.mjs`), lists its assumptions and, in a Sokosumi Task, asks for confirmation before it assesses.
```sh
npm run scout -- examples/p4-pi-informatik.prompt.txt --offline   # canned intake, layout check
npm run scout -- examples/p4-pi-informatik.prompt.txt             # live intake and assessment, no confirmation round
npm run task -- examples/p4-pi-informatik.prompt.txt              # Sokosumi: question as Coworker comment, answer with "passt"
```
No expected results exist for P4 yet; the report's "So wurde Ihre Anfrage verstanden" block shows the derived profile.
