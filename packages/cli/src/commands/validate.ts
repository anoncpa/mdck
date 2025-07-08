// src/commands/validate.ts
import { Command } from 'commander';
import { MdckParser } from '@mdck/parser';
import type { CliResult } from '../types';
import { FileFinder } from '../utils/file-finder';
import { logger } from '../utils/logger';
import { ExitCodes } from '../utils/exit-codes';
import ora from 'ora';

/**
 * validateコマンドの実装
 */
export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('Validate mdck files for syntax and structure')
    .argument('[files...]', 'Files to validate (glob patterns supported)', [])
    .option('--cache', 'Use cache for faster validation', true)
    .option('--no-cache', 'Disable cache')
    .option('--verbose', 'Show detailed output')
    .option('--quiet', 'Show only errors')
    .action(async (files: string[], options: any) => {
      const result = await executeValidateCommand(files, options);
      process.exit(result.exitCode);
    });

  return command;
}

/**
 * validateコマンドの実行
 */
export async function executeValidateCommand(files: string[], options: any): Promise<CliResult> {
  try {
    // ロガーの設定
    logger.setQuiet(options.quiet || false);

    if (options.verbose) {
      logger.setLogLevel('debug');
    }

    // スピナーの開始
    const spinner = ora('Initializing validator...').start();

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
          message: 'No markdown files found to validate',
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

      // 検証実行
      spinner.text = `Validating ${searchResult.files.length} files...`;
      const startTime = Date.now();
      
      let validFiles = 0;
      let invalidFiles = 0;
      const errors: string[] = [];

      for (const filePath of searchResult.files) {
        try {
          const { readFile } = await import('fs/promises');
          const content = await readFile(filePath, 'utf8');
          
          // パース試行
          const parseResult = parser.parse(content);
          
          // 基本的な構文チェック
          if (parseResult.ast && parseResult.directives) {
            validFiles++;
            logger.debug(`✓ ${filePath}`);
          } else {
            invalidFiles++;
            errors.push(`${filePath}: Invalid structure`);
          }
          
        } catch (error) {
          invalidFiles++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${filePath}: ${errorMessage}`);
          logger.debug(`✗ ${filePath}: ${errorMessage}`);
        }
      }

      const duration = Date.now() - startTime;

      if (invalidFiles === 0) {
        spinner.succeed(`All ${validFiles} files are valid (${duration}ms)`);
      } else {
        spinner.fail(`${invalidFiles} files have validation errors`);
        
        // エラー詳細を表示
        if (!options.quiet) {
          logger.plain('\nValidation Errors:');
          for (const error of errors) {
            logger.error(error);
          }
        }
      }

      // 結果サマリー
      if (!options.quiet) {
        logger.plain('\nValidation Summary:');
        logger.plain(`  Valid files: ${validFiles}`);
        logger.plain(`  Invalid files: ${invalidFiles}`);
        logger.plain(`  Total time: ${duration}ms`);
      }

      const exitCode = invalidFiles > 0 ? ExitCodes.LINT_ERRORS : ExitCodes.SUCCESS;

      return {
        success: exitCode === ExitCodes.SUCCESS,
        exitCode,
        data: {
          validFiles,
          invalidFiles,
          errors,
          duration,
        },
      };

    } catch (error) {
      spinner.fail('Validation failed');
      throw error;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Validate command failed: ${message}`);

    return {
      success: false,
      exitCode: ExitCodes.GENERAL_ERROR,
      message,
    };
  }
}