// src/index.ts
// packages/parser/src/index.ts
import { processor } from './core/processor';
import { extractMdckDirectives } from './core/directive-extractor';
import { TemplateExpander } from './core/template-expander';
 import { FileResolver } from './core/file-resolver';
import {
  ParseResult,
  MdckDirective,
  Root,
  Directive,
  TemplateExpansionResult,
  TemplateDefinitions,
   FileResolutionResult,
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
};

 // 公開するクラスを再エクスポート
 export { FileResolver };

/**
 * mdck (Markdown Check List) のためのコアパーサー。
 * remarkとremark-directiveをベースとし、テキストをASTとディレクティブの構造に変換する。
 */
export class MdckParser {
  private readonly templateExpander: TemplateExpander;
   private readonly fileResolver: FileResolver;

  constructor() {
     this.fileResolver = new FileResolver();
     this.templateExpander = new TemplateExpander(this.fileResolver);
  }

  /**
   * Markdownコンテンツを解析し、ASTとmdckディレクティブの情報を抽出する。
   * @param content - 解析対象のMarkdown文字列。
   * @returns 解析結果。ASTと抽出されたディレクティブのリストを含む。
   */
  public parse(content: string): ParseResult {
    // 1. remarkプロセッサーで文字列をASTに変換
    const ast = processor.parse(content);

    // 2. ASTからmdckのディレクティブ情報を抽出
    const directives = extractMdckDirectives(ast);

    return {
      ast,
      directives,
    };
  }

  /**
   * ASTをMarkdown文字列に変換する（Stringify）。
   * @param ast - 文字列化対象のAST
   * @returns Markdown文字列
   */
  public stringify(ast: Root): string {
    const result = processor.stringify(ast);
    return String(result);
  }

  /**
   * テンプレートを展開し、完全に解決されたASTを生成する。
    * 外部ファイル参照も自動的に解決される。
   * @param content - テンプレートを含むMarkdown文字列
   * @param rootTemplateId - 展開対象のルートテンプレートID
   * @param filePath - ファイルパス（外部ファイル対応時に使用）
   * @returns テンプレート展開結果
   */
   public async expandTemplate(
    content: string,
    rootTemplateId: string,
    filePath?: string
  ): Promise<TemplateExpansionResult> {
    // 1. コンテンツを解析してASTを取得
    const ast = processor.parse(content);

     // 2. テンプレートを展開（外部ファイル参照も自動解決）
     return this.templateExpander.expandTemplate(rootTemplateId, ast, filePath);
  }

  /**
   * 複数のファイルからテンプレート定義を収集し、指定されたテンプレートを展開する。
   * @param contents - ファイルパスとコンテンツのマップ
   * @param rootTemplateId - 展開対象のルートテンプレートID
   * @returns テンプレート展開結果
   */
   public async expandTemplateFromMultipleFiles(
    contents: ReadonlyMap<string, string>,
    rootTemplateId: string
  ): Promise<TemplateExpansionResult> {
    // 全ファイルからテンプレート定義を収集
    const allDefinitions = new Map();

    for (const [filePath, content] of contents) {
      const ast = processor.parse(content);
      const definitions = this.templateExpander.collectDefinitions(ast, filePath);

      // 定義をマージ（重複チェック付き）
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

    // テンプレートを展開
     return this.templateExpander.expandTemplate(rootTemplateId, allDefinitions);
  }

   /**
    * 外部ファイルを解決し、内容をASTとして取得する
    * @param srcPath - ソースファイルパス
    * @param basePath - 基準ファイルパス
    * @returns ファイル解決結果
    */
   public async resolveExternalFile(
     srcPath: string,
     basePath?: string
   ): Promise<FileResolutionResult> {
     return this.fileResolver.resolveFile(srcPath, basePath);
   }

   /**
    * ファイルキャッシュを無効化する
    * テスト時やファイル変更時に使用
    */
   public clearFileCache(): void {
     this.fileResolver.clearCache();
   }
}
