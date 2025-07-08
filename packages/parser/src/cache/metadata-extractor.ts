// src/cache/metadata-extractor.ts
import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import type { Root } from 'mdast';
import { processor } from '../core/processor';
import { TemplateExpander } from '../core/template-expander';
import { FileResolver } from '../core/file-resolver';
import type {
  FileMetadata,
  CachedTemplateDefinition,
  CacheError,
} from '../shared/cache-types';

/**
 * ファイルからメタデータを抽出するクラス
 */
export class MetadataExtractor {
  private readonly templateExpander: TemplateExpander;

  constructor() {
    const fileResolver = new FileResolver();
    this.templateExpander = new TemplateExpander(fileResolver);
  }

  /**
   * ファイルからメタデータを抽出
   */
  public async extractFileMetadata(filePath: string): Promise<FileMetadata> {
    try {
      // ファイル情報の取得
      const stats = await stat(filePath);
      const content = await readFile(filePath, 'utf8');
      const hash = this.calculateHash(content);

      // AST解析
      const ast = processor.parse(content) as Root;

      // テンプレート情報の抽出
      const { templateIds, referenceIds, externalReferences, errors } = 
        await this.extractTemplateInfo(ast, filePath);

      return {
        filePath,
        size: stats.size,
        mtime: stats.mtime.getTime(),
        hash,
        templateIds,
        referenceIds,
        externalReferences,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      // ファイル読み込みエラーの場合
      const errorInfo: CacheError = {
        type: 'parse-error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };

      return {
        filePath,
        size: 0,
        mtime: 0,
        hash: '',
        templateIds: [],
        referenceIds: [],
        externalReferences: [],
        errors: [errorInfo],
      };
    }
  }

  /**
   * テンプレート定義をキャッシュ用に変換
   */
  public async extractTemplateDefinitions(
    filePath: string,
    ast: Root
  ): Promise<readonly CachedTemplateDefinition[]> {
    try {
      const definitions = this.templateExpander.collectDefinitions(ast, filePath);
      const result: CachedTemplateDefinition[] = [];

      for (const [id, definition] of definitions) {
        result.push({
          id,
          filePath: definition.filePath || filePath,
          startLine: definition.position.startLine,
          endLine: definition.position.endLine,
          dependencies: definition.dependencies,
          lastModified: Date.now(),
        });
      }

      return result;
    } catch (error) {
      // 重複定義エラーなどが発生した場合は空配列を返す
      return [];
    }
  }

  /**
   * ファイル内容のハッシュを計算
   */
  private calculateHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * ASTからテンプレート情報を抽出
   */
  private async extractTemplateInfo(
    ast: Root,
    filePath: string
  ): Promise<{
    templateIds: string[];
    referenceIds: string[];
    externalReferences: string[];
    errors: CacheError[];
  }> {
    const templateIds: string[] = [];
    const referenceIds: string[] = [];
    const externalReferences: string[] = [];
    const errors: CacheError[] = [];

    try {
      // テンプレート定義の抽出
      const definitions = this.templateExpander.collectDefinitions(ast, filePath);
      templateIds.push(...definitions.keys());

      // テンプレート参照の抽出
      const references = this.templateExpander.collectReferences(ast);
      for (const reference of references) {
        referenceIds.push(reference.id);
        if (reference.src) {
          externalReferences.push(reference.src);
        }
      }
    } catch (error) {
      // 重複定義エラーなどを記録
      if (error instanceof Error && error.message.includes('Duplicate template definition')) {
        const match = error.message.match(/Duplicate template definition[:\s]+["']?([^"'\s]+)["']?/);
        const templateId = match?.[1] || 'unknown';

        errors.push({
          type: 'duplicate-definition',
          message: error.message,
          templateId,
        });
      } else {
        errors.push({
          type: 'parse-error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      templateIds,
      referenceIds,
      externalReferences,
      errors,
    };
  }
}