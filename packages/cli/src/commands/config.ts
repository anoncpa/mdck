// src/commands/config.ts
import { Command } from 'commander';
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { ConfigOptions, CliResult } from '../types';
import { logger } from '../utils/logger';
import { ExitCodes } from '../utils/exit-codes';

/**
 * configコマンドの実装
 */
export function createConfigCommand(): Command {
  const command = new Command('config');

  command
    .description('Manage configuration settings')
    .argument('[key]', 'Configuration key to get or set')
    .argument('[value]', 'Value to set (omit to get current value)')
    .option('-d, --delete', 'Delete the specified key')
    .option('-l, --list', 'List all configuration settings')
    .option('-g, --global', 'Use global configuration')
    .option('--verbose', 'Show detailed output')
    .option('--quiet', 'Show only errors')
    .action(async (key: string | undefined, value: string | undefined, options: ConfigOptions) => {
      const configOptions: ConfigOptions = {
        ...options,
        key,
        value,
      };
      
      const result = await executeConfigCommand(configOptions);
      process.exit(result.exitCode);
    });

  return command;
}

/**
 * configコマンドの実行
 */
export async function executeConfigCommand(options: ConfigOptions): Promise<CliResult> {
  try {
    // ロガーの設定
    logger.setQuiet(options.quiet || false);

    if (options.verbose) {
      logger.setLogLevel('debug');
    }

    // 設定ファイルパスを決定
    const configPath = getConfigPath(options.global || false);
    
    // 設定一覧表示
    if (options.list) {
      return await listConfig(configPath);
    }

    // 設定削除
    if (options.delete && options.key) {
      return await deleteConfig(configPath, options.key);
    }

    // 設定取得
    if (options.key && !options.value) {
      return await getConfig(configPath, options.key);
    }

    // 設定設定
    if (options.key && options.value) {
      return await setConfig(configPath, options.key, options.value);
    }

    // デフォルト: 設定一覧表示
    return await listConfig(configPath);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Config command failed: ${message}`);

    return {
      success: false,
      exitCode: ExitCodes.CONFIG_ERROR,
      message,
    };
  }
}

/**
 * 設定ファイルパスを取得
 */
function getConfigPath(global: boolean): string {
  if (global) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.mdck', 'config.json');
  } else {
    return path.join(process.cwd(), '.mdck', 'config.json');
  }
}

/**
 * 設定を読み込み
 */
async function loadConfig(configPath: string): Promise<Record<string, any>> {
  try {
    if (!existsSync(configPath)) {
      return {};
    }

    const content = await readFile(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logger.warn(`Failed to load config from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {};
  }
}

/**
 * 設定を保存
 */
async function saveConfig(configPath: string, config: Record<string, any>): Promise<void> {
  // ディレクトリを作成
  const configDir = path.dirname(configPath);
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  // 設定を保存
  const content = JSON.stringify(config, null, 2);
  await writeFile(configPath, content, 'utf8');
}

/**
 * 設定一覧を表示
 */
async function listConfig(configPath: string): Promise<CliResult> {
  const config = await loadConfig(configPath);
  const keys = Object.keys(config);

  if (keys.length === 0) {
    logger.info('No configuration settings found');
    return {
      success: true,
      exitCode: ExitCodes.SUCCESS,
      message: 'No configuration found',
    };
  }

  logger.info(`Configuration (${configPath}):`);
  for (const key of keys.sort()) {
    const value = config[key];
    const displayValue = typeof value === 'object' 
      ? JSON.stringify(value) 
      : String(value);
    logger.plain(`  ${key} = ${displayValue}`);
  }

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { config, configPath },
  };
}

/**
 * 設定値を取得
 */
async function getConfig(configPath: string, key: string): Promise<CliResult> {
  const config = await loadConfig(configPath);
  const value = getNestedValue(config, key);

  if (value === undefined) {
    logger.error(`Configuration key '${key}' not found`);
    return {
      success: false,
      exitCode: ExitCodes.CONFIG_ERROR,
      message: `Key '${key}' not found`,
    };
  }

  const displayValue = typeof value === 'object' 
    ? JSON.stringify(value, null, 2) 
    : String(value);
  
  console.log(displayValue);

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { key, value },
  };
}

/**
 * 設定値を設定
 */
async function setConfig(configPath: string, key: string, value: string): Promise<CliResult> {
  const config = await loadConfig(configPath);
  
  // 値の型を推定
  const parsedValue = parseConfigValue(value);
  
  // ネストしたキーを設定
  setNestedValue(config, key, parsedValue);
  
  // 設定を保存
  await saveConfig(configPath, config);
  
  logger.success(`Set ${key} = ${value}`);

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { key, value: parsedValue },
  };
}

/**
 * 設定値を削除
 */
async function deleteConfig(configPath: string, key: string): Promise<CliResult> {
  const config = await loadConfig(configPath);
  
  if (getNestedValue(config, key) === undefined) {
    logger.error(`Configuration key '${key}' not found`);
    return {
      success: false,
      exitCode: ExitCodes.CONFIG_ERROR,
      message: `Key '${key}' not found`,
    };
  }

  // ネストしたキーを削除
  deleteNestedValue(config, key);
  
  // 設定を保存
  await saveConfig(configPath, config);
  
  logger.success(`Deleted ${key}`);

  return {
    success: true,
    exitCode: ExitCodes.SUCCESS,
    data: { key },
  };
}

/**
 * ネストした値を取得
 */
function getNestedValue(obj: any, key: string): any {
  const keys = key.split('.');
  let current = obj;
  
  for (const k of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[k];
  }
  
  return current;
}

/**
 * ネストした値を設定
 */
function setNestedValue(obj: any, key: string, value: any): void {
  const keys = key.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (current[k] === undefined || typeof current[k] !== 'object') {
      current[k] = {};
    }
    current = current[k];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * ネストした値を削除
 */
function deleteNestedValue(obj: any, key: string): void {
  const keys = key.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (current[k] === undefined || typeof current[k] !== 'object') {
      return; // キーが存在しない
    }
    current = current[k];
  }
  
  delete current[keys[keys.length - 1]];
}

/**
 * 設定値をパース
 */
function parseConfigValue(value: string): any {
  // boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // null
  if (value === 'null') return null;
  
  // number
  if (/^-?\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  
  // JSON
  if ((value.startsWith('{') && value.endsWith('}')) || 
      (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value);
    } catch {
      // JSONパースに失敗した場合は文字列として扱う
    }
  }
  
  // string
  return value;
}