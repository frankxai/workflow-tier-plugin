# Changelog

## v0.2.0 — 2026-06-02 (sprint extension)

### Added
- `npx create-workflow-tier <repo>` one-click installer — clones substrate into target repo, merges package.json scripts, appends .gitignore, runs validation
- Companion substrate scripts (synced from frankxai/FrankX sprint):
  - `scripts/workflow-gates.mjs` — Human-in-the-loop CLI (list/check/create/approve/reject)
  - `scripts/workflow-trajectory.mjs` — Cross-run memory (recall/record/stats)
  - `scripts/workflow-test.mjs` — Smoke fixture runner (in CI merge gate)
- `docs/HUMAN-GATE.md`, `docs/TRAJECTORY-MEMORY.md`, `docs/RUNTIME-STRATEGY.md` — pattern documentation
- 8 smoke fixtures in `.claude/workflows/__fixtures__/` (one per portable workflow)
- `bin` entry in package.json so `npx @frankxai/workflow-tier <target>` works after publish

### Changed
- Plugin manifest (`plugin.json`) now declares the 5 substrate scripts in provides.scripts
- README updated with installer command + 5 design principles + calibrated cost data

### Calibrated runs (live, from frankxai/FrankX sprint)
| Workflow | Tokens | Agents | Findings |
|---|---|---|---|
| repo-onboarding | 395k | 7 | 14 |
| dependency-audit | 361k | 7 | 88 (2 crit) |
| tech-debt-triage | 559k | 11 | 65 |
| pre-deploy-sweep | 388k | 6 | a11y warns |
| hub-audit-rotation (32 pages) | 2.78M | 34 | 453 (9 crit) |

## v0.1.0 — 2026-06-02

### Initial release
- 8 portable workflows (dependency-audit, incident-postmortem, model-arena-daily, pr-review-multi-perspective, release-checklist, repo-onboarding, research-pulse-daily, tech-debt-triage)
- 2 substrate scripts (workflow-validate, workflow-catalog)
- `/workflow` meta-command
- Plugin manifest in Anthropic knowledge-work-plugins format
- MIT license

## Roadmap

### v0.3 — typed state + cache wiring (target 2026-06-15)
- Typed `WorkflowState` interface (LangGraph-style) with zod validation
- 1-hour prompt cache wiring (`extended-cache-ttl-2025-04-01`) for scheduled cascade
- Visual `/admin/workflow-gates` Next.js page template for plugin consumers

### v0.4 — adaptive + resume (target 2026-07-01)
- `nextRun` field — agents emit next-fire timestamps based on state
- Step-level resume from checkpoint
- ReasoningBank/AgentDB integration upgrade path

### v0.5 — marketplace (target Q3 2026)
- frankx.ai/workflows public catalog
- User-contributed workflows with curation gate
- Workflow Tier Pro tier (custom workflows + outcome-based pricing)
