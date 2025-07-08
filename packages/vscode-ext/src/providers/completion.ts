// packages/vscode-ext/src/providers/completion.ts
import * as vscode from 'vscode';
import { MdckParser } from '@mdck/parser';

export class MdckCompletionProvider implements vscode.CompletionItemProvider {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
  }

  /**
   * 補完アイテムを提供
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[]> {
    // Markdownファイルのみ処理
    if (document.languageId !== 'markdown' && document.languageId !== 'markdown-checklist') {
      return [];
    }

    const line = document.lineAt(position);
    const lineText = line.text;
    const beforeCursor = lineText.substring(0, position.character);

    // テンプレート参照の補完を検出
    if (this.isTemplateReferenceContext(beforeCursor)) {
      return await this.provideTemplateCompletions(document);
    }

    // ディレクティブの補完を検出
    if (this.isDirectiveContext(beforeCursor)) {
      return this.provideDirectiveCompletions();
    }

    return [];
  }

  /**
   * テンプレート参照のコンテキストかチェック
   */
  private isTemplateReferenceContext(beforeCursor: string): boolean {
    // ::template{id=" の後にカーソルがある場合
    return /::template\s*\{\s*id\s*=\s*["']?[^"']*$/.test(beforeCursor);
  }

  /**
   * ディレクティブのコンテキストかチェック
   */
  private isDirectiveContext(beforeCursor: string): boolean {
    // :: の後にカーソルがある場合
    return /::[\w]*$/.test(beforeCursor);
  }

  /**
   * テンプレート補完アイテムを提供
   */
  private async provideTemplateCompletions(document: vscode.TextDocument): Promise<vscode.CompletionItem[]> {
    try {
      // キャッシュを初期化（プロジェクトルートを取得）
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (workspaceFolder) {
        this.parser.initializeCache(workspaceFolder.uri.fsPath);
      }

      // キャッシュからテンプレート一覧を取得
      const cacheData = await this.parser.getCacheData();
      if (!cacheData) {
        return [];
      }

      const completionItems: vscode.CompletionItem[] = [];

      // テンプレートIDの補完アイテムを作成
      for (const [templateId, templateDef] of cacheData.templates) {
        const item = new vscode.CompletionItem(templateId, vscode.CompletionItemKind.Reference);
        
        // 詳細情報を設定
        item.detail = `Template from ${this.getRelativePath(templateDef.filePath, workspaceFolder?.uri.fsPath)}`;
        item.documentation = new vscode.MarkdownString(
          `**Template ID:** \`${templateId}\`\n\n` +
          `**File:** ${templateDef.filePath}\n\n` +
          `**Lines:** ${templateDef.startLine}-${templateDef.endLine}\n\n` +
          `**Dependencies:** ${templateDef.dependencies.length > 0 ? templateDef.dependencies.join(', ') : 'None'}`
        );

        // 挿入テキストを設定（引用符を考慮）
        item.insertText = templateId;
        item.sortText = templateId;

        completionItems.push(item);
      }

      return completionItems;
    } catch (error) {
      console.error('Failed to provide template completions:', error);
      return [];
    }
  }

  /**
   * ディレクティブ補完アイテムを提供
   */
  private provideDirectiveCompletions(): vscode.CompletionItem[] {
    const directives = [
      {
        name: 'template',
        detail: 'Template definition or reference',
        documentation: 'Define a reusable template or reference an existing template',
        snippet: 'template{id="$1"}$0'
      },
      {
        name: 'tag',
        detail: 'Tag directive',
        documentation: 'Add metadata or categorization tags',
        snippet: 'tag{$1}$0'
      },
      {
        name: 'result',
        detail: 'Result directive',
        documentation: 'Display execution results or outputs',
        snippet: 'result{$1}$0'
      }
    ];

    return directives.map(directive => {
      const item = new vscode.CompletionItem(directive.name, vscode.CompletionItemKind.Keyword);
      item.detail = directive.detail;
      item.documentation = new vscode.MarkdownString(directive.documentation);
      item.insertText = new vscode.SnippetString(directive.snippet);
      item.sortText = directive.name;
      return item;
    });
  }

  /**
   * 相対パスを取得
   */
  private getRelativePath(filePath: string, workspaceRoot?: string): string {
    if (!workspaceRoot) {
      return filePath;
    }
    return filePath.startsWith(workspaceRoot) 
      ? filePath.substring(workspaceRoot.length + 1)
      : filePath;
  }
}