const path = require('path');
require(path.join(__dirname, 'app/node_modules/dotenv')).config({ path: path.join(__dirname, 'app/api/.env') });

const { spawn } = require('child_process');
const child = spawn('npx', ['ts-node', 'prisma/seed.ts'], {
  cwd: path.join(__dirname, 'app/api'),
  stdio: 'inherit',
  env: process.env,
});
child.on('exit', (code) => process.exit(code));
