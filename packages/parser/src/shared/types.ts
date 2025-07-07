// packages/parser/src/shared/types.ts
import type Token from 'markdown-it/lib/token.mjs';

export type { Token };
/**
 * カスタムタグの属性を表すオブジェクト。
 * - 値ありの属性: string
 * - ブール属性: boolean (存在する場合はtrue、存在しない場合は未定義)
 * 例: { itemId: "C1", isResultRequired: true }
 */
export type CustomTagAttributes = Record<string, string | boolean>;

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

/**
 * テンプレート定義を表す型。
 * 単一ファイル内のテンプレート定義から抽出された情報を格納する。
 */
export interface TemplateDefinition {
  /**
   * テンプレートID（例: "server-maintenance"）
   */
  readonly id: string;
  /**
   * このテンプレート定義が含まれるトークン列
   */
  readonly tokens: readonly Token[];
  /**
   * 定義元ファイルパス（外部ファイルの場合）
   */
  readonly filePath?: string;
  /**
   * テンプレート定義の開始行番号（1-based）
   */
  readonly startLine: number;
  /**
   * テンプレート定義の終了行番号（1-based）
   */
  readonly endLine: number;
  /**
   * このテンプレートが参照している他のテンプレートIDのリスト
   * 循環参照検出に使用される
   */
  readonly dependencies: readonly string[];
}

// 将来の拡張用のプレースホルダー
export interface MdckConfig {}
export interface LintResult {}
