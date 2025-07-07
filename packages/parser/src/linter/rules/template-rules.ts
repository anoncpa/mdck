// src/linter/rules/template-rules.ts
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { Directive } from '../../shared/types';
import type { LintContext, LintResult } from '../../shared/lint-types';
import { TemplateExpander } from '../../core/template-expander';
import { FileResolver } from '../../core/file-resolver';
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

    // ASTを走査してテンプレート定義を収集
    visit(context.ast, (node) => {
      if (node.type === 'containerDirective') {
        const directive = node as Directive;

        if (directive.name === 'template' && directive.attributes) {
          const templateId = this.extractTemplateId(directive);

          if (templateId) {
            const line = directive.position?.start.line ?? -1;
            const existingDefinition = templateDefinitions.get(templateId);

            if (existingDefinition) {
              // 重複を発見
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
              // 初回定義を記録
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
