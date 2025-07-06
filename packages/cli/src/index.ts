// packages/cli/src/index.ts
// #!/usr/bin/env node

// このファイルは@mdck/cliのエントリーポイントです。
// commanderを使用してCLIコマンドを定義し、各コマンドのロジックを実装します。
import { Command } from 'commander';
import { parse } from '@mdck/parser';

console.log('This is @mdck/cli');
parse(''); // parserパッケージの関数を呼び出すテスト

const program = new Command();

program
  .name('mdck')
  .description('CLI for mdck (Markdown Check List)')
  .version('1.0.0');

program
  .command('lint')
  .description('Lint mdck files')
  .action(() => {
    console.log('Linting...');
  });

program.parse();
