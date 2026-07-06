const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const apiDir = path.join(__dirname, 'app/api');
const tsNode = path.join(__dirname, 'app/node_modules/.bin/ts-node');
const logPath = '/tmp/backend5002.log';

const out = fs.openSync(logPath, 'a');
const err = fs.openSync(logPath, 'a');

const child = spawn(tsNode, ['server.ts'], {
  cwd: apiDir,
  detached: true,
  stdio: ['ignore', out, err],
});

child.unref();

console.log(`Backend started with PID ${child.pid}`);
