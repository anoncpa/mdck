// src/core/template-expander.ts
import type { Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import type {
  TemplateDefinition,
  TemplateDefinitions,
  TemplateExpansionResult,
  TemplateReference,
} from '../shared/template-types';
import type { Directive } from '../shared/types';

/**
 * mdckテンプレートの展開を担当するコアクラス。
 * テンプレート定義の収集、参照解決、循環参照検出を責務とする。
 */
export class TemplateExpander {
  /**
   * 指定されたASTからテンプレート定義を収集する。
   * @param ast 解析対象のAST
   * @param filePath ファイルパス（外部ファイル対応時に使用）
   * @returns 収集されたテンプレート定義のマップ
   */
  public collectDefinitions(ast: Root, filePath?: string): TemplateDefinitions {
    const definitions = new Map<string, TemplateDefinition>();

    visit(ast, (node) => {
      // containerDirectiveでtemplateという名前のノードのみを対象とする
      if (node.type === 'containerDirective') {
        const directive = node as Directive;

        if (directive.name === 'template' && directive.attributes) {
          const templateId = this.extractTemplateId(directive);

          if (templateId) {
            // 重複チェック（型安全性の一環として実行時チェックも実装）
            if (definitions.has(templateId)) {
              throw new Error(`Duplicate template definition: ${templateId}`);
            }

            const dependencies = this.extractDependencies(directive);

            const definition: TemplateDefinition = {
              id: templateId,
              content: directive.children || [],
              filePath,
              dependencies,
              position: {
                startLine: directive.position?.start.line ?? -1,
                endLine: directive.position?.end.line ?? -1,
              },
            };

            definitions.set(templateId, definition);
          }
        }
      }
    });

    return definitions;
  }

  /**
   * 指定されたASTからテンプレート参照を収集する。
   * @param ast 解析対象のAST
   * @returns 発見されたテンプレート参照の配列
   */
  public collectReferences(ast: Root): readonly TemplateReference[] {
    const references: TemplateReference[] = [];

    visit(ast, (node) => {
      // leafDirectiveでtemplateという名前のノードを対象とする（参照）
      if (node.type === 'leafDirective') {
        const directive = node as Directive;

        if (directive.name === 'template' && directive.attributes) {
          const templateId = this.extractTemplateId(directive);

          if (templateId) {
            const src = directive.attributes.src;

            references.push({
              id: templateId,
              src: src ?? undefined,
              position: {
                line: directive.position?.start.line ?? -1,
                column: directive.position?.start.column ?? -1,
              },
            });
          }
        }
      }
    });

    return references;
  }

  /**
   * テンプレートを展開し、完全に解決されたASTを生成する。
   * @param rootTemplateId 展開対象のルートテンプレートID
   * @param definitions 利用可能なテンプレート定義
   * @returns 展開結果（成功または失敗）
   */
  public expandTemplate(
    rootTemplateId: string,
    definitions: TemplateDefinitions
  ): TemplateExpansionResult {
    try {
      const visitedTemplates = new Set<string>();
      const usedDefinitions = new Map<string, TemplateDefinition>();

      const expandedContent = this.expandTemplateRecursive(
        rootTemplateId,
        definitions,
        visitedTemplates,
        usedDefinitions,
        []
      );

      const expandedAst: Root = {
        type: 'root',
        children: expandedContent,
      };

      return {
        status: 'success',
        expandedAst,
        usedDefinitions,
      };
    } catch (error) {
      // エラーの種類に応じて適切なエラー型を返す
      if (error instanceof Error) {
        if (error.message.includes('Circular reference')) {
          return {
            status: 'error',
            errorType: 'circular-reference',
            message: error.message,
            details: {
              templateId: rootTemplateId,
            },
          };
        } else if (error.message.includes('not found')) {
          return {
            status: 'error',
            errorType: 'undefined-reference',
            message: error.message,
            details: {
              templateId: rootTemplateId,
            },
          };
        }
      }

      return {
        status: 'error',
        errorType: 'invalid-definition',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {
          templateId: rootTemplateId,
        },
      };
    }
  }

  /**
   * テンプレートを再帰的に展開する内部メソッド。
   * 循環参照検出と依存関係解決を担当する。
   */
  private expandTemplateRecursive(
    templateId: string,
    definitions: TemplateDefinitions,
    visitedTemplates: Set<string>,
    usedDefinitions: Map<string, TemplateDefinition>,
    referencePath: string[]
  ): RootContent[] {
    // 循環参照の検出
    if (visitedTemplates.has(templateId)) {
      const cyclePath = [...referencePath, templateId].join(' → ');
      throw new Error(`Circular reference detected: ${cyclePath}`);
    }

    // テンプレート定義の存在確認
    const definition = definitions.get(templateId);
    if (!definition) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // 訪問済みマークと使用記録
    visitedTemplates.add(templateId);
    usedDefinitions.set(templateId, definition);

    const expandedContent: RootContent[] = [];

    // 定義内容を走査し、テンプレート参照があれば再帰的に展開
    for (const child of definition.content) {
      if (this.isTemplateReference(child)) {
        const directive = child as Directive;
        const refTemplateId = this.extractTemplateId(directive);

        if (refTemplateId) {
          // 再帰的に展開（新しいvisitedTemplatesセットを使用して並列展開を可能にする）
          const newVisitedTemplates = new Set(visitedTemplates);
          const refContent = this.expandTemplateRecursive(
            refTemplateId,
            definitions,
            newVisitedTemplates,
            usedDefinitions,
            [...referencePath, templateId]
          );

          expandedContent.push(...refContent);
        }
      } else {
        // テンプレート参照でない場合はそのまま追加
        expandedContent.push(child);
      }
    }

    // 訪問済みマークを解除（並列展開を可能にするため）
    visitedTemplates.delete(templateId);

    return expandedContent;
  }

  /**
   * ディレクティブからテンプレートIDを抽出する。
   * @param directive ディレクティブノード
   * @returns 抽出されたテンプレートID（存在しない場合はnull）
   */
  private extractTemplateId(directive: Directive): string | null {
    if (!directive.attributes) return null;

    // id属性と#id属性の両方をサポート
    return directive.attributes.id || directive.attributes['#id'] || null;
  }

  /**
   * テンプレート定義から依存関係を抽出する。
   * @param directive テンプレート定義のディレクティブ
   * @returns 依存するテンプレートIDの配列
   */
  private extractDependencies(directive: Directive): readonly string[] {
    const dependencies: string[] = [];

    // 子ノードを走査してテンプレート参照を探す
    visit(directive, (node) => {
      if (this.isTemplateReference(node)) {
        const refDirective = node as Directive;
        const templateId = this.extractTemplateId(refDirective);
        if (templateId) {
          dependencies.push(templateId);
        }
      }
    });

    return dependencies;
  }

  /**
   * ノードがテンプレート参照かどうかを判定する。
   * @param node 判定対象のノード
   * @returns テンプレート参照の場合true
   */
  private isTemplateReference(node: RootContent): boolean {
    return (
      node.type === 'leafDirective' && (node as Directive).name === 'template'
    );
  }
}
