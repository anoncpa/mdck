// packages/parser/src/shared/errors.ts

/**
 * mdckパーサーで発生する全エラーの基底クラス。
 * 型安全性を保ちつつシンプルなエラーハンドリングを実現する。
 */
export abstract class MdckError extends Error {
  /**
   * エラーの種類を示すコード
   */
  abstract readonly code: string;

  /**
   * エラーが発生したファイルパス
   */
  readonly filePath?: string;

  /**
   * エラーが発生した行番号（1-based）
   */
  readonly line?: number;

  constructor(message: string, filePath?: string, line?: number) {
    super(message);
    this.name = this.constructor.name;
    this.filePath = filePath;
    this.line = line;
  }
}

/**
 * テンプレート処理で発生するエラー
 */
export class TemplateProcessingError extends MdckError {
  readonly code: string;

  constructor(code: string, message: string, filePath?: string, line?: number) {
    super(message, filePath, line);
    this.code = code;
  }

  static templateNotFound(
    templateId: string,
    filePath?: string,
    line?: number
  ): TemplateProcessingError {
    return new TemplateProcessingError(
      'TEMPLATE_NOT_FOUND',
      `Template not found: ${templateId}`,
      filePath,
      line
    );
  }

  static circularReference(
    path: readonly string[],
    filePath?: string,
    line?: number
  ): TemplateProcessingError {
    return new TemplateProcessingError(
      'CIRCULAR_REFERENCE',
      `Circular reference detected: ${path.join(' → ')}`,
      filePath,
      line
    );
  }

  static invalidDefinition(
    reason: string,
    filePath?: string,
    line?: number
  ): TemplateProcessingError {
    return new TemplateProcessingError(
      'INVALID_TEMPLATE_DEFINITION',
      `Invalid template definition: ${reason}`,
      filePath,
      line
    );
  }

  static duplicateDefinition(
    templateId: string,
    filePath?: string,
    line?: number
  ): TemplateProcessingError {
    return new TemplateProcessingError(
      'DUPLICATE_TEMPLATE_DEFINITION',
      `Duplicate template definition: ${templateId}`,
      filePath,
      line
    );
  }
}

/**
 * ファイル解決で発生するエラー
 */
export class FileResolutionError extends MdckError {
  readonly code: string;

  constructor(code: string, message: string, filePath?: string) {
    super(message, filePath);
    this.code = code;
  }

  static fileNotFound(filePath: string): FileResolutionError {
    return new FileResolutionError(
      'FILE_NOT_FOUND',
      `File not found: ${filePath}`,
      filePath
    );
  }

  static readPermissionDenied(filePath: string): FileResolutionError {
    return new FileResolutionError(
      'READ_PERMISSION_DENIED',
      `Read permission denied: ${filePath}`,
      filePath
    );
  }

  static invalidPath(filePath: string, reason: string): FileResolutionError {
    return new FileResolutionError(
      'INVALID_PATH',
      `Invalid path: ${filePath} (${reason})`,
      filePath
    );
  }
}

/**
 * パースエラーの判定ヘルパー関数群
 */
export const ErrorUtils = {
  /**
   * MdckErrorかどうかを判定する型ガード
   */
  isMdckError(error: unknown): error is MdckError {
    return error instanceof MdckError;
  },

  /**
   * テンプレート処理エラーかどうかを判定する型ガード
   */
  isTemplateProcessingError(error: unknown): error is TemplateProcessingError {
    return error instanceof TemplateProcessingError;
  },

  /**
   * ファイル解決エラーかどうかを判定する型ガード
   */
  isFileResolutionError(error: unknown): error is FileResolutionError {
    return error instanceof FileResolutionError;
  },
};
