// src/formatters/sarif.ts
import type { LintReport, LintResult } from '@mdck/parser';
import type { Formatter } from '../types';

/**
 * SARIF (Static Analysis Results Interchange Format) フォーマッター
 * GitHub Actions等のCI/CDツールで使用される標準形式
 */
export class SarifFormatter implements Formatter {
  /**
   * Lint結果をSARIF形式でフォーマット
   */
  formatLintReport(report: LintReport): string {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'mdck',
              version: '1.0.0',
              informationUri: 'https://github.com/your-org/mdck',
              rules: this.generateRules(report.results),
            },
          },
          results: this.generateResults(report.results),
          invocations: [
            {
              executionSuccessful: report.errorCount === 0,
              endTimeUtc: new Date().toISOString(),
            },
          ],
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  /**
   * エラーメッセージをSARIF形式でフォーマット
   */
  formatError(error: Error): string {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'mdck',
              version: '1.0.0',
            },
          },
          invocations: [
            {
              executionSuccessful: false,
              stderr: {
                text: error.message,
              },
            },
          ],
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  /**
   * 成功メッセージをSARIF形式でフォーマット
   */
  formatSuccess(message: string): string {
    const sarif = {
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'mdck',
              version: '1.0.0',
            },
          },
          results: [],
          invocations: [
            {
              executionSuccessful: true,
              stdout: {
                text: message,
              },
            },
          ],
        },
      ],
    };

    return JSON.stringify(sarif, null, 2);
  }

  /**
   * ルール定義を生成
   */
  private generateRules(results: readonly LintResult[]): any[] {
    const ruleMap = new Map<string, any>();

    for (const result of results) {
      if (!ruleMap.has(result.ruleId)) {
        ruleMap.set(result.ruleId, {
          id: result.ruleId,
          shortDescription: {
            text: this.getRuleDescription(result.ruleId),
          },
          helpUri: `https://github.com/your-org/mdck/docs/rules/${result.ruleId}.md`,
          properties: {
            category: this.getRuleCategory(result.ruleId),
          },
        });
      }
    }

    return Array.from(ruleMap.values());
  }

  /**
   * 結果を生成
   */
  private generateResults(results: readonly LintResult[]): any[] {
    return results.map(result => ({
      ruleId: result.ruleId,
      level: result.severity === 'error' ? 'error' : 'warning',
      message: {
        text: result.message,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: result.filePath || 'unknown',
            },
            region: {
              startLine: result.line || 1,
              startColumn: result.column || 1,
            },
          },
        },
      ],
      fixes: result.fixable ? [
        {
          description: {
            text: `Fix ${result.ruleId}`,
          },
        },
      ] : undefined,
    }));
  }

  /**
   * ルールの説明を取得
   */
  private getRuleDescription(ruleId: string): string {
    const descriptions: Record<string, string> = {
      'M002': 'Duplicate template definition detected',
      'M003': 'Undefined template reference detected',
      'M004': 'Circular reference detected',
      'M005': 'External file not found',
      'M006': 'Directive name capitalization violation',
    };

    return descriptions[ruleId] || `Rule ${ruleId}`;
  }

  /**
   * ルールのカテゴリを取得
   */
  private getRuleCategory(ruleId: string): string {
    if (ruleId.startsWith('M00')) {
      return 'template';
    }
    if (ruleId.startsWith('M01')) {
      return 'tag';
    }
    if (ruleId.startsWith('M02')) {
      return 'result';
    }
    if (ruleId.startsWith('M03')) {
      return 'syntax';
    }
    if (ruleId.startsWith('M04')) {
      return 'directive';
    }
    if (ruleId.startsWith('M05')) {
      return 'format';
    }
    if (ruleId.startsWith('M06')) {
      return 'custom';
    }

    return 'general';
  }
}