// packages/parser/src/shared/errors.ts

/**
 * mdck parser関連のエラーベースクラス
 */
export abstract class MdckError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

/**
 * テンプレート関連のエラー
 */
export abstract class TemplateError extends MdckError {
  abstract readonly code: string;
}

/**
 * 循環参照エラー
 */
export class CircularReferenceError extends TemplateError {
  readonly code = 'CIRCULAR_REFERENCE' as const;

  constructor(path: string[]) {
    super(`Circular reference detected: ${path.join(' → ')}`, { path });
  }
}

/**
 * テンプレート未定義エラー
 */
export class TemplateNotFoundError extends TemplateError {
  readonly code = 'TEMPLATE_NOT_FOUND' as const;

  constructor(templateId: string) {
    super(`Template not found: ${templateId}`, { templateId });
  }
}

/**
 * テンプレート重複定義エラー
 */
export class DuplicateTemplateError extends TemplateError {
  readonly code = 'DUPLICATE_TEMPLATE' as const;

  constructor(templateId: string) {
    super(`Duplicate template definition: ${templateId}`, { templateId });
  }
}

/**
 * ファイル関連のエラー
 */
export abstract class FileError extends MdckError {
  abstract readonly code: string;
}

/**
 * 外部ファイル未発見エラー
 */
export class ExternalFileNotFoundError extends FileError {
  readonly code = 'EXTERNAL_FILE_NOT_FOUND' as const;

  constructor(filePath: string) {
    super(`External file not found: ${filePath}`, { filePath });
  }
}
