import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
if (!['dev', 'build', 'test'].includes(mode)) {
  throw new Error('Expected Storybook mode: dev, build, or test');
}

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args =
  mode === 'test'
    ? ['exec', 'vitest', '--project', 'storybook']
    : ['--filter', '@navet/storybook', 'run', mode === 'dev' ? 'storybook' : 'build'];
const pnpmCli = process.env.npm_execpath;
const command = pnpmCli ? process.execPath : 'pnpm';
const commandArgs = pnpmCli ? [pnpmCli, ...args] : args;
const result = spawnSync(command, commandArgs, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    STORYBOOK: '1',
    STORYBOOK_BASE_PATH: '/',
    STORYBOOK_DISABLE_TELEMETRY: '1',
    HOME: path.join(repoRoot, '.cache/storybook/home'),
    XDG_CONFIG_HOME: path.join(repoRoot, '.cache/storybook'),
  },
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
