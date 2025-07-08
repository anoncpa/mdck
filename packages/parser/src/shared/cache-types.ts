// src/shared/cache-types.ts
import type { Root } from 'mdast';
import type { TemplateDefinitions } from './template-types';

/**
 * キャッシュデータの全体構造
 */
export interface CacheData {
  /** キャッシュのバージョン */
  version: string;
  /** 最終更新時刻 */
  lastUpdated: number;
  /** プロジェクトルートパス */
  projectRoot: string;
  /** ファイル別メタデータ */
  files: Map<string, FileMetadata>;
  /** テンプレート定義キャッシュ */
  templates: Map<string, CachedTemplateDefinition>;
  /** 依存関係グラフ */
  dependencies: DependencyGraph;
}

/**
 * ファイル別メタデータ
 */
export interface FileMetadata {
  /** ファイルパス */
  filePath: string;
  /** ファイルサイズ */
  size: number;
  /** 最終変更時刻 */
  mtime: number;
  /** ファイルハッシュ（内容ベース） */
  hash: string;
  /** テンプレート定義のID一覧 */
  templateIds: readonly string[];
  /** テンプレート参照のID一覧 */
  referenceIds: readonly string[];
  /** 外部ファイル参照一覧 */
  externalReferences: readonly string[];
  /** 解析エラー情報 */
  errors?: readonly CacheError[];
}

/**
 * キャッシュされたテンプレート定義
 */
export interface CachedTemplateDefinition {
  /** テンプレートID */
  id: string;
  /** 定義されているファイルパス */
  filePath: string;
  /** 開始行番号 */
  startLine: number;
  /** 終了行番号 */
  endLine: number;
  /** 依存するテンプレートID一覧 */
  dependencies: readonly string[];
  /** 最終更新時刻 */
  lastModified: number;
}

/**
 * 依存関係グラフ
 */
export interface DependencyGraph {
  /** ノード（テンプレートID） */
  nodes: Set<string>;
  /** エッジ（依存関係） */
  edges: Map<string, Set<string>>;
  /** 逆エッジ（被依存関係） */
  reverseEdges: Map<string, Set<string>>;
  /** 循環参照の検出結果 */
  cycles: readonly string[][];
}

/**
 * キャッシュエラー情報
 */
export interface CacheError {
  /** エラーの種類 */
  type: 'parse-error' | 'file-not-found' | 'circular-reference' | 'duplicate-definition';
  /** エラーメッセージ */
  message: string;
  /** 発生行番号 */
  line?: number;
  /** 関連するテンプレートID */
  templateId?: string;
}

/**
 * キャッシュ更新結果
 */
export interface CacheUpdateResult {
  /** 更新されたファイル数 */
  updatedFiles: number;
  /** 新規追加されたファイル数 */
  addedFiles: number;
  /** 削除されたファイル数 */
  removedFiles: number;
  /** 更新にかかった時間（ミリ秒） */
  duration: number;
  /** エラーが発生したファイル一覧 */
  errors: readonly { filePath: string; error: string }[];
}

/**
 * キャッシュ検証結果
 */
export interface CacheValidationResult {
  /** キャッシュが有効かどうか */
  isValid: boolean;
  /** 無効な理由 */
  reason?: string;
  /** 変更されたファイル一覧 */
  changedFiles?: readonly string[];
  /** 削除されたファイル一覧 */
  deletedFiles?: readonly string[];
}

/**
 * ファイル変更情報
 */
export interface FileChangeInfo {
  /** ファイルパス */
  filePath: string;
  /** 変更の種類 */
  changeType: 'added' | 'modified' | 'deleted';
  /** 変更前のハッシュ */
  oldHash?: string;
  /** 変更後のハッシュ */
  newHash?: string;
}

/**
 * キャッシュマネージャーの設定
 */
export interface CacheManagerConfig {
  /** プロジェクトルートディレクトリ */
  projectRoot: string;
  /** キャッシュディレクトリ（デフォルト: .mdck/.cache） */
  cacheDir?: string;
  /** キャッシュの有効期限（ミリ秒、デフォルト: 24時間） */
  maxAge?: number;
  /** 並列処理の最大数 */
  maxConcurrency?: number;
  /** Git連携を有効にするか */
  enableGitIntegration?: boolean;
}