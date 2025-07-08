// src/linter/rules/DuplicateTemplateIdRule.ts
import { visit } from 'unist-util-visit';
import type { LintContext, LintResult } from '../../shared/lint-types';
import type { Directive } from '../../shared/types';
import { BaseLintRule } from './base-rule';

/**
 * M002: template id 重複定義チェック
 * 同一プロジェクト内で同じテンプレートIDが複数回定義されている場合にエラー
 */
export class DuplicateTemplateIdRule extends BaseLintRule {
  public readonly id = 'M002' as const;
  public readonly defaultSeverity = 'error' as const;
  public readonly description = 'Template id must be unique within project';

  public async check(context: LintContext): Promise<readonly LintResult[]> {
    const results: LintResult[] = [];
    const templateDefinitions = new Map<
      string,
      { line: number; filePath?: string }
    >();

    visit(context.ast, (node) => {
      if (node.type === 'containerDirective') {
        const directive = node as Directive;

        if (directive.name === 'template') {
          // 修正: 型安全な抽出メソッドを使用
          const templateId = this.extractTemplateId(directive);

          if (templateId) {
            const line = directive.position?.start.line ?? -1;
            const existingDefinition = templateDefinitions.get(templateId);

            if (existingDefinition) {
              results.push(
                this.createResult(
                  `Duplicate template definition: "${templateId}"${
                    existingDefinition.filePath
                      ? ` (first defined in ${this.normalizeFilePath(existingDefinition.filePath)}:${existingDefinition.line})`
                      : ` (first defined at line ${existingDefinition.line})`
                  }`,
                  line,
                  undefined,
                  false,
                  {
                    templateId,
                    duplicateLocation: {
                      line: existingDefinition.line,
                      filePath: existingDefinition.filePath,
                    },
                  }
                )
              );
            } else {
              templateDefinitions.set(templateId, {
                line,
                filePath: context.filePath,
              });
            }
          }
        }
      }
    });

    return results;
  }
}
