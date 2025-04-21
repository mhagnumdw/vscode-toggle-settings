import { defineConfig } from '@vscode/test-cli';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempUserDataDir = join(
  tmpdir(),
  `vscode-test-${Math.random().toString(36).slice(2)}`
);

// vscode-extension-test-runner does not work with console.log
console.log(`Using temporary user data directory for vscode: ${tempUserDataDir}`);

export default defineConfig({
  files: 'out/test/**/*.test.js',
  launchArgs: [
    '--user-data-dir=' + tempUserDataDir,
  ],
  mocha: {
    timeout: 10000, // default is 2000 ms
  }
  // coverage: {} // https://github.com/microsoft/vscode-test-cli/issues/40#issuecomment-2815825666
});
