'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const files = ['allin-runout.test.js', 'side-pots.test.js', 'bb-option.test.js', 'min-raise.test.js'];
let failed = 0;
for (const file of files) {
  console.log(`\n=== ${file} ===`);
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (r.status !== 0) failed = r.status || 1;
}
process.exit(failed);
