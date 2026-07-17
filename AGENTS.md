# Repository Instructions

This repo is part of the FrankX / Starlight / Arcanea agent estate.

## Classification

- Repo: workflow-tier-plugin
- Class: agent-substrate
- Default health command: `git status` (functional check: `npm run check` — runs `workflow:validate` + `workflow:test`)
- Remote: https://github.com/frankxai/workflow-tier-plugin.git

## What This Repo Is

A portable orchestration layer that drops into any Claude Code repo: 8 portable multi-agent
workflows in `.claude/workflows/` (repo-onboarding, dependency-audit, pr-review-multi-perspective,
release-checklist, incident-postmortem, tech-debt-triage, research-pulse-daily,
model-arena-daily), plus one non-portable, project-specific workflow (`pre-deploy-sweep.js`,
hardcoded to `frankx.ai-vercel-website`, deliberately excluded from the "8 portable" count).
Three substrates compose with all of them: `workflow-gates` (native human-in-the-loop approve/
reject), `workflow-trajectory` (cross-run memory), `workflow-test` (fixture runner against
`.claude/workflows/__fixtures__/`, no live LLM calls). Scripts live in `scripts/`, generated docs
in `docs/ops/` when installed downstream. This repo uses npm (not pnpm) — it's designed to be
copied into arbitrary target repos, not built standalone in the estate's pnpm workspace.

## Agent Rules

- Read this file before making changes.
- Preserve existing user work and unrelated dirty files.
- Keep edits scoped to the requested task.
- Prefer existing repo conventions over new abstractions.
- Run the health command before handoff when feasible.
- Do not publish secrets, private memory, credentials, or internal-only strategy.

## Class-Specific Guidance

- Preserve skill/plugin/MCP schemas and frontmatter.
- Validate skills, manifests, scripts, and generated registries after edits.
- Keep public/private memory boundaries explicit.

## Handoff

Summarize changed files, validation run, risks, and any follow-up needed.

## Design Taste Kernel

For any site, app, landing page, dashboard, visual identity, brand, motion, media, social, or frontend task, apply the shared Design Taste Kernel before handoff:

- C:\Users\frank\starlight\repos\DESIGN_TASTE.md
- C:\Users\frank\starlight\repos\WEB_EXPERIENCE_STANDARD.md
- C:\Users\frank\starlight\repos\MOTION_TASTE_RUBRIC.md
- C:\Users\frank\starlight\repos\MULTI_AGENT_DESIGN_COUNCIL.md
- C:\Users\frank\starlight\repos\VISUAL_QA_GATE.md

When motion, scroll, generated media, GIF/video, or premium polish matters, route through the Motion Design Studio plugin/skills and verify the result visually.

