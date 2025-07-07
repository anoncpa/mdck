// packages/parser/src/index.ts
import { Tokenizer } from './core/tokenizer';
import { parseCustomTags } from './core/custom-tag-parser';
import { TemplateProcessor } from './core/template-processor';
import { FileResolver } from './core/file-resolver';
import { ParseResult, CustomTag, TemplateDefinition } from './shared/types';
import {
  MdckError,
  TemplateProcessingError,
  FileResolutionError,
} from './shared/errors';
import type {Token} from './shared/types';

// 公開する型を再エクスポート
export type { ParseResult, CustomTag, Token, TemplateDefinition };
export { MdckError, TemplateProcessingError, FileResolutionError };

/**
 * mdck (Markdown Check List) のためのコアパーサー。
 * テキストを受け取り、トークンとカスタムタグの構造に変換する。
 * Phase 2: テンプレート処理機能を追加。
 */
export class MdckParser {
  private tokenizer: Tokenizer;
  private templateProcessor: TemplateProcessor;
  private fileResolver: FileResolver;

  constructor() {
    this.tokenizer = new Tokenizer();
    this.fileResolver = new FileResolver();
    this.templateProcessor = new TemplateProcessor(this.fileResolver);
  }

  /**
   * Markdownコンテンツを解析し、トークンとカスタムタグの情報を抽出する。
   * これは現時点でのパーサーの主要な機能。
   * @param content - 解析対象のMarkdown文字列。
   * @returns 解析結果。生のトークンと抽出されたカスタムタグを含む。
   */
  public parse(content: string): ParseResult {
    // 1. 文字列をトークン列に変換
    const tokens = this.tokenizer.tokenize(content);
    // 2. トークン列からカスタムタグを抽出
    const customTags = parseCustomTags(tokens);

    return {
      tokens,
      customTags,
    };
  }

  /**
   * 指定されたファイルのテンプレート定義を収集する。
   * 外部ファイル参照と循環参照の検出も含む。
   *
   * @param content - 解析対象のMarkdown文字列
   * @param filePath - ソースファイルパス（外部ファイル解決に使用）
   * @returns テンプレート定義のMap
   * @throws {TemplateProcessingError} テンプレート処理に失敗した場合
   * @throws {FileResolutionError} ファイル解決に失敗した場合
   */
  public async collectTemplateDefinitions(
    content: string,
    filePath?: string
  ): Promise<ReadonlyMap<string, TemplateDefinition>> {
    const tokens = this.tokenizer.tokenize(content);
    return await this.templateProcessor.collectDefinitions(tokens, filePath);
  }

  /**
   * 指定されたテンプレートIDの循環参照をチェックする。
   *
   * @param templateId - チェック対象のテンプレートID
   * @param definitions - 利用可能なテンプレート定義
   * @throws {TemplateProcessingError} 循環参照が存在する場合
   */
  public checkCircularReference(
    templateId: string,
    definitions: ReadonlyMap<string, TemplateDefinition>
  ): void {
    this.templateProcessor.checkCircularReference(templateId, definitions);
  }

  /**
   * ファイルキャッシュをクリアする。
   * 長時間実行されるプロセスでのメモリ管理やテスト時に使用。
   */
  public clearFileCache(): void {
    this.fileResolver.clearCache();
  }
}
