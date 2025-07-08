// src/commands/generate.ts
import { Command } from 'commander';
import { writeFile, access } from 'fs/promises';
import { MdckParser } from '@mdck/parser';
import type { GenerateOptions, CliResult } from '../types';
import { logger } from '../utils/logger';
import { ExitCodes } from '../utils/exit-codes';
import ora from 'ora';

/**
 * generateコマンドの実装
 */
export function createGenerateCommand(): Command {
  const command = new Command('generate');

  command
    .description('Generate content from templates')
    .argument('<template-id>', 'Template ID to generate from')
    .option('-o, --output <file>', 'Output file (default: stdout)')
    .option('-f, --force', 'Overwrite existing files')
    .option('--var <key=value>', 'Set template variables', collectVariables, {})
    .option('--cache', 'Use cache for faster generation', true)
    .option('--no-cache', 'Disable cache')
    .option('--verbose', 'Show detailed output')
    .option('--quiet', 'Show only errors')
    .action(async (templateId: string, options: GenerateOptions & { var: Record<string, string> }) => {
      // --var オプションの値を variables に移動
      const generateOptions: GenerateOptions = {
        ...options,
        templateId,
        variables: options.var,
      };
      
      const result = await executeGenerateCommand(generateOptions);
      process.exit(result.exitCode);
    });

  return command;
}

/**
 * --var オプションの値を収集
 */
function collectVariables(value: string, previous: Record<string, string>): Record<string, string> {
  const [key, ...valueParts] = value.split('=');
  const variableValue = valueParts.join('=');
  
  if (!key || variableValue === undefined) {
    throw new Error(`Invalid variable format: ${value}. Use --var key=value`);
  }
  
  return { ...previous, [key]: variableValue };
}

/**
 * generateコマンドの実行
 */
export async function executeGenerateCommand(options: GenerateOptions): Promise<CliResult> {
  try {
    // ロガーの設定
    logger.setQuiet(options.quiet || false);

    if (options.verbose) {
      logger.setLogLevel('debug');
    }

    // スピナーの開始
    const spinner = ora('Initializing generator...').start();

    try {
      // パーサーの初期化
      spinner.text = 'Initializing parser...';
      const parser = new MdckParser();

      // キャッシュの初期化
      if (options.cache !== false) {
        const projectRoot = process.cwd();
        parser.initializeCache(projectRoot);
        logger.debug('Cache initialized');
      }

      // テンプレートの存在確認
      spinner.text = 'Checking template availability...';
      const cacheData = await parser.getCacheData();
      
      if (cacheData && !cacheData.templates.has(options.templateId)) {
        spinner.fail(`Template '${options.templateId}' not found`);
        
        // 利用可能なテンプレート一覧を表示
        const availableTemplates = Array.from(cacheData.templates.keys());
        if (availableTemplates.length > 0) {
          logger.info('Available templates:');
          for (const templateId of availableTemplates.sort()) {
            logger.plain(`  - ${templateId}`);
          }
        } else {
          logger.info('No templates found in the project');
        }

        return {
          success: false,
          exitCode: ExitCodes.TEMPLATE_NOT_FOUND,
          message: `Template '${options.templateId}' not found`,
        };
      }

      // テンプレートの展開
      spinner.text = `Generating content from template '${options.templateId}'...`;
      
      // テンプレートファイルを特定
      const templateDef = cacheData?.templates.get(options.templateId);
      if (!templateDef) {
        throw new Error(`Template definition not found: ${options.templateId}`);
      }

      // テンプレートファイルの内容を読み取り
      const { readFile } = await import('fs/promises');
      const templateContent = await readFile(templateDef.filePath, 'utf8');

      // テンプレートを展開
      const expansionResult = await parser.expandTemplate(
        templateContent,
        options.templateId,
        templateDef.filePath
      );
      
      if (expansionResult.status !== 'success') {
        throw new Error(`Template expansion failed: ${expansionResult.message}`);
      }
      
      // ASTを文字列に変換
      const expandedContent = parser.stringify(expansionResult.expandedAst);

      spinner.succeed(`Generated content from template '${options.templateId}'`);

      // 出力ファイルの確認
      if (options.output) {
        // ファイルの存在確認
        if (!options.force) {
          try {
            await access(options.output);
            logger.error(`File '${options.output}' already exists. Use --force to overwrite.`);
            return {
              success: false,
              exitCode: ExitCodes.GENERAL_ERROR,
              message: `File '${options.output}' already exists`,
            };
          } catch {
            // ファイルが存在しない場合は続行
          }
        }

        // ファイルに書き込み
        await writeFile(options.output, expandedContent, 'utf8');
        logger.success(`Content written to ${options.output}`);
      } else {
        // 標準出力に出力
        console.log(expandedContent);
      }

      return {
        success: true,
        exitCode: ExitCodes.SUCCESS,
        data: {
          templateId: options.templateId,
          output: options.output,
          contentLength: expandedContent.length,
        },
      };

    } catch (error) {
      spinner.fail('Generation failed');
      throw error;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Generate command failed: ${message}`);

    return {
      success: false,
      exitCode: ExitCodes.GENERAL_ERROR,
      message,
    };
  }
}