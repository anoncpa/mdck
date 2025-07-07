// src/core/file-resolver.ts
import { readFile, access } from 'fs/promises';
import path from 'path';
import type { Root } from '../shared/types';
import { processor } from './processor';
import { ExternalFileNotFoundError } from '../shared/errors';

/**
 * ファイル解決結果を表現する型
 * 成功時はAST、失敗時はエラー情報を含む
 */
export type FileResolutionResult =
  | {
      readonly status: 'success';
      readonly ast: Root;
      readonly resolvedPath: string;
    }
  | {
      readonly status: 'error';
      readonly errorType: 'not-found' | 'access-denied' | 'parse-error';
      readonly message: string;
      readonly attemptedPath: string;
    };

/**
 * 外部ファイルの解決と読み込みを担当するクラス
 * ファイルパス解決、存在確認、読み込み、解析の責務を持つ
 */
export class FileResolver {
  private readonly fileCache = new Map<string, Root>();

  /**
   * 外部ファイルを解決し、Markdown内容をASTとして読み込む
   * @param srcPath ソースパス（相対パスまたは絶対パス）
   * @param basePath 基準となるファイルパス（相対パス解決に使用）
   * @returns ファイル解決結果
   */
  public async resolveFile(
    srcPath: string,
    basePath?: string
  ): Promise<FileResolutionResult> {
    try {
      // 1. パス解決
      const resolvedPath = this.resolvePath(srcPath, basePath);

      // 2. キャッシュチェック
      const cachedAst = this.fileCache.get(resolvedPath);
      if (cachedAst) {
        return {
          status: 'success',
          ast: cachedAst,
          resolvedPath,
        };
      }

      // 3. ファイル存在確認
      const exists = await this.fileExists(resolvedPath);
      if (!exists) {
        return {
          status: 'error',
          errorType: 'not-found',
          message: `File not found: ${srcPath}`,
          attemptedPath: resolvedPath,
        };
      }

      // 4. ファイル読み込み
      const content = await this.readFileContent(resolvedPath);

      // 5. Markdown解析
      const ast = processor.parse(content) as Root;

      // 6. キャッシュ保存
      this.fileCache.set(resolvedPath, ast);

      return {
        status: 'success',
        ast,
        resolvedPath,
      };
    } catch (error) {
      return this.handleFileError(error, srcPath);
    }
  }

  /**
   * キャッシュを無効化する
   * テスト時やファイル変更時に使用
   */
  public clearCache(): void {
    this.fileCache.clear();
  }

  /**
   * 特定のファイルのキャッシュを無効化する
   * @param filePath 無効化対象のファイルパス
   */
  public invalidateFile(filePath: string): void {
    this.fileCache.delete(filePath);
  }

  /**
   * 相対パスまたは絶対パスを解決する
   * @param srcPath ソースパス
   * @param basePath 基準パス
   * @returns 解決されたパス
   */
  private resolvePath(srcPath: string, basePath?: string): string {
    if (path.isAbsolute(srcPath)) {
      return srcPath;
    }

    const base = basePath ? path.dirname(basePath) : process.cwd();
    return path.resolve(base, srcPath);
  }

  /**
   * ファイルの存在確認を行う
   * @param filePath 確認対象のファイルパス
   * @returns ファイルが存在する場合true
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ファイル内容を読み込む
   * @param filePath 読み込み対象のファイルパス
   * @returns ファイル内容
   */
  private async readFileContent(filePath: string): Promise<string> {
    try {
      return await readFile(filePath, 'utf8');
    } catch (error) {
      throw new ExternalFileNotFoundError(filePath);
    }
  }

  /**
   * ファイル操作エラーを適切なエラー結果に変換する
   * @param error 発生したエラー
   * @param srcPath ソースパス
   * @returns エラー結果
   */
  private handleFileError(
    error: unknown,
    srcPath: string
  ): FileResolutionResult {
    if (error instanceof ExternalFileNotFoundError) {
      return {
        status: 'error',
        errorType: 'not-found',
        message: error.message,
        attemptedPath: srcPath,
      };
    }

    if (error instanceof Error) {
      // ファイル権限エラーなど
      if (
        error.message.includes('permission') ||
        error.message.includes('EACCES')
      ) {
        return {
          status: 'error',
          errorType: 'access-denied',
          message: `Access denied: ${srcPath}`,
          attemptedPath: srcPath,
        };
      }

      // パースエラーなど
      return {
        status: 'error',
        errorType: 'parse-error',
        message: `Failed to parse file: ${error.message}`,
        attemptedPath: srcPath,
      };
    }

    return {
      status: 'error',
      errorType: 'parse-error',
      message: `Unknown error occurred while resolving file: ${srcPath}`,
      attemptedPath: srcPath,
    };
  }
}
