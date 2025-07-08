// src/formatters/json.ts
import type { LintReport } from '@mdck/parser';
import type { Formatter } from '../types';

/**
 * JSON出力フォーマッター
 */
export class JsonFormatter implements Formatter {
  private pretty: boolean;

  constructor(pretty: boolean = false) {
    this.pretty = pretty;
  }

  /**
   * Lint結果をJSON形式でフォーマット
   */
  formatLintReport(report: LintReport): string {
    const output = {
      summary: {
        errorCount: report.errorCount,
        warningCount: report.warningCount,
        totalCount: report.results.length,
      },
      performance: {
        duration: report.duration || 0,
        preprocessDuration: report.preprocessDuration || 0,
      },
      results: report.results.map(result => ({
        filePath: result.filePath,
        line: result.line,
        column: result.column,
        severity: result.severity,
        message: result.message,
        ruleId: result.ruleId,
        fixable: result.fixable,
        details: result.details,
      })),
    };

    return this.pretty 
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }

  /**
   * エラーメッセージをJSON形式でフォーマット
   */
  formatError(error: Error): string {
    const output = {
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack,
      },
    };

    return this.pretty 
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }

  /**
   * 成功メッセージをJSON形式でフォーマット
   */
  formatSuccess(message: string): string {
    const output = {
      success: {
        message,
      },
    };

    return this.pretty 
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }
}