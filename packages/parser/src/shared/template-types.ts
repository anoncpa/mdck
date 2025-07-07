// src/shared/template-types.ts
import type { Root, RootContent } from 'mdast';

/**
 * テンプレート定義を表現する型。
 * 定義収集時に検証済みの状態を保証する。
 */
export interface TemplateDefinition {
  /** テンプレートの一意識別子 */
  readonly id: string;
  /** テンプレートの内容（ASTの子ノード） */
  readonly content: readonly RootContent[];
  /** 定義されたファイルのパス（外部ファイル対応時に使用） */
  readonly filePath?: string;
  /** このテンプレートが依存する他のテンプレートID */
  readonly dependencies: readonly string[];
  /** ソースコード上の位置情報 */
  readonly position: {
    readonly startLine: number;
    readonly endLine: number;
  };
}

/**
 * テンプレート参照を表現する型。
 * 参照解決前の生データを表現する。
 */
export interface TemplateReference {
  /** 参照先テンプレートID */
  readonly id: string;
  /** 外部ファイルパス（存在する場合） */
  readonly src?: string;
  /** 参照箇所の位置情報 */
  readonly position: {
    readonly line: number;
    readonly column: number;
  };
}

/**
 * テンプレート展開の成功結果を表現する型。
 */
export interface TemplateExpansionSuccess {
  readonly status: 'success';
  /** 展開後のAST */
  readonly expandedAst: Root;
  /** 展開に使用されたテンプレート定義群 */
  readonly usedDefinitions: ReadonlyMap<string, TemplateDefinition>;
}

/**
 * テンプレート展開の失敗結果を表現する型。
 * エラー種別を型レベルで区別することで、呼び出し元での適切な処理を促進する。
 */
export interface TemplateExpansionError {
  readonly status: 'error';
  readonly errorType:
    | 'circular-reference'
    | 'undefined-reference'
    | 'invalid-definition';
  readonly message: string;
  readonly details: {
    readonly templateId?: string;
    readonly referencePath?: readonly string[];
    readonly position?: {
      readonly line: number;
      readonly column: number;
    };
  };
}

/**
 * テンプレート展開の結果型。
 * 成功・失敗を型レベルで区別し、型安全なエラーハンドリングを実現する。
 */
export type TemplateExpansionResult =
  | TemplateExpansionSuccess
  | TemplateExpansionError;

/**
 * テンプレート定義のコレクション型。
 * 不変性を保証し、安全な参照を提供する。
 */
export type TemplateDefinitions = ReadonlyMap<string, TemplateDefinition>;
