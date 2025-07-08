// src/formatters/junit.ts
import type { LintReport, LintResult } from '@mdck/parser';
import type { Formatter } from '../types';

/**
 * JUnit XML フォーマッター
 * CI/CDシステムでのテスト結果表示に使用
 */
export class JunitFormatter implements Formatter {
  /**
   * Lint結果をJUnit XML形式でフォーマット
   */
  formatLintReport(report: LintReport): string {
    const testSuites = this.groupResultsByFile(report.results);
    const totalTests = report.results.length;
    const failures = report.errorCount;
    const errors = 0; // Lintエラーは全てfailureとして扱う
    const time = (report.duration || 0) / 1000; // ミリ秒を秒に変換

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites name="mdck-lint" tests="${totalTests}" failures="${failures}" errors="${errors}" time="${time}">\n`;

    for (const [filePath, results] of testSuites) {
      xml += this.generateTestSuite(filePath, results);
    }

    xml += '</testsuites>\n';
    return xml;
  }

  /**
   * エラーメッセージをJUnit XML形式でフォーマット
   */
  formatError(error: Error): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites name="mdck-lint" tests="1" failures="0" errors="1" time="0">\n';
    xml += '  <testsuite name="mdck-execution" tests="1" failures="0" errors="1" time="0">\n';
    xml += '    <testcase name="execution" classname="mdck">\n';
    xml += `      <error message="${this.escapeXml(error.message)}" type="${error.name}">\n`;
    xml += `        ${this.escapeXml(error.stack || '')}\n`;
    xml += '      </error>\n';
    xml += '    </testcase>\n';
    xml += '  </testsuite>\n';
    xml += '</testsuites>\n';
    return xml;
  }

  /**
   * 成功メッセージをJUnit XML形式でフォーマット
   */
  formatSuccess(message: string): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites name="mdck-lint" tests="1" failures="0" errors="0" time="0">\n';
    xml += '  <testsuite name="mdck-success" tests="1" failures="0" errors="0" time="0">\n';
    xml += '    <testcase name="success" classname="mdck">\n';
    xml += `      <system-out>${this.escapeXml(message)}</system-out>\n`;
    xml += '    </testcase>\n';
    xml += '  </testsuite>\n';
    xml += '</testsuites>\n';
    return xml;
  }

  /**
   * テストスイートを生成
   */
  private generateTestSuite(filePath: string, results: LintResult[]): string {
    const suiteName = filePath.replace(/[^a-zA-Z0-9]/g, '_');
    const tests = results.length || 1; // 結果がない場合も1つのテストとして扱う
    const failures = results.filter(r => r.severity === 'error').length;
    const errors = 0;

    let xml = `  <testsuite name="${this.escapeXml(suiteName)}" tests="${tests}" failures="${failures}" errors="${errors}" time="0">\n`;

    if (results.length === 0) {
      // 問題がない場合は成功のテストケースを追加
      xml += `    <testcase name="no-issues" classname="${this.escapeXml(filePath)}">\n`;
      xml += '    </testcase>\n';
    } else {
      // 各Lint結果をテストケースとして追加
      for (const result of results) {
        xml += this.generateTestCase(filePath, result);
      }
    }

    xml += '  </testsuite>\n';
    return xml;
  }

  /**
   * テストケースを生成
   */
  private generateTestCase(filePath: string, result: LintResult): string {
    const testName = `${result.ruleId}-line-${result.line || 'unknown'}`;
    const className = filePath;

    let xml = `    <testcase name="${this.escapeXml(testName)}" classname="${this.escapeXml(className)}">\n`;

    if (result.severity === 'error') {
      xml += `      <failure message="${this.escapeXml(result.message)}" type="${result.ruleId}">\n`;
      xml += `        File: ${this.escapeXml(filePath)}\n`;
      xml += `        Line: ${result.line || 'unknown'}\n`;
      xml += `        Column: ${result.column || 'unknown'}\n`;
      xml += `        Rule: ${result.ruleId}\n`;
      xml += `        Message: ${this.escapeXml(result.message)}\n`;
      xml += '      </failure>\n';
    } else if (result.severity === 'warning') {
      xml += `      <system-out>\n`;
      xml += `        Warning: ${this.escapeXml(result.message)}\n`;
      xml += `        Rule: ${result.ruleId}\n`;
      xml += `        Line: ${result.line || 'unknown'}\n`;
      xml += '      </system-out>\n';
    }

    xml += '    </testcase>\n';
    return xml;
  }

  /**
   * 結果をファイル別にグループ化
   */
  private groupResultsByFile(results: readonly LintResult[]): Map<string, LintResult[]> {
    const groups = new Map<string, LintResult[]>();

    for (const result of results) {
      const filePath = result.filePath || 'unknown';
      if (!groups.has(filePath)) {
        groups.set(filePath, []);
      }
      groups.get(filePath)!.push(result);
    }

    return groups;
  }

  /**
   * XML特殊文字をエスケープ
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}