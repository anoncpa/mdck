// packages/parser/src/core/template-processor.ts
import type {Token} from '../shared/types';
import { TemplateDefinition, CustomTag } from '../shared/types';
import { TemplateProcessingError } from '../shared/errors';
import { parseCustomTags } from './custom-tag-parser';
import { FileResolver } from './file-resolver';

/**
 * テンプレート定義の収集・管理・展開を担当するクラス。
 * 単一責任の原則に従い、テンプレート処理のみに特化する。
 */
export class TemplateProcessor {
  private readonly fileResolver: FileResolver;
  private readonly definitionsCache = new Map<string, TemplateDefinition>();

  constructor(fileResolver?: FileResolver) {
    this.fileResolver = fileResolver ?? new FileResolver();
  }

  /**
   * トークン列からテンプレート定義を収集する。
   * 同一ファイル内の定義と外部ファイル参照の両方を処理する。
   *
   * @param tokens - 解析対象のトークン列
   * @param filePath - ソースファイルパス（外部ファイル解決に使用）
   * @returns テンプレート定義のMap
   * @throws {TemplateProcessingError} テンプレート処理に失敗した場合
   */
  async collectDefinitions(
    tokens: readonly Token[],
    filePath?: string
  ): Promise<ReadonlyMap<string, TemplateDefinition>> {
    const definitions = new Map<string, TemplateDefinition>();

    // 1. 同一ファイル内のローカル定義を収集
    const localDefinitions = this.collectLocalDefinitions(tokens, filePath);
    for (const [id, def] of localDefinitions) {
      definitions.set(id, def);
    }

    // 2. 外部ファイル参照を解決
    const externalDefinitions = await this.resolveExternalReferences(
      tokens,
      filePath
    );
    for (const [id, def] of externalDefinitions) {
      definitions.set(id, def);
    }

    return definitions;
  }

  /**
   * 指定されたテンプレートIDの循環参照をチェックする。
   * DFS（深さ優先探索）を使用して効率的に検出する。
   *
   * @param templateId - チェック対象のテンプレートID
   * @param definitions - 利用可能なテンプレート定義
   * @throws {TemplateProcessingError} 循環参照が検出された場合
   */
  checkCircularReference(
    templateId: string,
    definitions: ReadonlyMap<string, TemplateDefinition>
  ): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (currentId: string): boolean => {
      if (recursionStack.has(currentId)) {
        // 循環参照検出: 現在の再帰スタックに同じIDが存在
        path.push(currentId);
        return true;
      }

      if (visited.has(currentId)) {
        // 既に訪問済みで循環参照なし
        return false;
      }

      visited.add(currentId);
      recursionStack.add(currentId);
      path.push(currentId);

      const definition = definitions.get(currentId);
      if (definition) {
        for (const dependencyId of definition.dependencies) {
          if (dfs(dependencyId)) {
            return true; // 依存関係で循環参照検出
          }
        }
      }

      recursionStack.delete(currentId);
      path.pop();
      return false;
    };

    if (dfs(templateId)) {
      throw TemplateProcessingError.circularReference([...path]);
    }
  }

  /**
   * 同一ファイル内のテンプレート定義を収集する内部メソッド。
   * <Template id="...">...</Template> 形式の定義を抽出する。
   */
  private collectLocalDefinitions(
    tokens: readonly Token[],
    filePath?: string
  ): Map<string, TemplateDefinition> {
    const definitions = new Map<string, TemplateDefinition>();
    const customTags = parseCustomTags([...tokens]); // parseCustomTagsは配列を変更する可能性があるためコピー

    for (const tag of customTags) {
      if (tag.tagName === 'Template' && !tag.isSelfClosing) {
        // テンプレート定義（自己終了タグでない）
        const templateId = this.extractTemplateId(tag);
        if (!templateId) {
          throw TemplateProcessingError.invalidDefinition(
            'Template tag missing id attribute',
            filePath,
            tag.line
          );
        }

        // 重複チェック
        if (definitions.has(templateId)) {
          throw TemplateProcessingError.duplicateDefinition(
            templateId,
            filePath,
            tag.line
          );
        }

        // テンプレート本体のトークン範囲を特定
        const bodyTokens = this.extractTemplateBodyTokens(tokens, tag);
        const dependencies = this.extractDependencies(bodyTokens);

        const definition: TemplateDefinition = {
          id: templateId,
          tokens: bodyTokens,
          filePath,
          startLine: tag.line,
          endLine: tag.line + bodyTokens.length, // 簡易計算、正確な実装は行マッピングが必要
          dependencies,
        };

        definitions.set(templateId, definition);
      }
    }

    return definitions;
  }

  /**
   * 外部ファイル参照を解決する内部メソッド。
   * <Template id="..." src="./file.md" /> 形式の参照を処理する。
   */
  private async resolveExternalReferences(
    tokens: readonly Token[],
    basePath?: string
  ): Promise<Map<string, TemplateDefinition>> {
    const definitions = new Map<string, TemplateDefinition>();
    const customTags = parseCustomTags([...tokens]);

    for (const tag of customTags) {
      if (tag.tagName === 'Template' && tag.isSelfClosing) {
        const srcPath = tag.attributes.src as string;
        if (srcPath) {
          // 外部ファイル参照
          const resolvedData = await this.fileResolver.resolveFile(
            srcPath,
            basePath
          );

          // 外部ファイルからテンプレート定義を再帰的に収集
          const externalDefinitions = await this.collectDefinitions(
            resolvedData.tokens,
            resolvedData.filePath
          );

          for (const [id, def] of externalDefinitions) {
            definitions.set(id, def);
          }
        }
      }
    }

    return definitions;
  }

  /**
   * CustomTagからテンプレートIDを抽出する。
   * id属性またはTemplateId属性を優先順位をつけて取得する。
   */
  private extractTemplateId(tag: CustomTag): string | null {
    // 仕様書によると、TemplateId属性を優先
    const templateId = tag.attributes.TemplateId as string;
    if (templateId) return templateId;

    // フォールバックとしてid属性も確認
    const id = tag.attributes.id as string;
    return id || null;
  }

  /**
   * テンプレート定義のボディ部分のトークンを抽出する。
   * 現在は簡易実装、将来的にはネストレベルを考慮した正確な実装が必要。
   */
  private extractTemplateBodyTokens(
    tokens: readonly Token[],
    templateTag: CustomTag
  ): readonly Token[] {
    // 簡易実装: Template開始タグの後から終了タグまでを抽出
    // 実際の実装では、markdown-itのトークン構造とネストレベルを考慮する必要がある
    return tokens.slice(0, 10); // プレースホルダー実装
  }

  /**
   * トークン列から依存するテンプレートIDを抽出する。
   * <Template id="..." /> の形式の参照を検出する。
   */
  private extractDependencies(tokens: readonly Token[]): readonly string[] {
    const dependencies: string[] = [];
    const customTags = parseCustomTags([...tokens]);

    for (const tag of customTags) {
      if (tag.tagName === 'Template' && tag.isSelfClosing) {
        const referencedId = this.extractTemplateId(tag);
        if (referencedId) {
          dependencies.push(referencedId);
        }
      }
    }

    return dependencies;
  }
}
