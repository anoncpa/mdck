// src/utils/logger.ts
import chalk from 'chalk';
import type { LogLevel } from '../types';

/**
 * ログ出力ユーティリティ
 */
export class Logger {
  private logLevel: LogLevel;
  private useColor: boolean;
  private quiet: boolean;

  constructor(logLevel: LogLevel = 'info', useColor: boolean = true, quiet: boolean = false) {
    this.logLevel = logLevel;
    this.useColor = useColor;
    this.quiet = quiet;
  }

  /**
   * エラーログ
   */
  error(message: string, ...args: any[]): void {
    if (this.quiet) return;
    
    const prefix = this.useColor ? chalk.red('✗') : '✗';
    console.error(`${prefix} ${message}`, ...args);
  }

  /**
   * 警告ログ
   */
  warn(message: string, ...args: any[]): void {
    if (this.quiet || !this.shouldLog('warn')) return;
    
    const prefix = this.useColor ? chalk.yellow('⚠') : '⚠';
    console.warn(`${prefix} ${message}`, ...args);
  }

  /**
   * 情報ログ
   */
  info(message: string, ...args: any[]): void {
    if (this.quiet || !this.shouldLog('info')) return;
    
    const prefix = this.useColor ? chalk.blue('ℹ') : 'ℹ';
    console.log(`${prefix} ${message}`, ...args);
  }

  /**
   * デバッグログ
   */
  debug(message: string, ...args: any[]): void {
    if (this.quiet || !this.shouldLog('debug')) return;
    
    const prefix = this.useColor ? chalk.gray('🐛') : '🐛';
    console.log(`${prefix} ${message}`, ...args);
  }

  /**
   * 成功ログ
   */
  success(message: string, ...args: any[]): void {
    if (this.quiet) return;
    
    const prefix = this.useColor ? chalk.green('✓') : '✓';
    console.log(`${prefix} ${message}`, ...args);
  }

  /**
   * プレーンログ（プレフィックスなし）
   */
  plain(message: string, ...args: any[]): void {
    if (this.quiet) return;
    console.log(message, ...args);
  }

  /**
   * ログレベルを設定
   */
  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * 色付き出力を設定
   */
  setUseColor(useColor: boolean): void {
    this.useColor = useColor;
  }

  /**
   * 静音モードを設定
   */
  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  /**
   * ログレベルチェック
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentIndex = levels.indexOf(this.logLevel);
    const targetIndex = levels.indexOf(level);
    
    return targetIndex <= currentIndex;
  }
}

// デフォルトロガーインスタンス
export const logger = new Logger();