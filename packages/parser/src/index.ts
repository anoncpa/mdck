// packages/parser/src/index.ts
import { Tokenizer } from './core/tokenizer';
import { parseCustomTags } from './core/custom-tag-parser';
import { ParseResult, CustomTag } from './shared/types';
import type Token from 'markdown-it/lib/token.mjs';

// 公開する型を再エクスポート
export type { ParseResult, CustomTag, Token };

/**
 * mdck (Markdown Check List) のためのコアパーサー。
 * テキストを受け取り、トークンとカスタムタグの構造に変換する。
 */
export class MdckParser {
  private tokenizer: Tokenizer;

  constructor() {
    this.tokenizer = new Tokenizer();
  }

  /**
   * Markdownコンテンツを解析し、トークンとカスタムタグの情報を抽出する。
   * これは現時点でのパーサーの主要な機能。
   * @param content - 解析対象のMarkdown文字列。
   * @returns 解析結果。生のトークンと抽出されたカスタムタグを含む。
   */
  public parse(content: string): ParseResult {
    // 1. 文字列をトークン列に変換
    const tokens = this.tokenizer.tokenize(content);
    // 2. トークン列からカスタムタグを抽出
    const customTags = parseCustomTags(tokens);

    return {
      tokens,
      customTags,
    };
  }
}
