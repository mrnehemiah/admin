'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const excluded = new Set(['.git', 'node_modules', 'android-app']);
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excluded.has(entry.name)) collect(path.join(directory, entry.name));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.js') && path.resolve(directory, entry.name) !== __filename) {
      files.push(path.join(directory, entry.name));
    }
  }
}

collect(root);
let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed += 1;
    process.stderr.write(`\nSyntax error: ${path.relative(root, file)}\n`);
    process.stderr.write(result.stderr || result.stdout || 'Node syntax check failed.\n');
  }
}

if (failed) {
  process.stderr.write(`\n${failed} of ${files.length} JavaScript files failed syntax validation.\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated ${files.length} JavaScript files successfully.\n`);
}
