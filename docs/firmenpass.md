# Firmenpass (input schema)

The company profile sent with every job (Sokosumi task description or MIP-003 `input_data.prompt`, as JSON).
Validation: `tender/pass.mjs` (`validatePass`). Trade catalogue: `tender/trades.mjs`. Source: T4 form and T4 "how it works" (fields 7–10).
Required fields reject the job with a German error list. Optional fields never exclude a tender; a missing one makes the criterion "unklar".

| Field | Type | Required | Used for (T6) |
|---|---|---|---|
| `company_name` | string | no | report header |
| `trade` | string | yes | main service, e.g. `dachdecker` |
| `trades` | string[] (catalogue ids) | no | CPV derivation, Leistungstext |
| `custom_services` | string[] | no | Leistungstext |
| `service_description` | string, ≥ 20 chars | yes | Leistungstext (compared with each notice) |
| `cpv_prefixes` | string[] of 2–8 digits | derived | prefilter, CPV stage; derived from `trades` when absent |
| `states` | `["DE-BY"]` | yes | region; other states are rejected (Bavaria only) |
| `min_value_eur`, `max_value_eur` | number | yes | prefilter when the value is known, Größenpassung |
| `available_from` | `YYYY-MM-DD` | yes | Kapazität und Zeitraum |
| `employees`, `capacity_note` | integer, string | no | Personal, Kapazität |
| `home_location` | string (city or region) | no | Entfernung |
| `radius_km` | number | no | Entfernung |
| `free_capacity` | string | no | Kapazität und Zeitraum |
| `largest_reference_eur` | number | no | Referenzen, Größenpassung |
| `bid_lead_days` | integer 0–60 | no | prefilter: drops notices with fewer days left |
| `preferences` | string | no | company wishes; may shift weights within the point ranges |
| `licenses`, `certifications` | string[] (may be empty) | yes | Zulassung / PQ |
| `revenue_band_eur` | `<250k`, `250k-1M`, `1M-2.5M`, `2.5M-10M`, `>10M` | no | Leistungsfähigkeit, Größenpassung |
| `liability_insurance_eur` | number | no | Leistungsfähigkeit |
| `references` | `{year, value_eur, cpv, public_client, summary}[]` | no | Referenzen |
| `price_positioning` | `budget`, `mid`, `premium` | no | Gewinnchance |
| `consortium_ok`, `subcontracting_ok` | boolean | no | Bietergemeinschaft / Nachunternehmer |
| `risk_limits` | `{max_penalty_pct, max_guarantee_pct, max_term_months_without_price_adjustment, prefinancing_ok}` | no | Risiko |
| `max_bid_effort` | `low`, `medium`, `high` | no | Aufwand |
| `exclusions` | string[] (may be empty) | yes | eigene Ausschlüsse (K.O.) |
| `lookback_days` | integer 1–60, default 14 | no | prefilter |

Examples: `examples/p1-alpendach.pass.json`, `examples/p2-isarglanz.pass.json`, `examples/p3-isarcode.pass.json`.

## Scoring (T6)
The model rates sub-criteria (`zulassung` 10, `referenzen` 15, `leistungsfaehigkeit` 10, `leistungstext` 5, `kapazitaet` 10, `entfernung` 5, `groesse` 10, `gewinnchance` 10, `aufwand` 5, `risiko_abzug` 0–15) and lists `ko` (not fixable) and `todos` (fixable gaps).
The code (`tender/assess.mjs` `score`) adds the CPV stage points (A 5, B 4, C 2, D 2, E 1, F 0), applies the caps and decides:
GO 70–100 · GO MIT AUFLAGE 40–69 (any to-do or stage C caps at 69) · NO-GO 0–39 (any K.O. caps at 39; wrong trade or D/E without matching text is 0).
The report lists GO and GO MIT AUFLAGE only; NO-GO is counted in the exclusion table.

## Freitext statt JSON
A request may also be plain German text ("Wir suchen IT-Aufträge in den nächsten Monaten, 5 Mitarbeiter…"). `tender/intake.mjs` lets the model extract the fields above from the text only; it never invents capabilities, certificates or references. Code (not the model) fills the required fields that the text leaves open and names each as an assumption:

| Field | Default | Assumption shown |
|---|---|---|
| `states` | `["DE-BY"]` | data covers Bavaria only |
| `available_from` | today | start "ab sofort" |
| `licenses`, `certifications`, `exclusions` | `[]` | none stated, eligibility is rated "unklar" |
| `min_value_eur` | 10.000 € | estimated |
| `max_value_eur` | `employees` × 100.000 €, clamped to 100.000–2.000.000 €; 500.000 € without a team size | estimated from team size |
| `lookback_days` | 14 | – |

In a Sokosumi Task the agent first posts the understood profile with these assumptions and open questions and waits for "passt" or corrections; in `npm run scout` and the paid MIP-003 path it assesses right away and prints the block "So wurde Ihre Anfrage verstanden" at the top of the report. A JSON Firmenpass is still accepted unchanged and is the exact form.
