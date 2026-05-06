const { spawn } = require('child_process');

const child = spawn('node', ['../../node_modules/drizzle-kit/bin.cjs', 'generate:pg'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

let count = 0;
const interval = setInterval(() => {
  child.stdin.write('\r\n');
  count++;
  if (count > 10) {
    clearInterval(interval);
    child.stdin.end();
  }
}, 500);

child.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});
