// packages/parser/src/core/tokenizer.ts
import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

/**
 * markdown-itの薄いラッパー。
 * 文字列をトークン化する単一の責務を持つ。
 */
export class Tokenizer {
  private md: MarkdownIt;

  constructor() {
    // mdckのカスタムタグをHTMLタグとして認識させるため、htmlオプションをtrueにする
    this.md = new MarkdownIt({
      html: true,
      linkify: false,
      typographer: false,
    });
  }

  /**
   * Markdownコンテンツをトークン列に変換する。
   * @param content - 処理するMarkdown文字列。
   * @returns markdown-itが生成したトークンの配列。
   */
  public tokenize(content: string): Token[] {
    return this.md.parse(content, {});
  }

  /**
   * トークン列をHTML文字列にレンダリングする（将来の機能用）。
   * @param tokens - レンダリングするトークンの配列。
   * @returns レンダリングされたHTML文字列。
   */
  public render(tokens: Token[]): string {
    return this.md.renderer.render(tokens, this.md.options, {});
  }
}
