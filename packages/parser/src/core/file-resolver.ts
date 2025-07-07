// packages/parser/src/core/file-resolver.ts
import { readFile, access } from 'fs/promises';
import { resolve, dirname, isAbsolute } from 'path';
import type Token from 'markdown-it/lib/token.mjs';
import { FileResolutionError } from '../shared/errors';
import { Tokenizer } from './tokenizer';

/**
 * 外部ファイルの解決とキャッシュを担当するクラス。
 * ファイルアクセスの単一責任を持つ。
 */
export class FileResolver {
  private readonly tokenizer: Tokenizer;
  private readonly cache = new Map<
    string,
    { tokens: Token[]; filePath: string }
  >();

  constructor() {
    this.tokenizer = new Tokenizer();
  }

  /**
   * 指定されたパスのファイルを解決し、トークン化する。
   * キャッシュ機能により、同一ファイルの重複読み込みを防ぐ。
   *
   * @param srcPath - 解決対象のファイルパス
   * @param basePath - 相対パス解決の基準となるパス
   * @returns ファイル内容のトークン列
   * @throws {FileResolutionError} ファイル解決に失敗した場合
   */
  async resolveFile(
    srcPath: string,
    basePath?: string
  ): Promise<{ tokens: Token[]; filePath: string }> {
    const resolvedPath = this.resolvePath(srcPath, basePath);

    // キャッシュチェック
    const cached = this.cache.get(resolvedPath);
    if (cached) {
      return cached;
    }

    // ファイル存在チェック
    await this.checkFileExists(resolvedPath);

    // ファイル読み込みとトークン化
    try {
      const content = await readFile(resolvedPath, 'utf8');
      const tokens = this.tokenizer.tokenize(content);

      const result = { tokens, filePath: resolvedPath };

      // キャッシュに保存
      this.cache.set(resolvedPath, result);

      return result;
    } catch (error) {
      // Node.jsのエラーを型安全なエラーに変換
      throw this.convertNodeError(error, resolvedPath);
    }
  }

  /**
   * キャッシュをクリアする。
   * テスト時や長時間実行されるプロセスでのメモリ管理に使用。
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 相対パスまたは絶対パスを解決する。
   * セキュリティ上の理由で、パストラバーサル攻撃を防ぐ検証も行う。
   */
  private resolvePath(srcPath: string, basePath?: string): string {
    if (isAbsolute(srcPath)) {
      return srcPath;
    }

    const baseDir = basePath ? dirname(basePath) : process.cwd();
    const resolved = resolve(baseDir, srcPath);

    // パストラバーサル攻撃の基本的な防止
    // より厳密なセキュリティチェックは将来的に追加可能
    if (!resolved.startsWith(baseDir)) {
      throw FileResolutionError.invalidPath(srcPath, 'Path traversal detected');
    }

    return resolved;
  }

  /**
   * ファイルの存在とアクセス権限を確認する。
   */
  private async checkFileExists(filePath: string): Promise<void> {
    try {
      await access(filePath);
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;

      if (nodeError.code === 'ENOENT') {
        throw FileResolutionError.fileNotFound(filePath);
      }

      if (nodeError.code === 'EACCES') {
        throw FileResolutionError.readPermissionDenied(filePath);
      }

      // その他のエラー
      throw FileResolutionError.invalidPath(
        filePath,
        nodeError.message || 'Unknown error'
      );
    }
  }

  /**
   * Node.jsの低レベルエラーを型安全なエラーに変換する。
   * エラーハンドリングの責任を明確化し、上位レイヤーでの処理を簡素化する。
   */
  private convertNodeError(
    error: unknown,
    filePath: string
  ): FileResolutionError {
    const nodeError = error as NodeJS.ErrnoException;

    switch (nodeError.code) {
      case 'ENOENT':
        return FileResolutionError.fileNotFound(filePath);
      case 'EACCES':
        return FileResolutionError.readPermissionDenied(filePath);
      default:
        return FileResolutionError.invalidPath(
          filePath,
          nodeError.message || 'Unknown file system error'
        );
    }
  }
}
