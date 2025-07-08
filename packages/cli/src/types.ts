// src/types.ts
import type { LintReport } from '@mdck/parser';

/**
 * CLI共通の型定義
 */

/**
 * 出力フォーマット
 */
export type OutputFormat = 'console' | 'json' | 'sarif' | 'junit';

/**
 * ログレベル
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * CLI設定
 */
export interface CliConfig {
  /** 出力フォーマット */
  format: OutputFormat;
  /** ログレベル */
  logLevel: LogLevel;
  /** 色付き出力を有効にするか */
  color: boolean;
  /** 詳細出力を有効にするか */
  verbose: boolean;
  /** 静音モード */
  quiet: boolean;
}

/**
 * Lintコマンドのオプション
 */
export interface LintOptions {
  /** 対象ファイルパターン */
  files?: string[];
  /** 出力フォーマット */
  format?: OutputFormat;
  /** 出力ファイル */
  output?: string;
  /** 有効にするルール */
  rules?: string[];
  /** 無効にするルール */
  disableRules?: string[];
  /** 設定ファイルパス */
  config?: string;
  /** 修正可能な問題を自動修正 */
  fix?: boolean;
  /** キャッシュを使用するか */
  cache?: boolean;
  /** 詳細出力 */
  verbose?: boolean;
  /** 静音モード */
  quiet?: boolean;
  /** 色付き出力を有効にするか */
  color?: boolean;
}

/**
 * Generateコマンドのオプション
 */
export interface GenerateOptions {
  /** テンプレートID */
  templateId: string;
  /** 出力ファイル */
  output?: string;
  /** 上書きを許可するか */
  force?: boolean;
  /** 変数の値 */
  variables?: Record<string, string>;
  /** キャッシュを使用するか */
  cache?: boolean;
  /** 詳細出力 */
  verbose?: boolean;
  /** 静音モード */
  quiet?: boolean;
}

/**
 * Cacheコマンドのオプション
 */
export interface CacheOptions {
  /** キャッシュをクリアするか */
  clear?: boolean;
  /** キャッシュを再構築するか */
  rebuild?: boolean;
  /** キャッシュ情報を表示するか */
  info?: boolean;
  /** 詳細出力 */
  verbose?: boolean;
  /** 静音モード */
  quiet?: boolean;
}

/**
 * Configコマンドのオプション
 */
export interface ConfigOptions {
  /** 設定キー */
  key?: string;
  /** 設定値 */
  value?: string;
  /** 設定を削除するか */
  delete?: boolean;
  /** 全設定を表示するか */
  list?: boolean;
  /** グローバル設定を使用するか */
  global?: boolean;
  /** 詳細出力 */
  verbose?: boolean;
  /** 静音モード */
  quiet?: boolean;
}

/**
 * Completionコマンドのオプション
 */
export interface CompletionOptions {
  /** シェルの種類 */
  shell?: 'bash' | 'zsh' | 'fish';
  /** 補完対象 */
  type?: 'template' | 'rule' | 'file' | 'config';
  /** 現在の入力 */
  current?: string;
}

/**
 * CLI実行結果
 */
export interface CliResult {
  /** 成功したかどうか */
  success: boolean;
  /** 終了コード */
  exitCode: number;
  /** メッセージ */
  message?: string;
  /** 詳細データ */
  data?: any;
}

/**
 * ファイル検索結果
 */
export interface FileSearchResult {
  /** 見つかったファイル一覧 */
  files: string[];
  /** 除外されたファイル一覧 */
  excluded: string[];
  /** 検索にかかった時間（ミリ秒） */
  duration: number;
}

/**
 * フォーマッター共通インターフェース
 */
export interface Formatter {
  /**
   * Lint結果をフォーマット
   */
  formatLintReport(report: LintReport): string;
  
  /**
   * エラーメッセージをフォーマット
   */
  formatError(error: Error): string;
  
  /**
   * 成功メッセージをフォーマット
   */
  formatSuccess(message: string): string;
}