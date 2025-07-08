// src/linter/rules/UndefinedTemplateReferenceRule.ts
import type { LintContext, LintResult } from '../../shared/lint-types';
import { BaseLintRule } from './base-rule';

/**
 * M003: template 未定義参照チェック（前処理結果版）
 * 前処理で検出された未定義参照を使用してエラーを報告
 */
export class UndefinedTemplateReferenceRule extends BaseLintRule {
  public readonly id = 'M003' as const;
  public readonly defaultSeverity = 'error' as const;
  public readonly description =
    'Template references must have corresponding definitions';

  public async check(context: LintContext): Promise<readonly LintResult[]> {
    const preprocessResult = this.getPreprocessResult(context);
    if (!preprocessResult) {
      return [];
    }

    const results: LintResult[] = [];

    // 前処理で検出された未定義参照を処理
    for (const reference of preprocessResult.undefinedReferences) {
      results.push(
        this.createResult(
          `Undefined template reference: "${reference.id}"`,
          reference.position.line,
          reference.position.column,
          false,
          {
            templateId: reference.id,
            referenceType: reference.src ? 'external' : 'local',
            srcPath: reference.src,
          }
        )
      );
    }

    // テンプレート解析でエラーが発生した場合の処理
    if (preprocessResult.templateAnalysis.status === 'error') {
      for (const issue of preprocessResult.templateAnalysis.issues) {
        if (issue.type === 'missing-template') {
          results.push(
            this.createResult(
              `Failed to resolve template references: ${issue.message}`,
              issue.line,
              issue.column,
              false,
              {
                originalError: issue.message,
                templateId: issue.templateId,
              }
            )
          );
        }
      }
    }

    return results;
  }
}
