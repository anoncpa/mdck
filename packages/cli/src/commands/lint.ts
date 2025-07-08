// src/commands/lint.ts
import { Command } from 'commander';
import { writeFile } from 'fs/promises';
import { MdckParser } from '@mdck/parser';
import type { LintOptions, CliResult } from '../types';
import { FileFinder } from '../utils/file-finder';
import { logger } from '../utils/logger';
import { ExitCodes } from '../utils/exit-codes';
import { createFormatter } from '../formatters';
import ora from 'ora';

/**
 * lintコマンドの実装
 */
export function createLintCommand(): Command {
  const command = new Command('lint');

  command
    .description('Lint mdck files for errors and warnings')
    .argument('[files...]', 'Files to lint (glob patterns supported)', [])
    .option('-f, --format <format>', 'Output format (console, json, sarif, junit)', 'console')
    .option('-o, --output <file>', 'Output file (default: stdout)')
    .option('--rules <rules>', 'Comma-separated list of rules to enable')
    .option('--disable-rules <rules>', 'Comma-separated list of rules to disable')
    .option('-c, --config <file>', 'Path to configuration file')
    .option('--fix', 'Automatically fix problems where possible')
    .option('--cache', 'Use cache for faster linting', true)
    .option('--no-cache', 'Disable cache')
    .option('--verbose', 'Show detailed output')
    .option('--quiet', 'Show only errors')
    .option('--color', 'Force color output', true)
    .option('--no-color', 'Disable color output')
    .action(async (files: string[], options: LintOptions) => {
      const result = await executeLintCommand(files, options);
      process.exit(result.exitCode);
    });

  return command;
}

/**
 * lintコマンドの実行
 */
export async function executeLintCommand(files: string[], options: LintOptions): Promise<CliResult> {
  try {
    // ロガーの設定
    logger.setQuiet(options.quiet || false);
    logger.setUseColor(options.color !== false);

    if (options.verbose) {
      logger.setLogLevel('debug');
    }

    // スピナーの開始
    const spinner = ora('Initializing linter...').start();

    try {
      // ファイル検索
      spinner.text = 'Finding files...';
      const fileFinder = new FileFinder();
      const searchResult = await fileFinder.findMarkdownFiles(
        files.length > 0 ? files : undefined
      );

      if (searchResult.files.length === 0) {
        spinner.fail('No markdown files found');
        return {
          success: false,
          exitCode: ExitCodes.FILE_NOT_FOUND,
          message: 'No markdown files found to lint',
        };
      }

      logger.debug(`Found ${searchResult.files.length} files in ${searchResult.duration}ms`);

      // パーサーの初期化
      spinner.text = 'Initializing parser...';
      const parser = new MdckParser();

      // キャッシュの初期化
      if (options.cache !== false) {
        const projectRoot = process.cwd();
        parser.initializeCache(projectRoot);
        logger.debug('Cache initialized');
      }

      // Lint設定の構築
      const lintConfig = buildLintConfig(options);
      logger.debug('Lint configuration:', lintConfig);
      
      // パーサーにLint設定を適用
      if (Object.keys(lintConfig).length > 0) {
        parser.updateLintConfig(lintConfig);
      }

      // Lint実行
      spinner.text = `Linting ${searchResult.files.length} files...`;
      const startTime = Date.now();
      
      const lintPromises = searchResult.files.map(async (filePath) => {
        try {
          const { readFile } = await import('fs/promises');
          const content = await readFile(filePath, 'utf8');
          // parserのlintメソッドは(content, filePath?, projectRoot?)のシグネチャ
          return await parser.lint(content, filePath, process.cwd());
        } catch (error) {
          logger.warn(`Failed to lint file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return null;
        }
      });

      const lintResults = await Promise.all(lintPromises);
      const validResults = lintResults.filter(result => result !== null);

      // 結果の集約
      const aggregatedReport = aggregateLintReports(validResults);
      aggregatedReport.duration = Date.now() - startTime;

      spinner.succeed(`Linted ${searchResult.files.length} files in ${aggregatedReport.duration}ms`);

      // 結果の出力
      const formatter = createFormatter(options.format || 'console', {
        color: options.color !== false,
        pretty: options.verbose || false,
      });

      const formattedOutput = formatter.formatLintReport(aggregatedReport);

      if (options.output) {
        await writeFile(options.output, formattedOutput, 'utf8');
        logger.success(`Results written to ${options.output}`);
      } else {
        console.log(formattedOutput);
      }

      // 自動修正
      if (options.fix) {
        logger.info('Auto-fix functionality is not yet implemented');
      }

      // 終了コードの決定
      const exitCode = aggregatedReport.errorCount > 0 
        ? ExitCodes.LINT_ERRORS 
        : ExitCodes.SUCCESS;

      return {
        success: exitCode === ExitCodes.SUCCESS,
        exitCode,
        data: aggregatedReport,
      };

    } catch (error) {
      spinner.fail('Linting failed');
      throw error;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Lint command failed: ${message}`);

    return {
      success: false,
      exitCode: ExitCodes.GENERAL_ERROR,
      message,
    };
  }
}

/**
 * Lint設定を構築
 */
function buildLintConfig(options: LintOptions): any {
  const config: any = {};

  // ルール設定をMapで構築
  const rulesMap = new Map();

  if (options.rules) {
    const enabledRules = options.rules.split(',').map(rule => rule.trim());
    for (const rule of enabledRules) {
      rulesMap.set(rule, { enabled: true, severity: 'error' });
    }
  }

  if (options.disableRules) {
    const disabledRules = options.disableRules.split(',').map(rule => rule.trim());
    for (const rule of disabledRules) {
      rulesMap.set(rule, { enabled: false });
    }
  }

  if (rulesMap.size > 0) {
    config.rules = rulesMap;
  }

  return config;
}

/**
 * 複数のLint結果を集約
 */
function aggregateLintReports(reports: any[]): any {
  const aggregated = {
    errorCount: 0,
    warningCount: 0,
    results: [] as any[],
    duration: 0,
    preprocessDuration: 0,
  };

  for (const report of reports) {
    if (!report) continue;

    aggregated.errorCount += report.errorCount || 0;
    aggregated.warningCount += report.warningCount || 0;
    aggregated.results.push(...(report.results || []));
    aggregated.preprocessDuration += report.preprocessDuration || 0;
  }

  return aggregated;
}