// packages/vscode-ext/src/providers/hover.ts
import * as vscode from 'vscode';
import { MdckParser } from '@mdck/parser';

export class MdckHoverProvider implements vscode.HoverProvider {
  private parser: MdckParser;

  constructor() {
    this.parser = new MdckParser();
  }

  /**
   * ホバー情報を提供
   */
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | null> {
    // Markdownファイルのみ処理
    if (document.languageId !== 'markdown' && document.languageId !== 'markdown-checklist') {
      return null;
    }

    const line = document.lineAt(position);
    const lineText = line.text;

    // テンプレート参照の検出
    const templateMatch = this.findTemplateReference(lineText, position.character);
    if (templateMatch) {
      return await this.provideTemplateHover(document, templateMatch, position);
    }

    // ディレクティブの検出
    const directiveMatch = this.findDirective(lineText, position.character);
    if (directiveMatch) {
      return this.provideDirectiveHover(directiveMatch, position);
    }

    return null;
  }

  /**
   * テンプレート参照を検出
   */
  private findTemplateReference(lineText: string, character: number): { templateId: string; range: vscode.Range } | null {
    // ::template{id="templateId"} の形式を検索
    const templateRegex = /::template\s*\{\s*id\s*=\s*["']([^"']+)["']\s*\}/g;
    let match;

    while ((match = templateRegex.exec(lineText)) !== null) {
      const startPos = match.index;
      const endPos = match.index + match[0].length;
      const templateId = match[1];

      // カーソルがテンプレート参照の範囲内にあるかチェック
      if (character >= startPos && character <= endPos) {
        return {
          templateId,
          range: new vscode.Range(
            new vscode.Position(0, startPos),
            new vscode.Position(0, endPos)
          ),
        };
      }
    }

    return null;
  }

  /**
   * ディレクティブを検出
   */
  private findDirective(lineText: string, character: number): { directive: string; range: vscode.Range } | null {
    // ::directive の形式を検索
    const directiveRegex = /::(template|tag|result)(?:\s|{|$)/g;
    let match;

    while ((match = directiveRegex.exec(lineText)) !== null) {
      const startPos = match.index;
      const endPos = match.index + match[0].length - (match[0].endsWith('{') || match[0].endsWith(' ') ? 1 : 0);
      const directive = match[1];

      // カーソルがディレクティブの範囲内にあるかチェック
      if (character >= startPos && character <= endPos) {
        return {
          directive,
          range: new vscode.Range(
            new vscode.Position(0, startPos),
            new vscode.Position(0, endPos)
          ),
        };
      }
    }

    return null;
  }

  /**
   * テンプレートのホバー情報を提供
   */
  private async provideTemplateHover(
    document: vscode.TextDocument,
    templateMatch: { templateId: string; range: vscode.Range },
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    try {
      // キャッシュを初期化
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      if (workspaceFolder) {
        this.parser.initializeCache(workspaceFolder.uri.fsPath);
      }

      // キャッシュからテンプレート情報を取得
      const cacheData = await this.parser.getCacheData();
      if (!cacheData) {
        return null;
      }

      const templateDef = cacheData.templates.get(templateMatch.templateId);
      if (!templateDef) {
        // テンプレートが見つからない場合のホバー
        const content = new vscode.MarkdownString();
        content.appendMarkdown(`**⚠️ Template Not Found**\n\n`);
        content.appendMarkdown(`Template ID: \`${templateMatch.templateId}\`\n\n`);
        content.appendMarkdown(`This template is not defined in the current project.`);
        
        return new vscode.Hover(content, templateMatch.range);
      }

      // テンプレート情報のホバーを作成
      const content = new vscode.MarkdownString();
      content.appendMarkdown(`**📋 Template: \`${templateMatch.templateId}\`**\n\n`);
      
      // ファイル情報
      const relativePath = this.getRelativePath(templateDef.filePath, workspaceFolder?.uri.fsPath);
      content.appendMarkdown(`**📁 File:** \`${relativePath}\`\n\n`);
      content.appendMarkdown(`**📍 Lines:** ${templateDef.startLine}-${templateDef.endLine}\n\n`);

      // 依存関係情報
      if (templateDef.dependencies.length > 0) {
        content.appendMarkdown(`**🔗 Dependencies:** ${templateDef.dependencies.map(dep => `\`${dep}\``).join(', ')}\n\n`);
      } else {
        content.appendMarkdown(`**🔗 Dependencies:** None\n\n`);
      }

      // テンプレート内容のプレビュー
      try {
        const templateContent = await this.getTemplateContent(templateDef.filePath, templateDef.startLine, templateDef.endLine);
        if (templateContent) {
          content.appendMarkdown(`**📝 Preview:**\n\n`);
          content.appendCodeblock(templateContent, 'markdown');
        }
      } catch (error) {
        // プレビュー取得エラーは無視
      }

      return new vscode.Hover(content, templateMatch.range);

    } catch (error) {
      console.error('Failed to provide template hover:', error);
      return null;
    }
  }

  /**
   * ディレクティブのホバー情報を提供
   */
  private provideDirectiveHover(
    directiveMatch: { directive: string; range: vscode.Range },
    position: vscode.Position
  ): vscode.Hover {
    const content = new vscode.MarkdownString();
    
    switch (directiveMatch.directive) {
      case 'template':
        content.appendMarkdown(`**📋 Template Directive**\n\n`);
        content.appendMarkdown(`Define or reference a reusable template.\n\n`);
        content.appendMarkdown(`**Syntax:**\n`);
        content.appendCodeblock(`::template{id="template-id"}\nTemplate content here\n::`, 'markdown');
        content.appendMarkdown(`\n**Usage:**\n`);
        content.appendMarkdown(`- **Definition:** Create a new template with unique ID\n`);
        content.appendMarkdown(`- **Reference:** Use existing template by ID\n`);
        break;

      case 'tag':
        content.appendMarkdown(`**🏷️ Tag Directive**\n\n`);
        content.appendMarkdown(`Add metadata or categorization tags.\n\n`);
        content.appendMarkdown(`**Syntax:**\n`);
        content.appendCodeblock(`::tag{category="value"}\nTagged content\n::`, 'markdown');
        content.appendMarkdown(`\n**Usage:**\n`);
        content.appendMarkdown(`- Categorize content sections\n`);
        content.appendMarkdown(`- Add metadata for processing\n`);
        break;

      case 'result':
        content.appendMarkdown(`**📊 Result Directive**\n\n`);
        content.appendMarkdown(`Display execution results or outputs.\n\n`);
        content.appendMarkdown(`**Syntax:**\n`);
        content.appendCodeblock(`::result{type="output"}\nResult content\n::`, 'markdown');
        content.appendMarkdown(`\n**Usage:**\n`);
        content.appendMarkdown(`- Show command outputs\n`);
        content.appendMarkdown(`- Display computed results\n`);
        break;
    }

    return new vscode.Hover(content, directiveMatch.range);
  }

  /**
   * テンプレート内容を取得
   */
  private async getTemplateContent(filePath: string, startLine: number, endLine: number): Promise<string | null> {
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // 指定された行範囲を取得（1-basedから0-basedに変換）
      const templateLines = lines.slice(startLine - 1, endLine);
      
      // 最大3行まで表示（長すぎる場合は省略）
      if (templateLines.length > 3) {
        return templateLines.slice(0, 3).join('\n') + '\n...';
      }
      
      return templateLines.join('\n');
    } catch (error) {
      return null;
    }
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