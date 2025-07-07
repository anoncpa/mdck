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
export class TemplateError extends MdckError {
  readonly code = 'TEMPLATE_ERROR';
}

/**
 * 循環参照エラー
 */
export class CircularReferenceError extends TemplateError {
  readonly code = 'CIRCULAR_REFERENCE';

  constructor(path: string[]) {
    super(`Circular reference detected: ${path.join(' → ')}`);
    this.details = { path };
  }
}

/**
 * テンプレート未定義エラー
 */
export class TemplateNotFoundError extends TemplateError {
  readonly code = 'TEMPLATE_NOT_FOUND';

  constructor(templateId: string) {
    super(`Template not found: ${templateId}`);
    this.details = { templateId };
  }
}

/**
 * テンプレート重複定義エラー
 */
export class DuplicateTemplateError extends TemplateError {
  readonly code = 'DUPLICATE_TEMPLATE';

  constructor(templateId: string) {
    super(`Duplicate template definition: ${templateId}`);
    this.details = { templateId };
  }
}

/**
 * ファイル関連のエラー
 */
export class FileError extends MdckError {
  readonly code = 'FILE_ERROR';
}

/**
 * 外部ファイル未発見エラー
 */
export class ExternalFileNotFoundError extends FileError {
  readonly code = 'EXTERNAL_FILE_NOT_FOUND';

  constructor(filePath: string) {
    super(`External file not found: ${filePath}`);
    this.details = { filePath };
  }
}
