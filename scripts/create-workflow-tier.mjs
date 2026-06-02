#!/usr/bin/env node
// One-click installer for the Workflow Tier.
// Usage: npx @frankxai/workflow-tier <target-repo-path>
//    or: node scripts/create-workflow-tier.mjs <target-repo-path>

import { readFile, writeFile, mkdir, cp, access } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PLUGIN_ROOT = resolve(__dirname, '..')

const target = process.argv[2]
if (!target) {
  console.error('\nWorkflow Tier installer\n')
  console.error('Usage: npx @frankxai/workflow-tier <target-repo-path>')
  console.error('       node scripts/create-workflow-tier.mjs <target-repo-path>\n')
  console.error('Installs the 8 portable workflows + 5 substrate scripts + meta-command + docs')
  console.error('into the target Claude Code repository.\n')
  process.exit(1)
}

const targetRoot = resolve(target)

console.log(`\n→ Installing Workflow Tier into: ${targetRoot}\n`)

if (!existsSync(targetRoot)) {
  console.error(`✗ Target directory does not exist: ${targetRoot}`)
  process.exit(1)
}

// Check if target is a git repo (warn but proceed)
const isGitRepo = existsSync(join(targetRoot, '.git'))
if (!isGitRepo) {
  console.log('⚠  Target is not a git repository. Continuing — but commit your work elsewhere first.\n')
}

// Check for existing .claude dir (don't overwrite, augment)
const existingClaude = existsSync(join(targetRoot, '.claude'))
if (existingClaude) {
  console.log('✓ Found existing .claude/ — will add workflows + command without overwriting\n')
}

async function ensureDir(p) {
  await mkdir(p, { recursive: true })
}

async function copyIfMissing(src, dest, label) {
  if (existsSync(dest)) {
    console.log(`  skip  ${label} (exists)`)
    return false
  }
  await cp(src, dest, { recursive: true, force: false })
  console.log(`  copy  ${label}`)
  return true
}

async function mergeScripts() {
  const targetPkgPath = join(targetRoot, 'package.json')
  if (!existsSync(targetPkgPath)) {
    console.log('  skip  package.json (does not exist — Workflow Tier still works via direct node scripts/* calls)')
    return
  }
  const targetPkg = JSON.parse(await readFile(targetPkgPath, 'utf8'))
  targetPkg.scripts = targetPkg.scripts || {}
  const wtScripts = {
    'workflow:validate': 'node scripts/workflow-validate.mjs',
    'workflow:catalog': 'node scripts/workflow-catalog.mjs',
    'workflow:test': 'node scripts/workflow-test.mjs',
    'workflow:docs': 'node scripts/workflow-catalog.mjs write',
    'gates:list': 'node scripts/workflow-gates.mjs list',
    'gates:pending': 'node scripts/workflow-gates.mjs list --pending',
    'gates:approve': 'node scripts/workflow-gates.mjs approve',
    'gates:reject': 'node scripts/workflow-gates.mjs reject',
    'traj:recall': 'node scripts/workflow-trajectory.mjs recall',
    'traj:record': 'node scripts/workflow-trajectory.mjs record',
    'traj:stats': 'node scripts/workflow-trajectory.mjs stats',
  }
  let added = 0
  for (const [k, v] of Object.entries(wtScripts)) {
    if (!targetPkg.scripts[k]) {
      targetPkg.scripts[k] = v
      added++
    }
  }
  if (added > 0) {
    await writeFile(targetPkgPath, JSON.stringify(targetPkg, null, 2) + '\n')
    console.log(`  edit  package.json (+${added} script(s))`)
  } else {
    console.log('  skip  package.json scripts (already present)')
  }
}

async function appendGitignore() {
  const giPath = join(targetRoot, '.gitignore')
  if (!existsSync(giPath)) {
    await writeFile(giPath, '')
  }
  const current = await readFile(giPath, 'utf8')
  if (current.includes('data/workflow-gates.jsonl')) {
    console.log('  skip  .gitignore (already has workflow runtime entries)')
    return
  }
  const append = `\n# Workflow Tier runtime state (operational, not source)\ndata/workflow-gates.jsonl\ndata/workflow-trajectories.jsonl\n`
  await writeFile(giPath, current + append)
  console.log('  edit  .gitignore (+ workflow runtime state)')
}

// 1. Workflows
await ensureDir(join(targetRoot, '.claude', 'workflows'))
const workflowsCopied = await copyIfMissing(
  join(PLUGIN_ROOT, '.claude', 'workflows'),
  join(targetRoot, '.claude', 'workflows', '_workflow-tier-staging'),
  '.claude/workflows/ (staged to _workflow-tier-staging/)'
)
// Move staged files individually so user can review
if (workflowsCopied) {
  const stagingDir = join(targetRoot, '.claude', 'workflows', '_workflow-tier-staging')
  const { readdir, rename, rm } = await import('node:fs/promises')
  const items = await readdir(stagingDir, { withFileTypes: true })
  for (const item of items) {
    const src = join(stagingDir, item.name)
    const dest = join(targetRoot, '.claude', 'workflows', item.name)
    if (existsSync(dest)) {
      console.log(`  skip  .claude/workflows/${item.name} (exists)`)
      continue
    }
    await rename(src, dest)
    console.log(`  move  .claude/workflows/${item.name}`)
  }
  await rm(stagingDir, { recursive: true, force: true })
}

// 2. Meta-command
await ensureDir(join(targetRoot, '.claude', 'commands'))
await copyIfMissing(
  join(PLUGIN_ROOT, '.claude', 'commands', 'workflow.md'),
  join(targetRoot, '.claude', 'commands', 'workflow.md'),
  '.claude/commands/workflow.md'
)

// 3. Scripts
await ensureDir(join(targetRoot, 'scripts'))
for (const script of ['workflow-validate.mjs', 'workflow-catalog.mjs', 'workflow-test.mjs', 'workflow-gates.mjs', 'workflow-trajectory.mjs']) {
  await copyIfMissing(
    join(PLUGIN_ROOT, 'scripts', script),
    join(targetRoot, 'scripts', script),
    `scripts/${script}`
  )
}

// 4. Pattern docs
await ensureDir(join(targetRoot, 'docs', 'ops'))
for (const doc of ['HUMAN-GATE.md', 'TRAJECTORY-MEMORY.md', 'RUNTIME-STRATEGY.md']) {
  await copyIfMissing(
    join(PLUGIN_ROOT, 'docs', doc),
    join(targetRoot, 'docs', 'ops', doc),
    `docs/ops/${doc}`
  )
}

// 5. package.json scripts
await mergeScripts()

// 6. .gitignore
await appendGitignore()

// 7. Final validation
console.log('\n→ Running post-install validation...\n')
const validateResult = spawnSync('node', ['scripts/workflow-validate.mjs'], { cwd: targetRoot, encoding: 'utf8' })
if (validateResult.status === 0) {
  console.log(validateResult.stdout.split('\n').slice(0, 4).join('\n'))
} else {
  console.error('⚠  workflow:validate did not pass cleanly:')
  console.error(validateResult.stderr || validateResult.stdout)
}

const testResult = spawnSync('node', ['scripts/workflow-test.mjs'], { cwd: targetRoot, encoding: 'utf8' })
if (testResult.status === 0) {
  console.log(testResult.stdout.split('\n').slice(0, 3).join('\n'))
}

console.log(`
✓ Workflow Tier installed.

NEXT STEPS:
  1. Add 'npm run workflow:validate && npm run workflow:test' to your merge:gate
  2. Try a workflow: open Claude Code and say "Run the repo-onboarding workflow"
  3. Schedule cloud routines: use the /schedule skill in Claude Code
  4. Read docs/ops/HUMAN-GATE.md to learn the HITL pattern
  5. Star the repo: https://github.com/frankxai/workflow-tier-plugin

Full docs: https://github.com/frankxai/workflow-tier-plugin#readme
`)
