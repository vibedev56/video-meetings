// PostToolUse hook: formats the file that Edit, Write or MultiEdit just changed.
// Reads the hook payload (JSON) from stdin and runs the project's own Prettier.
// Never blocks the tool: any failure exits 0.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const prettierBin = path.join(
  root,
  'node_modules',
  'prettier',
  'bin',
  'prettier.cjs',
);

let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
}

let filePath;
try {
  filePath = JSON.parse(input)?.tool_input?.file_path;
} catch {
  process.exit(0);
}

if (
  typeof filePath !== 'string' ||
  !existsSync(filePath) ||
  !existsSync(prettierBin)
) {
  process.exit(0);
}

spawnSync(
  process.execPath,
  [prettierBin, '--write', '--ignore-unknown', '--log-level', 'warn', filePath],
  { cwd: root, stdio: 'inherit' },
);

process.exit(0);
