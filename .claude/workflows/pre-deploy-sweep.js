export const meta = {
  name: 'pre-deploy-sweep',
  description: 'Pre-deploy excellence gate. Parallel: build/TS, links, integrity, a11y, brand, SEO. Verdict rollup with blocking findings. Fires before any push to frankx.ai-vercel-website.',
  whenToUse: 'Before any push to production (frankx.ai-vercel-website). Mandatory gate. Skip only for hotfixes with explicit operator override.',
  phases: [
    { title: 'Gate', detail: '6 parallel gates' },
    { title: 'Synthesize', detail: 'verdict + blocking list' },
  ],
  acos: {
    tier: 'L99',
    cadence: 'per-deploy',
    portable: false,
    composes: [],
    composedBy: [],
    estimatedCost: { min: 140000, max: 220000, calibratedRuns: 1, lastRun: { totalTokens: 387879, agentCount: 6, durationMs: 358063, knownIssue: 'build agent times out on long pnpm builds — needs polling pattern' } },
  },
}

const GATE_SCHEMA = {
  type: 'object',
  required: ['lane', 'verdict', 'summary'],
  properties: {
    lane: { type: 'string' },
    verdict: { enum: ['pass', 'warn', 'fail'] },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { enum: ['info', 'warn', 'error'] },
          message: { type: 'string' },
          file: { type: 'string' },
        },
      },
    },
  },
}

const baseRef = args?.baseRef ?? 'main'

phase('Recall')
const priorRuns = await agent(
  `Run: node scripts/workflow-trajectory.mjs recall --workflow pre-deploy-sweep --limit 5\n` +
  `Return JSON. Last 5 deploys tell us which lanes commonly warn/fail (build agent often times out, a11y has known low-contrast hotspots).`,
  { phase: 'Recall', model: 'haiku' }
).catch(() => ({ summary: 'cold start — first pre-deploy', lessonsLearned: [] }))
log(`Trajectory: ${priorRuns?.summary || 'cold start'}`)

phase('Gate')
const results = await parallel([
  () => agent(
    `Run \`pnpm build\` from the repo root. Capture exit code + last 50 lines of stderr. Set lane="build". verdict=pass if exit 0 and zero warnings, warn if exit 0 with warnings, fail if non-zero exit. findings = list of TypeScript/Next.js errors with file paths.`,
    { label: 'build', phase: 'Gate', schema: GATE_SCHEMA }
  ),
  () => agent(
    `Run \`pnpm links:check:static\` from the repo root. Set lane="links". verdict=pass if 0 broken internal links, fail otherwise. findings = list of broken href + source file.`,
    { label: 'links', phase: 'Gate', schema: GATE_SCHEMA }
  ),
  () => agent(
    `Use \`git diff --name-only ${baseRef}...HEAD\` to find changed files. Filter to *.mdx and content/**. Audit each against brand voice, AI-slop, claim integrity, and JSON-LD schema validity. Set lane="integrity".`,
    { label: 'integrity', phase: 'Gate', agentType: 'integrity-guard', schema: GATE_SCHEMA }
  ),
  () => agent(
    `Use \`git diff --name-only ${baseRef}...HEAD\` to find changed files. Filter to app/**/page.tsx and components/**/*.tsx. Audit each against WCAG 2.2 AAA: keyboard nav, ARIA labels, color contrast, focus indicators, alt text. Set lane="a11y".`,
    { label: 'a11y', phase: 'Gate', agentType: 'accessibility-auditor', schema: GATE_SCHEMA }
  ),
  () => agent(
    `Use \`git diff --name-only ${baseRef}...HEAD\` to find changed files. Filter to components/** and app/**/page.tsx. Audit each against the FrankX brand: glassmorphic dark default, voice consistency, no Arcanean mythology leak, CTA discipline. Read design.md + taste.md at repo root for the contract. Set lane="brand".`,
    { label: 'brand', phase: 'Gate', agentType: 'brand-architect', schema: GATE_SCHEMA }
  ),
  () => agent(
    `Run the SEO check on any changed routes. Use \`git diff --name-only ${baseRef}...HEAD\` to find changed app/**/page.tsx. For each, verify: meta title <60 chars, meta description 140-160 chars, single h1, question-based h2s, Article/FAQPage schema if MDX-driven. Set lane="seo".`,
    { label: 'seo', phase: 'Gate', schema: GATE_SCHEMA }
  ),
])

phase('Synthesize')
const lanes = results.filter(Boolean)
const fails = lanes.filter(r => r.verdict === 'fail')
const warns = lanes.filter(r => r.verdict === 'warn')
const passes = lanes.filter(r => r.verdict === 'pass')
const verdict = fails.length ? 'fail' : warns.length ? 'warn' : 'pass'

log(`Pre-deploy verdict: ${verdict.toUpperCase()} — ${passes.length} pass, ${warns.length} warn, ${fails.length} fail`)

phase('Record')
const runId = args?.runId || `pre-deploy-${args?.date || 'manual'}`
const failingLanes = fails.map(f => f.lane).join(',')
await agent(
  `Record this pre-deploy run. Run: node scripts/workflow-trajectory.mjs record --workflow pre-deploy-sweep ` +
  `--runId ${runId} --outcome ${verdict} --findings ${fails.length + warns.length} ` +
  `--summary "Verdict: ${verdict} · ${passes.length} pass · ${warns.length} warn · ${fails.length} fail" ` +
  `--lessonsLearned "verdict:${verdict}|failingLanes:${failingLanes}"`,
  { phase: 'Record', model: 'haiku' }
).catch(() => null)

return {
  verdict,
  shippable: verdict !== 'fail',
  baseRef,
  lanes: lanes.map(r => ({ lane: r.lane, verdict: r.verdict, summary: r.summary, findings: r.findings ?? [] })),
  blocking: fails.flatMap(r => (r.findings ?? []).map(f => ({ lane: r.lane, ...f }))),
}
