#!/usr/bin/env node

// このファイルは@mdck/cliのエントリーポイントです。
// commanderを使用してCLIコマンドを定義し、各コマンドのロジックを実装します。
import { Command } from 'commander';
import { createLintCommand } from './commands/lint';
import { createGenerateCommand } from './commands/generate';
import { createCacheCommand } from './commands/cache';
import { createValidateCommand } from './commands/validate';
import { createCompletionCommand } from './commands/completion';
import { createConfigCommand } from './commands/config';

const program = new Command();

program
  .name('mdck')
  .description('CLI for mdck (Markdown Check List)')
  .version('1.0.0');

// サブコマンドを追加
program.addCommand(createLintCommand());
program.addCommand(createGenerateCommand());
program.addCommand(createCacheCommand());
program.addCommand(createValidateCommand());
program.addCommand(createCompletionCommand());
program.addCommand(createConfigCommand());

// グローバルオプション
program
  .option('--no-color', 'Disable colored output')
  .option('--verbose', 'Show verbose output')
  .option('--quiet', 'Show only errors');

program.parse();
