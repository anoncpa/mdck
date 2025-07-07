// packages/parser/src/shared/types.ts
import type { Root, RootContent } from 'mdast';
import type {
  ContainerDirective,
  LeafDirective,
  TextDirective,
} from 'mdast-util-directive';

// remark と mdast の主要な型を再エクスポート
export type { Root, RootContent };
export type { ContainerDirective, LeafDirective, TextDirective };

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

/**
 * テンプレート定義の詳細情報
 */
export interface TemplateDefinition {
  id: string;
  templateId?: string;
  ast: Root;
  filePath?: string;
  startLine: number;
  endLine: number;
  dependencies: string[]; // 参照している他のテンプレート
}

/**
 * ファイルメタデータ
 */
export interface FileMetadata {
  templateIds: string[];
  itemIds: string[];
  externalRefs: Record<string, string>;
  templateDefinitions: Record<string, TemplateDefinition>;
  dependencies: string[];
  filePath?: string;
  lastModified: number;
}

/**
 * キャッシュデータ
 */
export interface CacheData {
  templateIds: string[];
  itemIds: string[];
  externalRefs: Record<string, string>;
  templateDefinitions: Record<string, TemplateDefinition>;
  fileDependencies: Record<string, string[]>;
  lastUpdated: number;
  metadata: {
    fileCount: number;
    schemaVersion: string;
  };
}

/**
 * 設定情報
 */
export interface MdckConfig {
  rules: Record<string, 'error' | 'warn' | 'info' | 'off'>;
  settings: {
    itemIdFormat: string;
    maxResultLength: number;
    allowCustomItems: boolean;
    autoSave: boolean;
  };
}
