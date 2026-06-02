# Workflow Runtime Strategy — Local vs Cloud vs Hybrid

The Workflow Tier ships in three runtime profiles. The right answer is not "always cloud" or "always local" — it's *which one matches what the workflow touches*. This doc codifies the contract and the dispatcher logic.

## The three runtimes

| Profile | When to use | Trade-off |
|---|---|---|
| **`local-only`** | Workflow reads uncommitted working tree, local-only files (`/tmp`, `~/_inbox/`), local services (dev server, local DB), machine-specific paths | Needs your machine on. Fast feedback. No cloud cost. |
| **`cloud-only`** | Workflow operates purely on committed repo state. Reads via git, writes via PR. Needs no local state. | Machine-independent. Costs cloud tokens. Slower wall-clock (CCR cold start ~30-60s). |
| **`hybrid`** | Works in both. Caller picks based on context. Default to cloud for scheduled runs, local for ad-hoc dev. | Adds dispatcher complexity. Best ergonomic surface. |

## Classification of the 11 shipped workflows

| Workflow | Profile | Reason |
|---|---|---|
| `pre-deploy-sweep` | **local-only** | Reads `git diff main...HEAD` of the *working tree* — uncommitted state matters. Cloud would only see what's pushed. |
| `hub-audit-rotation` | **hybrid** | Reads `app/<hub>/` from committed repo. Same answer either way. Cloud preferred for scheduled. |
| `newsletter-friday` | **cloud-preferred** | Writes a new MDX file to `content/newsletters/issues/`. Either works, but scheduling on cloud removes "must be at machine Friday morning" failure mode. |
| `book-deepen-pipeline` | **hybrid** | Needs source material (PDF, highlights) which may be local-only (uploaded files in `_inbox/`). If source is a URL, cloud works. |
| `research-fanout` | **cloud-preferred** | Pure web research + draft writing. No local dependency. Cloud removes operator burden. |
| `pr-review-multi-perspective` | **cloud-preferred** | Operates on the PR branch — always pushed to remote by definition. Cloud has full context. |
| `repo-onboarding` | **hybrid** | Reads committed state. Cloud works fine. Local is faster for an active dev session. |
| `release-checklist` | **hybrid** | Reads tags + diff from `fromTag...HEAD`. Either runtime. |
| `dependency-audit` | **hybrid** | Reads `package.json` + lockfile. Either works. |
| `incident-postmortem` | **hybrid** | Needs `git log` + maybe local incident files. Hybrid with bias to local when fresh. |
| `tech-debt-triage` | **hybrid** | Reads committed code. Either works. |

## Adding `runtime` to the meta contract

```js
export const meta = {
  name: 'workflow-name',
  // ...
  acos: {
    tier: 'L99',
    cadence: 'weekly',
    portable: true,
    runtime: 'cloud-only' | 'local-only' | 'hybrid',
    runtimeDefault: 'cloud' | 'local',  // for hybrid, what scheduled routines should use
    composes: [],
    composedBy: [],
    estimatedCost: { min, max },
  },
}
```

The validator enforces: `runtime` field present, `runtimeDefault` only set when `runtime === 'hybrid'`.

## Dispatcher logic (the smart picker)

When invoked, the runtime selection happens in this order:

1. **Explicit override** — caller passed `runtime: 'local'` or `runtime: 'cloud'` → use it
2. **`local-only`** → always local (Workflow tool in current Claude Code session)
3. **`cloud-only`** → always cloud (must be scheduled via `RemoteTrigger` or `/schedule`)
4. **`hybrid`** with scheduled trigger → use `runtimeDefault` (usually cloud)
5. **`hybrid`** with manual invocation → use whatever is faster (local if Claude Code session active, cloud if dispatcher itself is remote)

## Practical implication for the 4 scheduled routines

| Routine | Workflow | Runtime check |
|---|---|---|
| newsletter-friday-weekly | `newsletter-friday` | cloud-preferred ✓ |
| hub-audit-rotation-weekly | `hub-audit-rotation` | hybrid → cloud ✓ |
| research-fanout-weekly | `research-fanout` | cloud-preferred ✓ |
| dependency-audit-monthly | `dependency-audit` | hybrid → cloud ✓ |

All 4 align with their `runtime` profile. The one that does *not* belong in a cloud cron: `pre-deploy-sweep` (local-only), which is correctly NOT scheduled — it fires before each push, locally.

## Future: dispatcher implementation

When time permits, add `scripts/workflow-dispatch.mjs`:
- Reads `meta.acos.runtime` for the named workflow
- If `local-only`: invokes via local `Workflow({...})` tool
- If `cloud-only`: invokes via `RemoteTrigger {action: 'run', trigger_id: '...'}`
- If `hybrid`: prompts operator or uses `--prefer cloud|local` flag

This makes the system truly agile — operator says "run dependency-audit", dispatcher figures out where it runs based on context.
