// pack-rules.mjs — pure checks over a packed tarball's entries, kept apart from pack-assert.mjs so
// they can be tested without running `pnpm pack`.

// The payload a consumer installs must be in the tarball, not merely in the checkout the tests ran
// against. For a plugin that is its manifest; for every kind, each positive `files` entry must match
// at least one shipped file, or `files` silently drops what it names.
export function payloadProblems(listing, pkg, kind) {
  const problems = [];
  if (kind === 'plugin' && !listing.includes('.claude-plugin/plugin.json')) problems.push('plugin manifest .claude-plugin/plugin.json is not in the tarball');
  for (const raw of pkg.files ?? []) {
    if (raw.startsWith('!')) continue;
    const entry = raw.replace(/^\.\//, '').replace(/\/$/, '');
    const prefix = entry.replace(/\/?\*.*$/, '');
    if (!listing.some(f => f === entry || f.startsWith(`${prefix}/`) || (prefix && f === prefix))) problems.push(`files entry "${raw}" ships nothing`);
  }
  return problems;
}

const SECRET_NAMES = [
  /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /\.jks$/i, /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.|$)/i,
  /(^|\/)credentials?(\.[\w-]+)?\.json$/i, /(^|\/)service-account[\w-]*\.json$/i, /(^|\/)\.netrc$/, /(^|\/)\.pypirc$/,
];

// Matched on content so a secret inside an innocently named file is caught too.
const SECRET_CONTENT = [
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['Anthropic key', /\bsk-ant-[A-Za-z0-9_-]{20,}/],
  ['OpenAI key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['Stripe live key', /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}/],
];

const TEXT_LIMIT = 2 * 1024 * 1024;

// entries: [{ name, size, read() -> Buffer }], names relative to the package root.
export function secretProblems(entries) {
  const problems = [];
  for (const e of entries) {
    if (SECRET_NAMES.some(re => re.test(e.name))) { problems.push(`credential-shaped file shipped: ${e.name}`); continue; }
    if (e.size > TEXT_LIMIT) continue;
    const body = e.read().toString('utf8');
    for (const [label, re] of SECRET_CONTENT) if (re.test(body)) { problems.push(`${label} in ${e.name}`); break; }
  }
  return problems;
}

const SHIMS = new Set(['pnpm', 'npm', 'npx']);
const SAFE_ARG = /^[\w@.=:/\\+~-]+$/;

// Windows ships pnpm/npm/npx as .cmd shims, which Node will not launch without a shell. Only those
// three go through one, as a single command line built from arguments that cannot carry shell
// syntax; everything else (node, git) runs directly.
export function command(cmd, argv, platform = process.platform) {
  if (platform !== 'win32' || !SHIMS.has(cmd)) return { file: cmd, args: argv, shell: false };
  for (const a of argv) if (!SAFE_ARG.test(a)) throw new Error(`refusing to pass "${a}" to ${cmd} through cmd.exe`);
  return { file: [cmd, ...argv].join(' '), args: [], shell: true };
}

export function runTool(execFileSync, cmd, argv, opts = {}) {
  const c = command(cmd, argv);
  return c.shell ? execFileSync(c.file, { ...opts, shell: true }) : execFileSync(c.file, c.args, opts);
}
