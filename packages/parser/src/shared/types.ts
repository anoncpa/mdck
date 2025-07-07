// packages/parser/src/shared/types.ts
import type { Root, Content } from 'mdast';

// remark と mdast の主要な型を再エクスポート
export type { Root, Content };
import type {
  ContainerDirective,
  LeafDirective,
  TextDirective,
} from 'mdast-util-directive';

// Create a union type for convenience:
export type Directive = ContainerDirective | LeafDirective | TextDirective;
/**
 * mdckが扱うディレクティブの種類。
 * remark-directiveの 'name' プロパティに対応する。
 */
export type MdckDirectiveName = 'template' | 'tag' | 'result';

/**
 * mdckのディレクティブ情報を表す構造。
 * ASTの 'Directive' ノードから必要な情報を抽出して生成される。
 */
export interface MdckDirective {
  /**
   * ディレクティブ名 (例: "template", "tag", "result")
   */
  name: MdckDirectiveName;

  /**
   * ディレクティブの種類
   * - containerDirective: ::template{} ... ::
   * - leafDirective: ::template{} or ::tag{}
   * - textDirective: :template[text]
   */
  type: 'containerDirective' | 'leafDirective' | 'textDirective';

  /**
   * ディレクティブが持つ属性
   */
  attributes: Record<string, string>;

  /**
   * ディレクティブのコンテンツ(子ノード)
   * containerDirectiveの場合にのみ子要素を持つ。
   */
  children: Content[];

  /**
   * このディレクティブが出現したソースコードの開始行番号 (1-based)
   */
  line: number;
}

/**
 * MdckParser.parseメソッドの戻り値。
 */
export interface ParseResult {
  /**
   * remarkによって生成されたMarkdownのAST (Abstract Syntax Tree)
   */
  ast: Root;
  /**
   * ドキュメント内から抽出されたmdckディレクティブのリスト。
   */
  directives: MdckDirective[];
}

// 将来の拡張用のプレースホルダー
export interface MdckConfig {}
export interface LintResult {}
