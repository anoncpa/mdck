// src/shared/lint-types.ts
import type { Root } from 'mdast';

/**
 * Lintの重要度レベル
 * エラー > 警告 > 情報の順で重要度が高い
 */
export type LintSeverity = 'error' | 'warn' | 'info';

/**
 * Lintルールの識別子
 * Mプレフィックス + 3桁の数字で構成（例: M002, M003, M004）
 */
export type LintRuleId = `M${string}`;

/**
 * Lint実行の結果を表現する型
 * 型安全性を保ちつつ、必要な情報を構造化して提供
 */
export interface LintResult {
  /** ルール識別子（例: M002） */
  readonly ruleId: LintRuleId;
  /** 重要度レベル */
  readonly severity: LintSeverity;
  /** エラーメッセージ（ユーザー向け） */
  readonly message: string;
  /** 発生箇所の行番号（1-based） */
  readonly line: number;
  /** 発生箇所の列番号（1-based、任意） */
  readonly column?: number;
  /** 自動修正可能かどうか */
  readonly fixable: boolean;
  /** 追加のコンテキスト情報 */
  readonly details?: Record<string, unknown>;
}

/**
 * Lintルールの実行コンテキスト
 * ルール実行時に必要な情報をまとめて提供
 */
export interface LintContext {
  /** 解析対象のAST */
  readonly ast: Root;
  /** ファイルパス（存在する場合） */
  readonly filePath?: string;
  /** プロジェクトのルートディレクトリ */
  readonly projectRoot?: string;
}

/**
 * Lintルールの抽象インターフェース
 * 全てのLintルールはこのインターフェースを実装する必要がある
 */
export interface LintRule {
  /** ルールの一意識別子 */
  readonly id: LintRuleId;
  /** デフォルトの重要度 */
  readonly defaultSeverity: LintSeverity;
  /** ルールの説明文 */
  readonly description: string;

  /**
   * Lintルールを実行し、問題があれば結果を返す
   * @param context - Lint実行コンテキスト
   * @returns 発見された問題のリスト（問題がなければ空配列）
   */
  check(context: LintContext): Promise<readonly LintResult[]>;
}

/**
 * ルールエンジンの設定
 * 各ルールの有効/無効や重要度をカスタマイズ可能
 */
export interface LintConfig {
  /** 各ルールの設定（ルールIDをキーとする） */
  readonly rules: ReadonlyMap<LintRuleId, LintRuleConfig>;
}

/**
 * 個別ルールの設定
 */
export interface LintRuleConfig {
  /** ルールの有効性 */
  readonly enabled: boolean;
  /** 重要度の上書き（指定しない場合はデフォルト値を使用） */
  readonly severity?: LintSeverity;
}

/**
 * Lint実行の全体結果
 * 複数ルールの実行結果をまとめて管理
 */
export interface LintReport {
  /** 実行されたファイルパス */
  readonly filePath?: string;
  /** 発見された問題のリスト */
  readonly results: readonly LintResult[];
  /** エラー数 */
  readonly errorCount: number;
  /** 警告数 */
  readonly warningCount: number;
  /** 情報数 */
  readonly infoCount: number;
  /** 実行時間（ミリ秒） */
  readonly duration: number;
}

export interface LintEngineConfig {
  readonly rules: ReadonlyMap<LintRuleId, LintRuleConfig>;
}

// RuleEngineクラスの設定更新をサポート
export interface ConfigurableRuleEngine {
  updateConfig(config: Partial<LintConfig>): void;
  getCurrentConfig(): LintConfig;
}
