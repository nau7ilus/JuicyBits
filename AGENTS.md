# TenderScout (TUM Blockchain & AI Hackathon, Cardano track)

A paid Masumi/Sokosumi agent. For small and mid-sized contractors in Bavaria it turns a company profile with bidding criteria into a ranked, verified shortlist of public tenders with go/no-go reasoning.
Deadline Sat 31 Oct 2026 15:00, freeze 14:30. Tickets, owners and dependencies: `tickets.json`. Current status and test guide (German): `STAND.md`.

## Team and tickets
Roles: D development (critical path T1 → T7 → T8 → T10 → T12 → T13), B1 data and criteria, B2 business case and pitch, B3 test and docs, B4 video and Devfolio.
Ask which role you support before you start. Work only on that role's tickets. Deliver handoffs to the `handoff_to` owner by `handoff_deadline`.
Put ticket deliverables that are not code in `docs/tickets/<ticket>/`.

## Template rules (from tum-hackathon-quickstart)
Adapt the existing application. Keep its working paths when you change the agent's purpose.
Read README.md and the affected source before edits. Keep dependency versions pinned and exact unless the user requests an upgrade.
Run `npm test` after behavior changes. Add a regression test only when it catches a named bug.
Create fresh dedicated account resources, a payment database, and wallets for each project.
Never copy another project's Coworker, Vendor, wallet, registration, or task identifiers.
Read current `sokosumi skills` and command help before provisioning. Use supported credential interfaces. Never inspect the credential vault.
Keep credentials in private environment files or the supported CLI vault. Keep generated state under ignored paths.
Do not commit `.env`, `.local/`, `data/inbox/`, runtime JSON, private logs, seeds, or credentials.
Require the participant's `AGENT_AUTHOR` before agent registration.
Get user authorization before external writes, resource creation, funds transfers, publishing, deployment, commits, or pushes.
Do not claim live execution, registration, or seller payment without measured evidence.

## Project rules
- Facts (title, buyer, deadline, value, CPV, NUTS, link) come from the source data. Judgement (score, go/no-go, reasons, risks) comes from the model. The model never overwrites a fact.
- Send at most 25 notices to the model per run. Prefilter harder if more remain.
- Zero verified matches is a valid result. Never pad the list.
- Never store or output contact data (names of persons, e-mail, phone, fax). `data/import.mjs` redacts it; keep it that way.
- The model is OpenAI: `OPENAI_API_KEY`, `OPENAI_MODEL`, optional `OPENAI_CONTEXT_WINDOW_TOKENS` in `.env`. The setup skill's `ZAI_*` names are replaced by these.
- Report text in German. Code, comments and commit messages in English.
- Data source is the public Open Data export only. No scraping, no logins, no third-party tender databases, no automatic downloads. People download exports by hand.
- Do not invent URLs, endpoint paths or field names. Mark anything unverified as `TODO (Txx)`.
- After T13 (paid Preprod job) do not change the payment path, endpoints or Masumi config. Change only pipeline and report.
- Keep the MIP-003 endpoints (`/start_job`, `/status`, `/availability`, `/input_schema`) in `agent-api.mjs`. Change bodies, not the contract. The result is a string; files are delivered as links.
- Won't build: below-threshold portal scraping, user accounts or subscriptions, mainnet or real funds, bid document generation, scheduling, notifications, dashboards, more than one price model.

## Environment and commands
Use WSL (Ubuntu) with Node.js 24 from nvm and Sokosumi CLI `1.0.4`. Run `npm ci` inside WSL; do not share `node_modules` with Windows.
```sh
npm run setup          # check tools, Sokosumi login, .env, data; lists missing config (-- --check: no changes)
npm run try            # interactive: pick a pass from examples/, change fields, run offline or live, compare with t5-expected.json
npm test               # all tests (root, data/ and tender/)
npm run data:import    # data/inbox/*.zip → data/bayern/ (offline, Bavaria only)
npm run scout -- examples/p3-isarcode.pass.json [--offline]   # one report from a Firmenpass (needs npm start unless --offline)
npm run eval           # T5 cases against examples/t5-expected.json with the live model (needs npm start)
npm start              # local Eve agent (terminal 1)
npm run worker         # Sokosumi worker (terminal 2), one per Coworker
npm run api            # MIP-003 API for paid jobs
```

## Data
Source: Datenservice Öffentlicher Einkauf, `https://oeffentlichevergabe.de/api/notice-exports?pubDay=YYYY-MM-DD&format=ocds.zip|eforms.zip`, licence CC0.
OCDS has no submission deadline; it comes from eForms. Both files share the name `<noticeId>-<version>`.
`data/bayern/<noticeId>-<version>.json` holds `source`, `summary`, the cleaned OCDS release and extracted eForms lots (deadline, NUTS, CPV, planned period, value, selection criteria). `data/bayern/index.json` lists all summaries.
Bavaria means any NUTS code starting with `DE2`. Coverage: above EU thresholds is mandatory, below-threshold coverage is partial. Say so in README, Devfolio and the report footer.
Field paths and import rules: `data/README.md`. Scope is Bavaria only.

## Layout
- `agent/instructions.md`: the agent's system prompt (T6 criteria and point ranges, JSON output format)
- `tender/`: pipeline. `pass.mjs` Firmenpass validation (T9), `prefilter.mjs` prefilter and CPV stages (T8), `assess.mjs` model call and T6 scoring (T10), `verify.mjs` source re-check (T18), `report.mjs` German report with SHA-256 footer (T10, T19), `scout.mjs` entry point with the `answer()` signature (T12), `eval.mjs` T5 evaluation
- `docs/firmenpass.md`: input fields and scoring rules
- `worker.mjs`, `comments.mjs`, `client.mjs`, `paid-task.mjs`, `agent-api.mjs`: template runtime (Sokosumi tasks, follow-up comments, payments)
- `data/`: offline import and the Bavarian dataset
- `examples/`: company profiles and expected results (test cases)
- `docs/`: evidence, criteria and pitch material
- `.claude/skills/`: task guides, see below

## Skills
Read the matching skill before you start a task. Any agent can read these files directly.
- `.claude/skills/tum-hackathon-agent/SKILL.md`: Sokosumi/Masumi setup, first task, Preprod payment (D: T1, T12, T13)
- `.claude/skills/tender-data-import/SKILL.md`: download exports, import Bavaria, check the result (B1: T2, T3; B3)
- `.claude/skills/tender-test-cases/SKILL.md`: company profiles with expected go/no-go (B3: T5, T11)
- `.claude/skills/assessment-prompt/SKILL.md`: write and tune the German assessment prompt (B2: T6; D/B3: T20)
- `.claude/skills/pitch-docs/SKILL.md`: business case, README, Devfolio, video (B2, B3, B4: T14–T17, T22, T23)
