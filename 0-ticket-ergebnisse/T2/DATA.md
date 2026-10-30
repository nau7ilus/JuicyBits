# TenderScout data handover (B1, as of 30 Oct 2026)

## 1. Open-data endpoint
Datenservice Öffentlicher Einkauf (oeffentlichevergabe.de), Open Data API, no login, licence CC0.
`GET https://oeffentlichevergabe.de/api/notice-exports`
- One ZIP per publication day, nationwide (no per-state download).
- Only finished days exist (today returns an error). Weekends are small.
- Our cloud sandbox cannot reach this host; a normal browser can.

## 2. Export URLs (two formats, same notices, same notice IDs)
- OCDS (JSON, facts): `https://oeffentlichevergabe.de/api/notice-exports?pubDay=YYYY-MM-DD&format=ocds.zip`
- eForms (XML, deadline + value): `https://oeffentlichevergabe.de/api/notice-exports?pubDay=YYYY-MM-DD&format=eforms.zip`
- Join: file name `<noticeId>-<version>.json` / `.xml`; noticeId = OCDS release `id`.

## 3. Field names (verified on 16–29 Oct 2026)
| Fact | Source | Path | Filled |
|---|---|---|---|
| Process ID | OCDS | `ocid` | 100% |
| Notice ID | OCDS | `id` | 100% |
| Status | OCDS | `tag` (`tender` = open call; `award`/`contract` = closed) | 98% |
| Title | OCDS | `tender.title` | 100% |
| Description | OCDS | `tender.description`, `tender.lots[].description` | 100% |
| CPV | OCDS | `tender.items[].classification.id` (+ `additionalClassifications[].id`) | 97% |
| Buyer | OCDS | `buyer.name` | 100% |
| Region (place of performance) | OCDS | `tender.items[].deliveryAddress.region` (NUTS, Bayern = `DE2…`) | 90% |
| Region (buyer, fallback) | OCDS | `buyer.address.region` / `parties[role=buyer].address.region` | ~50% |
| Submission deadline | eForms | `cac:TenderSubmissionDeadlinePeriod` → `cbc:EndDate` + `cbc:EndTime` | ~60% |
| Estimated value | eForms | `cbc:EstimatedOverallContractAmount` (OCDS `tender.value.amount` only ~6%) | ~10% |
| Link | built | `https://oeffentlichevergabe.de/ui/de/search/details?noticeId=<id>` | n/a |

Not in OCDS export: `tender.tenderPeriod` (deadline), `tender.status`. Older notices with 8-digit numeric IDs have no eForms record, so no deadline.

## 4. Files in this folder
- `bavaria-tenders-14d.json` / `.csv`: all Bavarian tender notices published 16–29 Oct (778), with `open` (450 open on 30 Oct), deadline, value, CPV, link, description (contact data removed).
- `sample-ocds-bavaria.json`: 13 raw OCDS releases (construction, cleaning, engineering, IT) as an example file for tests, contact data removed, `_eforms` = joined deadline/value.
- `ocds` zips + folders for 28/29 Oct: raw originals.

## 5. Demo trades, Bavaria, open on 30 Oct (14 days)
| Trade | CPV prefix | Open |
|---|---|---|
| Construction (all) | `45` | 255 |
| Cleaning | `909` | 13 |
| Security | `797` | 5 |
| Architecture/engineering | `71` | 33 |
| IT services | `72` | 14 |
| Consulting | `794` | ~1 (too few) |
Note: `4526` mixes roofing with rail, metal, carpentry and scaffolding; true roofing is `45261` (3 open). Confirm prefixes against the official CPV list.

## 6. Coverage limit (put in README/pitch)
Above EU thresholds publication here is mandatory; below-threshold coverage is partial; state/municipal portals not included.
