// src/linter/rules/CircularReferenceRule.ts
import type { LintContext, LintResult } from '../../shared/lint-types';
import { BaseLintRule } from './base-rule';

/**
 * M004: 循環参照検出（前処理結果版）
 * 前処理で検出された循環参照情報を使用してエラーを報告
 */
export class CircularReferenceRule extends BaseLintRule {
  public readonly id = 'M004' as const;
  public readonly defaultSeverity = 'error' as const;
  public readonly description =
    'Template references must not create circular dependencies';

  public async check(context: LintContext): Promise<readonly LintResult[]> {
    const preprocessResult = this.getPreprocessResult(context);
    if (!preprocessResult) {
      return [];
    }

    const results: LintResult[] = [];

    // 前処理で検出された循環参照を処理
    for (const circularRef of preprocessResult.circularReferences) {
      const cyclePath = circularRef.cyclePath.join(' → ');

      results.push(
        this.createResult(
          `Circular reference detected: ${cyclePath}`,
          circularRef.line,
          undefined,
          false,
          {
            cyclePath: circularRef.cyclePath,
            errorType: 'circular-reference',
            filePath: circularRef.filePath,
          }
        )
      );
    }

    return results;
  }
}
