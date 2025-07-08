// src/utils/exit-codes.ts

/**
 * CLI終了コード定義
 */
export const ExitCodes = {
  /** 成功 */
  SUCCESS: 0,
  /** 一般的なエラー */
  GENERAL_ERROR: 1,
  /** Lintエラーが見つかった */
  LINT_ERRORS: 2,
  /** 設定エラー */
  CONFIG_ERROR: 3,
  /** ファイルが見つからない */
  FILE_NOT_FOUND: 4,
  /** 権限エラー */
  PERMISSION_ERROR: 5,
  /** 無効な引数 */
  INVALID_ARGUMENT: 6,
  /** キャッシュエラー */
  CACHE_ERROR: 7,
  /** テンプレートが見つからない */
  TEMPLATE_NOT_FOUND: 8,
} as const;

export type ExitCode = typeof ExitCodes[keyof typeof ExitCodes];