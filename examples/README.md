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
| P1 | `references` | 3 fictional roofing jobs 2023–2025 (system roof REI 30, fall-arrest nets, roof sheeting; 900–1,600 m², 160,000–340,000 €; 2 public, 1 private) | T11: B1 asks for 3 comparable references from the last 5 years (Formblatt 444); not in T5 |
| P2 | `references` | 3 fictional maintenance-cleaning contracts 2021–2026 (school, library, private training centre; 2,400–6,200 m² NGF, 165,000–330,000 €; 2 public, 1 private) | T11: B3 asks for 3 references from the last five completed business years, at least 2 comparable; not in T5 |

All references are invented for testing. Clients are described generically (no real names); the Firmenpass schema has no field to mark them, so they are marked here.

## Known differences to T5 expectations
- B1 (Systemdach) and B3 (Stadtbücherei) came out as GO MIT AUFLAGE without references (both notices require three). With the fictional `references` above, both are GO in two live runs (B1 75/75, B3 75/82).
- B5 (Landtagsverwaltung, P3) is a borderline case: measured 64–77 across runs, so it flips between GO and GO MIT AUFLAGE. Likely cause: P3's single reference has no year, value or CPV, and P3 has no revenue band; the notice has no value or start date. Details: `docs/tickets/T11/abweichungen.md`.
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
