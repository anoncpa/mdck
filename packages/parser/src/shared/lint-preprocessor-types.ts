// src/shared/lint-preprocessor-types.ts
import type { TemplateDefinitions, TemplateReference } from './template-types';

/**
 * 前処理で収集されるテンプレート情報
 */
export interface TemplateAnalysisResult {
  /** 状態（成功/失敗） */
  readonly status: 'success' | 'error';
  /** テンプレート定義のマップ */
  readonly definitions: TemplateDefinitions;
  /** テンプレート参照のリスト */
  readonly references: readonly TemplateReference[];
  /** 検出された問題のリスト */
  readonly issues: readonly TemplateIssue[];
}

/**
 * 前処理で検出されるテンプレート関連の問題
 */
export interface TemplateIssue {
  /** 問題の種類 */
  readonly type:
    | 'duplicate-template'
    | 'missing-template'
    | 'circular-reference';
  /** 関連するテンプレートID */
  readonly templateId: string;
  /** エラーメッセージ */
  readonly message: string;
  /** 発生箇所の行番号 */
  readonly line: number;
  /** 発生箇所の列番号（任意） */
  readonly column?: number;
  /** 追加の詳細情報 */
  readonly details?: Record<string, unknown>;
}

/**
 * 重複テンプレート情報
 */
export interface DuplicateTemplateInfo {
  /** テンプレートID */
  readonly templateId: string;
  /** 重複している定義の位置情報 */
  readonly locations: readonly {
    readonly line: number;
    readonly filePath?: string;
  }[];
}

/**
 * 循環参照情報
 */
export interface CircularReferenceInfo {
  /** 循環パスに含まれるテンプレートID */
  readonly cyclePath: readonly string[];
  /** 循環開始位置の行番号 */
  readonly line: number;
  /** 関連ファイルパス */
  readonly filePath?: string;
}

/**
 * Lint前処理の全体結果
 * 各ルールが必要とする情報を事前に収集・分析
 */
export interface LintPreprocessResult {
  /** テンプレート解析結果 */
  readonly templateAnalysis: TemplateAnalysisResult;
  /** 重複テンプレート情報 */
  readonly duplicateTemplates: readonly DuplicateTemplateInfo[];
  /** 未定義参照情報 */
  readonly undefinedReferences: readonly TemplateReference[];
  /** 循環参照情報 */
  readonly circularReferences: readonly CircularReferenceInfo[];
  /** 前処理の実行時間（ミリ秒） */
  readonly preprocessDuration: number;
}
