---
name: pitch-docs
description: Write TenderScout's business case, README, Devfolio text and video storyboard from verified project facts and evidence. Use for tickets T14-T17, T22, T23 or any submission text.
---

# Pitch and docs

Owners: B2 business case (T14, with B1), B4 storyboard and Devfolio (T15, T16, T23 with B2), B3 README (T17, T22). Rules: `AGENTS.md`.

## Sources (use only these, cite numbers from them)
- Product and scope: `AGENTS.md`, `tickets.json` (`wont` list).
- Data and coverage: `data/README.md`, `data/bayern/index.json` for current counts.
- Evidence: `docs/evidence.md` (completed Task ID, result, payment tx hash, seller receipt). Until it exists, write `TODO (T12)` / `TODO (T13)`; never claim a payment or run that is not recorded there.
- Rules: https://hackathon.tum-blockchain.com/prizes#cardano and https://hackathon.tum-blockchain.com/prizes#how-to-submit, Devfolio https://tum.devfolio.co/. Re-read them; do not rely on memory.

## Fixed messages
- Customer: small and mid-sized contractors in Bavaria (Handwerk, Bau, Reinigung, Security, Beratung), or their office-assistant agent ordering a run.
- Value is the assessment, not the list: each notice is read against the customer's criteria. Listing services sell subscriptions.
- Why Cardano: pay per run instead of a subscription; escrow; an agent can order without a human account.
- "Verified" means: notice exists in the export, deadline is open, CPV and region match. Only claim it once T18 is done.
- Limits, stated everywhere: Bavaria only; above EU thresholds is mandatory in the source, below-threshold coverage is partial; Preprod test funds only.
- Open questions to Masumi (on-chain result hash, partial settlement) stay open until answered; do not promise either.

## Outputs
- T14: `docs/business-case.md` (customer, journey, price per run, answers to "why blockchain" and "why not DTAD", coverage).
- T15: `docs/storyboard.md` (max 2.5 min, scene list with timing, spoken text, which screen D records).
- T16/T23: `docs/devfolio.md`.
- T17/T22: `README.md` (problem, pipeline, setup in WSL, exact run commands, limits, evidence links).
Write submission texts in the language the event requires; keep claims identical across all of them.

## Done when
- Every number and claim traces to a source above, limits are stated, and README commands were run by someone on a clean clone.
