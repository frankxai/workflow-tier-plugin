#!/usr/bin/env node
// Keeps .claude-plugin/plugin.json on the npm version. changesets bumps package.json only, so without
// this every release publishes a plugin manifest advertising the previous version.
//   node scripts/release/sync-plugin-version.mjs          write package.json's version into plugin.json
//   node scripts/release/sync-plugin-version.mjs --check  exit 1 if they differ (CI)
import { readFileSync, writeFileSync } from 'node:fs';

const MANIFEST = '.claude-plugin/plugin.json';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const raw = readFileSync(MANIFEST, 'utf8');
const plugin = JSON.parse(raw);

if (plugin.version === pkg.version) {
  console.log(`plugin.json ${plugin.version} matches package.json`);
  process.exit(0);
}
if (process.argv.includes('--check')) {
  console.error(`plugin.json version ${plugin.version} ≠ package.json ${pkg.version}; run: node scripts/release/sync-plugin-version.mjs`);
  process.exit(1);
}
// Replace only the version value so the file's formatting and key order survive.
const next = raw.replace(/("version"\s*:\s*")[^"]*(")/, `$1${pkg.version}$2`);
if (JSON.parse(next).version !== pkg.version) throw new Error(`could not rewrite the version in ${MANIFEST}`);
writeFileSync(MANIFEST, next);
console.log(`plugin.json ${plugin.version} -> ${pkg.version}`);
