import { randomUUID } from 'node:crypto';
import { get } from 'node:http';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { spawnSync } from 'node:child_process';

const image = process.env.NAVET_DOCKER_IMAGE?.trim() || 'navet:local';
const hostPort = process.env.NAVET_DOCKER_SMOKE_PORT?.trim() || '38080';
const containerName = `navet-smoke-${randomUUID().slice(0, 8)}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(stderr || stdout || `${command} ${args.join(' ')} failed.`);
  }

  return result.stdout?.trim() ?? '';
}

function requestHtml(url) {
  return new Promise((resolve) => {
    const request = get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve(Boolean(response.statusCode && response.statusCode < 400 && /<html/i.test(body)));
      });
    });

    request.setTimeout(2000, () => {
      request.destroy(new Error('HTTP readiness probe timed out.'));
    });
    request.on('error', () => resolve(false));
  });
}

async function waitForHttpReady(url) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await requestHtml(url)) {
      return;
    }

    await delay(1000);
  }

  throw new Error(`Navet did not respond successfully at ${url}.`);
}

try {
  run('docker', ['run', '--rm', '-d', '--name', containerName, '-p', `${hostPort}:80`, image]);

  try {
    await waitForHttpReady(`http://127.0.0.1:${hostPort}/`);
    console.log(`Docker smoke check passed for ${image}.`);
  } finally {
    spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
