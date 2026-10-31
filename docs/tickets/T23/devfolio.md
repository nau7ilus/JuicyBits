# JuicyBids – Devfolio

## Tagline

Your AI bid scout for public tenders. Pay per run on Cardano, no subscription.

## The problem

Germany publishes hundreds of thousands of public tenders every year. Small contractors, a roofer with eight people or a five-person software studio, rarely have anyone who reads the portals every day, checks the selection criteria and decides whether a bid is worth the effort. They miss contracts they could win, or spend days on bids they never had a chance at.

Tender alert services exist, but they cost three-digit amounts every month, whether a company searches once a quarter or every day. For a small business that does not pay off.

## What we built

JuicyBids is a paid AI agent on Masumi and Sokosumi. A company describes itself once in a short profile:

1. Trade
2. Services
3. Contract size
4. Certificates
5. References
6. Exclusions

JuicyBids returns a ranked shortlist of open public tenders. For each tender:

1. A score from 0 to 100
2. A verdict: GO, GO WITH CONDITIONS or NO-GO
3. The reasons
4. What is still missing before the deadline
5. The risks

The report comes as a one-page dashboard with score bars, plus a PDF.

Zero matches is a valid answer. JuicyBids never pads the list.

## How payment works

One run costs a fixed price of 1 USDM. No account, no subscription. Because payment runs through Masumi, another AI agent can book and pay JuicyBids too, for example a company's office assistant.

1. The customer books JuicyBids in the Sokosumi gallery.
2. Sokosumi locks 1 USDM in the Masumi escrow contract on Cardano.
3. JuicyBids runs the analysis and delivers the report.
4. The SHA-256 hash of the report is written on-chain, so anyone can prove what was delivered.
5. After the dispute window, the payment is released to JuicyBids.

This ran end to end on Cardano Preprod on 31 October, including the payout:

1. [Customer locks 1 tUSDM in escrow](https://preprod.cardanoscan.io/transaction/92e32c3194fbac1c52c5c813c5f1fdd985e28d4ae3575331bb6efd36ae6ebb79)
2. [Report hash written on-chain](https://preprod.cardanoscan.io/transaction/e3bfe72f48d969287ccd72374a51f7b72823c38d2ddd6d53a52c5e967abf2c01)
3. [1 tUSDM paid out to JuicyBids](https://preprod.cardanoscan.io/transaction/831aa9787a6a6bf0c39478ca49ec71ad5c7206c5b5563efedfd90152c517e279)

## How it works

1. **Prefilter (code):** region, open deadline, CPV code, contract value, time left to bid. At most 25 candidates go to the model.
2. **Assessment (model):** points for eligibility, deliverability, economics and risk, plus knock-out reasons and to-dos.
3. **Scoring (code):** sums the points, applies caps and sets the verdict. GO from 70, GO WITH CONDITIONS from 40.
4. **Re-check (code):** every match is checked against the source data again before it is shown.
5. **Report:** German, with a SHA-256 footer that matches the on-chain hash.

Facts such as title, buyer, deadline, value and link always come from the source data. The model only gives the judgement and never overwrites a fact.

Data comes from the open export of Germany's central procurement data service (Datenservice Öffentlicher Einkauf, CC0). No scraping, no logins. The prototype is loaded with 14 days of Bavaria, 1,566 notices. The import works for any German region.

## Results

We built three fictional companies with eight expected verdicts from real tenders. Four live runs on 31 October scored 8 of 8, 7 of 8, 8 of 8 and 8 of 8. The one miss was a borderline case that disappeared once the company profile was complete.

## Built with

Cardano Preprod, Masumi Payment Service, Sokosumi, MIP-003 agent API, Node.js, OpenAI, pdfkit.

## Limits

1. Below EU thresholds, not every contracting authority publishes in the open export, so coverage there is partial.
2. Model answers vary slightly. Borderline cases can flip between GO and GO WITH CONDITIONS.
3. Preprod only, no real money.

## What's next

1. Load all of Germany instead of Bavaria.
2. Agent to agent research: if a profile is thin, JuicyBids hires a research agent on Sokosumi to look up the company's past work. Built and tested; no research agent in the Preprod gallery accepted a job yet, so it has not run live.

## Links

- Repository: https://github.com/nau7ilus/JuicyBits
- Demo video: TODO (T21)
- Sokosumi agent ID: `01a18f8f-7091-74ae-88a7-8b4856955f83`
