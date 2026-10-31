---
name: tender-data-import
description: Add publication days to the Bavarian tender dataset - download OCDS and eForms exports by hand, run the offline import into data/bayern, and check counts, deadlines and privacy. Use for JuicyBids data work (tickets T2, T3, data refresh before demos).
---

# Tender data import

Owner: B1 (T2, T3). Also B3 before test runs and D before a demo. Rules: `AGENTS.md`. Details: `data/README.md`.

## Inputs
- Publication days to add (only finished days exist; the demo uses the last 14 days).
- Both exports per day: `format=ocds.zip` and `format=eforms.zip`. The user downloads them in a browser. Do not download them yourself and do not add download code.

## Steps
1. Check that the user placed both ZIPs for each day in `data/inbox/` (`ls data/inbox`).
2. Run `npm run data:import` and read the summary.
3. If `ocdsOnly` or `eformsOnly` is above 0, list which days miss a partner file and ask for that download.
4. Spot-check one notice with a deadline:
   - open `data/bayern/<id>.json`, compare `eforms.lots[0].deadline` and `summary.nuts` with the XML in the inbox ZIP;
   - open `source.link` in a browser and confirm the title.
5. Privacy check (must print 0): `grep -rlE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}' data/bayern | wc -l`
6. Report: days imported, `bavaria`, `tenders`, `withDeadline`, open tenders today:
   `node -e 'const i=require("./data/bayern/index.json");console.log(i.filter(n=>n.tag.includes("tender")&&Date.parse(n.deadline)>Date.now()).length)'`

## CPV codes for demo trades (T3)
Count open tenders per CPV prefix from `data/bayern/index.json`. Use the official CPV list to confirm prefixes; do not guess descriptions. Known from T2: roofing is `45261` (not `4526`, which mixes rail, metal and scaffolding).
Write the result to `docs/tickets/T3/` and hand it to D.

## Done when
- Summary numbers are reported, partner files complete, privacy check is 0.
- `data/inbox/` does not appear in `git status`. Commit only `data/bayern/` and only after the user agrees.
