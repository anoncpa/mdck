// src/shared/types.ts
import type { Root, RootContent } from 'mdast';
import type {
  ContainerDirective,
  LeafDirective,
  TextDirective,
} from 'mdast-util-directive';

// remark と mdast の主要な型を再エクスポート
export type {
  ContainerDirective,
  LeafDirective,
  Root,
  RootContent,
  TextDirective,
};

// 統合的なディレクティブ型
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
  children: RootContent[];

  /**
   * containerDirectiveの場合のテキストコンテンツ。
   * 子ノードからテキスト部分のみを抽出した文字列。
   * leafDirectiveやtextDirectiveの場合は空文字列。
   */
  content: string;

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

// テンプレート関連型の再エクスポート
export type {
  TemplateDefinition,
  TemplateReference,
  TemplateExpansionResult,
  TemplateExpansionSuccess,
  TemplateExpansionError,
  TemplateDefinitions,
} from './template-types';

// ファイル解決関連型の再エクスポート
export type { FileResolutionResult } from '../core/file-resolver';

// Lint関連型の再エクスポート
export type {
  LintResult,
  LintReport,
  LintRule,
  LintContext,
  LintConfig,
  LintRuleConfig,
  LintSeverity,
  LintRuleId,
} from './lint-types';

// 前処理関連型の再エクスポート
export type {
  LintPreprocessResult,
  TemplateAnalysisResult,
  TemplateIssue,
  DuplicateTemplateInfo,
  CircularReferenceInfo,
} from './lint-preprocessor-types';

// 将来の拡張用のプレースホルダー
export interface MdckConfig {}
