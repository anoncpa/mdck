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
    try {
      // 定義と参照を並列で収集
      const [definitions, references] = await Promise.all([
        this.templateExpander.collectAllDefinitions(
          context.ast,
          context.filePath
        ),
        Promise.resolve(this.templateExpander.collectReferences(context.ast)),
      ]);

      return {
        status: 'success',
        definitions,
        references,
        issues: [],
      };
    } catch (error) {
      // エラーを構造化された問題として記録
      const issues = this.convertErrorToIssues(error, context);

      return {
        status: 'error',
        definitions: new Map(),
        references: [],
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
      return analysis.issues
        .filter((issue) => issue.type === 'duplicate-template')
        .map((issue) => ({
          templateId: issue.templateId,
          locations: [{ line: issue.line }],
        }));
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
    if (analysis.status === 'error') {
      return []; // エラー状態では参照チェックをスキップ
    }

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

      return [
        {
          type: 'duplicate-template',
          templateId,
          message: error.message,
          line: this.extractLineFromError(error, context.ast),
          details: { originalError: error.message },
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
}
