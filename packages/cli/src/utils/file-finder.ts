// src/utils/file-finder.ts
import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { FileSearchResult } from '../types';

/**
 * ファイル検索ユーティリティ
 */
export class FileFinder {
  private readonly defaultPatterns = ['**/*.md'];
  private readonly defaultExcludes = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.mdck/**',
  ];

  /**
   * Markdownファイルを検索
   */
  async findMarkdownFiles(
    patterns: string[] = this.defaultPatterns,
    excludePatterns: string[] = this.defaultExcludes,
    rootDir: string = process.cwd()
  ): Promise<FileSearchResult> {
    const startTime = Date.now();
    const files: string[] = [];
    const excluded: string[] = [];

    // パターンが具体的なファイルパスの場合
    if (patterns.length === 1 && !patterns[0].includes('*')) {
      const filePath = path.resolve(rootDir, patterns[0]);
      if (existsSync(filePath) && filePath.endsWith('.md')) {
        files.push(filePath);
      }
      return {
        files,
        excluded,
        duration: Date.now() - startTime,
      };
    }

    // ディレクトリを再帰的に検索
    await this.searchDirectory(rootDir, files, excluded, excludePatterns);

    return {
      files: files.sort(),
      excluded: excluded.sort(),
      duration: Date.now() - startTime,
    };
  }

  /**
   * ディレクトリを再帰的に検索
   */
  private async searchDirectory(
    dir: string,
    files: string[],
    excluded: string[],
    excludePatterns: string[]
  ): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);

        // 除外パターンチェック
        if (this.shouldExclude(relativePath, excludePatterns)) {
          excluded.push(fullPath);
          continue;
        }

        if (entry.isDirectory()) {
          // ディレクトリの場合は再帰的に検索
          await this.searchDirectory(fullPath, files, excluded, excludePatterns);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          // Markdownファイルの場合は追加
          files.push(fullPath);
        }
      }
    } catch (error) {
      // ディレクトリアクセスエラーは無視
    }
  }

  /**
   * 除外パターンチェック
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => {
      // 簡単なグロブパターンマッチング
      const regex = this.globToRegex(pattern);
      return regex.test(filePath);
    });
  }

  /**
   * グロブパターンを正規表現に変換
   */
  private globToRegex(pattern: string): RegExp {
    // 簡易的なグロブパターン変換
    let regexPattern = pattern
      .replace(/\*\*/g, '.*') // ** -> .*
      .replace(/\*/g, '[^/]*') // * -> [^/]*
      .replace(/\?/g, '.') // ? -> .
      .replace(/\./g, '\\.'); // . -> \.

    return new RegExp(`^${regexPattern}$`);
  }

  /**
   * ファイルが存在するかチェック
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const stats = await stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  /**
   * ディレクトリが存在するかチェック
   */
  async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
}