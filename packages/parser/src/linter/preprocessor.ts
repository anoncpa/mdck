// src/linter/preprocessor.ts
import { visit } from 'unist-util-visit';
import type { Root } from 'mdast';
import type { LintContext } from '../shared/lint-types';
import type {
  LintPreprocessResult,
  TemplateAnalysisResult,
  TemplateIssue,
  DuplicateTemplateInfo,
  CircularReferenceInfo,
} from '../shared/lint-preprocessor-types';
import type {
  TemplateDefinitions,
  TemplateDefinition,
  TemplateReference,
} from '../shared/template-types';
import type { Directive } from '../shared/types';
import { TemplateExpander } from '../core/template-expander';
import { FileResolver } from '../core/file-resolver';

/**
 * Lint前処理エンジン
 * 全ルールが必要とする情報を事前に収集・分析し、ルール間の依存関係を排除
 */
export class LintPreprocessor {
  private readonly templateExpander: TemplateExpander;

  constructor() {
    const fileResolver = new FileResolver();
    this.templateExpander = new TemplateExpander(fileResolver);
  }

  /**
   * 指定されたコンテキストに対して前処理を実行
   * @param context - Lint実行コンテキスト
   * @returns 前処理結果
   */
  public async analyze(context: LintContext): Promise<LintPreprocessResult> {
    const startTime = Date.now();

    // 1. テンプレート解析を実行
    const templateAnalysis = await this.analyzeTemplates(context);

    // 2. 各種問題を検出
    const duplicateTemplates = this.findDuplicateTemplates(templateAnalysis);
    const undefinedReferences = this.findUndefinedReferences(templateAnalysis);
    const circularReferences = this.findCircularReferences(templateAnalysis);

    const preprocessDuration = Date.now() - startTime;

    return {
      templateAnalysis,
      duplicateTemplates,
      undefinedReferences,
      circularReferences,
      preprocessDuration,
    };
  }

  /**
   * テンプレート情報の分析
   * 定義と参照を収集し、基本的な整合性をチェック
   */
  private async analyzeTemplates(
    context: LintContext
  ): Promise<TemplateAnalysisResult> {
    // 参照は常に収集可能（エラーに関係なく）
    const references = this.templateExpander.collectReferences(context.ast);

    try {
      // 定義の収集（重複エラーが発生する可能性がある）
      const definitions = await this.templateExpander.collectAllDefinitions(
        context.ast,
        context.filePath
      );

      return {
        status: 'success',
        definitions,
        references,
        issues: [],
      };
    } catch (error) {
      // エラーが発生した場合でも、参照情報は利用可能
      // 個別の定義を収集して、重複以外の定義は保持
      const partialDefinitions = this.collectPartialDefinitions(context.ast, context.filePath);
      const issues = this.convertErrorToIssues(error, context);

      return {
        status: 'error',
        definitions: partialDefinitions,
        references,
        issues,
      };
    }
  }

  /**
   * 重複テンプレート定義の検出
   */
  private findDuplicateTemplates(
    analysis: TemplateAnalysisResult
  ): readonly DuplicateTemplateInfo[] {
    if (analysis.status === 'error') {
      // エラー状態の場合、重複検出情報を問題リストから抽出
      const duplicates = analysis.issues
        .filter((issue) => issue.type === 'duplicate-template')
        .map((issue) => {
          const allLines = issue.details?.allLines as number[] || [issue.line];
          const locations = allLines.map(line => ({ line }));
          return {
            templateId: issue.templateId,
            locations,
          };
        });
      return duplicates;
    }

    // 重複チェック（通常は collectAllDefinitions で例外が発生するが、念のため）
    const duplicates: DuplicateTemplateInfo[] = [];
    const seenIds = new Map<string, { line: number; filePath?: string }>();

    for (const [id, definition] of analysis.definitions) {
      const existing = seenIds.get(id);
      if (existing) {
        duplicates.push({
          templateId: id,
          locations: [
            existing,
            {
              line: definition.position.startLine,
              filePath: definition.filePath,
            },
          ],
        });
      } else {
        seenIds.set(id, {
          line: definition.position.startLine,
          filePath: definition.filePath,
        });
      }
    }

    return duplicates;
  }

  /**
   * 未定義テンプレート参照の検出
   */
  private findUndefinedReferences(
    analysis: TemplateAnalysisResult
  ): readonly TemplateReference[] {
    // エラー状態でも参照チェックは実行（部分的な定義情報を使用）
    return analysis.references.filter(
      (reference) => !analysis.definitions.has(reference.id)
    );
  }

  /**
   * 循環参照の検出
   */
  private findCircularReferences(
    analysis: TemplateAnalysisResult
  ): readonly CircularReferenceInfo[] {
    if (analysis.status === 'error') {
      return [];
    }

    const circularReferences: CircularReferenceInfo[] = [];
    const visited = new Set<string>();

    // 各テンプレートから循環参照をチェック
    for (const [templateId, definition] of analysis.definitions) {
      if (visited.has(templateId)) continue;

      const cycle = this.detectCycle(
        templateId,
        analysis.definitions,
        new Set(),
        []
      );

      if (cycle) {
        // サイクルに含まれるすべてのIDを訪問済みにマーク
        cycle.forEach((id) => visited.add(id));

        circularReferences.push({
          cyclePath: cycle,
          line: definition.position.startLine,
          filePath: definition.filePath,
        });
      }
    }

    return circularReferences;
  }

  /**
   * 循環参照の検出（深度優先探索）
   */
  private detectCycle(
    templateId: string,
    definitions: TemplateDefinitions,
    currentPath: Set<string>,
    pathArray: string[]
  ): string[] | null {
    if (currentPath.has(templateId)) {
      // 循環を発見
      const cycleStart = pathArray.indexOf(templateId);
      return [...pathArray.slice(cycleStart), templateId];
    }

    const definition = definitions.get(templateId);
    if (!definition) {
      return null; // 未定義参照は別のルールで処理
    }

    currentPath.add(templateId);
    pathArray.push(templateId);

    // 依存関係を辿る
    for (const dependencyId of definition.dependencies) {
      const cycle = this.detectCycle(
        dependencyId,
        definitions,
        new Set(currentPath),
        [...pathArray]
      );
      if (cycle) {
        return cycle;
      }
    }

    return null;
  }

  /**
   * エラーを構造化された問題リストに変換
   */
  private convertErrorToIssues(
    error: unknown,
    context: LintContext
  ): TemplateIssue[] {
    if (!(error instanceof Error)) {
      return [
        {
          type: 'missing-template',
          templateId: 'unknown',
          message: 'Unknown error occurred during template analysis',
          line: 1,
        },
      ];
    }

    // 重複定義エラーの解析
    if (error.message.includes('Duplicate template definition')) {
      const match = error.message.match(
        /Duplicate template definition[:\s]+["']?([^"'\s]+)["']?/
      );
      const templateId = match?.[1] || 'unknown';

      // ASTから重複テンプレートの全ての位置を抽出
      const templateLines = this.extractAllTemplateLines(templateId, context.ast);

      return [
        {
          type: 'duplicate-template',
          templateId,
          message: error.message,
          line: templateLines[0] || 1, // 最初の出現位置
          details: { 
            originalError: error.message,
            allLines: templateLines 
          },
        },
      ];
    }

    // その他のエラー
    return [
      {
        type: 'missing-template',
        templateId: 'unknown',
        message: error.message,
        line: 1,
        details: { originalError: error.message },
      },
    ];
  }

  /**
   * エラーから行番号を抽出（簡易実装）
   */
  private extractLineFromError(error: Error, ast: Root): number {
    // 実際の実装では、エラーメッセージやスタックトレースから
    // より正確な行番号を抽出する可能性がある
    let firstTemplateLine = 1;

    visit(ast, (node) => {
      if (node.type === 'containerDirective') {
        const directive = node as Directive;
        if (directive.name === 'template') {
          firstTemplateLine = directive.position?.start.line ?? 1;
          return false; // 最初のテンプレートで停止
        }
      }
    });

    return firstTemplateLine;
  }

  /**
   * 指定されたテンプレートIDの全ての出現位置を抽出
   */
  private extractAllTemplateLines(templateId: string, ast: Root): number[] {
    const lines: number[] = [];

    visit(ast, (node) => {
      if (node.type === 'containerDirective') {
        const directive = node as Directive;
        if (directive.name === 'template' && directive.attributes?.id === templateId) {
          const line = directive.position?.start.line ?? 1;
          lines.push(line);
        }
      }
    });

    return lines;
  }

  /**
   * 重複エラーが発生した場合でも、個別の定義を部分的に収集
   * 重複していない定義は正常に利用可能にする
   */
  private collectPartialDefinitions(ast: Root, filePath?: string): TemplateDefinitions {
    const definitions = new Map<string, TemplateDefinition>();
    const seenIds = new Set<string>();

    visit(ast, (node) => {
      if (node.type === 'containerDirective') {
        const directive = node as Directive;

        if (directive.name === 'template' && directive.attributes) {
          const templateId = this.templateExpander['extractTemplateId'](directive);

          if (templateId && !seenIds.has(templateId)) {
            // 最初の出現のみを記録（重複は無視）
            seenIds.add(templateId);
            const dependencies = this.templateExpander['extractDependencies'](directive);

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
}
