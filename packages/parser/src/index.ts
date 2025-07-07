// packages/parser/src/index.ts
import { processor } from './core/processor';
import { extractMdckDirectives } from './core/directive-extractor';
import { ParseResult, MdckDirective, Root, Directive } from './shared/types';

// 公開する型を再エクスポート
export type { ParseResult, MdckDirective, Root, Directive };

/**
 * mdck (Markdown Check List) のためのコアパーサー。
 * remarkとremark-directiveをベースとし、テキストをASTとディレクティブの構造に変換する。
 */
export class MdckParser {
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
    return processor.stringify(ast);
  }
}
