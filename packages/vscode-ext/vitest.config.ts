// packages/vscode-ext/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // VSCode拡張機能のテストはnode環境で実行
  },
});
