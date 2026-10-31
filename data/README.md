# Bavarian tender data

Offline dataset for JuicyBids. Nothing here downloads data automatically.

## Add a publication day
1. Download both exports for the day in a browser (licence CC0; only finished days exist):
   - OCDS: `https://oeffentlichevergabe.de/api/notice-exports?pubDay=YYYY-MM-DD&format=ocds.zip`
   - eForms: `https://oeffentlichevergabe.de/api/notice-exports?pubDay=YYYY-MM-DD&format=eforms.zip`
2. Put both ZIPs (or their extracted `.json`/`.xml` files) into `data/inbox/`. That folder is gitignored because raw exports contain contact data.
3. Run `npm run data:import`.

The import is idempotent: run it again after adding days. It prints a summary:

| Field | Meaning |
|---|---|
| `read` | files read from the inbox |
| `notices` | distinct notices (`<noticeId>-<version>`) |
| `bavaria` | notices with a NUTS code starting with `DE2` (written to `data/bayern/`) |
| `tenders` | of those, open calls (`tag: tender`) |
| `withDeadline` | of those, with an eForms submission deadline |
| `ocdsOnly` / `eformsOnly` | notices missing their partner file; download the other export for that day |

## Output
- `data/bayern/<noticeId>-<version>.json`: `source` (day, link, file names), `summary`, cleaned OCDS release (`ocds`), extracted eForms data (`eforms.lots[]` with `deadline`, `participationDeadline`, `nuts`, `cpv`, `plannedStart`/`plannedEnd`, `estimatedValue`, `smeSuitable`, `selectionCriteria`).
- `data/bayern/index.json`: one summary per notice (`id`, `pubDay`, `link`, `tag`, `title`, `buyer`, `cpv`, `nuts`, `deadline`, `lots`).

## Rules applied by the import
- Bavaria if a NUTS code from the buyer, the buyer party, an OCDS delivery address or an eForms place of performance starts with `DE2`.
- `contactPoint`, `email`, `telephone`, `faxNumber` are dropped. E-mail addresses and phone numbers inside any text (some buyers put them into `buyer.name`) are replaced by `[E-Mail entfernt]` / `[Telefon entfernt]`.
- Codes stay strings (`03000000` keeps its leading zero).
- Deadline: earliest lot `TenderSubmissionDeadlinePeriod` (`EndDate` + `EndTime`), e.g. `2026-11-30T09:00:00+01:00`. Two-stage procedures may only have `participationDeadline`.

## Check before you commit
```sh
grep -rlE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' data/bayern | wc -l   # must be 0
git status --short data/   # data/inbox must not appear
```
