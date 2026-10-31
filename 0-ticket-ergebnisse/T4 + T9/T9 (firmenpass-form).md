# Firmenpass – Form by steps

JuicyBids company pass: the six steps of the form, the pass the agent receives, and what every field means.
Source of truth for catalogue and validation: `trades.mjs`. CPV codes still need a check against the official CPV list (T3).

## 1. Form definition by steps

```json
{
  "form": "firmenpass",
  "version": "1.0",
  "language": "de",
  "steps": [
    {
      "step": 1,
      "title": "Branche",
      "question": "Was macht Ihre Firma?",
      "required": true,
      "fields": {
        "categories": {
          "label": "Bereiche (Mehrfachauswahl)",
          "type": "multi_select",
          "required": true,
          "in_pass": false,
          "options": [
            {"value": "bau", "label": "Bau & Rohbau"},
            {"value": "dach_fassade", "label": "Dach & Fassade"},
            {"value": "ausbau", "label": "Ausbau & Innenhandwerk"},
            {"value": "haustechnik", "label": "Haustechnik"},
            {"value": "sanierung", "label": "Sanierung & Renovierung"},
            {"value": "gebaeudeservice", "label": "Reinigung & Gebäudeservice"},
            {"value": "sicherheit", "label": "Sicherheitsdienste"},
            {"value": "beratung_planung", "label": "Beratung & Planung"},
            {"value": "sonstige", "label": "Weitere Dienstleistungen"}
          ],
          "example": ["dach_fassade"]
        }
      }
    },
    {
      "step": 2,
      "title": "Leistungen",
      "question": "Welche Leistungen bieten Sie an?",
      "required": true,
      "fields": {
        "trades": {
          "label": "Leistungen je gewähltem Bereich (Mehrfachauswahl)",
          "type": "multi_select_grouped",
          "required": "trades or custom_services",
          "options": {
            "bau": [
              {"value": "hochbau", "label": "Hochbau / Rohbau", "cpv": ["4521"]},
              {"value": "tiefbau", "label": "Tiefbau & Straßenbau", "cpv": ["4523"]},
              {"value": "abbruch", "label": "Abbruch & Erdarbeiten", "cpv": ["4511"]},
              {"value": "beton_mauer", "label": "Beton- & Mauerarbeiten", "cpv": ["452623", "452625"]},
              {"value": "geruestbau", "label": "Gerüstbau", "cpv": ["452621"]}
            ],
            "dach_fassade": [
              {"value": "dachdecker", "label": "Dachdecker", "cpv": ["45261"]},
              {"value": "zimmerei", "label": "Zimmerei / Dachstuhl", "cpv": ["452611"]},
              {"value": "spengler", "label": "Spengler / Dachrinnen", "cpv": ["452613"]},
              {"value": "daemmung_fassade", "label": "Dämmung & Fassade", "cpv": ["4532", "45443"]}
            ],
            "ausbau": [
              {"value": "maler", "label": "Maler & Lackierer", "cpv": ["45442"]},
              {"value": "fliesen_boden", "label": "Fliesen & Bodenbeläge", "cpv": ["4543"]},
              {"value": "tischler", "label": "Tischler / Schreiner", "cpv": ["4542"]},
              {"value": "putz_trockenbau", "label": "Putz & Trockenbau", "cpv": ["4541"]},
              {"value": "glaser", "label": "Glaser", "cpv": ["45441"]}
            ],
            "haustechnik": [
              {"value": "elektro", "label": "Elektroinstallation", "cpv": ["4531"]},
              {"value": "shk", "label": "Sanitär, Heizung, Klima", "cpv": ["4533"]},
              {"value": "brandmelde", "label": "Brandmelde- & Alarmanlagen", "cpv": ["45312"]},
              {"value": "wartung_tga", "label": "Wartung Gebäudetechnik", "cpv": ["507"]}
            ],
            "sanierung": [
              {"value": "modernisierung", "label": "Modernisierung & Instandsetzung", "cpv": ["45453"]},
              {"value": "schadstoff", "label": "Schadstoff- & Asbestsanierung", "cpv": ["45262660"]},
              {"value": "restaurierung", "label": "Restaurierung / Denkmalpflege", "cpv": ["454541"]}
            ],
            "gebaeudeservice": [
              {
                "value": "gebaeudereinigung",
                "label": "Gebäude- & Unterhaltsreinigung",
                "cpv": ["90911", "90919"]
              },
              {"value": "glasreinigung", "label": "Glas- & Fensterreinigung", "cpv": ["909113"]},
              {"value": "winterdienst", "label": "Winterdienst", "cpv": ["9062", "9063"]},
              {"value": "gruenpflege", "label": "Grünpflege & Gartenbau", "cpv": ["7731"]},
              {
                "value": "hausmeister",
                "label": "Hausmeister & Facility Management",
                "cpv": ["79993", "98341140"]
              }
            ],
            "sicherheit": [
              {"value": "bewachung", "label": "Bewachung & Objektschutz", "cpv": ["79713"]},
              {"value": "sicherheitsdienst", "label": "Sicherheitsdienst allgemein", "cpv": ["7971"]},
              {"value": "alarmueberwachung", "label": "Alarmüberwachung", "cpv": ["79711"]}
            ],
            "beratung_planung": [
              {"value": "unternehmensberatung", "label": "Unternehmensberatung", "cpv": ["794"]},
              {"value": "architektur", "label": "Architektur", "cpv": ["712"]},
              {"value": "ingenieurbuero", "label": "Ingenieurbüro", "cpv": ["713"]},
              {"value": "it", "label": "IT-Dienstleistungen", "cpv": ["72"]},
              {"value": "recht_steuer", "label": "Recht & Steuern", "cpv": ["791", "792"]}
            ],
            "sonstige": [
              {"value": "transport", "label": "Transport & Beförderung", "cpv": ["601"]},
              {"value": "catering", "label": "Catering & Verpflegung", "cpv": ["555"]},
              {"value": "entsorgung", "label": "Entsorgung", "cpv": ["905"]},
              {"value": "kfz", "label": "Kfz-Werkstatt", "cpv": ["501"]},
              {"value": "schulung", "label": "Schulung & Weiterbildung", "cpv": ["805"]}
            ]
          },
          "example": ["dachdecker", "spengler"]
        },
        "custom_services": {
          "label": "Eigene Leistung in diesem Bereich (Freitext je Bereich)",
          "type": "text_per_category",
          "required": false,
          "fallback_cpv": {
            "bau": ["45"],
            "dach_fassade": ["45261", "4532", "45443"],
            "ausbau": ["454"],
            "haustechnik": ["453"],
            "sanierung": ["4545"],
            "gebaeudeservice": ["909"],
            "sicherheit": ["7971"],
            "beratung_planung": ["79", "71"],
            "sonstige": []
          },
          "example": []
        },
        "manual_cpv": {
          "label": "Weitere CPV-Codes",
          "type": "text",
          "required": "only if a custom service in 'sonstige' has no CPV code",
          "in_pass": "merged into cpv_prefixes",
          "example": ""
        },
        "service_description": {
          "label": "Beschreiben Sie Ihre Leistungen in 1–3 Sätzen",
          "type": "textarea",
          "required": true,
          "min_length": 20,
          "prefilled_from": "trades",
          "example": "Steil- und Flachdachsanierung, Abdichtung und Dachentwässerung für öffentliche und gewerbliche Gebäude"
        },
        "trade": {
          "label": "Hauptleistung",
          "type": "derived",
          "rule": "first selected trade, or 'custom' if only custom services",
          "example": "dachdecker"
        },
        "cpv_prefixes": {
          "label": "CPV-Präfixe",
          "type": "derived",
          "rule": "union of trade CPVs + fallback_cpv of categories with only a custom service + manual_cpv, shorter prefixes absorb longer ones",
          "example": ["45261"]
        }
      }
    },
    {
      "step": 3,
      "title": "Region",
      "question": "Wo und in welcher Größe suchen Sie Aufträge?",
      "required": true,
      "fields": {
        "states": {
          "label": "Bundesländer (Mehrfachauswahl)",
          "type": "multi_select",
          "required": true,
          "default": ["DE-BY"],
          "options": [
            {"value": "DE-BW", "label": "Baden-Württemberg", "nuts": "DE1"},
            {"value": "DE-BY", "label": "Bayern", "nuts": "DE2"},
            {"value": "DE-BE", "label": "Berlin", "nuts": "DE3"},
            {"value": "DE-BB", "label": "Brandenburg", "nuts": "DE4"},
            {"value": "DE-HB", "label": "Bremen", "nuts": "DE5"},
            {"value": "DE-HH", "label": "Hamburg", "nuts": "DE6"},
            {"value": "DE-HE", "label": "Hessen", "nuts": "DE7"},
            {"value": "DE-MV", "label": "Mecklenburg-Vorpommern", "nuts": "DE8"},
            {"value": "DE-NI", "label": "Niedersachsen", "nuts": "DE9"},
            {"value": "DE-NW", "label": "Nordrhein-Westfalen", "nuts": "DEA"},
            {"value": "DE-RP", "label": "Rheinland-Pfalz", "nuts": "DEB"},
            {"value": "DE-SL", "label": "Saarland", "nuts": "DEC"},
            {"value": "DE-SN", "label": "Sachsen", "nuts": "DED"},
            {"value": "DE-ST", "label": "Sachsen-Anhalt", "nuts": "DEE"},
            {"value": "DE-SH", "label": "Schleswig-Holstein", "nuts": "DEF"},
            {"value": "DE-TH", "label": "Thüringen", "nuts": "DEG"}
          ],
          "example": ["DE-BY"]
        },
        "min_value_eur": {"label": "Kleinster Auftrag (€)", "type": "number", "required": true, "example": 20000},
        "max_value_eur": {
          "label": "Größter Auftrag (€)",
          "type": "number",
          "required": true,
          "rule": "min_value_eur <= max_value_eur",
          "example": 500000
        },
        "available_from": {
          "label": "Verfügbar ab",
          "type": "date",
          "format": "YYYY-MM-DD",
          "required": true,
          "example": "2027-01-15"
        },
        "employees": {"label": "Mitarbeitende", "type": "integer", "required": false, "example": 18},
        "capacity_note": {"label": "Kapazität", "type": "text", "required": false, "example": "2 Kolonnen"}
      }
    },
    {
      "step": 4,
      "title": "Nachweise",
      "question": "Welche Nachweise haben Sie?",
      "required": false,
      "note": "Fehlt eine Angabe, bewertet der Agent das Kriterium als „unklar“ und schließt nicht aus.",
      "fields": {
        "licenses": {
          "label": "Zulassungen (Mehrfachauswahl + Freitext)",
          "type": "multi_select_with_custom",
          "required": "always sent, may be empty",
          "options": [
            "Meisterbetrieb / Handwerksrolle",
            "Erlaubnis nach § 34a GewO",
            "Installateurverzeichnis (Strom, Gas, Wasser)",
            "Sachkunde Asbest (TRGS 519)",
            "Entsorgungsfachbetrieb",
            "Bauvorlageberechtigung"
          ],
          "example": ["Meisterbetrieb / Handwerksrolle"]
        },
        "certifications": {
          "label": "Zertifikate (Mehrfachauswahl + Freitext)",
          "type": "multi_select_with_custom",
          "required": "always sent, may be empty",
          "options": [
            "Präqualifikation Bau (PQ-VOB)",
            "Präqualifikation Liefer- und Dienstleistungen (AVPQ)",
            "ISO 9001",
            "ISO 14001",
            "ISO 45001",
            "SCC",
            "DIN 77200",
            "ISO 27001",
            "Sicherheitsüberprüfung (Geheimschutz)"
          ],
          "example": ["Präqualifikation Bau (PQ-VOB)"]
        },
        "revenue_band_eur": {
          "label": "Jahresumsatz, Durchschnitt der letzten 3 Jahre",
          "type": "single_select",
          "required": false,
          "options": [
            {"value": "<250k", "label": "unter 250.000 €"},
            {"value": "250k-1M", "label": "250.000 € bis 1 Mio. €"},
            {"value": "1M-2.5M", "label": "1 bis 2,5 Mio. €"},
            {"value": "2.5M-10M", "label": "2,5 bis 10 Mio. €"},
            {"value": ">10M", "label": "über 10 Mio. €"}
          ],
          "example": "1M-2.5M"
        },
        "liability_insurance_eur": {
          "label": "Betriebshaftpflicht, Deckungssumme (€)",
          "type": "number",
          "required": false,
          "example": 3000000
        },
        "references": {
          "label": "Referenzen (beliebig viele)",
          "type": "list",
          "required": false,
          "item_fields": {
            "year": {"label": "Jahr", "type": "integer"},
            "value_eur": {"label": "Auftragswert (€)", "type": "number"},
            "cpv": {"label": "Leistung", "type": "derived", "rule": "first CPV prefix of the chosen trade"},
            "public_client": {"label": "Öffentlicher Auftraggeber", "type": "boolean", "default": true},
            "summary": {"label": "Kurzbeschreibung", "type": "text"}
          },
          "example": [
            {
              "year": 2025,
              "value_eur": 140000,
              "cpv": "45261",
              "public_client": true,
              "summary": "Flachdachsanierung Grundschule"
            }
          ]
        }
      }
    },
    {
      "step": 5,
      "title": "Bedingungen",
      "question": "Unter welchen Bedingungen bieten Sie an?",
      "required": false,
      "fields": {
        "price_positioning": {
          "label": "Preisniveau",
          "type": "single_select",
          "required": false,
          "options": [
            {"value": "budget", "label": "Günstig"},
            {"value": "mid", "label": "Mittel"},
            {"value": "premium", "label": "Premium"}
          ],
          "example": "premium"
        },
        "consortium_ok": {
          "label": "Bietergemeinschaft möglich",
          "type": "yes_no",
          "required": false,
          "options": [
            {"value": true, "label": "Ja"},
            {"value": false, "label": "Nein"},
            {"value": null, "label": "Keine Angabe", "note": "field is left out of the pass"}
          ],
          "example": true
        },
        "subcontracting_ok": {
          "label": "Nachunternehmer möglich",
          "type": "yes_no",
          "required": false,
          "options": [
            {"value": true, "label": "Ja"},
            {"value": false, "label": "Nein"},
            {"value": null, "label": "Keine Angabe", "note": "field is left out of the pass"}
          ],
          "example": false
        },
        "risk_limits": {
          "label": "Risikogrenzen",
          "type": "group",
          "required": false,
          "fields": {
            "max_penalty_pct": {"label": "Höchste Vertragsstrafe (%)", "type": "number", "example": 5},
            "max_guarantee_pct": {"label": "Höchste Sicherheitsleistung (%)", "type": "number", "example": 5},
            "max_term_months_without_price_adjustment": {"label": "Längste Laufzeit ohne Preisanpassung (Monate)", "type": "number", "example": 24},
            "prefinancing_ok": {
              "label": "Vorfinanzierung möglich",
              "type": "yes_no",
              "options": [
                {"value": true, "label": "Ja"},
                {"value": false, "label": "Nein"},
                {"value": null, "label": "Keine Angabe", "note": "field is left out of the pass"}
              ],
              "example": false
            }
          }
        },
        "max_bid_effort": {
          "label": "Angebotsaufwand",
          "type": "single_select",
          "required": false,
          "options": [
            {"value": "low", "label": "Gering"},
            {"value": "medium", "label": "Mittel"},
            {"value": "high", "label": "Hoch"}
          ],
          "example": "medium"
        },
        "exclusions": {
          "label": "Weitere Ausschlüsse (ein Punkt pro Zeile)",
          "type": "textarea_lines",
          "required": "always sent, may be empty",
          "example": ["Ausführungsfrist < 4 Wochen"]
        },
        "lookback_days": {
          "label": "Suchzeitraum (Tage zurück)",
          "type": "integer",
          "required": true,
          "default": 14,
          "min": 1,
          "max": 60,
          "example": 14
        }
      }
    },
    {
      "step": 6,
      "title": "Fertig",
      "question": "Ihr Firmenpass ist fertig",
      "output": "pass JSON (see example_pass); copy or save as firmenpass.json"
    }
  ]
}
```

## 2. Example pass (what the agent receives)

```json
{
  "trade": "dachdecker",
  "trades": ["dachdecker", "spengler"],
  "custom_services": [],
  "service_description": "Steil- und Flachdachsanierung, Abdichtung und Dachentwässerung für öffentliche und gewerbliche Gebäude",
  "cpv_prefixes": ["45261"],
  "states": ["DE-BY"],
  "min_value_eur": 20000,
  "max_value_eur": 500000,
  "available_from": "2027-01-15",
  "licenses": ["Meisterbetrieb / Handwerksrolle"],
  "certifications": ["Präqualifikation Bau (PQ-VOB)"],
  "exclusions": ["Ausführungsfrist < 4 Wochen"],
  "lookback_days": 14,
  "references": [
    {
      "year": 2025,
      "value_eur": 140000,
      "cpv": "45261",
      "public_client": true,
      "summary": "Flachdachsanierung Grundschule"
    }
  ],
  "revenue_band_eur": "1M-2.5M",
  "liability_insurance_eur": 3000000,
  "employees": 18,
  "capacity_note": "2 Kolonnen",
  "price_positioning": "premium",
  "consortium_ok": true,
  "subcontracting_ok": false,
  "risk_limits": {
    "max_penalty_pct": 5,
    "max_guarantee_pct": 5,
    "max_term_months_without_price_adjustment": 24,
    "prefinancing_ok": false
  },
  "max_bid_effort": "medium"
}
```

## 3. Field reference

The Firmenpass is the company profile a contractor (or its office-assistant agent) sends with every search job. The agent checks every open public tender against it and returns a ranked shortlist with go/no-go.

### Rules

- **Required** fields must be present. Otherwise `validatePass()` rejects the job before the prefilter runs.
- **Recommended** fields are optional. A missing recommended field never excludes a tender: the matching T6 criterion is rated "unklar" (unclear) and costs a few score points.
- **Required, may be empty** fields are always sent, as an empty array if there is nothing to declare.
- **Derived** fields are computed by the form. An agent that sends a pass without the form must set them itself.
- **UI-only** fields are asked in the form but not sent in the pass.
- Yes/No questions are sent as `true` / `false`. "Keine Angabe" leaves the field out.
- All data is self-declared by the company. The agent verifies tender facts against the public source, not the company's own data.

### Step 1 – Industry (Branche)

| Field | Type | Status | Meaning | T6 criterion |
|---|---|---|---|---|
| `categories` | string[] | UI-only | Business areas the company works in. Controls which services step 2 shows. | – |

### Step 2 – Services (Leistungen)

| Field | Type | Status | Meaning | T6 criterion |
|---|---|---|---|---|
| `trade` | string | Required, derived | Main service: first selected trade ID (e.g. `dachdecker`), or `custom` if only own services were typed. | Fachliche Passung |
| `trades` | string[] | Optional | All selected trade IDs from the catalogue. | Fachliche Passung |
| `custom_services` | string[] | Optional | Services the company typed itself. | Fachliche Passung |
| `service_description` | string, min. 20 chars | Required | 1–3 sentences on what the company actually does. The LLM compares it with each notice's description, because CPV codes alone are too coarse. | Fachliche Passung |
| `cpv_prefixes` | string[], 2–8 digits | Required, derived | CPV prefixes for the prefilter: trade codes + category fallback for custom-only services + manual codes. Shorter prefixes absorb longer ones. | Prefilter, Fachliche Passung |

### Step 3 – Region and size (Region)

| Field | Type | Status | Meaning | T6 criterion |
|---|---|---|---|---|
| `states` | string[], ISO 3166-2 | Required | Federal states the company works in, e.g. `DE-BY`. Mapped to NUTS prefixes (`DE-BY` → `DE2`), because notices use NUTS codes. | Prefilter, Ort und Zeitraum |
| `min_value_eur` | number | Required | Smallest contract worth bidding on. | Auftragswert |
| `max_value_eur` | number | Required | Largest contract the company can handle. Must be ≥ `min_value_eur`. A notice without a value counts as unknown, not excluded. | Auftragswert |
| `available_from` | date, YYYY-MM-DD | Required | Earliest possible start. | Ort und Zeitraum |
| `employees` | integer | Recommended | Headcount. | Ort und Zeitraum (capacity) |
| `capacity_note` | string | Recommended | Capacity in free text, e.g. "2 Kolonnen". | Ort und Zeitraum (capacity) |

### Step 4 – Proofs (Nachweise)

| Field | Type | Status | Meaning | T6 criterion |
|---|---|---|---|---|
| `licenses` | string[] | Required, may be empty | Professional licences, e.g. Meisterbetrieb, Erlaubnis nach § 34a GewO. | Berufszulassung |
| `certifications` | string[] | Required, may be empty | Certificates and prequalification, e.g. PQ-VOB, ISO 9001. | Zertifikate |
| `revenue_band_eur` | enum | Recommended | Average annual revenue of the last 3 years: `<250k`, `250k-1M`, `1M-2.5M`, `2.5M-10M`, `>10M`. | Wirtschaftliche Leistungsfähigkeit |
| `liability_insurance_eur` | number | Recommended | Business liability cover in EUR. | Wirtschaftliche Leistungsfähigkeit |
| `references` | object[] | Recommended | Comparable past contracts: `year`, `value_eur`, `cpv`, `public_client`, `summary`. | Referenzen |

### Step 5 – Conditions (Bedingungen)

| Field | Type | Status | Meaning | T6 criterion |
|---|---|---|---|---|
| `price_positioning` | enum `budget` / `mid` / `premium` | Recommended | Price level. A premium firm scores higher where quality is weighted in the award criteria. | Zuschlagskriterien |
| `consortium_ok` | boolean | Recommended | Willing to bid in a consortium (Bietergemeinschaft). | Bietergemeinschaft/Nachunternehmer |
| `subcontracting_ok` | boolean | Recommended | Willing to use subcontractors. | Bietergemeinschaft/Nachunternehmer |
| `risk_limits.max_penalty_pct` | number | Recommended | Highest acceptable contract penalty in %. | Vertragsstrafen |
| `risk_limits.max_guarantee_pct` | number | Recommended | Highest acceptable security deposit or guarantee in %. | Sicherheiten |
| `risk_limits.max_term_months_without_price_adjustment` | number | Recommended | Longest contract term the company accepts without a price adjustment clause. | Preisrisiko |
| `risk_limits.prefinancing_ok` | boolean | Recommended | Company can pre-finance work before being paid. | Zahlung |
| `max_bid_effort` | enum `low` / `medium` / `high` | Recommended | Bid preparation effort the company accepts (concepts, site visits, presentations). | Angebotsaufwand |
| `exclusions` | string[] | Required, may be empty | Hard no-gos in free text, one per line. | Eigene Ausschlüsse |
| `lookback_days` | integer, 1–60 | Required, default 14 | How many days back the search looks for new notices. | Prefilter |

### T6 criteria without a pass field

`Lose` and `Verfahrensart` are read from the notice only.
