import test from 'node:test';
import assert from 'node:assert/strict';
import { payloadProblems, secretProblems, command } from './pack-rules.mjs';

const plugin = { files: ['.claude/', '.claude-plugin/', 'scripts/', 'docs/', 'README.md', 'LICENSE', '!scripts/release'] };
const full = ['package.json', 'README.md', 'LICENSE', '.claude-plugin/plugin.json', '.claude/commands/workflow.md', 'scripts/workflow-test.mjs', 'docs/HUMAN-GATE.md'];

test('a complete plugin tarball passes', () => {
  assert.deepEqual(payloadProblems(full, plugin, 'plugin'), []);
});

test('a plugin tarball without its manifest or payload fails', () => {
  const thin = ['package.json', 'README.md', 'LICENSE'];
  const p = payloadProblems(thin, plugin, 'plugin');
  assert.ok(p.some(x => /plugin manifest/.test(x)));
  assert.ok(p.some(x => /"\.claude\/" ships nothing/.test(x)));
});

test('glob files entries match by prefix; negations are ignored', () => {
  assert.deepEqual(payloadProblems(['dist/cli.js'], { files: ['dist/**/*.js', '!dist/test'] }, 'cli'), []);
  assert.deepEqual(payloadProblems([], { files: ['dist/**/*.js'] }, 'cli'), ['files entry "dist/**/*.js" ships nothing']);
});

const entry = (name, text) => ({ name, size: Buffer.byteLength(text), read: () => Buffer.from(text) });
const fake = (...parts) => parts.join('');

test('credential-shaped names fail regardless of content', () => {
  for (const name of ['docs/private.pem', 'scripts/credentials.json', 'x/id_ed25519', 'a/service-account-prod.json', 'k.p12']) {
    assert.equal(secretProblems([entry(name, 'harmless')]).length, 1, name);
  }
});

test('secrets inside innocent files fail; ordinary text passes', () => {
  assert.match(secretProblems([entry('docs/notes.md', fake('-----BEGIN ', 'PRIVATE KEY-----\nabc'))])[0], /private key in docs\/notes\.md/);
  assert.match(secretProblems([entry('a.js', fake('const t = "ghp_', 'a'.repeat(36), '"'))])[0], /GitHub token/);
  assert.match(secretProblems([entry('a.js', fake('npm_', 'B'.repeat(36)))])[0], /npm token/);
  assert.deepEqual(secretProblems([entry('README.md', 'Set GH_TOKEN and NPM_TOKEN in your environment. sk- prefixes are keys.')]), []);
});

test('only pnpm/npm/npx on Windows go through a shell, as one vetted command line', () => {
  assert.deepEqual(command('pnpm', ['pack', '--pack-destination', 'C:/tmp/x'], 'win32'), { file: 'pnpm pack --pack-destination C:/tmp/x', args: [], shell: true });
  assert.deepEqual(command('node', ['a.mjs'], 'win32'), { file: 'node', args: ['a.mjs'], shell: false });
  assert.deepEqual(command('pnpm', ['pack'], 'linux'), { file: 'pnpm', args: ['pack'], shell: false });
  for (const bad of ['a&b', 'x | y', 'C:\\with space', '"q"', '%PATH%']) assert.throws(() => command('npm', ['view', bad], 'win32'), /refusing/, bad);
});
