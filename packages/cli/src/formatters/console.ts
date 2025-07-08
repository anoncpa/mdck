// src/formatters/console.ts
import chalk from 'chalk';
import type { LintReport, LintResult } from '@mdck/parser';
import type { Formatter } from '../types';

/**
 * コンソール出力フォーマッター
 */
export class ConsoleFormatter implements Formatter {
  private useColor: boolean;

  constructor(useColor: boolean = true) {
    this.useColor = useColor;
  }

  /**
   * Lint結果をコンソール形式でフォーマット
   */
  formatLintReport(report: LintReport): string {
    const lines: string[] = [];

    // ヘッダー
    lines.push('');
    if (report.errorCount > 0 || report.warningCount > 0) {
      lines.push(this.formatHeader('Lint Results'));
    }

    // ファイル別の結果
    const fileGroups = this.groupResultsByFile(report.results);
    
    for (const [filePath, results] of fileGroups) {
      if (results.length === 0) continue;

      lines.push('');
      lines.push(this.formatFilePath(filePath));
      
      for (const result of results) {
        lines.push(this.formatLintResult(result));
      }
    }

    // サマリー
    lines.push('');
    lines.push(this.formatSummary(report));

    // パフォーマンス情報
    if (report.duration) {
      lines.push('');
      lines.push(this.formatPerformance(report));
    }

    return lines.join('\n');
  }

  /**
   * エラーメッセージをフォーマット
   */
  formatError(error: Error): string {
    const symbol = this.useColor ? chalk.red('✗') : '✗';
    const message = this.useColor ? chalk.red(error.message) : error.message;
    return `${symbol} ${message}`;
  }

  /**
   * 成功メッセージをフォーマット
   */
  formatSuccess(message: string): string {
    const symbol = this.useColor ? chalk.green('✓') : '✓';
    const text = this.useColor ? chalk.green(message) : message;
    return `${symbol} ${text}`;
  }

  /**
   * ヘッダーをフォーマット
   */
  private formatHeader(title: string): string {
    if (this.useColor) {
      return chalk.bold.underline(title);
    }
    return `${title}\n${'='.repeat(title.length)}`;
  }

  /**
   * ファイルパスをフォーマット
   */
  private formatFilePath(filePath: string): string {
    if (this.useColor) {
      return chalk.bold.cyan(filePath);
    }
    return filePath;
  }

  /**
   * 個別のLint結果をフォーマット
   */
  private formatLintResult(result: LintResult): string {
    const line = result.line ? `:${result.line}` : '';
    const column = result.column ? `:${result.column}` : '';
    const position = `${line}${column}`;

    const severity = this.formatSeverity(result.severity);
    const ruleId = this.formatRuleId(result.ruleId);
    const message = result.message;

    return `  ${position.padEnd(8)} ${severity} ${message} ${ruleId}`;
  }

  /**
   * 重要度をフォーマット
   */
  private formatSeverity(severity: 'error' | 'warn' | 'info'): string {
    if (this.useColor) {
      switch (severity) {
        case 'error':
          return chalk.red('error');
        case 'warn':
          return chalk.yellow('warning');
        case 'info':
          return chalk.blue('info');
        default:
          return severity;
      }
    }
    return severity === 'warn' ? 'warning' : severity;
  }

  /**
   * ルールIDをフォーマット
   */
  private formatRuleId(ruleId: string): string {
    if (this.useColor) {
      return chalk.gray(`(${ruleId})`);
    }
    return `(${ruleId})`;
  }

  /**
   * サマリーをフォーマット
   */
  private formatSummary(report: LintReport): string {
    const lines: string[] = [];
    
    if (report.errorCount === 0 && report.warningCount === 0) {
      lines.push(this.formatSuccess('No problems found'));
    } else {
      const errorText = report.errorCount === 1 ? 'error' : 'errors';
      const warningText = report.warningCount === 1 ? 'warning' : 'warnings';
      
      const parts: string[] = [];
      
      if (report.errorCount > 0) {
        const text = `${report.errorCount} ${errorText}`;
        parts.push(this.useColor ? chalk.red(text) : text);
      }
      
      if (report.warningCount > 0) {
        const text = `${report.warningCount} ${warningText}`;
        parts.push(this.useColor ? chalk.yellow(text) : text);
      }
      
      lines.push(`Found ${parts.join(' and ')}`);
    }

    return lines.join('\n');
  }

  /**
   * パフォーマンス情報をフォーマット
   */
  private formatPerformance(report: LintReport): string {
    const duration = report.duration || 0;
    const preprocessDuration = report.preprocessDuration || 0;
    
    const lines: string[] = [];
    lines.push(this.useColor ? chalk.gray('Performance:') : 'Performance:');
    lines.push(this.useColor ? chalk.gray(`  Total: ${duration}ms`) : `  Total: ${duration}ms`);
    
    if (preprocessDuration > 0) {
      lines.push(this.useColor ? chalk.gray(`  Preprocessing: ${preprocessDuration}ms`) : `  Preprocessing: ${preprocessDuration}ms`);
    }
    
    return lines.join('\n');
  }

  /**
   * 結果をファイル別にグループ化
   */
  private groupResultsByFile(results: readonly LintResult[]): Map<string, LintResult[]> {
    const groups = new Map<string, LintResult[]>();
    
    for (const result of results) {
      // LintResultにfilePathプロパティがない場合は、reportから取得
      const filePath = result.filePath || 'unknown';
      if (!groups.has(filePath)) {
        groups.set(filePath, []);
      }
      groups.get(filePath)!.push(result);
    }
    
    return groups;
  }
}