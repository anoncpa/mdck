// packages/parser/src/shared/types.ts
import type Token from 'markdown-it/lib/token.mjs';

/**
 * カスタムタグの属性を表すオブジェクト。キーと値はすべて文字列。
 * 例: { id: "C1", isResultRequired: "true" }
 */
export type CustomTagAttributes = Record<string, string>;

/**
 * mdckのカスタムタグを表す構造。
 * 例: <Tag itemId="C1" />
 */
export interface CustomTag {
  /**
   * タグ名 (例: "Template", "Tag", "Result")
   */
  tagName: 'Template' | 'Tag' | 'Result' | 'TemplateInstance';
  /**
   * タグが持つ属性
   */
  attributes: CustomTagAttributes;
  /**
   * 自己終了タグかどうか (例: <Tag />)
   */
  isSelfClosing: boolean;
  /**
   * このタグが出現したソースコードの開始行番号 (1-based)
   */
  line: number;
}

/**
 * MdckParser.parseメソッドの戻り値。
 */
export interface ParseResult {
  /**
   * markdown-itによって生成された生のトークン列。
   */
  tokens: Token[];
  /**
   * ドキュメント内から抽出されたmdckカスタムタグのリスト。
   */
  customTags: CustomTag[];
}

// 将来の拡張用のプレースホルダー
export interface MdckConfig {}
export interface LintResult {}
