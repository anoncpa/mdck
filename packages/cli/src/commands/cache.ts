// src/commands/cache.ts
import { Command } from 'commander';
import { MdckParser } from '@mdck/parser';
import type { CacheOptions, CliResult } from '../types';
import { logger } from '../utils/logger';
import { ExitCodes } from '../utils/exit-codes';
import ora from 'ora';

/**
 * cacheコマンドの実装
 */
export function createCacheCommand(): Command {
  const command = new Command('cache');

  command
    .description('Manage cache for faster operations')
    .option('--clear', 'Clear all cache data')
    .option('--rebuild', 'Rebuild cache from scratch')
    .option('--info', 'Show cache information')
    .option('--verbose', 'Show detailed output')
    .option('--quiet', 'Show only errors')
    .action(async (options: CacheOptions) => {
      const result = await executeCacheCommand(options);
      process.exit(result.exitCode);
    });

  return command;
}

/**
 * cacheコマンドの実行
 */
export async function executeCacheCommand(options: CacheOptions): Promise<CliResult> {
  try {
    // ロガーの設定
    logger.setQuiet(options.quiet || false);

    if (options.verbose) {
      logger.setLogLevel('debug');
    }

    // パーサーの初期化
    const parser = new MdckParser();
    const projectRoot = process.cwd();
    parser.initializeCache(projectRoot);

    // キャッシュクリア
    if (options.clear) {
      const spinner = ora('Clearing cache...').start();
      
      try {
        await parser.clearCache();
        spinner.succeed('Cache cleared successfully');
        
        return {
          success: true,
          exitCode: ExitCodes.SUCCESS,
          message: 'Cache cleared',
        };
      } catch (error) {
        spinner.fail('Failed to clear cache');
        throw error;
      }
    }

    // キャッシュ再構築
    if (options.rebuild) {
      const spinner = ora('Rebuilding cache...').start();
      
      try {
        const cacheData = await parser.rebuildCache();
        const fileCount = cacheData?.files.size || 0;
        const templateCount = cacheData?.templates.size || 0;
        
        spinner.succeed(`Cache rebuilt: ${fileCount} files, ${templateCount} templates`);
        
        return {
          success: true,
          exitCode: ExitCodes.SUCCESS,
          message: `Cache rebuilt with ${fileCount} files and ${templateCount} templates`,
          data: {
            fileCount,
            templateCount,
          },
        };
      } catch (error) {
        spinner.fail('Failed to rebuild cache');
        throw error;
      }
    }

    // キャッシュ情報表示
    if (options.info) {
      const spinner = ora('Loading cache information...').start();
      
      try {
        const cacheData = await parser.getCacheData();
        spinner.stop();

        if (!cacheData) {
          logger.info('No cache data found');
          return {
            success: true,
            exitCode: ExitCodes.SUCCESS,
            message: 'No cache data found',
          };
        }

        // 基本情報
        logger.info('Cache Information:');
        logger.plain(`  Version: ${cacheData.version}`);
        logger.plain(`  Project Root: ${cacheData.projectRoot}`);
        logger.plain(`  Last Updated: ${new Date(cacheData.lastUpdated).toISOString()}`);
        logger.plain(`  Files: ${cacheData.files.size}`);
        logger.plain(`  Templates: ${cacheData.templates.size}`);

        // ファイル詳細
        if (options.verbose && cacheData.files.size > 0) {
          logger.plain('\n  Files:');
          for (const [filePath, metadata] of cacheData.files) {
            const relativePath = filePath.replace(cacheData.projectRoot, '.');
            logger.plain(`    ${relativePath}`);
            logger.plain(`      Size: ${metadata.size} bytes`);
            logger.plain(`      Modified: ${new Date(metadata.mtime).toISOString()}`);
            logger.plain(`      Templates: [${metadata.templateIds.join(', ')}]`);
            logger.plain(`      References: [${metadata.referenceIds.join(', ')}]`);
            
            if (metadata.errors && metadata.errors.length > 0) {
              logger.plain(`      Errors: ${metadata.errors.length}`);
            }
          }
        }

        // テンプレート詳細
        if (options.verbose && cacheData.templates.size > 0) {
          logger.plain('\n  Templates:');
          for (const [templateId, templateDef] of cacheData.templates) {
            const relativePath = templateDef.filePath.replace(cacheData.projectRoot, '.');
            logger.plain(`    ${templateId}`);
            logger.plain(`      File: ${relativePath}`);
            logger.plain(`      Lines: ${templateDef.startLine}-${templateDef.endLine}`);
            logger.plain(`      Dependencies: [${templateDef.dependencies.join(', ')}]`);
          }
        }

        // 依存関係グラフ
        if (options.verbose && cacheData.dependencies.nodes.size > 0) {
          logger.plain('\n  Dependency Graph:');
          logger.plain(`    Nodes: ${cacheData.dependencies.nodes.size}`);
          logger.plain(`    Edges: ${Array.from(cacheData.dependencies.edges.values()).reduce((sum, set) => sum + set.size, 0)}`);
          
          if (cacheData.dependencies.cycles.length > 0) {
            logger.plain(`    Circular References: ${cacheData.dependencies.cycles.length}`);
            for (const cycle of cacheData.dependencies.cycles) {
              logger.plain(`      ${cycle.join(' -> ')}`);
            }
          }
        }

        return {
          success: true,
          exitCode: ExitCodes.SUCCESS,
          data: {
            fileCount: cacheData.files.size,
            templateCount: cacheData.templates.size,
            lastUpdated: cacheData.lastUpdated,
          },
        };

      } catch (error) {
        spinner.fail('Failed to load cache information');
        throw error;
      }
    }

    // デフォルト: キャッシュ更新
    const spinner = ora('Updating cache...').start();
    
    try {
      const updateResult = await parser.refreshCache();
      
      if (!updateResult) {
        spinner.warn('Cache not initialized');
        return {
          success: true,
          exitCode: ExitCodes.SUCCESS,
          message: 'Cache not initialized',
        };
      }

      const { addedFiles, updatedFiles, removedFiles, duration } = updateResult;
      const totalChanges = addedFiles + updatedFiles + removedFiles;

      if (totalChanges === 0) {
        spinner.succeed('Cache is up to date');
      } else {
        spinner.succeed(`Cache updated: +${addedFiles} ~${updatedFiles} -${removedFiles} files in ${duration}ms`);
      }

      return {
        success: true,
        exitCode: ExitCodes.SUCCESS,
        message: `Cache updated with ${totalChanges} changes`,
        data: updateResult,
      };

    } catch (error) {
      spinner.fail('Failed to update cache');
      throw error;
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Cache command failed: ${message}`);

    return {
      success: false,
      exitCode: ExitCodes.CACHE_ERROR,
      message,
    };
  }
}