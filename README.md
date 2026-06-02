# Workflow Tier

The orchestration layer above Claude Code skills, agents, and commands. 8 portable multi-agent workflows + native human-in-the-loop gates + trajectory memory across runs + cost-discipline doctrine. Drop into any Claude Code repo.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Anthropic CCR Compatible](https://img.shields.io/badge/Anthropic-CCR%20Compatible-7e57c2)](https://code.claude.com/docs/en/routines)
[![14/14 Validates](https://img.shields.io/badge/workflows-14%2F14_validate-green)](#)

## What this gives you

8 workflows that take a project from cold-start to production discipline:

| Workflow | Cadence | What it does |
|---|---|---|
| `repo-onboarding` | on-demand | 6-lens parallel scan → operating brief with first-PR recommendations |
| `dependency-audit` | monthly | Security CVEs + license + freshness + bundle + dead deps + supply chain |
| `pr-review-multi-perspective` | per-pr | 6 dimensions reviewed in parallel, each finding adversarially verified |
| `release-checklist` | per-release | Tests + changelog + version + migration + rollback + composes dep audit |
| `incident-postmortem` | per-incident | Parallel evidence gathering → 5-Whys RCA → blameless markdown |
| `tech-debt-triage` | quarterly | 5-lens scan → impact × effort buckets → concrete fix proposals |
| `research-pulse-daily` | daily | 3 domain scans → 200-word morning brief, queues weekly items |
| `model-arena-daily` | daily | Opus/Sonnet/Haiku comparison on rotating canonical prompt |

Plus three substrates that compose with all of them:

- **`workflow-gates`** — Native HITL. The first workflow system shipping `await human.approve(context)` as a convention with CLI approve/reject.
- **`workflow-trajectory`** — Karpathy AutoResearch ratchet + IBM Research 2603.10600. Every run learns from prior runs.
- **`workflow-test`** — Fixture runner that validates against extracted schemas, no live LLM calls. Pre-merge gate.

## Why this exists

Per a 2026-06-02 evidence briefing with 33 verified citations:

> "Schema discipline, cost contracts, scheduled cadence, and adversarial review — these four together are rare even among VC-backed agent products. The pattern everyone wants and nobody has shipped: platform-native `await human.approve(context)` that suspends mid-run with zero token consumption."

Workflow Tier ships all five.

## Install (≤2 minutes)

```bash
# Clone into your existing Claude Code repo
git clone https://github.com/frankxai/workflow-tier-plugin .workflow-tier
cp -r .workflow-tier/.claude/workflows .claude/
cp -r .workflow-tier/.claude/commands .claude/
cp -r .workflow-tier/scripts/* scripts/
mkdir -p docs/ops && cp -r .workflow-tier/docs/* docs/ops/

# Add the script wires to your package.json
# (workflow:validate, workflow:test, gates:*, traj:*)

# Wire into your CI gate
# Append `&& npm run workflow:validate && npm run workflow:test` to your merge:gate

# Verify (all should pass)
npm run workflow:validate    # 8/8 ok
npm run workflow:test        # 8 pass · 0 fail
```

A future `npx create-workflow-tier my-repo` will collapse this to one command.

## Use

```bash
# List all workflows + cost envelopes + composition graph
node scripts/workflow-catalog.mjs table

# Invoke a workflow in your Claude Code session
# (your operator pastes:)
"Run the repo-onboarding workflow."

# Or programmatically
Workflow({ name: 'repo-onboarding' })

# Run smoke tests
npm run workflow:test
```

## The 5 design principles

### 1. Schema discipline
Every `agent()` call returning structured data uses JSON Schema. No "model said yes but lied" failures.

### 2. Cost contracts
Every workflow declares `acos.estimatedCost.min/max`. After 3+ runs, `calibratedRuns` + `lastRun` get appended. Guesses become evidence.

### 3. Tier-model-down
Bash agents use Haiku. Multi-dimension review uses Sonnet. Synthesis-of-many uses Opus. **Default model inheritance is rarely correct.**

### 4. Composition contract
Portable workflows compose ONLY other portable workflows. Validator enforces this — see `scripts/workflow-validate.mjs`.

### 5. Cost gates per cadence
- Daily ≤100k tokens (Sonnet, 3 scans, no drafts)
- Weekly 100k-400k (Sonnet+Opus, 5 scans, drafts to staging)
- Monthly 100-300k
- Quarterly 150k-1M
- Per-event varies

## Anthropic CCR integration

All workflows run inside Anthropic Claude Code Routines (CCR) — scheduled remote execution in Anthropic's cloud, no local machine dependency. Example schedule:

```bash
# Via /schedule skill in your Claude Code session
"Schedule research-pulse-daily to run every day at 8:33 UTC."
```

Documentation in `docs/RUNTIME-STRATEGY.md` covers local-vs-cloud-vs-hybrid runtime contracts.

## Calibrated cost data (from live runs)

| Workflow | Real cost (one run) | Findings produced |
|---|---|---|
| `repo-onboarding` | 395k tokens, 7 agents, 4.6 min | 14 actionable gotchas + 3 PR recs |
| `dependency-audit` | 361k tokens, 7 agents, 5 min | 88 findings (2 critical CVEs caught) |
| `tech-debt-triage` | 559k tokens, 11 agents, 9 min | 65 ranked items (caught bug in own validator) |
| `hub-audit-rotation` (32 pages) | 2.78M tokens, 34 agents, 10 min | 453 (9 critical, 115 high) — scales with pageCount |

## File structure

```
.claude/
├── workflows/                  # 8 portable workflows + __fixtures__/
├── commands/workflow.md         # Meta-command (list/run/cost/status/validate/docs)
.claude-plugin/
└── plugin.json                  # Manifest (knowledge-work-plugins format)
scripts/
├── workflow-validate.mjs        # Static validator (recursive agent scan, composition check)
├── workflow-catalog.mjs         # Observability (table/graph/json/doc/write modes)
├── workflow-test.mjs            # Smoke fixture runner
├── workflow-gates.mjs           # Human-in-the-loop CLI
└── workflow-trajectory.mjs      # Cross-run memory CLI
docs/
├── HUMAN-GATE.md                # Pattern doc with workflow integration
├── TRAJECTORY-MEMORY.md         # Pattern doc with workflow integration
└── RUNTIME-STRATEGY.md          # Local/cloud/hybrid contract
```

## Roadmap

- v0.2 — `npx create-workflow-tier <repo>` one-click installer
- v0.2 — `/admin/workflow-gates` Next.js page (visual approval UI)
- v0.3 — Typed `WorkflowState` interface (LangGraph-style) with zod validation at step boundaries
- v0.3 — 1-hour prompt cache (`extended-cache-ttl-2025-04-01`) wired into scheduled cascade
- v0.4 — Adaptive scheduling (`nextRun` field — agent emits next-fire timestamp based on state)
- v0.4 — Workflow marketplace at frankx.ai/workflows + user-contributed workflows

## Origin

Built inside `frankxai/FrankX` (private dev repo for [frankx.ai](https://frankx.ai)) over a focused 2026-06-01/02 sprint. Extracted to this standalone repo for distribution.

Companion substrate: [`frankxai/agentic-creator-os`](https://github.com/frankxai/agentic-creator-os) (full ACOS, MIT) for the broader system this Workflow Tier composes into.

## License

MIT — see [LICENSE](./LICENSE).

## Cite

If this primitive shows up in your work, a `Workflow Tier (Riemer, 2026)` citation in your README + a star on the repo helps the substrate compound.
