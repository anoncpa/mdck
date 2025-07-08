// src/linter/rules/UndefinedTemplateReferenceRule.ts
import { FileResolver } from '../../core/file-resolver';
import { TemplateExpander } from '../../core/template-expander';
import type { LintContext, LintResult } from '../../shared/lint-types';
import { BaseLintRule } from './base-rule';

/**
 * M003: template 未定義参照チェック
 * 参照されているテンプレートIDが定義されていない場合にエラー
 */
export class UndefinedTemplateReferenceRule extends BaseLintRule {
  public readonly id = 'M003' as const;
  public readonly defaultSeverity = 'error' as const;
  public readonly description =
    'Template references must have corresponding definitions';

  private readonly templateExpander: TemplateExpander;

  constructor() {
    super();
    // FileResolverを使用してTemplateExpanderを初期化
    const fileResolver = new FileResolver();
    this.templateExpander = new TemplateExpander(fileResolver);
  }

  public async check(context: LintContext): Promise<readonly LintResult[]> {
    const results: LintResult[] = [];

    try {
      // TemplateExpanderを使用して定義と参照を収集
      const definitions = await this.templateExpander.collectAllDefinitions(
        context.ast,
        context.filePath
      );
      const references = this.templateExpander.collectReferences(context.ast);

      // 各参照について定義の存在をチェック
      for (const reference of references) {
        if (!definitions.has(reference.id)) {
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
      }
    } catch (error) {
      // 外部ファイル解決エラーなどをキャッチ
      if (error instanceof Error) {
        results.push(
          this.createResult(
            `Failed to resolve template references: ${error.message}`,
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
