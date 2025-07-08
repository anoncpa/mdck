// src/linter/rules/template-rules.ts
import { FileResolver } from '../../core/file-resolver';
import { TemplateExpander } from '../../core/template-expander';
import type { LintContext, LintResult } from '../../shared/lint-types';
import { BaseLintRule } from './base-rule';

/**
 * M004: 循環参照検出
 * テンプレート間の循環参照を検出してエラー
 */
export class CircularReferenceRule extends BaseLintRule {
  public readonly id = 'M004' as const;
  public readonly defaultSeverity = 'error' as const;
  public readonly description =
    'Template references must not create circular dependencies';

  private readonly templateExpander: TemplateExpander;

  constructor() {
    super();
    const fileResolver = new FileResolver();
    this.templateExpander = new TemplateExpander(fileResolver);
  }

  public async check(context: LintContext): Promise<readonly LintResult[]> {
    const results: LintResult[] = [];

    try {
      // 定義を収集
      const definitions = await this.templateExpander.collectAllDefinitions(
        context.ast,
        context.filePath
      );

      // 各テンプレート定義について循環参照をチェック
      for (const [templateId, definition] of definitions) {
        try {
          // TemplateExpanderの展開機能を利用して循環参照を検出
          const expansionResult = await this.templateExpander.expandTemplate(
            templateId,
            definitions
          );

          // 展開が成功した場合は循環参照なし
          if (expansionResult.status === 'success') {
            continue;
          }

          // 循環参照エラーの場合
          if (expansionResult.errorType === 'circular-reference') {
            results.push(
              this.createResult(
                expansionResult.message,
                definition.position.startLine,
                undefined,
                false,
                {
                  templateId,
                  errorType: expansionResult.errorType,
                  filePath: definition.filePath,
                }
              )
            );
          }
        } catch (error) {
          // 展開中の予期しないエラー
          if (
            error instanceof Error &&
            error.message.includes('Circular reference')
          ) {
            results.push(
              this.createResult(
                error.message,
                definition.position.startLine,
                undefined,
                false,
                {
                  templateId,
                  originalError: error.message,
                }
              )
            );
          }
        }
      }
    } catch (error) {
      // 定義収集段階でのエラー
      if (error instanceof Error) {
        results.push(
          this.createResult(
            `Failed to analyze circular references: ${error.message}`,
            1,
            undefined,
            false,
            {
              originalError: error.message,
            }
          )
        );
      }
    }

    return results;
  }
}
