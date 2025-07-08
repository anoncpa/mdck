// src/index.ts
import { processor } from './core/processor';
import { extractMdckDirectives } from './core/directive-extractor';
import { TemplateExpander } from './core/template-expander';
import { FileResolver } from './core/file-resolver';
import { RuleEngine } from './linter/rule-engine';
import {
  ParseResult,
  MdckDirective,
  Root,
  Directive,
  TemplateExpansionResult,
  TemplateDefinitions,
  FileResolutionResult,
  LintReport,
  LintConfig,
  LintContext,
} from './shared/types';

// 公開する型を再エクスポート
export type {
  ParseResult,
  MdckDirective,
  Root,
  Directive,
  TemplateExpansionResult,
  TemplateDefinitions,
  FileResolutionResult,
  LintReport,
  LintConfig,
  LintContext,
};

// 公開するクラスを再エクスポート
export { FileResolver };
export { RuleEngine };

/**
 * mdck (Markdown Check List) のためのコアパーサー。
 * remarkとremark-directiveをベースとし、改善されたLint機能を提供。
 */
export class MdckParser {
  private readonly templateExpander: TemplateExpander;
  private readonly fileResolver: FileResolver;
  private readonly ruleEngine: RuleEngine;

  constructor() {
    this.fileResolver = new FileResolver();
    this.templateExpander = new TemplateExpander(this.fileResolver);
    this.ruleEngine = new RuleEngine();
  }

  /**
   * Markdownコンテンツを解析し、ASTとmdckディレクティブの情報を抽出する。
   */
  public parse(content: string): ParseResult {
    const ast = processor.parse(content);
    const directives = extractMdckDirectives(ast);

    return {
      ast,
      directives,
    };
  }

  /**
   * ASTをMarkdown文字列に変換する（Stringify）。
   */
  public stringify(ast: Root): string {
    const result = processor.stringify(ast);
    return String(result);
  }

  /**
   * Markdownコンテンツに対してLintチェックを実行する。
   * 改善された前処理ベースのLint処理を使用。
   */
  public async lint(
    content: string,
    filePath?: string,
    projectRoot?: string
  ): Promise<LintReport> {
    // 1. コンテンツを解析してASTを取得
    const ast = processor.parse(content);

    // 2. Lintコンテキストを構築
    const context: LintContext = {
      ast,
      filePath,
      projectRoot,
      // preprocessResult は RuleEngine 内で設定される
    };

    // 3. 改善されたRuleEngineでLintを実行
    return await this.ruleEngine.lint(context);
  }

  /**
   * Lintエンジンの設定を更新する
   */
  public updateLintConfig(config: Partial<LintConfig>): void {
    this.ruleEngine.updateConfig(config);
  }

  /**
   * テンプレートを展開し、完全に解決されたASTを生成する。
   */
  public async expandTemplate(
    content: string,
    rootTemplateId: string,
    filePath?: string
  ): Promise<TemplateExpansionResult> {
    const ast = processor.parse(content);
    return this.templateExpander.expandTemplate(rootTemplateId, ast, filePath);
  }

  /**
   * 複数のファイルからテンプレート定義を収集し、指定されたテンプレートを展開する。
   */
  public async expandTemplateFromMultipleFiles(
    contents: ReadonlyMap<string, string>,
    rootTemplateId: string
  ): Promise<TemplateExpansionResult> {
    const allDefinitions = new Map();

    for (const [filePath, content] of contents) {
      const ast = processor.parse(content);
      const definitions = this.templateExpander.collectDefinitions(
        ast,
        filePath
      );

      for (const [id, definition] of definitions) {
        if (allDefinitions.has(id)) {
          const existing = allDefinitions.get(id);
          throw new Error(
            `Duplicate template definition "${id}" found in ${existing.filePath} and ${filePath}`
          );
        }
        allDefinitions.set(id, definition);
      }
    }

    return this.templateExpander.expandTemplate(rootTemplateId, allDefinitions);
  }

  /**
   * 外部ファイルを解決し、内容をASTとして取得する
   */
  public async resolveExternalFile(
    srcPath: string,
    basePath?: string
  ): Promise<FileResolutionResult> {
    return this.fileResolver.resolveFile(srcPath, basePath);
  }

  /**
   * ファイルキャッシュを無効化する
   */
  public clearFileCache(): void {
    this.fileResolver.clearCache();
  }
}
